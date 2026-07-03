# IPPO EVOLUTION PROGRAM — マスターダッシュボード兼ハンドブック

## プロジェクト概要

ippo（女性疾患症例プラットフォーム）の設計・実装を進めている。

作業ブランチ: feat/phase4d-batch1-record-input

リポジトリ: C:/Users/USER/Documents/ippo

---

## Governing Document Hierarchy

設計変更時はこの優先順位を厳守する。矛盾がある場合は上位文書が正。

### LEVEL-1 — Binding Authority（変更にはFounder承認 + Council開催が必要）

| 文書 | ファイル | 主な管轄 |
|---|---|---|
| LEGACY ASSET INVENTORY | docs/LEGACY_ASSET_INVENTORY.md | 資産戦略・BD-001〜BD-014 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md | Signal Schema・Edge属性・Longitudinal / BD-009〜BD-014 |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md | データ資産8層・BD-015〜BD-025 |
| NETWORK EVOLUTION COUNCIL | docs/NETWORK_EVOLUTION_COUNCIL.md | 7フェーズ進化モデル・BD-026〜BD-033 |
| WAVE2 MASTER DESIGN | docs/WAVE2_MASTER_DESIGN.md | Wave2全体設計・BD-034〜BD-043 |
| WAVE2 ARCHITECTURE | docs/WAVE2_ARCHITECTURE.md | Wave2技術憲法 |
| WAVE2 ROADMAP | docs/WAVE2_ROADMAP.md | PR-041〜075 / 35PR |
| WAVE2 IMPLEMENTATION GOVERNANCE | docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md | 品質ゲート・GP-01〜GP-08 |
| BUSINESS STRATEGY | docs/BUSINESS_STRATEGY.md | 事業モデル・価格・BBS-001〜006 |
| GROWTH STRATEGY | docs/GROWTH_STRATEGY.md | 成長戦略・KPI・BGS-001〜005 |
| REGULATORY & MEDICAL COUNCIL | docs/REGULATORY_MEDICAL_COUNCIL.md | 規制・医療・倫理・BD-044〜052 |
| GO-TO-MARKET COUNCIL | docs/GTM_COUNCIL.md | 市場投入戦略・BD-053〜060 |
| FOUNDER STRATEGIC REVIEW | docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md | Wave2 Go/No-Go 監査（CONDITIONAL GO） |

### LEVEL-2 — Architecture Authority（変更にはアーキテクチャレビューが必要）

| 文書 | ファイル | 主な管轄 |
|---|---|---|
| Architecture V3 | docs/ARCHITECTURE_V3.md | Strangler-Fig戦略・レイヤー定義 |
| Implementation Plan | docs/IMPLEMENTATION_PLAN_V1.md | PRロードマップ・74PR計画（Wave1）|
| Domain Model | docs/DOMAIN_MODEL_V1.md | エンティティ・集約境界 |
| Schema V1 | docs/SCHEMA_V1.md | DBスキーマ確定 |
| Repository Constitution | docs/REPOSITORY_CONSTITUTION_V1.md | コーディング規約・DI設計 |

### LEVEL-3 — Implementation Reference（PR単位で更新可）

| 文書 | 主な管轄 |
|---|---|
| PR Spec（各会話内） | 個別PRの実装詳細・制約 |
| Test Files | 仕様の機械的証明 |
| このHANDOFF文書 | 引き継ぎ・現在地確認 |

---

## 戦略設計フェーズ 完了ステータス

| Council | 文書番号 | 最終判定 | BD |
|---|---|---|---|
| Business Strategy Council | IPPO-BUSINESS-001 | CONDITIONAL GO | BBS-001〜006 |
| Growth Strategy Council | IPPO-GROWTH-001 | GO | BGS-001〜005 |
| Regulatory & Medical Council | IPPO-REGULATORY-001 | CONDITIONAL GO（5条件）| BD-044〜052 |
| Go-To-Market Council | IPPO-GTM-001 | GO | BD-053〜060 |

**本文書をもって IPPO 戦略設計フェーズ完了。**

### 戦略上の条件（Regulatory CONDITIONAL GO 5条件）

| # | 条件 | 期限 |
|---|---|---|
| C-1 | プライバシーポリシー弁護士レビュー + 要配慮個人情報対応 | Wave2 Phase A 前 |
| C-2 | 医師アドバイザー1名招聘 | Wave2 Phase D 前 |
| C-3 | SaMD非該当の書面見解取得（BD-051）| Wave2 Phase D 前 |
| C-4 | Research Consent追加（BD-049）| Wave2 Phase B 前 |
| C-5 | Research Dataset提供契約書雛形作成 | Wave2 Phase F 前 |

---

## Current Architecture Snapshot（PR-048時点）

### Domains（実装済み）

| Domain | 主要サービス | 状態 |
|---|---|---|
| Record | RecordRepositoryImpl / RecordCommandService / RecordQueryService / DualWrite | Wave1完了 |
| Experiment | ExperimentRepositoryImpl / ExperimentStateMachine / ExperimentLifecycleService | Wave1完了 |
| Case | CaseRepositoryImpl / CaseGenerationService / TierEvaluator / OutcomeResolver | Wave1完了 |
| Consent | ConsentRepositoryImpl / ConsentEnforcementService | Wave1完了 |
| Similarity | VectorBuilder(8dim) / SimilarityCalculator / EdgeGenerator / SimilarityEngine | Wave1完了（非公開） |
| Auth | PermissionService / SimilarityAccessGuard | Wave1完了 |
| Symptom | symptom-types(SSOT) / symptom-entity / symptom-validator / symptom-service | Wave1完了 |
| Disease | disease-types(SSOT) / disease-entity / disease-validator / disease-service | Wave1完了 |
| Network Signal | network-signal-types(SSOT) / signal-entity / validator / service | Wave1完了 |
| Signal Intelligence | signal-aggregation / signal-trend / signal-timeline / signal-summary | Wave1完了 |
| Longitudinal | trend-window-builder / moving-average / baseline / longitudinal-signal / longitudinal-summary | Wave1完了 |
| Communication | NotificationSchedule / Template / Metrics | Wave1完了 |
| Delivery | DeliveryQueue / Scheduler / Processor / Retry / HealthMetrics | Wave1完了 |
| Analytics | KpiSnapshot / Wave1Dashboard / SnapshotAutomation / KpiScheduler | Wave1完了 |
| B2B Export | 匿名化 / アクセス制御 / 監査ログ | Wave1完了 |
| Event Sourcing | EventStore / EventBus / EventPublisher / EventReplayService / AuditTimelineService | PR-037完了 |
| Emotion | emotion-types(SSOT) / emotion-entity / emotion-validator / emotion-repository / emotion-service / emotion-signal-mapper | PR-038完了 |
| Menstrual | menstrual-types(SSOT) / menstrual-entity / menstrual-validator / menstrual-repository / menstrual-service / phase-calculator / cycle-analysis-service | PR-039完了 |
| Research Dataset | research-dataset-repository / research-dataset-builder / research-dataset-service / anonymization-service / dataset-export-service | PR-040完了 |
| **NetworkSignal V2 (Repository Interface)** | INetworkSignalRepository / NetworkSignalMemoryRepository / NetworkSignalPersistenceService / RepositoryFactory / RepositoryProvider / PersistenceConfig | **PR-041完了** |
| **NetworkSignal V2 (Supabase永続化)** | NetworkSignalSupabaseRepository / SupabaseEventPersistenceRepository / PersistenceConfig(supabase) | **PR-042完了** |
| **Disease Cluster Statistics** | disease-cluster-statistics-service / disease-cluster-snapshot-entity / DiseaseClusterStatisticsService(DI) | **PR-046完了** |
| **FeatureVector V2 (12次元)** | feature-vector-v2-types / feature-vector-v2-entity / feature-vector-v2-repository(BD-042) / feature-vector-v2-builder / feature-vector-v2-service | **PR-047完了** |
| **Longitudinal Edge Enricher** | longitudinal-edge-enricher / LongitudinalEdgeEnricher / computeCaseTrend / TREND_BONUS=0.05 / displayScore=rawScore+trendBonus | **PR-048完了** |
| **Environmental Signal Collector** | environmental-signal-types(SSOT) / EnvironmentalSignalCollector / computeLunarAge / computeLunarPhase / EnvironmentalSignalSnapshotService / ENVIRONMENTAL_SIGNAL_RECORDED | **PR-049完了** |
| **Signal Intelligence V2** | signal-intelligence-v2-service / SignalIntelligenceV2Service / aggregateByPhase / BD-024 Emotion含む全6種別 / createDailySnapshot | **PR-050完了** |
| **Knowledge Graph Foundation** | knowledge-graph-types(SSOT) / knowledge-graph-node-entity / knowledge-graph-edge-entity / knowledge-graph-repository(Append-Only) / knowledge-graph-service / KNOWLEDGE_GRAPH_NODE_ADDED / KNOWLEDGE_GRAPH_EDGE_ADDED | **PR-051完了** |
| **Knowledge Graph Builder** | knowledge-graph-builder / KnowledgeGraphBuilder.build() / Disease×Symptom×Outcome×Phase×SignalPattern / 全6エッジ種別 / knowledge-graph-snapshot-entity / KgVersion / KNOWLEDGE_GRAPH_SNAPSHOT_CREATED | **PR-052完了** |

### Architecture Health

```
Features (RouteRegistry):  62（PR-078: KNOWN_FEATURESに'DataDeletion'追加。既存17ファイルの固定値ドリフト(61→62)を是正 — PR-073/075/077と同型の回帰）
ApiGateway methods:        185+（PR-078: requestDataDeletion / confirmDataDeletionAnonymization / confirmDataDeletionSoftDelete / executeDataHardDelete / getDataDeletionRequestStatus / getAllDataDeletionRequests / getDataDeletionStatus の7メソッド追加）
Domain Event Types:        49（PR-078: DATA_DELETION_STAGE_ADVANCED追加）
DI TOKENS:                 333（PR-078: DataDeletionRepository / DataDeletionService追加）
Tests (全パス):            5,149件 / 279ファイル（39件は5ファイルの既知pre-existing failure、PR無関係。内訳: tests/modules/2ファイル(壊れたインポート) + domain-event-types.test.js + event-menstrual.test.js(29固定値ドリフト) + disease-analyzer.test.js(日付依存)。PR-078でtests/data-deletion/に32件・tests/arch/architecture-guard-pr078.test.jsに3件追加（既知failure件数・対象ファイルとも増加なしを確認済み））
ArchitectureGuard rules:   165（PR-078: screen/feature→DataDeletionService直接アクセス禁止 +2ルール）
Architecture Health:       A（違反ゼロ）
Technical Debt:            TD-001〜（TECHNICAL_DEBT_AUDIT.md参照。2026-06-24時点のまま陳腐化 — docs/RELEASE_READINESS_COUNCIL.md M-1で指摘済み、未再生成）
```

### Layer Stack（Strangler-Fig — Wave2 Phase A-2完了）

