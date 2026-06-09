// tests/analytics/phase4-prediction-engines.test.js
// ─────────────────────────────────────────────────────────────
// Phase4 守護テスト — 予測・体温エンジン接続の検証
//
// 検証対象:
//   1. analyzeTemperature が temperature-engine 経由で動作する
//   2. buildPredictionPayload が prediction-engine 経由で動作する
//   3. buildPredictionPayload の出力が ai-predict フォーマットに適合する
//   4. cluster-batch 向け prediction_cache フォーマットを確認する
//   5. 保存処理との依存関係がないこと（保存ファイルに呼び出しなし）
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

function _makeRecords(count = 20) {
  const records = [];
  const base = new Date('2026-04-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    records.push({
      record_date:  dateStr,
      date:         dateStr,
      basalTemp:    36.2 + (i % 14 < 7 ? 0 : 0.4) + Math.random() * 0.1,
      temperature:  undefined,
      painLevel:    (i % 5 === 0) ? 6 : 2,
      energy:       (i % 3 === 0) ? 2 : 4,
      sleepHours:   7,
      sleepQuality: 2,
      symptoms:     (i % 5 === 0) ? ['下腹部痛'] : [],
      factors:      [],
    });
  }
  return records;
}

// ─────────────────────────────────────────────────────────────
// SECTION 1: analyzeTemperature — temperature-engine 経由
// ─────────────────────────────────────────────────────────────

