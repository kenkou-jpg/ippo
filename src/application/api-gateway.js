// API Gateway — the ONLY public entry point for UI code.
// feature/* and screen/* must call through this gateway.
// Direct repository, domain service, or adapter imports from UI are forbidden.
//
// PR-020: Auth Boundary
//   • All calls require authentication via PermissionService
//   • getSimilarCases enforces ownership via SimilarityAccessGuard
//   • getSimilarCases enforces consent via Consent Double Gate

export class ApiGateway {
  #permissionService;
  #similarityAccessGuard;
  #consentEnforcementService;
  #recordQueryService;
  #recordCommandService;
  #experimentQueryService;
  #experimentCommandService;
  #caseGenerationService;
  #similarityEngine;
  // PR-021 additions
  #diseaseTagValidator;
  #tierProgressService;
  #profileFormationService;
  #caseGeneratedEvent;
  // PR-022 additions
  #experimentNudgeService;
  #commitmentService;
  #outcomeReminderService;
  #consentMotivationService;
  // PR-023 additions
  #notificationScheduleService;
  #notificationTemplateService;
  #communicationMetrics;
  // PR-024 additions
  #deliveryScheduler;
  #wave1DashboardService;
  #kpiSnapshot;
  // PR-025 additions
  #deliveryProcessor;
  #deliveryMetrics;
  // PR-026 additions
  #kpiSnapshotAutomationService;
  #deliveryOperationsService;
  #deliveryHealthMetrics;
  // PR-027 additions
  #kpiSchedulerService;
  #deliveryRetryService;
  #analyticsService;
  // PR-028 additions
  #symptomService;
  // PR-029 additions
  #diseaseService;
  // PR-030 additions
  #networkSignalService;
  // PR-031
  #signalAggregationService;
  #signalTrendService;
  #signalTimelineService;
  #signalSummaryService;
  // PR-032
  #longitudinalSignalService;
  #movingAverageService;
  #baselineService;
  #trendWindowBuilder;
  #longitudinalSummaryService;
  // PR-033
  #persistentNetworkSignalService;
  #signalReconstructionService;
  // PR-034
  #diseaseClusterService;
  #diseaseSignalMapper;
  #clusterSimilarityAdapter;
  // PR-035
  #signalSnapshotService;
  #longitudinalSnapshotService;
  #diseaseSnapshotService;
  // PR-036
  #signalSimilarityService;
  // PR-037
  #eventPublisher;
  #eventReplayService;
  #auditTimelineService;

