// src/analytics/baseline-engine.js
//
// 責務: 個人ベースライン計算と現状との差分算出
// ベースライン = 最初の30日間の中央値
// 永続化: profiles.baseline_json (JSONB) — 主保存フローと完全分離
//
// Phase2 で導入。pure function のみ。window参照・副作用なし。

import { calcConfidence } from './confidence-engine.js';
import { calcCohenD } from './effect-size-engine.js';
import { sliceDays, sortByDate } from './shared/date-utils.js';
import { median } from './shared/stats-utils.js';

/**
 * 個人ベースラインを算出し、直近との差分を返す。
 * @param {object[]} records
 * @param {{ baselineDays?: number, compareDays?: number }} [options]
 * @returns {{
 *   isBaselineEstablished: boolean,
 *   baseline: object | null,
 *   current: object | null,
 *   deviation: object | null,
 *   confidence: string,
 *   sampleSize: number
 * }}
 */
export function calcBaseline(records, options = {}) {
  const { baselineDays = 30, compareDays = 14 } = options;
  if (!Array.isArray(records) || records.length < 7) {
    return { isBaselineEstablished: false, baseline: null, current: null, deviation: null, confidence: 'insufficient', sampleSize: records?.length ?? 0 };
  }

  const sorted          = sortByDate(records);
  const baselineRecords = sorted.slice(0, baselineDays);
  const recentRecords   = sliceDays(records, compareDays);

  const baseline = _computeMetrics(baselineRecords);
  const current  = _computeMetrics(recentRecords);

  return {
    isBaselineEstablished: baselineRecords.length >= 14,
    baseline,
    current,
    deviation: _computeDeviation(baseline, current, baselineRecords, recentRecords),
    confidence: calcConfidence(baselineRecords.length),
    sampleSize: baselineRecords.length,
  };
}

/**
 * レコード群から主要指標の中央値を算出する。
 * @private
 */
function _computeMetrics(records) {
  if (!records || records.length === 0) return null;

  const pain    = records.map(r => r.painLevel   || 0);
  const energy  = records.map(r => r.energy       || 0).filter(v => v > 0);
  const sleep   = records.map(r => r.sleepHours   || 0).filter(v => v > 0);
  const symptom = records.map(r => (r.symptoms || []).length);

  return {
    pain:         median(pain),
    energy:       energy.length  > 0 ? median(energy)  : null,
    sleep:        sleep.length   > 0 ? median(sleep)   : null,
    symptomCount: median(symptom),
    sampleSize:   records.length,
  };
}

/**
 * ベースラインと現在値の差分・効果量を算出する。
 * @private
 */
function _computeDeviation(baseline, current, baselineRecords, recentRecords) {
  if (!baseline || !current) return null;

  const _delta = (b, c) => (b != null && c != null) ? Math.round((c - b) * 100) / 100 : null;

  const basePain    = baselineRecords.map(r => r.painLevel || 0);
  const recentPain  = recentRecords.map(r => r.painLevel  || 0);
  const painEffect  = calcCohenD(recentPain, basePain);

  return {
    pain:         _delta(baseline.pain,         current.pain),
    energy:       _delta(baseline.energy,       current.energy),
    sleep:        _delta(baseline.sleep,        current.sleep),
    symptomCount: _delta(baseline.symptomCount, current.symptomCount),
    painEffectSize: painEffect,
    direction: (() => {
      const d = _delta(baseline.pain, current.pain);
      if (d == null) return 'unknown';
      return d > 0.5 ? 'worsening' : d < -0.5 ? 'improving' : 'stable';
    })(),
  };
}
