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

        // P0-FIX-5: 新バージョン検知 → 記録入力中なら SKIP_WAITING を遅延させる。
        // dirty フラグは record-draft-guard が管理する。
        reg.addEventListener('updatefound', function () {
          var newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', function () {
            if (newWorker.state !== 'installed') return;
            if (!navigator.serviceWorker.controller) return;

            // dirty（入力中）なら即時更新せずユーザーに通知
            var guard = window.ippoRecordDraftGuard;
            var isDirty = guard && typeof guard.isDirty === 'function' && guard.isDirty();

            if (isDirty) {
              console.log('[SW] 新バージョンあり。記録入力中のため更新を延期。');
              // ユーザーへのバナー表示
              var banner = document.getElementById('ippo-sw-update-banner');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'ippo-sw-update-banner';
                banner.style.cssText = [
                  'position:fixed;top:0;left:0;right:0;background:#18245a;',
                  'color:#fff;font-size:13px;padding:10px 16px;z-index:9999;',
                  'display:flex;align-items:center;justify-content:space-between;',
                ].join('');
                banner.innerHTML = [
                  '<span>新しいバージョンがあります。記録を保存してから更新できます。</span>',
                  '<button id="ippo-sw-update-now" style="background:#8b7fd6;border:none;',
                  'color:#fff;border-radius:6px;padding:6px 12px;font-size:12px;cursor:pointer;">',
                  '今すぐ更新</button>',
                ].join('');
                document.body.appendChild(banner);
                document.getElementById('ippo-sw-update-now').addEventListener('click', function() {
                  if (guard && typeof guard.saveDraft === 'function') guard.saveDraft();
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  banner.remove();
                });
              }
            } else {
              // dirty でなければ即時 SKIP_WAITING
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              console.log('[SW] 新バージョンを適用しました。');
            }
          });
        });

        // controllerchange で自動リロード（SKIP_WAITING 後）
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          // draft があれば退避してからリロード
          var guard = window.ippoRecordDraftGuard;
          if (guard && typeof guard.saveDraft === 'function') guard.saveDraft();
          window.location.reload();
        });
      })
      .catch(function (err) {
        console.warn('[SW] 登録失敗:', err);
      });
  });
}

// ─── Phase H5: InsightPacket → Retention 通知 ─────────────────
/**
 * InsightPacket を受け取り、翌朝の Retention 通知を1件スケジュールする。
 * @param {{ reason: object|null, prediction: object|null, action: object }} packet
 * @param {string} time — "HH:MM" 形式（省略時 "08:00"）
 */
export function scheduleInsightNotification(packet, time) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const body = _buildInsightNotificationBody(packet);
  if (!body) return;

  const parts  = (time || '08:00').split(':');
  const target = new Date();
  target.setHours(parseInt(parts[0]), parseInt(parts[1]), 0, 0);
  if (target <= new Date()) target.setDate(target.getDate() + 1);

  const delay = target.getTime() - Date.now();
  setTimeout(function () {
    new Notification('ippo — 今日の体調', {
      body,
      icon: 'images/icon-192.png',
      tag:  'ippo-insight',
    });
  }, delay);
}

function _buildInsightNotificationBody(packet) {
  if (!packet) return null;

  // 優先度: prediction → reason → action
  if (packet.prediction?.body) {
    const score = packet.prediction.body.match(/予測スコア\s*([\d.]+)/);
    if (score && parseFloat(score[1]) >= 6) {
      return '明日も体調に注意が必要かもしれません。ippo で確認しましょう。';
    }
  }

  if (packet.reason?.body && /悪化/.test(packet.reason.body)) {
    return '症状の変化が続いています。今日も記録を続けましょう。';
  }

  if (packet.action?.priority <= 3) {
    return packet.action.body;
  }

  return '今日の記録をつけて、体のパターンを把握しましょう。';
}

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.requestNotificationPermission  = requestNotificationPermission;
window.scheduleReminders              = scheduleReminders;
window.scheduleInsightNotification    = scheduleInsightNotification;
