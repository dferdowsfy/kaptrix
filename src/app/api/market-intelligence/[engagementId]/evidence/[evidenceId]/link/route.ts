import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiLinkType } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; evidenceId: string }> },
) {
  const { engagementId, evidenceId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    assumption_id: string;
    link_type: MiLinkType;
    operator_note?: string;
  };

  if (!body.assumption_id || !body.link_type) {
    return NextResponse.json(
      { error: "assumption_id and link_type required" },
      { status: 400 },
    );
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Upsert: update link_type if already linked.
  const { data, error } = await svc
    .from("mi_evidence_assumption_links")
    .upsert(
      {
        evidence_id: evidenceId,
        assumption_id: body.assumption_id,
        link_type: body.link_type,
        operator_note: body.operator_note ?? null,
      },
      { onConflict: "evidence_id,assumption_id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update assumption evidence_status based on links.
  await recomputeAssumptionStatus(svc, body.assumption_id);

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; evidenceId: string }> },
) {
  const { engagementId, evidenceId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const assumptionId = searchParams.get("assumption_id");
  if (!assumptionId) {
    return NextResponse.json({ error: "assumption_id required" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await svc
    .from("mi_evidence_assumption_links")
    .delete()
    .eq("evidence_id", evidenceId)
    .eq("assumption_id", assumptionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute assumption status after unlink.
  await recomputeAssumptionStatus(svc, assumptionId);

  return new NextResponse(null, { status: 204 });
}

// Derive assumption evidence_status from its links.
// Contradicted > Weakened > Supported > Unverified.
async function recomputeAssumptionStatus(
  svc: NonNullable<ReturnType<typeof getServiceClient>>,
  assumptionId: string,
): Promise<void> {
  const { data: links } = await svc
    .from("mi_evidence_assumption_links")
    .select("link_type")
    .eq("assumption_id", assumptionId);

  if (!links || links.length === 0) {
    await svc
      .from("mi_thesis_assumptions")
      .update({ evidence_status: "unverified" })
      .eq("id", assumptionId);
    return;
  }

  const types = links.map((l) => l.link_type as MiLinkType);
  let status: "unverified" | "supported" | "weakened" | "contradicted" = "unverified";
  if (types.includes("contradicts")) status = "contradicted";
  else if (types.includes("weakens")) status = "weakened";
  else if (types.includes("supports")) status = "supported";

  await svc
    .from("mi_thesis_assumptions")
    .update({ evidence_status: status })
    .eq("id", assumptionId);
}
