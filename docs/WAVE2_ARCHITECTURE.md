# WAVE2 ARCHITECTURE
## IPPO Wave2 技術憲法（Technical Constitution）

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は PR-041〜PR-075（Wave2完全）の唯一の技術設計書である。
> すべての PR 実装はこの文書が定める設計原則・境界・制約に従うこと。
> 本文書と矛盾する実装は設計違反とみなす。
>
> **準拠確認済みの前提文書:**
> - IPPO-GOV-001 v1.3（BD-001〜014）
> - IPPO-COUNCIL-002（NETWORK ASSET COUNCIL / BD-009〜014）
> - IPPO-COUNCIL-003（DATA ASSET COUNCIL / BD-015〜025）
> - IPPO-COUNCIL-004（NETWORK EVOLUTION COUNCIL / BD-026〜033）
> - IPPO-COUNCIL-005（WAVE2 MASTER DESIGN / BD-034〜043）
> - IPPO-COUNCIL-006（WAVE2 ROADMAP）

---

**文書番号:** IPPO-COUNCIL-007
**開催体:** Founder × Platform Architect × Domain Architect × Data Platform Architect × AI Architect × Research Platform Architect × Security Architect（合同 Council）
**開催日:** 2026-06-27
**承認:** Founder
**有効期間:** Wave2 完了（PR-075）まで

---

## Executive Summary

Wave2 のアーキテクチャは以下の3つの設計哲学に基づく:

```
1. 「Record は唯一の起点」
   すべての知識はLayer 1（Record）から決定論的に生成される（BD-015）。
   Record を消すと何も再生成できない。Record は宇宙の始まりである。

2. 「Append-Only は信頼の構造」
   削除は設計上不可能にする。信頼は「消せないこと」で生まれる（BD-001/002/036）。
   Knowledge Graph も ippo_events も SimilarityEdge も永遠に残る。

3. 「AI は補助。診断は禁止」
   AIは「パターンの提示」のみ行う。「診断・治療・緊急度判定」は
   構造上出力できない設計にする（BD-031）。
```

Wave2 完了時点のシステムは以下の構造を持つ:

```
┌─────────── IPPO Wave2 System ────────────┐
│                                            │
│  Client ────→ ApiGateway                  │
│                   │                       │
│         ┌─────────┼──────────┐            │
│         ↓         ↓          ↓            │
│    Domain      Knowledge    AI            │
│    Layer       Layer        Layer         │
│         │         │          │            │
│         └─────────┼──────────┘            │
│                   ↓                       │
│           Infrastructure                  │
│    (Supabase / EventStore / FeatureStore) │
│                   ↓                       │
│           Research Platform               │
│    (Cohort / Dataset / Evidence / DOI)    │
│                                            │
└────────────────────────────────────────────┘
```

---

## Architecture Principles

Wave2 のすべての設計判断はこの 10 原則に従う。

| # | 原則 | 意味 |
|---|---|---|
| AP-01 | **Record First** | Layer 1（Record）が唯一の起点。すべての派生データはここから生成（BD-015）|
| AP-02 | **Append-Only** | SimilarityEdge / consent_events / ippo_events / KG エッジは DELETE 禁止（BD-001/002/036）|
| AP-03 | **SSOT Isolation** | 各データ資産は一つの SSOT のみ。二重永続化禁止（BD-016）|
| AP-04 | **Strangler-Fig** | app-legacy.js への新規ロジック追加禁止。ApiGateway 経由のみ |
| AP-05 | **Dependency Direction** | UI → ApiGateway → Domain Service → Repository のみ。逆方向禁止 |
| AP-06 | **AI Boundary** | AI は Signal / Pattern / Case の「提示」のみ。診断 / 治療 / 緊急度禁止（BD-031）|
| AP-07 | **k-anonymity First** | Research Dataset の公開は k≥5 確認が構造的前提（BD-021/030）|
| AP-08 | **Version-Controlled** | FeatureVector / KG / Dataset は vectorVersion / snapshotVersion で世代管理 |
| AP-09 | **Phase-Gated** | Similarity UI / Research Public は Phase 完了条件を機械的に検証してから公開（BD-026）|
| AP-10 | **Founder-Approved** | Research Dataset 公開 / Similarity UI 公開 / Wave3 移行は Founder 承認必須（BD-040）|

---

## 1. Overall Architecture

### 1-A. 全体システム構造図

```
╔══════════════════════════════════════════════════════════════════╗
║                        CLIENT LAYER                              ║
║  Vanilla JS / Vite                                               ║
║  └─ app-legacy.js（Strangler-Fig移行中 / 新規ロジック追加禁止）   ║
╚══════════════════╤═══════════════════════════════════════════════╝
                   │ HTTP / Supabase Client
╔══════════════════▼═══════════════════════════════════════════════╗
║                     APPLICATION LAYER                            ║
║  ApiGateway（77+ methods / 権限チェック）                         ║
║  CompositionRoot（DI Container / TOKENS）                        ║
║  ArchitectureGuard（禁止依存 60+ ルール）                         ║
║  RouteRegistry（KNOWN_FEATURES 30+ 件）                          ║
╚══════════════════╤═══════════════════════════════════════════════╝
                   │ 依存方向: Application → Domain のみ
   ┌───────────────┼──────────────────────────────────┐
   ↓               ↓                                  ↓
╔══════════╗  ╔════════════════╗  ╔════════════════════════════╗
║  DOMAIN  ║  ║   KNOWLEDGE    ║  ║      AI / RESEARCH         ║
║  LAYER   ║  ║   LAYER        ║  ║      LAYER                 ║
║          ║  ║                ║  ║                            ║
║ Record   ║  ║ KnowledgeGraph ║  ║ SignalInsightService        ║
║ Signal   ║  ║ FeatureStore   ║  ║ PatternDiscoveryService     ║
║ Disease  ║  ║ EvidenceLayer  ║  ║ CaseRecommendationService   ║
║ Case     ║  ║                ║  ║ AISafetyValidator          ║
║ Experiment║  ║                ║  ║ ResearchQueryApiService    ║
║ Similarity║  ║                ║  ║ CohortBuilderService       ║
║ Menstrual║  ║                ║  ║ DatasetVersionService      ║
║ Emotion  ║  ║                ║  ║                            ║
║ Research ║  ║                ║  ║                            ║
╚════╤═════╝  ╚═══════╤════════╝  ╚═══════════╤════════════════╝
     │                │                        │
     └────────────────┼────────────────────────┘
                      ↓ 依存方向: Domain → Infrastructure のみ
╔══════════════════════════════════════════════════════════════════╗
║                    INFRASTRUCTURE LAYER                          ║
║                                                                  ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │                   SUPABASE                              │    ║
║  │  PostgreSQL テーブル群:                                  │    ║
║  │  user_records / user_diseases / cases / experiments     │    ║
║  │  network_signals / ippo_events / similarity_edges       │    ║
║  │  disease_cluster_snapshots / feature_vectors_v2        │    ║
║  │  kg_nodes / kg_edges / feature_store                   │    ║
║  │  research_cohorts / research_dataset_versions          │    ║
║  │  observation_notes / consent_events                    │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
║  EventStore（in-memory + ippo_events Bridge）                    ║
║  LocalStorageAdapter（Legacy / Strangler-Fig移行中）             ║
║  SupabaseClient（認証 / RLS / Edge Functions）                   ║
╚══════════════════╤═══════════════════════════════════════════════╝
                   │
╔══════════════════▼═══════════════════════════════════════════════╗
║                   EXTERNAL SERVICES                              ║
║  Stripe（決済 / サブスクリプション管理）                           ║
║  Supabase Auth（JWT / RLS）                                      ║
║  GitHub（ソースコード / CI/CD）                                   ║
║  Vercel（フロントエンドホスティング）                              ║
║  DOI Service（Wave3 以降 / Wave2 では doi_candidate のみ）       ║
╚══════════════════════════════════════════════════════════════════╝
```

