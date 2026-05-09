// ============================================================
// ippo – minimal-app-shell-renderer.js
//
// Phase I:
// Boot-critical first-render safety layer.
//
// Purpose:
// - Ensure #app is not left empty while later startup/runtime modules load.
// - Provide expected root IDs early so diagnostics and guards can observe them.
// - Avoid depending on persistence, sync, Supabase, hydration, or migration runtimes.
//
// This module intentionally renders a conservative minimal shell only when #app
// is empty. It does not rewrite showScreen/switchTab/save/sync behavior.
// ============================================================

const MINIMAL_APP_SHELL_KEY = '__ippoMinimalAppShellRenderer';

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[MINIMAL_APP_SHELL_KEY]) {
    window[MINIMAL_APP_SHELL_KEY] = {
      loadedAt: nowIso(),
      rendered: false,
      renderReason: null,
      checks: [],
    };
  }
  return window[MINIMAL_APP_SHELL_KEY];
}

function hasExistingAppContent(app) {
  if (!app) return false;
  if (app.children && app.children.length > 0) return true;
  return (app.textContent || '').trim().length > 0;
}

function renderMinimalAppShell(reason) {
  const state = getState();
  const app = document.getElementById('app');

  if (!app) {
    state.rendered = false;
    state.renderReason = 'missing-app-root';
    return false;
  }

  if (hasExistingAppContent(app)) {
    state.rendered = false;
    state.renderReason = 'existing-app-content-preserved';
    return false;
  }

  app.innerHTML = `
    <div id="main-app" class="ippo-minimal-shell" data-ippo-minimal-shell="true">
      <section id="screen-home" class="screen active" data-screen="home">
        <div class="home-header">
          <div class="home-greeting">ippo</div>
          <div class="home-date">今日の体調を、少しずつ記録できます。</div>
        </div>
        <div style="padding:24px;">
          <div style="background:#fff;border-radius:20px;padding:20px;box-shadow:0 2px 12px rgba(200,120,140,0.10);">
            <h2 style="font-family:'Shippori Mincho',serif;font-size:20px;margin-bottom:10px;color:#2d1f1a;">アプリを起動しています</h2>
            <p style="font-size:13px;line-height:1.8;color:#8a7a70;">
              表示の準備をしています。記録データを守るため、保存・同期の処理はこの画面では実行しません。
            </p>
          </div>
        </div>
      </section>
      <section id="screen-calendar" class="screen" data-screen="calendar"></section>
      <section id="screen-insights" class="screen" data-screen="insights"></section>
      <section id="screen-record" class="screen" data-screen="record"></section>
      <section id="screen-settings" class="screen" data-screen="settings"></section>
      <nav class="bottom-nav" aria-label="ippo navigation">
        <button class="nav-item active" type="button" data-tab="home"><span class="nav-icon">⌂</span><span>ホーム</span></button>
        <button class="nav-item" type="button" data-tab="calendar"><span class="nav-icon">□</span><span>カレンダー</span></button>
        <button class="nav-item" type="button" data-tab="record"><span class="nav-icon">＋</span><span>記録</span></button>
        <button class="nav-item" type="button" data-tab="insights"><span class="nav-icon">◇</span><span>分析</span></button>
        <button class="nav-item" type="button" data-tab="settings"><span class="nav-icon">⚙</span><span>設定</span></button>
      </nav>
    </div>
  `;

  state.rendered = true;
  state.renderReason = reason || 'minimal-shell-rendered';
  state.renderedAt = nowIso();

  try {
    const fallback = document.getElementById('ippo-boot-fallback');
    if (fallback) fallback.hidden = true;
  } catch (_) {}

  if (typeof window.ippoMarkBootTimeline === 'function') {
    window.ippoMarkBootTimeline('minimal-app-shell-rendered', {
      reason: state.renderReason,
    });
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('minimal-app-shell-rendered', {
      reason: state.renderReason,
    });
  }

  return true;
}

function summarizeMinimalAppShellRenderer() {
  const state = getState();
  const app = document.getElementById('app');
  const activeScreens = Array.prototype.slice.call(document.querySelectorAll('.screen.active, .app-screen.active'));

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    rendered: !!state.rendered,
    renderReason: state.renderReason,
    renderedAt: state.renderedAt || null,
    hasAppRoot: !!app,
    appHasContent: hasExistingAppContent(app),
    activeScreenCount: activeScreens.length,
    activeScreens: activeScreens.map((node) => node.id || node.getAttribute('data-screen') || node.className),
    checks: state.checks.slice(-20),
  };
}

function runMinimalAppShellCheck(reason) {
  const state = getState();
  const summary = summarizeMinimalAppShellRenderer();
  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    rendered: summary.rendered,
    appHasContent: summary.appHasContent,
    activeScreenCount: summary.activeScreenCount,
  });
  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }
  return summarizeMinimalAppShellRenderer();
}

window.ippoMinimalAppShellRendererSummary = summarizeMinimalAppShellRenderer;
window.ippoRunMinimalAppShellCheck = runMinimalAppShellCheck;

renderMinimalAppShell('boot-critical-first-render');

export {
  renderMinimalAppShell,
  summarizeMinimalAppShellRenderer,
  runMinimalAppShellCheck,
};
