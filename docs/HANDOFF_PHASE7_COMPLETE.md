# IPPO EVOLUTION PROGRAM — 引き継ぎ

## プロジェクト概要

ippo（女性疾患症例プラットフォーム）の設計・実装を進めている。

作業ブランチ: feat/phase4d-batch1-record-input

リポジトリ: C:/Users/USER/Documents/ippo

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
| Phase 6 PR-015 | src/repositories/experiment/ + src/application/experiment-*-service.js + experiment-migration-audit.js — Experiment Core Migration（ExperimentRepositoryImpl / ExperimentMapper / ExperimentQueryService / ExperimentCommandService / ExperimentMigrationAudit） | 完了 |
| Phase 6 PR-016 | src/domains/experiment/ + src/domains/case/ — Experiment State Machine & Case Foundation（ExperimentStateMachine / TransitionAudit / ExperimentLifecycleService / CaseCandidateBuilder / CaseEligibility / CandidateAudit） | 完了 |
| Phase 6 PR-017 | src/domains/case/ + src/repositories/case/ — Case Generation Engine V1（CaseRepository / CaseGenerationService / TierEvaluator / OutcomeResolver / CaseIdGenerator / CaseAuditLog） | 完了 |
| Phase 6 PR-018 | src/repositories/consent/ + src/domains/consent/ + src/domains/similarity/ — Consent Enforcement & Similarity Foundation（ConsentRepository / ConsentEnforcementService / ConsentAuditLog / FeatureExtractor / SimilarityCandidate / SimilarityCandidateBuilder） | 完了 |
| Phase 6 PR-019 | src/repositories/similarity/ + src/domains/similarity/ — Similarity Engine V1（SimilarityRepository / VectorBuilder / SimilarityCalculator / EdgeGenerator / ConsentFilter / SimilarityEngine / SimilarityAuditLog） | 完了 |
| Phase 7 PR-020 | src/domains/auth/ + src/application/api-gateway.js — Auth Domain & API Gateway（UserSession / AuthContext / PermissionPolicy / RoleResolver / PermissionService / SimilarityAccessGuard / ApiGateway） | 完了 |
| Phase 7 PR-021 | src/repositories/record/record-v2-* + src/application/record-migration-service.js + src/domains/case/case-generated-event.js + src/application/tier-progress-service.js + src/application/profile-formation-service.js + src/application/disease-tag-validator.js + src/application/wave1-metrics-service.js — Record V2 ReadSwitch + UX Foundation | 完了 |
| Phase 7 PR-022 | src/domains/engagement/ + src/domains/consent/consent-motivation-service.js + src/repositories/b2b/ + src/contracts/IB2BExportRepository.js + src/application/engagement-metrics.js — Engagement & Consent Layer | 完了 |
| Phase 7 PR-023 | src/domains/communication/ — Wave1 Communication Decision Layer（NotificationScheduleService / NotificationTemplateService / CommunicationAuditLog / CommunicationMetrics / CommunicationRepository） | 完了 |
| Phase 7 PR-024 | src/domains/delivery/ + src/domains/analytics/ — Wave1 Delivery & Admin Analytics Layer（DeliveryQueue / DeliveryAuditLog / DeliveryScheduler / DeliveryRepository / KpiSnapshot / KpiRepository / Wave1DashboardService / TD-4修正） | 完了 |
| Phase 7 PR-025 | src/contracts/INotificationProvider.js + src/adapters/notification/ + src/domains/delivery/delivery-processor.js + src/domains/delivery/delivery-metrics.js — Delivery Infrastructure Completion（MockNotificationProvider / NotificationProviderAdapter / DeliveryProcessor / DeliveryMetrics） | 完了 |
| Phase 7 PR-026 | src/domains/analytics/kpi-snapshot-automation-service.js + src/domains/delivery/delivery-operations-service.js + src/domains/delivery/delivery-health-metrics.js — Operations & KPI Automation（getDeliveryHealth / getLatestKpiSnapshot / getKpiHistory） | 完了 |
| Phase 7 PR-027 | src/domains/analytics/kpi-scheduler-service.js + src/domains/delivery/delivery-retry-service.js + src/domains/analytics/analytics-service.js + DeliveryQueue.resetToPending() — Operations Automation & Analytics Completion（retryFailedDeliveries / getSnapshotScheduleStatus / getAnalyticsStatus） | 完了 |
| LEGACY ASSET INVENTORY COUNCIL | docs/LEGACY_ASSET_INVENTORY.md — 旧資産棚卸・Network Asset判定（KEEP/REFACTOR/HOLD/DROP分類） | 完了 |
| LEGACY_ASSET_INVENTORY 格上げ | docs/LEGACY_ASSET_INVENTORY.md → IPPO-GOV-001 (LEVEL-1 GOVERNING DOCUMENT)。Section 0 Governance追加、Binding Decisions 8件確定 | 完了 |
| Phase 7 PR-028 | src/domains/symptom/ — Symptom Intelligence Foundation（symptom-types / symptom-entity / symptom-validator / symptom-repository / symptom-service + ApiGateway 3メソッド） | 完了 |
| Phase 7 PR-029 | src/domains/disease/ — Disease Entity Foundation（disease-types / disease-entity / disease-validator / disease-repository / disease-service + ApiGateway 4メソッド）。IPPO-GOV-001 BD-004/BD-007/BD-008準拠 | 完了 |

