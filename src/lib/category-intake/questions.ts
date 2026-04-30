/**
 * AI Category Diligence — structured intake questions.
 *
 * Replaces the previous LLM-generated free-text intake on the category
 * pathway. Every question is single- or multi-select so answers map
 * cleanly to the deterministic Category Diligence Confidence score
 * (0–100) — same model as Commercial Pain Confidence on the target
 * pathway.
 *
 * Sections appear in the order listed. The first section in the
 * array becomes the first tab in the questionnaire UI.
 *
 * Field IDs are stable across deploys; do not rename them or any
 * persisted answer in `user_workspace_state` will fail to map back.
 */

import type { IntakeQuestion } from "@/components/engagements/intake-questionnaire";

export const CATEGORY_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ────────────────── Market Reality ──────────────────
  {
    id: "category_market_size",
    section: "Market Reality",
    prompt: "Total addressable market for this category",
    type: "single",
    options: [
      "<$100M",
      "$100M–$500M",
      "$500M–$2B",
      "$2B–$10B",
      "$10B+",
      "Unknown",
    ],
  },
  {
    id: "category_growth_rate",
    section: "Market Reality",
    prompt: "Category growth rate",
    type: "single",
    options: [
      "Hyper-growth (>50% YoY)",
      "High growth (25–50% YoY)",
      "Moderate growth (10–25% YoY)",
      "Slow growth (<10% YoY)",
      "Flat or declining",
      "Unknown",
    ],
  },
  {
    id: "category_maturity",
    section: "Market Reality",
    prompt: "Where is this category in its lifecycle?",
    type: "single",
    options: [
      "Pre-formation — no clear category yet",
      "Emerging — first wave of products shipping",
      "Forming — category recognized, leaders unclear",
      "Established — recognized leaders, growing fast",
      "Mature — slowing growth, consolidation",
      "Declining",
    ],
  },
  {
    id: "category_demand_signal",
    section: "Market Reality",
    prompt: "Strongest demand signals (select all that apply)",
    type: "multi",
    options: [
      "Active analyst coverage (Gartner, Forrester)",
      "Public reference customers paying real money",
      "Multiple recent funding rounds in the space",
      "Reported pilot-to-paid conversion above 40%",
      "Top-down enterprise mandates",
      "Bottoms-up adoption / PLG signals",
      "Mostly noise / press cycle",
      "Unknown",
    ],
  },

  // ────────────────── AI Necessity ──────────────────
  {
    id: "category_ai_necessity",
    section: "AI Necessity",
    prompt: "Is AI necessary to deliver the category's outcome?",
    help: "If a competent rules engine or workflow tool could deliver the same outcome, AI necessity is weaker.",
    type: "single",
    options: [
      "Yes — AI is the only viable path",
      "Mostly — non-AI alternatives are weaker but viable",
      "Partially — AI is one of several routes",
      "Weakly — non-AI alternatives are competitive",
      "No — AI is not required",
      "Unknown",
    ],
  },
  {
    id: "category_non_ai_alternatives",
    section: "AI Necessity",
    prompt: "Viable non-AI alternatives in this category (select all that apply)",
    type: "multi",
    options: [
      "Rule-based / deterministic systems",
      "Classical ML (no LLM)",
      "Workflow / no-code automation",
      "Outsourced services / BPO",
      "Better-staffed manual process",
      "None — AI is the only viable path",
      "Unknown",
    ],
  },
  {
    id: "category_model_dependency",
    section: "AI Necessity",
    prompt: "Foundation model dependency profile",
    type: "single",
    options: [
      "Single closed-model provider (e.g. OpenAI only)",
      "Two closed-model providers as fallback",
      "Closed model with self-hosted backup",
      "Self-hosted / open-weight primary",
      "Mixed — depends on the company",
      "Unknown",
    ],
  },

  // ────────────────── Buyer & Problem ──────────────────
  {
    id: "category_primary_buyer",
    section: "Buyer & Problem",
    prompt: "Primary buyer for products in this category",
    type: "single",
    options: [
      "C-suite / executive sponsor",
      "Operations leader (COO / VP Ops)",
      "Tech / engineering leader (CTO / CIO)",
      "Data / analytics leader",
      "Compliance / risk / legal",
      "Sales / GTM leader",
      "Line-of-business owner",
      "Unknown",
    ],
  },
  {
    id: "category_problem_severity",
    section: "Buyer & Problem",
    prompt: "How severe is the underlying problem the category solves?",
    type: "single",
    options: [
      "Mission-critical",
      "High",
      "Moderate",
      "Low",
      "Unclear",
    ],
  },
  {
    id: "category_buying_urgency",
    section: "Buyer & Problem",
    prompt: "Typical buying urgency in the category",
    type: "single",
    options: [
      "Immediate",
      "Near-term",
      "Medium-term",
      "Long-term",
      "No clear urgency",
      "Unknown",
    ],
  },
  {
    id: "category_decision_horizon",
    section: "Buyer & Problem",
    prompt: "Average buyer decision horizon",
    type: "single",
    options: [
      "<30 days",
      "30–90 days",
      "3–6 months",
      "6–12 months",
      ">12 months",
      "Unknown",
    ],
  },

  // ────────────────── Competition & Defensibility ──────────────────
  {
    id: "category_competitive_density",
    section: "Competition & Defensibility",
    prompt: "Competitive density today",
    type: "single",
    options: [
      "Empty — first credible movers",
      "Sparse — 2–4 named players",
      "Crowded — 5–15 named players",
      "Saturated — many players, hard to differentiate",
      "Dominated by one incumbent",
      "Unknown",
    ],
  },
  {
    id: "category_moats",
    section: "Competition & Defensibility",
    prompt: "Most credible moat types in the category (select all that apply)",
    type: "multi",
    options: [
      "Proprietary data / data flywheel",
      "Workflow lock-in / deep integration",
      "Distribution / channel exclusivity",
      "Regulatory / compliance certifications",
      "Network effects",
      "Brand / trust",
      "None obvious — commoditized",
      "Unknown",
    ],
  },
  {
    id: "category_incumbent_threat",
    section: "Competition & Defensibility",
    prompt: "Incumbent / hyperscaler threat",
    help: "How likely is a Microsoft / Google / Salesforce / SAP to ship a comparable feature within 12 months?",
    type: "single",
    options: [
      "Very high — likely already on roadmap",
      "High — 12-month risk",
      "Moderate — 18–24 month risk",
      "Low — incumbents structurally disadvantaged",
      "Unknown",
    ],
  },
  {
    id: "category_replacement_test",
    section: "Competition & Defensibility",
    prompt: "What survives if a competitor spent $5M and 6 months trying to replicate?",
    type: "multi",
    options: [
      "Proprietary dataset",
      "Customer integrations / workflow depth",
      "Exclusive distribution / channel deals",
      "Regulatory approvals / audits",
      "Brand / customer trust",
      "Nothing material would survive",
      "Unknown",
    ],
  },

  // ────────────────── Regulatory & Risk ──────────────────
  {
    id: "category_regulatory_clarity",
    section: "Regulatory & Risk",
    prompt: "Regulatory clarity for this category",
    type: "single",
    options: [
      "Clear — established framework, low ambiguity",
      "Mostly clear — minor open questions",
      "Mixed — some areas defined, others in flux",
      "Unclear — active rulemaking / litigation",
      "Hostile — likely tightening",
      "Unknown",
    ],
  },
  {
    id: "category_data_sensitivity",
    section: "Regulatory & Risk",
    prompt: "Data sensitivity profile (select all that apply)",
    type: "multi",
    options: [
      "PII / personal data",
      "PHI / health records",
      "Financial / banking data",
      "Privileged / legal communications",
      "Trade secrets / IP",
      "Critical infrastructure / public safety",
      "Low-sensitivity public data",
      "Unknown",
    ],
  },
  {
    id: "category_compliance_burden",
    section: "Regulatory & Risk",
    prompt: "Compliance burden to operate in this category",
    type: "single",
    options: [
      "Heavy (SOC2 + sector-specific certifications)",
      "Moderate (SOC2 / GDPR baseline)",
      "Light (basic security hygiene)",
      "None material",
      "Unknown",
    ],
  },

  // ────────────────── Outcome Proof & Adoption ──────────────────
  {
    id: "category_outcome_proof",
    section: "Outcome Proof & Adoption",
    prompt: "How well are category outcomes proven today?",
    type: "single",
    options: [
      "Proven with customer data",
      "Proven with case studies",
      "Partially supported by usage metrics",
      "Supported by testimonials only",
      "Claimed by management only",
      "Not proven",
      "Unknown",
    ],
  },
  {
    id: "category_typical_proof_forms",
    section: "Outcome Proof & Adoption",
    prompt: "Forms of proof commonly available (select all that apply)",
    type: "multi",
    options: [
      "Named customer logos",
      "Quantified case studies",
      "Production usage metrics / dashboards",
      "Independent third-party validation",
      "Testimonials / quotes only",
      "None — claims only",
      "Unknown",
    ],
  },
  {
    id: "category_adoption_curve",
    section: "Outcome Proof & Adoption",
    prompt: "Where on the adoption curve are typical buyers?",
    type: "single",
    options: [
      "Innovators (<2.5%)",
      "Early adopters (2.5–16%)",
      "Early majority (16–50%)",
      "Late majority (50–84%)",
      "Laggards (>84%)",
      "Unknown",
    ],
  },

  // ────────────────── Operating & Unit Economics ──────────────────
  {
    id: "category_unit_economics",
    section: "Operating & Unit Economics",
    prompt: "Unit-economics outlook for the category",
    type: "single",
    options: [
      "Healthy — high gross margin (>70%)",
      "Workable — gross margin 50–70%",
      "Margin-compressed — gross margin 30–50%",
      "Loss-making at scale (<30%)",
      "Unknown",
    ],
  },
  {
    id: "category_cost_drivers",
    section: "Operating & Unit Economics",
    prompt: "Dominant cost drivers in the category (select all that apply)",
    type: "multi",
    options: [
      "Inference / model API spend",
      "Data acquisition or labeling",
      "Implementation / professional services",
      "Sales & marketing (long sales cycles)",
      "Compliance / certification overhead",
      "Engineering headcount",
      "Unknown",
    ],
  },
  {
    id: "category_business_model",
    section: "Operating & Unit Economics",
    prompt: "Predominant business model in the category",
    type: "single",
    options: [
      "Per-seat SaaS",
      "Usage-based / consumption pricing",
      "Outcome / value-based pricing",
      "Hybrid platform + services",
      "License + maintenance",
      "Mixed — no dominant model",
      "Unknown",
    ],
  },
];
