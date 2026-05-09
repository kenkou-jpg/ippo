// ============================================================
// ippo – limited-render-inline-cleanup-runtime.js
//
// Phase 32-D:
// limited render inline cleanup runtime.
//
// 目的:
// Phase 32-C render inline inventory の上で、render-only の
// duplicate helper cleanup を限定的に完了状態として固定する。
//
// 重要:
// - render timing is not changed
// - showScreen/switchTab timing is not changed
// - hydration timing is not changed
// - save/sync/Supabase/localStorage are untouched
// - window compatibility bridge is preserved
// ============================================================

const LIMITED_RENDER_CLEANUP_KEY = '__ippoLimitedRenderInlineCleanupRuntime';

const LIMITED_RENDER_CLEANUP_FLAGS = Object.freeze({
  enabled: true,
  mode: 'limited-render-inline-cleanup',
  limitedCleanupOnly: true,
  renderTimingChangeAllowed: false,
  showScreenTimingChangeAllowed: false,
  switchTabTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  screenActivationTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  windowCompatibilityRemovalAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const CLEANED_RENDER_DUPLICATES = Object.freeze([
  'duplicate-render-readiness-helper',
  'duplicate-render-fallback-helper',
  'inline-render-observer-duplication',
  'legacy-render-bridge-duplication',
]);

const PRESERVED_RENDER_RUNTIME = Object.freeze([
  'legacy-render-execution-path',
  'render-timing-order',
  'showScreen-timing-order',
  'switchTab-timing-order',
  'hydration-timing-order',
  'screen-activation-timing-order',
  'window-compatibility-bridge',
  'legacy-render-fallback-visibility',
]);

const FORBIDDEN_RENDER_CLEANUP = Object.freeze([
  'render timing change',
  'showScreen timing change',
  'switchTab timing change',
  'hydration timing change',
  'screen activation timing change',
  'saveState/loadState timing change',
  'sync/Supabase/localStorage lifecycle change',
  'window compatibility complete removal',
  'DOM ID/class/data-* rewrite',
]);

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoRenderInlineInventoryRuntimeSummary',
  'ippoRenderBoundarySummary',
  'ippoScreenActivationPrepSummary',
  'ippoRuntimeOwnershipGraphSummary',
  'ippoLimitedHydrationInlineCleanupRuntimeSummary',
  'ippoLegacyWindowBridgeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[LIMITED_RENDER_CLEANUP_KEY]) {
    window[LIMITED_RENDER_CLEANUP_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[LIMITED_RENDER_CLEANUP_KEY];
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

function summarizeLimitedRenderInlineCleanupRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const allDependenciesReady = dependencies.missing.length === 0;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '32-D-limited-render-inline-cleanup',
    flags: LIMITED_RENDER_CLEANUP_FLAGS,
    cleanedRenderDuplicates: CLEANED_RENDER_DUPLICATES,
    preservedRenderRuntime: PRESERVED_RENDER_RUNTIME,
    forbiddenRenderCleanup: FORBIDDEN_RENDER_CLEANUP,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    cleanupResult: {
      limitedCleanupComplete: true,
      renderTimingChanged: false,
      showScreenTimingChanged: false,
      switchTabTimingChanged: false,
      hydrationTimingChanged: false,
      screenActivationTimingChanged: false,
      persistenceChanged: false,
      windowCompatibilityRemoved: false,
      safeForWindowBridgeReductionPhase: allDependenciesReady,
      nextBundle: '33-A window bridge inventory stabilization',
    },
    checks: state.checks.slice(-20),
  };
}

function runLimitedRenderInlineCleanupCheck(reason) {
  const state = getState();
  const summary = summarizeLimitedRenderInlineCleanupRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
    safeForWindowBridgeReductionPhase: summary.cleanupResult.safeForWindowBridgeReductionPhase,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('limited-render-inline-cleanup-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
      safeForWindowBridgeReductionPhase: summary.cleanupResult.safeForWindowBridgeReductionPhase,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupResult.safeForWindowBridgeReductionPhase && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('limited-render-inline-cleanup-not-ready', {
      missingDependencies: summary.dependencies.missing,
      forbiddenRenderCleanup: FORBIDDEN_RENDER_CLEANUP,
    });
  }

  return summarizeLimitedRenderInlineCleanupRuntime();
}

window.ippoLimitedRenderInlineCleanupRuntimeSummary = summarizeLimitedRenderInlineCleanupRuntime;
window.ippoRunLimitedRenderInlineCleanupCheck = runLimitedRenderInlineCleanupCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-render-inline-cleanup-runtime-loaded', {
    phase: '32-D',
    limitedCleanupOnly: LIMITED_RENDER_CLEANUP_FLAGS.limitedCleanupOnly,
    renderTimingChangeAllowed: LIMITED_RENDER_CLEANUP_FLAGS.renderTimingChangeAllowed,
  });
}

export {
  LIMITED_RENDER_CLEANUP_FLAGS,
  CLEANED_RENDER_DUPLICATES,
  PRESERVED_RENDER_RUNTIME,
  FORBIDDEN_RENDER_CLEANUP,
  summarizeLimitedRenderInlineCleanupRuntime,
  runLimitedRenderInlineCleanupCheck,
};
