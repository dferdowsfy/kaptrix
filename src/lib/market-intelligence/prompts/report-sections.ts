import { MI_OPERATING_MODE } from "@/lib/market-intelligence/rubric-config";

// ─── Category Diligence Memo — Report Section Config ─────────────────────
//
// 9 sections. Each section is generated in a separate LLM call and
// concatenated. This mirrors the AdvancedReportSection pattern in
// advanced-reports.ts but is entirely category-native.

export interface MiReportSection {
  id: string;
  label: string;
  maxTokens: number;
  instruction: string;
}

const REPORT_SYSTEM_BASE = `${MI_OPERATING_MODE}

You are writing a CATEGORY DILIGENCE MEMO for an investment committee. This is NOT a company evaluation — it is a category-level thesis assessment.

FORMAT RULES:
- Use GitHub-flavored markdown.
- No code fences (use prose and tables).
- Lead each section with a one-sentence summary verdict.
- Use **bold** for key terms, risks, and verdicts.
- Tables for structured comparisons of 3+ items.
- Blockquotes for the single most important takeaway in each section.
- Never repeat content from other sections.
- Every claim must cite an evidence item, a score, or an assumption.
- End each section with a bold **Verdict:** or **Recommendation:** line.`;

export const REPORT_SYSTEM_PROMPT = REPORT_SYSTEM_BASE;

