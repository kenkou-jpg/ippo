# DOMAIN_MODEL_LOCKED_V1.md
## PR-002: Domain Model 完全確定

Version: 1.0
Authority: Domain Model Council
効力: **本文書はPR-002以降のすべての実装・設計の上位確定文書である**
     矛盾が生じた場合、本文書（RECONCILIATION_V1確定内容込み）を正とする。
前提文書:
  - REPOSITORY_CONSTITUTION_V1.md
  - CONSTITUTION_RECONCILIATION_V1.md（矛盾解消済み）
  - ARCHITECTURE_V3.md
  - SCHEMA_V1.md

> このファイルはコードではない。
> 「どこに書くべきか」が即答できる状態を作るドキュメントである。

---

# 出力1: DOMAIN一覧（確定版）

## Domain分類

```
GENERIC DOMAIN（基盤。他ドメインから参照される）
  auth        — 認証・ユーザー識別
  billing     — 課金・Premium状態

SUPPORTING DOMAIN（マスターデータ・分類基盤）
  symptom     — 症状・ファクター分類
  disease     — 疾患定義・ユーザー疾患プロファイル

CORE DOMAIN（ビジネス価値の核心）
  record      — 日々の健康記録
  experiment  — 介入設計・ライフサイクル
  consent     — 同意管理
  case        — 症例生成・品質・Tier
  similarity  — 症例間類似度グラフ
  analytics   — 集計・Insight・個人分析
```

変更禁止。Domain追加はConstitution Council承認が必要。

---

# 出力2: 各Domainの責務定義

---

## Domain: auth

```
責務:
  - ユーザー識別（userId の発行・検証）
  - セッション管理
  - Premium状態の確認（billing への委譲）

所有するデータ:
  - auth.users（Supabase管理）
  - profiles（表示名・設定）
  - subscriptions（stripe連携）

公開API:
  - getCurrentUserId(): ID
  - isAuthenticated(): boolean
  - isPremium(userId): boolean  ← billing.getStatus()への委譲

依存先:
  - billing（isPremiumチェック時のread only）

禁止責務:
  - 健康データの読み書き（recordを知らない）
  - Consent確認（consentを知らない）
  - Case操作（caseを知らない）
  - UI描画
```

---

## Domain: billing

```
責務:
  - Stripe Webhookの受信・処理
  - subscriptions テーブルの管理
  - Premium状態の提供（read only source）

所有するデータ:
  - subscriptions テーブル（user_id, status, plan, expires_at）

公開API:
  - getSubscriptionStatus(userId): 'FREE' | 'PRO' | 'CLINIC'
  - isActive(userId): boolean

依存先:
  - なし（外部: Stripe API）

禁止責務:
  - ユーザー認証
  - 健康データアクセス
  - Consent管理
  - PRO機能のゲーティング判定（→ authが行う）
```

---

## Domain: symptom

```
責務:
  - 症状キー（symptom.key）のマスター管理
  - ファクターキー（factor.key）のマスター管理
  - 記録時の症状入力バリデーション（keyの存在確認）
  - 国際化対応（key → 表示名の変換）

所有するデータ:
  - symptoms テーブル（key, display_name_ja, display_name_en, category）
  - factor_definitions テーブル（key, display_name_ja, category）

公開API:
  - validateSymptomKeys(keys: string[]): ValidationResult
  - getSymptomDisplayName(key: string, locale: string): string
  - listSymptomsByCategory(category: string): Symptom[]

依存先:
  - なし（マスターデータ。依存元ゼロ）

禁止責務:
  - ユーザー記録の操作（recordを知らない）
  - 症状の統計分析（analyticsの責務）
  - 症状の選好記録（→ profilesで管理）
```

---

## Domain: disease

