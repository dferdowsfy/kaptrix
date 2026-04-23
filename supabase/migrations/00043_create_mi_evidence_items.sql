-- Migration 00043: Market Intelligence — evidence items.
--
-- Category-level evidence is fundamentally different from company-level
-- document uploads. Evidence items are granular claims with a source type,
-- optional URL, excerpt, and optional parsed file content.
--
-- Source types deliberately differ from the DocumentCategory enum in the
-- target pathway — we are NOT reusing that pathway.

CREATE TABLE IF NOT EXISTS public.mi_evidence_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id UUID        NOT NULL
                              REFERENCES public.engagements(id) ON DELETE CASCADE,
  source_type   TEXT        NOT NULL
                              CHECK (source_type IN (
                                'market_report',
                                'funding_data',
                                'regulatory',
                                'customer_signal',
                                'talent_signal',
                                'incumbent_signal',
                                'expert_interview',
                                'other'
                              )),
  source_name   TEXT        NOT NULL,
  source_url    TEXT,
  -- Verbatim excerpt (≤2000 chars). For structured entry mode.
  excerpt       TEXT        CHECK (char_length(excerpt) <= 2000),
  -- Full parsed text for file uploads.
  full_text     TEXT,
  -- Storage path for uploaded file (Supabase Storage bucket: mi-evidence).
  storage_path  TEXT,
  -- How recent is this signal?
  recency_date  DATE,
  confidence    TEXT        NOT NULL DEFAULT 'medium'
                              CHECK (confidence IN ('high', 'medium', 'low')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID        REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_mi_evidence_items_engagement
  ON public.mi_evidence_items(engagement_id);

ALTER TABLE public.mi_evidence_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_manage_mi_evidence_items" ON public.mi_evidence_items;
CREATE POLICY "operators_manage_mi_evidence_items"
  ON public.mi_evidence_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
