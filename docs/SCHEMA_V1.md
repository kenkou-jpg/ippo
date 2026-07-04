# SCHEMA_V1.md
## IPPO EVOLUTION PROGRAM — Phase 4: Schema Design Council

Version: 1.0
Generated: 2026-06-24
Authority: Schema Design Council (9名)
前提文書: DOMAIN_MODEL_V1.md / ARCHITECTURE_V3.md
評価基準: 「症例DB10万件到達後でもスキーマ変更不要」

---

# 出力1: SCHEMA PRINCIPLES

## 1-1. 正規化レベル

**採用: 3NF (第三正規形) を基本とし、読み取り性能のためにのみ非正規化を許容する**

```
原則:
  - 更新異常を防ぐため 3NF を基本とする
  - 結合コストが許容不能なホットパス（症例検索、類似検索）は
    非正規化カラムを cases テーブルに持ち、バッチで同期する
  - 非正規化は必ず「元データから再生成可能」であること

例外として非正規化を認める箇所:
  cases.record_count         ← records の集計値
  cases.experiment_ids[]     ← experiments の参照リスト
  cases.search_vector        ← tsvector 全文検索用
  cases.disease_keys[]       ← 高速フィルタ用
  case_quality_scores.*      ← 品質スコアの各成分（再計算可能）
```

## 1-2. JSONB 利用基準

**JSONB は「構造が確定していないデータ」にのみ使用する**

```
✅ JSONB を使ってよい場所:
  records.meal_detail        ← 食事の朝/昼/夕/時間は構造が多様
  outcomes.before_metrics    ← MetricSnapshot（将来の指標追加に備える）
  outcomes.after_metrics     ← 同上
  outcomes.effect_sizes      ← EffectSize[] (複数指標の配列)
  cases.search_metadata      ← 検索用の補助メタデータ
  experiment_events.payload  ← Event Payloadは型がイベント種別依存
  consent_events.payload     ← 同上
  audit_log.before_value     ← 変更前の任意型値
  audit_log.after_value      ← 変更後の任意型値

❌ JSONB を使ってはいけない場所:
  症状キー一覧    → text[] (GIN インデックス可)
  ファクターキー  → text[] (同上)
  状態 (status)  → text + CHECK CONSTRAINT
  スコア         → numeric
  日付           → date / timestamptz
  外部キー       → uuid / text

判断基準:
  「SQLでWHEREに使うか？」→ Yes なら正規カラム
  「将来の構造拡張が確実か？」→ Yes なら JSONB
```

## 1-3. 監査ログ方針

**イベントソーシングは Consent のみ。他は audit_log テーブルで対応**

```
Tier 1 — Full Event Sourcing (Consent のみ):
  consent_events テーブルに全操作を append-only で記録
  理由: GDPR/APPI/HIPAA の法的要件。撤回証跡は証拠能力が必要

Tier 2 — Audit Log (Case, Experiment, Outcome):
  audit_log テーブルに before/after を JSON で記録
  対象: status変更, tier変更, quality_score変更
  理由: 製薬企業監査で「いつスコアが変わったか」が問われる

Tier 3 — updated_at のみ (Record, Profile):
  変更日時だけ記録。内容の履歴は不要
  理由: 日常記録の変更履歴は監査要件なし

原則:
  - audit_log は INSERT ONLY (UPDATE/DELETE 禁止)
  - RLS: audit_log は Service Role のみ書込み可
  - 保持期間: Consent関連は10年, その他は5年
```

## 1-4. Soft Delete 方針

**テーブル別に方針を分ける**

```
Soft Delete (is_deleted + deleted_at):
  records      ← ユーザーが「削除」しても復元可能にする
  experiments  ← 削除されても Outcome/Case に参照される可能性
  cases        ← Case IDは永続。物理削除は絶対にしない

Hard Delete (物理削除):
  record_symptoms  ← records 削除時にカスケード
  record_factors   ← 同上
  experiment_events← experiments が active な間は不可。完了後はOK
  similarity_edges ← バッチで全再計算するため物理削除可

削除禁止 (delete 不可):
  consent_events   ← 法的証拠。削除不可
  audit_log        ← 監査証跡。削除不可
  anonymized_user_map ← Case の匿名性の根拠。削除不可
  cases            ← Case ID は論文等に記録される。削除不可

方針:
  - RLS で一般ユーザーの DELETE を全テーブルで禁止
  - 削除は必ず is_deleted=true + deleted_at=now() で実装
  - クエリには WHERE is_deleted = false を必ず付ける
```

## 1-5. ID 戦略

**CRITICAL: ID 形式は一度決めたら変更不可**

```
テーブル別 ID 形式:

uuid (gen_random_uuid()):
  users, profiles, records, record_symptoms, record_factors,
  experiments, experiment_events, outcomes,
  consents, consent_events, disease_profiles,
  anonymized_user_map.anonymized_id
  → 理由: グローバルユニーク, 推測不可, Supabase標準

text (ビジネスキー):
  cases.id = 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}'
  → 例: 'CASE-ENDO-202607-A3X9M2KP'
  → 理由: 論文・研究DBで人間が読める形式が必須
  → CRITICAL: 形式変更は全症例の再発行に相当

text (マスターキー):
  symptoms.key = 'lower_abdominal_pain'
  factor_definitions.key = 'caffeine'
  disease_definitions.key = 'endometriosis'
  → 理由: 国際化・コード標準との結合キー
  → CRITICAL: キー変更は全レコードのデータ移行に相当

similarity_edges:
  複合 PK (case_id_a text, case_id_b text)
  → A < B を強制して重複排除

audit_log:
  bigserial (高速 append に有利)
```

## 1-6. Versioning 方針

```
Immutable + Version番号 (Outcome):
  outcomes は生成後 UPDATE 禁止
  再計算時は version+1 で新行 INSERT
  最新版 = MAX(version) WHERE experiment_id = X

Snapshot + Version番号 (Case):
  cases.version はバッチ更新のたびにインクリメント
  case_snapshots テーブルに過去バージョンを保存

Event Log = Source of Truth (Consent):
  consentの「現在状態」は consent_events の最新イベントから導出
  consents テーブルは denormalized cache として保持

Policy Version (Consent):
  consent_policy_version = '2026-07-01-v1' (date-version形式)
  変更時は全ユーザーへの再同意フローが必要
```

---

# 出力2: ENTITY INVENTORY

## 必須エンティティ（全18テーブル）

```
OPERATIONAL DOMAIN
┌─────────────────────────────────────────────────────────────┐
│  01. users              (auth.users — Supabase管理)         │
│  02. profiles           (ユーザープロファイル拡張)           │
│  03. subscriptions      (Stripe課金状態)                    │
│  04. records            (日々の健康記録 — 正規化版)         │
│  05. record_symptoms    (記録×症状 正規化)                   │
│  06. record_factors     (記録×ファクター 正規化)             │
│  07. disease_profiles   (ユーザー疾患登録)                  │
│  08. experiments        (実験 Aggregate)                    │
│  09. experiment_events  (実験状態変更イベント)               │
│  10. outcomes           (実験アウトカム — Immutable)         │
└─────────────────────────────────────────────────────────────┘

CASE PLATFORM DOMAIN
┌─────────────────────────────────────────────────────────────┐
│  11. anonymized_user_map  (user_id → anonymized_id)        │
│  12. cases                (症例 — Core Asset)              │
│  13. case_snapshots       (症例バージョン履歴)              │
│  14. case_quality_scores  (品質スコア詳細)                  │
│  15. similarity_edges     (症例類似グラフ)                  │
└─────────────────────────────────────────────────────────────┘

CONSENT DOMAIN
┌─────────────────────────────────────────────────────────────┐
│  16. consents             (同意状態 — denormalized cache)   │
│  17. consent_events       (同意イベントログ — Source of Truth)│
└─────────────────────────────────────────────────────────────┘

MASTER DATA
┌─────────────────────────────────────────────────────────────┐
│  18. symptoms             (症状マスター)                     │
│  19. factor_definitions   (ファクターマスター)               │
│  20. disease_definitions  (疾患定義マスター)                 │
└─────────────────────────────────────────────────────────────┘

AUDIT / INFRASTRUCTURE
┌─────────────────────────────────────────────────────────────┐
│  21. audit_log            (汎用監査ログ)                    │
│  22. anonymization_log    (匿名化実行記録)                   │
│  23. research_exports     (研究利用エクスポート記録)         │
└─────────────────────────────────────────────────────────────┘
```

**合計: 23テーブル (ARCHITECTURE_V3 の12テーブルから拡張)**

追加した理由:
- `case_snapshots` — 製薬監査でCase履歴が必要
- `audit_log` — 汎用監査ログ（Consent以外）
- `anonymization_log` — GDPR監査で匿名化実行の証明が必要
- `research_exports` — 研究利用のエクスポート履歴・IRB管理
- `disease_definitions` — 疾患マスターテーブル（ARCHITECTURE_V3に記載）

---

# 出力3: TABLE DESIGN

## 01. `auth.users` — Supabase管理

```
目的: 認証ユーザー管理
責務: email/password/OAuth/JWT
PK:  id (uuid)
備考: Supabase が管理。直接操作禁止。
      handle_new_user() trigger で profiles を自動生成
```

---

## 02. `profiles` — ユーザープロファイル

