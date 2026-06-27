# WAVE2 ROADMAP
## IPPO Wave2 公式実装ロードマップ

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は PR-041〜Wave2完了までの唯一の公式ロードマップである。
> 個別PR仕様は本文書の設計と矛盾してはならない。
> 矛盾が生じた場合、本文書が正とする。
>
> **前提文書（全読み込み済み / 準拠確認済み）:**
> - IPPO-GOV-001 v1.3（BD-001〜014）
> - IPPO-COUNCIL-002 NETWORK ASSET COUNCIL（BD-009〜014）
> - IPPO-COUNCIL-003 DATA ASSET COUNCIL（BD-015〜025）
> - IPPO-COUNCIL-004 NETWORK EVOLUTION COUNCIL（BD-026〜033）
> - IPPO-COUNCIL-005 WAVE2 MASTER DESIGN（BD-034〜043）

---

**文書番号:** IPPO-COUNCIL-006
**開催体:** Founder × Platform Architect × Domain Architect × AI Architect × Research Platform Architect × Data Platform Architect（合同 Council）
**開催日:** 2026-06-27
**承認:** Founder
**スコープ:** PR-041〜PR-075（Wave2完了）

---

## Executive Summary

Wave1（PR-001〜PR-040）でIPPOは「Network Asset Foundation」を構築した。
Wave2（PR-041〜PR-075）でIPPOは「Connected Intelligence Platform」に進化する。

Wave2 は 7 フェーズ / 35 PR で構成される。

```
Phase A: Infrastructure Migration    PR-041〜045  (5 PR)
Phase B: Disease Intelligence        PR-046〜050  (5 PR)
Phase C: Knowledge Architecture      PR-051〜056  (6 PR)
Phase D: AI Platform                 PR-057〜062  (6 PR)
Phase E: Similarity Evolution        PR-063〜067  (5 PR)
Phase F: Research Platform           PR-068〜072  (5 PR)
Phase G: Wave2 Exit                  PR-073〜075  (3 PR)
─────────────────────────────────────
合計:                                PR-041〜075  (35 PR)
```

Wave2 完了時点で以下が実現する:
- **全データが Supabase に永続化**（セッション消滅ゼロ）
- **Disease Intelligence が統計的に機能**（クラスター / FeatureVector V2）
- **Knowledge Graph 骨格の存在**（Disease × Symptom × Outcome）
- **AI が Signal Insight と Pattern Discovery を補助**（診断禁止 / BD-031）
- **Research Platform が実用水準**（Cohort Builder / Dataset Version / DOI候補）
- **Similarity UI 公開の条件検証完了**（BD-026 Phase 3 確認）

---

## Wave2 Objectives

| 目標番号 | 目標 | 達成フェーズ | 根拠 BD |
|---|---|---|---|
| W2-01 | NetworkSignal の Supabase 永久保存 | Phase A | BD-022 |
| W2-02 | ippo_events テーブル（Immutable）| Phase A | BD-017 |
| W2-03 | Emotion Signal の Record 時自動生成 | Phase A | BD-024 |
| W2-04 | MenstrualPhase 自動判定 | Phase A | BD-014 |
| W2-05 | Disease Entity フル構造体 | Phase A | BD-004 |
| W2-06 | Disease Cluster Statistics | Phase B | BD-009 |
| W2-07 | FeatureVector 12次元（VECTOR_VERSION='2'）| Phase B | BD-010 |
| W2-08 | Longitudinal Context on Edge | Phase B | BD-012 |
| W2-09 | Environmental Signal メタデータ付与 | Phase B | BD-043 |
| W2-10 | Knowledge Graph 骨格 | Phase C | BD-028 / BD-036 |
| W2-11 | Feature Store V1 | Phase C | BD-037 |
| W2-12 | Cohort Builder | Phase C | BD-039 |
| W2-13 | Dataset Version 管理 | Phase C | BD-021 |
| W2-14 | AI Signal Insight（ルールベース）| Phase D | BD-031 / BD-038 |
| W2-15 | AI Pattern Discovery | Phase D | BD-031 |
| W2-16 | Case Recommendation 基盤 | Phase D | BD-029 / BD-030 |
| W2-17 | Similarity V2（12次元 Edge）| Phase E | BD-042 |
| W2-18 | Similarity UI 公開条件検証 | Phase E | BD-026 / BD-027 |
| W2-19 | Research Dataset V2 | Phase F | BD-021 |
| W2-20 | Wave2 Exit Criteria 全項目通過 | Phase G | BD-040 |

---

## Phase Structure

### Phase A — Infrastructure Migration（PR-041〜045）

```
目的: Wave1 の in-memory 資産を Supabase に永続化する
      「セッションをまたいでデータが蓄積する状態」を作る

入口条件: Wave1（PR-001〜040）完了
出口条件: 全 Signal / Event / Disease が永続化されている
          in-memory のみのドメインがゼロ
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-041 | NetworkSignal Persistence | ★★★ 最優先 |
| PR-042 | ippo_events Persistence | ★★★ |
| PR-043 | Emotion Signal Generation | ★★★ |
| PR-044 | MenstrualPhase Auto-Resolution | ★★ |
| PR-045 | Disease Entity Upgrade | ★★ |

### Phase B — Disease Intelligence（PR-046〜050）

```
目的: Disease Cluster が統計的に意味を持ち、
      FeatureVector が 12次元に進化する

入口条件: Phase A 完了（Signal 永続化 / Disease Entity 構造体）
出口条件: Disease Cluster 統計が機能
          FeatureVector V2（12次元）が生成される
          SimilarityEdge に Longitudinal Context が付与される
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-046 | Disease Cluster Statistics | ★★★ |
| PR-047 | FeatureVector V2（12次元）| ★★★ |
| PR-048 | Longitudinal Edge Enricher | ★★ |
| PR-049 | Environmental Signal Collector | ★ |
| PR-050 | Signal Intelligence V2 | ★★ |

### Phase C — Knowledge Architecture（PR-051〜056）

```
目的: Knowledge Graph の骨格を構築し、
      Research Platform を研究実用水準に引き上げる

入口条件: Phase B 完了（Disease Cluster / FeatureVector V2）
出口条件: Knowledge Graph が Disease × Symptom × Outcome で構成される
          Feature Store が機能する
          Cohort Builder が動作する
          Dataset Version 管理が動作する
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-051 | Knowledge Graph Foundation | ★★★ |
| PR-052 | Knowledge Graph Builder | ★★ |
| PR-053 | Feature Store V1 | ★★★ |
| PR-054 | Cohort Builder | ★★ |
| PR-055 | Dataset Version Management | ★★ |
| PR-056 | Evidence Layer | ★ |

### Phase D — AI Platform（PR-057〜062）

```
目的: AI 補助機能（Signal Insight / Pattern Discovery / Case Recommendation）を
      ルールベースで実装する（LLM は Wave3 / BD-031 絶対遵守）

入口条件: Phase C 完了（Feature Store / Knowledge Graph）
出口条件: Signal Insight / Pattern Discovery が動作する
          すべての AI 出力に医療行為禁止フラグが機械チェックされている
          Case Recommendation の基盤が存在する（Phase 4 条件検証待ち）
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-057 | Signal Insight Service | ★★★ |
| PR-058 | Pattern Discovery Service | ★★ |
| PR-059 | Case Recommendation Foundation | ★★ |
| PR-060 | Similar Case Search（admin:research）| ★ |
| PR-061 | Research Assistance（admin:research）| ★ |
| PR-062 | AI Safety Layer | ★★★ |

### Phase E — Similarity Evolution（PR-063〜067）

```
目的: Similarity を FeatureVector V2 ベースに移行し、
      Similarity UI 公開の条件を検証する

入口条件: Phase D 完了（AI 補助機能）/ Phase B 完了（FV V2）
出口条件: Similarity V2 Edge が存在する
          Phase 3 完了条件（NETWORK_EVOLUTION_COUNCIL Section 2-C）の検証完了
          Similarity UI 公開の Founder 判断が下せる状態
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-063 | Similarity Engine V2 | ★★★ |
| PR-064 | Disease Network Score V2 | ★★ |
| PR-065 | Similarity Snapshot V2 | ★★ |
| PR-066 | Phase 3 Completion Validator | ★★ |
| PR-067 | Similarity UI Public Gate | ★★★ |

### Phase F — Research Platform（PR-068〜072）

```
目的: Research Platform を Wave2 完成形に仕上げる
      Dataset V2 / DOI候補 / Research Query API を完成させる

入口条件: Phase E 完了（Similarity V2）
出口条件: Research Dataset V2 が学術引用可能な品質
          DOI候補 ID が付与される
          Research Query API が動作する
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-068 | Research Dataset V2 | ★★★ |
| PR-069 | Cohort Research Export | ★★ |
| PR-070 | Dataset DOI Candidate | ★ |
| PR-071 | Research Query API | ★★ |
| PR-072 | Research Platform Audit | ★★ |

### Phase G — Wave2 Exit（PR-073〜075）

```
目的: Wave2 Exit Criteria（BD-040 / Section 12 of WAVE2_MASTER_DESIGN）を
      全項目 Founder 確認する

入口条件: Phase A〜F 全完了
出口条件: EC-01〜EC-15 / QC-01〜QC-04 全通過
          Founder が Wave3 移行を承認
```

| PR | 名称 | 優先度 |
|---|---|---|
| PR-073 | Architecture Guard Wave2 Complete | ★★★ |
| PR-074 | Wave2 Integration Test Suite | ★★★ |
| PR-075 | Wave2 Exit Audit | ★★★ |

---

## PR-041〜PR-075 詳細 Roadmap

