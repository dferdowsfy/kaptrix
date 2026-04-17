# Kaptrix Delivery Platform

Internal AI product diligence platform for private equity, growth equity, family offices, and corporate development teams evaluating AI-heavy software investments.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in Supabase + Google Gemini credentials (see below)

# 3. Apply migrations against the remote Supabase project
npx supabase db push

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated visitors land on `/preview` (the demo workspace); authenticated operators land on `/engagements`.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **Styling:** Tailwind CSS v4
- **Database / Auth / Storage:** Supabase (Postgres with Row Level Security)
- **AI:** Google Gemini (via `@google/generative-ai`)
- **Hosting:** Vercel

## Data Flow

All operator-visible data is stored in and retrieved from Supabase:

- **Preview workspace** — `preview_clients` + `preview_snapshots` (JSONB). Auto-seeded from the bundled demo dataset on first request via the service-role client. Read by `/api/preview/clients` and `/api/preview/snapshot`, consumed in the UI through the `usePreviewClients` and `usePreviewSnapshot` hooks.
- **Dashboard workspace** — `engagements`, `documents`, `pre_analyses`, `scores`, `benchmark_cases`, `pattern_matches`, `reports`, `audit_log`, `prompt_versions`.
- **Chatbot** — every natural-language turn is persisted to `chat_messages` via `/api/chat` (POST). Past turns can be replayed with a `GET /api/chat?session_id=…` lookup.

All AI inference is routed through Google Gemini (`gemini-2.0-flash`) using `GOOGLE_API_KEY`. No Anthropic calls remain.

## Project Structure

```
kaptrix-platform/
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 00001–00011         # Core table creation
│       ├── 00012               # RLS policies
│       ├── 00013               # Seed: document requirements
│       ├── 00014               # Seed: benchmark cases
│       └── 00015               # Preview + chat_messages tables (RLS)
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   ├── preview/            # Public demo workspace
│   │   └── api/
│   │       ├── chat/           # Gemini chatbot + Supabase persistence
│   │       └── preview/        # clients + snapshot endpoints
│   ├── components/
│   ├── hooks/
│   │   ├── use-preview-data.ts # SWR hooks for Supabase-backed preview
│   │   └── use-selected-preview-client.ts
│   └── lib/
│       ├── anthropic/          # Gemini client (legacy folder name)
│       ├── preview/data.ts     # Server-side preview data loader + seeder
│       └── supabase/
│           ├── client.ts       # Browser client
│           ├── server.ts       # RSC / route-handler client
│           ├── middleware.ts   # Auth gate (public /preview + /api/preview)
│           └── service.ts      # Service-role admin client
```

## Environment Variables

Copy `.env.example` to `.env.local` for local dev. On Vercel, add each of these in **Project Settings → Environment Variables** for **Production**, **Preview**, and **Development** environments.

| Variable | Where | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | `https://qaqolwkdmsmokztitqty.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | JWT anon key |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | Newer `sb_publishable_…` key (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | JWT service role (used for seeding + chat persistence) |
| `SUPABASE_SECRET_KEY` | **server only** | Newer `sb_secret_…` key (optional) |
| `GOOGLE_API_KEY` | **server only** | Gemini API key. `GEMINI_API_KEY` is also accepted. |
| `NEXT_PUBLIC_APP_URL` | client + server | Canonical app URL (used for magic-link redirects) |

> `.env.local` is gitignored. Never commit real credentials.

## Deploying to Vercel

1. Push this repo and import it into Vercel.
2. In Vercel → **Project Settings → Environment Variables**, paste each value from `.env.local`. Mark `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, and `GOOGLE_API_KEY` as server-only (they should not be prefixed with `NEXT_PUBLIC_`).
3. Vercel detects Next.js 16 automatically — no `vercel.json` needed.
4. First deploy triggers the preview-data auto-seed on first request to `/api/preview/clients`. Subsequent requests read directly from Supabase.

## Mobile

The UI is mobile-optimized: a device-width viewport, a horizontally-scrollable dashboard sidebar and preview tab bar, stacked header chips, touch-safe 16 px form fonts (prevents iOS auto-zoom), and a full-bleed chatbot panel on small screens.

## Testing

```bash
npm test                    # Run all tests
npm test -- --coverage      # With coverage report
```

## Security

- Documents encrypted at rest (Supabase default) and in transit
- Row Level Security enforced on all tables
- Audit log is append-only (UPDATE/DELETE revoked)
- Middleware exempts `/preview` and `/api/preview|chat` from auth so the demo workspace remains publicly reachable; all other routes require a Supabase session
- Service-role key is only used server-side, never shipped to the browser
- Secrets managed via environment variables — never hardcoded
