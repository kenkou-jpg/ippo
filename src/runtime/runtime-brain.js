// ============================================================
// ippo – src/runtime/runtime-brain.js
// Runtime Intelligence Hub: causality graph, timeline ring buffer,
// confidence scoring, state intelligence, render isolation,
// recovery decision support, AI diagnosis payload, runtime modes.
//
// ロード順: runtime/ 系の最初 (main.js で先頭 import)
// 他モジュールから: window.ippoBrain.report({...}) で送信
// 提供: window.ippoBrain
// ============================================================

// ─── Constants ────────────────────────────────────────────
var TIMELINE_MAX  = 300;
var CAUSALITY_MAX = 100;
var RECORD_HIST_MAX = 50;
var CRITICAL_MAX    = 10;
var RECOVERY_LOG_MAX = 20;

// Records drop thresholds
var DROP_CRITICAL_RATIO = 0.3; // 70% 以上消えたら critical
var DROP_WARN_RATIO     = 0.7; // 30% 以上消えたら suspicious

// ─── Runtime Modes ─────────────────────────────────────────
var MODE = Object.freeze({
  NORMAL:   'NORMAL',
  DEBUG:    'DEBUG',
  SAFE:     'SAFE_MODE',
  RECOVERY: 'RECOVERY_MODE',
});

// ─── Internal state ────────────────────────────────────────
var _mode           = MODE.NORMAL;
var _timeline       = [];  // ring buffer, max 300
var _causalityNodes = [];  // causality graph, max 100
var _eventIdSeq     = 0;
var _phaseHistory   = {};  // phase → [timestamps]
var _moduleHealth   = {};  // module → { errors, warnings, renderCount }
var _recordHistory  = [];  // ring buffer, max 50
var _renderStatus   = {};  // module → { lastError, crashCount, classification }
var _confidence     = {
  startupConfidence:   100,
  hydrationConfidence: 100,
  renderConsistency:   100,
  syncConfidence:      100,
  recordsIntegrity:    100,
};
var _criticalErrors    = [];  // max 10
var _recoveryDecisions = [];  // max 20
var _modeHistory       = [];  // [{from, to, reason, at}]

// ─── Auth state (Supabase runtime bridge) ─────────────────────────
var _authState = {
  authReady:        false,
  supabaseReady:    false,
  cloudRestoreReady: false,
};

// ─── Helpers ──────────────────────────────────────────────
function _now()  { return Date.now(); }
function _iso()  { try { return new Date().toISOString(); } catch(_) { return ''; } }
function _uid()  { return ++_eventIdSeq; }

function _clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

// ─── Timeline ring buffer ──────────────────────────────────
function _pushTimeline(event) {
  _timeline.push(event);
  if (_timeline.length > TIMELINE_MAX) _timeline.shift();
}

// ─── Causality graph ──────────────────────────────────────
function _pushCausality(node) {
  _causalityNodes.push(node);
  if (_causalityNodes.length > CAUSALITY_MAX) _causalityNodes.shift();
}

function _lastCausalityId() {
  return _causalityNodes.length > 0
    ? _causalityNodes[_causalityNodes.length - 1].id
    : null;
}

// ─── Records intelligence ─────────────────────────────────
function _classifyRecordTransition(prev, next) {
  if (prev == null || prev === next) return 'unchanged';
  if (next == null) return 'unknown';
  if (prev === 0)   return 'initial';
  if (next > prev)  return 'added';
  if (next === 0)   return 'critical-zero';
  var ratio = next / prev;
  var dropped = prev - next;
  if (ratio < DROP_CRITICAL_RATIO) return 'critical-corruption-candidate';
  if (ratio < DROP_WARN_RATIO)     return 'suspicious-drop';
  if (dropped <= 2) return 'normal-edit';
  return 'moderate-drop';
}

function _trackRecords(count, ts) {
  _recordHistory.push({ count: count, at: ts });
  if (_recordHistory.length > RECORD_HIST_MAX) _recordHistory.shift();
}

function _prevRecordCount() {
  var len = _recordHistory.length;
  return len >= 2 ? _recordHistory[len - 2].count : null;
}

