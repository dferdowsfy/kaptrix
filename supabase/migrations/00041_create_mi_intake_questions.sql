-- Migration 00041: Market Intelligence — dynamic intake question set per engagement.
--
-- One row per category engagement. The `questions` JSONB array is LLM-generated
-- on first request and is fully user-editable before confirmation.
--
-- Status lifecycle:  draft → confirmed
-- Confirmed intake locks answers. Re-generation resets to draft.

CREATE TABLE IF NOT EXISTS public.mi_intake_questions (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id      UUID        NOT NULL UNIQUE
                                   REFERENCES public.engagements(id) ON DELETE CASCADE,
  questions          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Each element: { id, category, question, answer, is_editable, guidance_note }
  generated_by_model TEXT,
  generated_at       TIMESTAMPTZ,
  confirmed_at       TIMESTAMPTZ,
  status             TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'confirmed')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mi_intake_questions ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS mi_intake_questions_updated_at ON public.mi_intake_questions;
CREATE TRIGGER mi_intake_questions_updated_at
  BEFORE UPDATE ON public.mi_intake_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "operators_manage_mi_intake_questions" ON public.mi_intake_questions;
CREATE POLICY "operators_manage_mi_intake_questions"
  ON public.mi_intake_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "client_viewers_read_mi_intake_questions" ON public.mi_intake_questions;
CREATE POLICY "client_viewers_read_mi_intake_questions"
  ON public.mi_intake_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.engagements e
      WHERE e.id = engagement_id
        AND e.client_contact_email = (
          SELECT email FROM public.users WHERE id = auth.uid()
        )
    )
  );
