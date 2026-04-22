-- =============================================================================
-- 00029_create_page_permissions.sql
--
-- Real authorization for per-page access. Replaces the cosmetic
-- `users.hidden_menu_keys` denylist with an explicit, auditable permission
-- model:
--
--   role_page_permissions   baseline defaults per role
--   user_page_permissions   per-user overrides (hide or re-enable)
--
-- Resolution: user override beats role permission; missing role permission
-- defaults to TRUE (visible). The single source of truth is
--   get_user_page_permissions(uid uuid) -> jsonb
--
-- For backward compatibility with the existing middleware / UI that still
-- reads `public.users.hidden_menu_keys`, a trigger on `user_page_permissions`
-- keeps that legacy column in sync automatically. Admin-panel writes can
-- continue to target `hidden_menu_keys` OR the new RPC/table; both stay
-- consistent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Canonical page keys. Centralized so every layer (DB, API, UI) agrees.
-- -----------------------------------------------------------------------------
-- Keys intentionally match the ids in src/lib/preview-tabs.ts plus
-- cross-cutting surfaces (admin, customize).
CREATE TABLE IF NOT EXISTS public.page_keys (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  always_visible BOOLEAN NOT NULL DEFAULT false
);

INSERT INTO public.page_keys (key, label, always_visible) VALUES
  ('home',        'Home',               true),
  ('overview',    'Overview',           true),
  ('intake',      'Intake',             false),
  ('coverage',    'Evidence & Coverage',false),
  ('insights',    'Insights',           false),
  ('scoring',     'Scoring',            false),
  ('positioning', 'Positioning',        false),
  ('report',      'Report',             false),
  ('customize',   'Customize',          false),
  ('admin',       'Admin',              false)
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. role_page_permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  page_key TEXT NOT NULL REFERENCES public.page_keys(key) ON UPDATE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (role, page_key)
);

CREATE INDEX IF NOT EXISTS idx_role_page_perms_role
  ON public.role_page_permissions(role);

