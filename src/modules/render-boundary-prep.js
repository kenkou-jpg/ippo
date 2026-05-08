// ============================================================
// ippo – render-boundary-prep.js
//
// screen activation / render boundary / partial activation
// preparation layer.
//
// observe-only.
// ============================================================

const RENDER_BOUNDARY_KEY = '__ippoRenderBoundaryPrep';

const RENDER_BOUNDARIES = [
  {
    screen: 'home',
    renderers: ['renderHome', 'updateStats'],
    roots: ['screen-home', 'home-week-row'],
  },
  {
    screen: 'calendar',
    renderers: ['renderCalendar'],
    roots: ['screen-calendar', 'calGrid'],
  },
  {
    screen: 'insights',
    renderers: ['renderInsights'],
    roots: ['screen-insights', 'insight-total'],
  },
  {
    screen: 'record',
    renderers: ['openRecordScreen'],
    roots: ['screen-record'],
  },
  {
    screen: 'settings',
    renderers: [],
    roots: ['screen-settings'],
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
  if (!window[RENDER_BOUNDARY_KEY]) {
    window[RENDER_BOUNDARY_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      partialActivationEnabled: false,
      checks: [],
    };
  }

  return window[RENDER_BOUNDARY_KEY];
}

function inspectBoundary(boundary) {
  const renderers = {};
  boundary.renderers.forEach((name) => {
    renderers[name] = typeof window[name] === 'function';
  });

  const roots = {};
  boundary.roots.forEach((id) => {
    roots[id] = !!document.getElementById(id);
  });

  const missingRenderers = Object.keys(renderers).filter((key) => !renderers[key]);
  const missingRoots = Object.keys(roots).filter((key) => !roots[key]);

  return {
    screen: boundary.screen,
    renderers,
    roots,
    missingRenderers,
    missingRoots,
    ready: missingRenderers.length === 0 && missingRoots.length === 0,
  };
}

function summarizeRenderBoundaries() {
  const state = getState();
  const boundaries = RENDER_BOUNDARIES.map(inspectBoundary);
  const notReady = boundaries.filter((item) => !item.ready);

  const deferredHydration = typeof window.ippoDeferredHydrationPrepSummary === 'function'
    ? window.ippoDeferredHydrationPrepSummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    partialActivationEnabled: !!state.partialActivationEnabled,
    boundaries,
    notReadyScreens: notReady.map((item) => item.screen),
    allBoundariesReady: notReady.length === 0,
    deferredHydrationReady: !!deferredHydration,
    safeForPartialActivationCandidate: !!(
      deferredHydration &&
      deferredHydration.safeForDeferredHydrationCandidate &&
      notReady.length === 0
    ),
    checks: state.checks.slice(-40),
  };
}

function runRenderBoundaryCheck(reason) {
  const state = getState();
  const summary = summarizeRenderBoundaries();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allBoundariesReady: summary.allBoundariesReady,
    safeForPartialActivationCandidate: summary.safeForPartialActivationCandidate,
    notReadyScreens: summary.notReadyScreens,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('render-boundary-check', {
      reason: reason || 'manual',
      allBoundariesReady: summary.allBoundariesReady,
      safeForPartialActivationCandidate: summary.safeForPartialActivationCandidate,
      notReadyScreens: summary.notReadyScreens,
    });
  }

  return summarizeRenderBoundaries();
}

window.ippoRenderBoundarySummary = summarizeRenderBoundaries;
window.ippoRunRenderBoundaryCheck = runRenderBoundaryCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runRenderBoundaryCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runRenderBoundaryCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('render-boundary-prep-loaded');
}

export {
  RENDER_BOUNDARIES,
  summarizeRenderBoundaries,
  runRenderBoundaryCheck,
};