// ─── Confidence scoring ────────────────────────────────────
function _penalize(key, amount) {
  if (key in _confidence) {
    _confidence[key] = _clamp(_confidence[key] - amount, 0, 100);
  }
}

function _boost(key, amount) {
  if (key in _confidence) {
    _confidence[key] = _clamp(_confidence[key] + amount, 0, 100);
  }
}

// ─── Mode transitions ──────────────────────────────────────
function _setMode(newMode, reason) {
  if (_mode === newMode) return;
  var prev = _mode;
  _mode = newMode;
  _modeHistory.push({ from: prev, to: newMode, reason: reason || '', at: _iso() });
  if (_modeHistory.length > 20) _modeHistory.shift();
  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('brain-mode-change', { from: prev, to: newMode, reason: reason });
  }
}

// ─── Render isolation classifier ──────────────────────────
function _classifyRenderCrash(moduleName) {
  var now = _now();

  var recentRenderErrors = _criticalErrors.filter(function(e) {
    return e.phase === 'render' && (now - e.timestamp) < 5000;
  });

  var uniqueFailingModules = [];
  recentRenderErrors.forEach(function(e) {
    if (uniqueFailingModules.indexOf(e.module) === -1) {
      uniqueFailingModules.push(e.module);
    }
  });

  var startupDone   = _phaseHistory['startup']   && _phaseHistory['startup'].length > 0;
  var hydrationDone = _phaseHistory['hydration'] && _phaseHistory['hydration'].length > 0;

  if (!startupDone)   return 'startup-critical';
  if (!hydrationDone) return 'hydration-critical';
  if (uniqueFailingModules.length >= 2) return 'cascading';
  return 'isolated';
}

// ─── Recovery decision engine ──────────────────────────────
function _computeRecoveryDecision(event) {
  var decision = null;
  var reason   = '';

  // Records dropped to zero
  if (event.recordsCount === 0 && _prevRecordCount() > 0) {
    decision = 'rollback';
    reason   = 'records dropped to zero from ' + _prevRecordCount();
  }

  // Hydration failure
  if (!decision && event.phase === 'hydration' && event.outcome === 'error') {
    decision = 'retry_hydration';
    reason   = 'hydration error: ' + (event.error || 'unknown');
  }

  // Render crash
  if (!decision && event.phase === 'render' && event.outcome === 'error') {
    var rs = _renderStatus[event.module] || {};
    if ((rs.crashCount || 0) >= 3) {
      decision = 'disable_render';
      reason   = 'module ' + event.module + ' crashed ' + rs.crashCount + ' times';
    } else if (rs.classification === 'cascading') {
      decision = 'isolate_module';
      reason   = 'cascading render failure detected in ' + event.module;
    } else {
      decision = 'isolate_module';
      reason   = 'render error in ' + event.module;
    }
  }

  // Stale hydration
  if (!decision && event.phase === 'hydration' && event.outcome === 'blocked') {
    decision = 'ignore';
    reason   = 'stale hydration blocked - local state preserved';
  }

  // Sync error non-critical
  if (!decision && event.phase === 'sync' && event.outcome === 'error') {
    decision = 'ignore';
    reason   = 'sync error non-critical, local data intact';
  }

  if (decision) {
    var rec = {
      decision: decision,
      reason:   reason,
      phase:    event.phase,
      module:   event.module,
      at:       _iso(),
      eventId:  event.id,
    };
    _recoveryDecisions.push(rec);
    if (_recoveryDecisions.length > RECOVERY_LOG_MAX) _recoveryDecisions.shift();
    return rec;
  }

  return null;
}

