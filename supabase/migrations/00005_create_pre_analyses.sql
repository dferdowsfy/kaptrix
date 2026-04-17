-- Migration: Create pre_analyses table

CREATE TABLE public.pre_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('per_document', 'synthesis')) DEFAULT 'per_document',
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  model_used TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  raw_output JSONB NOT NULL DEFAULT '{}',
  extracted_claims JSONB DEFAULT '[]',
  red_flags JSONB DEFAULT '[]',
  regulatory_signals JSONB DEFAULT '[]',
  inconsistencies_json JSONB DEFAULT '[]',
  vendor_dependencies JSONB DEFAULT '[]',
  model_dependencies JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  input_token_count INTEGER,
  output_token_count INTEGER,
  cost_usd NUMERIC(8, 4),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  error_message TEXT
);

CREATE INDEX idx_pre_analyses_engagement ON public.pre_analyses(engagement_id);
CREATE INDEX idx_pre_analyses_document ON public.pre_analyses(document_id);
CREATE INDEX idx_pre_analyses_status ON public.pre_analyses(status);

ALTER TABLE public.pre_analyses ENABLE ROW LEVEL SECURITY;
