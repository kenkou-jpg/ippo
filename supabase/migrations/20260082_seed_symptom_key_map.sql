-- ============================================================
--  Group J: Backfill Preparation
--  symptom_key 変換マップ（日本語 → 英語）
--  用途: 080_backfill_records 実行前に投入する
--  完了後: _migration_symptom_key_map は DROP する
-- ============================================================

CREATE TABLE IF NOT EXISTS public._migration_symptom_key_map (
  ja_key  text PRIMARY KEY,
  en_key  text NOT NULL REFERENCES public.symptoms(key)
);

INSERT INTO public._migration_symptom_key_map (ja_key, en_key) VALUES
  ('下腹部痛',         'lower_abdominal_pain'),
  ('腰痛',             'lower_back_pain'),
  ('頭痛',             'headache'),
  ('倦怠感',           'fatigue'),
  ('気分の落ち込み',   'depression'),
  ('イライラ',         'irritability'),
  ('むくみ',           'edema'),
  ('不安感',           'anxiety'),
  ('不眠',             'insomnia'),
  ('集中力低下',       'difficulty_concentrating'),
  ('吐き気',           'nausea'),
  ('胸の張り',         'breast_tenderness'),
  ('便秘',             'constipation'),
  ('下痢',             'diarrhea'),
  ('食欲増加',         'increased_appetite'),
  ('食欲低下',         'loss_of_appetite'),
  ('眠気',             'drowsiness'),
  ('ブレインフォグ',   'brain_fog'),
  ('腹部膨満',         'bloating'),
  ('腹部膨満感',       'bloating'),
  ('ほてり',           'hot_flash'),
  ('のぼせ',           'flushing'),
  ('動悸',             'palpitation'),
  ('冷え',             'cold_sensitivity'),
  ('発熱',             'fever'),
  ('関節痛',           'joint_pain'),
  ('肌荒れ',           'skin_roughness'),
  ('ホットフラッシュ', 'hot_flash_severe'),
  ('外陰部灼熱感',     'vulvar_burning'),
  ('不正出血',         'abnormal_bleeding'),
  ('経血量増加',       'heavy_menstruation'),
  ('おりもの変化',     'vaginal_discharge_change'),
  ('尿漏れ',           'urinary_incontinence'),
  ('骨盤内重だるさ',   'pelvic_heaviness'),
  ('寝汗',             'night_sweats'),
  ('刺痛',             'stabbing_pain'),
  ('座位痛',           'sitting_pain'),
  ('乳房痛',           'breast_pain'),
  ('圧迫感',           'pressure_sensation'),
  ('頻尿',             'frequent_urination'),
  ('性交痛',           'dyspareunia'),
  ('排便痛',           'painful_defecation'),
  -- 追加エイリアス（旧バリエーション対応）
  ('片側の下腹部痛',   'lower_abdominal_pain'),
  ('排卵痛',           'lower_abdominal_pain'),
  ('腹痛',             'lower_abdominal_pain'),
  ('慢性疲労',         'fatigue'),
  ('骨盤痛',           'pelvic_heaviness'),
  ('ほてり・のぼせ',   'hot_flash'),
  ('生理痛',           'lower_abdominal_pain'),
  ('過多月経',         'heavy_menstruation'),
  ('月経痛',           'lower_abdominal_pain'),
  ('排尿痛',           'frequent_urination'),
  ('肩こり',           'pressure_sensation'),
  ('めまい',           'dizziness'),
  ('記憶力低下',       'brain_fog'),
  ('無月経',           'abnormal_bleeding')
ON CONFLICT (ja_key) DO NOTHING;

-- dizziness は symptoms に追加（めまい対応）
INSERT INTO public.symptoms (key, display_name_ja, display_name_en, layer, is_sensitive)
VALUES ('dizziness', 'めまい', 'Dizziness', 3, false)
ON CONFLICT (key) DO NOTHING;

-- _migration_symptom_key_map に dizziness を追加
UPDATE public._migration_symptom_key_map SET en_key = 'dizziness' WHERE ja_key = 'めまい';
INSERT INTO public._migration_symptom_key_map (ja_key, en_key)
VALUES ('めまい', 'dizziness') ON CONFLICT DO NOTHING;

-- ── Backfill: records.symptom_keys を英語キーに変換 ──────────────
-- このブロックは records テーブルに symptom_keys カラムが存在する前提

DO $$
DECLARE
  r RECORD;
  old_keys text[];
  new_keys text[];
  k text;
  mapped text;
BEGIN
  FOR r IN SELECT id, symptom_keys FROM public.records WHERE symptom_keys != '{}' LOOP
    old_keys := r.symptom_keys;
    new_keys := '{}';
    FOREACH k IN ARRAY old_keys LOOP
      -- 既に英語キー（ASCII only）の場合はそのまま
      IF k ~ '^[a-z_]+$' AND EXISTS (SELECT 1 FROM public.symptoms WHERE key = k) THEN
        new_keys := array_append(new_keys, k);
      ELSE
        SELECT en_key INTO mapped
        FROM public._migration_symptom_key_map
        WHERE ja_key = k;
        IF mapped IS NOT NULL THEN
          new_keys := array_append(new_keys, mapped);
        ELSE
          -- 変換不能: '_UNMAPPED_' プレフィックスで保存（後で手動確認）
          new_keys := array_append(new_keys, '_UNMAPPED_' || k);
        END IF;
      END IF;
    END LOOP;
    UPDATE public.records SET symptom_keys = new_keys WHERE id = r.id;
  END LOOP;
END;
$$;

-- 変換結果レポート
-- SELECT DISTINCT unnest(symptom_keys) FROM records WHERE symptom_keys != '{}';
-- SELECT COUNT(*) FROM records WHERE EXISTS (SELECT 1 FROM unnest(symptom_keys) k WHERE k LIKE '_UNMAPPED_%');
