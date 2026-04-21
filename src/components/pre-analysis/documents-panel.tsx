"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSelectedPreviewClient } from "@/hooks/use-selected-preview-client";
import {
  readUploadedDocs,
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

/**
 * Compact evidence uploader. File status and per-file progress bars now
 * render *inside the artifact coverage table* — so this component is
 * intentionally minimal: a drop zone, a category selector, and an
 * optional "anchored to a requirement" banner.
 */
export function DocumentsPanel({
  targetCategory,
  targetLabel,
  onClearTarget,
}: {
  /** When set, the upload zone auto-selects this category and shows an
   *  "Upload to satisfy this requirement" banner. */
  targetCategory?: string | null;
  targetLabel?: string | null;
  onClearTarget?: () => void;
}) {
  const { selectedId } = useSelectedPreviewClient();
  // Subscribe so React re-renders whenever an upload lands; we don't
  // render the list here but the subscription keeps the anchored state
  // reactive across the page.
  useSyncExternalStore(
    subscribeUploadedDocs,
    () => readUploadedDocs(selectedId),
    () => [] as readonly UploadedDoc[],
  );
  const [category, setCategory] = useState<string>("other");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLLabelElement>(null);

  // When the parent anchors a requirement, mirror it into the category
  // selector and scroll the drop zone into view so the operator can
  // immediately drag a file in without hunting for the picker.
  useEffect(() => {
    if (!targetCategory) return;
    setCategory(targetCategory);
    dropZoneRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [targetCategory]);

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
      upload_percent: 0,
    }));

    for (const d of pendingDocs) upsertUploadedDoc(d);
    if (inputRef.current) inputRef.current.value = "";

    // Sequential so a single progress bar at a time is authoritative,
    // rather than 5 bars stalling at the same %.
    for (let i = 0; i < files.length; i++) {
      await uploadAndParse(files[i], pendingDocs[i]);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="doc-category"
            className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
          >
            Category
          </label>
          <select
            id="doc-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              if (
                onClearTarget &&
                targetCategory &&
                e.target.value !== targetCategory
              ) {
                onClearTarget();
              }
            }}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-900 shadow-sm focus:border-slate-900 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {targetCategory && targetLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
              Anchored: {targetLabel}
              {onClearTarget && (
                <button
                  type="button"
                  onClick={onClearTarget}
                  className="ml-1 text-indigo-500 hover:text-indigo-900"
                  aria-label="Clear anchor"
                >
                  ×
                </button>
              )}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500">{ACCEPTED_MIME_LABELS}</p>
      </div>

      <label
        ref={dropZoneRef}
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
        className={`mt-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg border-2 border-dashed px-4 py-3 text-left transition ${
          dragActive
            ? "border-indigo-500 bg-indigo-50"
            : targetCategory
              ? "border-indigo-400 bg-indigo-50/40"
              : "border-slate-300 hover:border-slate-400"
        }`}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {targetCategory && targetLabel
              ? `Drop file here to satisfy: ${targetLabel}`
              : "Drop a file here, or click to browse"}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">
            Progress shown in the artifact row above.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
          Browse
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
    </div>
  );
}

// Upload one file via XHR so we can report real upload progress,
// then advance through parsing → parsed/failed.
function uploadAndParse(file: File, meta: UploadedDoc): Promise<void> {
  return new Promise((resolve) => {
    upsertUploadedDoc({ ...meta, parse_status: "uploading", upload_percent: 0 });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/preview/parse", true);

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      upsertUploadedDoc({
        ...meta,
        parse_status: "uploading",
        upload_percent: pct,
      });
    };

    xhr.upload.onload = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "parsing",
        upload_percent: 100,
      });
    };

    xhr.onerror = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "failed",
        error: "Network error during upload",
      });
      resolve();
    };

    xhr.ontimeout = () => {
      upsertUploadedDoc({
        ...meta,
        parse_status: "failed",
        error: "Upload timed out",
      });
      resolve();
    };

    xhr.onload = () => {
      try {
        const status = xhr.status;
        const body = xhr.responseText;
        let parsed: { text?: string; tokenCount?: number; error?: string } = {};
        try {
          parsed = JSON.parse(body);
        } catch {
          if (status >= 200 && status < 300) {
            upsertUploadedDoc({
              ...meta,
              parse_status: "failed",
              error: "Server returned non-JSON response",
            });
            return resolve();
          }
        }
        if (status < 200 || status >= 300) {
          upsertUploadedDoc({
            ...meta,
            parse_status: "failed",
            error: parsed.error ?? `HTTP ${status}`,
          });
          return resolve();
        }
        upsertUploadedDoc({
          ...meta,
          parse_status: "parsed",
          parsed_text: (parsed.text ?? "").trim(),
          token_count: parsed.tokenCount,
          upload_percent: 100,
        });
      } finally {
        resolve();
      }
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
