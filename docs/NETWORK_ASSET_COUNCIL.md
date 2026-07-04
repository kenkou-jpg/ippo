# NETWORK ASSET COUNCIL
## ネットワーク資産設計 Council 議事録・設計基準文書

---

> **参照権威:** IPPO-GOV-001 (LEGACY ASSET INVENTORY COUNCIL) Section 9
>
> 本 Council は IPPO-GOV-001 Section 9「Impact on Network Asset Council」に記載された
> 4つの設計命令を実行するために召集された。
> 本文書の決定は IPPO-GOV-001 への Level-2 改訂（v1.1 → v1.2）として記録される。

---

**文書番号:** IPPO-COUNCIL-002
**開催日:** 2026-06-26
**前提文書:** IPPO-GOV-001 v1.1（LEGACY ASSET INVENTORY COUNCIL）
**承認:** Founder
**次回:** DATA ASSET COUNCIL

---

## Section 1. Council 招集根拠

IPPO-GOV-001 Section 9 は NETWORK ASSET COUNCIL に以下を命じた:

| 命令番号 | 設計命令 |
|---|---|
| NAC-01 | **Signal Schema** — 6種シグナルを統一スキーマで表現 |
| NAC-02 | **Edge Attribute Layer** — ノード間エッジにシグナル属性を付与 |
| NAC-03 | **Disease Cluster** — 疾患グループ内シグナルパターン比較 |
| NAC-04 | **Longitudinal Signal** — 時系列シグナル変化率をエッジ重みに反映 |

追加で本 Council は以下を判断する:

| 判断事項 | 理由 |
|---|---|
| Wave1 Network 安定化規則 | PR-028〜029 完了による Network 境界の明確化が必要 |
| FeatureVector バージョニング | Wave2 拡張に備えた後方互換設計が必要 |
| PR-030 スコープ定義 | Record Input（feat/phase4d-batch1-record-input）の Signal 収集要件の確定 |

---

## Section 2. 現状分析

### 2-A. 現行 SimilarityEngine（Wave1）

```
FeatureVector [8次元] — VectorBuilder.DIM

  DIM.QUALITY_SCORE     = qualityScore / 100
  DIM.DURATION_DAYS     = durationDays / 365 (clamped)
  DIM.HAS_OUTCOME       = 1 | 0
  DIM.EXPERIMENT_COUNT  = experimentCount / 10 (clamped)
  DIM.RECORD_COUNT      = recordCount / 365 (clamped)
  DIM.CONSENT_LEVEL     = consentLevel / 3
  DIM.SYMPTOM_COUNT     = symptoms.length / 20 (clamped)
  DIM.FOOD_COUNT        = foods.length / 20 (clamped)

Edge生成条件:
  score >= 0.5 AND sameDiseaseKey

Edge スキーマ:
  edgeId / sourceCaseId / targetCaseId / score / diseaseKey / threshold / createdAt
```

### 2-B. 現行の課題

| 課題 | 内容 |
|---|---|
| Signal が個数のみ | SYMPTOM_COUNT は症状の個数であり、種類・重度・パターンを無視 |
| FOOD_COUNT が粗い | 食事種別・介入性が未反映 |
| Phase 情報なし | 月経周期フェーズがベクター・エッジに存在しない |
| 時系列なし | 縦断的変化（悪化・改善トレンド）がスコアに反映されない |
| Edge 属性が最小限 | どのシグナルが類似度を駆動したか不明 |
| バージョン識別なし | Wave2 で次元拡張した際に既存 Edge と区別できない |

### 2-C. 確定済みネットワーク構造（IPPO-GOV-001 Section 9）

```
Network の一次ノード: Case
Network のエッジ生成条件: Symptom × Disease × Outcome の類似度

Network の信号源 (Signal層) として確定した6資産:
  ├ Symptom     (一次シグナル)     ← PR-028 SymptomService 実装済
  ├ Pain        (定量シグナル)     ← Record.painLevel / painType 実装済
  ├ Menstrual   (周期シグナル)     ← disease_tag として部分実装
  ├ Emotion     (状態シグナル)     ← 未実装（Wave2 Signal層）
  ├ Sleep       (回復シグナル)     ← sleepBed/sleepWake として部分実装
  └ Exposure    (介入シグナル)     ← Record.foods[] として部分実装（BD-005準拠）
```

