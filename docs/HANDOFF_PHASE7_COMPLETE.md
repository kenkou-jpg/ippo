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
| FOUNDER_COUNCIL_DESIGN_PHILOSOPHY | （未作成 — 将来化） | 創業者意図・設計哲学・不変原則 |
| LEGACY ASSET INVENTORY | docs/LEGACY_ASSET_INVENTORY.md | 資産戦略・BD-001〜BD-014 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md | Signal Schema・Edge属性・Longitudinal |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md | データ資産8層・BD-015〜BD-025 |

### LEVEL-2 — Architecture Authority（変更にはアーキテクチャレビューが必要）

| 文書 | ファイル | 主な管轄 |
|---|---|---|
| Architecture V3 | docs/ARCHITECTURE_V3.md | Strangler-Fig戦略・レイヤー定義 |
| Implementation Plan | docs/IMPLEMENTATION_PLAN_V1.md | PRロードマップ・74PR計画 |
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

## Current Architecture Snapshot（PR-032時点）

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
| Network Signal | network-signal-types(SSOT) / signal-entity / validator / repository(in-mem) / service | Wave1完了 |
| Signal Intelligence | signal-aggregation / signal-trend / signal-timeline / signal-summary | Wave1完了 |
| Longitudinal | trend-window-builder / moving-average / baseline / longitudinal-signal / longitudinal-summary | Wave1完了 |
| Communication | NotificationSchedule / Template / Metrics | Wave1完了 |
| Delivery | DeliveryQueue / Scheduler / Processor / Retry / HealthMetrics | Wave1完了 |
| Analytics | KpiSnapshot / Wave1Dashboard / SnapshotAutomation / KpiScheduler | Wave1完了 |
| B2B Export | 匿名化 / アクセス制御 / 監査ログ | Wave1完了 |

### Architecture Health

```
Features (RouteRegistry):  20
ApiGateway methods:        53
Tests (全パス):            2,223件 / 124ファイル
ArchitectureGuard rules:   36+ (PR-011〜PR-032)
Architecture Health:       A（違反ゼロ）
Technical Debt:            TD-001〜（TECHNICAL_DEBT_AUDIT.md参照）
```

### Layer Stack（Strangler-Fig）

```
UI / Legacy (app-legacy.js 10,804行)
         ↓  ApiGateway (53 methods)
Application Layer (CompositionRoot / DI Container)
         ↓
Domain Services (15 domains)
         ↓
Repository Layer (Supabase / LocalStorage / in-memory)
         ↓
Infrastructure (Adapters / Contracts)
```

---

## Roadmap Status（74 PR 計画中、PR-032完了）

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

Phase 7 (Intelligence Foundation)
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

→ PR-033 (Next)  NetworkSignal Supabase Persistence (BD-022)

  PR-034         Disease Cluster Foundation (BD-009)
  PR-035         Signal Snapshot Foundation（日次/週次）
  PR-036         Similarity Intelligence Foundation（NetworkScore）
  PR-037         Event Sourcing Foundation（ippo_events, BD-017）
  PR-038         Emotion Signal Wave2 (BD-024)
  PR-039         MenstrualPhase Intelligence (BD-014)
  PR-040         Research Dataset Foundation (BD-021)
  PR-041〜074    （IMPLEMENTATION_PLAN_V1.md参照）

