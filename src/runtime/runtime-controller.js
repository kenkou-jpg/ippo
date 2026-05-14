// ============================================================
// ippo – src/runtime/runtime-controller.js
// Runtime Decision Layer: brain の診断結果を元に runtime behavior を動的制御する。
//
// brain  = observer  (診断・記録)
// controller = executor (判断・制御)
//
// 循環依存禁止: brain は controller を import しない。
// controller は window.ippoBrain を介して brain を読む。
//
// ロード順: runtime-brain の後、main.js で state 確定後に start() を呼ぶ。
// 提供: window.ippoRuntimeController, window.ippoRuntimeHooks
// ============================================================

// ─── Runtime Mode System ──────────────────────────────────
//
// Mode Transition Graph:
//
//   NORMAL_MODE ──→ DEBUG_MODE
//       │           SAFE_MODE
//       │           SAFE_STARTUP_MODE
//       │           LOW_RUNTIME_MODE
//       │           RECOVERY_MODE
//       │
//   DEBUG_MODE ──→ NORMAL_MODE
//       │           SAFE_MODE
//       │           RECOVERY_MODE
//       │
//   SAFE_MODE ──→ NORMAL_MODE
//       │           RECOVERY_MODE
//       │           SAFE_STARTUP_MODE
//       │
//   SAFE_STARTUP_MODE ──→ NORMAL_MODE
//       │                  SAFE_MODE
//       │                  RECOVERY_MODE
//       │
//   LOW_RUNTIME_MODE ──→ NORMAL_MODE
//       │                 SAFE_MODE
//       │                 RECOVERY_MODE
//       │
//   RECOVERY_MODE ──→ NORMAL_MODE
//                      SAFE_MODE
//
var CTRL_MODE = Object.freeze({
  NORMAL:       'NORMAL_MODE',
  DEBUG:        'DEBUG_MODE',
  SAFE:         'SAFE_MODE',
  SAFE_STARTUP: 'SAFE_STARTUP_MODE',
  SAFE_CLOUD:   'SAFE_CLOUD_MODE',
  LOW_RUNTIME:  'LOW_RUNTIME_MODE',
  RECOVERY:     'RECOVERY_MODE',
});

var MODE_TRANSITIONS = {
  'NORMAL_MODE':       ['DEBUG_MODE', 'SAFE_MODE', 'SAFE_STARTUP_MODE', 'SAFE_CLOUD_MODE', 'LOW_RUNTIME_MODE', 'RECOVERY_MODE'],
'DEBUG_MODE':        ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
'SAFE_MODE':         ['NORMAL_MODE', 'RECOVERY_MODE', 'SAFE_STARTUP_MODE', 'SAFE_CLOUD_MODE'],
'SAFE_STARTUP_MODE': ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
'SAFE_CLOUD_MODE':   ['NORMAL_MODE', 'SAFE_MODE', 'RECOVERY_MODE'],
'LOW_RUNTIME_MODE':  ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
'RECOVERY_MODE':     ['NORMAL_MODE', 'SAFE_MODE'],
};

// ─── Internal state ───────────────────────────────────────
var _currentMode     = CTRL_MODE.NORMAL;
var _modeHistory     = [];           // [{from, to, reason, at}], max 20
var _actionAudit     = [];           // action timeline, max 50
var _isolatedModules = {};           // module → {reason, at}
var _renderRetryQueue = [];          // [{module, reason, classification, queuedAt, attempts}]
var _degradedSystems  = {};          // system → {mode, since}
var _lastDecision     = null;
var _controllerActive = false;
var _pollInterval     = null;
var _lexicalBridgeInjected = false;

// Dedup window: prevent same action within this ms
var ACTION_DEDUP_MS = 5000;
// Max actions per poll cycle
var MAX_ACTIONS_PER_POLL = 3;
// Render retry: max attempts before isolation
var MAX_RENDER_RETRIES = 3;
// Render retry expiry ms
var RETRY_EXPIRY_MS = 30000;
// Poll interval ms
var POLL_INTERVAL_MS = 3000;

