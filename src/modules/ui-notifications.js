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
  // PR-092C (UI/UX Final Council採用): #record-modal完全終了に伴い、当該分岐を削除。
  var diag = document.getElementById('diagnosis-overlay');
  if (diag) { diag.remove(); return; }
});

// ─── window 互換 ──────────────────────────────────────────────
window.showSyncIndicator = showSyncIndicator;
window.hideSyncIndicator = hideSyncIndicator;
window.showToast         = showToast;

// ================================================================
//  PR-084 (Legacy Removal Batch-6): 独自モーダル(alert/confirm代替) と
//  デイリーメッセージを app-legacy.js から物理移動。Business Logic変更なし。
// ================================================================

// ===== 独自モーダル（alert/confirm代替） =====
export function showConfirmModal(message, onConfirm, onCancel) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(44,36,32,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--cream);border-radius:22px;padding:28px 24px;width:85%;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(44,36,32,0.15);';
  box.innerHTML = '<div style="font-family:\'Shippori Mincho\',serif;font-size:17px;color:var(--ink);margin-bottom:16px;line-height:1.6;">' + message + '</div>'
    + '<div style="display:flex;gap:10px;">'
    + '<button id="_confirm_cancel" style="flex:1;padding:13px;border-radius:13px;border:1.5px solid #e8ddd8;background:var(--white);font-family:\'Noto Sans JP\',sans-serif;font-size:13px;color:var(--ink-mid);cursor:pointer;">キャンセル</button>'
    + '<button id="_confirm_ok" style="flex:1;padding:13px;border-radius:13px;border:none;background:var(--rose);font-family:\'Noto Sans JP\',sans-serif;font-size:13px;color:white;font-weight:500;cursor:pointer;">確認</button>'
    + '</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector('#_confirm_ok').onclick = function() { overlay.remove(); if (onConfirm) onConfirm(); };
  box.querySelector('#_confirm_cancel').onclick = function() { overlay.remove(); if (onCancel) onCancel(); };
}

export function showPrivacyInfo() {
  showAlertModal(
    'あなたの記録について\n\n'
    + '・症状・体調の記録はあなただけが見られます\n'
    + '・広告配信への利用は行いません\n'
    + '・第三者へのデータ販売は行いません\n'
    + '・データはいつでも設定から削除できます\n'
    + '・クラウド同期はSupabaseの暗号化通信で行われます'
  );
}

export function showAlertModal(message, onClose) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(44,36,32,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--cream);border-radius:22px;padding:28px 24px;width:85%;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(44,36,32,0.15);';
  box.innerHTML = '<div style="font-family:\'Shippori Mincho\',serif;font-size:16px;color:var(--ink);margin-bottom:20px;line-height:1.7;">' + message + '</div>'
    + '<button style="width:100%;padding:13px;border-radius:13px;border:none;background:var(--rose);font-family:\'Noto Sans JP\',sans-serif;font-size:14px;color:white;font-weight:500;cursor:pointer;">閉じる</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector('button').onclick = function() { overlay.remove(); if (onClose) onClose(); };
}

// ===== DAILY MESSAGES =====
var _dailyMessages = [
  'からだの小さな変化に\n気づくことが、最初の一歩。',
  '今日の記録が、\n明日の自分を助けてくれる。',
  '無理なく、ていねいに。\nあなたのペースでいい。',
  '子宮は第二の心。\nからだの声に耳を傾けて。',
  '感情もからだの一部。\n正直に記録することが癒しになる。',
];

export function setDailyMessage() {
  const idx = new Date().getDate() % _dailyMessages.length;
  const el = document.getElementById('today-message');
  // バグ11: replace は最初の\nしか置換しないため replaceAll を使用
  if (el) el.innerHTML = _dailyMessages[idx].replaceAll('\n', '<br>');
}

// PR-090-R2 (EXPORT_HUB_REFACTOR_COUNCIL Step A): 自己export追加。
// app-legacy.js側の重複export行は削除済み。
window.showConfirmModal = showConfirmModal;
window.showAlertModal = showAlertModal;
window.showPrivacyInfo = showPrivacyInfo;
window.setDailyMessage = setDailyMessage;
