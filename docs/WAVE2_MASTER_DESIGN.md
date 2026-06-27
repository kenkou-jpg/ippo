# WAVE2 MASTER DESIGN
## IPPO Wave2 全体設計憲法

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は Wave2（PR-041以降）のすべての設計・実装の上位制約である。
> PR-041以降のすべてのPR仕様は本文書と矛盾してはならない。
> 矛盾が生じた場合、本文書が正とする。
>
> **前提文書（すべて既読・準拠済み）:**
> - IPPO-GOV-001 v1.3（LEGACY ASSET INVENTORY / BD-001〜BD-014）
> - IPPO-COUNCIL-002（NETWORK ASSET COUNCIL / BD-009〜BD-014）
> - IPPO-COUNCIL-003（DATA ASSET COUNCIL / BD-015〜BD-025）
> - IPPO-COUNCIL-004（NETWORK EVOLUTION COUNCIL / BD-026〜BD-033）

---

**文書番号:** IPPO-COUNCIL-005
**開催体:** Founder Council × Platform Architect × Principal Product Architect × AI Platform Designer（合同会議）
**開催日:** 2026-06-27
**承認:** Founder
**スコープ:** PR-041〜PR-N（Wave2完了まで）

---

## 1. Executive Summary

Wave1（PR-001〜PR-040）はIPPOの**Network Asset Foundation**を完成させた。
Wave1終了時点で、IPPOは以下を保有している:

| 資産 | 状態 |
|---|---|
| Record Foundation（8層 Layer 1〜8） | 完了 |
| NetworkSignal 6種（SYMPTOM/PAIN/MENSTRUAL/EMOTION/SLEEP/EXPOSURE）| 完了（in-memory） |
| Disease Entity Foundation | 完了 |
| Signal Intelligence（集約/トレンド/タイムライン）| 完了 |
| Longitudinal Analysis（MovingAverage/Baseline/Window）| 完了 |
| FeatureVector（8次元 / VECTOR_VERSION='1'）| 完了 |
| Similarity Engine（Cosine / 8次元 / Wave1非公開）| 完了 |
| Event Sourcing（EventStore / EventBus / EventPublisher）| 完了 |
| Emotion Signal Foundation | 完了 |
| Menstrual Intelligence Foundation | 完了 |
| Research Dataset Foundation（k-anonymity / JSON/CSV）| 完了 |

しかし Wave1 の資産は**まだ「孤島」**である。
NetworkSignal は in-memory（セッション終了で消滅）。
Disease Entity は構造化されていない（diseaseKey 文字列）。
Similarity はユーザーに見えていない。
AI はまだ存在しない。
ネットワーク効果は発生していない。

**Wave2 の使命は「孤島を大陸に変えること」である。**

Wave2 が完了した時点で、IPPO は:
- すべてのデータが Supabase に永続化され、セッションをまたいで蓄積される
- Disease Cluster が統計的に意味を持ち始める
- 類似症例がユーザーに届く準備が整う
- Research Dataset が学術的に利用可能な品質に達する
- AI が「Signal Insight」と「Pattern Discovery」の役割を担い始める
- Knowledge Graph の骨格が存在する

これが Wave2 の完成形である。

---

## 2. Wave2 Vision

### 2-A. Wave2 の一文定義

> **Wave2 は「蓄積したデータをつなぐ」フェーズである。**
> Wave1 が「記録する基盤」を作ったとすれば、
> Wave2 は「記録されたものが価値を持ち始める基盤」を作る。

### 2-B. Wave1 との差分

| 観点 | Wave1（完了） | Wave2（目標） |
|---|---|---|
| データ永続化 | NetworkSignal は in-memory | NetworkSignal → Supabase 永久保存 |
| Disease | diseaseKey 文字列 | Disease Entity フル構造体 |
| Disease Cluster | 暗黙的（diseaseKey による分類のみ） | DiseaseClusterService 実体化 |
| FeatureVector | 8次元（VECTOR_VERSION='1'）| 12次元（VECTOR_VERSION='2'）|
| Similarity | 計算済み / UI 非公開 | UI 公開準備完了（Phase 4 入口）|
| Emotion Signal | エンティティ定義のみ（生成なし）| Record 保存時に自動生成（BD-024）|
| MenstrualPhase | UNKNOWN 固定 | 自動判定（BD-014）|
| Longitudinal on Edge | なし（Wave1禁止 BD-012）| Longitudinal Context をエッジに付与 |
| Event Sourcing | in-memory のみ | ippo_events テーブル（Supabase Immutable）|
| Knowledge Graph | なし | 骨格（Disease × Symptom × Outcome）|
| AI | なし | Signal Insight / Pattern Discovery（補助限定）|
| Research Platform | 基盤のみ | Feature Store / Cohort Builder / Dataset Version |
| 公開状態 | Similarity 非公開 | Similarity 公開条件成立 |

### 2-C. Wave2 の設計哲学

```
Wave1: 「記録する」
Wave2: 「つなぐ」
Wave3: 「推薦する」（次フェーズ）
```

Wave2 のすべての設計判断は「データをつなぐことで価値が増すか」を基準に下す。
孤立したデータポイントをネットワーク上の意味あるノードに変えることが Wave2 の本質である。

---

## 3. Wave2 Goals

Wave2 では以下の 10 目標を達成する。すべて必達とする。

| # | 目標 | 根拠 BD |
|---|---|---|
| G-01 | NetworkSignal の Supabase 永続化 | BD-022 |
| G-02 | Disease Entity フル構造体（ICD対応）| BD-004 |
| G-03 | Disease Cluster サービス実体化（k≥50 クラスター）| BD-009 |
| G-04 | FeatureVector 12次元化（VECTOR_VERSION='2'）| BD-010 / BD-012 |
| G-05 | Emotion Signal の Record → Signal 自動生成 | BD-024 |
| G-06 | MenstrualPhase 自動判定 | BD-014 |
| G-07 | ippo_events テーブル（Supabase Immutable）| BD-017 |
| G-08 | Knowledge Graph 骨格（Disease × Symptom × Outcome）| BD-028 |
| G-09 | AI Platform 基盤（Signal Insight / Pattern Discovery）| BD-031 |
| G-10 | Research Platform 強化（Feature Store / Cohort / Dataset Version）| BD-021 |

---

## 4. Wave2 Success Definition（構造で定義）

Wave2 の成功を数値でなく**構造**で定義する。

### 4-A. データ永続性の確立

