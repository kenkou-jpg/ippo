// KpiSnapshot — append-only time-series store for Wave1 KPI measurements.
// Each snapshot captures a full KPI set at a point in time.
// Used by Wave1DashboardService. DELETE forbidden.
// PR-024: Admin Analytics Layer

let _idCounter = 0;

/**
 * @typedef {{
 *   id:                      string,
 *   capturedAt:              string,
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
 * }} KpiSnapshotEntry
 */

export class KpiSnapshot {
  #repository;

  /** @param {import('./kpi-repository.js').KpiRepository} repository */
  constructor(repository) {
    this.#repository = repository;
  }

  /**
   * Capture and persist a KPI snapshot.
   * @param {{
   *   day1Retention:           number,
   *   day7Retention:           number,
   *   recordCompletionRate:    number,
   *   experimentStartRate:     number,
   *   experimentCompletionRate:number,
   *   consentLevel2Rate:       number,
   *   diseaseTagCoverage:      number,
   *   caseGenerationRate:      number,
   *   communicationMetrics?:   object,
   *   networkStats?:           object,
   * }} kpis
   * @returns {KpiSnapshotEntry}
   */
  capture(kpis) {
    const entry = {
      id:          `kpi_${Date.now()}_${++_idCounter}`,
      capturedAt:  new Date().toISOString(),
      day1Retention:            kpis.day1Retention            ?? 0,
      day7Retention:            kpis.day7Retention            ?? 0,
      recordCompletionRate:     kpis.recordCompletionRate     ?? 0,
      experimentStartRate:      kpis.experimentStartRate      ?? 0,
      experimentCompletionRate: kpis.experimentCompletionRate ?? 0,
      consentLevel2Rate:        kpis.consentLevel2Rate        ?? 0,
      diseaseTagCoverage:       kpis.diseaseTagCoverage       ?? 0,
      caseGenerationRate:       kpis.caseGenerationRate       ?? 0,
      communicationMetrics:     kpis.communicationMetrics     ?? {},
      networkStats:             kpis.networkStats             ?? {},
    };
    this.#repository.append(entry);
    return entry;
  }

  /** @returns {KpiSnapshotEntry[]} */
  findAll() {
    return this.#repository.findAll();
  }

  /** @returns {KpiSnapshotEntry|null} */
  findLatest() {
    return this.#repository.findLatest();
  }
}
