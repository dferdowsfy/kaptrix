import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiAssumptionStatus } from "@/lib/types";

export const runtime = "nodejs";

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

  const { data, error } = await svc
    .from("mi_thesis_assumptions")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("ordering");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(
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

  const body = (await req.json()) as {
    assumption_text: string;
    assumption_category?: string;
    load_bearing_score?: number;
    evidence_type_needed?: string;
  };

  if (!body.assumption_text?.trim()) {
    return NextResponse.json({ error: "assumption_text required" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: existing } = await svc
    .from("mi_thesis_assumptions")
    .select("ordering")
    .eq("engagement_id", engagementId)
    .order("ordering", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrdering = (existing?.ordering ?? -1) + 1;

  const { data, error } = await svc
    .from("mi_thesis_assumptions")
    .insert({
      engagement_id: engagementId,
      assumption_text: body.assumption_text.trim(),
      assumption_category: body.assumption_category ?? "general",
      evidence_status: "unverified",
      load_bearing_score: body.load_bearing_score ?? null,
      evidence_type_needed: body.evidence_type_needed ?? null,
      ordering: nextOrdering,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(
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

  const body = (await req.json()) as {
    id: string;
    evidence_status?: MiAssumptionStatus;
    assumption_text?: string;
    assumption_category?: string;
    load_bearing_score?: number;
    evidence_type_needed?: string;
    ordering?: number;
  };

  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const update: Record<string, unknown> = {};
  if (body.evidence_status !== undefined) update.evidence_status = body.evidence_status;
  if (body.assumption_text !== undefined) update.assumption_text = body.assumption_text;
  if (body.assumption_category !== undefined) update.assumption_category = body.assumption_category;
  if (body.load_bearing_score !== undefined) update.load_bearing_score = body.load_bearing_score;
  if (body.evidence_type_needed !== undefined) update.evidence_type_needed = body.evidence_type_needed;
  if (body.ordering !== undefined) update.ordering = body.ordering;

  const { data, error } = await svc
    .from("mi_thesis_assumptions")
    .update(update)
    .eq("id", body.id)
    .eq("engagement_id", engagementId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { error } = await svc
    .from("mi_thesis_assumptions")
    .delete()
    .eq("id", id)
    .eq("engagement_id", engagementId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