Next Council:
  NETWORK EVOLUTION COUNCIL（BD-022実装後、Wave2移行前）
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
| Phase 5 実装 PR-007 | domains/similarity/ — Similarity Engine（スコアリング・グラフ・バッチ） | 完了 |
| Phase 5 実装 PR-008 | domains/analytics/ — Analytics Layer（event収集・KPI・Cohort・Funnel） | 完了 |
| Phase 5 実装 PR-009 | domains/b2b/ — B2B Export Layer（匿名化・アクセス制御・監査ログ） | 完了 |
| Phase 5 実装 PR-010 | tests/e2e/ + infrastructure/validation/ + release/gate.ts — E2E/リリースゲート | 完了 |
| Phase 6 PR-011 | src/bootstrap/ + src/application/ + src/legacy/ — App Bootstrap Bridge（DI Container / CompositionRoot / Application / LegacyBridge / RouteRegistry / ArchitectureGuard） | 完了 |
| Phase 6 PR-011.5 | src/contracts/ — Contract Layer Foundation（IStorageService / IRecordRepository / IExperimentRepository / IConsentRepository / ICaseRepository / IAnalyticsService / ISimilarityService / IAuthService） | 完了 |
| Phase 6 PR-012 | src/adapters/ + src/application/legacy-access-audit.js — Infrastructure Adapter Layer（LocalStorageAdapter / LegacyAuthAdapter / AdapterRegistry / LegacyAccessAudit） | 完了 |
| Phase 6 PR-013 | src/repositories/record/ + src/application/record-*-service.js — Record Migration Hook（RecordRepositoryImpl / RecordMapper / RecordQueryService / RecordCommandService / RecordMigrationAudit / Flow Hooks） | 完了 |
| Phase 6 PR-014 | src/repositories/record/dual-write-* + src/repositories/record/diff-* + src/application/migration-dashboard.js — Dual Write & Diff Audit System | 完了 |
| Phase 6 PR-015 | src/repositories/experiment/ + src/application/experiment-*-service.js + experiment-migration-audit.js — Experiment Core Migration | 完了 |
| Phase 6 PR-016 | src/domains/experiment/ + src/domains/case/ — Experiment State Machine & Case Foundation | 完了 |
| Phase 6 PR-017 | src/domains/case/ + src/repositories/case/ — Case Generation Engine V1 | 完了 |
| Phase 6 PR-018 | src/repositories/consent/ + src/domains/consent/ + src/domains/similarity/ — Consent Enforcement & Similarity Foundation | 完了 |
| Phase 6 PR-019 | src/repositories/similarity/ + src/domains/similarity/ — Similarity Engine V1 | 完了 |
| Phase 7 PR-020 | src/domains/auth/ + src/application/api-gateway.js — Auth Domain & API Gateway | 完了 |
| Phase 7 PR-021 | Record V2 ReadSwitch + UX Foundation | 完了 |
| Phase 7 PR-022 | Engagement & Consent Layer | 完了 |
| Phase 7 PR-023 | Communication Decision Layer | 完了 |
| Phase 7 PR-024 | Delivery & Admin Analytics Layer | 完了 |
| Phase 7 PR-025 | Delivery Infrastructure Completion | 完了 |
| Phase 7 PR-026 | Operations & KPI Automation | 完了 |
| Phase 7 PR-027 | Operations Automation & Analytics Completion | 完了 |
| LEGACY ASSET INVENTORY COUNCIL | docs/LEGACY_ASSET_INVENTORY.md — IPPO-GOV-001 (LEVEL-1 GOVERNING DOCUMENT)、BD-001〜BD-008 | 完了 |
| Phase 7 PR-028 | src/domains/symptom/ — Symptom Intelligence Foundation | 完了 |
| Phase 7 PR-029 | src/domains/disease/ — Disease Entity Foundation | 完了 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002) — IPPO-GOV-001 v1.2、BD-009〜BD-014 | 完了 |
| Phase 7 PR-030 | src/domains/network/ — Network Signal Foundation（NetworkSignal 6種 + ApiGateway 5メソッド + 137テスト） | 完了 |
| Phase 7 PR-031 | src/domains/network/ — Signal Intelligence Foundation（Aggregation / Trend / Timeline / Summary + 118テスト） | 完了 |
| Phase 7 PR-032 | src/domains/network/ — Longitudinal Signal Foundation（MovingAverage / Baseline / TrendWindow / LongitudinalSummary + 125テスト） | 完了 |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003) — 8層データ資産モデル / BD-015〜BD-025 / PR-033〜040設計インプット | 完了 |

---

## 上位憲法（必ず読むこと）

