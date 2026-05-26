// ============================================================
// ippo – src/modules/settings-display-runtime.js
// Phase D-2: settings 画面の表示更新ロジックを module 化
// ============================================================

import { getState } from '../store/state.js';

export function updateSettingsHero() {
  const state = getState();
  const isPremium = typeof window.isAdminOrPremium === 'function'
    ? window.isAdminOrPremium()
    : false;

  // Settings profile パネルの表示テキストを更新
  if (typeof window.initSettingsPanels === 'function') window.initSettingsPanels();

  const nameEl = document.getElementById('settings-name-display');
  if (nameEl) nameEl.textContent = state.name || 'ゲスト';

  const badgeEl = document.getElementById('settings-premium-badge-text');
  if (badgeEl) badgeEl.textContent = isPremium ? 'プレミアム会員 ✨' : '無料プラン';

  const upgradeBtn = document.getElementById('settings-upgrade-btn');
  if (upgradeBtn) upgradeBtn.style.display = isPremium ? 'none' : '';

  const countEl = document.getElementById('settings-record-count');
  if (countEl) countEl.textContent = (state.records || []).length;

  const streakEl = document.getElementById('settings-streak');
  if (streakEl) {
    let streak = 0;
    const today = new Date();
    const records = state.records || [];
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const found = records.some(function(r) {
        return (r.record_date || (r.date && r.date.slice(0, 10))) === ds;
      });
      if (found) streak++;
      else if (i > 0) break;
    }
    streakEl.textContent = streak;
  }
}

export function initNavIcons() {
  const ICONS = window.ICONS;
  if (!ICONS) return;
  const map = {
    'nav-icon-home':      ICONS.home(20, 'currentColor'),
    'nav-icon-calendar':  ICONS.calendar(20, 'currentColor'),
    'nav-icon-insights':  ICONS.insights(20, 'currentColor'),
    'nav-icon-plus':      ICONS.plus(22, 'white'),
    'home-settings-icon': ICONS.settings(18, 'rgba(255,255,255,0.9)'),
  };
  Object.keys(map).forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = map[id];
  });
}

export function initSettingsIcons() {
  const ICONS = window.ICONS;
  if (!ICONS) return;
  const map = {
    'settings-icon-profile':   ICONS.user(15, 'var(--rose)'),
    'settings-icon-theme':     ICONS.star(15, 'var(--rose)'),
    'settings-icon-reminder':  ICONS.bell(15, 'var(--rose)'),
    'settings-icon-disease':   ICONS.heart(15, 'var(--rose)'),
    'settings-icon-symptom':   ICONS.activity(15, 'var(--rose)'),
    'settings-icon-privacy':   ICONS.shield(15, 'var(--rose)'),
    'settings-icon-export':    ICONS.barChart(15, '#4a7c5c'),
    'settings-icon-backup':    ICONS.download(15, '#4a7c5c'),
    'settings-icon-restore':   ICONS.cloud(15, '#4a7c5c'),
    'settings-icon-history':   ICONS.download(15, '#4a7c5c'),
    'settings-icon-diagnosis': ICONS.search(15, 'var(--ink-light)'),
    'settings-icon-delete':    ICONS.trash(15, 'var(--rose)'),
    'settings-icon-priority':  ICONS.star(15, '#c8a840'),
    'settings-icon-density':   ICONS.barChart(15, 'var(--ink-light)'),
    'settings-icon-home-info': ICONS.home(15, 'var(--ink-light)'),
  };
  Object.keys(map).forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = map[id];
  });
}

window.updateSettingsHero  = updateSettingsHero;
window.initNavIcons        = initNavIcons;
window.initSettingsIcons   = initSettingsIcons;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('settings-display-runtime-loaded');
}
