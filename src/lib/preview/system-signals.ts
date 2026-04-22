// ------------------------------------------------------------------
// System Signals — Key Changes Engine
//
// Derives material, decision-relevant changes from diffs of the
// preview knowledge base. Every change maps to a scoring dimension,
// a specific risk area, or a named artifact requirement.
//
// Design principles:
//  - Materiality filter: only surface changes that affect IC outcome
//  - Aggregation: one insight per risk area / dimension
//  - No numeric deltas, weights, or internal scoring mechanics
//  - Analyst tone throughout — IC-ready language
//  - Investment translation on every Score Impact item
// ------------------------------------------------------------------

import type { ScoreDimension } from "@/lib/types";
import type {
  CoveragePayload,
  IntakePayload,
  KnowledgeEntry,
  KnowledgeStep,
  PreAnalysisPayload,
} from "@/lib/preview/knowledge-base";

export type ClientKb = Partial<Record<KnowledgeStep, KnowledgeEntry>>;

export const DIMENSION_SHORT_LABEL: Record<ScoreDimension, string> = {
  product_credibility: "Product Credibility",
  tooling_exposure:    "Tooling & Vendor Exposure",
  data_sensitivity:    "Data Risk",
  governance_safety:   "Governance & Safety",
  production_readiness: "Production Readiness",
  open_validation:     "Open Validation",
};

// ─── Investment implication map ──────────────────────────────────────────────
// Plain-English implication for each dimension+direction. No scoring language.
const IMPLICATION: Record<ScoreDimension, Record<"up" | "down", string>> = {
  product_credibility: {
    up:   "Evidence supports AI differentiation claims — strengthens the core investment thesis",
    down: "AI value claims require additional validation — weakens the primary investment thesis",
  },
  tooling_exposure: {
    up:   "Vendor risk is well-managed — abstraction and fallback reduce concentration exposure",
    down: "Vendor lock-in risk elevated — reduces negotiating leverage and complicates exit planning",
  },
  data_sensitivity: {
    up:   "Data practices appropriate for sensitivity level — reduces regulatory and compliance friction",
    down: "Data handling risk identified — regulated-sector deployments may face compliance delays",
  },
  governance_safety: {
    up:   "Governance posture supports enterprise deals — compliance and oversight are in place",
    down: "Compliance risk elevated — may impact enterprise adoption and audit readiness",
  },
  production_readiness: {
    up:   "Infrastructure can absorb anticipated scale — production readiness supports the growth thesis",
    down: "Scalability confidence weakened — cost and reliability at scale remain unvalidated",
  },
  open_validation: {
    up:   "Validation coverage improving — diligence is converging toward a decision-ready state",
    down: "Diligence completeness reduced — IC memo will carry material open questions",
  },
};

// Priority weight: lower = more impactful to the investment decision
const DIM_PRIORITY: Record<ScoreDimension, number> = {
  data_sensitivity:     1,
  governance_safety:    1,
  open_validation:      2,
  tooling_exposure:     2,
  production_readiness: 3,
  product_credibility:  3,
};

// ─── Types ───────────────────────────────────────────────────────────────────

export type KeyChangeSeverity = "critical" | "important";
export type KeyChangeLifecycle = "new" | "updated" | "resolved";
export type KeyChangeCategory  = "risk" | "score_impact" | "gap";

export interface KeyChange {
  /** Stable topic-based fingerprint for dedup */
  id: string;
  category: KeyChangeCategory;
  severity: KeyChangeSeverity;
  lifecycle: KeyChangeLifecycle;
  /** Rank within the batch — 1 = highest investment impact */
  priority: number;
  dimension?: ScoreDimension;
  direction?: "up" | "down";
  /** One-liner analyst headline */
  headline: string;
  /** Why this change was triggered (evidence linkage) */
  reason: string;
  /** Investment-level implication — no scoring math */
  implication: string;
  /** KB step that triggered this */
  evidence_source: string;
  /** Drill-down items (hidden by default) */
  supporting_items?: string[];
}

export interface ConfidenceShift {
  direction: "up" | "down";
  headline: string;
  reason: string;
}

export type NetImpactDirection = "up" | "down" | "mixed";
export type NetImpactConfidence = "high" | "moderate" | "low";

