// src/analytics/temperature-engine.js
//
// 責務: 基礎体温の二相性検出と排卵推定
// Phase4 で導入。app-legacy.js L8599 calcTemperaturePhases() を移植・刷新。
// 手法: EWMA (α=0.3) — 単純閾値判定から変更。
// basalTemp/temperature 二重フィールド問題をここで吸収。
// Strangler Pattern: 移植完了後 app-legacy.js の参照を差し替え（別タスク）。
//
// pure function のみ。window参照・副作用なし。

import { calcConfidence } from './confidence-engine.js';
import { sortByDate } from './shared/date-utils.js';

const EWMA_ALPHA = 0.3;
const MIN_READINGS = 10;
const TEMP_MIN = 35.0;
const TEMP_MAX = 38.5;

/**
 * 基礎体温を分析し、二相性・排卵推定・EWMAラインを返す。
 *
 * 移植元: app-legacy.js L8599 calcTemperaturePhases()
 * 差分:
 *   - 体温フィールド: r.basalTemp || r.temperature (basalTemp優先)
 *   - フェーズ判定: 単純閾値 → EWMA α=0.3
 *   - 疾患別アラート: 削除（disease-analyzer 層の責務）
 *
 * @param {object[]} records
 * @returns {{
 *   readings:         { date: string, temp: number }[],
 *   ewmaLine:         { date: string, value: number }[],
 *   phases:           { date: string, value: number, phase: 'low'|'high' }[],
 *   biphasicDetected: boolean,
 *   ovulationEstimate: string | null,
 *   lowPhaseDays:     number,
 *   highPhaseDays:    number,
 *   tempDiff:         number,
 *   confidence:       'high'|'medium'|'low'|'insufficient',
 *   sampleSize:       number
 * }}
 */
export function analyzeTemperature(records) {
  if (!Array.isArray(records)) {
    return _insufficientResult(0);
  }

  const sorted = sortByDate(records);

  const readings = sorted
    .map(r => ({
      date: r.record_date || r.date,
      temp: parseFloat(r.basalTemp || r.temperature || 0),
    }))
    .filter(r => r.date && r.temp > TEMP_MIN && r.temp < TEMP_MAX);

  if (readings.length < MIN_READINGS) {
    return _insufficientResult(readings.length);
  }

  const ewmaLine   = _calcEWMA(readings);
  const shiftResult = _detectShift(ewmaLine);

  return {
    readings,
    ewmaLine,
    ...shiftResult,
    confidence: calcConfidence(readings.length),
    sampleSize: readings.length,
  };
}

// ─── 内部関数 ──────────────────────────────────────────────────

/**
 * EWMA 平滑化ライン (α=0.3) を計算する。
 * @private
 */
function _calcEWMA(readings) {
  let ewma = readings[0].temp;
  return readings.map(r => {
    ewma = EWMA_ALPHA * r.temp + (1 - EWMA_ALPHA) * ewma;
    return { date: r.date, value: Math.round(ewma * 1000) / 1000 };
  });
}

/**
 * EWMA ラインから低温期・高温期の切り替えを検出する。
 * 閾値 = (EWMAmin + EWMAmax) / 2
 * @private
 */
function _detectShift(ewmaLine) {
  const values = ewmaLine.map(p => p.value);
  const minVal  = Math.min(...values);
  const maxVal  = Math.max(...values);
  const threshold = (minVal + maxVal) / 2;
  const tempDiff  = Math.round((maxVal - minVal) * 100) / 100;

  const phases = ewmaLine.map(p => ({
    date:  p.date,
    value: p.value,
    phase: p.value < threshold ? 'low' : 'high',
  }));

  const lowPhaseDays  = _maxStreak(phases, 'low');
  const highPhaseDays = _maxStreak(phases, 'high');

  // 二相性判定: 温度差 0.2℃以上 かつ 低温・高温それぞれ 5 日以上
  const biphasicDetected = tempDiff >= 0.2 && lowPhaseDays >= 5 && highPhaseDays >= 5;

  // 排卵推定: 最後の low→high 切り替え直前の日付
  let ovulationEstimate = null;
  for (let i = phases.length - 1; i >= 1; i--) {
    if (phases[i].phase === 'high' && phases[i - 1].phase === 'low') {
      ovulationEstimate = phases[i - 1].date;
      break;
    }
  }

  return { phases, biphasicDetected, ovulationEstimate, lowPhaseDays, highPhaseDays, tempDiff };
}

/**
 * 指定フェーズの最長連続日数を返す。
 * @private
 */
function _maxStreak(phases, targetPhase) {
  let max = 0;
  let cur = 0;
  for (const p of phases) {
    cur = p.phase === targetPhase ? cur + 1 : 0;
    if (cur > max) max = cur;
  }
  return max;
}

function _insufficientResult(sampleSize) {
  return {
    readings:          [],
    ewmaLine:          [],
    phases:            [],
    biphasicDetected:  false,
    ovulationEstimate: null,
    lowPhaseDays:      0,
    highPhaseDays:     0,
    tempDiff:          0,
    confidence:        'insufficient',
    sampleSize,
  };
}
