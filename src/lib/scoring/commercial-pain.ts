/**
 * Commercial Pain Confidence — deterministic scoring layer.
 *
 * This sits alongside, NOT inside, the six-dimension AI Diligence Score
 * in `calculator.ts`. The two scores are reported separately and never
 * combined. No LLM is consulted to assign the numeric value; the LLM
 * (or operator) supplies categorical answers that map through fixed
 * enums into a 0–100 confidence figure.
 *
 * Returns `null` when no answers are provided so legacy engagements
 * predating this layer surface as "Not yet completed" instead of failing.
 */

export type PainSeverity =
  | "mission_critical"
  | "high"
  | "moderate"
  | "low"
  | "unclear";

export type PainFrequency =
  | "daily_or_continuous"
  | "weekly"
  | "monthly"
  | "occasional"
  | "one_time_or_rare"
  | "unclear";

export type SolutionFit =
  | "directly_solves"
  | "major_part"
  | "narrow_part"
  | "adjacent"
  | "unclear_connection"
  | "does_not_solve";

export type AINecessity = "yes" | "mostly" | "partially" | "weakly" | "no" | "unknown";

export type OutcomeProof =
  | "customer_data"
  | "case_studies"
  | "usage_metrics"
  | "testimonials"
  | "management_only"
  | "not_proven"
  | "unknown";

export type BuyingUrgency =
  | "immediate"
  | "near_term"
  | "medium_term"
  | "long_term"
  | "no_urgency"
  | "unknown";

export type CustomerDemandEvidenceTag =
  | "paying_customers"
  | "signed_contracts"
  | "renewal_expansion"
  | "usage_metrics"
  | "case_studies"
  | "testimonials"
  | "customer_interviews"
  | "pipeline_lois"
  | "founder_claims_only";

/**
 * Where the categorical answers came from. Reported on the result so the
 * UI can label the score "intake-only claims" vs "artifact-backed support".
 *
 * - "intake": founder/management answered the questionnaire; nothing in
 *   the document corpus corroborates the answers yet.
 * - "artifact_backed": every answered factor is supported by an uploaded
 *   artifact (contract, usage report, customer interview transcript, etc.)
 * - "mixed": at least one answered factor has artifact support and at
 *   least one does not.
 */
export type CommercialPainEvidenceSource = "intake" | "artifact_backed" | "mixed";

export interface CommercialPainInputs {
  pain_severity?: PainSeverity | null;
  pain_frequency?: PainFrequency | null;
  solution_fit?: SolutionFit | null;
  ai_necessity?: AINecessity | null;
  outcome_proof?: OutcomeProof | null;
  buying_urgency?: BuyingUrgency | null;
  customer_demand_evidence?: CustomerDemandEvidenceTag[] | null;
  /**
   * Optional list of factors that have artifact support backing the
   * answer. Used to derive the `evidence_source` reported on the result.
   * Anything not in this list is assumed to be intake-only.
   */
  artifact_backed_factors?: CommercialPainFactor[] | null;
}

export type CommercialPainBand = "strong" | "moderate" | "weak" | "not_validated";

export type CommercialPainFactor =
  | "pain_severity"
  | "pain_frequency"
  | "solution_fit"
  | "ai_necessity"
  | "outcome_proof"
  | "buying_urgency"
  | "customer_demand_evidence";

export interface CommercialPainFactorBreakdown {
  raw: number; // 0–5
  weighted: number; // factor's contribution to the 0–100 total
}

export type CommercialPainBreakdown = Record<
  CommercialPainFactor,
  CommercialPainFactorBreakdown
>;

export interface CommercialPainDriver {
  factor: CommercialPainFactor;
  label: string;
  weighted: number;
  raw: number;
}

export interface CommercialPainResult {
  score: number; // 0–100, integer
  band: CommercialPainBand;
  band_label: string;
  breakdown: CommercialPainBreakdown;
  /** Top weighted contributors, descending. Excludes factors with raw=0. */
  top_drivers: CommercialPainDriver[];
  /** Factors with no answer or a "raw=0" answer (unclear / unknown / not proven). */
  missing_factors: CommercialPainFactor[];
  /** Whether the score reflects intake-only claims, mixed, or artifact-backed support. */
  evidence_source: CommercialPainEvidenceSource;
}

