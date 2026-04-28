"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const MI_TABS = [
  { id: "overview", label: "Overview", href: "overview" },
  { id: "intake", label: "Intake", href: "intake" },
  { id: "evidence", label: "Evidence", href: "evidence" },
  { id: "insights", label: "Insights", href: "insights" },
  { id: "scoring", label: "Scoring", href: "scoring" },
  { id: "positioning", label: "Positioning", href: "positioning" },
  { id: "shortlist", label: "Shortlist", href: "shortlist" },
  { id: "report", label: "Report", href: "report" },
] as const;

interface MiShellProps {
  engagementId: string;
  categoryName: string;
  thesis: string | null;
  status: string;
  children: ReactNode;
}

export function MiShell({
  engagementId,
  categoryName,
  thesis,
  status,
  children,
}: MiShellProps) {
  const pathname = usePathname();

  function isActive(tabHref: string) {
    return pathname?.endsWith(`/${tabHref}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href="/preview"
                  className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-300 hover:text-indigo-200 transition"
                >
                  ← Home
                </Link>
                <span className="text-indigo-700">·</span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-300">
                  AI Category Diligence
                </span>
              </div>
              <h1 className="mt-1.5 truncate text-xl font-bold tracking-tight sm:text-2xl">
                {categoryName}
              </h1>
              {thesis && (
                <p className="mt-1 line-clamp-1 text-xs text-slate-300 sm:text-sm">
                  {thesis}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                {status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 border-b bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="MI tabs">
            {MI_TABS.map((tab) => {
              const active = isActive(tab.href);
              return (
                <Link
                  key={tab.id}
                  href={`/category/${engagementId}/${tab.href}`}
                  className={[
                    "flex shrink-0 items-center border-b-2 px-4 py-3.5 text-sm font-medium transition",
                    active
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:border-indigo-300 hover:text-slate-700",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
