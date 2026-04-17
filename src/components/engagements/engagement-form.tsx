"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ENGAGEMENT_TIERS } from "@/lib/constants";
import type { CreateEngagementInput, DealStage, EngagementTier, ReferralSource } from "@/lib/types";

export function EngagementForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateEngagementInput>({
    client_firm_name: "",
    target_company_name: "",
    deal_stage: "preliminary",
    tier: "standard",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/engagements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/engagements/${data.id}`);
    }

    setLoading(false);
  }

  function update<K extends keyof CreateEngagementInput>(
    key: K,
    value: CreateEngagementInput[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-white p-6 shadow-sm">
      {/* Client Firm */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Client Firm Name
        </label>
        <input
          type="text"
          required
          value={form.client_firm_name}
          onChange={(e) => update("client_firm_name", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          placeholder="Acme Capital Partners"
        />
      </div>

      {/* Target Company */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Target Company Name
        </label>
        <input
          type="text"
          required
          value={form.target_company_name}
          onChange={(e) => update("target_company_name", e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          placeholder="NovaMind AI"
        />
      </div>

      {/* Deal Stage */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Deal Stage
        </label>
        <select
          value={form.deal_stage}
          onChange={(e) => update("deal_stage", e.target.value as DealStage)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
        >
          <option value="preliminary">Preliminary</option>
          <option value="loi">LOI</option>
          <option value="confirmatory">Confirmatory</option>
          <option value="post_close">Post-Close</option>
        </select>
      </div>

      {/* Tier */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Engagement Tier
        </label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(Object.entries(ENGAGEMENT_TIERS) as [EngagementTier, typeof ENGAGEMENT_TIERS[EngagementTier]][]).map(
            ([key, tier]) => (
              <label
                key={key}
                className={`flex cursor-pointer flex-col rounded-lg border p-4 transition ${
                  form.tier === key
                    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="tier"
                  value={key}
                  checked={form.tier === key}
                  onChange={() => update("tier", key)}
                  className="sr-only"
                />
                <span className="text-sm font-semibold text-gray-900">
                  {tier.name}
                </span>
                <span className="mt-0.5 text-xs text-gray-500">
                  {tier.description}
                </span>
                <span className="mt-2 text-sm font-bold text-gray-900">
                  ${tier.price.toLocaleString()}
                  {tier.turnaround_days
                    ? ` · ${tier.turnaround_days}d`
                    : " / year"}
                </span>
              </label>
            ),
          )}
        </div>
      </div>

      {/* Client Contact Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Client Contact Email (optional)
        </label>
        <input
          type="email"
          value={form.client_contact_email ?? ""}
          onChange={(e) => update("client_contact_email", e.target.value || undefined)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
          placeholder="partner@acmecapital.com"
        />
      </div>

      {/* Referral Source */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Referral Source
        </label>
        <select
          value={form.referral_source ?? ""}
          onChange={(e) =>
            update("referral_source", (e.target.value as ReferralSource) || undefined)
          }
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm"
        >
          <option value="">Select source…</option>
          <option value="direct">Direct</option>
          <option value="referral">Referral</option>
          <option value="signal_hunter">Signal Hunter</option>
          <option value="platform">Platform</option>
          <option value="content">Content</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Engagement"}
      </button>
    </form>
  );
}
