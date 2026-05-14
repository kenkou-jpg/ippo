// ============================================================
// ippo – src/runtime/production-diagnostics.js
// Production Verification & Diagnostics System
// Phase 11: Production Observability Layer
//
// Exposes: window.ippoDiagnostics
//
// 有効化 (Production Overlay):
//   localStorage.setItem('ippo_diagnostics_overlay', '1')
//   または URL に ?ippo_diag=1 を付加
//
// 禁止: records content の記録・送信・破壊的なキャッシュクリア
// ============================================================

// ─── 定数 ────────────────────────────────────────────────────
var _TELEMETRY_MAX       = 100;
var _REPLAY_MAX          = 100;
var _SUPABASE_SAMPLE_MAX = 60;
var _RENDER_HIST_MAX     = 50;
var _LOGIC_ERR_MAX       = 50;
var _UI_ERR_MAX          = 50;
var _RETRY_HIST_MAX      = 80;

var _SAFE_CACHE_KEY     = 'ippo_safe_cache_mode';
var _REGRESSION_KEY     = 'ippo_regression_baseline';
var _DIAG_OVERLAY_KEY   = 'ippo_diagnostics_overlay';

var _APP_VERSION = (function () {
  try {
    var meta = document.querySelector('meta[name="app-version"]');
    if (meta && meta.content) return meta.content;
  } catch (_) {}
  try {
    if (typeof __APP_VERSION__ !== 'undefined') return __APP_VERSION__;
  } catch (_) {}
  return 'unknown';
})();

var _IS_DIAG_OVERLAY = (function () {
  try {
    return (
      localStorage.getItem(_DIAG_OVERLAY_KEY) === '1' ||
      window.location.search.includes('ippo_diag=1')
    );
  } catch (_) { return false; }
})();

// ─── ユーティリティ ────────────────────────────────────────

function _now() { return Date.now(); }
function _elapsed(from) { return _now() - from; }

function _idle(fn) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(fn, { timeout: 2000 });
  } else {
    setTimeout(fn, 80);
  }
}

function _throttle(fn, ms) {
  var _last = 0;
  return function () {
    var now = _now();
    if (now - _last >= ms) { _last = now; return fn.apply(this, arguments); }
  };
}

function _safeGet(fn, fallback) {
  try { return fn(); } catch (_) { return (fallback !== undefined) ? fallback : null; }
}

function _isLowEnd() {
  var mem   = _safeGet(function () { return navigator.deviceMemory; }, null);
  var cores = _safeGet(function () { return navigator.hardwareConcurrency; }, null);
  return (mem != null && mem < 2) || (cores != null && cores < 2);
}

// ─── §16: Ring Buffer (性能安全) ─────────────────────────────
function RingBuffer(maxSize) {
  this._max = maxSize;
  this._buf = [];
}
RingBuffer.prototype.push = function (item) {
  this._buf.push(Object.assign({}, item, { _ts: _now() }));
  if (this._buf.length > this._max) this._buf.shift();
};
RingBuffer.prototype.getAll  = function () { return this._buf.slice(); };
RingBuffer.prototype.getLast = function (n) { return this._buf.slice(-n); };
RingBuffer.prototype.clear   = function () { this._buf = []; };
Object.defineProperty(RingBuffer.prototype, 'size', {
  get: function () { return this._buf.length; }
});

// ─── 内部状態 ──────────────────────────────────────────────
var _s = {
  startTs:      _now(),
  initialized:  false,
  safeMode:     false,

  // Bootstrap stage tracking (populated by ippo:*-ready events)
  bootstrapStages: {
    environmentReady: null,
    ownershipReady:   null,
    supabaseReady:    null,
    bootstrapReady:   null,
  },

  telemetry:       new RingBuffer(_TELEMETRY_MAX),
  replayActions:   new RingBuffer(_REPLAY_MAX),
  renderHistory:   new RingBuffer(_RENDER_HIST_MAX),
  logicErrors:     new RingBuffer(_LOGIC_ERR_MAX),
  uiErrors:        new RingBuffer(_UI_ERR_MAX),
  retryHistory:    new RingBuffer(_RETRY_HIST_MAX),

  sbAuthLat:   new RingBuffer(_SUPABASE_SAMPLE_MAX),
  sbRestoreLat: new RingBuffer(_SUPABASE_SAMPLE_MAX),
  sbSaveLat:   new RingBuffer(_SUPABASE_SAMPLE_MAX),
  sbRetryCount:    0,
  sbTimeoutCount:  0,
  sbFailedSync:    0,
  sbStaleToken:    0,
  sbPermDenied:    0,

  startupSequence: [],
  hydrationChain:  [],
  authChain:       [],
  failedModules:   {},

  swStatus:    null,
  cacheStatus: null,
  deviceInfo:  null,
  versionInfo: null,

  lifecycle: {
    startup:     null,
    cache:       null,
    sw:          null,
    render:      null,
    supabase:    null,
    device:      null,
    replayReady: false,
  },

  regressionBaseline: null,
  moduleHealth:       {},

  overlayEl:       null,
  overlayInterval: null,

  _saveStartTs: null,
};

try {
  _s.safeMode = localStorage.getItem(_SAFE_CACHE_KEY) === '1';
} catch (_) {}

// ═══════════════════════════════════════════════════════════
// §13: Safe Telemetry Ring Buffer
// records content を一切含まない local-only テレメトリ
// ═══════════════════════════════════════════════════════════
function _recordTelemetry(errorType, phase, extra) {
  extra = extra || {};
  _s.telemetry.push({
    errorType:       errorType,
    phase:           phase,
    module:          extra.module || null,
    runtimeMode:     _safeGet(function () { return window.ippoBrain && window.ippoBrain.getMode(); }, 'unknown'),
    retryCount:      extra.retryCount || 0,
    deviceClass:     _s.deviceInfo ? _s.deviceInfo.deviceClass : 'unknown',
    swActive:        _s.swStatus ? _s.swStatus.active : null,
    online:          navigator.onLine,
    renderIntegrity: _s.uiErrors.size === 0,
    detail:          extra.detail || null,
  });
}

