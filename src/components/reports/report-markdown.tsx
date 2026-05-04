"use client";

import React from "react";

// ---------------------------------------------------------------
// Rich markdown renderer tuned for diligence reports.
//
// Supports:
//   - # / ## / ### headings (## auto-numbered as "01 · TITLE")
//   - Paragraphs, **bold**, *italic*, `code`, [links](url)
//   - Bulleted (-, *) and ordered (1.) lists with nested indent
//   - GitHub-style tables (| col | col |) with header row +
//     severity-aware row coloring (Critical / High / Medium / Low / OK)
//   - Horizontal rules (--- / ***)
//   - Blockquotes (>) rendered as accent callout boxes
//   - Score lines like `Product credibility: 3.6 / 5` rendered as
//     progress bars matching the app's scorecard aesthetic.
//   - Severity/confidence tokens ([CRITICAL], [HIGH], [MEDIUM],
//     [LOW], [OK], [GAP]) rendered as colored pills.
// ---------------------------------------------------------------

export function ReportMarkdown({
  source,
  hideH1 = false,
}: {
  source: string;
  /** When true, drops the first H1 block so the report can be embedded
   *  inside a host that already shows its own title (e.g. the saved-
   *  reports row header). */
  hideH1?: boolean;
}) {
  let blocks = parseBlocks(source);
  if (hideH1) {
    const firstH1 = blocks.findIndex((b) => b.kind === "h1");
    if (firstH1 !== -1) blocks = blocks.filter((_, i) => i !== firstH1);
  }
  return <div className="report-markdown space-y-4">{blocks.map(renderBlock)}</div>;
}

// ---- Block model ------------------------------------------------

type Block =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string; number: number }
  | { kind: "h3"; text: string }
  | { kind: "h4"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" }
  | { kind: "quote"; lines: string[] }
  | { kind: "table"; header: string[]; rows: string[][]; align: Array<"left" | "right" | "center"> }
  | { kind: "score-group"; scores: Array<{ label: string; value: number; max: number }> }
  | { kind: "snapshot"; data: SnapshotData }
  | { kind: "dimensions"; rows: DimensionRow[] }
  | { kind: "coverage"; data: CoverageData }
  | { kind: "callout"; label: string; body: string };

export interface SnapshotData {
  verdict: string;
  posture?: string; // CRITICAL / HIGH / MEDIUM / LOW / OK
  confidence?: number; // 0-100
  thesis?: string;
  strengths: string[];
  risks: string[];
  highlights: string[]; // neutral facts (used by non-IC reports)
}

export interface DimensionRow {
  key: string;
  label: string;
  score: number; // 0-5
  status: string; // Supported | Partially Supported | Missing / Required | Contradicted
  rationale: string;
  subCriteria: Array<{ key: string; label: string; score: number; rationale: string }>;
}

export interface CoverageData {
  supported: string[];
  partial: string[];
  missing: string[];
}

const DIMENSION_LABELS_LOCAL: Record<string, string> = {
  product_credibility: "Product Credibility",
  tooling_exposure: "Tooling & Vendor Exposure",
  data_sensitivity: "Data & Sensitivity Risk",
  governance_safety: "Governance & Safety",
  production_readiness: "Production Readiness",
  open_validation: "Open Validation",
};

function dimensionLabel(key: string): string {
  return (
    DIMENSION_LABELS_LOCAL[key.toLowerCase()] ??
    key
      .split(/[_\s]+/)
      .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
      .join(" ")
  );
}

function parseBlocks(src: string): Block[] {
  const normalized = normalizeCollapsedTables(src);
  const lines = normalized.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let h2Counter = 0;

  const pushPara = (buf: string[]) => {
    if (buf.length === 0) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "p", text });
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    if (!line.trim()) {
      i++;
      continue;
    }

    // Decision snapshot fence: ":::snapshot" ... ":::"
    if (/^\s*:::\s*snapshot\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing :::
      blocks.push({ kind: "snapshot", data: parseSnapshot(buf) });
      continue;
    }

    // Dimension grid fence: ":::dimensions" ... ":::"
    if (/^\s*:::\s*dimensions\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "dimensions", rows: parseDimensions(buf) });
      continue;
    }

    // Evidence-coverage fence: ":::coverage" ... ":::"
    if (/^\s*:::\s*coverage\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "coverage", data: parseCoverage(buf) });
      continue;
    }

    // Callout fence: ":::callout label=\"...\"" ... ":::"
    const calloutMatch = /^\s*:::\s*callout(?:\s+label\s*=\s*"([^"]*)")?\s*$/i.exec(line);
    if (calloutMatch) {
      const label = (calloutMatch[1] ?? "Note").trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      const body = buf.join(" ").replace(/\s+/g, " ").trim();
      blocks.push({ kind: "callout", label, body });
      continue;
    }

    // Horizontal rule
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // Heading
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1) blocks.push({ kind: "h1", text });
      else if (level === 2) {
        h2Counter += 1;
        blocks.push({ kind: "h2", text, number: h2Counter });
      } else if (level === 3) blocks.push({ kind: "h3", text });
      else blocks.push({ kind: "h4", text });
      i++;
      continue;
    }

    // Blockquote (merge consecutive > lines)
    if (/^\s*>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", lines: qLines });
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) {
      const header = splitTableRow(line);
      const alignLine = splitTableRow(lines[i + 1]);
      const align = alignLine.map<"left" | "right" | "center">((c) => {
        const t = c.trim();
        if (t.startsWith(":") && t.endsWith(":")) return "center";
        if (t.endsWith(":")) return "right";
        return "left";
      });
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows, align });
      continue;
    }

    // Lists
    const ulMatch = /^\s*[-*]\s+(.*)$/.exec(line);
    const olMatch = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ulMatch || olMatch) {
      const ordered = Boolean(olMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i].trimEnd();
        if (!l.trim()) break;
        const um = /^\s*[-*]\s+(.*)$/.exec(l);
        const om = /^\s*\d+\.\s+(.*)$/.exec(l);
        if (ordered && om) {
          items.push(om[1]);
          i++;
        } else if (!ordered && um) {
          items.push(um[1]);
          i++;
        } else {
          break;
        }
      }

      // If every item looks like a score line (e.g. "Label: 3.6/5"),
      // promote the whole list to a visual score group.
      const scoreItems = items
        .map(parseScoreItem)
        .filter((s): s is { label: string; value: number; max: number } => s !== null);
      if (!ordered && scoreItems.length >= 2 && scoreItems.length === items.length) {
        blocks.push({ kind: "score-group", scores: scoreItems });
        continue;
      }

      blocks.push(ordered ? { kind: "ol", items } : { kind: "ul", items });
      continue;
    }

    // Paragraph (accumulate until blank line / structural element)
    const paraBuf: string[] = [];
    while (i < lines.length) {
      const l = lines[i].trimEnd();
      if (!l.trim()) break;
      if (/^(#{1,6})\s+/.test(l)) break;
      if (/^\s*[-*]\s+/.test(l)) break;
      if (/^\s*\d+\.\s+/.test(l)) break;
      if (/^\s*>\s?/.test(l)) break;
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) break;
      if (l.includes("|") && i + 1 < lines.length && isTableSeparatorLine(lines[i + 1])) break;
      paraBuf.push(l.trim());
      i++;
    }
    pushPara(paraBuf);
  }

  return blocks;
}

