# MIGRATION_MASTER_PLAN_V1.md
## IPPO EVOLUTION PROGRAM — Phase 6: Migration Planning

Version: 1.0
Generated: 2026-06-24
Authority: Migration Planning Council (9名)
上位憲法: CONSTITUTION_RECONCILIATION_V1.md → IMPLEMENTATION_PLAN_V1.md → SCHEMA_V1.md

---

> Phase 6 禁止事項: 新ドメイン追加 / 新テーブル追加 / Tier定義変更 / Quality Score変更 / Architecture変更
> Phase 6 対象: Migration順序 / Backfill / Rollback / Cutover / Validation / Failure Simulation のみ

---

# Output 1: Migration Philosophy

## 採用パターン: Expand → Migrate → Contract

```
Phase 1 — EXPAND (拡張):
  既存テーブルを削除しない。
  新テーブルを既存の横に追加する。
  既存アプリは一切変更しない。
  → 現行 user_data / user_records はそのまま存続する。

Phase 2 — MIGRATE (移行):
  Backfillで既存データを新テーブルへコピーする。
  Dual Writeで新旧両方に書く。
  Readを新テーブルへ切り替える。
  → アプリは新テーブルを読む。旧テーブルはフォールバック。

Phase 3 — CONTRACT (収縮):
  Dual Writeを停止する。
  旧テーブルをDROP。
  → 新テーブルのみ存在する。
```

## Strangler Patternとの関係

```
Strangler Fig Patternの原則:
  既存システムを外側から「絞める」ように新実装で包む。
  機能単位で段階的に切り替える。
  完全移行後に既存を削除する。

ippoへの適用:
  app-legacy.js（God Object）を機能単位でdomains/配下に移植する。
  各ドメイン（Record → Disease → Experiment → Outcome → Case → Consent）の
  順序で移植し、移植済みドメインは新コードが担当する。
  app-legacy.jsは移植が完了した機能から削除し、最終的に全削除する。

Strangler Patternを選んだ理由:
  ① ユーザー0人だが、将来ユーザーが来た瞬間に動く必要がある
  ② God Objectの全機能を一度に把握してBig Bang移行するリスクを避ける
  ③ 各ドメインの移植を独立してテストできる
```

## なぜRebuildしないか

```
Rebuild（ゼロから書き直し）を選ばない理由:

  1. 既存の分析ロジック（effect-size-engine.js, cycle-engine.js等）は
     実績のある計算式を含む。動作確認済みのロジックを捨てるリスクがある。

  2. Rebuild中は新機能追加が停止する。
     Strangler Patternなら両方を並行できる。

  3. Rebuild完了時に「移行漏れ」が発生するリスクがある。
     Backfillは段階的に検証できるが、Rebuildは一発勝負になりやすい。

  4. 将来10万ユーザーになってからRebuildするコストは今の数倍になる。
     今のうちに正規化しながら積み上げる方が安全。
```

## なぜBig Bang移行しないか

```
Big Bang移行（一度に全テーブルを切り替える）を選ばない理由:

  1. 23テーブルを同時にデプロイするとロールバック単位が全23テーブルになる。
     1つのバグで全体をロールバックしなければならない。

  2. 全バックフィルを一度に実行すると検証が困難。
     Group単位のバックフィルなら検証ポイントが明確。

  3. ユーザー0人の今でも、Big Bangは将来のリリース習慣として悪い癖になる。
     「Group単位でリリースできる能力」を今のうちに確立する。
```

---

# Output 2: Migration Master Plan

## Migration Group一覧（確定）

```
Group A: Directory Foundation
  目的: ディレクトリ骨格・型定義・Symptom Key英語化
  前提: なし（最初に実行）
  成果: domains/ services/ repositories/ screens/ が存在する状態
  PR: PR-001, PR-002, PR-003

Group B: Master Data Foundation
  目的: disease_definitions / symptoms / factor_definitions テーブル作成・投入
  前提: Group A
  成果: マスターデータが参照可能な状態
  SQL: 001, 002, 003

Group C: User Domain Extension
  目的: disease_profiles / anonymized_user_map / subscriptions拡張
  前提: Group B
  成果: ユーザー疾患登録・匿名化基盤が存在する状態
  SQL: 010, 011, 012

Group D: Record Schema Migration
  目的: recordsテーブル正規化カラム追加 / record_symptoms / record_factors 作成
  前提: Group B（symptom_key FK参照のため）
  成果: 正規化recordsスキーマが存在する状態
  SQL: 020, 021, 022, 023

Group E: Experiment / Outcome Domain
  目的: experiments / experiment_events / outcomes テーブル作成
  前提: Group D（user_id FK, factor_key FK）
  成果: 実験・アウトカムドメインが存在する状態
  SQL: 030, 031, 032

Group F: Consent Domain
  目的: consents / consent_events テーブル作成
  前提: Group C（user_id FK）
  成果: 同意ドメインが存在する状態
  SQL: 040, 041

Group G: Case Domain
  目的: cases / case_snapshots / case_quality_scores / similarity_edges テーブル作成
  前提: Group C（anonymized_user_map FK）, Group F（consents FK）
  成果: 症例ドメインが存在する状態
  SQL: 050, 051, 052, 053

Group H: Audit / Infrastructure
  目的: audit_log / anonymization_log / research_exports テーブル作成
  前提: Group G
  成果: 監査基盤が存在する状態
  SQL: 060, 061, 062

Group I: Index Creation
  目的: 全テーブルのインデックスを CREATE INDEX CONCURRENTLY で作成
  前提: Group A〜H（全テーブル作成後）
  成果: 全インデックスが存在する状態
  SQL: 070

Group J: Backfill
  目的: 既存データ（user_data.state / user_records）を新テーブルへ移行
  前提: Group A〜I
  成果: 既存データが新テーブルに反映された状態
  SQL: 080, 081, 082, 083

Group K: Dual Write
  目的: application layerで新旧両方に書く。Readを新テーブルへ切替
  前提: Group J（Backfill完了後）
  成果: 新テーブルがRead/Writeの主体になった状態
  期間: 30〜90日間

Group L: Legacy Removal
  目的: user_records / user_data テーブルを廃止
  前提: Group K（Dual Write検証完了後）
  成果: 旧テーブルが存在しない最終状態
  SQL: 090, 091
```

## 依存関係図

```
[Group A: Directory Foundation]
        │
        ▼
[Group B: Master Data]
   disease_definitions
   symptoms
   factor_definitions
        │
   ┌────┴────────────┐
   ▼                 ▼
[Group C: User]   [Group D: Record]
  disease_profiles   records (ALTER)
  anon_user_map      record_symptoms
  subscriptions      record_factors
   │                 │
   │            [Group E: Experiment]
   │               experiments
   │               experiment_events
   │               outcomes
   │                 │
   └─────┬───────────┘
         ▼
   [Group F: Consent]
      consents
      consent_events
         │
         ▼
   [Group G: Case]
      cases
      case_snapshots
      case_quality_scores
      similarity_edges
         │
         ▼
   [Group H: Audit]
      audit_log
      anonymization_log
      research_exports
         │
         ▼
   [Group I: Index]
         │
         ▼
   [Group J: Backfill]
         │
         ▼
   [Group K: Dual Write]
         │
         ▼
   [Group L: Legacy Removal]
```

---

# Output 3: Database Migration Sequence

## 実行順序と依存関係（全SQLファイル）

```
実行ルール:
  - 各ファイルは単一トランザクション内で実行（CREATE INDEX CONCURRENTLYを除く）
  - 失敗したファイルは即座に停止し、手動確認後に再実行
  - ファイル番号順に実行する。スキップ禁止。
```

