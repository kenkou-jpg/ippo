# CONSTITUTION_RECONCILIATION_V1.md
## IPPO EVOLUTION PROGRAM — Phase 4.76: Constitution Reconciliation

Version: 1.0
Generated: 2026-06-24
Authority: Constitution Reconciliation Council (9名)
効力: **本文書はPhase 5以降のすべての実装・設計の上位憲法である**
     矛盾が生じた場合、本文書を正とする。

Founder Fixed Decisions:
  FD-001: Quality Score 配点確定
  FD-002: Tier Definition 確定

---

> この文書は設計を追加しない。矛盾を除去し、唯一の正を確立する。

---

# 出力1: CONSTITUTION CONFLICT MATRIX

## 全矛盾一覧（監査後・FD反映済み）

| ID | 分類 | 概要 | 影響文書 | 状態 |
|----|------|------|---------|------|
| CF-001 | **Critical** | Quality Score 配点が全文書で不一致 (FD-001で解決) | DOMAIN / ARCHITECTURE / SCHEMA / CONSTITUTION | → FD-001 採択 |
| CF-002 | **Critical** | Tier2/Tier1 のcoverage条件がARCHITECTURE/SCHEMAに欠落 (FD-002で解決) | ARCHITECTURE / SCHEMA | → FD-002 採択 |
| CF-003 | **Critical** | diseaseTagMultiplier の概念・数値が文書間で齟齬 | DOMAIN / SCHEMA | → 本文書で廃止・置換 |
| CF-004 | **High** | Tier2のConsent Level 1要件が DOMAIN_MODEL 詳細条件に欠落 | DOMAIN | → FD-002 採択 |
| CF-005 | **High** | Tier3のConsent Level 1要件を DOMAIN_MODEL は要求・FD-002は不要 | DOMAIN / ARCHITECTURE | → FD-002 採択（Tier3はConsent不要） |
| CF-006 | **High** | experiment_events に PAUSED/RESUMED が存在するが実験状態機械に PAUSED なし | SCHEMA / CONSTITUTION | → PAUSED/RESUMED を削除 |
| CF-007 | **High** | ABANDONED後のOutcome生成7日ルールがDOMAIN_MODELにのみ存在 | DOMAIN / ARCHITECTURE / SCHEMA | → 本文書で確定 |
| CF-008 | **Medium** | experimentQuality サブ計算式がSCHEMAに欠落 (FD-001で廃止) | DOMAIN / SCHEMA | → FD-001で無効化（新配点にexpQは独立項なし） |
| CF-009 | **Medium** | SimilarityService の配置がCONSTITUTIONで二重記載 | CONSTITUTION | → services/ に統一 |
| CF-010 | **Medium** | Consent Level 4 のCHECK制約がSCHEMAで0-4だがCONSTITUTIONでは使用しない | SCHEMA / CONSTITUTION | → CHECK (level BETWEEN 0 AND 3) |
| CF-011 | **Medium** | ABONDANEDイベントpayloadにoutcome_idが未記載 | SCHEMA | → payload定義を更新 |
| CF-012 | **Low** | DOMAIN_MODEL の Tier3 サマリー表とライフサイクル図で Consent Level 記載が不一致 | DOMAIN | → FD-002 採択で自動解決 |
| CF-013 | **Low** | ARCHITECTURE の case_similarity テーブルと SCHEMA の similarity_edges テーブルで名称が異なる | ARCHITECTURE / SCHEMA | → similarity_edges に統一 |

---

# 出力2: CANONICAL TRUTH TABLE（唯一の正）

## 各概念の権威文書