```
成功条件:
  Record を保存した瞬間に、以下が自動的に永続化される:
    └ Layer 2: NetworkSignal（6種 / Supabase）
    └ Layer 2: EmotionSignal（自動生成）
    └ Domain Event（ippo_events / Supabase Immutable）

  セッションを終了しても、再起動しても、すべてのデータが残る。
  in-memory 状態のデータがゼロである。
```

### 4-B. Disease Intelligence の確立

```
成功条件:
  DiseaseEntity が構造体として存在する（diseaseKey 文字列ではない）:
    └ id / icdCode / category / severity / diagnosedAt / confirmedBy

  DiseaseClusterService が機能する:
    └ 同一 diseaseKey の Case 群を統計的にプロファイリングできる
    └ クラスター内 Signal 平均 / パーセンタイル / 優位フェーズ を返せる

  知識グラフに Disease ノードが存在し、Symptom ノードとエッジで繋がっている。
```

### 4-C. Feature Intelligence の確立

```
成功条件:
  FeatureVector が 12 次元になっている（VECTOR_VERSION='2'）:
    └ Wave1 互換 8 次元 + PAIN_SCORE + MENSTRUAL_REGULARITY + SLEEP_SCORE + LONGITUDINAL_DELTA

  Longitudinal Context がエッジに付与されている:
    └ SimilarityEdge.longitudinalContext が存在する
    └ sourceTrend / targetTrend / trendMatch / trendBonus が計算される

  MenstrualPhase が自動判定される（UNKNOWN ではなく実フェーズ）:
    └ MenstrualService が cycleDay から Phase を決定論的に計算する
```

### 4-D. Knowledge Graph の骨格存在

```
成功条件:
  以下のノードが存在する:
    └ DiseaseNode（疾患）
    └ SymptomNode（症状）
    └ OutcomeNode（実験結果）

  以下のエッジが存在する:
    └ Disease —[HAS_SYMPTOM]→ Symptom
    └ Symptom —[OBSERVED_IN]→ Disease
    └ Case —[LINKED_TO]→ Disease
    └ Outcome —[RESULTED_FROM]→ Experiment

  Knowledge Graph は Layer 8 Research Dataset から構築される
  （Layer 1 が消えても骨格は残る / ただし更新は停止する）
```

### 4-E. AI Platform の基盤存在

```
成功条件:
  AI が以下の補助機能を提供できる状態になっている（診断禁止 / BD-031）:
    └ Signal Insight: 「今週のあなたの痛みスコアは3週間前比 +0.3 上昇しています」
    └ Pattern Discovery: 「あなたの症状は黄体期に集中するパターンがあります」

  AI が以下を提供していない（禁止）:
    └ 診断
    └ 治療指示
    └ 緊急度判定
```

### 4-F. Research Platform の実用性確立

```
成功条件:
  研究者が以下の操作を行える（Founder 承認 + IRB 準備済み）:
    └ Cohort Builder でコホートを定義できる
    └ 定義したコホートの Research Dataset を生成できる
    └ Dataset に Version ID と DOI-候補番号が付与される
    └ JSON / CSV の Export が動作する
```

---

## 5. Architecture Extension

### 5-A. Wave2 で追加するドメイン一覧

| ドメイン | 分類 | 担う責務 |
|---|---|---|
| `persistence/` | Infrastructure | Supabase 永続化共通層（Wave1 in-memory → Supabase 移行） |
| `disease-entity/` | Domain（昇格）| Disease Entity フル構造体（BD-004）|
| `disease-cluster/` | Domain（拡張）| DiseaseCluster 統計サービス（BD-009）|
| `knowledge-graph/` | Domain（新設）| Knowledge Graph ノード/エッジ管理 |
| `feature-store/` | Domain（新設）| Signal Embedding + Feature 高速参照 |
| `cohort/` | Domain（新設）| Cohort Builder + Research Query |
| `dataset-version/` | Domain（拡張）| Research Dataset バージョン管理 |
| `ai-insight/` | Domain（新設）| Signal Insight / Pattern Discovery（補助限定）|
| `observation/` | Domain（新設）| Observation Note（定性記録層）|
| `environmental-signal/` | Domain（新設）| Environmental Signal（月齢等 / バックグラウンド）|

### 5-B. Wave2 で追加するサービス一覧

| サービス | 責務 |
|---|---|
| `NetworkSignalPersistenceService` | in-memory → Supabase 移行の仲介 |
| `DiseaseEntityUpgradeService` | diseaseKey → DiseaseEntity 昇格ロジック |
| `DiseaseClusterStatisticsService` | クラスター内 Signal 集計・パーセンタイル |
| `MenstrualPhaseResolverService` | cycleDay → MenstrualPhase 決定論的変換 |
| `EmotionSignalGeneratorService` | moodScore → EmotionSignal 自動生成（BD-024）|
| `LongitudinalEdgeEnricher` | SimilarityEdge に longitudinalContext を付与 |
| `FeatureVectorV2Builder` | 12次元 FeatureVector 構築（VECTOR_VERSION='2'）|
| `KnowledgeGraphService` | ノード/エッジの CRUD（Append-Only）|
| `FeatureStoreService` | Signal 特徴量の高速参照・バージョン管理 |
| `CohortBuilderService` | Research Query → コホート定義 → Dataset 生成 |
| `DatasetVersionService` | Research Dataset のバージョン管理・引用 ID 付与 |
| `SignalInsightService` | Signal 変化の自然言語サマリー生成（AI補助）|
| `PatternDiscoveryService` | 個人 Signal パターンの発見（AI補助）|
| `ObservationService` | 定性 Observation Note の管理 |
| `EnvironmentalSignalCollector` | Record 保存時に月齢等メタデータを自動付与 |
| `EventPersistenceService` | ippo_events テーブルへのイベント永続化 |

### 5-C. Wave2 で追加するリポジトリ

| リポジトリ | 対応テーブル | 方針 |
|---|---|---|
| `NetworkSignalRepository`（Supabase移行）| `network_signals` | Wave1 in-memory IF を継承、永続化層を差し替え |
| `DiseaseEntityRepository`（昇格）| `user_diseases`（拡張）| 既存テーブルに ICD / category カラム追加 |
| `DiseaseClusterRepository` | `disease_cluster_snapshots` | Append-Only Snapshot |
| `EventPersistenceRepository` | `ippo_events` | Immutable / INSERT のみ（BD-017）|
| `KnowledgeGraphRepository` | `kg_nodes` / `kg_edges` | Append-Only グラフ |
| `FeatureStoreRepository` | `feature_vectors_v2` | vectorVersion 分離 |
| `CohortRepository` | `research_cohorts` | コホート定義の永続化 |
| `DatasetVersionRepository` | `research_dataset_versions` | バージョン管理 |
| `ObservationRepository` | `observation_notes` | Append-Only |

