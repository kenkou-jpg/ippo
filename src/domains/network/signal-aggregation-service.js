// signal-aggregation-service.js — Signal集約サービス (PR-031)
// Responsible for: 種類別集計 / 日別集計 / 平均値 / 最新Signal / 件数
// Wave1: in-memory only. No Similarity, DiseaseCluster, DB, Supabase.
// Input: NetworkSignal[] from NetworkSignalService (via ApiGateway).
// NETWORK ASSET COUNCIL (IPPO-COUNCIL-002) NAC-04 Wave1 scope.

import { SIGNAL_TYPE_VALUES } from './network-signal-types.js';

/** Extract YYYY-MM-DD from an ISO timestamp string. */
function _toDateKey(timestamp) {
  if (!timestamp || typeof timestamp !== 'string') return 'unknown';
  return timestamp.slice(0, 10);
}

/**
 * @typedef {{
 *   count:      number,
 *   sum:        number,
 *   average:    number,
 *   min:        number,
 *   max:        number,
 *   latest:     import('./network-signal-entity.js').NetworkSignal | null,
 * }} AggregationStats
 */

/**
 * @typedef {{
 *   byType:  Record<string, AggregationStats>,
 *   byDay:   Record<string, import('./network-signal-entity.js').NetworkSignal[]>,
 *   total:   number,
 * }} AggregationResult
 */

export class SignalAggregationService {
  /**
   * Aggregate an array of NetworkSignals.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {AggregationResult}
   */
  aggregate(signals) {
    if (!Array.isArray(signals)) return { byType: {}, byDay: {}, total: 0 };

    const byType = {};
    const byDay  = {};

    for (const signal of signals) {
      if (!signal || typeof signal !== 'object') continue;

      // byType accumulation
      const type = signal.signalType;
      if (!byType[type]) {
        byType[type] = { count: 0, sum: 0, average: 0, min: Infinity, max: -Infinity, latest: null };
      }
      const stats = byType[type];
      stats.count += 1;
      stats.sum   += signal.normalizedValue ?? 0;
      stats.min    = Math.min(stats.min, signal.normalizedValue ?? 0);
      stats.max    = Math.max(stats.max, signal.normalizedValue ?? 0);
      if (!stats.latest || signal.timestamp > stats.latest.timestamp) {
        stats.latest = signal;
      }

      // byDay accumulation
      const dayKey = _toDateKey(signal.timestamp);
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(signal);
    }

    // finalize averages
    for (const stats of Object.values(byType)) {
      stats.average = stats.count > 0 ? stats.sum / stats.count : 0;
      if (stats.min === Infinity)  stats.min = 0;
      if (stats.max === -Infinity) stats.max = 0;
    }

    return { byType, byDay, total: signals.length };
  }

  /**
   * Aggregate signals of a single type.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {AggregationStats}
   */
  aggregateByType(signals, signalType) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[SignalAggregationService] Unknown signalType: "${signalType}"`);
    }
    const filtered = Array.isArray(signals)
      ? signals.filter(s => s?.signalType === signalType)
      : [];
    const result = this.aggregate(filtered);
    return result.byType[signalType] ?? { count: 0, sum: 0, average: 0, min: 0, max: 0, latest: null };
  }

  /**
   * Group signals by calendar day (YYYY-MM-DD).
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, import('./network-signal-entity.js').NetworkSignal[]>}
   */
  aggregateByDay(signals) {
    if (!Array.isArray(signals)) return {};
    const result = this.aggregate(signals);
    return result.byDay;
  }

  /**
   * Return the most recent signal per type.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, import('./network-signal-entity.js').NetworkSignal>}
   */
  latestByType(signals) {
    if (!Array.isArray(signals)) return {};
    const result = this.aggregate(signals);
    const out = {};
    for (const [type, stats] of Object.entries(result.byType)) {
      if (stats.latest) out[type] = stats.latest;
    }
    return out;
  }

  /**
   * Compute average normalizedValue for a given type.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {number}
   */
  averageByType(signals, signalType) {
    return this.aggregateByType(signals, signalType).average;
  }

  /**
   * Count signals per type.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, number>}
   */
  countByType(signals) {
    if (!Array.isArray(signals)) return {};
    const result = this.aggregate(signals);
    const out = {};
    for (const [type, stats] of Object.entries(result.byType)) {
      out[type] = stats.count;
    }
    return out;
  }
}