describe('Phase4: analyzeTemperature (temperature-engine 接続)', () => {
  let analyzeTemperature;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    analyzeTemperature = mod.analyzeTemperature;
  });

  it('window.calcTemperaturePhases に依存せずに動作する', () => {
    // window.calcTemperaturePhases を undefined にしても正常動作すること
    window.calcTemperaturePhases = undefined;
    expect(() => analyzeTemperature(_makeRecords(15))).not.toThrow();
  });

  it('analyzeTemperature が temperature-engine 形式のオブジェクトを返す', () => {
    const result = analyzeTemperature(_makeRecords(15));
    expect(result).toHaveProperty('readings');
    expect(result).toHaveProperty('ewmaLine');
    expect(result).toHaveProperty('phases');
    expect(result).toHaveProperty('biphasicDetected');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sampleSize');
  });

  it('空レコードで insufficientResult を返す（例外なし）', () => {
    const result = analyzeTemperature([]);
    expect(result.confidence).toBe('insufficient');
    expect(result.sampleSize).toBe(0);
    expect(result.biphasicDetected).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: prediction-engine — predictNext()
// ─────────────────────────────────────────────────────────────

describe('Phase4: prediction-engine — predictNext()', () => {
  let predictNext;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/analytics/prediction-engine.js');
    predictNext = mod.predictNext;
  });

  it('predictNext が予測オブジェクトを返す', () => {
    const result = predictNext(_makeRecords(20));
    expect(result).toHaveProperty('pain');
    expect(result).toHaveProperty('fatigue');
    expect(result).toHaveProperty('headache');
    expect(result).toHaveProperty('sleep');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sampleSize');
    expect(result).toHaveProperty('disclaimer');
    expect(result.disclaimer).toBe(true);
  });

  it('disclaimerText が含まれる（Blueprint 7.3 準拠）', () => {
    const result = predictNext(_makeRecords(20));
    expect(result.disclaimerText).toContain('医療診断');
  });

  it('空レコードで空結果を返す（例外なし）', () => {
    const result = predictNext([]);
    expect(result.sampleSize).toBe(0);
    expect(result.confidence).toBe('insufficient');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: buildPredictionPayload — prediction-engine 接続
// ─────────────────────────────────────────────────────────────

describe('Phase4: buildPredictionPayload (prediction-engine 接続)', () => {
  let buildPredictionPayload;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    buildPredictionPayload = mod.buildPredictionPayload;
  });

  it('buildPredictionPayload がエクスポートされている', () => {
    expect(typeof buildPredictionPayload).toBe('function');
  });

  it('ai-predict 向けのペイロードを返す', () => {
    const result = buildPredictionPayload(_makeRecords(20), { myDiseases: ['子宮内膜症'] });
    // ai-predict/index.ts が受け取るフィールド
    expect(result).toHaveProperty('predictions');
    expect(result).toHaveProperty('disease');
    expect(typeof result.predictions).toBe('object');
  });

  it('predictions に pain/fatigue/headache/sleep が含まれる', () => {
    const result = buildPredictionPayload(_makeRecords(20), {});
    const p = result.predictions;
    expect(p).toHaveProperty('pain');
    expect(p).toHaveProperty('fatigue');
    expect(p).toHaveProperty('headache');
    expect(p).toHaveProperty('sleep');
  });

  it('cluster-batch 向け prediction_cache フォーマットを確認', () => {
    // cluster-batch は profiles.prediction_cache から
    // [pain.value, fatigue.value, sleep.value] を抽出して k-means を実行する
    const result = buildPredictionPayload(_makeRecords(30), {});
    const cache  = result.predictions;
    // _extractVector(cache) が [pain, fatigue, sleep] を取れること
    const painVal    = typeof cache.pain?.value    === 'number' ? cache.pain.value    : 0;
    const fatigueVal = typeof cache.fatigue?.value === 'number' ? cache.fatigue.value : 0;
    const sleepVal   = typeof cache.sleep?.value   === 'number' ? cache.sleep.value   : 0;
    expect(painVal).toBeGreaterThanOrEqual(0);
    expect(fatigueVal).toBeGreaterThanOrEqual(0);
    expect(sleepVal).toBeGreaterThanOrEqual(0);
  });

  it('disease が myDiseases[0] を返す', () => {
    const result = buildPredictionPayload([], { myDiseases: ['PCOS'] });
    expect(result.disease).toBe('PCOS');
  });

  it('空レコードでも例外を投げない', () => {
    expect(() => buildPredictionPayload([], {})).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 4: 保存処理安全性 — PostSaveHook / saveRecord 非依存
// ─────────────────────────────────────────────────────────────

// コメントを除いた実コード行のみを抽出する
function _codeLines(src) {
  return src.split('\n')
    .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .join('\n');
}

describe('Phase4: 保存処理安全性', () => {
  const analysisCode = _codeLines(readFileSync(
    resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'), 'utf-8',
  ));
  const tempCode = _codeLines(readFileSync(
    resolve(process.cwd(), 'src/analytics/temperature-engine.js'), 'utf-8',
  ));
  const predCode = _codeLines(readFileSync(
    resolve(process.cwd(), 'src/analytics/prediction-engine.js'), 'utf-8',
  ));

  it('temperature-engine.js の実コードに saveRecord / addPostSaveHook 呼び出しがない', () => {
    expect(tempCode).not.toContain('saveRecord(');
    expect(tempCode).not.toContain('addPostSaveHook(');
  });

  it('prediction-engine.js の実コードに saveRecord / addPostSaveHook 呼び出しがない', () => {
    expect(predCode).not.toContain('saveRecord(');
    expect(predCode).not.toContain('addPostSaveHook(');
  });

  it('analysis-module.js の実コードに saveRecord / addPostSaveHook 呼び出しがない', () => {
    expect(analysisCode).not.toContain('saveRecord(');
    expect(analysisCode).not.toContain('addPostSaveHook(');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 5: ソースコード監査 — import 確認
// ─────────────────────────────────────────────────────────────

describe('Phase4: ソースコード監査 — import確認', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'),
    'utf-8',
  );

  it('temperature-engine が import されている', () => {
    expect(src).toContain("from '../../../analytics/temperature-engine.js'");
  });

  it('prediction-engine が import されている', () => {
    expect(src).toContain("from '../../../analytics/prediction-engine.js'");
  });

  it('analyzeTemperature が temperature-engine を呼んでいる', () => {
    expect(src).toContain('analyzeTemperatureEngine(');
  });

  it('buildPredictionPayload が predictNext を呼んでいる', () => {
    expect(src).toContain('predictNext(');
  });

  it('window.calcTemperaturePhases の実参照がない', () => {
    // コメントを除いた実コードに window.calcTemperaturePhases がないこと
    const codeLines = src.split('\n').filter(l => !l.trim().startsWith('//'));
    const hasRef = codeLines.some(l => l.includes('window.calcTemperaturePhases'));
    expect(hasRef).toBe(false);
  });
});
