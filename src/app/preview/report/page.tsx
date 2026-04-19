"use client";

import { useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { ExecutiveReport } from "@/components/reports/executive-report";
import { AiReportCard } from "@/components/reports/ai-report-card";
import { ADVANCED_REPORTS } from "@/lib/reports/advanced-reports";
import { demoExecutiveReport } from "@/lib/demo-data";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";
import {
  formatKnowledgeBaseEvidence,
  readClientKb,
  subscribeKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

export default function PreviewReportPage() {
  const { client, selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);
  const report = snapshot?.executiveReport ?? demoExecutiveReport;

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );
  const knowledgeBaseText = formatKnowledgeBaseEvidence(kb).join("\n");

  const handleExport = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-8">
      <div className="print-hide flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeader
          eyebrow="Module 5"
          title="Executive report"
          description="Structured, consulting-style output with clear headings, argument flow, and evidence-grounded recommendations."
        />
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <path d="M6 14h12v8H6z" />
          </svg>
          Export to PDF
        </button>
      </div>

      <div className="print-area">
        <ExecutiveReport data={report} />
      </div>

      <section className="print-hide space-y-4">
        <SectionHeader
          eyebrow="On-demand reports"
          title="Generate additional deliverables"
          description="Trigger any of the reports below to have the assistant synthesize a fresh deliverable from the current knowledge base. Each output is exportable as PDF or Word."
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {ADVANCED_REPORTS.map((config) => (
            <AiReportCard
              key={config.id}
              config={config}
              clientId={selectedId}
              knowledgeBaseText={knowledgeBaseText}
              target={client.target}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
