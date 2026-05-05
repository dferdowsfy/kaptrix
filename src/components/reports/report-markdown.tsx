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
  | { kind: "callout"; label: string; body: string }
  | { kind: "action-card"; data: ActionCardData }
  | { kind: "phase-plan"; phases: PhasePlanPhase[] }
  | { kind: "market-position"; areas: MarketPositionArea[] }
  | { kind: "capability-card"; data: CapabilityCardData }
  | { kind: "posture-grid"; data: PostureGridData }
  | { kind: "market-issue"; data: MarketIssueData }
  | { kind: "evidence-coverage"; categories: EvidenceCoverageCategory[] }
  | { kind: "confidence-dimension"; data: ConfidenceDimensionData }
  | { kind: "supported-claim"; data: SupportedClaimData }
  | { kind: "evidence-gap"; data: EvidenceGapData }
  | { kind: "weak-claim"; data: WeakClaimData }
  | { kind: "final-position"; data: FinalPositionData }
  | { kind: "market-read"; data: MarketReadData };

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

export interface ActionCardData {
  action: string;
  timeframe: string;
  priority: string;
  risk_addressed: string;
  what: string;
  why: string;
  owner: string;
  effort: string;
  payoff: string;
  dependencies: string;
  pass_criterion: string;
  proves: string;
  stress_tests: string;
  informs: string;
}

interface PhasePlanPhase {
  name: string;
  objective: string;
  actions: string[];
  owner: string;
  success_signal: string;
}

interface MarketPositionArea {
  area: string;
  rating: string;
  finding: string;
  evidence: string;
  open_question: string;
}

export interface CapabilityCardData {
  capability_area: string;
  maturity: string;
  what_real: string;
  what_unproven: string;
  evidence: string;
  risk: string;
  follow_up: string;
}

export interface PostureGridData {
  ahead: string[];
  parity: string[];
  lag: string[];
  unsupported: string[];
}

export interface MarketIssueData {
  issue: string;
  signal: string;
  why: string;
  evidence: string;
  decision_implication: string;
  follow_up: string;
}

interface EvidenceCoverageCategory {
  category: string;
  count: string;
  interpretation: string;
  decision_implication: string;
}

export interface ConfidenceDimensionData {
  dimension: string;
  status: string;
  confidence: string;
  supports: string;
  missing: string;
  decision_impact: string;
}

export interface SupportedClaimData {
  claim: string;
  status: string;
  artifact: string;
  supports: string;
  why: string;
  caveat: string;
}

export interface EvidenceGapData {
  missing: string;
  related_risk: string;
  why: string;
  required_artifact: string;
  impact: string;
  pass_criterion: string;
}

export interface WeakClaimData {
  claim: string;
  source: string;
  why_weak: string;
  validation: string;
  decision_implication: string;
}

export interface FinalPositionData {
  classification: string;
  conviction: string;
  primary_driver: string;
  failure_trigger: string;
  timing: string;
  operator_dependency: string;
}

export interface MarketReadData {
  promising: string;
  unvalidated: string;
  improve_confidence: string;
  weaken_case: string;
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

    // Phase plan fence: ":::phase-plan" ... ":::"
    if (/^\s*:::\s*phase-plan\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "phase-plan", phases: parsePhasePlan(buf) });
      continue;
    }

    // Action card fence: ":::action-card" ... ":::"
    if (/^\s*:::\s*action-card\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "action-card", data: parseActionCard(buf) });
      continue;
    }

    // Market position grid fence: ":::market-position" ... ":::"
    if (/^\s*:::\s*market-position\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "market-position", areas: parseMarketPosition(buf) });
      continue;
    }

    // Capability card fence: ":::capability-card" ... ":::"
    if (/^\s*:::\s*capability-card\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "capability-card", data: parseCapabilityCard(buf) });
      continue;
    }

    // Posture grid fence: ":::posture-grid" ... ":::"
    if (/^\s*:::\s*posture-grid\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "posture-grid", data: parsePostureGrid(buf) });
      continue;
    }

    // Market issue card fence: ":::market-issue" ... ":::"
    if (/^\s*:::\s*market-issue\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "market-issue", data: parseMarketIssue(buf) });
      continue;
    }

    // Evidence coverage grid fence: ":::evidence-coverage" ... ":::"
    if (/^\s*:::\s*evidence-coverage\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "evidence-coverage", categories: parseEvidenceCoverage(buf) });
      continue;
    }

    // Confidence-by-dimension card fence: ":::confidence-dimension" ... ":::"
    if (/^\s*:::\s*confidence-dimension\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "confidence-dimension", data: parseConfidenceDimension(buf) });
      continue;
    }

    // Supported-claim card fence: ":::supported-claim" ... ":::"
    if (/^\s*:::\s*supported-claim\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "supported-claim", data: parseSupportedClaim(buf) });
      continue;
    }

    // Evidence-gap card fence: ":::evidence-gap" ... ":::"
    if (/^\s*:::\s*evidence-gap\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "evidence-gap", data: parseEvidenceGap(buf) });
      continue;
    }

    // Weak-claim card fence: ":::weak-claim" ... ":::"
    if (/^\s*:::\s*weak-claim\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "weak-claim", data: parseWeakClaim(buf) });
      continue;
    }

    // Final Market Read fence: ":::market-read" ... ":::"
    if (/^\s*:::\s*market-read\s*$/i.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "market-read", data: parseMarketRead(buf) });
      continue;
    }

    // Final-position fence — tolerates both multi-line and single-line
    // collapsed forms (LLMs sometimes emit the entire block on one line).
    const finalPosOpen = /^\s*:::\s*final-position\b\s*(.*)$/i.exec(line);
    if (finalPosOpen) {
      const inline = finalPosOpen[1] ?? "";
      const buf: string[] = [];
      if (inline.trim() && !/^\s*:::\s*$/.test(inline)) {
        // Collapsed single-line form: ":::final-position k: v k: v :::"
        buf.push(inline.replace(/\s*:::\s*$/, ""));
        i++;
      } else {
        // Proper multi-line form
        i++;
        while (i < lines.length && !/^\s*:::\s*$/.test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++;
      }
      blocks.push({ kind: "final-position", data: parseFinalPosition(buf) });
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

function parseActionCard(raw: string[]): ActionCardData {
  const data: ActionCardData = {
    action: "", timeframe: "", priority: "", risk_addressed: "",
    what: "", why: "", owner: "", effort: "", payoff: "",
    dependencies: "", pass_criterion: "", proves: "", stress_tests: "", informs: "",
  };
  type ACKey = keyof ActionCardData;
  const multiLine: ACKey[] = [
    "risk_addressed", "what", "why", "payoff", "dependencies",
    "pass_criterion", "proves", "stress_tests", "informs",
  ];
  let cur: ACKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as ACKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parsePhasePlan(raw: string[]): PhasePlanPhase[] {
  const phases: PhasePlanPhase[] = [];
  let cur: PhasePlanPhase | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) continue;
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv && kv[1].toLowerCase() === "phase") {
      if (cur) phases.push(cur);
      cur = { name: kv[2].trim(), objective: "", actions: [], owner: "", success_signal: "" };
      continue;
    }
    if (!cur) continue;
    const bullet = /^[-*]\s+(.*)$/.exec(l);
    if (bullet) { cur.actions.push(bullet[1].trim()); continue; }
    if (kv) {
      const key = kv[1].toLowerCase();
      if (key === "objective") cur.objective = kv[2].trim();
      else if (key === "owner") cur.owner = kv[2].trim();
      else if (key === "success_signal") cur.success_signal = kv[2].trim();
    }
  }
  if (cur) phases.push(cur);
  return phases;
}

