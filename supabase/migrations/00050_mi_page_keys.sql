-- Migration 00050: Market Intelligence — page keys for MI tabs.
--
-- Registers the 7 MI pathway tab keys in the canonical page_keys table and
-- seeds role_page_permissions with can_view=FALSE for all roles.
-- Admins can flip individual keys on via the admin panel once the pathway
-- is ready for rollout.

INSERT INTO public.page_keys (key, label, always_visible) VALUES
  ('mi_intake',      'MI — Intake',         false),
  ('mi_evidence',    'MI — Evidence',        false),
  ('mi_insights',    'MI — Insights',        false),
  ('mi_scoring',     'MI — Scoring',         false),
  ('mi_positioning', 'MI — Positioning',     false),
  ('mi_shortlist',   'MI — Shortlist',       false),
  ('mi_report',      'MI — Report',          false)
ON CONFLICT (key) DO NOTHING;

-- Seed all roles with can_view=FALSE (hidden by default).
DO $$
DECLARE
  r TEXT;
  k TEXT;
BEGIN
  FOREACH r IN ARRAY ARRAY['admin','operator','analyst','reviewer','client_viewer'] LOOP
    FOREACH k IN ARRAY ARRAY[
      'mi_intake','mi_evidence','mi_insights','mi_scoring',
      'mi_positioning','mi_shortlist','mi_report'
    ] LOOP
      INSERT INTO public.role_page_permissions (role, page_key, can_view)
      VALUES (r, k, FALSE)
      ON CONFLICT (role, page_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