export interface NetImpact {
  direction: NetImpactDirection;
  confidence: NetImpactConfidence;
  /** Short context clause shown after the indicator (e.g. "incomplete evidence") */
  note?: string;
}

export interface KeyChangesBatch {
  id: string;
  created_at: string;
  /** Net directional summary shown at the top of the panel */
  netImpact: NetImpact;
  /** Single sentence capturing the most important shift — shown at top of panel */
  primaryInsight: string;
  /** All changes, sorted by priority ascending */
  changes: KeyChange[];
  /** Separate confidence track — not folded into Score Impact */
  confidenceShift: ConfidenceShift | null;
  /** Whether there are more changes beyond the 3+3 display cap */
  hasMore: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
}

// ─── Risk derivation ─────────────────────────────────────────────────────────

function deriveIntakeRisks(
  prevIntake: IntakePayload | undefined,
  nextIntake: IntakePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  // Regulatory exposure — aggregate all new ones into ONE change
  const prevReg  = new Set(prevIntake?.regulatory_exposure ?? []);
  const newReg   = nextIntake.regulatory_exposure.filter((r) => !prevReg.has(r));
  if (newReg.length > 0) {
    const sev: KeyChangeSeverity = newReg.length >= 3 ? "critical" : "important";
    out.push({
      id: "risk:intake:regulatory",
      category: "risk",
      severity: sev,
      lifecycle: "new",
      priority: sev === "critical" ? 1 : 2,
      dimension: "data_sensitivity",
      direction: "down",
      headline:
        newReg.length === 1
          ? `Regulatory exposure identified — ${newReg[0]}`
          : `Regulatory exposure confirmed across ${newReg.length} frameworks`,
      reason: `Intake flagged: ${newReg.join(", ")}`,
      implication: IMPLICATION.data_sensitivity.down,
      evidence_source: "From intake: regulatory exposure",
      supporting_items: newReg,
    });
  }

  // Prior red flags — aggregate into ONE change
  const prevFlags = new Set(prevIntake?.red_flag_priors ?? []);
  const newFlags  = nextIntake.red_flag_priors.filter((f) => !prevFlags.has(f));
  if (newFlags.length > 0) {
    out.push({
      id: "risk:intake:red_flags",
      category: "risk",
      severity: "important",
      lifecycle: "new",
      priority: 3,
      dimension: "open_validation",
      direction: "down",
      headline: `Prior concern${newFlags.length > 1 ? "s" : ""} flagged — validation required in this engagement`,
      reason: `${newFlags.length} prior red-flag concern${newFlags.length > 1 ? "s" : ""} carried from intake`,
      implication: IMPLICATION.open_validation.down,
      evidence_source: "From intake: prior red flags",
      supporting_items: newFlags,
    });
  }

  // Kill criteria — surfaces when the operator defines walk-away conditions
  const prevKill = prevIntake?.kill_criteria;
  const nextKill = nextIntake.kill_criteria;
  if (nextKill && nextKill !== prevKill) {
    out.push({
      id: "risk:intake:kill_criteria",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 5,
      headline: "Kill criteria defined — assessment will flag breach conditions",
      reason: "Operator defined explicit walk-away conditions for this engagement",
      implication: "Kaptrix will elevate any evidence that intersects these kill conditions in the final report",
      evidence_source: "From intake: kill criteria",
    });
  }

  // Training data sources — signals data-risk posture
  const prevTraining = new Set(prevIntake?.training_data_sources ?? []);
  const newTraining = (nextIntake.training_data_sources ?? []).filter((s) => !prevTraining.has(s));
  if (newTraining.length > 0) {
    const hasRisky = newTraining.some((s) =>
      s.toLowerCase().includes("scraping") || s.toLowerCase().includes("unknown"),
    );
    if (hasRisky) {
      out.push({
        id: "risk:intake:training_data",
        category: "risk",
        severity: "important",
        lifecycle: "new",
        priority: 4,
        dimension: "data_sensitivity",
        direction: "down",
        headline: "Training data provenance flagged for review",
        reason: `Data sources include: ${newTraining.join(", ")}`,
        implication: IMPLICATION.data_sensitivity.down,
        evidence_source: "From intake: training data sources",
        supporting_items: newTraining,
      });
    }
  }

  // Lock-in tolerance — affects vendor-risk lens
  if (nextIntake.lock_in_tolerance && nextIntake.lock_in_tolerance !== prevIntake?.lock_in_tolerance) {
    const isStrict = nextIntake.lock_in_tolerance.toLowerCase().includes("avoid");
    if (isStrict) {
      out.push({
        id: "risk:intake:lock_in",
        category: "score_impact",
        severity: "important",
        lifecycle: "new",
        priority: 5,
        dimension: "tooling_exposure",
        direction: "down",
        headline: "Strict vendor lock-in constraints applied",
        reason: `Client posture: ${nextIntake.lock_in_tolerance}`,
        implication: IMPLICATION.tooling_exposure.down,
        evidence_source: "From intake: lock-in tolerance",
      });
    }
  }

  return out;
}

