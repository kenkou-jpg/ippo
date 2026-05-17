// ============================================================
//  ippo – home-next-shell.js v2
//  Calm Insight HOME オーケストレーター
//
//  Feature flag: localStorage['ippo_home_next'] === '1'
//  ON のとき window.showMain を showHomeNext に差し替える。
//  既存の home / calendar / record / persistence は一切変更しない。
// ============================================================

import './home-next.css';

import { getState }                  from '../../store/state.js';
import { showScreen }                from '../screen-router.js';
import { getHomeConfiguration }      from './home-next-config.js';
import { renderHero }                from './home-next-hero.js';
import { renderStatusCards }         from './home-next-status.js';
import { renderInsights }            from './home-next-insights.js';
import { renderOptionalModules }     from './home-next-optional.js';
import { renderQuickRecord }         from './home-next-quick-record.js';
import { renderPersonalizeSection }  from './home-next-personalize.js';

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

export function enableHomeNext()  { try { localStorage.setItem(FLAG_KEY, '1'); }    catch { /* noop */ } }
export function disableHomeNext() { try { localStorage.removeItem(FLAG_KEY); }       catch { /* noop */ } }

// ── ヘッダーバー ─────────────────────────────────────────

// ベルSVG (outline / 1.5px)
const SVG_BELL = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M10 2.5a6.5 6.5 0 00-6.5 6.5v3l-1 2h15l-1-2V9A6.5 6.5 0 0010 2.5z"/>
  <path d="M8 16.5a2 2 0 004 0"/>
</svg>`;

function renderHeader(container, state) {
  const name    = state.name || '';
  const initial = name ? name.charAt(0).toUpperCase() : 'K';

  // 未読通知があるか（将来の通知機能を想定、今は常にfalse）
  const hasUnread = false;

  container.innerHTML = `
    <div class="hn-header">
      <div class="hn-header-logo">
        ippo
        <span class="hn-header-logo-dot"></span>
      </div>
      <div class="hn-header-actions">
        <button class="hn-header-bell" aria-label="通知"
          onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)">
          ${SVG_BELL}
          ${hasUnread ? '<span class="hn-bell-badge"></span>' : ''}
        </button>
        <div class="hn-header-avatar"
          onclick="if(typeof window.switchTab==='function')window.switchTab('settings',null)">
          ${esc(initial)}
        </div>
      </div>
    </div>`;
}

// ── グリーティング・日付 ─────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 10) return 'おはよう、';
  if (h >= 10 && h < 17) return 'こんにちは、';
  if (h >= 17 && h < 21) return 'こんばんは、';
  return 'おつかれさまです、';
}

function getSubGreeting(state, records) {
  // 今日の記録があれば状態に合わせた一言
  const today = new Date().toISOString().slice(0, 10);
  const todayRec = (records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  );

  if (!todayRec && records.length === 0) {
    return 'からだの記録を始めましょう。';
  }
  if (!todayRec) {
    return '今日の体調を記録してみましょう。';
  }

  const pain = todayRec.painLevel ?? 0;
  const sleep = todayRec.sleepQuality ?? 0;

  if (pain >= 3) return '今日はつらい日かもしれません。無理しないで。';
  if (sleep >= 3) return '少し疲れが出やすい状態かもしれません。';
  if (pain === 0 && sleep <= 1) return 'あなたの体は、よくがんばっています。';
  return 'からだの状態を確認していきましょう。';
}

// ── グリーティングセクション ─────────────────────────────

function renderGreeting(container, state) {
  const records  = state.records || [];
  const name     = state.name || 'あなた';
  const greeting = getGreeting();
  const sub      = getSubGreeting(state, records);

  container.innerHTML = `
    <div class="hn-greeting hn-anim-0">
      <div class="hn-greeting-time">${greeting}</div>
      <div class="hn-greeting-name">${esc(name)}さん</div>
      <div class="hn-greeting-sub">${esc(sub)}</div>
    </div>`;
}

// ── メインレンダリング ────────────────────────────────────

function renderAll() {
  const state  = getState();
  const config = getHomeConfiguration(state.myDiseases || []);

  const header      = document.getElementById('hn-header');
  const greeting    = document.getElementById('hn-greeting');
  const hero        = document.getElementById('hn-hero');
  const status      = document.getElementById('hn-status');
  const personalize = document.getElementById('hn-personalize');
  const optional    = document.getElementById('hn-optional');
  const insights    = document.getElementById('hn-insights');
  const record      = document.getElementById('hn-record');

  if (header)      renderHeader(header, state);
  if (greeting)    renderGreeting(greeting, state);
  if (hero)        renderHero(hero, config, state);
  if (status)      renderStatusCards(status, config, state);
  if (personalize) renderPersonalizeSection(personalize, config, state);
  if (optional)    renderOptionalModules(optional, config, state);
  if (insights)    renderInsights(insights, state, config);
  if (record)      renderQuickRecord(record, state);

  // 既存 window bridge 関数も更新
  if (typeof window.updateSettingsHero === 'function') window.updateSettingsHero();
  if (typeof window.updateUnlock       === 'function') window.updateUnlock();
  if (typeof window.initReminders      === 'function') window.initReminders();
}

// ── showHomeNext ─────────────────────────────────────────

export async function showHomeNext() {
  await showScreen('home-next');
  renderAll();
}

// ── tab-navigation との統合 ──────────────────────────────

function patchTabNavigation() {
  const originalSwitchTab = window.switchTab;

  window.switchTab = async function (tab, btn) {
    if (tab === 'home') {
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      if (btn) btn.classList.add('active');
      window.scrollTo(0, 0);
      await showHomeNext();
    } else {
      if (typeof originalSwitchTab === 'function') await originalSwitchTab(tab, btn);
    }
  };

  // tab-nav が個別に呼ぶ update 関数を no-op に (home-next が一括担う)
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

  window.showMain = showHomeNext;
  patchTabNavigation();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('home-next-init');
  }
}

// ── DevTools ヘルパー ─────────────────────────────────────
// コンソールから:
//   window.ippoHomeNext.enable()   → 有効化 (その場でプレビュー)
//   window.ippoHomeNext.disable()  → 無効化してリロード
//   window.ippoHomeNext.preview()  → フラグ操作なしでプレビュー

window.ippoHomeNext = {
  enable()  { enableHomeNext();  initHomeNext(); showHomeNext(); },
  disable() { disableHomeNext(); location.reload(); },
  preview() { initHomeNext(); showHomeNext(); },
  isEnabled: isHomeNextEnabled,
  render: renderAll,
};

// ── 自動起動 ─────────────────────────────────────────────
// tab-navigation.js より後にロードされるため window.switchTab 上書き安全

initHomeNext();

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
