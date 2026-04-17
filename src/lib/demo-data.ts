import { SCORING_DIMENSIONS } from "@/lib/constants";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import type { ExecutiveReportData } from "@/components/reports/executive-report";
import type {
  BenchmarkCase,
  Document,
  DocumentRequirement,
  Engagement,
  PatternMatch,
  PreAnalysis,
  Report,
  Score,
} from "@/lib/types";

export const demoEngagement: Engagement = {
  id: "preview-engagement-001",
  client_firm_name: "Blackstone Growth",
  target_company_name: "LexiFlow AI",
  deal_stage: "confirmatory",
  status: "analysis",
  tier: "standard",
  assigned_operator_id: null,
  client_contact_email: "partner@blackstonegrowth.com",
  nda_signed_at: "2026-04-10T14:00:00.000Z",
  engagement_fee: 12500,
  delivery_deadline: "2026-04-24T17:00:00.000Z",
  referral_source: "referral",
  outcome: "pending",
  created_at: "2026-04-17T09:00:00.000Z",
  updated_at: "2026-04-17T09:00:00.000Z",
};

export const demoRequirements: DocumentRequirement[] = [
  {
    id: "req-1",
    category: "deck",
    display_name: "Pitch Deck / Investor Materials",
    description: "Company overview and investor materials.",
    is_required: true,
    weight: 1,
    limits_when_missing: "product credibility assessment and differentiation analysis",
  },
  {
    id: "req-2",
    category: "architecture",
    display_name: "Product Architecture Documentation",
    description: "System design and deployment topology.",
    is_required: true,
    weight: 1,
    limits_when_missing: "production readiness assessment and tooling exposure analysis",
  },
  {
    id: "req-3",
    category: "security",
    display_name: "Security & Compliance Documentation",
    description: "SOC2, ISO, pentest, and security policies.",
    is_required: true,
    weight: 1,
    limits_when_missing: "governance posture and compliance exposure assessment",
  },
  {
    id: "req-4",
    category: "model_ai",
    display_name: "Model / AI System Documentation",
    description: "Model cards and evaluation notes.",
    is_required: true,
    weight: 1,
    limits_when_missing: "AI credibility assessment and model risk analysis",
  },
  {
    id: "req-5",
    category: "data_privacy",
    display_name: "Data Handling & Privacy Policies",
    description: "Privacy policy and data handling controls.",
    is_required: true,
    weight: 1,
    limits_when_missing: "data sensitivity risk assessment and regulatory compliance",
  },
  {
    id: "req-6",
    category: "customer_contracts",
    display_name: "Customer Contracts",
    description: "Sample or redacted contracts.",
    is_required: false,
    weight: 0.8,
    limits_when_missing: "customer commitment validation and contractual risk assessment",
  },
  {
    id: "req-7",
    category: "vendor_list",
    display_name: "Vendor & API Dependency List",
    description: "Third-party dependency inventory.",
    is_required: true,
    weight: 1,
    limits_when_missing: "vendor concentration risk and switching cost analysis",
  },
  {
    id: "req-8",
    category: "financial",
    display_name: "Financial / Usage Metrics",
    description: "ARR, usage, cost structure, and unit economics.",
    is_required: true,
    weight: 0.9,
    limits_when_missing: "production readiness signals and cost-per-inference economics",
  },
  {
    id: "req-9",
    category: "incident_log",
    display_name: "Incident Log / Post-Mortems",
    description: "Historical incidents and remediation.",
    is_required: false,
    weight: 0.7,
    limits_when_missing: "production stability and incident response maturity assessment",
  },
  {
    id: "req-10",
    category: "team_bios",
    display_name: "Team Bios / Technical Leadership",
    description: "Technical leadership background.",
    is_required: false,
    weight: 0.6,
    limits_when_missing: "team capability assessment and key-person risk analysis",
  },
  {
    id: "req-11",
    category: "demo",
    display_name: "Demo Recordings / Product Walkthroughs",
    description: "Recorded demo or product walkthrough.",
    is_required: false,
    weight: 0.5,
    limits_when_missing: "demo-to-production gap analysis and UX credibility assessment",
  },
];

