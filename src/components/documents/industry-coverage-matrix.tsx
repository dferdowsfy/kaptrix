"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Document } from "@/lib/types";
import type { UploadedDoc } from "@/lib/preview/uploaded-docs";
import {
  UPLOAD_ACCEPT_ATTR,
  uploadFilesForCategory,
} from "@/lib/preview/upload-file";
import {
  INDUSTRY_PROFILES,
  type Industry,
  type IndustryArtifact,
} from "@/lib/industry-requirements";

export interface IndustryCoverageState {
  industry: Industry;
  industry_label: string;
  total: number;
  provided: number;
  missing_required: string[];
  gap_categories: string[];
}

interface Props {
  documents: Document[];
  defaultIndustry?: Industry;
  onStateChange?: (state: IndustryCoverageState) => void;
  /** Required so we can route uploaded files into the right client's KB. */
  clientId: string | null;
  /** In-flight + parsed uploads for the current client. Used to render
   *  per-row progress bars inside the artifact table. */
  uploadedDocs?: readonly UploadedDoc[];
}

type Status = "provided" | "partial" | "missing";

function statusFor(artifact: IndustryArtifact, docs: Document[]): Status {
  const matches = docs.filter((d) => d.category === artifact.category);
  if (matches.length === 0) return "missing";
  const allParsed = matches.every((d) => d.parse_status === "parsed");
  return allParsed ? "provided" : "partial";
}

