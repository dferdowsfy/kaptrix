// ------------------------------------------------------------------
// System Signals
//
// Derives auditable, dimension-anchored "what just changed in the
// model" events from diffs of the preview knowledge base. Every
// signal maps back to one of the 6 scoring dimensions, a specific
// sub-criterion, or a named artifact requirement. No generic phrases.
//
// Consumer: src/hooks/use-system-signals.ts
//           src/components/preview/system-signal-pill.tsx
// ------------------------------------------------------------------

import type { ScoreDimension } from "@/lib/types";
import type {
  CoveragePayload,
  InsightsPayload,
  IntakePayload,
  KnowledgeEntry,
  KnowledgeStep,
  PreAnalysisPayload,
} from "@/lib/preview/knowledge-base";

export type ClientKb = Partial<Record<KnowledgeStep, KnowledgeEntry>>;

export const DIMENSION_SHORT_LABEL: Record<ScoreDimension, string> = {
  product_credibility: "Product Credibility",
  tooling_exposure: "Tooling & Vendor Exposure",
  data_sensitivity: "Data Risk",
  governance_safety: "Governance & Safety",
  production_readiness: "Production Readiness",
  open_validation: "Open Validation",
};

export interface RiskSignal {
  label: string;           // the actual finding, e.g. "No data isolation policy identified"
  dimension: ScoreDimension;
  severity: "critical" | "high" | "medium";
  source: "intake" | "pre_analysis";
}

export interface GapSignal {
  artifact: string;        // e.g. "AI roadmap", "ROI / business case model"
  dimension?: ScoreDimension;
}

export interface ModelAdjustmentSignal {
  dimension: ScoreDimension;
  direction: "up" | "down";
  reason: string;          // e.g. "Corporate IC context", "Vendor concentration prioritized"
}

export interface KnowledgeSignal {
  count: number;
  source: "intake" | "coverage" | "insights" | "pre_analysis" | "positioning";
}

export interface SystemSignalBatch {
  id: string;
  created_at: string;
  risks: RiskSignal[];
  gaps: GapSignal[];
  adjustments: ModelAdjustmentSignal[];
  knowledge: KnowledgeSignal[];
}

// ------------------------------------------------------------------
// Intake → dimension-weight adjustments.
// These encode how the model re-weights evidence given engagement
// context. Every entry is auditable (operator sees the exact trigger).
// ------------------------------------------------------------------

function engagementTypeAdjustments(prev: string | undefined, next: string | undefined): ModelAdjustmentSignal[] {
  if (!next || next === prev) return [];
  const out: ModelAdjustmentSignal[] = [];
  if (next.startsWith("Corporate IC")) {
    out.push({ dimension: "product_credibility", direction: "up", reason: "Corporate IC context" });
    out.push({ dimension: "governance_safety", direction: "down", reason: "Corporate IC context — governance carried by buyer" });
  } else if (next.startsWith("PE") || next.startsWith("Growth") || next.startsWith("Portfolio")) {
    out.push({ dimension: "open_validation", direction: "up", reason: "PE diligence posture" });
    out.push({ dimension: "production_readiness", direction: "up", reason: "PE diligence posture" });
  } else if (next.startsWith("Vendor selection")) {
    out.push({ dimension: "tooling_exposure", direction: "up", reason: "Vendor-selection context" });
    out.push({ dimension: "production_readiness", direction: "up", reason: "Vendor-selection context" });
  }
  return out;
}

function buyerArchetypeAdjustments(prev: string | undefined, next: string | undefined): ModelAdjustmentSignal[] {
  if (!next || next === prev) return [];
  if (/SMB/i.test(next)) {
    return [{ dimension: "production_readiness", direction: "down", reason: "SMB operator — lighter production bar" }];
  }
  if (/Large-cap PE|Growth equity/i.test(next)) {
    return [{ dimension: "open_validation", direction: "up", reason: `${next} audience` }];
  }
  return [];
}

