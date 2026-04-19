---
mode: agent
description: Kaptrix report generation — advanced reports config, section orchestration, storage, and output format rules
---

# Kaptrix: Report Generation

## Report Types (`AdvancedReportId`)
| ID | Title | Description |
|----|-------|-------------|
| `master_diligence` | Master AI Diligence Report | 10-section comprehensive memo |
| `ic_memo` | Executive Summary / IC Memo | Partner-style IC decision document |
| `risk_register` | Technical Risk Register | Risk taxonomy R1–R15 |
| `value_creation` | Value Creation Roadmap | 30/60/90 day execution plan |
| `evidence_coverage` | Evidence Coverage Report | Gaps + confidence qualifiers |

## API Endpoint
**POST `/api/reports/llm/section`**
```typescript
// Request
{ client_id, report_type, section_id, knowledge_base?, prior_markdown? }

// Response
{ report_type, section_id, section_label, title, content, generated_at, target, client }
```

## Section Generation Flow (`src/lib/reports/report-store.ts`)
1. For each section in `config.sections[]`, call `/api/reports/llm/section`
2. Pass `prior_markdown` (last 12KB) for continuity
3. Accumulate: `accumulated = accumulated + "\n\n" + json.content`
4. On error: set record `status: "error"` and stop

## Section Config (`AdvancedReportSection`)
```typescript
{
  id: string,          // stable ID used by API
  label: string,       // human label for progress UI
  instruction: string, // focused prompt for this slice
  maxTokens: number,   // per-section budget (capped at 1400)
}
```

## IC Memo Sections (7 sections)
`snapshot` → `recommendation` → `insight` → `strengths` → `risks` → `killer` → `double` → `implications`

## Mandatory Decision Snapshot Block
Every report MUST begin with this exact format (rendered as graphic hero card):
```
:::snapshot
verdict: <short verdict>
posture: <CRITICAL | HIGH | MEDIUM | LOW | OK>
confidence: <0–100>
thesis: <ONE sentence why deal works or breaks>
strengths:
  - <strength, ≤14 words>
risks:
  - <risk, ≤14 words> [SEVERITY_TAG]
:::
```

## Markdown Format Rules
- `#` title once, `##` top-level sections, `###` sub-sections
- Bullets: `-` only
- **Bold** for emphasis, *italics* sparingly
- Short paragraphs: 2–4 sentences, ≤90 words
- Score display: `- Label: X.X / 5`
- Tables: proper markdown (header + `---|---` separator)
- Severity tags: `[CRITICAL]`, `[HIGH]`, `[MEDIUM]`, `[LOW]`, `[OK]`, `[STRENGTH]`, `[RISK]`, `[GAP]`
- Blockquotes: `> ` for key insights
- **No code fences, no preamble, no closing remarks — raw markdown only**
- Total budget: ~1800 tokens (~3 dense pages)

## Report Store (`src/lib/reports/report-store.ts`)
- In-memory state with `useSyncExternalStore` hook
- Persisted to `localStorage` under key `kaptrix.preview.reports.v1`
- Storage key: `${clientId}::${reportId}`
- Hydrates from Supabase on mount; syncs back on completion
- `ReportRecord.status`: `"generating" | "done" | "error"`

## Checking LLM is Ready (always do this first)
```typescript
if (!isSelfHostedLlmConfigured()) {
  return NextResponse.json({ error: "LLM not configured..." }, { status: 503 });
}
```
