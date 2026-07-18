// tests/modules/premium-lock.test.js
// PR-081 (Legacy Removal Batch-3): src/modules/premium/premium-lock.js の
// 物理移動後の挙動検証（premiumGate/closePremiumLock/renderProHero/
// updatePremiumBadges/submitPremiumWaitlist）。
// app-legacy.js 側は window.isAdminOrPremium / window.state / window.openTempReport 等の
// bare依存をそのまま window.* ブリッジ経由で呼ぶため、本テストでは window.* をモックする。

import { describe, it, expect, beforeEach, vi } from 'vitest';

// PR-RUNTIME-INTEGRATION-01: premiumGate()のFeature Flag分岐を単体で検証
// するため、billing-next-shell.js は分離してモックする。
const mockIsBillingNextEnabled = vi.fn(() => false);
const mockShowBillingNext = vi.fn(async () => {});
vi.mock('../../src/modules/billing-next/billing-next-shell.js', () => ({
  isBillingNextEnabled: (...a) => mockIsBillingNextEnabled(...a),
  showBillingNext: (...a) => mockShowBillingNext(...a),
}));

import {
  premiumGate,
  closePremiumLock,
  renderProHero,
  updatePremiumBadges,
  submitPremiumWaitlist,
} from '../../src/modules/premium/premium-lock.js';

function setDom(html) {
  document.body.innerHTML = html;
}

beforeEach(() => {
  document.body.innerHTML = '';
  mockIsBillingNextEnabled.mockReset().mockReturnValue(false);
  mockShowBillingNext.mockReset().mockResolvedValue(undefined);
  window.isAdminOrPremium = vi.fn(() => false);
  window.state = { records: [] };
  window.showAlertModal = vi.fn();
  window.supabase = undefined;
  window.__ippoStateReady = true;
  window.__ippoLegacyUpdateSettingsHero = vi.fn();
  window.openTempReport = function openTempReport() {};
  window.openCorrelationReport = function openCorrelationReport() {};
  window.openFlareupReport = function openFlareupReport() {};
  window.openCyclePhaseReport = function openCyclePhaseReport() {};
  window.openExperiments = function openExperiments() {};
  window.calcTemperaturePhases = vi.fn(() => ({ status: 'ready', alerts: [] }));
  window.detectFlareups = vi.fn(() => []);
});

describe('module exports', () => {
  it('exports the 5 Batch-3 functions', () => {
    expect(typeof premiumGate).toBe('function');
    expect(typeof closePremiumLock).toBe('function');
    expect(typeof renderProHero).toBe('function');
    expect(typeof updatePremiumBadges).toBe('function');
    expect(typeof submitPremiumWaitlist).toBe('function');
  });
});

describe('closePremiumLock', () => {
  it('removes the active class from #premiumLockOverlay', () => {
    setDom('<div id="premiumLockOverlay" class="active"></div>');
    closePremiumLock();
    expect(document.getElementById('premiumLockOverlay').classList.contains('active')).toBe(false);
  });
});

