// KpiSchedulerService — scheduling-aware wrapper for KPI snapshot capture.
// Determines if a snapshot is due and delegates to KpiSnapshotAutomationService.
// No Cron, no setInterval, no external scheduler.
// Execution is the caller's responsibility. This service only judges "is it due?"
// PR-027: Operations Automation & Analytics Completion

/** Default minimum interval between snapshots: 1 hour (ms) */
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

export class KpiSchedulerService {
  #kpiSnapshotAutomationService;
  #intervalMs;

  /**
   * @param {{
   *   kpiSnapshotAutomationService: import('./kpi-snapshot-automation-service.js').KpiSnapshotAutomationService,
   *   intervalMs?: number,
   * }} deps
   */
  constructor({ kpiSnapshotAutomationService, intervalMs = DEFAULT_INTERVAL_MS }) {
    this.#kpiSnapshotAutomationService = kpiSnapshotAutomationService;
    this.#intervalMs                   = intervalMs;
  }

  /**
   * Returns whether a new snapshot is due based on the last capture time.
   * @returns {{ due: boolean, lastCapturedAt: string|null }}
   */
  getScheduleStatus() {
    const latest         = this.#kpiSnapshotAutomationService.getLatestSnapshot();
    const lastCapturedAt = latest?.capturedAt ?? null;

    if (!lastCapturedAt) {
      return { due: true, lastCapturedAt: null };
    }

    const elapsed = Date.now() - new Date(lastCapturedAt).getTime();
    return { due: elapsed >= this.#intervalMs, lastCapturedAt };
  }

  /**
   * Capture a new snapshot if one is due. No-ops if not due yet.
   * Returns the new snapshot if captured, or null if skipped.
   *
   * @param {object[]} users  same shape as KpiSnapshotAutomationService.captureSnapshot()
   * @returns {import('./kpi-snapshot.js').KpiSnapshotEntry|null}
   */
  captureDueSnapshots(users = []) {
    const { due } = this.getScheduleStatus();
    if (!due) return null;
    return this.#kpiSnapshotAutomationService.captureSnapshot(users);
  }
}
