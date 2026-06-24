# DOMAIN_MODEL_V1.md
## IPPO EVOLUTION PROGRAM — Phase 2: Domain Model Design

Version: 1.0  
Generated: 2026-06-24  
Authority: Domain Design Council (7名)  
Status: APPROVED — 実装設計の基盤とする

評価基準: 「5年後に症例DB 10万件を保有した時でも破綻しないか」

---

# 出力1: DOMAIN OVERVIEW

## Core Domain（競合差別化の核）

| ドメイン | 責務 | なぜCoreか |
|---------|------|-----------|
| **Case** | 症例の定義・品質管理・ライフサイクル | 症例DBがippoの唯一の長期資産。Caseが弱いとビジネスが消える |
| **Disease** | 11疾患の分類・分析・疾患別基準 | 疾患特化が競合との唯一の差。縮小・変更すると事業定義が崩れる |
| **Experiment** | 介入の設計・実施・ライフサイクル管理 | 症例にOutcomeを付与する唯一の機構。Experimentなき症例は弱い |

**Core Domainの原則:**
- Core Domain間の依存関係は最小化する
- Core Domainのモデル変更はFounder決裁必須
- Core Domainのコードは外部ライブラリに委任しない

---

## Supporting Domain（Core Domainを支える）

| ドメイン | 責務 | 依存関係 |
|---------|------|---------|
| **Record** | 日々の健康記録の収集・正規化 | Case / Experiment が依存 |
| **Symptom** | 症状分類・タクソノミー管理 | Record / Disease が依存 |
| **Outcome** | 実験前後の比較・効果量計算 | Experiment が生成。Case品質に影響 |
| **Consent** | 同意の取得・管理・法域対応 | Case公開の前提条件。Regulatory要件 |

---

## Generic Domain（汎用。差別化しない）

| ドメイン | 責務 | 方針 |
|---------|------|------|
| **User** | 認証・プロファイル・設定 | Supabase Auth委任。最小化 |
| **Notification** | リマインダー・プッシュ通知 | 汎用インフラ |
| **Food** | 食事記録（現在は非構造化テキスト） | 将来のRecord拡張として位置づけ。独立ドメイン化は後回し |
| **Similarity** | 類似症例検索エンジン | Supporting（PRO機能の実装層）。CaseとDisease に依存 |

---

## 境界の原則

```
[ Core Domain ]           [ Supporting Domain ]      [ Generic Domain ]
  Case                      Record                     User
  Disease           ←依存   Symptom            ←依存  Notification
  Experiment                Outcome                    Food
                            Consent
```

**双方向依存禁止:**  
Core Domainは互いに直接依存しない。
依存する場合はIDによる参照のみとする（オブジェクト参照ではなく識別子参照）。

---

# 出力2: EXPERIMENT DOMAIN

## Experimentとは何か

> **Experimentとは、ユーザーが特定の健康上の疑問（仮説）を検証するために、単一のファクターを一定期間意図的に変更し、その前後の健康指標の変化を記録する時間境界付きの介入である。**

**単一ファクター原則 (Single Factor Principle):**  
1回のExperimentで変更するファクターは1つのみ。  
理由: 複数因子の同時変更では因果関係の特定が不可能になり、Outcomeの価値が失われる。  
この原則はシステムが強制する（ValidationルールとしてExperiment Domainが保持）。

---

## 開始条件 (Start Conditions)

| 条件 | 必須 | 理由 |
|------|------|------|
| 疾患タグが1つ以上設定されている | ✅ 必須 | 疾患文脈のないExperimentはCase品質に寄与しない |
| 直近14日以内に7日以上のRecord存在 | ✅ 必須 | ベースライン計算に最低7日のデータが必要 |
| 同一ファクターのActive Experimentが存在しない | ✅ 必須 | 単一ファクター原則 |
| 仮説テキストが入力されている | 推奨 | なくてもよい。あるとOutcome品質が上がる |
| 期間設定 (7日以上、180日以下) | ✅ 必須 | 7日未満は統計的に意味がない。180日超は完了率が極端に下がる |

---

## 終了条件 (End Conditions)

| 種別 | 条件 |
|------|------|
| **正常完了** | 設定期間が終了し、Outcome生成が可能な記録密度がある |
| **ユーザー完了** | 期間終了前にユーザーが明示的に「完了」を宣言 (最低7日経過後のみ可) |

---

## 中断条件 (Abandon Conditions)

| 種別 | 条件 | 処理 |
|------|------|------|
| ユーザー中断 | ユーザーが明示的に中断宣言 | Abandoned状態へ。理由を必須入力 |
| 自動中断 | 14日以上連続してRecordが記録されない | Abandoned状態へ。システムが通知後7日で移行 |
| 競合中断 | 同一ファクターの別Experimentが開始された | Invalid状態へ（設計上起こらないが防御的に定義） |

**重要:** Abandonedになった場合でも、記録されたRecordはCaseに含まれる。Abandoned Experimentは「完了Experiment」としてカウントされないが、Outcomeが生成できる場合はPartial Outcomeとして記録する。

---

## 成功条件 / 失敗条件

| 条件 | 定義 |
|------|------|
| **成功** | Outcomeが生成され、Effect SizeがCohen's d ≥ 0.2（小効果）以上 |
| **失敗** | Outcomeが生成され、Effect Size < 0.2（変化なし判定） |
| **判定不能** | Outcomeを生成するのに十分な記録密度がない（記録カバー率 < 50%） |

