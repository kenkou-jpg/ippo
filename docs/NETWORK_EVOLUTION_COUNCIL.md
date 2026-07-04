# NETWORK EVOLUTION COUNCIL
## IPPO ネットワーク進化設計 Council — 10年設計基準文書

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本 Council は「IPPOが10年後も崩れないネットワーク設計」を決定する。
> 本文書の Binding Decisions（BD-026以降）はすべての下位設計文書に優先する。
> 本文書は実装仕様ではない。実装の判断基準である。

---

**文書番号:** IPPO-COUNCIL-004
**開催日:** 2026-06-27
**前提文書:** IPPO-GOV-001 v1.3 / IPPO-COUNCIL-002 (NETWORK ASSET COUNCIL) / IPPO-COUNCIL-003 (DATA ASSET COUNCIL)
**承認:** Founder
**位置づけ:** Wave2〜Wave6の設計的上位制約

---

## Executive Summary

IPPOは2026年6月時点でWave1（Layer 0〜8データ資産基盤）を完成させた。
PR-040（Research Dataset Foundation）の完了により、IPPOはもはや「記録アプリ」ではない。
**「女性疾患の縦断データ資産を構築・運用するプラットフォーム」**である。

しかし現時点のネットワークは単一ユーザーの記録の積み重ねに過ぎない。
ネットワーク効果は発生していない。Similarityエッジは存在するが、
ユーザーはそのネットワークの価値を受け取れていない。

本 Council が問うのは以下である:

> **「10年後、IPPOのネットワークはなぜ崩れないのか」**

この問いに対する答えが、本文書のすべてである。

### 本 Council の核心決定（要約）

| 決定カテゴリ | 内容 |
|---|---|
| ネットワークの一次価値単位 | Case（症例）— ユーザーではなく症例がノードである |
| ネットワーク効果の源泉 | 「Symptom × Disease × Outcome × Time」の4次元密度 |
| 信頼の基盤 | 匿名性保証（k≥5）＋Consent Immutability（BD-002）のゼロ妥協 |
| AI進化の方向 | Record → Signal → Pattern → Knowledge の決定論的連鎖 |
| Founder Moat の本質 | 「記録の長さ × 疾患の深さ × Consent の清潔さ」の三乗 |

---

## Section 1. Network Evolution Roadmap（議題①）

### 1-A. 7フェーズ進化モデル

IPPOのネットワークは以下7つのフェーズを経て進化する。
各フェーズは前フェーズのデータ資産を前提とし、逆行は原則禁止とする。

```
Phase 1: SEED（個人記録の蓄積）
  期間: Wave1（〜2026年末）
  状態: 個人ユーザーの Record 蓄積。ネットワーク効果なし。
  価値: ユーザー自身の健康記録の可視化
  完了条件: 100名以上の Tier3 Case 保有

Phase 2: SIGNAL（シグナル分析の確立）
  期間: Wave2 前半（2027年）
  状態: NetworkSignal が Supabase に永続化。Longitudinal 分析が機能する。
  価値: 個人の時系列パターン理解（「あなたの痛みは黄体期に増悪する」）
  完了条件: 500名以上の Longitudinal Signal 90日以上蓄積

Phase 3: CLUSTER（疾患クラスター形成）
  期間: Wave2 後半（2027〜2028年）
  状態: DiseaseCluster が実体化。同疾患ユーザーの集合が統計的に比較可能になる。
  価値: 「あなたは子宮内膜症グループの中で症状強度95パーセンタイルにいる」
  完了条件: 5疾患以上で k≥50 の匿名クラスター形成

Phase 4: MATCH（類似症例マッチング公開）
  期間: Wave3 前半（2028〜2029年）
  状態: Similarity Graph の UI 公開。ユーザーが「似た症例」を参照できる。
  価値: 孤立していた患者が「同じ経験をした人がいる」と知る
  完了条件: Similarity UI 公開、Case 数 1,000 以上

Phase 5: INTELLIGENCE（AI推薦の開始）
  期間: Wave3 後半（2029〜2030年）
  状態: Knowledge Graph + Signal Embedding が機能。AI推薦が始まる。
  価値: 「あなたの実験Aの結果は同クラスターの87%と一致している」
  完了条件: AI推薦精度の Founder 承認

Phase 6: PLATFORM（外部エコシステムの受け入れ）
  期間: Wave4〜5（2030〜2033年）
  状態: Disease Intelligence API 公開。医療機関・研究者がIPPOのデータを参照する。
  価値: IPPOが女性疾患データの「権威プラットフォーム」になる
  完了条件: 3機関以上との正式データ提携

Phase 7: STANDARD（国際標準化）
  期間: Wave6（2033年〜）
  状態: Research Dataset が国際的に引用される。疾患分類のデファクト標準になる。
  価値: IPPOのデータなしに女性疾患研究が成立しない
  完了条件: 査読論文3本以上がIPPOデータを引用
```

