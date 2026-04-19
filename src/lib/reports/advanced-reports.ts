// Catalog of advanced, on-demand LLM-generated reports surfaced on
// the preview reports page. Each report is triggered explicitly by
// the operator (never auto-run) and pulls the full engagement
// knowledge base for grounding.

export type AdvancedReportId =
  | "master_diligence"
  | "risk_register"
  | "competitive_posture"
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

const MASTER_PROMPT = `You are an AI diligence expert evaluating a company's AI capabilities for investment and operational risk.

Using all available inputs (scores across dimensions, uploaded artifacts, extracted evidence, and knowledge base context), generate a comprehensive AI Diligence Report.

Audience: sophisticated, non-technical investors.

Structure the report with the following top-level sections and headings. Use markdown ('#' for report title, '##' for each numbered section, '###' for sub-sections, '-' for bullet points). Do not wrap the output in code fences.

1. Overview
- Summarize core AI use cases
- Explain where AI sits in the product/workflow
- Clarify whether AI is central or peripheral

2. Product Credibility
- Assess demo vs production gap
- Evaluate customer validation and real-world usage
- Determine if this is true AI capability or a wrapper

3. Tooling & Vendor Exposure
- Analyze reliance on external models/vendors
- Identify concentration risk and switching cost
- Highlight API dependency fragility

4. Data & Sensitivity Risk
- Evaluate data sources and ownership
- Assess sensitivity (PII, regulated data)
- Review training data provenance and tenant isolation

5. Governance & Safety
- Assess logging, traceability, and auditability
- Evaluate human-in-the-loop controls
- Identify gaps in output risk management

6. Production Readiness
- Evaluate scalability and system reliability
- Assess monitoring, incident response, and drift handling
- Analyze cost per inference and scaling constraints

7. Open Validation / Unknowns
- Identify missing evidence and blind spots
- Highlight areas requiring deeper validation

8. So What (Critical)
For each major finding:
- Explain business implication
- Describe what could break
- Quantify impact on valuation, scalability, or exit potential

Do not speculate without labeling uncertainty. Prioritize evidence-backed insights and decision-relevant clarity. When evidence is thin, say so explicitly rather than inventing detail.`;

const RISK_REGISTER_PROMPT = `You are producing a structured Technical Risk Register from all identified findings in the provided evidence.

Each risk must be discrete, evidence-backed, and actionable.

Output format: markdown. Start with '# Technical Risk Register'. Then for each risk use a '## R<N>. <Risk Title>' heading followed by the fields below rendered as a definition-style bullet list.

For each risk include:
- Description
- Evidence (quote or paraphrase the source from artifacts, scoring, or analysis)
- Severity (Low / Medium / High / Critical)
- Likelihood (Low / Medium / High)
- Impact Area (Product, Data, Operations, Governance, Financial)
- Mitigation Recommendation
- Time Horizon (Immediate / Near-term / Long-term)

Prioritize the highest-severity risks first. Only emit risks that are supported by the evidence. Do not invent risks.`;

const COMPETITIVE_PROMPT = `You are analyzing the company's AI capability relative to comparable companies using all available engagement context.

Avoid generic benchmarking. Be specific and evidence-driven. Only cite peers when the evidence or your own knowledge supports a real comparison.

Output format: markdown. Start with '# Competitive Posture Report'. Use '##' for each numbered section.

1. Peer Identification
- Identify relevant comparable companies based on use case, architecture, and AI maturity
- Explain why each is comparable

2. Relative Positioning
- Classify target as: Leader, Competitive, Average, or Lagging
- Support classification using scoring dimensions and evidence

3. Strength vs Peers
- Identify where the company outperforms peers

4. Weakness vs Peers
- Identify where the company is structurally weaker

5. Strategic Implication
Explain what this positioning means for:
- Market competitiveness
- Differentiation
- Long-term defensibility

If evidence is insufficient to name peers with confidence, say so explicitly and describe the archetype of peer the target should be compared against.`;

