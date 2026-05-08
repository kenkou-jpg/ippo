// ============================================================
//  ippo – src/modules/calendar.js
//  Phase 3-A: calendar モジュール分離
//
//  方針:
//  - app.html の calendar DOM ID は変更しない
//  - event listener は追加しない
//  - async 化しない
//  - window 互換を維持する
// ============================================================

let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function getState() {
  return window.state || {};
}

function getRecords() {
  const state = getState();
  return Array.isArray(state.records) ? state.records : [];
}

function getRecordDate(record) {
  return record && (record.date || record.record_date || record.created_at || '');
}

function getPainLevel(record) {
  if (!record) return null;
  if (record.painLevel !== undefined && record.painLevel !== null) return Number(record.painLevel);
  if (record.pain_level !== undefined && record.pain_level !== null) return Number(record.pain_level);
  if (record.condition_scale !== undefined && record.condition_scale !== null) return Number(record.condition_scale);
  return null;
}

function getDayClass(record) {
  if (!record) return '';
  const pain = getPainLevel(record);
  if (pain === null || Number.isNaN(pain)) return ' has-record';
  if (pain <= 1) return ' has-record pain-none';
  if (pain <= 3) return ' has-record pain-low';
  if (pain <= 6) return ' has-record pain-mid';
  if (pain <= 8) return ' has-record pain-high';
  return ' has-record pain-max';
}

export function buildCalendar() {
  const grid = document.getElementById('calGrid');
  const label = document.getElementById('calLabel');
  if (!grid || !label) return;

  const records = getRecords();
  const monthPrefix = calYear + '-' + String(calMonth + 1).padStart(2, '0');
  const recordsByDate = {};

  records.forEach(function(record) {
    const date = getRecordDate(record);
    if (date) recordsByDate[date.slice(0, 10)] = record;
  });

  label.textContent = calYear + '年 ' + (calMonth + 1) + '月';

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const today = new Date().toISOString().slice(0, 10);

  let html = '';

  for (let i = 0; i < startWeekday; i++) {
    html += '<div class="cal-day cal-empty"></div>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = monthPrefix + '-' + String(day).padStart(2, '0');
    const record = recordsByDate[dateStr];
    let cls = 'cal-day';
    if (dateStr === today) cls += ' today';
    cls += getDayClass(record);

    html += '<button type="button" class="' + cls + '" data-date="' + dateStr + '" onclick="window.openDayDetail && window.openDayDetail(\'' + dateStr + '\')">';
    html += '<span class="cal-day-num">' + day + '</span>';
    if (record) html += '<span class="cal-day-dot"></span>';
    html += '</button>';
  }

  grid.innerHTML = html;
}

export function renderCalendarMonthlySummary() {
  const el = document.getElementById('cal-monthly-summary');
  if (!el) return;

  const monthStr = calYear + '-' + String(calMonth + 1).padStart(2, '0');
  const recs = getRecords().filter(function(record) {
    const date = getRecordDate(record);
    return date && date.slice(0, 7) === monthStr;
  });

  const subLabel = document.getElementById('cal-screen-month-label');
  if (subLabel) subLabel.textContent = calYear + '年 ' + (calMonth + 1) + '月 — ' + recs.length + '件の記録';

  if (recs.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--ink-light);font-size:12px;padding:8px 0;">' + calYear + '年' + (calMonth + 1) + '月の記録はまだありません</div>';
    return;
  }

  let painTotal = 0;
  let painCount = 0;
  const symptomMap = {};

  recs.forEach(function(record) {
    const pain = getPainLevel(record);
    if (pain !== null && !Number.isNaN(pain)) {
      painTotal += pain;
      painCount++;
    }
    if (Array.isArray(record.symptoms)) {
      record.symptoms.forEach(function(symptom) {
        symptomMap[symptom] = (symptomMap[symptom] || 0) + 1;
      });
    }
  });

  const avgPain = painCount > 0 ? (painTotal / painCount).toFixed(1) : '—';
  const topSymptoms = Object.keys(symptomMap).sort(function(a, b) {
    return symptomMap[b] - symptomMap[a];
  }).slice(0, 3);

  let html = '<div style="display:flex;gap:16px;margin-bottom:10px;">';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + recs.length + '</div><div style="font-size:10px;color:var(--ink-light);">記録日数</div></div>';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + avgPain + '</div><div style="font-size:10px;color:var(--ink-light);">平均痛みレベル</div></div>';
  html += '</div>';

  if (topSymptoms.length > 0) {
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:6px;">多かった症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    topSymptoms.forEach(function(symptom) {
      html += '<span style="background:var(--rose-pale);color:var(--rose-dark);border-radius:20px;padding:3px 10px;font-size:11px;">' + symptom + ' <span style="opacity:0.6;">×' + symptomMap[symptom] + '</span></span>';
    });
    html += '</div>';
  }

  el.innerHTML = html;
}

export function changeMonth(delta) {
  calMonth += delta;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0) { calMonth = 11; calYear--; }
  buildCalendar();
  renderCalendarMonthlySummary();
}

// window 互換維持
window.buildCalendar = buildCalendar;
window.changeMonth = changeMonth;
window.renderCalendarMonthlySummary = renderCalendarMonthlySummary;
window.calYear = calYear;
window.calMonth = calMonth;
