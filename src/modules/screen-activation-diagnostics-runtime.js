// ============================================================
// ippo – screen-activation-diagnostics-runtime.js
//
// Phase A stabilization:
// screen activation / duplicate activation visibility.
//
// IMPORTANT:
// - observability only
// - does not wrap showScreen / switchTab
// - does not change back navigation
// - does not mutate DOM classes
// - does not change render timing
// ============================================================

const SCREEN_DIAGNOSTICS_KEY = '__IPPO_SCREEN_ACTIVATION_DIAGNOSTICS';
const MAX_EVENTS = 250;
const DUPLICATE_WINDOW_MS = 1000;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function nowMs() {
  try {
    return Date.now();
  } catch (_) {
    return 0;
  }
}

function getStore() {
  try {
    if (!window[SCREEN_DIAGNOSTICS_KEY]) {
      window[SCREEN_DIAGNOSTICS_KEY] = {
        createdAt: nowIso(),
        events: [],
        warnings: [],
      };
    }
    return window[SCREEN_DIAGNOSTICS_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      events: [],
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

function getScreenSnapshot() {
  const snapshot = {
    hasShowScreen: typeof window.showScreen === 'function',
    hasSwitchTab: typeof window.switchTab === 'function',
    readyState: typeof document !== 'undefined' ? document.readyState : null,
    activeCandidates: [],
  };

  try {
    const candidates = Array.from(document.querySelectorAll(
      '.screen.active, .page.active, [data-screen].active, [data-active="true"], [aria-hidden="false"]'
    ));

    snapshot.activeCandidates = candidates.slice(0, 12).map(function(node) {
      return {
        id: node.id || null,
        tag: node.tagName || null,
        className: typeof node.className === 'string' ? node.className : '',
        dataScreen: node.getAttribute ? node.getAttribute('data-screen') : null,
      };
    });
  } catch (_) {}

  return snapshot;
}

function traceScreenPhase(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('screen:' + phase, payload);
    }
  } catch (_) {}
}

function normalizeScreenName(payload) {
  if (!payload || typeof payload !== 'object') return 'unknown';
  return payload.screen || payload.screenName || payload.tab || payload.target || payload.name || 'unknown';
}

function markScreenActivationPhase(phase, payload = {}) {
  const store = getStore();
  const ts = nowMs();
  const screen = normalizeScreenName(payload);
  const event = {
    area: 'screen-activation',
    phase: phase || 'unknown',
    screen,
    at: nowIso(),
    ts,
    source: payload.source || null,
    snapshot: getScreenSnapshot(),
    detail: payload.detail || null,
  };

  const duplicate = store.events.find(function(item) {
    return item
      && item.phase === event.phase
      && item.screen === event.screen
      && typeof item.ts === 'number'
      && ts - item.ts >= 0
      && ts - item.ts <= DUPLICATE_WINDOW_MS;
  });

  pushLimited(store.events, event, MAX_EVENTS);
  traceScreenPhase(event.phase, event);

  if (duplicate) {
    const warning = {
      type: 'duplicate-screen-activation-candidate',
      phase: event.phase,
      screen: event.screen,
      at: event.at,
      deltaMs: ts - duplicate.ts,
      windowMs: DUPLICATE_WINDOW_MS,
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    traceScreenPhase('duplicate-activation-candidate', warning);
  }

  if (event.snapshot.activeCandidates.length > 1) {
    const warning = {
      type: 'multiple-active-screen-candidates',
      at: event.at,
      count: event.snapshot.activeCandidates.length,
      candidates: event.snapshot.activeCandidates,
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    traceScreenPhase('multiple-active-candidates', warning);
  }

  return event;
}

function checkScreenActivationReadiness(source = 'manual') {
  return markScreenActivationPhase('screen-activation-readiness', {
    source,
    detail: getScreenSnapshot(),
  });
}

function summarizeScreenActivationDiagnosticsRuntime() {
  const store = getStore();

  return {
    eventCount: store.events.length,
    warningCount: store.warnings.length,
    recentEvents: store.events.slice(-12),
    recentWarnings: store.warnings.slice(-12),
    snapshot: getScreenSnapshot(),
    preservedConstraints: {
      noShowScreenWrapping: true,
      noSwitchTabWrapping: true,
      noBackNavigationChange: true,
      noDomClassMutation: true,
      noRenderTimingChange: true,
    },
  };
}

function resetScreenActivationDiagnosticsRuntime() {
  const store = getStore();
  store.events = [];
  store.warnings = [];
  return summarizeScreenActivationDiagnosticsRuntime();
}

window.ippoMarkScreenActivationPhase = markScreenActivationPhase;
window.ippoCheckScreenActivationReadiness = checkScreenActivationReadiness;
window.ippoScreenActivationDiagnosticsRuntimeSummary = summarizeScreenActivationDiagnosticsRuntime;
window.ippoResetScreenActivationDiagnosticsRuntime = resetScreenActivationDiagnosticsRuntime;

export {
  markScreenActivationPhase,
  checkScreenActivationReadiness,
  summarizeScreenActivationDiagnosticsRuntime,
  resetScreenActivationDiagnosticsRuntime,
};
