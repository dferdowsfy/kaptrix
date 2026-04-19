"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import { useNavVisibility } from "@/hooks/use-nav-visibility";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ConnectionStatus } from "@/components/preview/connection-status";
import { ProfileMenu } from "@/components/preview/profile-menu";
import { NavSettingsMenu } from "@/components/preview/nav-settings-menu";
import { KbActivityIndicator } from "@/components/preview/kb-activity-indicator";
import { ReportGenerationBanner } from "@/components/reports/report-generation-banner";

export function PreviewShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { client, ready } = useSelectedPreviewClient();
  const { visibleTabs } = useNavVisibility();
  const isHome = pathname === "/preview";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="print-hide relative z-50 border-b bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-600 sm:text-[11px]">
              Kaptrix Delivery Platform
            </p>
            <h1 className="mt-1 text-lg font-bold sm:text-2xl">
              Operator Workspace
            </h1>
          </div>
          <div className="inline-flex items-center gap-3 self-start sm:self-auto">
            <ConnectionStatus />
            <ProfileMenu />
          </div>
        </div>
      </div>

      {!isHome && ready && (
        <div className="print-hide border-b bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-indigo-300 sm:text-[11px]">
                Active engagement
              </p>
              <h2 className="mt-1 truncate text-lg font-bold tracking-tight sm:text-2xl">
                {client.target}
              </h2>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                {client.client} · {client.industry} ·{" "}
                {client.deal_stage.replace("_", " ")} · Due{" "}
                {formatDate(client.deadline)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <KbActivityIndicator />
              <HeaderChip label="Tier" value={client.tier} tone="neutral" />
              <HeaderChip
                label="Fee"
                value={formatCurrency(client.fee_usd)}
                tone="neutral"
              />
              <HeaderChip label="Status" value={client.status} tone="accent" />
              <Link
                href="/preview"
                className="ml-auto rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20 sm:ml-0 sm:px-4 sm:py-2 sm:text-sm"
              >
                Switch client
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="print-hide sticky top-0 z-40 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="relative">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-6 sm:py-3">
          <nav className="min-w-0 flex-1">
            <ul className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {visibleTabs.map((tab) => {
                const isActive =
                  tab.href === "/preview"
                    ? pathname === "/preview"
                    : pathname.startsWith(tab.href);
                return (
                  <li key={tab.id}>
                    <Link
                      href={tab.href}
                      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "bg-slate-900 text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/how-it-works"
              className="group relative hidden items-center rounded-full px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-indigo-700 transition sm:inline-flex"
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-100/60 via-white to-indigo-100/60 opacity-0 blur-sm transition group-hover:opacity-100"
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full ring-1 ring-inset ring-indigo-200/70 transition group-hover:ring-indigo-400/80"
              />
              <span className="relative">How it works</span>
            </Link>
            <NavSettingsMenu />
          </div>
        </div>
          <ReportGenerationBanner />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-24">
        {children}
      </main>
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
      className={`rounded-xl px-3 py-1.5 backdrop-blur sm:rounded-2xl sm:px-4 sm:py-2 ${
        tone === "accent"
          ? "bg-indigo-500/20 ring-1 ring-indigo-300/40"
          : "bg-white/10 ring-1 ring-white/20"
      }`}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-200 sm:text-[10px]">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-semibold capitalize text-white sm:text-sm">
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-600 sm:text-xs">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
        {description}
      </p>
    </div>
  );
}
