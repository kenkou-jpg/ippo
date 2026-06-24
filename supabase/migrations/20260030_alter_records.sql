-- ============================================================
--  Group D: Record Domain — 020
--  records テーブルに SCHEMA_V1 準拠カラムを追加
--  CRITICAL: record_date は DATE型・タイムゾーンなし（SCHEMA_V1 C-1）
--  CRITICAL: 既存カラムは削除しない（Expand段階）
-- ============================================================

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS symptom_keys       text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS factor_keys        text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pain_level         smallint    CHECK (pain_level BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS energy             smallint    CHECK (energy BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS sleep_quality      smallint    CHECK (sleep_quality BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS wellness_score     smallint    CHECK (wellness_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS mood               smallint    CHECK (mood BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS body_temp          numeric(4,1),
  ADD COLUMN IF NOT EXISTS period_day         smallint    CHECK (period_day >= 0),
  ADD COLUMN IF NOT EXISTS fasting_hours      numeric(4,1) CHECK (fasting_hours >= 0),
  ADD COLUMN IF NOT EXISTS fasting_goal_hours numeric(4,1),
  ADD COLUMN IF NOT EXISTS meal_detail        jsonb,
  ADD COLUMN IF NOT EXISTS is_deleted         boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at         timestamptz,
  ADD COLUMN IF NOT EXISTS client_created_at  timestamptz,
  ADD COLUMN IF NOT EXISTS sync_pending       boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS synced_at          timestamptz;

-- is_period はGenerated Columnとして追加（period_dayから自動計算）
-- PostgreSQL 12+ 対応
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'records' AND column_name = 'is_period'
  ) THEN
    ALTER TABLE public.records
      ADD COLUMN is_period boolean GENERATED ALWAYS AS (period_day > 0) STORED;
  END IF;
END;
$$;

-- UNIQUE(user_id, record_date) は Backfill完了後に別Migrationで適用する
-- → 20260033_records_unique_constraint.sql（backfill後に手動実行）