```
UI / Legacy (app-legacy.js)
         ↓  ApiGateway (82 methods)
Application Layer (CompositionRoot / DI Container)
         ↓
Domain Services (21 domains)
         ↓
NetworkSignalPersistenceService (Decorator / Event Publishing)
         ↓
NetworkSignalSupabaseRepository (Write-Through Cache + Supabase INSERT)
         ↓
Event Sourcing Layer (EventStore / SupabaseEventPersistenceRepository / BD-015)
         ↓
Supabase (network_signals / ippo_events)
```

---

## Roadmap Status

```
Phase 5 (基盤設計)
  ✓ PR-001〜010  基盤スケルトン / ドメイン実装 / E2E

Phase 6 (Strangler-Fig移行)
  ✓ PR-011       Bootstrap Bridge (DI / CompositionRoot / ArchGuard)
  ✓ PR-011.5     Contract Layer
  ✓ PR-012       Infrastructure Adapter Layer
  ✓ PR-013       Record Migration Hook
  ✓ PR-014       Dual Write & Diff Audit
  ✓ PR-015       Experiment Core Migration
  ✓ PR-016       Experiment State Machine & Case Foundation
  ✓ PR-017       Case Generation Engine V1
  ✓ PR-018       Consent Enforcement & Similarity Foundation
  ✓ PR-019       Similarity Engine V1

Phase 7 (Intelligence Foundation) — Wave1完了
  ✓ PR-020       Auth Domain & API Gateway
  ✓ PR-021       Record V2 ReadSwitch + UX Foundation
  ✓ PR-022       Engagement & Consent Layer
  ✓ PR-023       Communication Decision Layer
  ✓ PR-024       Delivery & Admin Analytics Layer
  ✓ PR-025       Delivery Infrastructure Completion
  ✓ PR-026       Operations & KPI Automation
  ✓ PR-027       Operations Automation & Analytics Completion
  ✓ PR-028       Symptom Intelligence Foundation
  ✓ PR-029       Disease Entity Foundation
  ✓ PR-030       Network Signal Foundation (137 tests)
  ✓ PR-031       Signal Intelligence Foundation (+118 tests)
  ✓ PR-032       Longitudinal Signal Foundation (+125 tests)
  ✓ PR-033       NetworkSignal Persistence / Disease Cluster / Snapshot / Similarity Intelligence
  ✓ PR-034       Disease Cluster Foundation (BD-009)
  ✓ PR-035       Signal Snapshot Foundation（日次/週次）
  ✓ PR-036       Similarity Intelligence Foundation（NetworkScore）
  ✓ PR-037       Event Sourcing Foundation（EventStore / EventBus / EventPublisher / BD-015・BD-017）
  ✓ PR-038       Emotion Signal Foundation（emotion-types / entity / validator / repository / service / mapper）
  ✓ PR-039       Menstrual Intelligence Foundation（menstrual-types / entity / validator / repository / service / phase-calculator / cycle-analysis）
  ✓ PR-040       Research Dataset Foundation（BD-021 / research-dataset-repository / builder / service / anonymization / export）

Wave2 (PR-041〜075) — 全PR実装完了。Wave2正式完了 済（Founder承認取得済み、BD-027/BD-040）
  Phase A (PR-041〜045): Supabase Migration Foundation
    ✓ PR-041  NetworkSignal Repository V2 — Interface / Adapter / Factory / PersistenceService / Migration / DI
    ✓ PR-042  Supabase Persistence Foundation — NetworkSignalSupabaseRepository / SupabaseEventPersistenceRepository / backend切替
    ✓ PR-043  Emotion Signal Generation
    ✓ PR-044  MenstrualPhase Auto-Resolution — MenstrualPhaseResolverService / MENSTRUAL_PHASE_RESOLVED / saveRecord統合
    ✓ PR-045  Disease Entity V2 Upgrade — DiseaseEntityUpgradeService / CONFIRMED_BY / diseaseKey / DISEASE_ENTITY_UPGRADED
  Phase B (PR-046〜050): Disease Entity V2 + Cluster Statistics
    ✓ PR-046  Disease Cluster Statistics — DiseaseClusterStatisticsService / computeClusterProfile / createClusterSnapshot / BD-028
    ✓ PR-047  FeatureVector V2 — 12次元 / VECTOR_VERSION='2' / FeatureVectorV2Builder / BD-042 V1/V2 混在ガード
    ✓ PR-048  Longitudinal Edge Enricher — LongitudinalEdgeEnricher / computeCaseTrend / displayScore=rawScore+trendBonus / BD-012
    ✓ PR-049  Environmental Signal Collector — EnvironmentalSignalCollector / computeLunarPhase / EnvironmentalSignalSnapshotService / BD-043
    ✓ PR-050  Signal Intelligence V2 — SignalIntelligenceV2Service / aggregateByPhase / BD-024 Emotion含む全6種別 / createDailySnapshot / BD-022
  Phase C (PR-051〜056): Knowledge Graph Foundation
    ✓ PR-051  Knowledge Graph Foundation — KgNodeEntity / KgEdgeEntity / KnowledgeGraphRepository(Append-Only BD-036) / KnowledgeGraphService / KNOWLEDGE_GRAPH_NODE_ADDED / KNOWLEDGE_GRAPH_EDGE_ADDED / ArchGuard+8ルール
    ✓ PR-052  Knowledge Graph Builder — KnowledgeGraphBuilder.build() / Disease×Symptom×Outcome×Phase×SignalPattern / 全6エッジ種別(HAS_SYMPTOM/OBSERVED_IN/WORSE_IN_PHASE/LEADS_TO_OUTCOME/COMORBID_WITH/SIGNAL_INDICATES) / KgSnapshot(BD-018) / KNOWLEDGE_GRAPH_SNAPSHOT_CREATED / ArchGuard+4ルール
    ✓ PR-053  Feature Store V1 — FeatureStoreService.compute() / Feature 6種(avg_pain_30d/avg_sleep_30d/avg_symptom_30d/menstrual_regularity/longitudinal_delta_pain/phase_pain_distribution) / BD-037 Supabase-only入力強制 / FeatureMatrix(BD-018 computedAt) / FEATURE_STORE_UPDATED / ArchGuard+8ルール / 54件テスト
    ✓ PR-054  Cohort Builder — CohortBuilderService / CohortDefinition / BD-039 k-anonymity k≥5強制 / confirmKAnonymity()(BD-032 新frozen返却) / checkPublicationEligibility() / COHORT_DEFINED / ArchGuard+8ルール / 57件テスト
    ✓ PR-055  Dataset Version Management — DatasetVersionService.publish() / 命名IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD} / doiCandidate UUID / BD-021 Append-Only(delete/update throw) / DATASET_VERSION_PUBLISHED / ArchGuard+8ルール / 52件テスト
    ✓ PR-056  Evidence Layer — EvidenceLayerService.compile() / DatasetVersion+ClusterStats+PatternEvidence+EventLog+KgSnapshot統合 / citationMetadata(Wave3基盤) / evidenceScore(0-5) / EVIDENCE_SUMMARY_CREATED / phaseCComplete:true / ArchGuard+6ルール / 56件テスト
  ★ Phase C (PR-051〜056) 完了 — Phase D (AI Platform) 入口条件成立
  Phase D (PR-057〜062): AI Platform + Signal Insight
    ✓ PR-057  Signal Insight Service — SignalInsightService.generateInsights() / ForbiddenWordValidator(BD-038) / PAIN/SLEEP/SYMPTOM/LONGITUDINAL_DELTA/PHASE_COMPARISON 5種インサイト / isMedicalAdvice:false機械付与 / LOW信頼度抑制 / SIGNAL_INSIGHT_GENERATED / ArchGuard+6ルール / 64件テスト
    ✓ PR-058  Pattern Discovery Service — PatternDiscoveryService.discoverPatterns() / PHASE_CORRELATION/SIGNAL_CO_OCCURRENCE/EXPERIMENT_RESPONSE/LONGITUDINAL_TREND 4種パターン / Pearson相関係数計算 / LOW信頼度返却（抑制なし）/ 因果断定ワード自動ブロック(BD-038) / PATTERN_DISCOVERED / ArchGuard+6ルール / 64件テスト
    ✓ PR-059  Case Recommendation Foundation — CaseRecommendationService.recommend() / FV V2コサイン類似度 / k-anonymity k≥5 ZERO TOLERANCE(BD-030 KAnonymityError) / BD-026 Phase3未完でpublic拒否(Phase3NotCompleteError) / 個人識別フィールド機械的除去 / admin:research限定 / CASE_RECOMMENDATION_GENERATED / ArchGuard+8ルール / 67件テスト
    ✓ PR-060  Similar Case Search — SimilarCaseSearchService.search() / SearchQuery{diseaseKey/signalTypes/phaseFilter/minScore} / k-anonymity k≥5 ZERO TOLERANCE(BD-030) / ClusterProfile集計 / 個人識別フィールド機械的除去 / admin:research限定 / SIMILAR_CASE_SEARCHED / ArchGuard+7ルール / 55件テスト
    ✓ PR-061  Research Assistance — ResearchAssistanceService.analyze() / 記述統計(mean/std/min/max/median/count) / Pearson相関係数ペア計算 / Cluster比較 / EvidenceLayerService統合 / 因果推論表現自動ブロック(BD-038 ForbiddenWordValidator) / isMedicalAdvice:false機械付与 / RESEARCH_ASSISTANCE_GENERATED / admin:research限定 / 58件テスト
    ✓ PR-062  AI Safety Layer — AISafetyValidator / 拡張禁止ワードリスト(PR-057 FORBIDDEN_WORDS + extended 35パターン) / validate()/validateStrict()/validateBatch() / auditServiceStatus() / getAuditReport()→phaseDComplete / 違反ログ累積 / BD-031/BD-038全Phase Dサービス横断監査 / PR-059/060 bd031+bd038フィールド追加 / Phase D完了宣言 / AI_SAFETY_AUDIT_COMPLETED / 73件テスト
  ★ Phase D (PR-057〜062) 完了 — Phase E (Similarity Evolution) 入口条件成立
  Phase E (PR-063〜067): Similarity Evolution
    ✓ PR-063  Similarity Engine V2 — SimilarityEngineV2.computeSimilarity()/.generateEdge()/.run() / FeatureVector V2(12次元)コサイン類似度 / vectorVersion='2'固定Edge生成 / BD-042 V1/V2混在は#assertV2で即例外 / BD-001 既存V1 Edgeは無変更（同一SimilarityRepositoryへ追記のみ）/ threshold=EdgeGenerator.DEFAULT_THRESHOLD(0.5)でV1と同値 / edgeId prefix "EDGEV2-"でV1と判別 / SIMILARITY_V2_EDGE_GENERATED / ApiGateway: runSimilarityV2/computeSimilarityV2/getSimilarityV2Status / ArchGuard+2ルール / 28件テスト
    ✓ PR-064  Disease Network Score V2 — DiseaseNetworkScoreV2Service.computeNetworkScore()/.computeForAllClusters() / ClusterProfile(PR-046) × V2 Edge(PR-063) × LongitudinalContext(PR-048)統合 / NetworkScore{diseaseKey,nodeCount,edgeCount,avgScore,clusterCohesion,longitudinalTrend} / BD-042 edges配列はV1/V2混在store前提でV2のみ内部フィルタ（例外にしない） / avgScoreはdisplayScore優先 / clusterCohesion=edgeCount/maxPossiblePairs（1でクランプ）/ longitudinalTrendはsourceTrend+targetTrendの多数決 / DISEASE_NETWORK_SCORE_V2_COMPUTED / ApiGateway: computeDiseaseNetworkScoreV2/computeDiseaseNetworkScoresV2/getDiseaseNetworkScoreV2Status / ArchGuard+2ルール / 26件テスト
    ✓ PR-065  Similarity Snapshot V2 — SimilaritySnapshotV2Service.createSnapshot()/.getSnapshots()/.getLatestSnapshot() / buildSimilaritySnapshotV2(){snapshotId,vectorVersion:'2',edgeCount,caseCount,threshold,computedAt} / BD-042 edges配列はV1/V2混在store前提でV2のみ内部フィルタ / SimilaritySnapshotV2Repositoryは非'2'を例外で拒否 → V1/V2世代分離を型レベルで保証 / BD-023 再計算のたびに新snapshotIdを発行（上書きなし、Append-Only）/ SimilarityEngineV2との統合テストでedgeId再計算非重複を実証 / SIMILARITY_SNAPSHOT_V2_CREATED / ApiGateway: createSimilaritySnapshotV2/getSimilaritySnapshotsV2/getLatestSimilaritySnapshotV2/getSimilaritySnapshotV2Status / ArchGuard+4ルール / 31件テスト
    ✓ PR-066  Phase 3 Completion Validator — Phase3CompletionValidator.checkDiseaseCluster()/.validatePhase3()/.assertComplete() / NETWORK_EVOLUTION_COUNCIL Section 2-C機械検証（BD-026）/ 疾患クラスターごとにcaseCount≥50（Section 2-C）かつsignalPercentiles計算済み（信頼水準）をpassed判定 / Phase3ValidationReport{result,phase3Complete,qualifiedDiseaseCount,requiredDiseaseCount:5,diseaseChecks,generatedAt}（Founder確認用）/ Section 1-A「5疾患以上でk≥50」= qualifiedDiseaseCount≥5でphase3Complete判定 / assertComplete()はPhase3IncompleteErrorを投げPR-067のSimilarity UI公開を自動ブロック（BD-026/BD-027）/ PHASE3_VALIDATION_COMPLETED / ApiGateway: validatePhase3Completion/getPhase3ValidationStatus / ArchGuard+2ルール / 21件テスト
    ✓ PR-067  Similarity UI Public Gate — SimilarityPublicGateService.checkGate()/.approvePublication()/.verifyCaseRecommendationAlignment() / Phase3CompletionValidator（PR-066）検証→Founder承認フロー→公開状態管理（BD-026/BD-027）/ GateStatus.gateState: BLOCKED（Phase3未達）→READY_FOR_APPROVAL（Phase3達成・未承認）→APPROVED（Founder承認済）/ approvePublication()はphase3Validator.assertComplete()を経由しPhase3IncompleteErrorで強制ブロック / ApprovalRecordはSimilarityPublicGateRepositoryにAppend-Only永続化（BD-032、Wave2 Supabase: similarity_public_gate_approvals table）/ verifyCaseRecommendationAlignment()はCaseRecommendationService（PR-059）の構造的PHASE3_COMPLETE定数との整合を検証し、Founder承認後もソース変更+再デプロイが別途必要なことを明示 / SIMILARITY_PUBLICATION_APPROVED / ApiGateway: checkSimilarityPublicGate/approveSimilarityPublication/getSimilarityPublicationApprovals/getSimilarityPublicGateStatus / ArchGuard+4ルール / 29件テスト
  Phase E (PR-063〜067) 完了 — Similarity Evolution完了。Phase F入口条件成立
  Phase F (PR-068〜072): Research Platform
    ✓ PR-068  Research Dataset V2 — ResearchDatasetV2Service.buildDatasetV2()/.publishDatasetV2()/.exportJSON()/.exportCSV() / Record×Signal(6種)×DiseaseEntity×Case×V2Edge(PR-063)×ClusterStats(PR-046)×KG骨格(PR-052)統合 / buildDatasetV2()はclusterProfiles中にcaseCount<5があれば全体をDatasetKAnonymityErrorで拒否（BD-030 ZERO TOLERANCE、部分生成なし）/ publishDatasetV2()はfounderId必須 — 未指定はDatasetV2PublicationNotApprovedError（BD-021）/ 命名はDatasetVersionService（PR-055）経由でIPPO-DATASET-FULL-v2.0-{YYYYMMDD} / CSV ExportはV2Edgeプール（edgeId,sourceCaseId,targetCaseId,diseaseKey,score,displayScore,vectorVersion）でV1（signals行）と差別化 / RESEARCH_DATASET_V2_BUILT / ApiGateway: buildResearchDatasetV2/publishResearchDatasetV2/exportResearchDatasetV2JSON/exportResearchDatasetV2CSV/getResearchDatasetV2Status / ArchGuard+2ルール / 26件テスト
    ✓ PR-069  Cohort Research Export — CohortResearchExportService.exportCohort()/.exportJSON()/.exportCSV()/.exportPARQUET() / CohortDefinition（PR-054）→ ResearchDataset(PR-040形式) → DatasetVersion(PR-055)統合 / exportCohort()は毎回CohortBuilderService.checkPublicationEligibility()を呼びBD-039を再検証（未検証・k<5は例外で拒否、completion条件②）/ DatasetVersionServiceのbuildDatasetVersion()にcohortId対応命名を追加（PR-055拡張、後方互換）：cohortId指定時はIPPO-DATASET-{TYPE}-{cohortId}-v{MAJOR}.{MINOR}-{DATE} / JSON・CSV・PARQUET-stub ExportはDatasetExportService（PR-040）を直接再利用しフォーマットロジック重複なし / DATASET_VERSION_PUBLISHED（新規イベント型なし、PR-055既存イベントを再利用）/ ApiGateway: exportCohortResearchDataset/exportCohortDatasetJSON/exportCohortDatasetCSV/getCohortResearchExportStatus / ArchGuard+2ルール / 17件テスト
    ✓ PR-070  Dataset DOI Candidate — DOICandidateService.assignDoiCandidate()/.attachDoiCandidateToDatasetV2()/.generateCitation() / DatasetVersion（PR-055）を入力に10.{IPPO_DOI_PREFIX}/{datasetVersionId}形式のDOI候補IDを付与（IPPO_DOI_PREFIX='10.99999'はWave2プレースホルダー、Wave3で正式Crossref/DataCiteプレフィックスに置換予定）/ attachDoiCandidateToDatasetV2()はdatasetV2.metadata.doi_candidateへ非破壊で付与（BD-021、新規frozenオブジェクトを返す）/ citation-generator.jsでAPA・Nature形式のCitation文字列を生成 / 既存のdataset-version-entity.jsやDatasetVersionServiceは無変更（Architecture変更なし、STANDARD_MODE）/ 新規Domain Event追加なし（既存DatasetVersionへの純粋計算のみ）/ ApiGateway: assignDatasetDoiCandidate/attachDoiCandidateToDatasetV2/generateDatasetCitation/getDoiCandidateStatus / ArchGuard+2ルール / 20件テスト
    ✓ PR-071  Research Query API — ResearchQueryApiService.executeQuery()/.getStatus() / QueryType4種：COHORT_STATS（CohortBuilderService再検証+EvidenceLayerService統合）/ SIGNAL_CORRELATION（ResearchAssistanceService委譲、caseCount構造的k-anonymityゲート）/ DISEASE_CLUSTER_COMPARE（diseaseKeyごとに個別k-anonymityゲート）/ KG_PATH_QUERY（KnowledgeGraph BFS探索、maxDepth=4、構造データのみのためBD-030適用除外）/ BD-030 ZERO TOLERANCE：case-bearing結果はK_ANONYMITY_MIN(5)未満でKAnonymityError / BD-031：LLM/ML不使用、決定論的集計・グラフ探索のみ / BD-036：KG読み取り専用（追記・変更なし）/ 全結果isMedicalAdvice:false機械付与・Object.freeze / RESEARCH_QUERY_EXECUTED / ApiGateway: executeResearchQuery（admin:research）/getResearchQueryStatus / ArchGuard+2ルール / 28件テスト
    ✓ PR-072  Research Platform Audit — ResearchPlatformAuditService.auditPlatform()/.auditDatasetAttribution()/.auditKAnonymity()/.auditKnowledgeGraphAppendOnly()/.auditAiSafetyAlignment()/.getStatus() / BD-021（DatasetVersionService.getVersions()全件のcreatedBy Founder attribution再確認）/ BD-030・BD-036（clusterProfiles + CohortBuilderService.getCohorts()全件のk-anonymity再検証、ZERO TOLERANCE k>=5、目標k>=50を別途集計）/ BD-037（KnowledgeGraphRepository.deleteNode()/deleteEdge()が必ず例外を投げることを構造的に確認、副作用なしのprobe呼び出し）/ BD-039（AISafetyValidator.getAuditReport()委譲、phaseDComplete=true かつ累積違反ゼロを確認）/ phaseFComplete=true は4BD全PASS時のみ / ResearchPlatformAuditReport（Founder確認用、Object.freeze）/ RESEARCH_PLATFORM_AUDIT_COMPLETED / ApiGateway: auditResearchPlatform（admin:research）/getResearchPlatformAuditStatus（record:read）/ ArchGuard+2ルール / 29件テスト
  ★ Phase F (PR-068〜072) 完了 — Phase G（Wave2 Exit）入口条件成立
  Phase G (PR-073〜075): Integration + Quality Gate
    ✓ PR-073  Architecture Guard Wave2 Complete — Wave2全Domain（PR-041〜072）に対するArchitectureGuard禁止依存ルールの完成 / 発見したギャップ: PR-042（Supabase Persistence: network-signal-supabase-repository / supabase-event-persistence-repository）・PR-050（SignalIntelligenceV2Service）・PR-057〜062（Phase D全6PR: SignalInsight/PatternDiscovery/CaseRecommendation/SimilarCaseSearch/ResearchAssistance/AISafetyValidator）にArchGuardルールが皆無だった欠落を解消（+18ルール）/ 責務③新規ルール: AIサービスDomain（signal-insight/pattern-discovery/case-recommendation/similar-case-search/research-assistance/ai-safety）→ research-dataset-repository・builder・v2-entityへの直接アクセス禁止（+3ルール、EvidenceLayerService/ResearchAssistanceService経由を強制）/ 責務②KG等直接アクセス禁止は既存PR-051ルールで充足済みを確認 / composition-root.js _registerFeatures()にPR-066〜070（Phase3Validation/SimilarityPublicGate/ResearchDatasetV2/CohortResearchExport/DoiCandidate）のr.register()呼び出しが丸ごと欠落していたギャップを解消 / route-registry.js KNOWN_FEATURESにPR-051〜072の22Feature名を追加（PR-050以降ずっと未反映だった構造的ギャップを解消、これまでWave2全PRのregister()呼び出しが「Unknown feature」で黙って握りつぶされていた）/ 既存テストの37→59固定値ドリフトを16ファイルで是正（KNOWN_FEATURES拡張の直接帰結）/ tests/arch/architecture-guard-pr073.test.js 31件テスト / ArchGuard+21ルール
    ✓ PR-074  Wave2 Integration Test Suite — tests/wave2/ 新設、Phase A〜Fの全PRを横断する統合テスト（責務①）/ Exit Criteria EC-01〜EC-14自動検証スクリプト（責務②、tests/wave2/wave2-exit-criteria.test.js 21件）: EC-01(NetworkSignalSupabaseRepository capabilities.supabase) / EC-02(EmotionSignalMapper) / EC-03(MenstrualPhaseResolverService — cycleDay 1〜28全件でUNKNOWNゼロ確認) / EC-04(buildDiseaseEntry icdCode/category/severity) / EC-05(EventStore/SupabaseEventPersistenceRepositoryにupdate/delete不在) / EC-06(VECTOR_VERSION_V2='2' / FV_V2_DIMENSION_COUNT=12) / EC-07(LongitudinalEdgeEnricher.enrich()のlongitudinalContext) / EC-08(KnowledgeGraphService.getStatus()) / EC-09(ForbiddenWordValidator.validateOutput) / EC-10(CohortBuilderService k-anonymity gate) / EC-11(DatasetVersionService.publish() versionId) / EC-12(DiseaseClusterStatisticsService.computeClusterProfile) / EC-13〜14はtests/wave2/wave2-integration.test.js（7件）: EC-13(EventStoreが全DOMAIN_EVENT_TYPESを型無差別に記録) / EC-14・QC-01(root.assemble()がPR-041〜072の31Feature全件を登録、PR-073が修正した「Unknown feature握りつぶし」regressionのガード) + Disease Entity V2→Cluster Stats→Cohort→DatasetVersion のPhase横断データフロー統合テスト / QC-03(k-anonymity強制) / QC-04(診断・治療文言ブロック) はwave2-exit-criteria.test.jsに含む / QC-02（BD-001〜043違反ゼロ確認）とFounder向けレポート生成・WAVE2_EXIT_CONFIRMED Eventの発行はPR-075スコープのため本PRでは実装せず / vitest run全件パス確認（責務④）: 5,028件 / 270ファイル、失敗39件は既知5ファイルのpre-existing failureのみで増加なし（責務⑤）/ 新規Domain Service・ApiGateway・DIトークン・ArchGuardルール追加なし（テストのみのPRのためScope外）
    ✓ PR-075  Wave2 Exit Audit — src/domains/wave2-exit-audit/ 新設。Wave2ExitAuditService.generateExitReport()/.confirmWave3Migration()/.generateWave3MigrationDocument()/.getStatus() / EC-01〜15の全項目確認レポート生成（責務①、EC-01〜14はtests/wave2/(PR-074)通過を根拠、EC-15はvitest run結果(failedTests/newFailureFiles)を入力に判定）/ QC-01〜04の全項目確認（責務②、QC-01はEC-14委譲、QC-02はBD監査集約、QC-03はResearchPlatformAuditService.auditKAnonymity()委譲、QC-04はAISafetyValidator.getAuditReport()委譲）/ BD-001〜BD-043の全43件チェックリスト生成（責務③）: 機械的検証可能な9件（BD-021/026/027/030/031/036/037/038/039）はResearchPlatformAuditService（PR-072）/Phase3CompletionValidator（PR-066）/AISafetyValidator（PR-062）に委譲しPASS/FAIL判定、残り34件は正直にFOUNDER_REVIEW_REQUIRED（コードで証明不可能な業務・歴史的決定を虚偽PASSにしない）/ confirmWave3Migration()はfounderId必須のFounder承認ゲート（責務④、BD-027）— wave3ReadyForFounderApproval=false時はWave2ExitCriteriaNotMetErrorで強制ブロック、承認時のみWAVE2_EXIT_CONFIRMED Event発行 + Wave2ExitAuditRepository(Append-Only)へ記録 / generateWave3MigrationDocument()はFounder向け移行承認文書を生成（責務⑤、承認記録なしでは生成不可）/ ApiGateway: generateWave2ExitReport/confirmWave2ExitAudit/getWave2ExitAuditApprovals/generateWave3MigrationDocument/getWave2ExitAuditStatus（admin:research、statusのみrecord:read）/ ArchGuard+2ルール（screen/feature→Wave2ExitAuditService直接アクセス禁止）/ KNOWN_FEATURES 59→60件（既存16ファイルの固定値ドリフトをPR-073と同型で是正）/ tests/wave2-exit-audit/wave2-exit-audit-service.test.js 30件 + tests/arch/architecture-guard-pr075.test.js 3件 / vitest run全件: 5,061件、失敗39件は既知5ファイルのpre-existing failureのみで増加なし
  ★ Phase G (PR-073〜075) 実装完了 — Wave2正式完了。Founderが generateWave2ExitReport() の結果（EC-01〜15全PASS・QC-01〜04全PASS・機械監査可能9BD全PASS・残り34BDはFOUNDER_REVIEW_REQUIRED）を確認のうえ「APPROVE WAVE2 EXIT」を明示し、confirmWave2ExitAudit({ founderId: 'kenkou-jpg', exitReport }) を実行。ApprovalRecord: approvalId=wave2exit_1782980527914_1 / founderId=kenkou-jpg / ecPassCount=15 / qcPassCount=4 / confirmedAt=2026-07-02T08:22:07.914Z。

  詳細: docs/WAVE2_ROADMAP.md（IPPO-COUNCIL-006）参照

Release Readiness Recovery Program（PR-076〜077）— docs/RELEASE_READINESS_COUNCIL.md（IPPO-RELEASE-001）Critical是正
  ✓ PR-076  Research Dataset Consent Gate — src/domains/research/consent-gate-service.js 新設 / BD-021・BD-049準拠 / ResearchDatasetBuilder.build()・ResearchDatasetV2Service.buildDatasetV2()・CohortResearchExportService.exportCohort()にConsent Gate統合 / Case はconsentLevel>=2（RESEARCH許諾）でfilterCasesByResearchConsent()によりフィルタ、consentLevel未設定・0のCaseはfail-closedで除外 / Signal はNetworkSignal entityがuserId/consentLevelを保持しない設計制約のためsignalsConsentVerified:true の明示的表明を必須化（未表明時はResearchConsentNotVerifiedError、BD-030 all-or-nothing踏襲）/ 18件テスト追加（tests/research/consent-gate-service.test.js 10件 + 既存3ファイルへBD-049テスト追加8件）/ Architecture変更なし・Wave2ExitAudit等既存ドメイン無変更 / vitest run全件: 5,079件、失敗39件は既知5ファイルのみで増加なし
  ✓ PR-077  Release Readiness Evidence Ledger — src/domains/release-readiness/ 新設。ReleaseReadinessService.confirmItem()/.getConfirmationStatus()/.checkBetaReadinessGate()/.getHistory()/.getStatus() / Wave2ExitAuditRepository（PR-075、Append-Only・Founder承認済み）には一切触れない独立追加台帳 / REGULATORY_CONDITIONS（C-1〜C-5、REGULATORY_MEDICAL_COUNCIL.md 条件一覧）+ FOUNDER_REVIEW_BD_LIST（BD_SCOPE_LIST − MECHANICALLY_AUDITED_BDS = 34件、wave2-exit-audit-types.jsから動的導出しドリフト不可能）計39項目をFounderが個別に確認・記録 / checkBetaReadinessGate()は39項目全件confirmed:trueでない限りready:falseを返す fail-closed設計（confirmed:falseの明示記録も「未レビュー」とは区別してブロック対象に含める）/ RELEASE_READINESS_ITEM_CONFIRMED Event追加 / ApiGateway: confirmReleaseReadinessItem/getReleaseReadinessConfirmationStatus/checkReleaseReadinessBetaGate/getReleaseReadinessHistory/getReleaseReadinessStatus（admin:research、read系はrecord:read）/ ArchGuard+2ルール（screen/feature→ReleaseReadinessService直接アクセス禁止）/ KNOWN_FEATURES 60→61件（既存16ファイルの固定値ドリフトをPR-073/075と同型で是正）/ tests/release-readiness/ 32件 + tests/arch/architecture-guard-pr077.test.js 3件 / vitest run全件: 5,114件、失敗39件は既知5ファイルのみで増加なし
  ★ Release Readiness Recovery Program 完了 — 元Critical 3件のうち工学的に対処可能な設計欠陥（Consent Gate欠落・承認ゲート素通り）は解消。ただしReleaseReadinessServiceの確認台帳は現時点で0/39 confirmed — Founderが実際にC-1〜C-5の完了状況とFOUNDER_REVIEW_REQUIRED BD 34件を確認・記録するまで、β Release Readinessは引き続きCONDITIONAL GO（Score 90/100）。詳細: docs/RELEASE_READINESS_COUNCIL.md 16章参照。

Founder Confirmation — HOLD RELEASE READINESS（2026-07-02、Founder: kenkou-jpg）
  Founderより「全39項目を一括承認しない」との明示指示。以下を confirmItem() で個別実行:
    17-A: confirmed:false（外部証跡・実データ不足）: C-1 / C-2 / C-3 / C-5 / BD-034 / BD-042 の6件
    17-B/17-D: 承認候補15件（C-4 + BD 14件）を ① Code Verified 7件 / ② Evidence Verified 7件 / ③ Founder Judgment Required（C-4）1件 に分類 → Founderが①②をconfirmed:true、③(C-4)をconfirmed:false維持で確定指示
      confirmed:true化14件: BD-002/010/013/017/022/032/035（①コード確認のみで確認可能）+ BD-004/006/012/014/024/040/041（②HANDOFF・既存承認記録で確認可能）
      confirmed:false維持1件: C-4（理由: Signal経路がsignalsConsentVerified:trueの自己申告モデルに依存しBD-049/C-4の完全充足は追加判断が必要なため）
    17-F: 残り18件を「確認過程を短縮」の指示のもと ① Code Verified 4件 / ② Evidence Verified 9件 / ③ Hold Before GO 5件 に再分類 → Founderが①②の13件を一括confirmed:true承認、③の5件はconfirmed:false（未レビュー）のまま保留する指示
      confirmed:true化13件: BD-001/008/011/018（①コード確認）+ BD-005/007/009/016/020/023/025/028/043（②既存文書・監査記録で確認）
      Hold Before GO維持5件（未レビューのまま）: BD-003（calendar-next.jsの旧暦UI表示とBD-003の整合性未確認）/ BD-015（Layer1→Layer2-7再構築保証が未検証）/ BD-019（削除パイプライン実装の所在未確認）/ BD-029（Similarity UI個人識別不可要件の未レビュー）/ BD-033（定性的戦略命題のため機械検証不可）
  confirmed:true累計27件・confirmed:false累計7件（C-1/C-2/C-3/C-4/C-5/BD-034/BD-042）・未レビュー累計5件（Hold Before GO）。checkBetaReadinessGate().ready=false。CONDITIONAL GO維持。
  詳細・記録全件: docs/RELEASE_READINESS_COUNCIL.md 17章（Founder Confirmation Log、17-F/17-G）参照。

Release Readiness Completion Program（PR-078）— docs/RELEASE_READINESS_COUNCIL.md 18章
  ✓ PR-078  Data Deletion Pipeline — src/domains/data-deletion/ 新設。DataDeletionService.requestDeletion()/.confirmAnonymization()/.confirmSoftDelete()/.executeHardDelete()/.getRequestStatus()/.getAllLatest()/.getHistory()/.getStatus() / BD-019準拠：REQUESTED→ANONYMIZED→SOFT_DELETED→HARD_DELETEDの順序をサーバー側で強制、段階スキップ・後戻りはDeletionStageOrderErrorで拒否 / SOFT_DELETED→HARD_DELETEDはHARD_DELETE_HOLD_DAYS=90を満たすまでHardDeleteNotEligibleErrorで拒否 / 既存RecordRepository/ConsentRepositoryには一切触れない自己完結的Append-Only監査台帳（PR-076/077と同型、Architecture変更なし）/ DATA_DELETION_STAGE_ADVANCED Event追加 / ApiGateway: requestDataDeletion/confirmDataDeletionAnonymization/confirmDataDeletionSoftDelete/executeDataHardDelete/getDataDeletionRequestStatus/getAllDataDeletionRequests/getDataDeletionStatus（admin:research、状態参照系はrecord:read）/ ArchGuard+2ルール（screen/feature→DataDeletionService直接アクセス禁止）/ KNOWN_FEATURES 61→62件（既存17ファイルの固定値ドリフトをPR-073/075/077と同型で是正）/ tests/data-deletion/ 32件 + tests/arch/architecture-guard-pr078.test.js 3件 / vite build PASS / vitest run全件: 5,149件、失敗39件は既知5ファイルのみで増加なし / 完了後 BD-019 を confirmItem() で confirmed:true 記録
  BD-034監査（未実装）— persistence-config.jsのPERSISTENCE_CONFIGはnetworkSignalの1エントリのみで、Emotion/Menstrual/DiseaseCluster/KnowledgeGraph/ResearchDataset/Cohort等15以上のWave2ドメインがSupabaseアダプタ皆無の完全in-memoryと判明。1PRで閉じられる規模ではなく新規Roadmap起票を要するためImplementationからFounder Actionへ再分類。confirmed:falseのまま維持
  confirmed:true累計28件・confirmed:false累計6件（C-1/C-2/C-3/C-4/BD-034/BD-042）・未レビュー累計5件（BD-003/BD-015/BD-029/BD-033/C-5）。checkBetaReadinessGate().ready=false。CONDITIONAL GO継続（Score 90→93/100）。
  詳細・記録全件: docs/RELEASE_READINESS_COUNCIL.md 18章（Release Readiness Completion Program）参照。

Next: Founder Action 3件（C-2医師アドバイザー招聘／C-4 Signal Consent自己申告モデルの是非判断／BD-034適用範囲の再解釈 or 新Roadmap起票判断）と External Evidence 2件（C-1プライバシーポリシー弁護士レビュー／C-3 SaMD非該当書面見解）が必須ブロッカー。Major 3件（BD-003/BD-015/BD-029）はLegacy Removal・Operations Council前に確認、Minor 3件（C-5/BD-033/BD-042）は当面保留可。checkBetaReadinessGate().ready=trueを確認した時点でβ公開可否を最終判断し、その後 Legacy Removal Council へ進む。Wave3 Roadmap起点（Wave3 MASTER DESIGN入力）はβ運営開始後に着手する。
```