---

### PR-041: NetworkSignal Persistence

| 項目 | 内容 |
|---|---|
| **目的** | NetworkSignal を Supabase `network_signals` テーブルに永続化する（BD-022 実行）|
| **責務** | ① `network_signals` テーブル設計（Supabase）<br>② `NetworkSignalRepository` の実装を in-memory → Supabase Adapter に差し替え<br>③ 既存 Wave1 インターフェース（`findAll()` / `findByType()` 等）を維持<br>④ `NetworkSignalPersistenceService` の追加<br>⑤ ArchitectureGuard PR-041 ルール追加 |
| **依存PR** | PR-037（EventStore）/ PR-040（ResearchDataset）|
| **成果物** | `network_signals` Supabase テーブル / `NetworkSignalRepository`（Supabase 実装）/ テスト |
| **完了条件** | ① Record 保存後 → Signal が `network_signals` テーブルに存在する<br>② セッション再起動後もSignalが消えない<br>③ 既存 Wave1 テスト全件パス<br>④ in-memory 参照がゼロ |
| **次PRへの入力** | 永続化済み NetworkSignal を PR-043 / PR-046 / PR-050 / PR-053 が参照できる |

---

### PR-042: ippo_events Persistence

| 項目 | 内容 |
|---|---|
| **目的** | `ippo_events` Supabase テーブルを実装し、全 DomainEvent を Immutable 永続化する（BD-017）|
| **責務** | ① `ippo_events` テーブル設計（id / eventType / userId / payload / occurredAt / version）<br>② `EventPersistenceService`：EventStore → ippo_events の Bridge<br>③ EventPublisher が発行するすべてのイベントを ippo_events に書き込む<br>④ Immutable 設計の保証（UPDATE / DELETE 禁止 のテスト）<br>⑤ AGGREGATE_TYPES にすべての集約が存在することを確認 |
| **依存PR** | PR-037（EventStore / EventBus）/ PR-041（Signal Persistence で動作確認）|
| **成果物** | `ippo_events` テーブル / `EventPersistenceService` / Immutable テスト |
| **完了条件** | ① 全 DomainEvent が ippo_events テーブルに記録される<br>② DELETE / UPDATE 試行テストが失敗する（Immutable 保証）<br>③ EventReplayService が ippo_events から Replay できる |
| **次PRへの入力** | 永続化イベントログが PR-056（Evidence Layer）の入力になる |

---

### PR-043: Emotion Signal Generation

| 項目 | 内容 |
|---|---|
| **目的** | Record 保存時に EmotionSignal を自動生成する（BD-024 実行）|
| **責務** | ① `NetworkSignalService.generateFromRecord()` に EMOTION Signal 生成を追加<br>② `moodScore`（0〜10）→ `normalizedValue`（/10）変換<br>③ `EmotionSignalGeneratorService` の実装<br>④ `EMOTION_SIGNAL_GENERATED` DomainEvent の発行<br>⑤ 生成された EmotionSignal の Supabase 永続化（PR-041 経由） |
| **依存PR** | PR-041（NetworkSignal Persistence）/ PR-042（ippo_events Persistence）|
| **成果物** | `EmotionSignalGeneratorService` / EMOTION Signal 自動生成テスト |
| **完了条件** | ① moodScore を含む Record を保存 → EMOTION Signal が生成される<br>② 生成 Signal が `network_signals` テーブルに存在する<br>③ `EMOTION_SIGNAL_GENERATED` が ippo_events に記録される<br>④ 6 種 Signal（SYMPTOM / PAIN / MENSTRUAL / EMOTION / SLEEP / EXPOSURE）が全て生成されることをテストで確認 |
| **次PRへの入力** | 全 6 Signal の永続化が完了 → PR-046 / PR-047 が依存する |

---

### PR-044: MenstrualPhase Auto-Resolution

| 項目 | 内容 |
|---|---|
| **目的** | MenstrualPhase を cycleDay から自動判定する（BD-014 実行）|
| **責務** | ① `MenstrualPhaseResolverService`：`cycleDay` → `MenstrualPhase` の決定論的変換<br>② NetworkSignal の `menstrualPhase` フィールドを `UNKNOWN` → 実フェーズに更新<br>③ MenstrualService の `phaseCalculator` との統合<br>④ `MENSTRUAL_PHASE_RESOLVED` DomainEvent の発行<br>⑤ Phase 別 Signal 集計が可能になることをテストで確認 |
| **依存PR** | PR-039（MenstrualIntelligence）/ PR-041（Signal Persistence）/ PR-043（Emotion Signal）|
| **成果物** | `MenstrualPhaseResolverService` / Phase 自動判定テスト |
| **完了条件** | ① MenstrualRecord 登録済みユーザーの Signal に実フェーズが付与される<br>② `UNKNOWN` フェーズの Signal が新規生成されない（新規保存分）<br>③ Phase 別 Signal 集計結果が正しい |
| **次PRへの入力** | Phase 情報が PR-046（ClusterStatistics）/ PR-047（FV V2）の入力になる |

---

### PR-045: Disease Entity Upgrade

| 項目 | 内容 |
|---|---|
| **目的** | `diseaseKey` 文字列 → Disease Entity フル構造体に昇格する（BD-004 / BD-035）|
| **責務** | ① `DiseaseEntity` フル構造体設計：`id / icdCode / category / severity / diagnosedAt / confirmedBy / relatedSymptoms[]`<br>② `diseaseKey` フィールドを内包フィールドとして維持（BD-035：既存 Case / Edge の参照を壊さない）<br>③ `user_diseases` テーブルにカラム追加（削除なし / 後方互換）<br>④ `DiseaseEntityUpgradeService` の実装<br>⑤ `DISEASE_ENTITY_UPGRADED` DomainEvent の発行 |
| **依存PR** | PR-029（DiseaseFoundation）/ PR-042（ippo_events Persistence）|
| **成果物** | `DiseaseEntity` フル構造体 / `DiseaseEntityUpgradeService` / テスト |
| **完了条件** | ① DiseaseEntity に `icdCode` / `category` / `severity` が存在する<br>② 既存の `Case.diseaseKey` / `SimilarityEdge.diseaseKey` 参照が壊れていない<br>③ `DISEASE_ENTITY_UPGRADED` が ippo_events に記録される<br>④ 既存 DiseaseService テスト全件パス |
| **次PRへの入力** | Disease Entity 構造体が PR-046 / PR-051 の必須入力になる |

---

### PR-046: Disease Cluster Statistics

| 項目 | 内容 |
|---|---|
| **目的** | `DiseaseClusterStatisticsService` を実体化する（BD-009 実行）|
| **責務** | ① `DiseaseClusterStatisticsService`：クラスター内 Signal 平均 / パーセンタイル / 優位フェーズ<br>② `disease_cluster_snapshots` テーブル設計（Supabase）<br>③ `computeClusterProfile(clusterId)` → `{ signalMeans, signalPercentiles, dominantPhase, caseCount }`<br>④ `getCaseRankInCluster(caseId, clusterId)` → `{ percentile, signalRanks }`<br>⑤ `DiseaseClusterSnapshot` 生成（週次 / BD-018 準拠）<br>⑥ `DISEASE_CLUSTER_COMPUTED` DomainEvent |
| **依存PR** | PR-041 / PR-043 / PR-044 / PR-045（Phase A 全完了）|
| **成果物** | `DiseaseClusterStatisticsService` / `disease_cluster_snapshots` テーブル / テスト |
| **完了条件** | ① 同 diseaseKey の Case 群に対してクラスタープロファイルが返る<br>② Signal 平均 / P25 / P50 / P75 / P90 が計算される<br>③ dominantPhase が正しく判定される<br>④ DiseaseClusterSnapshot に `generatedAt` が存在する（BD-018）|
| **次PRへの入力** | クラスター統計が PR-047 / PR-051 / PR-059 の入力になる |

---

### PR-047: FeatureVector V2

| 項目 | 内容 |
|---|---|
| **目的** | FeatureVector を 8次元 → 12次元に拡張する（BD-010 / BD-042）|
| **責務** | ① `DIM_V2`（12次元）定数定義：既存 0〜7 維持 + PAIN_SCORE / MENSTRUAL_REGULARITY / SLEEP_SCORE / LONGITUDINAL_DELTA<br>② `VECTOR_VERSION='2'` 定数設定<br>③ `FeatureVectorV2Builder.build()` 実装<br>④ `VECTOR_VERSION='2'` の Edge と `VECTOR_VERSION='1'` の Edge を混在処理しない（BD-042）<br>⑤ `feature_vectors_v2` テーブル設計<br>⑥ `FEATURE_VECTOR_V2_CREATED` DomainEvent |
| **依存PR** | PR-041 / PR-044 / PR-046（Signal 永続化 / Phase 解決 / Cluster 完成）|
| **成果物** | `FeatureVectorV2Builder` / `DIM_V2` / `feature_vectors_v2` テーブル / テスト |
| **完了条件** | ① 新 Case 生成時に 12次元 FeatureVector が生成される<br>② vectorVersion='2' がすべての新 Edge に付与される<br>③ V1 Edge と V2 Edge が SimilarityEngine で混在処理されないことをテストで確認 |
| **次PRへの入力** | FV V2 が PR-048 / PR-063 / PR-053 の必須入力 |

---

### PR-048: Longitudinal Edge Enricher

