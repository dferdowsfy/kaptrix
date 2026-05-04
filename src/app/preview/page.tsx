"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionHeader } from "@/components/preview/preview-shell";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { usePreviewClients } from "@/hooks/use-preview-data";
import type { PreviewClientSummary } from "@/lib/preview-clients";
import { formatDate } from "@/lib/utils";
import { INDUSTRY_OPTIONS, type Industry } from "@/lib/industry-requirements";
import { setClientIndustry } from "@/lib/preview-intake";

export default function PreviewHomePage() {
  const { selectedId, setSelectedId } = useSelectedPreviewClient();
  const { clients, isLoading, refresh } = usePreviewClients();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setIsAdmin(Boolean(data.is_admin));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const openClient = (id: string) => {
    setSelectedId(id);
    router.push("/preview/overview");
  };

  const deleteClient = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/engagements/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      void refresh();
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string };
      alert(body.error ?? "Failed to delete engagement.");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="Home"
          title="Get a fast, structured read on a company"
          description={
            isAdmin
              ? "Upload company documents and get a clear view of risks, gaps, and opportunities — or add a new client below."
              : "Upload company documents and get a clear view of risks, gaps, and opportunities — ready to review or share."
          }
        />
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {showForm ? "Cancel" : "+ New Client"}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <NewClientForm
          onCreated={() => {
            setShowForm(false);
            void refresh();
          }}
        />
      )}

      {isLoading && clients.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading engagements…</div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 py-16 text-center">
          <p className="text-sm text-slate-500">
            {isAdmin
              ? "No engagements yet. Add your first client above."
              : "No engagements yet. Contact an admin to add a client."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-2">
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              isSelected={c.id === selectedId}
              onOpen={() => openClient(c.id)}
              onDelete={
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id)
                  ? () => void deleteClient(c.id, c.target)
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────── New Client Form ──────── */

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    target_company_name: "",
    client_firm_name: "",
    deal_stage: "preliminary",
    tier: "standard",
    engagement_fee: "",
    delivery_deadline: "",
    client_contact_email: "",
    referral_source: "",
    industry: "" as Industry | "",
    engagement_type: "",
    buyer_archetype: "",
  });

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.industry) {
      setError("Profile (industry) is required — it is locked for the life of the engagement.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/preview/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          engagement_fee: form.engagement_fee ? Number(form.engagement_fee) : null,
          delivery_deadline: form.delivery_deadline || null,
          client_contact_email: form.client_contact_email || null,
          referral_source: form.referral_source || null,
          engagement_type: form.engagement_type || null,
          buyer_archetype: form.buyer_archetype || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const created = (await res.json()) as { id?: string };
      if (created?.id && form.industry) {
        setClientIndustry(created.id, form.industry);
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create engagement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <h3 className="text-lg font-bold text-slate-900">Add New Client</h3>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">Target Company *</label>
          <input
            type="text"
            required
            value={form.target_company_name}
            onChange={(e) => update("target_company_name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="NovaMind AI"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Client Firm *</label>
          <input
            type="text"
            required
            value={form.client_firm_name}
            onChange={(e) => update("client_firm_name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="Acme Capital Partners"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Deal Stage</label>
          <select
            value={form.deal_stage}
            onChange={(e) => update("deal_stage", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="preliminary">Preliminary</option>
            <option value="loi">LOI</option>
            <option value="confirmatory">Confirmatory</option>
            <option value="post_close">Post-Close</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Delivery Deadline</label>
          <input
            type="date"
            value={form.delivery_deadline}
            onChange={(e) => update("delivery_deadline", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Client Email</label>
          <input
            type="email"
            value={form.client_contact_email}
            onChange={(e) => update("client_contact_email", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder="partner@firm.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Referral Source</label>
          <select
            value={form.referral_source}
            onChange={(e) => update("referral_source", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select…</option>
            <option value="direct">Direct</option>
            <option value="referral">Referral</option>
            <option value="signal_hunter">Signal Hunter</option>
            <option value="platform">Platform</option>
            <option value="content">Content</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Profile / Industry * <span className="text-xs font-normal text-rose-600">(locked after creation)</span>
          </label>
          <select
            required
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select an industry…</option>
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Drives industry-specific intake depth, scoring weights, and required artifacts. Cannot be changed once the engagement is created — a new engagement must be spun up to re-classify.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Engagement Type</label>
          <select
            value={form.engagement_type}
            onChange={(e) => update("engagement_type", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select…</option>
            <option value="pe_diligence">PE / growth equity diligence</option>
            <option value="corporate_new_ai">Corporate IC — new AI initiative</option>
            <option value="corporate_continuation">Corporate IC — program continuation</option>
            <option value="vendor_selection">Vendor selection / RFP</option>
            <option value="portfolio_review">Portfolio review — post-close</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Buyer Archetype</label>
          <select
            value={form.buyer_archetype}
            onChange={(e) => update("buyer_archetype", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select…</option>
            <option value="large_cap_pe">Large-cap PE</option>
            <option value="growth_equity">Growth equity</option>
            <option value="strategic_corp_dev">Strategic / corp dev</option>
            <option value="mid_market_operator">Mid-market operator</option>
            <option value="smb_operator">SMB operator</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create Engagement"}
      </button>
    </form>
  );
}

function ClientCard({
  client,
  isSelected,
  onOpen,
  onDelete,
}: {
  client: PreviewClientSummary;
  isSelected: boolean;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const statusTone = statusToTone(client.status);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group relative flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 sm:gap-5 sm:p-7
        shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.35)]
        hover:border-indigo-300
        hover:shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_18px_50px_-20px_rgba(79,70,229,0.55)]
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500
      `}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-600 sm:text-xs">
            {client.industry}
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {client.target}
          </h3>
          <p className="mt-1 text-sm text-slate-600 sm:text-base">
            {client.client}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isSelected && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200 sm:px-3 sm:text-xs">
              Last opened
            </span>
          )}
          <div
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 sm:px-3 sm:text-xs
              ${toneClasses(statusTone)}`}
          >
            {client.status_label}
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="rounded-md p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
              title="Delete engagement"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
        {client.summary}
      </p>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          label="Composite"
          value={
            client.composite_score !== null
              ? client.composite_score.toFixed(1)
              : "—"
          }
        />
        <Stat label="Stage" value={client.deal_stage.replace("_", " ")} />
        <Stat label="Tier" value={client.tier} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 sm:pt-4 sm:text-sm">
        <span>Due {formatDate(client.deadline)}</span>
        <span className="font-semibold text-indigo-600 transition group-hover:translate-x-0.5">
          Open workspace →
        </span>
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-2.5 py-2 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold capitalize text-slate-900 sm:text-base">
        {value}
      </p>
    </div>
  );
}

type Tone = "go" | "warn" | "stop" | "neutral";

function statusToTone(status: string): Tone {
  const normalized = status.toLowerCase();
  if (normalized === "delivered") return "go";
  if (
    normalized === "analysis" ||
    normalized === "scoring" ||
    normalized === "review" ||
    normalized === "scoping"
  ) {
    return "warn";
  }
  return "neutral";
}

function toneClasses(tone: Tone): string {
  switch (tone) {
    case "go":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "warn":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "stop":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}