```sql
CREATE TABLE public.profiles (
  id                  uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic
  display_name        text,
  birth_year          smallint,
  age_group           text,         -- '30-34' (5歳刻み、birth_yearから自動計算)
  purpose             text,         -- 'manage_symptoms'|'pregnancy'|'menopause'|'research'
  prefecture_code     text,         -- 都道府県コード (e.g. '13' = 東京都)

  -- Premium
  is_premium          boolean       NOT NULL DEFAULT false,
  premium_expires_at  timestamptz,

  -- Analytics Cache (バッチ更新。再計算可能)
  baseline_json       jsonb,
  baseline_updated_at timestamptz,
  cluster_id          text,
  prediction_cache    jsonb,
  prediction_updated_at timestamptz,

  -- Onboarding
  onboarded_at        timestamptz,
  reminder_time       time,
  cycle_length        smallint      DEFAULT 28,
  cycle_irregular     boolean       DEFAULT false,
  last_period_date    date,

  -- Timestamps
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);

INDEX: なし (PK = auth.users.id で直接参照)
RLS:  profiles_own — auth.uid() = id
```

---

## 03. `subscriptions` — Stripe課金状態

```sql
CREATE TABLE public.subscriptions (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe
  stripe_customer_id      text        UNIQUE,
  stripe_subscription_id  text        UNIQUE,

  -- Plan
  plan                    text        NOT NULL DEFAULT 'free',
    -- 'free'|'monthly'|'annual'
  status                  text        NOT NULL DEFAULT 'inactive',
    -- 'active'|'inactive'|'past_due'|'canceled'|'trialing'
  current_period_end      timestamptz,

  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

INDEX: idx_subscriptions_user ON subscriptions(user_id)
RLS:  subscriptions_own — auth.uid() = user_id
      subscriptions_service — Service Role のみ UPDATE
```

---

## 04. `records` — 日々の健康記録

```sql
CREATE TABLE public.records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date (CRITICAL: タイムゾーンなし。ユーザーのローカル日付)
  record_date         date        NOT NULL,

  -- Vitals
  pain_level          smallint    CHECK (pain_level BETWEEN 0 AND 10),
  energy              smallint    CHECK (energy BETWEEN 1 AND 5),
  sleep_quality       smallint    CHECK (sleep_quality BETWEEN 1 AND 5),
  wellness_score      smallint    CHECK (wellness_score BETWEEN 1 AND 5),
  mood                smallint    CHECK (mood BETWEEN 1 AND 5),
  body_temp           numeric(4,1),

  -- Cycle
  period_day          smallint    CHECK (period_day >= 0),
  is_period           boolean     GENERATED ALWAYS AS (period_day > 0) STORED,

  -- Fasting
  fasting_hours       numeric(4,1) CHECK (fasting_hours >= 0),
  fasting_goal_hours  numeric(4,1),

  -- Free Text
  memo                text,
  meal_detail         jsonb,
    -- {morning:{text,time}, lunch:{text,time}, dinner:{text,time}, snack:{text,time}}

  -- Denormalized for performance (record_symptoms/factors から同期)
  symptom_keys        text[]      NOT NULL DEFAULT '{}',
  factor_keys         text[]      NOT NULL DEFAULT '{}',

  -- Sync
  sync_pending        boolean     DEFAULT false,
  synced_at           timestamptz,
  client_created_at   timestamptz,

  -- Soft Delete
  is_deleted          boolean     NOT NULL DEFAULT false,
  deleted_at          timestamptz,

  -- Audit
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, record_date)
);

INDEX:
  idx_records_user_date    ON records(user_id, record_date DESC) WHERE is_deleted = false
  idx_records_symptoms     ON records USING GIN(symptom_keys) WHERE is_deleted = false
  idx_records_factors      ON records USING GIN(factor_keys) WHERE is_deleted = false
  idx_records_period       ON records(user_id, record_date) WHERE is_period = true
  idx_records_sync_pending ON records(user_id) WHERE sync_pending = true

RLS: records_own — auth.uid() = user_id
```

---

## 05. `record_symptoms` — 記録×症状

```sql
CREATE TABLE public.record_symptoms (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       uuid        NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symptom_key     text        NOT NULL REFERENCES symptoms(key),

  -- Severity (将来実装。現在は出現有無のみ)
  severity        smallint    CHECK (severity BETWEEN 1 AND 5),
  note            text,

  recorded_at     date        NOT NULL,  -- records.record_date の denormalized copy

  UNIQUE (record_id, symptom_key)
);

INDEX:
  idx_rs_record    ON record_symptoms(record_id)
  idx_rs_user_sym  ON record_symptoms(user_id, symptom_key, recorded_at DESC)
  idx_rs_sym_date  ON record_symptoms(symptom_key, recorded_at DESC)

RLS: record_symptoms_own — auth.uid() = user_id
```

---

## 06. `record_factors` — 記録×ファクター

```sql
CREATE TABLE public.record_factors (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       uuid        NOT NULL REFERENCES records(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_key      text        NOT NULL REFERENCES factor_definitions(key),

  -- Intensity (将来実装)
  intensity       smallint    CHECK (intensity BETWEEN 1 AND 5),
  note            text,

  recorded_at     date        NOT NULL,

  UNIQUE (record_id, factor_key)
);

INDEX:
  idx_rf_record    ON record_factors(record_id)
  idx_rf_user_fac  ON record_factors(user_id, factor_key, recorded_at DESC)

RLS: record_factors_own — auth.uid() = user_id
```

---

## 07. `disease_profiles` — ユーザー疾患登録

```sql
CREATE TABLE public.disease_profiles (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_key     text    NOT NULL REFERENCES disease_definitions(key),

  -- Medical Context
  icd10_code      text,
  snomed_code     text,
  is_diagnosed    boolean NOT NULL DEFAULT false,
  diagnosis_date  date,
  diagnosed_by    text,   -- 'self'|'gp'|'specialist'|'hospital'
  status          text    NOT NULL DEFAULT 'ACTIVE',

  -- Timestamps
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, disease_key)
);

INDEX: idx_dp_user ON disease_profiles(user_id, status)
RLS: disease_profiles_own — auth.uid() = user_id
```

---

## 08. `experiments` — 実験

```sql
CREATE TABLE public.experiments (
  id                      uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Config (開始後変更不可 — experiment_events で変更を記録)
  experiment_type         text    NOT NULL,
  factor_key              text    NOT NULL REFERENCES factor_definitions(key),
  hypothesis              text,
  planned_days            smallint NOT NULL CHECK (planned_days BETWEEN 7 AND 180),
  disease_keys            text[]  NOT NULL DEFAULT '{}',
  target_symptoms         text[]  DEFAULT '{}',

  -- Lifecycle State (experiment_events の最新イベントを反映)
  status                  text    NOT NULL DEFAULT 'DRAFT',
  started_at              date,
  planned_end_at          date,
  actual_end_at           date,
  abandoned_at            timestamptz,
  abandon_reason          text,

  -- Medical
  is_medical_intervention boolean DEFAULT false,
  physician_involved      boolean,

  -- Outcome Link
  outcome_id              uuid    REFERENCES outcomes(id),

  -- Soft Delete
  is_deleted              boolean NOT NULL DEFAULT false,
  deleted_at              timestamptz,

  -- Audit
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

INDEX:
  idx_exp_user_status  ON experiments(user_id, status) WHERE is_deleted = false
  idx_exp_factor       ON experiments(factor_key, status)
  idx_exp_disease      ON experiments USING GIN(disease_keys)
  idx_exp_outcome      ON experiments(outcome_id) WHERE outcome_id IS NOT NULL

RLS: experiments_own — auth.uid() = user_id
```

---

## 09. `experiment_events` — 実験状態変更イベント

```sql
CREATE TABLE public.experiment_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   uuid        NOT NULL REFERENCES experiments(id),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),

  event_type      text        NOT NULL,
    -- 'CREATED'|'STARTED'|'PAUSED'|'RESUMED'|'COMPLETED'|'ABANDONED'|'CONFIG_CHANGED'

  from_status     text,
  to_status       text        NOT NULL,

  payload         jsonb,
    -- STARTED: {actual_start_date}
    -- COMPLETED: {actual_end_date, outcome_id}
    -- ABANDONED: {reason, days_completed}
    -- CONFIG_CHANGED: {field, old_value, new_value}

  occurred_at     timestamptz NOT NULL DEFAULT now()
);

INDEX:
  idx_ee_experiment ON experiment_events(experiment_id, occurred_at DESC)
  idx_ee_user_type  ON experiment_events(user_id, event_type)

RLS: experiment_events_own — auth.uid() = user_id
     experiment_events_insert — auth.uid() = user_id (INSERT のみ)
```

---

## 10. `outcomes` — 実験アウトカム (Immutable)