```
責務:
  - 疾患定義（disease.key）のマスター管理
  - ICD-10 / SNOMEDコードとのマッピング管理
  - ユーザーの疾患プロファイル管理（myDiseases）
  - 疾患タグの検証

所有するデータ:
  - disease_definitions テーブル（key, icd10_code, snomedct_code, display_name_*）
  - disease_profiles テーブル（user_id, disease_key, onset_date, severity）

公開API:
  - validateDiseaseKey(key: string): boolean
  - getUserDiseases(userId: ID): DiseaseProfile[]
  - addUserDisease(userId: ID, key: string): DiseaseProfile
  - removeUserDisease(userId: ID, key: string): void

依存先:
  - auth（userId検証 / read only）

禁止責務:
  - 疾患と実験結果の相関分析（analyticsの責務）
  - Case内の疾患タグの品質評価（caseの責務）
  - 症状分類（symptomの責務）
```

---

## Domain: record

```
責務:
  - 日々の健康記録の作成・更新・取得
  - Record入力値の正規化とバリデーション
  - 記録連続性（streak / totalDays）の計算
  - record_date の一意性保証（1ユーザー1日1レコード）

所有するデータ:
  - records テーブル
  - record_symptoms テーブル（正規化された症状キー）
  - record_factors テーブル（正規化されたファクターキー）

公開API:
  - createRecord(userId, draft): Record
  - updateRecord(userId, recordDate, patch): Record
  - getRecord(userId, recordDate): Record | null
  - getRecords(userId, opts): Record[]
  - softDeleteRecord(userId, recordId): void

依存先:
  - symptom（症状キーのバリデーション / read only）
  - disease（疾患タグのバリデーション / read only）
  - consent（読み取り：このRecordのConsent Levelを参照）

禁止責務:
  - Experiment操作（experimentを知らない）
  - Case生成（caseを知らない）
  - Similarity計算（similarityを知らない）
  - UI描画・DOM操作
  - cloudBackupAll の直接呼び出し（→ infrastructure層）
  - window.* 参照
```

---

## Domain: experiment

```
責務:
  - 介入実験の設計・開始・完了・中止
  - 実験ライフサイクルの状態機械管理
  - 有効な状態遷移の強制（CONSTITUTION第7条: Immutability）
  - ABANDONED後7日ルールの適用（RD-004）

所有するデータ:
  - experiments テーブル
  - experiment_events テーブル（イベントソーシング: CREATED/STARTED/COMPLETED/ABANDONED/CONFIG_CHANGED）

実験状態機械（確定・変更禁止）:
  DRAFT → ACTIVE → COMPLETED
                 ↘ ABANDONED
  ※ PAUSED は存在しない（RD-003で廃止）

公開API:
  - createExperiment(userId, config): Experiment
  - startExperiment(experimentId): Experiment
  - completeExperiment(experimentId): Experiment
  - abandonExperiment(experimentId, reason): Experiment
  - getExperiments(userId, opts): Experiment[]
  - canGenerateOutcome(experiment): boolean  ← 7日ルール適用

依存先:
  - record（実験期間内のRecordId参照 / read only）
  - disease（疾患タグ検証 / read only）
  - consent（Consent Level確認 / read only）

禁止責務:
  - Case生成（caseを知らない）
  - Outcome生成（outcomeはexperimentから生まれるが操作はoutcomeServiceの責務）
  - Similarity計算（similarityを知らない）
  - UI描画・DOM操作
```

---

## Domain: consent

```
責務:
  - ユーザー同意の取得・記録・更新
  - 同意撤回の記録（撤回証跡の永続化）
  - 現在の同意レベルの提供（他domainからread only参照される）
  - Consent事前確認APIの提供（Consentなしにデータは公開されない）

Consent Level定義（確定・変更禁止）:
  Level 0 — 自分のデータのみ（デフォルト）
  Level 1 — 匿名統計に利用
  Level 2 — 類似症例探索に利用（PRO機能 / Similarity対象）
  Level 3 — 研究・外部利用
  ※ Level 4は存在しない（RD-006で削除）

所有するデータ:
  - consents テーブル（user_id, level, granted_at）
  - consent_events テーブル（全操作のappend-only記録 / 削除禁止）

公開API:
  - getConsentLevel(userId): ConsentLevel  ← 最重要API
  - grantConsent(userId, level): ConsentEvent
  - revokeConsent(userId, downToLevel): ConsentEvent
  - requiresConsent(userId, requiredLevel): void  ← 不足時throw

依存先:
  - auth（userId検証のみ）

禁止責務:
  - Consentの内容による健康データ操作（record / caseを操作しない）
  - 他ドメインの公開判断（→ 各ドメインがconsentを呼ぶ）
  - UI描画
  - consent_events の UPDATE / DELETE（追記のみ）
```

