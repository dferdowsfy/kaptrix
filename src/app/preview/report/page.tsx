"use client";

import { useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { AiReportCard } from "@/components/reports/ai-report-card";
import { SavedReportsList } from "@/components/reports/saved-reports-list";
import { ADVANCED_REPORTS } from "@/lib/reports/advanced-reports";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
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

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );
  const knowledgeBaseText = formatKnowledgeBaseEvidence(kb).join("\n");

  return (
    <div className="space-y-10">
      {/* On-demand reports live at the top so they are immediately
          discoverable when the operator lands on the Reports page. */}
      <section
        id="on-demand-reports"
        className="print-hide rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="On-demand reports"
            title="Generate a deliverable"
            description="Pick any report below — the assistant synthesizes it from the current knowledge base and exports to PDF or Word."
          />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 shadow-sm ring-1 ring-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {ADVANCED_REPORTS.length} reports available
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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

      <section id="saved-reports" className="print-hide">
        <SectionHeader
          eyebrow="Your history"
          title="Saved reports"
          description="Every report you have generated, with the date and time it was produced. Reports sync across your browsers and devices once you are signed in."
        />
        <div className="mt-5">
          <SavedReportsList />
        </div>
      </section>
    </div>
  );
}

