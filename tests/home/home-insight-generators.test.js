// tests/home/home-insight-generators.test.js
// Home Insight Generator の構造データ出力を検証する。
// action-generator が正規表現を使わず構造フィールドを参照することを保証する。

import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ── prediction-generator モック ──────────────────────────────────
vi.mock('../../src/analytics/prediction-engine.js', () => ({
  predictNext: (_records) => ({
    confidence: 'high',
    pain:     { value: 8 },
    headache: { value: 0.7 },
    fatigue:  { value: 7 },
  }),
}));

// ── disease-registry モック ──────────────────────────────────────
vi.mock('../../src/disease/disease-registry.js', () => ({
  resolveKeys: (_diseases) => ['endometriosis'],
  analyzeAll:  (_keys, _records, _state) => ([{
    disease:         '子宮内膜症',
    confidence:      'high',
    trend:           { direction: 'worsening' },
    flarePattern:    { rate: 0.35 },
    topFactors:      [{ factor: '冷え' }],
    symptomFrequency:[{ symptom: '腹痛' }],
  }]),
}));

import { generatePrediction } from '../../src/home/prediction-generator.js';
import { generateReason }     from '../../src/home/reason-generator.js';
import { generateAction }     from '../../src/home/action-generator.js';

// ────────────────────────────────────────────────────────────────

describe('prediction-generator', () => {
  it('painScore / headacheRisk / fatigueScore を構造フィールドとして返す', () => {
    const result = generatePrediction([]);
    expect(result).not.toBeNull();
    expect(result.painScore).toBe(8);
    expect(result.headacheRisk).toBe(0.7);
    expect(result.fatigueScore).toBe(7);
  });

  it('type が prediction', () => {
    expect(generatePrediction([])?.type).toBe('prediction');
  });
});

// ────────────────────────────────────────────────────────────────

describe('reason-generator', () => {
  const state = { myDiseases: ['endometriosis'] };

  it('topTrigger / trendDirection / flareRate を構造フィールドとして返す', () => {
    const result = generateReason([], state);
    expect(result).not.toBeNull();
    expect(result.topTrigger).toBe('冷え');
    expect(result.trendDirection).toBe('worsening');
    expect(result.flareRate).toBeCloseTo(0.35);
  });

  it('type が reason', () => {
    expect(generateReason([], state)?.type).toBe('reason');
  });
});

// ────────────────────────────────────────────────────────────────

describe('action-generator', () => {
  it('高痛みスコアで priority 1 を選択する（正規表現不要）', () => {
    const prediction = { type: 'prediction', confidence: 0.9, painScore: 8, headacheRisk: 0.3, fatigueScore: 5, body: '' };
    const reason     = { type: 'reason',     confidence: 0.9, topTrigger: null, trendDirection: null, flareRate: null, body: '' };
    const result = generateAction({ reason, prediction, temperature: null, state: {} });
    expect(result.priority).toBe(1);
  });

  it('トリガーが存在する場合 priority 2 を選択する', () => {
    const prediction = { type: 'prediction', confidence: 0.9, painScore: 3, headacheRisk: 0.3, fatigueScore: 5, body: '' };
    const reason     = { type: 'reason',     confidence: 0.9, topTrigger: '冷え', trendDirection: null, flareRate: null, body: '' };
    const result = generateAction({ reason, prediction, temperature: null, state: {} });
    expect(result.priority).toBe(2);
    expect(result.body).toContain('冷え');
  });

  it('悪化傾向で priority 5 を選択する', () => {
    const prediction = { type: 'prediction', confidence: 0.9, painScore: 2, headacheRisk: 0.1, fatigueScore: 3, body: '' };
    const reason     = { type: 'reason',     confidence: 0.9, topTrigger: null, trendDirection: 'worsening', flareRate: null, body: '' };
    const result = generateAction({ reason, prediction, temperature: null, state: {} });
    expect(result.priority).toBe(5);
  });

  it('何もなければデフォルト priority 6', () => {
    const result = generateAction({ reason: null, prediction: null, temperature: null, state: {} });
    expect(result.priority).toBe(6);
  });

  it('action-generator.js に _extractPainScore / _extractTrigger が存在しない', async () => {
    const { readFileSync } = await import('fs');
    const { resolve }      = await import('path');
    const src = readFileSync(resolve('src/home/action-generator.js'), 'utf8');
    expect(src).not.toContain('_extractPainScore');
    expect(src).not.toContain('_extractTrigger');
    expect(src).not.toContain('.match(');
  });
});