---

## Domain: case

```
責務:
  - 症例（Case）の生成・Tier評価・品質スコア計算
  - Case IDの発行（CASE-{PREFIX}-{YYYYMM}-{RANDOM8}形式）
  - Quality Score計算（FD-001配点式）
  - Tier判定と昇格（FD-002条件）
  - Case公開前のConsent確認（第6条）

Quality Score配点（FD-001 / 変更禁止）:
  Coverage Score   × 0.30  (max 30)
  Duration Score   × 0.30  (max 30)
  Completeness Score × 0.15 (max 15)
  Outcome Score    × 0.15  (max 15)
  Consent Score    × 0.10  (max 10)

Tier条件（FD-002 / 変更禁止）:
  CANDIDATE: Duration≥30日, Coverage≥60%, DiseaseTag≥1
  TIER3:     QualityScore≥30, Duration≥30日, Coverage≥60%, DiseaseTag≥1
  TIER2:     QualityScore≥55, Duration≥90日, Coverage≥70%, DiseaseTag≥1, Experiment完了≥1, Consent≥Level1
  TIER1:     QualityScore≥75, Duration≥180日, Coverage≥80%, DiseaseTag≥1, Experiment完了≥2, Consent≥Level2

Tier降格: なし（一度到達したTierは下がらない）

所有するデータ:
  - cases テーブル
  - case_quality_scores テーブル（スコア成分の保存）
  - case_snapshots テーブル（記録時点のスナップショット）
  - anonymized_user_map テーブル（削除禁止）

公開API:
  - generateCase(userId): Case  ← Consent確認を含む
  - evaluateTier(caseId): TierResult
  - calculateQualityScore(caseId): QualityScore
  - getCaseById(caseId): Case | null
  - searchCases(query, consentFilter): Case[]  ← Consent≥Level2のみ

依存先:
  - record（Record統計 / read only）
  - experiment（完了済みExperiment / read only）
  - consent（Consent Level確認 / read only — 必須）
  - disease（疾患タグ / read only）

禁止責務:
  - ユーザーIDとCase IDの直接マッピング公開（anonymized_user_mapを経由する）
  - Tier降格
  - Case物理削除（is_deletedも禁止）
  - ConsentをスキップしたCase公開
  - diseaseTagMultiplierの使用（RD-005で廃止）
```

---

## Domain: similarity

```
責務:
  - CaseID間の類似度スコアの計算・保存
  - 類似症例グラフ（similarity_edges）の管理
  - 類似Case検索APIの提供（Consent Level 2以上が前提）

テーブル名: similarity_edges（確定。case_similarityは誤り — RD-008）

所有するデータ:
  - similarity_edges テーブル（case_id_a, case_id_b, score, computed_at）
    ※ 複合PK。case_id_a < case_id_bを強制
    ※ 物理削除可（バッチで全再計算）

公開API:
  - getSimilarCases(caseId, limit, minScore): SimilarCase[]
  - computeSimilarity(caseId): void  ← バッチ実行
  - getSimilarityDensity(diseaseKey): number  ← Phase 9メトリクス

依存先:
  - case（Case属性の参照 / read only）
  - consent（類似検索前のConsent Level 2確認 / read only）

禁止責務:
  - ユーザーIDへの直接アクセス（caseを経由する）
  - Consent Level 2未満のCaseを類似検索対象にすること
  - similarity_edgesへのUPDATE（削除→再INSERT）
  - 個人特定可能情報の扱い
```

---

## Domain: analytics