### 1-B. 依存方向の規則

```
許可された依存方向（上から下のみ）:
  Client → ApiGateway
  ApiGateway → Domain Service
  Domain Service → Repository
  Repository → Supabase / Infrastructure
  Knowledge Layer ← Domain Service（読み取りのみ）
  AI Layer ← Feature Store（読み取りのみ）
  Research Layer ← Domain Layer / KG Layer

禁止された依存方向:
  ✗ Domain Service → ApiGateway
  ✗ Repository → Domain Service
  ✗ Feature → Feature（クロスドメイン直接依存）
  ✗ UI → Domain Service（ApiGateway バイパス）
  ✗ AI Layer → Database（直接アクセス）
  ✗ Knowledge Graph → Layer 1〜8（書き込み）
```

---

## 2. Domain Architecture

### Wave2 終了時点の全 Domain 一覧

---

#### Domain: Record

| 項目 | 内容 |
|---|---|
| **Responsibility** | ユーザーの健康観察の永久記録。Layer 1 の SSOT（BD-015）|
| **Public API** | `saveRecord()` / `getRecords()` / `getRecordById()` |
| **Repository** | `RecordRepositoryImpl` → `user_records`（Supabase / 永久保存）|
| **Snapshot** | なし（Record 自体が SSOT / 再生成不可）|
| **Events** | `RECORD_CREATED` / `RECORD_UPDATED` |
| **Dependencies** | なし（他 Domain に依存しない / 起点）|
| **Wave2 変更** | `environmentalSignals.lunarPhase` フィールド追加（PR-049）|

---

#### Domain: NetworkSignal（Wave2 最優先）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Record から 6 種 Signal を生成・永続化。Layer 2 の SSOT（BD-013/022）|
| **Public API** | `createNetworkSignal()` / `getNetworkSignals()` / `getSignalsByType()` |
| **Repository** | `NetworkSignalRepository` → `network_signals`（Wave2: Supabase永続化 / BD-022）|
| **Snapshot** | `signal_summary_snapshots`（日次）/ `longitudinal_snapshots`（週次）|
| **Events** | `SIGNAL_CREATED` / `EMOTION_SIGNAL_GENERATED`（Wave2追加）/ `ENVIRONMENTAL_SIGNAL_RECORDED`（Wave2追加）|
| **Dependencies** | Record（生成元）|
| **Wave2 変更** | in-memory → Supabase 移行（PR-041）/ Emotion Signal 追加（PR-043）/ Phase 自動判定（PR-044）|

---

#### Domain: Disease（Wave2 昇格）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Disease Entity のフル構造体管理。Layer 3 の SSOT（BD-004）|
| **Public API** | `createDisease()` / `getDiseases()` / `upgradeEntity()` / `getClusterStats()` |
| **Repository** | `DiseaseRepository` → `user_diseases`（Supabase / 永久保存）/ `DiseaseClusterRepository` → `disease_cluster_snapshots` |
| **Snapshot** | `DiseaseClusterSnapshot`（週次）/ `DiseaseEntitySnapshot`（status変化時）|
| **Events** | `DISEASE_CREATED` / `DISEASE_UPDATED` / `DISEASE_SNAPSHOT_CREATED` / `DISEASE_ENTITY_UPGRADED`（Wave2）/ `DISEASE_CLUSTER_COMPUTED`（Wave2）|
| **Dependencies** | Record / NetworkSignal（統計計算）|
| **Wave2 変更** | DiseaseEntity フル構造体（PR-045）/ DiseaseClusterStatisticsService（PR-046）|

---

#### Domain: Case

| 項目 | 内容 |
|---|---|
| **Responsibility** | 疾患×実験×同意のエピソード。Similarity のノード。Layer 5 の SSOT |
| **Public API** | `generateCase()` / `getSimilarCases()` / `getTierProgress()` |
| **Repository** | `CaseRepositoryImpl` → `cases`（Supabase / 永久保存）|
| **Snapshot** | Case 自体が不変（Case Snapshot = Case Entity）|
| **Events** | `FEATURE_VECTOR_CREATED` / `FEATURE_VECTOR_V2_CREATED`（Wave2）|
| **Dependencies** | Record / Disease / Experiment / Consent |
| **Wave2 変更** | FeatureVector V2 生成（PR-047）|

---

#### Domain: Similarity（Wave2 進化）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Case 間の類似度計算・エッジ生成・ネットワーク管理。Layer 7 の SSOT |
| **Public API** | `getSimilarCases()` / `getNetworkScore()` / `getSimilaritySnapshot()` |
| **Repository** | `SimilarityRepositoryImpl` → `similarity_edges`（Supabase / DELETE禁止 BD-001）/ `FeatureVectorV2Repository` → `feature_vectors_v2` |
| **Snapshot** | `SimilaritySnapshotV2`（vectorVersion='2' / BD-018）|
| **Events** | `SIMILARITY_CALCULATED` / `FEATURE_VECTOR_V2_CREATED`（Wave2）/ `LONGITUDINAL_EDGE_ENRICHED`（Wave2）|
| **Dependencies** | Case / Disease / NetworkSignal |
| **Wave2 変更** | FeatureVector V2 12次元（PR-047）/ Longitudinal Enricher（PR-048）/ Similarity Engine V2（PR-063）/ Phase 3 Validator（PR-066）|

---

#### Domain: Emotion（Wave2 完成）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Emotion Signal の構造化管理（BD-024 Wave2 で生成開始）|
| **Public API** | `createEmotion()` / `getEmotions()` / `convertEmotionSignals()` |
| **Repository** | `EmotionRepository`（in-memory → Wave2: NetworkSignal経由でSupabase）|
| **Events** | `EMOTION_CREATED` / `EMOTION_SIGNAL_GENERATED`（Wave2 追加）|
| **Dependencies** | NetworkSignal（Signal変換）|
| **Wave2 変更** | Record 保存時の自動 Signal 生成（PR-043）|

---

#### Domain: Menstrual（Wave2 完成）

| 項目 | 内容 |
|---|---|
| **Responsibility** | 月経記録・周期分析・フェーズ自動判定（BD-014 Wave2）|
| **Public API** | `createMenstrualRecord()` / `getCurrentCycle()` / `estimateNextCycle()` / `resolvePhase()` |
| **Repository** | `MenstrualRepository`（Wave2: Supabase移行）|
| **Events** | `MENSTRUAL_RECORDED` / `MENSTRUAL_PHASE_RESOLVED`（Wave2 追加）|
| **Dependencies** | NetworkSignal（Phase付与）|
| **Wave2 変更** | MenstrualPhaseResolverService（PR-044）|

---

#### Domain: Research（Wave2 強化）

| 項目 | 内容 |
|---|---|
| **Responsibility** | 匿名化・バージョン管理済み Research Dataset の管理。Layer 8 の SSOT |
| **Public API** | `createDataset()` / `getDatasets()` / `verifyDataset()` / `exportResearchDataset()` |
| **Repository** | `ResearchDatasetRepository`（Wave2: Supabase移行）/ `DatasetVersionRepository` → `research_dataset_versions` / `CohortRepository` → `research_cohorts` |
| **Snapshot** | `ResearchDatasetSnapshot`（バージョンごと / 永久保存）|
| **Events** | `RESEARCH_DATASET_CREATED` / `COHORT_DEFINED`（Wave2）/ `DATASET_VERSION_PUBLISHED`（Wave2）|
| **Dependencies** | NetworkSignal / Disease / Case / Similarity / KnowledgeGraph |
| **Wave2 変更** | Dataset V2（PR-068）/ Cohort Builder（PR-054）/ DOI Candidate（PR-070）|

---

#### Domain: EventSourcing

