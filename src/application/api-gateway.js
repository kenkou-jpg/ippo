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
    return this.#recordCommandService.save(data);
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
}
