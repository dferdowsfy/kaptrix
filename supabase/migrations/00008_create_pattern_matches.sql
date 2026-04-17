-- Migration: Create pattern_matches table

CREATE TABLE public.pattern_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  case_anchor_id TEXT NOT NULL REFERENCES public.benchmark_cases(case_anchor_id),
  similarity_score NUMERIC(4, 3),
  similarity_reason TEXT NOT NULL,
  operator_confirmed BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pattern_matches_engagement ON public.pattern_matches(engagement_id);
CREATE INDEX idx_pattern_matches_case ON public.pattern_matches(case_anchor_id);

ALTER TABLE public.pattern_matches ENABLE ROW LEVEL SECURITY;