export const demoDocuments: Document[] = [
  {
    id: "doc-1",
    engagement_id: demoEngagement.id,
    category: "deck",
    filename: "LexiFlow_Investor_Deck.pdf",
    storage_path: "preview/deck.pdf",
    file_size_bytes: 8_400_000,
    mime_type: "application/pdf",
    uploaded_at: "2026-04-17T09:15:00.000Z",
    uploaded_by: null,
    parsed_text: "Parsed deck text",
    parse_status: "parsed",
    parse_error: null,
    token_count: 18324,
  },
  {
    id: "doc-2",
    engagement_id: demoEngagement.id,
    category: "architecture",
    filename: "Architecture_Overview.docx",
    storage_path: "preview/architecture.docx",
    file_size_bytes: 2_100_000,
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    uploaded_at: "2026-04-17T09:20:00.000Z",
    uploaded_by: null,
    parsed_text: "Parsed architecture text",
    parse_status: "parsed",
    parse_error: null,
    token_count: 9421,
  },
  {
    id: "doc-3",
    engagement_id: demoEngagement.id,
    category: "security",
    filename: "SOC2_Summary.pdf",
    storage_path: "preview/soc2.pdf",
    file_size_bytes: 1_300_000,
    mime_type: "application/pdf",
    uploaded_at: "2026-04-17T09:24:00.000Z",
    uploaded_by: null,
    parsed_text: null,
    parse_status: "parsing",
    parse_error: null,
    token_count: null,
  },
  {
    id: "doc-4",
    engagement_id: demoEngagement.id,
    category: "vendor_list",
    filename: "Vendor_Dependencies.xlsx",
    storage_path: "preview/vendors.xlsx",
    file_size_bytes: 320_000,
    mime_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    uploaded_at: "2026-04-17T09:27:00.000Z",
    uploaded_by: null,
    parsed_text: "Parsed vendor dependency sheet",
    parse_status: "parsed",
    parse_error: null,
    token_count: 2104,
  },
  {
    id: "doc-5",
    engagement_id: demoEngagement.id,
    category: "demo",
    filename: "Product_Walkthrough.mp4",
    storage_path: "preview/demo.mp4",
    file_size_bytes: 58_000_000,
    mime_type: "video/mp4",
    uploaded_at: "2026-04-17T09:31:00.000Z",
    uploaded_by: null,
    parsed_text: null,
    parse_status: "queued",
    parse_error: null,
    token_count: null,
  },
];

