import { MI_OPERATING_MODE, MI_DEFAULT_RUBRIC } from "@/lib/market-intelligence/rubric-config";
import type { MiDimension, MiScore } from "@/lib/types";

// ─── Scoring Generator ────────────────────────────────────────────────────
//
// Generates all 7 dimension scores from the rubric config + evidence context.
// The rubric config is embedded in the prompt at runtime so it can be tuned
// via mi_scoring_rubric_config without code changes.

export const SCORING_SYSTEM_PROMPT = `${MI_OPERATING_MODE}

Your task is to score a category investment thesis across 7 defined dimensions.

SCORING RULES:
- Score each dimension 0.0–5.0 in 0.5 increments.
- 0.0–1.5 = Very weak / significant red flags
- 2.0–2.5 = Weak / notable gaps
- 3.0     = Neutral / directional evidence, incomplete
- 3.5–4.0 = Strong / well-evidenced
- 4.5–5.0 = Exceptional / comprehensive evidence, strong thesis
- Every score requires a specific justification. Reference named evidence items, assumption status, or specific gaps.
- Do not pad justifications. Be direct about what drove the score.
- If evidence is insufficient to score a dimension with confidence, score it 2.5 and explain why.

Return ONLY valid JSON:
{
  "scores": [
    {
      "dimension": "<dimension_id>",
      "score_0_to_5": 0.0–5.0,
      "justification": "<specific evidence-grounded rationale, 2–4 sentences>",
      "confidence": "high" | "medium" | "low"
    }
  ]
}

You MUST return exactly 7 score objects, one per dimension.`;

export interface ScoringGeneratorInput {
  category_name: string;
  thesis: string;
  time_horizon_months: number | null;
  intake_summary: string;
  assumptions_summary: string;
  evidence_summary: string;
  insights_summary: string;
}

function buildRubricContext(): string {
  return MI_DEFAULT_RUBRIC.map((dim) => {
    const subs = dim.sub_criteria
      .map((s) => `    • ${s.label} (weight ${s.weight}): ${s.description}`)
      .join("\n");
    return `DIMENSION: ${dim.dimension} — ${dim.label} (overall weight ${dim.weight})\n  ${dim.description}\n  Sub-criteria:\n${subs}`;
  }).join("\n\n");
}

export function buildScoringUserPrompt(input: ScoringGeneratorInput): string {
  const horizon = input.time_horizon_months
    ? `${input.time_horizon_months} months`
    : "not specified";

  return `CATEGORY: ${input.category_name}
TIME HORIZON: ${horizon}

THESIS:
"""
${input.thesis}
"""

INTAKE SUMMARY:
"""
${input.intake_summary || "(none)"}
"""

THESIS ASSUMPTIONS (with evidence status):
"""
${input.assumptions_summary || "(none)"}
"""

EVIDENCE COLLECTED:
"""
${input.evidence_summary || "(none)"}
"""

KEY INSIGHTS SUMMARY:
"""
${input.insights_summary || "(none generated yet)"}
"""

SCORING RUBRIC:
${buildRubricContext()}

Score all 7 dimensions. Return only valid JSON.`;
}

export function parseScoringResponse(
  raw: string,
  engagementId: string,
  model: string,
): Omit<MiScore, "id" | "updated_at">[] {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first < 0 || last <= first) {
    throw new Error("No JSON found in scoring response");
  }
  const parsed = JSON.parse(candidate.slice(first, last + 1)) as {
    scores?: {
      dimension: string;
      score_0_to_5: number;
      justification: string;
      confidence: string;
    }[];
  };
  if (!Array.isArray(parsed.scores)) {
    throw new Error("LLM response missing 'scores' array");
  }
  const now = new Date().toISOString();
  return parsed.scores.map((s) => ({
    engagement_id: engagementId,
    dimension: s.dimension as MiDimension,
    score_0_to_5: Math.round(Math.min(5, Math.max(0, s.score_0_to_5)) * 2) / 2,
    llm_justification: s.justification ?? null,
    operator_override: false,
    operator_rationale: null,
    generated_by_model: model,
    generated_at: now,
  }));
}
