// AI Category Diligence — Phase 5 promotion endpoint.
//
// POST /api/engagements/[id]/promote
//
// Promotes a category engagement into a fresh target engagement and records
// the lineage in `category_insight_links`. Fully additive: only callable
// when the source engagement has `subject_kind = 'category'`. Target
// engagements created through this route behave identically to any other
// target engagement — they just carry `promoted_from_engagement_id` set,
// which every existing UI ignores unless it opts in.

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";
import { logAuditEvent } from "@/lib/audit/logger";
import type { EngagementTier, DealStage } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PromoteBody {
  /** Name of the target company to create from this category insight. */
  target_company_name: string;
  /** Defaults to the source engagement's client_firm_name when omitted. */
  client_firm_name?: string;
  client_contact_email?: string;
  deal_stage?: DealStage;
  tier?: EngagementTier;
  /** Stable id from the category report that drove the promotion. */
  insight_key: string;
  /** Operator-authored summary of the insight being promoted. */
  insight_summary: string;
  /** Optional rubric snapshot captured from the category report. */
  rubric_snapshot?: Record<string, unknown>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: sourceId } = await params;

  let ctx;
  try {
    ctx = await requireAuth();
    await assertEngagementAccess(ctx, sourceId);
  } catch (err) {
    return authErrorResponse(err);
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  let body: PromoteBody;
  try {
    body = (await request.json()) as PromoteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.target_company_name || !body.insight_key || !body.insight_summary) {
    return NextResponse.json(
      {
        error:
          "target_company_name, insight_key, and insight_summary are required",
      },
      { status: 400 },
    );
  }

  // 1. Load source engagement — must exist and must be a category.
  const { data: source, error: sourceError } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (sourceError || !source) {
    return NextResponse.json(
      { error: "Source engagement not found" },
      { status: 404 },
    );
  }

  if (source.subject_kind !== "category") {
    return NextResponse.json(
      {
        error:
          "Promotion is only available for category engagements (subject_kind = 'category').",
      },
      { status: 400 },
    );
  }

  // 2. Create the target engagement. All new rows default subject_kind to
  //    'target' at the DB level (migration 00032); we set it explicitly
  //    for clarity.
  const { data: targetEngagement, error: createError } = await supabase
    .from("engagements")
    .insert({
      client_firm_name: body.client_firm_name ?? source.client_firm_name,
      target_company_name: body.target_company_name,
      client_contact_email:
        body.client_contact_email ?? source.client_contact_email ?? null,
      deal_stage: body.deal_stage ?? source.deal_stage,
      tier: body.tier ?? source.tier,
      assigned_operator_id: ctx.userId,
      status: "intake",
      subject_kind: "target",
      promoted_from_engagement_id: sourceId,
    })
    .select()
    .single();

  if (createError || !targetEngagement) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create target engagement" },
      { status: 500 },
    );
  }

  // 3. Record the lineage row. Conflicts (same source + target + insight
  //    key) are treated as idempotent re-runs and returned as-is.
  const { error: linkError } = await supabase
    .from("category_insight_links")
    .upsert(
      {
        source_engagement_id: sourceId,
        target_engagement_id: targetEngagement.id,
        insight_key: body.insight_key,
        insight_summary: body.insight_summary,
        rubric_snapshot: body.rubric_snapshot ?? {},
        created_by: ctx.userId,
      },
      { onConflict: "source_engagement_id,target_engagement_id,insight_key" },
    );

  if (linkError) {
    // Target was created successfully — surface the partial-failure so
    // the caller can retry the link write without re-creating the target.
    return NextResponse.json(
      {
        engagement: targetEngagement,
        link_error: linkError.message,
        warning:
          "Target engagement created but insight-link write failed; retry with the same payload.",
      },
      { status: 201 },
    );
  }

  await logAuditEvent({
    action: "create",
    entity: "engagement",
    entity_id: targetEngagement.id,
    engagement_id: targetEngagement.id,
    metadata: {
      promoted_from_engagement_id: sourceId,
      insight_key: body.insight_key,
      subject_kind: "target",
    },
  });

  return NextResponse.json(
    { engagement: targetEngagement, source_engagement_id: sourceId },
    { status: 201 },
  );
}
