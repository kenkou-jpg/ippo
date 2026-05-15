// tests/modules/premium-service.test.js
// ─────────────────────────────────────────────────────────────
// premium-service.js unit tests — mock Supabase client
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Supabase mock ─────────────────────────────────────────────
// premium-service.js imports supabase from services/supabase.js
// We intercept the module so no real network call is made.

const _mockSession = { user: { id: 'user-123' } };
const _mockFrom    = vi.fn();

vi.mock('../../src/services/supabase.js', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: _mockFrom,
  },
  SUPABASE_URL: 'https://mock.supabase.co',
}));

// Helper: set up a chain: supabase.from('profiles').select(...).eq(...).single()
function mockProfilesChain(data, error = null) {
  const chainObj = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  _mockFrom.mockReturnValue(chainObj);
  return chainObj;
}

let supabaseMock;
let isPremium, refreshPremiumStatus, startPremiumSync, stopPremiumSync;

beforeEach(async () => {
  vi.resetModules();

  // Reset window state
  window.ippoMarkBootEvent = undefined;
  window.ippoPremiumService = undefined;
  window._ippoStateHooks = [];

  const supabaseMod = await import('../../src/services/supabase.js');
  supabaseMock = supabaseMod.supabase;

  // Default: no session (guest)
  supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

  _mockFrom.mockReset();

  const mod = await import('../../src/modules/premium/premium-service.js');
  isPremium            = mod.isPremium;
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
  it('sets isPremium true when DB returns is_premium=true and no expiry', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockProfilesChain({ is_premium: true, premium_expires_at: null });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(true);
  });
});

// ── refreshPremiumStatus – premium expired ─────────────────────
describe('refreshPremiumStatus (premium expired)', () => {
  it('sets isPremium false when premium_expires_at is in the past', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    mockProfilesChain({ is_premium: true, premium_expires_at: pastDate });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });

  it('sets isPremium true when premium_expires_at is in the future', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    mockProfilesChain({ is_premium: true, premium_expires_at: futureDate });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(true);
  });
});

// ── refreshPremiumStatus – DB error ───────────────────────────
describe('refreshPremiumStatus (DB error)', () => {
  it('keeps isPremium false when profiles fetch returns an error', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockProfilesChain(null, { message: 'DB error' });

    await refreshPremiumStatus();
    expect(isPremium()).toBe(false);
  });
});

// ── startPremiumSync / stopPremiumSync ────────────────────────
describe('startPremiumSync / stopPremiumSync', () => {
  it('is idempotent: calling startPremiumSync twice does not register twice', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    startPremiumSync();
    startPremiumSync();
    const ippoAuthReadyCalls = addSpy.mock.calls.filter(c => c[0] === 'ippo:auth-ready');
    // only one listener registration
    expect(ippoAuthReadyCalls.length).toBeLessThanOrEqual(1);
    addSpy.mockRestore();
  });

  it('stopPremiumSync clears interval without throwing', () => {
    startPremiumSync();
    expect(() => stopPremiumSync()).not.toThrow();
  });
});

// ── auth-ready event integration ──────────────────────────────
describe('ippo:auth-ready event', () => {
  it('fetches premium status when auth-ready fires', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({ data: { session: _mockSession } });
    mockProfilesChain({ is_premium: true, premium_expires_at: null });

    startPremiumSync();
    window.dispatchEvent(new Event('ippo:auth-ready'));

    // Allow microtasks to settle
    await new Promise(r => setTimeout(r, 0));
    await new Promise(r => setTimeout(r, 0));

    expect(isPremium()).toBe(true);
  });
});
