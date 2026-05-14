// ============================================================
//  ippo – src/modules/module-lifecycle.js
//  Module Lifecycle Base: standard lifecycle for all feature modules.
//
//  Each module that opts in gets:
//    init()    — register ownership, claim render slots, bind events
//    start()   — begin periodic work (intervals, polling)
//    render()  — request a render via RenderAuthority
//    pause()   — suspend timers + renders
//    resume()  — restore timers + flush pending renders
//    destroy() — full teardown
//
//  Usage:
//    var myModule = createModule('my-module', {
//      slots: ['calendar'],
//      regions: ['calendar-grid'],
//      onInit() { ... },
//      onStart() { ... },
//      onRender() { /* actual DOM update */ },
//      onDestroy() { ... },
//    });
//    myModule.init();
//    myModule.start();
// ============================================================

(function () {
  'use strict';

  var REG = null;   // set lazily (loaded after this file)
  var AUTH = null;
  var TIMERS = null;

  function _getREG()    { return window.ippoOwnershipRegistry; }
  function _getAUTH()   { return window.ippoRenderAuthority; }
  function _getTIMERS() { return window.ippoTimerRegistry; }

  // ─── Module states ────────────────────────────────────────────
  var MODULE_STATES = Object.freeze({
    CREATED:   'created',
    INITED:    'inited',
    STARTED:   'started',
    PAUSED:    'paused',
    DESTROYED: 'destroyed',
  });

  // ─── Module registry ──────────────────────────────────────────
  var _modules = {};

  /**
   * Create a new managed module.
   *
   * @param {string} name   Unique module name (e.g. 'calendar-module')
   * @param {object} spec   Module specification:
   *   - slots:    string[]  Render slot IDs this module owns
   *   - regions:  string[]  DOM region IDs this module owns
   *   - onInit:   function  Called during init()
   *   - onStart:  function  Called during start()
   *   - onRender: function  The actual render function (receives no args)
   *   - onPause:  function  Optional extra pause logic
   *   - onResume: function  Optional extra resume logic
   *   - onDestroy:function  Cleanup
   */
  function createModule(name, spec) {
    if (_modules[name]) {
      console.warn('[ModuleLifecycle] Module "' + name + '" already registered. Returning existing.');
      return _modules[name];
    }

    spec = spec || {};
    var _state = MODULE_STATES.CREATED;
    var _renderCount = 0;
    var _slots = spec.slots || [];
    var _regions = spec.regions || [];

    function _log(msg) {
      // intentionally minimal
    }

    // ── init() ─────────────────────────────────────────────────
    function init() {
      if (_state !== MODULE_STATES.CREATED) return;

      REG    = _getREG();
      AUTH   = _getAUTH();
      TIMERS = _getTIMERS();

      // Claim DOM regions
      if (REG) {
        _regions.forEach(function (regionId) {
          REG.claim(regionId, name);
        });
      }

      // Claim render slots
      if (AUTH) {
        _slots.forEach(function (slotId) {
          AUTH.claimSlot(slotId, name);
        });
      }

      // Module-specific init
      if (typeof spec.onInit === 'function') {
        try { spec.onInit(); } catch (e) { console.error('[' + name + '] onInit error:', e); }
      }

      _state = MODULE_STATES.INITED;
      window.dispatchEvent(new CustomEvent('ippo:module-inited', { detail: { module: name } }));
    }

    // ── start() ────────────────────────────────────────────────
    function start() {
      if (_state === MODULE_STATES.DESTROYED) return;
      if (_state === MODULE_STATES.CREATED) init();

      if (typeof spec.onStart === 'function') {
        try { spec.onStart(); } catch (e) { console.error('[' + name + '] onStart error:', e); }
      }

      _state = MODULE_STATES.STARTED;
      window.dispatchEvent(new CustomEvent('ippo:module-started', { detail: { module: name } }));
    }

    // ── render() ───────────────────────────────────────────────
    // Submits a render request via RenderAuthority.
    // Deduplicated via RAF — safe to call multiple times synchronously.
    function render(slotId, opts) {
      if (_state === MODULE_STATES.DESTROYED) return;
      AUTH = _getAUTH();

      var targetSlot = slotId || (_slots.length > 0 ? _slots[0] : name);
      var renderFn = typeof spec.onRender === 'function' ? spec.onRender : null;

      if (!renderFn) {
        console.warn('[' + name + '] render() called but no onRender defined');
        return;
      }

      _renderCount++;

      if (AUTH) {
        AUTH.request(targetSlot, name, renderFn, opts);
      } else {
        // Fallback: direct call (before AUTH is loaded)
        try { renderFn(); } catch (e) { console.error('[' + name + '] render error:', e); }
      }
    }

    // ── pause() ────────────────────────────────────────────────
    function pause() {
      if (_state === MODULE_STATES.DESTROYED || _state === MODULE_STATES.PAUSED) return;

      TIMERS = _getTIMERS();
      AUTH   = _getAUTH();

      if (TIMERS) TIMERS.pauseOwner(name);
      if (AUTH)   AUTH.pauseModule(name);

      if (typeof spec.onPause === 'function') {
        try { spec.onPause(); } catch (e) { console.error('[' + name + '] onPause error:', e); }
      }

      _state = MODULE_STATES.PAUSED;
      window.dispatchEvent(new CustomEvent('ippo:module-paused', { detail: { module: name } }));
    }

    // ── resume() ───────────────────────────────────────────────
    function resume() {
      if (_state !== MODULE_STATES.PAUSED) return;

      TIMERS = _getTIMERS();
      AUTH   = _getAUTH();

      if (TIMERS) TIMERS.resumeOwner(name);
      if (AUTH)   AUTH.resumeModule(name);

      if (typeof spec.onResume === 'function') {
        try { spec.onResume(); } catch (e) { console.error('[' + name + '] onResume error:', e); }
      }

      _state = MODULE_STATES.STARTED;
      window.dispatchEvent(new CustomEvent('ippo:module-resumed', { detail: { module: name } }));
    }

    // ── destroy() ──────────────────────────────────────────────
    function destroy() {
      if (_state === MODULE_STATES.DESTROYED) return;

      TIMERS = _getTIMERS();
      AUTH   = _getAUTH();
      REG    = _getREG();

      if (TIMERS) TIMERS.clearOwner(name);
      if (AUTH)   AUTH.cancelModule(name);

      // Release DOM regions
      if (REG) {
        _regions.forEach(function (regionId) {
          REG.release(regionId, name);
        });
      }

      if (typeof spec.onDestroy === 'function') {
        try { spec.onDestroy(); } catch (e) { console.error('[' + name + '] onDestroy error:', e); }
      }

      _state = MODULE_STATES.DESTROYED;
      window.dispatchEvent(new CustomEvent('ippo:module-destroyed', { detail: { module: name } }));
    }

    // ── getState() ─────────────────────────────────────────────
    function getState() {
      return _state;
    }

    function getRenderCount() {
      return _renderCount;
    }

    var module = {
      name: name,
      init: init,
      start: start,
      render: render,
      pause: pause,
      resume: resume,
      destroy: destroy,
      getState: getState,
      getRenderCount: getRenderCount,
    };

    _modules[name] = module;
    return module;
  }

  // ─── Global module manager ────────────────────────────────────

  function getModule(name) {
    return _modules[name] || null;
  }

  function getAllModules() {
    return Object.values(_modules).map(function (m) {
      return { name: m.name, state: m.getState(), renderCount: m.getRenderCount() };
    });
  }

  function pauseAll() {
    Object.values(_modules).forEach(function (m) { m.pause(); });
  }

  function resumeAll() {
    Object.values(_modules).forEach(function (m) { m.resume(); });
  }

  // ─── Export ──────────────────────────────────────────────────
  window.ippoModuleLifecycle = {
    createModule: createModule,
    getModule: getModule,
    getAllModules: getAllModules,
    pauseAll: pauseAll,
    resumeAll: resumeAll,
    STATES: MODULE_STATES,
  };

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('module-lifecycle-loaded');
  }
})();
