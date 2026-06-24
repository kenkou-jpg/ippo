# PHASE7_EXECUTION_PLAN.md
## IPPO EVOLUTION PROGRAM — Phase 7: Migration Execution & Production Readiness

Version: 1.0
Generated: 2026-06-24
Authority: Migration & Production Readiness Council (9名)
上位憲法: CONSTITUTION_RECONCILIATION_V1.md

---

# STEP 1: PRE-FLIGHT CHECK REPORT

## 1-1. DBスキーマ vs CONSTITUTION 一致確認

| 確認項目 | 期待値 | 現状 | 状態 |
|---------|--------|------|------|
| FD-001 Quality Score カラム | duration_score, coverage_score, completeness_score, outcome_score, consent_score | SCHEMA_V1に旧カラム名（record_volume_score等）が残存 | ⚠️ Migration SQLで修正済み |
| FD-002 Tier Definition | CANDIDATE/TIER3/TIER2/TIER1 | 未実装 | → Phase 7で実装 |
| Consent Level CHECK | BETWEEN 0 AND 3 | 未実装（テーブル未存在） | → 20260050で実装 |
| experiment_events event_type | PAUSED/RESUMED なし | 未実装（テーブル未存在） | → 20260041で実装 |
| similarity_edges テーブル名 | similarity_edges | 未実装 | → 20260063で実装 |
| disease_key 形式 | snake_case (endometriosis, ovarian_cyst等) | camelCase (ovarianCyst, fibroid等) | ⚠️ G-12 Gap: seed SQLで正規化 |
| symptom_key 形式 | snake_case 英語 | 日本語（constants/symptoms.js） | ⚠️ G-11 Gap: 20260011で定義 |

## 1-2. Legacy依存残存チェック

| 依存箇所 | 状態 |
|---------|------|
| app-legacy.js: 10,804行 | 削減開始対象（STEP 6） |
| disease-registry.js: camelCase disease key | G-12 Gap。seed SQLで snake_case を定義 |
| symptoms.js: 日本語症状キー | G-11 Gap。20260011 + 20260082 で移行 |
| domains/ ディレクトリ | 未存在。本Phase 7で作成 |
| repositories/ レイヤー | 未存在。本Phase 7で作成 |

## 1-3. PRE-FLIGHT 判定

```
Critical障害: なし（ユーザー0人、後方互換義務なし）
High警告: disease_key / symptom_key の形式乖離
  → Migration SQLのSeedで正規定義を確立する
  → backfill時に変換する（MIGRATION_MASTER_PLAN Output 4）

判定: PROCEED（実行可）
```

---

# STEP 2: MIGRATION EXECUTION PLAN

## 実行対象ファイル一覧

```
Group B (Master Data):
  supabase/migrations/20260010_create_disease_definitions.sql
  supabase/migrations/20260011_create_symptoms.sql
  supabase/migrations/20260012_create_factor_definitions.sql

Group C (User Domain):
  supabase/migrations/20260020_create_disease_profiles.sql
  supabase/migrations/20260021_create_anonymized_user_map.sql
  supabase/migrations/20260022_alter_subscriptions.sql

Group D (Record Domain):
  supabase/migrations/20260030_alter_records.sql
  supabase/migrations/20260031_create_record_symptoms.sql
  supabase/migrations/20260032_create_record_factors.sql

Group E (Experiment/Outcome):
  supabase/migrations/20260040_create_experiments.sql
  supabase/migrations/20260041_create_experiment_events.sql
  supabase/migrations/20260042_create_outcomes.sql

Group F (Consent):
  supabase/migrations/20260050_create_consents.sql
  supabase/migrations/20260051_create_consent_events.sql

Group G (Case Domain):
  supabase/migrations/20260060_create_cases.sql
  supabase/migrations/20260061_create_case_snapshots.sql
  supabase/migrations/20260062_create_case_quality_scores.sql
  supabase/migrations/20260063_create_similarity_edges.sql

Group H (Audit/Infrastructure):
  supabase/migrations/20260070_create_audit_log.sql
  supabase/migrations/20260071_create_anonymization_log.sql
  supabase/migrations/20260072_create_research_exports.sql

Group I (Index — CONCURRENTLY、手動実行):
  supabase/migrations/20260080_create_indexes_manual.sql
  ※ このファイルはSupabase SQL Editorで1文ずつ手動実行する

Group J (Seed / Backfill):
  supabase/migrations/20260081_seed_master_data.sql
  supabase/migrations/20260082_seed_symptom_key_map.sql
  supabase/migrations/20260083_rls_new_tables.sql

Group K (Triggers / Guards):
  supabase/migrations/20260090_triggers_guards.sql
```

