import type { MiDimension, MiRubricDimension } from "@/lib/types";

// ─── Shared operating mode injected into every MI prompt ──────────────────

export const MI_OPERATING_MODE = `MARKET INTELLIGENCE ANALYST MODE

You are a senior investment analyst performing category-level diligence for an institutional investor. Your job is to pressure-test an investment thesis about an AI market category — not to evaluate a specific company.

CORE RULES:
1. Ground every claim in the evidence provided. Do not invent market data, funding figures, or company names.
2. When evidence is thin or absent, say so explicitly. Uncertainty is data.
3. Distinguish between signals (repeatable, primary-source backed) and noise (media cycles, VC talking points without buyer confirmation).
4. Name specific risks, not generic categories. "Foundation model provider encroachment" must be followed by which provider, which capability, and which timeline.
5. Your outputs will be user-editable. Be direct, specific, and falsifiable.
6. Do not pad responses. Every sentence must add information not already stated.
7. Return only the JSON schema requested. No prose before or after.`;

// ─── Rubric seed (mirrors migration 00049) ────────────────────────────────

export const MI_DEFAULT_RUBRIC: MiRubricDimension[] = [
  {
    dimension: "thesis_durability" as MiDimension,
    label: "Thesis Durability",
    description:
      "How robust is the investment thesis to plausible shocks over the stated time horizon?",
    sub_criteria: [
      { id: "shock_resistance", label: "Shock Resistance", description: "Does the thesis hold under 3 plausible negative shocks?", weight: 0.4 },
      { id: "time_horizon_alignment", label: "Time Horizon Alignment", description: "Is the thesis scoped to a realistic adoption timeline?", weight: 0.35 },
      { id: "assumption_quality", label: "Assumption Quality", description: "Are load-bearing assumptions evidenced or asserted?", weight: 0.25 },
    ],
    weight: 0.1429,
    ordering: 1,
  },
  {
    dimension: "category_attractiveness" as MiDimension,
    label: "Category Attractiveness",
    description: "TAM realism, growth credibility, margin structure.",
    sub_criteria: [
      { id: "tam_realism", label: "TAM Realism", description: "Is the TAM grounded in bottom-up evidence?", weight: 0.35 },
      { id: "growth_credibility", label: "Growth Credibility", description: "Is category growth backed by leading indicators?", weight: 0.35 },
      { id: "margin_structure", label: "Margin Structure", description: "Do unit economics favor standalone winners?", weight: 0.30 },
    ],
    weight: 0.1429,
    ordering: 2,
  },
  {
    dimension: "competitive_defensibility" as MiDimension,
    label: "Competitive Defensibility",
    description: "Is there room for standalone winners, or is this a features race?",
    sub_criteria: [
      { id: "moat_evidence", label: "Moat Evidence", description: "Network effects, data advantages, or switching costs documented.", weight: 0.4 },
      { id: "features_vs_products", label: "Features vs. Products", description: "Incumbents shipping native equivalents?", weight: 0.35 },
      { id: "winner_take_most", label: "Winner-Take-Most Dynamics", description: "Concentration or fragmentation signals.", weight: 0.25 },
    ],
    weight: 0.1429,
    ordering: 3,
  },
  {
    dimension: "timing_confidence" as MiDimension,
    label: "Timing Confidence",
    description: "Is the 'why now' evidenced or asserted?",
    sub_criteria: [
      { id: "why_now_evidence", label: "Why Now Evidence", description: "Timing triggers documented?", weight: 0.45 },
      { id: "adoption_cycle", label: "Adoption Cycle Position", description: "Where in the hype/adoption cycle?", weight: 0.35 },
      { id: "velocity", label: "Signal Velocity", description: "Leading indicators accelerating or decelerating?", weight: 0.20 },
    ],
    weight: 0.1429,
    ordering: 4,
  },
  {
    dimension: "threat_concentration" as MiDimension,
    label: "Threat Concentration",
    description: "Exposure to FM provider moves, incumbent SaaS, or commoditization.",
    sub_criteria: [
      { id: "fm_provider_risk", label: "Foundation Model Provider Risk", description: "Value capturable natively by major FM providers?", weight: 0.4 },
      { id: "incumbent_response", label: "Incumbent SaaS Response", description: "Timeline for established vendors to ship equivalents?", weight: 0.35 },
      { id: "commoditization_vector", label: "Commoditization Vector", description: "Which part of the value chain is most exposed?", weight: 0.25 },
    ],
    weight: 0.1429,
    ordering: 5,
  },
  {
    dimension: "evidence_strength" as MiDimension,
    label: "Evidence Strength",
    description: "How much of the thesis rests on evidenced vs. asserted claims?",
    sub_criteria: [
      { id: "assumption_coverage", label: "Assumption Coverage", description: "Fraction of assumptions with supporting evidence.", weight: 0.4 },
      { id: "source_diversity", label: "Source Diversity", description: "Evidence spans multiple source types.", weight: 0.35 },
      { id: "recency", label: "Recency", description: "Evidence currency (within 12 months).", weight: 0.25 },
    ],
    weight: 0.1429,
    ordering: 6,
  },
  {
    dimension: "signal_noise_ratio" as MiDimension,
    label: "Signal-to-Noise Ratio",
    description: "Quality of available data vs. hype.",
    sub_criteria: [
      { id: "primary_vs_secondary", label: "Primary vs. Secondary Signal", description: "Ratio of primary to secondary signals.", weight: 0.4 },
      { id: "hype_discount", label: "Hype Discount", description: "Ability to distinguish hype from durable demand.", weight: 0.35 },
      { id: "contradiction_rate", label: "Contradiction Rate", description: "Fraction of evidence that weakens assumptions.", weight: 0.25 },
    ],
    weight: 0.1429,
    ordering: 7,
  },
];
