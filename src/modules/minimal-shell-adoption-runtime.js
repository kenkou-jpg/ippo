// ============================================================
// ippo – minimal-shell-adoption-runtime.js
//
// Phase 35-B:
// minimal shell adoption runtime.
//
// 目的:
// app.html minimal shell architecture への到達状態を runtime graph に固定する。
//
// 最終構造:
// app.html
//   ↓
// minimal shell
//   ↓
// /src/main.js
//   ↓
// bootstrap runtime
//   ↓
// modules/*
//   ↓
// store/*
//   ↓
// services/*
//
// 重要:
// - fallback visibility is preserved
// - compatibility bridge is preserved
// - save/render/hydration/sync timing is unchanged
// ============================================================

const MINIMAL_SHELL_ADOPTION_KEY = '__ippoMinimalShellAdoptionRuntime';

const MINIMAL_SHELL_ADOPTION_FLAGS = Object.freeze({
  enabled: true,
  mode: 'minimal-shell-adoption',
  minimalShellEstablished: true,
  fallbackVisibilityPreserved: true,
  compatibilityBridgePreserved: true,
  renderTimingChanged: false,
  hydrationTimingChanged: false,
  saveTimingChanged: false,
  syncTimingChanged: false,
  rollbackRequired: true,
});

const MINIMAL_SHELL_STRUCTURE = Object.freeze({
  shell: [
    'root DOM shell',
    'module script /src/main.js',
    'noscript fallback',
  ],
  bootstrap: [
    'startup ownership runtime',
    'hydration ownership runtime',
    'render ownership runtime',
    'screen activation runtime',
  ],
  modules: [
    'modules/*',
    'store/*',
    'services/*',
  ],
  preservedCompatibility: [
    'window compatibility bridge',
    'boot error/warning visibility',
    'save/sync/persistence order',
  ],
});

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoLimitedAppHtmlDeadInlineCleanupRuntimeSummary',
  'ippoFinalShellSlimmingRuntimeSummary',
  'ippoServiceBoundaryStabilizationRuntimeSummary',
  'ippoStateOwnershipStabilizationRuntimeSummary',
  'ippoLimitedLegacyWindowBridgeCleanupRuntimeSummary',
  'ippoRuntimeOwnershipGraphSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[MINIMAL_SHELL_ADOPTION_KEY]) {
    window[MINIMAL_SHELL_ADOPTION_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[MINIMAL_SHELL_ADOPTION_KEY];
}

function safeCall(name) {
  try {
    if (typeof window[name] === 'function') {
      return window[name]();
    }
  } catch (error) {
    return {
      error: true,
      message: error && error.message ? error.message : String(error),
    };
  }

  return null;
}

function summarizeDependencies() {
  const summaries = {};
  const readiness = {};

  REQUIRED_DEPENDENCIES.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    readiness[name] = !!summary && !summary.error;
  });

  return {
    summaries,
    readiness,
    missing: REQUIRED_DEPENDENCIES.filter((name) => !readiness[name]),
  };
}

function inspectMinimalShell() {
  return {
    hasAppRoot: !!document.getElementById('app'),
    moduleScriptVisible: !!document.querySelector('script[type="module"][src*="/src/main.js"]'),
    noScriptVisible: !!document.querySelector('noscript'),
    compatibilityBridgeVisible: typeof window.showScreen === 'function' && typeof window.switchTab === 'function',
    saveCompatibilityVisible: typeof window.saveState === 'function' && typeof window.loadState === 'function',
    runtimeOwnershipVisible: typeof window.ippoRuntimeOwnershipGraphSummary === 'function',
  };
}

function summarizeMinimalShellAdoptionRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const shell = inspectMinimalShell();
  const allDependenciesReady = dependencies.missing.length === 0;

  const minimalShellVisible =
    shell.hasAppRoot &&
    shell.moduleScriptVisible &&
    shell.noScriptVisible;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '35-B-minimal-shell-adoption',
    flags: MINIMAL_SHELL_ADOPTION_FLAGS,
    structure: MINIMAL_SHELL_STRUCTURE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    shell,
    adoption: {
      minimalShellVisible,
      compatibilityBridgeVisible: shell.compatibilityBridgeVisible,
      saveCompatibilityVisible: shell.saveCompatibilityVisible,
      runtimeOwnershipVisible: shell.runtimeOwnershipVisible,
      architectureCompleted:
        allDependenciesReady &&
        minimalShellVisible &&
        shell.compatibilityBridgeVisible &&
        shell.saveCompatibilityVisible,
    },
    checks: state.checks.slice(-20),
  };
}

function runMinimalShellAdoptionCheck(reason) {
  const state = getState();
  const summary = summarizeMinimalShellAdoptionRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    architectureCompleted: summary.adoption.architectureCompleted,
    minimalShellVisible: summary.adoption.minimalShellVisible,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('minimal-shell-adoption-check', {
      reason: reason || 'manual',
      architectureCompleted: summary.adoption.architectureCompleted,
      minimalShellVisible: summary.adoption.minimalShellVisible,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.adoption.architectureCompleted && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('minimal-shell-adoption-not-ready', {
      missingDependencies: summary.dependencies.missing,
      shell: summary.shell,
    });
  }

  return summarizeMinimalShellAdoptionRuntime();
}

window.ippoMinimalShellAdoptionRuntimeSummary = summarizeMinimalShellAdoptionRuntime;
window.ippoRunMinimalShellAdoptionCheck = runMinimalShellAdoptionCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('minimal-shell-adoption-runtime-loaded', {
    phase: '35-B',
    minimalShellEstablished: MINIMAL_SHELL_ADOPTION_FLAGS.minimalShellEstablished,
  });
}

export {
  MINIMAL_SHELL_ADOPTION_FLAGS,
  MINIMAL_SHELL_STRUCTURE,
  summarizeMinimalShellAdoptionRuntime,
  runMinimalShellAdoptionCheck,
};
