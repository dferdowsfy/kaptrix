import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import { logAuditEvent } from "@/lib/audit/logger";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ engagementId: string; companyId: string }>;
  },
) {
  const { engagementId, companyId } = await params;

  let authCtx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Fetch shortlist company row.
  const { data: company, error: companyErr } = await svc
    .from("mi_shortlist_companies")
    .select("*")
    .eq("id", companyId)
    .eq("engagement_id", engagementId)
    .single();

  if (companyErr || !company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Prevent double-promotion.
  if (company.promoted_to_engagement_id) {
    return NextResponse.json(
      { engagement_id: company.promoted_to_engagement_id, already_promoted: true },
    );
  }

  // Fetch parent MI engagement + category profile to seed the new engagement.
  const [{ data: parentEngagement }, { data: profile }] = await Promise.all([
    svc
      .from("engagements")
      .select("client_firm_name, assigned_operator_id, tier, deal_stage")
      .eq("id", engagementId)
      .single(),
    svc
      .from("engagement_category_profile")
      .select("category_name")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
  ]);

  if (!parentEngagement) {
    return NextResponse.json({ error: "Parent engagement not found" }, { status: 404 });
  }

  // Create the new target engagement.
  const { data: newEngagement, error: createErr } = await svc
    .from("engagements")
    .insert({
      client_firm_name: parentEngagement.client_firm_name,
      target_company_name: company.company_name,
      deal_stage: parentEngagement.deal_stage ?? "preliminary",
      status: "intake",
      tier: parentEngagement.tier ?? "standard",
      assigned_operator_id: parentEngagement.assigned_operator_id,
      subject_kind: "target",
      promoted_from_engagement_id: engagementId,
    })
    .select("id")
    .single();

  if (createErr || !newEngagement) {
    return NextResponse.json(
      { error: createErr?.message ?? "Failed to create engagement" },
      { status: 500 },
    );
  }

  // Update shortlist company with promotion link.
  await svc
    .from("mi_shortlist_companies")
    .update({ promoted_to_engagement_id: newEngagement.id })
    .eq("id", companyId);

  // Create category_insight_links lineage record.
  await svc.from("category_insight_links").insert({
    source_engagement_id: engagementId,
    target_engagement_id: newEngagement.id,
    insight_key: `mi_shortlist::${companyId}`,
    insight_summary:
      company.rationale ??
      `Promoted from MI shortlist: ${company.company_name}${profile?.category_name ? ` (${profile.category_name})` : ""}`,
    rubric_snapshot: { signal_summary: company.signal_summary, source_urls: company.source_urls },
    created_by: authCtx.userId,
  });

  await logAuditEvent({
    action: "mi.shortlist.promote",
    entity: "engagements",
    engagement_id: engagementId,
    metadata: {
      new_engagement_id: newEngagement.id,
      company_name: company.company_name,
      shortlist_id: companyId,
    },
  });

  return NextResponse.json({ engagement_id: newEngagement.id, already_promoted: false });
}