### 1-B. フェーズ移行の禁止条件

> **BD-026（本 Council 決定）:**
> フェーズ移行は完了条件を満たすことを Founder が確認した場合のみ許可する。
> 前フェーズの完了条件を満たさないままの機能公開は禁止する。
> （例: Phase 3 の DiseaseCluster 形成なしに Phase 4 の Similarity UI 公開は禁止）

---

## Section 2. Network Effects（議題②）

### 2-A. IPPOのネットワーク効果の特殊性

一般的なネットワーク効果（SNS等）は「ユーザー数が増えると価値が増す」。
IPPOのネットワーク効果は異なる:

> **「記録の長さ × 疾患の種類 × Signal の密度」が増すほど価値が増す**

ユーザー数よりも「記録密度」が価値の駆動因子である。
1人が5年記録したデータは、5人が1年記録したデータより価値が高い局面がある。

### 2-B. ネットワーク価値の4次元

```
価値軸 1: 縦断性（Longitudinal）
  「誰か1人が何年記録したか」
  → 長ければ長いほど Longitudinal Signal の精度が上がる

価値軸 2: 横断性（Cross-sectional）
  「同じ疾患を持つ何人が記録しているか」
  → 多ければ多いほど Disease Cluster の統計的信頼性が上がる

価値軸 3: Signal 密度（Signal Density）
  「1回の記録に何種類の Signal が含まれるか」
  → 6種 Signal がすべて揃うほど FeatureVector の解像度が上がる

価値軸 4: Outcome 密度（Outcome Density）
  「実験の結果（改善/悪化）が何件記録されているか」
  → Outcome が蓄積されるほど因果推論が可能になる
```

### 2-C. ネットワーク効果が発生するしきい値

| フェーズ | しきい値 | 発生する効果 |
|---|---|---|
| Phase 3 | 疾患別 Case 数 50以上 | Disease Cluster 統計が信頼水準に達する |
| Phase 4 | 総 Case 数 1,000以上 | Similarity Match の精度が安定する |
| Phase 5 | 縦断 Record 10万件以上 | AI推薦の汎化性能が実用水準に達する |
| Phase 6 | Research Dataset v1.0 公開 | 外部研究者のデータ需要が発生する |
| Phase 7 | 論文引用 3件以上 | 疾患分類デファクト化が始まる |

> **BD-027（本 Council 決定）:**
> ネットワーク効果のしきい値は上記を下回る状態での外部公開を禁止する。
> 閾値未達での公開はデータ品質への信頼を損なう不可逆リスクである。

---

## Section 3. Asset Evolution（議題③）

### 3-A. Record から AI Model への決定論的連鎖

BD-015（DATA ASSET COUNCIL）が保証する「Layer 1 → Layer 7 の決定論的再構築」を
さらに Wave3〜6 へ拡張する:

