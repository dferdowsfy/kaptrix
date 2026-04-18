"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  KNOWLEDGE_STEP_LABELS,
  type KnowledgeEntry,
  type KnowledgeStep,
  readClientKb,
  subscribeKnowledgeBase,
} from "@/lib/preview/knowledge-base";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";

const STEP_ORDER: KnowledgeStep[] = [
  "intake",
  "coverage",
  "insights",
  "pre_analysis",
  "scoring",
  "positioning",
  "chat",
];

const RECENT_WINDOW_MS = 6000;

export function KbActivityIndicator() {
  const { client, ready } = useSelectedPreviewClient();
  const clientId = ready ? client.id : null;

  const kb = useSyncExternalStore(
    subscribeKnowledgeBase,
    () => readClientKb(clientId),
    () => readClientKb(null),
  );

  // Re-render every second so "recent" pulse decays without manual updates.
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();
  const syncedCount = STEP_ORDER.filter((s) => kb[s]).length;

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur sm:gap-2.5 sm:px-3.5 sm:py-2"
      title={`${syncedCount} of ${STEP_ORDER.length} workflow steps in the knowledge base for this client`}
    >
      <span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-indigo-200/80 sm:inline">
        Knowledge
      </span>
      <ul className="flex items-center gap-1.5">
        {STEP_ORDER.map((step) => {
          const entry = kb[step] as KnowledgeEntry | undefined;
          const isSynced = Boolean(entry);
          const ageMs = entry ? now - new Date(entry.submitted_at).getTime() : Infinity;
          const isRecent = isSynced && ageMs >= 0 && ageMs < RECENT_WINDOW_MS;
          return (
            <li
              key={step}
              className="group relative"
              title={
                entry
                  ? `${KNOWLEDGE_STEP_LABELS[step]} · ${entry.summary}`
                  : `${KNOWLEDGE_STEP_LABELS[step]} · not yet captured`
              }
            >
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                {isRecent && (
                  <span
                    aria-hidden
                    className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70"
                  />
                )}
                <span
                  aria-hidden
                  className={`relative inline-flex h-2 w-2 rounded-full transition ${
                    isRecent
                      ? "bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.7)]"
                      : isSynced
                        ? "bg-indigo-300"
                        : "bg-white/20"
                  }`}
                />
              </span>
              <span className="sr-only">{KNOWLEDGE_STEP_LABELS[step]}</span>
            </li>
          );
        })}
      </ul>
      <span className="text-[10px] font-medium tabular-nums text-indigo-100/80 sm:text-[11px]">
        {syncedCount}/{STEP_ORDER.length}
      </span>
    </div>
  );
}
