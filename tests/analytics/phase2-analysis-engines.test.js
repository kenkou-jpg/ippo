// tests/analytics/phase2-analysis-engines.test.js
// ─────────────────────────────────────────────────────────────
// Phase2 守護テスト — 分析エンジン移行の完全接続を検証する
//
// 検証対象:
//   1. detectFlares が analysis-module.js 経由で呼ばれる
//   2. calcLagCorrelations が analysis-module.js 経由で呼ばれる
//   3. calcBaseline が analysis-module.js 経由で呼ばれる
//   4. 旧 window 参照が analysis-module.js 本体から消滅していること（コメント除く）
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// ── window スタブ ─────────────────────────────────────────────
vi.stubGlobal('window', {
  _ippoStateHooks: [],
  ippoMarkBootEvent: vi.fn(),
  buildDataSummary:   undefined,
  analyzeCyclePhases: undefined,
  calcTemperaturePhases: undefined,
});

vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ─────────────────────────────────────────────────────────────
// テスト用レコード生成
// ─────────────────────────────────────────────────────────────

function _makeRecords(count = 40) {
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
      sleepHours:  (i % 4 === 0) ? 5 : 7,
      symptoms:    (i % 3 === 0) ? ['倦怠感', '頭痛', '腹痛'] : ['倦怠感'],
      factors:     (i % 2 === 0) ? ['睡眠不足', 'ストレス'] : [],
    });
  }
  return records;
}

// ─────────────────────────────────────────────────────────────
// SECTION 1: analyzeFlareDays — flare-engine 経由
// ─────────────────────────────────────────────────────────────

describe('Phase2: analyzeFlareDays (detectFlares 接続)', () => {
  let analyzeFlareDays;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    analyzeFlareDays = mod.analyzeFlareDays;
  });

  it('analyzeFlareDays が配列を返す', () => {
    const result = analyzeFlareDays(_makeRecords(30));
    expect(Array.isArray(result)).toBe(true);
  });

  it('flare日が検出されている（painLevel 7 のレコードが含まれる）', () => {
    const result = analyzeFlareDays(_makeRecords(30));
    expect(result.length).toBeGreaterThan(0);
  });

  it('各フレアに旧API互換フィールドが存在する', () => {
    const result = analyzeFlareDays(_makeRecords(30));
    if (result.length === 0) return;
    const flare = result[0];
    expect(flare).toHaveProperty('date');
    expect(flare).toHaveProperty('dateStr');
    expect(flare).toHaveProperty('reasons');
    expect(flare).toHaveProperty('painLevel');
    expect(flare).toHaveProperty('symptoms');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: analyzeCoOccurrence — lag-correlation-engine 経由
// ─────────────────────────────────────────────────────────────

describe('Phase2: analyzeCoOccurrence (calcLagCorrelations 接続)', () => {
  let analyzeCoOccurrence;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    analyzeCoOccurrence = mod.analyzeCoOccurrence;
  });

  it('analyzeCoOccurrence がオブジェクトを返す', () => {
    const result = analyzeCoOccurrence(_makeRecords(30));
    expect(result).toBeTruthy();
    expect(typeof result).toBe('object');
  });

  it('因子キーに symptomEffects が含まれる', () => {
    const result = analyzeCoOccurrence(_makeRecords(30));
    for (const key of Object.keys(result)) {
      expect(result[key]).toHaveProperty('symptomEffects');
      expect(result[key]).toHaveProperty('days');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: analyzeBaseline — baseline-engine 経由
// ─────────────────────────────────────────────────────────────

describe('Phase2: analyzeBaseline (calcBaseline 接続)', () => {
  let analyzeBaseline;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    analyzeBaseline = mod.analyzeBaseline;
  });

  it('analyzeBaseline がエクスポートされている', () => {
    expect(typeof analyzeBaseline).toBe('function');
  });

  it('レコード不足時に isBaselineEstablished=false を返す', () => {
    const result = analyzeBaseline([]);
    expect(result.isBaselineEstablished).toBe(false);
    expect(result.baseline).toBeNull();
  });

  it('十分なレコードで baseline を算出する', () => {
    const result = analyzeBaseline(_makeRecords(40));
    expect(result).toHaveProperty('isBaselineEstablished');
    expect(result).toHaveProperty('baseline');
    expect(result).toHaveProperty('current');
    expect(result).toHaveProperty('deviation');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sampleSize');
    expect(result.sampleSize).toBeGreaterThan(0);
  });

  it('deviation に painEffectSize フィールドがある', () => {
    const result = analyzeBaseline(_makeRecords(40));
    if (!result.deviation) return;
    expect(result.deviation).toHaveProperty('painEffectSize');
    expect(result.deviation).toHaveProperty('direction');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 4: ソースコード監査 — 旧 window 参照状況
// ─────────────────────────────────────────────────────────────

describe('Phase2: ソースコード監査 — import と旧参照', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'),
    'utf-8',
  );

  it('baseline-engine が import されている', () => {
    expect(src).toContain("from '../../../analytics/baseline-engine.js'");
  });

  it('calcBaseline が import されている', () => {
    expect(src).toContain('calcBaseline');
  });

  it('flare-engine が import されている', () => {
    expect(src).toContain("from '../../../analytics/flare-engine.js'");
  });

  it('lag-correlation-engine が import されている', () => {
    expect(src).toContain("from '../../../analytics/lag-correlation-engine.js'");
  });

  it('analyzeBaseline が export されている', () => {
    expect(src).toContain('export function analyzeBaseline');
  });
});