export const COMMERCIAL_PAIN_FACTOR_LABELS: Record<CommercialPainFactor, string> = {
  pain_severity: "Pain severity",
  pain_frequency: "Pain frequency",
  solution_fit: "Solution fit",
  ai_necessity: "AI necessity",
  outcome_proof: "Outcome proof",
  buying_urgency: "Buying urgency",
  customer_demand_evidence: "Customer demand evidence",
};

const PAIN_SEVERITY_MAP: Record<PainSeverity, number> = {
  mission_critical: 5,
  high: 4,
  moderate: 3,
  low: 1,
  unclear: 0,
};

const PAIN_FREQUENCY_MAP: Record<PainFrequency, number> = {
  daily_or_continuous: 5,
  weekly: 4,
  monthly: 3,
  occasional: 2,
  one_time_or_rare: 1,
  unclear: 0,
};

const SOLUTION_FIT_MAP: Record<SolutionFit, number> = {
  directly_solves: 5,
  major_part: 4,
  narrow_part: 3,
  adjacent: 2,
  unclear_connection: 1,
  does_not_solve: 0,
};

const AI_NECESSITY_MAP: Record<AINecessity, number> = {
  yes: 5,
  mostly: 4,
  partially: 3,
  weakly: 2,
  no: 0,
  unknown: 0,
};

const OUTCOME_PROOF_MAP: Record<OutcomeProof, number> = {
  customer_data: 5,
  case_studies: 4,
  usage_metrics: 3,
  testimonials: 2,
  management_only: 1,
  not_proven: 0,
  unknown: 0,
};

const BUYING_URGENCY_MAP: Record<BuyingUrgency, number> = {
  immediate: 5,
  near_term: 4,
  medium_term: 3,
  long_term: 2,
  no_urgency: 1,
  unknown: 0,
};

const HIGH_QUALITY_EVIDENCE: ReadonlySet<CustomerDemandEvidenceTag> = new Set([
  "paying_customers",
  "signed_contracts",
  "renewal_expansion",
  "usage_metrics",
]);

const MEDIUM_QUALITY_EVIDENCE: ReadonlySet<CustomerDemandEvidenceTag> = new Set([
  "case_studies",
  "testimonials",
  "customer_interviews",
  "pipeline_lois",
]);

const LOW_QUALITY_EVIDENCE: ReadonlySet<CustomerDemandEvidenceTag> = new Set([
  "founder_claims_only",
]);

export const COMMERCIAL_PAIN_WEIGHTS: Record<CommercialPainFactor, number> = {
  pain_severity: 0.2,
  pain_frequency: 0.1,
  solution_fit: 0.2,
  ai_necessity: 0.15,
  outcome_proof: 0.15,
  buying_urgency: 0.1,
  customer_demand_evidence: 0.1,
};

function scoreCustomerDemandEvidence(
  tags: CustomerDemandEvidenceTag[] | null | undefined,
): number {
  if (!tags || tags.length === 0) return 0;
  // The highest tier present wins — a deck with paying customers AND a
  // founder claim should not be averaged down by the founder claim.
  if (tags.some((t) => HIGH_QUALITY_EVIDENCE.has(t))) return 5;
  if (tags.some((t) => MEDIUM_QUALITY_EVIDENCE.has(t))) return 3;
  if (tags.some((t) => LOW_QUALITY_EVIDENCE.has(t))) return 1;
  return 0;
}

function bandFor(score: number): { band: CommercialPainBand; label: string } {
  if (score >= 80) return { band: "strong", label: "Strong" };
  if (score >= 60) return { band: "moderate", label: "Moderate" };
  if (score >= 40) return { band: "weak", label: "Weak" };
  return { band: "not_validated", label: "Not Validated" };
}

