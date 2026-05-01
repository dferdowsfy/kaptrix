// POST /api/preview/extract-insights
//
// Accepts parsed text from an uploaded document and runs an LLM pass
// to extract structured KnowledgeInsight objects. The caller stores
// the results in localStorage and merges them into the Insights page.
//
// Body: { filename: string; category: string; text: string }
// Response: { insights: KnowledgeInsight[] }

import { NextRequest, NextResponse } from "next/server";
import {
  isSelfHostedLlmConfigured,
  isOpenRouterConfigured,
  getSelfHostedLlmModelForTask,
} from "@/lib/env";
import { llmChat } from "@/lib/llm/client";
import { openRouterChat, getOpenRouterModel } from "@/lib/llm/openrouter";
import { requireAuth, assertEngagementAccess, authErrorResponse } from "@/lib/security/authz";
import { getServiceClient } from "@/lib/supabase/service";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

export const runtime = "nodejs";
export const maxDuration = 90;

const CATEGORIES = [
  "commercial",
  "technical",
  "regulatory",
  "financial",
  "operational",
] as const;

const SYSTEM_PROMPT = `You are an AI investment-diligence analyst. You receive the extracted text from a diligence document and must surface the most important, verifiable insights for an investment committee reviewing an AI-systems company.

For each insight you find:
- Quote the most relevant excerpt verbatim (≤80 words).
- Write a concise one-sentence insight that adds analytical value beyond the raw quote.
- Classify into exactly one category: commercial, technical, regulatory, financial, operational.
- Assign confidence: high (explicit statement), medium (implied), low (inference/speculation).
- If the insight maps to a known intake field (e.g. "revenue_arr", "customer_count", "team_size"), set suggested_intake_field and suggested_intake_value.
- You may also receive intake context from Supabase. Use it only to prioritize what matters and to map suggested intake fields; it is NOT evidence.

Rules:
- Return 4–10 insights. More text does not mean more insights — be selective.
- Only include insights a professional analyst would actually act on.
- Do NOT invent facts. Every insight must trace to text in the document.
- Every excerpt and factual claim must come from the document text, not from intake context.
- Each insight id must be unique — use pattern: "ext-<slug>-<n>" where slug is the filename slug.

Return ONLY valid JSON, no prose:
{
  "insights": [
    {
      "id": "ext-<slug>-1",
      "source_document": "<filename>",
      "excerpt": "<verbatim quote ≤80 words>",
      "insight": "<one analytical sentence>",
      "category": "<commercial|technical|regulatory|financial|operational>",
      "confidence": "<high|medium|low>",
      "suggested_intake_field": "<field key or omit>",
      "suggested_intake_value": "<value or omit>"
    }
  ]
}`;

interface ExtractBody {
  client_id?: string;
  doc_id?: string;
  filename?: string;
  category?: string;
  text?: string;
  /** Serialised KB evidence from intake/pre_analysis steps — context only. */
  kb_context?: string;
  /** Already-extracted insights so the LLM can cross-reference rather than duplicate. */
  existing_insight_summaries?: { id: string; category: string; insight: string }[];
}

type IntakeAnswers = Record<string, string | number | string[]>;

function makeSlug(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 24);
}

async function callLlm(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  if (isSelfHostedLlmConfigured()) {
    const result = await llmChat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      maxTokens: 1200,
      model: getSelfHostedLlmModelForTask("report"),
      jsonMode: true,
      timeoutMs: 60_000,
    });
    return result.content;
  }
  if (isOpenRouterConfigured()) {
    const result = await openRouterChat({
      model: getOpenRouterModel("extract"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      maxTokens: 1200,
      jsonMode: true,
      timeoutMs: 60_000,
    });
    return result.content;
  }
  throw new Error(
    "No LLM provider configured. Set SELF_HOSTED_LLM_BASE_URL or OPENROUTER_API_KEY.",
  );
}

async function resolveDocumentInput(body: ExtractBody): Promise<{
  filename: string;
  category?: string;
  text: string;
}> {
  const fallbackText = (body.text ?? "").trim();

  if (body.client_id && body.doc_id) {
    const supabase = getServiceClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("preview_uploaded_docs")
        .select("filename, category, parsed_text")
        .eq("client_id", body.client_id)
        .eq("id", body.doc_id)
        .maybeSingle();

      if (!error && data?.parsed_text?.trim()) {
        return {
          filename: body.filename ?? data.filename,
          category: body.category ?? data.category,
          text: data.parsed_text.trim(),
        };
      }
    }
  }

  if (body.filename && fallbackText) {
    return {
      filename: body.filename,
      category: body.category,
      text: fallbackText,
    };
  }

  throw new Error(
    "Missing required fields: either (client_id + doc_id) for a persisted artifact or (filename + text) for direct extraction.",
  );
}

