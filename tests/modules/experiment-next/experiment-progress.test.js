// tests/modules/experiment-next/experiment-progress.test.js
import { describe, it, expect } from 'vitest';
import { computeExperimentProgress } from '../../../src/modules/experiment-next/experiment-progress.js';

describe('computeExperimentProgress', () => {
  it('開始日当日はDay 1', () => {
    const today = new Date('2026-07-15T09:00:00');
    const r = computeExperimentProgress({ startDate: '2026-07-15T00:00:00', days: 14, today });
    expect(r).toEqual({ currentDay: 1, totalDays: 14, progressPercent: 7, isCompleted: false });
  });

  it('中間日は正しい経過日数と割合を返す', () => {
    const today = new Date('2026-07-19T09:00:00');
    // 2026-07-15開始 → 2026-07-19は5日目 (15,16,17,18,19)
    const r = computeExperimentProgress({ startDate: '2026-07-15T00:00:00', days: 14, today });
    expect(r.currentDay).toBe(5);
    expect(r.totalDays).toBe(14);
    expect(r.progressPercent).toBe(36);
    expect(r.isCompleted).toBe(false);
  });

  it('終了日ちょうどはisCompleted=false・100%未満にはならない', () => {
    const today = new Date('2026-07-28T09:00:00'); // 14日目
    const r = computeExperimentProgress({ startDate: '2026-07-15T00:00:00', days: 14, today });
    expect(r.currentDay).toBe(14);
    expect(r.progressPercent).toBe(100);
    expect(r.isCompleted).toBe(false);
  });

  it('終了日超過はisCompleted=true・currentDayはtotalDaysに丸める', () => {
    const today = new Date('2026-08-15T09:00:00'); // 開始から31日経過
    const r = computeExperimentProgress({ startDate: '2026-07-15T00:00:00', days: 14, today });
    expect(r.isCompleted).toBe(true);
    expect(r.currentDay).toBe(14);
    expect(r.progressPercent).toBe(100);
  });

  it('未来日startDate（今日より後）はDay 1に丸める', () => {
    const today = new Date('2026-07-15T09:00:00');
    const r = computeExperimentProgress({ startDate: '2026-07-20T00:00:00', days: 14, today });
    expect(r.currentDay).toBe(1);
    expect(r.isCompleted).toBe(false);
  });

  it('startDateが欠落・不正な場合はnullを返す', () => {
    expect(computeExperimentProgress({ days: 14 })).toBeNull();
    expect(computeExperimentProgress({ startDate: 'not-a-date', days: 14 })).toBeNull();
    expect(computeExperimentProgress({ startDate: '2026-07-15', days: null })).toBeNull();
    expect(computeExperimentProgress({ startDate: '2026-07-15', days: 0 })).toBeNull();
    expect(computeExperimentProgress()).toBeNull();
  });
});