// ═══════════════════════════════════════════════════════════
// §4: Cross-Device Runtime Snapshot
// ═══════════════════════════════════════════════════════════
function _collectDeviceInfo() {
  var ua     = _safeGet(function () { return navigator.userAgent || ''; }, '');
  var vendor = _safeGet(function () { return navigator.vendor || ''; }, '');

  var isMobileSafari  = /iPhone|iPad|iPod/.test(ua) && /WebKit/.test(ua) && !/CriOS|Chrome/.test(ua);
  var isAndroidChrome = /Android/.test(ua) && /Chrome\//.test(ua);
  var isFirefox       = /Firefox/.test(ua);
  var isSafari        = /Safari/.test(ua) && /Apple/.test(vendor) && !isAndroidChrome;
  var isDesktopChrome = /Chrome\//.test(ua) && !isMobileSafari && !isAndroidChrome && !isFirefox;

  var isStandalone = _safeGet(function () {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }, false);

  var isIosStandalone = _safeGet(function () {
    return /iPhone|iPad|iPod/.test(ua) && window.navigator.standalone === true;
  }, false);

  var memMB   = _safeGet(function () { return navigator.deviceMemory; }, null);
  var cores   = _safeGet(function () { return navigator.hardwareConcurrency; }, null);
  var isLowMem = memMB != null && memMB < 2;
  var isLowEnd = isLowMem || (cores != null && cores < 2);

  var deviceClass = 'desktop';
  if (isMobileSafari)  deviceClass = isIosStandalone ? 'ios-pwa'        : 'ios-safari';
  else if (isAndroidChrome) deviceClass = isLowMem ? 'android-low-memory' : (isStandalone ? 'android-pwa' : 'android-chrome');
  else if (isStandalone)    deviceClass = 'pwa';

  var isTablet = _safeGet(function () {
    return window.innerWidth >= 768 && window.innerWidth <= 1366 && /Tablet|iPad/.test(ua);
  }, false);
  if (isTablet && deviceClass === 'desktop') deviceClass = 'tablet';

  return {
    browser:        isFirefox ? 'Firefox' : isMobileSafari ? 'Mobile Safari' :
                    isAndroidChrome ? 'Android Chrome' : isDesktopChrome ? 'Chrome' :
                    isSafari ? 'Safari' : 'Other',
    os:             /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' :
                    /Win/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' :
                    /Linux/.test(ua) ? 'Linux' : 'Unknown',
    viewport:       { width: window.innerWidth, height: window.innerHeight },
    deviceMemory:   memMB,
    cpuCores:       cores,
    touchCapable:   'ontouchstart' in window || navigator.maxTouchPoints > 0,
    online:         navigator.onLine,
    pwaStandalone:  isStandalone,
    iosStandalone:  isIosStandalone,
    deviceClass:    deviceClass,
    isLowEnd:       isLowEnd,
    isMobileSafari: isMobileSafari,
    isAndroidChrome:isAndroidChrome,
    isLowMemAndroid: isAndroidChrome && isLowMem,
    isTablet:       isTablet,
    pixelRatio:     _safeGet(function () { return window.devicePixelRatio; }, 1),
    swVersion:      null,
    manifestVersion: null,
    appVersion:     _APP_VERSION,
    collectedAt:    _now(),
  };
}

// ═══════════════════════════════════════════════════════════
// §9: Device Compatibility Matrix
// ═══════════════════════════════════════════════════════════
function _classifyDeviceCrash(error) {
  var device = _s.deviceInfo || {};
  if (device.isMobileSafari)       return 'ios-safari-crash';
  if (device.isLowMemAndroid)      return 'low-memory-android-crash';
  if (device.isAndroidChrome)      return 'android-chrome-crash';
  if (device.isTablet)             return 'tablet-layout-crash';
  if (device.iosStandalone)        return 'ios-pwa-crash';
  if (device.pwaStandalone)        return 'pwa-crash';
  if (device.deviceClass === 'desktop') return 'desktop-crash';
  return 'unknown-device-crash';
}

// ═══════════════════════════════════════════════════════════
// §10: Version Consistency Verification
// ═══════════════════════════════════════════════════════════
function _collectVersionInfo() {
  return new Promise(function (resolve) {
    var info = {
      appVersion:           _APP_VERSION,
      swVersion:            null,
      chunkHash:            null,
      manifestVersion:      null,
      runtimeSchemaVersion: '1',
      mismatch:             false,
      mismatches:           [],
      ts:                   _now(),
    };

    // Chunk hash from script tags
    _safeGet(function () {
      var scripts = Array.from(document.querySelectorAll('script[src]'));
      var main = scripts.find(function (s) { return /main|index/.test(s.src); });
      if (main) {
        var m = main.src.match(/[?&]v=([^&]+)/);
        info.chunkHash = m ? m[1] : null;
      }
    });

    // Manifest version from localStorage cache
    _safeGet(function () {
      info.manifestVersion = localStorage.getItem('ippo_manifest_version');
    });

    // SW version via MessageChannel (async)
    var resolved = false;
    function _done() {
      if (!resolved) { resolved = true; resolve(info); }
    }

    if (!navigator.serviceWorker) { _done(); return; }

    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg || !reg.active) { _done(); return; }

      var ch = new MessageChannel();
      var timer = setTimeout(_done, 1500);
      ch.port1.onmessage = function (e) {
        clearTimeout(timer);
        info.swVersion = _safeGet(function () { return e.data && e.data.version; }, null);
        // mismatch check
        if (info.swVersion && _APP_VERSION !== 'unknown' && info.swVersion !== _APP_VERSION) {
          info.mismatch = true;
          info.mismatches.push({ type: 'sw-app', sw: info.swVersion, app: _APP_VERSION });
        }
        _done();
      };
      try {
        reg.active.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
      } catch (_) { clearTimeout(timer); _done(); }
    }).catch(_done);
  });
}

// ═══════════════════════════════════════════════════════════
// §6: PWA / Service Worker Validation
// ═══════════════════════════════════════════════════════════
function _validateSW() {
  return new Promise(function (resolve) {
    var result = {
      registered:          false,
      active:              false,
      waiting:             false,
      stale:               false,
      duplicateRegistration: false,
      failedActivation:    false,
      staleCaches:         [],
      issues:              [],
      ts:                  _now(),
    };

    if (!('serviceWorker' in navigator)) {
      result.issues.push('service-worker-not-supported');
      return resolve(result);
    }

    navigator.serviceWorker.getRegistrations().then(function (regs) {
      result.duplicateRegistration = regs.length > 1;
      if (result.duplicateRegistration) result.issues.push('duplicate-sw-registration');

      var reg = regs[0];
      if (!reg) { result.issues.push('no-sw-registration'); return resolve(result); }

      result.registered = true;
      result.active     = !!reg.active;
      result.waiting    = !!reg.waiting;

      if (reg.waiting) { result.stale = true; result.issues.push('stale-sw-waiting'); }
      if (!reg.active && !reg.installing) { result.failedActivation = true; result.issues.push('failed-sw-activation'); }

      // Cache health
      caches.keys().then(function (names) {
        var staleRx = /ippo-(?:cache-)?v[1-4]$/;
        var staleCaches = names.filter(function (n) { return staleRx.test(n); });
        if (staleCaches.length > 0) {
          result.stale = true;
          result.staleCaches = staleCaches;
          result.issues.push('stale-cache-detected');
        }
        // icon / manifest presence
        var hasManifestCache = names.some(function (n) { return /ippo/.test(n); });
        if (!hasManifestCache && result.active) {
          result.issues.push('manifest-missing-from-cache');
        }
        resolve(result);
      }).catch(function () { resolve(result); });

    }).catch(function () { result.issues.push('sw-inspection-error'); resolve(result); });
  });
}