```sql
CREATE TABLE public.outcomes (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id           uuid        NOT NULL REFERENCES experiments(id),
  user_id                 uuid        NOT NULL REFERENCES auth.users(id),

  -- Measurement Periods
  before_period_start     date        NOT NULL,
  before_period_end       date        NOT NULL,
  after_period_start      date        NOT NULL,
  after_period_end        date        NOT NULL,
  before_record_count     smallint    NOT NULL,
  after_record_count      smallint    NOT NULL,

  -- Aggregated Metrics (MetricSnapshot型)
  before_metrics          jsonb       NOT NULL,
  after_metrics           jsonb       NOT NULL,
    -- {pain_level:{mean,sd,n}, energy:{mean,sd,n}, wellness_score:{mean,sd,n},
    --  symptom_frequency:{key:rate,...}, ...}

  -- Analysis Results
  effect_sizes            jsonb       NOT NULL DEFAULT '[]',
    -- [{metric, cohens_d, hedges_g, magnitude:'small'|'medium'|'large',
    --   direction:'improved'|'worsened'|'neutral', ci_lower, ci_upper}]
  primary_effect_size     numeric(6,4),   -- メイン指標の Cohen's d
  confidence_level        text        NOT NULL,
    -- 'high'|'medium'|'low'|'insufficient'
  confidence_factors      jsonb,
    -- {record_coverage_rate, before_n, after_n, confounders_detected[]}
  category                text        NOT NULL,
    -- 'IMPROVED'|'WORSENED'|'NO_CHANGE'|'INDETERMINATE'|'PARTIAL'
  quality_score           numeric(5,2),

  -- Medical Flag
  is_medical_intervention boolean     DEFAULT false,

  -- Versioning (再計算時は新行INSERT)
  version                 smallint    NOT NULL DEFAULT 1,
  superseded_by           uuid        REFERENCES outcomes(id),
    -- 再計算版がある場合にセット

  -- Timestamps (生成後 UPDATE 禁止)
  generated_at            timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

INDEX:
  idx_out_experiment   ON outcomes(experiment_id, version DESC)
  idx_out_user         ON outcomes(user_id, created_at DESC)
  idx_out_category     ON outcomes(category, confidence_level)

RLS: outcomes_own — auth.uid() = user_id
```

---

## 11. `anonymized_user_map` — 匿名化マッピング

```sql
CREATE TABLE public.anonymized_user_map (
  user_id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymized_id   uuid    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- CRITICAL: Service Role のみアクセス可
-- ユーザー自身も自分の anonymized_id を参照不可
-- RLS: 全ロールに SELECT/INSERT/UPDATE/DELETE を拒否
--      Service Role (RLS bypass) のみ操作可
ALTER TABLE anonymized_user_map ENABLE ROW LEVEL SECURITY;
-- ポリシーなし = 全拒否
```

---

## 12. `cases` — 症例 (Core Asset)

```sql
CREATE TABLE public.cases (
  -- Identity (CRITICAL: 変更不可)
  id                  text        PRIMARY KEY,
    -- 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}'
    -- 例: 'CASE-ENDO-202607-A3X9M2KP'

  anonymized_user_id  uuid        NOT NULL REFERENCES anonymized_user_map(anonymized_id),
  primary_disease_key text        NOT NULL REFERENCES disease_definitions(key),
  disease_keys        text[]      NOT NULL DEFAULT '{}',
  icd10_codes         text[]      DEFAULT '{}',

  -- Lifecycle
  status              text        NOT NULL DEFAULT 'PRE_CANDIDATE',
    -- 'PRE_CANDIDATE'|'CANDIDATE'|'TIER3'|'TIER2'|'TIER1'
    -- |'SUSPENDED'|'CONSENT_WITHDRAWN'|'INVALIDATED'|'ARCHIVED'
  tier                text,
    -- NULL | 'TIER3' | 'TIER2' | 'TIER1'

  -- Temporal
  case_start_date     date        NOT NULL,
  case_end_date       date,
  age_group           text,       -- '30-34' (症例生成時点の年齢層)
  geographic_region   text,       -- 都道府県コード (prefecture_code)

  -- Consent
  consent_id          uuid        REFERENCES consents(id),
  consent_level       smallint    NOT NULL DEFAULT 0,

  -- Quality (case_quality_scores から denormalized)
  quality_score       numeric(5,2),

  -- Denormalized for Search/Performance (バッチ更新)
  record_count        integer     DEFAULT 0,
  record_months       smallint    DEFAULT 0,
  experiment_ids      uuid[]      DEFAULT '{}',
  outcome_ids         uuid[]      DEFAULT '{}',
  completed_experiment_count smallint DEFAULT 0,
  primary_symptom_keys text[]     DEFAULT '{}',  -- 上位5症状

  -- Full-text Search
  search_vector       tsvector,
  search_metadata     jsonb       DEFAULT '{}',
    -- {disease_ja, tier_label, age_group, experiment_types[], outcome_categories[]}

  -- Visibility
  is_public           boolean     NOT NULL DEFAULT false,
    -- true = Tier2+ かつ consent_level >= 1

  -- Audit
  registered_at       timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at   timestamptz,
  version             smallint    NOT NULL DEFAULT 1,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

INDEX:
  idx_cases_disease      ON cases(primary_disease_key, status)
  idx_cases_tier_consent ON cases(tier, consent_level) WHERE is_public = true
  idx_cases_anon_user    ON cases(anonymized_user_id)
  idx_cases_disease_arr  ON cases USING GIN(disease_keys)
  idx_cases_symptoms     ON cases USING GIN(primary_symptom_keys)
  idx_cases_search_vec   ON cases USING GIN(search_vector)
  idx_cases_quality      ON cases(quality_score DESC) WHERE tier IS NOT NULL
  idx_cases_region       ON cases(geographic_region, primary_disease_key)

RLS:
  -- ユーザー自身の症例 (anonymized_id経由)
  cases_own FOR ALL USING (
    anonymized_user_id = (
      SELECT anonymized_id FROM anonymized_user_map WHERE user_id = auth.uid()
    )
  );
  -- PRO検索
  cases_pro_search FOR SELECT USING (
    is_public = true AND tier IN ('TIER2', 'TIER1') AND consent_level >= 1
  );
```

---

## 13. `case_snapshots` — 症例バージョン履歴

```sql
CREATE TABLE public.case_snapshots (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         text    NOT NULL REFERENCES cases(id),
  version         smallint NOT NULL,

  -- スナップショット時点の cases.*
  snapshot        jsonb   NOT NULL,

  -- 変更理由
  reason          text,
    -- 'QUALITY_RECALCULATED'|'TIER_PROMOTED'|'CONSENT_UPDATED'|'BATCH_UPDATE'

  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (case_id, version)
);

INDEX: idx_cs_case ON case_snapshots(case_id, version DESC)
-- RLS: Service Role のみ
```

---

## 14. `case_quality_scores` — 品質スコア詳細

```sql
CREATE TABLE public.case_quality_scores (
  case_id                     text    PRIMARY KEY REFERENCES cases(id),

  -- Composite Score (0-100)
  total_score                 numeric(5,2) NOT NULL,

  -- Component Scores
  record_volume_score         numeric(5,2),  -- 記録日数スコア (max 25)
  record_density_score        numeric(5,2),  -- カバレッジ率スコア (max 20)
  data_completeness_score     numeric(5,2),  -- 記録品質スコア (max 15)
  experiment_quality_score    numeric(5,2),  -- 実験品質スコア (max 20)
  outcome_quality_score       numeric(5,2),  -- アウトカム品質スコア (max 15)
  consent_score               numeric(5,2),  -- Consentスコア (max 5)
  disease_tag_multiplier      numeric(3,2),  -- 疾患診断ありで1.1倍

  -- Detail
  total_record_days           integer,
  coverage_rate               numeric(4,3),
  completed_experiments       smallint,
  primary_effect_size         numeric(6,4),

  -- Versioning
  version                     smallint    NOT NULL DEFAULT 1,
  calculated_at               timestamptz NOT NULL DEFAULT now()
);
```

---

## 15. `similarity_edges` — 症例類似グラフ

```sql
CREATE TABLE public.similarity_edges (
  case_id_a           text        NOT NULL REFERENCES cases(id),
  case_id_b           text        NOT NULL REFERENCES cases(id),

  -- Scores
  similarity_score    numeric(6,5) NOT NULL,  -- 0.00000 - 1.00000
  disease_overlap     numeric(4,3),
  symptom_overlap     numeric(4,3),
  experiment_type_match boolean,
  outcome_match       boolean,
  age_group_match     boolean,

  -- Version Management
  algorithm_version   text        NOT NULL DEFAULT 'v1',
  calculated_at       timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (case_id_a, case_id_b),
  CHECK (case_id_a < case_id_b)  -- A < B 強制で重複排除
);

INDEX:
  idx_sim_a_score ON similarity_edges(case_id_a, similarity_score DESC)
  idx_sim_b_score ON similarity_edges(case_id_b, similarity_score DESC)

-- RLS: PRO ユーザーが参照可 (case_pro_searchポリシーに依存)
```

---

## 16. `consents` — 同意状態 (Denormalized Cache)

```sql
CREATE TABLE public.consents (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Consent Scope
  consent_type        text    NOT NULL DEFAULT 'PLATFORM',
    -- 'PLATFORM'|'CASE_PUBLICATION'|'RESEARCH'|'AI_TRAINING'|'COMMERCIAL'
  level               smallint NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4),

  -- Status (consent_events の最新から導出)
  status              text    NOT NULL DEFAULT 'PENDING',
    -- 'PENDING'|'PRESENTED'|'GRANTED'|'WITHDRAWN'|'EXPIRED'|'SUSPENDED'

  -- Policy
  policy_version      text    NOT NULL,
  jurisdiction        text    NOT NULL DEFAULT 'JP',
    -- 'JP'|'EU'|'US'|'OTHER'

  -- Legal Evidence
  ip_hash             text,
  user_agent_hash     text,

  -- Timing
  presented_at        timestamptz,
  granted_at          timestamptz,
  withdrawn_at        timestamptz,
  expires_at          timestamptz,

  -- Timestamps
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, consent_type, jurisdiction)
);

INDEX:
  idx_consents_user     ON consents(user_id, consent_type)
  idx_consents_status   ON consents(status, consent_type)

RLS: consents_own — auth.uid() = user_id
```

