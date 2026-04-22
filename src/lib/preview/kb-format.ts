// Pure, environment-agnostic knowledge-base types and formatting.
//
// This module has NO "use client" directive so it can be imported by
// both client components (via knowledge-base.ts) and server routes
// (e.g. report generation routes that need to format KB evidence).
//
// Do NOT add any browser APIs, React hooks, or Next.js server-only
// imports here — this file must be side-effect free.

import type { ScoreDimension } from "@/lib/types";

// ------------------------------------------------------------------
// Step vocabulary
// ------------------------------------------------------------------

export type KnowledgeStep =
  | "intake"
  | "coverage"
  | "insights"
  | "pre_analysis"
  | "positioning"
  | "scoring"
  | "chat";

export const KNOWLEDGE_STEP_LABELS: Record<KnowledgeStep, string> = {
  intake: "Intake",
  coverage: "Coverage",
  insights: "Insights",
  pre_analysis: "Pre-analysis",
  positioning: "Positioning",
  scoring: "Scoring",
  chat: "Chat",
};

// ------------------------------------------------------------------
// Dependency graph
// ------------------------------------------------------------------

export const STAGE_UPSTREAM: Record<KnowledgeStep, KnowledgeStep[]> = {
  intake: [],
  pre_analysis: ["intake"],
  coverage: ["intake", "pre_analysis"],
  insights: ["intake", "pre_analysis"],
  scoring: ["intake", "coverage", "insights", "pre_analysis"],
  positioning: ["intake", "insights", "scoring", "pre_analysis"],
  chat: [],
};

// ------------------------------------------------------------------
// Entry shape
// ------------------------------------------------------------------

export interface KnowledgeEntry {
  step: KnowledgeStep;
  submitted_at: string;
  summary: string;
  payload: KnowledgePayload;
  version?: number;
  stale?: boolean;
  stale_because?: KnowledgeStep[];
}

// ------------------------------------------------------------------
// Payload union
// ------------------------------------------------------------------

export type KnowledgePayload =
  | IntakePayload
  | CoveragePayload
  | InsightsPayload
  | PreAnalysisPayload
  | PositioningPayload
  | ScoringPayload
  | ChatPayload;

export interface IntakePayload {
  kind: "intake";
  answered_fields: number;
  regulatory_exposure: string[];
  diligence_priorities: string[];
  red_flag_priors: string[];
  engagement_type?: string;
  buyer_archetype?: string;
  buyer_industry?: string;
  target_size_usd?: string;
  investment_size_usd?: string;
  annual_run_rate_usd?: string;
  decision_horizon_days?: string;
  deal_thesis?: string[];
  deal_stage?: string;
  internal_sponsor_role?: string;
  dissenting_voices?: string[];
  approval_path?: string;
  primary_kpi?: string[];
  measurable_targets?: string;
  kill_criteria?: string;
  alternatives_considered?: string[];
  alternatives_detail?: string;
  lock_in_tolerance?: string;
  existing_ai_systems?: string[];
  data_readiness?: string;
  training_data_sources?: string[];
  customer_data_usage_rights?: string;
  ip_indemnification_needed?: string;
  business_continuity_requirement?: string;
  multi_region_requirement?: string;
  artifacts_received?: string[];
  gaps_already_known?: string;
  diligence_team_composition?: string[];
  context_notes?: string;
}

export interface CoveragePayload {
  kind: "coverage";
  industry: string | null;
  documents_total: number;
  gaps_count: number;
  gap_summaries: string[];
}

export interface InsightsPayload {
  kind: "insights";
  insights_total: number;
  by_category: Record<string, number>;
  high_confidence_count: number;
}

export interface PreAnalysisPayload {
  kind: "pre_analysis";
  analyses_total: number;
  critical_red_flags: { flag: string; dimension: ScoreDimension | null }[];
  high_red_flags: { flag: string; dimension: ScoreDimension | null }[];
  open_questions_total: number;
}

