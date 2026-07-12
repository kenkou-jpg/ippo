// ================================================================
//  ippo – src/utils/string-utils.js
//  PR-087 (Legacy Removal Batch-9): Pure Utility
//
//  app-legacy.js の文字列・日付整形系の純粋関数
//  （escapeHtml/getTimeAgo/toLocalDateKey）を新設・物理移動。Business Logic変更なし。
// ================================================================

export function escapeHtml(text){
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function getTimeAgo(dateStr){
  var now = new Date();
  var d = new Date(dateStr);
  var diff = Math.floor((now - d) / 1000);
  if(diff < 60) return 'たった今';
  if(diff < 3600) return Math.floor(diff / 60) + '分前';
  if(diff < 86400) return Math.floor(diff / 3600) + '時間前';
  if(diff < 604800) return Math.floor(diff / 86400) + '日前';
  return (d.getMonth()+1) + '/' + d.getDate();
}

export function toLocalDateKey(date) {
  var d = date instanceof Date ? date : new Date(date);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

// PR-090-R2 (EXPORT_HUB_REFACTOR_COUNCIL Step A): 自己export追加。
// app-legacy.js側の重複export行は削除済み。
window.escapeHtml = escapeHtml;
window.getTimeAgo = getTimeAgo;
