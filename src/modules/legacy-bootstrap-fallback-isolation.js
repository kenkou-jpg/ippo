// ============================================================
// ippo – legacy-bootstrap-fallback-isolation.js
//
// Phase A-3:
// Legacy bootstrap fallback isolation visibility.
//
// 目的:
// app.html startup ownership extraction 前に、legacy fallback path が
// 独立して観測・比較・復帰可能であることを確認する。
//
// 重要:
// - observe-only
// - adoption disabled by default
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// - render / hydration / save / sync / Supabase は変更しない
// ============================================================

const FALLBACK_ISOLATION_KEY = '__ippoLegacyBootstrapFallbackIsolation';

const FALLBACK_ISOLATION_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'observe-only',
  legacyOwner: 'legacy-app-html-inline-startup',
  candidateOwner: 'vite-bootstrap-runtime',
  fallbackRequired: true,
});

const FALLBACK_ROUTE_MAP = Object.freeze([
  {
    id: 'legacy-init-path',
    owner: 'legacy-app-html-inline-startup',
    role: 'active-production-path',
    mutable: false,
  },
  {
    id: 'candidate-startup-path',
    owner: 'vite-bootstrap-runtime',
    role: 'shadow-candidate-only',
    mutable: false,
  },
  {
    id: 'fallback-path',
    owner: 'legacy-app-html-inline-startup',
    role: 'mandatory-recovery-path',
    mutable: false,
  },
  {
    id: 'shadow-compare-path',
    owner: 'runtime-observability',
    role: 'compare-only',
    mutable: false,
  },
]);

const INIT_EVENT_NAMES = Object.freeze([
  'main-entry-start',
  'bootstrap-shell-module-loaded',
  'startup-boundary-adapter-loaded',
  'bootstrap-ownership-prep-loaded',
  'startup-guard-candidate-registered',
]);

const HYDRATION_RACE_RULES = Object.freeze([
  {
    id: 'state-before-render',
    description: 'state object should exist before render ownership is adopted',
  },
  {
    id: 'roots-before-screen-activation',
    description: 'screen roots should exist before screen activation ownership is adopted',
  },
  {
    id: 'fallback-before-candidate-adoption',
    description: 'legacy fallback must be ready before any startup candidate adoption',
  },
]);

const REQUIRED_FALLBACK_APIS = Object.freeze([
  'init',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'showScreen',
  'switchTab',
  'loadState',
  'saveState',
]);