## 実行手順

```
1. Supabase Dashboard → SQL Editor を開く
2. ファイルを番号順（20260010 → 20260090）に実行する
3. 各ファイル実行後にエラーがないことを確認する
4. 20260080 のみ: 各 CREATE INDEX 文を1文ずつ個別に実行する
5. 全実行後に STEP 3（Validation）を実行する
```

---

# STEP 3: VALIDATION SYSTEM

以下のクエリを全実行し、全件 = 期待値であることを確認する。

```sql
-- V-001: disease_definitions 件数
SELECT COUNT(*) FROM disease_definitions; -- 期待: 11

-- V-002: symptoms 件数
SELECT COUNT(*) FROM symptoms; -- 期待: 41+

-- V-003: factor_definitions 件数
SELECT COUNT(*) FROM factor_definitions; -- 期待: 20

-- V-004: 日本語symptom_keyが存在しないこと
SELECT COUNT(*) FROM symptoms WHERE key ~ '[^\x00-\x7F]'; -- 期待: 0

-- V-005: consents.level CHECK制約 (0-3)
SELECT constr.check_clause FROM information_schema.check_constraints constr
JOIN information_schema.constraint_column_usage col ON col.constraint_name = constr.constraint_name
WHERE col.table_name = 'consents' AND col.column_name = 'level';
-- 期待: "level >= 0 AND level <= 3" 相当

-- V-006: experiment_events.event_type CHECK制約にPAUSED/RESUMEDがないこと
SELECT check_clause FROM information_schema.check_constraints
WHERE constraint_name LIKE '%experiment_events%';
-- PAUSED / RESUMED が含まれないこと

-- V-007: case_quality_scores カラム確認 (FD-001)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'case_quality_scores'
ORDER BY ordinal_position;
-- 期待: duration_score, coverage_score, completeness_score, outcome_score, consent_score が存在
-- 期待: disease_tag_multiplier, experiment_quality_score が存在しない

-- V-008: similarity_edges CHECK制約 (case_id_a < case_id_b)
SELECT check_clause FROM information_schema.check_constraints
WHERE constraint_name LIKE '%similarity_edges%';
-- 期待: case_id_a < case_id_b

-- V-009: RLS有効化確認（全新規テーブル）
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'disease_definitions','symptoms','factor_definitions',
  'disease_profiles','anonymized_user_map',
  'record_symptoms','record_factors',
  'experiments','experiment_events','outcomes',
  'consents','consent_events',
  'cases','case_snapshots','case_quality_scores','similarity_edges',
  'audit_log','anonymization_log','research_exports'
);
-- 全行: rowsecurity = true

-- V-010: outcomes UPDATEトリガー確認
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'outcomes'
AND event_manipulation = 'UPDATE';
-- 期待: prevent_outcome_update が存在する

-- V-011: anonymized_user_map ポリシーなし確認（全拒否）
SELECT policyname FROM pg_policies WHERE tablename = 'anonymized_user_map';
-- 期待: 0件（Service Roleのみアクセス可）

-- V-012: consent_events DELETE禁止確認
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'consent_events';
-- DELETE ポリシーが存在しないこと

-- V-013: audit_log bigserial確認
SELECT data_type FROM information_schema.columns
WHERE table_name = 'audit_log' AND column_name = 'id';
-- 期待: bigint (bigserialはbigintで格納)

-- V-014: cases.id形式確認（Caseが存在する場合）
SELECT COUNT(*) FROM cases
WHERE id !~ '^CASE-[A-Z]+-[0-9]{6}-[A-Z0-9]{8}$';
-- 期待: 0件

-- V-015: Tier定義確認（Caseが存在する場合）
SELECT cases.id FROM cases
WHERE tier IN ('TIER2','TIER1') AND consent_level >= 1 AND is_public = false;
-- 期待: 0件

-- V-016: 全テーブル一覧確認
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'profiles','records','subscriptions',
  'disease_definitions','symptoms','factor_definitions',
  'disease_profiles','anonymized_user_map',
  'record_symptoms','record_factors',
  'experiments','experiment_events','outcomes',
  'consents','consent_events',
  'cases','case_snapshots','case_quality_scores','similarity_edges',
  'audit_log','anonymization_log','research_exports'
);
-- 期待: 22件（既存3 + 新規19）

-- V-017: quality_score SSOT確認
-- src/domains/case/quality-score.js が存在すること（ファイルシステム確認）

-- V-018: anonymized_user_map 全ユーザーカバレッジ（backfill後）
SELECT COUNT(*) FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM anonymized_user_map m WHERE m.user_id = u.id
);
-- 期待: 0件

-- V-019: records symptom_keys 英語化（backfill後）
-- （backfill後に実行）
SELECT COUNT(*) FROM records
WHERE EXISTS (
  SELECT 1 FROM unnest(symptom_keys) k WHERE k ~ '[^\x00-\x7F]'
);
-- 期待: 0件

-- V-020: UNIQUE(user_id, record_date)制約確認
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'records' AND constraint_type = 'UNIQUE';
-- 期待: records_user_id_record_date_key 相当が存在する
```

