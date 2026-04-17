-- Migration: Create document_requirements lookup table

CREATE TABLE public.document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL UNIQUE CHECK (category IN (
    'deck', 'architecture', 'security', 'model_ai', 'data_privacy',
    'customer_contracts', 'vendor_list', 'financial', 'incident_log',
    'team_bios', 'demo'
  )),
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  weight NUMERIC(3, 2) NOT NULL DEFAULT 1.0,
  limits_when_missing TEXT NOT NULL
);
