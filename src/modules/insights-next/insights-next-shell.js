// ============================================================
//  ippo – insights-next-shell.js
//  PR-INSIGHTS-RUNTIME-02: Prototype Insights画面の表示専用シェル統合。
//
//  Feature flag: localStorage['ippo_insights_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js / experiment-next-shell.jsと同一パターン）。
//
//  PR-INSIGHTS-RUNTIME-03で「今週のハイライト」をRead-only ViewModel
//  Adapter経由で接続し、PR-INSIGHTS-RUNTIME-04でrecords読み取りを
//  window.app.api.getRecords()（ApiGateway経由の正規経路）へ切り替えた。
//  「実験結果サマリー」は比較用データソースの設計が別途必要なため、
//  引き続き空のまま（hidden状態）とする。書き込みは一切行わない
//  （Insights自体に書き込み概念はない）。
//
//  Pattern Calendar: Founder Decision(2026-07-18, LEGACY_SUNSET_COUNCIL.md②)
//  により「β後」から「Runtime正式実装」へ格上げ。
//  insights-pattern-calendar-adapter.js経由でrecords実データから算出する
//  （現行calendar-next.js＝Calendarタブの月相カレンダーとは別画面・別データ
//  表現のため流用しない、無変更のまま維持）。
// ============================================================

import './insights-next.css';

import { showScreen }             from '../screen-router.js';
import { getHighlightViewModel }  from './insights-next-adapter.js';
import { getPatternCalendarViewModel } from './insights-pattern-calendar-adapter.js';
// PR-FULL-INTEGRATION-01: 周期グラフロックオーバーレイの「Premiumを見る」
// ボタンからbilling-nextへ遷移する（me-next-shell.jsと同一パターン）。
import { showBillingNext }        from '../billing-next/billing-next-shell.js';

const FLAG_KEY = 'ippo_insights_ui_v2';

export function isInsightsNextEnabled() {
  try {
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function enableInsightsNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }   catch (_) { /* noop */ } }
export function disableInsightsNext() { try { localStorage.removeItem(FLAG_KEY); }     catch (_) { /* noop */ } }

// PR-FULL-INTEGRATION-01: 周期グラフロックオーバーレイの「Premiumを見る」
// ボタンをbilling-nextへの遷移に接続する。二重バインド防止は
// billing-next-shell.js/me-next-shell.jsと同一のdatasetガードパターン。
function _attachHandlers(screen) {
  if (!screen || screen.dataset.insnHandlersAttached === '1') return;
  screen.dataset.insnHandlersAttached = '1';

  const premiumBtn = document.getElementById('insn-premium-cta');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', () => {
      showBillingNext();
    });
  }
}

async function _renderPatternCalendar() {
  const grid = document.getElementById('insn-pattern-calendar');
  if (!grid) return;

  let vm;
  try {
    vm = await getPatternCalendarViewModel();
  } catch (_) {
    return;
  }

  grid.innerHTML = vm.cells
    .map((c) => `<div class="insn-cell${c ? ' ' + c : ''}"></div>`)
    .join('');
}

/**
 * 「今週のハイライト」はRead-only ViewModel Adapter（ApiGateway.getRecords()
 * 経由）で描画する。パターンカレンダーも同様にrecords実データから算出する
 * （insights-pattern-calendar-adapter.js）。「実験結果サマリー」は比較用
 * データソース未設計のため引き続き空のまま（hidden状態）とする。
 */
export async function renderInsightsNext() {
  const screen = document.getElementById('screen-insights-next');
  if (!screen) return;
  _attachHandlers(screen);
  await _renderPatternCalendar();

  const textEl = document.getElementById('insn-highlight-text');
  const rowEl  = document.getElementById('insn-highlight-confidence-row');
  const tagEl  = document.getElementById('insn-highlight-confidence');
  if (!textEl) return;

  // records以外（myDiseases等）は現時点でApiGateway側にRead経路が無いため
  // legacy window.getState()から補う。records自体はAdapter内でApiGateway
  // 経由の値に置き換えられる。
  const extraState = typeof window !== 'undefined' && typeof window.getState === 'function'
    ? window.getState()
    : {};

  let vm;
  try {
    vm = await getHighlightViewModel(extraState);
  } catch (_) {
    return;
  }

  textEl.textContent = vm.text;

  if (rowEl && tagEl) {
    if (vm.confidenceLabel && vm.confidenceDots > 0) {
      const dots = rowEl.querySelectorAll('.insn-confidence-dot');
      dots.forEach((dot, i) => dot.classList.toggle('filled', i < vm.confidenceDots));
      tagEl.textContent = _CONF_TAG_LABEL[vm.confidenceLabel] || '';
      rowEl.hidden = false;
    } else {
      rowEl.hidden = true;
    }
  }
}

const _CONF_TAG_LABEL = { high: '信頼度：高', medium: '信頼度：中', low: '信頼度：低' };

export async function showInsightsNext() {
  await showScreen('insights-next');
  await renderInsightsNext();
}

export function initInsightsNext() {
  if (!isInsightsNextEnabled()) return;

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('insights-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// Navigation（タブ追加・既存タブ変更）は今回のPRスコープ外のため、
// 到達方法はコンソール関数のみ用意する（home-next-shell.js/
// experiment-next-shell.jsと同一パターン）。
//   window.ippoInsightsNext.enable()  → 有効化
//   window.ippoInsightsNext.disable() → 無効化してリロード
//   window.ippoInsightsNext.preview() → フラグ操作なしでプレビュー表示

window.ippoInsightsNext = {
  enable()  { enableInsightsNext();  initInsightsNext(); showInsightsNext(); },
  disable() { disableInsightsNext(); location.reload(); },
  preview() { initInsightsNext(); showInsightsNext(); },
  isEnabled: isInsightsNextEnabled,
  render: renderInsightsNext,
};

initInsightsNext();
