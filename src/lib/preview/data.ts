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
import { calculateCompositeScore } from "@/lib/scoring/calculator";
import type {
  KnowledgeEntry,
  KnowledgeStep,
  ScoringPayload,
} from "@/lib/preview/kb-format";
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

function engagementStatusLabel(status: string): string {
  if (status === "delivered") return "Delivered";
  if (status === "intake") return "In intake";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type KnowledgeBaseState = Partial<Record<KnowledgeStep, KnowledgeEntry>>;

function extractScoringSummaryFromKnowledgeBase(state: unknown): {
  composite_score: number | null;
  decision_band: string | null;
} {
  if (!state || typeof state !== "object") {
    return { composite_score: null, decision_band: null };
  }
  const scoringEntry = (state as KnowledgeBaseState).scoring;
  if (!scoringEntry || scoringEntry.payload.kind !== "scoring") {
    return { composite_score: null, decision_band: null };
  }

  const payload = scoringEntry.payload as ScoringPayload;
  const candidate = payload.context_aware_composite ?? payload.composite_score;
  return {
    composite_score:
      typeof candidate === "number" && Number.isFinite(candidate)
        ? Math.round(candidate * 10) / 10
        : null,
    decision_band:
      typeof payload.decision_band === "string" && payload.decision_band.trim()
        ? payload.decision_band.trim()
        : null,
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
          status_label: engagementStatusLabel(row.status),
          tier: row.tier as PreviewClientSummary["tier"],
          composite_score:
            row.composite_score === null ? null : Number(row.composite_score),
          recommendation:
            row.recommendation && row.recommendation !== engagementStatusLabel(row.status)
              ? row.recommendation
              : null,
          fee_usd: Number(row.fee_usd),
          deadline: row.deadline,
          summary: row.summary,
        }))
      : PREVIEW_CLIENTS;

  const previewIds = new Set(previewClients.map((c) => c.id));
  const realEngagements = (realRows ?? []).filter((e) => !previewIds.has(e.id));

  const knowledgeBaseByEngagement = new Map<
    string,
    { composite_score: number | null; decision_band: string | null }
  >();
  const scoreCompositeByEngagement = new Map<string, number>();

  // KB lookup covers both preview clients and real engagements so the
  // homepage card composite reflects the latest score the operator
  // generated, not the seeded value from preview_clients.
  const allEngagementIds = [
    ...previewClients.map((c) => c.id),
    ...realEngagements.map((e) => e.id),
  ];

  if (allEngagementIds.length > 0) {
    const engagementById = new Map(realEngagements.map((e) => [e.id, e]));

    const knowledgeBaseQuery = supabase
      .from("user_workspace_state")
      .select("engagement_id, user_id, updated_at, state")
      .eq("kind", "knowledge_base")
      .in("engagement_id", allEngagementIds);

    // Preview clients have no assigned_operator_id, so we always need the
    // ownerId scope when present to pick the right user's KB row.
    const scopedKnowledgeBaseQuery =
      options.includeAllEngagements || !options.ownerId
        ? knowledgeBaseQuery
        : knowledgeBaseQuery.eq("user_id", options.ownerId);

    const realIds = realEngagements.map((e) => e.id);
    const [{ data: knowledgeBaseRows }, { data: scoreRows }] = await Promise.all([
      scopedKnowledgeBaseQuery,
      realIds.length > 0
        ? supabase.from("scores").select("*").in("engagement_id", realIds)
        : Promise.resolve({ data: [] as Score[] }),
    ]);

    const bestKnowledgeBaseRow = new Map<
      string,
      {
        composite_score: number | null;
        decision_band: string | null;
        priority: number;
        updatedAt: string | null;
      }
    >();

    for (const row of knowledgeBaseRows ?? []) {
      const scoringSummary = extractScoringSummaryFromKnowledgeBase(row.state);
      if (
        scoringSummary.composite_score === null &&
        scoringSummary.decision_band === null
      ) {
        continue;
      }

      const engagement = engagementById.get(row.engagement_id);
      const priority =
        engagement?.assigned_operator_id && row.user_id === engagement.assigned_operator_id
          ? 3
          : options.ownerId && row.user_id === options.ownerId
            ? 2
            : 1;

      const current = bestKnowledgeBaseRow.get(row.engagement_id);
      const isNewer = (row.updated_at ?? "") > (current?.updatedAt ?? "");
      if (!current || priority > current.priority || (priority === current.priority && isNewer)) {
        bestKnowledgeBaseRow.set(row.engagement_id, {
          composite_score: scoringSummary.composite_score,
          decision_band: scoringSummary.decision_band,
          priority,
          updatedAt: row.updated_at ?? null,
        });
      }
    }

    for (const [engagementId, info] of bestKnowledgeBaseRow) {
      knowledgeBaseByEngagement.set(engagementId, {
        composite_score: info.composite_score,
        decision_band: info.decision_band,
      });
    }

    const scoresByEngagement = new Map<string, Score[]>();
    for (const row of (scoreRows as Score[] | null) ?? []) {
      const existing = scoresByEngagement.get(row.engagement_id) ?? [];
      existing.push(row);
      scoresByEngagement.set(row.engagement_id, existing);
    }

    for (const [engagementId, scores] of scoresByEngagement) {
      if (scores.length === 0) continue;
      scoreCompositeByEngagement.set(
        engagementId,
        calculateCompositeScore(scores).composite_score,
      );
    }
  }

  // Apply the freshly-generated composite back onto preview cards. The
  // seeded preview_clients.composite_score is the fallback only.
  const previewClientsWithLatest = previewClients.map((c) => {
    const fromKb = knowledgeBaseByEngagement.get(c.id);
    if (fromKb && fromKb.composite_score !== null) {
      return {
        ...c,
        composite_score: fromKb.composite_score,
        recommendation: fromKb.decision_band ?? c.recommendation,
      };
    }
    return c;
  });

  const realClients: PreviewClientSummary[] = realEngagements
    .map((e) => {
      const scoringSummary = knowledgeBaseByEngagement.get(e.id);
      return {
      id: e.id,
      target: e.target_company_name,
      client: e.client_firm_name,
      industry: "",
      deal_stage: e.deal_stage,
      status: e.status,
      status_label: engagementStatusLabel(e.status),
      tier:
        e.tier === "signal_scan"
          ? "essentials"
          : e.tier === "deep"
            ? "premium"
            : "standard",
      composite_score:
        scoringSummary?.composite_score ?? scoreCompositeByEngagement.get(e.id) ?? null,
      recommendation: scoringSummary?.decision_band ?? null,
      fee_usd: e.engagement_fee ?? 0,
      deadline: e.delivery_deadline ?? "",
      summary: "",
      };
    });

  // Real engagements first so the newest is near the top.
  return [...realClients, ...previewClientsWithLatest];
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

  let snapshot: PreviewSnapshot;
  if (!error && data?.payload) {
    snapshot = data.payload as PreviewSnapshot;
  } else if (
    clientId === DEFAULT_PREVIEW_CLIENT_ID ||
    PREVIEW_CLIENTS.some((c) => c.id === clientId)
  ) {
    snapshot = fallbackSnapshot(clientId);
  } else {
    // User-created engagement — pull the row if it exists.
    const { data: row } = await supabase
      .from("engagements")
      .select("*")
      .eq("id", clientId)
      .maybeSingle();
    snapshot = row
      ? blankSnapshotFor(row as Engagement)
      : blankSnapshotFor(engagementShellFor(clientId));
  }

  // Merge any operator-uploaded artifacts persisted via /api/preview/parse
  // into snapshot.documents so every server-side consumer (chat context
  // builder, scoring, reporting) sees the uploaded deck/PDF/image text
  // without depending on client-side localStorage.
  try {
    const { data: uploaded } = await supabase
      .from("preview_uploaded_docs")
      .select(
        "id, filename, category, mime_type, file_size_bytes, parsed_text, token_count, parse_status, parse_error, uploaded_at",
      )
      .eq("client_id", clientId)
      .order("uploaded_at", { ascending: false });

    if (uploaded && uploaded.length > 0) {
      const existingIds = new Set(snapshot.documents.map((d) => d.id));
      const extraDocs: Document[] = uploaded
        .filter((u) => !existingIds.has(u.id))
        .map((u) => ({
          id: u.id,
          engagement_id: snapshot.engagement.id,
          category: u.category as Document["category"],
          filename: u.filename,
          storage_path: "",
          file_size_bytes: u.file_size_bytes ?? 0,
          mime_type: u.mime_type ?? "application/octet-stream",
          uploaded_at: u.uploaded_at,
          uploaded_by: null,
          parsed_text: u.parsed_text ?? null,
          parse_status: (u.parse_status as Document["parse_status"]) ?? "parsed",
          parse_error: u.parse_error ?? null,
          token_count: u.token_count ?? null,
        }));
      snapshot = {
        ...snapshot,
        documents: [...extraDocs, ...snapshot.documents],
      };
    }
  } catch {
    // Non-fatal — a missing preview_uploaded_docs table just means no
    // persisted uploads to merge.
  }

  return snapshot;
}
