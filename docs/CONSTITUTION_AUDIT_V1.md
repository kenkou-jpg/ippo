# CONSTITUTION_AUDIT_V1.md
## IPPO EVOLUTION PROGRAM — Phase 4.75: Cross-Document Constitution Audit

Version: 1.0
Generated: 2026-06-24
Authority: Constitution Audit Council
監査対象文書:
  - docs/DOMAIN_MODEL_V1.md
  - docs/ARCHITECTURE_V3.md
  - docs/SCHEMA_V1.md
  - docs/REPOSITORY_CONSTITUTION_V1.md

完了条件: Critical = 0 / High = 0

---

# 監査サマリー

| 重要度 | 件数 | ステータス |
|--------|------|-----------|
| Critical | 3 | 要修正 |
| High | 4 | 要修正 |
| Medium | 4 | Phase A中に修正 |
| Accepted | 2 | 意図的な設計差異 |
| **合計** | **13** | — |

---

# CRITICAL — 今すぐ修正（実装開始前に解決必須）

---

## [C-001] Quality Score 配点が DOMAIN_MODEL と SCHEMA/CONSTITUTION で異なる

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 595-600）:
```
recordVolume        × 0.25   // → max 25
recordDensity       × 0.20   // → max 20
dataCompleteness    × 0.20   // → max 20  ← ここ
experimentQuality   × 0.20   // → max 20
outcomeQuality      × 0.10   // → max 10  ← ここ
consentLevel        × 0.05   // → max 5
合計: 100点
```

SCHEMA_V1.md（case_quality_scores テーブル定義）:
```
record_volume_score         (max 25)
record_density_score        (max 20)
data_completeness_score     (max 15)  ← 15 ≠ 20
experiment_quality_score    (max 20)
outcome_quality_score       (max 15)  ← 15 ≠ 10
consent_score               (max 5)
合計: 100点
```

REPOSITORY_CONSTITUTION_V1.md（I-3）:
```
「volume:25, density:20, completeness:15, exp:20, outcome:15, consent:5」← SCHEMA側と一致
```

**影響:**
- dataCompleteness と outcomeQuality の重みが文書間で食い違う
- SSOT（domains/case/quality-score.ts）が確定していない状態で実装を始めると
  バッチとフロントエンドで異なるスコアが計算される

**修正方法:**
どちらを正とするかを今すぐ決定し、全文書を統一する。

```
選択肢A（DOMAIN_MODEL側を正とする）:
  dataCompleteness → max 20 (weight 0.20)
  outcomeQuality   → max 10 (weight 0.10)
  → SCHEMA_V1 と CONSTITUTION を修正

選択肢B（SCHEMA/CONSTITUTION側を正とする）:
  dataCompleteness → max 15 (weight 0.15)
  outcomeQuality   → max 15 (weight 0.15)
  → DOMAIN_MODEL_V1 を修正

推奨: 選択肢B
  理由: outcomeQuality を 10% にすると「実験完了1件」での
        Tier2達成が構造的に困難になる。15%の方がバランスがよい。
```

**修正後に統一する値（Founder承認後）:**
```
record_volume_score      max 25  (0.25)
record_density_score     max 20  (0.20)
data_completeness_score  max 15  (0.15)
experiment_quality_score max 20  (0.20)
outcome_quality_score    max 15  (0.15)
consent_score            max 5   (0.05)
合計: 100点
```

**修正対象ファイル:**
- docs/DOMAIN_MODEL_V1.md（line 595-600）← 選択肢B採用時
- docs/SCHEMA_V1.md（case_quality_scores コメント）← 選択肢A採用時
- 実装時: domains/case/quality-score.ts（SSOT）

---

## [C-002] Tier2/Tier1 の カバレッジ条件が DOMAIN_MODEL にのみ存在し ARCHITECTURE/SCHEMA に欠落

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 1076-1078）のTier昇格サマリー:
```
Tier 2 | ≥ 55 | 90日+ | 70%+ | 1件 | Level 1
Tier 1 | ≥ 75 | 180日+ | 80%+ | 2件+ | Level 2
```

ARCHITECTURE_V3.md（line 838-841）のTier昇格条件:
```
CANDIDATE → TIER3: ユーザー承認 + Consent Level 1 + quality_score≥30
TIER3 → TIER2:    quality_score≥55 + record_days≥90 + completed_exp≥1
TIER2 → TIER1:    quality_score≥75 + record_days≥180 + completed_exp≥2 + Consent Level 2
```

