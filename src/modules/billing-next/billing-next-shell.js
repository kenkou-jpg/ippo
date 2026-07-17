// ============================================================
//  ippo – billing-next-shell.js
//  PR-BILLING-RUNTIME-02: Prototype Premium/Pro画面の表示専用シェル統合。
//
//  Feature flag: localStorage['ippo_billing_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js / experiment-next-shell.js / insights-next-shell.jsと
//  同一パターン）。
//
//  PR-BILLING-RUNTIME-03/04で「現在のプラン」表示を既存Application Facade
//  （premium-service.js）経由のRead-only Adapterで接続した。
//
//  このPRの時点でも変わらないこと:
//    - Checkout未接続（startStripeCheckout()等の既存課金フローは無変更）
//    - Stripe/Supabase書込みなし（Adapterは読み取り専用）
//    - モーダル内のPremium/Pro CTA（"◯◯にする"相当）は表示のみ・disabled。
//      「あとで」（閉じる）だけが動作する
// ============================================================

import './billing-next.css';

import { showScreen }               from '../screen-router.js';
import { getSubscriptionViewModel } from './billing-next-adapter.js';

const FLAG_KEY = 'ippo_billing_ui_v2';

export function isBillingNextEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function enableBillingNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }   catch (_) { /* noop */ } }
export function disableBillingNext() { try { localStorage.removeItem(FLAG_KEY); }     catch (_) { /* noop */ } }

// ── Premium/Pro詳細モーダル（Prototype prototype/app.js openModal()と同一コピー）──

const _MODAL_CONTENT = {
  premium: `
    <button class="bln-modal-close" type="button" data-bln-close>×</button>
    <div class="bln-kicker"><span class="bln-badge badge-rose">🔬</span><span class="bln-kicker-label">PLAN</span></div>
    <div class="bln-plan-heading" style="color:var(--plum)">Premium</div>
    <p class="bln-plan-tagline">自分の体をもっと深く理解する</p>
    <ul class="bln-plan-list">
      <li>Insights全履歴の閲覧</li>
      <li>周期×体調の長期トレンド</li>
      <li>パターンカレンダー全期間表示</li>
    </ul>
    <button class="bln-modal-cta" type="button" disabled>Premiumにする（準備中）</button>
    <button class="bln-modal-later" type="button" data-bln-close>あとで</button>
  `,
  pro: `
    <button class="bln-modal-close" type="button" data-bln-close>×</button>
    <div class="bln-kicker"><span class="bln-badge badge-gold">🔭</span><span class="bln-kicker-label">PLAN</span></div>
    <div class="bln-plan-heading" style="color:#a8781f">Pro</div>
    <p class="bln-plan-tagline">改善実験を進める</p>
    <ul class="bln-plan-list">
      <li>カスタム実験の作成</li>
      <li>複数実験の同時進行</li>
      <li>AIによる次の実験提案</li>
      <li>Research Contribution Badge</li>
    </ul>
    <button class="bln-modal-cta bln-btn-gold" type="button" disabled>Proにする（準備中）</button>
    <button class="bln-modal-later" type="button" data-bln-close>あとで</button>
  `,
};

function openBillingModal(kind) {
  const sheet    = document.getElementById('bln-modal-sheet');
  const backdrop = document.getElementById('bln-modal-backdrop');
  if (!sheet || !backdrop || !_MODAL_CONTENT[kind]) return;

  sheet.innerHTML = _MODAL_CONTENT[kind];
  backdrop.hidden = false;
}

function closeBillingModal() {
  const backdrop = document.getElementById('bln-modal-backdrop');
  if (backdrop) backdrop.hidden = true;
}

function _attachHandlers(screen) {
  if (!screen || screen.dataset.blnHandlersAttached === '1') return;
  screen.dataset.blnHandlersAttached = '1';

  screen.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-bln-open]');
    if (openBtn) {
      openBillingModal(openBtn.getAttribute('data-bln-open'));
      return;
    }
    const closeBtn = e.target.closest('[data-bln-close]');
    if (closeBtn) {
      closeBillingModal();
      return;
    }
    // backdrop自体のクリックで閉じる（Prototype同様、シート外タップで閉じる）
    if (e.target.id === 'bln-modal-backdrop') {
      closeBillingModal();
    }
  });
}

const _STATE_LABEL_PREFIX = {
  free:    '現在のプラン: ',
  premium: '現在のプラン: ',
  pro:     '現在のプラン: ',
  unknown: '',
  error:   '',
};

/**
 * Premium/Proの2枚のplan-cardと詳細モーダルは静的マークアップ
 * （Prototypeコピーそのまま）。「現在のプラン」表示のみ、既存Application
 * Facade（premium-service.js）経由のRead-only Adapterで描画する。
 * unknown/error時は不確かな情報を出さず非表示のままにする。
 */
export async function renderBillingNext() {
  const screen = document.getElementById('screen-billing-next');
  if (!screen) return;
  _attachHandlers(screen);

  const planEl = document.getElementById('bln-current-plan');
  if (!planEl) return;

  let vm;
  try {
    vm = await getSubscriptionViewModel();
  } catch (_) {
    planEl.hidden = true;
    return;
  }

  const prefix = _STATE_LABEL_PREFIX[vm.state] ?? '';
  if (!prefix) {
    planEl.hidden = true;
    return;
  }
  planEl.textContent = prefix + vm.label;
  planEl.hidden = false;
}

export async function showBillingNext() {
  await showScreen('billing-next');
  await renderBillingNext();
}

export function initBillingNext() {
  if (!isBillingNextEnabled()) return;

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('billing-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// Navigation（タブ追加・既存タブ変更）は今回のPRスコープ外のため、
// 到達方法はコンソール関数のみ用意する（home-next-shell.js等と同一パターン）。
//   window.ippoBillingNext.enable()  → 有効化
//   window.ippoBillingNext.disable() → 無効化してリロード
//   window.ippoBillingNext.preview() → フラグ操作なしでプレビュー表示

window.ippoBillingNext = {
  enable()  { enableBillingNext();  initBillingNext(); showBillingNext(); },
  disable() { disableBillingNext(); location.reload(); },
  preview() { initBillingNext(); showBillingNext(); },
  isEnabled: isBillingNextEnabled,
  render: renderBillingNext,
};

initBillingNext();
