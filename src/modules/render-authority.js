// ============================================================
//  ippo – src/modules/render-authority.js
//  Render Authority: single-owner, RAF-batched, deduplicating render queue.
//
//  Problem solved:
//  buildCalendar() is called 10+ times during startup from different
//  paths (hydration, save-callback, auth-callback, cloud-restore, etc.).
//  This causes duplicate DOM mutations, flicker, and race conditions.
//
//  Solution:
//  Each render slot (e.g. 'calendar', 'home-greeting') is owned by one
//  module. All requests for that slot within the same JS task/microtask
//  are coalesced into a single RAF-scheduled execution.
//
//  Usage:
//    renderAuthority.request('calendar', 'calendar-module', buildCalendar);
//    // If called 8 times synchronously → only 1 RAF fires.
// ============================================================

(function () {
  'use strict';

  var REG = window.ippoOwnershipRegistry;

  // ─── Pending renders ─────────────────────────────────────────
  // Map<slotId, { owner, fn, requestedAt, count }>
  var _pending = {};

  // RAF handle for the current flush
  var _rafHandle = null;

  // Render log (ring buffer, last 200)
  var _log = [];
  var LOG_MAX = 200;

  // Paused modules – renders are queued but not flushed
  var _paused = {};

  // ─── Helpers ─────────────────────────────────────────────────
  function _addLog(entry) {
    _log.push(entry);
    if (_log.length > LOG_MAX) _log.shift();
  }

  function _warn(msg, data) {
    console.warn('[RenderAuthority]', msg, data || '');
  }

  /**
   * Assert that `caller` is allowed to render `slotId`.
   * Violation: fires 'ippo:render-authority-violation' event instead of throwing
   * so monitoring can catch it without breaking existing renders.
   * Removal condition: once all callers have been audited and ownership violations
   * are zero in production, this can be promoted to throw.
   */
  function assertOwnership(slotId, caller, registeredOwner) {
    var detail = { slotId: slotId, caller: caller, owner: registeredOwner };
    _warn('"' + caller + '" requested render of "' + slotId + '" owned by "' + registeredOwner + '"');
    try {
      window.dispatchEvent(new CustomEvent('ippo:render-authority-violation', { detail: detail }));
    } catch (_) {}
  }

  function _scheduleFlush() {
    if (_rafHandle !== null) return;
    _rafHandle = requestAnimationFrame(_flush);
  }

  function _flush() {
    _rafHandle = null;
    var slots = Object.keys(_pending);
    if (slots.length === 0) return;

    slots.forEach(function (slotId) {
      var entry = _pending[slotId];
      delete _pending[slotId];

      // Skip if module is paused (re-queue for later)
      if (_paused[entry.owner]) {
        // Re-queue without scheduling – will flush when resumed
        _pending[slotId] = entry;
        return;
      }

      var start = performance.now();
      try {
        entry.fn();
        var duration = performance.now() - start;
        _addLog({
          slotId: slotId,
          owner: entry.owner,
          status: 'ok',
          requestCount: entry.count,
          duration: duration,
          ts: Date.now(),
        });
      } catch (e) {
        _addLog({
          slotId: slotId,
          owner: entry.owner,
          status: 'error',
          error: String(e),
          ts: Date.now(),
        });
        console.error('[RenderAuthority] render error in slot "' + slotId + '":', e);
      }
    });

    // If paused modules had pending renders, we need another RAF when resumed
    // (handled by resumeModule)
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Request a render for a slot.
   * Multiple requests within the same sync task are coalesced.
   *
   * @param {string}   slotId   Logical render slot (e.g. 'calendar')
   * @param {string}   caller   Module name making the request
   * @param {Function} fn       Render function to call
   * @param {object}   [opts]   { immediate: bool, priority: 'high'|'normal' }
   */
  function request(slotId, caller, fn, opts) {
    opts = opts || {};

    // Ownership check (lenient: event-only, don't block)
    if (REG) {
      var owner = REG.getOwner(slotId);
      if (owner && owner !== caller) {
        assertOwnership(slotId, caller, owner);
      }
    }

    if (typeof fn !== 'function') {
      _warn('request() called with non-function for slot "' + slotId + '"');
      return;
    }

    var existing = _pending[slotId];
    if (existing) {
      // Coalesce: increment count, keep latest fn
      existing.fn = fn;
      existing.count++;
      existing.lastRequestedAt = Date.now();
    } else {
      _pending[slotId] = {
        owner: caller,
        fn: fn,
        count: 1,
        requestedAt: Date.now(),
        lastRequestedAt: Date.now(),
      };
    }

    if (opts.immediate) {
      // Flush synchronously (use sparingly – breaks dedup guarantee)
      if (_rafHandle !== null) {
        cancelAnimationFrame(_rafHandle);
        _rafHandle = null;
      }
      _flush();
    } else {
      _scheduleFlush();
    }
  }

  /**
   * Claim a render slot for a module (registers ownership).
   * Call during module init().
   */
  function claimSlot(slotId, owner, opts) {
    if (REG) {
      REG.claim(slotId, owner, opts);
    }
  }

  /**
   * Pause render flushing for a module.
   * Pending renders accumulate and fire on resume().
   */
  function pauseModule(moduleName) {
    _paused[moduleName] = true;
  }

  /**
   * Resume render flushing for a module and flush any queued renders.
   */
  function resumeModule(moduleName) {
    delete _paused[moduleName];
    // If there are pending renders for this module, schedule a flush
    var hasPending = Object.keys(_pending).some(function (slotId) {
      return _pending[slotId].owner === moduleName;
    });
    if (hasPending) {
      _scheduleFlush();
    }
  }

  /**
   * Cancel all pending renders for a module (e.g. on destroy).
   */
  function cancelModule(moduleName) {
    Object.keys(_pending).forEach(function (slotId) {
      if (_pending[slotId].owner === moduleName) {
        delete _pending[slotId];
      }
    });
    delete _paused[moduleName];
  }

  /**
   * Flush all pending renders immediately (for testing / forced sync).
   */
  function flushNow() {
    if (_rafHandle !== null) {
      cancelAnimationFrame(_rafHandle);
      _rafHandle = null;
    }
    _flush();
  }

  /**
   * Get render log (last N entries).
   */
  function getLog(n) {
    n = n || 50;
    return _log.slice(-n);
  }

  /**
   * Get pending render slots.
   */
  function getPending() {
    return Object.keys(_pending).map(function (slotId) {
      var e = _pending[slotId];
      return { slotId: slotId, owner: e.owner, count: e.count };
    });
  }

  // ─── Render Slots (pre-declared) ─────────────────────────────
  // These are the canonical slot IDs for all major render targets.
  var SLOTS = Object.freeze({
    // Calendar module
    CALENDAR:          'calendar',
    CALENDAR_MONTHLY:  'calendar-monthly',

    // Home module
    HOME_GREETING:     'home-greeting',
    HOME_STATS:        'home-stats',
    HOME_WEEK_ROW:     'home-week-row',
    HOME_PHASE_BANNER: 'home-phase-banner',
    HOME_INSIGHT_CARD: 'home-insight-card',
    HOME_NUMBERS:      'home-numbers',
    HOME_DISEASE_ADV:  'home-disease-advice',
    HOME_CTA:          'home-cta',
    HOME_SUMMARY:      'home-summary',

    // Insights module
    INSIGHTS_DISCOVERIES: 'insights-discoveries',
    INSIGHTS_PHASE_MAP:   'insights-phase-map',
    INSIGHTS_TIMELINE:    'insights-timeline',

    // Onboarding module
    ONBOARDING:        'onboarding',

    // Premium module
    PREMIUM_BADGE:     'premium-badge',

    // Symptom module
    SYMPTOM_CHIPS:     'symptom-chips',
    SYMPTOM_SETTINGS:  'symptom-settings',

    // Fasting module
    FASTING_WIDGET:    'fasting-widget',

    // Record module
    RECORD_SCREEN:     'record-screen',
    RECORD_STEPS:      'record-steps',

    // Settings module
    SETTINGS_HERO:     'settings-hero',
    SETTINGS_DISEASE:  'settings-disease',
  });

  // ─── Export ──────────────────────────────────────────────────
  window.ippoRenderAuthority = {
    request: request,
    claimSlot: claimSlot,
    pauseModule: pauseModule,
    resumeModule: resumeModule,
    cancelModule: cancelModule,
    flushNow: flushNow,
    getLog: getLog,
    getPending: getPending,
    assertOwnership: assertOwnership,
    SLOTS: SLOTS,
  };

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('render-authority-loaded');
  }
})();