```
Layer 1: RECORD（永久保存 / 再生成不可）
    ↓ generateSignal()
Layer 2: NETWORK SIGNAL（永久保存）
    ↓ aggregate() / movingAverage() / longitudinal()
Layer 6: INTELLIGENCE（再計算可能）
    ↓ VectorBuilder.build()
Layer 4: FEATURE VECTOR（再計算可能）
    ↓ SimilarityEngine.compute()
Layer 7: SIMILARITY GRAPH（再計算可能）
    ↓ anonymize() + k-anonymity(k≥5)
Layer 8: RESEARCH DATASET（不可逆匿名化 / 永久保存）
    ↓ embed() [Wave3]
Layer 9: SIGNAL EMBEDDING（派生 / 再計算可能）
    ↓ train() [Wave4]
Layer 10: DISEASE INTELLIGENCE MODEL（派生 / 再学習可能）
    ↓ ontology_map() [Wave5]
Layer 11: DISEASE ONTOLOGY（権威資産 / 国際標準候補）
```

### 3-B. 新設: Layer 9〜11 の定義

#### Layer 9 — Signal Embedding（Wave3）
| 項目 | 内容 |
|---|---|
| 責務 | NetworkSignal を高次元ベクトル空間に埋め込む |
| 入力 | NetworkSignal[] + Research Dataset |
| 出力 | Embedding Vector（128次元想定） |
| 保存 | Feature Store（Wave3 / Redis/Supabase） |
| 再生成 | 可能（モデル固定の場合のみ決定論的） |

#### Layer 10 — Disease Intelligence Model（Wave4）
| 項目 | 内容 |
|---|---|
| 責務 | 疾患進行予測 / 類似症例推薦 / 治療効果推定のAIモデル |
| 入力 | Signal Embedding + Research Dataset（ラベル付き） |
| 出力 | 推薦結果 / 予測スコア / 説明可能性レポート |
| 保存 | モデルバイナリ（バージョン管理） |
| 再生成 | 同一データ・同一ハイパーパラメータで再学習可能 |

#### Layer 11 — Disease Ontology（Wave5〜6）
| 項目 | 内容 |
|---|---|
| 責務 | 女性疾患の症状・病態・治療の構造化知識グラフ |
| 入力 | Disease Intelligence Model + 専門医監修 |
| 出力 | Disease Ontology（OWL/RDF形式候補） |
| 保存 | 永久保存 / バージョン管理 / DOI取得 |
| 再生成 | 不可逆（専門医監修は再現不可） |

> **BD-028（本 Council 決定）:**
> Layer 9〜11 は Layer 1〜8 の SSOT を破壊しない形で追加すること。
> Layer 9〜11 のデータは Layer 1〜8 から「完全に独立した上位レイヤー」として管理し、
> 既存 BD-015〜BD-025 の制約を継承する。

---

## Section 4. Participation Loop（議題④）

### 4-A. なぜユーザーは記録を続けるのか

ネットワーク価値はユーザーの「継続記録」によってのみ生まれる。
継続記録を生む Participation Loop は設計しなければ生まれない。

### 4-B. 3層 Participation Loop

```
Layer A: 個人価値ループ（記録 → 洞察 → 記録）
  記録する → 自分のパターンが見える → もっと記録したくなる
  駆動力: 「昨日より1つ多くわかった」という体験
  設計原則: 記録の即時フィードバック（1 Record = 1 Insight の保証）

Layer B: 疾患コミュニティループ（記録 → 同病者接続 → 記録）
  記録する → 同疾患の誰かと繋がれる → コミュニティの価値で記録が続く
  駆動力: 「孤独ではない」という体験（Phase 4 以降）
  設計原則: 匿名性保証のもとでのソフトな接触（住所/名前は永遠に不要）

Layer C: 社会貢献ループ（記録 → 研究貢献 → 記録）
  記録する → あなたのデータが研究に使われた → 社会的意義で記録が続く
  駆動力: 「私の記録が医学の進歩に繋がった」という体験
  設計原則: Consent に基づく透明な研究利用の可視化
```

### 4-C. Participation Loop の崩壊条件（禁止事項）

以下はループを崩壊させるリスクファクターであり、設計上禁止する:

| 崩壊リスク | 禁止事項 |
|---|---|
| フィードバックの遅延 | 記録後に何も表示されない設計 |
| 匿名性への不信 | 個人特定可能なデータの露出 |
| 強制感 | 特定 Signal の記録を強制する設計 |
| 成果の不可視性 | 研究利用の透明性ゼロ |

> **BD-029（本 Council 決定）:**
> Participation Loop の Layer A（個人価値ループ）は Wave1 段階で基盤を確立すること。
> Layer B は Phase 4 以降、Layer C は Phase 5 以降に段階的に開放する。
> ループを崩壊させる設計変更は Founder 承認を必要とする。

---

## Section 5. Trust Evolution（議題⑤）

### 5-A. 信頼の3層構造

IPPOのネットワークが10年間崩れない最大の理由は「信頼の不変設計」にある。
信頼は3層に分解できる:

```
信頼層 1: Consent Immutability（法的信頼）
  根拠: BD-002（ConsentEvent は IMMUTABLE — 削除禁止 / 改ざん禁止）
  意味: ユーザーの同意行為は永遠に証明可能である
  破壊条件: Consent テーブルへの DELETE/UPDATE（絶対禁止）

信頼層 2: Anonymity Guarantee（プライバシー信頼）
  根拠: BD-021（k-anonymity k≥5）
  意味: Research Dataset からの個人特定は設計上不可能である
  破壊条件: k<5 での Dataset 公開（絶対禁止）

信頼層 3: Data Permanence（継続信頼）
  根拠: BD-001（SimilarityEdge 削除禁止）/ BD-022（NetworkSignal 永久保存）
  意味: 「あなたの記録は永遠に残る」という約束
  破壊条件: 永久保存資産のHard Delete（BD-002/BD-019 例外処理以外禁止）
```

### 5-B. 信頼の段階的公開

フェーズが進むにつれて、信頼のステークホルダーが拡大する:

| フェーズ | 信頼の対象 | 信頼の証明手段 |
|---|---|---|
| Phase 1〜2 | 個人ユーザー | アプリ内の Consent 確認画面 |
| Phase 3〜4 | 疾患コミュニティ | 匿名化レポートの透明公開 |
| Phase 5〜6 | 医療機関・研究者 | Research Dataset の品質保証書 / IRB承認 |
| Phase 7 | 国際標準機関 | 論文・外部監査・DOI |

### 5-C. 信頼を壊す「一撃死リスク」

> **BD-030（本 Council 決定）:**
> 以下は発生した時点で IPPO のネットワーク価値を永続的に破壊するリスクとして
> 「ZERO TOLERANCE」とする。いかなる事業上の理由があっても許容しない:
>
> 1. **個人特定可能なデータの意図しない公開**
> 2. **Consent なしの Research Dataset 公開**
> 3. **k-anonymity 未達の Dataset 配布**
> 4. **ユーザー記録の販売（データブローカーへの提供）**
>
> 上記が発生した場合、当該機能の即時停止を Founder 権限で実行すること。

---

## Section 6. AI Evolution（議題⑥）

### 6-A. Wave別 AI 進化ロードマップ

```
Wave2（2027〜2028年）: AI Readiness Phase
  目標: AIが読み取れる形式でデータを整備する
  成果物:
    - NetworkSignal の Supabase 永続化（BD-022）
    - FeatureVector 12次元化（VECTOR_VERSION='2'）
    - Disease Cluster 統計（BD-009）
    - MenstrualPhase 自動判定（BD-014）
  禁止: AI推薦の開始（基盤なしでの推薦は信頼を損なう）

Wave3（2028〜2030年）: AI Foundation Phase
  目標: Feature Store + Signal Embedding の実装
  成果物:
    - Feature Store（Signal の高速参照基盤）
    - Signal Embedding（128次元ベクトル化）
    - RAG基盤（Disease × Symptom Knowledge Graph）
    - AI推薦 v1.0（類似症例推薦 / 実験効果推定）
    - AI Readiness Score: 5/5 達成
  禁止: 専門医監修なしでの診断的推薦

Wave4（2030〜2032年）: Disease Intelligence Phase
  目標: Disease Intelligence Model の構築
  成果物:
    - 疾患進行予測モデル
    - 治療効果推定モデル
    - AI説明可能性レポート（SHAP値等）
    - ラベル付き Research Dataset（専門医監修済み）
  禁止: FDA/薬機法規制を受ける「診断」行為への利用

Wave5（2032〜2035年）: Ontology Phase
  目標: Disease Ontology の構築・公開
  成果物:
    - 女性疾患 Ontology（OWL/RDF候補）
    - 国際疾患分類（ICD-11）との接続設計
    - Disease Intelligence API v1.0（医療機関向け）
  禁止: 国際標準機関の合意なしでの「標準」主張

Wave6（2035〜）: Standard Phase
  目標: 国際標準としての地位確立
  成果物:
    - 査読論文 3件以上への Research Dataset 提供
    - DOI付き Dataset の定期公開（年次）
    - 臨床試験パートナーシップ
  完了定義: Phase 7（STANDARD）の達成
```

