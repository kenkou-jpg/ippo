// ================================================================
//  ippo – src/modules/pro/analysis/analysis-module.js
//  PR2: Analysis Module — 11 PRO機能の分析ロジックを UI から分離
//
//  設計ルール:
//  ・Pure Read Only。records / state を読むのみ、変更禁止。
//  ・副作用なし。DOM操作・保存・キャッシュ禁止。
//  ・analyzeX(records) / buildX(records, state) 形式で呼び出し可能。
//
//  対応機能:
//  1.  analyzePatterns(records)        — AIパターン解析
//  2.  analyzeFlareDays(records)       — 症状が強かった日の共通点
//  3.  analyzeCoOccurrence(records)    — 一緒に起きやすいこと
//  4.  analyzeCycle(records)           — 周期ごとの体調の違い
//  5.  analyzeTemperature(records)     — 体温のリズム
//  6.  buildBodySummary(records, state) — からだサマリー
//  7.  analyzeCondition(records, diseases) — 疾患観察まとめ
//  8.  analyzeSymptomTrends(records)   — 症状推移グラフ
//  9.  buildDoctorSummary(records, state) — 受診用まとめ
//  10. buildMonthlyReport(records, year, month) — 月次レポート
//  11. analyzeExperiments(experiments, records) — ヘルス実験
// ================================================================

import {
  getLastNDays,
  calcSymptomFreq,
  calcDiseaseSymptomFreq,
  calcFlareDays,
  calcPainDays,
  calcAvgSleep,
  calcSleepPainCorr,
  calcAvgTemp,
  getCycleInfo,
  getSortedDates,
  calcPeriodComparison,
  calcSymptomChanges,
} from '../shared/pro-metric-utils.js';
import { DISEASE_CONFIG } from '../../../constants/disease.js';

// ─── 1. AIパターン解析 ────────────────────────────────────────────
/**
 * 90日分のrecordsから多面的なサマリーを生成する。
 * app-legacy.js の buildDataSummary() を流用。
 * @param {Object[]} records - state.records
 * @returns {Object|null}
 */
export function analyzePatterns(records) {
  const fn = window.buildDataSummary;
  if (typeof fn !== 'function') return null;

  const now = new Date();
  const ago90 = new Date(now - 90 * 86400000);
  const fromDate = ago90.toISOString().slice(0, 10);
  const toDate   = now.toISOString().slice(0, 10);

  // buildDataSummary は { record_date, data } 形式を期待する
  const wrapped = (records || [])
    .filter(r => {
      const d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    })
    .map(r => ({ record_date: r.record_date || (r.date ? r.date.slice(0, 10) : ''), data: r }));

  return fn(wrapped);
}

// ─── 2. 症状が強かった日の共通点 ─────────────────────────────────
/**
 * フレアアップ（症状急変）した日とその前後を検出する。
 * app-legacy.js の detectFlareups() を流用。
 * @param {Object[]} records - state.records
 * @returns {Object[]|null} - flareup 配列
 */
export function analyzeFlareDays(records) {
  const fn = window.detectFlareups;
  if (typeof fn !== 'function') return null;
  return fn(records || []);
}

// ─── 3. 一緒に起きやすいこと ────────────────────────────────────
/**
 * 生活ファクターと体調指標の相関を計算する。
 * app-legacy.js の calcFactorCorrelations() を流用。
 * @param {Object[]} records - state.records
 * @returns {Object|null} - { [factor]: { days, totalDays, energy, painLevel, ... } }
 */
export function analyzeCoOccurrence(records) {
  const fn = window.calcFactorCorrelations;
  if (typeof fn !== 'function') return null;
  return fn(records || []);
}

// ─── 4. 周期ごとの体調の違い ─────────────────────────────────────
/**
 * 月経周期フェーズ別の平均体調を計算する。
 * app-legacy.js の analyzeCyclePhases() を流用。
 * @param {Object[]} records - state.records
 * @returns {Object|null} - { 月経期: {...}, 卵胞期: {...}, ... }
 */
export function analyzeCycle(records) {
  const fn = window.analyzeCyclePhases;
  if (typeof fn !== 'function') return null;
  return fn(records || []);
}

// ─── 5. 体温のリズム ─────────────────────────────────────────────
/**
 * 基礎体温から低温期・高温期・二相性を分析する。
 * app-legacy.js の calcTemperaturePhases() を流用。
 * @param {Object[]} records - state.records
 * @returns {Object|null}
 */
export function analyzeTemperature(records) {
  const fn = window.calcTemperaturePhases;
  if (typeof fn !== 'function') return null;
  return fn(records || []);
}

