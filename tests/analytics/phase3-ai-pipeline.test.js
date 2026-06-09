// tests/analytics/phase3-ai-pipeline.test.js
// ─────────────────────────────────────────────────────────────
// Phase3 守護テスト — Disease Layer + AI Layer 接続の完全検証
//
// 検証対象:
//   1. disease-registry が analyzeAll() を持ち動作する
//   2. feature-engine が extractFeatures() を持ち動作する
//   3. prompt-builder が buildPrompt() を持ち動作する
//   4. buildAIPrompt() が records→prompt の完全パイプラインを実行する
//   5. 返却ペイロードが ai-analyze 新経路フォーマットに適合する
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ─── テスト用レコード ─────────────────────────────────────────

function _makeRecords(count = 30) {
  const records = [];
  const base = new Date('2026-04-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    records.push({
      record_date: dateStr,
      date:        dateStr,
      painLevel:   (i % 3 === 0) ? 7 : 2,
      energy:      (i % 2 === 0) ? 2 : 4,
      symptoms:    ['下腹部痛', '倦怠感'],
      factors:     ['睡眠不足'],
    });
  }
  return records;
}

// ─────────────────────────────────────────────────────────────
// SECTION 1: disease-registry — analyzeAll()
// ─────────────────────────────────────────────────────────────

