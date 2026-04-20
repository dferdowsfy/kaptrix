import { NextResponse } from "next/server";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModel, getSelfHostedLlmModelForTask, isGroqConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { getGroqClient } from "@/lib/anthropic/client";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { PREVIEW_CLIENTS } from "@/lib/preview-clients";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  client_id: string;
  knowledge_base?: string;
}

// All inference now runs on the self-hosted Ollama instance.
// Qwen does NOT have built-in web search, so benchmarks are drawn
// from the model's training knowledge + operator-provided KB only.
const SYSTEM_PROMPT = `You are an AI diligence analyst performing CONTEXTUAL BENCHMARKING.
You assess companies RELATIVE to contextually relevant peers drawn from your training knowledge
and any operator-provided context. You do NOT have web access; be explicit about this limitation
in your confidence rating.

Procedure:
1. TARGET CONTEXT — classify the target (organization or product), industry, AI use case, business model, customer segment, data sensitivity, deployment maturity, vendor stack, regulatory exposure, architecture pattern.
2. COMPARABLE SELECTION — pick 3-7 REAL, NAMED competitors / analog products you are confident existed as of your training cutoff. Match on AI use case, business model, data sensitivity, deployment maturity, technical approach, regulatory constraints. If you cannot verify a peer, OMIT it — never invent companies. Source URLs may be approximate homepage URLs.
3. RELATIVE COMPARISON — for each dimension, classify target as "ahead" / "in_line" / "behind" peers, with concrete evidence.
4. POSITIONING SUMMARY — specific, non-generic relative position.
5. INVESTMENT INTERPRETATION — differentiation real? durability? risk concentration? validation priorities?
6. CONFIDENCE — low/medium/high. Mark low or medium if recent data would materially change the picture.

Return ONLY valid JSON matching this exact schema (no prose, no markdown, no code fences):
{
  "target_context": {
    "type": "organization" | "product",
    "industry": string,
    "business_model": string,
    "ai_use_case": string,
    "customer_segment": string,
    "data_sensitivity": string,
    "deployment_maturity": string,
    "vendor_stack": string,
    "regulatory_exposure": string,
    "architecture_pattern": string
  },
  "comparables": [
    { "name": string, "type": "company" | "product" | "analog", "rationale": string, "source_url": string }
  ],
  "comparison": [
    { "dimension": string, "position": "ahead" | "in_line" | "behind", "evidence": string }
  ],
  "positioning_summary": string,
  "investment_interpretation": {
    "differentiation": string,
    "durability": string,
    "risk_concentration": string,
    "validation_priorities": [string]
  },
  "confidence": "low" | "medium" | "high",
  "confidence_rationale": string
}`;

function buildEvidence(
  snapshot: Awaited<ReturnType<typeof getPreviewSnapshot>>,
): string {
  const parts: string[] = [];
  // Note: target_company_name is intentionally PUBLIC (it's what we're
  // benchmarking). Client firm name is excluded entirely.
  parts.push(
    `TARGET: ${snapshot.engagement.target_company_name} | stage: ${snapshot.engagement.deal_stage}`,
  );
  snapshot.knowledgeInsights.slice(0, 8).forEach((k) => {
    parts.push(`[insight] ${k.insight.slice(0, 220)}`);
  });
  snapshot.analyses.slice(0, 3).forEach((a) => {
    a.red_flags.slice(0, 3).forEach((f) =>
      parts.push(`[red flag · ${f.dimension}] ${f.flag.slice(0, 180)}`),
    );
  });
  parts.push(
    `[summary] ${snapshot.executiveReport.executive_summary.slice(0, 600)}`,
  );
  snapshot.executiveReport.critical_findings.slice(0, 4).forEach((f) =>
    parts.push(
      `[finding · ${f.severity}] ${f.title}: ${f.what_we_found.slice(0, 180)}`,
    ),
  );
  snapshot.scores.slice(0, 12).forEach((s) =>
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)}`,
    ),
  );
  return parts.join("\n").slice(0, 6000);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error("No JSON object found in model response");
  }
}

export async function POST(req: Request) {
  const useGroq = isGroqConfigured();
  if (!useGroq && !isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set GROQ_API_KEY or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_MODEL.",
      },
      { status: 503 },
    );
  }

  // Rate-limit — self-hosted is cheap but we still don't want abuse.
  const { checkRateLimit, callerKey } = await import(
    "@/lib/security/rate-limit"
  );
  const rl = checkRateLimit({
    key: callerKey(req.headers, null, "positioning"),
    limit: 20,
    windowSeconds: 60,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSeconds) },
      },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const clientId = (body.client_id ?? "").trim();
  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }

  let evidence = "";
  let targetName = "";
  let industry = "";
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildEvidence(snapshot);
    targetName = snapshot.engagement.target_company_name;
    industry = PREVIEW_CLIENTS.find((c) => c.id === clientId)?.industry ?? "";
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not load engagement snapshot: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  const operatorKb = (body.knowledge_base ?? "").slice(0, 2000);

  // Gate every outbound piece through the LLM policy layer.
  // Self-hosted stays on our infra, so tier is "internal_only".
  const { gateInference } = await import("@/lib/security/llm-policy");
  const model = getSelfHostedLlmModel();
  const [evDecision, kbDecision] = await Promise.all([
    gateInference({
      provider: "self_hosted",
      model,
      tier: "internal_only",
      content: evidence,
    }),
    gateInference({
      provider: "self_hosted",
      model,
      tier: "internal_only",
      content: operatorKb,
    }),
  ]);
  if (!evDecision.allowed) {
    return NextResponse.json(
      { error: "Inference blocked for this engagement" },
      { status: 451 },
    );
  }
  const safeEvidence = evDecision.safeContent;
  const safeOperatorKb = kbDecision.safeContent;

  const userPrompt = `TARGET COMPANY: ${targetName}${industry ? ` (${industry})` : ""}

INTERNAL EVIDENCE (sanitized):
"""
${safeEvidence}
"""

${safeOperatorKb ? `OPERATOR KNOWLEDGE BASE (sanitized):\n"""\n${safeOperatorKb}\n"""\n\n` : ""}TASK:
Identify REAL competitors / analog products of "${targetName}" from your training knowledge. For each peer provide a best-effort source URL (company homepage is fine). Then produce the contextual benchmarking JSON exactly per the schema. Return ONLY the JSON object — no commentary.`;

  try {
    let text: string;

    if (useGroq) {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        max_completion_tokens: 2500,
        response_format: { type: "json_object" },
      });
      text = (completion.choices[0]?.message?.content ?? "").trim();
    } else {
      const resp = await llmChat({
        model: getSelfHostedLlmModelForTask("positioning"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2500,
        jsonMode: true,
      });
      text = resp.content;
    }

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text.slice(0, 2000) },
        { status: 502 },
      );
    }

    // No web-search annotations from self-hosted; sources live inside
    // the returned JSON (`comparables[].source_url`).
    return NextResponse.json({ positioning: parsed, sources: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Positioning request failed: ${message}` },
      { status: 502 },
    );
  }
}
