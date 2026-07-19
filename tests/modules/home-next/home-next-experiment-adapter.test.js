// tests/modules/home-next/home-next-experiment-adapter.test.js
// PR-HOME-REBUILD-01: Hero Ring / 7日ストリーク / Before→After結果カード /
// Milestone / 次の実験候補のRead-only Adapterを検証する。
import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getHeroExperimentViewModel,
  getStreakViewModel,
  getResultCardViewModel,
  getMilestoneViewModel,
  getNextExperimentViewModel,
} from '../../../src/modules/home-next/home-next-experiment-adapter.js';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('getHeroExperimentViewModel (Hero Ring)', () => {
  afterEach(() => { delete window.getState; });

  it('進行中実験なし: active=falseを返す', async () => {
    window.getState = () => ({ experiments: [] });
    const vm = await getHeroExperimentViewModel();
    expect(vm).toEqual({ active: false });
  });

  it('進行中実験あり: active=trueと進捗を返す（experiment-next-adapter.jsを再利用）', async () => {
    window.getState = () => ({
      experiments: [
        { id: 'e1', title: '16時間断食', hypothesis: '仮説', factor: '', condition: '', days: 14, startDate: isoDaysAgo(0), status: 'active' },
      ],
    });
    const vm = await getHeroExperimentViewModel();
    expect(vm.active).toBe(true);
    expect(vm.title).toBe('16時間断食');
    expect(vm.progress.currentDay).toBe(1);
    expect(vm.progress.totalDays).toBe(14);
  });

  it('不正なstartDate: experiment-progress.jsのnull fallbackにより active=false（既存ロジックの再利用を確認）', async () => {
    window.getState = () => ({
      experiments: [
        { id: 'e1', title: 'X', days: 14, startDate: 'not-a-date', status: 'active' },
      ],
    });
    const vm = await getHeroExperimentViewModel();
    expect(vm).toEqual({ active: false });
  });

  it('進捗100%超（経過日数が期間を超過）はexperiment-progress.js側でtotalDaysにクランプされる', async () => {
    window.getState = () => ({
      experiments: [
        { id: 'e1', title: 'X', days: 7, startDate: isoDaysAgo(30), status: 'active' },
      ],
    });
    const vm = await getHeroExperimentViewModel();
    expect(vm.progress.currentDay).toBe(7);
    expect(vm.progress.progressPercent).toBe(100);
  });
});

describe('getStreakViewModel (7日ストリーク)', () => {
  afterEach(() => { delete window.app; });

  it('7日すべて記録ありの場合、全日hasRecord=true', async () => {
    const records = Array.from({ length: 7 }, (_, i) => ({ record_date: isoDaysAgo(i) }));
    window.app = { api: { getRecords: vi.fn(async () => records) } };

    const vm = await getStreakViewModel();
    expect(vm.days).toHaveLength(7);
    expect(vm.days.every((d) => d.hasRecord)).toBe(true);
  });

  it('一部欠損がある場合、その日だけhasRecord=false', async () => {
    // 今日と3日前のみ記録
    window.app = { api: { getRecords: vi.fn(async () => [
      { record_date: isoDaysAgo(0) },
      { record_date: isoDaysAgo(3) },
    ]) } };

    const vm = await getStreakViewModel();
    const trueCount = vm.days.filter((d) => d.hasRecord).length;
    expect(trueCount).toBe(2);
    expect(vm.days[6].hasRecord).toBe(true); // 今日（配列末尾）
  });

  it('記録が無い場合、欠損日を成功扱いしない（全日false）', async () => {
    window.app = { api: { getRecords: vi.fn(async () => []) } };
    const vm = await getStreakViewModel();
    expect(vm.days.every((d) => !d.hasRecord)).toBe(true);
  });

  it('今日の日付が正しくisToday=trueとして判別できる（日付境界）', async () => {
    window.app = { api: { getRecords: vi.fn(async () => []) } };
    const vm = await getStreakViewModel();
    const todayEntries = vm.days.filter((d) => d.isToday);
    expect(todayEntries).toHaveLength(1);
    expect(vm.days[vm.days.length - 1].isToday).toBe(true); // 配列末尾が今日
  });

  it('window.app.apiが無い場合でも例外を投げず空扱いで返す', async () => {
    delete window.app;
    const vm = await getStreakViewModel();
    expect(vm.days).toHaveLength(7);
    expect(vm.days.every((d) => !d.hasRecord)).toBe(true);
  });
});

