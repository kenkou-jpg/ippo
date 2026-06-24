# IMPLEMENTATION_PLAN_V1.md
## IPPO EVOLUTION PROGRAM — Phase 5: Implementation Planning

Version: 1.0
Generated: 2026-06-24
Authority: Implementation Planning Council (9名)
効力: Phase 6 Migration Planning / Phase 7 Implementation / Phase 8 Testing の唯一の実装計画書

上位憲法: docs/CONSTITUTION_RECONCILIATION_V1.md

---

# 出力1: Current → Target Gap Analysis

## 現状サマリー

| 軸 | 現状 |
|----|------|
| ユーザー数 | 0 |
| 本番依存 | なし |
| 後方互換義務 | **なし**（Founder方針） |
| app-legacy.js | 10,804行 God Object |
| DBテーブル数 | 5テーブル（profiles/records/user_data/user_records/subscriptions） |
| 正規化レベル | ほぼゼロ（records/experimentsが全てJSONBブロブ） |
| ドメイン実装 | Record(部分) / Disease(分析のみ) / Experiment(基礎のみ) |
| 未実装ドメイン | Case / Consent / Outcome / Similarity / CaseGeneration |

## Target サマリー

| 軸 | Target |
|----|--------|
| DBテーブル数 | 23テーブル（SCHEMA_V1 確定済み） |
| ドメイン | records/diseases/experiments/outcomes/cases/consents/similarity_edges |
| ディレクトリ | domains/ services/ repositories/ analytics/ screens/ features/ shared/ infrastructure/ |
| app-legacy.js | 段階的削減（最終: 削除） |
| 正規化 | 完全正規化。JOINで症例横断検索可能 |
| 症例生成 | Case生成パイプライン稼働 |
| Tier昇格 | バッチ処理によるTier評価 |
| 匿名化 | Stage1/Stage2匿名化パイプライン稼働 |

## Gap一覧（実装対象）

| # | Gap | 現状 | Target | 優先度 |
|---|-----|------|--------|--------|
| G-01 | recordsテーブル正規化 | user_dataのJSONBブロブ | 正規化recordsテーブル | Critical |
| G-02 | diseaseテーブル | なし（state.myDiseases JSONB） | disease_definitions / user_diseases | Critical |
| G-03 | experimentsテーブル | state.experimentsのJSONBブロブ | 正規化experiments/experiment_events | Critical |
| G-04 | outcomesテーブル | なし | outcomes (計算結果) | Critical |
| G-05 | casesテーブル | なし | cases (症例エンティティ) | Critical |
| G-06 | consentドメイン | なし | consents / consent_events | Critical |
| G-07 | Case生成パイプライン | なし | CaseGenerationService | Critical |
| G-08 | Quality Score計算 | なし | CaseQualityService (FD-001) | Critical |
| G-09 | Tier昇格バッチ | なし | TierEvaluationBatch (FD-002) | Critical |
| G-10 | anonymized_user_map | なし | Stage1匿名化テーブル | Critical |
| G-11 | Symptom Key英語化 | 一部日本語キー混在 | 全英語キー統一 | High |
| G-12 | Disease Key定義 | disease-registry.js (キーが混在) | disease_definitions テーブル準拠 | High |
| G-13 | domains/ ディレクトリ構造 | 存在しない | CONSTITUTION §Output8準拠 | High |
| G-14 | repositories/ レイヤー | 存在しない（直接supabase.js呼出） | Repository Pattern導入 | High |
| G-15 | app-legacy.js削減 | 10,804行 | 段階削減（Phase A-F） | High |
| G-16 | similarity_edges | なし | SimilarityService + テーブル | Medium |
| G-17 | PRO Case Search | なし | PRO検索UI + API | Medium |
| G-18 | profiles肥大化解消 | baseline/cluster/predictionがprofilesに混在 | 専用テーブルへ分離 | Medium |
| G-19 | is_premium→subscriptions移行 | 二重管理中 | subscriptions.statusを正とする | Medium |
| G-20 | コミュニティ残骸削除 | app-legacy.jsに死コード | 削除 | Low |

---

# 出力2: Implementation Dependency Graph