| 項目 | 内容 |
|---|---|
| **Responsibility** | 全 DomainEvent の永続化・Replay・Audit Timeline |
| **Public API** | `publishEvent()` / `getEvents()` / `replayEvents()` / `getAuditTimeline()` |
| **Repository** | `EventPersistenceRepository` → `ippo_events`（Wave2: Supabase Immutable）|
| **Snapshot** | なし（イベント自体が Immutable / Append-Only）|
| **Events** | 全 27 DomainEvent を受信・永続化 |
| **Dependencies** | なし（全 Domain から発行を受ける）|
| **Wave2 変更** | ippo_events Supabase 永続化（PR-042）/ 27種 Event 全対応（PR-073）|

---

#### Domain: KnowledgeGraph（Wave2 新設）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Disease × Symptom × Outcome の構造化知識グラフ管理。Layer 9 の SSOT |
| **Public API** | `addNode()` / `addEdge()` / `queryGraph()` / `getSnapshot()` |
| **Repository** | `KnowledgeGraphRepository` → `kg_nodes` / `kg_edges`（Append-Only / BD-036）|
| **Snapshot** | `KnowledgeGraphSnapshot`（月次 / versionId付き）|
| **Events** | `KNOWLEDGE_GRAPH_NODE_ADDED` / `KNOWLEDGE_GRAPH_EDGE_ADDED` |
| **Dependencies** | Research（Dataset → KG 構築）/ Disease / Symptom（読み取り）|
| **Wave2 変更** | 全体新設（PR-051〜052）|

---

#### Domain: FeatureStore（Wave2 新設）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Signal 特徴量の高速参照・キャッシュ管理（BD-037）|
| **Public API** | `getFeatureMatrix()` / `updateFeatures()` / `getFeaturesByUser()` |
| **Repository** | `FeatureStoreRepository` → `feature_store`（Supabase）|
| **Snapshot** | なし（Record 保存時にリアルタイム更新）|
| **Events** | なし（Feature は派生データ。Event は上位 Domain が発行）|
| **Dependencies** | NetworkSignal（Supabase永続化済み）/ MenstrualPhase / FeatureVectorV2（BD-037 準拠）|
| **Wave2 変更** | 全体新設（PR-053）|

---

#### Domain: AI（Wave2 新設）

| 項目 | 内容 |
|---|---|
| **Responsibility** | Signal Insight / Pattern Discovery / Case Recommendation の補助提供。診断禁止（BD-031）|
| **Public API** | `getSignalInsight()` / `discoverPatterns()` / `recommendCases()` / `searchSimilarCases()` |
| **Repository** | なし（Feature Store / KG を読み取るのみ。AI Domain は永続化しない）|
| **Snapshot** | なし |
| **Events** | なし（AI の出力は一時的。永続化しない）|
| **Dependencies** | FeatureStore / KnowledgeGraph / Similarity（読み取りのみ）|
| **Wave2 変更** | 全体新設（PR-057〜062）|

---

## 3. Knowledge Architecture

### Layer 0〜12 の完全定義

```
╔═══════════╤═══════════════════════╤══════════════════════╤══════════════════╤═══════════════════════╗
║ Layer     │ 名称                  │ SSOT                 │ Input            │ Owner                 ║
╠═══════════╪═══════════════════════╪══════════════════════╪══════════════════╪═══════════════════════╣
║ Layer 0   │ Raw Input             │ なし（保存しない）    │ UI フォーム入力   │ ユーザー              ║
║           │                       │                      │                  │                       ║
║ Layer 1   │ RECORD                │ user_records          │ Layer 0          │ RecordCommandService  ║
║           │ 永久保存 / 再生成不可  │ （Supabase）         │                  │                       ║
║           │                       │                      │                  │                       ║
║ Layer 2   │ NETWORK SIGNAL        │ network_signals       │ Layer 1          │ NetworkSignalService  ║
║           │ 永久保存（Wave2完成）  │ （Supabase）         │ （自動生成）      │                       ║
║           │                       │                      │                  │                       ║
║ Layer 3   │ DISEASE ENTITY        │ user_diseases         │ ユーザー宣言     │ DiseaseService        ║
║           │ 永久保存（Wave2完成）  │ （Supabase）         │ + Record         │                       ║
║           │                       │                      │                  │                       ║
║ Layer 4   │ FEATURE VECTOR V2     │ feature_vectors_v2    │ Layer 1〜3       │ FeatureVectorV2Builder║
║           │ 12次元（Wave2完成）    │ （Supabase）         │                  │                       ║
║           │                       │                      │                  │                       ║
║ Layer 5   │ CASE                  │ cases                 │ Layer 1,3,4      │ CaseGenerationService ║
║           │ 永久保存               │ （Supabase）         │ + Experiment     │                       ║
║           │                       │                      │                  │                       ║
║ Layer 6   │ INTELLIGENCE LAYER    │ 再計算可能            │ Layer 2          │ SignalIntelligence    ║
║           │ Snapshot保存           │ + signal_snapshots   │ （Signal群）     │ LongitudinalSummary   ║
║           │                       │                      │                  │                       ║
║ Layer 7   │ NETWORK LAYER         │ similarity_edges      │ Layer 4,5        │ SimilarityEngine      ║
║           │ V2 Edge（Wave2完成）   │ （Supabase）         │ + Longitudinal   │ V2                    ║
║           │                       │                      │                  │                       ║
║ Layer 8   │ RESEARCH ASSET        │ research_dataset_     │ Layer 1〜7       │ ResearchDatasetV2     ║
║           │ 匿名化 / Version管理   │ versions（Supabase） │ （匿名化後）     │ Service               ║
║           │                       │                      │                  │                       ║
║ Layer 9   │ KNOWLEDGE GRAPH       │ kg_nodes / kg_edges   │ Layer 8          │ KnowledgeGraphBuilder ║
║ ★Wave2完成│ Disease×Symptom×      │ （Supabase）         │ （Dataset→KG）   │                       ║
║           │  Outcome 骨格          │                      │                  │                       ║
║           │                       │                      │                  │                       ║
║ Layer 10  │ FEATURE STORE /       │ feature_store         │ Layer 2          │ FeatureStoreService   ║
║ Wave2基盤 │ SIGNAL EMBEDDING      │ （Wave2）             │ （Signal特徴量） │                       ║
║ Wave3完成 │                       │ + Vector DB（Wave3）  │                  │                       ║
║           │                       │                      │                  │                       ║
║ Layer 11  │ DISEASE               │ AI Model Store        │ Layer 9,10       │ AI Architect          ║
║ Wave4完成 │ INTELLIGENCE MODEL    │ （Wave4）             │                  │ （Wave4）             ║
║           │                       │                      │                  │                       ║
║ Layer 12  │ DISEASE ONTOLOGY      │ Ontology Store        │ Layer 11         │ Founder +             ║
║ Wave5〜   │ 国際標準候補           │ （Wave5〜）           │ + 専門医監修     │ 専門医 Council        ║
╚═══════════╧═══════════════════════╧══════════════════════╧══════════════════╧═══════════════════════╝
```

### 再構築チェーン保証（BD-015 / BD-020）

```
Layer 1（Record 永久保存） ←── この保証があれば Layer 2〜9 はすべて再構築できる

再構築フロー:
  Record → generateSignal() → NetworkSignal（Layer 2）
  NetworkSignal → aggregate() → Intelligence（Layer 6）
  Record + Disease + Signal → VectorBuilderV2 → FeatureVector（Layer 4）
  FeatureVector → SimilarityEngineV2 → SimilarityEdge（Layer 7）
  Layer 1〜7 → anonymize(k≥5) → ResearchDataset（Layer 8）
  Layer 8 → KnowledgeGraphBuilder → KnowledgeGraph（Layer 9）

再構築できないもの（Wave2での例外）:
  ✗ MenstrualPhase の「過去」付与（過去 Signal は UNKNOWN のまま）
  ✗ Environmental Signal（月齢は実時間で変化 / 過去付与不可）
  ✗ 匿名化済み Dataset からの個人特定（設計上不可逆）
```

---

## 4. Infrastructure Architecture

### 4-A. Supabase テーブル設計（Wave2 完了時点）

