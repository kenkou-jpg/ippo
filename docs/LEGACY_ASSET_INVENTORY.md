# LEGACY ASSET INVENTORY COUNCIL
## IPPO — 旧資産棚卸・Network Asset判定

**会議日:** 2026-06-25
**ステータス:** COUNCIL APPROVED
**次会議:** NETWORK ASSET COUNCIL / DATA ASSET COUNCIL

---

## 1. Executive Summary

旧IPPOが保有していた資産群を「女性疾患ネットワーク資産になり得るか」の視点で評価した。

**主要結論:**

- 症状・記録・実験の3資産はネットワーク資産の**中核**であり即時継承
- 食事・感情・睡眠は「Signal」として再設計することで高価値化する
- 生理・疾患・痛みは独立資産ではなく**Record × Profile × Case × Network**の多次元体として扱う
- 満月カレンダーはUI機能ではなく**Environmental Signal**として保留
- 断食・サプリは Wave2 Experiment の変数として延期（資産価値あり）

**5年後に残る可能性が最も高い資産:**
Symptom Intelligence + Disease Registry + Menstrual Intelligence の3点セット。
これは他のいかなるヘルスアプリも持ち得ない「女性疾患固有のネットワーク基盤」になる。

---

## 2. Legacy Asset Inventory

| Asset | 旧IPPO存在 | 新IPPO存在 | 実装状況 | 判定 |
|---|---|---|---|---|
| Record | YES | YES | domains/record 完全実装 | **KEEP** |
| Experiment | YES | YES | domains/experiment 完全実装 | **KEEP** |
| Symptom | YES | 部分的 | Record.symptoms[] として存在 | **KEEP → 拡張** |
| Food | YES | NO | Record.foods[] として痕跡あり | **REFACTOR → Exposure Signal** |
| Emotion | YES | NO | 未実装 | **REFACTOR → Signal** |
| Sleep | YES | 部分的 | sleepBed/sleepWake フィールド存在 | **REFACTOR → Recovery Signal** |
| Fasting | YES | NO | 未実装 | **HOLD** |
| Supplement | YES | NO | 未実装 | **HOLD** |
| Insight | YES | NO | 未実装 | **REFACTOR → Observation** |
| Statistics | YES | YES | Analytics Layer として実装中 | **KEEP（埋込）** |
| Analysis | YES | YES | Analytics Layer として実装中 | **KEEP（埋込）** |
| Menstrual Data | YES | 部分的 | disease_tag として痕跡のみ | **REFACTOR → Multi-layer Asset** |
| Pain Tracking | YES | 部分的 | painLevel フィールドのみ | **KEEP → 拡張** |
| Disease Registry | YES | 部分的 | disease_tag (string) のみ | **REFACTOR → Disease Entity** |
| Lunar Calendar | YES | NO | 未実装 | **HOLD → Environmental Signal** |
| Wearable | NO | NO | 未設計 | **HOLD** |
| Lab Data | NO | NO | 未設計 | **HOLD** |
| Medication | NO | NO | 未設計 | **HOLD** |
| Genetics | NO | NO | 未設計 | **HOLD** |

---

## 3. Asset Classification

### ▍KEEP — Wave1〜Wave2で即時必要

| Asset | 理由 | 新IPPO対応 |
|---|---|---|
| Record | すべての観察の基底単位。削除不可 | domains/record |
| Experiment | 自己実験は差別化の核心 | domains/experiment |
| Symptom | 疾患ネットワークの一次信号 | Record.symptoms[] を拡張 |
| Pain Tracking | 症状の定量化。ネットワーク比較の単位 | Record フィールド拡張 |
| Statistics/Analysis | KPI・コホート計算に必要 | Analytics Layer 組込 |

### ▍REFACTOR — 思想変更して再利用

| 旧Asset | 新Asset名 | 再設計思想 |
|---|---|---|
| Food | **Exposure Signal** | 食事 → 介入変数。Experiment の独立変数として機能 |
| Emotion | **Signal** | 感情 → 生体シグナル。PMS/PMDDの先行指標 |
| Sleep | **Recovery Signal** | 睡眠 → 回復指標。Experiment 結果変数として機能 |
| Insight | **Observation** | 気づき → 定性データポイント。Record の注記層 |
| Menstrual Data | **Multi-layer Asset** | 詳細は Section 5-C 参照 |
| Disease Registry | **Disease Entity** | 文字列タグ → 構造化疾患エンティティ |

