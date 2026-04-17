-- Migration: Create engagements table

CREATE TABLE public.engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_firm_name TEXT NOT NULL,
  target_company_name TEXT NOT NULL,
  deal_stage TEXT NOT NULL CHECK (deal_stage IN ('preliminary', 'loi', 'confirmatory', 'post_close')),
  status TEXT NOT NULL CHECK (status IN ('intake', 'analysis', 'scoring', 'review', 'delivered')) DEFAULT 'intake',
  tier TEXT NOT NULL CHECK (tier IN ('signal_scan', 'standard', 'deep', 'retained')) DEFAULT 'standard',
  assigned_operator_id UUID REFERENCES public.users(id),
  client_contact_email TEXT,
  nda_signed_at TIMESTAMPTZ,
  engagement_fee NUMERIC(10, 2),
  delivery_deadline TIMESTAMPTZ,
  referral_source TEXT CHECK (referral_source IN ('direct', 'referral', 'signal_hunter', 'platform', 'content')),
  outcome TEXT CHECK (outcome IN ('proceeded', 'passed', 'renegotiated', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_engagements_status ON public.engagements(status);
CREATE INDEX idx_engagements_operator ON public.engagements(assigned_operator_id);
CREATE INDEX idx_engagements_client_firm ON public.engagements(client_firm_name);
CREATE INDEX idx_engagements_target ON public.engagements(target_company_name);

ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER engagements_updated_at
  BEFORE UPDATE ON public.engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
