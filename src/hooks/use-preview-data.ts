"use client";

import useSWR from "swr";
import type {
  BenchmarkCase,
  Document,
  DocumentRequirement,
  Engagement,
  PatternMatch,
  PreAnalysis,
  Report,
  Score,
} from "@/lib/types";
import type { KnowledgeInsight } from "@/components/documents/knowledge-insights-panel";
import type { ExecutiveReportData } from "@/components/reports/executive-report";
import type { PreviewClientSummary } from "@/lib/preview-clients";

export type PreviewSnapshotData = {
  engagement: Engagement;
  requirements: DocumentRequirement[];
  documents: Document[];
  analyses: PreAnalysis[];
  benchmarks: BenchmarkCase[];
  patternMatches: PatternMatch[];
  scores: Score[];
  report: Report;
  knowledgeInsights: KnowledgeInsight[];
  executiveReport: ExecutiveReportData;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export function usePreviewClients() {
  const { data, error, isLoading } = useSWR<{ clients: PreviewClientSummary[] }>(
    "/api/preview/clients",
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    clients: data?.clients ?? [],
    error,
    isLoading,
  };
}

export function usePreviewSnapshot(clientId: string | null | undefined) {
  const key = clientId
    ? `/api/preview/snapshot?client_id=${encodeURIComponent(clientId)}`
    : null;
  const { data, error, isLoading } = useSWR<{
    client_id: string;
    snapshot: PreviewSnapshotData;
  }>(key, fetcher, { revalidateOnFocus: false });

  return {
    snapshot: data?.snapshot,
    error,
    isLoading,
  };
}
