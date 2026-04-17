"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  demoAnalyses,
  demoDocuments,
  demoExecutiveReport,
  demoKnowledgeInsights,
  demoScores,
} from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
};

type KnowledgeChunk = {
  id: string;
  source: string;
  text: string;
};

const STARTER_PROMPTS = [
  "What are the biggest risks?",
  "Summarize vendor concentration",
  "What should we validate before closing?",
];

const SESSION_STORAGE_KEY = "kaptrix.chat.session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const fresh = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return `chat-${Date.now()}`;
  }
}

export function FloatingKnowledgeChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { client, selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const idCounter = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const sessionId = useMemo(getSessionId, []);

  useEffect(() => {
    setMessages([
      {
        id: "m0",
        role: "assistant",
        text: `I can answer natural-language questions about ${client.target}. Ask anything: risks, architecture, vendor exposure, regulatory posture, scoring rationale, comparisons to benchmarks, or what to validate before close. I'm grounded in the diligence evidence stored for this engagement.`,
      },
    ]);
  }, [client.target, selectedId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const corpus = useMemo<KnowledgeChunk[]>(() => {
    const insights = snapshot?.knowledgeInsights ?? demoKnowledgeInsights;
    const analyses = snapshot?.analyses ?? demoAnalyses;
    const report = snapshot?.executiveReport ?? demoExecutiveReport;
    const scores = snapshot?.scores ?? demoScores;
    const documents = snapshot?.documents ?? demoDocuments;

    const fromInsights = insights.map((k) => ({
      id: `insight-${k.id}`,
      source: k.source_document,
      text: `${k.insight} ${k.excerpt}`,
    }));
    const fromAnalysis = analyses.flatMap((a) => [
      ...a.extracted_claims.map((c, i) => ({
        id: `claim-${a.id}-${i}`,
        source: `${c.source_doc} ${c.source_location}`,
        text: c.claim,
      })),
      ...a.red_flags.map((f, i) => ({
        id: `flag-${a.id}-${i}`,
        source: `analysis ${a.id}`,
        text: `${f.flag} ${f.evidence}`,
      })),
      ...a.open_questions.map((q, i) => ({
        id: `open-${a.id}-${i}`,
        source: `analysis ${a.id}`,
        text: q,
      })),
    ]);

    const fromReport: KnowledgeChunk[] = [
      {
        id: "report-summary",
        source: "executive report",
        text: report.executive_summary,
      },
      {
        id: "report-context",
        source: "executive report",
        text: report.strategic_context,
      },
      ...report.critical_findings.map((f, i) => ({
        id: `report-finding-${i}`,
        source: "executive report · critical findings",
        text: `${f.title}. ${f.what_we_found}. ${f.why_it_matters}`,
      })),
      ...report.recommended_conditions.map((c, i) => ({
        id: `report-condition-${i}`,
        source: "executive report · conditions",
        text: `${c.condition}. ${c.rationale}`,
      })),
    ];

    const fromScores: KnowledgeChunk[] = scores.map((s) => ({
      id: `score-${s.id}`,
      source: `scorecard · ${s.dimension}`,
      text: `${s.dimension} ${s.sub_criterion} score ${s.score_0_to_5.toFixed(1)}. ${s.operator_rationale}`,
    }));

    const fromDocs: KnowledgeChunk[] = documents.map((d) => ({
      id: `doc-${d.id}`,
      source: d.filename,
      text: `${d.filename} category ${d.category} parse status ${d.parse_status} token count ${d.token_count ?? "unknown"}`,
    }));

    return [...fromInsights, ...fromAnalysis, ...fromReport, ...fromScores, ...fromDocs];
  }, [snapshot]);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question) return;

    const n = idCounter.current++;
    const userMessage: ChatMessage = {
      id: `u-${n}`,
      role: "user",
      text: question,
    };
    const thinkingId = `a-${n}`;
    const thinking: ChatMessage = {
      id: thinkingId,
      role: "assistant",
      text: "Thinking…",
    };
    setMessages((prev) => [...prev, userMessage, thinking]);
    setQuery("");
    setPending(true);

    const history = messages
      .filter((m) => m.id !== "m0")
      .map((m) => ({ role: m.role, text: m.text }));
    const contextText = corpus
      .map((c) => `[${c.source}] ${c.text}`)
      .join("\n");

    let answerText = "";
    let citations: string[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: contextText,
          history,
          session_id: sessionId,
          client_id: selectedId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { answer?: string };
        answerText = (data.answer ?? "").trim();
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const local = answerFromCorpus(question, corpus);
        answerText =
          (data.error
            ? `Gemini unavailable (${data.error}). Showing local evidence match:\n\n`
            : "Gemini unavailable. Showing local evidence match:\n\n") +
          local.answer;
        citations = local.citations;
      }
    } catch (err) {
      const local = answerFromCorpus(question, corpus);
      answerText = `Network error${err instanceof Error ? ` (${err.message})` : ""}. Local evidence match:\n\n${local.answer}`;
      citations = local.citations;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === thinkingId
          ? {
              ...m,
              text: answerText,
              citations: citations.length ? citations : undefined,
            }
          : m,
      ),
    );
    setPending(false);
  };

  return (
    <div className="print-hide fixed bottom-4 right-4 z-50 sm:bottom-5 sm:right-5">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:shadow-xl"
        >
          Ask Kaptrix AI
        </button>
      )}

      {isOpen && (
        <div
          className="
            fixed inset-x-3 bottom-3 top-16 z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl
            sm:static sm:inset-auto sm:h-auto sm:w-[380px]
          "
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Knowledge Assistant
              </p>
              <p className="truncate text-xs text-slate-500">
                Grounded in {client.target} diligence evidence
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close chatbot"
            >
              ✕
            </button>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-3 sm:max-h-[420px]"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "text-right" : "text-left"}
              >
                <div
                  className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
                {m.citations && m.citations.length > 0 && (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sources: {m.citations.join(" · ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 p-3">
            <div className="mb-2 flex flex-wrap gap-1">
              {STARTER_PROMPTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending}
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pending) ask(query);
              }}
              className="flex gap-2"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  pending
                    ? "Waiting for response…"
                    : "Ask anything about the client or evidence…"
                }
                disabled={pending}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-slate-900 focus:outline-none disabled:bg-slate-50 sm:text-sm"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "…" : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function answerFromCorpus(
  question: string,
  corpus: KnowledgeChunk[],
): { answer: string; citations: string[] } {
  const tokens = tokenize(question);

  const scored = corpus
    .map((chunk) => ({
      ...chunk,
      score: overlapScore(tokens, tokenize(chunk.text + " " + chunk.source)),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.score > 0).slice(0, 4);

  if (top.length === 0) {
    return {
      answer:
        "I could not find a direct grounded match in the current evidence set. Try asking about risks, vendor dependencies, tenant isolation, scorecard dimensions, or recommended conditions.",
      citations: ["knowledge corpus"],
    };
  }

  const synthesized = top
    .map((t) => t.text)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 620);

  return {
    answer: `Based on the currently gathered diligence evidence: ${synthesized}`,
    citations: top.map((t) => t.source),
  };
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function overlapScore(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.reduce((sum, token) => sum + (setB.has(token) ? 1 : 0), 0);
}
