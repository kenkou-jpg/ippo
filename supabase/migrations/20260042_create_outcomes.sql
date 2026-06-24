-- ============================================================
--  Group E: Outcome Domain — 032
--  outcomes テーブル（Immutable + Version管理）
--  CRITICAL: 生成後UPDATE禁止（SCHEMA_V1 C-7）
--  CRITICAL: 再計算時は version+1 で新行INSERT
--  CRITICAL: ABANDONED後は actual_end_at + 7日後から生成可（RD-004）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.outcomes (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id           uuid        NOT NULL REFERENCES public.experiments(id),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id),

  before_period_start     date        NOT NULL,
  before_period_end       date        NOT NULL,
  after_period_start      date        NOT NULL,
  after_period_end        date        NOT NULL,
  before_record_count     smallint    NOT NULL,
  after_record_count      smallint    NOT NULL,

  before_metrics          jsonb       NOT NULL,
  after_metrics           jsonb       NOT NULL,

  effect_sizes            jsonb       NOT NULL DEFAULT '[]',
  primary_effect_size     numeric(6,4),
  confidence_level        text        NOT NULL
    CHECK (confidence_level IN ('high','medium','low','insufficient')),
  confidence_factors      jsonb,

  category                text        NOT NULL
    CHECK (category IN ('IMPROVED','WORSENED','NO_CHANGE','INDETERMINATE','PARTIAL')),
  quality_score           numeric(5,2),

  is_medical_intervention boolean     DEFAULT false,

  version                 smallint    NOT NULL DEFAULT 1,
  superseded_by           uuid        REFERENCES public.outcomes(id),

  generated_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- experiments.outcome_id FK を追加
ALTER TABLE public.experiments
  ADD CONSTRAINT fk_experiments_outcome
  FOREIGN KEY (outcome_id) REFERENCES public.outcomes(id)
  NOT VALID;

CREATE INDEX IF NOT EXISTS idx_out_experiment ON public.outcomes(experiment_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_out_user       ON public.outcomes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_out_category   ON public.outcomes(category, confidence_level);
CREATE INDEX IF NOT EXISTS idx_out_latest     ON public.outcomes(experiment_id, version DESC)
  WHERE superseded_by IS NULL;

ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_out_own ON public.outcomes USING (auth.uid() = user_id);