### Group B: Master Data

```
001_create_disease_definitions.sql    依存: なし
002_create_symptoms.sql               依存: なし
003_create_factor_definitions.sql     依存: なし
```

### Group C: User Domain

```
010_create_disease_profiles.sql       依存: 001 (disease_definitions FK)
011_create_anonymized_user_map.sql    依存: なし (auth.users FK)
012_alter_subscriptions.sql           依存: なし
```

### Group D: Record Domain

```
020_alter_records_add_columns.sql     依存: なし
021_create_record_symptoms.sql        依存: 020, 002 (symptom FK)
022_create_record_factors.sql         依存: 020, 003 (factor FK)
023_add_records_unique_constraint.sql 依存: 020, 080 (バックフィル後に適用)
  ※ 023は Group J バックフィル後に実行する
```

### Group E: Experiment / Outcome

```
030_create_experiments.sql            依存: 003 (factor FK)
031_create_experiment_events.sql      依存: 030
032_create_outcomes.sql               依存: 030
```

### Group F: Consent

```
040_create_consents.sql               依存: なし
041_create_consent_events.sql         依存: 040
```

### Group G: Case Domain

```
050_create_cases.sql                  依存: 001, 011 (anon_user_map FK), 040 (consents FK)
051_create_case_snapshots.sql         依存: 050
052_create_case_quality_scores.sql    依存: 050
053_create_similarity_edges.sql       依存: 050
```

### Group H: Audit / Infrastructure

```
060_create_audit_log.sql              依存: なし
061_create_anonymization_log.sql      依存: 050 (cases FK)
062_create_research_exports.sql       依存: なし
```

### Group I: Index Creation (CONCURRENT — トランザクション外)

```
070_create_indexes_concurrent.sql     依存: 020-062 全テーブル作成後
  ※ CREATE INDEX CONCURRENTLY はトランザクションブロック外で個別実行
  ※ Supabase Dashboard SQL Editor では1文ずつ実行
```

### Group J: Backfill

```
080_backfill_records.sql              依存: 020, 021, 022
081_backfill_experiments.sql          依存: 030, 031, 032
082_backfill_disease_profiles.sql     依存: 010
083_backfill_anonymized_user_map.sql  依存: 011
  ※ 023 (UNIQUE制約) は 080 完了後に実行
```

### Group L: Legacy Removal

```
090_drop_user_records.sql             依存: Group K完了（Dual Write終了確認後）
091_drop_user_data.sql                依存: 090, 全ドメイン移行完了後
  ※ 091実行前に pg_dump user_data → バックアップ必須
```

---

# Output 4: SymptomKey Migration Plan

## 現状

```
現在のrecords.symptom_keys（またはuser_data.state.records[].symptoms）:
  日本語文字列で保存されている。
  例: ['下腹部痛', '腰痛', '頭痛', '倦怠感', '不眠']
  一部英語キーが混在している可能性がある（disease-registry.js参照）。
```

## 目標

```
移行後のrecords.symptom_keys:
  snake_case英語キーで統一。
  例: ['lower_abdominal_pain', 'lower_back_pain', 'headache', 'fatigue', 'insomnia']
  symptoms.keyカラムと完全一致していること。
```

## 変換マッピング（確定版・33症状）

```sql
-- 002_create_symptoms.sql に定義する変換マップ
-- backfill時にこのマップで変換する

CREATE TABLE _migration_symptom_key_map (
  ja_key  text PRIMARY KEY,
  en_key  text NOT NULL REFERENCES symptoms(key)
);

INSERT INTO _migration_symptom_key_map VALUES
  ('下腹部痛',         'lower_abdominal_pain'),
  ('腰痛',             'lower_back_pain'),
  ('頭痛',             'headache'),
  ('倦怠感',           'fatigue'),
  ('不眠',             'insomnia'),
  ('吐き気',           'nausea'),
  ('肩こり',           'shoulder_stiffness'),
  ('むくみ',           'edema'),
  ('イライラ',         'irritability'),
  ('気分の落ち込み',   'depression'),
  ('腹部膨満感',       'bloating'),
  ('排便痛',           'painful_defecation'),
  ('性交痛',           'dyspareunia'),
  ('排尿痛',           'painful_urination'),
  ('頻尿',             'frequent_urination'),
  ('熱感',             'hot_flash'),
  ('発汗',             'sweating'),
  ('動悸',             'palpitation'),
  ('めまい',           'dizziness'),
  ('食欲不振',         'loss_of_appetite'),
  ('過食',             'overeating'),
  ('集中力低下',       'difficulty_concentrating'),
  ('記憶力低下',       'memory_decline'),
  ('胸の張り',         'breast_tenderness'),
  ('肌荒れ',           'skin_roughness'),
  ('抜け毛',           'hair_loss'),
  ('冷え',             'cold_sensitivity'),
  ('生理痛',           'dysmenorrhea'),
  ('不正出血',         'abnormal_bleeding'),
  ('過多月経',         'heavy_menstruation'),
  ('無月経',           'amenorrhea'),
  ('排卵痛',           'ovulation_pain'),
  ('腹痛（一般）',     'abdominal_pain');

-- 変換不能キー（マップに存在しない）は '_UNMAPPED_{original}' として保存し、
-- バックフィル後にレポートで人手確認する。
```

## 移行戦略

```
Step 1: 002_create_symptoms.sql で症状マスターを作成・投入する
Step 2: _migration_symptom_key_map テーブルを作成・投入する
Step 3: 080_backfill_records.sql でrecords.symptom_keysを変換する
  - user_data.state から records へコピーする際に変換する
  - 既存records.symptom_keysが日本語の場合も同時に変換する
Step 4: record_symptomsテーブルへ正規化する
  - records.symptom_keys[]の各要素を record_symptoms 行に展開する
Step 5: バックフィル後に変換レポートを出力する
  SELECT ja_key, COUNT(*) FROM _migration_symptom_key_map_usage GROUP BY 1;
  SELECT '_UNMAPPED_' で始まる symptom_key の件数を確認する
Step 6: 全件変換完了後に _migration_symptom_key_map テーブルをDROP

変換保証:
  変換後のsymptom_keyはすべてsymptoms.keyに存在すること。
  EXISTS (SELECT 1 FROM symptoms WHERE key = symptom_key) で全件検証する。

既存英語キー混在への対処:
  すでに英語キー形式（snake_case, ASCII）で保存されているものは変換スキップ。
  symptoms.keyに存在するかどうかで判定する。
```

---

# Output 5: Record Migration Plan

## 現行構造

```
user_data テーブル:
  state JSONB に全データが格納されている
  state.records[] = [{date, symptoms[], pain_level, energy, ...}, ...]
  state.experiments[] = [{...}]
  state.myDiseases[] = [{...}]

user_records テーブル:
  records の部分的な正規化版（詳細は現行スキーマ確認要）
  ※ user_data.state と二重管理状態

records テーブル（既存）:
  現行のrecordsテーブルのスキーマを確認すること。
  SCHEMA_V1のrecordsテーブルと乖離があるカラムに対してALTERを実行する。
```

## 移行経路

```
020_alter_records_add_columns.sql:
  既存recordsテーブルにSCHEMA_V1の新カラムを追加する。
  既存カラムは削除しない（Expand段階）。

080_backfill_records.sql:
  user_data.state.records[] を records テーブルへ移行する。
  既にrecordsテーブルに存在する行はUPSERT（ON CONFLICT DO UPDATE）。
  symptom_keysを日本語→英語に変換する。
  1ユーザーずつ処理する（バッチサイズ: 1ユーザー）。

Dual Write (Group K):
  record.js（またはRecordRepository）が
  records（新）+ user_records（旧）の両方にINSERTする。
  監視: 両テーブルの件数を毎日比較し差異をSlack通知する。

Read切替:
  Dual Write開始後30日を経過したらReadをrecords（新）に切替。
  7日間の並行稼働後にuser_recordsへのReadを停止。

Legacy Removal:
  090_drop_user_records.sql でuser_recordsをDROP。
  091_drop_user_data.sql でuser_dataをDROP（最後）。
```

