// src/disease/pcos/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

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
      cycleIrregularity: this._calcCycleIrregularity(state),
      weightCorrelation: this._detectWeightCorrelation(records),
    };
  }

  _calcCycleIrregularity(state) {
    // cycleLength が 35日超 or データなし → 不規則の可能性
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

  _detectWeightCorrelation(records) {
    // weight フィールドがあるレコードの有無を確認
    const withWeight = records.filter(r => r.weight != null);
    return { recordCount: withWeight.length };
  }
}