---

## 17. `consent_events` — 同意イベントログ (Source of Truth)

```sql
CREATE TABLE public.consent_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id      uuid        NOT NULL REFERENCES consents(id),
  user_id         uuid        NOT NULL REFERENCES auth.users(id),

  event_type      text        NOT NULL,
    -- 'PRESENTED'|'GRANTED'|'WITHDRAWN'|'EXPIRED'|'SUSPENDED'
    -- |'LEVEL_CHANGED'|'POLICY_UPDATED'|'JURISDICTION_CHANGED'

  from_level      smallint,
  to_level        smallint,
  from_status     text,
  to_status       text        NOT NULL,

  policy_version  text        NOT NULL,
  jurisdiction    text        NOT NULL,

  -- Legal Evidence
  ip_hash         text,
  user_agent_hash text,

  payload         jsonb,
    -- 追加情報 (理由, フォームID等)

  occurred_at     timestamptz NOT NULL DEFAULT now()
  -- UPDATE/DELETE 禁止。INSERT ONLY
);

INDEX:
  idx_ce_consent   ON consent_events(consent_id, occurred_at DESC)
  idx_ce_user_type ON consent_events(user_id, event_type, occurred_at DESC)

RLS:
  consent_events_own_read  FOR SELECT USING (auth.uid() = user_id)
  consent_events_insert    FOR INSERT WITH CHECK (auth.uid() = user_id)
  -- UPDATE/DELETE ポリシーなし = 禁止
```

---

## 18-20. マスターデータ

```sql
-- 18. symptoms
CREATE TABLE public.symptoms (
  key             text    PRIMARY KEY,  -- 'lower_abdominal_pain'
  display_name_ja text    NOT NULL,
  display_name_en text,
  layer           smallint NOT NULL CHECK (layer IN (1, 2, 3)),
  is_sensitive    boolean DEFAULT false,
  meddra_code     text,
  snomed_code     text,
  nci_code        text,
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE POLICY symptoms_public_read ON symptoms FOR SELECT USING (true);

-- 19. factor_definitions
CREATE TABLE public.factor_definitions (
  key             text    PRIMARY KEY,  -- 'caffeine'
  display_name_ja text    NOT NULL,
  display_name_en text,
  category        text,   -- 'dietary'|'lifestyle'|'environmental'|'supplement'|'medical'
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE POLICY factors_public_read ON factor_definitions FOR SELECT USING (true);

-- 20. disease_definitions
CREATE TABLE public.disease_definitions (
  key             text    PRIMARY KEY,  -- 'endometriosis' (CRITICAL: 変更禁止)
  display_name_ja text    NOT NULL,
  display_name_en text,
  icd10_code      text,   -- 'N80'
  icd10_subcode   text,   -- 'N80.0'
  snomed_code     text,
  disease_prefix  text    NOT NULL UNIQUE,  -- 'ENDO' (Case ID用。変更禁止)
  category        text,   -- 'endometriosis_family'|'ovarian'|'hormonal'|'pelvic'
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE POLICY diseases_public_read ON disease_definitions FOR SELECT USING (true);
```

---

## 21. `audit_log` — 汎用監査ログ

```sql
CREATE TABLE public.audit_log (
  id              bigserial   PRIMARY KEY,  -- 高速append
  table_name      text        NOT NULL,
  record_id       text        NOT NULL,     -- uuid or case_id (text統一)
  action          text        NOT NULL,
    -- 'INSERT'|'UPDATE'|'DELETE'|'STATUS_CHANGE'|'TIER_CHANGE'
  performed_by    uuid,                     -- auth.uid() (system操作はNULL)
  performed_by_role text,                   -- 'user'|'service'|'batch'|'admin'
  before_value    jsonb,
  after_value     jsonb,
  reason          text,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

INDEX: idx_al_table_record ON audit_log(table_name, record_id, occurred_at DESC)
-- RLS: Service Role のみ INSERT。SELECT は Admin のみ
```

---

## 22. `anonymization_log` — 匿名化実行記録

```sql
CREATE TABLE public.anonymization_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         text        NOT NULL REFERENCES cases(id),
  stage           smallint    NOT NULL,  -- 1: 仮名化 / 2: k-anonymity / 3: 集計
  algorithm       text        NOT NULL,  -- 'pseudonymization-v1' / 'k-anon-k5-v1'
  k_value         smallint,              -- k-anonymity の k
  group_size      smallint,              -- 同グループの症例数
  passed          boolean     NOT NULL,
  suppressed      boolean     NOT NULL DEFAULT false,
  executed_at     timestamptz NOT NULL DEFAULT now(),
  executor        text        NOT NULL   -- 'batch-nightly'|'manual'
);

INDEX: idx_anon_log_case ON anonymization_log(case_id, executed_at DESC)
```

---

## 23. `research_exports` — 研究利用エクスポート記録

```sql
CREATE TABLE public.research_exports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by    text        NOT NULL,   -- 研究者ID or 組織名
  irb_number      text,                   -- IRB審査番号
  purpose         text        NOT NULL,   -- 利用目的
  disease_keys    text[]      NOT NULL,
  export_query    jsonb       NOT NULL,   -- フィルタ条件
  case_count      integer     NOT NULL,
  consent_level_min smallint  NOT NULL,

  -- Anonymization Applied
  k_value         smallint    NOT NULL DEFAULT 5,
  anonymization_stage smallint NOT NULL DEFAULT 2,

  -- Status
  status          text        NOT NULL DEFAULT 'PENDING',
    -- 'PENDING'|'APPROVED'|'EXPORTED'|'REJECTED'|'EXPIRED'
  approved_at     timestamptz,
  exported_at     timestamptz,
  expires_at      timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

# 出力4: RECORD SCHEMA 詳細設計

## 設計決定: 正規化 + Denormalized Array の併用

```
WHY:
  record_symptoms / record_factors テーブルは将来の「強度」「メモ」拡張のために正規化
  records.symptom_keys[] / factor_keys[] は GIN インデックスで高速フィルタ用に維持
  両者は trigger で同期する (trigger または application layer で選択)
```

## 症状の保持方法

```
症状エンティティ:
  正規化: record_symptoms (record_id, symptom_key, severity, note)
  高速参照: records.symptom_keys[] (GIN インデックス付き)

症状キーの英語化 (CRITICAL):
  現在: ['下腹部痛', '腰痛', '頭痛']  → 廃止
  移行後: ['lower_abdominal_pain', 'lower_back_pain', 'headache']

マッピングテーブル (Phase B バックフィル用):
  日本語 → 英語キー の変換マップは migration スクリプトに定義
  例: '下腹部痛' → 'lower_abdominal_pain'
```

## 食事の保持方法

```
records.meal_detail (JSONB):
  {
    "morning": {"text": "玄米・味噌汁", "time": "07:30"},
    "lunch":   {"text": "サラダ・豆腐", "time": "12:00"},
    "dinner":  {"text": "魚・野菜", "time": "19:00"},
    "snack":   {"text": "ナッツ", "time": "15:00"}
  }

  WHY JSONB: 食事の記録形式は将来変更される可能性が高い
  (カロリー推定、血糖負荷などの追加を想定)
  検索対象にならないため JSONB で問題なし
```

## 睡眠の保持方法

```
records.sleep_quality (smallint 1-5):
  現在の実装と同じ。5段階評価。

将来実装予定 (schema変更なし):
  records.sleep_detail (JSONB) カラムを追加
  {"hours": 7.5, "bedtime": "23:00", "wake_time": "06:30", "quality_note": "..."}
```

## 断食の保持方法

```
records.fasting_hours (numeric 4,1):
  記録日の断食時間。0.0 〜 72.0

records.fasting_goal_hours (numeric 4,1):
  目標断食時間 (16, 24 等)

WHY: 断食は「その日何時間断食したか」が核心。
     開始/終了時刻は profiles.fasting_* または app状態で管理。
     症例DBに断食詳細は不要。
```

## 周期の保持方法

```
records.period_day (smallint):
  生理n日目。0 = 生理なし。
  is_period (GENERATED) = period_day > 0

周期計算はアプリ側で:
  profiles.cycle_length, profiles.last_period_date を使用
  cycle-engine.js (pure function) が担当 → schema 変更なし

将来: period_detail JSONB
  {"flow": "medium", "color": "red", "clots": false}
```

## ファクターの保持方法

```
正規化: record_factors (record_id, factor_key, intensity)
高速参照: records.factor_keys[] (GIN インデックス付き)

現在の20ファクター → factor_definitions マスターに移行:
  caffeine, alcohol, sugar, gluten, dairy, ...
```

---

# 出力5: EXPERIMENT SCHEMA

## Event Sourcing 評価

**決定: 軽量 Event Log (experiment_events) を採用。フル Event Sourcing は不採用**

```
フル Event Sourcing が必要な条件:
  ✓ 過去の任意時点の状態を再現する必要がある
  ✓ イベントからの状態導出が複雑
  ✓ 法的証拠能力が必要

Experiment の評価:
  ✗ 任意時点の再現は不要 (Outcomeが最終結果)
  ✗ 状態遷移はシンプル (DRAFT→ACTIVE→COMPLETED)
  ✗ 法的証拠はConsentで担保 (Experimentには不要)
  ✓ 変更履歴は監査のために欲しい

結論:
  experiments テーブルに現在状態
  experiment_events テーブルに変更ログ
  の組み合わせで十分