function derivePreAnalysisRisks(
  prevPa: PreAnalysisPayload | undefined,
  nextPa: PreAnalysisPayload,
): KeyChange[] {
  const prevCritSet = new Set((prevPa?.critical_red_flags ?? []).map((f) => f.flag));
  const prevHighSet = new Set((prevPa?.high_red_flags   ?? []).map((f) => f.flag));

  const newCrit = nextPa.critical_red_flags.filter((f) => !prevCritSet.has(f.flag));
  const newHigh = nextPa.high_red_flags.filter(
    (f) => !prevHighSet.has(f.flag) && !prevCritSet.has(f.flag),
  );

  const out: KeyChange[] = [];

  // Group critical flags by dimension — one change per dimension
  const critByDim = new Map<ScoreDimension | null, string[]>();
  for (const f of newCrit) {
    critByDim.set(f.dimension, [...(critByDim.get(f.dimension) ?? []), f.flag]);
  }
  for (const [dim, flags] of critByDim.entries()) {
    const dimLabel = dim ? DIMENSION_SHORT_LABEL[dim] : "multiple areas";
    const basePri  = dim ? DIM_PRIORITY[dim] : 1;
    out.push({
      id: `risk:pa:critical:${dim ?? "cross"}`,
      category: "risk",
      severity: "critical",
      lifecycle: "new",
      priority: basePri,
      dimension: dim ?? undefined,
      direction: "down",
      headline:
        flags.length === 1
          ? `${dimLabel} — critical exposure identified`
          : `${dimLabel} — ${flags.length} critical exposures identified`,
      reason: flags.length === 1 ? flags[0] : `${flags.length} critical findings surfaced during document review`,
      implication: dim ? IMPLICATION[dim].down : "Material risk to investment viability — targeted validation required before IC",
      evidence_source: "From artifact review: pre-analysis",
      supporting_items: flags,
    });
  }

  // Group high flags by dimension — suppress singletons if already critical-heavy
  const highByDim = new Map<ScoreDimension | null, string[]>();
  for (const f of newHigh) {
    highByDim.set(f.dimension, [...(highByDim.get(f.dimension) ?? []), f.flag]);
  }
  for (const [dim, flags] of highByDim.entries()) {
    // Materiality: suppress lone high flag if there are already 3+ critical changes
    if (flags.length === 1 && newCrit.length >= 3) continue;
    const dimLabel = dim ? DIMENSION_SHORT_LABEL[dim] : "multiple areas";
    const basePri  = (dim ? DIM_PRIORITY[dim] : 2) + 1;
    out.push({
      id: `risk:pa:high:${dim ?? "cross"}`,
      category: "risk",
      severity: "important",
      lifecycle: "new",
      priority: basePri,
      dimension: dim ?? undefined,
      direction: "down",
      headline:
        flags.length === 1
          ? `${dimLabel} — new concern identified`
          : `${dimLabel} — ${flags.length} concerns identified`,
      reason: flags.length === 1 ? flags[0] : `${flags.length} concerns surfaced during document review`,
      implication: dim ? IMPLICATION[dim].down : "Targeted validation required before IC submission",
      evidence_source: "From artifact review: pre-analysis",
      supporting_items: flags,
    });
  }

  return out;
}

// ─── Score Impact derivation ─────────────────────────────────────────────────
// One aggregated change per trigger — no numeric values.

