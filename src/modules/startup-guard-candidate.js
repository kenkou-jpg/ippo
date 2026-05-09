// ============================================================
// ippo – startup-guard-candidate.js
//
// Phase A-2:
// DOMContentLoaded / startup guard extraction candidate.
//
// 重要:
// - observer-only
// - adoption disabled by default
// - legacy fallback mandatory
// - init() replacement prohibited
// - render order changes prohibited
// - save/sync/Supabase changes prohibited
// ============================================================

const STARTUP_GUARD_CANDIDATE_KEY = '__ippoStartupGuardCandidate';

const STARTUP_GUARD_ADOPTION = {
  enabled: false,
  mode: 'shadow-only',
  activeOwner: 'legacy-app-html-inline-startup',
  candidateOwner: 'vite-startup-guard-module',
  fallbackRequired: true,
};

const STARTUP_GUARD_PHASES = [
  'boot-module-load',
  'dom-ready-check',
  'startup-api-check',
  'state-shape-check',
  'hydration-root-check',
  'legacy-fallback-check',
  'candidate-readiness-check',
];

const REQUIRED_STARTUP_APIS = [
  'init',
  'showScreen',
  'switchTab',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'saveState',
  'loadState',
];

const REQUIRED_DOM_ROOTS = [
  'app',
  'main-app',
  'screen-home',
  'screen-calendar',
  'screen-insights',
  'screen-record',
  'screen-settings',
];

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
  };
}

function summarizeStartupGuardCandidate() {
  const state = getCandidateState();
  const apis = inspectApis();
  const roots = inspectRoots();
  const stateShape = inspectStateShape();

  const missingApis = Object.keys(apis).filter((key) => !apis[key].exists);
  const missingRoots = Object.keys(roots).filter((key) => !roots[key]);

  const legacyFallbackReady =
    typeof window.ippoStartupBoundarySummary === 'function' &&
    typeof window.ippoBootstrapShellSummary === 'function';

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
    legacyFallbackReady,
    shadowCompareReady:
      missingApis.length === 0 &&
      missingRoots.length === 0 &&
      stateShape.exists &&
      stateShape.recordsIsArray,
    safeForObserverOnlyDOMContentLoadedCandidate:
      !state.adoptionEnabled &&
      legacyFallbackReady &&
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
    safeForObserverOnlyDOMContentLoadedCandidate:
      summary.safeForObserverOnlyDOMContentLoadedCandidate,
    missingStartupApis: summary.missingStartupApis,
    missingDomRoots: summary.missingDomRoots,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-guard-candidate-check', {
      reason: reason || 'manual',
      shadowCompareReady: summary.shadowCompareReady,
      safeForObserverOnlyDOMContentLoadedCandidate:
        summary.safeForObserverOnlyDOMContentLoadedCandidate,
      missingStartupApiCount: summary.missingStartupApis.length,
      missingDomRootCount: summary.missingDomRoots.length,
    });
  }

  return summarizeStartupGuardCandidate();
}

window.ippoStartupGuardCandidateSummary = summarizeStartupGuardCandidate;
window.ippoRunStartupGuardCandidateCheck = runStartupGuardCandidateCheck;

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => runStartupGuardCandidateCheck('dom-content-loaded-shadow-candidate'),
    { once: true }
  );
} else {
  window.setTimeout(
    () => runStartupGuardCandidateCheck('module-loaded-after-dom'),
    0
  );
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-guard-candidate-loaded');
}

export {
  STARTUP_GUARD_ADOPTION,
  STARTUP_GUARD_PHASES,
  summarizeStartupGuardCandidate,
  runStartupGuardCandidateCheck,
};
