// ============================================================
// ippo – ui-transition-ownership-runtime.js
//
// Phase C UI drift stabilization:
// track screen/tab transition ownership and suppress stale welcome replay.
//
// IMPORTANT:
// - does not wrap showScreen / switchTab by itself
// - does not change render timing
// - does not mutate DOM
// - suppression is limited to stale welcome/onboarding replay only
// ============================================================

const UI_TRANSITION_KEY = '__IPPO_UI_TRANSITION_OWNERSHIP';
const MAX_EVENTS = 250;
const STALE_WINDOW_MS = 1500;

function nowMs() {
  try {
    return Date.now();
  } catch (_) {
    return 0;
  }
}

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getStore() {
  try {
    if (!window[UI_TRANSITION_KEY]) {
      window[UI_TRANSITION_KEY] = {
        createdAt: nowIso(),
        sequence: 0,
        events: [],
        warnings: [],
        suppressions: [],
        lastTransition: null,
      };
    }
    return window[UI_TRANSITION_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      sequence: 0,
      events: [],
      warnings: [],
      suppressions: [],
      lastTransition: null,
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

function normalizeTarget(value) {
  return String(value || '').trim();
}

function getActiveScreenSnapshot() {
  const snapshot = {
    readyState: typeof document !== 'undefined' ? document.readyState : null,
    activeScreens: [],
    visibleModals: [],
  };

  try {
    snapshot.activeScreens = Array.from(document.querySelectorAll(
      '.screen.active, .page.active, [data-screen].active, [data-active="true"], [aria-hidden="false"]'
    )).slice(0, 12).map(function(node) {
      return {
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className : '',
        dataScreen: node.getAttribute ? node.getAttribute('data-screen') : null,
      };
    });
  } catch (_) {}

  try {
    snapshot.visibleModals = Array.from(document.querySelectorAll(
      '[role="dialog"], .modal, [data-modal]'
    )).filter(function(node) {
      const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
      return !style || (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0');
    }).slice(0, 8).map(function(node) {
      return {
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className : '',
        dataModal: node.getAttribute ? node.getAttribute('data-modal') : null,
      };
    });
  } catch (_) {}

  return snapshot;
}

function hasRecords() {
  try {
    if (Array.isArray(window.state?.records) && window.state.records.length > 0) return true;
    if (typeof window.ippoRecordStorageSnapshot === 'function') {
      const snapshot = window.ippoRecordStorageSnapshot();
      return (snapshot?.activeRecordsLength || 0) > 0;
    }
  } catch (_) {}
  return false;
}

function hasProfile() {
  const state = window.state || {};
  return !!(
    state.userName ||
    state.nickname ||
    state.profile ||
    state.user ||
    state.diseases ||
    state.lastPeriodDate
  );
}

function onboardingCompleted() {
  const state = window.state || {};
  try {
    return !!(
      state.onboardingCompleted ||
      state.hasCompletedOnboarding ||
      state.onboardingDone ||
      localStorage.getItem('ippo_onboarding_completed') === '1' ||
      localStorage.getItem('onboardingCompleted') === '1' ||
      hasRecords() ||
      hasProfile()
    );
  } catch (_) {
    return !!(
      state.onboardingCompleted ||
      state.hasCompletedOnboarding ||
      state.onboardingDone ||
      hasRecords() ||
      hasProfile()
    );
  }
}

function tracePersistence(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('ui-transition:' + phase, payload);
    }
  } catch (_) {}
}

function markUiTransition(phase, payload = {}) {
  const store = getStore();
  const atMs = nowMs();
  const target = normalizeTarget(payload.target || payload.screen || payload.tab || payload.name || '');
  const source = payload.source || 'unknown';
  const event = {
    id: ++store.sequence,
    phase: phase || 'unknown',
    target,
    source,
    at: nowIso(),
    ts: atMs,
    previous: store.lastTransition,
    snapshot: getActiveScreenSnapshot(),
    detail: payload.detail || null,
  };

  const previous = store.lastTransition;
  if (
    previous
    && previous.target
    && target
    && previous.target !== target
    && atMs - previous.ts >= 0
    && atMs - previous.ts <= STALE_WINDOW_MS
  ) {
    const warning = {
      type: 'transition-overwritten-candidate',
      previous,
      current: {
        id: event.id,
        target,
        source,
        phase: event.phase,
        ts: atMs,
      },
      deltaMs: atMs - previous.ts,
      windowMs: STALE_WINDOW_MS,
      at: event.at,
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    tracePersistence('transition-overwritten-candidate', warning);
  }

  pushLimited(store.events, event, MAX_EVENTS);
  store.lastTransition = {
    id: event.id,
    target,
    source,
    phase: event.phase,
    ts: atMs,
    at: event.at,
  };

  tracePersistence(phase || 'unknown', event);
  return event;
}

function isWelcomeTarget(target) {
  return /(welcome|onboarding|start)/i.test(String(target || ''));
}

function shouldSuppressWelcomeReplay(payload = {}) {
  const target = normalizeTarget(payload.target || payload.screen || payload.tab || payload.name || '');
  const store = getStore();
  const completed = onboardingCompleted();
  const previous = store.lastTransition;

  const suppress = isWelcomeTarget(target)
    && completed
    && previous
    && !isWelcomeTarget(previous.target);

  if (suppress) {
    const suppression = {
      type: 'welcome-replay-suppressed',
      target,
      source: payload.source || 'unknown',
      previous,
      at: nowIso(),
      reason: 'completed-user-cannot-replay-welcome',
      state: {
        onboardingCompleted: completed,
        hasRecords: hasRecords(),
        hasProfile: hasProfile(),
      },
    };
    pushLimited(store.suppressions, suppression, MAX_EVENTS);
    tracePersistence('welcome-replay-suppressed', suppression);
    return suppression;
  }

  return false;
}

function summarizeUiTransitionOwnership() {
  const store = getStore();
  return {
    eventCount: store.events.length,
    warningCount: store.warnings.length,
    suppressionCount: store.suppressions.length,
    lastTransition: store.lastTransition,
    recentEvents: store.events.slice(-12),
    recentWarnings: store.warnings.slice(-12),
    recentSuppressions: store.suppressions.slice(-12),
    snapshot: getActiveScreenSnapshot(),
    preservedConstraints: {
      noShowScreenWrapping: true,
      noSwitchTabWrapping: true,
      noDomMutation: true,
      noRenderTimingChange: true,
      suppressionLimitedToWelcomeReplay: true,
    },
  };
}

function resetUiTransitionOwnership() {
  const store = getStore();
  store.sequence = 0;
  store.events = [];
  store.warnings = [];
  store.suppressions = [];
  store.lastTransition = null;
  return summarizeUiTransitionOwnership();
}

window.ippoMarkUiTransition = markUiTransition;
window.ippoShouldSuppressWelcomeReplay = shouldSuppressWelcomeReplay;
window.ippoUiTransitionOwnershipSummary = summarizeUiTransitionOwnership;
window.ippoResetUiTransitionOwnership = resetUiTransitionOwnership;

export {
  markUiTransition,
  shouldSuppressWelcomeReplay,
  summarizeUiTransitionOwnership,
  resetUiTransitionOwnership,
};
