"use client";

import { useSyncExternalStore } from "react";
import {
  getAdvancedReportConfig,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";

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
  /** Multi-section generation progress (absent for legacy single-call reports). */
  sectionsTotal?: number;
  sectionsDone?: number;
  /** Label of the section currently being generated, if any. */
  currentSection?: string;
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

// ---- Server sync (Supabase-backed, optional) ---------------------
// Best-effort: if the user is not signed in, these calls are no-ops.
// Runs alongside localStorage so offline still works.

let serverHydrated = false;

async function hydrateFromServer() {
  if (serverHydrated) return;
  serverHydrated = true;
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/reports/store", { method: "GET" });
    if (!res.ok) return;
    const json = (await res.json()) as {
      authenticated: boolean;
      reports: Array<{
        client_id: string;
        report_type: string;
        title: string;
        target: string;
        client_name: string | null;
        content: string;
        generated_at: string;
      }>;
    };
    if (!json.authenticated || !Array.isArray(json.reports)) return;

    const merged: Record<string, ReportRecord> = { ...state.records };
    for (const r of json.reports) {
      const key = recordKey(r.client_id, r.report_type as AdvancedReportId);
      const existing = merged[key];
      // Don't clobber an in-flight generation.
      if (existing?.status === "generating") continue;
      merged[key] = {
        reportId: r.report_type as AdvancedReportId,
        clientId: r.client_id,
        target: r.target,
        client: r.client_name ?? "",
        title: r.title,
        status: "done",
        content: r.content,
        generated_at: r.generated_at,
      };
    }
    state = { records: merged };
    persist();
    notify();
  } catch {
    /* offline or network error — keep localStorage data */
  }
}

function syncToServer(rec: ReportRecord) {
  if (rec.status !== "done" || !rec.content) return;
  if (typeof window === "undefined") return;
  void fetch("/api/reports/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: rec.clientId,
      report_type: rec.reportId,
      title: rec.title,
      target: rec.target,
      client_name: rec.client,
      content: rec.content,
      generated_at: rec.generated_at,
    }),
  }).catch(() => {
    /* silent — anonymous users get 401; offline is fine */
  });
}

function deleteOnServer(clientId: string, reportId: AdvancedReportId) {
  if (typeof window === "undefined") return;
  void fetch("/api/reports/store", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, report_type: reportId }),
  }).catch(() => {
    /* silent */
  });
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

const SERVER_SNAPSHOT: PersistedState = { records: {} };

function getServerSnapshot(): PersistedState {
  return SERVER_SNAPSHOT;
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
  syncToServer(rec);
  notify();
}

export function clearReport(clientId: string, reportId: AdvancedReportId) {
  const key = recordKey(clientId, reportId);
  if (!state.records[key]) return;
  const next = { ...state.records };
  delete next[key];
  state = { records: next };
  persist();
  deleteOnServer(clientId, reportId);
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
  const config = getAdvancedReportConfig(args.reportId);
  const sections = config?.sections;

  // ---------- NEW: multi-section streamed generation ----------
  if (sections && sections.length > 0) {
    let accumulated = "";
    const total = sections.length;
    const client = getReport(args.clientId, args.reportId)?.client ?? "";
    let targetName = args.target;

    // Initialize progress on the record up-front.
    setRecord({
      reportId: args.reportId,
      clientId: args.clientId,
      target: args.target,
      client,
      title: args.title,
      status: "generating",
      started_at: new Date().toISOString(),
      content: "",
      sectionsTotal: total,
      sectionsDone: 0,
      currentSection: sections[0]?.label,
    });

    for (let i = 0; i < total; i++) {
      const section = sections[i];

      // Mark which section we're on (live progress for the UI).
      setRecord({
        reportId: args.reportId,
        clientId: args.clientId,
        target: targetName,
        client,
        title: args.title,
        status: "generating",
        content: accumulated,
        sectionsTotal: total,
        sectionsDone: i,
        currentSection: section.label,
      });

      try {
        const res = await fetch("/api/reports/llm/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: args.clientId,
            report_type: args.reportId,
            section_id: section.id,
            knowledge_base: args.knowledgeBase,
            prior_markdown: accumulated,
          }),
        });
        const json = (await res.json()) as {
          content?: string;
          target?: string;
          client?: string;
          error?: string;
        };
        if (!res.ok || !json.content) {
          setRecord({
            reportId: args.reportId,
            clientId: args.clientId,
            target: targetName,
            client,
            title: args.title,
            status: "error",
            content: accumulated,
            sectionsTotal: total,
            sectionsDone: i,
            currentSection: section.label,
            error:
              json.error ??
              `Section "${section.label}" failed (HTTP ${res.status})`,
          });
          return;
        }

        accumulated = accumulated
          ? `${accumulated}\n\n${json.content.trim()}`
          : json.content.trim();
        if (json.target) targetName = json.target;
      } catch (err) {
        setRecord({
          reportId: args.reportId,
          clientId: args.clientId,
          target: targetName,
          client,
          title: args.title,
          status: "error",
          content: accumulated,
          sectionsTotal: total,
          sectionsDone: i,
          currentSection: section.label,
          error:
            err instanceof Error
              ? `Section "${section.label}": ${err.message}`
              : "Network error",
        });
        return;
      }
    }

    // All sections completed. Log section / heading counts so we can
    // diagnose reports that come back unexpectedly short (e.g. a
    // Company Readiness Report that only renders the snapshot).
    const headingCount = (accumulated.match(/^##\s+/gm) ?? []).length;
    console.log("[report-store] generation complete", {
      report_id: args.reportId,
      client_id: args.clientId,
      sections_total: total,
      sections_done: total,
      heading_count: headingCount,
      content_length: accumulated.length,
    });
    if (total >= 5 && headingCount < total - 2) {
      console.warn(
        `[report-store] short report — ${args.reportId} produced ${headingCount} '## ' headings for ${total} sections; the LLM may be collapsing or skipping body sections`,
      );
    }
    setRecord({
      reportId: args.reportId,
      clientId: args.clientId,
      target: targetName,
      client,
      title: args.title,
      status: "done",
      content: accumulated,
      generated_at: new Date().toISOString(),
      sectionsTotal: total,
      sectionsDone: total,
    });
    return;
  }

  // ---------- Legacy: single-call generation (used if a report has
  // no `sections` defined — kept as a fallback for back-compat). ----
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
  // Kick off a one-shot server hydration on first client render.
  if (typeof window !== "undefined" && !serverHydrated) {
    void hydrateFromServer();
  }
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