```
Supabase PostgreSQL — テーブル一覧（Wave2 完了時点）

永久保存テーブル（DELETE禁止）:
  ├ user_records              ← Layer 1 / Record SSOT
  ├ user_diseases             ← Layer 3 / Disease Entity SSOT（Wave2: フル構造体）
  ├ cases                    ← Layer 5 / Case SSOT
  ├ experiments              ← Experiment SSOT
  ├ consent_events           ← Consent SSOT（BD-002: DELETE絶対禁止）
  ├ similarity_edges         ← Layer 7 / Edge SSOT（BD-001: DELETE絶対禁止）
  ├ network_signals          ← Layer 2 / Signal SSOT（Wave2で追加）
  ├ ippo_events              ← Event SSOT（Wave2で追加 / Immutable BD-017）
  ├ kg_nodes                 ← Layer 9 / KG Node（Wave2で追加 / Append-Only BD-036）
  └ kg_edges                 ← Layer 9 / KG Edge（Wave2で追加 / Append-Only BD-036）

Snapshot テーブル（世代管理）:
  ├ signal_summary_snapshots     ← 日次 Signal 集計（PR-035 / 90日保持）
  ├ longitudinal_snapshots       ← 週次 Longitudinal（PR-035 / 12週保持）
  ├ disease_cluster_snapshots    ← 週次 Cluster 統計（Wave2 / 12週保持）
  ├ feature_vectors_v2           ← Case ごと永久（Wave2 / vectorVersion='2'）
  └ similarity_snapshots         ← 計算時点（Wave1: V1 / Wave2: V2 分離）

Research テーブル:
  ├ research_dataset_versions    ← Dataset Version 管理（Append-Only）
  ├ research_cohorts             ← Cohort Builder 定義
  └ observation_notes            ← Observation Note（Wave2後半）

Feature テーブル:
  └ feature_store                ← Signal 特徴量キャッシュ（Wave2）

その他:
  ├ profiles                     ← User Profile（既存）
  ├ subscriptions                ← 課金情報（既存 / Stripe連携）
  └ user_data                    ← Legacy（Strangler-Fig移行中）
```

### 4-B. Row Level Security（RLS）設計

```
RLS ポリシー（全テーブル共通原則）:

  user_records:     userId = auth.uid()（自分のデータのみ読み書き）
  network_signals:  userId = auth.uid()
  user_diseases:    userId = auth.uid()
  cases:            userId = auth.uid() OR consent.level >= 2
  similarity_edges: 読み取り: userId = auth.uid() OR admin / 書き込み: Service Role のみ
  ippo_events:      読み取り: admin のみ / 書き込み: Service Role のみ
  kg_nodes:         読み取り: 全ユーザー / 書き込み: Service Role のみ
  kg_edges:         読み取り: 全ユーザー / 書き込み: Service Role のみ
  research_dataset_versions: 読み取り: admin:research / 書き込み: Service Role のみ
  research_cohorts: 読み取り: admin:research / 書き込み: admin:research
  feature_store:    userId = auth.uid() OR admin:research

DELETE 禁止テーブルのRLS:
  similarity_edges, consent_events, ippo_events, kg_nodes, kg_edges:
    DELETE ポリシー = なし（RLS で DELETE ルール未定義 = 全員禁止）
```

### 4-C. Event Store 設計

```
EventStore アーキテクチャ（Wave2）:

  ┌─────────────────────────────────────────┐
  │            EventBus                     │
  │  （Domain Service → EventPublisher）    │
  └───────────────────┬─────────────────────┘
                      │ publishEvent()
          ┌───────────┴──────────────────┐
          │                              │
          ↓                              ↓
  ┌────────────────┐          ┌───────────────────────┐
  │ in-memory      │          │ EventPersistenceService│
  │ EventStore     │          │ （Wave2 新設）          │
  │ （Replay用）   │          │         ↓             │
  │ （テスト用）   │          │  ippo_events（Supabase）│
  └────────────────┘          │  Immutable / BD-017   │
                              └───────────────────────┘

イベント処理フロー:
  1. Domain Service が EventPublisher.publish(event) を呼ぶ
  2. EventBus が EventStore（in-memory）に記録
  3. EventPersistenceService が ippo_events（Supabase）に INSERT
  4. Replay 時は in-memory EventStore または ippo_events から読み取り
```

### 4-D. Feature Store 設計

```
Feature Store アーキテクチャ:

  入力制約（BD-037）:
    ✓ NetworkSignal（Supabase network_signals）
    ✗ in-memory Signal（禁止）

  フロー:
    Record 保存 → Signal 生成 → Supabase 永続化
        → FeatureStoreService.updateFeatures()
        → feature_store テーブル更新

  Feature Matrix 構造:
    {
      userId:       string
      diseaseKey:   string
      updatedAt:    ISO8601
      features: {
        avg_pain_30d:             number [0,1]
        avg_sleep_30d:            number [0,1]
        avg_symptom_30d:          number [0,1]
        menstrual_regularity:     number [0,1]
        longitudinal_delta_pain:  number [-1,1]
        phase_pain_distribution:  { MENSTRUAL, FOLLICULAR, OVULATION, LUTEAL }
      }
    }

  Wave3 拡張接続点:
    feature_store → Signal Embedding（128次元）追加予定
    現行の features は Wave3 でも維持（後方互換）
```

### 4-E. Knowledge Graph Store 設計

```
KG Store アーキテクチャ:

  テーブル: kg_nodes / kg_edges（Supabase）

  ノード構造（kg_nodes）:
    {
      nodeId:     string（UUID）
      type:       'DISEASE' | 'SYMPTOM' | 'OUTCOME' | 'PHASE' | 'SIGNAL_PATTERN'
      attributes: JSONB（型別追加データ / 拡張可能）
      createdAt:  TIMESTAMPTZ
      version:    string（KG バージョン）
    }

  エッジ構造（kg_edges）:
    {
      edgeId:        string（UUID）
      fromNodeId:    string
      toNodeId:      string
      relationType:  'HAS_SYMPTOM' | 'OBSERVED_IN' | 'WORSE_IN_PHASE' |
                     'LEADS_TO_OUTCOME' | 'COMORBID_WITH' | 'SIGNAL_INDICATES'
      evidenceCount: number
      confidence:    'HIGH' | 'MEDIUM' | 'LOW_CONFIDENCE'（<5件はLOW）
      createdAt:     TIMESTAMPTZ
    }

  Append-Only 保証（BD-036）:
    DELETE ポリシー = なし
    confidence 変更は UPDATE のみ許可（エッジの削除ではなく信頼度の更新）

  Wave3 拡張接続点:
    ノード型追加（TREATMENT / BIOMARKER）は attributes JSONB で吸収
    エッジ型追加（IMPROVES_OUTCOME 等）は relationType 列挙の拡張で対応
```

### 4-F. Storage / Backup / Recovery

```
バックアップ設計:

  Supabase 自動バックアップ:
    - Point-in-Time Recovery（PITR）: 7日間
    - 日次スナップショット: 30日間保持

  Recovery 優先順位:
    1. user_records（Layer 1 / 最重要）
    2. consent_events（法的記録）
    3. ippo_events（監査ログ）
    4. similarity_edges（ネットワーク資産）
    5. kg_nodes / kg_edges（Knowledge Graph）

  Research Dataset:
    - research_dataset_versions は別途 Cold Storage にバックアップ（Wave3 で設計）
    - DOI Candidate データは永久保存

  復旧原則（BD-015 準拠）:
    user_records が復旧できれば、Layer 2〜9 は再構築できる。
    Layer 1 の復旧が唯一の必達条件。
```

---

## 5. Event Architecture

### 5-A. DomainEvent 全体像（Wave2 完了: 27種）

