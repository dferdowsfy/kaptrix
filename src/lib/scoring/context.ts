import type { ScoreDimension } from "@/lib/types";
import {
  KNOWLEDGE_STEP_LABELS,
  type InsightsPayload,
  type IntakePayload,
  type CoveragePayload,
  type KnowledgeEntry,
  type KnowledgeStep,
  type PreAnalysisPayload,
} from "@/lib/preview/knowledge-base";
import { SCORING_DIMENSIONS } from "@/lib/constants";

// ------------------------------------------------------------------
// Context signals derived from the knowledge base.
//
// ⚠️  PREVIEW / NON-AUTHORITATIVE.
//
// This module powers the marketing-surface preview only. It computes
// dimension deltas client-side from a localStorage-backed knowledge
// base and is therefore not deterministic across clients and not
// auditable.
//
// The PRODUCTION scoring path uses:
//   - src/lib/scoring/adjustments.ts  (bounds, apply rules)
//   - /api/adjustments               (operator-approved proposals)
//   - /api/scores/final              (server-authoritative composite)
//   - /api/confidence                (separate confidence layer)
//
// Do NOT introduce new callers of `deriveContextSignals` /
// `aggregateContextAdjustment` outside the preview surface.
// ------------------------------------------------------------------

export interface ContextSignal {
  dimension: ScoreDimension;
  delta: number; // negative = downward pressure
  reason: string;
  source: KnowledgeStep;
}

export interface ContextAdjustment {
  signals: ContextSignal[];
  /** Net per-dimension deltas after clamping. */
  dimension_delta: Record<ScoreDimension, number>;
  /** Overall composite delta after applying weights and clamp. */
  composite_delta: number;
}

const PER_DIM_UP_CAP = 0.3;
const PER_DIM_DOWN_CAP = -0.75;
const COMPOSITE_CAP = 0.5;