SCHEMA_V1.md のCase Tier定義:
```
TIER2: quality_score >= 55, record_days >= 90, completed_experiments >= 1
TIER1: quality_score >= 75, record_days >= 180, completed_experiments >= 2, consent_level >= 2
```

**欠落しているもの:**
- Tier2昇格条件から「coverage >= 70%」が抜けている（ARCHITECTURE / SCHEMA）
- Tier1昇格条件から「coverage >= 80%」が抜けている（ARCHITECTURE / SCHEMA）
- CANDIDATEは「coverage >= 60%」があるが、Tier2/1は抜け落ちている

**影響:**
- カバレッジ60%の低密度記録でもTier2に昇格できてしまう
- 症例品質の担保がqualityスコアのみになり、quality_score計算のバグで低品質症例が公開される

**修正方法:**
ARCHITECTURE_V3 と SCHEMA_V1 のTier昇格条件にカバレッジ要件を追加する。

```
確定値（Founder承認後）:
  CANDIDATE → TIER3: quality_score≥30 + ユーザー承認 + consent_level≥1
  TIER3 → TIER2:     quality_score≥55 + record_days≥90 + coverage≥70% + completed_exp≥1
  TIER2 → TIER1:     quality_score≥75 + record_days≥180 + coverage≥80% + completed_exp≥2 + consent_level≥2
```

**修正対象ファイル:**
- docs/ARCHITECTURE_V3.md（出力5 Tier昇格条件テーブル）
- docs/SCHEMA_V1.md（出力7 Case Tier定義）
- 実装時: domains/case/case-tier.ts（SSOT）

---

## [C-003] diseaseTagMultiplier の定義が DOMAIN_MODEL と SCHEMA で異なる概念

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 657-663）:
```
diseaseTagMultiplier（疾患タグ数による補正）:
  疾患タグ 0件 → 0.0
  疾患タグ 1件 → 1.0
  疾患タグ 2件 → 1.05（複合疾患として研究価値が高い）
  疾患タグ 3件以上 → 1.08
```

SCHEMA_V1.md（case_quality_scores テーブル定義）:
```
disease_tag_multiplier  numeric(3,2)  -- 疾患診断ありで1.1倍
```

**矛盾の内容:**
- DOMAIN_MODEL: 疾患タグ「数」に応じて段階的に 1.0〜1.08 倍
- SCHEMA: 疾患「診断あり」で一律 1.1 倍
- 「タグ数」と「診断有無」は別の概念
- 倍率も 1.08 vs 1.1 で食い違い

**影響:**
- Quality Scoreの計算結果が文書によって異なる
- 「複合疾患ほど価値が高い」というDOMAIN_MODELの思想がSCHEMAに反映されていない

**修正方法:**
DOMAIN_MODEL の定義を正として SCHEMA を修正する。

```
確定値:
  disease_tag_multiplier:
    疾患タグ 0件 → 0.0  (事実上Case不成立)
    疾患タグ 1件 → 1.0
    疾患タグ 2件 → 1.05 (複合疾患)
    疾患タグ 3件以上 → 1.08
```

SCHEMA_V1.md の case_quality_scores コメントを修正:
```sql
disease_tag_multiplier  numeric(3,2),
  -- 0件→0.00 / 1件→1.00 / 2件→1.05 / 3件以上→1.08
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（disease_tag_multiplierコメント）
- 実装時: domains/case/quality-score.ts（SSOT）

---

# HIGH — 実装前に修正（Phase A開始前に解決）

---

## [H-001] Tier2 の Consent Level 要件が文書内・文書間で不整合

**発見した矛盾:**

DOMAIN_MODEL_V1.md 内での不整合:
```
サマリー表（line 1077）:
  Tier 2 | ≥ 55 | 90日+ | 70%+ | 1件 | Level 1  ← Level 1 必要

詳細条件（line 672）:
  Tier 2: 疾患タグ1件以上、記録90日以上、実験完了1件以上  ← Level 1 記載なし
```

ARCHITECTURE_V3.md:
```
TIER3 → TIER2: quality_score≥55 + record_days≥90 + completed_exp≥1  ← Level 1 なし
```

SCHEMA_V1.md:
```
TIER2: quality_score >= 55, record_days >= 90, completed_experiments >= 1  ← Level 1 なし
```

**影響:**
- Consent Level 1 なしでTier2に昇格できるかが不明確
- 実装者が好きな方を選ぶことになり、運用中に挙動が変わるリスク

**修正方法:**
Tier2はPRO検索に公開されるため、Consent Level 1 は必須とする。

```
確定値:
  TIER3 → TIER2: quality_score≥55 + record_days≥90 + coverage≥70%
                  + completed_exp≥1 + consent_level≥1  ← 追加