export const demoAnalyses: PreAnalysis[] = [
  {
    id: "analysis-1",
    engagement_id: demoEngagement.id,
    document_id: "doc-1",
    analysis_type: "per_document",
    run_at: "2026-04-17T10:00:00.000Z",
    model_used: "claude-sonnet-4-20250514",
    prompt_version: "1.0.0",
    raw_output: {},
    extracted_claims: [
      {
        claim: "Platform reduces contract review time by 72% for enterprise legal teams.",
        source_doc: "LexiFlow_Investor_Deck.pdf",
        source_location: "p.12",
        confidence: "medium",
      },
      {
        claim: "Product is live with 18 paying enterprise customers.",
        source_doc: "LexiFlow_Investor_Deck.pdf",
        source_location: "p.19",
        confidence: "high",
      },
    ],
    red_flags: [
      {
        flag: "Claims a multi-model fallback strategy, but no fallback architecture is described in supporting materials.",
        severity: "high",
        dimension: "tooling_exposure",
        evidence: "Investor deck references resiliency but architecture documentation does not show a provider abstraction layer.",
      },
    ],
    regulatory_signals: [
      {
        regulation: "GDPR",
        relevance: "EU customer contracts are referenced in the deck.",
        exposure_level: "medium",
      },
    ],
    inconsistencies_json: [],
    vendor_dependencies: ["Anthropic", "OpenAI", "Pinecone"],
    model_dependencies: ["Claude Sonnet", "GPT-4.1"],
    open_questions: [
      "Are enterprise SLAs contractually supported by the current fallback design?",
    ],
    input_token_count: 18324,
    output_token_count: 1364,
    cost_usd: 0.42,
    status: "completed",
    error_message: null,
  },
  {
    id: "analysis-2",
    engagement_id: demoEngagement.id,
    document_id: "doc-2",
    analysis_type: "per_document",
    run_at: "2026-04-17T10:05:00.000Z",
    model_used: "claude-sonnet-4-20250514",
    prompt_version: "1.0.0",
    raw_output: {},
    extracted_claims: [
      {
        claim: "All retrieval traffic is routed through a single managed vector database cluster.",
        source_doc: "Architecture_Overview.docx",
        source_location: "section 3.2",
        confidence: "high",
      },
      {
        claim: "Customer workspaces are logically isolated but share embeddings infrastructure.",
        source_doc: "Architecture_Overview.docx",
        source_location: "section 4.1",
        confidence: "high",
      },
    ],
    red_flags: [
      {
        flag: "Shared embeddings infrastructure may create tenant isolation concerns for highly sensitive legal data.",
        severity: "critical",
        dimension: "data_sensitivity",
        evidence: "Architecture document notes shared vector infrastructure with logical isolation only.",
      },
    ],
    regulatory_signals: [],
    inconsistencies_json: [],
    vendor_dependencies: ["AWS", "Pinecone", "Anthropic"],
    model_dependencies: ["Claude Sonnet"],
    open_questions: [
      "Has the company completed an independent tenant isolation assessment?",
    ],
    input_token_count: 9421,
    output_token_count: 1189,
    cost_usd: 0.31,
    status: "completed",
    error_message: null,
  },
  {
    id: "analysis-3",
    engagement_id: demoEngagement.id,
    document_id: null,
    analysis_type: "synthesis",
    run_at: "2026-04-17T10:09:00.000Z",
    model_used: "claude-opus-4-20250514",
    prompt_version: "1.0.0",
    raw_output: {},
    extracted_claims: [],
    red_flags: [
      {
        flag: "Resiliency claims appear ahead of actual vendor abstraction maturity.",
        severity: "high",
        dimension: "tooling_exposure",
        evidence: "Cross-document inconsistency between investor materials and architecture design.",
      },
    ],
    regulatory_signals: [
      {
        regulation: "GDPR",
        relevance: "Cross-border processing likely for EU legal clients.",
        exposure_level: "medium",
      },
    ],
    inconsistencies_json: [
      {
        claim_a: "Product has multi-model failover in production.",
        claim_b: "Architecture uses a single model provider path with manual fallback steps.",
        sources: ["LexiFlow_Investor_Deck.pdf p.14", "Architecture_Overview.docx section 3.2"],
        interpretation: "Commercial positioning is ahead of documented production reality.",
      },
    ],
    vendor_dependencies: ["Anthropic", "OpenAI", "AWS", "Pinecone"],
    model_dependencies: ["Claude Sonnet", "GPT-4.1"],
    open_questions: [
      "Confirm whether any customers are actively using dual-provider failover in production.",
    ],
    input_token_count: 27745,
    output_token_count: 1542,
    cost_usd: 1.12,
    status: "completed",
    error_message: null,
  },
];

