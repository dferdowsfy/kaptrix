import { NextResponse } from "next/server";
import { getOpenRouterApiKey, isOpenRouterConfigured } from "@/lib/env";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { PREVIEW_CLIENTS } from "@/lib/preview-clients";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  client_id: string;
  knowledge_base?: string;
}

// OpenRouter web-search-enabled model. This route is the ONLY external
// path that leaves our infra; payload is sanitized before send.
const OPENROUTER_MODEL = "openai/gpt-4o-mini-search-preview";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `You are an AI diligence analyst performing CONTEXTUAL BENCHMARKING.
You do NOT assess companies in isolation — you assess them RELATIVE to contextually relevant peers.

You have a built-in web search tool. USE IT to:
- Identify real, currently-operating companies and products that are direct or analog peers of the target.
- Pull recent (last 12-18 months) public information: funding rounds, customer logos, product launches, model/vendor stack, regulatory posture, certifications, incidents.
- Verify any claim you are uncertain about.

Procedure:
1. TARGET CONTEXT — classify the target (organization or product), industry, AI use case, business model, customer segment, data sensitivity, deployment maturity, vendor stack, regulatory exposure, architecture pattern.
2. COMPARABLE SELECTION — pick 3-7 REAL, NAMED competitors / analog products you have verified via web search. Match on AI use case, business model, data sensitivity, deployment maturity, technical approach, regulatory constraints. Cite a source URL for each comparable. Never invent companies.
3. RELATIVE COMPARISON — for each dimension, classify target as "ahead" / "in_line" / "behind" peers, with concrete evidence.
4. POSITIONING SUMMARY — specific, non-generic relative position.
5. INVESTMENT INTERPRETATION — differentiation real? durability? risk concentration? validation priorities?
6. CONFIDENCE — low/medium/high based on data completeness and source quality.

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

interface OpenRouterAnnotation {
  type?: string;
  url_citation?: { url?: string; title?: string };
}

interface OpenRouterMessage {
  content?: string;
  annotations?: OpenRouterAnnotation[];
}

interface OpenRouterChoice {
  message?: OpenRouterMessage;
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
}

function extractWebSources(
  message: OpenRouterMessage | undefined,
): { url: string; title?: string }[] {
  const annotations = message?.annotations;
  if (!Array.isArray(annotations)) return [];
  const seen = new Set<string>();
  const sources: { url: string; title?: string }[] = [];
  for (const a of annotations) {
    const c = a.url_citation;
    if (c?.url && !seen.has(c.url)) {
      seen.add(c.url);
      sources.push({ url: c.url, title: c.title });
    }
  }
  return sources.slice(0, 12);
}

export async function POST(req: Request) {
  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY is not configured. Add it to .env.local and Vercel project settings.",
      },
      { status: 503 },
    );
  }

  // Rate-limit this endpoint — OpenRouter calls cost real money and
  // leave our infra. Keyed by user when authenticated, IP otherwise.
  const { checkRateLimit, callerKey } = await import(
    "@/lib/security/rate-limit"
  );
  const rl = checkRateLimit({
    key: callerKey(req.headers, null, "positioning"),
    limit: 10,
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

  // Gate every outbound piece through the LLM policy layer. This
  // redacts evidence AND writes an audit row (provider, model, tier,
  // content fingerprint). Policy still allows external here because
  // the positioning endpoint is explicitly tier "redacted_ok".
  const { gateInference } = await import("@/lib/security/llm-policy");
  const [evDecision, kbDecision] = await Promise.all([
    gateInference({
      provider: "openrouter",
      model: OPENROUTER_MODEL,
      tier: "redacted_ok",
      content: evidence,
    }),
    gateInference({
      provider: "openrouter",
      model: OPENROUTER_MODEL,
      tier: "redacted_ok",
      content: operatorKb,
    }),
  ]);
  if (!evDecision.allowed) {
    return NextResponse.json(
      { error: "External inference blocked for this engagement" },
      { status: 451 },
    );
  }
  const safeEvidence = evDecision.safeContent;
  const safeOperatorKb = kbDecision.safeContent;

  const userPrompt = `TARGET COMPANY: ${targetName}${industry ? ` (${industry})` : ""}

INTERNAL EVIDENCE (sanitized — non-sensitive):
"""
${safeEvidence}
"""

${safeOperatorKb ? `OPERATOR KNOWLEDGE BASE (sanitized):\n"""\n${safeOperatorKb}\n"""\n\n` : ""}TASK:
Use web search to identify REAL competitors / analog products of "${targetName}". Verify each peer with at least one source URL. Then produce the contextual benchmarking JSON exactly per the schema. Begin web research now and return ONLY the JSON object — no commentary.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOpenRouterApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://kaptrix.app",
        "X-Title": "Kaptrix Positioning",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        temperature: 0.2,
        max_tokens: 2500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    const json = (await res.json()) as OpenRouterResponse;

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `OpenRouter request failed (${res.status}): ${json.error?.message ?? "unknown error"}`,
        },
        { status: 502 },
      );
    }

    const message = json.choices?.[0]?.message;
    const text = (message?.content ?? "").trim();

    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text.slice(0, 2000) },
        { status: 502 },
      );
    }

    const sources = extractWebSources(message);

    return NextResponse.json({ positioning: parsed, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `OpenRouter request failed: ${message}` },
      { status: 502 },
    );
  }
}
