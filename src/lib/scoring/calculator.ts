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
  blocking_dimensions: ScoreDimension[];
  critical_red_flag_count: number;
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
    blocking_dimensions: blocking,
    critical_red_flag_count: criticals,
    composite_delta: delta,
  };
}

/**
 * Convert the structural decision inputs into a 1–2 sentence narrative
 * an investment-committee reader can act on without ever seeing the
 * scoring rubric. No "composite", no "floor", no "ceiling", no
 * dimension IDs — instead, plain underwriting language.
 *
 * Pure function: same inputs → same sentences, every time.
 */
function buildDecisionSummary(args: {
  decision: Decision;
  phase: LifecyclePhase;
  composite: number;
  blocking: ScoreDimension[];
  criticals: number;
  delta: number | null;
}): string {
  const { decision, phase, blocking, criticals, delta } = args;
  const concernPhrases = blocking.map((d) => DIMENSION_INVESTOR_CONCERN[d]);
  const concernsList = joinList(concernPhrases);

  // Phrase the cluster of concerns differently depending on count, so
  // single-issue and multi-issue cases both read naturally.
  const concernsClause =
    concernPhrases.length === 0
      ? ""
      : concernPhrases.length === 1
        ? `weakness in ${concernsList}`
        : concernPhrases.length === 2
          ? `weakness across ${concernsList}`
          : `material concerns across ${concernsList}`;

  const redFlagClause =
    criticals === 0
      ? ""
      : criticals === 1
        ? "an unresolved red flag from diligence"
        : `${criticals} unresolved red flags from diligence`;

  // Combine concerns and red flags into one well-formed clause.
  const issuesClause = (() => {
    if (concernsClause && redFlagClause) {
      return `${concernsClause}, alongside ${redFlagClause}`;
    }
    return concernsClause || redFlagClause;
  })();

  // ── Pre-investment ───────────────────────────────────────────────
  if (phase === "pre_investment") {
    if (decision === "invest") {
      return "This opportunity meets our underwriting bar across the rubric — no material concerns surfaced, and there are no unresolved red flags. Recommend proceeding to term sheet.";
    }
    if (decision === "do_not_invest") {
      const why = issuesClause
        ? `${issuesClause.charAt(0).toUpperCase()}${issuesClause.slice(1)} undermine the thesis, and the issues are too foundational to resolve through deal terms.`
        : "The risk-adjusted return is indefensible at the current evidence level.";
      return `This opportunity falls below our underwriting bar. ${why} Recommend passing; we would only revisit if the team substantially strengthens those areas and clears the outstanding red flags.`;
    }
    // invest_with_conditions
    const why = issuesClause
      ? `but ${issuesClause} need to be remediated before final commitment`
      : "but additional diligence is needed before final commitment";
    return `The headline thesis is underwritable, ${why}. Recommend a conditional offer contingent on the team closing those gaps and providing fresh evidence at the next checkpoint.`;
  }

  // ── Active engagement ────────────────────────────────────────────
  if (phase === "active") {
    const d = delta ?? 0;
    const trend =
      d > 0
        ? `Operating posture has strengthened versus the prior scorecard`
        : d < 0
          ? `Operating posture has deteriorated versus the prior scorecard`
          : `Operating posture is flat versus the prior scorecard`;
    if (decision === "continue") {
      return `${trend} with no critical issues. The asset is tracking the original thesis — continue execution against the existing plan.`;
    }
    if (decision === "stall_and_rediligence") {
      const why = issuesClause ? `, with ${issuesClause}` : "";
      return `${trend}${why}. Pause further commitments and re-run diligence on the affected areas before deploying additional capital.`;
    }
    // stall
    return `${trend} — within tolerance, but not delivering the upside we originally underwrote. Maintain the current envelope and reassess at the next milestone.`;
  }

  // ── Post-close ───────────────────────────────────────────────────
  if (decision === "double_down") {
    return "The portfolio company is performing across operational maturity and governance — the thesis is validated by results to date. Recommend follow-on participation if portfolio allocation allows.";
  }
  if (decision === "wind_down") {
    const why = issuesClause ? `, with ${issuesClause}` : "";
    return `The portfolio company is materially below the operational bar needed to continue${why}. Remediation cost likely exceeds expected return — recommend an orderly wind-down.`;
  }
  // hold
  const why = issuesClause ? `; address ${issuesClause}` : "";
  return `The portfolio company is functioning but not earning additional capital${why}. Hold the position and revisit only with substantially better evidence on the open items.`;
}