---

## Section 3. NAC-01 Signal Schema 設計

### 3-A. 決定: NetworkSignal 統一スキーマ

6種のシグナルをすべて表現できる統一スキーマを定義する。

```typescript
// Wave2 実装ターゲット（Wave1では参照のみ）

type SignalType =
  | 'SYMPTOM'     // 症状シグナル
  | 'PAIN'        // 痛みシグナル
  | 'MENSTRUAL'   // 月経周期シグナル
  | 'EMOTION'     // 感情シグナル（Wave2）
  | 'SLEEP'       // 睡眠・回復シグナル
  | 'EXPOSURE'    // 食事・介入シグナル（BD-005: Exposure Signalとして扱う）

type MenstrualPhase =
  | 'MENSTRUAL'   // 月経期（Day1〜5）
  | 'FOLLICULAR'  // 卵胞期（Day6〜12）
  | 'OVULATION'   // 排卵期（Day13〜16）
  | 'LUTEAL'      // 黄体期（Day17〜28）
  | 'UNKNOWN'

interface NetworkSignal {
  type:             SignalType
  normalizedValue:  number           // [0.0, 1.0] — すべてのシグナルを同一軸で比較
  rawValue:         number           // 元データ（非正規化）
  unit:             string           // 例: 'severity_0_10', 'count', 'hours', 'boolean'
  metadata:         SignalMetadata   // type別追加データ
  recordedAt:       string           // ISO8601
  menstrualPhase:   MenstrualPhase   // 記録時の月経フェーズ（判明している場合）
}

// type別メタデータ
type SignalMetadata =
  | SymptomSignalMetadata
  | PainSignalMetadata
  | MenstrualSignalMetadata
  | SleepSignalMetadata
  | ExposureSignalMetadata

interface SymptomSignalMetadata {
  category:    SymptomCategory      // IPPO-GOV-001 BD-006 / PR-028 SSOT
  severity:    number               // 0〜10
  duration:    number | null        // 時間（hours）
  location:    string | null
}

interface PainSignalMetadata {
  painType:    PainType             // PR-028 SSOT (Sharp/Dull/Cramping/...)
  painLevel:   number               // 0〜10
  location:    string | null
}

interface MenstrualSignalMetadata {
  cycleDay:    number | null
  flowLevel:   'NONE' | 'LIGHT' | 'MEDIUM' | 'HEAVY' | null
  hasClots:    boolean
}

interface SleepSignalMetadata {
  durationHours: number
  bedTime:       string | null      // ISO8601 time
  wakeTime:      string | null
}

interface ExposureSignalMetadata {
  exposureType:  'FOOD' | 'SUPPLEMENT' | 'FASTING' | 'OTHER'
  description:   string
}
```

### 3-B. Signal 正規化ルール

| SignalType | rawValue | normalizedValue 計算式 |
|---|---|---|
| SYMPTOM | severity (0〜10) | rawValue / 10 |
| PAIN | painLevel (0〜10) | rawValue / 10 |
| MENSTRUAL | flowLevel (0〜3) | rawValue / 3 |
| EMOTION | moodScore (0〜10) | rawValue / 10（Wave2） |
| SLEEP | durationHours (0〜12) | clamp(rawValue / 8, 0, 1)（8時間を最適値1.0とする） |
| EXPOSURE | count (0〜10) | clamp(rawValue / 5, 0, 1) |

### 3-C. Wave1 / Wave2 実装フェーズ

| SignalType | Wave1 状態 | Wave2 目標 |
|---|---|---|
| SYMPTOM | PR-028 構造化実装済（category/severity）| NetworkSignal スキーマへ移行 |
| PAIN | Record.painLevel/painType として部分実装 | NetworkSignal.PAIN として構造化 |
| MENSTRUAL | disease_tag として間接記録のみ | NetworkSignal.MENSTRUAL + MenstrualPhase付与 |
| EMOTION | 未実装 | Wave2 Signal層で実装 |
| SLEEP | sleepBed/sleepWake フィールドのみ | NetworkSignal.SLEEP として正規化 |
| EXPOSURE | foods[] 文字列配列のみ（BD-005）| NetworkSignal.EXPOSURE として再設計 |

---

## Section 4. NAC-02 Edge Attribute Layer 設計

### 4-A. 決定: FeatureVector バージョニング