**注:** 「失敗」は症例価値として「成功」と同等である。「試したが効果がなかった」情報は、製薬研究・類似症例検索においてむしろ希少価値がある。

---

## Experiment Type（分類体系）

```
ExperimentType (enum)
  ├── DIETARY
  │     ├── ELIMINATION    // 食事除去（グルテン、乳製品、カフェイン等）
  │     ├── FASTING        // 断食・プチ断食・時間制限食
  │     ├── ADDITION       // 特定食品の追加（抗炎症食等）
  │     └── RESTRICTION    // カロリー・糖質制限
  │
  ├── LIFESTYLE
  │     ├── SLEEP          // 睡眠改善（就寝時間、入眠ルーティン等）
  │     ├── EXERCISE       // 運動（種類・頻度・強度の変更）
  │     ├── STRESS         // ストレス管理（瞑想、呼吸法等）
  │     └── HEAT_THERAPY   // 入浴・温熱療法
  │
  ├── SUPPLEMENT
  │     ├── HERBAL         // 漢方・植物由来
  │     └── NUTRITIONAL    // ビタミン・ミネラル・サプリ
  │
  ├── MEDICAL              // ⚠️ 要特別扱い
  │     ├── MEDICATION_CHANGE  // 薬剤変更（医師指示下であることを記録）
  │     └── TREATMENT_CHANGE   // 治療法変更
  │
  └── OTHER               // 自由入力カテゴリ
```

**MEDICALカテゴリの特別処理:**
- 医師の指示下での変更である旨をユーザーに確認させる
- 効果の帰属が不明瞭になるため、Outcome解釈に「medical_intervention」フラグを立てる
- Pharma向けデータとして別途管理する可能性がある（規制対応）

---

## Experiment Lifecycle（状態遷移）

```
                    ┌─────────────────┐
                    │     DRAFT       │  ユーザーが設定中。まだ開始していない
                    └────────┬────────┘
                             │ start() [開始条件充足]
                             ▼
                    ┌─────────────────┐
               ┌───│     ACTIVE      │  記録中。介入実施中
               │   └────────┬────────┘
               │            │ complete() [終了条件充足]
               │            │              または期間満了
               │            ▼
               │   ┌─────────────────┐
               │   │   COMPLETED     │  Outcome生成済み
               │   └────────┬────────┘
               │            │
               │            ▼
               │   ┌─────────────────┐
               │   │   EVALUATED     │  Case品質スコアに反映済み
               │   └─────────────────┘
               │
               │ abandon() [中断条件]
               ▼
      ┌─────────────────────┐
      │      ABANDONED      │  中断。理由記録あり
      └─────────────────────┘
             ※ Partial Outcome生成可能な場合は生成してから状態遷移
```

---

## Experiment Aggregate Root

```
Experiment {
  // Identity
  id:             ExperimentId       // 不変
  userId:         UserId             // 参照のみ
  caseId:         CaseId             // 紐づくCase（存在する場合）

  // Config
  type:           ExperimentType
  factor:         string             // 単一ファクター名
  hypothesis:     string | null      // 「〇〇をすると△△が変わると思う」
  plannedDays:    integer            // 計画期間（7-180日）
  diseaseKeys:    DiseaseKey[]       // 対象疾患（最低1つ）

  // Timeline
  status:         ExperimentStatus
  startedAt:      date
  plannedEndAt:   date
  actualEndAt:    date | null
  abandonedAt:    date | null
  abandonReason:  string | null

  // Linked
  outcomeId:      OutcomeId | null   // 完了後に生成
  recordIds:      RecordId[]         // 期間中のRecord参照（読み取りのみ）

  // Metadata
  createdAt:      datetime
  updatedAt:      datetime
}
```

**Aggregate Rootの不変条件:**
1. `factor` は変更不可（開始後）
2. `plannedDays` は変更不可（開始後）
3. `diseaseKeys` は開始後も変更可（疾患診断が変わることがあるため）
4. Abandonされた後のstatusは変更不可

---

# 出力3: OUTCOME DOMAIN

## Outcomeとは何か

**Council審議結果:**

> **OutcomeはExperimentの測定結果であり、かつCaseの品質評価コンポーネントである。両方である。**

OutcomeはExperiment Domainの外に存在する独立した概念として定義する。  
理由: Experimentなしに生成されるOutcomeが将来的に存在し得るから（治療変更のOutcomeなど）。

> **Outcomeとは、特定の介入期間前後において、定義された健康指標に発生した変化の測定値と、その変化の統計的な解釈である。**

---

## Before / After Metrics

```
MetricSnapshot {
  // Primary（全Caseで必須）
  painLevel:      Stat    // 平均・中央値・標準偏差
  energyScore:    Stat
  sleepQuality:   Stat
  wellnessScore:  Stat

  // Symptom Frequency
  symptomFrequency: Map<SymptomKey, float>  // 症状名 → 出現率(0-1)

  // Secondary（あれば加点）
  bodyTemp:       Stat | null
  flareCount:     integer | null    // フレア日数
  periodPainDays: integer | null    // 生理痛日数（月経周期がある場合）

  // Meta
  period:         DateRange
  recordCount:    integer          // この期間のRecord数
  coverageRate:   float            // 記録密度(0-1)
}

Stat {
  mean:   float
  median: float
  sd:     float
  n:      integer
}
```

