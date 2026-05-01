import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";
import { logAuditEvent } from "@/lib/audit/logger";
import type { UpdateScoreInput } from "@/lib/types";

const SCORE_ALLOWED_FIELDS = new Set([
  "score_0_to_5",
  "operator_rationale",
  "evidence_citations",
  "criterion_id",
]);

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const engagementId = request.nextUrl.searchParams.get("engagement_id");

  if (!engagementId) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  try {
    await assertEngagementAccess(ctx, engagementId);
  } catch (err) {
    return authErrorResponse(err);
  }

  const { data, error } = await ctx.supabase
    .from("scores")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("dimension");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const body = await request.json();
  const {
    engagement_id,
    dimension,
    sub_criterion,
    ...rawScoreData
  }: { engagement_id: string; dimension: string; sub_criterion: string } & UpdateScoreInput =
    body;

  const scoreData: Record<string, unknown> = {};
  for (const key of Object.keys(rawScoreData)) {
    if (SCORE_ALLOWED_FIELDS.has(key)) {
      scoreData[key] = (rawScoreData as Record<string, unknown>)[key];
    }
  }

  if (!engagement_id || !dimension || !sub_criterion) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    await assertEngagementAccess(ctx, engagement_id);
  } catch (err) {
    return authErrorResponse(err);
  }

  const supabase = ctx.supabase;

  // Validate rationale length
  if (!scoreData.operator_rationale || (scoreData.operator_rationale as string).length < 20) {
    return NextResponse.json(
      { error: "Operator rationale must be at least 20 characters" },
      { status: 400 },
    );
  }

  // Read prior value first so we can write a before/after history row.
  const { data: prior } = await supabase
    .from("scores")
    .select("score_0_to_5, operator_rationale")
    .eq("engagement_id", engagement_id)
    .eq("dimension", dimension)
    .eq("sub_criterion", sub_criterion)
    .maybeSingle();

  // AI Category Diligence: stamp the parent engagement's subject_kind
  // so the trigger on scores can enforce cross-mode integrity.
  const { data: parentEng } = await supabase
    .from("engagements")
    .select("subject_kind")
    .eq("id", engagement_id)
    .maybeSingle();
  const subjectKind = parentEng?.subject_kind ?? null;

  // Upsert the score
  const { data, error } = await supabase
    .from("scores")
    .upsert(
      {
        engagement_id,
        dimension,
        sub_criterion,
        ...scoreData,
        updated_by: ctx.userId,
        ...(subjectKind ? { subject_kind: subjectKind } : {}),
      },
      { onConflict: "engagement_id,dimension,sub_criterion" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const priorValue = prior?.score_0_to_5 ?? null;
  const newValue = scoreData.score_0_to_5 as number;
  const delta = priorValue === null ? 0 : Math.round((newValue - priorValue) * 100) / 100;

  // Append-only history. Failures here are logged but do not fail the write —
  // the audit_log entry below is the authoritative trail.
  const { error: historyError } = await supabase.from("score_history").insert({
    score_id: data.id,
    engagement_id,
    dimension,
    sub_criterion,
    prior_value: priorValue,
    new_value: newValue,
    delta,
    change_source: "operator",
    adjustment_proposal_id: null,
    prior_rationale: prior?.operator_rationale ?? null,
    new_rationale: scoreData.operator_rationale as string,
    changed_by: ctx.userId,
  });
  if (historyError) {
    console.error("score_history insert failed", historyError);
  }

  await logAuditEvent({
    action: "score.upsert",
    entity: "score",
    entity_id: data.id,
    engagement_id,
    metadata: {
      dimension,
      sub_criterion,
      prior_score: priorValue,
      new_score: newValue,
      delta,
      source: "operator",
      evidence_citations:
        scoreData.evidence_citations?.map((e) => e.document_id) ?? [],
    },
  });

  return NextResponse.json(data);
}
