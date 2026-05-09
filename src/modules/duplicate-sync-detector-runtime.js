// ============================================================
// ippo – duplicate-sync-detector-runtime.js
//
// Phase A stabilization:
// duplicate save/sync visibility without changing execution.
//
// IMPORTANT:
// - observability only
// - does not wrap saveState / cloudBackupAll
// - does not debounce
// - does not change sync order
// - does not mutate records
// ============================================================

const DUPLICATE_SYNC_KEY = '__IPPO_DUPLICATE_SYNC_DETECTOR';
const DEFAULT_WINDOW_MS = 1500;
const MAX_EVENTS = 200;

function nowMs() {
  try {
    return Date.now();
  } catch (_) {
    return 0;
  }
}

function getDetectorState() {
  try {
    if (!window[DUPLICATE_SYNC_KEY]) {
      window[DUPLICATE_SYNC_KEY] = {
        createdAt: nowMs(),
        windowMs: DEFAULT_WINDOW_MS,
        events: [],
        warnings: [],
      };
    }
    return window[DUPLICATE_SYNC_KEY];
  } catch (_) {
    return {
      createdAt: nowMs(),
      windowMs: DEFAULT_WINDOW_MS,
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

function normalizeKey(input) {
  if (!input || typeof input !== 'object') return 'unknown';

  const date = input.date || input.recordDate || input.targetDate || '';
  const id = input.id || input.recordId || '';
  const phase = input.phase || '';

  return [phase, date, id].filter(Boolean).join(':') || 'unknown';
}

function traceDuplicateSyncWarning(warning) {
  try {
    if (typeof window.ippoTraceSyncPhase === 'function') {
      window.ippoTraceSyncPhase('duplicate-sync-candidate', warning);
    }
  } catch (_) {}
}

function markSyncEvent(input = {}) {
  const state = getDetectorState();
  const at = nowMs();
  const key = normalizeKey(input);
  const event = {
    area: input.area || 'sync',
    phase: input.phase || 'unknown',
    key,
    id: input.id || input.recordId || null,
    date: input.date || input.recordDate || input.targetDate || null,
    at,
  };

  const recentDuplicate = state.events.find(function(item) {
    return item
      && item.key === key
      && item.phase === event.phase
      && at - item.at >= 0
      && at - item.at <= state.windowMs;
  });

  pushLimited(state.events, event, MAX_EVENTS);

  if (recentDuplicate) {
    const warning = {
      type: 'duplicate-sync-candidate',
      key,
      phase: event.phase,
      currentAt: at,
      previousAt: recentDuplicate.at,
      deltaMs: at - recentDuplicate.at,
      windowMs: state.windowMs,
    };

    pushLimited(state.warnings, warning, MAX_EVENTS);
    traceDuplicateSyncWarning(warning);
  }

  return event;
}

function summarizeDuplicateSyncDetector() {
  const state = getDetectorState();

  return {
    windowMs: state.windowMs,
    eventCount: state.events.length,
    warningCount: state.warnings.length,
    recentEvents: state.events.slice(-10),
    recentWarnings: state.warnings.slice(-10),
    preservedConstraints: {
      noDebounce: true,
      noFunctionWrapping: true,
      noSyncOrderChange: true,
      noRecordMutation: true,
    },
  };
}

function resetDuplicateSyncDetector() {
  const state = getDetectorState();
  state.events = [];
  state.warnings = [];
  return summarizeDuplicateSyncDetector();
}

window.ippoMarkSyncEvent = markSyncEvent;
window.ippoDuplicateSyncDetectorSummary = summarizeDuplicateSyncDetector;
window.ippoResetDuplicateSyncDetector = resetDuplicateSyncDetector;

export {
  markSyncEvent,
  summarizeDuplicateSyncDetector,
  resetDuplicateSyncDetector,
};
