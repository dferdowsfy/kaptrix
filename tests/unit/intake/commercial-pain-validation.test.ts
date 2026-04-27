import {
  formatKnowledgeBaseEvidence,
  COMMERCIAL_PAIN_VALIDATION_FIELDS,
  type IntakePayload,
  type KnowledgeEntry,
} from "@/lib/preview/kb-format";

function makeIntakeEntry(
  payload: Partial<IntakePayload>,
): KnowledgeEntry {
  return {
    step: "intake",
    submitted_at: "2026-04-26T12:00:00.000Z",
    summary: "test intake",
    payload: {
      kind: "intake",
      answered_fields: 0,
      regulatory_exposure: [],
      diligence_priorities: [],
      red_flag_priors: [],
      ...payload,
    } as IntakePayload,
  };
}

describe("Commercial Pain Validation — IntakePayload + KB emission", () => {
  it("does NOT emit any commercial_pain_validation lines for a legacy engagement", () => {
    // Legacy = intake payload with no commercial_pain_validation field.
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({}),
    });
    const cpLines = lines.filter((l) => l.includes("commercial_pain_validation"));
    expect(cpLines).toHaveLength(0);
  });

  it("emits intake_claim metadata for every populated commercial pain field", () => {
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({
        commercial_pain_validation: {
          problem_statement: "Document / contract analysis",
          buyer_persona: "C-suite / executive sponsor",
          pain_severity: "Mission-critical",
          pain_frequency: "Daily or continuous",
          cost_of_pain_categories: ["Lost revenue", "Operating cost / FTE drag"],
          customer_demand_evidence: ["Paying customers", "Case studies"],
          solution_fit: "Directly solves the core pain",
          ai_necessity: "Yes — AI is necessary",
          outcome_proof: "Proven with case studies",
          buying_urgency: "Immediate",
          promised_outcome: ["Time / cycle reduction", "Cost reduction"],
        },
      }),
    });

    // Every populated field should produce a line tagged with the four
    // pieces of metadata required by the spec:
    //   source_type=intake, section=commercial_pain_validation,
    //   evidence_status=intake_claim, requires_artifact_support=true
    const cpLines = lines.filter((l) =>
      l.includes("commercial_pain_validation"),
    );
    expect(cpLines.length).toBeGreaterThanOrEqual(11);

    for (const line of cpLines) {
      expect(line).toContain("knowledge base · Intake"); // source_type=intake
      expect(line).toContain("commercial_pain_validation"); // section
      expect(line).toContain("intake_claim"); // evidence_status
      expect(line).toContain("requires_artifact_support"); // flag
    }
  });

  it("renders the structured single-select labels verbatim so the score and the prose never disagree", () => {
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({
        commercial_pain_validation: {
          pain_severity: "Mission-critical",
          solution_fit: "Directly solves the core pain",
        },
      }),
    });
    expect(
      lines.find((l) => l.includes("pain_severity"))?.endsWith("Mission-critical"),
    ).toBe(true);
    expect(
      lines.find((l) => l.includes("solution_fit"))?.endsWith("Directly solves the core pain"),
    ).toBe(true);
  });

  it("renders multi-select fields as comma-joined values", () => {
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({
        commercial_pain_validation: {
          customer_demand_evidence: [
            "Paying customers",
            "Case studies",
            "Customer interviews",
          ],
        },
      }),
    });
    const line = lines.find((l) => l.includes("customer_demand_evidence"));
    expect(line).toBeDefined();
    expect(line).toMatch(/Paying customers, Case studies, Customer interviews$/);
  });

  it("does NOT emit lines for empty / blank fields", () => {
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({
        commercial_pain_validation: {
          problem_statement: "Document / contract analysis",
          buyer_persona: "", // blank — should be skipped
          pain_severity: undefined, // undefined — skipped
          cost_of_pain_categories: [], // empty array — skipped
          current_alternative: [], // empty multi — skipped
        },
      }),
    });
    const cpLines = lines.filter((l) =>
      l.includes("commercial_pain_validation"),
    );
    // Only problem_statement is non-empty
    expect(cpLines).toHaveLength(1);
    expect(cpLines[0]).toContain("problem_statement");
  });

  it("preserves the legacy intake fields alongside the new commercial pain fields", () => {
    const lines = formatKnowledgeBaseEvidence({
      intake: makeIntakeEntry({
        regulatory_exposure: ["GDPR / UK GDPR"],
        engagement_type: "PE / growth equity — pre-close diligence on a target",
        commercial_pain_validation: {
          problem_statement: "Document / contract analysis",
        },
      }),
    });
    expect(lines.some((l) => l.includes("regulatory exposure"))).toBe(true);
    expect(lines.some((l) => l.includes("engagement type"))).toBe(true);
    expect(
      lines.some((l) => l.includes("commercial_pain_validation")),
    ).toBe(true);
  });

  it("exports the full list of 25 spec fields for iteration", () => {
    expect(COMMERCIAL_PAIN_VALIDATION_FIELDS).toHaveLength(25);
    // Sanity-check a sample of spec field names
    expect(COMMERCIAL_PAIN_VALIDATION_FIELDS).toEqual(
      expect.arrayContaining([
        "problem_statement",
        "buyer_persona",
        "buyer_persona_notes",
        "pain_severity",
        "pain_frequency",
        "cost_of_pain_categories",
        "cost_of_pain_notes",
        "current_alternative",
        "current_alternative_notes",
        "status_quo_failure",
        "status_quo_failure_notes",
        "customer_demand_evidence",
        "customer_demand_evidence_notes",
        "solution_fit",
        "ai_necessity",
        "ai_necessity_notes",
        "promised_outcome",
        "promised_outcome_notes",
        "outcome_proof",
        "outcome_proof_notes",
        "buying_trigger",
        "buying_trigger_notes",
        "buying_urgency",
        "missing_pain_evidence",
        "missing_pain_evidence_notes",
      ]),
    );
  });
});

