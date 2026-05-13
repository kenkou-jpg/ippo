// ============================================================
//  ippo – src/modules/calendar.js
//  Priority 8 (Step 8-2): buildCalendar / openDayDetail 等を
//  app.html から移植
// ============================================================

// ─── カレンダー状態 ─────────────────────────────────────────
var _now = new Date();
export var calYear  = _now.getFullYear();
export var calMonth = _now.getMonth();
// window 互換（他モジュール・onclick から参照するため）
window.calYear  = calYear;
window.calMonth = calMonth;

// ─── calYear/calMonth の変更をすべて window.* 経由に統一するヘルパー ─
function _setCalMonth(m) { calMonth = m; window.calMonth = m; }
function _setCalYear(y)  { calYear  = y; window.calYear  = y; }

// ─── buildCalendar ───────────────────────────────────────────
export function buildCalendar() {
  var label = document.getElementById('calLabel');
  var grid  = document.getElementById('calGrid');
  if (!label || !grid) return;
  var cy = window.calYear !== undefined ? window.calYear : calYear;
  var cm = window.calMonth !== undefined ? window.calMonth : calMonth;
  label.textContent = cy + '年 ' + (cm + 1) + '月';
  grid.innerHTML = '';
  var firstDow   = new Date(cy, cm, 1).getDay();
  var daysInMonth = new Date(cy, cm + 1, 0).getDate();
  var today = new Date();
  var st = window.state || {};
  for (var e = 0; e < firstDow; e++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }
  for (var d = 1; d <= daysInMonth; d++) {
    var el = document.createElement('div');
    el.className = 'cal-day';
    var isToday = d === today.getDate() && cm === today.getMonth() && cy === today.getFullYear();
    if (isToday) el.classList.add('today');
    var ds     = new Date(cy, cm, d).toDateString();
    var localDs = cy + '-' + String(cm + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var records = st.records || [];
    var hasRec = records.some(function (r) {
      return (r.date && new Date(r.date).toDateString() === ds) || (r.record_date && r.record_date.slice(0, 10) === localDs);
    });
    if (hasRec) el.classList.add('has-record');
    if (hasRec) {
      var rec = records.find(function (r) {
        return (r.date && new Date(r.date).toDateString() === ds) || (r.record_date && r.record_date.slice(0, 10) === localDs);
      });
      if (rec) {
        var pain = rec.painLevel;
        if (pain !== null && pain !== undefined && pain >= 0) {
          el.classList.add('pain-' + Math.min(pain, 4));
        } else {
          el.classList.add('has-record-no-pain');
        }
      }
    }
    el.textContent = d;
    el.addEventListener('click', (function (day) { return function () { openDayDetail(day); }; })(d));
    grid.appendChild(el);
  }
}

// ─── renderCalendarMonthlySummary ────────────────────────────
export function renderCalendarMonthlySummary() {
  var el = document.getElementById('cal-monthly-summary');
  if (!el) return;
  var cy = window.calYear !== undefined ? window.calYear : calYear;
  var cm = window.calMonth !== undefined ? window.calMonth : calMonth;
  var monthStr = cy + '-' + String(cm + 1).padStart(2, '0');
  var st = window.state || {};
  var records = st.records || [];
  var recs = records.filter(function (r) {
    return (r.date && r.date.slice(0, 7) === monthStr) ||
           (r.record_date && r.record_date.slice(0, 7) === monthStr);
  });
  if (recs.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--ink-light);font-size:12px;padding:8px 0;">' + cy + '年' + (cm + 1) + '月の記録はまだありません</div>';
    return;
  }
  var painTotal = 0, painCount = 0, symptomMap = {};
  recs.forEach(function (r) {
    if (r.painLevel !== null && r.painLevel !== undefined) { painTotal += r.painLevel; painCount++; }
    if (r.symptoms) r.symptoms.forEach(function (s) { symptomMap[s] = (symptomMap[s] || 0) + 1; });
  });
  var avgPain = painCount > 0 ? (painTotal / painCount).toFixed(1) : '—';
  var topSymptoms = Object.keys(symptomMap).sort(function (a, b) { return symptomMap[b] - symptomMap[a]; }).slice(0, 3);
  var html = '<div style="display:flex;gap:16px;margin-bottom:10px;">';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + recs.length + '</div><div style="font-size:10px;color:var(--ink-light);">記録日数</div></div>';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + avgPain + '</div><div style="font-size:10px;color:var(--ink-light);">平均痛みレベル</div></div>';
  html += '</div>';
  if (topSymptoms.length > 0) {
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:6px;">多かった症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    topSymptoms.forEach(function (s) {
      html += '<span style="background:var(--rose-pale);color:var(--rose-dark);border-radius:20px;padding:3px 10px;font-size:11px;">' + s + ' <span style="opacity:0.6;">×' + symptomMap[s] + '</span></span>';
    });
    html += '</div>';
  }
  var subLabel = document.getElementById('cal-screen-month-label');
  if (subLabel) subLabel.textContent = cy + '年 ' + (cm + 1) + '月 — ' + recs.length + '件の記録';
  el.innerHTML = html;
}

