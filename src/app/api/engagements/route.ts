import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import type { CreateEngagementInput } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: CreateEngagementInput = await request.json();

  // Validate required fields
  if (!body.client_firm_name || !body.target_company_name || !body.deal_stage) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("engagements")
    .insert({
      ...body,
      assigned_operator_id: user.id,
      status: "intake",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "create",
    entity: "engagement",
    entity_id: data.id,
    engagement_id: data.id,
    metadata: { tier: body.tier, deal_stage: body.deal_stage },
  });

  return NextResponse.json(data, { status: 201 });
}
