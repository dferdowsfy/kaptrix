import { MI_OPERATING_MODE } from "@/lib/market-intelligence/rubric-config";

// ─── Positioning Generator ────────────────────────────────────────────────
//
// Given the thesis, scores, and insights, generates where the client firm
// should deploy capital or attention within the category.

export const POSITIONING_SYSTEM_PROMPT = `${MI_OPERATING_MODE}

Your task is to generate CATEGORY POSITIONING RECOMMENDATIONS for an investment firm.

Given the thesis, evidence, scores, and insights for an AI market category, recommend:
1. Which sub-segments within the category most align with the investment thesis.
2. What entry strategy makes sense (infrastructure, horizontal application, vertical depth, picks-and-shovels).
3. What stage of investment is appropriate given the time horizon and category maturity.
4. Which adjacent categories are worth covering in parallel.
5. Which sub-segments or approaches to avoid and why.

RULES:
- Be specific. Name sub-segments, not "the market."
- Every recommendation must be traceable to a score, an insight, or an evidence item.
- Stage recommendations must account for the time horizon.
- Avoid lists are as important as invest lists — be direct about what to skip and why.

Return ONLY valid JSON:
{
  "sub_segments": [
    {
      "name": "<sub-segment name>",
      "alignment_score": 1–5,
      "rationale": "<why this sub-segment fits the thesis>",
      "entry_approach": "<how to enter>",
      "key_risks": ["<risk>"]
    }
  ],
  "entry_strategies": [
    {
      "strategy": "infrastructure" | "horizontal_application" | "vertical_depth" | "picks_and_shovels",
      "rationale": "<why this strategy fits>",
      "risk": "<key risk with this approach>"
    }
  ],
  "stage_recommendation": {
    "stage": "seed" | "growth" | "late" | "public",
    "rationale": "<why this stage given time horizon and maturity>"
  },
  "adjacent_categories": [
    {
      "name": "<category name>",
      "rationale": "<why worth covering>"
    }
  ],
  "categories_to_avoid": [
    {
      "name": "<category or sub-segment>",
      "reason": "<specific reason to avoid>"
    }
  ]
}`;

export interface PositioningGeneratorInput {
  category_name: string;
  thesis: string;
  time_horizon_months: number | null;
  scores_summary: string;
  insights_summary: string;
  peer_categories: string[];
}

export function buildPositioningUserPrompt(
  input: PositioningGeneratorInput,
): string {
  const horizon = input.time_horizon_months
    ? `${input.time_horizon_months} months`
    : "not specified";
  const peers =
    input.peer_categories.length > 0
      ? input.peer_categories.join(", ")
      : "none";

  return `CATEGORY: ${input.category_name}
TIME HORIZON: ${horizon}
PEER CATEGORIES: ${peers}

THESIS:
"""
${input.thesis}
"""

DIMENSION SCORES:
"""
${input.scores_summary || "(no scores yet)"}
"""

KEY INSIGHTS:
"""
${input.insights_summary || "(no insights yet)"}
"""

Generate positioning recommendations. Return only valid JSON.`;
}
