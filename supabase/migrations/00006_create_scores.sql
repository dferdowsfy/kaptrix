-- Migration: Create scores table

CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN (
    'product_credibility', 'tooling_exposure', 'data_sensitivity',
    'governance_safety', 'production_readiness', 'open_validation'
  )),
  sub_criterion TEXT NOT NULL,
  score_0_to_5 NUMERIC(2, 1) NOT NULL CHECK (score_0_to_5 >= 0 AND score_0_to_5 <= 5),
  weight NUMERIC(4, 3) NOT NULL DEFAULT 1.0,
  operator_rationale TEXT NOT NULL CHECK (length(operator_rationale) >= 20),
  evidence_citations JSONB DEFAULT '[]',
  pattern_match_case_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id),

  UNIQUE(engagement_id, dimension, sub_criterion)
);

CREATE INDEX idx_scores_engagement ON public.scores(engagement_id);
CREATE INDEX idx_scores_dimension ON public.scores(dimension);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER scores_updated_at
  BEFORE UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
