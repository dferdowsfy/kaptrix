-- Migration: Row Level Security policies

-- ============================================
-- USERS
-- ============================================
CREATE POLICY "operators_and_admins_read_all_users"
  ON public.users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "users_read_own_profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "admins_manage_users"
  ON public.users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- ENGAGEMENTS
-- ============================================
CREATE POLICY "operators_read_all_engagements"
  ON public.engagements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "client_viewers_read_own_engagements"
  ON public.engagements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'client_viewer'
        AND u.email = public.engagements.client_contact_email
    )
  );

CREATE POLICY "operators_manage_engagements"
  ON public.engagements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE POLICY "operators_manage_documents"
  ON public.documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- Client viewers cannot see documents directly

-- ============================================
-- PRE_ANALYSES (operator-only, never client-visible)
-- ============================================
CREATE POLICY "operators_manage_pre_analyses"
  ON public.pre_analyses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- ============================================
-- SCORES (operator-only)
-- ============================================
CREATE POLICY "operators_manage_scores"
  ON public.scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- ============================================
-- BENCHMARK_CASES
-- ============================================
CREATE POLICY "operators_read_benchmarks"
  ON public.benchmark_cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "admins_manage_benchmarks"
  ON public.benchmark_cases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ============================================
-- PATTERN_MATCHES
-- ============================================
CREATE POLICY "operators_manage_pattern_matches"
  ON public.pattern_matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

-- ============================================
-- REPORTS
-- ============================================
CREATE POLICY "operators_manage_reports"
  ON public.reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "client_viewers_read_published_reports"
  ON public.reports FOR SELECT
  USING (
    published_to_client_at IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.engagements e
      JOIN public.users u ON u.email = e.client_contact_email
      WHERE e.id = public.reports.engagement_id
        AND u.id = auth.uid()
        AND u.role = 'client_viewer'
    )
  );

-- ============================================
-- AUDIT_LOG
-- ============================================
CREATE POLICY "operators_read_audit_log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "all_authenticated_insert_audit_log"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- PROMPT_VERSIONS
-- ============================================
CREATE POLICY "operators_read_prompt_versions"
  ON public.prompt_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

CREATE POLICY "admins_manage_prompt_versions"
  ON public.prompt_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
