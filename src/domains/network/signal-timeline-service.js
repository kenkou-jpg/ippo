// signal-timeline-service.js — Signal時系列ビルダー (PR-031)
// Responsible for: Record順にSignalをソートし日別にグループ化する
// Output: JSON only. No UI dependency.
// Wave1: in-memory. No Similarity, DiseaseCluster, DB, Supabase.

/** Extract YYYY-MM-DD from an ISO timestamp string. */
function _toDateKey(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return 'unknown';
  return timestamp.slice(0, 10);
}

/**
 * @typedef {{
 *   date:    string,
 *   signals: import('./network-signal-entity.js').NetworkSignal[],
 *   count:   number,
 * }} TimelineDay
 */

/**
 * @typedef {{
 *   days:        TimelineDay[],
 *   totalDays:   number,
 *   totalSignals: number,
 *   from:        string | null,
 *   to:          string | null,
 * }} TimelineResult
 */

export class SignalTimelineService {
  /**
   * Build a chronological timeline from a flat NetworkSignal array.
   * Signals are sorted by timestamp ascending; grouped by calendar day.
   *
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {TimelineResult}
   */
  buildTimeline(signals) {
    if (!Array.isArray(signals) || signals.length === 0) {
      return { days: [], totalDays: 0, totalSignals: 0, from: null, to: null };
    }

    // Sort ascending by timestamp
    const sorted = [...signals].sort((a, b) => {
      const ta = a?.timestamp ?? '';
      const tb = b?.timestamp ?? '';
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

    // Group by day
    const dayMap = new Map();
    for (const signal of sorted) {
      if (!signal || typeof signal !== 'object') continue;
      const key = _toDateKey(signal.timestamp);
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key).push(signal);
    }

    const days = [...dayMap.entries()].map(([date, daySignals]) => ({
      date,
      signals: daySignals,
      count:   daySignals.length,
    }));

    return {
      days,
      totalDays:    days.length,
      totalSignals: sorted.length,
      from: days.length > 0 ? days[0].date : null,
      to:   days.length > 0 ? days[days.length - 1].date : null,
    };
  }

  /**
   * Build timeline filtered to a date range [fromDate, toDate] (YYYY-MM-DD inclusive).
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} fromDate  YYYY-MM-DD
   * @param {string} toDate    YYYY-MM-DD
   * @returns {TimelineResult}
   */
  buildTimelineRange(signals, fromDate, toDate) {
    if (!Array.isArray(signals)) return this.buildTimeline([]);
    const filtered = signals.filter(s => {
      const day = _toDateKey(s?.timestamp);
      return day >= fromDate && day <= toDate;
    });
    return this.buildTimeline(filtered);
  }

  /**
   * Build timeline filtered to a single signalType.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {TimelineResult}
   */
  buildTimelineByType(signals, signalType) {
    if (!Array.isArray(signals)) return this.buildTimeline([]);
    const filtered = signals.filter(s => s?.signalType === signalType);
    return this.buildTimeline(filtered);
  }
}
