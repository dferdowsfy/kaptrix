-- Migration: Anchor usage billing cycle to signup date (not calendar month)
--
-- Behavior after this migration:
--   * A user's cycle starts on their signup day-of-month (UTC).
--   * Example: signup on the 24th => cycle is 24th..23rd.
--   * Short months clamp the anchor day (e.g. 31st -> Feb 28/29).
--
-- This updates:
--   1) period resolver helper function
--   2) increment_usage() counter writer
--   3) current_month_usage view (kept name for compatibility)

-- ============================================
-- 1) Helper: current usage period start for a user
-- ============================================
CREATE OR REPLACE FUNCTION public.current_usage_period_start(
  p_user_id UUID,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS DATE
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now_date DATE := (p_now AT TIME ZONE 'UTC')::DATE;
  v_signup_at TIMESTAMPTZ;
  v_anchor_day INT;

  v_this_month_first DATE;
  v_prev_month_first DATE;

  v_this_month_max_day INT;
  v_prev_month_max_day INT;

  v_this_anchor DATE;
  v_prev_anchor DATE;
BEGIN
  SELECT u.created_at
    INTO v_signup_at
  FROM public.users u
  WHERE u.id = p_user_id;

  -- Fallback: if user row is unavailable, anchor to current UTC day.
  IF v_signup_at IS NULL THEN
    v_anchor_day := EXTRACT(DAY FROM v_now_date)::INT;
  ELSE
    v_anchor_day := EXTRACT(DAY FROM (v_signup_at AT TIME ZONE 'UTC'))::INT;
  END IF;

  v_this_month_first := date_trunc('month', v_now_date)::DATE;
  v_prev_month_first := (v_this_month_first - INTERVAL '1 month')::DATE;

  v_this_month_max_day := EXTRACT(DAY FROM (v_this_month_first + INTERVAL '1 month - 1 day'))::INT;
  v_prev_month_max_day := EXTRACT(DAY FROM (v_prev_month_first + INTERVAL '1 month - 1 day'))::INT;

  v_this_anchor := make_date(
    EXTRACT(YEAR FROM v_this_month_first)::INT,
    EXTRACT(MONTH FROM v_this_month_first)::INT,
    LEAST(v_anchor_day, v_this_month_max_day)
  );

  v_prev_anchor := make_date(
    EXTRACT(YEAR FROM v_prev_month_first)::INT,
    EXTRACT(MONTH FROM v_prev_month_first)::INT,
    LEAST(v_anchor_day, v_prev_month_max_day)
  );

  IF v_now_date >= v_this_anchor THEN
    RETURN v_this_anchor;
  END IF;

  RETURN v_prev_anchor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_usage_period_start(UUID, TIMESTAMPTZ) TO authenticated, service_role;

-- ============================================
-- 2) Update increment_usage() to use signup-anchored periods
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_kind TEXT,    -- 'reports' | 'ai_queries'
  p_delta INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period DATE := public.current_usage_period_start(p_user_id, now());
  v_new_total INT;
BEGIN
  IF p_kind NOT IN ('reports', 'ai_queries') THEN
    RAISE EXCEPTION 'invalid usage kind: %', p_kind;
  END IF;

  INSERT INTO public.usage_counters (user_id, period_start, reports_generated, ai_queries, updated_at)
  VALUES (
    p_user_id,
    v_period,
    CASE WHEN p_kind = 'reports' THEN p_delta ELSE 0 END,
    CASE WHEN p_kind = 'ai_queries' THEN p_delta ELSE 0 END,
    now()
  )
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET reports_generated = public.usage_counters.reports_generated
          + CASE WHEN p_kind = 'reports' THEN p_delta ELSE 0 END,
        ai_queries = public.usage_counters.ai_queries
          + CASE WHEN p_kind = 'ai_queries' THEN p_delta ELSE 0 END,
        updated_at = now()
  RETURNING CASE WHEN p_kind = 'reports' THEN reports_generated ELSE ai_queries END
    INTO v_new_total;

  RETURN v_new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INT) TO service_role;

-- ============================================
-- 3) Keep existing view name, but make it signup-anchored
-- ============================================
CREATE OR REPLACE VIEW public.current_month_usage AS
SELECT
  uc.user_id,
  uc.period_start,
  uc.reports_generated,
  uc.ai_queries,
  uc.updated_at
FROM public.usage_counters uc
WHERE uc.user_id = auth.uid()
  AND uc.period_start = public.current_usage_period_start(auth.uid(), now());
