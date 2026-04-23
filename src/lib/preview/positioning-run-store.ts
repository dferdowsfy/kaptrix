"use client";

import { useSyncExternalStore } from "react";

export type Position = "ahead" | "in_line" | "behind";
export type Confidence = "low" | "medium" | "high";

export interface PositioningResult {
  target_context: {
    type: "organization" | "product";
    industry: string;
    business_model: string;
    ai_use_case: string;
    customer_segment: string;
    data_sensitivity: string;
    deployment_maturity: string;
    vendor_stack: string;
    regulatory_exposure: string;
    architecture_pattern: string;
  };
  comparables: {
    name: string;
    type: "company" | "product" | "analog";
    category?: "A" | "B" | "C" | "D";
    revenue_stage?: string;
    vertical_fit_evidence?: string;
    rationale: string;
    source_url?: string;
  }[];
  insufficient_vertical_comps?: boolean;
  insufficient_reason?: string;
  comparison: {
    dimension: string;
    position: Position;
    evidence: string;
  }[];
  positioning_summary: string;
  investment_interpretation: {
    differentiation: string;
    durability: string;
    risk_concentration: string;
    validation_priorities: string[];
  };
  confidence: Confidence;
  confidence_rationale: string;
}

const EVENT = "kaptrix:positioning-run-change";

export type PositioningRunStatus = "idle" | "running" | "done" | "error";

export interface PositioningRunState {
  status: PositioningRunStatus;
  clientId: string | null;
  data?: PositioningResult;
  sources?: { url: string; title?: string }[];
  generated_at?: string;
  error?: string;
}

let state: PositioningRunState = { status: "idle", clientId: null };

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function setState(next: PositioningRunState) {
  state = next;
  notify();
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function getSnapshot(): PositioningRunState {
  return state;
}

const SERVER_SNAPSHOT: PositioningRunState = {
  status: "idle",
  clientId: null,
};

function getServerSnapshot(): PositioningRunState {
  return SERVER_SNAPSHOT;
}

export function startPositioningRun(
  clientId: string,
  knowledge_base: string,
): void {
  if (state.status === "running") return;

  setState({ status: "running", clientId });
  void runPositioningGeneration(clientId, knowledge_base);
}

async function runPositioningGeneration(
  clientId: string,
  knowledge_base: string,
): Promise<void> {
  try {
    const res = await fetch("/api/positioning", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, knowledge_base }),
    });
    const json = (await res.json()) as {
      positioning?: PositioningResult;
      sources?: { url: string; title?: string }[];
      error?: string;
    };
    if (!res.ok || !json.positioning) {
      setState({
        status: "error",
        clientId,
        error: json.error ?? `Positioning generation failed (${res.status})`,
      });
      return;
    }
    setState({
      status: "done",
      clientId,
      data: json.positioning,
      sources: json.sources ?? [],
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

export function clearPositioningRun(): void {
  setState({ status: "idle", clientId: null });
}

export function usePositioningRunStore(): PositioningRunState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
