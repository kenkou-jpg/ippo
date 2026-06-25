// RecordMigrationService — evaluates Dual Write readiness and controls the Read Switch.
// Switch activation requires: matchRate >= 99.9% AND criticalDiffCount == 0.
// PR-021: Record V2 Completion
import { getCoverage, getCriticalDiffs } from './record-migration-audit.js';

const MATCH_RATE_THRESHOLD    = 0.999;  // 99.9%
const MAX_CRITICAL_DIFFS      = 0;

export class RecordMigrationService {
  /** @param {import('../repositories/record/record-read-switch.js').RecordReadSwitch} readSwitch */
  constructor(readSwitch) {
    this._switch = readSwitch;
  }

  /**
   * Returns the current migration readiness report.
   * @returns {{
   *   matchRate:         number|null,
   *   criticalDiffCount: number,
   *   dualWrites:        number,
   *   diffCount:         number,
   *   isSafeToSwitch:    boolean,
   *   activeSource:      'LEGACY'|'V2',
   *   reason:            string,
   * }}
   */
  getReadinessReport() {
    const cov              = getCoverage();
    const criticalDiffs    = getCriticalDiffs();
    const criticalDiffCount = criticalDiffs.length;
    const matchRate         = cov.matchRate;

    const matchRateOk    = matchRate !== null && matchRate >= MATCH_RATE_THRESHOLD;
    const criticalOk     = criticalDiffCount <= MAX_CRITICAL_DIFFS;
    const hasDualWrites  = (cov.dualWrites ?? 0) > 0;
    const isSafeToSwitch = hasDualWrites && matchRateOk && criticalOk;

    let reason;
    if (!hasDualWrites)   reason = 'No dual writes recorded yet';
    else if (!matchRateOk)  reason = `matchRate ${matchRate === null ? 'n/a' : (matchRate * 100).toFixed(2)}% < 99.9%`;
    else if (!criticalOk)   reason = `${criticalDiffCount} critical diff(s) detected`;
    else                    reason = 'All conditions met';

    return {
      matchRate,
      criticalDiffCount,
      dualWrites:   cov.dualWrites   ?? 0,
      diffCount:    cov.diffCount    ?? 0,
      isSafeToSwitch,
      activeSource: this._switch.activeSource,
      reason,
    };
  }

  /**
   * Activate V2 reads if all conditions are met.
   * @returns {{ activated: boolean, reason: string }}
   */
  attemptSwitch() {
    const report = this.getReadinessReport();
    if (!report.isSafeToSwitch) {
      return { activated: false, reason: report.reason };
    }
    this._switch.enableV2();
    return { activated: true, reason: 'V2 read source activated' };
  }

  /**
   * Force-disable V2 reads (rollback).
   */
  rollback() {
    this._switch.disableV2();
  }
}