function deriveScoreImpacts(
  prevIntake: IntakePayload | undefined,
  nextIntake: IntakePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  // Engagement type — ONE aggregated change
  if (nextIntake.engagement_type && nextIntake.engagement_type !== prevIntake?.engagement_type) {
    const et = nextIntake.engagement_type;
    let headline     = "";
    let reason       = "";
    let implication  = "";
    let supporting: string[] = [];

    if (et.startsWith("Corporate IC")) {
      headline    = "Evidence bar raised for investment-committee review";
      reason      = "Deal positioned for IC review — findings must withstand committee-level scrutiny";
      implication = "AI value proof, customer validation, and governance readiness carry the most weight for this engagement";
      supporting  = [
        "AI differentiation and claim substantiation become primary evidence focus",
        "Governance posture is evaluated against committee-readiness, not day-to-day operations",
      ];
    } else if (et.startsWith("PE") || et.startsWith("Growth") || et.startsWith("Portfolio")) {
      headline    = "Evidence bar raised for growth-equity diligence";
      reason      = "Deal positioned for PE / growth diligence — thesis defensibility at exit is the dominant lens";
      implication = "Production proof, scalability evidence, and exit-readiness artifacts carry the most weight for this engagement";
      supporting  = [
        "Evidence bar increases for open questions before IC",
        "Production readiness is stress-tested against the growth trajectory",
      ];
    } else if (et.startsWith("Vendor selection")) {
      headline    = "Vendor-risk lens applied to the assessment";
      reason      = "Deal positioned as vendor selection — fit, concentration risk, and switching cost are the dominant lens";
      implication = "Vendor lock-in, integration complexity, and contract terms carry the most weight for this engagement";
      supporting  = [
        "Concentration risk and switching cost become primary evidence focus",
        "Production readiness is evaluated against the buyer’s operational requirements",
      ];
    } else {
      return out;
    }

    out.push({
      id: "impact:engagement_type",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 4,
      headline,
      reason,
      implication,
      evidence_source: "From intake: engagement type",
      supporting_items: supporting,
    });
  }

  // Diligence priorities — ONE aggregated change (surface on any new priority)
  const prevPri = new Set(prevIntake?.diligence_priorities ?? []);
  const newPri  = (nextIntake.diligence_priorities ?? []).filter((p) => !prevPri.has(p));
  if (newPri.length >= 1) {
    out.push({
      id: "impact:diligence_priorities",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 5,
      headline:
        newPri.length === 1
          ? `Evidence bar raised around ${newPri[0]}`
          : `Evidence bar raised across ${newPri.length} client-specified risk areas`,
      reason: `Client flagged as priority: ${newPri.slice(0, 3).join(", ")}${newPri.length > 3 ? ", and more" : ""}`,
      implication: "Unresolved questions in these areas carry the most weight on the final assessment",
      evidence_source: "From intake: diligence priorities",
      supporting_items: newPri,
    });
  }

  // Deal thesis — surfaces when the operator identifies the investment thesis
  const prevThesis = new Set(prevIntake?.deal_thesis ?? []);
  const newThesis = (nextIntake.deal_thesis ?? []).filter((t) => !prevThesis.has(t));
  if (newThesis.length > 0) {
    out.push({
      id: "impact:deal_thesis",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 4,
      headline:
        newThesis.length === 1
          ? `Investment thesis identified — ${newThesis[0]}`
          : `Investment thesis spans ${newThesis.length} value drivers`,
      reason: `Thesis: ${newThesis.slice(0, 3).join(", ")}${newThesis.length > 3 ? `, +${newThesis.length - 3} more` : ""}`,
      implication: "Assessment will weight evidence against these specific value drivers",
      evidence_source: "From intake: deal thesis",
      supporting_items: newThesis,
    });
  }

  // Buyer archetype — shapes how findings are framed
  if (nextIntake.buyer_archetype && nextIntake.buyer_archetype !== prevIntake?.buyer_archetype) {
    out.push({
      id: "impact:buyer_archetype",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 5,
      headline: `Buyer profile set — ${nextIntake.buyer_archetype}`,
      reason: "Buyer archetype determines how findings and recommendations are framed for the decision-maker",
      implication: "Report tone and risk framing will be calibrated to this buyer profile",
      evidence_source: "From intake: buyer archetype",
    });
  }

  // Existing AI systems — signals internal readiness context
  const prevSystems = new Set(prevIntake?.existing_ai_systems ?? []);
  const newSystems = (nextIntake.existing_ai_systems ?? []).filter((s) => !prevSystems.has(s));
  if (newSystems.length > 0 && !newSystems.every((s) => s === "None yet" || s === "Not applicable")) {
    out.push({
      id: "impact:existing_ai_systems",
      category: "score_impact",
      severity: "important",
      lifecycle: "new",
      priority: 6,
      dimension: "production_readiness",
      direction: "up",
      headline: `Buyer has existing AI footprint — ${newSystems.length} system${newSystems.length > 1 ? "s" : ""} deployed`,
      reason: `Deployed: ${newSystems.join(", ")}`,
      implication: IMPLICATION.production_readiness.up,
      evidence_source: "From intake: existing AI systems",
      supporting_items: newSystems,
    });
  }

  return out;
}

