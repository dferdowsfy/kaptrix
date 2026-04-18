import { NextRequest, NextResponse } from "next/server";
import { calculateFinalScore } from "@/lib/scoring/calculator";
import type { AdjustmentProposal, Score } from "@/lib/types";
import {
  requireAuth,
  assertEngagementAccess,
  authErrorResponse,
} from "@/lib/security/authz";

/**
 * GET /api/scores/final?engagement_id=...
 *
 * Server-authoritative final composite. Reads only:
 *   - operator-set scores
 *   - APPROVED adjustment proposals
 *   - the precomputed evidence_confidence row (informational; never
 *     folded into the composite)
 *
 * Same engagement → same response, every time. No localStorage, no LLM.
 */
export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }
  const supabase = ctx.supabase;
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

  const [scoresRes, adjRes, confRes] = await Promise.all([
    supabase
      .from("scores")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("dimension"),
    supabase
      .from("adjustment_proposals")
      .select("*")
      .eq("engagement_id", engagementId)
      .eq("status", "approved"),
    supabase
      .from("evidence_confidence")
      .select("composite")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
  ]);

  if (scoresRes.error) {
    return NextResponse.json(
      { error: scoresRes.error.message },
      { status: 500 },
    );
  }
  if (adjRes.error) {
    return NextResponse.json({ error: adjRes.error.message }, { status: 500 });
  }

  const scores = (scoresRes.data ?? []) as Score[];
  const approved = (adjRes.data ?? []) as AdjustmentProposal[];
  const confidence = confRes.data?.composite ?? 0;

  const result = calculateFinalScore(scores, approved, Number(confidence));
  return NextResponse.json(result);
}
