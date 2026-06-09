// src/analytics/flare-engine.js
//
// 責務: フレアアップ検出と原因特定
// Phase2 で導入。app-legacy.js L9595 detectFlareups() を移植・拡張。
// Strangler Pattern: 移植完了後 analysis-module.js の window.* 参照を差し替え。
// app-legacy.js 内の detectFlareups() は削除しない（並行稼働）。
//
// 出力: { flares[], topTriggers[], flareRate, avgFlarePain,
//         confidence, sampleSize }

import { calcConfidence } from './confidence-engine.js';
import { sortByDate } from './shared/date-utils.js';

/**
 * フレアアップを検出し、上位トリガーを特定する。
 * @param {object[]} records
 * @param {{ painThreshold?: number, lookbackDays?: number }} [options]
 * @returns {{
 *   flares: { date: string, painLevel: number, symptoms: string[],
 *             severity: 'severe'|'moderate'|'mild' }[],
 *   topTriggers: { factor: string, count: number, rate: number }[],
 *   flareRate: number,
 *   avgFlarePain: number,
 *   confidence: string,
 *   sampleSize: number
 * }}
 */
export function detectFlares(records, options = {}) {
  const { painThreshold = 6, lookbackDays = 2 } = options;
  if (!Array.isArray(records) || records.length === 0) {
    return _emptyResult();
  }

  const sorted = sortByDate(records);

  const flares = sorted
    .filter(r =>
      (r.painLevel || 0) >= painThreshold ||
      ((r.symptoms?.length || 0) >= 3 && (r.energy || 3) <= 2)
    )
    .map(r => ({
      date:       r.record_date || r.date,
      painLevel:  r.painLevel || 0,
      symptoms:   r.symptoms || [],
      severity:   (r.painLevel || 0) >= 8 ? 'severe'
                : (r.painLevel || 0) >= 6 ? 'moderate'
                : 'mild',
    }));

  const triggerCounts = {};
  const dateToIdx = new Map(sorted.map((r, i) => [r.record_date || r.date, i]));

  for (const flare of flares) {
    const idx = dateToIdx.get(flare.date);
    if (idx == null) continue;
    for (let d = 1; d <= lookbackDays; d++) {
      const prior = sorted[idx - d];
      if (!prior) continue;
      for (const f of (prior.factors || [])) {
        triggerCounts[f] = (triggerCounts[f] || 0) + 1;
      }
    }
  }

  const topTriggers = Object.entries(triggerCounts)
    .map(([factor, count]) => ({
      factor,
      count,
      rate: flares.length > 0 ? Math.round((count / flares.length) * 100) / 100 : 0,
    }))
    .filter(t => t.rate >= 0.2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 5);

  const avgFlarePain = flares.length > 0
    ? Math.round(flares.reduce((s, f) => s + f.painLevel, 0) / flares.length * 10) / 10
    : 0;

  return {
    flares,
    topTriggers,
    flareRate:    sorted.length > 0 ? Math.round((flares.length / sorted.length) * 100) / 100 : 0,
    avgFlarePain,
    confidence:   calcConfidence(sorted.length),
    sampleSize:   sorted.length,
  };
}

function _emptyResult() {
  return {
    flares:       [],
    topTriggers:  [],
    flareRate:    0,
    avgFlarePain: 0,
    confidence:   'insufficient',
    sampleSize:   0,
  };
}
