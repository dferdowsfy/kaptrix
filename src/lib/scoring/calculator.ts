import { SCORING_DIMENSIONS } from "@/lib/constants";
import type {
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

export function calculateCompositeScore(scores: Score[]): CompositeResult {
  const dimensionDetails = SCORING_DIMENSIONS.map((dim) => {
    const dimScores = scores.filter((s) => s.dimension === dim.key);
    const average =
      dimScores.length > 0
        ? dimScores.reduce((sum, s) => sum + s.score_0_to_5, 0) / dimScores.length
        : 0;

    return {
      dimension: dim.key,
      name: dim.name,
      weight: dim.weight,
      average_score: Math.round(average * 10) / 10,
      sub_scores: dimScores.map((s) => ({
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
  blocking_dimensions: ScoreDimension[];
  critical_red_flag_count: number;
  composite_delta: number | null;
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
}

export function deriveDecision(input: DeriveDecisionInput): DecisionResult {
  const phase = lifecyclePhaseFor(
    input.dealStage,
    input.status,
    input.priorComposite,
  );
  const composite = calculateCompositeScore(input.scores);
  const blocking = blockingDimensions(composite.dimension_scores);
  const criticals = countCriticalRedFlags(input.analyses);
  const prior =
    typeof input.priorComposite === "number" ? input.priorComposite : null;
  const delta =
    prior === null ? null : Math.round((composite.composite_score - prior) * 10) / 10;

  const rationale: string[] = [];
  rationale.push(
    `Composite ${composite.composite_score.toFixed(1)}/5.0` +
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
  return {
    phase,
    decision,
    label: meta.label,
    tone: meta.tone,
    rationale,
    blocking_dimensions: blocking,
    critical_red_flag_count: criticals,
    composite_delta: delta,
  };
}
