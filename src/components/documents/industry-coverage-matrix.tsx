"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Document } from "@/lib/types";
import type { UploadedDoc } from "@/lib/preview/uploaded-docs";
import {
  UPLOAD_ACCEPT_ATTR,
  uploadFilesForCategory,
} from "@/lib/preview/upload-file";
import { removeUploadedDoc } from "@/lib/preview/uploaded-docs";
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
  // Custom artifact upload state — name + kind typed by the user
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState("");
  const customFileInputRef = useRef<HTMLInputElement>(null);
  const customFolderInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [skippedNotice, setSkippedNotice] = useState<string | null>(null);
  // Category the hidden <input type=file> is bound to for the current
  // click. Set immediately before we call .click() and read back in
  // onChange. Using a ref avoids a stale-state race if the user clicks
  // a second Upload button before the first file picker opens.
  const pendingCategoryRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter to the file types the parser pipeline actually supports.
  // Folder uploads and drag-drop drop everything (including .DS_Store,
  // images that aren't image/*, etc.) — keep only extensions that map
  // to a parser branch in src/lib/parsers/index.ts.
  const SUPPORTED_EXT = useMemo(
    () =>
      new Set([
        "pdf",
        "docx",
        "xlsx",
        "pptx",
        "txt",
        "csv",
        "png",
        "jpg",
        "jpeg",
        "webp",
      ]),
    [],
  );
  const filterSupported = useCallback(
    (files: File[]): { kept: File[]; skipped: number } => {
      const kept: File[] = [];
      let skipped = 0;
      for (const f of files) {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        if (SUPPORTED_EXT.has(ext)) kept.push(f);
        else skipped++;
      }
      return { kept, skipped };
    },
    [SUPPORTED_EXT],
  );

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
    const { kept, skipped } = filterSupported(Array.from(files));
    if (skipped > 0) {
      setSkippedNotice(
        `${skipped} file${skipped === 1 ? " was" : "s were"} skipped — unsupported format.`,
      );
      setTimeout(() => setSkippedNotice(null), 5000);
    }
    if (kept.length === 0) return;
    await uploadFilesForCategory({ clientId, category, files: kept });
  };

  // Custom artifact: slugify user-provided name into a stable category
  // prefixed with `custom_` so it doesn't collide with industry artifacts.
  const customCategory = useMemo(() => {
    const slug = customName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    return slug ? `custom_${slug}` : "";
  }, [customName]);

  const handleCustomUploadClick = () => {
    if (!clientId || !customCategory) return;
    if (customFileInputRef.current) customFileInputRef.current.value = "";
    customFileInputRef.current?.click();
  };

  const handleCustomFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !clientId || !customCategory) return;
    const { kept, skipped } = filterSupported(Array.from(files));
    if (skipped > 0) {
      setSkippedNotice(
        `${skipped} file${skipped === 1 ? " was" : "s were"} skipped — unsupported format.`,
      );
      setTimeout(() => setSkippedNotice(null), 5000);
    }
    if (kept.length === 0) return;
    await uploadFilesForCategory({
      clientId,
      category: customCategory,
      files: kept,
    });
    setCustomName("");
    setCustomKind("");
  };

  const handleCustomFolderClick = () => {
    if (!clientId || !customCategory) return;
    if (customFolderInputRef.current) customFolderInputRef.current.value = "";
    customFolderInputRef.current?.click();
  };

  // Recursively walks a directory entry from a drag-drop event,
  // returning every File found regardless of nesting depth.
  const readEntriesRecursively = useCallback(
    async (entry: FileSystemEntry): Promise<File[]> => {
      const out: File[] = [];
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry;
        await new Promise<void>((resolve) => {
          fileEntry.file((f) => {
            out.push(f);
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry;
        const reader = dirEntry.createReader();
        const readBatch = (): Promise<FileSystemEntry[]> =>
          new Promise((resolve) => {
            reader.readEntries((entries) => resolve(entries), () => resolve([]));
          });
        // readEntries returns batches — keep reading until empty.
        while (true) {
          const batch = await readBatch();
          if (batch.length === 0) break;
          for (const e of batch) {
            const nested = await readEntriesRecursively(e);
            out.push(...nested);
          }
        }
      }
      return out;
    },
    [],
  );

  const handleCustomDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (!clientId || !customCategory) return;

      // Prefer the modern items API so we can recursively expand
      // dropped folders. Fall back to dataTransfer.files for browsers
      // that don't support it.
      const items = e.dataTransfer.items;
      const collected: File[] = [];
      if (items && items.length > 0) {
        const tasks: Promise<File[]>[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) tasks.push(readEntriesRecursively(entry));
          else {
            const f = items[i].getAsFile();
            if (f) collected.push(f);
          }
        }
        const expanded = await Promise.all(tasks);
        for (const arr of expanded) collected.push(...arr);
      } else {
        const fl = e.dataTransfer.files;
        for (let i = 0; i < fl.length; i++) collected.push(fl[i]);
      }

      const { kept, skipped } = filterSupported(collected);
      if (skipped > 0) {
        setSkippedNotice(
          `${skipped} file${skipped === 1 ? " was" : "s were"} skipped — unsupported format.`,
        );
        setTimeout(() => setSkippedNotice(null), 5000);
      }
      if (kept.length === 0) return;
      await uploadFilesForCategory({
        clientId,
        category: customCategory,
        files: kept,
      });
      setCustomName("");
      setCustomKind("");
    },
    [clientId, customCategory, filterSupported, readEntriesRecursively],
  );

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

  // Standalone JSX for the custom-artifact uploader. Rendered below the
  // coverage table.
  const customArtifactCard = (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Upload other artifact
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Anything outside the standard list — name it and we&apos;ll add it to the knowledge base.
          </p>
        </div>
      </div>

      <input
        ref={customFileInputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT_ATTR}
        className="sr-only"
        onChange={handleCustomFileChange}
      />
      {/* Folder upload: webkitdirectory tells the picker to select a
          whole directory; React requires the lowercase attribute on a
          plain HTMLInputElement, so we set it via JSX. Files are
          filtered to supported types in handleCustomFileChange. */}
      <input
        ref={customFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error — non-standard but supported in Chromium and Safari
        webkitdirectory=""
        directory=""
        className="sr-only"
        onChange={handleCustomFileChange}
      />

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Name<span className="text-rose-400"> *</span>
          </span>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Customer reference call notes"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-500">
            Type
          </span>
          <select
            value={customKind}
            onChange={(e) => setCustomKind(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="">Select type…</option>
            <option value="evidence">Evidence / primary source</option>
            <option value="analysis">Analysis / write-up</option>
            <option value="contract">Contract / agreement</option>
            <option value="report">Report / summary</option>
            <option value="data">Data export / spreadsheet</option>
            <option value="notes">Meeting notes</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      {/* Drop zone — accepts multiple files OR a whole folder via
          drag-and-drop, recursively expanding dropped directories. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (clientId && customCategory) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
        }}
        onDrop={handleCustomDrop}
        className={`mt-4 rounded-xl border-2 border-dashed px-5 py-8 text-center transition ${
          !clientId || !customCategory
            ? "border-slate-200 bg-slate-50 opacity-60"
            : isDragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-300 bg-white hover:border-slate-400"
        }`}
      >
        <p className="text-base font-medium text-slate-800">
          Drop files or a folder here
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Supports PDF, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPEG · everything
          parses through the same pipeline as a single file
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            disabled={!clientId || !customCategory}
            onClick={handleCustomUploadClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Choose files
          </button>
          <button
            type="button"
            disabled={!clientId || !customCategory}
            onClick={handleCustomFolderClick}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Choose folder
          </button>
        </div>
        {!customCategory && (
          <p className="mt-3 text-xs text-slate-400">
            Enter a name above to enable uploads
          </p>
        )}
      </div>

      {skippedNotice && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {skippedNotice}
        </div>
      )}

      {(() => {
        const custom = uploadedDocs.filter((d) => d.category.startsWith("custom_"));
        if (custom.length === 0) return null;
        const byCat: Record<string, UploadedDoc[]> = {};
        for (const d of custom) (byCat[d.category] ??= []).push(d);
        return (
          <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Uploaded
            </p>
            {Object.entries(byCat).map(([cat, docs]) => {
              const label = cat
                .replace(/^custom_/, "")
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <div
                  key={cat}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-[11px] text-slate-400">
                    {docs.length} file{docs.length > 1 ? "s" : ""}
                  </p>
                  <RowUploads uploads={docs} compact clientId={clientId} />
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );

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

      {/* 1. Stats summary — always at top */}
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

      {/* 2. Subtle missing-artifacts prompt */}
      {missingRequired.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                {missingRequired.length}
              </span>
              <p className="text-sm font-medium text-slate-700">
                {missingRequired.length} required artifact{missingRequired.length > 1 ? "s" : ""} missing for{" "}
                <span className="font-semibold">{profile.label}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>{coveragePct}% coverage</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
            </div>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {missingRequired.map((r) => {
              const uploads = uploadsByCategory[r.artifact.category] ?? [];
              const inFlight = uploads.some(
                (u) =>
                  u.parse_status === "uploading" ||
                  u.parse_status === "parsing" ||
                  u.parse_status === "extracting" ||
                  u.parse_status === "queued",
              );
              return (
                <li
                  key={r.artifact.category}
                  className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium text-slate-800">
                        {r.artifact.display_name}
                      </p>
                      <p className="break-words text-[11px] text-slate-500">
                        {r.artifact.why_it_matters}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={!clientId || inFlight}
                      onClick={() => triggerUpload(r.artifact.category)}
                      className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {inFlight ? "Uploading…" : "Upload"}
                    </button>
                  </div>
                  <RowUploads uploads={uploads} compact clientId={clientId} />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 3. Artifact table */}
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
                        clientId={clientId}
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

      {/* 4. Upload other artifact — below table */}
      {customArtifactCard}
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
  clientId,
}: {
  uploads: UploadedDoc[];
  compact?: boolean;
  clientId?: string | null;
}) {
  if (uploads.length === 0) return null;
  // Compact mode keeps everything visible so users see the ✓ confirmation
  // and can remove files after a successful upload.
  const visible = compact
    ? uploads.filter(
        (d) =>
          d.parse_status === "uploading" ||
          d.parse_status === "parsing" ||
          d.parse_status === "extracting" ||
          d.parse_status === "queued" ||
          d.parse_status === "parsed" ||
          d.parse_status === "failed",
      )
    : uploads;
  if (visible.length === 0) return null;
  return (
    <ul className={compact ? "space-y-1.5" : "mt-2 space-y-2"}>
      {visible.map((d) => (
        <li key={d.id}>
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white/60 px-2 py-1.5">
            <span
              className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700"
              title={d.filename}
            >
              {d.filename}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              {d.parse_status === "uploading" ? (
                <span className="tabular-nums text-[11px] font-semibold text-sky-700">
                  {Math.max(0, Math.min(100, d.upload_percent ?? 0))}%
                </span>
              ) : d.parse_status === "parsing" ? (
                <span className="text-[11px] font-semibold text-amber-700">
                  Parsing…
                </span>
              ) : d.parse_status === "extracting" ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-700">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                  Analysing…
                </span>
              ) : d.parse_status === "parsed" ? (
                <span
                  className="text-[11px] font-semibold text-emerald-700"
                  title={
                    typeof d.insights_count === "number"
                      ? `${d.insights_count} insight${d.insights_count === 1 ? "" : "s"} extracted`
                      : "Parsed"
                  }
                >
                  ✓ Ready
                  {typeof d.insights_count === "number" && d.insights_count > 0
                    ? ` · ${d.insights_count} insight${d.insights_count === 1 ? "" : "s"}`
                    : ""}
                </span>
              ) : d.parse_status === "failed" ? (
                <span
                  className="text-[11px] font-semibold text-rose-700"
                  title={d.error ?? "Failed"}
                >
                  Failed
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500">
                  Queued
                </span>
              )}
              {clientId && (
                <button
                  type="button"
                  aria-label={`Remove ${d.filename}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeUploadedDoc(clientId, d.id);
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition hover:border-rose-400 hover:bg-rose-100"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3 w-3"
                  >
                    <path d="M7.5 3a1 1 0 0 0-1 1v1H4a1 1 0 1 0 0 2h.3l.7 9.3A2 2 0 0 0 7 18h6a2 2 0 0 0 2-1.7l.7-9.3H16a1 1 0 1 0 0-2h-2.5V4a1 1 0 0 0-1-1h-5zm1 2V4h3v1h-3zM7 8a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1zm3 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1zm3 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1z" />
                  </svg>
                  Remove
                </button>
              )}
            </div>
          </div>
          {(d.parse_status === "uploading" ||
            d.parse_status === "parsing" ||
            d.parse_status === "extracting" ||
            d.parse_status === "queued") && (
            <div
              className={`mt-1 h-1 w-full overflow-hidden rounded-full ${
                d.parse_status === "uploading"
                  ? "bg-sky-100"
                  : d.parse_status === "extracting"
                    ? "bg-violet-100"
                    : "bg-amber-100"
              }`}
            >
              {d.parse_status === "uploading" ? (
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width] duration-200 ease-out"
                  style={{
                    width: `${Math.max(2, Math.min(100, d.upload_percent ?? 0))}%`,
                  }}
                />
              ) : d.parse_status === "extracting" ? (
                <div className="h-full w-full animate-pulse rounded-full bg-violet-500" />
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
