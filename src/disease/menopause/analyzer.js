// src/disease/menopause/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { average } from '../../analytics/shared/stats-utils.js';

export class MenopauseAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'menopause',
      diseaseNameJa:    '更年期障害',
      specificSymptoms: [
        'ホットフラッシュ', 'のぼせ', '寝汗', '不眠', '倦怠感',
        '気分の落ち込み', 'イライラ', '動悸', '関節痛', '集中力低下',
      ],
      relatedFactors:   ['気温変化', 'ストレス高', 'カフェイン', '夜更かし'],
      contexts:         DISEASE_CONTEXTS.menopause || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      hotFlashFrequency: this._calcHotFlashFrequency(records),
      sleepImpact:       this._calcSleepImpact(records),
      smiScore:          this._calcSMIProxy(records),
    };
  }

  _calcHotFlashFrequency(records) {
    const hotFlashDays = records.filter(r =>
      (r.symptoms || []).some(s => ['ホットフラッシュ', 'のぼせ', '寝汗'].includes(s))
    );
    return {
      count: hotFlashDays.length,
      rate:  records.length > 0
        ? Math.round((hotFlashDays.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcSleepImpact(records) {
    const withSleep = records.filter(r => r.sleepQuality != null);
    if (!withSleep.length) return null;
    const avg = average(withSleep.map(r => r.sleepQuality));
    return {
      avgSleepQuality: Math.round(avg * 10) / 10,
      poorSleepDays:   withSleep.filter(r => r.sleepQuality <= 2).length,
    };
  }

  // Simplified Menopausal Index の代理スコア（7症状の記録頻度を合計）
  _calcSMIProxy(records) {
    const smiSymptoms = ['ホットフラッシュ', 'のぼせ', '寝汗', '動悸', '不眠', '気分の落ち込み', '倦怠感'];
    if (!records.length) return null;
    const total = smiSymptoms.reduce((sum, s) => {
      const days = records.filter(r => (r.symptoms || []).includes(s)).length;
      return sum + days;
    }, 0);
    return {
      proxyScore: total,
      note: '記録日数ベースの代理スコア。医療診断ではありません。',
    };
  }
}
