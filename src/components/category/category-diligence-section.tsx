"use client";

// AI Category Diligence — home-page section.
//
// Rendered near the top of the dashboard home (`/preview/page.tsx`) when
// the signed-in user has `category_home` page permission. Shows the
// operator's existing category engagements and an inline "Start a new
// category diligence" form. Visually distinct from the target roster
// (fuchsia/violet gradient vs indigo) so the two pathways are never
// confused.
//
// Gating: the component fetches `/api/user/profile` once, checks
// `permissions.category_home`, and renders `null` when disabled. The
// underlying API routes enforce auth + role regardless.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { formatDate } from "@/lib/utils";

interface CategoryProfile {
  category_slug: string;
  category_name: string;
  thesis: string | null;
  time_horizon_months: number | null;
  peer_categories: string[];
}

interface CategoryEngagementRow {
  id: string;
  client_firm_name: string;
  target_company_name: string;
  subject_label: string | null;
  subject_kind: "target" | "category";
  deal_stage: string;
  tier: string;
  status: string;
  created_at: string;
  delivery_deadline: string | null;
  promoted_from_engagement_id: string | null;
  profile: CategoryProfile | null;
}

interface ProfileResponse {
  permissions?: Record<string, boolean>;
}

const jsonFetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export function CategoryDiligenceSection() {
  const { data: profile } = useSWR<ProfileResponse>(
    "/api/user/profile",
    jsonFetcher,
    { revalidateOnFocus: false },
  );

  const canView = profile?.permissions?.category_home === true;

  if (!canView) return null;
  return <CategoryDiligenceSurface />;
}