// ─── 6. からだサマリー ───────────────────────────────────────────
/**
 * 過去30日の記録から体調サマリーを生成する。
 * pro-metric-utils を直接使用（generateDoctorSummary の集計部分を抽出）。
 * @param {Object[]} records - state.records
 * @param {Object}   [state] - アプリステート（cycleInfo用）
 * @returns {Object}
 */
export function buildBodySummary(records, state = {}) {
  const DAYS = 30;
  const r30  = getLastNDays(records || [], DAYS);

  const symptomCounts = {};
  const temperatures  = [];
  const energyLevels  = [];
  const wellnessScores = [];
  const painData      = [];
  const medicationCounts = {};
  const factorCounts  = {};

  r30.forEach(r => {
    (r.symptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
    if (r.temperature || r.basalTemp) {
      temperatures.push(parseFloat(r.temperature || r.basalTemp));
    }
    if (r.energy) energyLevels.push(r.energy);
    if (r.wellnessScore !== undefined) wellnessScores.push(r.wellnessScore);
    if ((r.painLevel ?? 0) > 0) painData.push({ date: r.date || r.record_date, level: r.painLevel });
    (r.medication || []).forEach(m => { medicationCounts[m] = (medicationCounts[m] || 0) + 1; });
    (r.factors || []).forEach(f => { factorCounts[f] = (factorCounts[f] || 0) + 1; });
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const topSymptoms = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  return {
    period:          DAYS,
    totalDays:       r30.length,
    topSymptoms,
    symptomCounts,
    flareDays:       calcFlareDays(r30, 4),
    painDays:        calcPainDays(r30, 2),
    avgSleep:        calcAvgSleep(r30),
    avgTemp:         calcAvgTemp(r30),
    avgEnergy:       avg(energyLevels) !== null ? avg(energyLevels).toFixed(1) : null,
    avgWellness:     avg(wellnessScores) !== null ? Math.round(avg(wellnessScores)) : null,
    painData,
    medicationCounts,
    factorCounts,
    ...getCycleInfo(state),
    myDiseases:      state?.myDiseases ?? (state?.myDisease ? [state.myDisease] : []),
  };
}

// ─── 7. 疾患観察まとめ ──────────────────────────────────────────
/**
 * 疾患ごとに90日間の症状傾向・フレア・睡眠相関を返す。
 * condition-summary.js の _aggregateDisease() を汎用化。
 * @param {Object[]} records  - state.records
 * @param {string[]} diseases - 追跡中の疾患名配列
 * @returns {Object[]} - 疾患ごとの分析結果配列
 */
export function analyzeCondition(records, diseases) {
  const DAYS    = 90;
  const r90     = getLastNDays(records || [], DAYS);
  const half    = Math.floor(DAYS / 2);
  const now     = new Date();
  const cutMid  = new Date(now - half * 86400000);
  const cutFull = new Date(now - DAYS * 86400000);

  return (diseases || []).map(disease => {
    const cfg              = DISEASE_CONFIG[disease] ?? {};
    const specificSymptoms = cfg.specificSymptoms ?? [];

    const recentHalf = r90.filter(r => new Date(r.date || r.record_date || '') >= cutMid);
    const prevHalf   = r90.filter(r => {
      const d = new Date(r.date || r.record_date || '');
      return d >= cutFull && d < cutMid;
    });

    const freqRecent = calcDiseaseSymptomFreq(recentHalf, specificSymptoms);
    const freqPrev   = calcDiseaseSymptomFreq(prevHalf,   specificSymptoms);
    const freqMap    = Object.fromEntries(freqPrev.map(({ sym, cnt }) => [sym, cnt]));

    const worsened = freqRecent
      .filter(({ sym, cnt }) => cnt > (freqMap[sym] ?? 0) && cnt > 0)
      .sort((a, b) => b.cnt - a.cnt).slice(0, 3);
    const stable = freqRecent
      .filter(({ sym, cnt }) => cnt <= (freqMap[sym] ?? 0) && cnt > 0)
      .sort((a, b) => b.cnt - a.cnt).slice(0, 3);

    const observations = [];
    if (calcFlareDays(recentHalf, 4) > calcFlareDays(prevHalf, 4)) {
      observations.push('最近の期間でフレアが増加しています');
    }
    const shortSleepCount = recentHalf.filter(r => r.sleepHours > 0 && r.sleepHours < 6).length;
    if (shortSleepCount >= 3) {
      observations.push('睡眠6時間未満の日が増えています（症状悪化と関連しやすい傾向）');
    }
    if (worsened.length > 0) {
      observations.push(`${worsened[0].sym}が最近 ${worsened[0].cnt} 日と増加傾向です`);
    }

    return {
      disease,
      cfg,
      recordCount:     r90.length,
      relatedSymptoms: calcDiseaseSymptomFreq(r90, specificSymptoms),
      flareDays:       calcFlareDays(r90, 4),
      painDays:        calcPainDays(r90, 2),
      sleepCorr:       calcSleepPainCorr(r90),
      worsened,
      stable,
      observations,
    };
  });
}

// ─── 8. 症状推移グラフ ───────────────────────────────────────────
/**
 * 直近30日 vs 前30日の症状・体調の変化を返す。
 * symptom-trends.js の _aggregate() を汎用化。
 * @param {Object[]} records - state.records
 * @returns {Object}
 */
export function analyzeSymptomTrends(records) {
  const DAYS = 30;
  const cmp  = calcPeriodComparison(records || [], DAYS);

  const symMap = {};
  (cmp.curr || []).forEach(r =>
    (r.symptoms || []).forEach(sym => { symMap[sym] = (symMap[sym] || 0) + 1; })
  );
  const topSyms = Object.entries(symMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const prevMap = {};
  (cmp.prev || []).forEach(r =>
    (r.symptoms || []).forEach(sym => { prevMap[sym] = (prevMap[sym] || 0) + 1; })
  );

  const trendItems = topSyms.map(([sym, cnt]) => {
    const prev  = prevMap[sym] ?? 0;
    const delta = cnt - prev;
    const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '→';
    return { sym, cnt, delta, arrow };
  });

  return {
    hasCurr:        cmp.curr.length >= 3,
    hasPrev:        cmp.prev.length >= 3,
    currCount:      cmp.curr.length,
    trendItems,
    recentFlareDays: calcFlareDays(cmp.curr, 4),
    prevFlareDays:   calcFlareDays(cmp.prev, 4),
    delta:           cmp.delta,
  };
}

// ─── 9. 受診用まとめ ────────────────────────────────────────────
/**
 * 医師へ渡す30日間の観察サマリーを生成する。
 * doctor-summary.js の _aggregate() を汎用化。
 * @param {Object[]} records - state.records
 * @param {Object}   [state] - アプリステート（cycleInfo・myDiseases用）
 * @returns {Object}
 */
export function buildDoctorSummary(records, state = {}) {
  const DAYS   = 30;
  const allRec = records || [];
  const r30    = getLastNDays(allRec, DAYS);
  const dates  = getSortedDates(r30);
  const cmp    = calcPeriodComparison(allRec, DAYS);
  const symChg = calcSymptomChanges(cmp.curr, cmp.prev);

  return {
    totalDays:   r30.length,
    period:      dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
    topSymptoms: calcSymptomFreq(r30, 8),
    flareDays:   calcFlareDays(r30, 4),
    painDays:    calcPainDays(r30, 2),
    avgSleep:    calcAvgSleep(r30),
    avgTemp:     calcAvgTemp(r30),
    ...getCycleInfo(state),
    myDiseases:  state?.myDiseases ?? (state?.myDisease ? [state.myDisease] : []),
    comparison:  cmp,
    symChanges:  symChg,
  };
}

// ─── 10. 月次レポート ───────────────────────────────────────────
/**
 * 指定月のrecordsから月次サマリーを生成する（PDF向けデータ構造）。
 * @param {Object[]} records - state.records（全期間）
 * @param {number}   year    - 対象年
 * @param {number}   month   - 対象月（0-indexed）
 * @returns {Object}
 */
export function buildMonthlyReport(records, year, month) {
  const firstDay   = new Date(year, month, 1);
  const lastDay    = new Date(year, month + 1, 0);
  const fromDate   = firstDay.toISOString().slice(0, 10);
  const toDate     = lastDay.toISOString().slice(0, 10);
  const daysInMonth = lastDay.getDate();

  const monthRecs = (records || []).filter(r => {
    const d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
    return d >= fromDate && d <= toDate;
  });

  const symptomCounts  = {};
  const temperatures   = [];
  const fastingHours   = [];
  const energyLevels   = [];
  const wellnessScores = [];
  const scores         = [];
  let mealRecordDays   = 0;
  let noteCount        = 0;

  // 週別症状推移
  const weekSymptoms = [{}, {}, {}, {}];

  monthRecs.forEach(r => {
    (r.symptoms || []).forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });

    const temp = parseFloat(r.temperature || r.basalTemp || 0);
    if (temp > 30) temperatures.push(temp);

    if (r.firstMealTime && r.lastMealTime) {
      const [fh, fm] = r.firstMealTime.split(':').map(Number);
      const [lh, lm] = r.lastMealTime.split(':').map(Number);
      const eating = (lh * 60 + lm) - (fh * 60 + fm);
      if (eating > 0) fastingHours.push(24 - eating / 60);
    }
    if (r.energy) energyLevels.push(r.energy);
    if (r.wellnessScore !== undefined) wellnessScores.push(r.wellnessScore);
    if (r.score) scores.push(Number(r.score));
    if (r.meals || r.mealCount) mealRecordDays++;
    if (r.note && r.note.trim()) noteCount++;

    const day = new Date(r.date || r.record_date || '').getDate();
    const wk  = Math.min(3, Math.floor((day - 1) / 7));
    (r.symptoms || []).forEach(s => {
      weekSymptoms[wk][s] = (weekSymptoms[wk][s] || 0) + 1;
    });
  });

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    year, month,
    fromDate, toDate,
    daysInMonth,
    totalDays:    monthRecs.length,
    recordRate:   Math.round(monthRecs.length / daysInMonth * 100),
    symptomCounts,
    topSymptoms:  topN(symptomCounts, 10),
    flareDays:    calcFlareDays(monthRecs, 4),
    painDays:     calcPainDays(monthRecs, 2),
    avgTemp:      avg(temperatures) !== null ? avg(temperatures).toFixed(2) : null,
    avgSleep:     calcAvgSleep(monthRecs),
    avgEnergy:    avg(energyLevels) !== null ? avg(energyLevels).toFixed(1) : null,
    avgWellness:  avg(wellnessScores) !== null ? Math.round(avg(wellnessScores)) : null,
    avgScore:     avg(scores) !== null ? avg(scores).toFixed(1) : null,
    avgFasting:   avg(fastingHours) !== null ? avg(fastingHours).toFixed(1) : null,
    mealRecordDays,
    noteCount,
    weekSymptoms,
  };
}

// ─── 11. ヘルス実験 ────────────────────────────────────────────
/**
 * 実験リストとrecordsから実験進捗・メトリクスを集計する。
 * @param {Object[]} experiments - state.experiments
 * @param {Object[]} records     - state.records
 * @returns {Object} - { active: [], completed: [], cancelled: [] }
 */
export function analyzeExperiments(experiments, records) {
  const allExp = experiments || [];
  const now    = new Date();

  const _metricAvg = (recs, key) => {
    if (!recs.length) return null;
    let vals = [];
    recs.forEach(r => {
      switch (key) {
        case 'sleep':    if (r.sleepQuality || r.sleepHours) vals.push(r.sleepQuality || r.sleepHours); break;
        case 'pain':     if (r.painLevel)    vals.push(r.painLevel);    break;
        case 'energy':   if (r.energy)       vals.push(r.energy);       break;
        case 'wellness': if (r.wellnessScore !== undefined) vals.push(r.wellnessScore); break;
        case 'symptoms': vals.push((r.symptoms || []).length); break;
        case 'temp':     if (r.basalTemp || r.temperature) vals.push(parseFloat(r.basalTemp || r.temperature)); break;
      }
    });
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const _buildProgress = exp => {
    const start   = new Date(exp.startDate);
    const elapsed = Math.max(0, Math.floor((now - start) / 86400000));
    const progress = Math.min(100, Math.round(elapsed / exp.days * 100));
    const remaining = Math.max(0, exp.days - elapsed);

    // 期間中 vs 前7日のメトリクス比較
    const cut7  = new Date(now - 7  * 86400000);
    const cut14 = new Date(now - 14 * 86400000);
    const curr  = (records || []).filter(r => {
      const d = new Date(r.record_date || r.date || '');
      return !isNaN(d) && d >= start && d >= cut7;
    });
    const prev  = (records || []).filter(r => {
      const d = new Date(r.record_date || r.date || '');
      return !isNaN(d) && d >= cut14 && d < cut7;
    });

    const metrics = ['sleep', 'pain', 'energy', 'wellness', 'symptoms', 'temp'].map(key => ({
      key,
      curr: _metricAvg(curr, key),
      prev: _metricAvg(prev, key),
    })).filter(m => m.curr !== null);

    return { elapsed, progress, remaining, metrics };
  };

  return {
    active:    allExp.filter(e => e.status === 'active').map(exp => ({ ...exp, ..._buildProgress(exp) })),
    completed: allExp.filter(e => e.status === 'completed'),
    cancelled: allExp.filter(e => e.status === 'cancelled'),
    total:     allExp.length,
  };
}
