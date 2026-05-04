// Scoring Source of Truth (SOT)
//
// Every advanced report must be aligned to a single, authoritative
// scoring decision — the values produced by the scoring engine and
// shown on the platform Scoring page. Reports may add narrative
// conditions and caveats, but they must NOT contradict the SOT
// recommendation, posture, confidence, or dimension scores.
//
// This module:
//   1. Reads the SOT off the engagement snapshot (executiveReport).
//   2. Formats it as a labeled block injected at the top of the LLM
//      user prompt so the model can never miss it.
//   3. Validates the LLM output against it after generation.

import type { ScoreDimension } from "@/lib/types";

export type RecommendationLabel =
  | "Proceed"
  | "Proceed with Conditions"
  | "Pause Pending Evidence"
  | "Do Not Proceed Based on Current Evidence";

export type RiskPosture = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface ScoringSourceOfTruth {
  client_id: string;
  company_name: string;
  composite_score: number | null;
  recommendation: RecommendationLabel;
  risk_posture: RiskPosture;
  confidence_score: number; // 0–100
  dimension_scores: Record<ScoreDimension, number> | null;
  scoring_timestamp: string;
  scoring_version: number;
}

/**
 * Map the executive-report short labels (Proceed / Proceed with
 * conditions / Pause / Pass) to the four official report labels.
 */
function normalizeRecommendation(raw: string | null | undefined): RecommendationLabel {
  const v = (raw ?? "").trim().toLowerCase();
  if (v.startsWith("proceed with") || v.includes("conditional")) return "Proceed with Conditions";
  if (v === "proceed") return "Proceed";
  if (v.startsWith("pause") || v.includes("pending")) return "Pause Pending Evidence";
  if (v === "pass" || v.startsWith("do not") || v.includes("decline"))
    return "Do Not Proceed Based on Current Evidence";
  // No scoring decision yet → default to the most cautious label.
  return "Pause Pending Evidence";
}

/**
 * Map the executive-report confidence band ("High" / "Moderate" /
 * "Developing") to a 0–100 number for the snapshot card. If the
 * scoring engine ever exposes a numeric confidence, prefer that.
 */
function normalizeConfidence(raw: string | number | null | undefined): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  const v = (raw ?? "").toString().trim().toLowerCase();
  if (v === "high") return 80;
  if (v === "moderate") return 55;
  if (v === "developing") return 30;
  return 0;
}

/**
 * Derive the risk posture from the composite score (0–5) and the
 * recommendation. The scoring engine doesn't expose a posture today,
 * so we compute one consistent with the recommendation.
 */
function derivePosture(
  composite: number | null,
  recommendation: RecommendationLabel,
): RiskPosture {
  if (recommendation === "Do Not Proceed Based on Current Evidence") return "CRITICAL";
  if (recommendation === "Pause Pending Evidence") return "HIGH";
  if (typeof composite === "number" && Number.isFinite(composite)) {
    if (composite >= 4) return "LOW";
    if (composite >= 3) return "MEDIUM";
    if (composite >= 2) return "HIGH";
    return "CRITICAL";
  }
  return recommendation === "Proceed" ? "LOW" : "MEDIUM";
}

interface SnapshotLike {
  engagement: { id: string; target_company_name: string };
  executiveReport: {
    composite_score?: number | null;
    recommendation?: string | null;
    confidence?: string | number | null;
    dimension_scores?: Record<ScoreDimension, number> | null;
    version?: number;
    generated_at?: string;
  };
}

export function buildScoringSourceOfTruth(snapshot: SnapshotLike): ScoringSourceOfTruth {
  const rep = snapshot.executiveReport ?? {};
  const recommendation = normalizeRecommendation(rep.recommendation);
  const composite = typeof rep.composite_score === "number" ? rep.composite_score : null;
  return {
    client_id: snapshot.engagement.id,
    company_name: snapshot.engagement.target_company_name,
    composite_score: composite,
    recommendation,
    risk_posture: derivePosture(composite, recommendation),
    confidence_score: normalizeConfidence(rep.confidence),
    dimension_scores: rep.dimension_scores ?? null,
    scoring_timestamp: rep.generated_at ?? new Date().toISOString(),
    scoring_version: rep.version ?? 1,
  };
}

/**
 * Format the SOT as a labeled block to inject at the top of the user
 * prompt so the LLM sees it before the evidence context.
 */
