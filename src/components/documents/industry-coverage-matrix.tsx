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
  // Hero dropzone (top of page) — always routes to a generic
  // "custom_uploads" bucket so the operator can drop files without
  // first entering a name.
  const [skippedNotice, setSkippedNotice] = useState<string | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const heroFolderInputRef = useRef<HTMLInputElement>(null);
  const [heroDragging, setHeroDragging] = useState(false);
  const HERO_CATEGORY = "custom_uploads";
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

  // Hero dropzone handlers — always route to HERO_CATEGORY so the
  // operator can drop files at the top without naming a category.
  const handleHeroFilesClick = () => {
    if (!clientId) return;
    if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    heroFileInputRef.current?.click();
  };
  const handleHeroFolderClick = () => {
    if (!clientId) return;
    if (heroFolderInputRef.current) heroFolderInputRef.current.value = "";
    heroFolderInputRef.current?.click();
  };
  const handleHeroFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !clientId) return;
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
      category: HERO_CATEGORY,
      files: kept,
    });
  };
  const handleHeroDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setHeroDragging(false);
      if (!clientId) return;
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
        category: HERO_CATEGORY,
        files: kept,
      });
    },
    [clientId, filterSupported, readEntriesRecursively],
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

  // Recently-dropped files that flowed through the hero dropzone.
  // These live in the "custom_uploads" bucket and aren't tied to a
  // matrix row, so we render them inline under the dropzone for
  // immediate feedback. They also appear in the global uploaded-docs
  // store so chat / scoring / reports continue to see them.
  const heroUploads = useMemo(
    () => uploadedDocs.filter((d) => d.category === HERO_CATEGORY),
    [uploadedDocs],
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
      {/* Hero dropzone hidden inputs — files + folder. */}
      <input
        ref={heroFileInputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT_ATTR}
        className="sr-only"
        onChange={handleHeroFileChange}
      />
      <input
        ref={heroFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error — non-standard but supported in Chromium and Safari
        webkitdirectory=""
        directory=""
        className="sr-only"
        onChange={handleHeroFileChange}
      />

      {/* Hero dropzone — top of the page, prominent target for batch
          uploads. Light-purple flat background with a soft glowing
          ring on hover/drag, matching the platform's purple/indigo
          identity. Routes to a generic "custom_uploads" category so
          the operator can drop files without first naming them. */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (clientId) setHeroDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHeroDragging(false);
        }}
        onDrop={handleHeroDrop}
        className={`relative overflow-hidden rounded-2xl border bg-violet-50 px-6 py-6 shadow-[0_0_0_1px_rgba(139,92,246,0.12),0_0_24px_rgba(139,92,246,0.18)] transition ${
          heroDragging
            ? "border-violet-500 bg-violet-100 shadow-[0_0_0_2px_rgba(139,92,246,0.35),0_0_36px_rgba(139,92,246,0.35)]"
            : "border-violet-200 hover:border-violet-300 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_28px_rgba(139,92,246,0.25)]"
        }`}
      >
        {/* Subtle inner glow accent, matches purple branding */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-r from-violet-100/0 via-violet-200/30 to-violet-100/0"
        />
        <div className="relative flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-700">
              Drop zone
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              Drop files or a folder to add to the data room
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Supports PDF, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPEG ·
              everything parses through the same pipeline as a single
              file.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={!clientId}
              onClick={handleHeroFilesClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Choose files
            </button>
            <button
              type="button"
              disabled={!clientId}
              onClick={handleHeroFolderClick}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Choose folder
            </button>
          </div>
        </div>
      </div>

      {skippedNotice && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {skippedNotice}
        </div>
      )}

      {/* Recent uploads — files flowed through the hero dropzone.
          Appears immediately below the dropzone so the operator sees
          live parse status (uploading → parsing → parsed) without
          scrolling to the matrix. The same files are also indexed
          into the global uploaded-docs store, so chat / scoring /
          reports continue to see them. */}
      {heroUploads.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Recent uploads
            </p>
            <span className="text-xs text-slate-400">
              {heroUploads.length} file{heroUploads.length === 1 ? "" : "s"}
            </span>
          </div>
          <RowUploads uploads={heroUploads} compact clientId={clientId} />
        </div>
      )}

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