// ═══════════════════════════════════════════════════════════
// §5: Supabase Diagnostics
// ═══════════════════════════════════════════════════════════
var _sb = {
  recordLatency: function (type, ms, success, error) {
    var entry = { ms: ms, success: success, err: (error && error.message) ? error.message.slice(0, 80) : null };
    if (type === 'auth')    _s.sbAuthLat.push(entry);
    else if (type === 'restore') _s.sbRestoreLat.push(entry);
    else if (type === 'save')    _s.sbSaveLat.push(entry);

    if (!success) {
      _s.sbFailedSync++;
      var msg = (error && error.message) ? error.message.toLowerCase() : '';
      if (/timeout/i.test(msg))                              _s.sbTimeoutCount++;
      if (/permission denied|row.level security/i.test(msg)) _s.sbPermDenied++;
      if (/jwt|token.*expired|invalid.*token/i.test(msg))    _s.sbStaleToken++;
    }
  },

  recordRetry: function () { _s.sbRetryCount++; },

  classifyError: function (error) {
    if (!navigator.onLine) return 'offline-save-queue';
    var msg  = (error && error.message) ? error.message.toLowerCase() : '';
    var code = (error && error.code)   ? error.code : '';
    if (/timeout/i.test(msg))                              return 'slow-connection';
    if (/jwt|token.*expired|invalid.*token/i.test(msg))   return 'auth-expired';
    if (/permission denied|row.level security/i.test(msg)) return 'permission-denied';
    if (/network|fetch|failed to fetch/i.test(msg))       return 'network-issue';
    if (/session/i.test(msg))                             return 'stale-session';
    if (code === 'PGRST116')                              return 'empty-restore';
    if (/partial/i.test(msg))                             return 'partial-restore';
    if (/mismatch/i.test(msg))                            return 'restore-mismatch';
    return 'unknown';
  },

  getSummary: function () {
    var avg = function (buf) {
      var items = buf.getAll().filter(function (i) { return i.success; });
      if (!items.length) return null;
      return Math.round(items.reduce(function (s, i) { return s + i.ms; }, 0) / items.length);
    };
    return {
      authLatencyAvg:    avg(_s.sbAuthLat),
      restoreLatencyAvg: avg(_s.sbRestoreLat),
      saveLatencyAvg:    avg(_s.sbSaveLat),
      retryCount:        _s.sbRetryCount,
      timeoutCount:      _s.sbTimeoutCount,
      failedSyncCount:   _s.sbFailedSync,
      staleTokenCount:   _s.sbStaleToken,
      permissionDeniedCount: _s.sbPermDenied,
      recentSaveErrors:  _s.sbSaveLat.getAll().filter(function (i) { return !i.success; }).slice(-5),
    };
  },
};

// ═══════════════════════════════════════════════════════════
// §7: Safe Cache Recovery (破壊的クリア禁止)
// ═══════════════════════════════════════════════════════════
var _cacheRecovery = {
  _active: false,
  _reason: null,

  enterSafeMode: function (reason) {
    if (this._active) return;
    this._active = true;
    this._reason = reason;
    _s.safeMode  = true;
    _safeGet(function () { localStorage.setItem(_SAFE_CACHE_KEY, '1'); });
    _recordTelemetry('safe-cache-mode-entered', reason);
    console.warn('[ippo:diagnostics] SAFE_CACHE_MODE:', reason);
    window.dispatchEvent(new CustomEvent('ippo:safe-cache-mode', {
      detail: { reason: reason, recommendation: _cacheRecovery.getRecommendation() },
    }));
  },

  exitSafeMode: function () {
    this._active = false;
    this._reason = null;
    _s.safeMode  = false;
    _safeGet(function () { localStorage.removeItem(_SAFE_CACHE_KEY); });
  },

  isActive: function () { return this._active; },

  getRecommendation: function () {
    if (!this._active) return null;
    return {
      mode:        'SAFE_CACHE_MODE',
      reason:      this._reason,
      action:      'soft-reload-proposed',
      destructive: false,
      userMessage: 'アプリの更新が検出されました。再読み込みすると最新版に更新できます。',
    };
  },

  proposeSoftReload: function () {
    window.dispatchEvent(new CustomEvent('ippo:safe-reload-proposed', {
      detail: { recommendation: this.getRecommendation() },
    }));
  },

  inspectCacheHealth: function () {
    return caches.keys().then(function (names) {
      var result = { staleChunks: [], issues: [], corruption: false };
      var staleRx = /ippo-(?:cache-)?v[1-4]$/;

      result.staleChunks = names.filter(function (n) { return staleRx.test(n); });
      if (result.staleChunks.length > 0) result.issues.push('stale-version-caches');

      // Outdated JS chunk detection
      var currentName = names.find(function (n) { return /ippo-v5|ippo-cache-v5/.test(n); });
      if (!currentName) {
        result.issues.push('current-cache-missing');
        return result;
      }

      return caches.open(currentName).then(function (cache) {
        return cache.keys().then(function (cached) {
          var cachedPaths = cached.map(function (r) {
            return _safeGet(function () { return new URL(r.url).pathname; }, r.url);
          });
          var currentScripts = Array.from(document.querySelectorAll('script[src]'))
            .map(function (s) {
              return _safeGet(function () { return new URL(s.src).pathname; }, s.src);
            });
          var missing = currentScripts.filter(function (p) { return cachedPaths.indexOf(p) === -1; });
          if (missing.length > 0) {
            result.issues.push('outdated-js-chunks');
            missing.forEach(function (p) { result.staleChunks.push(p); });
          }
          return result;
        });
      });
    }).catch(function () {
      return { staleChunks: [], issues: ['cache-inspection-error'], corruption: true };
    });
  },
};

