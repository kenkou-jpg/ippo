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
  // PR-038
  #emotionService;
  // PR-039
  #menstrualService;
  // PR-040
  #researchDatasetService;
  #datasetExportService;
  #anonymizationService;
  // PR-041
  #networkSignalPersistenceServiceV2;
  // PR-043
  #emotionSignalGenerator;
  // PR-044
  #menstrualPhaseResolver;
  // PR-045
  #diseaseEntityUpgradeService;
  // PR-046
  #diseaseClusterStatisticsService;
  // PR-047
  #featureVectorV2Service;
  // PR-048
  #longitudinalEdgeEnricher;
  // PR-049
  #environmentalSignalCollector;
  #environmentalSignalSnapshotService;
  // PR-050
  #signalIntelligenceV2Service;
  // PR-051
  #knowledgeGraphService;
  // PR-052
  #knowledgeGraphBuilder;
  // PR-053
  #featureStoreService;
  // PR-054
  #cohortBuilderService;
  // PR-055
  #datasetVersionService;
  // PR-056
  #evidenceLayerService;
  // PR-057
  #signalInsightService;
  // PR-058
  #patternDiscoveryService;
  // PR-059
  #caseRecommendationService;
  // PR-060
  #similarCaseSearchService;
  // PR-061
  #researchAssistanceService;
  // PR-062
  #aiSafetyValidator;
  // PR-063
  #similarityEngineV2;

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
    // PR-038
    emotionService       = null,
    // PR-039
    menstrualService     = null,
    // PR-040
    researchDatasetService = null,
    datasetExportService   = null,
    anonymizationService   = null,
    // PR-041
    networkSignalPersistenceServiceV2 = null,
    // PR-043
    emotionSignalGenerator = null,
    // PR-044
    menstrualPhaseResolver = null,
    // PR-045
    diseaseEntityUpgradeService = null,
    // PR-046
    diseaseClusterStatisticsService = null,
    // PR-047
    featureVectorV2Service = null,
    // PR-048
    longitudinalEdgeEnricher = null,
    // PR-049
    environmentalSignalCollector       = null,
    environmentalSignalSnapshotService = null,
    // PR-050
    signalIntelligenceV2Service = null,
    // PR-051
    knowledgeGraphService = null,
    // PR-052
    knowledgeGraphBuilder = null,
    // PR-053
    featureStoreService = null,
    // PR-054
    cohortBuilderService = null,
    // PR-055
    datasetVersionService = null,
    // PR-056
    evidenceLayerService = null,
    // PR-057
    signalInsightService = null,
    // PR-058
    patternDiscoveryService = null,
    // PR-059
    caseRecommendationService = null,
    // PR-060
    similarCaseSearchService = null,
    // PR-061
    researchAssistanceService = null,
    // PR-062
    aiSafetyValidator = null,
    // PR-063
    similarityEngineV2 = null,
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
    // PR-038
    this.#emotionService       = emotionService;
    // PR-039
    this.#menstrualService     = menstrualService;
    // PR-040
    this.#researchDatasetService = researchDatasetService;
    this.#datasetExportService   = datasetExportService;
    this.#anonymizationService   = anonymizationService;
    // PR-041
    this.#networkSignalPersistenceServiceV2 = networkSignalPersistenceServiceV2;
    // PR-043
    this.#emotionSignalGenerator = emotionSignalGenerator;
    // PR-044
    this.#menstrualPhaseResolver = menstrualPhaseResolver;
    // PR-045
    this.#diseaseEntityUpgradeService = diseaseEntityUpgradeService;
    // PR-046
    this.#diseaseClusterStatisticsService = diseaseClusterStatisticsService;
    // PR-047
    this.#featureVectorV2Service = featureVectorV2Service;
    // PR-048
    this.#longitudinalEdgeEnricher = longitudinalEdgeEnricher;
    // PR-049
    this.#environmentalSignalCollector       = environmentalSignalCollector;
    this.#environmentalSignalSnapshotService = environmentalSignalSnapshotService;
    // PR-050
    this.#signalIntelligenceV2Service = signalIntelligenceV2Service;
    // PR-051
    this.#knowledgeGraphService = knowledgeGraphService;
    // PR-052
    this.#knowledgeGraphBuilder = knowledgeGraphBuilder;
    // PR-053
    this.#featureStoreService = featureStoreService;
    // PR-054
    this.#cohortBuilderService = cohortBuilderService;
    // PR-055
    this.#datasetVersionService = datasetVersionService;
    // PR-056
    this.#evidenceLayerService = evidenceLayerService;
    // PR-057
    this.#signalInsightService = signalInsightService;
    // PR-058
    this.#patternDiscoveryService = patternDiscoveryService;
    // PR-059
    this.#caseRecommendationService = caseRecommendationService;
    // PR-060
    this.#similarCaseSearchService = similarCaseSearchService;
    // PR-061
    this.#researchAssistanceService = researchAssistanceService;
    // PR-062
    this.#aiSafetyValidator = aiSafetyValidator;
    // PR-063
    this.#similarityEngineV2 = similarityEngineV2;
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

    // PR-044: resolve MenstrualPhase before Signal generation (BD-014).
    // Pure deterministic rule — no AI/LLM/randomness (BD-031 / BD-038).
    const savedRecord = record ?? data;
    const resolvedPhase = this.#menstrualPhaseResolver
      ? this.#menstrualPhaseResolver.resolveFromRecord(savedRecord)
      : null;

    // PR-030: generate NetworkSignals from record data (Signal generation point only)
    // No Similarity, DiseaseCluster, Longitudinal, or FeatureVector triggered here.
    this.#networkSignalService?.generateFromRecord(
      savedRecord,
      resolvedPhase ? { menstrualPhase: resolvedPhase } : {},
    );

    // PR-044: publish MENSTRUAL_PHASE_RESOLVED if phase was resolved and record has menstrualFlow.
    if (resolvedPhase && savedRecord.menstrualFlow != null && this.#eventPublisher) {
      try {
        const { buildDomainEvent }      = await import('../domains/events/domain-event-entity.js');
        const { DOMAIN_EVENT_TYPES, AGGREGATE_TYPES } = await import('../domains/events/domain-event-types.js');
        const event = buildDomainEvent({
          eventType:     DOMAIN_EVENT_TYPES.MENSTRUAL_PHASE_RESOLVED,
          aggregateType: AGGREGATE_TYPES.SIGNAL,
          aggregateId:   savedRecord.id ?? savedRecord.recordId ?? 'unknown',
          payload:       Object.freeze({
            recordId:    savedRecord.id ?? savedRecord.recordId ?? null,
            cycleDay:    savedRecord.cycleDay ?? null,
            cycleLength: savedRecord.cycleLength ?? null,
            phase:       resolvedPhase,
            resolvedAt:  new Date().toISOString(),
          }),
        });
        this.#eventPublisher.publish(event);
      } catch {
        // Event publishing is best-effort; record save already succeeded.
      }
    }

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

  // ── Disease Entity V2 Upgrade (PR-045) ───────────────────────────────────
  // BD-004: Disease Entity昇格 (Wave2). BD-035: diseaseKey backward compat.
  // BD-032: Append-Only — upgrade returns a NEW entity; existing entries unchanged.

  /**
   * Upgrade a DiseaseEntry to full V2 structure (icdCode / confirmedBy / relatedSymptoms).
   * Returns the upgraded entity. Does NOT persist — caller must re-register if needed.
   * Publishes DISEASE_ENTITY_UPGRADED DomainEvent.
   *
   * @param {object} entry          Existing DiseaseEntry
   * @param {{
   *   icdCode?:         string|null,
   *   confirmedBy?:     string,
   *   relatedSymptoms?: string[],
   * }} upgradeParams
   * @returns {Promise<Readonly<object>>}
   */
  async upgradeDiseaseEntity(entry, upgradeParams = {}) {
    await this.#permissionService.require('record:write');
    if (!this.#diseaseEntityUpgradeService)
      throw new Error('[ApiGateway] DiseaseEntityUpgradeService not wired');
    return this.#diseaseEntityUpgradeService.upgrade(entry, upgradeParams);
  }

  // ── Disease Cluster Statistics API (PR-046) ──────────────────────────────
  // BD-009: clusterId === diseaseKey. BD-028: caseCount < 5 → not publishable.
  // BD-018: snapshots carry generatedAt. BD-032: Append-Only snapshots.

  /**
   * Compute statistical profile for a disease cluster from NetworkSignals.
   * BD-028: caller must not surface results to users when caseCount < 5.
   *
   * @param {string}   clusterId  Disease cluster key (= diseaseKey, BD-009)
   * @param {object[]} signals    NetworkSignal array pre-filtered for this cluster
   */
  async computeClusterProfile(clusterId, signals = []) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterStatisticsService)
      throw new Error('[ApiGateway] DiseaseClusterStatisticsService not wired');
    return this.#diseaseClusterStatisticsService.computeClusterProfile(clusterId, signals);
  }

  /**
   * Create a DiseaseClusterSnapshot (BD-018 — includes generatedAt).
   * BD-028: do not publish snapshot if profile.caseCount < 5.
   *
   * @param {string}   clusterId
   * @param {object[]} signals
   * @param {{ schedule?: 'weekly' | 'daily' }} options
   */
  async createClusterSnapshot(clusterId, signals = [], options = {}) {
    await this.#permissionService.require('record:write');
    if (!this.#diseaseClusterStatisticsService)
      throw new Error('[ApiGateway] DiseaseClusterStatisticsService not wired');
    return this.#diseaseClusterStatisticsService.createClusterSnapshot(clusterId, signals, options);
  }

  /**
   * Rank a specific case within its cluster.
   *
   * @param {string}   caseId
   * @param {string}   clusterId
   * @param {object[]} caseSignals         NetworkSignals for this case only
   * @param {object[]} allClusterSignals   All signals in the cluster
   */
  async getCaseRankInCluster(caseId, clusterId, caseSignals = [], allClusterSignals = []) {
    await this.#permissionService.require('record:read');
    if (!this.#diseaseClusterStatisticsService)
      throw new Error('[ApiGateway] DiseaseClusterStatisticsService not wired');
    return this.#diseaseClusterStatisticsService.getCaseRankInCluster(
      caseId, clusterId, caseSignals, allClusterSignals,
    );
  }

  // ── FeatureVector V2 API (PR-047) ────────────────────────────────────────
  // BD-010: vectorVersion='2'. BD-035: 12-dimensional.
  // BD-042: V1 and V2 edges must NOT be mixed — V2Service rejects V1 vectors at repository level.

  /**
   * Build and persist a V2 FeatureVector (12-dim) from candidate + signals + longitudinal.
   * BD-042: output vectorVersion='2' only — never mixed with V1.
   *
   * @param {{
   *   userId:               string,
   *   caseId?:              string,
   *   diseaseKey?:          string,
   *   candidate?:           object,   SimilarityCandidate
   *   signals?:             object[], NetworkSignal[]
   *   longitudinalSummary?: object,
   *   metadata?:            object,
   * }} params
   */
  async buildFeatureVectorV2(params) {
    await this.#permissionService.require('record:write');
    if (!this.#featureVectorV2Service)
      throw new Error('[ApiGateway] FeatureVectorV2Service not wired');
    return this.#featureVectorV2Service.buildAndSave(params);
  }

  /** Return all V2 FeatureVectors. */
  async getFeatureVectorsV2() {
    await this.#permissionService.require('record:read');
    if (!this.#featureVectorV2Service)
      throw new Error('[ApiGateway] FeatureVectorV2Service not wired');
    return this.#featureVectorV2Service.getAll();
  }

  /** Return latest V2 FeatureVector for userId, or null. */
  async getLatestFeatureVectorV2(userId) {
    await this.#permissionService.require('record:read');
    if (!this.#featureVectorV2Service)
      throw new Error('[ApiGateway] FeatureVectorV2Service not wired');
    return this.#featureVectorV2Service.getLatestForUser(userId);
  }

  /** Return V2 statistics (dimension count, version, compliance flags). */
  async getFeatureVectorV2Statistics() {
    await this.#permissionService.require('record:read');
    if (!this.#featureVectorV2Service)
      throw new Error('[ApiGateway] FeatureVectorV2Service not wired');
    return this.#featureVectorV2Service.getStatistics();
  }

  // ── Longitudinal Edge Enricher API (PR-048) ──────────────────────────────
  // BD-012: Longitudinal Context 付与は Wave2 スコープ — now active.
  // BD-032: enrich() は NEW frozen edge を返す — 元の edge は変更しない.
  // rawScore = threshold 判定用（EdgeGenerator が設定）/ displayScore のみ trendBonus を加算.

  /**
   * Enrich a single SimilarityEdge with longitudinalContext.
   * rawScore threshold は変更しない。displayScore = rawScore + trendBonus (BD-012).
   *
   * @param {{
   *   edge:           object,   SimilarityEdge
   *   sourceSignals?: object[], NetworkSignal[] for source case
   *   targetSignals?: object[], NetworkSignal[] for target case
   *   refDate?:       Date,
   * }} params
   */
  async enrichSimilarityEdge(params) {
    await this.#permissionService.require('record:read');
    if (!this.#longitudinalEdgeEnricher)
      throw new Error('[ApiGateway] LongitudinalEdgeEnricher not wired');
    return this.#longitudinalEdgeEnricher.enrich(params);
  }

  /**
   * Enrich multiple SimilarityEdges with longitudinalContext.
   * @param {Array<{ edge: object, sourceSignals?: object[], targetSignals?: object[], refDate?: Date }>} entries
   */
  async enrichSimilarityEdges(entries = []) {
    await this.#permissionService.require('record:read');
    if (!this.#longitudinalEdgeEnricher)
      throw new Error('[ApiGateway] LongitudinalEdgeEnricher not wired');
    return this.#longitudinalEdgeEnricher.enrichAll(entries);
  }

  // ── Similarity Engine V2 API (PR-063) ─────────────────────────────────────
  // BD-042: input vectors must ALL be vectorVersion='2' — mixing with V1 throws.
  // BD-001: existing V1 edges are never touched; V2 edges are additive rows.

  /**
   * Run the V2 similarity pipeline over an array of FeatureVector V2 entities.
   * Persists generated V2 edges to the same similarity_edges store as V1.
   * BD-042: throws if any input vector is not vectorVersion='2'.
   *
   * @param {Readonly<object>[]} vectors  FeatureVector V2 entities
   * @returns {Promise<Readonly<object>>} run result (edges, pairsEvaluated, networkDensity, ...)
   */
  async runSimilarityV2(vectors) {
    await this.#permissionService.require('record:read');
    if (!this.#similarityEngineV2)
      throw new Error('[ApiGateway] SimilarityEngineV2 not wired');
    return this.#similarityEngineV2.run(vectors);
  }

  /**
   * Compute cosine similarity between two FeatureVector V2 entities (no persistence).
   * BD-042: throws if either vector is not vectorVersion='2'.
   *
   * @param {Readonly<object>} vecA
   * @param {Readonly<object>} vecB
   * @returns {Promise<Readonly<object>>} { score, sameDiseaseKey, vectorVersion }
   */
  async computeSimilarityV2(vecA, vecB) {
    await this.#permissionService.require('record:read');
    if (!this.#similarityEngineV2)
      throw new Error('[ApiGateway] SimilarityEngineV2 not wired');
    return this.#similarityEngineV2.computeSimilarity(vecA, vecB);
  }

  /** @returns {Promise<{ threshold: number, vectorVersion: string, bd042Compliant: boolean }>} */
  async getSimilarityV2Status() {
    await this.#permissionService.require('record:read');
    if (!this.#similarityEngineV2)
      throw new Error('[ApiGateway] SimilarityEngineV2 not wired');
    return Object.freeze({
      threshold:      this.#similarityEngineV2.threshold,
      vectorVersion:  '2',
      bd001Compliant: true,
      bd042Compliant: true,
    });
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

  // ── Wave2 NetworkSignal Repository V2 API (PR-041) ─────────────────────────────
  // BD-022: Repository Interface complete — Supabase swap in PR-042.
  // BD-015: SIGNAL_CREATED events published via EventPublisher on every append.
  // AP-02: Append-Only guaranteed by INetworkSignalRepository contract.

  /**
   * Return the Wave2 persistence status for NetworkSignal.
   * Reports repository type, capabilities, signal count, and BD-022 compliance state.
   * Auth required (record:read).
   * @returns {Promise<object>}
   */
  async getSignalPersistenceStatusV2() {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalPersistenceServiceV2) {
      throw new Error('[ApiGateway] NetworkSignalPersistenceServiceV2 not wired');
    }
    return this.#networkSignalPersistenceServiceV2.getStatus();
  }

  /**
   * Append a pre-built NetworkSignal to the Wave2 repository and publish SIGNAL_CREATED event.
   * Used internally by createNetworkSignal; also exposed for orchestration workflows.
   * Auth required (record:read).
   * @param {import('../domains/network/network-signal-entity.js').NetworkSignal} signal
   * @returns {Promise<import('../domains/network/network-signal-entity.js').NetworkSignal>}
   */
  async persistSignalV2(signal) {
    await this.#permissionService.require('record:read');
    if (!this.#networkSignalPersistenceServiceV2) {
      throw new Error('[ApiGateway] NetworkSignalPersistenceServiceV2 not wired');
    }
    return this.#networkSignalPersistenceServiceV2.append(signal);
  }

  // ── Emotion Signal Generation API (PR-043) ──────────────────────────────────
  // BD-024: Emotion Signal auto-generation from Record (Wave2 active).
  // BD-031: Rule-based only — no AI, no LLM, no diagnosis.
  // BD-022: Signals appended via NetworkSignalPersistenceService (Supabase-backed).

  /**
   * Generate Emotion Signals from a Record using the deterministic Rule Engine.
   * Applies Mood / Fatigue / Stress / Motivation rules.
   * Each matching rule produces one EMOTION-type NetworkSignal persisted via V2 service.
   * Auth required (record:write).
   *
   * @param {object} record  The record to process.
   * @param {{ menstrualPhase?: string }} options
   * @returns {Promise<Readonly<object>[]>}  Generated signals (may be empty).
   */
  async generateEmotionSignals(record, options = {}) {
    await this.#permissionService.require('record:write');
    if (!this.#emotionSignalGenerator) {
      throw new Error('[ApiGateway] EmotionSignalGenerator not wired');
    }
    return this.#emotionSignalGenerator.generate(record, options);
  }

  /**
   * Initialize a user session after successful authentication.
   * Triggers warmCache() asynchronously — the UI is never blocked.
   * Auth required (record:read).
   *
   * @returns {Promise<{ sessionId: string, warmedAsync: boolean }>}
   */
  async initializeSession() {
    await this.#permissionService.require('record:read');
    const sessionId = `session_${Date.now()}`;
    // Fire-and-forget: UI must not wait on cache warming (BD-022 / Supabase latency).
    this.#warmCache().catch(() => {
      // Best-effort: warmCache failure must not surface to UI.
    });
    return { sessionId, warmedAsync: true };
  }

  /**
   * Warm internal caches after authentication.
   * Called asynchronously from initializeSession() — never blocks UI.
   * Ensures NetworkSignalPersistenceServiceV2 is initialized so the first
   * generateEmotionSignals() call has no cold-start overhead.
   *
   * @returns {Promise<{ warmed: string[] }>}
   */
  async #warmCache() {
    const warmed = [];
    if (this.#networkSignalPersistenceServiceV2) {
      // Trigger initialization if not already done (idempotent).
      if (typeof this.#networkSignalPersistenceServiceV2.initialize === 'function') {
        this.#networkSignalPersistenceServiceV2.initialize();
      }
      warmed.push('NetworkSignalPersistenceServiceV2');
    }
    if (this.#emotionSignalGenerator) {
      warmed.push('EmotionSignalGenerator');
    }
    return { warmed };
  }

  // ── Emotion API (PR-038) ─────────────────────────────────────────────────────
  // BD-005: Emotion is a Research Asset managed under LEGACY_ASSET_INVENTORY.
  // NAC-01: Emotion maps to SIGNAL_TYPES.EMOTION in NetworkSignal schema.
  // BD-015: EmotionCreated events are replayable via EventStore.
  // BD-022: Wave1 in-memory only.

  /**
   * Validate an Emotion input without persisting. Auth required (record:read).
   * @param {object} data
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  async validateEmotion(data) {
    await this.#permissionService.require('record:read');
    if (!this.#emotionService) throw new Error('[ApiGateway] EmotionService not wired');
    const { validateEmotion: validate } = await import('../domains/emotion/emotion-validator.js');
    return validate(data);
  }

  /**
   * Create and persist a new Emotion. Auth required (record:read).
   * @param {object} params
   * @returns {Promise<Readonly<object>>}
   */
  async createEmotion(params) {
    await this.#permissionService.require('record:read');
    if (!this.#emotionService) throw new Error('[ApiGateway] EmotionService not wired');
    return this.#emotionService.create(params);
  }

  /**
   * Return all stored Emotions. Auth required (record:read).
   * @returns {Promise<Readonly<object>[]>}
   */
  async getEmotions() {
    await this.#permissionService.require('record:read');
    if (!this.#emotionService) throw new Error('[ApiGateway] EmotionService not wired');
    return this.#emotionService.list();
  }

  /**
   * Return aggregate Emotion statistics (BD-018: includes generatedAt). Auth: record:read.
   * @returns {Promise<Readonly<object>>}
   */
  async getEmotionStatistics() {
    await this.#permissionService.require('record:read');
    if (!this.#emotionService) throw new Error('[ApiGateway] EmotionService not wired');
    return this.#emotionService.getEmotionStatistics();
  }

  /**
   * Convert all stored Emotions to NetworkSignals (SIGNAL_TYPES.EMOTION). Auth: record:read.
   * @returns {Promise<Readonly<object>[]>}
   */
  async convertEmotionSignals() {
    await this.#permissionService.require('record:read');
    if (!this.#emotionService) throw new Error('[ApiGateway] EmotionService not wired');
    return this.#emotionService.toNetworkSignals();
  }

  // ── Menstrual Intelligence API (PR-039) ──────────────────────────────────────
  // BD-003/BD-005: Menstrual is a core health + Research Asset.
  // NAC-01: MENSTRUAL signal type; NAC-04: Longitudinal cycle integration.
  // BD-015: MENSTRUAL_RECORDED events are replayable.
  // BD-022: Wave1 in-memory only.

  /**
   * Validate Menstrual input without persisting. Auth: record:read.
   * @param {object} data
   * @returns {Promise<{ valid: boolean, errors: string[] }>}
   */
  async validateMenstrual(data) {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    const { validateMenstrual: validate } = await import('../domains/menstrual/menstrual-validator.js');
    return validate(data);
  }

  /**
   * Create and persist a MenstrualRecord. Auth: record:read.
   * @param {object} params
   * @returns {Promise<Readonly<object>>}
   */
  async createMenstrualRecord(params) {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    return this.#menstrualService.create(params);
  }

  /**
   * Return all stored MenstrualRecords. Auth: record:read.
   * @returns {Promise<Readonly<object>[]>}
   */
  async getMenstrualRecords() {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    return this.#menstrualService.list();
  }

  /**
   * Return cycle-start records (cycleDay===1). Auth: record:read.
   * @returns {Promise<Readonly<object>[]>}
   */
  async getCurrentCycle() {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    return this.#menstrualService.findCurrentCycle();
  }

  /**
   * Return aggregate cycle statistics (BD-018: includes generatedAt). Auth: record:read.
   * @returns {Promise<Readonly<object>>}
   */
  async getCycleStatistics() {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    return this.#menstrualService.getCycleStatistics();
  }

  /**
   * Estimate the next cycle start date (Wave1 fixed logic). Auth: record:read.
   * @returns {Promise<Readonly<object>>}
   */
  async estimateNextCycle() {
    await this.#permissionService.require('record:read');
    if (!this.#menstrualService) throw new Error('[ApiGateway] MenstrualService not wired');
    return this.#menstrualService.estimateNextCycle();
  }

  // ── Research Dataset API (PR-040) ────────────────────────────────────────────
  // BD-015: RESEARCH_DATASET_CREATED events are replayable.
  // BD-018: generatedAt on all output.
  // BD-021: Append-Only — DELETE forbidden.
  // BD-022: Wave1 in-memory only.

  /**
   * Build and persist a new ResearchDataset. Auth: admin:research.
   * @param {{ anonymizationLevel?: string, datasetVersion?: string }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async createResearchDataset(options = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    return this.#researchDatasetService.createDataset(options);
  }

  /**
   * Return all persisted ResearchDatasets. Auth: admin:research.
   * @returns {Promise<Readonly<object>[]>}
   */
  async getResearchDatasets() {
    await this.#permissionService.require('admin:research');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    return this.#researchDatasetService.getDatasets();
  }

  /**
   * Verify completeness of a dataset by id. Auth: admin:research.
   * @param {string} datasetId
   * @returns {Promise<{ verified: boolean, issues: string[] }>}
   */
  async verifyResearchDataset(datasetId) {
    await this.#permissionService.require('admin:research');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    return this.#researchDatasetService.verifyDataset(datasetId);
  }

  /**
   * Export a dataset by id in the given format. Auth: admin:research.
   * @param {string} datasetId
   * @param {string} [format='JSON']
   * @returns {Promise<{ format: string, data: string|null, metadata: object }>}
   */
  async exportResearchDataset(datasetId, format = 'JSON') {
    await this.#permissionService.require('admin:research');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    if (!this.#datasetExportService)   throw new Error('[ApiGateway] DatasetExportService not wired');
    const dataset = this.#researchDatasetService.findLatest();
    if (!dataset) throw new Error('[ApiGateway] No datasets available to export');
    const target = this.#researchDatasetService.getDatasets().find(d => d.id === datasetId)
      ?? dataset;
    if (format === 'CSV')     return this.#datasetExportService.exportCSV(target);
    if (format === 'PARQUET') return this.#datasetExportService.exportPARQUET(target);
    return this.#datasetExportService.exportJSON(target);
  }

  /**
   * Return aggregate statistics across all datasets. Auth: admin:research.
   * BD-018: includes generatedAt.
   * @returns {Promise<Readonly<object>>}
   */
  async getResearchStatistics() {
    await this.#permissionService.require('admin:research');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    return this.#researchDatasetService.getStatistics();
  }

  /**
   * Return anonymization report for the latest dataset. Auth: admin:research.
   * BD-018: includes generatedAt.
   * @param {{ level?: string }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async getAnonymizationReport(options = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#anonymizationService) throw new Error('[ApiGateway] AnonymizationService not wired');
    if (!this.#researchDatasetService) throw new Error('[ApiGateway] ResearchDatasetService not wired');
    const dataset = this.#researchDatasetService.findLatest();
    const signals = dataset?.signals ?? [];
    return this.#anonymizationService.getAnonymizationReport({
      original:   signals,
      anonymized: signals,
      suppressed: 0,
      level:      options.level ?? (dataset?.anonymizationLevel ?? 'NONE'),
    });
  }

  // ── Environmental Signal (PR-049) ─────────────────────────────────────────
  // BD-003: Lunar Calendar UI FORBIDDEN — background data only.
  // BD-043: Environmental Signal UI display FORBIDDEN — Wave3+ scope.
  // Methods here are admin-only; UI screens/features MUST NOT call them.

  /**
   * Attach environmental signals (lunarPhase) to a Record in the background.
   * BD-003 / BD-043: result MUST NOT be rendered in any UI.
   * @param {object} record
   * @returns {Promise<Readonly<object>>}  Enriched record
   */
  async collectEnvironmentalSignals(record) {
    await this.#permissionService.require('admin');
    if (!this.#environmentalSignalCollector)
      throw new Error('[ApiGateway] EnvironmentalSignalCollector not wired');
    return this.#environmentalSignalCollector.collect(record);
  }

  /**
   * Attach environmental signals to multiple Records in bulk.
   * BD-003 / BD-043: results MUST NOT be rendered in any UI.
   * @param {object[]} records
   * @returns {Promise<Readonly<object>[]>}
   */
  async collectEnvironmentalSignalsBulk(records = []) {
    await this.#permissionService.require('admin');
    if (!this.#environmentalSignalCollector)
      throw new Error('[ApiGateway] EnvironmentalSignalCollector not wired');
    return this.#environmentalSignalCollector.collectAll(records);
  }

  /**
   * Create a daily Environmental Signal snapshot.
   * BD-018: snapshot includes generatedAt.
   * @param {object[]} records  Enriched records with environmentalSignals
   * @param {{ date?: string }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async createEnvironmentalSignalSnapshot(records = [], options = {}) {
    await this.#permissionService.require('admin');
    if (!this.#environmentalSignalSnapshotService)
      throw new Error('[ApiGateway] EnvironmentalSignalSnapshotService not wired');
    return this.#environmentalSignalSnapshotService.createSnapshot(records, options);
  }

  /**
   * Return all Environmental Signal snapshots.
   * @returns {Promise<Readonly<object>[]>}
   */
  async getEnvironmentalSignalSnapshots() {
    await this.#permissionService.require('admin');
    if (!this.#environmentalSignalSnapshotService)
      throw new Error('[ApiGateway] EnvironmentalSignalSnapshotService not wired');
    return this.#environmentalSignalSnapshotService.getSnapshots();
  }

  /**
   * Return the latest Environmental Signal snapshot.
   * @returns {Promise<Readonly<object>|null>}
   */
  async getLatestEnvironmentalSignalSnapshot() {
    await this.#permissionService.require('admin');
    if (!this.#environmentalSignalSnapshotService)
      throw new Error('[ApiGateway] EnvironmentalSignalSnapshotService not wired');
    return this.#environmentalSignalSnapshotService.getLatestSnapshot();
  }

  // ── Signal Intelligence V2 (PR-050) ──────────────────────────────────────
  // BD-024: EMOTION Signal now included in all aggregations (Wave2 active).
  // BD-022: signal source = NetworkSignalPersistenceServiceV2.
  // BD-038: Rule-based only — no AI, no LLM.

  /**
   * Aggregate all persisted signals by type and day.
   * BD-024: EMOTION signals included.
   * @returns {Promise<object>}  AggregationResult: { byType, byDay, total }
   */
  async getSignalAggregationV2() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.aggregate();
  }

  /**
   * Phase-based signal aggregation — new in V2.
   * Returns average normalizedValue per menstrual phase per signal type.
   * @returns {Promise<Readonly<object>>}
   */
  async getSignalAggregationByPhase() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.aggregateByPhase();
  }

  /**
   * Trend for a specific signal type from persisted signals.
   * BD-024: EMOTION is a valid type.
   * @param {string} signalType
   * @returns {Promise<object>}  TrendResult
   */
  async getSignalTrendV2(signalType) {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.trend(signalType);
  }

  /**
   * Trends for all signal types in persisted signals.
   * @returns {Promise<Record<string, object>>}
   */
  async getAllSignalTrendsV2() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.trendAll();
  }

  /**
   * Chronological timeline from all persisted signals.
   * @returns {Promise<object>}  TimelineResult
   */
  async getSignalTimelineV2() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.buildTimeline();
  }

  /**
   * Full summary from all persisted signals.
   * BD-024: emotionCount populated.
   * BD-018: includes generatedAt.
   * @returns {Promise<object>}  SignalSummary
   */
  async getSignalSummaryV2() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.summarize();
  }

  /**
   * Create a daily snapshot from all persisted signals.
   * BD-018: snapshot includes generatedAt + vectorVersion.
   * @param {{ schedule?: string }} [options]
   * @returns {Promise<Readonly<object>>}
   */
  async createSignalSnapshotV2(options = {}) {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.createDailySnapshot(options.schedule);
  }

  /**
   * Return V2 health status (BD-024 compliance, signal type counts, source info).
   * @returns {Promise<Readonly<object>>}
   */
  async getSignalIntelligenceV2Status() {
    await this.#permissionService.require('record:read');
    if (!this.#signalIntelligenceV2Service)
      throw new Error('[ApiGateway] SignalIntelligenceV2Service not wired');
    return this.#signalIntelligenceV2Service.getV2Status();
  }

  // ── Knowledge Graph Foundation (PR-051) ───────────────────────────────────

  /**
   * Add a node to the Knowledge Graph.
   * BD-036: Append-Only; nodes are never deleted.
   * @param {{ type: string, attributes: object, nodeId?: string }} params
   * @returns {Promise<Readonly<object>>}
   */
  async addKgNode(params) {
    await this.#permissionService.require('admin:research');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.addNode(params);
  }

  /**
   * Get a KG node by id.
   * @param {string} nodeId
   * @returns {Promise<Readonly<object> | undefined>}
   */
  async getKgNode(nodeId) {
    await this.#permissionService.require('record:read');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.getNode(nodeId);
  }

  /**
   * Get all KG nodes, optionally filtered by type.
   * @param {string} [type]
   * @returns {Promise<Readonly<object>[]>}
   */
  async getKgNodes(type) {
    await this.#permissionService.require('record:read');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.getNodes(type);
  }

  /**
   * Add an edge to the Knowledge Graph.
   * @param {{ fromNodeId, toNodeId, relationType, evidenceCount, confidence, edgeId? }} params
   * @returns {Promise<Readonly<object>>}
   */
  async addKgEdge(params) {
    await this.#permissionService.require('admin:research');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.addEdge(params);
  }

  /**
   * Get a KG edge by id.
   * @param {string} edgeId
   * @returns {Promise<Readonly<object> | undefined>}
   */
  async getKgEdge(edgeId) {
    await this.#permissionService.require('record:read');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.getEdge(edgeId);
  }

  /**
   * Get all KG edges, optionally filtered by relationType.
   * @param {string} [relationType]
   * @returns {Promise<Readonly<object>[]>}
   */
  async getKgEdges(relationType) {
    await this.#permissionService.require('record:read');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.getEdges(relationType);
  }

  /**
   * Update confidence on an existing edge (Append-Only — original is preserved).
   * BD-036: creates a new edge entry rather than mutating the original.
   * @param {string} edgeId
   * @param {number} evidenceCount
   * @param {number} confidence
   * @returns {Promise<Readonly<object>>}
   */
  async updateKgEdgeConfidence(edgeId, evidenceCount, confidence) {
    await this.#permissionService.require('admin:research');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.updateEdgeConfidence(edgeId, evidenceCount, confidence);
  }

  /**
   * Return KG health status and stats.
   * @returns {Promise<Readonly<object>>}
   */
  async getKgStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#knowledgeGraphService)
      throw new Error('[ApiGateway] KnowledgeGraphService not wired');
    return this.#knowledgeGraphService.getStatus();
  }

  // ── Knowledge Graph Builder (PR-052) ─────────────────────────────────────

  /**
   * Build the KG skeleton from diseases / clusterSnapshots / signals / cases.
   * Idempotent — duplicate nodes are not inserted.
   * BD-036: all inserts are Append-Only via KnowledgeGraphService.
   *
   * @param {{
   *   diseases?:         object[],
   *   clusterSnapshots?: object[],
   *   signals?:          object[],
   *   cases?:            object[],
   * }} input
   * @param {{ kgVersion?: string }} [options]
   * @returns {Promise<{ snapshot: Readonly<object>, addedNodes: number, addedEdges: number }>}
   */
  async buildKnowledgeGraph(input = {}, options = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#knowledgeGraphBuilder)
      throw new Error('[ApiGateway] KnowledgeGraphBuilder not wired');
    return this.#knowledgeGraphBuilder.build(input, options);
  }

  // ── Feature Store V1 (PR-053) ────────────────────────────────────────────

  /**
   * Compute and store a FeatureMatrix for a user from their persisted signals.
   * BD-037: signals must be from Supabase persistence — pass options.source='supabase'.
   * @requires admin:research
   */
  async computeFeatureMatrix(input = {}, options = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#featureStoreService)
      throw new Error('[ApiGateway] FeatureStoreService not wired');
    return this.#featureStoreService.compute(input, options);
  }

  /**
   * Retrieve the latest FeatureMatrix for a user.
   * @requires record:read
   */
  async getFeatureMatrix(userId) {
    await this.#permissionService.require('record:read');
    if (!this.#featureStoreService)
      throw new Error('[ApiGateway] FeatureStoreService not wired');
    return this.#featureStoreService.getMatrix(userId);
  }

  /**
   * @requires record:read
   */
  async getFeatureStoreStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#featureStoreService)
      throw new Error('[ApiGateway] FeatureStoreService not wired');
    return this.#featureStoreService.getStatus();
  }

  // ── Cohort Builder (PR-054) ───────────────────────────────────────────────

  /**
   * Define a new research cohort.
   * kAnonymityVerified starts as false — call confirmCohortKAnonymity() after case counting.
   * @requires admin:research
   */
  async defineCohort(params = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.defineCohort(params);
  }

  /**
   * Confirm k-anonymity for a cohort.
   * BD-039: throws if actualCount < K_ANONYMITY_MIN (5).
   * @requires admin:research
   */
  async confirmCohortKAnonymity(cohortId, actualCount) {
    await this.#permissionService.require('admin:research');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.confirmKAnonymity(cohortId, actualCount);
  }

  /**
   * Check whether a cohort is eligible for Dataset generation.
   * BD-039: throws if cohort is not k-anonymity verified or count < 5.
   * @requires admin:research
   */
  async checkCohortPublicationEligibility(cohortId) {
    await this.#permissionService.require('admin:research');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.checkPublicationEligibility(cohortId);
  }

  /**
   * @requires record:read
   */
  async getCohort(cohortId) {
    await this.#permissionService.require('record:read');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.getCohort(cohortId);
  }

  /**
   * @requires record:read
   */
  async getCohorts() {
    await this.#permissionService.require('record:read');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.getCohorts();
  }

  /**
   * @requires record:read
   */
  async getVerifiedCohorts() {
    await this.#permissionService.require('record:read');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.getVerifiedCohorts();
  }

  /**
   * @requires record:read
   */
  async getCohortBuilderStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#cohortBuilderService)
      throw new Error('[ApiGateway] CohortBuilderService not wired');
    return this.#cohortBuilderService.getStatus();
  }

  // ── Dataset Version Management (PR-055) ──────────────────────────────────

  /**
   * Publish a new DatasetVersion (Append-Only — BD-021).
   * @requires admin:research
   */
  async publishDatasetVersion(params = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#datasetVersionService)
      throw new Error('[ApiGateway] DatasetVersionService not wired');
    return this.#datasetVersionService.publish(params);
  }

  /**
   * @requires record:read
   */
  async getDatasetVersion(versionId) {
    await this.#permissionService.require('record:read');
    if (!this.#datasetVersionService)
      throw new Error('[ApiGateway] DatasetVersionService not wired');
    return this.#datasetVersionService.getVersion(versionId);
  }

  /**
   * @requires record:read
   */
  async getDatasetVersions(datasetId) {
    await this.#permissionService.require('record:read');
    if (!this.#datasetVersionService)
      throw new Error('[ApiGateway] DatasetVersionService not wired');
    return this.#datasetVersionService.getVersions(datasetId);
  }

  /**
   * @requires record:read
   */
  async getDatasetVersionsByType(type) {
    await this.#permissionService.require('record:read');
    if (!this.#datasetVersionService)
      throw new Error('[ApiGateway] DatasetVersionService not wired');
    return this.#datasetVersionService.getVersionsByType(type);
  }

  /**
   * @requires record:read
   */
  async getDatasetVersionStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#datasetVersionService)
      throw new Error('[ApiGateway] DatasetVersionService not wired');
    return this.#datasetVersionService.getStatus();
  }

  // ── Evidence Layer (PR-056) — Phase C capstone ───────────────────────────

  /**
   * Compile an EvidenceSummary from available evidence sources.
   * Integrates DatasetVersions / ClusterStats / PatternEvidence / EventLogs / KgSnapshot.
   * @requires admin:research
   */
  async compileEvidence(input = {}) {
    await this.#permissionService.require('admin:research');
    if (!this.#evidenceLayerService)
      throw new Error('[ApiGateway] EvidenceLayerService not wired');
    return this.#evidenceLayerService.compile(input);
  }

  /**
   * @requires record:read
   */
  async getEvidenceLayerStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#evidenceLayerService)
      throw new Error('[ApiGateway] EvidenceLayerService not wired');
    return this.#evidenceLayerService.getStatus();
  }

  // ── Signal Insight (PR-057 / BD-031 / BD-038) ────────────────────────────

  /**
   * Generate Signal Insight summaries for a user.
   * BD-038: LOW-confidence insights suppressed; forbidden words auto-blocked.
   *
   * @param {{ userId: string, signals: object[] }} input
   * @param {{ source?: string }} [options]
   * @returns {Promise<ReadonlyArray<Readonly<object>>>}
   */
  async generateSignalInsights(input, options = {}) {
    await this.#permissionService.require('record:read');
    if (!this.#signalInsightService)
      throw new Error('[ApiGateway] SignalInsightService not wired');
    return this.#signalInsightService.generateInsights(input, options);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getSignalInsightStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#signalInsightService)
      throw new Error('[ApiGateway] SignalInsightService not wired');
    return this.#signalInsightService.getStatus();
  }

  // ── Pattern Discovery (PR-058 / BD-031 / BD-038) ─────────────────────────

  /**
   * Discover statistical patterns from a user's persisted signals.
   * Returns all 4 pattern types; LOW-confidence patterns included but flagged.
   *
   * @param {{ userId: string, signals: object[], experiments?: object[] }} input
   * @returns {Promise<ReadonlyArray<Readonly<object>>>}
   */
  async discoverPatterns(input) {
    await this.#permissionService.require('record:read');
    if (!this.#patternDiscoveryService)
      throw new Error('[ApiGateway] PatternDiscoveryService not wired');
    return this.#patternDiscoveryService.discoverPatterns(input);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getPatternDiscoveryStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#patternDiscoveryService)
      throw new Error('[ApiGateway] PatternDiscoveryService not wired');
    return this.#patternDiscoveryService.getStatus();
  }

  // ── Case Recommendation (PR-059 / BD-026 / BD-029 / BD-030) ─────────────

  /**
   * Get anonymized case recommendations for a user (admin:research only until Phase 3).
   * BD-030: k < 5 groups throw KAnonymityError — never silenced.
   * BD-026: mode='public' throws Phase3NotCompleteError until Founder verifies Phase 3.
   *
   * @param {{ userId: string, userVector: number[], candidateCases: object[],
   *            diseaseKey?: string, mode?: string }} input
   * @returns {Promise<Readonly<object>>}
   */
  async getCaseRecommendations(input) {
    await this.#permissionService.require('admin:research');
    if (!this.#caseRecommendationService)
      throw new Error('[ApiGateway] CaseRecommendationService not wired');
    return this.#caseRecommendationService.recommend(input);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getCaseRecommendationStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#caseRecommendationService)
      throw new Error('[ApiGateway] CaseRecommendationService not wired');
    return this.#caseRecommendationService.getStatus();
  }

  // ── Similar Case Search (PR-060 / BD-030 / admin:research) ───────────────

  /**
   * Search for anonymized cases matching a SearchQuery.
   * BD-030: k < 5 matched group → KAnonymityError (never silenced).
   * Requires admin:research permission.
   *
   * @param {{ query: object, casePool: object[] }} input
   * @returns {Promise<Readonly<object>>} SearchResult
   */
  async searchSimilarCases(input) {
    await this.#permissionService.require('admin:research');
    if (!this.#similarCaseSearchService)
      throw new Error('[ApiGateway] SimilarCaseSearchService not wired');
    return this.#similarCaseSearchService.search(input);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getSimilarCaseSearchStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#similarCaseSearchService)
      throw new Error('[ApiGateway] SimilarCaseSearchService not wired');
    return this.#similarCaseSearchService.getStatus();
  }

  // ── Research Assistance (PR-061 / BD-031 / BD-038 / admin:research) ──────

  /**
   * Compute descriptive statistics, signal correlations, and cluster comparisons
   * from research datasets. Causal inference language is auto-blocked (BD-038).
   * Requires admin:research permission.
   *
   * @param {{
   *   datasets:         Array<{ signalType: string, values: number[] }>,
   *   cohorts?:         object[],
   *   clusterStats?:    object[],
   *   evidenceSummary?: object|null,
   * }} input
   * @returns {Promise<Readonly<object>>} ResearchResult
   */
  async getResearchAssistance(input) {
    await this.#permissionService.require('admin:research');
    if (!this.#researchAssistanceService)
      throw new Error('[ApiGateway] ResearchAssistanceService not wired');
    return this.#researchAssistanceService.analyze(input);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getResearchAssistanceStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#researchAssistanceService)
      throw new Error('[ApiGateway] ResearchAssistanceService not wired');
    return this.#researchAssistanceService.getStatus();
  }

  // ── AI Safety Layer (PR-062 / BD-031 / BD-038 / Phase D capstone) ─────────

  /**
   * Validate an AI output text for BD-038 compliance (non-throwing).
   * Returns a SafetyResult with result: PASS | FAIL and violations list.
   * Requires admin:research permission.
   *
   * @param {{ text: string, isMedicalAdvice: boolean, serviceId?: string }} input
   * @returns {Promise<Readonly<object>>} SafetyResult
   */
  async validateAIOutput(input) {
    await this.#permissionService.require('admin:research');
    if (!this.#aiSafetyValidator)
      throw new Error('[ApiGateway] AISafetyValidator not wired');
    return this.#aiSafetyValidator.validate(input);
  }

  /**
   * Generate Phase D audit report from service statuses.
   * Confirms phaseDComplete when all 5 Phase D services pass BD-031/BD-038 audit.
   * Requires admin:research permission.
   *
   * @param {Object<string, object>} serviceStatuses
   * @returns {Promise<Readonly<object>>} AuditReport
   */
  async getAISafetyAuditReport(serviceStatuses) {
    await this.#permissionService.require('admin:research');
    if (!this.#aiSafetyValidator)
      throw new Error('[ApiGateway] AISafetyValidator not wired');
    return this.#aiSafetyValidator.getAuditReport(serviceStatuses);
  }

  /** @returns {Promise<Readonly<object>>} */
  async getAISafetyStatus() {
    await this.#permissionService.require('record:read');
    if (!this.#aiSafetyValidator)
      throw new Error('[ApiGateway] AISafetyValidator not wired');
    return this.#aiSafetyValidator.getStatus();
  }
}
