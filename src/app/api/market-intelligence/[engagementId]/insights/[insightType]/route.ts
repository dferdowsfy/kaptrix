import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiInsightType } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; insightType: string }> },
) {
  const { engagementId, insightType } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await svc
    .from("mi_insights")
    .select("*")
    .eq("engagement_id", engagementId)
    .eq("insight_type", insightType)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; insightType: string }> },
) {
  const { engagementId, insightType } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    user_edited_content: Record<string, unknown>;
  };

  if (!body.user_edited_content) {
    return NextResponse.json({ error: "user_edited_content required" }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await svc
    .from("mi_insights")
    .update({
      user_edited_content: body.user_edited_content,
      user_edited_at: new Date().toISOString(),
    })
    .eq("engagement_id", engagementId)
    .eq("insight_type", insightType as MiInsightType)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