```
┌─────────────────────────────────────┬─────────────────────────────────┐
│ 概念                                 │ 権威（唯一の正）                │
├─────────────────────────────────────┼─────────────────────────────────┤
│ Mission / Vision                     │ Founder Strategy（口頭決定）    │
│ Domain定義（Case/Experiment等）       │ DOMAIN_MODEL_V1.md              │
│ ドメイン境界・依存方向               │ ARCHITECTURE_V3.md              │
│ Tier定義（FD-002で確定）             │ 本文書（RECONCILIATION）        │
│ Quality Score配点（FD-001で確定）    │ 本文書（RECONCILIATION）        │
│ Case Quality Score計算式             │ 本文書（RECONCILIATION）        │
│ Outcome Quality Score計算式          │ DOMAIN_MODEL_V1.md §Outcome QS │
│ テーブル定義・カラム定義             │ SCHEMA_V1.md（本文書で補正後）  │
│ Consent Level定義                    │ DOMAIN_MODEL_V1.md §Consent     │
│ Consent Type定義                     │ SCHEMA_V1.md §Consent Schema   │
│ Case Status enum                     │ DOMAIN_MODEL_V1.md §Case Life  │
│ Experiment Status enum               │ SCHEMA_V1.md（PAUSED削除後）    │
│ Experiment Event Types               │ 本文書（PAUSED/RESUMED削除後）  │
│ Disease Key / Prefix                 │ SCHEMA_V1.md §disease_definitions│
│ Symptom Key                          │ SCHEMA_V1.md §symptoms          │
│ Event Names (EventTypes)             │ REPOSITORY_CONSTITUTION §Event  │
│ ディレクトリ構成                     │ REPOSITORY_CONSTITUTION §Output8│
│ 禁止依存ルール                       │ REPOSITORY_CONSTITUTION §Output2│
│ Service責務                          │ REPOSITORY_CONSTITUTION §Output7│
│ SSOT責任者                           │ REPOSITORY_CONSTITUTION §Output4│
│ RLS設計                              │ SCHEMA_V1.md §Output11          │
│ Migration順序                        │ SCHEMA_V1.md §Output13          │
│ Founder Critical Decisions           │ 本文書 §Canonical Decisions     │
└─────────────────────────────────────┴─────────────────────────────────┘
```

---

# 出力3: RECONCILIATION DECISIONS（調停決定）

## [RD-001] Quality Score 配点 — FD-001 採択

**採択内容:**

```
Case Quality Score (0-100) 確定版:

  Coverage Score   × 0.30  (max 30)
  Duration Score   × 0.30  (max 30)
  Completeness Score × 0.15 (max 15)
  Outcome Score    × 0.15  (max 15)
  Consent Score    × 0.10  (max 10)
  ─────────────────────────────────
  合計              1.00   (max 100)

diseaseTagMultiplier: 廃止
  理由: FD-002でdiseaseTagの有無がTier昇格の前提条件として独立した。
       配点の補正係数として持つ必要がなくなった。
       multiplierなしで100点満点とする。
```

**各スコアの計算基準:**

```
① Coverage Score (max 30):
  coverage_rate = 記録日数 / (caseEndDate - caseStartDate).days
  coverage >= 0.85 → 30
  coverage >= 0.70 → 23
  coverage >= 0.60 → 18
  coverage >= 0.40 → 10
  coverage < 0.40  →  0

② Duration Score (max 30):
  days_recorded >= 360 → 30
  days_recorded >= 180 → 25
  days_recorded >= 90  → 18
  days_recorded >= 30  → 10
  days_recorded < 30   →  0

③ Completeness Score (max 15):
  avg_fields_filled = 平均記録項目充足率 (pain_level, energy, sleep_quality 等)
  completeness >= 0.90 → 15
  completeness >= 0.70 → 11
  completeness >= 0.50 →  8
  completeness < 0.50  →  4

④ Outcome Score (max 15):
  0件Outcome → 0
  1件 (IMPROVED/WORSENED/NO_CHANGE) → 8 + (outcomeQuality × 0.07)
  2件以上 → 12 + (avgOutcomeQuality × 0.03)
  Max 15

⑤ Consent Score (max 10):
  Level 0 → 0
  Level 1 → 4
  Level 2 → 7
  Level 3 → 10
```

**却下内容:**
- DOMAIN_MODEL の旧配点（experimentQuality独立項、old weights）→ 廃止
- SCHEMA の旧 case_quality_scores コメント（旧max値）→ 更新
- diseaseTagMultiplier（全文書から除去）→ 廃止

