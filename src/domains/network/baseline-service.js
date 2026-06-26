// baseline-service.js — ユーザー自身の基準値生成 (PR-032)
// Responsible for: Pain/Sleep/Symptom/Exposure/Menstrual のベースライン計算
// 他ユーザー比較禁止。自身の履歴のみ。予測禁止。AI禁止。
// NAC-04 Wave1 (NETWORK_ASSET_COUNCIL.md).

import { SIGNAL_TYPES, SIGNAL_TYPE_VALUES } from './network-signal-types.js';

/** Average of normalizedValue array. */
function _avg(signals) {
  if (!signals.length) return null;
  const sum = signals.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0);
  return Math.round((sum / signals.length) * 1000) / 1000;
}

/** Standard deviation of normalizedValue array. */
function _stddev(signals, mean) {
  if (signals.length < 2) return null;
  const variance = signals.reduce((s, sig) => s + Math.pow((sig.normalizedValue ?? 0) - mean, 2), 0) / signals.length;
  return Math.round(Math.sqrt(variance) * 1000) / 1000;
}

/** Min/max of normalizedValue. */
function _minmax(signals) {
  if (!signals.length) return { min: null, max: null };
  let min = Infinity, max = -Infinity;
  for (const s of signals) {
    const v = s.normalizedValue ?? 0;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/**
 * @typedef {{
 *   signalType:    string,
 *   mean:          number | null,
 *   stddev:        number | null,
 *   min:           number | null,
 *   max:           number | null,
 *   sampleCount:   number,
 *   computedAt:    string,
 * }} BaselineResult
 */

export class BaselineService {
  /**
   * Compute baseline statistics for a given signalType from all available signals.
   * Uses the full signal history (no window restriction).
   * Other-user comparison is forbidden — signals must be scoped to one user by the caller.
   *
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} signalType
   * @returns {BaselineResult}
   */
  compute(signals, signalType) {
    if (!SIGNAL_TYPE_VALUES.has(signalType)) {
      throw new Error(`[BaselineService] Unknown signalType: "${signalType}"`);
    }

    const filtered = Array.isArray(signals)
      ? signals.filter(s => s?.signalType === signalType)
      : [];

    const mean     = _avg(filtered);
    const { min, max } = _minmax(filtered);
    const stddev_  = mean !== null ? _stddev(filtered, mean) : null;

    return {
      signalType,
      mean,
      stddev:      stddev_,
      min,
      max,
      sampleCount: filtered.length,
      computedAt:  new Date().toISOString(),
    };
  }

  /**
   * Compute baselines for all signal types present in the signals array.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, BaselineResult>}
   */
  computeAll(signals) {
    if (!Array.isArray(signals)) return {};
    const types = new Set(signals.map(s => s?.signalType).filter(t => t && SIGNAL_TYPE_VALUES.has(t)));
    const out = {};
    for (const type of types) {
      out[type] = this.compute(signals, type);
    }
    return out;
  }

  /**
   * Compute baselines for the canonical Wave1 signal types:
   * PAIN, SLEEP, SYMPTOM, EXPOSURE, MENSTRUAL.
   * Always returns all 5 keys; missing types yield null mean.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {Record<string, BaselineResult>}
   */
  computeWave1(signals) {
    const wave1Types = [
      SIGNAL_TYPES.PAIN,
      SIGNAL_TYPES.SLEEP,
      SIGNAL_TYPES.SYMPTOM,
      SIGNAL_TYPES.EXPOSURE,
      SIGNAL_TYPES.MENSTRUAL,
    ];
    const out = {};
    for (const type of wave1Types) {
      out[type] = this.compute(Array.isArray(signals) ? signals : [], type);
    }
    return out;
  }
}
