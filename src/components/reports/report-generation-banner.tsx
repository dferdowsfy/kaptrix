"use client";

import Link from "next/link";
import { useReportStore } from "@/lib/reports/report-store";

// Persistent top-of-shell indicator for any active report generation.
// Shows a thin progress stripe (sticks to the bottom of the nav) +
// an inline pill with the running count. Clicking the pill jumps
// straight back to the Reports page where cards live.
export function ReportGenerationBanner() {
  const { activeCount, generating } = useReportStore();
  if (activeCount === 0) return null;

  const labels = generating.map((r) => r.title).slice(0, 3);
  const suffix =
    generating.length > labels.length ? ` +${generating.length - labels.length}` : "";
  const summary = `${labels.join(", ")}${suffix}`;

  return (
    <div className="print-hide pointer-events-none absolute inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto relative h-0.5 w-full overflow-hidden bg-indigo-100">
        <div className="animate-report-progress absolute inset-y-0 h-full w-1/3 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
      </div>
      <div className="pointer-events-auto mx-auto flex max-w-7xl justify-end px-4 sm:px-6">
        <Link
          href="/preview/report#on-demand-reports"
          className="mt-1 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-3 py-1 text-[11px] font-medium text-indigo-700 shadow-sm backdrop-blur transition hover:border-indigo-400 hover:text-indigo-900"
          title={summary}
        >
          <Spinner />
          {activeCount === 1
            ? "Generating report…"
            : `${activeCount} reports generating…`}
          <span className="hidden text-indigo-500 sm:inline">· view</span>
        </Link>
      </div>
    </div>
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