---

# Output 6: Experiment Migration Plan

## 移行経路

```
現行: user_data.state.experiments[] （JSONB配列）
目標: experiments + experiment_events テーブル

030_create_experiments.sql:
  experimentsテーブルを作成する。

031_create_experiment_events.sql:
  experiment_eventsテーブルを作成する。
  event_type は 'CREATED'|'STARTED'|'COMPLETED'|'ABANDONED'|'CONFIG_CHANGED' のみ。
  PAUSED / RESUMED は実装しない（RD-003確定）。

081_backfill_experiments.sql:
  user_data.state.experiments[] の各実験を experimentsテーブルへ移行する。
  状態マッピング:
    旧 'active'   → experiments.status = 'ACTIVE'
    旧 'done'     → experiments.status = 'COMPLETED'
    旧 'stopped'  → experiments.status = 'ABANDONED'
    旧 'draft'    → experiments.status = 'DRAFT'
    旧 'paused'   → experiments.status = 'ABANDONED'
      ※ PAUSED は存在しないため ABANDONED にマッピングし
         abandon_reason = 'MIGRATED_FROM_PAUSED' を設定する。
  experiment_events にCREATEDイベントを1件INSERTする。
  started_atが存在する場合はSTARTEDイベントもINSERTする。
  COMPLETEDの場合はCOMPLETEDイベントをINSERTする。
  ABANDANEDの場合はABANDANEDイベントをINSERTする。

実験参加者の移行:
  現行にexperiment_participantsが存在しない場合は作成不要。
  user_id = 実験所有者のみ。他ユーザー参加機能は現行に存在しない。
```

---

# Output 7: Outcome Migration Plan

## Outcome生成開始時点

```
Outcomeは現行データには存在しない（未実装）。
よって移行するOutcomeデータは存在しない。

Outcome生成を開始できる条件:
  1. experiments テーブルへの移行が完了している（Group E）
  2. records テーブルへの移行が完了している（Group D + J）
  3. OutcomeService が実装されている（PR-042）

生成ルール（RD-004確定）:
  experiments.status = 'COMPLETED' → 即時生成可
  experiments.status = 'ABANDONED' かつ
    (now() - experiments.actual_end_at) >= interval '7 days' → 生成可
  上記以外 → 生成不可（エラーを返す）
```

## 再計算とVersion管理

```
再計算トリガー:
  - アルゴリズムバグ修正
  - Quality Score計算式変更（FD-001）
  - Before/After期間定義変更

再計算手順:
  1. 新しいoutcomes行をINSERTする（version = old_version + 1）
  2. 旧行の superseded_by = 新行のID にUPDATEする
  3. experiments.outcome_id = 新行のID にUPDATEする
  4. cases の outcome_ids[] を新IDで更新する
  5. case_quality_scores を再計算する
  6. audit_log に再計算理由を記録する

最新版の取得:
  SELECT * FROM outcomes
  WHERE experiment_id = $1
    AND superseded_by IS NULL
  ORDER BY version DESC
  LIMIT 1;

バッチ再計算（全件）:
  OutcomeService.recalculateAll() を pg_cron で実行。
  1,000件/バッチ で処理する。
  失敗した実験IDを error_log に記録して続行する。
```

---

# Output 8: Consent Migration Plan

## 現状

```
ユーザー0人のため、既存のConsentデータは存在しない。
consentドメインはゼロから構築する。
```

## Level 0 → Level 3 への移行戦略

```
初期状態:
  全ユーザーのconsents.level = 0 (DEFAULT)
  全ユーザーのconsents.status = 'PENDING'

Level昇格フロー:
  Level 0 → Level 1:
    ユーザーが利用規約・プライバシーポリシーに同意する。
    consent_type = 'PLATFORM' + 'CASE_PUBLICATION' を同時に GRANTED にする。
    consent_events に 'GRANTED' イベントをINSERTする。
    consents.level = 1 にUPDATEする。

  Level 1 → Level 2:
    ユーザーが研究利用同意画面で同意する。
    consent_type = 'RESEARCH' を GRANTED にする。
    consent_events に 'GRANTED' イベントをINSERTする。
    consents.level = 2 にUPDATEする。

  Level 2 → Level 3:
    ユーザーが商業利用同意画面で同意する。
    consent_type = 'COMMERCIAL' を GRANTED にする。
    consent_events に 'GRANTED' イベントをINSERTする。
    consents.level = 3 にUPDATEする。

ユーザー0人前提での初期実装:
  040_create_consents.sql でテーブルを作成する。
  既存ユーザーが存在しないため、バックフィルは不要。
  アプリ初回起動時に consent_type='PLATFORM' の行を INSERT する。
  ユーザーが同意ボタンを押した際に GRANTED に更新する。

撤回（Withdraw）:
  consent_events に 'WITHDRAWN' イベントをINSERTする。
  consents.status = 'WITHDRAWN' にUPDATEする。
  consents.level を 0 に戻す。
  cases の consent_level = 0 にUPDATEする。
  cases.status = 'CONSENT_WITHDRAWN' にUPDATEする（Tier2/1の場合）。
  is_public = false にUPDATEする。
  RLSが即座にPRO検索から除外する。
```

---

# Output 9: Case Migration Plan

## Case生成開始条件

```
Case生成パイプライン（CaseGenerationService）が起動できる条件:
  ① records テーブルへの移行完了（Group J）
  ② disease_profiles テーブルへの移行完了（Group J）
  ③ anonymized_user_map の全ユーザー分生成完了（Group J）
  ④ experiments / outcomes テーブルが存在する（Group E）
  ⑤ consents テーブルが存在する（Group F）
  ⑥ cases / case_quality_scores テーブルが存在する（Group G）
  ⑦ Privacy Policy が C-1〜C-9 の宣言を含む状態で公開済み

PRE_CANDIDATE評価（バッチ毎日実行）:
  SELECT user_id FROM records
  WHERE is_deleted = false
  GROUP BY user_id
  HAVING COUNT(DISTINCT record_date) >= 30
    AND COUNT(DISTINCT record_date)::float /
        (MAX(record_date) - MIN(record_date) + 1) >= 0.60
  AND EXISTS (
    SELECT 1 FROM disease_profiles dp
    WHERE dp.user_id = records.user_id AND dp.status = 'ACTIVE'
  );
  → 条件を満たすユーザーをCANDIDATE候補として通知する。

CANDIDATE→TIER3（ユーザーアクション）:
  ユーザーが「Case登録申請」を完了する。
  quality_score >= 30 であること。
  Consent Level は不要（FD-002確定）。
  CaseGenerationService.generateCase() を実行する。
  cases に INSERT する（status = 'TIER3'）。
  anonymized_user_map から anonymized_id を取得してセットする。
  case_quality_scores を INSERT する。
  case_snapshots にスナップショットをINSERTする（version=1）。
  audit_log に記録する。
```

## Tier昇格

