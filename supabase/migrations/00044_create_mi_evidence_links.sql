-- Migration 00044: Market Intelligence — evidence-to-assumption links.
--
-- Many-to-many: one evidence item can support/weaken/contradict multiple
-- assumptions; one assumption can be evidenced by multiple items.
-- The link_type drives the coverage engine's assumption evidence_status.

CREATE TABLE IF NOT EXISTS public.mi_evidence_assumption_links (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id   UUID        NOT NULL
                              REFERENCES public.mi_evidence_items(id) ON DELETE CASCADE,
  assumption_id UUID        NOT NULL
                              REFERENCES public.mi_thesis_assumptions(id) ON DELETE CASCADE,
  link_type     TEXT        NOT NULL
                              CHECK (link_type IN ('supports', 'weakens', 'contradicts')),
  operator_note TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evidence_id, assumption_id)
);

CREATE INDEX IF NOT EXISTS idx_mi_evidence_links_assumption
  ON public.mi_evidence_assumption_links(assumption_id);

CREATE INDEX IF NOT EXISTS idx_mi_evidence_links_evidence
  ON public.mi_evidence_assumption_links(evidence_id);

ALTER TABLE public.mi_evidence_assumption_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_manage_mi_evidence_links" ON public.mi_evidence_assumption_links;
CREATE POLICY "operators_manage_mi_evidence_links"
  ON public.mi_evidence_assumption_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
