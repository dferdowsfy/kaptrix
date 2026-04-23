// Market Intelligence — typed JSONB schemas for each insight_type.
// These mirror the structures stored in mi_insights.content and
// mi_insights.user_edited_content.

export interface PressureTestContent {
  assumptions_holding: { text: string; evidence_summary: string }[];
  assumptions_weak: { text: string; weakness_reason: string }[];
  assumptions_contradicted: { text: string; contradiction_evidence: string }[];
  overall_conviction: "high" | "medium" | "low";
  conviction_rationale: string;
}

export interface StructureMapContent {
  horizontal_plays: { company_archetype: string; examples: string[]; rationale: string }[];
  vertical_plays: { vertical: string; examples: string[]; rationale: string }[];
  infra_vs_application: {
    infra_players: string[];
    application_players: string[];
    picks_and_shovels: string[];
  };
  consolidation_signals: string[];
  category_summary: string;
}

export interface ThreatModelContent {
  fm_provider_threats: {
    provider: string;
    capability: string;
    timeline_estimate: string;
    affected_value_chain: string;
    severity: "high" | "medium" | "low";
  }[];
  incumbent_saas_threats: {
    vendor: string;
    native_feature: string;
    announced_or_shipped: boolean;
    displacement_risk: "high" | "medium" | "low";
  }[];
  commoditization_vectors: {
    vector: string;
    timeline: string;
    which_players_affected: string;
  }[];
  open_source_risk: string;
  overall_threat_level: "high" | "medium" | "low";
}

export interface CompanyShortlistContent {
  companies: {
    name: string;
    sub_segment: string;
    signal_summary: string;
    why_interesting: string;
    watch_out: string;
    website_url?: string;
  }[];
  screening_note: string;
}

export interface GapMapContent {
  evidence_gaps: {
    assumption_text: string;
    gap_description: string;
    evidence_type_needed: string;
    impact_if_resolved: "thesis_strengthened" | "thesis_weakened" | "unclear";
  }[];
  data_room_gaps: string[];
  recommended_diligence_actions: string[];
}

export interface AdjacentCategoryContent {
  adjacent_categories: {
    name: string;
    relationship: string;
    read_through: string;
    relevance: "high" | "medium" | "low";
  }[];
  peer_category_comparisons: {
    peer_category: string;
    key_difference: string;
    implication_for_thesis: string;
  }[];
}

export interface TimingReadContent {
  hype_cycle_position:
    | "pre_peak"
    | "peak_hype"
    | "trough"
    | "slope_of_enlightenment"
    | "plateau";
  hype_cycle_rationale: string;
  adoption_timeline: string;
  leading_indicators_positive: string[];
  leading_indicators_negative: string[];
  why_now_assessment: "evidenced" | "partially_evidenced" | "asserted";
  why_now_rationale: string;
  time_horizon_fit: "well_aligned" | "too_early" | "too_late";
}

export type MiInsightContent =
  | PressureTestContent
  | StructureMapContent
  | ThreatModelContent
  | CompanyShortlistContent
  | GapMapContent
  | AdjacentCategoryContent
  | TimingReadContent;