以下の順序で読む。矛盾がある場合は上にあるものが正。

1. **docs/LEGACY_ASSET_INVENTORY.md (IPPO-GOV-001 v1.2)** ← **資産戦略最上位基準文書（LEVEL-1 GOVERNING DOCUMENT）。BD-001〜BD-014（14件）**
2. **docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003)** ← **データ資産設計基準（BD-015〜BD-025、11件）。PR-033〜040設計インプット**
3. **docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002)** ← Signal Schema / Edge属性 / Disease Cluster / Longitudinal設計
4. docs/CONSTITUTION_RECONCILIATION_V1.md
5. docs/IMPLEMENTATION_PLAN_V1.md
6. docs/REPOSITORY_CONSTITUTION_V1.md
7. docs/SCHEMA_V1.md
8. docs/ARCHITECTURE_V3.md
9. docs/DOMAIN_MODEL_V1.md

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

## Binding Decisions 全一覧（IPPO-GOV-001 v1.2 + DATA ASSET COUNCIL）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-001 | similarity_edges DELETE禁止 | IPPO-GOV-001 |
| BD-002 | consent_events DELETE禁止 | IPPO-GOV-001 |
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
| BD-018 | Snapshotは必ず generatedAt と（該当する場合）vectorVersion を含めること | DATA ASSET COUNCIL |
| BD-019 | データ削除要求: 匿名化優先 → SoftDelete → 90日後HardDelete | DATA ASSET COUNCIL |
| BD-020 | Layer 1保全でLayer 2〜7の再構築可能性を損なう変更はCouncil承認が必要 | DATA ASSET COUNCIL |
| BD-021 | Research Datasetの作成・公開はFounder承認 + k-anonymity(k≥5) | DATA ASSET COUNCIL |
| BD-022 | NetworkSignalはWave2でSupabaseに永久保存（Wave1はin-memory暫定） | DATA ASSET COUNCIL |
| BD-023 | SimilarityEdge再計算時は新edgeIdを発行（既存IDの上書き禁止） | DATA ASSET COUNCIL |
| BD-024 | Emotion SignalはWave2 Signal層で実装（Wave1では生成しない） | DATA ASSET COUNCIL |
| BD-025 | PR-033〜PR-040はDATA ASSET COUNCIL Section 14に従って実装すること | DATA ASSET COUNCIL |

変更にはLevel-1改訂プロセス（Founder承認 + Council開催）が必要。

---

## 現在の実装状況

- ユーザー数: 0 / 本番依存: なし / 後方互換義務: なし
- app-legacy.js: 10,804行 God Object（削減中）
- 既存DBテーブル: profiles / records / user_data / user_records / subscriptions（5つのみ）
- **テスト: 2,223件 全パス（124ファイル）**

### Strangler-Fig 移行層（PR-011〜PR-032 完了）

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
| API Gateway | ApiGateway（**53メソッド**） |

---

## RouteRegistry — KNOWN_FEATURES（PR-032時点）

```
Record / Experiment / Case / Consent / Analytics / Similarity
Auth / API / RecordV2 / Engagement / B2BExport / Communication / Delivery
Operations / OperationsAutomation / Symptom / Disease
NetworkSignal / SignalIntelligence / Longitudinal
計20件
```

---

## API Gateway メソッド一覧（PR-032時点、計53メソッド）

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

---

## Network Signal SSOT（PR-030〜032確定）

### SIGNAL_TYPES（6種）
SYMPTOM / PAIN / MENSTRUAL / EMOTION（Wave2）/ SLEEP / EXPOSURE

### VECTOR_VERSION
`'1'`（Wave2拡張時に `'2'` へ bump。全EdgeにフィールドあたりBD-010/BD-011）

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

### Moving Average Windows
- Last7: [referenceDate-6, referenceDate]
- Last30: [referenceDate-29, referenceDate]
- 欠損日許容。予測なし。

