// src/disease/chronic-pelvic-pain/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

export class ChronicPelvicPainAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'chronicPelvicPain',
      diseaseNameJa:    '慢性骨盤痛',
      specificSymptoms: ['下腹部痛', '腰痛', '骨盤内重だるさ', '倦怠感', '不眠', '集中力低下'],
      relatedFactors:   ['長時間座位', 'ストレス高', '夜更かし', '運動した'],
      contexts:         DISEASE_CONTEXTS.chronicPelvicPain || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      painPersistence:    this._calcPainPersistence(records),
      avgPainLevel:       this._calcAvgPain(records),
      radiationPattern:   this._detectRadiation(records),
      flareProfile:       this._calcFlareProfile(records),
      factorCorrelations: this._calcFactorCorrelations(records),
      painTrend:          this._calcPainTrend(records),
      chronicityIndex:    this._calcChronicityIndex(records),
    };
  }

  // 継続的な痛みの最長連続日数
  _calcPainPersistence(records) {
    let maxStreak = 0;
    let streak    = 0;
    for (const r of records) {
      if (r.painLevel >= 3) { streak++; if (streak > maxStreak) maxStreak = streak; }
      else streak = 0;
    }
    return { maxConsecutiveDays: maxStreak };
  }

  _calcAvgPain(records) {
    const withPain = records.filter(r => r.painLevel != null);
    if (!withPain.length) return null;
    return Math.round(average(withPain.map(r => r.painLevel)) * 10) / 10;
  }

  _detectRadiation(records) {
    const both = records.filter(r =>
      (r.symptoms || []).includes('下腹部痛') &&
      (r.symptoms || []).includes('腰痛')
    );
    return {
      rate: records.length > 0
        ? Math.round((both.length / records.length) * 100) / 100 : 0,
    };
  }

  // 慢性痛フレア（痛み >= 6）のプロファイル
  _calcFlareProfile(records) {
    if (!records.length) return { rate: 0, avgPainOnFlare: null, topSymptoms: [] };
    const flares = records.filter(r => r.painLevel >= 6);
    const sympFreq = {};
    for (const r of flares) {
      for (const s of (r.symptoms || [])) {
        if (this.specificSymptoms.includes(s)) sympFreq[s] = (sympFreq[s] || 0) + 1;
      }
    }
    const topSymptoms = Object.entries(sympFreq)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);

    return {
      rate:           Math.round((flares.length / records.length) * 100) / 100,
      avgPainOnFlare: flares.length
        ? Math.round(average(flares.map(r => r.painLevel)) * 10) / 10 : null,
      topSymptoms,
    };
  }

  // ストレス・睡眠・運動因子と痛みの相関
  _calcFactorCorrelations(records) {
    if (records.length < 5) return null;
    const painAvg = (arr) => arr.length
      ? average(arr.filter(r => r.painLevel != null).map(r => r.painLevel)) : 0;

    const results = {};
    for (const factor of ['ストレス高', '夜更かし', '運動した']) {
      const withF    = records.filter(r => (r.factors || []).includes(factor));
      const withoutF = records.filter(r => !(r.factors || []).includes(factor));
      if (!withF.length || !withoutF.length) continue;
      const painWith    = painAvg(withF);
      const painWithout = painAvg(withoutF);
      results[factor] = {
        avgPainWithFactor:    Math.round(painWith    * 10) / 10,
        avgPainWithoutFactor: Math.round(painWithout * 10) / 10,
        delta: Math.round((painWith - painWithout) * 10) / 10,
      };
    }

    // ストレスと痛みの Pearson 相関
    const xs = records.map(r => (r.factors || []).includes('ストレス高') ? 1 : 0);
    const ys = records.map(r => r.painLevel ?? 0);
    const stressPainCorr = pearsonR(xs, ys);

    return {
      byFactor:            Object.keys(results).length ? results : null,
      stressPainCorrelation: stressPainCorr,
    };
  }

  // 慢性化指標: 3ヶ月以上の継続記録 + 痛みが週3日以上の割合
  _calcChronicityIndex(records) {
    if (!records.length) return { chronic: false, note: null };
    const r90      = sliceDays(records, 90);
    const painDays = r90.filter(r => r.painLevel >= 3);
    const rate     = r90.length > 0 ? Math.round((painDays.length / r90.length) * 100) / 100 : 0;
    const chronic  = r90.length >= 60 && rate >= 0.4;
    return {
      rate,
      chronic,
      note: chronic
        ? '90日以上にわたり週3日以上の痛みが記録されています。慢性骨盤痛の慢性化パターンに当てはまります。' : null,
    };
  }

  // 90日トレンド（痛みレベル平均の前半 vs 後半）
  _calcPainTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const painAvg = (arr) => {
      const days = arr.filter(r => r.painLevel != null);
      return days.length ? average(days.map(r => r.painLevel)) : null;
    };

    const recentAvg = painAvg(r45);
    const priorAvg  = painAvg(r90to45);
    if (recentAvg === null || priorAvg === null) {
      return { direction: 'stable', recentAvg: null, priorAvg: null };
    }
    const delta = Math.round((recentAvg - priorAvg) * 10) / 10;
    return {
      direction:  delta > 0.3 ? 'worsening' : delta < -0.3 ? 'improving' : 'stable',
      recentAvg:  Math.round(recentAvg * 10) / 10,
      priorAvg:   Math.round(priorAvg  * 10) / 10,
    };
  }
}