function formatIntakeContext(answers: IntakeAnswers): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(answers).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const rendered = Array.isArray(value)
      ? value.map(String).filter(Boolean).join(", ")
      : value === null || value === undefined || value === ""
        ? ""
        : String(value);
    if (!rendered) continue;
    const label = key
      .replace(/__note$/i, " note")
      .replace(/__other$/i, " other")
      .replace(/_/g, " ");
    lines.push(`[intake] ${label}: ${rendered}`);
  }
  return lines.join("\n").slice(0, 3_500);
}

async function loadIntakeContext(args: {
  supabase: Awaited<ReturnType<typeof requireAuth>>["supabase"];
  userId: string;
  clientId?: string;
}): Promise<string> {
  if (!args.clientId) return "";

  const { data, error } = await args.supabase
    .from("user_workspace_state")
    .select("state")
    .eq("user_id", args.userId)
    .eq("engagement_id", args.clientId)
    .eq("kind", "intake_answers")
    .maybeSingle();

  if (error || !data?.state || typeof data.state !== "object") return "";
  return formatIntakeContext(data.state as IntakeAnswers);
}

export async function POST(request: NextRequest) {
  let authCtx: Awaited<ReturnType<typeof requireAuth>>;
  try {
    authCtx = await requireAuth();
  } catch (err) {
    return authErrorResponse(err);
  }

  let body: ExtractBody;
  try {
    body = (await request.json()) as ExtractBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.client_id) {
    try {
      await assertEngagementAccess(authCtx, body.client_id);
    } catch (err) {
      return authErrorResponse(err);
    }
  }

  let filename: string;
  let category: string | undefined;
  let text: string;
  try {
    ({ filename, category, text } = await resolveDocumentInput(body));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid extraction input" },
      { status: 400 },
    );
  }

  // Keep the extraction prompt compact enough to remain reliable on
  // slower models / providers while still carrying enough document body
  // for high-signal diligence insights.
  const cappedText = text.length > 7000 ? text.slice(0, 7000) + "\n[…truncated]" : text;
  const intakeContext = await loadIntakeContext({
    supabase: authCtx.supabase,
    userId: authCtx.userId,
    clientId: body.client_id,
  });

  const kbContext = (body.kb_context ?? "").trim();
  const existingSummaries = body.existing_insight_summaries ?? [];

  const slug = makeSlug(filename);

  const contextBlocks: string[] = [];
  if (intakeContext) {
    contextBlocks.push(
      `INTAKE & KB CONTEXT (context only — do NOT treat as document evidence):\n${intakeContext}`,
    );
  }
  if (kbContext) {
    contextBlocks.push(`KNOWLEDGE BASE CONTEXT:\n${kbContext}`);
  }
  if (existingSummaries.length > 0) {
    const summaryLines = existingSummaries
      .map((s) => `  [${s.category}] ${s.insight} (id: ${s.id})`)
      .join("\n");
    contextBlocks.push(
      `ALREADY-EXTRACTED INSIGHTS (avoid duplicating these; cross-reference where relevant):\n${summaryLines}`,
    );
  }

  const userMessage = `${contextBlocks.length > 0 ? contextBlocks.join("\n\n") + "\n\n" : ""}Document: "${filename}" (category: ${category ?? "unknown"})

--- BEGIN DOCUMENT TEXT ---
${cappedText}
--- END DOCUMENT TEXT ---

Extract the key diligence insights. Use the id prefix "ext-${slug}-".`;

  let rawContent: string;
  try {
    rawContent = await callLlm(SYSTEM_PROMPT, userMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Parse the JSON response; be forgiving about extra whitespace / fences.
  let parsed: { insights?: unknown } = {};
  try {
    const clean = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(clean) as { insights?: unknown };
  } catch {
    return NextResponse.json(
      { error: "LLM returned non-JSON output", raw: rawContent.slice(0, 500) },
      { status: 502 },
    );
  }

  const rawInsights = Array.isArray(parsed.insights) ? parsed.insights : [];

  // Validate and sanitize each insight to match the KnowledgeInsight shape.
  const insights: KnowledgeInsight[] = [];
  for (const item of rawInsights) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.insight !== "string") continue;
    if (!CATEGORIES.includes(r.category as (typeof CATEGORIES)[number])) continue;

    insights.push({
      id: String(r.id),
      source_document: String(r.source_document ?? filename),
      excerpt: String(r.excerpt ?? ""),
      insight: String(r.insight),
      category: r.category as KnowledgeInsight["category"],
      confidence: (["high", "medium", "low"].includes(String(r.confidence))
        ? r.confidence
        : "medium") as KnowledgeInsight["confidence"],
      ...(typeof r.suggested_intake_field === "string" && r.suggested_intake_field
        ? { suggested_intake_field: r.suggested_intake_field }
        : {}),
      ...(typeof r.suggested_intake_value === "string" && r.suggested_intake_value
        ? { suggested_intake_value: r.suggested_intake_value }
        : {}),
    });
  }

  return NextResponse.json({ insights });
}
