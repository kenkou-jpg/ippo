// ============================================================
//  ippo – src/modules/screen-router.js
//  Priority 7: 画面遷移を state 経由に統一
//
//  showScreen(name) を経由することで「現在どの画面か」が
//  DOM ではなく state.currentScreen に存在するようになる。
// ============================================================

import { getState } from '../store/state.js';

export function showScreen(name) {
  const state = getState();
  state.currentScreen = name;

  // welcome → main-app の切り替え（これだけ style.display を使う）
  const welcomeEl = document.getElementById('screen-welcome');
  const mainAppEl = document.getElementById('main-app');
  if (welcomeEl) welcomeEl.style.display = 'none';
  if (mainAppEl) mainAppEl.style.display = 'block';

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