// ─── changeMonth ─────────────────────────────────────────────
export function changeMonth(delta) {
  var cm = window.calMonth !== undefined ? window.calMonth : calMonth;
  var cy = window.calYear  !== undefined ? window.calYear  : calYear;
  cm += delta;
  if (cm > 11) { cm = 0; cy++; }
  if (cm < 0)  { cm = 11; cy--; }
  _setCalMonth(cm);
  _setCalYear(cy);
  buildCalendar();
  renderCalendarMonthlySummary();
}

// ─── openDayDetail ───────────────────────────────────────────
export function openDayDetail(d) {
  var WDAY = ['日', '月', '火', '水', '木', '金', '土'];
  var cy = window.calYear !== undefined ? window.calYear : calYear;
  var cm = window.calMonth !== undefined ? window.calMonth : calMonth;
  var dateObj = new Date(cy, cm, d);
  var ds = dateObj.toDateString();
  var w  = dateObj.getDay();
  var isoDateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
  var st = window.state || {};
  var records = st.records || [];
  var recs = records.filter(function (r) { return new Date(r.date).toDateString() === ds; });
  document.getElementById('dmDate').textContent = cy + '年' + (cm + 1) + '月' + d + '日（' + WDAY[w] + '）';
  var body = document.getElementById('dmBody');
  if (recs.length === 0) {
    var emptyHtml = '<div class="dm-empty">この日の記録はありません</div>';
    emptyHtml += '<div style="margin-top:16px;padding:0 4px;">';
    emptyHtml += '<button onclick="editPastRecord(\'' + isoDateStr + '\')" style="width:100%;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">✏️ この日の記録を作成する</button>';
    emptyHtml += '</div>';
    body.innerHTML = emptyHtml;
    document.getElementById('dmOverlay').classList.add('dm-open');
    return;
  }
  var rec = recs[recs.length - 1];
  var html = '';
  var tags = [];
  if (rec.wellness) tags.push('体調 ' + rec.wellness + '/5');
  if (rec.foodScore) tags.push('食事 ' + rec.foodScore + '/10');
  if (rec.fasting) tags.push('修復 ' + rec.fasting + 'h');
  if (rec.emotion) tags.push(rec.emotion);
  if (rec.symptoms && rec.symptoms.length) tags.push(rec.symptoms.join('・'));
  if (rec.menstrualCycle && rec.menstrualCycle !== 'なし') tags.push('生理: ' + rec.menstrualCycle);
  if (tags.length) {
    html += '<div class="dm-record-tags">';
    tags.forEach(function (t) { html += '<span class="dm-tag">' + t + '</span>'; });
    html += '</div>';
  }

  if (rec.mealFree || (rec.meals && rec.meals.free)) {
    var freeText = rec.mealFree || rec.meals.free;
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
    html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.9;white-space:pre-wrap;">' + (typeof window.escapeHtml === 'function' ? window.escapeHtml(freeText) : freeText) + '</div>';
    if (rec.mealCount || rec.firstMealTime) {
      html += '<div style="display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe6;">';
      if (rec.mealCount) html += '<span style="font-size:11px;color:var(--ink-light);">🍽 ' + rec.mealCount + '食</span>';
      if (rec.firstMealTime && rec.lastMealTime) html += '<span style="font-size:11px;color:var(--ink-light);">⏰ ' + rec.firstMealTime + '〜' + rec.lastMealTime + '</span>';
      if (rec.fasting) html += '<span style="font-size:11px;color:var(--ink-light);">🌙 修復 ' + rec.fasting + 'h</span>';
      html += '</div>';
    }
    html += '</div>';
  } else if (rec.meals) {
    var m = rec.meals;
    var mealRows = [];
    if (m.morning) mealRows.push({ icon: '🌅', label: '朝食', text: m.morning, time: m.morningTime || '' });
    if (m.lunch)   mealRows.push({ icon: '☀️', label: '昼食', text: m.lunch,   time: m.lunchTime || '' });
    if (m.dinner)  mealRows.push({ icon: '🌙', label: '夕食', text: m.dinner,  time: m.dinnerTime || '' });
    if (m.snack)   mealRows.push({ icon: '🍪', label: '間食', text: m.snack,   time: m.snackTime || '' });
    if (mealRows.length) {
      html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
      html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
      for (var mi = 0; mi < mealRows.length; mi++) {
        var mr = mealRows[mi];
        var esc = typeof window.escapeHtml === 'function' ? window.escapeHtml(mr.text) : mr.text;
        html += '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:' + (mi < mealRows.length - 1 ? '10px' : '0') + ';padding-bottom:' + (mi < mealRows.length - 1 ? '10px' : '0') + ';border-bottom:' + (mi < mealRows.length - 1 ? '1px solid #f0ebe6' : 'none') + ';">';
        html += '<span style="font-size:18px;flex-shrink:0;margin-top:2px;">' + mr.icon + '</span>';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-size:12px;font-weight:500;color:var(--ink);">' + mr.label + '</span>';
        if (mr.time) html += '<span style="font-size:10px;color:var(--ink-light);">' + mr.time + '</span>';
        html += '</div>';
        html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.7;margin-top:3px;">' + esc + '</div>';
        html += '</div></div>';
      }
      html += '</div>';
    }
  }

  if (rec.fasting) {
    var fGoal   = rec.fastingGoal || 16;
    var fHours  = parseFloat(rec.fasting) || 0;
    var fPct    = Math.min(fHours / fGoal, 1);
    var fR      = 28, fC = 2 * Math.PI * fR;
    var fOffset = fC - (fC * fPct);
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#f9edd8,#fff0f0);border-radius:14px;padding:16px;color:var(--ink);">';
    html += '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:8px;">FASTING</div>';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<div style="position:relative;width:64px;height:64px;flex-shrink:0;">';
    html += '<svg viewBox="0 0 64 64" style="width:100%;height:100%;transform:rotate(-90deg);">';
    html += '<circle cx="32" cy="32" r="' + fR + '" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    html += '<circle cx="32" cy="32" r="' + fR + '" fill="none" stroke="' + (fPct >= 1 ? '#8aab96' : '#e8c49a') + '" stroke-width="5" stroke-dasharray="' + fC + '" stroke-dashoffset="' + fOffset + '" stroke-linecap="round"/>';
    html += '</svg>';
    html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:16px;font-weight:700;color:var(--ink);">' + fHours + '</div>';
    html += '<div style="font-size:7px;color:var(--ink-light);letter-spacing:0.1em;">時間</div>';
    html += '</div></div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:15px;margin-bottom:4px;color:var(--ink);">' + fHours + '時間のファスティング</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);">目標 ' + fGoal + '時間' + (fPct >= 1 ? ' ✓ 達成' : '') + '</div>';
    html += '</div></div></div>';
  }

  var extras = [];
  if (rec.temperature) extras.push('🌡 ' + rec.temperature + '℃');
  if (rec.menstrualCycle && rec.menstrualCycle !== 'なし') extras.push('🌸 ' + rec.menstrualCycle);
  if (rec.symptoms && rec.symptoms.length) extras.push(rec.symptoms.join('・'));
  if (rec.painLevel && rec.painLevel > 0) {
    var painText = '痛み ' + rec.painLevel + '/10';
    if (rec.painLocation && rec.painLocation.length) painText += '（' + rec.painLocation.join('・') + '）';
    if (rec.painType && rec.painType.length) painText += ' ' + rec.painType.join('・');
    extras.push('🔴 ' + painText);
  }
  if (rec.medication && rec.medication.length) extras.push('💊 ' + rec.medication.join('・'));
  if (rec.bloodClot && rec.bloodClot.length) extras.push('🩸 ' + rec.bloodClot.join('・'));
  if (rec.bloodColor && rec.bloodColor.length) extras.push(rec.bloodColor.join('・'));
  if (extras.length) {
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">生理・症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    extras.forEach(function (e) { html += '<span style="font-size:11px;background:var(--warm-light);color:var(--ink-mid);padding:4px 10px;border-radius:12px;">' + e + '</span>'; });
    html += '</div></div>';
  }

  if (rec.diseaseCheck && Object.keys(rec.diseaseCheck).length) {
    var dc = rec.diseaseCheck;
    var _fbDisease = (rec.diseases && rec.diseases[0]) || (st.myDiseases && st.myDiseases[0]) || '';
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">セルフチェック</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    Object.keys(dc).forEach(function (key) {
      if (!dc[key] || dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey  = parts.length > 1 ? parts[0] : _fbDisease;
      var qId   = parts.length > 1 ? parts[1] : key;
      var qCfg  = typeof DISEASE_CONFIG !== 'undefined' ? DISEASE_CONFIG[dKey] : null;
      var label = qId;
      if (qCfg && qCfg.questions) {
        for (var qi = 0; qi < qCfg.questions.length; qi++) {
          if (qCfg.questions[qi].id === qId) { label = qCfg.questions[qi].text.replace('？', ''); break; }
        }
      }
      html += '<span style="font-size:11px;background:#f3f0fd;color:#6b5b8a;padding:4px 10px;border-radius:12px;">' + label + ': ' + dc[key] + '</span>';
    });
    html += '</div></div>';
  }

  var lifeItems = [];
  if (rec.energy) lifeItems.push({ label: 'エネルギー', val: rec.energy + '/5 ' + '●'.repeat(rec.energy) + '○'.repeat(5 - rec.energy) });
  if (rec.sleepBed || rec.sleepWake) {
    var sleepStr = '';
    if (rec.sleepBed) sleepStr += '就寝 ' + rec.sleepBed;
    if (rec.sleepWake) sleepStr += (sleepStr ? ' / ' : '') + '起床 ' + rec.sleepWake;
    if (rec.sleepQuality) sleepStr += ' ／ 質' + rec.sleepQuality + '/5';
    lifeItems.push({ label: '睡眠', val: sleepStr });
  }
  if (rec.bowel) lifeItems.push({ label: 'お通じ', val: rec.bowel });
  if (rec.factors && rec.factors.length) lifeItems.push({ label: '生活', val: rec.factors.join('・') });
  if (lifeItems.length) {
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">ライフスタイル</div>';
    lifeItems.forEach(function (item) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f5f0eb;">';
      html += '<span style="font-size:11px;color:var(--ink-light);">' + item.label + '</span>';
      html += '<span style="font-size:12px;color:var(--ink-mid);">' + item.val + '</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  var memoItems = [];
  if (rec.temperature && extras.indexOf('🌡 ' + rec.temperature + '℃') === -1) memoItems.push({ icon: '🌡', text: '基礎体温 ' + rec.temperature + '℃' });
  if (rec.note) memoItems.push({ icon: '📝', text: rec.note });
  if (memoItems.length) {
    html += '<div style="margin-top:14px;background:var(--rose-pale);border-radius:14px;padding:14px;border-left:3px solid var(--rose);">';
    html += '<div style="font-size:10px;color:var(--rose);letter-spacing:0.15em;margin-bottom:8px;">MEMO</div>';
    for (var ni = 0; ni < memoItems.length; ni++) {
      var memoItem = memoItems[ni];
      var esc2 = typeof window.escapeHtml === 'function' ? window.escapeHtml(memoItem.text) : memoItem.text;
      if (ni > 0) html += '<div style="border-top:1px solid var(--rose-light);margin:8px 0;"></div>';
      html += '<div style="display:flex;align-items:flex-start;gap:8px;">';
      html += '<span style="font-size:14px;flex-shrink:0;">' + memoItem.icon + '</span>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.8;">' + esc2.replace(/\n/g, '<br>') + '</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  if (rec.wellnessScore !== undefined) {
    var ws = rec.wellnessScore;
    var wsColor = ws >= 70 ? '#6b9e78' : ws >= 40 ? '#d4a574' : '#c4878c';
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#faf6f2,#f0ebe6);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;">';
    html += '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">';
    html += '<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    var pct = ws / 100, circ = 2 * Math.PI * 24;
    html += '<circle cx="28" cy="28" r="24" fill="none" stroke="' + wsColor + '" stroke-width="5" stroke-dasharray="' + Math.round(circ * pct) + ' ' + Math.round(circ * (1 - pct)) + '" stroke-linecap="round" transform="rotate(-90 28 28)"/>';
    html += '</svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-size:16px;font-weight:700;color:' + wsColor + ';">' + ws + '</div></div>';
    html += '<div><div style="font-size:12px;font-weight:500;color:var(--ink);">ウェルネススコア</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-top:2px;">' + (ws >= 70 ? '良好な状態です' : ws >= 40 ? 'まずまずの状態です' : '少し注意が必要です') + '</div></div></div>';
  }

  html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0ebe6;">';
  html += '<button onclick="editPastRecord(\'' + isoDateStr + '\')" style="width:100%;padding:14px;background:var(--ink);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;">';
  html += '<span style="font-size:16px;">✏️</span> この日の記録を編集する</button>';
  html += '</div>';

  body.innerHTML = html;
  document.getElementById('dmOverlay').classList.add('dm-open');
}

// ─── prefillRecordFromModal ───────────────────────────────────
export function prefillRecordFromModal() {
  var today = new Date().toISOString().slice(0, 10);
  var st = window.state || {};
  var rec = (st.records || []).find(function (r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  if (!rec) return;
  if (rec.symptoms && rec.symptoms.length > 0) {
    document.querySelectorAll('#rs-symptoms .chip').forEach(function (chip) {
      if (rec.symptoms.indexOf(chip.textContent.trim()) !== -1) chip.classList.add('selected');
    });
  }
  if (rec.painLevel !== null && rec.painLevel !== undefined) {
    var painSlider  = document.getElementById('rs-pain-level');
    var painDisplay = document.getElementById('pain-level-display');
    if (painSlider)  painSlider.value = rec.painLevel;
    if (painDisplay) painDisplay.textContent = rec.painLevel;
  }
}

// ─── toggleHomeCalendar ──────────────────────────────────────
export function toggleHomeCalendar() {
  var panel = document.getElementById('home-calendar-panel');
  var arrow = document.getElementById('home-cal-arrow');
  var btn   = document.getElementById('home-cal-toggle');
  if (!panel) return;
  var isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.textContent = isOpen ? '▾' : '▴';
  if (btn)   btn.setAttribute('aria-expanded', String(!isOpen));
  if (!isOpen && typeof window.renderCalendar === 'function') window.renderCalendar();
}

// ─── calPrev / calNext / dmClose / dmOverlay はapp-legacy.js の
//     DOMContentLoaded ハンドラで登録される（重複防止）

// ─── window 互換 ──────────────────────────────────────────────
window.buildCalendar                 = buildCalendar;
window.renderCalendarMonthlySummary  = renderCalendarMonthlySummary;
window.changeMonth                   = changeMonth;
window.openDayDetail                 = openDayDetail;
window.prefillRecordFromModal        = prefillRecordFromModal;
window.toggleHomeCalendar            = toggleHomeCalendar;
