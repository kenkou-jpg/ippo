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

// ─── Legacy Adapter (Strangler Pattern: PR-D3) ─────────────────
// app-legacy.js の calcTemperaturePhases() 互換シェイムを返す。
// window.analyzeTemperatureLegacy として公開し、5つの呼び出しサイトを置換する。

/**
 * analyzeTemperature() の出力を旧 calcTemperaturePhases() 互換形式に変換する。
 *
 * 旧 API: { status, count, tempDiff, phases, avgLow, avgHigh, biphasic,
 *           mPattern, highPhaseDays, lowPhaseDays, ovulationDate, alerts }
 *
 * @param {object[]} records
 * @returns {object} 旧 calcTemperaturePhases() 互換オブジェクト
 */
export function analyzeTemperatureLegacy(records) {
  const result = analyzeTemperature(records);

  if (result.confidence === 'insufficient') {
    const remaining = Math.max(0, MIN_READINGS - result.sampleSize);
    return {
      status:   'insufficient',
      count:    result.sampleSize,
      required: MIN_READINGS,
      message:  `あと${remaining}日分の記録が必要です（現在${result.sampleSize}日分）`,
    };
  }

  // readings の date → raw temp マップ
  const tempByDate = {};
  result.readings.forEach(r => { tempByDate[r.date] = r.temp; });

  // phases: 旧形式は { date, temp, phase }。raw temp を付与する。
  const phases = result.phases.map(p => ({
    date:  p.date,
    temp:  tempByDate[p.date] ?? p.value,
    phase: p.phase,
  }));

  // avgLow / avgHigh / maxTemp を raw readings から計算
  const lowTemps  = phases.filter(p => p.phase === 'low').map(p => p.temp);
  const highTemps = phases.filter(p => p.phase === 'high').map(p => p.temp);
  const avgLow  = lowTemps.length
    ? Math.round(lowTemps.reduce((a, b) => a + b, 0)  / lowTemps.length  * 100) / 100
    : null;
  const avgHigh = highTemps.length
    ? Math.round(highTemps.reduce((a, b) => a + b, 0) / highTemps.length * 100) / 100
    : null;
  const maxTemp = result.readings.length
    ? Math.max(...result.readings.map(r => r.temp))
    : null;

  const biphasic = result.biphasicDetected
    ? (result.tempDiff >= 0.3 ? 'clear' : 'unclear')
    : 'none';

  return {
    status:        'ready',
    count:         result.sampleSize,
    tempDiff:      result.tempDiff,
    phases,
    avgLow,
    avgHigh,
    biphasic,
    mPattern:      false,
    highPhaseDays: result.highPhaseDays,
    lowPhaseDays:  result.lowPhaseDays,
    ovulationDate: result.ovulationEstimate,
    alerts:        _buildLegacyAlerts(avgLow, avgHigh, maxTemp),
  };
}

function _buildLegacyAlerts(avgLow, avgHigh, maxTemp) {
  const alerts = [];
  if (maxTemp !== null && maxTemp >= 38.0) {
    alerts.push({ level: 'emergency', message: `体温が${maxTemp}℃を記録しています。発熱の可能性があります。医師に相談することをお勧めします。` });
  }
  if (avgLow !== null && avgLow >= 37.0) {
    alerts.push({ level: 'danger', message: `低温期の平均体温が${avgLow}℃と高めです。慢性炎症や甲状腺の問題が疑われる場合があります。` });
  } else if (avgLow !== null && avgLow >= 36.5) {
    alerts.push({ level: 'warning', message: `低温期の平均体温が${avgLow}℃とやや高めです。体温のパターンを継続して記録しましょう。` });
  }
  if (avgHigh !== null && avgHigh >= 37.5) {
    alerts.push({ level: 'danger', message: `高温期の平均体温が${avgHigh}℃と高めです。` });
  }
  return alerts;
}
