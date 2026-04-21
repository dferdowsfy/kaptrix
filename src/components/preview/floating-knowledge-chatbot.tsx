"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  demoAnalyses,
  demoDocuments,
  demoExecutiveReport,
  demoKnowledgeInsights,
  demoScores,
} from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";
import {
  appendChatTurnToKnowledgeBase,
  formatKnowledgeBaseEvidence,
  readClientKb,
  subscribeKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import {
  formatUploadedDocsEvidence,
  readUploadedDocs,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";
import { useChatPanel } from "@/components/preview/chat-panel-context";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

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

export function KnowledgeChatPanel() {
  const { open: isOpen, setOpen } = useChatPanel();
  const [query, setQuery] = useState("");
  const { client, selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const idCounter = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(STARTER_PROMPTS);
  const sessionId = useMemo(getSessionId, []);

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );

  const uploadedDocs = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );

  useEffect(() => {
    setMessages([
      {
        id: "m0",
        role: "assistant",
        text: `I can answer natural-language questions about ${client.target}. Ask anything: risks, architecture, vendor exposure, regulatory posture, scoring rationale, comparisons to benchmarks, or what to validate before close. I'm grounded in the diligence evidence stored for this engagement.`,
      },
    ]);
  }, [client.target, selectedId]);

  // Reset contextual suggestions to defaults whenever client changes
  useEffect(() => {
    setSuggestions(STARTER_PROMPTS);
  }, [selectedId]);

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

    const fromKb: KnowledgeChunk[] = formatKnowledgeBaseEvidence(kb).map(
      (line, i) => {
        const match = line.match(/^\[(.+?)\]\s*(.*)$/);
        return {
          id: `kb-${i}`,
          source: match ? match[1] : "knowledge base",
          text: match ? match[2] : line,
        };
      },
    );

    // Operator-uploaded documents that were parsed through the real
    // parser stack (including vision for images). Surface each as a
    // citable evidence chunk so the chat assistant can quote them.
    const fromUploaded: KnowledgeChunk[] = uploadedDocs
      .filter((d) => d.parse_status === "parsed" && d.parsed_text)
      .map((d) => ({
        id: `upload-${d.id}`,
        source: `uploaded · ${d.filename}`,
        text: (d.parsed_text ?? "").slice(0, 4_000),
      }));

    return [
      ...fromKb,
      ...fromUploaded,
      ...fromInsights,
      ...fromAnalysis,
      ...fromReport,
      ...fromScores,
      ...fromDocs,
    ];
  }, [snapshot, kb, uploadedDocs]);

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
    const knowledgeBaseText = [
      ...formatKnowledgeBaseEvidence(kb),
      ...formatUploadedDocsEvidence(selectedId),
    ].join("\n");

    let answerText = "";
    let citations: string[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: contextText,
          knowledge_base: knowledgeBaseText,
          history,
          session_id: sessionId,
          client_id: selectedId,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          answer?: string;
          suggestions?: string[];
        };
        answerText = (data.answer ?? "").trim();
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.slice(0, 4));
        }
      } else {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        const local = answerFromCorpus(question, corpus);
        answerText =
          (data.error
            ? `AI unavailable (${data.error}). Showing local evidence match:\n\n`
            : "AI unavailable. Showing local evidence match:\n\n") +
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

    if (selectedId && answerText.trim()) {
      appendChatTurnToKnowledgeBase({
        clientId: selectedId,
        question,
        answer: answerText,
        citations,
      });
    }

    setPending(false);
  };

  const cleanText = (text: string): string =>
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^#+\s*/gm, "")
      .replace(/`([^`]+)`/g, "$1")
      .trim();

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(cleanText(text));
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <>
      {/* Header */}
      <div className="border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-base font-bold text-white shadow-lg">
              K
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-white">
                Kaptrix AI
              </p>
              <p className="flex items-center gap-1.5 truncate text-xs text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Grounded in {client.target}
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="ml-2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-white"
            aria-label="Close chatbot"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-5 overflow-y-auto bg-slate-900 px-5 py-5 [scrollbar-color:theme(colors.slate.700)_transparent] [scrollbar-width:thin]"
          >
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isThinking = !isUser && m.text === "Thinking…";
              return (
                <div
                  key={m.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow">
                      K
                    </div>
                  )}
                  <div className={`flex max-w-[82%] flex-col ${isUser ? "items-end" : "items-start"}`}>
                    <div
                      className={`group relative rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white"
                          : "border border-slate-700/60 bg-slate-800 text-slate-100"
                      }`}
                    >
                      {isThinking ? (
                        <span className="flex items-center gap-1 py-0.5">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                        </span>
                      ) : (
                        cleanText(m.text)
                          .split("\n")
                          .map((line, i, arr) => (
                            <span key={i}>
                              {line}
                              {i < arr.length - 1 && <br />}
                            </span>
                          ))
                      )}
                      {!isUser && !isThinking && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(m.text, m.id)}
                          className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-slate-300 opacity-0 shadow transition hover:bg-slate-700 hover:text-white group-hover:flex group-hover:opacity-100"
                          aria-label="Copy message"
                        >
                          {copiedId === m.id ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                          )}
                        </button>
                      )}
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <p className="mt-2 px-1 text-xs text-slate-500">
                        Sources: {m.citations.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="border-t border-slate-700/60 bg-slate-900/80 p-4 backdrop-blur">
            {suggestions.length > 0 && (
              <div className="-mx-4 mb-3 overflow-hidden">
                <div className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={pending}
                      onClick={() => ask(s)}
                      className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-indigo-400 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!pending) ask(query);
              }}
              className="flex items-end gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  pending
                    ? "Thinking…"
                    : "Message Kaptrix AI…"
                }
                disabled={pending}
                className="flex-1 bg-transparent px-1 py-1 text-base text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={pending || !query.trim()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow transition hover:from-indigo-400 hover:to-violet-500 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50"
                aria-label="Send message"
              >
                {pending ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-slate-500">
              Responses grounded in diligence evidence.
            </p>
          </div>
    </>
  );
}

/** @deprecated Use KnowledgeChatPanel instead */
export const FloatingKnowledgeChatbot = KnowledgeChatPanel;

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