// ─── Helpers ─────────────────────────────────────────────
function _iso() { try { return new Date().toISOString(); } catch (_) { return ''; } }
function _now() { return Date.now(); }

// ─── Audit Trail ─────────────────────────────────────────
//
// Audit trail format:
//   startup → state undefined → SAFE_STARTUP_MODE → calendar render delayed → lexical bridge injected
//
function _audit(action, reason, detail) {
  var entry = {
    at:     _iso(),
    mode:   _currentMode,
    action: action,
    reason: reason,
    detail: detail || null,
  };
  _actionAudit.push(entry);
  if (_actionAudit.length > 50) _actionAudit.shift();
  return entry;
}

// ─── Hook Notification ───────────────────────────────────
// Notifies registered handlers on window.ippoRuntimeHooks and
// dispatches a DOM CustomEvent 'ippo:runtime:<event>' for modules
// that prefer event-listener style integration.
function _notifyHooks(event, data) {
  var hooks = window.ippoRuntimeHooks || {};
  if (typeof hooks[event] === 'function') {
    try { hooks[event](data); } catch (_) {}
  }
  try {
    window.dispatchEvent(new CustomEvent('ippo:runtime:' + event, { detail: data }));
  } catch (_) {}
}

// ─── Mode Transition ─────────────────────────────────────
function _transitionMode(newMode, reason) {
  if (_currentMode === newMode) return false;

  var allowed = MODE_TRANSITIONS[_currentMode] || [];
  var isAllowed = allowed.indexOf(newMode) !== -1;

  // Safety override: SAFE and RECOVERY are always reachable
  if (!isAllowed && newMode !== CTRL_MODE.SAFE && newMode !== CTRL_MODE.RECOVERY) {
    return false;
  }

  var prev = _currentMode;
  _currentMode = newMode;
  _modeHistory.push({ from: prev, to: newMode, reason: reason, at: _iso() });
  if (_modeHistory.length > 20) _modeHistory.shift();

  _audit('mode_transition', reason, { from: prev, to: newMode });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('controller-mode-change', { from: prev, to: newMode, reason: reason });
  }

  _notifyHooks('mode_changed', { from: prev, to: newMode, reason: reason });
  _applyModeEffects(newMode, reason);
  return true;
}

// ─── Mode Effects ─────────────────────────────────────────
// Applies behavioral side-effects when entering a mode.
// Source code is never modified; only runtime hooks and flags are set.
function _applyModeEffects(mode, reason) {
  if (mode === CTRL_MODE.SAFE_STARTUP) {
    // Stop heavy/premium/insights renders; calendar simplified; hydration paused
    _notifyHooks('pause_render',    { targets: ['premium', 'insights', 'heavy'], reason: reason });
    _notifyHooks('pause_hydration', { reason: reason });
    _degradedSystems['calendar'] = { mode: 'simplified', since: _now() };
    _degradedSystems['insights'] = { mode: 'disabled',   since: _now() };
    _degradedSystems['premium']  = { mode: 'disabled',   since: _now() };
    _audit('safe_startup_applied', reason, { degraded: ['calendar', 'insights', 'premium'] });
  }

  if (mode === CTRL_MODE.SAFE_CLOUD) {
    // supabaseUserId 未解決: cloud restore / sync を pause
    _notifyHooks('pause_cloud_restore', { reason: reason });
    _degradedSystems['cloudRestore'] = { mode: 'paused', since: _now() };
    _audit('safe_cloud_mode_applied', reason, { degraded: ['cloudRestore'] });
  }

  if (mode === CTRL_MODE.LOW_RUNTIME) {
    // Animations off, premium off, delayed hydration
    _notifyHooks('pause_render', { targets: ['premium', 'animations'], reason: reason });
    _degradedSystems['animations'] = { mode: 'disabled', since: _now() };
    _degradedSystems['premium']    = { mode: 'disabled', since: _now() };
    _audit('low_runtime_applied', reason, { degraded: ['animations', 'premium'] });
  }

  if (mode === CTRL_MODE.RECOVERY) {
    _notifyHooks('pause_render',    { targets: ['all_non_critical'], reason: reason });
    _notifyHooks('pause_hydration', { reason: reason });
    _audit('recovery_mode_applied', reason, null);
  }

  if (mode === CTRL_MODE.SAFE_CLOUD) {
    // Cloud sync disabled; local state preserved; renders continue but no cloud writes
    _notifyHooks('pause_cloud_sync', { reason: reason });
    _degradedSystems['cloud'] = { mode: 'paused', since: _now() };
    _audit('safe_cloud_applied', reason, { degraded: ['cloud'] });
  }

  if (mode === CTRL_MODE.NORMAL) {
    // Restore systems that were degraded by previous mode (not explicit isolations)
    _degradedSystems = {};
    _notifyHooks('resume_render', { reason: reason });
    _notifyHooks('resume_cloud_sync', { reason: reason });
    _audit('systems_restored', reason, null);
  }
}