function hasAnyInput(inputs: CommercialPainInputs): boolean {
  return (
    inputs.pain_severity != null ||
    inputs.pain_frequency != null ||
    inputs.solution_fit != null ||
    inputs.ai_necessity != null ||
    inputs.outcome_proof != null ||
    inputs.buying_urgency != null ||
    (inputs.customer_demand_evidence != null &&
      inputs.customer_demand_evidence.length > 0)
  );
}

function weightedContribution(raw: number, weight: number): number {
  // Each factor's raw is 0–5; it contributes (raw / 5) * weight * 100 to
  // the 0–100 total. Equivalent to raw * 20 * weight.
  return (raw / 5) * weight * 100;
}

/**
 * Compute Commercial Pain Confidence (0–100). Pure and deterministic:
 * the same inputs always produce the same score.
 *
 * Returns null when the engagement has provided no answers at all so
 * legacy records show "Not yet completed" rather than a misleading 0.
 */
export function calculateCommercialPainConfidence(
  inputs: CommercialPainInputs | null | undefined,
): CommercialPainResult | null {
  if (!inputs || !hasAnyInput(inputs)) return null;

  const severity = inputs.pain_severity ? PAIN_SEVERITY_MAP[inputs.pain_severity] : 0;
  const frequency = inputs.pain_frequency
    ? PAIN_FREQUENCY_MAP[inputs.pain_frequency]
    : 0;
  const fit = inputs.solution_fit ? SOLUTION_FIT_MAP[inputs.solution_fit] : 0;
  const necessity = inputs.ai_necessity ? AI_NECESSITY_MAP[inputs.ai_necessity] : 0;
  const proof = inputs.outcome_proof ? OUTCOME_PROOF_MAP[inputs.outcome_proof] : 0;
  const urgency = inputs.buying_urgency ? BUYING_URGENCY_MAP[inputs.buying_urgency] : 0;
  const demand = scoreCustomerDemandEvidence(inputs.customer_demand_evidence);

  const breakdown: CommercialPainBreakdown = {
    pain_severity: {
      raw: severity,
      weighted: weightedContribution(severity, COMMERCIAL_PAIN_WEIGHTS.pain_severity),
    },
    pain_frequency: {
      raw: frequency,
      weighted: weightedContribution(
        frequency,
        COMMERCIAL_PAIN_WEIGHTS.pain_frequency,
      ),
    },
    solution_fit: {
      raw: fit,
      weighted: weightedContribution(fit, COMMERCIAL_PAIN_WEIGHTS.solution_fit),
    },
    ai_necessity: {
      raw: necessity,
      weighted: weightedContribution(necessity, COMMERCIAL_PAIN_WEIGHTS.ai_necessity),
    },
    outcome_proof: {
      raw: proof,
      weighted: weightedContribution(proof, COMMERCIAL_PAIN_WEIGHTS.outcome_proof),
    },
    buying_urgency: {
      raw: urgency,
      weighted: weightedContribution(urgency, COMMERCIAL_PAIN_WEIGHTS.buying_urgency),
    },
    customer_demand_evidence: {
      raw: demand,
      weighted: weightedContribution(
        demand,
        COMMERCIAL_PAIN_WEIGHTS.customer_demand_evidence,
      ),
    },
  };

  const total = (Object.values(breakdown) as CommercialPainFactorBreakdown[]).reduce(
    (sum, entry) => sum + entry.weighted,
    0,
  );
  const score = Math.round(total);
  const { band, label } = bandFor(score);

  // Top drivers: highest weighted contributors with raw > 0. We surface
  // up to 3 so the UI can answer "what's pushing this score up?" at a
  // glance without dumping the full breakdown.
  const factors: CommercialPainFactor[] = [
    "pain_severity",
    "pain_frequency",
    "solution_fit",
    "ai_necessity",
    "outcome_proof",
    "buying_urgency",
    "customer_demand_evidence",
  ];
  const top_drivers: CommercialPainDriver[] = factors
    .map((factor) => ({
      factor,
      label: COMMERCIAL_PAIN_FACTOR_LABELS[factor],
      raw: breakdown[factor].raw,
      weighted: breakdown[factor].weighted,
    }))
    .filter((d) => d.raw > 0)
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, 3);

  // Missing factors: anything still at raw 0 — either unanswered, or
  // explicitly answered as unclear/unknown/not-proven. Both indicate the
  // operator should chase more evidence before trusting the score.
  const missing_factors = factors.filter((factor) => breakdown[factor].raw === 0);

  // Evidence source: derived from `artifact_backed_factors` against the
  // set of answered factors (raw > 0). Empty list (or undefined) is
  // treated as intake-only.
  const answeredFactors = new Set(factors.filter((f) => breakdown[f].raw > 0));
  const artifactBacked = new Set(inputs.artifact_backed_factors ?? []);
  const answeredAndBacked = [...answeredFactors].filter((f) => artifactBacked.has(f));
  let evidence_source: CommercialPainEvidenceSource;
  if (answeredAndBacked.length === 0) {
    evidence_source = "intake";
  } else if (answeredAndBacked.length === answeredFactors.size) {
    evidence_source = "artifact_backed";
  } else {
    evidence_source = "mixed";
  }

  return {
    score,
    band,
    band_label: label,
    breakdown,
    top_drivers,
    missing_factors,
    evidence_source,
  };
}