describe('Phase3: disease-registry', () => {
  let analyzeAll, getAnalyzer, listDiseaseKeys;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/disease/disease-registry.js');
    analyzeAll     = mod.analyzeAll;
    getAnalyzer    = mod.getAnalyzer;
    listDiseaseKeys = mod.listDiseaseKeys;
  });

  it('listDiseaseKeys が11疾患を返す', () => {
    const keys = listDiseaseKeys();
    expect(keys.length).toBeGreaterThanOrEqual(11);
  });

  it('getAnalyzer("endometriosis") がアナライザーを返す', () => {
    const analyzer = getAnalyzer('endometriosis');
    expect(analyzer).toBeTruthy();
    expect(typeof analyzer.analyze).toBe('function');
  });

  it('analyzeAll でendometriosisを分析できる', () => {
    const results = analyzeAll(['endometriosis'], _makeRecords(30), {});
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(results[0]).toHaveProperty('disease');
    expect(results[0]).toHaveProperty('symptomFrequency');
    expect(results[0]).toHaveProperty('trend');
    expect(results[0]).toHaveProperty('confidence');
  });

  it('analyzeAll に空リストを渡すと空配列を返す', () => {
    expect(analyzeAll([], _makeRecords(10), {})).toEqual([]);
  });

  it('不明な diseaseKey はスキップされる', () => {
    const results = analyzeAll(['unknown_disease'], _makeRecords(10), {});
    expect(results).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: feature-engine — extractFeatures()
// ─────────────────────────────────────────────────────────────

describe('Phase3: feature-engine', () => {
  let extractFeatures;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/ai/feature-engine.js');
    extractFeatures = mod.extractFeatures;
  });

  it('extractFeatures が ClaudeFeatures 型を返す', () => {
    const features = extractFeatures({
      sampleInfo:     { sampleSize: 30, confidence: 'medium' },
      flares:         { flareRate: 0.3, topTriggers: [{ factor: '睡眠不足' }] },
      diseaseAnalysis: [],
    }, { diseases: ['子宮内膜症'] });

    expect(features).toHaveProperty('period');
    expect(features).toHaveProperty('sampleSize');
    expect(features).toHaveProperty('confidence');
    expect(features).toHaveProperty('topSymptoms');
    expect(features).toHaveProperty('trend');
    expect(features).toHaveProperty('flareRate');
    expect(features).toHaveProperty('flareTrigger');
    expect(features).toHaveProperty('disclaimer');
  });

  it('flareRate が "%" 形式の文字列になる', () => {
    const features = extractFeatures({
      sampleInfo: { sampleSize: 20, confidence: 'low' },
      flares:     { flareRate: 0.25, topTriggers: [] },
    });
    expect(features.flareRate).toBe('25%');
  });

  it('空入力でも例外を投げない', () => {
    expect(() => extractFeatures(null)).not.toThrow();
    expect(() => extractFeatures({})).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: prompt-builder — buildPrompt()
// ─────────────────────────────────────────────────────────────

describe('Phase3: prompt-builder', () => {
  let buildPrompt, getSystemPrompt, listSupportedDiseases;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/ai/prompt-builder.js');
    buildPrompt           = mod.buildPrompt;
    getSystemPrompt       = mod.getSystemPrompt;
    listSupportedDiseases = mod.listSupportedDiseases;
  });

  it('buildPrompt が { system, user, model, maxTokens } を返す', () => {
    const prompt = buildPrompt({
      period: '直近90日', sampleSize: 30, confidence: 'medium',
      topSymptoms: ['下腹部痛', '倦怠感'],
      trend: 'stable', flareRate: '25%', flareTrigger: '睡眠不足',
      disease: '子宮内膜症', diseaseSpecific: null, worsened: false,
      disclaimer: 'これは医療診断ではありません。',
    });
    expect(prompt).toHaveProperty('system');
    expect(prompt).toHaveProperty('user');
    expect(prompt).toHaveProperty('model');
    expect(prompt).toHaveProperty('maxTokens');
    expect(typeof prompt.system).toBe('string');
    expect(typeof prompt.user).toBe('string');
    expect(prompt.user.length).toBeGreaterThan(0);
  });

  it('疾患が null の場合は _default prompt を使用する', () => {
    const system = getSystemPrompt(null);
    expect(system).toContain('婦人科疾患専門');
  });

  it('子宮内膜症の system prompt が存在する', () => {
    const system = getSystemPrompt('子宮内膜症');
    expect(system).toContain('子宮内膜症');
  });

  it('listSupportedDiseases が配列を返す', () => {
    const diseases = listSupportedDiseases();
    expect(Array.isArray(diseases)).toBe(true);
    expect(diseases.length).toBeGreaterThan(0);
    expect(diseases).toContain('子宮内膜症');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 4: buildAIPrompt — 完全パイプライン
// ─────────────────────────────────────────────────────────────

describe('Phase3: buildAIPrompt — 完全パイプライン', () => {
  let buildAIPrompt;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    buildAIPrompt = mod.buildAIPrompt;
  });

  it('buildAIPrompt がエクスポートされている', () => {
    expect(typeof buildAIPrompt).toBe('function');
  });

  it('records + state から ai-analyze 新経路ペイロードを返す', () => {
    const result = buildAIPrompt(_makeRecords(30), {
      myDiseases:    ['子宮内膜症'],
      lastPeriodDate: '2026-05-15',
      cycleLength:    28,
    });

    // ai-analyze 新経路に必要なフィールド
    expect(result).toHaveProperty('features');
    expect(result).toHaveProperty('systemPrompt');
    expect(result).toHaveProperty('userPrompt');
    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('maxTokens');
  });

  it('features に ClaudeFeatures の必須フィールドが含まれる', () => {
    const result = buildAIPrompt(_makeRecords(30), { myDiseases: ['PCOS'] });
    const f = result.features;
    expect(f).toHaveProperty('period');
    expect(f).toHaveProperty('sampleSize');
    expect(f).toHaveProperty('confidence');
    expect(f).toHaveProperty('flareRate');
    expect(f).toHaveProperty('disclaimer');
  });

  it('空recordsでも例外を投げない', () => {
    expect(() => buildAIPrompt([], {})).not.toThrow();
  });

  it('systemPrompt が非空文字列である', () => {
    const result = buildAIPrompt(_makeRecords(20), {});
    expect(typeof result.systemPrompt).toBe('string');
    expect(result.systemPrompt.length).toBeGreaterThan(0);
  });

  it('userPrompt に disclaimer が含まれる', () => {
    const result = buildAIPrompt(_makeRecords(20), {});
    expect(result.userPrompt).toContain('医療診断');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 5: ソースコード監査 — import 存在確認
// ─────────────────────────────────────────────────────────────

describe('Phase3: ソースコード監査 — import確認', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'),
    'utf-8',
  );

  it('disease-registry が import されている', () => {
    expect(src).toContain("from '../../../disease/disease-registry.js'");
  });

  it('feature-engine が import されている', () => {
    expect(src).toContain("from '../../../ai/feature-engine.js'");
  });

  it('prompt-builder が import されている', () => {
    expect(src).toContain("from '../../../ai/prompt-builder.js'");
  });

  it('analyzeAll が呼ばれている', () => {
    expect(src).toContain('analyzeAll(');
  });

  it('extractFeatures が呼ばれている', () => {
    expect(src).toContain('extractFeatures(');
  });

  it('buildPrompt が呼ばれている', () => {
    expect(src).toContain('buildPrompt(');
  });

  it('buildAIPrompt が export されている', () => {
    expect(src).toContain('export function buildAIPrompt');
  });
});
