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
import {
  isPreviewTabHidden,
  type PreviewTabId,
} from "@/lib/preview-access";

export type AppRole = "admin" | "operator" | "analyst" | "reviewer" | "client_viewer" | "pending";

export interface AuthContext {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  role: AppRole | null;
  approved: boolean;
  hidden_menu_keys: string[];
}

/**
 * Email allowlist for platform admins. Treated as admin regardless of
 * whatever value is in `public.users.role`. Acts as a bootstrap so the
 * designated admin never gets locked out if the role column hasn't been
 * backfilled yet. Override with env `ADMIN_EMAILS` (comma-separated).
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
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
    .select("role, email, approved, hidden_menu_keys")
    .eq("id", user.id)
    .maybeSingle();

  const resolvedEmail = profile?.email ?? user.email ?? null;
  const dbRole = (profile?.role as AppRole | undefined) ?? null;
  // Email allowlist overrides whatever is (or isn't) in the DB.
  const effectiveRole: AppRole | null = isAdminEmail(resolvedEmail)
    ? "admin"
    : dbRole;
  const effectiveApproved = isAdminEmail(resolvedEmail)
    ? true
    : (profile?.approved ?? false);

  if (!effectiveApproved) {
    throw new AuthError(403, "pending_approval", "Account pending admin approval");
  }

  if (effectiveRole === "pending") {
    throw new AuthError(403, "pending_role", "Account pending admin approval");
  }

  return {
    supabase,
    userId: user.id,
    email: resolvedEmail,
    role: effectiveRole,
    approved: effectiveApproved,
    hidden_menu_keys: (profile?.hidden_menu_keys as string[] | undefined) ?? [],
  };
}

export function requireRole(ctx: AuthContext, allowed: AppRole[]): void {
  if (!ctx.role || !allowed.includes(ctx.role)) {
    throw new AuthError(403, "forbidden_role", "Insufficient role");
  }
}

/** Admin-only guard. Throws 403 if the current user is not an admin. */
export function requireAdmin(ctx: AuthContext): void {
  if (ctx.role !== "admin") {
    throw new AuthError(403, "forbidden_admin", "Admin access required");
  }
}

/**
 * Deny access to a preview capability when the admin has hidden the
 * corresponding tab for the current user.
 */
export function assertPreviewTabVisible(
  ctx: AuthContext,
  tabId: PreviewTabId,
): void {
  if (isPreviewTabHidden(tabId, ctx.hidden_menu_keys)) {
    throw new AuthError(
      403,
      "forbidden_hidden_tab",
      "This page has been disabled for your account.",
    );
  }
}

/**
 * Verify the caller can access the given engagement.
 *   - Admins see all.
 *   - Operators see only engagements assigned to them.
 *   - client_viewer sees only engagements where their email matches client_contact_email.
 */
export async function assertEngagementAccess(
  ctx: AuthContext,
  engagementId: string,
): Promise<{ id: string; client_contact_email: string | null; assigned_operator_id: string | null }> {
  if (!engagementId) {
    throw new AuthError(400, "missing_engagement", "Missing engagement_id");
  }

  const { data, error } = await ctx.supabase
    .from("engagements")
    .select("id, client_contact_email, assigned_operator_id")
    .eq("id", engagementId)
    .maybeSingle();

  if (error || !data) {
    throw new AuthError(404, "engagement_not_found", "Engagement not found");
  }

  if (ctx.role === "admin") {
    return data;
  }

  if (ctx.role === "operator" && data.assigned_operator_id === ctx.userId) {
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