```
[Foundation]
  PR-001: ディレクトリ骨格 (domains/ repositories/ services/ screens/)
  PR-002: Supabase型定義 + Database型生成
  PR-003: Symptom Key英語化 (constants/symptoms.js)
       ↓
[Record Domain]
  PR-010: recordsテーブル Migration (正規化スキーマ)
  PR-011: RecordRepository (read)
  PR-012: RecordRepository (write) + Dual-Write開始
  PR-013: record.js → RecordRepository へ切替
       ↓
[Disease Domain]
  PR-020: disease_definitions テーブル Migration + seed
  PR-021: user_diseases テーブル Migration
  PR-022: DiseaseRepository
  PR-023: user_data.state.myDiseases → user_diseases へ移行
       ↓
[Experiment Domain]
  PR-030: experiments テーブル Migration
  PR-031: experiment_events テーブル Migration
  PR-032: ExperimentRepository
  PR-033: ExperimentService (CRUD + state machine)
  PR-034: state.experiments → experiments テーブルへ移行
       ↓
[Outcome Domain]
  PR-040: outcomes テーブル Migration
  PR-041: OutcomeRepository
  PR-042: OutcomeService (生成 + 7日ルール)
  PR-043: effect-size-engine.js → OutcomeService へ統合
       ↓
[Case + Consent Domain]  ← RecordとExperimentとOutcomeが揃って初めて可能
  PR-050: anonymized_user_map テーブル Migration
  PR-051: cases テーブル Migration
  PR-052: case_quality_scores テーブル Migration (FD-001)
  PR-053: consents / consent_events テーブル Migration
  PR-054: CaseRepository + ConsentRepository
  PR-055: CaseQualityService (FD-001 配点式)
  PR-056: CaseGenerationService (CANDIDATE判定)
  PR-057: ConsentService (Level 0-3)
  PR-058: TierEvaluationService (FD-002)
  PR-059: TierEvaluationBatch (Edge Function)
       ↓
[Anonymization Pipeline]
  PR-060: AnonymizationService (Stage1: user_id → anonymized_id)
  PR-061: Stage1バッチ (Edge Function)
       ↓
[Strangler Completion]
  PR-070: app-legacy.js 死コード削除 (コミュニティ残骸)
  PR-071: app-legacy.js Record UI分離
  PR-072: app-legacy.js Disease UI分離
  PR-073: app-legacy.js Experiment UI分離
  PR-074: app-legacy.js Analytics表示 分離
  PR-075: profiles肥大化解消 (baseline/cluster/prediction 分離)
       ↓
[Similarity + PRO Search]  ← Case Domain完成後
  PR-080: similarity_edges テーブル Migration
  PR-081: SimilarityService (重み付け計算)
  PR-082: SimilarityBatch (Edge Function)
  PR-083: PRO Case Search API (RLS Tier2+)
  PR-084: PRO Case Search UI
```

---

# 出力3: Phase A〜F 実装計画

## Phase A: Foundation & Record Normalization
**目的:** 正規化DBの基盤を確立。全Domainの前提となるrecordを正規化する。
**期間目安:** 2〜3週間

### Phase A-1: ディレクトリ構造 + 型定義
**目的:** CONSTITUTION §Output8のディレクトリを物理作成。TypeScript型を用意。
**成果物:**
  - `src/domains/record/` `src/domains/disease/` `src/domains/experiment/`
    `src/domains/outcome/` `src/domains/case/` `src/domains/consent/`
  - `src/repositories/` `src/services/` (新設)
  - `src/shared/types/database.types.ts` (Supabase型生成)
  - `src/shared/types/domain.types.ts` (Domain Aggregate型)
**完了条件:** ディレクトリが存在し、型ファイルがimport可能
**依存:** なし

### Phase A-2: Symptom Key 英語化
**目的:** DBのrecordsカラムに日本語keyが混入しない状態にする。
**成果物:**
  - `src/constants/symptoms.ts` — 全症状を英語keyへ統一
  - `src/constants/disease.ts` — Disease prefix/keyを英語統一
  - Migration: `user_records.data`内の旧Keyをbackfill（既存レコードがある場合）
**完了条件:** `grep -r "下腹部" src/constants/` が0件
**依存:** Phase A-1

### Phase A-3: records テーブル正規化
**目的:** `user_data.state.records[]` ではなくSQL JOINできるrecordsテーブルを確立。
**成果物:**
  - `supabase/migrations/20260010_records_normalized.sql`
  - 正規化recordsテーブル (SCHEMA_V1 §records)
  - `src/repositories/RecordRepository.ts` (read: getByDateRange / getByUserId)
  - `src/repositories/RecordRepository.ts` (write: upsert / delete)
**完了条件:**
  - recordsテーブルにRLS適用済み
  - `UNIQUE(user_id, record_date)` 制約が存在
  - RecordRepositoryのunit testがパス
**依存:** Phase A-1, A-2

### Phase A-4: Dual-Write 開始 (records)
**目的:** 既存の saveRecord() を壊さず、新recordsテーブルへも同時書込み。
**成果物:**
  - `src/modules/record/save.js` に `RecordRepository.upsert()` の追記
  - Dual-Write完了フラグ: `src/shared/flags/migration-flags.ts`
**完了条件:**
  - 既存テスト全パス
  - 新テーブルへの書込みが確認できるintegration test
**依存:** Phase A-3

---

## Phase B: Disease Domain
**目的:** myDiseasesをJSONBから正規化テーブルへ移行。疾患タグをCase生成の前提にする。
**期間目安:** 1週間

### Phase B-1: disease_definitions + user_diseases Migration
**成果物:**
  - `supabase/migrations/20260020_disease_domain.sql`
  - disease_definitions テーブル (11疾患seed含む)
  - user_diseases テーブル (user_id + disease_key + diagnosed_at + source)
  - `src/repositories/DiseaseRepository.ts`
**完了条件:**
  - disease_definitionsに11疾患が存在
  - RLS適用済み
**依存:** Phase A-1

### Phase B-2: myDiseases → user_diseases 移行
**成果物:**
  - `src/services/DiseaseMigrationService.ts` — state.myDiseasesをuser_diseasesへ移行
  - app-legacy.js の `updateDiseaseInfo()` を DiseaseRepository へ切替
**完了条件:**
  - 既存UI（disease-settings画面）が動作する
  - state.myDiseasesへの直接書込みがなくなる
**依存:** Phase B-1

---

## Phase C: Experiment Domain
**目的:** state.experimentsをSQL管理へ移行。OutcomeとCaseの前提を確立。
**期間目安:** 2週間

