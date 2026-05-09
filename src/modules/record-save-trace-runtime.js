// ============================================================
// ippo – record-save-trace-runtime.js
//
// Phase A stabilization:
// record save lifecycle visibility without changing execution.
//
// IMPORTANT:
// - observability only
// - does not wrap saveRecord / saveState
// - does not change persistence order
// - does not change render/calendar timing
// - does not mutate records
// ============================================================

const SAVE_TRACE_KEY = '__IPPO_RECORD_SAVE_TRACE';
const MAX_EVENTS = 300;

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
    if (!window[SAVE_TRACE_KEY]) {
      window[SAVE_TRACE_KEY] = {
        createdAt: nowIso(),
        events: [],
        failures: [],
      };
    }
    return window[SAVE_TRACE_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      events: [],
      failures: [],
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

function summarizeRecordIdentity(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      id: null,
      date: null,
      recordId: null,
    };
  }

  return {
    id: payload.id || null,
    recordId: payload.recordId || payload.id || null,
    date: payload.date || payload.recordDate || payload.targetDate || null,
  };
}

function traceToGlobal(area, phase, payload) {
  try {
    if (typeof window.ippoTraceSavePhase === 'function') {
      window.ippoTraceSavePhase(phase, {
        area,
        ...payload,
      });
    }
  } catch (_) {}
}

function markRecordSavePhase(phase, payload = {}) {
  const store = getStore();
  const identity = summarizeRecordIdentity(payload);
  const event = {
    area: 'record-save',
    phase: phase || 'unknown',
    at: nowIso(),
    ts: nowMs(),
    ...identity,
    detail: payload.detail || null,
  };

  pushLimited(store.events, event, MAX_EVENTS);
  traceToGlobal('record-save', event.phase, event);

  if (phase === 'save-failed' || phase === 'persistence-failed' || phase === 'sync-failed') {
    pushLimited(store.failures, event, MAX_EVENTS);
  }

  return event;
}

function markRecordSaveAction(type, name, status, payload = {}) {
  const phase = [type || 'action', name || 'unknown', status || 'unknown'].join(':');
  return markRecordSavePhase(phase, payload);
}

function summarizeRecordSaveTraceRuntime() {
  const store = getStore();

  return {
    eventCount: store.events.length,
    failureCount: store.failures.length,
    recentEvents: store.events.slice(-12),
    recentFailures: store.failures.slice(-12),
    preservedConstraints: {
      noSaveRecordWrapping: true,
      noSaveStateWrapping: true,
      noPersistenceOrderChange: true,
      noRenderTimingChange: true,
      noRecordMutation: true,
    },
  };
}

function resetRecordSaveTraceRuntime() {
  const store = getStore();
  store.events = [];
  store.failures = [];
  return summarizeRecordSaveTraceRuntime();
}

window.ippoMarkRecordSavePhase = markRecordSavePhase;
window.ippoMarkRecordSaveAction = markRecordSaveAction;
window.ippoRecordSaveTraceRuntimeSummary = summarizeRecordSaveTraceRuntime;
window.ippoResetRecordSaveTraceRuntime = resetRecordSaveTraceRuntime;

export {
  markRecordSavePhase,
  markRecordSaveAction,
  summarizeRecordSaveTraceRuntime,
  resetRecordSaveTraceRuntime,
};
