// ============================================================
// ippo – persistence-trace-runtime.js
//
// Phase A stabilization:
// additive persistence/save/sync trace visibility.
//
// IMPORTANT:
// - observability only
// - no timing rewrites
// - no persistence order rewrites
// - no async orchestration changes
// - no render lifecycle changes
// ============================================================

const TRACE_STORE_KEY = '__IPPO_TRACE';
const TRACE_FLAG_KEY = 'IPPO_TRACE_ENABLED';
const TRACE_LIMIT = 500;

function isTraceEnabled() {
  try {
    return window[TRACE_FLAG_KEY] === true;
  } catch (_) {
    return false;
  }
}

function ensureTraceStore() {
  try {
    if (!Array.isArray(window[TRACE_STORE_KEY])) {
      window[TRACE_STORE_KEY] = [];
    }

    return window[TRACE_STORE_KEY];
  } catch (_) {
    return [];
  }
}

function nowTs() {
  try {
    return Date.now();
  } catch (_) {
    return 0;
  }
}

function pushTrace(entry) {
  try {
    const store = ensureTraceStore();

    store.push({
      ts: nowTs(),
      ...entry,
    });

    if (store.length > TRACE_LIMIT) {
      store.splice(0, store.length - TRACE_LIMIT);
    }

    if (isTraceEnabled()) {
      console.debug('[ippo-trace]', entry);
    }
  } catch (_) {
    // trace must never break runtime behavior
  }
}

function tracePersistencePhase(phase, payload = {}) {
  pushTrace({
    area: 'persistence',
    phase,
    ...payload,
  });
}

function traceSavePhase(phase, payload = {}) {
  pushTrace({
    area: 'record-save',
    phase,
    ...payload,
  });
}

function traceHydrationPhase(phase, payload = {}) {
  pushTrace({
    area: 'hydration',
    phase,
    ...payload,
  });
}

function traceSyncPhase(phase, payload = {}) {
  pushTrace({
    area: 'sync',
    phase,
    ...payload,
  });
}

function traceCalendarPhase(phase, payload = {}) {
  pushTrace({
    area: 'calendar',
    phase,
    ...payload,
  });
}

function summarizePersistenceTraceRuntime() {
  const store = ensureTraceStore();

  return {
    enabled: isTraceEnabled(),
    traceCount: store.length,
    traceLimit: TRACE_LIMIT,
    latestTrace: store.length ? store[store.length - 1] : null,
    preservedConstraints: {
      noTimingRewrite: true,
      noPersistenceOrderRewrite: true,
      noHydrationRewrite: true,
      noRenderRewrite: true,
    },
  };
}

window.ippoTracePersistencePhase = tracePersistencePhase;
window.ippoTraceSavePhase = traceSavePhase;
window.ippoTraceHydrationPhase = traceHydrationPhase;
window.ippoTraceSyncPhase = traceSyncPhase;
window.ippoTraceCalendarPhase = traceCalendarPhase;
window.ippoPersistenceTraceRuntimeSummary = summarizePersistenceTraceRuntime;

export {
  tracePersistencePhase,
  traceSavePhase,
  traceHydrationPhase,
  traceSyncPhase,
  traceCalendarPhase,
  summarizePersistenceTraceRuntime,
};
