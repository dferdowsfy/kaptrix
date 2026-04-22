import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import { isValidTier, ALL_REPORT_KINDS, type ReportKind } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "operator", "analyst", "reviewer", "client_viewer"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const OVERRIDE_NUMERIC_KEYS = [
  "max_engagements",
  "max_reports_per_month",
  "max_ai_queries_per_month",
] as const;
const OVERRIDE_BOOLEAN_KEYS = [
  "benchmarking_enabled",
  "advanced_reports_enabled",
  "priority_processing",
  "team_collaboration",
] as const;

function sanitizeOverrides(
  input: unknown,
): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of OVERRIDE_NUMERIC_KEYS) {
    const v = src[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = Math.trunc(v);
  }
  for (const key of OVERRIDE_BOOLEAN_KEYS) {
    const v = src[key];
    if (typeof v === "boolean") out[key] = v;
  }
  if (Array.isArray(src.reports_enabled)) {
    const filtered = (src.reports_enabled as unknown[]).filter(
      (k): k is ReportKind =>
        typeof k === "string" && (ALL_REPORT_KINDS as string[]).includes(k),
    );
    out.reports_enabled = filtered;
  }
  if (src.per_report_caps && typeof src.per_report_caps === "object") {
    const capsIn = src.per_report_caps as Record<string, unknown>;
    const capsOut: Record<string, number> = {};
    for (const kind of ALL_REPORT_KINDS) {
      const v = capsIn[kind];
      if (typeof v === "number" && Number.isFinite(v)) {
        capsOut[kind] = Math.trunc(v);
      }
    }
    if (Object.keys(capsOut).length > 0) out.per_report_caps = capsOut;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * PATCH /api/admin/users/:id
 * Admin-only. Updates role, approval, tier, tier overrides, and hidden_menu_keys for a user.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await requireAuth();
    requireAdmin(ctx);
  } catch (err) {
    return authErrorResponse(err);
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body.role === "string") {
    if (!ALLOWED_ROLES.includes(body.role as AllowedRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    patch.role = body.role;
  }
  if (typeof body.approved === "boolean") {
    patch.approved = body.approved;
  }
  if (typeof body.tier === "string") {
    if (!isValidTier(body.tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    patch.tier = body.tier;
  }
  if ("tier_overrides" in body) {
    if (body.tier_overrides === null) {
      patch.tier_overrides = null;
    } else {
      const sanitized = sanitizeOverrides(body.tier_overrides);
      patch.tier_overrides = sanitized; // may be null if nothing valid
    }
  }
  // Page visibility is written via the authoritative user_page_permissions
  // table below. Callers may pass either `hidden_menu_keys` (legacy denylist
  // shape used by the admin UI) or `page_permissions` (explicit map).
  let hiddenMenuKeys: string[] | null = null;
  let pagePermissions: Record<string, boolean> | null = null;
  if (Array.isArray(body.hidden_menu_keys)) {
    hiddenMenuKeys = body.hidden_menu_keys
      .filter((k: unknown): k is string => typeof k === "string")
      .map((k: string) => k.trim())
      .filter(Boolean);
  }
  if (body.page_permissions && typeof body.page_permissions === "object") {
    const raw = body.page_permissions as Record<string, unknown>;
    const cleaned: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "boolean") cleaned[k] = v;
    }
    pagePermissions = cleaned;
  }
  const hasPagePermissionChange =
    hiddenMenuKeys !== null || pagePermissions !== null;

  if (Object.keys(patch).length === 0 && !hasPagePermissionChange) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  // -----------------------------------------------------------------------
  // Write page permissions.
  //
  // Strategy: write the legacy `users.hidden_menu_keys` column directly
  // (it's what middleware + layout read), AND mirror into the new
  // `user_page_permissions` table if the 00029 migration has run. Writing
  // the legacy column directly guarantees hides take effect even if the
  // new table / trigger doesn't exist yet in this environment.
  // -----------------------------------------------------------------------
  if (hasPagePermissionChange) {
    // Compute the effective hidden-set the caller wants applied.
    const nextHidden = new Set<string>();
    if (hiddenMenuKeys !== null) {
      for (const k of hiddenMenuKeys) nextHidden.add(k);
    }
    if (pagePermissions !== null) {
      for (const [k, v] of Object.entries(pagePermissions)) {
        if (v === false) nextHidden.add(k);
        else nextHidden.delete(k);
      }
    }
    const hiddenArr = Array.from(nextHidden);

    // 1. Legacy column — authoritative for middleware today.
    const { error: legacyErr } = await svc
      .from("users")
      .update({ hidden_menu_keys: hiddenArr })
      .eq("id", id);
    if (legacyErr) {
      return NextResponse.json({ error: legacyErr.message }, { status: 500 });
    }

    // 2. New permissions table (best-effort; skip silently if migration
    //    hasn't been applied to this environment).
    const { data: validKeysRows } = await svc
      .from("page_keys")
      .select("key");
    if (validKeysRows) {
      const validKeys = new Set(
        (validKeysRows as { key: string }[]).map((r) => r.key),
      );

      // Clear all prior hide rows for this user, then insert fresh ones.
      await svc
        .from("user_page_permissions")
        .delete()
        .eq("user_id", id)
        .eq("can_view", false);

      const upserts = hiddenArr
        .filter((k) => validKeys.has(k))
        .map((k) => ({ user_id: id, page_key: k, can_view: false }));
      if (upserts.length > 0) {
        await svc
          .from("user_page_permissions")
          .upsert(upserts, { onConflict: "user_id,page_key" });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Then apply the remaining scalar patch (role, approved, tier, overrides).
  // -----------------------------------------------------------------------
  if (Object.keys(patch).length > 0) {
    const { error: updErr } = await svc
      .from("users")
      .update(patch)
      .eq("id", id);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
  }

  const { data, error } = await svc
    .from("users")
    .select("id, email, role, approved, tier, tier_overrides, hidden_menu_keys")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user: data });
}

/**
 * DELETE /api/admin/users/:id
 * Admin-only. Removes the user from auth.users (which cascades to
 * public.users and user_reports via FK ON DELETE CASCADE).
 * Refuses to delete the currently signed-in admin to avoid lock-out.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await requireAuth();
    requireAdmin(ctx);
  } catch (err) {
    return authErrorResponse(err);
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }
  if (id === ctx.userId) {
    return NextResponse.json(
      { error: "You cannot delete your own account from the admin panel." },
      { status: 400 },
    );
  }

  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service client not configured" },
      { status: 503 },
    );
  }

  // Delete from auth.users — cascades to public.users via the FK.
  const { error } = await svc.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
