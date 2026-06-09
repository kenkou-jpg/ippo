// src/disease/prolapse/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

export class ProlapsAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'prolapse',
      diseaseNameJa:    '骨盤臓器脱',
      specificSymptoms: ['圧迫感', '頻尿', '尿漏れ', '骨盤内重だるさ', '倦怠感'],
      relatedFactors:   ['長時間立位', '長時間座位', '運動した'],
      contexts:         DISEASE_CONTEXTS.prolapse || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      posturalSymptoms: this._detectPosturalPattern(records),
      urinarySymptoms:  this._calcUrinarySymptoms(records),
    };
  }

  _detectPosturalPattern(records) {
    // 長時間立位の因子がある日の症状増悪を確認
    const standingDays = records.filter(r =>
      (r.factors || []).includes('長時間立位')
    );
    const withSymptoms = standingDays.filter(r =>
      (r.symptoms || []).some(s => ['圧迫感', '骨盤内重だるさ'].includes(s))
    );
    return {
      standingDays: standingDays.length,
      symptomDays:  withSymptoms.length,
      rate: standingDays.length > 0
        ? Math.round((withSymptoms.length / standingDays.length) * 100) / 100 : 0,
    };
  }

  _calcUrinarySymptoms(records) {
    const urinaryDays = records.filter(r =>
      (r.symptoms || []).some(s => ['頻尿', '尿漏れ'].includes(s))
    );
    return {
      count: urinaryDays.length,
      rate:  records.length > 0
        ? Math.round((urinaryDays.length / records.length) * 100) / 100 : 0,
    };
  }
}
