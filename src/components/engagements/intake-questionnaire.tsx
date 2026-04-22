"use client";

import { useEffect, useRef, useState } from "react";
import {
  INDUSTRY_PROFILES,
  type Industry,
} from "@/lib/industry-requirements";

export interface IntakeQuestion {
  id: string;
  section: string;
  prompt: string;
  help?: string;
  type: "single" | "multi" | "short_text" | "long_text" | "scale";
  options?: string[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: [string, string];
  /** When set, renders an optional free-form textarea below the answer. */
  notePrompt?: string;
}

const CORE_INTAKE_QUESTIONS: IntakeQuestion[] = [
  // ────────────────── Engagement Type ──────────────────
  // Drives every downstream lens. PE pre-close vs corporate IC vs mid-market
  // vendor selection each weight different evidence.
  {
    id: "engagement_type",
    section: "Engagement Type",
    prompt: "What decision is this engagement informing?",
    help: "Determines how Kaptrix weights evidence and frames the report (IC memo vs program continuation vs vendor RFP).",
    type: "single",
    options: [
      "PE / growth equity — pre-close diligence on a target",
      "Corporate IC — greenlight a new AI initiative",
      "Corporate IC — continue/kill existing AI program",
      "Vendor selection / RFP evaluation",
      "Portfolio review — post-close operating review",
    ],
  },
  {
    id: "buyer_archetype",
    section: "Engagement Type",
    prompt: "Who is the decision-making audience?",
    type: "single",
    options: [
      "Large-cap PE fund",
      "Growth equity fund",
      "Strategic / corp dev",
      "Mid-market operator ($50M–$500M)",
      "SMB operator (<$50M)",
    ],
  },
  {
    id: "buyer_industry",
    section: "Engagement Type",
    prompt: "If the buyer is a corporate / operator, what is their industry?",
    help: "Leave blank for a PE fund. Used to stress-test vendor fit against the buyer's own regulatory and operational context.",
    type: "single",
    options: [
      "N/A — financial investor",
      "Financial services / banking",
      "Healthcare / life sciences",
      "Insurance",
      "Legal / professional services",
      "Government / defense",
      "Retail / eCommerce",
      "Industrial / manufacturing",
      "Technology / SaaS",
      "Energy / utilities",
      "Other",
    ],
  },
  {
    id: "target_size_usd",
    section: "Engagement Type",
    prompt: "Target's annual run-rate revenue (or initiative budget)",
    type: "single",
    options: [
      "<$10M",
      "$10M – $50M",
      "$50M – $250M",
      "$250M – $1B",
      "$1B+",
      "Unknown",
    ],
  },
  {
    id: "decision_horizon_days",
    section: "Engagement Type",
    prompt: "Time until the decision is made (IC vote, go-live, or walk-away)",
    help: "Be honest — it compresses or relaxes the depth of the diligence.",
    type: "single",
    options: [
      "≤ 7 days (urgent)",
      "8–14 days",
      "15–30 days",
      "31–60 days",
      "61–90 days",
      "> 90 days",
      "Open-ended / no firm date",
    ],
  },

  // ────────────────── Deal / Initiative Thesis ──────────────────
  {
    id: "deal_thesis",
    section: "Deal Thesis",
    prompt: "What is the primary thesis for this investment or initiative?",
    help:
      "Select all that apply. AI will pre-fill based on uploaded investor materials or internal proposals.",
    type: "multi",
    options: [
      "Category-defining AI platform",
      "Margin expansion via AI efficiency",
      "Revenue uplift / new AI-native product",
      "Cost reduction / automation of an existing function",
      "Rollup / platform acquisition",
      "Defensive hedge in incumbent sector",
      "Strategic data moat",
      "Talent and IP acquisition",
      "Turnaround / operational fix",
      "Regulatory / compliance modernization",
    ],
  },
  {
    id: "deal_stage",
    section: "Deal Thesis",
    prompt: "Current stage of the decision",
    type: "single",
    options: [
      "Sourcing / exploratory",
      "Pre-LOI / vendor shortlist",
      "LOI signed / RFP in flight",
      "Confirmatory diligence",
      "Post-LOI repricing / contract negotiation",
      "Portfolio review / post-close",
    ],
  },
  {
    id: "diligence_priorities",
    section: "Deal Thesis",
    prompt: "Rank your top diligence concerns",
    help: "Choose up to three. These weight Kaptrix's analysis.",
    type: "multi",
    options: [
      "Are AI claims real or marketing?",
      "Vendor / model concentration",
      "Regulatory exposure",
      "Data sensitivity and tenant isolation",
      "Unit economics at scale",
      "Key-person risk",
      "Competitive defensibility",
      "Enterprise sales readiness",
      "Internal team readiness to operate",
      "Data rights and IP provenance",
      "Integration with existing stack",
    ],
  },

  // ────────────────── Stakeholders & Sponsor ──────────────────
  {
    id: "internal_sponsor_role",
    section: "Stakeholders & Sponsor",
    prompt: "Who is the internal sponsor or decision owner?",
    help: "The person whose neck is on the line if this deal / initiative fails.",
    type: "single",
    options: [
      "CEO / Managing Partner",
      "CFO",
      "COO",
      "CIO / CTO",
      "Head of AI / Chief AI Officer",
      "General Counsel / CRO",
      "Business unit leader",
      "Board / IC chair",
      "Investment team partner",
    ],
  },
  {
    id: "dissenting_voices",
    section: "Stakeholders & Sponsor",
    prompt: "Who might vote against or materially push back?",
    type: "multi",
    options: [
      "Security / CISO",
      "Legal / compliance",
      "Finance / CFO org",
      "Operations / field teams",
      "Board / IC members",
      "Regulators (informally)",
      "Existing vendor incumbent",
      "No known dissent",
    ],
  },
  {
    id: "approval_path",
    section: "Stakeholders & Sponsor",
    prompt: "Who signs and what veto rights exist?",
    help: "Select all that apply. Surfaces in the IC memo so recommendations land with the right owners.",
    type: "multi",
    options: [
      "Single decision-maker (CEO / Managing Partner)",
      "Unanimous IC vote required",
      "Majority IC vote",
      "Board approval required",
      "CFO has veto on financial terms",
      "General Counsel has veto on legal/regulatory terms",
      "CIO / CTO has veto on technical fit",
      "Security / CISO has veto on data or compliance terms",
      "Regulator sign-off required",
      "LP advisory committee consent required",
    ],
  },

  // ────────────────── Budget & Unit Economics ──────────────────
  {
    id: "investment_size_usd",
    section: "Budget & Unit Economics",
    prompt: "Total investment / capital at risk",
    help: "Equity check size, initiative budget, or multi-year contract TCV.",
    type: "single",
    options: [
      "< $1M",
      "$1M – $5M",
      "$5M – $25M",
      "$25M – $100M",
      "$100M – $500M",
      "$500M+",
      "Unknown / TBD",
    ],
  },
  {
    id: "annual_run_rate_usd",
    section: "Budget & Unit Economics",
    prompt: "Expected year-1 AI operating cost",
    help: "Inference, vendor fees, infra, data ops, people loaded.",
    type: "single",
    options: [
      "< $100K",
      "$100K – $500K",
      "$500K – $2M",
      "$2M – $10M",
      "$10M – $50M",
      "$50M+",
      "Unknown / TBD",
    ],
  },
  {
    id: "cost_sensitivity",
    section: "Budget & Unit Economics",
    prompt: "How price-sensitive is the buyer to AI costs growing?",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["Accept high burn for speed", "Highly margin-sensitive"],
  },
  {
    id: "payback_expectation_months",
    section: "Budget & Unit Economics",
    prompt: "Expected payback period",
    type: "single",
    options: [
      "≤ 6 months",
      "7–12 months",
      "13–24 months",
      "25–36 months",
      "> 36 months",
      "Strategic — no set payback",
    ],
  },
  {
    id: "gross_margin_hurdle",
    section: "Budget & Unit Economics",
    prompt: "Minimum acceptable gross margin for the AI-driven line of business",
    help: "Used to stress-test cost-per-inference against margin compression.",
    type: "single",
    options: [
      "< 40%",
      "40–50%",
      "50–60%",
      "60–70%",
      "70–80%",
      "> 80%",
      "Margin not yet benchmarked",
    ],
  },

  // ────────────────── AI Unit Economics ──────────────────
  // Token consumption, model tiering, and margin durability as usage scales.
  // Feeds the `ai_unit_economics` sub-criterion under Production Readiness and
  // the "Economically Scalable AI / Neutral / Margin Compression Risk"
  // classification surfaced in the report.
  {
    id: "ai_ue_high_cost_workflows",
    section: "AI Unit Economics",
    prompt: "Which workflows rely on high-cost model inference?",
    help:
      "Name the flows routed to frontier/premium models (e.g. GPT-4-class, Claude Opus, long-context calls, agentic loops). Be specific about volume and trigger.",
    type: "long_text",
  },
  {
    id: "ai_ue_cost_per_output_tracking",
    section: "AI Unit Economics",
    prompt: "Do you track cost per output (per report, per workflow, per task)?",
    help:
      "Token counts alone are not enough. We are asking whether unit cost is attributable to a specific product output.",
    type: "single",
    options: [
      "Yes — cost-per-output is instrumented per workflow and visible per tenant",
      "Partial — tokens tracked in aggregate; cost-per-output is estimated",
      "No — only provider-level spend is known",
      "Unknown",
    ],
  },
  {
    id: "ai_ue_margin_behavior_at_scale",
    section: "AI Unit Economics",
    prompt: "How does margin change as usage scales?",
    help: "Pick the pattern observed in production, not the aspiration.",
    type: "single",
    options: [
      "Improves — margin expands with usage (routing, caching, tiering)",
      "Flat — margin holds",
      "Compresses — margin shrinks as usage grows",
      "Unknown / not measured",
    ],
  },
  {
    id: "ai_ue_lower_cost_substitution",
    section: "AI Unit Economics",
    prompt:
      "Can lower-cost models handle parts of the workflow without degrading product value?",
    help:
      "We are probing model tiering / routing: small/open models for retrieval, classification, drafting, and tool use — premium models reserved for the high-value step only.",
    type: "single",
    options: [
      "Yes — routing in production today with validated quality on the cheaper tier",
      "Partial — tested in eval but not yet in production",
      "No — premium model handles the full workflow end-to-end",
      "Unknown",
    ],
  },
  {
    id: "ai_ue_token_controls",
    section: "AI Unit Economics",
    prompt:
      "What controls exist to limit token-heavy operations?",
    help:
      "Select all that apply. These are the guardrails that protect margin under load.",
    type: "multi",
    options: [
      "Context window caps per request",
      "Retrieval budget / chunk limits",
      "Agent loop / tool-call bounds",
      "Per-tenant or per-user token quotas",
      "Automatic model downgrade on repeat failures",
      "Caching of deterministic sub-calls",
      "Per-workflow cost ceilings with hard cut-off",
      "None of the above",
    ],
  },

  // ────────────────── Success Criteria & KPIs ──────────────────
  {
    id: "primary_kpi",
    section: "Success Criteria",
    prompt: "What does success look like in metrics terms?",
    help: "Multiple allowed. These become the yardstick the report benchmarks against.",
    type: "multi",
    options: [
      "Cost reduction in $ or %",
      "Revenue uplift in $ or %",
      "Cycle time reduction",
      "Quality / accuracy lift",
      "Customer retention (NDR / GRR)",
      "Compliance / risk reduction",
      "Competitive parity / catch-up",
      "Exit multiple expansion",
    ],
  },
  {
    id: "measurable_targets",
    section: "Success Criteria",
    prompt: "Named baselines and targets",
    help: "e.g. 'reduce average claim-handling time from 14 min to <5 min by Q4; increase NDR from 108% to 118% by year 2.' Concrete numbers let the report measure the gap.",
    type: "long_text",
  },
  {
    id: "kill_criteria",
    section: "Success Criteria",
    prompt: "What would cause you to reverse this decision?",
    help: "Select explicit kill conditions. Surfaced in the IC memo under 'what would kill this deal'.",
    type: "multi",
    options: [
      "Failure to hit primary KPI within 12 months",
      "Cost-per-output rises above margin threshold",
      "Material security or privacy incident",
      "Regulatory finding or enforcement action",
      "Loss of a critical model/vendor dependency",
      "Key-person departure (founder / lead technologist)",
      "Customer churn above set threshold",
      "Competitor releases materially better alternative",
      "Evidence of hallucinated / fabricated outputs in production",
      "Audit fails or reveals undisclosed risks",
    ],
  },

  // ────────────────── Alternatives & Incumbents ──────────────────
  {
    id: "alternatives_considered",
    section: "Alternatives & Incumbents",
    prompt: "What alternatives are being weighed against this choice?",
    type: "multi",
    options: [
      "Build in-house",
      "Competing vendor / target",
      "Status quo / do nothing",
      "Open-source / DIY stack",
      "Delay 6–12 months",
      "Partial deployment / pilot first",
    ],
  },
  {
    id: "alternatives_detail",
    section: "Alternatives & Incumbents",
    prompt: "Name the specific competitors, vendors, or internal teams on the short list",
    type: "long_text",
  },
  {
    id: "switching_cost_from_incumbent",
    section: "Alternatives & Incumbents",
    prompt: "Switching cost from the current incumbent (if replacing one)",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["Trivial / no incumbent", "Extremely painful"],
  },
  {
    id: "lock_in_tolerance",
    section: "Alternatives & Incumbents",
    prompt: "Tolerance for vendor lock-in",
    type: "single",
    options: [
      "Must avoid all lock-in (open standards only)",
      "Acceptable with documented exit plan",
      "Acceptable — strategic partner posture",
      "Lock-in preferred (deeper integration)",
    ],
  },

  // ────────────────── Internal AI Readiness ──────────────────
  {
    id: "in_house_ml_talent",
    section: "Internal AI Readiness",
    prompt: "Depth of in-house ML / data-science talent (buyer side)",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["None", "Mature ML org"],
  },
  {
    id: "data_readiness",
    section: "Internal AI Readiness",
    prompt: "Data platform maturity on the buyer side",
    type: "single",
    options: [
      "No central data platform — siloed systems",
      "Partial data lake / warehouse",
      "Unified data platform with governance",
      "Real-time data products with lineage",
      "Not applicable (pure PE deal)",
    ],
  },
  {
    id: "change_management_risk",
    section: "Internal AI Readiness",
    prompt: "Change-management / adoption risk",
    help: "How much will the end-user workflow need to change and how resistant is the org?",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["Low — slots into existing flow", "High — org rewire required"],
  },
  {
    id: "existing_ai_systems",
    section: "Internal AI Readiness",
    prompt: "AI systems already deployed in the buyer's environment",
    type: "multi",
    options: [
      "Microsoft 365 Copilot / Gemini / ChatGPT Enterprise",
      "Internal RAG / knowledge assistant",
      "Classical ML models in production",
      "Agentic workflows in production",
      "Vendor-provided AI in core products (CRM, ticketing, etc.)",
      "None yet",
      "Not applicable",
    ],
  },

  // ────────────────── Target / Vendor Profile ──────────────────
  {
    id: "ai_maturity_perception",
    section: "Target Profile",
    prompt: "How AI-mature does the target / vendor appear based on public positioning?",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["AI wrapper on workflow", "True AI-native product"],
  },
  {
    id: "primary_architecture",
    section: "Target Profile",
    prompt: "What does the target's primary AI architecture appear to be?",
    help: "Select all that apply — many targets blend approaches.",
    type: "multi",
    options: [
      "RAG-heavy",
      "Fine-tuned models",
      "Agentic / multi-step tool use",
      "Workflow + embedded AI",
      "Multi-model orchestration",
      "Single-model API wrapper",
      "On-premise / air-gapped",
      "Hybrid",
      "Unknown — to be assessed",
    ],
  },
  {
    id: "known_vendors",
    section: "Target Profile",
    prompt: "Known vendor or model dependencies (if disclosed)",
    help: "Comma-separated. Pre-fills if mentioned in uploaded docs.",
    type: "short_text",
  },

  // ────────────────── Regulatory Lens ──────────────────
  {
    id: "regulatory_exposure",
    section: "Regulatory Lens",
    prompt: "Which regulatory frameworks apply?",
    type: "multi",
    options: [
      "GDPR / UK GDPR",
      "CCPA / CPRA",
      "HIPAA",
      "SOX",
      "FINRA / SEC",
      "NYDFS Part 500",
      "EU AI Act",
      "FedRAMP",
      "PCI DSS",
      "FCRA / ECOA",
      "COPPA",
      "None material",
    ],
  },
  {
    id: "customer_geographies",
    section: "Regulatory Lens",
    prompt: "Primary customer geographies",
    type: "multi",
    options: [
      "United States",
      "European Union",
      "United Kingdom",
      "Canada",
      "APAC",
      "Latin America",
      "Middle East",
    ],
  },

  // ────────────────── Data Rights & IP Posture ──────────────────
  {
    id: "training_data_sources",
    section: "Data Rights & IP",
    prompt: "Where does training / grounding data come from?",
    type: "multi",
    options: [
      "First-party customer data with explicit rights",
      "Third-party licensed datasets",
      "Public web scraping / crawl",
      "Open datasets (creative commons, etc.)",
      "Synthetic data generation",
      "Partner data shared under NDA",
      "Unknown / undocumented",
    ],
  },
  {
    id: "customer_data_usage_rights",
    section: "Data Rights & IP",
    prompt: "How are customer data usage rights structured?",
    help: "Select all that apply.",
    type: "multi",
    options: [
      "Explicit opt-in, documented in MSA",
      "Contractual default-in with opt-out",
      "Aggregated / anonymized only",
      "Customer data excluded from training by default",
      "Per-tenant isolation with no cross-tenant training",
      "Rights revocable at any time with audit trail",
      "Ambiguous / not documented",
      "Not applicable",
    ],
  },
  {
    id: "ip_indemnification_needed",
    section: "Data Rights & IP",
    prompt: "IP indemnification from the vendor",
    type: "single",
    options: [
      "Required — unlimited or high cap",
      "Required — limited cap acceptable",
      "Required — carve-outs for training-data claims",
      "Required — mutual indemnification acceptable",
      "Preferred but not a gating item",
      "Not material to this deal",
    ],
  },

  // ────────────────── Operational Resilience ──────────────────
  {
    id: "business_continuity_requirement",
    section: "Operational Resilience",
    prompt: "Maximum tolerable AI-system downtime",
    type: "single",
    options: [
      "Seconds — live customer-facing",
      "Minutes (safety-critical / real-time)",
      "Hours",
      "1 business day",
      "<1 week",
      "Flexible — batch workflows",
      "Graceful degradation acceptable (human fallback)",
    ],
  },
  {
    id: "data_exit_plan",
    section: "Operational Resilience",
    prompt: "Maturity of a vendor-exit / data-portability plan",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["None", "Fully documented + tested"],
    notePrompt: "Optional: more information",
  },
  {
    id: "multi_region_requirement",
    section: "Operational Resilience",
    prompt: "Multi-region / data-residency requirement",
    type: "single",
    options: [
      "US-only is acceptable",
      "US + EU required",
      "US + EU + APAC required",
      "Canada-resident data required",
      "UK-resident data required",
      "Country-specific residency required (name below)",
      "Sovereign cloud / government region required",
      "Not applicable",
    ],
  },

  // ────────────────── Red Flag Priors ──────────────────
  {
    id: "red_flag_priors",
    section: "Red Flag Priors",
    prompt: "Any initial concerns you already want us to pressure-test?",
    help:
      "Select any that apply. Kaptrix will elevate related findings in the final report.",
    type: "multi",
    options: [
      "Customer concentration",
      "Founder departure risk",
      "Hallucination / accuracy claims",
      "Security incident history",
      "Pricing / unit economics sustainability",
      "Open-source license exposure",
      "IP / training-data provenance",
      "Competitive displacement",
      "Team / hiring velocity",
      "Benchmark cherry-picking",
    ],
  },
  {
    id: "client_risk_appetite",
    section: "Red Flag Priors",
    prompt: "Risk appetite for AI-specific exposure",
    type: "scale",
    scale_min: 1,
    scale_max: 5,
    scale_labels: ["Very conservative", "Aggressive / contrarian"],
    notePrompt: "Optional: more information",
  },

  // ────────────────── Prior Evidence / Artifacts ──────────────────
  {
    id: "artifacts_received",
    section: "Artifacts Received",
    prompt: "What has already been provided to the diligence team?",
    help: "Select all that apply — drives the coverage gap analysis.",
    type: "multi",
    options: [
      "Pitch deck / investor materials",
      "Architecture documentation",
      "SOC 2 / ISO 27001 report",
      "Penetration test summary",
      "Data handling / privacy policy",
      "Model / AI system documentation",
      "Financial statements / unit economics",
      "Sample customer contracts / MSA",
      "Incident log / post-mortems",
      "Benchmark / evaluation results",
      "Vendor dependency list",
      "Reference customer calls (notes)",
    ],
  },
  {
    id: "gaps_already_known",
    section: "Artifacts Received",
    prompt: "Artifacts you already know are missing or thin",
    help: "Free-form. Gets flagged as a coverage gap from turn one.",
    type: "long_text",
  },
  {
    id: "diligence_team_composition",
    section: "Artifacts Received",
    prompt: "Who is on the diligence team?",
    type: "multi",
    options: [
      "Technical / architecture reviewer",
      "Legal / regulatory reviewer",
      "Finance / commercial reviewer",
      "Operating partner / functional expert",
      "External advisors engaged",
      "Solo operator (just you)",
    ],
  },

  // ────────────────── Free-form ──────────────────
  {
    id: "context_notes",
    section: "Context & Notes",
    prompt:
      "Anything the Kaptrix team should know before reading the data room?",
    help:
      "Pre-meeting intel, political sensitivities, prior diligence context, known biases in the seller's narrative.",
    type: "long_text",
  },
];

const INDUSTRY_INTAKE_QUESTIONS: Record<Industry, IntakeQuestion[]> = {
  financial_services: [
    {
      id: "fs_model_risk_framework",
      section: "Financial Services Depth",
      prompt: "How mature is the model risk framework under SR 11-7?",
      help: "Assess governance for validation, challenge, and override controls.",
      type: "single",
      options: [
        "No formal framework",
        "Draft controls only",
        "Partial framework by product",
        "Operational framework with monitoring",
        "Independent validation in place",
      ],
    },
    {
      id: "fs_decision_explainability",
      section: "Financial Services Depth",
      prompt: "Explainability readiness for regulated decisions",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Opaque outputs", "Regulator-ready explanations"],
    },
    {
      id: "fs_controls_scope",
      section: "Financial Services Depth",
      prompt: "Which controls are in scope for audit?",
      type: "multi",
      options: [
        "SOX controls",
        "Trade surveillance controls",
        "Credit decision controls",
        "AML / KYC model controls",
        "Market-risk model controls",
        "Fair-lending / ECOA controls",
        "Model retraining governance",
        "Third-party model risk (SR 11-7 / OCC 2011-12)",
        "No defined controls yet",
      ],
    },
  ],
  healthcare: [
    {
      id: "hc_phi_pathways",
      section: "Healthcare Depth",
      prompt: "Does PHI flow through model prompts, logs, or vector indices?",
      type: "single",
      options: [
        "No PHI touches AI pipeline",
        "PHI redacted before model call",
        "PHI tokenized / pseudonymized before use",
        "PHI allowed in prompts only, never in logs",
        "PHI allowed with controls (BAA + encryption)",
        "PHI processed on-premise only",
        "Unknown / not documented",
      ],
    },
    {
      id: "hc_fda_readiness",
      section: "Healthcare Depth",
      prompt: "Regulatory readiness for FDA/SaMD implications",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No classification work", "Clear regulatory pathway"],
    },
    {
      id: "hc_bias_controls",
      section: "Healthcare Depth",
      prompt: "Which clinical bias controls are documented?",
      type: "multi",
      options: [
        "Subgroup performance testing (race, sex, age)",
        "Fairness thresholds with monitoring alerts",
        "Independent clinical review board sign-off",
        "Prospective validation on external cohorts",
        "Adverse-event reporting pipeline",
        "Post-market drift monitoring",
        "Human-in-the-loop override logging",
        "No formal controls",
      ],
    },
  ],
  legal_tech: [
    {
      id: "lt_privilege_controls",
      section: "Legal Tech Depth",
      prompt: "How is privilege containment enforced?",
      help: "Technical controls matter more than policy statements for this category.",
      type: "single",
      options: [
        "Policy-only",
        "Logical isolation",
        "Matter-level hard isolation",
        "Dedicated tenant infrastructure",
        "Unknown / not evidenced",
      ],
    },
    {
      id: "lt_citation_assurance",
      section: "Legal Tech Depth",
      prompt: "How strong is citation reliability and hallucination control?",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No reliable controls", "Verified citation pipeline"],
      notePrompt: "Optional: more information",
    },
    {
      id: "lt_bar_ethics_exposure",
      section: "Legal Tech Depth",
      prompt: "Potential bar-ethics exposure areas",
      type: "multi",
      options: [
        "Unauthorized practice of law risk",
        "Privilege leakage risk",
        "Client disclosure / consent risk",
        "Hallucinated authority risk",
        "Conflict-of-interest detection gaps",
        "Cross-matter data contamination",
        "Attorney-client-privileged training data risk",
        "Candor-to-the-tribunal risk (fabricated cites)",
        "Limited exposure",
      ],
    },
  ],
  saas_enterprise: [
    {
      id: "saas_enterprise_readiness",
      section: "Enterprise SaaS Depth",
      prompt: "Enterprise feature readiness (SSO, SCIM, audit exports)",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Missing core features", "Enterprise-complete"],
    },
    {
      id: "saas_abuse_surface",
      section: "Enterprise SaaS Depth",
      prompt: "Which abuse vectors are most material?",
      type: "multi",
      options: [
        "Prompt injection (direct + indirect)",
        "Data exfiltration via tool calls",
        "Account takeover on AI admins",
        "Model jailbreak behavior",
        "Training-data poisoning via user content",
        "Abuse of generous free tiers for scraping",
        "Insecure output handling (XSS via model text)",
        "Excessive autonomy in agent workflows",
        "No formal abuse model",
      ],
    },
    {
      id: "saas_margin_volatility",
      section: "Enterprise SaaS Depth",
      prompt: "Margin volatility risk from model costs",
      type: "single",
      options: [
        "Low — predictable unit costs",
        "Low — cost caps enforced per tenant",
        "Moderate — occasional spikes",
        "Moderate — hedged via multi-model routing",
        "High — materially volatile",
        "High — exposed to upstream API repricing",
        "Unknown / insufficient data",
      ],
    },
  ],
  insurance: [
    {
      id: "ins_fairness_controls",
      section: "Insurance Depth",
      prompt: "How mature are fairness controls for underwriting/claims outputs?",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No controls", "Regulator-ready controls"],
    },
    {
      id: "ins_adverse_action_explainability",
      section: "Insurance Depth",
      prompt: "Adverse action reason-code readiness",
      type: "single",
      options: [
        "Not implemented",
        "Manual and inconsistent",
        "Templated reason codes, manual mapping",
        "Partially automated",
        "Automated with human QA sampling",
        "Fully traceable and auditable end-to-end",
      ],
    },
    {
      id: "ins_regulator_alignment",
      section: "Insurance Depth",
      prompt: "Regulatory frameworks currently mapped",
      type: "multi",
      options: [
        "NYDFS Circular Letter 7",
        "NAIC AI model guidance",
        "Colorado Division of Insurance AI bulletin",
        "State DOI-specific guidance",
        "FCRA / ECOA notices",
        "HIPAA (for health-related underwriting)",
        "Unfair-discrimination state rules",
        "No explicit mapping",
      ],
    },
  ],
  retail_ecommerce: [
    {
      id: "retail_claim_substantiation",
      section: "Retail & eCommerce Depth",
      prompt: "Readiness for substantiating AI-generated marketing claims",
      type: "single",
      options: [
        "No substantiation workflow",
        "Ad hoc review",
        "Legal-only review",
        "Standardized review workflow",
        "Auditable, policy-enforced workflow",
        "Automated claim-fact check against source catalog",
      ],
    },
    {
      id: "retail_personalization_risk",
      section: "Retail & eCommerce Depth",
      prompt: "Personalization risk posture",
      type: "multi",
      options: [
        "Dark pattern risk",
        "Inappropriate demographic targeting",
        "Cross-border consent mismatch",
        "Model drift in recommendations",
        "Price-discrimination exposure",
        "Minor-targeted content risk (COPPA)",
        "Retargeting without fresh consent",
        "Low concern",
      ],
    },
    {
      id: "retail_consumer_data",
      section: "Retail & eCommerce Depth",
      prompt: "Consumer data handling maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Weak and undocumented", "Policy + controls + monitoring"],
    },
  ],
  government_defense: [
    {
      id: "gov_authorization_path",
      section: "Government & Defense Depth",
      prompt: "FedRAMP / IL authorization status",
      type: "single",
      options: [
        "No plan",
        "Roadmap only",
        "Sponsor identified",
        "3PAO assessment scheduled",
        "In process with evidence",
        "Authorized — FedRAMP Moderate",
        "Authorized — FedRAMP High",
        "Authorized — IL4 / IL5",
        "Authorized — IL6",
      ],
    },
    {
      id: "gov_export_controls",
      section: "Government & Defense Depth",
      prompt: "Export-control and controlled-data safeguards",
      type: "multi",
      options: [
        "ITAR controls",
        "EAR dual-use controls",
        "CJIS / CUI controls",
        "CMMC Level 2 or higher",
        "Geo-fencing and residency",
        "Cleared personnel restrictions",
        "Supply-chain provenance (C-SCRM)",
        "Foreign-national access controls",
        "No formal safeguards",
      ],
    },
    {
      id: "gov_supply_chain",
      section: "Government & Defense Depth",
      prompt: "Software supply-chain transparency maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["No SBOM/program", "Continuous SBOM + provenance"],
    },
  ],
  industrial_iot: [
    {
      id: "iiot_ot_segmentation",
      section: "Industrial / IoT Depth",
      prompt: "OT segmentation and IT/OT boundary control maturity",
      type: "scale",
      scale_min: 1,
      scale_max: 5,
      scale_labels: ["Flat network risk", "Strong segmented architecture"],
    },
    {
      id: "iiot_safety_latency",
      section: "Industrial / IoT Depth",
      prompt: "Safety-critical latency and fail-safe posture",
      type: "single",
      options: [
        "Not measured",
        "Measured with major variance",
        "Stable within safe thresholds",
        "Deterministic fail-safe fallback on timeout",
        "Validated under stress scenarios",
        "IEC 61508 / ISO 26262 aligned",
      ],
    },
    {
      id: "iiot_protocol_exposure",
      section: "Industrial / IoT Depth",
      prompt: "Legacy protocol and OT attack surface",
      type: "multi",
      options: [
        "Unencrypted legacy protocols (Modbus, DNP3)",
        "Weak remote access controls",
        "No OT anomaly detection",
        "Patch latency in field assets",
        "Hard-coded credentials in firmware",
        "Unsigned firmware updates",
        "Flat network between OT and corporate IT",
        "Low material exposure",
      ],
    },
  ],
};

