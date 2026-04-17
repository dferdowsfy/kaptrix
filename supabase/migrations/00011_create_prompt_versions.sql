-- Migration: Create prompt_versions table for prompt versioning

CREATE TABLE public.prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_key TEXT NOT NULL,
  version TEXT NOT NULL,
  model TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,

  UNIQUE(prompt_key, version)
);

CREATE INDEX idx_prompt_versions_key ON public.prompt_versions(prompt_key);
CREATE INDEX idx_prompt_versions_active ON public.prompt_versions(is_active);

ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;