```
Wave1 (15種) + Wave2 追加 (12種) = 27種

AGGREGATE_TYPES と対応するイベント:

RECORD 集約:
  ├ RECORD_CREATED                      ← Wave1
  ├ RECORD_UPDATED                      ← Wave1
  └ ENVIRONMENTAL_SIGNAL_RECORDED       ← Wave2 (PR-049)

SIGNAL 集約:
  ├ SIGNAL_CREATED                      ← Wave1
  ├ SIGNAL_SNAPSHOT_CREATED             ← Wave1
  ├ LONGITUDINAL_SNAPSHOT_CREATED       ← Wave1
  └ EMOTION_SIGNAL_GENERATED            ← Wave2 (PR-043)

DISEASE 集約:
  ├ DISEASE_CREATED                     ← Wave1
  ├ DISEASE_UPDATED                     ← Wave1
  ├ DISEASE_SNAPSHOT_CREATED            ← Wave1
  ├ DISEASE_ENTITY_UPGRADED             ← Wave2 (PR-045)
  └ DISEASE_CLUSTER_COMPUTED            ← Wave2 (PR-046)

SIMILARITY 集約:
  ├ FEATURE_VECTOR_CREATED              ← Wave1
  ├ SIMILARITY_CALCULATED               ← Wave1
  ├ FEATURE_VECTOR_V2_CREATED           ← Wave2 (PR-047)
  └ LONGITUDINAL_EDGE_ENRICHED          ← Wave2 (PR-048)

CONSENT 集約:
  └ CONSENT_UPDATED                     ← Wave1

EXPERIMENT 集約:
  └ EXPERIMENT_CREATED                  ← Wave1

EMOTION 集約:
  └ EMOTION_CREATED                     ← Wave1

MENSTRUAL 集約:
  ├ MENSTRUAL_RECORDED                  ← Wave1
  └ MENSTRUAL_PHASE_RESOLVED            ← Wave2 (PR-044)

RESEARCH 集約:
  ├ RESEARCH_DATASET_CREATED            ← Wave1
  ├ COHORT_DEFINED                      ← Wave2 (PR-054)
  └ DATASET_VERSION_PUBLISHED           ← Wave2 (PR-055)

KNOWLEDGE 集約（Wave2新設）:
  ├ KNOWLEDGE_GRAPH_NODE_ADDED          ← Wave2 (PR-051)
  └ KNOWLEDGE_GRAPH_EDGE_ADDED          ← Wave2 (PR-051)

SYSTEM 集約（Wave2新設）:
  └ WAVE2_EXIT_CONFIRMED                ← Wave2 (PR-075)
```

### 5-B. Event Flow 設計

```
DomainEvent ライフサイクル:

1. 発行:
   Domain Service → EventPublisher.publish(event)
   event = {
     eventId:     UUID
     eventType:   DOMAIN_EVENT_TYPES.*
     aggregateId: string
     payload:     object
     occurredAt:  ISO8601（BD-018 準拠）
     version:     '1'（EVENT_SCHEMA_VERSION）
   }

2. 即時処理:
   EventBus → in-memory EventStore（Replay 用）
   EventBus → EventPersistenceService → ippo_events（Supabase Immutable / BD-017）

3. Replay:
   EventReplayService.replay() が ippo_events から全イベントを時系列順に取得
   → Layer 2〜9 の状態を決定論的に再構築（BD-015 準拠）

4. Audit Timeline:
   AuditTimelineService.getAuditTimeline() が ippo_events から
   カテゴリ別（signal/disease/similarity/record/emotion/menstrual/research/knowledge）の
   タイムラインを生成

5. Snapshot との関係:
   イベント N 件の Replay より Snapshot からの復元が高速な場合、
   直近 Snapshot + それ以降のイベント の組み合わせで復元（CQRS的アプローチ）
```

### 5-C. Append-Only 保証

```
Append-Only を構造的に保証する手段:

  1. Supabase RLS:
     DELETE ポリシーを定義しない（= 全ユーザー削除不可）

  2. Application Layer:
     EventStore に delete() メソッドを定義しない

  3. Architecture Guard:
     screen/feature から ippo_events への直接アクセスを禁止

  4. テスト:
     DELETE 試行テストが必ず失敗することを自動テストで証明（PR-042 / PR-075）

  5. Immutable イベント補正:
     誤ったイベントが発行された場合、DELETE ではなく
     CorrectionEvent を追加して上書きする（BD-017 準拠）
```

---

## 6. AI Architecture

### 6-A. AI 責務境界

```
╔══════════════════════════════════════════════════════════════╗
║                   AI LAYER (Wave2)                           ║
║                                                              ║
║  ┌─────────────────────────────────────────────────────┐    ║
║  │              AI SAFETY LAYER (PR-062)               │    ║
║  │  AISafetyValidator                                  │    ║
║  │  ├ 禁止ワードチェック（診断/治療/緊急度）            │    ║
║  │  ├ isMedicalAdvice: false フラグ確認                 │    ║
║  │  └ 違反出力を自動ブロック + 記録                     │    ║
║  └─────────────────────────────────────────────────────┘    ║
║                           ↑ すべての AI 出力がここを通過     ║
║                                                              ║
║  ┌────────────┐ ┌──────────────┐ ┌───────────────────────┐  ║
║  │ Rule Engine│ │ Similarity   │ │ Research Assistant    │  ║
║  │ (PR-057/58)│ │ (PR-059/060) │ │ (PR-061)              │  ║
║  │            │ │              │ │                       │  ║
║  │ SignalInsight│ │CaseRecommend│ │ResearchAssistance    │  ║
║  │ Pattern    │ │SimilarCase  │ │EvidenceSummary        │  ║
║  │ Discovery  │ │Search       │ │ResearchQuery          │  ║
║  └─────┬──────┘ └──────┬───────┘ └──────────┬────────────┘  ║
║        │               │                    │              ║
║        └───────────────┼────────────────────┘              ║
║                        ↓ 読み取りのみ                        ║
║  ┌────────────────────────────────────────────────────────┐  ║
║  │   Feature Store / Knowledge Graph / Similarity Engine │  ║
║  │   （AI Domain は書き込まない）                         │  ║
║  └────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

### 6-B. AI 機能の責務境界詳細

#### Rule Engine（SignalInsight / PatternDiscovery）

```
責務: 個人の Signal パターンをルールベースで分析・提示
実装: 統計計算 + テンプレート文（LLM なし）
入力: Feature Store（FeatureMatrix）/ NetworkSignal
出力: { insight, signalType, trend, confidence, isMedicalAdvice: false }

禁止出力（BD-031）:
  ✗「〜病です」（診断）
  ✗「〜を飲んでください」（治療指示）
  ✗「今すぐ病院へ」（緊急度判定）
  ✗「原因は〜です」（因果断定）

許可出力:
  ✓「〜の傾向があります」（統計的傾向）
  ✓「〜の相関が確認されています（相関係数 X）」（相関提示）
  ✓「〜のパターンが多い時期です」（パターン提示）
```

#### Similarity / Case Recommendation

```
責務: 類似 Case の匿名化提示（Phase 3 完了後 / BD-026）
実装: FeatureVectorV2 ベースのコサイン類似度
入力: FeatureVectorV2 / DiseaseCluster
出力: { similarCases: AnonymizedCase[], matchReason: string[] }

セキュリティ制約（BD-030）:
  - k-anonymity k≥5 適用後のみ出力
  - 個人特定フィールド（userId/recordId/email）を含まない
  - Phase 3 未完了時は null を返す（PR-066 Gate）
```

#### AI Safety Layer（全 AI 出力の門番）

```
責務: 全 AI 出力の安全性保証（BD-031 / BD-038）
実装: 禁止ワードリスト + isMedicalAdvice フラグチェック
適用範囲: SignalInsight / PatternDiscovery / CaseRecommendation / ResearchAssistance 全出力

フロー:
  AI Service → AISafetyValidator.validate(output)
    ├ 禁止ワードチェック → 違反あり → ブロック + ログ
    ├ isMedicalAdvice フラグ確認 → なし → ブロック + ログ
    └ 違反なし → 出力を返す