---

## [RD-002] Tier Definition — FD-002 採択

**採択内容（唯一の正）:**

```
┌────────────┬──────────┬───────────┬──────────┬────────────┬───────────┬───────────────┐
│ Tier       │ Quality  │ Duration  │ Coverage │ Disease    │ Experiment│ Consent       │
│            │ Score    │           │          │ Tag        │ (完了)    │ Level         │
├────────────┼──────────┼───────────┼──────────┼────────────┼───────────┼───────────────┤
│ CANDIDATE  │ (計算前) │ 30日以上  │ 60%以上  │ 1件以上    │ 不要      │ 不要          │
│ TIER3      │ ≥ 30     │ 30日以上  │ 60%以上  │ 1件以上    │ 不要      │ 不要(※1)     │
│ TIER2      │ ≥ 55     │ 90日以上  │ 70%以上  │ 1件以上    │ 1件以上   │ Level 1以上   │
│ TIER1      │ ≥ 75     │ 180日以上 │ 80%以上  │ 1件以上    │ 2件以上   │ Level 2以上   │
└────────────┴──────────┴───────────┴──────────┴────────────┴───────────┴───────────────┘

※1 Tier3はユーザー承認（Case登録申請）のみ必要。Consentは不要。
   Tier3のCaseは「内部分析のみ」。PRO検索対象外。

Tier2/1のExperiment条件:
  「完了」= experiments.status = 'COMPLETED' かつ outcomes レコードが存在すること
  「Outcome必須」= Tier2以上はoutcome_idを持つexperimentが存在すること

Tier昇格トリガー:
  CANDIDATE → TIER3: ユーザーが「Case登録申請」を行ったとき（Consent不要）
  TIER3 → TIER2:    バッチ評価 または Outcome生成時
  TIER2 → TIER1:    バッチ評価 または Consent Level 2取得時

Tier降格: なし（DOMAIN_MODELの決定を維持）
```

**却下内容:**
- DOMAIN_MODEL の Tier3「Consent Level 1以上」要件 → 廃止
- ARCHITECTURE_V3 の「CANDIDATE→TIER3にConsent Level 1」 → 削除
- DOMAIN_MODEL の coverage 要件なしTier2 → 廃止

---

## [RD-003] PAUSED/RESUMED 実験状態 — 削除決定

**採択内容:**

```
experiments.status の有効値:
  'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  ← PAUSED は追加しない

experiment_events.event_type の有効値:
  'CREATED' | 'STARTED' | 'COMPLETED' | 'ABANDONED' | 'CONFIG_CHANGED'
  ← PAUSED / RESUMED を削除
```

**理由:**
- 一時停止中のExperimentに対してRecordが記録された場合の扱いが未定義
- Before/After期間計算が複雑化する
- 「一時停止」ニーズはABANDONED後に新規Experimentを開始することで代替可能
- Phase E以降で必要性が生じた場合に追加する（現時点ではスコープ外）

**却下内容:**
- SCHEMA_V1 の PAUSED/RESUMED event_type → 削除

---

## [RD-004] ABANDONED後のOutcome生成 — 7日ルール採択

**採択内容:**

```
Outcome生成の前提条件:
  COMPLETED後: 即座に生成可能
  ABANDONED後: actual_end_at から 7日以上経過後にのみ生成可能
               （after期間として最低7日のRecordを確保するため）

OutcomeService.generateOutcome() の実装ルール:
  - experiments.status = 'COMPLETED' → 即時生成可
  - experiments.status = 'ABANDONED' かつ
    (now() - experiments.actual_end_at) >= 7 days → 生成可
  - 上記以外 → エラーを返す

ABONDANEDイベントのpayload:
  {reason: string, days_completed: number, outcome_id: uuid | null}
  ← outcome_idはOutcome生成後にnullから更新（experiments.outcome_idを更新）
```

---

## [RD-005] diseaseTagMultiplier — 廃止