---

## 上位憲法（必ず読むこと）

以下の順序で読む。矛盾がある場合は上にあるものが正。

1. **docs/LEGACY_ASSET_INVENTORY.md (IPPO-GOV-001)** ← **資産戦略最上位基準文書（LEVEL-1 GOVERNING DOCUMENT）。Binding Decisions 8件を含む。**
2. docs/CONSTITUTION_RECONCILIATION_V1.md ← 設計文書の最上位
3. docs/IMPLEMENTATION_PLAN_V1.md ← Phase 6以降の唯一の計画書
4. docs/REPOSITORY_CONSTITUTION_V1.md
5. docs/SCHEMA_V1.md
6. docs/ARCHITECTURE_V3.md
7. docs/DOMAIN_MODEL_V1.md

---

## Founder Fixed Decisions（絶対に変更しない）

**FD-001 Quality Score (100点満点):**
- Coverage = 30
- Duration = 30
- Completeness = 15
- Outcome = 15
- Consent = 10
- diseaseTagMultiplier: **廃止**
- Experiment独立項: **廃止**

**FD-002 Tier Definition:**
- Tier3: disease_tag≥1 + 30日 + 60% coverage（Consent不要）
- Tier2: disease_tag≥1 + 90日 + 70% + exp完了1件 + Outcome必須 + Consent Level1以上
- Tier1: disease_tag≥1 + 180日 + 80% + exp完了2件 + Outcome必須 + Consent Level2以上

**その他確定事項:**
- experiment.status: DRAFT|ACTIVE|COMPLETED|ABANDONED （PAUSEDなし）
- consent.level: CHECK (BETWEEN 0 AND 3) （Level4なし）
- テーブル名: similarity_edges（case_similarityではない）
- ABANDONED後Outcome生成: 7日後から
- consent_events: append-only（DELETE不可）
- similarity_edges: DELETE禁止（immutable audit trail）

---

## IPPO-GOV-001 Binding Decisions（資産戦略基準）

| 番号 | 内容 |
|---|---|
| BD-001 | similarity_edges に対するDELETE禁止 |
| BD-002 | consent_events に対するDELETE禁止 |
| BD-003 | Lunar CalendarをUIとして実装しない（Environmental Signalとして記録のみ） |
| BD-004 | Disease TagをWave1でEntityに昇格させない（Wave2スコープ） |
| BD-005 | FoodをFoodログとして実装しない（Exposure Signalとして設計） |
| BD-006 | Symptom Intelligence はWave1で即時拡張対象 |
| BD-007 | DROP判定はゼロ。すべての旧資産はHOLDまたはREFACTOR |
| BD-008 | 疾患情報は4層（Record/Profile/Case/Network）に分離して扱う |