describe('getResultCardViewModel (Before→After結果カード)', () => {
  afterEach(() => { delete window.app; });

  it('window.app.apiが無い場合はnull', async () => {
    delete window.app;
    expect(await getResultCardViewModel()).toBeNull();
  });

  it('完了実験が無い場合はnull', async () => {
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => []),
      getRecords: vi.fn(async () => []),
    } };
    expect(await getResultCardViewModel()).toBeNull();
  });

  it('Before/After双方に十分なデータがある場合、平均値と変化率を返す（減少=改善方向、断定文言は含まない）', async () => {
    const startDate = isoDaysAgo(14);
    const endDate = isoDaysAgo(0);
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => [
        { id: 'e1', title: '乳製品断ち', startDate, actualEndDate: endDate, status: 'COMPLETED' },
      ]),
      getRecords: vi.fn(async () => [
        // Before期間（開始日より前）: painLevel高め
        { record_date: isoDaysAgo(20), painLevel: 8 },
        { record_date: isoDaysAgo(18), painLevel: 6 },
        // After期間（開始日〜終了日）: painLevel低め
        { record_date: isoDaysAgo(10), painLevel: 2 },
        { record_date: isoDaysAgo(2), painLevel: 2 },
      ]),
    } };

    const vm = await getResultCardViewModel();
    expect(vm).not.toBeNull();
    expect(vm.experimentTitle).toBe('乳製品断ち');
    expect(vm.beforeValue).toBe(7);
    expect(vm.afterValue).toBe(2);
    expect(vm.deltaPercent).toBeLessThan(0); // 減少
    // 医療的断定文言（「治った」「効果があった」等）を一切生成しないことを
    // 型レベルで保証: 返るのは数値とタイトル・日付のみで、文言はshell側の
    // 固定テンプレートが担当する
    expect(Object.keys(vm).sort()).toEqual(
      ['actualEndDate', 'afterValue', 'beforeValue', 'deltaPercent', 'experimentTitle', 'observationDays'].sort()
    );
  });

  it('データ不足（Before/Afterいずれかが1件以下）の場合はnull（無理に表示しない）', async () => {
    const startDate = isoDaysAgo(14);
    const endDate = isoDaysAgo(0);
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => [
        { id: 'e1', title: 'X', startDate, actualEndDate: endDate, status: 'COMPLETED' },
      ]),
      getRecords: vi.fn(async () => [
        { record_date: isoDaysAgo(20), painLevel: 8 }, // Before1件のみ
        { record_date: isoDaysAgo(10), painLevel: 2 },
        { record_date: isoDaysAgo(2),  painLevel: 2 },
      ]),
    } };
    expect(await getResultCardViewModel()).toBeNull();
  });

  it('変化なし（Before=After）の場合、deltaPercent=0', async () => {
    const startDate = isoDaysAgo(14);
    const endDate = isoDaysAgo(0);
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => [
        { id: 'e1', title: 'X', startDate, actualEndDate: endDate, status: 'COMPLETED' },
      ]),
      getRecords: vi.fn(async () => [
        { record_date: isoDaysAgo(20), painLevel: 5 },
        { record_date: isoDaysAgo(18), painLevel: 5 },
        { record_date: isoDaysAgo(10), painLevel: 5 },
        { record_date: isoDaysAgo(2),  painLevel: 5 },
      ]),
    } };
    const vm = await getResultCardViewModel();
    expect(vm.deltaPercent).toBe(0);
  });

  it('増加方向（After > Before）の場合、deltaPercentは正の値', async () => {
    const startDate = isoDaysAgo(14);
    const endDate = isoDaysAgo(0);
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => [
        { id: 'e1', title: 'X', startDate, actualEndDate: endDate, status: 'COMPLETED' },
      ]),
      getRecords: vi.fn(async () => [
        { record_date: isoDaysAgo(20), painLevel: 2 },
        { record_date: isoDaysAgo(18), painLevel: 2 },
        { record_date: isoDaysAgo(10), painLevel: 8 },
        { record_date: isoDaysAgo(2),  painLevel: 8 },
      ]),
    } };
    const vm = await getResultCardViewModel();
    expect(vm.deltaPercent).toBeGreaterThan(0);
  });

  it('getCompletedExperimentsが失敗しても例外を投げずnullを返す', async () => {
    window.app = { api: {
      getCompletedExperiments: vi.fn(async () => { throw new Error('forbidden'); }),
      getRecords: vi.fn(async () => []),
    } };
    expect(await getResultCardViewModel()).toBeNull();
  });
});