| 項目 | 内容 |
|---|---|
| **目的** | SimilarityEdge に Longitudinal Context を付与する（BD-012 実行）|
| **責務** | ① `LongitudinalEdgeEnricher` 実装：Edge 生成後に `longitudinalContext` を付与<br>② `longitudinalContext` 構造体：`{ sourceTrend, targetTrend, trendMatch, trendBonus }`<br>③ Trend 計算：30日 vs 前30日 の delta。IMPROVING / STABLE / WORSENING<br>④ `trendBonus = 0.05`（同 Trend の場合）<br>⑤ threshold 判定は rawScore で実施、trendBonus は displayScore にのみ加算<br>⑥ `LONGITUDINAL_EDGE_ENRICHED` DomainEvent |
| **依存PR** | PR-047（FV V2）/ PR-041（Signal 永続化）|
| **成果物** | `LongitudinalEdgeEnricher` / テスト |
| **完了条件** | ① 新 SimilarityEdge に `longitudinalContext` が付与される<br>② trendBonus が displayScore に正しく加算される<br>③ threshold 判定が rawScore で行われることをテストで確認 |
| **次PRへの入力** | Enriched Edge が PR-063（Similarity V2）/ PR-064 の入力になる |

---

### PR-049: Environmental Signal Collector

| 項目 | 内容 |
|---|---|
| **目的** | Record 保存時に月齢等の Environmental Signal メタデータを自動付与する（BD-043）|
| **責務** | ① `EnvironmentalSignalCollector`：Record 保存時にバックグラウンドで月齢計算・付与<br>② `Record.environmentalSignals.lunarPhase` フィールドへの書き込み<br>③ UI への表示なし（バックグラウンドのみ / BD-003 / BD-043）<br>④ `environmental_signal_snapshots` 日次 Snapshot<br>⑤ `ENVIRONMENTAL_SIGNAL_RECORDED` DomainEvent |
| **依存PR** | PR-041 / PR-042（永続化基盤）|
| **成果物** | `EnvironmentalSignalCollector` / テスト |
| **完了条件** | ① Record 保存時に lunarPhase が自動付与される<br>② UI に表示されないことをテストで確認（禁止遵守）<br>③ Environmental Signal Snapshot に `generatedAt` 存在（BD-018）|
| **次PRへの入力** | Wave3 の Environment × Symptom 相関分析の入力データ |

---

### PR-050: Signal Intelligence V2

| 項目 | 内容 |
|---|---|
| **目的** | Signal Intelligence（集約/トレンド/タイムライン）を永続化 Signal 上で再構築し、精度を向上させる |
| **責務** | ① `SignalAggregationService` / `SignalTrendService` / `SignalTimelineService` を Supabase Signal 上で動作させる<br>② Phase 情報を集計に統合（Phase 別 Signal 平均の計算）<br>③ Emotion Signal を集計に含める（BD-024 実行確認）<br>④ `signal_summary_snapshots` 日次更新（PR-035 の延長）|
| **依存PR** | PR-041 / PR-043 / PR-044（Signal 永続化 / Emotion / Phase 完了）|
| **成果物** | Signal Intelligence V2 サービス群 / テスト |
| **完了条件** | ① 全 6 Signal が集計対象になっている<br>② Phase 別 Signal 集計が正しい<br>③ Emotion Signal が TrendService の対象になっている |
| **次PRへの入力** | Phase B 完了。Phase C（Knowledge Architecture）の入口条件成立 |

---

### PR-051: Knowledge Graph Foundation

| 項目 | 内容 |
|---|---|
| **目的** | Knowledge Graph の永続化基盤（テーブル / サービス / Append-Only 設計）を構築する（BD-036）|
| **責務** | ① `kg_nodes` テーブル：`{ nodeId, type, attributes, createdAt, version }`<br>② `kg_edges` テーブル：`{ edgeId, fromNodeId, toNodeId, relationType, evidenceCount, confidence, createdAt }`<br>③ `KnowledgeGraphRepository`：Append-Only CRUD（DELETE 禁止 / BD-036）<br>④ `KnowledgeGraphService`：ノード/エッジの追加 / 参照 / confidence 更新<br>⑤ confidence < 5件 のエッジに `LOW_CONFIDENCE` フラグを付与<br>⑥ `KNOWLEDGE_GRAPH_NODE_ADDED` / `KNOWLEDGE_GRAPH_EDGE_ADDED` DomainEvent |
| **依存PR** | PR-045 / PR-046（Disease Entity / Cluster 完了）|
| **成果物** | `kg_nodes` / `kg_edges` テーブル / `KnowledgeGraphService` / テスト |
| **完了条件** | ① ノード / エッジの INSERT が動作する<br>② DELETE 試行テストが失敗する（Append-Only 保証 / BD-036）<br>③ confidence 更新が DELETE なしで可能 |
| **次PRへの入力** | KG 基盤が PR-052（Builder）の必須入力 |

---

### PR-052: Knowledge Graph Builder

| 項目 | 内容 |
|---|---|
| **目的** | Disease × Symptom × Outcome の Knowledge Graph 骨格を Research Dataset から構築する |
| **責務** | ① `KnowledgeGraphBuilder`：Research Dataset → ノード/エッジへの変換<br>② DiseaseNode / SymptomNode / OutcomeNode / PhaseNode / SignalPatternNode の生成<br>③ エッジ生成：`HAS_SYMPTOM` / `OBSERVED_IN` / `WORSE_IN_PHASE` / `LEADS_TO_OUTCOME` / `COMORBID_WITH` / `SIGNAL_INDICATES`<br>④ `KnowledgeGraphSnapshot` 月次生成（BD-018）<br>⑤ `KnowledgeGraphVersion` 付与（例: `KG-v1.0-20261231`）|
| **依存PR** | PR-051（KG Foundation）/ PR-040（Research Dataset）/ PR-046（Disease Cluster）|
| **成果物** | `KnowledgeGraphBuilder` / KG 骨格 / テスト |
| **完了条件** | ① Disease / Symptom / Outcome ノードが kg_nodes に存在する<br>② 6種類のエッジが kg_edges に存在する<br>③ LOW_CONFIDENCE エッジが正しくフラグされる<br>④ KnowledgeGraphSnapshot に `generatedAt` / `version` 存在（BD-018）|
| **次PRへの入力** | KG 骨格が PR-053（Feature Store）/ PR-057（AI）の入力 |

---

### PR-053: Feature Store V1

| 項目 | 内容 |
|---|---|
| **目的** | Signal 特徴量の高速参照基盤（Feature Store）を構築する（BD-037）|
| **責務** | ① `FeatureStoreService`：NetworkSignal → FeatureMatrix への変換・キャッシュ<br>② Wave2 Feature 定義：`avg_pain_30d` / `avg_sleep_30d` / `avg_symptom_30d` / `menstrual_regularity` / `longitudinal_delta_pain` / `phase_pain_distribution`<br>③ `feature_store` テーブル（Supabase）<br>④ Record 保存時に自動更新<br>⑤ 入力は Supabase 永続化済み Signal のみ（BD-037：in-memory Signal 禁止）|
| **依存PR** | PR-041（Signal 永続化）/ PR-044 / PR-047 / PR-052（KG）|
| **成果物** | `FeatureStoreService` / `feature_store` テーブル / テスト |
| **完了条件** | ① FeatureMatrix が全 Wave2 Feature を含む<br>② in-memory Signal を入力として使用していないことをテストで確認（BD-037）<br>③ Record 保存後に FeatureMatrix が更新される |
| **次PRへの入力** | Feature Store が PR-054 / PR-057 / PR-059 の入力 |

---

### PR-054: Cohort Builder

| 項目 | 内容 |
|---|---|
| **目的** | 研究コホートを定義・管理する Cohort Builder を実装する（BD-039）|
| **責務** | ① `CohortBuilderService`：CohortDefinition の作成 / 検証 / 保存<br>② `CohortDefinition` 構造体：`{ cohortId, name, filters: { diseaseKeys, signalFilters, phaseFilters, dateRange, minRecordCount }, kAnonymityVerified, createdBy }`<br>③ `research_cohorts` テーブル<br>④ `kAnonymityVerified` 検証：k < 5 の場合は公開禁止（BD-039）<br>⑤ `COHORT_DEFINED` DomainEvent |
| **依存PR** | PR-046 / PR-053（Disease Cluster / Feature Store）|
| **成果物** | `CohortBuilderService` / `research_cohorts` テーブル / テスト |
| **完了条件** | ① CohortDefinition が保存される<br>② k < 5 のコホートで Dataset 生成が拒否されることをテストで確認（BD-039）<br>③ kAnonymityVerified = true のコホートのみ次工程に進める |
| **次PRへの入力** | Cohort が PR-055（Dataset Version）/ PR-068 の入力 |

---

### PR-055: Dataset Version Management

| 項目 | 内容 |
|---|---|
| **目的** | Research Dataset のバージョン管理・命名・引用 ID 付与を実装する |
| **責務** | ① `DatasetVersionService`：Dataset 生成時にバージョン ID を付与<br>② 命名規則：`IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD}`<br>③ `doi_candidate` フィールド（将来の DOI 申請用 UUID）<br>④ `research_dataset_versions` テーブル（Append-Only）<br>⑤ バージョン固定後の内容変更禁止<br>⑥ `DATASET_VERSION_PUBLISHED` DomainEvent |
| **依存PR** | PR-054（Cohort Builder）/ PR-040（Research Dataset Foundation）|
| **成果物** | `DatasetVersionService` / `research_dataset_versions` テーブル / テスト |
| **完了条件** | ① Dataset 生成時に versionId と doi_candidate が付与される<br>② 過去バージョンの変更試行テストが失敗する（Append-Only）<br>③ バージョン一覧が取得できる |
| **次PRへの入力** | バージョン管理 Dataset が PR-056 / PR-068 / PR-070 の入力 |

---

### PR-056: Evidence Layer

