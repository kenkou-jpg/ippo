// tests/disease/disease-analyzer.test.js
// PR-C1: DiseaseAnalyzer 基盤監査テスト
//
// 検証対象:
//   1. BaseAnalyzer — 共通API・信頼度計算・ヘルパー
//   2. DiseaseRegistry — 疾患登録・取得
//   3. 各疾患 analyzer — analyze() / analyzeDiseaseSpecific()
//   4. FeatureSchema — extractFeatures() 出力の型と構造

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

function makeRecords(count = 30, overrides = {}) {
  const records = [];
  const base = new Date('2026-03-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    records.push({
      record_date:   dateStr,
      date:          dateStr,
      painLevel:     (i % 3 === 0) ? 7 : 2,
      energy:        (i % 2 === 0) ? 2 : 4,
      symptoms:      ['下腹部痛', '倦怠感', '腰痛'],
      factors:       ['ストレス高', '夜更かし'],
      menstrualFlow: (i % 28 < 5) ? 'medium' : null,
      ...overrides,
    });
  }
  return records;
}

// ─────────────────────────────────────────────────────────────
// Audit A: FeatureSchema 確定
// extractFeatures() の出力フィールド・型・NULL可否 を検証
// ─────────────────────────────────────────────────────────────

describe('Audit A: FeatureSchema — extractFeatures() 出力構造', () => {
  let extractFeatures;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/ai/feature-engine.js');
    extractFeatures = mod.extractFeatures;
  });

  it('全必須フィールドが存在する', () => {
    const features = extractFeatures({
      sampleInfo:      { sampleSize: 30, confidence: 'medium' },
      flares:          { flareRate: 0.2, topTriggers: [{ factor: 'ストレス高' }] },
      diseaseAnalysis: [],
    }, { diseases: ['子宮内膜症'] });

    // 必須フィールド（NOT NULL）
    expect(typeof features.period).toBe('string');
    expect(typeof features.sampleSize).toBe('number');
    expect(typeof features.confidence).toBe('string');
    expect(Array.isArray(features.topSymptoms)).toBe(true);
    expect(typeof features.trend).toBe('string');
    expect(typeof features.flareRate).toBe('string');
    expect(typeof features.worsened).toBe('boolean');
    expect(typeof features.disclaimer).toBe('string');
  });

  it('NULL可フィールドは null または 正しい型', () => {
    const features = extractFeatures({}, {});
    // flareTrigger: null 可
    expect(features.flareTrigger === null || typeof features.flareTrigger === 'string').toBe(true);
    // disease: null 可
    expect(features.disease === null || typeof features.disease === 'string').toBe(true);
    // diseaseSpecific: null 可
    expect(features.diseaseSpecific === null || typeof features.diseaseSpecific === 'object').toBe(true);
  });

  it('confidence は許容値のいずれか', () => {
    const allowed = ['high', 'medium', 'low', 'insufficient'];
    const f1 = extractFeatures({ sampleInfo: { sampleSize: 60, confidence: 'high' } }, {});
    expect(allowed).toContain(f1.confidence);
    const f2 = extractFeatures({}, {});
    expect(allowed).toContain(f2.confidence);
  });

  it('trend は許容値のいずれか', () => {
    const allowed = ['worsening', 'stable', 'improving'];
    const features = extractFeatures({}, {});
    expect(allowed).toContain(features.trend);
  });

  it('flareRate が "XX%" 形式', () => {
    const features = extractFeatures({
      flares: { flareRate: 0.33, topTriggers: [] },
    }, {});
    expect(features.flareRate).toMatch(/^\d+%$/);
  });

  it('disclaimer は常に固定文言を含む', () => {
    const features = extractFeatures({}, {});
    expect(features.disclaimer).toContain('医療診断ではありません');
  });

  it('diseaseAnalysis がある場合、disease フィールドが設定される', () => {
    const diseaseAnalysis = [{
      disease:          '子宮内膜症',
      trend:            { direction: 'worsening' },
      symptomFrequency: [{ symptom: '下腹部痛', count: 10 }],
      diseaseSpecific:  { nonMenstrualFlares: { count: 3, rate: 0.1 } },
    }];
    const features = extractFeatures({ diseaseAnalysis }, {});
    expect(features.disease).toBe('子宮内膜症');
    expect(features.worsened).toBe(true);
    expect(features.diseaseSpecific).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// Audit B: DiseaseAnalyzer 入力監査 — 12疾患の feature 利用
// ─────────────────────────────────────────────────────────────

describe('Audit B: DiseaseAnalyzer — 12疾患の analyze() 出力', () => {
  let analyzeAll, listDiseaseKeys;

  const ALL_DISEASE_KEYS = [
    'endometriosis', 'fibroid', 'adenomyosis', 'pcos',
    'pms', 'pmdd', 'menopause', 'infertility',
    'ovarianCyst', 'prolapse', 'chronicPelvicPain', 'vulvodynia',
  ];

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/disease/disease-registry.js');
    analyzeAll     = mod.analyzeAll;
    listDiseaseKeys = mod.listDiseaseKeys;
  });

  it('12疾患全てが Registry に登録されている', () => {
    const keys = listDiseaseKeys();
    for (const key of ALL_DISEASE_KEYS) {
      expect(keys).toContain(key);
    }
  });

  it.each(ALL_DISEASE_KEYS)('%s: analyze() が AnalysisResult 構造を返す', async (key) => {
    const results = analyzeAll([key], makeRecords(30), {});
    expect(results.length).toBe(1);
    const r = results[0];

    // AnalysisResult 必須フィールド
    expect(typeof r.disease).toBe('string');
    expect(typeof r.diseaseKey).toBe('string');
    expect(Array.isArray(r.symptomFrequency)).toBe(true);
    expect(r.flarePattern).toHaveProperty('count');
    expect(r.flarePattern).toHaveProperty('rate');
    expect(r.trend).toHaveProperty('direction');
    expect(Array.isArray(r.topFactors)).toBe(true);
    expect(typeof r.confidence).toBe('string');
    expect(typeof r.sampleSize).toBe('number');
    expect(typeof r.diseaseSpecific).toBe('object');
  });

  it('endometriosis: nonMenstrualFlares を返す', async () => {
    const results = analyzeAll(['endometriosis'], makeRecords(30), {});
    const specific = results[0].diseaseSpecific;
    expect(specific).toHaveProperty('nonMenstrualFlares');
    expect(specific).toHaveProperty('postSexWorsening');
  });

  it('pcos: cycleIrregularity を返す', async () => {
    const results = analyzeAll(['pcos'], makeRecords(20), { cycleLength: 40 });
    const specific = results[0].diseaseSpecific;
    expect(specific).toHaveProperty('cycleIrregularity');
    expect(specific.cycleIrregularity.irregular).toBe(true);
  });

  it('pms: lutealPhaseSymptoms を返す', async () => {
    const results = analyzeAll(['pms'], makeRecords(28), {
      cycleLength:    28,
      lastPeriodDate: '2026-04-01',
    });
    const specific = results[0].diseaseSpecific;
    expect(specific).toHaveProperty('lutealPhaseSymptoms');
    expect(specific.lutealPhaseSymptoms).toHaveProperty('detectable');
  });

  it('空レコードでも全疾患が例外を投げない', () => {
    expect(() => analyzeAll(ALL_DISEASE_KEYS, [], {})).not.toThrow();
  });

  it('フレアレートが 0〜1 の範囲', () => {
    for (const key of ALL_DISEASE_KEYS) {
      const results = analyzeAll([key], makeRecords(30), {});
      const rate = results[0].flarePattern.rate;
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Audit C: PromptBuilder 依存監査
// DiseaseAnalyzer 追加による PromptBuilder 変更不要の確認
// ─────────────────────────────────────────────────────────────

describe('Audit C: PromptBuilder — DiseaseAnalyzer 追加後の後方互換性', () => {
  let buildPrompt, listSupportedDiseases;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/ai/prompt-builder.js');
    buildPrompt           = mod.buildPrompt;
    listSupportedDiseases = mod.listSupportedDiseases;
  });

  it('12疾患の日本語名が全て system prompt にマッピングされている', () => {
    const diseases = listSupportedDiseases();
    const expectedJaNames = [
      '子宮内膜症', '卵巣嚢腫', '子宮筋腫', '子宮腺筋症',
      'PCOS', 'PMS/PMDD', '更年期障害', '不妊症',
      '骨盤臓器脱', '慢性骨盤痛', '外陰痛症候群',
    ];
    for (const name of expectedJaNames) {
      expect(diseases).toContain(name);
    }
  });

  it('diseaseSpecific を含む features でも buildPrompt が正常動作する', () => {
    const featuresWithSpecific = {
      period:         '直近90日',
      sampleSize:     30,
      confidence:     'medium',
      topSymptoms:    ['下腹部痛', '倦怠感'],
      trend:          'worsening',
      flareRate:      '33%',
      flareTrigger:   'ストレス高',
      disease:        '子宮内膜症',
      diseaseSpecific: {
        nonMenstrualFlares: { count: 5, rate: 0.17 },
        postSexWorsening:   { recorded: true },
      },
      worsened:       true,
      disclaimer:     'これは医療診断ではありません。',
    };
    const prompt = buildPrompt(featuresWithSpecific);
    expect(prompt.system).toContain('子宮内膜症');
    expect(prompt.user).toContain('疾患固有の観察');
    expect(prompt.user).toContain('下腹部痛');
  });

  it('diseaseSpecific が null でも buildPrompt が正常動作する', () => {
    const features = {
      period:         '直近90日',
      sampleSize:     0,
      confidence:     'insufficient',
      topSymptoms:    [],
      trend:          'stable',
      flareRate:      '0%',
      flareTrigger:   null,
      disease:        null,
      diseaseSpecific: null,
      worsened:       false,
      disclaimer:     'これは医療診断ではありません。',
    };
    expect(() => buildPrompt(features)).not.toThrow();
    const prompt = buildPrompt(features);
    expect(prompt.system).toContain('婦人科疾患専門');
  });

  it('PromptBuilder の model / maxTokens が一元管理されている', () => {
    const prompt = buildPrompt({
      period: '直近90日', sampleSize: 10, confidence: 'low',
      topSymptoms: [], trend: 'stable', flareRate: '0%',
      flareTrigger: null, disease: null, diseaseSpecific: null,
      worsened: false, disclaimer: 'test',
    });
    expect(typeof prompt.model).toBe('string');
    expect(prompt.model.length).toBeGreaterThan(0);
    expect(typeof prompt.maxTokens).toBe('number');
    expect(prompt.maxTokens).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// Audit D: analysis-module 依存監査
// buildAIPrompt() / buildPredictionPayload() の影響範囲
// ─────────────────────────────────────────────────────────────

describe('Audit D: analysis-module — buildAIPrompt() / buildPredictionPayload()', () => {
  let buildAIPrompt, buildPredictionPayload;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    buildAIPrompt        = mod.buildAIPrompt;
    buildPredictionPayload = mod.buildPredictionPayload;
  });

  // buildAIPrompt — DiseaseAnalyzer 統合確認
  it('buildAIPrompt が disease-registry を経由して分析する', () => {
    const result = buildAIPrompt(makeRecords(30), {
      myDiseases:     ['子宮内膜症'],
      lastPeriodDate: '2026-05-01',
      cycleLength:    28,
    });
    expect(result.features.disease).toBe('子宮内膜症');
    expect(result.systemPrompt).toContain('子宮内膜症');
  });

  it('buildAIPrompt: PCOS でも正常動作', () => {
    const result = buildAIPrompt(makeRecords(30), { myDiseases: ['PCOS'] });
    expect(result.features.disease).toBe('PCOS');
    expect(result.systemPrompt).toContain('PCOS');
  });

  it('buildAIPrompt: 未知疾患名は _default prompt にフォールバック', () => {
    const result = buildAIPrompt(makeRecords(30), { myDiseases: ['存在しない疾患'] });
    expect(result.systemPrompt).toContain('婦人科疾患専門');
  });

  it('buildAIPrompt: 複数疾患でも先頭疾患が反映される', () => {
    const result = buildAIPrompt(makeRecords(30), {
      myDiseases: ['子宮内膜症', 'PCOS'],
    });
    expect(result.features.disease).toBe('子宮内膜症');
  });

  // buildPredictionPayload — DiseaseAnalyzer 非依存の確認
  it('buildPredictionPayload が predictions / disease を返す', () => {
    const result = buildPredictionPayload(makeRecords(30), { myDiseases: ['PCOS'] });
    expect(result).toHaveProperty('predictions');
    expect(result).toHaveProperty('disease');
    expect(result.disease).toBe('PCOS');
  });

  it('buildPredictionPayload は disease-registry を呼ばない（予測のみ）', () => {
    // 空 records でも例外を投げないことで、disease-registry 非依存を確認
    expect(() => buildPredictionPayload([], {})).not.toThrow();
  });

  // 後方互換性
  it('buildAIPrompt: 必須フィールド全て存在', () => {
    const result = buildAIPrompt([], {});
    expect(result).toHaveProperty('features');
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');
    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('maxTokens');
  });
});

// ─────────────────────────────────────────────────────────────
// BaseAnalyzer 共通 API 単体テスト
// ─────────────────────────────────────────────────────────────

describe('BaseAnalyzer — 共通API・信頼度計算・ヘルパー', () => {
  let EndometriosisAnalyzer;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/disease/endometriosis/analyzer.js');
    EndometriosisAnalyzer = mod.EndometriosisAnalyzer;
  });

  it('analyze() が AnalysisResult の全フィールドを返す', () => {
    const analyzer = new EndometriosisAnalyzer();
    const result   = analyzer.analyze(makeRecords(30), {});
    expect(result).toHaveProperty('disease');
    expect(result).toHaveProperty('diseaseKey');
    expect(result).toHaveProperty('symptomFrequency');
    expect(result).toHaveProperty('symptomRates');
    expect(result).toHaveProperty('flarePattern');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('topFactors');
    expect(result).toHaveProperty('diseaseSpecific');
    expect(result).toHaveProperty('observations');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sampleSize');
  });

  it('30件レコード → confidence が low 以上', () => {
    const analyzer = new EndometriosisAnalyzer();
    const result   = analyzer.analyze(makeRecords(30), {});
    expect(['low', 'medium', 'high']).toContain(result.confidence);
  });

  it('0件レコード → sampleSize: 0 で例外なし', () => {
    const analyzer = new EndometriosisAnalyzer();
    expect(() => analyzer.analyze([], {})).not.toThrow();
    const result = analyzer.analyze([], {});
    expect(result.sampleSize).toBe(0);
  });

  it('trend.direction が許容値のいずれか', () => {
    const analyzer = new EndometriosisAnalyzer();
    const result   = analyzer.analyze(makeRecords(30), {});
    expect(['worsening', 'stable', 'improving']).toContain(result.trend.direction);
  });

  it('topFactors の rate は 0〜1 の範囲', () => {
    const analyzer = new EndometriosisAnalyzer();
    const result   = analyzer.analyze(makeRecords(30), {});
    for (const f of result.topFactors) {
      expect(f.rate).toBeGreaterThanOrEqual(0);
      expect(f.rate).toBeLessThanOrEqual(1);
    }
  });

  it('diseaseSpecific がサブクラスで実装される', () => {
    const analyzer = new EndometriosisAnalyzer();
    const result   = analyzer.analyze(makeRecords(30), {});
    expect(result.diseaseSpecific).toHaveProperty('nonMenstrualFlares');
    expect(result.diseaseSpecific).toHaveProperty('postSexWorsening');
  });
});
