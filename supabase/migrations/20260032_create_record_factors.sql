-- ============================================================
--  Group D: Record Domain — 022
--  record_factors テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.record_factors (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   uuid    NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_key  text    NOT NULL REFERENCES public.factor_definitions(key),

  intensity   smallint CHECK (intensity BETWEEN 1 AND 5),
  note        text,
  recorded_at date    NOT NULL,

  UNIQUE (record_id, factor_key)
);

CREATE INDEX IF NOT EXISTS idx_rf_record   ON public.record_factors(record_id);
CREATE INDEX IF NOT EXISTS idx_rf_user_fac ON public.record_factors(user_id, factor_key, recorded_at DESC);

ALTER TABLE public.record_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_rf_own ON public.record_factors USING (auth.uid() = user_id);
