// ============================================================
// ippo – boot-stability.js
//
// 起動安定化のための read-only observability layer。
// 既存の init / save / persistence 経路は変更しない。
// ============================================================

const BOOT_KEY = '__ippoBoot';
const BOOT_SESSION_KEY = 'ippo:boot-session';
const BOOT_HISTORY_KEY = 'ippo:boot-history';
const BOOT_HISTORY_LIMIT = 8;
const RELOAD_LOOP_WINDOW_MS = 5000;
const RELOAD_LOOP_THRESHOLD = 3;

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

function safeRandomId() {
  try {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
  } catch (_) {}
  return 'boot-' + nowMs() + '-' + Math.random().toString(36).slice(2);
}

function readJsonStorage(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

function createBootSession() {
  const startedAtMs = nowMs();
  const sessionId = safeRandomId();
  const previousSession = readJsonStorage(BOOT_SESSION_KEY, null);
  const history = readJsonStorage(BOOT_HISTORY_KEY, []);
  const previousStartedAtMs = previousSession && typeof previousSession.startedAtMs === 'number'
    ? previousSession.startedAtMs
    : null;

  const nextHistory = history.concat({
    sessionId,
    startedAtMs,
    at: nowIso(),
    url: window.location ? window.location.href : null,
    referrer: document.referrer || null,
    navigationType: getNavigationType(),
  }).slice(-BOOT_HISTORY_LIMIT);

  writeJsonStorage(BOOT_SESSION_KEY, {
    sessionId,
    startedAtMs,
    at: nowIso(),
  });
  writeJsonStorage(BOOT_HISTORY_KEY, nextHistory);

  return {
    sessionId,
    startedAtMs,
    previousSession,
    previousStartedAtMs,
    history: nextHistory,
  };
}

function getNavigationType() {
  try {
    const entries = performance.getEntriesByType && performance.getEntriesByType('navigation');
    if (entries && entries[0] && entries[0].type) return entries[0].type;
  } catch (_) {}
  try {
    if (performance.navigation && typeof performance.navigation.type === 'number') {
      return String(performance.navigation.type);
    }
  } catch (_) {}
  return null;
}

function getReloadLoopSignal(history) {
  const now = nowMs();
  const recent = (history || []).filter((entry) => {
    return entry && typeof entry.startedAtMs === 'number' && now - entry.startedAtMs <= RELOAD_LOOP_WINDOW_MS;
  });
  return {
    windowMs: RELOAD_LOOP_WINDOW_MS,
    threshold: RELOAD_LOOP_THRESHOLD,
    recentCount: recent.length,
    suspected: recent.length >= RELOAD_LOOP_THRESHOLD,
    recent,
  };
}

function getServiceWorkerSnapshot() {
  const snapshot = {
    supported: !!(navigator && 'serviceWorker' in navigator),
    controllerScriptURL: null,
    controllerState: null,
    controlled: false,
  };

  try {
    const controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (controller) {
      snapshot.controlled = true;
      snapshot.controllerScriptURL = controller.scriptURL || null;
      snapshot.controllerState = controller.state || null;
    }
  } catch (_) {}

  return snapshot;
}

function getRuntimeMismatchSignal(swSnapshot) {
  const scriptURL = swSnapshot && swSnapshot.controllerScriptURL ? swSnapshot.controllerScriptURL : '';
  const legacyController = /service-worker\.js/.test(scriptURL);
  const rootSwController = /\/sw\.js(?:$|\?)/.test(scriptURL);
  return {
    legacyController,
    rootSwController,
    controllerScriptURL: scriptURL || null,
    suspected: legacyController || (!!scriptURL && !rootSwController),
  };
}

const BOOT_SESSION = createBootSession();

function getBootState() {
  if (!window[BOOT_KEY]) {
    const swSnapshot = getServiceWorkerSnapshot();
    const reloadLoop = getReloadLoopSignal(BOOT_SESSION.history);
    const runtimeMismatch = getRuntimeMismatchSignal(swSnapshot);
    window[BOOT_KEY] = {
      startedAt: nowIso(),
      startedAtMs: BOOT_SESSION.startedAtMs,
      sessionId: BOOT_SESSION.sessionId,
      viteModuleStarted: true,
      viteModuleReady: false,
      domContentLoaded: document.readyState !== 'loading',
      navigationType: getNavigationType(),
      events: [],
      warnings: [],
      errors: [],
      windowApis: {},
      services: {},
      verification: {
        bootSession: BOOT_SESSION,
        serviceWorker: swSnapshot,
        reloadLoop,
        runtimeMismatch,
      },
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

function refreshVerificationSignals() {
  const boot = getBootState();
  const swSnapshot = getServiceWorkerSnapshot();
  const reloadLoop = getReloadLoopSignal(BOOT_SESSION.history);
  const runtimeMismatch = getRuntimeMismatchSignal(swSnapshot);
  boot.verification = {
    bootSession: BOOT_SESSION,
    serviceWorker: swSnapshot,
    reloadLoop,
    runtimeMismatch,
    refreshedAt: nowIso(),
  };

  if (reloadLoop.suspected) {
    markBootWarning('reload-loop-suspected', reloadLoop);
  }

  if (runtimeMismatch.suspected) {
    markBootWarning('runtime-mismatch-suspected', runtimeMismatch);
  }

  return boot.verification;
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
    startedAtMs: boot.startedAtMs,
    sessionId: boot.sessionId,
    navigationType: boot.navigationType,
    viteModuleStarted: !!boot.viteModuleStarted,
    viteModuleReady: !!boot.viteModuleReady,
    domContentLoaded: !!boot.domContentLoaded,
    readyState: document.readyState,
    supabaseReady: !!(window.__ippoSupabaseStatus && window.__ippoSupabaseStatus.ready),
    supabaseStatus: window.__ippoSupabaseStatus || null,
    legacyBridgeReady: typeof window.ippoLegacyWindowBridgeSummary === 'function',
    startupVerifyReady: typeof window.ippoStartupVerifySummary === 'function',
    persistenceTraceReady: typeof window.ippoPersistenceTraceRuntimeSummary === 'function',
    verification: boot.verification || null,
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
  refreshVerificationSignals();
  markBootEvent('vite-ready', detail || null);
  return summarizeBoot();
}

getBootState();
markBootEvent('boot-stability-module-loaded', {
  sessionId: BOOT_SESSION.sessionId,
  navigationType: getNavigationType(),
});
refreshVerificationSignals();

if (typeof window.ippoTraceHydrationPhase === 'function') {
  window.ippoTraceHydrationPhase('startup-enter', {
    readyState: document.readyState,
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const boot = getBootState();
    boot.domContentLoaded = true;
    refreshVerificationSignals();
    markBootEvent('dom-content-loaded');

    if (typeof window.ippoTraceHydrationPhase === 'function') {
      window.ippoTraceHydrationPhase('dom-content-loaded', {
        readyState: document.readyState,
      });
    }
  }, { once: true });
} else {
  getBootState().domContentLoaded = true;
  refreshVerificationSignals();
  markBootEvent('dom-already-loaded');

  if (typeof window.ippoTraceHydrationPhase === 'function') {
    window.ippoTraceHydrationPhase('dom-already-loaded', {
      readyState: document.readyState,
    });
  }
}

if (navigator && navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    refreshVerificationSignals();
    markBootEvent('service-worker-controller-change', getServiceWorkerSnapshot());
  });
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
window.ippoRefreshBootVerificationSignals = refreshVerificationSignals;
window.ippoBootSummary = summarizeBoot;

export {
  getBootState,
  markBootEvent,
  markBootWarning,
  markBootError,
  refreshVerificationSignals,
  registerWindowApis,
  markServiceReady,
  markViteReady,
  summarizeBoot,
};
