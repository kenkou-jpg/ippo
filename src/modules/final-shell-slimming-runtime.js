// ============================================================
// ippo – final-shell-slimming-runtime.js
//
// Phase 35-A:
// final shell slimming runtime.
//
// 目的:
// app.html の dead inline runtime cleanup / unused bridge cleanup / shell thin化を
// 実行する前に、削除可能領域・維持必須 fallback・禁止領域を runtime graph に固定する。
//
// 重要:
// - minimal shell adoption is not executed here
// - fallback path is preserved
// - module script ownership is preserved
// - save/render/hydration/sync timing is not changed
// ============================================================

const FINAL_SHELL_SLIMMING_KEY = '__ippoFinalShellSlimmingRuntime';

const FINAL_SHELL_SLIMMING_FLAGS = Object.freeze({
  enabled: false,
  mode: 'final-shell-slimming-inventory',
  appHtmlInlineRemovalAllowed: false,
  minimalShellAdoptionAllowed: false,
  fallbackRemovalAllowed: false,
  moduleScriptOwnershipChangeAllowed: false,
  renderTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  saveTimingChangeAllowed: false,
  syncTimingChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const FINAL_SHELL_SCOPE = Object.freeze({
  slimmingCandidates: [
    {
      id: 'dead-inline-startup-runtime',
      allowedForFutureCleanup: true,
      condition: 'only after startup cleanup runtime and fallback visibility are ready',
    },
    {
      id: 'dead-inline-hydration-runtime',
      allowedForFutureCleanup: true,
      condition: 'only after hydration cleanup runtime confirms timing unchanged',
    },
    {
      id: 'dead-inline-render-runtime',
      allowedForFutureCleanup: true,
      condition: 'only after render cleanup runtime confirms showScreen/switchTab timing unchanged',
    },
    {
      id: 'unused-legacy-bridge-runtime',
      allowedForFutureCleanup: true,
      condition: 'only after limited window bridge cleanup preserves compatibility APIs',
    },
  ],
  preservedShellRuntime: [
    'root DOM shell',
    'module script to /src/main.js',
    'noscript fallback',
    'legacy fallback visibility',
    'boot error/warning visibility',
    'window compatibility bridge',
    'save/sync/persistence order',
  ],
  forbiddenChanges: [
    'minimal shell adoption in this phase',
    'fallback path removal',
    'module script ownership change',
    'DOM ID/class/data-* rewrite',
    'render timing change',
    'hydration timing change',
    'saveState/loadState timing change',
    'sync/Supabase/localStorage lifecycle change',
  ],
});

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoActualStartupInlineRemovalRuntimeSummary',
  'ippoLimitedHydrationInlineCleanupRuntimeSummary',
  'ippoLimitedRenderInlineCleanupRuntimeSummary',
  'ippoLimitedLegacyWindowBridgeCleanupRuntimeSummary',
  'ippoStateOwnershipStabilizationRuntimeSummary',
  'ippoServiceBoundaryStabilizationRuntimeSummary',
  'ippoFinalAppShellCleanupRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[FINAL_SHELL_SLIMMING_KEY]) {
    window[FINAL_SHELL_SLIMMING_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[FINAL_SHELL_SLIMMING_KEY];
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

function inspectShellReadiness() {
  return {
    hasAppRoot: !!document.getElementById('app'),
    hasMainApp: !!document.getElementById('main-app'),
    moduleScriptVisible: !!document.querySelector('script[type="module"][src*="/src/main.js"]'),
    bootErrorVisible: typeof window.ippoMarkBootError === 'function',
    bootWarningVisible: typeof window.ippoMarkBootWarning === 'function',
    viteReadyMarkerVisible: typeof window.ippoMarkViteReady === 'function',
  };
}

function summarizeFinalShellSlimmingRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const shell = inspectShellReadiness();
  const allDependenciesReady = dependencies.missing.length === 0;

  const shellVisibilityReady =
    (shell.hasAppRoot || shell.hasMainApp) &&
    shell.moduleScriptVisible &&
    shell.bootErrorVisible &&
    shell.bootWarningVisible;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '35-A-final-shell-slimming',
    flags: FINAL_SHELL_SLIMMING_FLAGS,
    scope: FINAL_SHELL_SCOPE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    shell,
    slimming: {
      inventoryOnly: true,
      shellVisibilityReady,
      deadInlineCleanupExecuted: false,
      minimalShellAdoptionExecuted: false,
      fallbackRemoved: false,
      timingChanged: false,
      safeForLimitedAppHtmlCleanup:
        allDependenciesReady && shellVisibilityReady && !FINAL_SHELL_SLIMMING_FLAGS.appHtmlInlineRemovalAllowed,
      nextBundle: '35-A2 limited app.html dead inline cleanup',
    },
    checks: state.checks.slice(-20),
  };
}

function runFinalShellSlimmingCheck(reason) {
  const state = getState();
  const summary = summarizeFinalShellSlimmingRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    shellVisibilityReady: summary.slimming.shellVisibilityReady,
    safeForLimitedAppHtmlCleanup: summary.slimming.safeForLimitedAppHtmlCleanup,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('final-shell-slimming-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      shellVisibilityReady: summary.slimming.shellVisibilityReady,
      safeForLimitedAppHtmlCleanup: summary.slimming.safeForLimitedAppHtmlCleanup,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.slimming.safeForLimitedAppHtmlCleanup && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('final-shell-slimming-not-ready', {
      missingDependencies: summary.dependencies.missing,
      shell: summary.shell,
      forbiddenChanges: FINAL_SHELL_SCOPE.forbiddenChanges,
    });
  }

  return summarizeFinalShellSlimmingRuntime();
}

window.ippoFinalShellSlimmingRuntimeSummary = summarizeFinalShellSlimmingRuntime;
window.ippoRunFinalShellSlimmingCheck = runFinalShellSlimmingCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('final-shell-slimming-runtime-loaded', {
    phase: '35-A',
    mode: FINAL_SHELL_SLIMMING_FLAGS.mode,
    appHtmlInlineRemovalAllowed: FINAL_SHELL_SLIMMING_FLAGS.appHtmlInlineRemovalAllowed,
  });
}

export {
  FINAL_SHELL_SLIMMING_FLAGS,
  FINAL_SHELL_SCOPE,
  summarizeFinalShellSlimmingRuntime,
  runFinalShellSlimmingCheck,
};