// ═══════════════════════════════════════════════════════════
// §2: Logic Error Detection
// ═══════════════════════════════════════════════════════════
function _detectLogicErrors() {
  var errors = [];
  var state = _safeGet(function () { return window.getState && window.getState(); }, null);
  if (!state) return errors;

  var records     = state.records || [];
  var renderHist  = _s.renderHistory.getAll();

  // save success render mismatch
  if (renderHist.length >= 2) {
    var last = renderHist[renderHist.length - 1];
    var prev = renderHist[renderHist.length - 2];
    if (last.saveSucceeded && Math.abs(prev.recordCount - last.recordCount) > 5) {
      errors.push({ type: 'save-render-mismatch', detail: { prev: prev.recordCount, cur: last.recordCount } });
    }
  }

  // duplicate render (same screen appearing >2 times in last 10)
  var recent10 = _s.renderHistory.getLast(10).map(function (r) { return r.screen; });
  var dupCount = {};
  recent10.forEach(function (s) { dupCount[s] = (dupCount[s] || 0) + 1; });
  var dupeScreens = Object.keys(dupCount).filter(function (k) { return dupCount[k] > 3; });
  if (dupeScreens.length > 0) {
    errors.push({ type: 'duplicate-render', detail: { screens: dupeScreens } });
  }

  // orphan retry loop (>10 retries in 30s)
  var recent30s = _s.retryHistory.getAll().filter(function (r) { return _now() - r._ts < 30000; });
  if (recent30s.length > 10) {
    errors.push({ type: 'orphan-retry-loop', detail: { count: recent30s.length } });
  }

  // infinite polling (>20 poll retries in 60s)
  var pollRetries = _s.retryHistory.getAll().filter(function (r) {
    return r.type === 'poll' && _now() - r._ts < 60000;
  });
  if (pollRetries.length > 20) {
    errors.push({ type: 'infinite-polling', detail: { count: pollRetries.length } });
  }

  // memory growth anomaly (>200MB)
  var memInfo = _safeGet(function () { return performance.memory; }, null);
  if (memInfo && memInfo.usedJSHeapSize > 200 * 1024 * 1024) {
    errors.push({ type: 'memory-growth-anomaly', detail: { usedMB: Math.round(memInfo.usedJSHeapSize / 1048576) } });
  }

  // records mismatch (localStorage vs state)
  _safeGet(function () {
    var raw   = localStorage.getItem('ippo_records');
    if (!raw) return;
    var local = JSON.parse(raw);
    var lc    = Array.isArray(local) ? local.length : 0;
    var sc    = records.length;
    if (Math.abs(sc - lc) > 3) {
      errors.push({ type: 'records-mismatch', detail: { state: sc, local: lc } });
    }
  });

  // startup sequence violation (no markers after 10s)
  if (_elapsed(_s.startTs) > 10000 && _s.startupSequence.length === 0) {
    errors.push({ type: 'startup-sequence-violation', detail: { elapsedMs: _elapsed(_s.startTs) } });
  }

  // stale hydration overwrite: hydrationChain > 3 entries rapidly
  var recentHyd = _s.hydrationChain.filter(function (h) { return _now() - h.ts < 5000; });
  if (recentHyd.length > 3) {
    errors.push({ type: 'stale-hydration-overwrite', detail: { count: recentHyd.length } });
  }

  errors.forEach(function (e) {
    _s.logicErrors.push(e);
    _recordTelemetry('logic-error', e.type, { detail: e.detail });
  });
  return errors;
}

// ═══════════════════════════════════════════════════════════
// §3: UI Integrity Verification
// ═══════════════════════════════════════════════════════════
function _isVisible(el) {
  if (!el) return false;
  try {
    var rect  = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 &&
           style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           parseFloat(style.opacity) > 0;
  } catch (_) { return false; }
}

function _verifyUIIntegrity() {
  var issues = [];
  var state  = _safeGet(function () { return window.getState && window.getState(); }, null);
  var currentScreen = state ? state.currentScreen : null;

  // blank screen
  var main = document.querySelector('#app, #root, .app-container, main, [data-screen]');
  if (!main || !_isVisible(main)) {
    issues.push({ type: 'blank-screen', detail: 'no-main-content-visible' });
  }

  // home rendered
  if (currentScreen === 'home') {
    var homeEl = document.querySelector('[data-screen="home"], #home, .home-screen, .screen-home');
    if (homeEl && !_isVisible(homeEl)) {
      issues.push({ type: 'home-not-rendered', detail: 'home-screen-not-visible' });
    }
  }

  // calendar rendered
  if (currentScreen === 'calendar') {
    var calEl = document.querySelector('[data-screen="calendar"], #calendar, .calendar-screen');
    if (calEl && !_isVisible(calEl)) {
      issues.push({ type: 'calendar-not-rendered', detail: 'calendar-not-visible' });
    }
  }

  // records visible
  var stateRecordCount = state ? (state.records || []).length : 0;
  var domRecords = document.querySelectorAll('[data-record-id], .record-item, .daily-record-card');
  if (stateRecordCount > 0 && domRecords.length === 0 && currentScreen === 'home') {
    issues.push({ type: 'records-not-visible', detail: { stateCount: stateRecordCount, domCount: 0 } });
  }

  // onboarding hidden after completion
  var onboardingEl = document.querySelector('[data-screen="onboarding"], #onboarding, .onboarding');
  var onboardingDone = state && state.onboardingDone === true;
  if (onboardingDone && onboardingEl && _isVisible(onboardingEl)) {
    issues.push({ type: 'onboarding-not-hidden', detail: 'visible-after-completion' });
  }

  // modal consistency (>2 open modals is suspicious)
  var openModals = document.querySelectorAll('[role="dialog"]:not([aria-hidden="true"]), .modal.open, .modal.visible');
  if (openModals.length > 2) {
    issues.push({ type: 'modal-visibility-inconsistency', detail: { openCount: openModals.length } });
  }

  // duplicated screen
  var allScreens = Array.from(document.querySelectorAll('[data-screen]')).filter(_isVisible);
  var screenNames = allScreens.map(function (s) { return s.dataset.screen; });
  var seen = {};
  var dups = [];
  screenNames.forEach(function (name) {
    if (seen[name]) { dups.push(name); } else { seen[name] = true; }
  });
  if (dups.length > 0) {
    issues.push({ type: 'duplicated-screen', detail: { duplicates: dups } });
  }

  // NaN / undefined in visible text (sample first 500 text nodes)
  var root = document.querySelector('#app, main') || document.body;
  if (root) {
    var walker  = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var checked = 0;
    var nanCount = 0;
    var node;
    while ((node = walker.nextNode()) && checked < 500) {
      var txt = (node.textContent || '').trim();
      if (txt === 'NaN' || txt === 'undefined' || txt === 'null') nanCount++;
      checked++;
    }
    if (nanCount > 0) {
      issues.push({ type: 'nan-undefined-ui', detail: { occurrences: nanCount } });
    }
  }

  // invisible critical container
  document.querySelectorAll('[data-critical]').forEach(function (el) {
    if (!_isVisible(el)) {
      issues.push({ type: 'invisible-critical-container', detail: el.id || el.className || 'unknown' });
    }
  });

  // render timeout (any render > 3s)
  var slowRenders = _s.renderHistory.getAll().filter(function (r) { return r.durationMs > 3000; });
  if (slowRenders.length > 0) {
    issues.push({ type: 'render-timeout', detail: {
      slowCount: slowRenders.length,
      maxMs: Math.max.apply(null, slowRenders.map(function (r) { return r.durationMs; })),
    }});
  }

  issues.forEach(function (issue) {
    _s.uiErrors.push(issue);
    _recordTelemetry('ui-error', issue.type, { detail: issue.detail });
  });
  return issues;
}

