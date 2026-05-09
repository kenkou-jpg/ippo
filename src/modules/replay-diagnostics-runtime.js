// ============================================================
// ippo – replay-diagnostics-runtime.js
//
// Phase A stabilization:
// replay-style diagnostics without replaying or mutating state.
//
// IMPORTANT:
// - observability only
// - does not replay saves
// - does not replay hydration
// - does not call render functions
// - does not mutate state/localStorage/DOM
// ============================================================

const REPLAY_DIAGNOSTICS_KEY = '__IPPO_REPLAY_DIAGNOSTICS';
const MAX_EVENTS = 400;
const MAX_SEQUENCES = 80;

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
    if (!window[REPLAY_DIAGNOSTICS_KEY]) {
      window[REPLAY_DIAGNOSTICS_KEY] = {
        createdAt: nowIso(),
        events: [],
        sequences: [],
        warnings: [],
      };
    }
    return window[REPLAY_DIAGNOSTICS_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      events: [],
      sequences: [],
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

function getTraceSnapshot() {
  let trace = [];
  let saveTrace = null;
  let calendarTrace = null;
  let driftSummary = null;
  let reconnectSummary = null;
  let duplicateSyncSummary = null;

  try {
    trace = Array.isArray(window.__IPPO_TRACE) ? window.__IPPO_TRACE.slice(-80) : [];
  } catch (_) {}

  try {
    saveTrace = typeof window.ippoRecordSaveTraceRuntimeSummary === 'function'
      ? window.ippoRecordSaveTraceRuntimeSummary()
      : null;
  } catch (_) {}

  try {
    calendarTrace = typeof window.ippoCalendarReflectionTraceRuntimeSummary === 'function'
      ? window.ippoCalendarReflectionTraceRuntimeSummary()
      : null;
  } catch (_) {}

  try {
    driftSummary = typeof window.ippoPersistenceDriftVisibilityRuntimeSummary === 'function'
      ? window.ippoPersistenceDriftVisibilityRuntimeSummary()
      : null;
  } catch (_) {}

  try {
    reconnectSummary = typeof window.ippoReconnectLifecycleTraceRuntimeSummary === 'function'
      ? window.ippoReconnectLifecycleTraceRuntimeSummary()
      : null;
  } catch (_) {}

  try {
    duplicateSyncSummary = typeof window.ippoDuplicateSyncDetectorSummary === 'function'
      ? window.ippoDuplicateSyncDetectorSummary()
      : null;
  } catch (_) {}

  return {
    trace,
    saveTrace,
    calendarTrace,
    driftSummary,
    reconnectSummary,
    duplicateSyncSummary,
  };
}

function buildSequenceFromTrace(trace) {
  const list = Array.isArray(trace) ? trace : [];
  return list.map(function(event) {
    return {
      area: event && event.area ? event.area : 'unknown',
      phase: event && event.phase ? event.phase : 'unknown',
      ts: event && typeof event.ts === 'number' ? event.ts : null,
      date: event && event.date ? event.date : null,
      id: event && event.id ? event.id : null,
    };
  });
}

function detectReplayWarnings(snapshot) {
  const warnings = [];
  const trace = Array.isArray(snapshot?.trace) ? snapshot.trace : [];

  const hydrationEvents = trace.filter(function(event) {
    return event && event.area === 'hydration';
  });
  const saveEvents = trace.filter(function(event) {
    return event && event.area === 'record-save';
  });
  const calendarEvents = trace.filter(function(event) {
    return event && event.area === 'calendar';
  });

  const hasSaveAfterCalendar = saveEvents.some(function(saveEvent) {
    return calendarEvents.some(function(calendarEvent) {
      return typeof saveEvent.ts === 'number'
        && typeof calendarEvent.ts === 'number'
        && calendarEvent.ts < saveEvent.ts;
    });
  });

  if (hasSaveAfterCalendar) {
    warnings.push('calendar-event-before-save-event');
  }

  if (snapshot?.duplicateSyncSummary?.warningCount > 0) {
    warnings.push('duplicate-sync-candidates-present');
  }

  if (snapshot?.driftSummary?.warningCount > 0) {
    warnings.push('persistence-drift-present');
  }

  if (snapshot?.reconnectSummary?.warningCount > 0) {
    warnings.push('reconnect-warnings-present');
  }

  if (hydrationEvents.length > 1) {
    const startupEvents = hydrationEvents.filter(function(event) {
      return event.phase === 'startup-enter';
    });
    if (startupEvents.length > 1) {
      warnings.push('duplicate-startup-enter-events');
    }
  }

  return warnings;
}

function captureReplayDiagnostics(label = 'manual') {
  const store = getStore();
  const snapshot = getTraceSnapshot();
  const sequence = buildSequenceFromTrace(snapshot.trace);
  const warnings = detectReplayWarnings(snapshot);
  const entry = {
    label,
    capturedAt: nowIso(),
    ts: nowMs(),
    sequence,
    warnings,
    snapshot,
  };

  pushLimited(store.events, entry, MAX_EVENTS);
  pushLimited(store.sequences, sequence, MAX_SEQUENCES);

  if (warnings.length > 0) {
    pushLimited(store.warnings, {
      label,
      capturedAt: entry.capturedAt,
      warnings,
    }, MAX_EVENTS);
  }

  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('replay-diagnostics-captured', {
        label,
        warningCount: warnings.length,
        eventCount: sequence.length,
      });
    }
  } catch (_) {}

  return entry;
}

function summarizeReplayDiagnosticsRuntime() {
  const store = getStore();
  const latest = store.events.length ? store.events[store.events.length - 1] : null;

  return {
    eventCount: store.events.length,
    sequenceCount: store.sequences.length,
    warningCount: store.warnings.length,
    latest,
    recentWarnings: store.warnings.slice(-10),
    preservedConstraints: {
      noSaveReplay: true,
      noHydrationReplay: true,
      noRenderCall: true,
      noStateMutation: true,
      noLocalStorageWrite: true,
      noDomMutation: true,
    },
  };
}

function resetReplayDiagnosticsRuntime() {
  const store = getStore();
  store.events = [];
  store.sequences = [];
  store.warnings = [];
  return summarizeReplayDiagnosticsRuntime();
}

window.ippoCaptureReplayDiagnostics = captureReplayDiagnostics;
window.ippoReplayDiagnosticsRuntimeSummary = summarizeReplayDiagnosticsRuntime;
window.ippoResetReplayDiagnosticsRuntime = resetReplayDiagnosticsRuntime;

export {
  captureReplayDiagnostics,
  summarizeReplayDiagnosticsRuntime,
  resetReplayDiagnosticsRuntime,
};
