// ============================================================
// ippo – src/runtime/render-boundary.js
// render エラーがアプリ全体クラッシュへ波及しないための
// try/catch バウンダリ。
//
// 使い方:
//   import { safeRender } from './render-boundary.js';
//   safeRender('home', function() { updateStats(); }, function(err) { /* fallback */ });
//
// 提供: window.ippoRenderBoundary
// ============================================================

import { logError } from './health-monitor.js';

function safeRender(name, fn, fallback) {
  try {
    var result = fn();
    if (window.ippoHealthMonitor) window.ippoHealthMonitor.metrics.renderCount++;
    return result;
  } catch (e) {
    logError('render-boundary-caught', {
      name:    name,
      message: e.message,
      stack:   e.stack ? e.stack.slice(0, 300) : null,
    });
    console.error('[ippo RenderBoundary] render error in "' + name + '":', e);
    if (typeof window.ippoMarkBootError === 'function') {
      window.ippoMarkBootError('render-error:' + name, { message: e.message });
    }
    if (typeof fallback === 'function') {
      try { fallback(e); } catch (_) {}
    }
    return null;
  }
}

// fn を引数付きで呼び出せるラップ版
function wrapRender(name, fn) {
  return function () {
    var args = arguments;
    return safeRender(name, function () {
      return fn.apply(this, args);
    }.bind(this));
  };
}

window.ippoRenderBoundary = {
  safeRender: safeRender,
  wrapRender: wrapRender,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('render-boundary-loaded');
}

export { safeRender, wrapRender };
