-- ============================================================
--  PR-REC-06a: Prototype Record UI payload の残りフィールド用カラム追加
--  根拠: docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md
--        "Record Payload Design" / "RecordEntity Mapping" —
--        memo(note) と medication は records テーブルに対応カラムが
--        存在しなかった。
--  CRITICAL: 既存カラムは削除しない（Expand段階）。すべてnullable。
--
--  PR-REC-06a-FIX (Founder Decision 2/3/4, 2026-07-12):
--  当初案にあった menstrual_cycle / blood_clot / blood_color / bowel は
--  削除した。
--    - menstrual_cycle: 生理周期の正は既存の records.period_day /
--      records.is_period（generated column）とする。新規列は追加しない。
--      Prototype値からperiod_dayへのマッピングは
--      infrastructure/record/record.repository.ts の
--      mapMenstrualCycleToPeriodDay() を参照（現時点では日数情報が
--      収集されていないため常にnull、推測はしない）。
--    - blood_clot / blood_color / bowel: controlled vocabulary の専用設計が
--      確定するまでnormalized write対象外とし、legacy user_records側の
--      みで保持する。自由テキスト列としてrecordsへ追加しない。
--
--  このマイグレーションファイルはまだSupabaseへ適用していない
--  （PR-REC-06a-FIX時点、Founder承認まで適用しない）。
-- ============================================================

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS note       text,
  ADD COLUMN IF NOT EXISTS medication text[];
