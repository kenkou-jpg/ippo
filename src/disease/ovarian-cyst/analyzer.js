// src/disease/ovarian-cyst/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

export class OvarianCystAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'ovarianCyst',
      diseaseNameJa:    '卵巣嚢腫',
      specificSymptoms: ['下腹部痛', '腹部膨満', '頻尿', '腰痛', '倦怠感', '骨盤内重だるさ'],
      relatedFactors:   ['長時間座位', '運動した', '生理前'],
      contexts:         DISEASE_CONTEXTS.ovarianCyst || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      ovulationPhasePain:  this._calcOvulationPhasePain(records),
      cyclicPainProfile:   this._calcCyclicPainProfile(records),
      painTrend:           this._calcPainTrend(records),
      factorCorrelations:  this._calcFactorCorrelations(records),
    };
  }

  // 排卵期（cycleDay 12-16）での痛みレベル率
  _calcOvulationPhasePain(records) {
    const ovulationDays = records.filter(r =>
      r.cycleDay && r.cycleDay >= 12 && r.cycleDay <= 16
    );
    if (!ovulationDays.length) return { rate: 0, avgPain: null };
    const painDays = ovulationDays.filter(r => r.painLevel >= 4);
    return {
      rate:    Math.round((painDays.length / ovulationDays.length) * 100) / 100,
      avgPain: Math.round(average(ovulationDays.map(r => r.painLevel ?? 0)) * 10) / 10,
    };
  }

  // 月経期・排卵期・黄体期の痛みプロファイル（cycleDay ベース）
  _calcCyclicPainProfile(records) {
    const withCycleDay = records.filter(r => r.cycleDay != null && r.painLevel != null);
    if (withCycleDay.length < 5) return null;

    const phases = {
      menstrual:  withCycleDay.filter(r => r.cycleDay >= 1  && r.cycleDay <= 5),
      ovulation:  withCycleDay.filter(r => r.cycleDay >= 12 && r.cycleDay <= 16),
      luteal:     withCycleDay.filter(r => r.cycleDay >= 20 && r.cycleDay <= 28),
    };

    const phaseAvg = (arr) => arr.length
      ? Math.round(average(arr.map(r => r.painLevel)) * 10) / 10 : null;

    return {
      menstrualAvgPain: phaseAvg(phases.menstrual),
      ovulationAvgPain: phaseAvg(phases.ovulation),
      lutealAvgPain:    phaseAvg(phases.luteal),
      peakPhase: Object.entries({
        menstrual: phaseAvg(phases.menstrual) ?? 0,
        ovulation: phaseAvg(phases.ovulation) ?? 0,
        luteal:    phaseAvg(phases.luteal)    ?? 0,
      }).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    };
  }

  // 90日トレンド（痛み率の前半 vs 後半比較）
  _calcPainTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const painRate = (arr) => arr.length
      ? arr.filter(r => r.painLevel >= 4).length / arr.length : 0;

    const recentRate = painRate(r45);
    const priorRate  = painRate(r90to45);
    const delta      = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // 長時間座位・運動因子と症状出現の相関
  _calcFactorCorrelations(records) {
    if (records.length < 5) return null;
    const sympSymptoms = ['下腹部痛', '腹部膨満', '骨盤内重だるさ'];
    const sympRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => sympSymptoms.includes(s))).length / arr.length : 0;

    const results = {};
    for (const factor of ['長時間座位', '運動した']) {
      const withF    = records.filter(r => (r.factors || []).includes(factor));
      const withoutF = records.filter(r => !(r.factors || []).includes(factor));
      if (!withF.length || !withoutF.length) continue;
      const wr = sympRate(withF);
      const nr = sympRate(withoutF);
      results[factor] = {
        withFactorRate:    Math.round(wr * 100) / 100,
        withoutFactorRate: Math.round(nr * 100) / 100,
        relativeRisk:      nr > 0 ? Math.round((wr / nr) * 100) / 100 : null,
      };
    }

    // 痛みレベルと腹部膨満の Pearson 相関
    const xs = records.map(r => r.painLevel ?? 0);
    const ys = records.map(r => (r.symptoms || []).includes('腹部膨満') ? 1 : 0);
    const painBloatCorr = pearsonR(xs, ys);

    return {
      byFactor:           Object.keys(results).length ? results : null,
      painBloatCorrelation: painBloatCorr,
    };
  }
}