function parseMarketPosition(raw: string[]): MarketPositionArea[] {
  const areas: MarketPositionArea[] = [];
  let cur: MarketPositionArea | null = null;
  type MPKey = keyof MarketPositionArea;
  const multiLine: MPKey[] = ["finding", "evidence", "open_question"];
  let active: MPKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { active = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase();
      if (key === "area") {
        if (cur) areas.push(cur);
        cur = { area: kv[2].trim(), rating: "", finding: "", evidence: "", open_question: "" };
        active = null;
        continue;
      }
      if (cur && (key === "rating" || key === "finding" || key === "evidence" || key === "open_question")) {
        (cur as unknown as Record<string, string>)[key] = kv[2].trim();
        active = multiLine.includes(key as MPKey) ? (key as MPKey) : null;
        continue;
      }
    }
    if (cur && active && l) {
      (cur as unknown as Record<string, string>)[active] += " " + l;
    }
  }
  if (cur) areas.push(cur);
  return areas;
}

function parseCapabilityCard(raw: string[]): CapabilityCardData {
  const data: CapabilityCardData = {
    capability_area: "", maturity: "", what_real: "", what_unproven: "",
    evidence: "", risk: "", follow_up: "",
  };
  type CKey = keyof CapabilityCardData;
  const multiLine: CKey[] = ["what_real", "what_unproven", "evidence", "risk", "follow_up"];
  let cur: CKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as CKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parsePostureGrid(raw: string[]): PostureGridData {
  const data: PostureGridData = { ahead: [], parity: [], lag: [], unsupported: [] };
  let bucket: keyof PostureGridData | null = null;
  for (const rawLine of raw) {
    const line = rawLine.trim();
    if (!line) continue;
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet && bucket) {
      data[bucket].push(bullet[1].trim());
      continue;
    }
    const head = /^([a-z_]+)\s*:\s*(.*)$/i.exec(line);
    if (!head) continue;
    const k = head[1].toLowerCase();
    if (k === "ahead") bucket = "ahead";
    else if (k === "parity") bucket = "parity";
    else if (k === "lag" || k === "behind") bucket = "lag";
    else if (k === "unsupported" || k === "unverified") bucket = "unsupported";
    else bucket = null;
    const inline = head[2].trim();
    if (bucket && inline) data[bucket].push(inline);
  }
  return data;
}

function parseMarketIssue(raw: string[]): MarketIssueData {
  const data: MarketIssueData = {
    issue: "", signal: "", why: "", evidence: "",
    decision_implication: "", follow_up: "",
  };
  type MKey = keyof MarketIssueData;
  const multiLine: MKey[] = ["why", "evidence", "decision_implication", "follow_up"];
  let cur: MKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as MKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parseEvidenceCoverage(raw: string[]): EvidenceCoverageCategory[] {
  const cats: EvidenceCoverageCategory[] = [];
  let cur: EvidenceCoverageCategory | null = null;
  type ECKey = keyof EvidenceCoverageCategory;
  const multiLine: ECKey[] = ["interpretation", "decision_implication"];
  let active: ECKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { active = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase();
      if (key === "category") {
        if (cur) cats.push(cur);
        cur = { category: kv[2].trim(), count: "", interpretation: "", decision_implication: "" };
        active = null;
        continue;
      }
      if (cur && (key === "count" || key === "interpretation" || key === "decision_implication")) {
        (cur as unknown as Record<string, string>)[key] = kv[2].trim();
        active = multiLine.includes(key as ECKey) ? (key as ECKey) : null;
        continue;
      }
    }
    if (cur && active && l) {
      (cur as unknown as Record<string, string>)[active] += " " + l;
    }
  }
  if (cur) cats.push(cur);
  return cats;
}