/* ============================================================
 * Interpretation: combined Commercial Pain × AI Diligence reading
 * ============================================================
 * The four-quadrant labels follow the spec verbatim. Thresholds are
 * deliberately simple: Commercial "high" = Strong or Moderate band;
 * AI Diligence "high" = composite ≥ 3.5 on the 0–5 scale (the same
 * cut the existing score uses to mean "above midpoint with margin").
 * Returns null if either score is unavailable so the UI can omit the
 * banner instead of showing a misleading verdict.
 */

export const AI_DILIGENCE_HIGH_THRESHOLD = 3.5;

export type CommercialPainInterpretationKey =
  | "strong_signal"
  | "execution_risk"
  | "commercially_weak"
  | "likely_pass";

export interface CommercialPainInterpretation {
  key: CommercialPainInterpretationKey;
  headline: string;
  detail: string;
  tone: "go" | "warn" | "stop";
}

export function interpretCommercialPainAndDiligence(
  pain: CommercialPainResult | null,
  aiDiligenceComposite0to5: number | null,
): CommercialPainInterpretation | null {
  if (pain == null || aiDiligenceComposite0to5 == null) return null;

  const painHigh = pain.band === "strong" || pain.band === "moderate";
  const diligenceHigh = aiDiligenceComposite0to5 >= AI_DILIGENCE_HIGH_THRESHOLD;

  if (painHigh && diligenceHigh) {
    return {
      key: "strong_signal",
      headline: "Strong investment signal",
      detail:
        "The commercial problem is real and the AI execution is credible, scalable, and defensible.",
      tone: "go",
    };
  }
  if (painHigh && !diligenceHigh) {
    return {
      key: "execution_risk",
      headline: "Real problem, AI execution risk",
      detail:
        "The pain and demand are validated, but the AI diligence score flags credibility, scalability, or governance concerns that need to be resolved.",
      tone: "warn",
    };
  }
  if (!painHigh && diligenceHigh) {
    return {
      key: "commercially_weak",
      headline: "Technically credible, commercially weak",
      detail:
        "The AI build is sound, but the commercial pain or buying urgency is not yet validated. Pressure-test demand before underwriting.",
      tone: "warn",
    };
  }
  return {
    key: "likely_pass",
    headline: "Weak opportunity — likely pass",
    detail:
      "Neither the commercial pain nor the AI execution clears the bar. Without new evidence on either axis, this is hard to underwrite.",
    tone: "stop",
  };
}

