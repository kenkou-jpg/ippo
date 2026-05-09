// ============================================================
// ippo – boot-stability.js
//
// 起動安定化のための read-only observability layer。
// 既存の init / save / persistence 経路は変更しない。
// ============================================================

import './persistence-trace-runtime.js';
import './duplicate-sync-detector-runtime.js';
import './record-save-trace-runtime.js';
import './calendar-reflection-trace-runtime.js';
import './persistence-drift-visibility-runtime.js';
import './reconnect-lifecycle-trace-runtime.js';
import './replay-diagnostics-runtime.js';

const BOOT_KEY = '__ippoBoot';

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getBootState() {
  if (!window[BOOT_KEY]) {
    window[BOOT_KEY] = {
      startedAt: nowIso(),
      viteModuleStarted: true,
      viteModuleReady: false,
      domContentLoaded: document.readyState !== 'loading',
      events: [],
      warnings: [],
      errors: [],
      windowApis: {},
      services: {},
    };
  }
  return window[BOOT_KEY];
}

function pushLimited(list, value, limit) {
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

function markBootEvent(name, detail) {
  const boot = getBootState();
  pushLimited(boot.events, {
    name,
    detail: detail || null,
    at: nowIso(),
    readyState: document.readyState,
  }, 80);
  return boot;
}

function markBootWarning(name, detail) {
  const boot = getBootState();
  pushLimited(boot.warnings, {
    name,
    detail: detail || null,
    at: nowIso(),
  }, 40);
  return boot;
}

function markBootError(name, detail) {
  const boot = getBootState();
  pushLimited(boot.errors, {
    name,
    detail: detail || null,
    at: nowIso(),
  }, 40);
  return boot;
}

function registerWindowApis(names) {
  const boot = getBootState();
  (names || []).forEach((name) => {
    boot.windowApis[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
      checkedAt: nowIso(),
    };
  });
  return boot.windowApis;
}

function markServiceReady(name, detail) {
  const boot = getBootState();
  boot.services[name] = {
    ready: !!(detail && detail.ready),
    detail: detail || null,
    checkedAt: nowIso(),
  };
  return boot.services[name];
}

function summarizeBoot() {
  const boot = getBootState();
  return {
    startedAt: boot.startedAt,
    viteModuleStarted: !!boot.viteModuleStarted,
    viteModuleReady: !!boot.viteModuleReady,
    domContentLoaded: !!boot.domContentLoaded,
    readyState: document.readyState,
    supabaseReady: !!(window.__ippoSupabaseStatus && window.__ippoSupabaseStatus.ready),
    supabaseStatus: window.__ippoSupabaseStatus || null,
    legacyBridgeReady: typeof window.ippoLegacyWindowBridgeSummary === 'function',
    startupVerifyReady: typeof window.ippoStartupVerifySummary === 'function',
    persistenceTraceReady: typeof window.ippoPersistenceTraceRuntimeSummary === 'function',
    duplicateSyncDetectorReady: typeof window.ippoDuplicateSyncDetectorSummary === 'function',
    recordSaveTraceReady: typeof window.ippoRecordSaveTraceRuntimeSummary === 'function',
    calendarReflectionTraceReady: typeof window.ippoCalendarReflectionTraceRuntimeSummary === 'function',
    persistenceDriftVisibilityReady: typeof window.ippoPersistenceDriftVisibilityRuntimeSummary === 'function',
    reconnectLifecycleTraceReady: typeof window.ippoReconnectLifecycleTraceRuntimeSummary === 'function',
    replayDiagnosticsReady: typeof window.ippoReplayDiagnosticsRuntimeSummary === 'function',
    warnings: boot.warnings.slice(-10),
    errors: boot.errors.slice(-10),
    recentEvents: boot.events.slice(-15),
    windowApis: boot.windowApis,
    services: boot.services,
  };
}

function markViteReady(detail) {
  const boot = getBootState();
  boot.viteModuleReady = true;
  window.__ippoViteReady = true;
  markBootEvent('vite-ready', detail || null);

  if (typeof window.ippoCheckCalendarReflectionReadiness === 'function') {
    window.ippoCheckCalendarReflectionReadiness('vite-ready');
  }

  if (typeof window.ippoCapturePersistenceDrift === 'function') {
    window.ippoCapturePersistenceDrift('vite-ready');
  }

  if (typeof window.ippoInstallReconnectLifecycleListeners === 'function') {
    window.ippoInstallReconnectLifecycleListeners();
  }

  if (typeof window.ippoCaptureReplayDiagnostics === 'function') {
    window.ippoCaptureReplayDiagnostics('vite-ready');
  }

  return summarizeBoot();
}

getBootState();
markBootEvent('boot-stability-module-loaded');

if (typeof window.ippoTraceHydrationPhase === 'function') {
  window.ippoTraceHydrationPhase('startup-enter', {
    readyState: document.readyState,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const boot = getBootState();
    boot.domContentLoaded = true;
    markBootEvent('dom-content-loaded');

    if (typeof window.ippoTraceHydrationPhase === 'function') {
      window.ippoTraceHydrationPhase('dom-content-loaded', {
        readyState: document.readyState,
      });
    }

    if (typeof window.ippoCheckCalendarReflectionReadiness === 'function') {
      window.ippoCheckCalendarReflectionReadiness('dom-content-loaded');
    }

    if (typeof window.ippoCapturePersistenceDrift === 'function') {
      window.ippoCapturePersistenceDrift('dom-content-loaded');
    }

    if (typeof window.ippoCaptureReplayDiagnostics === 'function') {
      window.ippoCaptureReplayDiagnostics('dom-content-loaded');
    }
  }, { once: true });
} else {
  getBootState().domContentLoaded = true;
  markBootEvent('dom-already-loaded');

  if (typeof window.ippoTraceHydrationPhase === 'function') {
    window.ippoTraceHydrationPhase('dom-already-loaded', {
      readyState: document.readyState,
    });
  }

  if (typeof window.ippoCheckCalendarReflectionReadiness === 'function') {
    window.ippoCheckCalendarReflectionReadiness('dom-already-loaded');
  }

  if (typeof window.ippoCapturePersistenceDrift === 'function') {
    window.ippoCapturePersistenceDrift('dom-already-loaded');
  }

  if (typeof window.ippoCaptureReplayDiagnostics === 'function') {
    window.ippoCaptureReplayDiagnostics('dom-already-loaded');
  }
}

window.addEventListener('error', (event) => {
  markBootError('window-error', {
    message: event.message || null,
    filename: event.filename || null,
    lineno: event.lineno || null,
    colno: event.colno || null,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  markBootError('unhandled-rejection', {
    reason: event.reason && event.reason.message ? event.reason.message : String(event.reason || ''),
  });
});

window.ippoMarkBootEvent = markBootEvent;
window.ippoMarkBootWarning = markBootWarning;
window.ippoMarkBootError = markBootError;
window.ippoRegisterWindowApis = registerWindowApis;
window.ippoMarkServiceReady = markServiceReady;
window.ippoMarkViteReady = markViteReady;
window.ippoBootSummary = summarizeBoot;

export {
  getBootState,
  markBootEvent,
  markBootWarning,
  markBootError,
  registerWindowApis,
  markServiceReady,
  markViteReady,
  summarizeBoot,
};