### Phase C-1: experiments + experiment_events Migration
**成果物:**
  - `supabase/migrations/20260030_experiment_domain.sql`
  - experiments テーブル (SCHEMA_V1 §Experiment Schema、PAUSED削除済み)
  - experiment_events テーブル (event_type: CREATED|STARTED|COMPLETED|ABANDONED|CONFIG_CHANGED)
  - `src/repositories/ExperimentRepository.ts`
**完了条件:**
  - experiments.status CHECK ('DRAFT','ACTIVE','COMPLETED','ABANDONED') が存在
  - PAUSED/RESUMED がどこにも存在しない
**依存:** Phase A-1, B-1

### Phase C-2: ExperimentService (状態機械)
**成果物:**
  - `src/domains/experiment/ExperimentService.ts`
  - start() / complete() / abandon() の状態遷移
  - experiment_events への自動記録
  - 既存 `modules/experiments.js` のロジックを移植（UI除く）
**完了条件:**
  - ExperimentServiceのunit test (状態遷移全パターン)
  - ABANDONED後7日以内のOutcome生成をブロックするテスト
**依存:** Phase C-1

### Phase C-3: state.experiments → experiments テーブル移行
**成果物:**
  - `src/services/ExperimentMigrationService.ts`
  - app-legacy.jsの実験UI → ExperimentRepository/Service へ切替
**完了条件:**
  - state.experimentsへの直接書込みがなくなる
  - 既存実験画面が動作する
**依存:** Phase C-2

---

## Phase D: Outcome Domain
**目的:** 実験結果（Outcome）をDBに永続化する。CaseのQuality Score計算に使用。
**期間目安:** 1.5週間

### Phase D-1: outcomes Migration + OutcomeRepository
**成果物:**
  - `supabase/migrations/20260040_outcome_domain.sql`
  - outcomes テーブル (SCHEMA_V1 §Outcome Schema)
  - immutable設計: UPDATE禁止、再計算はversion+1で新行INSERT
  - `src/repositories/OutcomeRepository.ts`
**完了条件:**
  - outcomes にUPDATEするRLSポリシーがない（Service Role経由のINSERTのみ）
**依存:** Phase C-1

### Phase D-2: OutcomeService
**成果物:**
  - `src/domains/outcome/OutcomeService.ts`
  - generateOutcome(experimentId): COMPLETED後即時 or ABANDONED後7日後のみ
  - effect-size-engine.jsのCohen's d計算を内部で呼出し
  - Outcome Quality Score計算 (DOMAIN_MODEL_V1 §Outcome QS)
**完了条件:**
  - ABANDONED後7日未満でのgenerateOutcome()がエラーを返すtest
  - Outcome Quality Score計算のunit test
**依存:** Phase D-1, Phase C-2

---

## Phase E: Case + Consent Domain（症例DB中核）
**目的:** 症例エンティティとConsent管理を実装。症例プラットフォームのコア。
**期間目安:** 3〜4週間

### Phase E-1: 匿名化基盤
**成果物:**
  - `supabase/migrations/20260050_anonymization.sql`
  - anonymized_user_map テーブル (user_id → anonymized_id, Service Role Only)
  - `src/services/AnonymizationService.ts` (Stage1: 不可逆マッピング生成)
**完了条件:**
  - anonymized_user_mapへのRLSがService Role専用であること
  - AnonymizationServiceのunit test
**依存:** Phase A-1

### Phase E-2: cases + case_quality_scores Migration
**成果物:**
  - `supabase/migrations/20260051_case_domain.sql`
  - cases テーブル (SCHEMA_V1 §Case Schema)
    - id: CASE-{PREFIX}-{YYYYMM}-{RANDOM8}
    - status: PRE_CANDIDATE|CANDIDATE|TIER3|TIER2|TIER1|SUSPENDED|CONSENT_WITHDRAWN|INVALIDATED|ARCHIVED
  - case_quality_scores テーブル (FD-001確定版カラム)
    - duration_score/coverage_score/completeness_score/outcome_score/consent_score/total_score
    - disease_tag_multiplier: 存在しない
  - `src/repositories/CaseRepository.ts`
**完了条件:**
  - case_quality_scores に experiment_quality_score カラムが存在しない
  - disease_tag_multiplier カラムが存在しない
  - cases.status CHECK制約が正しい
**依存:** Phase E-1, Phase A-3, Phase B-1

### Phase E-3: Consent Domain Migration
**成果物:**
  - `supabase/migrations/20260052_consent_domain.sql`
  - consents テーブル (CHECK level BETWEEN 0 AND 3)
  - consent_events テーブル (append-only法的証跡)
  - `src/repositories/ConsentRepository.ts`
  - `src/domains/consent/ConsentService.ts` (grant/withdraw/expire)
**完了条件:**
  - consents.level = 4 のINSERTがDB制約エラーになるtest
  - consent_events がDELETE不可のRLSであること
  - ConsentService.withdraw()がCASE_CONSENT_WITHDRAWNイベントを発火するtest
**依存:** Phase E-2

### Phase E-4: CaseQualityService (FD-001)
**成果物:**
  - `src/domains/case/quality-score.ts` (SSOT: CONSTITUTION §Output4)
  - FD-001配点式の完全実装
    - coverageScore(max30) / durationScore(max30) / completenessScore(max15)
    - outcomeScore(max15) / consentScore(max10)
  - `src/services/CaseQualityService.ts` — case_quality_scoresへのINSERT/UPDATE