| 項目 | 内容 |
|---|---|
| **目的** | Research Dataset / Cluster Statistics / Pattern Evidence を統合するエビデンス集約層を構築する |
| **責務** | ① `EvidenceLayerService`：Dataset + ClusterStats + PatternEvidence の統合<br>② エビデンスサマリーの生成（研究者向け）<br>③ 将来の論文引用メタデータの基盤構造定義<br>④ ippo_events からのイベントログを Evidence に統合（PR-042 依存）|
| **依存PR** | PR-042 / PR-052 / PR-055（ippo_events / KG / Dataset Version）|
| **成果物** | `EvidenceLayerService` / テスト |
| **完了条件** | ① Dataset / ClusterStats / Pattern Evidence が統合されたサマリーが生成される<br>② Wave3 での論文引用メタデータに必要な構造が存在する<br>③ Phase C 完了。Phase D（AI Platform）入口条件成立 |
| **次PRへの入力** | Evidence Layer が PR-061（Research Assistance）の入力 |

---

### PR-057: Signal Insight Service

| 項目 | 内容 |
|---|---|
| **目的** | Signal 変化を自然言語でサマリーする Signal Insight を実装する（BD-031 / BD-038）|
| **責務** | ① `SignalInsightService`：Signal 変化のテンプレートベース自然言語生成<br>② 出力例：「今週の痛みスコアの平均は 6.2 で、3週間前（4.8）より 1.4 上昇しています」<br>③ 全出力に `isMedicalAdvice: false` フラグを機械付与<br>④ 禁止ワードリスト（診断 / 治療指示 / 緊急度 / 「〜病です」等）への自動チェック（BD-038）<br>⑤ confidence スコアが `LOW` の場合は出力しない |
| **依存PR** | PR-053（Feature Store）/ PR-044（Phase 解決）|
| **成果物** | `SignalInsightService` / 禁止ワードバリデーター / テスト |
| **完了条件** | ① Signal Insight が生成される<br>② 禁止ワードを含む出力が自動ブロックされることをテストで確認（BD-038）<br>③ `isMedicalAdvice: false` が全出力に付与される |
| **次PRへの入力** | Signal Insight が PR-062（AI Safety Layer）のレビュー対象 |

---

### PR-058: Pattern Discovery Service

| 項目 | 内容 |
|---|---|
| **目的** | 個人の Signal パターンを統計的に発見し、提示する（BD-031 / BD-038）|
| **責務** | ① `PatternDiscoveryService`：Phase × Signal 相関 / Signal 共起 / Experiment 前後比較<br>② PatternType：`PHASE_CORRELATION` / `SIGNAL_CO_OCCURRENCE` / `EXPERIMENT_RESPONSE` / `LONGITUDINAL_TREND`<br>③ 相関係数計算（ルールベース / LLM なし）<br>④ 出力例：「睡眠スコアが低い翌日は痛みスコアが平均 1.2 高い傾向（相関係数 0.73）」<br>⑤ 因果断定禁止（「原因です」は禁止ワードとして検出）|
| **依存PR** | PR-044 / PR-053 / PR-057（Phase / Feature Store / Signal Insight）|
| **成果物** | `PatternDiscoveryService` / テスト |
| **完了条件** | ① 4種の PatternType が検出される<br>② 「原因です」「〜病です」等の因果断定ワードが自動ブロックされる<br>③ evidence_count < 3 のパターンは `LOW_CONFIDENCE` で返される |
| **次PRへの入力** | Pattern Evidence が PR-056 / PR-059 の入力 |

---

### PR-059: Case Recommendation Foundation

| 項目 | 内容 |
|---|---|
| **目的** | 「自分と類似したパターンの匿名化症例」を提示する Case Recommendation の基盤を構築する（BD-029 / BD-030）|
| **責務** | ① `CaseRecommendationService`（基盤）：FeatureVector V2 ベースの類似 Case 探索<br>② 出力は k-anonymity k≥5 適用後の匿名化 Case のみ（BD-021 / BD-030）<br>③ 「一致した特徴」の自然言語説明（診断的解釈なし）<br>④ 公開条件チェック：BD-026 の Phase 3 完了条件が未達の場合は UI 非表示<br>⑤ `admin:research` 権限での先行検証のみ |
| **依存PR** | PR-047 / PR-046 / PR-053 / PR-058（FV V2 / Cluster / Feature Store / Pattern）|
| **成果物** | `CaseRecommendationService`（非公開モード）/ テスト |
| **完了条件** | ① 類似 Case 探索が機能する<br>② k < 5 のグループの Case が返されないことをテストで確認（BD-030）<br>③ Phase 3 未達でユーザー向け公開が拒否されることをテストで確認（BD-026）|
| **次PRへの入力** | Case Recommendation 基盤が PR-067（Similarity UI Public Gate）の前提 |

---

### PR-060: Similar Case Search（admin:research）

| 項目 | 内容 |
|---|---|
| **目的** | 研究者向けの類似症例検索 API を実装する（`admin:research` 権限限定）|
| **責務** | ① `SimilarCaseSearchService`：SearchQuery → 匿名化 Case 群<br>② SearchQuery 構造体：`{ signalType[], phaseFilter?, minScore?, diseaseKey }`<br>③ 全結果に k-anonymity 適用（BD-021）<br>④ 個人特定可能な検索結果の返却を構造上不可能にする（BD-030 / ZERO TOLERANCE）<br>⑤ ApiGateway に `searchSimilarCases()` メソッド追加（`admin:research` 権限）|
| **依存PR** | PR-059（Case Recommendation Foundation）|
| **成果物** | `SimilarCaseSearchService` / ApiGateway メソッド / テスト |
| **完了条件** | ① SearchQuery で类似 Case が返される<br>② 個人特定フィールドが結果に含まれないことをテストで確認<br>③ `admin:research` 以外からのアクセスが拒否される |
| **次PRへの入力** | PR-071（Research Query API）の基盤 |

---

### PR-061: Research Assistance（admin:research）

| 項目 | 内容 |
|---|---|
| **目的** | 研究者向けの補助統計 API を実装する（`admin:research` 権限限定）|
| **責務** | ① `ResearchAssistanceService`：Dataset / Cohort の記述統計・相関分析<br>② 出力：`{ descriptiveStats, signalCorrelations, clusterComparison, evidenceSummary }`<br>③ 因果推論の自動生成禁止（相関のみ提示）<br>④ Evidence Layer（PR-056）との統合<br>⑤ ApiGateway に `getResearchAssistance()` メソッド追加 |
| **依存PR** | PR-056（Evidence Layer）/ PR-060（Similar Case Search）|
| **成果物** | `ResearchAssistanceService` / テスト |
| **完了条件** | ① 記述統計 / Signal 相関 / Cluster 比較が返される<br>② 因果推論表現が自動ブロックされる<br>③ `admin:research` 権限でのみアクセス可能 |
| **次PRへの入力** | Wave2 AI Platform 完成。PR-062 で安全性監査 |

---

### PR-062: AI Safety Layer

| 項目 | 内容 |
|---|---|
| **目的** | Wave2 の全 AI 出力に対する安全性監査層を実装する（BD-031 / BD-038 完全遵守）|
| **責務** | ① `AISafetyValidator`：全 AI 出力の機械的禁止ワードチェック<br>② 禁止ワードリスト管理（診断 / 治療指示 / 緊急度 / 「〜病です」/ 「飲んでください」等）<br>③ `isMedicalAdvice: false` フラグの付与確認<br>④ 違反出力の自動ブロックとログ記録<br>⑤ PR-057〜061 の全サービス出力にバリデーション適用 |
| **依存PR** | PR-057 / PR-058 / PR-059 / PR-060 / PR-061（全 AI サービス）|
| **成果物** | `AISafetyValidator` / 禁止ワードテスト全件 / テスト |
| **完了条件** | ① 全 AI 出力が AISafetyValidator を通過している<br>② 禁止ワード含む出力がブロックされることを自動テストで証明<br>③ Phase D 完了。Phase E（Similarity Evolution）入口条件成立 |
| **次PRへの入力** | AI 安全性保証が Phase E 以降の前提条件 |

---

### PR-063: Similarity Engine V2

| 項目 | 内容 |
|---|---|
| **目的** | SimilarityEngine を FeatureVector V2（12次元）ベースに移行する（BD-042）|
| **責務** | ① `SimilarityEngineV2`：12次元 FeatureVector でのコサイン類似度計算<br>② `VECTOR_VERSION='2'` の Edge 生成<br>③ V1 Edge と V2 Edge の混在処理禁止（BD-042）：`vectorVersion` で完全分岐<br>④ 既存 V1 Edge は削除しない（BD-001）<br>⑤ V2 Edge 生成時の threshold は V1 と同値（0.5 / 同 diseaseKey）|
| **依存PR** | PR-047 / PR-048（FV V2 / Longitudinal Enricher）|
| **成果物** | `SimilarityEngineV2` / V2 Edge テスト |
| **完了条件** | ① V2 Edge に `vectorVersion='2'` が付与される<br>② V1 / V2 混在処理が拒否されることをテストで確認（BD-042）<br>③ V1 Edge が削除されていない（BD-001 遵守）|
| **次PRへの入力** | V2 Edge が PR-064 / PR-065 の入力 |

---

### PR-064: Disease Network Score V2