### 6-B. AI の「やってはいけない」制約

> **BD-031（本 Council 決定）:**
> IPPO の AI は以下の機能を提供してはならない:
>
> 1. **診断行為**（「あなたは〇〇病です」という断定）
> 2. **治療指示**（「このサプリメントを飲め」という指示）
> 3. **緊急度判定**（「今すぐ病院へ行け」という指示）— 医療資格が必要
>
> IPPO の AI が提供するのは「パターンの提示」と「類似例の共有」のみ。
> 医療行為との境界線は、AIの説明文に「これは医療アドバイスではありません」を
> 永続的に付与することで担保する（Wave3 以降のすべての AI 出力に適用）。

---

## Section 7. Marketplace Evolution（議題⑦）

### 7-A. IPPOのマーケットプレイス設計原則

IPPOが「マーケットプレイス」になるとは、IPPOのデータ・ネットワーク・知識を
第三者が価値化できる基盤を提供することを意味する。

ただし、IPPOのマーケットプレイスは一般的な意味とは異なる:

```
禁止: データ売買（ユーザーデータの直接商品化）
禁止: ユーザーへの広告表示
禁止: 製薬会社への個人データ提供

許可: Disease Intelligence API（集計・匿名化済みデータ）
許可: Research Dataset の研究機関への提供（Consent+IRB+Founder承認）
許可: 医療機関向けの Disease Cluster 統計ダッシュボード
許可: 研究者向けの Dataset ライセンス（有償・IRB必須）
```

### 7-B. マーケットプレイスの4層

```
Layer M1: Patient Network（フェーズ4〜）
  対象: IPPO ユーザー同士の疾患コミュニティ
  価値: 「同じ経験をした人の記録を参照できる」
  収益モデル: プレミアム会員（高度な Similarity 分析）

Layer M2: Research Marketplace（フェーズ5〜）
  対象: 大学・研究機関
  価値: 女性疾患の縦断 Research Dataset
  収益モデル: Dataset ライセンス料（年次更新）

Layer M3: Clinical Intelligence（フェーズ6〜）
  対象: 医療機関・クリニック
  価値: Disease Cluster 統計 / Patient Similarity API
  収益モデル: API サブスクリプション

Layer M4: Global Standard（フェーズ7〜）
  対象: 国際研究機関 / 規制当局
  価値: Disease Ontology / 国際疾患分類への寄与
  収益モデル: 寄贈 / 補助金 / パートナーシップ
```

> **BD-032（本 Council 決定）:**
> マーケットプレイスの各層は、前層の「ネットワーク価値」が確立した後にのみ開放する。
> Layer M1 の Patient Network なしに Layer M2 の Research Marketplace は開放しない。
> 各層の開放条件は Section 1 のフェーズ完了条件に連動する。

---

## Section 8. Founder Moat（議題⑧）

### 8-A. Founder Moat の定義

Founder Moat とは「後から参入した競合が絶対に複製できない資産」である。
IPPOの Founder Moat は技術でも資金でもなく、**「時間軸」**にある。