**採択内容:**
FD-001の新配点式にdiseaseTagMultiplierは存在しない。
代わりにdisease tagの有無はTier昇格の前提条件として扱う（FD-002）。

```
case_quality_scores テーブルの変更:
  削除: disease_tag_multiplier カラム
  理由: FD-001配点式に不要

Quality Score計算の変更:
  削除: ) × diseaseTagMultiplier の乗算
  理由: FD-001配点式はdisease tagを考慮しない（Tier条件として分離）
```

---

## [RD-006] Consent Level 4 — 使用しない（SCHEMA制約更新）

**採択内容:**

```
consents.level の制約:
  旧: CHECK (level BETWEEN 0 AND 4)
  新: CHECK (level BETWEEN 0 AND 3)

理由: Level 4は法的・実装的に意味が未確定。DBで受け入れない。
```

---

## [RD-007] SimilarityService 配置 — services/ に統一

**採択内容:**

```
配置: src/services/SimilarityService.ts
理由: バッチ実行・DB操作・ビジネスロジック（重み付け）を含むため
     infrastructure/ ではなく service/ が適切
```

---

## [RD-008] テーブル名統一 — similarity_edges に確定

**採択内容:**

```
ARCHITECTURE_V3 の「case_similarity」テーブル名は誤り
SCHEMA_V1 の「similarity_edges」に統一する
理由: エッジ（グラフの辺）という構造を明示的に表現するSCHEMA側が適切
```

---

# 出力4: AMENDMENT PLAN（修正計画）

## docs/DOMAIN_MODEL_V1.md への修正

```
修正1: Case Quality Score 配点（§Case Quality Score）
  対象行: line 595-663
  修正内容: RD-001の新配点式に全面置換
    旧: recordVolume×0.25 + recordDensity×0.20 + dataCompleteness×0.20
        + experimentQuality×0.20 + outcomeQuality×0.10 + consentLevel×0.05
    新: Coverage×0.30 + Duration×0.30 + Completeness×0.15
        + Outcome×0.15 + Consent×0.10
    diseaseTagMultiplier 削除

修正2: Tier閾値サマリー表（line 669-673）
  対象行: line 671-673
  修正内容: FD-002に統一
    旧: Tier 3 = Consent Level 1以上
    新: Tier 3 = Consent Level 不要
    追加: coverage条件を各Tier行に明記

修正3: Tierライフサイクル図（line 546-577）
  対象行: line 548, 553, 558, 563
  修正内容:
    line 553: 「ユーザー承認 + Consent Level 1」→「ユーザー承認のみ」
    line 558: 「90日/70%/実験1件完了」→「90日/70%/実験完了1件/Outcome必須/Consent Level1」
    line 563: 「180日/80%/実験2件/Consent Level 2」→「180日/80%/実験完了2件/Outcome必須/Consent Level2」

修正4: [I-2] Quality Score重み付け（line 1035付近）
  修正内容: 「未決定」→「FD-001にて確定」と更新

修正5: [I-4] Consent Level 4（line 1041付近）
  修正内容: 「未決定」→「Level 4は使用しない。CHECK (BETWEEN 0 AND 3)」と更新

修正6: Case Quality Score閾値確定表（line 1072-1078）
  修正内容: FD-001/FD-002の内容に全面更新
```

## docs/ARCHITECTURE_V3.md への修正

```
修正1: Case Tier昇格条件テーブル（§出力5 Case Generation Architecture）
  対象行: line 838-841 付近
  修正内容:
    CANDIDATE → TIER3: Consent Level 1 を削除（FD-002）
    TIER3 → TIER2: coverage≥70% と Consent Level 1 を追加（FD-002）
    TIER2 → TIER1: coverage≥80% を追加（FD-002）

修正2: case_similarityテーブル名（§出力4 Data Architecture）
  対象行: テーブル定義部
  修正内容: 「case_similarity」→「similarity_edges」に統一（RD-008）

修正3: RLSポリシー（§Case cases テーブル）
  対象行: line 684-687
  修正内容: TIER2の条件にcoverage≥70%の記述を追記（コメント）

修正4: Quality Score コメント（§出力1 Current Architecture Review）
  修正内容: FD-001の新配点式を参照するよう更新
```