| 項目 | 内容 |
|---|---|
| **目的** | Disease Cluster 統計と V2 Edge を統合した Network Score を算出する |
| **責務** | ① `DiseaseNetworkScoreV2Service`：Cluster Profile × V2 Edge × Longitudinal Context の統合スコア<br>② NetworkScore 構造体：`{ diseaseKey, nodeCount, edgeCount, avgScore, clusterCohesion, longitudinalTrend }`<br>③ Similarity Snapshot V2 の生成（BD-018）|
| **依存PR** | PR-046 / PR-048 / PR-063（Cluster / Longitudinal / Similarity V2）|
| **成果物** | `DiseaseNetworkScoreV2Service` / テスト |
| **完了条件** | ① NetworkScore V2 が全疾患クラスターで計算される<br>② Longitudinal Context が Score に反映される<br>③ Similarity Snapshot V2 に `generatedAt` / `vectorVersion='2'` 存在（BD-018）|
| **次PRへの入力** | Network Score V2 が PR-066 / PR-067 の入力 |

---

### PR-065: Similarity Snapshot V2

| 項目 | 内容 |
|---|---|
| **目的** | VECTOR_VERSION='2' 対応の Similarity Snapshot を実装する（BD-018 / BD-010）|
| **責務** | ① `SimilaritySnapshotV2Service`：V2 Edge の Snapshot 生成<br>② Snapshot 構造体：`{ snapshotId, vectorVersion: '2', edgeCount, caseCount, computedAt, threshold }`<br>③ V1 Snapshot と V2 Snapshot を世代分離管理<br>④ BD-023 遵守：再計算時は新 edgeId を発行 |
| **依存PR** | PR-063 / PR-064（Similarity V2 / Network Score V2）|
| **成果物** | `SimilaritySnapshotV2Service` / テスト |
| **完了条件** | ① V2 Snapshot に `vectorVersion='2'` が付与される<br>② V1 / V2 Snapshot が分離管理される<br>③ BD-023 遵守：同一 Edge の edgeId が再計算で変わることをテストで確認 |
| **次PRへの入力** | PR-066（Phase 3 Validator）の入力 |

---

### PR-066: Phase 3 Completion Validator

| 項目 | 内容 |
|---|---|
| **目的** | NETWORK_EVOLUTION_COUNCIL Section 2-C の Phase 3 完了条件を機械的に検証する（BD-026）|
| **責務** | ① `Phase3CompletionValidator`：Phase 3 完了条件チェック<br>② 条件：疾患別 Case 数 ≥ 50 / Disease Cluster 統計の信頼水準達成<br>③ `Phase3ValidationReport` 生成（Founder 確認用）<br>④ 条件未達の場合、PR-067（Similarity UI Public Gate）を自動的にブロック |
| **依存PR** | PR-046 / PR-064 / PR-065（Cluster / Network Score / Snapshot V2）|
| **成果物** | `Phase3CompletionValidator` / `Phase3ValidationReport` / テスト |
| **完了条件** | ① Phase 3 条件の自動検証が動作する<br>② Phase 3 未達時に Similarity UI 公開が拒否されることをテストで確認（BD-026）<br>③ Founder 確認用レポートが生成される |
| **次PRへの入力** | Phase 3 確認済みレポートが PR-067 のゲート入力 |

---

### PR-067: Similarity UI Public Gate

| 項目 | 内容 |
|---|---|
| **目的** | Similarity UI 公開の技術的ゲートを実装し、Founder による公開判断を可能にする（BD-026 / BD-027）|
| **責務** | ① `SimilarityPublicGateService`：Phase 3 検証 → Founder 承認フロー → UI 公開 のゲート管理<br>② Phase 3 未達の場合は Similarity UI 公開を構造上不可能にする<br>③ Founder 承認記録を ippo_events に永続化<br>④ 公開後の Similarity UI は「Case Recommendation Foundation（PR-059）」の実装を利用 |
| **依存PR** | PR-059 / PR-066（Case Recommendation / Phase 3 Validator）|
| **成果物** | `SimilarityPublicGateService` / テスト |
| **完了条件** | ① Phase 3 未達時に UI 公開が拒否される（BD-026 / BD-027）<br>② Founder 承認後に公開状態が変わる<br>③ 承認記録が ippo_events に永続化される<br>④ Phase E 完了。Phase F（Research Platform）入口条件成立 |
| **次PRへの入力** | Similarity 公開状態が Wave3 の UI 基盤 PR の前提条件 |

---

### PR-068: Research Dataset V2

| 項目 | 内容 |
|---|---|
| **目的** | Research Dataset を KG / Cluster / V2 Edge を含む Wave2 完成形に強化する |
| **責務** | ① `ResearchDatasetV2Service`：Layer 2〜9 の全資産を統合した Dataset 生成<br>② Dataset V2 構成：Record × Signal（6種）× DiseaseEntity × Case × V2 Edge × ClusterStats × KG骨格<br>③ `IPPO-DATASET-*-v2.0-*` 命名<br>④ JSON / CSV Export の V2 対応（フィールド追加）<br>⑤ k-anonymity k≥5 適用（BD-021）/ Founder 承認フロー |
| **依存PR** | PR-052 / PR-055 / PR-063 / PR-046（KG / Dataset Version / Similarity V2 / Cluster）|
| **成果物** | `ResearchDatasetV2Service` / V2 フォーマット / テスト |
| **完了条件** | ① Dataset V2 が KG / V2 Edge / Cluster Stats を含む<br>② k < 5 での生成が拒否される（BD-030）<br>③ Founder 承認なしでの公開が拒否される（BD-021）|
| **次PRへの入力** | Dataset V2 が PR-069 / PR-070 / PR-071 の入力 |

---

### PR-069: Cohort Research Export

| 項目 | 内容 |
|---|---|
| **目的** | Cohort Builder で定義したコホートの Research Dataset Export を実装する |
| **責務** | ① `CohortResearchExportService`：CohortDefinition → Dataset Export<br>② `IPPO-DATASET-COHORT-{cohortId}-v1.0-{DATE}` 命名<br>③ JSON / CSV / PARQUET-stub の Export<br>④ Export 前の k-anonymity 再検証（BD-039）<br>⑤ `DATASET_VERSION_PUBLISHED` DomainEvent |
| **依存PR** | PR-054 / PR-068（Cohort Builder / Dataset V2）|
| **成果物** | `CohortResearchExportService` / テスト |
| **完了条件** | ① Cohort 定義に基づく Dataset が Export される<br>② k < 5 のコホートの Export が拒否される<br>③ Export に versionId が付与される |
| **次PRへの入力** | PR-070（DOI Candidate）の入力 |

---

### PR-070: Dataset DOI Candidate

| 項目 | 内容 |
|---|---|
| **目的** | Research Dataset に DOI 申請候補 ID を付与し、学術引用可能性を確立する |
| **責務** | ① `DOICandidateService`：Dataset Version → DOI 候補 ID の付与<br>② DOI 候補形式：`10.{ippo-prefix}/{datasetVersionId}`（将来の正式 DOI 取得のための準備）<br>③ Dataset メタデータへの `doi_candidate` フィールド追加<br>④ Citation フォーマットの生成（APA / Nature 形式）|
| **依存PR** | PR-055 / PR-069（Dataset Version / Cohort Export）|
| **成果物** | `DOICandidateService` / Citation Generator / テスト |
| **完了条件** | ① 全 Dataset V2 に doi_candidate が付与される<br>② Citation フォーマットが生成される<br>③ Wave3 での正式 DOI 申請に必要な構造が存在する |
| **次PRへの入力** | PR-071（Research Query API）の入力 |

---

### PR-071: Research Query API

| 項目 | 内容 |
|---|---|
| **目的** | 研究者向けの統合 Research Query API を実装する（`admin:research` 権限）|
| **責務** | ① `ResearchQueryApiService`：KG / Dataset / Cohort / Evidence を統合したクエリ<br>② QueryType：`COHORT_STATS` / `SIGNAL_CORRELATION` / `DISEASE_CLUSTER_COMPARE` / `KG_PATH_QUERY`<br>③ ApiGateway に Research Query メソッド群を追加<br>④ 全クエリ結果に k-anonymity 確認（BD-030）<br>⑤ Evidence Layer（PR-056）との統合 |
| **依存PR** | PR-056 / PR-060 / PR-061 / PR-070（Evidence / Similar Case / Research Assistance / DOI）|
| **成果物** | `ResearchQueryApiService` / ApiGateway 拡張 / テスト |
| **完了条件** | ① 4種の QueryType が動作する<br>② 全結果が匿名化されている<br>③ `admin:research` 以外のアクセスが拒否される |
| **次PRへの入力** | PR-072（Research Platform Audit）の監査対象 |

---

### PR-072: Research Platform Audit

| 項目 | 内容 |
|---|---|
| **目的** | Wave2 Research Platform（PR-051〜071）の完全性と安全性を監査する |
| **責務** | ① BD-021 / BD-030 / BD-036 / BD-037 / BD-039 の全チェック<br>② k-anonymity 全 Dataset の再検証<br>③ AI Safety Layer（PR-062）との整合性確認<br>④ Research Platform Audit Report の生成（Founder 確認用）<br>⑤ Phase F 完了宣言 |
| **依存PR** | PR-051〜071（Phase C〜F 全 PR）|
| **成果物** | Research Platform Audit Report / テスト |
| **完了条件** | ① BD-021 / BD-030 / BD-039 への違反ゼロ<br>② 全 Dataset の k ≥ 5 確認済み<br>③ Founder が Research Platform Audit Report を承認<br>④ Phase F 完了。Phase G（Wave2 Exit）入口条件成立 |
| **次PRへの入力** | Wave2 Exit Audit（PR-075）の入力 |

---

### PR-073: Architecture Guard Wave2 Complete

