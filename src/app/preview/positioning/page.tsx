"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SectionHeader } from "@/components/preview/preview-shell";
import { GenerateButton } from "@/components/preview/generate-button";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  formatKnowledgeBaseEvidence,
  readClientKb,
  submitPositioningToKnowledgeBase,
  subscribeKnowledgeBase,
  currentContextSlice,
  isStageDirty,
  KNOWLEDGE_STEP_LABELS,
  type KnowledgeEntry,
  type KnowledgeStep,
} from "@/lib/preview/knowledge-base";
import {
  startPositioningRun,
  usePositioningRunStore,
  type Confidence,
  type Position,
  type PositioningResult,
} from "@/lib/preview/positioning-run-store";

const EMPTY_KB: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};

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

// ─── Local cache so returning users see prior analysis without a reload ─────
const POS_CACHE_PREFIX = "kaptrix.preview.positioning.v1:";
type PositioningCache = {
  data: PositioningResult;
  sources: { url: string; title?: string }[];
  generated_at: string;
};
function readPositioningCache(clientId: string | null | undefined): PositioningCache | null {
  if (!clientId || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POS_CACHE_PREFIX + clientId);
    return raw ? (JSON.parse(raw) as PositioningCache) : null;
  } catch {
    return null;
  }
}
function writePositioningCache(clientId: string, cache: PositioningCache): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(POS_CACHE_PREFIX + clientId, JSON.stringify(cache));
  } catch {
    /* ignore quota */
  }
}