```
TIER3→TIER2（バッチ評価またはOutcome生成時）:
  評価条件（FD-002）:
    quality_score >= 55
    record_days >= 90
    coverage_rate >= 0.70
    disease_keys に 1件以上
    completed_experiments >= 1 (status='COMPLETED' かつ outcome存在)
    consent_level >= 1
  昇格手順:
    cases.tier = 'TIER2' にUPDATE
    cases.status = 'TIER2' にUPDATE
    cases.is_public = true にUPDATE（consent_level >= 1 の場合）
    case_snapshots にスナップショットをINSERT（reason='TIER_PROMOTED'）
    audit_log に記録する

TIER2→TIER1（バッチ評価またはConsent Level 2取得時）:
  評価条件（FD-002）:
    quality_score >= 75
    record_days >= 180
    coverage_rate >= 0.80
    disease_keys に 1件以上
    completed_experiments >= 2 (status='COMPLETED' かつ outcome存在)
    consent_level >= 2
  昇格手順: TIER2昇格と同様

Tier降格: なし（FD-002確定。一度達成したTierは維持する）
```

## Snapshot生成

```
Snapshotを生成するタイミング:
  ① Case初回生成時（version=1）
  ② Tier昇格時（reason='TIER_PROMOTED'）
  ③ Quality Score再計算時（reason='QUALITY_RECALCULATED'）
  ④ Consent更新時（reason='CONSENT_UPDATED'）
  ⑤ バッチ更新時（reason='BATCH_UPDATE'）

Snapshot内容:
  cases.* の全カラムをJSONとして保存する。
  case_quality_scores.* も含める。
```

---

# Output 10: Backfill Strategy

## 対象データ

```
Backfill対象:
  A: user_data.state.records[]        → records テーブル
  B: user_data.state.experiments[]    → experiments + experiment_events テーブル
  C: user_data.state.myDiseases[]     → disease_profiles テーブル
  D: auth.users 全ユーザー            → anonymized_user_map テーブル
  ※ Outcomes は既存データなし（バックフィル不要）
  ※ Cases は既存データなし（バックフィル不要）
  ※ Consents は既存データなし（バックフィル不要）
```

## Backfill設計（10万ユーザーでも成立）

```
バッチ単位: 1ユーザーずつ処理する
  理由: 1ユーザーの失敗が他ユーザーに影響しない。
        失敗したuser_idを記録して再実行できる。

実行環境: Supabase Edge Function (batch-backfill-records)
  pg_cron で実行するか、手動でHTTP呼び出しで実行する。

進捗管理テーブル（一時テーブル）:
  CREATE TABLE _backfill_progress (
    user_id         uuid PRIMARY KEY,
    target          text NOT NULL,  -- 'records'|'experiments'|'diseases'|'anon_map'
    status          text NOT NULL DEFAULT 'PENDING',
      -- 'PENDING'|'IN_PROGRESS'|'DONE'|'FAILED'
    records_migrated integer DEFAULT 0,
    error_message   text,
    started_at      timestamptz,
    completed_at    timestamptz
  );

実行手順:
  1. 全user_idを _backfill_progress に INSERT（status='PENDING'）
  2. バッチ処理: PENDING を 100件取り出し IN_PROGRESS に更新
  3. 各ユーザーを処理する（症状キー変換含む）
  4. 成功: status='DONE', records_migrated=N に更新
  5. 失敗: status='FAILED', error_message=E に更新。処理を継続する
  6. FAILED を再実行する（根本原因調査後）
  7. 全ユーザー DONE 後に _backfill_progress をDROPする

10万ユーザーでの処理時間見積もり:
  平均 500件レコード/ユーザー
  1ユーザー処理: 約100ms（Supabase Edge Function）
  10万ユーザー: 約2.8時間（並列10プロセスで実行）
  並列化: 10 Edge Function インスタンスを同時実行する。
          user_id の先頭1文字（0-9, a-f）でシャーディングして並列化する。

重複防止:
  records: ON CONFLICT (user_id, record_date) DO UPDATE
  experiments: ON CONFLICT (id) DO UPDATE（元のIDを保持する場合）
               または新規UUIDを付与してMAPPINGを保持する
  disease_profiles: ON CONFLICT (user_id, disease_key) DO UPDATE
  anonymized_user_map: ON CONFLICT (user_id) DO NOTHING

UNIQUE制約の適用タイミング:
  023_add_records_unique_constraint.sql は
  080_backfill_records.sql の完了後に実行する。
  重複がある場合は dedup SQL で解消してから適用する。
```

---

# Output 11: Data Validation Plan

## 移行後に保証すべき条件（全項目・決定）

```
V-001: records件数一致
  SELECT COUNT(*) FROM records WHERE is_deleted = false;
  = user_data.state.records[] の総件数（全ユーザーの合算）
  許容誤差: 0件（完全一致必須）

V-002: records.symptom_keys 英語化完了
  SELECT COUNT(*) FROM records
  WHERE EXISTS (
    SELECT 1 FROM unnest(symptom_keys) k
    WHERE k ~ '[^\x00-\x7F]'  -- 非ASCII文字が含まれる
  );
  = 0件（日本語キーがゼロ）

V-003: symptom_key の有効性
  SELECT COUNT(*) FROM record_symptoms rs
  WHERE NOT EXISTS (SELECT 1 FROM symptoms s WHERE s.key = rs.symptom_key);
  = 0件（存在しないsymptom_keyがゼロ）

V-004: records UNIQUE制約確認
  SELECT user_id, record_date, COUNT(*) FROM records
  WHERE is_deleted = false
  GROUP BY user_id, record_date
  HAVING COUNT(*) > 1;
  = 0件（重複なし）

V-005: experiments件数一致
  SELECT COUNT(*) FROM experiments WHERE is_deleted = false;
  = user_data.state.experiments[] の総件数
  許容誤差: 0件

V-006: experiment_events の整合性
  SELECT e.id FROM experiments e
  WHERE NOT EXISTS (
    SELECT 1 FROM experiment_events ee
    WHERE ee.experiment_id = e.id AND ee.event_type = 'CREATED'
  );
  = 0件（CREATEDイベントが存在しない実験がゼロ）

V-007: experiments.status有効値
  SELECT id FROM experiments
  WHERE status NOT IN ('DRAFT','ACTIVE','COMPLETED','ABANDONED');
  = 0件（PAUSED等の無効ステータスがゼロ）

V-008: disease_profiles件数一致
  SELECT COUNT(*) FROM disease_profiles;
  = user_data.state.myDiseases[] の総件数
  許容誤差: 0件

V-009: anonymized_user_map の全ユーザーカバレッジ
  SELECT COUNT(*) FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM anonymized_user_map m WHERE m.user_id = u.id
  );
  = 0件（全ユーザーに匿名化IDが存在する）

V-010: anonymized_id のユニーク性
  SELECT anonymized_id, COUNT(*) FROM anonymized_user_map
  GROUP BY anonymized_id HAVING COUNT(*) > 1;
  = 0件（重複なし）

V-011: consents.level CHECK制約
  SELECT id FROM consents WHERE level NOT BETWEEN 0 AND 3;
  = 0件（Level 4が存在しない）

V-012: case_quality_scores カラム存在確認（FD-001）
  information_schema.columns で以下が存在することを確認:
    duration_score, coverage_score, completeness_score,
    outcome_score, consent_score
  以下が存在しないことを確認:
    disease_tag_multiplier, experiment_quality_score

V-013: cases.id形式確認
  SELECT id FROM cases
  WHERE id !~ '^CASE-[A-Z]+-[0-9]{6}-[A-Z0-9]{8}$';
  = 0件（不正なID形式がゼロ）

V-014: Quality Score再計算一致
  全casesに対して quality_score を再計算し、
  case_quality_scores.total_score との差が 0.01 以内であること。
  差異がある場合は再計算バッチを実行する。

V-015: Tier再評価一致
  全casesのtierを FD-002 条件で再評価し、
  cases.tier と一致することを確認する。
  不一致がある場合は TierEvaluationBatch を再実行する。

V-016: RLS有効化確認
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = false;
  = 0件（全テーブルでRLS有効）

V-017: インデックス作成完了確認
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%';
  SCHEMA_V1で定義した全インデックスが存在することを確認する。

V-018: outcomes Immutable確認
  SELECT trigger_name FROM information_schema.triggers
  WHERE event_object_table = 'outcomes'
    AND event_manipulation = 'UPDATE';
  UPDATE拒否トリガーが存在することを確認する。

V-019: consent_events DELETE禁止確認
  consent_eventsに対してDELETEを試行し、RLSエラーが返ることを確認する。
  （Service Role以外でのDELETEが拒否されること）

V-020: similarity_edges CHECK制約
  SELECT * FROM similarity_edges WHERE case_id_a >= case_id_b;
  = 0件（A < B 制約が守られている）
```

