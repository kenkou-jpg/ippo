// src/disease/vulvodynia/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

export class VulvodyniaAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'vulvodynia',
      diseaseNameJa:    '外陰痛症候群',
      specificSymptoms: ['外陰部灼熱感', '刺痛', '座位痛', '不安感', '不眠', '気分の落ち込み'],
      relatedFactors:   ['長時間座位', 'ストレス高'],
      contexts:         DISEASE_CONTEXTS.vulvodynia || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      contactTriggers:    this._detectContactTriggers(records),
      sittingCorrelation: this._calcSittingCorrelation(records),
      isolationRisk:      this._assessIsolationRisk(records),
    };
  }

  _detectContactTriggers(records) {
    const contactSymptoms = ['外陰部灼熱感', '刺痛', '座位痛'];
    const days = records.filter(r =>
      (r.symptoms || []).some(s => contactSymptoms.includes(s))
    );
    return {
      count: days.length,
      rate:  records.length > 0
        ? Math.round((days.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcSittingCorrelation(records) {
    // 長時間座位の因子がある日の座位痛出現率
    const sittingDays = records.filter(r =>
      (r.factors || []).includes('長時間座位')
    );
    const withPain = sittingDays.filter(r =>
      (r.symptoms || []).includes('座位痛')
    );
    return {
      sittingDays: sittingDays.length,
      painDays:    withPain.length,
      rate: sittingDays.length > 0
        ? Math.round((withPain.length / sittingDays.length) * 100) / 100 : 0,
    };
  }

  _assessIsolationRisk(records) {
    // 不安感・気分の落ち込みが高頻度 → 孤立感リスク
    const emotionDays = records.filter(r =>
      (r.symptoms || []).some(s => ['不安感', '気分の落ち込み'].includes(s))
    );
    const rate = records.length > 0
      ? Math.round((emotionDays.length / records.length) * 100) / 100 : 0;
    return {
      count: emotionDays.length,
      rate,
      note: rate >= 0.4
        ? 'ひとりで抱え込んでいませんか。この症状は本物です。' : null,
    };
  }
}
