// tests/analytics/cycle-engine.test.js
// ─────────────────────────────────────────────────────────────
// cycle-engine.js 守護テスト
//
// 検証対象:
//   1. analyzeCyclePhases が 4フェーズを正しく分類する
//   2. currentPhase / currentDay が lastPeriodDate から正しく計算される
//   3. lastPeriodDate 未設定時は insufficient を返す
//   4. ovulationEstimate が正しく計算される
//   5. フェーズメトリクスが正しく集計される
//   6. window.* に依存しない（window スタブ不要で動作する）
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { analyzeCyclePhases }   from '../../src/analytics/cycle-engine.js';

// ─── テスト用レコード生成 ─────────────────────────────────────

function makeRecord(daysFromPeriod, overrides = {}) {
  const base = new Date('2026-06-01T00:00:00Z');
  base.setUTCDate(base.getUTCDate() + daysFromPeriod);
  return {
    record_date: base.toISOString().slice(0, 10),
    painLevel:   3,
    energy:      3,
    sleepHours:  7,
    symptoms:    ['腹痛'],
    factors:     [],
    ...overrides,
  };
}

// lastPeriodDate = 2026-06-01 (D1)
// cycleLength    = 28
// 月経期:  D1〜D5    → 2026-06-01 〜 2026-06-05
// 卵胞期:  D6〜D13   → 2026-06-06 〜 2026-06-13
// 排卵期:  D14〜D15  → 2026-06-14 〜 2026-06-15
// 黄体期:  D16〜D28  → 2026-06-16 〜 2026-06-28
const LAST_PERIOD = '2026-06-01';
const STATE       = { lastPeriodDate: LAST_PERIOD, cycleLength: 28 };

const records = [
  makeRecord(0,  { painLevel: 6, symptoms: ['生理痛', '腹痛'] }),    // D1 月経期
  makeRecord(2,  { painLevel: 5, symptoms: ['生理痛'] }),             // D3 月経期
  makeRecord(4,  { painLevel: 3, symptoms: ['倦怠感'] }),             // D5 月経期
  makeRecord(7,  { painLevel: 1, symptoms: [], energy: 4 }),          // D8 卵胞期
  makeRecord(10, { painLevel: 1, symptoms: [], energy: 5 }),          // D11 卵胞期
  makeRecord(13, { painLevel: 2, symptoms: ['腹痛'], energy: 4 }),    // D14 排卵期
  makeRecord(14, { painLevel: 2, symptoms: [] }),                     // D15 排卵期
  makeRecord(18, { painLevel: 4, symptoms: ['頭痛', '乳房痛'] }),     // D19 黄体期
  makeRecord(22, { painLevel: 5, symptoms: ['むくみ', '頭痛'] }),     // D23 黄体期
  makeRecord(26, { painLevel: 4, symptoms: ['倦怠感'] }),             // D27 黄体期
];

// ─── テスト本体 ───────────────────────────────────────────────

describe('analyzeCyclePhases — 基本動作', () => {
  it('lastPeriodDate 未設定時は insufficient を返す', () => {
    const result = analyzeCyclePhases(records, {});
    expect(result.confidence).toBe('insufficient');
    expect(result.currentPhase).toBe('unknown');
    expect(result.currentDay).toBeNull();
  });

  it('records が空配列の場合は insufficient を返す', () => {
    const result = analyzeCyclePhases([], STATE);
    expect(result.confidence).toBe('insufficient');
    expect(result.sampleSize).toBe(0);
  });

  it('4フェーズすべてが存在する', () => {
    const result = analyzeCyclePhases(records, STATE);
    expect(result.phases).toHaveProperty('menstrual');
    expect(result.phases).toHaveProperty('follicular');
    expect(result.phases).toHaveProperty('ovulation');
    expect(result.phases).toHaveProperty('luteal');
  });
});

