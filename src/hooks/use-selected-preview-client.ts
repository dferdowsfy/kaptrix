"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_PREVIEW_CLIENT_ID,
  getPreviewClient,
  PREVIEW_CLIENTS,
  SELECTED_CLIENT_STORAGE_KEY,
  type PreviewClientSummary,
} from "@/lib/preview-clients";

const STORAGE_EVENT = "kaptrix:selected-preview-client-change";
const PREVIEW_CLIENT_IDS = new Set(PREVIEW_CLIENTS.map((client) => client.id));

function readSelectedPreviewClientId(): string {
  if (typeof window === "undefined") return DEFAULT_PREVIEW_CLIENT_ID;

  try {
    const stored = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
    return stored && PREVIEW_CLIENT_IDS.has(stored)
      ? stored
      : DEFAULT_PREVIEW_CLIENT_ID;
  } catch {
    return DEFAULT_PREVIEW_CLIENT_ID;
  }
}

function subscribeToSelectedPreviewClient(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SELECTED_CLIENT_STORAGE_KEY) return;
    callback();
  };
  const handleLocalChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, handleLocalChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, handleLocalChange);
  };
}

function notifySelectedPreviewClientChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function subscribeToHydration(): () => void {
  return () => {};
}

export function useSelectedPreviewClient(): {
  selectedId: string;
  client: PreviewClientSummary;
  setSelectedId: (id: string) => void;
  allClients: PreviewClientSummary[];
  ready: boolean;
} {
  const selectedId = useSyncExternalStore(
    subscribeToSelectedPreviewClient,
    readSelectedPreviewClientId,
    () => DEFAULT_PREVIEW_CLIENT_ID,
  );
  const ready = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  const setSelectedId = (id: string) => {
    if (!PREVIEW_CLIENT_IDS.has(id) || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, id);
    } catch {
      // ignore
    }

    notifySelectedPreviewClientChanged();
  };

  return {
    selectedId,
    client: getPreviewClient(selectedId),
    setSelectedId,
    allClients: PREVIEW_CLIENTS,
    ready,
  };
}
