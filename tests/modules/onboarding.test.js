// tests/modules/onboarding.test.js
// ─────────────────────────────────────────────────────────────
// Onboarding completion state tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

// Logic mirroring welcome-reset-guard.js / onboarding-runtime.js

function onboardingCompleted(state) {
  return !!(
    state._onboardingDone ||
    state.name ||
    (state.records && state.records.length > 0)
  );
}

function shouldShowWelcome(state) {
  return !onboardingCompleted(state);
}

describe('onboardingCompleted', () => {
  it('returns false for empty initial state', () => {
    expect(onboardingCompleted({ records: [] })).toBe(false);
  });

  it('returns true when _onboardingDone is set', () => {
    expect(onboardingCompleted({ _onboardingDone: true, records: [] })).toBe(true);
  });

  it('returns true when name is set (init() check)', () => {
    expect(onboardingCompleted({ name: 'テスト', records: [] })).toBe(true);
  });

  it('returns true when records exist (data fallback)', () => {
    expect(onboardingCompleted({ records: [{ id: '1' }] })).toBe(true);
  });

  it('returns false when name is empty string', () => {
    expect(onboardingCompleted({ name: '', records: [] })).toBe(false);
  });
});

describe('shouldShowWelcome', () => {
  it('shows welcome for new users', () => {
    expect(shouldShowWelcome({ records: [], name: '' })).toBe(true);
  });

  it('hides welcome for returning users', () => {
    expect(shouldShowWelcome({ name: 'ユーザー', records: [] })).toBe(false);
  });

  it('hides welcome when records exist even without name', () => {
    expect(shouldShowWelcome({ name: '', records: [{ id: '1' }] })).toBe(false);
  });
});

describe('lastPeriodDate does NOT gate onboarding', () => {
  it('lastPeriodDate alone does not complete onboarding', () => {
    const state = { records: [], name: '', lastPeriodDate: '2025-04-01' };
    expect(onboardingCompleted(state)).toBe(false);
  });
});
