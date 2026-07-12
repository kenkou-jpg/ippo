-- ============================================================
--  PR-REC-06a: Prototype Record UI payload の残りフィールド用カラム追加
--  根拠: docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md
--        "Record Payload Design" / "RecordEntity Mapping" —
--        optionalDetails.menstrualCycle/bloodClot/bloodColor/bowel/medication
--        および memo(note) は records テーブルに対応カラムが存在しなかった。
--  CRITICAL: 既存カラムは削除しない（Expand段階）。すべてnullable。
-- ============================================================

ALTER TABLE public.records
  ADD COLUMN IF NOT EXISTS note            text,
  ADD COLUMN IF NOT EXISTS menstrual_cycle text,
  ADD COLUMN IF NOT EXISTS blood_clot      text[],
  ADD COLUMN IF NOT EXISTS blood_color     text[],
  ADD COLUMN IF NOT EXISTS bowel           text,
  ADD COLUMN IF NOT EXISTS medication      text[];