/* ============================================================
 * Shared report input: commercial_pain_summary
 * ============================================================
 * Every report (Master Diligence, IC Memo, Risk Register, Value Plan,
 * Evidence Coverage) and the chat/Q&A retrieval consume the SAME object,
 * built once via `buildCommercialPainSummary`. Reports must NEVER invent
 * commercial pain content — they read from this summary or report it as
 * "Not yet completed".
 *
 * Shape mirrors the Phase 4 spec verbatim. Free-form fields
 * (problem_statement, buyer_persona, etc.) come from operator-collected
 * intake; categorical fields (pain_severity, pain_frequency, ...) are
 * normalized to human-readable strings via the same maps that drive the
 * deterministic score, so prose and score never disagree.
 */

export interface CommercialPainSummaryFreeForm {
  problem_statement?: string | null;
  buyer_persona?: string | null;
  cost_of_pain?: string | null;
  current_alternative?: string | null;
  status_quo_failure?: string | null;
  promised_outcome?: string | null;
  buying_trigger?: string | null;
  /**
   * Operator's narrative explanation of how the score was reached and
   * what it means for the deal. Surfaced verbatim into reports under
   * the "report_rationale" key so reports never invent their own.
   */
  report_rationale?: string | null;
  /** List of operator-flagged contradictions between intake and artifacts. */
  contradictions?: string[] | null;
  /** Specific evidence items (filenames, contract clauses, metric names) backed by uploaded artifacts. */
  artifact_backed_evidence?: string[] | null;
  /** Specific evidence items from intake / management interviews with no artifact corroboration. */
  intake_only_claims?: string[] | null;
  /** Operator-curated list of follow-up questions still required before IC reliance. */
  recommended_follow_up_questions?: string[] | null;
}

export type CommercialPainSummaryInput = CommercialPainInputs &
  CommercialPainSummaryFreeForm;

export interface CommercialPainSummary {
  commercial_pain_confidence_score: number; // 0–100
  commercial_pain_confidence_band: "Strong" | "Moderate" | "Weak" | "Not Validated";
  problem_statement: string;
  buyer_persona: string;
  pain_severity: string;
  pain_frequency: string;
  cost_of_pain: string;
  current_alternative: string;
  status_quo_failure: string;
  customer_demand_evidence: string;
  solution_fit: string;
  ai_necessity: string;
  promised_outcome: string;
  outcome_proof: string;
  buying_trigger: string;
  buying_urgency: string;
  missing_evidence: string;
  artifact_backed_evidence: string[];
  intake_only_claims: string[];
  contradictions: string[];
  report_rationale: string;
  recommended_follow_up_questions: string[];
}

const PAIN_SEVERITY_LABEL: Record<PainSeverity, string> = {
  mission_critical: "Mission-critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  unclear: "Unclear",
};

const PAIN_FREQUENCY_LABEL: Record<PainFrequency, string> = {
  daily_or_continuous: "Daily or continuous",
  weekly: "Weekly",
  monthly: "Monthly",
  occasional: "Occasional / situational",
  one_time_or_rare: "One-time or rare",
  unclear: "Unclear",
};

const SOLUTION_FIT_LABEL: Record<SolutionFit, string> = {
  directly_solves: "Directly solves the core pain",
  major_part: "Solves a major part of the pain",
  narrow_part: "Solves a narrow part of the pain",
  adjacent: "Adjacent to the pain but not central",
  unclear_connection: "Unclear connection between product and pain",
  does_not_solve: "Product does not clearly solve the stated pain",
};

const AI_NECESSITY_LABEL: Record<AINecessity, string> = {
  yes: "Yes — AI is necessary",
  mostly: "Mostly — non-AI alternatives are weaker but viable",
  partially: "Partially — AI is one of several routes",
  weakly: "Weakly — non-AI alternatives are competitive",
  no: "No — AI is not required",
  unknown: "Unknown",
};

const OUTCOME_PROOF_LABEL: Record<OutcomeProof, string> = {
  customer_data: "Proven with customer data",
  case_studies: "Proven with case studies",
  usage_metrics: "Partially supported by usage metrics",
  testimonials: "Supported by testimonials only",
  management_only: "Claimed by management only",
  not_proven: "Not proven",
  unknown: "Unknown",
};

