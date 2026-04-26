// Preview → engine adapter.
//
// Converts the preview workspace's existing context (intake payload,
// uploaded documents, extracted insights, pre-analysis payload) into
// the structured inputs the deterministic scoring engine expects.
//
// The adapter is PURE and environment-agnostic — no localStorage, no
// network. Callers (client components) read these sources from their
// own stores and hand them in.

import type { ScoreDimension } from "@/lib/types";
import type {
  CoveragePayload,
  IntakePayload,
  PositioningPayload,
  PreAnalysisPayload,
} from "@/lib/preview/kb-format";
import type { UploadedDoc } from "@/lib/preview/uploaded-docs";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import type {
  ArtifactEvidence,
  IntakeResponse,
  ScoringEngineInput,
} from "@/lib/scoring/engine-types";

// ── Intake payload → IntakeResponse[] ────────────────────────────────

/**
 * Flatten the structured intake payload into canonical-field
 * IntakeResponses that the engine's intake rule table keys on. Only
 * fields with values are emitted — empty strings / empty arrays /
 * nulls are omitted so the engine treats them as "not answered"
 * rather than as a negative signal.
 */
export function intakePayloadToResponses(
  p: IntakePayload | null | undefined,
): IntakeResponse[] {
  if (!p) return [];
  const out: IntakeResponse[] = [];

  const pushIfString = (field: string, v: string | undefined) => {
    if (typeof v === "string" && v.trim().length > 0) {
      out.push({ field, value: v.trim() });
    }
  };
  const pushIfArray = (field: string, v: string[] | undefined) => {
    if (Array.isArray(v) && v.length > 0) {
      out.push({ field, value: v });
    }
  };

  pushIfArray("regulatory_exposure", p.regulatory_exposure);
  pushIfArray("diligence_priorities", p.diligence_priorities);
  pushIfArray("red_flag_priors", p.red_flag_priors);
  pushIfArray("deal_thesis", p.deal_thesis);
  pushIfArray("dissenting_voices", p.dissenting_voices);
  pushIfArray("primary_kpi", p.primary_kpi);
  pushIfArray("alternatives_considered", p.alternatives_considered);
  pushIfArray("existing_ai_systems", p.existing_ai_systems);
  pushIfArray("training_data_sources", p.training_data_sources);
  pushIfArray("artifacts_received", p.artifacts_received);
  pushIfArray("diligence_team_composition", p.diligence_team_composition);

  pushIfString("engagement_type", p.engagement_type);
  pushIfString("buyer_archetype", p.buyer_archetype);
  pushIfString("buyer_industry", p.buyer_industry);
  pushIfString("target_size_usd", p.target_size_usd);
  pushIfString("investment_size_usd", p.investment_size_usd);
  pushIfString("annual_run_rate_usd", p.annual_run_rate_usd);
  pushIfString("decision_horizon_days", p.decision_horizon_days);
  pushIfString("deal_stage", p.deal_stage);
  pushIfString("internal_sponsor_role", p.internal_sponsor_role);
  pushIfString("approval_path", p.approval_path);
  pushIfString("measurable_targets", p.measurable_targets);
  pushIfString("kill_criteria", p.kill_criteria);
  pushIfString("alternatives_detail", p.alternatives_detail);
  pushIfString("lock_in_tolerance", p.lock_in_tolerance);
  pushIfString("data_readiness", p.data_readiness);
  pushIfString("customer_data_usage_rights", p.customer_data_usage_rights);
  pushIfString("ip_indemnification_needed", p.ip_indemnification_needed);
  pushIfString(
    "business_continuity_requirement",
    p.business_continuity_requirement,
  );
  pushIfString("multi_region_requirement", p.multi_region_requirement);
  pushIfString("gaps_already_known", p.gaps_already_known);
  pushIfString("context_notes", p.context_notes);

  return out;
}

// ── Document categories → sub-criterion mapping ──────────────────────
//
// Each uploaded document category maps to one or more sub-criteria it
// provides evidence for. Presence of a parsed document in a category
// emits `supports_high` artifacts for the mapped sub-criteria — the
// engine then validates intake claims and unlocks the ≥4 band.

const CATEGORY_TO_SUBS: Record<
  string,
  Array<{ dimension: ScoreDimension; sub_criterion: string }>