function isTableSeparatorLine(line: string): boolean {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function normalizeCollapsedTables(src: string): string {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];

  for (const rawLine of lines) {
    const expanded = expandCollapsedTableLine(rawLine);
    if (expanded) out.push(...expanded);
    else out.push(rawLine);
  }

  return out.join("\n");
}

function expandCollapsedTableLine(rawLine: string): string[] | null {
  const line = rawLine.trimEnd();
  if (!line.includes("|") || !line.includes("---")) return null;

  const firstPipe = line.indexOf("|");
  if (firstPipe < 0) return null;

  const prefix = line.slice(0, firstPipe).trimEnd();
  const tableChunk = line.slice(firstPipe).trim();

  // Only attempt recovery when multiple table rows were collapsed onto
  // one physical line (e.g. "... | col | | --- | ...").
  if (!/\|\s+\|/.test(tableChunk)) return null;

  const rows = splitCollapsedTableRows(tableChunk);
  if (!rows || rows.length < 2) return null;
  if (!isTableSeparatorLine(rows[1])) return null;

  const headerCols = splitTableRow(rows[0]).length;
  if (headerCols < 2) return null;

  // Guard against accidental false positives.
  for (const row of rows) {
    if (splitTableRow(row).length !== headerCols) return null;
  }

  return prefix ? [prefix, ...rows] : rows;
}

function splitCollapsedTableRows(chunk: string): string[] | null {
  if (!chunk.startsWith("|")) return null;

  // Find boundary between header and separator row in one-line table text.
  const headerBoundary = chunk.search(/\|\s+(?=\|\s*:?-{3,})/);
  if (headerBoundary < 0) return null;

  const header = chunk.slice(0, headerBoundary + 1).trim();
  const colCount = splitTableRow(header).length;
  if (colCount < 2) return null;

  const rows: string[] = [header];
  let rest = chunk.slice(headerBoundary + 1).trimStart();
  const pipesPerRow = colCount + 1;

  while (rest.startsWith("|")) {
    const next = takeRowByPipeCount(rest, pipesPerRow);
    if (!next) break;
    rows.push(next.row);
    if (next.rest === rest) break;
    rest = next.rest.trimStart();
  }

  return rows.length >= 2 ? rows : null;
}

function takeRowByPipeCount(
  s: string,
  pipesNeeded: number,
): { row: string; rest: string } | null {
  let pipes = 0;
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== "|") continue;
    pipes += 1;
    if (pipes === pipesNeeded) {
      return {
        row: s.slice(0, i + 1).trim(),
        rest: s.slice(i + 1),
      };
    }
  }
  return null;
}

function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map((c) => c.trim());
}

function parseScoreItem(
  text: string,
): { label: string; value: number; max: number } | null {
  // Strip markdown bold/italic
  const plain = text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
  // Patterns: "Label: 3.6 / 5", "Label — 3.6/5", "Label: 3.6"
  const m = /^(.+?)\s*(?::|—|–|-)\s*([0-5](?:\.\d+)?)\s*(?:\/\s*(\d+(?:\.\d+)?))?\s*$/.exec(
    plain,
  );
  if (!m) return null;
  const value = parseFloat(m[2]);
  if (!Number.isFinite(value)) return null;
  const max = m[3] ? parseFloat(m[3]) : 5;
  if (max !== 5 && max !== 10 && max !== 100) return null;
  return { label: m[1].trim(), value, max };
}

// Parse the body of a ':::snapshot ... :::' block into structured data.
// Accepts "key: value" lines and grouped lists under "strengths:",
// "risks:", "highlights:" where items start with "- ".
function parseSnapshot(raw: string[]): SnapshotData {
  const data: SnapshotData = {
    verdict: "",
    strengths: [],
    risks: [],
    highlights: [],
  };
  let bucket: "strengths" | "risks" | "highlights" | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) continue;

    // Bullet under a list bucket
    const bullet = /^[-*]\s+(.*)$/.exec(l);
    if (bullet && bucket) {
      data[bucket].push(bullet[1].trim());
      continue;
    }

    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (!kv) continue;
    const key = kv[1].toLowerCase();
    const value = kv[2].trim();

    if (key === "strengths" || key === "risks" || key === "highlights") {
      bucket = key;
      if (value) {
        // allow inline comma-separated list
        for (const part of value.split(/\s*[;|]\s*/)) {
          if (part) data[bucket].push(part.trim());
        }
      }
      continue;
    }

    bucket = null;
    if (key === "verdict" || key === "recommendation" || key === "decision") {
      data.verdict = value;
    } else if (key === "posture" || key === "severity" || key === "status") {
      data.posture = value.toUpperCase();
    } else if (key === "confidence") {
      const n = parseFloat(value.replace(/[^\d.]/g, ""));
      if (Number.isFinite(n)) data.confidence = Math.max(0, Math.min(100, n));
    } else if (key === "thesis" || key === "headline" || key === "summary") {
      data.thesis = value;
    }
  }
  return data;
}

