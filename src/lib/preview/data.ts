import "server-only";
import { getServiceClient } from "@/lib/supabase/service";
import {
  demoAnalyses,
  demoBenchmarkCases,
  demoDocuments,
  demoEngagement,
  demoExecutiveReport,
  demoKnowledgeInsights,
  demoPatternMatches,
  demoReport,
  demoRequirements,
  demoScores,
} from "@/lib/demo-data";
import {
  DEFAULT_PREVIEW_CLIENT_ID,
  PREVIEW_CLIENTS,
  type PreviewClientSummary,
} from "@/lib/preview-clients";
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

export type PreviewSnapshot = {
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

const FULL_DEMO_SNAPSHOT: PreviewSnapshot = {
  engagement: demoEngagement,
  requirements: demoRequirements,
  documents: demoDocuments,
  analyses: demoAnalyses,
  benchmarks: demoBenchmarkCases,
  patternMatches: demoPatternMatches,
  scores: demoScores,
  report: demoReport,
  knowledgeInsights: demoKnowledgeInsights,
  executiveReport: demoExecutiveReport,
};

function lightweightSnapshotFor(
  client: PreviewClientSummary,
): PreviewSnapshot {
  return {
    ...FULL_DEMO_SNAPSHOT,
    engagement: {
      ...demoEngagement,
      id: client.id,
      client_firm_name: client.client,
      target_company_name: client.target,
      deal_stage: client.deal_stage as Engagement["deal_stage"],
      status: client.status as Engagement["status"],
      tier: client.tier,
      engagement_fee: client.fee_usd,
      delivery_deadline: client.deadline,
    },
  };
}

export function fallbackSnapshot(clientId: string): PreviewSnapshot {
  if (clientId === DEFAULT_PREVIEW_CLIENT_ID) return FULL_DEMO_SNAPSHOT;
  const client =
    PREVIEW_CLIENTS.find((c) => c.id === clientId) ?? PREVIEW_CLIENTS[0];
  return lightweightSnapshotFor(client);
}

async function seedIfEmpty(): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { count, error } = await supabase
    .from("preview_clients")
    .select("id", { count: "exact", head: true });

  if (error || (count ?? 0) > 0) return;

  const rows = PREVIEW_CLIENTS.map((c, idx) => ({
    id: c.id,
    target: c.target,
    client: c.client,
    industry: c.industry,
    deal_stage: c.deal_stage,
    status: c.status,
    tier: c.tier,
    composite_score: c.composite_score,
    recommendation: c.recommendation,
    fee_usd: c.fee_usd,
    deadline: c.deadline,
    summary: c.summary,
    display_order: idx,
  }));

  const { error: insertError } = await supabase
    .from("preview_clients")
    .upsert(rows, { onConflict: "id" });
  if (insertError) {
    console.warn("[preview] seed clients failed", insertError.message);
    return;
  }

  const snapshots = PREVIEW_CLIENTS.map((c) => ({
    client_id: c.id,
    payload:
      c.id === DEFAULT_PREVIEW_CLIENT_ID
        ? FULL_DEMO_SNAPSHOT
        : lightweightSnapshotFor(c),
  }));

  const { error: snapError } = await supabase
    .from("preview_snapshots")
    .upsert(snapshots, { onConflict: "client_id" });
  if (snapError) {
    console.warn("[preview] seed snapshots failed", snapError.message);
  }
}

export async function getPreviewClients(): Promise<PreviewClientSummary[]> {
  const supabase = getServiceClient();
  if (!supabase) return PREVIEW_CLIENTS;

  await seedIfEmpty();

  const { data, error } = await supabase
    .from("preview_clients")
    .select("*")
    .order("display_order", { ascending: true });

  if (error || !data || data.length === 0) return PREVIEW_CLIENTS;

  return data.map((row) => ({
    id: row.id,
    target: row.target,
    client: row.client,
    industry: row.industry,
    deal_stage: row.deal_stage,
    status: row.status,
    tier: row.tier as PreviewClientSummary["tier"],
    composite_score:
      row.composite_score === null ? null : Number(row.composite_score),
    recommendation: row.recommendation,
    fee_usd: Number(row.fee_usd),
    deadline: row.deadline,
    summary: row.summary,
  }));
}

export async function getPreviewSnapshot(
  clientId: string,
): Promise<PreviewSnapshot> {
  const supabase = getServiceClient();
  if (!supabase) return fallbackSnapshot(clientId);

  await seedIfEmpty();

  const { data, error } = await supabase
    .from("preview_snapshots")
    .select("payload")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error || !data?.payload) return fallbackSnapshot(clientId);
  return data.payload as PreviewSnapshot;
}