> = {
  // ── Universal artifacts (every industry) ────────────────────────────
  security: [
    { dimension: "governance_safety", sub_criterion: "access_controls" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
  ],
  architecture: [
    { dimension: "tooling_exposure", sub_criterion: "model_concentration" },
    { dimension: "tooling_exposure", sub_criterion: "api_brittleness" },
    { dimension: "production_readiness", sub_criterion: "scaling" },
  ],
  model_ai: [
    { dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" },
    { dimension: "data_sensitivity", sub_criterion: "training_provenance" },
    { dimension: "governance_safety", sub_criterion: "output_risk" },
  ],
  data_privacy: [
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
  ],
  customer_contracts: [
    { dimension: "product_credibility", sub_criterion: "customer_vs_claimed" },
    { dimension: "tooling_exposure", sub_criterion: "switching_cost" },
  ],
  vendor_list: [
    { dimension: "tooling_exposure", sub_criterion: "switching_cost" },
    { dimension: "tooling_exposure", sub_criterion: "model_concentration" },
  ],
  financial: [
    { dimension: "production_readiness", sub_criterion: "cost_per_inference" },
    { dimension: "production_readiness", sub_criterion: "ai_unit_economics" },
  ],
  incident_log: [
    { dimension: "production_readiness", sub_criterion: "incident_response" },
    { dimension: "production_readiness", sub_criterion: "model_drift" },
  ],
  team_bios: [
    { dimension: "open_validation", sub_criterion: "specialist_review" },
  ],
  demo: [
    { dimension: "product_credibility", sub_criterion: "demo_production_gap" },
  ],
  deck: [
    { dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" },
    { dimension: "product_credibility", sub_criterion: "differentiation" },
  ],
  // ── Financial services ──────────────────────────────────────────────
  model_risk: [
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
    { dimension: "open_validation", sub_criterion: "specialist_review" },
  ],
  sox_controls: [
    { dimension: "governance_safety", sub_criterion: "access_controls" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
  ],
  kyc_aml: [
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
  ],
  // ── Healthcare ──────────────────────────────────────────────────────
  hipaa: [
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
    { dimension: "governance_safety", sub_criterion: "access_controls" },
  ],
  fda_classification: [
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
    { dimension: "open_validation", sub_criterion: "specialist_review" },
  ],
  bias_evaluation: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "open_validation", sub_criterion: "specialist_review" },
  ],
  // ── Legal tech ──────────────────────────────────────────────────────
  privilege_handling: [
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
    { dimension: "governance_safety", sub_criterion: "access_controls" },
  ],
  citation_audit: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
    { dimension: "product_credibility", sub_criterion: "ai_value_vs_wrapper" },
  ],
  // ── Enterprise SaaS ─────────────────────────────────────────────────
  enterprise_readiness: [
    { dimension: "governance_safety", sub_criterion: "access_controls" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
    { dimension: "production_readiness", sub_criterion: "scaling" },
  ],
  prompt_injection: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "open_validation", sub_criterion: "technical_debt" },
  ],
  // ── Insurance ───────────────────────────────────────────────────────
  nydfs_circular: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
  ],
  adverse_action: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
  ],
  // ── Retail / eCommerce ──────────────────────────────────────────────
  ad_substantiation: [
    { dimension: "governance_safety", sub_criterion: "output_risk" },
    { dimension: "governance_safety", sub_criterion: "human_in_loop" },
  ],
  // ── Government / defense ────────────────────────────────────────────
  fedramp: [
    { dimension: "governance_safety", sub_criterion: "access_controls" },
    { dimension: "governance_safety", sub_criterion: "logging_observability" },
    { dimension: "data_sensitivity", sub_criterion: "regulated_data" },
  ],
  sbom: [
    { dimension: "tooling_exposure", sub_criterion: "model_concentration" },
    { dimension: "open_validation", sub_criterion: "technical_debt" },
  ],
  // ── Industrial / IoT ────────────────────────────────────────────────
  ot_segmentation: [
    { dimension: "data_sensitivity", sub_criterion: "customer_isolation" },
    { dimension: "governance_safety", sub_criterion: "access_controls" },
  ],
};

// Track categories we've already warned about so a deck of 50 docs doesn't
// flood the console. Module-scope: cleared on next reload.
const warnedUnmappedCategories = new Set<string>();

