// Per-user, per-engagement knowledge base persistence.
// Uses the existing `user_workspace_state` table with kind='knowledge_base'.
//
// GET  /api/preview/knowledge-base?engagement_id=<id>
//   → { authenticated: boolean, entries: Record<step, KnowledgeEntry> }
//
// PUT  /api/preview/knowledge-base
//   body: { engagement_id: string, entries: Record<step, KnowledgeEntry> }
//   → { ok: true } | 401

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";
import type { KnowledgeStep, KnowledgeEntry } from "@/lib/preview/knowledge-base";

export const runtime = "nodejs";

const KIND = "knowledge_base";

type KbState = Partial<Record<KnowledgeStep, KnowledgeEntry>>;

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
    return NextResponse.json({ authenticated: false, entries: {} });
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
    entries: (data?.state as KbState | null) ?? {},
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(req: Request) {
  let body: { engagement_id?: string; entries?: KbState };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const engagementId = body.engagement_id;
  const entries = body.entries;
  if (!engagementId || typeof entries !== "object" || entries === null) {
    return NextResponse.json(
      { error: "Missing engagement_id or entries" },
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
      state: entries,
    },
    { onConflict: "user_id,engagement_id,kind" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
