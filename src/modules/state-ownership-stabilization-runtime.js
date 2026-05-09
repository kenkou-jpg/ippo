// ============================================================
// ippo – state-ownership-stabilization-runtime.js
//
// Phase 34-A:
// state ownership stabilization runtime.
//
// 目的:
// state.records authority / mutation point / saveState ownership を
// 実 cleanup 前に runtime graph へ固定する。
//
// 重要:
// - save timing is not changed
// - load timing is not changed
// - persistence order is not changed
// - sync/Supabase/localStorage are untouched
// - state schema is not rewritten
// ============================================================

const STATE_OWNERSHIP_STABILIZATION_KEY = '__ippoStateOwnershipStabilizationRuntime';

const STATE_OWNERSHIP_STABILIZATION_FLAGS = Object.freeze({
  enabled: false,
  mode: 'state-ownership-stabilization-inventory',
  stateAuthorityTransferAllowed: false,
  mutationCleanupAllowed: false,
  saveTimingChangeAllowed: false,
  loadTimingChangeAllowed: false,
  persistenceOrderChangeAllowed: false,
  syncChangeAllowed: false,
  supabaseChangeAllowed: false,
  localStorageChangeAllowed: false,
  stateSchemaRewriteAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const STATE_AUTHORITY_SCOPE = Object.freeze({
  authorityTargets: [
    {
      id: 'state.records-authority',
      owner: 'store/state.js + record repository compatibility',
      stabilizationAllowed: true,
      condition: 'only if existing save/load timing remains unchanged',
    },
    {
      id: 'record mutation points',
      owner: 'record save pipeline / guarded delegation',
      stabilizationAllowed: true,
      condition: 'only with preview/guarded execution visibility',
    },
    {
      id: 'saveState ownership',
      owner: 'store/state.js compatibility bridge',
      stabilizationAllowed: true,
      condition: 'do not change call order or persistence order',
    },
  ],
  preservedRuntime: [
    'state schema',
    'state.records array shape',
    'saveState call timing',
    'loadState call timing',
    'record save pipeline timing',
    'localStorage fallback timing',
    'Supabase sync timing',
    'window saveState/loadState compatibility',
  ],
  forbiddenChanges: [
    'state schema rewrite',
    'state.records shape rewrite',
    'saveState timing change',
    'loadState timing change',
    'record save timing change',
    'persistence order change',
    'sync timing change',
    'Supabase lifecycle change',
    'localStorage boundary behavior change',
    'DOM ID/class/data-* rewrite',
  ],
});

const REQUIRED_DEPENDENCIES = Object.freeze([
  'ippoLimitedLegacyWindowBridgeCleanupRuntimeSummary',
  'ippoPersistenceBoundaryPrepSummary',
  'ippoPersistenceExecutionReadinessSummary',
  'ippoPersistenceGuardedExecutionSummary',
  'ippoRecordSaveCoreSummary',
  'ippoRecordSaveDelegationSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[STATE_OWNERSHIP_STABILIZATION_KEY]) {
    window[STATE_OWNERSHIP_STABILIZATION_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[STATE_OWNERSHIP_STABILIZATION_KEY];
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

function inspectStateAuthority() {
  const state = window.state;
  const records = state && state.records;

  return {
    stateExists: !!state && typeof state === 'object',
    recordsExists: Array.isArray(records),
    recordsLength: Array.isArray(records) ? records.length : null,
    saveStateReady: typeof window.saveState === 'function',
    loadStateReady: typeof window.loadState === 'function',
    localStorageAvailable: typeof window.localStorage !== 'undefined',
    supabaseVisible: typeof window.supabase !== 'undefined',
  };
}

function summarizeStateOwnershipStabilizationRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const stateAuthority = inspectStateAuthority();
  const allDependenciesReady = dependencies.missing.length === 0;

  const authorityVisible =
    stateAuthority.stateExists &&
    stateAuthority.recordsExists &&
    stateAuthority.saveStateReady &&
    stateAuthority.loadStateReady;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '34-A-state-ownership-stabilization',
    flags: STATE_OWNERSHIP_STABILIZATION_FLAGS,
    scope: STATE_AUTHORITY_SCOPE,
    dependencies: {
      allReady: allDependenciesReady,
      missing: dependencies.missing,
    },
    stateAuthority,
    stabilization: {
      inventoryOnly: true,
      authorityVisible,
      mutationCleanupExecuted: false,
      saveTimingChanged: false,
      loadTimingChanged: false,
      persistenceOrderChanged: false,
      syncChanged: false,
      stateSchemaRewritten: false,
      safeForServiceBoundaryStabilization:
        allDependenciesReady && authorityVisible && !STATE_OWNERSHIP_STABILIZATION_FLAGS.mutationCleanupAllowed,
      nextBundle: '34-B service boundary stabilization',
    },
    checks: state.checks.slice(-20),
  };
}

function runStateOwnershipStabilizationCheck(reason) {
  const state = getState();
  const summary = summarizeStateOwnershipStabilizationRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    authorityVisible: summary.stabilization.authorityVisible,
    safeForServiceBoundaryStabilization: summary.stabilization.safeForServiceBoundaryStabilization,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('state-ownership-stabilization-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      authorityVisible: summary.stabilization.authorityVisible,
      safeForServiceBoundaryStabilization: summary.stabilization.safeForServiceBoundaryStabilization,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.stabilization.safeForServiceBoundaryStabilization && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('state-ownership-stabilization-not-ready', {
      missingDependencies: summary.dependencies.missing,
      stateAuthority: summary.stateAuthority,
      forbiddenChanges: STATE_AUTHORITY_SCOPE.forbiddenChanges,
    });
  }

  return summarizeStateOwnershipStabilizationRuntime();
}

window.ippoStateOwnershipStabilizationRuntimeSummary = summarizeStateOwnershipStabilizationRuntime;
window.ippoRunStateOwnershipStabilizationCheck = runStateOwnershipStabilizationCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('state-ownership-stabilization-runtime-loaded', {
    phase: '34-A',
    mode: STATE_OWNERSHIP_STABILIZATION_FLAGS.mode,
    saveTimingChangeAllowed: STATE_OWNERSHIP_STABILIZATION_FLAGS.saveTimingChangeAllowed,
  });
}

export {
  STATE_OWNERSHIP_STABILIZATION_FLAGS,
  STATE_AUTHORITY_SCOPE,
  summarizeStateOwnershipStabilizationRuntime,
  runStateOwnershipStabilizationCheck,
};