---

# STEP 4: FAILURE SIMULATION CHECK

F-001〜F-025 の対応が Migration SQL / Domain実装に反映済みであることを確認する。

| Failure | 対応状態 |
|---------|---------|
| F-003: UNIQUE制約重複 | 20260082_seed_symptom_key_map.sql に dedup手順を記載 |
| F-006: PAUSED event_type | 20260041 のCHECK制約で防止 |
| F-007: Level 4 INSERT | 20260050 のCHECK (0 AND 3) で防止 |
| F-009: disease_tag_multiplier参照 | 20260062 にカラムなし |
| F-010: outcomes UPDATE | 20260090_triggers_guards.sql でトリガー設定 |
| F-014: case_similarity テーブル参照 | similarity_edges に統一（20260063） |
| F-019: consent_events DELETE | RLSポリシーなし = 全削除禁止（20260083） |
| F-022: PAUSED→ABANDONED変換 | 20260082 のbackfillスクリプトで対応 |

---

# STEP 5: CUTOVER PLAN

```
Phase 7 開始時点でのCutover状態: ユーザー0人のためCutoverは即時実行可能

Step 1 (Read切替): Migration完了後即座に新テーブルをRead主体にする
Step 2 (Dual Write開始): RecordRepository実装後にDual Writeを開始
Step 3 (Legacy Write freeze): app-legacy.jsのwrite箇所をDual Write経由に変更
Step 4 (Legacy Read fallback): 新テーブルのReadが安定したらLegacy Readを停止
Step 5 (Analytics sync): user_dataのstate.recordsを新recordsに同期完了
Step 6 (Legacy Write disable): app-legacy.jsのwrite箇所を全てRepository経由に
Step 7 (Legacy Read disable): user_data / user_records への全Readを停止
```

---

# STEP 6: LEGACY REDUCTION PLAN

## app-legacy.js 削減優先順位

```
Phase A (UI logic — 優先度1):
  対象: renderXxx() / showXxx() / updateXxx() 関数群
  目標: 各画面をscreens/xxx.html + modules/xxx.js に分離済みのもの

Phase B (analytics wrapper — 優先度2):
  対象: 既にsrc/analytics/に移植済みの重複ラッパー
  目標: effect-size-engine.js / cycle-engine.js の呼び出しを直接参照に変更

Phase C (state mutation logic — 優先度3):
  対象: state.records = / state.experiments = への直接代入
  目標: RecordRepository / ExperimentRepository 経由に変更

Phase D (DB access layer — 優先度4):
  対象: supabase.from('user_data').update() 直接呼び出し
  目標: 全アクセスをRepositoryパターン経由に変更

最終目標: app-legacy.js = 0行
```

---

# STEP 7: PRODUCTION READINESS CHECKLIST

```
□ 全Migration SQL（20260010〜20260090）実行完了
□ Validation V-001〜V-020 全件通過
□ domains/case/quality-score.js が SSOT として実装済み
□ RecordRepository が records テーブルを参照している
□ CaseGenerationService が cases テーブルにINSERTできる
□ TierEvaluationBatch が FD-002 条件でTierを評価できる
□ OutcomeService が 7日ルール（RD-004）を実装している
□ ConsentService が Level 0-3 のみを扱っている
□ SimilarityService が similarity_edges テーブルを参照している
□ Privacy Policy が C-1〜C-9 の宣言を含む状態で公開済み
□ app-legacy.js の DB直接アクセスがゼロ（または隔離済み）
□ Supabase PITRが有効化されている

完了判定: 全項目□がチェック済みの状態 = Phase 7完了
```

---

*PHASE7_EXECUTION_PLAN.md — Version 1.0*
*次フェーズ: Phase 8 — Testing & QA*