export function IndustryCoverageMatrix({
  documents,
  defaultIndustry = "legal_tech",
  onStateChange,
  clientId,
  uploadedDocs = [],
}: Props) {
  const [industry, setIndustry] = useState<Industry>(defaultIndustry);
  const [expanded, setExpanded] = useState<string | null>(null);
  // Category the hidden <input type=file> is bound to for the current
  // click. Set immediately before we call .click() and read back in
  // onChange. Using a ref avoids a stale-state race if the user clicks
  // a second Upload button before the first file picker opens.
  const pendingCategoryRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = (category: string) => {
    if (!clientId) return;
    pendingCategoryRef.current = category;
    // Reset value so selecting the same file twice still fires change.
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const category = pendingCategoryRef.current;
    pendingCategoryRef.current = null;
    if (!files || files.length === 0 || !category || !clientId) return;
    await uploadFilesForCategory({ clientId, category, files });
  };

  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const profile = INDUSTRY_PROFILES[industry];

  const rows = useMemo(
    () =>
      profile.artifacts.map((artifact) => ({
        artifact,
        status: statusFor(artifact, documents),
        docs: documents.filter((d) => d.category === artifact.category),
      })),
    [profile, documents],
  );

  const provided = rows.filter((r) => r.status === "provided").length;
  const total = rows.length;
  const missingRequired = useMemo(
    () => rows.filter((r) => r.status === "missing" && r.artifact.is_required),
    [rows],
  );
  const coveragePct = Math.round((provided / total) * 100);

  const stateSnapshot = useMemo<IndustryCoverageState>(
    () => ({
      industry,
      industry_label: profile.label,
      total,
      provided,
      missing_required: missingRequired.map((r) => r.artifact.display_name),
      gap_categories: rows
        .filter((r) => r.status !== "provided")
        .map((r) => r.artifact.display_name),
    }),
    [industry, profile.label, total, provided, missingRequired, rows],
  );

  useEffect(() => {
    if (!onStateChangeRef.current) return;
    onStateChangeRef.current(stateSnapshot);
  }, [stateSnapshot]);

  // Index uploaded docs by category for quick per-row lookup.
  const uploadsByCategory = useMemo(() => {
    const byCat: Record<string, UploadedDoc[]> = {};
    for (const d of uploadedDocs) {
      (byCat[d.category] ??= []).push(d);
    }
    return byCat;
  }, [uploadedDocs]);

  return (
    <div className="space-y-5">
      {/* Hidden input drives every Upload button on the page. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT_ATTR}
        className="sr-only"
        onChange={handleFileChange}
      />
      {/* Primary CTA — missing required artifacts, above everything else. */}
      {missingRequired.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                Action required · {missingRequired.length} missing
              </p>
              <h3 className="mt-1 text-lg font-semibold text-amber-900">
                Collect these {profile.label} artifacts to unlock scoring
              </h3>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-800">
              <span>{coveragePct}% coverage</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-amber-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {missingRequired.map((r) => {
              const uploads = uploadsByCategory[r.artifact.category] ?? [];
              const inFlight = uploads.some(
                (u) =>
                  u.parse_status === "uploading" ||
                  u.parse_status === "parsing" ||
                  u.parse_status === "queued",
              );
              return (
                <li
                  key={r.artifact.category}
                  className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-white/90 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-amber-900">
                        {r.artifact.display_name}
                      </p>
                      <p className="truncate text-[11px] text-amber-700">
                        <span className="font-mono uppercase tracking-wide">
                          {r.artifact.category}
                        </span>
                        {" · "}
                        {r.artifact.why_it_matters}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!clientId || inFlight}
                      onClick={() => triggerUpload(r.artifact.category)}
                      className="shrink-0 rounded-full bg-amber-900 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-amber-900 transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {inFlight ? "Uploading…" : "Upload"}
                    </button>
                  </div>
                  <RowUploads uploads={uploads} compact />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Industry-Calibrated Coverage
          </p>
          <h3 className="mt-1 text-lg font-semibold text-gray-900">
            {profile.label}
          </h3>
          <p className="mt-1 max-w-xl text-xs text-gray-500">
            {profile.tagline}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Coverage
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{coveragePct}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
              style={{ width: `${coveragePct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {provided} of {total} industry-standard artifacts provided
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Required Gaps
          </p>
          <p className="mt-2 text-3xl font-bold text-rose-800">
            {missingRequired.length}
          </p>
          <p className="mt-2 text-xs text-rose-700">
            Required artifacts absent for {profile.label}
          </p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Regulatory Lens
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.regulators.map((reg) => (
              <span
                key={reg}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-indigo-800 ring-1 ring-indigo-200"
              >
                {reg}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Artifact</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Regulatory</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {rows.map((row) => {
              const isOpen = expanded === row.artifact.category;
              return (
                <Fragment key={row.artifact.category}>
                  <tr
                    className="cursor-pointer transition hover:bg-gray-50"
                    onClick={() =>
                      setExpanded(isOpen ? null : row.artifact.category)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {row.artifact.display_name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">
                        {row.artifact.why_it_matters}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          row.artifact.is_required
                            ? "bg-rose-100 text-rose-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {row.artifact.is_required ? "Required" : "Recommended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {row.artifact.regulatory_context ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={row.status} />
                      <RowUploads
                        uploads={uploadsByCategory[row.artifact.category] ?? []}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.status !== "provided" ? (
                        <button
                          type="button"
                          disabled={!clientId}
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerUpload(row.artifact.category);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Upload
                        </button>
                      ) : row.docs.length > 0 ? (
                        <span className="text-[11px] text-gray-500">
                          {row.docs.length} file{row.docs.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">
                      {isOpen ? "▾" : "▸"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              What a diligence-ready submission contains
                            </p>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                              {row.artifact.what_we_look_for.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Impact if missing
                            </p>
                            <p className="mt-2 text-sm text-gray-700">
                              {row.artifact.limits_when_missing}
                            </p>
                            {row.docs.length > 0 && (
                              <>
                                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Provided documents
                                </p>
                                <ul className="mt-1 text-xs text-gray-600">
                                  {row.docs.map((d) => (
                                    <li key={d.id}>• {d.filename}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const config = {
    provided: { label: "Provided", cls: "bg-emerald-100 text-emerald-800" },
    partial: { label: "Processing", cls: "bg-amber-100 text-amber-800" },
    missing: { label: "Missing", cls: "bg-rose-100 text-rose-800" },
  }[status];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

// Render recent uploads tied to an artifact row with live progress bars.
function RowUploads({
  uploads,
  compact = false,
}: {
  uploads: UploadedDoc[];
  compact?: boolean;
}) {
  if (uploads.length === 0) return null;
  // Compact variant (used inside the amber CTA) shows only in-flight
  // files so the card doesn't grow after a successful upload.
  const visible = compact
    ? uploads.filter(
        (d) =>
          d.parse_status === "uploading" ||
          d.parse_status === "parsing" ||
          d.parse_status === "queued" ||
          d.parse_status === "failed",
      )
    : uploads;
  if (visible.length === 0) return null;
  return (
    <ul className={compact ? "space-y-1" : "mt-2 space-y-1.5"}>
      {visible.map((d) => (
        <li key={d.id} className="max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-[11px] font-medium text-slate-700"
              title={d.filename}
            >
              {d.filename}
            </span>
            {d.parse_status === "uploading" ? (
              <span className="tabular-nums text-[10px] font-semibold text-sky-700">
                {Math.max(0, Math.min(100, d.upload_percent ?? 0))}%
              </span>
            ) : d.parse_status === "parsing" ? (
              <span className="text-[10px] font-semibold text-amber-700">
                Parsing…
              </span>
            ) : d.parse_status === "parsed" ? (
              <span className="text-[10px] font-semibold text-emerald-700">
                ✓
              </span>
            ) : d.parse_status === "failed" ? (
              <span
                className="text-[10px] font-semibold text-rose-700"
                title={d.error ?? "Failed"}
              >
                Failed
              </span>
            ) : (
              <span className="text-[10px] font-semibold text-slate-500">
                Queued
              </span>
            )}
          </div>
          {(d.parse_status === "uploading" ||
            d.parse_status === "parsing" ||
            d.parse_status === "queued") && (
            <div
              className={`mt-0.5 h-1 w-full overflow-hidden rounded-full ${
                d.parse_status === "uploading" ? "bg-sky-100" : "bg-amber-100"
              }`}
            >
              {d.parse_status === "uploading" ? (
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width] duration-200 ease-out"
                  style={{
                    width: `${Math.max(2, Math.min(100, d.upload_percent ?? 0))}%`,
                  }}
                />
              ) : (
                <div className="h-full w-full animate-pulse rounded-full bg-amber-500" />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
