// src/disease/infertility/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';
import { pearsonR } from '../../analytics/shared/stats-utils.js';

export class InfertilityAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'infertility',
      diseaseNameJa:    '不妊症',
      specificSymptoms: ['おりもの変化', '下腹部痛', '倦怠感', '不安感', '気分の落ち込み'],
      relatedFactors:   ['排卵後', '運動した', '糖質過多', 'ストレス高'],
      contexts:         DISEASE_CONTEXTS.infertility || {},
    });
  }

  analyzeDiseaseSpecific(records, state) {
    return {
      ovulationSignals:     this._detectOvulationSignals(records),
      emotionalLoad:        this._calcEmotionalLoad(records),
      cycleConsistency:     this._calcCycleConsistency(state),
      emotionalTrend:       this._calcEmotionalTrend(records),
      stressCorrelation:    this._calcStressCorrelation(records),
      recordingConsistency: this._calcRecordingConsistency(records),
    };
  }

  _detectOvulationSignals(records) {
    const signalDays = records.filter(r =>
      (r.symptoms || []).includes('おりもの変化')
    );
    return {
      rate: records.length > 0
        ? Math.round((signalDays.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcEmotionalLoad(records) {
    const emotionalSymptoms = ['不安感', '気分の落ち込み'];
    const days = records.filter(r =>
      (r.symptoms || []).some(s => emotionalSymptoms.includes(s))
    );
    return {
      rate: records.length > 0
        ? Math.round((days.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcCycleConsistency(state) {
    const cycleLength = state?.cycleLength;
    if (!cycleLength) return { data: false };
    return {
      data:      true,
      cycleLength,
      isRegular: cycleLength >= 24 && cycleLength <= 38,
    };
  }

  // 感情症状の 90日トレンド（前半 vs 後半）
  _calcEmotionalTrend(records) {
    const r90     = sliceDays(records, 90);
    const r45     = sliceDays(records, 45);
    const r90to45 = r90.filter(r => !r45.includes(r));

    const emotionalSymptoms = ['不安感', '気分の落ち込み'];
    const emotRate = (arr) => arr.length
      ? arr.filter(r => (r.symptoms || []).some(s => emotionalSymptoms.includes(s))).length / arr.length : 0;

    const recentRate = emotRate(r45);
    const priorRate  = emotRate(r90to45);
    const delta      = Math.round((recentRate - priorRate) * 100) / 100;

    return {
      recentRate: Math.round(recentRate * 100) / 100,
      priorRate:  Math.round(priorRate  * 100) / 100,
      direction:  delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
    };
  }

  // ストレス高因子と感情症状の Pearson 相関
  _calcStressCorrelation(records) {
    if (records.length < 5) return null;
    const emotionalSymptoms = ['不安感', '気分の落ち込み'];
    const xs = records.map(r => (r.factors || []).includes('ストレス高') ? 1 : 0);
    const ys = records.map(r =>
      (r.symptoms || []).some(s => emotionalSymptoms.includes(s)) ? 1 : 0
    );
    return pearsonR(xs, ys);
  }

  // 記録継続率（排卵追跡の有効性評価）
  // 90日間のレコードが週 5日以上あるかを確認
  _calcRecordingConsistency(records) {
    const r90 = sliceDays(records, 90);
    if (!r90.length) return { rate: 0, sufficient: false };
    const rate = Math.round((r90.length / 90) * 100) / 100;
    return {
      rate,
      sufficient: rate >= 0.7,
      note: rate < 0.5
        ? '記録が週3日未満の週があります。排卵パターンの観察精度が上がります。' : null,
    };
  }
}