| 項目 | 内容 |
|---|---|
| **目的** | Wave2 で追加した全 Domain の ArchitectureGuard ルールを完成させる |
| **責務** | ① PR-041〜072 で追加した全 Domain に対する禁止依存ルールの追加<br>② screen / feature → knowledge-graph-repository 等の直接アクセス禁止<br>③ AI サービス → Research Dataset への直接アクセス禁止<br>④ ArchitectureGuard 違反ゼロの確認<br>⑤ KNOWN_FEATURES に Wave2 全 Feature を追加 |
| **依存PR** | PR-041〜072（Wave2 全 PR）|
| **成果物** | ArchitectureGuard 更新 / RouteRegistry 更新 / テスト |
| **完了条件** | ① Wave2 全 Domain に禁止ルールが存在する<br>② Architecture Health: A（違反ゼロ）<br>③ KNOWN_FEATURES が Wave2 全 Feature を含む |
| **次PRへの入力** | PR-074（Integration Test Suite）の前提 |

---

### PR-074: Wave2 Integration Test Suite

| 項目 | 内容 |
|---|---|
| **目的** | Wave1〜Wave2 の統合テストスイートを完成させ、全 Exit Criteria の自動検証を実現する |
| **責務** | ① Phase A〜F の全 PR を横断する統合テスト（E2E シナリオ）<br>② Exit Criteria EC-01〜EC-15 の自動検証スクリプト<br>③ Exit Criteria QC-01〜QC-04 の自動確認<br>④ `vitest run` で全件パス確認<br>⑤ Pre-existing failures（既知の 35 件 tests/modules/）が増加していないことを確認 |
| **依存PR** | PR-073（ArchGuard 完了）|
| **成果物** | `tests/wave2/` 統合テストスイート / Exit Criteria 自動検証スクリプト |
| **完了条件** | ① 全統合テストパス<br>② EC-01〜EC-15 が自動スクリプトで PASS<br>③ Wave1 の既存テスト（3,424件+）が全件パス維持 |
| **次PRへの入力** | PR-075（Wave2 Exit Audit）の入力 |

---

### PR-075: Wave2 Exit Audit

| 項目 | 内容 |
|---|---|
| **目的** | Wave2 Exit Criteria（BD-040 / WAVE2_MASTER_DESIGN Section 12）を全項目 Founder 確認し、Wave3 移行を承認する |
| **責務** | ① EC-01〜EC-15 の全項目確認レポート生成<br>② QC-01〜QC-04 の全項目確認<br>③ BD-001〜BD-043 への違反ゼロ確認<br>④ `WAVE2_EXIT_CONFIRMED` DomainEvent の発行（Founder 承認記録）<br>⑤ Wave3 移行承認文書の生成 |
| **依存PR** | PR-074（Integration Test Suite）|
| **成果物** | Wave2 Exit Report / `WAVE2_EXIT_CONFIRMED` Event / Wave3 移行承認文書 |
| **完了条件** | ① EC-01〜EC-15 + QC-01〜QC-04 全 PASS<br>② BD-001〜BD-043 違反ゼロ<br>③ Founder が Wave3 移行を承認<br>④ **Wave2 正式完了** |
| **次PRへの入力** | Wave3 Roadmap の起点（Wave3 MASTER DESIGN 入力）|

---

## Domain Expansion Roadmap

### 新規 Domain 一覧（Wave2）

| Domain | 追加PR | 責務 |
|---|---|---|
| `persistence/` | PR-041〜042 | Supabase 永続化共通 Adapter 層 |
| `disease-entity/`（昇格）| PR-045 | Disease Entity フル構造体 |
| `disease-cluster/`（拡張）| PR-046 | Disease Cluster 統計 |
| `feature-vector-v2/` | PR-047 | 12次元 FeatureVector |
| `longitudinal-enricher/` | PR-048 | Edge への Longitudinal Context 付与 |
| `environmental-signal/` | PR-049 | 月齢等 Environmental Signal |
| `knowledge-graph/` | PR-051〜052 | KG ノード / エッジ管理 |
| `feature-store/` | PR-053 | Signal 特徴量高速参照 |
| `cohort/` | PR-054 | Cohort Builder |
| `dataset-version/` | PR-055 | Dataset Version 管理 |
| `evidence/` | PR-056 | エビデンス集約層 |
| `ai-insight/` | PR-057〜058 | Signal Insight / Pattern Discovery |
| `ai-recommendation/` | PR-059〜060 | Case Recommendation / Similar Case Search |
| `ai-research/` | PR-061 | Research Assistance |
| `ai-safety/` | PR-062 | AI Safety バリデーション |
| `similarity-v2/` | PR-063〜065 | Similarity V2 / Network Score V2 / Snapshot V2 |
| `similarity-gate/` | PR-066〜067 | Phase 3 Validator / UI Public Gate |
| `research-v2/` | PR-068〜071 | Research Dataset V2 / DOI / Query API |

### 新規 Service 一覧（Wave2）

| サービス | 追加PR |
|---|---|
| NetworkSignalPersistenceService | PR-041 |
| EventPersistenceService | PR-042 |
| EmotionSignalGeneratorService | PR-043 |
| MenstrualPhaseResolverService | PR-044 |
| DiseaseEntityUpgradeService | PR-045 |
| DiseaseClusterStatisticsService | PR-046 |
| FeatureVectorV2Builder | PR-047 |
| LongitudinalEdgeEnricher | PR-048 |
| EnvironmentalSignalCollector | PR-049 |
| SignalIntelligenceV2Service | PR-050 |
| KnowledgeGraphService | PR-051 |
| KnowledgeGraphBuilder | PR-052 |
| FeatureStoreService | PR-053 |
| CohortBuilderService | PR-054 |
| DatasetVersionService | PR-055 |
| EvidenceLayerService | PR-056 |
| SignalInsightService | PR-057 |
| PatternDiscoveryService | PR-058 |
| CaseRecommendationService | PR-059 |
| SimilarCaseSearchService | PR-060 |
| ResearchAssistanceService | PR-061 |
| AISafetyValidator | PR-062 |
| SimilarityEngineV2 | PR-063 |
| DiseaseNetworkScoreV2Service | PR-064 |
| SimilaritySnapshotV2Service | PR-065 |
| Phase3CompletionValidator | PR-066 |
| SimilarityPublicGateService | PR-067 |
| ResearchDatasetV2Service | PR-068 |
| CohortResearchExportService | PR-069 |
| DOICandidateService | PR-070 |
| ResearchQueryApiService | PR-071 |

### 新規 Repository 一覧（Wave2）

| リポジトリ | テーブル | 追加PR |
|---|---|---|
| NetworkSignalRepository（Supabase移行）| `network_signals` | PR-041 |
| EventPersistenceRepository | `ippo_events` | PR-042 |
| DiseaseClusterRepository | `disease_cluster_snapshots` | PR-046 |
| FeatureVectorV2Repository | `feature_vectors_v2` | PR-047 |
| KnowledgeGraphRepository | `kg_nodes` / `kg_edges` | PR-051 |
| FeatureStoreRepository | `feature_store` | PR-053 |
| CohortRepository | `research_cohorts` | PR-054 |
| DatasetVersionRepository | `research_dataset_versions` | PR-055 |

### 新規 Snapshot 一覧（Wave2）

| Snapshot | 生成周期 | 追加PR | BD |
|---|---|---|---|
| DiseaseClusterSnapshot | 週次 | PR-046 | BD-018 |
| FeatureVectorV2Snapshot | Case 生成時 | PR-047 | BD-018 |
| EnvironmentalSignalSnapshot | 日次 | PR-049 | BD-018 |
| KnowledgeGraphSnapshot | 月次 | PR-052 | BD-018 |
| SimilaritySnapshotV2 | 計算時 | PR-065 | BD-018 |

### 新規 DomainEvent 一覧（Wave2）

Wave1: 15イベント → Wave2完了: **27イベント**（+12）

| イベント | 追加PR | 集約 |
|---|---|---|
| EMOTION_SIGNAL_GENERATED | PR-043 | SIGNAL |
| MENSTRUAL_PHASE_RESOLVED | PR-044 | MENSTRUAL |
| DISEASE_ENTITY_UPGRADED | PR-045 | DISEASE |
| DISEASE_CLUSTER_COMPUTED | PR-046 | DISEASE |
| FEATURE_VECTOR_V2_CREATED | PR-047 | SIMILARITY |
| LONGITUDINAL_EDGE_ENRICHED | PR-048 | SIMILARITY |
| ENVIRONMENTAL_SIGNAL_RECORDED | PR-049 | RECORD |
| KNOWLEDGE_GRAPH_NODE_ADDED | PR-051 | KNOWLEDGE |
| KNOWLEDGE_GRAPH_EDGE_ADDED | PR-051 | KNOWLEDGE |
| COHORT_DEFINED | PR-054 | RESEARCH |
| DATASET_VERSION_PUBLISHED | PR-055 | RESEARCH |
| WAVE2_EXIT_CONFIRMED | PR-075 | SYSTEM |

---

## Knowledge Layer Roadmap

### Wave2 終了時点での Layer 完成状況

