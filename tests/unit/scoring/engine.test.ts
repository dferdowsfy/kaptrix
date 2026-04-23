import {
  engineOutputToScores,
  runScoringEngine,
} from "@/lib/scoring/engine";
import type {
  ArtifactEvidence,
  IntakeResponse,
  ReviewerNote,
  ScoringEngineInput,
  SubCriterionEngineOutput,
} from "@/lib/scoring/engine-types";
import { SCORING_DIMENSIONS } from "@/lib/constants";

// ─── Helpers ────────────────────────────────────────────────────────

function findSub(
  out: ReturnType<typeof runScoringEngine>,
  dimension: string,
  sub_criterion: string,
): SubCriterionEngineOutput {
  const s = out.sub_criteria.find(
    (x) => x.dimension === dimension && x.sub_criterion === sub_criterion,
  );
  if (!s)
    throw new Error(`sub-criterion not found: ${dimension}/${sub_criterion}`);
  return s;
}

function artifact(
  overrides: Partial<ArtifactEvidence> = {},
): ArtifactEvidence {
  return {
    id: "a1",
    kind: "document",
    dimension: "product_credibility",
    sub_criterion: "ai_value_vs_wrapper",
    signal: "supports_high",
    claim: "Proof of AI-native architecture.",
    ...overrides,
  };
}

function intake(field: string, value: IntakeResponse["value"]): IntakeResponse {
  return { field, value };
}

const EMPTY_INPUT: ScoringEngineInput = { intake: [], artifacts: [] };

// ─── Shape guarantees ───────────────────────────────────────────────

