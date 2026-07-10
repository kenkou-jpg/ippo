-- ============================================================
--  PR-REC-05: records.experiment_id カラム追加
--  根拠: docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md
--        "RecordEntity Mapping" — experimentContext.experimentIdの永続化先。
--        Outcome集計精度向上のため、Recordがどの実験に属するかを直接紐付ける。
--  CRITICAL: 既存カラムは削除しない（Expand段階）。nullable・FK制約のみ。
-- ============================================================

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS experiment_id uuid REFERENCES public.experiments(id);

CREATE INDEX IF NOT EXISTS idx_records_experiment
  ON public.records(experiment_id)
  WHERE experiment_id IS NOT NULL;
