// ============================================================
//  ippo – src/services/push.js
//  Push 通知 & Service Worker 登録
//
//  【移設元】app.html インラインスクリプト
//           - requestNotificationPermission / scheduleReminders
//             (settings <script> ブロック 付近)
//           - Service Worker 登録
//             (最終 <script> ブロック)
//
//  【設計方針】
//  - 外部 SDK 依存なし（Web 標準 API のみ使用）
//  - state.reminders は window.state 経由でアクセス
//    （ES モジュールは deferred のためインライン state 変数を直接参照不可）
//  - window.requestNotificationPermission / window.scheduleReminders を維持
// ============================================================

import { getState } from '../store/state.js';

// ─── タイマー管理 ─────────────────────────────────────────
// モジュールローカル変数。scheduleReminders() 内でのみ使用。
let _reminderTimers = [];

// ─── 通知パーミッション要求 ───────────────────────────────
export function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

// ─── リマインダースケジュール ─────────────────────────────
export function scheduleReminders() {
  // 既存タイマーをクリア
  _reminderTimers.forEach(function (t) { clearTimeout(t); });
  _reminderTimers = [];

  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  var st = getState();
  if (!st || !st.reminders || !st.reminders.length) return;

  var now = new Date();
  st.reminders.forEach(function (r) {
    if (!r.enabled) return;

    var parts  = r.time.split(':');
    var target = new Date();
    target.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);

    // 今日の時間が過ぎていたら翌日にスケジュール
    if (target <= now) target.setDate(target.getDate() + 1);

    var delay = target.getTime() - now.getTime();
    var timer = setTimeout(function () {
      new Notification('ippo リマインダー', {
        body: r.label + '（' + r.time + '）',
        icon: 'images/icon-192.png',
        tag:  'ippo-reminder-' + r.time,
      });
      // 翌日に再スケジュール
      scheduleReminders();
    }, delay);
    _reminderTimers.push(timer);
  });
}

// ─── Service Worker 登録 ──────────────────────────────────
// モジュール読み込み時（window load イベント）に自動実行
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function (reg) {
        console.log('[SW] 登録成功:', reg.scope);
        // 新バージョンがあれば即適用
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', function () {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[SW] 新バージョン利用可能');
              }
            });
          }
        });
      })
      .catch(function (err) {
        console.warn('[SW] 登録失敗:', err);
      });
  });
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.requestNotificationPermission = requestNotificationPermission;
window.scheduleReminders             = scheduleReminders;
