-- ============================================================
--  Group G: Case Domain — 052
--  case_quality_scores テーブル（FD-001確定版）
--  CRITICAL: FD-001配点に基づくカラム構成
--    duration_score     max 30
--    coverage_score     max 30
--    completeness_score max 15
--    outcome_score      max 15
--    consent_score      max 10
--  CRITICAL: disease_tag_multiplier は存在しない（RD-005廃止）
--  CRITICAL: experiment_quality_score は存在しない（FD-001廃止）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_quality_scores (
  case_id             text    PRIMARY KEY REFERENCES public.cases(id),

  total_score         numeric(5,2) NOT NULL,

  -- Component Scores (FD-001確定版)
  duration_score      numeric(5,2),  -- max 30: days_recorded による
  coverage_score      numeric(5,2),  -- max 30: coverage_rate による
  completeness_score  numeric(5,2),  -- max 15: avg_field_fill_rate による
  outcome_score       numeric(5,2),  -- max 15: Outcome件数・品質による
  consent_score       numeric(5,2),  -- max 10: consent_level による

  -- 計算根拠（再計算・監査用）
  total_record_days     integer,
  coverage_rate         numeric(4,3),
  avg_field_fill_rate   numeric(4,3),
  completed_experiments smallint,
  avg_outcome_quality   numeric(5,2),

  -- Versioning
  version             smallint    NOT NULL DEFAULT 1,
  calculated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.case_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_cqs_own ON public.case_quality_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id
      AND (
        c.anonymized_user_id = (
          SELECT anonymized_id FROM public.anonymized_user_map WHERE user_id = auth.uid()
        )
        OR (c.is_public = true AND c.tier IN ('TIER2','TIER1'))
      )
    )
  );
