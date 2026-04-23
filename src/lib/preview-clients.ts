// Preview-mode client roster.
// These drive the home page cards and the persistent client header.
// The first client (LexiFlow) is the fully-populated demo used by all
// sub-tabs. Additional clients are shown as cards and exercise the
// persistent header UX — their full data is not yet mocked.

export type PreviewClientSummary = {
  id: string;
  target: string;
  client: string;
  industry: string;
  deal_stage: string;
  status: string;
  status_label: string;
  tier: "essentials" | "standard" | "premium";
  composite_score: number | null;
  recommendation: string | null;
  fee_usd: number;
  deadline: string; // ISO date
  summary: string;
};

export const PREVIEW_CLIENTS: PreviewClientSummary[] = [
  {
    id: "preview-engagement-001",
    target: "LexiFlow AI",
    client: "Blackstone Growth",
    industry: "Legal Tech",
    deal_stage: "confirmatory",
    status: "analysis",
    status_label: "Analysis",
    tier: "standard",
    composite_score: 3.1,
    recommendation: "Proceed with conditions",
    fee_usd: 12500,
    deadline: "2026-04-24T17:00:00.000Z",
    summary:
      "RAG-heavy legal contract copilot. Tooling exposure and tenant isolation are the dominant risks; value creation depends on abstraction layer maturity.",
  },
  {
    id: "preview-engagement-002",
    target: "Northwind Health Insights",
    client: "Sequoia Capital",
    industry: "Healthcare AI",
    deal_stage: "initial",
    status: "scoping",
    status_label: "Scoping",
    tier: "premium",
    composite_score: 3.6,
    recommendation: "Proceed",
    fee_usd: 32500,
    deadline: "2026-05-08T17:00:00.000Z",
    summary:
      "Claims triage workflow with on-prem fine-tunes. Regulatory posture is strong; commercial claims need validation against PHI volume assumptions.",
  },
  {
    id: "preview-engagement-003",
    target: "Atlas Trade Copilot",
    client: "Warburg Pincus",
    industry: "Financial Services",
    deal_stage: "confirmatory",
    status: "analysis",
    status_label: "Analysis",
    tier: "standard",
    composite_score: 2.4,
    recommendation: "Pause",
    fee_usd: 18750,
    deadline: "2026-04-30T17:00:00.000Z",
    summary:
      "Trade-surveillance copilot. Model governance and human-in-the-loop coverage are materially weaker than peer benchmarks; conditions likely required.",
  },
  {
    id: "preview-engagement-004",
    target: "Orbital Ops",
    client: "Family Office — Cedar Ridge",
    industry: "Industrial AI",
    deal_stage: "initial",
    status: "intake",
    status_label: "In intake",
    tier: "essentials",
    composite_score: null,
    recommendation: null,
    fee_usd: 6500,
    deadline: "2026-05-15T17:00:00.000Z",
    summary:
      "Predictive maintenance for satcom ground stations. Intake is still in progress; no scoring yet.",
  },
];

export const DEFAULT_PREVIEW_CLIENT_ID = PREVIEW_CLIENTS[0].id;

export function getPreviewClient(
  id: string | null | undefined,
): PreviewClientSummary {
  if (!id) return PREVIEW_CLIENTS[0];
  return PREVIEW_CLIENTS.find((c) => c.id === id) ?? PREVIEW_CLIENTS[0];
}

export const SELECTED_CLIENT_STORAGE_KEY = "kaptrix.preview.selectedClientId";