export interface PositioningPayload {
  kind: "positioning";
  comparables: { name: string; type: string; source_url?: string }[];
  positioning_summary: string;
  confidence: "low" | "medium" | "high";
  confidence_rationale: string;
  validation_priorities: string[];
  sources: { url: string; title?: string }[];
}

export interface ScoringPayload {
  kind: "scoring";
  composite_score: number | null;
  context_aware_composite: number | null;
  decision_band: string | null;
  scores: {
    dimension: string;
    sub_criterion: string;
    score_0_to_5: number;
    operator_rationale: string;
  }[];
}

export interface ChatPayload {
  kind: "chat";
  total_turns: number;
  recent_turns: {
    asked_at: string;
    question: string;
    answer: string;
    citations: string[];
  }[];
}

// ------------------------------------------------------------------
// Dependency helpers
// ------------------------------------------------------------------

/** Transitive downstream of a given stage (everything it invalidates). */
export function downstreamStages(step: KnowledgeStep): KnowledgeStep[] {
  const out: KnowledgeStep[] = [];
  (Object.keys(STAGE_UPSTREAM) as KnowledgeStep[]).forEach((s) => {
    if (s === step) return;
    const seen = new Set<KnowledgeStep>();
    const stack = [...STAGE_UPSTREAM[s]];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      if (cur === step) {
        out.push(s);
        break;
      }
      stack.push(...STAGE_UPSTREAM[cur]);
    }
  });
  return out;
}

// ------------------------------------------------------------------
// Format helper
// ------------------------------------------------------------------

/**
 * Convert a KB snapshot into an array of plain-text evidence lines
 * suitable for inclusion in LLM prompts.
 *
 * Stale entries are included but tagged [STALE …] so the model can
 * down-weight them. Pass a pre-filtered `freshKb` if you want to
 * exclude stale data entirely (the report page does this).
 */
