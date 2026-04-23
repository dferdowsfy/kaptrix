// Kaptrix Delivery Platform — Core Type Definitions

// ============================================
// Enums as union types
// ============================================

export type EngagementStatus = 'intake' | 'analysis' | 'scoring' | 'review' | 'delivered';
export type DealStage = 'preliminary' | 'loi' | 'confirmatory' | 'post_close';
export type EngagementTier = 'signal_scan' | 'standard' | 'deep' | 'retained';
export type UserRole = 'operator' | 'client_viewer' | 'admin';
export type ReferralSource = 'direct' | 'referral' | 'signal_hunter' | 'platform' | 'content';
export type EngagementOutcome = 'proceeded' | 'passed' | 'renegotiated' | 'pending';

/**
 * Discriminator for the diligence pathway an engagement represents.
 *   - 'target'   — classic Kaptrix flow: evaluate a specific company / product.
 *   - 'category' — AI Category Diligence: evaluate an AI category or theme.
 * Backed by engagements.subject_kind (migration 00032). Every existing
 * engagement is 'target' via DB default.
 */
export type SubjectKind = 'target' | 'category';

export type DocumentCategory =
  | 'deck' | 'architecture' | 'security' | 'model_ai' | 'data_privacy'
  | 'customer_contracts' | 'vendor_list' | 'financial' | 'incident_log'
  | 'team_bios' | 'demo' | 'other';

export type ParseStatus = 'queued' | 'parsing' | 'parsed' | 'failed';

export type ScoreDimension =
  | 'product_credibility' | 'tooling_exposure' | 'data_sensitivity'
  | 'governance_safety' | 'production_readiness' | 'open_validation';

export type DealSizeBand = 'under_25m' | '25m_100m' | '100m_500m' | 'over_500m';

export type AIArchitectureType =
  | 'rag_heavy' | 'fine_tuned' | 'agentic' | 'workflow_plus_ai'
  | 'multi_model' | 'single_model_api' | 'on_premise' | 'hybrid' | 'other';

export type ReportWatermark = 'draft' | 'final' | 'confidential';

export type PreAnalysisStatus = 'running' | 'completed' | 'failed';
export type PreAnalysisType = 'per_document' | 'synthesis';

