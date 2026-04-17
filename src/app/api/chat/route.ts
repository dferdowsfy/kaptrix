import { NextResponse } from "next/server";
import { getGenAI, MODELS } from "@/lib/anthropic/client";
import { isGoogleConfigured } from "@/lib/env";
import { getServiceClient } from "@/lib/supabase/service";
import { getPreviewSnapshot } from "@/lib/preview/data";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; text: string };

interface Body {
  question: string;
  context?: string;
  history?: ChatTurn[];
  session_id?: string;
  client_id?: string;
}

const SYSTEM_INSTRUCTION = `You are Kaptrix, an AI product diligence analyst.
Answer natural-language questions about a specific AI company using the provided evidence context.
Rules:
- Handle any style of question: open-ended, comparative, follow-up, what-if, clarification, summary, or deep-dive.
- Ground every factual statement in the evidence. If the evidence does not clearly support a claim, say so explicitly instead of inventing details.
- Be concise and structured. Prefer short paragraphs or simple bullet lists when helpful.
- Cite specific documents, claims, red flags, scorecard dimensions, or report sections when relevant.
- Never fabricate metrics, vendor names, clients, or regulations. Never expose chain-of-thought.
- Respond in plain text. No markdown headings or code fences.`;

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
  return parts.join("\n").slice(0, 60_000);
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

  const sessionId = (body.session_id ?? "").trim() || `anon-${Date.now()}`;
  const clientId = (body.client_id ?? "").trim() || null;

  // Build context: prefer server-side Supabase snapshot when a client_id
  // is provided; fall back to caller-supplied evidence string for
  // backwards compatibility with older chatbot clients.
  let context = (body.context ?? "").slice(0, 60_000);
  if (clientId) {
    try {
      const snapshot = await getPreviewSnapshot(clientId);
      context = buildContextFromSnapshot(snapshot);
    } catch {
      // keep caller-provided context as fallback
    }
  }

  if (!isGoogleConfigured()) {
    await persistTurn({
      session_id: sessionId,
      client_id: clientId,
      role: "user",
      content: question,
    });
    return NextResponse.json(
      {
        error:
          "Google API key is not configured. Set GOOGLE_API_KEY in .env.local or Vercel Project Settings to enable the chatbot.",
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
    const model = getGenAI().getGenerativeModel({ model: MODELS.PRE_ANALYSIS });
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();

    await persistTurn({
      session_id: sessionId,
      client_id: clientId,
      role: "assistant",
      content: answer,
      metadata: { model: MODELS.PRE_ANALYSIS },
    });

    return NextResponse.json({ answer });
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
      { error: `Gemini request failed: ${message}` },
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