### 5-D. Wave2 で追加する Snapshot

| Snapshot | 生成タイミング | 保存世代 |
|---|---|---|
| `DiseaseClusterSnapshot` | 週次 / Disease Entity 変化時 | 12週分 |
| `FeatureVectorV2Snapshot` | VECTOR_VERSION='2' 計算時 | Case ごと永久 |
| `KnowledgeGraphSnapshot` | 月次 / 重大変更時 | 全履歴 |
| `CohortSnapshot` | コホート確定時 | 全世代 |
| `EnvironmentalSignalSnapshot` | 日次（Record 保存バッチ）| 90日分 |

### 5-E. Wave2 で追加する Domain Events

現行 15 イベントに以下を追加する:

| イベント | 集約ドメイン | トリガー |
|---|---|---|
| `DISEASE_ENTITY_UPGRADED` | DISEASE | diseaseKey → DiseaseEntity 昇格時 |
| `DISEASE_CLUSTER_COMPUTED` | DISEASE | DiseaseClusterSnapshot 生成時 |
| `FEATURE_VECTOR_V2_CREATED` | SIMILARITY | VECTOR_VERSION='2' FeatureVector 生成時 |
| `KNOWLEDGE_GRAPH_NODE_ADDED` | KNOWLEDGE | KnowledgeGraph ノード追加時 |
| `KNOWLEDGE_GRAPH_EDGE_ADDED` | KNOWLEDGE | KnowledgeGraph エッジ追加時 |
| `COHORT_DEFINED` | RESEARCH | CohortBuilder 確定時 |
| `DATASET_VERSION_PUBLISHED` | RESEARCH | Research Dataset バージョン公開時 |
| `OBSERVATION_CREATED` | RECORD | Observation Note 追加時 |
| `ENVIRONMENTAL_SIGNAL_RECORDED` | RECORD | 環境シグナル自動付与時 |
| `EMOTION_SIGNAL_GENERATED` | SIGNAL | Emotion Signal 自動生成時（BD-024）|
| `MENSTRUAL_PHASE_RESOLVED` | MENSTRUAL | Phase 自動判定時 |
| `LONGITUDINAL_EDGE_ENRICHED` | SIMILARITY | Longitudinal Context エッジ付与時 |

合計: 15 + 12 = **27 Domain Event Types**

---

## 6. Domain Expansion（優先順位付き）

### Priority 1 — Wave2 開始即時（PR-041〜PR-050相当）

これらは Wave2 の「土台」であり、後続すべてのドメインが依存する:

| ドメイン | 理由 |
|---|---|
| **NetworkSignal Persistence（Supabase）** | BD-022 / 全 Signal 資産がこれに依存 |
| **ippo_events Persistence（Supabase）** | BD-017 / Event Sourcing の永続化層 |
| **Emotion Signal Generation** | BD-024 / Signal 6種が初めて揃う |
| **MenstrualPhase Auto-Resolution** | BD-014 / Phase 情報が Signal に付与される |
| **Disease Entity Upgrade** | BD-004 / Disease Cluster / Knowledge Graph の前提 |

### Priority 2 — Wave2 中盤（PR-051〜PR-060相当）

Priority 1 の完了後に着手:

| ドメイン | 理由 |
|---|---|
| **Disease Cluster Statistics** | BD-009 / クラスター統計が Signal 永続化後に意味を持つ |
| **FeatureVector V2（12次元）** | BD-010 / Signal Persistence + Phase 解決が前提 |
| **Longitudinal Edge Enricher** | BD-012 / FeatureVector V2 が前提 |
| **Knowledge Graph Skeleton** | Disease Entity + Symptom が整備後に構築 |
| **Environmental Signal Collector** | Record 保存時の自動付与（バックグラウンド）|

### Priority 3 — Wave2 後半（PR-061〜PR-070相当）

| ドメイン | 理由 |
|---|---|
| **Feature Store** | Knowledge Graph + FeatureVector V2 が前提 |
| **Cohort Builder** | Feature Store + Research Dataset V2 が前提 |
| **Dataset Version Management** | Cohort Builder の出力を管理 |
| **AI Signal Insight** | Feature Store が前提 |
| **AI Pattern Discovery** | 個人 Longitudinal データが蓄積後 |
| **Observation Note** | 定性記録層。Record 拡張として後半に追加 |

### Priority 4 — Wave2 出口（PR-071〜PR-N相当）

| ドメイン | 理由 |
|---|---|
| **Similarity UI 公開準備** | BD-026（Phase 3 完了条件の検証後）|
| **Research Dataset V2** | Dataset Version + k-anonymity 強化 |
| **Wave2 Exit Audit** | Section 12 の Exit Criteria 検証 |

---

## 7. Knowledge Architecture

Wave1 で確立したデータ連鎖を Wave2 で Layer 9〜11 まで延伸する（BD-028 準拠）:

### 7-A. 完全知識連鎖

```
Layer 0: RAW INPUT（保存しない）
    ↓ UI入力 → RecordCommandService
Layer 1: RECORD（永久保存 / SSOT / 再生成不可）
    ↓ saveRecord() → NetworkSignalService.generateFromRecord()
Layer 2: NETWORK SIGNAL（Supabase永久保存 / Wave2で完成 / BD-022）
              ↓ 自動付与: EmotionSignal（BD-024）/ EnvironmentalSignal
    ↓ aggregate() / longitudinal() / phaseResolve()
Layer 6: INTELLIGENCE LAYER（再計算可能）
    ↓ FeatureVectorV2Builder.build()
Layer 4: FEATURE VECTOR V2（12次元 / VECTOR_VERSION='2'）
    ↓ SimilarityEngine.compute() + LongitudinalEdgeEnricher
Layer 7: NETWORK LAYER（SimilarityEdge + longitudinalContext）
    ↓ DiseaseClusterStatisticsService
Layer 3: DISEASE ENTITY FULL（Disease Cluster / Wave2で完成）
    ↓ anonymize(k≥5) + CohortBuilderService
Layer 8: RESEARCH ASSET（版管理 / DOI候補付与 / Wave2で強化）
    ↓ KnowledgeGraphService.build()（Wave2）
Layer 9: KNOWLEDGE GRAPH（Disease × Symptom × Outcome / Wave2骨格）
    ↓ FeatureStoreService.embed()（Wave3）
Layer 10: FEATURE STORE / SIGNAL EMBEDDING（Wave3）
    ↓ DiseaseIntelligenceModel.train()（Wave4）
Layer 11: DISEASE INTELLIGENCE MODEL（Wave4）
    ↓ DiseaseOntology.map()（Wave5〜）
Layer 12: DISEASE ONTOLOGY（Wave5〜 / 国際標準候補）
```