// ============================================
// Database row types
// ============================================

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firm_name: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface Engagement {
  id: string;
  client_firm_name: string;
  target_company_name: string;
  deal_stage: DealStage;
  status: EngagementStatus;
  tier: EngagementTier;
  assigned_operator_id: string | null;
  client_contact_email: string | null;
  nda_signed_at: string | null;
  engagement_fee: number | null;
  delivery_deadline: string | null;
  referral_source: ReferralSource | null;
  outcome: EngagementOutcome | null;
  /**
   * Discriminator for the diligence pathway (migration 00032). The DB
   * column is NOT NULL with DEFAULT 'target', so rows fetched from
   * Supabase always carry a value. Marked optional on the TS side so
   * demo data, tests, and in-flight clones do not have to set it.
   */
  subject_kind?: SubjectKind;
  /** Optional display label for the subject (category name for category mode). */
  subject_label?: string | null;
  /** If this engagement was promoted from a category diligence, the source engagement id. */
  promoted_from_engagement_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sibling 1:1 profile for category-mode engagements (migration 00035).
 * Only populated when the parent engagement has subject_kind = 'category'.
 */
export interface EngagementCategoryProfile {
  id: string;
  engagement_id: string;
  category_slug: string;
  category_name: string;
  thesis: string | null;
  time_horizon_months: number | null;
  /** List of neighbouring / adjacent AI categories the operator wants to compare against. */
  peer_categories: string[];
  /** Free-form rubric used to turn category findings into target-screening criteria. */
  screening_criteria: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  engagement_id: string;
  category: DocumentCategory;
  filename: string;
  storage_path: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string;
  uploaded_by: string | null;
  parsed_text: string | null;
  parse_status: ParseStatus;
  parse_error: string | null;
  token_count: number | null;
  /**
   * Denormalised discriminator (migration 00034). Null = inherit from
   * the parent engagement. Stamped on insert by the upload routes.
   * Optional on the TS side — legacy rows predate the column.
   */
  subject_kind?: SubjectKind | null;
}

export interface DocumentRequirement {
  id: string;
  category: DocumentCategory;
  display_name: string;
  description: string;
  is_required: boolean;
  weight: number;
  limits_when_missing: string;
  /**
   * Which pathway this requirement applies to (migration 00033). DB
   * column is NOT NULL DEFAULT 'target'. Optional on the TS side for
   * backward compatibility with in-memory fixtures.
   */
  subject_kind?: SubjectKind;
}

export interface PreAnalysis {
  id: string;
  engagement_id: string;
  document_id: string | null;
  analysis_type: PreAnalysisType;
  run_at: string;
  model_used: string;
  prompt_version: string;
  raw_output: Record<string, unknown>;
  extracted_claims: Claim[];
  red_flags: RedFlag[];
  regulatory_signals: RegulatorySignal[];
  inconsistencies_json: Inconsistency[];
  vendor_dependencies: string[];
  model_dependencies: string[];
  open_questions: string[];
  input_token_count: number | null;
  output_token_count: number | null;
  cost_usd: number | null;
  status: PreAnalysisStatus;
  error_message: string | null;
}

export interface Score {
  id: string;
  engagement_id: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  score_0_to_5: number;
  weight: number;
  operator_rationale: string;
  evidence_citations: EvidenceCitation[];
  pattern_match_case_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  /**
   * Denormalised discriminator (migration 00034). Null = inherit from
   * the parent engagement. Enforced at the API layer: a save is
   * rejected when this disagrees with engagements.subject_kind.
   * Optional on the TS side — legacy rows predate the column.
   */
  subject_kind?: SubjectKind | null;
}

export interface BenchmarkCase {
  id: string;
  case_anchor_id: string;
  vertical: string;
  deal_size_band: DealSizeBand;
  ai_architecture_type: AIArchitectureType;
  composite_score: number | null;
  dimension_scores_json: Record<ScoreDimension, number>;
  war_story_summary: string;
  tags: string[];
  created_at: string;
}

export interface PatternMatch {
  id: string;
  engagement_id: string;
  case_anchor_id: string;
  similarity_score: number | null;
  similarity_reason: string;
  operator_confirmed: boolean | null;
  created_at: string;
}

export interface Report {
  id: string;
  engagement_id: string;
  version: number;
  watermark: ReportWatermark | null;
  generated_at: string;
  pdf_storage_path: string | null;
  published_to_client_at: string | null;
  revision_notes: string | null;
  report_data: ReportData;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  engagement_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
}

export interface PromptVersion {
  id: string;
  prompt_key: string;
  version: string;
  model: string;
  system_prompt: string;
  user_prompt_template: string;
  is_active: boolean;
  created_at: string;
  notes: string | null;
}

// ============================================
// Adjustment proposals (evidence layer)
// ============================================

export type AdjustmentSourceKind =
  | 'artifact'
  | 'pre_analysis'
  | 'intake'
  | 'coverage'
  | 'benchmark';

export type AdjustmentStatus =
  | 'proposed'
  | 'approved'
  | 'rejected'
  | 'superseded';

/**
 * Server-authoritative adjustment proposal. Evidence — not the operator —
 * generates these. They DO NOT modify the score until status='approved' and
 * are explicitly applied. Bounds are enforced at the DB level (see
 * supabase/migrations/00016_create_adjustment_proposals.sql).
 */
export interface AdjustmentProposal {
  id: string;
  engagement_id: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  proposed_delta: number;             // [-0.5, +0.5] enforced at DB
  rationale: string;                  // ≥20 chars enforced at DB
  source_kind: AdjustmentSourceKind;
  source_id: string | null;           // document_id / pre_analysis_id / etc.
  evidence_locator: string | null;    // 'p.7' / 'slide 12' / '§4.2'
  classifier: string | null;          // 'architecture' | 'policy' | ...
  confidence: number;                 // [0, 1]
  status: AdjustmentStatus;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface CreateAdjustmentProposalInput {
  engagement_id: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  proposed_delta: number;
  rationale: string;
  source_kind: AdjustmentSourceKind;
  source_id?: string;
  evidence_locator?: string;
  classifier?: string;
  confidence: number;
}

export interface DecideAdjustmentInput {
  decision: 'approve' | 'reject';
  note?: string;
}

// ============================================
// Score history (append-only audit)
// ============================================

export type ScoreChangeSource =
  | 'operator'
  | 'adjustment_approved'
  | 'adjustment_reverted';

export interface ScoreHistoryEntry {
  id: string;
  score_id: string;
  engagement_id: string;
  dimension: ScoreDimension;
  sub_criterion: string;
  prior_value: number | null;
  new_value: number;
  delta: number;
  change_source: ScoreChangeSource;
  adjustment_proposal_id: string | null;
  prior_rationale: string | null;
  new_rationale: string | null;
  changed_by: string;
  changed_at: string;
}

// ============================================
// Evidence confidence (separate from score)
// ============================================

export interface EvidenceConfidence {
  engagement_id: string;
  coverage_completeness: number;  // [0, 1]
  source_quality: number;         // [0, 1]
  recency: number;                // [0, 1]
  consistency: number;            // [0, 1]
  composite: number;              // [0, 1]
  inputs_hash: string;
  computed_at: string;
}

// ============================================
// Nested / structured types
// ============================================

export interface Claim {
  claim: string;
  source_doc: string;
  source_location: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface RedFlag {
  flag: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dimension: ScoreDimension;
  evidence: string;
}

export interface RegulatorySignal {
  regulation: string;
  relevance: string;
  exposure_level: string;
}

export interface Inconsistency {
  claim_a: string;
  claim_b: string;
  sources: string[];
  interpretation: string;
}

export interface EvidenceCitation {
  document_id: string;
  filename: string;
  location: string;
  excerpt: string;
}

export interface ReportData {
  executive_summary?: string;
  composite_score?: number;
  conviction_statement?: string;
  headline_bullets?: string[];
  dimension_scores?: Record<ScoreDimension, number>;
  key_findings?: KeyFinding[];
  red_flags?: RedFlag[];
  regulatory_exposure?: RegulatorySignal[];
  open_validation_areas?: string[];
  document_inventory?: { category: string; filename: string; provided: boolean }[];
  limitations?: string[];
  methodology_note?: string;
}

export interface KeyFinding {
  finding: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
  implication: string;
}

// ============================================
// Form / input types
// ============================================

export interface CreateEngagementInput {
  client_firm_name: string;
  target_company_name: string;
  deal_stage: DealStage;
  tier: EngagementTier;
  client_contact_email?: string;
  engagement_fee?: number;
  delivery_deadline?: string;
  referral_source?: ReferralSource;
  /**
   * AI Category Diligence additions (Phase 2, migration 00032 / 00035).
   * All optional — omitting them yields the classic target-mode flow.
   * When subject_kind === 'category', callers SHOULD also provide
   * category_profile so the sibling profile row is written atomically.
   */
  subject_kind?: SubjectKind;
  subject_label?: string;
  category_profile?: {
    category_slug: string;
    category_name: string;
    thesis?: string | null;
    time_horizon_months?: number | null;
    peer_categories?: string[];
    screening_criteria?: Record<string, unknown>;
  };
}

export interface UpdateScoreInput {
  score_0_to_5: number;
  operator_rationale: string;
  evidence_citations: EvidenceCitation[];
  pattern_match_case_id?: string;
}

// ============================================
// Coverage matrix
// ============================================

export interface CoverageItem {
  requirement: DocumentRequirement;
  documents: Document[];
  status: 'provided' | 'missing' | 'partial';
}

// ============================================
// Dimension config
// ============================================

export interface DimensionConfig {
  key: ScoreDimension;
  name: string;
  weight: number;
  sub_criteria: SubCriterion[];
}

export interface ScoreBand {
  max: number;
  label: string;
  description: string;
}

export interface SubCriterion {
  key: string;
  name: string;
  description: string;
  score_bands?: ScoreBand[];
}

// ============================================
// Market Intelligence (MI) pathway types
// ============================================

/**
 * The 7 dimensions of the MI scoring rubric.
 * Entirely separate from ScoreDimension (company pathway).
 * Backed by mi_scores.dimension (migration 00046).
 */
export type MiDimension =
  | 'thesis_durability'
  | 'category_attractiveness'
  | 'competitive_defensibility'
  | 'timing_confidence'
  | 'threat_concentration'
  | 'evidence_strength'
  | 'signal_noise_ratio';

export type MiEvidenceSourceType =
  | 'market_report'
  | 'funding_data'
  | 'regulatory'
  | 'customer_signal'
  | 'talent_signal'
  | 'incumbent_signal'
  | 'expert_interview'
  | 'other';

export type MiInsightType =
  | 'pressure_test'
  | 'structure_map'
  | 'threat_model'
  | 'company_shortlist'
  | 'gap_map'
  | 'adjacent_category'
  | 'timing_read'
  | 'positioning';

export type MiAssumptionStatus =
  | 'unverified'
  | 'supported'
  | 'weakened'
  | 'contradicted';

export type MiLinkType = 'supports' | 'weakens' | 'contradicts';

export type MiIntakeStatus = 'draft' | 'confirmed';

// ── MI Intake ──────────────────────────────────────────────────────────────

export interface MiIntakeQuestion {
  id: string;
  category:
    | 'thesis_assumptions'
    | 'market_structure'
    | 'incumbent_threat_model'
    | 'technology_maturity'
    | 'regulatory_risk'
    | 'capital_dynamics'
    | 'customer_behavior'
    | 'exit_landscape';
  question: string;
  guidance_note?: string;
  answer?: string;
  is_editable: boolean;
  is_required?: boolean;
}

export interface MiIntakeQuestionSet {
  id: string;
  engagement_id: string;
  questions: MiIntakeQuestion[];
  generated_by_model: string | null;
  generated_at: string | null;
  confirmed_at: string | null;
  status: MiIntakeStatus;
  created_at: string;
  updated_at: string;
}

// ── MI Thesis Assumptions ──────────────────────────────────────────────────

export interface MiThesisAssumption {
  id: string;
  engagement_id: string;
  assumption_text: string;
  assumption_category: string;
  evidence_status: MiAssumptionStatus;
  load_bearing_score: number | null;   // [0, 1]
  evidence_type_needed: string | null;
  ordering: number;
  created_at: string;
  updated_at: string;
}

// ── MI Evidence ────────────────────────────────────────────────────────────

export interface MiEvidenceItem {
  id: string;
  engagement_id: string;
  source_type: MiEvidenceSourceType;
  source_name: string;
  source_url: string | null;
  excerpt: string | null;
  full_text: string | null;
  storage_path: string | null;
  recency_date: string | null;        // ISO date string
  confidence: 'high' | 'medium' | 'low';
  created_at: string;
  created_by: string | null;
}

export interface MiEvidenceLink {
  id: string;
  evidence_id: string;
  assumption_id: string;
  link_type: MiLinkType;
  operator_note: string | null;
  created_at: string;
}

// ── MI Insights ────────────────────────────────────────────────────────────

export interface MiInsight {
  id: string;
  engagement_id: string;
  insight_type: MiInsightType;
  content: Record<string, unknown>;          // Schema varies per insight_type
  raw_llm_output: string | null;
  generated_by_model: string | null;
  generated_at: string;
  user_edited_at: string | null;
  user_edited_content: Record<string, unknown> | null;
}

// ── MI Scores ──────────────────────────────────────────────────────────────

export interface MiScore {
  id: string;
  engagement_id: string;
  dimension: MiDimension;
  score_0_to_5: number;
  llm_justification: string | null;
  operator_override: boolean;
  operator_rationale: string | null;
  generated_by_model: string | null;
  generated_at: string | null;
  updated_at: string;
}

// ── MI Shortlist ───────────────────────────────────────────────────────────

export interface MiShortlistCompany {
  id: string;
  engagement_id: string;
  company_name: string;
  rationale: string | null;
  signal_summary: string | null;
  source_urls: string[];
  website_url: string | null;
  promoted_to_engagement_id: string | null;
  created_at: string;
  created_by: string | null;
}

// ── MI Reports ─────────────────────────────────────────────────────────────

export interface MiReport {
  id: string;
  engagement_id: string;
  version: number;
  content_markdown: string | null;
  section_status: Record<string, 'pending' | 'generating' | 'done' | 'error'>;
  tier_depth: string | null;
  generated_at: string;
}

// ── MI Rubric Config ───────────────────────────────────────────────────────

export interface MiRubricSubCriterion {
  id: string;
  label: string;
  description: string;
  weight: number;
}

export interface MiRubricDimension {
  dimension: MiDimension;
  label: string;
  description: string;
  sub_criteria: MiRubricSubCriterion[];
  weight: number;
  ordering: number;
}
