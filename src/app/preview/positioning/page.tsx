"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  formatKnowledgeBaseEvidence,
  readClientKb,
  subscribeKnowledgeBase,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

type Position = "ahead" | "in_line" | "behind";
type Confidence = "low" | "medium" | "high";

interface Positioning {
  target_context: {
    type: "organization" | "product";
    industry: string;
    business_model: string;
    ai_use_case: string;
    customer_segment: string;
    data_sensitivity: string;
    deployment_maturity: string;
    vendor_stack: string;
    regulatory_exposure: string;
    architecture_pattern: string;
  };
  comparables: {
    name: string;
    type: "company" | "product" | "analog";
    rationale: string;
    source_url?: string;
  }[];
  comparison: {
    dimension: string;
    position: Position;
    evidence: string;
  }[];
  positioning_summary: string;
  investment_interpretation: {
    differentiation: string;
    durability: string;
    risk_concentration: string;
    validation_priorities: string[];
  };
  confidence: Confidence;
  confidence_rationale: string;
}

const POSITION_STYLES: Record<Position, { label: string; className: string }> = {
  ahead: {
    label: "Ahead",
    className: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  },
  in_line: {
    label: "In line",
    className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  },
  behind: {
    label: "Behind",
    className: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  },
};

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  high: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function PositioningPage() {
  const { client, selectedId } = useSelectedPreviewClient();
  const [data, setData] = useState<Positioning | null>(null);
  const [sources, setSources] = useState<{ url: string; title?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const knowledge_base = formatKnowledgeBaseEvidence(kb).join("\n");
      const res = await fetch("/api/positioning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedId, knowledge_base }),
      });
      const json = (await res.json()) as {
        positioning?: Positioning;
        sources?: { url: string; title?: string }[];
        error?: string;
      };
      if (!res.ok || !json.positioning) {
        setError(json.error ?? "Unable to generate positioning.");
        setData(null);
        setSources([]);
      } else {
        setData(json.positioning);
        setSources(json.sources ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedId, kb]);

  // Auto-run when client changes
  useEffect(() => {
    setData(null);
    setSources([]);
    setError(null);
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Module 4"
        title="Contextual positioning"
        description="Evidence-backed relative benchmarking. Compares the target against contextually relevant peers from the engagement knowledge base — never in isolation."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Target
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {client.target}
          </p>
          <p className="text-xs text-slate-500">
            {client.client} · {client.industry} · {client.deal_stage}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing peers…" : data ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !data && <SkeletonPositioning />}

      {data && (
        <>
          {/* Positioning summary banner */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Relative positioning
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">
                  {data.positioning_summary}
                </p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${CONFIDENCE_STYLES[data.confidence]}`}
              >
                {data.confidence.toUpperCase()} confidence
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {data.confidence_rationale}
            </p>
          </div>

          {/* Target context */}
          <Card title="Target context" subtitle={`Classified as ${data.target_context.type}`}>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.target_context)
                .filter(([k]) => k !== "type")
                .map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="mt-0.5 text-sm text-slate-800">{v}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {/* Comparables */}
          <Card
            title="Selected comparables"
            subtitle={`${data.comparables.length} peers identified via live web research`}
          >
            <div className="space-y-3">
              {data.comparables.map((c) => (
                <div
                  key={c.name}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {c.name}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {c.type}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-600">{c.rationale}</p>
                  {c.source_url && (
                    <a
                      href={c.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block truncate text-[11px] text-indigo-600 hover:underline"
                    >
                      {c.source_url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Comparison table */}
          <Card title="Relative comparison" subtitle="Dimension-by-dimension vs peers">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3 font-semibold">Dimension</th>
                    <th className="pb-2 pr-3 font-semibold">Position</th>
                    <th className="pb-2 font-semibold">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.comparison.map((row) => {
                    const style = POSITION_STYLES[row.position];
                    return (
                      <tr key={row.dimension} className="align-top">
                        <td className="py-3 pr-3 font-medium text-slate-800">
                          {row.dimension}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
                          >
                            {style.label}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-slate-600">
                          {row.evidence}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Investment interpretation */}
          <Card
            title="Investment interpretation"
            subtitle="Decision-relevant implications"
          >
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Block label="Differentiation" body={data.investment_interpretation.differentiation} />
              <Block label="Durability" body={data.investment_interpretation.durability} />
              <Block label="Risk concentration" body={data.investment_interpretation.risk_concentration} />
            </div>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Validation priorities
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {data.investment_interpretation.validation_priorities.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>
          </Card>

          {sources.length > 0 && (
            <Card
              title="Web research sources"
              subtitle={`${sources.length} pages consulted by the model`}
            >
              <ul className="space-y-1.5">
                {sources.map((s) => (
                  <li key={s.url} className="text-xs">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      {s.title || s.url}
                    </a>
                    {s.title && (
                      <span className="ml-2 text-slate-400">{s.url}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-800">{body}</p>
    </div>
  );
}

function SkeletonPositioning() {
  return (
    <div className="space-y-3">
      <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