const REQUIRED_HYDRATION_ROOTS = Object.freeze([
  'app',
  'main-app',
  'screen-home',
  'screen-calendar',
  'screen-insights',
  'screen-record',
  'screen-settings',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getIsolationState() {
  if (!window[FALLBACK_ISOLATION_KEY]) {
    window[FALLBACK_ISOLATION_KEY] = {
      loadedAt: nowIso(),
      mode: FALLBACK_ISOLATION_ADOPTION.mode,
      adoptionEnabled: FALLBACK_ISOLATION_ADOPTION.enabled,
      checks: [],
    };
  }

  return window[FALLBACK_ISOLATION_KEY];
}

function inspectApis() {
  const result = {};

  REQUIRED_FALLBACK_APIS.forEach((name) => {
    result[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });

  return result;
}

function inspectRoots() {
  const result = {};

  REQUIRED_HYDRATION_ROOTS.forEach((id) => {
    result[id] = !!document.getElementById(id);
  });

  return result;
}

function inspectStateShape() {
  const state = window.state;

  return {
    exists: !!state && typeof state === 'object',
    recordsIsArray: Array.isArray(state && state.records),
    hasName: !!(state && state.name),
    hasCycleLength: typeof (state && state.cycleLength) !== 'undefined',
  };
}

function getBootEvents() {
  try {
    if (typeof window.ippoBootSummary === 'function') {
      const summary = window.ippoBootSummary();
      if (summary && Array.isArray(summary.events)) {
        return summary.events;
      }
    }
  } catch (_) {
    // ignore observe-only inspection failures
  }

  return [];
}

function detectDuplicateInitSignals(events) {
  const counts = {};

  events.forEach((event) => {
    const name = event && (event.name || event.event || event.type);
    if (!name) return;
    counts[name] = (counts[name] || 0) + 1;
  });

  const duplicateKnownBootEvents = INIT_EVENT_NAMES.filter((name) => counts[name] > 1);

  return {
    counts,
    duplicateKnownBootEvents,
    duplicateKnownBootEventCount: duplicateKnownBootEvents.length,
    possibleDuplicateInit:
      duplicateKnownBootEvents.length > 0 ||
      (counts['startup-boundary-check'] || 0) > 3 ||
      (counts['bootstrap-shell-check'] || 0) > 3,
  };
}

function detectHydrationRaceSignals({ roots, stateShape, fallbackReady }) {
  const missingRoots = Object.keys(roots).filter((key) => !roots[key]);

  return {
    rules: HYDRATION_RACE_RULES,
    missingRoots,
    stateMissingBeforeRender: !stateShape.exists,
    recordsMissingBeforeRender: stateShape.exists && !stateShape.recordsIsArray,
    fallbackMissingBeforeCandidate: !fallbackReady,
    possibleHydrationRace:
      missingRoots.length > 0 ||
      !stateShape.exists ||
      (stateShape.exists && !stateShape.recordsIsArray) ||
      !fallbackReady,
  };
}

function summarizeRuntimeGraphAvailability() {
  return {
    bootStability: typeof window.ippoBootSummary === 'function',
    bootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    startupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    bootstrapOwnershipPrep: typeof window.ippoBootstrapOwnershipPrepSummary === 'function',
    startupGuardCandidate: typeof window.ippoStartupGuardCandidateSummary === 'function',
    runtimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
  };
}

function summarizeLegacyBootstrapFallbackIsolation() {
  const state = getIsolationState();
  const apis = inspectApis();
  const roots = inspectRoots();
  const stateShape = inspectStateShape();
  const runtimeGraphs = summarizeRuntimeGraphAvailability();
  const missingRuntimeGraphs = Object.keys(runtimeGraphs).filter((key) => !runtimeGraphs[key]);
  const missingApis = Object.keys(apis).filter((key) => !apis[key].exists);
  const fallbackReady = missingApis.length === 0 && runtimeGraphs.bootstrapShell && runtimeGraphs.startupBoundary;
  const bootEvents = getBootEvents();
  const duplicateInitDetection = detectDuplicateInitSignals(bootEvents);
  const hydrationRaceDetection = detectHydrationRaceSignals({ roots, stateShape, fallbackReady });

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      fallbackRequired: FALLBACK_ISOLATION_ADOPTION.fallbackRequired,
      legacyOwner: FALLBACK_ISOLATION_ADOPTION.legacyOwner,
      candidateOwner: FALLBACK_ISOLATION_ADOPTION.candidateOwner,
    },
    fallbackRouteMap: FALLBACK_ROUTE_MAP,
    fallbackApis: apis,
    missingFallbackApis: missingApis,
    hydrationRoots: roots,
    stateShape,
    runtimeGraphs,
    missingRuntimeGraphs,
    fallbackReady,
    duplicateInitDetection,
    hydrationRaceDetection,
    startupSequencingShadowCompare: {
      legacyPath: 'legacy-init-path',
      candidatePath: 'candidate-startup-path',
      comparisonMode: 'visibility-only',
      comparable:
        runtimeGraphs.startupGuardCandidate &&
        runtimeGraphs.bootstrapOwnershipPrep &&
        fallbackReady,
      adoptionAllowed: false,
    },
    safeForPhaseA4Planning:
      !state.adoptionEnabled &&
      fallbackReady &&
      !duplicateInitDetection.possibleDuplicateInit &&
      !hydrationRaceDetection.possibleHydrationRace,
    checks: state.checks.slice(-20),
  };
}

function runLegacyBootstrapFallbackIsolationCheck(reason) {
  const state = getIsolationState();
  const summary = summarizeLegacyBootstrapFallbackIsolation();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    fallbackReady: summary.fallbackReady,
    possibleDuplicateInit: summary.duplicateInitDetection.possibleDuplicateInit,
    possibleHydrationRace: summary.hydrationRaceDetection.possibleHydrationRace,
    safeForPhaseA4Planning: summary.safeForPhaseA4Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('legacy-bootstrap-fallback-isolation-check', {
      reason: reason || 'manual',
      fallbackReady: summary.fallbackReady,
      possibleDuplicateInit: summary.duplicateInitDetection.possibleDuplicateInit,
      possibleHydrationRace: summary.hydrationRaceDetection.possibleHydrationRace,
      safeForPhaseA4Planning: summary.safeForPhaseA4Planning,
    });
  }

  if (!summary.safeForPhaseA4Planning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('legacy-bootstrap-fallback-isolation-not-ready', {
      missingFallbackApis: summary.missingFallbackApis,
      missingRuntimeGraphs: summary.missingRuntimeGraphs,
      duplicateInitDetection: summary.duplicateInitDetection,
      hydrationRaceDetection: summary.hydrationRaceDetection,
    });
  }

  return summarizeLegacyBootstrapFallbackIsolation();
}

window.ippoLegacyBootstrapFallbackIsolationSummary = summarizeLegacyBootstrapFallbackIsolation;
window.ippoRunLegacyBootstrapFallbackIsolationCheck = runLegacyBootstrapFallbackIsolationCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('legacy-bootstrap-fallback-isolation-loaded', {
    mode: FALLBACK_ISOLATION_ADOPTION.mode,
    adoptionEnabled: FALLBACK_ISOLATION_ADOPTION.enabled,
  });
}

export {
  FALLBACK_ISOLATION_ADOPTION,
  FALLBACK_ROUTE_MAP,
  HYDRATION_RACE_RULES,
  summarizeLegacyBootstrapFallbackIsolation,
  runLegacyBootstrapFallbackIsolationCheck,
};