// Parse the body of a ':::dimensions ... :::' block. Each non-blank,
// non-sub-criterion line is "dimension_key | score | status | rationale".
// Sub-criterion lines start with "> " and attach to the most recent
// dimension as "> sub_key | score | rationale".
function parseDimensions(raw: string[]): DimensionRow[] {
  const rows: DimensionRow[] = [];
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith(">")) {
      if (rows.length === 0) continue;
      const cells = line.replace(/^>\s*/, "").split("|").map((c) => c.trim());
      const [key = "", scoreStr = "", rationale = ""] = cells;
      const score = parseFloat(scoreStr);
      if (!key || !Number.isFinite(score)) continue;
      rows[rows.length - 1].subCriteria.push({
        key,
        label: dimensionLabel(key),
        score: Math.max(0, Math.min(5, score)),
        rationale,
      });
      continue;
    }
    const cells = line.split("|").map((c) => c.trim());
    const [key = "", scoreStr = "", status = "", rationale = ""] = cells;
    const score = parseFloat(scoreStr);
    if (!key || !Number.isFinite(score)) continue;
    rows.push({
      key,
      label: dimensionLabel(key),
      score: Math.max(0, Math.min(5, score)),
      status: status || "—",
      rationale,
      subCriteria: [],
    });
  }
  return rows;
}

// Parse the body of a ':::coverage ... :::' block. Three buckets keyed
// "supported:", "partial:" (or "partially supported:"), "missing:" (or
// "missing / required:"); each followed by "- item" bullets.
function parseCoverage(raw: string[]): CoverageData {
  const data: CoverageData = { supported: [], partial: [], missing: [] };
  let bucket: keyof CoverageData | null = null;
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) continue;
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet && bucket) {
      data[bucket].push(bullet[1].trim());
      continue;
    }
    const head = /^([a-z][a-z\s/_-]*)\s*:\s*(.*)$/i.exec(line);
    if (!head) continue;
    const k = head[1].trim().toLowerCase();
    if (k.startsWith("support")) bucket = "supported";
    else if (k.startsWith("partial")) bucket = "partial";
    else if (k.startsWith("missing")) bucket = "missing";
    else bucket = null;
    const inline = head[2].trim();
    if (bucket && inline) {
      for (const part of inline.split(/\s*[,;]\s*/)) {
        if (part) data[bucket].push(part);
      }
    }
  }
  return data;
}

// ---- Rendering --------------------------------------------------

function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.kind) {
    case "h1":
      return (
        <h1
          key={index}
          className="mb-3 border-b border-slate-200 pb-3 text-2xl font-extrabold tracking-tight text-slate-900"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "h2": {
      const num = String(block.number).padStart(2, "0");
      // Strip a manual leading "01 · ", "01. ", or "1. " from the
      // heading text so the auto-numbered eyebrow doesn't double up
      // (e.g. "01 · 01 · DECISION SNAPSHOT").
      const cleanedText = block.text.replace(/^\s*\d{1,2}\s*[·.\)]\s*/, "");
      return (
        <div key={index} className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-indigo-600">
            {num} · {stripMarkdown(cleanedText).toUpperCase()}
          </p>
          <h2
            className="mt-1.5 text-xl font-bold tracking-tight text-slate-900"
            dangerouslySetInnerHTML={{ __html: renderInline(cleanedText) }}
          />
        </div>
      );
    }
    case "h3":
      return (
        <h3
          key={index}
          className="mt-4 flex items-center gap-2 text-base font-semibold text-slate-900"
        >
          <span
            aria-hidden
            className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500"
          />
          <span dangerouslySetInnerHTML={{ __html: renderInline(block.text) }} />
        </h3>
      );
    case "h4":
      return (
        <h4
          key={index}
          className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "p":
      return (
        <p
          key={index}
          className="text-sm leading-6 text-slate-700"
          dangerouslySetInnerHTML={{ __html: renderInline(block.text) }}
        />
      );
    case "hr":
      return <hr key={index} className="my-5 border-slate-200" />;
    case "quote":
      return (
        <blockquote
          key={index}
          className="rounded-lg border-l-4 border-indigo-400 bg-indigo-50/60 px-4 py-3 text-sm leading-6 text-slate-700"
        >
          {block.lines.map((l, j) => (
            <p
              key={j}
              className="mb-1 last:mb-0"
              dangerouslySetInnerHTML={{ __html: renderInline(l) }}
            />
          ))}
        </blockquote>
      );
    case "ul":
      return (
        <ul key={index} className="space-y-1.5 pl-0">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="relative flex gap-2 pl-5 text-sm leading-6 text-slate-700"
            >
              <span
                aria-hidden
                className="absolute left-1 top-2.5 h-1.5 w-1.5 rounded-full bg-indigo-500"
              />
              <span
                className="min-w-0 flex-1"
                dangerouslySetInnerHTML={{ __html: renderInline(it) }}
              />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={index} className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-indigo-600">
          {block.items.map((it, j) => (
            <li
              key={j}
              className="pl-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(it) }}
            />
          ))}
        </ol>
      );
    case "table":
      return <ReportTable key={index} block={block} />;
    case "score-group":
      return <ScoreGroup key={index} scores={block.scores} />;
    case "snapshot":
      return <SnapshotCard key={index} data={block.data} />;
    case "dimensions":
      return <DimensionGrid key={index} rows={block.rows} />;
    case "coverage":
      return <CoverageBoard key={index} data={block.data} />;
    case "callout":
      return <ReportCallout key={index} label={block.label} body={block.body} />;
  }
}

