// ============================================================
// ippo – bootstrap-shell.js
//
// app.html inline runtime から Vite bootstrap shell へ移行するための
// read-only preparation layer。
//
// 重要:
// - 既存 init() は呼び替えない
// - 既存 hydration は変更しない
// - 既存 save / persistence 経路は変更しない
// - 現時点では boundary / readiness / sequencing の可視化のみ
// ============================================================

const BOOTSTRAP_SHELL_KEY = '__ippoBootstrapShell';

const BOOTSTRAP_DOM_ROOTS = [
  'app',
  'screen-welcome',
  'main-app',
  'screen-home',
  'screen-calendar',
  'screen-insights',
  'screen-record',
  'screen-settings',
];

const BOOTSTRAP_LEGACY_ENTRYPOINTS = [
  'init',
  'showScreen',
  'switchTab',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'openRecordScreen',
  'saveRecord',
  'saveState',
  'loadState',
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getShellState() {
  if (!window[BOOTSTRAP_SHELL_KEY]) {
    window[BOOTSTRAP_SHELL_KEY] = {
      loadedAt: nowIso(),
      phase: 'preparation-only',
      ownsInit: false,
      ownsHydration: false,
      ownsPersistence: false,
      checks: [],
    };
  }
  return window[BOOTSTRAP_SHELL_KEY];
}

function inspectDomRoots() {
  const roots = {};
  BOOTSTRAP_DOM_ROOTS.forEach((id) => {
    roots[id] = !!document.getElementById(id);
  });
  return roots;
}

function inspectLegacyEntrypoints() {
  const entrypoints = {};
  BOOTSTRAP_LEGACY_ENTRYPOINTS.forEach((name) => {
    entrypoints[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });
  return entrypoints;
}

function summarizeBootstrapShell() {
  const state = getShellState();
  const domRoots = inspectDomRoots();
  const legacyEntrypoints = inspectLegacyEntrypoints();
  const missingDomRoots = Object.keys(domRoots).filter((key) => !domRoots[key]);
  const missingLegacyEntrypoints = Object.keys(legacyEntrypoints).filter((key) => !legacyEntrypoints[key].exists);

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: state.phase,
    ownership: {
      init: !!state.ownsInit,
      hydration: !!state.ownsHydration,
      persistence: !!state.ownsPersistence,
    },
    viteReady: !!window.__ippoViteReady,
    bootReady: typeof window.ippoBootSummary === 'function',
    startupVerifyReady: typeof window.ippoStartupVerifySummary === 'function',
    domRoots,
    missingDomRoots,
    legacyEntrypoints,
    missingLegacyEntrypoints,
    safeForNextBootstrapExtraction: missingDomRoots.length === 0 && missingLegacyEntrypoints.length === 0,
    checks: state.checks.slice(-20),
  };
}

function runBootstrapShellCheck(reason) {
  const state = getShellState();
  const summary = summarizeBootstrapShell();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForNextBootstrapExtraction: summary.safeForNextBootstrapExtraction,
    missingDomRoots: summary.missingDomRoots,
    missingLegacyEntrypoints: summary.missingLegacyEntrypoints,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('bootstrap-shell-check', {
      reason: reason || 'manual',
      safeForNextBootstrapExtraction: summary.safeForNextBootstrapExtraction,
      missingDomRootCount: summary.missingDomRoots.length,
      missingLegacyEntrypointCount: summary.missingLegacyEntrypoints.length,
    });
  }

  if (!summary.safeForNextBootstrapExtraction && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('bootstrap-shell-not-ready-for-extraction', {
      missingDomRoots: summary.missingDomRoots,
      missingLegacyEntrypoints: summary.missingLegacyEntrypoints,
    });
  }

  return summarizeBootstrapShell();
}

window.ippoBootstrapShellSummary = summarizeBootstrapShell;
window.ippoRunBootstrapShellCheck = runBootstrapShellCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => runBootstrapShellCheck('dom-content-loaded'), { once: true });
} else {
  window.setTimeout(() => runBootstrapShellCheck('module-loaded-after-dom'), 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('bootstrap-shell-module-loaded');
}

export {
  BOOTSTRAP_DOM_ROOTS,
  BOOTSTRAP_LEGACY_ENTRYPOINTS,
  summarizeBootstrapShell,
  runBootstrapShellCheck,
};
