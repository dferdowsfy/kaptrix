// Catalog of advanced, on-demand LLM-generated reports surfaced on
// the preview reports page. Each report is triggered explicitly by
// the operator (never auto-run) and pulls the full engagement
// knowledge base for grounding.

export type AdvancedReportId =
  | "master_diligence"
  | "ic_memo"
  | "risk_register"
  | "value_creation"
  | "evidence_coverage";

export interface AdvancedReportConfig {
  id: AdvancedReportId;
  title: string;
  tagline: string;
  description: string;
  accent: string; // tailwind gradient classes for card header
  eyebrow: string;
  systemPrompt: string;
  userPromptIntro: string;
}

const FORMAT_RULES = `Output format: clean markdown. Use '#' for the report title, '##' for each numbered top-level section, '###' for sub-sections, '-' for bullet points, and bold ('**text**') sparingly for emphasis. Do NOT wrap the output in code fences. Do NOT include a preamble or closing remarks — return the report only.`;

const MASTER_PROMPT = `You are performing institutional-grade AI diligence for a private equity firm.

You have access to:
- Dimension scores (0-5) and weights
- Sub-criteria scoring
- Uploaded artifacts (docs, diagrams, code, policies)
- Extracted evidence and knowledge base context

Your task is to produce a deep, evidence-backed AI Diligence Report that can withstand Investment Committee scrutiny.

CRITICAL RULES:
- No generic statements. Every claim must reference evidence or scoring.
- If evidence is missing, explicitly state "No supporting evidence found."
- Highlight contradictions between artifacts and claims.
- Prioritize risk, not description.
- Write like an operator, not a consultant.

STRUCTURE:

1. System & AI Architecture Reality
- Describe actual system design (not marketing claims)
- Identify where AI is truly used vs implied
- Call out mismatches between stated vs observed architecture

2. Product Credibility Breakdown
- Score-backed analysis of whether AI drives value or is superficial
- Identify "demo quality vs production reality" gaps
- Evidence: reference specific artifacts or missing proof

3. Data Advantage vs Illusion
- Explicitly determine if data is:
  a) proprietary and compounding
  b) operational but replaceable
  c) commoditized
- Justify classification using evidence

4. Vendor & Model Dependency Risk
- Quantify reliance on specific providers (OpenAI, Anthropic, etc.)
- Identify switching friction and margin risk
- Call out hidden dependencies

5. Failure Mode Analysis (MANDATORY)
Identify top 3 ways this system breaks in production:
- Trigger
- Technical failure point
- Business impact
- Whether mitigation exists

6. Governance Stress Test
- Do not describe controls — test them
- Where would controls fail under edge cases?
- Is auditability real or superficial?

7. Production Reality Check
- Can this scale? Why or why not?
- Where will cost explode?
- Where will reliability fail?

8. Score Decomposition
For each dimension:
- Score
- Why it earned that score
- What would need to change to move +1 point

9. So What (Investment Impact)
Translate findings into:
- What breaks the business
- What limits scale
- What reduces exit multiple

10. Evidence Gaps
- List missing artifacts that materially impact confidence
- Label affected sections as LOW CONFIDENCE where applicable

Output must be dense, specific, and defensible. ${FORMAT_RULES}`;

const IC_MEMO_PROMPT = `You are writing an Investment Committee memo based on AI diligence.

This is a DECISION document, not a summary.

RULES:
- No fluff
- No repetition
- Every statement must tie to risk, value, or decision impact

STRUCTURE:

1. Final Recommendation
- Invest / Proceed with Conditions / High Risk / Do Not Proceed
- Confidence score (0-100%)
- One sentence: "This deal works / breaks because…"

2. Non-Obvious Insight (MANDATORY)
- What is true about this company that is NOT obvious from a surface review?

3. 3 Critical Strengths
- Must be specific and defensible
- Tie to value creation or defensibility

4. 3 Critical Risks
- Must be things that could realistically break the investment
- No generic risks

5. What Would Kill This Deal
- Single biggest failure point

6. What Would 2x the Value
- Most leveraged improvement opportunity

7. Deal Implications
- Impact on valuation (overvalued / fair / undervalued based on AI reality)
- Scalability constraints
- Exit risk

Write this like a partner presenting to IC — direct, sharp, and high conviction. ${FORMAT_RULES}`;

const RISK_REGISTER_PROMPT = `Generate a non-generic, operator-grade Technical Risk Register.

RULES:
- No abstract risks (e.g., "scalability issues" is not acceptable)
- Each risk must be tied to a specific system behavior, architecture decision, or missing control
- Risks must be testable in reality

Output: markdown. Start with '# Technical Risk Register'. For each risk use a '## R<N>. <Risk Title>' heading followed by the fields below as a bulleted list.

For each risk, include:
- Risk Title (specific, not broad)
- System Area (exact component: model, API, pipeline, data layer, etc.)
- Description (what exactly fails and why)
- Trigger Condition (when this risk materializes)
- Evidence (artifact reference OR explicitly state "No direct evidence, inferred from X")
- Severity (justify)
- Likelihood (justify)
- Business Impact (tie to revenue, cost, or operations)
- Mitigation (must be actionable, not generic)
- Residual Risk (after mitigation)

Prioritize the top 10-15 risks only. Depth over volume. Order from highest to lowest residual risk. ${FORMAT_RULES}`;

