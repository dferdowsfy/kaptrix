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
      {
        key: "ai_value_vs_wrapper",
        name: "AI-Driven Value vs. Wrapper",
        description: "Is the AI core to the value proposition, or a bolt-on to a workflow/services business?",
        score_bands: [
          { max: 1, label: "No evidence", description: "AI appears entirely cosmetic; core value is manual services or simple rules." },
          { max: 2, label: "Weak signal", description: "AI features exist but are interchangeable with non-AI alternatives." },
          { max: 3, label: "Partial", description: "AI adds measurable value in some workflows but is not the primary moat." },
          { max: 4, label: "Strong", description: "AI is central to the value proposition with clear differentiation from non-AI solutions." },
          { max: 5, label: "Exceptional", description: "AI is indispensable; removing it would fundamentally break the product." },
        ],
      },
      {
        key: "demo_production_gap",
        name: "Demo-to-Production Gap",
        description: "How wide is the gap between what is demoed and what runs in production?",
        score_bands: [
          { max: 1, label: "Critical gap", description: "Demo environment bears no resemblance to production; core features are scripted or faked." },
          { max: 2, label: "Wide gap", description: "Significant features shown in demos are not yet available or stable in production." },
          { max: 3, label: "Moderate gap", description: "Most demo features exist in production but with notable limitations or manual workarounds." },
          { max: 4, label: "Narrow gap", description: "Production closely mirrors demos; minor differences are documented and explained." },
          { max: 5, label: "No gap", description: "Demo is a live production instance; what you see is what customers get." },
        ],
      },
      {
        key: "customer_vs_claimed",
        name: "Customer-Reported vs. Claimed Outcomes",
        description: "Do customer references or data support the claims made in sales materials?",
        score_bands: [
          { max: 1, label: "No evidence", description: "No customer references or data support the claims; outcomes are entirely self-reported." },
          { max: 2, label: "Weak evidence", description: "Limited references exist but contradict or fail to substantiate key claims." },
          { max: 3, label: "Mixed evidence", description: "Some customer data supports claims, but material gaps or cherry-picking is evident." },
          { max: 4, label: "Strong evidence", description: "Multiple customer references confirm claimed outcomes with quantitative support." },
          { max: 5, label: "Validated", description: "Independent, auditable customer data validates all major claims; outcomes exceed positioning." },
        ],
      },
      {
        key: "differentiation",
        name: "Differentiation Defensibility",
        description: "How defensible is the product differentiation against competitors or new entrants?",
        score_bands: [
          { max: 1, label: "No moat", description: "Product is easily replicated; no proprietary data, models, or process advantages." },
          { max: 2, label: "Thin moat", description: "Minor differentiation exists but could be replicated within 6–12 months by a funded competitor." },
          { max: 3, label: "Moderate moat", description: "Some proprietary elements (data, integrations, domain expertise) provide short-term advantage." },
          { max: 4, label: "Strong moat", description: "Meaningful barriers to replication across multiple vectors (data, workflow lock-in, expertise)." },
          { max: 5, label: "Deep moat", description: "Multi-layered defensibility with compounding network effects, proprietary data loops, or regulatory advantage." },
        ],
      },
    ],
  },
  {
    key: "tooling_exposure",
    name: "Tooling & Vendor Exposure",
    weight: 0.20,
    sub_criteria: [
      {
        key: "model_concentration",
        name: "Foundation Model Concentration Risk",
        description: "Dependency on a single foundation model provider.",
        score_bands: [
          { max: 1, label: "Critical", description: "Entire product depends on a single model from one provider with no fallback or abstraction." },
          { max: 2, label: "High risk", description: "Primary workflows rely on one provider; token-level fallback exists but is untested." },
          { max: 3, label: "Moderate", description: "Two providers are integrated, but switching requires meaningful engineering effort." },
          { max: 4, label: "Low risk", description: "Model abstraction layer enables switching; at least two providers are tested in production." },
          { max: 5, label: "Minimal", description: "Fully abstracted model layer; provider changes are configuration-level with proven fallback behavior." },
        ],
      },
      {
        key: "api_brittleness",
        name: "API Dependency Brittleness",
        description: "Risk from third-party API changes, deprecation, or outages.",
        score_bands: [
          { max: 1, label: "Critical", description: "Core features break immediately if any third-party API changes or experiences downtime." },
          { max: 2, label: "High brittleness", description: "Key workflows are tightly coupled to specific API versions with no degradation handling." },
          { max: 3, label: "Moderate", description: "Some API dependencies are wrapped, but breaking changes would still cause multi-day outages." },
          { max: 4, label: "Resilient", description: "API dependencies are versioned and wrapped; graceful degradation is implemented for critical paths." },
          { max: 5, label: "Robust", description: "All external APIs are behind contracts with automated version testing and seamless failover." },
        ],
      },
      {
        key: "switching_cost",
        name: "Switching Cost if Key Vendor Changes Terms",
        description: "How costly would it be to migrate away from a key vendor?",
        score_bands: [
          { max: 1, label: "Catastrophic", description: "Vendor lock-in is total; switching would require a full rebuild of core functionality." },
          { max: 2, label: "Very high", description: "Migration is technically possible but would take 6+ months and risk data loss or downtime." },
          { max: 3, label: "Significant", description: "Switching is feasible within a quarter but requires dedicated engineering and retraining." },
          { max: 4, label: "Manageable", description: "Switching cost is quantified and budgeted; migration path is documented and partially tested." },
          { max: 5, label: "Low", description: "Vendor is interchangeable; contracts and architecture are designed for portability from the start." },
        ],
      },
      {
        key: "hosted_vs_managed",
        name: "Self-Hosted vs. Managed Tradeoffs",
        description: "Balance between control/cost and operational overhead.",
        score_bands: [
          { max: 1, label: "No analysis", description: "No consideration of hosting tradeoffs; defaulted to easiest option without evaluating risks." },
          { max: 2, label: "Poor fit", description: "Hosting model mismatches data sensitivity or scale requirements; material cost or compliance gaps." },
          { max: 3, label: "Acceptable", description: "Hosting model is defensible for current scale but will need revisiting at 2–3x growth." },
          { max: 4, label: "Well-matched", description: "Hosting model aligns with data, cost, and compliance requirements with clear upgrade path." },
          { max: 5, label: "Optimal", description: "Hosting architecture is purpose-built for sensitivity and scale with documented cost-benefit analysis." },
        ],
      },
    ],
  },
  {
    key: "data_sensitivity",
    name: "Data & Sensitivity Risk",
    weight: 0.15,
    sub_criteria: [
      {
        key: "sensitivity_fit",
        name: "Data Sensitivity vs. Tooling Fit",
        description: "Does the data sensitivity level match the chosen tooling and architecture?",
        score_bands: [
          { max: 1, label: "Critical mismatch", description: "Highly sensitive data is processed through tools with inadequate security controls." },
          { max: 2, label: "Significant gap", description: "Tooling meets some requirements but leaves material sensitivity gaps unaddressed." },
          { max: 3, label: "Partial fit", description: "Most data sensitivity levels are matched, but edge cases or highest-sensitivity data lacks controls." },
          { max: 4, label: "Strong fit", description: "Tooling is appropriate for the data sensitivity profile with documented justification." },
          { max: 5, label: "Excellent fit", description: "Architecture was designed specifically for the data sensitivity tier with defense-in-depth controls." },
        ],
      },
      {
        key: "training_provenance",
        name: "Training Data Provenance & Licensing",
        description: "Is training data sourced legally and ethically? Any licensing concerns?",
        score_bands: [
          { max: 1, label: "Unknown", description: "No documentation of training data sources; licensing status is entirely unclear." },
          { max: 2, label: "Risky", description: "Some sources are documented but licensing gaps or questionable provenance exist." },
          { max: 3, label: "Partially documented", description: "Major data sources are identified and licensed, but gaps remain for fine-tuning data." },
          { max: 4, label: "Well-documented", description: "All training data sources are catalogued with clear licensing and provenance chains." },
          { max: 5, label: "Exemplary", description: "Full provenance trail with automated license compliance checking and regular audits." },
        ],
      },
      {
        key: "customer_isolation",
        name: "Customer Data Isolation",
        description: "Are customer data environments properly isolated?",
        score_bands: [
          { max: 1, label: "No isolation", description: "Customer data is commingled with no logical or physical separation between tenants." },
          { max: 2, label: "Weak isolation", description: "Logical separation exists but shared infrastructure creates cross-contamination risk." },
          { max: 3, label: "Partial isolation", description: "Row-level or namespace isolation is implemented but not independently verified." },
          { max: 4, label: "Strong isolation", description: "Dedicated compute or encryption per tenant with tested isolation boundaries." },
          { max: 5, label: "Complete isolation", description: "Full tenant isolation with independent verification, breach-blast-radius analysis, and audit proof." },
        ],
      },
      {
        key: "regulated_data",
        name: "PII / PHI / Regulated Data Handling",
        description: "How is personally identifiable and health information handled?",
        score_bands: [
          { max: 1, label: "Non-compliant", description: "No controls for PII/PHI; regulated data is processed without appropriate safeguards." },
          { max: 2, label: "Gaps present", description: "Some controls exist but do not cover all regulated data types or processing scenarios." },
          { max: 3, label: "Developing", description: "Controls are in place for major regulated data categories but lack formal certification." },
          { max: 4, label: "Compliant", description: "Formal compliance frameworks (SOC 2, HIPAA BAA) are in place with regular assessments." },
          { max: 5, label: "Mature", description: "Comprehensive data governance with automated PII detection, encryption at rest/transit, and breach response." },
        ],
      },
    ],
  },
  {
    key: "governance_safety",
    name: "Governance & Safety Posture",
    weight: 0.15,
    sub_criteria: [
      {
        key: "logging_observability",
        name: "Logging & Observability",
        description: "Are AI system inputs/outputs logged and observable?",
        score_bands: [
          { max: 1, label: "Absent", description: "No logging of AI system inputs, outputs, or decisions; debugging is guesswork." },
          { max: 2, label: "Basic", description: "Some logs exist but are incomplete, unstructured, or not retained long enough for audit." },
          { max: 3, label: "Functional", description: "Key interactions are logged with retention, but observability dashboards are limited." },
          { max: 4, label: "Strong", description: "Comprehensive structured logging with alerting, dashboards, and trace-level observability." },
          { max: 5, label: "Best-in-class", description: "Full observability stack with real-time anomaly detection, cost tracking, and audit-ready exports." },
        ],
      },
      {
        key: "access_controls",
        name: "Access Controls & Audit Trails",
        description: "Are access controls implemented with proper audit trails?",
        score_bands: [
          { max: 1, label: "Missing", description: "No role-based access controls; admin-level access is broadly shared without audit logging." },
          { max: 2, label: "Insufficient", description: "Basic authentication exists but authorization is coarse-grained with limited audit trails." },
          { max: 3, label: "Developing", description: "RBAC is implemented for major surfaces; audit logging captures critical operations." },
          { max: 4, label: "Solid", description: "Fine-grained RBAC with comprehensive audit trails, SSO integration, and access reviews." },
          { max: 5, label: "Excellent", description: "Zero-trust architecture with MFA enforcement, automated access reviews, and immutable audit logs." },
        ],
      },
      {
        key: "human_in_loop",
        name: "Human-in-the-Loop Design",
        description: "Is there appropriate human oversight where warranted?",
        score_bands: [
          { max: 1, label: "Absent", description: "AI operates autonomously with no mechanism for human review or override." },
          { max: 2, label: "Minimal", description: "Human review is possible but not enforced; no escalation paths for edge cases." },
          { max: 3, label: "Present", description: "Human checkpoints exist for high-stakes decisions, but coverage is incomplete." },
          { max: 4, label: "Well-designed", description: "Clear escalation paths with enforced review gates for all material AI outputs." },
          { max: 5, label: "Exemplary", description: "Graduated human oversight calibrated to decision stakes with feedback loops that improve the model." },
        ],
      },
      {
        key: "output_risk",
        name: "Output Risk Management",
        description: "How are hallucination, bias, and abuse risks managed?",
        score_bands: [
          { max: 1, label: "Unmanaged", description: "No guardrails for hallucination, bias, or adversarial misuse; outputs go directly to users." },
          { max: 2, label: "Minimal", description: "Basic prompt engineering, but no systematic detection of harmful or fabricated outputs." },
          { max: 3, label: "Developing", description: "Output filters exist for known failure modes, but coverage is inconsistent." },
          { max: 4, label: "Robust", description: "Multi-layer output validation with hallucination detection, bias testing, and abuse prevention." },
          { max: 5, label: "Comprehensive", description: "Automated output quality assurance with red-teaming program and continuous adversarial testing." },
        ],
      },
    ],
  },
  {
    key: "production_readiness",
    name: "Production-Readiness Signals",
    weight: 0.15,
    sub_criteria: [
      {
        key: "scaling",
        name: "Scaling Behavior Under Load",
        description: "How does the system behave under production-level load?",
        score_bands: [
          { max: 1, label: "Unknown", description: "No load testing performed; production behavior under stress is entirely unknown." },
          { max: 2, label: "Fragile", description: "System tested at low scale only; known bottlenecks exist at 2–3x current volume." },
          { max: 3, label: "Adequate", description: "Load tested at expected scale, but latency or cost degrades significantly at peaks." },
          { max: 4, label: "Strong", description: "Proven scaling to 5–10x current load with documented performance characteristics." },
          { max: 5, label: "Excellent", description: "Auto-scaling architecture with sub-linear cost growth, tested at order-of-magnitude increases." },
        ],
      },
      {
        key: "incident_response",
        name: "Incident Response Maturity",
        description: "How mature is the incident response process?",
        score_bands: [
          { max: 1, label: "Non-existent", description: "No incident response plan; outages are handled ad-hoc with no postmortem process." },
          { max: 2, label: "Informal", description: "Some response capability exists but is undocumented, untested, and person-dependent." },
          { max: 3, label: "Developing", description: "Documented runbooks for common failures; postmortems happen but inconsistently." },
          { max: 4, label: "Mature", description: "Tiered incident response with SLAs, on-call rotation, and regular drills." },
          { max: 5, label: "Best-in-class", description: "Automated detection and escalation with chaos engineering and public status page." },
        ],
      },
      {
        key: "model_drift",
        name: "Model Drift & Retraining Cadence",
        description: "Is model drift monitored and what is the retraining strategy?",
        score_bands: [
          { max: 1, label: "Not monitored", description: "No drift detection; models run indefinitely without performance validation." },
          { max: 2, label: "Minimal monitoring", description: "Some accuracy metrics are tracked, but no automated drift alerts or retraining triggers." },
          { max: 3, label: "Periodic checks", description: "Drift is monitored quarterly with manual retraining when degradation is noticed." },
          { max: 4, label: "Proactive", description: "Automated drift detection with defined retraining cadence and validation pipelines." },
          { max: 5, label: "Continuous", description: "Real-time drift monitoring with automated retraining, A/B testing, and rollback capability." },
        ],
      },
      {
        key: "cost_per_inference",
        name: "Cost-Per-Inference Economics",
        description: "Are inference costs sustainable at scale?",
        score_bands: [
          { max: 1, label: "Unsustainable", description: "Inference costs exceed or consume the product's gross margin at current scale." },
          { max: 2, label: "Concerning", description: "Costs are tracked but trending unfavorably; no clear path to unit economics." },
          { max: 3, label: "Manageable", description: "Unit economics are positive at current scale but sensitive to usage growth." },
          { max: 4, label: "Healthy", description: "Clear cost-per-unit with optimization roadmap; margins are sustainable at 3–5x scale." },
          { max: 5, label: "Excellent", description: "Inference costs are well below industry benchmarks with cost optimization embedded in architecture." },
        ],
      },
      {
        key: "ai_unit_economics",
        name: "AI Unit Economics (Inference Efficiency)",
        description:
          "Whether the company's AI-driven value delivery is economically scalable — controlled token consumption, model tiering, and margin durability as usage increases.",
        score_bands: [
          {
            max: 1,
            label: "Margin Compression Risk",
            description:
              "Workflows route all traffic to premium models with no tiering; no visibility into cost per task; margin compresses as usage scales.",
          },
          {
            max: 2,
            label: "Fragile",
            description:
              "Token usage is tracked but cost-per-output is not; premium-model reliance dominates; no controls on token-intensive loops or context growth.",
          },
          {
            max: 3,
            label: "Neutral",
            description:
              "Some model tiering exists and cost-per-task is partially instrumented; margin is flat as usage scales but lower-cost substitution is unproven.",
          },
          {
            max: 4,
            label: "Scalable",
            description:
              "Explicit model routing by task class, cost-per-output tracked per workflow, context and loop limits enforced, lower-cost models validated for meaningful portions of the workflow.",
          },
          {
            max: 5,
            label: "Economically Scalable AI",
            description:
              "Margin improves with scale: task-level cost observability, tiered routing by intent, aggressive substitution to smaller/cheaper models without product degradation, and hard controls on token-heavy operations (context caps, loop bounds, retrieval budgets).",
          },
        ],
      },
    ],
  },
  {
    key: "open_validation",
    name: "Open Validation Areas",
    weight: 0.10,
    sub_criteria: [
      {
        key: "specialist_review",
        name: "Areas Needing Specialist Review",
        description: "What areas require domain-specific expert review?",
        score_bands: [
          { max: 1, label: "Unidentified", description: "No analysis of which areas require domain-specific expertise beyond general diligence." },
          { max: 2, label: "Vague", description: "Some areas are flagged but without specificity on what expertise is needed or why." },
          { max: 3, label: "Partially mapped", description: "Key specialist review areas identified (e.g., legal, security) but not all scoped." },
          { max: 4, label: "Well-scoped", description: "All specialist review needs are identified with clear briefs and recommended experts." },
          { max: 5, label: "Fully addressed", description: "Specialist reviews have been completed or are in progress with findings integrated." },
        ],
      },
      {
        key: "technical_debt",
        name: "Technical Debt Visibility",
        description: "How visible and managed is technical debt?",
        score_bands: [
          { max: 1, label: "Invisible", description: "No awareness or tracking of technical debt; architecture decisions are undocumented." },
          { max: 2, label: "Anecdotal", description: "Team acknowledges debt exists but has no systematic inventory or prioritization." },
          { max: 3, label: "Partially tracked", description: "Major debt items are logged, but no quantified impact or paydown plan exists." },
          { max: 4, label: "Well-managed", description: "Technical debt is inventoried, prioritized by impact, with an active reduction plan." },
          { max: 5, label: "Exemplary", description: "Debt is systematically tracked with automated detection, budgeted paydown, and trend metrics." },
        ],
      },
      {
        key: "known_unknowns",
        name: "Known Unknowns",
        description: "What questions remain unanswered after analysis?",
        score_bands: [
          { max: 1, label: "Not considered", description: "No effort to identify what questions remain unanswered after initial analysis." },
          { max: 2, label: "Vague awareness", description: "Some unknowns are mentioned but not catalogued or risk-ranked." },
          { max: 3, label: "Listed", description: "Key unknowns are documented with rough prioritization, but no resolution plan." },
          { max: 4, label: "Actionable", description: "All material unknowns are risk-ranked with assigned owners and resolution timelines." },
          { max: 5, label: "Resolved", description: "All critical unknowns have been investigated; remaining items are low-risk and documented." },
        ],
      },
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
