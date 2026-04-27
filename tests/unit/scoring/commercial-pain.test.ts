import {
  buildCommercialPainSummary,
  calculateCommercialPainConfidence,
  formatCommercialPainSummaryForEvidence,
  interpretCommercialPainAndDiligence,
  type CommercialPainInputs,
  type CommercialPainResult,
  type CommercialPainSummaryInput,
} from "@/lib/scoring/commercial-pain";

describe("calculateCommercialPainConfidence", () => {
  it("returns null when no inputs are provided (legacy engagements)", () => {
    expect(calculateCommercialPainConfidence(null)).toBeNull();
    expect(calculateCommercialPainConfidence(undefined)).toBeNull();
    expect(calculateCommercialPainConfidence({})).toBeNull();
    expect(
      calculateCommercialPainConfidence({ customer_demand_evidence: [] }),
    ).toBeNull();
  });

  it("returns 100 in the Strong band when every factor is at maximum", () => {
    const inputs: CommercialPainInputs = {
      pain_severity: "mission_critical",
      pain_frequency: "daily_or_continuous",
      solution_fit: "directly_solves",
      ai_necessity: "yes",
      outcome_proof: "customer_data",
      buying_urgency: "immediate",
      customer_demand_evidence: ["paying_customers"],
    };
    const result = calculateCommercialPainConfidence(inputs);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.band).toBe("strong");
    expect(result!.band_label).toBe("Strong");
  });

  it("returns 0 in the Not Validated band when every answer is unclear / unknown", () => {
    const inputs: CommercialPainInputs = {
      pain_severity: "unclear",
      pain_frequency: "unclear",
      solution_fit: "does_not_solve",
      ai_necessity: "unknown",
      outcome_proof: "not_proven",
      buying_urgency: "unknown",
      customer_demand_evidence: [],
    };
    // empty array alone reads as "no inputs"; force at least one categorical answer
    expect(calculateCommercialPainConfidence(inputs)).not.toBeNull();
    expect(calculateCommercialPainConfidence(inputs)!.score).toBe(0);
    expect(calculateCommercialPainConfidence(inputs)!.band).toBe("not_validated");
  });

  it("is deterministic — identical inputs produce identical scores", () => {
    const inputs: CommercialPainInputs = {
      pain_severity: "high",
      pain_frequency: "weekly",
      solution_fit: "major_part",
      ai_necessity: "mostly",
      outcome_proof: "case_studies",
      buying_urgency: "near_term",
      customer_demand_evidence: ["case_studies", "testimonials"],
    };
    const a = calculateCommercialPainConfidence(inputs);
    const b = calculateCommercialPainConfidence(inputs);
    expect(a).toEqual(b);
  });

  it("treats missing factors as 0 contribution rather than crashing", () => {
    const inputs: CommercialPainInputs = {
      pain_severity: "mission_critical", // 5 * 20 * 0.20 = 20
      // every other factor omitted → contributes 0
    };
    const result = calculateCommercialPainConfidence(inputs);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(20);
    expect(result!.band).toBe("not_validated");
    expect(result!.breakdown.pain_severity.raw).toBe(5);
    expect(result!.breakdown.solution_fit.raw).toBe(0);
  });

  describe("weighting", () => {
    it.each([
      // Each factor maxed individually should contribute exactly its weighted share.
      ["pain_severity", { pain_severity: "mission_critical" } as const, 20],
      ["pain_frequency", { pain_frequency: "daily_or_continuous" } as const, 10],
      ["solution_fit", { solution_fit: "directly_solves" } as const, 20],
      ["ai_necessity", { ai_necessity: "yes" } as const, 15],
      ["outcome_proof", { outcome_proof: "customer_data" } as const, 15],
      ["buying_urgency", { buying_urgency: "immediate" } as const, 10],
      [
        "customer_demand_evidence",
        { customer_demand_evidence: ["paying_customers"] } as const,
        10,
      ],
    ])("%s at max contributes %i to the total", (_name, partial, expected) => {
      const result = calculateCommercialPainConfidence(
        partial as CommercialPainInputs,
      );
      expect(result!.score).toBe(expected);
    });
  });

  describe("band thresholds", () => {
    // Each contribution is raw * 20 * weight. The fixtures below are
    // hand-computed so the math is auditable.

    it("score 80 lands in Strong (bottom of band)", () => {
      // 20 + 20 + 15 + 15 + 10 = 80
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical", // 5 * 20 * 0.20 = 20
        solution_fit: "directly_solves", // 5 * 20 * 0.20 = 20
        ai_necessity: "yes", // 5 * 20 * 0.15 = 15
        outcome_proof: "customer_data", // 5 * 20 * 0.15 = 15
        buying_urgency: "immediate", // 5 * 20 * 0.10 = 10
      })!;
      expect(r.score).toBe(80);
      expect(r.band).toBe("strong");
    });

    it("score 77 lands in Moderate (just below Strong)", () => {
      // Same as 80 but ai_necessity drops from yes(5) to mostly(4): -3
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical",
        solution_fit: "directly_solves",
        ai_necessity: "mostly", // 4 * 20 * 0.15 = 12
        outcome_proof: "customer_data",
        buying_urgency: "immediate",
      })!;
      expect(r.score).toBe(77);
      expect(r.band).toBe("moderate");
    });

    it("score 60 lands in Moderate (bottom of band)", () => {
      // 20 + 20 + 10 + 10 = 60
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical", // 20
        solution_fit: "directly_solves", // 20
        pain_frequency: "daily_or_continuous", // 5 * 20 * 0.10 = 10
        buying_urgency: "immediate", // 5 * 20 * 0.10 = 10
      })!;
      expect(r.score).toBe(60);
      expect(r.band).toBe("moderate");
    });

    it("score 59 lands in Weak (just below Moderate)", () => {
      // 20 + 20 + 15 + 4 = 59
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical", // 20
        solution_fit: "directly_solves", // 20
        outcome_proof: "customer_data", // 15
        buying_urgency: "long_term", // 2 * 20 * 0.10 = 4
      })!;
      expect(r.score).toBe(59);
      expect(r.band).toBe("weak");
    });

    it("score 40 lands in Weak (bottom of band)", () => {
      // 20 + 20 = 40
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical",
        solution_fit: "directly_solves",
      })!;
      expect(r.score).toBe(40);
      expect(r.band).toBe("weak");
    });

    it("score 38 lands in Not Validated (just below Weak)", () => {
      // 20 + 16 + 2 = 38
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical", // 20
        solution_fit: "major_part", // 4 * 20 * 0.20 = 16
        buying_urgency: "no_urgency", // 1 * 20 * 0.10 = 2
      })!;
      expect(r.score).toBe(38);
      expect(r.band).toBe("not_validated");
    });
  });

  describe("customer_demand_evidence quality tiers", () => {
    it("scores High (5) when paying customers / signed contracts / renewals / usage metrics are present", () => {
      const high: Array<CommercialPainInputs["customer_demand_evidence"]> = [
        ["paying_customers"],
        ["signed_contracts"],
        ["renewal_expansion"],
        ["usage_metrics"],
      ];
      for (const tags of high) {
        const r = calculateCommercialPainConfidence({
          customer_demand_evidence: tags,
        })!;
        expect(r.breakdown.customer_demand_evidence.raw).toBe(5);
        expect(r.score).toBe(10);
      }
    });

    it("scores Medium (3) for case studies / testimonials / interviews / pipeline", () => {
      const r = calculateCommercialPainConfidence({
        customer_demand_evidence: ["pipeline_lois"],
      })!;
      expect(r.breakdown.customer_demand_evidence.raw).toBe(3);
      expect(r.score).toBe(6);
    });

    it("scores Low (1) for founder claims only", () => {
      const r = calculateCommercialPainConfidence({
        customer_demand_evidence: ["founder_claims_only"],
      })!;
      expect(r.breakdown.customer_demand_evidence.raw).toBe(1);
      expect(r.score).toBe(2);
    });

    it("uses the highest tier present when tags are mixed", () => {
      const r = calculateCommercialPainConfidence({
        customer_demand_evidence: [
          "founder_claims_only",
          "case_studies",
          "paying_customers",
        ],
      })!;
      expect(r.breakdown.customer_demand_evidence.raw).toBe(5);
    });
  });

  it("breakdown weighted contributions sum to the reported score (within rounding)", () => {
    const inputs: CommercialPainInputs = {
      pain_severity: "high",
      pain_frequency: "monthly",
      solution_fit: "narrow_part",
      ai_necessity: "partially",
      outcome_proof: "testimonials",
      buying_urgency: "medium_term",
      customer_demand_evidence: ["case_studies"],
    };
    const r = calculateCommercialPainConfidence(inputs)!;
    const sum = Object.values(r.breakdown).reduce((s, e) => s + e.weighted, 0);
    expect(Math.round(sum)).toBe(r.score);
  });

  describe("top_drivers / missing_factors / evidence_source", () => {
    it("ranks the highest weighted contributions and excludes raw=0 factors", () => {
      const r = calculateCommercialPainConfidence({
        pain_severity: "mission_critical", // 20
        solution_fit: "directly_solves", // 20
        ai_necessity: "yes", // 15
        outcome_proof: "testimonials", // 6
        buying_urgency: "long_term", // 4
        // pain_frequency, customer_demand_evidence omitted → raw 0
      })!;
      expect(r.top_drivers).toHaveLength(3);
      expect(r.top_drivers.map((d) => d.factor)).toEqual([
        "pain_severity",
        "solution_fit",
        "ai_necessity",
      ]);
      expect(r.missing_factors).toEqual(
        expect.arrayContaining(["pain_frequency", "customer_demand_evidence"]),
      );
      // raw=0 answers (e.g. "unknown") should also appear as missing
      const r2 = calculateCommercialPainConfidence({
        pain_severity: "mission_critical",
        ai_necessity: "unknown",
      })!;
      expect(r2.missing_factors).toContain("ai_necessity");
    });

    it("defaults to intake-only when no artifact-backed factors are listed", () => {
      const r = calculateCommercialPainConfidence({
        pain_severity: "high",
        solution_fit: "directly_solves",
      })!;
      expect(r.evidence_source).toBe("intake");
    });

    it("reports artifact_backed when every answered factor is supported", () => {
      const r = calculateCommercialPainConfidence({
        pain_severity: "high",
        solution_fit: "directly_solves",
        artifact_backed_factors: ["pain_severity", "solution_fit"],
      })!;
      expect(r.evidence_source).toBe("artifact_backed");
    });

    it("reports mixed when some factors have artifact support and others don't", () => {
      const r = calculateCommercialPainConfidence({
        pain_severity: "high",
        solution_fit: "directly_solves",
        ai_necessity: "yes",
        artifact_backed_factors: ["pain_severity"],
      })!;
      expect(r.evidence_source).toBe("mixed");
    });

    it("ignores artifact_backed_factors that point at unanswered factors", () => {
      const r = calculateCommercialPainConfidence({
        pain_severity: "high",
        artifact_backed_factors: ["pain_severity", "solution_fit"], // solution_fit not answered
      })!;
      // Only pain_severity is both answered and backed → all answered factors backed.
      expect(r.evidence_source).toBe("artifact_backed");
    });
  });
});

