// src/disease/infertility/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';

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
      ovulationSignals:   this._detectOvulationSignals(records),
      emotionalLoad:      this._calcEmotionalLoad(records),
      cycleConsistency:   this._calcCycleConsistency(state),
    };
  }

  _detectOvulationSignals(records) {
    // おりもの変化の記録頻度（排卵推定の手がかり）
    const signalDays = records.filter(r =>
      (r.symptoms || []).includes('おりもの変化')
    );
    return {
      count: signalDays.length,
      rate:  records.length > 0
        ? Math.round((signalDays.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcEmotionalLoad(records) {
    const emotionalSymptoms = ['不安感', '気分の落ち込み'];
    const days = records.filter(r =>
      (r.symptoms || []).some(s => emotionalSymptoms.includes(s))
    );
    return {
      count: days.length,
      rate:  records.length > 0
        ? Math.round((days.length / records.length) * 100) / 100 : 0,
    };
  }

  _calcCycleConsistency(state) {
    const cycleLength = state?.cycleLength;
    if (!cycleLength) return { data: false };
    return {
      data:        true,
      cycleLength,
      isRegular:   cycleLength >= 24 && cycleLength <= 38,
    };
  }
}
