import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import type { UpdateScoreInput } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const engagementId = request.nextUrl.searchParams.get("engagement_id");

  if (!engagementId) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("dimension");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    engagement_id,
    dimension,
    sub_criterion,
    ...scoreData
  }: { engagement_id: string; dimension: string; sub_criterion: string } & UpdateScoreInput =
    body;

  if (!engagement_id || !dimension || !sub_criterion) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Validate rationale length
  if (!scoreData.operator_rationale || scoreData.operator_rationale.length < 20) {
    return NextResponse.json(
      { error: "Operator rationale must be at least 20 characters" },
      { status: 400 },
    );
  }

  // Upsert the score
  const { data, error } = await supabase
    .from("scores")
    .upsert(
      {
        engagement_id,
        dimension,
        sub_criterion,
        ...scoreData,
        updated_by: user.id,
      },
      { onConflict: "engagement_id,dimension,sub_criterion" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "score",
    entity: "score",
    entity_id: data.id,
    engagement_id,
    metadata: { dimension, sub_criterion, score: scoreData.score_0_to_5 },
  });

  return NextResponse.json(data);
}
