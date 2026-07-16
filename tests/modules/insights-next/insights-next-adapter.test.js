// tests/modules/insights-next/insights-next-adapter.test.js
// PR-INSIGHTS-RUNTIME-04: recordsはwindow.app.api.getRecords()（ApiGateway
// 経由）から取得する。
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../../../src/services/insight-signals.js', () => ({
  extractSignals: vi.fn(() => []),
  signalFingerprint: vi.fn(() => 'fp'),
}));

import { getHighlightViewModel } from '../../../src/modules/insights-next/insights-next-adapter.js';

describe('getHighlightViewModel (Read-only ViewModel Adapter, PR-INSIGHTS-RUNTIME-03/04)', () => {
  afterEach(() => {
    delete window.ippoInsightEngine;
    delete window.app;
  });

  it('window.app.apiが無い場合、recordsは空扱いで低データ用の定型文を返す', async () => {
    const vm = await getHighlightViewModel();
    expect(vm.text).toBe('記録が増えると、ここに気づきが届きます');
    expect(vm.confidenceLabel).toBeNull();
    expect(vm.confidenceDots).toBe(0);
  });

  it('window.app.api.getRecords()から取得したrecordsを使う', async () => {
    const getRecords = vi.fn(async () => [1, 2, 3, 4, 5, 6]);
    window.app = { api: { getRecords } };

    const vm = await getHighlightViewModel();

    expect(getRecords).toHaveBeenCalledOnce();
    expect(vm.text).toBe('気になる動きはありません'); // 6件・engine insight無しのfallback
  });

  it('getRecords()が失敗してもrecordsは空扱いで安全にfallbackする', async () => {
    window.app = { api: { getRecords: vi.fn(async () => { throw new Error('forbidden'); }) } };
    const vm = await getHighlightViewModel();
    expect(vm.text).toBe('記録が増えると、ここに気づきが届きます');
  });

  it('window.ippoInsightEngine由来のinsightがあればconfidenceLabelに応じたドット数を返す', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [1, 2, 3, 4, 5]) } };
    window.ippoInsightEngine = {
      getInsights: () => [
        { main: '最近よく眠れています', sub: '調子が良さそうです', sampleSize: 20, confidenceLabel: 'high' },
      ],
    };
    const vm = await getHighlightViewModel();
    expect(vm.text).toBe('最近よく眠れています');
    expect(vm.confidenceLabel).toBe('high');
    expect(vm.confidenceDots).toBe(4);
  });

  it('BD-038違反のinsightはブロックされ低データ/動きなしのfallbackになる', async () => {
    window.app = { api: { getRecords: vi.fn(async () => [1, 2, 3, 4, 5, 6]) } };
    window.ippoInsightEngine = {
      getInsights: () => [{ main: '今すぐ病院へ行ってください', sub: 'x' }],
    };
    const vm = await getHighlightViewModel();
    expect(vm.text).toBe('気になる動きはありません');
  });
});
