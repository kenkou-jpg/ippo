# ARCHITECTURE_V3.md
## IPPO EVOLUTION PROGRAM — Phase 3: Architecture Refactor Design

Version: 1.0  
Generated: 2026-06-24  
Authority: Architecture Design Council (9名)  
Predecessor: DOMAIN_MODEL_V1.md (採用済み)  
評価基準: 「症例10万件でもリファクタリング不要」

---

# 出力1: CURRENT ARCHITECTURE REVIEW

## 現在の構造と責務

### src/app-legacy.js（10,804行）

```
実際の責務 (混在中):
  ├── UI描画       全11画面のHTML生成・DOM操作
  ├── 記録入力     症状チップ / 食事 / 体温 / 体重のイベントハンドラ
  ├── 認証         _notifyAuthReady / showLoginForm / checkPremiumStatus
  ├── Analytics表示 renderBodyCheck / renderPhaseMap / renderInsightDiscoveries
  ├── 設定管理     saveSymptomSettings / openSymptomSettings
  ├── Fasting      startFastTimer / resumeFasting / selectFasting
  ├── 実験         startExperiment / startCustomExperiment / openExperiments
  ├── コミュニティ  postCommunityReply / toggleArchiveReplies  ← 実質デッド
  └── Premium      premiumGate / checkPremiumStatus

公開方法: window.* に100+関数をexport
依存: window.getState / window.supabase / window.ICONS 等50+グローバル
```

### src/store/state.js（231行）

```
責務:
  ├── 単一 source of truth (_state モジュール変数)
  ├── localStorage['ippo_state'] への永続化
  ├── preHook / postHook / preSaveHook / postSaveHook
  └── migrateStorageKeys() (kk_records → ippo_state)

問題:
  - state全体が1つのJSONオブジェクト
  - records[] / experiments[] / myDiseases[] が全て平置き
  - currentScreen等UI状態と健康データが同居
```

### src/services/supabase.js（521行）

```
責務:
  ├── Supabaseクライアント初期化
  ├── cloudBackupAll()   → user_data テーブルにstate全体をUPSERT
  ├── cloudRestore()     → user_data からstate全体をリストア
  ├── syncRecordImmediately() → user_records テーブルにrecord単位upsert
  ├── retrySyncPending() → syncPending=trueのrecordを再試行
  └── visibilitychange   → タブ復帰時cloudRestore

問題:
  - cloudBackupAll が state全体を1 JSONBカラムに書く
  - user_data と user_records の二重保存（整合性保証なし）
  - 空レコード上書き防止ガードが複雑化（P0-FIX-9）
```

### src/main.js（439行）

```
責務:
  ├── 14ステップのimport順序制御（順序が壊れると白画面）
  ├── 全モジュールをwindow.*に公開
  ├── runtime guard のインストール
  ├── prediction cache の postSaveHook 登録
  └── bootstrap() 呼び出し

問題:
  - 暗黙のロードオーダー依存（コメントで注記するほど脆弱）
  - windowグローバル汚染が設計上の前提になっている
```

---

## 現在の問題点（Critical→Low順）

| # | 問題 | 影響 |
|---|------|------|
| P-01 | `user_data.state` JSONB — SQL検索不可 | 症例DB化が構造的に不可能 |
| P-02 | `app-legacy.js` 10,804行 — 全ドメインが混在 | 新機能追加のたびに汚染が拡大 |
| P-03 | Case/Experiment/Outcome/Consentテーブルが存在しない | 症例プラットフォームを実装できない |
| P-04 | `symptoms[]` が日本語文字列配列 — 国際化不可 | EU/US展開時に全レコードの再処理が必要 |
| P-05 | `repairStats()` / `repairSymptomDetailsSchema()` が起動時に実行 | データ品質が保証されていない証拠 |
| P-06 | user_data / user_records の二重保存 | 整合性保証なし |
| P-07 | windowグローバル50+export | ドメイン境界がゼロ |
| P-08 | ロードオーダー依存（14ステップ） | 変更に非常に弱い |
| P-09 | コミュニティ機能のデッドコード | 実装不完全な機能がapp-legacyに残存 |
| P-10 | ICD-10/SNOMEDコードなし | 医療研究用途での利用不可 |

---

# 出力2: TARGET ARCHITECTURE

## 設計原則

```
1. Domain Isolation First   — ドメイン間はIDによる参照のみ
2. Read/Write Separation    — 書込みパス と 読込みパス を分離
3. Consent as Infrastructure — Consentはすべてのデータアクセスに先行する
4. Anonymization at Boundary — ドメイン外への全データ出力時に匿名化
5. Strangler over Rebuild   — 既存コードは動かしながら横に新コードを育てる
```

## Target Architecture 全体図

```
╔══════════════════════════════════════════════════════════════════════╗
║                    CLIENT LAYER (PWA)                               ║
║                                                                     ║
║  ┌─────────────────────────────────────────────────────────┐       ║
║  │              App Shell (Vite PWA)                       │       ║
║  │                                                         │       ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │       ║
║  │  │ Record UI    │  │ Experiment   │  │  PRO / Case  │ │       ║
║  │  │ (Daily Log)  │  │ UI           │  │  Search UI   │ │       ║
║  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │       ║
║  │         │                 │                  │         │       ║
║  │  ┌──────┴─────────────────┴──────────────────┴───────┐ │       ║
║  │  │              Domain Service Layer (Client)        │ │       ║
║  │  │  RecordService │ ExperimentService │ CaseService  │ │       ║
║  │  │  ConsentService │ AnalyticsService              │ │       ║
║  │  └──────────────────────────┬────────────────────────┘ │       ║
║  │                             │                           │       ║
║  │  ┌──────────────────────────┴────────────────────────┐ │       ║
║  │  │         Local State (Minimal + IndexedDB)         │ │       ║
║  │  │  今日の記録 / UI状態 / オフラインキャッシュ         │ │       ║
║  │  └──────────────────────────────────────────────────┘ │       ║
║  └──────────────────────────────────────────────────────────┘       ║
╚══════════════════════════════════════════════════════════════════════╝
                              │ HTTPS / Supabase SDK
╔══════════════════════════════════════════════════════════════════════╗
║                    API LAYER (Supabase Edge Functions)              ║
║                                                                     ║
║  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            ║
║  │ record-sync   │ │ experiment-   │ │ case-         │            ║
║  │               │ │ lifecycle     │ │ generator     │            ║
║  └───────────────┘ └───────────────┘ └───────────────┘            ║
║  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            ║
║  │ consent-      │ │ case-quality  │ │ similarity-   │            ║
║  │ manager       │ │ scorer        │ │ engine        │            ║
║  └───────────────┘ └───────────────┘ └───────────────┘            ║
║  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐            ║
║  │ ai-analyze    │ │ ai-predict    │ │ research-     │            ║
║  │ (既存)        │ │ (既存)        │ │ export        │            ║
║  └───────────────┘ └───────────────┘ └───────────────┘            ║
║  ┌───────────────┐ ┌───────────────┐                              ║
║  │ stripe-       │ │ anonymization │                              ║
║  │ webhook(既存) │ │ pipeline      │                              ║
║  └───────────────┘ └───────────────┘                              ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
╔══════════════════════════════════════════════════════════════════════╗
║                    DATA LAYER (Supabase Postgres)                   ║
║                                                                     ║
║  ┌─────────────────────── OPERATIONAL ──────────────────────────┐  ║
║  │  users (auth)  │ profiles  │ subscriptions │ records         │  ║
║  │  experiments   │ outcomes  │ disease_profiles                │  ║
║  │  consents      │ consent_audit_log                           │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌─────────────────────── CASE PLATFORM ────────────────────────┐  ║
║  │  cases         │ case_quality_scores │ case_snapshots         │  ║
║  │  anonymized_user_map                                          │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌─────────────────────── MASTER DATA ──────────────────────────┐  ║
║  │  symptoms      │ disease_definitions │ factor_definitions     │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌─────────────────────── SEARCH / ANALYTICS ───────────────────┐  ║
║  │  case_similarity  │ case_search_index  │ experiment_outcomes  │  ║
║  │  (pgvector将来)   │ (全文検索/GIN)      │ (集計マテビュー)    │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  ┌─────────────────────── LEGACY (移行期間中) ───────────────────┐  ║
║  │  user_data (JSONB blob)  │  user_records (per-record backup)  │  ║
║  └──────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
                              │
╔══════════════════════════════════════════════════════════════════════╗
║                    ANALYTICS / AI LAYER                             ║
║                                                                     ║
║  src/analytics/* (pure functions — 変更不要)                        ║
║  src/disease/*   (pure functions — 変更不要)                        ║
║  src/ai/*        (feature-engine / prompt-builder)                 ║
║                                                                     ║
║  ← Postgres Materialized Views / pg_cron でバッチ更新              ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

# 出力3: DOMAIN ARCHITECTURE

## ドメイン責務と依存方向

```
┌─────────────────────────────────────────────────────────────────────┐
│  依存方向の原則:                                                     │
│  矢印の方向 = 「依存する方向」（逆方向の依存は禁止）                  │
│                                                                     │
│  Generic → Supporting → Core                                        │
│  下位ドメインは上位ドメインを知ってはならない                          │
└─────────────────────────────────────────────────────────────────────┘