// ---- Dimension grid + sub-criteria ------------------------------
const STATUS_TONE: Record<string, string> = {
  Supported: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  "Partially Supported": "bg-amber-100 text-amber-800 ring-amber-200",
  "Missing / Required": "bg-rose-100 text-rose-800 ring-rose-200",
  Contradicted: "bg-violet-100 text-violet-800 ring-violet-200",
  "Management/Input Claim Only": "bg-slate-200 text-slate-700 ring-slate-300",
  "Preliminary / Intake-Based": "bg-sky-100 text-sky-800 ring-sky-200",
};

function statusTone(status: string): string {
  const norm = status.trim();
  return STATUS_TONE[norm] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

// A dimension grid is "all-empty" when every row has score 0 AND a
// missing/empty status. That usually means the LLM never wired the
// scores through (no [dimension scores] in the evidence context, no
// derived preliminary fallback). We surface a visible internal
// warning instead of rendering six sad zeros.
function isDimensionGridEmpty(rows: DimensionRow[]): boolean {
  if (rows.length === 0) return true;
  return rows.every((r) => {
    const status = r.status.trim().toLowerCase();
    const isMissing =
      status === "" ||
      status === "missing / required" ||
      status === "missing" ||
      status === "—";
    return r.score <= 0.05 && isMissing;
  });
}

function DimensionGrid({ rows }: { rows: DimensionRow[] }) {
  if (rows.length === 0) return null;
  if (typeof window !== "undefined") {
    // Helps debug binding issues when a brief renders six zeros.
    // eslint-disable-next-line no-console
    console.debug(
      "[ReportMarkdown] dimension grid rows",
      rows.map((r) => ({ key: r.key, score: r.score, status: r.status })),
    );
  }
  if (isDimensionGridEmpty(rows)) {
    return (
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">
          Visual cards not bound to report data
        </p>
        <p className="mt-1 leading-6">
          Executive Brief visual score cards are not mapped to the populated
          report data. Check <code>dimension_scores</code> and intake response
          binding — every dimension is scored 0.0 / Missing while the narrative
          may reference supporting artifacts. Re-generate after operator scoring
          or intake responses are entered, or check the prompt&apos;s preliminary
          derivation rules.
        </p>
      </section>
    );
  }
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <DimensionCard key={r.key} row={r} />
      ))}
    </section>
  );
}

