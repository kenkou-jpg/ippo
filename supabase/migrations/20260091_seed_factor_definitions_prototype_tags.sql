-- ============================================================
--  PR-REC-04: Prototype行動タグ追加分の factor_definitions シード
--  根拠: docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md
--        "RecordEntity Mapping" — dairy/earlysleepタグに対応する
--        factor_definitions行が存在しないため追加する（INSERTのみ、スキーマ変更なし）
-- ============================================================

INSERT INTO public.factor_definitions (key, display_name_ja, display_name_en, category) VALUES
  ('dairy',       '乳製品',   'Dairy',       'dietary'),
  ('early_sleep', '早寝',     'Early Sleep', 'lifestyle')
ON CONFLICT (key) DO UPDATE SET
  display_name_ja = EXCLUDED.display_name_ja,
  display_name_en = EXCLUDED.display_name_en;