const PRIORITY_TO_DIMENSION: Record<string, ScoreDimension> = {
  "Are AI claims real or marketing?": "product_credibility",
  "Vendor / model concentration": "tooling_exposure",
  "Regulatory exposure": "data_sensitivity",
  "Data sensitivity and tenant isolation": "data_sensitivity",
  "Data rights and IP provenance": "data_sensitivity",
  "Unit economics at scale": "production_readiness",
  "Enterprise sales readiness": "production_readiness",
  "Integration with existing stack": "production_readiness",
  "Competitive defensibility": "product_credibility",
  "Internal team readiness to operate": "governance_safety",
  "Key-person risk": "governance_safety",
};

function diligencePriorityAdjustments(prev: string[] | undefined, next: string[] | undefined): ModelAdjustmentSignal[] {
  const p = new Set(prev ?? []);
  const added = (next ?? []).filter((x) => !p.has(x));
  const out: ModelAdjustmentSignal[] = [];
  for (const item of added) {
    const dim = PRIORITY_TO_DIMENSION[item];
    if (!dim) continue;
    out.push({ dimension: dim, direction: "up", reason: `Client prioritized "${item}"` });
  }
  return out;
}

// ------------------------------------------------------------------
// Intake risk signals (from regulatory exposure + red flag priors).
// ------------------------------------------------------------------

function intakeRiskDiff(prev: IntakePayload | undefined, next: IntakePayload): RiskSignal[] {
  const prevReg = new Set(prev?.regulatory_exposure ?? []);
  const prevFlags = new Set(prev?.red_flag_priors ?? []);
  const out: RiskSignal[] = [];
  for (const r of next.regulatory_exposure) {
    if (prevReg.has(r)) continue;
    out.push({
      label: `Regulatory exposure: ${r}`,
      dimension: "data_sensitivity",
      severity: "high",
      source: "intake",
    });
  }
  for (const f of next.red_flag_priors) {
    if (prevFlags.has(f)) continue;
    out.push({
      label: `Prior red-flag concern: ${f}`,
      dimension: "open_validation",
      severity: "medium",
      source: "intake",
    });
  }
  return out;
}

// ------------------------------------------------------------------
// Pre-analysis red flags → risk signals (dimension-anchored).
// ------------------------------------------------------------------

function preAnalysisRiskDiff(
  prev: PreAnalysisPayload | undefined,
  next: PreAnalysisPayload,
): RiskSignal[] {
  const prevCrit = new Set((prev?.critical_red_flags ?? []).map((f) => f.flag));
  const prevHigh = new Set((prev?.high_red_flags ?? []).map((f) => f.flag));
  const out: RiskSignal[] = [];
  for (const f of next.critical_red_flags) {
    if (prevCrit.has(f.flag) || !f.dimension) continue;
    out.push({ label: f.flag, dimension: f.dimension, severity: "critical", source: "pre_analysis" });
  }
  for (const f of next.high_red_flags) {
    if (prevHigh.has(f.flag) || !f.dimension) continue;
    out.push({ label: f.flag, dimension: f.dimension, severity: "high", source: "pre_analysis" });
  }
  return out;
}

// ------------------------------------------------------------------
// Coverage → gap signals. New missing artifacts only.
// ------------------------------------------------------------------

function coverageGapDiff(
  prev: CoveragePayload | undefined,
  next: CoveragePayload,
): GapSignal[] {
  const prevGaps = new Set(prev?.gap_summaries ?? []);
  return next.gap_summaries
    .filter((g) => !prevGaps.has(g))
    .map((artifact) => ({ artifact }));
}

// ------------------------------------------------------------------
// Knowledge-base growth: count of new evidence items per source.
// ------------------------------------------------------------------

