-- supabase/migrations/20260003_cluster.sql
--
-- Phase4 Step4b: profiles テーブルにクラスタ・予測キャッシュ列を追加
--
-- 方針:
--   全列 NULL 許容 / IF NOT EXISTS 使用。
--   UPDATE・DELETE なし。既存行のデータは一切変更しない。
--
-- ロールバック:
--   ALTER TABLE public.profiles
--     DROP COLUMN IF EXISTS cluster_id,
--     DROP COLUMN IF EXISTS cluster_meta,
--     DROP COLUMN IF EXISTS cluster_updated_at,
--     DROP COLUMN IF EXISTS prediction_cache,
--     DROP COLUMN IF EXISTS prediction_updated_at;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cluster_id            INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS cluster_meta          JSONB       NULL,
  ADD COLUMN IF NOT EXISTS cluster_updated_at    TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS prediction_cache      JSONB       NULL,
  ADD COLUMN IF NOT EXISTS prediction_updated_at TIMESTAMPTZ NULL;
