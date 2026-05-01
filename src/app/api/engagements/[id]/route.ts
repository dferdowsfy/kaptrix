import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServiceClient } from "@/lib/supabase/service";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";
import { logAuditEvent } from "@/lib/audit/logger";

const PATCH_ALLOWED_FIELDS = new Set([
  "target_company_name",
  "client_firm_name",
  "deal_stage",
  "status",
  "tier",
  "industry",
  "delivery_deadline",
  "sensitivity_level",
  "subject_label",
  "notes",
]);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await requireAuth();
    await assertEngagementAccess(ctx, id);
  } catch (err) {
    return authErrorResponse(err);
  }

  const { data, error } = await ctx.supabase
    .from("engagements")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await requireAuth();
    await assertEngagementAccess(ctx, id);
  } catch (err) {
    return authErrorResponse(err);
  }

  const body = await request.json();

  const sanitized: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (PATCH_ALLOWED_FIELDS.has(key)) {
      sanitized[key] = body[key];
    }
  }

  if (Object.keys(sanitized).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("engagements")
    .update(sanitized)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "update",
    entity: "engagement",
    entity_id: id,
    engagement_id: id,
    metadata: { updated_fields: Object.keys(sanitized) },
  });

  return NextResponse.json(data);
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  // Verify the engagement exists and belongs to the caller (admins bypass).
  const { data: existing } = await service
    .from("engagements")
    .select("id, assigned_operator_id, target_company_name")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }

  if (ctx.role !== "admin" && existing.assigned_operator_id !== ctx.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await service.from("engagements").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "delete",
    entity: "engagement",
    entity_id: id,
    engagement_id: id,
    metadata: { target_company_name: existing.target_company_name },
  });

  return new NextResponse(null, { status: 204 });
}
