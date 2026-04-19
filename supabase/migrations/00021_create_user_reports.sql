-- Migration: Per-user saved LLM reports (on-demand diligence reports).
-- Keyed by (user_id, client_id, report_type) so regenerating overwrites.
-- client_id is a free-form string — it may be a preview client id
-- (e.g. "preview-engagement-001") or a real engagement uuid cast to text.

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  target TEXT NOT NULL,
  client_name TEXT,
  content TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id, report_type)
);

CREATE INDEX IF NOT EXISTS user_reports_user_created_idx
  ON public.user_reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS user_reports_user_client_idx
  ON public.user_reports (user_id, client_id);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_reports" ON public.user_reports;
CREATE POLICY "users_manage_own_reports"
  ON public.user_reports FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Auto-bump updated_at on every update.
CREATE OR REPLACE FUNCTION public.tg_user_reports_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_reports_touch ON public.user_reports;
CREATE TRIGGER user_reports_touch
  BEFORE UPDATE ON public.user_reports
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_reports_touch();