**完了条件:**
  - quality-score.tsのunit test (Coverage/Duration/Completeness/Outcome/Consent 各スコア)
  - 合計100点満点のテスト
  - diseaseTagMultiplierが計算式に存在しないテスト
**依存:** Phase E-2, Phase D-2

### Phase E-5: CaseGenerationService
**成果物:**
  - `src/services/CaseGenerationService.ts`
  - CANDIDATE判定ロジック:
    - disease_tag >= 1 + record_days >= 30 + coverage_rate >= 60%
    - 満たした場合にcases.status = 'CANDIDATE' でINSERT
    - ユーザー通知イベント: CASE_CANDIDATE_READY
  - バッチ評価: `supabase/functions/case-evaluation-batch/`
**完了条件:**
  - CaseGenerationService.evaluate(userId)のunit test
  - バッチがローカルseedデータで動作するtest
**依存:** Phase E-4, Phase A-3, Phase B-1

### Phase E-6: TierEvaluationService (FD-002)
**成果物:**
  - `src/services/TierEvaluationService.ts`
  - Tier判定ロジック (FD-002完全準拠):
    - CANDIDATE → TIER3: quality>=30 + ユーザー承認（Consent不要）
    - TIER3 → TIER2: quality>=55 + 90d + 70% + exp完了1+ + Consent Level1+
    - TIER2 → TIER1: quality>=75 + 180d + 80% + exp完了2+ + Consent Level2+
  - Tier昇格イベント: CASE_TIER_PROMOTED
  - `supabase/functions/tier-evaluation-batch/`
**完了条件:**
  - Tier3昇格にConsent Level要件がないことのテスト
  - Tier2昇格にcoverage>=70%が必要なことのテスト
  - Tier1昇格にexp完了2件が必要なことのテスト
**依存:** Phase E-5, Phase E-3, Phase C-2

---

## Phase F: Strangler Completion + PRO
**目的:** app-legacy.jsの大幅削減。β版リリース準備。
**期間目安:** 3〜4週間

### Phase F-1: app-legacy.js 死コード削除
**成果物:** コミュニティ関数（postCommunityReply等）削除、多言語残骸削除
**完了条件:** `wc -l src/app-legacy.js` < 9,000行
**依存:** Phase E完了

### Phase F-2: Record UI → screens/record/
**成果物:** `src/screens/record/RecordScreen.js` — record.html の責務移管
**完了条件:** app-legacy.js の toggleRsChip() 等がなくなる
**依存:** Phase A-4

### Phase F-3: Disease UI → screens/disease/
**成果物:** `src/screens/disease/DiseaseSettingsScreen.js`
**完了条件:** app-legacy.js の updateDiseaseInfo() がなくなる
**依存:** Phase B-2

### Phase F-4: Experiment UI → screens/experiment/
**成果物:** `src/screens/experiment/ExperimentScreen.js`
**完了条件:** app-legacy.js の実験関連関数がなくなる
**依存:** Phase C-3

### Phase F-5: profiles肥大化解消
**成果物:**
  - `supabase/migrations/20260080_profiles_decompose.sql`
  - baseline_json → user_baselines テーブル
  - cluster_id/cluster_meta → user_clusters テーブル
  - prediction_cache → user_predictions テーブル
**完了条件:** profiles テーブルが id/email/is_premium/premium_expires_at/created_at のみ
**依存:** Phase A完了

### Phase F-6: Similarity Domain (SHOULD BUILD)
**成果物:**
  - `supabase/migrations/20260090_similarity.sql`
  - similarity_edges テーブル（case_similarityではなく similarity_edges）
  - `src/services/SimilarityService.ts`
  - `supabase/functions/similarity-batch/`
**完了条件:** Tier2以上のCaseペアのsimilarity_edgeが生成できるtest
**依存:** Phase E-5

### Phase F-7: PRO Case Search (SHOULD BUILD)
**成果物:**
  - `src/features/case-search/CaseSearchFeature.ts`
  - RLS: Tier2以上 + is_public=true のみ返す
  - `src/screens/pro/CaseSearchScreen.js`
**完了条件:** Tier1/Tier2のCaseのみ検索結果に含まれるRLS test
**依存:** Phase F-6

---

# 出力4: PR Breakdown

## Phase A: Foundation

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-001 | ディレクトリ骨格 domains/repositories/services/screens/ | 空ディレクトリ + .gitkeep | — |
| PR-002 | Supabase TypeScript型定義生成 | database.types.ts / domain.types.ts | PR-001 |
| PR-003 | Symptom Key 英語化 (constants/symptoms.ts) | 全症状英語key統一 | PR-002 |
| PR-004 | Disease Key 英語化 (constants/disease.ts) | Disease prefix/key統一 | PR-002 |
| PR-005 | records テーブル正規化 Migration | 20260010_records_normalized.sql | PR-003, PR-004 |
| PR-006 | RecordRepository (read) | RecordRepository.getByDateRange() | PR-005 |
| PR-007 | RecordRepository (write) | RecordRepository.upsert() / delete() | PR-006 |
| PR-008 | Dual-Write 開始 (record/save.js → RecordRepository) | save.js 改修 | PR-007 |
| PR-009 | migration-flags.ts 導入 | フラグ管理ファイル | PR-001 |