### ▍HOLD — 今は使わないが将来価値あり

| Asset | 保留理由 | 解除条件 |
|---|---|---|
| Fasting | Wave2 Experiment の変数として設計が必要 | Experiment V2 設計時 |
| Supplement | 同上 | 同上 |
| Lunar Calendar | Environmental Signal として研究価値あり | Wave2 Signal層設計時 |
| Wearable | Tier1 ユーザーの連続計測基盤 | Wave3 以降 |
| Lab Data | 医療連携が前提 | B2B拡張時 |
| Medication | 疾患管理との統合が必要 | Wave3 以降 |
| Genetics | 研究倫理・同意設計が複雑 | Wave4 以降 |

### ▍DROP — 今後不要

現時点で DROP 判定をする資産は**ゼロ**。

> **理由:** 旧IPPOのすべての観察系資産は、女性疾患ネットワークの文脈では「Signal」として再定義すれば価値を持つ。早期に DROP 判定すると、後の Network Evolution Council で資産を再定義する際に設計負債が生じる。「DROP」より「HOLD with low priority」が正しい判定。

---

## 4. Network Asset Evaluation

各資産の個人→集団→ネットワーク価値を評価する。

### Record

```
個人価値
└ 自分の健康日記

集団価値
└ 同疾患ユーザーの記録密度比較（quality score）

ネットワーク価値
└ 記録 × 疾患 × 実験 × 結果 の多次元観察データベース
  → 世界最大の女性疾患観察ネットワーク
```

**評価: ★★★★★ — 基盤資産。代替不可。**

### Symptom Intelligence

```
個人価値
└ 自分の症状の可視化・パターン認識

集団価値
└ 同症状ユーザーの分布。「自分だけではない」という安心

ネットワーク価値
└ 症状 × 疾患 × 治療 × 結果 のエッジ生成
  → 症状パターンから疾患を逆引きするネットワーク
  → 医療機関への橋渡しデータ
```

**評価: ★★★★★ — Symptom はネットワークの神経系。**

### Pain Tracking

```
個人価値
└ 痛みの定量化。「今日の痛みは7/10」

集団価値
└ 同疾患の痛みスコア分布。「子宮内膜症の平均痛みレベル」

ネットワーク価値
└ 痛みタイプ（刺す / 締める / 鈍痛）× 疾患 × 周期相 のエッジ
  → 痛みパターンから疾患仮説を生成
  → 疼痛研究への貢献
```

**評価: ★★★★☆ — 症状の定量化層として必須。**

### Food / Exposure Signal

```
個人価値
└ 食事記録による体調管理

集団価値
└ 同疾患ユーザーの食事パターン比較
  「子宮内膜症で症状が軽い人の食事傾向」

ネットワーク価値
└ 食事 × 症状 × 疾患 × 実験結果 の介入ネットワーク
  → 食事介入の疾患別効果マップ
  → 栄養学研究・食品企業へのB2B価値
```

**評価: ★★★★☆ — 介入変数として再設計すれば高価値。生のFoodログとしては低価値。**

### Emotion / Signal

```
個人価値
└ 気分・メンタルの記録

集団価値
└ 同疾患・同周期相の感情分布
  「PMDDの排卵後〜月経前の感情スコア」

ネットワーク価値
└ 感情 × ホルモン周期 × 症状 のシグナルネットワーク
  → 精神科・婦人科の橋渡しデータ
  → PMDD/PMS の先行指標モデル
```

**評価: ★★★★☆ — 単体では弱いが、症状・周期との組合せで強力。**

### Sleep / Recovery Signal

```
個人価値
└ 睡眠の可視化

集団価値
└ 疾患別の睡眠質分布

ネットワーク価値
└ 睡眠 × 実験回復率 × 症状変化 のエッジ
  → 介入効果の回復指標
  → 睡眠研究への貢献
```

**評価: ★★★☆☆ — Wave2以降で価値が上がる。Wave1では補助指標。**

