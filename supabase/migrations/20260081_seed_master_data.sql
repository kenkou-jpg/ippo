-- ============================================================
--  Group J: Seed — Master Data
--  disease_definitions / symptoms / factor_definitions の初期データ
--  CRITICAL: key / disease_prefix は変更禁止（SCHEMA_V1 C-4）
--  CRITICAL: symptom key は英語 snake_case（SCHEMA_V1 C-2）
-- ============================================================

-- ── disease_definitions ──────────────────────────────────────────

INSERT INTO public.disease_definitions
  (key, display_name_ja, display_name_en, icd10_code, icd10_subcode, disease_prefix, category)
VALUES
  ('endometriosis',      '子宮内膜症',       'Endometriosis',             'N80',  'N80.0', 'ENDO', 'endometriosis_family'),
  ('ovarian_cyst',       '卵巣嚢腫',         'Ovarian Cyst',              'N83',  'N83.2', 'OVC',  'ovarian'),
  ('uterine_fibroid',    '子宮筋腫',         'Uterine Fibroid',           'D25',  NULL,    'UF',   'uterine'),
  ('adenomyosis',        '子宮腺筋症',       'Adenomyosis',               'N80',  'N80.0', 'ADN',  'endometriosis_family'),
  ('pcos',               '多嚢胞性卵巣症候群','Polycystic Ovary Syndrome', 'E28',  'E28.2', 'PCOS', 'hormonal'),
  ('pms_pmdd',           'PMS/PMDD',         'PMS/PMDD',                  'N94',  'N94.3', 'PMS',  'hormonal'),
  ('menopause',          '更年期障害',       'Menopause',                 'N95',  'N95.1', 'MNP',  'hormonal'),
  ('infertility',        '不妊症',           'Infertility',               'N97',  NULL,    'INF',  'reproductive'),
  ('pelvic_organ_prolapse','骨盤臓器脱',     'Pelvic Organ Prolapse',     'N81',  NULL,    'POP',  'pelvic'),
  ('chronic_pelvic_pain','慢性骨盤痛',       'Chronic Pelvic Pain',       'N94',  'N94.8', 'CPP',  'pelvic'),
  ('vulvodynia',         '外陰痛症候群',     'Vulvodynia',                'N94',  'N94.9', 'VUL',  'pelvic')
ON CONFLICT (key) DO UPDATE SET
  display_name_ja = EXCLUDED.display_name_ja,
  display_name_en = EXCLUDED.display_name_en;

-- ── symptoms (41症状 — 英語 snake_case キー) ─────────────────────

