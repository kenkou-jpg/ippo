// tests/modules/onboarding-runtime.test.js
// ─────────────────────────────────────────────────────────────
// finishOnboarding() 回帰テスト（2026-07-12 HANDOFF記載バグの修正確認）
//
// 検証対象: src/modules/onboarding-runtime.js の finishOnboarding()
// 背景: finishOnboarding() が showScreen('home') を直接呼んでいたため、
// home-next 有効時（デフォルト）でも home-next-shell.js が上書きした
// window.showMain（= showHomeNext）を経由せず旧 screen-home が表示される
// バグがあった。修正後は window.showMain() 経由に統一する。
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

let _shouldShowMain = true;

vi.mock('../../src/modules/welcome-runtime.js', () => ({
  shouldShowMain: () => _shouldShowMain,
}));

vi.mock('../../src/store/state.js', () => {
  let _state = {};
  return {
    getState:  vi.fn(() => _state),
    setState:  vi.fn((s) => { _state = s; }),
    saveState: vi.fn(),
    __setMockState: (s) => { _state = s; },
  };
});

import { completeOnboarding, finishOnboarding } from '../../src/modules/onboarding-runtime.js';

describe('finishOnboarding', () => {
  beforeEach(() => {
    _shouldShowMain = true;
    window.showMain          = vi.fn();
    window.updateHistory     = vi.fn();
    window.buildCalendar     = vi.fn();
    window.updateStats       = vi.fn();
    window.reorderRecordSections = vi.fn();
    // finishOnboarding が直接呼ばなくなったことを確認するための旧関数群
    window.buildHomeWeekRow      = vi.fn();
    window.updateHomeInsightCard = vi.fn();
  });

  it('delegates home display to window.showMain() (home-next routing safe)', () => {
    finishOnboarding();
    expect(window.showMain).toHaveBeenCalledTimes(1);
  });

  it('does not call legacy home-only render functions directly', () => {
    finishOnboarding();
    expect(window.buildHomeWeekRow).not.toHaveBeenCalled();
    expect(window.updateHomeInsightCard).not.toHaveBeenCalled();
  });

  it('still calls the independent, non-home render functions', () => {
    finishOnboarding();
    expect(window.updateHistory).toHaveBeenCalledTimes(1);
    expect(window.buildCalendar).toHaveBeenCalledTimes(1);
    expect(window.updateStats).toHaveBeenCalledTimes(1);
    expect(window.reorderRecordSections).toHaveBeenCalledTimes(1);
  });

  it('does nothing when shouldShowMain() is false', () => {
    _shouldShowMain = false;
    finishOnboarding();
    expect(window.showMain).not.toHaveBeenCalled();
  });

  it('completeOnboarding() marks state done and delegates to finishOnboarding()', async () => {
    const { setState, getState } = await import('../../src/store/state.js');
    completeOnboarding();
    expect(setState).toHaveBeenCalledWith(expect.objectContaining({ _onboardingDone: true }));
    expect(getState()._onboardingDone).toBe(true);
    expect(window.showMain).toHaveBeenCalledTimes(1);
  });
});