  constructor({
    permissionService,
    similarityAccessGuard,
    consentEnforcementService,
    recordQueryService,
    recordCommandService,
    experimentQueryService,
    experimentCommandService,
    caseGenerationService,
    similarityEngine,
    // PR-021
    diseaseTagValidator     = null,
    tierProgressService     = null,
    profileFormationService = null,
    caseGeneratedEvent      = null,
    // PR-022
    experimentNudgeService   = null,
    commitmentService        = null,
    outcomeReminderService   = null,
    consentMotivationService = null,
    // PR-023
    notificationScheduleService = null,
    notificationTemplateService = null,
    communicationMetrics        = null,
    // PR-024
    deliveryScheduler    = null,
    wave1DashboardService = null,
    kpiSnapshot          = null,
    // PR-025
    deliveryProcessor = null,
    deliveryMetrics   = null,
    // PR-026
    kpiSnapshotAutomationService = null,
    deliveryOperationsService    = null,
    deliveryHealthMetrics        = null,
    // PR-027
    kpiSchedulerService   = null,
    deliveryRetryService  = null,
    analyticsService      = null,
    // PR-028
    symptomService        = null,
    // PR-029
    diseaseService        = null,
    // PR-030
    networkSignalService  = null,
    // PR-031
    signalAggregationService = null,
    signalTrendService       = null,
    signalTimelineService    = null,
    signalSummaryService     = null,
    // PR-032
    longitudinalSignalService  = null,
    movingAverageService       = null,
    baselineService            = null,
    trendWindowBuilder         = null,
    longitudinalSummaryService = null,
    // PR-033
    persistentNetworkSignalService = null,
    signalReconstructionService    = null,
    // PR-034
    diseaseClusterService    = null,
    diseaseSignalMapper      = null,
    clusterSimilarityAdapter = null,
    // PR-035
    signalSnapshotService       = null,
    longitudinalSnapshotService = null,
    diseaseSnapshotService      = null,
    // PR-036
    signalSimilarityService     = null,
    // PR-037
    eventPublisher       = null,
    eventReplayService   = null,
    auditTimelineService = null,
  }) {
    this.#permissionService          = permissionService;
    this.#similarityAccessGuard      = similarityAccessGuard;
    this.#consentEnforcementService  = consentEnforcementService;
    this.#recordQueryService         = recordQueryService;
    this.#recordCommandService       = recordCommandService;
    this.#experimentQueryService     = experimentQueryService;
    this.#experimentCommandService   = experimentCommandService;
    this.#caseGenerationService      = caseGenerationService;
    this.#similarityEngine           = similarityEngine;
    this.#diseaseTagValidator        = diseaseTagValidator;
    this.#tierProgressService        = tierProgressService;
    this.#profileFormationService    = profileFormationService;
    this.#caseGeneratedEvent         = caseGeneratedEvent;
    this.#experimentNudgeService        = experimentNudgeService;
    this.#commitmentService             = commitmentService;
    this.#outcomeReminderService        = outcomeReminderService;
    this.#consentMotivationService      = consentMotivationService;
    this.#notificationScheduleService   = notificationScheduleService;
    this.#notificationTemplateService   = notificationTemplateService;
    this.#communicationMetrics          = communicationMetrics;
    this.#deliveryScheduler             = deliveryScheduler;
    this.#wave1DashboardService         = wave1DashboardService;
    this.#kpiSnapshot                   = kpiSnapshot;
    this.#deliveryProcessor             = deliveryProcessor;
    this.#deliveryMetrics               = deliveryMetrics;
    this.#kpiSnapshotAutomationService  = kpiSnapshotAutomationService;
    this.#deliveryOperationsService     = deliveryOperationsService;
    this.#deliveryHealthMetrics         = deliveryHealthMetrics;
    this.#kpiSchedulerService           = kpiSchedulerService;
    this.#deliveryRetryService          = deliveryRetryService;
    this.#analyticsService              = analyticsService;
    this.#symptomService                = symptomService;
    this.#diseaseService                = diseaseService;
    this.#networkSignalService          = networkSignalService;
    // PR-031
    this.#signalAggregationService      = signalAggregationService;
    this.#signalTrendService            = signalTrendService;
    this.#signalTimelineService         = signalTimelineService;
    this.#signalSummaryService          = signalSummaryService;
    // PR-032
    this.#longitudinalSignalService     = longitudinalSignalService;
    this.#movingAverageService          = movingAverageService;
    this.#baselineService               = baselineService;
    this.#trendWindowBuilder            = trendWindowBuilder;
    this.#longitudinalSummaryService    = longitudinalSummaryService;
    // PR-033
    this.#persistentNetworkSignalService = persistentNetworkSignalService;
    this.#signalReconstructionService    = signalReconstructionService;
    // PR-034
    this.#diseaseClusterService    = diseaseClusterService;
    this.#diseaseSignalMapper      = diseaseSignalMapper;
    this.#clusterSimilarityAdapter = clusterSimilarityAdapter;
    // PR-035
    this.#signalSnapshotService        = signalSnapshotService;
    this.#longitudinalSnapshotService = longitudinalSnapshotService;
    this.#diseaseSnapshotService       = diseaseSnapshotService;
    // PR-036
    this.#signalSimilarityService      = signalSimilarityService;
    // PR-037
    this.#eventPublisher       = eventPublisher;
    this.#eventReplayService   = eventReplayService;
    this.#auditTimelineService = auditTimelineService;
  }

  // ── Records ──────────────────────────────────────────────────────────────────

  async getRecords(userId = null) {
    const ctx = await this.#permissionService.require('record:read');
    return this.#recordQueryService.findByUser(ctx.userId ?? userId);
  }

  async saveRecord(data) {
    await this.#permissionService.require('record:write');
    // DiseaseTagValidator: WARNING only, non-blocking (Wave1 coverage measurement)
    this.#diseaseTagValidator?.validate(data);
    const record = await this.#recordCommandService.save(data);
    // PR-030: generate NetworkSignals from record data (Signal generation point only)
    // No Similarity, DiseaseCluster, Longitudinal, or FeatureVector triggered here.
    this.#networkSignalService?.generateFromRecord(record ?? data);
    return record;
  }

  // ── Experiments ───────────────────────────────────────────────────────────────

  async getExperiments(userId = null) {
    const ctx = await this.#permissionService.require('experiment:read');
    return this.#experimentQueryService.findActive(ctx.userId ?? userId);
  }

  async createExperiment(data) {
    await this.#permissionService.require('experiment:write');
    return this.#experimentCommandService.create(data);
  }

  // ── Case ──────────────────────────────────────────────────────────────────────

  async generateCase(recordId) {
    const ctx = await this.#permissionService.require('case:read:own');
    return this.#caseGenerationService.generate(recordId, ctx.userId);
  }

  // ── Similarity ────────────────────────────────────────────────────────────────

  // ── Tier Progress & Profile Formation (PR-021) ───────────────────────────────