## Phase B: Disease Domain

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-010 | disease_definitions Migration + seed | 20260020_disease_domain.sql (11疾患) | PR-002 |
| PR-011 | user_diseases Migration | 20260021_user_diseases.sql | PR-010 |
| PR-012 | DiseaseRepository | DiseaseRepository.ts | PR-011 |
| PR-013 | myDiseases → user_diseases 移行スクリプト | DiseaseMigrationService.ts | PR-012 |
| PR-014 | disease-settings UI → DiseaseRepository 切替 | app-legacy.js改修 | PR-013 |

## Phase C: Experiment Domain

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-020 | experiments テーブル Migration | 20260030_experiments.sql (PAUSED削除) | PR-005 |
| PR-021 | experiment_events テーブル Migration | 20260031_experiment_events.sql | PR-020 |
| PR-022 | ExperimentRepository | ExperimentRepository.ts | PR-021 |
| PR-023 | ExperimentService 状態機械 | ExperimentService.ts (start/complete/abandon) | PR-022 |
| PR-024 | ExperimentService unit tests (全状態遷移) | tests/domains/experiment/ | PR-023 |
| PR-025 | state.experiments → experiments テーブル移行 | ExperimentMigrationService.ts | PR-024 |
| PR-026 | 実験UI → ExperimentRepository/Service 切替 | modules/experiments.js 改修 | PR-025 |

## Phase D: Outcome Domain

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-030 | outcomes テーブル Migration | 20260040_outcomes.sql (immutable) | PR-021 |
| PR-031 | OutcomeRepository | OutcomeRepository.ts | PR-030 |
| PR-032 | OutcomeService (7日ルール + Outcome QS計算) | OutcomeService.ts | PR-031, PR-023 |
| PR-033 | OutcomeService unit tests (7日ルール含む) | tests/domains/outcome/ | PR-032 |

## Phase E: Case + Consent Domain

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-040 | anonymized_user_map Migration (Service Role Only) | 20260050_anonymization.sql | PR-002 |
| PR-041 | AnonymizationService (Stage1) | AnonymizationService.ts | PR-040 |
| PR-042 | cases テーブル Migration | 20260051_cases.sql | PR-040, PR-005 |
| PR-043 | case_quality_scores テーブル Migration (FD-001) | 20260052_case_quality_scores.sql | PR-042 |
| PR-044 | consents テーブル Migration (CHECK 0 AND 3) | 20260053_consents.sql | PR-042 |
| PR-045 | consent_events テーブル Migration (append-only) | 20260054_consent_events.sql | PR-044 |
| PR-046 | CaseRepository | CaseRepository.ts | PR-043 |
| PR-047 | ConsentRepository | ConsentRepository.ts | PR-045 |
| PR-048 | CaseQualityService (FD-001 配点式 SSOT) | domains/case/quality-score.ts | PR-043 |
| PR-049 | CaseQualityService unit tests | tests/domains/case/quality-score.test.ts | PR-048 |
| PR-050 | ConsentService (grant/withdraw/expire) | ConsentService.ts | PR-047 |
| PR-051 | ConsentService unit tests | tests/domains/consent/ | PR-050 |
| PR-052 | CaseGenerationService (CANDIDATE判定) | CaseGenerationService.ts | PR-048, PR-012 |
| PR-053 | CaseGenerationService unit tests | tests/services/case-generation/ | PR-052 |
| PR-054 | case-evaluation-batch Edge Function | supabase/functions/case-evaluation-batch/ | PR-053 |
| PR-055 | TierEvaluationService (FD-002 判定ロジック) | TierEvaluationService.ts | PR-052, PR-050, PR-032 |
| PR-056 | TierEvaluationService unit tests (全Tier条件) | tests/services/tier-evaluation/ | PR-055 |
| PR-057 | tier-evaluation-batch Edge Function | supabase/functions/tier-evaluation-batch/ | PR-056 |

## Phase F: Strangler + PRO

| PR | タイトル | 成果物 | 依存PR |
|----|---------|--------|--------|
| PR-060 | app-legacy.js コミュニティ残骸削除 | postCommunityReply等を削除 | PR-026 |
| PR-061 | Record UI → RecordScreen.js | screens/record/RecordScreen.js | PR-008 |
| PR-062 | Disease UI → DiseaseSettingsScreen.js | screens/disease/ | PR-014 |
| PR-063 | Experiment UI → ExperimentScreen.js | screens/experiment/ | PR-026 |
| PR-064 | profiles 肥大化解消 Migration | 20260080_profiles_decompose.sql | PR-005 |
| PR-065 | is_premium → subscriptions.status 統一 | ADR-003完了 | PR-064 |
| PR-070 | similarity_edges Migration | 20260090_similarity.sql | PR-042 |
| PR-071 | SimilarityService | services/SimilarityService.ts | PR-070 |
| PR-072 | similarity-batch Edge Function | supabase/functions/similarity-batch/ | PR-071 |
| PR-073 | PRO Case Search API (RLS Tier2+) | features/case-search/ | PR-072 |
| PR-074 | PRO Case Search UI | screens/pro/CaseSearchScreen.js | PR-073 |

---

# 出力5: Strangler Execution Plan

## app-legacy.js (10,804行) 削減ロードマップ

