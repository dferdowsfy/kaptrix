-- Migration 00048: Market Intelligence — Category Diligence Memo reports.
--
-- Separate from the company-level `reports` table. MI reports follow a
-- different 9-section structure (executive_summary, thesis_pressure_test,
-- category_structure, evidence_coverage, scoring_rubric,
-- positioning_recommendations, company_shortlist, risks_and_reversals, appendix).
--
-- section_status tracks per-section generation state for the UI progress bar.

CREATE TABLE IF NOT EXISTS public.mi_reports (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id     UUID        NOT NULL
                                  REFERENCES public.engagements(id) ON DELETE CASCADE,
  version           INTEGER     NOT NULL DEFAULT 1,
  content_markdown  TEXT,
  -- JSONB map: { section_id → 'pending' | 'generating' | 'done' | 'error' }
  section_status    JSONB       NOT NULL DEFAULT '{}'::jsonb,
  tier_depth        TEXT,
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, version)
);

CREATE INDEX IF NOT EXISTS idx_mi_reports_engagement
  ON public.mi_reports(engagement_id);

ALTER TABLE public.mi_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_manage_mi_reports" ON public.mi_reports;
CREATE POLICY "operators_manage_mi_reports"
  ON public.mi_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "client_viewers_read_mi_reports" ON public.mi_reports;
CREATE POLICY "client_viewers_read_mi_reports"
  ON public.mi_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = engagement_id
        AND e.client_contact_email = (
          SELECT email FROM public.users WHERE id = auth.uid()
        )
    )
  );