Wave2 で FeatureVector の次元数が拡張される際、既存 Wave1 エッジと区別できるよう
バージョン識別子を定義する。

```
VECTOR_VERSION = '1'  (Wave1 — 8次元、現行)
VECTOR_VERSION = '2'  (Wave2 — 12〜14次元、拡張後)
```

**Wave1 即時対応（PR-030スコープ）:**
EdgeGenerator が生成するエッジに `vectorVersion: '1'` を追加する。
既存エッジへの遡及適用は不要（immutable audit trail / BD-001）。

### 4-B. 決定: Wave1 Edge スキーマ拡張

現行エッジスキーマに以下を追加する（後方互換 — 既存フィールドの変更なし）:

```javascript
// Wave1 Edge（PR-030で追加）
{
  edgeId:         string,   // 既存
  sourceCaseId:   string,   // 既存
  targetCaseId:   string,   // 既存
  score:          number,   // 既存
  diseaseKey:     string,   // 既存
  threshold:      number,   // 既存
  createdAt:      string,   // 既存

  // Wave1 追加（NAC-02）
  vectorVersion:  '1',      // FeatureVector バージョン識別子
}
```

### 4-C. 決定: Wave2 Edge スキーマ拡張（設計のみ、Wave2 実装）

```javascript
// Wave2 Edge（実装は Wave2 スコープ）
{
  // ... Wave1 フィールドすべて ...

  vectorVersion:   '2',

  // NAC-02: Signal Attribution
  signalProfile: {
    SYMPTOM:    number,   // このシグナルの類似度寄与率 [0,1]
    PAIN:       number,
    MENSTRUAL:  number,
    EMOTION:    number,   // Wave2以降
    SLEEP:      number,
    EXPOSURE:   number,
  },

  // NAC-02: Phase Context
  phaseContext: {
    sourceMenstrualPhase: MenstrualPhase,
    targetMenstrualPhase: MenstrualPhase,
    phaseMatch:           boolean,
  },

  // NAC-03: Disease Cluster
  diseaseClusterId: string,   // = diseaseKey（Wave1互換）

  // NAC-04: Longitudinal Context（Wave2）
  longitudinalContext: {
    sourceTrend:  'IMPROVING' | 'STABLE' | 'WORSENING' | 'UNKNOWN',
    targetTrend:  'IMPROVING' | 'STABLE' | 'WORSENING' | 'UNKNOWN',
    trendMatch:   boolean,
    trendBonus:   number,   // 0.0〜0.1 — 同トレンドへのスコアボーナス
  },
}
```

### 4-D. Wave2 FeatureVector 拡張設計（設計のみ）

現行 8次元 → Wave2 12次元:

```javascript
// Wave2 DIM（VECTOR_VERSION='2'）
export const DIM_V2 = Object.freeze({
  // Wave1 互換（次元インデックス維持）
  QUALITY_SCORE:         0,
  DURATION_DAYS:         1,
  HAS_OUTCOME:           2,
  EXPERIMENT_COUNT:      3,
  RECORD_COUNT:          4,
  CONSENT_LEVEL:         5,
  SYMPTOM_COUNT:         6,
  FOOD_COUNT:            7,   // → EXPOSURE_COUNT に意味変更

  // Wave2 追加
  PAIN_SCORE:            8,   // 平均痛みスコア / 10
  MENSTRUAL_REGULARITY:  9,   // 周期規則性スコア [0,1]
  SLEEP_SCORE:           10,  // 睡眠質スコア [0,1]
  LONGITUDINAL_DELTA:    11,  // トレンドスコア [-1,1] を [0,1] に変換
});

export const VECTOR_DIM_V2 = 12;
```

**制約:** Wave2 FeatureVector は Wave1 の次元 0〜7 と同一意味・同一正規化ルールを維持すること。
既存 Wave1 エッジとの混在時は `vectorVersion` で区別する。

---

## Section 5. NAC-03 Disease Cluster 設計

### 5-A. 決定: Disease Cluster 定義

Disease Cluster とは「同一 diseaseKey を持つ Case の集合」と定義する。

```
DiseaseClusterId = diseaseKey（Wave1では同一）
```

Wave2 で Disease Entity が昇格した後（IPPO-GOV-001 BD-004）は:

```
DiseaseClusterId = DiseaseEntity.id（例: "disease_endo_001"）
```

