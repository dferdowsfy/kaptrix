import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess, requireRole, authErrorResponse } from "@/lib/security/authz";
import { logAuditEvent } from "@/lib/audit/logger";
import {
  ADJUSTMENT_BOUNDS,
  DIMENSION_MAX_ABS_DELTA,
  applyApprovedAdjustments,
} from "@/lib/scoring/adjustments";
import type { DecideAdjustmentInput } from "@/lib/types";

/**
 * POST /api/adjustments/[id]/decide
 *
 * Approve or reject a proposal. On approve:
 *   1. The proposal is marked 'approved' with the operator + timestamp.
 *   2. The target score's value is recomputed = base + Σ approved (clamped).
 *   3. score_history records the before/after with change_source =
 *      'adjustment_approved' and adjustment_proposal_id linked.
 *   4. audit_log records the operator decision.
 *
 * Reject simply marks the proposal 'rejected'; no score change.
 *
 * NOTE: This treats the score's CURRENT score_0_to_5 value as the
 * "operator base". When new approvals stack onto the same sub-criterion,
 * each one is bounded by ±0.5 individually and by ±15% of scale in
 * aggregate via the dimension-level cap.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let ctx;
  try {
    ctx = await requireAuth();
    requireRole(ctx, ["operator", "admin"]);
  } catch (err) {
    return authErrorResponse(err);
  }

  const supabase = ctx.supabase;

  const body = (await request.json()) as DecideAdjustmentInput;
  if (!body || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json(
      { error: "decision must be 'approve' or 'reject'" },
      { status: 400 },
    );
  }

  const { data: proposal, error: fetchErr } = await supabase
    .from("adjustment_proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchErr || !proposal) {
    return NextResponse.json(
      { error: fetchErr?.message ?? "Proposal not found" },
      { status: 404 },
    );
  }

  try {
    await assertEngagementAccess(ctx, proposal.engagement_id);
  } catch (err) {
    return authErrorResponse(err);
  }

  if (proposal.status !== "proposed") {
    return NextResponse.json(
      { error: `Proposal already ${proposal.status}` },
      { status: 409 },
    );
  }

  const newStatus = body.decision === "approve" ? "approved" : "rejected";

  // Mark the decision regardless of outcome.
  const { error: updErr } = await supabase
    .from("adjustment_proposals")
    .update({
      status: newStatus,
      decided_by: ctx.userId,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // For rejections, audit and exit.
  if (body.decision === "reject") {
    await logAuditEvent({
      action: "adjustment.reject",
      entity: "adjustment_proposal",
      entity_id: id,
      engagement_id: proposal.engagement_id,
      metadata: {
        dimension: proposal.dimension,
        sub_criterion: proposal.sub_criterion,
        proposed_delta: proposal.proposed_delta,
        note: body.note ?? null,
      },
    });
    return NextResponse.json({ ok: true, status: newStatus });
  }

  // Approval path: apply bounded delta to the target score.
  const { data: scoreRow, error: scoreErr } = await supabase
    .from("scores")
    .select("id, score_0_to_5, operator_rationale")
    .eq("engagement_id", proposal.engagement_id)
    .eq("dimension", proposal.dimension)
    .eq("sub_criterion", proposal.sub_criterion)
    .maybeSingle();

  if (scoreErr) {
    return NextResponse.json({ error: scoreErr.message }, { status: 500 });
  }

  if (!scoreRow) {
    return NextResponse.json(
      {
        error:
          "Cannot apply adjustment: operator has not yet scored this sub-criterion",
      },
      { status: 409 },
    );
  }

  // Re-pull all currently-approved proposals for this sub-criterion to keep
  // the cumulative cap correct. We include the just-approved proposal.
  const { data: approvedRows } = await supabase
    .from("adjustment_proposals")
    .select("*")
    .eq("engagement_id", proposal.engagement_id)
    .eq("dimension", proposal.dimension)
    .eq("sub_criterion", proposal.sub_criterion)
    .eq("status", "approved");

  // The score's current score_0_to_5 already reflects prior approved
  // adjustments. To avoid double-counting, the "base" we apply against is
  // the value MINUS prior approved deltas. We recompute from scratch using
  // the immutable scoring rule:
  //
  //   base = score_0_to_5 − Σ prior approved (clamped per item)
  //   new_score = clamp(base + Σ all approved, 0, 5) with dimension cap.
  //
  // This guarantees idempotence and no double-counting.

  const priorApproved = (approvedRows ?? []).filter((r) => r.id !== id);
  const priorSum = priorApproved.reduce(
    (acc, r) =>
      acc +
      Math.max(
        -ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS,
        Math.min(
          ADJUSTMENT_BOUNDS.PER_SUB_CRITERION_ABS,
          Number(r.proposed_delta),
        ),
      ),
    0,
  );

  const operatorBase = scoreRow.score_0_to_5 - priorSum;
  const allApproved = [...priorApproved, proposal];

  const newScore = applyApprovedAdjustments(
    operatorBase,
    allApproved.map((r) => ({
      ...r,
      proposed_delta: Number(r.proposed_delta),
    })) as never[],
    DIMENSION_MAX_ABS_DELTA,
  );

  // 0.5-step rounding to match operator scoring grain.
  const newScoreSnapped = Math.round(newScore * 2) / 2;

  if (newScoreSnapped !== scoreRow.score_0_to_5) {
    const delta =
      Math.round((newScoreSnapped - scoreRow.score_0_to_5) * 100) / 100;

    const { error: writeErr } = await supabase
      .from("scores")
      .update({ score_0_to_5: newScoreSnapped, updated_by: ctx.userId })
      .eq("id", scoreRow.id);
    if (writeErr) {
      return NextResponse.json({ error: writeErr.message }, { status: 500 });
    }

    await supabase.from("score_history").insert({
      score_id: scoreRow.id,
      engagement_id: proposal.engagement_id,
      dimension: proposal.dimension,
      sub_criterion: proposal.sub_criterion,
      prior_value: scoreRow.score_0_to_5,
      new_value: newScoreSnapped,
      delta,
      change_source: "adjustment_approved",
      adjustment_proposal_id: id,
      prior_rationale: scoreRow.operator_rationale ?? null,
      new_rationale: scoreRow.operator_rationale ?? null,
      changed_by: ctx.userId,
    });
  }

  await logAuditEvent({
    action: "adjustment.approve",
    entity: "adjustment_proposal",
    entity_id: id,
    engagement_id: proposal.engagement_id,
    metadata: {
      dimension: proposal.dimension,
      sub_criterion: proposal.sub_criterion,
      proposed_delta: proposal.proposed_delta,
      source_kind: proposal.source_kind,
      source_id: proposal.source_id,
      evidence_locator: proposal.evidence_locator,
      prior_score: scoreRow.score_0_to_5,
      new_score: newScoreSnapped,
      note: body.note ?? null,
    },
  });

  return NextResponse.json({
    ok: true,
    status: newStatus,
    new_score: newScoreSnapped,
  });
}
