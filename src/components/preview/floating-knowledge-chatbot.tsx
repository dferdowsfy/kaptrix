"use client";

import { useMemo, useState } from "react";
import {
  demoAnalyses,
  demoDocuments,
  demoEngagement,
  demoExecutiveReport,
  demoKnowledgeInsights,
  demoScores,
} from "@/lib/demo-data";

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

const STARTERS = [
  "What are the biggest risks for this client?",
  "Summarize vendor concentration exposure",
  "What should we validate before closing?",
  "How strong is the product credibility signal?",
];

export function FloatingKnowledgeChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      text: `I can answer questions about ${demoEngagement.target_company_name} using all gathered preview evidence: documents, pre-analysis outputs, scorecard inputs, insights, and the executive report.`,
    },
  ]);

  const corpus = useMemo<KnowledgeChunk[]>(() => {
    const fromInsights = demoKnowledgeInsights.map((k) => ({
      id: `insight-${k.id}`,
      source: k.source_document,
      text: `${k.insight} ${k.excerpt}`,
    }));
    const fromAnalysis = demoAnalyses.flatMap((a) => [
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
        text: demoExecutiveReport.executive_summary,
      },
      {
        id: "report-context",
        source: "executive report",
        text: demoExecutiveReport.strategic_context,
      },
      ...demoExecutiveReport.critical_findings.map((f, i) => ({
        id: `report-finding-${i}`,
        source: "executive report · critical findings",
        text: `${f.title}. ${f.what_we_found}. ${f.why_it_matters}`,
      })),
      ...demoExecutiveReport.recommended_conditions.map((c, i) => ({
        id: `report-condition-${i}`,
        source: "executive report · conditions",
        text: `${c.condition}. ${c.rationale}`,
      })),
    ];

    const fromScores: KnowledgeChunk[] = demoScores.map((s) => ({
      id: `score-${s.id}`,
      source: `scorecard · ${s.dimension}`,
      text: `${s.dimension} ${s.sub_criterion} score ${s.score_0_to_5}. ${s.operator_rationale}`,
    }));

    const fromDocs: KnowledgeChunk[] = demoDocuments.map((d) => ({
      id: `doc-${d.id}`,
      source: d.filename,
      text: `${d.filename} category ${d.category} parse status ${d.parse_status} token count ${d.token_count ?? "unknown"}`,
    }));

    return [...fromInsights, ...fromAnalysis, ...fromReport, ...fromScores, ...fromDocs];
  }, []);

  const ask = (raw: string) => {
    const question = raw.trim();
    if (!question) return;

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: question,
    };

    const answer = answerFromCorpus(question, corpus);

    const assistantMessage: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: answer.answer,
      citations: answer.citations,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setQuery("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg transition hover:shadow-xl"
        >
          Ask Kaptrix AI
        </button>
      )}

      {isOpen && (
        <div className="w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Knowledge Assistant
              </p>
              <p className="text-xs text-slate-500">Grounded in uploaded diligence evidence</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
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
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:border-slate-400"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ask(query);
                }}
                placeholder="Ask about the client, risks, or evidence…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
              />
              <button
                onClick={() => ask(query)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Send
              </button>
            </div>
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