GENERIC DOMAIN
  ┌──────────────────────────────────────────────────────┐
  │  User                                                │
  │  責務: 認証・プロファイル・設定・Premium状態         │
  │  所有: auth.users / profiles / subscriptions         │
  │  禁止依存: Case / Experiment / Outcome               │
  └──────────────────────────────┬───────────────────────┘
                                 │ userId (参照のみ)
                                 ▼
SUPPORTING DOMAIN
  ┌─────────────────────┐   ┌────────────────────────────┐
  │  Symptom            │   │  Disease                   │
  │  責務: 症状分類      │   │  責務: 疾患定義・分析      │
  │  所有: symptoms(MT) │   │  所有: disease_definitions  │
  │        factors(MT)  │   │        disease_profiles    │
  │  禁止依存: Record以上│   │  禁止依存: Record以上      │
  └─────────┬───────────┘   └───────────────┬────────────┘
            │                               │
            ▼                               ▼
  ┌────────────────────────────────────────────────────────┐
  │  Record                                                │
  │  責務: 日々の健康記録の収集・正規化・検索              │
  │  所有: records テーブル                                │
  │  依存: Symptom (分類検証) / Disease (タグ検証)         │
  │  禁止依存: Experiment / Case / Outcome / Consent       │
  └────────────────────────────┬───────────────────────────┘
                               │ RecordId[] (参照のみ)
                               ▼
  ┌────────────────────────────────────────────────────────┐
  │  Experiment                                            │
  │  責務: 介入の設計・実施・ライフサイクル管理            │
  │  所有: experiments テーブル                            │
  │  依存: Record (期間内RecordId参照) / Disease (疾患タグ)│
  │  禁止依存: Case（ExperimentはCaseを知らない）          │
  │           Outcome（OutcomeはExperimentから生成される）  │
  └──────────────────────────────┬─────────────────────────┘
                                 │ ExperimentId (参照のみ)
                                 ▼
  ┌────────────────────────────────────────────────────────┐
  │  Outcome                                               │
  │  責務: 実験前後の測定・効果量計算・品質評価            │
  │  所有: outcomes テーブル                               │
  │  依存: Experiment (1:1) / Record (期間内集計)          │
  │  禁止依存: Case（OutcomeはCaseを知らない）             │
  └──────────────────────────────┬─────────────────────────┘
                                 │
  ┌──────────────────────────────┼─────────────────────────┐
  │  Consent                     │                         │
  │  責務: 法的同意の取得・記録・撤回・法域管理            │
  │  所有: consents / consent_audit_log                    │
  │  依存: User (userId のみ)                              │
  │  禁止依存: Case業務ロジック / Analytics / Outcome      │
  │  ※ CaseはConsentIdを参照するが、ConsentはCaseを知らない│
  └──────────────────────────────┼─────────────────────────┘
                                 │
CORE DOMAIN                      │
  ┌──────────────────────────────▼─────────────────────────┐
  │  Case                                                  │
  │  責務: 症例の生成・品質評価・ライフサイクル・公開管理  │
  │  所有: cases / case_quality_scores / case_snapshots    │
  │       anonymized_user_map                              │
  │  依存: Record(集計) / Experiment(ID参照) / Outcome(ID) │
  │        Disease(分類) / Consent(公開条件)               │
  │  禁止依存: Similarity（CaseはSimilarityを知らない）    │
  │           User（Case内にUserIdを直接保持しない）       │
  └──────────────────────────────┬─────────────────────────┘
                                 │ CaseId (参照のみ)
  ┌──────────────────────────────▼─────────────────────────┐
  │  Similarity                                            │
  │  責務: 類似症例インデックス生成・PRO検索               │
  │  所有: case_similarity / case_search_index             │
  │  依存: Case (読み取りのみ)                             │
  │  禁止依存: User / Consent 直接参照                     │
  │  ※ 公開可否はCaseのconsent_levelで担保済み            │
  └────────────────────────────────────────────────────────┘

