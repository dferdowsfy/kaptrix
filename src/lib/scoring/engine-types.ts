// Kaptrix Deterministic Scoring Engine — types.
//
// This file is the authoritative shape of inputs and outputs for the
// structured scoring layer. It is kept separate from src/lib/types.ts
// so the engine can be consumed by server routes, tests, and tools
// without pulling in DB-row shapes.

import type { ScoreDimension } from "@/lib/types";

export const ENGINE_SCHEMA_VERSION = "kaptrix.engine@1";

export type EngineConfidence = "LOW" | "MEDIUM" | "HIGH";

export type EngineSourceMix =
  | "intake_only"
  | "artifact_supported"
  | "artifact_only"
  | "contradictory"
  | "insufficient";

/** A single intake response, keyed by canonical field name. */
export interface IntakeResponse {
  field: string;
  value: string | string[] | number | boolean | null;
}

/**
 * An artifact evidence item tagged to a specific sub-criterion. Tagging
 * (dimension + sub + signal direction) happens upstream — extraction,
 * pre-analysis, or operator classification. The engine consumes the
 * already-tagged artifact deterministically.
 */
export interface ArtifactEvidence {
  id: string;
  kind: "document" | "pre_analysis" | "insight" | "coverage" | "benchmark";
  dimension: ScoreDimension;
  sub_criterion: string;
  /**
   * Direction of the evidence relative to the sub-criterion band:
   *  - supports_high — strong evidence of 4–5 band behaviour
   *  - supports_mid  — evidence of a 3-band (neutral) posture
   *  - supports_low  — evidence of 1–2 band failure
   *  - contradicts   — artifact directly contradicts an intake claim;
   *                   artifact wins, contradiction_flag is raised.
   */
  signal: "supports_high" | "supports_mid" | "supports_low" | "contradicts";
  claim: string;
  locator?: string;
}

/**
 * Reviewer note — bounded override. Cannot break guardrails: a note
 * cannot push a sub-criterion into the 4–5 band unless at least one
 * supporting artifact is present.
 */
export interface ReviewerNote {
  dimension: ScoreDimension;
  sub_criterion: string;
  /** Bounded to ±0.5 before application. Larger values are clamped. */
  delta: number;
  rationale: string;
}

export interface ScoringEngineInput {
  intake: IntakeResponse[];
  artifacts: ArtifactEvidence[];
  reviewer_notes?: ReviewerNote[];
}

export interface SubCriterionEngineOutput {
  /** `${dimension}.${sub_criterion}` — stable join key. */
  name: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  /** 0–5 in 0.5 increments. */
  score: number;
  confidence: EngineConfidence;
  source_mix: EngineSourceMix;
  contradiction_flag: boolean;
  /** Artifact IDs that contributed to this sub-criterion's output. */
  evidence_references: string[];
  rationale: string;
}

export interface ScoringEngineOutput {
  sub_criteria: SubCriterionEngineOutput[];
  /** SHA-256 of the canonical input. Same inputs → same hash. */
  inputs_hash: string;
  schema_version: string;
}
