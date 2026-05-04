// Single-section report generator. The client orchestrator calls
// this route once per section, sequentially, then concatenates the
// returned markdown. Keeping each LLM call to one section (~700-1800
// output tokens) ensures every request fits inside the Vercel Pro
// 300s function window on CPU-only inference.

import { NextResponse } from "next/server";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModelForTask, isOpenRouterConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { buildReportEvidenceContext, readKnowledgeBaseText } from "@/lib/reports/context";
import {
  getAdvancedReportConfig,
  buildUpdateSystemPrompt,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";
import { requireAuth, assertPreviewTabVisible } from "@/lib/security/authz";
import {
  applyDemoAnonymization,
  getDemoDisplayName,
  detectDemoLeakage,
  DEMO_SUBTITLE,
} from "@/lib/reports/demo-anonymize";
import {
  buildScoringSourceOfTruth,
  formatScoringSourceOfTruthForPrompt,
  detectSotMismatch,
} from "@/lib/reports/scoring-truth";

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
  /** Full markdown of a previously-generated saved report. When present,
   *  the LLM operates in update mode (REPORT_UPDATE_PROTOCOL) instead
   *  of generating from scratch. */
  existing_report?: string;
}

// Context assembly is now handled by the shared builder in
// @/lib/reports/context — keep this route thin so every data source
// flows into both report routes uniformly.

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

  // Auth — required for server-side KB read and section generation.
  let userId: string | null = null;
  try {
    const authCtx = await requireAuth();
    assertPreviewTabVisible(authCtx, "report");
    userId = authCtx.userId;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let evidence = "";
  let targetName = "";
  let clientName = "";
  let sot: ReturnType<typeof buildScoringSourceOfTruth> | null = null;
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildReportEvidenceContext(snapshot, { maxChars: 110_000 });
    targetName = snapshot.engagement.target_company_name;
    clientName = snapshot.engagement.client_firm_name;
    sot = buildScoringSourceOfTruth(snapshot);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not load engagement snapshot: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  // Server-side KB read is authoritative.
  const serverKbText = userId
    ? await readKnowledgeBaseText(userId, clientId, { maxChars: 24_000 })
    : "";
  const kbText = serverKbText || (body.knowledge_base ?? "").slice(0, 24_000);
  let combinedEvidence = kbText
    ? `${evidence}\n\n--- OPERATOR-SUBMITTED KNOWLEDGE BASE ---\n${kbText}`.slice(
        0,
        130_000,
      )
    : evidence;

  // Demo-only anonymization (Harvey → CounselFlow AI). No-op for any
  // engagement whose target name is not in the override map.
  const demoDisplay = getDemoDisplayName(targetName);
  if (demoDisplay) {
    combinedEvidence = applyDemoAnonymization(combinedEvidence, targetName);
    targetName = demoDisplay;
  }

  // Trim prior markdown so we never blow past the model's context.
  // Keep the tail (most recent sections) since coherence usually
  // depends on what was just written.
  const prior = (body.prior_markdown ?? "").slice(-16_000);

  const existingReport = (body.existing_report ?? "").slice(0, 48_000);
  const isUpdateMode = existingReport.length > 0;

  const systemPrompt = isUpdateMode
    ? buildUpdateSystemPrompt(config.systemPrompt)
    : config.systemPrompt;

  const demoLine = demoDisplay
    ? `\nDEMO MODE: true\nDEMO SUBTITLE: ${DEMO_SUBTITLE}`
    : "";
  const sotBlock = sot
    ? `\n\n${formatScoringSourceOfTruthForPrompt(sot)}`
    : "";
  if (sot) {
    // Server log so the binding is visible when debugging cards that
    // render zero scores or recommendations that drift from scoring.
    console.log("[reports/section] scoring_source_of_truth", {
      report_type: reportType,
      section_id: sectionId,
      client_id: sot.client_id,
      recommendation: sot.recommendation,
      risk_posture: sot.risk_posture,
      confidence_score: sot.confidence_score,
      composite_score: sot.composite_score,
      has_dimension_scores: !!sot.dimension_scores,
    });
  }
  const userPrompt = isUpdateMode
    ? `${config.userPromptIntro} — UPDATE MODE

TARGET: ${targetName}
CLIENT: ${clientName}${demoLine}${sotBlock}

PRIOR REPORT (existing version — parse baseline state from this):
"""
${existingReport}
"""

NEW / UPDATED EVIDENCE (delta since prior report was generated):
"""
${combinedEvidence}
"""

${prior ? `SECTIONS ALREADY UPDATED IN THIS RUN (for continuity — do NOT repeat them):\n"""\n${prior}\n"""\n\n` : ""}SECTION TO UPDATE NOW:
${section.instruction}

Follow the REPORT UPDATE PROTOCOL. Return markdown only. No preamble. No closing remark. No code fences.`
    : `${config.userPromptIntro}

TARGET: ${targetName}
CLIENT: ${clientName}${demoLine}${sotBlock}

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
        model: getOpenRouterModel("report"),
        messages: [
          { role: "system", content: systemPrompt },
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
          { role: "system", content: systemPrompt },
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

    // Demo-leakage guardrail. For non-demo runs, refuse to return any
    // section that mentions demo phrasing or demo display names — this
    // catches prompts that hardcode demo strings or engagements that
    // were mis-routed through the demo override map.
    const leak = detectDemoLeakage(content, !!demoDisplay);
    if (leak) {
      return NextResponse.json(
        {
          error:
            "Demo naming detected in non-demo report. Please regenerate with correct client context.",
          debug: { leaked_pattern: leak, section_id: sectionId },
        },
        { status: 422 },
      );
    }

    // Scoring Source-of-Truth guardrail. Compare the recommendation,
    // posture, and confidence emitted by the LLM in the snapshot /
    // Investment-Committee-Read sections to the SOT and block when the
    // narrative drifts from the locked scoring decision.
    if (sot) {
      const mismatches = detectSotMismatch(content, sot);
      console.log("[reports/section] sot_validation", {
        section_id: sectionId,
        mismatches,
      });
      if (mismatches.length > 0) {
        return NextResponse.json(
          {
            error:
              "Report recommendation conflicts with scoring source of truth. Regenerate using locked scoring decision.",
            debug: {
              section_id: sectionId,
              mismatches,
              scoring_source_of_truth: sot,
            },
          },
          { status: 422 },
        );
      }
    }

    return NextResponse.json({
      report_type: reportType,
      section_id: sectionId,
      section_label: section.label,
      title: config.title,
      content,
      is_update: isUpdateMode,
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