describe("Commercial Pain Validation — intake form ordering", () => {
  it("renders 'Commercial Pain Validation' as the first section in the intake questionnaire", () => {
    // Pull the questions array directly from the component module. Order
    // matters: section ordering is array-position-based (see
    // intake-questionnaire.tsx line 1135 — Array.from(new Set(...))
    // preserves first-appearance order).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/components/engagements/intake-questionnaire") as {
      INTAKE_QUESTIONS_FOR_TEST?: { section: string }[];
    };
    // The component file does not export the array directly. Instead,
    // assert on the rendered behavior: the IntakeQuestionnaire renders
    // sections in the order the question array first lists them. We use
    // a runtime-style check: the new section name should appear before
    // any of the legacy sections in a textual sweep of the file.
    // (Falls back to a simple file read so we don't have to refactor
    // the production component to expose its arrays.)
    if (mod.INTAKE_QUESTIONS_FOR_TEST) {
      const order = Array.from(
        new Set(mod.INTAKE_QUESTIONS_FOR_TEST.map((q) => q.section)),
      );
      expect(order[0]).toBe("Commercial Pain Validation");
      return;
    }
    // Fallback: read the source and look for the section comment.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/engagements/intake-questionnaire.tsx",
      ),
      "utf-8",
    );
    const cpIdx = src.indexOf('"Commercial Pain Validation"');
    const engagementIdx = src.indexOf('"Engagement Type"');
    expect(cpIdx).toBeGreaterThan(-1);
    expect(engagementIdx).toBeGreaterThan(-1);
    expect(cpIdx).toBeLessThan(engagementIdx);
  });

  it("contains zero free-form questions in the Commercial Pain Validation section", () => {
    // Free-form fields make scoring non-deterministic and reports unreliable.
    // Every question in this section MUST be 'single' or 'multi' so answers
    // map cleanly to scoring enums and KB chunks.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("node:fs") as typeof import("node:fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("node:path") as typeof import("node:path");
    const src = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/engagements/intake-questionnaire.tsx",
      ),
      "utf-8",
    );

    // Slice out only the Commercial Pain Validation block from the source.
    const blockStart = src.indexOf(
      "// ────────────────── Commercial Pain Validation ──────────────────",
    );
    const blockEnd = src.indexOf(
      "// ────────────────── Engagement Type ──────────────────",
      blockStart,
    );
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const block = src.slice(blockStart, blockEnd);

    // No question in this block may be short_text, long_text, or scale.
    expect(block).not.toMatch(/type:\s*"short_text"/);
    expect(block).not.toMatch(/type:\s*"long_text"/);
    expect(block).not.toMatch(/type:\s*"scale"/);

    // Sanity: there ARE single and multi questions in the block.
    expect(block).toMatch(/type:\s*"single"/);
    expect(block).toMatch(/type:\s*"multi"/);
  });
});
