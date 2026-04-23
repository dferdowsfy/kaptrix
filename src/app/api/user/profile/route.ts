import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Returns the current user's profile info including approval status and
 * the resolved per-page permission map (single source of truth for the
 * client-side nav).
 */
export async function GET() {
  try {
    const ctx = await requireAuth();

    // Read hidden_menu_keys via the service client so admin-enforced hides
    // are always visible here regardless of whether RLS exposes this column
    // to the row-owner's JWT. Falls back to the value from requireAuth() if
    // the service client isn't configured.
    let hidden_menu_keys: string[] = ctx.hidden_menu_keys ?? [];
    const svc = getServiceClient();
    let full_name: string | null = null;
    let firm_name: string | null = null;
    if (svc) {
      const { data: row } = await svc
        .from("users")
        .select("hidden_menu_keys, full_name, firm_name")
        .eq("id", ctx.userId)
        .maybeSingle();
      if (row?.hidden_menu_keys != null) {
        hidden_menu_keys = row.hidden_menu_keys as string[];
      }
      full_name = (row?.full_name as string | null) ?? null;
      firm_name = (row?.firm_name as string | null) ?? null;
    }

    // Resolve the canonical permission map. Prefer the RPC (merges role
    // defaults + user overrides) and fall back to reconstructing from the
    // legacy denylist if the RPC isn't available (e.g. migration not yet
    // applied in a given environment).
    let permissions: Record<string, boolean> = {};
    const { data: rpcData, error: rpcErr } = await ctx.supabase.rpc(
      "get_user_page_permissions",
      { uid: ctx.userId },
    );
    if (!rpcErr && rpcData && typeof rpcData === "object") {
      permissions = rpcData as Record<string, boolean>;
      // Overlay admin-enforced hides so the permissions map stays consistent
      // with hidden_menu_keys even when the RPC hasn't been updated.
      for (const k of hidden_menu_keys) {
        permissions[k] = false;
      }
    } else {
      const hidden = new Set(hidden_menu_keys);
      for (const key of [
        "home",
        "overview",
        "intake",
        "coverage",
        "insights",
        "scoring",
        "positioning",
        "report",
        "customize",
        "admin",
      ]) {
        permissions[key] = !hidden.has(key);
      }
      if (ctx.role !== "admin") permissions.admin = false;
    }

    return NextResponse.json(
      {
        id: ctx.userId,
        email: ctx.email,
        role: ctx.role,
        approved: ctx.approved,
        hidden_menu_keys,
        permissions,
        is_admin: ctx.role === "admin",
        full_name,
        firm_name,
      },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      },
    );
  } catch (err) {
    return authErrorResponse(err);
  }
}

/**
 * PATCH /api/user/profile
 *
 * Reserved for non-sensitive self-service profile edits. Notably, the
 * `hidden_menu_keys` column is NOT writable here — that column is
 * exclusively controlled by admins via /api/admin/users/:id so admin
 * hides cannot be overwritten by the affected user's client.
 */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};

    // Self-service writable fields. `hidden_menu_keys` is intentionally
    // admin-only and is ignored here even if supplied.
    if (typeof body.full_name === "string") {
      patch.full_name = body.full_name.trim().slice(0, 120);
    }
    if (typeof body.firm_name === "string") {
      patch.firm_name = body.firm_name.trim().slice(0, 120);
    }

    if (Object.keys(patch).length === 0) {
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

    const { data, error } = await svc
      .from("users")
      .update(patch)
      .eq("id", ctx.userId)
      .select("id, full_name, firm_name")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    return authErrorResponse(err);
  }
}
