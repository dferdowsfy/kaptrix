-- Migration 00045: Market Intelligence — insights.
--
-- Seven distinct insight types, each LLM-generated from evidence + intake.
-- content JSONB schema varies per insight_type (defined in insight-types.ts).
-- Operators can override content via user_edited_content without losing
-- the original LLM output.

CREATE TABLE IF NOT EXISTS public.mi_insights (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id        UUID        NOT NULL
                                     REFERENCES public.engagements(id) ON DELETE CASCADE,
  insight_type         TEXT        NOT NULL
                                     CHECK (insight_type IN (
                                       'pressure_test',
                                       'structure_map',
                                       'threat_model',
                                       'company_shortlist',
                                       'gap_map',
                                       'adjacent_category',
                                       'timing_read'
                                     )),
  -- LLM-generated structured output (schema per insight_type).
  content              JSONB       NOT NULL DEFAULT '{}'::jsonb,
  -- Verbatim raw LLM response (for debugging / audit).
  raw_llm_output       TEXT,
  generated_by_model   TEXT,
  generated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Operator override: non-null means operator has edited this insight.
  user_edited_at       TIMESTAMPTZ,
  user_edited_content  JSONB,
  UNIQUE (engagement_id, insight_type)
);

CREATE INDEX IF NOT EXISTS idx_mi_insights_engagement
  ON public.mi_insights(engagement_id);

ALTER TABLE public.mi_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_manage_mi_insights" ON public.mi_insights;
CREATE POLICY "operators_manage_mi_insights"
  ON public.mi_insights FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
