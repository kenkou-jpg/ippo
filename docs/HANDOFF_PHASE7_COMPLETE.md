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

---

## 上位憲法（必ず読むこと）

以下の順序で読む。矛盾がある場合は上にあるものが正。

1. docs/CONSTITUTION_RECONCILIATION_V1.md ← **最上位。全文書の正**
2. docs/IMPLEMENTATION_PLAN_V1.md ← **Phase 6以降の唯一の計画書**
3. docs/REPOSITORY_CONSTITUTION_V1.md
4. docs/SCHEMA_V1.md
5. docs/ARCHITECTURE_V3.md
6. docs/DOMAIN_MODEL_V1.md

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

## 現在の実装状況

- ユーザー数: 0 / 本番依存: なし / 後方互換義務: なし
- app-legacy.js: 10,804行 God Object（削減中）
- 既存DBテーブル: profiles / records / user_data / user_records / subscriptions（5つのみ）
- **ドメイン層（TypeScript）: 全7ドメイン実装済み**
  - domains/record / experiment / case / consent / similarity / analytics / b2b
- **Strangler-Fig移行層（JavaScript）: PR-011〜PR-022 完了**
  - Bootstrap層: DI Container / CompositionRoot / RouteRegistry / ArchitectureGuard
  - Contract層: 9インターフェース（IStorageService / IRecordRepository / IExperimentRepository / IConsentRepository / ICaseRepository / IAnalyticsService / ISimilarityService / IAuthService / IB2BExportRepository）
  - Infrastructure層: LocalStorageAdapter / LegacyAuthAdapter / LegacyAccessAudit
  - Record層: RecordRepositoryImpl / RecordMapper / DualWriteRecordRepository / RecordV2Repository / RecordReadSwitch / RecordReadSwitchRepository / RecordMigrationService
  - Dual Write層: RecordV2Store（shadow） / RecordDiffEngine / DiffLogRepository / MigrationDashboard
  - Experiment層: ExperimentRepositoryImpl / ExperimentMapper / ExperimentQueryService / ExperimentCommandService / ExperimentMigrationAudit / ExperimentStateMachine / ExperimentLifecycleService / TransitionAudit
  - Case層: CaseCandidateBuilder / CaseEligibility / CaseRepositoryImpl / CaseGenerationService（eventPublisher対応）/ TierEvaluator（getTierThresholds追加）/ OutcomeResolver / CaseIdGenerator / CaseAuditLog / CandidateAudit / CaseGeneratedEvent（append-only）
  - Consent層: ConsentRepositoryImpl / ConsentMapper / ConsentEnforcementService / ConsentAuditLog / ConsentMotivationService
  - Similarity層: FeatureExtractor / SimilarityCandidate / SimilarityCandidateBuilder / VectorBuilder（8次元cosine）/ SimilarityCalculator / EdgeGenerator（threshold=0.5）/ ConsentFilter（consent≥2）/ SimilarityEngine / SimilarityAuditLog / SimilarityRepositoryImpl / SimilarityAccessGuard
  - Auth層: UserSession / AuthContext / PermissionPolicy / RoleResolver / PermissionService / AuthError
  - UX Foundation層: TierProgressService / ProfileFormationService / DiseaseTagValidator / Wave1MetricsService
  - Engagement層: ExperimentNudgeService / CommitmentService / OutcomeReminderService / EngagementMetrics
  - B2BExport層: IB2BExportRepository / B2BExportRepositoryImpl / ExportMapper
  - API Gateway: ApiGateway（12メソッド、全UI→Repository直アクセス禁止）
  - **テスト: 629件以上 パス（bootstrap/ 11ファイル）**

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
| ApiGateway | — | ApiGateway | PR-020 ✓ | active |
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
| AnalyticsService | IAnalyticsService | null stub | 未実装 | legacy |

---

## RouteRegistry — KNOWN_FEATURES（PR-022時点）

```
Record / Experiment / Case / Consent / Analytics / Similarity
Auth / API / RecordV2 / Engagement / B2BExport
計11件
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
- feature / screen → EngagementDomain 直接参照: **禁止**（PR-022追加）
- feature / screen → StorageService 直接参照: **禁止**（PR-022追加）
- similarity_edges DELETE: **禁止**（immutable audit trail）
- consent_events DELETE: **禁止**（法的監査ログ）
- UI → ApiGateway → Application → Repository: **この経路のみ許可**
- window.supabase 直接参照: **禁止**
- Repository直アクセス（UI層から）: **禁止**

---

## API Gateway メソッド一覧（PR-022時点）

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
- テスト: Vitest
- 言語: JavaScript（TypeScript移行中）

---

## 次のPR

### PR-023 — Wave1 Communication Layer

スコープ:
- Push Notification Scheduler（Day1 / Day3 / Day7 / Day15）
- Contribution Messaging（貢献感訴求）
- Similarity Placeholder（Wave2予告UI）
- Admin KPI Dashboard（Wave1MetricsService + EngagementMetrics 表示）

制約:
- PR-022完了済みのサービスを使うこと（ExperimentNudgeService / CommitmentService / OutcomeReminderService / ConsentMotivationService）
- Wave1期間中はSimilarity結果を表示しない
- app-legacy.js変更禁止 / DB変更禁止 は継続
