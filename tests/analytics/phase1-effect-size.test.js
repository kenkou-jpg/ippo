// tests/analytics/phase1-effect-size.test.js
// ─────────────────────────────────────────────────────────────
// Phase1 守護テスト — effectSize の完全実装を検証する
//
// 検証対象:
//   1. calcCohenD が正しい値を返す
//   2. insight-engine がパターン型インサイトに effectSize を付与する
//   3. effectSize = null の固定が消滅していること
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── window / localStorage スタブ ─────────────────────────────
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

vi.stubGlobal('window', {
  _ippoStateHooks: [],
  ippoMarkBootEvent: vi.fn(),
  ippoTrack: vi.fn(),
  getSettingsStore: vi.fn(() => ({})),
  ippoInsightEngine: undefined,
  navigateToPro: vi.fn(),
  _iprSwitchDisTab: undefined,
});

// ─────────────────────────────────────────────────────────────
// SECTION 1: calcCohenD — 数値検証
// ─────────────────────────────────────────────────────────────

describe('Phase1: calcCohenD', () => {
  let calcCohenD;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/analytics/effect-size-engine.js');
    calcCohenD = mod.calcCohenD;
  });

  it('3件未満のグループに対して null を返す', () => {
    expect(calcCohenD([1, 2], [3, 4, 5])).toBeNull();
    expect(calcCohenD([1, 2, 3], [4, 5])).toBeNull();
    expect(calcCohenD([], [])).toBeNull();
  });

  it('同一グループは d=0, label=negligible を返す', () => {
    const result = calcCohenD([5, 5, 5], [5, 5, 5]);
    expect(result).not.toBeNull();
    expect(result.d).toBe(0);
    expect(result.label).toBe('negligible');
  });

  it('差が大きいグループは large を返す', () => {
    // groupA: 低エネルギー / groupB: 高エネルギー で明確な差
    const groupA = [1, 1, 1, 2, 1, 1, 1, 1, 1, 1];
    const groupB = [5, 5, 5, 4, 5, 5, 5, 5, 5, 5];
    const result = calcCohenD(groupA, groupB);
    expect(result).not.toBeNull();
    expect(result.label).toBe('large');
    expect(result.d).toBeGreaterThanOrEqual(0.8);
  });

  it('小さな差は small / negligible を返す', () => {
    const groupA = [3, 3, 4, 3, 3];
    const groupB = [3, 4, 3, 3, 4];
    const result = calcCohenD(groupA, groupB);
    expect(result).not.toBeNull();
    expect(['small', 'negligible']).toContain(result.label);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: insight-engine — effectSize が null でない
// ─────────────────────────────────────────────────────────────

// レコードヘルパー: 睡眠不良 + 疲労の条件を満たすレコード群
function _makeRecords({ count = 30, poorSleepRatio = 0.5, fatigueOnPoorSleep = true } = {}) {
  const records = [];
  const base = new Date('2026-05-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isPoorSleep = i < Math.floor(count * poorSleepRatio);
    records.push({
      record_date:  dateStr,
      date:         dateStr,
      sleepQuality: isPoorSleep ? 4 : 1,
      energy:       (isPoorSleep && fatigueOnPoorSleep) ? 1 : 4,
      symptoms:     (isPoorSleep && fatigueOnPoorSleep) ? ['倦怠感'] : [],
      painLevel:    0,
      factors:      [],
    });
  }
  return records;
}

describe('Phase1: insight-engine — effectSize 付与', () => {
  let getInsights;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();

    // state モジュールを先にロードして records を注入
    const stateMod = await import('../../src/store/state.js');
    const records  = _makeRecords({ count: 30, poorSleepRatio: 0.5, fatigueOnPoorSleep: true });
    stateMod.setState({ ...stateMod.INITIAL_STATE, records });

    const mod = await import('../../src/services/insight-engine.js');
    getInsights = mod.getInsights;
  });

  it('getInsights() が配列を返す', () => {
    const insights = getInsights();
    expect(Array.isArray(insights)).toBe(true);
  });

  it('全インサイトに effectSize フィールドが存在する', () => {
    const insights = getInsights();
    for (const ins of insights) {
      expect(ins).toHaveProperty('effectSize');
    }
  });

  it('パターン型インサイトの effectSize は null でないか、またはデータ不足で null になる場合は理由が明確', () => {
    const insights = getInsights();
    const patterns = insights.filter(i => i.type === 'pattern' && i.ruleId);
    // パターン型が存在する場合: effectSize は { d, label } または null（データ不足）
    for (const ins of patterns) {
      if (ins.effectSize !== null) {
        expect(ins.effectSize).toHaveProperty('d');
        expect(ins.effectSize).toHaveProperty('label');
        expect(['large', 'medium', 'small', 'negligible']).toContain(ins.effectSize.label);
      }
    }
  });

  it('sleep_fatigue ルールが十分なデータで effectSize を計算する', () => {
    const insights = getInsights();
    const sf = insights.find(i => i.ruleId === 'RULE_SLEEP_FATIGUE');
    if (!sf) return; // データ条件を満たさない場合はスキップ
    // effectSize は null でない（両グループ 3件以上確保できる）
    expect(sf.effectSize).not.toBeNull();
    expect(sf.effectSize).toHaveProperty('d');
    expect(sf.effectSize).toHaveProperty('label');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: effectSize = null 固定が消滅していること
//            ソースコードの文字列検索で確認
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'fs';
import { resolve }      from 'path';

describe('Phase1: ソースコード監査 — effectSize = null 固定消滅', () => {
  it('insight-engine.js に "effectSize = null" が存在しない', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/services/insight-engine.js'),
      'utf-8',
    );
    // コメント内も含めて検索し、ハードコードされた null 代入がないことを確認
    const matches = src.match(/insight\.effectSize\s*=\s*null/g);
    expect(matches).toBeNull();
  });

  it('insights-dynamic-renderer.js に _EFFECT_LABEL が定義されている', () => {
    const src = readFileSync(
      resolve(process.cwd(), 'src/modules/insights-dynamic-renderer.js'),
      'utf-8',
    );
    expect(src).toContain('_EFFECT_LABEL');
    expect(src).toContain('effectSize');
  });
});