**Before期間定義:** Experiment開始前14日（記録のある日のみカウント）  
**After期間定義:** Experiment終了前14日（記録のある日のみカウント）  
**最低サンプル:** Before / After それぞれ最低5日分の記録が必要。不足時は「判定不能」。

---

## Effect Size

```
EffectSize {
  metric:      MetricKey
  cohensD:     float              // (afterMean - beforeMean) / pooledSD
  direction:   'positive' | 'negative' | 'none'
  magnitude:   'large' | 'medium' | 'small' | 'negligible'
  //           ≥0.8    |   ≥0.5   |  ≥0.2  |   <0.2
  isInverted:  boolean            // 痛み指標は「下がる」=改善
}
```

**Cohen's d 選択根拠:**  
医療研究における標準的な効果量指標。製薬企業・研究者が即座に理解できる。  
独自指標を使うと、将来のB2B・研究利用時に再計算が必要になる。

---

## Confidence

```
Confidence {
  level:       'high' | 'medium' | 'low' | 'insufficient'
  //           n≥14  |   n≥7   |   n≥5  |   n<5
  factors: {
    sampleSize:      boolean   // Before/After各7日以上
    coverageRate:    boolean   // 各期間70%以上
    singleFactor:    boolean   // Experiment中の追加変更なし
    noConfounder:    boolean   // 別Experimentとの重複なし（システムが検出）
  }
}
```

---

## Outcome Category（結果分類）

| Category | 判定基準 | 注記 |
|----------|---------|------|
| `IMPROVED` | 主要指標の効果量 cohensD ≥ 0.2、改善方向 | |
| `WORSENED` | 主要指標の効果量 cohensD ≥ 0.2、悪化方向 | 同等の価値。悪化も重要な情報 |
| `NO_CHANGE` | 主要指標の効果量 cohensD < 0.2 | |
| `INDETERMINATE` | Confidence = 'insufficient' | データ不足 |
| `PARTIAL` | AbandonedのExperimentから生成 | 限定的な解釈 |

---

## Outcome Quality Score（0-100）

```
OutcomeQualityScore = (
  sampleSizeScore     × 0.30  // Before/After各n: n≥14→100, n≥7→60, n≥5→30
  + coverageScore     × 0.25  // Before/After密度の平均
  + singleFactorScore × 0.20  // 単一ファクター確認: YES→100, NO→0
  + confoundersScore  × 0.15  // 交絡因子なし: クリア→100, 疑い→50, あり→0
  + hypothesisScore   × 0.10  // 仮説があった: YES→100, NO→0（加点のみ）
)
```

---

## Outcome Aggregate Root

```
Outcome {
  id:             OutcomeId
  experimentId:   ExperimentId    // 1:1
  caseId:         CaseId          // Caseへの参照

  before:         MetricSnapshot
  after:          MetricSnapshot
  effectSizes:    EffectSize[]    // 各指標のeffect size
  confidence:     Confidence
  category:       OutcomeCategory
  qualityScore:   float           // 0-100

  // 研究利用向けメタデータ
  isMedicalIntervention: boolean
  physicianInvolved:     boolean | null

  generatedAt:    datetime
  version:        integer         // 再計算された場合にインクリメント
}
```

**不変条件:**  
OutcomeはExperimentがCOMPLETEDまたはABANDONED（7日以上経過）になった後にのみ生成される。  
生成後のOutcomeは読み取り専用。再計算が必要な場合はversionをインクリメントして新Outcomeを生成する（過去バージョンは保持）。

---

# 出力4: CASE DOMAIN

## Caseとは何か

**Council最重要定義:**

> **Caseとは、特定の疾患を持つユーザーが一定期間にわたって構造化された健康記録を継続し、少なくとも1つの介入（Experiment）を通じて前後変化を記録した、他者が参照可能な完結した健康体験の構造化データである。**

**Caseは記録の束ではない。**  
RecordはCaseの素材に過ぎない。Caseは、その素材から生成された意味のある物語（narrative）であり、プラットフォームの検索・比較・学習の単位である。

**Caseは1ユーザー × 1疾患 × 1生成タイミングの組み合わせで1件となる。**  
同一ユーザーが異なる疾患で複数Caseを持てる。同一ユーザー × 同一疾患でも、記録が十分に積み上がれば更新によりTierが上がる（新しいCaseを生成するのではなく、既存Caseが昇格する）。

---

## Case生成条件

```
CaseGenerationConditions {
  required: [
    diseaseTagExists        // state.myDiseases に疾患が1つ以上設定
    recordsMinDays >= 30    // 30日分以上のRecord存在
    coverageRate >= 0.60    // 30日中18日以上記録
    coreMerricsPresent      // painLevel / symptoms のいずれかが記録に存在
  ]
  triggers: [
    userInitiated           // ユーザーが「症例として登録」を選択
    autoEligibilityDetected // システムが条件充足を検出し通知→ユーザー承認
  ]
}
```

**自動生成はしない。** ユーザーの明示的な承認が必要。  
理由: Consentの観点から、ユーザーが自分のデータがCaseとして登録されることを認識している必要がある。

---

## Case失効条件

| 条件 | 処理 |
|------|------|
| ユーザーがアカウント削除 | Case → `ARCHIVED`（匿名化済みの場合は保持、未同意の場合は削除） |
| Consent撤回 | Case → `CONSENT_WITHDRAWN`（データは保持するが検索対象外） |
| 疾患タグ全削除 | Case → `INVALIDATED`（疾患文脈が失われた症例は無効） |
| 管理者による品質違反検出 | Case → `SUSPENDED` |