### 7-B. 各 Layer の Wave2 アクション

| Layer | Wave1 状態 | Wave2 アクション |
|---|---|---|
| Layer 1（Record）| 完了 | 変更なし。SSOT として維持 |
| Layer 2（NetworkSignal）| in-memory | **Supabase 永続化（最優先 / BD-022）**|
| Layer 3（Disease Entity）| diseaseKey 文字列 | **フル構造体に昇格（BD-004）**|
| Layer 4（FeatureVector）| 8次元 V1 | **12次元 V2 に拡張（BD-010）**|
| Layer 5（Case）| 完了 | 変更なし |
| Layer 6（Intelligence）| 完了（in-memory計算）| Signal 永続化後に再計算の信頼性が上がる |
| Layer 7（Network）| Edge 存在（Longitudinal未付与）| **Longitudinal Context 付与（BD-012）**|
| Layer 8（Research）| 基盤のみ | **Dataset Version / Cohort Builder で強化** |
| Layer 9（Knowledge Graph）| なし | **Wave2 で骨格構築（Disease×Symptom×Outcome）**|
| Layer 10（Feature Store）| なし | Wave3 スコープ |
| Layer 11（AI Model）| なし | Wave4 スコープ |

### 7-C. 決定論的再構築保証（BD-015 / BD-020 継承）

Wave2 で Layer を拡張しても、以下の保証を維持すること:

```
Layer 1（Record）が存在すれば、Layer 2〜9 のすべてを決定論的に再構築できる。

Layer 9（Knowledge Graph）の再構築:
  Record → Signal → FeatureVector → Case → Similarity → Research Dataset → Knowledge Graph
  このチェーンは Wave2 完了後も変わらない。
  Knowledge Graph の破損・消失は Research Dataset から再構築できる。
```

---

## 8. AI Platform Design

### 8-A. Wave2 における AI の役割定義

Wave2 の AI は「**補助・洞察支援・パターン提示**」に限定する（BD-031 継承）。
AI は「答え」を出すのではなく、「問い」を投げかける存在である。

```
AI の使命（Wave2）:
  「あなたが気づいていないあなたのパターンを、データから見つける」

AI の禁止事項（BD-031 / 絶対禁止）:
  × 診断（「あなたは〇〇病です」）
  × 治療指示（「このサプリを飲め」）
  × 緊急度判定（「今すぐ病院へ」）
```

### 8-B. Wave2 AI 機能の詳細設計

#### 機能 AI-01: Signal Insight（シグナル洞察）

```
責務: ユーザーの Signal 変化を自然言語でサマリーする

入力: ユーザーの NetworkSignal[] (直近 30日)
出力: { insight: string, signalType: SignalType, trend: TrendDirection,
        comparisonWindow: string, confidence: 'LOW'|'MEDIUM'|'HIGH' }

例:
  「今週の痛みスコアの平均は 6.2 で、3週間前（平均 4.8）より 1.4 上昇しています」
  「黄体期（Day 17〜28）に PAIN シグナルが集中するパターンが確認されています（8/10回）」

実装方針: ルールベース + テンプレート文（LLM は Wave3 以降）
禁止: 「これは子宮内膜症の悪化サインです」（診断的解釈禁止）
```

#### 機能 AI-02: Pattern Discovery（パターン発見）

```
責務: 個人の Signal パターンを発見し、気づきを提示する

入力: ユーザーの全 Signal 履歴 / MenstrualPhase 情報
出力: { pattern: PatternType, evidence: Evidence[], summary: string }

PatternType:
  'PHASE_CORRELATION'     — 特定フェーズと特定 Signal の相関
  'SIGNAL_CO_OCCURRENCE'  — 複数 Signal の同時発生パターン
  'EXPERIMENT_RESPONSE'   — 実験前後の Signal 変化パターン
  'LONGITUDINAL_TREND'    — 長期トレンドパターン

例:
  「あなたの睡眠スコアが低い翌日は、痛みスコアが平均 1.2 高い傾向があります（相関係数 0.73）」

実装方針: 統計的相関計算（ルールベース）。LLM なしで実装可能。
禁止: 「睡眠不足が痛みの原因です」（因果断定禁止）
```

#### 機能 AI-03: Case Recommendation（症例推薦）

```
責務: ユーザーに「自分と似た記録パターンを持つ匿名化された症例」を提示する

入力: ユーザーの FeatureVector V2 / diseaseKey
出力: { similarCases: AnonymizedCase[], matchReason: string[] }

匿名化要件:
  - k-anonymity k≥5 適用後の Case 集合のみ提示（BD-021）
  - 個人特定情報を含まない（BD-030）
  - 「一致した特徴」のみを自然言語で説明

例:
  「あなたと類似したパターンを持つ症例が 12 件見つかりました。
   共通点: 子宮内膜症 / 黄体期の痛みスコア高 / 睡眠スコア低 / 食事介入の実験経験あり」

公開条件: BD-026（Phase 3 完了条件を Founder が確認後のみ）
```

#### 機能 AI-04: Similar Case Search（類似症例検索）

```
責務: Disease Cluster 内で「特定の Signal パターンを持つ症例」を探す研究者向けクエリ

対象: admin:research 権限保持者のみ
入力: SearchQuery { signalType[], phaseFilter?, minScore? }
出力: { cases: AnonymizedCase[], clusterProfile: ClusterProfile }

実装方針: SimilarityEngine の拡張。LLM なし。
禁止: 個人を特定できる検索結果の返却（BD-030 / ZERO TOLERANCE）
```

#### 機能 AI-05: Research Assistance（研究補助）

```
責務: 研究者が Research Dataset を分析する際の補助統計を提供する

対象: admin:research 権限保持者のみ
入力: DatasetId / CohortId
出力: { descriptiveStats, signalCorrelations, clusterComparison, evidenceSummary }

禁止: Dataset からの因果推論の自動生成（相関のみ提示）
```

### 8-C. AI の段階的展開

| Wave | AI 機能 | 手法 |
|---|---|---|
| Wave2 | Signal Insight / Pattern Discovery / Case Recommendation | ルールベース + 統計計算 |
| Wave2 後半 | Similar Case Search / Research Assistance | 統計クエリ拡張 |
| Wave3 | Signal Embedding / Feature Store 連携 | ML モデル（外部 LLM 連携開始）|
| Wave4 | Disease Intelligence Model | 専用 ML モデル |
| Wave5〜 | Disease Ontology への昇格 | 専門医監修 |