const EMPTY_DIM_DELTAS: Record<ScoreDimension, number> = {
  product_credibility: 0,
  tooling_exposure: 0,
  data_sensitivity: 0,
  governance_safety: 0,
  production_readiness: 0,
  open_validation: 0,
};

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function intakeSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "intake") return [];
  const p = entry.payload as IntakePayload;
  const out: ContextSignal[] = [];

  // ── Regulatory / legacy signals ────────────────────────────────
  const materialRegulatory = p.regulatory_exposure.filter(
    (r) => !/^none/i.test(r),
  );
  if (materialRegulatory.length > 0) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.1 * Math.min(3, materialRegulatory.length),
      reason: `Client flagged regulatory exposure: ${materialRegulatory
        .slice(0, 2)
        .join(", ")}${materialRegulatory.length > 2 ? "…" : ""}`,
      source: "intake",
    });
  }
  if (p.red_flag_priors.length > 0) {
    out.push({
      dimension: "open_validation",
      delta: -0.1 * Math.min(3, p.red_flag_priors.length),
      reason: `Prior red-flag concerns carried from intake (${p.red_flag_priors.length})`,
      source: "intake",
    });
  }
  if (p.diligence_priorities.some((d) => /vendor|lock|model/i.test(d))) {
    out.push({
      dimension: "tooling_exposure",
      delta: -0.15,
      reason: "Client prioritized vendor / model lock-in scrutiny",
      source: "intake",
    });
  }

  // ── Data rights & IP posture ───────────────────────────────────
  const dataRights = p.customer_data_usage_rights ?? "";
  if (/ambiguous|not documented/i.test(dataRights)) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.15,
      reason: "Customer data usage rights are ambiguous / undocumented",
      source: "intake",
    });
    out.push({
      dimension: "governance_safety",
      delta: -0.1,
      reason: "Ambiguous data rights elevate governance burden",
      source: "intake",
    });
  }
  if (/per-tenant isolation|excluded from training|explicit opt-in/i.test(dataRights)) {
    out.push({
      dimension: "data_sensitivity",
      delta: 0.05,
      reason: "Disciplined customer data handling (isolation / opt-in / exclusion)",
      source: "intake",
    });
  }

  const trainingSources = p.training_data_sources ?? [];
  if (trainingSources.some((s) => /public web scraping|unknown/i.test(s))) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.1,
      reason: "Training data sources include public scrape or undocumented origin",
      source: "intake",
    });
    out.push({
      dimension: "open_validation",
      delta: -0.05,
      reason: "Training-data provenance requires validation",
      source: "intake",
    });
  }

  if (p.ip_indemnification_needed && /^required/i.test(p.ip_indemnification_needed)) {
    out.push({
      dimension: "governance_safety",
      delta: -0.05,
      reason: "Client requires IP indemnification — heightened governance bar",
      source: "intake",
    });
  }

  // ── Operational resilience ─────────────────────────────────────
  const bcr = p.business_continuity_requirement ?? "";
  if (/seconds|minutes/i.test(bcr)) {
    out.push({
      dimension: "production_readiness",
      delta: -0.1,
      reason: `Tight uptime requirement (${bcr}) raises the production bar`,
      source: "intake",
    });
  }
  const mrr = p.multi_region_requirement ?? "";
  if (mrr && !/us-only|not applicable/i.test(mrr)) {
    out.push({
      dimension: "production_readiness",
      delta: -0.05,
      reason: `Multi-region / residency requirement: ${mrr}`,
      source: "intake",
    });
  }

  // ── Buyer-side readiness ───────────────────────────────────────
  const dataReadiness = p.data_readiness ?? "";
  if (/no central data platform|siloed/i.test(dataReadiness)) {
    out.push({
      dimension: "production_readiness",
      delta: -0.15,
      reason: "Buyer-side data platform is siloed — integration risk",
      source: "intake",
    });
  } else if (/partial data lake/i.test(dataReadiness)) {
    out.push({
      dimension: "production_readiness",
      delta: -0.05,
      reason: "Buyer-side data platform is partial — integration friction",
      source: "intake",
    });
  }

  // ── Vendor exposure ────────────────────────────────────────────
  const lockIn = p.lock_in_tolerance ?? "";
  if (/must avoid all lock-in/i.test(lockIn)) {
    out.push({
      dimension: "tooling_exposure",
      delta: -0.15,
      reason: "Client has zero tolerance for vendor / model lock-in",
      source: "intake",
    });
  }

  // ── Decision discipline ────────────────────────────────────────
  if (!p.kill_criteria || p.kill_criteria.trim().length === 0) {
    out.push({
      dimension: "open_validation",
      delta: -0.05,
      reason: "No explicit kill criteria defined",
      source: "intake",
    });
  }
  if (
    (p.alternatives_considered ?? []).length === 0 &&
    !p.alternatives_detail
  ) {
    out.push({
      dimension: "open_validation",
      delta: -0.05,
      reason: "No alternatives or incumbents weighed against this choice",
      source: "intake",
    });
  }

  // ── Artifact posture — what's already in hand ──────────────────
  const artifacts = (p.artifacts_received ?? []).map((a) => a.toLowerCase());
  const hasSoc2 = artifacts.some((a) => /soc 2|iso 27001/.test(a));
  const hasModelDoc = artifacts.some((a) => /model \/ ai system documentation/.test(a));
  const hasBenchmarks = artifacts.some((a) => /benchmark|evaluation/.test(a));
  const hasArch = artifacts.some((a) => /architecture documentation/.test(a));

  if (hasSoc2) {
    out.push({
      dimension: "governance_safety",
      delta: 0.05,
      reason: "SOC 2 / ISO 27001 artifact already in hand",
      source: "intake",
    });
  }
  if (hasModelDoc) {
    out.push({
      dimension: "product_credibility",
      delta: 0.05,
      reason: "Model / AI system documentation provided up front",
      source: "intake",
    });
  }
  if (hasBenchmarks) {
    out.push({
      dimension: "product_credibility",
      delta: 0.05,
      reason: "Benchmark / evaluation results provided",
      source: "intake",
    });
  }
  if (!hasArch && !hasModelDoc) {
    out.push({
      dimension: "open_validation",
      delta: -0.1,
      reason: "No architecture or model documentation received yet",
      source: "intake",
    });
  }
  if (!hasSoc2 && materialRegulatory.length > 0) {
    out.push({
      dimension: "governance_safety",
      delta: -0.1,
      reason: "Regulated deal with no SOC 2 / ISO artifact yet",
      source: "intake",
    });
  }

  return out;
}

function coverageSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "coverage") return [];
  const p = entry.payload as CoveragePayload;
  const out: ContextSignal[] = [];

  if (p.gaps_count >= 3) {
    out.push({
      dimension: "open_validation",
      delta: -0.2 - Math.min(0.3, 0.05 * (p.gaps_count - 3)),
      reason: `${p.gaps_count} coverage gaps vs. industry expectations`,
      source: "coverage",
    });
  } else if (p.gaps_count === 0 && p.documents_total >= 6) {
    out.push({
      dimension: "open_validation",
      delta: 0.1,
      reason: "Coverage complete with substantial evidence base",
      source: "coverage",
    });
  }
  return out;
}

function insightsSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "insights") return [];
  const p = entry.payload as InsightsPayload;
  const out: ContextSignal[] = [];

  const regulatory = p.by_category["regulatory"] ?? 0;
  const technical = p.by_category["technical"] ?? 0;
  if (regulatory > 0) {
    out.push({
      dimension: "data_sensitivity",
      delta: -0.05 * Math.min(4, regulatory),
      reason: `${regulatory} regulatory-category insight(s) surfaced`,
      source: "insights",
    });
  }
  if (technical > 0 && p.high_confidence_count > 0) {
    out.push({
      dimension: "product_credibility",
      delta: 0.05 * Math.min(3, p.high_confidence_count),
      reason: `${p.high_confidence_count} high-confidence technical insight(s)`,
      source: "insights",
    });
  }
  return out;
}

function preAnalysisSignals(entry: KnowledgeEntry): ContextSignal[] {
  if (entry.payload.kind !== "pre_analysis") return [];
  const p = entry.payload as PreAnalysisPayload;
  const out: ContextSignal[] = [];

  for (const flag of p.critical_red_flags) {
    if (!flag.dimension) continue;
    out.push({
      dimension: flag.dimension,
      delta: -0.2,
      reason: `Critical red flag: ${flag.flag}`,
      source: "pre_analysis",
    });
  }
  for (const flag of p.high_red_flags) {
    if (!flag.dimension) continue;
    out.push({
      dimension: flag.dimension,
      delta: -0.1,
      reason: `High-severity red flag: ${flag.flag}`,
      source: "pre_analysis",
    });
  }
  if (p.open_questions_total >= 5) {
    out.push({
      dimension: "open_validation",
      delta: -0.1,
      reason: `${p.open_questions_total} open questions remain from pre-analysis`,
      source: "pre_analysis",
    });
  }
  if (p.critical_red_flags.length === 0 && p.analyses_total >= 5) {
    out.push({
      dimension: "production_readiness",
      delta: 0.1,
      reason: "No critical flags across a substantial pre-analysis set",
      source: "pre_analysis",
    });
  }
  return out;
}

export function deriveContextSignals(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
): ContextSignal[] {
  const signals: ContextSignal[] = [];
  if (kb.intake) signals.push(...intakeSignals(kb.intake));
  if (kb.coverage) signals.push(...coverageSignals(kb.coverage));
  if (kb.insights) signals.push(...insightsSignals(kb.insights));
  if (kb.pre_analysis) signals.push(...preAnalysisSignals(kb.pre_analysis));
  return signals;
}

export function aggregateContextAdjustment(
  signals: ContextSignal[],
): ContextAdjustment {
  const dim: Record<ScoreDimension, number> = { ...EMPTY_DIM_DELTAS };
  for (const s of signals) {
    dim[s.dimension] += s.delta;
  }
  // Clamp per dimension
  (Object.keys(dim) as ScoreDimension[]).forEach((k) => {
    dim[k] = clamp(dim[k], PER_DIM_DOWN_CAP, PER_DIM_UP_CAP);
  });
  // Weighted composite delta
  let composite = 0;
  for (const cfg of SCORING_DIMENSIONS) {
    composite += dim[cfg.key] * cfg.weight;
  }
  composite = clamp(Math.round(composite * 100) / 100, -COMPOSITE_CAP, COMPOSITE_CAP);
  return { signals, dimension_delta: dim, composite_delta: composite };
}

export function stepLabel(step: KnowledgeStep): string {
  return KNOWLEDGE_STEP_LABELS[step];
}
