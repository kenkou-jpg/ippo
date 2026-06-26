// signal-trend-service.js — Signal時系列トレンド解析 (PR-031)
// Responsible for: Pain/Sleep/Symptom/Menstrual/Exposure の方向性判定
// Wave1: 簡易実装 (直近N件の平均比較)。30日ローリング平均はNAC-04 Wave2。
// No Similarity, DiseaseCluster, DB, Supabase.

import { SIGNAL_TYPES, SIGNAL_TYPE_VALUES } from './network-signal-types.js';

/** Trend direction constants. */
export const TREND_DIRECTION = Object.freeze({
  IMPROVING:  'Improving',
  STABLE:     'Stable',
  WORSENING:  'Worsening',
  INCREASING: 'Increasing',
  DECREASING: 'Decreasing',
  UNKNOWN:    'Unknown',
});

/** Minimum data points needed to compute a trend. */
const MIN_DATA_POINTS = 2;

/** Delta threshold below which we consider trend Stable. */
const STABLE_THRESHOLD = 0.05;

/**
 * @typedef {{
 *   signalType:  string,
 *   direction:   string,
 *   delta:       number,
 *   dataPoints:  number,
 *   recentAvg:   number,
 *   olderAvg:    number,
 * }} TrendResult
 */

/** Sort signals by timestamp ascending. */
function _sortAscending(signals) {
  return [...signals].sort((a, b) => {
    const ta = a.timestamp ?? '';
    const tb = b.timestamp ?? '';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

/** Average normalizedValue of an array slice. */
function _avg(signals) {
  if (!signals.length) return 0;
  return signals.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0) / signals.length;
}

/**
 * Map delta → direction for "lower is better" signals (PAIN, SYMPTOM).
 * Negative delta means recent avg < older avg → Improving.
 */
function _directionLowerBetter(delta) {
  if (Math.abs(delta) < STABLE_THRESHOLD) return TREND_DIRECTION.STABLE;
  return delta < 0 ? TREND_DIRECTION.IMPROVING : TREND_DIRECTION.WORSENING;
}

/**
 * Map delta → direction for "higher is better / neutral" signals (SLEEP).
 * Positive delta means recent avg > older avg → Increasing.
 */
function _directionHigherBetter(delta) {
  if (Math.abs(delta) < STABLE_THRESHOLD) return TREND_DIRECTION.STABLE;
  return delta > 0 ? TREND_DIRECTION.INCREASING : TREND_DIRECTION.DECREASING;
}

/**
 * Map delta → direction for neutral signals (MENSTRUAL, EXPOSURE, EMOTION).
 * Simply Increasing / Stable / Decreasing.
 */
function _directionNeutral(delta) {
  if (Math.abs(delta) < STABLE_THRESHOLD) return TREND_DIRECTION.STABLE;
  return delta > 0 ? TREND_DIRECTION.INCREASING : TREND_DIRECTION.DECREASING;
}

export class SignalTrendService {
  /**
   * Compute trend for a given signalType from the provided signals.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {TrendResult}
   */
  trend(signals, signalType) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[SignalTrendService] Unknown signalType: "${signalType}"`);
    }

    const filtered = Array.isArray(signals)
      ? signals.filter(s => s?.signalType === signalType)
      : [];

    if (filtered.length < MIN_DATA_POINTS) {
      return {
        signalType,
        direction:  TREND_DIRECTION.UNKNOWN,
        delta:      0,
        dataPoints: filtered.length,
        recentAvg:  filtered.length === 1 ? (filtered[0].normalizedValue ?? 0) : 0,
        olderAvg:   0,
      };
    }

    const sorted = _sortAscending(filtered);
    const half   = Math.ceil(sorted.length / 2);
    const older  = sorted.slice(0, half);
    const recent = sorted.slice(half);

    const olderAvg  = _avg(older);
    const recentAvg = _avg(recent);
    const delta     = recentAvg - olderAvg;

    let direction;
    switch (signalType) {
      case SIGNAL_TYPES.PAIN:
      case SIGNAL_TYPES.SYMPTOM:
        direction = _directionLowerBetter(delta);
        break;
      case SIGNAL_TYPES.SLEEP:
        direction = _directionHigherBetter(delta);
        break;
      default:
        direction = _directionNeutral(delta);
    }

    return {
      signalType,
      direction,
      delta:      Math.round(delta * 1000) / 1000,
      dataPoints: filtered.length,
      recentAvg:  Math.round(recentAvg * 1000) / 1000,
      olderAvg:   Math.round(olderAvg  * 1000) / 1000,
    };
  }

  /**
   * Compute trends for all signal types present in the provided signals.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, TrendResult>}
   */
  trendAll(signals) {
    if (!Array.isArray(signals)) return {};
    const types = new Set(signals.map(s => s?.signalType).filter(Boolean));
    const out = {};
    for (const type of types) {
      if (SIGNAL_TYPE_VALUES.has(type)) {
        out[type] = this.trend(signals, type);
      }
    }
    return out;
  }
}