  /**
   * Compute Tier3 progress for the given CaseCandidate. Auth required.
   * @param {object} candidate  CaseCandidate or equivalent shape
   * @returns {Promise<object>}
   */
  async getTierProgress(candidate) {
    await this.#permissionService.require('case:read:own');
    if (!this.#tierProgressService) throw new Error('[ApiGateway] TierProgressService not wired');
    return this.#tierProgressService.getProgress(candidate);
  }

  /**
   * Get profile formation status (UX-facing, no "Case" terminology). Auth required.
   * @param {object} candidate  CaseCandidate or equivalent shape
   * @returns {Promise<{stage: string, completionPercent: number, daysRemaining: number}>}
   */
  async getProfileFormation(candidate) {
    await this.#permissionService.require('record:read');
    if (!this.#profileFormationService) throw new Error('[ApiGateway] ProfileFormationService not wired');
    return this.#profileFormationService.getFormationStatus(candidate);
  }

  /**
   * Get Case generation events for the current user. Auth required.
   * @returns {Promise<Array<{caseId:string, userId:string, generatedAt:string}>>}
   */
  async getCaseEvents() {
    const ctx = await this.#permissionService.require('case:read:own');
    if (!this.#caseGeneratedEvent) return [];
    return this.#caseGeneratedEvent.getForUser(ctx.userId);
  }

  // ── Engagement & Consent (PR-022) ───────────────────────────────────────────

  /**
   * Get experiment nudge recommendation based on current records and active experiments.
   * @param {object[]} records
   * @param {object[]} activeExperiments
   * @returns {Promise<{recommended:boolean, experimentType?:string, reason?:string}>}
   */
  async getExperimentNudge(records, activeExperiments) {
    await this.#permissionService.require('experiment:read');
    if (!this.#experimentNudgeService) throw new Error('[ApiGateway] ExperimentNudgeService not wired');
    return this.#experimentNudgeService.getNudge(records, activeExperiments);
  }

  /**
   * Create a commitment for an experiment. Idempotent — returns null if already committed.
   * @param {{experimentId:string, targetDays?:number}} params
   * @returns {Promise<object|null>}
   */
  async createCommitment({ experimentId, targetDays } = {}) {
    await this.#permissionService.require('experiment:write');
    if (!this.#commitmentService) throw new Error('[ApiGateway] CommitmentService not wired');
    return this.#commitmentService.commit({ experimentId, targetDays });
  }

  /**
   * Get overdue outcome reminders for a list of experiments.
   * @param {object[]} experiments
   * @returns {Promise<object[]>}
   */
  async getOutcomeReminders(experiments) {
    await this.#permissionService.require('experiment:read');
    if (!this.#outcomeReminderService) throw new Error('[ApiGateway] OutcomeReminderService not wired');
    return this.#outcomeReminderService.getOverdueReminders(experiments);
  }

  /**
   * Get consent upgrade motivation text for the current consent level.
   * @param {number} currentLevel
   * @returns {Promise<{currentLevel:number, nextLevel:number, motivation:string, benefit:string, canUpgrade:boolean}>}
   */
  async getConsentMotivation(currentLevel) {
    await this.#permissionService.require('record:read');
    if (!this.#consentMotivationService) throw new Error('[ApiGateway] ConsentMotivationService not wired');
    return this.#consentMotivationService.getMotivation(currentLevel);
  }

  // ── Communication (PR-023) ───────────────────────────────────────────────

  /**
   * Return all due notification candidates for the current user.
   * Auth required. No push delivery — scheduling only.
   *
   * @param {import('../domains/communication/notification-schedule-service.js').UserContext} userContext
   * @returns {Promise<import('../domains/communication/notification-schedule-service.js').NotificationCandidate[]>}
   */
  /**
   * Query which notifications are due for the given user context.
   * Pure read — no metrics side effects (TD-4 fix). Use scheduleNotifications to act.
   *
   * @param {import('../domains/communication/notification-schedule-service.js').UserContext} userContext
   * @returns {Promise<import('../domains/communication/notification-schedule-service.js').NotificationCandidate[]>}
   */
  async getDueNotifications(userContext) {
    await this.#permissionService.require('record:read');
    if (!this.#notificationScheduleService) throw new Error('[ApiGateway] NotificationScheduleService not wired');
    return this.#notificationScheduleService.getDueNotifications(userContext);
  }

  /**
   * Schedule due notifications for the current user.
   * Idempotent: same notification type on the same day is enqueued once only.
   * Records Communication Metrics for new notifications only (TD-4 fix).
   *
   * @param {import('../domains/communication/notification-schedule-service.js').UserContext} userContext
   * @returns {Promise<{ scheduled: object[], skipped: string[] }>}
   */
  async scheduleNotifications(userContext) {
    const ctx = await this.#permissionService.require('record:read');
    if (!this.#deliveryScheduler) throw new Error('[ApiGateway] DeliveryScheduler not wired');
    return this.#deliveryScheduler.scheduleDueNotifications(ctx.userId, userContext);
  }

  /**
   * Preview the rendered template for a given notification type.
   * Auth required.
   *
   * @param {string} notificationType
   * @returns {Promise<{title:string, body:string, cta:string}|null>}
   */
  async getNotificationPreview(notificationType) {
    await this.#permissionService.require('record:read');
    if (!this.#notificationTemplateService) throw new Error('[ApiGateway] NotificationTemplateService not wired');
    return this.#notificationTemplateService.getTemplate(notificationType);
  }

  /**
   * Return the current Communication KPI snapshot. Auth required.
   * @returns {Promise<object>}
   */
  async getCommunicationMetrics() {
    await this.#permissionService.require('record:read');
    if (!this.#communicationMetrics) throw new Error('[ApiGateway] CommunicationMetrics not wired');
    return this.#communicationMetrics.getSnapshot();
  }

  // ── Admin Analytics (PR-024) — admin:dashboard permission required ──────────

  /**
   * Return the full Wave1 KPI dashboard summary. Admin only.
   * @param {{ users: object[] }} params
   * @returns {Promise<object>}
   */
  async getWave1Dashboard({ users = [] } = {}) {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#wave1DashboardService) throw new Error('[ApiGateway] Wave1DashboardService not wired');
    return this.#wave1DashboardService.getDashboard({ users });
  }

  /**
   * Return the Communication Layer KPI snapshot with delivery queue stats. Admin only.
   * @returns {Promise<object>}
   */
  async getCommunicationDashboard() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#communicationMetrics) throw new Error('[ApiGateway] CommunicationMetrics not wired');
    const commMetrics = this.#communicationMetrics.getSnapshot();
    const latestKpi   = this.#kpiSnapshot?.findLatest() ?? null;
    return { communicationMetrics: commMetrics, latestKpiSnapshot: latestKpi };
  }

  /**
   * Return all KPI snapshots (time-series). Admin only.
   * @returns {Promise<object[]>}
   */
  async getKpiSnapshots() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#kpiSnapshot) throw new Error('[ApiGateway] KpiSnapshot not wired');
    return this.#kpiSnapshot.findAll();
  }

  /**
   * Process all PENDING queue entries through the delivery lifecycle. Admin only.
   * Drives PENDING → SCHEDULED → DELIVERED|FAILED for every queued notification.
   * @returns {Promise<{processed:number, delivered:number, failed:number, results:object[]}>}
   */
  async processPendingNotifications() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#deliveryProcessor) throw new Error('[ApiGateway] DeliveryProcessor not wired');
    return this.#deliveryProcessor.processPending();
  }

  /**
   * Return the Delivery Layer KPI snapshot. Admin only.
   * @returns {Promise<{delivered:number, failed:number, pending:number, deliveryRate:number, failureRate:number}>}
   */
  async getDeliveryMetrics() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#deliveryMetrics) throw new Error('[ApiGateway] DeliveryMetrics not wired');
    return this.#deliveryMetrics.getSnapshot();
  }

  // ── Operations Admin API (PR-026) — admin:dashboard permission required ──────

  /**
   * Return live delivery queue health (pending/scheduled/delivered/failed counts + rate).
   * Admin only. Read-only — no mutations.
   * @returns {Promise<{pending:number, scheduled:number, delivered:number, failed:number, deliveryRate:number}>}
   */
  async getDeliveryHealth() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#deliveryOperationsService) throw new Error('[ApiGateway] DeliveryOperationsService not wired');
    return this.#deliveryOperationsService.getDeliveryHealth();
  }

  /**
   * Return the most recently captured KPI snapshot. Admin only.
   * @returns {Promise<import('../domains/analytics/kpi-snapshot.js').KpiSnapshotEntry|null>}
   */
  async getLatestKpiSnapshot() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#kpiSnapshotAutomationService) throw new Error('[ApiGateway] KpiSnapshotAutomationService not wired');
    return this.#kpiSnapshotAutomationService.getLatestSnapshot();
  }

  /**
   * Return all KPI snapshots in insertion order. Admin only.
   * @returns {Promise<import('../domains/analytics/kpi-snapshot.js').KpiSnapshotEntry[]>}
   */
  async getKpiHistory() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#kpiSnapshotAutomationService) throw new Error('[ApiGateway] KpiSnapshotAutomationService not wired');
    return this.#kpiSnapshotAutomationService.getSnapshotHistory();
  }

  // ── Symptom Intelligence API (PR-028) ────────────────────────────────────

  /**
   * Validate a symptom input against all SSOT registries. Auth required.
   * Returns { valid, errors }. Does NOT persist.
   * @param {object} data
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  async validateSymptom(data) {
    await this.#permissionService.require('record:write');
    if (!this.#symptomService) throw new Error('[ApiGateway] SymptomService not wired');
    return this.#symptomService.validateSymptom(data);
  }

  /**
   * Return the Symptom Category registry. Auth required.
   * @returns {Promise<{ values: string[], registry: object }>}
   */
  async getSymptomTypes() {
    await this.#permissionService.require('record:read');
    if (!this.#symptomService) throw new Error('[ApiGateway] SymptomService not wired');
    return this.#symptomService.getSymptomTypes();
  }

  /**
   * Return the Pain Type registry. Auth required.
   * @returns {Promise<{ values: string[], registry: object }>}
   */
  async getPainTypes() {
    await this.#permissionService.require('record:read');
    if (!this.#symptomService) throw new Error('[ApiGateway] SymptomService not wired');
    return this.#symptomService.getPainTypes();
  }

  // ── Operations Automation Admin API (PR-027) ─────────────────────────────

  /**
   * Return whether a new KPI snapshot is due and when the last one was captured.
   * Admin only.
   * @returns {Promise<{ due: boolean, lastCapturedAt: string|null }>}
   */
  async getSnapshotScheduleStatus() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#kpiSchedulerService) throw new Error('[ApiGateway] KpiSchedulerService not wired');
    return this.#kpiSchedulerService.getScheduleStatus();
  }

  /**
   * Retry all FAILED delivery queue entries by resetting them to PENDING.
   * Admin only.
   * @returns {Promise<{ retried: number, entries: object[] }>}
   */
  async retryFailedDeliveries() {
    await this.#permissionService.require('admin:dashboard');
    if (!this.#deliveryRetryService) throw new Error('[ApiGateway] DeliveryRetryService not wired');
    return this.#deliveryRetryService.retryFailed();
  }

  /**
   * Return the current Analytics migration status. Admin only.
   * Returns { status: 'legacy' } until AnalyticsService is fully migrated.
   * @returns {Promise<{ status: string }>}
   */
  async getAnalyticsStatus() {
    await this.#permissionService.require('admin:dashboard');
    const summary = this.#analyticsService?.getSummary() ?? null;
    return { status: summary !== null ? 'active' : 'legacy' };
  }

  /**
   * Retrieve similar cases for caseId.
   * Enforces two independent consent gates:
   *   Gate 1 — SimilarityAccessGuard: requester must own the case (unless admin)
   *   Gate 2 — Consent Double Gate: case must have consentLevel >= TIER2 minimum
   *
   * @param {string} caseId
   * @param {{ caseUserId: string, consentLevel: number }} opts
   * @returns {Promise<object[]>}
   */
  async getSimilarCases(caseId, { caseUserId, consentLevel } = {}) {
    const ctx = await this.#permissionService.require('similarity:read:own');

    // Gate 1 — ownership
    this.#similarityAccessGuard.assertAccess(caseUserId, ctx.userId, ctx.isAdmin);

    // Gate 2 — consent (TIER2 minimum, same rule as ConsentEnforcementService)
    this.#consentEnforcementService.validate({
      tier: 'TIER2',
      consentLevel: consentLevel ?? 0,
      caseId,
      userId: ctx.userId,
    });

    const results = await this.#similarityEngine.findSimilar(caseId);
    return this.#similarityAccessGuard.filterEdges(results, ctx.userId, ctx.isAdmin);
  }

  // ── Disease Intelligence API (PR-029) ────────────────────────────────────
  // IPPO-GOV-001: BD-004 (Wave1 foundation only), BD-007 (no DROP), BD-008 (4-layer)
  // Wave1: no Diagnosis Engine, no Recommendation, no Network Search, no AI.

  /**
   * Create a new disease entry. Auth required (record:read).
   * Validates against SSOT registries and checks for duplicates.
   * Wave1: in-memory only — not persisted across sessions.
   * @param {object} data
   * @returns {Promise<import('../domains/disease/disease-entity.js').DiseaseEntry>}
   */
  async createDisease(data) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseService) throw new Error('[ApiGateway] DiseaseService not wired');
    return this.#diseaseService.create(data);
  }

  /**
   * Return all disease entries. Auth required (record:read).
   * @returns {Promise<import('../domains/disease/disease-entity.js').DiseaseEntry[]>}
   */
  async getDiseases() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseService) throw new Error('[ApiGateway] DiseaseService not wired');
    return this.#diseaseService.list();
  }

