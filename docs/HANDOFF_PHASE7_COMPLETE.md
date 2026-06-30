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

### Architecture Health

```
Features (RouteRegistry):  37（DiseaseClusterStatistics / FeatureVectorV2 / LongitudinalEdgeEnricher / EnvironmentalSignal / SignalIntelligenceV2含む）
ApiGateway methods:        95+（getSignalAggregationV2 / aggregateByPhase / getSignalTrendV2 / getAllSignalTrendsV2 / buildTimeline / summarize / createDailySnapshot / getV2Status 等8メソッド追加）
Domain Event Types:        22（DISEASE_CLUSTER_COMPUTED / FEATURE_VECTOR_V2_CREATED / LONGITUDINAL_EDGE_ENRICHED / ENVIRONMENTAL_SIGNAL_RECORDED含む）
DI TOKENS:                 299+（PR-049: 2サービス追加 / PR-050: 1サービス追加）
Tests (全パス):            3,999件 / 242ファイル（35件はtests/modules/既知のpre-existing failure）
ArchitectureGuard rules:   84+（PR-049: 4件追加）
Architecture Health:       A（違反ゼロ）
Technical Debt:            TD-001〜（TECHNICAL_DEBT_AUDIT.md参照）
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

Wave2 (PR-041〜075) — Phase A実装中
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
  Phase D (PR-057〜062): AI Platform + Signal Insight
  Phase E (PR-063〜066): Research Platform V2
  Phase F (PR-067〜071): Similarity UI + Network Visualization
  Phase G (PR-072〜075): Integration + Quality Gate

  詳細: docs/WAVE2_ROADMAP.md（IPPO-COUNCIL-006）参照

Next PR: PR-051 Knowledge Graph Foundation（Phase C 開始）
```

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

（未定）