変更にはLevel-1改訂プロセス（Founder承認 + Council開催）が必要。

---

## 現在の実装状況

- ユーザー数: 0 / 本番依存: なし / 後方互換義務: なし
- app-legacy.js: 10,804行 God Object（削減中）
- 既存DBテーブル: profiles / records / user_data / user_records / subscriptions（5つのみ）
- **ドメイン層（TypeScript）: 全7ドメイン実装済み**
  - domains/record / experiment / case / consent / similarity / analytics / b2b
- **Strangler-Fig移行層（JavaScript）: PR-011〜PR-029 完了**
  - Bootstrap層: DI Container / CompositionRoot / RouteRegistry / ArchitectureGuard
  - Contract層: 10インターフェース（IStorageService / IRecordRepository / IExperimentRepository / IConsentRepository / ICaseRepository / IAnalyticsService / ISimilarityService / IAuthService / IB2BExportRepository / INotificationProvider）
  - Infrastructure層: LocalStorageAdapter / LegacyAuthAdapter / LegacyAccessAudit
  - Record層: RecordRepositoryImpl / RecordMapper / DualWriteRecordRepository / RecordV2Repository / RecordReadSwitch / RecordReadSwitchRepository / RecordMigrationService
  - Dual Write層: RecordV2Store（shadow） / RecordDiffEngine / DiffLogRepository / MigrationDashboard
  - Experiment層: ExperimentRepositoryImpl / ExperimentMapper / ExperimentQueryService / ExperimentCommandService / ExperimentMigrationAudit / ExperimentStateMachine / ExperimentLifecycleService / TransitionAudit
  - Case層: CaseCandidateBuilder / CaseEligibility / CaseRepositoryImpl / CaseGenerationService（eventPublisher対応）/ TierEvaluator / OutcomeResolver / CaseIdGenerator / CaseAuditLog / CandidateAudit / CaseGeneratedEvent（append-only）
  - Consent層: ConsentRepositoryImpl / ConsentMapper / ConsentEnforcementService / ConsentAuditLog / ConsentMotivationService
  - Similarity層: FeatureExtractor / SimilarityCandidate / SimilarityCandidateBuilder / VectorBuilder（8次元cosine）/ SimilarityCalculator / EdgeGenerator（threshold=0.5）/ ConsentFilter（consent≥2）/ SimilarityEngine / SimilarityAuditLog / SimilarityRepositoryImpl / SimilarityAccessGuard
  - Auth層: UserSession / AuthContext / PermissionPolicy / RoleResolver / PermissionService / AuthError
  - UX Foundation層: TierProgressService / ProfileFormationService / DiseaseTagValidator / Wave1MetricsService
  - Engagement層: ExperimentNudgeService / CommitmentService / OutcomeReminderService / EngagementMetrics
  - B2BExport層: IB2BExportRepository / B2BExportRepositoryImpl / ExportMapper
  - Communication層: NotificationScheduleService / NotificationTemplateService / CommunicationAuditLog / CommunicationMetrics / CommunicationRepository
  - Delivery層: DeliveryQueue / DeliveryAuditLog / DeliveryScheduler / DeliveryRepository / DeliveryProcessor / DeliveryMetrics / DeliveryRetryService（FAILED→PENDINGのみ）/ DeliveryHealthMetrics / DeliveryOperationsService
  - Notification Adapter層: INotificationProvider / MockNotificationProvider / NotificationProviderAdapter
  - Analytics（Admin）層: KpiSnapshot / KpiRepository / Wave1DashboardService / KpiSnapshotAutomationService / KpiSchedulerService / AnalyticsService（stub）
  - Symptom Intelligence層: symptom-types（SSOT）/ symptom-entity / symptom-validator / symptom-repository（read-only stub）/ symptom-service
  - Disease Intelligence層: disease-types（SSOT）/ disease-entity / disease-validator / disease-repository（in-memory stub、Storage禁止）/ disease-service
  - API Gateway: ApiGateway（**35メソッド**、全UI→Repository直アクセス禁止）
  - **テスト: 1,844件 全パス（96ファイル）**

