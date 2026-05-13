// ============================================================
//  ippo – src/modules/theme.js
//  Priority 8 (Step 8-2): applyTheme / THEMES を app.html から移植
// ============================================================

export var THEMES = ['sakura', 'coral', 'midnight', 'forest', 'sky', 'honey'];

export function applyTheme(name) {
  if (!THEMES.includes(name)) name = 'sakura';
  document.documentElement.setAttribute('data-theme', name === 'sakura' ? '' : name);
  localStorage.setItem('ippo_theme', name);
  THEMES.forEach(function (t) {
    var dot = document.getElementById('theme-dot-' + t);
    var btn = document.getElementById('theme-btn-' + t);
    if (dot) dot.style.borderColor = t === name ? 'var(--rose)' : 'transparent';
    if (btn) btn.style.background  = t === name ? 'var(--rose-pale)' : '';
  });
  if (typeof window.updateHomeCTA === 'function') window.updateHomeCTA();
}

// ─── 初期テーマ適用 ───────────────────────────────────────────
(function initTheme() {
  var saved = localStorage.getItem('ippo_theme') || 'sakura';
  applyTheme(saved);
})();

// ─── window 互換 ──────────────────────────────────────────────
window.THEMES     = THEMES;
window.applyTheme = applyTheme;
