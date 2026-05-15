// ============================================================
// ippo – src/runtime/runtime-orchestrator.js
// Runtime Orchestrator: 単一協調レイヤー
//
// 目的:
//   brain (observer) + controller (executor) + guards (integrity) +
//   startup gate (readiness) + auth-cloud state を
//   1つの runtime system として統合する。
//
// 役割:
//   - brain mode と controller mode の乖離を検知・修正
//   - 全 runtime モジュールの統合ステータスを単一 API で提供
//   - window.ippoRuntime として primary runtime interface を公開
//   - Human-in-the-loop safety: ソース書き換え/破壊的操作は一切しない
//
// 提供: window.ippoRuntime
// ============================================================

// ─── Safety level mapping ─────────────────────────────────
import { getState } from '../store/state.js';

var SAFETY_LEVEL = Object.freeze({
  NORMAL:   'normal',     // 通常動作
  DEGRADED: 'degraded',   // 一部機能制限（SAFE_CLOUD / LOW_RUNTIME）
  SAFE:     'safe',       // 安全モード（重機能停止）
  CRITICAL: 'critical',   // リカバリモード
});

var CTRL_TO_SAFETY = {
  'NORMAL_MODE':       SAFETY_LEVEL.NORMAL,
  'DEBUG_MODE':        SAFETY_LEVEL.NORMAL,
  'SAFE_CLOUD_MODE':   SAFETY_LEVEL.DEGRADED,
  'LOW_RUNTIME_MODE':  SAFETY_LEVEL.DEGRADED,
  'SAFE_STARTUP_MODE': SAFETY_LEVEL.SAFE,
  'SAFE_MODE':         SAFETY_LEVEL.SAFE,
  'RECOVERY_MODE':     SAFETY_LEVEL.CRITICAL,
};

// ─── Internal state ────────────────────────────────────────
var _initialized   = false;
var _startedAt     = null;
var _reconcileLog  = [];   // 乖離修正履歴, max 20
var _reconcileInterval = null;

// ─── Helpers ──────────────────────────────────────────────
function _iso() { try { return new Date().toISOString(); } catch (_) { return ''; } }

// ─── Unified status ───────────────────────────────────────
// 全 runtime モジュールの状態を 1 つのオブジェクトに集約。
// window.ippoRuntime.getStatus() がこれを返す。
function getStatus() {
  var brain     = window.ippoBrain;
  var ctrl      = window.ippoRuntimeController;
  var authCloud = window.ippoAuthCloudState;
  var health    = window.ippoHealthMonitor;
  var rollback  = window.ippoRollbackManager;
  var gate      = window.ippoDeferredRenderQueue;
  var boot      = window.__ippoBoot;

  var state = null;
  try {
    state = getState();
  } catch (_) {}

  var ctrlMode     = ctrl     ? ctrl.getMode()              : 'unknown';
  var brainMode    = brain    ? brain.getMode()             : 'unknown';
  var confidence   = brain    ? brain.getConfidence()       : {};
  var isolated     = ctrl     ? ctrl.getIsolatedModules()   : {};
  var degraded     = ctrl     ? ctrl.getDegradedSystems()   : {};
  var retryQ       = ctrl     ? ctrl.getRenderRetryQueue()  : [];
  var snapshots    = rollback ? rollback.getSnapshots()     : [];
  var lastSnap     = rollback ? rollback.getLatestSnapshot(): null;
  var healthData   = health   ? health.getHealth()          : { errorCount: 0, warningCount: 0, metrics: {} };

  return {
    generatedAt:       _iso(),
    startedAt:         _startedAt,

    // ── Mode / safety ────────────────────────────────────
    mode:              ctrlMode,
    brainMode:         brainMode,
    safetyLevel:       CTRL_TO_SAFETY[ctrlMode] || SAFETY_LEVEL.NORMAL,
    modesInSync:       _modesAreConsistent(brainMode, ctrlMode),

    // ── Readiness ────────────────────────────────────────
    stateReady:        window.__ippoStateReady === true,
    renderGateFlushed: gate ? gate.isFlushed() : false,

    // ── Auth / Cloud ─────────────────────────────────────
    authState:         authCloud ? authCloud.getAuthState()        : 'unknown',
    cloudState:        authCloud ? authCloud.getCloudState()       : 'unknown',
    supabaseReady:     authCloud ? authCloud.isSupabaseReady()     : false,
    cloudRestored:     authCloud ? authCloud.isCloudRestoreReady() : false,
    cloudFailed:       authCloud ? authCloud.isCloudFailed()       : false,
    cloudSkipped:      authCloud ? authCloud.isCloudSkipped()      : false,

    // ── Confidence scores ────────────────────────────────
    confidence:        confidence,

    // ── Records ──────────────────────────────────────────
    recordsCount:      state    ? (state.records || []).length : null,
    snapshotCount:     snapshots.length,
    bestSnapshot:      lastSnap ? {
      label:       lastSnap.label,
      recordCount: lastSnap.recordCount,
      at:          lastSnap.at,
    } : null,

    // ── Health ───────────────────────────────────────────
    errorCount:        healthData.errorCount,
    warningCount:      healthData.warningCount,
    metrics:           healthData.metrics || {},

    // ── Isolation ────────────────────────────────────────
    isolatedModules:   Object.keys(isolated),
    degradedSystems:   Object.keys(degraded),
    renderRetryQueue:  retryQ.map(function (r) { return r.module; }),

    // ── Controller ───────────────────────────────────────
    lastAction:        ctrl ? ctrl.getLastDecision() : null,
    auditTrail:        ctrl ? ctrl.getAuditTrail().slice(-5) : [],

    // ── Boot ─────────────────────────────────────────────
    bootEvents:        boot && boot.events ? boot.events.length : 0,
    bootErrors:        boot && boot.errors ? boot.errors.length : 0,
  };
}

