// src/disease/fibroid/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

export class FibroidAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'fibroid',
      diseaseNameJa:    '子宮筋腫',
      specificSymptoms: ['下腹部痛', '腹部膨満', '頻尿', '経血量増加', '倦怠感', '不正出血', '圧迫感'],
      relatedFactors:   ['月経中', '長時間立位', '長時間座位'],
      contexts:         DISEASE_CONTEXTS.fibroid || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      heavyFlowTrend:       this._calcHeavyFlowTrend(records),
      flareProfile:         this._calcFlareProfile(records),
      symptomTrend:         this._calcSymptomTrend(records),
      menstrualCorrelation: this._calcMenstrualCorrelation(records),
      anemiaRisk:           this._calcAnemiaRisk(records),
      bulkSymptomRate:      this._calcBulkSymptomRate(records),
    };
  }

  // 経血量増加の 30日 vs 前30日 の変化方向
  _calcHeavyFlowTrend(records) {
    const r30      = sliceDays(records, 30);
    const r60to30  = sliceDays(records, 60).filter(r => !r30.includes(r));
    const rate     = arr => arr.length
      ? arr.filter(r => (r.symptoms || []).includes('経血量増加')).length / arr.length : 0;
    const recent   = rate(r30);
    const prior    = rate(r60to30);
    const delta    = Math.round((recent - prior) * 100) / 100;
    return {
      recentRate:  Math.round(recent * 100) / 100,
      priorRate:   Math.round(prior  * 100) / 100,
      delta,
      direction:   delta > 0.05 ? 'increasing' : delta < -0.05 ? 'decreasing' : 'stable',
    };
  }

  // 月経中のフレア（痛み >= 6 かつ 経血量増加）プロファイル
  _calcFlareProfile(records) {
    if (!records.length) return { rate: 0, avgPainOnFlare: null, topSymptoms: [] };
    const menstrualFlares = records.filter(r =>
      (r.factors || []).includes('月経中') && r.painLevel >= 6
    );
    const sympFreq = {};
    for (const r of menstrualFlares) {
      for (const s of (r.symptoms || [])) {
        if (this.specificSymptoms.includes(s)) sympFreq[s] = (sympFreq[s] || 0) + 1;
      }
    }
    const topSymptoms = Object.entries(sympFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    return {
      rate:          Math.round((menstrualFlares.length / records.length) * 100) / 100,
      avgPainOnFlare: menstrualFlares.length
        ? Math.round(average(menstrualFlares.map(r => r.painLevel)) * 10) / 10 : null,
      topSymptoms,
    };
  }

  // 90日を前半・後半に分けた症状率トレンド
  _calcSymptomTrend(records) {
    const r90   = sliceDays(records, 90);
    const r45   = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));
    const sympRate = (arr, syms) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => syms.includes(s))).length / arr.length : 0;

    const keySymptoms = ['経血量増加', '下腹部痛', '腹部膨満'];
    const recentRate  = sympRate(r45, keySymptoms);
    const priorRate   = sympRate(r90to45, keySymptoms);
    const delta       = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // 月経中ファクターと症状出現の相関（因子あり vs なしの症状率比較）
  _calcMenstrualCorrelation(records) {
    if (records.length < 5) return null;
    const withFactor    = records.filter(r => (r.factors || []).includes('月経中'));
    const withoutFactor = records.filter(r => !(r.factors || []).includes('月経中'));
    if (!withFactor.length || !withoutFactor.length) return null;

    const rate = (arr) => arr.filter(r =>
      (r.symptoms || []).some(s => ['経血量増加', '下腹部痛', '腹部膨満'].includes(s))
    ).length / arr.length;

    const withRate    = Math.round(rate(withFactor)    * 100) / 100;
    const withoutRate = Math.round(rate(withoutFactor) * 100) / 100;
    return {
      withFactorRate:    withRate,
      withoutFactorRate: withoutRate,
      relativeRisk:      withoutRate > 0
        ? Math.round((withRate / withoutRate) * 100) / 100 : null,
    };
  }

  // 圧迫感・腹部膨満・頻尿の合計率（筋腫による圧迫症状の重症度）
  _calcBulkSymptomRate(records) {
    if (!records.length) return { rate: 0, note: null };
    const bulkSymptoms = ['腹部膨満', '圧迫感', '頻尿'];
    const bulkDays = records.filter(r =>
      (r.symptoms || []).some(s => bulkSymptoms.includes(s))
    );
    const rate = Math.round((bulkDays.length / records.length) * 100) / 100;
    return {
      rate,
      note: rate >= 0.3
        ? '圧迫症状（腹部膨満・圧迫感・頻尿）が頻繁に記録されています。' : null,
    };
  }

  // 貧血リスク: 経血量増加と倦怠感の共起率
  _calcAnemiaRisk(records) {
    if (!records.length) return { rate: 0, note: null };
    const coOccurrence = records.filter(r =>
      (r.symptoms || []).includes('経血量増加') &&
      (r.symptoms || []).includes('倦怠感')
    );
    const rate = Math.round((coOccurrence.length / records.length) * 100) / 100;

    // Pearson相関: 経血量増加日 × 倦怠感日の共起パターン
    const xs = records.map(r => (r.symptoms || []).includes('経血量増加') ? 1 : 0);
    const ys = records.map(r => (r.symptoms || []).includes('倦怠感') ? 1 : 0);
    const corr = pearsonR(xs, ys);

    return {
      coOccurrenceRate: rate,
      correlation:      corr,
      note: rate >= 0.2
        ? '経血量増加と倦怠感が重なる日が見られます。貧血サインとして記録を続けましょう。' : null,
    };
  }
}
