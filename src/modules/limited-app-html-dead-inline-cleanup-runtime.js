// ============================================================
// ippo – limited-app-html-dead-inline-cleanup-runtime.js
//
// Phase 35-A2:
// limited app.html dead inline cleanup runtime.
//
// 目的:
// dead inline startup/hydration/render runtime を cleanup 済み状態として
// 固定し、thin shell boundary を runtime graph に定着させる。
//
// 重要:
// - minimal shell adoption is NOT executed here
// - fallback path is preserved
// - module script ownership is preserved
// - save/render/hydration/sync timing is unchanged
// ============================================================

const LIMITED_APP_HTML_CLEANUP_KEY = '__ippoLimitedAppHtmlDeadInlineCleanupRuntime';

const LIMITED_APP_HTML_CLEANUP_FLAGS = Object.freeze({
  enabled: true,
  mode: 'limited-app-html-dead-inline-cleanup',
  limitedCleanupOnly: true,
  minimalShellAdoptionAllowed: false,
  fallbackRemovalAllowed: false,
  moduleScriptOwnershipChangeAllowed: false,
  renderTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  saveTimingChangeAllowed: false,
  syncTimingChangeAllowed: false,
  rollbackRequired: true,
  fallbackRequired: true,
});

const CLEANED_APP_HTML_INLINE_RUNTIME = Object.freeze([
  'dead-inline-startup-runtime',
  'dead-inline-hydration-runtime',
  'dead-inline-render-runtime',
  'unused-legacy-bridge-runtime',
]);

const PRESERVED_THIN_SHELL_RUNTIME = Object.freeze([
  'root DOM shell',
  'module script /src/main.js',
  'noscript fallback',
  'legacy fallback visibility',
  'boot error/warning visibility',
  'window compatibility bridge',
  'save/sync/persistence order',
]);

const FORBIDDEN_APP_HTML_CLEANUP = Object.freeze([
  'minimal shell adoption in this phase',
  'fallback path removal',
  'module script ownership rewrite',
  'render timing change',
  'hydration timing change',
  'saveState/loadState timing change',
  'sync/Supabase/localStorage lifecycle change',
  'DOM ID/class/data-* rewrite',
]);

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoFinalShellSlimmingRuntimeSummary',
  'ippoServiceBoundaryStabilizationRuntimeSummary',
  'ippoStateOwnershipStabilizationRuntimeSummary',
  'ippoLimitedLegacyWindowBridgeCleanupRuntimeSummary',
  'ippoLimitedRenderInlineCleanupRuntimeSummary',
  'ippoLimitedHydrationInlineCleanupRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[LIMITED_APP_HTML_CLEANUP_KEY]) {
    window[LIMITED_APP_HTML_CLEANUP_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[LIMITED_APP_HTML_CLEANUP_KEY];
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

function inspectThinShellVisibility() {
  return {
    hasAppRoot: !!document.getElementById('app'),
    hasMainApp: !!document.getElementById('main-app'),
    moduleScriptVisible: !!document.querySelector('script[type="module"][src*="/src/main.js"]'),
    noScriptVisible: !!document.querySelector('noscript'),
    bootErrorVisible: typeof window.ippoMarkBootError === 'function',
    bootWarningVisible: typeof window.ippoMarkBootWarning === 'function',
  };
}

function summarizeLimitedAppHtmlDeadInlineCleanupRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const shell = inspectThinShellVisibility();
  const allDependenciesReady = dependencies.missing.length === 0;

  const shellVisible =
    (shell.hasAppRoot || shell.hasMainApp) &&
    shell.moduleScriptVisible &&
    shell.noScriptVisible;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '35-A2-limited-app-html-dead-inline-cleanup',
    flags: LIMITED_APP_HTML_CLEANUP_FLAGS,
    cleanedAppHtmlInlineRuntime: CLEANED_APP_HTML_INLINE_RUNTIME,
    preservedThinShellRuntime: PRESERVED_THIN_SHELL_RUNTIME,
    forbiddenAppHtmlCleanup: FORBIDDEN_APP_HTML_CLEANUP,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    shell,
    cleanupResult: {
      limitedCleanupComplete: true,
      deadInlineCleanupExecuted: true,
      minimalShellAdoptionExecuted: false,
      fallbackRemoved: false,
      moduleScriptOwnershipChanged: false,
      timingChanged: false,
      thinShellBoundaryEstablished:
        allDependenciesReady && shellVisible,
      nextBundle: '35-B minimal shell adoption',
    },
    checks: state.checks.slice(-20),
  };
}

function runLimitedAppHtmlDeadInlineCleanupCheck(reason) {
  const state = getState();
  const summary = summarizeLimitedAppHtmlDeadInlineCleanupRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    thinShellBoundaryEstablished: summary.cleanupResult.thinShellBoundaryEstablished,
    limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('limited-app-html-dead-inline-cleanup-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      thinShellBoundaryEstablished: summary.cleanupResult.thinShellBoundaryEstablished,
      limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupResult.thinShellBoundaryEstablished && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('limited-app-html-dead-inline-cleanup-not-ready', {
      missingDependencies: summary.dependencies.missing,
      shell: summary.shell,
      forbiddenAppHtmlCleanup: FORBIDDEN_APP_HTML_CLEANUP,
    });
  }

  return summarizeLimitedAppHtmlDeadInlineCleanupRuntime();
}

window.ippoLimitedAppHtmlDeadInlineCleanupRuntimeSummary = summarizeLimitedAppHtmlDeadInlineCleanupRuntime;
window.ippoRunLimitedAppHtmlDeadInlineCleanupCheck = runLimitedAppHtmlDeadInlineCleanupCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-app-html-dead-inline-cleanup-runtime-loaded', {
    phase: '35-A2',
    limitedCleanupOnly: LIMITED_APP_HTML_CLEANUP_FLAGS.limitedCleanupOnly,
    minimalShellAdoptionAllowed: LIMITED_APP_HTML_CLEANUP_FLAGS.minimalShellAdoptionAllowed,
  });
}

export {
  LIMITED_APP_HTML_CLEANUP_FLAGS,
  CLEANED_APP_HTML_INLINE_RUNTIME,
  PRESERVED_THIN_SHELL_RUNTIME,
  FORBIDDEN_APP_HTML_CLEANUP,
  summarizeLimitedAppHtmlDeadInlineCleanupRuntime,
  runLimitedAppHtmlDeadInlineCleanupCheck,
};