```

## 状態管理

```
状態遷移図:
  DRAFT ──start()──→ ACTIVE ──complete()──→ COMPLETED
    │                   │
    └──delete()──→ (soft deleted)
                    │
                    └──abandon()──→ ABANDONED

各遷移で experiment_events に INSERT:
  DRAFT → ACTIVE:
    event_type = 'STARTED'
    payload = {actual_start_date, baseline_end_date}
    → experiments.status を ACTIVE に UPDATE

  ACTIVE → COMPLETED:
    event_type = 'COMPLETED'
    payload = {actual_end_date, outcome_id}
    → experiments.status を COMPLETED
    → experiments.outcome_id をセット

  ACTIVE → ABANDONED:
    event_type = 'ABANDONED'
    payload = {reason, days_completed}
    → experiments.status を ABANDONED

制約:
  COMPLETED / ABANDONED 後は CONFIG_CHANGED を禁止
  1 Experiment = 1 factor_key (単一ファクター原則)
  is_medical_intervention = true の場合は physician_involved が必須
```

---

# 出力6: OUTCOME SCHEMA

## 再計算可能性の設計

```
原則: Outcome は Immutable + Version管理

再計算フロー:
  1. 再計算トリガー (アルゴリズム変更, バグ修正 等)
  2. 新しい outcomes 行を INSERT (version = old_version + 1)
  3. 旧行の superseded_by = 新行のID にセット
  4. experiments.outcome_id = 新行のID に UPDATE
  5. cases の outcome_ids[] を新IDで更新

最新版の取得:
  SELECT * FROM outcomes
  WHERE experiment_id = $1
  AND superseded_by IS NULL
  ORDER BY version DESC
  LIMIT 1

全バージョン履歴:
  SELECT * FROM outcomes
  WHERE experiment_id = $1
  ORDER BY version ASC

WHY Immutable:
  製薬企業監査で「スコアがいつ変わったか」を説明できる
  研究利用したデータが後から変わることを防ぐ
```

## Before/After の保持

```
before_metrics / after_metrics (JSONB):
  {
    "pain_level":      {"mean": 6.2, "sd": 1.8, "n": 21},
    "energy":          {"mean": 2.1, "sd": 0.9, "n": 21},
    "wellness_score":  {"mean": 2.4, "sd": 1.0, "n": 21},
    "sleep_quality":   {"mean": 2.8, "sd": 1.1, "n": 21},
    "symptom_frequency": {
      "lower_abdominal_pain": 0.81,
      "fatigue": 0.71,
      "lower_back_pain": 0.43
    }
  }

effect_sizes (JSONB Array):
  [
    {
      "metric": "pain_level",
      "cohens_d": -0.85,
      "hedges_g": -0.82,
      "magnitude": "large",
      "direction": "improved",
      "ci_lower": -1.24,
      "ci_upper": -0.46,
      "p_value": 0.003
    },
    {
      "metric": "lower_abdominal_pain_frequency",
      "cohens_d": -0.62,
      ...
    }
  ]

WHY JSONB:
  将来の指標追加 (体温, 周期長など) に対応
  SQLで集計する場合は jsonb_array_elements() を使用
```

---

# 出力7: CASE SCHEMA

## Case をどこまで保存するか — 設計決定

```
保存する (cases テーブル):
  ✓ anonymized_user_id (実IDは保持しない)
  ✓ primary_disease_key + disease_keys[] (疾患分類)
  ✓ icd10_codes[] (国際標準コード、研究利用)
  ✓ tier / status (公開レベル)
  ✓ quality_score (集計品質指標)
  ✓ consent_level (公開許可レベル)
  ✓ age_group (5歳刻み、特定不可)
  ✓ geographic_region (都道府県のみ)
  ✓ case_start_date の年のみ (record_months で期間)
  ✓ experiment_ids[] / outcome_ids[] (参照)
  ✓ primary_symptom_keys[] (上位5症状、匿名化済)
  ✓ search_vector (全文検索)

保存しない (cases テーブル):
  ✗ user_id (直接参照)
  ✗ 正確な生年月日
  ✗ 市区町村以下の住所
  ✗ 個別の記録日付
  ✗ メモ・自由記述テキスト
  ✗ 医師名・病院名
  ✗ IP アドレス (直接)
```

## Case Snapshot

```
case_snapshots テーブル:
  cases の version が上がるたびに前バージョンをスナップショット
  snapshot = cases.* の JSON dump

用途:
  製薬監査: 「いつ Tier が上がったか」の証拠
  バグ調査: 「品質スコアがなぜ変わったか」の調査
  研究利用: 「このエクスポート時点のCaseの状態」の再現

保持期間: 無期限 (症例の証跡として)
```

## Case Tier 定義 (確定版)

```
PRE_CANDIDATE: record_days < 30 または disease_tag = 0
CANDIDATE:     record_days >= 30, coverage >= 60%, disease_tag >= 1
               ユーザー未承認

TIER3: quality_score >= 30
       ユーザー承認済 + consent_level >= 1
       公開: ユーザー自身のみ参照可

TIER2: quality_score >= 55
       record_days >= 90
       completed_experiments >= 1
       公開: PRO会員が検索可 (匿名)

TIER1: quality_score >= 75
       record_days >= 180
       completed_experiments >= 2
       consent_level >= 2
       公開: 研究利用可
```

## Case Searchability

```
Full-text Search (search_vector tsvector):
  疾患名 (JA/EN) + 症状名 (JA) + 実験タイプ + アウトカム区分
  GIN インデックスで高速化
  更新: cases.search_vector をバッチで再計算

Structured Filter:
  primary_disease_key, tier, age_group, geographic_region,
  primary_symptom_keys (GIN), quality_score, record_months

PRO Search Query 例:
  SELECT * FROM cases
  WHERE primary_disease_key = 'endometriosis'
    AND tier IN ('TIER2', 'TIER1')
    AND consent_level >= 1
    AND age_group = '30-34'
    AND 'lower_abdominal_pain' = ANY(primary_symptom_keys)
  ORDER BY quality_score DESC
  LIMIT 20
```

---

# 出力8: CONSENT SCHEMA

## Consent Type 設計

```
consent_type の種別:

'PLATFORM':
  ippo アプリの利用規約・プライバシーポリシーへの同意
  level 1 相当
  全ユーザーに必須

'CASE_PUBLICATION':
  自分の症例を匿名で他のPROユーザーに公開する同意
  level 1 相当
  PRO機能利用時に必要

'RESEARCH':
  学術研究・医療研究への匿名データ提供同意
  level 2 相当
  TIER1 Case の条件

'AI_TRAINING':
  AI モデルの学習への匿名データ利用同意
  level 2 相当 (RESEARCH と同時取得可)

'COMMERCIAL':
  製薬企業・商業利用への匿名データ提供同意
  level 3 相当
  Consent Level 3

設計: 1 ユーザー × 1 consent_type × 1 jurisdiction = 1 行
     (UNIQUE 制約)
```

## 法域差異の対応

```
jurisdiction = 'JP' (APPI):
  同意年齢: 18歳以上
  撤回: 即時有効
  集計値不遡及: Privacy Policyで明記
  保持期間: 同意記録 10年

jurisdiction = 'EU' (GDPR):
  同意年齢: 16歳以上 (加盟国により13歳まで引き下げ可)
  撤回: 即時有効
  データポータビリティ: エクスポート機能必須
  削除権: 仮名化データは削除不要 (匿名化済みのため)
  DPA への届出: データ侵害から72時間以内
  SCCs: EU 外転送時に必要

jurisdiction = 'US' (HIPAA/CCPA):
  HIPAA: 医療データ = PHI。De-identification が必須
  CCPA: カリフォルニア居住者は削除権・ポータビリティ権
  オプトアウト方式 (EU のオプトイン方式と逆)

実装への影響:
  consents テーブルに jurisdiction カラム
  EU ユーザーは物理的に EU リージョンの DB に保存 (Phase F)
  HIPAA 対応は US 展開時に BAA (Business Associate Agreement) 締結
```

## Consent Level × Type マッピング

```
Level 0: consent_type='PLATFORM' status!='GRANTED'
Level 1: consent_type='PLATFORM' GRANTED
          + consent_type='CASE_PUBLICATION' GRANTED (PRO機能向け)
Level 2: Level1 + consent_type='RESEARCH' GRANTED
Level 3: Level2 + consent_type='COMMERCIAL' GRANTED
Level 4: 使用しない (EU では consent_type='COMMERCIAL' の GDPR整合性が不明確)
```

---

# 出力9: SIMILARITY SCHEMA

## リアルタイム vs バッチ — 設計決定

**決定: バッチ生成 (夜間)。リアルタイム計算は採用しない**

```
理由:
  10万症例の総当たり = 50億ペア → リアルタイムは不可能
  新規Caseが追加されるのは毎日数十件 → 翌朝の類似更新で十分
  PRO検索は「昨夜計算した類似症例リスト」で十分なユーザー体験

バッチ設計:
  対象: 同一 primary_disease_key 内のTIER2+症例のみ
  スケジュール: 毎日 02:00 JST (pg_cron)
  差分更新: last_evaluated_at 以降に更新された cases のみ再計算
  上位保存: 各Caseあたり上位30件のエッジのみ保存

将来の pgvector 移行:
  現在: Jaccard係数 (symptom_keys, disease_keys の集合演算)
  将来: pgvector (症例のベクトル表現で ANN 近似最近傍)
  schema への影響: similarity_edges に vector_similarity カラム追加のみ
