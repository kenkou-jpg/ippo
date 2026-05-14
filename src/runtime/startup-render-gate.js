// ============================================================
//  ippo – src/runtime/startup-render-gate.js
//  Startup Render Gate: state readiness gate + deferred render queue
//
//  window.__ippoStateReady  = false until bootstrap() dispatches ippo:state-ready
//  window.enqueueDeferredRender(name, fn) = enqueue or run immediately
//  window.ippoDeferredRenderQueue = public API object
//
//  Flushed on: ippo:state-ready event (dispatched from app-bootstrap.js)
//  Fallback:   ippo:vite-ready event (safety net after 5s max)
// ============================================================

// Mark state as NOT ready before any render can fire
if (typeof window.__ippoStateReady === 'undefined') {
  window.__ippoStateReady = false;
}

// ─── Deferred Render Queue ────────────────────────────────────
var _queue      = [];
var _flushed    = false;
var _gateTimer  = null;          // timeout-fallback タイマー
var GATE_TIMEOUT_MS = 8000;      // state-ready が 8s 来なければ強制 flush

function _enqueueDeferredRender(name, fn) {
  if (_flushed || window.__ippoStateReady) {
    // State already ready — execute immediately
    try { fn(); } catch (e) {
      console.warn('ippo: deferred render [' + name + ']', e);
    }
    return;
  }
  // Deduplicate by name
  var alreadyQueued = _queue.some(function (item) { return item.name === name; });
  if (!alreadyQueued) {
    _queue.push({ name: name, fn: fn });
  }
}

function _flushDeferredRenderQueue(reason) {
  if (_flushed) return;
  // タイムアウトタイマーをキャンセル（正常 flush 時）
  if (_gateTimer) { clearTimeout(_gateTimer); _gateTimer = null; }
  _flushed = true;
  window.__ippoStateReady = true;

  var items = _queue.slice();
  _queue.length = 0;

  var failures = 0;
  items.forEach(function (item) {
    try {
      item.fn();
    } catch (e) {
      failures++;
      console.warn('ippo: deferred render flush error [' + item.name + ']', e);
    }
  });

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('deferred-render-queue-flushed', {
      reason: reason || 'state-ready',
      count: items.length,
      failures: failures,
    });
  }
}

// ─── Event Listeners ─────────────────────────────────────────
// Primary: state hydration complete
window.addEventListener('ippo:state-ready', function (e) {
  window.__ippoStateReady = true;
  _flushDeferredRenderQueue('ippo:state-ready');
});

// Fallback: vite-ready (if state-ready was never dispatched)
window.addEventListener('ippo:vite-ready', function () {
  if (!_flushed) {
    // Give bootstrap() a tick to call setState before we flush
    setTimeout(function () {
      if (!_flushed) {
        window.__ippoStateReady = true;
        _flushDeferredRenderQueue('ippo:vite-ready-fallback');
      }
    }, 100);
  }
});

// ─── Timeout fallback ─────────────────────────────────────────
// ippo:state-ready が GATE_TIMEOUT_MS 以内に来なければ強制 flush。
// アプリが何もレンダリングされない状態で固まることを防ぐ。
_gateTimer = setTimeout(function () {
  if (!_flushed) {
    if (typeof window.ippoBrain === 'object') {
      window.ippoBrain.report({
        phase:   'startup',
        module:  'startup-render-gate',
        outcome: 'warning',
        error:   'ippo:state-ready not received after ' + GATE_TIMEOUT_MS + 'ms – forcing flush',
      });
    }
    if (typeof window.ippoMarkBootWarning === 'function') {
      window.ippoMarkBootWarning('startup-render-gate-timeout', { waitedMs: GATE_TIMEOUT_MS });
    }
    window.__ippoStateReady = true;
    _flushDeferredRenderQueue('timeout-fallback-' + GATE_TIMEOUT_MS + 'ms');
  }
}, GATE_TIMEOUT_MS);

// ─── Public API ───────────────────────────────────────────────
window.enqueueDeferredRender = _enqueueDeferredRender;

window.ippoDeferredRenderQueue = {
  enqueue:    _enqueueDeferredRender,
  flush:      _flushDeferredRenderQueue,
  getQueue:   function () { return _queue.slice(); },
  isFlushed:  function () { return _flushed; },
  isReady:    function () { return window.__ippoStateReady === true; },
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-render-gate-loaded');
}
