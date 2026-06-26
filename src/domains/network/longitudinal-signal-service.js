// longitudinal-signal-service.js — 時系列Signal解析サービス (PR-032)
// Responsible for: Signal履歴取得 / 時系列解析 / Trend Window生成 / Baseline生成
// NAC-04 Wave1: 30日移動平均・ベースライン・トレンドウィンドウ
// Similarity / DiseaseCluster / Prediction / AI 禁止

import { SIGNAL_TYPE_VALUES } from './network-signal-types.js';
import { TrendWindowBuilder, WINDOW_SIZES } from './trend-window-builder.js';
import { MovingAverageService } from './moving-average-service.js';
import { BaselineService }      from './baseline-service.js';

/** Sort signals by timestamp ascending. */
function _sortAscending(signals) {
  return [...signals].sort((a, b) => {
    const ta = a?.timestamp ?? '';
    const tb = b?.timestamp ?? '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

export class LongitudinalSignalService {
  #windowBuilder;
  #movingAverageService;
  #baselineService;

  constructor() {
    this.#windowBuilder       = new TrendWindowBuilder();
    this.#movingAverageService = new MovingAverageService();
    this.#baselineService      = new BaselineService();
  }

  /**
   * Return all signals sorted chronologically (ascending).
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  getHistory(signals) {
    if (!Array.isArray(signals)) return [];
    return _sortAscending(signals.filter(Boolean));
  }

  /**
   * Return signals for a specific type, sorted ascending.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  getHistoryByType(signals, signalType) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[LongitudinalSignalService] Unknown signalType: "${signalType}"`);
    }
    const filtered = Array.isArray(signals) ? signals.filter(s => s?.signalType === signalType) : [];
    return _sortAscending(filtered);
  }

  /**
   * Return signals within a date range [fromDate, toDate] (YYYY-MM-DD inclusive), sorted ascending.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} fromDate
   * @param {string} toDate
   * @returns {import('./network-signal-entity.js').NetworkSignal[]}
   */
  getHistoryRange(signals, fromDate, toDate) {
    if (!Array.isArray(signals)) return [];
    const filtered = signals.filter(s => {
      const d = s?.timestamp?.slice(0, 10);
      return d && d >= fromDate && d <= toDate;
    });
    return _sortAscending(filtered);
  }

  /**
   * Build a trend window (Last7 or Last30).
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {number} [days]  default LAST30
   * @param {string} [referenceDate]  YYYY-MM-DD
   */
  buildWindow(signals, days = WINDOW_SIZES.LAST30, referenceDate) {
    return this.#windowBuilder.build(signals, days, referenceDate);
  }

  /**
   * Compute moving average for a signalType over a window.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @param {number} [days]
   * @param {string} [referenceDate]
   */
  movingAverage(signals, signalType, days = WINDOW_SIZES.LAST30, referenceDate) {
    return this.#movingAverageService.compute(signals, signalType, days, referenceDate);
  }

  /**
   * Compute baseline for a signalType from full history.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   */
  baseline(signals, signalType) {
    return this.#baselineService.compute(signals, signalType);
  }
}
