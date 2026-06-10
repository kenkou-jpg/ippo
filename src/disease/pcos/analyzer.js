// src/disease/pcos/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

export class PCOSAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'pcos',
      diseaseNameJa:    'PCOS',
      specificSymptoms: ['倦怠感', 'ブレインフォグ', '食欲増加', '肌荒れ', '気分の落ち込み', 'むくみ'],
      relatedFactors:   ['糖質過多', 'ストレス高', '夜更かし', '運動した'],
      contexts:         DISEASE_CONTEXTS.pcos || {},
    });
  }

  analyzeDiseaseSpecific(records, state) {
    return {
      cycleIrregularity:     this._calcCycleIrregularity(state),
      weightCorrelation:     this._calcWeightCorrelation(records),
      insulinResistanceProxy: this._calcInsulinResistanceProxy(records),
    };
  }

  _calcCycleIrregularity(state) {
    const cycleLength = state?.cycleLength;
    if (!cycleLength) return { irregular: null, cycleLength: null };
    return {
      irregular:   cycleLength > 35 || cycleLength < 21,
      cycleLength,
      note: cycleLength > 35
        ? '月経周期が長め（35日超）です'
        : cycleLength < 21 ? '月経周期が短め（21日未満）です' : null,
    };
  }

  _calcWeightCorrelation(records) {
    const withWeight = records.filter(r => r.weight != null && r.painLevel != null);
    if (withWeight.length < 5) return { recordCount: withWeight.length, correlation: null };

    // 体重と症状出現の Pearson 相関
    const xs = withWeight.map(r => r.weight);
    const ys = withWeight.map(r =>
      (r.symptoms || []).some(s => ['倦怠感', 'むくみ', '食欲増加'].includes(s)) ? 1 : 0
    );
    const avgWeight = Math.round(average(xs) * 10) / 10;
    return {
      recordCount:     withWeight.length,
      avgWeight,
      sympCorrelation: pearsonR(xs, ys),
    };
  }

  // インスリン抵抗性の代理指標: 糖質過多因子と倦怠感・食欲増加の共起率
  _calcInsulinResistanceProxy(records) {
    if (!records.length) return { rate: 0, note: null };
    const irSymptoms = ['倦怠感', '食欲増加', 'ブレインフォグ'];
    const highCarbWithSymptoms = records.filter(r =>
      (r.factors || []).includes('糖質過多') &&
      (r.symptoms || []).some(s => irSymptoms.includes(s))
    );
    const rate = Math.round((highCarbWithSymptoms.length / records.length) * 100) / 100;
    return {
      rate,
      note: rate >= 0.15
        ? '糖質が多い日に倦怠感・食欲増加が重なる傾向があります。インスリン抵抗性のサインである可能性があります。' : null,
    };
  }
}
