// tests/modules/premium-service.test.js
// ─────────────────────────────────────────────────────────────
// premium-service.js unit tests — mock Supabase client
// subscriptions テーブル参照・maybeSingle() に対応
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const _mockSession = { user: { id: 'user-123' } };
const _mockFrom    = vi.fn();

// Realtime channel mock (channel → on → subscribe の chain)
const _mockChannel = {
  on:        vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock('../../src/services/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from:          _mockFrom,
    channel:       vi.fn().mockReturnValue(_mockChannel),
    removeChannel: vi.fn(),
  },
  SUPABASE_URL: 'https://mock.supabase.co',
}));

// Helper: supabase.from('subscriptions').select(...).eq(...).maybeSingle()
function mockSubscriptionsChain(data, error = null) {
  const chainObj = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  };
  _mockFrom.mockReturnValue(chainObj);
  return chainObj;
}

let supabaseMock;
let isPremium, getTierLevel, refreshPremiumStatus, startPremiumSync, stopPremiumSync;

beforeEach(async () => {
  vi.resetModules();

  window.ippoMarkBootEvent  = undefined;
  window.ippoPremiumService = undefined;
  window._ippoStateHooks    = [];

  const supabaseMod = await import('../../src/services/supabase.js');
  supabaseMock = supabaseMod.supabase;

  supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
  _mockFrom.mockReset();
  supabaseMock.channel.mockReturnValue(_mockChannel);

  const mod = await import('../../src/modules/premium/premium-service.js');
  isPremium            = mod.isPremium;
  getTierLevel         = mod.getTierLevel;
  refreshPremiumStatus = mod.refreshPremiumStatus;
  startPremiumSync     = mod.startPremiumSync;
  stopPremiumSync      = mod.stopPremiumSync;
});

afterEach(() => {
  stopPremiumSync?.();
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ── isPremium default ─────────────────────────────────────────
describe('isPremium default', () => {
  it('returns false before any sync', () => {
    expect(isPremium()).toBe(false);
  });
});

// ── refreshPremiumStatus – no session ────────────────────────
describe('refreshPremiumStatus (no session)', () => {
  it('leaves isPremium false when user is not logged in', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });
    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });
});

// ── refreshPremiumStatus – premium active ─────────────────────
describe('refreshPremiumStatus (premium active)', () => {
  it('sets isPremium true when subscriptions returns status=active and no expiry', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain({ status: 'active', current_period_end: null });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(true);
  });
});

// ── refreshPremiumStatus – premium expired ─────────────────────
describe('refreshPremiumStatus (premium expired)', () => {
  it('sets isPremium false when current_period_end is in the past', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockSubscriptionsChain({ status: 'active', current_period_end: pastDate });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });

  it('sets isPremium true when current_period_end is in the future', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    mockSubscriptionsChain({ status: 'active', current_period_end: futureDate });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(true);
  });

  it('sets isPremium false when status is canceled', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain({ status: 'canceled', current_period_end: null });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });
});

// ── refreshPremiumStatus – no subscription row ────────────────
describe('refreshPremiumStatus (no subscription)', () => {
  it('sets isPremium false when subscriptions returns null (no row)', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain(null);

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });
});

// ── refreshPremiumStatus – DB error ───────────────────────────
describe('refreshPremiumStatus (DB error)', () => {
  it('keeps isPremium false when subscriptions fetch returns an error', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain(null, { message: 'DB error' });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });
});

// ── startPremiumSync / stopPremiumSync ────────────────────────
describe('startPremiumSync / stopPremiumSync', () => {
  it('is idempotent: calling startPremiumSync twice does not throw', () => {
    expect(() => {
      startPremiumSync();
      startPremiumSync();
    }).not.toThrow();
  });

  it('stopPremiumSync clears interval without throwing', () => {
    startPremiumSync();
    expect(() => stopPremiumSync()).not.toThrow();
  });
});

// ── getTierLevel (PR-P2-05, FREEZE-FD-1) ──────────────────────
describe('getTierLevel', () => {
  it('returns "free" before any sync', () => {
    expect(getTierLevel()).toBe('free');
  });

  it('returns "pro" when subscriptions returns status=active (single-tier billing today)', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain({ status: 'active', current_period_end: null });

    await refreshPremiumStatus();
    expect(getTierLevel()).toBe('pro');
    expect(isPremium()).toBe(true);
  });

  it('returns "free" when subscription is expired, matching isPremium()', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    mockSubscriptionsChain({ status: 'active', current_period_end: pastDate });

    await refreshPremiumStatus();
    expect(getTierLevel()).toBe('free');
    expect(isPremium()).toBe(false);
  });

  it('stays equivalent to isPremium() across state transitions', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain({ status: 'canceled', current_period_end: null });
    await refreshPremiumStatus();
    expect(getTierLevel() !== 'free').toBe(isPremium());

    mockSubscriptionsChain({ status: 'active', current_period_end: null });
    await refreshPremiumStatus();
    expect(getTierLevel() !== 'free').toBe(isPremium());
  });
});

// ── auth-ready event integration ──────────────────────────────
describe('ippo:auth-ready event', () => {
  it('fetches premium status when auth-ready fires', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockSubscriptionsChain({ status: 'active', current_period_end: null });

    startPremiumSync();
    window.dispatchEvent(new Event('ippo:auth-ready'));

    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(isPremium()).toBe(true);
  });
});
