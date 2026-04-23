-- Migration 00042: Market Intelligence — thesis load-bearing assumptions.
--
-- The LLM extracts explicit assumptions from the submitted thesis + answered
-- intake. Each assumption is independently evidenced and tracked. The
-- evidence_status column drives the coverage engine in migration 00044.

CREATE TABLE IF NOT EXISTS public.mi_thesis_assumptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id       UUID        NOT NULL
                                    REFERENCES public.engagements(id) ON DELETE CASCADE,
  assumption_text     TEXT        NOT NULL,
  assumption_category TEXT        NOT NULL DEFAULT 'general',
  -- Operator-facing status updated by the coverage engine or manually.
  evidence_status     TEXT        NOT NULL DEFAULT 'unverified'
                                    CHECK (evidence_status IN (
                                      'unverified', 'supported', 'weakened', 'contradicted'
                                    )),
  -- load_bearing_score [0,1]: how central this assumption is to the thesis.
  load_bearing_score  NUMERIC(3,2) CHECK (load_bearing_score BETWEEN 0 AND 1),
  -- What kind of evidence would resolve this assumption.
  evidence_type_needed TEXT,
  ordering            INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_thesis_assumptions_engagement
  ON public.mi_thesis_assumptions(engagement_id);

ALTER TABLE public.mi_thesis_assumptions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS mi_thesis_assumptions_updated_at ON public.mi_thesis_assumptions;
CREATE TRIGGER mi_thesis_assumptions_updated_at
  BEFORE UPDATE ON public.mi_thesis_assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "operators_manage_mi_thesis_assumptions" ON public.mi_thesis_assumptions;
CREATE POLICY "operators_manage_mi_thesis_assumptions"
  ON public.mi_thesis_assumptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
