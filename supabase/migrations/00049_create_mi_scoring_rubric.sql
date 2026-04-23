-- Migration 00049: Market Intelligence — scoring rubric config.
--
-- The rubric lives in the DB so it can be tuned without code deploys.
-- Seeded with 7 MI dimensions on first migration. The sub_criteria JSONB
-- array carries per-sub-criterion weights and descriptions that the
-- scoring LLM prompt consumes at runtime.
--
-- weight column: must sum to 1.0 across all 7 rows (enforced by application
-- logic, not DB — altering weights is an operator action).

CREATE TABLE IF NOT EXISTS public.mi_scoring_rubric_config (
  dimension   TEXT        PRIMARY KEY,
  label       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  -- Array of { id, label, description, weight }
  sub_criteria JSONB      NOT NULL DEFAULT '[]'::jsonb,
  weight       NUMERIC(5,4) NOT NULL DEFAULT 0.1429,
  ordering     INTEGER    NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mi_scoring_rubric_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "operators_read_mi_rubric" ON public.mi_scoring_rubric_config;
CREATE POLICY "operators_read_mi_rubric"
  ON public.mi_scoring_rubric_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('operator', 'admin')
    )
  );

DROP POLICY IF EXISTS "admins_manage_mi_rubric" ON public.mi_scoring_rubric_config;
CREATE POLICY "admins_manage_mi_rubric"
  ON public.mi_scoring_rubric_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- Seed the 7 MI dimensions (idempotent).
INSERT INTO public.mi_scoring_rubric_config
  (dimension, label, description, sub_criteria, weight, ordering)
VALUES
  (
    'thesis_durability',
    'Thesis Durability',
    'How robust is the investment thesis to plausible shocks over the stated time horizon? Does it survive model commoditization, regulatory headwinds, or incumbent entrenchment?',
    '[
      {"id":"shock_resistance","label":"Shock Resistance","description":"Does the thesis hold under 3 plausible negative shocks (model commoditization, regulatory reversal, macro)?","weight":0.4},
      {"id":"time_horizon_alignment","label":"Time Horizon Alignment","description":"Is the thesis scoped to a realistic adoption timeline given current market signals?","weight":0.35},
      {"id":"assumption_quality","label":"Assumption Quality","description":"Are the load-bearing assumptions evidenced or asserted? How many are unverified?","weight":0.25}
    ]'::jsonb,
    0.1429, 1
  ),
  (
    'category_attractiveness',
    'Category Attractiveness',
    'TAM realism, growth credibility, margin structure, and whether the category is expanding or contracting.',
    '[
      {"id":"tam_realism","label":"TAM Realism","description":"Is the addressable market estimate grounded in bottom-up evidence or top-down projection?","weight":0.35},
      {"id":"growth_credibility","label":"Growth Credibility","description":"Is category growth backed by leading indicators (pipeline, buyer interviews, RFP trends)?","weight":0.35},
      {"id":"margin_structure","label":"Margin Structure","description":"Do unit economics favor standalone winners or commodity infrastructure?","weight":0.30}
    ]'::jsonb,
    0.1429, 2
  ),
  (
    'competitive_defensibility',
    'Competitive Defensibility',
    'Is there room for standalone winners in this category, or will this become a features race? What are the durable moats?',
    '[
      {"id":"moat_evidence","label":"Moat Evidence","description":"Are there network effects, data advantages, or switching costs documented for category leaders?","weight":0.4},
      {"id":"features_vs_products","label":"Features vs. Products","description":"How many major incumbents are shipping native equivalents? Is this a features-not-companies category?","weight":0.35},
      {"id":"winner_take_most","label":"Winner-Take-Most Dynamics","description":"Evidence of concentration or fragmentation in early-adopter segments.","weight":0.25}
    ]'::jsonb,
    0.1429, 3
  ),
  (
    'timing_confidence',
    'Timing Confidence',
    'Is the ''why now'' evidenced or asserted? Where in the hype/adoption cycle does this category sit relative to the time horizon?',
    '[
      {"id":"why_now_evidence","label":"Why Now Evidence","description":"Are the timing triggers (regulatory change, model capability unlock, buyer budget shift) documented?","weight":0.45},
      {"id":"adoption_cycle","label":"Adoption Cycle Position","description":"Is the category pre-peak hype, in trough of disillusionment, or on the slope of enlightenment?","weight":0.35},
      {"id":"velocity","label":"Signal Velocity","description":"Are leading indicators (funding pace, headcount growth, partnership announcements) accelerating or decelerating?","weight":0.20}
    ]'::jsonb,
    0.1429, 4
  ),
  (
    'threat_concentration',
    'Threat Concentration',
    'How exposed is the category to foundation model provider moves, incumbent SaaS response, or commoditization vectors?',
    '[
      {"id":"fm_provider_risk","label":"Foundation Model Provider Risk","description":"How much of the category value could be captured natively by OpenAI, Anthropic, Google, or Meta?","weight":0.4},
      {"id":"incumbent_response","label":"Incumbent SaaS Response","description":"What is the realistic timeline and budget for established SaaS vendors to ship native equivalents?","weight":0.35},
      {"id":"commoditization_vector","label":"Commoditization Vector","description":"Which part of the value chain is most exposed to open-source or commodity infrastructure?","weight":0.25}
    ]'::jsonb,
    0.1429, 5
  ),
  (
    'evidence_strength',
    'Evidence Strength',
    'How much of the thesis rests on evidenced vs. asserted claims? Coverage across source types and recency.',
    '[
      {"id":"assumption_coverage","label":"Assumption Coverage","description":"What fraction of load-bearing assumptions have at least one supporting evidence item?","weight":0.4},
      {"id":"source_diversity","label":"Source Diversity","description":"Evidence spans multiple source types (market reports, funding data, customer signals, regulatory, expert interviews).","weight":0.35},
      {"id":"recency","label":"Recency","description":"Is the evidence current (within 12 months) or dated?","weight":0.25}
    ]'::jsonb,
    0.1429, 6
  ),
  (
    'signal_noise_ratio',
    'Signal-to-Noise Ratio',
    'Quality of available data vs. hype. Can the operator distinguish structural signals from media/VC hype cycles?',
    '[
      {"id":"primary_vs_secondary","label":"Primary vs. Secondary Signal","description":"Ratio of primary signals (buyer interviews, RFP data, direct expert access) to secondary (press, analyst reports).","weight":0.4},
      {"id":"hype_discount","label":"Hype Discount","description":"Evidence of operator ability to distinguish hype from durable demand (e.g., customer churn data, pilot-to-production conversion).","weight":0.35},
      {"id":"contradiction_rate","label":"Contradiction Rate","description":"Fraction of evidence items that weaken or contradict stated assumptions.","weight":0.25}
    ]'::jsonb,
    0.1429, 7
  )
ON CONFLICT (dimension) DO NOTHING;
