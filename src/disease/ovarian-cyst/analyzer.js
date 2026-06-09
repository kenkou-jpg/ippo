// src/disease/ovarian-cyst/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

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
    // 排卵期（周期14日前後）の症状増悪パターン
    const ovulationPainDays = records.filter(r =>
      r.cycleDay && r.cycleDay >= 12 && r.cycleDay <= 16 && r.painLevel >= 4
    );
    return {
      ovulationPhasePain: {
        count: ovulationPainDays.length,
        rate:  records.length > 0
          ? Math.round((ovulationPainDays.length / records.length) * 100) / 100 : 0,
      },
    };
  }
}