describe("interpretCommercialPainAndDiligence", () => {
  function makeResult(score: number, band: CommercialPainResult["band"]): CommercialPainResult {
    return {
      score,
      band,
      band_label: band,
      breakdown: {
        pain_severity: { raw: 0, weighted: 0 },
        pain_frequency: { raw: 0, weighted: 0 },
        solution_fit: { raw: 0, weighted: 0 },
        ai_necessity: { raw: 0, weighted: 0 },
        outcome_proof: { raw: 0, weighted: 0 },
        buying_urgency: { raw: 0, weighted: 0 },
        customer_demand_evidence: { raw: 0, weighted: 0 },
      },
      top_drivers: [],
      missing_factors: [],
      evidence_source: "intake",
    };
  }

  it("returns null when either score is missing", () => {
    expect(interpretCommercialPainAndDiligence(null, 4.0)).toBeNull();
    expect(interpretCommercialPainAndDiligence(makeResult(85, "strong"), null)).toBeNull();
  });

  it("strong commercial + strong diligence → strong investment signal", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(85, "strong"), 4.2);
    expect(r?.key).toBe("strong_signal");
    expect(r?.tone).toBe("go");
  });

  it("strong commercial + weak diligence → execution risk", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(85, "strong"), 2.4);
    expect(r?.key).toBe("execution_risk");
    expect(r?.tone).toBe("warn");
  });

  it("weak commercial + strong diligence → commercially weak", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(35, "not_validated"), 4.1);
    expect(r?.key).toBe("commercially_weak");
    expect(r?.tone).toBe("warn");
  });

  it("weak commercial + weak diligence → likely pass", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(35, "not_validated"), 2.0);
    expect(r?.key).toBe("likely_pass");
    expect(r?.tone).toBe("stop");
  });

  it("treats Moderate band as 'high' on the commercial axis", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(65, "moderate"), 4.0);
    expect(r?.key).toBe("strong_signal");
  });

  it("treats Weak band as 'low' on the commercial axis", () => {
    const r = interpretCommercialPainAndDiligence(makeResult(45, "weak"), 4.0);
    expect(r?.key).toBe("commercially_weak");
  });

  it("uses the AI Diligence threshold of 3.5 (boundary lands in 'high')", () => {
    const at35 = interpretCommercialPainAndDiligence(makeResult(85, "strong"), 3.5);
    expect(at35?.key).toBe("strong_signal");
    const at34 = interpretCommercialPainAndDiligence(makeResult(85, "strong"), 3.49);
    expect(at34?.key).toBe("execution_risk");
  });
});

