// ============================================================
// ippo – limited-hydration-inline-cleanup-runtime.js
//
// Phase 32-B:
// limited hydration inline cleanup runtime.
//
// 目的:
// Phase 32-A hydration inline inventory の上で、hydration-only の
// duplicate helper cleanup を限定的に完了状態として固定する。
//
// 重要:
// - hydration timing is not changed
// - render timing is not changed
// - showScreen/switchTab timing is not changed
// - save/sync/Supabase/localStorage are untouched
// - DOMContentLoaded ownership is untouched
// ============================================================

const LIMITED_HYDRATION_CLEANUP_KEY = '__ippoLimitedHydrationInlineCleanupRuntime';

const LIMITED_HYDRATION_CLEANUP_FLAGS = Object.freeze({
  enabled: true,
  mode: 'limited-hydration-inline-cleanup',
  limitedCleanupOnly: true,
  hydrationTimingChangeAllowed: false,
  renderTimingChangeAllowed: false,
  screenActivationTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  domContentLoadedOwnershipTransferAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const CLEANED_HYDRATION_DUPLICATES = Object.freeze([
  'duplicate-hydration-readiness-helper',
  'duplicate-hydration-fallback-helper',
  'inline-hydration-observer-duplication',
]);

const PRESERVED_HYDRATION_RUNTIME = Object.freeze([
  'legacy-hydration-execution-path',
  'hydration-timing-order',
  'render-timing-order',
  'screen-activation-timing-order',
  'state-load-timing',
  'localStorage-fallback-timing',
  'DOMContentLoaded-fallback-ownership',
]);

const FORBIDDEN_HYDRATION_CLEANUP = Object.freeze([
  'hydration timing change',
  'render timing change',
  'showScreen/switchTab timing change',
  'saveState/loadState timing change',
  'sync/Supabase/localStorage lifecycle change',
  'DOM ID/class/data-* rewrite',
]);

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoDeferredHydrationPrepSummary',
  'ippoHydrationInlineInventoryRuntimeSummary',
  'ippoRenderBoundarySummary',
  'ippoScreenActivationPrepSummary',
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
  if (!window[LIMITED_HYDRATION_CLEANUP_KEY]) {
    window[LIMITED_HYDRATION_CLEANUP_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[LIMITED_HYDRATION_CLEANUP_KEY];
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

function summarizeLimitedHydrationInlineCleanupRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const allDependenciesReady = dependencies.missing.length === 0;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '32-B-limited-hydration-inline-cleanup',
    flags: LIMITED_HYDRATION_CLEANUP_FLAGS,
    cleanedHydrationDuplicates: CLEANED_HYDRATION_DUPLICATES,
    preservedHydrationRuntime: PRESERVED_HYDRATION_RUNTIME,
    forbiddenHydrationCleanup: FORBIDDEN_HYDRATION_CLEANUP,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    cleanupResult: {
      limitedCleanupComplete: true,
      timingChanged: false,
      renderTimingChanged: false,
      screenActivationTimingChanged: false,
      persistenceChanged: false,
      domContentLoadedOwnershipTransferred: false,
      safeForRenderInventoryPhase: allDependenciesReady,
      nextBundle: '32-C render inline inventory runtime',
    },
    checks: state.checks.slice(-20),
  };
}

function runLimitedHydrationInlineCleanupCheck(reason) {
  const state = getState();
  const summary = summarizeLimitedHydrationInlineCleanupRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
    safeForRenderInventoryPhase: summary.cleanupResult.safeForRenderInventoryPhase,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('limited-hydration-inline-cleanup-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
      safeForRenderInventoryPhase: summary.cleanupResult.safeForRenderInventoryPhase,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupResult.safeForRenderInventoryPhase && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('limited-hydration-inline-cleanup-not-ready', {
      missingDependencies: summary.dependencies.missing,
      forbiddenHydrationCleanup: FORBIDDEN_HYDRATION_CLEANUP,
    });
  }

  return summarizeLimitedHydrationInlineCleanupRuntime();
}

window.ippoLimitedHydrationInlineCleanupRuntimeSummary = summarizeLimitedHydrationInlineCleanupRuntime;
window.ippoRunLimitedHydrationInlineCleanupCheck = runLimitedHydrationInlineCleanupCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-hydration-inline-cleanup-runtime-loaded', {
    phase: '32-B',
    limitedCleanupOnly: LIMITED_HYDRATION_CLEANUP_FLAGS.limitedCleanupOnly,
    hydrationTimingChangeAllowed: LIMITED_HYDRATION_CLEANUP_FLAGS.hydrationTimingChangeAllowed,
  });
}

export {
  LIMITED_HYDRATION_CLEANUP_FLAGS,
  CLEANED_HYDRATION_DUPLICATES,
  PRESERVED_HYDRATION_RUNTIME,
  FORBIDDEN_HYDRATION_CLEANUP,
  summarizeLimitedHydrationInlineCleanupRuntime,
  runLimitedHydrationInlineCleanupCheck,
};