### Insight / Observation

```
個人価値
└ 主観的気づきの蓄積

集団価値
└ 同疾患ユーザーの気づきパターン
  「子宮内膜症ユーザーが気づいたこと」

ネットワーク価値
└ 定性知見の集合知化
  → 医療者が気づかない患者視点の知識グラフ
```

**評価: ★★★☆☆ — NLP・LLM処理が前提。Wave2以降。**

### Lunar Calendar / Environmental Signal

```
個人価値
└ 月齢と自分の体調の相関確認

集団価値
└ 月齢 × 全ユーザー体調スコアの集計

ネットワーク価値
└ 環境信号（月齢・季節・気圧）× 症状 × 疾患 の相関研究
  → 環境因子を組み込んだ疾患モデル
  → 医学研究・気候医学との接続
```

**評価: ★★★☆☆ — 研究価値は高い。現時点では仮説層。UI機能として扱わない。**

---

## 5. Compatibility Audit — 新IPPOとの適合性

### 通常資産

| Asset | Record適合 | Experiment適合 | Case適合 | Profile適合 | Network適合 |
|---|---|---|---|---|---|
| Record | ◎ 基底 | ◯ 観察変数 | ◎ 生成材料 | ◯ 履歴 | ◎ ノード |
| Experiment | ◯ 対象 | ◎ 基底 | ◎ 生成材料 | ◯ 実績 | ◎ エッジ生成 |
| Symptom | ◎ フィールド | ◎ 介入指標 | ◎ quality score | ◯ 傾向 | ◎ エッジ属性 |
| Food | ◯ フィールド | ◎ 独立変数 | △ 間接 | ◯ 傾向 | ◯ エッジ属性 |
| Emotion | ◯ フィールド | ◎ 結果変数 | △ 間接 | ◯ 傾向 | ◯ エッジ属性 |
| Sleep | ◯ フィールド | ◎ 回復指標 | △ 間接 | ◯ 傾向 | ◯ エッジ属性 |
| Insight | ◯ 注記 | ◯ 仮説源 | △ 間接 | ◯ 蓄積 | △ 将来 |
| Fasting | △ 種別 | ◎ 介入型 | △ 間接 | △ | ◯ 将来 |
| Supplement | △ 種別 | ◎ 介入型 | △ 間接 | △ | ◯ 将来 |
| Lunar | × | ◯ 外部変数 | × | × | ◯ 環境信号 |

### 追加監査 Asset A〜E

**Asset A — Symptom Intelligence Layer**

| 評価軸 | 判定 |
|---|---|
| Record適合 | ◎ symptoms[] フィールドとして完全適合 |
| Experiment適合 | ◎ 実験の従属変数（症状スコア変化） |
| Case適合 | ◎ quality score 算出に直接影響 |
| Profile適合 | ◯ 症状傾向の統計サマリー |
| Network適合 | ◎ 症状エッジの主軸 |

**判定: KEEP → Wave1で即時拡張**

---

**Asset B — Pain Tracking Layer**

| 評価軸 | 判定 |
|---|---|
| Record適合 | ◎ painLevel + painType フィールドとして適合 |
| Experiment適合 | ◎ 痛みスコアは最も客観的な実験結果変数 |
| Case適合 | ◎ 痛みの種類は疾患分類の一次シグナル |
| Network適合 | ◎ 痛みタイプ × 疾患 × 治療 の三項エッジ |

**判定: KEEP → Symptom Intelligence の一部として実装**

---

**Asset C — Menstrual Intelligence Layer**

これは単一レイヤーではなく**多次元資産**として再定義する。

```
生理データの多次元マッピング:

日次観察  → Record フィールド
           (出血量, 色, 塊, 痛みレベル, PMS症状)

基礎特性  → Profile 構成要素
           (平均周期日数, 排卵パターン, PMS傾向)

異常検知  → Case 生成トリガー
           (周期異常, 出血異常, 痛み閾値超え)

ネットワーク → Network Asset
           (生理パターン × 疾患 × 治療 の集団知)
```

**判定: REFACTOR → Multi-layer Asset として設計**

