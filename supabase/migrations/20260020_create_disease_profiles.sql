-- ============================================================
--  Group C: User Domain — 010
--  disease_profiles テーブル
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disease_profiles (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_key     text    NOT NULL REFERENCES public.disease_definitions(key),

  icd10_code      text,
  snomed_code     text,
  is_diagnosed    boolean NOT NULL DEFAULT false,
  diagnosis_date  date,
  diagnosed_by    text,
    -- 'self'|'gp'|'specialist'|'hospital'
  status          text    NOT NULL DEFAULT 'ACTIVE',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, disease_key)
);

CREATE INDEX IF NOT EXISTS idx_dp_user ON public.disease_profiles(user_id, status);

ALTER TABLE public.disease_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dp_own ON public.disease_profiles USING (auth.uid() = user_id);
