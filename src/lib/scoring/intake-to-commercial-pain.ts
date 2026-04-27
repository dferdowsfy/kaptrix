/**
 * Map intake-form display labels to the scoring-service enum values.
 *
 * The intake form stores raw display strings ("Mission-critical",
 * "Daily or continuous"); `calculateCommercialPainConfidence` expects
 * snake_case enum values ("mission_critical", "daily_or_continuous").
 * This module is the single translation layer — both the dashboard
 * scoring page (server, reads Supabase) and the preview scoring page
 * (client, reads the in-memory KB) call into the same helper, so the
 * label-to-enum mapping can never drift.
 *
 * Pure: no I/O, no React, safe to import from server or client.
 */

import type {
  AINecessity,
  BuyingUrgency,
  CommercialPainSummaryInput,
  CustomerDemandEvidenceTag,
  OutcomeProof,
  PainFrequency,
  PainSeverity,
  SolutionFit,
} from "./commercial-pain";

const PAIN_SEVERITY_FROM_LABEL: Record<string, PainSeverity> = {
  "Mission-critical": "mission_critical",
  High: "high",
  Moderate: "moderate",
  Low: "low",
  Unclear: "unclear",
};

const PAIN_FREQUENCY_FROM_LABEL: Record<string, PainFrequency> = {
  "Daily or continuous": "daily_or_continuous",
  Weekly: "weekly",
  Monthly: "monthly",
  "Occasional / situational": "occasional",
  "One-time or rare": "one_time_or_rare",
  Unclear: "unclear",
};

const SOLUTION_FIT_FROM_LABEL: Record<string, SolutionFit> = {
  "Directly solves the core pain": "directly_solves",
  "Solves a major part of the pain": "major_part",
  "Solves a narrow part of the pain": "narrow_part",
  "Adjacent to the pain but not central": "adjacent",
  "Unclear connection between product and pain": "unclear_connection",
  "Product does not clearly solve the stated pain": "does_not_solve",
};

const AI_NECESSITY_FROM_LABEL: Record<string, AINecessity> = {
  "Yes — AI is necessary": "yes",
  "Mostly — non-AI alternatives are weaker but viable": "mostly",
  "Partially — AI is one of several routes": "partially",
  "Weakly — non-AI alternatives are competitive": "weakly",
  "No — AI is not required": "no",
  Unknown: "unknown",
};

const OUTCOME_PROOF_FROM_LABEL: Record<string, OutcomeProof> = {
  "Proven with customer data": "customer_data",
  "Proven with case studies": "case_studies",
  "Partially supported by usage metrics": "usage_metrics",
  "Supported by testimonials only": "testimonials",
  "Claimed by management only": "management_only",
  "Not proven": "not_proven",
  Unknown: "unknown",
};

const BUYING_URGENCY_FROM_LABEL: Record<string, BuyingUrgency> = {
  Immediate: "immediate",
  "Near-term": "near_term",
  "Medium-term": "medium_term",
  "Long-term": "long_term",
  "No clear urgency": "no_urgency",
  Unknown: "unknown",
};

const CUSTOMER_DEMAND_FROM_LABEL: Record<string, CustomerDemandEvidenceTag> = {
  "Paying customers": "paying_customers",
  "Signed contracts": "signed_contracts",
  "Renewals / expansion": "renewal_expansion",
  "Usage metrics": "usage_metrics",
  "Case studies": "case_studies",
  Testimonials: "testimonials",
  "Customer interviews": "customer_interviews",
  "Pipeline / LOIs": "pipeline_lois",
  "Founder claims only": "founder_claims_only",
};

type RawValue = string | number | string[] | null | undefined;
type RawAnswers = Record<string, RawValue>;

function asString(v: RawValue): string | undefined {
  if (v == null || v === "") return undefined;
  if (Array.isArray(v)) return v.length > 0 ? String(v[0]) : undefined;
  return String(v);
}