---

# Output 12: Rollback Plan

## Rollback設計原則

```
原則:
  各GroupはRollback可能な状態を維持する。
  Rollback後に再実行できること。
  データ損失は許容しない。

Rollback単位:
  SQLファイル単位（1ファイル = 1トランザクション）
  トランザクション内でエラーが発生した場合は自動ROLLBACKされる。
  GROUP単位でのロールバックも可能（下記手順）。
```

## GroupごとのRollback手順

```
Group B (Master Data) Rollback:
  DROP TABLE IF EXISTS disease_definitions CASCADE;
  DROP TABLE IF EXISTS symptoms CASCADE;
  DROP TABLE IF EXISTS factor_definitions CASCADE;
  ※ 他グループが実行済みの場合はCASCADEで連鎖削除される。
     Group B単体ロールバックは Group C〜L が未実行の場合のみ。

Group C (User Domain) Rollback:
  DROP TABLE IF EXISTS disease_profiles;
  DROP TABLE IF EXISTS anonymized_user_map;
  -- subscriptions は ALTER のため ROLLBACK SQL:
  ALTER TABLE subscriptions DROP COLUMN IF EXISTS <追加カラム>;

Group D (Record Domain) Rollback:
  DROP TABLE IF EXISTS record_symptoms;
  DROP TABLE IF EXISTS record_factors;
  -- records ALTER のROLLBACK:
  ALTER TABLE records
    DROP COLUMN IF EXISTS symptom_keys,
    DROP COLUMN IF EXISTS factor_keys,
    DROP COLUMN IF EXISTS pain_level,
    -- ... (追加した全カラム)
    DROP COLUMN IF EXISTS sync_pending;

Group E (Experiment/Outcome) Rollback:
  DROP TABLE IF EXISTS outcomes;
  DROP TABLE IF EXISTS experiment_events;
  DROP TABLE IF EXISTS experiments;

Group F (Consent) Rollback:
  DROP TABLE IF EXISTS consent_events;
  DROP TABLE IF EXISTS consents;

Group G (Case Domain) Rollback:
  DROP TABLE IF EXISTS similarity_edges;
  DROP TABLE IF EXISTS case_quality_scores;
  DROP TABLE IF EXISTS case_snapshots;
  DROP TABLE IF EXISTS cases;

Group H (Audit) Rollback:
  DROP TABLE IF EXISTS research_exports;
  DROP TABLE IF EXISTS anonymization_log;
  DROP TABLE IF EXISTS audit_log;

Group I (Index) Rollback:
  DROP INDEX CONCURRENTLY IF EXISTS idx_<name>;
  -- 各インデックスを個別にDROPする

Group J (Backfill) Rollback:
  -- records の backfill をロールバック:
  DELETE FROM records WHERE created_at > '<backfill_start_at>';
  -- experiments の backfill をロールバック:
  DELETE FROM experiments WHERE created_at > '<backfill_start_at>';
  -- _backfill_progress テーブルを TRUNCATE
  -- 再実行可能な状態になる

Group K (Dual Write) Rollback:
  アプリケーションの書き込み先を旧テーブルのみに戻す。
  feature flag で制御する。
  DBの変更なし。

Group L (Legacy Removal) Rollback:
  ※ DROP TABLE は取り消し不可。
  ※ 090 / 091 の実行前に必ず pg_dump でバックアップを取ること。
  リストア手順:
    psql -U postgres -d ippo < user_records_backup.sql
    psql -U postgres -d ippo < user_data_backup.sql
  ※ リストア後はDual Writeを再開し、差分を再バックフィルする。
```

## RPO / RTO

```
RPO (Recovery Point Objective) — 許容データ損失時間:
  Group A〜I: 0分（トランザクション内でROLLBACKするため損失なし）
  Group J (Backfill): 0分（_backfill_progress で進捗管理。再実行可能）
  Group K (Dual Write): 0分（新旧両方に書いているため損失なし）
  Group L (Legacy Removal):
    090/091実行前のバックアップ時点まで（最大24時間前）
    → バックアップ直前に実行することでRPO = 0分に近づける

RTO (Recovery Time Objective) — 目標復旧時間:
  Group A〜I: 10分以内（DROP TABLEは即時。再実行は次のデプロイで可能）
  Group J (Backfill): 30分以内（_backfill_progress をリセットして再実行）
  Group K (Dual Write): 5分以内（feature flag切替のみ）
  Group L (Legacy Removal): 2時間以内（pg_dump リストア + 差分バックフィル）

Supabase障害時:
  RPO: Supabaseの自動バックアップ間隔（デフォルト24時間）
  RTO: Supabaseのリストア手順に準拠（通常1〜4時間）
  → Supabase Proプランのポイントインタイムリカバリ（PITR）を有効化することを推奨。
```

---

# Output 13: Cutover Plan

## 本番切替手順

```
前提:
  Supabase本番プロジェクトで実行する。
  全作業をFounder（またはStaff Engineer）が実施する。
  作業は深夜（02:00-06:00 JST）に実施する。
  各ステップ後にValidation Checkを実施する。

Step 1: バックアップ（切替2時間前）
  Supabase Dashboard → Database → Backups → 手動バックアップを作成する。
  バックアップIDを記録する。
  Rollback方法を再確認する。

Step 2: Group B〜H SQL実行（切替1時間前）
  Supabase SQL Editorで 001〜062 を順番に実行する。
  各ファイル実行後にエラーがないことを確認する。
  エラーが発生した場合は即座に停止し、Rollback手順を実行する。

Step 3: Group I Index作成（切替30分前）
  CREATE INDEX CONCURRENTLY を1文ずつ実行する。
  ※ CONCURRENTLY はトランザクション外で実行。時間がかかる場合がある。
  全インデックス作成後に V-017 (インデックス確認) を実行する。

Step 4: Group J Backfill（切替中）
  batch-backfill-records Edge Functionを起動する。
  _backfill_progress で進捗を監視する（5分ごとに確認）。
  全ユーザー DONE になるまで待機する。
  V-001〜V-010 の Validation Checkを実行する。
  023_add_records_unique_constraint.sql を実行する。

Step 5: Group K Dual Write開始
  アプリのfeature flag を dual_write=true に設定する。
  records と user_records の両方に書かれることを確認する。
  5件のテストレコードを記録し、両テーブルに存在することを確認する。

Step 6: Readの新テーブルへの切替（Dual Write開始30日後）
  RecordRepository.findByUser() が records（新）を参照することを確認する。
  7日間の並行稼働後に user_records への Read を停止する。

Step 7: Group L Legacy Removal（Dual Write開始90日後）
  pg_dump user_records → S3/ローカルに保存する。
  pg_dump user_data → S3/ローカルに保存する。
  090_drop_user_records.sql を実行する。
  091_drop_user_data.sql を実行する。
  全Validation Check (V-001〜V-020) を再実行する。
```