```
責務:
  - ユーザー個人の記録集計・Insight生成
  - 集計マテリアライズドビューの管理
  - Insight通知のトリガー
  - ダッシュボードデータの提供（UI向け）

所有するデータ:
  - experiment_outcomes（集計マテビュー / read専用ビュー）
  - insight生成ロジック（アプリ内ロジック）
  ※ 独自テーブルを持たない。recordとexperimentのreadから計算する

公開API:
  - getPersonalInsights(userId): Insight[]
  - getStreakStats(userId): StreakStats
  - getSymptomTrend(userId, symptomKey, days): TrendData
  - getExperimentSummary(userId, experimentId): ExperimentSummary

依存先:
  - record（統計計算のread）
  - experiment（実験結果のread）
  - case（個人Caseの概要 / read only）

禁止責務:
  - DBへの直接write（→ record / experiment / caseが行う）
  - Consentなしのユーザー間比較（→ similarity経由）
  - UIの描画（→ features層）
  - B2B向けコホート分析（→ 別サービス / Edge Function）
```

---

# 出力3: 各Domainの「禁止責務」一覧

| Domain | 絶対禁止 |
|--------|---------|
| auth | 健康データアクセス / Consent確認 / UI描画 |
| billing | 認証 / 健康データ / PRO機能ゲーティング判定 |
| symptom | ユーザー記録操作 / 統計分析 |
| disease | 実験結果相関分析 / Case品質評価 |
| record | Experiment操作 / Case生成 / window.参照 / DOM操作 |
| experiment | Case生成 / Outcome直接操作 / Similarity / UI |
| consent | 健康データ操作 / consent_events UPDATE/DELETE |
| case | ユーザーID直接公開 / Tier降格 / Case物理削除 / Consent省略 |
| similarity | userId直接アクセス / Level2未満Case対象化 / UPDATE |
| analytics | DBへのwrite / Consent省略比較 / UI描画 |

---

# 出力4: Domain間依存マトリクス

凡例: R = Read only依存 / W = Write依存 / ✗ = 禁止 / — = 関係なし

|依存元 ↓ / 依存先 →|auth|billing|symptom|disease|record|experiment|consent|case|similarity|analytics|
|---|---|---|---|---|---|---|---|---|---|---|
|**auth**|—|R|—|—|✗|✗|—|✗|✗|✗|
|**billing**|—|—|—|—|✗|✗|—|✗|✗|✗|
|**symptom**|—|—|—|—|✗|✗|—|✗|✗|✗|
|**disease**|R|—|—|—|✗|✗|—|✗|✗|✗|
|**record**|—|—|R|R|—|✗|R|✗|✗|✗|
|**experiment**|—|—|—|R|R|—|R|✗|✗|✗|
|**consent**|R|—|—|—|✗|✗|—|✗|✗|✗|
|**case**|—|—|—|R|R|R|R|—|✗|✗|
|**similarity**|—|—|—|—|✗|✗|R|R|—|✗|
|**analytics**|—|—|—|—|R|R|—|R|—|—|

循環依存: ゼロ（確認済み）

---

# 出力5: SSOT配置一覧

| 概念 | 唯一の定義元 | 場所 |
|------|------------|------|
| Quality Score 配点 | CONSTITUTION_RECONCILIATION_V1.md RD-001 | `policies/index.ts → QUALITY_SCORE` |
| Quality Score 計算式 | CONSTITUTION_RECONCILIATION_V1.md RD-001 | `domains/case/case.service.ts` |
| Tier条件定義 | CONSTITUTION_RECONCILIATION_V1.md RD-002 | `policies/index.ts → TIER_RULES` |
| Tier判定ロジック | 本文書 | `domains/case/case.service.ts` |
| Consent Level定義 | DOMAIN_MODEL_V1.md / RD-006 | `policies/index.ts → CONSENT_LEVELS` |
| Consent Level説明 | 本文書 | `domains/consent/consent.entity.ts` |
| Domain Event names | REPOSITORY_CONSTITUTION_V1.md | `shared/events/index.ts → EVENTS` |
| Experiment状態enum | SCHEMA_V1.md + RD-003 | `domains/experiment/experiment.entity.ts` |
| Experiment Event types | RD-003 | `domains/experiment/experiment.entity.ts` |
| Case ID形式 | SCHEMA_V1.md | `domains/case/case.service.ts → generateCaseId()` |
| Symptom Key | SCHEMA_V1.md / symptoms テーブル | `domains/symptom/symptom.entity.ts` |
| Disease Key | SCHEMA_V1.md / disease_definitions テーブル | `domains/disease/disease.entity.ts` |
| Base Entity型 | PR-001 | `shared/types/base.ts` |
| Record Entity型 | PR-001.1 | `domains/record/record.entity.ts` |
| IRecordRepository interface | PR-001.1 | `infrastructure/record/record.repository.ts` |
| similarity_edgesテーブル名 | RD-008 | `infrastructure/similarity/similarity.repository.ts` |