> Founder監査回答: 生理データは Record・Profile・Case・Network Asset のすべてに属する。それぞれの抽出粒度が異なる。「生理記録」は Record の1フィールド群。「生理プロファイル」は Profile の統計サマリー。「生理異常」は Case の生成条件。「生理パターン集団知」は Network Asset。

---

**Asset D — Disease Registry Layer**

現在の disease_tag は文字列フィールドであり、構造化データではない。

```
現状:
record.disease_tag = "endometriosis"  // 文字列のみ

必要な設計:
DiseaseEntity {
  id:          "disease_endo_001"
  name:        "子宮内膜症"
  icdCode:     "N80"
  category:    "gynecological"
  relatedTags: ["adenomyosis", "infertility"]
  symptoms:    ["pelvic_pain", "dysmenorrhea", "heavy_bleeding"]
  severity:    enum(MILD|MODERATE|SEVERE)
  diagnosedAt: date
  confirmedBy: enum(SELF|DOCTOR|IMAGING)
}
```

**判定: REFACTOR → Disease Entity として Wave2で設計**

> Founder監査回答: 疾患情報は Profile（診断事実）+ Case（エピソード）+ Network（研究価値）の3層構造。disease_tag は現在 Record の品質スコア計算と Tier 判定に使われており、まず HOLD しつつ Wave2 で Disease Entity に昇格させる。

---

**Asset E — Lunar Calendar Layer**

評価結論: **Calendar Feature として実装しない。Environmental Signal として保留する。**

```
Environmental Signal としての設計方針:

1. ユーザーUIには表示しない（Week1〜Wave1では）
2. Record 保存時にサーバー側で月齢メタデータを自動付与
   record.environmentalSignals.lunarPhase = "FULL_MOON"
3. 研究用途のみ: lunarPhase × 症状スコア の相関分析
4. ユーザーへの開示は Wave3以降（十分な相関データが蓄積後）
```

**判定: HOLD → Environmental Signal メタデータとして記録のみ**

> Founder監査回答: 迷信ではなく「未検証の仮説」として扱う。データを蓄積して相関を見る。女性の月経周期と月齢の関係は複数の研究で弱い相関が示されており、集団データがあれば有意義な知見になる可能性がある。UI化は不要。メタデータ記録のみ。

---

## 6. Founder Constraint Audit

| Asset | 女性疾患NW形成 | Case生成率向上 | Experiment成功率 | Consent価値向上 |
|---|---|---|---|---|
| Symptom | ◎ 最重要シグナル | ◎ quality score直接影響 | ◎ 従属変数 | ◎ 詳細データ = 価値向上 |
| Pain Tracking | ◎ 疾患分類シグナル | ◎ quality score | ◎ 定量指標 | ◯ |
| Food/Exposure | ◯ 介入変数 | △ 間接 | ◎ 独立変数 | ◯ |
| Emotion/Signal | ◯ PMS/PMDD指標 | △ 間接 | ◯ | ◯ |
| Sleep/Recovery | ◯ 回復指標 | △ | ◯ | ◯ |
| Menstrual | ◎ 基礎データ | ◎ Case生成条件 | ◎ | ◎ |
| Disease Entity | ◎ 中核 | ◎ Tier判定基盤 | ◎ | ◎ 研究価値直結 |
| Fasting | △ 将来 | × | ◎ 介入型 | △ |
| Supplement | △ 将来 | × | ◎ 介入型 | △ |
| Lunar Signal | △ 研究用 | × | ◯ 外部変数 | △ |
| Insight | ◯ 定性知見 | △ | △ | ◯ |

**Constraint満足度が高い資産 (上位3):**
1. **Symptom Intelligence** — 4条件すべて最高評価
2. **Menstrual Intelligence** — 4条件すべて最高評価
3. **Disease Entity** — 4条件すべて最高評価

---

## 7. Deferred Asset Registry (Wave1不採用資産)

以下は Wave1 スコープ外として明示的に延期する。

