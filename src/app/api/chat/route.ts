import { NextResponse } from "next/server";
import { llmChat } from "@/lib/llm/client";
import {
  getSelfHostedLlmModelForTask,
  isOpenRouterConfigured,
  isSelfHostedLlmConfigured,
} from "@/lib/env";
import {
  getOpenRouterModel,
  openRouterChat,
} from "@/lib/llm/openrouter";
import { getServiceClient } from "@/lib/supabase/service";
import { getPreviewSnapshot } from "@/lib/preview/data";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import {
  getUserPlanContext,
  checkAiQueryLimit,
  recordUsage,
} from "@/lib/plans-server";

export const runtime = "nodejs";
export const maxDuration = 300;

type ChatTurn = { role: "user" | "assistant"; text: string };

interface Body {
  question: string;
  context?: string;
  knowledge_base?: string;
  history?: ChatTurn[];
  session_id?: string;
  client_id?: string;
}

const SYSTEM_INSTRUCTION = `You are Kaptrix, an AI product-diligence analyst embedded in a dashboard. You answer natural-language questions about a specific AI company using the evidence context supplied with the question.

GROUNDING
- Ground every factual claim in the evidence. If the evidence does not clearly support a claim, say so explicitly — do not invent numbers, vendors, clients, or regulations.
- When you reference a specific fact, quote or name the source inline (e.g. "per [intake]", "[red flag · tooling_exposure]", "per the executive report summary").
- Never reveal chain-of-thought or internal reasoning.

STYLE & FORMAT
- Write in clean GitHub-flavored markdown so the UI can render it beautifully.
- Lead with a one-sentence direct answer.
- Then, when it helps, expand with short paragraphs, tight bullet lists, or a small table. Prefer bullets for enumerations, tables only when comparing ≥3 items across ≥2 attributes.
- Use **bold** for key terms and risks. Use inline \`code\` for product/model names, APIs, or exact identifiers. Do NOT use code fences unless quoting multi-line code.
- Keep answers scannable: short lines, meaningful whitespace, no filler.
- Aim for ~120–220 words for most answers; go shorter when the question is simple.

SCOPE
- Handle any question type: open-ended, comparative, follow-up, what-if, clarification, summary, deep-dive.
- For out-of-scope questions (weather, unrelated trivia, personal advice), politely decline in one sentence and offer an on-topic alternative.`;

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
      parts.push(`[red flag · ${f.dimension}] ${f.flag} — ${f.evidence}`);
    });
    a.open_questions.forEach((q) => parts.push(`[open question] ${q}`));
  });
  parts.push(
    `[executive report summary] ${snapshot.executiveReport.executive_summary}`,
  );
  snapshot.executiveReport.critical_findings.forEach((f) => {
    parts.push(
      `[finding · ${f.severity}] ${f.title}. ${f.what_we_found}. ${f.why_it_matters}`,
    );
  });
  snapshot.executiveReport.recommended_conditions.forEach((c) => {
    parts.push(`[condition] ${c.condition}. ${c.rationale}`);
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
  // Keep context compact for the 3B chat model — large prompts cause
  // enormous CPU prompt-processing time with diminishing returns.
  return parts.join("\n").slice(0, 16_000);
}

async function persistTurn(args: {
  session_id: string;
  client_id: string | null;
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const { error } = await supabase.from("chat_messages").insert({
    session_id: args.session_id,
    client_id: args.client_id,
    role: args.role,
    content: args.content,
    citations: args.citations ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) console.warn("[chat] persist failed", error.message);
}

/**
 * Generate follow-up suggestions without an LLM call.
 * Keyword-matched prompts relevant to AI diligence topics.
 */
const SUGGESTION_POOL: Record<string, string[]> = {
  risk: ["What mitigations exist?", "How severe is this risk?", "Any precedent for this?"],
  vendor: ["What is the switching cost?", "Are there alternatives?", "Is there vendor lock-in?"],
  score: ["What drove this score?", "How could it improve?", "Which dimension is weakest?"],
  data: ["Is customer data isolated?", "Any PII exposure?", "What about data provenance?"],
  model: ["Which models are used?", "Is there model concentration?", "Any fine-tuning?"],
  security: ["Is there SOC2?", "Any past incidents?", "Audit trail coverage?"],
  default: ["Summarize the key risks", "What are the strengths?", "What needs more evidence?"],
};

function generateSuggestions(question: string): string[] {
  const q = question.toLowerCase();
  for (const [keyword, suggestions] of Object.entries(SUGGESTION_POOL)) {
    if (keyword !== "default" && q.includes(keyword)) return suggestions;
  }
  return SUGGESTION_POOL.default;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "Missing question" }, { status: 400 });
  }

  // Tier enforcement (signed-in users only — anonymous demo chat is ungated).
  let authedUserId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      authedUserId = data.user.id;
      const plan = await getUserPlanContext(data.user.id);
      if (plan) {
        const check = checkAiQueryLimit(plan);
        if (!check.allowed) {
          return NextResponse.json(
            {
              error: check.reason,
              code: "tier_limit_reached",
              limit: check.limit,
              current: check.current,
              tier: check.tier,
            },
            { status: 402 },
          );
        }
      }
    }
  } catch {
    // Ignore — fall through to anonymous path.
  }

  const sessionId = (body.session_id ?? "").trim() || `anon-${Date.now()}`;
  const clientId = (body.client_id ?? "").trim() || null;

  // Build context: prefer server-side Supabase snapshot when a client_id
  // is provided; fall back to caller-supplied evidence string for
  // backwards compatibility with older chatbot clients.
  let context = (body.context ?? "").slice(0, 16_000);
  if (clientId) {
    try {
      const snapshot = await getPreviewSnapshot(clientId);
      context = buildContextFromSnapshot(snapshot);
    } catch {
      // keep caller-provided context as fallback
    }
  }

  // Always append the client-submitted knowledge base (intake, coverage,
  // insights, pre-analysis) so operator-submitted context is available
  // to the model regardless of whether we built context from Supabase
  // or the caller string.
  const kbText = (body.knowledge_base ?? "").slice(0, 6_000);
  if (kbText) {
    context = `${context}\n\n--- OPERATOR-SUBMITTED KNOWLEDGE BASE ---\n${kbText}`.slice(
      0,
      20_000,
    );
  }

  const useOpenRouter = isOpenRouterConfigured();
  if (!useOpenRouter && !isSelfHostedLlmConfigured()) {
    await persistTurn({
      session_id: sessionId,
      client_id: clientId,
      role: "user",
      content: question,
    });
    return NextResponse.json(
      {
        error:
          "No LLM provider configured. Set OPENROUTER_API_KEY (preferred for chat) or SELF_HOSTED_LLM_BASE_URL + SELF_HOSTED_LLM_MODEL in .env.local or Vercel.",
      },
      { status: 503 },
    );
  }

  const history = (body.history ?? [])
    .slice(-8)
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
    .join("\n");

  const prompt = `${SYSTEM_INSTRUCTION}

EVIDENCE CONTEXT (use only this to answer):
"""
${context}
"""

${history ? `RECENT CONVERSATION:\n${history}\n\n` : ""}USER QUESTION:
${question}

Answer:`;

  await persistTurn({
    session_id: sessionId,
    client_id: clientId,
    role: "user",
    content: question,
  });

  try {
    let answer: string;
    let usedModel: string;

    if (useOpenRouter) {
      const chatModel = getOpenRouterModel("chat");
      const completion = await openRouterChat({
        model: chatModel,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: `EVIDENCE CONTEXT:\n"""\n${context}\n"""\n\n${history ? `RECENT CONVERSATION:\n${history}\n\n` : ""}USER QUESTION:\n${question}` },
        ],
        temperature: 0.4,
        maxTokens: 800,
      });
      answer = (completion.content ?? "").trim();
      usedModel = chatModel;
    } else {
      // Fallback: self-hosted Ollama (slow on CPU, ~12 tok/s best case).
      const chatModel = getSelfHostedLlmModelForTask("chat");
      const answerResp = await llmChat({
        model: chatModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        maxTokens: 300,
        timeoutMs: 90_000,
      });
      answer = (answerResp.content ?? "").trim();
      usedModel = chatModel;
    }

    const suggestions = generateSuggestions(question);

    await persistTurn({
      session_id: sessionId,
      client_id: clientId,
      role: "assistant",
      content: answer,
      metadata: {
        model: usedModel,
        provider: useOpenRouter ? "openrouter" : "self_hosted",
      },
    });

    if (authedUserId) {
      recordUsage(authedUserId, "ai_queries").catch(() => {});
    }

    return NextResponse.json({ answer, suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await persistTurn({
      session_id: sessionId,
      client_id: clientId,
      role: "assistant",
      content: `[error] ${message}`,
      metadata: { error: true },
    });
    return NextResponse.json(
      { error: `LLM request failed: ${message}` },
      { status: 502 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ messages: [] });
  }
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ messages: [] });

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, citations, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return NextResponse.json({ messages: [], error: error.message });
  }
  return NextResponse.json({ messages: data ?? [] });
}