**重複は憲法第5条違反。発見したら即修正。**

---

# 出力6: Event Ownershipマップ

| Event名 | Owner Domain | 発火タイミング | 消費Domain |
|---------|------------|--------------|----------|
| `record.created` | record | createRecord()成功後 | analytics, case（batch） |
| `record.updated` | record | updateRecord()成功後 | analytics |
| `experiment.started` | experiment | startExperiment()後 | analytics |
| `experiment.completed` | experiment | completeExperiment()後 | case（quality再計算）, analytics |
| `experiment.abandoned` | experiment | abandonExperiment()後 | analytics |
| `outcome.recorded` | experiment | Outcome生成後 | case（quality再計算） |
| `case.generated` | case | generateCase()成功後 | similarity（batch trigger）, analytics |
| `case.tier_upgraded` | case | Tier昇格時 | analytics, similarity（re-score） |
| `consent.granted` | consent | grantConsent()後 | case（Tier再評価）, similarity |
| `consent.revoked` | consent | revokeConsent()後 | case（公開停止確認）, similarity |
| `insight.viewed` | analytics | InsightカードのImpression | analytics（継続率計測） |
| `pro.paywall.hit` | billing | PRO機能到達時 | analytics（conversion funnel） |
| `similarity.created` | similarity | バッチ計算完了後 | analytics |

**EventはEventオーナーのみが発行する。他Domainが代理発行することは禁止。**

---

# 出力7: データ所有権マップ

```
auth Domain:
  auth.users（Supabase管理）
  profiles（表示名・locale・設定）

billing Domain:
  subscriptions（plan / status / stripe_customer_id）

symptom Domain:
  symptoms（key, display_name_*, category）
  factor_definitions（key, display_name_*, category）

disease Domain:
  disease_definitions（key, icd10_code, snomedct_code）
  disease_profiles（user_id, disease_key, onset_date, severity）

record Domain:
  records（日次健康記録）
  record_symptoms（正規化症状キー / recordsにCASCADE）
  record_factors（正規化ファクターキー / recordsにCASCADE）

experiment Domain:
  experiments（実験メタデータ）
  experiment_events（状態遷移ログ / INSERT ONLY）
  outcomes（実験結果）

consent Domain:
  consents（現在の同意状態）
  consent_events（全操作の証跡 / INSERT ONLY / 削除禁止）

case Domain:
  cases（症例。物理削除禁止）
  case_quality_scores（スコア成分）
  case_snapshots（時点スナップショット）
  anonymized_user_map（userId↔CaseIDマッピング / 削除禁止）

similarity Domain:
  similarity_edges（症例間エッジ / 物理削除可・再計算前提）

analytics Domain:
  experiment_outcomes（集計マテビュー / 所有はpostgres level）
  ※ analytics は独自テーブルを持たない
```

**一つのテーブルを複数Domainが所有することは禁止。**
**「書き込み権限」でテーブルの所有Domainを決定する。**

---

# 出力8: API責務境界（Domain単位）

## Client → Service Layer の境界

```
features/record/      → services/record.service.ts  → domains/record/
features/experiment/  → services/experiment.service.ts → domains/experiment/
features/case/        → services/case.service.ts    → domains/case/
features/consent/     → services/consent.service.ts  → domains/consent/
features/analytics/   → services/analytics.service.ts → domains/analytics/
features/billing/     → services/billing.service.ts  → domains/billing/
```

## Service Layer 責務