const BUYING_URGENCY_LABEL: Record<BuyingUrgency, string> = {
  immediate: "Immediate",
  near_term: "Near-term",
  medium_term: "Medium-term",
  long_term: "Long-term",
  no_urgency: "No clear urgency",
  unknown: "Unknown",
};

const CUSTOMER_DEMAND_TAG_LABEL: Record<CustomerDemandEvidenceTag, string> = {
  paying_customers: "Paying customers",
  signed_contracts: "Signed contracts",
  renewal_expansion: "Renewals / expansion",
  usage_metrics: "Usage metrics",
  case_studies: "Case studies",
  testimonials: "Testimonials",
  customer_interviews: "Customer interviews",
  pipeline_lois: "Pipeline / LOIs",
  founder_claims_only: "Founder claims only",
};

const NOT_PROVIDED = "Not provided";

function painBandLabelTitleCase(
  band: CommercialPainBand,
): CommercialPainSummary["commercial_pain_confidence_band"] {
  // The result type already carries band_label as "Strong" | etc, but be
  // defensive — derive from the enum so we can't drift.
  switch (band) {
    case "strong":
      return "Strong";
    case "moderate":
      return "Moderate";
    case "weak":
      return "Weak";
    case "not_validated":
      return "Not Validated";
  }
}

/**
 * Build the shared `commercial_pain_summary` object that every report and
 * the chat/Q&A endpoint consume. Returns null when no inputs exist —
 * callers should surface "Commercial Pain Validation not yet completed"
 * rather than feeding partial / invented content into reports.
 *
 * Pure and deterministic. The categorical fields are rendered as the same
 * human-readable phrases the operator saw in the questionnaire, so prose
 * generated by the LLM cannot drift from the score.
 */
export function buildCommercialPainSummary(
  input: CommercialPainSummaryInput | null | undefined,
): CommercialPainSummary | null {
  const result = calculateCommercialPainConfidence(input ?? null);
  if (result == null) return null;

  const i = input!; // calculateCommercialPainConfidence returned non-null → has inputs

  const customerDemandPhrase =
    i.customer_demand_evidence && i.customer_demand_evidence.length > 0
      ? i.customer_demand_evidence
          .map((tag) => CUSTOMER_DEMAND_TAG_LABEL[tag])
          .join(", ")
      : NOT_PROVIDED;

  const missingEvidencePhrase =
    result.missing_factors.length === 0
      ? "All seven factors answered with non-zero evidence."
      : result.missing_factors
          .map((f) => COMMERCIAL_PAIN_FACTOR_LABELS[f])
          .join(", ");

  return {
    commercial_pain_confidence_score: result.score,
    commercial_pain_confidence_band: painBandLabelTitleCase(result.band),
    problem_statement: i.problem_statement?.trim() || NOT_PROVIDED,
    buyer_persona: i.buyer_persona?.trim() || NOT_PROVIDED,
    pain_severity: i.pain_severity ? PAIN_SEVERITY_LABEL[i.pain_severity] : NOT_PROVIDED,
    pain_frequency: i.pain_frequency
      ? PAIN_FREQUENCY_LABEL[i.pain_frequency]
      : NOT_PROVIDED,
    cost_of_pain: i.cost_of_pain?.trim() || NOT_PROVIDED,
    current_alternative: i.current_alternative?.trim() || NOT_PROVIDED,
    status_quo_failure: i.status_quo_failure?.trim() || NOT_PROVIDED,
    customer_demand_evidence: customerDemandPhrase,
    solution_fit: i.solution_fit ? SOLUTION_FIT_LABEL[i.solution_fit] : NOT_PROVIDED,
    ai_necessity: i.ai_necessity ? AI_NECESSITY_LABEL[i.ai_necessity] : NOT_PROVIDED,
    promised_outcome: i.promised_outcome?.trim() || NOT_PROVIDED,
    outcome_proof: i.outcome_proof ? OUTCOME_PROOF_LABEL[i.outcome_proof] : NOT_PROVIDED,
    buying_trigger: i.buying_trigger?.trim() || NOT_PROVIDED,
    buying_urgency: i.buying_urgency
      ? BUYING_URGENCY_LABEL[i.buying_urgency]
      : NOT_PROVIDED,
    missing_evidence: missingEvidencePhrase,
    artifact_backed_evidence: (i.artifact_backed_evidence ?? []).filter(Boolean),
    intake_only_claims: (i.intake_only_claims ?? []).filter(Boolean),
    contradictions: (i.contradictions ?? []).filter(Boolean),
    report_rationale: i.report_rationale?.trim() || NOT_PROVIDED,
    recommended_follow_up_questions: (i.recommended_follow_up_questions ?? []).filter(
      Boolean,
    ),
  };
}