describe('getMilestoneViewModel (Milestone、結果カードのロジックを再利用)', () => {
  it('resultViewModelがnullの場合はnull', () => {
    expect(getMilestoneViewModel(null)).toBeNull();
  });

  it('完了直後（Window内）はMilestoneを返す', () => {
    const vm = getMilestoneViewModel({
      experimentTitle: '乳製品断ち',
      actualEndDate: isoDaysAgo(1),
      beforeValue: 7, afterValue: 2, deltaPercent: -71, observationDays: 14,
    });
    expect(vm).toEqual({ title: '乳製品断ち' });
  });

  it('完了から時間が経ちすぎている場合はnull（常時表示しない）', () => {
    const vm = getMilestoneViewModel({
      experimentTitle: '乳製品断ち',
      actualEndDate: isoDaysAgo(30),
      beforeValue: 7, afterValue: 2, deltaPercent: -71, observationDays: 14,
    });
    expect(vm).toBeNull();
  });
});

describe('getNextExperimentViewModel (次の実験候補)', () => {
  afterEach(() => { delete window.app; delete window.getState; });

  it('進行中実験がある間は候補を出さない（複数同時進行防止と同じ方針）', async () => {
    window.getState = () => ({
      experiments: [{ id: 'e1', title: 'X', days: 14, startDate: isoDaysAgo(0), status: 'active' }],
    });
    window.app = { api: { getExperimentNudge: vi.fn(), getExperiments: vi.fn(), getRecords: vi.fn(async () => []) } };
    expect(await getNextExperimentViewModel()).toBeNull();
    expect(window.app.api.getExperimentNudge).not.toHaveBeenCalled();
  });

  it('Nudgeがrecommended=falseの場合はnull', async () => {
    window.getState = () => ({ experiments: [] });
    window.app = { api: {
      getRecords: vi.fn(async () => []),
      getExperiments: vi.fn(async () => []),
      getExperimentNudge: vi.fn(async () => ({ recommended: false, suggestedDurationDays: 7 })),
    } };
    expect(await getNextExperimentViewModel()).toBeNull();
  });

  it('対応プリセットあり（DIET_TRIAL→no-dairy）の場合、preset情報を返す', async () => {
    window.getState = () => ({ experiments: [] });
    window.app = { api: {
      getRecords: vi.fn(async () => []),
      getExperiments: vi.fn(async () => []),
      getExperimentNudge: vi.fn(async () => ({
        recommended: true, experimentType: 'DIET_TRIAL', reason: 'food_pattern_detected', suggestedDurationDays: 7,
      })),
    } };
    const vm = await getNextExperimentViewModel();
    expect(vm).not.toBeNull();
    expect(vm.presetId).toBe('no-dairy');
    expect(vm.title).toBe('乳製品断ち');
    expect(vm.reasonText).toBe('食事の記録に気になる繰り返しがあったので');
  });

  it('未対応タイプ（PAIN_MANAGEMENT等）の場合は無理にマッピングせずnull', async () => {
    window.getState = () => ({ experiments: [] });
    window.app = { api: {
      getRecords: vi.fn(async () => []),
      getExperiments: vi.fn(async () => []),
      getExperimentNudge: vi.fn(async () => ({
        recommended: true, experimentType: 'PAIN_MANAGEMENT', reason: 'pain_elevated', suggestedDurationDays: 7,
      })),
    } };
    expect(await getNextExperimentViewModel()).toBeNull();
  });

  it('window.app.apiが無い場合でも例外を投げずnullを返す', async () => {
    window.getState = () => ({ experiments: [] });
    delete window.app;
    expect(await getNextExperimentViewModel()).toBeNull();
  });
});
