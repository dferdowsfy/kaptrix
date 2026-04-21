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

function mapPreviewTier(
  tier: PreviewClientSummary["tier"],
): Engagement["tier"] {
  switch (tier) {
    case "essentials":
      return "signal_scan";
    case "premium":
      return "deep";
    case "standard":
    default:
      return "standard";
  }
}

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
      tier: mapPreviewTier(client.tier),
      engagement_fee: client.fee_usd,
      delivery_deadline: client.deadline,
    },
  };
}

/** Build an empty snapshot (no mock data) for a freshly created engagement. */
function blankSnapshotFor(engagement: Engagement): PreviewSnapshot {
  const nowIso = new Date().toISOString();
  return {
    engagement,
    requirements: FULL_DEMO_SNAPSHOT.requirements, // requirements catalog is global, not engagement-specific
    documents: [],
    analyses: [],
    benchmarks: [],
    patternMatches: [],
    scores: [],
    report: {
      id: `report-blank-${engagement.id}`,
      engagement_id: engagement.id,
      version: 0,
      watermark: "draft",
      generated_at: nowIso,
      pdf_storage_path: null,
      published_to_client_at: null,
      revision_notes: null,
      report_data: {},
    },
    knowledgeInsights: [],
    executiveReport: {
      target: engagement.target_company_name,
      client: engagement.client_firm_name,
      industry: "",
      generated_at: nowIso,
      version: 0,
      watermark: "Draft",
      composite_score: 0,
      recommendation: "Proceed with conditions",
      confidence: "Developing",
      executive_summary: "",
      strategic_context: "",
      top_three_takeaways: [],
      dimension_scores: {
        product_credibility: 0,
        tooling_exposure: 0,
        data_sensitivity: 0,
        governance_safety: 0,
        production_readiness: 0,
        open_validation: 0,
      },
      risk_heat_map: [],
      critical_findings: [],
      strategic_implications: [],
      value_creation_levers: [],
      recommended_conditions: [],
      open_validation: [],
      methodology: "",
    },
  };
}

function engagementShellFor(clientId: string): Engagement {
  const nowIso = new Date().toISOString();
  return {
    ...demoEngagement,
    id: clientId,
    client_firm_name: "",
    target_company_name: "",
    status: "intake",
    outcome: "pending",
    created_at: nowIso,
    updated_at: nowIso,
    nda_signed_at: null,
    engagement_fee: null,
    delivery_deadline: null,
    client_contact_email: null,
    referral_source: null,
  };
}

export function fallbackSnapshot(clientId: string): PreviewSnapshot {
  if (clientId === DEFAULT_PREVIEW_CLIENT_ID) return FULL_DEMO_SNAPSHOT;
  const mock = PREVIEW_CLIENTS.find((c) => c.id === clientId);
  if (mock) return lightweightSnapshotFor(mock);
  // Unknown id (freshly created engagement) — return blank slate.
  return blankSnapshotFor(engagementShellFor(clientId));
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

export async function getPreviewClients(
  options: { ownerId?: string | null; includeAllEngagements?: boolean } = {},
): Promise<PreviewClientSummary[]> {
  const supabase = getServiceClient();
  if (!supabase) return PREVIEW_CLIENTS;

  await seedIfEmpty();

  const engagementsQuery = supabase
    .from("engagements")
    .select("*")
    .order("created_at", { ascending: false });

  // Scope real engagements to this owner unless caller explicitly opts in
  // to the full roster (e.g. admins).
  const scopedQuery =
    options.includeAllEngagements || !options.ownerId
      ? engagementsQuery
      : engagementsQuery.eq("assigned_operator_id", options.ownerId);

  const [{ data: previewRows, error: previewError }, { data: realRows }] =
    await Promise.all([
      supabase
        .from("preview_clients")
        .select("*")
        .order("display_order", { ascending: true }),
      options.ownerId || options.includeAllEngagements
        ? scopedQuery
        : Promise.resolve({ data: [] as Engagement[] }),
    ]);

  const previewClients: PreviewClientSummary[] =
    !previewError && previewRows && previewRows.length > 0
      ? previewRows.map((row) => ({
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
        }))
      : PREVIEW_CLIENTS;

  const previewIds = new Set(previewClients.map((c) => c.id));
  const realClients: PreviewClientSummary[] = (realRows ?? [])
    .filter((e) => !previewIds.has(e.id))
    .map((e) => ({
      id: e.id,
      target: e.target_company_name,
      client: e.client_firm_name,
      industry: "",
      deal_stage: e.deal_stage,
      status: e.status,
      tier:
        e.tier === "signal_scan"
          ? "essentials"
          : e.tier === "deep"
            ? "premium"
            : "standard",
      composite_score: null,
      recommendation:
        e.status === "delivered"
          ? "Delivered"
          : e.status === "intake"
            ? "In intake"
            : "In progress",
      fee_usd: e.engagement_fee ?? 0,
      deadline: e.delivery_deadline ?? "",
      summary: "",
    }));

  // Real engagements first so the newest is near the top.
  return [...realClients, ...previewClients];
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

  if (!error && data?.payload) return data.payload as PreviewSnapshot;

  // No snapshot found. If this id is a seeded preview mock, use the demo.
  if (
    clientId === DEFAULT_PREVIEW_CLIENT_ID ||
    PREVIEW_CLIENTS.some((c) => c.id === clientId)
  ) {
    return fallbackSnapshot(clientId);
  }

  // Otherwise it's a user-created engagement — return a blank snapshot
  // populated with the real engagement row if we can find it.
  const { data: row } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", clientId)
    .maybeSingle();

  if (row) {
    return blankSnapshotFor(row as Engagement);
  }

  return blankSnapshotFor(engagementShellFor(clientId));
}
