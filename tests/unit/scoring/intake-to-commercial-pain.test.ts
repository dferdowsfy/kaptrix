import {
  calculateCommercialPainConfidence,
} from "@/lib/scoring/commercial-pain";
import { intakeAnswersToCommercialPainInputs } from "@/lib/scoring/intake-to-commercial-pain";

describe("intakeAnswersToCommercialPainInputs", () => {
  it("returns null when no answers provided", () => {
    expect(intakeAnswersToCommercialPainInputs(null)).toBeNull();
    expect(intakeAnswersToCommercialPainInputs(undefined)).toBeNull();
    expect(intakeAnswersToCommercialPainInputs({})).toBeNull();
  });

  it("returns null when answers exist but none are commercial-pain related", () => {
    expect(
      intakeAnswersToCommercialPainInputs({
        engagement_type: "PE / growth equity — pre-close diligence on a target",
        regulatory_exposure: ["GDPR / UK GDPR"],
      }),
    ).toBeNull();
  });

  it("maps the seven score-driving categorical fields to enum values", () => {
    const inputs = intakeAnswersToCommercialPainInputs({
      pain_severity: "Mission-critical",
      pain_frequency: "Daily or continuous",
      solution_fit: "Directly solves the core pain",
      ai_necessity: "Yes — AI is necessary",
      outcome_proof: "Proven with case studies",
      buying_urgency: "Immediate",
      customer_demand_evidence: ["Paying customers", "Case studies"],
    })!;

    expect(inputs.pain_severity).toBe("mission_critical");
    expect(inputs.pain_frequency).toBe("daily_or_continuous");
    expect(inputs.solution_fit).toBe("directly_solves");
    expect(inputs.ai_necessity).toBe("yes");
    expect(inputs.outcome_proof).toBe("case_studies");
    expect(inputs.buying_urgency).toBe("immediate");
    expect(inputs.customer_demand_evidence).toEqual([
      "paying_customers",
      "case_studies",
    ]);
  });

  it("produces a usable score from a complete intake — the bug we shipped", () => {
    // This is the regression test for the production bug: all 25 questions
    // answered → scoring page rendered "Commercial Pain Validation not yet
    // completed" because the page passed null instead of mapping the
    // intake answers.
    const allMaxedOut = intakeAnswersToCommercialPainInputs({
      pain_severity: "Mission-critical",
      pain_frequency: "Daily or continuous",
      solution_fit: "Directly solves the core pain",
      ai_necessity: "Yes — AI is necessary",
      outcome_proof: "Proven with customer data",
      buying_urgency: "Immediate",
      customer_demand_evidence: ["Paying customers"],
    });
    const result = calculateCommercialPainConfidence(allMaxedOut);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(100);
    expect(result!.band).toBe("strong");
  });

  it("returns null for unknown labels (typos / drift) — never silently passes the bad value through", () => {
    const inputs = intakeAnswersToCommercialPainInputs({
      pain_severity: "extreme", // not a valid label — ignored
      pain_frequency: "Weekly",
    })!;
    expect(inputs.pain_severity).toBeNull();
    expect(inputs.pain_frequency).toBe("weekly");
  });

  it("maps every customer demand evidence label correctly", () => {
    const inputs = intakeAnswersToCommercialPainInputs({
      customer_demand_evidence: [
        "Paying customers",
        "Signed contracts",
        "Renewals / expansion",
        "Usage metrics",
        "Case studies",
        "Testimonials",
        "Customer interviews",
        "Pipeline / LOIs",
        "Founder claims only",
      ],
    })!;
    expect(inputs.customer_demand_evidence).toEqual([
      "paying_customers",
      "signed_contracts",
      "renewal_expansion",
      "usage_metrics",
      "case_studies",
      "testimonials",
      "customer_interviews",
      "pipeline_lois",
      "founder_claims_only",
    ]);
  });

  it("preserves descriptive (non-score-driving) fields for the report summary", () => {
    const inputs = intakeAnswersToCommercialPainInputs({
      problem_statement: "Document / contract analysis",
      buyer_persona: "C-suite / executive sponsor",
      cost_of_pain_notes: "$1M–$5M",
      buying_trigger: "Regulatory deadline / mandate",
      // multi-selects get joined into a single string for the summary
      current_alternative: ["Manual workflow / human labor", "Spreadsheets / ad-hoc tools"],
      status_quo_failure: ["Too slow / cycle time too long", "Compliance / audit risk"],
      promised_outcome: ["Time / cycle reduction", "Cost reduction"],
    })!;
    expect(inputs.problem_statement).toBe("Document / contract analysis");
    expect(inputs.buyer_persona).toBe("C-suite / executive sponsor");
    expect(inputs.cost_of_pain).toBe("$1M–$5M");
    expect(inputs.buying_trigger).toBe("Regulatory deadline / mandate");
    expect(inputs.current_alternative).toBe(
      "Manual workflow / human labor, Spreadsheets / ad-hoc tools",
    );
    expect(inputs.status_quo_failure).toBe(
      "Too slow / cycle time too long, Compliance / audit risk",
    );
    expect(inputs.promised_outcome).toBe(
      "Time / cycle reduction, Cost reduction",
    );
  });

  it("works with the IntakePayload.commercial_pain_validation sub-object shape", () => {
    // The preview scoring page reads this directly off the in-memory KB.
    const cpv = {
      pain_severity: "High",
      solution_fit: "Solves a major part of the pain",
      ai_necessity: "Mostly — non-AI alternatives are weaker but viable",
      customer_demand_evidence: ["Case studies", "Testimonials"],
    };
    const inputs = intakeAnswersToCommercialPainInputs(cpv)!;
    expect(inputs.pain_severity).toBe("high");
    expect(inputs.solution_fit).toBe("major_part");
    expect(inputs.ai_necessity).toBe("mostly");
    expect(inputs.customer_demand_evidence).toEqual(["case_studies", "testimonials"]);
  });

  it("ignores empty strings, empty arrays, and null values without crashing", () => {
    expect(
      intakeAnswersToCommercialPainInputs({
        pain_severity: "",
        pain_frequency: null,
        customer_demand_evidence: [],
        // No real answer present — should treat as 'no inputs'
      }),
    ).toBeNull();
  });
});
