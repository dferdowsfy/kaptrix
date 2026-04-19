---
mode: agent
description: Kaptrix platform architecture reference — app structure, auth, routing, and conventions
---

# Kaptrix: App Architecture

## Stack
- **Next.js 16.2.4** — App Router (RSC-enabled), TypeScript strict mode
- **Import alias**: `@/*` → `src/*`
- **Styling**: Tailwind CSS
- **Database**: Supabase (Postgres + RLS)
- **Auth**: Supabase session cookies

## Route Groups
```
src/app/
├── (auth)/          # Public: login, forgot-password, reset-password
├── (dashboard)/     # Protected: benchmarks, engagements, settings
│   └── preview/     # Main demo workspace (tabs-based)
├── account/         # Account management
├── how-it-works/    # Marketing page
└── api/             # API routes
```

## Middleware (`src/middleware.ts`)
- Calls `updateSession()` from `lib/supabase/middleware.ts`
- **Public paths** (no auth): `/preview*`, `/login`, `/forgot-password`, `/reset-password`, `/account`, `/how-it-works`, `/api/auth*`, `/api/preview*`, `/api/chat*`
- **All other paths**: Require Supabase session cookie
- Session refresh is non-destructive (no redirect on failure)

## Auth & Roles
- `AppRole`: `admin | operator | analyst | reviewer | client_viewer`
- Stored in `public.users.role`
- `approved` boolean on `users` table gates new engagement creation

## Code Conventions
- Components in `src/components/<feature>/`
- Custom hooks in `src/hooks/`
- Shared utilities in `src/lib/`
- All DB types in `src/lib/types.ts`
- Constants (dimensions, weights, bands) in `src/lib/constants.ts`
- Never use `Authorization: Bearer` with the self-hosted LLM — use `X-API-Key` only (see kaptrix-llm-infra skill)
