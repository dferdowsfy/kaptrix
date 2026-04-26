"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import {
  calculateCompositeScore,
  deriveDecision,
  type DecisionResult,
} from "@/lib/scoring/calculator";
import {
  aggregateContextAdjustment,
  type ContextSignal,
} from "@/lib/scoring/context";
import type { SubCriterionEngineOutput } from "@/lib/scoring/engine-types";
import { KNOWLEDGE_STEP_LABELS } from "@/lib/preview/knowledge-base";
import { DIMENSION_SHORT_LABEL } from "@/lib/preview/system-signals";
import { GenerateButton } from "@/components/preview/generate-button";
import type {
  BenchmarkCase,
  DealStage,
  EngagementStatus,
  PatternMatch,
  PreAnalysis,
  Score,
  ScoreBand,
  ScoreDimension,
} from "@/lib/types";

interface Props {
  engagementId: string;
  scores: Score[];
  patternMatches: PatternMatch[];
  benchmarkCases: BenchmarkCase[];
  previewMode?: boolean;
  /** Lifecycle context for the decision engine. */
  dealStage?: DealStage;
  status?: EngagementStatus;
  analyses?: PreAnalysis[];
  priorComposite?: number | null;
  /** Context signals derived from the knowledge base (intake, coverage, insights, pre-analysis). */
  contextSignals?: ContextSignal[];
  /** Optional callback invoked whenever local scoring state changes (for KB auto-sync). */
  onScoresChange?: (snapshot: {
    scores: Score[];
    composite_score: number;
    context_aware_composite: number;
    decision_band: string | null;
  }) => void;
  /** Optional callback to force-refresh the scoring KB entry. */
  onForceResync?: () => void;
  /** Whether the scoring KB entry is stale and needs recompute. */
  scoringStale?: boolean;
  /**
   * Deterministic engine outputs keyed by `${dimension}.${sub_criterion}`.
   * When supplied, each sub-criterion row renders a source indicator
   * (intake_only / artifact_supported / artifact_only / contradictory /
   * insufficient), a confidence badge, and a contradiction flag.
   */
  engineMetadataBySub?: Record<string, SubCriterionEngineOutput>;
}