export const demoBenchmarkCases: BenchmarkCase[] = [
  {
    id: "benchmark-1",
    case_anchor_id: "CASE-001",
    vertical: "legal_tech",
    deal_size_band: "25m_100m",
    ai_architecture_type: "rag_heavy",
    composite_score: 2.8,
    dimension_scores_json: {
      product_credibility: 3.2,
      tooling_exposure: 1.8,
      data_sensitivity: 3.0,
      governance_safety: 2.5,
      production_readiness: 3.0,
      open_validation: 3.3,
    },
    war_story_summary:
      "RAG-heavy legal AI startup with strong demo quality but critical vendor concentration risk and thin fallback design.",
    tags: ["legal", "rag", "vendor_concentration"],
    created_at: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "benchmark-2",
    case_anchor_id: "CASE-011",
    vertical: "legal_tech",
    deal_size_band: "100m_500m",
    ai_architecture_type: "hybrid",
    composite_score: 3.7,
    dimension_scores_json: {
      product_credibility: 4.1,
      tooling_exposure: 3.4,
      data_sensitivity: 3.8,
      governance_safety: 3.9,
      production_readiness: 3.5,
      open_validation: 3.2,
    },
    war_story_summary:
      "Enterprise legal workflow platform with better compliance maturity and stronger infrastructure abstraction than peers.",
    tags: ["legal", "hybrid", "enterprise"],
    created_at: "2026-02-08T00:00:00.000Z",
  },
];

export const demoPatternMatches: PatternMatch[] = [
  {
    id: "match-1",
    engagement_id: demoEngagement.id,
    case_anchor_id: "CASE-001",
    similarity_score: 0.91,
    similarity_reason:
      "Similar legal-tech RAG profile with provider concentration and claims-vs-architecture mismatch.",
    operator_confirmed: null,
    created_at: "2026-04-17T10:10:00.000Z",
  },
  {
    id: "match-2",
    engagement_id: demoEngagement.id,
    case_anchor_id: "CASE-011",
    similarity_score: 0.74,
    similarity_reason:
      "Comparable enterprise workflow and compliance burden, but stronger current-state governance in the benchmark case.",
    operator_confirmed: null,
    created_at: "2026-04-17T10:10:00.000Z",
  },
];

export const demoScores: Score[] = SCORING_DIMENSIONS.flatMap((dimension, dimensionIndex) =>
  dimension.sub_criteria.map((subCriterion, subIndex) => ({
    id: `${dimension.key}-${subCriterion.key}`,
    engagement_id: demoEngagement.id,
    dimension: dimension.key,
    sub_criterion: subCriterion.key,
    score_0_to_5: Math.max(1.5, Math.min(4.5, 3.6 - dimensionIndex * 0.2 + (subIndex % 2 === 0 ? 0.4 : -0.2))),
    weight: 1,
    operator_rationale:
      "The document set supports a moderate score here, but evidence still indicates meaningful diligence risk. The current state is credible enough to continue analysis, though not yet strong enough to remove underwriting questions.",
    evidence_citations: [],
    pattern_match_case_id: null,
    created_at: "2026-04-17T10:15:00.000Z",
    updated_at: "2026-04-17T10:15:00.000Z",
    updated_by: null,
  })),
);

export const demoReport: Report = {
  id: "report-1",
  engagement_id: demoEngagement.id,
  version: 1,
  watermark: "draft",
  generated_at: "2026-04-17T11:00:00.000Z",
  pdf_storage_path: null,
  published_to_client_at: null,
  revision_notes: "Initial draft generated from operator-confirmed findings.",
  report_data: {
    executive_summary:
      "Kaptrix reviewed LexiFlow AI’s product materials, architecture documentation, dependency inventory, and security artifacts to assess whether the business appears investment-durable for an AI-heavy legal workflow product.",
    composite_score: 3.1,
    conviction_statement:
      "Current evidence supports continued diligence, but underwriting confidence should remain contingent on validating tenant isolation, real fallback behavior, and contractual support for claimed enterprise resiliency.",
    headline_bullets: [
      "Product value proposition appears real, but infrastructure claims are ahead of documentation maturity.",
      "Shared embeddings architecture raises elevated sensitivity risk for legal-sector data.",
      "Vendor concentration is manageable only if a real abstraction layer is demonstrated in production.",
    ],
    methodology_note:
      "This preview report is generated from structured mock data, mirroring the final Kaptrix report flow used in the production application.",
  },
};