READ-ONLY DOMAINS (分析専用)
  ┌────────────────────────────────────────────────────────┐
  │  Analytics                                             │
  │  責務: pure function分析（既存analytics/*は維持）      │
  │  依存: Record(読取) / Experiment(読取) / Outcome(読取) │
  │  禁止: データ書込み一切                                │
  └────────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────────┐
  │  Prediction                                            │
  │  責務: 予測キャッシュ管理・AI呼び出し                  │
  │  依存: Analytics(読取) / Case(読取)                    │
  │  禁止: 直接のRecord書込み                              │
  └────────────────────────────────────────────────────────┘
```

## 禁止依存一覧（絶対に守ること）

| 禁止 | 理由 |
|------|------|
| Record → Case | Recordは症例の素材。素材が成果物を知ってはいけない |
| Outcome → Case | OutcomeはExperimentの測定値。CaseはOutcomeを参照する側 |
| Experiment → Case | ExperimentはCaseを知らずに実施される |
| Consent → Case業務ロジック | ConsentはPure Legal Layer。ビジネスルールと混在しない |
| Case → User (直接) | 匿名化原則。CaseはAnonymizedUserIdのみ保持 |
| Similarity → Consent (直接) | CaseのConsent判定はCase層で完結 |
| Analytics → Consent | 分析はConsent済みデータのみを対象とする（DB層で保証） |

---

# 出力4: DATA ARCHITECTURE

## 移行方針

```
現在                              目標
─────────────────                 ─────────────────────────────
user_data.state (JSONB)      →    正規化12テーブル
  └ records[]                →    records (正規化)
  └ experiments[]            →    experiments
  └ myDiseases[]             →    disease_profiles
  └ trackedConditions{}      →    disease_profiles (拡張)
  └ name/streak/totalDays    →    profiles (既存)
  └ 症例なし                 →    cases / case_quality_scores

user_records (per-record)    →    records と統合 (user_records廃止)
user_data                    →    Migration完了後に廃止
```

---

## テーブル設計

### 1. `records` — 日々の健康記録

```sql
CREATE TABLE public.records (
  -- Identity
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date (CRITICAL: タイムゾーンなし。ユーザーのローカル日付)
  record_date     date          NOT NULL,

  -- Core Metrics
  pain_level      smallint      CHECK (pain_level BETWEEN 0 AND 10),
  energy          smallint      CHECK (energy BETWEEN 1 AND 5),
  sleep_quality   smallint      CHECK (sleep_quality BETWEEN 1 AND 5),
  wellness_score  smallint      CHECK (wellness_score BETWEEN 1 AND 5),
  body_temp       numeric(4,1),
  period_day      smallint,
  fasting_hours   numeric(4,1),

  -- Structured Arrays (symptom_key / factor_key を使用。日本語文字列不可)
  symptom_keys    text[]        DEFAULT '{}',  -- ['lower_abdominal_pain', 'fatigue']
  factor_keys     text[]        DEFAULT '{}',  -- ['caffeine', 'exercise']

  -- Unstructured
  meal_note       text,
  memo            text,

  -- Sync State
  sync_pending    boolean       DEFAULT false,
  synced_at       timestamptz,

  -- Soft Delete
  is_deleted      boolean       DEFAULT false,
  deleted_at      timestamptz,

  -- Audit
  client_created_at timestamptz,  -- クライアント側の作成日時（オフライン記録用）
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),

  -- Constraint
  UNIQUE (user_id, record_date)   -- 1ユーザー1日1レコード
);

-- Indexes
CREATE INDEX idx_records_user_date   ON records(user_id, record_date DESC);
CREATE INDEX idx_records_symptom_keys ON records USING GIN(symptom_keys);
CREATE INDEX idx_records_factor_keys  ON records USING GIN(factor_keys);

-- RLS
ALTER TABLE records ENABLE ROW LEVEL SECURITY;
CREATE POLICY records_own ON records USING (auth.uid() = user_id);
```

**設計注記:**
- `symptom_keys` は `text[]` (PostgreSQL native array)。JSONBより検索が速い。
- `UNIQUE(user_id, record_date)` — 同日複数レコード問題をDB層で防止。
- `client_created_at` — オフラインで記録された日時を保持（auditing用）。

---

### 2. `experiments` — 実験

```sql
CREATE TABLE public.experiments (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Config (開始後変更不可)
  type                  text    NOT NULL,
    -- CHECK type IN ('DIETARY_ELIMINATION','DIETARY_FASTING','DIETARY_ADDITION',
    --   'DIETARY_RESTRICTION','LIFESTYLE_SLEEP','LIFESTYLE_EXERCISE',
    --   'LIFESTYLE_STRESS','LIFESTYLE_HEAT','SUPPLEMENT_HERBAL',
    --   'SUPPLEMENT_NUTRITIONAL','MEDICAL_MEDICATION','MEDICAL_TREATMENT','OTHER')
  factor_key            text    NOT NULL,  -- 単一ファクター（factor_definitions.key）
  hypothesis            text,
  planned_days          smallint NOT NULL CHECK (planned_days BETWEEN 7 AND 180),
  disease_keys          text[]  NOT NULL DEFAULT '{}',

  -- Lifecycle
  status                text    NOT NULL DEFAULT 'DRAFT',
    -- CHECK status IN ('DRAFT','ACTIVE','COMPLETED','ABANDONED')
  started_at            date,
  planned_end_at        date,
  actual_end_at         date,
  abandoned_at          date,
  abandon_reason        text,

  -- Medical Flag
  is_medical_intervention boolean DEFAULT false,
  physician_involved    boolean,

  -- Audit
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_experiments_user ON experiments(user_id, status);
CREATE INDEX idx_experiments_disease ON experiments USING GIN(disease_keys);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY experiments_own ON experiments USING (auth.uid() = user_id);
```

---

### 3. `outcomes` — 実験アウトカム

```sql
CREATE TABLE public.outcomes (
  id                    uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id         uuid    NOT NULL REFERENCES experiments(id),
  user_id               uuid    NOT NULL REFERENCES auth.users(id),

  -- Measurement Periods
  before_period_start   date    NOT NULL,
  before_period_end     date    NOT NULL,
  after_period_start    date    NOT NULL,
  after_period_end      date    NOT NULL,

  -- Aggregated Metrics (JSONB: MetricSnapshot構造)
  before_metrics        jsonb   NOT NULL,
  after_metrics         jsonb   NOT NULL,

  -- Analysis Results
  effect_sizes          jsonb   NOT NULL DEFAULT '[]',  -- EffectSize[]
  confidence_level      text    NOT NULL,
    -- CHECK confidence_level IN ('high','medium','low','insufficient')
  confidence_factors    jsonb,
  category              text    NOT NULL,
    -- CHECK category IN ('IMPROVED','WORSENED','NO_CHANGE','INDETERMINATE','PARTIAL')
  quality_score         numeric(5,2),

  -- Medical
  is_medical_intervention boolean DEFAULT false,

  -- Versioning (再計算時にインクリメント。過去バージョンは保持)
  version               smallint DEFAULT 1,

  -- Timestamps
  generated_at          timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- outcomeは生成後不変（updateは行わない。再計算はversion+1で新行INSERT）
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcomes_own ON outcomes USING (auth.uid() = user_id);
```

---

### 4. `disease_profiles` — ユーザー疾患プロファイル

```sql
CREATE TABLE public.disease_profiles (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disease_key   text    NOT NULL,  -- disease_definitions.key

  -- Medical Context
  icd10_code    text,   -- 'N80.0' (子宮内膜症)
  snomed_code   text,   -- 'endometriosis'
  is_diagnosed  boolean DEFAULT false,  -- true=医師診断 / false=自己申告
  diagnosis_date date,
  status        text    DEFAULT 'ACTIVE',
    -- CHECK status IN ('ACTIVE','REMISSION','RESOLVED')

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, disease_key)
);

ALTER TABLE disease_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY disease_profiles_own ON disease_profiles USING (auth.uid() = user_id);
```

---

### 5. `symptoms` — 症状マスター

```sql
CREATE TABLE public.symptoms (
  key             text    PRIMARY KEY,  -- 'lower_abdominal_pain' (英語キー、不変)
  display_name_ja text    NOT NULL,     -- '下腹部痛'
  display_name_en text,                 -- 'Lower abdominal pain'
  layer           smallint NOT NULL CHECK (layer IN (1,2,3)),
  is_sensitive    boolean DEFAULT false,
  meddra_code     text,   -- MedDRA PT Code
  nci_code        text,   -- NCI Thesaurus Code
  deprecated_at   timestamptz,  -- 廃止後も既存recordのキーは保持
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Readonly: RLSはパブリック読み取り可
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY symptoms_read ON symptoms FOR SELECT USING (true);
```

---

### 6. `factor_definitions` — ファクターマスター

```sql
CREATE TABLE public.factor_definitions (
  key             text    PRIMARY KEY,  -- 'caffeine' (英語キー、不変)
  display_name_ja text    NOT NULL,
  display_name_en text,
  category        text,   -- 'dietary' | 'lifestyle' | 'environmental'
  deprecated_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE POLICY factor_definitions_read ON factor_definitions FOR SELECT USING (true);
```

---

### 7. `consents` — 同意記録

```sql
CREATE TABLE public.consents (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Consent Detail
  level           smallint NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 4),
  status          text    NOT NULL DEFAULT 'PENDING',
    -- CHECK status IN ('PENDING','PRESENTED','GRANTED','WITHDRAWN','EXPIRED','SUSPENDED')
  policy_version  text    NOT NULL,   -- '2026-07-01-v1'
  jurisdiction    text    NOT NULL DEFAULT 'JP',  -- 'JP'|'EU'|'US'|'OTHER'

  -- Legal Evidence (hashed)
  ip_hash         text,
  user_agent_hash text,

  -- Timing
  presented_at    timestamptz,
  granted_at      timestamptz,
  withdrawn_at    timestamptz,
  expires_at      timestamptz,

  -- Audit
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.consent_audit_log (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id      uuid    NOT NULL REFERENCES consents(id),
  action          text    NOT NULL,
    -- 'PRESENTED'|'GRANTED'|'WITHDRAWN'|'EXPIRED'|'LEVEL_CHANGED'|'POLICY_UPDATED'
  from_level      smallint,
  to_level        smallint,
  from_status     text,
  to_status       text,
  policy_version  text,
  performed_at    timestamptz NOT NULL DEFAULT now(),
  metadata        jsonb
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY consents_own ON consents USING (auth.uid() = user_id);
-- consent_audit_logはService Role経由のみ書込み可
```

---

### 8. `anonymized_user_map` — 匿名化マッピング

```sql
CREATE TABLE public.anonymized_user_map (
  -- 双方向マッピングは持たない。user_id → anon_id のみ
  user_id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymized_id   uuid    NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
-- Service Role のみアクセス可。ユーザー自身も自分のanonymized_idを参照できない
```

---

### 9. `cases` — 症例

```sql
CREATE TABLE public.cases (
  -- Identity (CRITICAL: 変更不可)
  id                  text    PRIMARY KEY,
    -- 形式: 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}'
    -- 例:   'CASE-ENDO-202607-A3X9M2KP'

  anonymized_user_id  uuid    NOT NULL REFERENCES anonymized_user_map(anonymized_id),
  primary_disease_key text    NOT NULL,  -- REFERENCES disease_definitions(key)
  disease_keys        text[]  NOT NULL DEFAULT '{}',
  icd10_codes         text[]  DEFAULT '{}',  -- 研究利用向け

  -- Lifecycle
  status              text    NOT NULL DEFAULT 'PRE_CANDIDATE',
    -- 'PRE_CANDIDATE'|'CANDIDATE'|'TIER3'|'TIER2'|'TIER1'
    -- |'SUSPENDED'|'CONSENT_WITHDRAWN'|'INVALIDATED'|'ARCHIVED'
  tier                text,   -- 'TIER3'|'TIER2'|'TIER1'|NULL

  -- Quality
  quality_score       numeric(5,2),

  -- Consent
  consent_id          uuid    REFERENCES consents(id),
  consent_level       smallint NOT NULL DEFAULT 0,

  -- Temporal
  case_start_date     date    NOT NULL,
  case_end_date       date,   -- NULLは記録継続中

  -- Denormalized for Performance (定期バッチで更新)
  record_count        integer DEFAULT 0,
  experiment_ids      uuid[]  DEFAULT '{}',
  outcome_ids         uuid[]  DEFAULT '{}',
  search_metadata     jsonb   DEFAULT '{}',

  -- Registration
  registered_at       timestamptz NOT NULL DEFAULT now(),
  last_evaluated_at   timestamptz,

  -- Audit
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  version             smallint DEFAULT 1
);

-- Search Indexes
CREATE INDEX idx_cases_disease    ON cases(primary_disease_key, status);
CREATE INDEX idx_cases_tier       ON cases(tier, consent_level) WHERE status IN ('TIER2','TIER1');
CREATE INDEX idx_cases_metadata   ON cases USING GIN(search_metadata);
CREATE INDEX idx_cases_diseases   ON cases USING GIN(disease_keys);

-- RLS: TIER2/TIER1でconsent_level>=1の症例はPRO検索対象
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
-- ユーザー自身のCase（anonymized_idで逆引き後）
CREATE POLICY cases_own ON cases FOR ALL
  USING (anonymized_user_id = (
    SELECT anonymized_id FROM anonymized_user_map WHERE user_id = auth.uid()
  ));
-- PRO検索: TIER2+consent_level>=1のCaseを公開
CREATE POLICY cases_pro_search ON cases FOR SELECT
  USING (tier IN ('TIER2','TIER1') AND consent_level >= 1
    AND status IN ('TIER2','TIER1'));
```

---

### 10. `case_quality_scores` — 症例品質スコア

```sql
CREATE TABLE public.case_quality_scores (
  case_id                 text    PRIMARY KEY REFERENCES cases(id),

  total_score             numeric(5,2),
  record_volume_score     numeric(5,2),
  record_density_score    numeric(5,2),
  data_completeness_score numeric(5,2),
  experiment_quality_score numeric(5,2),
  outcome_quality_score   numeric(5,2),
  consent_score           numeric(5,2),
  disease_tag_multiplier  numeric(3,2),

  -- Detail for debugging
  total_record_days       integer,
  coverage_rate           numeric(4,3),
  completed_experiments   smallint,

  calculated_at           timestamptz NOT NULL DEFAULT now(),
  version                 smallint DEFAULT 1
);
```

---

### 11. `case_similarity` — 類似症例インデックス

```sql
CREATE TABLE public.case_similarity (
  case_id_a           text    NOT NULL REFERENCES cases(id),
  case_id_b           text    NOT NULL REFERENCES cases(id),
  similarity_score    numeric(5,4) NOT NULL,  -- 0.0000 - 1.0000

  -- Similarity components
  disease_overlap     numeric(3,2),  -- 疾患の重複率
  symptom_overlap     numeric(3,2),  -- 症状の重複率
  experiment_match    boolean,       -- 同じExperiment Typeか
  outcome_match       boolean,       -- 同じOutcome categoryか
  age_group_match     boolean,       -- 同じ年齢層か（5歳刻み）

  calculated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (case_id_a, case_id_b),
  CHECK (case_id_a < case_id_b)  -- A<B を強制して重複排除
);

CREATE INDEX idx_case_sim_score ON case_similarity(case_id_a, similarity_score DESC);
-- PRO検索: 類似スコア上位Nケースを効率取得
```

---

# 出力5: CASE GENERATION ARCHITECTURE

## 設計決定: **イベント駆動 + 夜間バッチの組み合わせ**

```
理由:
  - Tier昇格はリアルタイム（ユーザーへの即時通知が必要）→ イベント駆動
  - 品質スコア再計算は毎Record保存のたびに不要 → バッチで十分
  - 類似度計算は計算コストが高い → 夜間バッチ
```

## Case生成フロー

```
                    [ Record保存 ]
                         │
                         ▼
              ┌──────────────────────┐
              │  CaseEligibility     │
              │  Checker             │
              │  (Edge Function)     │
              │                      │
              │  チェック:           │
              │  ✓ diseaseTag≥1      │
              │  ✓ record_days≥30    │
              │  ✓ coverage≥60%      │
              └──────────┬───────────┘
                         │
              No ────────┤──────── Yes
              │                        │
              ▼                        ▼
         (何もしない)     ┌──────────────────────┐
                          │  CaseCandidate       │
                          │  通知送信             │
                          │  (ユーザーへ)         │
                          └──────────┬───────────┘
                                     │ ユーザー承認
                                     │ + Consent Level 1
                                     ▼
                          ┌──────────────────────┐
                          │  Case 生成           │
                          │  (CANDIDATE → TIER3) │
                          │                      │
                          │  anonymized_user_id  │
                          │  を生成・マッピング   │
                          │  case_id 発行         │
                          │  品質スコア計算       │
                          └──────────────────────┘


                    [ Experiment完了 ]
                         │
                         ▼
              ┌──────────────────────┐
              │  Outcome生成         │
              │  (Edge Function)     │
              │                      │
              │  Before/After集計    │
              │  Cohen's d計算       │
              │  Confidence判定      │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │  Case品質スコア      │
              │  即時再計算           │
              │  + Tier昇格チェック  │
              └──────────┬───────────┘
                         │ Tier昇格
                         ▼
              ┌──────────────────────┐
              │  ユーザー通知         │
              │  「Tier2達成!」       │
              │  Consent Level 2の   │
              │  案内表示            │
              └──────────────────────┘


                    [ 夜間バッチ (pg_cron) ]
                    毎日 02:00 JST
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   全Case品質        新規Case/更新     類似度
   スコア再計算       Caseの           計算
   (全体整合)         search_metadata  更新
                       更新
```

## Case Tier昇格条件（確定版）

| 遷移 | 必須条件 | トリガー |
|------|---------|---------|
| PRE_CANDIDATE → CANDIDATE | record_days≥30, coverage≥60%, diseaseTag≥1 | Record保存時 |
| CANDIDATE → TIER3 | ユーザー承認 + Consent Level 1 + quality_score≥30 | ユーザーアクション |
| TIER3 → TIER2 | quality_score≥55 + record_days≥90 + completed_exp≥1 | バッチ or Outcome生成時 |
| TIER2 → TIER1 | quality_score≥75 + record_days≥180 + completed_exp≥2 + Consent Level 2 | バッチ or Consent更新時 |

---

# 出力6: CONSENT ARCHITECTURE

## Consentの伝播設計

```
Consent取得
    │
    ▼
┌────────────────────────────────────────────────────────────────┐
│  DOMAIN LAYER                                                  │
│                                                                │
│  consents.level = N                                           │
│  cases.consent_level = N  (非正規化コピー。高速検索用)         │
└────────────────────────────────────────┬───────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
┌────────────────────┐ ┌───────────────────────┐ ┌─────────────────────┐
│  DATABASE LAYER    │ │  CASE SEARCH LAYER    │ │  ANALYTICS LAYER   │
│                    │ │                       │ │                    │
│  RLS Policy:       │ │  PRO検索クエリ:        │ │  集計クエリ:        │
│  SELECT可 when     │ │  WHERE consent_level  │ │  consent_level >= 1│
│  consent_level≥1  │ │    >= 1               │ │  のCaseのみ対象    │
│  AND tier IN       │ │  AND status IN        │ │                    │
│  ('TIER2','TIER1') │ │    ('TIER2','TIER1')  │ │  (匿名化済み集計)  │
└────────────────────┘ └───────────────────────┘ └─────────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                                               ▼
┌────────────────────────────────┐       ┌────────────────────────────┐
│  RESEARCH EXPORT LAYER         │       │  AI MODEL LAYER            │
│                                │       │                            │
│  Level 2+のみ出力可            │       │  Level 1+のCaseデータで     │
│  匿名化Stage 2適用後           │       │  fine-tune / RAG          │
│  IRB審査番号を付与             │       │  ユーザー個人への出力は     │
│  監査ログ記録必須              │       │  PersonalDataとして扱う    │
└────────────────────────────────┘       └────────────────────────────┘
```

## Consent撤回時の挙動

```
ユーザー: Consent撤回 (withdraw)
    │
    ▼
Step 1: consents.status = 'WITHDRAWN'  (即時)
    │    consent_audit_log に記録
    │
    ▼
Step 2: cases.consent_level = 0  (即時)
    │    cases.status = 'CONSENT_WITHDRAWN'
    │    → PRO検索から即座に除外 (RLSで保証)
    │
    ▼
Step 3: 将来のデータ収集停止  (即時)
    │    新規Record/Experiment が Case に紐づかなくなる
    │
    ▼
Step 4: Research Export 停止  (即時)
    │    進行中のExport Jobにフラグ
    │
    ▼
Step 5: 既存匿名集計値 → 変更しない  (設計上の原則)
    │
    └── ※ Privacy PolicyとConsentフォームに事前明記必須
        「集計済み統計値には撤回は適用されません」

撤回後の再同意:
    → consents.status = 'GRANTED' への復帰は可能
    → 新規 consent_audit_log エントリとして記録
    → CaseのTierは保持（再計算後に復帰）
```

---

# 出力7: ANONYMIZATION ARCHITECTURE

## データ分類原則

```
Classification Level:
  PERSONAL      → 個人が直接特定できるデータ
  PSEUDONYMOUS  → 追加情報なしに特定不可（仮名化済み）
  ANONYMOUS     → いかなる手段でも特定不可（k-anonymity適用後）
  AGGREGATE     → 個人データではない（統計値）
```

## 症例DBに保存するデータ vs 保存しないデータ

```
┌─────────────────────────────────────────────────────────────────┐
│  保存する (cases / case_quality_scores / case_similarity)       │
├─────────────────────────────────────────────────────────────────┤
│  ✓ anonymized_user_id          (実UserIDとは別のUUID)           │
│  ✓ primary_disease_key         (疾患キー)                       │
│  ✓ disease_keys[]              (全疾患キー)                     │
│  ✓ icd10_codes[]               (国際標準コード)                 │
│  ✓ symptom_keys[]の集計        (出現頻度。個別記録日は含まない) │
│  ✓ factor_keys[]の集計         (同上)                           │
│  ✓ experiment_type             (介入の種類)                     │
│  ✓ outcome_category            (改善/悪化/変化なし)             │
│  ✓ effect_sizes[]              (Cohen's d等)                    │
│  ✓ age_group                   (5歳刻み: '30-34')               │
│  ✓ record_months               (記録月数)                       │
│  ✓ tier / quality_score        (症例品質)                       │
│  ✓ geographic_region           (都道府県レベル。市区町村不可)   │
│  ✓ case_start_year             (年のみ。月日不可)               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  保存しない (cases テーブルには含めない)                         │
├─────────────────────────────────────────────────────────────────┤
│  ✗ user_id (直接)              → anonymized_user_id を使用      │
│  ✗ name / email                → profiles のみ保持              │
│  ✗ 正確な生年月日              → age_group のみ                  │
│  ✗ 正確な住所・郵便番号         → 都道府県のみ                   │
│  ✗ 個別のRecord日付            → record_months に集約            │
│  ✗ IP address (直接)           → consent に hash のみ           │
│  ✗ Device ID                   → localStorage にのみ存在        │
│  ✗ メモ・自由記述テキスト       → 個人特定リスクあり             │
│  ✗ 医師名・病院名              → is_diagnosed boolean のみ      │
└─────────────────────────────────────────────────────────────────┘
```

## 匿名化パイプライン

```
Stage 1: 仮名化 (Pseudonymization)  — Level 1+ Consentで適用
  ─────────────────────────────────
  Input:  user_id (UUID)
  Process: anonymized_user_map でマッピング
  Output: anonymized_user_id (別UUID)
  
  適用: cases.anonymized_user_id
  復元: Service Roleのみ。通常オペレーションでは不可。
  GDPR: 「個人データ」のまま（GDPRの保護対象）


Stage 2: 匿名化 (k-Anonymity)  — Level 2+ Consentで適用
  ─────────────────────────────────
  k = 5（同一疾患×年齢層グループに5件以上存在しない症例は出力しない）
  
  Process:
    1. age_group (5歳刻み) + primary_disease_key でグループ化
    2. グループサイズ < 5 の症例は research export から除外
    3. 除外された症例は「ANONYMIZATION_SUPPRESSED」フラグを付与
  
  準識別子の除去:
    - 正確な記録開始月 → 年のみ
    - 都道府県も10症例未満の場合は「地域不明」に丸め
  
  GDPR: 適切に匿名化されれば「個人データ」から除外


Stage 3: 集計化 (Aggregation)  — Consentなしで利用可
  ─────────────────────────────────
  個人レコードを集計値に変換
  
  例:
    「子宮内膜症 × カフェイン断ち30日で
     IMPROVED: 68%, NO_CHANGE: 25%, WORSENED: 7% (n=47)」
  
  PRO機能の「改善ランキング」はこのレイヤーを使用
  個人の症例は含まない純粋な統計値


匿名化パイプライン実行:
  ┌────────────────────────────────────────────────┐
  │  pg_cron で夜間バッチ実行                      │
  │                                                │
  │  1. cases WHERE consent_level >= 2             │
  │       AND status IN ('TIER2','TIER1')          │
  │       AND anonymization_status != 'COMPLETED'  │
  │  2. k-anonymity チェック                       │
  │  3. 合格 → anonymized_cases (export用ビュー)に │
  │  4. 不合格 → SUPPRESSED フラグ                 │
  └────────────────────────────────────────────────┘
```

---

# 出力8: STRANGLER PLAN

## 方針

```
Strangle Pattern の原則:
  1. 既存の動作を一切壊さない
  2. 新コードは既存コードと並行して動作する
  3. 移行は画面・機能単位で完結する
  4. 移行完了した機能のみ旧コードから削除する

app-legacy.js は10,804行だが:
  - 純粋関数: analytics/* / disease/* は既に独立 → 移行不要
  - 良好なモジュール: record/save.js等 → 既に分離
  - 問題のコア: UI描画 + 認証 + 状態管理 が混在
```

## Strangler Phase順

### Phase S-0: 保護層の確立（現在〜移行開始前）
**目的:** 既存コードを壊せないようにする  
**対象:** テスト強化  

```
作業:
  [ ] app-legacy.js の主要関数に smoke test を追加
  [ ] saveRecord / saveRecordScreen の end-to-end test
  [ ] Premium機能の regression test
  [ ] Stripe checkout の integration test

  ※ これなしにStranglerを進めると移行中の破損に気づけない
```

### Phase S-1: データレイヤーの並行構築（DBのみ変更）
**目的:** 新テーブルを作りつつ app-legacy.js には一切触れない  

```
作業:
  [ ] Migration M-001〜M-012 実行 (出力9参照)
  [ ] 既存 user_data / user_records は維持
  [ ] 書込みは一切行わない（読み取りテストのみ）

  app-legacy.js への変更: ゼロ
  リスク: ゼロ
```

### Phase S-2: 二重書込み（Dual Write）
**目的:** 新テーブルへの並行書込みを開始。旧テーブルも継続  

```
対象: Record保存パイプライン
  record/save.js に以下を追加:
    - syncRecordImmediately が user_records + records（新）に両方書く
    - 新テーブル書込みは fire-and-forget（失敗しても旧パスを妨げない）

app-legacy.js への変更: ゼロ（record/save.jsのみ）
リスク: 低（新テーブル書込みが失敗しても旧パスは継続）

検証:
  [ ] records テーブルのrow数が user_records と一致しているか
  [ ] 1ヶ月後のデータ整合性確認
```

### Phase S-3: 読込みパスの新テーブル化
**目的:** analytics/disease/ が新テーブルからデータを読む  

```
対象: analytics/* / disease/* の入力データ
  既存: getState().records （localStorage）
  移行後: Supabase records テーブルから取得

  実装方法: record-repository.js に新DBパスを追加
  フィーチャーフラグで切替可能にする

app-legacy.js への変更: ゼロ（record-repository.jsのみ）
```

### Phase S-4: Experiment・Outcome・Caseドメインの新実装
**目的:** 旧実装（state.experiments[]）の並行として新ドメインを実装  

```
優先順位 HIGH:
  [ ] experiments テーブルへの書込み
  [ ] Experiment開始/完了のEdge Function
  [ ] outcomes テーブル生成

優先順位 MEDIUM:
  [ ] cases テーブルへの書込み
  [ ] Case品質スコア計算バッチ

優先順位 LOW:
  [ ] case_similarity計算バッチ

app-legacy.js の startExperiment() は触れない
新しい ExperimentService が並行して動く
```

### Phase S-5: Consent UI追加
**目的:** consentドメインの実装（既存UIに影響しない新オーバーレイ）  

```
  [ ] Consent説明オーバーレイ（新UIコンポーネント）
  [ ] Level 1取得フロー（Case登録申請時）
  [ ] Consent撤回フロー
  [ ] consent_audit_log 記録

app-legacy.js への変更: ゼロ（新モジュール追加のみ）
```

### Phase S-6: 旧コードの段階的削除
**目的:** 移行完了した機能の旧実装を削除  

**削除順序（安全な順）:**
```
Step 6-1: コミュニティ関連（デッドコード）
  削除対象: postCommunityReply / toggleArchiveReplies / updateReplyLikeCount
  リスク: ゼロ（UIに存在しないため）

Step 6-2: state.experiments[] の移行
  experiments テーブルへの移行完了確認後に
  app-legacy.js の startExperiment 旧実装を削除

Step 6-3: cloudBackupAll の段階的廃止
  user_data JSONB blob への書込み停止（新テーブルが完全になってから）

Step 6-4: UI関数の順次移行
  one screen at a time で実施
  home / record / settings / insights / pro-hub

Step 6-X: app-legacy.js の最終削除
  全画面の移行完了後
  target: 10,000行 → 0行
  期間: 1〜2年
```

---

# 出力9: MIGRATION ROADMAP

## 絶対に壊してはいけないもの

```
PROTECTED:
  1. 既存ユーザーの records データ（user_data.state.records[] + user_records）
  2. Stripe課金フロー（stripe-checkout / stripe-webhook Edge Functions）
  3. Premium機能（premiumGate / premium-service.js）
  4. 既存のRLS設定
  5. Supabase Authセッション
```

## Migration順序

### Group A: マスターデータ（依存なし・最初に実行）

```sql
-- M-001: symptoms マスターテーブル
CREATE TABLE symptoms ... ;
INSERT INTO symptoms (key, display_name_ja, layer) VALUES
  ('lower_abdominal_pain', '下腹部痛', 1),
  ('lower_back_pain',      '腰痛',    1),
  ('headache',             '頭痛',    1),
  ('fatigue',              '倦怠感',  1),
  ...（33症状 + SENSITIVE_SYMPTOMS 全量）

-- M-002: factor_definitions マスターテーブル
CREATE TABLE factor_definitions ... ;
INSERT INTO factor_definitions (key, display_name_ja) VALUES
  ('caffeine',   'カフェイン'),
  ('alcohol',    'アルコール'),
  ...（20ファクター全量）

-- M-003: disease_definitions マスターテーブル（CRITICAL: keyは変更不可）
CREATE TABLE disease_definitions (
  key       text PRIMARY KEY,  -- 'endometriosis' 等
  ja_name   text NOT NULL,     -- '子宮内膜症'
  icd10     text,              -- 'N80'
  snomed    text
);
INSERT ... （11疾患全量）
```

### Group B: ユーザードメイン（既存テーブル拡張）

```sql
-- M-010: disease_profiles テーブル
CREATE TABLE disease_profiles ... ;

-- M-011: anonymized_user_map テーブル
-- CRITICAL: このテーブルが全症例の匿名化基盤
CREATE TABLE anonymized_user_map ... ;
```

### Group C: オペレーショナルドメイン

```sql
-- M-020: records テーブル正規化
-- 既存 records テーブルに列追加（CREATE TABLEは既存のため）
ALTER TABLE records
  ADD COLUMN IF NOT EXISTS symptom_keys text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS factor_keys  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pain_level   smallint,
  ADD COLUMN IF NOT EXISTS energy       smallint,
  ADD COLUMN IF NOT EXISTS sleep_quality smallint,
  ADD COLUMN IF NOT EXISTS wellness_score smallint,
  ADD COLUMN IF NOT EXISTS body_temp    numeric(4,1),
  ADD COLUMN IF NOT EXISTS is_deleted   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_created_at timestamptz;

-- M-021: experiments テーブル
CREATE TABLE experiments ... ;

-- M-022: outcomes テーブル
CREATE TABLE outcomes ... ;

-- M-023: consents テーブル + consent_audit_log
CREATE TABLE consents ... ;
CREATE TABLE consent_audit_log ... ;
```

### Group D: Caseプラットフォーム

```sql
-- M-030: cases テーブル
CREATE TABLE cases ... ;

-- M-031: case_quality_scores
CREATE TABLE case_quality_scores ... ;

-- M-032: case_similarity
CREATE TABLE case_similarity ... ;
```

### Group E: データバックフィル（CRITICAL: 本番データ移行）

```sql
-- M-040: user_data.state.records[] → records テーブルへのバックフィル
-- 実行方法: バックフィル専用Edge Functionをバッチ実行
-- 条件: M-020完了後。user_data は読み取りのみ（削除しない）
-- 検証: records.count = user_data.state.records[].count

-- M-041: user_data.state.experiments[] → experiments テーブルへのバックフィル
-- 注意: experiments は開始日・終了日が不明確な場合あり → NULL許可

-- M-042: user_data.state.myDiseases[] → disease_profiles へのバックフィル
-- is_diagnosed = false で全件登録（自己申告として扱う）

-- M-043: anonymized_user_map の生成
-- 既存ユーザー全員分の anonymized_id を発行
```

### Group F: Deprecation（既存テーブル廃止）

```sql
-- M-050: user_records テーブルの廃止
-- 条件: M-040完了 + records テーブルへのDual Write確認後
-- 方法: まず reads を records テーブルへ切替。次に writes。最後に DROP。

-- M-051: user_data テーブルの廃止
-- 条件: 全ドメインが新テーブルに完全移行後
-- 最後に実行。慎重に。バックアップ必須。
```

## Migration実行順序サマリー

```
Group A (マスター)  → Group B (ユーザー)  → Group C (オペレーション)
     → Group D (Caseプラットフォーム) → Group E (バックフィル)
     → 検証・確認（最低30日間）
     → Group F (廃止)
```

---

# 出力10: FAILURE SIMULATION

## ユーザー10万人 / 症例10万件

```
想定データ規模:
  records:         10万ユーザー × 300日 = 3,000万行
  experiments:     症例1件あたり平均2件 = 20万行
  outcomes:        20万行
  cases:           10万行
  case_similarity: 10万 × 10(上位類似) = 100万行

PostgreSQL耐久性: ✅ 問題なし
  - records 3,000万行はB-treeインデックスで十分
  - (user_id, record_date)複合インデックスで1ユーザーのデータに <1ms

ボトルネック予測:
  ⚠️ case_similarity の更新
     10万件の総当たりは 10万²/2 = 50億ペア → 不可能
     → 解決: 同一疾患内のみ比較 + 上位スコアのみ保存
     → サブ問題: 1疾患に5万件集中した場合
     → 解決: pgvectorでANN（近似最近傍）を導入

  ⚠️ 夜間バッチの実行時間
     10万件のCase品質スコア再計算は重い
     → 解決: updated_atベースの差分更新のみ実行
```

## Consent撤回 1万件

```
同時撤回の最悪ケース:
  1万件 × (consents UPDATE + cases UPDATE) = 2万行 UPDATE

問題: 全て同期実行すると数分かかる可能性
→ 解決: 撤回キューをテーブルで管理。バックグラウンドで処理。
         ユーザーへは「処理中」を即時通知し、完了を非同期通知。

検索除外の即時性:
  RLSポリシーは consents.status / cases.consent_level を参照
  UPDATEが完了した時点で即座に検索除外 ✅

データ整合性:
  consent_audit_log で全撤回の証跡 ✅
```

## Experiment 100万件

```
experiments テーブル 100万行:
  index on (user_id, status) → ユーザーの実験一覧は問題なし ✅
  index on disease_keys (GIN) → 疾患別集計に使用 ✅

outcomes テーブル 100万行: 問題なし ✅

改善ランキングのクエリ:
  SELECT experiment.type, COUNT(*), AVG(effect_size)
  FROM outcomes JOIN experiments ON ...
  WHERE primary_disease_key = 'endometriosis'
  GROUP BY experiment.type
  → マテリアライズドビューで事前計算。夜間更新。 ✅
```

## EU進出

```
問題: GDPRはEUユーザーのデータがEU外に転送される場合にSCCが必要

現在の設計の問題点:
  ⚠️ Supabaseインスタンスが日本/US東部の場合、EUユーザーのデータが対象外
  ⚠️ consents.jurisdiction 列はあるが、物理的なデータ分離がない

解決策 (Phase F前に必要):
  Option A: SupabaseのEUリージョン追加 (推奨。最も簡単)
  Option B: EU専用Supabaseプロジェクトとデータフェデレーション
  Option C: SCCを締結してUS→EU転送を合法化

schema への影響:
  consents.jurisdiction = 'EU' のUserは EU DBインスタンスに保存
  anonymized_user_map は各リージョンに分離
  cases は研究利用時のみ集約（匿名化後）
```

## 製薬企業監査

```
監査で求められるもの:
  1. データの来歴 (Lineage): どのユーザーのどの記録か
  2. 同意の証跡 (Consent Trail): いつ何に同意したか
  3. データ品質の証拠 (Quality Evidence): Case Tier基準の文書
  4. 匿名化の証明 (Anonymization Proof): k-anonymity適用記録

現設計の対応状況:
  ✅ consent_audit_log で同意証跡
  ✅ case_quality_scores で品質証拠
  ✅ version列で再計算履歴
  ⚠️ 匿名化実行ログが未設計 → anonymization_audit_log テーブルが必要
  ⚠️ IRB審査番号の記録場所が未設計 → research_exports テーブルが必要
```

## AIモデル変更

```
問題: effect_sizes[] の計算アルゴリズムを変更すると既存Outcomeが古くなる

現設計の対応:
  outcomes.version = smallint で管理
  再計算 → version+1 で新行INSERT
  旧バージョンは保持（履歴として参照可能）
  ✅ 問題なし

ただし:
  10万件のOutcomeを再計算するバッチが必要
  → pg_cron + Edge Function で段階実行可能
```

## Supabase移行 / Postgres移行

```
設計上の脱出戦略:
  - CDN ESM import (supabase.js) → 移行時に import先を変更
  - Edge Functions → 標準Deno/Cloudflare Workersに移植可能
  - RLSポリシー → 標準PostgreSQL構文 → 任意のPostgresに移植可能
  - Realtime (subscriptions) → Polling fallbackに切替可能

Supabase固有機能の影響:
  ✅ auth.uid() → pg_catalog.current_user に変換
  ✅ gen_random_uuid() → 標準Postgres
  ⚠️ supabase_realtime publication → 代替実装が必要
  ⚠️ Supabase Edge Functions → 移植コスト高

総評: 移行コストは高いが不可能ではない。
      Critical pathはDB schema（標準Postgres準拠）✅
```

---

# 出力11: IMPLEMENTATION PHASES

## Phase A: DB Foundation（並行作業可能 / 4〜8週間）

**目的:** 新テーブル群を本番環境に作成。既存機能に一切影響しない。

```
成果物:
  ✓ Migration M-001〜M-043 実行完了
  ✓ symptoms / factor_definitions マスターデータ投入
  ✓ disease_definitions マスターデータ投入
  ✓ consents / consent_audit_log テーブル
  ✓ experiments / outcomes テーブル
  ✓ cases / case_quality_scores テーブル
  ✓ anonymized_user_map テーブル

完了条件:
  ✓ 全テーブルにRLS設定済み
  ✓ バックフィルM-040〜M-043完了
  ✓ 既存の全テスト（470件）がパス継続
  ✓ user_data.state との件数整合確認
```

**既存コードへの変更: ゼロ**

---

## Phase B: Dual Write（6〜10週間）

**目的:** 記録保存が新テーブルにも書かれるようにする。旧テーブルも継続。

```
成果物:
  ✓ record/save.js に records テーブルへのDual Write追加
  ✓ experiments テーブルへの書込み（startExperiment時）
  ✓ SymptomKey英語化の並行実装
    - 日本語文字列 → 英語key の変換マップ
    - 保存時は symptom_keys（英語）に書込み
    - 表示時は symptoms マスターから日本語名を取得

完了条件:
  ✓ records テーブルのデータが user_records と一致 (30日間監視)
  ✓ experiment 開始/完了が experiments テーブルに記録
  ✓ 既存UIへの影響ゼロ確認
```

**app-legacy.js への変更: ゼロ**  
**record/save.js: 変更あり（追加のみ）**

---

## Phase C: Case Generation（8〜12週間）

**目的:** Case生成パイプラインを実装。PRO検索の土台を作る。

```
成果物:
  ✓ Case Eligibility Checker（Edge Function）
  ✓ CaseCandidate通知UI（新コンポーネント）
  ✓ Consent Level 1取得フロー（新オーバーレイ）
  ✓ cases / case_quality_scores 生成バッチ
  ✓ Outcome生成（Experiment完了時）

完了条件:
  ✓ 既存ユーザーの中からTier3症例が生成されている
  ✓ Consent取得フローが動作
  ✓ 内部ダッシュボードで症例件数が確認できる
```

---

## Phase D: Consent System（4〜6週間）

**目的:** Consent管理を完全実装。Level 2まで取得可能にする。

```
成果物:
  ✓ Consent管理画面（設定画面内）
  ✓ Level 0→1→2 のアップグレードフロー
  ✓ Consent撤回フロー
  ✓ consent_audit_log の完全記録
  ✓ Privacy Policy更新（「集計値不遡及」明記）

完了条件:
  ✓ APPI準拠のConsentフローが動作
  ✓ 撤回時にPRO検索から即時除外
  ✓ audit_log に全操作が記録
```

---

## Phase E: PRO Case Search（10〜16週間）

**目的:** 有料機能「類似症例検索」「改善ランキング」を実装。

```
成果物:
  ✓ case_similarity 計算バッチ（夜間実行）
  ✓ 改善ランキング Materialized View
  ✓ PRO検索UI（類似症例リスト表示）
  ✓ AI症例要約（類似症例サマリー）
  ✓ 匿名化Stage 2 の適用確認

完了条件:
  ✓ PRO会員が類似症例10件以上を検索できる
  ✓ 改善ランキングが疾患別に表示できる
  ✓ 個人特定につながる情報が表示されないことを確認
```

---

## Phase F: Research Export & Pharma Layer（12〜24週間）

**目的:** B2B収益化の基盤。Consent Level 3対応。

```
成果物:
  ✓ research_exports テーブル
  ✓ anonymization_audit_log
  ✓ Consent Level 3 フロー
  ✓ k-anonymity チェックバッチ
  ✓ 研究者向けAPIエンドポイント（認証必須）
  ✓ IRB審査番号管理

完了条件:
  ✓ 製薬企業のデューデリジェンスに耐える監査証跡
  ✓ k≥5 の匿名化が全エクスポートに適用
  ✓ EU GDPRコンプライアンス確認完了
```

---

# 出力12: FOUNDER DECISIONS

## CRITICAL（後から変更すると症例DB全体に影響）

**[C-1] records.record_date はタイムゾーンなしのDATE型と今決定する**  
「ユーザーのローカル日付をそのまま保存。UTCへの変換は行わない」  
USや欧州展開後に変更すると全Record(3,000万行)の日付データが破損する可能性がある。

**[C-2] symptom_keys / factor_keys は英語キーに今すぐ移行する**  
日本語文字列（'下腹部痛'）をキーとして使い続けると:
- 国際化が永遠にできない
- 症状マスターとの結合ができない
- B2B/研究利用でMedDRAマッピングができない  
10万件時点での変更は不可能に近い。Phase Bで対処する。

**[C-3] Case IDの形式 `CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}` を確定**  
論文・研究データベースに記録されたCase IDは永久に参照される。  
一度発行したCase IDは変更不可。形式も変更不可。

**[C-4] DiseaseKeyは英語キー固定・変更禁止と宣言**  
`endometriosis`, `ovarianCyst`, `pcos` 等の既存キーは変更禁止。  
追加はよい。変更すると disease_profiles / experiments / cases が全壊する。  
ICD-10コードを今のうちに disease_definitions テーブルに追加すること。

**[C-5] anonymized_user_map の不可逆性を宣言**  
一度発行した anonymized_id は対応する user_id に戻せない（Service Roleを除く）。  
この宣言をPrivacy Policyに明記してからConsentフローを開始すること。

**[C-6] 「匿名集計値への撤回不遡及」をPrivacy Policyに明記**  
Phase C（Case生成）開始前に必ず行うこと。  
後から追加すると全既存ユーザーへの再通知義務が発生する。

**[C-7] outcomes は生成後immutable（version管理で再計算）**  
生成されたOutcomeのレコードを UPDATE してはいけない。  
再計算は version+1 で新行INSERT。旧バージョンは保持。  
これを破ると症例の改善率が遡及して変わり、製薬企業監査でアウトになる。

**[C-8] user_data テーブルはPhase F完了まで廃止しない**  
移行期間中、user_data は読み取り専用のバックアップとして保持し続ける。  
性急な廃止は既存ユーザーデータの完全喪失につながる。

---

## IMPORTANT（早期に固定が望ましいが修正コストは許容範囲）

**[I-1] Case Tier閾値（30日/90日/180日）を固定**  
Tier変更はB2B契約書記載の症例数の定義変更に直結する。

**[I-2] Experiment 単一ファクター原則をUIで強制**  
「複数ファクター同時変更」をシステムが許可しないこと。  
後から緩和すると既存Outcomeの解釈が全て変わる。

**[I-3] k=5（k-anonymity閾値）の設定**  
Pharma向けエクスポートの前に固定。GDPRガイドラインに準拠した値を確認すること。

**[I-4] 改善ランキングの計算基準（effect size閾値）**  
「改善」と判定するCohen's d = 0.2 の閾値を製品仕様として宣言。  
ランキングのマーケティング資料に記載後は変更困難。

---

# ARCHITECTURE_V3 完成版サマリー

## アーキテクチャ判定

| 項目 | 現在 | Phase A完了後 | Phase F完了後 |
|------|------|-------------|-------------|
| 症例DB | 存在しない | 生成可能 | 研究利用可能 |
| 最大記録件数 | localStorage制限 | 無制限 | 無制限 |
| 症例検索 | 不可能 | 内部利用可 | PRO検索 + 研究利用 |
| 匿名化 | 存在しない | Stage 1 | Stage 2 (k=5) |
| GDPR対応 | 非対応 | Level 1対応 | Level 3対応 |
| app-legacy.js | 10,804行 | 10,804行 (変更なし) | 段階的削除中 |

## 5年後（症例10万件）での破綻評価

| 懸念 | 破綻するか | 対策 |
|------|-----------|------|
| records 3,000万行 | しない | 複合インデックスで対処 |
| case_similarity 全件計算 | する | pgvector ANN + 同疾患内のみ比較 |
| Consent撤回1万件同時 | しない | 非同期キュー処理 |
| EU展開のデータ主権 | する（設計変更必要） | Phase F前にEUリージョン追加 |
| 製薬企業監査 | しない | consent_audit_log + research_exports |
| SymptomKey英語化未実施 | する | Phase Bで必ず実施 |
| DiseaseKeyの変更 | する | 変更禁止を今宣言 |

---

*ARCHITECTURE_V3.md — Version 1.0 — Architecture Design Council承認*  
*次フェーズ: Phase 4 — Platform Design (Experiment/Case/PRO機能の詳細UI設計)*
