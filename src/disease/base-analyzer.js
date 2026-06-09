// src/disease/base-analyzer.js
// Phase3: 疾患別アナライザーの基底クラス。
// 全 DiseaseAnalyzer はこのクラスを継承する。
// window参照・副作用なし。pure analysis only。

import { sliceDays }       from '../analytics/shared/date-utils.js';
import { confidenceLabel } from '../analytics/shared/stats-utils.js';
import { topSymptoms, symptomRate } from '../analytics/shared/symptom-utils.js';

export class BaseAnalyzer {
  /**
   * @param {{
   *   diseaseKey:       string,
   *   diseaseNameJa:    string,
   *   specificSymptoms: string[],
   *   relatedFactors:   string[],
   *   contexts:         object,
   * }} config
   */
  constructor(config) {
    this.diseaseKey       = config.diseaseKey;
    this.diseaseNameJa    = config.diseaseNameJa;
    this.specificSymptoms = config.specificSymptoms || [];
    this.relatedFactors   = config.relatedFactors   || [];
    this.contexts         = config.contexts         || {};
  }

  /**
   * メイン分析エントリポイント。
   * @param {object[]} records
   * @param {object}   state  — { lastPeriodDate?, cycleLength?, diseases? }
   * @returns {AnalysisResult}
   */
  analyze(records, state = {}) {
    const r90 = sliceDays(records, 90);
    const r30 = sliceDays(records, 30);

    return {
      disease:          this.diseaseNameJa,
      diseaseKey:       this.diseaseKey,
      symptomFrequency: this._calcSymptomFrequency(r90),
      symptomRates:     symptomRate(r90, this.specificSymptoms),
      flarePattern:     this._detectFlares(r90),
      trend:            this._calcTrend(r90, r30),
      topFactors:       this._calcTopFactors(r90),
      diseaseSpecific:  this.analyzeDiseaseSpecific(records, state),
      observations:     this._buildObservations(),
      confidence:       confidenceLabel(r90.length),
      sampleSize:       r90.length,
    };
  }

  // ─── サブクラスでオーバーライドする固有分析 ─────────────────
  // eslint-disable-next-line no-unused-vars
  analyzeDiseaseSpecific(records, state) { return {}; }

  // ─── 共通実装 ────────────────────────────────────────────────

  _calcSymptomFrequency(records) {
    if (!records.length) return [];
    const top = topSymptoms(records, 10);
    return top.filter(({ symptom }) => this.specificSymptoms.includes(symptom));
  }

  _detectFlares(records) {
    if (!records.length) return { count: 0, rate: 0, recentFlares: [] };
    const flares = records.filter(r =>
      r.painLevel >= 6 ||
      (r.symptoms?.length >= 3 && r.energy <= 2)
    );
    const recentFlares = flares.slice(-3).map(r => ({
      date:      r.record_date || r.date,
      painLevel: r.painLevel,
      symptoms:  (r.symptoms || []).filter(s => this.specificSymptoms.includes(s)),
    }));
    return {
      count:        flares.length,
      rate:         Math.round((flares.length / records.length) * 100) / 100,
      recentFlares,
    };
  }

  _calcTrend(r90, r30) {
    const avg90 = this._avgSymptomDays(r90);
    const avg30 = this._avgSymptomDays(r30);
    const delta = Math.round((avg30 - avg90) * 100) / 100;
    return {
      direction: delta > 0.05 ? 'worsening' : delta < -0.05 ? 'improving' : 'stable',
      delta,
    };
  }

  _calcTopFactors(records) {
    if (!records.length) return [];
    const counts = {};
    for (const r of records) {
      for (const f of (r.factors || [])) {
        if (this.relatedFactors.includes(f)) counts[f] = (counts[f] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([factor, count]) => ({ factor, count, rate: Math.round((count / records.length) * 100) / 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  _buildObservations() {
    return (this.contexts.observations || []).slice(0, 3);
  }

  _avgSymptomDays(records) {
    if (!records.length) return 0;
    return records.filter(r =>
      (r.symptoms || []).some(s => this.specificSymptoms.includes(s))
    ).length / records.length;
  }
}