// ─── Coverage gap derivation ─────────────────────────────────────────────────

function deriveCoverageChanges(
  prevCov: CoveragePayload | undefined,
  nextCov: CoveragePayload,
): KeyChange[] {
  const out: KeyChange[] = [];

  const prevGaps = new Set(prevCov?.gap_summaries ?? []);
  const nextGaps = new Set(nextCov.gap_summaries);
  const newGaps      = [...nextGaps].filter((g) => !prevGaps.has(g));
  const resolvedGaps = [...prevGaps].filter((g) => !nextGaps.has(g));

  if (newGaps.length > 0) {
    const sev: KeyChangeSeverity = newGaps.length >= 3 ? "critical" : "important";
    out.push({
      id: "gap:coverage:new",
      category: "gap",
      severity: sev,
      lifecycle: "new",
      priority: sev === "critical" ? 2 : 4,
      headline:
        newGaps.length === 1
          ? `Missing artifact introduces evidence gap — ${newGaps[0]}`
          : `${newGaps.length} missing artifacts introduce evidence gaps`,
      reason: "Required for complete scoring under this engagement’s evidence standard",
      implication: "Open questions remain on the final assessment until these artifacts are provided",
      evidence_source: "From coverage: required artifacts",
      supporting_items: newGaps,
    });
  }

  if (resolvedGaps.length > 0) {
    out.push({
      id: "gap:coverage:resolved",
      category: "gap",
      severity: "important",
      lifecycle: "resolved",
      priority: 6,
      headline:
        resolvedGaps.length === 1
          ? `Evidence gap resolved — ${resolvedGaps[0]}`
          : `${resolvedGaps.length} evidence gaps resolved`,
      reason: "Previously missing artifacts are now available",
      implication: "Confidence in the assessment strengthens as supporting evidence is provided",
      evidence_source: "From coverage: artifact uploaded",
      supporting_items: resolvedGaps,
    });
  }

  return out;
}

// ─── Confidence Shift (separate track) ───────────────────────────────────────

function deriveConfidenceShift(prev: ClientKb, next: ClientKb): ConfidenceShift | null {
  const prevPa  = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa  = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;

  // Positive: pre-analysis expanded with no new critical flags
  if (nextPa && nextPa.analyses_total > (prevPa?.analyses_total ?? 0)) {
    const newCritCount = nextPa.critical_red_flags.filter(
      (f) => !(prevPa?.critical_red_flags ?? []).some((p) => p.flag === f.flag),
    ).length;
    if (newCritCount === 0 && nextPa.analyses_total >= 3) {
      return {
        direction: "up",
        headline: "Evidence base strengthened",
        reason: `Document review covered ${nextPa.analyses_total} artifacts without new critical findings — assessment stands on stronger evidentiary support`,
      };
    }
  }

  // Positive: gaps resolved
  if (prevCov && nextCov && nextCov.gaps_count < prevCov.gaps_count) {
    const delta = prevCov.gaps_count - nextCov.gaps_count;
    return {
      direction: "up",
      headline: "Confidence increased",
      reason: `${delta} previously missing artifact${delta > 1 ? "s" : ""} now available — supporting evidence for the assessment expanded`,
    };
  }

  // Negative: new critical flags
  if (nextPa && prevPa) {
    const newCrit = nextPa.critical_red_flags.filter(
      (f) => !(prevPa.critical_red_flags ?? []).some((p) => p.flag === f.flag),
    );
    if (newCrit.length > 0) {
      return {
        direction: "down",
        headline: "Confidence decreased",
        reason: `${newCrit.length} new critical finding${newCrit.length > 1 ? "s" : ""} — assessment stands on less complete evidence until resolved`,
      };
    }
  }

  // Negative: gaps grew
  if (prevCov && nextCov && nextCov.gaps_count > prevCov.gaps_count) {
    const delta = nextCov.gaps_count - prevCov.gaps_count;
    return {
      direction: "down",
      headline: "Confidence decreased",
      reason: `${delta} additional required artifact${delta > 1 ? "s" : ""} missing — assessment stands on less complete evidence until provided`,
    };
  }

  return null;
}

