"use client";

import { useState } from "react";
import { IndustryCoverageMatrix } from "@/components/documents/industry-coverage-matrix";
import { KnowledgeInsightsPanel } from "@/components/documents/knowledge-insights-panel";
import { IntakeQuestionnaire } from "@/components/engagements/intake-questionnaire";
import { PreAnalysisDashboard } from "@/components/pre-analysis/pre-analysis-dashboard";
import { ExecutiveReport } from "@/components/reports/executive-report";
import { ScoringPanel } from "@/components/scoring/scoring-panel";
import {
  demoAnalyses,
  demoBenchmarkCases,
  demoDocuments,
  demoEngagement,
  demoExecutiveReport,
  demoKnowledgeInsights,
  demoPatternMatches,
  demoScores,
} from "@/lib/demo-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "intake", label: "Intake" },
  { id: "coverage", label: "Coverage" },
  { id: "insights", label: "Insights" },
  { id: "analysis", label: "Pre-Analysis" },
  { id: "scoring", label: "Scoring" },
  { id: "report", label: "Report" },
];

export default function PreviewPage() {
  const [intakeAnswers, setIntakeAnswers] = useState<
    Record<string, string | number | string[]>
  >({});

  const handleInsertInsight = (insight: KnowledgeInsight) => {
    if (!insight.suggested_intake_field || !insight.suggested_intake_value)
      return;
    setIntakeAnswers((prev) => {
      const next = { ...prev };
      const idByField: Record<string, string> = {
        "Red flag priors": "red_flag_priors",
        "Primary AI architecture": "primary_architecture",
        "Regulatory exposure": "regulatory_exposure",
        "Known vendor or model dependencies": "known_vendors",
        "Diligence priorities": "diligence_priorities",
      };
      const id = idByField[insight.suggested_intake_field!];
      if (!id) return prev;
      const existing = next[id];
      if (
        ["red_flag_priors", "regulatory_exposure", "diligence_priorities"].includes(
          id,
        )
      ) {
        const arr = Array.isArray(existing) ? existing : [];
        if (!arr.includes(insight.suggested_intake_value!))
          next[id] = [...arr, insight.suggested_intake_value!];
      } else {
        next[id] = insight.suggested_intake_value!;
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Kaptrix Delivery Platform
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              Operator Workspace Preview
            </h1>
          </div>
          <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Running with mock data — Supabase and Anthropic not yet wired
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-8">
        <aside className="sticky top-8 hidden h-fit w-56 rounded-2xl border bg-white p-4 shadow-sm lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">
            Preview Sections
          </p>
          <nav className="space-y-1">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {section.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 space-y-12">
          <section id="overview" className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white shadow-xl">
              <div
                className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-indigo-500/40 blur-3xl"
                aria-hidden
              />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-sm font-medium text-indigo-200">
                    AI product diligence · Phase 1 workspace
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight">
                    {demoEngagement.target_company_name}
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {demoEngagement.client_firm_name} ·{" "}
                    {demoEngagement.deal_stage.replace("_", " ")} · Due{" "}
                    {formatDate(demoEngagement.delivery_deadline!)}
                  </p>
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                    Industry-calibrated coverage, RAG-powered document
                    intelligence, guided intake, and a McKinsey-grade report —
                    all grounded in operator-confirmed evidence.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Tile label="Tier" value="Standard" />
                  <Tile
                    label="Fee"
                    value={formatCurrency(demoEngagement.engagement_fee ?? 0)}
                  />
                  <Tile label="Status" value={demoEngagement.status} />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                label="Documents indexed"
                value={String(demoDocuments.length)}
                helper="RAG corpus live"
              />
              <MetricCard
                label="Industry coverage"
                value="45%"
                helper="Legal Tech profile"
              />
              <MetricCard
                label="AI insights"
                value={String(demoKnowledgeInsights.length)}
                helper="Surfaced from corpus"
              />
              <MetricCard
                label="Recommendation"
                value="Conditional"
                helper="Proceed with conditions"
                tone="warn"
              />
            </div>
          </section>

          <section id="intake" className="space-y-4">
            <SectionHeader
              eyebrow="Module 1a"
              title="Guided intake questionnaire"
              description="Preselected, industry-aware options with free-form responses. Any AI-surfaced insight can be promoted directly into an intake field."
            />
            <IntakeQuestionnaire
              initialAnswers={intakeAnswers}
              onChange={setIntakeAnswers}
            />
          </section>

          <section id="coverage" className="space-y-4">
            <SectionHeader
              eyebrow="Module 1b"
              title="Industry-calibrated coverage matrix"
              description="Pick the industry and Kaptrix pre-populates the artifact checklist, regulatory lens, and AI-generated request list for what is missing."
            />
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <IndustryCoverageMatrix documents={demoDocuments} />
            </div>
          </section>

          <section id="insights" className="space-y-4">
            <SectionHeader
              eyebrow="Module 1c"
              title="Document intelligence"
              description="Every uploaded artifact is embedded into a retrieval corpus; insights are extracted against Kaptrix diligence prompts and promotable into intake."
            />
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <KnowledgeInsightsPanel
                documents={demoDocuments}
                insights={demoKnowledgeInsights}
                onInsertToIntake={handleInsertInsight}
              />
            </div>
          </section>

          <section id="analysis" className="space-y-4">
            <SectionHeader
              eyebrow="Module 2"
              title="AI-assisted pre-analysis"
              description="Per-document extraction plus a synthesis pass for contradictions, regulatory exposure, and operator follow-ups."
            />
            <PreAnalysisDashboard
              analyses={demoAnalyses}
              engagementId={demoEngagement.id}
            />
          </section>

          <section id="scoring" className="space-y-4">
            <SectionHeader
              eyebrow="Module 3"
              title="Scoring engine"
              description="Interactive six-dimension workflow. Edits are local in preview mode, so poke at the sliders freely."
            />
            <ScoringPanel
              engagementId={demoEngagement.id}
              scores={demoScores}
              patternMatches={demoPatternMatches}
              benchmarkCases={demoBenchmarkCases}
              previewMode
            />
          </section>

          <section id="report" className="space-y-4 pb-12">
            <SectionHeader
              eyebrow="Module 5"
              title="Executive report"
              description="McKinsey-grade structure with executive summary, strategic context, risk heat map, implications, value-creation levers, and conditions — all rendered as headings and subheadings, never as raw markdown."
            />
            <ExecutiveReport data={demoExecutiveReport} />
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {description}
      </p>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold capitalize ${
          tone === "warn" ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
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