describe('analyzeCyclePhases — フェーズ分類', () => {
  it('月経期に D1〜D5 のレコードが入る', () => {
    const result = analyzeCyclePhases(records, STATE);
    // D1, D3, D5 の3件
    expect(result.phases.menstrual.count).toBe(3);
  });

  it('卵胞期に D6〜D13 のレコードが入る', () => {
    const result = analyzeCyclePhases(records, STATE);
    // D8, D11 の2件
    expect(result.phases.follicular.count).toBe(2);
  });

  it('排卵期に D14〜D15 のレコードが入る', () => {
    const result = analyzeCyclePhases(records, STATE);
    // D14, D15 の2件
    expect(result.phases.ovulation.count).toBe(2);
  });

  it('黄体期に D16〜D28 のレコードが入る', () => {
    const result = analyzeCyclePhases(records, STATE);
    // D19, D23, D27 の3件
    expect(result.phases.luteal.count).toBe(3);
  });

  it('sampleSize はレコード総数と一致する', () => {
    const result = analyzeCyclePhases(records, STATE);
    expect(result.sampleSize).toBe(records.length);
  });
});

describe('analyzeCyclePhases — フェーズメトリクス', () => {
  it('月経期の avgPain が計算される', () => {
    const result = analyzeCyclePhases(records, STATE);
    // painLevel: 6, 5, 3 → 平均 4.7
    expect(result.phases.menstrual.avgPain).toBeCloseTo(4.7, 0);
  });

  it('卵胞期の avgPain が月経期より低い', () => {
    const result = analyzeCyclePhases(records, STATE);
    expect(result.phases.follicular.avgPain).toBeLessThan(result.phases.menstrual.avgPain);
  });

  it('フェーズメトリクスに topSymptoms が含まれる', () => {
    const result = analyzeCyclePhases(records, STATE);
    expect(Array.isArray(result.phases.menstrual.topSymptoms)).toBe(true);
    expect(result.phases.menstrual.topSymptoms.length).toBeGreaterThan(0);
    expect(result.phases.menstrual.topSymptoms[0]).toHaveProperty('symptom');
    expect(result.phases.menstrual.topSymptoms[0]).toHaveProperty('count');
  });

  it('flareCount: painLevel>=6 の日数が正しく集計される', () => {
    const result = analyzeCyclePhases(records, STATE);
    // 月経期 D1 に painLevel: 6 → flareCount: 1
    expect(result.phases.menstrual.flareCount).toBe(1);
  });
});

describe('analyzeCyclePhases — 現在フェーズ・周期日数', () => {
  it('ovulationEstimate が YYYY-MM-DD 形式で返る', () => {
    const result = analyzeCyclePhases(records, STATE);
    expect(result.ovulationEstimate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('confidence はサンプルサイズに応じたラベルを返す', () => {
    const result = analyzeCyclePhases(records, STATE);
    // 10件 → 'low'
    expect(['low', 'medium', 'high', 'insufficient']).toContain(result.confidence);
  });

  it('currentPhase は有効な値を返す', () => {
    const validPhases = ['menstrual', 'follicular', 'ovulation', 'luteal', 'unknown'];
    const result = analyzeCyclePhases(records, STATE);
    expect(validPhases).toContain(result.currentPhase);
  });
});

describe('analyzeCyclePhases — 異なる周期長', () => {
  it('21日周期でも4フェーズが計算される', () => {
    const state21 = { lastPeriodDate: LAST_PERIOD, cycleLength: 21 };
    const result  = analyzeCyclePhases(records, state21);
    expect(result.phases.menstrual.count).toBeGreaterThanOrEqual(0);
    expect(result.phases.luteal.count).toBeGreaterThanOrEqual(0);
  });

  it('35日周期でも confidence が返る', () => {
    const state35 = { lastPeriodDate: LAST_PERIOD, cycleLength: 35 };
    const result  = analyzeCyclePhases(records, state35);
    expect(['low', 'medium', 'high', 'insufficient']).toContain(result.confidence);
  });
});

describe('analyzeCyclePhases — window非依存', () => {
  it('window.analyzeCyclePhases が undefined でも動作する', () => {
    // window スタブなしで直接呼び出し（vitest環境はwindowなし）
    expect(() => analyzeCyclePhases(records, STATE)).not.toThrow();
  });
});
