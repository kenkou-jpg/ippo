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
//  Pattern Calendarは意図的に含まない（Founder Decision:
//  Calendar/Record/Insight/Patternを横断する情報設計事項のため、
//  General Release後の独立PRとして扱う）。
// ============================================================

import './insights-next.css';

import { showScreen }             from '../screen-router.js';
import { getHighlightViewModel }  from './insights-next-adapter.js';

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

/**
 * 「今週のハイライト」はRead-only ViewModel Adapter（ApiGateway.getRecords()
 * 経由）で描画する。「実験結果サマリー」は比較用データソース未設計のため
 * 引き続き空のまま（hidden状態）とする。
 */
export async function renderInsightsNext() {
  const screen = document.getElementById('screen-insights-next');
  if (!screen) return;

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
