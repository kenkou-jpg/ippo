// ============================================================
// ippo – render-inline-inventory-runtime.js
//
// Phase 32-C:
// render inline inventory runtime.
//
// 目的:
// app.html / legacy inline render runtime を実削減する前に、
// render-only の削除候補・維持候補・禁止領域を runtime graph に固定する。
//
// 重要:
// - inventory only
// - render timing is not changed
// - showScreen/switchTab timing is not changed
// - hydration timing is not changed
// - save/sync/Supabase/localStorage are untouched
// ============================================================

const RENDER_INLINE_INVENTORY_KEY = '__ippoRenderInlineInventoryRuntime';

const RENDER_INLINE_INVENTORY_FLAGS = Object.freeze({
  enabled: false,
  mode: 'render-inline-inventory-only',
  renderRemovalAllowed: false,
  renderTimingChangeAllowed: false,
  showScreenTimingChangeAllowed: false,
  switchTabTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const RENDER_INLINE_SCOPE = Object.freeze({
  inventoryCandidates: [
    {
      id: 'duplicate-render-readiness-helper',
      allowedForFutureCleanup: true,
      condition: 'only after render boundary and screen activation boundary are ready',
    },
    {
      id: 'duplicate-render-fallback-helper',
      allowedForFutureCleanup: true,
      condition: 'only if legacy render fallback remains visible',
    },
    {
      id: 'inline-render-observer-duplication',
      allowedForFutureCleanup: true,
      condition: 'only if module render observer exposes equivalent readiness',
    },
    {
      id: 'legacy-render-bridge-duplication',
      allowedForFutureCleanup: true,
      condition: 'only if window compatibility bridge remains intact',
    },
  ],
  preservedRuntime: [
    'legacy render execution path',
    'render timing order',
    'showScreen timing order',
    'switchTab timing order',
    'hydration timing order',
    'screen activation timing order',
    'window compatibility bridge',
  ],
  forbiddenChanges: [
    'render timing change',
    'showScreen timing change',
    'switchTab timing change',
    'hydration timing change',
    'screen activation timing change',
    'saveState/loadState timing change',
    'sync/Supabase/localStorage lifecycle change',
    'DOM ID/class/data-* rewrite',
  ],
});

const REQUIRED_RENDER_DEPENDENCIES = Object.freeze([
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
  if (!window[RENDER_INLINE_INVENTORY_KEY]) {
    window[RENDER_INLINE_INVENTORY_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[RENDER_INLINE_INVENTORY_KEY];
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

  REQUIRED_RENDER_DEPENDENCIES.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    readiness[name] = !!summary && !summary.error;
  });

  return {
    summaries,
    readiness,
    missing: REQUIRED_RENDER_DEPENDENCIES.filter((name) => !readiness[name]),
  };
}

function summarizeRenderReadiness(dependencies) {
  const renderBoundary = dependencies.summaries.ippoRenderBoundarySummary;
  const screenActivation = dependencies.summaries.ippoScreenActivationPrepSummary;
  const ownershipGraph = dependencies.summaries.ippoRuntimeOwnershipGraphSummary;
  const hydrationCleanup = dependencies.summaries.ippoLimitedHydrationInlineCleanupRuntimeSummary;
  const bridge = dependencies.summaries.ippoLegacyWindowBridgeSummary;

  return {
    renderBoundaryVisible: !!renderBoundary && !renderBoundary.error,
    screenActivationVisible: !!screenActivation && !screenActivation.error,
    ownershipGraphVisible: !!ownershipGraph && !ownershipGraph.error,
    hydrationCleanupVisible: !!hydrationCleanup && !hydrationCleanup.error,
    legacyBridgeVisible: !!bridge && !bridge.error,
    timingProtected: true,
    fallbackRequired: RENDER_INLINE_INVENTORY_FLAGS.fallbackRequired,
  };
}

function summarizeRenderInlineInventoryRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const renderReadiness = summarizeRenderReadiness(dependencies);

  const allDependenciesReady = dependencies.missing.length === 0;
  const safeForRenderInlineCleanupPlanning =
    allDependenciesReady &&
    renderReadiness.renderBoundaryVisible &&
    renderReadiness.screenActivationVisible &&
    renderReadiness.ownershipGraphVisible &&
    renderReadiness.hydrationCleanupVisible &&
    renderReadiness.legacyBridgeVisible &&
    !RENDER_INLINE_INVENTORY_FLAGS.renderRemovalAllowed;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '32-C-render-inline-inventory',
    flags: RENDER_INLINE_INVENTORY_FLAGS,
    scope: RENDER_INLINE_SCOPE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    renderReadiness,
    cleanupPlanning: {
      inventoryOnly: true,
      safeForRenderInlineCleanupPlanning,
      nextBundle: '32-D limited render inline cleanup',
    },
    checks: state.checks.slice(-20),
  };
}

function runRenderInlineInventoryCheck(reason) {
  const state = getState();
  const summary = summarizeRenderInlineInventoryRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    safeForRenderInlineCleanupPlanning: summary.cleanupPlanning.safeForRenderInlineCleanupPlanning,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('render-inline-inventory-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      safeForRenderInlineCleanupPlanning: summary.cleanupPlanning.safeForRenderInlineCleanupPlanning,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupPlanning.safeForRenderInlineCleanupPlanning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('render-inline-inventory-not-ready', {
      missingDependencies: summary.dependencies.missing,
      forbiddenChanges: RENDER_INLINE_SCOPE.forbiddenChanges,
    });
  }

  return summarizeRenderInlineInventoryRuntime();
}

window.ippoRenderInlineInventoryRuntimeSummary = summarizeRenderInlineInventoryRuntime;
window.ippoRunRenderInlineInventoryCheck = runRenderInlineInventoryCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('render-inline-inventory-runtime-loaded', {
    phase: '32-C',
    mode: RENDER_INLINE_INVENTORY_FLAGS.mode,
    renderRemovalAllowed: RENDER_INLINE_INVENTORY_FLAGS.renderRemovalAllowed,
  });
}

export {
  RENDER_INLINE_INVENTORY_FLAGS,
  RENDER_INLINE_SCOPE,
  summarizeRenderInlineInventoryRuntime,
  runRenderInlineInventoryCheck,
};
