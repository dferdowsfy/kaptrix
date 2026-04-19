"use client";

import { useCallback, useMemo } from "react";
import type { AdvancedReportConfig } from "@/lib/reports/advanced-reports";
import {
  ReportMarkdown,
  markdownToExportHtml,
  buildExportDocumentStyles,
} from "@/components/reports/report-markdown";
import {
  startGeneration,
  useReportStore,
  type ReportRecord,
} from "@/lib/reports/report-store";

interface Props {
  config: AdvancedReportConfig;
  clientId: string | null;
  knowledgeBaseText: string;
  target: string;
}

export function AiReportCard({
  config,
  clientId,
  knowledgeBaseText,
  target,
}: Props) {
  const { get } = useReportStore();
  const record = clientId ? get(clientId, config.id) : undefined;

  const loading = record?.status === "generating";
  const error = record?.status === "error" ? (record.error ?? "Unknown error") : null;
  const result =
    record?.status === "done" && record.content
      ? record
      : null;

  const canGenerate = Boolean(clientId) && !loading;

  const generate = useCallback(() => {
    if (!clientId) return;
    startGeneration({
      reportId: config.id,
      clientId,
      target,
      knowledgeBase: knowledgeBaseText,
      title: config.title,
    });
  }, [clientId, config.id, config.title, knowledgeBaseText, target]);

  const exportPdf = useCallback(() => {
    if (!result?.content) return;
    openPrintWindow({
      title: `${result.title} — ${result.target}`,
      subtitle: buildSubtitle(result),
      markdown: result.content,
      autoPrint: true,
    });
  }, [result]);

  const exportDocx = useCallback(() => {
    if (!result?.content) return;
    const html = buildDocHtml({
      title: `${result.title} — ${result.target}`,
      subtitle: buildSubtitle(result),
      markdown: result.content,
    });
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(result.title)}-${slugify(result.target)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }, [result]);

  const rendered = useMemo(
    () =>
      result?.content ? <ReportMarkdown source={result.content} /> : null,
    [result],
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header
        className={`bg-gradient-to-br ${config.accent} px-5 py-4 text-white`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">
          {config.eyebrow}
        </p>
        <h3 className="mt-1 text-lg font-bold">{config.title}</h3>
        <p className="mt-1 text-xs text-white/90">{config.tagline}</p>
      </header>

      <div className="px-5 py-4">
        <p className="text-sm leading-6 text-slate-600">{config.description}</p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Generating…"
              : result
                ? "Regenerate"
                : "Generate report"}
          </button>
          {result && (
            <>
              <button
                type="button"
                onClick={exportPdf}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={exportDocx}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Export DOCX
              </button>
              <span className="ml-auto text-[11px] text-slate-500">
                Saved · generated{" "}
                {result.generated_at ? formatTime(result.generated_at) : ""}
              </span>
            </>
          )}
          {loading && !result && (
            <span className="ml-auto inline-flex items-center gap-2 text-[11px] font-medium text-indigo-700">
              <Spinner />
              Running in background — safe to switch pages
            </span>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {loading && !result && (
          <div className="mt-4 overflow-hidden rounded-lg bg-indigo-50">
            <div className="h-1.5 w-full animate-report-progress bg-gradient-to-r from-indigo-300 via-indigo-500 to-violet-500" />
          </div>
        )}
        {loading && !result && (
          <div className="mt-3 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        )}

        {rendered && (
          <div className="mt-5 max-h-[640px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-inner">
            {rendered}
          </div>
        )}
      </div>
    </article>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700"
    />
  );
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Minimal inline formatter: **bold**, *italic*, `code`.
function buildDocHtml(args: {
  title: string;
  subtitle: string;
  markdown: string;
}): string {
  const body = markdownToExportHtml(args.markdown);
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
<style>${buildExportDocumentStyles()}</style>
</head>
<body>
<div class="cover">
<h1>${escapeHtml(args.title)}</h1>
<p>${escapeHtml(args.subtitle)}</p>
</div>
${body}
</body>
</html>`;
}

function openPrintWindow(args: {
  title: string;
  subtitle: string;
  markdown: string;
  autoPrint?: boolean;
}): void {
  const body = markdownToExportHtml(args.markdown);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
<style>
${buildExportDocumentStyles()}
@media print { @page { margin: 0.55in; } }
</style>
</head>
<body>
<div class="cover">
<h1>${escapeHtml(args.title)}</h1>
<p>${escapeHtml(args.subtitle)}</p>
</div>
${body}
<script>
${args.autoPrint ? "window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 200); });" : ""}
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=960,height=1200");
  if (!win) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