// ─── Hydration intelligence ────────────────────────────────
function _classifyHydrationState(data) {
  if (!data) return 'unknown';

  var incoming    = data.incomingData   || {};
  var currentState = typeof window.getState === 'function' ? window.getState() : null;

  if (!currentState) return 'no-current-state';

  var inTs  = incoming.updated_at  || incoming.lastSaved  || incoming.lastModified;
  var cuTs  = currentState.updated_at || currentState.lastSaved || currentState.lastModified;
  var inCount  = (incoming.records  || []).length;
  var cuCount  = (currentState.records || []).length;

  if (data.source === 'cloud') {
    if (!inTs && !cuTs) {
      return inCount >= cuCount ? 'cloud-newer' : 'stale-cloud';
    }
    if (inTs && cuTs) {
      var tIn = new Date(inTs).getTime() || 0;
      var tCu = new Date(cuTs).getTime() || 0;
      if (tIn > tCu) return 'cloud-newer';
      if (tIn < tCu) return 'local-newer';
      return 'same-timestamp';
    }
    if (!inTs) return 'stale-cloud';
    return 'cloud-newer';
  }

  if (data.corrupted)  return 'corrupted-snapshot';
  if (data.partial)    return 'partial-restore';
  return 'local-restore';
}

// ─── Main report() API ─────────────────────────────────────
function report(data) {
  if (!data || typeof data !== 'object') return null;

  var id        = _uid();
  var ts        = data.timestamp || _now();
  var phase     = String(data.phase  || 'unknown');
  var module    = String(data.module || 'unknown');
  var outcome   = String(data.outcome || 'ok');

  // Build canonical timeline event
  var event = {
    id:              id,
    phase:           phase,
    module:          module,
    stateVersion:    data.stateVersion    != null ? data.stateVersion    : 0,
    recordsCount:    data.recordsCount    != null ? data.recordsCount    : null,
    hydrationState:  data.hydrationState  || null,
    renderDepth:     data.renderDepth     || 0,
    outcome:         outcome,
    error:           data.error           || null,
    timestamp:       ts,
    stateReady:      data.stateReady      != null ? data.stateReady      : null,
    hydrationRunning:data.hydrationRunning != null ? data.hydrationRunning: null,
    requires:        data.requires        || null,
  };

  // ── Causality graph ──────────────────────────────────────
  var parentId = (outcome !== 'ok') ? _lastCausalityId() : null;
  _pushCausality({
    id:        id,
    phase:     phase,
    module:    module,
    timestamp: ts,
    outcome:   outcome,
    parent:    parentId,
    summary:   phase + ':' + module + (event.error ? ':' + event.error.slice(0, 60) : ''),
  });

  // ── Phase history ────────────────────────────────────────
  if (!_phaseHistory[phase]) _phaseHistory[phase] = [];
  _phaseHistory[phase].push(ts);

  // ── Module health ────────────────────────────────────────
  if (!_moduleHealth[module]) {
    _moduleHealth[module] = { errors: 0, warnings: 0, renderCount: 0 };
  }
  if (outcome === 'error')   _moduleHealth[module].errors++;
  if (outcome === 'warning') _moduleHealth[module].warnings++;
  if (phase   === 'render')  _moduleHealth[module].renderCount++;

  // ── Records state intelligence ───────────────────────────
  if (event.recordsCount != null) {
    _trackRecords(event.recordsCount, ts);

    var prev = _prevRecordCount();
    if (prev != null) {
      var transition = _classifyRecordTransition(prev, event.recordsCount);
      event.recordsTransition = transition;

      if (transition === 'critical-zero' || transition === 'critical-corruption-candidate') {
        _penalize('recordsIntegrity', 40);
        _criticalErrors.push({
          id: id, phase: phase, module: module,
          transition: transition, from: prev, to: event.recordsCount,
          timestamp: ts,
        });
        if (_criticalErrors.length > CRITICAL_MAX) _criticalErrors.shift();
        _setMode(MODE.SAFE, 'records ' + transition + ' (' + prev + '→' + event.recordsCount + ')');
      } else if (transition === 'suspicious-drop') {
        _penalize('recordsIntegrity', 20);
      } else if (transition === 'added' || transition === 'normal-edit') {
        _boost('recordsIntegrity', 2);
      }
    }
  }

  // ── Confidence scoring by phase/outcome ──────────────────
  if (outcome === 'error') {
    if (phase === 'startup')   { _penalize('startupConfidence', 15); }
    if (phase === 'hydration') { _penalize('hydrationConfidence', 20); }
    if (phase === 'render')    { _penalize('renderConsistency', 10); }
    if (phase === 'sync')      { _penalize('syncConfidence', 10); }
    if (phase === 'save')      { _penalize('syncConfidence', 15); }
  } else if (outcome === 'ok') {
    if (phase === 'startup')   { _boost('startupConfidence', 2); }
    if (phase === 'hydration') { _boost('hydrationConfidence', 5); }
    if (phase === 'save')      { _boost('syncConfidence', 3); }
    if (phase === 'sync')      { _boost('syncConfidence', 2); }
    if (phase === 'rollback')  { _boost('recordsIntegrity', 10); }
  }

  // ── Startup sequence validation ──────────────────────────
  if (phase === 'startup' && outcome === 'warning' && data.duplicatePhase) {
    _penalize('startupConfidence', 10);
    event.startupIssue = 'duplicate-phase:' + data.duplicatePhase;
  }

  // ── Render isolation ────────────────────────────────────
  if (phase === 'render' && outcome === 'error') {
    if (!_renderStatus[module]) {
      _renderStatus[module] = { lastError: null, crashCount: 0, classification: null };
    }
    _renderStatus[module].lastError    = ts;
    _renderStatus[module].crashCount++;
    _renderStatus[module].classification = _classifyRenderCrash(module);

    var crashClass = _renderStatus[module].classification;
    _criticalErrors.push({
      id: id, phase: 'render', module: module,
      error: event.error, timestamp: ts,
      classification: crashClass,
    });
    if (_criticalErrors.length > CRITICAL_MAX) _criticalErrors.shift();

    if (crashClass === 'cascading' || crashClass === 'startup-critical') {
      _setMode(MODE.SAFE, 'render ' + crashClass + ' in ' + module);
    }
    _penalize('renderConsistency', crashClass === 'cascading' ? 25 : 15);
    event.renderIsolation = crashClass;
  }

  // ── Recovery decision ────────────────────────────────────
  var recDecision = _computeRecoveryDecision(event);
  if (recDecision) {
    event.recoveryDecision = recDecision.decision;
  }

  // ── Forward critical errors to health-monitor ────────────
  if (outcome === 'error' && typeof window.ippoHealthMonitor === 'object') {
    window.ippoHealthMonitor.logError('brain:' + phase, {
      module: module,
      message: event.error,
      renderIsolation: event.renderIsolation || null,
    });
  }

  _pushTimeline(event);
  return event;
}

