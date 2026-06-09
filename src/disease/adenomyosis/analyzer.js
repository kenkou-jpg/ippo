// src/disease/adenomyosis/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { average } from '../../analytics/shared/stats-utils.js';

export class AdenomyosisAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'adenomyosis',
      diseaseNameJa:    '子宮腺筋症',
      specificSymptoms: ['下腹部痛', '腰痛', '経血量増加', '腹部膨満', '倦怠感', '骨盤内重だるさ'],
      relatedFactors:   ['月経中', '生理前', '夜更かし'],
      contexts:         DISEASE_CONTEXTS.adenomyosis || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      painMedsIneffective: this._detectPainMedsPattern(records),
      avgMenstrualPain:    this._avgMenstrualPain(records),
    };
  }

  _detectPainMedsPattern(records) {
    // painLevel が高い（>=7）かつ painMeds の記録があるレコードを確認
    // → 痛み止め使用日にも高痛みが継続するパターン
    const highPainWithMeds = records.filter(r =>
      r.painLevel >= 7 && r.painMeds === true
    );
    return {
      count: highPainWithMeds.length,
      note:  highPainWithMeds.length >= 3
        ? '痛み止めを使用していても高い痛みが記録されている日があります' : null,
    };
  }

  _avgMenstrualPain(records) {
    const menstrualDays = records.filter(r => r.menstrualFlow && r.painLevel != null);
    if (!menstrualDays.length) return null;
    return Math.round(average(menstrualDays.map(r => r.painLevel)) * 10) / 10;
  }
}
