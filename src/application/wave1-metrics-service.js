// Wave1MetricsService — KPI measurement infrastructure for Wave1 (30 users).
// Computes metrics only. Does NOT display or push anywhere.
// PR-021: UX Foundation — Wave1 KPI基盤
// PR-022: Engagement KPI extension
import { getEngagementMetrics } from './engagement-metrics.js';
//
// KPIs tracked:
//   Day1Retention, Day7Retention, RecordCompletionRate,
//   DiseaseTagCoverage, ExperimentStartRate, CaseGenerationRate, ConsentLevel2Rate

export class Wave1MetricsService {
  /**
   * Compute Wave1 KPIs for a single user.
   *
   * @param {{
   *   enrollmentDate:  string,    ISO date of first record or explicit enrollment
   *   records:         object[],  all domain-shape records for the user
   *   experiments:     object[],  all experiments for the user
   *   cases:           object[],  all cases for the user
   *   consentLevel?:   number,    current consent level (0-3)
   * }} params
   *
   * @returns {{
   *   daysSinceEnrollment: number,
   *   day1Retention:       0|1,
   *   day7Retention:       0|1,
   *   recordCompletionRate: number,   0-1 (records in D1-7 / 7)
   *   diseaseTagCoverage:  number,   0-1
   *   experimentStartRate: 0|1,      did user start ≥1 experiment by Day7
   *   caseGenerationRate:  0|1,      has ≥1 case
   *   consentLevel2Rate:   0|1,      consent >= 2
   * }}
   */
  computeMetrics({ enrollmentDate, records = [], experiments = [], cases = [], consentLevel = 0 }) {
    const enrollTs  = new Date(enrollmentDate ?? new Date().toISOString()).getTime();
    const nowTs     = Date.now();
    const daysSinceEnrollment = Math.floor((nowTs - enrollTs) / 86_400_000);

    const _dayOffset = (isoDate) => {
      const d = new Date(isoDate ?? '').getTime();
      return isNaN(d) ? -1 : Math.floor((d - enrollTs) / 86_400_000);
    };

    // Day1 Retention: at least one record on Day 0 or 1
    const day1Retention = records.some(r => {
      const offset = _dayOffset(r.recordDate);
      return offset >= 0 && offset <= 1;
    }) ? 1 : 0;

    // Day7 Retention: at least one record on Day 6 or 7
    const day7Retention = records.some(r => {
      const offset = _dayOffset(r.recordDate);
      return offset >= 6 && offset <= 7;
    }) ? 1 : 0;

    // RecordCompletionRate: records in Day 0-6 (7-day window) / 7
    const recordsInFirst7 = records.filter(r => {
      const offset = _dayOffset(r.recordDate);
      return offset >= 0 && offset < 7;
    });
    const recordCompletionRate = Math.min(1, recordsInFirst7.length / 7);

    // DiseaseTagCoverage: fraction of records with at least one disease tag
    const recordsWithTag = records.filter(r => {
      const keys = r.diseaseKeys ?? r.diseases ?? [];
      return Array.isArray(keys) && keys.length > 0;
    });
    const diseaseTagCoverage = records.length > 0
      ? recordsWithTag.length / records.length
      : 0;

    // ExperimentStartRate: did user start ≥1 experiment by Day7?
    const experimentStartRate = experiments.some(e => {
      const offset = _dayOffset(e.startDate ?? e.createdAt);
      return offset >= 0 && offset <= 7;
    }) ? 1 : 0;

    // CaseGenerationRate: has ≥1 case been generated?
    const caseGenerationRate = cases.length > 0 ? 1 : 0;

    // ConsentLevel2Rate: consent >= 2
    const consentLevel2Rate = Number(consentLevel) >= 2 ? 1 : 0;

    return {
      daysSinceEnrollment,
      day1Retention,
      day7Retention,
      recordCompletionRate,
      diseaseTagCoverage,
      experimentStartRate,
      caseGenerationRate,
      consentLevel2Rate,
    };
  }

  /**
   * Returns engagement event counters (PR-022 additions).
   * These are global counters, not per-user rates.
   * @returns {object}
   */
  getEngagementSummary() {
    return getEngagementMetrics();
  }

  /**
   * Aggregate metrics across multiple users (cohort view).
   * @param {Array<ReturnType<Wave1MetricsService['computeMetrics']>>} userMetrics
   * @returns {object}  mean of each metric across the cohort
   */
  aggregateCohort(userMetrics) {
    if (userMetrics.length === 0) return {};

    const keys = [
      'day1Retention', 'day7Retention', 'recordCompletionRate',
      'diseaseTagCoverage', 'experimentStartRate', 'caseGenerationRate', 'consentLevel2Rate',
    ];

    const totals = Object.fromEntries(keys.map(k => [k, 0]));
    for (const m of userMetrics) {
      for (const k of keys) totals[k] += (m[k] ?? 0);
    }

    const n = userMetrics.length;
    return {
      n,
      ...Object.fromEntries(keys.map(k => [k, Math.round(totals[k] / n * 1000) / 1000])),
    };
  }
}
