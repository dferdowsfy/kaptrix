---
mode: agent
description: Kaptrix preview system and scoring — demo workspace, clientId routing, score dimensions, and composite calculation
---

# Kaptrix: Preview System & Scoring

## Preview System (`src/lib/preview/`)

### ClientId Types
- **Demo client**: `preview-engagement-001` → full `FULL_DEMO_SNAPSHOT` (hardcoded rich data)
- **Lightweight preview**: `preview-engagement-002/003/004` → `lightweightSnapshotFor()` (basic metadata + demo data)
- **Real engagement**: Any UUID → `blankSnapshotFor()` (actual DB row + empty arrays)

### `getPreviewSnapshot(clientId)` (`src/lib/preview/data.ts`)
1. Tries Supabase `preview_snapshots` table
2. Falls back to `fallbackSnapshot(clientId)` — never throws
3. Used by: report generation API, chat API, scoring API

### `PreviewSnapshot` Shape
```typescript
{
  engagement: Engagement,
  requirements: DocumentRequirement[],
  documents: Document[],
  analyses: PreAnalysis[],
  benchmarks: BenchmarkCase[],
  patternMatches: PatternMatch[],
  scores: Score[],
  report: Report,
  knowledgeInsights: KnowledgeInsight[],
  executiveReport: ExecutiveReportData,
}
```

### Preview Tabs (`src/lib/preview-tabs.ts`)
`home` → `overview` → `intake` → `coverage` → `insights` → `pre-analysis` → `scoring` → `positioning` → `report`

### Selected Client Persistence
- `localStorage` key: `SELECTED_CLIENT_STORAGE_KEY` from `lib/constants.ts`
- Hook: `useSelectedPreviewClient()` from `src/hooks/use-selected-preview-client.ts`

### Demo Client Roster (`src/lib/preview-clients.ts`)
| ID | Target | Industry | Score |
|----|--------|----------|-------|
| `preview-engagement-001` | LexiFlow AI | Legal tech | 3.1 |
| `preview-engagement-002` | Northwind Health Insights | Healthcare | 3.6 |
| `preview-engagement-003` | Atlas Trade Copilot | Fintech | 2.4 |
| `preview-engagement-004` | Orbital Ops | Industrial | — |

---

## Scoring System

### 6 Dimensions + Weights
| Dimension | Weight | Sub-Criteria |
|-----------|--------|-------------|
| `product_credibility` | 0.25 | ai_value_vs_wrapper, demo_production_gap, customer_vs_claimed, differentiation |
| `tooling_exposure` | 0.20 | model_concentration, api_brittleness, switching_cost, hosted_vs_managed |
| `data_sensitivity` | 0.15 | sensitivity_fit, training_provenance, customer_isolation, regulated_data |
| `governance_safety` | ~0.15 | audit_trail, incident_response, incident_response_model, policy_enforcement |
| `production_readiness` | ~0.15 | deployment_maturity, scaling_headroom, cost_model, reliability_posture |
| `open_validation` | ~0.10 | third_party_validation, public_benchmarks, external_review, customer_traction |

### Score Bands (1–5)
- 5: Exceptional / Minimal risk
- 4: Strong / Low risk
- 3: Partial / Moderate
- 2: Weak signal / High risk
- 1: No evidence / Critical

### Composite Score Computation (`src/lib/scoring/calculator.ts`)
```
composite = Σ(avg_dimension_score × weight)
```

### Final Score (with Adjustments)
- Base scores + approved `adjustment_proposals` deltas
- Bounded ±0.5 per adjustment
- Multiplied by `evidence_confidence.composite` factor
- Returned by `GET /api/scores/final?engagement_id=...`

### Score API
- `GET /api/scores?engagement_id=...` — all scores
- `PUT /api/scores` — upsert score (rationale ≥20 chars required)
- `GET /api/scores/final?engagement_id=...` — composite with adjustments

### Adjustment Proposals
- `POST /api/adjustments` — create proposal
- `GET /api/adjustments?engagement_id=...&status=proposed` — list by status
- Delta bounds: ±0.5, confidence: 0–1, rationale ≥20 chars
- Status flow: `proposed` → `approved` | `rejected` | `superseded`
