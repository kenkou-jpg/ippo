-- ============================================================
--  Group H: Audit / Infrastructure — 061
--  anonymization_log テーブル（GDPR監査・k-anonymity証明）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.anonymization_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     text        NOT NULL REFERENCES public.cases(id),
  stage       smallint    NOT NULL,
    -- 1: 仮名化 / 2: k-anonymity / 3: 集計
  algorithm   text        NOT NULL,
    -- 'pseudonymization-v1' / 'k-anon-k5-v1'
  k_value     smallint,
  group_size  smallint,
  passed      boolean     NOT NULL,
  suppressed  boolean     NOT NULL DEFAULT false,
  executed_at timestamptz NOT NULL DEFAULT now(),
  executor    text        NOT NULL
    -- 'batch-nightly'|'manual'
);

CREATE INDEX IF NOT EXISTS idx_anon_log_case ON public.anonymization_log(case_id, executed_at DESC);

ALTER TABLE public.anonymization_log ENABLE ROW LEVEL SECURITY;
-- Service Role のみ
