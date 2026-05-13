// ============================================================
//  ippo – src/modules/ui-notifications.js
//  Priority 8 (Step 8-2): showToast / showSyncIndicator /
//  hideSyncIndicator を app.html から移植
// ============================================================

// ─── 同期インジケーター ───────────────────────────────────────
var _syncIndicatorTimer = null;

export function showSyncIndicator(msg) {
  var el = document.getElementById('ippo-sync-indicator');
  var txt = document.getElementById('ippo-sync-text');
  if (!el) return;
  if (txt) txt.textContent = msg || '同期中';
  el.style.display = 'flex';
  if (_syncIndicatorTimer) clearTimeout(_syncIndicatorTimer);
}

export function hideSyncIndicator() {
  if (_syncIndicatorTimer) clearTimeout(_syncIndicatorTimer);
  _syncIndicatorTimer = setTimeout(function () {
    var el = document.getElementById('ippo-sync-indicator');
    if (el) el.style.display = 'none';
  }, 800);
}

// ─── トースト通知 ─────────────────────────────────────────────
var _toastTimer = null;

export function showToast(msg, type) {
  if (_toastTimer) clearTimeout(_toastTimer);
  var existing = document.getElementById('ippo-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'ippo-toast';
  var bg    = type === 'error' ? '#fef3f2' : type === 'warn' ? '#fff8e6' : '#e8f4ec';
  var color = type === 'error' ? '#c44848' : type === 'warn' ? '#9a6a00' : '#2d6a3f';
  toast.style.cssText =
    'position:fixed;top:calc(env(safe-area-inset-top,0px) + 60px);left:50%;' +
    'transform:translateX(-50%);max-width:390px;width:calc(100% - 32px);' +
    'padding:12px 16px;background:' + bg + ';color:' + color + ';' +
    'border-radius:12px;font-size:13px;font-family:Noto Sans JP,sans-serif;' +
    'z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.1);' +
    'text-align:center;transition:opacity 0.3s;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  _toastTimer = setTimeout(function () {
    toast.style.opacity = '0';
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 300);
  }, type === 'error' ? 5000 : 3000);
}

// ─── Escape キーでモーダルを閉じる ───────────────────────────
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var dm = document.getElementById('dmOverlay');
  if (dm && dm.classList.contains('dm-open')) { dm.classList.remove('dm-open'); return; }
  var eo = document.getElementById('editOverlay');
  if (eo && eo.style.display === 'flex') { eo.style.display = 'none'; return; }
  var rm = document.getElementById('record-modal');
  if (rm && rm.classList.contains('active')) { if (typeof window.closeModal === 'function') window.closeModal(); return; }
  var diag = document.getElementById('diagnosis-overlay');
  if (diag) { diag.remove(); return; }
});

// ─── window 互換 ──────────────────────────────────────────────
window.showSyncIndicator = showSyncIndicator;
window.hideSyncIndicator = hideSyncIndicator;
window.showToast         = showToast;