## 検証手順

```
各Stepの完了確認クエリ:
  Step 2後: SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('disease_definitions','symptoms','factor_definitions',
                                 'disease_profiles','anonymized_user_map',
                                 'experiments','experiment_events','outcomes',
                                 'consents','consent_events',
                                 'cases','case_snapshots','case_quality_scores',
                                 'similarity_edges','audit_log',
                                 'anonymization_log','research_exports');
            = 17件（既存5テーブルに加えて17テーブルが存在）

  Step 4後: V-001〜V-020 全件実施

  Step 5後: SELECT COUNT(*) FROM records r
            WHERE NOT EXISTS (
              SELECT 1 FROM user_records ur
              WHERE ur.user_id = r.user_id AND ur.record_date = r.record_date
            );
            Dual Write中は = 0 であること（新旧の件数差がゼロ）
```

## 監視項目

```
Dual Write期間中（Group K）の監視:
  毎日実行:
    records件数 vs user_records件数の差異
    experiments件数 vs user_data.state.experiments件数の差異
    差異発生時: Slack通知 → 翌朝に調査

切替後の監視:
  24時間監視:
    records INSERT エラー率 (= 0%)
    experiments INSERT エラー率 (= 0%)
    RLS によるアクセス拒否ログ（想定外の拒否がないか）

Supabase Dashboardで確認:
  - Database CPU使用率 (切替前後で変化がないこと)
  - クエリ実行時間 (切替前後で悪化がないこと)
  - エラーログ
```

---

# Output 14: Failure Simulation

## 最低20ケースのシミュレーション（決定済みの対応策）

```
F-001: 002_create_symptoms.sql 実行中にFK制約エラー
  原因: disease_definitions が存在しない状態で症状を追加しようとした
  対応: 実行順序を確認する。001より前に002を実行しようとしている。
        正しい順序 (001→002) で再実行する。
  検知: SQL実行のエラーメッセージ
  影響範囲: なし（トランザクション内でROLLBACKされる）

F-002: 021_create_record_symptoms.sql で症状FK制約エラー
  原因: 002_create_symptoms.sql が未実行
  対応: 002を実行してから021を再実行する
  検知: ERROR: insert or update on table violates foreign key constraint

F-003: 023_add_records_unique_constraint.sql で重複エラー
  原因: user_data.stateに同一日付のレコードが複数存在する
  対応:
    -- 重複を確認する
    SELECT user_id, record_date, COUNT(*) FROM records
    GROUP BY user_id, record_date HAVING COUNT(*) > 1;
    -- 古い方（created_at が小さい方）を is_deleted=true に更新する
    UPDATE records SET is_deleted=true, deleted_at=now()
    WHERE id IN (
      SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY user_id, record_date ORDER BY created_at
        ) as rn FROM records
      ) t WHERE rn > 1
    );
    -- 再度 023 を実行する
  検知: ERROR: could not create unique index

F-004: 080_backfill_records.sql でSymptom変換失敗
  原因: _migration_symptom_key_map に存在しない日本語キーがある
  対応:
    SELECT DISTINCT unnest(symptom_keys) FROM records
    WHERE symptom_keys::text ~ '[^\x00-\x7F]'
      AND NOT EXISTS (SELECT 1 FROM _migration_symptom_key_map
                      WHERE ja_key = ANY(symptom_keys));
    → 不明キーを確認し、マップに追加するか '_UNMAPPED_' として保存する
    → _UNMAPPED_ のまま残すユーザーをFounderが手動確認する
  影響範囲: バックフィル失敗ユーザーのみ。他ユーザーへの影響なし

F-005: 081_backfill_experiments.sql でPAUSED実験発見
  原因: 旧アプリがPAUSEDステータスを使用していた
  対応:
    PAUSEDをABANDONEDにマッピングし、abandon_reason='MIGRATED_FROM_PAUSED'を設定する
    PAUSED期間中のレコードはABANDONED後7日ルールの対象として扱う
  影響範囲: PAUSED実験を持つユーザーのOutcome生成が7日遅れる

F-006: Group G 実行中に cases テーブルのFK（anonymized_user_map）エラー
  原因: 083_backfill_anonymized_user_map.sql が未完了
  対応: 083が完了してから050を実行する。Group Jは Group I 完了後に実行すること
  検知: FK制約エラー

F-007: CREATE INDEX CONCURRENTLY がタイムアウト
  原因: records テーブルが大きい（バックフィル中に実行した）
  対応:
    バックフィル完了後に再実行する。
    進行中のCONCURRENTLYは中断しても問題ない（INVALIDインデックスになる）。
    DROP INDEX <invalid_index>; でINVALIDを削除してから再実行する。
  検知: pg_indexes で is_valid = false を確認する

F-008: Dual Write中にrecordsへのINSERTがRLSエラー
  原因: application layerがservice_roleではなくauthenticated roleで実行している
  対応:
    Supabase Edge Functionはservice_roleキーを使用していることを確認する。
    直接クライアントサイドからINSERTしている場合はRLSポリシーを確認する。
  検知: ERROR: new row violates row-level security policy

F-009: Backfill進捗テーブル (_backfill_progress) が中断
  原因: Edge Functionがタイムアウトまたはクラッシュ
  対応:
    status='IN_PROGRESS' を status='PENDING' に更新して再開する
    UPDATE _backfill_progress SET status='PENDING', started_at=NULL
    WHERE status='IN_PROGRESS';
    → Edge Functionを再実行する
  データ損失: ON CONFLICT DO UPDATE のため重複処理されても安全

F-010: 050_create_cases.sql で consents FK エラー
  原因: Group F（040 consents）が未実行
  対応: 040→041を先に実行してから050を実行する
  検知: FK制約エラー

F-011: Case生成時に anonymized_user_map にユーザーが存在しない
  原因: 083_backfill_anonymized_user_map.sql が失敗したユーザーがいる
  対応:
    INSERT INTO anonymized_user_map (user_id) VALUES ($user_id)
    ON CONFLICT DO NOTHING;
    CaseGenerationService の前提チェックとして anonymized_id の存在確認を追加する
  検知: NOT NULL 制約エラー または FOREIGN KEY 違反

F-012: Quality Score計算でdisease_tag_multiplierカラムを参照するコードが残存
  原因: CONSTITUTION_RECONCILIATION_V1のRD-005が未反映
  対応:
    app-legacy.js および domains/case/quality-score.ts で
    disease_tag_multiplier の参照をグレップして削除する
    case_quality_scores テーブルに disease_tag_multiplier カラムがないことを確認する（V-012）
  検知: column "disease_tag_multiplier" does not exist

F-013: Outcome生成がABANDONED後7日未満で実行される
  原因: 7日ルール（RD-004）のチェックが実装されていない
  対応:
    OutcomeService.generateOutcome() に以下の検証を追加する:
    IF experiment.status = 'ABANDONED' AND
       (now() - experiment.actual_end_at) < interval '7 days' THEN
      RAISE EXCEPTION 'Cannot generate outcome: 7-day wait period not elapsed';
    END IF;
  検知: 不正なOutcomeが生成されると V-014（Quality Score不一致）で検知

F-014: consents.level = 4 のデータがINSERTされる
  原因: 旧コードがLevel 4を送信している（RD-006未反映）
  対応:
    CHECK (level BETWEEN 0 AND 3) 制約がDBレベルで拒否する（040で設定済み）
    アプリコードで Level 4 参照をグレップして削除する
  検知: ERROR: new row for relation "consents" violates check constraint

F-015: 090_drop_user_records.sql 実行後にアプリがuser_recordsを参照
  原因: Dual Write停止とRead切替が完了していない状態でDROPした
  対応: 絶対に発生させない。事前確認手順:
    1. アプリコードで user_records を参照している箇所をグレップして確認
    2. 全てのReadがrecords（新）に切り替わっていることをログで確認
    3. Dual Writeが停止していることを確認
    4. 確認後にDROPを実行する
  リカバリー: pg_dump バックアップからリストアする（RTO: 2時間）

F-016: 091_drop_user_data.sql 実行後に未移行データが発覚
  原因: バックフィル漏れがあった
  対応:
    DROP前にV-001〜V-009を全件実施することで防止する。
    発覚した場合: pg_dump バックアップからリストアして差分を再バックフィル
  影響範囲: 全ユーザー（DROP後は即座にリストアが必要）

F-017: Similarity生成でcase_similarityテーブルを参照するコードが残存
  原因: ARCHITECTURE_V3のcase_similarity（旧名称）がコードに残っている
  対応:
    similarity_edges に統一する（RD-008確定）
    grep -r "case_similarity" src/ でコードを検索して全て修正する
  検知: relation "case_similarity" does not exist

F-018: experiment_events.event_type に 'PAUSED' または 'RESUMED' がINSERT
  原因: 旧コードが PAUSED/RESUMED を送信している（RD-003未反映）
  対応:
    CHECK制約を 031_create_experiment_events.sql に追加する:
    CHECK (event_type IN ('CREATED','STARTED','COMPLETED','ABANDONED','CONFIG_CHANGED'))
    アプリコードで PAUSED/RESUMED を削除する
  検知: CHECK制約違反

F-019: Supabase障害（DB接続不可）がBackfill中に発生
  原因: Supabase側のインフラ障害
  対応:
    _backfill_progress の status='IN_PROGRESS' を status='PENDING' にリセットする
    Supabase復旧後に Edge Function を再実行する
    ON CONFLICT DO UPDATE のため重複処理は安全
  影響範囲: 障害発生時点からの進捗が巻き戻る。データ損失なし
  検知: Supabase Status Page (status.supabase.com)

F-020: PostgreSQL WAL肥大化（Backfill中の大量INSERT）
  原因: 10万ユーザーのBackfillで大量のWALが生成される
  対応:
    バッチサイズを 1ユーザー = 1トランザクションに制限する
    WALサイズを Supabase Dashboard で監視する
    必要であれば CHECKPOINT を手動実行する（Service Roleで可能）
    並列数を 10 → 5 に落として WAL 生成速度を下げる
  検知: Supabase Dashboard の Disk Usage が急増

F-021: case_snapshots のversion番号が重複
  原因: CaseGenerationServiceが並行して同じCaseを更新した
  対応:
    051_create_case_snapshots.sql の UNIQUE (case_id, version) 制約で防止する
    アプリ層では version をインクリメントする前に SELECT FOR UPDATE を使用する
  検知: UNIQUE制約違反エラー

F-022: audit_log へのINSERTが失敗してもメイン処理に影響する
  原因: audit_log INSERTがメイン処理と同一トランザクション内にある
  対応:
    audit_log INSERTは EXCEPTION をキャッチして継続する実装にする。
    または audit_log INSERT をサブトランザクション（SAVEPOINT）で実行する。
    監査ログ欠損は許容する（データ欠損は許容しない）
  検知: ログのエラー率監視

F-023: k-anonymity検査でk < 5のCaseが発生
  原因: 特定の疾患×年齢層の症例数が少ない
  対応:
    anonymization_log の passed=false を検知する
    research_exports クエリで group_size >= k を必須条件にする
    anonymization_log.suppressed = true にして出力対象から除外する
    GDPR 72時間通知が必要かどうかを評価する（外部送信前であれば不要）
  検知: V-011相当のクエリで daily batch が通知する

F-024: PRO検索でSQLインジェクション
  原因: アプリが検索クエリをサニタイズせずにSQL文字列に結合している
  対応:
    全クエリをParameterized Queryで実装する（Supabase JS SDKの .eq() .in() を使用）
    文字列結合によるSQL生成を禁止する（PRレビューチェックリストに追加）
  検知: コードレビュー / SAST ツール

F-025: cases.is_publicが更新されないままTier2昇格
  原因: TierEvaluationBatchがis_publicの更新を忘れている
  対応:
    Tier昇格ロジックに is_public = (tier IN ('TIER2','TIER1') AND consent_level >= 1) の
    更新を必ず含める
    V-015（Tier再評価一致）でバッチが正しく動作していることを確認する
  検知: cases.is_public = false なのに tier = 'TIER2' の行がある

  SELECT id FROM cases WHERE tier IN ('TIER2','TIER1') AND consent_level >= 1
  AND is_public = false;
  = 0件であること
```