## docs/SCHEMA_V1.md への修正

```
修正1: case_quality_scores テーブル定義（§出力14）
  対象行: case_quality_scores CREATE TABLE
  修正内容:
    削除: disease_tag_multiplier カラム（RD-005）
    修正: record_volume_score → duration_score (max 30)
    修正: record_density_score → coverage_score (max 30)
    修正: data_completeness_score → completeness_score (max 15) ← max変更なし
    修正: experiment_quality_score → 廃止（FD-001に独立項なし）
    修正: outcome_quality_score → outcome_score (max 15)
    修正: consent_score → consent_score (max 10) ← max変更

    新定義:
      duration_score          numeric(5,2)  -- max 30
      coverage_score          numeric(5,2)  -- max 30
      completeness_score      numeric(5,2)  -- max 15
      outcome_score           numeric(5,2)  -- max 15
      consent_score           numeric(5,2)  -- max 10
      total_score             numeric(5,2)  -- max 100

修正2: Case Tier定義（§出力7 CASE SCHEMA）
  修正内容: FD-002に準拠
    Tier3: coverage≥60%（Consent Level不要）を明記
    Tier2: coverage≥70% + Consent Level 1 + Outcome必須 を追加
    Tier1: coverage≥80% + Outcome必須 を追加

修正3: consents テーブルの CHECK制約（§出力8 CONSENT SCHEMA）
  対象行: level カラムのCHECK
  修正内容:
    旧: CHECK (level BETWEEN 0 AND 4)
    新: CHECK (level BETWEEN 0 AND 3)

修正4: experiment_events テーブルのevent_type（§出力5 EXPERIMENT SCHEMA）
  対象行: event_type の選択肢コメント
  修正内容: 'PAUSED'|'RESUMED' を削除
    新: 'CREATED'|'STARTED'|'COMPLETED'|'ABANDONED'|'CONFIG_CHANGED'

修正5: ABANDONED payload定義（§出力5 EXPERIMENT SCHEMA）
  対象行: payload コメントのABANDONED行
  修正内容:
    旧: {reason, days_completed}
    新: {reason, days_completed, outcome_id: null}  ← Outcome生成後にセット

修正6: SimilarityService 配置（§出力11 RLS DESIGN 周辺）
  修正内容: RD-007に準拠（services/に明記）

修正7: Outcome生成条件（§出力6 OUTCOME SCHEMA）
  修正内容: 7日ルールの明記（RD-004）
```

## docs/REPOSITORY_CONSTITUTION_V1.md への修正

```
修正1: SimilarityService 配置（§出力7 Service Layer Constitution）
  対象行: infrastructure/ への記載
  修正内容: services/SimilarityService.ts に統一（RD-007）

修正2: Quality Score 配点（§I-3 Founder Decision）
  修正内容: FD-001の確定値に更新

修正3: Tier閾値（§I-2 Founder Decision）
  修正内容: FD-002の確定値に更新

修正4: Consent Level CHECK（§C-03 Critical Decision）
  修正内容: Level 3止まりに更新（CHECK 0 AND 3）

修正5: PRレビューチェックリスト（§出力11）
  追加項目:
    [ ] 新: PAUSED/RESUMED が experiment_events に含まれていないか
    [ ] 新: case_quality_scores に disease_tag_multiplier カラムがないか
    [ ] 新: Tier3昇格条件に Consent Level が含まれていないか（不要）
    [ ] 新: Tier2昇格条件に coverage≥70% が含まれているか
```

---

# 出力5: FINAL CONSTITUTIONAL STATUS

## 調停後の矛盾件数

| 重要度 | 調停前 | 調停後 | 残存 |
|--------|--------|--------|------|
| Critical | 3 | 3解決 | **0** |
| High | 4 | 4解決 | **0** |
| Medium | 4 | 4解決 | **0** |
| Low | 2 | 2解決 | **0** |
| **合計** | **13** | **13解決** | **0** |

