// ============================================================
// ippo – screen-activation-prep.js
//
// screen-level activation / lazy screen ownership の準備 layer。
//
// observe-only.
// ============================================================

const SCREEN_ACTIVATION_KEY = '__ippoScreenActivationPrep';

const SCREEN_ACTIVATION_TARGETS = [
  {
    name: 'home',
    rootId: 'screen-home',
    activationApis: ['switchTab', 'showScreen', 'renderHome'],
  },
  {
    name: 'calendar',
    rootId: 'screen-calendar',
    activationApis: ['switchTab', 'showScreen', 'renderCalendar'],
  },
  {
    name: 'insights',
    rootId: 'screen-insights',
    activationApis: ['switchTab', 'showScreen', 'renderInsights'],
  },
  {
    name: 'record',
    rootId: 'screen-record',
    activationApis: ['openRecordScreen'],
  },
  {
    name: 'settings',
    rootId: 'screen-settings',
    activationApis: ['switchTab', 'showScreen'],
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
  if (!window[SCREEN_ACTIVATION_KEY]) {
    window[SCREEN_ACTIVATION_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      lazyActivationEnabled: false,
      checks: [],
    };
  }
  return window[SCREEN_ACTIVATION_KEY];
}

function inspectTarget(target) {
  const apis = {};
  target.activationApis.forEach((name) => {
    apis[name] = typeof window[name] === 'function';
  });

  const missingApis = Object.keys(apis).filter((name) => !apis[name]);
  const rootExists = !!document.getElementById(target.rootId);

  return {
    name: target.name,
    rootId: target.rootId,
    rootExists,
    activationApis: apis,
    missingApis,
    ready: rootExists && missingApis.length === 0,
  };
}

function summarizeScreenActivationPrep() {
  const state = getState();
  const targets = SCREEN_ACTIVATION_TARGETS.map(inspectTarget);
  const notReady = targets.filter((target) => !target.ready);

  const renderBoundary = typeof window.ippoRenderBoundarySummary === 'function'
    ? window.ippoRenderBoundarySummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    lazyActivationEnabled: !!state.lazyActivationEnabled,
    targets,
    notReadyScreens: notReady.map((target) => target.name),
    allScreensReady: notReady.length === 0,
    renderBoundaryReady: !!renderBoundary,
    safeForLazyScreenActivationCandidate: !!(
      renderBoundary &&
      renderBoundary.safeForPartialActivationCandidate &&
      notReady.length === 0
    ),
    checks: state.checks.slice(-40),
  };
}

function runScreenActivationPrepCheck(reason) {
  const state = getState();
  const summary = summarizeScreenActivationPrep();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allScreensReady: summary.allScreensReady,
    safeForLazyScreenActivationCandidate: summary.safeForLazyScreenActivationCandidate,
    notReadyScreens: summary.notReadyScreens,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('screen-activation-prep-check', {
      reason: reason || 'manual',
      allScreensReady: summary.allScreensReady,
      safeForLazyScreenActivationCandidate: summary.safeForLazyScreenActivationCandidate,
      notReadyScreens: summary.notReadyScreens,
    });
  }

  return summarizeScreenActivationPrep();
}

window.ippoScreenActivationPrepSummary = summarizeScreenActivationPrep;
window.ippoRunScreenActivationPrepCheck = runScreenActivationPrepCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runScreenActivationPrepCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runScreenActivationPrepCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('screen-activation-prep-loaded');
}

export {
  SCREEN_ACTIVATION_TARGETS,
  summarizeScreenActivationPrep,
  runScreenActivationPrepCheck,
};
