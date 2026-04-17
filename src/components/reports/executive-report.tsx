"use client";

import { Fragment } from "react";
import type { Engagement, Report, ScoreDimension } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export interface ExecutiveReportData {
  target: string;
  client: string;
  industry: string;
  generated_at: string;
  version: number;
  watermark: string;
  composite_score: number;
  recommendation: "Proceed" | "Proceed with conditions" | "Pause" | "Pass";
  confidence: "High" | "Moderate" | "Developing";
  executive_summary: string;
  strategic_context: string;
  top_three_takeaways: Array<{ headline: string; detail: string }>;
  dimension_scores: Record<ScoreDimension, number>;
  risk_heat_map: Array<{
    risk: string;
    likelihood: 1 | 2 | 3 | 4 | 5;
    impact: 1 | 2 | 3 | 4 | 5;
    category: string;
  }>;
  critical_findings: Array<{
    title: string;
    severity: "Critical" | "High" | "Moderate";
    what_we_found: string;
    why_it_matters: string;
    operator_evidence: string;
  }>;
  strategic_implications: Array<{
    theme: string;
    narrative: string;
  }>;
  value_creation_levers: Array<{
    lever: string;
    thesis: string;
    time_horizon: string;
  }>;
  recommended_conditions: Array<{
    condition: string;
    rationale: string;
    owner: string;
  }>;
  open_validation: string[];
  methodology: string;
}

interface Props {
  data: ExecutiveReportData;
}

const DIMENSION_LABELS: Record<ScoreDimension, string> = {
  product_credibility: "Product credibility",
  tooling_exposure: "Tooling exposure",
  data_sensitivity: "Data sensitivity",
  governance_safety: "Governance and safety",
  production_readiness: "Production readiness",
  open_validation: "Open validation",
};

const recommendationPalette: Record<
  ExecutiveReportData["recommendation"],
  { bg: string; text: string; ring: string }
> = {
  Proceed: { bg: "bg-emerald-600", text: "text-white", ring: "ring-emerald-300" },
  "Proceed with conditions": {
    bg: "bg-amber-500",
    text: "text-white",
    ring: "ring-amber-200",
  },
  Pause: { bg: "bg-orange-600", text: "text-white", ring: "ring-orange-200" },
  Pass: { bg: "bg-rose-700", text: "text-white", ring: "ring-rose-200" },
};

const severityPalette = {
  Critical: "border-rose-500 bg-rose-50 text-rose-900",
  High: "border-amber-500 bg-amber-50 text-amber-900",
  Moderate: "border-sky-500 bg-sky-50 text-sky-900",
};

