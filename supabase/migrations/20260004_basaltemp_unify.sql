-- supabase/migrations/20260004_basaltemp_unify.sql
--
-- Phase4 Step4a: basalTemp / temperature 二重フィールド統一
--
-- 方針:
--   basalTemp IS NULL かつ temperature IS NOT NULL の行のみ
--   basalTemp に temperature 値をコピーする。
--   既存の basalTemp 値は変更しない。
--   temperature カラムは削除しない（DEPRECATED化のみ）。
--
-- 注意:
--   必ず staging 環境で以下の SELECT を実行し、
--   対象件数を確認してから本番に適用すること。
--
-- ロールバック:
--   temperature カラムは保持されているため、
--   basalTemp を NULL に戻すことで旧動作に復帰可能。
--   UPDATE public.records SET basalTemp = NULL
--   WHERE basalTemp = temperature AND temperature IS NOT NULL;
--   （staging で件数確認後に実行すること）

-- 1. DRY RUN: 適用前に対象件数を確認する（staging 必須）
SELECT COUNT(*)
FROM public.records
WHERE basalTemp IS NULL
  AND temperature IS NOT NULL;

-- 2. 移行: basalTemp 未設定かつ temperature に値がある行のみ更新
UPDATE public.records
SET    basalTemp = temperature
WHERE  basalTemp IS NULL
  AND  temperature IS NOT NULL;

-- 3. temperature カラムを DEPRECATED 化（削除しない）
COMMENT ON COLUMN public.records.temperature
  IS 'DEPRECATED: Use basalTemp. Will be removed after 2028-01-01.';