---

# CANONICAL DEFINITIONS（全実装の唯一の正）

## Tier Definition（確定版）

```
CANDIDATE 昇格条件:
  ✓ disease_keys に 1件以上の疾患タグ
  ✓ record_days >= 30
  ✓ coverage_rate >= 0.60
  → ユーザーへ通知。Case登録申請を促す。

TIER3 昇格条件:
  ✓ CANDIDATE条件を満たすこと
  ✓ quality_score >= 30
  ✓ ユーザーが Case登録申請を完了すること
  ✗ Consent Level は不要（ユーザー承認のみ）
  → 内部分析のみ。PRO検索対象外。

TIER2 昇格条件:
  ✓ quality_score >= 55
  ✓ record_days >= 90
  ✓ coverage_rate >= 0.70
  ✓ disease_keys に 1件以上
  ✓ completed_experiments >= 1 (status='COMPLETED' かつ outcome存在)
  ✓ consent_level >= 1
  → PRO検索対象（匿名）。

TIER1 昇格条件:
  ✓ quality_score >= 75
  ✓ record_days >= 180
  ✓ coverage_rate >= 0.80
  ✓ disease_keys に 1件以上
  ✓ completed_experiments >= 2 (status='COMPLETED' かつ outcome存在)
  ✓ consent_level >= 2
  → 研究利用対象。

Tier降格: なし（一度達成したTierは維持する）
```

## Quality Score（確定版）

```
Case Quality Score = 
  Coverage Score   (max 30) +
  Duration Score   (max 30) +
  Completeness Score (max 15) +
  Outcome Score    (max 15) +
  Consent Score    (max 10)
= 100点満点

diseaseTagMultiplier: 廃止（Tier条件として分離）

Coverage Score (max 30):
  coverage_rate >= 0.85 → 30
  coverage_rate >= 0.70 → 23
  coverage_rate >= 0.60 → 18
  coverage_rate >= 0.40 → 10
  coverage_rate < 0.40  →  0
  ※ coverage_rate = 実記録日数 / case期間日数

Duration Score (max 30):
  days_recorded >= 360 → 30
  days_recorded >= 180 → 25
  days_recorded >= 90  → 18
  days_recorded >= 30  → 10
  days_recorded < 30   →  0

Completeness Score (max 15):
  avg_field_fill_rate >= 0.90 → 15
  avg_field_fill_rate >= 0.70 → 11
  avg_field_fill_rate >= 0.50 →  8
  avg_field_fill_rate < 0.50  →  4
  ※ 対象フィールド: pain_level, energy, sleep_quality, wellness_score

Outcome Score (max 15):
  Outcomeなし → 0
  1件 (COMPLETED experiment + outcome) → 8 + min(outcomeQuality×0.07, 7)
  2件以上 → 12 + min(avgOutcomeQuality×0.03, 3)

  ※ Outcome Quality (0-100) は DOMAIN_MODEL_V1 §Outcome Quality Score の計算式
     sampleSizeScore×0.30 + coverageScore×0.25 + singleFactorScore×0.20
     + confoundersScore×0.15 + hypothesisScore×0.10

Consent Score (max 10):
  Level 0 → 0
  Level 1 → 4
  Level 2 → 7
  Level 3 → 10
```

## Consent Level（確定版）

```
Level 0: 未同意（Default）
  → Case登録不可、PRO検索対象外

Level 1: Platform利用 + Case匿名公開
  → TIER3昇格: 不要（ユーザー承認のみ）
  → TIER2昇格: 必須
  → 用途: PRO検索表示、ippo内アルゴリズム改善

Level 2: 研究利用同意
  → TIER1昇格: 必須
  → 用途: 大学研究提供（匿名化Stage2必須）、疫学研究

Level 3: 商業/製薬利用同意
  → TIER1 + 研究契約 + IRB: 必須
  → 用途: Pharmaライセンス（匿名化Stage2必須、契約必須）

Level 4: 使用しない（DB制約: CHECK (level BETWEEN 0 AND 3)）
```

