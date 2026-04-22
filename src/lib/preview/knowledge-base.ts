"use client";

// ------------------------------------------------------------------
// Client-side per-client knowledge base.
//
// All types, the dependency graph, and formatKnowledgeBaseEvidence
// live in kb-format.ts (no "use client") so server routes can also
// import them. This file re-exports everything and adds the
// localStorage + Supabase write-through logic.
// ------------------------------------------------------------------

export {
  type KnowledgeStep,
  type KnowledgeEntry,
  type KnowledgePayload,
  type IntakePayload,
  type CoveragePayload,
  type InsightsPayload,
  type PreAnalysisPayload,
  type PositioningPayload,
  type ScoringPayload,
  type ChatPayload,
  KNOWLEDGE_STEP_LABELS,
  STAGE_UPSTREAM,
  downstreamStages,
  formatKnowledgeBaseEvidence,
} from "@/lib/preview/kb-format";

import {
  type KnowledgeStep,
  type KnowledgeEntry,
  type KnowledgePayload,
  type ChatPayload,
  type PositioningPayload,
  type ScoringPayload,
  STAGE_UPSTREAM,
  downstreamStages,
} from "@/lib/preview/kb-format";

export const PREVIEW_KB_STORAGE_KEY = "kaptrix.preview.kb.v1";
const STORAGE_EVENT = "kaptrix:preview-kb-change";

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

// ------------------------------------------------------------------
// Supabase write-through & hydration
// ------------------------------------------------------------------
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const SYNC_DEBOUNCE_MS = 800;

/** Debounced fire-and-forget PUT to Supabase for a single client KB. */
function scheduleSupabaseSync(clientId: string): void {
  if (typeof window === "undefined") return;
  const existing = syncTimers.get(clientId);
  if (existing) clearTimeout(existing);
  syncTimers.set(
    clientId,
    setTimeout(() => {
      syncTimers.delete(clientId);
      const entries = readClientKb(clientId);
      if (!entries || Object.keys(entries).length === 0) return;
      fetch("/api/preview/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagement_id: clientId, entries }),
      }).catch(() => {
        // Silently ignore — localStorage still has the data.
      });
    }, SYNC_DEBOUNCE_MS),
  );
}

/**
 * Hydrate the localStorage KB from Supabase for one client.
 * Supabase wins when its entry has a higher version (it came from
 * another device/session). Returns true when the local KB was updated.
 */
export async function hydrateKnowledgeBaseFromSupabase(
  clientId: string,
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(
      `/api/preview/knowledge-base?engagement_id=${encodeURIComponent(clientId)}`,
    );
    if (!res.ok) return false;
    const json = await res.json();
    if (!json.authenticated || !json.entries) return false;
    const remote = json.entries as Partial<Record<KnowledgeStep, KnowledgeEntry>>;
    if (Object.keys(remote).length === 0) return false;

    const kb = readRaw();
    const local = kb[clientId] ?? {};
    let changed = false;
    const merged = { ...local };

    for (const step of Object.keys(remote) as KnowledgeStep[]) {
      const r = remote[step];
      if (!r) continue;
      const l = local[step];
      // Remote wins if local doesn't exist or remote version is newer.
      if (!l || (r.version ?? 0) > (l.version ?? 0)) {
        merged[step] = r;
        changed = true;
      }
    }

    if (changed) {
      kb[clientId] = merged;
      writeRaw(kb);
    }
    return changed;
  } catch {
    return false;
  }
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

/**
 * Write or update a KB entry for a client.
 *
 * `options.preserveStale` — when true the entry keeps whatever stale
 * flags were already set and does NOT propagate downstream staleness.
 * Use this for auto-sync writes (e.g. the scoring panel effect) so
 * that an automatic payload refresh doesn't accidentally clear the
 * "upstream changed" signal that the operator hasn't reviewed yet.
 */