// ─── Decision Engine ─────────────────────────────────────
//
// Input:  runtimeBrain.getDiagnosisPayload() (+ auxiliary guard state)
// Output: ordered list of action descriptors
//
// Decision Matrix:
//   error=state undefined, phase=startup            → inject_lexical_bridge
//   startupConfidence < 40, phase=startup           → switch_mode SAFE_STARTUP_MODE
//   startupConfidence < 30                          → switch_mode LOW_RUNTIME_MODE
//   hydrationConfidence < 50, phase=hydration       → retry_hydration
//   renderConsistency < 60, phase=render, crashes<3 → retry_render
//   renderConsistency < 60, phase=render, crashes≥3 → isolate_module
//   recordsIntegrity < 20 OR count=0               → trigger_rollback
//   brain mode=SAFE/RECOVERY, ctrl=NORMAL           → switch_mode SAFE_MODE
//   startup duplicates detected                     → delay_startup
//
function _decide(diagnosis) {
  var actions = [];
  var conf     = diagnosis.confidence || {};
  var sc = conf.startupConfidence   != null ? conf.startupConfidence   : 100;
  var hc = conf.hydrationConfidence != null ? conf.hydrationConfidence : 100;
  var rc = conf.renderConsistency   != null ? conf.renderConsistency   : 100;
  var ri = conf.recordsIntegrity    != null ? conf.recordsIntegrity    : 100;

  var phase  = diagnosis.phase  || '';
  var module = diagnosis.module || '';
  var error  = diagnosis.error  || '';

  // 1. Lexical state bridge: ReferenceError state is not defined
  if (error && /ReferenceError.*state.*not\s+defined/i.test(error)) {
    actions.push({
      action: 'inject_lexical_bridge',
      reason: 'ReferenceError: state is not defined at phase=' + phase,
    });
  }

  // 2. SAFE_STARTUP_MODE: startup critical error
  if (sc < 40 && phase === 'startup' && _currentMode === CTRL_MODE.NORMAL) {
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.SAFE_STARTUP,
      reason: 'startup confidence critical: ' + sc,
    });
  }

  // 3. LOW_RUNTIME_MODE: startup confidence below threshold (any phase)
  if (sc < 30 && _currentMode === CTRL_MODE.NORMAL) {
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.LOW_RUNTIME,
      reason: 'startupConfidence below 30: ' + sc,
    });
  }

  // 4. Retry hydration: hydration confidence low
  if (hc < 50 && phase === 'hydration') {
    actions.push({
      action: 'retry_hydration',
      reason: 'hydrationConfidence low: ' + hc,
    });
  }

  // 5. Render failure: classify and queue or isolate
  if (rc < 60 && phase === 'render' && module) {
    var rs = (diagnosis.renderStatus || {})[module] || {};
    var crashes = rs.crashCount || 0;
    if (crashes >= MAX_RENDER_RETRIES) {
      actions.push({
        action: 'isolate_module',
        module: module,
        reason: 'module ' + module + ' crashed ' + crashes + ' times',
      });
    } else {
      actions.push({
        action: 'retry_render',
        module: module,
        reason: 'render failure retryable (crash #' + crashes + ')',
      });
    }
  }

  // 6. Records integrity critical → rollback
  var recordsZero = diagnosis.recordsCount === 0 && diagnosis.recordTransition === 'critical-zero';
  if (ri < 20 || recordsZero) {
    actions.push({
      action: 'trigger_rollback',
      reason: 'records integrity: ' + ri + (recordsZero ? ' + zero-drop' : ''),
    });
  }

  // 7. Sync brain mode → controller mode
  var brainMode = diagnosis.mode || '';
  if ((brainMode === 'SAFE_MODE' || brainMode === 'RECOVERY_MODE') && _currentMode === CTRL_MODE.NORMAL) {
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.SAFE,
      reason: 'brain entered ' + brainMode,
    });
  }

  // 8. supabaseUserId undefined → SAFE_CLOUD_MODE (cloud restore を pause)
  var authState = (window.ippoBrain && typeof window.ippoBrain.getAuthState === 'function')
    ? window.ippoBrain.getAuthState() : null;
  var supabaseNotReady = authState
    ? (!authState.authReady || !authState.supabaseReady)
    : (typeof window.supabaseUserId === 'undefined' || window.supabaseUserId === null);
  if (supabaseNotReady && _currentMode === CTRL_MODE.NORMAL) {
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.SAFE_CLOUD,
      reason: 'supabaseUserId not ready – cloud restore paused',
    });
  }
  // auth ready になったら SAFE_CLOUD_MODE → NORMAL_MODE へ復帰
  if (!supabaseNotReady && _currentMode === CTRL_MODE.SAFE_CLOUD) {
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.NORMAL,
      reason: 'supabaseUserId resolved – resuming normal mode',
    });
  }

  // 9. Startup duplicates detected → delay_startup
  var sv = window.ippoStartupValidator;
  if (sv && typeof sv.hasDuplicates === 'function' && sv.hasDuplicates()) {
    actions.push({
      action: 'delay_startup',
      reason: 'startup phase duplicates detected',
    });
  }

  // 9. Cloud restore failed → SAFE_CLOUD_MODE
  // window.__ippoCloudRestoreFailed は auth-cloud-state-machine が設定する。
  if (
    window.__ippoCloudRestoreFailed === true &&
    _currentMode !== CTRL_MODE.SAFE_CLOUD &&
    _currentMode !== CTRL_MODE.SAFE       &&
    _currentMode !== CTRL_MODE.RECOVERY
  ) {
    var cloudAcs = window.ippoAuthCloudState;
    var cloudReason = cloudAcs
      ? ('auth=' + cloudAcs.getAuthState() + ' cloud=' + cloudAcs.getCloudState())
      : 'cloud restore failed';
    actions.push({
      action: 'switch_mode',
      mode:   CTRL_MODE.SAFE_CLOUD,
      reason: cloudReason,
    });
  }

  return actions;
}