```

## Similarity Score 計算式 (v1)

```
similarity_score =
  disease_overlap × 0.35
  + symptom_overlap × 0.30
  + experiment_type_match × 0.15
  + outcome_match × 0.10
  + age_group_match × 0.10

disease_overlap = |A.disease_keys ∩ B.disease_keys| / |A.disease_keys ∪ B.disease_keys|
symptom_overlap = |A.primary_symptom_keys ∩ B.primary_symptom_keys| / 5 (上位5症状)

algorithm_version = 'v1' でバージョン管理
バージョン変更時は全エッジを再計算 + algorithm_version='v2' で再INSERT
```

---

# 出力10: INDEX STRATEGY

## 10万症例 / 100万 Experiment での Index 設計

### records テーブル (推定: 3,000万行)

```sql
-- 必須 (ユーザーの記録取得)
CREATE INDEX idx_records_user_date
  ON records(user_id, record_date DESC)
  WHERE is_deleted = false;
-- → WHERE user_id = $1 ORDER BY record_date DESC の全クエリ

-- 症状フィルタ (Experiment期間の症状集計)
CREATE INDEX idx_records_symptoms
  ON records USING GIN(symptom_keys)
  WHERE is_deleted = false;

-- ファクターフィルタ
CREATE INDEX idx_records_factors
  ON records USING GIN(factor_keys)
  WHERE is_deleted = false;

-- 生理日フィルタ (周期分析)
CREATE INDEX idx_records_period
  ON records(user_id, record_date)
  WHERE is_period = true AND is_deleted = false;

-- 同期待ちフィルタ
CREATE INDEX idx_records_sync
  ON records(user_id)
  WHERE sync_pending = true;
```

### experiments テーブル (推定: 200万行)

```sql
-- ユーザーの実験一覧
CREATE INDEX idx_exp_user_status
  ON experiments(user_id, status)
  WHERE is_deleted = false;

-- 疾患別実験集計 (改善ランキング用)
CREATE INDEX idx_exp_disease_status
  ON experiments USING GIN(disease_keys);

-- ファクター別実験集計
CREATE INDEX idx_exp_factor
  ON experiments(factor_key, status)
  WHERE status = 'COMPLETED';

-- Outcome リンク
CREATE INDEX idx_exp_outcome
  ON experiments(outcome_id)
  WHERE outcome_id IS NOT NULL;
```

### outcomes テーブル (推定: 200万行)

```sql
-- 最新バージョン取得
CREATE INDEX idx_out_exp_version
  ON outcomes(experiment_id, version DESC)
  WHERE superseded_by IS NULL;

-- カテゴリ別集計 (改善ランキング Materialized View 用)
CREATE INDEX idx_out_category_disease
  ON outcomes(category, confidence_level);

-- ユーザーのアウトカム一覧
CREATE INDEX idx_out_user_date
  ON outcomes(user_id, created_at DESC);
```

### cases テーブル (推定: 10万行)

```sql
-- PRO検索メインクエリ
CREATE INDEX idx_cases_pro_search
  ON cases(primary_disease_key, tier, consent_level, quality_score DESC)
  WHERE is_public = true;

-- 疾患タグ検索
CREATE INDEX idx_cases_disease_arr
  ON cases USING GIN(disease_keys);

-- 症状タグ検索
CREATE INDEX idx_cases_symptoms
  ON cases USING GIN(primary_symptom_keys);

-- 全文検索
CREATE INDEX idx_cases_search_vec
  ON cases USING GIN(search_vector);

-- 年齢×疾患 (k-anonymity チェック用)
CREATE INDEX idx_cases_age_disease
  ON cases(age_group, primary_disease_key)
  WHERE tier IS NOT NULL;

-- 地域検索
CREATE INDEX idx_cases_region
  ON cases(geographic_region, primary_disease_key)
  WHERE is_public = true;
```

### similarity_edges テーブル (推定: 300万行 = 10万×30)

```sql
-- PRO 類似検索
CREATE INDEX idx_sim_a_score
  ON similarity_edges(case_id_a, similarity_score DESC);
CREATE INDEX idx_sim_b_score
  ON similarity_edges(case_id_b, similarity_score DESC);
-- 注: B→A の検索も idx_sim_b_score で対応
```

### consent_events テーブル (推定: 50万行)

```sql
-- 最新 Consent 状態取得
CREATE INDEX idx_ce_consent_latest
  ON consent_events(consent_id, occurred_at DESC);

-- GDPR 監査: ユーザーの全同意履歴
CREATE INDEX idx_ce_user_history
  ON consent_events(user_id, occurred_at DESC);
```

### Materialized Views (夜間バッチで更新)

```sql
-- 改善ランキング (PRO画面のメインコンテンツ)
CREATE MATERIALIZED VIEW mv_improvement_ranking AS
  SELECT
    e.disease_keys[1]        AS primary_disease_key,
    e.experiment_type,
    e.factor_key,
    COUNT(*)                 AS experiment_count,
    AVG(o.primary_effect_size) AS avg_effect_size,
    COUNT(CASE WHEN o.category = 'IMPROVED' THEN 1 END)::float
      / NULLIF(COUNT(*), 0)  AS improvement_rate,
    AVG(o.quality_score)     AS avg_quality_score
  FROM outcomes o
  JOIN experiments e ON e.id = o.experiment_id
  WHERE o.superseded_by IS NULL
    AND o.confidence_level IN ('high', 'medium')
  GROUP BY 1, 2, 3
  HAVING COUNT(*) >= 3;  -- 3件未満は非表示

CREATE UNIQUE INDEX ON mv_improvement_ranking(primary_disease_key, factor_key);

-- 症例件数サマリー (ホーム統計)
CREATE MATERIALIZED VIEW mv_case_stats AS
  SELECT
    primary_disease_key,
    tier,
    COUNT(*) AS case_count,
    AVG(quality_score) AS avg_quality
  FROM cases
  WHERE is_public = true
  GROUP BY 1, 2;
```

---

# 出力11: RLS DESIGN

## 権限ロールの定義

```
Role 1: anon (未認証)
  読み取り: symptoms / factor_definitions / disease_definitions
  書き込み: なし

Role 2: authenticated (一般ユーザー)
  自分のデータ: 全CRUD (is_deleted = false)
  他人のデータ: なし
  症例: 自分の症例 (anonymized_id経由)

Role 3: authenticated + is_premium (Premiumユーザー)
  Role 2 の全権限
  + PRO症例検索: is_public = true の TIER2/TIER1 症例を SELECT
  ※ premium 判定は profiles.is_premium または subscriptions.status で

Role 4: service_role (Edge Functions / バッチ)
  全テーブルへの全操作 (RLS bypass)
  audit_log / consent_events / anonymized_user_map を操作

Role 5: admin (管理者 — 将来実装)
  audit_log の SELECT
  cases の status 変更
  research_exports の APPROVE
```

## RLS ポリシー一覧

```sql
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_profiles_own ON profiles
  USING (auth.uid() = id);

-- records
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_records_own ON records
  USING (auth.uid() = user_id);

-- record_symptoms / record_factors (同じパターン)
ALTER TABLE record_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_rs_own ON record_symptoms
  USING (auth.uid() = user_id);

-- experiments
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_exp_own ON experiments
  USING (auth.uid() = user_id);

-- experiment_events
ALTER TABLE experiment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ee_own_read ON experiment_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_ee_own_insert ON experiment_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE/DELETE ポリシーなし = 禁止

-- outcomes
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_out_own ON outcomes
  USING (auth.uid() = user_id);

-- consents
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_con_own ON consents
  USING (auth.uid() = user_id);

-- consent_events
ALTER TABLE consent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_ce_own_read ON consent_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY p_ce_own_insert ON consent_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- disease_profiles
ALTER TABLE disease_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dp_own ON disease_profiles
  USING (auth.uid() = user_id);

-- cases: 自分のケース (anonymized_id 経由)
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_cases_own ON cases
  USING (
    anonymized_user_id = (
      SELECT anonymized_id
      FROM anonymized_user_map
      WHERE user_id = auth.uid()
    )
  );

-- cases: PRO検索 (Premium ユーザーのみ)
CREATE POLICY p_cases_pro_search ON cases
  FOR SELECT
  USING (
    is_public = true
    AND tier IN ('TIER2', 'TIER1')
    AND consent_level >= 1
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_premium = true
    )
  );

-- similarity_edges: PRO ユーザーが参照可
ALTER TABLE similarity_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sim_pro ON similarity_edges
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_premium = true
    )
  );

-- case_quality_scores: cases と同じ可視性
ALTER TABLE case_quality_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_cqs_pro ON case_quality_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cases c
      WHERE c.id = case_id
      AND (
        c.anonymized_user_id = (
          SELECT anonymized_id FROM anonymized_user_map WHERE user_id = auth.uid()
        )
        OR (c.is_public = true AND c.tier IN ('TIER2','TIER1'))
      )
    )
  );

-- anonymized_user_map: 全ロール拒否 (Service Role のみ)
ALTER TABLE anonymized_user_map ENABLE ROW LEVEL SECURITY;
-- ポリシーなし

-- audit_log / consent_events / anonymization_log:
-- SELECT は Service Role / Admin のみ
-- INSERT は Service Role のみ