---

## Phase 6〜7 移行状況（Strangler-Fig）

| Token | Contract | 実装 | PR | status |
|---|---|---|---|---|
| StorageService | IStorageService | LocalStorageAdapter | PR-012 ✓ | adapter |
| AuthService | IAuthService | LegacyAuthAdapter | PR-012 ✓ | adapter |
| RecordRepository | IRecordRepository | RecordReadSwitchRepository | PR-014+021 ✓ | read-switch-ready |
| ExperimentRepository | IExperimentRepository | ExperimentRepositoryImpl | PR-015 ✓ | state-machine |
| ExperimentLifecycleService | — | ExperimentLifecycleService | PR-016 ✓ | state-machine |
| CaseRepository | ICaseRepository | CaseRepositoryImpl | PR-017 ✓ | generating |
| ConsentRepository | IConsentRepository | ConsentRepositoryImpl | PR-018 ✓ | enforced |
| SimilarityService | ISimilarityService | SimilarityEngine | PR-019 ✓ | active |
| PermissionService | — | PermissionService | PR-020 ✓ | active |
| SimilarityAccessGuard | — | SimilarityAccessGuard | PR-020 ✓ | active |
| ApiGateway | — | ApiGateway | PR-020〜029 ✓ | active |
| RecordV2Repository | IRecordRepository | RecordV2Repository | PR-021 ✓ | read-switch-ready |
| RecordMigrationService | — | RecordMigrationService | PR-021 ✓ | read-switch-ready |
| TierProgressService | — | TierProgressService | PR-021 ✓ | active |
| ProfileFormationService | — | ProfileFormationService | PR-021 ✓ | active |
| Wave1MetricsService | — | Wave1MetricsService | PR-021 ✓ | active |
| ExperimentNudgeService | — | ExperimentNudgeService | PR-022 ✓ | active |
| CommitmentService | — | CommitmentService | PR-022 ✓ | active |
| OutcomeReminderService | — | OutcomeReminderService | PR-022 ✓ | active |
| ConsentMotivationService | — | ConsentMotivationService | PR-022 ✓ | active |
| B2BExportRepository | IB2BExportRepository | B2BExportRepositoryImpl | PR-022 ✓ | bridged |
| CommunicationRepository | — | CommunicationRepository | PR-023 ✓ | active |
| CommunicationAuditLog | — | CommunicationAuditLog | PR-023 ✓ | active |
| CommunicationMetrics | — | CommunicationMetrics | PR-023 ✓ | active |
| NotificationScheduleService | — | NotificationScheduleService | PR-023 ✓ | active |
| NotificationTemplateService | — | NotificationTemplateService | PR-023 ✓ | active |
| DeliveryRepository | — | DeliveryRepository | PR-024 ✓ | active |
| DeliveryQueue | — | DeliveryQueue | PR-024 ✓ | active |
| DeliveryAuditLog | — | DeliveryAuditLog | PR-024 ✓ | active |
| DeliveryScheduler | — | DeliveryScheduler | PR-024 ✓ | active |
| KpiRepository | — | KpiRepository | PR-024 ✓ | active |
| KpiSnapshot | — | KpiSnapshot | PR-024 ✓ | active |
| Wave1DashboardService | — | Wave1DashboardService | PR-024 ✓ | active |
| NotificationProvider | INotificationProvider | MockNotificationProvider | PR-025 ✓ | mock(Wave1) |
| NotificationProviderAdapter | — | NotificationProviderAdapter | PR-025 ✓ | active |
| DeliveryProcessor | — | DeliveryProcessor | PR-025 ✓ | active |
| DeliveryMetrics | — | DeliveryMetrics | PR-025 ✓ | active |
| KpiSnapshotAutomationService | — | KpiSnapshotAutomationService | PR-026 ✓ | active |
| DeliveryOperationsService | — | DeliveryOperationsService | PR-026 ✓ | active |
| DeliveryHealthMetrics | — | DeliveryHealthMetrics | PR-026 ✓ | active |
| KpiSchedulerService | — | KpiSchedulerService | PR-027 ✓ | active |
| DeliveryRetryService | — | DeliveryRetryService | PR-027 ✓ | active |
| AnalyticsService | IAnalyticsService | AnalyticsService（stub） | PR-027 ✓ | stub(Wave2) |
| SymptomRepository | — | SymptomRepository（read-only stub） | PR-028 ✓ | active |
| SymptomValidator | — | SymptomValidator | PR-028 ✓ | active |
| SymptomService | — | SymptomService | PR-028 ✓ | active |
| DiseaseRepository | — | DiseaseRepository（in-memory stub） | PR-029 ✓ | active |
| DiseaseValidator | — | DiseaseValidator | PR-029 ✓ | active |
| DiseaseService | — | DiseaseService | PR-029 ✓ | active |

