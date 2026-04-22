"use client";

import { useSyncExternalStore } from "react";
import type { SuggestedScore } from "@/app/api/scores/suggest/route";

// ------------------------------------------------------------------
// Global module-level scoring run store.
//
// Mirrors the pattern in report-store.ts so:
//   - The LLM fetch continues even if the user navigates away from
//     the scoring page (React keeps the module alive).
//   - The header pill shows "Generating scores…" during the fetch.
//   - When the user returns to the scoring page the result is
//     available immediately from this store (plus localStorage cache).
// ------------------------------------------------------------------

const EVENT = "kaptrix:score-run-change";

export type ScoreRunStatus = "idle" | "running" | "done" | "error";

export interface ScoreRunState {
  status: ScoreRunStatus;
  clientId: string | null;
  /** LLM-suggested scores on completion. */
  scores?: SuggestedScore[];
  generated_at?: string;
  error?: string;
}

let state: ScoreRunState = { status: "idle", clientId: null };

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function setState(next: ScoreRunState) {
  state = next;
  notify();
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function getSnapshot(): ScoreRunState {
  return state;
}

const SERVER_SNAPSHOT: ScoreRunState = { status: "idle", clientId: null };
function getServerSnapshot(): ScoreRunState {
  return SERVER_SNAPSHOT;
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Kick off a scoring generation. The fetch runs at module scope so
 * navigating away from the scoring page does not cancel it.
 */
export function startScoreRun(
  clientId: string,
  knowledge_base: string,
): void {
  // Prevent duplicate concurrent runs for the same client.
  if (state.status === "running" && state.clientId === clientId) return;

  setState({ status: "running", clientId });
  void runScoreGeneration(clientId, knowledge_base);
}

async function runScoreGeneration(
  clientId: string,
  knowledge_base: string,
): Promise<void> {
  try {
    const res = await fetch("/api/scores/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ knowledge_base }),
    });
    const json = (await res.json()) as {
      scores?: SuggestedScore[];
      error?: string;
    };
    if (!res.ok || !json.scores) {
      setState({
        status: "error",
        clientId,
        error: json.error ?? `Score generation failed (${res.status})`,
      });
      return;
    }
    setState({
      status: "done",
      clientId,
      scores: json.scores,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    setState({
      status: "error",
      clientId,
      error: err instanceof Error ? err.message : "Network error",
    });
  }
}

/** Dismiss the current result/error so the store returns to idle. */
export function clearScoreRun(): void {
  setState({ status: "idle", clientId: null });
}

/** React hook — re-renders on every store change. */
export function useScoreRunStore(): ScoreRunState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
