import { SCORING_DIMENSIONS } from "@/lib/constants";
import {
  DIMENSION_MAX_ABS_DELTA,
  applyApprovedAdjustments,
  groupApprovedBySub,
  subKey,
} from "@/lib/scoring/adjustments";
import type {
  AdjustmentProposal,
  DealStage,
  EngagementStatus,
  PreAnalysis,
  Score,
  ScoreDimension,
} from "@/lib/types";

export interface CompositeResult {
  composite_score: number;
  dimension_scores: Record<ScoreDimension, number>;
  dimension_details: {
    dimension: ScoreDimension;
    name: string;
    weight: number;
    average_score: number;
    sub_scores: { sub_criterion: string; score: number }[];
  }[];
}

/**
 * Neutral default for a dimension that has no scored sub-criteria.
 * Treating "no evidence" as 0 makes the composite drop sharply when an
 * intake field is removed (because removing a signal sends a sub-
 * criterion from intake-floored 1.5 back to 0). That's misleading —
 * "no evidence" should be neutral / unknown, not the worst possible
 * score. The baseline matches the engine's BASELINE constant so the
 * semantics line up across the pipeline.
 */
const DIMENSION_NEUTRAL_DEFAULT = 2.5;

export function calculateCompositeScore(scores: Score[]): CompositeResult {
  const dimensionDetails = SCORING_DIMENSIONS.map((dim) => {
    // Only consider sub-criteria that actually have evidence. The engine
    // emits Score entries with score_0_to_5 = 0 when a sub-criterion has
    // neither intake nor artifact support; those entries should NOT
    // pull the dimension average down because they carry zero
    // information. Filtering them out makes intake edits visible: when
    // a signal is added or removed, the count of contributing
    // sub-criteria changes, and the average shifts accordingly.
    const dimScoresAll = scores.filter((s) => s.dimension === dim.key);
    const dimScores = dimScoresAll.filter((s) => s.score_0_to_5 > 0);
    const average =
      dimScores.length > 0
        ? dimScores.reduce((sum, s) => sum + s.score_0_to_5, 0) / dimScores.length
        : DIMENSION_NEUTRAL_DEFAULT;

    return {
      dimension: dim.key,
      name: dim.name,
      weight: dim.weight,
      average_score: Math.round(average * 10) / 10,
      // Surface every sub-criterion (scored or insufficient) so the
      // operator can see what's missing in the per-dimension drill-down.
      sub_scores: dimScoresAll.map((s) => ({
        sub_criterion: s.sub_criterion,
        score: s.score_0_to_5,
      })),
    };
  });

  const dimension_scores = Object.fromEntries(
    dimensionDetails.map((d) => [d.dimension, d.average_score]),
  ) as Record<ScoreDimension, number>;

  const composite_score =
    Math.round(
      dimensionDetails.reduce((sum, d) => sum + d.average_score * d.weight, 0) * 10,
    ) / 10;

  return {
    composite_score,
    dimension_scores,
    dimension_details: dimensionDetails,
  };
}

export function isFullyScored(scores: Score[]): boolean {
  return SCORING_DIMENSIONS.every((dim) =>
    dim.sub_criteria.every((sub) =>
      scores.some(
        (s) =>
          s.dimension === dim.key &&
          s.sub_criterion === sub.key &&
          s.operator_rationale.length >= 20,
      ),
    ),
  );
}

/* ============================================================
 * Final score = base + approved adjustments (server-authoritative)
 * ============================================================
 * Deterministic. Reads only operator-set base scores and approved
 * AdjustmentProposal rows. Confidence is reported alongside but
 * NEVER folded into the composite.
 */