describe('premiumGate', () => {
  it('calls callback immediately when isAdminOrPremium() is true', () => {
    window.isAdminOrPremium = vi.fn(() => true);
    const cb = vi.fn();
    premiumGate(cb);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('opens the lock overlay when not admin/premium', () => {
    setDom('<div id="premiumLockOverlay"></div>');
    const cb = vi.fn();
    premiumGate(cb);
    expect(cb).not.toHaveBeenCalled();
    expect(document.getElementById('premiumLockOverlay').classList.contains('active')).toBe(true);
  });

  it('hides the dynamic message when callback matches no known report', () => {
    setDom('<div id="premiumLockOverlay"></div><div id="premium-dynamic-msg"></div>');
    premiumGate(function unknownCallback() {});
    expect(document.getElementById('premium-dynamic-msg').style.display).toBe('none');
  });

  it('shows a temperature-specific message when callback === window.openTempReport and tempCount >= 14', () => {
    setDom('<div id="premiumLockOverlay"></div><div id="premium-dynamic-msg"></div>');
    window.state.records = Array.from({ length: 14 }, () => ({ temperature: 36.5 }));
    window.calcTemperaturePhases = vi.fn(() => ({ status: 'ready', alerts: [] }));

    premiumGate(window.openTempReport);

    const dynamicMsg = document.getElementById('premium-dynamic-msg');
    expect(dynamicMsg.style.display).toBe('block');
    expect(dynamicMsg.innerHTML).toContain('体温データ');
  });

  it('shows the correlation message when callback === window.openCorrelationReport', () => {
    setDom('<div id="premiumLockOverlay"></div><div id="premium-dynamic-msg"></div>');
    premiumGate(window.openCorrelationReport);
    expect(document.getElementById('premium-dynamic-msg').innerHTML).toContain('相関');
  });

  it('shows the flareup message via window.detectFlareups when callback === window.openFlareupReport', () => {
    setDom('<div id="premiumLockOverlay"></div><div id="premium-dynamic-msg"></div>');
    window.detectFlareups = vi.fn(() => [{}, {}]);
    premiumGate(window.openFlareupReport);
    expect(window.detectFlareups).toHaveBeenCalledWith(window.state.records);
    expect(document.getElementById('premium-dynamic-msg').innerHTML).toContain('フレアアップ');
  });

  describe('PR-RUNTIME-INTEGRATION-01: billing-next Feature Flag分岐', () => {
    it('Feature Flag OFF（既定）では従来通りロックオーバーレイが開く（showBillingNextは呼ばれない）', () => {
      setDom('<div id="premiumLockOverlay"></div>');
      const cb = vi.fn();
      premiumGate(cb);
      expect(mockShowBillingNext).not.toHaveBeenCalled();
      expect(document.getElementById('premiumLockOverlay').classList.contains('active')).toBe(true);
    });

    it('Feature Flag ON かつ非premiumの場合、ロックオーバーレイの代わりにshowBillingNext()が呼ばれる', () => {
      setDom('<div id="premiumLockOverlay"></div>');
      mockIsBillingNextEnabled.mockReturnValue(true);
      const cb = vi.fn();
      premiumGate(cb);
      expect(mockShowBillingNext).toHaveBeenCalledOnce();
      expect(cb).not.toHaveBeenCalled();
      expect(document.getElementById('premiumLockOverlay').classList.contains('active')).toBe(false);
    });

    it('Feature Flag ON でも isAdminOrPremium()がtrueならcallbackが呼ばれ、showBillingNextは呼ばれない', () => {
      mockIsBillingNextEnabled.mockReturnValue(true);
      window.isAdminOrPremium = vi.fn(() => true);
      const cb = vi.fn();
      premiumGate(cb);
      expect(cb).toHaveBeenCalledOnce();
      expect(mockShowBillingNext).not.toHaveBeenCalled();
    });
  });
});

describe('renderProHero', () => {
  it('does nothing when #pro-hero is absent', () => {
    setDom('');
    expect(() => renderProHero()).not.toThrow();
  });

  it('renders the premium-member hero when isAdminOrPremium() is true', () => {
    setDom('<div id="pro-hero"></div>');
    window.isAdminOrPremium = vi.fn(() => true);
    renderProHero();
    expect(document.getElementById('pro-hero').innerHTML).toContain('プレミアム会員中');
  });

  it('renders the upsell hero when isAdminOrPremium() is false', () => {
    setDom('<div id="pro-hero"></div>');
    renderProHero();
    expect(document.getElementById('pro-hero').innerHTML).toContain('¥580');
  });
});

describe('updatePremiumBadges', () => {
  it('defers via window.enqueueDeferredRender when state is not ready', () => {
    window.__ippoStateReady = false;
    window.enqueueDeferredRender = vi.fn();
    updatePremiumBadges();
    expect(window.enqueueDeferredRender).toHaveBeenCalledWith('updatePremiumBadges', updatePremiumBadges);
  });

  it('toggles .pf-lock-badge visibility based on unlocked state', () => {
    setDom('<div id="pro-hero"></div><span class="pf-lock-badge"></span>');
    window.isAdminOrPremium = vi.fn(() => true);
    updatePremiumBadges();
    expect(document.querySelector('.pf-lock-badge').style.display).toBe('none');
  });

  it('calls window.__ippoLegacyUpdateSettingsHero (not the settings-display-runtime.js window.updateSettingsHero)', () => {
    setDom('<div id="pro-hero"></div>');
    updatePremiumBadges();
    expect(window.__ippoLegacyUpdateSettingsHero).toHaveBeenCalledOnce();
  });

  it('does not throw when the insights screen is inactive', () => {
    setDom('<div id="pro-hero"></div><div id="screen-insights"></div>');
    expect(() => updatePremiumBadges()).not.toThrow();
  });
});

describe('submitPremiumWaitlist', () => {
  it('shows an alert and does not call supabase when the email is invalid', () => {
    setDom('<input id="premium-email" value="not-an-email" />');
    submitPremiumWaitlist();
    expect(window.showAlertModal).toHaveBeenCalledWith('メールアドレスを入力してください');
  });

  it('shows a connection-error alert when window.supabase is unavailable', () => {
    setDom('<input id="premium-email" value="user@example.com" />');
    window.supabase = undefined;
    submitPremiumWaitlist();
    expect(window.showAlertModal).toHaveBeenCalledWith('通信エラーが発生しました');
  });

  it('reveals the done panel and persists localStorage on a successful insert', async () => {
    setDom(`
      <input id="premium-email" value="user@example.com" />
      <div id="premium-form-area" style="display:block;"></div>
      <div id="premium-done" style="display:none;"></div>
    `);
    const insert = vi.fn().mockResolvedValue({ error: null });
    window.supabase = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      from: vi.fn(() => ({ insert })),
    };

    submitPremiumWaitlist();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(document.getElementById('premium-form-area').style.display).toBe('none');
    expect(document.getElementById('premium-done').style.display).toBe('block');
    expect(localStorage.getItem('ippo_premium_registered')).toBe('user@example.com');
  });

  it('shows a duplicate-registration alert on Postgres unique-violation error code 23505', async () => {
    setDom('<input id="premium-email" value="user@example.com" />');
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505' } });
    window.supabase = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
      from: vi.fn(() => ({ insert })),
    };

    submitPremiumWaitlist();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(window.showAlertModal).toHaveBeenCalledWith('このメールアドレスは既に登録済みです');
  });
});
