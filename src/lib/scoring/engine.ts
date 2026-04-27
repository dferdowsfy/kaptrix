// Kaptrix Deterministic Scoring Engine.
//
// Responsibility: STRUCTURE, NORMALIZE, and COMPILE scoring inputs
// (intake responses, artifact evidence, reviewer notes) into a
// deterministic per-sub-criterion output. The engine is NOT the final
// scorer — dimension scores and the composite are computed by
// `calculateCompositeScore` / `calculateFinalScore` in calculator.ts
// from the sub-criterion scores this engine emits.
//
// Core guarantees:
//   1. Pure & side-effect free. No LLM, no DB, no Date.now, no random.
//   2. Deterministic: same inputs → identical output (including hash).
//   3. Source hierarchy: artifacts > intake > reviewer notes.
//   4. Guardrails:
//        - intake-only scores stay in [1.5, 3.5] with LOW confidence
//        - no artifact → score capped at 3
//        - scores ≥ 4 require at least one supporting artifact
//        - reviewer notes bounded to ±0.5
//   5. Contradictions are explicit: when artifacts contradict intake,
//      artifact wins, `contradiction_flag = true`, score is penalised.

import { createHash } from "node:crypto";
import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { ScoreDimension } from "@/lib/types";
import {
  ENGINE_SCHEMA_VERSION,
  type ArtifactEvidence,
  type EngineConfidence,
  type EngineSourceMix,
  type IntakeResponse,
  type ReviewerNote,
  type ScoringEngineInput,
  type ScoringEngineOutput,
  type SubCriterionEngineOutput,
} from "@/lib/scoring/engine-types";
import {
  INTAKE_RULES,
  type IntakeSubSignal,
} from "@/lib/scoring/engine-rules";

// ── Tunable constants (treat as part of the rubric) ──────────────────

const BASELINE = 2.5;
const INTAKE_FLOOR = 1.5;
const INTAKE_CEIL = 3.5;
const NO_ARTIFACT_CAP = 3;
const HIGH_BAND_FLOOR = 4;

/** Maximum |delta| contributed by a single intake signal. */
const PER_INTAKE_SIGNAL_CLAMP = 1.5;
/** Maximum net |delta| from intake signals combined, per sub-criterion. */
const INTAKE_NET_CLAMP = 2.0;

/** Maximum |delta| contributed by a single supporting artifact. */
const PER_ARTIFACT_CLAMP = 1.5;
/** Maximum net |delta| from artifact signals combined, per sub-criterion. */
const ARTIFACT_NET_CLAMP = 2.5;

/** Each contradicting artifact knocks this much off the score. */
const CONTRADICTION_PENALTY_PER = 0.5;

const REVIEWER_NOTE_CLAMP = 0.5;

// ── Utilities ────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function snapHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

function subKey(dim: ScoreDimension, sub: string): string {
  return `${dim}.${sub}`;
}

function artifactDeltaFor(signal: ArtifactEvidence["signal"]): number {
  switch (signal) {
    case "supports_high":
      return 1.5;
    case "supports_mid":
      return 0;
    case "supports_low":
      return -1.5;
    case "contradicts":
      // Contradictions are scored via the penalty path, not the delta
      // path, so they don't stack with the supports_* bands.
      return 0;
  }
}

function artifactConfidence(
  supports: number,
  contradicts: number,
): EngineConfidence {
  const total = supports + contradicts;
  if (total === 0) return "LOW";
  if (total === 1) return "MEDIUM";
  return "HIGH";
}

// ── Canonicalisation (drives the hash and determinism) ───────────────

/**
 * Canonical JSON-safe shape for hashing. Sort lists and normalise
 * optional fields so equivalent inputs hash identically regardless of
 * caller ordering.
 */
