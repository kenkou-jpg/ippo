// ================================================================
//  ippo – src/modules/legacy-settings-hero.js
//  PR-090-P2 (Legacy Completion Recovery): app-legacy.js側のローカル実装
//  updateSettingsHero を新設・物理移動。Business Logic変更なし。
//
//  settings-display-runtime.js に同名の別実装（window.updateSettingsHero、
//  initSettingsPanels()呼び出しを追加で行う）が既に存在し、load順（後着ロード）で
//  window.updateSettingsHero は常にそちらに上書きされる。premium-lock.js の
//  updatePremiumBadges() 内の bare 呼び出しは本ローカル実装（initSettingsPanels
//  非呼び出し）を維持する必要があるため、window.__ippoLegacyUpdateSettingsHero
//  経由で明示的に呼び出す（PR-081時点の設計を継続。updateSettingsHero 自体の
//  重複解消は製品判断が必要なため本PRのScope外）。
//
//  bare `state` → `window.state`、isAdminOrPremium は
//  src/modules/legacy-misc-stats.js から直接import（同モジュールの既存export）。
// ================================================================

import { isAdminOrPremium } from './legacy-misc-stats.js';

export function updateSettingsHero() {
  var state = window.state;
  var nameEl = document.getElementById('settings-name-display');
  if (nameEl) nameEl.textContent = state.name || 'ゲスト';

  var badgeEl = document.getElementById('settings-premium-badge-text');
  if (badgeEl) badgeEl.textContent = isAdminOrPremium() ? 'プレミアム会員 ✨' : '無料プラン';

  var upgradeBtn = document.getElementById('settings-upgrade-btn');
  if (upgradeBtn) upgradeBtn.style.display = isAdminOrPremium() ? 'none' : '';

  var countEl = document.getElementById('settings-record-count');
  if (countEl) countEl.textContent = (state.records || []).length;

  var streakEl = document.getElementById('settings-streak');
  if (streakEl) {
    var streak = 0;
    var today = new Date();
    for (var i = 0; i < 365; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().slice(0, 10);
      var found = (state.records || []).some(function(r) {
        return (r.record_date || (r.date && r.date.slice(0, 10))) === ds;
      });
      if (found) streak++;
      else if (i > 0) break;
    }
    streakEl.textContent = streak;
  }
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// window.updateSettingsHero自体は settings-display-runtime.js が上書きするため
// 意図的に設定しない（本ファイル冒頭コメント参照、製品判断が必要でScope外）。
// premium-lock.js が明示的に参照する専用ブリッジのみ自己export する
// （app-legacy.js側の重複行は削除済み）。
window.__ippoLegacyUpdateSettingsHero = updateSettingsHero;