---

## 9. Research Platform Design

### 9-A. Wave2 Research Platform の構成

```
Research Platform（Wave2）:

  ┌─────────────────────────────────────────────────┐
  │ Feature Store（信号特徴量の高速参照）              │
  │   └ Signal[] → Feature Matrix → 特徴量キャッシュ  │
  └─────────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────────┐
  │ Cohort Builder（研究コホートの定義）               │
  │   └ Query: diseaseKey + signalFilter + phaseFilter │
  │   └ Output: CohortDefinition（ID + 条件 + Case数） │
  └─────────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────────┐
  │ Research Dataset Generator（データセット生成）     │
  │   └ Cohort → anonymize(k≥5) → Dataset            │
  │   └ format: JSON / CSV / PARQUET(Wave3-stub)      │
  └─────────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────────┐
  │ Dataset Version Manager（バージョン管理）          │
  │   └ versionId: IPPO-DATASET-{TYPE}-v{N}-{DATE}  │
  │   └ doi_candidate: 将来の DOI 申請用 ID           │
  │   └ Append-Only（過去バージョンの変更禁止）         │
  └─────────────────────────────────────────────────┘
            ↓
  ┌─────────────────────────────────────────────────┐
  │ Evidence Layer（エビデンス集約）                   │
  │   └ Dataset + ClusterStats + PatternEvidence     │
  │   └ 将来の論文引用メタデータの基盤                  │
  └─────────────────────────────────────────────────┘
```

### 9-B. Feature Store 設計方針

```
目的:
  Signal の特徴量を高速に参照できるキャッシュ層
  （ML モデルへの入力として Wave3 以降に使う）

Wave2 の Feature Store スコープ:
  - 入力: NetworkSignal[]（Supabase 永続化済み）
  - 出力: FeatureMatrix { userId, diseaseKey, features: Record<string, number> }
  - 永続化: feature_vectors_v2 テーブル（vectorVersion='2' で分離）
  - 更新: Record 保存時に自動更新

Wave2 Feature 定義（最低限）:
  - avg_pain_30d: 30日平均痛みスコア
  - avg_sleep_30d: 30日平均睡眠スコア
  - avg_symptom_30d: 30日平均症状スコア
  - menstrual_regularity: 月経周期規則性スコア
  - longitudinal_delta_pain: 痛みの30日前比変化
  - phase_pain_distribution: フェーズ別痛みスコア分布（4値）

Wave3 追加予定:
  - Signal Embedding（128次元ベクトル）
  - Cross-Signal Correlation（Signal 間相関行列）
```

### 9-C. Cohort Builder 設計方針

```
Cohort の定義:
  「特定の属性と Signal パターンを持つ Case の集合」

CohortDefinition:
  cohortId:    string（UUID）
  name:        string
  description: string
  filters:
    diseaseKeys:     string[]   — 対象疾患
    signalFilters:   SignalFilter[]  — Signal 条件
    phaseFilters:    MenstrualPhase[]  — 月経フェーズ
    dateRange:       { from, to }
    minRecordCount:  number      — 最低 Record 数
    minDuration:     number      — 最低縦断期間（日）
  estimatedCaseCount: number    — フィルタ適用後の推定 Case 数
  kAnonymityVerified: boolean   — k≥5 確認済み
  createdAt:   string
  createdBy:   'Founder'（BD-021 準拠）

禁止事項:
  - k < 5 のコホートの Dataset 生成（BD-030）
  - 個人特定可能な条件でのフィルタリング（BD-030）
```

### 9-D. Dataset Version 命名規則

既存（Wave1）の命名規則を継承・拡張する:

```
IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}

TYPEの定義:
  LONGITUDINAL  — 縦断患者データセット（Record × Signal × Disease × Case）
  DISEASE       — 疾患インテリジェンスデータセット（Case × SimilarityEdge × Cluster）
  SIGNAL        — シグナルパターンデータセット（NetworkSignal 集計）
  COHORT-{ID}   — Cohort Builder で定義した特定コホートのデータセット

例:
  IPPO-DATASET-LONGITUDINAL-v1.0-20261231
  IPPO-DATASET-DISEASE-v1.0-20261231
  IPPO-DATASET-COHORT-abc123-v1.0-20270101

バージョンポリシー:
  MAJOR: 匿名化アルゴリズムの変更 / 構造的変更
  MINOR: フィルタ追加 / 期間更新 / 品質向上
  バージョン固定後の内容変更禁止（新バージョンを別途発行）
```

---

## 10. Knowledge Graph Design

### 10-A. Knowledge Graph の位置づけ

Knowledge Graph は Layer 9（Section 7-A 参照）に位置する。
Layer 8（Research Dataset）から抽出された構造化知識をグラフ形式で表現する。

```
Knowledge Graph の本質:
  「女性疾患に関する構造化された因果・相関の地図」

Wave2 スコープ: 骨格のみ（Disease × Symptom × Outcome）
Wave3 スコープ: Signal Embedding との統合
Wave4 スコープ: AI モデルへの Knowledge 注入
Wave5 スコープ: ICD-11 / 国際疾患分類との接続
```

### 10-B. ノード定義

Wave2 で実装するノード:

| ノード型 | 識別子 | 必須属性 | Wave2 実装 |
|---|---|---|---|
| `DiseaseNode` | diseaseKey / icdCode | name / category / severity / prevalence | ✓ |
| `SymptomNode` | symptomId | name / category / signalType | ✓ |
| `OutcomeNode` | outcomeId | type（IMPROVED/WORSENED/NEUTRAL）/ experimentType | ✓ |
| `PhaseNode` | phaseId | phaseName（MENSTRUAL/FOLLICULAR/OVULATION/LUTEAL）| ✓ |
| `SignalPatternNode` | patternId | signalType / trend / threshold | ✓ |
| `CaseNode` | caseId（匿名化）| diseaseKey / tierLevel / vectorVersion | Phase4以降 |
| `TreatmentNode` | treatmentId | type / description | Wave3 |
| `BiomarkerNode` | biomarkerId | source / unit | Wave4 |

### 10-C. エッジ定義

Wave2 で実装するエッジ:

