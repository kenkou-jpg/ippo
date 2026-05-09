// ============================================================
// ippo – stabilization-assertions-runtime.js
//
// Phase A stabilization:
// warning-only assertions for post-migration critical invariants.
//
// IMPORTANT:
// - warning-only
// - does not throw
// - does not mutate state/localStorage/DOM
// - does not change render/hydration/save/sync timing
// ============================================================

const ASSERTIONS_KEY = '__IPPO_STABILIZATION_ASSERTIONS';
const MAX_RESULTS = 250;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getStore() {
  try {
    if (!window[ASSERTIONS_KEY]) {
      window[ASSERTIONS_KEY] = {
        createdAt: nowIso(),
        checks: [],
        warnings: [],
      };
    }
    return window[ASSERTIONS_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      checks: [],
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

function traceAssertion(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('assertion:' + phase, payload);
    }
  } catch (_) {}
}

function getActiveScreenCount() {
  try {
    return document.querySelectorAll(
      '.screen.active, .page.active, [data-screen].active, [data-active="true"], [aria-hidden="false"]'
    ).length;
  } catch (_) {
    return 0;
  }
}

function getStorageDriftWarningCount() {
  try {
    if (typeof window.ippoPersistenceDriftVisibilityRuntimeSummary === 'function') {
      return window.ippoPersistenceDriftVisibilityRuntimeSummary().warningCount || 0;
    }
  } catch (_) {}
  return 0;
}

function getDuplicateSyncWarningCount() {
  try {
    if (typeof window.ippoDuplicateSyncDetectorSummary === 'function') {
      return window.ippoDuplicateSyncDetectorSummary().warningCount || 0;
    }
  } catch (_) {}
  return 0;
}

function getReconnectWarningCount() {
  try {
    if (typeof window.ippoReconnectLifecycleTraceRuntimeSummary === 'function') {
      return window.ippoReconnectLifecycleTraceRuntimeSummary().warningCount || 0;
    }
  } catch (_) {}
  return 0;
}

function getReplayWarningCount() {
  try {
    if (typeof window.ippoReplayDiagnosticsRuntimeSummary === 'function') {
      return window.ippoReplayDiagnosticsRuntimeSummary().warningCount || 0;
    }
  } catch (_) {}
  return 0;
}

function buildAssertionSnapshot() {
  return {
    readyState: typeof document !== 'undefined' ? document.readyState : null,
    hasSaveState: typeof window.saveState === 'function',
    hasLoadState: typeof window.loadState === 'function',
    hasShowScreen: typeof window.showScreen === 'function',
    hasSwitchTab: typeof window.switchTab === 'function',
    hasSaveRecord: typeof window.saveRecord === 'function',
    hasAppRoot: !!document.getElementById('app'),
    activeScreenCount: getActiveScreenCount(),
    storageDriftWarningCount: getStorageDriftWarningCount(),
    duplicateSyncWarningCount: getDuplicateSyncWarningCount(),
    reconnectWarningCount: getReconnectWarningCount(),
    replayWarningCount: getReplayWarningCount(),
  };
}

function buildWarnings(snapshot) {
  const warnings = [];

  if (!snapshot.hasAppRoot) {
    warnings.push('missing-app-root');
  }

  if (!snapshot.hasSaveState) {
    warnings.push('missing-saveState-bridge');
  }

  if (!snapshot.hasLoadState) {
    warnings.push('missing-loadState-bridge');
  }

  if (!snapshot.hasShowScreen) {
    warnings.push('missing-showScreen-bridge');
  }

  if (!snapshot.hasSwitchTab) {
    warnings.push('missing-switchTab-bridge');
  }

  if (!snapshot.hasSaveRecord) {
    warnings.push('missing-saveRecord-bridge');
  }

  if (snapshot.activeScreenCount > 1) {
    warnings.push('multiple-active-screen-candidates');
  }

  if (snapshot.storageDriftWarningCount > 0) {
    warnings.push('persistence-drift-warnings-present');
  }

  if (snapshot.duplicateSyncWarningCount > 0) {
    warnings.push('duplicate-sync-warnings-present');
  }

  if (snapshot.reconnectWarningCount > 0) {
    warnings.push('reconnect-warnings-present');
  }

  if (snapshot.replayWarningCount > 0) {
    warnings.push('replay-diagnostic-warnings-present');
  }

  return warnings;
}

function runStabilizationAssertions(label = 'manual') {
  const store = getStore();
  const snapshot = buildAssertionSnapshot();
  const warnings = buildWarnings(snapshot);
  const result = {
    label,
    checkedAt: nowIso(),
    ok: warnings.length === 0,
    warnings,
    snapshot,
  };

  pushLimited(store.checks, result, MAX_RESULTS);

  if (warnings.length > 0) {
    pushLimited(store.warnings, result, MAX_RESULTS);
    traceAssertion('warnings-present', {
      label,
      warnings,
      snapshot,
    });
  } else {
    traceAssertion('ok', {
      label,
      snapshot,
    });
  }

  return result;
}

function summarizeStabilizationAssertionsRuntime() {
  const store = getStore();
  const latest = store.checks.length ? store.checks[store.checks.length - 1] : null;

  return {
    checkCount: store.checks.length,
    warningCount: store.warnings.length,
    latest,
    recentWarnings: store.warnings.slice(-10),
    preservedConstraints: {
      warningOnly: true,
      noThrow: true,
      noStateMutation: true,
      noLocalStorageWrite: true,
      noDomMutation: true,
      noTimingChange: true,
    },
  };
}

function resetStabilizationAssertionsRuntime() {
  const store = getStore();
  store.checks = [];
  store.warnings = [];
  return summarizeStabilizationAssertionsRuntime();
}

window.ippoRunStabilizationAssertions = runStabilizationAssertions;
window.ippoStabilizationAssertionsRuntimeSummary = summarizeStabilizationAssertionsRuntime;
window.ippoResetStabilizationAssertionsRuntime = resetStabilizationAssertionsRuntime;

export {
  runStabilizationAssertions,
  summarizeStabilizationAssertionsRuntime,
  resetStabilizationAssertionsRuntime,
};
