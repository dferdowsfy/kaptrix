import type { DocumentCategory } from "@/lib/types";

export type Industry =
  | "financial_services"
  | "healthcare"
  | "legal_tech"
  | "saas_enterprise"
  | "insurance"
  | "retail_ecommerce"
  | "government_defense"
  | "industrial_iot";

export interface IndustryArtifact {
  category: DocumentCategory | string;
  display_name: string;
  is_required: boolean;
  weight: number;
  why_it_matters: string;
  what_we_look_for: string[];
  regulatory_context: string | null;
  limits_when_missing: string;
}

export interface IndustryProfile {
  key: Industry;
  label: string;
  tagline: string;
  regulators: string[];
  typical_risks: string[];
  artifacts: IndustryArtifact[];
}

const universalArtifacts: IndustryArtifact[] = [
  {
    category: "deck",
    display_name: "Pitch Deck / Investor Materials",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Establishes the commercial thesis and the claims that diligence must validate against the architecture and data reality.",
    what_we_look_for: [
      "Explicit AI value proposition vs. workflow wrapper",
      "Customer logo substantiation and retention claims",
      "Market positioning and competitive moat narrative",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Product credibility assessment and differentiation analysis cannot be grounded.",
  },
  {
    category: "architecture",
    display_name: "Product Architecture Documentation",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Translates commercial promises into verifiable infrastructure, model-routing, and tenancy decisions.",
    what_we_look_for: [
      "Multi-tenant isolation model",
      "Model-provider abstraction / fallback",
      "Data residency and retention pathway",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Production readiness, vendor exposure, and tenancy risk cannot be verified.",
  },
  {
    category: "security",
    display_name: "Security & Compliance Attestations",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Third-party attestations establish the governance floor and surface gaps in operational maturity.",
    what_we_look_for: [
      "SOC 2 Type II, ISO 27001, or equivalent",
      "Penetration-test summary with remediation status",
      "Vulnerability management and incident response policies",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Governance posture and enterprise-readiness claims cannot be validated.",
  },
  {
    category: "model_ai",
    display_name: "Model / AI System Documentation",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Anchors AI claims to evaluated model behavior, not marketing language.",
    what_we_look_for: [
      "Model cards with evaluation methodology",
      "Hallucination / accuracy benchmarks on domain data",
      "Guardrails, safety layers, and human-in-the-loop design",
    ],
    regulatory_context: "EU AI Act, NIST AI RMF",
    limits_when_missing:
      "AI credibility and model-risk assessment cannot be completed.",
  },
  {
    category: "vendor_list",
    display_name: "Vendor & API Dependency Inventory",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Quantifies concentration risk and surfaces silent single points of failure in the AI supply chain.",
    what_we_look_for: [
      "Foundation model providers and contractual tiers",
      "Vector database, orchestration, and observability stack",
      "Sub-processor list and data flow direction",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Vendor concentration risk and switching-cost analysis cannot be performed.",
  },
  {
    category: "data_privacy",
    display_name: "Data Handling & Privacy Policy",
    is_required: true,
    weight: 1,
    why_it_matters:
      "Demonstrates defensible posture for personal and regulated data across training and inference.",
    what_we_look_for: [
      "Training-data opt-out for customer content",
      "Data residency commitments",
      "Retention, deletion, and export flows",
    ],
    regulatory_context: "GDPR, CCPA",
    limits_when_missing:
      "Regulatory exposure and data-sensitivity scoring cannot be finalized.",
  },
  {
    category: "financial",
    display_name: "Financial & Unit Economics",
    is_required: true,
    weight: 0.9,
    why_it_matters:
      "Reveals whether the cost-per-inference supports the commercial model at scale.",
    what_we_look_for: [
      "Gross margin by product line",
      "COGS breakdown including inference, storage, and retrieval",
      "Burn multiple and ARR retention cohorts",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Unit economics and runway implications cannot be validated.",
  },
  {
    category: "customer_contracts",
    display_name: "Sample Customer Contracts",
    is_required: false,
    weight: 0.8,
    why_it_matters:
      "Contractual commitments often carry more risk than the marketing claims — SLAs, indemnities, and data rights.",
    what_we_look_for: [
      "Uptime SLAs and remedies",
      "AI-specific indemnity language",
      "Data ownership and training-rights clauses",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Contractual risk and enterprise commitment strength cannot be assessed.",
  },
  {
    category: "incident_log",
    display_name: "Incident Log & Post-Mortems",
    is_required: false,
    weight: 0.7,
    why_it_matters:
      "Mature teams run clean post-mortems; absence is itself a signal.",
    what_we_look_for: [
      "Incident frequency and MTTR trend",
      "Root cause patterns across AI vs. platform",
      "Customer communication cadence",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Production stability and incident maturity cannot be benchmarked.",
  },
  {
    category: "team_bios",
    display_name: "Technical Leadership Bios",
    is_required: false,
    weight: 0.6,
    why_it_matters:
      "Key-person risk is under-diligenced in AI companies where a handful of engineers carry architectural knowledge.",
    what_we_look_for: [
      "Depth of prior production ML experience",
      "Tenure and retention signals",
      "Public technical footprint",
    ],
    regulatory_context: null,
    limits_when_missing: "Key-person and capability risk cannot be profiled.",
  },
  {
    category: "demo",
    display_name: "Product Demo Recordings",
    is_required: false,
    weight: 0.5,
    why_it_matters:
      "Live product behavior often diverges from curated investor demos — reveals real latency, UX, and guardrails.",
    what_we_look_for: [
      "Response latency on realistic prompts",
      "Handling of adversarial or edge-case inputs",
      "Fallback behavior when models are uncertain",
    ],
    regulatory_context: null,
    limits_when_missing:
      "Demo-to-production gap analysis cannot be grounded in observed behavior.",
  },
];

export const INDUSTRY_PROFILES: Record<Industry, IndustryProfile> = {
  financial_services: {
    key: "financial_services",
    label: "Financial Services",
    tagline: "Banking, capital markets, asset management, fintech",
    regulators: ["SEC", "FINRA", "OCC", "FFIEC", "FCA", "MAS"],
    typical_risks: [
      "Model risk management under SR 11-7",
      "Explainability requirements for credit and trading decisions",
      "Customer data residency and cross-border transfer",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "model_risk",
        display_name: "Model Risk Management Documentation (SR 11-7)",
        is_required: true,
        weight: 1,
        why_it_matters:
          "Regulated financial institutions cannot deploy AI without a defensible model-validation regime.",
        what_we_look_for: [
          "Independent model validation workflow",
          "Ongoing performance monitoring triggers",
          "Explainability and override documentation",
        ],
        regulatory_context: "Federal Reserve SR 11-7, OCC 2011-12",
        limits_when_missing:
          "Regulated-buyer sellability and institutional-grade deployment cannot be assessed.",
      },
      {
        category: "sox_controls",
        display_name: "SOX / Financial Controls Mapping",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "Any AI that touches a financial close or reporting workflow inherits SOX controls obligations.",
        what_we_look_for: [
          "Control mapping to affected financial processes",
          "Change management and segregation-of-duties",
          "Auditor-reviewable evidence trails",
        ],
        regulatory_context: "Sarbanes-Oxley Sections 302 and 404",
        limits_when_missing:
          "Enterprise buyer controls alignment cannot be confirmed.",
      },
      {
        category: "kyc_aml",
        display_name: "KYC / AML Screening & Monitoring",
        is_required: false,
        weight: 0.7,
        why_it_matters:
          "If the product participates in customer onboarding, downstream BSA/AML exposure carries to the acquirer.",
        what_we_look_for: [
          "Screening provider and false-positive rate",
          "Model retraining cadence",
          "Regulator-ready audit trail",
        ],
        regulatory_context: "Bank Secrecy Act, FinCEN",
        limits_when_missing:
          "Financial-crime exposure from product behavior cannot be bounded.",
      },
    ],
  },
  healthcare: {
    key: "healthcare",
    label: "Healthcare & Life Sciences",
    tagline: "Provider, payer, digital health, pharma, medtech",
    regulators: ["HHS OCR", "FDA", "CMS", "EMA", "EU MDR"],
    typical_risks: [
      "PHI handling and de-identification rigor",
      "FDA classification for clinical decision support",
      "Bias in diagnostic or triage outputs",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "hipaa",
        display_name: "HIPAA Security & Privacy Documentation",
        is_required: true,
        weight: 1,
        why_it_matters:
          "Any exposure to PHI requires demonstrable administrative, physical, and technical safeguards.",
        what_we_look_for: [
          "Risk analysis and BAA inventory",
          "Encryption posture in transit and at rest",
          "Breach-notification readiness",
        ],
        regulatory_context: "HIPAA 45 CFR 164",
        limits_when_missing:
          "Clinical-buyer sellability and regulatory defensibility cannot be assessed.",
      },
      {
        category: "fda_classification",
        display_name: "FDA / SaMD Classification Analysis",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "Clinical decision support crosses into regulated device territory faster than most founders realize.",
        what_we_look_for: [
          "Intended-use statement and risk class",
          "21 CFR 820 alignment if Class II",
          "Predicate device or De Novo pathway if applicable",
        ],
        regulatory_context: "FDA SaMD, 21st Century Cures Act §3060",
        limits_when_missing:
          "Regulatory pathway risk and time-to-market cannot be bounded.",
      },
      {
        category: "bias_evaluation",
        display_name: "Clinical Bias & Fairness Evaluation",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "Demographic performance gaps are the leading cause of post-deployment clinical AI failure.",
        what_we_look_for: [
          "Subgroup performance across age, sex, race/ethnicity",
          "Mitigation methodology and residual gap",
          "Monitoring plan for drift",
        ],
        regulatory_context: "HHS Section 1557, FDA GMLP",
        limits_when_missing:
          "Clinical safety posture and post-market risk cannot be evaluated.",
      },
    ],
  },
  legal_tech: {
    key: "legal_tech",
    label: "Legal Tech",
    tagline: "Law firm tooling, contracts, compliance, e-discovery",
    regulators: ["State Bar authorities", "ABA Model Rules", "GDPR for EU matters"],
    typical_risks: [
      "Unauthorized practice of law exposure",
      "Privileged data leakage via shared embeddings",
      "Hallucinated citations reaching client deliverables",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "privilege_handling",
        display_name: "Attorney-Client Privilege & Confidentiality Policy",
        is_required: true,
        weight: 1,
        why_it_matters:
          "Privileged content passing through shared infrastructure is the sector's highest-impact tail risk.",
        what_we_look_for: [
          "Tenant and matter-level isolation",
          "Training opt-out enforced at infrastructure layer",
          "Document-level access audit",
        ],
        regulatory_context: "ABA Model Rules 1.6, 5.3",
        limits_when_missing:
          "Privilege containment and law-firm sellability cannot be assessed.",
      },
      {
        category: "citation_audit",
        display_name: "Citation Accuracy & Hallucination Audit",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "Fabricated citations in legal deliverables have produced sanctions and market-visible brand damage.",
        what_we_look_for: [
          "Ground-truth citation verification rate",
          "Hallucination incidence per 1,000 generations",
          "Human-review enforcement before client delivery",
        ],
        regulatory_context: null,
        limits_when_missing:
          "Deliverable-quality risk and reputational exposure cannot be bounded.",
      },
    ],
  },
  saas_enterprise: {
    key: "saas_enterprise",
    label: "Enterprise SaaS",
    tagline: "Horizontal platforms, productivity, DevTools",
    regulators: ["SOC 2", "ISO 27001", "Sector-specific via customer flow-down"],
    typical_risks: [
      "Enterprise sales motion outpacing security maturity",
      "Prompt injection from user-generated content",
      "Usage-based pricing drift vs. inference cost",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "enterprise_readiness",
        display_name: "Enterprise Readiness Package",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "SSO, SCIM, audit export, and data residency determine whether ACV ceilings are real or theoretical.",
        what_we_look_for: [
          "SSO and SCIM availability by plan",
          "Audit log export and retention",
          "Customer-managed keys / BYOK options",
        ],
        regulatory_context: null,
        limits_when_missing:
          "Enterprise up-market credibility cannot be verified.",
      },
      {
        category: "prompt_injection",
        display_name: "Prompt Injection & Abuse Testing",
        is_required: false,
        weight: 0.7,
        why_it_matters:
          "Any LLM feature touching user input inherits prompt-injection risk; maturity here varies wildly.",
        what_we_look_for: [
          "Red-team methodology and findings",
          "Output filtering and tool-use guardrails",
          "Continuous evaluation cadence",
        ],
        regulatory_context: "OWASP Top 10 for LLM Applications",
        limits_when_missing:
          "AI-specific attack-surface maturity cannot be evaluated.",
      },
    ],
  },
  insurance: {
    key: "insurance",
    label: "Insurance",
    tagline: "P&C, life, health, commercial, insurtech",
    regulators: ["NAIC", "State Departments of Insurance", "NYDFS"],
    typical_risks: [
      "Disparate impact in underwriting or claims decisions",
      "Unfair discrimination under state insurance law",
      "Explainability for adverse-action notices",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "nydfs_circular",
        display_name: "NYDFS Circular Letter 7 / NAIC Model Compliance",
        is_required: true,
        weight: 1,
        why_it_matters:
          "State insurance regulators are among the most prescriptive on AI use; non-compliance blocks market entry.",
        what_we_look_for: [
          "Governance framework documentation",
          "Third-party data source vetting",
          "Disparate-impact testing and mitigation",
        ],
        regulatory_context: "NYDFS Circular Letter 7 (2024), NAIC Model Bulletin",
        limits_when_missing:
          "Carrier-buyer sellability and regulatory exposure cannot be bounded.",
      },
      {
        category: "adverse_action",
        display_name: "Adverse Action & Explainability Workflow",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "Any AI producing a coverage or claims decision must generate a regulator-ready explanation.",
        what_we_look_for: [
          "Reason-code taxonomy",
          "Consumer-facing explanation templates",
          "Appeal and override pathway",
        ],
        regulatory_context: "FCRA, ECOA, state UDAP",
        limits_when_missing:
          "Consumer-protection exposure and operational readiness cannot be assessed.",
      },
    ],
  },
  retail_ecommerce: {
    key: "retail_ecommerce",
    label: "Retail & eCommerce",
    tagline: "DTC, marketplaces, personalization, marketing AI",
    regulators: ["FTC", "State privacy regulators", "CPSC for product claims"],
    typical_risks: [
      "Dark-pattern exposure from generative personalization",
      "Advertising-claim substantiation for AI outputs",
      "Consumer PII handling under CPRA/CCPA",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "ad_substantiation",
        display_name: "Advertising Claim Substantiation",
        is_required: false,
        weight: 0.7,
        why_it_matters:
          "FTC has signaled active enforcement on unsubstantiated AI-generated marketing claims.",
        what_we_look_for: [
          "Claims review workflow",
          "Disclosure of AI-generated content",
          "Audit trail for generated creative",
        ],
        regulatory_context: "FTC Act §5, FTC AI guidance (2023-2024)",
        limits_when_missing:
          "Consumer-protection exposure from generated content cannot be bounded.",
      },
    ],
  },
  government_defense: {
    key: "government_defense",
    label: "Government & Defense",
    tagline: "Federal civilian, DoD, intelligence, state and local",
    regulators: ["FedRAMP", "DoD CIO", "NIST"],
    typical_risks: [
      "Authority to Operate timelines and scope creep",
      "ITAR / export-controlled data handling",
      "Supply-chain transparency (SBOM / software provenance)",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "fedramp",
        display_name: "FedRAMP / IL-level Authorization Package",
        is_required: true,
        weight: 1,
        why_it_matters:
          "Federal sales claims without a clear authorization path are usually revenue mirages.",
        what_we_look_for: [
          "Current authorization level or sponsor status",
          "SSP maturity and POA&M velocity",
          "Gov-cloud deployment evidence",
        ],
        regulatory_context: "FedRAMP, DoD SRG",
        limits_when_missing:
          "Federal revenue timeline and defensibility cannot be validated.",
      },
      {
        category: "sbom",
        display_name: "Software Bill of Materials (SBOM)",
        is_required: true,
        weight: 0.8,
        why_it_matters:
          "EO 14028 has made SBOM delivery table stakes for federal buyers.",
        what_we_look_for: [
          "SPDX or CycloneDX SBOM",
          "Provenance for foundation-model artifacts",
          "Known-vulnerability posture",
        ],
        regulatory_context: "Executive Order 14028, NIST SSDF",
        limits_when_missing:
          "Supply-chain transparency cannot be demonstrated to federal buyers.",
      },
    ],
  },
  industrial_iot: {
    key: "industrial_iot",
    label: "Industrial / IoT",
    tagline: "Manufacturing, energy, logistics, OT/ICS integration",
    regulators: ["NERC CIP", "IEC 62443", "OSHA for safety systems"],
    typical_risks: [
      "Convergence of IT/OT attack surfaces",
      "Safety-critical decision latency",
      "Legacy protocol exposure",
    ],
    artifacts: [
      ...universalArtifacts,
      {
        category: "ot_segmentation",
        display_name: "OT Segmentation & Zero-Trust Architecture",
        is_required: true,
        weight: 0.9,
        why_it_matters:
          "AI that reaches OT networks without defensible segmentation is an insurance and safety event waiting to happen.",
        what_we_look_for: [
          "Purdue model alignment",
          "Zero-trust enforcement at IT/OT boundary",
          "Incident isolation playbooks",
        ],
        regulatory_context: "IEC 62443, NIST SP 800-82",
        limits_when_missing:
          "Cyber-physical risk exposure cannot be assessed.",
      },
    ],
  },
};

export function getIndustryProfile(industry: Industry): IndustryProfile {
  return INDUSTRY_PROFILES[industry];
}

export const INDUSTRY_OPTIONS = Object.values(INDUSTRY_PROFILES).map((p) => ({
  value: p.key,
  label: p.label,
  tagline: p.tagline,
}));
