/**
 * Authorization guards — defense in depth on top of Supabase RLS.
 *
 * API routes should call `requireAuth()` first, then — for any resource
 * tied to an engagement — `assertEngagementAccess()` before proceeding.
 * RLS still runs underneath; these checks give us explicit, auditable
 * server-side enforcement and surface clean 401/403 responses.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "operator" | "analyst" | "reviewer" | "client_viewer";

export interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  role: AppRole | null;
}

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Resolve the current user or throw AuthError(401).
 * Also loads the app-level role from `public.users`.
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError(401, "unauthenticated", "Unauthorized");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    userId: user.id,
    email: profile?.email ?? user.email ?? null,
    role: (profile?.role as AppRole | undefined) ?? null,
  };
}

export function requireRole(ctx: AuthContext, allowed: AppRole[]): void {
  if (!ctx.role || !allowed.includes(ctx.role)) {
    throw new AuthError(403, "forbidden_role", "Insufficient role");
  }
}

/**
 * Verify the caller can access the given engagement. Elevated roles
 * (admin/operator) see all engagements today — this matches the existing
 * RLS. We still perform the lookup so:
 *   1. The engagement actually exists (otherwise 404).
 *   2. client_viewer is constrained to their own engagement.
 *   3. We have a consistent place to add tighter per-operator scoping later.
 */
export async function assertEngagementAccess(
  ctx: AuthContext,
  engagementId: string,
): Promise<{ id: string; client_contact_email: string | null }> {
  if (!engagementId) {
    throw new AuthError(400, "missing_engagement", "Missing engagement_id");
  }

  const { data, error } = await ctx.supabase
    .from("engagements")
    .select("id, client_contact_email, assigned_operator_id")
    .eq("id", engagementId)
    .maybeSingle();

  if (error || !data) {
    // RLS may legitimately hide it — return 404 either way to avoid enumeration.
    throw new AuthError(404, "engagement_not_found", "Engagement not found");
  }

  if (ctx.role === "admin" || ctx.role === "operator") {
    return data;
  }

  if (
    ctx.role === "client_viewer" &&
    ctx.email &&
    data.client_contact_email &&
    ctx.email.toLowerCase() === data.client_contact_email.toLowerCase()
  ) {
    return data;
  }

  throw new AuthError(403, "forbidden_engagement", "Not authorized for engagement");
}

/** Convert an AuthError into an API response without leaking details. */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status },
    );
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
