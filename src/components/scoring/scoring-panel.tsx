"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

  return (
    <div className="space-y-6">
      {/* Composite score header — bare on the page background, mirroring
          the Stitch "Evidence Gathering Dashboard" layout. The previous
          card chrome was removed so the composite sits flush above the
          decision badge and the per-dimension card grid. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
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
          {scoringStale && onForceResync && (
            <GenerateButton type="button" onClick={onForceResync} size="sm">
              Re-generate scores
            </GenerateButton>
          )}
        </div>
      </div>

      <DecisionBadge decision={decision} />

      {/* Dimension scores — 3-column card grid (Stitch design).
          Each card shows the dimension name, the (context-adjusted) score,
          its delta vs the operator score, and a fill bar to 5.0. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {composite.dimension_details.map((dim) => {
          const delta = contextAdjustment.dimension_delta[dim.dimension] ?? 0;
          const adjusted = Math.max(0, Math.min(5, dim.average_score + delta));
          return (
            <div
              key={dim.dimension}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p
                className="truncate text-sm font-medium text-slate-700"
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
            </div>
          );
        })}
      </div>

      {contextSignals.length > 0 && (
        <ContextAdjustmentPanel signals={contextSignals} />
      )}

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

      {/* Dimension scoring sections */}
      {SCORING_DIMENSIONS.map((dim) => (
        <div key={dim.key} className="rounded-lg border bg-white shadow-sm">
          <button
            onClick={() =>
              setExpandedDimension(
                expandedDimension === dim.key ? null : dim.key,
              )
            }
            className="flex w-full items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900">
                {dim.name}
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                Weight: {(dim.weight * 100).toFixed(0)}%
              </span>
            </div>
            <span className="text-sm text-gray-400">
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
    </div>
  );
}

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
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-900">{name}</p>
        <p className="text-xs text-gray-500">{description}</p>
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
        <span className="w-10 text-center text-sm font-bold text-gray-900">
          {score.toFixed(1)}
        </span>
      </div>
      {activeBand && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs transition-all ${bandColor}`}
        >
          <span className="shrink-0 font-bold">{activeBand.label}</span>
          <span className="text-[11px] leading-snug opacity-90">
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
        rows={2}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
      />
      {rationale.length > 0 && rationale.length < 20 && (
        <p className="text-xs text-red-500">
          Rationale must be at least 20 characters
        </p>
      )}
      <ScoringCopilot
        dimension={dimension}
        subCriterion={subKey}
        score={score}
        rationale={rationale}
      />
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
      <details className="mt-3 text-xs opacity-80">
        <summary className="cursor-pointer select-none font-semibold uppercase tracking-wider opacity-70 hover:opacity-100">
          Score details
        </summary>
        <ul className="mt-2 space-y-0.5">
          {decision.rationale.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </details>
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

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold text-indigo-900">
          Context signals feeding the score
        </p>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">
          {signals.length} signal{signals.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2 text-sm text-indigo-800/80">
        Submissions from earlier steps adjust each dimension. Caps prevent any
        single step from overriding operator judgment.
      </p>
      <div className="mt-5 space-y-5">
        {sources.map((src) => (
          <div key={src}>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-800">
              From {KNOWLEDGE_STEP_LABELS[src]}
            </p>
            <ul className="mt-2 space-y-2">
              {grouped[src].map((s, i) => (
                <li
                  key={`${src}-${i}`}
                  className="flex items-start justify-between gap-3 text-base text-gray-800"
                >
                  <span>
                    <span className="font-mono text-sm text-gray-500">
                      {s.dimension}
                    </span>{" "}
                    — {s.reason}
                  </span>
                  <span
                    className={`shrink-0 text-base font-semibold tabular-nums ${
                      s.delta < 0 ? "text-rose-700" : "text-emerald-700"
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
    </div>
  );
}
