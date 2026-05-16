// ============================================================
//  ippo – home-next-shell.js
//  Calm Insight HOME オーケストレーター
//
//  Feature flag: localStorage['ippo_home_next'] === '1'
//  ON のとき window.showMain を showHomeNext に差し替える。
//  既存の home / calendar / record / persistence は一切変更しない。
// ============================================================

import './home-next.css';

import { getState }              from '../../store/state.js';
import { showScreen }            from '../screen-router.js';
import { getHomeConfiguration }  from './home-next-config.js';
import { renderHero }            from './home-next-hero.js';
import { renderStatusCards }     from './home-next-status.js';
import { renderInsights }        from './home-next-insights.js';
import { renderOptionalModules } from './home-next-optional.js';
import { renderQuickRecord }     from './home-next-quick-record.js';

// ── Feature flag ─────────────────────────────────────────

const FLAG_KEY = 'ippo_home_next';

export function isHomeNextEnabled() {
  try {
    const st = getState();
    if (st && st.homeNextEnabled === true)  return true;
    if (st && st.homeNextEnabled === false) return false;
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableHomeNext() {
  try { localStorage.setItem(FLAG_KEY, '1'); } catch { /* noop */ }
}

export function disableHomeNext() {
  try { localStorage.removeItem(FLAG_KEY); } catch { /* noop */ }
}

// ── グリーティング・日付 ─────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return 'おはようございます';
  if (h >= 10 && h < 17) return 'こんにちは';
  if (h >= 17 && h < 21) return 'こんばんは';
  return 'おつかれさまです';
}

function getDateStr() {
  const now  = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${now.getMonth() + 1}/${now.getDate()}（${days[now.getDay()]}）`;
}

// ── トップバー ───────────────────────────────────────────

function renderTopbar(container, state) {
  const name     = state.name ? `${state.name}さん` : 'あなたさん';
  const greeting = getGreeting();
  const date     = getDateStr();

  container.innerHTML = `
    <div class="hn-topbar">
      <div>
        <div class="hn-topbar-greeting">${greeting}</div>
        <div class="hn-topbar-name">${escapeHTML(name)}</div>
      </div>
      <div class="hn-topbar-date">${date}</div>
    </div>`;
}

// ── メインレンダリング ────────────────────────────────────

function renderAll() {
  const state  = getState();
  const config = getHomeConfiguration(state.myDiseases || []);

  const topbar   = document.getElementById('hn-topbar');
  const hero     = document.getElementById('hn-hero');
  const status   = document.getElementById('hn-status');
  const optional = document.getElementById('hn-optional');
  const insights = document.getElementById('hn-insights');
  const record   = document.getElementById('hn-record');

  if (topbar)   renderTopbar(topbar, state);
  if (hero)     renderHero(hero, config, state);
  if (status)   renderStatusCards(status, config, state);
  if (optional) renderOptionalModules(optional, config, state);
  if (insights) renderInsights(insights, state, config);
  if (record)   renderQuickRecord(record, state);

  // 既存の window bridge 関数も更新（設定画面ヒーローなど）
  if (typeof window.updateSettingsHero  === 'function') window.updateSettingsHero();
  if (typeof window.updateUnlock        === 'function') window.updateUnlock();
  if (typeof window.initReminders       === 'function') window.initReminders();
}

// ── showHomeNext ─────────────────────────────────────────

export async function showHomeNext() {
  await showScreen('home-next');
  renderAll();
}

// ── tab-navigation との統合 ──────────────────────────────
// switchTab('home') が呼ばれたとき home-next を表示するよう差し替える。
// また tab-nav が呼ぶ個別 update 関数を renderAll に集約する。

function patchTabNavigation() {
  const originalSwitchTab = window.switchTab;

  window.switchTab = async function (tab, btn) {
    if (tab === 'home') {
      // ナビボタンのアクティブ状態を同期
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (btn) btn.classList.add('active');
      window.scrollTo(0, 0);
      await showHomeNext();
    } else {
      if (typeof originalSwitchTab === 'function') {
        await originalSwitchTab(tab, btn);
      }
    }
  };

  // tab-nav が home タブで呼ぶ個別関数を no-op に（home-next が全部担う）
  const noOp = () => {};
  window.buildHomeWeekRow        = noOp;
  window.updateHomeInsightCard   = noOp;
  window.updateHomeNumbers       = noOp;
  window.updateHomeDiseaseAdvice = noOp;
  window.updateHomeCTAState      = noOp;
  window.updateHomePhaseBanner   = noOp;
  window.updateTodayMessage      = noOp;
}

// ── 初期化 ───────────────────────────────────────────────

export function initHomeNext() {
  if (!isHomeNextEnabled()) return;

  // showMain を差し替え（bootstrap / app-bootstrap が呼ぶ）
  window.showMain = showHomeNext;

  // tab-navigation を差し替え
  patchTabNavigation();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('home-next-init');
  }
}

// ── DevTools ヘルパー ────────────────────────────────────
// ブラウザコンソールから:
//   window.ippoHomeNext.enable()  → 有効化してリロード不要でプレビュー
//   window.ippoHomeNext.disable() → 無効化
//   window.ippoHomeNext.preview() → リロードせずその場でプレビュー

window.ippoHomeNext = {
  enable()  { enableHomeNext();  initHomeNext(); showHomeNext(); },
  disable() { disableHomeNext(); location.reload(); },
  preview() { initHomeNext(); showHomeNext(); },
  isEnabled: isHomeNextEnabled,
  render:    renderAll,
};

// ── 自動起動 ─────────────────────────────────────────────
// このモジュールがロードされた時点でフラグを確認し、有効なら差し替える。
// tab-navigation.js より後にロードされるため、window.switchTab の上書き安全。

initHomeNext();

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
