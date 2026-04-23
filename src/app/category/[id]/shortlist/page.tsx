"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface ShortlistCompany {
  id: string;
  company_name: string;
  rationale: string | null;
  signal_summary: string | null;
  website_url: string | null;
  source_urls: string[];
  promoted_to_engagement_id: string | null;
  created_at: string;
}

export default function CategoryShortlistPage() {
  const { id: engagementId } = useParams<{ id: string }>();
  const router = useRouter();
  const [companies, setCompanies] = useState<ShortlistCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    rationale: "",
    signal_summary: "",
    website_url: "",
  });
  const [adding, setAdding] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market-intelligence/${engagementId}/shortlist`);
      if (res.ok) setCompanies((await res.json()) as ShortlistCompany[]);
    } finally {
      setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addCompany() {
    if (!form.company_name.trim()) return;
    setAdding(true);
    try {
      await fetch(`/api/market-intelligence/${engagementId}/shortlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          rationale: form.rationale || undefined,
          signal_summary: form.signal_summary || undefined,
          website_url: form.website_url || undefined,
        }),
      });
      setForm({ company_name: "", rationale: "", signal_summary: "", website_url: "" });
      setAddFormOpen(false);
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function removeCompany(id: string) {
    await fetch(`/api/market-intelligence/${engagementId}/shortlist?id=${id}`, {
      method: "DELETE",
    });
    await load();
  }

  async function promote(companyId: string) {
    setPromotingId(companyId);
    try {
      const res = await fetch(
        `/api/market-intelligence/${engagementId}/shortlist/${companyId}/promote`,
        { method: "POST" },
      );
      if (res.ok) {
        const data = (await res.json()) as { engagement_id: string; already_promoted: boolean };
        if (data.engagement_id) {
          router.push(`/engagements/${data.engagement_id}`);
        }
      }
    } finally {
      setPromotingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Shortlist</h2>
          <p className="mt-1 text-sm text-slate-500">
            Companies worth further diligence. Promote any company to a full
            client engagement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddFormOpen((s) => !s)}
          className="shrink-0 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-fuchsia-500"
        >
          {addFormOpen ? "Cancel" : "+ Add Company"}
        </button>
      </div>

      {/* Add form */}
      {addFormOpen && (
        <div className="rounded-2xl border border-fuchsia-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Add to Shortlist</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Company Name *
              </label>
              <input
                type="text"
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                placeholder="e.g. Acme AI Corp"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Rationale
              </label>
              <textarea
                rows={2}
                value={form.rationale}
                onChange={(e) => setForm((p) => ({ ...p, rationale: e.target.value }))}
                className="block w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                placeholder="Why does this company fit the investment thesis?"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Signal Summary
              </label>
              <input
                type="text"
                value={form.signal_summary}
                onChange={(e) => setForm((p) => ({ ...p, signal_summary: e.target.value }))}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                placeholder="What signal put this company on your radar?"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Website URL
              </label>
              <input
                type="url"
                value={form.website_url}
                onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-fuchsia-400 focus:outline-none focus:ring-1 focus:ring-fuchsia-400"
                placeholder="https://…"
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
              onClick={() => void addCompany()}
              disabled={adding || !form.company_name.trim()}
              className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add Company"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading shortlist…</div>
      ) : companies.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 py-16 text-center">
          <p className="text-sm text-slate-500">
            No companies on the shortlist yet. Add manually or run the Company
            Shortlist insight under the Insights tab to auto-populate.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {companies.map((company) => (
            <div
              key={company.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {company.company_name}
                  </h3>
                  {company.website_url && (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-fuchsia-600 hover:underline"
                    >
                      {company.website_url.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
                {company.promoted_to_engagement_id ? (
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">
                    Promoted
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void removeCompany(company.id)}
                    className="shrink-0 text-xs text-rose-400 hover:text-rose-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              {company.rationale && (
                <p className="mt-2 text-sm text-slate-600 leading-snug">
                  {company.rationale}
                </p>
              )}
              {company.signal_summary && (
                <p className="mt-2 text-xs text-slate-400 italic">
                  Signal: {company.signal_summary}
                </p>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                {company.promoted_to_engagement_id ? (
                  <a
                    href={`/engagements/${company.promoted_to_engagement_id}`}
                    className="text-xs font-semibold text-emerald-600 hover:underline"
                  >
                    View Engagement →
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => void promote(company.id)}
                    disabled={promotingId === company.id}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-500 disabled:opacity-50"
                  >
                    {promotingId === company.id
                      ? "Promoting…"
                      : "Promote to Client Diligence →"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
