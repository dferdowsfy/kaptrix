-- Migration: Create audit_log table (append-only)

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id),
  engagement_id UUID REFERENCES public.engagements(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only: revoke UPDATE and DELETE
REVOKE UPDATE, DELETE ON public.audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE ON public.audit_log FROM authenticated;

CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_engagement ON public.audit_log(engagement_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