// ─── Primary Insight ─────────────────────────────────────────────────────────
// Single sentence at the top of the panel. Analyst tone, IC-ready.
// Must describe what changed in the ASSESSMENT — not the system behaviour.

const DIM_PRIMARY_CRITICAL: Record<ScoreDimension, string> = {
  data_sensitivity:     "Data risk is now the primary constraint on deal viability",
  governance_safety:    "Governance risk is now the primary constraint for enterprise adoption",
  product_credibility:  "AI differentiation remains unproven based on current evidence",
  tooling_exposure:     "Vendor concentration is now the dominant downside risk",
  production_readiness: "Production readiness is the primary open question on the growth thesis",
  open_validation:      "Critical open questions remain before the assessment is decision-ready",
};

const DIM_PRIMARY_IMPORTANT: Record<ScoreDimension, string> = {
  data_sensitivity:     "Data-handling risk is a material concern on this deal",
  governance_safety:    "Governance posture is a material open question for enterprise adoption",
  product_credibility:  "AI value claims require additional validation",
  tooling_exposure:     "Vendor exposure is a material risk to long-term optionality",
  production_readiness: "Scalability at growth trajectory remains unvalidated",
  open_validation:      "Material open questions remain before the assessment is decision-ready",
};

function derivePrimaryInsight(changes: KeyChange[], confidence: ConfidenceShift | null): string {
  const topCritRisk = changes.find((c) => c.severity === "critical" && c.category === "risk");
  if (topCritRisk?.dimension) return DIM_PRIMARY_CRITICAL[topCritRisk.dimension];
  if (topCritRisk)            return "A critical risk is now the primary constraint on deal viability";

  const critGap = changes.find((c) => c.severity === "critical" && c.category === "gap");
  if (critGap) return "Missing artifacts are now the primary constraint on decision readiness";

  const topImportantRisk = changes.find((c) => c.severity === "important" && c.category === "risk");
  if (topImportantRisk?.dimension) return DIM_PRIMARY_IMPORTANT[topImportantRisk.dimension];

  const resolved = changes.find((c) => c.lifecycle === "resolved");
  if (resolved) return "Evidence coverage has strengthened — the assessment is more decision-ready";

  if (confidence?.direction === "down") return "Confidence in the assessment has weakened on incomplete evidence";
  if (confidence?.direction === "up")   return "Confidence in the assessment has strengthened on new evidence";

  const scoreImpact = changes.find((c) => c.category === "score_impact");
  if (scoreImpact) return scoreImpact.headline;

  const top = changes[0];
  return top ? top.headline : "";
}

// ─── Net Impact ──────────────────────────────────────────────────────────────
// Directional summary of the overall effect of all surfaced changes.

function deriveNetImpact(
  changes: KeyChange[],
  confidence: ConfidenceShift | null,
  nextKb: ClientKb,
): NetImpact {
  // Direction: weight critical risks heavily, resolved items as positive
  let downWeight = 0;
  let upWeight = 0;

  for (const c of changes) {
    if (c.lifecycle === "resolved") { upWeight += 2; continue; }
    if (c.direction === "up")       { upWeight += (c.severity === "critical" ? 2 : 1); continue; }
    if (c.direction === "down" || c.category === "risk" || c.category === "gap") {
      downWeight += (c.severity === "critical" ? 3 : 1);
    }
  }
  if (confidence?.direction === "up")   upWeight   += 1;
  if (confidence?.direction === "down") downWeight += 1;

  let direction: NetImpactDirection;
  if (upWeight === 0 && downWeight === 0) {
    direction = confidence?.direction === "up" ? "up" : confidence?.direction === "down" ? "down" : "mixed";
  } else if (upWeight > 0 && downWeight > 0) {
    direction = "mixed";
  } else {
    direction = downWeight > upWeight ? "down" : "up";
  }

  // Confidence: based on completeness of the evidence base
  const cov = nextKb.coverage?.payload.kind === "coverage" ? nextKb.coverage.payload : undefined;
  const pa  = nextKb.pre_analysis?.payload.kind === "pre_analysis" ? nextKb.pre_analysis.payload : undefined;
  const gaps   = cov?.gaps_count ?? 0;
  const docs   = pa?.analyses_total ?? 0;

  let confLevel: NetImpactConfidence;
  if (gaps === 0 && docs >= 3)      confLevel = "high";
  else if (gaps <= 2 && docs >= 1)  confLevel = "moderate";
  else                              confLevel = "low";

  const note = confLevel === "low" ? "incomplete evidence" : undefined;
  return { direction, confidence: confLevel, note };
}

