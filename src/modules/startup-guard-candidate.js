// ============================================================
// ippo – startup-guard-candidate.js
//
// Phase A-2b / A-3 prep:
// DOMContentLoaded / startup guard extraction candidate observer.
//
// This module is now safe to import from src/main.js because it remains:
// - observe-only
// - adoption disabled by default
// - no startup ownership adoption
// - no init() replacement
// - no render / hydration / save / sync / Supabase changes
// ============================================================

const STARTUP_GUARD_CANDIDATE_KEY = '__ippoStartupGuardCandidate';

const STARTUP_GUARD_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'main-entry-observer-only',
  activeOwner: 'legacy-app-html-inline-startup',
  candidateOwner: 'vite-startup-guard-module',
  fallbackRequired: true,
});

const STARTUP_GUARD_PHASES = Object.freeze([
  'module-load-observed',
  'main-entry-wiring-observed',
  'dom-ready-observed',
  'startup-api-readiness-observed',
  'state-shape-observed',
  'hydration-root-readiness-observed',
  'legacy-fallback-readiness-observed',
  'candidate-readiness-observed',
]);

const REQUIRED_STARTUP_APIS = Object.freeze([
  'init',
  'showScreen',
  'switchTab',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'updateStats',
  'saveState',
  'loadState',
]);

const REQUIRED_DOM_ROOTS = Object.freeze([
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

function getCandidateState() {
  if (!window[STARTUP_GUARD_CANDIDATE_KEY]) {
    window[STARTUP_GUARD_CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      adoptionEnabled: STARTUP_GUARD_ADOPTION.enabled,
      mode: STARTUP_GUARD_ADOPTION.mode,
      checks: [],
    };
  }

  return window[STARTUP_GUARD_CANDIDATE_KEY];
}

function inspectApis() {
  const result = {};

  REQUIRED_STARTUP_APIS.forEach((name) => {
    result[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });

  return result;
}

function inspectRoots() {
  const result = {};

  REQUIRED_DOM_ROOTS.forEach((id) => {
    result[id] = !!document.getElementById(id);
  });

  return result;
}

function inspectStateShape() {
  const state = window.state;

  return {
    exists: !!state && typeof state === 'object',
    recordsIsArray: Array.isArray(state && state.records),
    hasSettings: !!(state && state.settings),
    hasCycleLength: typeof (state && state.cycleLength) !== 'undefined',
    hasLastPeriodDate: typeof (state && state.lastPeriodDate) !== 'undefined',
  };
}

function summarizeStartupGuardCandidate() {
  const state = getCandidateState();
  const apis = inspectApis();
  const roots = inspectRoots();
  const stateShape = inspectStateShape();

  const missingApis = Object.keys(apis).filter((key) => !apis[key].exists);
  const missingRoots = Object.keys(roots).filter((key) => !roots[key]);

  const existingRuntimeGraphs = {
    bootStability: typeof window.ippoBootSummary === 'function',
    bootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    startupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    bootstrapOwnershipPrep: typeof window.ippoBootstrapOwnershipPrepSummary === 'function',
    runtimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
  };

  const missingRuntimeGraphs = Object.keys(existingRuntimeGraphs).filter(
    (key) => !existingRuntimeGraphs[key]
  );

  const legacyFallback = {
    required: STARTUP_GUARD_ADOPTION.fallbackRequired,
    owner: STARTUP_GUARD_ADOPTION.activeOwner,
    bootstrapShellReady: existingRuntimeGraphs.bootstrapShell,
    startupBoundaryReady: existingRuntimeGraphs.startupBoundary,
    ownershipPrepReady: existingRuntimeGraphs.bootstrapOwnershipPrep,
    ready:
      existingRuntimeGraphs.bootstrapShell &&
      existingRuntimeGraphs.startupBoundary &&
      existingRuntimeGraphs.bootstrapOwnershipPrep,
  };

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      fallbackRequired: STARTUP_GUARD_ADOPTION.fallbackRequired,
      activeOwner: STARTUP_GUARD_ADOPTION.activeOwner,
      candidateOwner: STARTUP_GUARD_ADOPTION.candidateOwner,
    },
    phases: STARTUP_GUARD_PHASES,
    startupApis: apis,
    missingStartupApis: missingApis,
    domRoots: roots,
    missingDomRoots: missingRoots,
    stateShape,
    existingRuntimeGraphs,
    missingRuntimeGraphs,
    legacyFallback,
    legacyFallbackReady: legacyFallback.ready,
    shadowCompareReady:
      missingApis.length === 0 &&
      missingRoots.length === 0 &&
      stateShape.exists &&
      stateShape.recordsIsArray,
    safeForObserverOnlyMainEntryWiring:
      !state.adoptionEnabled &&
      legacyFallback.ready &&
      missingApis.length === 0,
    unsafeForRealAdoption: true,
    nextPhaseProposal: {
      phase: 'Phase A-3',
      target: 'legacy bootstrap fallback isolation',
      constraints: [
        'legacy init remains active',
        'candidate remains shadow-only',
        'no render ownership transfer',
        'no hydration ownership transfer',
        'no persistence ownership transfer',
        'fallback path remains mandatory',
      ],
    },
    checks: state.checks.slice(-20),
  };
}

function runStartupGuardCandidateCheck(reason) {
  const state = getCandidateState();
  const summary = summarizeStartupGuardCandidate();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    shadowCompareReady: summary.shadowCompareReady,
    safeForObserverOnlyMainEntryWiring: summary.safeForObserverOnlyMainEntryWiring,
    legacyFallbackReady: summary.legacyFallbackReady,
    missingStartupApis: summary.missingStartupApis,
    missingDomRoots: summary.missingDomRoots,
    missingRuntimeGraphs: summary.missingRuntimeGraphs,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-guard-candidate-check', {
      reason: reason || 'manual',
      shadowCompareReady: summary.shadowCompareReady,
      safeForObserverOnlyMainEntryWiring: summary.safeForObserverOnlyMainEntryWiring,
      legacyFallbackReady: summary.legacyFallbackReady,
      missingStartupApiCount: summary.missingStartupApis.length,
      missingDomRootCount: summary.missingDomRoots.length,
      missingRuntimeGraphCount: summary.missingRuntimeGraphs.length,
    });
  }

  return summarizeStartupGuardCandidate();
}

function registerStartupGuardCandidate() {
  window.ippoStartupGuardCandidateSummary = summarizeStartupGuardCandidate;
  window.ippoRunStartupGuardCandidateCheck = runStartupGuardCandidateCheck;

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-guard-candidate-registered', {
      mode: STARTUP_GUARD_ADOPTION.mode,
      adoptionEnabled: STARTUP_GUARD_ADOPTION.enabled,
      fallbackRequired: STARTUP_GUARD_ADOPTION.fallbackRequired,
    });
  }
}

registerStartupGuardCandidate();

export {
  STARTUP_GUARD_ADOPTION,
  STARTUP_GUARD_PHASES,
  REQUIRED_STARTUP_APIS,
  REQUIRED_DOM_ROOTS,
  summarizeStartupGuardCandidate,
  runStartupGuardCandidateCheck,
  registerStartupGuardCandidate,
};