```
Layer 0:  Raw Input（保存しない）          → 変更なし
Layer 1:  Record（永久保存 / SSOT）        → 変更なし（Wave1完了）
Layer 2:  NetworkSignal                   → ✓ Wave2完了（Supabase永続化 / PR-041）
Layer 3:  Disease Entity                  → ✓ Wave2完了（フル構造体 / PR-045）
Layer 4:  FeatureVector V2（12次元）       → ✓ Wave2完了（PR-047）
Layer 5:  Case（永久保存）                 → 変更なし（Wave1完了）
Layer 6:  Intelligence Layer              → ✓ Wave2強化完了（Phase情報 / Emotion / PR-050）
Layer 7:  Network Layer（V2 Edge）        → ✓ Wave2完了（Longitudinal / PR-063〜065）
Layer 8:  Research Asset（Dataset V2）    → ✓ Wave2完了（KG含む / PR-068〜070）
Layer 9:  Knowledge Graph（骨格）         → ✓ Wave2完了（Disease×Symptom×Outcome / PR-051〜052）
Layer 10: Feature Store / Embedding       → Wave3 スコープ（Wave2では未実装）
Layer 11: Disease Intelligence Model      → Wave4 スコープ
Layer 12: Disease Ontology               → Wave5〜 スコープ
```

Wave2 で Layer 0〜9 が完成する。**Layer 10〜12 は Wave3 以降。**

---

## AI Platform Roadmap

| AI 機能 | 担当PR | 実装手法 | BD制約 |
|---|---|---|---|
| Signal Insight | PR-057 | ルールベース + テンプレート | BD-031 / BD-038 |
| Pattern Discovery | PR-058 | 統計計算（相関係数）| BD-031 / BD-038 |
| Case Recommendation | PR-059 | FV V2 ベース類似度 | BD-026 / BD-029 / BD-030 |
| Similar Case Search | PR-060 | SimilarityEngine V2 拡張 | BD-030 / BD-021 |
| Research Assistance | PR-061 | 統計クエリ集約 | BD-031 |
| Knowledge Search | PR-071 | KG Path Query | BD-036 |
| AI Safety Layer | PR-062 | 禁止ワードバリデーション | BD-031 / BD-038（全 AI 出力に適用）|

**Wave2 は全 AI をルールベース / 統計計算で実装する。LLM / ML モデルは Wave3。**

---

## Research Platform Roadmap

| 機能 | 完成PR | 前提PR |
|---|---|---|
| Feature Store | PR-053 | PR-041 / PR-044 / PR-047 |
| Knowledge Graph | PR-052 | PR-045 / PR-046 / PR-051 |
| Cohort Builder | PR-054 | PR-046 / PR-053 |
| Dataset V2 | PR-068 | PR-052 / PR-055 / PR-063 |
| Dataset Version | PR-055 | PR-054 |
| Evidence Layer | PR-056 | PR-042 / PR-052 / PR-055 |
| DOI Candidate | PR-070 | PR-055 / PR-069 |
| Research Query API | PR-071 | PR-056 / PR-060 / PR-061 / PR-070 |
| Similarity（公開条件検証）| PR-067 | PR-059 / PR-066 |
| AI Insight | PR-057〜062 | PR-053（Feature Store）|

---

## Infrastructure Migration

Wave1 → Wave2 の移行順序:

### Step 1: Signal Migration（PR-041）

```
対象: NetworkSignal（6種）
移行元: in-memory（NetworkSignalRepository Wave1）
移行先: Supabase `network_signals`
方針:
  - インターフェースを維持した Adapter 差し替え（既存テストを壊さない）
  - Wave1 in-memory モードを「テスト専用モード」として残す
  - 移行前データ: Wave1 in-memory は移行しない（Wave1 はセッション限り）
  - 移行後: 全新規 Signal が Supabase に永続化される
```

### Step 2: Event Migration（PR-042）

```
対象: DomainEvent
移行元: in-memory EventStore
移行先: Supabase `ippo_events`
方針:
  - EventPublisher → EventPersistenceService → ippo_events の Bridge を追加
  - in-memory EventStore は維持（Replay 用 / テスト用）
  - 移行前イベント: 再送しない（新規発行分のみ永続化開始）
```

### Step 3: Snapshot Migration（PR-046 / PR-047 / PR-065）

```
対象: Signal Snapshot / Feature Vector / Similarity Snapshot
移行先:
  disease_cluster_snapshots: PR-046
  feature_vectors_v2: PR-047
  Similarity Snapshot V2: PR-065
方針:
  - 既存 Wave1 Snapshot（signal_snapshots等）は保持
  - V2 Snapshot を別テーブルで管理（混在禁止 / BD-042）
```

### Step 4: Similarity Migration（PR-063）

```
対象: SimilarityEngine / FeatureVector / Edge
移行元: V1（8次元）
移行先: V2（12次元）
方針:
  - V1 Edge を削除しない（BD-001）
  - V1 / V2 Edge を vectorVersion で分岐（BD-042）
  - 新規 Case は V2 FeatureVector のみ生成
  - 旧 Case の V2 再計算は後日（Wave3 バッチ移行）
```

### Step 5: Event Sourcing Migration（PR-042 → PR-073）

```
対象: 全 DomainEvent（15種 Wave1 + 12種 Wave2）
方針:
  - PR-042 で ippo_events テーブル確立
  - PR-041〜072 の各 PR で DomainEvent を ippo_events に追加
  - PR-073 で全 Event が ippo_events に記録されることを確認
```

### Step 6: Research Migration（PR-068〜070）

```
対象: Research Dataset V1 → V2
方針:
  - V1 Dataset は削除しない（Append-Only / BD-036）
  - V2 Dataset は新規バージョンとして発行
  - DOI Candidate は V2 以降のみ付与
```

---

## Technical Debt Resolution

WAVE2_MASTER_DESIGN Section 11-C で定義した「Wave2 中に解消必須の負債」の解消 PR:

| 負債 | 解消PR | 確認方法 |
|---|---|---|
| NetworkSignal in-memory（BD-022）| **PR-041** | Supabase テーブル確認 / in-memory 参照ゼロ |
| Emotion Signal 未生成（BD-024）| **PR-043** | 6種 Signal 生成テスト |
| MenstrualPhase UNKNOWN 固定（BD-014）| **PR-044** | Phase 判定テスト |
| Disease Entity が diseaseKey 文字列（BD-004）| **PR-045** | Disease Entity 構造体テスト |
| Event Sourcing が in-memory のみ（BD-017）| **PR-042** | ippo_events Immutable テスト |
| FeatureVector が 8次元（BD-010）| **PR-047** | 12次元 / VECTOR_VERSION='2' テスト |
| SimilarityEdge に longitudinalContext なし（BD-012）| **PR-048** | Edge 構造体テスト |

---

## Risks

### R-01: Phase A の連鎖依存リスク

```
リスク: PR-041〜045 は互いに依存しており、一つの遅延が全体に波及する
軽減:
  - PR-041（NetworkSignal Persistence）を最優先で着手し、完了後に PR-042〜045 を並行開始
  - PR-043 は PR-041 + PR-042 完了後のみ着手可能
  - PR-042（ippo_events）は PR-041 と独立して並行着手可能
```

### R-02: Disease Entity 昇格の後方互換リスク（BD-035）

```
リスク: diseaseKey → DiseaseEntity 変更で既存 Case / Edge の参照が壊れる
軽減: PR-045 で diseaseKey フィールドを内包フィールドとして必ず残す
      PR-075（Exit Audit）で既存テスト全件パスを確認
```

### R-03: Knowledge Graph スキーマ設計の固定化

```
リスク: Wave2 で定義した KG スキーマが Wave3 拡張の妨げになる
軽減: PR-051 で拡張可能な attributes（JSONB）カラムを KG ノード / エッジに含める
      Wave3 での新ノード型追加を妨げないスキーマにする
```

### R-04: AI Safety Layer の抜け道

```
リスク: PR-057〜061 の AI サービスが PR-062（AI Safety Layer）以外のルートで出力する
軽減: PR-062 完了前に PR-057〜061 を ApiGateway に公開しない
      ApiGateway レベルで AISafetyValidator を必ず経由する設計
```

### R-05: Phase 3 完了条件の未達

```
リスク: ユーザー数が少ない段階では疾患別 Case 数 ≥ 50 を満たせない可能性
軽減: PR-066 は「条件未達の判定」を正常系として設計する
      未達でも PR-067（Public Gate）は実装する（条件が揃ったときに公開できる状態）
      Founder が「条件未達での公開猶予」を判断できるフローを設計
```

### R-06: Supabase スキーマ変更のコンフリクト

```
リスク: Wave2 で多数のテーブルを追加する際に既存テーブルとコンフリクトする
軽減: 新テーブルの追加のみ。既存テーブルへのカラム削除は禁止。
      追加カラムは NULL 許容で後方互換を確保。
```

---

## Wave2 Exit Criteria

Wave3 に進むための全条件（BD-040）。Founder 確認が必要。

### 必達条件チェックリスト（EC-01〜EC-15）

```
[ ] EC-01: NetworkSignal が Supabase に永続化されている（in-memory なし）
           確認: network_signals テーブル存在確認 / PR-041 完了

[ ] EC-02: Emotion Signal が Record 保存時に自動生成される
           確認: moodScore → EMOTION Signal テスト PASS / PR-043 完了

[ ] EC-03: MenstrualPhase が自動判定される（UNKNOWN が新規生成されない）
           確認: Phase 判定テスト PASS / PR-044 完了

[ ] EC-04: Disease Entity がフル構造体（icdCode / category / severity）
           確認: DiseaseEntity 構造体テスト PASS / PR-045 完了

[ ] EC-05: ippo_events テーブルが存在し Immutable 運用
           確認: DELETE 試行テスト失敗 / PR-042 完了

[ ] EC-06: FeatureVector が 12次元（VECTOR_VERSION='2'）で生成される
           確認: DIM_V2 12次元テスト PASS / PR-047 完了

[ ] EC-07: SimilarityEdge に longitudinalContext が付与されている
           確認: Edge 構造体テスト PASS / PR-048 完了

[ ] EC-08: Knowledge Graph 骨格（Disease × Symptom × Outcome ノード/エッジ）存在
           確認: KG クエリ PASS / PR-052 完了

[ ] EC-09: AI Signal Insight / Pattern Discovery が動作する（診断禁止遵守）
           確認: 禁止ワードバリデーション全テスト PASS / PR-062 完了

[ ] EC-10: Cohort Builder が動作し Research Dataset V2 を生成できる
           確認: k-anonymity テスト PASS / PR-054 / PR-068 完了

[ ] EC-11: Dataset Version に versionId が付与される
           確認: versionId 生成テスト PASS / PR-055 完了

[ ] EC-12: DiseaseClusterStatisticsService が動作する
           確認: Cluster プロファイルテスト PASS / PR-046 完了

[ ] EC-13: 全 Domain Event が ippo_events に記録される
           確認: 27種 Event すべての ippo_events 記録テスト PASS / PR-042〜073 完了

[ ] EC-14: ArchitectureGuard に Wave2 全 Domain の禁止ルールが追加されている
           確認: ArchGuard テスト全 PASS / Architecture Health: A / PR-073 完了

[ ] EC-15: テスト全件パス（Wave2 追加分含む）
           確認: vitest run で全件 PASS / PR-074 完了
```

