// src/disease/fibroid/analyzer.js
import { BaseAnalyzer } from '../base-analyzer.js';
import { DISEASE_CONTEXTS } from '../../data/disease-contexts.js';
import { sliceDays } from '../../analytics/shared/date-utils.js';

export class FibroidAnalyzer extends BaseAnalyzer {
  constructor() {
    super({
      diseaseKey:       'fibroid',
      diseaseNameJa:    '子宮筋腫',
      specificSymptoms: ['下腹部痛', '腹部膨満', '頻尿', '経血量増加', '倦怠感', '不正出血', '圧迫感'],
      relatedFactors:   ['月経中', '長時間立位', '長時間座位'],
      contexts:         DISEASE_CONTEXTS.fibroid || {},
    });
  }

  analyzeDiseaseSpecific(records) {
    return {
      heavyFlowTrend: this._calcHeavyFlowTrend(records),
    };
  }

  _calcHeavyFlowTrend(records) {
    // 経血量増加の記録が recent 30日で増えているかを確認
    const r30 = sliceDays(records, 30);
    const r60to30 = sliceDays(records, 60).filter(r => !r30.includes(r));
    const countHeavy = arr => arr.filter(r =>
      (r.symptoms || []).includes('経血量増加')
    ).length;
    const recent = countHeavy(r30);
    const prior  = countHeavy(r60to30);
    const delta  = recent - prior;
    return {
      recentCount: recent,
      priorCount:  prior,
      direction:   delta > 0 ? 'increasing' : delta < 0 ? 'decreasing' : 'stable',
    };
  }
}
