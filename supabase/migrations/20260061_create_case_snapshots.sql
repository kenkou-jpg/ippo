-- ============================================================
--  Group G: Case Domain — 051
--  case_snapshots テーブル（製薬監査用・バージョン履歴）
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_snapshots (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     text    NOT NULL REFERENCES public.cases(id),
  version     smallint NOT NULL,

  snapshot    jsonb   NOT NULL,

  reason      text,
    -- 'QUALITY_RECALCULATED'|'TIER_PROMOTED'|'CONSENT_UPDATED'|'BATCH_UPDATE'

  created_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (case_id, version)
);

CREATE INDEX IF NOT EXISTS idx_cs_case ON public.case_snapshots(case_id, version DESC);

-- Service Role のみ INSERT/SELECT
ALTER TABLE public.case_snapshots ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = authenticated ユーザー拒否、Service Role は bypass
