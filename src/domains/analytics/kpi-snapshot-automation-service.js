// KpiSnapshotAutomationService — automates KPI dashboard generation + snapshot capture.
// Replaces the manual Wave1DashboardService.getDashboard() call.
// Append-only: captured snapshots are never deleted or updated.
// PR-026: Operations & KPI Automation

export class KpiSnapshotAutomationService {
  #wave1DashboardService;
  #kpiSnapshot;

  /**
   * @param {{
   *   wave1DashboardService: import('./wave1-dashboard-service.js').Wave1DashboardService,
   *   kpiSnapshot:           import('./kpi-snapshot.js').KpiSnapshot,
   * }} deps
   */
  constructor({ wave1DashboardService, kpiSnapshot }) {
    this.#wave1DashboardService = wave1DashboardService;
    this.#kpiSnapshot           = kpiSnapshot;
  }

  /**
   * Generate a fresh dashboard, persist it as an immutable snapshot, and return it.
   * Append-only: does not modify or delete prior snapshots.
   *
   * @param {Array<{
   *   enrollmentDate: string,
   *   records:        object[],
   *   experiments:    object[],
   *   cases:          object[],
   *   consentLevel?:  number,
   * }>} users
   * @returns {import('./kpi-snapshot.js').KpiSnapshotEntry}
   */
  captureSnapshot(users = []) {
    const dashboard = this.#wave1DashboardService.getDashboard({ users });
    return this.#kpiSnapshot.capture({
      day1Retention:            dashboard.day1Retention,
      day7Retention:            dashboard.day7Retention,
      recordCompletionRate:     dashboard.recordCompletionRate,
      experimentStartRate:      dashboard.experimentStartRate,
      experimentCompletionRate: dashboard.experimentCompletionRate,
      consentLevel2Rate:        dashboard.consentLevel2Rate,
      diseaseTagCoverage:       dashboard.diseaseTagCoverage,
      caseGenerationRate:       dashboard.caseGenerationRate,
      communicationMetrics:     dashboard.communicationMetrics,
      networkStats:             dashboard.networkStats,
    });
  }

  /**
   * Return the most recently captured snapshot, or null if none exist.
   * @returns {import('./kpi-snapshot.js').KpiSnapshotEntry|null}
   */
  getLatestSnapshot() {
    return this.#kpiSnapshot.findLatest();
  }

  /**
   * Return the full snapshot history in insertion order.
   * @returns {import('./kpi-snapshot.js').KpiSnapshotEntry[]}
   */
  getSnapshotHistory() {
    return this.#kpiSnapshot.findAll();
  }
}
