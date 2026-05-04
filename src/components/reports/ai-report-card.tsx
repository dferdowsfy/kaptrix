"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GenerateButton } from "@/components/preview/generate-button";

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

  // --- Email report ---
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  const sendEmail = useCallback(async () => {
    if (!result?.content || !emailTo.trim()) return;
    setEmailSending(true);
    setEmailStatus(null);

    try {
      const reportHtml = markdownToExportHtml(result.content);
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTo.trim(),
          reportTitle: result.title || config.title,
          reportHtml,
          target: result.target || target,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEmailStatus({ type: "error", message: data.error || "Failed to send" });
      } else {
        setEmailStatus({ type: "success", message: `Sent to ${emailTo.trim()}` });
        setEmailTo("");
        setTimeout(() => {
          setEmailModalOpen(false);
          setEmailStatus(null);
        }, 2000);
      }
    } catch {
      setEmailStatus({ type: "error", message: "Network error" });
    } finally {
      setEmailSending(false);
    }
  }, [result, emailTo, config.title, target]);

  const rendered = useMemo(
    () =>
      result?.content ? <ReportMarkdown source={result.content} hideH1 /> : null,
    [result],
  );

  // Collapsed by default so multiple completed reports stack as a
  // tidy list. Auto-expand once when a fresh generation finishes so
  // the user sees their just-generated result without an extra click.
  const [expanded, setExpanded] = useState(false);
  const generatedAt = result?.generated_at;
  useEffect(() => {
    if (!generatedAt) return;
    const ageMs = Date.now() - new Date(generatedAt).getTime();
    if (ageMs < 5_000) setExpanded(true);
  }, [generatedAt]);

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
          <GenerateButton
            type="button"
            onClick={generate}
            disabled={!canGenerate}
          >
            {loading
              ? "Creating read…"
              : result
                ? "Re-create Read"
                : "Create Read"}
          </GenerateButton>
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
              <button
                type="button"
                onClick={() => { setEmailModalOpen(true); setEmailStatus(null); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Share Read
              </button>
              <span className="ml-auto text-[11px] text-slate-500">
                Saved · created{" "}
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
            {record?.sectionsTotal && record.sectionsTotal > 0 ? (
              <div
                className="h-1.5 bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(((record.sectionsDone ?? 0) / record.sectionsTotal) * 100))}%`,
                }}
              />
            ) : (
              <div className="h-1.5 w-full animate-report-progress bg-gradient-to-r from-indigo-300 via-indigo-500 to-violet-500" />
            )}
          </div>
        )}
        {loading && !result && record?.sectionsTotal ? (
          <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-indigo-700">
            <span>
              Section {Math.min((record.sectionsDone ?? 0) + 1, record.sectionsTotal)} of{" "}
              {record.sectionsTotal}
              {record.currentSection ? ` · ${record.currentSection}` : ""}
            </span>
            <span className="text-slate-500">
              Each section runs ~30-90s on CPU inference
            </span>
          </div>
        ) : null}
        {loading && !result && (
          <div className="mt-3 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        )}

        {rendered && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  ✓
                </span>
                <span>
                  Read ready
                  {result?.generated_at && (
                    <span className="ml-1 font-normal text-slate-500">
                      · {formatTime(result.generated_at)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-indigo-700">
                {expanded ? "Collapse" : "Expand"}
                <Chevron expanded={expanded} />
              </span>
            </button>
            {expanded && (
              <div className="mt-3 max-h-[640px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-inner">
                {rendered}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email modal */}
      {emailModalOpen && (
        <EmailModal
          to={emailTo}
          setTo={setEmailTo}
          sending={emailSending}
          status={emailStatus}
          onSend={sendEmail}
          onClose={() => { setEmailModalOpen(false); setEmailStatus(null); }}
        />
      )}
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

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 8 10 12 14 8" />
    </svg>
  );
}

function EmailModal({
  to,
  setTo,
  sending,
  status,
  onSend,
  onClose,
}: {
  to: string;
  setTo: (v: string) => void;
  sending: boolean;
  status: { type: "success" | "error"; message: string } | null;
  onSend: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Share this read</h3>
        <p className="mt-1 text-sm text-slate-500">
          The read will be sent from hello@kaptrix.com with your name in the subject line.
        </p>

        <label htmlFor="email-to" className="mt-4 block text-sm font-medium text-slate-700">
          Recipient email
        </label>
        <input
          ref={inputRef}
          id="email-to"
          type="email"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="recipient@firm.com"
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
          onKeyDown={(e) => {
            if (e.key === "Enter" && to.trim()) onSend();
          }}
        />

        {status && (
          <p
            className={`mt-3 text-sm font-medium ${
              status.type === "success" ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {status.message}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !to.trim()}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-slate-800 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
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

