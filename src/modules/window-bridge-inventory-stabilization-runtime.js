// ============================================================
// ippo – window-bridge-inventory-stabilization-runtime.js
//
// Phase 33-A:
// window bridge inventory stabilization runtime.
//
// 目的:
// legacy window.* bridge を削減する前に、互換維持が必要なAPI、
// 将来の削減候補、削除禁止領域を runtime graph に固定する。
//
// 重要:
// - inventory only
// - window compatibility is not removed
// - render/hydration/startup timing is not changed
// - save/sync/Supabase/localStorage are untouched
// ============================================================

const WINDOW_BRIDGE_INVENTORY_KEY = '__ippoWindowBridgeInventoryStabilizationRuntime';

const WINDOW_BRIDGE_INVENTORY_FLAGS = Object.freeze({
  enabled: false,
  mode: 'window-bridge-inventory-only',
  bridgeRemovalAllowed: false,
  compatibilityRemovalAllowed: false,
  startupTimingChangeAllowed: false,
  hydrationTimingChangeAllowed: false,
  renderTimingChangeAllowed: false,
  persistenceChangeAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const REQUIRED_COMPATIBILITY_APIS = Object.freeze([
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
]);

const OBSERVABILITY_APIS = Object.freeze([
  'ippoLegacyWindowBridgeSummary',
  'ippoRuntimeOwnershipGraphSummary',
  'ippoLimitedRenderInlineCleanupRuntimeSummary',
  'ippoLimitedHydrationInlineCleanupRuntimeSummary',
  'ippoActualStartupInlineRemovalRuntimeSummary',
]);

const WINDOW_BRIDGE_SCOPE = Object.freeze({
  futureReductionCandidates: [
    {
      id: 'unused-window-observability-api',
      allowedForFutureReduction: true,
      condition: 'only after equivalent module summary is available and no legacy caller depends on it',
    },
    {
      id: 'duplicate-window-render-helper',
      allowedForFutureReduction: true,
      condition: 'only after render compatibility bridge confirms module ownership',
    },
    {
      id: 'duplicate-window-record-helper',
      allowedForFutureReduction: true,
      condition: 'only after record module exports and save delegation are stable',
    },
  ],
  preservedBridge: [
    'saveState/loadState compatibility',
    'record screen compatibility',
    'record save compatibility',
    'showScreen/switchTab compatibility',
    'renderHome/renderCalendar/renderInsights compatibility',
    'boot error/warning observability',
  ],
  forbiddenReduction: [
    'complete window bridge removal',
    'saveState/loadState timing change',
    'saveRecord timing change',
    'showScreen timing change',
    'switchTab timing change',
    'render timing change',
    'hydration timing change',
    'Supabase/sync/localStorage lifecycle change',
    'DOM ID/class/data-* rewrite',
  ],
});

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[WINDOW_BRIDGE_INVENTORY_KEY]) {
    window[WINDOW_BRIDGE_INVENTORY_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }
  return window[WINDOW_BRIDGE_INVENTORY_KEY];
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

function inspectWindowApi(name) {
  return {
    name,
    exists: typeof window[name] !== 'undefined',
    type: typeof window[name],
  };
}

function summarizeRequiredApis() {
  const apis = REQUIRED_COMPATIBILITY_APIS.map(inspectWindowApi);
  return {
    apis,
    missing: apis.filter((api) => !api.exists).map((api) => api.name),
  };
}

function summarizeObservability() {
  const summaries = {};
  const ready = {};

  OBSERVABILITY_APIS.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    ready[name] = !!summary && !summary.error;
  });

  return {
    ready,
    summaries,
    missing: OBSERVABILITY_APIS.filter((name) => !ready[name]),
  };
}

function summarizeWindowBridgeInventoryStabilizationRuntime() {
  const state = getState();
  const requiredApis = summarizeRequiredApis();
  const observability = summarizeObservability();
  const allRequiredApisReady = requiredApis.missing.length === 0;
  const allObservabilityReady = observability.missing.length === 0;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '33-A-window-bridge-inventory-stabilization',
    flags: WINDOW_BRIDGE_INVENTORY_FLAGS,
    requiredCompatibilityApis: requiredApis,
    observability,
    scope: WINDOW_BRIDGE_SCOPE,
    bridgeStabilization: {
      inventoryOnly: true,
      allRequiredApisReady,
      allObservabilityReady,
      compatibilityPreserved: true,
      safeForLimitedBridgeReductionPlanning:
        allRequiredApisReady && allObservabilityReady && !WINDOW_BRIDGE_INVENTORY_FLAGS.bridgeRemovalAllowed,
      nextBundle: '33-B limited legacy window bridge cleanup',
    },
    checks: state.checks.slice(-20),
  };
}

function runWindowBridgeInventoryStabilizationCheck(reason) {
  const state = getState();
  const summary = summarizeWindowBridgeInventoryStabilizationRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allRequiredApisReady: summary.bridgeStabilization.allRequiredApisReady,
    allObservabilityReady: summary.bridgeStabilization.allObservabilityReady,
    safeForLimitedBridgeReductionPlanning: summary.bridgeStabilization.safeForLimitedBridgeReductionPlanning,
    missingRequiredApis: summary.requiredCompatibilityApis.missing,
    missingObservability: summary.observability.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('window-bridge-inventory-stabilization-check', {
      reason: reason || 'manual',
      allRequiredApisReady: summary.bridgeStabilization.allRequiredApisReady,
      allObservabilityReady: summary.bridgeStabilization.allObservabilityReady,
      safeForLimitedBridgeReductionPlanning: summary.bridgeStabilization.safeForLimitedBridgeReductionPlanning,
    });
  }

  if (!summary.bridgeStabilization.safeForLimitedBridgeReductionPlanning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('window-bridge-inventory-stabilization-not-ready', {
      missingRequiredApis: summary.requiredCompatibilityApis.missing,
      missingObservability: summary.observability.missing,
      forbiddenReduction: WINDOW_BRIDGE_SCOPE.forbiddenReduction,
    });
  }

  return summarizeWindowBridgeInventoryStabilizationRuntime();
}

window.ippoWindowBridgeInventoryStabilizationRuntimeSummary = summarizeWindowBridgeInventoryStabilizationRuntime;
window.ippoRunWindowBridgeInventoryStabilizationCheck = runWindowBridgeInventoryStabilizationCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('window-bridge-inventory-stabilization-runtime-loaded', {
    phase: '33-A',
    mode: WINDOW_BRIDGE_INVENTORY_FLAGS.mode,
    compatibilityRemovalAllowed: WINDOW_BRIDGE_INVENTORY_FLAGS.compatibilityRemovalAllowed,
  });
}

export {
  WINDOW_BRIDGE_INVENTORY_FLAGS,
  REQUIRED_COMPATIBILITY_APIS,
  OBSERVABILITY_APIS,
  WINDOW_BRIDGE_SCOPE,
  summarizeWindowBridgeInventoryStabilizationRuntime,
  runWindowBridgeInventoryStabilizationCheck,
};