export function ScoringPanel({
  engagementId,
  scores: initialScores,
  patternMatches,
  benchmarkCases,
  previewMode = false,
  dealStage = "preliminary",
  status = "scoring",
  analyses = [],
  priorComposite = null,
  contextSignals = [],
  onScoresChange,
  onForceResync,
  scoringStale = false,
  engineMetadataBySub,
}: Props) {
  const [scores, setScores] = useState<Score[]>(initialScores);
  const [expandedDimension, setExpandedDimension] = useState<ScoreDimension | null>(
    "product_credibility",
  );
  const [saving, setSaving] = useState(false);
  const onScoresChangeRef = useRef(onScoresChange);

  // Resync local `scores` state from the parent when the parent passes
  // a substantively different score set — e.g. when intake / coverage /
  // positioning edits upstream cause the deterministic engine to emit
  // new sub-criterion scores. Without this, useState(initialScores)
  // would freeze the panel on the very first render's prop value and
  // every later prop update would be silently ignored.
  //
  // Compare by content signature, not reference, so re-renders that
  // produce an equivalent prop don't churn local state and don't blow
  // away in-flight slider edits.
  const initialScoresSignature = useMemo(
    () =>
      initialScores
        .map(
          (s) =>
            `${s.dimension}.${s.sub_criterion}=${s.score_0_to_5.toFixed(3)}`,
        )
        .sort()
        .join("|"),
    [initialScores],
  );
  useEffect(() => {
    setScores(initialScores);
    // We intentionally key only off the signature; pulling
    // initialScores into the deps would resync every render the parent
    // produces a new array reference even if values are equivalent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialScoresSignature]);

  const composite = calculateCompositeScore(scores);
  const contextAdjustment = aggregateContextAdjustment(contextSignals);
  const adjustedComposite =
    Math.round(
      Math.max(
        0,
        Math.min(5, composite.composite_score + contextAdjustment.composite_delta),
      ) * 10,
    ) / 10;
  const decision = deriveDecision({
    dealStage,
    status,
    scores,
    analyses,
    priorComposite,
    contextAdjustment,
  });

  useEffect(() => {
    if (!onScoresChange) return;
    onScoresChangeRef.current = onScoresChange;
  }, [onScoresChange]);

  const lastSyncSignatureRef = useRef<string>("");
  const decisionLabel = decision?.label ?? null;
  useEffect(() => {
    const cb = onScoresChangeRef.current;
    if (!cb) return;
    const signature = JSON.stringify({
      s: scores.map((sc) => [sc.dimension, sc.sub_criterion, sc.score_0_to_5]),
      c: composite.composite_score,
      a: adjustedComposite,
      d: decisionLabel,
    });
    if (signature === lastSyncSignatureRef.current) return;
    lastSyncSignatureRef.current = signature;
    cb({
      scores,
      composite_score: composite.composite_score,
      context_aware_composite: adjustedComposite,
      decision_band: decisionLabel,
    });
  }, [scores, composite.composite_score, adjustedComposite, decisionLabel]);

  // Optimistically update local score state so the composite score and
  // dimension bars react as the operator drags the slider. The persisted
  // save still runs through `saveScore` on rationale blur.
  const updateLocalScore = useCallback(
    (dimension: string, sub_criterion: string, score_0_to_5: number) => {
      setScores((prev) => {
        const dimensionKey = dimension as ScoreDimension;
        const idx = prev.findIndex(
          (s) => s.dimension === dimension && s.sub_criterion === sub_criterion,
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            score_0_to_5,
            updated_at: new Date().toISOString(),
          };
          return copy;
        }

        const dimensionConfig = SCORING_DIMENSIONS.find(
          (candidate) => candidate.key === dimensionKey,
        );
        if (!dimensionConfig) return prev;

        const now = new Date().toISOString();

        return [
          ...prev,
          {
            id: `local-${dimension}-${sub_criterion}`,
            engagement_id: engagementId,
            dimension: dimensionKey,
            sub_criterion,
            score_0_to_5,
            weight: dimensionConfig.weight,
            operator_rationale: "",
            evidence_citations: [],
            pattern_match_case_id: null,
            created_at: now,
            updated_at: now,
            updated_by: null,
          },
        ];
      });
    },
    [engagementId],
  );

  const saveScore = useCallback(
    async (
      dimension: string,
      sub_criterion: string,
      score_0_to_5: number,
      operator_rationale: string,
    ) => {
      if (previewMode) {
        setScores((prev) => {
          const idx = prev.findIndex(
            (s) => s.dimension === dimension && s.sub_criterion === sub_criterion,
          );

          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = {
              ...copy[idx],
              score_0_to_5,
              operator_rationale,
              updated_at: new Date().toISOString(),
            };
            return copy;
          }

          return prev;
        });
        return;
      }

      setSaving(true);
      const res = await fetch("/api/scores", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          engagement_id: engagementId,
          dimension,
          sub_criterion,
          score_0_to_5,
          operator_rationale,
          evidence_citations: [],
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setScores((prev) => {
          const idx = prev.findIndex(
            (s) => s.dimension === dimension && s.sub_criterion === sub_criterion,
          );
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          }
          return [...prev, updated];
        });
      }
      setSaving(false);
    },
    [engagementId, previewMode],
  );

  // Track when the main composite header scrolls out of view so we can
  // pop a floating composite chip into the bottom-left corner. Lets the
  // operator keep an eye on the score while editing sub-criterion
  // sliders deeper in the page.
  const compositeHeaderRef = useRef<HTMLDivElement | null>(null);
  const [showFloatingComposite, setShowFloatingComposite] = useState(false);
  useEffect(() => {
    const el = compositeHeaderRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingComposite(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6">
      {/* Composite score header — bare on the page background, mirroring
          the Stitch "Evidence Gathering Dashboard" layout. The previous
          card chrome was removed so the composite sits flush above the
          decision badge and the per-dimension card grid. */}
      <div
        ref={compositeHeaderRef}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-xs font-medium text-gray-500">
            {contextSignals.length > 0
              ? "Context-aware composite"
              : "Composite Score"}
          </p>
          <p className="mt-1 text-5xl font-bold tabular-nums text-gray-900">
            {adjustedComposite.toFixed(1)}
            <span className="ml-1 text-2xl font-normal text-gray-400">
              / 5.0
            </span>
          </p>
          {contextSignals.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Operator composite {composite.composite_score.toFixed(1)}
              {" · "}
              context Δ {contextAdjustment.composite_delta >= 0 ? "+" : ""}
              {contextAdjustment.composite_delta.toFixed(2)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!previewMode && saving && (
            <span className="text-xs text-gray-400">Saving…</span>
          )}
          {/* The page-level "Re-generate scores" button at the top of
              the page is the single entry point. The duplicate button
              that used to render here when scores went stale was a
              no-op for the deterministic engine (which already re-runs
              on every render), so it's been removed. */}
        </div>
      </div>

      <DecisionBadge decision={decision} />

      {/* "Adjust scoring below" hint — sets expectations that the
          generated score is fully editable in the per-dimension sections
          that follow. */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm text-indigo-900">
        <p>
          <span className="font-semibold">This composite is built from every input you&rsquo;ve given Kaptrix</span>
          {" "}— intake answers, evidence uploads, extracted insights,
          positioning, and pre-analysis red flags. Tap any dimension below to
          jump to its sub-criteria and override individual scores; the
          composite recalculates as you go.
        </p>
      </div>

      {/* Dimension scores — 3-column card grid (Stitch design).
          Each card shows the dimension name, the (context-adjusted) score,
          its delta vs the operator score, and a fill bar to 5.0. Clicking
          a card expands the matching scoring section below and scrolls to
          it so the operator can adjust without hunting for it. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {composite.dimension_details.map((dim) => {
          const delta = contextAdjustment.dimension_delta[dim.dimension] ?? 0;
          const adjusted = Math.max(0, Math.min(5, dim.average_score + delta));
          const onJump = () => {
            setExpandedDimension(dim.dimension);
            // Defer scroll to next tick so the section has rendered in
            // its expanded state before we measure its position.
            requestAnimationFrame(() => {
              const el = document.getElementById(
                `scoring-section-${dim.dimension}`,
              );
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            });
          };
          return (
            <button
              key={dim.dimension}
              type="button"
              onClick={onJump}
              className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              aria-label={`Jump to ${dim.name} sub-criteria`}
            >
              <p
                className="truncate text-sm font-medium text-slate-700 group-hover:text-indigo-700"
                title={dim.name}
              >
                {dim.name}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tabular-nums text-slate-900">
                  {adjusted.toFixed(1)}
                </span>
                {delta !== 0 && (
                  <span
                    className={`text-xs font-semibold ${
                      delta < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    ({delta > 0 ? "+" : ""}
                    {delta.toFixed(2)})
                  </span>
                )}
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${(adjusted / 5) * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] font-medium uppercase tracking-wider text-slate-400 group-hover:text-indigo-500">
                Tap to adjust →
              </p>
            </button>
          );
        })}
      </div>

      {/* Pattern matches sidebar */}
      {patternMatches.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-900">Pattern Matches</p>
          {patternMatches.map((match) => {
            const benchmark = benchmarkCases.find(
              (b) => b.case_anchor_id === match.case_anchor_id,
            );
            return (
              <div key={match.id} className="mt-2 text-xs text-blue-800">
                <span className="font-mono font-bold">{match.case_anchor_id}</span>
                {benchmark && (
                  <span> — {benchmark.vertical.replace(/_/g, " ")}</span>
                )}
                <p className="mt-0.5 text-blue-700">{match.similarity_reason}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* CTA: marks the boundary between the auto-generated composite
          (everything above) and the editable per-dimension sections
          (everything below). Clicking "Adjust below" opens the first
          dimension and smooth-scrolls to it. */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
              Step 2 · Your turn
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              Refine the score below
            </p>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              The composite above is Kaptrix&rsquo;s starting point. Open
              each dimension to review the engine&rsquo;s sub-criterion
              scores, override anything that doesn&rsquo;t match what you
              know, and add rationale. The composite recalculates as you
              go.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const first = SCORING_DIMENSIONS[0];
              if (!first) return;
              setExpandedDimension(first.key);
              requestAnimationFrame(() => {
                const el = document.getElementById(
                  `scoring-section-${first.key}`,
                );
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              });
            }}
            className="hidden shrink-0 items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:inline-flex"
          >
            ↓ Adjust below
          </button>
        </div>
      </div>

      {/* Dimension scoring sections — id anchor lets the dimension grid
          cards above scroll directly into the matching section. Each
          dimension gets its own dark purple gradient on the header so
          the six categories are visually distinct as the operator
          scrolls. */}
      {SCORING_DIMENSIONS.map((dim) => (
        <div
          key={dim.key}
          id={`scoring-section-${dim.key}`}
          className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <button
            onClick={() =>
              setExpandedDimension(
                expandedDimension === dim.key ? null : dim.key,
              )
            }
            className={`flex w-full items-center justify-between bg-gradient-to-r ${
              DIMENSION_GRADIENT[dim.key as ScoreDimension] ??
              "from-slate-800 via-slate-700 to-slate-800"
            } p-5 text-left text-white transition hover:brightness-110`}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold tracking-tight text-white">
                {dim.name}
              </h3>
              <span className="rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
                Weight {(dim.weight * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-base text-white/80">
              {expandedDimension === dim.key ? "▼" : "▶"}
            </span>
          </button>

          {expandedDimension === dim.key && (
            <div className="border-t p-4 space-y-6">
              {dim.sub_criteria.map((sub) => {
                const existing = scores.find(
                  (s) => s.dimension === dim.key && s.sub_criterion === sub.key,
                );
                const engineMeta =
                  engineMetadataBySub?.[`${dim.key}.${sub.key}`];
                return (
                  <SubCriterionInput
                    key={sub.key}
                    dimension={dim.key}
                    subKey={sub.key}
                    name={sub.name}
                    description={sub.description}
                    scoreBands={sub.score_bands}
                    initialScore={existing?.score_0_to_5 ?? 0}
                    initialRationale={existing?.operator_rationale ?? ""}
                    onSave={saveScore}
                    onScoreChange={updateLocalScore}
                    contextSignals={contextSignals}
                    engineMetadata={engineMeta}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Floating composite chip — appears once the operator scrolls
          past the main composite header so the score stays visible
          while editing sub-criterion sliders below. */}
      <div
        className={`fixed bottom-6 left-6 z-40 transition-all duration-200 ${
          showFloatingComposite
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div
          className={`flex items-center gap-3 rounded-2xl border bg-white p-3 pr-4 shadow-2xl ring-1 ring-black/5 ${
            decision.tone === "go"
              ? "border-emerald-200"
              : decision.tone === "warn"
                ? "border-amber-200"
                : "border-rose-200"
          }`}
        >
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold tabular-nums text-white ${
              decision.tone === "go"
                ? "bg-emerald-600"
                : decision.tone === "warn"
                  ? "bg-amber-600"
                  : "bg-rose-600"
            }`}
          >
            {adjustedComposite.toFixed(1)}
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Composite · live
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {decision.label}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Per-dimension dark-purple gradient for the section header. Each
 * dimension gets a distinct shade of the same family so the six
 * categories read as related but unmistakably separated as the
 * operator scrolls. Tailwind picks up the literal class strings at
 * build time, so the gradient stops are inlined here rather than
 * composed at runtime.
 */
const DIMENSION_GRADIENT: Record<ScoreDimension, string> = {
  product_credibility:
    "from-violet-900 via-purple-900 to-violet-800",
  tooling_exposure:
    "from-indigo-900 via-violet-900 to-indigo-800",
  data_sensitivity:
    "from-purple-900 via-fuchsia-900 to-purple-800",
  governance_safety:
    "from-slate-900 via-indigo-900 to-slate-800",
  production_readiness:
    "from-violet-950 via-indigo-900 to-violet-900",
  open_validation:
    "from-fuchsia-900 via-purple-900 to-fuchsia-800",
};

function getActiveBand(bands: ScoreBand[] | undefined, score: number): ScoreBand | undefined {
  if (!bands || bands.length === 0) return undefined;
  if (score === 0) return bands[0];
  return bands.find((b) => score <= b.max) ?? bands[bands.length - 1];
}

// ── Engine source indicators ─────────────────────────────────────────
//
// Renders the deterministic scoring engine's per-sub-criterion
// provenance: where the score came from (intake, artifacts, both,
// contradictory, or insufficient), confidence level, and whether a
// contradiction between intake and artifact evidence was detected.

const SOURCE_MIX_META: Record<
  SubCriterionEngineOutput["source_mix"],
  { label: string; cls: string; description: string }
> = {
  insufficient: {
    label: "Insufficient evidence",
    cls: "bg-slate-100 text-slate-700 ring-slate-200",
    description: "No intake or artifact evidence for this sub-criterion.",
  },
  intake_only: {
    label: "Intake only",
    cls: "bg-amber-50 text-amber-800 ring-amber-200",
    description:
      "Score derived from intake responses only. Bounded to [1.5, 3.5]; LOW confidence.",
  },
  artifact_only: {
    label: "Artifact only",
    cls: "bg-sky-50 text-sky-800 ring-sky-200",
    description: "Score derived from artifact evidence only (no intake signal).",
  },
  artifact_supported: {
    label: "Artifact supported",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    description: "Intake responses are validated by artifact evidence.",
  },
  contradictory: {
    label: "Contradictory",
    cls: "bg-rose-50 text-rose-800 ring-rose-200",
    description: "Artifact evidence contradicts intake — artifact takes priority.",
  },
};

const CONFIDENCE_META: Record<
  SubCriterionEngineOutput["confidence"],
  { label: string; cls: string }
> = {
  LOW: { label: "Conf: LOW", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  MEDIUM: {
    label: "Conf: MEDIUM",
    cls: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  },
  HIGH: {
    label: "Conf: HIGH",
    cls: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  },
};

function EngineSourceBadges({ meta }: { meta: SubCriterionEngineOutput }) {
  const src = SOURCE_MIX_META[meta.source_mix];
  const conf = CONFIDENCE_META[meta.confidence];
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={src.description}>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${src.cls}`}
      >
        {src.label}
      </span>
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${conf.cls}`}
      >
        {conf.label}
      </span>
      {meta.contradiction_flag && (
        <span
          className="inline-flex items-center rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white"
          title="Artifact evidence directly contradicts intake claim."
        >
          ⚠ Contradiction
        </span>
      )}
      {meta.evidence_references.length > 0 && (
        <span
          className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
          title={meta.evidence_references.join(", ")}
        >
          {meta.evidence_references.length} evidence ref(s)
        </span>
      )}
      <span className="text-[11px] font-medium text-slate-500">
        Engine: {meta.score.toFixed(1)}
      </span>
    </div>
  );
}

function SubCriterionInput({
  dimension,
  subKey,
  name,
  description,
  scoreBands,
  initialScore,
  initialRationale,
  onSave,
  onScoreChange,
  contextSignals = [],
  engineMetadata,
}: {
  dimension: string;
  subKey: string;
  name: string;
  description: string;
  scoreBands?: ScoreBand[];
  initialScore: number;
  initialRationale: string;
  onSave: (
    dimension: string,
    sub_criterion: string,
    score: number,
    rationale: string,
  ) => Promise<void>;
  onScoreChange: (
    dimension: string,
    sub_criterion: string,
    score: number,
  ) => void;
  contextSignals?: ContextSignal[];
  engineMetadata?: SubCriterionEngineOutput;
}) {
  const [score, setScore] = useState(initialScore);
  const [rationale, setRationale] = useState(initialRationale);
  const activeBand = getActiveBand(scoreBands, score);

  // Build a contextual placeholder that tells the operator exactly
  // what evidence or concern is influencing THIS criterion, instead
  // of the generic "Operator rationale (minimum 2 sentences)…"
  const relevantSignals = contextSignals.filter(
    (s) => s.dimension === dimension,
  );
  const placeholder = relevantSignals.length > 0
    ? `Context: ${relevantSignals.map((s) => s.reason).join("; ")}. — Explain whether you agree and cite the relevant evidence.`
    : activeBand
      ? `Score ${score.toFixed(1)} → "${activeBand.label}": ${activeBand.description} — Cite the evidence that justifies this level.`
      : "Operator rationale (minimum 2 sentences)…";

  const bandColor =
    score <= 1
      ? "text-rose-700 bg-rose-50 border-rose-200"
      : score <= 2
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : score <= 3
      ? "text-yellow-700 bg-yellow-50 border-yellow-200"
      : score <= 4
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-indigo-700 bg-indigo-50 border-indigo-200";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-semibold text-gray-900">{name}</p>
        <p className="mt-0.5 text-sm text-gray-600">{description}</p>
      </div>
      {engineMetadata && (
        <EngineSourceBadges meta={engineMetadata} />
      )}
      <div className="flex items-center gap-4">
        <input
          type="range"
          min="0"
          max="5"
          step="0.5"
          value={score}
          onChange={(e) => {
            const next = parseFloat(e.target.value);
            setScore(next);
            onScoreChange(dimension, subKey, next);
          }}
          onMouseUp={() => {
            onSave(dimension, subKey, score, rationale);
          }}
          onKeyUp={() => {
            onSave(dimension, subKey, score, rationale);
          }}
          onTouchEnd={() => {
            onSave(dimension, subKey, score, rationale);
          }}
          className="flex-1"
        />
        <span className="w-12 text-center text-lg font-bold text-gray-900 tabular-nums">
          {score.toFixed(1)}
        </span>
      </div>
      {activeBand && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition-all ${bandColor}`}
        >
          <span className="shrink-0 font-bold">{activeBand.label}</span>
          <span className="text-sm leading-snug opacity-90">
            {activeBand.description}
          </span>
        </div>
      )}
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        onBlur={() => {
          if (rationale.length >= 20) {
            onSave(dimension, subKey, score, rationale);
          }
        }}
        placeholder={placeholder}
        rows={5}
        className="block min-h-[140px] w-full resize-y rounded-md border border-gray-300 px-3 py-2.5 text-sm leading-relaxed shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {rationale.length > 0 && rationale.length < 20 && (
        <p className="text-sm text-red-500">
          Rationale must be at least 20 characters
        </p>
      )}
    </div>
  );
}

interface GuidancePayload {
  meaning: string;
  must_be_true: string[];
  to_reach_next_level: { delta: string; gaps: string[] };
  overrated_if: string[];
  suggested_evidence_to_request: string[];
}

function ScoringCopilot({
  dimension,
  subCriterion,
  score,
  rationale,
}: {
  dimension: string;
  subCriterion: string;
  score: number;
  rationale: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<GuidancePayload | null>(null);
  const [scoredFor, setScoredFor] = useState<number | null>(null);

  const stale = guidance !== null && scoredFor !== null && scoredFor !== score;

  const fetchGuidance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scores/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimension,
          sub_criterion: subCriterion,
          score,
          operator_rationale: rationale,
        }),
      });
      const json = (await res.json()) as
        | { guidance: GuidancePayload }
        | { error: string };
      if (!res.ok || !("guidance" in json)) {
        const message = "error" in json ? json.error : `Request failed (${res.status})`;
        throw new Error(message);
      }
      setGuidance(json.guidance);
      setScoredFor(score);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guidance");
    } finally {
      setLoading(false);
    }
  }, [dimension, subCriterion, score, rationale]);

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (guidance && !stale) {
              setOpen((prev) => !prev);
            } else {
              void fetchGuidance();
            }
          }}
          disabled={loading}
          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Asking copilot…"
            : guidance && !stale
              ? open
                ? "Hide scoring copilot"
                : "Show scoring copilot"
              : `Ask scoring copilot (score ${score.toFixed(1)})`}
        </button>
        {stale && (
          <span className="text-[11px] text-amber-600">
            Score changed — refresh guidance
          </span>
        )}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>

      {open && guidance && (
        <div className="mt-2 space-y-3 rounded-md border border-indigo-200 bg-indigo-50/60 p-3 text-xs text-gray-800">
          <CopilotSection title={`What ${scoredFor?.toFixed(1) ?? score.toFixed(1)} means here`}>
            <p>{guidance.meaning}</p>
          </CopilotSection>
          <CopilotList title="What must be true to justify it" items={guidance.must_be_true} />
          <CopilotList
            title={`To reach next level (${guidance.to_reach_next_level.delta})`}
            items={guidance.to_reach_next_level.gaps}
          />
          <CopilotList
            title="Why this might be overrated"
            items={guidance.overrated_if}
            tone="warn"
          />
          <CopilotList
            title="Evidence to request from the target"
            items={guidance.suggested_evidence_to_request}
          />
        </div>
      )}
    </div>
  );
}

function CopilotSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-900">
        {title}
      </p>
      <div className="mt-1 text-xs leading-relaxed text-gray-800">{children}</div>
    </div>
  );
}

function CopilotList({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "warn";
}) {
  if (!items || items.length === 0) return null;
  const titleClass =
    tone === "warn"
      ? "text-amber-800"
      : "text-indigo-900";
  return (
    <div>
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${titleClass}`}
      >
        {title}
      </p>
      <ul className="mt-1 space-y-1 text-xs leading-relaxed text-gray-800">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className="text-gray-400">
              •
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: DecisionResult }) {
  const toneClasses: Record<DecisionResult["tone"], string> = {
    go: "border-emerald-300 bg-emerald-50 text-emerald-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    stop: "border-rose-300 bg-rose-50 text-rose-900",
  };
  const toneDot: Record<DecisionResult["tone"], string> = {
    go: "bg-emerald-500",
    warn: "bg-amber-500",
    stop: "bg-rose-500",
  };
  const phaseLabel: Record<DecisionResult["phase"], string> = {
    pre_investment: "Pre-investment",
    active: "Active engagement",
    post_close: "Post-close",
  };

  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${toneClasses[decision.tone]}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${toneDot[decision.tone]}`}
          aria-hidden
        />
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-70">
          {phaseLabel[decision.phase]} decision
        </span>
      </div>
      <p className="mt-1 text-lg font-bold">{decision.label}</p>
      <p className="mt-2 text-base leading-relaxed">{decision.summary}</p>
      <details className="mt-3">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">
          How this score was calculated
        </summary>
        <DecisionLogicExplainer decision={decision} />
      </details>
    </div>
  );
}

/**
 * Walks the operator through the math behind a decision: the composite
 * breakdown, the rule that fires for the current lifecycle phase, the
 * blocking dimensions and their actual scores, and any red-flag count.
 * Pure presentation — all numbers come from the DecisionResult, no
 * additional calculation here.
 */
function DecisionLogicExplainer({ decision }: { decision: DecisionResult }) {
  const composite = decision.composite_score;
  const operator = decision.operator_composite;
  const ctxDelta = decision.context_composite_delta;
  const trendDelta = decision.composite_delta;

  return (
    <div className="mt-3 space-y-4 rounded-lg bg-white/40 p-4 text-xs leading-relaxed">
      {/* ── 1. Composite breakdown ─────────────────────────── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          Composite score
        </p>
        <p className="mt-1">
          <span className="font-semibold">{composite.toFixed(1)} / 5.0</span> — the
          weighted average across all six diligence dimensions (Product
          Credibility, Tooling &amp; Vendor Exposure, Data Risk, Governance
          &amp; Safety, Production Readiness, Open Validation).
        </p>
        {ctxDelta !== null && ctxDelta !== 0 && (
          <p className="mt-1 opacity-90">
            Operator score was{" "}
            <span className="font-semibold tabular-nums">
              {operator.toFixed(1)}
            </span>
            ; context signals from intake, coverage, insights, and
            pre-analysis adjusted it by{" "}
            <span className="font-semibold tabular-nums">
              {ctxDelta >= 0 ? "+" : ""}
              {ctxDelta.toFixed(2)}
            </span>{" "}
            to land on {composite.toFixed(1)}.
          </p>
        )}
        {trendDelta !== null && (
          <p className="mt-1 opacity-90">
            Versus the prior scorecard:{" "}
            <span className="font-semibold tabular-nums">
              {trendDelta >= 0 ? "+" : ""}
              {trendDelta.toFixed(1)}
            </span>{" "}
            ({trendDelta > 0
              ? "improving"
              : trendDelta < 0
                ? "declining"
                : "flat"}
            ).
          </p>
        )}
      </section>

      {/* ── 2. Decision rule for this lifecycle phase ─────── */}
      <section>
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
          Decision rule ·{" "}
          {decision.phase === "pre_investment"
            ? "pre-investment"
            : decision.phase === "active"
              ? "active engagement"
              : "post-close"}
        </p>
        {decision.phase === "pre_investment" && (
          <ul className="mt-1 space-y-0.5">
            <li>
              <span className="font-semibold">Invest</span> — composite ≥ 3.5
              with no blocking dimensions and no critical red flags.
            </li>
            <li>
              <span className="font-semibold">Invest with conditions</span> —
              composite between 2.5 and 3.5, or above 3.5 with blockers.
            </li>
            <li>
              <span className="font-semibold">Do not invest</span> — composite
              below 2.5, or 2+ critical red flags from pre-analysis.
            </li>
          </ul>
        )}
        {decision.phase === "active" && (
          <ul className="mt-1 space-y-0.5">
            <li>
              <span className="font-semibold">Continue</span> — trend ≥ +0.3
              with no critical red flags.
            </li>
            <li>
              <span className="font-semibold">Stall</span> — trend within
              ±0.3.
            </li>
            <li>
              <span className="font-semibold">Stall &amp; re-diligence</span> —
              trend ≤ −0.3, or 2+ critical red flags.
            </li>
          </ul>
        )}
        {decision.phase === "post_close" && (
          <ul className="mt-1 space-y-0.5">
            <li>
              <span className="font-semibold">Double-down</span> — Production
              Readiness ≥ 3.5 and Governance &amp; Safety ≥ 3.0, no critical
              red flags.
            </li>
            <li>
              <span className="font-semibold">Hold</span> — between thresholds.
            </li>
            <li>
              <span className="font-semibold">Wind-down</span> — Production
              Readiness &lt; 2.5, or 2+ critical red flags.
            </li>
          </ul>
        )}
        <p className="mt-2">
          → Result: <span className="font-semibold">{decision.label}</span>.
        </p>
      </section>

      {/* ── 3. Blocking dimensions ─────────────────────────── */}
      {decision.blocking_dimensions.length > 0 && (
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            Blocking dimensions · any score below 2.0
          </p>
          <p className="mt-1 opacity-90">
            A single dimension below 2.0 prevents a clean &ldquo;Invest&rdquo;
            even when the composite is otherwise strong.
          </p>
          <ul className="mt-2 space-y-1">
            {decision.blocking_dimensions.map((d) => {
              const score = decision.dimension_scores[d];
              return (
                <li key={d} className="flex items-baseline justify-between gap-3">
                  <span>{DIMENSION_SHORT_LABEL[d]}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {typeof score === "number" ? score.toFixed(1) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── 4. Critical red flags ──────────────────────────── */}
      {decision.critical_red_flag_count > 0 && (
        <section>
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">
            Critical red flags from pre-analysis
          </p>
          <p className="mt-1">
            {decision.critical_red_flag_count} unresolved{" "}
            {decision.critical_red_flag_count === 1 ? "issue" : "issues"} that
            cannot be resolved through deal terms alone. Two or more force a
            &ldquo;Do not invest&rdquo; / &ldquo;Stall &amp; re-diligence&rdquo;
            decision regardless of composite.
          </p>
        </section>
      )}
    </div>
  );
}

function ContextAdjustmentPanel({ signals }: { signals: ContextSignal[] }) {
  const grouped = signals.reduce<Record<string, ContextSignal[]>>(
    (acc, s) => {
      (acc[s.source] ??= []).push(s);
      return acc;
    },
    {},
  );
  const sources = Object.keys(grouped) as (keyof typeof KNOWLEDGE_STEP_LABELS)[];

  // Collapsed by default + subtle slate styling so the panel reads as a
  // reference, not a wall of red numbers competing with the actual
  // editable scoring sections below.
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-3 text-slate-600 hover:text-slate-900">
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Context signals feeding the score
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
            {signals.length}
          </span>
          <span className="text-[10px] text-slate-400 group-open:hidden">
            show
          </span>
          <span className="hidden text-[10px] text-slate-400 group-open:inline">
            hide
          </span>
        </span>
      </summary>
      <p className="mt-3 text-[11px] text-slate-500">
        Submissions from earlier steps nudge each dimension. Caps prevent any
        single step from overriding operator judgment.
      </p>
      <div className="mt-3 space-y-3">
        {sources.map((src) => (
          <div key={src}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              From {KNOWLEDGE_STEP_LABELS[src]}
            </p>
            <ul className="mt-1 space-y-1">
              {grouped[src].map((s, i) => (
                <li
                  key={`${src}-${i}`}
                  className="flex items-start justify-between gap-3 text-[11px] text-slate-700"
                >
                  <span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {s.dimension}
                    </span>{" "}
                    — {s.reason}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-[11px] tabular-nums ${
                      s.delta < 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {s.delta > 0 ? "+" : ""}
                    {s.delta.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
