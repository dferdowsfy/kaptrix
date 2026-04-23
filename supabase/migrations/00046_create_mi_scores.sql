-- Migration 00046: Market Intelligence — category-level scores.
--
-- NOT the company-level `scores` table. MI dimensions are entirely different:
-- thesis durability, category attractiveness, competitive defensibility,
-- timing confidence, threat concentration, evidence strength, signal/noise.
--
-- Rubric config lives in mi_scoring_rubric_config (migration 00049).

CREATE TABLE IF NOT EXISTS public.mi_scores (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id        UUID          NOT NULL
                                       REFERENCES public.engagements(id) ON DELETE CASCADE,
  dimension            TEXT          NOT NULL
                                       CHECK (dimension IN (
                                         'thesis_durability',
                                         'category_attractiveness',
                                         'competitive_defensibility',
                                         'timing_confidence',
                                         'threat_concentration',
                                         'evidence_strength',
                                         'signal_noise_ratio'
                                       )),
  score_0_to_5         NUMERIC(3,1)  NOT NULL
                                       CHECK (score_0_to_5 BETWEEN 0 AND 5),
  llm_justification    TEXT,
  -- Has the operator overridden the LLM score?
  operator_override    BOOLEAN       NOT NULL DEFAULT false,
  operator_rationale   TEXT,         -- Required when operator_override is true.
  generated_by_model   TEXT,
  generated_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, dimension)
);

CREATE INDEX IF NOT EXISTS idx_mi_scores_engagement
  ON public.mi_scores(engagement_id);

ALTER TABLE public.mi_scores ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS mi_scores_updated_at ON public.mi_scores;
CREATE TRIGGER mi_scores_updated_at
  BEFORE UPDATE ON public.mi_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "operators_manage_mi_scores" ON public.mi_scores;
CREATE POLICY "operators_manage_mi_scores"
  ON public.mi_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
