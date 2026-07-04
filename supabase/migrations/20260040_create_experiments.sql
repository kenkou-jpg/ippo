-- ============================================================
--  Group E: Experiment Domain — 030
--  experiments テーブル
--  CRITICAL: status = DRAFT|ACTIVE|COMPLETED|ABANDONED のみ（RD-003）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.experiments (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  experiment_type         text    NOT NULL,
  factor_key              text    NOT NULL REFERENCES public.factor_definitions(key),
  hypothesis              text,
  planned_days            smallint NOT NULL CHECK (planned_days BETWEEN 7 AND 180),
  disease_keys            text[]  NOT NULL DEFAULT '{}',
  target_symptoms         text[]  DEFAULT '{}',

  status                  text    NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','ACTIVE','COMPLETED','ABANDONED')),
  started_at              date,
  planned_end_at          date,
  actual_end_at           date,
  abandoned_at            timestamptz,
  abandon_reason          text,

  is_medical_intervention boolean DEFAULT false,
  physician_involved      boolean,

  outcome_id              uuid,
    -- REFERENCES outcomes(id) は outcomes作成後にFK追加

  is_deleted              boolean NOT NULL DEFAULT false,
  deleted_at              timestamptz,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exp_user_status ON public.experiments(user_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_exp_factor      ON public.experiments(factor_key, status);
CREATE INDEX IF NOT EXISTS idx_exp_outcome     ON public.experiments(outcome_id) WHERE outcome_id IS NOT NULL;

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_exp_own ON public.experiments USING (auth.uid() = user_id);