---

## Case更新条件

| 更新種別 | 条件 | 処理 |
|---------|------|------|
| Tier昇格 | 品質スコアが次Tier閾値を超えた | 自動再評価→ユーザー確認→昇格 |
| Outcome追加 | 新しいExperimentが完了した | Case品質スコア再計算 |
| Record追加 | 記録が継続された | 定期的な品質スコア再計算 |
| Consent更新 | 同意レベルが変更された | Case公開条件の即時更新 |

---

## Case公開条件

| 公開レベル | 条件 |
|-----------|------|
| 内部分析（自動） | Tier3以上 |
| PRO検索対象 | Tier2以上 + Consent Level 1以上 |
| 研究利用対象 | Tier1 + Consent Level 2以上 + 匿名化完了 |
| Pharma/外部提供 | Tier1 + Consent Level 3 + 倫理委員会相当審査完了 |

---

## Case検索対象条件

類似症例検索に出現するための最低条件:
- Tier2以上
- Consent Level 1以上（プラットフォーム内利用に同意）
- 匿名化済み（UserIdとの直接リンク解除）
- 疾患タグが1つ以上確定

---

## Case ID戦略

**形式:** `CASE-{DiseasePrefix}-{YearMonth}-{RandomAlphanumeric8}`

例:
- `CASE-ENDO-202607-A3X9M2KP` （子宮内膜症、2026年7月登録）
- `CASE-PCOS-202608-B7R4N1QW` （PCOS、2026年8月登録）

**設計原則:**
1. **不変**: 一度発行されたCase IDは変更しない
2. **非推測可能**: RandomAlphanumeric8でユーザー特定を防止
3. **疾患情報を含む**: 検索・ルーティングの効率化（ただし将来的にはプレフィクスを外すことも検討）
4. **UserIDと分離**: Case IDからUser IDを逆引きできない
5. **研究参照可能**: 論文引用・臨床研究でのCase ID参照を前提とした形式

**[CRITICAL]** Case IDの体系は一度決めると変更不可。論文・研究データベースに記録されたIDは永久に追跡される。

---

## Case Aggregate Root

```
Case {
  // Identity
  id:             CaseId              // 不変。CASE-{Disease}-{YearMonth}-{Random8}
  anonymizedUserId: AnonymizedUserId  // 統計分析用。UserIdの直接保持は避ける
  diseaseKeys:    DiseaseKey[]        // 疾患（最低1つ）

  // Lifecycle
  status:         CaseStatus
  tier:           CaseTier            // CANDIDATE / TIER3 / TIER2 / TIER1 / ARCHIVED
  qualityScore:   CaseQualityScore    // 0-100

  // Content references (IDのみ保持、オブジェクトは参照しない)
  recordSummary:  RecordSummary       // 記録の集計値（非正規化して保持）
  experimentIds:  ExperimentId[]
  outcomeIds:     OutcomeId[]

  // Temporal
  caseStartDate:  date                // 最初のRecordの日付
  caseEndDate:    date | null         // オープンエンド（記録継続中）
  registeredAt:   datetime
  lastEvaluatedAt: datetime

  // Consent
  consentId:      ConsentId
  consentLevel:   ConsentLevel        // 0-4

  // Metadata for search
  searchMetadata: CaseSearchMetadata  // 検索エンジン向け非正規化データ

  // Audit
  createdAt:      datetime
  updatedAt:      datetime
  version:        integer
}

CaseSearchMetadata {
  primaryDisease:     DiseaseKey
  experimentTypes:    ExperimentType[]
  outcomeCategories:  OutcomeCategory[]
  recordMonths:       integer         // 総記録月数
  topSymptoms:        SymptomKey[]    // 上位5症状
  hasImprovedOutcome: boolean
  avgPainBefore:      float | null
  avgPainAfter:       float | null
}
```

---

## Case Lifecycle 正式状態遷移

**Phase 1提案(`Candidate→Tier3→Tier2→Tier1→Archived`)の評価:**

提案は概ね正しいが3点修正が必要:
1. `Candidate` を `PRE_CANDIDATE` と `CANDIDATE` に分離（条件充足前と承認待ちを区別）
2. `SUSPENDED` 状態を追加（品質違反・調査中）
3. `CONSENT_WITHDRAWN` を独立状態として追加

```
                         [記録開始]
                             │
                             ▼
                    ┌─────────────────┐
                    │  PRE_CANDIDATE  │  記録はあるが条件未充足
                    └────────┬────────┘
                             │ 30日/60%カバー達成
                             ▼
                    ┌─────────────────┐
                    │   CANDIDATE     │  条件充足。ユーザーへ通知済み
                    └────────┬────────┘
                             │ ユーザー承認 + Consent Level 1
                             ▼
                    ┌─────────────────┐
                    │     TIER 3      │  最小症例。内部分析対象
                    └────────┬────────┘
                             │ 90日/70%/実験1件完了
                             ▼
                    ┌─────────────────┐
                    │     TIER 2      │  標準症例。PRO検索対象
                    └────────┬────────┘
                             │ 180日/80%/実験2件/Consent Level 2
                             ▼
                    ┌─────────────────┐
                    │     TIER 1      │  高品質症例。研究利用対象
                    └─────────────────┘

                    どのステータスからも移行可能:
                    ├── SUSPENDED      管理者調査中（品質違反疑い）
                    ├── CONSENT_WITHDRAWN  同意撤回（検索対象外）
                    └── ARCHIVED       アカウント削除/疾患タグ削除/無効化
```

