import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  buildInsightsSystemPrompt,
  buildInsightsUserPrompt,
} from "@/lib/market-intelligence/prompts/insights-generator";
import { logAuditEvent } from "@/lib/audit/logger";
import type { MiInsightType, MiIntakeQuestion, MiThesisAssumption, MiEvidenceItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALL_INSIGHT_TYPES: MiInsightType[] = [
  "pressure_test",
  "structure_map",
  "threat_model",
  "company_shortlist",
  "gap_map",
  "adjacent_category",
  "timing_read",
];

function summarizeIntake(questions: MiIntakeQuestion[]): string {
  return questions
    .filter((q) => q.answer?.trim())
    .map((q) => `[${q.category}] ${q.question}\n→ ${q.answer}`)
    .join("\n\n")
    .slice(0, 6000);
}

function summarizeAssumptions(assumptions: MiThesisAssumption[]): string {
  return assumptions
    .sort((a, b) => b.ordering - a.ordering)
    .map(
      (a) =>
        `[${a.evidence_status.toUpperCase()}] (load_bearing: ${a.load_bearing_score ?? "?"}) ${a.assumption_text}`,
    )
    .join("\n")
    .slice(0, 4000);
}

function summarizeEvidence(items: MiEvidenceItem[]): string {
  return items
    .map(
      (e) =>
        `[${e.source_type} · ${e.confidence}] ${e.source_name}${e.excerpt ? `: "${e.excerpt.slice(0, 200)}"` : ""}`,
    )
    .join("\n")
    .slice(0, 8000);
}

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

  const body = (await req.json()) as { types?: MiInsightType[] };
  const typesToGenerate = body.types ?? ALL_INSIGHT_TYPES;

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  // Load context from DB.
  const [{ data: profile }, { data: intake }, { data: assumptions }, { data: evidence }] =
    await Promise.all([
      svc
        .from("engagement_category_profile")
        .select("thesis, category_name, time_horizon_months, peer_categories")
        .eq("engagement_id", engagementId)
        .maybeSingle(),
      svc
        .from("mi_intake_questions")
        .select("questions")
        .eq("engagement_id", engagementId)
        .maybeSingle(),
      svc
        .from("mi_thesis_assumptions")
        .select("*")
        .eq("engagement_id", engagementId)
        .order("ordering"),
      svc
        .from("mi_evidence_items")
        .select("*")
        .eq("engagement_id", engagementId)
        .order("created_at", { ascending: false }),
    ]);

  if (!profile) {
    return NextResponse.json({ error: "No category profile found" }, { status: 404 });
  }

  const intakeSummary = summarizeIntake(
    Array.isArray(intake?.questions) ? (intake.questions as MiIntakeQuestion[]) : [],
  );
  const assumptionsSummary = summarizeAssumptions(
    (assumptions ?? []) as MiThesisAssumption[],
  );
  const evidenceSummary = summarizeEvidence((evidence ?? []) as MiEvidenceItem[]);

  const results: Record<string, unknown> = {};
  const systemPrompt = buildInsightsSystemPrompt();

  for (const insightType of typesToGenerate) {
    const userPrompt = buildInsightsUserPrompt({
      category_name: profile.category_name,
      thesis: profile.thesis ?? "",
      time_horizon_months: profile.time_horizon_months,
      peer_categories: Array.isArray(profile.peer_categories)
        ? (profile.peer_categories as string[])
        : [],
      intake_summary: intakeSummary,
      assumptions_summary: assumptionsSummary,
      evidence_summary: evidenceSummary,
      insight_type: insightType,
    });

    let rawContent: string;
    let modelUsed: string;

    try {
      if (isOpenRouterConfigured()) {
        const resp = await openRouterChat({
          model: getOpenRouterModel("report"),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          maxTokens: 1800,
          jsonMode: true,
        });
        rawContent = resp.content;
        modelUsed = resp.model;
      } else {
        const resp = await llmChat({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          maxTokens: 1500,
          jsonMode: true,
        });
        rawContent = resp.content;
        modelUsed = "self_hosted";
      }
    } catch (err) {
      results[insightType] = {
        error: `LLM error: ${err instanceof Error ? err.message : "unknown"}`,
      };
      continue;
    }

    // Parse JSON from response.
    let content: Record<string, unknown>;
    try {
      const trimmed = rawContent.trim();
      const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const candidate = fenced ? fenced[1] : trimmed;
      const first = candidate.indexOf("{");
      const last = candidate.lastIndexOf("}");
      content =
        first >= 0 && last > first
          ? (JSON.parse(candidate.slice(first, last + 1)) as Record<string, unknown>)
          : {};
    } catch {
      content = { raw: rawContent };
    }

    // Upsert insight.
    const { data: upserted, error: upsertErr } = await svc
      .from("mi_insights")
      .upsert(
        {
          engagement_id: engagementId,
          insight_type: insightType,
          content,
          raw_llm_output: rawContent,
          generated_by_model: modelUsed,
          generated_at: new Date().toISOString(),
          user_edited_at: null,
          user_edited_content: null,
        },
        { onConflict: "engagement_id,insight_type" },
      )
      .select()
      .single();

    results[insightType] = upsertErr
      ? { error: upsertErr.message }
      : upserted;
  }

  await logAuditEvent({
    action: "mi.insights.generate",
    entity: "mi_insights",
    engagement_id: engagementId,
    metadata: { types: typesToGenerate },
  });

  return NextResponse.json(results);
}
