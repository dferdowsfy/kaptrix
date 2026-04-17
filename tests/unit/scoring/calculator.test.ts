import { calculateCompositeScore, deriveDecision, isFullyScored } from "@/lib/scoring/calculator";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { PreAnalysis, Score } from "@/lib/types";

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

function fullScorecardAt(value: number): Score[] {
  return SCORING_DIMENSIONS.flatMap((dim) =>
    dim.sub_criteria.map((sub) => makeScore(dim.key, sub.key, value)),
  );
}

function redFlag(severity: PreAnalysis["red_flags"][number]["severity"]) {
  return {
    flag: "x",
    severity,
    dimension: "product_credibility" as const,
    evidence: "y",
  };
}

function analysisWith(severities: Array<"critical" | "high" | "medium" | "low">): PreAnalysis {
  return {
    id: "a",
    engagement_id: "e",
    document_id: null,
    analysis_type: "synthesis",
    run_at: new Date().toISOString(),
    model_used: "test",
    prompt_version: "1",
    raw_output: {},
    extracted_claims: [],
    red_flags: severities.map(redFlag),
    regulatory_signals: [],
    inconsistencies_json: [],
    vendor_dependencies: [],
    model_dependencies: [],
    open_questions: [],
    input_token_count: null,
    output_token_count: null,
    cost_usd: null,
    status: "completed",
    error_message: null,
  };
}

describe("deriveDecision — pre-investment", () => {
  it("returns 'invest' when composite ≥3.5 with no criticals and no blocking dim", () => {
    const result = deriveDecision({
      dealStage: "preliminary",
      status: "scoring",
      scores: fullScorecardAt(4.0),
    });
    expect(result.decision).toBe("invest");
    expect(result.tone).toBe("go");
    expect(result.phase).toBe("pre_investment");
  });

  it("returns 'do_not_invest' when composite <2.5", () => {
    const result = deriveDecision({
      dealStage: "loi",
      status: "scoring",
      scores: fullScorecardAt(2.0),
    });
    expect(result.decision).toBe("do_not_invest");
  });

  it("returns 'do_not_invest' when ≥2 critical red flags regardless of score", () => {
    const result = deriveDecision({
      dealStage: "loi",
      status: "scoring",
      scores: fullScorecardAt(4.5),
      analyses: [analysisWith(["critical", "critical"])],
    });
    expect(result.decision).toBe("do_not_invest");
  });

  it("returns 'invest_with_conditions' in the middle band", () => {
    const result = deriveDecision({
      dealStage: "confirmatory",
      status: "scoring",
      scores: fullScorecardAt(3.0),
    });
    expect(result.decision).toBe("invest_with_conditions");
    expect(result.tone).toBe("warn");
  });

  it("blocks 'invest' when a single dimension is below floor", () => {
    const scores = fullScorecardAt(4.0).map((s) =>
      s.dimension === "data_sensitivity" ? { ...s, score_0_to_5: 1.5 } : s,
    );
    const result = deriveDecision({
      dealStage: "preliminary",
      status: "scoring",
      scores,
    });
    expect(result.decision).toBe("invest_with_conditions");
    expect(result.blocking_dimensions).toContain("data_sensitivity");
  });
});

describe("deriveDecision — active engagement (trend)", () => {
  it("returns 'continue' on improving trend with no criticals", () => {
    const result = deriveDecision({
      dealStage: "confirmatory",
      status: "analysis",
      scores: fullScorecardAt(3.2),
      priorComposite: 2.8,
    });
    expect(result.phase).toBe("active");
    expect(result.decision).toBe("continue");
    expect(result.composite_delta).toBeCloseTo(0.4, 1);
  });

  it("returns 'stall_and_rediligence' on declining trend", () => {
    const result = deriveDecision({
      dealStage: "confirmatory",
      status: "analysis",
      scores: fullScorecardAt(3.0),
      priorComposite: 3.5,
    });
    expect(result.decision).toBe("stall_and_rediligence");
  });

  it("returns 'stall' when flat", () => {
    const result = deriveDecision({
      dealStage: "confirmatory",
      status: "analysis",
      scores: fullScorecardAt(3.0),
      priorComposite: 3.0,
    });
    expect(result.decision).toBe("stall");
  });
});

describe("deriveDecision — post-close", () => {
  it("returns 'double_down' when production + governance are strong", () => {
    const scores = fullScorecardAt(3.5);
    const result = deriveDecision({
      dealStage: "post_close",
      status: "delivered",
      scores,
    });
    expect(result.phase).toBe("post_close");
    expect(result.decision).toBe("double_down");
  });

  it("returns 'wind_down' when production readiness is below the hold floor", () => {
    const scores = fullScorecardAt(3.5).map((s) =>
      s.dimension === "production_readiness" ? { ...s, score_0_to_5: 1.5 } : s,
    );
    const result = deriveDecision({
      dealStage: "post_close",
      status: "delivered",
      scores,
    });
    expect(result.decision).toBe("wind_down");
  });

  it("returns 'hold' in the middle band post-close", () => {
    const scores = fullScorecardAt(3.5).map((s) =>
      s.dimension === "production_readiness" ? { ...s, score_0_to_5: 3.0 } : s,
    );
    const result = deriveDecision({
      dealStage: "post_close",
      status: "delivered",
      scores,
    });
    expect(result.decision).toBe("hold");
  });
});