function canonicalInput(input: ScoringEngineInput): string {
  const intake = [...input.intake]
    .map((r) => ({
      field: r.field,
      value: normaliseIntakeValue(r.value),
    }))
    .sort((a, b) => a.field.localeCompare(b.field));

  const artifacts = [...input.artifacts]
    .map((a) => ({
      id: a.id,
      kind: a.kind,
      dimension: a.dimension,
      sub_criterion: a.sub_criterion,
      signal: a.signal,
      claim: a.claim,
      locator: a.locator ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const reviewer = [...(input.reviewer_notes ?? [])]
    .map((n) => ({
      dimension: n.dimension,
      sub_criterion: n.sub_criterion,
      delta: n.delta,
      rationale: n.rationale,
    }))
    .sort((a, b) =>
      subKey(a.dimension, a.sub_criterion).localeCompare(
        subKey(b.dimension, b.sub_criterion),
      ),
    );

  return JSON.stringify({ intake, artifacts, reviewer });
}

function normaliseIntakeValue(
  v: IntakeResponse["value"],
): IntakeResponse["value"] {
  if (Array.isArray(v)) return [...v].sort();
  return v;
}

function hashInput(input: ScoringEngineInput): string {
  return createHash("sha256").update(canonicalInput(input)).digest("hex");
}

// ── Per-sub-criterion evaluation ─────────────────────────────────────

interface Bucket {
  intake: IntakeSubSignal[];
  artifacts: ArtifactEvidence[];
  reviewer?: ReviewerNote;
}

function evaluateSub(
  dimension: ScoreDimension,
  sub_criterion: string,
  bucket: Bucket,
): SubCriterionEngineOutput {
  const name = subKey(dimension, sub_criterion);
  const hasIntake = bucket.intake.length > 0;
  const hasArtifact = bucket.artifacts.length > 0;

  // Early exit — nothing to score.
  if (!hasIntake && !hasArtifact && !bucket.reviewer) {
    return {
      name,
      dimension,
      sub_criterion,
      score: 0,
      confidence: "LOW",
      source_mix: "insufficient",
      contradiction_flag: false,
      evidence_references: [],
      rationale:
        "Insufficient evidence. No intake or artifact support for this sub-criterion.",
    };
  }

  // Intake net delta, with per-signal and net clamps.
  const rawIntakeSum = bucket.intake.reduce(
    (s, sig) => s + clamp(sig.delta, -PER_INTAKE_SIGNAL_CLAMP, PER_INTAKE_SIGNAL_CLAMP),
    0,
  );
  const intakeDelta = clamp(rawIntakeSum, -INTAKE_NET_CLAMP, INTAKE_NET_CLAMP);

  // Artifact aggregation.
  const supporting = bucket.artifacts.filter(
    (a) => a.signal !== "contradicts",
  );
  const contradicting = bucket.artifacts.filter(
    (a) => a.signal === "contradicts",
  );
  const contradiction_flag = contradicting.length > 0;

  const rawArtifactSum = supporting.reduce(
    (s, a) => s + clamp(artifactDeltaFor(a.signal), -PER_ARTIFACT_CLAMP, PER_ARTIFACT_CLAMP),
    0,
  );
  const artifactDelta = clamp(rawArtifactSum, -ARTIFACT_NET_CLAMP, ARTIFACT_NET_CLAMP);
  const contradictionPenalty = -CONTRADICTION_PENALTY_PER * contradicting.length;

  // Decide source_mix + preliminary score + confidence.
  let score: number;
  let source_mix: EngineSourceMix;
  let confidence: EngineConfidence;
  const rationaleParts: string[] = [];

  // Pull a clean filename out of an artifact claim when it matches the
  // adapter's "Parsed <category> artifact provided: <filename>" shape;
  // fall back to a trimmed claim otherwise. Used to render concise file
  // lists in the rationale instead of repeating the full claim string.
  const filenameFor = (claim: string): string => {
    const m = claim.match(/^Parsed\s+\S+\s+artifact provided:\s+(.+)$/);
    return (m?.[1] ?? claim).trim();
  };
  const supportingFiles = supporting.map((a) => filenameFor(a.claim));
  const contradictingFiles = contradicting.map((a) => filenameFor(a.claim));
  const intakeReasons = bucket.intake.map((s) => s.reason).filter(Boolean);

  if (hasIntake && !hasArtifact) {
    // Intake-only branch — hard-capped range, LOW confidence.
    score = clamp(BASELINE + intakeDelta, INTAKE_FLOOR, INTAKE_CEIL);
    source_mix = "intake_only";
    confidence = "LOW";
    const reasonText =
      intakeReasons.length > 0 ? ` Reasons: ${intakeReasons.join("; ")}.` : "";
    rationaleParts.push(
      `Score derived from ${bucket.intake.length} intake response${bucket.intake.length === 1 ? "" : "s"}; no uploaded artifact yet, so the score is bounded between ${INTAKE_FLOOR} and ${INTAKE_CEIL}.${reasonText}`,
    );
  } else if (!hasIntake && hasArtifact) {
    // Artifact-only branch.
    score = clamp(BASELINE + artifactDelta + contradictionPenalty, 0, 5);
    source_mix = contradiction_flag ? "contradictory" : "artifact_only";
    confidence = artifactConfidence(supporting.length, contradicting.length);
    if (contradiction_flag) {
      rationaleParts.push(
        `${contradicting.length} uploaded artifact${contradicting.length === 1 ? "" : "s"} contradict the available intake claims; artifact evidence takes priority. Conflicting items: ${contradictingFiles.join(", ")}.`,
      );
    } else {
      const fileList =
        supportingFiles.length > 0 ? `: ${supportingFiles.join(", ")}` : "";
      rationaleParts.push(
        `${supporting.length} uploaded artifact${supporting.length === 1 ? "" : "s"} support this score${fileList}.`,
      );
    }
  } else if (hasIntake && hasArtifact) {
    // Both present — artifacts take priority.
    if (contradiction_flag) {
      score = clamp(BASELINE + artifactDelta + contradictionPenalty, 0, 5);
      source_mix = "contradictory";
      confidence = contradicting.length >= 2 ? "HIGH" : "MEDIUM";
      rationaleParts.push(
        `${contradicting.length} uploaded artifact${contradicting.length === 1 ? "" : "s"} contradict ${bucket.intake.length} intake response${bucket.intake.length === 1 ? "" : "s"}; artifact evidence takes priority. Conflicting items: ${contradictingFiles.join(", ")}.`,
      );
    } else {
      score = clamp(BASELINE + artifactDelta, 0, 5);
      source_mix = "artifact_supported";
      confidence = artifactConfidence(supporting.length, 0);
      const fileList =
        supportingFiles.length > 0 ? `: ${supportingFiles.join(", ")}` : "";
      rationaleParts.push(
        `${supporting.length} uploaded artifact${supporting.length === 1 ? "" : "s"} validate ${bucket.intake.length} intake response${bucket.intake.length === 1 ? "" : "s"}${fileList}.`,
      );
    }
  } else {
    // Reviewer-note only. Treat as insufficient evidence; the reviewer
    // can nudge from baseline but the source_mix reflects the lack of
    // substantive intake/artifact support.
    score = BASELINE;
    source_mix = "insufficient";
    confidence = "LOW";
    rationaleParts.push(
      "No intake responses or uploaded artifacts back this sub-criterion yet.",
    );
  }

  // Missing-evidence cap.
  if (!hasArtifact && score > NO_ARTIFACT_CAP) {
    score = NO_ARTIFACT_CAP;
    rationaleParts.push(
      `Score capped at ${NO_ARTIFACT_CAP} — high scores require at least one supporting uploaded artifact.`,
    );
  }

  // Reviewer note (bounded, applied after caps so it can nudge within
  // the allowed band but not above the missing-evidence cap).
  if (bucket.reviewer) {
    const d = clamp(bucket.reviewer.delta, -REVIEWER_NOTE_CLAMP, REVIEWER_NOTE_CLAMP);
    score = clamp(score + d, 0, 5);
    const sign = d >= 0 ? "+" : "";
    rationaleParts.push(
      `Reviewer adjusted by ${sign}${d.toFixed(2)}: ${bucket.reviewer.rationale}`,
    );
    // Reviewer notes cannot break the "no artifact → ≤3" guardrail.
    if (!hasArtifact && score > NO_ARTIFACT_CAP) {
      score = NO_ARTIFACT_CAP;
    }
  }

  // Final 4–5 guardrail: scores ≥4 require at least one supporting
  // artifact (not merely a contradicting one).
  if (score >= HIGH_BAND_FLOOR && supporting.length === 0) {
    score = HIGH_BAND_FLOOR - 0.5; // demote to 3.5
    rationaleParts.push(
      `Score lowered to ${HIGH_BAND_FLOOR - 0.5} — scores of ${HIGH_BAND_FLOOR} or higher require at least one supporting uploaded artifact.`,
    );
  }

  // Final clamp + snap.
  score = snapHalf(clamp(score, 0, 5));

  // The per-signal dump that previously appended `[intake] …` and
  // `[artifact · supports (high)] …` lines made the rationale unreadable.
  // The full evidence list is still surfaced via `evidence_references`
  // below for audit / programmatic consumers; the human-facing rationale
  // stays as a single natural-language paragraph.

  return {
    name,
    dimension,
    sub_criterion,
    score,
    confidence,
    source_mix,
    contradiction_flag,
    evidence_references: bucket.artifacts.map((a) => a.id),
    rationale: rationaleParts.join(" "),
  };
}

// ── Main entry point ─────────────────────────────────────────────────

export function runScoringEngine(
  input: ScoringEngineInput,
): ScoringEngineOutput {
  // Seed a bucket for every sub-criterion so the output always covers
  // the full rubric (callers can rely on a complete scorecard).
  const buckets = new Map<string, Bucket>();
  for (const dim of SCORING_DIMENSIONS) {
    for (const sub of dim.sub_criteria) {
      buckets.set(subKey(dim.key, sub.key), { intake: [], artifacts: [] });
    }
  }

  // Apply intake rules (deterministic iteration — INTAKE_RULES order).
  const intakeByField = new Map<string, IntakeResponse>();
  for (const r of input.intake) {
    intakeByField.set(r.field, r);
  }
  for (const rule of INTAKE_RULES) {
    const resp = intakeByField.get(rule.field);
    if (!resp) continue;
    const signals = rule.apply(resp.value);
    for (const sig of signals) {
      const key = subKey(sig.dimension, sig.sub_criterion);
      const b = buckets.get(key);
      if (!b) continue; // silently ignore unknown sub-criteria (defensive)
      b.intake.push(sig);
    }
  }

  // Bucket artifacts in deterministic order.
  const sortedArtifacts = [...input.artifacts].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const a of sortedArtifacts) {
    const b = buckets.get(subKey(a.dimension, a.sub_criterion));
    if (!b) continue;
    b.artifacts.push(a);
  }

  // Reviewer notes — last-wins if multiple are supplied for the same
  // sub-criterion, resolved by ascending rationale to stay deterministic.
  const sortedNotes = [...(input.reviewer_notes ?? [])].sort((a, b) =>
    `${subKey(a.dimension, a.sub_criterion)}::${a.rationale}`.localeCompare(
      `${subKey(b.dimension, b.sub_criterion)}::${b.rationale}`,
    ),
  );
  for (const n of sortedNotes) {
    const b = buckets.get(subKey(n.dimension, n.sub_criterion));
    if (!b) continue;
    b.reviewer = n;
  }

  // Evaluate.
  const sub_criteria: SubCriterionEngineOutput[] = [];
  for (const dim of SCORING_DIMENSIONS) {
    for (const sub of dim.sub_criteria) {
      const bucket = buckets.get(subKey(dim.key, sub.key))!;
      sub_criteria.push(evaluateSub(dim.key, sub.key, bucket));
    }
  }

  return {
    sub_criteria,
    inputs_hash: hashInput(input),
    schema_version: ENGINE_SCHEMA_VERSION,
  };
}

// ── Adapter: engine output → operator-facing Score[] ─────────────────

/**
 * Convert engine output into the `Score[]` shape consumed by the
 * existing `ScoringPanel` and the `calculateCompositeScore` calculator.
 * This lets the deterministic engine feed the existing UI without a
 * parallel rendering path.
 *
 * The operator rationale is drawn from the engine rationale (≥20 chars
 * is enforced by padding with the source_mix label when necessary, so
 * the existing DB CHECK constraint does not reject engine-generated
 * rows).
 */
export function engineOutputToScores(
  engagementId: string,
  output: ScoringEngineOutput,
  now: string = "1970-01-01T00:00:00.000Z",
): Array<{
  id: string;
  engagement_id: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  score_0_to_5: number;
  weight: number;
  operator_rationale: string;
  evidence_citations: { document_id: string; filename: string; location: string; excerpt: string }[];
  pattern_match_case_id: null;
  created_at: string;
  updated_at: string;
  updated_by: null;
}> {
  return output.sub_criteria.map((s) => {
    const rationale =
      s.rationale.length >= 20
        ? s.rationale
        : `${s.rationale} (engine source_mix=${s.source_mix}).`;
    return {
      id: `engine-${s.dimension}-${s.sub_criterion}`,
      engagement_id: engagementId,
      dimension: s.dimension,
      sub_criterion: s.sub_criterion,
      score_0_to_5: s.score,
      weight: 1,
      operator_rationale: rationale,
      evidence_citations: s.evidence_references.map((id) => ({
        document_id: id,
        filename: id,
        location: "",
        excerpt: "",
      })),
      pattern_match_case_id: null,
      created_at: now,
      updated_at: now,
      updated_by: null,
    };
  });
}
