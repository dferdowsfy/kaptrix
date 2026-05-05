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
 * Map any scoring-engine decision label to one of the four official
 * report recommendations. Covers both the legacy short labels (Proceed
 * / Pause / Pass) and the modern decision set (Invest, Invest with
 * conditions, Hold, Continue, Stall, Double-down, Wind-down plan, Do
 * not invest, Stall & re-diligence). Unknown labels return null so
 * callers can decide whether to fall back to a composite-derived label.
 */
function normalizeRecommendation(
  raw: string | null | undefined,
): RecommendationLabel | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (!v) return null;
  // Strong positive — proceed without conditions.
  if (v === "invest" || v === "continue" || v === "double-down" || v === "double down" || v === "proceed") {
    return "Proceed";
  }
  // Positive with conditions.
  if (
    v.includes("with conditions") ||
    v.includes("conditional") ||
    v.startsWith("proceed with") ||
    v === "hold" ||
    v === "stall"
  ) {
    return "Proceed with Conditions";
  }
  // Pause / re-diligence — needs more evidence before deciding.
  if (
    v.startsWith("pause") ||
    v.includes("pending") ||
    v.includes("re-diligence") ||
    v.includes("rediligence")
  ) {
    return "Pause Pending Evidence";
  }
  // Hard no.
  if (
    v === "pass" ||
    v.startsWith("do not") ||
    v.includes("decline") ||
    v.includes("wind-down") ||
    v.includes("wind down")
  ) {
    return "Do Not Proceed Based on Current Evidence";
  }
  return null;
}

/**
 * Derive a recommendation from the composite score when no textual
 * label is available (or the label was unrecognized). Mirrors the
 * scoring calculator's own thresholds (invest_floor=3.5,
 * do_not_invest_ceiling=2.5) so the report doesn't drift from the
 * Scoring tab.
 */
function recommendationFromComposite(composite: number): RecommendationLabel {
  if (composite >= 3.5) return "Proceed";
  if (composite >= 2.5) return "Proceed with Conditions";
  if (composite >= 1.5) return "Pause Pending Evidence";
  return "Do Not Proceed Based on Current Evidence";
}

/**
 * Map the executive-report confidence band ("High" / "Moderate" /
 * "Developing") to a 0–100 number for the snapshot card. If the
 * scoring engine ever exposes a numeric confidence, prefer that.
 * Returns null when no usable signal is present so the caller can
 * fall back to a composite-derived value.
 */
function normalizeConfidence(raw: string | number | null | undefined): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(100, Math.round(raw)));
  }
  const s = (raw ?? "").toString().trim();
  if (!s) return null;
  // Numeric strings like "75", "75/100", "75%".
  const numMatch = s.match(/-?\d+(?:\.\d+)?/);
  if (numMatch) {
    const n = parseFloat(numMatch[0]);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  }
  const v = s.toLowerCase();
  if (v === "high" || v === "strong") return 80;
  if (v === "moderate" || v === "medium") return 55;
  if (v === "developing" || v === "low" || v === "weak") return 30;
  return null;
}

/**
 * Derive a 0–100 confidence from the composite score (0–5) when the
 * textual band is missing or unrecognized. A 4.5 composite should
 * produce a high confidence in the snapshot card, not the legacy
 * default of 30.
 */
function confidenceFromComposite(composite: number): number {
  if (composite >= 4.5) return 85;
  if (composite >= 4.0) return 75;
  if (composite >= 3.5) return 65;
  if (composite >= 3.0) return 55;
  if (composite >= 2.5) return 45;
  if (composite >= 2.0) return 35;
  return 25;
}

/**
 * Derive the risk posture from the composite score (0–5) and the
 * recommendation. The composite is preferred when present because the
 * scoring engine's thresholds drive both axes; the recommendation is
 * a tiebreaker for missing-composite cases.
 */
function derivePosture(
  composite: number | null,
  recommendation: RecommendationLabel,
): RiskPosture {
  if (typeof composite === "number" && Number.isFinite(composite)) {
    if (composite >= 4) return "LOW";
    if (composite >= 3) return "MEDIUM";
    if (composite >= 2) return "HIGH";
    return "CRITICAL";
  }
  if (recommendation === "Do Not Proceed Based on Current Evidence") return "CRITICAL";
  if (recommendation === "Pause Pending Evidence") return "HIGH";
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

/** Live scoring overlay loaded from the knowledge_base workspace state.
 *  When present, these values take precedence over the seeded
 *  snapshot.executiveReport — that cached object never gets refreshed
 *  when the operator re-runs scoring, so reading it in isolation is
 *  what produced "Confidence: 30/100" on every report. */
interface LiveScoringOverlay {
  composite_score?: number | null;
  decision_band?: string | null;
  dimension_scores?: Record<string, number> | null;
  generated_at?: string | null;
}

export function buildScoringSourceOfTruth(
  snapshot: SnapshotLike,
  liveScoring?: LiveScoringOverlay | null,
): ScoringSourceOfTruth {
  const rep = snapshot.executiveReport ?? {};
  // Composite: prefer live scoring (the Scoring tab is the source of
  // truth) and fall back to the cached snapshot value.
  const liveComposite =
    typeof liveScoring?.composite_score === "number" &&
    Number.isFinite(liveScoring.composite_score)
      ? liveScoring.composite_score
      : null;
  const composite =
    liveComposite ??
    (typeof rep.composite_score === "number" && rep.composite_score > 0
      ? rep.composite_score
      : null);

  // Recommendation: prefer the live decision band, then the cached
  // textual label, then a composite-derived label. The previous
  // behavior coerced any unrecognized label (e.g. "Invest") to
  // "Pause Pending Evidence", which dragged the brief into a HIGH
  // posture reading.
  const fromLive = normalizeRecommendation(liveScoring?.decision_band);
  const fromCached = normalizeRecommendation(rep.recommendation);
  const recommendation: RecommendationLabel =
    fromLive ??
    fromCached ??
    (typeof composite === "number" && Number.isFinite(composite)
      ? recommendationFromComposite(composite)
      : "Pause Pending Evidence");

  // Confidence: prefer an explicit numeric/textual band when present
  // and recognized; otherwise derive from the composite so a 4.5/5
  // composite no longer yields a 30/100 confidence.
  const explicitConfidence = normalizeConfidence(rep.confidence);
  const confidence_score =
    explicitConfidence ??
    (typeof composite === "number" && Number.isFinite(composite)
      ? confidenceFromComposite(composite)
      : 0);

  // Dimension scores: prefer the live overlay so re-runs of scoring
  // are reflected even when the cached snapshot.executiveReport.
  // dimension_scores is stale.
  const liveDims =
    liveScoring?.dimension_scores && Object.keys(liveScoring.dimension_scores).length > 0
      ? (liveScoring.dimension_scores as Record<ScoreDimension, number>)
      : null;
  const dimension_scores = liveDims ?? rep.dimension_scores ?? null;

  return {
    client_id: snapshot.engagement.id,
    company_name: snapshot.engagement.target_company_name,
    composite_score: composite,
    recommendation,
    risk_posture: derivePosture(composite, recommendation),
    confidence_score,
    dimension_scores,
    scoring_timestamp:
      liveScoring?.generated_at ??
      rep.generated_at ??
      new Date().toISOString(),
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
    // Only flag when we recognized the emitted label and it disagrees.
    // Unknown labels are not auto-flagged here (the SOT block forces
    // the model to emit one of the four canonical labels).
    if (norm !== null && norm !== sot.recommendation) {
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
