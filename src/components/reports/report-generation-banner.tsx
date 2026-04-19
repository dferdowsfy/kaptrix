"use client";

import Link from "next/link";
import { useReportStore } from "@/lib/reports/report-store";

// Inline pill for any active report generation. Designed to live in
// the top header next to the profile menu so it never overlaps the
// preview navigation tabs.
export function ReportGenerationBanner() {
  const { activeCount, generating } = useReportStore();
  if (activeCount === 0) return null;

  const labels = generating.map((r) => r.title).slice(0, 3);
  const suffix =
    generating.length > labels.length ? ` +${generating.length - labels.length}` : "";
  const summary = `${labels.join(", ")}${suffix}`;

  return (
    <Link
      href="/preview/report#on-demand-reports"
      title={summary}
      className="print-hide group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-medium text-indigo-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-900"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden"
      >
        <span className="animate-report-progress absolute inset-y-0 h-full w-1/3 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
      </span>
      <Spinner />
      <span>
        {activeCount === 1
          ? "Generating report…"
          : `${activeCount} reports generating…`}
      </span>
      <span className="hidden text-indigo-500 sm:inline">· view</span>
    </Link>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700"
    />
  );
}