// ═══════════════════════════════════════════════════════════
// §8: Production Replay Snapshot
// ═══════════════════════════════════════════════════════════
function _captureReplaySnapshot() {
  return {
    capturedAt:       _now(),
    elapsedMs:        _elapsed(_s.startTs),
    startupSequence:  _s.startupSequence.slice(),
    runtimeModeHistory: _safeGet(function () {
      return window.ippoBrain && window.ippoBrain.getAllTimeline
        ? window.ippoBrain.getAllTimeline().slice(-50)
        : [];
    }, []),
    renderChain:      _s.renderHistory.getLast(20),
    hydrationChain:   _s.hydrationChain.slice(-10),
    authChain:        _s.authChain.slice(-10),
    supabaseDiag:     _sb.getSummary(),
    retryHistory:     _s.retryHistory.getLast(20),
    failedModules:    Object.keys(_s.failedModules),
    lastActions:      _s.replayActions.getLast(100),
    logicErrors:      _s.logicErrors.getLast(20),
    uiErrors:         _s.uiErrors.getLast(20),
    telemetry:        _s.telemetry.getLast(30),
    deviceInfo:       _s.deviceInfo,
    versionInfo:      _s.versionInfo,
    swStatus:         _s.swStatus,
    cacheStatus:      _s.cacheStatus,
    healthSnapshot:   _safeGet(function () { return window.ippoHealthMonitor && window.ippoHealthMonitor.getHealth(); }, null),
    lifecycle:        Object.assign({}, _s.lifecycle),
  };
}

// ═══════════════════════════════════════════════════════════
// §12: Regression Detection
// ═══════════════════════════════════════════════════════════
var _regression = {
  captureBaseline: function () {
    var b = {
      at:                _now(),
      startupDuration:   _elapsed(_s.startTs),
      retryFrequency:    _s.retryHistory.size,
      failedModuleCount: Object.keys(_s.failedModules).length,
      logicErrorCount:   _s.logicErrors.size,
      memoryMB:          _safeGet(function () {
        return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      }, null),
      supabase:          _sb.getSummary(),
    };
    _safeGet(function () { localStorage.setItem(_REGRESSION_KEY, JSON.stringify(b)); });
    _s.regressionBaseline = b;
    return b;
  },

  loadBaseline: function () {
    _safeGet(function () {
      var raw = localStorage.getItem(_REGRESSION_KEY);
      if (raw) _s.regressionBaseline = JSON.parse(raw);
    });
    return _s.regressionBaseline;
  },

  compare: function (current) {
    var baseline = _s.regressionBaseline;
    if (!baseline) return null;
    var regressions = [];
    var cmp = function (metric, base, cur, threshPct) {
      if (base == null || cur == null || base === 0) return;
      var delta = ((cur - base) / base) * 100;
      if (delta > threshPct) {
        regressions.push({ metric: metric, baseline: base, current: cur, deltaPct: Math.round(delta) });
      }
    };
    cmp('startupDuration',   baseline.startupDuration,   current.startupDuration,   30);
    cmp('retryFrequency',    baseline.retryFrequency,     current.retryFrequency,     50);
    cmp('failedModuleCount', baseline.failedModuleCount,  current.failedModuleCount,   0);
    cmp('logicErrorCount',   baseline.logicErrorCount,    current.logicErrorCount,    50);
    cmp('memoryMB',          baseline.memoryMB,           current.memoryMB,           50);
    if (baseline.supabase && current.supabase) {
      cmp('saveLatency',    baseline.supabase.saveLatencyAvg,  current.supabase.saveLatencyAvg,  30);
      cmp('failedSyncCount', baseline.supabase.failedSyncCount, current.supabase.failedSyncCount, 50);
    }
    return {
      hasRegressions: regressions.length > 0,
      regressions:    regressions,
      baseline:       { at: baseline.at },
      compared:       { at: current.at || _now() },
    };
  },
};

// ═══════════════════════════════════════════════════════════
// §14: Production Verification Lifecycle
// ═══════════════════════════════════════════════════════════
function _runVerificationLifecycle() {
  var lc = _s.lifecycle;

  // 1. Startup
  lc.startup = {
    ok:         _s.startupSequence.length > 0 || _elapsed(_s.startTs) < 5000,
    seqLength:  _s.startupSequence.length,
    elapsedMs:  _elapsed(_s.startTs),
    ts:         _now(),
  };

  // 2. Cache
  _idle(function () {
    _cacheRecovery.inspectCacheHealth().then(function (cacheHealth) {
      lc.cache      = Object.assign({ ok: cacheHealth.issues.length === 0, ts: _now() }, cacheHealth);
      _s.cacheStatus = lc.cache;
      if (!lc.cache.ok) _cacheRecovery.enterSafeMode('stale-cache-on-verify');
    });
  });

  // 3. SW
  _idle(function () {
    _validateSW().then(function (sw) {
      lc.sw     = Object.assign({ ok: sw.issues.length === 0 }, sw);
      _s.swStatus = sw;
      if (sw.stale || sw.duplicateRegistration) {
        _cacheRecovery.enterSafeMode('stale-sw-on-verify');
      }
    });
  });

  // 4. Render
  _idle(function () {
    var uiIssues = _verifyUIIntegrity();
    lc.render = { ok: uiIssues.length === 0, issues: uiIssues, ts: _now() };
  });

  // 5. Supabase
  _idle(function () {
    var sb = _sb.getSummary();
    lc.supabase = Object.assign({ ok: sb.failedSyncCount === 0 && sb.staleTokenCount === 0, ts: _now() }, sb);
  });

  // 6. Device
  _idle(function () {
    var device  = _collectDeviceInfo();
    _s.deviceInfo = device;
    lc.device   = { ok: true, deviceClass: device.deviceClass, isLowEnd: device.isLowEnd, ts: _now() };
  });

  // 7. Version + replay readiness
  _idle(function () {
    _collectVersionInfo().then(function (vi) {
      _s.versionInfo = vi;
      if (vi.mismatch) {
        _cacheRecovery.enterSafeMode('version-mismatch');
        _cacheRecovery.proposeSoftReload();
      }
    });
    lc.replayReady = true;
  });
}

// ═══════════════════════════════════════════════════════════
// §15: Module-Level Diagnostics
// ═══════════════════════════════════════════════════════════
function _installModuleDiagnostics() {
  var registry = _safeGet(function () { return window.ippoOwnershipRegistry; }, null);
  if (!registry || typeof registry.getAll !== 'function') return;
  var modules = _safeGet(function () { return registry.getAll(); }, []);
  modules.forEach(function (moduleName) {
    _s.moduleHealth[moduleName] = {
      getHealth: function () {
        return {
          module:      moduleName,
          ok:          !_s.failedModules[moduleName],
          retryState:  _s.retryHistory.getAll().filter(function (r) { return r.module === moduleName; }),
          pendingTasks: 0,
          ts:          _now(),
        };
      },
      getLastRender: function () {
        var renders = _s.renderHistory.getAll().filter(function (r) { return r.screen === moduleName; });
        return renders[renders.length - 1] || null;
      },
      getRetryState:   function () { return _s.retryHistory.getAll().filter(function (r) { return r.module === moduleName; }); },
      getPendingTasks: function () { return 0; },
    };
  });
}

