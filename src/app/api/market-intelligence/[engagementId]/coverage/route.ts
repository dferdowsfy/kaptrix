import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

/** Returns the assumption→evidence coverage matrix for the engagement. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [{ data: assumptions }, { data: evidence }, { data: links }] =
    await Promise.all([
      svc
        .from("mi_thesis_assumptions")
        .select("id, assumption_text, assumption_category, evidence_status, load_bearing_score, ordering")
        .eq("engagement_id", engagementId)
        .order("ordering"),
      svc
        .from("mi_evidence_items")
        .select("id, source_name, source_type, confidence")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: false }),
      svc
        .from("mi_evidence_assumption_links")
        .select("evidence_id, assumption_id, link_type"),
    ]);

  // Build matrix: assumption_id → { evidence_id → link_type }
  const matrix: Record<string, Record<string, string>> = {};
  for (const a of assumptions ?? []) {
    matrix[a.id] = {};
  }
  for (const link of links ?? []) {
    if (matrix[link.assumption_id]) {
      matrix[link.assumption_id][link.evidence_id] = link.link_type;
    }
  }

  // Per-assumption coverage summary.
  const coverageSummary = (assumptions ?? []).map((a) => {
    const linkedEvidence = Object.values(matrix[a.id] ?? {});
    return {
      assumption_id: a.id,
      assumption_text: a.assumption_text,
      assumption_category: a.assumption_category,
      evidence_status: a.evidence_status,
      load_bearing_score: a.load_bearing_score,
      ordering: a.ordering,
      supporting_count: linkedEvidence.filter((t) => t === "supports").length,
      weakening_count: linkedEvidence.filter((t) => t === "weakens").length,
      contradicting_count: linkedEvidence.filter((t) => t === "contradicts").length,
      total_linked: linkedEvidence.length,
    };
  });

  const totalAssumptions = assumptions?.length ?? 0;
  const evidencedCount = coverageSummary.filter(
    (a) => a.evidence_status !== "unverified",
  ).length;

  return NextResponse.json({
    assumptions: coverageSummary,
    evidence_items: evidence ?? [],
    link_matrix: matrix,
    summary: {
      total_assumptions: totalAssumptions,
      evidenced_count: evidencedCount,
      unverified_count: totalAssumptions - evidencedCount,
      coverage_pct:
        totalAssumptions > 0
          ? Math.round((evidencedCount / totalAssumptions) * 100)
          : 0,
    },
  });
}
