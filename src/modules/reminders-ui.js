// ============================================================
//  ippo – src/modules/reminders-ui.js
//  Priority 8 (Step 8-2): リマインダーUI関数群を app.html から移植
//  requestNotificationPermission / scheduleReminders は push.js で管理
// ============================================================

export var REMINDER_PRESETS = [
  { time: '07:00', label: '🌅 朝の基礎体温' },
  { time: '12:00', label: '☀️ お昼の体調チェック' },
  { time: '21:00', label: '🌙 今日の記録' },
];

export function initReminders() {
  if (!window.state.reminders) window.state.reminders = [];
  renderReminderList();
  if (typeof window.scheduleReminders === 'function') window.scheduleReminders();
}

export function renderReminderList() {
  var container = document.getElementById('reminder-list');
  if (!container) return;
  var reminders = window.state.reminders || [];
  var maxFree = 3;

  if (reminders.length === 0) {
    var html = '<div style="margin-bottom:8px;">';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:8px;">おすすめプリセット</div>';
    REMINDER_PRESETS.forEach(function (p, idx) {
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0ebe6;">';
      html += '<div style="display:flex;align-items:center;gap:8px;">';
      html += '<span style="font-size:12px;">' + p.label + '</span>';
      html += '<span style="font-size:11px;color:var(--ink-light);">' + p.time + '</span>';
      html += '</div>';
      html += '<button onclick="addPresetReminder(' + idx + ')" style="padding:5px 12px;background:var(--rose);color:white;border:none;border-radius:8px;font-size:10px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">追加</button>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
    return;
  }

  var html = '';
  reminders.forEach(function (r, idx) {
    html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0ebe6;">';
    html += '<div style="display:flex;align-items:center;gap:10px;">';
    html += '<div style="width:36px;height:36px;border-radius:50%;background:' + (r.enabled ? 'var(--sage-light)' : '#f0ebe6') + ';display:flex;align-items:center;justify-content:center;font-size:14px;">' + (r.enabled ? '🔔' : '🔕') + '</div>';
    html += '<div>';
    html += '<div style="font-size:13px;color:var(--ink);font-weight:500;">' + r.time + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">' + r.label + '</div>';
    html += '</div></div>';
    html += '<div style="display:flex;align-items:center;gap:6px;">';
    html += '<button onclick="toggleReminder(' + idx + ')" style="padding:4px 10px;background:' + (r.enabled ? 'var(--sage-light)' : '#f0ebe6') + ';color:' + (r.enabled ? 'var(--sage)' : 'var(--ink-light)') + ';border:none;border-radius:6px;font-size:10px;cursor:pointer;font-family:Noto Sans JP,sans-serif;">' + (r.enabled ? 'ON' : 'OFF') + '</button>';
    html += '<button onclick="removeReminder(' + idx + ')" style="padding:4px 8px;background:transparent;color:var(--ink-light);border:none;font-size:14px;cursor:pointer;">✕</button>';
    html += '</div></div>';
  });

  if (!window.state.isPremium && reminders.length >= maxFree) {
    html += '<div style="text-align:center;padding:10px;font-size:10px;color:var(--ink-light);margin-top:8px;">無料プランは' + maxFree + '件まで。<span style="color:var(--rose);cursor:pointer;" onclick="switchTab(\'premium\')">PRO</span>で無制限に。</div>';
  }

  container.innerHTML = html;
}

export function addPresetReminder(idx) {
  var p = REMINDER_PRESETS[idx];
  if (!window.state.reminders) window.state.reminders = [];
  window.state.reminders.push({ time: p.time, label: p.label, enabled: true });
  if (typeof window.saveState === 'function') window.saveState();
  renderReminderList();
  if (typeof window.requestNotificationPermission === 'function') window.requestNotificationPermission();
  if (typeof window.scheduleReminders === 'function') window.scheduleReminders();
}

export function addReminder() {
  if (!window.state.reminders) window.state.reminders = [];
  var maxFree = 3;
  if (!window.state.isPremium && window.state.reminders.length >= maxFree) {
    if (typeof window.premiumGate === 'function') window.premiumGate(addReminderUI);
    return;
  }
  addReminderUI();
}

export function addReminderUI() {
  var time = prompt('リマインダーの時間を入力（例: 21:00）', '21:00');
  if (!time) return;
  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    if (typeof window.showAlertModal === 'function') window.showAlertModal('時間の形式が正しくありません（例: 21:00）');
    return;
  }
  var label = prompt('ラベルを入力（例: 今日の記録）', '今日の記録');
  if (label === null) return;
  if (!window.state.reminders) window.state.reminders = [];
  window.state.reminders.push({ time: time, label: label || '記録リマインダー', enabled: true });
  window.state.reminders.sort(function (a, b) { return a.time.localeCompare(b.time); });
  if (typeof window.saveState === 'function') window.saveState();
  renderReminderList();
  if (typeof window.requestNotificationPermission === 'function') window.requestNotificationPermission();
  if (typeof window.scheduleReminders === 'function') window.scheduleReminders();
}

export function toggleReminder(idx) {
  window.state.reminders[idx].enabled = !window.state.reminders[idx].enabled;
  if (typeof window.saveState === 'function') window.saveState();
  renderReminderList();
  if (typeof window.scheduleReminders === 'function') window.scheduleReminders();
}

export function removeReminder(idx) {
  window.state.reminders.splice(idx, 1);
  if (typeof window.saveState === 'function') window.saveState();
  renderReminderList();
  if (typeof window.scheduleReminders === 'function') window.scheduleReminders();
}

// ─── window 互換 ──────────────────────────────────────────────
window.REMINDER_PRESETS   = REMINDER_PRESETS;
window.initReminders      = initReminders;
window.renderReminderList = renderReminderList;
window.addPresetReminder  = addPresetReminder;
window.addReminder        = addReminder;
window.addReminderUI      = addReminderUI;
window.toggleReminder     = toggleReminder;
window.removeReminder     = removeReminder;
