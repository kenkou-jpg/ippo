// src/analytics/lag-correlation-engine.js
//
// 責務: 因子 N 日後の症状出現率を計算（ラグ相関）
// Phase2 で導入。window.* に依存しない独立エンジン。
// 因果推論は行わない。相関分析のみ。
//
// 入力:
//   records: Record[]
//   options: { lagDays?: number[], minOccurrences?: number }
//
// 出力:
//   { factor, symptom, lag, rate, baseRate, relativeRisk,
//     sampleSize, confidence }[]

import { calcConfidence } from './confidence-engine.js';
import { sortByDate } from './shared/date-utils.js';

/**
 * 因子出現から N 日後の症状出現率をラグ別に計算する。
 * @param {object[]} records
 * @param {{ lagDays?: number[], minOccurrences?: number }} [options]
 * @returns {{ factor: string, symptom: string, lag: number, rate: number,
 *             baseRate: number, relativeRisk: number,
 *             sampleSize: number, confidence: string }[]}
 */
export function calcLagCorrelations(records, options = {}) {
  const { lagDays = [1, 2, 3], minOccurrences = 5 } = options;
  if (!Array.isArray(records) || records.length === 0) return [];

  const sorted = sortByDate(records);
  const allFactors  = [...new Set(sorted.flatMap(r => r.factors  || []))];
  const allSymptoms = [...new Set(sorted.flatMap(r => r.symptoms || []))];

  const results = [];

  for (const factor of allFactors) {
    const factorDays = sorted.filter(r => (r.factors || []).includes(factor));
    if (factorDays.length < minOccurrences) continue;

    // 症状のベースライン出現率（全レコード）
    for (const symptom of allSymptoms) {
      const symptomTotal = sorted.filter(r => (r.symptoms || []).includes(symptom)).length;
      const baseRate = sorted.length > 0 ? symptomTotal / sorted.length : 0;

      for (const lag of lagDays) {
        const result = _calcSingleLag(sorted, factor, symptom, lag);
        if (!result) continue;
        if (result.relativeRisk < 1.3) continue;

        results.push({
          factor,
          symptom,
          lag,
          rate:         result.rate,
          baseRate:     Math.round(baseRate * 100) / 100,
          relativeRisk: result.relativeRisk,
          sampleSize:   result.sampleSize,
          confidence:   calcConfidence(result.sampleSize),
        });
      }
    }
  }

  return results.sort((a, b) => b.relativeRisk - a.relativeRisk);
}

/**
 * 1因子・1症状・1ラグの相関を計算する。
 * @private
 */
function _calcSingleLag(sorted, factor, symptom, lag) {
  const dateIndex = new Map(sorted.map((r, i) => [r.record_date || r.date, i]));
  let factorCount = 0;
  let hitCount    = 0;

  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    if (!(r.factors || []).includes(factor)) continue;
    factorCount++;

    const targetDate = _addDays(r.record_date || r.date, lag);
    const targetIdx  = dateIndex.get(targetDate);
    if (targetIdx == null) continue;

    const targetRecord = sorted[targetIdx];
    if ((targetRecord.symptoms || []).includes(symptom)) hitCount++;
  }

  if (factorCount < 3) return null;

  const rate         = hitCount / factorCount;
  const totalSymptom = sorted.filter(r => (r.symptoms || []).includes(symptom)).length;
  const baseRate     = sorted.length > 0 ? totalSymptom / sorted.length : 0;
  const relativeRisk = baseRate > 0 ? Math.round((rate / baseRate) * 10) / 10 : 0;

  return {
    rate:         Math.round(rate * 100) / 100,
    relativeRisk,
    sampleSize:   factorCount,
  };
}

/**
 * YYYY-MM-DD 文字列に N 日を加算して返す。
 * @private
 */
function _addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
