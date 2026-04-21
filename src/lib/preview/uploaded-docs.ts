"use client";

// Per-engagement store of documents the user has uploaded through the
// preview "Diligence documents" panel. We keep the extracted text
// client-side so the chat assistant can cite it without requiring a
// full Supabase storage + RLS setup in preview mode.

const STORAGE_KEY = "kaptrix.preview.uploaded-docs.v1";
const STORAGE_EVENT = "kaptrix:preview-uploaded-docs-change";

export type UploadedDocStatus =
  | "queued"
  | "parsing"
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
  /** Extracted text (vision markdown for images). Present when parsed. */
  parsed_text?: string;
  /** Rough token estimate of the parsed_text. */
  token_count?: number;
  /** Failure reason if parse_status === "failed". */
  error?: string;
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

/** Build compact evidence lines for the chat knowledge_base payload. */
export function formatUploadedDocsEvidence(
  clientId: string | null | undefined,
  maxTotalChars = 6_000,
): string[] {
  const docs = readUploadedDocs(clientId);
  const lines: string[] = [];
  let used = 0;
  for (const d of docs) {
    if (!d.parsed_text) continue;
    const header = `[uploaded · ${d.filename} · ${d.category}]`;
    // Cap each doc to keep context balanced across multiple uploads.
    const remaining = Math.max(0, maxTotalChars - used);
    if (remaining <= header.length + 32) break;
    const perDocBudget = Math.min(1_800, remaining - header.length - 1);
    const body = d.parsed_text.slice(0, perDocBudget).trim();
    const line = `${header}\n${body}`;
    lines.push(line);
    used += line.length + 1;
  }
  return lines;
}
