-- ============================================================
--  PR-REC-06a-FIX: records.(user_id, record_date) への UNIQUE制約追加
--  根拠: infrastructure/record/record.repository.ts の
--        SupabaseRecordRepository.upsert() が
--        supabase.upsert(row, { onConflict: 'user_id,record_date' })
--        を使う原子的upsertへ移行したため、この制約が前提として必要。
--
--  CRITICAL:
--  - このファイルはまだSupabaseへ適用していない（Founder承認まで適用禁止）。
--  - 適用前に必ず重複データが存在しないことを確認すること
--    （docs/rebuild/PR-REC-06a-duplicate-check.sql 参照）。
--    重複が存在する状態でこの制約を適用すると、ALTER TABLE自体が
--    エラーで失敗する（"could not create unique index" 相当）。
--  - 20260030_alter_records.sql のコメントが元々想定していた
--    「backfill後に適用」という前提は、Dual-Write専用の本用途では
--    必ずしも当てはまらない（バックフィルはPR-REC-06cのスコープで
--    別途行う）。ここではDual-Write経由の新規書込みに限定して
--    重複を防ぐために適用する。
-- ============================================================

ALTER TABLE public.records
  ADD CONSTRAINT records_user_id_record_date_key UNIQUE (user_id, record_date);
