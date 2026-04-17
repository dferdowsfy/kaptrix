-- Migration: Create benchmark_cases table
-- NOTE: This must run BEFORE 00006 scores migration due to FK reference.
-- Renumber if needed, or use deferred constraints. For now, we create it here
-- and the scores FK will reference it.

CREATE TABLE public.benchmark_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_anchor_id TEXT NOT NULL UNIQUE,
  vertical TEXT NOT NULL,
  deal_size_band TEXT NOT NULL CHECK (deal_size_band IN ('under_25m', '25m_100m', '100m_500m', 'over_500m')),
  ai_architecture_type TEXT NOT NULL CHECK (ai_architecture_type IN (
    'rag_heavy', 'fine_tuned', 'agentic', 'workflow_plus_ai',
    'multi_model', 'single_model_api', 'on_premise', 'hybrid', 'other'
  )),
  composite_score NUMERIC(3, 1),
  dimension_scores_json JSONB NOT NULL DEFAULT '{}',
  war_story_summary TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_benchmark_cases_anchor ON public.benchmark_cases(case_anchor_id);
CREATE INDEX idx_benchmark_cases_vertical ON public.benchmark_cases(vertical);
CREATE INDEX idx_benchmark_cases_deal_size ON public.benchmark_cases(deal_size_band);
CREATE INDEX idx_benchmark_cases_arch ON public.benchmark_cases(ai_architecture_type);

ALTER TABLE public.benchmark_cases ENABLE ROW LEVEL SECURITY;
