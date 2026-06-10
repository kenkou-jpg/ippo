// src/disease/vulvodynia/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { pearsonR } from '../../analytics/shared/stats-utils.js';

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
      burningSensation:   this._calcBurningSensation(records),
      painTrend:          this._calcPainTrend(records),
      stressCorrelation:  this._calcStressCorrelation(records),
    };
  }

  _detectContactTriggers(records) {
    const contactSymptoms = ['外陰部灼熱感', '刺痛', '座位痛'];
    const days = records.filter(r =>
      (r.symptoms || []).some(s => contactSymptoms.includes(s))
    );
    return {
      rate: records.length > 0
        ? Math.round((days.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcSittingCorrelation(records) {
    const sittingDays = records.filter(r => (r.factors || []).includes('長時間座位'));
    const withPain    = sittingDays.filter(r => (r.symptoms || []).includes('座位痛'));
    return {
      sittingDays:     sittingDays.length,
      symptomRate:     sittingDays.length > 0
        ? Math.round((withPain.length / sittingDays.length) * 100) / 100 : 0,
    };
  }

  _assessIsolationRisk(records) {
    const emotionDays = records.filter(r =>
      (r.symptoms || []).some(s => ['不安感', '気分の落ち込み'].includes(s))
    );
    const rate = records.length > 0
      ? Math.round((emotionDays.length / records.length) * 100) / 100 : 0;
    return {
      rate,
      note: rate >= 0.4
        ? 'ひとりで抱え込んでいませんか。この症状は本物です。' : null,
    };
  }

  // 灼熱感の率 + 90日トレンド
  _calcBurningSensation(records) {
    if (!records.length) return { rate: 0, trend: 'stable' };
    const burningDays = records.filter(r =>
      (r.symptoms || []).includes('外陰部灼熱感')
    );
    const rate = Math.round((burningDays.length / records.length) * 100) / 100;

    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));
    const bRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).includes('外陰部灼熱感')).length / arr.length : 0;
    const delta = bRate(r45) - bRate(r90to45);

    return {
      rate,
      trend: delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // 90日間の全体症状率トレンド（前半 vs 後半）
  _calcPainTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));
    const painSymptoms = ['外陰部灼熱感', '刺痛', '座位痛'];
    const sympRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => painSymptoms.includes(s))).length / arr.length : 0;

    const recentRate = sympRate(r45);
    const priorRate  = sympRate(r90to45);
    const delta      = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // ストレス高因子と症状（灼熱感・刺痛）の Pearson 相関
  _calcStressCorrelation(records) {
    if (records.length < 5) return null;
    const painSymptoms = ['外陰部灼熱感', '刺痛', '座位痛'];
    const xs = records.map(r => (r.factors || []).includes('ストレス高') ? 1 : 0);
    const ys = records.map(r =>
      (r.symptoms || []).some(s => painSymptoms.includes(s)) ? 1 : 0
    );
    return pearsonR(xs, ys);
  }
}