-- Master Data: 全ユーザー読み取り可
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_sym_read ON symptoms FOR SELECT USING (true);
ALTER TABLE factor_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_fac_read ON factor_definitions FOR SELECT USING (true);
ALTER TABLE disease_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_dis_read ON disease_definitions FOR SELECT USING (true);
```

---

# 出力12: AUDITABILITY DESIGN

## 製薬企業監査への対応

```
監査で問われること → 対応するテーブル/カラム:

Q: このデータに本人の同意はあるか？
A: consent_events に同意取得日・ポリシーバージョン・IPハッシュが記録
   consent_events.event_type = 'GRANTED', occurred_at, policy_version

Q: このCaseはいつどのようにして生成されたか？
A: cases.registered_at + case_snapshots (全バージョン)
   audit_log (action='INSERT', table_name='cases')

Q: このスコアはいつ変わったか？ なぜ変わったか？
A: audit_log (table_name='case_quality_scores', before_value, after_value)
   case_snapshots の version 比較

Q: このOutcomeはどのアルゴリズムで計算されたか？
A: outcomes.version + superseded_by チェーン
   audit_log の reason カラムにアルゴリズムバージョン記録

Q: このデータは適切に匿名化されたか？
A: anonymization_log (stage, algorithm, k_value, group_size, passed)
   research_exports.anonymization_stage + k_value
```

## GDPR 監査への対応

```
データ主体の権利と実装:

1. アクセス権 (Right to Access):
   → ユーザーが自分のデータをダウンロードできる機能
   → records / experiments / outcomes / consents の全データを JSON エクスポート

2. 削除権 (Right to Erasure):
   → records: is_deleted = true (復元可能)
   → profiles: 物理削除 → auth.users 削除でカスケード
   → anonymized_user_map: 削除不可 (匿名化済み症例の整合性のため)
   → consent_events: 削除不可 (法的証拠)
   → Privacy Policy に「集計値への削除不遡及」を明記

3. ポータビリティ権 (Right to Data Portability):
   → JSON エクスポート機能 (アクセス権と共通実装)

4. 異議申立権:
   → consent_events の WITHDRAWN で対応

5. 処理制限権:
   → consents.status = 'SUSPENDED' で対応
```

## 研究利用監査への対応

```
IRB (倫理審査委員会) 監査に必要な証跡:

research_exports テーブル:
  irb_number    — IRB審査番号 (監査で最初に問われる)
  purpose       — 利用目的
  export_query  — どのデータを取ったか
  case_count    — 件数
  consent_level_min — 同意レベルの下限
  k_value       — 匿名化 k 値
  approved_at   — 承認日時
  exported_at   — エクスポート日時

anonymization_log テーブル:
  各症例がk-anonymity検査を通過したことの証明
```

---

# 出力13: MIGRATION DESIGN

## 無停止移行の設計

```
原則:
  1. 既存テーブルは一切削除しない (user_data / user_records は移行期間保持)
  2. 既存アプリの動作は移行中もそのまま維持
  3. 移行は機能単位で段階的に実施
  4. ロールバックが常に可能な状態を維持
```

## Migration ファイル一覧

### Group A: マスターデータ (依存なし・最初に実行)

```sql
-- M-001: disease_definitions
-- M-002: symptoms (33症状 + 英語キー)
-- M-003: factor_definitions (20ファクター + 英語キー)
```

### Group B: ユーザードメイン拡張

```sql
-- M-010: disease_profiles テーブル
-- M-011: anonymized_user_map テーブル
-- M-012: subscriptions テーブル (既存あり → 変更のみ)
```

### Group C: Record ドメイン正規化

```sql
-- M-020: records テーブルに新カラム追加
  ALTER TABLE records
    ADD COLUMN IF NOT EXISTS symptom_keys     text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS factor_keys      text[]  DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pain_level       smallint,
    ADD COLUMN IF NOT EXISTS energy           smallint,
    ADD COLUMN IF NOT EXISTS sleep_quality    smallint,
    ADD COLUMN IF NOT EXISTS wellness_score   smallint,
    ADD COLUMN IF NOT EXISTS mood             smallint,
    ADD COLUMN IF NOT EXISTS body_temp        numeric(4,1),
    ADD COLUMN IF NOT EXISTS period_day       smallint,
    ADD COLUMN IF NOT EXISTS fasting_hours    numeric(4,1),
    ADD COLUMN IF NOT EXISTS fasting_goal_hours numeric(4,1),
    ADD COLUMN IF NOT EXISTS meal_detail      jsonb,
    ADD COLUMN IF NOT EXISTS is_deleted       boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at       timestamptz,
    ADD COLUMN IF NOT EXISTS client_created_at timestamptz,
    ADD COLUMN IF NOT EXISTS sync_pending     boolean DEFAULT false;

-- M-021: record_symptoms テーブル
-- M-022: record_factors テーブル
-- M-023: UNIQUE 制約 (user_id, record_date) の追加
  -- 注: 重複がある場合はバックフィル前に dedup が必要
```

### Group D: Experiment / Outcome ドメイン

```sql
-- M-030: experiments テーブル
-- M-031: experiment_events テーブル
-- M-032: outcomes テーブル
```

### Group E: Consent ドメイン

```sql
-- M-040: consents テーブル
-- M-041: consent_events テーブル
```

### Group F: Case ドメイン

```sql
-- M-050: cases テーブル
-- M-051: case_snapshots テーブル
-- M-052: case_quality_scores テーブル
-- M-053: similarity_edges テーブル
```

### Group G: Audit / Infrastructure

```sql
-- M-060: audit_log テーブル
-- M-061: anonymization_log テーブル
-- M-062: research_exports テーブル
```

### Group H: Index 作成 (オンライン, テーブルロックなし)

```sql
-- M-070: 全 Index を CREATE INDEX CONCURRENTLY で作成
-- 注: CREATE INDEX CONCURRENTLY はトランザクション外で実行
```

### Group I: バックフィル (本番データ移行)

```sql
-- M-080: user_data.state.records[] → records テーブルへのバックフィル
  -- 実装: Edge Function (batch-backfill-records) をバッチ実行
  -- 1ユーザーずつ処理。失敗しても他ユーザーに影響しない
  -- 日本語symptoms → 英語 symptom_keys の変換を同時実施

-- M-081: user_data.state.experiments[] → experiments テーブル
-- M-082: user_data.state.myDiseases[] → disease_profiles
-- M-083: anonymized_user_map の全ユーザー分を生成
```

### Group J: Dual Write 期間 (30〜90日間)

```
application layer での Dual Write:
  record/save.js が records (新) + user_records (旧) に両方書く
  実験開始/完了が experiments (新) にも書く

監視:
  records と user_records の件数を毎日比較
  差異があれば Slack 通知
```

### Group K: 旧テーブル廃止

```sql
-- M-090: user_records テーブルの廃止 (Dual Write 検証完了後)
  -- Step 1: reads を records に切替
  -- Step 2: writes の Dual Write を停止 (新のみ)
  -- Step 3: user_records を DROP

-- M-091: user_data テーブルの廃止 (全ドメイン移行完了後)
  -- CRITICAL: 最後に実行。バックアップ必須
  -- バックアップ: pg_dump user_data → S3
  -- DROP TABLE user_data;
```

---

# 出力14: FAILURE REVIEW

## 10万症例での検証

```
cases テーブル 10万行:
  最大 Index サイズ = 約 500MB (GIN × 3 + B-tree × 6)
  PRO 検索クエリ実行時間:
    idx_cases_pro_search 使用で < 5ms ✅
  問題なし

case_quality_scores 10万行: 問題なし ✅
case_snapshots (version平均3) 30万行: 問題なし ✅
```

## 100万 Experiment での検証

```
experiments テーブル 100万行:
  idx_exp_user_status で 1ユーザーの検索は < 1ms ✅
  idx_exp_factor での疾患別集計は < 50ms ✅

outcomes テーブル 100万行:
  idx_out_exp_version での最新版取得は < 1ms ✅
  mv_improvement_ranking Materialized View の更新:
    pg_cron で夜間バッチ → 本番クエリに影響なし ✅

records テーブル 3,000万行:
  idx_records_user_date でユーザーの記録取得 < 5ms ✅
  GIN インデックスサイズ 約 3GB → Postgres 対応範囲内 ✅
```

## Consent 撤回 1万件

```
同時撤回 1万件のシナリオ:

Step 1: consents UPDATE (1万行)
  → バッチ処理 (1,000件/秒で 10秒) ✅

Step 2: cases UPDATE (consent_level=0, status='CONSENT_WITHDRAWN')
  → anonymized_user_id でのルックアップが必要
  → 1ユーザーあたり平均1症例として 1万行 UPDATE
  → バッチ処理で 10〜30秒 ✅
  → RLS が即座に除外 (UPDATE完了した瞬間から)

Step 3: consent_events INSERT (1万行)
  → 高速 append ✅

問題なし。PRO 検索除外はリアルタイムで完了。
```

## 研究利用停止

```
シナリオ: 製薬企業との契約終了 → 対象データを研究利用停止

対応:
  research_exports.status = 'EXPIRED' に UPDATE
  cases.consent_level を 0 に戻す (対象ユーザーの同意撤回)
  consent_events に 'SUSPENDED' イベントを記録

問題なし。DB操作のみで完結。
```

## Similarity 再計算

```
algorithm_version を 'v2' に変更してフル再計算:

現在の similarity_edges 行数: 300万行
DELETE FROM similarity_edges WHERE algorithm_version = 'v1':
  → バッチで物理削除 (100万行/分)

