import { demoDocuments, demoEngagement, demoExecutiveReport, demoKnowledgeInsights } from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SectionHeader } from "@/components/preview/preview-shell";

export default function PreviewOverviewPage() {
  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Overview"
        title="Engagement snapshot"
        description="A concise view of current diligence posture before you drill into intake, coverage, insights, and reporting tabs."
      />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-indigo-200">AI product diligence · Phase 1 workspace</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">{demoEngagement.target_company_name}</h2>
            <p className="mt-2 text-sm text-slate-300">
              {demoEngagement.client_firm_name} · {demoEngagement.deal_stage.replace("_", " ")} · Due {formatDate(demoEngagement.delivery_deadline!)}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              This workspace uses industry-calibrated workflows, retrieval-grounded intelligence, and executive-grade reporting with operator-confirmed evidence.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label="Tier" value="Standard" />
            <Tile label="Fee" value={formatCurrency(demoEngagement.engagement_fee ?? 0)} />
            <Tile label="Status" value={demoEngagement.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Documents indexed" value={String(demoDocuments.length)} helper="RAG corpus active" />
        <MetricCard label="Insights surfaced" value={String(demoKnowledgeInsights.length)} helper="Grounded snippets" />
        <MetricCard label="Composite score" value={demoExecutiveReport.composite_score.toFixed(1)} helper="Across six dimensions" />
        <MetricCard label="Recommendation" value={demoExecutiveReport.recommendation} helper="Current investment posture" tone="warn" />
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
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold capitalize ${tone === "warn" ? "text-amber-600" : "text-slate-900"}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize">{value}</p>
    </div>
  );
}
