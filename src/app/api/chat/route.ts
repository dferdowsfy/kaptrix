import { NextResponse } from "next/server";
import { getGenAI, MODELS } from "@/lib/anthropic/client";
import { isGoogleConfigured } from "@/lib/env";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; text: string };

interface Body {
  question: string;
  context: string;
  history?: ChatTurn[];
}

const SYSTEM_INSTRUCTION = `You are Kaptrix, an AI product diligence analyst.
Answer questions about a specific AI company using ONLY the provided evidence context.
Rules:
- Ground every statement in the evidence. If the evidence does not support an answer, say so explicitly.
- Be concise but complete. Use short paragraphs or bullets when helpful.
- Cite specific documents, claims, red flags, scorecard dimensions, or report sections when relevant.
- Never fabricate metrics, vendor names, or regulations. Never expose chain-of-thought.
- Respond in plain text (no markdown headings, no code fences).`;

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
  const context = (body.context ?? "").slice(0, 60_000);

  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google API key is not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY in .env.local to enable the chatbot.",
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

  try {
    const model = getGenAI().getGenerativeModel({ model: MODELS.PRE_ANALYSIS });
    const result = await model.generateContent(prompt);
    const answer = result.response.text().trim();
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Gemini request failed: ${message}` },
      { status: 502 },
    );
  }
}
