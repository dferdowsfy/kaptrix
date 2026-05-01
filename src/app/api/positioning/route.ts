import { NextResponse } from "next/server";
import { isSelfHostedLlmConfigured, getSelfHostedLlmModel, getSelfHostedLlmModelForTask, isOpenRouterConfigured } from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { PREVIEW_CLIENTS } from "@/lib/preview-clients";
import {
  AuthError,
  assertPreviewTabVisible,
  authErrorResponse,
  requireAuth,
} from "@/lib/security/authz";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  client_id: string;
  knowledge_base?: string;
}

// All inference now runs on the self-hosted Ollama instance.
// Qwen does NOT have built-in web search, so benchmarks are drawn
// from the model's training knowledge + operator-provided KB only.
const SYSTEM_PROMPT = `You select comparable companies for AI-product diligence, then benchmark the target against them. Peer sets must reflect the target's COMMERCIAL REALITY — who buys it and in what vertical — not its technical keywords. You do NOT have web access; draw peers from your training knowledge plus the engagement evidence provided. Be explicit about that limitation in your confidence rating.

INPUTS you must synthesize across:
- Intake responses — what the target does, who buys it, what industry/vertical it serves, regulatory frameworks, named competitors, architecture pattern, revenue stage, geography.
- Uploaded evidence (findings, red flags, scores, executive summary excerpts) — these often CONTRADICT or REFINE the intake framing. Trust evidence over claims.
- Industry category — assigned to the engagement. This defines the vertical peer universe.

CORE RULE
Industry vertical and buyer segment are HARD FILTERS. Architecture and technical pattern are SOFT SIGNALS. A peer that sells to the same buyer with a DIFFERENT architecture is a BETTER comp than a peer with the SAME architecture selling to a DIFFERENT buyer.

SELECTION CONSTRAINTS

1) Inclusion (ALL required for every peer returned):
   • Serves the same industry vertical as the target.
   • Sells to the same buyer persona, OR is a named incumbent displacing the same budget line.
   • Has at least one named customer in the target's persona, OR a public product SKU explicitly addressing that persona.
   • Operates at a roughly comparable revenue stage, OR is a strategic acquirer / incumbent with material presence.

2) Exclusion (REJECT if ANY apply):
   • Horizontal AI/ML infrastructure (data warehouses, MLOps, foundation-model providers, vector DBs, observability).
   • Horizontal enterprise search / knowledge management without a vertical-specific SKU for the target's industry.
   • Generic "AI platform" companies without a vertical wedge.
   • Companies whose only link to the vertical is a case study, not a product SKU.

3) Required Breadth — span these categories; skip a category only if no credible vertical candidate exists:
   A. Direct vertical-native competitors.
   B. Incumbent platforms with AI extensions.
   C. Adjacent vertical workflow players.
   D. Horizontal AI threats with credible vertical expansion signals — label as THREAT CONTEXT, not as revenue peers.

SCORING DIMENSIONS (use these when comparing):
Customer footprint in the target's persona; depth of workflow specialization for the vertical; data-handling posture vs the target's data sensitivity; regulatory alignment with frameworks identified in intake; unit-economics signals where disclosed; distribution strength and switching cost in the vertical.

RETRIEVAL GUIDANCE
- Do NOT rank purely on semantic similarity to the target's description — that pulls horizontal AI clusters on any AI-native target.
- Anchor your mental search on the VERTICAL and the BUYER, not on the target's technical stack.
- Use named competitors from intake as SEEDS and expand from each one's own named competitors.
- Cross-check every candidate against the inclusion and exclusion rules before including it.

SELF-CHECK — before returning:
 ✔ Every peer has a named customer OR a product SKU in the target's vertical.
 ✔ No peer is a horizontal AI/ML infrastructure company.
 ✔ The peer set spans at least TWO of the four breadth categories (A/B/C/D).
 ✔ If fewer than three peers pass ALL checks, return what you have and set "insufficient_vertical_comps": true with a short reason. Do NOT pad with horizontal matches.

PROCEDURE
1. TARGET CONTEXT — classify the target: organization vs product, industry, business model, AI use case, customer segment, data sensitivity, deployment maturity, vendor stack, regulatory exposure, architecture pattern.
2. COMPARABLE SELECTION — apply the constraints above. 3–7 peers. Never invent a company; if unsure, omit. Source URL may be the company's homepage.
3. RELATIVE COMPARISON — for each scoring dimension, classify target as "ahead" / "in_line" / "behind" vs the peer set, with concrete evidence drawn from the provided internal evidence.
4. POSITIONING SUMMARY — one specific, non-generic sentence about where the target sits relative to the peer set.
5. INVESTMENT INTERPRETATION — differentiation real? durability? risk concentration? validation priorities?
6. CONFIDENCE — low/medium/high, and why (flag if recent data would materially change the picture, or if vertical-native comps are thin).

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
    {
      "name": string,
      "type": "company" | "product" | "analog",
      "category": "A" | "B" | "C" | "D",
      "revenue_stage": string,
      "vertical_fit_evidence": string,
      "rationale": string,
      "source_url": string
    }
  ],
  "insufficient_vertical_comps": boolean,
  "insufficient_reason": string,
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
  try {
    const authCtx = await requireAuth();
    assertPreviewTabVisible(authCtx, "positioning");
  } catch (err) {
    return authErrorResponse(err);
  }

  const useOpenRouter = isOpenRouterConfigured();
  if (!useOpenRouter && !isSelfHostedLlmConfigured()) {
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set OPENROUTER_API_KEY or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_MODEL.",
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

  const { gateInference } = await import("@/lib/security/llm-policy");
  const actualProvider = useOpenRouter ? "openrouter" as const : "self_hosted" as const;
  const model = getSelfHostedLlmModel();
  const [evDecision, kbDecision] = await Promise.all([
    gateInference({
      provider: actualProvider,
      model,
      tier: "internal_only",
      content: evidence,
    }),
    gateInference({
      provider: actualProvider,
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

  const userPrompt = `TARGET COMPANY: ${targetName}
INDUSTRY VERTICAL (hard filter): ${industry || "UNSPECIFIED — infer from evidence below"}

INTERNAL EVIDENCE (sanitized — contains intake answers, findings, red flags, scores, exec summary excerpts):
"""
${safeEvidence}
"""

${safeOperatorKb ? `OPERATOR KNOWLEDGE BASE (sanitized):\n"""\n${safeOperatorKb}\n"""\n\n` : ""}TASK:
1) Infer the buyer persona and named competitors from the evidence above. Trust evidence over any intake framing that contradicts it.
2) Select 3–7 peers that pass EVERY inclusion rule and NO exclusion rule. Industry vertical + buyer are HARD filters. Architecture is a soft signal only.
3) Seed from any named competitors in the evidence and expand from each one's own named competitors. Do not rank by technical similarity to "${targetName}".
4) Run the self-check. If fewer than three peers pass all checks, return what you have and set "insufficient_vertical_comps": true with a short reason — do NOT pad with horizontal AI/ML infrastructure or generic "AI platform" companies.
5) Produce the contextual benchmarking JSON exactly per the schema. Return ONLY the JSON object — no commentary.`;

  try {
    let text: string;

    if (useOpenRouter) {
      const resp = await openRouterChat({
        model: getOpenRouterModel("positioning"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        maxTokens: 2500,
        jsonMode: true,
      });
      text = resp.content;
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
