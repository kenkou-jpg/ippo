// src/analytics/cycle-engine.js
//
// 責務: 月経周期フェーズ別の症状・体調分析
// Phase3 で導入。app-legacy.js L482 analyzeCyclePhases() を移植。
// Strangler Pattern: 移植完了後 analysis-module.js の window.analyzeCyclePhases を差し替え。
//
// 出力: { phases: { menstrual, follicular, ovulation, luteal },
//         currentPhase, currentDay, ovulationEstimate, confidence, sampleSize }
//
// pure function のみ。window参照・副作用なし。

import { calcConfidence } from './confidence-engine.js';
import { sortByDate } from './shared/date-utils.js';
import { average, median } from './shared/stats-utils.js';

// 標準的な各フェーズのデフォルト日数（28日周期基準）
const DEFAULT_CYCLE = 28;
const MENSTRUAL_DAYS = 5;   // 月経期: D1〜D5
const LUTEAL_DAYS    = 14;  // 黄体期固定長（排卵後〜次周期前）

/**
 * 月経周期フェーズ別の症状・体調を分析する。
 *
 * 移植元: app-legacy.js L482 analyzeCyclePhases()
 * 差分:
 *   - window.* 依存を排除
 *   - state を第2引数で受け取る（app-legacy は内部stateを直接参照）
 *   - 欠損フィールドをフォールバックで吸収
 *
 * @param {object[]} records
 * @param {object}   [state]   — { lastPeriodDate?: string, cycleLength?: number }
 * @returns {{
 *   phases:            { menstrual: PhaseMetrics, follicular: PhaseMetrics,
 *                        ovulation: PhaseMetrics, luteal: PhaseMetrics },
 *   currentPhase:      'menstrual'|'follicular'|'ovulation'|'luteal'|'unknown',
 *   currentDay:        number | null,
 *   ovulationEstimate: string | null,
 *   confidence:        'high'|'medium'|'low'|'insufficient',
 *   sampleSize:        number
 * }}
 */
export function analyzeCyclePhases(records, state = {}) {
  const { lastPeriodDate, cycleLength = DEFAULT_CYCLE } = state;

  if (!lastPeriodDate || !Array.isArray(records)) {
    return _insufficientResult(0);
  }

  const sorted = sortByDate(records);
  if (sorted.length === 0) return _insufficientResult(0);

  const cycle = Math.max(21, Math.min(60, Number(cycleLength) || DEFAULT_CYCLE));
  const ovulationDay = cycle - LUTEAL_DAYS; // 例: 28日周期→D14

  const phaseMap = { menstrual: [], follicular: [], ovulation: [], luteal: [] };

  for (const r of sorted) {
    const dateStr = r.record_date || r.date;
    if (!dateStr) continue;
    const phase = _getPhase(dateStr, lastPeriodDate, cycle, ovulationDay);
    if (phase) phaseMap[phase].push(r);
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentDay   = _getCycleDay(today, lastPeriodDate, cycle);
  const currentPhase = _getPhase(today, lastPeriodDate, cycle, ovulationDay) || 'unknown';

  // 次回排卵推定日（lastPeriodDateを基点に最新周期）
  const ovulationEstimate = _estimateNextOvulation(lastPeriodDate, cycle, ovulationDay);

  return {
    phases: {
      menstrual:  _computePhaseMetrics(phaseMap.menstrual),
      follicular: _computePhaseMetrics(phaseMap.follicular),
      ovulation:  _computePhaseMetrics(phaseMap.ovulation),
      luteal:     _computePhaseMetrics(phaseMap.luteal),
    },
    currentPhase,
    currentDay,
    ovulationEstimate,
    confidence:  calcConfidence(sorted.length),
    sampleSize:  sorted.length,
  };
}

// ─── 内部関数 ──────────────────────────────────────────────────

/**
 * 指定日付が周期のどのフェーズに属するかを返す。
 * lastPeriodDate を D1 として cycleDay を算出し、フェーズに振り分ける。
 *
 * @private
 * @returns {'menstrual'|'follicular'|'ovulation'|'luteal'|null}
 */
function _getPhase(dateStr, lastPeriodDate, cycleLength, ovulationDay) {
  const day = _getCycleDay(dateStr, lastPeriodDate, cycleLength);
  if (day === null || day < 1) return null;

  if (day <= MENSTRUAL_DAYS)         return 'menstrual';
  if (day <= ovulationDay - 1)       return 'follicular';
  if (day <= ovulationDay + 1)       return 'ovulation';
  if (day <= cycleLength)            return 'luteal';

  // 次周期の月経期（cycleLength超過時）
  return 'menstrual';
}

/**
 * lastPeriodDate を D1 として指定日が何日目かを返す（1-indexed）。
 * 未来日・周期超過はmodで折り返す。
 *
 * @private
 * @returns {number | null}
 */
function _getCycleDay(dateStr, lastPeriodDate, cycleLength) {
  if (!dateStr || !lastPeriodDate) return null;

  const target = new Date(dateStr    + 'T00:00:00Z');
  const base   = new Date(lastPeriodDate + 'T00:00:00Z');

  if (isNaN(target.getTime()) || isNaN(base.getTime())) return null;

  const diffDays = Math.floor((target - base) / 86400000);
  if (diffDays < 0) return null;

  // 複数周期にわたる場合はmodで折り返す
  return (diffDays % cycleLength) + 1;
}

/**
 * 次回排卵推定日を YYYY-MM-DD で返す。
 * lastPeriodDate から現在の周期における排卵日を計算し、
 * 過去日であれば次周期に繰り越す。
 *
 * @private
 * @returns {string | null}
 */
function _estimateNextOvulation(lastPeriodDate, cycleLength, ovulationDay) {
  if (!lastPeriodDate) return null;

  const base  = new Date(lastPeriodDate + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // lastPeriodDate 起点の排卵日
  const ovDate = new Date(base);
  ovDate.setUTCDate(base.getUTCDate() + ovulationDay - 1);

  // 既に過去なら次周期の排卵日
  if (ovDate <= today) {
    ovDate.setUTCDate(ovDate.getUTCDate() + cycleLength);
  }

  return ovDate.toISOString().slice(0, 10);
}

/**
 * フェーズ内のレコード群から主要指標を集計する。
 *
 * @private
 * @returns {PhaseMetrics}
 */
function _computePhaseMetrics(records) {
  if (!records || records.length === 0) {
    return {
      count:        0,
      avgPain:      null,
      avgEnergy:    null,
      avgSleep:     null,
      topSymptoms:  [],
      flareCount:   0,
    };
  }

  const painVals   = records.map(r => r.painLevel   || 0);
  const energyVals = records.map(r => r.energy       || 0).filter(v => v > 0);
  const sleepVals  = records.map(r => r.sleepHours   || 0).filter(v => v > 0);

  const symCounts = {};
  for (const r of records) {
    for (const s of (r.symptoms || [])) {
      symCounts[s] = (symCounts[s] || 0) + 1;
    }
  }
  const topSymptoms = Object.entries(symCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symptom, count]) => ({
      symptom,
      count,
      rate: Math.round((count / records.length) * 100) / 100,
    }));

  const flareCount = records.filter(r =>
    (r.painLevel || 0) >= 6 ||
    ((r.symptoms || []).length >= 3 && (r.energy || 3) <= 2)
  ).length;

  return {
    count:       records.length,
    avgPain:     Math.round(average(painVals) * 10) / 10,
    avgEnergy:   energyVals.length > 0 ? Math.round(average(energyVals) * 10) / 10 : null,
    avgSleep:    sleepVals.length  > 0 ? Math.round(average(sleepVals)  * 10) / 10 : null,
    topSymptoms,
    flareCount,
  };
}

