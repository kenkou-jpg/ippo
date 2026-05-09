// ============================================================
// ippo – guarded-optional-runtime-loader.js
//
// Phase I-2:
// Shared helper for moving non-critical startup runtimes out of the
// boot-critical static import graph.
//
// Purpose:
// - Optional diagnostics/migration/cleanup runtimes should not block first paint.
// - Import failures should be recorded, not fatal.
// - Slow optional runtimes should be timeout-bounded.
// ============================================================

const OPTIONAL_RUNTIME_LOADER_KEY = '__ippoGuardedOptionalRuntimeLoader';
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_INTERACTION_READY_TIMEOUT_MS = 4000;
const MAX_LOADER_ENTRIES = 80;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[OPTIONAL_RUNTIME_LOADER_KEY]) {
    window[OPTIONAL_RUNTIME_LOADER_KEY] = {
      loadedAt: nowIso(),
      scheduled: [],
      imports: [],
      waits: [],
      containments: [],
    };
  }
  return window[OPTIONAL_RUNTIME_LOADER_KEY];
}

function pushBounded(list, entry) {
  list.push(entry);
  if (list.length > MAX_LOADER_ENTRIES) list.shift();
  return entry;
}

function markBootTimeline(label, detail) {
  try {
    if (typeof window.ippoMarkBootTimeline === 'function') {
      window.ippoMarkBootTimeline(label, detail || null);
    }
  } catch (_) {}
}

function markBootError(label, detail) {
  try {
    if (typeof window.ippoMarkBootError === 'function') {
      window.ippoMarkBootError(label, detail || {});
    }
  } catch (_) {}
}

function timeoutPromise(label, timeoutMs) {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        __ippoOptionalRuntimeTimeout: true,
        label,
        timeoutMs,
      });
    }, timeoutMs || DEFAULT_TIMEOUT_MS);
  });
}

function recordOptionalRuntimeContainment(label, reason, detail) {
  const state = getState();
  const entry = Object.assign({
    label,
    reason,
    at: nowIso(),
    contained: true,
  }, detail || {});

  pushBounded(state.containments, entry);
  markBootTimeline('optional-runtime-contained', entry);
  return entry;
}

function recordOptionalRuntimeSchedule(label, options, delayMs, waitForInteractionReady) {
  const state = getState();
  const entry = {
    label,
    delayMs,
    timeoutMs: options && typeof options.timeoutMs === 'number'
      ? options.timeoutMs
      : DEFAULT_TIMEOUT_MS,
    waitForInteractionReady: !!waitForInteractionReady,
    interactionReadyTimeoutMs: options && typeof options.interactionReadyTimeoutMs === 'number'
      ? options.interactionReadyTimeoutMs
      : null,
    at: nowIso(),
  };

  pushBounded(state.scheduled, entry);
  markBootTimeline('optional-runtime-scheduled', entry);
  return entry;
}

function recordInteractionReadyWait(label, status, detail) {
  const state = getState();
  const entry = Object.assign({
    label,
    status,
    at: nowIso(),
  }, detail || {});

  pushBounded(state.waits, entry);
  markBootTimeline('optional-runtime-interaction-ready-' + status, entry);
  return entry;
}

function waitForInteractionReady(label, options) {
  const timeoutMs = options && typeof options.interactionReadyTimeoutMs === 'number'
    ? options.interactionReadyTimeoutMs
    : DEFAULT_INTERACTION_READY_TIMEOUT_MS;

  if (window.__ippoInteractionReady === true) {
    recordInteractionReadyWait(label, 'already-ready', { timeoutMs });
    return Promise.resolve('already-ready');
  }

  return new Promise((resolve) => {
    let done = false;
    let timeoutId = null;

    function finish(reason) {
      if (done) return;
      done = true;
      window.__ippoInteractionReady = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', onInteraction, true);
      window.removeEventListener('keydown', onInteraction, true);
      window.removeEventListener('touchstart', onInteraction, true);
      window.removeEventListener('DOMContentLoaded', onDomReady, true);
      recordInteractionReadyWait(label, reason, { timeoutMs });
      resolve(reason);
    }

    function onInteraction() {
      finish('user-interaction');
    }

    function onDomReady() {
      window.setTimeout(() => finish('dom-ready'), 0);
    }

    window.addEventListener('pointerdown', onInteraction, true);
    window.addEventListener('keydown', onInteraction, true);
    window.addEventListener('touchstart', onInteraction, true);

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', onDomReady, { once: true, capture: true });
    } else {
      window.setTimeout(() => finish('document-ready'), 0);
    }

    timeoutId = window.setTimeout(() => finish('timeout'), timeoutMs);
  });
}

