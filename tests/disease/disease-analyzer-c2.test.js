// tests/disease/disease-analyzer-c2.test.js
// PR-C2: 8疾患 analyzeDiseaseSpecific() 強化テスト
//
// 検証対象:
//   fibroid / adenomyosis / menopause / infertility
//   ovarian-cyst / prolapse / chronic-pelvic-pain / vulvodynia
//
// 判定基準:
//   - flare指標: rate が 0〜1、topSymptoms が配列
//   - trend指標: direction が worsening/stable/improving のいずれか
//   - factor指標: relativeRisk または correlation が返る
//   - 疾患固有指標: 各疾患の専用フィールドが存在する
//   - 単純 count 禁止: rate/correlation/direction ベースの計算であること

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ─── テスト用レコードファクトリ ────────────────────────────────

function makeRecords(count = 60, overrides = {}) {
  const records = [];
  const base = new Date('2026-01-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isMenstrual = (i % 28) < 5;
    records.push({
      record_date:   dateStr,
      date:          dateStr,
      painLevel:     (i % 4 === 0) ? 7 : (i % 3 === 0) ? 5 : 2,
      energy:        (i % 2 === 0) ? 2 : 4,
      symptoms:      isMenstrual
        ? ['下腹部痛', '経血量増加', '倦怠感', '腹部膨満']
        : ['倦怠感'],
      factors:       (i % 5 === 0)
        ? ['月経中', 'ストレス高']
        : (i % 3 === 0) ? ['夜更かし'] : [],
      menstrualFlow: isMenstrual ? 'heavy' : null,
      sleepQuality:  (i % 3 === 0) ? 1 : 3,
      cycleDay:      (i % 28) + 1,
      ...overrides,
    });
  }
  return records;
}

function makeStressRecords(count = 30) {
  return makeRecords(count).map((r, i) => ({
    ...r,
    factors:  (i % 2 === 0) ? ['ストレス高', '長時間座位'] : ['運動した'],
    symptoms: (i % 2 === 0) ? ['外陰部灼熱感', '不安感', '刺痛'] : ['倦怠感'],
  }));
}

// ─────────────────────────────────────────────────────────────
// fibroid
// ─────────────────────────────────────────────────────────────