```
RecordService:
  createRecord()      — validateDraft → repo.upsert → emit record.created
  syncRecord()        — infra/supabase経由でクラウド同期

ExperimentService:
  startExperiment()   — Consent確認 → domain.start() → emit experiment.started
  completeExperiment()— domain.complete() → OutcomeService.generate() → emit
  canAbandon()        — domain純粋関数への委譲

CaseService:
  generateCase()      — consent.requiresConsent(Level1) → domain.generate() → emit case.generated
  evaluateTier()      — domain.evaluateTier() → if upgraded → emit case.tier_upgraded
  searchCases()       — consent.requiresConsent(Level2) → repo.search()

ConsentService:
  grantConsent()      — domain.validate() → repo.insert → emit consent.granted
  checkAndThrow()     — consent.getLevel() → if insufficient → throw ConsentRequiredError

SimilarityService:
  computeBatch()      — 全TIER2+CaseのSimilarityを再計算（バッチ）
  getSimilar()        — consent.requiresConsent(Level2) → repo.query
```

## Supabase Edge Function 境界

```
record-sync:          Record DB同期（user_data廃止後）
experiment-lifecycle: 状態遷移のサーバーサイド検証
case-generator:       バッチCase生成・Tier評価
consent-manager:      Consent変更のサーバーサイド記録
case-quality-scorer:  QualityScore再計算バッチ
similarity-engine:    Similarity計算バッチ（SimilarityService呼び出し）
research-export:      anonymized cohort export（B2B）
anonymization-pipeline: PII除去パイプライン
```

---

# 出力9: 将来変更禁止領域（Frozen Areas）

以下は**今後一切の変更を禁止する**。変更が必要な場合はConstitution Council全員の承認が必要。

```
FROZEN-001: Domain境界
  record / experiment / consent / case / similarity / analytics / auth / billing
  → 新Domain追加は可。既存の分割・統合は禁止。

FROZEN-002: SSOT配置
  Quality Score: policies/index.ts → QUALITY_SCORE
  Tier Rules:    policies/index.ts → TIER_RULES
  Consent Level: policies/index.ts → CONSENT_LEVELS
  Events:        shared/events/index.ts → EVENTS

FROZEN-003: Event命名
  record.created / experiment.started / outcome.recorded /
  case.generated / insight.viewed / pro.paywall.hit /
  consent.granted / consent.revoked / case.tier_upgraded / similarity.created
  → Event名の変更はDB / 分析パイプライン / 外部APIすべてに影響。変更禁止。

FROZEN-004: Case生成ルール
  - Case ID形式: CASE-{PREFIX}-{YYYYMM}-{RANDOM8}
  - Case物理削除: 禁止
  - anonymized_user_map削除: 禁止
  - Tier降格: 禁止

FROZEN-005: Consent Level定義
  Level 0: 自分のみ
  Level 1: 匿名統計
  Level 2: 類似症例探索（PRO）
  Level 3: 研究・外部利用
  Level 4: 存在しない
  → 変更はGDPR/APPI同意書の再取得が必要。実質変更不可。

FROZEN-006: feature → feature 禁止ルール
  featureが別featureを直接importすることは永続的に禁止。
  cross-feature通信は shared/events を介する。

FROZEN-007: Experiment状態機械
  DRAFT → ACTIVE → COMPLETED
                  ↘ ABANDONED
  PAUSEDは追加しない（RD-003確定）

FROZEN-008: Quality Score配点比率
  Coverage:30 / Duration:30 / Completeness:15 / Outcome:15 / Consent:10
  (FD-001確定)

FROZEN-009: Tier条件閾値
  （FD-002確定。出力4参照）

FROZEN-010: ABANDONED後Outcome生成条件
  actual_end_atから7日以上経過後のみ（RD-004確定）
```

---

# Domain Model Validation Checklist

PR-002完了の確認事項：

```
□ Domain間の責務が重複していない
  → 出力2で各Domainの「禁止責務」を明示。重複ゼロ確認済み。

□ SSOTが1箇所に収束している
  → 出力5で全概念のSSO場所を確定。

□ 依存ルールが循環していない
  → 出力4の依存マトリクスで循環ゼロ確認済み。

□ 将来の実装者が迷わない状態
  → 出力8のAPI責務境界で「どのServiceを呼ぶか」が即答可能。

□ 「どこに書くべきか」が即答できる状態
  → 出力5のSSO配置一覧と出力7のデータ所有権マップで即答可能。
```

---

```
DOMAIN MODEL STATUS: LOCKED
```

Authority: Domain Model Council
Locked: 2026-06-24
以降のすべての実装はこのドキュメントに従う。
