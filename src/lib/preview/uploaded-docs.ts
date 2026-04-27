"use client";

// Per-engagement store of documents the user has uploaded through the
// preview "Diligence documents" panel. We keep the extracted text
// client-side so the chat assistant can cite it without requiring a
// full Supabase storage + RLS setup in preview mode.

const STORAGE_KEY = "kaptrix.preview.uploaded-docs.v1";
const STORAGE_EVENT = "kaptrix:preview-uploaded-docs-change";

export type UploadedDocStatus =
  | "queued"
  | "uploading"
  | "parsing"
  | "extracting"
  | "parsed"
  | "failed";

export interface UploadedDoc {
  id: string;
  client_id: string;
  filename: string;
  category: string;
  mime_type: string;
  file_size_bytes: number;
  uploaded_at: string;
  parse_status: UploadedDocStatus;
  /** 0–100 while status is "uploading". */
  upload_percent?: number;
  /** Extracted text (vision markdown for images). Present when parsed. */
  parsed_text?: string;
  /** Rough token estimate of the parsed_text. */
  token_count?: number;
  /** Failure reason if parse_status === "failed". */
  error?: string;
  /** Number of KnowledgeInsights extracted from this doc (set once extraction completes). */
  insights_count?: number;
}

type Store = Record<string, UploadedDoc[]>;

let cachedRaw: string | null | undefined;
let cachedStore: Store = {};

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedStore;
    cachedRaw = raw;
    cachedStore = raw ? (JSON.parse(raw) as Store) : {};
    return cachedStore;
  } catch {
    cachedRaw = null;
    cachedStore = {};
    return cachedStore;
  }
}

function writeStore(next: Store): void {
  if (typeof window === "undefined") return;
  const serialized = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedStore = next;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function subscribeUploadedDocs(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

const EMPTY: readonly UploadedDoc[] = Object.freeze([]);

export function readUploadedDocs(
  clientId: string | null | undefined,
): readonly UploadedDoc[] {
  if (!clientId) return EMPTY;
  const store = readStore();
  return store[clientId] ?? EMPTY;
}

/**
 * Flatten every client's uploads into one array. Used by the global
 * upload-activity bar so an in-flight upload remains visible across
 * preview tab navigation, regardless of which client is currently
 * selected.
 *
 * Stable identity when nothing has changed (returns the same array
 * reference) so useSyncExternalStore doesn't churn.
 */
let allUploadsCache: { raw: string | null; list: readonly UploadedDoc[] } = {
  raw: null,
  list: EMPTY,
};
export function readAllUploadedDocs(): readonly UploadedDoc[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === allUploadsCache.raw) return allUploadsCache.list;
  const store = readStore();
  const list: UploadedDoc[] = [];
  for (const clientId of Object.keys(store)) {
    for (const d of store[clientId] ?? []) list.push(d);
  }
  allUploadsCache = { raw, list };
  return list;
}

export function upsertUploadedDoc(doc: UploadedDoc): void {
  const store = { ...readStore() };
  const list = (store[doc.client_id] ?? []).slice();
  const idx = list.findIndex((d) => d.id === doc.id);
  if (idx >= 0) list[idx] = doc;
  else list.unshift(doc);
  store[doc.client_id] = list;
  writeStore(store);
}

export function removeUploadedDoc(clientId: string, id: string): void {
  const store = { ...readStore() };
  const list = (store[clientId] ?? []).filter((d) => d.id !== id);
  if (list.length === 0) delete store[clientId];
  else store[clientId] = list;
  writeStore(store);
}

/** Build evidence lines for the chat / scoring / report knowledge_base
 *  payload. Per-doc budget defaults generous enough to fit a multi-slide
 *  pitch deck's full parsed text so the assistant can actually cite it
 *  instead of ending mid-slide. Total cap keeps the prompt bounded. */
export function formatUploadedDocsEvidence(
  clientId: string | null | undefined,
  maxTotalChars = 40_000,
  maxPerDocChars = 12_000,
): string[] {
  const docs = readUploadedDocs(clientId);
  const lines: string[] = [];
  let used = 0;
  for (const d of docs) {
    if (!d.parsed_text) continue;
    const header = `[uploaded · ${d.filename} · ${d.category}]`;
    const remaining = Math.max(0, maxTotalChars - used);
    if (remaining <= header.length + 64) break;
    const perDocBudget = Math.min(maxPerDocChars, remaining - header.length - 1);
    const body = d.parsed_text.slice(0, perDocBudget).trim();
    const line = `${header}\n${body}`;
    lines.push(line);
    used += line.length + 1;
  }
  return lines;
}