| エッジ型 | 始点 → 終点 | 属性 | 意味 |
|---|---|---|---|
| `HAS_SYMPTOM` | Disease → Symptom | frequency / evidenceCount | 疾患が症状を持つ |
| `OBSERVED_IN` | Symptom → Disease | correlationScore | 症状が疾患で観察される |
| `WORSE_IN_PHASE` | Symptom → Phase | avgScore / sampleCount | 症状がフェーズで悪化する |
| `LEADS_TO_OUTCOME` | Symptom → Outcome | via（Experiment.type）| 症状→実験→結果の連鎖 |
| `COMORBID_WITH` | Disease → Disease | coOccurrenceRate | 疾患の併存 |
| `SIGNAL_INDICATES` | SignalPattern → Disease | sensitivity / specificity | シグナルが疾患を示唆（診断禁止。「示唆」のみ）|
| `IMPROVES_OUTCOME` | Treatment → Outcome | successRate（Wave3）| 治療が結果を改善（Wave3）|

### 10-D. Knowledge Graph の設計原則

```
原則 1: Append-Only
  既存ノード / エッジの DELETE は禁止。
  エビデンスが否定された場合は confidence スコアを下げる（DELETE しない）。

原則 2: Evidence-Backed
  すべてのエッジには evidence_count と last_updated を付与する。
  evidence_count < 5 のエッジは 'LOW_CONFIDENCE' フラグを立てる。

原則 3: Version-Controlled
  Knowledge Graph 全体に snapshot_version を付与する。
  月次で KnowledgeGraphSnapshot を生成し、引用可能にする。

原則 4: SSOT 分離
  Knowledge Graph は Layer 8（Research Dataset）から「読み取る」存在。
  Knowledge Graph から Layer 1〜8 のデータを「書き換える」ことは禁止。

原則 5: 診断的解釈禁止
  SignalPattern → Disease エッジは「相関」であり「因果」ではない。
  UI に表示する場合は必ず「これは医療アドバイスではありません」を付与すること（BD-031）。
```

### 10-E. Knowledge Graph バージョン管理

```
KnowledgeGraphVersion:
  version:        string（例: 'KG-v1.0-20261231'）
  nodeCount:      number
  edgeCount:      number
  diseaseCount:   number
  symptomCount:   number
  evidenceCount:  number
  snapshotAt:     ISO8601
  basedOnDataset: DatasetVersionId（どの Research Dataset から構築されたか）

バージョンポリシー:
  v1.x: Wave2 骨格（Disease × Symptom × Outcome）
  v2.x: Wave3 拡張（Treatment / Biomarker 追加）
  v3.x: Wave4（AI モデルへの接続）
```

---

## 11. Technical Debt Policy

### 11-A. Wave2 で許容する技術負債

以下は Wave2 中に解消しなくてよい:

| 負債 | 許容理由 | 解消目標 |
|---|---|---|
| app-legacy.js（10,804行）の残存 | Strangler-Fig 移行は段階的。ユーザー 0 人のうちは実害なし | Wave3 中盤 |
| LLM / ML モデルなしの AI | Wave2 は統計ベース AI で十分。LLM 連携は Feature Store 完成後 | Wave3 |
| Knowledge Graph の薄さ（Disease × Symptom のみ）| 骨格で十分。Treatment / Biomarker は Wave3 | Wave3 |
| PARQUET export が stub | Wave2 では JSON / CSV で十分。PARQUET は Wave3 | Wave3 |
| TypeScript 移行未完 | JavaScript で動いているうちは移行しない | Wave3 以降 |
| Wearable / Lab Data 未実装 | BD-007（DROP なし）。HOLD で許容 | Wave3〜4 |
| Lunar Calendar UI 未実装 | BD-003（UI 禁止）。バックグラウンド記録のみ | Wave3 以降 |

### 11-B. Wave2 で絶対禁止する技術負債の蓄積

以下は Wave2 で新たに生んではならない:

| 禁止事項 | 根拠 |
|---|---|
| NetworkSignal を in-memory で新規追加 | BD-022（Wave2 で Supabase 移行必須）|
| ippo_events を UPDATE / DELETE で扱う | BD-017（Immutable 設計）|
| FeatureVector V2 なしに新規 SimilarityEdge を生成 | BD-010（vectorVersion バンプ必須）|
| k < 5 の Dataset 公開 | BD-030（ZERO TOLERANCE）|
| AI が診断・治療指示・緊急度判定を出力する設計 | BD-031（絶対禁止）|
| Disease Cluster 統計なしに Similarity UI を公開 | BD-026（Phase 3 完了条件未達）|
| Knowledge Graph から Layer 1〜8 データを上書きする設計 | BD-028（SSOT 破壊禁止）|
| Consent テーブルへの DELETE / UPDATE | BD-002（絶対禁止）|
| SimilarityEdge の DELETE | BD-001（絶対禁止）|
| Record の Hard Delete（GDPR 処理以外）| BD-019（匿名化優先）|

### 11-C. Wave2 中に解消必須の負債

以下は Wave2 中に必ず解消する:

| 負債 | 解消アクション | 優先度 |
|---|---|---|
| NetworkSignal in-memory | Supabase 永続化（Priority 1）| 最優先 |
| Emotion Signal 未生成（BD-024）| generateFromRecord 時に自動生成 | Priority 1 |
| MenstrualPhase UNKNOWN 固定（BD-014）| PhaseResolverService 実装 | Priority 1 |
| Disease Entity が diseaseKey 文字列（BD-004）| Disease Entity フル構造体に昇格 | Priority 1 |
| Event Sourcing が in-memory のみ（BD-017）| ippo_events テーブル実装 | Priority 1 |
| FeatureVector が 8次元（BD-010）| 12次元 V2 に拡張 | Priority 2 |
| SimilarityEdge に longitudinalContext なし（BD-012）| Longitudinal Enricher 実装 | Priority 2 |

---

## 12. Wave2 Exit Criteria

Wave2 を終了できる条件を以下に明文化する。
すべての条件を Founder が確認した上で Wave3 に移行する（BD-026 継承）。

### 必達条件（全項目 100%）

| # | 条件 | 検証方法 |
|---|---|---|
| EC-01 | NetworkSignal が Supabase に永続化されている（in-memory なし）| Supabase テーブル確認 |
| EC-02 | Emotion Signal が Record 保存時に自動生成される | テスト + 実動作確認 |
| EC-03 | MenstrualPhase が自動判定される（UNKNOWN ゼロ）| テスト確認 |
| EC-04 | Disease Entity がフル構造体（icdCode / category / severity）| テスト + DB 確認 |
| EC-05 | ippo_events テーブルが存在し、Immutable で運用されている | DB 確認 + 削除試行テスト |
| EC-06 | FeatureVector が 12次元（VECTOR_VERSION='2'）で生成される | テスト確認 |
| EC-07 | SimilarityEdge に longitudinalContext が付与されている | テスト確認 |
| EC-08 | Knowledge Graph 骨格（Disease × Symptom × Outcome ノード/エッジ）が存在する | KG クエリ確認 |
| EC-09 | AI Signal Insight と Pattern Discovery が動作する（診断禁止遵守）| 出力内容確認 |
| EC-10 | Cohort Builder が動作し、Research Dataset V2 を生成できる | 実動作確認 |
| EC-11 | Dataset Version に versionId が付与される | テスト確認 |
| EC-12 | DiseaseClusterStatisticsService が動作する | テスト確認 |
| EC-13 | すべての新 Domain Event が ippo_events に記録される | イベントログ確認 |
| EC-14 | ArchitectureGuard に Wave2 全 Domain の違反ルールが追加されている | テスト確認 |
| EC-15 | テスト全件パス（Wave2 追加分含む）| `vitest run` 確認 |

