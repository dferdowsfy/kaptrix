"use client";

import { useEffect, useRef, useState } from "react";
import {
  readClientKb,
  subscribeKnowledgeBase,
} from "@/lib/preview/knowledge-base";
import {
  diffKnowledgeBase,
  type ClientKb,
  type SystemSignalBatch,
} from "@/lib/preview/system-signals";

const EMPTY_KB: ClientKb = {};
const MAX_HISTORY = 20;
const PILL_AUTO_DISMISS_MS = 4500;

export interface UseSystemSignalsResult {
  /** Most recent batch; null when nothing is being shown right now. */
  current: SystemSignalBatch | null;
  /** Rolling history (most recent first). */
  history: SystemSignalBatch[];
  /** Manually dismiss the pill. */
  dismiss: () => void;
  /** Clear full history (panel action). */
  clearHistory: () => void;
}

/**
 * Watches the preview knowledge base for the active client and emits
 * structured "system signal" batches whenever real changes land.
 *
 * No batch is emitted on first mount — we seed the baseline from the
 * current KB so operators don't see a phantom "Model Updated" flash
 * just for opening a page.
 */
export function useSystemSignals(clientId: string | null | undefined): UseSystemSignalsResult {
  const [current, setCurrent] = useState<SystemSignalBatch | null>(null);
  const [history, setHistory] = useState<SystemSignalBatch[]>([]);
  const prevKbRef = useRef<ClientKb>(EMPTY_KB);
  const prevClientIdRef = useRef<string | null | undefined>(undefined);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // On client-id change, reset baseline and clear visible pill.
    if (prevClientIdRef.current !== clientId) {
      prevClientIdRef.current = clientId;
      prevKbRef.current = clientId ? readClientKb(clientId) : EMPTY_KB;
      setCurrent(null);
      setHistory([]);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    }

    if (!clientId) return;

    const handle = () => {
      const next = readClientKb(clientId);
      const prev = prevKbRef.current;
      if (next === prev) return;
      const batch = diffKnowledgeBase(prev, next);
      prevKbRef.current = next;
      if (!batch) return;

      setCurrent(batch);
      setHistory((h) => [batch, ...h].slice(0, MAX_HISTORY));

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setCurrent(null);
        dismissTimerRef.current = null;
      }, PILL_AUTO_DISMISS_MS);
    };

    const unsubscribe = subscribeKnowledgeBase(handle);
    return () => {
      unsubscribe();
    };
  }, [clientId]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  return {
    current,
    history,
    dismiss: () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
      setCurrent(null);
    },
    clearHistory: () => {
      setHistory([]);
      setCurrent(null);
    },
  };
}