## Experiment Status（確定版）

```
有効ステータス: DRAFT | ACTIVE | COMPLETED | ABANDONED
有効イベント: CREATED | STARTED | COMPLETED | ABANDONED | CONFIG_CHANGED
廃止: PAUSED | RESUMED

状態遷移:
  DRAFT ─start()──→ ACTIVE ─complete()──→ COMPLETED
    │                  │
    └─delete()→(soft)  └─abandon()──→ ABANDONED

Outcome生成ルール:
  COMPLETED → 即時生成可
  ABANDONED → actual_end_at + 7日後から生成可
```

## Case Quality Score テーブル定義（確定版）

```sql
CREATE TABLE public.case_quality_scores (
  case_id               text    PRIMARY KEY REFERENCES cases(id),

  -- Composite Score
  total_score           numeric(5,2) NOT NULL,  -- 0-100

  -- Component Scores (FD-001確定版)
  coverage_score        numeric(5,2),  -- max 30
  duration_score        numeric(5,2),  -- max 30
  completeness_score    numeric(5,2),  -- max 15
  outcome_score         numeric(5,2),  -- max 15
  consent_score         numeric(5,2),  -- max 10

  -- Detail (計算根拠の保存)
  total_record_days     integer,
  coverage_rate         numeric(4,3),
  completed_experiments smallint,
  avg_outcome_quality   numeric(5,2),

  -- Versioning
  version               smallint    NOT NULL DEFAULT 1,
  calculated_at         timestamptz NOT NULL DEFAULT now()
);
```

## Case Status enum（確定版）

```
有効ステータス:
  PRE_CANDIDATE   記録はあるが条件未充足
  CANDIDATE       条件充足、ユーザーへ通知済み
  TIER3           内部分析対象
  TIER2           PRO検索対象（Consent Level 1以上）
  TIER1           研究利用対象（Consent Level 2以上）
  SUSPENDED       管理者調査中
  CONSENT_WITHDRAWN  同意撤回（検索対象外、データ保持）
  INVALIDATED     疾患タグ全削除により無効
  ARCHIVED        アカウント削除

is_public の真偽:
  true  = tier IN ('TIER2','TIER1') AND consent_level >= 1
  false = 上記以外すべて
```

## Similarity Table Name（確定版）

```
正式名称: similarity_edges （SCHEMA_V1 に準拠）
廃止: case_similarity （ARCHITECTURE_V3 での旧表記）
```

---

# IMPLEMENTATION CHECKLIST FOR PHASE 5

Phase 5 実装開始前に以下を確認すること。

```
文書整合確認:
  □ DOMAIN_MODEL_V1.md の Quality Score を FD-001 に更新済み
  □ DOMAIN_MODEL_V1.md の Tier定義を FD-002 に更新済み（Tier3 Consent削除）
  □ ARCHITECTURE_V3.md の Tier昇格条件を FD-002 に更新済み（coverage追加）
  □ SCHEMA_V1.md の case_quality_scores テーブルを FD-001 に更新済み（カラム変更）
  □ SCHEMA_V1.md の consents.level CHECK を (0 AND 3) に更新済み
  □ SCHEMA_V1.md の experiment_events から PAUSED/RESUMED を削除済み
  □ REPOSITORY_CONSTITUTION_V1.md の SimilarityService 配置を統一済み

実装開始条件:
  □ Critical = 0 ← 本文書で達成
  □ High = 0     ← 本文書で達成
  □ 本文書（CONSTITUTION_RECONCILIATION_V1）が全エンジニアに共有済み
  □ Tier定義が全実装者に口頭でも確認済み
  □ Quality Score 計算式が domains/case/quality-score.ts に実装済み（Phase A開始時）
```

---

*CONSTITUTION_RECONCILIATION_V1.md — Version 1.0 — Constitution Reconciliation Council承認*
*本文書はPhase 5, 6, 7以降のすべての設計・実装の上位憲法である*
*本文書と他文書が矛盾する場合、本文書を正とする*