| 削減フェーズ | 対象機能 | 削除条件 | 削減予想行数 |
|------------|---------|---------|------------|
| Phase A完了後 | Record保存処理（toggleRsChip等） | RecordRepository切替完了 | ▲500行 |
| Phase B完了後 | Disease管理（updateDiseaseInfo等） | DiseaseRepository切替完了 | ▲300行 |
| Phase C完了後 | Experiment管理 | ExperimentService切替完了 | ▲400行 |
| Phase F-1 | コミュニティ残骸（postCommunityReply等） | 即時削除可 | ▲200行 |
| Phase F-2 | Record UI全体 | RecordScreen.js完了後 | ▲1,500行 |
| Phase F-3 | Disease UI全体 | DiseaseSettingsScreen.js完了後 | ▲500行 |
| Phase F-4 | Experiment UI全体 | ExperimentScreen.js完了後 | ▲800行 |
| Phase F後 | Analytics表示 | 分析画面をscreens/へ移管後 | ▲2,000行 |

**削減目標推移:**
```
現在:          10,804行
Phase A完了:   ~10,300行
Phase B完了:   ~10,000行
Phase C完了:    ~9,600行
Phase F-1:      ~9,400行
Phase F完了:    ~4,500行（PRO/AI/Settings等が残存）
最終目標:       削除または <1,000行
```

## state.js (231行) 削減計画

```
state.experiments → Phase C完了後 → 削除
state.myDiseases  → Phase B完了後 → 削除
state.records     → Phase A完了後 → 薄いキャッシュ層のみ残す
最終: state.jsはUI一時状態管理のみ（ドラフト・現在表示中データ等）
```

## supabase.js 再構成計画

```
現状: 全DB操作がsupabase.jsに集中（1ファイルに400行+）
移行: 各Repositoryファイルに分散
  → RecordRepository: records操作
  → ExperimentRepository: experiments操作
  → CaseRepository: cases操作
  → ConsentRepository: consents/consent_events操作
supabase.jsは: Supabaseクライアント初期化のみ
最終行数目標: ~30行（client exportのみ）
```

---

# 出力6: Database Migration Plan

## Migration実行順序

```
#   ファイル名                              目的                    依存
────────────────────────────────────────────────────────────────────────
01  20260001_rls_setup.sql          (既存) Auth + profiles         —
02  20260002_analytics.sql          (既存) GINインデックス         01
03  20260003_cluster.sql            (既存) クラスタ                02
04  20260004_basaltemp_unify.sql    (既存) 体温統合                02
05  20260005_subscriptions.sql      (既存) サブスクリプション      01

── Phase A ───────────────────────────────────────────────────────────
10  20260010_records_normalized.sql  正規化recordsテーブル         01
    - user_id / record_date / symptoms jsonb / factors jsonb
    - UNIQUE(user_id, record_date)
    - RLS: auth.uid() = user_id

── Phase B ───────────────────────────────────────────────────────────
20  20260020_disease_definitions.sql  疾患定義マスタ               —
    - 11疾患 seed INSERT
21  20260021_user_diseases.sql        ユーザー疾患タグ             20, 01

── Phase C ───────────────────────────────────────────────────────────
30  20260030_experiments.sql          実験テーブル                 10
    - status: DRAFT|ACTIVE|COMPLETED|ABANDONED (PAUSEDなし)
31  20260031_experiment_events.sql    実験イベント                 30
    - event_type: CREATED|STARTED|COMPLETED|ABANDONED|CONFIG_CHANGED

── Phase D ───────────────────────────────────────────────────────────
40  20260040_outcomes.sql             成果テーブル (immutable)     31
    - UPDATE不可 (RLS + trigger)

── Phase E ───────────────────────────────────────────────────────────
50  20260050_anonymization.sql        匿名化マッピング             01
    - Service Role Only RLS
51  20260051_cases.sql                症例テーブル                 50, 10
    - id: CASE-{PREFIX}-{YYYYMM}-{RANDOM8}
    - status enum (9種)
52  20260052_case_quality_scores.sql  品質スコア (FD-001)          51
    - duration/coverage/completeness/outcome/consent (no exp/no multiplier)
53  20260053_consents.sql             同意テーブル                 51
    - level CHECK (0 AND 3)
54  20260054_consent_events.sql       同意イベント (append-only)   53
    - DELETE禁止 trigger

── Phase F ───────────────────────────────────────────────────────────
80  20260080_profiles_decompose.sql   profiles肥大化解消           01
    - baseline_json → user_baselines
    - cluster_* → user_clusters
    - prediction_cache → user_predictions

── Phase F (SHOULD) ──────────────────────────────────────────────────
90  20260090_similarity.sql           類似症例グラフ               51
    - similarity_edges (not case_similarity)
```

## Backfill計画

| 対象 | Backfill内容 | タイミング |
|------|-------------|---------|
| user_data.state.records | → records テーブルへ移行スクリプト | Phase A完了直後 |
| user_data.state.myDiseases | → user_diseases へ移行スクリプト | Phase B完了直後 |
| user_data.state.experiments | → experiments へ移行スクリプト | Phase C完了直後 |
| profiles.baseline_json | → user_baselines へ | Phase F完了直後 |

**Backfillスクリプト方針:**
- 全てEdge Functionまたはone-shot SQLで実行
- 冪等性を保証（何度実行しても同じ結果）
- ユーザー数0のため本番Backfillは不要（将来に備えて設計のみ）

## 削除計画（Migration完了後）

| 削除対象 | 削除条件 |
|---------|---------|
| user_data テーブル | Dual-Write完了 + Backfill確認後 |
| user_records テーブル | records正規化完了 + 全機能切替後 |
| profiles.baseline_json | user_baselines Migration完了後 |
| profiles.cluster_* | user_clusters Migration完了後 |
| profiles.prediction_cache | user_predictions Migration完了後 |

