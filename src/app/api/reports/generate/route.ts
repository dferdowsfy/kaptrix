import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";
import { calculateCompositeScore, isFullyScored } from "@/lib/scoring/calculator";
import { buildReportData } from "@/lib/pdf-generator/generate";
import type { Score, Engagement } from "@/lib/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { engagement_id, watermark = "draft" } = await request.json();

  if (!engagement_id) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  // Get engagement
  const { data: engagement } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", engagement_id)
    .single();

  if (!engagement) {
    return NextResponse.json({ error: "Engagement not found" }, { status: 404 });
  }

  // Get all scores
  const { data: scores } = await supabase
    .from("scores")
    .select("*")
    .eq("engagement_id", engagement_id);

  if (!scores || !isFullyScored(scores as Score[])) {
    return NextResponse.json(
      { error: "All sub-criteria must be scored with rationale before generating a report" },
      { status: 400 },
    );
  }

  const composite = calculateCompositeScore(scores as Score[]);

  // Get next version number
  const { count } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("engagement_id", engagement_id);

  const version = (count ?? 0) + 1;

  const reportData = buildReportData({
    engagement: engagement as Engagement,
    compositeScore: composite.composite_score,
    dimensionScores: composite.dimension_scores,
    keyFindings: [],
    redFlags: [],
    regulatoryExposure: [],
    openValidationAreas: [],
    documentInventory: [],
    convictionStatement: "",
    headlineBullets: [],
  });

  const { data: report, error } = await supabase
    .from("reports")
    .insert({
      engagement_id,
      version,
      watermark,
      report_data: reportData,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logAuditEvent({
    action: "generate_report",
    entity: "report",
    entity_id: report.id,
    engagement_id,
    metadata: { version, watermark, composite_score: composite.composite_score },
  });

  return NextResponse.json(report, { status: 201 });
}
