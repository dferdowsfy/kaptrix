import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/logger";

// Pre-analysis API — triggers AI pre-analysis for an engagement
// Phase 1: plumbing only — Anthropic API calls will be wired in Module 2

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { engagement_id } = await request.json();

  if (!engagement_id) {
    return NextResponse.json(
      { error: "Missing engagement_id" },
      { status: 400 },
    );
  }

  // Get all parsed documents for this engagement
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("engagement_id", engagement_id)
    .eq("parse_status", "parsed");

  if (!documents || documents.length === 0) {
    return NextResponse.json(
      { error: "No parsed documents available for pre-analysis" },
      { status: 400 },
    );
  }

  // Get active prompt version
  const { data: promptVersion } = await supabase
    .from("prompt_versions")
    .select("*")
    .eq("prompt_key", "pre_analysis")
    .eq("is_active", true)
    .single();

  const version = promptVersion?.version ?? "1.0.0";
  const model = promptVersion?.model ?? "claude-sonnet-4-20250514";

  // Create pre-analysis records for each document (status: running)
  const analysisRecords = documents.map((doc) => ({
    engagement_id,
    document_id: doc.id,
    analysis_type: "per_document" as const,
    model_used: model,
    prompt_version: version,
    status: "running" as const,
  }));

  const { data: analyses, error } = await supabase
    .from("pre_analyses")
    .insert(analysisRecords)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update engagement status
  await supabase
    .from("engagements")
    .update({ status: "analysis" })
    .eq("id", engagement_id);

  await logAuditEvent({
    action: "run_pre_analysis",
    entity: "engagement",
    entity_id: engagement_id,
    engagement_id,
    metadata: {
      document_count: documents.length,
      model,
      prompt_version: version,
    },
  });

  // TODO: Trigger actual Anthropic API calls here (Module 2)
  // For now, the records are created with status "running"

  return NextResponse.json(
    {
      message: "Pre-analysis started",
      analyses: analyses?.map((a) => ({ id: a.id, document_id: a.document_id })),
    },
    { status: 202 },
  );
}