**Tier降格は発生するか?**  
Council決定: **Tier降格なし**。  
理由: 一度Tier2に達した症例が記録が途絶えてもTier2として価値を持つ。降格させると症例DBの総件数が不安定になり、B2B交渉時の信頼性を損なう。ただしQualityScoreは動的に更新する。

---

# 出力5: CASE QUALITY SYSTEM

## Case Quality Score（0-100）

### スコアリング設計方針

Council審議: **絶対スコア vs 相対スコア**  
決定: **絶対スコア採用**  
理由: 相対スコア（同疾患ユーザー内の百分位）はユーザー数が少ない初期に不安定になる。10万件時でも一貫して同じ基準で評価できる絶対スコアが5年後まで持つ。

### スコア計算式

```
CaseQualityScore = (
  recordVolume        × 0.25   // 記録量
  + recordDensity     × 0.20   // 記録密度
  + dataCompleteness  × 0.20   // データ完全性
  + experimentQuality × 0.20   // 実験品質
  + outcomeQuality    × 0.10   // アウトカム品質
  + consentLevel      × 0.05   // 同意レベル
) × diseaseTagMultiplier       // 疾患タグ補正
```

### 各次元の詳細

**① recordVolume（0-100）**
```
days_recorded >= 365 → 100
days_recorded >= 180 → 80
days_recorded >= 90  → 60
days_recorded >= 30  → 30
days_recorded < 30   → 0
```

**② recordDensity（0-100）**
```
coverage_rate = days_recorded / (caseEndDate - caseStartDate).days
coverage >= 0.85 → 100
coverage >= 0.70 → 75
coverage >= 0.60 → 50
coverage >= 0.40 → 25
coverage < 0.40  → 0
```

**③ dataCompleteness（0-100）**  
各Recordの記入項目率の平均:
```
per_record_completeness = 記入済みコアフィールド数 / 総コアフィールド数
// コアフィールド: painLevel, energy, sleepQuality, symptoms[], wellnessScore (5項目)
avg_completeness = mean(per_record_completeness)
score = avg_completeness × 100
```

**④ experimentQuality（0-100）**
```
completed_experiments = 0  → 0
completed_experiments = 1  → 50 + (outcomeQuality × 0.3)
completed_experiments = 2  → 75 + (avgOutcomeQuality × 0.25)
completed_experiments >= 3 → 90 + (avgOutcomeQuality × 0.10)
```

**⑤ outcomeQuality（0-100）**
```
= mean(Outcome.qualityScore for all COMPLETED experiments)
// OutcomeがないCaseは0
```

**⑥ consentLevel（0-100）**
```
Level 0 (未設定)   → 0
Level 1 (Platform) → 50
Level 2 (Research) → 75
Level 3 (Commercial) → 90
Level 4 (Full)     → 100
```

**diseaseTagMultiplier:**
```
疾患タグ 0件 → 0.0   （疾患文脈なし。事実上Case不成立）
疾患タグ 1件 → 1.0
疾患タグ 2件 → 1.05  （複合疾患として研究価値が高い）
疾患タグ 3件以上 → 1.08
```

---

### Tier閾値

| Tier | スコア閾値 | 追加必須条件 |
|------|-----------|------------|
| **Tier 3** | ≥ 30 | 疾患タグ1件以上、記録30日以上、Consent Level 1以上 |
| **Tier 2** | ≥ 55 | 疾患タグ1件以上、記録90日以上、実験完了1件以上 |
| **Tier 1** | ≥ 75 | 疾患タグ1件以上、記録180日以上、実験完了2件以上、Consent Level 2以上 |

---

# 出力6: CONSENT DOMAIN

## Consentとは何か

**Regulatory Architectからの警告:**  
Consentは「ボタンを押す行為」ではない。法的に有効なConsentは以下を満たす必要がある。
1. **Informed（十分な説明）**: 何に同意しているかを理解した上で
2. **Voluntary（任意）**: 強制なく
3. **Specific（目的特定）**: 何のためのデータ利用かが明示されている
4. **Revocable（撤回可能）**: いつでも撤回できる
5. **Documented（記録）**: 同意の事実と内容が記録されている

> **Consentとは、ユーザーが自分の健康データを特定の目的・範囲・期間において第三者が利用することを、十分な情報提供のもとで自由意志により承認する法的行為、およびその記録である。**

---

## 同意レベル体系（Consent Level 0-4）

```
Level 0: 未同意
  データはユーザー自身のみが利用可能
  Case登録不可、PRO検索対象外

Level 1: Platform利用同意
  「ippoのサービス改善のために匿名化したデータを利用することに同意する」
  - ippo内部のアルゴリズム改善
  - PRO検索対象（同一プラットフォーム内の類似症例表示）
  対象法域: 全法域で最低限必要

Level 2: 研究利用同意
  「匿名化したデータを学術研究・公衆衛生研究に提供することに同意する」
  - 大学・研究機関への非特定化データ提供
  - 疫学的集計への参加
  対象法域: GDPR明示的同意が必要（第9条：健康データ）

Level 3: 商業利用同意
  「匿名化したデータを製薬企業・医療機器企業の研究開発に提供することに同意する」
  - Pharma向けデータライセンス
  - 臨床試験患者リクルート（連絡は匿名ブローカー経由）
  対象法域: 全法域で最高水準の保護が必要

Level 4: 完全同意
  「個人が特定されない形で、将来の追加的な医療・健康研究に広く利用されることに同意する」
  - 将来の利用目的が特定できない研究
  - ICH-GCP標準に準拠した同意フォームが別途必要
  注: EUではこの形式のConsent取得は実質困難。EU展開時は設計見直し。
```

