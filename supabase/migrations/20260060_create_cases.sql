-- ============================================================
--  Group G: Case Domain — 050
--  cases テーブル（Core Asset）
--  CRITICAL: id 形式 'CASE-{PREFIX}-{YYYYMM}-{RANDOM8}' 変更禁止（C-3）
--  CRITICAL: 物理削除禁止。status = 'ARCHIVED' で論理削除
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cases (
  id                  text        PRIMARY KEY,
    -- 'CASE-ENDO-202607-A3X9M2KP'

  anonymized_user_id  uuid        NOT NULL REFERENCES public.anonymized_user_map(anonymized_id),
  primary_disease_key text        NOT NULL REFERENCES public.disease_definitions(key),
  disease_keys        text[]      NOT NULL DEFAULT '{}',
  icd10_codes         text[]      DEFAULT '{}',

  status              text        NOT NULL DEFAULT 'PRE_CANDIDATE'
    CHECK (status IN (
      'PRE_CANDIDATE','CANDIDATE','TIER3','TIER2','TIER1',
      'SUSPENDED','CONSENT_WITHDRAWN','INVALIDATED','ARCHIVED'
    )),
  tier                text
    CHECK (tier IN ('TIER3','TIER2','TIER1')),

  case_start_date     date        NOT NULL,
  case_end_date       date,
  age_group           text,
  geographic_region   text,

  consent_id          uuid        REFERENCES public.consents(id),
  consent_level       smallint    NOT NULL DEFAULT 0
    CHECK (consent_level BETWEEN 0 AND 3),

  quality_score       numeric(5,2),

  record_count        integer     DEFAULT 0,
  record_months       smallint    DEFAULT 0,
  experiment_ids      uuid[]      DEFAULT '{}',
  outcome_ids         uuid[]      DEFAULT '{}',
  completed_experiment_count smallint DEFAULT 0,
  primary_symptom_keys text[]     DEFAULT '{}',

  search_vector       tsvector,
  search_metadata     jsonb       DEFAULT '{}',

  is_public           boolean     NOT NULL DEFAULT false,

  registered_at       timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at   timestamptz,
  version             smallint    NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_disease      ON public.cases(primary_disease_key, status);
CREATE INDEX IF NOT EXISTS idx_cases_tier_pub     ON public.cases(tier, consent_level) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_cases_anon_user    ON public.cases(anonymized_user_id);
CREATE INDEX IF NOT EXISTS idx_cases_quality      ON public.cases(quality_score DESC) WHERE tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cases_region       ON public.cases(geographic_region, primary_disease_key);

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- 自分の症例（anonymized_id経由）
CREATE POLICY p_cases_own ON public.cases
  USING (
    anonymized_user_id = (
      SELECT anonymized_id FROM public.anonymized_user_map WHERE user_id = auth.uid()
    )
  );

-- PRO検索（Premium ユーザーのみ）
CREATE POLICY p_cases_pro_search ON public.cases
  FOR SELECT
  USING (
    is_public = true
    AND tier IN ('TIER2','TIER1')
    AND consent_level >= 1
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_premium = true
    )
  );