### 8-B. 3つの時間的優位性

```
Moat 1: 縦断の長さ（Longitudinal Depth）
  「5年間の月経×疾患×症状の縦断データ」は
  後発が今日から集め始めても5年後にしか追いつけない。
  追いつけない理由: 縦断期間は実時間でしか増やせない。

Moat 2: Consent の清潔さ（Consent Purity）
  BD-002（Consent Immutability）を守り続けることで
  「このデータのConsent記録は完璧である」という証明が蓄積される。
  後発が追いつけない理由: 過去の Consent 記録は再取得できない。

Moat 3: Disease Intelligence の深さ（Disease Intelligence Depth）
  「子宮内膜症×痛み×実験結果」の相関は、
  記録数が増えるほど Signal/Noise 比が改善する。
  後発が追いつけない理由: データ量と質の複利効果。
```

### 8-C. Moat を維持する設計原則

| Moat | 維持のための設計原則 |
|---|---|
| 縦断の長さ | Record の永久保存（BD-022）/ Participation Loop の維持 |
| Consent の清潔さ | BD-002 の絶対遵守 / Consent UI のゼロ妥協 |
| Disease Intelligence | k-anonymity の段階的深化 / Research Dataset の品質基準引き上げ |

> **BD-033（本 Council 決定）:**
> Founder Moat の3要素（縦断性 / Consent純潔性 / Disease Intelligence深度）を
> 損なう機能変更は、Founder 承認なしに実装してはならない。
> 具体的には:
> - Record の削除機能の追加（縦断性を損なう）
> - Consent の変更を許す設計の追加（Consent純潔性を損なう）
> - k < 5 での Dataset 公開（Disease Intelligence信頼を損なう）
> の3点は「絶対禁止」として本文書の最高権威で封じる。

---

## Section 9. 10-Year Vision（議題⑨）

### 9-A. 2036年のIPPO

> **「IPPOのデータなしに、女性疾患の研究は成立しない」**

2036年、IPPOは以下の状態にある:

```
データ規模:
  - 縦断 Record: 500万件以上（日本 + アジア主要国）
  - Case ノード: 50万件以上
  - 疾患カバー: 50疾患以上の Disease Cluster
  - 縦断期間: 最長ユーザー 10年以上

ネットワーク:
  - Similarity Graph: 50万ノード × 200万エッジ
  - Disease Cluster: 50+ クラスター / 疾患別統計
  - Research Dataset: v3.0（国際共同研究対応）
  - 査読論文引用: 50件以上

AI:
  - Disease Intelligence Model: Wave4 完成
  - Signal Embedding: 128次元 / 全ユーザーにリアルタイム適用
  - AI推薦精度: 専門医の意見と 85% 一致（内部評価）

信頼:
  - Consent 記録: 全ユーザー分 / 100% Immutable
  - k-anonymity: k≥20（Phase 7 水準）
  - IRB承認: 取得済み（研究利用）
  - 外部監査: 年次実施

社会的位置づけ:
  - Disease Intelligence API: 100機関以上が利用
  - Research Dataset: 年次 DOI 公開（引用可能）
  - Disease Ontology: ICD-11 との接続設計完了
```

### 9-B. 10年間崩れない理由

```
理由 1: データは時間で作られる
  競合が今日から同じことを始めても、
  IPPOの10年分の縦断データには2036年まで追いつけない。

理由 2: Consent の清潔さは替えが効かない
  途中で Consent 設計を変えた競合は
  「過去の Consent 記録が不完全」になる。
  IPPOは BD-002 を守り続けることで
  唯一「最初から最後まで Consent が完璧だった」プラットフォームになる。

理由 3: ネットワーク効果は後から抜けられない
  Phase 4（Similarity UI公開）以降のユーザーは
  「IPPOの中に自分と似た人がいる」という体験を得る。
  この体験は別のアプリに移ることで失われる。

理由 4: Research Dataset の引用は権威を永続化する
  1本の査読論文がIPPOデータを引用した時点で
  「IPPOデータを使った研究がある」という事実は永遠に消えない。
  引用は権威の自己強化ループを生む。
```

