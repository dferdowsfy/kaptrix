"use client";

// Per-engagement store of document IDs the operator has explicitly
// removed from the Evidence & Coverage page. Used to flip the artifact
// row's status back to "Missing" even when the underlying document
// still exists server-side (demo seed data, or in-flight server delete).
//
// localStorage-backed and subscribable via useSyncExternalStore so the
// coverage matrix and any other consumer re-render the moment a remove
// click lands.

const STORAGE_KEY = "kaptrix.preview.removed-docs.v1";
const STORAGE_EVENT = "kaptrix:preview-removed-docs-change";

type Store = Record<string, string[]>;

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

export function subscribeRemovedDocs(callback: () => void): () => void {
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

const EMPTY: readonly string[] = [];

export function readRemovedDocIds(
  clientId: string | null | undefined,
): readonly string[] {
  if (!clientId) return EMPTY;
  const store = readStore();
  return store[clientId] ?? EMPTY;
}

export function addRemovedDocId(clientId: string, id: string): void {
  const store = { ...readStore() };
  const list = new Set(store[clientId] ?? []);
  list.add(id);
  store[clientId] = Array.from(list);
  writeStore(store);
}

export function clearRemovedDocIds(clientId: string): void {
  const store = { ...readStore() };
  delete store[clientId];
  writeStore(store);
}
