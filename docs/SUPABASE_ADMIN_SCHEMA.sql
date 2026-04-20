-- =====================================================================
-- Kaptrix — Admin + Saved Reports schema patch
-- =====================================================================
-- Run this once in the Supabase SQL editor for the project that is
-- backing production. It is idempotent — safe to re-run.
--
-- Fixes:
--   * "column users.approved does not exist" on /admin
--   * Adds the hidden_menu_keys column the admin panel toggles
--   * Elevates dferdows@gmail.com to admin automatically
--   * Creates the user_reports table so previously generated reports
--     persist across devices and appear in the Reports page
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. public.users — approval + hidden menu keys + admin RLS
-- ---------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.users
  ALTER COLUMN approved SET DEFAULT true;

UPDATE public.users SET approved = true WHERE approved = false;

CREATE INDEX IF NOT EXISTS idx_users_approved ON public.users(approved);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hidden_menu_keys TEXT[] NOT NULL DEFAULT '{}';


-- ---------------------------------------------------------------------
-- 2. Trigger: mirror new auth.users into public.users, elevate admin
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT := 'dferdows@gmail.com';
  resolved_role TEXT;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(NEW.email) = lower(admin_email) THEN
    resolved_role := 'admin';
  ELSE
    resolved_role := 'operator';
  END IF;

  INSERT INTO public.users (id, email, role, approved)
  VALUES (NEW.id, NEW.email, resolved_role, true)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        role = CASE
          WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'admin'
          ELSE public.users.role
        END,
        approved = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ---------------------------------------------------------------------
-- 3. Backfill the admin row for any existing auth user
-- ---------------------------------------------------------------------
INSERT INTO public.users (id, email, role, approved)
SELECT au.id, au.email, 'admin', true
FROM auth.users au
WHERE lower(au.email) = 'dferdows@gmail.com'
ON CONFLICT (id) DO UPDATE
  SET role = 'admin', approved = true;

-- Also backfill public.users from any auth.users that are missing
-- (in case the trigger wasn't present when they signed up).
INSERT INTO public.users (id, email, role, approved)
SELECT au.id, au.email,
       CASE WHEN lower(au.email) = 'dferdows@gmail.com' THEN 'admin' ELSE 'operator' END,
       true
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. Admin RLS: admins can read & update every user row
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS users_admin_select ON public.users;
CREATE POLICY users_admin_select ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );

DROP POLICY IF EXISTS users_admin_update ON public.users;
CREATE POLICY users_admin_update ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid() AND me.role = 'admin'
    )
  );


-- ---------------------------------------------------------------------
-- 5. user_reports — persisted LLM-generated reports per user
--    Needed so the Reports page can show every report a user has
--    generated (with generated_at timestamp) across browsers/devices.
-- ---------------------------------------------------------------------
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

-- Done.