// ─── Action Executor ──────────────────────────────────────
function _executeAction(act) {
  var action = act.action;

  if (action === 'switch_mode') {
    _transitionMode(act.mode, act.reason);
    _lastDecision = { action: action, mode: act.mode, reason: act.reason, at: _iso() };
  }

  else if (action === 'inject_lexical_bridge') {
    _injectLexicalBridge(act.reason);
    _lastDecision = { action: action, reason: act.reason, at: _iso() };
  }

  else if (action === 'retry_hydration') {
    _audit('retry_hydration', act.reason, null);
    _notifyHooks('retry_hydration', { reason: act.reason });
    _lastDecision = { action: action, reason: act.reason, at: _iso() };
  }

  else if (action === 'retry_render') {
    _enqueueRenderRetry(act.module, act.reason);
    _lastDecision = { action: action, module: act.module, reason: act.reason, at: _iso() };
  }

  else if (action === 'isolate_module') {
    _isolateModule(act.module, act.reason);
    _lastDecision = { action: action, module: act.module, reason: act.reason, at: _iso() };
  }

  else if (action === 'trigger_rollback') {
    _triggerRollback(act.reason);
    _lastDecision = { action: action, reason: act.reason, at: _iso() };
  }

  else if (action === 'delay_startup') {
    _audit('delay_startup', act.reason, null);
    _notifyHooks('delay_startup', { reason: act.reason });
    _lastDecision = { action: action, reason: act.reason, at: _iso() };
  }
}

