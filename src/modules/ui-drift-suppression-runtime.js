// ============================================================
// ippo – ui-drift-suppression-runtime.js
//
// Phase C UI drift stabilization:
// modal/navigation replay diagnostics and guarded suppression helpers.
//
// IMPORTANT:
// - does not wrap showScreen / switchTab by itself
// - does not rewrite browser history
// - does not change render timing
// - only exposes guarded helpers for stale replay suppression
// ============================================================

const UI_DRIFT_KEY = '__IPPO_UI_DRIFT_SUPPRESSION';
const MAX_EVENTS = 250;
const MODAL_REPLAY_WINDOW_MS = 2000;
const NAV_REPLAY_WINDOW_MS = 2000;

function nowMs() {
  try { return Date.now(); } catch (_) { return 0; }
}

function nowIso() {
  try { return new Date().toISOString(); } catch (_) { return null; }
}

function getStore() {
  try {
    if (!window[UI_DRIFT_KEY]) {
      window[UI_DRIFT_KEY] = {
        createdAt: nowIso(),
        events: [],
        warnings: [],
        suppressions: [],
        lastModal: null,
        lastNavigation: null,
        lastVisibleModals: [],
        listenersInstalled: false,
        modalObserverInstalled: false,
      };
    }
    return window[UI_DRIFT_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      events: [],
      warnings: [],
      suppressions: [],
      lastModal: null,
      lastNavigation: null,
      lastVisibleModals: [],
      listenersInstalled: false,
      modalObserverInstalled: false,
    };
  }
}

function pushLimited(list, value, limit) {
  try {
    list.push(value);
    if (list.length > limit) list.splice(0, list.length - limit);
  } catch (_) {}
}

function trace(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('ui-drift:' + phase, payload);
    }
  } catch (_) {}
}

function markTransition(phase, payload) {
  try {
    if (typeof window.ippoMarkUiTransition === 'function') {
      window.ippoMarkUiTransition('ui-drift:' + phase, payload || {});
    }
  } catch (_) {}
}

function getActiveScreenIds() {
  try {
    return Array.from(document.querySelectorAll('.screen.active, .page.active, [data-screen].active'))
      .map(function(node) { return node.id || node.getAttribute('data-screen') || ''; })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function getVisibleModalIds() {
  try {
    return Array.from(document.querySelectorAll('[role="dialog"], .modal, [data-modal]'))
      .filter(function(node) {
        const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
        return !style || (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
      })
      .map(function(node) { return node.id || node.getAttribute('data-modal') || ''; })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function snapshot() {
  return {
    at: nowIso(),
    readyState: typeof document !== 'undefined' ? document.readyState : null,
    activeScreens: getActiveScreenIds(),
    visibleModals: getVisibleModalIds(),
    historyLength: typeof history !== 'undefined' ? history.length : null,
    lastTransition: typeof window.ippoUiTransitionOwnershipSummary === 'function'
      ? window.ippoUiTransitionOwnershipSummary().lastTransition
      : null,
  };
}

function markModalPhase(phase, payload = {}) {
  const store = getStore();
  const event = {
    area: 'modal',
    phase: phase || 'unknown',
    modalId: payload.modalId || payload.id || null,
    source: payload.source || 'unknown',
    at: nowIso(),
    ts: nowMs(),
    snapshot: snapshot(),
    detail: payload.detail || null,
  };

  pushLimited(store.events, event, MAX_EVENTS);
  store.lastModal = event;
  trace('modal:' + event.phase, event);
  markTransition('modal:' + event.phase, {
    target: event.modalId || 'modal',
    source: event.source,
    detail: event.detail,
  });
  return event;
}

function shouldSuppressModalReplay(payload = {}) {
  const store = getStore();
  const modalId = payload.modalId || payload.id || null;
  const source = payload.source || 'unknown';
  const current = nowMs();
  const lastModal = store.lastModal;

  const suppress = !!(
    modalId
    && lastModal
    && lastModal.phase === 'close'
    && lastModal.modalId === modalId
    && current - lastModal.ts >= 0
    && current - lastModal.ts <= MODAL_REPLAY_WINDOW_MS
  );

  if (!suppress) return false;

  const suppression = {
    type: 'modal-replay-suppressed',
    modalId,
    source,
    previous: lastModal,
    at: nowIso(),
    deltaMs: current - lastModal.ts,
    windowMs: MODAL_REPLAY_WINDOW_MS,
    snapshot: snapshot(),
  };

  pushLimited(store.suppressions, suppression, MAX_EVENTS);
  trace('modal-replay-suppressed', suppression);
  markTransition('modal-replay-suppressed', {
    target: modalId,
    source,
    detail: suppression,
  });
  return suppression;
}

function diffModalVisibility(previous, next) {
  const oldSet = new Set(Array.isArray(previous) ? previous : []);
  const newSet = new Set(Array.isArray(next) ? next : []);
  return {
    opened: Array.from(newSet).filter(function(id) { return !oldSet.has(id); }),
    closed: Array.from(oldSet).filter(function(id) { return !newSet.has(id); }),
  };
}

function observeModalVisibility(source) {
  const store = getStore();
  const current = getVisibleModalIds();
  const diff = diffModalVisibility(store.lastVisibleModals, current);

  diff.opened.forEach(function(modalId) {
    const suppressed = shouldSuppressModalReplay({ modalId, source: source || 'modal-observer' });
    if (!suppressed) {
      markModalPhase('open', { modalId, source: source || 'modal-observer' });
    }
  });

  diff.closed.forEach(function(modalId) {
    markModalPhase('close', { modalId, source: source || 'modal-observer' });
  });

  store.lastVisibleModals = current;
  return { current, diff };
}

function markNavigationPhase(phase, payload = {}) {
  const store = getStore();
  const event = {
    area: 'navigation',
    phase: phase || 'unknown',
    source: payload.source || 'unknown',
    target: payload.target || null,
    at: nowIso(),
    ts: nowMs(),
    snapshot: snapshot(),
    detail: payload.detail || null,
  };

  pushLimited(store.events, event, MAX_EVENTS);
  store.lastNavigation = event;
  trace('navigation:' + event.phase, event);
  markTransition('navigation:' + event.phase, {
    target: event.target || event.phase,
    source: event.source,
    detail: event.detail,
  });
  return event;
}

function shouldSuppressNavigationReplay(payload = {}) {
  const store = getStore();
  const target = String(payload.target || '').trim();
  const source = payload.source || 'unknown';
  const current = nowMs();
  const lastNavigation = store.lastNavigation;
  const ownership = typeof window.ippoUiTransitionOwnershipSummary === 'function'
    ? window.ippoUiTransitionOwnershipSummary()
    : null;
  const lastTransition = ownership?.lastTransition || null;

  const suppress = !!(
    target
    && lastNavigation
    && /popstate|back|history/i.test(lastNavigation.phase + ' ' + lastNavigation.source)
    && lastTransition
    && lastTransition.target
    && lastTransition.target !== target
    && current - lastNavigation.ts >= 0
    && current - lastNavigation.ts <= NAV_REPLAY_WINDOW_MS
  );

  if (!suppress) return false;

  const suppression = {
    type: 'navigation-replay-suppressed',
    target,
    source,
    previousNavigation: lastNavigation,
    lastTransition,
    at: nowIso(),
    deltaMs: current - lastNavigation.ts,
    windowMs: NAV_REPLAY_WINDOW_MS,
    snapshot: snapshot(),
  };

  pushLimited(store.suppressions, suppression, MAX_EVENTS);
  trace('navigation-replay-suppressed', suppression);
  markTransition('navigation-replay-suppressed', {
    target,
    source,
    detail: suppression,
  });
  return suppression;
}

function installNavigationListeners() {
  const store = getStore();
  if (store.listenersInstalled) return summarizeUiDriftSuppression();

  try {
    window.addEventListener('popstate', function(event) {
      markNavigationPhase('popstate', {
        source: 'browser',
        detail: {
          state: event && event.state ? event.state : null,
        },
      });
    });
    store.listenersInstalled = true;
    markNavigationPhase('listeners-installed', { source: 'ui-drift-suppression-runtime' });
  } catch (error) {
    const warning = {
      type: 'navigation-listener-install-failed',
      at: nowIso(),
      message: error && error.message ? error.message : String(error),
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    trace('listener-install-failed', warning);
  }

  return summarizeUiDriftSuppression();
}

function installModalObserver() {
  const store = getStore();
  if (store.modalObserverInstalled) return summarizeUiDriftSuppression();

  try {
    store.lastVisibleModals = getVisibleModalIds();
    const observer = new MutationObserver(function() {
      observeModalVisibility('modal-mutation-observer');
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden', 'open'],
    });

    store.modalObserverInstalled = true;
    observeModalVisibility('modal-observer-installed');
  } catch (error) {
    const warning = {
      type: 'modal-observer-install-failed',
      at: nowIso(),
      message: error && error.message ? error.message : String(error),
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    trace('modal-observer-install-failed', warning);
  }

  return summarizeUiDriftSuppression();
}

function summarizeUiDriftSuppression() {
  const store = getStore();
  return {
    eventCount: store.events.length,
    warningCount: store.warnings.length,
    suppressionCount: store.suppressions.length,
    lastModal: store.lastModal,
    lastNavigation: store.lastNavigation,
    listenersInstalled: store.listenersInstalled === true,
    modalObserverInstalled: store.modalObserverInstalled === true,
    recentEvents: store.events.slice(-12),
    recentWarnings: store.warnings.slice(-12),
    recentSuppressions: store.suppressions.slice(-12),
    snapshot: snapshot(),
    preservedConstraints: {
      noShowScreenWrapping: true,
      noSwitchTabWrapping: true,
      noHistoryRewrite: true,
      noRenderTimingChange: true,
      guardedReplaySuppressionOnly: true,
    },
  };
}

function resetUiDriftSuppression() {
  const store = getStore();
  store.events = [];
  store.warnings = [];
  store.suppressions = [];
  store.lastModal = null;
  store.lastNavigation = null;
  store.lastVisibleModals = getVisibleModalIds();
  return summarizeUiDriftSuppression();
}

installNavigationListeners();
installModalObserver();

window.ippoMarkModalPhase = markModalPhase;
window.ippoShouldSuppressModalReplay = shouldSuppressModalReplay;
window.ippoObserveModalVisibility = observeModalVisibility;
window.ippoMarkNavigationPhase = markNavigationPhase;
window.ippoShouldSuppressNavigationReplay = shouldSuppressNavigationReplay;
window.ippoUiDriftSuppressionSummary = summarizeUiDriftSuppression;
window.ippoResetUiDriftSuppression = resetUiDriftSuppression;

export {
  markModalPhase,
  shouldSuppressModalReplay,
  observeModalVisibility,
  markNavigationPhase,
  shouldSuppressNavigationReplay,
  summarizeUiDriftSuppression,
  resetUiDriftSuppression,
};