type Answers = Record<string, string | number | string[]>;

interface Props {
  /** Industry profile is locked at client creation — treated as a
   *  required, read-only prop here. Swapping mid-engagement would
   *  invalidate industry-specific intake answers and scoring weights. */
  industry: Industry;
  initialAnswers?: Answers;
  onChange?: (answers: Answers) => void;
}

export function IntakeQuestionnaire({
  industry,
  initialAnswers = {},
  onChange,
}: Props) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const isFirstSectionRender = useRef(true);

  const profile = INDUSTRY_PROFILES[industry];
  const questions = [...CORE_INTAKE_QUESTIONS, ...INDUSTRY_INTAKE_QUESTIONS[industry]];

  const update = (id: string, value: string | number | string[]) => {
    const next = { ...answers, [id]: value };
    setAnswers(next);
    onChange?.(next);
  };

  const isAnswered = (q: IntakeQuestion) => {
    const v = answers[q.id];
    const other = answers[`${q.id}__other`];
    const hasOther = typeof other === "string" && other.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0 || hasOther;
    if (typeof v === "string") return v.trim().length > 0 || hasOther;
    if (v !== undefined) return true;
    return hasOther;
  };

  const sections = Array.from(new Set(questions.map((q) => q.section)));
  const currentSection = activeSection && sections.includes(activeSection)
    ? activeSection
    : sections[0];
  const currentIndex = sections.indexOf(currentSection);
  const sectionQuestions = questions.filter((q) => q.section === currentSection);

  const sectionCompletion = (section: string) => {
    const qs = questions.filter((q) => q.section === section);
    const done = qs.filter(isAnswered).length;
    return { done, total: qs.length };
  };

  const answered = questions.filter(isAnswered).length;
  const completionPct = Math.round((answered / questions.length) * 100);

  // When the active section changes (Next / Previous / sidebar pick),
  // bring the first question of that section into view so the user
  // doesn't have to hunt for it.
  useEffect(() => {
    if (isFirstSectionRender.current) {
      isFirstSectionRender.current = false;
      return;
    }
    const el = sectionTopRef.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [currentSection]);

  return (
    <div className="space-y-6">
      {/* Compact top summary bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {/* Profile (locked) */}
          <div
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-900"
            title="Industry profile is locked at client creation."
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 text-slate-500"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4 4 0 0 0-4 4v3H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V5a4 4 0 0 0-4-4Zm2 7V5a2 2 0 1 0-4 0v3h4Z"
                clipRule="evenodd"
              />
            </svg>
            <span>{profile.label}</span>
          </div>

          {/* Risks — compact inline pills */}
          {profile.typical_risks.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {profile.typical_risks.slice(0, 3).map((risk) => (
                <span
                  key={risk}
                  className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                >
                  {risk}
                </span>
              ))}
              {profile.typical_risks.length > 3 && (
                <span
                  className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  title={profile.typical_risks.slice(3).join(" · ")}
                >
                  +{profile.typical_risks.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Progress — pushes to the right on wide screens */}
          <div className="ml-auto flex items-center gap-3">
            <p className="text-[12px] font-medium text-slate-700">
              <span className="font-semibold text-slate-900">
                {answered}/{questions.length}
              </span>{" "}
              answered
            </p>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 sm:w-32">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-[12px] font-semibold tabular-nums text-slate-700">
              {completionPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Two-column: section nav + current section */}
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:sticky lg:top-20 lg:block lg:self-start">
          <nav className="space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {sections.map((section, idx) => {
              const { done, total } = sectionCompletion(section);
              const isActive = section === currentSection;
              const isComplete = done === total;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => setActiveSection(section)}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                        isActive
                          ? "bg-white text-slate-900"
                          : isComplete
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isComplete ? "✓" : idx + 1}
                    </span>
                    <span className="font-medium">{section}</span>
                  </span>
                  <span
                    className={`text-[11px] tabular-nums ${
                      isActive ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {done}/{total}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section ref={sectionTopRef} className="space-y-4 scroll-mt-24">
          {/* Mobile-only section picker — sits at the top of the content
              area so the CURRENT section's questions are the first thing
              the user sees, while still giving a one-tap way into the
              other 15 sections via a bottom sheet. Hidden on lg+ where
              the left sidebar is the primary navigation. */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition active:bg-slate-50 lg:hidden"
            aria-label="Change section"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
                Section {currentIndex + 1} of {sections.length}
              </span>
              <span className="mt-0.5 block truncate text-base font-bold text-slate-900">
                {currentSection}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white">
              All sections
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
          </button>

          {/* Desktop-only section header (mobile shows the picker chip
              above, which doubles as the section header). */}
          <div className="hidden items-center justify-between lg:flex">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
                Section {currentIndex + 1} of {sections.length}
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900">
                {currentSection}
              </h3>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {sectionQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                value={answers[q.id]}
                note={typeof answers[`${q.id}__note`] === "string" ? (answers[`${q.id}__note`] as string) : ""}
                otherText={typeof answers[`${q.id}__other`] === "string" ? (answers[`${q.id}__other`] as string) : ""}
                onChange={(v) => update(q.id, v)}
                onNoteChange={(v) => update(`${q.id}__note`, v)}
                onOtherChange={(v) => update(`${q.id}__other`, v)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() =>
                setActiveSection(sections[Math.max(0, currentIndex - 1)])
              }
              className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous section
            </button>
            {currentIndex === sections.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (typeof window === "undefined") return;
                  window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: "smooth",
                  });
                }}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Complete intake ↓
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setActiveSection(
                    sections[Math.min(sections.length - 1, currentIndex + 1)],
                  )
                }
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Next section →
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Mobile bottom sheet — full section list with progress. Opens
          from the picker chip above. Dismissed by backdrop tap, close
          button, or after a section is chosen. */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Select section"
        >
          <button
            type="button"
            aria-label="Close section picker"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 h-full w-full bg-slate-900/50 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-hidden rounded-t-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-600">
                  Jump to section
                </p>
                <p className="mt-0.5 text-base font-bold text-slate-900">
                  {answered} of {questions.length} complete
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-full border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <nav className="max-h-[calc(85vh-73px)] overflow-y-auto px-2 py-2">
              {sections.map((section, idx) => {
                const { done, total } = sectionCompletion(section);
                const isActive = section === currentSection;
                const isComplete = done === total;
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => {
                      setActiveSection(section);
                      setMobileNavOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-[15px] transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-800 active:bg-slate-100"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                          isActive
                            ? "bg-white text-slate-900"
                            : isComplete
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isComplete ? "✓" : idx + 1}
                      </span>
                      <span className="truncate font-medium">{section}</span>
                    </span>
                    <span
                      className={`shrink-0 text-[12px] tabular-nums ${
                        isActive ? "text-slate-300" : "text-slate-500"
                      }`}
                    >
                      {done}/{total}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  value,
  note,
  otherText,
  onChange,
  onNoteChange,
  onOtherChange,
}: {
  question: IntakeQuestion;
  value: string | number | string[] | undefined;
  note: string;
  otherText: string;
  onChange: (v: string | number | string[]) => void;
  onNoteChange: (v: string) => void;
  onOtherChange: (v: string) => void;
}) {
  const showOtherInput =
    question.type === "single" || question.type === "multi";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <p className="text-base font-semibold text-slate-900">{question.prompt}</p>
      {question.help && (
        <p className="mt-1 text-sm text-slate-600">{question.help}</p>
      )}
      <div className="mt-4">
        {question.type === "single" && (
          <div className="space-y-2">
            {question.options?.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  value === opt
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        )}

        {question.type === "multi" && (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => {
              const arr = Array.isArray(value) ? value : [];
              const checked = arr.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() =>
                    onChange(
                      checked ? arr.filter((v) => v !== opt) : [...arr, opt],
                    )
                  }
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    checked
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {showOtherInput && (
          <div className="mt-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Other — describe in your own words
            </label>
            <input
              type="text"
              value={otherText}
              onChange={(e) => onOtherChange(e.target.value)}
              placeholder="Type a custom answer if none of the options fit…"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
            />
          </div>
        )}

        {question.type === "short_text" && (
          <input
            type="text"
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type your answer…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        )}

        {question.type === "long_text" && (
          <textarea
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Optional notes — context, specific names, or a number where a range won't do"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          />
        )}

        {question.type === "scale" && (
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-600">
              <span>{question.scale_labels?.[0]}</span>
              <span>{question.scale_labels?.[1]}</span>
            </div>
            <div className="mt-2 flex gap-2">
              {Array.from(
                {
                  length:
                    (question.scale_max ?? 5) - (question.scale_min ?? 1) + 1,
                },
                (_, i) => (question.scale_min ?? 1) + i,
              ).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(n)}
                  className={`h-11 flex-1 rounded-lg border text-base font-semibold transition ${
                    value === n
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {question.notePrompt && (
          <div className="mt-3">
            <textarea
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              rows={2}
              placeholder={question.notePrompt}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}
