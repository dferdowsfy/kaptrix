"use client";

import { useSyncExternalStore } from "react";
import {
  readAllUploadedDocs,
  subscribeUploadedDocs,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";

const EMPTY: readonly UploadedDoc[] = [];

const IN_FLIGHT_STATUSES: ReadonlySet<UploadedDoc["parse_status"]> = new Set([
  "queued",
  "uploading",
  "parsing",
  "extracting",
]);

/**
 * Fixed-position activity bar that surfaces in-flight uploads at the
 * top of every preview page. Lets the operator navigate freely while
 * uploads finish in the background — the bar disappears as soon as the
 * last in-flight upload reaches "parsed" or "failed".
 *
 * Subscribes to the global uploaded-docs store so it works across
 * client switches and across all preview tabs (intake, coverage,
 * scoring, etc.) without each page having to wire its own indicator.
 */
export function UploadActivityBar() {
  const uploads = useSyncExternalStore(
    subscribeUploadedDocs,
    readAllUploadedDocs,
    () => EMPTY,
  );

  const inFlight = uploads.filter((d) => IN_FLIGHT_STATUSES.has(d.parse_status));
  if (inFlight.length === 0) return null;

  // Average percent across all uploads. Treat anything past "uploading"
  // as effectively complete on the upload axis (the bar shows network
  // progress; parsing is server-side).
  const totalPercent =
    inFlight.reduce((sum, d) => {
      if (d.parse_status === "uploading") {
        return sum + Math.max(0, Math.min(100, d.upload_percent ?? 0));
      }
      return sum + 100;
    }, 0) / Math.max(1, inFlight.length);

  const someParsing = inFlight.some(
    (d) => d.parse_status === "parsing" || d.parse_status === "extracting",
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="print-hide fixed bottom-4 left-4 z-40 sm:bottom-6 sm:left-6"
    >
      <div className="flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border border-indigo-200 bg-white px-4 py-2.5 shadow-[0_0_0_1px_rgba(79,70,229,0.12),0_10px_32px_-10px_rgba(79,70,229,0.35)]">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4 shrink-0 animate-spin text-indigo-700"
          aria-hidden
        >
          <circle
            cx="10"
            cy="10"
            r="7"
            stroke="currentColor"
            strokeOpacity="0.25"
            strokeWidth="2.5"
          />
          <path
            d="M17 10a7 7 0 0 0-7-7"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <div className="min-w-0 leading-tight">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
            {someParsing ? "Processing" : "Uploading"} · live
          </p>
          <p className="truncate text-sm font-semibold text-slate-900">
            {inFlight.length} file
            {inFlight.length === 1 ? "" : "s"}
            {someParsing ? "" : ` · ${Math.round(totalPercent)}%`}
          </p>
        </div>
        {!someParsing && (
          <div className="hidden h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-indigo-100 sm:block">
            <div
              className="h-full bg-indigo-600 transition-all duration-200"
              style={{ width: `${Math.max(2, Math.round(totalPercent))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