/**
 * Format the shared commercial_pain_summary object as a labelled
 * evidence block for inclusion in LLM prompts (reports + chat).
 *
 * Returns the canonical "not yet completed" sentinel when the summary is
 * null so reports can detect and surface the legacy state without
 * inventing any commercial-pain content.
 *
 * Format: a single block that begins with `[commercial_pain_summary]` so
 * it can be cited inline by the model the same way other evidence blocks
 * are cited (e.g. "[red flag · …]", "[score · …]").
 */
export function formatCommercialPainSummaryForEvidence(
  summary: CommercialPainSummary | null,
): string {
  if (summary == null) {
    return [
      "[commercial_pain_summary] STATUS: Commercial Pain Validation not yet completed.",
      "Do not invent commercial pain evidence. Where a section requires commercial pain content, write 'Commercial Pain Validation not yet completed' and surface it as a missing-evidence finding.",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push("[commercial_pain_summary] CANONICAL — every report and chat answer must read commercial pain content from this block. Do not invent additional commercial pain evidence; do not treat intake-only claims as artifact-backed.");
  lines.push(
    `commercial_pain_confidence_score: ${summary.commercial_pain_confidence_score} / 100`,
  );
  lines.push(
    `commercial_pain_confidence_band: ${summary.commercial_pain_confidence_band}`,
  );
  lines.push(`problem_statement: ${summary.problem_statement}`);
  lines.push(`buyer_persona: ${summary.buyer_persona}`);
  lines.push(`pain_severity: ${summary.pain_severity}`);
  lines.push(`pain_frequency: ${summary.pain_frequency}`);
  lines.push(`cost_of_pain: ${summary.cost_of_pain}`);
  lines.push(`current_alternative: ${summary.current_alternative}`);
  lines.push(`status_quo_failure: ${summary.status_quo_failure}`);
  lines.push(`customer_demand_evidence: ${summary.customer_demand_evidence}`);
  lines.push(`solution_fit: ${summary.solution_fit}`);
  lines.push(`ai_necessity: ${summary.ai_necessity}`);
  lines.push(`promised_outcome: ${summary.promised_outcome}`);
  lines.push(`outcome_proof: ${summary.outcome_proof}`);
  lines.push(`buying_trigger: ${summary.buying_trigger}`);
  lines.push(`buying_urgency: ${summary.buying_urgency}`);
  lines.push(`missing_evidence: ${summary.missing_evidence}`);
  lines.push(
    `artifact_backed_evidence: ${
      summary.artifact_backed_evidence.length > 0
        ? summary.artifact_backed_evidence.join(" | ")
        : NOT_PROVIDED
    }`,
  );
  lines.push(
    `intake_only_claims: ${
      summary.intake_only_claims.length > 0
        ? summary.intake_only_claims.join(" | ")
        : NOT_PROVIDED
    }`,
  );
  lines.push(
    `contradictions: ${
      summary.contradictions.length > 0
        ? summary.contradictions.join(" | ")
        : "None recorded"
    }`,
  );
  lines.push(`report_rationale: ${summary.report_rationale}`);
  lines.push(
    `recommended_follow_up_questions: ${
      summary.recommended_follow_up_questions.length > 0
        ? summary.recommended_follow_up_questions.join(" | ")
        : NOT_PROVIDED
    }`,
  );
  return lines.join("\n");
}
