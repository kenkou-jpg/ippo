// tests/modules/me-next/me-next-adapter.test.js
// PR-ME-RUNTIME-03/04: billing-next-adapter.jsのgetSubscriptionViewModel()を
// 再利用する(二重実装なし)。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetSubscriptionViewModel = vi.fn();

vi.mock('../../../src/modules/billing-next/billing-next-adapter.js', () => ({
  getSubscriptionViewModel: (...args) => mockGetSubscriptionViewModel(...args),
}));

import { getMeProfileViewModel } from '../../../src/modules/me-next/me-next-adapter.js';

describe('getMeProfileViewModel', () => {
  beforeEach(() => {
    mockGetSubscriptionViewModel.mockReset();
  });

  it('state:freeの場合、「現在のプラン: Free」を返す', async () => {
    mockGetSubscriptionViewModel.mockResolvedValue({ state: 'free', label: 'Free' });
    const vm = await getMeProfileViewModel();
    expect(vm).toEqual({ text: '現在のプラン: Free' });
  });

  it('state:proの場合、「現在のプラン: Pro」を返す', async () => {
    mockGetSubscriptionViewModel.mockResolvedValue({ state: 'pro', label: 'Pro' });
    const vm = await getMeProfileViewModel();
    expect(vm).toEqual({ text: '現在のプラン: Pro' });
  });

  it('state:unknownの場合、架空の情報を出さずnullを返す', async () => {
    mockGetSubscriptionViewModel.mockResolvedValue({ state: 'unknown', label: '不明' });
    const vm = await getMeProfileViewModel();
    expect(vm).toBeNull();
  });

  it('state:errorの場合もnullを返す', async () => {
    mockGetSubscriptionViewModel.mockResolvedValue({ state: 'error', label: '取得できませんでした' });
    const vm = await getMeProfileViewModel();
    expect(vm).toBeNull();
  });
});
