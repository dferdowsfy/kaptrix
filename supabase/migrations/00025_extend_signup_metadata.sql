-- Migration: capture extended signup metadata (name, firm, job title, phone)
-- Rationale:
--   * The sign-up form now collects full name, firm/company, job title, and
--     optional phone so the platform can greet people by name, segment by
--     firm, and route enterprise follow-ups.
--   * These values arrive in auth.users.raw_user_meta_data via
--     supabase.auth.signUp({ options: { data: {...} } }). We mirror them into
--     public.users so RLS-governed features can read them directly.

-- 1. New columns on public.users (firm_name already exists).
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name   TEXT,
  ADD COLUMN IF NOT EXISTS job_title   TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT;

-- 2. Replace trigger fn so it copies raw_user_meta_data into public.users.
--    Keeps the auto-approval + admin-elevation logic from 00024.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_email TEXT := 'dferdows@gmail.com';
  resolved_role TEXT;
  meta JSONB := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  meta_full_name TEXT := NULLIF(TRIM(meta->>'full_name'), '');
  meta_firm      TEXT := NULLIF(TRIM(meta->>'firm_name'), '');
  meta_title     TEXT := NULLIF(TRIM(meta->>'job_title'), '');
  meta_phone     TEXT := NULLIF(TRIM(meta->>'phone'), '');
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  IF lower(NEW.email) = lower(admin_email) THEN
    resolved_role := 'admin';
  ELSE
    resolved_role := 'operator';
  END IF;

  INSERT INTO public.users (id, email, role, approved, full_name, firm_name, job_title, phone)
  VALUES (NEW.id, NEW.email, resolved_role, true, meta_full_name, meta_firm, meta_title, meta_phone)
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        role       = CASE
          WHEN lower(EXCLUDED.email) = lower(admin_email) THEN 'admin'
          ELSE public.users.role
        END,
        approved   = true,
        full_name  = COALESCE(EXCLUDED.full_name,  public.users.full_name),
        firm_name  = COALESCE(EXCLUDED.firm_name,  public.users.firm_name),
        job_title  = COALESCE(EXCLUDED.job_title,  public.users.job_title),
        phone      = COALESCE(EXCLUDED.phone,      public.users.phone);

  RETURN NEW;
END;
$$;
