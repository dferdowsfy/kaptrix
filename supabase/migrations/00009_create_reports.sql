-- Migration: Create reports table

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  watermark TEXT CHECK (watermark IN ('draft', 'final', 'confidential')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_storage_path TEXT,
  published_to_client_at TIMESTAMPTZ,
  revision_notes TEXT,
  report_data JSONB NOT NULL DEFAULT '{}',

  UNIQUE(engagement_id, version)
);

CREATE INDEX idx_reports_engagement ON public.reports(engagement_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