// ═══════════════════════════════════════════════════════════
// §11: Production Overlay (dev flag のみ)
// ═══════════════════════════════════════════════════════════
function _createProductionOverlay() {
  if (!_IS_DIAG_OVERLAY) return;
  if (_s.overlayEl) return;

  var el = document.createElement('div');
  el.id  = 'ippo-diagnostics-overlay';
  el.style.cssText = [
    'position:fixed', 'bottom:0', 'left:0', 'z-index:99998',
    'background:rgba(0,0,0,0.88)', 'color:#00e87a',
    'font:10px/1.45 monospace', 'padding:6px 8px',
    'max-width:300px', 'max-height:55vh', 'overflow-y:auto',
    'border-top-right-radius:6px', 'pointer-events:none',
    'white-space:pre', 'box-shadow:0 0 8px rgba(0,232,122,0.25)',
  ].join(';');

  function _attach() { document.body.appendChild(el); _s.overlayEl = el; _updateOverlay(); }
  if (document.body) { _attach(); }
  else { document.addEventListener('DOMContentLoaded', _attach); }

  _s.overlayInterval = setInterval(_updateOverlay, 2000);
}

function _updateOverlay() {
  var el = _s.overlayEl;
  if (!el) return;

  var runtimeMode  = _safeGet(function () { return window.ippoBrain && window.ippoBrain.getMode(); }, '?');
  var ctrlMode     = _safeGet(function () { return window.ippoRuntimeController && window.ippoRuntimeController.getMode(); }, '?');
  var memMB        = _safeGet(function () { return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null; }, null);
  var device       = _s.deviceInfo || {};
  var vi           = _s.versionInfo || {};
  var lc           = _s.lifecycle;
  var sb           = _sb.getSummary();

  var fmtOk = function (v) { return v === null ? '…' : (v ? 'OK' : 'NG'); };

  el.textContent = [
    '[ippo:diag] ' + new Date().toLocaleTimeString(),
    'mode: ' + runtimeMode + ' / ctrl: ' + ctrlMode,
    'startup: ' + fmtOk(lc.startup && lc.startup.ok) + ' | render: ' + fmtOk(lc.render && lc.render.ok),
    'cache: '  + fmtOk(lc.cache && lc.cache.ok)    + ' | SW: '    + fmtOk(_s.swStatus && _s.swStatus.active),
    'supabase: saves=' + sb.saveLatencyAvg + 'ms fails=' + sb.failedSyncCount,
    'net: ' + (navigator.onLine ? 'online' : 'OFFLINE') + ' | mem: ' + (memMB != null ? memMB + 'MB' : '?'),
    'device: ' + (device.deviceClass || '?') + ' | PWA: ' + (device.pwaStandalone ? 'yes' : 'no'),
    'v: ' + (vi.appVersion || '?') + ' | safe: ' + (_cacheRecovery.isActive() ? 'SAFE_MODE !' : 'off'),
    'logic-err: ' + _s.logicErrors.size + ' | ui-err: ' + _s.uiErrors.size,
    'failed-mod: ' + Object.keys(_s.failedModules).length + ' | retry: ' + _s.retryHistory.size,
    'telemetry: ' + _s.telemetry.size + ' | replay: ' + _s.replayActions.size,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════
// §16: Performance Safety – throttled polling
// ═══════════════════════════════════════════════════════════
function _setupPerformanceSafety() {
  var low         = _isLowEnd();
  var pollMs      = low ? 12000 : 6000;
  var verifyMs    = low ? 45000 : 20000;

  var _throttledUI    = _throttle(_verifyUIIntegrity,  verifyMs);
  var _throttledLogic = _throttle(_detectLogicErrors,  verifyMs);

  setInterval(function () {
    _idle(function () {
      _throttledLogic();
      var screen = _safeGet(function () { return window.getState && window.getState().currentScreen; }, null);
      if (screen) {
        _s.renderHistory.push({
          screen:      screen,
          recordCount: _safeGet(function () { return (window.getState && window.getState().records || []).length; }, 0),
          saveSucceeded: false,
          durationMs:  0,
        });
      }
    });
  }, pollMs);

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    _idle(function () {
      _throttledUI();
      _validateSW().then(function (sw) {
        _s.swStatus = sw;
        if (sw.stale) _cacheRecovery.enterSafeMode('stale-sw-on-resume');
      });
    });
  });

  window.addEventListener('online',  function () { _recordTelemetry('connectivity', 'online-restored'); });
  window.addEventListener('offline', function () { _recordTelemetry('connectivity', 'went-offline'); });
}

// ═══════════════════════════════════════════════════════════
// Runtime Event Listeners (boot / hydration / auth / save / retry / screen)
// ═══════════════════════════════════════════════════════════
function _installRuntimeListeners() {
  // Bootstrap convergence events
  window.addEventListener('ippo:environment-ready', function (e) {
    _s.bootstrapStages.environmentReady = { ts: _now(), detail: e.detail || {} };
    _s.startupSequence.push({ name: 'environment-ready', data: e.detail || null, ts: _now() });
  });
  window.addEventListener('ippo:ownership-ready', function (e) {
    _s.bootstrapStages.ownershipReady = { ts: _now(), detail: e.detail || {} };
    _s.startupSequence.push({ name: 'ownership-ready', data: e.detail || null, ts: _now() });
  });
  window.addEventListener('ippo:supabase-ready', function (e) {
    _s.bootstrapStages.supabaseReady = { ts: _now(), detail: e.detail || {} };
    _s.startupSequence.push({ name: 'supabase-ready', data: e.detail || null, ts: _now() });
  });
  window.addEventListener('ippo:bootstrap-ready', function (e) {
    _s.bootstrapStages.bootstrapReady = { ts: _now(), detail: e.detail || {} };
    _s.startupSequence.push({ name: 'bootstrap-ready', data: e.detail || null, ts: _now() });
  });

  // Intercept boot markers
  var _origMark = window.ippoMarkBootEvent;
  window.ippoMarkBootEvent = function (name, data) {
    _s.startupSequence.push({ name: name, data: data || null, ts: _now() });
    _s.replayActions.push({ type: 'boot', name: name });
    if (_origMark) _origMark.call(window, name, data);
  };

  // Hydration
  document.addEventListener('ippo:hydration-complete', function (e) {
    _s.hydrationChain.push({ event: 'hydration-complete', detail: e.detail, ts: _now() });
    _s.replayActions.push({ type: 'hydration' });
    _sb.recordLatency('restore', e.detail && e.detail.ms || 0, true);
  });

  document.addEventListener('ippo:state-ready', function () {
    _s.startupSequence.push({ name: 'state-ready', ts: _now() });
    _s.replayActions.push({ type: 'state-ready' });
  });

  // Auth
  document.addEventListener('ippo:auth-change', function (e) {
    var status = e.detail && e.detail.status;
    _s.authChain.push({ event: 'auth-change', status: status, ts: _now() });
    _s.replayActions.push({ type: 'auth', status: status });
  });

  // Save latency
  document.addEventListener('ippo:save-start', function () { _s._saveStartTs = _now(); });
  document.addEventListener('ippo:save-complete', function () {
    if (_s._saveStartTs) {
      var ms = _now() - _s._saveStartTs;
      _sb.recordLatency('save', ms, true);
      _s.replayActions.push({ type: 'save', ms: ms, success: true });
      _s._saveStartTs = null;
    }
  });
  document.addEventListener('ippo:save-error', function (e) {
    if (_s._saveStartTs) {
      var ms = _now() - _s._saveStartTs;
      var err = e.detail && e.detail.error;
      _sb.recordLatency('save', ms, false, err);
      _s.replayActions.push({ type: 'save-error', ms: ms });
      _s._saveStartTs = null;
    }
  });

  // Auth latency
  document.addEventListener('ippo:auth-latency', function (e) {
    var d = e.detail || {};
    _sb.recordLatency('auth', d.ms || 0, d.success !== false, d.error);
  });

  // Retry
  document.addEventListener('ippo:retry', function (e) {
    var d = e.detail || {};
    _s.retryHistory.push({ type: d.type || 'unknown', module: d.module || null });
    _sb.recordRetry();
  });

  // Screen change
  document.addEventListener('ippo:screen-change', function (e) {
    var d = e.detail || {};
    if (d.screen) {
      _s.renderHistory.push({
        screen:       d.screen,
        recordCount:  _safeGet(function () { return (window.getState && window.getState().records || []).length; }, 0),
        durationMs:   d.durationMs || 0,
        saveSucceeded: false,
      });
      _s.replayActions.push({ type: 'screen-change', screen: d.screen });
    }
  });

  // Module failure
  document.addEventListener('ippo:module-failed', function (e) {
    var mod = e.detail && e.detail.module;
    if (mod) _s.failedModules[mod] = true;
    _recordTelemetry('module-failed', 'module', { module: mod });
  });

  // JS errors → replay + telemetry (no content, only type/location)
  window.addEventListener('error', function (e) {
    var file = _safeGet(function () { return e.filename.split('/').slice(-2).join('/'); }, 'unknown');
    _s.replayActions.push({ type: 'js-error', message: (e.message || '').slice(0, 120), file: file });
    _recordTelemetry('js-error', 'runtime', { detail: (e.message || '').slice(0, 80) });
    _classifyDeviceCrash(e);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var msg = String((e.reason && e.reason.message) || e.reason || '').slice(0, 120);
    _s.replayActions.push({ type: 'unhandled-rejection', message: msg });
    _recordTelemetry('unhandled-rejection', 'runtime', { detail: msg.slice(0, 80) });
  });
}