// ─── Lexical State Bridge ─────────────────────────────────
// 要件 4: startup 中に ReferenceError: state is not defined を検知したとき
// window.__legacyStateBridge を構築し render retry を提案する。
// 重要: ソースコードの書き換えは禁止。runtime memory layer のみ。
function _injectLexicalBridge(reason) {
  if (_lexicalBridgeInjected) return;

  try {
    var bridge = null;

    if (typeof window.getState === 'function') {
      bridge = window.getState();
    } else if (typeof window._ippoState !== 'undefined') {
      bridge = window._ippoState;
    } else {
      bridge = {};
    }

    window.__legacyStateBridge = bridge;
    _lexicalBridgeInjected = true;

    var recordCount = bridge && Array.isArray(bridge.records) ? bridge.records.length : 0;

    _audit('lexical_bridge_injected', reason, {
      bridgeSource:  typeof window.getState === 'function' ? 'getState' : '_ippoState',
      recordCount:   recordCount,
      bridgeKeys:    bridge ? Object.keys(bridge).slice(0, 8) : [],
    });

    _notifyHooks('lexical_bridge_ready', { bridge: bridge, reason: reason });
    // Signal modules to retry render now that bridge is available
    _notifyHooks('retry_startup', { reason: 'lexical bridge injected – retry render' });

    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('lexical-bridge-injected', { recordCount: recordCount });
    }
  } catch (e) {
    _audit('lexical_bridge_failed', reason, { error: String(e) });
  }
}

// ─── Render Retry System ──────────────────────────────────
// 要件 5: render failure を retryable / non-retryable / startup-blocking / isolated に分類。
// retryable のみ render retry queue へ送る。
function _classifyRenderFailure(moduleName) {
  if (_isolatedModules[moduleName]) return 'isolated';

  var brain = window.ippoBrain;
  if (!brain) return 'retryable';

  var rs = brain.getRenderStatus()[moduleName] || {};
  var crashes = rs.crashCount || 0;
  var classification = rs.classification || 'isolated';

  if (crashes >= 5)                          return 'non-retryable';
  if (classification === 'startup-critical') return 'startup-blocking';
  if (classification === 'cascading')        return 'non-retryable';
  return 'retryable';
}

function _enqueueRenderRetry(moduleName, reason) {
  var classification = _classifyRenderFailure(moduleName);

  if (classification !== 'retryable') {
    _audit('render_retry_skipped', reason, { module: moduleName, classification: classification });
    if (classification === 'non-retryable') {
      _isolateModule(moduleName, 'non-retryable render failure');
    }
    return;
  }

  var alreadyQueued = _renderRetryQueue.some(function (r) { return r.module === moduleName; });
  if (!alreadyQueued) {
    _renderRetryQueue.push({
      module:         moduleName,
      reason:         reason,
      classification: classification,
      queuedAt:       _now(),
      attempts:       0,
    });
    _audit('render_queued', reason, { module: moduleName });
    _notifyHooks('render_retry_queued', { module: moduleName, reason: reason });
  }
}

