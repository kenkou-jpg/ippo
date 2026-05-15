// ============================================================
//  ippo – src/modules/screen-router.js
//  Priority 7: 画面遷移を state 経由に統一
//
//  showScreen(name) を経由することで「現在どの画面か」が
//  DOM ではなく state.currentScreen に存在するようになる。
//
//  Phase 8: src/screens/{name}.html の遅延 fetch に対応。
//  static DOM にスクリーンが存在する場合はそのまま使用し、
//  存在しない場合のみ fetch して #screens-container に注入する。
// ============================================================

import { getState } from '../store/state.js';

const _loadedScreens = new Set();

export async function ensureScreenLoaded(name) {
  return _ensureScreenLoaded(name);
}

async function _ensureScreenLoaded(name) {
  const existing = document.getElementById(`screen-${name}`);
  if (existing) return; // static DOM or already injected
  if (_loadedScreens.has(name)) return; // fetch already in flight / done
  _loadedScreens.add(name);

  let container = document.getElementById('screens-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'screens-container';
    document.getElementById('main-app')?.appendChild(container) ??
      document.body.appendChild(container);
  }

  try {
    const res = await fetch(`/src/screens/${name}.html`);
    if (!res.ok) throw new Error(`screen fetch failed: ${res.status}`);
    const html = await res.text();
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) container.appendChild(tmp.firstChild);
  } catch (e) {
    _loadedScreens.delete(name);
    console.warn(`[screen-router] could not load screen "${name}":`, e);
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