// ─── Hydration intelligence (callable from hydration-guard) ──
function classifyHydration(incomingData, source) {
  return _classifyHydrationState({ incomingData: incomingData, source: source });
}

// ─── Replay ───────────────────────────────────────────────
function getReplay(filter) {
  var events = _timeline.slice();
  if (!filter) return events;
  return events.filter(function(e) {
    if (filter.phase  && e.phase  !== filter.phase)  return false;
    if (filter.module && e.module !== filter.module) return false;
    if (filter.since  && e.timestamp < filter.since) return false;
    if (filter.outcome && e.outcome !== filter.outcome) return false;
    return true;
  });
}

// ─── AI Diagnosis Payload ─────────────────────────────────
function getDiagnosisPayload() {
  var state = null;
  try {
    if (typeof window.getState === 'function') state = window.getState();
  } catch (_) {}

  var recentCritical = _criticalErrors.slice(-5);
  var lastError      = recentCritical[recentCritical.length - 1] || null;
  var recordCount    = state ? (state.records || []).length : null;

  var prev           = _prevRecordCount();
  var recordTransition = (prev != null && recordCount != null)
    ? _classifyRecordTransition(prev, recordCount)
    : null;

  var hydrationTimes = _phaseHistory['hydration'] || [];
  var lastHydration  = hydrationTimes[hydrationTimes.length - 1] || null;
  var hydrationRunning = lastHydration && (_now() - lastHydration < 3000);

  var startupPhases  = Object.keys(_phaseHistory).map(function(p) {
    return { phase: p, count: _phaseHistory[p].length };
  });

  return {
    generatedAt:       _iso(),
    mode:              _mode,
    phase:             lastError ? lastError.phase  : null,
    error:             lastError ? lastError.error  : null,
    module:            lastError ? lastError.module : null,
    hydrationRunning:  !!hydrationRunning,
    stateReady:        state != null,
    recordsCount:      recordCount,
    recordTransition:  recordTransition,
    confidence:        Object.assign({}, _confidence),
    criticalErrors:    recentCritical,
    renderStatus:      Object.assign({}, _renderStatus),
    recoveryDecision:  _recoveryDecisions.length > 0
      ? _recoveryDecisions[_recoveryDecisions.length - 1]
      : null,
    timeline: {
      total:  _timeline.length,
      last10: _timeline.slice(-10),
    },
    startupPhases: startupPhases,
    modeHistory:   _modeHistory.slice(-5),
    authState:     Object.assign({}, _authState),
  };
}

