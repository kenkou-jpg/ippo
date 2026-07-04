// longitudinal-summary-service.js — Longitudinal統合サマリー (PR-032)
// Returns: { baseline, movingAverage, trend, window, generatedAt }
// No Similarity, DiseaseCluster, Prediction, AI.
// NAC-04 Wave1 (NETWORK_ASSET_COUNCIL.md).

import { WINDOW_SIZES } from './trend-window-builder.js';

/**
 * @typedef {{
 *   baseline:       Record<string, import('./baseline-service.js').BaselineResult>,
 *   movingAverage:  Record<string, { last7: import('./moving-average-service.js').MovingAverageResult, last30: import('./moving-average-service.js').MovingAverageResult }>,
 *   trend:          Record<string, import('./signal-trend-service.js').TrendResult>,
 *   window:         { days: number, from: string | null, to: string | null, signalCount: number },
 *   generatedAt:    string,
 * }} LongitudinalSummary
 */

export class LongitudinalSummaryService {
  #baselineService;
  #movingAverageService;
  #trendService;
  #windowBuilder;

  /**
   * @param {{
   *   baselineService:      import('./baseline-service.js').BaselineService,
   *   movingAverageService: import('./moving-average-service.js').MovingAverageService,
   *   trendService:         import('./signal-trend-service.js').SignalTrendService,
   *   windowBuilder:        import('./trend-window-builder.js').TrendWindowBuilder,
   * }} deps
   */
  constructor({ baselineService, movingAverageService, trendService, windowBuilder }) {
    this.#baselineService      = baselineService;
    this.#movingAverageService = movingAverageService;
    this.#trendService         = trendService;
    this.#windowBuilder        = windowBuilder;
  }

  /**
   * Generate a full longitudinal summary for a user's signals.
   * Window defaults to Last30.
   *
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {{ windowDays?: number, referenceDate?: string }} [options]
   * @returns {LongitudinalSummary}
   */
  summarize(signals, { windowDays = WINDOW_SIZES.LAST30, referenceDate } = {}) {
    const all = Array.isArray(signals) ? signals.filter(Boolean) : [];

    const window_ = this.#windowBuilder.build(all, windowDays, referenceDate);
    const baseline      = this.#baselineService.computeWave1(all);
    const movingAverage = this.#movingAverageService.computeAll(all, referenceDate);
    const trend         = this.#trendService.trendAll(window_.signals);

    return {
      baseline,
      movingAverage,
      trend,
      window: {
        days:        windowDays,
        from:        window_.from,
        to:          window_.to,
        signalCount: window_.signalCount,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