---

Legacy Removal Program（PR-079〜090）— docs/LEGACY_REMOVAL_PLAN.md（IPPO-LEGACY-001）
  ✓ PR-079  Batch-1: Record Input UI — app-legacy.js の Record Input UI 系 約28関数
  （renderStep/nextStep/prevStep/buildSteps/renderWellness/selectWellness/renderFood/selectFood/
  toggleFoodItem/renderFasting/selectFasting/renderEmotion/selectEmotion/getBodyCheckTitle/
  renderBodyCheck/selectBodyCheckItem/selectBodyCheckExtra/getDiseaseMorningQuestion/getDailyHint/
  renderSymptomDetail/toggleSymptomChip/appendSymptomDetail/toggleDetailItem/updateSliderDetail/
  selectBowelCount）を src/modules/record-input.js（既存骨格コミットe62a8b3を土台に再利用、再実装ゼロ）へ
  委譲。app-legacy.js側は `import * as RecordInput from './modules/record-input.js'` + `const fn = RecordInput.fn`
  形式のエイリアスのみで、onclick文字列から呼ばれる関数名は既存の window bridge（ファイル末尾）経由で
  そのまま record-input.js 側へ向くよう変更済み / STEPS・currentStep は record-input.js の
  内部変数 `_steps`/`_currentStep`（initSteps()/getSteps()/getCurrentStep()）へ完全移行、
  app-legacy.js側の同名グローバル宣言は削除 / openRecordModal()（Batch-2非対象だがSTEPS/currentStep/
  currentRecordを直接初期化する唯一の箇所のため本PRで更新）は `RecordInput.resetCurrentRecord()` +
  `RecordInput.initSteps()` を呼ぶ形に変更 / currentRecordはPR-080でsaveRecordが移植されるまでの
  一時ブリッジとして `var currentRecord = RecordInput.getCurrentRecord()` を維持（saveRecord本体は
  無変更、bare identifier経由で同一オブジェクト参照を共有）。window.currentRecordへの同期エクスポートは
  SG-4により廃止し、代わりに `window.getCurrentRecord = RecordInput.getCurrentRecord`（ライブ参照）を
  bridge / SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js 新設（app-legacy.js行数の
  CI監視、ARCHITECTURE_V3.md C-20のCIロック欠如を是正、以降のBatch PRはBASELINE_LINE_COUNTを更新するたび
  減少を確認）/ app-legacy.js: 10,804行→10,247行 / ブラウザ実機検証（record-modal-controller.js経由の
  window.openRecordModal wrapperは`_inlineOpenRecordModal`未設定のためno-op — これはPR-079以前からの
  既存挙動で本PR起因ではない。実際の呼び出し経路はhandleHomeCTA内のbare `openRecordModal()`
  フォールバックのみで、app.htmlのrecord-modalは2026-05-27時点で既にsoft-isolated/unreachableと判明
  （app.html:1178コメント記載）。record-input.jsを直接importして initSteps()→renderStep()→
  selectEmotion()の一連の流れを検証し、currentRecordブリッジが同一オブジェクト参照を
  正しく共有することを確認済み）/ 新規テスト追加なし（既存tests/modules/record-input-b1-*.test.js
  80件が引き続き対象）/ vitest run全件: 5,152件（新規3件はSG-7 line-count-guard）、失敗39件は既知5ファイル
  （tests/modules/build-draft-from-ui.test.js・save-record-screen.test.js・
  tests/disease/disease-analyzer.test.js・tests/events-domain/domain-event-types.test.js・
  tests/menstrual-domain/event-menstrual.test.js）のみで増加なし / vite build PASS
  ✓ PR-080  Batch-2（Scope縮小版）: currentRecord Bridge撤去 — 当初Scopeは
  openRecordScreen/editPastRecord/saveRecord等 約14関数だったが、実装前調査で
  openRecordScreen()・editPastRecord()の安全な物理移動には追加のDIスキャフォールドが
  必要と判明（Founder判断によりPR-081以降へ繰り越し。詳細は次段落）。本PRは
  saveRecord() / getSuccessMessage() / closeSuccess() の currentRecord 依存解消のみを実施 /
  PR-079で導入した `var currentRecord = RecordInput.getCurrentRecord();`
  モジュールスコープbridge変数（1521行付近）を完全撤去。saveRecord() 内で毎回
  `var currentRecord = RecordInput.getCurrentRecord();` をローカル取得する形に変更
  （責務不変・取得元のみ変更、SG-4準拠）。getSuccessMessage/closeSuccessはcurrentRecord非依存と
  判明したため無変更 / openRecordModal() から一時ブリッジ同期行を削除 / Adapter完全撤去確認
  （`window.__recordInputBridge`等の追加Adapterは存在せず、上記1行のみが対象だった）/
  app-legacy.js: 10,247行→10,242行、SG-7 BASELINE_LINE_COUNTを10,242に更新 / vitest run全件:
  5,152件、失敗39件は既知5ファイルのみで増加なし（新規テスト追加なし、PR-079由来の
  record-input-b1-*.test.js 80件を含め全PASS）/ vite build PASS。

  【Batch-2繰り越し・重要な発見】openRecordScreen()（app-legacy.js、約378行）は
  home CTA経由のwindow.openRecordScreenでは到達不能（record-three-card.jsが
  window.openRecordScreen=openThreeCardRecordで上書きするため）だが、
  calendar.js/timeline.jsのonclick="editPastRecord(...)" → window.editPastRecord →
  window.openLegacyRecordScreen（app-legacy.js側が別名で常時export）という
  独立した到達経路が存在し、Dead Codeではないと確認済み。ただし物理移動には
  saveAndSync/updateStats/updateHistory/buildCalendar/updateHomeCTAState/closeModal等の
  window未エクスポートのbare呼び出し、および_bowelCount/_prevTab共有変数への対応
  （DIスキャフォールド新設）が必要でBatch-2の責務を超えるためFounder判断によりPR-081以降の
  専用PRへ繰り越し。あわせて以下の**PR-080に起因しない既存の不具合**を発見・記録した
  （本PRでは修正せず、Scope外として現状維持）:
    - `window.saveRecord` は record.js の自己参照ガード（`callExistingFunction`）により
      恒常的にno-op。app-legacy.js は `window.saveRecord` を一度もexportしていないため、
      saveRecord()（app-legacy.js）はwindow経由では到達不能（app-legacy.js内にbare
      `saveRecord()`呼び出し箇所も存在しない）。
    - `window.closeModal` は record-modal-controller.js の `_inlineCloseModal` が
      未設定のままno-op（PR-079で確認済みの `window.openRecordModal` と同型の
      pre-existingバグ）。
    - 上記により、通常のUI操作からは openRecordModal()/saveRecord() 系の
      currentRecordモーダルフローに到達しない。ブラウザ検証は
      `window.openRecordScreen` を一時的にundefinedにして `handleHomeCTA()` の
      正規フォールバック分岐からbareの `openRecordModal()` を発火させ、
      saveRecord() は検証専用の一時的な `window.__pr080VerifySaveRecord` フック
      （検証後に削除済み、最終diffには含まれない）経由で直接呼び出して実施した。
      新規記録→保存→一覧反映／編集→保存→一覧更新／編集キャンセル→データ非破壊／
      モーダル再オープン時のドラフト破棄／currentRecordが旧bare変数に依存しないこと、
      をすべて確認しエラーなし。

  Next: PR-081 — Batch-2残タスク（openRecordScreen/editPastRecord/selectTempMethod/
  toggleRsChip/selectRsCycle/updateRecProgressDots/toggleRecordDetails/gatherDiseaseData の
  物理移動）専用PR。着手前にDIスキャフォールド設計（saveAndSync等の未exportなbare依存の
  解消方針）を確定すること。上記で発見した `window.saveRecord` / `window.closeModal` の
  pre-existing no-op も、この専用PR着手時にあわせて方針確認すること（放置するか修正するかは
  Founder判断）。