export const demoKnowledgeInsights: KnowledgeInsight[] = [
  {
    id: "ki-1",
    source_document: "LexiFlow_Investor_Deck.pdf · p.12",
    excerpt:
      "Our proprietary multi-model routing layer automatically fails over between Claude, GPT-4, and Llama-based endpoints with sub-second switchover.",
    insight:
      "Deck claims production multi-model failover, but no supporting architecture diagram describes a provider abstraction layer. Elevate as a priority validation item.",
    category: "commercial",
    confidence: "high",
    suggested_intake_field: "Red flag priors",
    suggested_intake_value: "Hallucination / accuracy claims",
  },
  {
    id: "ki-2",
    source_document: "Architecture_Overview.docx · §4.1",
    excerpt:
      "Customer workspaces share a single Pinecone index with per-tenant namespaces; queries are filtered by tenant_id at retrieval time.",
    insight:
      "Shared embedding infrastructure with logical-only tenant isolation is a material risk for privileged legal content. Likely to drive sensitivity-dimension score downward.",
    category: "technical",
    confidence: "high",
    suggested_intake_field: "Primary AI architecture",
    suggested_intake_value: "RAG-heavy",
  },
  {
    id: "ki-3",
    source_document: "SOC2_Summary.pdf · §3",
    excerpt:
      "Company obtained Type I SOC 2 in Q4 2025; Type II observation window closes Q3 2026.",
    insight:
      "Only Type I today — enterprise legal buyers will require Type II before deep pipeline conversion. Factor into value-creation roadmap.",
    category: "regulatory",
    confidence: "high",
    suggested_intake_field: "Regulatory exposure",
    suggested_intake_value: "GDPR / UK GDPR",
  },
  {
    id: "ki-4",
    source_document: "Vendor_Dependencies.xlsx · Sheet1",
    excerpt:
      "Anthropic (primary LLM), OpenAI (embeddings + fallback), Pinecone (vector), AWS (compute), Auth0 (identity), Datadog (observability).",
    insight:
      "Three of six vendors carry AI supply-chain exposure (Anthropic, OpenAI, Pinecone). Concentration risk on Anthropic flagged for scenario modeling.",
    category: "operational",
    confidence: "high",
    suggested_intake_field: "Known vendor or model dependencies",
    suggested_intake_value: "Anthropic, OpenAI, Pinecone, AWS",
  },
  {
    id: "ki-5",
    source_document: "LexiFlow_Investor_Deck.pdf · p.21",
    excerpt:
      "ARR of $14.2M at 128% NDR, burn multiple 1.4x, gross margin 71%.",
    insight:
      "Margins reasonable for AI-native SaaS but sensitive to foundation-model pricing. Cost-per-inference visibility needed to underwrite margin durability.",
    category: "financial",
    confidence: "medium",
    suggested_intake_field: "Diligence priorities",
    suggested_intake_value: "Unit economics at scale",
  },
  {
    id: "ki-6",
    source_document: "LexiFlow_Investor_Deck.pdf · p.19",
    excerpt:
      "18 paying enterprise logos including three AmLaw 100 firms and two in-house legal teams at Fortune 500 companies.",
    insight:
      "Enterprise logo set is real. Reference concentration low enough to support customer-reference calls with diversified sample.",
    category: "commercial",
    confidence: "high",
  },
];

