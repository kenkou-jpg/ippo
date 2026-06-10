// src/disease/prolapse/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';

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
      posturalSymptoms:  this._detectPosturalPattern(records),
      urinarySymptoms:   this._calcUrinarySymptoms(records),
      activityImpact:    this._calcActivityImpact(records),
      symptomTrend:      this._calcSymptomTrend(records),
      severityPattern:   this._calcSeverityPattern(records),
    };
  }

  _detectPosturalPattern(records) {
    const standingDays  = records.filter(r => (r.factors || []).includes('長時間立位'));
    const withSymptoms  = standingDays.filter(r =>
      (r.symptoms || []).some(s => ['圧迫感', '骨盤内重だるさ'].includes(s))
    );
    return {
      standingDays:    standingDays.length,
      symptomRate:     standingDays.length > 0
        ? Math.round((withSymptoms.length / standingDays.length) * 100) / 100 : 0,
    };
  }

  _calcUrinarySymptoms(records) {
    const urinaryDays = records.filter(r =>
      (r.symptoms || []).some(s => ['頻尿', '尿漏れ'].includes(s))
    );
    return {
      rate: records.length > 0
        ? Math.round((urinaryDays.length / records.length) * 100) / 100 : 0,
    };
  }

  // 複数活動因子（立位・座位・運動）との症状相関
  _calcActivityImpact(records) {
    if (records.length < 5) return null;
    const activityFactors  = ['長時間立位', '長時間座位', '運動した'];
    const pressureSymptoms = ['圧迫感', '骨盤内重だるさ', '頻尿'];

    const sympRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => pressureSymptoms.includes(s))).length / arr.length : 0;

    const results = {};
    for (const factor of activityFactors) {
      const withF    = records.filter(r => (r.factors || []).includes(factor));
      const withoutF = records.filter(r => !(r.factors || []).includes(factor));
      if (!withF.length || !withoutF.length) continue;
      const wr = sympRate(withF);
      const nr = sympRate(withoutF);
      results[factor] = {
        withFactorRate:    Math.round(wr * 100) / 100,
        withoutFactorRate: Math.round(nr * 100) / 100,
        relativeRisk:      nr > 0 ? Math.round((wr / nr) * 100) / 100 : null,
      };
    }
    return Object.keys(results).length ? results : null;
  }

  // 90日トレンド（骨盤症状率の前半 vs 後半）
  _calcSymptomTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const keySymptoms = ['圧迫感', '骨盤内重だるさ', '頻尿', '尿漏れ'];
    const sympRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => keySymptoms.includes(s))).length / arr.length : 0;

    const recentRate = sympRate(r45);
    const priorRate  = sympRate(r90to45);
    const delta      = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // 症状なし・軽度・重度の日分布（重症度パターン）
  _calcSeverityPattern(records) {
    if (!records.length) return null;
    const keySymptoms = ['圧迫感', '骨盤内重だるさ', '頻尿', '尿漏れ'];
    const none   = records.filter(r => !(r.symptoms || []).some(s => keySymptoms.includes(s)));
    const mild   = records.filter(r => {
      const cnt = keySymptoms.filter(s => (r.symptoms || []).includes(s)).length;
      return cnt === 1;
    });
    const severe = records.filter(r => {
      const cnt = keySymptoms.filter(s => (r.symptoms || []).includes(s)).length;
      return cnt >= 2;
    });
    const n = records.length;
    return {
      noneRate:   Math.round((none.length   / n) * 100) / 100,
      mildRate:   Math.round((mild.length   / n) * 100) / 100,
      severeRate: Math.round((severe.length / n) * 100) / 100,
    };
  }
}
