-- ============================================================
--  ippo – Analytics Migration
--  Phase2: GINインデックス + profiles ベースライン列追加
--
--  安全性:
--  ・CREATE INDEX IF NOT EXISTS — 冪等
--  ・ADD COLUMN IF NOT EXISTS   — 冪等、NULL許容のみ
--  ・UPDATE / DELETE / DROP なし
--  ・既存ユーザーデータの変更なし
--
--  ロールバック:
--    DROP INDEX IF EXISTS idx_records_symptoms;
--    DROP INDEX IF EXISTS idx_records_factors;
--    ALTER TABLE public.profiles
--      DROP COLUMN IF EXISTS baseline_json,
--      DROP COLUMN IF EXISTS baseline_updated_at;
--
--  適用方法: Supabase Dashboard → SQL Editor で実行
-- ============================================================

-- ─── records: GINインデックス追加 ────────────────────────────
-- symptoms / factors は JSONB 配列。配列検索を全件スキャンから解放する。
CREATE INDEX IF NOT EXISTS idx_records_symptoms
  ON public.records USING GIN(symptoms);

CREATE INDEX IF NOT EXISTS idx_records_factors
  ON public.records USING GIN(factors);

-- ─── profiles: ベースライン列追加 ────────────────────────────
-- baseline_json: calcBaseline() の結果を保存する JSONB 列。
-- NULL 許容。既存ユーザーは NULL のまま（移行不要）。
-- 主保存フロー（save.js / supabase.js）とは完全に分離した列。
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS baseline_json         JSONB       NULL,
  ADD COLUMN IF NOT EXISTS baseline_updated_at   TIMESTAMPTZ NULL;