### Baseline（computeWave1 常に5キー返却）
PAIN / SLEEP / SYMPTOM / EXPOSURE / MENSTRUAL → mean / stddev / min / max / sampleCount

---

## DATA ASSET COUNCIL 確定事項（IPPO-COUNCIL-003）

### 8層データ資産モデル
```
Layer 0: Raw Input（保存しない）
Layer 1: Record（永久保存 / SSOT / 再生成不可）
Layer 2: NetworkSignal（Wave2でSupabase永久保存 / BD-022）
Layer 3: Disease Entity（永久保存）
Layer 4: Profile（Snapshot保存 / 再生成可能）
Layer 5: Case（永久保存 / caseId不変）
Layer 6: Intelligence Layer（再計算 + Snapshot）
Layer 7: Network Layer（Wave2でEdge永久保存）
Layer 8: Research Asset（匿名化 + バージョン管理）
```

### 永久保存対象（DELETE禁止）
Record / Disease Entity / Case / Consent Event / Experiment / SimilarityEdge / Research Dataset

### 再計算可能（保存しない）
MovingAverage計算結果 / TrendWindow / FeatureVector中間値 / SignalTimeline / UIセッション状態

### PR-033〜040 設計インプット（DATA ASSET COUNCIL Section 14）
| PR | 目的 |
|---|---|
| PR-033 | NetworkSignal Supabase永久保存（BD-022） |
| PR-034 | Disease Cluster Foundation（BD-009 Wave2開始） |
| PR-035 | Signal Snapshot Foundation（日次/週次） |
| PR-036 | Similarity Intelligence Foundation（NetworkScore） |
| PR-037 | Event Sourcing Foundation（ippo_events、BD-017） |
| PR-038 | Emotion Signal Wave2実装（BD-024） |
| PR-039 | MenstrualPhase Intelligence（BD-014） |
| PR-040 | Research Dataset Foundation（BD-021） |

---

## Phase 6〜7 最重要制約（全PRで共通）

- app-legacy.js への新規ロジック追加: **禁止**
- DB Migration / Schema変更: **禁止**（PR-033まで）
- feature→feature 依存: **禁止**
- localStorage 直叩き（Adapter外）: **禁止**
- UI → ApiGateway → Application → Repository: **この経路のみ許可**
- similarity_edges DELETE: **禁止**（BD-001）
- consent_events DELETE: **禁止**（BD-002）
- NetworkSignal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-030〜032）
- Signal Intelligence系サービスへのUI直アクセス: **禁止**（ArchGuard PR-031）
- Longitudinal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-032）
- Similarity結果のUI公開: **Wave1期間中禁止**
- Disease診断AI / Recommendation / Network Search / 推論: **Wave1禁止**（BD-004）
- Lunar CalendarのUI実装: **禁止**（BD-003）
- Emotion Signalの生成: **Wave2まで禁止**（BD-024）
- Research Dataset公開: **Founder承認なし禁止**（BD-021）

---

## 技術スタック

- フロントエンド: Vanilla JS + Vite（React/Vue/Svelteなし）
- バックエンド: Supabase（PostgreSQL + Edge Functions）
- 決済: Stripe（¥580/月、¥4,800/年）
- テスト: Vitest（**2,223件 全パス** / 124ファイル）
- 言語: JavaScript（TypeScript移行中）

---

## SimilarityEngine仕様（PR-019確定）

- FeatureVector次元数: 8（VECTOR_VERSION='1'）
- 類似度計算: Cosine Similarity [0.0, 1.0]
- Edge生成条件: score ≥ 0.5 かつ同一diseaseKey
- Consent要件: consentLevel ≥ 2
- **Wave1: Similarity非公開**（Tier3 Case数 < 50）

---

## 次のPR

PR-033: NetworkSignal Persistence Foundation
- NetworkSignalをSupabaseに永久保存（BD-022）
- `network_signals` テーブル設計
- NetworkSignalRepository: in-memory → Supabase切り替え
- DATA ASSET COUNCIL Section 14 参照
