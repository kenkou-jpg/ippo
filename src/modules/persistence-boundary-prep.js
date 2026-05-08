// ============================================================
// ippo – persistence-boundary-prep.js
//
// persistence / storage / sync boundary preparation layer.
//
// observe-only.
// ============================================================

const PERSISTENCE_BOUNDARY_KEY = '__ippoPersistenceBoundaryPrep';

const PERSISTENCE_BOUNDARIES = [
  {
    name: 'state-persistence',
    apis: ['saveState', 'loadState'],
    storageKeys: ['ippo_state'],
  },
  {
    name: 'record-save-pipeline',
    apis: [
      'createRecordSaveContext',
      'persistRecordState',
      'syncRecordCloud',
      'finalizeRecordSaveContext',
    ],
    storageKeys: ['ippo_state'],
  },
  {
    name: 'supabase-auth-storage',
    apis: [],
    storageKeys: ['ippo_sb_token', 'ippo_sb_refresh'],
  },
  {
    name: 'cloud-sync-boundary',
    apis: ['cloudBackupAll', 'syncFromCloud'],
    storageKeys: [],
  },
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[PERSISTENCE_BOUNDARY_KEY]) {
    window[PERSISTENCE_BOUNDARY_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      persistenceBoundaryMoved: false,
      checks: [],
    };
  }

  return window[PERSISTENCE_BOUNDARY_KEY];
}

function inspectBoundary(boundary) {
  const apis = {};
  boundary.apis.forEach((name) => {
    apis[name] = typeof window[name] === 'function';
  });

  const storage = {};
  boundary.storageKeys.forEach((key) => {
    let exists = false;

    try {
      exists = localStorage.getItem(key) !== null;
    } catch (_) {
      exists = false;
    }

    storage[key] = exists;
  });

  const missingApis = Object.keys(apis).filter((key) => !apis[key]);
  const missingStorage = Object.keys(storage).filter((key) => !storage[key]);

  return {
    name: boundary.name,
    apis,
    storage,
    missingApis,
    missingStorage,
    ready: missingApis.length === 0,
  };
}

function summarizePersistenceBoundaryPrep() {
  const state = getState();
  const boundaries = PERSISTENCE_BOUNDARIES.map(inspectBoundary);
  const notReady = boundaries.filter((boundary) => !boundary.ready);

  const ownershipGraph = typeof window.ippoRuntimeOwnershipGraphSummary === 'function'
    ? window.ippoRuntimeOwnershipGraphSummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    persistenceBoundaryMoved: !!state.persistenceBoundaryMoved,
    boundaries,
    notReadyBoundaries: notReady.map((boundary) => boundary.name),
    allBoundariesReady: notReady.length === 0,
    ownershipGraphReady: !!ownershipGraph,
    safeForPersistenceBoundaryPlanning: !!(
      ownershipGraph &&
      ownershipGraph.safeForStorageOwnershipPlanning &&
      ownershipGraph.safeForSyncOwnershipPlanning
    ),
    checks: state.checks.slice(-40),
  };
}

function runPersistenceBoundaryPrepCheck(reason) {
  const state = getState();
  const summary = summarizePersistenceBoundaryPrep();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allBoundariesReady: summary.allBoundariesReady,
    safeForPersistenceBoundaryPlanning: summary.safeForPersistenceBoundaryPlanning,
    notReadyBoundaries: summary.notReadyBoundaries,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('persistence-boundary-prep-check', {
      reason: reason || 'manual',
      allBoundariesReady: summary.allBoundariesReady,
      safeForPersistenceBoundaryPlanning: summary.safeForPersistenceBoundaryPlanning,
      notReadyBoundaries: summary.notReadyBoundaries,
    });
  }

  return summarizePersistenceBoundaryPrep();
}

window.ippoPersistenceBoundaryPrepSummary = summarizePersistenceBoundaryPrep;
window.ippoRunPersistenceBoundaryPrepCheck = runPersistenceBoundaryPrepCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runPersistenceBoundaryPrepCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runPersistenceBoundaryPrepCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('persistence-boundary-prep-loaded');
}

export {
  PERSISTENCE_BOUNDARIES,
  summarizePersistenceBoundaryPrep,
  runPersistenceBoundaryPrepCheck,
};