// ═══════════════════════════════════════════════════════════
// §1: Runtime Health Verification – Public API helpers
// ═══════════════════════════════════════════════════════════
var _health = {
  getHealth: function () {
    return {
      ok:             _s.logicErrors.size === 0 && _s.uiErrors.size === 0 && !_cacheRecovery.isActive(),
      safeMode:       _cacheRecovery.isActive(),
      runtimeMode:    _safeGet(function () { return window.ippoBrain && window.ippoBrain.getMode(); }, 'unknown'),
      controllerMode: _safeGet(function () { return window.ippoRuntimeController && window.ippoRuntimeController.getMode(); }, 'unknown'),
      errorCount:     _s.logicErrors.size,
      uiErrorCount:   _s.uiErrors.size,
      telemetryCount: _s.telemetry.size,
      failedModules:  Object.keys(_s.failedModules),
      online:         navigator.onLine,
      uptime:         _elapsed(_s.startTs),
      ts:             _now(),
    };
  },

  getRuntimeSnapshot: function () {
    return {
      brain:          _safeGet(function () { return window.ippoBrain && window.ippoBrain.getMode(); }, null),
      controller:     _safeGet(function () { return window.ippoRuntimeController && window.ippoRuntimeController.getMode(); }, null),
      orchestrator:   _safeGet(function () { return window.ippoRuntime && window.ippoRuntime.getStatus(); }, null),
      healthMonitor:  _safeGet(function () { return window.ippoHealthMonitor && window.ippoHealthMonitor.getHealth(); }, null),
      rollbackSnaps:  _safeGet(function () { return window.ippoRollbackManager && window.ippoRollbackManager.getSnapshots ? window.ippoRollbackManager.getSnapshots().length : 0; }, 0),
      syncChecker:    _safeGet(function () { return window.ippoSyncConsistencyChecker && window.ippoSyncConsistencyChecker.getStatus ? window.ippoSyncConsistencyChecker.getStatus() : null; }, null),
      authCloud:      _safeGet(function () { return window.ippoAuthCloudState && window.ippoAuthCloudState.getState ? window.ippoAuthCloudState.getState() : null; }, null),
      ts:             _now(),
    };
  },

  getRenderIntegrity: function () {
    return {
      ok:            _s.uiErrors.size === 0,
      issues:        _s.uiErrors.getLast(10),
      renderHistory: _s.renderHistory.getLast(10),
      ts:            _now(),
    };
  },

  getStartupHealth: function () {
    return {
      ok:        _s.startupSequence.length > 0,
      sequence:  _s.startupSequence.slice(),
      elapsedMs: _elapsed(_s.startTs),
      lifecycle: Object.assign({}, _s.lifecycle),
      ts:        _now(),
    };
  },

  getHydrationHealth: function () {
    return {
      chain: _s.hydrationChain.slice(),
      count: _s.hydrationChain.length,
      last:  _s.hydrationChain[_s.hydrationChain.length - 1] || null,
      ts:    _now(),
    };
  },

  getAuthHealth: function () {
    return {
      chain:          _s.authChain.slice(-10),
      supabase:       _sb.getSummary(),
      authCloudState: _safeGet(function () { return window.ippoAuthCloudState && window.ippoAuthCloudState.getState ? window.ippoAuthCloudState.getState() : null; }, null),
      ts:             _now(),
    };
  },

  getCloudHealth: function () {
    var sb = _sb.getSummary();
    return Object.assign({
      ok:             sb.failedSyncCount < 5 && sb.staleTokenCount === 0,
      classification: sb.failedSyncCount > 0 ? _sb.classifyError({ message: 'accumulated-failures' }) : 'healthy',
      ts:             _now(),
    }, sb);
  },

  getDeviceInfo: function () {
    return _s.deviceInfo || _collectDeviceInfo();
  },

  getCacheStatus: function () {
    return _s.cacheStatus || { inspected: false, ts: _now() };
  },

  getSWStatus: function () {
    return _s.swStatus || { inspected: false, ts: _now() };
  },
};

// ═══════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════
function _init() {
  if (_s.initialized) return;
  _s.initialized = true;

  _s.deviceInfo = _collectDeviceInfo();
  _regression.loadBaseline();
  _installRuntimeListeners();

  var _run = function () {
    _runVerificationLifecycle();
    _createProductionOverlay();
    _setupPerformanceSafety();
    _installModuleDiagnostics();

    // Capture regression baseline after 30s stabilization
    setTimeout(function () {
      _idle(function () { _regression.captureBaseline(); });
    }, 30000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _run);
  } else {
    _idle(_run);
  }
}

