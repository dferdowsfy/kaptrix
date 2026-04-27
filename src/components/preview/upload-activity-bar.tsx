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
      className="fixed inset-x-0 top-0 z-50 border-b border-indigo-200 bg-indigo-50/95 backdrop-blur"
    >
      <div className="h-0.5 w-full bg-indigo-100">
        <div
          className="h-full bg-indigo-600 transition-all duration-200"
          style={{ width: `${Math.max(2, Math.round(totalPercent))}%` }}
        />
      </div>
      <div className="mx-auto flex max-w-screen-2xl items-center gap-3 px-4 py-1.5 text-xs text-indigo-900">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-3.5 w-3.5 shrink-0 animate-spin text-indigo-700"
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
        <span className="font-medium">
          {someParsing ? "Processing" : "Uploading"} {inFlight.length} file
          {inFlight.length === 1 ? "" : "s"}
          {someParsing ? "" : ` · ${Math.round(totalPercent)}%`}
        </span>
        <span className="text-[11px] text-indigo-700/80">
          You can keep working — this continues in the background.
        </span>
      </div>
    </div>
  );
}
