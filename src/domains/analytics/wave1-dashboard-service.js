// Wave1DashboardService — aggregates all Wave1 KPIs into a single admin-only summary.
// No UI. Returns JSON-serializable object only.
// Integrates: Wave1MetricsService + CommunicationMetrics + Consent + Delivery stats.
// PR-024: Admin Analytics Layer

export class Wave1DashboardService {
  #wave1MetricsService;
  #communicationMetrics;
  #deliveryQueue;

  constructor({ wave1MetricsService, communicationMetrics, deliveryQueue }) {
    this.#wave1MetricsService  = wave1MetricsService;
    this.#communicationMetrics = communicationMetrics;
    this.#deliveryQueue        = deliveryQueue;
  }

  /**
   * Build a full Wave1 dashboard summary.
   * All metrics are read-only aggregations — no side effects.
   *
   * @param {{
   *   users: Array<{
   *     enrollmentDate: string,
   *     records:        object[],
   *     experiments:    object[],
   *     cases:          object[],
   *     consentLevel?:  number,
   *   }>
   * }} params
   * @returns {{
   *   day1Retention:           number,
   *   day7Retention:           number,
   *   recordCompletionRate:    number,
   *   experimentStartRate:     number,
   *   experimentCompletionRate:number,
   *   consentLevel2Rate:       number,
   *   diseaseTagCoverage:      number,
   *   caseGenerationRate:      number,
   *   communicationMetrics:    object,
   *   networkStats:            object,
   *   userCount:               number,
   *   capturedAt:              string,
   * }}
   */
  getDashboard({ users = [] } = {}) {
    if (users.length === 0) {
      return _emptyDashboard();
    }

    // Per-user metrics via Wave1MetricsService
    const perUser = users.map(u =>
      this.#wave1MetricsService.computeMetrics({
        enrollmentDate: u.enrollmentDate,
        records:        u.records      ?? [],
        experiments:    u.experiments  ?? [],
        cases:          u.cases        ?? [],
        consentLevel:   u.consentLevel ?? 0,
      })
    );

    // Cohort aggregation
    const cohort = this.#wave1MetricsService.aggregateCohort(perUser);

    // Experiment completion rate: fraction of users with ≥1 COMPLETED experiment
    const experimentCompletionRate = users.length > 0
      ? users.filter(u =>
          (u.experiments ?? []).some(e => e.status === 'COMPLETED')
        ).length / users.length
      : 0;

    // Communication KPIs
    const communicationMetrics = this.#communicationMetrics?.getSnapshot() ?? {};

    // Delivery stats
    const allQueue     = this.#deliveryQueue?.findAll() ?? [];
    const networkStats = {
      deliveryQueueTotal:     allQueue.length,
      deliveryPending:        allQueue.filter(e => e.status === 'PENDING').length,
      deliveryScheduled:      allQueue.filter(e => e.status === 'SCHEDULED').length,
      deliveryDelivered:      allQueue.filter(e => e.status === 'DELIVERED').length,
      deliveryFailed:         allQueue.filter(e => e.status === 'FAILED').length,
    };

    return {
      userCount:               users.length,
      day1Retention:           cohort.day1Retention           ?? 0,
      day7Retention:           cohort.day7Retention           ?? 0,
      recordCompletionRate:    cohort.recordCompletionRate    ?? 0,
      experimentStartRate:     cohort.experimentStartRate     ?? 0,
      experimentCompletionRate,
      consentLevel2Rate:       cohort.consentLevel2Rate       ?? 0,
      diseaseTagCoverage:      cohort.diseaseTagCoverage      ?? 0,
      caseGenerationRate:      cohort.caseGenerationRate      ?? 0,
      communicationMetrics,
      networkStats,
      capturedAt:              new Date().toISOString(),
    };
  }
}

function _emptyDashboard() {
  return {
    userCount:               0,
    day1Retention:           0,
    day7Retention:           0,
    recordCompletionRate:    0,
    experimentStartRate:     0,
    experimentCompletionRate:0,
    consentLevel2Rate:       0,
    diseaseTagCoverage:      0,
    caseGenerationRate:      0,
    communicationMetrics:    {},
    networkStats:            { deliveryQueueTotal:0, deliveryPending:0, deliveryScheduled:0, deliveryDelivered:0, deliveryFailed:0 },
    capturedAt:              new Date().toISOString(),
  };
}
