import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { getGroqClient } from "@/lib/anthropic/client";
import { isGroqConfigured } from "@/lib/env";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { PREVIEW_CLIENTS } from "@/lib/preview-clients";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  client_id: string;
  knowledge_base?: string;
}

// Use Groq's compound model — it has built-in web search and visit-website
// tools, so the LLM can pull live competitor / market data instead of
// inventing peers.
const COMPOUND_MODEL = "groq/compound";

const SYSTEM_PROMPT = `You are Kaptrix, an AI diligence analyst performing CONTEXTUAL BENCHMARKING.
You do NOT assess companies in isolation. You assess them RELATIVE to contextually relevant peers.

You have access to live web search and website-visit tools. USE THEM to:
- Identify real, currently-operating companies and products that are direct or analog peers of the target.
- Pull recent (last 12-18 months) public information: funding rounds, customer logos, product launches, model/vendor stack, regulatory posture, security certifications, incidents.
- Verify any claims you are uncertain about.

Procedure:
1. TARGET CONTEXT — classify target (organization or product), industry, AI use case, business model, customer segment, data sensitivity, deployment maturity, vendor stack, regulatory exposure, architecture pattern. Ground in evidence corpus AND fresh web research.
2. COMPARABLE SELECTION — pick 3-7 REAL, NAMED competitors / analog products you have verified via web search. Match on AI use case, business model, data sensitivity, deployment maturity, technical approach, regulatory constraints. Cite a source URL for each comparable. Never invent companies. Never use generic placeholders.
3. RELATIVE COMPARISON — for each dimension, classify target as "ahead" / "in_line" / "behind" peers, with concrete evidence (cite peer when relevant).
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
    {
      "name": string,
      "type": "company" | "product" | "analog",
      "rationale": string,
      "source_url": string
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
    `TARGET: ${snapshot.engagement.target_company_name} | client: ${snapshot.engagement.client_firm_name} | stage: ${snapshot.engagement.deal_stage} | tier: ${snapshot.engagement.tier}`,
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
    parts.push(`[finding · ${f.severity}] ${f.title}: ${f.what_we_found.slice(0, 180)}`),
  );
  snapshot.scores.slice(0, 12).forEach((s) =>
    parts.push(
      `[score · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)}`,
    ),
  );
  return parts.join("\n").slice(0, 6000);
}

function buildPeerKnowledgeBase(currentClientId: string): string {
  const peers = PREVIEW_CLIENTS.filter((c) => c.id !== currentClientId);
  return peers
    .map(
      (p) =>
        `INTERNAL ENGAGEMENT: ${p.target} | industry: ${p.industry} | summary: ${p.summary}`,
    )
    .join("\n");
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

interface ExecutedToolSearchResult {
  url?: string;
  title?: string;
}

interface ExecutedTool {
  type?: string;
  index?: number;
  search_results?: { results?: ExecutedToolSearchResult[] };
  arguments?: string;
  output?: string;
}

function extractWebSources(
  message: Groq.Chat.ChatCompletion.Choice["message"],
): { url: string; title?: string }[] {
  const tools = (message as unknown as { executed_tools?: ExecutedTool[] })
    .executed_tools;
  if (!Array.isArray(tools)) return [];
  const seen = new Set<string>();
  const sources: { url: string; title?: string }[] = [];
  for (const t of tools) {
    const results = t.search_results?.results;
    if (Array.isArray(results)) {
      for (const r of results) {
        if (r.url && !seen.has(r.url)) {
          seen.add(r.url);
          sources.push({ url: r.url, title: r.title });
        }
      }
    }
  }
  return sources.slice(0, 12);
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

  const peerKb = buildPeerKnowledgeBase(clientId).slice(0, 1500);
  const operatorKb = (body.knowledge_base ?? "").slice(0, 2000);

  const userPrompt = `TARGET COMPANY: ${targetName}${industry ? ` (${industry})` : ""}

INTERNAL EVIDENCE CORPUS (from diligence engagement):
"""
${evidence}
"""

INTERNAL KNOWLEDGE BASE (other engagements — use as context, not as primary peers):
"""
${peerKb}
"""

${operatorKb ? `OPERATOR-SUBMITTED KNOWLEDGE BASE:\n"""\n${operatorKb}\n"""\n\n` : ""}TASK:
Use web search to identify REAL competitors / analog products of "${targetName}". Verify each peer with at least one source URL. Then produce the contextual benchmarking JSON exactly per the schema. Begin web research now and return ONLY the JSON object — no commentary.`;

  try {
    const completion = await getGroqClient().chat.completions.create({
      model: COMPOUND_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 2500,
    });

    const message = completion.choices[0]?.message;
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

    const sources = message ? extractWebSources(message) : [];

    return NextResponse.json({ positioning: parsed, sources });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Groq request failed: ${message}` },
      { status: 502 },
    );
  }
}
