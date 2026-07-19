// ============================================================
//  ippo – me-next-shell.js
//  PR-ME-RUNTIME-02: Prototype Me画面の表示専用シェル統合。
//
//  Feature flag: localStorage['ippo_me_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js等と同一パターン）。
//
//  PR-ME-RUNTIME-01の現状確認結果に基づくスコープ:
//    - settings-list（5行）はPrototype自身も未接続の静的表示のみ
//      （「気になることを変更する」等の実装はスコープ外、Consent以外は継続）
//    - preview-block（Founderレビュー用）はproduction対象外のため含めない
//
//  PR-ME-REBUILD-01（2026-07-19、Founder Decision③ハイブリッド案）:
//  Billing独立画面は維持しつつ、Me画面にもPrototype準拠のPlanカード2枚を
//  インライン表示する。Me側は要約（タグライン+CTA）に限定し、機能一覧・
//  価格・Checkout・購読状態変更・詳細比較はBillingへ一元化する（二重実装
//  しない）。CTAはPremium/Proどちらも showBillingNext() でbilling-next
//  画面へ遷移するのみで、モーダルやCheckoutロジックは持たない。
//
//  PR-ME-RUNTIME-03/04で「現在のプラン」をme-next-adapter.js経由
//  （billing-next-adapter.jsのgetSubscriptionViewModel()を再利用、
//  二重実装なし）で接続した。プロフィール名は対応するRead facadeが
//  見当たらなかったため引き続き未接続（空/hidden）。
//
//  Founder Decision(2026-07-18, LEGACY_SUNSET_COUNCIL.md): Research
//  Consent UIはPrototype v2再設計を待たず、Runtime正式版の一部として
//  実装する。既存src/services/consent-service.js（DOM非依存の純粋関数、
//  LegacyのSettings画面専用ではない）をそのまま再利用し、二重実装しない。
// ============================================================

import './me-next.css';

import { showScreen }           from '../screen-router.js';
import { showBillingNext }      from '../billing-next/billing-next-shell.js';
import { getMeProfileViewModel } from './me-next-adapter.js';
import {
  isResearchConsentGranted,
  grantResearchConsent,
  withdrawResearchConsent,
}                                from '../../services/consent-service.js';
import { showConfirmModal }     from '../ui-notifications.js';

const FLAG_KEY = 'ippo_me_ui_v2';

export function isMeNextEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function enableMeNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }   catch (_) { /* noop */ } }
export function disableMeNext() { try { localStorage.removeItem(FLAG_KEY); }     catch (_) { /* noop */ } }

function _renderConsentStatus() {
  const el = document.getElementById('men-consent-sub');
  if (!el) return;
  el.textContent = isResearchConsentGranted()
    ? '協力中（いつでも撤回できます）'
    : '同意していません';
}

function _handleConsentToggle() {
  const granted = isResearchConsentGranted();
  const message = granted
    ? '研究への協力の同意を撤回しますか？'
    : '匿名化された記録を、疾患研究の役に立てることに同意しますか？いつでも撤回できます。';
  const action = granted
    ? () => { withdrawResearchConsent(); _renderConsentStatus(); }
    : () => { grantResearchConsent(); _renderConsentStatus(); };
  showConfirmModal(message, action);
}

function _attachHandlers(screen) {
  if (!screen || screen.dataset.menHandlersAttached === '1') return;
  screen.dataset.menHandlersAttached = '1';

  const planBtn = document.getElementById('men-profile-plan');
  if (planBtn) {
    planBtn.addEventListener('click', () => {
      showBillingNext();
    });
  }

  // PR-ME-REBUILD-01: Planカード要約のCTA。詳細・比較・CheckoutはBillingへ
  // 集約する（Founder Decision③ハイブリッド案）ため、ここではbilling-next
  // 画面への遷移のみ行い、モーダルやCheckoutロジックは持たない（二重実装しない）。
  const planPremiumCta = document.getElementById('men-plan-premium-cta');
  if (planPremiumCta) {
    planPremiumCta.addEventListener('click', () => {
      showBillingNext();
    });
  }

  const planProCta = document.getElementById('men-plan-pro-cta');
  if (planProCta) {
    planProCta.addEventListener('click', () => {
      showBillingNext();
    });
  }

  const consentBtn = document.getElementById('men-consent-row');
  if (consentBtn) {
    consentBtn.addEventListener('click', _handleConsentToggle);
  }
}

/**
 * プライバシーカード・設定リストは静的マークアップ（Prototypeコピーそのまま）。
 * Consent行のみFounder Decisionによりconsent-service.js経由で実データを
 * 描画する。「現在のプラン」はRead-only Adapter経由。プロフィール名は
 * 対応するRead facadeが無いため引き続き空のまま（hidden状態、架空の
 * プロフィールデータを作らない）。
 */
export async function renderMeNext() {
  const screen = document.getElementById('screen-me-next');
  if (!screen) return;
  _attachHandlers(screen);
  _renderConsentStatus();

  const planBtn = document.getElementById('men-profile-plan');
  if (!planBtn) return;

  let vm;
  try {
    vm = await getMeProfileViewModel();
  } catch (_) {
    planBtn.hidden = true;
    return;
  }

  if (!vm) {
    planBtn.hidden = true;
    return;
  }
  planBtn.textContent = vm.text + ' ›';
  planBtn.hidden = false;
}

export async function showMeNext() {
  await showScreen('me-next');
  await renderMeNext();
}

export function initMeNext() {
  if (!isMeNextEnabled()) return;

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('me-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// Navigation（タブ追加・既存タブ変更）は今回のPRスコープ外のため、
// 到達方法はコンソール関数のみ用意する（home-next-shell.js等と同一パターン）。
//   window.ippoMeNext.enable()  → 有効化
//   window.ippoMeNext.disable() → 無効化してリロード
//   window.ippoMeNext.preview() → フラグ操作なしでプレビュー表示

window.ippoMeNext = {
  enable()  { enableMeNext();  initMeNext(); showMeNext(); },
  disable() { disableMeNext(); location.reload(); },
  preview() { initMeNext(); showMeNext(); },
  isEnabled: isMeNextEnabled,
  render: renderMeNext,
};

initMeNext();