// ─── Main export ─────────────────────────────────────────────────────────────

const CRITICAL_CAP  = 3;
const IMPORTANT_CAP = 3;

export function buildKeyChangesBatch(prev: ClientKb, next: ClientKb): KeyChangesBatch | null {
  const raw: KeyChange[] = [];

  const prevIntake = prev.intake?.payload.kind === "intake" ? prev.intake.payload : undefined;
  const nextIntake = next.intake?.payload.kind === "intake" ? next.intake.payload : undefined;
  if (nextIntake) {
    raw.push(...deriveIntakeRisks(prevIntake, nextIntake));
    raw.push(...deriveScoreImpacts(prevIntake, nextIntake));
  }

  const prevPa = prev.pre_analysis?.payload.kind === "pre_analysis" ? prev.pre_analysis.payload : undefined;
  const nextPa = next.pre_analysis?.payload.kind === "pre_analysis" ? next.pre_analysis.payload : undefined;
  if (nextPa) raw.push(...derivePreAnalysisRisks(prevPa, nextPa));

  const prevCov = prev.coverage?.payload.kind === "coverage" ? prev.coverage.payload : undefined;
  const nextCov = next.coverage?.payload.kind === "coverage" ? next.coverage.payload : undefined;
  if (nextCov) raw.push(...deriveCoverageChanges(prevCov, nextCov));

  const confidenceShift = deriveConfidenceShift(prev, next);

  // Materiality filter: must have at least one risk, gap, or score impact
  if (raw.length === 0 && !confidenceShift) return null;

  // Sort by priority ascending, then by severity (critical first)
  const severityRank: Record<KeyChangeSeverity, number> = { critical: 0, important: 1 };
  raw.sort((a, b) => a.priority - b.priority || severityRank[a.severity] - severityRank[b.severity]);

  // Assign display priority positions (1-based)
  raw.forEach((c, i) => { c.priority = i + 1; });

  // Determine "hasMore" based on caps
  const totalCritical  = raw.filter((c) => c.severity === "critical").length;
  const totalImportant = raw.filter((c) => c.severity === "important").length;
  const hasMore = totalCritical > CRITICAL_CAP || totalImportant > IMPORTANT_CAP;

  const primaryInsight = derivePrimaryInsight(raw, confidenceShift);
  const netImpact      = deriveNetImpact(raw, confidenceShift, next);

  return {
    id: `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    created_at: new Date().toISOString(),
    netImpact,
    primaryInsight,
    changes: raw,
    confidenceShift,
    hasMore,
  };
}

/** Pill headline — counts only, no internal mechanics */
export function formatPillHeadline(batch: KeyChangesBatch): string {
  const nCrit = batch.changes.filter((c) => c.severity === "critical").length;
  const nImp  = batch.changes.filter((c) => c.severity === "important").length;
  const parts: string[] = [];
  if (nCrit > 0) parts.push(`${nCrit} Critical`);
  if (nImp  > 0) parts.push(`${nImp} Important`);
  if (parts.length === 0 && batch.confidenceShift) parts.push("Confidence Shift");
  return parts.join(" · ");
}

//
// Derives auditable, dimension-anchored "what just changed in the
// model" events from diffs of the preview knowledge base. Every
// signal maps back to one of the 6 scoring dimensions, a specific
// sub-criterion, or a named artifact requirement. No generic phrases.
//
// Consumer: src/hooks/use-system-signals.ts
//           src/components/preview/system-signal-pill.tsx
