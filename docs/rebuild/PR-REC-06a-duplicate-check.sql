-- ============================================================
--  PR-REC-06a-FIX: records.(user_id, record_date) 重複検査SQL
--
--  目的: supabase/migrations/20260094_records_unique_constraint.sql を
--  適用する前に、既存の records テーブルに (user_id, record_date) の
--  重複行が存在しないことを確認する。
--
--  このファイルは migration ではない。Supabase SQL Editor / psql で
--  手動実行し、結果を目視確認してから 20260094 を適用すること。
--  0件であることを確認できるまで 20260094 は適用しない。
-- ============================================================

-- 1) 重複している (user_id, record_date) の組み合わせと件数を列挙する。
--    0行であれば重複なし。
SELECT
  user_id,
  record_date,
  count(*)          AS row_count,
  array_agg(id)      AS record_ids,
  array_agg(created_at ORDER BY created_at) AS created_at_list
FROM public.records
WHERE is_deleted = false
GROUP BY user_id, record_date
HAVING count(*) > 1
ORDER BY row_count DESC;

-- 2) 参考: is_deleted=true も含めた総重複件数（is_deleted行はUNIQUE制約の
--    対象になる点に注意 — PostgreSQLのUNIQUE制約はデフォルトでNULL以外の
--    全行を見るため、論理削除行があっても物理的に重複していればALTER TABLEは
--    失敗する）。
SELECT
  user_id,
  record_date,
  count(*) AS row_count
FROM public.records
GROUP BY user_id, record_date
HAVING count(*) > 1
ORDER BY row_count DESC;

-- 3) 重複が見つかった場合の対処方針（実行はしない、確認のみ）:
--    - PR-REC-06aのDual-Write実装（check-then-actパターン、修正前バージョン）に
--      起因するレースコンディションで生成された重複が疑われる場合、
--      created_at が新しい方を残し古い方を is_deleted=true にする、または
--      record_symptoms/record_factors側の参照を最新行へ付け替えた上で
--      古い行を削除する、といった対応が必要。
--    - 対処方針の確定・実行はFounder承認後に別PRで行う
--      （本PRの範囲外、DB操作は行わない）。