describe("runScoringEngine — shape", () => {
  it("emits every sub-criterion from the rubric", () => {
    const out = runScoringEngine(EMPTY_INPUT);
    const expected = SCORING_DIMENSIONS.reduce(
      (n, d) => n + d.sub_criteria.length,
      0,
    );
    expect(out.sub_criteria).toHaveLength(expected);
    for (const s of out.sub_criteria) {
      expect(s.name).toBe(`${s.dimension}.${s.sub_criterion}`);
      expect(typeof s.score).toBe("number");
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(s.confidence);
      expect([
        "intake_only",
        "artifact_supported",
        "artifact_only",
        "contradictory",
        "insufficient",
      ]).toContain(s.source_mix);
    }
  });

  it("includes schema version and a stable inputs hash", () => {
    const out = runScoringEngine(EMPTY_INPUT);
    expect(out.schema_version).toBe("kaptrix.engine@1");
    expect(out.inputs_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── Determinism ────────────────────────────────────────────────────

describe("runScoringEngine — determinism", () => {
  const input: ScoringEngineInput = {
    intake: [
      intake("customer_data_usage_rights", "ambiguous / not documented"),
      intake("regulatory_exposure", ["HIPAA", "GDPR"]),
      intake("artifacts_received", ["SOC 2", "Benchmark suite"]),
    ],
    artifacts: [
      artifact({
        id: "doc-1",
        dimension: "governance_safety",
        sub_criterion: "access_controls",
        signal: "supports_high",
        claim: "SOC 2 Type II attestation present.",
      }),
      artifact({
        id: "doc-2",
        dimension: "data_sensitivity",
        sub_criterion: "customer_isolation",
        signal: "contradicts",
        claim: "Tenants share the same Postgres schema without row-level isolation.",
      }),
    ],
    reviewer_notes: [
      {
        dimension: "open_validation",
        sub_criterion: "known_unknowns",
        delta: -0.25,
        rationale: "Reviewer flagged three open questions on data lineage.",
      },
    ],
  };

  it("same inputs → identical output (incl. hash)", () => {
    const a = runScoringEngine(input);
    const b = runScoringEngine(input);
    expect(a).toEqual(b);
    expect(a.inputs_hash).toBe(b.inputs_hash);
  });

  it("ordering of intake / artifacts / notes does not change output", () => {
    const shuffled: ScoringEngineInput = {
      intake: [...input.intake].reverse(),
      artifacts: [...input.artifacts].reverse(),
      reviewer_notes: [...(input.reviewer_notes ?? [])].reverse(),
    };
    const a = runScoringEngine(input);
    const b = runScoringEngine(shuffled);
    expect(a).toEqual(b);
  });

  it("hash changes when a single field changes", () => {
    const a = runScoringEngine(input);
    const b = runScoringEngine({
      ...input,
      intake: [
        ...input.intake,
        intake("kill_criteria", "Ship delayed >180 days triggers re-diligence"),
      ],
    });
    expect(a.inputs_hash).not.toBe(b.inputs_hash);
  });
});

// ─── Source hierarchy ───────────────────────────────────────────────

describe("source hierarchy & guardrails", () => {
  it("intake-only scores are bounded to [1.5, 3.5] with LOW confidence", () => {
    // Stack strongly-negative intake signals. Without artifacts the score
    // must never fall below 1.5.
    const out = runScoringEngine({
      intake: [
        intake("customer_data_usage_rights", "ambiguous"),
        intake("training_data_sources", ["public web scraping"]),
        intake("regulatory_exposure", ["HIPAA", "GDPR", "PCI-DSS"]),
      ],
      artifacts: [],
    });
    const regulated = findSub(out, "data_sensitivity", "regulated_data");
    expect(regulated.source_mix).toBe("intake_only");
    expect(regulated.confidence).toBe("LOW");
    expect(regulated.score).toBeGreaterThanOrEqual(1.5);
    expect(regulated.score).toBeLessThanOrEqual(3.5);
  });

  it("intake alone cannot reach the 4–5 band", () => {
    // Even stacked positive intake signals should be capped at 3.5.
    const out = runScoringEngine({
      intake: [
        intake("artifacts_received", [
          "SOC 2",
          "ISO 27001",
          "Model / AI system documentation",
          "Benchmark evaluation results",
        ]),
        intake("customer_data_usage_rights", "per-tenant isolation / explicit opt-in"),
      ],
      artifacts: [],
    });
    for (const s of out.sub_criteria) {
      if (s.source_mix === "intake_only") {
        expect(s.score).toBeLessThanOrEqual(3.5);
      }
    }
  });

  it("artifact-supported scores raise confidence above LOW", () => {
    const out = runScoringEngine({
      intake: [intake("artifacts_received", ["SOC 2"])],
      artifacts: [
        artifact({
          id: "soc2-cert",
          dimension: "governance_safety",
          sub_criterion: "access_controls",
          signal: "supports_high",
          claim: "Current SOC 2 Type II report (2026)",
        }),
      ],
    });
    const s = findSub(out, "governance_safety", "access_controls");
    expect(s.source_mix).toBe("artifact_supported");
    expect(["MEDIUM", "HIGH"]).toContain(s.confidence);
    expect(s.score).toBeGreaterThan(3);
  });

  it("missing-evidence cap: no artifact → max score is 3", () => {
    const out = runScoringEngine({
      intake: [intake("artifacts_received", ["Model / AI system documentation"])],
      artifacts: [],
    });
    const s = findSub(out, "product_credibility", "ai_value_vs_wrapper");
    expect(s.score).toBeLessThanOrEqual(3);
  });

  it("≥4 band requires at least one supporting artifact", () => {
    // Only contradicting artifacts → must demote below 4.
    const out = runScoringEngine({
      intake: [intake("artifacts_received", ["SOC 2"])],
      artifacts: [
        artifact({
          id: "bad-1",
          dimension: "governance_safety",
          sub_criterion: "access_controls",
          signal: "contradicts",
          claim: "Access review logs missing for 2025.",
        }),
      ],
    });
    const s = findSub(out, "governance_safety", "access_controls");
    expect(s.score).toBeLessThan(4);
  });
});

// ─── Contradictions ─────────────────────────────────────────────────

describe("contradictions", () => {
  it("raises contradiction_flag, reduces score, and marks source_mix", () => {
    const out = runScoringEngine({
      intake: [
        intake("customer_data_usage_rights", "per-tenant isolation / explicit opt-in"),
      ],
      artifacts: [
        artifact({
          id: "architecture-doc",
          dimension: "data_sensitivity",
          sub_criterion: "customer_isolation",
          signal: "contradicts",
          claim: "Architecture shows shared DB schema, no tenant isolation.",
        }),
      ],
    });
    const s = findSub(out, "data_sensitivity", "customer_isolation");
    expect(s.contradiction_flag).toBe(true);
    expect(s.source_mix).toBe("contradictory");
    expect(s.score).toBeLessThanOrEqual(2.5);
  });

  it("two contradictions escalate confidence to HIGH", () => {
    const out = runScoringEngine({
      intake: [
        intake("customer_data_usage_rights", "per-tenant isolation / explicit opt-in"),
      ],
      artifacts: [
        artifact({
          id: "arch",
          dimension: "data_sensitivity",
          sub_criterion: "customer_isolation",
          signal: "contradicts",
          claim: "Arch doc shows shared schema",
        }),
        artifact({
          id: "incident",
          dimension: "data_sensitivity",
          sub_criterion: "customer_isolation",
          signal: "contradicts",
          claim: "Incident log shows cross-tenant leak in 2025-11",
        }),
      ],
    });
    const s = findSub(out, "data_sensitivity", "customer_isolation");
    expect(s.confidence).toBe("HIGH");
    expect(s.contradiction_flag).toBe(true);
  });
});

// ─── Reviewer notes ─────────────────────────────────────────────────

describe("reviewer notes", () => {
  it("applies bounded delta and includes rationale in output", () => {
    const baseOut = runScoringEngine({
      intake: [],
      artifacts: [
        artifact({
          id: "a",
          dimension: "production_readiness",
          sub_criterion: "scaling",
          signal: "supports_mid",
          claim: "Load test report at nominal scale.",
        }),
      ],
    });
    const withNote = runScoringEngine({
      intake: [],
      artifacts: [
        artifact({
          id: "a",
          dimension: "production_readiness",
          sub_criterion: "scaling",
          signal: "supports_mid",
          claim: "Load test report at nominal scale.",
        }),
      ],
      reviewer_notes: [
        {
          dimension: "production_readiness",
          sub_criterion: "scaling",
          delta: 0.5,
          rationale: "Reviewer cross-referenced internal benchmark deck.",
        },
      ],
    });
    const base = findSub(baseOut, "production_readiness", "scaling");
    const adjusted = findSub(withNote, "production_readiness", "scaling");
    expect(adjusted.score).toBeGreaterThanOrEqual(base.score);
    expect(adjusted.rationale).toMatch(/Reviewer/);
  });

  it("clamps runaway reviewer deltas to ±0.5", () => {
    const out = runScoringEngine({
      intake: [],
      artifacts: [
        artifact({
          id: "a",
          dimension: "production_readiness",
          sub_criterion: "scaling",
          signal: "supports_mid",
          claim: "Load test report.",
        }),
      ],
      reviewer_notes: [
        {
          dimension: "production_readiness",
          sub_criterion: "scaling",
          delta: 99,
          rationale: "Runaway delta — must be clamped by the engine.",
        } satisfies ReviewerNote,
      ],
    });
    const s = findSub(out, "production_readiness", "scaling");
    // 2.5 baseline + 0 from supports_mid + clamped +0.5 = 3.0
    expect(s.score).toBeLessThanOrEqual(3.0);
  });

  it("reviewer notes cannot push score into 4+ without a supporting artifact", () => {
    const out = runScoringEngine({
      intake: [],
      artifacts: [],
      reviewer_notes: [
        {
          dimension: "production_readiness",
          sub_criterion: "scaling",
          delta: 0.5,
          rationale: "Reviewer strongly believes production is ready.",
        },
      ],
    });
    const s = findSub(out, "production_readiness", "scaling");
    // With no intake and no artifact, base is 2.5 (reviewer-only),
    // reviewer adds +0.5 → 3.0. No artifact support means ≥4 is blocked.
    expect(s.score).toBeLessThan(4);
  });
});

// ─── Insufficient evidence ─────────────────────────────────────────

describe("insufficient evidence", () => {
  it("marks sub-criteria without intake or artifacts as insufficient with score 0", () => {
    const out = runScoringEngine(EMPTY_INPUT);
    for (const s of out.sub_criteria) {
      expect(s.source_mix).toBe("insufficient");
      expect(s.confidence).toBe("LOW");
      expect(s.score).toBe(0);
    }
  });
});

// ─── Adapter ────────────────────────────────────────────────────────

describe("engineOutputToScores", () => {
  it("pads short rationales so the DB ≥20 char constraint is satisfied", () => {
    const out = runScoringEngine(EMPTY_INPUT);
    const scores = engineOutputToScores("eng-1", out);
    for (const s of scores) {
      expect(s.operator_rationale.length).toBeGreaterThanOrEqual(20);
      expect(s.engagement_id).toBe("eng-1");
    }
  });
});