export const demoExecutiveReport: ExecutiveReportData = {
  target: demoEngagement.target_company_name,
  client: demoEngagement.client_firm_name,
  industry: "Legal Tech",
  generated_at: "2026-04-17T11:00:00.000Z",
  version: 1,
  watermark: "Draft · Privileged & Confidential",
  composite_score: 3.1,
  recommendation: "Proceed with conditions",
  confidence: "Moderate",
  executive_summary:
    "LexiFlow AI represents a commercially credible, AI-native workflow product for enterprise legal teams with a real customer base and healthy retention signal. However, the diligence evidence indicates a gap between the company's marketed infrastructure resiliency and the documented production architecture, together with a shared-embeddings tenancy model that carries elevated data-sensitivity risk for privileged content. The thesis is underwritable, but only with contractual and technical conditions that validate tenant isolation, multi-model fallback, and Type II SOC 2 completion.",
  strategic_context:
    "The enterprise legal AI category is consolidating around three archetypes: horizontal copilots, practice-specific workflow platforms, and compliance-oriented point solutions. LexiFlow AI sits in the practice-workflow tier, where durable winners will combine credible privilege handling with deep integration into legal operations systems. The asset is positioned appropriately for that lane, but competitive advantage hinges on converting current customer concentration in AmLaw 100 accounts into defensible workflow lock-in before horizontal competitors introduce comparable domain depth.",
  top_three_takeaways: [
    {
      headline: "Commercial signal is real",
      detail:
        "128% net dollar retention across 18 enterprise logos including three AmLaw 100 firms supports the product-market-fit thesis in a sector known for conservative buying behavior.",
    },
    {
      headline: "Infrastructure claims outrun evidence",
      detail:
        "Marketed multi-model failover is not reflected in architecture documentation, and shared embeddings infrastructure materially raises privileged-data risk for the buyer set.",
    },
    {
      headline: "Underwrite on conditions, not optimism",
      detail:
        "A conditional proceed is defensible: Type II SOC 2, independent tenant-isolation review, and contractual multi-provider commitments are the minimum validation set before close.",
    },
  ],
  dimension_scores: {
    product_credibility: 3.6,
    tooling_exposure: 2.4,
    data_sensitivity: 2.7,
    governance_safety: 3.0,
    production_readiness: 3.2,
    open_validation: 3.4,
  },
  risk_heat_map: [
    {
      risk: "Shared embeddings tenancy exposes privileged content",
      likelihood: 4,
      impact: 5,
      category: "Data sensitivity",
    },
    {
      risk: "Anthropic single-provider concentration in production path",
      likelihood: 4,
      impact: 4,
      category: "Tooling exposure",
    },
    {
      risk: "Type II SOC 2 timing delays enterprise pipeline",
      likelihood: 3,
      impact: 3,
      category: "Governance and safety",
    },
    {
      risk: "Hallucinated citations reaching client deliverables",
      likelihood: 2,
      impact: 5,
      category: "Product credibility",
    },
    {
      risk: "Key-person dependency on two founding engineers",
      likelihood: 3,
      impact: 4,
      category: "Production readiness",
    },
  ],
  critical_findings: [
    {
      title:
        "Shared embeddings architecture inadequate for privileged legal content",
      severity: "Critical",
      what_we_found:
        "Architecture documentation confirms a single Pinecone index with per-tenant namespaces and retrieval-time tenant_id filtering, rather than hard isolation.",
      why_it_matters:
        "ABA Model Rule 1.6 confidentiality obligations and state-bar guidance increasingly expect technical, not only logical, separation for privileged content. A misconfiguration at retrieval time could cross-expose matter-sensitive data.",
      operator_evidence:
        "Architecture_Overview.docx §4.1; confirmed absent in SOC 2 Type I report scope.",
    },
    {
      title: "Marketed multi-provider failover is not architecturally present",
      severity: "High",
      what_we_found:
        "Investor materials reference sub-second cross-provider failover; architecture shows a single Anthropic path with manual fallback runbooks.",
      why_it_matters:
        "Commercial differentiation tied to resiliency is a fragile claim. A single contractual or performance event at the primary model provider would expose the full customer base.",
      operator_evidence:
        "LexiFlow_Investor_Deck.pdf p.12 vs. Architecture_Overview.docx §3.2; no abstraction layer found in the dependency inventory.",
    },
    {
      title: "SOC 2 Type II observation window still open",
      severity: "Moderate",
      what_we_found:
        "Company holds a SOC 2 Type I as of Q4 2025; Type II observation window closes Q3 2026.",
      why_it_matters:
        "Enterprise legal buyers commonly require Type II before expansion procurement. Timing risk directly touches the post-close pipeline assumption.",
      operator_evidence:
        "SOC2_Summary.pdf §3; corroborated by customer contract procurement clauses.",
    },
  ],
  strategic_implications: [
    {
      theme: "The durable moat is privilege containment, not model choice",
      narrative:
        "In regulated legal workflows, buyers care less about which model sits behind a feature than about the contractual and technical guarantees around their content. Investment in demonstrable privilege containment is the highest-return technical initiative for the next twelve months and the likely basis for renewal pricing power.",
    },
    {
      theme: "Vendor abstraction is a pricing, not an engineering, question",
      narrative:
        "Building true multi-provider orchestration is costly without corresponding customer willingness to pay. A more defensible near-term posture is contractual — negotiating tiered commitments with the primary model provider while building optionality signals for diligence-sensitive buyers.",
    },
    {
      theme: "Go-to-market concentration is an opportunity, not a risk — yet",
      narrative:
        "Depth within AmLaw 100 accounts provides a launching point for practice-area expansion. The moment to worry is if account growth begins to plateau before mid-market penetration accelerates, at which point repositioning becomes materially harder.",
    },
  ],
  value_creation_levers: [
    {
      lever: "Formalize tenant isolation program",
      thesis:
        "Independent assessment plus customer-facing attestations converts a current liability into a defensible differentiator against horizontal entrants.",
      time_horizon: "0 to 6 months",
    },
    {
      lever: "Negotiate multi-provider model contracts",
      thesis:
        "Tiered commitments with both Anthropic and at least one alternate provider reduce resiliency narrative risk at low incremental engineering cost.",
      time_horizon: "0 to 9 months",
    },
    {
      lever: "Close SOC 2 Type II and initiate ISO 27001",
      thesis:
        "Compliance posture directly removes procurement friction in the target enterprise segment and unlocks incremental ACV without product investment.",
      time_horizon: "6 to 12 months",
    },
    {
      lever: "Build a usage-priced citation-audit tier",
      thesis:
        "Monetize the verification workflow itself, turning an operational cost into a differentiated product line for risk-averse buyers.",
      time_horizon: "12 to 18 months",
    },
  ],
  recommended_conditions: [
    {
      condition: "Independent tenant-isolation assessment",
      rationale:
        "A qualified third-party review of the shared-embeddings design must confirm isolation boundaries before close; remediation commitments should be contractual.",
      owner: "Buyer security lead",
    },
    {
      condition: "Multi-provider contractual commitment",
      rationale:
        "Secure enforceable commitments with a secondary foundation-model provider to substantiate the resiliency narrative and reduce single-vendor exposure.",
      owner: "Target CTO",
    },
    {
      condition: "Type II SOC 2 completion milestone",
      rationale:
        "Make purchase-price escrow or earnout contingent on Type II issuance within the existing observation window.",
      owner: "Deal counsel",
    },
    {
      condition: "Customer reference diligence on citation accuracy",
      rationale:
        "Direct references from at least three enterprise customers on live hallucination and citation-audit experience.",
      owner: "Kaptrix operator",
    },
  ],
  open_validation: [
    "Confirm whether any enterprise customers are contractually promised dual-provider failover.",
    "Verify Pinecone namespace isolation was tested under adversarial tenant-id spoofing.",
    "Validate burn-multiple improvement trajectory with September actuals.",
    "Obtain cost-per-inference breakdown to stress-test margin durability.",
    "Review prior post-mortems for any cross-tenant exposure events.",
    "Confirm training-data provenance for any fine-tuned or domain-adapted models.",
  ],
  methodology:
    "Kaptrix reviewed target-provided artifacts against the six-dimension AI diligence framework and benchmarked findings against a proprietary case library of 140 comparable AI product transactions. Every claim in this report is grounded in a document citation and reviewed by a human operator prior to publication. Draft content is never delivered as raw model output.",
};