---

## 取得タイミング

| タイミング | 取得内容 | 強制度 |
|-----------|---------|--------|
| オンボーディング | Level 0確認 + Level 1の案内 | Level 1は任意 |
| Case登録申請時 | Level 1以上の確認 | Level 1必須 |
| PRO機能初利用時 | Level 1の再確認 | 必須 |
| Tier2達成通知時 | Level 2の案内 | 任意。インセンティブ提示可 |
| Pharma連携開始時（将来） | Level 3の取得 | 任意。明示的報酬提示 |

---

## 撤回ルール

**Council決定: 撤回は即座に有効。ただし既に処理された匿名集計には影響しない。**

```
撤回が適用される範囲:
  ✓ 将来のデータ収集
  ✓ 個人と紐づく形でのCase公開
  ✓ 新規のデータ提供

撤回が適用されない範囲（これを事前に明示することが必須）:
  ✗ 既に論文・研究に組み込まれた匿名集計データ
  ✗ 集計済みの統計値（個人特定不可能な形式）
  ✗ 匿名化IDで記録された過去のCase参照
```

**この「撤回の限界」をConsentフォームに明記することがGDPR/APPI準拠の要件。**

---

## 匿名化との関係

Consentと匿名化は別の概念である。

```
匿名化の段階:
  Stage 1: 仮名化 (Pseudonymization)
    UserIdを AnonymizedUserId に置換。ippo内部では復元可能。
    → Level 1 Consentで使用可能
    → GDPR上は「個人データ」として扱われる

  Stage 2: 匿名化 (Anonymization / k-anonymity)
    k≥5の同質グループに属する場合のみ開示。
    直接識別子・準識別子の除去。
    → Level 2/3 Consentで使用可能
    → GDPR上の「個人データ」から除外される

  Stage 3: 集計化 (Aggregation)
    個人レコードを統計値に変換。
    → Consentなしでも使用可能
    → 改善ランキング等の機能に使用
```

---

## 研究利用・Case公開との関係

```
Consent Level → 許可される用途

Level 1: PRO検索表示、ippo内アルゴリズム改善
Level 2: 大学研究提供（匿名化Stage2必須）、疫学研究
Level 3: Pharmaライセンス（匿名化Stage2必須、契約必須）
Level 4: 将来用途（別途ICH-GCP同意書必須）
```

---

## Consent Lifecycle 評価と拡張

**提案の `Pending → Granted → Withdrawn` は不十分。**

理由:
1. ConsentにはVersionが必要（利用規約改定時に再取得が必要）
2. 部分的なGrantが必要（Level 1のみGrantなど）
3. Expiredが必要（研究目的のConsentには有効期限がある）
4. Suspendedが必要（調査中で一時的に無効化）

```
             ┌─────────────────┐
             │    PENDING      │  ユーザーが同意フローを未完了
             └────────┬────────┘
                      │ 同意フロー完了
                      ▼
             ┌─────────────────┐
             │    GRANTED      │  有効な同意あり
             │  (Level 0-4)    │
             └────────┬────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
  ┌──────────────┐ ┌──────────┐ ┌──────────────┐
  │  WITHDRAWN   │ │ EXPIRED  │ │  SUSPENDED   │
  │ (ユーザー撤回) │ │(有効期限) │ │  (調査中)   │
  └──────────────┘ └──────────┘ └──────────────┘

  ※ WITHDRAWNからGRANTEDへの再取得は可能（新規同意として記録）
  ※ 全ての状態遷移は audit_log に記録（法的証跡）
```

**Consent Version管理:**
```
Consent {
  id:              ConsentId
  userId:          UserId
  caseId:          CaseId
  level:           ConsentLevel    // 0-4
  status:          ConsentStatus
  policyVersion:   string          // 利用規約バージョン "v1.2"
  jurisdiction:    Jurisdiction    // 'JP' | 'EU' | 'US' | 'OTHER'
  grantedAt:       datetime | null
  withdrawnAt:     datetime | null
  expiresAt:       datetime | null // 研究目的は期限付き
  ipAddress:       string          // 法的証跡（ハッシュ化）
  userAgent:       string          // 法的証跡
  auditLog:        ConsentAuditEntry[]
}
```

---

# 出力7: DOMAIN RELATIONSHIP MAP

