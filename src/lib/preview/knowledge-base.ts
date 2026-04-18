"use client";

import type { ScoreDimension } from "@/lib/types";

// ------------------------------------------------------------------
// Client-side per-client "knowledge base" for the preview experience.
//
// Workflow steps and runtime artifacts are captured into this KB.
// This includes structured submissions (intake/coverage/insights/
// pre-analysis), generated positioning outputs, and chat turns.
// Downstream steps read the KB so the assistant can answer with all
// gathered data without requiring manual "add to knowledge base"
// actions.
//
// Storage is localStorage only (preview mode). A production build
// would persist this to Supabase under a per-engagement knowledge
// base table.
// ------------------------------------------------------------------

export const PREVIEW_KB_STORAGE_KEY = "kaptrix.preview.kb.v1";
const STORAGE_EVENT = "kaptrix:preview-kb-change";

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

/** A single submitted snapshot for one workflow step. */
export interface KnowledgeEntry {
  step: KnowledgeStep;
  /** ISO timestamp of the submit action. */
  submitted_at: string;
  /** Operator-facing one-line summary of what was submitted. */
  summary: string;
  /** Step-specific structured payload (kept open for forward compat). */
  payload: KnowledgePayload;
}

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

/** Full KB shape — keyed by client (engagement) id. */
export type KnowledgeBase = Record<string, Partial<Record<KnowledgeStep, KnowledgeEntry>>>;

// ------------------------------------------------------------------
// Storage helpers
// ------------------------------------------------------------------

// Cache the parsed KB keyed off the raw localStorage string so that
// `useSyncExternalStore` gets a stable snapshot reference between
// renders. Without this, every render returns a freshly parsed object
// and React enters an infinite update loop (error #185).
let cachedRaw: string | null | undefined;
let cachedKb: KnowledgeBase = {};
const emptyClientEntry: Readonly<Partial<Record<KnowledgeStep, KnowledgeEntry>>> =
  Object.freeze({});
const clientEntryCache = new Map<
  string,
  Partial<Record<KnowledgeStep, KnowledgeEntry>>
>();

function readRaw(): KnowledgeBase {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PREVIEW_KB_STORAGE_KEY);
    if (raw === cachedRaw) return cachedKb;
    cachedRaw = raw;
    cachedKb = raw ? (JSON.parse(raw) as KnowledgeBase) : {};
    clientEntryCache.clear();
    return cachedKb;
  } catch {
    cachedRaw = null;
    cachedKb = {};
    clientEntryCache.clear();
    return cachedKb;
  }
}

