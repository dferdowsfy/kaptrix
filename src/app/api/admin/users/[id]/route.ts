import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireAdmin, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ROLES = ["admin", "operator", "analyst", "reviewer", "client_viewer"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

/**
 * PATCH /api/admin/users/:id
 * Admin-only. Updates role, approval, and hidden_menu_keys for a user.
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
  if (Array.isArray(body.hidden_menu_keys)) {
    patch.hidden_menu_keys = body.hidden_menu_keys
      .filter((k: unknown): k is string => typeof k === "string")
      .map((k: string) => k.trim())
      .filter(Boolean);
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
    .eq("id", id)
    .select("id, email, role, approved, hidden_menu_keys")
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
