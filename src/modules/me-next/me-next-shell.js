// ============================================================
//  ippo – me-next-shell.js
//  PR-ME-RUNTIME-02: Prototype Me画面の表示専用シェル統合。
//
//  Feature flag: localStorage['ippo_me_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js等と同一パターン）。
//
//  PR-ME-RUNTIME-01の現状確認結果に基づくスコープ:
//    - Plan Card（Premium/Pro）はbilling-nextと重複するため実装せず、
//      「現在のプラン」テキスト + billing-next画面への遷移導線のみとする
//    - Research Consent UIはPrototypeに設計が存在しないため対象外
//      （Founder Decision待ち、別途）
//    - settings-list（5行）はPrototype自身も未接続の静的表示のみ
//      （「気になることを変更する」等の実装はスコープ外）
//    - preview-block（Founderレビュー用）はproduction対象外のため含めない
//
//  PR-ME-RUNTIME-03/04で「現在のプラン」をme-next-adapter.js経由
//  （billing-next-adapter.jsのgetSubscriptionViewModel()を再利用、
//  二重実装なし）で接続した。プロフィール名は対応するRead facadeが
//  見当たらなかったため引き続き未接続（空/hidden）。
// ============================================================

import './me-next.css';

import { showScreen }           from '../screen-router.js';
import { showBillingNext }      from '../billing-next/billing-next-shell.js';
import { getMeProfileViewModel } from './me-next-adapter.js';

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

function _attachHandlers(screen) {
  if (!screen || screen.dataset.menHandlersAttached === '1') return;
  screen.dataset.menHandlersAttached = '1';

  const planBtn = document.getElementById('men-profile-plan');
  if (planBtn) {
    planBtn.addEventListener('click', () => {
      showBillingNext();
    });
  }
}

/**
 * プライバシーカード・設定リストはすべて静的マークアップ（Prototypeコピー
 * そのまま）。「現在のプラン」のみRead-only Adapter経由で描画する。
 * プロフィール名は対応するRead facadeが無いため引き続き空のまま
 * （hidden状態、架空のプロフィールデータを作らない）。
 */
export async function renderMeNext() {
  const screen = document.getElementById('screen-me-next');
  if (!screen) return;
  _attachHandlers(screen);

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
