// ============================================================
//  ippo – src/modules/shared-header.js
//  HOME / Insights 共通ヘッダーシェル
//
//  両画面で同一の sticky / safe-area / frosted-glass ヘッダーを
//  提供する。"同じ wellness canvas の中にある" 感を実現。
// ============================================================

import './home-next/home-next.css';
import './pro-hub/pro-hub.css';
import { getState } from '../store/state.js';

const SVG_BELL = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2.5a6.5 6.5 0 00-6.5 6.5v3l-1 2h15l-1-2V9A6.5 6.5 0 0010 2.5z"/>
  <path d="M8 16.5a2 2 0 004 0"/>
</svg>`;

const SVG_STAR_SM = `<svg viewBox="0 0 12 12" fill="currentColor"><polygon points="6 1 7.55 4.18 11 4.64 8.5 7.07 9.09 10.5 6 8.86 2.91 10.5 3.5 7.07 1 4.64 4.45 4.18"/></svg>`;

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HOME / Insights 両画面で使う共通ヘッダーを container に描画する。
 * container は #hn-header または #ins-header。
 * isInsights=true の場合 PRO整理室ボタンを追加する。
 */
export function renderSharedHeader(container, { isInsights = false } = {}) {
  if (!container) return;
  const state   = getState();
  const name    = state.name || '';
  const initial = name ? name.charAt(0).toUpperCase() : 'K';

  const proBtn = isInsights
    ? `<button class="hn-pro-btn" id="hn-pro-btn" aria-label="PRO整理室を開く">
        ${SVG_STAR_SM} PRO整理室
       </button>`
    : '';

  container.innerHTML = `
    <div class="hn-header">
      <div class="hn-header-inner">
        <div class="hn-header-logo">
          ippo
          <span class="hn-header-logo-dot"></span>
        </div>
        <div class="hn-header-actions">
          ${proBtn}
          <button class="hn-header-bell" aria-label="通知"
            onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)">
            ${SVG_BELL}
          </button>
          <div class="hn-header-avatar"
            onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)">
            ${esc(initial)}
          </div>
        </div>
      </div>
    </div>`;

  // Wire PRO button after rendering
  if (isInsights) {
    const btn = container.querySelector('#hn-pro-btn');
    if (btn) btn.addEventListener('click', function() {
      if (typeof window.openProHub === 'function') window.openProHub();
    });
  }
}
