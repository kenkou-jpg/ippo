// src/disease/adenomyosis/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

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
      flareProfile:        this._calcFlareProfile(records),
      painTrend:           this._calcPainTrend(records),
      sleepPainCorrelation: this._calcSleepPainCorrelation(records),
    };
  }

  _detectPainMedsPattern(records) {
    const highPainWithMeds = records.filter(r =>
      r.painLevel >= 7 && r.painMeds === true
    );
    const rate = records.length
      ? Math.round((highPainWithMeds.length / records.length) * 100) / 100 : 0;
    return {
      rate,
      note: highPainWithMeds.length >= 3
        ? '痛み止めを使用していても高い痛みが記録されている日があります' : null,
    };
  }

  _avgMenstrualPain(records) {
    const menstrualDays = records.filter(r => r.menstrualFlow && r.painLevel != null);
    if (!menstrualDays.length) return null;
    return Math.round(average(menstrualDays.map(r => r.painLevel)) * 10) / 10;
  }

  // 月経中フレア（痛み >= 7）の率・平均痛み・上位症状
  _calcFlareProfile(records) {
    if (!records.length) return { rate: 0, avgPainOnFlare: null, topSymptoms: [] };
    const menstrualFlares = records.filter(r =>
      r.menstrualFlow && r.painLevel >= 7
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
      rate:           Math.round((menstrualFlares.length / records.length) * 100) / 100,
      avgPainOnFlare: menstrualFlares.length
        ? Math.round(average(menstrualFlares.map(r => r.painLevel)) * 10) / 10 : null,
      topSymptoms,
    };
  }

  // 90日を前半・後半に分け、月経痛レベルの変化方向を判定
  _calcPainTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const menstrualPainAvg = (arr) => {
      const days = arr.filter(r => r.menstrualFlow && r.painLevel != null);
      return days.length ? average(days.map(r => r.painLevel)) : null;
    };

    const recentAvg = menstrualPainAvg(r45);
    const priorAvg  = menstrualPainAvg(r90to45);
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

  // 夜更かし因子と翌日痛みの相関（Pearson r）
  _calcSleepPainCorrelation(records) {
    if (records.length < 5) return null;
    const sorted = records.slice().sort((a, b) => {
      const da = a.record_date || a.date || '';
      const db = b.record_date || b.date || '';
      return da < db ? -1 : 1;
    });

    // 前日に夜更かし因子があった日の翌日痛みレベルを収集
    const lateNightFlag  = [];
    const nextDayPain    = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      lateNightFlag.push((sorted[i].factors || []).includes('夜更かし') ? 1 : 0);
      nextDayPain.push(sorted[i + 1].painLevel ?? 0);
    }
    return pearsonR(lateNightFlag, nextDayPain);
  }
}