---

## 完了済みPhase

| Phase | 成果物 | 状態 |
|-------|--------|------|
| Phase 0 | docs/REPOSITORY_MAP.md / FEATURE_INVENTORY.md / DATA_FLOW_MAP.md / DATABASE_AUDIT.md / TECHNICAL_DEBT_AUDIT.md | 完了 |
| Phase 2 | docs/DOMAIN_MODEL_V1.md | 完了 |
| Phase 3 | docs/ARCHITECTURE_V3.md | 完了 |
| Phase 4 | docs/SCHEMA_V1.md | 完了 |
| Phase 4.5 | docs/REPOSITORY_CONSTITUTION_V1.md | 完了 |
| Phase 4.75 | docs/CONSTITUTION_AUDIT_V1.md | 完了 |
| Phase 4.76 | docs/CONSTITUTION_RECONCILIATION_V1.md | 完了 |
| Phase 5 | docs/IMPLEMENTATION_PLAN_V1.md | 完了 |
| Phase 5 実装 PR-001〜002 | domains/ スケルトン + ドメインモデル確定 | 完了 |
| Phase 5 実装 PR-003〜006 | Record / Experiment / Case / Consent domain実装 | 完了 |
| Phase 5 実装 PR-007 | domains/similarity/ — Similarity Engine | 完了 |
| Phase 5 実装 PR-008 | domains/analytics/ — Analytics Layer | 完了 |
| Phase 5 実装 PR-009 | domains/b2b/ — B2B Export Layer | 完了 |
| Phase 5 実装 PR-010 | tests/e2e/ + infrastructure/validation/ — E2E/リリースゲート | 完了 |
| Phase 6 PR-011〜019 | Strangler-Fig移行完了（Bootstrap / Contract / Adapter / Record / Experiment / Case / Consent / Similarity） | 完了 |
| LEGACY ASSET INVENTORY COUNCIL | docs/LEGACY_ASSET_INVENTORY.md — BD-001〜BD-014 | 完了 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002) — BD-009〜BD-014 | 完了 |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003) — BD-015〜BD-025 | 完了 |
| Phase 7 PR-020〜039 | Intelligence Foundation全完了（Auth / UX / Engagement / Comm / Delivery / Operations / Symptom / Disease / NetworkSignal / SignalIntelligence / Longitudinal / EventSourcing / Emotion / Menstrual）| 完了 |
| PR-040 | Research Dataset Foundation（research-dataset-repository / builder / service / anonymization / export）| 完了 |
| **PR-041** | **NetworkSignal Repository V2 — INetworkSignalRepository / MemoryAdapter / PersistenceService(Decorator) / Factory / Provider / Migration / DI / ApiGateway** | **完了** |
| **PR-042** | **Supabase Persistence Foundation — NetworkSignalSupabaseRepository(Write-Through Cache) / SupabaseEventPersistenceRepository(ippo_events) / PersistenceConfig(backend:supabase) / ArchGuard+8ルール** | **完了** |
| NETWORK EVOLUTION COUNCIL | docs/NETWORK_EVOLUTION_COUNCIL.md (IPPO-COUNCIL-004) — 7フェーズ進化モデル / BD-026〜BD-033 | 完了 |
| WAVE2 MASTER DESIGN | docs/WAVE2_MASTER_DESIGN.md (IPPO-COUNCIL-005) — Wave2全体設計 / BD-034〜BD-043 | 完了 |
| WAVE2 ROADMAP | docs/WAVE2_ROADMAP.md (IPPO-COUNCIL-006) — PR-041〜075 / 35PR | 完了 |
| WAVE2 ARCHITECTURE | docs/WAVE2_ARCHITECTURE.md (IPPO-COUNCIL-007) — Wave2技術憲法 | 完了 |
| WAVE2 IMPLEMENTATION GOVERNANCE | docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md (IPPO-COUNCIL-008) — GP-01〜GP-08 | 完了 |
| FOUNDER STRATEGIC REVIEW | docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md (IPPO-STRATEGIC-REVIEW-001) — CONDITIONAL GO / CR-01〜03 / MO-01〜03 | 完了 |
| **BUSINESS STRATEGY COUNCIL** | docs/BUSINESS_STRATEGY.md (IPPO-BUSINESS-001) — 二段ロケットモデル / BBS-001〜006 | **完了** |
| **GROWTH STRATEGY COUNCIL** | docs/GROWTH_STRATEGY.md (IPPO-GROWTH-001) — 成長戦略 / BGS-001〜005 | **完了** |
| **REGULATORY & MEDICAL COUNCIL** | docs/REGULATORY_MEDICAL_COUNCIL.md (IPPO-REGULATORY-001) — 規制憲法 / BD-044〜052 | **完了** |
| **GO-TO-MARKET COUNCIL** | docs/GTM_COUNCIL.md (IPPO-GTM-001) — 市場投入戦略 / BD-053〜060 | **完了** |

