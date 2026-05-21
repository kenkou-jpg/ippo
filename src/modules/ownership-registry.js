// ============================================================
//  ippo – src/modules/ownership-registry.js
//  DOM Ownership Registry: which module owns which DOM region.
//
//  Rules enforced here:
//  - Each DOM region has exactly one owner module.
//  - Any code that mutates a region it does not own logs a warning.
//  - Ownership is declared at module init; conflicts are detected early.
// ============================================================

(function () {
  'use strict';

  // ─── Registry ───────────────────────────────────────────────
  // Map<regionId, { owner: string, domId?: string, selector?: string }>
  var _registry = {};

  // Map<regionId, string[]> – list of modules allowed to READ but not write
  var _readers = {};

  // Whether to throw on conflict (strict) vs just warn (lenient)
  var _strict = false;

  // Conflict log for inspection
  var _conflicts = [];

  // ─── Internal helpers ────────────────────────────────────────
  function _log(level, msg, data) {
    var prefix = '[OwnershipRegistry]';
    if (level === 'error') {
      console.error(prefix, msg, data || '');
    } else if (level === 'warn') {
      console.warn(prefix, msg, data || '');
    } else {
      console.info(prefix, msg, data || '');
    }
  }

  function _conflict(regionId, claimant, existing) {
    var entry = {
      regionId: regionId,
      claimant: claimant,
      existing: existing,
      ts: Date.now(),
    };
    _conflicts.push(entry);
    var msg = 'Ownership conflict: "' + claimant + '" tried to own "' + regionId +
              '" already owned by "' + existing + '"';
    if (_strict) {
      throw new Error(msg);
    }
    _log('warn', msg, entry);
  }

  // ─── Public API ──────────────────────────────────────────────

  /**
   * Register ownership of a DOM region.
   * @param {string} regionId  Logical name (e.g. 'calendar', 'home-week-row')
   * @param {string} owner     Module name (e.g. 'calendar-module')
   * @param {object} [opts]    { domId, selector, force }
   */
  function claim(regionId, owner, opts) {
    opts = opts || {};
    var existing = _registry[regionId];
    // existing.owner === null means "pre-registered but unclaimed" — first claim wins silently.
    if (existing && existing.owner !== null && existing.owner !== owner) {
      if (opts.force) {
        _log('warn', 'Force-taking "' + regionId + '" from "' + existing.owner + '" by "' + owner + '"');
      } else {
        _conflict(regionId, owner, existing.owner);
        return false;
      }
    }
    _registry[regionId] = {
      owner: owner,
      domId: opts.domId || null,
      selector: opts.selector || null,
      claimedAt: Date.now(),
    };
    return true;
  }

  /**
   * Assert ownership before mutating a DOM region.
   * Call this at the start of any render function.
   * @param {string} regionId
   * @param {string} caller   Module name making the assertion
   * @returns {boolean} true if caller is the owner, false otherwise
   */
  function assertOwnership(regionId, caller) {
    var reg = _registry[regionId];
    if (!reg) {
      // Unregistered region – warn but allow (legacy compatibility)
      _log('warn', 'Unregistered region "' + regionId + '" mutated by "' + caller + '"');
      return true;
    }
    if (reg.owner !== caller) {
      var entry = {
        regionId: regionId,
        caller: caller,
        owner: reg.owner,
        ts: Date.now(),
        stack: (new Error()).stack,
      };
      _conflicts.push(entry);
      _log('warn',
        '"' + caller + '" mutated "' + regionId + '" owned by "' + reg.owner + '"',
        entry
      );
      return false;
    }
    return true;
  }

  /**
   * Release ownership (e.g. on module destroy).
   */
  function release(regionId, owner) {
    var reg = _registry[regionId];
    if (reg && reg.owner === owner) {
      delete _registry[regionId];
      return true;
    }
    return false;
  }

  /**
   * Get the owner of a region.
   */
  function getOwner(regionId) {
    var reg = _registry[regionId];
    return reg ? reg.owner : null;
  }

  /**
   * Allow a module to read (but not write) a region.
   */
  function allowRead(regionId, moduleName) {
    if (!_readers[regionId]) _readers[regionId] = [];
    if (_readers[regionId].indexOf(moduleName) === -1) {
      _readers[regionId].push(moduleName);
    }
  }

  /**
   * Snapshot the entire registry (for debug / diagnosis).
   */
  function getSnapshot() {
    return {
      registry: JSON.parse(JSON.stringify(_registry)),
      conflicts: _conflicts.slice(-50),
      readers: JSON.parse(JSON.stringify(_readers)),
    };
  }

  /**
   * Enable strict mode (throws on conflict instead of warning).
   */
  function setStrict(on) {
    _strict = !!on;
  }

  /**
   * Check if regionId is claimed by owner.
   */
  function isOwner(regionId, moduleName) {
    var reg = _registry[regionId];
    return !!(reg && reg.owner === moduleName);
  }

  // ─── Pre-register core regions ───────────────────────────────
  // These regions are declared here so conflicts surface immediately.
  var CORE_REGIONS = [
    { id: 'calendar-grid',        domId: 'calGrid' },
    { id: 'calendar-label',       domId: 'calLabel' },
    { id: 'calendar-monthly',     domId: 'cal-monthly-summary' },
    { id: 'home-week-row',        selector: '.home-week-row' },
    { id: 'home-greeting',        domId: 'greeting' },
    { id: 'home-stats',           selector: '.stats-grid' },
    { id: 'home-phase-banner',    domId: 'home-phase-banner' },
    { id: 'home-insight-card',    domId: 'home-insight-card' },
    { id: 'home-cta',             domId: 'home-cta' },
    { id: 'insights-discoveries', domId: 'insight-discoveries' },
    { id: 'insights-phase-map',   domId: 'phase-map' },
    { id: 'timeline-list',        domId: 'timeline-list' },
    { id: 'fasting-widget',       domId: 'fasting-widget' },
    { id: 'premium-badge',        selector: '.premium-badge' },
    { id: 'onboarding-screen',    domId: 'screen-welcome' },
    { id: 'record-screen',        domId: 'record-screen' },
    { id: 'symptom-chips',        selector: '.symptom-chips' },
  ];

  // Store known regions without an owner yet (allows lazy claim later)
  CORE_REGIONS.forEach(function (r) {
    if (!_registry[r.id]) {
      _registry[r.id] = {
        owner: null,  // unclaimed – will be claimed by module init
        domId: r.domId || null,
        selector: r.selector || null,
        claimedAt: null,
      };
    }
  });

  // ─── Export ──────────────────────────────────────────────────
  window.ippoOwnershipRegistry = {
    claim: claim,
    release: release,
    assertOwnership: assertOwnership,
    getOwner: getOwner,
    allowRead: allowRead,
    isOwner: isOwner,
    getSnapshot: getSnapshot,
    setStrict: setStrict,
    REGIONS: Object.freeze({
      CALENDAR_GRID:        'calendar-grid',
      CALENDAR_LABEL:       'calendar-label',
      CALENDAR_MONTHLY:     'calendar-monthly',
      HOME_WEEK_ROW:        'home-week-row',
      HOME_GREETING:        'home-greeting',
      HOME_STATS:           'home-stats',
      HOME_PHASE_BANNER:    'home-phase-banner',
      HOME_INSIGHT_CARD:    'home-insight-card',
      HOME_CTA:             'home-cta',
      INSIGHTS_DISCOVERIES: 'insights-discoveries',
      INSIGHTS_PHASE_MAP:   'insights-phase-map',
      TIMELINE_LIST:        'timeline-list',
      FASTING_WIDGET:       'fasting-widget',
      PREMIUM_BADGE:        'premium-badge',
      ONBOARDING_SCREEN:    'onboarding-screen',
      RECORD_SCREEN:        'record-screen',
      SYMPTOM_CHIPS:        'symptom-chips',
    }),
  };

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('ownership-registry-loaded');
  }

  // Signal that ownership registry is ready for claims.
  window.__ippoOwnershipReady = true;
  window.dispatchEvent(new CustomEvent('ippo:ownership-ready', {
    detail: { regionCount: Object.keys(_registry).length },
  }));
})();
