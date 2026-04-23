import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  SCORING_SYSTEM_PROMPT,
  buildScoringUserPrompt,
  parseScoringResponse,
} from "@/lib/market-intelligence/prompts/scoring-generator";
import { logAuditEvent } from "@/lib/audit/logger";
import type { MiIntakeQuestion, MiThesisAssumption, MiEvidenceItem, MiDimension, MiInsight } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await params;

  try {
    const authCtx = await requireAuth();
    await assertEngagementAccess(authCtx, engagementId);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOpenRouterConfigured() && !isSelfHostedLlmConfigured()) {
    return NextResponse.json({ error: "No LLM provider configured." }, { status: 503 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const [
    { data: profile },
    { data: intake },
    { data: assumptions },
    { data: evidence },
    { data: insights },
  ] = await Promise.all([
    svc
      .from("engagement_category_profile")
      .select("thesis, category_name, time_horizon_months")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
    svc
      .from("mi_intake_questions")
      .select("questions")
      .eq("engagement_id", engagementId)
      .maybeSingle(),
    svc
      .from("mi_thesis_assumptions")
      .select("assumption_text, evidence_status, load_bearing_score")
      .eq("engagement_id", engagementId)
      .order("ordering"),
    svc
      .from("mi_evidence_items")
      .select("source_type, source_name, excerpt, confidence")
      .eq("engagement_id", engagementId),
    svc
      .from("mi_insights")
      .select("insight_type, content, user_edited_content")
      .eq("engagement_id", engagementId),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "No category profile found" }, { status: 404 });
  }

  const intakeSummary = (
    Array.isArray(intake?.questions) ? (intake.questions as MiIntakeQuestion[]) : []
  )
    .filter((q) => q.answer?.trim())
    .map((q) => `[${q.category}] ${q.question}: ${q.answer}`)
    .join("\n")
    .slice(0, 4000);

  const assumptionsSummary = (
    (assumptions ?? []) as Pick<MiThesisAssumption, "assumption_text" | "evidence_status" | "load_bearing_score">[]
  )
    .map((a) => `[${a.evidence_status}] ${a.assumption_text}`)
    .join("\n")
    .slice(0, 3000);

  const evidenceSummary = (
    (evidence ?? []) as Pick<MiEvidenceItem, "source_type" | "source_name" | "excerpt" | "confidence">[]
  )
    .map((e) => `[${e.source_type} · ${e.confidence}] ${e.source_name}${e.excerpt ? `: "${e.excerpt.slice(0, 150)}"` : ""}`)
    .join("\n")
    .slice(0, 5000);

  const insightsSummary = (
    (insights ?? []) as Pick<MiInsight, "insight_type" | "content" | "user_edited_content">[]
  )
    .map((i) => {
      const c = i.user_edited_content ?? i.content;
      return `[${i.insight_type}] ${JSON.stringify(c).slice(0, 500)}`;
    })
    .join("\n")
    .slice(0, 4000);

  const userPrompt = buildScoringUserPrompt({
    category_name: profile.category_name,
    thesis: profile.thesis ?? "",
    time_horizon_months: profile.time_horizon_months,
    intake_summary: intakeSummary,
    assumptions_summary: assumptionsSummary,
    evidence_summary: evidenceSummary,
    insights_summary: insightsSummary,
  });

  let rawContent: string;
  let modelUsed: string;

  try {
    if (isOpenRouterConfigured()) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("scoring"),
        messages: [
          { role: "system", content: SCORING_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens: 2500,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = resp.model;
    } else {
      const resp = await llmChat({
        messages: [
          { role: "system", content: SCORING_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens: 2000,
        jsonMode: true,
      });
      rawContent = resp.content;
      modelUsed = "self_hosted";
    }
  } catch (err) {
    return NextResponse.json(
      { error: `LLM error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  let scores;
  try {
    scores = parseScoringResponse(rawContent, engagementId, modelUsed);
  } catch (err) {
    return NextResponse.json(
      { error: `Parse error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  // Upsert all 7 scores.
  const { data, error } = await svc
    .from("mi_scores")
    .upsert(scores, { onConflict: "engagement_id,dimension" })
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent({
    action: "mi.scores.generate",
    entity: "mi_scores",
    engagement_id: engagementId,
    metadata: { dimension_count: scores.length, model: modelUsed },
  });

  return NextResponse.json(data);
}