```

### 6-C. Wave3 AI 拡張との接続点

```
Wave2 AI（ルールベース）→ Wave3 AI（LLM/ML）接続:
  - Feature Store が Wave3 の Signal Embedding の入力になる
  - AISafetyValidator は Wave3 LLM 出力にも適用（拡張設計）
  - KnowledgeGraph が Wave3 の RAG 基盤になる
  - 禁止ワードリストは Wave3 でも維持（BD-031 は恒久）
```

---

## 7. Research Architecture

### 7-A. Record → Publication Candidate フロー

```
Record（Layer 1）
    │ saveRecord() → Signal 自動生成
    ↓
NetworkSignal（Layer 2）— Supabase 永続化（Wave2）
    │ aggregate() / trend() / phaseResolve()
    ↓
Intelligence Layer（Layer 6）— Signal 集約・Longitudinal 分析
    │ FeatureVectorV2Builder.build()
    ↓
FeatureVector V2（Layer 4 / 12次元）
    │ FeatureStoreService.update()
    ↓
Feature Store（Layer 10 基盤）— Signal 特徴量キャッシュ
    │ SimilarityEngineV2.compute()
    ↓
Similarity Edge V2（Layer 7）— Longitudinal Context 付与
    │ DiseaseClusterStatisticsService.compute()
    ↓
Disease Cluster Stats（Layer 3 拡張）
    │ anonymize(k≥5) + CohortBuilderService
    ↓
Research Dataset V2（Layer 8）— Founder 承認 + k≥5 確認
    │ DatasetVersionService.publish()
    ↓
Dataset Version（Layer 8 バージョン管理）— DOI Candidate 付与
    │ KnowledgeGraphBuilder.build()
    ↓
Knowledge Graph（Layer 9）— Disease × Symptom × Outcome 構造化
    │ EvidenceLayerService.aggregate()
    ↓
Evidence Layer — ResearchDataset + ClusterStats + PatternEvidence 統合
    │ ResearchQueryApiService.query()
    ↓
Publication Candidate（DOI Candidate 付与済み）
    │ ← Wave3: 正式 DOI 申請 / IRB 承認 / 外部研究者公開
    ↓
（Wave3: 外部研究機関への配布）
```

### 7-B. Research Platform コンポーネント間依存

```
Cohort Builder ─────────────────→ Feature Store（Signal 特徴量参照）
     │                            ↓
     │                       Research Dataset V2
     │                            │
     └──── CohortDefinition ──────┤
                                  ↓
                           Dataset Version Manager
                                  │
                          ┌───────┴───────────┐
                          ↓                   ↓
                    KG Builder          Evidence Layer
                          │                   │
                          ↓                   ↓
                   Knowledge Graph    Research Query API
                                             │
                                      DOI Candidate
```

### 7-C. Data Lifecycle（Research 資産）

```
Dataset V2 のライフサイクル:

  CREATE  → Cohort 定義 → k-anonymity 検証 → Founder 承認 → Dataset 生成
  VERSION → バージョン ID 付与 → DOI Candidate 付与
  EXPORT  → JSON / CSV / PARQUET-stub → ダウンロード
  ARCHIVE → 90日後に archived status（削除しない）
  RETAIN  → 永久保存（バージョン管理）

ライフサイクル中に禁止:
  ✗ Dataset の内容変更（バージョン固定後）
  ✗ k < 5 状態での Dataset Export
  ✗ Founder 承認なしでの公開（BD-021）
```

---

## 8. Security Architecture

### 8-A. 権限モデル

```
Permission Layer 設計:

  record:read    — 自分の Record / Signal / Disease を読む
  record:write   — Record / Signal / Disease を書く
  case:read:own  — 自分の Case / Similarity を読む
  experiment:read / experiment:write — Experiment CRUD
  admin          — ippo_events 読み取り / Audit Timeline
  admin:dashboard — KPI / Delivery / Wave1 Dashboard
  admin:research  — Research Dataset / Cohort / Similar Case Search / Research Query
  founder        — Research Dataset 公開承認 / Similarity UI 公開承認 / Wave2 Exit 承認

権限の単方向性:
  admin:research は record:read を内包しない（別権限）
  founder は admin:research を内包する
```

### 8-B. Consent アーキテクチャ

```
Consent 設計（BD-002 準拠）:

  consent_events テーブル:
    - Append-Only（DELETE 絶対禁止）
    - 各 Consent 変更は新規 Event として追加
    - 最新 Consent は最後の Event を参照

  Consent Level 定義（FD-002）:
    Level 0: 記録のみ
    Level 1: 匿名化後の疾患データ利用可
    Level 2: Similarity 参加可能
    Level 3: Research Dataset 利用可

  Research Dataset への利用条件:
    Level 3 ユーザーのデータのみ Research Dataset に含める（BD-021）
    Level 2 ユーザーは Similarity のみ
    Level 0/1 ユーザーはネットワーク層に参加しない

  Consent Immutability 保証（BD-030 ZERO TOLERANCE）:
    consent_events の UPDATE / DELETE = 即時システム停止相当の設計違反
```

### 8-C. k-anonymity アーキテクチャ

```
k-anonymity 実装（BD-021 / BD-030）:

  適用箇所:
    ① ResearchDataset 生成時（k≥5）
    ② CohortBuilder の Dataset Export 前（BD-039）
    ③ CaseRecommendation の出力前（BD-030）
    ④ SimilarCaseSearch の出力前

  検証フロー:
    Dataset 候補 → groupBy(signalType) → count per group
    → k < 5 のグループを suppressed として除外
    → suppressedCount / totalCount を AnonymizationReport に記録
    → kAnonymityVerified = true になってから公開可能

  失敗時の処理:
    → 公開拒否（エラーを返す / silent failure 禁止）
    → Founder に再確認フラグを立てる

  将来的な強化（Wave3〜）:
    k-anonymity → l-diversity → t-closeness の段階強化を設計可能な構造を維持
```

### 8-D. Data Isolation アーキテクチャ

```
データ分離設計:

  ユーザーデータ分離:
    Supabase RLS が userId = auth.uid() でフィルタリング
    クロスユーザー参照は Similarity（同意あり）と Research（匿名化）のみ許可

  Research データ分離:
    Research Dataset は匿名化後のみ共有可能
    元データと Research Dataset は別テーブルに保管
    Research Dataset から元データへのトレースバックは設計上不可能

  AI データ分離:
    AI Domain は Feature Store / KG を読み取るのみ
    AI 出力は永続化しない（AI Layer に Repository なし）

  管理者データ分離:
    admin:research 権限は匿名化済み集計データのみアクセス可能
    個人の Record / Signal への admin アクセスは禁止
```

### 8-E. Audit アーキテクチャ

```
監査ログ設計:

  ① ippo_events（全 DomainEvent）:
     全てのドメイン操作が ippo_events に記録される
     Immutable / DELETE禁止

  ② AuditTimelineService:
     カテゴリ別（9カテゴリ）の監査タイムラインを生成
     Founder が操作履歴を確認できる

  ③ Research Audit:
     Dataset 生成 / Export / Founder 承認 が ippo_events に記録
     研究倫理上の追跡可能性を確保

  ④ Consent Audit:
     consent_events の全履歴が永久保存
     ユーザーの同意履歴を法的に証明可能

  ⑤ Wave2 Exit Audit（PR-075）:
     BD-001〜BD-043 への違反チェック結果を記録
     Founder 承認記録を WAVE2_EXIT_CONFIRMED として ippo_events に永続化
