import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/user/profile
 * Returns the current user's profile info including approval status.
 */
export async function GET() {
  try {
    const ctx = await requireAuth();

    return NextResponse.json({
      id: ctx.userId,
      email: ctx.email,
      role: ctx.role,
      approved: ctx.approved,
      hidden_menu_keys: ctx.hidden_menu_keys,
      is_admin: ctx.role === "admin",
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/**
 * PATCH /api/user/profile
 * User can update their own hidden_menu_keys (and potentially other non-sensitive fields).
 */
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireAuth();
    const body = await request.json().catch(() => ({}));

    const patch: Record<string, unknown> = {};

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
      .eq("id", ctx.userId)
      .select("id, hidden_menu_keys")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (err) {
    return authErrorResponse(err);
  }
}