export function formatKnowledgeBaseEvidence(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
): string[] {
  const lines: string[] = [];
  (Object.keys(KNOWLEDGE_STEP_LABELS) as KnowledgeStep[]).forEach((step) => {
    const entry = kb[step];
    if (!entry) return;
    const label = KNOWLEDGE_STEP_LABELS[step];
    const staleTag = entry.stale
      ? ` [STALE — upstream ${(entry.stale_because ?? []).map((s) => KNOWLEDGE_STEP_LABELS[s]).join(", ")} changed since this was computed]`
      : "";
    lines.push(`[knowledge base · ${label}${staleTag}] ${entry.summary}`);
    const p = entry.payload;
    if (p.kind === "intake") {
      const emitList = (lbl: string, arr: string[] | undefined) => {
        if (arr && arr.length)
          lines.push(`[knowledge base · Intake · ${lbl}] ${arr.join(", ")}`);
      };
      const emitVal = (lbl: string, v: string | undefined) => {
        if (v && v.trim()) lines.push(`[knowledge base · Intake · ${lbl}] ${v}`);
      };
      emitList("regulatory exposure", p.regulatory_exposure);
      emitList("diligence priorities", p.diligence_priorities);
      emitList("red flag priors", p.red_flag_priors);
      emitVal("engagement type", p.engagement_type);
      emitVal("buyer archetype", p.buyer_archetype);
      emitVal("buyer industry", p.buyer_industry);
      emitVal("target size (USD)", p.target_size_usd);
      emitVal("investment size (USD)", p.investment_size_usd);
      emitVal("annual run-rate AI spend (USD)", p.annual_run_rate_usd);
      emitVal("decision horizon (days)", p.decision_horizon_days);
      emitList("deal thesis", p.deal_thesis);
      emitVal("deal stage", p.deal_stage);
      emitVal("internal sponsor role", p.internal_sponsor_role);
      emitList("dissenting voices", p.dissenting_voices);
      emitVal("approval path", p.approval_path);
      emitList("primary KPI", p.primary_kpi);
      emitVal("measurable targets", p.measurable_targets);
      emitVal("kill criteria", p.kill_criteria);
      emitList("alternatives considered", p.alternatives_considered);
      emitVal("alternatives detail", p.alternatives_detail);
      emitVal("lock-in tolerance", p.lock_in_tolerance);
      emitList("existing AI systems", p.existing_ai_systems);
      emitVal("data platform readiness", p.data_readiness);
      emitList("training data sources", p.training_data_sources);
      emitVal("customer data usage rights", p.customer_data_usage_rights);
      emitVal("IP indemnification need", p.ip_indemnification_needed);
      emitVal("business continuity requirement", p.business_continuity_requirement);
      emitVal("multi-region requirement", p.multi_region_requirement);
      emitList("artifacts received", p.artifacts_received);
      emitVal("known artifact gaps", p.gaps_already_known);
      emitList("diligence team", p.diligence_team_composition);
      emitVal("context notes", p.context_notes);
      lines.push(
        `[knowledge base · Intake · answered fields] ${p.answered_fields}`,
      );
    } else if (p.kind === "coverage") {
      lines.push(
        `[knowledge base · Coverage] industry=${p.industry ?? "unset"}, documents=${p.documents_total}, gaps=${p.gaps_count}`,
      );
      p.gap_summaries.forEach((g) =>
        lines.push(`[knowledge base · Coverage · gap] ${g}`),
      );
    } else if (p.kind === "insights") {
      lines.push(
        `[knowledge base · Insights] total=${p.insights_total}, high_confidence=${p.high_confidence_count}`,
      );
      Object.entries(p.by_category).forEach(([cat, count]) =>
        lines.push(`[knowledge base · Insights · ${cat}] count=${count}`),
      );
    } else if (p.kind === "pre_analysis") {
      lines.push(
        `[knowledge base · Pre-analysis] analyses=${p.analyses_total}, open_questions=${p.open_questions_total}`,
      );
      p.critical_red_flags.forEach((f) =>
        lines.push(
          `[knowledge base · Pre-analysis · critical red flag${f.dimension ? ` · ${f.dimension}` : ""}] ${f.flag}`,
        ),
      );
      p.high_red_flags.forEach((f) =>
        lines.push(
          `[knowledge base · Pre-analysis · high red flag${f.dimension ? ` · ${f.dimension}` : ""}] ${f.flag}`,
        ),
      );
    } else if (p.kind === "positioning") {
      lines.push(
        `[knowledge base · Positioning] confidence=${p.confidence}, comparables=${p.comparables.length}`,
      );
      if (p.positioning_summary) {
        lines.push(
          `[knowledge base · Positioning · summary] ${p.positioning_summary}`,
        );
      }
      p.comparables.forEach((c) =>
        lines.push(
          `[knowledge base · Positioning · comparable · ${c.type}] ${c.name}${c.source_url ? ` (${c.source_url})` : ""}`,
        ),
      );
      p.validation_priorities.forEach((v) =>
        lines.push(`[knowledge base · Positioning · validate] ${v}`),
      );
    } else if (p.kind === "chat") {
      lines.push(`[knowledge base · Chat] turns=${p.total_turns}`);
      p.recent_turns.slice(-8).forEach((turn) => {
        lines.push(`[knowledge base · Chat · question] ${turn.question}`);
        lines.push(`[knowledge base · Chat · answer] ${turn.answer}`);
        if (turn.citations.length) {
          lines.push(
            `[knowledge base · Chat · citations] ${turn.citations.join(", ")}`,
          );
        }
      });
    } else if (p.kind === "scoring") {
      lines.push(
        `[knowledge base · Scoring] composite=${p.composite_score?.toFixed(1) ?? "—"}, context_aware=${p.context_aware_composite?.toFixed(1) ?? "—"}${p.decision_band ? `, decision=${p.decision_band}` : ""}`,
      );
      p.scores.slice(0, 24).forEach((s) =>
        lines.push(
          `[knowledge base · Scoring · ${s.dimension}/${s.sub_criterion}] ${s.score_0_to_5.toFixed(1)}${s.operator_rationale ? ` — ${s.operator_rationale}` : ""}`,
        ),
      );
    }
  });
  return lines;
}