---

## RouteRegistry — KNOWN_FEATURES（PR-029時点）

```
Record / Experiment / Case / Consent / Analytics / Similarity
Auth / API / RecordV2 / Engagement / B2BExport / Communication / Delivery
Operations / OperationsAutomation / Symptom / Disease
計17件
```

---

## Phase 6〜7 最重要制約（全PRで共通）

- app-legacy.js への新規ロジック追加: **禁止**
- DB Migration / Schema変更: **禁止**
- feature→feature 依存: **禁止**
- localStorage 直叩き（Adapter外）: **禁止**
- Service Locator パターン: **禁止**
- Singleton 乱用: **禁止**
- feature / screen → RecordV2Store / DiffLog 直接参照: **禁止**
- feature / screen → EngagementDomain 直接参照: **禁止**
- feature / screen → StorageService 直接参照: **禁止**
- feature / screen → DeliveryQueue / DeliveryProcessor 直接参照: **禁止**（PR-024追加）
- feature / screen → SymptomRepository / SymptomValidator 直接参照: **禁止**（PR-028追加）
- feature / screen → DiseaseRepository / DiseaseService 直接参照: **禁止**（PR-029追加）
- similarity_edges DELETE: **禁止**（immutable audit trail / IPPO-GOV-001 BD-001）
- consent_events DELETE: **禁止**（法的監査ログ / IPPO-GOV-001 BD-002）
- 全AuditLog（CommunicationAuditLog / DeliveryAuditLog / KpiSnapshot）: **Append Only（DELETE/UPDATE禁止）**
- UI → ApiGateway → Application → Repository: **この経路のみ許可**
- window.supabase 直接参照: **禁止**
- Repository直アクセス（UI層から）: **禁止**
- Push Provider直実装（FCM/OneSignal/APNs/Firebase SDK）: **Wave1期間中禁止**
- Similarity結果のUI公開: **Wave1期間中禁止**
- Disease診断AI / Recommendation / Network Search / 推論: **Wave1期間中禁止**（IPPO-GOV-001 BD-004）
- Lunar CalendarのUI実装: **禁止**（IPPO-GOV-001 BD-003）

---

## API Gateway メソッド一覧（PR-029時点、計35メソッド）

| メソッド | 権限 | PR |
|---|---|---|
| getRecords(userId) | record:read | PR-020 |
| saveRecord(data) | record:write | PR-020 |
| getExperiments(userId) | experiment:read | PR-020 |
| createExperiment(data) | experiment:write | PR-020 |
| generateCase(recordId) | case:read:own | PR-020 |
| getSimilarCases(caseId, opts) | similarity:read:own + OwnershipGate + ConsentGate | PR-020 |
| getTierProgress(candidate) | case:read:own | PR-021 |
| getProfileFormation(candidate) | record:read | PR-021 |
| getCaseEvents() | case:read:own | PR-021 |
| getExperimentNudge(records, activeExperiments) | experiment:read | PR-022 |
| createCommitment({experimentId, targetDays}) | experiment:write | PR-022 |
| getOutcomeReminders(experiments) | experiment:read | PR-022 |
| getConsentMotivation(currentLevel) | record:read | PR-022 |
| getDueNotifications(userContext) | record:read | PR-023 |
| getNotificationPreview(notificationType) | record:read | PR-023 |
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