function knowledgeDelta(prev: ClientKb, next: ClientKb): KnowledgeSignal[] {
  const out: KnowledgeSignal[] = [];

  const prevIntake = prev.intake?.payload.kind === "intake" ? prev.intake.payload : undefined;
  const nextIntake = next.intake?.payload.kind === "intake" ? next.intake.payload : undefined;
  if (nextIntake) {
    const delta = nextIntake.answered_fields - (prevIntake?.answered_fields ?? 0);
    if (delta > 0) out.push({ count: delta, source: "intake" });
  }

  const prevIns = prev.insights?.payload.kind === "insights" ? prev.insights.payload : undefined;
  const nextIns = next.insights?.payload.kind === "insights" ? next.insights.payload : undefined;
  if (nextIns) {
    const delta = nextIns.insights_total - (prevIns?.insights_total ?? 0);
    if (delta > 0) out.push({ count: delta, source: "insights" });
  }

  const prevPa = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  if (nextPa) {
    const delta = nextPa.analyses_total - (prevPa?.analyses_total ?? 0);
    if (delta > 0) out.push({ count: delta, source: "pre_analysis" });
  }

  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;
  if (nextCov) {
    const delta = nextCov.documents_total - (prevCov?.documents_total ?? 0);
    if (delta > 0) out.push({ count: delta, source: "coverage" });
  }

  if (!prev.positioning && next.positioning) {
    const p = next.positioning.payload;
    if (p.kind === "positioning") {
      out.push({ count: p.comparables.length, source: "positioning" });
    }
  }
  return out;
}

// ------------------------------------------------------------------
// Public: diff two KB snapshots and return a structured batch.
// Returns null when nothing meaningful changed.
// ------------------------------------------------------------------

export function diffKnowledgeBase(prev: ClientKb, next: ClientKb): SystemSignalBatch | null {
  const risks: RiskSignal[] = [];
  const gaps: GapSignal[] = [];
  const adjustments: ModelAdjustmentSignal[] = [];

  // Intake
  const prevIntake = prev.intake?.payload.kind === "intake" ? prev.intake.payload : undefined;
  const nextIntake = next.intake?.payload.kind === "intake" ? next.intake.payload : undefined;
  if (nextIntake) {
    risks.push(...intakeRiskDiff(prevIntake, nextIntake));
    adjustments.push(...engagementTypeAdjustments(prevIntake?.engagement_type, nextIntake.engagement_type));
    adjustments.push(...buyerArchetypeAdjustments(prevIntake?.buyer_archetype, nextIntake.buyer_archetype));
    adjustments.push(...diligencePriorityAdjustments(prevIntake?.diligence_priorities, nextIntake.diligence_priorities));
  }

  // Pre-analysis
  const prevPa = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  if (nextPa) risks.push(...preAnalysisRiskDiff(prevPa, nextPa));

  // Coverage
  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;
  if (nextCov) gaps.push(...coverageGapDiff(prevCov, nextCov));

  // Knowledge base growth
  const knowledge = knowledgeDelta(prev, next);

  // De-dupe adjustments: keep strongest (first-seen) per dimension+direction.
  const seen = new Set<string>();
  const dedupedAdjustments = adjustments.filter((a) => {
    const k = `${a.dimension}:${a.direction}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (
    risks.length === 0 &&
    gaps.length === 0 &&
    dedupedAdjustments.length === 0 &&
    knowledge.length === 0
  ) {
    return null;
  }

  // Sort risks by severity (critical → high → medium)
  const severityRank = { critical: 0, high: 1, medium: 2 } as const;
  risks.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    id: `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    risks,
    gaps,
    adjustments: dedupedAdjustments,
    knowledge,
  };
}

// ------------------------------------------------------------------
// Compact headline — max 60 chars. Max 3 categories: Risks, Gaps, Model.
// ------------------------------------------------------------------

export function formatHeadline(batch: SystemSignalBatch): string {
  const parts: string[] = [];
  if (batch.risks.length > 0) parts.push(`+${batch.risks.length} Risk${batch.risks.length === 1 ? "" : "s"}`);
  if (batch.gaps.length > 0) parts.push(`+${batch.gaps.length} Gap${batch.gaps.length === 1 ? "" : "s"}`);
  if (batch.adjustments.length > 0) parts.push("Model Updated");
  // If no risks/gaps/model but knowledge grew, surface that instead.
  if (parts.length === 0 && batch.knowledge.length > 0) {
    const total = batch.knowledge.reduce((s, k) => s + k.count, 0);
    parts.push(`+${total} Signal${total === 1 ? "" : "s"}`);
  }
  const headline = parts.slice(0, 3).join(" • ");
  return headline.length > 60 ? headline.slice(0, 59) + "…" : headline;
}