---

## 上位憲法（必ず読む順序）

矛盾がある場合は上にあるものが正。

1. **docs/LEGACY_ASSET_INVENTORY.md (IPPO-GOV-001 v1.2)** — BD-001〜BD-014
2. **docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002)** — BD-009〜BD-014
3. **docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003)** — BD-015〜BD-025
4. **docs/NETWORK_EVOLUTION_COUNCIL.md (IPPO-COUNCIL-004)** — BD-026〜BD-033
5. **docs/WAVE2_MASTER_DESIGN.md (IPPO-COUNCIL-005)** — BD-034〜BD-043
6. **docs/WAVE2_ARCHITECTURE.md (IPPO-COUNCIL-007)**
7. **docs/WAVE2_ROADMAP.md (IPPO-COUNCIL-006)** — PR-041〜075
8. **docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md (IPPO-COUNCIL-008)** — GP-01〜GP-08
9. **docs/BUSINESS_STRATEGY.md (IPPO-BUSINESS-001)** — BBS-001〜006
10. **docs/GROWTH_STRATEGY.md (IPPO-GROWTH-001)** — BGS-001〜005
11. **docs/REGULATORY_MEDICAL_COUNCIL.md (IPPO-REGULATORY-001)** — BD-044〜052
12. **docs/GTM_COUNCIL.md (IPPO-GTM-001)** — BD-053〜060
13. docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md (IPPO-STRATEGIC-REVIEW-001)
14. docs/CONSTITUTION_RECONCILIATION_V1.md
15. docs/IMPLEMENTATION_PLAN_V1.md
16. docs/REPOSITORY_CONSTITUTION_V1.md

