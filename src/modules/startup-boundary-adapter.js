// ============================================================
// ippo – startup-boundary-adapter.js
//
// legacy app.html startup / hydration の境界を Vite 側から観測する
// adapter preparation layer。
//
// 重要:
// - legacy init() は置換しない
// - legacy render/hydration 関数は呼び替えない
// - DOM / state / persistence は変更しない
// - 現時点では startup boundary の read-only inspection のみ
// ============================================================

const STARTUP_BOUNDARY_KEY = '__ippoStartupBoundaryAdapter';

const STARTUP_PHASES = [
  'legacy-globals',
  'state-load',
  'auth-sync',
  'ui-hydration',
  'home-render',
  'calendar-render',
  'insights-render',
  'record-render',
];

const LEGACY_STARTUP_APIS = [
  'init',
  'loadState',
  'saveState',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'updateStats',
  'switchTab',
  'showScreen',
  'cloudBackupAll',
  'syncFromCloud',
];

const HYDRATION_DOM_IDS = [
  'screen-welcome',
  'main-app',
  'screen-home',
  'screen-calendar',
  'screen-insights',
  'screen-record',
  'screen-settings',
  'home-week-row',
  'calGrid',
  'insight-total',
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getAdapterState() {
  if (!window[STARTUP_BOUNDARY_KEY]) {
    window[STARTUP_BOUNDARY_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      ownsStartup: false,
      ownsHydration: false,
      ownsSync: false,
      checks: [],
    };
  }
  return window[STARTUP_BOUNDARY_KEY];
}

function inspectApis(names) {
  const result = {};
  names.forEach((name) => {
    result[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });
  return result;
}

function inspectDom(ids) {
  const result = {};
  ids.forEach((id) => {
    result[id] = !!document.getElementById(id);
  });
  return result;
}

function inspectStateShape() {
  const state = window.state;
  return {
    exists: !!state && typeof state === 'object',
    recordsIsArray: Array.isArray(state && state.records),
    recordsLength: Array.isArray(state && state.records) ? state.records.length : null,
    hasName: !!(state && state.name),
    hasCycleLength: typeof (state && state.cycleLength) !== 'undefined',
    hasLastPeriodDate: typeof (state && state.lastPeriodDate) !== 'undefined',
  };
}

function summarizeStartupBoundary() {
  const state = getAdapterState();
  const apis = inspectApis(LEGACY_STARTUP_APIS);
  const dom = inspectDom(HYDRATION_DOM_IDS);
  const missingApis = Object.keys(apis).filter((name) => !apis[name].exists);
  const missingDom = Object.keys(dom).filter((id) => !dom[id]);
  const stateShape = inspectStateShape();

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    ownership: {
      startup: !!state.ownsStartup,
      hydration: !!state.ownsHydration,
      sync: !!state.ownsSync,
    },
    phases: STARTUP_PHASES,
    legacyStartupApis: apis,
    missingLegacyStartupApis: missingApis,
    hydrationDom: dom,
    missingHydrationDom: missingDom,
    stateShape,
    bootReady: typeof window.ippoBootSummary === 'function',
    bootstrapShellReady: typeof window.ippoBootstrapShellSummary === 'function',
    startupVerifyReady: typeof window.ippoStartupVerifySummary === 'function',
    safeForHydrationSequencing: missingDom.length === 0 && stateShape.exists && stateShape.recordsIsArray,
    safeForStartupOwnershipExtraction: missingApis.length === 0 && missingDom.length === 0 && stateShape.exists,
    checks: state.checks.slice(-20),
  };
}

function runStartupBoundaryCheck(reason) {
  const state = getAdapterState();
  const summary = summarizeStartupBoundary();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForHydrationSequencing: summary.safeForHydrationSequencing,
    safeForStartupOwnershipExtraction: summary.safeForStartupOwnershipExtraction,
    missingLegacyStartupApis: summary.missingLegacyStartupApis,
    missingHydrationDom: summary.missingHydrationDom,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-boundary-check', {
      reason: reason || 'manual',
      safeForHydrationSequencing: summary.safeForHydrationSequencing,
      safeForStartupOwnershipExtraction: summary.safeForStartupOwnershipExtraction,
      missingApiCount: summary.missingLegacyStartupApis.length,
      missingDomCount: summary.missingHydrationDom.length,
    });
  }

  if (!summary.safeForStartupOwnershipExtraction && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-boundary-not-ready-for-extraction', {
      missingLegacyStartupApis: summary.missingLegacyStartupApis,
      missingHydrationDom: summary.missingHydrationDom,
      stateShape: summary.stateShape,
    });
  }

  return summarizeStartupBoundary();
}

window.ippoStartupBoundarySummary = summarizeStartupBoundary;
window.ippoRunStartupBoundaryCheck = runStartupBoundaryCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => runStartupBoundaryCheck('dom-content-loaded'), { once: true });
} else {
  window.setTimeout(() => runStartupBoundaryCheck('module-loaded-after-dom'), 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-boundary-adapter-loaded');
}

export {
  STARTUP_PHASES,
  LEGACY_STARTUP_APIS,
  HYDRATION_DOM_IDS,
  summarizeStartupBoundary,
  runStartupBoundaryCheck,
};