function CategoryDiligenceSurface() {
  const { data, error, isLoading, mutate } = useSWR<{
    engagements: CategoryEngagementRow[];
  }>("/api/category/engagements", jsonFetcher, { revalidateOnFocus: false });
  const [showForm, setShowForm] = useState(false);
  const engagements = data?.engagements ?? [];

  return (
    <section
      id="category-diligence"
      className="relative overflow-hidden rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 p-5 shadow-sm sm:p-7"
    >
      {/* decorative accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-fuchsia-400/30 to-violet-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-700 sm:text-xs">
            New pathway · beta
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            AI Category Diligence
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            Evaluate an AI category or theme the same way you evaluate a
            company — structural risks, provider landscape, buyer shape,
            governance bar, and the open questions that would settle the
            thesis. Promote category insights into company-level screening
            criteria when you&rsquo;re ready.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="shrink-0 rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-600"
        >
          {showForm ? "Cancel" : "+ Start a category diligence"}
        </button>
      </div>

      {showForm && (
        <div className="relative mt-5">
          <NewCategoryForm
            onCreated={() => {
              setShowForm(false);
              void mutate();
            }}
          />
        </div>
      )}

      <div className="relative mt-6">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading your category engagements…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Failed to load category engagements.
          </div>
        ) : engagements.length === 0 ? (
          <EmptyState onStart={() => setShowForm(true)} />
        ) : (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            {engagements.map((row) => (
              <CategoryCard key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-fuchsia-200 bg-white/60 px-5 py-10 text-center">
      <p className="text-sm text-slate-600 sm:text-base">
        No category engagements yet. Kick off your first one to map the
        structural risks, provider landscape, and screening criteria for a
        specific AI category.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-500"
      >
        + Start a category diligence
      </button>
    </div>
  );
}

function CategoryCard({ row }: { row: CategoryEngagementRow }) {
  const name = row.profile?.category_name ?? row.subject_label ?? row.target_company_name;
  const thesis = row.profile?.thesis ?? null;
  const peers = row.profile?.peer_categories ?? [];
  const horizon = row.profile?.time_horizon_months ?? null;
  const [showPromote, setShowPromote] = useState(false);

  return (
    <div
      className="group relative flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 sm:p-6
        shadow-[0_0_0_1px_rgba(15,23,42,0.04),0_10px_30px_-18px_rgba(15,23,42,0.35)]
        hover:border-fuchsia-300
        hover:shadow-[0_0_0_4px_rgba(217,70,239,0.15),0_18px_50px_-20px_rgba(192,38,211,0.55)]"
    >
      <a
        href={`/category/${row.id}/overview`}
        className="flex items-start justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-500"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fuchsia-700 sm:text-xs">
            Category · {row.profile?.category_slug ?? "unclassified"}
          </p>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            {name}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{row.client_firm_name}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700 ring-1 ring-slate-200 sm:text-xs">
          {row.status}
        </span>
      </a>

      {thesis && (
        <p className="line-clamp-3 text-sm leading-6 text-slate-700">{thesis}</p>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat
          label="Horizon"
          value={horizon ? `${horizon} mo` : "—"}
        />
        <Stat label="Stage" value={row.deal_stage.replace("_", " ")} />
        <Stat label="Peers" value={peers.length > 0 ? String(peers.length) : "—"} />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 sm:text-sm">
        <span>Created {formatDate(row.created_at)}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowPromote((s) => !s);
            }}
            className="font-semibold text-violet-600 transition hover:text-violet-500"
          >
            {showPromote ? "Cancel" : "Promote →"}
          </button>
          <a
            href={`/category/${row.id}/overview`}
            className="font-semibold text-fuchsia-700 transition group-hover:translate-x-0.5"
          >
            Open workspace →
          </a>
        </div>
      </div>

      {showPromote && (
        <PromoteForm
          engagementId={row.id}
          categoryName={name}
          clientFirmName={row.client_firm_name}
          onDone={() => setShowPromote(false)}
        />
      )}
    </div>
  );
}

function PromoteForm({
  engagementId,
  categoryName,
  clientFirmName,
  onDone,
}: {
  engagementId: string;
  categoryName: string;
  clientFirmName: string;
  onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [targetName, setTargetName] = useState("");
  const [insightSummary, setInsightSummary] = useState("");

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/engagements/${engagementId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_company_name: targetName,
          client_firm_name: clientFirmName,
          insight_key: `manual_promote_${Date.now()}`,
          insight_summary: insightSummary || `Promoted from category: ${categoryName}`,
        }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; link_error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (data.link_error) {
        setError(`Target created but lineage link failed: ${data.link_error}`);
      } else {
        setSuccess(true);
        setTimeout(onDone, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Target engagement created. It will appear in your target roster.
      </div>
    );
  }

  return (
    <form onSubmit={handlePromote} className="mt-3 space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
        Promote to Target Diligence
      </p>
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</div>
      )}
      <input
        type="text"
        required
        value={targetName}
        onChange={(e) => setTargetName(e.target.value)}
        placeholder="Target company name *"
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <textarea
        value={insightSummary}
        onChange={(e) => setInsightSummary(e.target.value)}
        rows={2}
        placeholder="Why promote this company? (optional)"
        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:opacity-50"
      >
        {saving ? "Promoting…" : "Create target engagement"}
      </button>
    </form>
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

// ── New category form ─────────────────────────────────────────────────────────

function NewCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    client_firm_name: "",
    category_name: "",
    thesis: "",
    time_horizon_months: "",
    peer_categories: "",
    deal_stage: "preliminary",
    tier: "standard",
  });
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const update = useCallback(
    (key: keyof typeof form, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const peerArray = useMemo(
    () =>
      form.peer_categories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    [form.peer_categories],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/category/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_firm_name: form.client_firm_name,
          category_name: form.category_name,
          thesis: form.thesis || undefined,
          time_horizon_months: form.time_horizon_months
            ? Number(form.time_horizon_months)
            : undefined,
          peer_categories: peerArray,
          deal_stage: form.deal_stage,
          tier: form.tier,
        }),
      });

      const data = await res.json().catch(() => ({})) as { error?: string; profile_error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      if (data.profile_error) {
        setError(`Engagement created but profile failed to save: ${data.profile_error}`);
        return;
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
      <h3 className="text-lg font-bold text-slate-900">New Category Diligence</h3>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Category name *
          </label>
          <input
            ref={firstFieldRef}
            type="text"
            required
            value={form.category_name}
            onChange={(e) => update("category_name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="AI Legal Research"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Client firm *
          </label>
          <input
            type="text"
            required
            value={form.client_firm_name}
            onChange={(e) => update("client_firm_name", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Acme Capital Partners"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700">
            Thesis
          </label>
          <textarea
            value={form.thesis}
            onChange={(e) => update("thesis", e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Why this category, why now, and what would make it uninvestable."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Time horizon (months)
          </label>
          <input
            type="number"
            min={1}
            max={240}
            value={form.time_horizon_months}
            onChange={(e) => update("time_horizon_months", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="18"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Peer categories
          </label>
          <input
            type="text"
            value={form.peer_categories}
            onChange={(e) => update("peer_categories", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            placeholder="Comma-separated: ai_drafting, ai_discovery"
          />
          <p className="mt-1 text-xs text-slate-500">
            Adjacent categories to triangulate against.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Deal stage
          </label>
          <select
            value={form.deal_stage}
            onChange={(e) => update("deal_stage", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          >
            <option value="preliminary">Preliminary</option>
            <option value="loi">LOI</option>
            <option value="confirmatory">Confirmatory</option>
            <option value="post_close">Post-Close</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Tier
          </label>
          <select
            value={form.tier}
            onChange={(e) => update("tier", e.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
          >
            <option value="signal_scan">Signal Scan</option>
            <option value="standard">Standard</option>
            <option value="deep">Deep Diligence</option>
            <option value="retained">Retained</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-fuchsia-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-500 disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create category diligence"}
      </button>
    </form>
  );
}
