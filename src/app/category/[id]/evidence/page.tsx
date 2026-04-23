"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Assumption {
  id: string;
  assumption_text: string;
  assumption_category: string;
  evidence_status: "unverified" | "supported" | "weakened" | "contradicted";
  load_bearing_score: number | null;
  ordering: number;
}

interface CoverageItem {
  assumption_id: string;
  assumption_text: string;
  assumption_category: string;
  evidence_status: string;
  load_bearing_score: number | null;
  supporting_count: number;
  weakening_count: number;
  contradicting_count: number;
  total_linked: number;
}

interface EvidenceItem {
  id: string;
  source_type: string;
  source_name: string;
  source_url: string | null;
  excerpt: string | null;
  confidence: string;
  created_at: string;
}

interface Coverage {
  assumptions: CoverageItem[];
  evidence_items: EvidenceItem[];
  summary: {
    total_assumptions: number;
    evidenced_count: number;
    coverage_pct: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  unverified: "bg-slate-100 text-slate-600",
  supported: "bg-emerald-100 text-emerald-700",
  weakened: "bg-amber-100 text-amber-700",
  contradicted: "bg-rose-100 text-rose-700",
};

export default function CategoryEvidencePage() {
  const { id: engagementId } = useParams<{ id: string }>();

  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [selectedAssumption, setSelectedAssumption] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"supports" | "weakens" | "contradicts">("supports");
  const [linking, setLinking] = useState(false);
  const [newEvidence, setNewEvidence] = useState({
    source_type: "market_report",
    source_name: "",
    source_url: "",
    excerpt: "",
    confidence: "medium",
    recency_date: "",
  });
  const [addingEvidence, setAddingEvidence] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-intelligence/${engagementId}/coverage`);
      if (res.ok) setCoverage((await res.json()) as Coverage);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function extractAssumptions() {
    setExtracting(true);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/assumptions/extract`, {
        method: "POST",
      });
      await load();
    } finally {
      setExtracting(false);
    }
  }

  async function addEvidence() {
    if (!newEvidence.source_name.trim()) return;
    setAddingEvidence(true);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/evidence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newEvidence,
          excerpt: newEvidence.excerpt || undefined,
          source_url: newEvidence.source_url || undefined,
          recency_date: newEvidence.recency_date || undefined,
        }),
      });
      setNewEvidence({
        source_type: "market_report",
        source_name: "",
        source_url: "",
        excerpt: "",
        confidence: "medium",
        recency_date: "",
      });
      setAddFormOpen(false);
      await load();
    } finally {
      setAddingEvidence(false);
    }
  }

  async function removeEvidence(evidenceId: string) {
    await fetch(`/api/market-intelligence/${engagementId}/evidence/${evidenceId}`, {
      method: "DELETE",
    });
    await load();
  }

  async function createLink() {
    if (!selectedEvidence || !selectedAssumption) return;
    setLinking(true);
    try {
      await fetch(
        `/api/market-intelligence/${engagementId}/evidence/${selectedEvidence}/link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assumption_id: selectedAssumption,
            link_type: linkType,
          }),
        },
      );
      await load();
    } finally {
      setLinking(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        Loading evidence matrix…
      </div>
    );
  }

  const evidenceItems = coverage?.evidence_items ?? [];
  const assumptionsList = coverage?.assumptions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Evidence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Add evidence, link it to thesis assumptions, and track coverage.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => void extractAssumptions()}
            disabled={extracting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {extracting ? "Extracting…" : "Extract Assumptions"}
          </button>
          <button
            type="button"
            onClick={() => setAddFormOpen((s) => !s)}
            className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500"
          >
            {addFormOpen ? "Cancel" : "+ Add Evidence"}
          </button>
        </div>
      </div>

      {/* Coverage summary */}
      {coverage && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm shadow-sm">
          <div className="h-2 flex-1 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-fuchsia-500"
              style={{ width: `${coverage.summary.coverage_pct}%` }}
            />
          </div>
          <span className="font-medium text-slate-700">
            {coverage.summary.coverage_pct}% covered (
            {coverage.summary.evidenced_count}/{coverage.summary.total_assumptions}{" "}
            assumptions)
          </span>
        </div>
      )}

      {/* Add evidence form */}
      {addFormOpen && (
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Add Evidence Item
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Source Type *
              </label>
              <select
                value={newEvidence.source_type}
                onChange={(e) =>
                  setNewEvidence((p) => ({ ...p, source_type: e.target.value }))
                }
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              >
                <option value="market_report">Market Report</option>
                <option value="funding_data">Funding Data</option>
                <option value="regulatory">Regulatory</option>
                <option value="customer_signal">Customer Signal</option>
                <option value="talent_signal">Talent Signal</option>
                <option value="incumbent_signal">Incumbent Signal</option>
                <option value="expert_interview">Expert Interview</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Source Name *
              </label>
              <input
                type="text"
                value={newEvidence.source_name}
                onChange={(e) =>
                  setNewEvidence((p) => ({ ...p, source_name: e.target.value }))
                }
                placeholder="e.g. Gartner AI Market Guide 2024"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                URL (optional)
              </label>
              <input
                type="url"
                value={newEvidence.source_url}
                onChange={(e) =>
                  setNewEvidence((p) => ({ ...p, source_url: e.target.value }))
                }
                placeholder="https://…"
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Confidence
              </label>
              <select
                value={newEvidence.confidence}
                onChange={(e) =>
                  setNewEvidence((p) => ({ ...p, confidence: e.target.value }))
                }
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Key Excerpt (optional, max 2000 chars)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                value={newEvidence.excerpt}
                onChange={(e) =>
                  setNewEvidence((p) => ({ ...p, excerpt: e.target.value }))
                }
                placeholder="Paste the most relevant sentence or paragraph…"
                className="block w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddFormOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void addEvidence()}
              disabled={addingEvidence || !newEvidence.source_name.trim()}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            >
              {addingEvidence ? "Adding…" : "Add Evidence"}
            </button>
          </div>
        </div>
      )}

      {/* Link panel */}
      {evidenceItems.length > 0 && assumptionsList.length > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/40 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            Link Evidence to Assumption
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Evidence Item
              </label>
              <select
                value={selectedEvidence ?? ""}
                onChange={(e) => setSelectedEvidence(e.target.value || null)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              >
                <option value="">Select evidence…</option>
                {evidenceItems.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.source_name.slice(0, 50)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Assumption
              </label>
              <select
                value={selectedAssumption ?? ""}
                onChange={(e) => setSelectedAssumption(e.target.value || null)}
                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              >
                <option value="">Select assumption…</option>
                {assumptionsList.map((a) => (
                  <option key={a.assumption_id} value={a.assumption_id}>
                    {a.assumption_text.slice(0, 60)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Link Type
              </label>
              <div className="flex gap-2">
                <select
                  value={linkType}
                  onChange={(e) =>
                    setLinkType(
                      e.target.value as "supports" | "weakens" | "contradicts",
                    )
                  }
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                >
                  <option value="supports">Supports</option>
                  <option value="weakens">Weakens</option>
                  <option value="contradicts">Contradicts</option>
                </select>
                <button
                  type="button"
                  onClick={() => void createLink()}
                  disabled={linking || !selectedEvidence || !selectedAssumption}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
                >
                  {linking ? "…" : "Link"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evidence list */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Evidence Items ({evidenceItems.length})
          </h3>
          {evidenceItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 py-10 text-center text-sm text-slate-500">
              No evidence items yet.
            </div>
          ) : (
            <div className="space-y-3">
              {evidenceItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {item.source_name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {item.source_type.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {item.confidence}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeEvidence(item.id)}
                      className="shrink-0 text-xs text-rose-500 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                  {item.excerpt && (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500 italic">
                      &ldquo;{item.excerpt}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assumption coverage */}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Assumption Coverage ({assumptionsList.length})
          </h3>
          {assumptionsList.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-violet-200 py-10 text-center text-sm text-slate-500">
              No assumptions extracted yet. Click{" "}
              <strong>Extract Assumptions</strong> above.
            </div>
          ) : (
            <div className="space-y-3">
              {assumptionsList.map((a) => (
                <div
                  key={a.assumption_id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-slate-800 leading-snug">
                      {a.assumption_text}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[a.evidence_status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {a.evidence_status}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-slate-500">
                    <span>✓ {a.supporting_count}</span>
                    <span>~ {a.weakening_count}</span>
                    <span>✗ {a.contradicting_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
