// ============================================================
// ippo – src/runtime/runtime-debug-overlay.js
// 開発時専用のランタイム状態オーバーレイ。
//
// 有効化:
//   localStorage.setItem('ippo_debug_overlay', '1')
//   または URL に ?ippo_debug=1 を付加
//
// 提供: window.ippoRuntimeDebugOverlay
// ============================================================

// import.meta.env.DEV を try-catch の外でトップレベルに直接使うことで
// Viteが本番ビルド時に false へ静的置換 → dead code elimination が確実に動く。
// try-catch 内では静的解析が止まるため絶対に入れてはいけない。
const _IS_DEV = import.meta.env.DEV;

// _FORCE_ENABLED は開発環境でのみ評価する。
// 本番ビルドでは _IS_DEV === false に置換され、if ブロックごと除去される。
let _FORCE_ENABLED = false;
if (_IS_DEV) {
  try {
    _FORCE_ENABLED =
      window.location.search.includes('ippo_debug=1') ||
      localStorage.getItem('ippo_debug_overlay') === '1';
  } catch (_) {}
}

const _ENABLED = _IS_DEV || _FORCE_ENABLED;

if (!_ENABLED) {
  window.ippoRuntimeDebugOverlay = {
    enabled: false,
    show:    function () {},
    hide:    function () {},
    toggle:  function () {},
    update:  function () {},
  };
} else {
  var _el         = null;
  var _intervalId = null;

  function _createOverlay() {
    var el       = document.createElement('div');
    el.id        = 'ippo-debug-overlay';
    el.style.cssText = [
      'position:fixed',
      'bottom:8px',
      'right:8px',
      'z-index:99999',
      'background:rgba(0,0,0,0.82)',
      'color:#4f4',
      'font:10px/1.5 monospace',
      'padding:8px 12px',
      'border-radius:6px',
      'max-width:260px',
      'pointer-events:none',
      'white-space:pre',
      'border:1px solid #2a2',
    ].join(';');
    document.body.appendChild(el);
    return el;
  }

  function _text() {
    var state    = typeof window.getState === 'function' ? window.getState() : null;
    var health   = typeof window.ippoHealthMonitor === 'object' ? window.ippoHealthMonitor.getHealth() : null;
    var snap     = typeof window.ippoRollbackManager === 'object' ? window.ippoRollbackManager.getLatestSnapshot() : null;
    var sync     = typeof window.ippoSyncConsistencyChecker === 'object' ? window.ippoSyncConsistencyChecker.check() : null;
    var dupes    = typeof window.ippoStartupValidator === 'object' ? window.ippoStartupValidator.getDuplicates() : [];
    var brain    = typeof window.ippoBrain === 'object' ? window.ippoBrain : null;
    var acs      = typeof window.ippoAuthCloudState === 'object' ? window.ippoAuthCloudState : null;
    var orch     = typeof window.ippoRuntime === 'object' ? window.ippoRuntime : null;

    var stateReady = window.__ippoStateReady === true;
    var gate       = typeof window.ippoDeferredRenderQueue === 'object' ? window.ippoDeferredRenderQueue : null;

    var lines = [
      '[ippo runtime debug]',
      'records : ' + (state ? (state.records || []).length : '?'),
      'screen  : ' + (state && state.currentScreen || '?'),
      'saved   : ' + (state && state.lastSaved ? state.lastSaved.slice(11, 19) : '?'),
      'stRdy   : ' + (stateReady ? 'yes' : 'no') + (gate ? (gate.isFlushed() ? ' flush✓' : ' flush…') : ''),
      'errors  : ' + (health ? health.errorCount : '?'),
      'warnings: ' + (health ? health.warningCount : '?'),
      'renders : ' + (health ? health.metrics.renderCount : '?'),
      'saves   : ' + (health ? health.metrics.saveCount : '?'),
      'snap    : ' + (snap ? snap.label + '@' + snap.at.slice(11, 19) + '(' + snap.recordCount + ')' : 'none'),
      'sync    : ' + (sync ? (sync.ok ? 'OK' : 'ISSUES:' + sync.issues.length) : '?'),
    ];

    if (brain) {
      var mode  = brain.getMode();
      var conf  = brain.getConfidence();
      var crit  = brain.getCriticalErrors();
      var rDecs = brain.getRecoveryDecisions();
      var lastDec = rDecs.length > 0 ? rDecs[rDecs.length - 1] : null;

      lines.push('── brain ──────────');
      lines.push('mode    : ' + mode);
      lines.push('startup : ' + (conf.startupConfidence   != null ? conf.startupConfidence   : '?'));
      lines.push('hydrat  : ' + (conf.hydrationConfidence != null ? conf.hydrationConfidence : '?'));
      lines.push('render  : ' + (conf.renderConsistency   != null ? conf.renderConsistency   : '?'));
      lines.push('sync    : ' + (conf.syncConfidence      != null ? conf.syncConfidence      : '?'));
      lines.push('records : ' + (conf.recordsIntegrity    != null ? conf.recordsIntegrity    : '?'));
      lines.push('events  : ' + brain.getAllTimeline().length);
      if (crit.length > 0) {
        var last = crit[crit.length - 1];
        lines.push('CRIT: ' + last.phase + ':' + last.module);
      }
      if (lastDec) {
        lines.push('rec→ ' + lastDec.decision);
      }
    }

    var ctrl = typeof window.ippoRuntimeController === 'object' ? window.ippoRuntimeController : null;
    if (ctrl) {
      var ctrlMode    = ctrl.getMode();
      var lastAction  = ctrl.getLastDecision();
      var isolated    = ctrl.getIsolatedModules();
      var retryQueue  = ctrl.getRenderRetryQueue();
      var degraded    = ctrl.getDegradedSystems();
      var isolatedNames = Object.keys(isolated);
      var degradedNames = Object.keys(degraded);
      var audit       = ctrl.getAuditTrail();
      var lastAudit   = audit.length > 0 ? audit[audit.length - 1] : null;

      lines.push('── controller ─────');
      lines.push('ctrlMode: ' + ctrlMode);
      if (lastAction) {
        lines.push('action  : ' + lastAction.action);
        lines.push('reason  : ' + (lastAction.reason || '').slice(0, 30));
      }
      if (lastAudit && (!lastAction || lastAudit.action !== lastAction.action)) {
        lines.push('lastLog : ' + lastAudit.action);
      }
      if (retryQueue.length > 0) {
        lines.push('retryQ  : ' + retryQueue.map(function (r) { return r.module + '#' + r.attempts; }).join(','));
      }
      if (isolatedNames.length > 0) {
        lines.push('isolated: ' + isolatedNames.join(','));
      }
      if (degradedNames.length > 0) {
        lines.push('degraded: ' + degradedNames.join(','));
      }
      if (ctrl.isLexicalBridgeInjected()) {
        lines.push('lexBrdg : injected');
      }
    }

    // ── Auth / Cloud state ──────────────────────────────
    if (acs) {
      lines.push('── auth/cloud ──────');
      lines.push('auth    : ' + acs.getAuthState());
      lines.push('cloud   : ' + acs.getCloudState());
    }

    // ── Orchestrator readiness ──────────────────────────
    if (orch) {
      var readiness   = orch.getReadiness();
      var safetyLevel = orch.getSafetyLevel();
      lines.push('── orchestrator ────');
      lines.push('safety  : ' + safetyLevel);
      lines.push('healthy : ' + (orch.isHealthy() ? 'yes' : 'NO'));
      lines.push('state   : ' + (readiness.state        ? 'ready'  : 'wait'));
      lines.push('hydrat  : ' + (readiness.hydration     ? 'done'   : 'wait'));
      lines.push('supabase: ' + (readiness.supabase      ? 'ready'  : 'wait'));
      lines.push('cloud   : ' + (readiness.cloudRestore  ? 'done'   : (acs && acs.isCloudSkipped() ? 'skip' : 'wait')));
      var reconcileLog = orch.getReconcileLog();
      if (reconcileLog.length > 0) {
        var lastRec = reconcileLog[reconcileLog.length - 1];
        lines.push('reconcil: ' + lastRec.ctrlModePre + '→' + lastRec.ctrlModePost);
      }
    }

    if (dupes.length > 0) {
      lines.push('DUPES: ' + dupes.map(function (d) { return d.name; }).join(','));
    }

    var blocked = typeof window.ippoSyncConsistencyChecker === 'object' &&
                  window.ippoSyncConsistencyChecker.isCloudSyncBlocked();
    if (blocked) lines.push('⚠ CLOUD SYNC BLOCKED');

    if (window.__ippoCloudRestoreFailed === true) {
      lines.push('⚠ CLOUD RESTORE FAILED');
    }

    return lines.join('\n');
  }

  function update() {
    if (_el) _el.textContent = _text();
  }

  function show() {
    if (!_el) {
      if (document.body) {
        _el = _createOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          _el = _createOverlay();
          update();
        });
        return;
      }
    }
    _el.style.display = 'block';
    update();
    if (!_intervalId) {
      _intervalId = setInterval(update, 2000);
    }
  }

  function hide() {
    if (_el) _el.style.display = 'none';
    if (_intervalId) { clearInterval(_intervalId); _intervalId = null; }
  }

  function toggle() {
    if (_el && _el.style.display !== 'none') { hide(); } else { show(); }
  }

  window.ippoRuntimeDebugOverlay = {
    enabled: true,
    show:    show,
    hide:    hide,
    toggle:  toggle,
    update:  update,
  };

  // DOM 準備後に自動表示
  if (document.body) { show(); }
  else { document.addEventListener('DOMContentLoaded', show); }
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-debug-overlay-loaded', { enabled: _ENABLED });
}

export {};