---

## Disease / Symptom SSOT Registry（PR-028〜029確定）

### Symptom Categories（7種）
Pain / Bleeding / Nausea / Fatigue / Headache / Bloating / Mood / Sleep / Other（9種）

### Pain Types（7種）
Sharp / Dull / Cramping / Burning / Pressure / Throbbing / Other

### Symptom Severity
integer 0〜10（`SEVERITY.isValid(v)` = Number.isInteger && 0≤v≤10）

### Disease Categories（7種）
Gynecology / Endocrine / Digestive / Mental / Dermatology / Neurology / Unknown

### Disease Severity（4種）
LOW / MEDIUM / HIGH / UNKNOWN（デフォルト: UNKNOWN）

### Disease Confidence（3種）
USER_REPORTED / PHYSICIAN_CONFIRMED / UNKNOWN（デフォルト: USER_REPORTED）

---

## Communication / Delivery 仕様（PR-023〜027確定）

### NOTIFICATION_TYPES（7種）

| type | 発火条件 |
|---|---|
| DAY1_RECORD | !day1Recorded && consecutiveDays === 0 |
| DAY3_EXPERIMENT_NUDGE | consecutiveDays >= 3 && !hasActiveExperiment |
| DAY7_SUMMARY | consecutiveDays >= 7 |
| DAY15_PROFILE_FORMING | profileFormationStage === 'FORMING' |
| PROFILE_READY | caseGeneratedEvents.length > 0 |
| OUTCOME_REMINDER | terminal experiment + overdueDays >= 1 |
| CONSENT_MOTIVATION | consentLevel < 2 |

### DELIVERY_STATUS 状態遷移

```
PENDING → SCHEDULED → DELIVERED
                    → FAILED
PENDING → FAILED（no_template時）
FAILED  → PENDING（DeliveryRetryService.retryFailed() のみ許可 / PR-027追加）
```

### DeliveryRetryService（PR-027）
- `retryFailed()`: FAILED → PENDING のみ。DELIVERED / SCHEDULED は絶対に戻さない
- `DeliveryQueue.resetToPending(queueId)` が唯一の逆遷移メソッド

### QUEUE_HEALTH 閾値（PR-027）
- failureRate < 5% → HEALTHY
- failureRate < 15% → WARNING
- failureRate ≥ 15% → CRITICAL

### KpiSchedulerService（PR-027）
- cron / setInterval なし。呼び出し側が実行タイミングを決定
- デフォルトインターバル: 1時間（3,600,000ms）

### TD-4修正（Metrics二重計上）
- `getDueNotifications()` は pure（side effect なし）
- `scheduleNotifications()` → DeliveryScheduler → 新規のみ metrics.record()
- DeliverySchedulerが当日の CommunicationAuditLog を確認してdedup

### NotificationProvider 差し替え方針
- Wave1: MockNotificationProvider（常にsuccess:true）
- Wave2以降: CompositionRoot の `TOKENS.NotificationProvider` バインドを差し替えるだけ
- Domain / DeliveryProcessor はProvider非依存

---

## TierEvaluator / ConsentEnforcementService 責務分離（PR-018確定）

- **TierEvaluator**: データ品質のみ評価（FD-002）。`consentLevel` パラメータなし
- **ConsentEnforcementService**: Tier確定後にコンセントゲートを担当（唯一の入口）
- **CaseGenerationService**: step4(TierEvaluator) → step4b(ConsentEnforcementService) の順で呼び出し
- TIER2にconsent=0でアクセスした場合: `ConsentRequiredError` をthrow
- TIER3はconsent≥0（常に許可）

---

## SimilarityEngine仕様（PR-019確定）