function writeRaw(kb: KnowledgeBase): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(kb);
  window.localStorage.setItem(PREVIEW_KB_STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedKb = kb;
  clientEntryCache.clear();
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function readClientKb(
  clientId: string | null | undefined,
): Partial<Record<KnowledgeStep, KnowledgeEntry>> {
  if (!clientId) return emptyClientEntry;
  const kb = readRaw();
  const entry = kb[clientId];
  if (!entry) return emptyClientEntry;
  const cached = clientEntryCache.get(clientId);
  if (cached === entry) return cached;
  clientEntryCache.set(clientId, entry);
  return entry;
}

export function submitToKnowledgeBase(
  clientId: string,
  entry: KnowledgeEntry,
): void {
  const kb = readRaw();
  const prior = kb[clientId] ?? {};
  kb[clientId] = { ...prior, [entry.step]: entry };
  writeRaw(kb);
}

function compactText(value: string, max = 220): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

const MAX_CHAT_TURNS_IN_KB = 24;

export function appendChatTurnToKnowledgeBase(args: {
  clientId: string;
  question: string;
  answer: string;
  citations?: string[];
}): void {
  const { clientId, question, answer, citations = [] } = args;
  const existing = readClientKb(clientId).chat;
  const priorTurns =
    existing?.payload.kind === "chat" ? existing.payload.recent_turns : [];

  const nextTurns = [
    ...priorTurns,
    {
      asked_at: new Date().toISOString(),
      question: compactText(question, 280),
      answer: compactText(answer, 520),
      citations: citations.slice(0, 6),
    },
  ].slice(-MAX_CHAT_TURNS_IN_KB);

  const payload: ChatPayload = {
    kind: "chat",
    total_turns: nextTurns.length,
    recent_turns: nextTurns,
  };

  submitToKnowledgeBase(clientId, {
    step: "chat",
    submitted_at: new Date().toISOString(),
    summary: `Stored ${nextTurns.length} chat turn${nextTurns.length === 1 ? "" : "s"}; latest question: ${compactText(question, 96)}`,
    payload,
  });
}

export function submitPositioningToKnowledgeBase(args: {
  clientId: string;
  positioning: {
    comparables?: { name: string; type: string; source_url?: string }[];
    positioning_summary?: string;
    confidence?: "low" | "medium" | "high";
    confidence_rationale?: string;
    investment_interpretation?: { validation_priorities?: string[] };
  };
  sources?: { url: string; title?: string }[];
}): void {
  const comparables = (args.positioning.comparables ?? []).slice(0, 10);
  const payload: PositioningPayload = {
    kind: "positioning",
    comparables,
    positioning_summary: compactText(
      args.positioning.positioning_summary ?? "",
      320,
    ),
    confidence: args.positioning.confidence ?? "medium",
    confidence_rationale: compactText(
      args.positioning.confidence_rationale ?? "",
      320,
    ),
    validation_priorities: (
      args.positioning.investment_interpretation?.validation_priorities ?? []
    )
      .map((v) => compactText(v, 180))
      .slice(0, 8),
    sources: (args.sources ?? []).slice(0, 20),
  };

  submitToKnowledgeBase(args.clientId, {
    step: "positioning",
    submitted_at: new Date().toISOString(),
    summary: `${comparables.length} comparable${comparables.length === 1 ? "" : "s"} identified (${payload.confidence} confidence).`,
    payload,
  });
}

export function submitScoringToKnowledgeBase(args: {
  clientId: string;
  scores: {
    dimension: string;
    sub_criterion: string;
    score_0_to_5: number;
    operator_rationale?: string | null;
  }[];
  composite_score?: number | null;
  context_aware_composite?: number | null;
  decision_band?: string | null;
}): void {
  const compactScores = args.scores
    .map((s) => ({
      dimension: s.dimension,
      sub_criterion: s.sub_criterion,
      score_0_to_5: Number(s.score_0_to_5),
      operator_rationale: compactText(s.operator_rationale ?? "", 240),
    }))
    .slice(0, 60);

  const payload: ScoringPayload = {
    kind: "scoring",
    composite_score: args.composite_score ?? null,
    context_aware_composite: args.context_aware_composite ?? null,
    decision_band: args.decision_band ?? null,
    scores: compactScores,
  };

  const summary = `Composite ${args.composite_score?.toFixed(1) ?? "—"} (context ${args.context_aware_composite?.toFixed(1) ?? "—"}); ${compactScores.length} sub-criteria scored.`;

  submitToKnowledgeBase(args.clientId, {
    step: "scoring",
    submitted_at: new Date().toISOString(),
    summary,
    payload,
  });
}

export function clearClientKb(clientId: string): void {
  const kb = readRaw();
  if (!kb[clientId]) return;
  delete kb[clientId];
  writeRaw(kb);
}

export function subscribeKnowledgeBase(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== PREVIEW_KB_STORAGE_KEY) return;
    cb();
  };
  const onLocal = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(STORAGE_EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(STORAGE_EVENT, onLocal);
  };
}

// ------------------------------------------------------------------
// Formatting: render the submitted KB as plain-text evidence lines so
// downstream surfaces (chatbot, scoring, recommendations) can fold
// operator-submitted intake/coverage/insights/pre-analysis answers
// into their prompts or local fallback matches.
// ------------------------------------------------------------------

export function formatKnowledgeBaseEvidence(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
): string[] {
  const lines: string[] = [];
  (Object.keys(KNOWLEDGE_STEP_LABELS) as KnowledgeStep[]).forEach((step) => {
    const entry = kb[step];
    if (!entry) return;
    const label = KNOWLEDGE_STEP_LABELS[step];
    lines.push(`[knowledge base · ${label}] ${entry.summary}`);
    const p = entry.payload;
    if (p.kind === "intake") {
      if (p.regulatory_exposure.length)
        lines.push(
          `[knowledge base · Intake · regulatory exposure] ${p.regulatory_exposure.join(", ")}`,
        );
      if (p.diligence_priorities.length)
        lines.push(
          `[knowledge base · Intake · diligence priorities] ${p.diligence_priorities.join(", ")}`,
        );
      if (p.red_flag_priors.length)
        lines.push(
          `[knowledge base · Intake · red flag priors] ${p.red_flag_priors.join(", ")}`,
        );
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
