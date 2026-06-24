-- ============================================================
--  Group D: Record Domain — 021
--  record_symptoms テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.record_symptoms (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   uuid    NOT NULL REFERENCES public.records(id) ON DELETE CASCADE,
  user_id     uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_key text    NOT NULL REFERENCES public.symptoms(key),

  severity    smallint CHECK (severity BETWEEN 1 AND 5),
  note        text,
  recorded_at date    NOT NULL,

  UNIQUE (record_id, symptom_key)
);

CREATE INDEX IF NOT EXISTS idx_rs_record   ON public.record_symptoms(record_id);
CREATE INDEX IF NOT EXISTS idx_rs_user_sym ON public.record_symptoms(user_id, symptom_key, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rs_sym_date ON public.record_symptoms(symptom_key, recorded_at DESC);

ALTER TABLE public.record_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_rs_own ON public.record_symptoms USING (auth.uid() = user_id);