export function formatScoringSourceOfTruthForPrompt(sot: ScoringSourceOfTruth): string {
  const ds = sot.dimension_scores;
  const dims = ds
    ? [
        `  product_credibility: ${ds.product_credibility?.toFixed(1) ?? "—"}`,
        `  tooling_exposure: ${ds.tooling_exposure?.toFixed(1) ?? "—"}`,
        `  data_sensitivity: ${ds.data_sensitivity?.toFixed(1) ?? "—"}`,
        `  governance_safety: ${ds.governance_safety?.toFixed(1) ?? "—"}`,
        `  production_readiness: ${ds.production_readiness?.toFixed(1) ?? "—"}`,
        `  open_validation: ${ds.open_validation?.toFixed(1) ?? "—"}`,
      ].join("\n")
    : "  (no operator scoring on file — derive preliminary scores)";
  const composite =
    typeof sot.composite_score === "number" ? sot.composite_score.toFixed(1) : "—";
  return [
    `SCORING SOURCE OF TRUTH — use these values verbatim. The Scoring page is the authoritative source for the report's recommendation, risk posture, confidence, and dimension scores. Narrative may add conditions or caveats, but it must NEVER contradict these values.`,
    `recommendation: ${sot.recommendation}`,
    `risk_posture: ${sot.risk_posture}`,
    `confidence_score: ${sot.confidence_score}/100`,
    `composite_score: ${composite}/5`,
    `dimension_scores:\n${dims}`,
    `scoring_timestamp: ${sot.scoring_timestamp}`,
    `scoring_version: ${sot.scoring_version}`,
  ].join("\n");
}

/**
 * Inspect generated report content for the values the LLM emitted in
 * the Decision Snapshot block (recommendation, posture, confidence)
 * and compare them to the SOT. Returns a list of mismatches; an
 * empty list means the output is aligned.
 *
 * Only enforced for sections that emit the snapshot (typically the
 * "snapshot" section); for other sections the function returns no
 * mismatches because there's nothing to compare.
 */
export function detectSotMismatch(
  content: string,
  sot: ScoringSourceOfTruth,
): string[] {
  const issues: string[] = [];
  const lower = content.toLowerCase();

  // Only validate when the snapshot block (or recommendation prose)
  // is present in this content slice. Other sections won't have
  // recommendation/posture/confidence fields to check.
  const hasSnapshotBlock = /:::\s*snapshot/i.test(content);
  const hasRecommendationLine = /^\s*recommendation\s*:/im.test(content);
  if (!hasSnapshotBlock && !hasRecommendationLine) return issues;

  // Recommendation
  const recRe = /(?:^|\n)\s*recommendation\s*:\s*([^\n]+)/i;
  const recMatch = content.match(recRe);
  if (recMatch) {
    const emitted = recMatch[1].trim();
    const norm = normalizeRecommendation(emitted);
    if (norm !== sot.recommendation) {
      issues.push(
        `recommendation mismatch — report emitted "${emitted}", scoring source of truth says "${sot.recommendation}"`,
      );
    }
  }

  // Risk posture (snapshot uses "posture: …", IC Read uses "Technical / AI Risk Posture: …")
  const postureRe =
    /(?:^|\n)\s*(?:posture|technical\s*\/?\s*ai risk posture|risk posture)\s*:\s*([^\n]+)/i;
  const postureMatch = content.match(postureRe);
  if (postureMatch) {
    const emitted = postureMatch[1].trim().toUpperCase();
    // Posture may be "LOW" / "MEDIUM" / "HIGH" / "CRITICAL" or words like "Moderate".
    const map: Record<string, RiskPosture> = {
      LOW: "LOW",
      MODERATE: "MEDIUM",
      MEDIUM: "MEDIUM",
      HIGH: "HIGH",
      CRITICAL: "CRITICAL",
    };
    const normalized =
      Object.keys(map).find((k) => emitted.includes(k)) ?? null;
    if (normalized && map[normalized] !== sot.risk_posture) {
      issues.push(
        `risk posture mismatch — report emitted "${emitted}", scoring source of truth says "${sot.risk_posture}"`,
      );
    }
  }

  // Confidence
  const confRe = /(?:^|\n)\s*confidence(?:\s*score)?\s*:\s*(\d{1,3})/i;
  const confMatch = content.match(confRe);
  if (confMatch) {
    const emitted = parseInt(confMatch[1], 10);
    if (
      Number.isFinite(emitted) &&
      Math.abs(emitted - sot.confidence_score) > 5
    ) {
      issues.push(
        `confidence mismatch — report emitted ${emitted}/100, scoring source of truth says ${sot.confidence_score}/100`,
      );
    }
  }

  // Catch obvious prose contradictions like "High-Risk — Fix Before Moving Forward"
  // when the SOT recommendation is Proceed / Proceed with Conditions.
  if (
    sot.recommendation === "Proceed" ||
    sot.recommendation === "Proceed with Conditions"
  ) {
    if (
      lower.includes("high-risk — fix before moving forward") ||
      lower.includes("do not proceed") ||
      lower.includes("walk away")
    ) {
      // The walk-away SECTION is allowed to discuss walk-away
      // conditions — only flag when the prose mirrors a different
      // top-line recommendation.
      const beforeWalkAway = lower.split("what would walk this away")[0];
      if (
        beforeWalkAway.includes("high-risk — fix before moving forward") ||
        beforeWalkAway.includes("do not proceed")
      ) {
        issues.push(
          `narrative contradicts scoring source of truth — recommendation should be "${sot.recommendation}" but the prose argues against proceeding`,
        );
      }
    }
  }

  return issues;
}