export default function PositioningPage() {
  const { client, selectedId, ready } = useSelectedPreviewClient();
  const positioningRun = usePositioningRunStore();
  const [data, setData] = useState<PositioningResult | null>(null);
  const [sources, setSources] = useState<{ url: string; title?: string }[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(selectedId),
    () => EMPTY_KB,
  );

  const isMyRun = positioningRun.clientId === selectedId;
  const loading = isMyRun && positioningRun.status === "running";
  const error =
    isMyRun && positioningRun.status === "error"
      ? (positioningRun.error ?? "Unable to generate positioning.")
      : null;

  const run = useCallback(() => {
    if (!selectedId) return;
    // Context-engine contract: send ONLY the upstream slice the
    // positioning stage is entitled to see (intake + insights +
    // scoring + pre-analysis). This prevents the model from
    // feedback-looping on the prior positioning entry and guarantees
    // the prompt is grounded in the current upstream context.
    const slice = currentContextSlice(kb, "positioning");
    const knowledge_base = formatKnowledgeBaseEvidence(slice).join("\n");
    startPositioningRun(selectedId, knowledge_base);
  }, [selectedId, kb]);

  // On client change: restore prior results from cache if we have them.
  // Do NOT auto-run the API — show the placeholder so the user decides when
  // to spend a compute cycle. Gates on `ready` so we only act after the
  // persisted selectedId is hydrated from localStorage.
  useEffect(() => {
    if (!ready || !selectedId) return;
    const cached = readPositioningCache(selectedId);
    if (cached) {
      setData(cached.data);
      setSources(cached.sources);
      setGeneratedAt(cached.generated_at);
      return;
    }
    setData(null);
    setSources([]);
    setGeneratedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  useEffect(() => {
    if (
      positioningRun.status === "done" &&
      positioningRun.clientId === selectedId &&
      positioningRun.data &&
      selectedId
    ) {
      const ts = positioningRun.generated_at ?? new Date().toISOString();
      setData(positioningRun.data);
      setSources(positioningRun.sources ?? []);
      setGeneratedAt(ts);
      writePositioningCache(selectedId, {
        data: positioningRun.data,
        sources: positioningRun.sources ?? [],
        generated_at: ts,
      });
      submitPositioningToKnowledgeBase({
        clientId: selectedId,
        positioning: positioningRun.data,
        sources: positioningRun.sources ?? [],
      });
    }
  }, [
    positioningRun.status,
    positioningRun.clientId,
    positioningRun.data,
    positioningRun.sources,
    positioningRun.generated_at,
    selectedId,
  ]);

  // Context-engine: is the cached positioning now stale because an
  // upstream stage (intake / insights / scoring / pre-analysis) was
  // updated after positioning was computed? This is the "dirty" bit in
  // the contract — the UI refuses to present a superseded derivation
  // as authoritative.
  const positioningDirty = isStageDirty(kb, "positioning");
  const upstreamChanged = positioningDirty.dirty && data !== null;

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
          {generatedAt && !loading && (
            <p className="mt-1 text-[11px] text-slate-400">
              Last generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <GenerateButton type="button" onClick={run} disabled={loading}>
          {loading
            ? "Generating positioning…"
            : data
              ? "Re-generate positioning"
              : "Generate positioning"}
        </GenerateButton>
      </div>

      {upstreamChanged && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">Upstream context changed.</span>{" "}
          The displayed positioning was generated against an earlier version of{" "}
          {positioningDirty.reasons
            .map((r) => KNOWLEDGE_STEP_LABELS[r])
            .join(", ")}
          . Re-generate positioning to rebuild peers from the current intake and
          evidence.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !data && <SkeletonPositioning />}

      {!loading && !data && !error && <EmptyPositioning client={client} />}

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
            subtitle={`${data.comparables.length} peers · vertical + buyer are hard filters`}
          >
            {data.insufficient_vertical_comps && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-semibold">Insufficient vertical-native comps found.</span>
                {data.insufficient_reason ? ` ${data.insufficient_reason}` : ""}
              </div>
            )}
            <div className="space-y-3">
              {data.comparables.map((c) => (
                <div
                  key={c.name}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {c.category && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${
                            c.category === "D"
                              ? "bg-amber-50 text-amber-800 ring-amber-200"
                              : "bg-indigo-50 text-indigo-700 ring-indigo-200"
                          }`}
                          title={
                            c.category === "A"
                              ? "Direct vertical-native competitor"
                              : c.category === "B"
                                ? "Incumbent platform with AI extension"
                                : c.category === "C"
                                  ? "Adjacent vertical workflow player"
                                  : "Horizontal AI threat — context only, not a revenue peer"
                          }
                        >
                          {c.category}
                          {c.category === "D" ? " · threat" : ""}
                        </span>
                      )}
                      {c.revenue_stage && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {c.revenue_stage}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                        {c.type}
                      </span>
                    </div>
                  </div>
                  {c.vertical_fit_evidence && (
                    <p className="mt-1.5 text-[11px] text-slate-700">
                      <span className="font-semibold text-slate-900">Vertical fit:</span>{" "}
                      {c.vertical_fit_evidence}
                    </p>
                  )}
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

// Rich placeholder shown before any analysis has been run for this client.
// Keeps the page from looking broken / empty and orients the user on what
// this module will produce.
function EmptyPositioning({
  client,
}: {
  client: { target: string; industry: string; deal_stage: string; client: string };
}) {
  return (
    <div className="space-y-4">
      {/* What you'll see */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Ready when you are
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900">
          Position {client.target} against contextually relevant peers
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Kaptrix pulls comparables from live web research, then maps{" "}
          {client.target} against them on the dimensions that drive IC conviction.
          Click <span className="font-semibold text-slate-900">Generate positioning</span>{" "}
          above to generate a fresh read.
        </p>
      </div>

      {/* Preview of what the module produces */}
      <div className="grid gap-3 md:grid-cols-3">
        <PreviewCard
          title="Target context"
          body="The product, industry, customer segment, data sensitivity and architecture pattern Kaptrix uses to select peers."
        />
        <PreviewCard
          title="Selected comparables"
          body="Named companies, products, or analogs surfaced via live web research — each with a rationale and a source link."
        />
        <PreviewCard
          title="Dimension-by-dimension read"
          body="Ahead · In line · Behind per dimension, each backed by a cited evidence snippet."
        />
        <PreviewCard
          title="Positioning summary"
          body="A single-sentence IC-ready summary of where the target stands relative to the comparable set."
        />
        <PreviewCard
          title="Investment interpretation"
          body="Differentiation, durability, risk concentration, and validation priorities framed for the deal thesis."
        />
        <PreviewCard
          title="Confidence & sources"
          body="An explicit confidence read with rationale, plus the list of live web sources used to build the analysis."
        />
      </div>

      <p className="text-center text-[11px] text-slate-500">
        {client.industry} · {client.deal_stage} · {client.client}
      </p>
    </div>
  );
}

function PreviewCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      <p className="mt-1.5 text-sm text-slate-700">{body}</p>
    </div>
  );
}
