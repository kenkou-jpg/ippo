// ============================================================
// ippo – src/modules/settings-display-runtime.js
// Phase D-2: settings 画面の表示更新ロジックを module 化
//
// updateSettingsHero / initNavIcons / initSettingsIcons を移植。
// window.ICONS / window.state / window.isAdminOrPremium() はすべて
// app.html から window 経由でアクセス可能。
// ============================================================

export function updateSettingsHero() {
  const state = window.state || {};
  const isPremium = typeof window.isAdminOrPremium === 'function'
    ? window.isAdminOrPremium()
    : false;

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
    'settings-icon-profile':   ICONS.user(16, 'var(--rose)'),
    'settings-icon-theme':     ICONS.star(16, 'var(--rose)'),
    'settings-icon-reminder':  ICONS.bell(16, 'var(--rose)'),
    'settings-icon-disease':   ICONS.heart(16, 'var(--rose)'),
    'settings-icon-symptom':   ICONS.activity(16, 'var(--rose)'),
    'settings-icon-privacy':   ICONS.shield(16, 'var(--rose)'),
    'settings-icon-export':    ICONS.barChart(16, '#4a7c5c'),
    'settings-icon-backup':    ICONS.download(16, '#4a7c5c'),
    'settings-icon-restore':   ICONS.cloud(16, '#4a7c5c'),
    'settings-icon-history':   ICONS.download(16, '#4a7c5c'),
    'settings-icon-diagnosis': ICONS.search(16, 'var(--ink-light)'),
    'settings-icon-delete':    ICONS.trash(16, 'var(--rose)'),
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
