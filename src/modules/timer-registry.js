// ============================================================
//  ippo – src/modules/timer-registry.js
//  Timer Registry: track all setTimeout/setInterval calls by owner module.
//
//  Problem solved:
//  app-legacy.js has timers scattered across functions with no cleanup
//  strategy. On screen transitions or module pause/resume, timers leak.
//  fastInterval, premiumCheckInterval, adminCheckInterval run globally
//  with no lifecycle management.
//
//  Solution:
//  Central registry. Each module registers its timers under its name.
//  On module pause() → timers suspended.
//  On module destroy() → timers cleared.
//  Provides full inventory for diagnosis.
// ============================================================

(function () {
  'use strict';

  // ─── Registry ───────────────────────────────────────────────
  // Map<handle, { owner, type, label, createdAt, delay, cleared }>
  var _timers = {};

  // ─── Counter for unique handle keys ──────────────────────────
  // We wrap native setTimeout/setInterval and use native handles as keys.

  // ─── Suspension: paused modules store callbacks for resume ───
  // Map<moduleName, Array<{ type, fn, delay, label, remaining }>>
  var _suspended = {};

  // Paused modules
  var _paused = {};

  // ─── History log (ring buffer) ───────────────────────────────
  var _history = [];
  var HISTORY_MAX = 100;

  function _addHistory(entry) {
    _history.push(entry);
    if (_history.length > HISTORY_MAX) _history.shift();
  }

  // ─── Timer classification ─────────────────────────────────────
  var TIMER_TYPES = Object.freeze({
    STARTUP:   'startup',    // fires once at startup
    RETRY:     'retry',      // retry / polling loop
    ANIMATION: 'animation',  // UI animation / fade
    POLLING:   'polling',    // periodic health/sync check
    HYDRATION: 'hydration',  // waiting for state/supabase ready
    UI:        'ui',         // brief UI feedback (toast, spinner)
    FASTING:   'fasting',    // fasting countdown interval
    AUTH:      'auth',       // auth state polling
  });

  // ─── Registration ─────────────────────────────────────────────

  /**
   * Register a native timer handle (after calling native setTimeout etc.)
   * @param {number}  handle   Native timer handle returned by setTimeout/setInterval
   * @param {string}  owner    Module name
   * @param {'timeout'|'interval'} type
   * @param {string}  label    Human-readable label
   * @param {number}  delay    ms delay
   * @param {string}  [timerType]  One of TIMER_TYPES
   */
  function register(handle, owner, type, label, delay, timerType) {
    _timers[handle] = {
      handle: handle,
      owner: owner,
      type: type,     // 'timeout' | 'interval'
      label: label,
      delay: delay,
      timerType: timerType || TIMER_TYPES.UI,
      createdAt: Date.now(),
      cleared: false,
    };
    _addHistory({ op: 'register', handle: handle, owner: owner, label: label, ts: Date.now() });
    return handle;
  }

  /**
   * Clear a registered timer.
   */
  function clear(handle) {
    var entry = _timers[handle];
    if (!entry) return;
    if (entry.type === 'interval') {
      clearInterval(handle);
    } else {
      clearTimeout(handle);
    }
    entry.cleared = true;
    _addHistory({ op: 'clear', handle: handle, owner: entry.owner, label: entry.label, ts: Date.now() });
  }

  /**
   * Clear all timers owned by a module.
   */
  function clearOwner(moduleName) {
    Object.keys(_timers).forEach(function (h) {
      var entry = _timers[h];
      if (entry.owner === moduleName && !entry.cleared) {
        clear(h);
      }
    });
    delete _suspended[moduleName];
  }

  /**
   * Pause all interval timers for a module.
   * Timeout timers are left running (can't pause reliably without remaining calc).
   * Intervals are cleared and stored for resume().
   */
  function pauseOwner(moduleName) {
    _paused[moduleName] = true;
    var suspended = [];
    Object.keys(_timers).forEach(function (h) {
      var entry = _timers[h];
      if (entry.owner === moduleName && !entry.cleared && entry.type === 'interval') {
        clearInterval(h);
        entry.cleared = true;
        suspended.push({
          label: entry.label,
          delay: entry.delay,
          timerType: entry.timerType,
          // fn is not stored (timers are opaque) – module must re-register on resume
        });
        _addHistory({ op: 'pause', handle: h, owner: moduleName, label: entry.label, ts: Date.now() });
      }
    });
    _suspended[moduleName] = suspended;
  }

  /**
   * Resume a paused module.
   * Note: Modules that need interval restart must listen for ippo:module-resumed
   * event and re-register their intervals.
   */
  function resumeOwner(moduleName) {
    delete _paused[moduleName];
    var suspended = _suspended[moduleName] || [];
    delete _suspended[moduleName];
    // Dispatch event so module can re-create intervals
    if (suspended.length > 0) {
      window.dispatchEvent(new CustomEvent('ippo:module-resumed', {
        detail: { moduleName: moduleName, suspendedTimers: suspended }
      }));
    }
    _addHistory({ op: 'resume', owner: moduleName, count: suspended.length, ts: Date.now() });
  }

  /**
   * Get all active (non-cleared) timers.
   */
  function getActive() {
    return Object.values(_timers).filter(function (e) { return !e.cleared; });
  }

  /**
   * Get all timers for a module.
   */
  function getByOwner(moduleName) {
    return Object.values(_timers).filter(function (e) { return e.owner === moduleName; });
  }

  /**
   * Get full snapshot for diagnosis.
   */
  function getSnapshot() {
    return {
      active: getActive(),
      paused: Object.keys(_paused),
      suspended: JSON.parse(JSON.stringify(_suspended)),
      history: _history.slice(-50),
    };
  }

  // ─── Known timer inventory (declared here for documentation) ──
  //
  //  timer name             | owner            | type     | classification
  //  ─────────────────────────────────────────────────────────────────────
  //  fastInterval           | fasting-module   | interval | FASTING
  //  _syncIndicatorTimer    | ui-module        | timeout  | UI
  //  _toastTimer            | ui-module        | timeout  | UI
  //  premiumCheckInterval   | premium-module   | interval | AUTH
  //  adminCheckInterval     | admin-module     | interval | AUTH
  //  restoreInterval        | bootstrap        | interval | HYDRATION
  //  _pollingInterval       | runtime-ctrl     | interval | POLLING
  //  _reconcileInterval     | runtime-orch     | interval | POLLING
  //  syncConsistencyCheck   | sync-checker     | interval | POLLING
  //  (various temp setTimeouts)                | various  | ANIMATION/UI

  // ─── Export ──────────────────────────────────────────────────
  window.ippoTimerRegistry = {
    register: register,
    clear: clear,
    clearOwner: clearOwner,
    pauseOwner: pauseOwner,
    resumeOwner: resumeOwner,
    getActive: getActive,
    getByOwner: getByOwner,
    getSnapshot: getSnapshot,
    TYPES: TIMER_TYPES,
  };

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('timer-registry-loaded');
  }
})();
