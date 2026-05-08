// ============================================================
// ippo – runtime-ownership-graph.js
//
// state / storage / sync ownership を runtime で観測する layer。
//
// observe-only.
// ============================================================

const OWNERSHIP_GRAPH_KEY = '__ippoRuntimeOwnershipGraph';

const STATE_OWNERSHIP_FIELDS = [
  'records',
  'name',
  'lastPeriodDate',
  'cycleLength',
  'cycleIrregular',
  'birthYear',
  'purpose',
  'reminderTime',
  'fastingActive',
  'fastingStart',
  'fastGoal',
  'rating',
  'myVision',
  'lastSaved',
];

const STORAGE_OWNERSHIP_KEYS = [
  'ippo_state',
  'ippo_sb_token',
  'ippo_sb_refresh',
  'ippo_debug_record',
];

const SYNC_OWNERSHIP_APIS = [
  'cloudBackupAll',
  'syncFromCloud',
  'saveState',
  'loadState',
  'ippoVerifyLastRecordSave',
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getGraphState() {
  if (!window[OWNERSHIP_GRAPH_KEY]) {
    window[OWNERSHIP_GRAPH_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      stateOwnershipMoved: false,
      storageOwnershipMoved: false,
      syncOwnershipMoved: false,
      checks: [],
    };
  }

  return window[OWNERSHIP_GRAPH_KEY];
}

function inspectStateOwnership() {
  const state = window.state;
  const fields = {};

  STATE_OWNERSHIP_FIELDS.forEach((field) => {
    fields[field] = {
      exists: !!state && Object.prototype.hasOwnProperty.call(state, field),
      type: state && Object.prototype.hasOwnProperty.call(state, field) ? typeof state[field] : 'undefined',
      isArray: Array.isArray(state && state[field]),
    };
  });

  return {
    exists: !!state && typeof state === 'object',
    recordsIsArray: Array.isArray(state && state.records),
    recordsLength: Array.isArray(state && state.records) ? state.records.length : null,
    fields,
    missingFields: Object.keys(fields).filter((field) => !fields[field].exists),
  };
}

function inspectStorageOwnership() {
  const keys = {};

  STORAGE_OWNERSHIP_KEYS.forEach((key) => {
    let exists = false;
    let valueLength = null;

    try {
      const value = localStorage.getItem(key);
      exists = value !== null;
      valueLength = value ? value.length : 0;
    } catch (_) {
      exists = false;
      valueLength = null;
    }

    keys[key] = { exists, valueLength };
  });

  return {
    keys,
    hasStateStorage: !!(keys.ippo_state && keys.ippo_state.exists),
    hasSupabaseTokenStorage: !!(keys.ippo_sb_token && keys.ippo_sb_token.exists),
    hasSupabaseRefreshStorage: !!(keys.ippo_sb_refresh && keys.ippo_sb_refresh.exists),
  };
}

function inspectSyncOwnership() {
  const apis = {};

  SYNC_OWNERSHIP_APIS.forEach((name) => {
    apis[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });

  return {
    apis,
    missingApis: Object.keys(apis).filter((name) => !apis[name].exists),
    supabaseReady: !!window.supabase,
    supabaseStatus: window.__ippoSupabaseStatus || null,
  };
}

function summarizeRuntimeOwnershipGraph() {
  const graph = getGraphState();
  const stateOwnership = inspectStateOwnership();
  const storageOwnership = inspectStorageOwnership();
  const syncOwnership = inspectSyncOwnership();

  return {
    loadedAt: graph.loadedAt,
    checkedAt: nowIso(),
    mode: graph.mode,
    ownershipMoved: {
      state: !!graph.stateOwnershipMoved,
      storage: !!graph.storageOwnershipMoved,
      sync: !!graph.syncOwnershipMoved,
    },
    stateOwnership,
    storageOwnership,
    syncOwnership,
    safeForStateOwnershipPlanning: stateOwnership.exists && stateOwnership.recordsIsArray,
    safeForStorageOwnershipPlanning: storageOwnership.hasStateStorage || stateOwnership.exists,
    safeForSyncOwnershipPlanning: syncOwnership.missingApis.length === 0 || !!syncOwnership.supabaseStatus,
    checks: graph.checks.slice(-40),
  };
}

function runRuntimeOwnershipGraphCheck(reason) {
  const graph = getGraphState();
  const summary = summarizeRuntimeOwnershipGraph();

  graph.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForStateOwnershipPlanning: summary.safeForStateOwnershipPlanning,
    safeForStorageOwnershipPlanning: summary.safeForStorageOwnershipPlanning,
    safeForSyncOwnershipPlanning: summary.safeForSyncOwnershipPlanning,
    missingStateFields: summary.stateOwnership.missingFields,
    missingSyncApis: summary.syncOwnership.missingApis,
  });

  if (graph.checks.length > 60) {
    graph.checks.splice(0, graph.checks.length - 60);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('runtime-ownership-graph-check', {
      reason: reason || 'manual',
      safeForStateOwnershipPlanning: summary.safeForStateOwnershipPlanning,
      safeForStorageOwnershipPlanning: summary.safeForStorageOwnershipPlanning,
      safeForSyncOwnershipPlanning: summary.safeForSyncOwnershipPlanning,
    });
  }

  return summarizeRuntimeOwnershipGraph();
}

window.ippoRuntimeOwnershipGraphSummary = summarizeRuntimeOwnershipGraph;
window.ippoRunRuntimeOwnershipGraphCheck = runRuntimeOwnershipGraphCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runRuntimeOwnershipGraphCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runRuntimeOwnershipGraphCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-ownership-graph-loaded');
}

export {
  STATE_OWNERSHIP_FIELDS,
  STORAGE_OWNERSHIP_KEYS,
  SYNC_OWNERSHIP_APIS,
  summarizeRuntimeOwnershipGraph,
  runRuntimeOwnershipGraphCheck,
};
