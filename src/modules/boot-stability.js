// ============================================================
// ippo – boot-stability.js
// ============================================================

const BOOT_KEY = '__ippoBoot';

function nowIso() {
  try { return new Date().toISOString(); } catch (_) { return null; }
}

function getBootState() {
  if (!window[BOOT_KEY]) {
    window[BOOT_KEY] = {
      startedAt: nowIso(),
      startedAtMs: Date.now(),
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
  pushLimited(boot.events, { name, detail: detail || null, at: nowIso(), readyState: document.readyState }, 80);
  return boot;
}

function markBootWarning(name, detail) {
  const boot = getBootState();
  pushLimited(boot.warnings, { name, detail: detail || null, at: nowIso() }, 40);
  return boot;
}

function markBootError(name, detail) {
  const boot = getBootState();
  pushLimited(boot.errors, { name, detail: detail || null, at: nowIso() }, 40);
  return boot;
}

function registerWindowApis(names) {
  const boot = getBootState();
  (names || []).forEach((name) => {
    boot.windowApis[name] = { exists: typeof window[name] !== 'undefined', type: typeof window[name], checkedAt: nowIso() };
  });
  return boot.windowApis;
}

function markServiceReady(name, detail) {
  const boot = getBootState();
  boot.services[name] = { ready: !!(detail && detail.ready), detail: detail || null, checkedAt: nowIso() };
  return boot.services[name];
}

function summarizeBoot() {
  const boot = getBootState();
  return {
    startedAt: boot.startedAt,
    startedAtMs: boot.startedAtMs,
    viteModuleStarted: !!boot.viteModuleStarted,
    viteModuleReady: !!boot.viteModuleReady,
    domContentLoaded: !!boot.domContentLoaded,
    readyState: document.readyState,
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
  return summarizeBoot();
}

getBootState();
markBootEvent('boot-stability-module-loaded');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    getBootState().domContentLoaded = true;
    markBootEvent('dom-content-loaded');
  }, { once: true });
} else {
  getBootState().domContentLoaded = true;
  markBootEvent('dom-already-loaded');
}

// ─── EL-1: 診断バス (単一グローバルリスナー) ─────────────────
// health-monitor / production-diagnostics はここに subscribe する。
// window.__ippoDiagBus が未初期化でも後続モジュールが先に push できるよう
// 配列ベースの遅延初期化パターンを採用。
// removal condition: health-monitor / production-diagnostics が
//   window.addEventListener を直接使う形に戻したら削除可。
if (!window.__ippoDiagBus) {
  window.__ippoDiagBus = {
    _subs: [],
    subscribe: function (fn) { this._subs.push(fn); },
  };
}

function _dispatchDiagBus(type, detail) {
  var subs = window.__ippoDiagBus._subs;
  for (var i = 0; i < subs.length; i++) {
    try { subs[i](type, detail); } catch (_) {}
  }
}

window.addEventListener('error', (event) => {
  var d = {
    message:  event.message  || null,
    filename: event.filename || null,
    lineno:   event.lineno   || null,
    colno:    event.colno    || null,
  };
  markBootError('window-error', d);
  _dispatchDiagBus('window-error', d);
});

window.addEventListener('unhandledrejection', (event) => {
  var d = {
    reason: event.reason && event.reason.message
      ? event.reason.message
      : String(event.reason || ''),
  };
  markBootError('unhandled-rejection', d);
  _dispatchDiagBus('unhandled-rejection', d);
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