function docArtifacts(docs: readonly UploadedDoc[]): ArtifactEvidence[] {
  const out: ArtifactEvidence[] = [];
  for (const d of docs) {
    if (d.parse_status !== "parsed") continue;
    const targets = CATEGORY_TO_SUBS[d.category];
    if (!targets) {
      // Surface this so operators notice when an industry-specific or
      // user-typed `custom_*` category falls through the engine without
      // contributing evidence to any sub-criterion.
      if (
        process.env.NODE_ENV !== "production" &&
        !warnedUnmappedCategories.has(d.category)
      ) {
        warnedUnmappedCategories.add(d.category);
        console.warn(
          `[scoring-engine] No CATEGORY_TO_SUBS mapping for category "${d.category}" — uploaded doc "${d.filename}" will not produce engine artifacts. Add a mapping in src/lib/scoring/engine-preview-adapter.ts.`,
        );
      }
      continue;
    }
    for (const t of targets) {
      out.push({
        id: `doc:${d.id}:${t.sub_criterion}`,
        kind: "document",
        dimension: t.dimension,
        sub_criterion: t.sub_criterion,
        signal: "supports_high",
        claim: `Parsed ${d.category} artifact provided: ${d.filename}`,
      });
    }
  }
  return out;
}

// ── Extracted insights → artifacts ───────────────────────────────────
//
// High-confidence insights become `supports_mid` evidence on the most
// relevant sub-criterion for their category (they validate the intake
// position but don't by themselves prove a high band). Low-confidence
// insights are ignored to keep the engine noise floor clean.

const INSIGHT_CATEGORY_TO_SUB: Record<
  KnowledgeInsight["category"],
  { dimension: ScoreDimension; sub_criterion: string }
> = {
  commercial: {
    dimension: "product_credibility",
    sub_criterion: "customer_vs_claimed",
  },
  technical: {
    dimension: "product_credibility",
    sub_criterion: "ai_value_vs_wrapper",
  },
  regulatory: {
    dimension: "data_sensitivity",
    sub_criterion: "regulated_data",
  },
  financial: {
    dimension: "production_readiness",
    sub_criterion: "cost_per_inference",
  },
  operational: {
    dimension: "production_readiness",
    sub_criterion: "scaling",
  },
};

function insightArtifacts(
  insights: readonly KnowledgeInsight[],
): ArtifactEvidence[] {
  const out: ArtifactEvidence[] = [];
  for (const i of insights) {
    if (i.confidence === "low") continue;
    const t = INSIGHT_CATEGORY_TO_SUB[i.category];
    if (!t) continue;
    out.push({
      id: `insight:${i.id}`,
      kind: "insight",
      dimension: t.dimension,
      sub_criterion: t.sub_criterion,
      signal: i.confidence === "high" ? "supports_high" : "supports_mid",
      claim: i.insight,
      locator: i.source_document,
    });
  }
  return out;
}

// ── Pre-analysis red flags → artifacts ───────────────────────────────
//
// Pre-analysis flags are dimension-tagged already; we map each flag to
// a canonical sub-criterion per dimension. Critical and high flags are
// `supports_low` (evidence the target sits in the 1–2 band).

const DIMENSION_PRIMARY_SUB: Record<ScoreDimension, string> = {
  product_credibility: "customer_vs_claimed",
  tooling_exposure: "api_brittleness",
  data_sensitivity: "regulated_data",
  governance_safety: "output_risk",
  production_readiness: "incident_response",
  open_validation: "known_unknowns",
};

function preAnalysisArtifacts(
  p: PreAnalysisPayload | null | undefined,
): ArtifactEvidence[] {
  if (!p) return [];
  const out: ArtifactEvidence[] = [];
  const push = (
    flag: { flag: string; dimension: ScoreDimension | null },
    severity: "critical" | "high",
    idx: number,
  ) => {
    if (!flag.dimension) return;
    const sub =
      DIMENSION_PRIMARY_SUB[flag.dimension] ??
      "known_unknowns";
    out.push({
      id: `preanalysis:${severity}:${idx}`,
      kind: "pre_analysis",
      dimension: flag.dimension,
      sub_criterion: sub,
      signal: "supports_low",
      claim: `${severity === "critical" ? "Critical" : "High"} red flag: ${flag.flag}`,
    });
  };
  p.critical_red_flags.forEach((f, i) => push(f, "critical", i));
  p.high_red_flags.forEach((f, i) => push(f, "high", i));
  return out;
}

// ── Coverage payload → artifacts ─────────────────────────────────────
//
// The coverage submission is the operator's own count of "do we have
// enough evidence yet?". It feeds the open_validation dimension
// directly:
//   - lots of recorded gaps → the target sits in the low band (gaps
//     are concrete unknowns the team has not yet resolved)
//   - zero gaps with at least three artifacts in evidence → the team
//     has done the work; emit a high signal
// Each individual gap summary is also emitted as its own low signal so
// it shows up in the engine's evidence trail.