```

**修正対象ファイル:**
- docs/DOMAIN_MODEL_V1.md（詳細条件 line 672 付近）
- docs/ARCHITECTURE_V3.md（Tier昇格条件テーブル）
- docs/SCHEMA_V1.md（Case Tier定義）

---

## [H-002] Experiment に PAUSED ステータスが存在するが状態機械に定義なし

**発見した矛盾:**

SCHEMA_V1.md（experiment_events テーブル）:
```sql
event_type text NOT NULL,
  -- 'CREATED'|'STARTED'|'PAUSED'|'RESUMED'|'COMPLETED'|'ABANDONED'|'CONFIG_CHANGED'
```

SCHEMA_V1.md（experiments ステータス定義）:
```
status: 'DRAFT'|'ACTIVE'|'COMPLETED'|'ABANDONED'
```

DOMAIN_MODEL_V1.md（Experiment状態遷移）:
```
DRAFT → ACTIVE → COMPLETED
                → ABANDONED
(PAUSEDなし)
```

REPOSITORY_CONSTITUTION_V1.md（状態遷移図）:
```
DRAFT → ACTIVE → COMPLETED
                → ABANDONED
(PAUSEDなし)
```

**矛盾:**
`PAUSED` / `RESUMED` イベントは experiment_events に定義されているが、
experiments.status に `PAUSED` が存在しない。
イベントを記録できるが、現在の状態を表現できない。

**影響:**
- 「一時停止中」の実験をクエリで取得できない
- PAUSEDイベントを受け取ったServiceがexperiments.statusを何にすればよいか不明

**修正方法（2択）:**

```
選択肢A: PAUSEDを正式ステータスとして追加する
  experiments.status に 'PAUSED' を追加
  状態遷移: ACTIVE → PAUSED → ACTIVE（RESUMED）
  → DOMAIN_MODEL / ARCHITECTURE / CONSTITUTION の状態遷移図を更新

選択肢B: PAUSED/RESUMEDイベントをevent_typesから削除する
  「一時停止」機能を持たない設計とする
  → experiment_events.event_type の選択肢から PAUSED/RESUMED を除去

推奨: 選択肢B
  理由: 一時停止中の実験でのRecord記録がどう扱われるか未定義。
        Outcome計算の before/after 期間も複雑になる。
        まず COMPLETED/ABANDONED の2パスを完成させる。
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（experiment_events の event_type から PAUSED/RESUMED を削除、または experiments.status に PAUSED を追加）
- 選択肢A採用時: docs/DOMAIN_MODEL_V1.md / ARCHITECTURE_V3.md / CONSTITUTION も更新

---

## [H-003] ABANDONED実験からのOutcome生成に「7日ルール」が DOMAIN_MODEL にのみ存在

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 375）:
```
OutcomeはExperimentがCOMPLETEDまたはABANDONED（7日以上経過）
になった後にのみ生成される。
```

SCHEMA_V1.md（OutcomeService定義）:
```
generateOutcome(experimentId)
← 7日条件の記載なし
```

ARCHITECTURE_V3.md（Case生成フロー）:
```
[Experiment完了]
    ↓
Outcome生成（Edge Function）
← 7日条件の記載なし
```

**影響:**
- ABONDANEDの翌日にOutcomeを生成できるかが実装依存になる
- 7日を待たずに生成した場合、After期間のデータが不足する可能性

**修正方法:**
DOMAIN_MODELの「7日ルール」を正として全文書に追記する。