Wave1 ではクラスターは暗黙的（diseaseKey による分類）。
Wave2 では `DiseaseClusterService` として実体化する。

### 5-B. 設計: DiseaseClusterService（Wave2）

```javascript
// Wave2 実装ターゲット
class DiseaseClusterService {
  // クラスター内の Signal 統計を計算
  computeClusterProfile(clusterId) {
    return {
      clusterId,
      diseaseKey:   string,
      caseCount:    number,
      signalMeans: {
        SYMPTOM:    number,   // 平均症状重度 [0,1]
        PAIN:       number,   // 平均痛みスコア [0,1]
        MENSTRUAL:  number,   // 平均月経シグナル [0,1]
        SLEEP:      number,   // 平均睡眠スコア [0,1]
        EXPOSURE:   number,   // 平均介入シグナル [0,1]
      },
      signalPercentiles: {
        PAIN: { p25, p50, p75, p90 },
        // ...
      },
      dominantPhase:  MenstrualPhase,   // 最多記録フェーズ
      computedAt:     string,
    };
  }

  // 特定 Case がクラスター内で何パーセンタイルにいるか
  getCaseRankInCluster(caseId, clusterId) {
    return {
      percentile:   number,   // 0〜100
      signalRanks:  { [SignalType]: number },
    };
  }
}
```

### 5-C. Wave1 Disease Cluster 即時ルール

Wave1 では以下のみ: EdgeGenerator の `sameDiseaseKey` 判定が事実上のクラスタリング。
追加実装なし。

**BD-009（本 Council 追加）:** Disease Cluster ID は Wave2 Disease Entity 昇格まで `diseaseKey` 文字列と同一とする。
Wave2 移行時に `DiseaseClusterService` を実装し、クラスター統計を提供すること。

---

## Section 6. NAC-04 Longitudinal Signal 設計

### 6-A. 決定: Longitudinal Signal の定義

Longitudinal Signal とは「あるシグナルの30日間の移動平均と、その前30日比較による変化率」と定義する。

```
currentWindow:  最新30日間 (Day -30 〜 Day 0)
previousWindow: 前30日間  (Day -60 〜 Day -31)

delta = currentWindow.mean - previousWindow.mean

Trend:
  delta < -0.05 → IMPROVING   (シグナル値が改善方向に変化)
  delta > +0.05 → WORSENING   (シグナル値が悪化方向に変化)
  その他        → STABLE
```

### 6-B. Wave2 Trend ボーナス

Cosine Similarity スコアに対して、両 Case が同一トレンドの場合のボーナスを加算する。

```
trendBonus = 0.05  (IMPROVING 同士 or WORSENING 同士)
trendBonus = 0.0   (STABLE or トレンド不一致)

finalScore = clamp(rawScore + trendBonus, 0, 1)
```

ボーナスは Edge 生成後に `longitudinalContext.trendBonus` として記録する。
threshold 判定は `rawScore` で行い、`finalScore` は表示用スコアとする。

### 6-C. Wave1 Longitudinal Signal ルール

Wave1 では Longitudinal Signal の計算は行わない。
`LongitudinalSignalService` の実装は Wave2 スコープ。

---

## Section 7. Wave1 Network 安定化ルール

本 Council で確定した Wave1 における Network 層の安定化ルール:

### 7-A. 公開禁止ルール（継続）

```
Wave1 Network 非公開条件:
  Tier3 Case 総数 < 50 の間は Similarity 結果を UI に表示しない
  （既存ルール継続 / HANDOFF参照）
```

### 7-B. Wave1 追加禁止事項（本 Council 追加）

| 禁止事項 | 根拠 |
|---|---|
| Signal属性なしの Edge 新規生成 | vectorVersion未付与 Edge の混入防止 |
| VectorBuilder の次元追加 | VECTOR_VERSION='1' を8次元に固定 |
| Disease Cluster 統計計算のUI公開 | Wave2 DiseaseClusterService 設計前 |
| Longitudinal Score のEdge付与 | Wave2 LongitudinalSignalService 設計前 |

### 7-C. PR-030 で実施する最小 Wave1 対応

本 Council の Wave1 即時実施事項:

