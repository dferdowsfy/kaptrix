-- Migration 00052: Per-section intake responses + knowledge-base chunks.
--
-- Phase 1 of the Commercial Pain Validation rollout. Introduces two new
-- tables that future intake sections will share:
--
--   intake_responses
--     One row per (engagement, section, user). Carries both the
--     structured answers (single/multi/scale fields) as JSONB and the
--     free-form text fields as JSONB so a single upsert captures the
--     whole section. `source_type` distinguishes self-reported intake
--     claims from later ingestion paths (artifact extraction, expert
--     interview, etc).
--
--   kb_chunks
--     A first-class knowledge-base store. Phase 1 only ingests intake
--     free-form text; later phases will ingest artifact text. Every row
--     carries a JSONB `metadata` blob whose shape is owned by the
--     producer. For intake-sourced rows the contract is:
--       {
--         "source_type": "intake",
--         "section": "<section_key>",
--         "evidence_status": "intake_claim",
--         "requires_artifact_support": true,
--         "field_key": "<field id>",
--         "field_label": "<human label>"
--       }
--
-- engagement_id is TEXT (not a UUID FK) to stay compatible with the
-- existing user_workspace_state contract, which uses synthetic ids
-- (e.g. "preview-demo-001") alongside real engagements.uuid::text. RLS
-- still scopes reads/writes to the row owner.

CREATE TABLE IF NOT EXISTS public.intake_responses (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id       TEXT        NOT NULL,
  company_id          TEXT,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key         TEXT        NOT NULL,
  source_type         TEXT        NOT NULL DEFAULT 'intake'
                                    CHECK (source_type IN ('intake', 'artifact', 'expert_interview', 'system')),
  structured_answers  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  raw_text            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (engagement_id, section_key, user_id)
);

CREATE INDEX IF NOT EXISTS intake_responses_engagement_idx
  ON public.intake_responses (engagement_id, section_key);
CREATE INDEX IF NOT EXISTS intake_responses_user_idx
  ON public.intake_responses (user_id, updated_at DESC);

ALTER TABLE public.intake_responses ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS intake_responses_updated_at ON public.intake_responses;
CREATE TRIGGER intake_responses_updated_at
  BEFORE UPDATE ON public.intake_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "users_manage_own_intake_responses" ON public.intake_responses;
CREATE POLICY "users_manage_own_intake_responses"
  ON public.intake_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Operators / admins can read every row for engagements they manage.
DROP POLICY IF EXISTS "operators_read_intake_responses" ON public.intake_responses;
CREATE POLICY "operators_read_intake_responses"
  ON public.intake_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );


CREATE TABLE IF NOT EXISTS public.kb_chunks (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id       TEXT        NOT NULL,
  company_id          TEXT,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type         TEXT        NOT NULL DEFAULT 'intake'
                                    CHECK (source_type IN ('intake', 'artifact', 'expert_interview', 'system')),
  section             TEXT,
  field_key           TEXT,
  intake_response_id  UUID        REFERENCES public.intake_responses(id) ON DELETE CASCADE,
  content             TEXT        NOT NULL,
  metadata            JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One chunk per (engagement, section, field, user) — re-saving the
  -- intake updates the chunk in place rather than appending duplicates.
  UNIQUE (engagement_id, section, field_key, user_id)
);

CREATE INDEX IF NOT EXISTS kb_chunks_engagement_idx
  ON public.kb_chunks (engagement_id, section);
CREATE INDEX IF NOT EXISTS kb_chunks_response_idx
  ON public.kb_chunks (intake_response_id);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS kb_chunks_updated_at ON public.kb_chunks;
CREATE TRIGGER kb_chunks_updated_at
  BEFORE UPDATE ON public.kb_chunks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP POLICY IF EXISTS "users_manage_own_kb_chunks" ON public.kb_chunks;
CREATE POLICY "users_manage_own_kb_chunks"
  ON public.kb_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "operators_read_kb_chunks" ON public.kb_chunks;
CREATE POLICY "operators_read_kb_chunks"
  ON public.kb_chunks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );
