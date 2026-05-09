// ============================================================
// ippo – service-boundary-stabilization-runtime.js
//
// Phase 34-B:
// service boundary stabilization runtime.
//
// 目的:
// localStorage / Supabase / sync lifecycle / persistence ownership を
// 実 cleanup 前に runtime graph へ固定する。
//
// 重要:
// - persistence order is not changed
// - save timing is not changed
// - sync timing is not changed
// - Supabase lifecycle is not rewritten
// - localStorage behavior is not rewritten
// ============================================================

const SERVICE_BOUNDARY_STABILIZATION_KEY = '__ippoServiceBoundaryStabilizationRuntime';

const SERVICE_BOUNDARY_STABILIZATION_FLAGS = Object.freeze({
  enabled: false,
  mode: 'service-boundary-stabilization-inventory',
  persistenceOwnershipTransferAllowed: false,
  localStorageBoundaryCleanupAllowed: false,
  supabaseLifecycleCleanupAllowed: false,
  syncLifecycleCleanupAllowed: false,
  saveTimingChangeAllowed: false,
  persistenceOrderChangeAllowed: false,
  syncTimingChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const SERVICE_BOUNDARY_SCOPE = Object.freeze({
  stabilizationTargets: [
    {
      id: 'localStorage persistence boundary',
      owner: 'store/state.js + persistence compatibility path',
      stabilizationAllowed: true,
      condition: 'only if existing persistence order remains unchanged',
    },
    {
      id: 'Supabase lifecycle boundary',
      owner: 'services/supabase.js guarded compatibility lifecycle',
      stabilizationAllowed: true,
      condition: 'do not change initialization timing or sync order',
    },
    {
      id: 'sync lifecycle ownership',
      owner: 'guarded persistence execution + record save delegation',
      stabilizationAllowed: true,
      condition: 'only with rollback visibility preserved',
    },
  ],
  preservedRuntime: [
    'saveState execution timing',
    'loadState execution timing',
    'persistence execution order',
    'localStorage fallback path',
    'Supabase initialization lifecycle',
    'sync execution lifecycle',
    'record save delegation order',
    'rollback visibility',
  ],
  forbiddenChanges: [
    'saveState timing change',
    'loadState timing change',
    'persistence order change',
    'sync timing change',
    'Supabase lifecycle rewrite',
    'localStorage behavior rewrite',
    'record save execution order rewrite',
    'DOM ID/class/data-* rewrite',
  ],
});

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoStateOwnershipStabilizationRuntimeSummary',
  'ippoPersistenceBoundaryPrepSummary',
  'ippoPersistenceExecutionReadinessSummary',
  'ippoPersistenceGuardedExecutionSummary',
  'ippoRecordSaveDelegationSummary',
  'ippoRecordSaveAdoptionSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[SERVICE_BOUNDARY_STABILIZATION_KEY]) {
    window[SERVICE_BOUNDARY_STABILIZATION_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[SERVICE_BOUNDARY_STABILIZATION_KEY];
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

function inspectServiceBoundary() {
  return {
    saveStateReady: typeof window.saveState === 'function',
    loadStateReady: typeof window.loadState === 'function',
    localStorageAvailable: typeof window.localStorage !== 'undefined',
    supabaseVisible: typeof window.supabase !== 'undefined',
    persistenceGuardVisible: typeof window.ippoRunPersistenceGuardedExecutionCheck === 'function',
    recordSaveDelegationVisible: typeof window.ippoRecordSaveDelegationSummary === 'function',
  };
}

function summarizeServiceBoundaryStabilizationRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const boundary = inspectServiceBoundary();
  const allDependenciesReady = dependencies.missing.length === 0;

  const serviceBoundaryVisible =
    boundary.saveStateReady &&
    boundary.loadStateReady &&
    boundary.localStorageAvailable &&
    boundary.supabaseVisible;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '34-B-service-boundary-stabilization',
    flags: SERVICE_BOUNDARY_STABILIZATION_FLAGS,
    scope: SERVICE_BOUNDARY_SCOPE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    boundary,
    stabilization: {
      inventoryOnly: true,
      serviceBoundaryVisible,
      persistenceOrderChanged: false,
      saveTimingChanged: false,
      syncTimingChanged: false,
      supabaseLifecycleChanged: false,
      localStorageBehaviorChanged: false,
      rollbackVisibilityPreserved: true,
      safeForFinalShellCleanup:
        allDependenciesReady && serviceBoundaryVisible && !SERVICE_BOUNDARY_STABILIZATION_FLAGS.persistenceOwnershipTransferAllowed,
      nextBundle: '35-A final shell slimming',
    },
    checks: state.checks.slice(-20),
  };
}

function runServiceBoundaryStabilizationCheck(reason) {
  const state = getState();
  const summary = summarizeServiceBoundaryStabilizationRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    serviceBoundaryVisible: summary.stabilization.serviceBoundaryVisible,
    safeForFinalShellCleanup: summary.stabilization.safeForFinalShellCleanup,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('service-boundary-stabilization-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      serviceBoundaryVisible: summary.stabilization.serviceBoundaryVisible,
      safeForFinalShellCleanup: summary.stabilization.safeForFinalShellCleanup,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.stabilization.safeForFinalShellCleanup && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('service-boundary-stabilization-not-ready', {
      missingDependencies: summary.dependencies.missing,
      boundary: summary.boundary,
      forbiddenChanges: SERVICE_BOUNDARY_SCOPE.forbiddenChanges,
    });
  }

  return summarizeServiceBoundaryStabilizationRuntime();
}

window.ippoServiceBoundaryStabilizationRuntimeSummary = summarizeServiceBoundaryStabilizationRuntime;
window.ippoRunServiceBoundaryStabilizationCheck = runServiceBoundaryStabilizationCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('service-boundary-stabilization-runtime-loaded', {
    phase: '34-B',
    mode: SERVICE_BOUNDARY_STABILIZATION_FLAGS.mode,
    persistenceOrderChangeAllowed: SERVICE_BOUNDARY_STABILIZATION_FLAGS.persistenceOrderChangeAllowed,
  });
}

export {
  SERVICE_BOUNDARY_STABILIZATION_FLAGS,
  SERVICE_BOUNDARY_SCOPE,
  summarizeServiceBoundaryStabilizationRuntime,
  runServiceBoundaryStabilizationCheck,
};