### 品質条件

| # | 条件 |
|---|---|
| QC-01 | Architecture Health: A（違反ゼロ）|
| QC-02 | BD-001〜BD-033（Wave1）および BD-034〜（Wave2）への違反ゼロ |
| QC-03 | k-anonymity 検証テストが全件パス |
| QC-04 | AI 出力に診断・治療・緊急度の文言がゼロ（自動テストで確認）|

---

## 13. Risks

### リスク R-01: NetworkSignal Migration の複雑性

```
リスク: in-memory → Supabase 移行で既存テストが大量失敗する可能性
軽減: インターフェースを維持したまま実装を差し替える（Adapter Pattern）
       Wave1 の in-memory テストは「in-memory モード」で継続させる
```

### リスク R-02: Disease Entity 昇格の後方互換

```
リスク: diseaseKey 文字列 → DiseaseEntity 構造体の変更で
        既存 Case / SimilarityEdge の diseaseKey 参照が壊れる
軽減: diseaseKey フィールドを DiseaseEntity の内包フィールドとして残す
       既存コードの diseaseKey 参照を即座に壊さない設計
```

### リスク R-03: Knowledge Graph の過膨張

```
リスク: Knowledge Graph のエッジが急増し、品質管理が困難になる
軽減: evidence_count < 5 のエッジを LOW_CONFIDENCE として区別
       Wave2 では Disease × Symptom × Outcome の3型のみに限定
```

### リスク R-04: AI 出力の医療的解釈リスク

```
リスク: ユーザーが AI の Signal Insight を医療診断として解釈する
軽減: すべての AI 出力に「これは医療アドバイスではありません」を付与（BD-031）
       出力テンプレートに禁止ワードチェックを組み込む
```

### リスク R-05: Supabase スキーマ変更の連鎖影響

```
リスク: Wave2 で多数のテーブルを追加するとスキーマ変更が複雑化する
軽減: 新テーブルの追加のみ（既存テーブルのカラム削除禁止）
       既存テーブルへの変更は後方互換のカラム追加のみ
```

---

## 14. Future Expansion（Wave3〜への設計的接続）

Wave2 の設計は Wave3 以降への自然な拡張路を塞がない。

### Wave3 への接続点

| Wave2 資産 | Wave3 拡張 |
|---|---|
| Feature Store（特徴量キャッシュ）| Signal Embedding（128次元ベクトル化）|
| Knowledge Graph 骨格 | Treatment / Biomarker ノードの追加 |
| AI Signal Insight（ルールベース）| LLM 連携 Signal Insight |
| Research Dataset V2 | IRB 承認 → 外部研究者への公開 |
| Cohort Builder | 臨床試験候補者選定への応用 |
| Environmental Signal（月齢メタデータ）| Environmental Signal UI 開示（相関確認後）|
| PARQUET stub | PARQUET 実装（外部 ML ツール連携）|

### Wave4 への接続点

| Wave3 資産 | Wave4 拡張 |
|---|---|
| Signal Embedding | Disease Intelligence Model の学習データ |
| Knowledge Graph（Treatment 追加後）| 治療効果推定モデル |
| Cohort（IRB 承認後）| 臨床試験へのリクルートメント |

### 設計的拡張禁止事項

Wave3 以降の拡張が Wave2 設計を強制変更することを禁止する:

```
禁止: Wave3 で Layer 1（Record）の SSOT を変更すること（BD-015）
禁止: Wave3 で SimilarityEdge を DELETE すること（BD-001）
禁止: Wave3 で Knowledge Graph の既存エッジを DELETE すること（本文書 Section 10-D）
許可: Wave3 で Knowledge Graph にノード型 / エッジ型を追加すること
```

---

## 15. Binding Decisions（BD-034〜）

本 Council による新規 Binding Decisions（Wave2 設計憲法）:

| 決定番号 | 内容 | 根拠Section |
|---|---|---|
| **BD-034** | Wave2 の最優先事項は NetworkSignal の Supabase 永続化（BD-022 の実行）である。Priority 1 の5ドメインは同時着手しないこと（Signal 永続化が最初） | Section 6 / Priority 1 |
| **BD-035** | Disease Entity フル構造体への昇格時、diseaseKey フィールドを内包フィールドとして残し、既存の Case / SimilarityEdge の diseaseKey 参照を壊さないこと | Section 5 / Risk R-02 |
| **BD-036** | Knowledge Graph は Append-Only（DELETE 禁止）。エビデンス否定時は confidence スコア変更で対応し、エッジは削除しない | Section 10-D |
| **BD-037** | Feature Store の入力は NetworkSignal（Supabase 永続化済み）のみ。in-memory Signal を Feature Store への入力として使用してはならない | Section 9-B |
| **BD-038** | AI 出力テンプレートはすべて「これは医療アドバイスではありません」のフラグを機械的にチェックすること。このチェックを省略した AI 出力の公開は禁止 | Section 8-C |
| **BD-039** | Cohort Builder で生成する Dataset は、CohortDefinition の kAnonymityVerified が true の場合のみ公開できる。false の場合は Founder 再確認が必要 | Section 9-C |
| **BD-040** | Wave2 の Exit Criteria（Section 12 の EC-01〜EC-15 + QC-01〜QC-04）は全項目を Founder が確認した上で Wave3 に移行すること。一部通過での Wave3 着手は禁止 | Section 12 |
| **BD-041** | Domain Event（Section 5-E の 12 新イベント）は ippo_events テーブルに永続化すること。in-memory の EventStore への格納のみで完結させてはならない（Wave2 以降） | Section 5-E |
| **BD-042** | VECTOR_VERSION='2' の FeatureVector と VECTOR_VERSION='1' の FeatureVector は、SimilarityEngine が混在して処理してはならない。vectorVersion で分岐し、V1 Edge と V2 Edge を別世代として扱うこと | Section 5-B / BD-010継承 |
| **BD-043** | Environmental Signal（月齢等）は Record 保存時にバックグラウンドで自動付与するが、UI への表示は Phase 3 完了後（BD-026 準拠）まで禁止する | Section 6 / Priority 2 |

