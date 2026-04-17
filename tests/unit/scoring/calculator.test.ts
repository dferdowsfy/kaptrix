import { calculateCompositeScore, isFullyScored } from "@/lib/scoring/calculator";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { Score } from "@/lib/types";

function makeScore(
  dimension: string,
  sub_criterion: string,
  score: number,
  rationale = "This is a test rationale that meets the minimum length requirement.",
): Score {
  return {
    id: `${dimension}-${sub_criterion}`,
    engagement_id: "test-engagement",
    dimension: dimension as Score["dimension"],
    sub_criterion,
    score_0_to_5: score,
    weight: 1.0,
    operator_rationale: rationale,
    evidence_citations: [],
    pattern_match_case_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

describe("calculateCompositeScore", () => {
  it("returns 0 when no scores are provided", () => {
    const result = calculateCompositeScore([]);
    expect(result.composite_score).toBe(0);
    expect(Object.values(result.dimension_scores).every((s) => s === 0)).toBe(true);
  });

  it("calculates weighted composite correctly", () => {
    const scores: Score[] = [
      makeScore("product_credibility", "ai_value_vs_wrapper", 4.0),
      makeScore("product_credibility", "demo_production_gap", 3.0),
      makeScore("tooling_exposure", "model_concentration", 2.0),
      makeScore("tooling_exposure", "api_brittleness", 3.0),
    ];

    const result = calculateCompositeScore(scores);

    // product_credibility avg = 3.5, weight = 0.25 → 0.875
    // tooling_exposure avg = 2.5, weight = 0.20 → 0.5
    // other dimensions = 0
    expect(result.dimension_scores.product_credibility).toBe(3.5);
    expect(result.dimension_scores.tooling_exposure).toBe(2.5);
    expect(result.composite_score).toBeCloseTo(1.4, 1);
  });

  it("returns full dimension details", () => {
    const scores: Score[] = [
      makeScore("governance_safety", "logging_observability", 5.0),
    ];
    const result = calculateCompositeScore(scores);
    const govDetail = result.dimension_details.find(
      (d) => d.dimension === "governance_safety",
    );
    expect(govDetail).toBeDefined();
    expect(govDetail!.average_score).toBe(5.0);
    expect(govDetail!.sub_scores).toHaveLength(1);
  });
});

describe("isFullyScored", () => {
  it("returns false when no scores exist", () => {
    expect(isFullyScored([])).toBe(false);
  });

  it("returns true when all sub-criteria are scored with rationale", () => {
    const allScores: Score[] = SCORING_DIMENSIONS.flatMap((dim) =>
      dim.sub_criteria.map((sub) => makeScore(dim.key, sub.key, 3.0)),
    );
    expect(isFullyScored(allScores)).toBe(true);
  });

  it("returns false when rationale is too short", () => {
    const allScores: Score[] = SCORING_DIMENSIONS.flatMap((dim) =>
      dim.sub_criteria.map((sub) => makeScore(dim.key, sub.key, 3.0, "short")),
    );
    expect(isFullyScored(allScores)).toBe(false);
  });
});
