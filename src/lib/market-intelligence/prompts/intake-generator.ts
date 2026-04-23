import { MI_OPERATING_MODE } from "@/lib/market-intelligence/rubric-config";
import type { MiIntakeQuestion } from "@/lib/types";

// ─── Intake Question Generator ────────────────────────────────────────────
//
// Generates a thesis-adaptive set of 15–25 intake questions for a new
// Market Intelligence engagement. The question mix varies by category,
// thesis framing, and deal context — it is NOT a static template.

export const INTAKE_SYSTEM_PROMPT = `${MI_OPERATING_MODE}

Your task is to generate a tailored intake question set for an investment thesis about an AI market category.

GOAL: Surface the assumptions, risks, and evidence gaps that are SPECIFIC to this thesis — not generic AI investing questions. A thesis about "Agentic AI in enterprise" needs different intake than "Voice AI for SMB" or "AI in clinical trials."

QUESTION DESIGN RULES:
- Generate 15–25 questions. More thesis-specific, fewer generic.
- Every question must be answerable from an operator's diligence work (buyer interviews, expert calls, desk research). No questions requiring proprietary data.
- Each question must belong to exactly one of the 8 categories listed below.
- Guidance notes should tell the operator what a strong answer looks like and what to watch for.
- is_required=true for questions that directly test load-bearing thesis assumptions.

CATEGORIES (use these exact values):
  thesis_assumptions        — What must be true for this thesis to hold?
  market_structure          — How is the category organized? Who are the natural winners?
  incumbent_threat_model    — Who will try to kill this category and how?
  technology_maturity       — Is the underlying technology ready for the claimed use case?
  regulatory_risk           — What regulatory or policy headwinds could constrain the category?
  capital_dynamics          — Where is capital flowing? Is it rational or hype-driven?
  customer_behavior         — What do buyers actually do? Is there genuine pull demand?
  exit_landscape            — How does this category produce returns? Acquirer map?

THESIS-SPECIFIC ADAPTATION:
- Read the thesis carefully. Identify the 3–5 most testable claims.
- Generate at least 2 questions per identified load-bearing claim.
- Weight the category mix toward the thesis's riskiest assumptions.
- For enterprise AI: weight toward customer_behavior and incumbent_threat_model.
- For infrastructure AI: weight toward technology_maturity and competitive_defensibility.
- For regulated verticals: weight toward regulatory_risk and customer_behavior.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q_<slug>_<n>",
      "category": "<one of the 8 categories above>",
      "question": "<specific, answerable question text>",
      "guidance_note": "<what a strong answer looks like; what to watch for>",
      "is_required": true | false,
      "is_editable": true
    }
  ]
}`;

export interface IntakeGeneratorInput {
  category_name: string;
  thesis: string;
  time_horizon_months: number | null;
  peer_categories: string[];
  deal_stage: string;
  tier: string;
}

export function buildIntakeUserPrompt(input: IntakeGeneratorInput): string {
  const horizon = input.time_horizon_months
    ? `${input.time_horizon_months} months (${Math.round(input.time_horizon_months / 12)} years)`
    : "not specified";
  const peers =
    input.peer_categories.length > 0
      ? input.peer_categories.join(", ")
      : "none specified";

  return `CATEGORY: ${input.category_name}
DEAL STAGE: ${input.deal_stage}
TIER: ${input.tier}
TIME HORIZON: ${horizon}
PEER CATEGORIES FOR COMPARISON: ${peers}

THESIS:
"""
${input.thesis}
"""

Generate the tailored intake question set for this specific thesis. Return only valid JSON.`;
}

export function parseIntakeQuestions(raw: string): MiIntakeQuestion[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first < 0 || last <= first) {
    throw new Error("No JSON object found in intake generator response");
  }
  const parsed = JSON.parse(candidate.slice(first, last + 1)) as {
    questions?: MiIntakeQuestion[];
  };
  if (!Array.isArray(parsed.questions)) {
    throw new Error("LLM response missing 'questions' array");
  }
  return parsed.questions;
}