// ─── Causal chain builder ─────────────────────────────────
function getCausalChain(fromId) {
  var chain = [];
  var current = _causalityNodes.filter(function(n) { return n.id === fromId; })[0];
  while (current) {
    chain.unshift(current);
    var parentId = current.parent;
    if (!parentId) break;
    current = _causalityNodes.filter(function(n) { return n.id === parentId; })[0];
    if (!current || chain.length > 20) break;
  }
  return chain;
}

// ─── Mode API (public) ────────────────────────────────────
function setMode(newMode, reason) {
  _setMode(newMode, reason);
}

function enterRecoveryMode() {
  _setMode(MODE.RECOVERY, 'manual recovery initiated');
}

function exitRecoveryMode() {
  _setMode(MODE.NORMAL, 'recovery completed');
}

// ─── Public API ───────────────────────────────────────────
window.ippoBrain = {
  // Core
  report:               report,
  classifyHydration:    classifyHydration,
  classifyRecordTransition: _classifyRecordTransition,

  // Introspection
  getTimeline:          function(n) { return _timeline.slice(n != null ? -(n) : -50); },
  getAllTimeline:        function() { return _timeline.slice(); },
  getCausalityGraph:    function() { return { nodes: _causalityNodes.slice() }; },
  getCausalChain:       getCausalChain,
  getConfidence:        function() { return Object.assign({}, _confidence); },
  getMode:              function() { return _mode; },
  getModeHistory:       function() { return _modeHistory.slice(); },
  getModuleHealth:      function() { return Object.assign({}, _moduleHealth); },
  getRenderStatus:      function() { return Object.assign({}, _renderStatus); },
  getCriticalErrors:    function() { return _criticalErrors.slice(); },
  getRecoveryDecisions: function() { return _recoveryDecisions.slice(); },
  getRecordHistory:     function() { return _recordHistory.slice(); },
  getPhaseHistory:      function() { return Object.assign({}, _phaseHistory); },

  // Diagnosis
  getDiagnosisPayload:  getDiagnosisPayload,

  // Replay
  getReplay:            getReplay,
  getStartupSequence:   function() { return getReplay({ phase: 'startup' }); },
  getHydrationSequence: function() { return getReplay({ phase: 'hydration' }); },
  getRenderChain:       function(mod) {
    return mod ? getReplay({ phase: 'render', module: mod }) : getReplay({ phase: 'render' });
  },
  getSaveTransactions:  function() { return getReplay({ phase: 'save' }); },

  // Mode control
  setMode:              setMode,
  enterRecoveryMode:    enterRecoveryMode,
  exitRecoveryMode:     exitRecoveryMode,

  // Auth state (Supabase runtime bridge)
  setAuthState: function(key, val) {
    if (key in _authState) {
      _authState[key] = val;
      if (typeof window.ippoMarkBootEvent === 'function') {
        window.ippoMarkBootEvent('auth-state-change', { key: key, val: val });
      }
    }
  },
  getAuthState: function() { return Object.assign({}, _authState); },

  // Constants
  MODE: MODE,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-brain-loaded');
}

export { report, getDiagnosisPayload, getReplay, classifyHydration, MODE };