function DimensionCard({ row }: { row: DimensionRow }) {
  const pct = Math.max(0, Math.min(1, row.score / 5));
  const fill = scoreTone(pct);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusTone(row.status)}`}
        >
          {row.status}
        </span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-extrabold tracking-tight text-slate-900">
          {row.score.toFixed(1)}
          <span className="ml-0.5 text-[10px] font-medium text-slate-400">/5</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {row.rationale ? (
        <p className="text-xs leading-5 text-slate-600">{row.rationale}</p>
      ) : null}
      {row.subCriteria.length > 0 ? (
        <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
          {row.subCriteria.map((s) => {
            const subPct = Math.max(0, Math.min(1, s.score / 5));
            const subFill = scoreTone(subPct);
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">
                  {s.label}
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  {s.score.toFixed(1)}
                </span>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${subFill}`}
                    style={{ width: `${subPct * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// ---- Evidence Coverage 3-column board ---------------------------
function CoverageBoard({ data }: { data: CoverageData }) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      <CoverageColumn
        label="Supported"
        items={data.supported}
        accent="emerald"
      />
      <CoverageColumn
        label="Partially Supported"
        items={data.partial}
        accent="amber"
      />
      <CoverageColumn
        label="Missing / Required"
        items={data.missing}
        accent="rose"
      />
    </section>
  );
}

function CoverageColumn({
  label,
  items,
  accent,
}: {
  label: string;
  items: string[];
  accent: "emerald" | "amber" | "rose";
}) {
  const head =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
        ? "text-amber-700"
        : "text-rose-700";
  const dot =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-rose-500";
  const bg =
    accent === "emerald"
      ? "bg-emerald-50/60"
      : accent === "amber"
        ? "bg-amber-50/60"
        : "bg-rose-50/60";
  return (
    <div className={`rounded-2xl border border-slate-200 ${bg} p-4`}>
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${head}`}
      >
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs italic text-slate-500">— None listed —</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-5 text-slate-800"
            >
              <span
                aria-hidden
                className={`mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
              />
              <span
                className="min-w-0 flex-1"
                dangerouslySetInnerHTML={{ __html: renderInline(it) }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---- Callout card -----------------------------------------------
function ReportCallout({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <aside className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">
        {label}
      </p>
      <p
        className="mt-1 text-sm leading-6 text-slate-700"
        dangerouslySetInnerHTML={{ __html: renderInline(body) }}
      />
    </aside>
  );
}

function ReportTable({
  block,
}: {
  block: Extract<Block, { kind: "table" }>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-white">
            {block.header.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider ${
                  block.align[i] === "right"
                    ? "text-right"
                    : block.align[i] === "center"
                      ? "text-center"
                      : "text-left"
                }`}
                dangerouslySetInnerHTML={{ __html: renderInline(h) }}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r, ri) => (
            <tr
              key={ri}
              className={`${
                ri % 2 === 1 ? "bg-slate-50/70" : "bg-white"
              } border-t border-slate-100`}
            >
              {r.map((c, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 align-top leading-5 text-slate-700 ${
                    block.align[ci] === "right"
                      ? "text-right"
                      : block.align[ci] === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                  dangerouslySetInnerHTML={{ __html: renderInline(c) }}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScoreGroup({
  scores,
}: {
  scores: Array<{ label: string; value: number; max: number }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {scores.map((s, i) => {
        const pct = Math.max(0, Math.min(1, s.value / s.max));
        const color = scoreTone(s.value / s.max);
        return (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-700">
                {s.label}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {s.value.toFixed(1)}
                <span className="ml-0.5 text-[10px] font-medium text-slate-400">
                  /{s.max}
                </span>
              </span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${pct * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Decision snapshot hero card --------------------------------
function SnapshotCard({ data }: { data: SnapshotData }) {
  const verdict = data.verdict || "Decision Snapshot";
  const postureTone = posturePalette(data.posture);
  const confidence = data.confidence ?? null;
  const confPct = confidence == null ? 0 : Math.max(0, Math.min(100, confidence));
  const confBar =
    confPct >= 70
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : confPct >= 50
        ? "bg-gradient-to-r from-indigo-500 to-violet-500"
        : confPct >= 30
          ? "bg-gradient-to-r from-amber-500 to-orange-500"
          : "bg-gradient-to-r from-rose-500 to-red-500";
  const hasStrengths = data.strengths.length > 0;
  const hasRisks = data.risks.length > 0;
  const hasHighlights = data.highlights.length > 0;
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-lg">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-indigo-300">
            Decision Snapshot
          </span>
          {data.posture && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${postureTone}`}
            >
              {data.posture}
            </span>
          )}
        </div>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {verdict}
        </h2>
        {data.thesis && (
          <p
            className="mt-2 max-w-4xl text-sm leading-6 text-slate-200 sm:text-base sm:leading-7"
            dangerouslySetInnerHTML={{ __html: renderInline(data.thesis) }}
          />
        )}
        {confidence != null && (
          <div className="mt-4 max-w-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Confidence
              </span>
              <span className="text-lg font-bold text-white">
                {confPct}
                <span className="ml-0.5 text-[10px] font-medium text-slate-400">
                  /100
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${confBar}`}
                style={{ width: `${confPct}%` }}
              />
            </div>
          </div>
        )}
        {(hasStrengths || hasRisks || hasHighlights) && (
          <div
            className={`mt-5 grid gap-3 ${
              hasStrengths && hasRisks ? "sm:grid-cols-2" : "sm:grid-cols-1"
            }`}
          >
            {hasStrengths && (
              <SnapshotList
                label="Key strengths"
                accent="emerald"
                items={data.strengths}
              />
            )}
            {hasRisks && (
              <SnapshotList label="Key risks" accent="rose" items={data.risks} />
            )}
            {!hasStrengths && !hasRisks && hasHighlights && (
              <SnapshotList
                label="Highlights"
                accent="indigo"
                items={data.highlights}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SnapshotList({
  label,
  accent,
  items,
}: {
  label: string;
  accent: "emerald" | "rose" | "indigo";
  items: string[];
}) {
  const dot =
    accent === "emerald"
      ? "bg-emerald-400"
      : accent === "rose"
        ? "bg-rose-400"
        : "bg-indigo-400";
  const head =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "rose"
        ? "text-rose-300"
        : "text-indigo-300";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${head}`}>
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm leading-6 text-slate-100">
            <span
              aria-hidden
              className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}
            />
            <span
              className="min-w-0 flex-1"
              dangerouslySetInnerHTML={{ __html: renderInline(it) }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function posturePalette(posture?: string): string {
  switch ((posture ?? "").toUpperCase()) {
    case "CRITICAL":
    case "HIGH":
      return "bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-400/40";
    case "MEDIUM":
      return "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-400/40";
    case "LOW":
      return "bg-sky-500/20 text-sky-200 ring-1 ring-inset ring-sky-400/40";
    case "OK":
    case "STRENGTH":
    case "GO":
      return "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40";
    default:
      return "bg-indigo-500/20 text-indigo-200 ring-1 ring-inset ring-indigo-400/40";
  }
}

function scoreTone(pct: number): string {
  if (pct >= 0.7) return "bg-gradient-to-r from-indigo-500 to-violet-500";
  if (pct >= 0.55) return "bg-gradient-to-r from-sky-500 to-indigo-500";
  if (pct >= 0.4) return "bg-gradient-to-r from-amber-400 to-orange-500";
  return "bg-gradient-to-r from-rose-500 to-red-500";
}

// ---- Inline formatting ------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripMarkdown(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1");
}

export function renderInline(text: string): string {
  let s = escapeHtml(text);

  // Severity / status pills: [CRITICAL], [HIGH], [MEDIUM], [LOW], [OK], [GAP]
  s = s.replace(
    /\[(CRITICAL|HIGH|MEDIUM|LOW|OK|GAP|STRENGTH|RISK)\]/gi,
    (_m, raw: string) => pill(raw.toUpperCase()),
  );

  // Inline code
  s = s.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">$1</code>',
  );
  // Bold
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
  // Italic
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  // Links
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-indigo-600 underline hover:text-indigo-800">$1</a>',
  );

  return s;
}

function pill(label: string): string {
  const tone = (() => {
    switch (label) {
      case "CRITICAL":
      case "HIGH":
      case "RISK":
        return "bg-rose-100 text-rose-700 ring-1 ring-inset ring-rose-200";
      case "MEDIUM":
        return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
      case "LOW":
        return "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200";
      case "OK":
      case "STRENGTH":
        return "bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200";
      case "GAP":
        return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200";
      default:
        return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
    }
  })();
  return `<span class="mx-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}">${label}</span>`;
}

// ---- Export HTML (for PDF/DOCX) ---------------------------------
//
// Uses the same block parser but emits print-friendly HTML styled
// to roughly mirror the on-screen presentation. Tables keep header
// banding; score bars render via CSS width; severity pills are
// plain colored spans.

export function markdownToExportHtml(md: string): string {
  const blocks = parseBlocks(md);
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case "h1":
        parts.push(`<h1>${renderInlineExport(b.text)}</h1>`);
        break;
      case "h2": {
        const num = String(b.number).padStart(2, "0");
        const cleanedText = b.text.replace(/^\s*\d{1,2}\s*[·.\)]\s*/, "");
        parts.push(
          `<div class="section"><p class="eyebrow">${num} · ${escapeHtml(
            stripMarkdown(cleanedText).toUpperCase(),
          )}</p><h2>${renderInlineExport(cleanedText)}</h2></div>`,
        );
        break;
      }
      case "h3":
        parts.push(`<h3>${renderInlineExport(b.text)}</h3>`);
        break;
      case "h4":
        parts.push(`<h4>${renderInlineExport(b.text)}</h4>`);
        break;
      case "p":
        parts.push(`<p>${renderInlineExport(b.text)}</p>`);
        break;
      case "hr":
        parts.push(`<hr />`);
        break;
      case "quote":
        parts.push(
          `<blockquote>${b.lines
            .map((l) => `<p>${renderInlineExport(l)}</p>`)
            .join("")}</blockquote>`,
        );
        break;
      case "ul":
        parts.push(
          `<ul>${b.items.map((it) => `<li>${renderInlineExport(it)}</li>`).join("")}</ul>`,
        );
        break;
      case "ol":
        parts.push(
          `<ol>${b.items.map((it) => `<li>${renderInlineExport(it)}</li>`).join("")}</ol>`,
        );
        break;
      case "table":
        parts.push(tableToHtml(b));
        break;
      case "score-group":
        parts.push(scoreGroupToHtml(b));
        break;
      case "snapshot":
        parts.push(snapshotToHtml(b.data));
        break;
      case "dimensions":
        parts.push(dimensionsToHtml(b.rows));
        break;
      case "coverage":
        parts.push(coverageToHtml(b.data));
        break;
      case "callout":
        parts.push(calloutToHtml(b.label, b.body));
        break;
    }
  }
  return parts.join("\n");
}

function dimensionsToHtml(rows: DimensionRow[]): string {
  if (rows.length === 0) return "";
  const statusColors: Record<string, [string, string]> = {
    Supported: ["#d1fae5", "#065f46"],
    "Partially Supported": ["#fef3c7", "#92400e"],
    "Missing / Required": ["#fecdd3", "#9f1239"],
    Contradicted: ["#ede9fe", "#5b21b6"],
    "Management/Input Claim Only": ["#e2e8f0", "#334155"],
    "Preliminary / Intake-Based": ["#e0f2fe", "#075985"],
  };
  const cards = rows
    .map((r) => {
      const pct = Math.max(0, Math.min(100, (r.score / 5) * 100));
      const fill = pct >= 70 ? "#6366f1" : pct >= 55 ? "#0ea5e9" : pct >= 40 ? "#f59e0b" : "#ef4444";
      const [bg, fg] = statusColors[r.status] ?? ["#e2e8f0", "#334155"];
      const sub = r.subCriteria.length
        ? `<div class="dim-sub">${r.subCriteria
            .map((s) => {
              const sp = Math.max(0, Math.min(100, (s.score / 5) * 100));
              const sfill =
                sp >= 70 ? "#6366f1" : sp >= 55 ? "#0ea5e9" : sp >= 40 ? "#f59e0b" : "#ef4444";
              return `<div class="dim-sub-row"><span class="dim-sub-label">${escapeHtml(
                s.label,
              )}</span><span class="dim-sub-val">${s.score.toFixed(
                1,
              )}</span><span class="dim-sub-track"><span class="dim-sub-fill" style="width:${sp}%;background:${sfill}"></span></span></div>`;
            })
            .join("")}</div>`
        : "";
      const rationale = r.rationale
        ? `<p class="dim-rat">${escapeHtml(r.rationale)}</p>`
        : "";
      return `<div class="dim-card"><div class="dim-head"><span class="dim-label">${escapeHtml(
        r.label,
      )}</span><span class="dim-pill" style="background:${bg};color:${fg}">${escapeHtml(
        r.status,
      )}</span></div><div class="dim-score">${r.score.toFixed(
        1,
      )}<span class="dim-max">/5</span></div><div class="dim-track"><div class="dim-fill" style="width:${pct}%;background:${fill}"></div></div>${rationale}${sub}</div>`;
    })
    .join("");
  return `<div class="dim-grid">${cards}</div>`;
}

function coverageToHtml(d: CoverageData): string {
  const col = (
    label: string,
    items: string[],
    bg: string,
    head: string,
    dot: string,
  ) => {
    const list = items.length
      ? `<ul class="cov-list">${items
          .map((it) => `<li><span class="cov-dot" style="background:${dot}"></span>${renderInlineExport(it)}</li>`)
          .join("")}</ul>`
      : `<p class="cov-empty">— None listed —</p>`;
    return `<div class="cov-col" style="background:${bg}"><p class="cov-head" style="color:${head}">${escapeHtml(
      label,
    )}</p>${list}</div>`;
  };
  const cols = [
    col("Supported", d.supported, "#ecfdf5", "#047857", "#10b981"),
    col("Partially Supported", d.partial, "#fffbeb", "#b45309", "#f59e0b"),
    col("Missing / Required", d.missing, "#fff1f2", "#be123c", "#f43f5e"),
  ].join("");
  return `<div class="cov-grid">${cols}</div>`;
}

function calloutToHtml(label: string, body: string): string {
  return `<aside class="callout"><p class="callout-label">${escapeHtml(
    label,
  )}</p><p class="callout-body">${renderInlineExport(body)}</p></aside>`;
}

function tableToHtml(b: Extract<Block, { kind: "table" }>): string {
  const head = b.header
    .map(
      (h, i) =>
        `<th style="text-align:${b.align[i]}">${renderInlineExport(h)}</th>`,
    )
    .join("");
  const body = b.rows
    .map(
      (r) =>
        `<tr>${r
          .map(
            (c, i) =>
              `<td style="text-align:${b.align[i]}">${renderInlineExport(c)}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  return `<table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function scoreGroupToHtml(
  b: Extract<Block, { kind: "score-group" }>,
): string {
  const rows = b.scores
    .map((s) => {
      const pct = Math.max(0, Math.min(100, (s.value / s.max) * 100));
      const fill = pct >= 70 ? "#6366f1" : pct >= 55 ? "#0ea5e9" : pct >= 40 ? "#f59e0b" : "#ef4444";
      return `<div class="score-card"><div class="score-top"><span class="score-label">${escapeHtml(
        s.label,
      )}</span><span class="score-value">${s.value.toFixed(1)}<span class="score-max">/${s.max}</span></span></div><div class="score-track"><div class="score-fill" style="width:${pct}%;background:${fill}"></div></div></div>`;
    })
    .join("");
  return `<div class="score-grid">${rows}</div>`;
}

function snapshotToHtml(d: SnapshotData): string {
  const verdict = escapeHtml(d.verdict || "Decision Snapshot");
  const postureBg: Record<string, [string, string]> = {
    CRITICAL: ["#fecdd3", "#9f1239"],
    HIGH: ["#fecdd3", "#9f1239"],
    MEDIUM: ["#fde68a", "#92400e"],
    LOW: ["#bae6fd", "#075985"],
    OK: ["#a7f3d0", "#065f46"],
    STRENGTH: ["#a7f3d0", "#065f46"],
    GO: ["#a7f3d0", "#065f46"],
  };
  const postureChip = d.posture
    ? (() => {
        const [bg, fg] = postureBg[d.posture.toUpperCase()] ?? [
          "#e0e7ff",
          "#3730a3",
        ];
        return `<span class="snap-pill" style="background:${bg};color:${fg}">${escapeHtml(
          d.posture,
        )}</span>`;
      })()
    : "";
  const conf = d.confidence != null ? Math.max(0, Math.min(100, d.confidence)) : null;
  const confColor =
    conf == null
      ? "#6366f1"
      : conf >= 70
        ? "#10b981"
        : conf >= 50
          ? "#6366f1"
          : conf >= 30
            ? "#f59e0b"
            : "#ef4444";
  const confBlock =
    conf != null
      ? `<div class="snap-conf"><div class="snap-conf-row"><span class="snap-conf-label">Confidence</span><span class="snap-conf-value">${conf}<span class="snap-conf-max">/100</span></span></div><div class="snap-conf-track"><div class="snap-conf-fill" style="width:${conf}%;background:${confColor}"></div></div></div>`
      : "";
  const thesis = d.thesis
    ? `<p class="snap-thesis">${renderInlineExport(d.thesis)}</p>`
    : "";
  const list = (label: string, items: string[], dot: string) =>
    items.length
      ? `<div class="snap-col"><p class="snap-col-head" style="color:${dot}">${label}</p><ul class="snap-col-list">${items
          .map((it) => `<li>${renderInlineExport(it)}</li>`)
          .join("")}</ul></div>`
      : "";
  const colsInner = [
    list("Key strengths", d.strengths, "#059669"),
    list("Key risks", d.risks, "#e11d48"),
    d.strengths.length === 0 && d.risks.length === 0
      ? list("Highlights", d.highlights, "#4f46e5")
      : "",
  ]
    .filter(Boolean)
    .join("");
  const cols = colsInner ? `<div class="snap-cols">${colsInner}</div>` : "";
  return `<section class="snap"><p class="snap-eyebrow">DECISION SNAPSHOT</p><div class="snap-head"><h2 class="snap-verdict">${verdict}</h2>${postureChip}</div>${thesis}${confBlock}${cols}</section>`;
}

function renderInlineExport(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(
    /\[(CRITICAL|HIGH|MEDIUM|LOW|OK|GAP|STRENGTH|RISK)\]/gi,
    (_m, raw: string) => pillExport(raw.toUpperCase()),
  );
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function pillExport(label: string): string {
  const toneMap: Record<string, [string, string]> = {
    CRITICAL: ["#fecdd3", "#9f1239"],
    HIGH: ["#fecdd3", "#9f1239"],
    RISK: ["#fecdd3", "#9f1239"],
    MEDIUM: ["#fde68a", "#92400e"],
    LOW: ["#bae6fd", "#075985"],
    OK: ["#a7f3d0", "#065f46"],
    STRENGTH: ["#a7f3d0", "#065f46"],
    GAP: ["#e2e8f0", "#334155"],
  };
  const [bg, fg] = toneMap[label] ?? ["#e2e8f0", "#334155"];
  return `<span class="pill" style="background:${bg};color:${fg}">${label}</span>`;
}

export function buildExportDocumentStyles(): string {
  return `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Calibri, Arial, sans-serif; color: #0f172a; margin: 0.6in; line-height: 1.55; }
    .cover { border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .cover h1 { font-size: 22pt; margin: 0 0 4px 0; letter-spacing: -0.01em; }
    .cover p { margin: 0; color: #475569; font-size: 10pt; }
    h1 { font-size: 18pt; margin: 18px 0 6px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .section { margin-top: 18px; }
    .section .eyebrow { font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em; color: #4f46e5; margin: 0 0 2px 0; }
    h2 { font-size: 15pt; margin: 2px 0 6px 0; letter-spacing: -0.005em; }
    h3 { font-size: 12pt; margin: 12px 0 4px 0; border-left: 3px solid #6366f1; padding-left: 8px; }
    h4 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin: 10px 0 3px 0; }
    p { font-size: 10.5pt; margin: 0 0 8px 0; }
    ul, ol { font-size: 10.5pt; margin: 0 0 10px 22px; padding: 0; }
    li { margin-bottom: 3px; }
    strong { font-weight: 700; color: #0f172a; }
    em { font-style: italic; }
    code { font-family: "SF Mono", Consolas, monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
    blockquote { border-left: 4px solid #6366f1; background: #eef2ff; margin: 10px 0; padding: 8px 12px; border-radius: 4px; }
    blockquote p { font-size: 10.5pt; margin: 0 0 4px 0; }
    .pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 2px; }
    .report-table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 10pt; }
    .report-table th { background: #0f172a; color: #fff; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 8px; font-weight: 600; }
    .report-table td { padding: 6px 8px; border-top: 1px solid #f1f5f9; vertical-align: top; }
    .report-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .score-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 8px 0 12px 0; }
    .score-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; background: #fff; }
    .score-top { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    .score-label { font-size: 10pt; color: #334155; font-weight: 500; }
    .score-value { font-size: 13pt; font-weight: 700; color: #0f172a; }
    .score-max { font-size: 8pt; color: #94a3b8; font-weight: 500; margin-left: 2px; }
    .score-track { height: 6px; background: #f1f5f9; border-radius: 999px; margin-top: 6px; overflow: hidden; }
    .score-fill { height: 100%; border-radius: 999px; }
    .snap { background: linear-gradient(135deg, #0f172a 0%, #312e81 55%, #1e1b4b 100%); color: #fff; border-radius: 14px; padding: 18px 22px; margin: 6px 0 18px 0; }
    .snap-eyebrow { font-size: 8.5pt; font-weight: 700; letter-spacing: 0.28em; color: #a5b4fc; margin: 0 0 4px 0; }
    .snap-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .snap-verdict { font-size: 18pt; margin: 0; color: #fff; letter-spacing: -0.01em; }
    .snap-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
    .snap-thesis { font-size: 11pt; color: #e2e8f0; margin: 8px 0 0 0; line-height: 1.55; }
    .snap-conf { margin-top: 12px; max-width: 320px; }
    .snap-conf-row { display: flex; justify-content: space-between; align-items: baseline; }
    .snap-conf-label { font-size: 8pt; font-weight: 700; letter-spacing: 0.18em; color: #c7d2fe; text-transform: uppercase; }
    .snap-conf-value { font-size: 13pt; font-weight: 700; color: #fff; }
    .snap-conf-max { font-size: 8pt; color: #94a3b8; margin-left: 2px; font-weight: 500; }
    .snap-conf-track { height: 5px; background: rgba(255,255,255,0.12); border-radius: 999px; margin-top: 4px; overflow: hidden; }
    .snap-conf-fill { height: 100%; border-radius: 999px; }
    .snap-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
    .snap-col { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 10px 12px; }
    .snap-col-head { font-size: 8pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 4px 0; }
    .snap-col-list { margin: 0; padding-left: 16px; color: #f1f5f9; }
    .snap-col-list li { font-size: 10pt; margin-bottom: 3px; line-height: 1.5; }
    .dim-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 8px 0 14px 0; }
    .dim-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; background: #fff; }
    .dim-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; }
    .dim-label { font-size: 10pt; font-weight: 600; color: #0f172a; }
    .dim-pill { display: inline-block; padding: 1px 6px; border-radius: 999px; font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
    .dim-score { font-size: 16pt; font-weight: 800; color: #0f172a; margin-top: 4px; }
    .dim-max { font-size: 8pt; color: #94a3b8; font-weight: 500; margin-left: 2px; }
    .dim-track { height: 6px; background: #f1f5f9; border-radius: 999px; margin-top: 6px; overflow: hidden; }
    .dim-fill { height: 100%; border-radius: 999px; }
    .dim-rat { font-size: 9pt; color: #475569; margin: 6px 0 0 0; line-height: 1.45; }
    .dim-sub { margin-top: 8px; border-top: 1px solid #f1f5f9; padding-top: 6px; }
    .dim-sub-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; font-size: 9pt; }
    .dim-sub-label { flex: 1; color: #475569; }
    .dim-sub-val { font-weight: 600; color: #334155; min-width: 22px; text-align: right; }
    .dim-sub-track { display: inline-block; width: 60px; height: 4px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
    .dim-sub-fill { display: block; height: 100%; border-radius: 999px; }
    .cov-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 8px 0 14px 0; }
    .cov-col { border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 12px; }
    .cov-head { font-size: 8pt; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px 0; }
    .cov-list { margin: 0; padding: 0; list-style: none; }
    .cov-list li { font-size: 10pt; color: #1f2937; margin-bottom: 4px; padding-left: 12px; position: relative; line-height: 1.45; }
    .cov-dot { position: absolute; left: 0; top: 7px; width: 6px; height: 6px; border-radius: 999px; }
    .cov-empty { font-size: 9pt; color: #94a3b8; font-style: italic; margin: 0; }
    .callout { background: linear-gradient(90deg, #eef2ff 0%, #fff 50%, #f5f3ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 10px 14px; margin: 6px 0 14px 0; }
    .callout-label { font-size: 8pt; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #4338ca; margin: 0 0 2px 0; }
    .callout-body { font-size: 10pt; color: #334155; margin: 0; line-height: 1.5; }
    @media print { body { margin: 0.55in; } .score-card, .snap, .dim-card, .cov-col, .callout { break-inside: avoid; } .dim-grid, .cov-grid { break-inside: avoid; } .report-table { break-inside: auto; } tr { break-inside: avoid; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;
}
