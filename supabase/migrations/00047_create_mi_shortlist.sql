-- Migration 00047: Market Intelligence — company shortlist.
--
-- Named companies surfaced by the insights stage as worth further diligence.
-- These are NOT scored (scoring happens in the Client pathway after promotion).
-- The promoted_to_engagement_id FK is set when the operator promotes a
-- shortlisted company into a full target-mode diligence engagement.

CREATE TABLE IF NOT EXISTS public.mi_shortlist_companies (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id               UUID        NOT NULL
                                            REFERENCES public.engagements(id) ON DELETE CASCADE,
  company_name                TEXT        NOT NULL,
  rationale                   TEXT,
  signal_summary              TEXT,
  source_urls                 JSONB       NOT NULL DEFAULT '[]'::jsonb,
  website_url                 TEXT,
  -- Set after operator promotes this company to a target diligence engagement.
  promoted_to_engagement_id   UUID        REFERENCES public.engagements(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                  UUID        REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mi_shortlist_engagement
  ON public.mi_shortlist_companies(engagement_id);

ALTER TABLE public.mi_shortlist_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_manage_mi_shortlist" ON public.mi_shortlist_companies;
CREATE POLICY "operators_manage_mi_shortlist"
  ON public.mi_shortlist_companies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
