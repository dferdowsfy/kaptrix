-- Migration: Create documents table

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID NOT NULL REFERENCES public.engagements(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'deck', 'architecture', 'security', 'model_ai', 'data_privacy',
    'customer_contracts', 'vendor_list', 'financial', 'incident_log',
    'team_bios', 'demo', 'other'
  )),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES public.users(id),
  parsed_text TEXT,
  parse_status TEXT NOT NULL CHECK (parse_status IN ('queued', 'parsing', 'parsed', 'failed')) DEFAULT 'queued',
  parse_error TEXT,
  token_count INTEGER
);

CREATE INDEX idx_documents_engagement ON public.documents(engagement_id);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_parse_status ON public.documents(parse_status);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
