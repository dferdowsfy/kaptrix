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
}

export interface DocumentRequirement {
  id: string;
  category: DocumentCategory;
  display_name: string;
  description: string;
  is_required: boolean;
  weight: number;
  limits_when_missing: string;
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

export interface SubCriterion {
  key: string;
  name: string;
  description: string;
}