const VALUE_CREATION_PROMPT = `You are creating a post-investment execution plan, not a generic roadmap.

RULES:
- Every action must tie directly to a risk or missed opportunity identified earlier
- No vague actions ("improve system", "enhance governance")
- Actions must be executable by a real team

STRUCTURE:

1. Top 7 Actions (Ranked)
For each:
- What exactly to do
- What problem it fixes
- Why it matters economically

2. Value Leverage
- Which 2 actions create disproportionate value?

3. Cost Reduction Opportunities
- Where can AI costs be reduced or optimized?

4. Risk Reduction Moves
- Which actions materially reduce catastrophic failure risk?

5. 30 / 60 / 90 Execution Plan
Use '### 0-30 Days', '### 31-60 Days', '### 61-90 Days' sub-headings.
For each phase:
- Who does what (engineering, product, ops)
- What is delivered in each phase

6. Measurable Outcomes
- Define success in metrics (cost ↓ %, latency ↓, accuracy ↑, etc.)

This should feel like an operating playbook, not advice. ${FORMAT_RULES}`;

const COVERAGE_PROMPT = `You are auditing the QUALITY of the diligence itself.

RULES:
- Be critical — assume incomplete data
- Do not overstate confidence

STRUCTURE:

1. Artifact Inventory
- List artifacts analyzed (use actual filenames / categories from the evidence)
- Categorize (Product, Data, Infra, Governance)

2. Coverage by Dimension
For each scoring dimension (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation):
- Evidence present (specific)
- Evidence missing
- Coverage rating (High / Medium / Low)

3. Confidence Scoring
- Assign confidence (0-100%) to each dimension score
- Justify based on evidence strength

4. Unsupported Conclusions (MANDATORY)
- Identify where conclusions rely on weak or indirect evidence

5. Critical Gaps
- What missing artifacts would most change the outcome?

6. Overall Reliability
- Can this diligence be trusted for an investment decision? Why or why not?

This report should increase trust by exposing weaknesses, not hiding them. ${FORMAT_RULES}`;

export const ADVANCED_REPORTS: AdvancedReportConfig[] = [
  {
    id: "master_diligence",
    title: "Master AI Diligence Report",
    tagline: "IC-grade, evidence-backed diligence",
    description:
      "Dense 10-section institutional-grade report covering architecture reality, data advantage, vendor risk, failure modes, governance stress tests, score decomposition, and investment impact.",
    accent: "from-indigo-600 via-indigo-500 to-violet-500",
    eyebrow: "Diligence · Master",
    systemPrompt: MASTER_PROMPT,
    userPromptIntro:
      "Produce the Master AI Diligence Report for the target company below.",
  },
  {
    id: "ic_memo",
    title: "Executive Summary / IC Memo",
    tagline: "Decision document for the Investment Committee",
    description:
      "Sharp partner-style memo with final recommendation, non-obvious insight, 3 critical strengths, 3 critical risks, deal-killers, 2x levers, and deal implications for valuation, scalability, and exit.",
    accent: "from-slate-900 via-slate-800 to-indigo-800",
    eyebrow: "IC · Memo",
    systemPrompt: IC_MEMO_PROMPT,
    userPromptIntro:
      "Write the Investment Committee memo for the target company below.",
  },
  {
    id: "risk_register",
    title: "Technical Risk Register",
    tagline: "Operator-grade, testable risks",
    description:
      "Top 10-15 concrete technical risks — each tied to a specific system behavior or missing control — with trigger, evidence, severity, likelihood, business impact, actionable mitigation, and residual risk.",
    accent: "from-rose-600 via-rose-500 to-amber-500",
    eyebrow: "Risk · Register",
    systemPrompt: RISK_REGISTER_PROMPT,
    userPromptIntro:
      "Produce the Technical Risk Register for the target company below.",
  },
  {
    id: "value_creation",
    title: "Value Creation / 100-Day Plan",
    tagline: "Post-investment execution playbook",
    description:
      "Top 7 ranked actions tied to identified risks and opportunities, with value-leverage and cost-reduction picks, risk-reduction moves, a 30/60/90 execution plan with owners, and measurable metric outcomes.",
    accent: "from-emerald-600 via-emerald-500 to-lime-500",
    eyebrow: "Plan · 100 Days",
    systemPrompt: VALUE_CREATION_PROMPT,
    userPromptIntro:
      "Produce the Value Creation / 100-Day execution plan for the target company below.",
  },
  {
    id: "evidence_coverage",
    title: "Evidence / Artifact Coverage Report",
    tagline: "Critical audit of the diligence itself",
    description:
      "Self-critical audit of evidence quality: artifact inventory, coverage by dimension, 0-100% confidence scoring, unsupported conclusions, critical gaps, and an overall reliability verdict.",
    accent: "from-slate-700 via-slate-600 to-slate-500",
    eyebrow: "Evidence · Coverage",
    systemPrompt: COVERAGE_PROMPT,
    userPromptIntro:
      "Produce the Evidence / Artifact Coverage Report for the target company below.",
  },
];

export function getAdvancedReportConfig(
  id: string,
): AdvancedReportConfig | null {
  return ADVANCED_REPORTS.find((r) => r.id === id) ?? null;
}