```
╔══════════════════════════════════════════════════════════════════╗
║                    DOMAIN RELATIONSHIP MAP                       ║
╚══════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│ GENERIC DOMAIN                                                  │
│                                                                 │
│  ┌─────────┐                                                   │
│  │  User   │ id, profile, auth                                 │
│  └────┬────┘                                                   │
└───────┼─────────────────────────────────────────────────────────┘
        │ 1
        │ ╔════════════════════════╗
        │ ║ 1 User : N Records    ║
        │ ╚════════════════════════╝
        │ N
┌───────┴─────────────────────────────────────────────────────────┐
│ SUPPORTING DOMAIN                                               │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │  Record                                  │                  │
│  │  id, date, symptoms[], factors[],        │                  │
│  │  painLevel, energy, sleepQuality,        │                  │
│  │  wellnessScore, bodyTemp, mealNote       │                  │
│  └──────┬────────────────────┬──────────────┘                  │
│         │ references         │ references                       │
│         ▼                    ▼                                  │
│  ┌─────────────┐    ┌─────────────────────┐                   │
│  │  Symptom    │    │      Disease        │                    │
│  │  taxonomy   │    │  DiseaseKey, Name,  │                    │
│  │  33 symptoms│    │  Analyzer, Priority │                    │
│  └─────────────┘    └──────────┬──────────┘                   │
│                                │ tags                           │
│  ┌──────────────────────────   │                               │
│  │  Consent                 │  │                               │
│  │  id, level, status,      │  │                               │
│  │  jurisdiction, version   │  │                               │
│  └──────────┬───────────────┘  │                               │
└─────────────┼───────────────────┼───────────────────────────────┘
              │ governs           │ classifies
              │                   │
┌─────────────┼───────────────────┼───────────────────────────────┐
│ CORE DOMAIN │                   │                               │
│             ▼                   │                               │
│  ┌──────────────────────────────┴──────┐                       │
│  │              Case                   │  ← Core Unit          │
│  │  id, tier, qualityScore,            │                       │
│  │  diseaseKeys[], status,             │                       │
│  │  caseStartDate, registeredAt,       │                       │
│  │  consentId, searchMetadata          │                       │
│  └────┬──────────────┬─────────────────┘                       │
│       │ 1:N          │ 1:N                                     │
│       ▼              ▼                                         │
│  ┌──────────┐  ┌──────────────────────────────┐               │
│  │Experiment│  │          Outcome             │               │
│  │id, type, │  │id, before, after,            │               │
│  │factor,   │→─│effectSizes[], confidence,    │               │
│  │lifecycle │  │category, qualityScore        │               │
│  └──────────┘  └──────────────────────────────┘               │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │           Similarity (Supporting)        │                  │
│  │  Case ←──(diseaseKey + symptom overlap   │                  │
│  │           + experiment type match        │                  │
│  │           + outcome category)──→ Case   │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘

関係サマリー:
  User       1:N  Record
  Record     N:1  Disease (タグ)
  Record     N:M  Symptom (選択)
  User       1:1  Consent (ユーザー単位の同意)
  Case       1:N  Consent (Case単位の同意も存在)
  Case       1:N  Experiment
  Experiment 1:1  Outcome
  Outcome    N:1  Case (品質スコアに影響)
  Case       N:M  Similarity (検索インデックス)
  Case       N:1  Disease (主疾患)
```

---

# 出力8: GLOBAL-FIRST REVIEW

## 現在のDomain設計で不足するもの

### 🔴 Critical（グローバル展開前に必須）

**①  Disease コードの国際標準マッピング不在**  
現在の diseaseKey（'endometriosis', 'pcos'等）はippo独自の文字列。  
製薬企業・研究機関への提供時にICD-10/SNOMED-CTへの変換が必要。  
今のうちに `icd10Code`, `snomedCode` を Disease に追加設計すること。  
10万件時に後付けすると全Case再処理が必要になる。

**② Symptomの国際標準マッピング不在**  
日本語症状名は国際研究では使えない。  
NCI Thesaurus / MedDRA への対応マッピングが必要。  
今のうちに `symptomKey`（英語キー）と `displayName`（言語別）を分離すること。

**③ データ主権 (Data Residency) の設計なし**  
EU ユーザーのデータはEU管轄のSupabaseインスタンスに保存が必要（GDPR第44条）。  
日本・EU・US でデータが混在したDBは法的にグレー。  
`Consent.jurisdiction` を設計に入れたが、インフラ面での対応が別途必要。

**④ Symptom重症度スケールの国際標準なし**  
現在の painLevel (0-10) はVAS(Visual Analogue Scale)に準ずるが、  
NRS (Numeric Rating Scale) との整合確認が必要。  
研究利用時に「どのスケールで測定したか」のメタデータが必須。

### 🟡 High（英語圏展開前に対応）

**⑤ タイムゾーン設計の曖昧さ**  
Record.date が「ユーザーのローカル日付」か「UTC」か不明確。  
日本ユーザーのみの今は問題ないが、US展開時にタイムゾーン地獄が発生する。  
今のうちに「Recordのdateはユーザーのローカル日付（DATE型、タイムゾーンなし）」と明示的に定義すること。

**⑥ 温度単位の非統一**  
bodyTemp が摂氏前提。US展開時に華氏対応が必要。  
スケールと単位を Record に付加するか、表示層で変換するかを今決める。

**⑦ 言語分離の不在**  
症状名・ファクター名・疾患名がコードと結びついている。  
`SymptomKey + SymptomLocale` の分離が必要。

### 🟢 Medium（Pharma展開前に対応）

**⑧ Ethical Framework（倫理的枠組み）の不在**  
製薬企業・研究機関との契約時に「どの倫理審査を経たか」が問われる。  
IRB（米国）/ 倫理委員会（日本）相当の審査記録を Consent に付加する設計が必要。