// ─── Cycle Phase Utilities (moved from app-legacy.js Phase 4-C) ───

export function calcCycleDay(recordDate, records) {
  var sorted = (records || []).slice().sort(function(a, b) {
    return new Date(b.record_date || b.date) - new Date(a.record_date || a.date);
  });
  var target = new Date(recordDate).getTime();
  var lastPeriodStart = null;
  for (var i = 0; i < sorted.length; i++) {
    var r = sorted[i];
    var rDate = new Date(r.record_date || r.date).getTime();
    if (rDate > target) continue;
    if (r.menstrualCycle && r.menstrualCycle !== 'なし') {
      var prevDay = null;
      for (var j = 0; j < sorted.length; j++) {
        var diff = rDate - new Date(sorted[j].record_date || sorted[j].date).getTime();
        if (diff === -86400000) { prevDay = sorted[j]; break; }
      }
      if (!prevDay || !prevDay.menstrualCycle || prevDay.menstrualCycle === 'なし') {
        lastPeriodStart = rDate; break;
      }
      continue;
    }
  }
  if (!lastPeriodStart) return null;
  var dayDiff = Math.round((target - lastPeriodStart) / 86400000) + 1;
  return dayDiff > 0 ? dayDiff : null;
}

export function getCyclePhase(cycleDay) {
  if (!cycleDay) return null;
  if (cycleDay <= 5)  return '月経期';
  if (cycleDay <= 13) return '卵胞期';
  if (cycleDay <= 16) return '排卵期';
  if (cycleDay <= 28) return '黄体期';
  return '黄体期後期';
}

export function getCurrentCyclePhase() {
  var s = window.getState ? window.getState() : (window.state || {});
  var cd = calcCycleDay(new Date().toISOString(), s.records || []);
  return getCyclePhase(cd);
}

window.calcCycleDay       = calcCycleDay;
window.getCyclePhase      = getCyclePhase;
window.getCurrentCyclePhase = getCurrentCyclePhase;

function _insufficientResult(sampleSize) {
  const emptyMetrics = {
    count: 0, avgPain: null, avgEnergy: null, avgSleep: null,
    topSymptoms: [], flareCount: 0,
  };
  return {
    phases: {
      menstrual:  emptyMetrics,
      follicular: emptyMetrics,
      ovulation:  emptyMetrics,
      luteal:     emptyMetrics,
    },
    currentPhase:      'unknown',
    currentDay:        null,
    ovulationEstimate: null,
    confidence:        'insufficient',
    sampleSize,
  };
}
