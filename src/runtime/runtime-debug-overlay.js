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

var _IS_DEV = false;
try {
  // Vite の import.meta.env.DEV が利用可能な場合
  _IS_DEV = import.meta.env && import.meta.env.DEV;
} catch (_) {}

var _FORCE_ENABLED = false;
try {
  _FORCE_ENABLED =
    window.location.search.includes('ippo_debug=1') ||
    localStorage.getItem('ippo_debug_overlay') === '1';
} catch (_) {}

var _ENABLED = _IS_DEV || _FORCE_ENABLED;

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
    var state  = typeof window.getState === 'function' ? window.getState() : null;
    var health = typeof window.ippoHealthMonitor === 'object' ? window.ippoHealthMonitor.getHealth() : null;
    var snap   = typeof window.ippoRollbackManager === 'object' ? window.ippoRollbackManager.getLatestSnapshot() : null;
    var sync   = typeof window.ippoSyncConsistencyChecker === 'object' ? window.ippoSyncConsistencyChecker.check() : null;
    var dupes  = typeof window.ippoStartupValidator === 'object' ? window.ippoStartupValidator.getDuplicates() : [];

    var lines = [
      '[ippo runtime debug]',
      'records : ' + (state ? (state.records || []).length : '?'),
      'screen  : ' + (state && state.currentScreen || '?'),
      'saved   : ' + (state && state.lastSaved ? state.lastSaved.slice(11, 19) : '?'),
      'errors  : ' + (health ? health.errorCount : '?'),
      'warnings: ' + (health ? health.warningCount : '?'),
      'renders : ' + (health ? health.metrics.renderCount : '?'),
      'saves   : ' + (health ? health.metrics.saveCount : '?'),
      'snap    : ' + (snap ? snap.label + '@' + snap.at.slice(11, 19) + '(' + snap.recordCount + ')' : 'none'),
      'sync    : ' + (sync ? (sync.ok ? 'OK' : 'ISSUES:' + sync.issues.length) : '?'),
    ];

    if (dupes.length > 0) {
      lines.push('DUPES: ' + dupes.map(function (d) { return d.name; }).join(','));
    }

    var blocked = typeof window.ippoSyncConsistencyChecker === 'object' &&
                  window.ippoSyncConsistencyChecker.isCloudSyncBlocked();
    if (blocked) lines.push('⚠ CLOUD SYNC BLOCKED');

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