  /**
   * Return active disease entries (active === true). Auth required (record:read).
   * @returns {Promise<import('../domains/disease/disease-entity.js').DiseaseEntry[]>}
   */
  async getActiveDiseases() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseService) throw new Error('[ApiGateway] DiseaseService not wired');
    return this.#diseaseService.findActive();
  }

  /**
   * Return resolved disease entries (active === false). Auth required (record:read).
   * @returns {Promise<import('../domains/disease/disease-entity.js').DiseaseEntry[]>}
   */
  async getResolvedDiseases() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseService) throw new Error('[ApiGateway] DiseaseService not wired');
    return this.#diseaseService.findResolved();
  }

  // ── Network Signal API (PR-030) ───────────────────────────────────────────
  // NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-01 / NAC-02.
  // BD-013: NetworkSignal SSOT is src/domains/network/network-signal-types.js.
  // Wave1: Signal collection only — no DiseaseCluster, Similarity, Longitudinal, AI, Recommendation.

  /**
   * Validate a NetworkSignal input against all SSOT registries. Auth required.
   * Returns { valid, errors }. Does NOT persist.
   * @param {object} data
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  async validateNetworkSignal(data) {
    await this.#permissionService.require('record:write');
    if (!this.#networkSignalService) throw new Error('[ApiGateway] NetworkSignalService not wired');
    return this.#networkSignalService.validateSignal(data);
  }

  /**
   * Create and store a new NetworkSignal. Auth required (record:read).
   * Wave1: in-memory only — not persisted across sessions.
   * @param {object} data
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal>}
   */
  async createNetworkSignal(data) {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalService) throw new Error('[ApiGateway] NetworkSignalService not wired');
    return this.#networkSignalService.createSignal(data);
  }

  /**
   * Return all stored NetworkSignals. Auth required (record:read).
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal[]>}
   */
  async getNetworkSignals() {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalService) throw new Error('[ApiGateway] NetworkSignalService not wired');
    return this.#networkSignalService.listSignals();
  }

  /**
   * Return NetworkSignals associated with a specific record. Auth required (record:read).
   * @param {string} recordId
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal[]>}
   */
  async getSignalsByRecord(recordId) {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalService) throw new Error('[ApiGateway] NetworkSignalService not wired');
    return this.#networkSignalService.listByRecord(recordId);
  }

  /**
   * Return NetworkSignals of a specific type. Auth required (record:read).
   * @param {string} signalType
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal[]>}
   */
  async getSignalsByType(signalType) {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalService) throw new Error('[ApiGateway] NetworkSignalService not wired');
    return this.#networkSignalService.listByType(signalType);
  }

  // ── Signal Intelligence (PR-031) ─────────────────────────────────────────────

  /** Aggregate all signals. Auth required (record:read). */
  async getSignalAggregation() {
    await this.#permissionService.require('record:read');
    if (!this.#signalAggregationService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] SignalAggregationService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#signalAggregationService.aggregate(signals);
  }

  /** Return trend for a specific signalType. Auth required (record:read). */
  async getSignalTrend(signalType) {
    await this.#permissionService.require('record:read');
    if (!this.#signalTrendService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] SignalTrendService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#signalTrendService.trend(signals, signalType);
  }

  /** Return chronological timeline of signals. Auth required (record:read). */
  async getSignalTimeline() {
    await this.#permissionService.require('record:read');
    if (!this.#signalTimelineService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] SignalTimelineService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#signalTimelineService.buildTimeline(signals);
  }

  /** Return Wave1 summary of all signals. Auth required (record:read). */
  async getSignalSummary() {
    await this.#permissionService.require('record:read');
    if (!this.#signalSummaryService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] SignalSummaryService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#signalSummaryService.summarize(signals);
  }

  // ── Longitudinal (PR-032) ─────────────────────────────────────────────────

  /** Return longitudinal summary (baseline + movingAverage + trend + window). Auth: record:read. */
  async getLongitudinalSummary(options = {}) {
    await this.#permissionService.require('record:read');
    if (!this.#longitudinalSummaryService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] LongitudinalSummaryService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#longitudinalSummaryService.summarize(signals, options);
  }

  /** Return baseline statistics for a signalType. Auth: record:read. */
  async getBaseline(signalType) {
    await this.#permissionService.require('record:read');
    if (!this.#baselineService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] BaselineService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#baselineService.compute(signals, signalType);
  }

  /** Return moving average for a signalType and window. Auth: record:read. */
  async getMovingAverage(signalType, days, referenceDate) {
    await this.#permissionService.require('record:read');
    if (!this.#movingAverageService || !this.#networkSignalService) {
      throw new Error('[ApiGateway] MovingAverageService not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#movingAverageService.compute(signals, signalType, days, referenceDate);
  }

  /** Return a trend window (Last7 or Last30). Auth: record:read. */
  async getTrendWindow(days, referenceDate) {
    await this.#permissionService.require('record:read');
    if (!this.#trendWindowBuilder || !this.#networkSignalService) {
      throw new Error('[ApiGateway] TrendWindowBuilder not wired');
    }
    const signals = this.#networkSignalService.listSignals();
    return this.#trendWindowBuilder.build(signals, days, referenceDate);
  }

  // ── Disease Cluster API (PR-034) ─────────────────────────────────────────────
  // BD-009: Wave1 — cluster keys identical to diseaseKey.
  // BD-022: No Supabase — in-memory only.
  // Wave2 roadmap: DiseaseCluster → Signal Statistics → Similarity → Research Dataset → AI

  /**
   * Create a new DiseaseCluster. Auth required (record:read).
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createDiseaseCluster(data) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterService) throw new Error('[ApiGateway] DiseaseClusterService not wired');
    return this.#diseaseClusterService.createCluster(data);
  }

  /**
   * Return all disease clusters. Auth required (record:read).
   * @returns {Promise<object[]>}
   */
  async getDiseaseClusters() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterService) throw new Error('[ApiGateway] DiseaseClusterService not wired');
    return this.#diseaseClusterService.getClusters();
  }

  /**
   * Return cluster statistics (count-based, Wave1). Auth required (record:read).
   * @returns {Promise<object>}
   */
  async getClusterStatistics() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterService) throw new Error('[ApiGateway] DiseaseClusterService not wired');
    return this.#diseaseClusterService.getClusterStatistics();
  }

  /**
   * Find a cluster by clusterKey. Auth required (record:read).
   * @param {string} clusterKey
   * @returns {Promise<object|null>}
   */
  async findDiseaseCluster(clusterKey) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterService) throw new Error('[ApiGateway] DiseaseClusterService not wired');
    return this.#diseaseClusterService.findCluster(clusterKey);
  }

  /**
   * Return the static Signal → DiseaseCategory mapping. Auth required (record:read).
   * @returns {Promise<object>}
   */
  async getDiseaseSignalMapping() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseSignalMapper) throw new Error('[ApiGateway] DiseaseSignalMapper not wired');
    return this.#diseaseSignalMapper.getFullMapping();
  }

  // ── Snapshot API (PR-035) ────────────────────────────────────────────────────
  // BD-018: ALL snapshots carry generatedAt + vectorVersion.
  // BD-022: Wave1 in-memory only — no Supabase.
  // Append Only — DELETE forbidden on permanent assets.

  /**
   * Create a signal snapshot from current signals. Auth required (record:read).
   * @param {object[]} signals
   * @param {string}   [schedule] - DAILY | WEEKLY | MANUAL
   * @returns {Promise<Readonly<object>>}
   */
  async createSignalSnapshot(signals, schedule) {
    await this.#permissionService.require('record:read');
    if (!this.#signalSnapshotService) throw new Error('[ApiGateway] SignalSnapshotService not wired');
    return this.#signalSnapshotService.createSnapshot(signals, schedule);
  }

  /**
   * Return all signal snapshots. Auth required (record:read).
   * @returns {Promise<Readonly<object>[]>}
   */
  async getSignalSnapshots() {
    await this.#permissionService.require('record:read');
    if (!this.#signalSnapshotService) throw new Error('[ApiGateway] SignalSnapshotService not wired');
    return this.#signalSnapshotService.getSnapshots();
  }

  /**
   * Create a longitudinal snapshot. Auth required (record:read).
   * @param {object[]} signals
   * @param {object}   [options]
   * @returns {Promise<Readonly<object>>}
   */
  async createLongitudinalSnapshot(signals, options) {
    await this.#permissionService.require('record:read');
    if (!this.#longitudinalSnapshotService) throw new Error('[ApiGateway] LongitudinalSnapshotService not wired');
    return this.#longitudinalSnapshotService.createLongitudinalSnapshot(signals, options);
  }

  /**
   * Return all longitudinal snapshots. Auth required (record:read).
   * @returns {Promise<Readonly<object>[]>}
   */
  async getLongitudinalSnapshots() {
    await this.#permissionService.require('record:read');
    if (!this.#longitudinalSnapshotService) throw new Error('[ApiGateway] LongitudinalSnapshotService not wired');
    return this.#longitudinalSnapshotService.getLongitudinalSnapshots();
  }

  /**
   * Create a disease snapshot. Auth required (record:read).
   * @param {object} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async createDiseaseSnapshot(options) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseSnapshotService) throw new Error('[ApiGateway] DiseaseSnapshotService not wired');
    return this.#diseaseSnapshotService.createDiseaseSnapshot(options);
  }

  /**
   * Return all disease snapshots. Auth required (record:read).
   * @returns {Promise<Readonly<object>[]>}
   */
  async getDiseaseSnapshots() {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseSnapshotService) throw new Error('[ApiGateway] DiseaseSnapshotService not wired');
    return this.#diseaseSnapshotService.getDiseaseSnapshots();
  }

  // ── Event Sourcing API (PR-037) ───────────────────────────────────────────────
  // BD-015: Replay guarantees Record → Signal → Layer deterministic reconstruction.
  // BD-018: occurredAt on every event. BD-019: audit trail. BD-021: no deletion.
  // Note: publishEvent / getEvents / getEventsByType / getEventsByAggregate → record:read
  //       replayEvents / getAuditTimeline → admin:dashboard (admin-only)

  /**
   * Publish a DomainEvent. Auth required (record:read).
   * @param {Readonly<object>} event  — pre-built DomainEvent entity
   * @returns {Promise<Readonly<object>>}
   */
  async publishEvent(event) {
    await this.#permissionService.require('record:read');
    if (!this.#eventPublisher) throw new Error('[ApiGateway] EventPublisher not wired');
    this.#eventPublisher.publish(event);
    return event;
  }

  /**
   * Return all stored DomainEvents. Auth required (record:read).
   * @param {{ from?: string, to?: string }} [options]
   * @returns {Promise<Readonly<object>[]>}
   */
  async getEvents(options = {}) {
    await this.#permissionService.require('record:read');
    if (!this.#eventPublisher) throw new Error('[ApiGateway] EventPublisher not wired');
    return this.#eventPublisher.store.getEvents(options);
  }

  /**
   * Return events filtered by type. Auth required (record:read).
   * @param {string} eventType
   * @returns {Promise<Readonly<object>[]>}
   */
  async getEventsByType(eventType) {
    await this.#permissionService.require('record:read');
    if (!this.#eventPublisher) throw new Error('[ApiGateway] EventPublisher not wired');
    return this.#eventPublisher.store.getByType(eventType);
  }

  /**
   * Return events for an aggregate. Auth required (record:read).
   * @param {string} aggregateId
   * @returns {Promise<Readonly<object>[]>}
   */
  async getEventsByAggregate(aggregateId) {
    await this.#permissionService.require('record:read');
    if (!this.#eventPublisher) throw new Error('[ApiGateway] EventPublisher not wired');
    return this.#eventPublisher.store.getByAggregate(aggregateId);
  }

  /**
   * Replay events and rebuild state. Auth required (admin:dashboard).
   * @param {{ from?: string, to?: string }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async replayEvents(options = {}) {
    const ctx = await this.#permissionService.require('admin:dashboard');
    if (!ctx.isAdmin) throw new Error('[ApiGateway] replayEvents requires admin');
    if (!this.#eventReplayService) throw new Error('[ApiGateway] EventReplayService not wired');
    return this.#eventReplayService.replay(options);
  }

  /**
   * Return audit timeline across all event categories. Auth required (admin:dashboard).
   * @param {{ from?: string, to?: string, limit?: number }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async getAuditTimeline(options = {}) {
    const ctx = await this.#permissionService.require('admin:dashboard');
    if (!ctx.isAdmin) throw new Error('[ApiGateway] getAuditTimeline requires admin');
    if (!this.#auditTimelineService) throw new Error('[ApiGateway] AuditTimelineService not wired');
    return this.#auditTimelineService.getAuditTimeline(options);
  }

  // ── Similarity Intelligence API (PR-036) ─────────────────────────────────────
  // BD-009: DiseaseCluster integration (Wave2 full annotation).
  // BD-010/BD-011: vectorVersion on every FeatureVector.
  // BD-018: generatedAt on every vector / summary.
  // BD-022: Wave1 in-memory only.

  /**
   * Build and persist a 12-dim FeatureVector for the current user. Auth: record:read.
   * @param {{ signals?: object[], diseases?: object[], longitudinalSummary?: object, snapshot?: object }} params
   * @returns {Promise<Readonly<object>>}
   */
  async buildFeatureVector(params = {}) {
    const ctx = await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.buildVector({ userId: ctx.userId, ...params });
  }

  /**
   * Return all persisted FeatureVectors for the current user. Auth: record:read.
   * @returns {Promise<Readonly<object>[]>}
   */
  async getFeatureVectors() {
    const ctx = await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.getVectorsForUser(ctx.userId);
  }

  /**
   * Calculate cosine similarity between two FeatureVectors. Auth: record:read.
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {Promise<Readonly<object>>}
   */
  async calculateSimilarity(vecA, vecB) {
    await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.calculate(vecA, vecB);
  }

  /**
   * Compare two users' latest FeatureVectors. Auth: record:read.
   * @param {string} userId1
   * @param {string} userId2
   * @returns {Promise<Readonly<object>|null>}
   */
  async compareUsers(userId1, userId2) {
    await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.compareUsers(userId1, userId2);
  }

  /**
   * Find top-N most similar users for the current user. Auth: record:read.
   * @param {number} [topN=5]
   * @returns {Promise<Readonly<object>[]>}
   */
  async findTopMatches(topN = 5) {
    const ctx = await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.findTopMatches(ctx.userId, topN);
  }

  /**
   * Return similarity summary for the current user. Auth: record:read.
   * @returns {Promise<Readonly<object>>}
   */
  async getSimilaritySummary() {
    const ctx = await this.#permissionService.require('record:read');
    if (!this.#signalSimilarityService) throw new Error('[ApiGateway] SignalSimilarityService not wired');
    return this.#signalSimilarityService.getSimilaritySummary(ctx.userId);
  }

  // ── Persistent Signal API (PR-033) ──────────────────────────────────────────
  // BD-022: Storage abstraction only — Supabase is Wave2.
  // BD-016: Callers must not bypass PersistentNetworkSignalService.
  // BD-015: Signals are re-constructible from Records via SignalReconstructionService.

  /**
   * Persist multiple NetworkSignals to the storage layer. Auth required (record:read).
   * @param {import('../domains/network/network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal[]>}
   */
  async saveNetworkSignals(signals) {
    await this.#permissionService.require('record:read');
    if (!this.#persistentNetworkSignalService) throw new Error('[ApiGateway] PersistentNetworkSignalService not wired');
    return this.#persistentNetworkSignalService.saveMany(signals);
  }

  /**
   * Return all persisted NetworkSignals from the storage layer. Auth required (record:read).
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal[]>}
   */
  async getPersistentSignals() {
    await this.#permissionService.require('record:read');
    if (!this.#persistentNetworkSignalService) throw new Error('[ApiGateway] PersistentNetworkSignalService not wired');
    return this.#persistentNetworkSignalService.findAll();
  }

  /**
   * Return current persistence status (BD-022 compliance info). Auth required (record:read).
   * @returns {Promise<object>}
   */
  async getPersistenceStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#persistentNetworkSignalService) throw new Error('[ApiGateway] PersistentNetworkSignalService not wired');
    return this.#persistentNetworkSignalService.getPersistenceStatus();
  }

  /**
   * Verify integrity of signals against BD-015 (reconstruct from Record). Auth required (record:read).
   * Wave1 Stub — always returns verified:true.
   * @param {object[]} [signals]
   * @returns {Promise<object>}
   */
  async verifySignalIntegrity(signals = []) {
    await this.#permissionService.require('record:read');
    if (!this.#signalReconstructionService) throw new Error('[ApiGateway] SignalReconstructionService not wired');
    return this.#signalReconstructionService.verifyIntegrity(signals);
  }

  /**
   * Rebuild signals from Layer 1 Records (BD-015). Auth required (record:read).
   * Wave1 Stub — returns empty result with compliance note.
   * @param {object[]} [records]
   * @returns {Promise<object>}
   */
  async rebuildSignals(records = []) {
    await this.#permissionService.require('record:read');
    if (!this.#signalReconstructionService) throw new Error('[ApiGateway] SignalReconstructionService not wired');
    return this.#signalReconstructionService.rebuildSignals(records);
  }
}