---

## 16. Inputs for Wave2 Roadmap

本 Council の決定を PR-041 以降の実装ロードマップに変換するための設計インプット:

### PR-041: NetworkSignal Persistence（最優先）

```
目的: NetworkSignal を Supabase に永続化（BD-022 / BD-034）
設計要件:
  - network_signals テーブル設計（userId / signalType / normalizedValue / rawValue / unit
                                   metadata / recordId / timestamp / vectorVersion
                                   menstrualPhase / createdAt）
  - NetworkSignalRepository の実装を in-memory → Supabase Adapter に差し替え
  - 既存 Wave1 インターフェースとの後方互換性（テストを壊さない）
  - ArchitectureGuard: PR-041 用の禁止ルール追加
```

### PR-042: Emotion Signal Generation（BD-024）

```
目的: Record 保存時に EmotionSignal を自動生成
設計要件:
  - saveRecord() 時に moodScore → EmotionSignal(EMOTION) を generateFromRecord() に追加
  - EmotionSignal → Supabase 永続化（PR-041 完了後）
  - EMOTION_SIGNAL_GENERATED ドメインイベント発行
```

### PR-043: MenstrualPhase Auto-Resolution（BD-014）

```
目的: MenstrualPhase を cycleDay から自動判定
設計要件:
  - MenstrualPhaseResolverService: cycleDay → Phase の決定論的変換
  - NetworkSignal の menstrualPhase フィールドを UNKNOWN から実フェーズへ
  - MENSTRUAL_PHASE_RESOLVED ドメインイベント発行
```

### PR-044: Disease Entity Upgrade（BD-004）

```
目的: diseaseKey 文字列 → Disease Entity フル構造体（BD-035 準拠）
設計要件:
  - DiseaseEntity: id / icdCode / category / severity / diagnosedAt / confirmedBy
  - diseaseKey フィールドを内包フィールドとして維持（BD-035）
  - DISEASE_ENTITY_UPGRADED ドメインイベント発行
  - user_diseases テーブルにカラム追加（削除なし）
```

### PR-045: ippo_events Persistence（BD-017）

```
目的: ippo_events テーブル（Supabase Immutable）実装
設計要件:
  - ippo_events テーブル: id / eventType / userId / payload / occurredAt / version
  - EventPersistenceService: EventStore → ippo_events への Bridge
  - Immutable 設計（UPDATE / DELETE 禁止 / BD-017）
  - DOMAIN_EVENT_TYPES の全型を永続化対象にする
```

### PR-046: Disease Cluster Statistics（BD-009）

```
目的: DiseaseClusterStatisticsService 実体化
設計要件:
  - disease_cluster_snapshots テーブル設計
  - DiseaseClusterStatisticsService: Signal 平均 / パーセンタイル / 優位フェーズ
  - DISEASE_CLUSTER_COMPUTED ドメインイベント発行
  - 依存: PR-041（Signal 永続化）/ PR-044（Disease Entity）が完了後
```

### PR-047: FeatureVector V2（BD-010 / BD-012）

```
目的: FeatureVector 12次元化（VECTOR_VERSION='2'）+ Longitudinal Context
設計要件:
  - DIM_V2: 12次元（Wave1 8次元 + PAIN_SCORE / MENSTRUAL_REGULARITY / SLEEP_SCORE / LONGITUDINAL_DELTA）
  - VECTOR_VERSION='2' 定数
  - LongitudinalEdgeEnricher: SimilarityEdge に longitudinalContext 付与（BD-012）
  - BD-042 遵守: V1 / V2 Edge を混在処理しない
  - 依存: PR-041 / PR-043 / PR-046 完了後
```

### PR-048: Knowledge Graph Skeleton

```
目的: Knowledge Graph 骨格（Disease × Symptom × Outcome）構築
設計要件:
  - kg_nodes テーブル: nodeId / type / attributes / createdAt
  - kg_edges テーブル: edgeId / fromNodeId / toNodeId / relationType / evidenceCount / confidence / createdAt
  - KnowledgeGraphService: ノード / エッジの Append-Only CRUD
  - KnowledgeGraphSnapshot: 月次生成
  - 依存: PR-044（Disease Entity）/ PR-046（Disease Cluster）完了後
```

### PR-049: AI Signal Insight + Pattern Discovery

```
目的: Signal Insight と Pattern Discovery の実装（ルールベース）
設計要件:
  - SignalInsightService: Signal 変化の自然言語テンプレート生成
  - PatternDiscoveryService: Phase × Signal 相関 / Signal 共起パターン
  - 全出力に「これは医療アドバイスではありません」フラグを機械チェック（BD-038）
  - 診断・治療・緊急度の文言を自動検出するバリデーション
  - 依存: PR-041 / PR-043 完了後
```

### PR-050: Feature Store + Cohort Builder + Dataset Version

```
目的: Research Platform の Wave2 強化
設計要件:
  - FeatureStoreService: NetworkSignal → FeatureMatrix
  - CohortBuilderService: CohortDefinition + k-anonymity 検証（BD-039）
  - DatasetVersionService: IPPO-DATASET-{TYPE}-v{N}-{DATE} 命名
  - Evidence Layer: ClusterStats + PatternEvidence の統合
  - 依存: PR-046 / PR-048 完了後
```

### PR-N: Wave2 Exit Audit

```
目的: Wave2 Exit Criteria（Section 12）の全項目検証
設計要件:
  - EC-01〜EC-15 / QC-01〜QC-04 の自動検証スクリプト
  - Founder 確認レポートの生成
  - Wave3 着手条件の機械的確認
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-005 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-27 |
| **承認** | Founder |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT |
| **前提文書** | IPPO-GOV-001 v1.3 / IPPO-COUNCIL-002〜004 |
| **Binding Decisions** | BD-034〜BD-043（10件）|
| **スコープ** | PR-041〜Wave2完了（Wave2全体設計憲法）|
| **次回改訂トリガー** | PR-046（Disease Cluster 実体化）完了時 |
| **Wave3 移行条件** | Section 12 の Exit Criteria 全項目 Founder 確認後 |

---

**WAVE2 MASTER DESIGN COUNCIL — 議決完了 2026-06-27**
**承認: Founder**
**次回: Wave2 Progress Review（PR-046完了後）**
