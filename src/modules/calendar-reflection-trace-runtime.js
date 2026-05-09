// ============================================================
// ippo – calendar-reflection-trace-runtime.js
//
// Phase A stabilization:
// calendar reflection visibility without changing render timing.
//
// IMPORTANT:
// - observability only
// - does not wrap renderCalendar / buildCalendar
// - does not change month switching
// - does not change save notification order
// - does not mutate records or DOM
// ============================================================

const CALENDAR_TRACE_KEY = '__IPPO_CALENDAR_REFLECTION_TRACE';
const MAX_EVENTS = 250;

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
    if (!window[CALENDAR_TRACE_KEY]) {
      window[CALENDAR_TRACE_KEY] = {
        createdAt: nowIso(),
        events: [],
        warnings: [],
      };
    }
    return window[CALENDAR_TRACE_KEY];
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

function getCalendarRuntimeSnapshot() {
  let calendarNode = null;
  let calendarGridNode = null;

  try {
    calendarNode = document.getElementById('calendar')
      || document.getElementById('calendarScreen')
      || document.querySelector('[data-screen="calendar"]');
  } catch (_) {}

  try {
    calendarGridNode = document.getElementById('calendarGrid')
      || document.querySelector('[data-calendar-grid]')
      || document.querySelector('.calendar-grid');
  } catch (_) {}

  return {
    hasBuildCalendar: typeof window.buildCalendar === 'function',
    hasRenderCalendar: typeof window.renderCalendar === 'function',
    hasCalendarNode: !!calendarNode,
    hasCalendarGridNode: !!calendarGridNode,
    calendarNodeId: calendarNode && calendarNode.id ? calendarNode.id : null,
    calendarGridNodeId: calendarGridNode && calendarGridNode.id ? calendarGridNode.id : null,
    readyState: typeof document !== 'undefined' ? document.readyState : null,
  };
}

function traceToGlobal(phase, payload) {
  try {
    if (typeof window.ippoTraceCalendarPhase === 'function') {
      window.ippoTraceCalendarPhase(phase, payload);
    }
  } catch (_) {}
}

function markCalendarReflectionPhase(phase, payload = {}) {
  const store = getStore();
  const event = {
    area: 'calendar-reflection',
    phase: phase || 'unknown',
    at: nowIso(),
    ts: nowMs(),
    date: payload.date || payload.recordDate || payload.targetDate || null,
    month: payload.month || payload.currentMonth || null,
    source: payload.source || null,
    snapshot: getCalendarRuntimeSnapshot(),
    detail: payload.detail || null,
  };

  pushLimited(store.events, event, MAX_EVENTS);
  traceToGlobal(event.phase, event);

  if (
    event.phase === 'calendar-reflection-missing-renderer'
    || event.phase === 'calendar-reflection-missing-dom'
  ) {
    pushLimited(store.warnings, event, MAX_EVENTS);
  }

  return event;
}

function checkCalendarReflectionReadiness(source = 'manual') {
  const snapshot = getCalendarRuntimeSnapshot();
  const hasRenderer = snapshot.hasBuildCalendar || snapshot.hasRenderCalendar;
  const hasDom = snapshot.hasCalendarNode || snapshot.hasCalendarGridNode;

  const event = markCalendarReflectionPhase('calendar-reflection-readiness', {
    source,
    detail: {
      hasRenderer,
      hasDom,
      snapshot,
    },
  });

  if (!hasRenderer) {
    markCalendarReflectionPhase('calendar-reflection-missing-renderer', {
      source,
      detail: snapshot,
    });
  }

  if (!hasDom && document.readyState !== 'loading') {
    markCalendarReflectionPhase('calendar-reflection-missing-dom', {
      source,
      detail: snapshot,
    });
  }

  return event;
}

function summarizeCalendarReflectionTraceRuntime() {
  const store = getStore();

  return {
    eventCount: store.events.length,
    warningCount: store.warnings.length,
    recentEvents: store.events.slice(-12),
    recentWarnings: store.warnings.slice(-12),
    runtimeSnapshot: getCalendarRuntimeSnapshot(),
    preservedConstraints: {
      noRendererWrapping: true,
      noMonthSwitchTimingChange: true,
      noSaveNotifyOrderChange: true,
      noDomMutation: true,
      noRecordMutation: true,
    },
  };
}

function resetCalendarReflectionTraceRuntime() {
  const store = getStore();
  store.events = [];
  store.warnings = [];
  return summarizeCalendarReflectionTraceRuntime();
}

window.ippoMarkCalendarReflectionPhase = markCalendarReflectionPhase;
window.ippoCheckCalendarReflectionReadiness = checkCalendarReflectionReadiness;
window.ippoCalendarReflectionTraceRuntimeSummary = summarizeCalendarReflectionTraceRuntime;
window.ippoResetCalendarReflectionTraceRuntime = resetCalendarReflectionTraceRuntime;

export {
  markCalendarReflectionPhase,
  checkCalendarReflectionReadiness,
  summarizeCalendarReflectionTraceRuntime,
  resetCalendarReflectionTraceRuntime,
};
