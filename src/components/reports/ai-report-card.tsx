"use client";

import { useCallback, useMemo, useState } from "react";
import type { AdvancedReportConfig } from "@/lib/reports/advanced-reports";

interface Props {
  config: AdvancedReportConfig;
  clientId: string | null;
  knowledgeBaseText: string;
  target: string;
}

interface GeneratedReport {
  content: string;
  generated_at: string;
  title: string;
  target: string;
  client: string;
}

export function AiReportCard({
  config,
  clientId,
  knowledgeBaseText,
  target,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedReport | null>(null);

  const canGenerate = Boolean(clientId) && !loading;

  const generate = useCallback(async () => {
    if (!clientId) {
      setError("Select an engagement first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          report_type: config.id,
          knowledge_base: knowledgeBaseText,
        }),
      });
      const json = (await res.json()) as {
        content?: string;
        generated_at?: string;
        title?: string;
        target?: string;
        client?: string;
        error?: string;
      };
      if (!res.ok || !json.content) {
        setError(json.error ?? `Request failed (${res.status})`);
        return;
      }
      setResult({
        content: json.content,
        generated_at: json.generated_at ?? new Date().toISOString(),
        title: json.title ?? config.title,
        target: json.target ?? target,
        client: json.client ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [clientId, config.id, config.title, knowledgeBaseText, target]);

  const exportPdf = useCallback(() => {
    if (!result) return;
    openPrintWindow({
      title: `${result.title} — ${result.target}`,
      subtitle: buildSubtitle(result),
      markdown: result.content,
      autoPrint: true,
    });
  }, [result]);

  const exportDocx = useCallback(() => {
    if (!result) return;
    const html = buildDocHtml({
      title: `${result.title} — ${result.target}`,
      subtitle: buildSubtitle(result),
      markdown: result.content,
    });
    // Word opens HTML-based .doc files natively.
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
    () => (result ? renderMarkdown(result.content) : null),
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
                Generated {formatTime(result.generated_at)}
              </span>
            </>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            {error}
          </div>
        )}

        {loading && !result && (
          <div className="mt-4 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        )}

        {rendered && (
          <div className="mt-5 max-h-[520px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="report-markdown">{rendered}</div>
          </div>
        )}
      </div>
    </article>
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

function buildSubtitle(r: GeneratedReport): string {
  const parts = [r.target];
  if (r.client) parts.push(r.client);
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
function renderInline(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

// Convert markdown-ish text into plain React nodes. Supports
// headings (# ## ###), unordered (-, *) and ordered (1.) lists,
// and paragraphs. Keeps output deterministic.
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const nodes: React.ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    const html = renderInline(para.join(" "));
    nodes.push(
      <p
        key={`p-${nodes.length}`}
        className="mb-3 text-sm leading-6 text-slate-700"
        dangerouslySetInnerHTML={{ __html: html }}
      />,
    );
    para = [];
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((t, i) => (
      <li
        key={i}
        className="ml-5 text-sm leading-6 text-slate-700"
        dangerouslySetInnerHTML={{ __html: renderInline(t) }}
      />
    ));
    nodes.push(
      list.ordered ? (
        <ol
          key={`ol-${nodes.length}`}
          className="mb-3 list-decimal space-y-1"
        >
          {items}
        </ol>
      ) : (
        <ul
          key={`ul-${nodes.length}`}
          className="mb-3 list-disc space-y-1"
        >
          {items}
        </ul>
      ),
    );
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = h[1].length;
      const text = renderInline(h[2]);
      const cls =
        level === 1
          ? "mt-4 mb-2 text-lg font-bold text-slate-900"
          : level === 2
            ? "mt-4 mb-2 text-base font-bold text-slate-900"
            : level === 3
              ? "mt-3 mb-1.5 text-sm font-semibold text-slate-900"
              : "mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-700";
      nodes.push(
        level === 1 ? (
          <h1
            key={`h-${nodes.length}`}
            className={cls}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ) : level === 2 ? (
          <h2
            key={`h-${nodes.length}`}
            className={cls}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ) : level === 3 ? (
          <h3
            key={`h-${nodes.length}`}
            className={cls}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ) : (
          <h4
            key={`h-${nodes.length}`}
            className={cls}
            dangerouslySetInnerHTML={{ __html: text }}
          />
        ),
      );
      continue;
    }

    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }

    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }

    flushList();
    para.push(line.trim());
  }

  flushPara();
  flushList();

  return nodes;
}

// Turn markdown into inline HTML for export surfaces (PDF/DOCX).
function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length === 0) return;
    out.push(`<p>${renderInline(para.join(" "))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((t) => `<li>${renderInline(t)}</li>`).join("");
    out.push(list.ordered ? `<ol>${items}</ol>` : `<ul>${items}</ul>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = Math.min(h[1].length, 4);
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      continue;
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line);
    if (ul) {
      flushPara();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(ul[1]);
      continue;
    }
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ol[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}

function buildDocumentStyles(): string {
  return `
    body { font-family: Calibri, Arial, sans-serif; color: #111; margin: 0.75in; }
    .cover { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 18px; }
    .cover h1 { font-size: 22pt; margin: 0 0 4px 0; }
    .cover p { margin: 0; color: #555; font-size: 10pt; }
    h1 { font-size: 18pt; margin: 18px 0 6px 0; }
    h2 { font-size: 14pt; margin: 14px 0 6px 0; }
    h3 { font-size: 12pt; margin: 10px 0 4px 0; }
    h4 { font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; margin: 8px 0 3px 0; }
    p { font-size: 11pt; line-height: 1.55; margin: 0 0 8px 0; }
    ul, ol { font-size: 11pt; line-height: 1.55; margin: 0 0 8px 18px; padding: 0; }
    li { margin-bottom: 2px; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    code { font-family: Consolas, monospace; background: #f2f2f2; padding: 1px 4px; border-radius: 3px; }
  `;
}

function buildDocHtml(args: {
  title: string;
  subtitle: string;
  markdown: string;
}): string {
  const body = markdownToHtml(args.markdown);
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
<style>${buildDocumentStyles()}</style>
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
  const body = markdownToHtml(args.markdown);
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(args.title)}</title>
<style>
${buildDocumentStyles()}
@media print { @page { margin: 0.6in; } }
</style>
</head>
<body>
<div class="cover">
<h1>${escapeHtml(args.title)}</h1>
<p>${escapeHtml(args.subtitle)}</p>
</div>
${body}
<script>
${args.autoPrint ? "window.addEventListener('load', function(){ setTimeout(function(){ window.focus(); window.print(); }, 150); });" : ""}
</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=1100");
  if (!win) {
    // Popup blocked — fall back to a same-tab data URL download so the
    // user can still get the PDF by printing to PDF themselves.
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
