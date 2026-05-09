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
      imports: [],
    };
  }
  return window[OPTIONAL_RUNTIME_LOADER_KEY];
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
        at: nowIso(),
      };
      state.imports.push(entry);
      if (state.imports.length > 80) state.imports.shift();
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
    state.imports.push(entry);
    if (state.imports.length > 80) state.imports.shift();
    markBootTimeline('optional-runtime-import-loaded', entry);
    return result;
  } catch (error) {
    const entry = {
      label,
      status: 'failed',
      timeoutMs,
      durationMs: Date.now() - startedAtMs,
      message: error && error.message ? error.message : String(error),
      at: nowIso(),
    };
    state.imports.push(entry);
    if (state.imports.length > 80) state.imports.shift();
    markBootTimeline('optional-runtime-import-failed', entry);
    markBootError('optional-runtime-import-failed', entry);
    return null;
  }
}

function scheduleOptionalRuntime(label, importer, options) {
  const delayMs = options && typeof options.delayMs === 'number'
    ? options.delayMs
    : 0;

  window.setTimeout(() => {
    importOptionalRuntime(label, importer, options);
  }, delayMs);
}

function summarizeGuardedOptionalRuntimeLoader() {
  const state = getState();
  const imports = state.imports.slice();
  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    total: imports.length,
    loaded: imports.filter((entry) => entry.status === 'loaded').length,
    failed: imports.filter((entry) => entry.status === 'failed').length,
    timedOut: imports.filter((entry) => entry.status === 'timeout').length,
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
};