function coverageArtifacts(
  c: CoveragePayload | null | undefined,
): ArtifactEvidence[] {
  if (!c) return [];
  const out: ArtifactEvidence[] = [];

  if (c.gaps_count >= 5) {
    out.push({
      id: "coverage:gaps_high",
      kind: "coverage",
      dimension: "open_validation",
      sub_criterion: "known_unknowns",
      signal: "supports_low",
      claim: `Coverage review recorded ${c.gaps_count} unfilled evidence gaps.`,
    });
  } else if (c.gaps_count === 0 && c.documents_total >= 3) {
    out.push({
      id: "coverage:gaps_clean",
      kind: "coverage",
      dimension: "open_validation",
      sub_criterion: "specialist_review",
      signal: "supports_high",
      claim: `Coverage review complete with no remaining gaps and ${c.documents_total} artifacts in evidence.`,
    });
  }

  c.gap_summaries.forEach((summary, idx) => {
    if (!summary || !summary.trim()) return;
    out.push({
      id: `coverage:gap:${idx}`,
      kind: "coverage",
      dimension: "open_validation",
      sub_criterion: "known_unknowns",
      signal: "supports_low",
      claim: summary.trim(),
    });
  });

  return out;
}

// ── Positioning payload → artifacts ──────────────────────────────────
//
// Positioning captures how the target compares to known peers + how
// confident the operator is in that read. We map:
//   - high confidence → product_credibility supports_high
//   - low confidence  → product_credibility supports_low
//   - each validation_priority → open_validation supports_low
//   - >=3 comparables identified → product_credibility supports_mid

function positioningArtifacts(
  p: PositioningPayload | null | undefined,
): ArtifactEvidence[] {
  if (!p) return [];
  const out: ArtifactEvidence[] = [];

  if (p.confidence === "high" && p.positioning_summary?.trim()) {
    out.push({
      id: "positioning:high_confidence",
      kind: "insight",
      dimension: "product_credibility",
      sub_criterion: "ai_value_vs_wrapper",
      signal: "supports_high",
      claim: `High-confidence positioning read: ${p.positioning_summary.trim().slice(0, 240)}`,
    });
  } else if (p.confidence === "low") {
    out.push({
      id: "positioning:low_confidence",
      kind: "insight",
      dimension: "product_credibility",
      sub_criterion: "ai_value_vs_wrapper",
      signal: "supports_low",
      claim: `Low-confidence positioning: ${(p.confidence_rationale || "rationale pending").trim().slice(0, 240)}`,
    });
  }

  p.validation_priorities.forEach((pri, idx) => {
    if (!pri || !pri.trim()) return;
    out.push({
      id: `positioning:priority:${idx}`,
      kind: "insight",
      dimension: "open_validation",
      sub_criterion: "known_unknowns",
      signal: "supports_low",
      claim: `Positioning validation priority: ${pri.trim()}`,
    });
  });

  if (p.comparables.length >= 3) {
    const names = p.comparables
      .slice(0, 4)
      .map((c) => c.name)
      .filter(Boolean)
      .join(", ");
    out.push({
      id: "positioning:comparables",
      kind: "insight",
      dimension: "product_credibility",
      sub_criterion: "customer_vs_claimed",
      signal: "supports_mid",
      claim: `${p.comparables.length} comparable(s) identified${names ? `: ${names}` : ""}.`,
    });
  }

  return out;
}

// ── Top-level adapter ────────────────────────────────────────────────

export interface PreviewEngineInputSources {
  intake?: IntakePayload | null;
  coverage?: CoveragePayload | null;
  preAnalysis?: PreAnalysisPayload | null;
  positioning?: PositioningPayload | null;
  uploadedDocs?: readonly UploadedDoc[];
  extractedInsights?: readonly KnowledgeInsight[];
}

export function buildEngineInputFromPreview(
  sources: PreviewEngineInputSources,
): ScoringEngineInput {
  const intake = intakePayloadToResponses(sources.intake);
  const artifacts: ArtifactEvidence[] = [
    ...docArtifacts(sources.uploadedDocs ?? []),
    ...insightArtifacts(sources.extractedInsights ?? []),
    ...coverageArtifacts(sources.coverage),
    ...positioningArtifacts(sources.positioning),
    ...preAnalysisArtifacts(sources.preAnalysis),
  ];
  return { intake, artifacts };
}
