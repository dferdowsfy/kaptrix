import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiDimension } from "@/lib/types";

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
    .from("mi_scores")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("dimension");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
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
    dimension: MiDimension;
    operator_override: boolean;
    score_0_to_5?: number;
    operator_rationale?: string;
  };

  if (!body.dimension) {
    return NextResponse.json({ error: "dimension required" }, { status: 400 });
  }

  if (body.operator_override && !body.operator_rationale?.trim()) {
    return NextResponse.json(
      { error: "operator_rationale required when overriding" },
      { status: 400 },
    );
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const update: Record<string, unknown> = {
    operator_override: body.operator_override,
    operator_rationale: body.operator_rationale ?? null,
  };
  if (body.score_0_to_5 !== undefined) {
    update.score_0_to_5 = Math.round(Math.min(5, Math.max(0, body.score_0_to_5)) * 2) / 2;
  }

  const { data, error } = await svc
    .from("mi_scores")
    .update(update)
    .eq("engagement_id", engagementId)
    .eq("dimension", body.dimension)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