---

## Section 10. Binding Decisions（BD-026〜BD-033）

本 Council による新規 Binding Decisions:

| 決定番号 | 内容 | 根拠Section |
|---|---|---|
| **BD-026** | フェーズ移行は完了条件の Founder 確認なしに許可しない | Section 1-B |
| **BD-027** | ネットワーク効果のしきい値未達での外部機能公開を禁止する | Section 2-C |
| **BD-028** | Layer 9〜11 は Layer 1〜8 の SSOT を破壊しない形で追加し、BD-015〜025 を継承する | Section 3-B |
| **BD-029** | Participation Loop の Layer A は Wave1 で確立。Layer B は Phase 4 以降、Layer C は Phase 5 以降 | Section 4-C |
| **BD-030** | 個人特定可能データ公開・Consent なし Dataset 公開・k<5 公開・データ販売は ZERO TOLERANCE | Section 5-C |
| **BD-031** | IPPO の AI は診断行為・治療指示・緊急度判定を提供してはならない | Section 6-B |
| **BD-032** | マーケットプレイスの各層は前層の確立後にのみ開放する（Section 1 のフェーズ完了条件に連動） | Section 7-B |
| **BD-033** | Founder Moat の3要素を損なう変更（Record削除機能 / Consent変更許容 / k<5公開）は絶対禁止 | Section 8-C |

---

## Section 11. Wave2 設計インプット

本 Council の決定が Wave2 実装に与える設計インプット:

| Wave2 実装対象 | 本 Council からの設計制約 |
|---|---|
| NetworkSignal Supabase 永続化 | BD-022 + BD-028（Layer 1〜8 SSOT 維持） |
| Disease Cluster Foundation | Phase 3 完了条件（k≥50 クラスター）を設計目標にすること |
| FeatureVector 12次元化 | BD-010（VECTOR_VERSION='2'）/ BD-028 継承 |
| MenstrualPhase 自動判定 | Participation Loop Layer A の強化（BD-029） |
| Emotion Signal Foundation | Signal 密度向上による ネットワーク価値軸3（BD-027 準拠） |
| Event Sourcing 拡張 | BD-017（Immutable）/ BD-030（ZERO TOLERANCE） |
| Similarity UI 公開準備 | BD-026（Phase 3 完了後のみ Phase 4 開始許可） |

---

## Section 12. PR-041+ 設計インプット

PR-041 以降の実装 PR が参照すべき本 Council の決定:

| PR 想定範囲 | 参照すべき BD |
|---|---|
| PR-041: NetworkSignal Supabase 移行 | BD-022 / BD-016 / BD-028 |
| PR-042: Disease Cluster 統計 | BD-009 / BD-026（Phase 3 条件）/ BD-027 |
| PR-043: FeatureVector V2 | BD-010 / BD-011 / BD-028 |
| PR-044: Similarity UI 基盤 | BD-026 / BD-027 / BD-029 / BD-030 |
| PR-04x: AI Foundation（Wave3入口） | BD-028 / BD-031 / BD-029 Layer B |
| PR-04x: Research Dataset 公開準備 | BD-021 / BD-030 / BD-032 |

> **PR-041+ の設計原則（本 Council 決定）:**
> 各 PR は実装開始前に「この PR が本 Council の BD-026〜BD-033 に違反していないか」を
> チェックリストで確認すること。違反の疑いがある場合は Founder に諮ること。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-004 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-27 |
| **承認** | Founder |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT |
| **前提文書** | IPPO-GOV-001 v1.3 / IPPO-COUNCIL-002 / IPPO-COUNCIL-003 |
| **Binding Decisions** | BD-026〜BD-033（8件）|
| **次回改訂トリガー** | Phase 3（DiseaseCluster 実体化）完了時 |
| **設計スコープ** | 10年間のネットワーク進化設計（実装仕様ではない） |

---

**NETWORK EVOLUTION COUNCIL — 議決完了 2026-06-27**
**承認: Founder**
