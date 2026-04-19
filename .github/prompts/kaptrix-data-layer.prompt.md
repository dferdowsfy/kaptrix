---
mode: agent
description: Kaptrix data layer — Supabase tables, RLS, client types, core TypeScript types
---

# Kaptrix: Data Layer

## Supabase Client Files (`src/lib/supabase/`)
| File | When to Use | Auth |
|------|------------|------|
| `client.ts` | Browser / client components | Anon key + cookie |
| `server.ts` | Route handlers & RSCs | Anon key + cookie |
| `service.ts` | Admin ops, seeding, system tasks | Service role key |
| `middleware.ts` | Auth gate | Anon key + session |

```typescript
// Service client (bypasses RLS)
import { getServiceClient } from "@/lib/supabase/service";
const supabase = getServiceClient(); // returns null if env not set

// Server client (respects RLS, cookie auth)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

## Key Tables
| Table | Purpose |
|-------|---------|
| `users` | Auth + roles (`role`, `approved`, `firm_name`) |
| `engagements` | Core engagement records |
| `documents` | Uploaded files + parsed text |
| `document_requirements` | Intake template catalog |
| `pre_analyses` | LLM analysis results (JSONB claims, red_flags, etc.) |
| `scores` | Operator-set dimension scores |
| `adjustment_proposals` | Evidence-generated score deltas |
| `score_history` | Append-only audit trail for scores |
| `evidence_confidence` | Computed confidence per engagement |
| `benchmark_cases` | Reference diligence records |
| `pattern_matches` | Similarity-matched benchmarks |
| `reports` | Report artifacts |
| `audit_log` | Append-only security log (UPDATE/DELETE revoked) |
| `prompt_versions` | LLM prompt templates |
| `chat_messages` | Chatbot session history |
| `preview_clients` | Demo engagement roster |
| `preview_snapshots` | Demo data cache (JSONB payload) |

## RLS Policy Model
- `admin` + `operator` → see all engagements
- `client_viewer` → see only own engagement (matched by email to `client_contact_email`)
- `audit_log` → read-only at DB level
- Chat messages → accessible by session (no user filter)

## Core TypeScript Types (`src/lib/types.ts`)
```typescript
type EngagementStatus = 'intake' | 'analysis' | 'scoring' | 'review' | 'delivered'
type DealStage = 'preliminary' | 'loi' | 'confirmatory' | 'post_close'
type EngagementTier = 'signal_scan' | 'standard' | 'deep' | 'retained'
type UserRole = 'operator' | 'client_viewer' | 'admin'
type ScoreDimension =
  | 'product_credibility' | 'tooling_exposure' | 'data_sensitivity'
  | 'governance_safety' | 'production_readiness' | 'open_validation'
type DocumentCategory =
  | 'deck' | 'architecture' | 'security' | 'model_ai' | 'data_privacy'
  | 'customer_contracts' | 'vendor_list' | 'financial' | 'incident_log'
  | 'team_bios' | 'demo' | 'other'
type AdjustmentStatus = 'proposed' | 'approved' | 'rejected' | 'superseded'
type ParseStatus = 'queued' | 'parsing' | 'parsed' | 'failed'
type ReportWatermark = 'draft' | 'final' | 'confidential'
```

## Env Vars
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-only) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
