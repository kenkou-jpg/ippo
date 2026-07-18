// tests/modules/me-next/me-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../../src/modules/billing-next/billing-next-shell.js', () => ({
  showBillingNext: vi.fn(),
}));

const mockGetSubscriptionViewModel = vi.fn(async () => ({ state: 'free', label: 'Free' }));

vi.mock('../../../src/modules/billing-next/billing-next-adapter.js', () => ({
  getSubscriptionViewModel: (...args) => mockGetSubscriptionViewModel(...args),
}));

function buildScreenFixture() {
  document.body.innerHTML = `
    <div id="screen-me-next" class="screen">
      <div id="men-avatar-initial"></div>
      <div id="men-profile-name" hidden></div>
      <button id="men-profile-plan" hidden></button>
      <button id="men-consent-row" type="button">
        <span id="men-consent-sub"></span>
      </button>
    </div>`;
}

describe('me-next-shell (PR-ME-RUNTIME-02/03/04)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetSubscriptionViewModel.mockReset().mockResolvedValue({ state: 'free', label: 'Free' });
    localStorage.removeItem('ippo_me_ui_v2');
    localStorage.removeItem('ippo_consent');
    localStorage.removeItem('ippo_consent_events');
    delete window.ippoMeNext;
    delete window.showConfirmModal;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_me_ui_v2');
    localStorage.removeItem('ippo_consent');
    localStorage.removeItem('ippo_consent_events');
    delete window.ippoMeNext;
    delete window.showConfirmModal;
  });

  it('Feature Flag OFF（デフォルト）でもモジュール読み込み自体は既存挙動へ影響しない', async () => {
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    expect(mod.isMeNextEnabled()).toBe(false);
    expect(window.ippoMeNext).toBeDefined();
  }, 15000);

  it('Feature Flag ONにするとisMeNextEnabled()がtrueを返す', async () => {
    localStorage.setItem('ippo_me_ui_v2', '1');
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    expect(mod.isMeNextEnabled()).toBe(true);
  }, 15000);

  it('renderMeNext()はscreen未マウント時も例外を投げない', async () => {
    document.body.innerHTML = '';
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    await expect(mod.renderMeNext()).resolves.not.toThrow();
  });

  it('現在のプランがfreeの場合、「現在のプラン: Free ›」を表示する', async () => {
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    await mod.renderMeNext();

    const planBtn = document.getElementById('men-profile-plan');
    expect(planBtn.hidden).toBe(false);
    expect(planBtn.textContent).toBe('現在のプラン: Free ›');
  });

  it('Subscription不明時は不確かな情報を出さず非表示のままにする', async () => {
    mockGetSubscriptionViewModel.mockResolvedValue({ state: 'unknown', label: '不明' });
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    await mod.renderMeNext();

    expect(document.getElementById('men-profile-plan').hidden).toBe(true);
  });

  it('「現在のプラン」ボタンを押すとbilling-next画面へ遷移する', async () => {
    const { showBillingNext } = await import('../../../src/modules/billing-next/billing-next-shell.js');
    const mod = await import('../../../src/modules/me-next/me-next-shell.js');
    await mod.renderMeNext();

    document.getElementById('men-profile-plan').click();

    expect(showBillingNext).toHaveBeenCalledOnce();
  });

  describe('Founder Decision(2026-07-18): Research Consent UI', () => {
    it('初期状態（未同意）では「同意していません」を表示する', async () => {
      const mod = await import('../../../src/modules/me-next/me-next-shell.js');
      await mod.renderMeNext();

      expect(document.getElementById('men-consent-sub').textContent).toBe('同意していません');
    });

    it('クリック→確認ダイアログでOKを押すと同意状態になり、表示が更新される', async () => {
      const mod = await import('../../../src/modules/me-next/me-next-shell.js');
      await mod.renderMeNext();

      document.getElementById('men-consent-row').click();

      const okBtn = document.getElementById('_confirm_ok');
      expect(okBtn).toBeTruthy();
      okBtn.click();

      expect(document.getElementById('men-consent-sub').textContent).toBe('協力中（いつでも撤回できます）');

      const { isResearchConsentGranted } = await import('../../../src/services/consent-service.js');
      expect(isResearchConsentGranted()).toBe(true);
    });

    it('同意済み状態からクリック→OKで撤回でき、表示が「同意していません」に戻る', async () => {
      const { grantResearchConsent } = await import('../../../src/services/consent-service.js');
      grantResearchConsent();

      const mod = await import('../../../src/modules/me-next/me-next-shell.js');
      await mod.renderMeNext();
      expect(document.getElementById('men-consent-sub').textContent).toBe('協力中（いつでも撤回できます）');

      document.getElementById('men-consent-row').click();
      document.getElementById('_confirm_ok').click();

      expect(document.getElementById('men-consent-sub').textContent).toBe('同意していません');
    });

    it('確認ダイアログでキャンセルすると状態は変わらない', async () => {
      const mod = await import('../../../src/modules/me-next/me-next-shell.js');
      await mod.renderMeNext();

      document.getElementById('men-consent-row').click();
      document.getElementById('_confirm_cancel').click();

      expect(document.getElementById('men-consent-sub').textContent).toBe('同意していません');
    });
  });
});