| Asset | 延期理由 | 解除条件 | 優先度 |
|---|---|---|---|
| Fasting | Experiment V2 の変数設計が前提 | Wave2 Experiment拡張時 | HIGH |
| Supplement | 同上 | 同上 | HIGH |
| Lunar Calendar | Environmental Signal 基盤未整備 | Wave2 Signal層設計時 | MEDIUM |
| Disease Entity | 現在 disease_tag で代替中 | Wave2 DB拡張時 | HIGH |
| Wearable | デバイス連携 API 未設計 | Wave3 以降 | LOW |
| Lab Data | 医療連携・プライバシー設計が必要 | Wave3 以降 | MEDIUM |
| Medication | 薬剤情報DBとの連携が必要 | Wave3 以降 | MEDIUM |
| Genetics | 遺伝情報の同意設計・倫理審査が必要 | Wave4 以降 | LOW |
| Insight/NLP | LLM処理基盤が必要 | Wave2以降 | MEDIUM |

---

## 8. Migration Map

```text
KEEP (即時継承・拡張)
 ├ Record            → 現行 domains/record を維持
 ├ Experiment        → 現行 domains/experiment を維持
 ├ Symptom           → Record.symptoms[] を構造化拡張
 │                     (symptomId / severity / duration / location)
 └ Pain Tracking     → Record.pain を拡張
                       (painType / painLocation / painDuration)

REFACTOR (再設計・再利用)
 ├ Food              → Exposure Signal
 │                     Experiment の介入変数フィールドへ統合
 ├ Emotion           → Signal
 │                     Record の生体シグナル層へ統合
 ├ Sleep             → Recovery Signal
 │                     Record の回復指標フィールドへ統合
 │                     (現行 sleepBed/sleepWake を Quality Score に反映)
 ├ Insight           → Observation
 │                     Record の定性注記フィールドへ統合
 ├ Menstrual Data    → Multi-layer Asset
 │                     Record: 日次観察フィールド群
 │                     Profile: 周期統計サマリー
 │                     Case: 異常検知トリガー
 │                     Network: 集団パターン資産
 └ Disease (tag)     → Disease Entity (Wave2)
                       disease_tag → DiseaseEntity 構造体へ昇格

HOLD (延期・将来価値あり)
 ├ Fasting           → Wave2 Experiment 介入タイプ
 ├ Supplement        → Wave2 Experiment 介入タイプ
 ├ Lunar Calendar    → Environmental Signal メタデータ (記録のみ)
 ├ Wearable          → Wave3 連続計測層
 ├ Lab Data          → Wave3 医療連携層
 ├ Medication        → Wave3 疾患管理層
 └ Genetics          → Wave4 精密医療層

DROP
 └ (なし — 現時点での DROP 判定ゼロ)
```

---

## 9. Impact on Network Asset Council

本 Council の判定が NETWORK ASSET COUNCIL に与える影響:

### 確定事項

```text
Network の一次ノード: Case
Network のエッジ生成条件: Symptom × Disease × Outcome の類似度

Network の信号源 (Signal層) として確定した資産:
 ├ Symptom (一次シグナル)
 ├ Pain (定量シグナル)
 ├ Menstrual Phase (周期シグナル)
 ├ Emotion (状態シグナル)
 ├ Sleep/Recovery (回復シグナル)
 └ Food/Exposure (介入シグナル)
```

### 推奨事項

NETWORK ASSET COUNCIL では以下を設計せよ:

1. **Signal Schema** — 上記6種のシグナルを統一スキーマで表現
2. **Edge Attribute Layer** — ノード間エッジにシグナル属性を付与
3. **Disease Cluster** — 疾患グループ内のシグナルパターン比較
4. **Longitudinal Signal** — 時系列シグナルの変化率をエッジ重みに反映

---

## 10. Impact on Data Asset Council

本 Council の判定が DATA ASSET COUNCIL に与える影響:

### データ資産の優先順位

| 優先度 | データ種別 | 価値根拠 |
|---|---|---|
| P1 | 症状データ (構造化) | 疾患ネットワークの一次エッジ |
| P1 | 疾患タグ → Disease Entity | B2B・研究価値の核心 |
| P1 | 実験結果データ | 治療介入の因果データ |
| P2 | 生理周期データ | 女性固有の基礎シグナル |
| P2 | 食事・介入データ | 因果推論の独立変数 |
| P3 | 感情・睡眠データ | 多変量解析の補助変数 |
| P4 | 環境シグナル (月齢等) | 研究用メタデータ |