---

## Founder Fixed Decisions（絶対に変更しない）

**FD-001 Quality Score (100点満点):**
- Coverage = 30 / Duration = 30 / Completeness = 15 / Outcome = 15 / Consent = 10
- diseaseTagMultiplier: **廃止** / Experiment独立項: **廃止**

**FD-002 Tier Definition:**
- Tier3: disease_tag≥1 + 30日 + 60% coverage（Consent不要）
- Tier2: disease_tag≥1 + 90日 + 70% + exp完了1件 + Outcome必須 + Consent Level1以上
- Tier1: disease_tag≥1 + 180日 + 80% + exp完了2件 + Outcome必須 + Consent Level2以上

**その他確定事項:**
- experiment.status: DRAFT|ACTIVE|COMPLETED|ABANDONED（PAUSEDなし）
- consent.level: CHECK (BETWEEN 0 AND 3)（Level4なし）
- テーブル名: similarity_edges
- ABANDONED後Outcome生成: 7日後から
- consent_events: append-only（DELETE不可）
- similarity_edges: DELETE禁止

---

## Binding Decisions 全一覧

### BD-001〜BD-025（Wave1 / Data Asset）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-001 | similarity_edges DELETE禁止 | IPPO-GOV-001 |
| BD-002 | consent_events DELETE禁止（Consent Immutability）| IPPO-GOV-001 |
| BD-003 | Lunar CalendarをUIとして実装しない | IPPO-GOV-001 |
| BD-004 | Disease TagをWave1でEntityに昇格させない（Wave2） | IPPO-GOV-001 |
| BD-005 | FoodはFoodログでなくExposure Signalとして設計 | IPPO-GOV-001 |
| BD-006 | Symptom IntelligenceはWave1で即時拡張対象 | IPPO-GOV-001 |
| BD-007 | DROP判定ゼロ。旧資産はHOLDまたはREFACTOR | IPPO-GOV-001 |
| BD-008 | 疾患情報は4層（Record/Profile/Case/Network）に分離 | IPPO-GOV-001 |
| BD-009 | Disease Cluster IDはWave2まで diseaseKey と同一 | NETWORK ASSET COUNCIL |
| BD-010 | FeatureVectorは VECTOR_VERSION 定数を持ち、次元拡張時バージョンを上げる | NETWORK ASSET COUNCIL |
| BD-011 | EdgeGeneratorが生成する全エッジは vectorVersion フィールドを持つ | NETWORK ASSET COUNCIL |
| BD-012 | Longitudinal SignalのEdge付与はWave2スコープ | NETWORK ASSET COUNCIL |
| BD-013 | NetworkSignal SSOTは network-signal-types.js | NETWORK ASSET COUNCIL |
| BD-014 | MenstrualPhase自動判定はWave2 | NETWORK ASSET COUNCIL |
| BD-015 | Layer 1（Record）保全でLayer 2〜7を決定論的に再構築できること | DATA ASSET COUNCIL |
| BD-016 | 各データ資産はSSOT以外に永続化してはならない | DATA ASSET COUNCIL |
| BD-017 | Wave2 ippo_eventsテーブルはImmutable（UPDATE/DELETE禁止） | DATA ASSET COUNCIL |
| BD-018 | Snapshotは必ず generatedAt と vectorVersion を含めること | DATA ASSET COUNCIL |
| BD-019 | データ削除要求: 匿名化優先 → SoftDelete → 90日後HardDelete | DATA ASSET COUNCIL |
| BD-020 | Layer 1保全でLayer 2〜7の再構築可能性を損なう変更はCouncil承認が必要 | DATA ASSET COUNCIL |
| BD-021 | Research Datasetの作成・公開はFounder承認 + k-anonymity(k≥5) | DATA ASSET COUNCIL |
| BD-022 | NetworkSignalはWave2でSupabaseに永久保存（Wave1はin-memory暫定） | DATA ASSET COUNCIL |
| BD-023 | SimilarityEdge再計算時は新edgeIdを発行（既存IDの上書き禁止） | DATA ASSET COUNCIL |
| BD-024 | Emotion SignalはWave2 Signal層で実装（Wave1では生成しない） | DATA ASSET COUNCIL |
| BD-025 | PR-033〜PR-040はDATA ASSET COUNCIL Section 14に従って実装すること | DATA ASSET COUNCIL |