**⑨ 測定方法の標準化不在**  
「睡眠の質1-5」の定義がippo独自。  
PSQI（ピッツバーグ睡眠質問票）等の国際標準との対応表が必要。

---

# 出力9: FOUNDER DECISIONS

## 今この瞬間に固定すべき意思決定

### CRITICAL — 後から変更すると症例DB全体に影響する

**[C-1] Case IDの体系を固定する**  
形式: `CASE-{DiseasePrefix}-{YearMonth}-{Random8}`  
一度決めると論文・研究DB・Pharma契約に記録される。変更不可。

**[C-2] DiseaseKeyの英語文字列を固定する**  
`endometriosis`, `ovarianCyst`, `fibroid` 等の既存キーは変更禁止。  
追加はよいが変更すると全CaseのdiseaseKeys[]が破損する。  
ICD-10マッピングを今追加しておくことを推奨（後付けは全Case再処理）。

**[C-3] SymptomKeyの英語文字列を固定する**  
日本語表示名はいつでも変えられるが、内部キーは変更禁止。  
現在の実装（日本語文字列をそのまま使っている）は危険。  
今すぐ英語キー化を決定すること（例: `lower_abdominal_pain`, `fatigue`）。

**[C-4] ConsentのVersion管理方式を固定する**  
「policyVersion」の形式（例: "2026-07-01-v1"）を確定する。  
利用規約改定時の再同意フローが必要かどうかもここで決める。

**[C-5] 匿名化の不可逆宣言を今する**  
「Stage 2以上の匿名化データは、Consent撤回後も集計に残る」という方針を、  
Privacy PolicyとConsentフォームに今から明記する。  
後から追加すると「後出し変更」として法的問題が生じる。

**[C-6] RecordのDate型定義を固定する**  
Record.dateは「ユーザーのローカルDATE（タイムゾーンなし）」と決める。  
US展開後に変更すると全Recordの日付データが破損する可能性がある。

**[C-7] 単一ファクター原則を製品仕様として固定する**  
「1 Experiment = 1 Factor」をユーザー向けのプロダクト仕様として宣言する。  
後から「複数ファクターOK」に変えると、それまでの全Outcome解釈が変わる。

---

### IMPORTANT — 早期に固定が望ましいが修正コストは許容範囲

**[I-1] Tier閾値（30日/90日/180日）を固定する**  
変更するたびにCase数の報告値が変わる。B2B交渉での数字の信頼性に影響。

**[I-2] Case Quality Scoreの重み付けを固定する**  
変更するたびに既存CaseのスコアとTierが変わる。ユーザーへの通知混乱。

**[I-3] Experimentの最短期間（7日）を固定する**  
「7日のExperimentを完了した」という達成感の設計に影響する。

**[I-4] Consent Level 4の扱いを決める**  
EU展開を考えると Level 4（将来用途への包括同意）はGDPR上ほぼ取得不可能。  
Level 3止まりにするか、EU特別フローを設計するか。

---

### DEFER — 今決めなくていい

- Food ドメインの正規化タイミング
- Similarity検索のアルゴリズム（ANN vs full-text vs vector）
- B2B契約形態の詳細
- Pharma向け倫理フレームワークの具体的な審査機関

---

# 最終出力: DOMAIN_MODEL_V1 完成版サマリー

## ドメイン定義確定表

| ドメイン | 分類 | Aggregate Root | 核となる不変条件 |
|---------|------|---------------|----------------|
| Case | Core | Case | ID不変 / Tier降格なし / 疾患タグ必須 |
| Disease | Core | DiseaseConfig | DiseaseKey変更禁止 |
| Experiment | Core | Experiment | 単一ファクター原則 / Active中のfactor変更禁止 |
| Record | Supporting | Record | date = ローカルDATE / 削除は論理削除のみ |
| Symptom | Supporting | SymptomTaxonomy | SymptomKey変更禁止 |
| Outcome | Supporting | Outcome | 生成後は読み取り専用 / version管理 |
| Consent | Supporting | Consent | 撤回は即時 / 匿名集計への不遡及を明示 |
| Similarity | Supporting | — | Caseに依存。CaseなしでのSimilarityなし |
| User | Generic | — | Supabase Auth委任 |

## Case Quality Score Tier閾値確定

| Tier | スコア | 記録日数 | 密度 | 実験完了 | Consent |
|------|--------|---------|------|---------|---------|
| Tier 3 | ≥ 30 | 30日+ | 60%+ | 不要 | Level 1 |
| Tier 2 | ≥ 55 | 90日+ | 70%+ | 1件 | Level 1 |
| Tier 1 | ≥ 75 | 180日+ | 80%+ | 2件+ | Level 2 |

## Consent Level確定

| Level | 名称 | 許可用途 | GDPR | APPI |
|-------|------|---------|------|------|
| 0 | 未同意 | 自己利用のみ | — | — |
| 1 | Platform | PRO検索・アルゴリズム改善 | 必要 | 必要 |
| 2 | Research | 学術・公衆衛生研究 | 明示的同意 | 要配慮個人情報 |
| 3 | Commercial | Pharmaライセンス | 明示的同意+DPA | 要配慮個人情報 |
| 4 | Full | 将来用途（EU不可） | 実質不可 | 要配慮個人情報 |

---

*DOMAIN_MODEL_V1.md — Version 1.0 — Domain Design Council承認*  
*次フェーズ: Phase 3 Architecture Refactor Design*