### データ戦略への示唆

```text
最終的なIPPOのデータ価値は:

症状 × 疾患 × 実験 × 結果

の4次元マトリクスにある。

この4次元データを持つプラットフォームは現存しない。
これがIPPOの唯一無二の競合優位であり、
DATA ASSET COUNCIL はこの4次元を最大化する
収集・保護・活用戦略を設計すること。
```

---

## Founder Questions — 最終回答

### Q1. 症状詳細記録は Wave1で必要か？

**YES — 必要。かつ、今すぐ拡張すべき。**

現在 `Record.symptoms[]` は文字列配列に過ぎない。Wave1 で質の高い Case を生成するためには、症状の**構造化** (symptomId / severity / location / duration) が不可欠。現行の quality score は `SYMPTOM_COUNT` の次元を持つが、症状の深さ（種類・重度）を反映していない。症状詳細化は Case 品質→Tier 移行→Consent 動機→Network 価値 の全連鎖を強化する。

---

### Q2. 痛みの種類は Network Assetになり得るか？

**YES — 最も強力な Network Asset候補のひとつ。**

痛みの種類（刺す / 締める / 鈍痛 / 灼熱 / 痙攣）は、疾患分類と強い相関を持つ。

```
子宮内膜症: 刺すような痛み + 圧迫感
子宮腺筋症: 鈍痛 + 出血量増加
PCOS: 痛みは比較的軽度
PMS/PMDD: 痙攣痛 + 感情変動
```

このパターンが集団データで確認されると、**痛みタイプから疾患を仮説生成する逆引きエンジン**が作れる。医療診断の補助ツールとして B2B 価値が高い。

---

### Q3. 疾患情報は Profileなのか Caseなのか別資産なのか？

**4層に分離して扱う。どれか1つではない。**

```
Layer 1 — Record (観察)
  毎日の記録に disease_tag として付与
  → 「今日も子宮内膜症に関連する症状あり」

Layer 2 — Profile (特性)
  診断事実・診断確度・発症時期
  → 「2019年に子宮内膜症を診断（MRI確認）」

Layer 3 — Case (エピソード)
  疾患の活動期・増悪期・寛解期
  → 「2024年Q3: 症状増悪 → 実験介入 → 改善」

Layer 4 — Network Asset (集合知)
  疾患グループ内の症状・実験・結果パターン
  → 「子宮内膜症×食事介入の集団成功率」
```

Wave2 で `Disease Entity` を設計する際は、この4層への参照を持つ構造体とすること。

---

### Q4. 満月情報は単なる表示機能か将来の研究資産か？

**将来の研究資産。ただし今は UI として実装しない。**

月齢と月経周期の関連性は複数の観察研究で示唆されており、否定も確定もできていない。IPPO が数万人のユーザーデータを持つ段階で、`lunarPhase × 症状スコア` の相関を分析すれば、世界でも稀な大規模エビデンスが得られる。

実装方針:
- Wave1〜2: Record 保存時にバックエンドで月齢を自動付与（フロントへの表示なし）
- Wave3: 相関が有意と確認された場合のみ「環境シグナル」としてユーザーへ開示
- 「満月カレンダー機能」として作ると UI 負債になるため禁止

---

### Q5. 5年後のIPPOに残る可能性が最も高い資産は何か？

**Symptom Intelligence + Disease Entity + Menstrual Intelligence の3点セット。**

理由:

```
この3つを組み合わせると:

「この疾患を持つ女性は、
 月経周期のどの相で、
 どのような症状を呈するか」

という知識グラフが生まれる。

これは:
 - 他のヘルスアプリが作れない（女性疾患特化）
 - 医療機関が作れない（患者視点の日常観察）
 - 製薬会社が欲しい（臨床試験の患者像把握）
 - 自治体が欲しい（婦人科疾患の公衆衛生データ）
 - 女性自身が必要（「自分と同じ人がいる」という安心）

IPPOの5年後の価値は、
この3資産の深さと精度で決まる。
```

---

**文書終了**
**承認: LEGACY ASSET INVENTORY COUNCIL 2026-06-25**
**次回: NETWORK ASSET COUNCIL**