// ─── Mode accessors ───────────────────────────────────────
function getMode() {
  var ctrl = window.ippoRuntimeController;
  return ctrl ? ctrl.getMode() : 'unknown';
}

function getSafetyLevel() {
  return CTRL_TO_SAFETY[getMode()] || SAFETY_LEVEL.NORMAL;
}

// ─── Readiness ────────────────────────────────────────────
function getReadiness() {
  var authCloud = window.ippoAuthCloudState;
  var gate      = window.ippoDeferredRenderQueue;
  return {
    state:        window.__ippoStateReady === true,
    hydration:    gate ? gate.isFlushed() : false,
    auth:         authCloud ? authCloud.isAuthReady()        : false,
    supabase:     authCloud ? authCloud.isSupabaseReady()    : false,
    cloudRestore: authCloud ? authCloud.isCloudRestoreReady(): false,
  };
}

// ─── Health check ─────────────────────────────────────────
function isHealthy() {
  var sl = getSafetyLevel();
  if (sl === SAFETY_LEVEL.CRITICAL) return false;

  var health = window.ippoHealthMonitor;
  if (health) {
    var h = health.getHealth();
    if (h.errorCount > 10) return false;
  }

  var brain = window.ippoBrain;
  if (brain) {
    var conf = brain.getConfidence();
    if ((conf.recordsIntegrity || 100) < 30)  return false;
    if ((conf.startupConfidence || 100) < 20) return false;
  }

  return true;
}

// ─── Report forwarding ────────────────────────────────────
function report(data) {
  var brain = window.ippoBrain;
  if (brain && typeof brain.report === 'function') {
    return brain.report(data);
  }
  return null;
}

// ─── Mode consistency check ───────────────────────────────
// brain mode と controller mode が矛盾していないか確認。
// brain=SAFE かつ ctrl=NORMAL は矛盾（brain が SAFE になった理由を controller が無視している）。
function _modesAreConsistent(brainMode, ctrlMode) {
  if (brainMode === 'SAFE_MODE'     && ctrlMode === 'NORMAL_MODE') return false;
  if (brainMode === 'RECOVERY_MODE' && ctrlMode === 'NORMAL_MODE') return false;
  return true;
}

// ─── Mode reconciliation ──────────────────────────────────
// brain と controller の mode が乖離していたら controller に追従させる。
// brain は diagnostic observer → controller は executor。
// controller の mode が正であるべきだが、brain が SAFE/RECOVERY に入った場合は
// controller も追従するべき。
function reconcileModes() {
  var brain = window.ippoBrain;
  var ctrl  = window.ippoRuntimeController;
  if (!brain || !ctrl) return false;

  var brainMode = brain.getMode();
  var ctrlMode  = ctrl.getMode();

  if (_modesAreConsistent(brainMode, ctrlMode)) return false;

  var targetMode = (brainMode === 'RECOVERY_MODE') ? 'RECOVERY_MODE' : 'SAFE_MODE';
  var switched   = ctrl.switchMode(targetMode, 'orchestrator reconcile: brain=' + brainMode);

  if (switched) {
    var entry = {
      at:          _iso(),
      brainMode:   brainMode,
      ctrlModePre: ctrlMode,
      ctrlModePost: targetMode,
      reason:      'brain/controller mode divergence corrected',
    };
    _reconcileLog.push(entry);
    if (_reconcileLog.length > 20) _reconcileLog.shift();

    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('orchestrator-mode-reconciled', entry);
    }
    return true;
  }
  return false;
}