function parseConfidenceDimension(raw: string[]): ConfidenceDimensionData {
  const data: ConfidenceDimensionData = {
    dimension: "", status: "", confidence: "", supports: "", missing: "", decision_impact: "",
  };
  type CDKey = keyof ConfidenceDimensionData;
  const multiLine: CDKey[] = ["supports", "missing", "decision_impact"];
  let cur: CDKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as CDKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parseSupportedClaim(raw: string[]): SupportedClaimData {
  const data: SupportedClaimData = {
    claim: "", status: "", artifact: "", supports: "", why: "", caveat: "",
  };
  type SKey = keyof SupportedClaimData;
  const multiLine: SKey[] = ["claim", "supports", "why", "caveat"];
  let cur: SKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as SKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parseEvidenceGap(raw: string[]): EvidenceGapData {
  const data: EvidenceGapData = {
    missing: "", related_risk: "", why: "", required_artifact: "", impact: "", pass_criterion: "",
  };
  type GKey = keyof EvidenceGapData;
  const multiLine: GKey[] = ["missing", "why", "required_artifact", "pass_criterion"];
  let cur: GKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as GKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parseWeakClaim(raw: string[]): WeakClaimData {
  const data: WeakClaimData = {
    claim: "", source: "", why_weak: "", validation: "", decision_implication: "",
  };
  type WKey = keyof WeakClaimData;
  const multiLine: WKey[] = ["claim", "why_weak", "validation", "decision_implication"];
  let cur: WKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as WKey;
      if (key in data) {
        cur = multiLine.includes(key) ? key : null;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

function parseMarketRead(raw: string[]): MarketReadData {
  const data: MarketReadData = {
    promising: "", unvalidated: "", improve_confidence: "", weaken_case: "",
  };
  type MRKey = keyof MarketReadData;
  let cur: MRKey | null = null;
  for (const line of raw) {
    const l = line.trim();
    if (!l) { cur = null; continue; }
    const kv = /^([a-zA-Z_]+)\s*:\s*(.*)$/.exec(l);
    if (kv) {
      const key = kv[1].toLowerCase() as MRKey;
      if (key in data) {
        cur = key;
        (data as unknown as Record<string, string>)[key] = kv[2].trim();
        continue;
      }
    }
    if (cur && l) {
      (data as unknown as Record<string, string>)[cur] += " " + l;
    }
  }
  return data;
}

// Parses the body of a ':::final-position' block. Tolerates both the
// proper multi-line form and the collapsed single-line form some LLMs
// emit ("k: v k: v ..."). Splits on the known field labels so values
// containing inline colons are preserved.
function parseFinalPosition(raw: string[]): FinalPositionData {
  const data: FinalPositionData = {
    classification: "", conviction: "", primary_driver: "",
    failure_trigger: "", timing: "", operator_dependency: "",
  };
  const FIELDS = [
    "classification", "conviction", "primary_driver",
    "failure_trigger", "timing", "operator_dependency",
  ];
  const text = raw.join(" ").replace(/\s+/g, " ").trim();
  if (!text) return data;
  const splitRe = new RegExp(`\\b(${FIELDS.join("|")})\\s*:\\s*`, "gi");
  const parts = text.split(splitRe);
  for (let j = 1; j < parts.length; j += 2) {
    const key = parts[j].toLowerCase();
    const value = (parts[j + 1] ?? "").trim();
    if (key in data) {
      (data as unknown as Record<string, string>)[key] = value;
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
    case "phase-plan":
      return <PhasePlanGrid key={index} phases={block.phases} />;
    case "action-card":
      return <ActionCard key={index} data={block.data} />;
    case "market-position":
      return <MarketPositionGrid key={index} areas={block.areas} />;
    case "capability-card":
      return <CapabilityCard key={index} data={block.data} />;
    case "posture-grid":
      return <PostureGrid key={index} data={block.data} />;
    case "market-issue":
      return <MarketIssueCard key={index} data={block.data} />;
    case "evidence-coverage":
      return <EvidenceCoverageGrid key={index} categories={block.categories} />;
    case "confidence-dimension":
      return <ConfidenceDimensionCard key={index} data={block.data} />;
    case "supported-claim":
      return <SupportedClaimCard key={index} data={block.data} />;
    case "evidence-gap":
      return <EvidenceGapCard key={index} data={block.data} />;
    case "weak-claim":
      return <WeakClaimCard key={index} data={block.data} />;
    case "final-position":
      return <FinalPositionFooter key={index} data={block.data} />;
    case "market-read":
      return <MarketReadCard key={index} data={block.data} />;
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
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700">
          Scoring unavailable or stale
        </p>
        <p className="mt-1 leading-6 text-slate-700">
          Scoring or evidence coverage is unavailable or stale. Recompute
          Scoring and Evidence Coverage before relying on this read.
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

// ---- Phase plan overview cards ----------------------------------

const PHASE_PALETTES = [
  { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200", accent: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200", accent: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-violet-50", border: "border-violet-200", badge: "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200", accent: "text-violet-700", dot: "bg-violet-400" },
];

function PhasePlanGrid({ phases }: { phases: PhasePlanPhase[] }) {
  if (phases.length === 0) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {phases.map((phase, i) => {
        const pal = PHASE_PALETTES[i % PHASE_PALETTES.length];
        return (
          <div key={i} className={`rounded-2xl border ${pal.border} ${pal.bg} p-5`}>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${pal.badge}`}>
              {phase.name}
            </span>
            {phase.objective && (
              <p className={`mt-2 text-sm font-semibold leading-5 ${pal.accent}`}>{phase.objective}</p>
            )}
            {phase.actions.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {phase.actions.map((action, j) => (
                  <li key={j} className="flex gap-2 text-sm leading-5 text-slate-700">
                    <span aria-hidden className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${pal.dot}`} />
                    <span dangerouslySetInnerHTML={{ __html: renderInline(action) }} />
                  </li>
                ))}
              </ul>
            )}
            {phase.owner && (
              <p className="mt-3 text-[11px] text-slate-500">
                <span className="font-semibold uppercase tracking-wider">Owner:</span>{" "}
                <span className="text-slate-700">{phase.owner}</span>
              </p>
            )}
            {phase.success_signal && (
              <p className="mt-2 rounded-lg border border-current/10 bg-white/60 px-3 py-2 text-[11px] leading-5 text-slate-600">
                <span className="font-semibold">Signal: </span>{phase.success_signal}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Action card ------------------------------------------------

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200",
  HIGH: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  MEDIUM: "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200",
  LOW: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
};

const TIMEFRAME_TONE: Record<string, string> = {
  "FIRST 30 DAYS": "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  "DAYS 31–60": "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  "DAYS 61–90": "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200",
};

function timeframeTone(tf: string): string {
  return TIMEFRAME_TONE[tf.toUpperCase()] ?? "bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-200";
}

function priorityTone(p: string): string {
  return PRIORITY_TONE[p.toUpperCase()] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function ActionCard({ data }: { data: ActionCardData }) {
  const hasImpact = data.proves || data.stress_tests || data.informs;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900">{data.action || "Action"}</h3>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {data.timeframe && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${timeframeTone(data.timeframe)}`}>
              {data.timeframe}
            </span>
          )}
          {data.priority && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${priorityTone(data.priority)}`}>
              {data.priority}
            </span>
          )}
        </div>
      </div>

      {data.risk_addressed && (
        <p className="mt-2 text-sm italic leading-6 text-slate-500"
          dangerouslySetInnerHTML={{ __html: renderInline(data.risk_addressed) }} />
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.what && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">What to do</p>
            <p className="mt-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.what) }} />
          </div>
        )}
        {data.why && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why it matters</p>
            <p className="mt-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.why) }} />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-slate-50 px-4 py-3">
        {data.owner && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Owner</p>
            <p className="text-sm font-medium text-slate-800">{data.owner}</p>
          </div>
        )}
        {data.effort && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Effort</p>
            <p className="text-sm font-medium text-slate-800">{data.effort}</p>
          </div>
        )}
        {data.payoff && (
          <div className="min-w-[200px] flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Expected payoff</p>
            <p className="text-sm text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.payoff) }} />
          </div>
        )}
      </div>

      {(data.dependencies || data.pass_criterion) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.dependencies && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dependencies</p>
              <p className="mt-1 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: renderInline(data.dependencies) }} />
            </div>
          )}
          {data.pass_criterion && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Pass criterion</p>
              <p className="mt-1 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: renderInline(data.pass_criterion) }} />
            </div>
          )}
        </div>
      )}

      {hasImpact && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">Investment impact</p>
          <ul className="mt-2 space-y-1.5">
            {data.proves && (
              <li className="flex gap-2 text-sm text-slate-700">
                <span className="shrink-0 font-semibold text-emerald-700">Proves:</span>
                <span dangerouslySetInnerHTML={{ __html: renderInline(data.proves) }} />
              </li>
            )}
            {data.stress_tests && (
              <li className="flex gap-2 text-sm text-slate-700">
                <span className="shrink-0 font-semibold text-amber-700">Stress-tests:</span>
                <span dangerouslySetInnerHTML={{ __html: renderInline(data.stress_tests) }} />
              </li>
            )}
            {data.informs && (
              <li className="flex gap-2 text-sm text-slate-700">
                <span className="shrink-0 font-semibold text-indigo-700">Informs:</span>
                <span dangerouslySetInnerHTML={{ __html: renderInline(data.informs) }} />
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---- Market position grid ---------------------------------------

const RATING_TONE: Record<string, string> = {
  STRONG: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  MODERATE: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  WEAK: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200",
  UNKNOWN: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
  UNVERIFIED: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
};

function ratingTone(r: string): string {
  return RATING_TONE[r.trim().toUpperCase()] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function MarketPositionGrid({ areas }: { areas: MarketPositionArea[] }) {
  if (areas.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {areas.map((area, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">{area.area}</h3>
            {area.rating && (
              <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${ratingTone(area.rating)}`}>
                {area.rating}
              </span>
            )}
          </div>
          {area.finding && (
            <p className="mt-2 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(area.finding) }} />
          )}
          {area.evidence && (
            <p className="mt-2 text-[12px] leading-5 text-slate-600">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Evidence: </span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(area.evidence) }} />
            </p>
          )}
          {area.open_question && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[12px] leading-5 text-slate-600">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Open question: </span>
              <span dangerouslySetInnerHTML={{ __html: renderInline(area.open_question) }} />
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Capability card --------------------------------------------

const MATURITY_TONE: Record<string, string> = {
  EMERGING: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200",
  DEVELOPING: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  MATURE: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  UNVERIFIED: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200",
};

function maturityTone(m: string): string {
  return MATURITY_TONE[m.trim().toUpperCase()] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function CapabilityCard({ data }: { data: CapabilityCardData }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{data.capability_area || "Capability"}</h3>
        {data.maturity && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${maturityTone(data.maturity)}`}>
            {data.maturity}
          </span>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {data.what_real && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">What appears real</p>
            <p className="mt-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.what_real) }} />
          </div>
        )}
        {data.what_unproven && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">What remains unproven</p>
            <p className="mt-1 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.what_unproven) }} />
          </div>
        )}
      </div>

      {data.evidence && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Evidence supporting the view</p>
          <p className="mt-1 text-sm leading-6 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.evidence) }} />
        </div>
      )}

      {(data.risk || data.follow_up) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.risk && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">Risk if unvalidated</p>
              <p className="mt-1 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: renderInline(data.risk) }} />
            </div>
          )}
          {data.follow_up && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Diligence follow-up</p>
              <p className="mt-1 text-sm text-slate-600"
                dangerouslySetInnerHTML={{ __html: renderInline(data.follow_up) }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Posture grid -----------------------------------------------

function PostureGrid({ data }: { data: PostureGridData }) {
  const cols: Array<{ label: string; items: string[]; bg: string; border: string; head: string; dot: string }> = [
    { label: "Ahead", items: data.ahead, bg: "bg-emerald-50", border: "border-emerald-200", head: "text-emerald-700", dot: "bg-emerald-400" },
    { label: "Parity", items: data.parity, bg: "bg-sky-50", border: "border-sky-200", head: "text-sky-700", dot: "bg-sky-400" },
    { label: "May Lag", items: data.lag, bg: "bg-amber-50", border: "border-amber-200", head: "text-amber-700", dot: "bg-amber-400" },
    { label: "Unsupported", items: data.unsupported, bg: "bg-slate-50", border: "border-slate-200", head: "text-slate-600", dot: "bg-slate-400" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cols.map((c, i) => (
        <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
          <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${c.head}`}>{c.label}</p>
          {c.items.length === 0 ? (
            <p className="mt-2 text-[12px] italic text-slate-500">None identified.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {c.items.map((it, j) => (
                <li key={j} className="flex gap-2 text-[13px] leading-5 text-slate-700">
                  <span aria-hidden className={`mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} />
                  <span dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Market issue card ------------------------------------------

const SIGNAL_TONE: Record<string, string> = {
  STRENGTH: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200",
  RISK: "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200",
  GAP: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200",
  "WATCH ITEM": "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200",
  WATCH: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200",
};

function signalTone(s: string): string {
  return SIGNAL_TONE[s.trim().toUpperCase()] ?? "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function MarketIssueCard({ data }: { data: MarketIssueData }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-bold text-slate-900">{data.issue || "Market issue"}</h3>
        {data.signal && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${signalTone(data.signal)}`}>
            {data.signal}
          </span>
        )}
      </div>

      {data.why && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why it matters</p>
          <p className="mt-1 text-sm leading-6 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.why) }} />
        </div>
      )}

      {data.evidence && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Evidence basis</p>
          <p className="mt-1 text-sm leading-6 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.evidence) }} />
        </div>
      )}

      {(data.decision_implication || data.follow_up) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.decision_implication && (
            <div className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Decision implication</p>
              <p className="mt-1 text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderInline(data.decision_implication) }} />
            </div>
          )}
          {data.follow_up && (
            <div className="rounded-xl bg-indigo-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">Follow-up question</p>
              <p className="mt-1 text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderInline(data.follow_up) }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Evidence coverage grid -------------------------------------

function evidenceCoveragePalette(category: string): {
  border: string; bg: string; head: string; count: string;
} {
  const c = category.trim().toLowerCase();
  if (c.startsWith("support"))
    return { border: "border-emerald-200", bg: "bg-emerald-50", head: "text-emerald-700", count: "text-emerald-800" };
  if (c.startsWith("partial"))
    return { border: "border-amber-200", bg: "bg-amber-50", head: "text-amber-700", count: "text-amber-800" };
  if (c.startsWith("missing") || c.startsWith("required"))
    return { border: "border-rose-200", bg: "bg-rose-50", head: "text-rose-700", count: "text-rose-800" };
  if (c.startsWith("contradict") || c.startsWith("weak"))
    return { border: "border-violet-200", bg: "bg-violet-50", head: "text-violet-700", count: "text-violet-800" };
  return { border: "border-slate-200", bg: "bg-slate-50", head: "text-slate-700", count: "text-slate-800" };
}

function EvidenceCoverageGrid({ categories }: { categories: EvidenceCoverageCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((c, i) => {
        const pal = evidenceCoveragePalette(c.category);
        return (
          <div key={i} className={`rounded-2xl border ${pal.border} ${pal.bg} p-4`}>
            <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${pal.head}`}>{c.category}</p>
            {c.count && (
              <p className={`mt-1 text-3xl font-extrabold ${pal.count}`}>{c.count}</p>
            )}
            {c.interpretation && (
              <p className="mt-2 text-[12px] leading-5 text-slate-700"
                dangerouslySetInnerHTML={{ __html: renderInline(c.interpretation) }} />
            )}
            {c.decision_implication && (
              <p className="mt-2 rounded-lg bg-white/60 px-2.5 py-1.5 text-[11px] leading-5 text-slate-600">
                <span className="font-semibold">Implication: </span>
                <span dangerouslySetInnerHTML={{ __html: renderInline(c.decision_implication) }} />
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Confidence dimension card ----------------------------------

function evidenceStatusTone(status: string): string {
  const s = status.trim().toLowerCase();
  if (s.startsWith("support")) return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200";
  if (s.startsWith("partial")) return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  if (s.startsWith("missing") || s.startsWith("required")) return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (s.startsWith("contradict")) return "bg-violet-100 text-violet-800 ring-1 ring-inset ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function ConfidenceDimensionCard({ data }: { data: ConfidenceDimensionData }) {
  const conf = parseFloat(data.confidence.replace(/[^\d.]/g, ""));
  const confPct = Number.isFinite(conf) ? Math.max(0, Math.min(100, conf)) : null;
  const bar = confPct == null
    ? "bg-slate-300"
    : confPct >= 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : confPct >= 50 ? "bg-gradient-to-r from-indigo-500 to-violet-500"
    : confPct >= 30 ? "bg-gradient-to-r from-amber-500 to-orange-500"
    : "bg-gradient-to-r from-rose-500 to-red-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">{data.dimension || "Dimension"}</h3>
        {data.status && (
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${evidenceStatusTone(data.status)}`}>
            {data.status}
          </span>
        )}
      </div>
      {confPct != null && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Confidence</span>
            <span className="text-sm font-bold text-slate-900">{confPct}<span className="ml-0.5 text-[10px] text-slate-400">/100</span></span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${confPct}%` }} />
          </div>
        </div>
      )}
      {data.supports && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">What evidence supports</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.supports) }} />
        </div>
      )}
      {data.missing && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">What remains missing</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.missing) }} />
        </div>
      )}
      {data.decision_impact && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Decision impact</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.decision_impact) }} />
        </div>
      )}
    </div>
  );
}

// ---- Supported / weak claim cards -------------------------------

function SupportedClaimCard({ data }: { data: SupportedClaimData }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900"
          dangerouslySetInnerHTML={{ __html: renderInline(data.claim || "Claim") }} />
        {data.status && (
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${evidenceStatusTone(data.status)}`}>
            {data.status}
          </span>
        )}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.artifact && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Artifact source</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.artifact) }} />
          </div>
        )}
        {data.supports && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">What the artifact supports</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.supports) }} />
          </div>
        )}
        {data.why && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why it matters</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.why) }} />
          </div>
        )}
        {data.caveat && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Remaining caveat</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.caveat) }} />
          </div>
        )}
      </div>
    </div>
  );
}