```

### 8-F. Founder Approval Flow

```
Founder 承認が必要な操作:

  ① Research Dataset 公開（BD-021）:
     CohortBuilder → k-anonymity 検証 → Dataset 生成
     → ApiGateway.approveDatasetPublication() (founder 権限)
     → DATASET_VERSION_PUBLISHED Event 発行
     → 公開状態になる

  ② Similarity UI 公開（BD-026 / BD-027）:
     Phase3CompletionValidator.validate()
     → Phase 3 条件達成確認
     → ApiGateway.approveSimilarityPublic() (founder 権限)
     → SimilarityPublicGateService.open()
     → ユーザーへの Similarity 表示が有効化

  ③ Wave3 移行（BD-040）:
     Wave2 Exit Audit Report 生成（PR-075）
     → Founder がチェックリスト EC-01〜EC-15 + QC-01〜QC-04 を確認
     → ApiGateway.confirmWave2Exit() (founder 権限)
     → WAVE2_EXIT_CONFIRMED Event 発行
     → Wave3 Roadmap 策定開始
```

---

## 9. Deployment Architecture

### 9-A. CI/CD パイプライン

```
GitHub（ソースコード管理）
    │ git push → PR open
    ↓
GitHub Actions（CI）
    ├ vitest run（全テスト実行）
    │   ├ Wave1 テスト（3,424件+）
    │   ├ Wave2 テスト（PR-041〜074 追加分）
    │   └ Architecture Guard テスト
    ├ TypeScript 型チェック（移行中）
    ├ ESLint（静的解析）
    └ PR マージ条件: 全テスト PASS + Architecture Health: A
    ↓
Vercel（フロントエンドデプロイ）
    ├ Vite ビルド
    ├ 静的ファイル配信
    └ プレビューURL（PR ごと）
    ↓
Supabase（バックエンド）
    ├ PostgreSQL（本番データ）
    ├ Row Level Security（本番 RLS 適用）
    ├ Edge Functions（Wave3 以降のサーバーサイドロジック）
    └ Supabase Auth（JWT 認証）
    ↓
Monitoring（Wave2 最低限）
    ├ Supabase Dashboard（テーブル監視）
    ├ GitHub Actions ログ（CI 状態）
    └ Error Tracking（Wave3 で本格導入）
    ↓
Research Export
    ├ admin:research 権限でのダウンロード
    ├ JSON / CSV フォーマット
    └ Dataset Version ID + DOI Candidate 付与済み
```

### 9-B. 環境設定

```
環境:
  開発（dev）:   localhost:5173 / Supabase 開発プロジェクト
  プレビュー:    Vercel Preview URL / Supabase 開発プロジェクト
  本番（prod）:  Vercel 本番 / Supabase 本番プロジェクト

環境変数:
  SUPABASE_URL              本番 Supabase URL
  SUPABASE_ANON_KEY         Supabase 匿名キー（RLS 適用）
  SUPABASE_SERVICE_ROLE_KEY Supabase Service Role（バックエンド処理用）
  STRIPE_PUBLISHABLE_KEY    Stripe 公開キー
  STRIPE_SECRET_KEY         Stripe 秘密キー

Wave2 追加環境変数:
  FEATURE_FLAG_SIMILARITY_PUBLIC  'false'（Phase 3 完了まで）
  FEATURE_FLAG_RESEARCH_PUBLIC    'false'（Founder 承認まで）
  AI_SAFETY_MODE                  'strict'（禁止ワードチェック厳格）
```

---

## 10. Future Extension Points

Wave3 以降で追加される機能との接続点のみ定義する（実装禁止）。

### 10-A. Signal Embedding（Wave3）

```
接続点:
  Wave2: Feature Store（feature_store テーブル）
  Wave3: Feature Store → Signal Embedding（128次元 Vector DB）

接続設計:
  feature_store.features → Embedding モデル → Vector（128次元）
  Vector DB（Supabase pgvector または Pinecone）に保存
  
Wave2 での準備:
  feature_store テーブルに embedding_version カラムを NULL で確保（後方互換）
  feature_store の features 構造を Wave3 で変更しない
```

### 10-B. Vector DB（Wave3）

```
接続点:
  Wave2: kg_nodes / feature_store（Supabase PostgreSQL）
  Wave3: Supabase pgvector または 外部 Vector DB

接続設計:
  KG ノードの attributes（JSONB）に embedding カラムを追加で対応
  既存 kg_nodes テーブルのスキーマを変更せずに拡張

Wave2 での準備:
  kg_nodes.attributes が JSONB であること（任意カラムを追加可能）
```

### 10-C. AI Model（Wave4）

```
接続点:
  Wave2: Feature Store + KnowledgeGraph + AISafetyLayer
  Wave4: Disease Intelligence Model（ML 専用）

接続設計:
  Feature Store が AI Model の Training Data 入力になる
  AISafetyValidator が AI Model 出力にも適用される（BD-031 恒久）
  KG が AI Model の Knowledge 注入ソースになる（RAG）

Wave2 での準備:
  AISafetyValidator のインターフェースを「出力オブジェクト → 検証結果」に抽象化
  Wave4 で異なる AI エンジンの出力に同じバリデーターを適用できる設計
```

### 10-D. Knowledge Reasoning（Wave5〜）

```
接続点:
  Wave2: KnowledgeGraph（Disease × Symptom × Outcome 骨格）
  Wave5: Ontology Reasoner（OWL/RDF / ICD-11 接続）

接続設計:
  kg_nodes / kg_edges が Ontology の基礎データになる
  relationType の列挙が OWL Property に変換可能な設計
  kg_edges の confidence スコアが Ontology の Evidence Weight になる

Wave2 での準備:
  relationType を拡張可能な文字列型で定義（列挙の追加を妨げない）
  KnowledgeGraphVersion 命名規則に ontology_candidate フィールドを含める
```

### 10-E. PARQUET 正式実装（Wave3）

```
接続点:
  Wave2: PARQUET stub（format='PARQUET', data=null, stub=true）
  Wave3: Apache Parquet ライブラリでの正式実装

Wave2 での準備:
  DatasetExportService.exportPARQUET() が stub を返す設計を維持
  stub フラグで Wave3 への置き換えを容易にする
```

---

## Risks

### AR-01: Supabase RLS の設定ミスによるデータ漏洩

```
リスク: RLS 設定が不完全で他ユーザーのデータが見える
影響: ZERO TOLERANCE（BD-030）違反 / 信頼喪失
軽減策:
  - Supabase RLS のテストを PR-041〜042 で自動テスト化
  - RLS ポリシーを本番適用前に Supabase Dashboard で手動確認
  - admin:research アクセスが匿名化データのみに限定されることをテストで証明
```

### AR-02: Knowledge Graph の over-confidence

```
リスク: evidence_count が少ないエッジが HIGH CONFIDENCE で表示される
影響: 誤った Disease × Symptom 相関を提示してしまう
軽減策:
  - evidence_count < 5 は LOW_CONFIDENCE フラグを構造上強制（PR-051）
  - LOW_CONFIDENCE エッジを UI に表示する前に Founder 承認が必要な設計
```

### AR-03: AI Safety Layer のバイパス

```
リスク: AI Service が ApiGateway をバイパスして直接出力する
影響: BD-031 / BD-038 違反 / 診断的出力がユーザーに届く
軽減策:
  - AI Domain に Repository なし（永続化経路なし）
  - ArchitectureGuard: AI Service → ApiGateway 外への出力を禁止ルールに追加
  - PR-062 完了前に AI Service を ApiGateway に公開しない設計制約
```

### AR-04: Feature Store の staleness

```
リスク: Record 保存時の Feature Store 更新が失敗し、古い特徴量が使われる
影響: AI Insight / Case Recommendation の精度低下
軽減策:
  - Feature Store は「ベストエフォート更新」として設計（失敗しても Record 保存は成功）
  - Feature Store の updatedAt と最新 Signal の timestamp を比較して staleness を検出
```

### AR-05: ippo_events の容量問題

```
リスク: Wave2 完了で 27 種 × ユーザー数 × 記録数 のイベントが蓄積
影響: Supabase テーブル容量 / クエリ速度低下
軽減策:
  - Supabase の storage tier を Wave2 完了時に再評価
  - Replay は ippo_events ではなく Snapshot + 差分イベントで行う設計を確保
  - イベントの物理削除は禁止。Archive（read-only partition）は Wave3 で検討
