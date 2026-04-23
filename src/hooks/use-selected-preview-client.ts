"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_PREVIEW_CLIENT_ID,
  PREVIEW_CLIENTS,
  SELECTED_CLIENT_STORAGE_KEY,
  type PreviewClientSummary,
} from "@/lib/preview-clients";
import { usePreviewClients } from "@/hooks/use-preview-data";

const STORAGE_EVENT = "kaptrix:selected-preview-client-change";

function readSelectedPreviewClientId(): string {
  if (typeof window === "undefined") return DEFAULT_PREVIEW_CLIENT_ID;
  try {
    return (
      window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY) ??
      DEFAULT_PREVIEW_CLIENT_ID
    );
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
  const { clients } = usePreviewClients();
  const roster = clients.length > 0 ? clients : PREVIEW_CLIENTS;
  const rosterIds = new Set(roster.map((c) => c.id));

  const storedId = useSyncExternalStore(
    subscribeToSelectedPreviewClient,
    readSelectedPreviewClientId,
    () => DEFAULT_PREVIEW_CLIENT_ID,
  );
  const ready = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  const selectedId =
    storedId || (roster[0]?.id ?? DEFAULT_PREVIEW_CLIENT_ID);

  const resolved =
    roster.find((c) => c.id === selectedId) ?? {
      // Unknown id — likely a newly created engagement whose roster entry
      // hasn't loaded yet. Return a blank shell so the UI doesn't show the
      // default demo client in the header.
      id: selectedId,
      target: "",
      client: "",
      industry: "",
      deal_stage: "preliminary",
      status: "intake",
      status_label: "In intake",
      tier: "standard" as const,
      composite_score: null,
      recommendation: null,
      fee_usd: 0,
      deadline: "",
      summary: "",
    };

  const setSelectedId = (id: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, id);
    } catch {
      // ignore
    }
    notifySelectedPreviewClientChanged();
  };

  return {
    selectedId,
    client: resolved,
    setSelectedId,
    allClients: roster,
    ready,
  };
}
