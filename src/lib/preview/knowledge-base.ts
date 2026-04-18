"use client";

import type { ScoreDimension } from "@/lib/types";

// ------------------------------------------------------------------
// Client-side per-client "knowledge base" for the preview experience.
//
// Each workflow step (intake, coverage, insights, pre-analysis) can
// "submit" a structured snapshot into this KB. Downstream steps —
// notably scoring — read from the KB to factor earlier context into
// the composite score and investment recommendation.
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
  | "pre_analysis";

export const KNOWLEDGE_STEP_LABELS: Record<KnowledgeStep, string> = {
  intake: "Intake",
  coverage: "Coverage",
  insights: "Insights",
  pre_analysis: "Pre-analysis",
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
  | PreAnalysisPayload;

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