// ─── Records safety verification ─────────────────────────
// 全ソース（localStorage, _state, state, window.state, cloud snapshot）の
// records count を比較して異常を brain に報告する。
function verifyRecordsSafety() {
  var state = null;
  try { state = getState(); } catch (_) {}

  var inMemoryCount  = state ? (state.records || []).length : null;
  var localRaw       = null;
  var localCount     = null;

  try {
    var key = window.STATE_KEY || 'ippo_state';
    localRaw   = localStorage.getItem(key);
    if (localRaw) {
      var localParsed = JSON.parse(localRaw);
      localCount = (localParsed.records || []).length;
    }
  } catch (_) {}

  if (inMemoryCount == null || localCount == null) return;

  var diff = Math.abs(inMemoryCount - localCount);

  if (diff > 5) {
    report({
      phase:        'sync',
      module:       'orchestrator',
      outcome:      'warning',
      error:        'records count mismatch: memory=' + inMemoryCount + ' localStorage=' + localCount,
      recordsCount: inMemoryCount,
    });
  }
}

// ─── Periodic coordination ────────────────────────────────
var _coordCycle = 0;

function _coordinationTick() {
  _coordCycle++;

  // 毎 tick: brain/controller mode 乖離修正
  reconcileModes();

  // 5 tick ごと（~25s）: records safety verification
  if (_coordCycle % 5 === 0) {
    verifyRecordsSafety();
  }
}

// ─── Init ────────────────────────────────────────────────
function _init() {
  if (_initialized) return;
  _initialized = true;
  _startedAt   = _iso();

  // 5 秒ごとに協調 tick
  _reconcileInterval = setInterval(_coordinationTick, 5000);

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('runtime-orchestrator-started', { startedAt: _startedAt });
  }
}

// ─── Bridge Status (Phase 10: post-removal) ───────────────
// bridge 除去完了を確認する診断関数。
// window.state bridge / auth bridge / premium interval は除去済み。
function getBridgeStatus() {
  var dangerousModules = [];

  // auth-service が ownership を確立しているか
  var authServiceReady = !!(
    window.ippoAuthService &&
    typeof window.ippoAuthService.isReady === 'function'
  );
  if (!authServiceReady) dangerousModules.push('auth (no ippoAuthService)');

  // editing-state が ownership を確立しているか
  var editingStateReady = !!(
    window.ippoEditingState &&
    typeof window.ippoEditingState.getEditingState === 'function'
  );
  if (!editingStateReady) dangerousModules.push('editing-state (no ippoEditingState)');

  // premium-service が ownership を確立しているか
  var premiumServiceReady = !!(
    window.ippoPremiumService &&
    typeof window.ippoPremiumService.isPremium === 'function'
  );
  if (!premiumServiceReady) dangerousModules.push('premium (no ippoPremiumService)');

  var safeToRemove = (
    authServiceReady &&
    editingStateReady &&
    premiumServiceReady &&
    dangerousModules.length === 0
  );

  return {
    dangerousModules:   dangerousModules,
    safeToRemove:       safeToRemove,
    authServiceReady:   authServiceReady,
    editingStateReady:  editingStateReady,
    premiumServiceReady: premiumServiceReady,
    bridgesRemoved:     true,
    generatedAt:        _iso(),
  };
}

function enableBridgeWarningMode() {
  // bridge 除去済みのため no-op（後方互換のみ）
  console.info('[ippo] bridge warning mode: bridges already removed.');
}

function disableBridgeWarningMode() {
  // no-op
  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('bridge-warning-mode:disabled');
  }
}

// ─── Public API ───────────────────────────────────────────
window.ippoRuntime = {
  // Primary status
  getStatus:        getStatus,
  getMode:          getMode,
  getSafetyLevel:   getSafetyLevel,
  getReadiness:     getReadiness,
  isHealthy:        isHealthy,

  // Brain forwarding
  report:           report,

  // Coordination
  reconcileModes:      reconcileModes,
  verifyRecordsSafety: verifyRecordsSafety,
  getReconcileLog:     function () { return _reconcileLog.slice(); },

  // Phase 8: Bridge removal readiness check
  getBridgeStatus:         getBridgeStatus,

  // Phase 9: Bridge warning mode
  enableBridgeWarningMode:  enableBridgeWarningMode,
  disableBridgeWarningMode: disableBridgeWarningMode,

  // Constants
  SAFETY_LEVEL: SAFETY_LEVEL,
};

_init();

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-orchestrator-loaded');
}

export {};
