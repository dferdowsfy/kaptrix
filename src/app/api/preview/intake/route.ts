// Per-user, per-engagement intake answer persistence. Replaces the single
// global localStorage key that caused answers to vanish on logout and
// overwrite each other across clients. The intake page uses this route
// to hydrate on mount and auto-save on change.
//
// GET  /api/preview/intake?engagement_id=<id>
//   → { authenticated: boolean, answers: PreviewAnswers, updated_at?: string }
//
// PUT  /api/preview/intake
//   body: { engagement_id: string, answers: PreviewAnswers }
//   → { ok: true } | 401 when signed out (client keeps localStorage fallback)
//
// DELETE /api/preview/intake
//   body: { engagement_id: string }
//   → { ok: true }

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";

export const runtime = "nodejs";

const KIND = "intake_answers";

type Answers = Record<string, string | number | string[]>;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const engagementId = url.searchParams.get("engagement_id");
  if (!engagementId) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, answers: {} });
  }

  const { data, error } = await supabase
    .from("user_workspace_state")
    .select("state, updated_at")
    .eq("user_id", user.id)
    .eq("engagement_id", engagementId)
    .eq("kind", KIND)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message, authenticated: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    answers: (data?.state as Answers | null) ?? {},
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(req: Request) {
  let body: { engagement_id?: string; answers?: Answers };
  try {
    body = (await req.json()) as { engagement_id?: string; answers?: Answers };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const engagementId = body.engagement_id;
  const answers = body.answers;
  if (!engagementId || typeof answers !== "object" || answers === null) {
    return NextResponse.json(
      { error: "Missing engagement_id or answers" },
      { status: 400 },
    );
  }

  let ctx;
  try {
    ctx = await requireAuth();
    await assertEngagementAccess(ctx, engagementId);
  } catch (err) {
    return authErrorResponse(err);
  }

  const supabase = ctx.supabase;

  const { error } = await supabase.from("user_workspace_state").upsert(
    {
      user_id: ctx.userId,
      engagement_id: engagementId,
      kind: KIND,
      state: answers,
    },
    { onConflict: "user_id,engagement_id,kind" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  let body: { engagement_id?: string };
  try {
    body = (await req.json()) as { engagement_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.engagement_id) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase
    .from("user_workspace_state")
    .delete()
    .eq("user_id", user.id)
    .eq("engagement_id", body.engagement_id)
    .eq("kind", KIND);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
