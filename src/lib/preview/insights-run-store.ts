"use client";

import { useSyncExternalStore } from "react";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import { mergeExtractedInsights } from "@/lib/preview/extracted-insights";
import {
  upsertUploadedDoc,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";

const EVENT = "kaptrix:insights-run-change";

export type InsightsRunStatus = "idle" | "running" | "done" | "error";

export interface InsightsRunState {
  status: InsightsRunStatus;
  clientId: string | null;
  processed: number;
  total: number;
  error?: string;
  lastRunAt?: string;
}

let state: InsightsRunState = {
  status: "idle",
  clientId: null,
  processed: 0,
  total: 0,
};

function notify() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

function setState(next: InsightsRunState) {
  state = next;
  notify();
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

function getSnapshot(): InsightsRunState {
  return state;
}

const SERVER_SNAPSHOT: InsightsRunState = {
  status: "idle",
  clientId: null,
  processed: 0,
  total: 0,
};

function getServerSnapshot(): InsightsRunState {
  return SERVER_SNAPSHOT;
}

export function startInsightsRun(args: {
  clientId: string;
  documents: UploadedDoc[];
}): void {
  if (state.status === "running") return;

  const targets = args.documents.filter((d) => d.parsed_text && d.parsed_text.trim());
  if (targets.length === 0) {
    setState({
      status: "error",
      clientId: args.clientId,
      processed: 0,
      total: 0,
      error: "No documents need extraction.",
      lastRunAt: new Date().toISOString(),
    });
    return;
  }

  setState({
    status: "running",
    clientId: args.clientId,
    processed: 0,
    total: targets.length,
  });
  void runInsightsExtraction(args.clientId, targets);
}

async function runInsightsExtraction(
  clientId: string,
  documents: UploadedDoc[],
): Promise<void> {
  let processed = 0;
  let firstError: string | undefined;

  for (const doc of documents) {
    try {
      upsertUploadedDoc({ ...doc, parse_status: "extracting" });
      const res = await fetch("/api/preview/extract-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          doc_id: doc.id,
          filename: doc.filename,
          category: doc.category,
          text: doc.parsed_text,
        }),
      });

      let insightsCount = 0;
      if (res.ok) {
        const data = (await res.json()) as {
          insights?: KnowledgeInsight[];
        };
        if (Array.isArray(data.insights) && data.insights.length > 0) {
          mergeExtractedInsights(clientId, data.insights);
          insightsCount = data.insights.length;
        }
      } else if (!firstError) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        firstError = err.error ?? `HTTP ${res.status}`;
      }

      upsertUploadedDoc({
        ...doc,
        parse_status: "parsed",
        insights_count: (doc.insights_count ?? 0) + insightsCount,
      });
    } catch (err) {
      if (!firstError) {
        firstError = err instanceof Error ? err.message : "Network error";
      }
      upsertUploadedDoc({ ...doc, parse_status: "parsed" });
    }

    processed += 1;
    setState({
      status: "running",
      clientId,
      processed,
      total: documents.length,
      error: firstError,
    });
  }

  setState({
    status: firstError ? "error" : "done",
    clientId,
    processed,
    total: documents.length,
    error: firstError,
    lastRunAt: new Date().toISOString(),
  });
}

export function clearInsightsRun(): void {
  setState({ status: "idle", clientId: null, processed: 0, total: 0 });
}

export function useInsightsRunStore(): InsightsRunState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