---

# Output 15: Migration KPI

## 各Group完了条件（決定）

```
Group B (Master Data) 完了条件:
  ✓ disease_definitions に 11疾患が存在する
  ✓ symptoms に 33症状が存在する（全て英語snake_caseキー）
  ✓ factor_definitions に 20ファクターが存在する
  ✓ 全テーブルのRLSが有効
  検証クエリ:
    SELECT COUNT(*) FROM disease_definitions; -- = 11
    SELECT COUNT(*) FROM symptoms;            -- = 33
    SELECT COUNT(*) FROM factor_definitions;  -- = 20

Group C (User Domain) 完了条件:
  ✓ disease_profiles テーブルが存在する
  ✓ anonymized_user_map テーブルが存在する
  ✓ subscriptions の変更が適用されている

Group D (Record Domain) 完了条件:
  ✓ records テーブルに symptom_keys, factor_keys カラムが存在する
  ✓ record_symptoms テーブルが存在する
  ✓ record_factors テーブルが存在する
  ✓ UNIQUE(user_id, record_date) 制約が適用されている（023実行後）

Group E (Experiment/Outcome) 完了条件:
  ✓ experiments テーブルが存在する
  ✓ experiment_events テーブルが存在する（event_typeのCHECK制約含む）
  ✓ outcomes テーブルが存在する
  ✓ outcomes へのUPDATE拒否トリガーが設定されている

Group F (Consent) 完了条件:
  ✓ consents テーブルが存在する（level CHECK (0 AND 3)）
  ✓ consent_events テーブルが存在する（DELETE禁止RLS）

Group G (Case Domain) 完了条件:
  ✓ cases テーブルが存在する
  ✓ case_snapshots テーブルが存在する
  ✓ case_quality_scores テーブルが存在する（FD-001カラム構成）
  ✓ similarity_edges テーブルが存在する（CHECK: case_id_a < case_id_b）

Group H (Audit) 完了条件:
  ✓ audit_log テーブルが存在する
  ✓ anonymization_log テーブルが存在する
  ✓ research_exports テーブルが存在する

Group I (Index) 完了条件:
  ✓ V-017（インデックス確認）が全件通過する
  ✓ INVALIDインデックスが存在しない
  検証クエリ:
    SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_%' AND schemaname='public';

Group J (Backfill) 完了条件:
  ✓ V-001〜V-010 が全件通過する
  ✓ _backfill_progress の status='FAILED' が 0件
  ✓ V-002（日本語symptom_key ゼロ）が通過する
  ✓ 023_add_records_unique_constraint.sql が成功する

Group K (Dual Write) 完了条件（30日後）:
  ✓ 30日間で records と user_records の件数差が 0件維持
  ✓ エラー率 0%（書き込みエラーなし）
  ✓ Readを新テーブルに切り替えて7日間正常稼働

Group L (Legacy Removal) 完了条件:
  ✓ V-001〜V-020 全件通過
  ✓ user_records テーブルが存在しない
  ✓ user_data テーブルが存在しない
  ✓ pg_dump バックアップが S3/ローカルに保存されている
  ✓ アプリコードに user_records / user_data への参照がゼロ
    grep -r "user_records\|user_data" src/ --include="*.js" --include="*.ts" | wc -l
    = 0

Phase 6 全体完了条件:
  ✓ 全Group（B〜L）完了条件を満たす
  ✓ Migration KPI レポートをFounderに提出する
  ✓ Privacy Policy が C-1〜C-9 の宣言を含む状態で公開済み
  ✓ PRO検索（cases TIER2+）が正常に動作することをE2Eテストで確認する
```

