# Kaptrix Delivery Platform

Internal AI product diligence platform for private equity, growth equity, family offices, and corporate development teams evaluating AI-heavy software investments.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your Supabase and Anthropic credentials

# 3. Start Supabase locally (requires Docker)
npx supabase start

# 4. Run migrations
npx supabase db push

# 5. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (Postgres + Auth + Storage + RLS)
- **AI:** Anthropic API (Claude Sonnet 4.5 / Claude Opus 4.5)
- **PDF:** react-pdf (server-side generation)
- **Hosting:** Vercel

## Project Structure

```
kaptrix-platform/
├── supabase/
│   ├── config.toml                  # Supabase local config
│   └── migrations/                  # Database migrations (ordered)
│       ├── 00001–00011              # Table creation
│       ├── 00012                    # RLS policies
│       ├── 00013                    # Seed: document requirements
│       └── 00014                    # Seed: 10 benchmark case anchors
├── src/
│   ├── app/
│   │   ├── (auth)/login/            # Magic link login
│   │   ├── (dashboard)/             # Authenticated operator shell
│   │   │   ├── engagements/         # CRUD + detail + sub-tabs
│   │   │   ├── benchmarks/          # Pattern library
│   │   │   └── settings/            # Admin config
│   │   └── api/                     # Route handlers
│   ├── components/                  # UI components by domain
│   ├── hooks/                       # useAutosave, useEngagement, etc.
│   └── lib/
│       ├── anthropic/               # API client + versioned prompts
│       ├── audit/                   # Append-only audit logger
│       ├── parsers/                 # PDF, DOCX, XLSX, PPTX parsers
│       ├── pdf-generator/           # Report PDF generation
│       ├── scoring/                 # Composite score calculator
│       ├── supabase/                # Client, server, middleware
│       ├── constants.ts             # Tiers, dimensions, limits
│       ├── types.ts                 # Full TypeScript type definitions
│       └── utils.ts                 # Formatting helpers
├── tests/                           # Unit + integration tests
├── .env.example                     # Required env vars
└── jest.config.ts                   # Test configuration
```

## Modules

| Module | Status | Description |
|---|---|---|
| 1. Engagement & Document Intake | Scaffolded | Create engagement, upload docs, coverage matrix |
| 2. AI Pre-Analysis | Plumbing ready | Anthropic API integration with prompt versioning |
| 3. Scoring Engine | Scaffolded | 6-dimension scoring with auto-save |
| 4. Pattern Library | Seeded | 10 synthetic case anchors, benchmark rollups |
| 5. Report Generator | Scaffolded | Template-driven PDF generation |

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ANTHROPIC_API_KEY` | Anthropic API key |

## Testing

```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
```

## Security

- All documents encrypted at rest (Supabase default) and in transit
- Row Level Security enforced on all tables
- Audit log is append-only (UPDATE/DELETE revoked)
- Zero data retention with Anthropic API (ZDR header enabled)
- Session timeout: 30 minutes of inactivity
- Secrets managed via environment variables — never hardcoded
