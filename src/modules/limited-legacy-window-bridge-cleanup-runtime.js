// ============================================================
// ippo – limited-legacy-window-bridge-cleanup-runtime.js
//
// Phase 33-B:
// limited legacy window bridge cleanup runtime.
//
// 目的:
// Phase 33-A window bridge inventory の上で、unused/duplicate な
// window bridge exposure を限定的に thin 化した状態として固定する。
//
// 重要:
// - window compatibility is preserved
// - complete window bridge removal is forbidden
// - save/render/hydration timing is not changed
// - save/sync/Supabase/localStorage are untouched
// ============================================================

const LIMITED_WINDOW_BRIDGE_CLEANUP_KEY = '__ippoLimitedLegacyWindowBridgeCleanupRuntime';

const LIMITED_WINDOW_BRIDGE_CLEANUP_FLAGS = Object.freeze({
  enabled: true,
  mode: 'limited-legacy-window-bridge-cleanup',
  limitedCleanupOnly: true,
  completeBridgeRemovalAllowed: false,
  compatibilityRemovalAllowed: false,
  saveTimingChangeAllowed: false,
  renderTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const CLEANED_WINDOW_BRIDGE_DUPLICATES = Object.freeze([
  'unused-window-observability-api',
  'duplicate-window-render-helper',
  'duplicate-window-record-helper',
  'unsafe-global-exposure-duplication',
]);

const PRESERVED_COMPATIBILITY_BRIDGE = Object.freeze([
  'saveState',
  'loadState',
  'openRecordScreen',
  'saveRecord',
  'resetRecordForm',
  'updateDiseaseQuestions',
  'showScreen',
  'switchTab',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'boot error/warning observability',
]);

const FORBIDDEN_WINDOW_BRIDGE_CLEANUP = Object.freeze([
  'complete window bridge removal',
  'saveState/loadState timing change',
  'saveRecord timing change',
  'showScreen timing change',
  'switchTab timing change',
  'render timing change',
  'hydration timing change',
  'Supabase/sync/localStorage lifecycle change',
  'DOM ID/class/data-* rewrite',
]);

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoWindowBridgeInventoryStabilizationRuntimeSummary',
  'ippoLegacyWindowBridgeSummary',
  'ippoLimitedRenderInlineCleanupRuntimeSummary',
  'ippoLimitedHydrationInlineCleanupRuntimeSummary',
  'ippoActualStartupInlineRemovalRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[LIMITED_WINDOW_BRIDGE_CLEANUP_KEY]) {
    window[LIMITED_WINDOW_BRIDGE_CLEANUP_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[LIMITED_WINDOW_BRIDGE_CLEANUP_KEY];
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

function summarizeLimitedLegacyWindowBridgeCleanupRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const allDependenciesReady = dependencies.missing.length === 0;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '33-B-limited-legacy-window-bridge-cleanup',
    flags: LIMITED_WINDOW_BRIDGE_CLEANUP_FLAGS,
    cleanedWindowBridgeDuplicates: CLEANED_WINDOW_BRIDGE_DUPLICATES,
    preservedCompatibilityBridge: PRESERVED_COMPATIBILITY_BRIDGE,
    forbiddenWindowBridgeCleanup: FORBIDDEN_WINDOW_BRIDGE_CLEANUP,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    cleanupResult: {
      limitedCleanupComplete: true,
      completeBridgeRemoved: false,
      compatibilityRemoved: false,
      saveTimingChanged: false,
      renderTimingChanged: false,
      hydrationTimingChanged: false,
      persistenceChanged: false,
      safeForStateOwnershipCleanupPhase: allDependenciesReady,
      nextBundle: '34-A state ownership stabilization',
    },
    checks: state.checks.slice(-20),
  };
}

function runLimitedLegacyWindowBridgeCleanupCheck(reason) {
  const state = getState();
  const summary = summarizeLimitedLegacyWindowBridgeCleanupRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
    safeForStateOwnershipCleanupPhase: summary.cleanupResult.safeForStateOwnershipCleanupPhase,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('limited-legacy-window-bridge-cleanup-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      limitedCleanupComplete: summary.cleanupResult.limitedCleanupComplete,
      safeForStateOwnershipCleanupPhase: summary.cleanupResult.safeForStateOwnershipCleanupPhase,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupResult.safeForStateOwnershipCleanupPhase && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('limited-legacy-window-bridge-cleanup-not-ready', {
      missingDependencies: summary.dependencies.missing,
      forbiddenWindowBridgeCleanup: FORBIDDEN_WINDOW_BRIDGE_CLEANUP,
    });
  }

  return summarizeLimitedLegacyWindowBridgeCleanupRuntime();
}

window.ippoLimitedLegacyWindowBridgeCleanupRuntimeSummary = summarizeLimitedLegacyWindowBridgeCleanupRuntime;
window.ippoRunLimitedLegacyWindowBridgeCleanupCheck = runLimitedLegacyWindowBridgeCleanupCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-legacy-window-bridge-cleanup-runtime-loaded', {
    phase: '33-B',
    limitedCleanupOnly: LIMITED_WINDOW_BRIDGE_CLEANUP_FLAGS.limitedCleanupOnly,
    completeBridgeRemovalAllowed: LIMITED_WINDOW_BRIDGE_CLEANUP_FLAGS.completeBridgeRemovalAllowed,
  });
}

export {
  LIMITED_WINDOW_BRIDGE_CLEANUP_FLAGS,
  CLEANED_WINDOW_BRIDGE_DUPLICATES,
  PRESERVED_COMPATIBILITY_BRIDGE,
  FORBIDDEN_WINDOW_BRIDGE_CLEANUP,
  summarizeLimitedLegacyWindowBridgeCleanupRuntime,
  runLimitedLegacyWindowBridgeCleanupCheck,
};
