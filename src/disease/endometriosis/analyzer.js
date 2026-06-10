// src/disease/endometriosis/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { average } from '../../analytics/shared/stats-utils.js';

export class EndometriosisAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'endometriosis',
      diseaseNameJa:    '子宮内膜症',
      specificSymptoms: ['下腹部痛', '腰痛', '排便痛', '性交痛', '倦怠感', '不正出血', '骨盤内重だるさ'],
      relatedFactors:   ['ストレス高', '夜更かし', '運動した', '生理前', '月経中'],
      contexts:         DISEASE_CONTEXTS.endometriosis || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    const nonMenstrualFlareProfile = this._calcNonMenstrualFlareProfile(records);
    return {
      // nonMenstrualFlares は後方互換エイリアス（旧フィールド名）
      nonMenstrualFlares:       { count: nonMenstrualFlareProfile.count, rate: nonMenstrualFlareProfile.rate },
      nonMenstrualFlareProfile,
      postSexWorsening:         this._detectPostSexWorsening(records),
      cyclePainCorrelation:     this._calcCyclePainCorrelation(records),
    };
  }

  _calcNonMenstrualFlareProfile(records) {
    const nonMenstrual = records.filter(r => !r.menstrualFlow && r.painLevel >= 5);
    const menstrual    = records.filter(r =>  r.menstrualFlow && r.painLevel >= 5);
    return {
      count:         nonMenstrual.length,
      rate:          records.length > 0
        ? Math.round((nonMenstrual.length / records.length) * 100) / 100 : 0,
      avgPain:       nonMenstrual.length
        ? Math.round(average(nonMenstrual.map(r => r.painLevel)) * 10) / 10 : null,
      menstrualRate: records.length > 0
        ? Math.round((menstrual.length / records.length) * 100) / 100 : 0,
    };
  }

  _detectPostSexWorsening(records) {
    const hasSexPain = records.some(r => (r.symptoms || []).includes('性交痛'));
    return { recorded: hasSexPain };
  }

  // 月経中 vs 非月経中の平均痛みレベル比較
  _calcCyclePainCorrelation(records) {
    const menstrualDays    = records.filter(r => r.menstrualFlow && r.painLevel != null);
    const nonMenstrualDays = records.filter(r => !r.menstrualFlow && r.painLevel != null);
    if (!menstrualDays.length && !nonMenstrualDays.length) return null;

    const menstrualAvgPain    = menstrualDays.length
      ? Math.round(average(menstrualDays.map(r => r.painLevel)) * 10) / 10 : null;
    const nonMenstrualAvgPain = nonMenstrualDays.length
      ? Math.round(average(nonMenstrualDays.map(r => r.painLevel)) * 10) / 10 : null;
    const delta = (menstrualAvgPain != null && nonMenstrualAvgPain != null)
      ? Math.round((menstrualAvgPain - nonMenstrualAvgPain) * 10) / 10 : null;

    return { menstrualAvgPain, nonMenstrualAvgPain, delta };
  }
}
