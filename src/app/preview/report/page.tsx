"use client";

import { useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { AiReportCard } from "@/components/reports/ai-report-card";
import { SavedReportsList } from "@/components/reports/saved-reports-list";
import { getAdvancedReportsForSubject } from "@/lib/reports/advanced-reports";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  formatKnowledgeBaseEvidence,
  readClientKb,
  subscribeKnowledgeBase,
  KNOWLEDGE_STEP_LABELS,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

export default function PreviewReportPage() {
  const { client, selectedId } = useSelectedPreviewClient();

  // AI Category Diligence: report catalog is selected by the engagement's
  // subject_kind. Target-mode clients (default) see the original 14
  // ADVANCED_REPORTS; category-mode clients see the 10 category_* reports.
  const subjectKind = client.subject_kind ?? "target";
  const reports = getAdvancedReportsForSubject(subjectKind);

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );

  // Context-engine contract: only include non-stale stages in the
  // evidence text fed to report generation. Stale derivations must
  // not appear in a deliverable — the operator should recompute
  // upstream first.
  const staleSteps = (Object.keys(kb) as KnowledgeStep[]).filter(
    (s) => kb[s]?.stale,
  );
  const freshKb = Object.fromEntries(
    (Object.entries(kb) as [KnowledgeStep, KnowledgeEntry | undefined][]).filter(
      ([, entry]) => entry && !entry.stale,
    ),
  ) as Partial<Record<KnowledgeStep, KnowledgeEntry>>;
  const knowledgeBaseText = formatKnowledgeBaseEvidence(freshKb).join("\n");

  return (
    <div className="space-y-10">
      {staleSteps.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <span className="font-semibold">Some knowledge-base stages are stale.</span>{" "}
          {staleSteps
            .map((s) => KNOWLEDGE_STEP_LABELS[s])
            .join(", ")}{" "}
          were invalidated by upstream changes. Reads created now will exclude
          stale stages. Recompute them first for a complete read.
        </div>
      )}
      {/* On-demand reports live at the top so they are immediately
          discoverable when the operator lands on the Reports page. */}
      <section
        id="on-demand-reports"
        className="print-hide rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            eyebrow="Quick Reads"
            title="Create a read"
            description="Pick any read below — Kaptrix turns the company's documents into a clear, structured view you can review, share, or export."
          />
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700 shadow-sm ring-1 ring-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            {reports.length} reads available
          </span>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((config) => (
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
          eyebrow="Your Company Reads"
          title="Your Company Reads"
          description="All your created company reads — ready to view, share, or export. Reads sync across your browsers and devices once you are signed in."
        />
        <div className="mt-5">
          <SavedReportsList />
        </div>
      </section>
    </div>
  );
}