export function ExecutiveReport({ data }: Props) {
  const rec = recommendationPalette[data.recommendation];

  return (
    <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
      {/* Cover */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-10 py-12 text-white">
        <div className="absolute inset-0 opacity-20" aria-hidden>
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-emerald-500 blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
              Kaptrix · AI Product Diligence
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight">
              {data.target}
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Prepared for {data.client} · {data.industry} · Version{" "}
              {data.version}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Issued {formatDate(data.generated_at)} ·{" "}
              <span className="uppercase tracking-wider">{data.watermark}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold ring-4 ring-offset-2 ring-offset-slate-950 ${rec.bg} ${rec.text} ${rec.ring}`}
            >
              {data.recommendation}
            </span>
            <div className="rounded-2xl bg-white/10 px-5 py-4 text-right backdrop-blur">
              <p className="text-[11px] uppercase tracking-wide text-slate-300">
                Composite score
              </p>
              <p className="mt-1 text-4xl font-bold">
                {data.composite_score.toFixed(1)}
                <span className="text-lg font-normal text-slate-400">/5.0</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-300">
                Conviction: {data.confidence}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-12 px-10 py-12">
        {/* Executive Summary */}
        <section>
          <SectionHeading
            kicker="01 · Executive Summary"
            title="What the evidence shows"
          />
          <p className="mt-4 text-[15px] leading-7 text-slate-700">
            {data.executive_summary}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {data.top_three_takeaways.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                  Takeaway {i + 1}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {t.headline}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {t.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Strategic Context */}
        <section>
          <SectionHeading
            kicker="02 · Strategic Context"
            title="Where this asset fits in the market"
          />
          <p className="mt-4 text-[15px] leading-7 text-slate-700">
            {data.strategic_context}
          </p>
        </section>

        {/* Scorecard */}
        <section>
          <SectionHeading
            kicker="03 · Scorecard"
            title="Six-dimension diligence view"
          />
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(data.dimension_scores) as ScoreDimension[]).map(
              (dim) => (
                <ScoreRow
                  key={dim}
                  label={DIMENSION_LABELS[dim]}
                  score={data.dimension_scores[dim]}
                />
              ),
            )}
          </div>
        </section>

        {/* Risk Heat Map */}
        <section>
          <SectionHeading
            kicker="04 · Risk Heat Map"
            title="Likelihood and impact of material risks"
          />
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <RiskHeatMap risks={data.risk_heat_map} />
          </div>
        </section>

        {/* Critical Findings */}
        <section>
          <SectionHeading
            kicker="05 · Critical Findings"
            title="Evidence-grounded issues that require attention"
          />
          <div className="mt-6 space-y-4">
            {data.critical_findings.map((f, i) => (
              <div
                key={i}
                className={`rounded-2xl border-l-4 bg-white p-6 shadow-sm ring-1 ring-slate-100 ${severityPalette[f.severity]}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider">
                      {f.severity}
                    </p>
                    <h4 className="mt-1 text-base font-semibold">{f.title}</h4>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Block label="What we found" body={f.what_we_found} />
                  <Block label="Why it matters" body={f.why_it_matters} />
                  <Block label="Operator evidence" body={f.operator_evidence} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Strategic Implications */}
        <section>
          <SectionHeading
            kicker="06 · Strategic Implications"
            title="What this means for the investment thesis"
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.strategic_implications.map((imp, i) => (
              <div
                key={i}
                className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 p-6 text-white"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                  Theme
                </p>
                <h4 className="mt-1 text-base font-semibold">{imp.theme}</h4>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  {imp.narrative}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Value Creation */}
        <section>
          <SectionHeading
            kicker="07 · Value Creation Levers"
            title="Where post-close intervention compounds returns"
          />
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-3 text-left">Lever</th>
                  <th className="px-5 py-3 text-left">Thesis</th>
                  <th className="px-5 py-3 text-left">Horizon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.value_creation_levers.map((l, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {l.lever}
                    </td>
                    <td className="px-5 py-4 text-slate-700">{l.thesis}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {l.time_horizon}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recommended Conditions */}
        <section>
          <SectionHeading
            kicker="08 · Recommended Conditions"
            title="What must be validated before close"
          />
          <ol className="mt-6 space-y-3">
            {data.recommended_conditions.map((c, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.condition}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {c.rationale}
                  </p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Owner · {c.owner}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Open Validation */}
        <section>
          <SectionHeading
            kicker="09 · Open Validation"
            title="Items still requiring confirmation"
          />
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {data.open_validation.map((v, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <span className="mt-0.5 text-slate-400">›</span>
                {v}
              </li>
            ))}
          </ul>
        </section>

        {/* Methodology */}
        <footer className="border-t border-slate-200 pt-6">
          <SectionHeading
            kicker="Methodology"
            title="How Kaptrix grounds this report"
            compact
          />
          <p className="mt-3 text-xs leading-6 text-slate-500">
            {data.methodology}
          </p>
        </footer>
      </div>
    </article>
  );
}

function SectionHeading({
  kicker,
  title,
  compact,
}: {
  kicker: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
        {kicker}
      </p>
      <h2
        className={`mt-2 font-bold tracking-tight text-slate-900 ${
          compact ? "text-lg" : "text-2xl"
        }`}
      >
        {title}
      </h2>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  const tone =
    score >= 4
      ? "from-emerald-500 to-emerald-600"
      : score >= 3
        ? "from-indigo-500 to-indigo-600"
        : score >= 2
          ? "from-amber-500 to-amber-600"
          : "from-rose-500 to-rose-600";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-lg font-bold text-slate-900">{score.toFixed(1)}</p>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function RiskHeatMap({
  risks,
}: {
  risks: ExecutiveReportData["risk_heat_map"];
}) {
  const cellColor = (score: number) => {
    if (score >= 20) return "bg-rose-600 text-white";
    if (score >= 12) return "bg-amber-500 text-white";
    if (score >= 6) return "bg-yellow-300 text-slate-800";
    return "bg-emerald-200 text-emerald-900";
  };
  return (
    <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
      <div className="bg-slate-50 p-5">
        <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-semibold text-slate-500">
          <div />
          <div>L1</div>
          <div>L2</div>
          <div>L3</div>
          <div>L4</div>
          <div>L5</div>
          {[5, 4, 3, 2, 1].map((impact) => (
            <Fragment key={`row-${impact}`}>
              <div className="flex items-center justify-end pr-1 font-semibold">
                I{impact}
              </div>
              {[1, 2, 3, 4, 5].map((likelihood) => {
                const found = risks.find(
                  (r) => r.impact === impact && r.likelihood === likelihood,
                );
                const score = impact * likelihood;
                return (
                  <div
                    key={`${impact}-${likelihood}`}
                    className={`aspect-square rounded-md ${cellColor(score)} flex items-center justify-center text-[10px] font-bold`}
                    title={found?.risk}
                  >
                    {found ? "●" : ""}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
        <p className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">
          Likelihood × Impact
        </p>
      </div>
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Plotted risks
        </p>
        <ul className="mt-2 space-y-2">
          {risks.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-1 h-2 w-2 flex-none rounded-full bg-rose-500" />
              <div>
                <p className="font-medium text-slate-800">{r.risk}</p>
                <p className="text-xs text-slate-500">
                  {r.category} · L{r.likelihood} × I{r.impact}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Back-compat adapter so existing Report rows still render
export function executiveReportFromDemo(
  report: Report,
  engagement: Engagement,
  overrides: Partial<ExecutiveReportData>,
): ExecutiveReportData {
  return {
    target: engagement.target_company_name,
    client: engagement.client_firm_name,
    industry: overrides.industry ?? "Legal Tech",
    generated_at: report.generated_at,
    version: report.version,
    watermark: (report.watermark ?? "draft").toString(),
    composite_score: report.report_data.composite_score ?? 3.1,
    recommendation: overrides.recommendation ?? "Proceed with conditions",
    confidence: overrides.confidence ?? "Moderate",
    executive_summary:
      report.report_data.executive_summary ?? "",
    strategic_context: overrides.strategic_context ?? "",
    top_three_takeaways: overrides.top_three_takeaways ?? [],
    dimension_scores:
      overrides.dimension_scores ?? ({} as Record<ScoreDimension, number>),
    risk_heat_map: overrides.risk_heat_map ?? [],
    critical_findings: overrides.critical_findings ?? [],
    strategic_implications: overrides.strategic_implications ?? [],
    value_creation_levers: overrides.value_creation_levers ?? [],
    recommended_conditions: overrides.recommended_conditions ?? [],
    open_validation: overrides.open_validation ?? [],
    methodology:
      overrides.methodology ??
      "Kaptrix reviews operator-confirmed evidence extracted from uploaded artifacts and synthesizes findings against a six-dimension scoring model benchmarked against a proprietary case library. Every claim is grounded in a document citation and reviewed by a human operator prior to publication.",
  };
}
