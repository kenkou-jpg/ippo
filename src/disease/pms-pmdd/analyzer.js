// src/disease/pms-pmdd/analyzer.js
// PMS / PMDD 両方を担当（diseaseKey: 'pms' / 'pmdd' 両方でRegistryに登録）
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';

export class PMSPMDDAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'pms',
      diseaseNameJa:    'PMS/PMDD',
      specificSymptoms: [
        'イライラ', '気分の落ち込み', 'むくみ', '胸の張り', '頭痛',
        '不安感', '集中力低下', '倦怠感', '乳房痛',
      ],
      relatedFactors:   ['生理前', 'カフェイン', 'ストレス高', '夜更かし'],
      contexts:         DISEASE_CONTEXTS.pms || {},
    });
  }

  analyzeDiseaseSpecific(records, state) {
    return {
      lutealPhaseSymptoms:  this._calcLutealPhaseLoad(records, state),
      cycleVariance:        this._calcCycleVariance(state),
      moodCycleCorrelation: this._calcMoodCycleCorrelation(records, state),
    };
  }

  _calcLutealPhaseLoad(records, state) {
    const cycleLength   = state?.cycleLength || 28;
    const lastPeriodDate = state?.lastPeriodDate;
    if (!lastPeriodDate) return { detectable: false };

    const lutealStart = _addDays(lastPeriodDate, cycleLength - 7);
    const lutealEnd   = _addDays(lastPeriodDate, cycleLength - 1);

    const luteal = records.filter(r => {
      const d = r.record_date || r.date;
      return d && d >= lutealStart && d <= lutealEnd;
    });

    const psychSymptoms = ['イライラ', '気分の落ち込み', '不安感'];
    const hasPsych = luteal.filter(r =>
      (r.symptoms || []).some(s => psychSymptoms.includes(s))
    );

    return {
      detectable:       luteal.length > 0,
      lutealDays:       luteal.length,
      psychSymptomDays: hasPsych.length,
      rate: luteal.length > 0
        ? Math.round((hasPsych.length / luteal.length) * 100) / 100 : 0,
    };
  }

  // 月経周期長のばらつき（記録から推定）
  _calcCycleVariance(state) {
    const cycleLength = state?.cycleLength;
    if (!cycleLength) return { detectable: false };
    const isRegular = cycleLength >= 26 && cycleLength <= 32;
    return {
      detectable: true,
      cycleLength,
      isRegular,
      note: !isRegular
        ? '月経周期のばらつきがあります。PMS症状のタイミング予測に影響する可能性があります。' : null,
    };
  }

  // 黄体期（生理前7日）の気分症状出現率と非黄体期の比較
  _calcMoodCycleCorrelation(records, state) {
    const cycleLength    = state?.cycleLength || 28;
    const lastPeriodDate = state?.lastPeriodDate;
    const moodSymptoms   = ['イライラ', '気分の落ち込み', '不安感'];

    if (!lastPeriodDate) {
      const withCycleDay = records.filter(r => r.cycleDay != null);
      if (!withCycleDay.length) return { detectable: false };
      const preLuteal  = withCycleDay.filter(r => r.cycleDay >= (cycleLength - 7));
      const follicular = withCycleDay.filter(r => r.cycleDay <= 10);
      const moodRate = (arr) => arr.length
        ? Math.round(arr.filter(r =>
            (r.symptoms || []).some(s => moodSymptoms.includes(s))
          ).length / arr.length * 100) / 100 : null;
      return {
        detectable:     true,
        preLutealRate:  moodRate(preLuteal),
        follicularRate: moodRate(follicular),
      };
    }

    const lutealStart = _addDays(lastPeriodDate, cycleLength - 7);
    const lutealEnd   = _addDays(lastPeriodDate, cycleLength - 1);
    const luteal      = records.filter(r => {
      const d = r.record_date || r.date;
      return d && d >= lutealStart && d <= lutealEnd;
    });
    const nonLuteal   = records.filter(r => {
      const d = r.record_date || r.date;
      return d && (d < lutealStart || d > lutealEnd);
    });

    const moodRate = (arr) => arr.length
      ? Math.round(arr.filter(r =>
          (r.symptoms || []).some(s => moodSymptoms.includes(s))
        ).length / arr.length * 100) / 100 : null;

    return {
      detectable:    true,
      lutealRate:    moodRate(luteal),
      nonLutealRate: moodRate(nonLuteal),
    };
  }
}

function _addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
