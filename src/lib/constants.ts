import { type DimensionConfig } from "./types";

// ============================================
// Engagement tiers with pricing & SLA
// ============================================

export const ENGAGEMENT_TIERS = {
  signal_scan: {
    name: "Signal Scan",
    description: "1-day review, 3 core documents, summary memo",
    price: 2500,
    turnaround_days: 2,
    max_documents: 3,
  },
  standard: {
    name: "Standard Diligence",
    description: "Full 6-dimension scorecard + report, up to 11 documents",
    price: 12500,
    turnaround_days: 7,
    max_documents: 11,
  },
  deep: {
    name: "Deep Diligence",
    description: "Standard + interviews with target CTO/AI lead + extended red-team",
    price: 35000,
    turnaround_days: 14,
    max_documents: 50,
  },
  retained: {
    name: "Retained Advisor",
    description: "Quarterly engagement, up to 4 diligences + ad-hoc",
    price: 120000,
    turnaround_days: null,
    max_documents: 50,
  },
} as const;

// ============================================
// Scoring dimensions with sub-criteria
// ============================================

export const SCORING_DIMENSIONS: DimensionConfig[] = [
  {
    key: "product_credibility",
    name: "Product Credibility",
    weight: 0.25,
    sub_criteria: [
      { key: "ai_value_vs_wrapper", name: "AI-Driven Value vs. Wrapper", description: "Is the AI core to the value proposition, or a bolt-on to a workflow/services business?" },
      { key: "demo_production_gap", name: "Demo-to-Production Gap", description: "How wide is the gap between what is demoed and what runs in production?" },
      { key: "customer_vs_claimed", name: "Customer-Reported vs. Claimed Outcomes", description: "Do customer references or data support the claims made in sales materials?" },
      { key: "differentiation", name: "Differentiation Defensibility", description: "How defensible is the product differentiation against competitors or new entrants?" },
    ],
  },
  {
    key: "tooling_exposure",
    name: "Tooling & Vendor Exposure",
    weight: 0.20,
    sub_criteria: [
      { key: "model_concentration", name: "Foundation Model Concentration Risk", description: "Dependency on a single foundation model provider." },
      { key: "api_brittleness", name: "API Dependency Brittleness", description: "Risk from third-party API changes, deprecation, or outages." },
      { key: "switching_cost", name: "Switching Cost if Key Vendor Changes Terms", description: "How costly would it be to migrate away from a key vendor?" },
      { key: "hosted_vs_managed", name: "Self-Hosted vs. Managed Tradeoffs", description: "Balance between control/cost and operational overhead." },
    ],
  },
  {
    key: "data_sensitivity",
    name: "Data & Sensitivity Risk",
    weight: 0.15,
    sub_criteria: [
      { key: "sensitivity_fit", name: "Data Sensitivity vs. Tooling Fit", description: "Does the data sensitivity level match the chosen tooling and architecture?" },
      { key: "training_provenance", name: "Training Data Provenance & Licensing", description: "Is training data sourced legally and ethically? Any licensing concerns?" },
      { key: "customer_isolation", name: "Customer Data Isolation", description: "Are customer data environments properly isolated?" },
      { key: "regulated_data", name: "PII / PHI / Regulated Data Handling", description: "How is personally identifiable and health information handled?" },
    ],
  },
  {
    key: "governance_safety",
    name: "Governance & Safety Posture",
    weight: 0.15,
    sub_criteria: [
      { key: "logging_observability", name: "Logging & Observability", description: "Are AI system inputs/outputs logged and observable?" },
      { key: "access_controls", name: "Access Controls & Audit Trails", description: "Are access controls implemented with proper audit trails?" },
      { key: "human_in_loop", name: "Human-in-the-Loop Design", description: "Is there appropriate human oversight where warranted?" },
      { key: "output_risk", name: "Output Risk Management", description: "How are hallucination, bias, and abuse risks managed?" },
    ],
  },
  {
    key: "production_readiness",
    name: "Production-Readiness Signals",
    weight: 0.15,
    sub_criteria: [
      { key: "scaling", name: "Scaling Behavior Under Load", description: "How does the system behave under production-level load?" },
      { key: "incident_response", name: "Incident Response Maturity", description: "How mature is the incident response process?" },
      { key: "model_drift", name: "Model Drift & Retraining Cadence", description: "Is model drift monitored and what is the retraining strategy?" },
      { key: "cost_per_inference", name: "Cost-Per-Inference Economics", description: "Are inference costs sustainable at scale?" },
    ],
  },
  {
    key: "open_validation",
    name: "Open Validation Areas",
    weight: 0.10,
    sub_criteria: [
      { key: "specialist_review", name: "Areas Needing Specialist Review", description: "What areas require domain-specific expert review?" },
      { key: "technical_debt", name: "Technical Debt Visibility", description: "How visible and managed is technical debt?" },
      { key: "known_unknowns", name: "Known Unknowns", description: "What questions remain unanswered after analysis?" },
    ],
  },
];

// ============================================
// File upload constraints
// ============================================

export const UPLOAD_LIMITS = {
  MAX_FILES_PER_UPLOAD: 50,
  MAX_FILE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_TOKEN_COUNT_PER_DOCUMENT: 150_000,
  ALLOWED_MIME_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "image/png",
    "image/jpeg",
    "video/mp4",
    "video/webm",
  ],
} as const;

// ============================================
// Session & security
// ============================================

export const SESSION_TIMEOUT_MINUTES = 30;
export const DATA_RETENTION_DAYS = 90;

// ============================================
// Status display configuration
// ============================================

export const ENGAGEMENT_STATUS_CONFIG = {
  intake: { label: "Intake", color: "bg-blue-100 text-blue-800" },
  analysis: { label: "Analysis", color: "bg-yellow-100 text-yellow-800" },
  scoring: { label: "Scoring", color: "bg-purple-100 text-purple-800" },
  review: { label: "Review", color: "bg-orange-100 text-orange-800" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
} as const;

export const PARSE_STATUS_CONFIG = {
  queued: { label: "Queued", color: "bg-gray-100 text-gray-800" },
  parsing: { label: "Parsing", color: "bg-yellow-100 text-yellow-800" },
  parsed: { label: "Parsed", color: "bg-green-100 text-green-800" },
  failed: { label: "Failed", color: "bg-red-100 text-red-800" },
} as const;
