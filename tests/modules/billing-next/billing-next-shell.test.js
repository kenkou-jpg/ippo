// tests/modules/billing-next/billing-next-shell.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockGetTierLevel         = vi.fn(() => 'free');
const mockRefreshPremiumStatus = vi.fn(async () => {});

vi.mock('../../../src/modules/premium/premium-service.js', () => ({
  getTierLevel: (...args) => mockGetTierLevel(...args),
  refreshPremiumStatus: (...args) => mockRefreshPremiumStatus(...args),
}));

function buildScreenFixture() {
  document.body.innerHTML = `
    <div id="screen-billing-next" class="screen">
      <p id="bln-current-plan" hidden></p>
      <button data-bln-open="premium">Premiumを見る</button>
      <button data-bln-open="pro">Proを見る</button>
      <div id="bln-modal-backdrop" hidden>
        <div id="bln-modal-sheet"></div>
      </div>
    </div>`;
}

describe('billing-next-shell (PR-BILLING-RUNTIME-02/03/04)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetTierLevel.mockReset().mockReturnValue('free');
    mockRefreshPremiumStatus.mockReset().mockResolvedValue(undefined);
    localStorage.removeItem('ippo_billing_ui_v2');
    delete window.ippoBillingNext;
    buildScreenFixture();
  });

  afterEach(() => {
    localStorage.removeItem('ippo_billing_ui_v2');
    delete window.ippoBillingNext;
  });

  it('Feature Flag OFF（デフォルト）でもモジュール読み込み自体は既存挙動へ影響しない', async () => {
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    expect(mod.isBillingNextEnabled()).toBe(false);
    expect(window.ippoBillingNext).toBeDefined();
  }, 15000);

  it('Feature Flag ONにするとisBillingNextEnabled()がtrueを返す', async () => {
    localStorage.setItem('ippo_billing_ui_v2', '1');
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    expect(mod.isBillingNextEnabled()).toBe(true);
  }, 15000);

  it('renderBillingNext()はscreen未マウント時も例外を投げない', async () => {
    document.body.innerHTML = '';
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await expect(mod.renderBillingNext()).resolves.not.toThrow();
  });

  it('現在のプランがfreeの場合、「現在のプラン: Free」を表示する', async () => {
    mockGetTierLevel.mockReturnValue('free');
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    const planEl = document.getElementById('bln-current-plan');
    expect(planEl.hidden).toBe(false);
    expect(planEl.textContent).toBe('現在のプラン: Free');
  });

  it('現在のプランがproの場合、「現在のプラン: Pro」を表示する', async () => {
    mockGetTierLevel.mockReturnValue('pro');
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    expect(document.getElementById('bln-current-plan').textContent).toBe('現在のプラン: Pro');
  });

  it('取得失敗時は不確かな情報を出さず非表示のままにする', async () => {
    mockRefreshPremiumStatus.mockRejectedValue(new Error('network down'));
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    expect(document.getElementById('bln-current-plan').hidden).toBe(true);
  });

  it('「Premiumを見る」を押すとモーダルが開き、Premium内容が表示される', async () => {
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    document.querySelector('[data-bln-open="premium"]').click();

    const backdrop = document.getElementById('bln-modal-backdrop');
    expect(backdrop.hidden).toBe(false);
    expect(document.getElementById('bln-modal-sheet').textContent).toContain('Premium');
    expect(document.getElementById('bln-modal-sheet').textContent).toContain('自分の体をもっと深く理解する');
  });

  it('「Proを見る」を押すとPro内容が表示される', async () => {
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    document.querySelector('[data-bln-open="pro"]').click();

    expect(document.getElementById('bln-modal-sheet').textContent).toContain('改善実験を進める');
  });

  it('モーダル内の「あとで」を押すと閉じる', async () => {
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    document.querySelector('[data-bln-open="premium"]').click();
    const closeBtn = document.querySelector('[data-bln-close].bln-modal-later');
    closeBtn.click();

    expect(document.getElementById('bln-modal-backdrop').hidden).toBe(true);
  });

  it('モーダル内のCTAはdisabledでCheckoutへ接続されていない（クリックしても閉じない）', async () => {
    const mod = await import('../../../src/modules/billing-next/billing-next-shell.js');
    await mod.renderBillingNext();

    document.querySelector('[data-bln-open="premium"]').click();
    const cta = document.querySelector('.bln-modal-cta');
    expect(cta.disabled).toBe(true);
    expect(cta.textContent).toContain('準備中');

    // 既存の本番Checkout関数は一切呼ばれていないことを確認
    window.startStripeCheckout = vi.fn();
    cta.click(); // disabled buttonなのでclickイベントは発火しない想定だが、念のため確認
    expect(window.startStripeCheckout).not.toHaveBeenCalled();
    delete window.startStripeCheckout;
  });
});
