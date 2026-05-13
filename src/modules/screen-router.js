// ============================================================
//  ippo – src/modules/screen-router.js
//  Priority 7: 画面遷移を state 経由に統一
//
//  showScreen(name) を経由することで「現在どの画面か」が
//  DOM ではなく state.currentScreen に存在するようになる。
// ============================================================

import { getState } from '../store/state.js';

const SCREENS = ['home', 'record', 'settings', 'charts', 'reports'];

export function showScreen(name) {
  const state = getState();
  state.currentScreen = name;

  // welcome → main-app の切り替え（オンボーディング完了後の初回遷移を含む）
  const welcomeEl = document.getElementById('screen-welcome');
  const mainAppEl = document.getElementById('main-app');
  if (welcomeEl) welcomeEl.style.display = 'none';
  if (mainAppEl) mainAppEl.style.display = 'block';

  // 各 screen タブの表示切り替え
  SCREENS.forEach(screen => {
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.style.display = screen === name ? 'block' : 'none';
  });

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
