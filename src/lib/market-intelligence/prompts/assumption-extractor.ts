import { MI_OPERATING_MODE } from "@/lib/market-intelligence/rubric-config";
import type { MiThesisAssumption, MiIntakeQuestion } from "@/lib/types";

// ─── Assumption Extractor ─────────────────────────────────────────────────
//
// Extracts explicit load-bearing assumptions from the submitted thesis text
// plus answered intake. Each assumption can then be independently evidenced
// via the coverage engine.

export const ASSUMPTION_SYSTEM_PROMPT = `${MI_OPERATING_MODE}

Your task is to extract the LOAD-BEARING ASSUMPTIONS from an investment thesis, informed by the operator's intake answers.

WHAT IS A LOAD-BEARING ASSUMPTION?
An assumption whose falsification would materially change the investment conclusion. Not every belief in the thesis is load-bearing — focus on the ones that, if wrong, would cause a pass or materially change deal terms.

EXTRACTION RULES:
- Extract 5–12 assumptions. Quality over quantity.
- Each assumption must be a single, specific, falsifiable claim. No compound assumptions.
- State each assumption in the affirmative (what must be true, not what must be false).
- Assign assumption_category from this taxonomy: market_size, timing, competition, technology, regulation, customer, business_model, exit.
- load_bearing_score [0.0–1.0]: how central this assumption is to the entire thesis. Reserve 0.8–1.0 for assumptions whose failure would make this a pass.
- evidence_type_needed: name the specific type of evidence that would verify or falsify this assumption (e.g. "buyer interview confirming budget allocation", "regulatory text confirming permitted use", "competitor SEC filing").

Return ONLY valid JSON:
{
  "assumptions": [
    {
      "assumption_text": "<specific falsifiable claim>",
      "assumption_category": "<one of: market_size|timing|competition|technology|regulation|customer|business_model|exit>",
      "load_bearing_score": 0.0–1.0,
      "evidence_type_needed": "<specific evidence type>"
    }
  ]
}`;

export interface AssumptionExtractorInput {
  thesis: string;
  category_name: string;
  answered_questions: MiIntakeQuestion[];
}

export function buildAssumptionUserPrompt(
  input: AssumptionExtractorInput,
): string {
  const answeredPairs = input.answered_questions
    .filter((q) => q.answer && q.answer.trim().length > 0)
    .map((q) => `Q [${q.category}]: ${q.question}\nA: ${q.answer}`)
    .join("\n\n");

  return `CATEGORY: ${input.category_name}

THESIS:
"""
${input.thesis}
"""

INTAKE ANSWERS (${input.answered_questions.filter((q) => q.answer?.trim()).length} answered):
"""
${answeredPairs || "(no intake answers yet)"}
"""

Extract the load-bearing assumptions. Return only valid JSON.`;
}

export function parseAssumptions(
  raw: string,
  engagementId: string,
): Omit<MiThesisAssumption, "id" | "created_at" | "updated_at">[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first < 0 || last <= first) {
    throw new Error("No JSON object found in assumption extractor response");
  }
  const parsed = JSON.parse(candidate.slice(first, last + 1)) as {
    assumptions?: {
      assumption_text: string;
      assumption_category: string;
      load_bearing_score: number;
      evidence_type_needed: string;
    }[];
  };
  if (!Array.isArray(parsed.assumptions)) {
    throw new Error("LLM response missing 'assumptions' array");
  }
  return parsed.assumptions.map((a, i) => ({
    engagement_id: engagementId,
    assumption_text: a.assumption_text,
    assumption_category: a.assumption_category,
    evidence_status: "unverified" as const,
    load_bearing_score: Math.min(1, Math.max(0, a.load_bearing_score)),
    evidence_type_needed: a.evidence_type_needed ?? null,
    ordering: i,
  }));
}
