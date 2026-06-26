// trend-window-builder.js — Trend Window生成 (PR-032)
// Responsible for: Last7 / Last30 window extraction from NetworkSignal[]
// 欠損データ許容（疎なウィンドウも返す）。
// No Similarity, DiseaseCluster, Prediction, AI.

/** Standard window sizes in days. */
export const WINDOW_SIZES = Object.freeze({ LAST7: 7, LAST30: 30 });

/** Extract YYYY-MM-DD from an ISO timestamp string. */
function _toDateKey(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return null;
  return timestamp.slice(0, 10);
}

/** Return YYYY-MM-DD for (referenceDate - offsetDays). */
function _offsetDate(referenceDate, offsetDays) {
  const d = new Date(referenceDate);
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/**
 * @typedef {{
 *   windowDays:   number,
 *   from:         string,
 *   to:           string,
 *   signals:      import('./network-signal-entity.js').NetworkSignal[],
 *   dayCount:     number,
 *   signalCount:  number,
 * }} TrendWindow
 */

export class TrendWindowBuilder {
  /**
   * Build a window spanning [referenceDate - (days-1), referenceDate].
   * Missing days are tolerated — the window may be sparse.
   *
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {number} days   window size in days (default: LAST30)
   * @param {string} [referenceDate]  YYYY-MM-DD; defaults to today (UTC)
   * @returns {TrendWindow}
   */
  build(signals, days = WINDOW_SIZES.LAST30, referenceDate) {
    if (typeof days !== 'number' || days < 1) {
      throw new RangeError(`[TrendWindowBuilder] days must be a positive integer, got: ${days}`);
    }

    const refDate = referenceDate ?? new Date().toISOString().slice(0, 10);
    const fromDate = _offsetDate(refDate, days - 1);
    const toDate   = refDate;

    const inWindow = Array.isArray(signals)
      ? signals.filter(s => {
          const d = _toDateKey(s?.timestamp);
          return d !== null && d >= fromDate && d <= toDate;
        })
      : [];

    const daySet = new Set(inWindow.map(s => _toDateKey(s.timestamp)).filter(Boolean));

    return Object.freeze({
      windowDays:  days,
      from:        fromDate,
      to:          toDate,
      signals:     inWindow,
      dayCount:    daySet.size,
      signalCount: inWindow.length,
    });
  }

  /**
   * Build Last7 window.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} [referenceDate]
   * @returns {TrendWindow}
   */
  buildLast7(signals, referenceDate) {
    return this.build(signals, WINDOW_SIZES.LAST7, referenceDate);
  }

  /**
   * Build Last30 window.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} [referenceDate]
   * @returns {TrendWindow}
   */
  buildLast30(signals, referenceDate) {
    return this.build(signals, WINDOW_SIZES.LAST30, referenceDate);
  }
}