### BD-026〜BD-043（Wave2 設計）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-026 | Phase 3（k≥50 / 5疾患以上）達成前にSimilarity UIを公開しない | NETWORK EVOLUTION COUNCIL |
| BD-027 | 各フェーズ移行はFounder確認を必須とする | NETWORK EVOLUTION COUNCIL |
| BD-028 | Disease Cluster統計はk≥5（最終目標k≥50）を下回るデータを公開しない | NETWORK EVOLUTION COUNCIL |
| BD-029 | Similarity UIはCaseノード同士の接続表示のみ。個人特定可能なUIを禁止 | NETWORK EVOLUTION COUNCIL |
| BD-030 | Research Dataset利用者が個人特定を試みることはZERO TOLERANCE（契約条件） | NETWORK EVOLUTION COUNCIL |
| BD-031 | AIはいかなる状況でも診断・治療指示・緊急度判定を行ってはならない | NETWORK EVOLUTION COUNCIL |
| BD-032 | Knowledge GraphのエッジはAppend-Only（削除・上書き禁止） | NETWORK EVOLUTION COUNCIL |
| BD-033 | Founder Moat = 縦断の長さ × Consent純潔性 × Disease Intelligence深度 | NETWORK EVOLUTION COUNCIL |
| BD-034 | Wave2のすべての永続化層はSupabaseとする | WAVE2 MASTER DESIGN |
| BD-035 | FeatureVector V2は12次元（VECTOR_VERSION='2'）| WAVE2 MASTER DESIGN |
| BD-036 | Disease Cluster統計はk≥50を目標とし、k≥5未満は公開しない | WAVE2 MASTER DESIGN |
| BD-037 | Knowledge GraphノードはAppend-Only（削除禁止）| WAVE2 MASTER DESIGN |
| BD-038 | Wave2 AIはルールベース + 統計テンプレートのみ（LLM禁止）| WAVE2 MASTER DESIGN |
| BD-039 | AISafetyValidatorはすべてのAI出力の必須ゲートキーパー | WAVE2 MASTER DESIGN |
| BD-040 | Research Dataset V2はk-anonymity k≥5を構造的に保証すること | WAVE2 MASTER DESIGN |
| BD-041 | Wave2 PR-041〜075の実装順序は依存関係を厳守すること | WAVE2 MASTER DESIGN |
| BD-042 | Wave2完了条件: Phase 3達成（k≥50 / 5疾患）+ Research Platform稼働 | WAVE2 MASTER DESIGN |
| BD-043 | Wave3以降の設計はWave2完了後にCouncilを開催して決定する | WAVE2 MASTER DESIGN |

### BD-044〜BD-060（規制・GTM）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-044 | すべてのAI出力には免責文言を付与。免責なしのAI出力公開を絶対禁止 | REGULATORY COUNCIL |
| BD-045 | Signal Insight/Pattern Discovery出力テンプレートは医師アドバイザー書面承認後のみ公開可 | REGULATORY COUNCIL |
| BD-046 | Research Dataset外部提供前に提供先IRB承認証明書の受領を必須とする | REGULATORY COUNCIL |
| BD-047 | プライバシーポリシーは年1回以上弁護士レビューを受けること | REGULATORY COUNCIL |
| BD-048 | AI禁止ワードリストは医師アドバイザーが半年ごとにレビューし Founder が承認 | REGULATORY COUNCIL |
| BD-049 | Research ConsentなしのユーザーのRecordをResearch Datasetに含めることを絶対禁止 | REGULATORY COUNCIL |
| BD-050 | 「医療行為の代替」を示唆する表現をいかなる媒体でも使用禁止 | REGULATORY COUNCIL |
| BD-051 | Wave2 Phase D（PR-057: Signal Insight Service）着手前にSaMD非該当の書面見解取得を必須とする | REGULATORY COUNCIL |
| BD-052 | 海外展開は対象国の医療データ規制専門家による書面確認後のみ開始可 | REGULATORY COUNCIL |
| BD-053 | 最優先ICPは子宮内膜症/PCOS。記録継続率・Research Consent率を最優先指標とする | GTM COUNCIL |
| BD-054 | DAU / ページビュー / ダウンロード数 / CAC をKPIとして採用してはならない | GTM COUNCIL |
| BD-055 | 「医師の代わりになる」「診断できる」等の医療代替を示唆する表現を永久禁止 | GTM COUNCIL |
| BD-056 | Research License価格（L1: ¥350K〜700K / L2: ¥3M〜10M / L3: ¥1M〜5M）を下回る提供禁止 | GTM COUNCIL |
| BD-057 | Clinic APIのパイロット先は医師アドバイザー紹介 or 既存ユーザー流入のみ | GTM COUNCIL |
| BD-058 | 海外展開順序は台湾→韓国→オーストラリア→EU→米国を厳守 | GTM COUNCIL |
| BD-059 | Founder週間GTM稼働時間は3時間以内（通常期）| GTM COUNCIL |
| BD-060 | IPPO Dataset使用論文にはAcknowledgment記載を提供条件とする | GTM COUNCIL |

### BBS-001〜006（Business Strategy）/ BGS-001〜005（Growth Strategy）

詳細は各文書参照（IPPO-BUSINESS-001 / IPPO-GROWTH-001）。

変更にはLevel-1改訂プロセス（Founder承認 + Council開催）が必要。

---

## 現在の実装状況

- ユーザー数: 0 / 本番依存: なし / 後方互換義務: なし
- app-legacy.js: 10,804行 God Object（削減中）
- 既存DBテーブル: profiles / records / user_data / user_records / subscriptions（5つのみ）
- **テスト: 3,272件 全パス（191ファイル）※ 35件はtests/modules/のpre-existing failure（src/modules/record.js壊れたインポート、PR無関係）**

### Strangler-Fig 移行層（PR-011〜PR-039 完了）

| 層 | 主要クラス |
|---|---|
| Bootstrap | DI Container / CompositionRoot / RouteRegistry / ArchitectureGuard |
| Contract | 10インターフェース（IStorageService〜INotificationProvider） |
| Infrastructure | LocalStorageAdapter / LegacyAuthAdapter |
| Record | RecordRepositoryImpl / DualWriteRecordRepository / RecordV2Repository / RecordReadSwitch |
| Experiment | ExperimentRepositoryImpl / ExperimentStateMachine / ExperimentLifecycleService |
| Case | CaseRepositoryImpl / CaseGenerationService / TierEvaluator / OutcomeResolver |
| Consent | ConsentRepositoryImpl / ConsentEnforcementService |
| Similarity | VectorBuilder（8次元）/ SimilarityCalculator / EdgeGenerator / SimilarityEngine |
| Auth | PermissionService / SimilarityAccessGuard |
| UX Foundation | TierProgressService / ProfileFormationService / DiseaseTagValidator |
| Engagement | ExperimentNudgeService / CommitmentService / OutcomeReminderService |
| Communication | NotificationScheduleService / NotificationTemplateService / CommunicationMetrics |
| Delivery | DeliveryQueue / DeliveryScheduler / DeliveryProcessor / DeliveryRetryService / DeliveryHealthMetrics |
| Analytics（Admin） | KpiSnapshot / Wave1DashboardService / KpiSnapshotAutomationService / KpiSchedulerService |
| Symptom Intelligence | symptom-types（SSOT）/ symptom-entity / symptom-validator / symptom-repository / symptom-service |
| Disease Intelligence | disease-types（SSOT）/ disease-entity / disease-validator / disease-repository / disease-service |
| **Network Signal** | network-signal-types（SSOT, BD-013）/ network-signal-entity / network-signal-validator / network-signal-repository（in-memory）/ network-signal-service |
| **Signal Intelligence** | signal-aggregation-service / signal-trend-service / signal-timeline-service / signal-summary-service |
| **Longitudinal** | trend-window-builder / moving-average-service / baseline-service / longitudinal-signal-service / longitudinal-summary-service |
| Event Sourcing | EventStore / EventBus / EventPublisher / EventReplayService / AuditTimelineService |
| **Emotion** | emotion-types（SSOT）/ emotion-entity / emotion-validator / emotion-repository / emotion-service / emotion-signal-mapper |
| **Menstrual** | menstrual-types（SSOT）/ menstrual-entity / menstrual-validator / menstrual-repository / menstrual-service / phase-calculator / cycle-analysis-service |
| API Gateway | ApiGateway（**71メソッド**） |

---

## RouteRegistry — KNOWN_FEATURES（PR-039時点）

```
Record / Experiment / Case / Consent / Analytics / Similarity
Auth / API / RecordV2 / Engagement / B2BExport / Communication / Delivery
Operations / OperationsAutomation / Symptom / Disease
NetworkSignal / SignalIntelligence / Longitudinal
PersistentSignal / DiseaseCluster / SignalSnapshot / SimilarityIntelligence
EventSourcing / Emotion / MenstrualIntelligence
計27件
```

---

## API Gateway メソッド一覧（PR-039時点、計71メソッド）

| メソッド | 権限 | PR |
|---|---|---|
| getRecords(userId) | record:read | PR-020 |
| saveRecord(data) | record:write | PR-020 |
| getExperiments(userId) | experiment:read | PR-020 |
| createExperiment(data) | experiment:write | PR-020 |
| generateCase(recordId) | case:read:own | PR-020 |
| getSimilarCases(caseId, opts) | similarity:read:own | PR-020 |
| getTierProgress(candidate) | case:read:own | PR-021 |
| getProfileFormation(candidate) | record:read | PR-021 |
| getCaseEvents() | case:read:own | PR-021 |
| getExperimentNudge(...) | experiment:read | PR-022 |
| createCommitment({...}) | experiment:write | PR-022 |
| getOutcomeReminders(experiments) | experiment:read | PR-022 |
| getConsentMotivation(currentLevel) | record:read | PR-022 |
| getDueNotifications(userContext) | record:read | PR-023 |
| getNotificationPreview(type) | record:read | PR-023 |
| getCommunicationMetrics() | record:read | PR-023 |
| scheduleNotifications(userContext) | record:read | PR-024 |
| getWave1Dashboard({users}) | admin:dashboard | PR-024 |
| getCommunicationDashboard() | admin:dashboard | PR-024 |
| getKpiSnapshots() | admin:dashboard | PR-024 |
| processPendingNotifications() | admin:dashboard | PR-025 |
| getDeliveryMetrics() | admin:dashboard | PR-025 |
| getDeliveryHealth() | admin:dashboard | PR-026 |
| getLatestKpiSnapshot() | admin:dashboard | PR-026 |
| getKpiHistory() | admin:dashboard | PR-026 |
| getSnapshotScheduleStatus() | admin:dashboard | PR-027 |
| retryFailedDeliveries() | admin:dashboard | PR-027 |
| getAnalyticsStatus() | admin:dashboard | PR-027 |
| validateSymptom(data) | record:write | PR-028 |
| getSymptomTypes() | record:read | PR-028 |
| getPainTypes() | record:read | PR-028 |
| createDisease(data) | record:read | PR-029 |
| getDiseases() | record:read | PR-029 |
| getActiveDiseases() | record:read | PR-029 |
| getResolvedDiseases() | record:read | PR-029 |
| validateNetworkSignal(data) | record:write | PR-030 |
| createNetworkSignal(data) | record:read | PR-030 |
| getNetworkSignals() | record:read | PR-030 |
| getSignalsByRecord(recordId) | record:read | PR-030 |
| getSignalsByType(signalType) | record:read | PR-030 |
| getSignalAggregation() | record:read | PR-031 |
| getSignalTrend(signalType) | record:read | PR-031 |
| getSignalTimeline() | record:read | PR-031 |
| getSignalSummary() | record:read | PR-031 |
| getLongitudinalSummary(options?) | record:read | PR-032 |
| getBaseline(signalType) | record:read | PR-032 |
| getMovingAverage(signalType, days, refDate?) | record:read | PR-032 |
| getTrendWindow(days, refDate?) | record:read | PR-032 |
| publishEvent(params) | admin | PR-037 |
| getEvents() | admin | PR-037 |
| getEventsByType(type) | admin | PR-037 |
| getEventsByAggregate(aggregateId) | admin | PR-037 |
| replayEvents() | admin | PR-037 |
| getAuditTimeline() | admin | PR-037 |
| validateEmotion(data) | record:write | PR-038 |
| createEmotion(params) | record:read | PR-038 |
| getEmotions() | record:read | PR-038 |
| getEmotionStatistics() | record:read | PR-038 |
| convertEmotionSignals() | record:read | PR-038 |
| validateMenstrual(data) | record:read | PR-039 |
| createMenstrualRecord(params) | record:read | PR-039 |
| getMenstrualRecords() | record:read | PR-039 |
| getCurrentCycle() | record:read | PR-039 |
| getCycleStatistics() | record:read | PR-039 |
| estimateNextCycle() | record:read | PR-039 |

