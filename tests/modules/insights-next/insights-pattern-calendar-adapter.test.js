// tests/modules/insights-next/insights-pattern-calendar-adapter.test.js
// Founder Decision(2026-07-18, LEGACY_SUNSET_COUNCIL.md②): Pattern Calendar
// をβ後からRuntime正式実装へ格上げ。records実データからの分類ロジックを検証。
import { describe, it, expect, afterEach, vi } from 'vitest';
import { getPatternCalendarViewModel } from '../../../src/modules/insights-next/insights-pattern-calendar-adapter.js';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

describe('getPatternCalendarViewModel (PR-FULL-INTEGRATION-03)', () => {
  afterEach(() => {
    delete window.app;
  });

  it('window.app.apiが無い場合、28件すべて空セルを返す（例外にしない）', async () => {
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells).toHaveLength(28);
    expect(vm.cells.every((c) => c === '')).toBe(true);
  });

  it('getRecords()が失敗しても安全に全セル空扱いでfallbackする', async () => {
    window.app = { api: { getRecords: vi.fn(async () => { throw new Error('boom'); }) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells).toHaveLength(28);
    expect(vm.cells.every((c) => c === '')).toBe(true);
  });

  it('menstrualFlowがある日はplumに分類される', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(0), menstrualFlow: 'medium', painLevel: 1 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[27]).toBe('plum'); // 直近日は配列末尾
  });

  it('painLevelが閾値(5)以上の日はroseに分類される', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(0), painLevel: 7 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[27]).toBe('rose');
  });

  it('painLevelが閾値未満で記録がある日はsageに分類される', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(0), painLevel: 2 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[27]).toBe('sage');
  });

  it('menstrualFlowが優先され、painLevelが高くてもplumになる', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(0), menstrualFlow: 'heavy', painLevel: 9 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[27]).toBe('plum');
  });

  it('記録が無い日は空文字（データなし）のまま', async () => {
    window.app = { api: { getRecords: vi.fn(async () => []) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[27]).toBe('');
  });

  it('dateフィールド（record_dateが無い場合のfallback）でも日付を照合できる', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { date: isoDaysAgo(3) + 'T09:00:00.000Z', painLevel: 8 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells[24]).toBe('rose'); // 3日前 = 末尾から4番目 (27-3)
  });

  it('直近28日より古い記録は結果に反映されない', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(40), painLevel: 9 },
    ]) } };
    const vm = await getPatternCalendarViewModel();
    expect(vm.cells.every((c) => c === '')).toBe(true);
  });
});