describe("buildCommercialPainSummary", () => {
  it("returns null for legacy engagements with no inputs", () => {
    expect(buildCommercialPainSummary(null)).toBeNull();
    expect(buildCommercialPainSummary(undefined)).toBeNull();
    expect(buildCommercialPainSummary({})).toBeNull();
  });

  it("normalizes categorical fields to human-readable phrases", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "mission_critical",
      pain_frequency: "daily_or_continuous",
      solution_fit: "directly_solves",
      ai_necessity: "yes",
      outcome_proof: "case_studies",
      buying_urgency: "immediate",
      customer_demand_evidence: ["paying_customers", "case_studies"],
      problem_statement: "Underwriting teams spend 4h per deal manually reading filings.",
      buyer_persona: "Mid-market PE associates and VPs",
      cost_of_pain: "≈$280k/year per analyst in lost productivity.",
      current_alternative: "Manual review + scattered Word/Excel notes.",
      status_quo_failure: "Inconsistent quality, no audit trail, slow turnaround.",
      promised_outcome: "Cut diligence cycle from 4h → 30min with audit trail.",
      buying_trigger: "Q2 budget cycle for new tooling.",
      report_rationale: "Strong band; pain validated with paying logos.",
      contradictions: ["Deck claims 50 paying logos; CRM shows 38 active."],
      artifact_backed_evidence: [
        "MSA §3.2 with FirmA",
        "Usage report Q1 2026 (12-page PDF)",
      ],
      intake_only_claims: ["CEO claim of 90% retention"],
      recommended_follow_up_questions: [
        "Reference call with FirmB to confirm time savings.",
      ],
    })!;

    expect(summary.commercial_pain_confidence_score).toBeGreaterThanOrEqual(80);
    expect(summary.commercial_pain_confidence_band).toBe("Strong");
    expect(summary.problem_statement).toMatch(/Underwriting teams/);
    expect(summary.pain_severity).toBe("Mission-critical");
    expect(summary.pain_frequency).toBe("Daily or continuous");
    expect(summary.solution_fit).toBe("Directly solves the core pain");
    expect(summary.ai_necessity).toBe("Yes — AI is necessary");
    expect(summary.outcome_proof).toBe("Proven with case studies");
    expect(summary.buying_urgency).toBe("Immediate");
    expect(summary.customer_demand_evidence).toContain("Paying customers");
    expect(summary.customer_demand_evidence).toContain("Case studies");
    expect(summary.artifact_backed_evidence).toHaveLength(2);
    expect(summary.intake_only_claims).toEqual(["CEO claim of 90% retention"]);
    expect(summary.contradictions).toHaveLength(1);
    expect(summary.recommended_follow_up_questions).toHaveLength(1);
  });

  it("renders 'Not provided' for empty free-form fields", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "moderate",
    })!;
    expect(summary.problem_statement).toBe("Not provided");
    expect(summary.buyer_persona).toBe("Not provided");
    expect(summary.cost_of_pain).toBe("Not provided");
    expect(summary.report_rationale).toBe("Not provided");
    // Lists default to [] not "Not provided" — keeps the type stable.
    expect(summary.contradictions).toEqual([]);
    expect(summary.intake_only_claims).toEqual([]);
  });

  it("populates missing_evidence with the labels of factors at raw=0", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "high",
      // every other categorical omitted
    })!;
    expect(summary.missing_evidence).toContain("Pain frequency");
    expect(summary.missing_evidence).toContain("Solution fit");
    expect(summary.missing_evidence).not.toContain("Pain severity");
  });

  it("flags 'all seven factors' when nothing is missing", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "high",
      pain_frequency: "weekly",
      solution_fit: "major_part",
      ai_necessity: "mostly",
      outcome_proof: "case_studies",
      buying_urgency: "near_term",
      customer_demand_evidence: ["paying_customers"],
    })!;
    expect(summary.missing_evidence).toBe(
      "All seven factors answered with non-zero evidence.",
    );
  });

  it("is deterministic — same input produces same summary", () => {
    const input: CommercialPainSummaryInput = {
      pain_severity: "high",
      problem_statement: "abc",
      contradictions: ["x"],
    };
    expect(buildCommercialPainSummary(input)).toEqual(
      buildCommercialPainSummary(input),
    );
  });
});