describe('PR-C2: fibroid — FibroidAnalyzer 強化', () => {
  let FibroidAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ FibroidAnalyzer } = await import('../../src/disease/fibroid/analyzer.js'));
  });

  it('analyzeDiseaseSpecific が5フィールドを返す', () => {
    const r = new FibroidAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r).toHaveProperty('heavyFlowTrend');
    expect(r).toHaveProperty('flareProfile');
    expect(r).toHaveProperty('symptomTrend');
    expect(r).toHaveProperty('menstrualCorrelation');
    expect(r).toHaveProperty('anemiaRisk');
  });

  it('heavyFlowTrend: direction が許容値', () => {
    const r = new FibroidAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(['increasing', 'decreasing', 'stable']).toContain(r.heavyFlowTrend.direction);
    expect(r.heavyFlowTrend).toHaveProperty('recentRate');
    expect(r.heavyFlowTrend).toHaveProperty('priorRate');
    expect(r.heavyFlowTrend).toHaveProperty('delta');
  });

  it('flareProfile: rate が 0〜1、topSymptoms が配列', () => {
    const r = new FibroidAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r.flareProfile.rate).toBeGreaterThanOrEqual(0);
    expect(r.flareProfile.rate).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.flareProfile.topSymptoms)).toBe(true);
  });

  it('symptomTrend: direction が worsening/stable/improving', () => {
    const r = new FibroidAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(['worsening', 'stable', 'improving']).toContain(r.symptomTrend.direction);
  });

  it('anemiaRisk: coOccurrenceRate が 0〜1', () => {
    const r = new FibroidAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r.anemiaRisk.coOccurrenceRate).toBeGreaterThanOrEqual(0);
    expect(r.anemiaRisk.coOccurrenceRate).toBeLessThanOrEqual(1);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new FibroidAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// adenomyosis
// ─────────────────────────────────────────────────────────────

describe('PR-C2: adenomyosis — AdenomyosisAnalyzer 強化', () => {
  let AdenomyosisAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ AdenomyosisAnalyzer } = await import('../../src/disease/adenomyosis/analyzer.js'));
  });

  it('5フィールドを返す', () => {
    const r = new AdenomyosisAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r).toHaveProperty('painMedsIneffective');
    expect(r).toHaveProperty('avgMenstrualPain');
    expect(r).toHaveProperty('flareProfile');
    expect(r).toHaveProperty('painTrend');
    expect(r).toHaveProperty('sleepPainCorrelation');
  });

  it('painMedsIneffective: rate フィールドが 0〜1', () => {
    const r = new AdenomyosisAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r.painMedsIneffective.rate).toBeGreaterThanOrEqual(0);
    expect(r.painMedsIneffective.rate).toBeLessThanOrEqual(1);
  });

  it('flareProfile: rate が 0〜1', () => {
    const r = new AdenomyosisAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(r.flareProfile.rate).toBeGreaterThanOrEqual(0);
    expect(r.flareProfile.rate).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.flareProfile.topSymptoms)).toBe(true);
  });

  it('painTrend: direction が許容値', () => {
    const r = new AdenomyosisAnalyzer().analyzeDiseaseSpecific(makeRecords(60));
    expect(['worsening', 'stable', 'improving']).toContain(r.painTrend.direction);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new AdenomyosisAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// menopause
// ─────────────────────────────────────────────────────────────

describe('PR-C2: menopause — MenopauseAnalyzer 強化', () => {
  let MenopauseAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ MenopauseAnalyzer } = await import('../../src/disease/menopause/analyzer.js'));
  });

  const makeHotFlashRecords = () => makeRecords(60).map((r, i) => ({
    ...r,
    symptoms: (i % 2 === 0) ? ['ホットフラッシュ', 'のぼせ', 'イライラ'] : ['倦怠感'],
    factors:  (i % 3 === 0) ? ['カフェイン', 'ストレス高'] : [],
    sleepQuality: (i % 4 === 0) ? 1 : 3,
  }));

  it('6フィールドを返す', () => {
    const r = new MenopauseAnalyzer().analyzeDiseaseSpecific(makeHotFlashRecords());
    expect(r).toHaveProperty('hotFlashFrequency');
    expect(r).toHaveProperty('sleepImpact');
    expect(r).toHaveProperty('smiScore');
    expect(r).toHaveProperty('hotFlashTrend');
    expect(r).toHaveProperty('factorCorrelations');
    expect(r).toHaveProperty('moodPattern');
  });

  it('hotFlashFrequency: rate が 0〜1', () => {
    const r = new MenopauseAnalyzer().analyzeDiseaseSpecific(makeHotFlashRecords());
    expect(r.hotFlashFrequency.rate).toBeGreaterThanOrEqual(0);
    expect(r.hotFlashFrequency.rate).toBeLessThanOrEqual(1);
  });

  it('hotFlashTrend: direction が許容値', () => {
    const r = new MenopauseAnalyzer().analyzeDiseaseSpecific(makeHotFlashRecords());
    expect(['worsening', 'stable', 'improving']).toContain(r.hotFlashTrend.direction);
  });

  it('factorCorrelations: カフェイン因子がある場合は結果を返す', () => {
    const r = new MenopauseAnalyzer().analyzeDiseaseSpecific(makeHotFlashRecords());
    expect(r.factorCorrelations).not.toBeNull();
    if (r.factorCorrelations?.['カフェイン']) {
      expect(r.factorCorrelations['カフェイン']).toHaveProperty('withFactorRate');
      expect(r.factorCorrelations['カフェイン']).toHaveProperty('withoutFactorRate');
    }
  });

  it('moodPattern: rate と clusterRate が 0〜1', () => {
    const r = new MenopauseAnalyzer().analyzeDiseaseSpecific(makeHotFlashRecords());
    expect(r.moodPattern.rate).toBeGreaterThanOrEqual(0);
    expect(r.moodPattern.rate).toBeLessThanOrEqual(1);
    expect(r.moodPattern.clusterRate).toBeGreaterThanOrEqual(0);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new MenopauseAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// infertility
// ─────────────────────────────────────────────────────────────

describe('PR-C2: infertility — InfertilityAnalyzer 強化', () => {
  let InfertilityAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ InfertilityAnalyzer } = await import('../../src/disease/infertility/analyzer.js'));
  });

  it('6フィールドを返す', () => {
    const r = new InfertilityAnalyzer().analyzeDiseaseSpecific(makeRecords(60), {
      cycleLength: 28, lastPeriodDate: '2026-04-01',
    });
    expect(r).toHaveProperty('ovulationSignals');
    expect(r).toHaveProperty('emotionalLoad');
    expect(r).toHaveProperty('cycleConsistency');
    expect(r).toHaveProperty('emotionalTrend');
    expect(r).toHaveProperty('stressCorrelation');
    expect(r).toHaveProperty('recordingConsistency');
  });

  it('ovulationSignals: rate が 0〜1', () => {
    const r = new InfertilityAnalyzer().analyzeDiseaseSpecific(makeRecords(60), {});
    expect(r.ovulationSignals.rate).toBeGreaterThanOrEqual(0);
    expect(r.ovulationSignals.rate).toBeLessThanOrEqual(1);
  });

  it('emotionalTrend: direction が許容値', () => {
    const r = new InfertilityAnalyzer().analyzeDiseaseSpecific(makeRecords(60), {});
    expect(['worsening', 'stable', 'improving']).toContain(r.emotionalTrend.direction);
  });

  it('recordingConsistency: rate が 0〜1、sufficient が boolean', () => {
    const r = new InfertilityAnalyzer().analyzeDiseaseSpecific(makeRecords(60), {});
    expect(r.recordingConsistency.rate).toBeGreaterThanOrEqual(0);
    expect(r.recordingConsistency.rate).toBeLessThanOrEqual(1);
    expect(typeof r.recordingConsistency.sufficient).toBe('boolean');
  });

  it('空レコードでも例外なし', () => {
    expect(() => new InfertilityAnalyzer().analyzeDiseaseSpecific([], {})).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// ovarian-cyst
// ─────────────────────────────────────────────────────────────

describe('PR-C2: ovarian-cyst — OvarianCystAnalyzer 強化', () => {
  let OvarianCystAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ OvarianCystAnalyzer } = await import('../../src/disease/ovarian-cyst/analyzer.js'));
  });

  const makeCystRecords = () => makeRecords(60).map((r, i) => ({
    ...r,
    symptoms: (i % 3 === 0)
      ? ['下腹部痛', '腹部膨満', '骨盤内重だるさ'] : ['倦怠感'],
    factors:  (i % 4 === 0) ? ['長時間座位'] : (i % 6 === 0) ? ['運動した'] : [],
    cycleDay: (i % 28) + 1,
  }));

  it('4フィールドを返す', () => {
    const r = new OvarianCystAnalyzer().analyzeDiseaseSpecific(makeCystRecords());
    expect(r).toHaveProperty('ovulationPhasePain');
    expect(r).toHaveProperty('cyclicPainProfile');
    expect(r).toHaveProperty('painTrend');
    expect(r).toHaveProperty('factorCorrelations');
  });

  it('ovulationPhasePain: rate が 0〜1', () => {
    const r = new OvarianCystAnalyzer().analyzeDiseaseSpecific(makeCystRecords());
    expect(r.ovulationPhasePain.rate).toBeGreaterThanOrEqual(0);
    expect(r.ovulationPhasePain.rate).toBeLessThanOrEqual(1);
  });

  it('painTrend: direction が許容値', () => {
    const r = new OvarianCystAnalyzer().analyzeDiseaseSpecific(makeCystRecords());
    expect(['worsening', 'stable', 'improving']).toContain(r.painTrend.direction);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new OvarianCystAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// prolapse
// ─────────────────────────────────────────────────────────────

describe('PR-C2: prolapse — ProlapsAnalyzer 強化', () => {
  let ProlapsAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ ProlapsAnalyzer } = await import('../../src/disease/prolapse/analyzer.js'));
  });

  const makeProlapseRecords = () => makeRecords(60).map((r, i) => ({
    ...r,
    symptoms: (i % 3 === 0)
      ? ['圧迫感', '頻尿', '骨盤内重だるさ']
      : (i % 4 === 0) ? ['尿漏れ', '圧迫感'] : ['倦怠感'],
    factors:  (i % 3 === 0)
      ? ['長時間立位']
      : (i % 5 === 0) ? ['運動した'] : ['長時間座位'],
  }));

  it('5フィールドを返す', () => {
    const r = new ProlapsAnalyzer().analyzeDiseaseSpecific(makeProlapseRecords());
    expect(r).toHaveProperty('posturalSymptoms');
    expect(r).toHaveProperty('urinarySymptoms');
    expect(r).toHaveProperty('activityImpact');
    expect(r).toHaveProperty('symptomTrend');
    expect(r).toHaveProperty('severityPattern');
  });

  it('posturalSymptoms: symptomRate が 0〜1', () => {
    const r = new ProlapsAnalyzer().analyzeDiseaseSpecific(makeProlapseRecords());
    expect(r.posturalSymptoms.symptomRate).toBeGreaterThanOrEqual(0);
    expect(r.posturalSymptoms.symptomRate).toBeLessThanOrEqual(1);
  });

  it('symptomTrend: direction が許容値', () => {
    const r = new ProlapsAnalyzer().analyzeDiseaseSpecific(makeProlapseRecords());
    expect(['worsening', 'stable', 'improving']).toContain(r.symptomTrend.direction);
  });

  it('severityPattern: 3分類の rate 合計が概ね 1', () => {
    const r = new ProlapsAnalyzer().analyzeDiseaseSpecific(makeProlapseRecords());
    const sum = r.severityPattern.noneRate + r.severityPattern.mildRate + r.severityPattern.severeRate;
    expect(sum).toBeCloseTo(1, 1);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new ProlapsAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// chronic-pelvic-pain
// ─────────────────────────────────────────────────────────────

describe('PR-C2: chronic-pelvic-pain — ChronicPelvicPainAnalyzer 強化', () => {
  let ChronicPelvicPainAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ ChronicPelvicPainAnalyzer } = await import('../../src/disease/chronic-pelvic-pain/analyzer.js'));
  });

  const makeCPPRecords = () => makeRecords(60).map((r, i) => ({
    ...r,
    painLevel: (i % 3 === 0) ? 7 : (i % 2 === 0) ? 5 : 3,
    symptoms:  (i % 2 === 0) ? ['下腹部痛', '腰痛', '骨盤内重だるさ'] : ['倦怠感', '不眠'],
    factors:   (i % 3 === 0) ? ['ストレス高', '長時間座位'] : (i % 4 === 0) ? ['夜更かし'] : ['運動した'],
  }));

  it('6フィールドを返す', () => {
    const r = new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific(makeCPPRecords());
    expect(r).toHaveProperty('painPersistence');
    expect(r).toHaveProperty('avgPainLevel');
    expect(r).toHaveProperty('radiationPattern');
    expect(r).toHaveProperty('flareProfile');
    expect(r).toHaveProperty('factorCorrelations');
    expect(r).toHaveProperty('painTrend');
  });

  it('flareProfile: rate が 0〜1、topSymptoms が配列', () => {
    const r = new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific(makeCPPRecords());
    expect(r.flareProfile.rate).toBeGreaterThanOrEqual(0);
    expect(r.flareProfile.rate).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.flareProfile.topSymptoms)).toBe(true);
  });

  it('painTrend: direction が許容値', () => {
    const r = new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific(makeCPPRecords());
    expect(['worsening', 'stable', 'improving']).toContain(r.painTrend.direction);
  });

  it('factorCorrelations: ストレス高が含まれる場合、byFactor に結果あり', () => {
    const r = new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific(makeCPPRecords());
    expect(r.factorCorrelations).not.toBeNull();
    if (r.factorCorrelations?.byFactor?.['ストレス高']) {
      expect(r.factorCorrelations.byFactor['ストレス高']).toHaveProperty('avgPainWithFactor');
      expect(r.factorCorrelations.byFactor['ストレス高']).toHaveProperty('delta');
    }
  });

  it('radiationPattern: rate が 0〜1', () => {
    const r = new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific(makeCPPRecords());
    expect(r.radiationPattern.rate).toBeGreaterThanOrEqual(0);
    expect(r.radiationPattern.rate).toBeLessThanOrEqual(1);
  });

  it('空レコードでも例外なし', () => {
    expect(() => new ChronicPelvicPainAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// vulvodynia
// ─────────────────────────────────────────────────────────────

describe('PR-C2: vulvodynia — VulvodyniaAnalyzer 強化', () => {
  let VulvodyniaAnalyzer;
  beforeEach(async () => {
    vi.resetModules();
    ({ VulvodyniaAnalyzer } = await import('../../src/disease/vulvodynia/analyzer.js'));
  });

  it('6フィールドを返す', () => {
    const r = new VulvodyniaAnalyzer().analyzeDiseaseSpecific(makeStressRecords(60));
    expect(r).toHaveProperty('contactTriggers');
    expect(r).toHaveProperty('sittingCorrelation');
    expect(r).toHaveProperty('isolationRisk');
    expect(r).toHaveProperty('burningSensation');
    expect(r).toHaveProperty('painTrend');
    expect(r).toHaveProperty('stressCorrelation');
  });

  it('contactTriggers: rate が 0〜1', () => {
    const r = new VulvodyniaAnalyzer().analyzeDiseaseSpecific(makeStressRecords(60));
    expect(r.contactTriggers.rate).toBeGreaterThanOrEqual(0);
    expect(r.contactTriggers.rate).toBeLessThanOrEqual(1);
  });

  it('burningSensation: trend が許容値', () => {
    const r = new VulvodyniaAnalyzer().analyzeDiseaseSpecific(makeStressRecords(60));
    expect(['worsening', 'stable', 'improving']).toContain(r.burningSensation.trend);
  });

  it('painTrend: direction が許容値', () => {
    const r = new VulvodyniaAnalyzer().analyzeDiseaseSpecific(makeStressRecords(60));
    expect(['worsening', 'stable', 'improving']).toContain(r.painTrend.direction);
  });

  it('stressCorrelation: 件数十分なら Pearson r が返る', () => {
    const r = new VulvodyniaAnalyzer().analyzeDiseaseSpecific(makeStressRecords(60));
    if (r.stressCorrelation) {
      expect(r.stressCorrelation).toHaveProperty('r');
      expect(r.stressCorrelation).toHaveProperty('strength');
      expect(Math.abs(r.stressCorrelation.r)).toBeLessThanOrEqual(1);
    }
  });

  it('空レコードでも例外なし', () => {
    expect(() => new VulvodyniaAnalyzer().analyzeDiseaseSpecific([])).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// 後方互換性監査: AnalysisResult 構造が変わっていないこと
// ─────────────────────────────────────────────────────────────

describe('PR-C2: 後方互換性監査 — AnalysisResult 構造不変', () => {
  const REQUIRED_RESULT_KEYS = [
    'disease', 'diseaseKey', 'symptomFrequency', 'symptomRates',
    'flarePattern', 'trend', 'topFactors', 'diseaseSpecific',
    'observations', 'confidence', 'sampleSize',
  ];

  const ANALYZERS = [
    ['fibroid',           () => import('../../src/disease/fibroid/analyzer.js').then(m => m.FibroidAnalyzer)],
    ['adenomyosis',       () => import('../../src/disease/adenomyosis/analyzer.js').then(m => m.AdenomyosisAnalyzer)],
    ['menopause',         () => import('../../src/disease/menopause/analyzer.js').then(m => m.MenopauseAnalyzer)],
    ['infertility',       () => import('../../src/disease/infertility/analyzer.js').then(m => m.InfertilityAnalyzer)],
    ['ovarianCyst',       () => import('../../src/disease/ovarian-cyst/analyzer.js').then(m => m.OvarianCystAnalyzer)],
    ['prolapse',          () => import('../../src/disease/prolapse/analyzer.js').then(m => m.ProlapsAnalyzer)],
    ['chronicPelvicPain', () => import('../../src/disease/chronic-pelvic-pain/analyzer.js').then(m => m.ChronicPelvicPainAnalyzer)],
    ['vulvodynia',        () => import('../../src/disease/vulvodynia/analyzer.js').then(m => m.VulvodyniaAnalyzer)],
  ];

  it.each(ANALYZERS)('%s: analyze() の AnalysisResult が不変', async (key, getClass) => {
    vi.resetModules();
    const Cls    = await getClass();
    const result = new Cls().analyze(makeRecords(30), {});
    for (const k of REQUIRED_RESULT_KEYS) {
      expect(result, `${key}: ${k} が存在しない`).toHaveProperty(k);
    }
  });

  it.each(ANALYZERS)('%s: diseaseSpecific は object 型', async (key, getClass) => {
    vi.resetModules();
    const Cls    = await getClass();
    const result = new Cls().analyze(makeRecords(30), {});
    expect(typeof result.diseaseSpecific).toBe('object');
  });

  it.each(ANALYZERS)('%s: trend.direction が許容値', async (key, getClass) => {
    vi.resetModules();
    const Cls    = await getClass();
    const result = new Cls().analyze(makeRecords(30), {});
    expect(['worsening', 'stable', 'improving']).toContain(result.trend.direction);
  });
});
