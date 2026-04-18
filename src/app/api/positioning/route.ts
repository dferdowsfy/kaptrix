import { NextResponse } from "next/server";
import { getGroqClient, MODELS } from "@/lib/anthropic/client";
import { isGroqConfigured } from "@/lib/env";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { PREVIEW_CLIENTS } from "@/lib/preview-clients";

export const runtime = "nodejs";

interface Body {
  client_id: string;
  knowledge_base?: string;
}

const SYSTEM_PROMPT = `You are Kaptrix, an AI diligence analyst performing CONTEXTUAL BENCHMARKING.
You do NOT assess companies in isolation. You assess them RELATIVE to contextually relevant peers.

Follow this exact procedure:
1. TARGET CONTEXT — classify the target (organization or product), industry, AI use case, business model, customer segment, data sensitivity, deployment maturity, vendor stack, regulatory exposure, architecture pattern.
2. COMPARABLE SELECTION — pick 3 to 7 peers from the provided knowledge base of other engagements. Match on AI use case, business model, data sensitivity, deployment maturity, technical approach (wrapper vs deeply integrated), and regulatory constraints. If no exact match exists, choose closest analogs and explain the gap. Never pick generic companies.
3. RELATIVE COMPARISON — for each dimension, classify the target as "ahead", "in_line", or "behind" peers, with evidence-based reasoning.
4. POSITIONING SUMMARY — synthesize a specific, non-generic relative position (e.g. "Strong product, weak organizational maturity").
5. INVESTMENT INTERPRETATION — translate positioning into decision-relevant implications: real differentiation? durable advantage? where is risk concentrated? what to validate?
6. CONFIDENCE — rate data completeness as low / medium / high.

Return ONLY valid JSON matching this exact schema (no prose, no markdown):
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
      "rationale": string
    }
  ],
  "comparison": [
    {
      "dimension": string,
      "position": "ahead" | "in_line" | "behind",
      "evidence": string
    }
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
  parts.push(
    `TARGET: ${snapshot.engagement.target_company_name} | client: ${snapshot.engagement.client_firm_name} | stage: ${snapshot.engagement.deal_stage} | tier: ${snapshot.engagement.tier} | status: ${snapshot.engagement.status}`,
  );
  snapshot.knowledgeInsights.slice(0, 30).forEach((k) => {
    parts.push(`[insight · ${k.source_document}] ${k.insight}`);
  });
  snapshot.analyses.forEach((a) => {
    a.extracted_claims.slice(0, 8).forEach((c) =>
      parts.push(`[claim · ${c.source_doc}] ${c.claim}`),
    );
    a.red_flags.forEach((f) =>
      parts.push(`[red flag · ${f.dimension}] ${f.flag} — ${f.evidence}`),
    );
  });
  parts.push(`[summary] ${snapshot.executiveReport.executive_summary}`);
  parts.push(`[strategic context] ${snapshot.executiveReport.strategic_context}`);
  snapshot.executiveReport.critical_findings.forEach((f) =>
    parts.push(
      `[finding · ${f.severity}] ${f.title}. ${f.what_we_found}. ${f.why_it_matters}`,
    ),
  );
  snapshot.scores.forEach((s) =>
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)} — ${s.operator_rationale}`,
    ),
  );
  return parts.join("\n").slice(0, 50_000);
}

function buildPeerKnowledgeBase(currentClientId: string): string {
  const peers = PREVIEW_CLIENTS.filter((c) => c.id !== currentClientId);
  return peers
    .map(
      (p) =>
        `PEER: ${p.target} | client: ${p.client} | industry: ${p.industry} | stage: ${p.deal_stage} | tier: ${p.tier} | composite: ${p.composite_score ?? "n/a"} | recommendation: ${p.recommendation} | summary: ${p.summary}`,
    )
    .join("\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

export async function POST(req: Request) {
  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "Groq API key not configured." },
      { status: 503 },
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
  try {
    const snapshot = await getPreviewSnapshot(clientId);
    evidence = buildEvidence(snapshot);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Could not load engagement snapshot: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }

  const peerKb = buildPeerKnowledgeBase(clientId);
  const operatorKb = (body.knowledge_base ?? "").slice(0, 15_000);

  const userPrompt = `EVIDENCE CORPUS FOR TARGET:
"""
${evidence}
"""

KNOWLEDGE BASE (PEER ENGAGEMENTS — use these as your candidate comparables):
"""
${peerKb}
"""

${operatorKb ? `OPERATOR-SUBMITTED KNOWLEDGE BASE:\n"""\n${operatorKb}\n"""\n\n` : ""}Produce the contextual benchmarking analysis as JSON now.`;

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: MODELS.PRE_ANALYSIS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2500,
    });

    const text = (completion.choices[0]?.message?.content ?? "").trim();
    let parsed: unknown;
    try {
      parsed = extractJson(text);
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: text },
        { status: 502 },
      );
    }

    return NextResponse.json({ positioning: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Groq request failed: ${message}` },
      { status: 502 },
    );
  }
}
