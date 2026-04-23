import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { MiIntakeQuestion } from "@/lib/types";

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
    .from("mi_intake_questions")
    .select("*")
    .eq("engagement_id", engagementId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  let authCtx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    questions?: MiIntakeQuestion[];
    confirm?: boolean;
  };

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const update: Record<string, unknown> = {};
  if (body.questions !== undefined) update.questions = body.questions;
  if (body.confirm === true) {
    update.status = "confirmed";
    update.confirmed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await svc
    .from("mi_intake_questions")
    .update(update)
    .eq("engagement_id", engagementId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
