// ============================================================
// ippo – src/runtime/health-monitor.js
// Runtime エラー収集・カテゴリ分類。boot-stability を補完。
// 提供: window.ippoHealthMonitor
// ============================================================

const _errors   = [];
const _warnings = [];
const _metrics  = {
  hydrationCount: 0,
  renderCount:    0,
  saveCount:      0,
  saveFailCount:  0,
  recordDropEvents: 0,
  initCount:      0,
};
const MAX_ERRORS   = 50;
const MAX_WARNINGS = 30;

function _ts() {
  try { return new Date().toISOString(); } catch (_) { return ''; }
}

function _category(msg) {
  if (!msg) return 'unknown';
  var m = String(msg).toLowerCase();
  if (/record/.test(m))                      return 'records';
  if (/hydrat/.test(m))                      return 'hydration';
  if (/render/.test(m))                      return 'render';
  if (/save|persist/.test(m))                return 'save';
  if (/sync|cloud|supabase/.test(m))         return 'sync';
  if (/state/.test(m))                       return 'state';
  if (/referenceerror|typeerror|syntaxerror/.test(m)) return 'runtime-error';
  return 'other';
}

function logError(type, detail) {
  var entry = {
    type: type,
    category: _category(detail && detail.message || type),
    detail: detail || null,
    at: _ts(),
  };
  _errors.push(entry);
  if (_errors.length > MAX_ERRORS) _errors.shift();
  if (typeof window.ippoMarkBootError === 'function') {
    window.ippoMarkBootError('hm:' + type, detail);
  }
  return entry;
}

function logWarning(type, detail) {
  var entry = { type: type, detail: detail || null, at: _ts() };
  _warnings.push(entry);
  if (_warnings.length > MAX_WARNINGS) _warnings.shift();
  if (typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('hm:' + type, detail);
  }
  return entry;
}

function getHealth() {
  return {
    errorCount:     _errors.length,
    warningCount:   _warnings.length,
    recentErrors:   _errors.slice(-10),
    recentWarnings: _warnings.slice(-5),
    metrics:        Object.assign({}, _metrics),
  };
}

// EL-1: boot-stability の診断バス経由でエラーを受信（重複リスナー廃止）
// boot-stability.js が window.error / unhandledrejection の単一オーナー。
// removal condition: boot-stability.js の __ippoDiagBus が廃止されたら
//   window.addEventListener を直接使う形に戻す。
(function () {
  function _subscribe() {
    if (window.__ippoDiagBus && typeof window.__ippoDiagBus.subscribe === 'function') {
      window.__ippoDiagBus.subscribe(function (type, detail) {
        logError(type, detail);
      });
      return true;
    }
    return false;
  }
  if (!_subscribe()) {
    // バスが未初期化の場合（ロード順の異常）: 遅延サブスクライブ
    var _busRetry = 0;
    var _busTimer = setInterval(function () {
      _busRetry++;
      if (_subscribe() || _busRetry >= 20) clearInterval(_busTimer);
    }, 100);
  }
})();

window.ippoHealthMonitor = {
  logError:   logError,
  logWarning: logWarning,
  getHealth:  getHealth,
  metrics:    _metrics,
  getErrors:   function () { return _errors.slice(); },
  getWarnings: function () { return _warnings.slice(); },
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('health-monitor-loaded');
}

export { logError, logWarning, getHealth };