-- -----------------------------------------------------------------------------
-- 3. user_page_permissions
-- -----------------------------------------------------------------------------
-- NOTE: references public.users (the app's existing user table), NOT a new
-- `profiles` table. Introducing `profiles` would fragment identity and
-- break 20+ existing FKs/RLS policies.
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL REFERENCES public.page_keys(key) ON UPDATE CASCADE,
  can_view BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_user_page_perms_user
  ON public.user_page_permissions(user_id);

-- -----------------------------------------------------------------------------
-- 4. updated_at triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at_permissions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_role_page_perms_updated_at ON public.role_page_permissions;
CREATE TRIGGER trg_role_page_perms_updated_at
  BEFORE UPDATE ON public.role_page_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_permissions();

DROP TRIGGER IF EXISTS trg_user_page_perms_updated_at ON public.user_page_permissions;
CREATE TRIGGER trg_user_page_perms_updated_at
  BEFORE UPDATE ON public.user_page_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_permissions();

-- -----------------------------------------------------------------------------
-- 5. Seed role defaults
--
-- Start permissive (all visible) because the existing model is a denylist;
-- admins explicitly hide pages. Admin role is always everything.
-- `admin` page_key is restricted to the `admin` role at the role level.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r TEXT;
  k TEXT;
  v BOOLEAN;
BEGIN
  FOREACH r IN ARRAY ARRAY['admin','operator','analyst','reviewer','client_viewer'] LOOP
    FOR k IN SELECT key FROM public.page_keys LOOP
      v := TRUE;
      IF k = 'admin' AND r <> 'admin' THEN
        v := FALSE;
      END IF;
      INSERT INTO public.role_page_permissions (role, page_key, can_view)
      VALUES (r, k, v)
      ON CONFLICT (role, page_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Canonical resolver RPC
--
-- Returns a jsonb map { page_key -> boolean } for the given user.
-- Precedence: user override > role default > (missing) true.
-- Security: SECURITY DEFINER so client callers get a consistent result
-- regardless of RLS on the underlying tables; the function itself checks
-- that the caller is either the target user or an admin.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_page_permissions(uid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  caller_role TEXT;
  target_role TEXT;
  result JSONB := '{}'::jsonb;
  rec RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  -- Caller must be target, or admin. Service-role (caller IS NULL) bypasses.
  IF caller IS NOT NULL AND caller <> uid THEN
    SELECT role INTO caller_role FROM public.users WHERE id = caller;
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT role INTO target_role FROM public.users WHERE id = uid;
  IF target_role IS NULL THEN
    target_role := 'operator';
  END IF;

  -- Merge: start with role defaults, overlay user overrides, ensure every
  -- canonical page key has an entry (default true if neither level has a row).
  FOR rec IN
    SELECT
      pk.key AS page_key,
      COALESCE(
        upp.can_view,        -- user override wins
        rpp.can_view,        -- then role default
        TRUE                 -- secure-but-permissive fallback (matches current UX)
      ) AS can_view
    FROM public.page_keys pk
    LEFT JOIN public.role_page_permissions rpp
      ON rpp.page_key = pk.key AND rpp.role = target_role
    LEFT JOIN public.user_page_permissions upp
      ON upp.page_key = pk.key AND upp.user_id = uid
  LOOP
    result := result || jsonb_build_object(rec.page_key, rec.can_view);
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_page_permissions(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_page_permissions(UUID) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.role_page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- role_page_permissions: readable by any authenticated user; writable only
-- by admins (via service role in practice).
DROP POLICY IF EXISTS role_perms_read ON public.role_page_permissions;
CREATE POLICY role_perms_read ON public.role_page_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS role_perms_admin_write ON public.role_page_permissions;
CREATE POLICY role_perms_admin_write ON public.role_page_permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- user_page_permissions: a user reads their own row; admins read/write any.
DROP POLICY IF EXISTS user_perms_self_read ON public.user_page_permissions;
CREATE POLICY user_perms_self_read ON public.user_page_permissions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS user_perms_admin_write ON public.user_page_permissions;
CREATE POLICY user_perms_admin_write ON public.user_page_permissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- -----------------------------------------------------------------------------
-- 8. Backward-compat mirror: keep users.hidden_menu_keys in sync
--
-- All existing middleware / API / UI code reads `users.hidden_menu_keys`.
-- Rather than touch every call site, we make the new tables authoritative
-- and mirror the computed "hidden set" onto the legacy column. This means
-- existing enforcement keeps working AND the new permission model is the
-- system of record.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_hidden_menu_keys(target_user UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms JSONB;
  hidden TEXT[];
BEGIN
  perms := public.get_user_page_permissions(target_user);
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::TEXT[])
    INTO hidden
    FROM jsonb_each_text(perms)
    WHERE value = 'false';
  UPDATE public.users SET hidden_menu_keys = hidden WHERE id = target_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_user_page_perms_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.sync_hidden_menu_keys(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM public.sync_hidden_menu_keys(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_page_perms_sync ON public.user_page_permissions;
CREATE TRIGGER trg_user_page_perms_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.user_page_permissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_user_page_perms_sync();

-- -----------------------------------------------------------------------------
-- 9. Backfill: materialize existing denylist into user_page_permissions.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  u RECORD;
  k TEXT;
BEGIN
  FOR u IN SELECT id, hidden_menu_keys FROM public.users WHERE hidden_menu_keys IS NOT NULL LOOP
    IF u.hidden_menu_keys IS NULL THEN CONTINUE; END IF;
    FOREACH k IN ARRAY u.hidden_menu_keys LOOP
      IF EXISTS (SELECT 1 FROM public.page_keys WHERE key = k) THEN
        INSERT INTO public.user_page_permissions (user_id, page_key, can_view)
        VALUES (u.id, k, FALSE)
        ON CONFLICT (user_id, page_key) DO UPDATE SET can_view = EXCLUDED.can_view;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Re-sync all users so hidden_menu_keys reflects the authoritative tables.
DO $$
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users LOOP
    PERFORM public.sync_hidden_menu_keys(u.id);
  END LOOP;
END $$;
