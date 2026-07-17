// tests/modules/billing-next/billing-next-adapter.test.js
// PR-BILLING-RUNTIME-03/04: 既存Application Facade（premium-service.js）
// 経由のRead-only Adapter。架空のSubscription状態を本番データとして
// 作らないことを重点的に検証する。
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTierLevel        = vi.fn();
const mockRefreshPremiumStatus = vi.fn();

vi.mock('../../../src/modules/premium/premium-service.js', () => ({
  getTierLevel: (...args) => mockGetTierLevel(...args),
  refreshPremiumStatus: (...args) => mockRefreshPremiumStatus(...args),
}));

import { getSubscriptionViewModel } from '../../../src/modules/billing-next/billing-next-adapter.js';

describe('getSubscriptionViewModel', () => {
  beforeEach(() => {
    mockGetTierLevel.mockReset();
    mockRefreshPremiumStatus.mockReset();
    mockRefreshPremiumStatus.mockResolvedValue(undefined);
  });

  it('getTierLevel()が"free"を返す場合、state:freeを返す', async () => {
    mockGetTierLevel.mockReturnValue('free');
    const vm = await getSubscriptionViewModel();
    expect(vm).toEqual({ state: 'free', label: 'Free' });
  });

  it('getTierLevel()が"pro"を返す場合、state:proを返す', async () => {
    mockGetTierLevel.mockReturnValue('pro');
    const vm = await getSubscriptionViewModel();
    expect(vm).toEqual({ state: 'pro', label: 'Pro' });
  });

  it('refreshPremiumStatus()を呼んでから最新のgetTierLevel()を読む', async () => {
    mockGetTierLevel.mockReturnValue('pro');
    await getSubscriptionViewModel();
    expect(mockRefreshPremiumStatus).toHaveBeenCalledOnce();
    expect(mockGetTierLevel).toHaveBeenCalledOnce();
  });

  it('getTierLevel()が想定外の値を返した場合、架空のtierを作らずunknownを返す', async () => {
    mockGetTierLevel.mockReturnValue('enterprise'); // 存在しない値
    const vm = await getSubscriptionViewModel();
    expect(vm.state).toBe('unknown');
  });

  it('refreshPremiumStatus()が例外を投げた場合、state:errorを返す(架空の成功状態にしない)', async () => {
    mockRefreshPremiumStatus.mockRejectedValue(new Error('network down'));
    const vm = await getSubscriptionViewModel();
    expect(vm.state).toBe('error');
  });

  it('getTierLevel()が例外を投げた場合もstate:errorを返す', async () => {
    mockGetTierLevel.mockImplementation(() => { throw new Error('boom'); });
    const vm = await getSubscriptionViewModel();
    expect(vm.state).toBe('error');
  });
});