INSERT INTO public.symptoms (key, display_name_ja, display_name_en, layer, is_sensitive) VALUES
  -- Layer 1 (7)
  ('lower_abdominal_pain',     '下腹部痛',     'Lower Abdominal Pain',     1, false),
  ('lower_back_pain',          '腰痛',         'Lower Back Pain',          1, false),
  ('headache',                 '頭痛',         'Headache',                 1, false),
  ('fatigue',                  '倦怠感',       'Fatigue',                  1, false),
  ('depression',               '気分の落ち込み','Low Mood / Depression',    1, false),
  ('irritability',             'イライラ',     'Irritability',             1, false),
  ('edema',                    'むくみ',       'Edema / Swelling',         1, false),
  -- Layer 2 (12)
  ('anxiety',                  '不安感',       'Anxiety',                  2, false),
  ('insomnia',                 '不眠',         'Insomnia',                 2, false),
  ('difficulty_concentrating', '集中力低下',   'Difficulty Concentrating', 2, false),
  ('nausea',                   '吐き気',       'Nausea',                   2, false),
  ('breast_tenderness',        '胸の張り',     'Breast Tenderness',        2, false),
  ('constipation',             '便秘',         'Constipation',             2, false),
  ('diarrhea',                 '下痢',         'Diarrhea',                 2, false),
  ('increased_appetite',       '食欲増加',     'Increased Appetite',       2, false),
  ('loss_of_appetite',         '食欲低下',     'Loss of Appetite',         2, false),
  ('drowsiness',               '眠気',         'Drowsiness',               2, false),
  ('brain_fog',                'ブレインフォグ','Brain Fog',                2, false),
  ('bloating',                 '腹部膨満',     'Bloating',                 2, false),
  -- Layer 3 (20)
  ('hot_flash',                'ほてり',       'Hot Flash',                3, false),
  ('flushing',                 'のぼせ',       'Flushing',                 3, false),
  ('palpitation',              '動悸',         'Palpitation',              3, false),
  ('cold_sensitivity',         '冷え',         'Cold Sensitivity',         3, false),
  ('fever',                    '発熱',         'Fever',                    3, false),
  ('joint_pain',               '関節痛',       'Joint Pain',               3, false),
  ('skin_roughness',           '肌荒れ',       'Skin Roughness',           3, false),
  ('hot_flash_severe',         'ホットフラッシュ','Hot Flash (Severe)',     3, false),
  ('vulvar_burning',           '外陰部灼熱感', 'Vulvar Burning',           3, true),
  ('abnormal_bleeding',        '不正出血',     'Abnormal Bleeding',        3, false),
  ('heavy_menstruation',       '経血量増加',   'Heavy Menstruation',       3, false),
  ('vaginal_discharge_change', 'おりもの変化', 'Vaginal Discharge Change',  3, false),
  ('urinary_incontinence',     '尿漏れ',       'Urinary Incontinence',     3, false),
  ('pelvic_heaviness',         '骨盤内重だるさ','Pelvic Heaviness',         3, false),
  ('night_sweats',             '寝汗',         'Night Sweats',             3, false),
  ('stabbing_pain',            '刺痛',         'Stabbing Pain',            3, false),
  ('sitting_pain',             '座位痛',       'Sitting Pain',             3, true),
  ('breast_pain',              '乳房痛',       'Breast Pain',              3, false),
  ('pressure_sensation',       '圧迫感',       'Pressure Sensation',       3, false),
  ('frequent_urination',       '頻尿',         'Frequent Urination',       3, false),
  -- Sensitive (layer 3 相当)
  ('dyspareunia',              '性交痛',       'Dyspareunia',              3, true),
  ('painful_defecation',       '排便痛',       'Painful Defecation',       3, true)
ON CONFLICT (key) DO UPDATE SET
  display_name_ja = EXCLUDED.display_name_ja,
  display_name_en = EXCLUDED.display_name_en;

-- ── factor_definitions (20ファクター) ───────────────────────────

INSERT INTO public.factor_definitions (key, display_name_ja, display_name_en, category) VALUES
  ('caffeine',              'カフェイン',           'Caffeine',                'dietary'),
  ('alcohol',               'アルコール',           'Alcohol',                 'dietary'),
  ('exercise',              '運動した',             'Exercise',                'lifestyle'),
  ('high_stress',           'ストレス高',           'High Stress',             'lifestyle'),
  ('busy_work',             '仕事が忙しい',         'Busy Work',               'lifestyle'),
  ('went_out',              '外出した',             'Went Out',                'lifestyle'),
  ('rain_low_pressure',     '雨・低気圧',           'Rain / Low Pressure',     'environmental'),
  ('late_night',            '夜更かし',             'Late Night',              'lifestyle'),
  ('bathing',               '入浴・半身浴',         'Bathing / Half Bath',     'lifestyle'),
  ('meditation',            '瞑想・リラックス',     'Meditation / Relaxation', 'lifestyle'),
  ('prolonged_sitting',     '長時間座位',           'Prolonged Sitting',       'lifestyle'),
  ('pre_menstrual',         '生理前',               'Pre-Menstrual',           'cycle'),
  ('prolonged_standing',    '長時間立位',           'Prolonged Standing',      'lifestyle'),
  ('high_carb',             '糖質過多',             'High Carbohydrate',       'dietary'),
  ('temperature_change',    '気温変化',             'Temperature Change',      'environmental'),
  ('post_ovulation',        '排卵後',               'Post-Ovulation',          'cycle'),
  ('pelvic_floor_exercise', '骨盤底筋トレーニング', 'Pelvic Floor Exercise',   'medical'),
  ('menstruating',          '月経中',               'Menstruating',            'cycle'),
  ('low_pressure',          '低気圧',               'Low Atmospheric Pressure','environmental'),
  ('cold_measures',         '冷え対策',             'Cold Prevention Measures','lifestyle')
ON CONFLICT (key) DO UPDATE SET
  display_name_ja = EXCLUDED.display_name_ja,
  display_name_en = EXCLUDED.display_name_en;