export function submitToKnowledgeBase(
  clientId: string,
  entry: KnowledgeEntry,
  options?: { preserveStale?: boolean },
): void {
  const kb = readRaw();
  const prior = kb[clientId] ?? {};
  const preserveStale = options?.preserveStale === true;

  // Context-engine contract:
  //   1) Stamp the new entry with a monotonic version for this client.
  //   2) If this stage has downstream derivations in the KB, mark them
  //      `stale: true` so the UI refuses to treat them as authoritative
  //      and recomputes from fresh upstream before use.
  //   3) Chat is a side-channel and never invalidates anything.
  const maxPriorVersion = Object.values(prior).reduce(
    (max, e) => Math.max(max, e?.version ?? 0),
    0,
  );
  const nextVersion = maxPriorVersion + 1;

  const priorEntry = prior[entry.step];
  const stamped: KnowledgeEntry = {
    ...entry,
    version: nextVersion,
    // When preserveStale is set, keep the existing stale flags intact
    // so the operator still sees the "upstream changed" banner.
    stale: preserveStale ? (priorEntry?.stale ?? false) : false,
    stale_because: preserveStale ? (priorEntry?.stale_because ?? undefined) : undefined,
  };

  const next: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {
    ...prior,
    [entry.step]: stamped,
  };

  // Only propagate downstream staleness on real (non-auto-sync) writes.
  if (!preserveStale && entry.step !== "chat") {
    for (const downstream of downstreamStages(entry.step)) {
      const existing = next[downstream];
      if (!existing) continue;
      const already = existing.stale_because ?? [];
      next[downstream] = {
        ...existing,
        stale: true,
        stale_because: already.includes(entry.step)
          ? already
          : [...already, entry.step],
      };
    }
  }

  kb[clientId] = next;
  writeRaw(kb);

  // Persist to Supabase (fire-and-forget, debounced per client).
  scheduleSupabaseSync(clientId);
}

/**
 * Context-engine slice accessor.
 *
 * Returns ONLY the upstream dependencies of `stage` per the dependency
 * graph, so derivation code cannot accidentally consume sibling or
 * downstream state. Stale upstream entries are included but their
 * `stale` flag is preserved so callers can refuse to derive on top of
 * unsettled upstream if they choose.
 */
export function currentContextSlice(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
  stage: KnowledgeStep,
): Partial<Record<KnowledgeStep, KnowledgeEntry>> {
  const deps = STAGE_UPSTREAM[stage];
  const out: Partial<Record<KnowledgeStep, KnowledgeEntry>> = {};
  for (const d of deps) {
    const e = kb[d];
    if (e) out[d] = e;
  }
  return out;
}

/** Are any of a stage's upstream dependencies currently stale or newer than it? */
export function isStageDirty(
  kb: Partial<Record<KnowledgeStep, KnowledgeEntry>>,
  stage: KnowledgeStep,
): { dirty: boolean; reasons: KnowledgeStep[] } {
  const self = kb[stage];
  const reasons: KnowledgeStep[] = [];
  if (!self) return { dirty: false, reasons };
  if (self.stale) {
    return { dirty: true, reasons: self.stale_because ?? [] };
  }
  const selfVersion = self.version ?? 0;
  for (const d of STAGE_UPSTREAM[stage]) {
    const up = kb[d];
    if (!up) continue;
    if ((up.version ?? 0) > selfVersion) reasons.push(d);
  }
  return { dirty: reasons.length > 0, reasons };
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
  /** When true the write preserves any existing stale flags on the
   *  scoring entry so the "upstream changed" banner stays visible
   *  until the operator explicitly clicks "Re-run scoring". */
  autoSync?: boolean;
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

  submitToKnowledgeBase(
    args.clientId,
    {
      step: "scoring",
      submitted_at: new Date().toISOString(),
      summary,
      payload,
    },
    { preserveStale: args.autoSync },
  );
}

export function clearClientKb(clientId: string): void {
  const kb = readRaw();
  if (!kb[clientId]) return;
  delete kb[clientId];
  writeRaw(kb);
  scheduleSupabaseSync(clientId);
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
