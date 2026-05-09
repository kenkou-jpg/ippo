// ============================================================
// ippo – persistence-drift-visibility-runtime.js
//
// Phase A stabilization:
// storage/state drift visibility without changing persistence.
//
// IMPORTANT:
// - observability only
// - does not call saveState
// - does not write localStorage
// - does not repair drift automatically
// - does not change hydration or sync order
// ============================================================

const DRIFT_KEY = '__IPPO_PERSISTENCE_DRIFT_VISIBILITY';
const MAX_SNAPSHOTS = 120;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getStore() {
  try {
    if (!window[DRIFT_KEY]) {
      window[DRIFT_KEY] = {
        createdAt: nowIso(),
        snapshots: [],
        warnings: [],
      };
    }
    return window[DRIFT_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      snapshots: [],
      warnings: [],
    };
  }
}

function pushLimited(list, value, limit) {
  try {
    list.push(value);
    if (list.length > limit) {
      list.splice(0, list.length - limit);
    }
  } catch (_) {}
}

function getDiagnostics(label) {
  try {
    if (typeof window.ippoRecordStorageDiagnostics === 'function') {
      return window.ippoRecordStorageDiagnostics(label || 'persistence-drift');
    }
  } catch (error) {
    return {
      label: label || 'persistence-drift',
      checkedAt: nowIso(),
      error: error && error.message ? error.message : String(error),
      warnings: ['diagnostics-failed'],
    };
  }

  return {
    label: label || 'persistence-drift',
    checkedAt: nowIso(),
    warnings: ['record-storage-diagnostics-missing'],
  };
}

function summarizeDrift(diagnostics) {
  const warnings = Array.isArray(diagnostics?.warnings) ? diagnostics.warnings : [];
  const summaries = diagnostics?.summaries || {};
  const consistency = diagnostics?.consistency || {};

  return {
    hasWarnings: warnings.length > 0,
    warningCount: warnings.length,
    warnings,
    activeSource: diagnostics?.activeSource || null,
    lengths: {
      state: summaries.state?.length || 0,
      ippoState: summaries.ippoState?.length || 0,
      kkRecords: summaries.kkRecords?.length || 0,
      legacyRecords: summaries.legacyRecords?.length || 0,
    },
    hashes: {
      state: summaries.state?.hash || '',
      ippoState: summaries.ippoState?.hash || '',
      kkRecords: summaries.kkRecords?.hash || '',
      legacyRecords: summaries.legacyRecords?.hash || '',
    },
    consistency: {
      stateMatchesIppoState: consistency.stateMatchesIppoState === true,
      stateMatchesKkRecords: consistency.stateMatchesKkRecords === true,
      ippoStateMatchesKkRecords: consistency.ippoStateMatchesKkRecords === true,
      legacyRecordsMatchesState: consistency.legacyRecordsMatchesState === true,
    },
  };
}

function traceDriftPhase(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase(phase, payload);
    }
  } catch (_) {}
}

function capturePersistenceDrift(label = 'manual') {
  const store = getStore();
  const diagnostics = getDiagnostics(label);
  const drift = summarizeDrift(diagnostics);
  const snapshot = {
    label,
    checkedAt: nowIso(),
    drift,
    diagnostics,
  };

  pushLimited(store.snapshots, snapshot, MAX_SNAPSHOTS);

  traceDriftPhase('persistence-drift-captured', {
    label,
    warningCount: drift.warningCount,
    activeSource: drift.activeSource,
    lengths: drift.lengths,
    consistency: drift.consistency,
  });

  if (drift.hasWarnings) {
    pushLimited(store.warnings, snapshot, MAX_SNAPSHOTS);
    traceDriftPhase('persistence-drift-warning', {
      label,
      warnings: drift.warnings,
      lengths: drift.lengths,
      hashes: drift.hashes,
    });
  }

  return snapshot;
}

function summarizePersistenceDriftVisibilityRuntime() {
  const store = getStore();
  const latest = store.snapshots.length ? store.snapshots[store.snapshots.length - 1] : null;

  return {
    snapshotCount: store.snapshots.length,
    warningCount: store.warnings.length,
    latest,
    recentWarnings: store.warnings.slice(-10),
    preservedConstraints: {
      noSaveStateCall: true,
      noLocalStorageWrite: true,
      noAutoRepair: true,
      noHydrationOrderChange: true,
      noSyncOrderChange: true,
    },
  };
}

function resetPersistenceDriftVisibilityRuntime() {
  const store = getStore();
  store.snapshots = [];
  store.warnings = [];
  return summarizePersistenceDriftVisibilityRuntime();
}

window.ippoCapturePersistenceDrift = capturePersistenceDrift;
window.ippoPersistenceDriftVisibilityRuntimeSummary = summarizePersistenceDriftVisibilityRuntime;
window.ippoResetPersistenceDriftVisibilityRuntime = resetPersistenceDriftVisibilityRuntime;

export {
  capturePersistenceDrift,
  summarizePersistenceDriftVisibilityRuntime,
  resetPersistenceDriftVisibilityRuntime,
};
