import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/service";
import { requireAuth, authErrorResponse } from "@/lib/security/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Scope engagements to the signed-in user. Admins see everything.
  let ctx;
  try {
    ctx = await requireAuth();
  } catch {
    // Not signed in → no engagements. Preview demo clients still render
    // from the client-side roster, so home won't be empty.
    return NextResponse.json({ engagements: [] });
  }

  const service = getServiceClient();
  if (!service) {
    return NextResponse.json({ engagements: [] });
  }

  const isAdmin = ctx.role === "admin";
  const query = service
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = isAdmin
    ? await query
    : await query.eq("assigned_operator_id", ctx.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ engagements: data ?? [] });
}

export async function POST(request: NextRequest) {
  // Auth is enough — any signed-in user can create a new client.
  let ctx;
  try {
    ctx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  const body = await request.json();
  const {
    client_firm_name,
    target_company_name,
    deal_stage,
    tier,
    client_contact_email,
    referral_source,
    engagement_fee,
    delivery_deadline,
    industry,
    engagement_type,
    buyer_archetype,
    summary,
  } = body;

  if (!client_firm_name || !target_company_name || !deal_stage) {
    return NextResponse.json(
      { error: "Missing required fields: client_firm_name, target_company_name, deal_stage" },
      { status: 400 },
    );
  }
  if (!industry) {
    return NextResponse.json(
      { error: "Missing required field: industry (profile is locked once the client is created)" },
      { status: 400 },
    );
  }

  const { data, error } = await ctx.supabase
    .from("engagements")
    .insert({
      client_firm_name,
      target_company_name,
      deal_stage: deal_stage || "preliminary",
      tier: tier || "standard",
      status: "intake",
      client_contact_email: client_contact_email || null,
      referral_source: referral_source || null,
      engagement_fee: engagement_fee || null,
      delivery_deadline: delivery_deadline || null,
      industry,
      engagement_type: engagement_type || null,
      buyer_archetype: buyer_archetype || null,
      // Scope ownership so only this user (or an admin) can see it later.
      assigned_operator_id: ctx.userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