export const MI_REPORT_SECTIONS: MiReportSection[] = [
  {
    id: "executive_summary",
    label: "Executive Summary",
    maxTokens: 800,
    instruction: `OUTPUT ONLY the Executive Summary section.

Start with: ## Executive Summary

Cover:
1. The thesis in one sentence and the operator's conviction level (High / Medium / Low).
2. Three critical findings (what's most supported, what's most uncertain, the biggest risk).
3. Recommended action (invest with conditions / monitor / pass) with a one-sentence rationale.
4. Key conditions or milestones that would change the call.

Do NOT include scores or detailed analysis — this is the IC-facing summary only. ~300–400 words.

End with **Verdict:** [action] — [one sentence rationale].`,
  },
  {
    id: "thesis_pressure_test",
    label: "Thesis Pressure Test",
    maxTokens: 1600,
    instruction: `OUTPUT ONLY the Thesis Pressure Test section.

Start with: ## 1. Thesis Pressure Test

Structure:
- **Assumptions Holding**: List each assumption that has supporting evidence. For each, cite the evidence item and explain why it supports the assumption.
- **Assumptions Weak**: List each assumption with thin or contested evidence. Explain the weakness specifically.
- **Assumptions Contradicted**: List each assumption where evidence contradicts the thesis. Name the contradiction and its implications.
- **Load-Bearing Analysis**: Which unresolved assumption poses the highest risk to the thesis? Why?

Include a table: Assumption | Status | Evidence Strength | Impact If Wrong

End with **Verdict:** on thesis integrity and what evidence would most change the call.`,
  },
  {
    id: "category_structure",
    label: "Category Structure & Map",
    maxTokens: 1400,
    instruction: `OUTPUT ONLY the Category Structure & Map section.

Start with: ## 2. Category Structure & Map

Cover:
- Horizontal vs. vertical plays (with named examples)
- Infrastructure vs. application layer (who controls what)
- Picks-and-shovels opportunities
- Consolidation signals (any M&A, acqui-hires, platform moves)
- Structural summary: is this a winner-take-most or fragmented category?

Include a structural map table: Player Type | Examples | Moat | Threat | Stage

End with **Verdict:** on category structure — is there room for standalone winners?`,
  },
  {
    id: "evidence_coverage",
    label: "Evidence Coverage & Gap Analysis",
    maxTokens: 1200,
    instruction: `OUTPUT ONLY the Evidence Coverage & Gap Analysis section.

Start with: ## 3. Evidence Coverage & Gap Analysis

Cover:
- Evidence inventory by source type (market reports, funding data, customer signals, expert interviews, regulatory, etc.)
- Coverage per load-bearing assumption (which are evidenced, which are asserted)
- Top 3 evidence gaps: what's missing, what type of evidence would fill each gap, and the impact on the thesis if found
- Data room gaps: what documents or datasets would materially improve confidence

Include a coverage table: Assumption | Evidence Status | Source Count | Gap

End with **Verdict:** on evidence sufficiency — is this diligence decision-ready?`,
  },
  {
    id: "scoring_rubric",
    label: "Scoring Rubric & Justifications",
    maxTokens: 1800,
    instruction: `OUTPUT ONLY the Scoring Rubric & Justifications section.

Start with: ## 4. Scoring Rubric

For each of the 7 MI dimensions, render as:
**[Dimension Label]: X.X / 5.0**
- Justification: [2–3 sentences citing specific evidence, assumption status, or gaps]
- What would move this score +1.0: [specific action or evidence]

After all 7 dimensions, compute and display:
**Weighted Composite Score: X.X / 5.0**

Include a scores table: Dimension | Score | Evidence Grounding | Key Risk

End with **Verdict:** on overall thesis strength and the weakest dimension that needs attention.`,
  },
  {
    id: "positioning_recommendations",
    label: "Positioning Recommendations",
    maxTokens: 1400,
    instruction: `OUTPUT ONLY the Positioning Recommendations section.

Start with: ## 5. Positioning Recommendations

Cover:
- Sub-segments ranked by thesis alignment (with rationale per sub-segment)
- Recommended entry strategy (infrastructure / horizontal application / vertical depth / picks-and-shovels)
- Stage recommendation (seed / growth / late / public) with time-horizon rationale
- Adjacent categories worth covering in parallel

Include a sub-segment table: Sub-segment | Alignment | Entry Approach | Key Risk | Stage

End with **Recommendation:** on where to focus capital or attention given the thesis and evidence.`,
  },
  {
    id: "company_shortlist",
    label: "Company Shortlist",
    maxTokens: 1200,
    instruction: `OUTPUT ONLY the Company Shortlist section.

Start with: ## 6. Company Shortlist

List companies worth further diligence. These are NOT scored — that happens in Client pathway diligence.

For each company:
- **[Company Name]** — [Sub-segment]
- Signal: [what signal justifies inclusion]
- Thesis fit: [why this company fits the investment thesis]
- Watch out: [one specific risk or concern]

Include a shortlist table: Company | Sub-segment | Signal Strength | Thesis Fit | Watch Out

End with **Screening Note:** on what additional diligence would refine this list.`,
  },
  {
    id: "risks_and_reversals",
    label: "Risks & What Would Change the Call",
    maxTokens: 1400,
    instruction: `OUTPUT ONLY the Risks & What Would Change the Call section.

Start with: ## 7. Risks & What Would Change the Call

Cover:
- Top 3 risks to the thesis (specific, named, with probability and impact)
- Foundation model provider risk: which provider, which capability, which timeline, what it would do to the category
- Incumbent SaaS response risk: which vendors, which timeline, which sub-segments are most exposed
- Regulatory / policy risk: specific regulations, pending decisions, or policy signals
- What would make this a PASS: name the specific findings that would cause a pass decision
- What would strengthen conviction: name the specific evidence or milestones that would move conviction from medium → high

Include a risk table: Risk | Probability | Impact | Mitigation | Timeline

End with **Verdict:** on overall risk profile and what monitoring signals to track post-investment.`,
  },
  {
    id: "appendix",
    label: "Appendix — Methodology & Sources",
    maxTokens: 600,
    instruction: `OUTPUT ONLY the Appendix section.

Start with: ## Appendix — Methodology & Sources

Cover:
- Methodology note: how this category diligence was conducted (intake → evidence → insights → scoring → positioning)
- Source inventory: list all evidence items by source type (do not include URLs — just source names and types)
- Scoring methodology note: explain the 7 MI dimensions and weighted composite approach
- Limitations: what this diligence cannot tell us and why

No verdict needed. This section is reference-only.`,
  },
];