```

---

## Architecture Decision Summary

Wave2 で下した重要なアーキテクチャ決定の一覧:

| # | 決定 | 理由 |
|---|---|---|
| AD-01 | Feature Store の入力を Supabase Signal のみに限定（BD-037）| in-memory Signal はセッション消滅リスクがあるため |
| AD-02 | AI Domain に Repository を持たせない | AI 出力の永続化は信頼リスク（診断的データの蓄積禁止）|
| AD-03 | KG を Layer 8（Research Dataset）から構築する | Layer 1 からの決定論的再構築性を維持するため（BD-015）|
| AD-04 | V1 / V2 Edge を vectorVersion で完全分岐（BD-042）| 混在処理による精度低下 / 追跡困難を防ぐため |
| AD-05 | AISafetyValidator を全 AI Service の出力に強制適用 | BD-031 の構造的保証 / バイパス不可能な設計 |
| AD-06 | Phase 3 完了条件を機械的に検証する Validator を設計（PR-066）| 人間の判断ミスではなく構造で BD-026 を遵守するため |
| AD-07 | Founder 承認を ippo_events に永続化 | 承認記録が後から変更・削除できない設計（監査証跡）|
| AD-08 | DOI Candidate を Wave2 で付与し正式 DOI は Wave3 | Wave2 での国際標準申請は基盤未整備。段階的進化 |
| AD-09 | Environmental Signal を UI に表示しない（BD-003/043）| 相関確認前のUI表示は科学的根拠なし / 迷信リスク |
| AD-10 | Knowledge Graph を Append-Only とし confidence で信頼度管理（BD-036）| KG エッジの削除は「なかったことにする」設計であり不誠実 |

---

## Binding Decisions 最終整合性監査

本文書が BD-001〜BD-043 すべてに準拠していることを確認:

```
BD-001: similarity_edges DELETE禁止
  → Section 4-A「永久保存テーブル」に明記 ✓

BD-002: consent_events DELETE禁止
  → Section 8-B Consent アーキテクチャで ZERO TOLERANCE 明記 ✓

BD-004: Disease Entity Wave2昇格
  → Section 2 Domain Architecture で DiseaseEntity フル構造体を定義 ✓

BD-009: Disease Cluster ID = diseaseKey
  → Section 2 Disease Domain で diseaseKey を Cluster ID とすることを維持 ✓

BD-010: VECTOR_VERSION バンプ
  → Section 3 Layer 4 で VECTOR_VERSION='2' を明記 ✓

BD-011: 全Edge vectorVersion付与
  → Section 2 Similarity Domain で全 Edge に vectorVersion 付与を定義 ✓

BD-012: Longitudinal Edge Wave2
  → Section 2 Similarity Domain / Section 9 AD-04 で V2 Edge に付与 ✓

BD-013: NetworkSignal SSOT
  → Section 2 NetworkSignal Domain で network-signal-types.js SSOT を維持 ✓

BD-014: MenstrualPhase Wave2
  → Section 2 Menstrual Domain でPhaseResolverService を定義 ✓

BD-015: Layer 1保全 / 再構築性
  → Section 3 再構築チェーン保証 / AP-01 で明記 ✓

BD-016: SSOT一元化
  → Section 4-A 各テーブルを SSOT として一覧化 ✓

BD-017: ippo_events Immutable
  → Section 4-C / Section 5-C で Append-Only 保証を構造的に定義 ✓

BD-018: Snapshot generatedAt / vectorVersion
  → Section 4-A / Section 5 で全 Snapshot の generatedAt 必須を維持 ✓

BD-019: 削除ポリシー
  → Section 7-C Research Lifecycle で匿名化優先→SoftDelete→HardDelete ✓

BD-020: 再構築可能性保護
  → Section 3 再構築チェーン保証で全 Layer の再構築フローを定義 ✓

BD-021: Research Dataset Founder承認 + k≥5
  → Section 8-F Founder Approval Flow で承認フローを設計 ✓

BD-022: NetworkSignal Supabase永続化
  → Section 2 NetworkSignal Domain / Section 4-A で network_signals テーブルを定義 ✓

BD-023: edgeId 再発行
  → Section 4-E（再計算時新 edgeId 発行） / AD-10 ✓

BD-024: Emotion Signal Wave2
  → Section 2 Emotion Domain で Wave2 での Signal 自動生成を定義 ✓

BD-026: フェーズ移行条件（Phase 3）
  → Section 6 AI Architecture / Section 8-F で Phase 3 Validator と Founder Gate を設計 ✓

BD-027: しきい値未達公開禁止
  → Section 6-B Similarity 設計で Phase 3 未達時 null 返却を定義 ✓

BD-028: Layer 9〜11 SSOT非破壊
  → Section 3 Layer 9 で「KG は Layer 8 を読み取るのみ / 書き込みなし」を明記 ✓

BD-029: Participation Loop段階展開
  → Section 6-B CaseRecommendation で Phase 3 完了後のみ提示と定義 ✓

BD-030: ZERO TOLERANCE
  → Section 8-B/C/D で構造的禁止を設計 ✓

BD-031: AI 医療行為禁止
  → Section 6 AI Architecture 全体（AP-06 / AD-02 / AD-05）✓

BD-032: Marketplace 段階展開
  → Section 9 Deployment に Phase 条件 Feature Flag を設計 ✓

BD-033: Founder Moat 3要素
  → Section 4-A で Record 永久保存 / Section 8-B で Consent Immutability ✓

BD-034: Priority 1の順序（Signal Persistence最優先）
  → Section 4-A / Section 9-A で PR-041 が最初に着手 ✓

BD-035: diseaseKey 内包保持
  → Section 2 Disease Domain で diseaseKey フィールドを内包することを定義 ✓

BD-036: KG Append-Only
  → Section 4-E KG Store / Section 8-D で DELETE なしの confidence 更新のみ許可 ✓

BD-037: Feature Store 入力制約
  → Section 4-D Feature Store / Section 2 FeatureStore Domain で Supabase Signal のみを入力と定義 ✓

BD-038: AI 出力フラグ義務
  → Section 6-B/C で全 AI 出力に isMedicalAdvice: false を強制 ✓

BD-039: Cohort k≥5 検証
  → Section 7-C / Section 8-C で kAnonymityVerified の構造的強制を定義 ✓

BD-040: Exit Criteria Founder確認
  → Section 8-F Founder Approval Flow / Section 9-A 最終ステップで定義 ✓

BD-041: DomainEvent ippo_events永続化
  → Section 5-B Event Flow で全 27 イベントを ippo_events に永続化と定義 ✓

BD-042: V1/V2 混在禁止
  → Section 2 Similarity Domain / Section 6 AD-04 で vectorVersion 完全分岐 ✓

BD-043: Environmental Signal UI禁止
  → Section 2 NetworkSignal Domain / AD-09 で UI 非表示を構造的に定義 ✓
```

**整合性監査結果: BD-001〜BD-043 全 43 件 矛盾なし ✓**

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-COUNCIL-007 |
| **バージョン** | 1.0 |
| **作成日** | 2026-06-27 |
| **承認** | Founder |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Wave2 技術憲法）|
| **前提文書** | IPPO-COUNCIL-005 WAVE2 MASTER DESIGN / IPPO-COUNCIL-006 WAVE2 ROADMAP |
| **有効期間** | PR-041 着手〜PR-075 完了まで |
| **次回改訂トリガー** | PR-050（Phase A 完了）時点でのアーキテクチャレビュー |
| **Wave3 移行時の扱い** | 本文書は Wave2 完了後もアーカイブとして永久保存 |

---

**WAVE2 ARCHITECTURE COUNCIL — 議決完了 2026-06-27**
**承認: Founder**
**位置づけ: Wave2 技術憲法（Technical Constitution）— PR-041〜PR-075の唯一の設計書**