### 品質条件チェックリスト（QC-01〜QC-04）

```
[ ] QC-01: Architecture Health A（違反ゼロ）
           確認: ArchitectureGuard 違反カウント = 0

[ ] QC-02: BD-001〜BD-043 への違反ゼロ
           確認: Wave2 Exit Audit Report で全 BD をチェック

[ ] QC-03: k-anonymity 検証テスト全件 PASS
           確認: k < 5 での Dataset 生成 / 公開が全テストで拒否される

[ ] QC-04: AI 出力に診断・治療・緊急度の文言がゼロ
           確認: AISafetyValidator の禁止ワードテスト全件 PASS
```

### Founder 確認項目

```
[ ] F-01: Research Platform Audit Report を Founder が確認・承認
[ ] F-02: Phase 3 Completion Validator の結果を Founder が確認
[ ] F-03: Wave2 Exit Report を Founder が確認
[ ] F-04: Wave3 移行を Founder が承認（WAVE2_EXIT_CONFIRMED Event 発行）
```

---

## Founder Checklist

Wave2 を通じて Founder が定期確認すべき事項:

| タイミング | 確認事項 |
|---|---|
| Phase A 完了時（PR-050後）| ① 全 Signal が Supabase に記録されているか<br>② Emotion / Phase / Disease Entity が正常動作しているか |
| Phase B 完了時（PR-050後）| ① Disease Cluster 統計が意味ある値を返しているか<br>② FeatureVector V2 が正常に 12次元で生成されているか |
| Phase C 完了時（PR-056後）| ① Knowledge Graph 骨格を見て、疾患×症状の関係が正しく反映されているか<br>② Cohort Builder で実際にコホートを定義してみる |
| Phase D 完了時（PR-062後）| ① Signal Insight の出力が医療的解釈になっていないか<br>② AI Safety Layer の禁止ワードリストを Founder が確認・承認 |
| Phase E 完了時（PR-067後）| ① Phase 3 Completion Validator のレポートを確認<br>② Similarity UI 公開の是非を Founder が判断（BD-026）|
| Phase F 完了時（PR-072後）| ① Research Platform Audit Report を確認・承認<br>② Dataset V2 の内容を研究者視点で確認 |
| Wave2 完了時（PR-075後）| ① EC-01〜EC-15 + QC-01〜QC-04 全 PASS を確認<br>② Wave3 移行承認 |

---

## Future Wave3 Inputs

Wave2 の設計が Wave3 に接続する箇所:

| Wave2 資産 | Wave3 拡張 | 接続PR |
|---|---|---|
| Feature Store V1（PR-053）| Signal Embedding（128次元）| Wave3 PR-001相当 |
| Knowledge Graph 骨格（PR-052）| Treatment / Biomarker ノード追加 | Wave3 PR-002相当 |
| AI Signal Insight（ルールベース / PR-057）| LLM 連携 Signal Insight | Wave3 PR-003相当 |
| Research Dataset V2（PR-068）| IRB 承認 → 外部研究者への公開 | Wave3 PR-004相当 |
| Cohort Builder（PR-054）| 臨床試験候補者選定 | Wave3 PR-005相当 |
| Environmental Signal（PR-049）| Environmental Signal の UI 開示（相関確認後）| Wave3 PR-006相当 |
| DOI Candidate（PR-070）| 正式 DOI 申請 | Wave3 開始時 |
| PARQUET stub（PR-040 Wave1）| PARQUET 正式実装 | Wave3 PR相当 |
| Phase 3 確認（PR-066〜067）| Phase 4（Similarity UI 公開）実行 | Wave3 最初の判断 |
| AISafetyValidator（PR-062）| LLM 出力への拡張適用 | Wave3 全 AI PR の前提 |

---

## Binding Decisions 整合性監査

本文書は以下の BD との整合性を確認した:

| BD | 対応PR | 整合状態 |
|---|---|---|
| BD-001（similarity_edges DELETE禁止）| PR-063 | ✓ V1 Edge 保持 |
| BD-002（consent_events DELETE禁止）| 全 PR | ✓ 変更なし |
| BD-004（Disease Entity Wave2昇格）| PR-045 | ✓ 対応済み |
| BD-009（Disease Cluster ID）| PR-046 | ✓ diseaseKey 同一 |
| BD-010（VECTOR_VERSION バンプ）| PR-047 | ✓ V2 追加 |
| BD-011（全Edge vectorVersion付与）| PR-063 | ✓ V2 Edge 全件付与 |
| BD-012（Longitudinal Edge Wave2）| PR-048 | ✓ 対応済み |
| BD-013（NetworkSignal SSOT）| PR-041 | ✓ SSOT 維持 |
| BD-014（MenstrualPhase Wave2）| PR-044 | ✓ 対応済み |
| BD-015（Layer 1保全 / 再構築性）| 全 PR | ✓ Record SSOT 維持 |
| BD-016（SSOT 一元化）| PR-041〜055 | ✓ 新テーブルはSSoT指定済み |
| BD-017（ippo_events Immutable）| PR-042 | ✓ DELETE禁止テスト |
| BD-018（Snapshot generatedAt）| PR-046〜065 | ✓ 全 Snapshot に付与 |
| BD-019（削除要求ポリシー）| 全 PR | ✓ Hard Delete 条件外 |
| BD-020（再構築可能性保護）| 全 PR | ✓ Layer 1 起点維持 |
| BD-021（Research Dataset Founder承認）| PR-068〜069 | ✓ Founder 承認フロー |
| BD-022（NetworkSignal Supabase）| PR-041 | ✓ 最優先 PR |
| BD-023（edgeId 再発行）| PR-065 | ✓ 再計算時新発行 |
| BD-024（Emotion Signal Wave2）| PR-043 | ✓ 対応済み |
| BD-026（フェーズ移行条件）| PR-066〜067 | ✓ Phase 3 Validator |
| BD-027（しきい値未達 公開禁止）| PR-066〜067 | ✓ Gate 設計 |
| BD-028（Layer 9〜11 SSOT非破壊）| PR-051〜052 | ✓ KG は読み取り専用 |
| BD-029（Participation Loop段階展開）| PR-059 / PR-067 | ✓ Phase 条件 |
| BD-030（ZERO TOLERANCE）| PR-059〜061 / PR-068〜069 | ✓ k<5禁止 / 個人特定禁止 |
| BD-031（AI 医療行為禁止）| PR-057〜062 | ✓ 全 AI サービス |
| BD-032（Marketplace 段階展開）| PR-067〜071 | ✓ Phase 条件連動 |
| BD-033（Founder Moat 3要素）| 全 PR | ✓ Record削除機能追加なし |
| BD-034（Priority 1 の順序）| PR-041 最優先 | ✓ Signal Persistence が最初 |
| BD-035（diseaseKey 内包保持）| PR-045 | ✓ 後方互換設計 |
| BD-036（KG Append-Only）| PR-051〜052 | ✓ DELETE禁止テスト |
| BD-037（Feature Store 入力制約）| PR-053 | ✓ Supabase Signal のみ |
| BD-038（AI 出力フラグ義務）| PR-057〜062 | ✓ 全出力チェック |
| BD-039（Cohort k≥5 検証）| PR-054 | ✓ kAnonymityVerified |
| BD-040（Exit Criteria Founder確認）| PR-075 | ✓ 全項目確認 |
| BD-041（DomainEvent ippo_events永続化）| PR-042〜073 | ✓ 各 PR で対応 |
| BD-042（V1/V2 混在禁止）| PR-063 | ✓ vectorVersion 分岐 |
| BD-043（Environmental Signal UI禁止）| PR-049 | ✓ バックグラウンドのみ |

**整合性監査結果: BD-001〜BD-043 全件 矛盾なし ✓**

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-006 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-27 |
| **承認** | Founder |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT |
| **前提文書** | IPPO-COUNCIL-005 WAVE2 MASTER DESIGN |
| **スコープ** | PR-041〜PR-075（Wave2 完全ロードマップ）|
| **PR総数** | 35 PR（7フェーズ）|
| **新 DomainEvent 数** | 12 追加（15 → 27 種）|
| **新 Domain 数** | 18 追加 |
| **次回改訂トリガー** | PR-050（Phase A 完了）時点での進捗レビュー |
| **Wave3 移行条件** | PR-075 完了 + Founder 承認 |

---

**WAVE2 ROADMAP COUNCIL — 議決完了 2026-06-27**
**承認: Founder**
**次回: Phase A 完了レビュー（PR-050後）**
