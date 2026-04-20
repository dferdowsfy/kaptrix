"use client";

import { useCallback, useState } from "react";
import {
  ReportMarkdown,
  markdownToExportHtml,
} from "@/components/reports/report-markdown";
import {
  clearReport,
  useReportStore,
  type ReportRecord,
} from "@/lib/reports/report-store";
import {
  ADVANCED_REPORTS,
  type AdvancedReportId,
} from "@/lib/reports/advanced-reports";

/**
 * "Saved reports" list. Shows every report the signed-in user has
 * generated, across every client and every report type, with the
 * date/time it was generated. Reports hydrate from Supabase on first
 * render (see report-store.hydrateFromServer) so previously
 * generated reports appear even on a new browser/device.
 */
export function SavedReportsList() {
  const { records } = useReportStore();

  const done = records
    .filter((r) => r.status === "done" && r.content)
    .sort((a, b) => {
      const ta = a.generated_at ? new Date(a.generated_at).getTime() : 0;
      const tb = b.generated_at ? new Date(b.generated_at).getTime() : 0;
      return tb - ta;
    });

  if (done.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
        You have not generated any reports yet. Pick a report above and click
        <span className="mx-1 font-semibold text-slate-700">Generate report</span>
        — it will be saved here and remain available across browsers.
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {done.map((r) => (
        <SavedReportRow key={`${r.clientId}::${r.reportId}`} record={r} />
      ))}
    </div>
  );
}

function SavedReportRow({ record }: { record: ReportRecord }) {
  const [expanded, setExpanded] = useState(false);

  const exportPdf = useCallback(() => {
    if (!record.content) return;
    openPrintWindow({
      title: `${record.title} — ${record.target}`,
      subtitle: buildSubtitle(record),
      markdown: record.content,
    });
  }, [record]);

  const exportDocx = useCallback(() => {
    if (!record.content) return;
    const html = buildDocHtml({
      title: `${record.title} — ${record.target}`,
      subtitle: buildSubtitle(record),
      markdown: record.content,
    });
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(record.title)}-${slugify(record.target)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, [record]);

  const remove = useCallback(() => {
    if (
      !window.confirm(
        `Delete "${record.title}" for ${record.target}? This removes it from every device.`,
      )
    )
      return;
    clearReport(record.clientId, record.reportId as AdvancedReportId);
  }, [record]);

  const eyebrow =
    ADVANCED_REPORTS.find((c) => c.id === record.reportId)?.eyebrow ??
    record.reportId;

  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">
          {eyebrow}
        </p>
        <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-900">
          {record.title}
        </h4>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {record.target}
          {record.client ? ` · ${record.client}` : ""}
          {record.generated_at
            ? ` · Generated ${formatDateTime(record.generated_at)}`
            : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          {expanded ? "Hide" : "View"}
        </button>
        <button
          type="button"
          onClick={exportPdf}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          PDF
        </button>
        <button
          type="button"
          onClick={exportDocx}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          DOCX
        </button>
        <button
          type="button"
          onClick={remove}
          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
        >
          Delete
        </button>
      </div>

      {expanded && record.content ? (
        <div className="mt-3 w-full max-h-[640px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-inner sm:basis-full">
          <ReportMarkdown source={record.content} />
        </div>
      ) : null}
    </div>
  );
}

// -----------------------------------------------------------------
// Helpers (mirrored from ai-report-card to avoid a circular import)
// -----------------------------------------------------------------

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function buildSubtitle(r: ReportRecord): string {
  const parts = [r.target];
  if (r.client) parts.push(r.client);
  if (r.generated_at)
    parts.push(`Generated ${new Date(r.generated_at).toLocaleString()}`);
  return parts.filter(Boolean).join(" · ");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function openPrintWindow(args: {
  title: string;
  subtitle: string;
  markdown: string;
}): void {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  const bodyHtml = markdownToExportHtml(args.markdown);
  win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color:#0A0B1F; margin:40px; }
  h1 { font-size:22px; margin:0 0 4px; }
  .sub { color:#6b7280; font-size:12px; margin:0 0 24px; }
  h2 { font-size:18px; margin-top:28px; }
  h3 { font-size:15px; margin-top:20px; }
  p, li { font-size:13px; line-height:1.6; }
  table { border-collapse: collapse; width:100%; margin:12px 0; }
  th, td { border:1px solid #e5e7eb; padding:6px 8px; text-align:left; font-size:12px; }
  pre { background:#f4f4f7; padding:10px; border-radius:6px; overflow:auto; }
  code { font-family: ui-monospace, Menlo, monospace; font-size:12px; }
</style>
</head>
<body>
<h1>${escapeHtml(args.title)}</h1>
<p class="sub">${escapeHtml(args.subtitle)}</p>
${bodyHtml}
<script>window.onload = () => { setTimeout(() => window.print(), 300); };</script>
</body>
</html>`);
  win.document.close();
}

function buildDocHtml(args: {
  title: string;
  subtitle: string;
  markdown: string;
}): string {
  const body = markdownToExportHtml(args.markdown);
  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
</head>
<body>
<h1>${escapeHtml(args.title)}</h1>
<p style="color:#6b7280;font-size:12px">${escapeHtml(args.subtitle)}</p>
${body}
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