---

## Network Signal SSOT（PR-030〜032確定）

### SIGNAL_TYPES（6種）
SYMPTOM / PAIN / MENSTRUAL / EMOTION（Wave2）/ SLEEP / EXPOSURE

### VECTOR_VERSION
`'1'`（Wave2拡張時に `'2'` へ bump。全Edgeにフィールドあり BD-010/BD-011）

### 正規化ルール
| type | rawValue | normalizedValue |
|---|---|---|
| SYMPTOM / PAIN / EMOTION | 0〜10 | / 10 |
| MENSTRUAL | 0〜3 | / 3 |
| SLEEP | hours | / 8（clamped） |
| EXPOSURE | count | / 5（clamped） |

### Record → Signal 自動生成（saveRecord時）
symptoms[] → SYMPTOM / painLevel → PAIN / sleepBed+Wake → SLEEP / foods[] → EXPOSURE / menstrualFlow → MENSTRUAL / EMOTION: Wave2

### Trend Direction
| type | lower is better | higher is better | neutral |
|---|---|---|---|
| PAIN / SYMPTOM | Improving / Stable / Worsening | — | — |
| SLEEP | — | Increasing / Stable / Decreasing | — |
| MENSTRUAL / EXPOSURE / EMOTION | — | — | Increasing / Stable / Decreasing |
| データ不足（<2件） | — | — | Unknown |

---

## DATA ASSET COUNCIL 確定事項（IPPO-COUNCIL-003）

### 8層データ資産モデル
```
Layer 0:  Raw Input（保存しない）
Layer 1:  Record（永久保存 / SSOT / 再生成不可）
Layer 2:  NetworkSignal（Wave2でSupabase永久保存 / BD-022）
Layer 3:  Disease Entity（永久保存）
Layer 4:  Profile（Snapshot保存 / 再生成可能）
Layer 5:  Case（永久保存 / caseId不変）
Layer 6:  Intelligence Layer（再計算 + Snapshot）
Layer 7:  Network Layer（Wave2でEdge永久保存）
Layer 8:  Research Asset（匿名化 + バージョン管理）
Layer 9:  Knowledge Graph（Wave2 / Append-Only）
Layer 10: Feature Store / Embedding（Wave3）
Layer 11: Disease Intelligence Model（Wave4）
Layer 12: Disease Ontology（Wave5+）
```

### 永久保存対象（DELETE禁止）
Record / Disease Entity / Case / Consent Event / Experiment / SimilarityEdge / Research Dataset / Knowledge Graph Node・Edge

### 再計算可能（保存しない）
MovingAverage計算結果 / TrendWindow / FeatureVector中間値 / SignalTimeline / UIセッション状態

---

## Wave2 アーキテクチャ概要（IPPO-COUNCIL-007）

### 3つの設計哲学
```
哲学 1: Record is the only origin（Recordのみが真実の源泉）
哲学 2: Append-Only is trust structure（追記のみが信頼の構造）
哲学 3: AI assists, diagnosis forbidden（AIは補助のみ、診断禁止）
```

### Wave2 主要追加コンポーネント
```
Supabase永続化層:
  NetworkSignalRepository（Supabase）
  DiseaseClusterRepository（Supabase）
  KnowledgeGraphRepository（Supabase / Append-Only）

AI Platform（ルールベース / LLMなし）:
  SignalInsightService（パターン提示のみ）
  PatternDiscoveryService
  AISafetyValidator（必須ゲートキーパー / BD-039）

Research Platform V2:
  ResearchDatasetV2（k-anonymity k≥5 / BD-040）
  DatasetVersionManager
  IRBComplianceChecker

FeatureVector V2（12次元 / VECTOR_VERSION='2'）:
  FeatureVectorBuilderV2
  SimilarityEngineV2
```

---

## Phase 6〜7 最重要制約（全PRで共通）

- app-legacy.js への新規ロジック追加: **禁止**
- DB Migration / Schema変更: **禁止**（PR-033まで / Wave2は別設計）
- feature→feature 依存: **禁止**
- localStorage 直叩き（Adapter外）: **禁止**
- UI → ApiGateway → Application → Repository: **この経路のみ許可**
- similarity_edges DELETE: **禁止**（BD-001）
- consent_events DELETE: **禁止**（BD-002）
- NetworkSignal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-030〜032）
- Signal Intelligence系サービスへのUI直アクセス: **禁止**（ArchGuard PR-031）
- Longitudinal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-032）
- Similarity結果のUI公開: **Phase 3達成前禁止**（BD-026）
- Disease診断AI / Recommendation / 診断示唆: **永久禁止**（BD-031）
- Lunar CalendarのUI実装: **禁止**（BD-003）
- Emotion Signalの生成: **Wave2まで禁止**（BD-024）
- Research Dataset公開: **Founder承認 + IRB証明なし禁止**（BD-021 / BD-046）
- AI出力の免責文言なし公開: **絶対禁止**（BD-044）
- SaMD確認なしのSignal Insight公開: **禁止**（BD-051）

---

## 技術スタック

- フロントエンド: Vanilla JS + Vite（React/Vue/Svelteなし）
- バックエンド: Supabase（PostgreSQL + Edge Functions）
- 決済: Stripe（¥980/月、¥7,800/年 / ¥1,980/月、¥15,800/年）← BUSINESS_STRATEGY更新値
- テスト: Vitest（**3,272件 全パス** / 191ファイル）
- 言語: JavaScript（TypeScript移行中）

---

## SimilarityEngine仕様（PR-019確定 / Wave2でV2に拡張予定）

- FeatureVector次元数: 8（VECTOR_VERSION='1'）→ Wave2で12（VECTOR_VERSION='2'）
- 類似度計算: Cosine Similarity [0.0, 1.0]
- Edge生成条件: score ≥ 0.5 かつ同一diseaseKey
- Consent要件: consentLevel ≥ 2
- **Phase 3達成前: Similarity UI非公開**（BD-026）

---

## 次のPR

**Release Readiness Council**（Wave2正式完了後の次ステップ）
- Wave2（PR-041〜075）は2026-07-02にFounder承認（kenkou-jpg）を得て正式完了。
- Wave3 MASTER DESIGN入力・Wave3 Roadmap起点はRelease Readiness Council開催後に着手する。
- 本HANDOFFはPR実行ルールのエントリポイントであり、Release Readiness Council / Legacy Removal / Operations Council開始の要否・進行はFounderが別途判断する。

---

## 直前PR完了メモ

**Wave2 Official Completion — Founder Approval**（Wave2正式完了、Phase G capstone後続）
- 2026-07-02、Founder（kenkou-jpg）が `generateWave2ExitReport()` の結果を確認し「APPROVE WAVE2 EXIT」を明示。
- Exit Report: EC-01〜15 全15件PASS / QC-01〜04 全4件PASS / BD-001〜043のうち機械監査可能9件（BD-021,026,027,030,031,036,037,038,039）全PASS・FAILなし / 残り34件はFOUNDER_REVIEW_REQUIRED（コードで証明不可能な業務・歴史的決定のため、虚偽PASSにせずFounder自身が確認）。
- EC-15根拠: `vitest run` 実測 5,061件中5,022件PASS・失敗39件＝既知5ファイル（tests/modules/build-draft-from-ui.test.js, tests/modules/save-record-screen.test.js, tests/events-domain/domain-event-types.test.js, tests/menstrual-domain/event-menstrual.test.js, tests/disease/disease-analyzer.test.js）のpre-existing failureのみ、新規失敗ゼロを確認。
- `confirmWave3Migration()` 実行結果（ApprovalRecord）: approvalId=`wave2exit_1782980527914_1` / founderId=`kenkou-jpg` / ecPassCount=15 / qcPassCount=4 / confirmedAt=`2026-07-02T08:22:07.914Z`。
- Wave3 Readiness: `wave3ReadyForFounderApproval=true`。Next: Release Readiness Council。

**PR-073: Architecture Guard Wave2 Complete**（Phase G開始・完了）
- KNOWN_FEATURES（route-registry.js）がPR-050以降ずっと未更新で、composition-root.jsのPR-051〜072全register()呼び出しが「Unknown feature」で黙って握りつぶされていた構造的ギャップを解消（22Feature追加、57→59件）。
- composition-root.js `_registerFeatures()` にPR-066〜070（Phase3Validation/SimilarityPublicGate/ResearchDatasetV2/CohortResearchExport/DoiCandidate）の`r.register()`呼び出し自体が存在しなかった欠落を追加で解消。
- ArchitectureGuardルール欠落: PR-042（Supabase Persistence）/ PR-050（SignalIntelligenceV2）/ PR-057〜062（Phase D全6PR）にルールが皆無だった（+18ルール）。責務③としてAIサービスDomain→ResearchDataset内部への直接アクセス禁止ルールを新規追加（+3ルール、domain→domain種別の新パターン）。
- 副作用: 既存テスト16ファイルがKNOWN_FEATURES件数の固定値（37）をハードコードしており、正しい59に更新（PR-073の直接帰結、スコープ内）。
- **Pre-existing failure 5ファイル・39件は本PRと無関係**（tests/modules/2ファイル: src/modules/record.js の壊れたインポート / domain-event-types.test.js・event-menstrual.test.js: DOMAIN_EVENT_TYPES固定値29のドリフト（PR-057以降未更新、PR-073スコープ外）/ disease-analyzer.test.js: 日付依存の既存テスト）。PR-074でこれらの増加有無を確認する。
