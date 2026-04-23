import { NextRequest, NextResponse } from "next/server";
import { requireAuth, assertEngagementAccess } from "@/lib/security/authz";
import { isOpenRouterConfigured, isSelfHostedLlmConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import {
  REPORT_SYSTEM_PROMPT,
  MI_REPORT_SECTIONS,
} from "@/lib/market-intelligence/prompts/report-sections";
import type {
  MiIntakeQuestion,
  MiThesisAssumption,
  MiEvidenceItem,
  MiScore,
  MiInsight,
  MiShortlistCompany,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Fetch all the context needed to build a section prompt. */
async function fetchMiContext(svc: NonNullable<ReturnType<typeof getServiceClient>>, engagementId: string) {
  const [
    { data: profile },
    { data: intake },
    { data: assumptions },
    { data: evidence },
    { data: insights },
    { data: scores },
    { data: shortlist },
  ] = await Promise.all([
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
      .select("assumption_text, assumption_category, evidence_status, load_bearing_score, ordering")
      .eq("engagement_id", engagementId)
      .order("ordering"),
    svc
      .from("mi_evidence_items")
      .select("source_type, source_name, excerpt, confidence, recency_date")
      .eq("engagement_id", engagementId),
    svc
      .from("mi_insights")
      .select("insight_type, content, user_edited_content")
      .eq("engagement_id", engagementId),
    svc
      .from("mi_scores")
      .select("dimension, score_0_to_5, llm_justification, operator_override, operator_rationale")
      .eq("engagement_id", engagementId),
    svc
      .from("mi_shortlist_companies")
      .select("company_name, rationale, signal_summary")
      .eq("engagement_id", engagementId),
  ]);

  return { profile, intake, assumptions, evidence, insights, scores, shortlist };
}

function buildSectionUserPrompt(
  sectionInstruction: string,
  context: {
    category_name: string;
    thesis: string;
    time_horizon_months: number | null;
    assumptions: Pick<MiThesisAssumption, "assumption_text" | "evidence_status" | "load_bearing_score">[];
    evidence: Pick<MiEvidenceItem, "source_type" | "source_name" | "excerpt" | "confidence">[];
    insights: Pick<MiInsight, "insight_type" | "content" | "user_edited_content">[];
    scores: Pick<MiScore, "dimension" | "score_0_to_5" | "llm_justification" | "operator_override" | "operator_rationale">[];
    shortlist: Pick<MiShortlistCompany, "company_name" | "rationale" | "signal_summary">[];
    intake_answered: { category: string; question: string; answer: string }[];
  },
): string {
  const horizon = context.time_horizon_months
    ? `${context.time_horizon_months} months`
    : "not specified";

  const assumptionLines = context.assumptions
    .map((a) => `[${a.evidence_status.toUpperCase()}] (load_bearing: ${a.load_bearing_score ?? "?"}) ${a.assumption_text}`)
    .join("\n")
    .slice(0, 4000);

  const evidenceLines = context.evidence
    .map((e) => `[${e.source_type} · ${e.confidence}] ${e.source_name}${e.excerpt ? `: "${e.excerpt.slice(0, 200)}"` : ""}`)
    .join("\n")
    .slice(0, 6000);

  const scoreLines = context.scores
    .map((s) => {
      const justification = s.operator_override ? s.operator_rationale : s.llm_justification;
      return `${s.dimension}: ${s.score_0_to_5}/5 — ${(justification ?? "").slice(0, 200)}`;
    })
    .join("\n");

  const insightLines = context.insights
    .map((i) => {
      const c = i.user_edited_content ?? i.content;
      return `[${i.insight_type}] ${JSON.stringify(c).slice(0, 500)}`;
    })
    .join("\n")
    .slice(0, 5000);

  const shortlistLines = context.shortlist
    .map((c) => `${c.company_name}: ${c.rationale ?? ""}${c.signal_summary ? ` | Signal: ${c.signal_summary}` : ""}`)
    .join("\n");

  const intakeLines = context.intake_answered
    .map((q) => `[${q.category}] ${q.question}: ${q.answer}`)
    .join("\n")
    .slice(0, 3000);

  return `CATEGORY: ${context.category_name}
TIME HORIZON: ${horizon}

THESIS:
"""
${context.thesis}
"""

THESIS ASSUMPTIONS (${context.assumptions.length} total):
"""
${assumptionLines || "(none extracted)"}
"""

EVIDENCE ITEMS (${context.evidence.length} total):
"""
${evidenceLines || "(none added)"}
"""

DIMENSION SCORES:
"""
${scoreLines || "(not yet scored)"}
"""

INSIGHTS:
"""
${insightLines || "(not yet generated)"}
"""

COMPANY SHORTLIST (${context.shortlist.length} companies):
"""
${shortlistLines || "(none added)"}
"""

INTAKE Q&A:
"""
${intakeLines || "(none answered)"}
"""

SECTION TASK:
${sectionInstruction}`;
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

  const body = (await req.json()) as { section_id: string };
  if (!body.section_id) {
    return NextResponse.json({ error: "section_id required" }, { status: 400 });
  }

  const section = MI_REPORT_SECTIONS.find((s) => s.id === body.section_id);
  if (!section) {
    return NextResponse.json({ error: `Unknown section_id: ${body.section_id}` }, { status: 400 });
  }

  const svc = getServiceClient();
  if (!svc) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { profile, intake, assumptions, evidence, insights, scores, shortlist } =
    await fetchMiContext(svc, engagementId);

  if (!profile) {
    return NextResponse.json({ error: "No category profile found" }, { status: 404 });
  }

  const intakeAnswered = (
    Array.isArray(intake?.questions) ? (intake.questions as MiIntakeQuestion[]) : []
  )
    .filter((q) => q.answer?.trim())
    .map((q) => ({ category: q.category, question: q.question, answer: q.answer ?? "" }));

  const userPrompt = buildSectionUserPrompt(section.instruction, {
    category_name: profile.category_name,
    thesis: profile.thesis ?? "",
    time_horizon_months: profile.time_horizon_months,
    assumptions: (assumptions ?? []) as Pick<MiThesisAssumption, "assumption_text" | "evidence_status" | "load_bearing_score">[],
    evidence: (evidence ?? []) as Pick<MiEvidenceItem, "source_type" | "source_name" | "excerpt" | "confidence">[],
    insights: (insights ?? []) as Pick<MiInsight, "insight_type" | "content" | "user_edited_content">[],
    scores: (scores ?? []) as Pick<MiScore, "dimension" | "score_0_to_5" | "llm_justification" | "operator_override" | "operator_rationale">[],
    shortlist: (shortlist ?? []) as Pick<MiShortlistCompany, "company_name" | "rationale" | "signal_summary">[],
    intake_answered: intakeAnswered,
  });

  let content: string;
  try {
    if (isOpenRouterConfigured()) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("report"),
        messages: [
          { role: "system", content: REPORT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: section.maxTokens,
      });
      content = resp.content;
    } else {
      const resp = await llmChat({
        messages: [
          { role: "system", content: REPORT_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: section.maxTokens,
      });
      content = resp.content;
    }
  } catch (err) {
    return NextResponse.json(
      { error: `LLM error: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 502 },
    );
  }

  return NextResponse.json({
    section_id: section.id,
    section_label: section.label,
    content,
  });
}
