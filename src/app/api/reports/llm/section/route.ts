// Single-section report generator. The client orchestrator calls
// this route once per section, sequentially, then concatenates the
// returned markdown. Keeping each LLM call to one section (~700-1800
// output tokens) ensures every request fits inside the Vercel Pro
// 300s function window on CPU-only inference.

import { NextResponse } from "next/server";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModelForTask, isOpenRouterConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, OPENROUTER_REPORT_MODEL } from "@/lib/llm/openrouter";
import { getPreviewSnapshot } from "@/lib/preview/data";
import {
  getAdvancedReportConfig,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  client_id: string;
  report_type: AdvancedReportId;
  section_id: string;
  /** Operator-submitted knowledge base (intake, coverage, insights, etc.). */
  knowledge_base?: string;
  /** Concatenated markdown of sections already generated in this run.
   *  Passed back to the model so it can maintain coherence without
   *  duplicating content. Truncated server-side to protect context. */
  prior_markdown?: string;
}

function buildContextFromSnapshot(
  snapshot: Awaited<ReturnType<typeof getPreviewSnapshot>>,
): string {
  const parts: string[] = [];
  parts.push(
    `ENGAGEMENT: target=${snapshot.engagement.target_company_name}, client=${snapshot.engagement.client_firm_name}, deal_stage=${snapshot.engagement.deal_stage}, tier=${snapshot.engagement.tier}.`,
  );
  snapshot.knowledgeInsights.forEach((k) => {
    parts.push(`[${k.source_document}] ${k.insight} — excerpt: ${k.excerpt}`);
  });
  snapshot.analyses.forEach((a) => {
    a.extracted_claims.forEach((c) => {
      parts.push(`[${c.source_doc} ${c.source_location}] claim: ${c.claim}`);
    });
    a.red_flags.forEach((f) => {
      parts.push(
        `[red flag · ${f.severity} · ${f.dimension}] ${f.flag} — ${f.evidence}`,
      );
    });
    a.regulatory_signals.forEach((r) => {
      parts.push(
        `[regulatory · ${r.exposure_level}] ${r.regulation} — ${r.relevance}`,
      );
    });
    a.open_questions.forEach((q) => parts.push(`[open question] ${q}`));
    a.vendor_dependencies.forEach((v) => parts.push(`[vendor] ${v}`));
    a.model_dependencies.forEach((m) => parts.push(`[model] ${m}`));
  });
  parts.push(
    `[executive summary] ${snapshot.executiveReport.executive_summary}`,
  );
  parts.push(
    `[strategic context] ${snapshot.executiveReport.strategic_context}`,
  );
  snapshot.executiveReport.critical_findings.forEach((f) => {
    parts.push(
      `[finding · ${f.severity}] ${f.title}. ${f.what_we_found}. Why it matters: ${f.why_it_matters}. Evidence: ${f.operator_evidence}`,
    );
  });
  snapshot.executiveReport.recommended_conditions.forEach((c) => {
    parts.push(`[condition] ${c.condition} (owner ${c.owner}). ${c.rationale}`);
  });
  snapshot.executiveReport.value_creation_levers.forEach((l) => {
    parts.push(`[value lever · ${l.time_horizon}] ${l.lever} — ${l.thesis}`);
  });
  snapshot.executiveReport.risk_heat_map.forEach((r) => {
    parts.push(
      `[risk · ${r.category}] ${r.risk} (likelihood ${r.likelihood}, impact ${r.impact})`,
    );
  });
  snapshot.scores.forEach((s) => {
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)} — ${s.operator_rationale}`,
    );
  });
  snapshot.documents.forEach((d) => {
    parts.push(
      `[document] ${d.filename} (${d.category}, status: ${d.parse_status})`,
    );
  });
  return parts.join("\n").slice(0, 70_000);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = (body.client_id ?? "").trim();
  const reportType = body.report_type;
  const sectionId = (body.section_id ?? "").trim();

  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }
  if (!sectionId) {
    return NextResponse.json({ error: "Missing section_id" }, { status: 400 });
  }

  const config = getAdvancedReportConfig(reportType);
  if (!config) {
    return NextResponse.json(
      { error: `Unknown report_type: ${reportType}` },
      { status: 400 },
    );
  }
  const section = config.sections?.find((s) => s.id === sectionId);
  if (!section) {
    return NextResponse.json(
      { error: `Unknown section_id: ${sectionId} for ${reportType}` },
      { status: 400 },
    );
  }

  const useOpenRouter = isOpenRouterConfigured();
  if (!useOpenRouter && !isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set OPENROUTER_API_KEY or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_MODEL in .env.local / Vercel.",
      },
      { status: 503 },
    );
  }

  let evidence = "";
  let targetName = "";
  let clientName = "";
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildContextFromSnapshot(snapshot);
    targetName = snapshot.engagement.target_company_name;
    clientName = snapshot.engagement.client_firm_name;
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not load engagement snapshot: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  const kbText = (body.knowledge_base ?? "").slice(0, 20_000);
  const combinedEvidence = kbText
    ? `${evidence}\n\n--- OPERATOR-SUBMITTED KNOWLEDGE BASE ---\n${kbText}`.slice(
        0,
        90_000,
      )
    : evidence;

  // Trim prior markdown so we never blow past the model's context.
  // Keep the tail (most recent sections) since coherence usually
  // depends on what was just written.
  const prior = (body.prior_markdown ?? "").slice(-12_000);

  const userPrompt = `${config.userPromptIntro}

TARGET: ${targetName}
CLIENT: ${clientName}

EVIDENCE (use only what is supported here; label uncertainty where the evidence is thin):
"""
${combinedEvidence}
"""

${prior ? `PREVIOUSLY GENERATED SECTIONS OF THIS REPORT (for continuity — do NOT repeat them):\n"""\n${prior}\n"""\n\n` : ""}SECTION TO GENERATE NOW:
${section.instruction}

Return markdown only. No preamble. No closing remark. No code fences.`;

  try {
    let content: string;
    let finishReason: string | null;

    if (useOpenRouter) {
      // OpenRouter: pay-per-token, no rate-limit wall.
      const resp = await openRouterChat({
        model: OPENROUTER_REPORT_MODEL,
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: section.maxTokens,
      });
      content = resp.content;
      finishReason = resp.finishReason;
    } else {
      // Fallback: self-hosted Ollama (CPU, ~4 tok/s).
      const resp = await llmChat({
        model: getSelfHostedLlmModelForTask("report"),
        messages: [
          { role: "system", content: config.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: Math.min(section.maxTokens, 1100),
      });
      content = resp.content;
      finishReason = resp.finishReason;
    }

    if (!content) {
      return NextResponse.json(
        {
          error:
            "Model returned an empty response for this section. Retry the section.",
          debug: { finish_reason: finishReason, section_id: sectionId },
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      report_type: reportType,
      section_id: sectionId,
      section_label: section.label,
      title: config.title,
      content,
      generated_at: new Date().toISOString(),
      target: targetName,
      client: clientName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Section generation failed: ${message}` },
      { status: 502 },
    );
  }
}
