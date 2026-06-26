// moving-average-service.js — 移動平均計算 (PR-032)
// Responsible for: 7日/30日移動平均 for Pain/Symptom/Sleep/Menstrual/Exposure
// 予測禁止。平均のみ。他ユーザー比較禁止。
// NAC-04 Wave1 (NETWORK_ASSET_COUNCIL.md).

import { SIGNAL_TYPE_VALUES } from './network-signal-types.js';
import { TrendWindowBuilder, WINDOW_SIZES } from './trend-window-builder.js';

/** Average normalizedValue array, returns 0 for empty. */
function _avg(signals) {
  if (!signals.length) return 0;
  const sum = signals.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0);
  return Math.round((sum / signals.length) * 1000) / 1000;
}

/**
 * @typedef {{
 *   signalType:  string,
 *   windowDays:  number,
 *   average:     number,
 *   count:       number,
 *   from:        string,
 *   to:          string,
 * }} MovingAverageResult
 */

export class MovingAverageService {
  #windowBuilder;

  constructor() {
    this.#windowBuilder = new TrendWindowBuilder();
  }

  /**
   * Compute moving average for a given signalType over a specific window.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @param {number} days  window size in days (7 or 30)
   * @param {string} [referenceDate]  YYYY-MM-DD (defaults to today UTC)
   * @returns {MovingAverageResult}
   */
  compute(signals, signalType, days = WINDOW_SIZES.LAST30, referenceDate) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[MovingAverageService] Unknown signalType: "${signalType}"`);
    }
    if (typeof days !== 'number' || days < 1) {
      throw new RangeError(`[MovingAverageService] days must be a positive integer`);
    }

    const window_ = this.#windowBuilder.build(signals, days, referenceDate);
    const filtered = window_.signals.filter(s => s?.signalType === signalType);

    return {
      signalType,
      windowDays: days,
      average:    _avg(filtered),
      count:      filtered.length,
      from:       window_.from,
      to:         window_.to,
    };
  }

  /**
   * Compute 7-day moving average for a signalType.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @param {string} [referenceDate]
   * @returns {MovingAverageResult}
   */
  compute7(signals, signalType, referenceDate) {
    return this.compute(signals, signalType, WINDOW_SIZES.LAST7, referenceDate);
  }

  /**
   * Compute 30-day moving average for a signalType.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @param {string} [referenceDate]
   * @returns {MovingAverageResult}
   */
  compute30(signals, signalType, referenceDate) {
    return this.compute(signals, signalType, WINDOW_SIZES.LAST30, referenceDate);
  }

  /**
   * Compute both 7-day and 30-day averages for all signal types present.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} [referenceDate]
   * @returns {Record<string, { last7: MovingAverageResult, last30: MovingAverageResult }>}
   */
  computeAll(signals, referenceDate) {
    if (!Array.isArray(signals)) return {};
    const types = new Set(signals.map(s => s?.signalType).filter(t => t && SIGNAL_TYPE_VALUES.has(t)));
    const out = {};
    for (const type of types) {
      out[type] = {
        last7:  this.compute7(signals, type, referenceDate),
        last30: this.compute30(signals, type, referenceDate),
      };
    }
    return out;
  }
}