---

# 出力7: Testing Strategy

## テスト方針

**0ユーザーの今だから全層テストを確立する。**
本番リリース後に後付けするコストは数倍になる。

## Unit Tests

| 対象 | テスト内容 | 配置 |
|------|---------|------|
| quality-score.ts | 各スコア(Coverage/Duration/etc)の境界値 | tests/domains/case/ |
| quality-score.ts | 合計100点満点 / diseaseTagMultiplier不在 | tests/domains/case/ |
| OutcomeService | ABANDONED後7日未満でエラー | tests/domains/outcome/ |
| OutcomeService | Outcome Quality Score計算 | tests/domains/outcome/ |
| ExperimentService | 全状態遷移（DRAFT→ACTIVE→COMPLETED等） | tests/domains/experiment/ |
| ExperimentService | PAUSED状態が存在しないこと | tests/domains/experiment/ |
| ConsentService | Level 4 が拒否されること | tests/domains/consent/ |
| ConsentService | withdraw()後にCase is_public=falseになること | tests/domains/consent/ |
| TierEvaluationService | Tier3昇格: Consent不要 | tests/services/ |
| TierEvaluationService | Tier2昇格: coverage>=70%必須 | tests/services/ |
| TierEvaluationService | Tier1昇格: exp完了2件必須 | tests/services/ |
| CaseQualityService | FD-001配点式の完全実装 | tests/services/ |
| AnonymizationService | 同じuser_idが常に同じanonymized_idを返す | tests/services/ |

## Integration Tests

| 対象 | テスト内容 | 配置 |
|------|---------|------|
| RecordRepository | supabase testクライアントでのCRUD | tests/repositories/ |
| CaseGenerationService | seed recordsからCANDIDATE生成フロー | tests/integration/ |
| TierEvaluationBatch | TIER3→TIER2昇格フル検証 | tests/integration/ |
| ConsentService | grant → CASE_CONSENT_WITHDRAWNイベント確認 | tests/integration/ |
| Dual-Write | 旧save.js実行後に新recordsテーブルに存在する | tests/integration/ |

## E2E Tests

| シナリオ | テスト内容 |
|---------|---------|
| 記録フロー | record.html → 保存 → recordsテーブルに存在 |
| 疾患設定 | disease-settings → user_diseasesに保存 |
| 実験フロー | 実験開始 → 完了 → Outcome生成 |
| Case昇格 | 30日記録 + 疾患タグ → CANDIDATE通知 |
| Consent付与 | Level1取得 → Tier2昇格可能状態 |

## Migration Tests

| テスト | 内容 |
|--------|------|
| records Backfill冪等性 | 2回実行しても重複なし |
| experiments Backfill | state.experimentsが正確にexperimentsテーブルへ |
| myDiseases Backfill | user_diseasesへの正確な移行 |
| Schema制約 | PAUSED/RESUMED event_typeがINSERT不可 |
| Schema制約 | consent.level=4がINSERT不可 |
| Schema制約 | consent_events がDELETE不可 |

## Case生成テスト

| テスト | 内容 |
|--------|------|
| 30日 + 60%coverage + disease_tag → CANDIDATE生成 | 正常系 |
| 29日記録 → CANDIDATE生成されない | 境界値 |
| disease_tag=0 → CANDIDATE生成されない | 前提条件違反 |
| quality_score計算 | FD-001各コンポーネント |

## Consent / 匿名化テスト

| テスト | 内容 |
|--------|------|
| anonymized_user_map の不可逆性 | 同一入力→同一出力、逆引き不可 |
| k-Anonymity k=5 | 5件未満グループを研究エクスポートから除外 |
| consent_events のappend-only | DELETE文がRLSエラーになること |

---

# 出力8: Feature Freeze Matrix

## 実装中 追加禁止機能

以下はPhase A〜E実装中に追加してはならない。
Constitution RD-* 違反リスクが高いため。

| 禁止カテゴリ | 具体的禁止内容 |
|------------|-------------|
| 新Domain | Phase 5で定義されていない新しいドメイン |
| Schema変更 | SCHEMA_V1で定義されていない新テーブル/カラム |
| UI新機能 | 症例DB基盤完成前の新UI追加 |
| AI機能 | AI症例要約・症例レコメンド（MAY BUILDに分類） |
| Community | SNS/チャット/フォーラム/ポイント（MUST NOT BUILD） |
| B2B | Pharmaダッシュボード/企業向け機能（MUST NOT BUILD） |
| 多言語化 | i18n/L10n追加（MUST NOT BUILD） |
| Gamification | ポイント/バッジ/ランキング（MUST NOT BUILD） |

## 将来実装機能（Phase G以降）

| 機能 | 分類 | Phase |
|------|------|-------|
| AI症例要約 | MAY BUILD | Phase G |
| Doctor Export (構造化PDF) | MAY BUILD | Phase G |
| PRO Community | MAY BUILD | Phase H |
| 製薬会社向けライセンスAPI | MAY BUILD | Phase H |
| 多言語化 | MUST NOT BUILD（現時点） | TBD |
| k-Anonymity研究エクスポート | SHOULD BUILD | Phase G |

---

# 出力9: Launch Scope

## β版リリース条件

