"use client";

import { useSyncExternalStore } from "react";
import type { AdvancedReportId } from "@/lib/reports/advanced-reports";

// ------------------------------------------------------------------
// Global, per-browser report generation store.
//
// - Lives at module scope so fetches continue if the user navigates
//   between preview pages (React Router keeps JS state alive, even
//   though the Reports page component unmounts).
// - Completed reports and errors are persisted in localStorage so
//   they survive full page reloads.
// - Active (in-flight) generations are NOT persisted — a hard reload
//   will cancel the pending fetch on the client. The completed
//   report state is what matters for the "saved" UX.
// - Uses a custom event to fan out updates to every subscribed hook
//   (same pattern as use-nav-visibility).
// ------------------------------------------------------------------

const STORAGE_KEY = "kaptrix.preview.reports.v1";
const EVENT = "kaptrix:reports-change";

export type ReportStatus = "generating" | "done" | "error";

export interface ReportRecord {
  reportId: AdvancedReportId;
  clientId: string;
  target: string;
  client: string;
  title: string;
  status: ReportStatus;
  content?: string;
  generated_at?: string; // ISO string
  started_at?: string; // ISO string
  error?: string;
}

// Key helper: each (client, reportId) is unique.
function recordKey(clientId: string, reportId: AdvancedReportId): string {
  return `${clientId}::${reportId}`;
}

// ---- In-memory state ---------------------------------------------
interface PersistedState {
  records: Record<string, ReportRecord>;
}

let state: PersistedState = { records: {} };
let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.records) return;
    // Drop stale "generating" records — they are in-memory only.
    const cleaned: Record<string, ReportRecord> = {};
    for (const [k, v] of Object.entries(parsed.records)) {
      if (v.status === "generating") continue;
      cleaned[k] = v;
    }
    state = { records: cleaned };
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    // Skip persisting in-flight generations — they won't survive a
    // reload anyway and would look "stuck" on next load.
    const snapshot: PersistedState = { records: {} };
    for (const [k, v] of Object.entries(state.records)) {
      if (v.status === "generating") continue;
      snapshot.records[k] = v;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota errors */
  }
}

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key !== STORAGE_KEY) return;
    // Re-hydrate from storage (e.g. another tab completed a report).
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedState;
        if (parsed?.records) {
          // Merge — keep in-flight generations from this tab.
          const generating: Record<string, ReportRecord> = {};
          for (const [k, v] of Object.entries(state.records)) {
            if (v.status === "generating") generating[k] = v;
          }
          state = { records: { ...parsed.records, ...generating } };
        }
      }
    } catch {
      /* ignore */
    }
    cb();
  };
  const onLocal = () => cb();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onLocal);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onLocal);
  };
}

function getSnapshot(): PersistedState {
  hydrate();
  return state;
}

function getServerSnapshot(): PersistedState {
  return { records: {} };
}

// ---- Public API --------------------------------------------------

export interface StartArgs {
  reportId: AdvancedReportId;
  clientId: string;
  target: string;
  knowledgeBase: string;
  title: string;
}

export function getReport(
  clientId: string,
  reportId: AdvancedReportId,
): ReportRecord | undefined {
  return getSnapshot().records[recordKey(clientId, reportId)];
}

export function getAllRecords(): ReportRecord[] {
  return Object.values(getSnapshot().records);
}

export function getActiveGenerationCount(): number {
  return getAllRecords().filter((r) => r.status === "generating").length;
}

function setRecord(rec: ReportRecord) {
  state = {
    records: {
      ...state.records,
      [recordKey(rec.clientId, rec.reportId)]: rec,
    },
  };
  persist();
  notify();
}

export function clearReport(clientId: string, reportId: AdvancedReportId) {
  const key = recordKey(clientId, reportId);
  if (!state.records[key]) return;
  const next = { ...state.records };
  delete next[key];
  state = { records: next };
  persist();
  notify();
}

/**
 * Kick off a generation. Returns immediately; the fetch continues in
 * the background even if the triggering component unmounts. Calling
 * this for a report that is already `generating` is a no-op.
 */
export function startGeneration(args: StartArgs): void {
  hydrate();
  const existing = getReport(args.clientId, args.reportId);
  if (existing?.status === "generating") return;

  setRecord({
    reportId: args.reportId,
    clientId: args.clientId,
    target: args.target,
    client: existing?.client ?? "",
    title: args.title,
    status: "generating",
    started_at: new Date().toISOString(),
  });

  // Fire and forget — do not await.
  void runGeneration(args);
}

async function runGeneration(args: StartArgs): Promise<void> {
  try {
    const res = await fetch("/api/reports/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: args.clientId,
        report_type: args.reportId,
        knowledge_base: args.knowledgeBase,
      }),
    });
    const json = (await res.json()) as {
      content?: string;
      generated_at?: string;
      title?: string;
      target?: string;
      client?: string;
      error?: string;
    };

    if (!res.ok || !json.content) {
      setRecord({
        reportId: args.reportId,
        clientId: args.clientId,
        target: args.target,
        client: "",
        title: args.title,
        status: "error",
        error: json.error ?? `Request failed (${res.status})`,
      });
      return;
    }

    setRecord({
      reportId: args.reportId,
      clientId: args.clientId,
      target: json.target ?? args.target,
      client: json.client ?? "",
      title: json.title ?? args.title,
      status: "done",
      content: json.content,
      generated_at: json.generated_at ?? new Date().toISOString(),
    });
  } catch (err) {
    setRecord({
      reportId: args.reportId,
      clientId: args.clientId,
      target: args.target,
      client: "",
      title: args.title,
      status: "error",
      error: err instanceof Error ? err.message : "Network error",
    });
  }
}

// ---- React hook --------------------------------------------------

export function useReportStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const records = Object.values(snapshot.records);
  const generating = records.filter((r) => r.status === "generating");
  return {
    records,
    generating,
    activeCount: generating.length,
    get: (clientId: string, reportId: AdvancedReportId) =>
      snapshot.records[recordKey(clientId, reportId)],
  };
}