function WeakClaimCard({ data }: { data: WeakClaimData }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900"
          dangerouslySetInnerHTML={{ __html: renderInline(data.claim || "Claim") }} />
        <span className="shrink-0 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-inset ring-amber-200">
          Weakly supported
        </span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.source && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Current source</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.source) }} />
          </div>
        )}
        {data.why_weak && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-600">Why support is weak</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.why_weak) }} />
          </div>
        )}
        {data.validation && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">What would validate it</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.validation) }} />
          </div>
        )}
        {data.decision_implication && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Decision implication</p>
            <p className="mt-1 text-[12px] text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(data.decision_implication) }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Evidence gap card ------------------------------------------

function impactTone(impact: string): string {
  const s = impact.trim().toUpperCase();
  if (s === "HIGH" || s === "CRITICAL") return "bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200";
  if (s === "MEDIUM") return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200";
  if (s === "LOW") return "bg-sky-100 text-sky-700 ring-1 ring-inset ring-sky-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200";
}

function EvidenceGapCard({ data }: { data: EvidenceGapData }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900"
          dangerouslySetInnerHTML={{ __html: renderInline(data.missing || "Missing evidence") }} />
        {data.impact && (
          <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${impactTone(data.impact)}`}>
            Impact: {data.impact}
          </span>
        )}
      </div>
      {data.related_risk && (
        <p className="mt-2 text-[12px] italic text-slate-600">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">Related risk: </span>
          <span dangerouslySetInnerHTML={{ __html: renderInline(data.related_risk) }} />
        </p>
      )}
      {data.why && (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Why it matters</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.why) }} />
        </div>
      )}
      {data.required_artifact && (
        <div className="mt-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700">Required artifact</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.required_artifact) }} />
        </div>
      )}
      {data.pass_criterion && (
        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Pass criterion</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderInline(data.pass_criterion) }} />
        </div>
      )}
    </div>
  );
}

// ---- Final Market Read card -------------------------------------

function MarketReadCard({ data }: { data: MarketReadData }) {
  const cells: Array<{ label: string; value: string; bg: string; border: string; head: string }> = [
    { label: "What appears commercially promising", value: data.promising, bg: "bg-emerald-50", border: "border-emerald-200", head: "text-emerald-700" },
    { label: "What remains unvalidated", value: data.unvalidated, bg: "bg-amber-50", border: "border-amber-200", head: "text-amber-700" },
    { label: "What would improve confidence", value: data.improve_confidence, bg: "bg-indigo-50", border: "border-indigo-200", head: "text-indigo-700" },
    { label: "What would weaken the investment case", value: data.weaken_case, bg: "bg-rose-50", border: "border-rose-200", head: "text-rose-700" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cells.map((c, i) => (
        <div key={i} className={`rounded-2xl border ${c.border} ${c.bg} p-4`}>
          <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${c.head}`}>{c.label}</p>
          {c.value ? (
            <p className="mt-2 text-sm leading-6 text-slate-700"
              dangerouslySetInnerHTML={{ __html: renderInline(c.value) }} />
          ) : (
            <p className="mt-2 text-sm italic text-slate-500">Not specified.</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ---- Final position footer --------------------------------------

const CLASSIFICATION_TONE: Record<string, string> = {
  REAL: "bg-emerald-500/20 text-emerald-200 ring-1 ring-inset ring-emerald-400/40",
  PARTIAL: "bg-amber-500/20 text-amber-200 ring-1 ring-inset ring-amber-400/40",
  ILLUSION: "bg-rose-500/20 text-rose-200 ring-1 ring-inset ring-rose-400/40",
};

function classificationTone(c: string): string {
  return CLASSIFICATION_TONE[c.trim().toUpperCase()] ?? "bg-slate-500/20 text-slate-200 ring-1 ring-inset ring-slate-400/40";
}

function FinalPositionFooter({ data }: { data: FinalPositionData }) {
  const conv = parseFloat(data.conviction.replace(/[^\d.]/g, ""));
  const pct = Number.isFinite(conv) ? Math.max(0, Math.min(100, conv)) : null;
  const bar = pct == null
    ? "bg-slate-500"
    : pct >= 70 ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
    : pct >= 50 ? "bg-gradient-to-r from-indigo-500 to-violet-500"
    : pct >= 30 ? "bg-gradient-to-r from-amber-500 to-orange-500"
    : "bg-gradient-to-r from-rose-500 to-red-500";
  const hasMeta = data.timing || data.operator_dependency;
  return (
    <section className="relative mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-300">
          Final Position
        </span>
        {data.classification && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${classificationTone(data.classification)}`}>
            {data.classification}
          </span>
        )}
        {hasMeta && (
          <span className="ml-auto flex flex-wrap gap-1.5">
            {data.timing && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-200 ring-1 ring-inset ring-white/15">
                {data.timing}
              </span>
            )}
            {data.operator_dependency && (
              <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-200 ring-1 ring-inset ring-white/15">
                {data.operator_dependency}
              </span>
            )}
          </span>
        )}
      </div>
      {pct != null && (
        <div className="mt-3 max-w-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Conviction</span>
            <span className="text-base font-bold text-white">{pct}<span className="ml-0.5 text-[10px] text-slate-400">/100</span></span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
      {(data.primary_driver || data.failure_trigger) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.primary_driver && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Primary driver</p>
              <p className="mt-1.5 text-sm leading-5 text-slate-100"
                dangerouslySetInnerHTML={{ __html: renderInline(data.primary_driver) }} />
            </div>
          )}
          {data.failure_trigger && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">Failure trigger</p>
              <p className="mt-1.5 text-sm leading-5 text-slate-100"
                dangerouslySetInnerHTML={{ __html: renderInline(data.failure_trigger) }} />
            </div>
          )}
        </div>
      )}
    </section>
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
      case "phase-plan":
        parts.push(phasePlanToHtml(b.phases));
        break;
      case "action-card":
        parts.push(actionCardToHtml(b.data));
        break;
      case "market-position":
        parts.push(marketPositionToHtml(b.areas));
        break;
      case "capability-card":
        parts.push(capabilityCardToHtml(b.data));
        break;
      case "posture-grid":
        parts.push(postureGridToHtml(b.data));
        break;
      case "market-issue":
        parts.push(marketIssueToHtml(b.data));
        break;
      case "evidence-coverage":
        parts.push(evidenceCoverageToHtml(b.categories));
        break;
      case "confidence-dimension":
        parts.push(confidenceDimensionToHtml(b.data));
        break;
      case "supported-claim":
        parts.push(supportedClaimToHtml(b.data));
        break;
      case "evidence-gap":
        parts.push(evidenceGapToHtml(b.data));
        break;
      case "weak-claim":
        parts.push(weakClaimToHtml(b.data));
        break;
      case "final-position":
        parts.push(finalPositionToHtml(b.data));
        break;
      case "market-read":
        parts.push(marketReadToHtml(b.data));
        break;
    }
  }
  return parts.join("\n");
}

function marketReadToHtml(d: MarketReadData): string {
  const cells = [
    { label: "What appears commercially promising", value: d.promising, bg: "#f0fdf4", bdr: "#bbf7d0", head: "#15803d" },
    { label: "What remains unvalidated", value: d.unvalidated, bg: "#fffbeb", bdr: "#fde68a", head: "#b45309" },
    { label: "What would improve confidence", value: d.improve_confidence, bg: "#eef2ff", bdr: "#c7d2fe", head: "#3730a3" },
    { label: "What would weaken the investment case", value: d.weaken_case, bg: "#fff1f2", bdr: "#fecdd3", head: "#be123c" },
  ];
  const html = cells
    .map((c) => `<div style="flex:1;min-width:240px;border:1px solid ${c.bdr};background:${c.bg};border-radius:10px;padding:12px;">
<p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${c.head};">${escapeHtml(c.label)}</p>
${c.value ? `<p style="margin:6px 0 0;font-size:9pt;color:#334155;line-height:1.5;">${renderInlineExport(c.value)}</p>` : `<p style="margin:6px 0 0;font-size:9pt;color:#94a3b8;font-style:italic;">Not specified.</p>`}
</div>`)
    .join("\n");
  return `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;">${html}</div>`;
}

function finalPositionToHtml(d: FinalPositionData): string {
  const classColors: Record<string, [string, string]> = {
    REAL: ["#d1fae5", "#065f46"],
    PARTIAL: ["#fef3c7", "#92400e"],
    ILLUSION: ["#fee2e2", "#991b1b"],
  };
  const [cBg, cFg] = classColors[d.classification.trim().toUpperCase()] ?? ["#e2e8f0", "#334155"];
  const conv = parseFloat(d.conviction.replace(/[^\d.]/g, ""));
  const pct = Number.isFinite(conv) ? Math.max(0, Math.min(100, conv)) : null;
  const tag = (label: string) =>
    label ? `<span style="display:inline-block;background:#1e293b;color:#cbd5e1;border:1px solid #334155;border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;margin-left:4px;">${escapeHtml(label)}</span>` : "";
  const block = (label: string, value: string, color: string) =>
    value ? `<div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px;flex:1;min-width:200px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:4px 0 0;font-size:9pt;color:#e2e8f0;">${renderInlineExport(value)}</p></div>` : "";
  return `<section style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);color:#fff;border-radius:14px;padding:16px;margin-top:12px;">
<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
<span style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.2em;color:#cbd5e1;">Final Position</span>
${d.classification ? `<span style="background:${cBg};color:${cFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.classification)}</span>` : ""}
<span style="margin-left:auto;">${tag(d.timing)}${tag(d.operator_dependency)}</span>
</div>
${pct != null ? `<div style="margin-top:10px;max-width:300px;"><div style="display:flex;justify-content:space-between;align-items:baseline;"><span style="font-size:7pt;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#cbd5e1;">Conviction</span><span style="font-size:11pt;font-weight:700;color:#fff;">${pct}<span style="font-size:7pt;color:#94a3b8;">/100</span></span></div><div style="margin-top:4px;height:5px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:#6366f1;"></div></div></div>` : ""}
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
${block("Primary driver", d.primary_driver, "#6ee7b7")}
${block("Failure trigger", d.failure_trigger, "#fda4af")}
</div>
</section>`;
}

function evidenceCoverageToHtml(cats: EvidenceCoverageCategory[]): string {
  const colorFor = (cat: string): { bg: string; bdr: string; head: string } => {
    const c = cat.trim().toLowerCase();
    if (c.startsWith("support")) return { bg: "#f0fdf4", bdr: "#bbf7d0", head: "#15803d" };
    if (c.startsWith("partial")) return { bg: "#fffbeb", bdr: "#fde68a", head: "#b45309" };
    if (c.startsWith("missing") || c.startsWith("required")) return { bg: "#fff1f2", bdr: "#fecdd3", head: "#be123c" };
    if (c.startsWith("contradict") || c.startsWith("weak")) return { bg: "#f5f3ff", bdr: "#ddd6fe", head: "#6d28d9" };
    return { bg: "#f8fafc", bdr: "#e2e8f0", head: "#475569" };
  };
  const cards = cats
    .map((c) => {
      const col = colorFor(c.category);
      return `<div style="flex:1;min-width:200px;border:1px solid ${col.bdr};background:${col.bg};border-radius:10px;padding:10px;">
<p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${col.head};">${escapeHtml(c.category)}</p>
${c.count ? `<p style="margin:4px 0 0;font-size:18pt;font-weight:800;color:${col.head};">${escapeHtml(c.count)}</p>` : ""}
${c.interpretation ? `<p style="margin:6px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(c.interpretation)}</p>` : ""}
${c.decision_implication ? `<p style="margin:6px 0 0;font-size:8pt;color:#475569;background:rgba(255,255,255,0.6);padding:4px 8px;border-radius:6px;"><strong>Implication: </strong>${renderInlineExport(c.decision_implication)}</p>` : ""}
</div>`;
    })
    .join("\n");
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">${cards}</div>`;
}

function confidenceDimensionToHtml(d: ConfidenceDimensionData): string {
  const statusColors: Record<string, [string, string]> = {
    SUPPORTED: ["#d1fae5", "#065f46"],
    "PARTIALLY SUPPORTED": ["#fef3c7", "#92400e"],
    PARTIAL: ["#fef3c7", "#92400e"],
    MISSING: ["#fee2e2", "#991b1b"],
    "MISSING / REQUIRED": ["#fee2e2", "#991b1b"],
    CONTRADICTED: ["#ede9fe", "#5b21b6"],
  };
  const [sBg, sFg] = statusColors[d.status.trim().toUpperCase()] ?? ["#e2e8f0", "#334155"];
  const conf = parseFloat(d.confidence.replace(/[^\d.]/g, ""));
  const pct = Number.isFinite(conf) ? Math.max(0, Math.min(100, conf)) : null;
  const labelled = (label: string, value: string, color = "#64748b") =>
    value ? `<div style="margin-top:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:12px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:10pt;color:#0f172a;">${escapeHtml(d.dimension)}</strong>
${d.status ? `<span style="background:${sBg};color:${sFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.status)}</span>` : ""}
</div>
${pct != null ? `<div style="margin-top:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">Confidence: ${pct}/100</p><div style="margin-top:3px;height:5px;background:#f1f5f9;border-radius:99px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:#6366f1;"></div></div></div>` : ""}
${labelled("What evidence supports", d.supports, "#15803d")}
${labelled("What remains missing", d.missing, "#be123c")}
${d.decision_impact ? `<div style="margin-top:8px;background:#f8fafc;border-radius:8px;padding:8px;">${labelled("Decision impact", d.decision_impact).replace("margin-top:8px;", "")}</div>` : ""}
</div>`;
}

function supportedClaimToHtml(d: SupportedClaimData): string {
  const cell = (label: string, value: string, color = "#64748b") =>
    value ? `<div><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #bbf7d0;background:#fff;border-radius:10px;padding:12px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:10pt;color:#0f172a;">${renderInlineExport(d.claim)}</strong>
${d.status ? `<span style="background:#d1fae5;color:#065f46;border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.status)}</span>` : ""}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
${cell("Artifact source", d.artifact)}
${cell("What the artifact supports", d.supports, "#15803d")}
${cell("Why it matters", d.why)}
${cell("Remaining caveat", d.caveat, "#b45309")}
</div>
</div>`;
}

function evidenceGapToHtml(d: EvidenceGapData): string {
  const impactColors: Record<string, [string, string]> = {
    HIGH: ["#fee2e2", "#991b1b"],
    CRITICAL: ["#fee2e2", "#991b1b"],
    MEDIUM: ["#fef3c7", "#92400e"],
    LOW: ["#e0f2fe", "#075985"],
  };
  const [iBg, iFg] = impactColors[d.impact.trim().toUpperCase()] ?? ["#e2e8f0", "#334155"];
  const block = (label: string, value: string, color = "#64748b") =>
    value ? `<div style="margin-top:6px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #fecdd3;background:#fff;border-radius:10px;padding:12px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:10pt;color:#0f172a;">${renderInlineExport(d.missing)}</strong>
${d.impact ? `<span style="background:${iBg};color:${iFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Impact: ${escapeHtml(d.impact)}</span>` : ""}
</div>
${d.related_risk ? `<p style="margin:6px 0 0;font-size:8pt;color:#64748b;font-style:italic;"><strong>Related risk: </strong>${renderInlineExport(d.related_risk)}</p>` : ""}
${block("Why it matters", d.why)}
${block("Required artifact", d.required_artifact, "#3730a3")}
${d.pass_criterion ? `<div style="margin-top:6px;background:#f8fafc;border-radius:8px;padding:8px;">${block("Pass criterion", d.pass_criterion).replace("margin-top:6px;", "")}</div>` : ""}
</div>`;
}

function weakClaimToHtml(d: WeakClaimData): string {
  const cell = (label: string, value: string, color = "#64748b") =>
    value ? `<div><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:12px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:10pt;color:#0f172a;">${renderInlineExport(d.claim)}</strong>
<span style="background:#fef3c7;color:#92400e;border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Weakly supported</span>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
${cell("Current source", d.source)}
${cell("Why support is weak", d.why_weak, "#be123c")}
${cell("What would validate it", d.validation, "#3730a3")}
${cell("Decision implication", d.decision_implication)}
</div>
</div>`;
}

function marketPositionToHtml(areas: MarketPositionArea[]): string {
  const ratingColors: Record<string, [string, string]> = {
    STRONG: ["#d1fae5", "#065f46"],
    MODERATE: ["#fef3c7", "#92400e"],
    WEAK: ["#fee2e2", "#991b1b"],
    UNKNOWN: ["#e2e8f0", "#334155"],
    UNVERIFIED: ["#e2e8f0", "#334155"],
  };
  const cards = areas
    .map((a) => {
      const [rBg, rFg] = ratingColors[a.rating.toUpperCase()] ?? ["#e2e8f0", "#334155"];
      return `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:12px;flex:1;min-width:260px;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:10pt;color:#0f172a;">${escapeHtml(a.area)}</strong>
${a.rating ? `<span style="background:${rBg};color:${rFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(a.rating)}</span>` : ""}
</div>
${a.finding ? `<p style="margin:6px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(a.finding)}</p>` : ""}
${a.evidence ? `<p style="margin:6px 0 0;font-size:8pt;color:#475569;"><strong>Evidence: </strong>${renderInlineExport(a.evidence)}</p>` : ""}
${a.open_question ? `<p style="margin:6px 0 0;font-size:8pt;color:#475569;background:#f8fafc;padding:6px 8px;border-radius:6px;"><strong>Open question: </strong>${renderInlineExport(a.open_question)}</p>` : ""}
</div>`;
    })
    .join("\n");
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0;">${cards}</div>`;
}

function capabilityCardToHtml(d: CapabilityCardData): string {
  const matColors: Record<string, [string, string]> = {
    EMERGING: ["#e0f2fe", "#075985"],
    DEVELOPING: ["#fef3c7", "#92400e"],
    MATURE: ["#d1fae5", "#065f46"],
    UNVERIFIED: ["#e2e8f0", "#334155"],
  };
  const [mBg, mFg] = matColors[d.maturity.toUpperCase()] ?? ["#e2e8f0", "#334155"];
  const labelled = (label: string, value: string, color = "#64748b") =>
    value ? `<div style="margin-top:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${color};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:14px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:11pt;color:#0f172a;">${escapeHtml(d.capability_area)}</strong>
${d.maturity ? `<span style="background:${mBg};color:${mFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.maturity)}</span>` : ""}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
${d.what_real ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#15803d;">What appears real</p><p style="margin:4px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(d.what_real)}</p></div>` : ""}
${d.what_unproven ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#b45309;">What remains unproven</p><p style="margin:4px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(d.what_unproven)}</p></div>` : ""}
</div>
${labelled("Evidence supporting the view", d.evidence)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
${d.risk ? labelled("Risk if unvalidated", d.risk, "#be123c") : ""}
${d.follow_up ? labelled("Diligence follow-up", d.follow_up, "#3730a3") : ""}
</div>
</div>`;
}

function postureGridToHtml(d: PostureGridData): string {
  const cols = [
    { label: "Ahead", items: d.ahead, bg: "#f0fdf4", bdr: "#bbf7d0", head: "#15803d" },
    { label: "Parity", items: d.parity, bg: "#f0f9ff", bdr: "#bae6fd", head: "#0369a1" },
    { label: "May Lag", items: d.lag, bg: "#fffbeb", bdr: "#fde68a", head: "#b45309" },
    { label: "Unsupported", items: d.unsupported, bg: "#f8fafc", bdr: "#e2e8f0", head: "#475569" },
  ];
  const colHtml = cols
    .map((c) => {
      const items = c.items.length === 0
        ? `<p style="margin:6px 0 0;font-size:8pt;font-style:italic;color:#94a3b8;">None identified.</p>`
        : `<ul style="margin:6px 0 0;padding-left:14px;">${c.items.map((it) => `<li style="font-size:9pt;color:#334155;line-height:1.5;">${renderInlineExport(it)}</li>`).join("")}</ul>`;
      return `<div style="flex:1;min-width:0;border:1px solid ${c.bdr};background:${c.bg};border-radius:10px;padding:10px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${c.head};">${escapeHtml(c.label)}</p>${items}</div>`;
    })
    .join("\n");
  return `<div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0;">${colHtml}</div>`;
}

function marketIssueToHtml(d: MarketIssueData): string {
  const sigColors: Record<string, [string, string]> = {
    STRENGTH: ["#d1fae5", "#065f46"],
    RISK: ["#fee2e2", "#991b1b"],
    GAP: ["#fef3c7", "#92400e"],
    "WATCH ITEM": ["#e0f2fe", "#075985"],
    WATCH: ["#e0f2fe", "#075985"],
  };
  const [sBg, sFg] = sigColors[d.signal.toUpperCase()] ?? ["#e2e8f0", "#334155"];
  const block = (label: string, value: string, headColor = "#64748b") =>
    value ? `<div style="margin-top:8px;"><p style="margin:0;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${headColor};">${escapeHtml(label)}</p><p style="margin:2px 0 0;font-size:9pt;color:#334155;">${renderInlineExport(value)}</p></div>` : "";
  return `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:14px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
<strong style="font-size:11pt;color:#0f172a;">${escapeHtml(d.issue)}</strong>
${d.signal ? `<span style="background:${sBg};color:${sFg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(d.signal)}</span>` : ""}
</div>
${block("Why it matters", d.why)}
${block("Evidence basis", d.evidence)}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;">
${d.decision_implication ? `<div style="background:#f8fafc;border-radius:8px;padding:8px;">${block("Decision implication", d.decision_implication).replace("margin-top:8px;", "")}</div>` : ""}
${d.follow_up ? `<div style="background:#eef2ff;border-radius:8px;padding:8px;">${block("Follow-up question", d.follow_up, "#3730a3").replace("margin-top:8px;", "")}</div>` : ""}
</div>
</div>`;
}

function phasePlanToHtml(phases: PhasePlanPhase[]): string {
  const palBg = ["#f0fdf4", "#fffbeb", "#f5f3ff"];
  const palBdr = ["#bbf7d0", "#fde68a", "#ddd6fe"];
  const palBadge = ["#166534", "#92400e", "#5b21b6"];
  const palAccent = ["#15803d", "#b45309", "#6d28d9"];
  const cards = phases
    .map((phase, i) => {
      const bg = palBg[i % palBg.length];
      const bdr = palBdr[i % palBdr.length];
      const badge = palBadge[i % palBadge.length];
      const accent = palAccent[i % palAccent.length];
      const actions = phase.actions.length > 0
        ? `<ul style="margin:6px 0 0;padding-left:14px;">${phase.actions.map(a => `<li style="font-size:9pt;color:#334155;line-height:1.5;">${escapeHtml(a)}</li>`).join("")}</ul>`
        : "";
      const owner = phase.owner ? `<p style="margin:6px 0 0;font-size:8pt;color:#64748b;"><strong>Owner:</strong> ${escapeHtml(phase.owner)}</p>` : "";
      const signal = phase.success_signal ? `<p style="margin:6px 0 0;font-size:8pt;color:#475569;font-style:italic;"><strong>Signal:</strong> ${escapeHtml(phase.success_signal)}</p>` : "";
      return `<div style="flex:1;min-width:0;border:1px solid ${bdr};background:${bg};border-radius:10px;padding:12px;">
<span style="display:inline-block;background:${bg};color:${badge};border:1px solid ${bdr};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${escapeHtml(phase.name)}</span>
${phase.objective ? `<p style="margin:6px 0 0;font-size:9pt;font-weight:600;color:${accent};">${escapeHtml(phase.objective)}</p>` : ""}
${actions}${owner}${signal}
</div>`;
    })
    .join("\n");
  return `<div style="display:flex;gap:10px;margin:10px 0;">${cards}</div>`;
}

function actionCardToHtml(d: ActionCardData): string {
  const priorityColors: Record<string, [string, string]> = {
    CRITICAL: ["#fee2e2", "#991b1b"],
    HIGH: ["#fef3c7", "#92400e"],
    MEDIUM: ["#e0f2fe", "#075985"],
  };
  const [pBg, pFg] = priorityColors[d.priority.toUpperCase()] ?? ["#f1f5f9", "#334155"];
  const tfColors: Record<string, [string, string]> = {
    "FIRST 30 DAYS": ["#d1fae5", "#065f46"],
    "DAYS 31–60": ["#fef3c7", "#92400e"],
    "DAYS 61–90": ["#ede9fe", "#5b21b6"],
  };
  const [tfBg, tfFg] = tfColors[d.timeframe.toUpperCase()] ?? ["#e0e7ff", "#3730a3"];
  const badge = (label: string, bg: string, fg: string) =>
    `<span style="display:inline-block;background:${bg};color:${fg};border-radius:99px;padding:2px 10px;font-size:7pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin-right:4px;">${escapeHtml(label)}</span>`;
  const row = (label: string, value: string) =>
    value ? `<p style="margin:6px 0 0;font-size:9pt;color:#334155;"><strong style="font-size:8pt;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">${escapeHtml(label)}: </strong>${renderInlineExport(value)}</p>` : "";
  const impact = [
    d.proves ? `<li style="font-size:9pt;color:#334155;"><strong style="color:#15803d;">Proves:</strong> ${renderInlineExport(d.proves)}</li>` : "",
    d.stress_tests ? `<li style="font-size:9pt;color:#334155;"><strong style="color:#b45309;">Stress-tests:</strong> ${renderInlineExport(d.stress_tests)}</li>` : "",
    d.informs ? `<li style="font-size:9pt;color:#334155;"><strong style="color:#3730a3;">Informs:</strong> ${renderInlineExport(d.informs)}</li>` : "",
  ].filter(Boolean).join("");
  return `<div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:16px;margin:8px 0;">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;flex-wrap:wrap;">
<strong style="font-size:11pt;color:#0f172a;">${escapeHtml(d.action)}</strong>
<div>${d.timeframe ? badge(d.timeframe, tfBg, tfFg) : ""}${d.priority ? badge(d.priority, pBg, pFg) : ""}</div>
</div>
${d.risk_addressed ? `<p style="margin:6px 0 0;font-size:9pt;color:#64748b;font-style:italic;">${renderInlineExport(d.risk_addressed)}</p>` : ""}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
${d.what ? `<div>${row("What to do", d.what)}</div>` : ""}
${d.why ? `<div>${row("Why it matters", d.why)}</div>` : ""}
</div>
<div style="background:#f8fafc;border-radius:8px;padding:10px;margin-top:10px;display:flex;gap:16px;flex-wrap:wrap;">
${row("Owner", d.owner)}${row("Effort", d.effort)}${row("Expected payoff", d.payoff)}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
${row("Dependencies", d.dependencies)}${row("Pass criterion", d.pass_criterion)}
</div>
${impact ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;margin-top:10px;"><p style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#15803d;margin:0 0 6px;">Investment impact</p><ul style="margin:0;padding-left:16px;">${impact}</ul></div>` : ""}
</div>`;
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
