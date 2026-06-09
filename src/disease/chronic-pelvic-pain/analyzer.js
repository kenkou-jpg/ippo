// src/disease/chronic-pelvic-pain/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { average } from '../../analytics/shared/stats-utils.js';

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
      painPersistence:  this._calcPainPersistence(records),
      avgPainLevel:     this._calcAvgPain(records),
      radiationPattern: this._detectRadiation(records),
    };
  }

  _calcPainPersistence(records) {
    // 継続的な痛みの記録（3日以上連続）
    let maxStreak = 0;
    let streak    = 0;
    for (const r of records) {
      if (r.painLevel >= 3) {
        streak++;
        if (streak > maxStreak) maxStreak = streak;
      } else {
        streak = 0;
      }
    }
    return { maxConsecutiveDays: maxStreak };
  }

  _calcAvgPain(records) {
    const withPain = records.filter(r => r.painLevel != null);
    if (!withPain.length) return null;
    return Math.round(average(withPain.map(r => r.painLevel)) * 10) / 10;
  }

  _detectRadiation(records) {
    // 腰痛と下腹部痛が同日に出る → 放散パターンの可能性
    const both = records.filter(r =>
      (r.symptoms || []).includes('下腹部痛') &&
      (r.symptoms || []).includes('腰痛')
    );
    return {
      count: both.length,
      rate:  records.length > 0
        ? Math.round((both.length / records.length) * 100) / 100 : 0,
    };
  }
}
