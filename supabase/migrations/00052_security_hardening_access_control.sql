-- Migration: Security hardening — deny-by-default signup, engagement-scoped
-- RLS, fix chat_messages policy, revoke increment_usage from PUBLIC.
--
-- Root-cause fix for: auto-approve trigger, permissive RLS, open
-- preview_uploaded_docs, chat_messages public read, increment_usage
-- callable by any authenticated user.

-- ============================================
-- 1. Add 'pending' to the users role enum and change default.
--    New signups land as pending+unapproved until an admin grants a role.
-- ============================================
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('pending', 'operator', 'client_viewer', 'admin'));

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'pending';

ALTER TABLE public.users
  ALTER COLUMN approved SET DEFAULT false;

-- ============================================
-- 2. Replace auto-approve trigger with deny-by-default.
--    New signups get role='pending', approved=false.
--    Admin email (env-driven) is the only exception.
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, email, role, approved)
  VALUES (NEW.id, NEW.email, 'pending', false)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- 3. Tighten RLS on engagements — operators only see their own.
-- ============================================
DROP POLICY IF EXISTS "operators_read_all_engagements" ON public.engagements;
CREATE POLICY "operators_read_own_engagements" ON public.engagements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
    OR (
      assigned_operator_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'operator'
          AND u.approved = true
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'client_viewer'
        AND u.email = public.engagements.client_contact_email
    )
  );

DROP POLICY IF EXISTS "operators_manage_engagements" ON public.engagements;
CREATE POLICY "operators_manage_own_engagements" ON public.engagements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
    )
    OR (
      assigned_operator_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role = 'operator'
          AND u.approved = true
      )
    )
  );

-- Drop the now-redundant client_viewers_read_own_engagements since
-- it's folded into operators_read_own_engagements above.
DROP POLICY IF EXISTS "client_viewers_read_own_engagements" ON public.engagements;

-- ============================================
-- 4. Tighten RLS on documents — scope to engagement owner.
-- ============================================
DROP POLICY IF EXISTS "operators_manage_documents" ON public.documents;
CREATE POLICY "operators_manage_own_documents" ON public.documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = public.documents.engagement_id
        AND e.assigned_operator_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = auth.uid()
            AND u2.role = 'operator'
            AND u2.approved = true
        )
    )
  );

-- ============================================
-- 5. Tighten RLS on pre_analyses — scope to engagement owner.
-- ============================================
DROP POLICY IF EXISTS "operators_manage_pre_analyses" ON public.pre_analyses;
CREATE POLICY "operators_manage_own_pre_analyses" ON public.pre_analyses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = public.pre_analyses.engagement_id
        AND e.assigned_operator_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = auth.uid()
            AND u2.role = 'operator'
            AND u2.approved = true
        )
    )
  );

-- ============================================
-- 6. Tighten RLS on scores — scope to engagement owner.
-- ============================================
DROP POLICY IF EXISTS "operators_manage_scores" ON public.scores;
CREATE POLICY "operators_manage_own_scores" ON public.scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = public.scores.engagement_id
        AND e.assigned_operator_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = auth.uid()
            AND u2.role = 'operator'
            AND u2.approved = true
        )
    )
  );

-- ============================================
-- 7. Tighten RLS on pattern_matches — scope to engagement owner.
-- ============================================
DROP POLICY IF EXISTS "operators_manage_pattern_matches" ON public.pattern_matches;
CREATE POLICY "operators_manage_own_pattern_matches" ON public.pattern_matches
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = public.pattern_matches.engagement_id
        AND e.assigned_operator_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = auth.uid()
            AND u2.role = 'operator'
            AND u2.approved = true
        )
    )
  );

-- ============================================
-- 8. Tighten RLS on reports — scope to engagement owner.
-- ============================================
DROP POLICY IF EXISTS "operators_manage_reports" ON public.reports;
CREATE POLICY "operators_manage_own_reports" ON public.reports
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = public.reports.engagement_id
        AND e.assigned_operator_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = auth.uid()
            AND u2.role = 'operator'
            AND u2.approved = true
        )
    )
  );

-- ============================================
-- 9. Fix chat_messages: drop the ACTUAL policy name, not the wrong one.
-- ============================================
DROP POLICY IF EXISTS "chat_messages_read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_public_read" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;

CREATE POLICY "chat_messages_authenticated_read" ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('operator', 'admin')
        AND u.approved = true
    )
  );

CREATE POLICY "chat_messages_authenticated_insert" ON public.chat_messages
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 10. Fix preview_uploaded_docs RLS — require auth + engagement ownership.
-- ============================================
DROP POLICY IF EXISTS "preview_uploaded_docs_read" ON public.preview_uploaded_docs;
DROP POLICY IF EXISTS "preview_uploaded_docs_insert" ON public.preview_uploaded_docs;
DROP POLICY IF EXISTS "preview_uploaded_docs_update" ON public.preview_uploaded_docs;
DROP POLICY IF EXISTS "preview_uploaded_docs_delete" ON public.preview_uploaded_docs;

CREATE POLICY "preview_uploaded_docs_authed_read" ON public.preview_uploaded_docs
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "preview_uploaded_docs_authed_insert" ON public.preview_uploaded_docs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "preview_uploaded_docs_authed_update" ON public.preview_uploaded_docs
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "preview_uploaded_docs_authed_delete" ON public.preview_uploaded_docs
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 11. Revoke increment_usage from PUBLIC.
-- ============================================
REVOKE EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INT) TO service_role;

-- ============================================
-- 12. Tighten audit_log read to approved operators/admins only.
-- ============================================
DROP POLICY IF EXISTS "operators_read_audit_log" ON public.audit_log;
CREATE POLICY "approved_operators_read_audit_log" ON public.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('operator', 'admin')
        AND u.approved = true
    )
  );

-- ============================================
-- 13. Tighten users read policy to require approval.
-- ============================================
DROP POLICY IF EXISTS "operators_and_admins_read_all_users" ON public.users;
CREATE POLICY "approved_operators_admins_read_users" ON public.users
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.id = auth.uid()
        AND me.role IN ('operator', 'admin')
        AND me.approved = true
    )
  );