// ═══════════════════════════════════════════════════════════
// Public API: window.ippoDiagnostics
// ═══════════════════════════════════════════════════════════
window.ippoDiagnostics = {
  // §0 Environment & Bootstrap (added Phase 12)
  getEnvironmentHealth: function () {
    // Delegate to environment-service if available; fall back to window globals.
    if (window.__ippoEnvironmentReady && typeof window.__ippoEnvironmentHealth === 'function') {
      return window.__ippoEnvironmentHealth();
    }
    var keyPresent  = !!(window.SUPABASE_KEY && window.SUPABASE_KEY !== '');
    var urlPresent  = !!(window.SUPABASE_URL);
    var safeMode    = !!(window.__ippoSafeBootstrapMode);
    var issues = [];
    if (!keyPresent) issues.push('missing-supabase-key');
    if (!urlPresent) issues.push('missing-supabase-url');
    return {
      healthy:           issues.length === 0,
      issues:            issues,
      supabaseUrl:       window.SUPABASE_URL || null,
      keyPresent:        keyPresent,
      safeBootstrapMode: safeMode,
      envServiceReady:   !!(window.__ippoEnvironmentReady),
      checkedAt:         new Date().toISOString(),
    };
  },

  getBootstrapStatus: function () {
    var stages  = _s.bootstrapStages;
    var allDone = !!(stages.environmentReady && stages.ownershipReady &&
                     stages.supabaseReady && stages.bootstrapReady);
    return {
      complete:         allDone,
      safeBootstrap:    !!(window.__ippoSafeBootstrapMode),
      environmentReady: !!stages.environmentReady,
      ownershipReady:   !!stages.ownershipReady,
      supabaseReady:    !!stages.supabaseReady,
      bootstrapReady:   !!stages.bootstrapReady,
      stages:           {
        environment: stages.environmentReady,
        ownership:   stages.ownershipReady,
        supabase:    stages.supabaseReady,
        bootstrap:   stages.bootstrapReady,
      },
      startupSequence:  _s.startupSequence.slice(-30),
      elapsedMs:        _elapsed(_s.startTs),
      ts:               _now(),
    };
  },

  // §1 Health
  getHealth:            function () { return _health.getHealth(); },
  getRuntimeSnapshot:   function () { return _health.getRuntimeSnapshot(); },
  getRenderIntegrity:   function () { return _health.getRenderIntegrity(); },
  getStartupHealth:     function () { return _health.getStartupHealth(); },
  getHydrationHealth:   function () { return _health.getHydrationHealth(); },
  getAuthHealth:        function () { return _health.getAuthHealth(); },
  getCloudHealth:       function () { return _health.getCloudHealth(); },
  getDeviceInfo:        function () { return _health.getDeviceInfo(); },
  getCacheStatus:       function () { return _health.getCacheStatus(); },
  getSWStatus:          function () { return _health.getSWStatus(); },

  // §8 Replay
  captureReplaySnapshot: function () { return _captureReplaySnapshot(); },

  // §7 Safe Cache
  getCacheRecovery:           function () { return _cacheRecovery; },
  getSafeCacheModeRecommendation: function () { return _cacheRecovery.getRecommendation(); },

  // §12 Regression
  captureRegressionBaseline: function () { return _regression.captureBaseline(); },
  getRegressionReport: function () {
    return _regression.compare({
      at:                _now(),
      startupDuration:   _elapsed(_s.startTs),
      retryFrequency:    _s.retryHistory.size,
      failedModuleCount: Object.keys(_s.failedModules).length,
      logicErrorCount:   _s.logicErrors.size,
      memoryMB:          _safeGet(function () {
        return performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
      }, null),
      supabase: _sb.getSummary(),
    });
  },

  // §5 Supabase
  recordSupabaseLatency: function (type, ms, success, error) { _sb.recordLatency(type, ms, success, error); },
  classifySupabaseError: function (error) { return _sb.classifyError(error); },
  getSupabaseDiagnostics: function () { return _sb.getSummary(); },

  // §13 Telemetry
  getTelemetry: function () { return _s.telemetry.getAll(); },

  // §2 Logic errors
  detectLogicErrors: function () { return _detectLogicErrors(); },
  getLogicErrors:    function () { return _s.logicErrors.getAll(); },

  // §3 UI integrity
  verifyUIIntegrity: function () { return _verifyUIIntegrity(); },
  getUIErrors:       function () { return _s.uiErrors.getAll(); },

  // §15 Module diagnostics
  getModuleDiagnostics: function (mod) { return _s.moduleHealth[mod] || null; },
  getAllModuleHealth: function () {
    var out = {};
    Object.keys(_s.moduleHealth).forEach(function (k) {
      out[k] = _s.moduleHealth[k].getHealth();
    });
    return out;
  },

  // §11 Overlay
  showOverlay: function () {
    _safeGet(function () { localStorage.setItem(_DIAG_OVERLAY_KEY, '1'); });
    _createProductionOverlay();
  },
  hideOverlay: function () {
    _safeGet(function () { localStorage.removeItem(_DIAG_OVERLAY_KEY); });
    if (_s.overlayEl) { _s.overlayEl.remove(); _s.overlayEl = null; }
    if (_s.overlayInterval) { clearInterval(_s.overlayInterval); _s.overlayInterval = null; }
  },

  // Full dump (console / support use)
  getDiagnosticDump: function () {
    return {
      environmentHealth: window.ippoDiagnostics.getEnvironmentHealth(),
      bootstrapStatus:   window.ippoDiagnostics.getBootstrapStatus(),
      health:          _health.getHealth(),
      runtime:         _health.getRuntimeSnapshot(),
      renderIntegrity: _health.getRenderIntegrity(),
      startupHealth:   _health.getStartupHealth(),
      authHealth:      _health.getAuthHealth(),
      cloudHealth:     _health.getCloudHealth(),
      deviceInfo:      _health.getDeviceInfo(),
      cacheStatus:     _health.getCacheStatus(),
      swStatus:        _health.getSWStatus(),
      supabase:        _sb.getSummary(),
      versionInfo:     _s.versionInfo,
      logicErrors:     _s.logicErrors.getAll(),
      uiErrors:        _s.uiErrors.getAll(),
      telemetry:       _s.telemetry.getLast(20),
      replay:          _captureReplaySnapshot(),
      regression:      window.ippoDiagnostics.getRegressionReport(),
      safeMode:        _cacheRecovery.isActive(),
      safeModeRec:     _cacheRecovery.getRecommendation(),
    };
  },

  // Internal hooks (for runtime integration)
  _recordReplayAction: function (action) { _s.replayActions.push(action); },
  _recordTelemetry:    function (type, phase, extra) { _recordTelemetry(type, phase, extra); },
  _recordRender:       function (screen, data) { _s.renderHistory.push(Object.assign({ screen: screen }, data)); },
  _markModuleFailed:   function (mod) { _s.failedModules[mod] = true; },
};

_init();

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('production-diagnostics-loaded', {
    safeMode: _cacheRecovery.isActive(),
    appVersion: _APP_VERSION,
    deviceClass: _s.deviceInfo ? _s.deviceInfo.deviceClass : 'unknown',
    overlayEnabled: _IS_DIAG_OVERLAY,
  });
}

export {};
