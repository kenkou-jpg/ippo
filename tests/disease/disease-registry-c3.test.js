// tests/disease/disease-registry-c3.test.js
// PR-C3: DiseaseRegistry中心アーキテクチャ統一テスト
//
// 検証:
//   1. resolveKeys() — 日本語名 → diseaseKey 変換
//   2. JA_TO_KEY — エクスポート済みマッピング定数
//   3. analysis-module が DISEASE_KEY_MAP を持たないこと
//   4. buildAIPrompt() が resolveKeys 経由で動作すること

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

function makeRecords(count = 20) {
  const base = new Date('2026-04-01');
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    return {
      record_date: dateStr, date: dateStr,
      painLevel: (i % 3 === 0) ? 6 : 2,
      symptoms:  ['下腹部痛', '倦怠感'],
      factors:   ['ストレス高'],
    };
  });
}

// ─────────────────────────────────────────────────────────────
// 1. resolveKeys() — 変換ロジック
// ─────────────────────────────────────────────────────────────

describe('PR-C3: resolveKeys() — 日本語疾患名 → diseaseKey 変換', () => {
  let resolveKeys, JA_TO_KEY;

  beforeEach(async () => {
    vi.resetModules();
    ({ resolveKeys, JA_TO_KEY } = await import('../../src/disease/disease-registry.js'));
  });

  it('日本語疾患名を正しい diseaseKey に変換する', () => {
    expect(resolveKeys(['子宮内膜症'])).toEqual(['endometriosis']);
    expect(resolveKeys(['PCOS'])).toEqual(['pcos']);
    expect(resolveKeys(['PMS/PMDD'])).toEqual(['pms']);
    expect(resolveKeys(['外陰痛症候群'])).toEqual(['vulvodynia']);
  });

  it('複数疾患を一括変換する', () => {
    const keys = resolveKeys(['子宮内膜症', 'PCOS', '不妊症']);
    expect(keys).toEqual(['endometriosis', 'pcos', 'infertility']);
  });

  it('未知の疾患名はスキップされる', () => {
    const keys = resolveKeys(['存在しない疾患', '子宮内膜症']);
    expect(keys).toEqual(['endometriosis']);
  });

  it('空配列を渡すと空配列を返す', () => {
    expect(resolveKeys([])).toEqual([]);
  });

  it('null/undefined を渡しても例外なし', () => {
    expect(() => resolveKeys(null)).not.toThrow();
    expect(() => resolveKeys(undefined)).not.toThrow();
    expect(resolveKeys(null)).toEqual([]);
  });

  it('PMS と PMDD が両方 pms/pmdd にマッピングされる', () => {
    expect(resolveKeys(['PMS'])).toEqual(['pms']);
    expect(resolveKeys(['PMDD'])).toEqual(['pmdd']);
  });

  it('13エントリの日本語名が全て JA_TO_KEY に存在する', () => {
    const expectedJaNames = [
      '子宮内膜症', '卵巣嚢腫', '子宮筋腫', '子宮腺筋症',
      'PCOS', 'PMS', 'PMDD', 'PMS/PMDD',
      '更年期障害', '不妊症', '骨盤臓器脱', '慢性骨盤痛', '外陰痛症候群',
    ];
    for (const name of expectedJaNames) {
      expect(JA_TO_KEY[name], `${name} が JA_TO_KEY に未登録`).toBeTruthy();
    }
  });

  it('JA_TO_KEY の全 value が REGISTRY に存在する diseaseKey', async () => {
    const { listDiseaseKeys } = await import('../../src/disease/disease-registry.js');
    const keys = listDiseaseKeys();
    for (const [ja, key] of Object.entries(JA_TO_KEY)) {
      expect(keys, `${ja} → ${key} が Registry に未登録`).toContain(key);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2. analysis-module ソースコード監査
//    DISEASE_KEY_MAP が存在しないこと
//    resolveKeys が import されていること
// ─────────────────────────────────────────────────────────────

describe('PR-C3: ソースコード監査 — analysis-module.js', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'),
    'utf-8',
  );

  it('DISEASE_KEY_MAP がインライン定義されていない', () => {
    expect(src).not.toContain('DISEASE_KEY_MAP');
  });

  it('resolveKeys が import されている', () => {
    expect(src).toContain('resolveKeys');
  });

  it('disease-registry から resolveKeys を import している', () => {
    expect(src).toContain("from '../../../disease/disease-registry.js'");
    expect(src).toMatch(/import\s*\{[^}]*resolveKeys[^}]*\}\s*from/);
  });

  it('buildAIPrompt 内で resolveKeys() が呼ばれている', () => {
    expect(src).toContain('resolveKeys(diseases)');
  });

  it('日本語疾患名のハードコードが残っていない（子宮内膜症等）', () => {
    expect(src).not.toContain("'子宮内膜症'");
    expect(src).not.toContain("'卵巣嚢腫'");
    expect(src).not.toContain("'子宮筋腫'");
  });
});

// ─────────────────────────────────────────────────────────────
// 3. disease-registry ソースコード監査
//    JA_TO_KEY が export されていること
// ─────────────────────────────────────────────────────────────

describe('PR-C3: ソースコード監査 — disease-registry.js', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/disease/disease-registry.js'),
    'utf-8',
  );

  it('JA_TO_KEY が export されている', () => {
    expect(src).toContain('export const JA_TO_KEY');
  });

  it('resolveKeys が export されている', () => {
    expect(src).toContain('export function resolveKeys');
  });

  it('JA_TO_KEY に13エントリの日本語疾患名が含まれる', () => {
    const names = [
      '子宮内膜症', '卵巣嚢腫', '子宮筋腫', '子宮腺筋症',
      'PCOS', 'PMS/PMDD', '更年期障害', '不妊症',
      '骨盤臓器脱', '慢性骨盤痛', '外陰痛症候群',
    ];
    for (const name of names) {
      expect(src, `${name} が disease-registry.js に未定義`).toContain(name);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 目標構成の動作確認
//    DiseaseRegistry → Analyzer → feature-engine → prompt-builder
// ─────────────────────────────────────────────────────────────

describe('PR-C3: 目標構成 — DiseaseRegistry中心の動作確認', () => {
  let buildAIPrompt, resolveKeys, analyzeAll;

  beforeEach(async () => {
    vi.resetModules();
    [
      { buildAIPrompt } ,
      { resolveKeys, analyzeAll },
    ] = await Promise.all([
      import('../../src/modules/pro/analysis/analysis-module.js'),
      import('../../src/disease/disease-registry.js'),
    ]);
  });

  it('resolveKeys → analyzeAll → buildAIPrompt が連鎖して動作する', () => {
    const jaNames = ['子宮内膜症', 'PCOS'];
    const keys    = resolveKeys(jaNames);
    expect(keys).toContain('endometriosis');
    expect(keys).toContain('pcos');

    const results = analyzeAll(keys, makeRecords(20), {});
    expect(results.length).toBe(2);

    const payload = buildAIPrompt(makeRecords(20), { myDiseases: jaNames });
    expect(payload.features.disease).toBe('子宮内膜症');
    expect(payload.systemPrompt).toContain('子宮内膜症');
  });

  it('全12疾患の日本語名で buildAIPrompt が正常動作する', () => {
    const allJaNames = [
      '子宮内膜症', '卵巣嚢腫', '子宮筋腫', '子宮腺筋症',
      'PCOS', 'PMS/PMDD', '更年期障害', '不妊症',
      '骨盤臓器脱', '慢性骨盤痛', '外陰痛症候群',
    ];
    for (const name of allJaNames) {
      expect(() => buildAIPrompt(makeRecords(10), { myDiseases: [name] }))
        .not.toThrow();
    }
  });

  it('analysis-module は DiseaseAnalyzer の詳細を知らなくても動作する', () => {
    // resolveKeys で変換された diseaseKey だけで動作 — 日本語名の知識は不要
    const payload = buildAIPrompt(makeRecords(20), { myDiseases: ['子宮腺筋症'] });
    expect(payload).toHaveProperty('features');
    expect(payload).toHaveProperty('systemPrompt');
    expect(payload).toHaveProperty('userPrompt');
  });
});
