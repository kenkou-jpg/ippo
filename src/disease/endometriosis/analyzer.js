// src/disease/endometriosis/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

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
    const nonMenstrualFlares = this._detectNonMenstrualFlares(records);
    const postSexWorsening   = this._detectPostSexWorsening(records);
    return { nonMenstrualFlares, postSexWorsening };
  }

  _detectNonMenstrualFlares(records) {
    // 生理期間外（menstrualFlow が falsy）でのフレア日数
    const nonMenstrual = records.filter(r =>
      !r.menstrualFlow && r.painLevel >= 5
    );
    return {
      count: nonMenstrual.length,
      rate:  records.length > 0
        ? Math.round((nonMenstrual.length / records.length) * 100) / 100 : 0,
    };
  }

  _detectPostSexWorsening(records) {
    // 性交痛の記録有無（センシティブ症状はユーザーが任意記録）
    const hasSexPain = records.some(r =>
      (r.symptoms || []).includes('性交痛')
    );
    return { recorded: hasSexPain };
  }
}
