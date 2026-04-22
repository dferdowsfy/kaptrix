# Kaptrix — Tiered Pricing & Access Control Setup

This document explains what to run in Supabase and what knobs the
admin has to manage tiers, limits, and user access.

## 1. What the migration adds

Run `supabase/migrations/00027_create_plans_and_usage.sql` in the
Supabase SQL editor (or via the Supabase CLI).

It adds:

- `public.users.tier` — `starter` | `professional` | `institutional`
  (default: `starter`; admins are auto-elevated to `institutional`).
- `public.users.tier_overrides` — optional `JSONB` with per-user
  limit overrides. Any field may be omitted to inherit the tier default.
  Example:

  ```json
  {
    "max_engagements": 20,
    "max_reports_per_month": -1,
    "max_ai_queries_per_month": 5000,
    "benchmarking_enabled": true,
    "advanced_reports_enabled": true,
    "priority_processing": true,
    "team_collaboration": true
  }
  ```

  `-1` means **unlimited** on any numeric field.

- `public.usage_counters` — per-user signup-anchored billing-cycle rollup
  `(user_id, period_start)` with `reports_generated` and `ai_queries`.
- `public.increment_usage(p_user_id uuid, p_kind text, p_delta int)`
  — SECURITY DEFINER function the server calls to tick the counters.
- `public.current_month_usage` — read-only view scoped by the
  existing RLS on `usage_counters`.
- Patched `public.handle_new_auth_user` trigger — new signups now
  land in the correct tier (admin email becomes `institutional`).

All changes are additive and idempotent.

## 2. Tier defaults

| Capability                   | Starter | Professional | Institutional |
|------------------------------|--------:|-------------:|--------------:|
| Max active engagements       |       3 |           10 |     Unlimited |
| Reports / month              |      10 |           40 |     Unlimited |
| AI queries / month           |     100 |          500 |          2000 |
| Benchmarking / positioning   |     No  |          Yes |           Yes |
| Advanced / IC-grade reports  |     No  |          Yes |           Yes |
| Priority processing          |     No  |           No |           Yes |
| Team collaboration           |     No  |           No |           Yes |

These defaults live in code at `src/lib/plans.ts`. Update them
there if product adjusts the plan. Per-user overrides (set via the
admin UI) win over the defaults.

## 3. Enforcement points

The server enforces limits at these seams:

| Action                          | Route                                      | Check            |
|---------------------------------|--------------------------------------------|------------------|
| Create engagement               | `POST /api/preview/engagements`            | `max_engagements`|
| Generate advanced / IC report   | `POST /api/reports/llm`                    | `advanced_reports_enabled` + `max_reports_per_month` |
| AI chat query                   | `POST /api/chat` (signed-in only)          | `max_ai_queries_per_month` |

Each gate returns HTTP `402 Payment Required` with body:

```json
{
  "error": "<human message>",
  "code": "tier_limit_reached" | "tier_feature_locked",
  "limit": <number>,
  "current": <number>,
  "tier": "starter" | "professional" | "institutional"
}
```

The frontend surfaces this inline (via the tier pill + the 402
payload) and prompts the user to upgrade.

## 4. Admin controls

`/admin` (admin role only) shows the user management panel:

- **Invite new user** (`+ Invite new user`) — sends a Supabase
  email invite with a set-password link. Role + tier are assigned
  immediately.
- **Role** and **Tier** columns are inline dropdowns. Changes save
  on selection.
- **Limits** column shows the effective caps and lets the admin
  override any numeric limit (engagements / reports / AI queries)
  on a per-user basis. Set a value to `-1` for unlimited. Clear to
  revert to the tier default.
- **Hidden menu tabs** — per-user tab visibility.
- **Send reset email / Delete** — unchanged.

## 5. Usage endpoint

`GET /api/usage` returns the signed-in user's tier, effective
limits, current billing-cycle usage (anchored to signup day), and remaining headroom. The dashboard
tier pill in the header renders a meter from this payload.

## 6. Things to verify post-deploy

1. Run the migration in the Supabase SQL editor.
2. Sign in as the admin. The header pill should read
   **INSTITUTIONAL**.
3. Click the pill → verify the meters render (engagements / reports
   / AI queries).
4. Sign in as a Starter user. Confirm:
   - Creating a 4th active engagement returns a 402 with the
     upgrade message.
   - The 11th report generation in a month is blocked.
5. In `/admin`, invite a new user and confirm the invite email
   arrives (requires SMTP + invite templates to be configured in
   Supabase Auth → Templates → Invite user).
6. Override a user's limit and confirm the override surfaces in
   both the admin table summary and the user's tier pill.
