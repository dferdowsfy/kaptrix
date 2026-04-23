import { MI_OPERATING_MODE } from "@/lib/market-intelligence/rubric-config";
import type { MiInsightType } from "@/lib/types";

// ─── Insights Generator ───────────────────────────────────────────────────
//
// One system prompt per insight type. Each insight is generated in a separate
// LLM call. Output must conform to the typed schema in insight-types.ts.

export const INSIGHTS_SYSTEM_BASE = `${MI_OPERATING_MODE}

You receive a category investment thesis, the operator's intake answers, a list of thesis assumptions with their current evidence status, and a summary of evidence items collected.

Generate ONLY the specific insight type requested. Do not produce other insight types or prose outside the JSON. Every claim must be grounded in the evidence provided. When evidence is absent for a claim, mark it as asserted.`;

export const INSIGHT_INSTRUCTIONS: Record<MiInsightType, string> = {
  pressure_test: `Generate the THESIS PRESSURE TEST insight.

Schema:
{
  "assumptions_holding": [{ "text": "<assumption>", "evidence_summary": "<what supports it>" }],
  "assumptions_weak": [{ "text": "<assumption>", "weakness_reason": "<why it's weak>" }],
  "assumptions_contradicted": [{ "text": "<assumption>", "contradiction_evidence": "<what contradicts it>" }],
  "overall_conviction": "high" | "medium" | "low",
  "conviction_rationale": "<one paragraph summarizing overall thesis strength>"
}

Classify each extracted assumption into exactly one bucket. Do not invent assumptions not in the list.`,

  structure_map: `Generate the CATEGORY STRUCTURE MAP insight.

Schema:
{
  "horizontal_plays": [{ "company_archetype": "<type>", "examples": ["<name>"], "rationale": "<why>" }],
  "vertical_plays": [{ "vertical": "<industry>", "examples": ["<name>"], "rationale": "<why>" }],
  "infra_vs_application": {
    "infra_players": ["<name or archetype>"],
    "application_players": ["<name or archetype>"],
    "picks_and_shovels": ["<name or archetype>"]
  },
  "consolidation_signals": ["<signal>"],
  "category_summary": "<2–3 sentence structural characterization>"
}`,

  threat_model: `Generate the THREAT MODEL insight.

Schema:
{
  "fm_provider_threats": [{
    "provider": "<OpenAI|Anthropic|Google|Meta|other>",
    "capability": "<specific capability>",
    "timeline_estimate": "<e.g. 12–18 months>",
    "affected_value_chain": "<which part of the category>",
    "severity": "high" | "medium" | "low"
  }],
  "incumbent_saas_threats": [{
    "vendor": "<name>",
    "native_feature": "<what they are shipping>",
    "announced_or_shipped": true | false,
    "displacement_risk": "high" | "medium" | "low"
  }],
  "commoditization_vectors": [{
    "vector": "<e.g. open-source model parity>",
    "timeline": "<estimate>",
    "which_players_affected": "<description>"
  }],
  "open_source_risk": "<assessment>",
  "overall_threat_level": "high" | "medium" | "low"
}`,

  company_shortlist: `Generate the COMPANY SHORTLIST insight.

List companies worth further diligence. These are NOT scored — scoring happens in the Client pathway. Be selective: 5–12 companies with genuine signal.

Schema:
{
  "companies": [{
    "name": "<company name>",
    "sub_segment": "<where in the category they play>",
    "signal_summary": "<what signal you have on them>",
    "why_interesting": "<investment thesis fit>",
    "watch_out": "<specific risk or concern>",
    "website_url": "<optional>"
  }],
  "screening_note": "<what additional diligence would refine this list>"
}

Do NOT invent companies. If evidence is thin, return fewer names.`,

  gap_map: `Generate the EVIDENCE GAP MAP insight.

Schema:
{
  "evidence_gaps": [{
    "assumption_text": "<the assumption that lacks evidence>",
    "gap_description": "<what's missing>",
    "evidence_type_needed": "<what would fill the gap>",
    "impact_if_resolved": "thesis_strengthened" | "thesis_weakened" | "unclear"
  }],
  "data_room_gaps": ["<missing document or dataset>"],
  "recommended_diligence_actions": ["<specific action>"]
}`,

  adjacent_category: `Generate the ADJACENT CATEGORY READ-THROUGH insight.

Schema:
{
  "adjacent_categories": [{
    "name": "<category name>",
    "relationship": "<how it relates to the current category>",
    "read_through": "<what the adjacent category's trajectory implies for this thesis>",
    "relevance": "high" | "medium" | "low"
  }],
  "peer_category_comparisons": [{
    "peer_category": "<from the operator's peer categories list>",
    "key_difference": "<structural difference>",
    "implication_for_thesis": "<what this implies>"
  }]
}`,

  timing_read: `Generate the TIMING READ insight.

Schema:
{
  "hype_cycle_position": "pre_peak" | "peak_hype" | "trough" | "slope_of_enlightenment" | "plateau",
  "hype_cycle_rationale": "<evidence-based rationale>",
  "adoption_timeline": "<e.g. enterprise-ready in 18–24 months>",
  "leading_indicators_positive": ["<indicator>"],
  "leading_indicators_negative": ["<indicator>"],
  "why_now_assessment": "evidenced" | "partially_evidenced" | "asserted",
  "why_now_rationale": "<specific evidence for or against the timing thesis>",
  "time_horizon_fit": "well_aligned" | "too_early" | "too_late"
}`,

  // Positioning is generated by the dedicated positioning-generator, not this pipeline.
  // This stub satisfies the Record<MiInsightType, string> constraint.
  positioning: `Generate POSITIONING RECOMMENDATIONS — see positioning-generator.ts for the full schema.

Use the buildPositioningUserPrompt helper instead of this instruction when generating positioning.`,
};

export interface InsightsGeneratorInput {
  category_name: string;
  thesis: string;
  time_horizon_months: number | null;
  peer_categories: string[];
  intake_summary: string;
  assumptions_summary: string;
  evidence_summary: string;
  insight_type: MiInsightType;
}

export function buildInsightsSystemPrompt(): string {
  return INSIGHTS_SYSTEM_BASE;
}

export function buildInsightsUserPrompt(
  input: InsightsGeneratorInput,
): string {
  const instruction = INSIGHT_INSTRUCTIONS[input.insight_type];
  const horizon = input.time_horizon_months
    ? `${input.time_horizon_months} months`
    : "not specified";
  const peers =
    input.peer_categories.length > 0
      ? input.peer_categories.join(", ")
      : "none";

  return `INSIGHT TYPE: ${input.insight_type.toUpperCase().replace(/_/g, " ")}

CATEGORY: ${input.category_name}
TIME HORIZON: ${horizon}
PEER CATEGORIES: ${peers}

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
${input.assumptions_summary || "(none extracted yet)"}
"""

EVIDENCE COLLECTED:
"""
${input.evidence_summary || "(no evidence items yet)"}
"""

${instruction}

Return ONLY valid JSON. No prose, no markdown, no code fences.`;
}
