"use client";

import {
  demoDocuments,
  demoExecutiveReport,
  demoKnowledgeInsights,
} from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SectionHeader } from "@/components/preview/preview-shell";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewSnapshot } from "@/hooks/use-preview-data";

export default function PreviewOverviewPage() {
  const { client, selectedId } = useSelectedPreviewClient();
  const { snapshot } = usePreviewSnapshot(selectedId);

  const documents = snapshot?.documents ?? demoDocuments;
  const insights = snapshot?.knowledgeInsights ?? demoKnowledgeInsights;
  const report = snapshot?.executiveReport ?? demoExecutiveReport;

  return (
    <div className="space-y-6 sm:space-y-8">
      <SectionHeader
        eyebrow="Overview"
        title="Engagement snapshot"
        description="A concise view of current diligence posture before you drill into intake, coverage, insights, and reporting tabs."
      />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-5 text-white shadow-[0_30px_80px_-30px_rgba(79,70,229,0.55)] sm:p-8">
        <div
          className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-indigo-200 sm:text-sm">
              AI product diligence · Phase 1 workspace
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-4xl">
              {client.target}
            </h2>
            <p className="mt-3 text-sm text-slate-300 sm:text-base">
              {client.client} · {client.deal_stage.replace("_", " ")} · Due{" "}
              {formatDate(client.deadline)}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {client.summary}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Tile label="Tier" value={client.tier} />
            <Tile label="Fee" value={formatCurrency(client.fee_usd)} />
            <Tile label="Status" value={client.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
        <MetricCard
          label="Documents indexed"
          value={String(documents.length)}
          helper="RAG corpus active"
        />
        <MetricCard
          label="Insights surfaced"
          value={String(insights.length)}
          helper="Grounded snippets"
        />
        <MetricCard
          label="Composite score"
          value={
            client.composite_score !== null
              ? client.composite_score.toFixed(1)
              : "—"
          }
          helper="Across six dimensions"
        />
        <MetricCard
          label="Recommendation"
          value={client.recommendation}
          helper="Current investment posture"
          tone="warn"
        />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_18px_50px_-30px_rgba(15,23,42,0.35)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600">
          Recommendation context
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          {report.recommendation} · {report.confidence} conviction
        </h3>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700 sm:text-base">
          {report.executive_summary}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "warn";
}) {
  return (
    <div
      className={`rounded-3xl border bg-white p-5 transition hover:-translate-y-0.5 sm:p-6
        ${
          tone === "warn"
            ? "border-amber-200 shadow-[0_0_0_4px_rgba(251,191,36,0.12),0_18px_50px_-25px_rgba(217,119,6,0.55)]"
            : "border-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_18px_50px_-25px_rgba(79,70,229,0.35)]"
        }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-3 text-2xl font-bold capitalize sm:text-3xl ${
          tone === "warn" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600 sm:text-base">{helper}</p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-200 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-white sm:text-lg">
        {value}
      </p>
    </div>
  );
}