const VALUE_CREATION_PROMPT = `You are producing a prioritized Value Creation / 100-Day Plan based on all identified risks and opportunities in the engagement evidence.

Focus on practical, high-impact actions tied to business value. Each action must map back to a specific finding or risk in the evidence.

Output format: markdown. Start with '# Value Creation / 100-Day Plan'. Use '##' for each numbered section.

1. Priority Actions
- 5 to 10 actions
- Each must address a real, evidence-backed issue and be concretely actionable

2. Impact vs Effort
For each action:
- Impact (Low / Medium / High)
- Effort (Low / Medium / High)

3. 30 / 60 / 90 Day Plan
- Sequence actions into 30, 60, and 90 day windows as '### 0-30 Days', '### 31-60 Days', '### 61-90 Days'
- Reflect dependencies and execution order

4. Expected Outcomes
Describe expected improvements across:
- Risk reduction
- Cost efficiency
- Product strength
- Competitive positioning`;

const COVERAGE_PROMPT = `You are assessing the quality, completeness, and reliability of the evidence used in this AI diligence engagement.

Focus on transparency and confidence. Be explicit about what is missing.

Output format: markdown. Start with '# Evidence / Artifact Coverage Report'. Use '##' for each numbered section.

1. Artifacts Reviewed
- List and categorize artifacts reviewed (Product, Data, Infrastructure, Governance). Reference the actual filenames / document categories that appear in the evidence.

2. Coverage Assessment
- Identify areas with strong evidence
- Identify weak or missing coverage across the six scoring dimensions (Product Credibility, Tooling Exposure, Data Sensitivity, Governance & Safety, Production Readiness, Open Validation)

3. Confidence Levels
- Assign Low / Medium / High confidence to each major scoring dimension
- Justify based on evidence quality and completeness

4. Gaps & Blind Spots
- Identify critical missing artifacts or data
- Explain how these gaps impact overall confidence in the assessment

Be explicit about uncertainty and evidence limitations. Never fabricate artifact names.`;

export const ADVANCED_REPORTS: AdvancedReportConfig[] = [
  {
    id: "master_diligence",
    title: "Master AI Diligence Report",
    tagline: "Comprehensive investor-grade assessment",
    description:
      "Full 8-section diligence write-up covering overview, credibility, vendor exposure, data risk, governance, production readiness, open validation, and the 'so what' for each finding.",
    accent: "from-indigo-600 via-indigo-500 to-violet-500",
    eyebrow: "Diligence · Master",
    systemPrompt: MASTER_PROMPT,
    userPromptIntro:
      "Generate the Master AI Diligence Report for the target company below.",
  },
  {
    id: "risk_register",
    title: "Technical Risk Register",
    tagline: "Discrete, evidence-backed risks",
    description:
      "Structured register of every material technical risk surfaced by the evidence, with severity, likelihood, impact area, mitigation, and time horizon for each.",
    accent: "from-rose-600 via-rose-500 to-amber-500",
    eyebrow: "Risk · Register",
    systemPrompt: RISK_REGISTER_PROMPT,
    userPromptIntro:
      "Produce the Technical Risk Register for the target company below.",
  },
  {
    id: "competitive_posture",
    title: "Competitive Posture Report",
    tagline: "Relative positioning vs comparable peers",
    description:
      "Specific, evidence-driven comparison against real or archetypal peers — classified as Leader, Competitive, Average, or Lagging — with strengths, weaknesses, and strategic implications.",
    accent: "from-sky-600 via-cyan-500 to-teal-500",
    eyebrow: "Competitive · Posture",
    systemPrompt: COMPETITIVE_PROMPT,
    userPromptIntro:
      "Produce the Competitive Posture Report for the target company below.",
  },
  {
    id: "value_creation",
    title: "Value Creation / 100-Day Plan",
    tagline: "Prioritized post-close action plan",
    description:
      "5 to 10 concrete priority actions with impact vs effort ratings, sequenced into a 30 / 60 / 90 day rollout, each tied to a real finding and the business value it unlocks.",
    accent: "from-emerald-600 via-emerald-500 to-lime-500",
    eyebrow: "Plan · 100 Days",
    systemPrompt: VALUE_CREATION_PROMPT,
    userPromptIntro:
      "Produce the Value Creation / 100-Day Plan for the target company below.",
  },
  {
    id: "evidence_coverage",
    title: "Evidence / Artifact Coverage Report",
    tagline: "Confidence and gaps in the evidence base",
    description:
      "Transparent assessment of which artifacts were reviewed, where coverage is strong vs weak across the six scoring dimensions, and which gaps materially affect confidence.",
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
