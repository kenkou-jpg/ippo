// src/disease/menopause/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { average, pearsonR } from '../../analytics/shared/stats-utils.js';

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
      hotFlashFrequency:    this._calcHotFlashFrequency(records),
      sleepImpact:          this._calcSleepImpact(records),
      smiScore:             this._calcSMIProxy(records),
      hotFlashTrend:        this._calcHotFlashTrend(records),
      factorCorrelations:   this._calcFactorCorrelations(records),
      moodPattern:          this._calcMoodPattern(records),
      genitourinarySymptoms: this._calcGenitourinarySymptoms(records),
    };
  }

  _calcHotFlashFrequency(records) {
    const hotFlashDays = records.filter(r =>
      (r.symptoms || []).some(s => ['ホットフラッシュ', 'のぼせ', '寝汗'].includes(s))
    );
    return {
      rate: records.length > 0
        ? Math.round((hotFlashDays.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcSleepImpact(records) {
    const withSleep = records.filter(r => r.sleepQuality != null);
    if (!withSleep.length) return null;
    const avg = average(withSleep.map(r => r.sleepQuality));
    return {
      avgSleepQuality: Math.round(avg * 10) / 10,
      poorSleepRate:   Math.round(
        withSleep.filter(r => r.sleepQuality <= 2).length / withSleep.length * 100
      ) / 100,
    };
  }

  // Simplified Menopausal Index 代理スコア（7症状の記録率を合算）
  _calcSMIProxy(records) {
    const smiSymptoms = ['ホットフラッシュ', 'のぼせ', '寝汗', '動悸', '不眠', '気分の落ち込み', '倦怠感'];
    if (!records.length) return null;
    const total = smiSymptoms.reduce((sum, s) => {
      return sum + records.filter(r => (r.symptoms || []).includes(s)).length;
    }, 0);
    return {
      proxyScore: total,
      note: '記録日数ベースの代理スコア。医療診断ではありません。',
    };
  }

  // ホットフラッシュの 90日トレンド（前半 vs 後半）
  _calcHotFlashTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const hfRate = (arr) => arr.length
      ? arr.filter(r =>
          (r.symptoms || []).some(s => ['ホットフラッシュ', 'のぼせ', '寝汗'].includes(s))
        ).length / arr.length : 0;

    const recentRate = hfRate(r45);
    const priorRate  = hfRate(r90to45);
    const delta      = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // カフェイン・ストレス因子とホットフラッシュ出現率の比較
  _calcFactorCorrelations(records) {
    if (records.length < 5) return null;
    const hfSymptoms = ['ホットフラッシュ', 'のぼせ', '寝汗'];
    const hfRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => hfSymptoms.includes(s))).length / arr.length : 0;

    const results = {};
    for (const factor of ['カフェイン', 'ストレス高', '夜更かし']) {
      const withF    = records.filter(r => (r.factors || []).includes(factor));
      const withoutF = records.filter(r => !(r.factors || []).includes(factor));
      if (!withF.length || !withoutF.length) continue;
      const wr = hfRate(withF);
      const nr = hfRate(withoutF);
      results[factor] = {
        withFactorRate:    Math.round(wr * 100) / 100,
        withoutFactorRate: Math.round(nr * 100) / 100,
        relativeRisk:      nr > 0 ? Math.round((wr / nr) * 100) / 100 : null,
      };
    }
    return Object.keys(results).length ? results : null;
  }

  // 泌尿生殖器症状（頻尿・尿漏れ・外陰部灼熱感）の出現率
  _calcGenitourinarySymptoms(records) {
    if (!records.length) return { rate: 0 };
    const guSymptoms = ['頻尿', '尿漏れ', '外陰部灼熱感'];
    const guDays = records.filter(r =>
      (r.symptoms || []).some(s => guSymptoms.includes(s))
    );
    return {
      rate: Math.round((guDays.length / records.length) * 100) / 100,
    };
  }

  // 気分症状（イライラ・気分の落ち込み）の集積パターン
  _calcMoodPattern(records) {
    if (!records.length) return { rate: 0, clusterRate: 0 };
    const moodSymptoms  = ['イライラ', '気分の落ち込み', '不安感'];
    const moodDays = records.filter(r =>
      (r.symptoms || []).some(s => moodSymptoms.includes(s))
    );
    // 複数気分症状が同日に出る日（クラスター）
    const clusterDays = records.filter(r =>
      moodSymptoms.filter(s => (r.symptoms || []).includes(s)).length >= 2
    );

    // 気分症状と不眠の Pearson 相関
    const xs = records.map(r => (r.symptoms || []).some(s => moodSymptoms.includes(s)) ? 1 : 0);
    const ys = records.map(r => (r.symptoms || []).includes('不眠') ? 1 : 0);
    const insomniaCorrelation = pearsonR(xs, ys);

    return {
      rate:        Math.round((moodDays.length    / records.length) * 100) / 100,
      clusterRate: Math.round((clusterDays.length / records.length) * 100) / 100,
      insomniaCorrelation,
    };
  }
}