新規 v2 エッジの計算:
  10万症例 × 同疾患内で Jaccard を計算
  子宮内膜症の症例 = 仮に 3万件の場合
  総ペア = 3万 × 2.9万 / 2 = 4.35億ペア → 計算時間の問題あり

  解決策:
  1. pgvector ANN を導入 (近似最近傍)
  2. 症状の重要度ベクトルで k-NN 検索
  3. 上位100候補のみ詳細スコア計算

  ⚠️ 3万件規模ではフル計算は 7日程度かかる可能性
  → Phase E 前に pgvector 移行を決断するタイミング
```

## 匿名化失敗

```
シナリオ: k-anonymity 検査でバグ → k < 5 のデータが研究利用に

防御設計:
  1. anonymization_log に passed = false の記録
  2. research_exports は passed = true かつ group_size >= k の症例のみ出力
  3. 出力前に k-anonymity を再検証するゲートを Edge Function に設置

リカバリー:
  research_exports.status = 'REJECTED'
  対象研究者に通知
  影響範囲: research_exports テーブルで特定可能
  GDPR 72時間通知: データ侵害として DPA に届出が必要かどうかを評価
```

## Postgres 移行 (Supabase → 自前 Postgres)

```
Schema の Postgres 標準準拠度:
  ✅ gen_random_uuid()      → pgcrypto の uuid_generate_v4() に変換可
  ✅ RLS                    → 標準 Postgres
  ✅ GIN インデックス       → 標準 Postgres
  ✅ GENERATED ALWAYS AS    → Postgres 12+
  ⚠️ auth.uid()             → アプリ層での JWT 解析に変換
  ⚠️ Realtime              → 代替: LISTEN/NOTIFY + Server-Sent Events
  ⚠️ Edge Functions (Deno) → Cloud Functions / Lambda に移植

移行難易度: 中
  Schema は 1週間で移植可能
  auth.uid() の置換は全 RLS ポリシーの書き換えが必要 (約30ポリシー)
```

## Supabase 移行 (v2 → v3 または サービス終了)

```
SDKの変更:
  supabase.js の import 先変更のみ

API の変更:
  .from().select().eq() 等は標準 PostgREST API → 後方互換性が高い
  Edge Functions は Deno 標準 → 移植容易

最大リスク:
  auth.users テーブルの移行 → Supabase が export ツールを提供
  Realtime の代替実装

対応:
  supabase.js を抽象化レイヤーとして設計 → 実装をモジュール内に隠蔽
```

---

# 出力15: FOUNDER CRITICAL DECISIONS

## CRITICAL (後から変更すると全データ移行 / 全症例再生成 / 全Similarity再計算)

**[C-1] records.record_date は DATE 型 (タイムゾーンなし) と確定する**
```
変更コスト: records 3,000万行の日付データが変化する可能性
          → 全ユーザーの分析結果が変わる
WHY 変更不可: ユーザーのローカル日付をそのまま使う設計が全分析の前提
今すぐ宣言: Privacy Policy と技術仕様書に明記
```

**[C-2] symptom_keys / factor_keys は英語キー (Phase B で完全移行)**
```
変更コスト: 全 records の symptom_keys[] を変換 (3,000万行)
           全 cases の primary_symptom_keys[] を再生成
WHY 変更不可: 日本語キーのままでは MedDRA/SNOMED との結合が不可能
今すぐ実施: Phase B のバックフィルで全 records を英語キーに変換
```

**[C-3] cases.id の形式 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}' を確定**
```
変更コスト: 全症例 ID の再発行。論文に記載された ID が無効になる。
WHY 変更不可: Case ID は論文・研究DBに引用される。永久参照される。
今すぐ宣言: 形式を API 仕様書と Privacy Policy に明記
```

**[C-4] disease_definitions.key と disease_prefix は変更禁止**
```
変更コスト:
  key 変更: disease_profiles, experiments, cases の全行が壊れる
  prefix 変更: 全 Case ID の再発行が必要
既存キー: endometriosis(ENDO), ovarian_cyst(OVC), uterine_fibroid(UF),
          adenomyosis(ADN), pcos(PCOS), pms_pmdd(PMS), menopause(MNP),
          infertility(INF), pelvic_organ_prolapse(POP), chronic_pelvic_pain(CPP),
          vulvodynia(VUL)
追加はよい。変更・削除は禁止。
```

**[C-5] anonymized_user_map の匿名化 ID は不可逆とする**
```
変更コスト: 全 Case の anonymized_user_id が変わる → 全 Similarity 再計算
WHY 変更不可: 一度付与した anonymized_id を変えると Case の同一性が失われる
今すぐ宣言: Privacy Policy に「匿名化 ID は復元不可」として明記
```

**[C-6] 「匿名集計値への撤回不遡及」を Phase C 前に Privacy Policy に明記**
```
変更コスト: 明記後の変更は全既存ユーザーへの再通知義務が発生
WHY 変更不可: Case 生成開始前に合意を取ることで法的リスクを回避
期限: Phase C (Case Generation) 開始の前日まで
```

**[C-7] outcomes は Immutable + Version 管理 (UPDATE 禁止)**
```
変更コスト: UPDATE 可に変更すると過去の研究利用データが遡及変更される
WHY 変更不可: 製薬企業監査・論文の再現性の前提
適用: DB トリガーで outcomes への UPDATE を拒否するルールを設ける
```

**[C-8] k-anonymity の k = 5 を確定 (研究利用開始前)**
```
変更コスト:
  k を上げる: 以前に出力したデータが再出力できなくなる
  k を下げる: GDPR ガイドラインとの整合性の再審査が必要
WHY 変更不可: k 値は研究契約書と IRB 申請書に記載される
確認事項: EU GDPR ガイドライン・日本個人情報保護委員会の k の推奨値を法律顧問と確認
```

**[C-9] UNIQUE(user_id, record_date) — 1日1レコード制約を確定**
```
変更コスト: 複数レコード/日を許容すると全 Outcome 計算の before/after 集計ロジックが変わる
WHY 変更不可: Cohen's d 計算は1日1値の前提で設計されている
今すぐ実施: Migration M-023 で DB 制約として実装
```

## IMPORTANT (早期に固定が望ましいが修正コストは許容範囲)

**[I-1] Similarity Score の重み付け ('disease_overlap × 0.35 + ...')**
```
変更コスト: 全 similarity_edges の再計算 (300万行)
期限: Phase E (PRO 検索) 開始前に確定
```

**[I-2] Case Tier 閾値 (30/55/75点, 30/90/180日)**
```
変更コスト: 全 Case の Tier 再評価が必要
           B2B 契約書の症例定義が変わる
期限: Phase C (Case Generation) 開始前に確定
```

**[I-3] Quality Score の配点 (volume:25, density:20, ...)**
```
変更コスト: 全 case_quality_scores の再計算
期限: Phase C 開始前
```

**[I-4] Cohen's d = 0.2 を「小さい効果量」の閾値とする**
```
変更コスト: 全 outcomes の effect_sizes の magnitude 分類が変わる
          → 改善ランキングの順位が変わる
期限: Phase D (PRO 検索) 開始前。マーケティング資料記載後は変更困難
```

**[I-5] consent_type の種別 ('PLATFORM', 'CASE_PUBLICATION', 'RESEARCH', ...)**
```
変更コスト: 既存の consent_events が旧 type で記録されている
          → type 変更は全 consent_events の migration が必要
期限: Phase C (Consent System) 実装開始前
```

---

# SCHEMA_V1 完成版サマリー

## テーブル数と規模

| カテゴリ | テーブル数 | 推定行数 (5年後) |
|---------|-----------|----------------|
| Operational | 10 | 3,500万行 |
| Case Platform | 5 | 44万行 |
| Consent | 2 | 70万行 |
| Master Data | 3 | 100行 |
| Audit / Infrastructure | 3 | 100万行 |
| **合計** | **23** | **約3,600万行** |

## スキーマ変更不要の評価

| 懸念 | 評価 | 対策 |
|------|------|------|
| records 3,000万行 | 変更不要 ✅ | 複合インデックスで対処 |
| 100万 Experiment | 変更不要 ✅ | カラム拡張で対応可 |
| Consent 撤回 1万件 | 変更不要 ✅ | バッチ処理で対応 |
| EU 展開 | テーブル変更不要 ✅ | インスタンス追加のみ |
| 製薬監査 | 変更不要 ✅ | consent_events + anonymization_log |
| Similarity 再計算 | 変更不要 ✅ | algorithm_version で管理 |
| pgvector 移行 | カラム追加のみ ✅ | similarity_edges に vector_similarity 追加 |
| 症状指標追加 | カラム追加のみ ✅ | symptoms マスターに行追加 |
| outcomes 再計算 | 変更不要 ✅ | version + superseded_by で管理 |

## 最終確認 — Critical Path

```
Phase A 完了条件:
  □ M-001〜M-062 の全 Migration 実行完了
  □ CREATE INDEX CONCURRENTLY で全 Index 作成完了
  □ バックフィル (M-080〜M-083) 完了
  □ records の symptom_keys[] が全件英語キーで埋まっている
  □ UNIQUE(user_id, record_date) 制約が適用されている
  □ anonymized_user_map が全既存ユーザー分生成済み
  □ RLS ポリシーが全テーブルに設定済み
  □ Privacy Policy が C-1〜C-9 の宣言を含む状態で公開済み
```

---

*SCHEMA_V1.md — Version 1.0 — Schema Design Council承認*
*次フェーズ: Phase 5 — Migration Execution (Migration ファイル実装・バックフィル実施)*