function asArray(v: RawValue): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).filter((s) => s !== "");
  if (typeof v === "string" && v !== "") return [v];
  return [];
}

/**
 * Convert raw intake answers (display labels) into the input shape that
 * `calculateCommercialPainConfidence` and `buildCommercialPainSummary`
 * expect. Returns null when no commercial pain answers exist so callers
 * surface "Not yet completed" instead of a misleading score of 0.
 *
 * Tolerant of extra keys (the full intake answers object is fine to
 * pass — non-commercial-pain keys are ignored) and tolerant of unmapped
 * label values (logged as undefined in the typed output, which the
 * scoring service treats as "not answered").
 *
 * Accepts both flat raw answer objects (`{ pain_severity: "...", ... }`)
 * and the structured `commercial_pain_validation` sub-object pulled
 * from `IntakePayload` — both share the same flat key shape.
 */
export function intakeAnswersToCommercialPainInputs(
  answers: RawAnswers | null | undefined,
): CommercialPainSummaryInput | null {
  if (!answers) return null;

  const severity = asString(answers["pain_severity"]);
  const frequency = asString(answers["pain_frequency"]);
  const fit = asString(answers["solution_fit"]);
  const necessity = asString(answers["ai_necessity"]);
  const proof = asString(answers["outcome_proof"]);
  const urgency = asString(answers["buying_urgency"]);
  const demandTags = asArray(answers["customer_demand_evidence"]);

  // Free-form descriptive fields — now MCQ-derived but still flow
  // through to the summary builder as plain strings the report layer
  // can read verbatim.
  const problem_statement = asString(answers["problem_statement"]);
  const buyer_persona = asString(answers["buyer_persona"]);
  const cost_of_pain = asString(answers["cost_of_pain_notes"]);
  const current_alternative_str =
    asArray(answers["current_alternative"]).join(", ") || undefined;
  const status_quo_failure_str =
    asArray(answers["status_quo_failure"]).join(", ") || undefined;
  const promised_outcome_str =
    asArray(answers["promised_outcome"]).join(", ") || undefined;
  const buying_trigger = asString(answers["buying_trigger"]);
  const missing_pain_evidence_str =
    asArray(answers["missing_pain_evidence"]).join(", ") || undefined;

  const hasAnyAnswer = Boolean(
    severity ||
      frequency ||
      fit ||
      necessity ||
      proof ||
      urgency ||
      demandTags.length > 0 ||
      problem_statement ||
      buyer_persona ||
      cost_of_pain ||
      current_alternative_str ||
      status_quo_failure_str ||
      promised_outcome_str ||
      buying_trigger ||
      missing_pain_evidence_str,
  );
  if (!hasAnyAnswer) return null;

  const inputs: CommercialPainSummaryInput = {
    pain_severity: severity ? (PAIN_SEVERITY_FROM_LABEL[severity] ?? null) : null,
    pain_frequency: frequency
      ? (PAIN_FREQUENCY_FROM_LABEL[frequency] ?? null)
      : null,
    solution_fit: fit ? (SOLUTION_FIT_FROM_LABEL[fit] ?? null) : null,
    ai_necessity: necessity ? (AI_NECESSITY_FROM_LABEL[necessity] ?? null) : null,
    outcome_proof: proof ? (OUTCOME_PROOF_FROM_LABEL[proof] ?? null) : null,
    buying_urgency: urgency
      ? (BUYING_URGENCY_FROM_LABEL[urgency] ?? null)
      : null,
    customer_demand_evidence: demandTags
      .map((t) => CUSTOMER_DEMAND_FROM_LABEL[t])
      .filter((t): t is CustomerDemandEvidenceTag => Boolean(t)),
    problem_statement,
    buyer_persona,
    cost_of_pain,
    current_alternative: current_alternative_str,
    status_quo_failure: status_quo_failure_str,
    promised_outcome: promised_outcome_str,
    buying_trigger,
  };

  return inputs;
}