---

# Output 16: Founder Critical Decisions

## C-001: Backfillは「再実行可能」設計を必ず維持する

```
内容: 全てのBackfillスクリプトは ON CONFLICT DO UPDATE（またはDO NOTHING）を使用する。
     冪等性（何度実行しても同じ結果）を保証する。

Why: Backfill中断は必ず発生する（ネットワーク, タイムアウト等）。
     再実行不可のBackfillは中断した時点でデータが不整合になる。
     10万ユーザー規模ではBackfillは数時間かかる。必ず中断するものとして設計する。

How to apply: BackfillスクリプトのPRレビューで ON CONFLICT の有無を必ずチェックする。
```

## C-002: Group L（Legacy Removal）は必ずバックアップ取得後に実行する

```
内容: 090_drop_user_records.sql / 091_drop_user_data.sql の実行前に
     pg_dump で旧テーブルをファイルに保存する。保存先を確認してからDROPする。

Why: DROP TABLE は即時・取り消し不可。
     Validation Check漏れがあった場合のリカバリー手段がバックアップのみ。
     将来10万ユーザーになってからDROPした後のリカバリーは数日かかる。

How to apply: Group L 実行前チェックリストにバックアップ確認を最初の項目として追加する。
```

## C-003: 023（UNIQUE制約）は Backfill完了後に適用する

```
内容: UNIQUE(user_id, record_date) 制約の適用は、
     080_backfill_records.sql の完了後・検証後に実行する。
     Backfill前に適用するとBulk INSERTがUNIQUE違反で失敗する。

Why: 旧データに同一日付の重複レコードが存在する可能性がある。
     重複をdedupしてからでないとUNIQUE制約は適用できない。

How to apply: Migration実行手順書（本文書）の手順を遵守する。
```

## C-004: Dual Write期間中はfeature flagで即座に切り戻し可能にする

```
内容: Dual WriteのON/OFFをfeature flag（環境変数またはDB設定）で制御する。
     アプリの再デプロイなしに切り戻せる設計にする。

Why: Dual Write開始後に新テーブルへのINSERTでバグが発覚した場合、
     即座に旧テーブルのみに戻せる必要がある。
     Dual Writeが強制ハードコードされていると切り戻しに時間がかかる。

How to apply: feature flag の実装をDual Write実装のPR-012の受け入れ条件とする。
```

## C-005: CREATE INDEX CONCURRENTLYはトランザクション外で実行する

```
内容: 全インデックス作成はCREATE INDEX CONCURRENTLYを使用する。
     トランザクションブロック（BEGIN〜COMMIT）の外で実行する。
     失敗したらDROP INDEX後に再実行する。

Why: CONCURRENTLY無しのCREATE INDEXはテーブルロックを取得する。
     recordsテーブルが3,000万行の場合、ロック時間が数分〜数十分になりうる。
     CONCURRENTLY使用でロックなし（遅いが安全）。

How to apply: 070_create_indexes_concurrent.sql の各文をSupabase SQL Editorで1文ずつ実行する。
             BEGIN; で囲まない。
```

## C-006: Symptom Key英語化（Group B〜J）はPhase C（Case生成）前に完了する

```
内容: records.symptom_keys[]の全件英語化は、
     CaseGenerationServiceが稼働を開始するより前に完了していなければならない。

Why: CaseがPRIMARY_SYMPTOM_KEYS[]を生成する際に英語キーが前提。
     日本語キーが混在したままCase生成すると
     primary_symptom_keysに日本語が混入し、類似検索が壊れる。

How to apply: Group J完了条件のV-002（日本語symptom_key ゼロ）が
             Case生成パイプライン（PR-070以降）の実装開始の前提条件。
```

## C-007: user_data.state への直接書き込みは Dual Write 開始と同時に停止する

```
内容: Group K（Dual Write）開始時点から、
     user_data.state への書き込みを新規機能で行ってはならない。
     既存のapp-legacy.jsが書き込む部分はDual Writeのスコープ内とする。

Why: user_data.state に新データが書き込まれ続けると
     バックフィルの完了条件が永遠に達成されない。
     Group L（Legacy Removal）が実行できなくなる。

How to apply: Dual Write 開始のPRレビューで user_data への新規書き込みがないことを確認する。
```

## C-008: Privacy Policy の公開はPhase G（Case生成）より前に完了する

```
内容: SCHEMA_V1のC-1〜C-9（Founder Critical Decisions）を含む
     Privacy Policyを公開することが Case生成開始の前提条件。

     必須記載項目:
       C-1: record_dateはタイムゾーンなし日付である
       C-2: 症状キーは英語統一形式である
       C-3: Case IDの形式 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}'
       C-5: 匿名化IDは不可逆である
       C-6: 匿名集計値への撤回不遡及

Why: Case生成開始後にPrivacy Policyを変更すると全既存ユーザーへの再通知が必要になる。
     法的リスクを最小化するため先行公開が必須。

How to apply: Group G（Case Domain SQL）実行とPrivacy Policy公開を同時に実施する。
```

---

# Migration Master Plan サマリー

## 確定事項一覧

| 項目 | 決定内容 |
|------|----------|
| Migration Philosophy | Expand → Migrate → Contract + Strangler Pattern |
| Migration Group数 | 12グループ（B〜L、Group A はディレクトリ作業） |
| SQLファイル数 | 27ファイル（001〜091） |
| Backfill単位 | 1ユーザー = 1トランザクション |
| Dual Write期間 | 最低30日、最大90日 |
| UNIQUE制約適用タイミング | Backfill完了後 |
| インデックス作成方法 | CREATE INDEX CONCURRENTLY（ロックなし） |
| RPO（Group A〜K） | 0分 |
| RTO（Group A〜K） | 5〜30分 |
| RPO（Group L） | バックアップ取得直後 ≒ 0分 |
| RTO（Group L） | 最大2時間 |
| Failure Simulation | 25ケース（F-001〜F-025） |
| Founder Critical Decisions | C-001〜C-008（8件） |

## Phase 6 完了判定

以下が全て満たされた時点でPhase 6完了とする。

```
✓ Migration Group確定（Output 2）— 完了
✓ SQL順序確定（Output 3）— 完了
✓ Rollback確定（Output 12）— 完了
✓ Cutover確定（Output 13）— 完了
✓ Validation確定（Output 11）— 完了
✓ Failure Simulation完了（Output 14: 25ケース）— 完了
✓ Founder Critical Decision確定（Output 16: C-001〜C-008）— 完了
```

---

*MIGRATION_MASTER_PLAN_V1.md — Version 1.0 — Migration Planning Council承認*
*本文書はPhase 7 Implementation / Phase 8 Testing の唯一のMigration計画書*
*本文書と他文書が矛盾する場合、CONSTITUTION_RECONCILIATION_V1.md を正とする*
