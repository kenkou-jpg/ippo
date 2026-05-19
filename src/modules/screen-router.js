// ============================================================
//  ippo – src/modules/screen-router.js
//  Priority 7: 画面遷移を state 経由に統一
//
//  showScreen(name) を経由することで「現在どの画面か」が
//  DOM ではなく state.currentScreen に存在するようになる。
//
//  Phase 8: src/screens/{name}.html の遅延読み込みに対応。
//  static DOM にスクリーンが存在する場合はそのまま使用し、
//  存在しない場合は ?raw バンドル → fetch の順で注入する。
//  ?raw import により本番ビルドでも確実に HTML が利用可能。
// ============================================================

import { getState } from '../store/state.js';
import insightsHtml from '../screens/insights.html?raw';

// Vite ?raw でバンドルされた画面 HTML マップ。
// fetch に依存しないため本番環境でも確実に動作する。
const SCREEN_HTML = {
  insights: insightsHtml,
};

const _loadedScreens = new Set();

// ─── attachCalendarModalHandlers ────────────────────────────
// calendar 画面 inject 後、または静的 DOM 確定後に #dmOverlay/#dmClose
// のハンドラを確実にバインドする。_dmHandlerAttached ガードで重複防止。
function _attachCalendarModalHandlers() {
  var dmClose = document.getElementById('dmClose');
  var dmOverlay = document.getElementById('dmOverlay');
  if (dmClose && !dmClose._dmHandlerAttached) {
    dmClose.addEventListener('click', function () {
      var ov = document.getElementById('dmOverlay');
      if (ov) ov.classList.remove('dm-open');
    });
    dmClose._dmHandlerAttached = true;
  }
  if (dmOverlay && !dmOverlay._dmHandlerAttached) {
    dmOverlay.addEventListener('click', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.classList.remove('dm-open');
    });
    dmOverlay._dmHandlerAttached = true;
  }
}
export { _attachCalendarModalHandlers as attachCalendarModalHandlers };

export async function ensureScreenLoaded(name) {
  return _ensureScreenLoaded(name);
}

async function _ensureScreenLoaded(name) {
  const existing = document.getElementById(`screen-${name}`);
  if (existing) return; // static DOM or already injected
  if (_loadedScreens.has(name)) return; // already in flight / done
  _loadedScreens.add(name);

  let container = document.getElementById('screens-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'screens-container';
    document.getElementById('main-app')?.appendChild(container) ??
      document.body.appendChild(container);
  }

  // ?raw バンドルがあればそれを使用（本番環境でも確実）
  if (SCREEN_HTML[name]) {
    const tmp = document.createElement('div');
    tmp.innerHTML = SCREEN_HTML[name];
    while (tmp.firstChild) container.appendChild(tmp.firstChild);
    if (name === 'calendar') _attachCalendarModalHandlers();
    return;
  }

  // fallback: 開発時など raw html がない画面は fetch で取得
  try {
    const res = await fetch(`/src/screens/${name}.html`);
    if (!res.ok) throw new Error(`screen fetch failed: ${res.status}`);
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) container.appendChild(tmp.firstChild);
    if (name === 'calendar') _attachCalendarModalHandlers();
  } catch (e) {
    _loadedScreens.delete(name);
    console.warn(`[screen-router] could not load screen "${name}":`, e);
    // ユーザーに最低限のフィードバックを表示
    const errEl = document.createElement('div');
    errEl.id = `screen-${name}`;
    errEl.className = 'screen';
    errEl.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#666;font-size:14px;';
    errEl.textContent = '画面の読み込みに失敗しました。再読み込みしてください。';
    container.appendChild(errEl);
  }
}

export async function showScreen(name) {
  const state = getState();
  state.currentScreen = name;

  // welcome → main-app の切り替え（これだけ style.display を使う）
  const welcomeEl = document.getElementById('screen-welcome');
  const mainAppEl = document.getElementById('main-app');
  if (welcomeEl) welcomeEl.style.display = 'none';
  if (mainAppEl) mainAppEl.style.display = 'block';

  // Phase 8: スクリーンが DOM に無ければ fetch して注入
  await _ensureScreenLoaded(name);

  // CSS .screen / .screen.active クラス方式に統一（switchTab と同じ機構）
  // inline style.display が残留するとクラスより優先されるため必ずクリアする
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('active');
    el.style.display = '';
  });
  const target = document.getElementById(`screen-${name}`);
  if (target) target.classList.add('active');

  // [data-tab-for] ボタンのアクティブ状態を同期
  document.querySelectorAll('[data-tab-for]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tabFor === name);
  });
}

export function getCurrentScreen() {
  return getState().currentScreen || 'home';
}

window.showScreen      = showScreen;
window.getCurrentScreen = getCurrentScreen;

// 静的 DOM 版（app.html に #dmOverlay が既存）の場合も確実にバインド
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _attachCalendarModalHandlers);
} else {
  _attachCalendarModalHandlers();
}