```
確定ルール:
  COMPLETED後: 即座にOutcome生成可能
  ABANDONED後: 7日以上経過後にのみOutcome生成可能
               （after期間のデータが最低7日分存在することを保証するため）
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（OutcomeService定義、およびExperiment状態遷移のコメント）
- docs/ARCHITECTURE_V3.md（Case生成フローの「Experiment完了」ステップ）

---

## [H-004] Tier2 のConsent Level要件が DOMAIN_MODEL サマリー表と詳細条件で不整合（DOMAIN_MODEL内部）

※ [H-001]の根本原因となる DOMAIN_MODEL 内部の不整合を独立して記録する。

**発見した矛盾:**

DOMAIN_MODEL_V1.md 内:
```
line 1077（サマリー表）: Tier 2 → Level 1 必要
line 672（詳細条件）:    Tier 2 → Consent Level 記載なし
line 558（ライフサイクル図）: 90日/70%/実験1件完了 → Level 1 記載なし
```

**修正方法:**
詳細条件（line 672）とライフサイクル図（line 558）にConsent Level 1を追記。

**修正対象ファイル:**
- docs/DOMAIN_MODEL_V1.md（line 558, 672 付近）

---

# MEDIUM — Phase A 中に修正

---

## [M-001] experimentQuality サブ計算式が DOMAIN_MODEL にのみ定義されSCHEMAに欠落

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 636-639）:
```
experimentQualityScore:
  completed_experiments = 0  → 0
  completed_experiments = 1  → 50 + (outcomeQuality × 0.3)
  completed_experiments = 2  → 75 + (avgOutcomeQuality × 0.25)
  completed_experiments >= 3 → 90 + (avgOutcomeQuality × 0.10)
```

SCHEMA_V1.md:
```
experiment_quality_score  numeric(5,2)  -- 実験品質スコア (max 20)
← サブ計算式の記載なし
```

**影響:**
実装者がサブ計算式を自己判断で実装するリスク。DOMAIN_MODELを参照しないとわからない。

**修正方法:**
SCHEMA_V1.md のコメントにサブ計算式へのポインタを追記する。

```sql
experiment_quality_score    numeric(5,2),
  -- サブ計算式: DOMAIN_MODEL_V1.md §Case Quality Score を参照
  -- 0件→0 / 1件→50+(outcomeQ×0.3) / 2件→75+(avgOutcomeQ×0.25) / 3件以上→90+(avgOutcomeQ×0.10)
  -- その後 max 20 に正規化
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（experiment_quality_score コメント）

---

## [M-002] SimilarityService の配置が ARCHITECTURE と CONSTITUTION で齟齬

**発見した矛盾:**

ARCHITECTURE_V3.md:
```
Similarity → Core Domain に分類
  責務: 類似症例インデックス生成・PRO検索
  所有: case_similarity / case_search_index
```

REPOSITORY_CONSTITUTION_V1.md（ディレクトリ構成 出力8）:
```
services/
  SimilarityService.ts  ← services/ に配置
```

REPOSITORY_CONSTITUTION_V1.md（Service Layer出力7）:
```
infrastructure/
  SimilarityService  ← infrastructure/ にも記載
```

**矛盾:**
SimilarityServiceが ARCHITECTURE では Core Domain、
CONSTITUTION では services/ と infrastructure/ の両方に現れる。

**影響:**
実装者がSimilarityServiceをどのディレクトリに置くか混乱する。

**修正方法:**
```
確定配置: services/SimilarityService.ts
  理由: バッチ実行・DB操作を行うため infrastructure 層ではなく Service 層が適切
  Similarity計算のビジネスロジック（重み付け等）は domains/case/ に配置可
```

**修正対象ファイル:**
- docs/REPOSITORY_CONSTITUTION_V1.md（出力7 Service Layer の infrastructure 記載を services/ に統一）

---

## [M-003] Consent Level 4 の扱いが文書間で不統一

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 1041-1043）:
```
[I-4] Consent Level 4の扱いを決める
  Level 3止まりにするか、EU特別フローを設計するか。（未決定）
```

SCHEMA_V1.md（consents テーブル）:
```
level  smallint  NOT NULL DEFAULT 0  CHECK (level BETWEEN 0 AND 4)
← Level 4 をDBレベルで受け入れる設計
```

REPOSITORY_CONSTITUTION_V1.md（出力8 Consent Level定義）:
```
Level 4: 使用しない（EU では consent_type='COMMERCIAL' の GDPR整合性が不明確）
← Level 4 を明示的に使用しないと宣言
```

**影響:**
DBはLevel 4を格納できるが、Constitutionは使用しないと言っている。
アプリ層が誤ってLevel 4を書き込んだ場合に防御できない。

