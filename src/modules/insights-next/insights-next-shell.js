// ============================================================
//  ippo – insights-next-shell.js
//  PR-INSIGHTS-RUNTIME-02: Prototype Insights画面の表示専用シェル統合。
//
//  Feature flag: localStorage['ippo_insights_ui_v2'] === '1'
//  OFF（デフォルト）のとき、このモジュールは何もしない
//  （home-next-shell.js / experiment-next-shell.jsと同一パターン）。
//
//  このPRはスクリーンの追加・登録のみが目的。データソース（legacy
//  insights-dynamic-renderer.js相当のRead-only Adapter）はPR-INSIGHTS-
//  RUNTIME-03、ApiGateway経由の読み取り接続はPR-INSIGHTS-RUNTIME-04で
//  それぞれ別PRとして追加する。書き込みは一切行わない（Insights自体に
//  書き込み概念はない）。
//
//  Pattern Calendarは意図的に含まない（Founder Decision:
//  Calendar/Record/Insight/Patternを横断する情報設計事項のため、
//  General Release後の独立PRとして扱う）。
// ============================================================

import './insights-next.css';

import { showScreen } from '../screen-router.js';

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
 * PR-INSIGHTS-RUNTIME-02時点では、画面の静的セクション（Premium-locked
 * カード等）はマークアップのみで完結しており、動的データ描画は行わない。
 * highlight/compareの各要素はPR-INSIGHTS-RUNTIME-03以降のRead-only Adapter
 * 接続まで空のまま（hidden状態）とする。
 */
export function renderInsightsNext() {
  const screen = document.getElementById('screen-insights-next');
  if (!screen) return;
  // 現時点では描画対象データソースがないため no-op。
  // 将来のAdapter接続はここへ追加する。
}

export async function showInsightsNext() {
  await showScreen('insights-next');
  renderInsightsNext();
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
