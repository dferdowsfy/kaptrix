-- Migration: Security hardening (additive, non-breaking).
--
-- Adds integrity/sensitivity/retention metadata to documents and
-- engagements, extends audit_log for inference/access events, and
-- tightens RLS for the chat_messages preview table.
--
-- Nothing in this migration removes existing columns or policies.
-- Backfill-safe: all new columns are nullable with sane defaults.
--
-- Each section is guarded with an "IF table exists" check so this
-- migration can be applied to partially-migrated environments
-- without failing. If a base table is missing, its section is skipped
-- and you should run the earlier migrations (00001–00019) first.

-- ============================================
-- DOCUMENTS
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.documents') IS NOT NULL THEN
    ALTER TABLE public.documents
      ADD COLUMN IF NOT EXISTS checksum_sha256 text,
      ADD COLUMN IF NOT EXISTS sensitivity_level text
        NOT NULL DEFAULT 'internal'
        CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted')),
      ADD COLUMN IF NOT EXISTS restricted_access boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS external_inference_allowed boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS retention_category text
        NOT NULL DEFAULT 'standard'
        CHECK (retention_category IN ('standard', 'extended', 'short', 'legal_hold')),
      ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz,
      ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

    CREATE INDEX IF NOT EXISTS documents_checksum_idx
      ON public.documents (engagement_id, checksum_sha256);
    CREATE INDEX IF NOT EXISTS documents_deleted_at_idx
      ON public.documents (deleted_at);
  END IF;
END $$;

-- ============================================
-- ENGAGEMENTS
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.engagements') IS NOT NULL THEN
    ALTER TABLE public.engagements
      ADD COLUMN IF NOT EXISTS sensitivity_level text
        NOT NULL DEFAULT 'confidential'
        CHECK (sensitivity_level IN ('public', 'internal', 'confidential', 'restricted')),
      ADD COLUMN IF NOT EXISTS external_inference_allowed boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz;
  END IF;
END $$;

-- ============================================
-- AUDIT_LOG
-- Add structured columns for LLM / access events without breaking
-- existing inserts that only populate the original column set.
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.audit_log') IS NOT NULL THEN
    ALTER TABLE public.audit_log
      ADD COLUMN IF NOT EXISTS provider text,
      ADD COLUMN IF NOT EXISTS model text,
      ADD COLUMN IF NOT EXISTS result text;

    CREATE INDEX IF NOT EXISTS audit_log_engagement_idx
      ON public.audit_log (engagement_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS audit_log_action_idx
      ON public.audit_log (action, timestamp DESC);
  END IF;
END $$;

-- ============================================
-- CHAT_MESSAGES — tighten RLS.
-- The preview chatbot writes with the service role (bypasses RLS),
-- so the anon role does not need SELECT here. Dropping the wide-open
-- read policy prevents session_id enumeration.
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.chat_messages') IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_public_read'
  ) THEN
    EXECUTE 'DROP POLICY chat_messages_public_read ON public.chat_messages';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_messages'
      AND policyname = 'chat_messages_operator_read'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY chat_messages_operator_read
        ON public.chat_messages FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
          )
        )
    $policy$;
  END IF;
END $$;

-- ============================================
-- PRE_ANALYSES / SCORES — add last_accessed_at for access auditing.
-- ============================================
DO $$
BEGIN
  IF to_regclass('public.pre_analyses') IS NOT NULL THEN
    ALTER TABLE public.pre_analyses
      ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;
  END IF;
  IF to_regclass('public.scores') IS NOT NULL THEN
    ALTER TABLE public.scores
      ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz;
  END IF;
END $$;
