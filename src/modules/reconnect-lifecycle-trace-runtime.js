// ============================================================
// ippo – reconnect-lifecycle-trace-runtime.js
//
// Phase A stabilization:
// offline/online reconnect visibility without changing sync.
//
// IMPORTANT:
// - observability only
// - does not call cloudBackupAll
// - does not retry sync
// - does not queue writes
// - does not change offline fallback behavior
// ============================================================

const RECONNECT_TRACE_KEY = '__IPPO_RECONNECT_LIFECYCLE_TRACE';
const MAX_EVENTS = 200;

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
    if (!window[RECONNECT_TRACE_KEY]) {
      window[RECONNECT_TRACE_KEY] = {
        createdAt: nowIso(),
        events: [],
        warnings: [],
        lastOnlineState: typeof navigator !== 'undefined' ? navigator.onLine : null,
      };
    }
    return window[RECONNECT_TRACE_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      events: [],
      warnings: [],
      lastOnlineState: null,
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

function getPersistenceSummary(label) {
  try {
    if (typeof window.ippoCapturePersistenceDrift === 'function') {
      const snapshot = window.ippoCapturePersistenceDrift(label);
      return snapshot && snapshot.drift ? snapshot.drift : null;
    }
  } catch (_) {}
  return null;
}

function traceSyncPhase(phase, payload) {
  try {
    if (typeof window.ippoTraceSyncPhase === 'function') {
      window.ippoTraceSyncPhase(phase, payload);
    }
  } catch (_) {}
}

function markReconnectPhase(phase, payload = {}) {
  const store = getStore();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : null;
  const event = {
    area: 'reconnect-lifecycle',
    phase: phase || 'unknown',
    at: nowIso(),
    ts: nowMs(),
    online,
    previousOnline: store.lastOnlineState,
    drift: payload.includeDrift === false ? null : getPersistenceSummary('reconnect:' + (phase || 'unknown')),
    detail: payload.detail || null,
  };

  store.lastOnlineState = online;
  pushLimited(store.events, event, MAX_EVENTS);
  traceSyncPhase(event.phase, event);

  if (event.phase === 'online' && event.drift && event.drift.hasWarnings) {
    const warning = {
      type: 'reconnect-with-persistence-drift',
      at: event.at,
      warningCount: event.drift.warningCount,
      warnings: event.drift.warnings,
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    traceSyncPhase('reconnect-drift-warning', warning);
  }

  return event;
}

function installReconnectLifecycleListeners() {
  const store = getStore();

  if (store.listenersInstalled) {
    return summarizeReconnectLifecycleTraceRuntime();
  }

  try {
    window.addEventListener('online', function() {
      markReconnectPhase('online', {
        detail: { source: 'window-online-event' },
      });
    });

    window.addEventListener('offline', function() {
      markReconnectPhase('offline', {
        detail: { source: 'window-offline-event' },
      });
    });

    store.listenersInstalled = true;
    markReconnectPhase('listeners-installed', {
      includeDrift: false,
      detail: { online: typeof navigator !== 'undefined' ? navigator.onLine : null },
    });
  } catch (error) {
    const warning = {
      type: 'reconnect-listener-install-failed',
      at: nowIso(),
      message: error && error.message ? error.message : String(error),
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
  }

  return summarizeReconnectLifecycleTraceRuntime();
}

function summarizeReconnectLifecycleTraceRuntime() {
  const store = getStore();

  return {
    listenersInstalled: store.listenersInstalled === true,
    eventCount: store.events.length,
    warningCount: store.warnings.length,
    lastOnlineState: store.lastOnlineState,
    currentOnlineState: typeof navigator !== 'undefined' ? navigator.onLine : null,
    recentEvents: store.events.slice(-12),
    recentWarnings: store.warnings.slice(-12),
    preservedConstraints: {
      noCloudBackupCall: true,
      noRetryInjection: true,
      noQueueMutation: true,
      noOfflineFallbackChange: true,
      noSyncOrderChange: true,
    },
  };
}

function resetReconnectLifecycleTraceRuntime() {
  const store = getStore();
  store.events = [];
  store.warnings = [];
  return summarizeReconnectLifecycleTraceRuntime();
}

window.ippoMarkReconnectPhase = markReconnectPhase;
window.ippoInstallReconnectLifecycleListeners = installReconnectLifecycleListeners;
window.ippoReconnectLifecycleTraceRuntimeSummary = summarizeReconnectLifecycleTraceRuntime;
window.ippoResetReconnectLifecycleTraceRuntime = resetReconnectLifecycleTraceRuntime;

export {
  markReconnectPhase,
  installReconnectLifecycleListeners,
  summarizeReconnectLifecycleTraceRuntime,
  resetReconnectLifecycleTraceRuntime,
};