function _processRetryQueue() {
  if (_renderRetryQueue.length === 0) return;

  var now = _now();

  _renderRetryQueue = _renderRetryQueue.filter(function (item) {
    // Max retries exceeded → isolate
    if (item.attempts >= MAX_RENDER_RETRIES) {
      _isolateModule(item.module, 'max retry attempts (' + MAX_RENDER_RETRIES + ') reached');
      return false;
    }
    // Expired
    if ((now - item.queuedAt) > RETRY_EXPIRY_MS) {
      _audit('render_retry_expired', 'timeout', { module: item.module });
      return false;
    }
    return true;
  });

  _renderRetryQueue.forEach(function (item) {
    var backoff = (item.attempts + 1) * 2000;
    if ((now - item.queuedAt) >= backoff) {
      item.attempts++;
      _audit('render_retry_attempt', 'retry #' + item.attempts, { module: item.module });
      _notifyHooks('render_retry', { module: item.module, attempt: item.attempts });
    }
  });
}

// ─── Module Isolation ─────────────────────────────────────
// 要件 6: 1 module crash で全 app 崩壊しないようにする。
// isolated module は render retry queue から除外される。
function _isolateModule(moduleName, reason) {
  if (_isolatedModules[moduleName]) return;

  _isolatedModules[moduleName] = { reason: reason, at: _now() };

  _audit('module_isolated', reason, { module: moduleName });
  _notifyHooks('module_isolated', { module: moduleName, reason: reason });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('module-isolated', { module: moduleName, reason: reason });
  }

  // Remove from retry queue
  _renderRetryQueue = _renderRetryQueue.filter(function (r) { return r.module !== moduleName; });
}

// ─── Rollback ─────────────────────────────────────────────
// 要件 8: Recovery Decision Matrix – rollback to best available snapshot.
// Destructive rollback は禁止: rollbackToBest は records protection 優先。
function _triggerRollback(reason) {
  _audit('rollback_triggered', reason, null);
  _notifyHooks('rollback_triggered', { reason: reason });

  var rm = window.ippoRollbackManager;
  if (!rm) {
    _audit('rollback_skipped', reason, { reason: 'ippoRollbackManager not available' });
    return false;
  }

  // Prefer best snapshot (most records) over latest
  var result = typeof rm.rollbackToBest === 'function'
    ? rm.rollbackToBest()
    : (typeof rm.rollbackToLatest === 'function' ? rm.rollbackToLatest() : false);

  _audit('rollback_result', reason, { success: !!result });
  _notifyHooks('rollback_executed', { reason: reason, success: !!result });
  return result;
}

// ─── Main Polling Loop ────────────────────────────────────
function _poll() {
  var brain = window.ippoBrain;
  if (!brain) return;

  var diagnosis = brain.getDiagnosisPayload();
  if (!diagnosis) return;

  // Skip if no recent errors and in normal mode (avoid unnecessary overhead)
  var now = _now();
  var timeline = brain.getTimeline(20);
  var hasRecentError = timeline.some(function (e) {
    return e.outcome === 'error' && (now - e.timestamp) < 10000;
  });

  if (!hasRecentError && _currentMode === CTRL_MODE.NORMAL) {
    _processRetryQueue();
    return;
  }

  var actions = _decide(diagnosis);

  var executed = 0;
  actions.forEach(function (act) {
    if (executed >= MAX_ACTIONS_PER_POLL) return;

    // Dedup: skip if same action type was executed within ACTION_DEDUP_MS
    var lastSame = _actionAudit.slice(-10).filter(function (a) {
      return a.action === act.action && (now - new Date(a.at).getTime()) < ACTION_DEDUP_MS;
    });
    if (lastSame.length > 0) return;

    _executeAction(act);
    executed++;
  });

  _processRetryQueue();
}

