"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { Document as DocRecord } from "@/lib/types";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  readUploadedDocs,
  removeUploadedDoc,
  subscribeUploadedDocs,
  upsertUploadedDoc,
  type UploadedDoc,
} from "@/lib/preview/uploaded-docs";

const CATEGORIES = [
  "deck",
  "architecture",
  "security",
  "model_ai",
  "data_privacy",
  "customer_contracts",
  "vendor_list",
  "financial",
  "incident_log",
  "team_bios",
  "demo",
  "other",
];

const ACCEPTED_MIME_LABELS = "PDF · DOCX · XLSX · PPTX · PNG · JPEG · CSV · TXT";
const ACCEPT_ATTR =
  ".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/csv,text/plain,image/png,image/jpeg";

export function DocumentsPanel({ baseDocs }: { baseDocs: DocRecord[] }) {
  const { selectedId } = useSelectedPreviewClient();
  const added = useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );
  const [category, setCategory] = useState<string>("other");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedId) return;
    const now = new Date().toISOString();

    const pendingDocs: UploadedDoc[] = Array.from(files).map((f, i) => ({
      id: `upload-${Date.now()}-${i}`,
      client_id: selectedId,
      filename: f.name,
      category,
      file_size_bytes: f.size,
      mime_type: f.type || "application/octet-stream",
      uploaded_at: now,
      parse_status: "queued",
    }));

    // Optimistic insert so the row appears immediately.
    for (const d of pendingDocs) upsertUploadedDoc(d);
    if (inputRef.current) inputRef.current.value = "";

    // Send each file to the real parser. Images go through the vision
    // pipeline; text/office formats go through the native parsers.
    // Result is stored in per-engagement localStorage so the chatbot
    // can cite it as evidence alongside the seeded KB.
    await Promise.all(
      Array.from(files).map(async (file, i) => {
        const meta = pendingDocs[i];
        upsertUploadedDoc({ ...meta, parse_status: "parsing" });
        const form = new FormData();
        form.append("file", file);
        try {
          const res = await fetch("/api/preview/parse", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const errBody = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            upsertUploadedDoc({
              ...meta,
              parse_status: "failed",
              error: errBody.error ?? `HTTP ${res.status}`,
            });
            return;
          }
          const data = (await res.json()) as {
            text?: string;
            tokenCount?: number;
          };
          upsertUploadedDoc({
            ...meta,
            parse_status: "parsed",
            parsed_text: (data.text ?? "").trim(),
            token_count: data.tokenCount,
          });
        } catch (err) {
          upsertUploadedDoc({
            ...meta,
            parse_status: "failed",
            error: err instanceof Error ? err.message : "Parse failed",
          });
        }
      }),
    );
  };

  const remove = (id: string) => {
    if (!selectedId) return;
    removeUploadedDoc(selectedId, id);
  };

  const allDocs = [
    ...added.map((d) => ({
      id: d.id,
      filename: d.filename,
      category: d.category,
      file_size_bytes: d.file_size_bytes,
      uploaded_at: d.uploaded_at,
      parse_status: d.parse_status,
      error: d.error,
      token_count: d.token_count,
      source: "added" as const,
    })),
    ...baseDocs.map((d) => ({
      id: d.id,
      filename: d.filename,
      category: d.category,
      file_size_bytes: d.file_size_bytes,
      uploaded_at: d.uploaded_at,
      parse_status: d.parse_status,
      source: "seeded" as const,
    })),
  ];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            Diligence documents
          </h3>
          <p className="text-sm text-slate-600">
            These files feed Kaptrix&rsquo;s reasoning. Add more evidence to sharpen
            claims, red flags, and the executive report.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="doc-category" className="text-sm font-medium text-slate-700">
            Category
          </label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label
        htmlFor="doc-file-input"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
          dragActive
            ? "border-indigo-500 bg-indigo-50"
            : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <p className="text-sm font-semibold text-slate-800">
          Drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {ACCEPTED_MIME_LABELS} · parsed into this client&rsquo;s KB for chat
        </p>
        <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm">
          Browse files
        </span>
        <input
          ref={inputRef}
          id="doc-file-input"
          type="file"
          multiple
          className="sr-only"
          accept={ACCEPT_ATTR}
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Filename
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Category
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Size
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {allDocs.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 text-sm font-medium text-slate-900">
                  {d.filename}
                  {d.source === "added" && (
                    <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                      new
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-sm capitalize text-slate-700">
                  {d.category.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-2 text-sm text-slate-600">
                  {formatBytes(d.file_size_bytes)}
                </td>
                <td className="px-4 py-2">
                  <StatusPill status={d.parse_status} />
                  {d.source === "added" && "error" in d && d.error && (
                    <span
                      className="ml-2 text-[11px] text-rose-600"
                      title={d.error}
                    >
                      · {d.error.length > 60 ? `${d.error.slice(0, 57)}…` : d.error}
                    </span>
                  )}
                  {d.source === "added" &&
                    "token_count" in d &&
                    d.parse_status === "parsed" &&
                    typeof d.token_count === "number" && (
                      <span className="ml-2 text-[11px] text-slate-500">
                        · ~{d.token_count.toLocaleString()} tokens
                      </span>
                    )}
                </td>
                <td className="px-4 py-2 text-right">
                  {d.source === "added" ? (
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                    >
                      Remove
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">seeded</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style =
    status === "parsed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "parsing"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : status === "failed"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ${style}`}
    >
      {status}
    </span>
  );
}

function formatBytes(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