async function importOptionalRuntime(label, importer, options) {
  const state = getState();
  const timeoutMs = options && typeof options.timeoutMs === 'number'
    ? options.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const startedAtMs = Date.now();

  markBootTimeline('optional-runtime-import-start', { label, timeoutMs });

  try {
    const result = await Promise.race([
      importer(),
      timeoutPromise(label, timeoutMs),
    ]);

    const durationMs = Date.now() - startedAtMs;

    if (result && result.__ippoOptionalRuntimeTimeout) {
      const entry = {
        label,
        status: 'timeout',
        timeoutMs,
        durationMs,
        contained: true,
        at: nowIso(),
      };
      pushBounded(state.imports, entry);
      recordOptionalRuntimeContainment(label, 'timeout', {
        timeoutMs,
        durationMs,
      });
      markBootTimeline('optional-runtime-import-timeout', entry);
      markBootError('optional-runtime-import-timeout', entry);
      return null;
    }

    const entry = {
      label,
      status: 'loaded',
      timeoutMs,
      durationMs,
      at: nowIso(),
    };
    pushBounded(state.imports, entry);
    markBootTimeline('optional-runtime-import-loaded', entry);
    return result;
  } catch (error) {
    const entry = {
      label,
      status: 'failed',
      timeoutMs,
      durationMs: Date.now() - startedAtMs,
      message: error && error.message ? error.message : String(error),
      contained: true,
      at: nowIso(),
    };
    pushBounded(state.imports, entry);
    recordOptionalRuntimeContainment(label, 'failed', {
      timeoutMs,
      durationMs: entry.durationMs,
      message: entry.message,
    });
    markBootTimeline('optional-runtime-import-failed', entry);
    markBootError('optional-runtime-import-failed', entry);
    return null;
  }
}

function scheduleOptionalRuntime(label, importer, options) {
  const delayMs = options && typeof options.delayMs === 'number'
    ? options.delayMs
    : 0;
  const shouldWaitForInteractionReady = !!(options && options.waitForInteractionReady);

  recordOptionalRuntimeSchedule(label, options, delayMs, shouldWaitForInteractionReady);

  window.setTimeout(() => {
    if (shouldWaitForInteractionReady) {
      waitForInteractionReady(label, options)
        .then(() => {
          importOptionalRuntime(label, importer, options);
        })
        .catch((error) => {
          const message = error && error.message ? error.message : String(error);
          recordOptionalRuntimeContainment(label, 'interaction-ready-wait-failed', {
            message,
          });
          importOptionalRuntime(label, importer, options);
        });
      return;
    }

    importOptionalRuntime(label, importer, options);
  }, delayMs);
}

function summarizeGuardedOptionalRuntimeLoader() {
  const state = getState();
  const scheduled = state.scheduled.slice();
  const imports = state.imports.slice();
  const waits = state.waits.slice();
  const containments = state.containments.slice();
  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    scheduledTotal: scheduled.length,
    waitTotal: waits.length,
    containmentTotal: containments.length,
    total: imports.length,
    loaded: imports.filter((entry) => entry.status === 'loaded').length,
    failed: imports.filter((entry) => entry.status === 'failed').length,
    timedOut: imports.filter((entry) => entry.status === 'timeout').length,
    interactionReadyWaits: waits.reduce((counts, entry) => {
      counts[entry.status] = (counts[entry.status] || 0) + 1;
      return counts;
    }, {}),
    containmentsByReason: containments.reduce((counts, entry) => {
      counts[entry.reason] = (counts[entry.reason] || 0) + 1;
      return counts;
    }, {}),
    scheduled,
    waits,
    containments,
    imports,
  };
}

window.ippoImportOptionalRuntime = importOptionalRuntime;
window.ippoScheduleOptionalRuntime = scheduleOptionalRuntime;
window.ippoGuardedOptionalRuntimeLoaderSummary = summarizeGuardedOptionalRuntimeLoader;

markBootTimeline('guarded-optional-runtime-loader-ready');

export {
  importOptionalRuntime,
  scheduleOptionalRuntime,
  summarizeGuardedOptionalRuntimeLoader,
  waitForInteractionReady,
};