| 対応 | ファイル | 内容 |
|---|---|---|
| vectorVersion 追加 | `src/domains/similarity/edge-generator.js` | EdgeGenerator が `vectorVersion: '1'` を Edge に付与 |
| VECTOR_VERSION 定数 | `src/domains/similarity/vector-builder.js` | `export const VECTOR_VERSION = '1'` を追加 |
| NetworkSignal型定義（SSOT） | `src/domains/network/network-signal-types.js` | SignalType / MenstrualPhase の SSOT（Wave2実装の足場） |
| Council 参照の ApiGateway注記 | `src/application/api-gateway.js` | IPPO-COUNCIL-002 参照コメント追加 |

---

## Section 8. PR-030 スコープ定義

ブランチ: `feat/phase4d-batch1-record-input`

本 Council の設計を踏まえ、PR-030 は **Record Input Signal 収集基盤** とする。

### 8-A. PR-030 の目的

Record 保存時に Signal 収集が始まる構造を整備する。
UI（Record Input 画面）が ApiGateway 経由で Signal 付きの Record を保存できるようにする。

### 8-B. PR-030 スコープ

| カテゴリ | 実装内容 |
|---|---|
| Network Signal SSOT | `src/domains/network/network-signal-types.js` — SignalType / MenstrualPhase 定数（Wave2足場） |
| VectorVersion 付与 | `EdgeGenerator` に `vectorVersion: '1'` 追加 |
| VECTOR_VERSION 定数 | `VectorBuilder` に `export const VECTOR_VERSION = '1'` 追加 |
| Record Input バリデーション | `src/domains/record/record-input-validator.js` — symptoms/pain/sleep フィールドのバリデーション |
| ApiGateway 拡張 | `saveRecord()` — Signal フィールドの入力受け付け（症状・痛み・睡眠・食事） |
| テスト | 上記すべての単体テスト |

### 8-C. PR-030 スコープ外（Wave2）

| 除外事項 | 理由 |
|---|---|
| FeatureVector 12次元化 | VECTOR_VERSION='2' は Wave2 スコープ |
| Edge signalProfile 付与 | Wave2 Edge Attribute Layer |
| DiseaseClusterService | Wave2 スコープ |
| LongitudinalSignalService | Wave2 スコープ |
| Emotion Signal | Wave2 Signal層 |
| MenstrualPhase 自動判定 | Disease Entity 昇格後（BD-004）に設計 |

---

## Section 9. Binding Decisions（本 Council 追加）

以下を IPPO-GOV-001 への Level-2 追加事項として確定する:

| 決定番号 | 内容 | 根拠Section |
|---|---|---|
| **BD-009** | Disease Cluster ID は Wave2 Disease Entity 昇格まで `diseaseKey` と同一とする | Section 5-C |
| **BD-010** | FeatureVector は `VECTOR_VERSION` 定数を持ち、次元拡張時は必ずバージョンを上げる | Section 4-A |
| **BD-011** | EdgeGenerator が生成する全エッジは `vectorVersion` フィールドを持つ | Section 4-B |
| **BD-012** | Longitudinal Signal の計算は Wave2 スコープ。Wave1 では Edge に付与しない | Section 6-C |
| **BD-013** | Signal Schema（NetworkSignal）の SSOT は `src/domains/network/network-signal-types.js` に置く | Section 3-A |
| **BD-014** | MenstrualPhase の自動判定は Disease Entity 昇格後（Wave2）に実装する | Section 3-C |

---

## Section 10. IPPO-GOV-001 改訂記録

| 項目 | 内容 |
|---|---|
| 改訂種別 | Level-2（Wave計画・優先度の更新） |
| バージョン変更 | v1.1 → v1.2 |
| 追加 Binding Decisions | BD-009〜BD-014（6件） |
| 改訂日 | 2026-06-26 |
| 承認 | NETWORK ASSET COUNCIL |

---

## Section 11. Document Authority Record

| 項目 | 内容 |
|---|---|
| 文書番号 | IPPO-COUNCIL-002 |
| 開催日 | 2026-06-26 |
| 前提文書 | IPPO-GOV-001 v1.1 |
| 設計命令 | NAC-01〜NAC-04（全4件）— 完了 |
| 追加 Binding Decisions | BD-009〜BD-014（6件）|
| Wave1 即時対応 | PR-030 スコープとして確定 |
| 次回 Council | DATA ASSET COUNCIL |

---

**NETWORK ASSET COUNCIL — 議決完了 2026-06-26**
**承認: Founder**