β版は「症例DB基盤が動作する最小限のリリース」。

**β版 MUST条件（全て満たすこと）:**

```
Infrastructure:
  ✓ Phase A完了 (records正規化 + Dual-Write)
  ✓ Phase B完了 (user_diseases)
  ✓ Phase C完了 (experiments正規化)
  ✓ Phase D完了 (outcomes)
  ✓ Phase E-1〜E-6完了 (Case + Consent + Tier評価)
  ✓ AnonymizationService Stage1 稼働

Functional:
  ✓ 記録保存が正規化recordsテーブルに保存される
  ✓ 疾患タグがuser_diseasesに保存される
  ✓ 実験がexperimentsテーブルで管理される
  ✓ CANDIDAテ判定バッチが稼働する
  ✓ TIER3昇格が動作する（ユーザー承認後）
  ✓ Consent Level 1の取得フローが動作する

Quality:
  ✓ Unit test pass率 > 95%
  ✓ Integration test pass率 > 90%
  ✓ Critical/High bug = 0

Constitution:
  ✓ PAUSED/RESUMEDがどこにも存在しない
  ✓ disease_tag_multiplierがどこにも存在しない
  ✓ consent.level CHECK (0 AND 3) が適用されている
```

**β版 SHOULD条件:**
```
  ✓ TIER2昇格が動作する
  ✓ app-legacy.jsが <7,000行
  ✓ profiles肥大化解消完了
```

## 正式版リリース条件

**正式版 MUST条件:**

```
  ✓ β版MUST条件 全て
  ✓ TIER1昇格が動作する
  ✓ AnonymizationService Stage2 (研究向け) 稼働
  ✓ SimilarityService 稼働
  ✓ PRO Case Search 稼働 (Tier2+)
  ✓ app-legacy.js < 4,000行
  ✓ E2Eテスト 主要フロー全てパス
  ✓ k-Anonymity k=5 バリデーション実装済み
  ✓ APPI/GDPR観点でのConsent管理レビュー完了
```

## 将来版（Phase G以降）

```
  AI症例要約 (GPT-4o / Claude)
  製薬会社向けAPIライセンス
  Doctor Exportポータル
  k-Anonymity研究エクスポートUI
  症例類似度スコアの公開
```

---

# 出力10: Founder Priority Ranking

## 絶対やる（β版必須）

```
Priority 1 — Case生成パイプライン:
  records正規化 → disease_tag → CaseGenerationService → Tier評価
  理由: 症例プラットフォームの存在意義そのもの

Priority 2 — Consent管理:
  consent_events (append-only) → ConsentService → Tier昇格条件
  理由: APPI/GDPR対応なしに症例DB公開は法的に不可

Priority 3 — Quality Score (FD-001):
  domains/case/quality-score.ts の完全実装
  理由: Tier昇格・症例品質の根幹

Priority 4 — Experiment → Outcome パイプライン:
  ExperimentService → OutcomeService (7日ルール) → Outcome QS
  理由: Tier2以上の要件・症例の価値証明

Priority 5 — app-legacy.js 削減:
  Strangler Plan実行。死コード削除。
  理由: 新機能追加コストの削減・バグリスク低減
```

## 後回し（β版後）

```
Priority 6 — SimilarityService:
  Tier2以上のCase間類似度計算
  理由: Caseが蓄積されてから意味が出る

Priority 7 — PRO Case Search:
  Tier2+ Case検索UI
  理由: ユーザー数0→増加後に価値が出る

Priority 8 — profiles肥大化解消:
  baseline/cluster/predictionの分離
  理由: 機能への影響がなく、美化作業
```

## やらない（Phase 5〜G では禁止）

```
  SNS/Community/チャット — MUST NOT BUILD
  ポイント/バッジ/ゲーミフィケーション — MUST NOT BUILD
  多言語化 (i18n) — MUST NOT BUILD
  B2B/企業向けダッシュボード — MUST NOT BUILD
  AI症例要約 — MAY BUILD (Phase G以降)
  製薬ライセンスAPI — MAY BUILD (Phase H以降)
```

---

# 実装開始チェックリスト

```
Phase A着手前:
  □ CONSTITUTION_RECONCILIATION_V1.md を全実装者が読んだ
  □ FD-001 Quality Score配点を全員が暗記した
  □ FD-002 Tier定義（Tier3はConsent不要）を全員が確認した
  □ PAUSED/RESUMEDが実装に入らないことを全員が合意した
  □ SSOT: domains/case/quality-score.ts が唯一の品質スコア計算ファイルと合意した
  □ Symptom Keyの英語化方針を全員が確認した
  □ similarity_edges（case_similarityではない）に合意した
  □ consent.level CHECK (0 AND 3)（Level4なし）に合意した

PR作成ルール:
  □ 1PR = 1つの明確な責務
  □ PR内でSCHEMAを追加しない（SCHEMA_V1で定義済みのもののみ実装）
  □ 新Domain/テーブルはPRの冒頭でRECONCILIATIONとの整合を確認すること
  □ migration fileは必ずdown migration相当のロールバック手順をPR descriptionに記載
```

---

*IMPLEMENTATION_PLAN_V1.md — Version 1.0 — Implementation Planning Council承認*
*本文書はPhase 6 Migration Planning / Phase 7 Implementation / Phase 8 Testing の唯一の計画書である*
*設計変更はCONSTITUTION_RECONCILIATION_V1.mdの改訂を経ること*