// ─── Controller Lifecycle ────────────────────────────────
function start() {
  if (_controllerActive) return;
  _controllerActive = true;

  // Install hooks registry if not already present
  if (!window.ippoRuntimeHooks) {
    window.ippoRuntimeHooks = {};
  }

  _audit('controller_started', 'init', null);

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('runtime-controller-started', { mode: _currentMode });
  }

  _pollInterval = setInterval(_poll, POLL_INTERVAL_MS);
}

function stop() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
  _controllerActive = false;
  _audit('controller_stopped', 'manual', null);
}

// Manual evaluation (for debugging / console use)
function evaluate() {
  var brain = window.ippoBrain;
  if (!brain) return { error: 'ippoBrain not available' };
  var diagnosis = brain.getDiagnosisPayload();
  var actions   = _decide(diagnosis);
  return { mode: _currentMode, diagnosis: diagnosis, proposedActions: actions };
}

// ─── Hook Registration ────────────────────────────────────
// Modules register via window.ippoRuntimeHooks directly or via these helpers.
function registerHook(event, handler) {
  if (!window.ippoRuntimeHooks) window.ippoRuntimeHooks = {};
  window.ippoRuntimeHooks[event] = handler;
}

function unregisterHook(event) {
  if (window.ippoRuntimeHooks) delete window.ippoRuntimeHooks[event];
}

// ─── Manual Mode Switch ───────────────────────────────────
function switchMode(mode, reason) {
  var valid = Object.values
    ? Object.values(CTRL_MODE).indexOf(mode) !== -1
    : Object.keys(CTRL_MODE).some(function (k) { return CTRL_MODE[k] === mode; });
  if (!valid) return false;
  return _transitionMode(mode, reason || 'manual');
}

// ─── Public API ───────────────────────────────────────────
window.ippoRuntimeController = {
  // Lifecycle
  start:       start,
  stop:        stop,
  evaluate:    evaluate,

  // Mode
  getMode:        function () { return _currentMode; },
  getModeHistory: function () { return _modeHistory.slice(); },
  switchMode:     switchMode,
  MODES:          CTRL_MODE,

  // Isolation (要件 6)
  getIsolatedModules: function () { return Object.assign({}, _isolatedModules); },
  isolateModule:      _isolateModule,

  // Render retry queue (要件 5)
  getRenderRetryQueue: function () { return _renderRetryQueue.slice(); },

  // Degraded systems (要件 7)
  getDegradedSystems: function () { return Object.assign({}, _degradedSystems); },

  // Audit trail (要件 13)
  getAuditTrail:  function () { return _actionAudit.slice(); },
  getLastDecision: function () { return _lastDecision; },

  // Hook registration (要件 9)
  registerHook:   registerHook,
  unregisterHook: unregisterHook,

  // Lexical bridge (要件 4)
  isLexicalBridgeInjected: function () { return _lexicalBridgeInjected; },
  getLexicalBridge:        function () { return window.__legacyStateBridge || null; },

  // Supabase cloud mode (要件 6)
  isCloudPaused: function () { return _currentMode === CTRL_MODE.SAFE_CLOUD; },
  resumeCloud:   function () { _transitionMode(CTRL_MODE.NORMAL, 'manual cloud resume'); },

  // Internals for overlay (要件 12)
  isActive: function () { return _controllerActive; },
};

// ─── Bootstrap hooks registry ─────────────────────────────
// Ensure ippoRuntimeHooks exists immediately so other modules can
// register handlers before controller.start() is called.
if (!window.ippoRuntimeHooks) {
  window.ippoRuntimeHooks = {};
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-controller-loaded', { mode: _currentMode });
}

export { start, stop, evaluate, switchMode, registerHook, unregisterHook, CTRL_MODE, MODE_TRANSITIONS };
