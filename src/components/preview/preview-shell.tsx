"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PREVIEW_TABS } from "@/lib/preview-tabs";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { formatCurrency, formatDate } from "@/lib/utils";

export function PreviewShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { client, ready } = useSelectedPreviewClient();
  const isHome = pathname === "/preview";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="print-hide border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-600">
              Kaptrix Delivery Platform
            </p>
            <h1 className="mt-1 text-2xl font-bold">Operator Workspace Preview</h1>
          </div>
          <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Running with mock data — Supabase and Gemini not yet wired
          </div>
        </div>
      </div>

      {!isHome && ready && (
        <div className="print-hide border-b bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
                Active engagement
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                {client.target}
              </h2>
              <p className="mt-1 text-sm text-slate-300">
                {client.client} · {client.industry} ·{" "}
                {client.deal_stage.replace("_", " ")} · Due{" "}
                {formatDate(client.deadline)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <HeaderChip label="Tier" value={client.tier} tone="neutral" />
              <HeaderChip
                label="Fee"
                value={formatCurrency(client.fee_usd)}
                tone="neutral"
              />
              <HeaderChip label="Status" value={client.status} tone="accent" />
              <Link
                href="/preview"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                Switch client
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="print-hide sticky top-0 z-40 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl overflow-x-auto px-6">
          <nav className="flex min-w-max items-center gap-2 py-3">
            {PREVIEW_TABS.map((tab) => {
              const isActive =
                tab.href === "/preview"
                  ? pathname === "/preview"
                  : pathname.startsWith(tab.href);
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  className={`rounded-full px-4 py-2 text-base font-medium transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-8 pb-24">{children}</main>
    </div>
  );
}

function HeaderChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "neutral" | "accent";
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-2 backdrop-blur ${
        tone === "accent"
          ? "bg-indigo-500/20 ring-1 ring-indigo-300/40"
          : "bg-white/10 ring-1 ring-white/20"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-white">
        {value}
      </p>
    </div>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-base leading-7 text-slate-600">
        {description}
      </p>
    </div>
  );
}