describe("formatCommercialPainSummaryForEvidence", () => {
  it("emits a 'not yet completed' sentinel when the summary is null", () => {
    const text = formatCommercialPainSummaryForEvidence(null);
    expect(text).toContain("[commercial_pain_summary]");
    expect(text).toContain("Commercial Pain Validation not yet completed");
    expect(text).toContain("Do not invent commercial pain evidence");
  });

  it("renders every field on its own line under the canonical block tag", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "high",
      solution_fit: "major_part",
      problem_statement: "Underwriting bottleneck.",
      buyer_persona: "PE associates.",
      cost_of_pain: "$280k/year.",
      report_rationale: "Validated with 2 paying customers.",
      artifact_backed_evidence: ["MSA §3.2"],
      intake_only_claims: ["CEO claim"],
      contradictions: ["Deck says 50, CRM says 38"],
    })!;
    const text = formatCommercialPainSummaryForEvidence(summary);
    expect(text).toMatch(/^\[commercial_pain_summary\]/);
    expect(text).toContain("commercial_pain_confidence_score:");
    expect(text).toContain("commercial_pain_confidence_band:");
    expect(text).toContain("problem_statement: Underwriting bottleneck.");
    expect(text).toContain("artifact_backed_evidence: MSA §3.2");
    expect(text).toContain("intake_only_claims: CEO claim");
    expect(text).toContain("contradictions: Deck says 50, CRM says 38");
    expect(text).toContain("CANONICAL");
  });

  it("never blurs intake-only claims into artifact-backed evidence", () => {
    const summary = buildCommercialPainSummary({
      pain_severity: "high",
      artifact_backed_evidence: ["Signed MSA"],
      intake_only_claims: ["CEO assertion of 80% margin"],
    })!;
    const text = formatCommercialPainSummaryForEvidence(summary);
    // Each list lives on its own line with its own label.
    expect(text).toMatch(/artifact_backed_evidence: Signed MSA$/m);
    expect(text).toMatch(/intake_only_claims: CEO assertion of 80% margin$/m);
  });
});
