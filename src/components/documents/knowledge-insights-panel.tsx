"use client";

import { useState } from "react";
import type { Document } from "@/lib/types";

export interface KnowledgeInsight {
  id: string;
  source_document: string;
  excerpt: string;
  insight: string;
  category:
    | "commercial"
    | "technical"
    | "regulatory"
    | "financial"
    | "operational";
  confidence: "high" | "medium" | "low";
  suggested_intake_field?: string;
  suggested_intake_value?: string;
}

interface Props {
  documents: Document[];
  insights: KnowledgeInsight[];
  onInsertToIntake?: (insight: KnowledgeInsight) => void;
}

const categoryStyles: Record<
  KnowledgeInsight["category"],
  { label: string; cls: string }
> = {
  commercial: { label: "Commercial", cls: "bg-indigo-100 text-indigo-800" },
  technical: { label: "Technical", cls: "bg-sky-100 text-sky-800" },
  regulatory: { label: "Regulatory", cls: "bg-amber-100 text-amber-800" },
  financial: { label: "Financial", cls: "bg-emerald-100 text-emerald-800" },
  operational: { label: "Operational", cls: "bg-purple-100 text-purple-800" },
};

export function KnowledgeInsightsPanel({
  documents,
  insights,
  onInsertToIntake,
}: Props) {
  const [filter, setFilter] = useState<
    "all" | KnowledgeInsight["category"]
  >("all");
  const [inserted, setInserted] = useState<Set<string>>(new Set());

  const filtered =
    filter === "all" ? insights : insights.filter((i) => i.category === filter);

  const handleInsert = (insight: KnowledgeInsight) => {
    onInsertToIntake?.(insight);
    setInserted((prev) => new Set(prev).add(insight.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Document Intelligence · RAG-backed
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            Insights from your data room
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-gray-500">
            Every uploaded document is chunked, embedded, and queried against
            Kaptrix diligence prompts. Promote any insight directly into the
            intake questionnaire to speed operator setup.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-900">
            {documents.length}
          </span>{" "}
          documents indexed ·{" "}
          <span className="font-semibold text-gray-900">{insights.length}</span>{" "}
          insights surfaced
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            "all",
            "commercial",
            "technical",
            "regulatory",
            "financial",
            "operational",
          ] as const
        ).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === cat
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
            }`}
          >
            {cat === "all" ? "All insights" : categoryStyles[cat].label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((insight) => {
          const style = categoryStyles[insight.category];
          const isInserted = inserted.has(insight.id);
          return (
            <div
              key={insight.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.cls}`}
                >
                  {style.label}
                </span>
                <span className="text-[11px] uppercase tracking-wide text-gray-400">
                  {insight.confidence} confidence
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">
                {insight.insight}
              </p>
              <blockquote className="mt-2 rounded-lg bg-gray-50 p-3 text-xs italic text-gray-600">
                “{insight.excerpt}”
                <footer className="mt-1 not-italic text-[11px] text-gray-500">
                  — {insight.source_document}
                </footer>
              </blockquote>
              {insight.suggested_intake_field && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-gray-300 px-3 py-2">
                  <div className="text-[11px] text-gray-600">
                    Promote to intake:{" "}
                    <span className="font-semibold text-gray-800">
                      {insight.suggested_intake_field}
                    </span>
                  </div>
                  <button
                    onClick={() => handleInsert(insight)}
                    disabled={isInserted}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      isInserted
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                    }`}
                  >
                    {isInserted ? "Inserted ✓" : "Insert into intake"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
