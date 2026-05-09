// ============================================================
// ippo – hydration-inline-inventory-runtime.js
//
// Phase 32-A:
// hydration inline inventory runtime.
//
// 目的:
// app.html / legacy inline hydration runtime を実削減する前に、
// hydration-only の削除候補・維持候補・禁止領域を runtime graph に固定する。
//
// 重要:
// - inventory only
// - hydration timing is not changed
// - render timing is not changed
// - showScreen/switchTab timing is not changed
// - save/sync/Supabase/localStorage are untouched
// ============================================================

const HYDRATION_INLINE_INVENTORY_KEY = '__ippoHydrationInlineInventoryRuntime';

const HYDRATION_INLINE_INVENTORY_FLAGS = Object.freeze({
  enabled: false,
  mode: 'hydration-inline-inventory-only',
  hydrationRemovalAllowed: false,
  hydrationTimingChangeAllowed: false,
  renderTimingChangeAllowed: false,
  screenActivationTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const HYDRATION_INLINE_SCOPE = Object.freeze({
  inventoryCandidates: [
    {
      id: 'duplicate-hydration-readiness-helper',
      allowedForFutureCleanup: true,
      condition: 'only after hydration ownership runtime and fallback visibility are ready',
    },
    {
      id: 'duplicate-hydration-fallback-helper',
      allowedForFutureCleanup: true,
      condition: 'only if legacy hydration fallback remains visible',
    },
    {
      id: 'inline-hydration-observer-duplication',
      allowedForFutureCleanup: true,
      condition: 'only if module hydration observer exposes equivalent readiness',
    },
  ],
  preservedRuntime: [
    'legacy hydration execution path',
    'hydration timing order',
    'render timing order',
    'screen activation timing order',
    'state load timing',
    'localStorage fallback timing',
  ],
  forbiddenChanges: [
    'hydration timing change',
    'render timing change',
    'showScreen/switchTab timing change',
    'saveState/loadState timing change',
    'sync/Supabase/localStorage lifecycle change',
    'DOM ID/class/data-* rewrite',
  ],
});

const REQUIRED_HYDRATION_DEPENDENCIES = Object.freeze([
  'ippoDeferredHydrationPrepSummary',
  'ippoRenderBoundarySummary',
  'ippoScreenActivationPrepSummary',
  'ippoRuntimeOwnershipGraphSummary',
  'ippoFinalAppShellCleanupRuntimeSummary',
  'ippoLimitedStartupDuplicateHelperCleanupRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[HYDRATION_INLINE_INVENTORY_KEY]) {
    window[HYDRATION_INLINE_INVENTORY_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[HYDRATION_INLINE_INVENTORY_KEY];
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

  REQUIRED_HYDRATION_DEPENDENCIES.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    readiness[name] = !!summary && !summary.error;
  });

  return {
    summaries,
    readiness,
    missing: REQUIRED_HYDRATION_DEPENDENCIES.filter((name) => !readiness[name]),
  };
}

function summarizeHydrationReadiness(dependencies) {
  const hydrationPrep = dependencies.summaries.ippoDeferredHydrationPrepSummary;
  const renderBoundary = dependencies.summaries.ippoRenderBoundarySummary;
  const screenActivation = dependencies.summaries.ippoScreenActivationPrepSummary;
  const ownershipGraph = dependencies.summaries.ippoRuntimeOwnershipGraphSummary;
  const startupCleanup = dependencies.summaries.ippoLimitedStartupDuplicateHelperCleanupRuntimeSummary;

  return {
    hydrationPrepVisible: !!hydrationPrep && !hydrationPrep.error,
    renderBoundaryVisible: !!renderBoundary && !renderBoundary.error,
    screenActivationVisible: !!screenActivation && !screenActivation.error,
    ownershipGraphVisible: !!ownershipGraph && !ownershipGraph.error,
    startupCleanupVisible: !!startupCleanup && !startupCleanup.error,
    timingProtected: true,
    fallbackRequired: HYDRATION_INLINE_INVENTORY_FLAGS.fallbackRequired,
  };
}

function summarizeHydrationInlineInventoryRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const hydrationReadiness = summarizeHydrationReadiness(dependencies);

  const allDependenciesReady = dependencies.missing.length === 0;
  const safeForHydrationInlineCleanupPlanning =
    allDependenciesReady &&
    hydrationReadiness.hydrationPrepVisible &&
    hydrationReadiness.renderBoundaryVisible &&
    hydrationReadiness.screenActivationVisible &&
    hydrationReadiness.ownershipGraphVisible &&
    hydrationReadiness.startupCleanupVisible &&
    !HYDRATION_INLINE_INVENTORY_FLAGS.hydrationRemovalAllowed;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '32-A-hydration-inline-inventory',
    flags: HYDRATION_INLINE_INVENTORY_FLAGS,
    scope: HYDRATION_INLINE_SCOPE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    hydrationReadiness,
    cleanupPlanning: {
      inventoryOnly: true,
      safeForHydrationInlineCleanupPlanning,
      nextBundle: '32-B limited hydration inline cleanup',
    },
    checks: state.checks.slice(-20),
  };
}

function runHydrationInlineInventoryCheck(reason) {
  const state = getState();
  const summary = summarizeHydrationInlineInventoryRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    safeForHydrationInlineCleanupPlanning: summary.cleanupPlanning.safeForHydrationInlineCleanupPlanning,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('hydration-inline-inventory-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      safeForHydrationInlineCleanupPlanning: summary.cleanupPlanning.safeForHydrationInlineCleanupPlanning,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupPlanning.safeForHydrationInlineCleanupPlanning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('hydration-inline-inventory-not-ready', {
      missingDependencies: summary.dependencies.missing,
      forbiddenChanges: HYDRATION_INLINE_SCOPE.forbiddenChanges,
    });
  }

  return summarizeHydrationInlineInventoryRuntime();
}

window.ippoHydrationInlineInventoryRuntimeSummary = summarizeHydrationInlineInventoryRuntime;
window.ippoRunHydrationInlineInventoryCheck = runHydrationInlineInventoryCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('hydration-inline-inventory-runtime-loaded', {
    phase: '32-A',
    mode: HYDRATION_INLINE_INVENTORY_FLAGS.mode,
    hydrationRemovalAllowed: HYDRATION_INLINE_INVENTORY_FLAGS.hydrationRemovalAllowed,
  });
}

export {
  HYDRATION_INLINE_INVENTORY_FLAGS,
  HYDRATION_INLINE_SCOPE,
  summarizeHydrationInlineInventoryRuntime,
  runHydrationInlineInventoryCheck,
};