export interface FinalCompositeResult extends CompositeResult {
  base_composite: number;
  adjustment_composite_delta: number;
  per_dimension_adjustment: Record<ScoreDimension, number>;
  /** 0..1, separate axis. Does not modify the score. */
  evidence_confidence: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calculateFinalScore(
  baseScores: Score[],
  approvedAdjustments: AdjustmentProposal[],
  evidenceConfidence: number = 0,
): FinalCompositeResult {
  const base = calculateCompositeScore(baseScores);
  const bySub = groupApprovedBySub(approvedAdjustments);

  const dimensionDetails = SCORING_DIMENSIONS.map((dim) => {
    const subs = baseScores.filter((s) => s.dimension === dim.key);
    const adjustedSubs = subs.map((s) => {
      const props = bySub.get(subKey(dim.key, s.sub_criterion)) ?? [];
      const finalSub = applyApprovedAdjustments(
        s.score_0_to_5,
        props,
        DIMENSION_MAX_ABS_DELTA,
      );
      return { sub_criterion: s.sub_criterion, score: round1(finalSub) };
    });

    const average =
      adjustedSubs.length > 0
        ? adjustedSubs.reduce((sum, s) => sum + s.score, 0) /
          adjustedSubs.length
        : 0;

    return {
      dimension: dim.key,
      name: dim.name,
      weight: dim.weight,
      average_score: round1(average),
      sub_scores: adjustedSubs,
    };
  });

  const dimension_scores = Object.fromEntries(
    dimensionDetails.map((d) => [d.dimension, d.average_score]),
  ) as Record<ScoreDimension, number>;

  const composite_score = round1(
    dimensionDetails.reduce((sum, d) => sum + d.average_score * d.weight, 0),
  );

  const per_dimension_adjustment = Object.fromEntries(
    dimensionDetails.map((d) => [
      d.dimension,
      round1(d.average_score - (base.dimension_scores[d.dimension] ?? 0)),
    ]),
  ) as Record<ScoreDimension, number>;

  return {
    composite_score,
    base_composite: base.composite_score,
    adjustment_composite_delta: round1(composite_score - base.composite_score),
    per_dimension_adjustment,
    dimension_scores,
    dimension_details: dimensionDetails,
    evidence_confidence: Math.max(0, Math.min(1, evidenceConfidence)),
  };
}

/* ============================================================
 * Lifecycle-aware decision engine
 * ============================================================
 * Maps (composite, dimension scores, red flags, lifecycle stage) to a
 * concrete capital-allocation decision. The scoring engine still
 * produces the underlying evidence; `deriveDecision` turns that into
 * an operator-facing recommendation that respects where the asset is
 * in its AI lifecycle.
 */

export type LifecyclePhase = "pre_investment" | "active" | "post_close";

export type Decision =
  | "invest"
  | "invest_with_conditions"
  | "do_not_invest"
  | "continue"
  | "stall"
  | "stall_and_rediligence"
  | "double_down"
  | "hold"
  | "wind_down";

export interface DecisionResult {
  phase: LifecyclePhase;
  decision: Decision;
  label: string;
  tone: "go" | "warn" | "stop";
  rationale: string[];
  /**
   * Plain-language narrative (1–2 sentences) explaining why the decision
   * landed where it did. Generated deterministically from the same
   * inputs as `rationale` so re-renders never show a different summary
   * for the same scores.
   */
  summary: string;
  /** Final context-adjusted composite, on the 0..5 scale. */
  composite_score: number;
  /** Raw operator composite before any context adjustment. */
  operator_composite: number;
  /** Δ added to the operator composite by knowledge-base context, or null if none. */
  context_composite_delta: number | null;
  /** Final context-adjusted dimension scores keyed by dimension id. */
  dimension_scores: Record<ScoreDimension, number>;
  blocking_dimensions: ScoreDimension[];
  critical_red_flag_count: number;
  /** Δ between this composite and the prior scorecard (trend), or null. */
  composite_delta: number | null;
}

// Investor-facing translations of each scoring dimension. The dimension
// IDs (`data_sensitivity`, `production_readiness`, etc.) and the short
// labels in `DIMENSION_SHORT_LABEL` are correct but read like an
// engineering rubric. The narrative summary uses these phrases instead
// so an IC reader who has never seen the rubric still understands what
// the concern is.
const DIMENSION_INVESTOR_CONCERN: Record<ScoreDimension, string> = {
  product_credibility: "the actual product capability behind the pitch",
  tooling_exposure: "third-party vendor and tooling dependencies",
  data_sensitivity: "data handling and regulatory exposure",
  governance_safety: "governance practices and safety posture",
  production_readiness: "operational maturity to run in production",
  open_validation: "outstanding evidence and validation work",
};

function joinList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const DECISION_LABELS: Record<Decision, { label: string; tone: "go" | "warn" | "stop" }> = {
  invest: { label: "Invest", tone: "go" },
  invest_with_conditions: { label: "Invest with conditions", tone: "warn" },
  do_not_invest: { label: "Do not invest", tone: "stop" },
  continue: { label: "Continue", tone: "go" },
  stall: { label: "Stall", tone: "warn" },
  stall_and_rediligence: { label: "Stall & re-diligence", tone: "stop" },
  double_down: { label: "Double-down", tone: "go" },
  hold: { label: "Hold", tone: "warn" },
  wind_down: { label: "Wind-down plan", tone: "stop" },
};

/**
 * Thresholds are intentionally conservative and sit on the composite
 * (0-5) scale. Any change here should be paired with a test update in
 * tests/unit/scoring/calculator.test.ts.
 */
const THRESHOLDS = {
  invest_floor: 3.5,
  do_not_invest_ceiling: 2.5,
  critical_dimension_floor: 2.0, // a single dim below this blocks a green decision
  trend_delta: 0.3, // +/- considered a meaningful move between scorecards
  production_ready_floor: 3.5,
  production_hold_floor: 2.5,
  governance_floor: 3.0,
} as const;

export function lifecyclePhaseFor(
  dealStage: DealStage,
  _status: EngagementStatus,
  priorComposite: number | null | undefined,
): LifecyclePhase {
  if (dealStage === "post_close") return "post_close";
  // An engagement is "active" (trend-based) once we have a prior
  // scorecard to compare against. Before that, even during live
  // diligence, the decision is pre-investment because there is no
  // trend signal yet.
  if (typeof priorComposite === "number") return "active";
  return "pre_investment";
}

function countCriticalRedFlags(analyses: PreAnalysis[] = []): number {
  return analyses.reduce(
    (sum, a) => sum + a.red_flags.filter((f) => f.severity === "critical").length,
    0,
  );
}

function blockingDimensions(
  dimensionScores: Record<ScoreDimension, number>,
): ScoreDimension[] {
  return (Object.entries(dimensionScores) as [ScoreDimension, number][])
    .filter(([, v]) => v > 0 && v < THRESHOLDS.critical_dimension_floor)
    .map(([k]) => k);
}

export interface DeriveDecisionInput {
  dealStage: DealStage;
  status: EngagementStatus;
  scores: Score[];
  analyses?: PreAnalysis[];
  /** Composite from the prior scorecard, if a previous one exists. */
  priorComposite?: number | null;
  /**
   * Optional pre-computed context adjustment from the knowledge base
   * (intake, coverage, insights, pre-analysis submissions). When
   * provided, the decision engine operates on the context-aware
   * composite and dimension scores instead of the raw ones.
   */
  contextAdjustment?: {
    composite_delta: number;
    dimension_delta: Record<ScoreDimension, number>;
  } | null;
}

export function deriveDecision(input: DeriveDecisionInput): DecisionResult {
  const phase = lifecyclePhaseFor(
    input.dealStage,
    input.status,
    input.priorComposite,
  );
  const baseComposite = calculateCompositeScore(input.scores);
  const adj = input.contextAdjustment;

  // Apply context adjustment (clamped 0..5 per dimension) if provided.
  const adjusted_dimension_scores: Record<ScoreDimension, number> = adj
    ? (Object.fromEntries(
        (Object.entries(baseComposite.dimension_scores) as [ScoreDimension, number][]).map(
          ([k, v]) => [
            k,
            Math.round(
              Math.max(0, Math.min(5, v + (adj.dimension_delta[k] ?? 0))) * 10,
            ) / 10,
          ],
        ),
      ) as Record<ScoreDimension, number>)
    : baseComposite.dimension_scores;

  const composite_score = adj
    ? Math.round(
        Math.max(0, Math.min(5, baseComposite.composite_score + adj.composite_delta)) *
          10,
      ) / 10
    : baseComposite.composite_score;

  const composite = {
    composite_score,
    dimension_scores: adjusted_dimension_scores,
  };

  const blocking = blockingDimensions(composite.dimension_scores);
  const criticals = countCriticalRedFlags(input.analyses);
  const prior =
    typeof input.priorComposite === "number" ? input.priorComposite : null;
  const delta =
    prior === null ? null : Math.round((composite.composite_score - prior) * 10) / 10;

  const rationale: string[] = [];
  rationale.push(
    `Composite ${composite.composite_score.toFixed(1)}/5.0` +
      (adj && adj.composite_delta !== 0
        ? ` (context Δ ${adj.composite_delta >= 0 ? "+" : ""}${adj.composite_delta.toFixed(2)})`
        : "") +
      (delta !== null ? ` (Δ ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} vs. prior)` : ""),
  );
  if (criticals > 0) rationale.push(`${criticals} critical red flag(s)`);
  if (blocking.length > 0) {
    rationale.push(
      `Blocking dimension(s) below ${THRESHOLDS.critical_dimension_floor}: ${blocking.join(", ")}`,
    );
  }

  let decision: Decision;

  if (phase === "pre_investment") {
    if (
      composite.composite_score >= THRESHOLDS.invest_floor &&
      criticals === 0 &&
      blocking.length === 0
    ) {
      decision = "invest";
    } else if (
      composite.composite_score < THRESHOLDS.do_not_invest_ceiling ||
      criticals >= 2
    ) {
      decision = "do_not_invest";
    } else {
      decision = "invest_with_conditions";
    }
  } else if (phase === "active") {
    // delta is guaranteed non-null here because `priorComposite`
    // is what switched us into the active phase.
    const d = delta ?? 0;
    if (d <= -THRESHOLDS.trend_delta || criticals >= 2) {
      decision = "stall_and_rediligence";
    } else if (d >= THRESHOLDS.trend_delta && criticals === 0) {
      decision = "continue";
    } else {
      decision = "stall";
    }
  } else {
    // post_close
    const prod = composite.dimension_scores.production_readiness ?? 0;
    const gov = composite.dimension_scores.governance_safety ?? 0;
    if (
      prod >= THRESHOLDS.production_ready_floor &&
      gov >= THRESHOLDS.governance_floor &&
      criticals === 0
    ) {
      decision = "double_down";
    } else if (prod < THRESHOLDS.production_hold_floor || criticals >= 2) {
      decision = "wind_down";
    } else {
      decision = "hold";
    }
  }

  const meta = DECISION_LABELS[decision];
  const summary = buildDecisionSummary({
    decision,
    phase,
    composite: composite.composite_score,
    blocking,
    criticals,
    delta,
  });
  return {
    phase,
    decision,
    label: meta.label,
    tone: meta.tone,
    rationale,
    summary,
    composite_score: composite.composite_score,
    operator_composite: baseComposite.composite_score,
    context_composite_delta: adj ? adj.composite_delta : null,
    dimension_scores: composite.dimension_scores,
    blocking_dimensions: blocking,
    critical_red_flag_count: criticals,
    composite_delta: delta,
  };
}

/**
 * Static lookup table mapping every composite score from 0.0 to 5.0
 * (in 0.1 steps) to a single hand-written sentence describing the
 * conviction level at that exact score. Phase-agnostic: the action
 * verb (Pass / Term sheet / Continue / Wind-down) lives in the
 * decision label that renders above the summary, so this table can
 * focus purely on strength of case.
 *
 * The table is the source of truth for the narrative — re-renders with
 * the same composite return the same sentence, byte-for-byte.
 */
const COMPOSITE_NARRATIVE: Record<string, string> = {
  "0.0": "There is effectively no defensible investment case at this level.",
  "0.1": "The fundamentals are absent — there is no path forward as it stands.",
  "0.2": "The evidence base is too thin to support any investment thesis.",
  "0.3": "Foundational gaps make the opportunity uninvestable in current form.",
  "0.4": "Multiple foundational issues prevent the asset from being underwritten.",
  "0.5": "Severe weakness across nearly every diligence area.",
  "0.6": "Severe weakness; a substantial rebuild would be required before reconsideration.",
  "0.7": "Deep concerns across operations, governance, and product credibility.",
  "0.8": "Deep concerns; the risk-return profile is indefensible to committee.",
  "0.9": "Materially below our underwriting threshold across multiple core areas.",
  "1.0": "Well below underwriting threshold with multiple foundational issues.",
  "1.1": "Conviction is materially weak — the case for this opportunity does not hold.",
  "1.2": "Conviction is weak; the thesis cannot survive committee scrutiny.",
  "1.3": "Significant weakness; specific gaps make this uninvestable today.",
  "1.4": "Significant weakness across the diligence rubric.",
  "1.5": "Several material concerns remain unresolved.",
  "1.6": "Multiple weak areas; the issues are too foundational to resolve through deal terms.",
  "1.7": "Multiple weak areas; substantial remediation would be required to reconsider.",
  "1.8": "Several concerns above the absolute floor but not enough to greenlight.",
  "1.9": "Below the underwriting bar; the thesis is not yet defensible.",
  "2.0": "Below the underwriting bar; concerns are above the critical floor but the case is not yet sound.",
  "2.1": "Just below the underwriting bar; the opportunity has potential but is not ready.",
  "2.2": "Just below the bar; concerns must be resolved before reconsideration.",
  "2.3": "Marginally below the bar; improvable but not yet investable.",
  "2.4": "Marginally below the bar; the thesis has merit but unresolved concerns remain.",
  "2.5": "Right at the underwriting bar; conditional approval only.",
  "2.6": "At the bar with conditions; the thesis is approachable subject to remediation.",
  "2.7": "Marginally above the bar; underwritable with conditions.",
  "2.8": "Just above the bar; conditional approval pending remediation.",
  "2.9": "Just above the bar; the case holds with conditions.",
  "3.0": "Acceptable with conditions; the thesis is sound.",
  "3.1": "Acceptable with conditions; fundamentals support proceeding subject to remediation.",
  "3.2": "Solid base case with conditions; open gaps need to be addressed.",
  "3.3": "Solid base case; conditions are addressable in confirmatory diligence.",
  "3.4": "Approaching pass-grade; remaining conditions are minor and tractable.",
  "3.5": "Above the underwriting bar; ready to proceed with light conditions.",
  "3.6": "Above the bar; conditions are limited and addressable in confirmatory DD.",
  "3.7": "Comfortable pass on the underwriting case.",
  "3.8": "Comfortable pass; risks are well-understood and manageable.",
  "3.9": "Strong base case across the rubric.",
  "4.0": "Strong investment thesis; risks are well-managed with a clear path to value creation.",
  "4.1": "Strong investment thesis with no material conditions remaining.",
  "4.2": "Strong conviction; the opportunity is meaningfully above our threshold.",
  "4.3": "Strong conviction; diligence fully supports proceeding.",
  "4.4": "High conviction; no material conditions remaining.",
  "4.5": "High conviction; team and execution capability are well-evidenced.",
  "4.6": "High conviction; warrants lead consideration if structure allows.",
  "4.7": "Very high conviction; warrants lead position if portfolio allocation allows.",
  "4.8": "Very high conviction; the opportunity warrants priority allocation.",
  "4.9": "Highest conviction; outstanding evidence across nearly every diligence area.",
  "5.0": "Highest conviction; outstanding evidence across every diligence area.",
};

function lookupCompositeNarrative(composite: number): string {
  // Clamp to [0, 5] and round to one decimal so the score always lands
  // on a key that exists in the table.
  const clamped = Math.max(0, Math.min(5, composite));
  const key = (Math.round(clamped * 10) / 10).toFixed(1);
  return COMPOSITE_NARRATIVE[key] ?? COMPOSITE_NARRATIVE["2.5"];
}

/**
 * Compose the final summary sentence(s) shown on the decision badge:
 *   1. The static narrative for the composite score.
 *   2. A "Specific concerns" clause naming each blocking dimension
 *      using investor-friendly phrasing.
 *   3. A red-flag clause if pre-analysis surfaced critical issues.
 *
 * Pure function: same inputs → identical output, every render.
 */
function buildDecisionSummary(args: {
  decision: Decision;
  phase: LifecyclePhase;
  composite: number;
  blocking: ScoreDimension[];
  criticals: number;
  delta: number | null;
}): string {
  const { composite, blocking, criticals } = args;
  const parts: string[] = [lookupCompositeNarrative(composite)];

  if (blocking.length > 0) {
    const concernPhrases = blocking.map((d) => DIMENSION_INVESTOR_CONCERN[d]);
    const lead = concernPhrases.length === 1 ? "Specific concern:" : "Specific concerns:";
    parts.push(`${lead} ${joinList(concernPhrases)}.`);
  }

  if (criticals > 0) {
    parts.push(
      `Note ${criticals} unresolved red flag${criticals === 1 ? "" : "s"} from pre-analysis.`,
    );
  }

  return parts.join(" ");
}