**修正方法:**
```
確定: Level 4 は使用しない
  SCHEMA_V1 の CHECK を CHECK (level BETWEEN 0 AND 3) に変更
  DOMAIN_MODEL_V1 の [I-4] を「Level 4は使用しない」と決定済みに更新
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（consents テーブルの CHECK 制約）
- docs/DOMAIN_MODEL_V1.md（[I-4] を決定済みに更新）

---

## [M-004] Outcome生成をトリガーできる実験状態が DOMAIN_MODEL と SCHEMA で異なる

**発見した矛盾:**

DOMAIN_MODEL_V1.md（line 375）:
```
OutcomeはExperimentがCOMPLETEDまたはABANDONED後に生成できる
```

SCHEMA_V1.md（CONSTITUTION 状態遷移）:
```
ACTIVE → COMPLETED: event_type = 'COMPLETED', payload = {actual_end_date, outcome_id}
ACTIVE → ABANDONED: event_type = 'ABANDONED', payload = {reason, days_completed}
← ABONDANEDからのOutcome生成については payload に outcome_id がない
```

**矛盾:**
COMPLETEDイベントのpayloadには `outcome_id` があるが、
ABNADONEDイベントのpayloadには `outcome_id` がない。
ABONDANEDからOutcomeを生成する場合、どこで outcome_id を記録するか不明。

**修正方法:**
```
ABANDONED payload を修正:
  {reason, days_completed, outcome_id: null | uuid}
  ← Outcome生成後にoutcome_idが埋まる

  または: ABONDANEDからのOutcome生成は別イベント OUTCOME_GENERATED で記録する
```

**修正対象ファイル:**
- docs/SCHEMA_V1.md（experiment_events の ABANDONED payload コメント）

---

# ACCEPTED — 意図的な設計差異

---

## [A-001] ARCHITECTURE が「12テーブル」、SCHEMA が「23テーブル」

**内容:**
ARCHITECTURE_V3.md は設計段階の概念図として12テーブルを示した。
SCHEMA_V1.md は詳細設計として23テーブル（Audit/Infrastructure 8テーブル追加）を定義した。

**判断: Accepted**
SchemaはArchitectureを精緻化したもの。追加テーブルは設計変更ではなく詳細化。
23テーブルが正。ARCHITECTURE_V3は概念図として維持。

---

## [A-002] ARCHITECTURE の record/save.js 参照と CONSTITUTION の新ディレクトリ構成の齟齬

**内容:**
ARCHITECTURE_V3.md は現行コードの `record/save.js` を参照している（Strangler Planの文脈）。
REPOSITORY_CONSTITUTION_V1.md は新ディレクトリ構成（services/repositories/domains/）を定義している。

**判断: Accepted**
ARCHITECTURE_V3は移行計画（現在→未来）を示したもの。
CONSTITUTION は未来の最終形を示したもの。
移行期間中は両方が存在する。legacy-bridge.ts で接続。

---

# 修正タスク一覧（優先順）

```
今すぐ修正（Critical 3件）:
  □ [C-001] Quality Score配点を統一する（Founder Decision: A or B）
  □ [C-002] Tier2/Tier1のcoverage条件をARCHITECTURE/SCHEMAに追記
  □ [C-003] diseaseTagMultiplierの定義をSCHEMAに正確に反映

実装前に修正（High 4件）:
  □ [H-001] Tier2のConsent Level 1要件を全文書に追記
  □ [H-002] PAUSED/RESUMEDの扱いを決定（追加 or 削除）
  □ [H-003] ABONDANEDからのOutcome生成7日ルールをSCHEMA/ARCHに追記
  □ [H-004] DOMAIN_MODEL内部のTier2 Consent Level記載を統一

Phase A中に修正（Medium 4件）:
  □ [M-001] experimentQualityサブ計算式をSCHEMAコメントに追記
  □ [M-002] SimilarityServiceの配置をservices/に統一
  □ [M-003] Consent Level 4の CHECK制約を0-3に修正
  □ [M-004] ABONDANEDイベントpayloadにoutcome_id追加
```

---

# 完了条件の確認

```
Critical = 0 になる条件:
  □ C-001: Founder が Quality Score 配点（A or B）を決定し、3文書が統一された
  □ C-002: Tier2/Tier1 coverage条件が ARCHITECTURE/SCHEMA/CONSTITUTION に追記された
  □ C-003: diseaseTagMultiplier が SCHEMA のコメントで正確に定義された

High = 0 になる条件:
  □ H-001: Tier2のConsent Level 1が全文書の昇格条件に記載された
  □ H-002: PAUSED/RESUMEDの扱いが決定し、experiment_eventsのevent_typeが確定した
  □ H-003: 7日ルールがSCHEMAとARCHITECTUREに追記された
  □ H-004: DOMAIN_MODELのTier2詳細条件にConsent Level 1が追記された
```

---

*CONSTITUTION_AUDIT_V1.md — Version 1.0 — Constitution Audit Council*
*次アクション: Critical 3件・High 4件の修正 → 監査再実施 → 全件Accepted/Mediumになったら Phase 5 開始*