- FeatureVector次元数: 8（QUALITY_SCORE / DURATION_DAYS / HAS_OUTCOME / EXPERIMENT_COUNT / RECORD_COUNT / CONSENT_LEVEL / SYMPTOM_COUNT / FOOD_COUNT）
- 類似度計算: Cosine Similarity（[0.0, 1.0]）
- Edge生成条件: score ≥ 0.5 かつ同一diseaseKey
- Consent要件: consentLevel ≥ 2（ConsentFilterがVectorBuilder前にゲート）
- ストレージキー: `ippo_similarity_edges`
- SimilarityEngine が唯一の入口（UI→EdgeGenerator / VectorBuilder / SimilarityCalculator 直接参照は禁止）
- **Wave1: Similarity非公開**（Tier3 Case数 < 50 の間はUI表示しない）

---

## Record V2 ReadSwitch 仕様（PR-021確定）

- デフォルト状態: LEGACY（RecordReadSwitch.isV2Active() = false）
- 切り替え条件: matchRate≥99.9% AND criticalDiffCount=0
- 切り替え方法: RecordMigrationService.attemptSwitch()
- 書き込み: 常にDualWrite（Legacy + V2 両方）
- ロールバック: RecordMigrationService.rollback()

---

## ProfileFormationService 仕様（PR-021確定）

- NEVER "Case"という単語を返す（UX要件）
- stage: STARTED / FORMING / NEAR_READY / READY
- READY判定 = completionPercent≥100

---

## UX/UI Council #1 決定事項（Wave1リスク対応）

- **R-01（Day0〜Day7 中間報酬なし）**: ExperimentNudgeService（Day3）で対応
- **R-02（Case生成通知なし）**: CaseGeneratedEvent（append-only）で対応
- **R-03（DiseaseTag保証なし）**: DiseaseTagValidator（WARNING, non-blocking）で対応
- **Wave1 Similarity**: 非公開。ConsentMotivationでも言及しない。

---

## 技術スタック

- フロントエンド: Vanilla JS + Vite（React/Vue/Svelteなし）
- バックエンド: Supabase（PostgreSQL + Edge Functions）
- 決済: Stripe（¥580/月、¥4,800/年）
- テスト: Vitest（**1,844件 全パス**）
- 言語: JavaScript（TypeScript移行中）

---

## NETWORK ASSET COUNCIL 完了（2026-06-26）

- 文書: `docs/NETWORK_ASSET_COUNCIL.md` (IPPO-COUNCIL-002)
- IPPO-GOV-001 を v1.1 → v1.2 に改訂（BD-009〜BD-014 追加、計14件）
- 次回: DATA ASSET COUNCIL

### IPPO-GOV-001 v1.2 追加 Binding Decisions

| 番号 | 内容 |
|---|---|
| BD-009 | Disease Cluster ID は Wave2 Disease Entity 昇格まで `diseaseKey` と同一 |
| BD-010 | FeatureVector は `VECTOR_VERSION` 定数を持ち、次元拡張時は必ずバージョンを上げる |
| BD-011 | EdgeGenerator が生成する全エッジは `vectorVersion` フィールドを持つ |
| BD-012 | Longitudinal Signal の計算は Wave2 スコープ。Wave1 では Edge に付与しない |
| BD-013 | NetworkSignal の SSOT は `src/domains/network/network-signal-types.js` に置く |
| BD-014 | MenstrualPhase の自動判定は Disease Entity 昇格後（Wave2）に実装する |

---

## 次のPR — PR-030: Record Input Signal 収集基盤

**ブランチ:** `feat/phase4d-batch1-record-input`
**スコープ:** NETWORK ASSET COUNCIL Section 8 参照

| 実装内容 | ファイル |
|---|---|
| NetworkSignal型定義 SSOT（Wave2足場） | `src/domains/network/network-signal-types.js` |
| VECTOR_VERSION 定数追加 | `src/domains/similarity/vector-builder.js` |
| vectorVersion フィールド付与 | `src/domains/similarity/edge-generator.js` |
| Record Input バリデーション | `src/domains/record/record-input-validator.js` |
| ApiGateway saveRecord() Signal対応 | `src/application/api-gateway.js` |
| テスト | 上記すべての単体テスト |
