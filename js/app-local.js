/* ── Chart.js ダークテーマ設定 ── */
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = 'rgba(232,228,240,0.55)';
  Chart.defaults.borderColor = 'rgba(255,255,255,0.08)';

  Chart.register({
    id: 'darkBackground',
    beforeDraw: function(chart) {
      var ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = 'rgba(11,16,37,0.95)';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  });
}
/* ============================================================
   ippo App — Local Storage Version
   GitHub Pages 用（バックエンド不要）
   ============================================================ */
'use strict';

/* ── ユーティリティ ── */
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
function today() { return new Date().toISOString().slice(0, 10); }

function lsGet(key, def) {
  try { var v = localStorage.getItem('kk_' + key); return v ? JSON.parse(v) : (def || null); }
  catch(e) { return def || null; }
}
function lsSet(key, val) {
  try { localStorage.setItem('kk_' + key, JSON.stringify(val)); } catch(e) {}
}

function showToast(msg) {
  var t = $('#kk-toast') || $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show', 'toast-show');
  setTimeout(function() { t.classList.remove('show', 'toast-show'); }, 2500);
}

/* ── レコード操作 ── */
function getAllRecords() { return lsGet('records', []); }
function setAllRecords(arr) { lsSet('records', arr); }

function getTodayRecord() {
  var d = today();
  return getAllRecords().find(function(r) { return r.record_date === d; }) || null;
}

function saveRecordLocal(rec) {
  var all = getAllRecords();
  var idx = all.findIndex(function(r) { return r.record_date === rec.record_date; });
  if (idx >= 0) all[idx] = rec; else all.push(rec);
  setAllRecords(all);
}

function calcStreak() {
  var all = getAllRecords().map(function(r) { return r.record_date; }).sort().reverse();
  if (all.length === 0) return 0;
  var streak = 0;
  var d = new Date();
  for (var i = 0; i < 400; i++) {
    var ds = d.toISOString().slice(0, 10);
    if (all.indexOf(ds) >= 0) { streak++; }
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/* ── 季節・時間帯 ── */
function getSeason() {
  var m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function getTimeGreeting() {
  var h = new Date().getHours();
  if (h < 6) return 'おやすみなさい';
  if (h < 11) return 'おはようございます';
  if (h < 17) return 'こんにちは';
  if (h < 21) return 'こんばんは';
  return 'おつかれさまです';
}

var SEASON_MSG = {
  spring: '春は新しい芽吹きの季節。根菜や発酵食品でからだをグランディングさせましょう。',
  summer: '暑さでエネルギーを使いすぎていませんか？水分と塩分のバランスを意識しましょう。',
  autumn: '秋は手放しの季節。肺・大腸を整え、白い食材でからだに潤いを。',
  winter: '冬はからだを温める季節。骨盤まわりを温めて、生命エネルギーを蓄えましょう。'
};

/* ── 断食時間計算 ── */
function calcFasting(start, end) {
  var sp = (start || '20:00').split(':').map(Number);
  var ep = (end || '12:00').split(':').map(Number);
  var sm = sp[0] * 60 + sp[1];
  var em = ep[0] * 60 + ep[1];
  if (em <= sm) em += 1440;
  var total = em - sm;
  return { hours: Math.floor(total / 60), minutes: total % 60, total: total };
}

/* ══════════════════════════════════════════════
   画面遷移
   ══════════════════════════════════════════════ */
function showScreen(name) {

  $$('.app-screen').forEach(function(s) { s.classList.remove('active'); });
  var target = $('#screen-' + name);
  if (target) target.classList.add('active');


  $$('.nav-item').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });

  var fab = $('#homeRecordFab');
  if (fab) fab.style.display = (name === 'home') ? '' : 'none';

  if (name === 'home') renderHome();
  if (name === 'record') initRecordScreen();
  if (name === 'insight') renderInsight();
  if (name === 'settings') renderSettings();
}

/* ══════════════════════════════════════════════
   ウェルカム画面
   ══════════════════════════════════════════════ */
var welcomeSlide = 0;

function goToSlide(idx) {

  $$('.welcome-slide').forEach(function(s, i) {
    s.classList.remove('active', 'prev');
    if (i < idx) s.classList.add('prev');
    if (i === idx) s.classList.add('active');
  });
  welcomeSlide = idx;


  $$('.welcome-dot').forEach(function(d, i) {
    d.classList.toggle('active', i === idx);
  });
  var btn = $('#welcomeNextBtn');
  var skip = $('#welcomeSkipBtn');
  if (!btn) return;
  if (idx === 0) { btn.textContent = 'はじめる'; if (skip) skip.style.display = 'none'; }
  else if (idx < 3) { btn.textContent = '次へ →'; if (skip) { skip.style.display = 'block'; skip.textContent = 'スキップ'; } }
  else { btn.textContent = 'アプリを使い始める'; if (skip) skip.style.display = 'none'; }
}

function completeOnboarding() {
  var input = $('#welcomeNameInput');
  var name = (input && input.value.trim()) || 'あなた';
  lsSet('userName', name);
  lsSet('onboarded', true);
  lsSet('startedAt', today());
  var nav = $('#appNav');
  if (nav) nav.style.display = 'flex';
  showScreen('home');
}

/* ══════════════════════════════════════════════
   ホーム画面
   ══════════════════════════════════════════════ */
function renderHome() {
  var name = lsGet('userName', 'あなた');
  var records = getAllRecords();
  var streak = calcStreak();
  var todayRec = getTodayRecord();

  var dateEl = $('#homeDateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  var greetEl = $('#homeGreetingText');
  if (greetEl) greetEl.textContent = getTimeGreeting() + '、' + name + 'さん';

  var timeMsg = $('#homeTimeMsg');
  if (timeMsg) {
    var h = new Date().getHours();
    if (h >= 5 && h < 11) timeMsg.textContent = 'おはようございます。今日もからだの声に、耳を傾けてみましょう。';
    else if (h >= 11 && h < 17) timeMsg.textContent = 'こんにちは。今日のからだの調子は、いかがですか？';
    else if (h >= 17 && h < 22) timeMsg.textContent = 'おつかれさまです。今日一日の記録を、静かに振り返りましょう。';
    else timeMsg.textContent = '夜のひととき、今日のからだに"ありがとう"を。';
  }

  var msgEl = $('#homeGreetingMsg');
  if (msgEl) {
    if (todayRec) msgEl.textContent = '今日の記録が完了しています。インサイトで蓄積を確認してみましょう。';
    else if (streak > 0) msgEl.textContent = streak + '日連続記録中です。今日もからだの声を聴きましょう。';
    else msgEl.textContent = 'からだの記録を始めましょう。毎日少しずつが、大切な蓄積になります。';
  }

  var sqText = $('#seasonQuoteText');
  if (sqText) sqText.textContent = SEASON_MSG[getSeason()];

  var statStreak = $('#statStreak');
  var statTotal = $('#statTotal');
  var statFasting = $('#statFasting');
  if (statStreak) statStreak.textContent = streak;
  if (statTotal) statTotal.textContent = records.length;
  if (statFasting) {
    var wkFast = 0;
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    var cs = cutoff.toISOString().slice(0, 10);
    records.forEach(function(r) { if (r.record_date >= cs && r.fasting_hours) wkFast += r.fasting_hours; });
    statFasting.textContent = wkFast > 0 ? wkFast + 'h' : '—';
  }

  renderWeekCalendar(records);
  renderTodaySummary(todayRec);
  updateFab(todayRec);
}

function renderWeekCalendar(records) {
  var container = $('#weekCalendar');
  if (!container) return;
  var days = ['日','月','火','水','木','金','土'];
  var todayD = new Date();
  var html = '';
  for (var i = 6; i >= 0; i--) {
    var d = new Date(todayD); d.setDate(d.getDate() - i);
    var ds = d.toISOString().slice(0, 10);
    var has = records.some(function(r) { return r.record_date === ds; });
    var cls = 'week-day' + (has ? ' recorded' : '') + (i === 0 ? ' today' : '');
    html += '<div class="' + cls + '"><span class="week-day-label">' + days[d.getDay()] +
      '</span><div class="week-day-circle">' + d.getDate() + '</div><div class="week-day-dot"></div></div>';
  }
  container.innerHTML = html;
}

function renderTodaySummary(rec) {
  var emptyEl = $('#todayEmptyState');
  var recordedEl = $('#todayRecordedState');
  if (!emptyEl || !recordedEl) return;
  if (!rec) { emptyEl.style.display = 'block'; recordedEl.style.display = 'none'; return; }
  emptyEl.style.display = 'none';
  recordedEl.style.display = 'block';
  var rowsEl = $('#todayLogRows');
  if (!rowsEl) return;
  var CHAKRA_NAMES = { root:'第1チャクラ', sacral:'第2チャクラ', solar:'第3チャクラ', heart:'第4チャクラ', throat:'第5チャクラ', third_eye:'第6チャクラ' };
  var EMO_NAMES = { peaceful:'穏やか', happy:'うれしい', tired:'疲れ', anxious:'不安', irritated:'イライラ' };
  var rows = '';
  if (rec.chakra) rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-chakra">ch</div><div><div class="home-today-item-label">チャクラ</div><div class="home-today-item-value">' + (CHAKRA_NAMES[rec.chakra] || rec.chakra) + '</div></div></div>';
   if (rec.meals) {
    var MEAL_LABELS = { morning: '朝', lunch: '昼', dinner: '夕', snack: '間食' };
    Object.keys(rec.meals).forEach(function(key) {
      var meal = rec.meals[key];
      if (meal && meal.content) {
        rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-food">fo</div><div><div class="home-today-item-label">' + (MEAL_LABELS[key] || key) + '</div><div class="home-today-item-value">' + meal.content.slice(0, 20) + '</div></div></div>';
      }
    });
  } else if (rec.food_content) {
    rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-food">fo</div><div><div class="home-today-item-label">食事</div><div class="home-today-item-value">' + rec.food_content.slice(0, 20) + '</div></div></div>';
  }
if (rec.fasting_hours) rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-fasting">fa</div><div><div class="home-today-item-label">断食</div><div class="home-today-item-value">' + rec.fasting_hours + 'h ' + (rec.fasting_minutes || 0) + 'm</div></div></div>';
  if (rec.emotion) rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-emotion">em</div><div><div class="home-today-item-label">感情</div><div class="home-today-item-value">' + (EMO_NAMES[rec.emotion] || rec.emotion) + '</div></div></div>';
  rowsEl.innerHTML = rows;
}

function updateFab(todayRec) {
  var fab = $('#fabRecordBtn');
  if (!fab) return;
  if (todayRec) {
    fab.classList.add('recorded');
    fab.textContent = '✓ 今日の記録済み';
  } else {
    fab.classList.remove('recorded');
    fab.textContent = '今日を記録する';
  }
}

/* ══════════════════════════════════════════════
   記録画面
   ══════════════════════════════════════════════ */
function initRecordScreen() {
  var dateEl = $('#recordDateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  activateTab('chakra');
  var rec = getTodayRecord();
  if (rec) loadRecordToFields(rec);
}

function activateTab(tabName) {

  $$('.record-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  $$('.record-panel').forEach(function(p) {
    var isTarget = p.id === 'panel-' + tabName;
    p.classList.toggle('active', isTarget);
    p.style.display = isTarget ? 'block' : 'none';
  });
}

function loadRecordToFields(rec) {
  if (rec.chakra) {

    $$('.chakra-item').forEach(function(el) { el.classList.toggle('selected', el.dataset.chakra === rec.chakra); });

    $$('.chakra-visual-item').forEach(function(el) { el.classList.toggle('selected', el.dataset.chakra === rec.chakra); });
  }
  if (rec.symptoms && rec.symptoms.length) {
    rec.symptoms.forEach(function(v) { var chip = $('[data-val="' + v + '"]', $('#symptomChips')); if (chip) chip.classList.add('selected'); });
  }
  // FIX: data-scale（data-valではない）
  if (rec.condition_scale) {

    $$('.condition-scale-btn').forEach(function(b) { b.classList.toggle('selected', b.dataset.scale === String(rec.condition_scale)); });
  }
  if (rec.basal_temp) { var bt = $('#basalTemp'); if (bt) bt.value = rec.basal_temp; }
  // FIX: 月経周期チップ
  if (rec.cycle_phase) {

    $$('#menstrualCycleChips .chip').forEach(function(c) { c.classList.toggle('selected', c.dataset.val === rec.cycle_phase); });
  }
  if (rec.rhythm_memo) { var rm = $('#rhythmNote'); if (rm) rm.value = rec.rhythm_memo; }
  if (rec.food_time) {

    $$('.food-time-card').forEach(function(c) { c.classList.toggle('selected', c.dataset.time === rec.food_time); });
  }
  if (rec.food_content) { var fc = $('#foodContent'); if (fc) fc.value = rec.food_content; }
  if (rec.body_feel && rec.body_feel.length) {
    rec.body_feel.forEach(function(v) { var chip = $('[data-val="' + v + '"]', $('#bodyFeelChips')); if (chip) chip.classList.add('selected'); });
  }
  if (rec.food_ingredients && rec.food_ingredients.length) {
    rec.food_ingredients.forEach(function(v) { var chip = $('[data-val="' + v + '"]', $('#foodIngredientChips')); if (chip) chip.classList.add('selected'); });
  }
  if (rec.food_score) {
    var fs = $('#foodScore'); if (fs) { fs.value = rec.food_score; updateRangeGrad(fs); }
    var fsd = $('#foodScoreDisplay'); if (fsd) fsd.textContent = rec.food_score;
  }
  if (rec.food_notes) { var fn = $('#foodNote'); if (fn) fn.value = rec.food_notes; }
  if (rec.fasting_start) { var fst = $('#fastingStartTime'); if (fst) fst.value = rec.fasting_start; }
  if (rec.fasting_end) { var fen = $('#fastingEndTime'); if (fen) fen.value = rec.fasting_end; }
  if (rec.fasting_goal_hours) {

    $$('.fasting-goal-btn').forEach(function(b) { b.classList.toggle('selected', parseInt(b.dataset.hours) === parseInt(rec.fasting_goal_hours)); });
  }
  if (rec.fasting_feel && rec.fasting_feel.length) {
    rec.fasting_feel.forEach(function(v) { var chip = $('[data-val="' + v + '"]', $('#fastingFeelChips')); if (chip) chip.classList.add('selected'); });
  }
  if (rec.fasting_score) {
    var fsc = $('#fastingScore'); if (fsc) { fsc.value = rec.fasting_score; updateRangeGrad(fsc); }
    var fscd = $('#fastingScoreDisplay'); if (fscd) fscd.textContent = rec.fasting_score;
  }
  if (rec.fasting_notes) { var fno = $('#fastingNote'); if (fno) fno.value = rec.fasting_notes; }
  if (rec.emotion) {

    $$('.emotion-item').forEach(function(el) { el.classList.toggle('selected', el.dataset.emotion === rec.emotion); });
  }
  if (rec.wellness_score) {
    var ws = $('#wellnessScore'); if (ws) { ws.value = rec.wellness_score; updateRangeGrad(ws); }
    var wsd = $('#wellnessScoreDisplay'); if (wsd) wsd.textContent = rec.wellness_score;
  }
  if (rec.energy_score) {
    var es = $('#energyScore'); if (es) { es.value = rec.energy_score; updateRangeGrad(es); }
    var esd = $('#energyScoreDisplay'); if (esd) esd.textContent = rec.energy_score;
  }
  if (rec.emotion_notes) { var en = $('#emotionNote'); if (en) en.value = rec.emotion_notes; }
  if (rec.gratitude) { var gr = $('#gratitudeNote'); if (gr) gr.value = rec.gratitude; }
  updateFastingDisplay();
}

function buildRecordFromUI() {
  var rec = { record_date: today() };
  var chakraEl = $('.chakra-item.selected') || $('.chakra-visual-item.selected');
  rec.chakra = chakraEl ? chakraEl.dataset.chakra : null;
  rec.symptoms = $$('#symptomChips .chip.selected').map(function(c) { return c.dataset.val; });
  // FIX: data-scale
  var condBtn = $('.condition-scale-btn.selected');
  rec.condition_scale = condBtn ? parseInt(condBtn.dataset.scale) : null;
  var btEl = $('#basalTemp'); rec.basal_temp = btEl ? btEl.value : '';
  // FIX: 月経周期
  var cycleEl = $('#menstrualCycleChips .chip.selected'); rec.cycle_phase = cycleEl ? cycleEl.dataset.val : null;
  var rmEl = $('#rhythmNote'); rec.rhythm_memo = rmEl ? rmEl.value.trim() : '';
  var ftEl = $('.food-time-card.selected');
  var currentTime = ftEl ? ftEl.dataset.time : 'other';
  var fcEl = $('#foodContent');
  var currentFood = fcEl ? fcEl.value.trim() : '';
  var existingRec = getTodayRecord();
  var meals = (existingRec && existingRec.meals) ? existingRec.meals : {};
  if (currentFood) {
    meals[currentTime] = {
      content: currentFood,
      body_feel: $$('#bodyFeelChips .body-feel-chip.selected').map(function(c) { return c.dataset.val; }),
      ingredients: $$('#foodIngredientChips .chip.selected').map(function(c) { return c.dataset.val; }),
      score: $('#foodScore') ? parseInt($('#foodScore').value) : 5,
      notes: $('#foodNote') ? $('#foodNote').value.trim() : ''
    };
  }
  rec.meals = meals;
  var allFoods = [];
  var MEAL_LABELS = { morning: '朝', lunch: '昼', dinner: '夕', snack: '間食' };
  Object.keys(meals).forEach(function(key) {
    if (meals[key].content) {
      allFoods.push((MEAL_LABELS[key] || key) + ':' + meals[key].content);
    }
  });
  rec.food_content = allFoods.join(' / ');
  rec.food_time = currentTime;
  rec.food_score = $('#foodScore') ? parseInt($('#foodScore').value) : 5;
  rec.food_notes = $('#foodNote') ? $('#foodNote').value.trim() : '';
  var fstEl = $('#fastingStartTime'); rec.fasting_start = fstEl ? fstEl.value : '20:00';
  var fenEl = $('#fastingEndTime'); rec.fasting_end = fenEl ? fenEl.value : '12:00';
  var goalBtn = $('.fasting-goal-btn.selected');
  rec.fasting_goal_hours = goalBtn ? parseInt(goalBtn.dataset.hours) : 14;
  var fasting = calcFasting(rec.fasting_start, rec.fasting_end);
  rec.fasting_hours = fasting.hours;
  rec.fasting_minutes = fasting.minutes;
  rec.fasting_feel = $$('#fastingFeelChips .chip.selected').map(function(c) { return c.dataset.val; });
  var fscEl2 = $('#fastingScore'); rec.fasting_score = fscEl2 ? parseInt(fscEl2.value) : 5;
  var fnoEl = $('#fastingNote'); rec.fasting_notes = fnoEl ? fnoEl.value.trim() : '';
  var emoEl = $('.emotion-item.selected'); rec.emotion = emoEl ? emoEl.dataset.emotion : null;
  var wsEl = $('#wellnessScore'); rec.wellness_score = wsEl ? parseInt(wsEl.value) : 5;
  var esEl = $('#energyScore'); rec.energy_score = esEl ? parseInt(esEl.value) : 5;
  var enEl = $('#emotionNote'); rec.emotion_notes = enEl ? enEl.value.trim() : '';
  var grEl = $('#gratitudeNote'); rec.gratitude = grEl ? grEl.value.trim() : '';
  return rec;
}

function handleSave() {
  var rec = buildRecordFromUI();
  saveRecordLocal(rec);
  showToast('記録を保存しました 🌸');
}

function updateFastingDisplay() {
  var startEl = $('#fastingStartTime');
  var endEl = $('#fastingEndTime');
  if (!startEl || !endEl) return;
  var f = calcFasting(startEl.value, endEl.value);
  var displayTime = $('#fastingDisplayTime');
  if (displayTime) displayTime.textContent = f.hours + 'h ' + f.minutes + 'm';
  var goalBtn = $('.fasting-goal-btn.selected');
  var goalMins = goalBtn ? parseInt(goalBtn.dataset.hours) * 60 : 14 * 60;
  var pct = Math.min(f.total / goalMins, 1);
  var ring = $('#fastingRingFill');
  if (ring) {
    var circ = 2 * Math.PI * 65;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ * (1 - pct);
  }
  var label = $('#fastingDisplayLabel');
  if (label) label.textContent = f.total >= goalMins ? '達成' : '断食時間';
  var status = $('#fastingStatus');
  if (status) {
    if (f.total === 0) status.textContent = '食事時刻を設定してください';
    else if (f.total >= goalMins) status.textContent = 'おつかれさまでした。からだが喜んでいるかもしれません。';
    else { var remain = goalMins - f.total; status.textContent = 'あと ' + Math.floor(remain / 60) + 'h ' + (remain % 60) + 'm で目標達成'; }
  }
}

/* ── 断食タイマー（リアルタイム）── */
var fastingTimerInterval = null;
var fastingTimerStart = null;

function startFastingTimer() {
  if (fastingTimerInterval) return;
  fastingTimerStart = Date.now();
  lsSet('fastingTimerStart', fastingTimerStart);
  var startBtn = $('#fastingLiveStartBtn');
  var stopBtn = $('#fastingLiveStopBtn');
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = '';
  fastingTimerInterval = setInterval(updateFastingTimer, 1000);
  updateFastingTimer();
}

function stopFastingTimer() {
  if (fastingTimerInterval) { clearInterval(fastingTimerInterval); fastingTimerInterval = null; }
  fastingTimerStart = null;
  lsSet('fastingTimerStart', null);
  var startBtn = $('#fastingLiveStartBtn');
  var stopBtn = $('#fastingLiveStopBtn');
  if (startBtn) startBtn.style.display = '';
  if (stopBtn) stopBtn.style.display = 'none';
  var display = $('#fastingLiveTime');
  if (display) display.textContent = '00:00:00';
  var lbl = $('#fastingLiveLabel');
  if (lbl) lbl.textContent = '断食スタートを押してください';
  var msg = $('#fastingLiveMsg');
  if (msg) msg.textContent = '';
}

function updateFastingTimer() {
  if (!fastingTimerStart) return;
  var elapsed = Math.floor((Date.now() - fastingTimerStart) / 1000);
  var h = Math.floor(elapsed / 3600);
  var m = Math.floor((elapsed % 3600) / 60);
  var s = elapsed % 60;
  var display = $('#fastingLiveTime');
  if (display) display.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  var lbl = $('#fastingLiveLabel');
  if (lbl) lbl.textContent = '断食中… ' + h + '時間 ' + m + '分経過';
  // ライブリング更新
  var presetBtn = $('.fasting-live-preset-btn.selected');
  var goalH = presetBtn ? parseInt(presetBtn.dataset.hours) : 14;
  var goalSec = goalH * 3600;
  var pct = Math.min(elapsed / goalSec, 1);
  var ring = $('#fastingLiveRingFill');
  if (ring) {
    var circ = 2 * Math.PI * 88;
    ring.style.strokeDasharray = circ;
    ring.style.strokeDashoffset = circ * (1 - pct);
  }
  var msg = $('#fastingLiveMsg');
  if (msg) {
    if (elapsed >= goalSec) msg.textContent = '目標達成！おつかれさまでした。';
    else { var rem = goalSec - elapsed; var rh = Math.floor(rem/3600); var rm = Math.floor((rem%3600)/60); msg.textContent = '目標まであと ' + rh + '時間' + rm + '分'; }
  }
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

function updateRangeGrad(el) {
  if (!el) return;
  var min = parseFloat(el.min) || 1;
  var max = parseFloat(el.max) || 10;
  var val = parseFloat(el.value) || min;
  var pct = ((val - min) / (max - min)) * 100;
  el.style.background = 'linear-gradient(to right, #E63FA8 0%, #E63FA8 ' + pct + '%, rgba(108,74,103,0.12) ' + pct + '%, rgba(108,74,103,0.12) 100%)';
}

/* ══════════════════════════════════════════════
   インサイト画面
   ══════════════════════════════════════════════ */
var insightPeriod = 7;
var wellnessChartObj = null;
var foodChartObj = null;
var chakraChartObj = null;

function renderInsight() {
  // スケルトン非表示
  var skel = $('#skeletonInsight');
  if (skel) skel.style.display = 'none';
  var emptyIns = $('#emptyInsight');

  var all = getAllRecords();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - insightPeriod);
  var cs = cutoff.toISOString().slice(0, 10);
  var records = all.filter(function(r) { return r.record_date >= cs; });

  if (all.length === 0 && emptyIns) { emptyIns.style.display = 'block'; return; }
  if (emptyIns) emptyIns.style.display = 'none';

  var totalDays = all.length;
  var streak = calcStreak();
  var avgFood = avgField(records, 'food_score');
  var avgWell = avgField(records, 'wellness_score');

  setElText('#insightTotalDays', totalDays + '日');
  setElText('#insightMaxStreak', streak + '日');
  setElText('#insightAvgFood', avgFood > 0 ? avgFood.toFixed(1) : '—');
  setElText('#insightAvgWellness', avgWell > 0 ? avgWell.toFixed(1) : '—');

  var textEl = $('#insightAIText');
  if (textEl) {
    if (records.length === 0) textEl.textContent = '記録が積み重なると、ここにあなただけのパターンメッセージが届きます。';
    else if (avgWell >= 7) textEl.textContent = 'ウェルネスが高く保たれています。からだの安定感が感じられる期間です。';
    else if (avgWell >= 4) textEl.textContent = 'ウェルネスは中程度。睡眠・食事・断食のリズムを意識すると、さらに整いやすくなります。';
    else textEl.textContent = 'からだが休息を必要としているかもしれません。無理せず、回復を優先しましょう。';
  }
  var subEl = $('#insightAISub');
  if (subEl) subEl.textContent = records.length > 0 ? '過去 ' + insightPeriod + ' 日間の記録 (' + records.length + '件) から' : '';

  setElText('#insightHeroDesc', totalDays + '日分の記録が蓄積されています。' + (totalDays >= 7 ? 'パターンが見えてきました。' : ''));

  // グラフ描画
  renderWellnessChart(records);
  renderFoodChart(records);
  renderChakraChart(records);
}

function renderWellnessChart(records) {
  var canvas = $('#wellnessChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (wellnessChartObj) { wellnessChartObj.destroy(); wellnessChartObj = null; }
  if (records.length === 0) return;
  var sorted = records.slice().sort(function(a,b){ return a.record_date < b.record_date ? -1 : 1; });
  var labels = sorted.map(function(r){ var d=new Date(r.record_date); return (d.getMonth()+1)+'/'+d.getDate(); });
  wellnessChartObj = new Chart(canvas.getContext('2d'), {
    type:'line',
    data:{
      labels:labels,
      datasets:[
        { label:'ウェルネス', data:sorted.map(function(r){return r.wellness_score||null;}), borderColor:'#E63FA8', backgroundColor:'rgba(230,63,168,0.1)', borderWidth:2, tension:0.3, fill:true, pointRadius:4, pointBackgroundColor:'#E63FA8' },
        { label:'エネルギー', data:sorted.map(function(r){return r.energy_score||null;}), borderColor:'#27B7B3', backgroundColor:'rgba(39,183,179,0.1)', borderWidth:2, tension:0.3, fill:true, pointRadius:4, pointBackgroundColor:'#27B7B3' }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{min:1,max:10,ticks:{stepSize:1}} }, plugins:{ legend:{position:'bottom',labels:{usePointStyle:true,padding:12}} } }
  });
}

function renderFoodChart(records) {
  var canvas = $('#foodChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (foodChartObj) { foodChartObj.destroy(); foodChartObj = null; }
  if (records.length === 0) return;
  var sorted = records.slice().sort(function(a,b){ return a.record_date < b.record_date ? -1 : 1; });
  var labels = sorted.map(function(r){ var d=new Date(r.record_date); return (d.getMonth()+1)+'/'+d.getDate(); });
  foodChartObj = new Chart(canvas.getContext('2d'), {
    type:'line',
    data:{
      labels:labels,
      datasets:[
        { label:'食事スコア', data:sorted.map(function(r){return r.food_score||null;}), borderColor:'#27B7B3', backgroundColor:'rgba(39,183,179,0.1)', borderWidth:2, tension:0.3, fill:true, pointRadius:4, pointBackgroundColor:'#27B7B3' }
      ]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{min:1,max:10,ticks:{stepSize:1}} }, plugins:{ legend:{position:'bottom',labels:{usePointStyle:true,padding:12}} } }
  });
}

function renderChakraChart(records) {
  var canvas = $('#chakraChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (chakraChartObj) { chakraChartObj.destroy(); chakraChartObj = null; }
  if (records.length === 0) return;
  var counts = { root:0, sacral:0, solar:0, heart:0, throat:0, third_eye:0 };
  records.forEach(function(r){ if (r.chakra && counts.hasOwnProperty(r.chakra)) counts[r.chakra]++; });
  var labels = ['第1','第2','第3','第4','第5','第6'];
  var data = [counts.root, counts.sacral, counts.solar, counts.heart, counts.throat, counts.third_eye];
  var colors = ['#E63FA8','#FF9A4A','#F5D020','#4CAF50','#27B7B3','#7C4DFF'];
  chakraChartObj = new Chart(canvas.getContext('2d'), {
    type:'bar',
    data:{
      labels:labels,
      datasets:[{ label:'記録回数', data:data, backgroundColor:colors, borderRadius:8 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{beginAtZero:true,ticks:{stepSize:1}} }, plugins:{ legend:{display:false} } }
  });
}

function avgField(records, field) {
  var vals = records.map(function(r) { return r[field]; }).filter(function(v) { return v != null && v > 0; });
  if (vals.length === 0) return 0;
  return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
}

function setElText(sel, text) { var el = $(sel); if (el) el.textContent = text; }

/* ══════════════════════════════════════════════
   設定画面
   ══════════════════════════════════════════════ */
function renderSettings() {
  var name = lsGet('userName', 'あなた');
  var since = lsGet('startedAt', '');
  var conditions = lsGet('conditions', '');
  var fastGoal = lsGet('fastingGoal', '14');
  setElText('#settingsName', name + 'さん');
  setElText('#settingsSince', since ? since + ' から利用中' : '');
  setElText('#settingNameValue', name);
  setElText('#settingConditionValue', conditions || '設定する');
  setElText('#settingFastingGoalValue', fastGoal + 'h');
}


function initSettings() {
  var nameRow = $('#settingNameRow');
  if (nameRow) {
    nameRow.addEventListener('click', function() {
      var current = lsGet('userName', '');
      var newName = prompt('お名前を入力してください', current);
      if (newName !== null && newName.trim()) {
        lsSet('userName', newName.trim());
        showToast('お名前を更新しました');
        renderSettings();
      }
    });
  }

  // FIX: 気になる症状
  var condRow = $('#settingConditionRow');
  if (condRow) {
    condRow.addEventListener('click', function() {
      var current = lsGet('conditions', '');
      var newVal = prompt('気になる症状を入力してください（例：子宮筋腫、冷え、疲れやすい）', current);
      if (newVal !== null) {
        lsSet('conditions', newVal.trim());
        setElText('#settingConditionValue', newVal.trim() || '設定する');
        showToast('症状を更新しました');
      }
    });
  }

  // 断食目標
  var fastGoalRow = $('#settingFastingGoalRow');
  if (fastGoalRow) {
    fastGoalRow.addEventListener('click', function() {
      var current = lsGet('fastingGoal', '14');
      var newVal = prompt('断食目標時間（数字のみ、例：16）', current);
      if (newVal !== null && !isNaN(parseInt(newVal))) {
        lsSet('fastingGoal', parseInt(newVal));
        setElText('#settingFastingGoalValue', parseInt(newVal) + 'h');
        showToast('断食目標を更新しました');
      }
    });
  }

  var exportRow = $('#exportDataRow');
  if (exportRow) {
    exportRow.addEventListener('click', function() {
      var records = getAllRecords();
      if (records.length === 0) { showToast('エクスポートする記録がありません'); return; }
      try {
        var keys = Object.keys(records[0]);
        var csv = keys.join(',') + '\n';
        records.forEach(function(r) {
          csv += keys.map(function(k) { var v = r[k]; if (Array.isArray(v)) v = v.join(';'); return '"' + (v != null ? String(v).replace(/"/g, '""') : '') + '"'; }).join(',') + '\n';
        });
        var blob = new Blob([csv], { type: 'text/csv' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ippo-' + today() + '.csv';
        a.click();
        showToast('CSVをダウンロードしました');
      } catch(e) { showToast('エクスポートに失敗しました'); }
    });
  }

   var deleteRow = $('#deleteDataRow');
  if (deleteRow) {
    deleteRow.addEventListener('click', function() {
      if (!confirm('すべての記録を削除します。この操作は元に戻せません。本当によろしいですか？')) return;
      setAllRecords([]);
      showToast('すべての記録を削除しました');
    });
  }

  // フィードバックボタン
  var feedbackBtn = $('#settingsFeedbackBtn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', function() {
      var overlay = $('#feedbackOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('feedback-show');
      }
    });
  }

  // フィードバック閉じる
  var fbCloseBtn = $('#feedbackCloseBtn');
  if (fbCloseBtn) {
    fbCloseBtn.addEventListener('click', function() {
      var overlay = $('#feedbackOverlay');
      if (overlay) {
        overlay.classList.remove('feedback-show');
        overlay.style.display = 'none';
      }
    });
  }
  var fbCompleteClose = $('#feedbackCompleteClose');
  if (fbCompleteClose) {
    fbCompleteClose.addEventListener('click', function() {
      var overlay = $('#feedbackOverlay');
      if (overlay) {
        overlay.classList.remove('feedback-show');
        overlay.style.display = 'none';
      }
    });
  }
   // フィードバック評価ボタン

$$('.feedback-rating-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {

    $$('.feedback-rating-btn').forEach(function(b) { b.classList.remove('selected'); });
    btn.classList.add('selected');
    var next = $('#fbStep1Next');
    if (next) next.disabled = false;
  });
});

// ステップ1 次へ
var fbS1 = $('#fbStep1Next');
if (fbS1) {
  fbS1.addEventListener('click', function() {
    // 選択肢を生成
    var chips = $('#fbReasonChips');
    if (chips && chips.children.length === 0) {
      var reasons = ['操作がわかりやすい','デザインが好き','記録が続けやすい','機能が足りない','動作が重い','使い方がわからない','チャクラが面白い','断食管理が便利','もっと分析がほしい'];
      reasons.forEach(function(r) {
        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.textContent = r;
        chip.addEventListener('click', function() {
          chip.classList.toggle('selected');
        });
        chips.appendChild(chip);
      });
    }

    $$('.feedback-step').forEach(function(s) { s.classList.remove('active'); });
    var step2 = $$('.feedback-step')[1];
    if (step2) step2.classList.add('active');
  });
}

// ステップ2 次へ
var fbS2 = $('#fbStep2Next');
if (fbS2) {
  fbS2.addEventListener('click', function() {

    $$('.feedback-step').forEach(function(s) { s.classList.remove('active'); });
    var step3 = $$('.feedback-step')[2];
    if (step3) step3.classList.add('active');
  });
}

// ステップ2 戻る
var fbS2Back = $('#fbStep2Back');
if (fbS2Back) {
  fbS2Back.addEventListener('click', function() {

    $$('.feedback-step').forEach(function(s) { s.classList.remove('active'); });
    var step1 = $$('.feedback-step')[0];
    if (step1) step1.classList.add('active');
  });
}

// ステップ3 戻る
var fbS3Back = $('#fbStep3Back');
if (fbS3Back) {
  fbS3Back.addEventListener('click', function() {

    $$('.feedback-step').forEach(function(s) { s.classList.remove('active'); });
    var step2 = $$('.feedback-step')[1];
    if (step2) step2.classList.add('active');
  });
}

// 送信ボタン
var fbSubmit = $('#fbSubmitBtn');
if (fbSubmit) {
  fbSubmit.addEventListener('click', function(e) {
    e.preventDefault();
    var form = $('#feedbackForm');
    var rating = $('.feedback-rating-btn.selected');
    var reasons = $$('#fbReasonChips .chip.selected').map(function(c){ return c.textContent; });
    var comment = $('#fbComment') ? $('#fbComment').value : '';
    
    // Formspreeに送信
    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        rating: rating ? rating.dataset.rating + ' - ' + rating.dataset.label : '',
        reasons: reasons.join(', '),
        comment: comment
      })
    }).then(function(res) {
      if (res.ok) {

        $$('.feedback-step').forEach(function(s) { s.classList.remove('active'); });
        var complete = $('#feedbackComplete');
        if (complete) complete.style.display = 'block';
        showToast('フィードバックを送信しました');
      } else {
        showToast('送信に失敗しました。もう一度お試しください');
      }
    }).catch(function() {
      showToast('送信に失敗しました');
    });
  });
}


   
  // 記録履歴を見る
  var historyRow = $('#historyRow');
  if (historyRow) {
    historyRow.addEventListener('click', function() {
      var records = getAllRecords();
      if (records.length === 0) { showToast('まだ記録がありません'); return; }
      var sorted = records.slice().sort(function(a, b) { return b.record_date < a.record_date ? -1 : 1; });
      var list = sorted.slice(0, 30).map(function(r) {
        var chakra = r.chakra || '—';
        var emo = r.emotion || '—';
        return r.record_date + '  チャクラ:' + chakra + '  感情:' + emo;
      }).join('\n');
      alert('直近の記録履歴（最大30件）\n\n' + list);
    });
  }

    // 「このアプリについて」

  $$('.settings-row').forEach(function(row) {
    var label = row.querySelector('.settings-row-label');
    if (label && label.textContent.trim() === 'このアプリについて') {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function() {
        alert('ippo v1.0.0\n\nからだに還る、一歩。\n卵巣・女性のからだのために、食事・チャクラ・プチ断食・感情を毎日記録するセルフケアアプリです。\n\n※医療アドバイスを提供するものではありません。');
      });
    }
  });
}  // ← これが initSettings() の閉じカッコ


/* ══════════════════════════════════════════════
   全イベントバインド
   ══════════════════════════════════════════════ */
function bindAllEvents() {

  /* ナビバー */

  $$('.nav-item').forEach(function(btn) {
    btn.addEventListener('click', function() { var screen = btn.dataset.screen; if (screen) showScreen(screen); });
  });

  /* ウェルカム */
  var nextBtn = $('#welcomeNextBtn');
  if (nextBtn) { nextBtn.addEventListener('click', function() { if (welcomeSlide < 3) goToSlide(welcomeSlide + 1); else completeOnboarding(); }); }
  var skipBtn = $('#welcomeSkipBtn');
  if (skipBtn) { skipBtn.addEventListener('click', function() { goToSlide(3); }); }

  /* ホーム記録ボタン */
  ['homeRecordBtn', 'quickRecordBtn', 'fabRecordBtn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', function() { showScreen('record'); });
  });

  /* 記録タブ */

  $$('.record-tab').forEach(function(tab) {
    tab.addEventListener('click', function() { activateTab(tab.dataset.tab); });
  });

  /* チャクラ選択（グリッド） */

  $$('.chakra-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.chakra-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');

      $$('.chakra-visual-item').forEach(function(v) { v.classList.toggle('selected', v.dataset.chakra === el.dataset.chakra); });
    });
  });

  /* チャクラ選択（ビジュアルリスト） */

  $$('.chakra-visual-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.chakra-visual-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');

      $$('.chakra-item').forEach(function(v) { v.classList.toggle('selected', v.dataset.chakra === el.dataset.chakra); });
    });
  });

  /* チップ複数選択 */

  $$('#symptomChips .chip, #bodyFeelChips .body-feel-chip, #foodIngredientChips .chip, #fastingFeelChips .chip').forEach(function(chip) {
    chip.addEventListener('click', function() { chip.classList.toggle('selected'); });
  });

  /* FIX: 月経周期チップ（単一選択） */

  $$('#menstrualCycleChips .chip').forEach(function(chip) {
    chip.addEventListener('click', function() {

      $$('#menstrualCycleChips .chip').forEach(function(c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
    });
  });

  /* 食事タイム（単一） */

  $$('.food-time-card').forEach(function(card) {
    card.addEventListener('click', function() {

      $$('.food-time-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    });
  });

  /* 断食目標（単一） */

  $$('.fasting-goal-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {

      $$('.fasting-goal-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      updateFastingDisplay();
    });
  });

  /* 感情（単一） */

  $$('.emotion-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.emotion-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');
    });
  });

  /* FIX: 体調スケール（単一、data-scale） */

  $$('.condition-scale-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {

      $$('.condition-scale-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });

  /* Range スライダー */

  $$('input[type="range"]').forEach(function(range) {
    updateRangeGrad(range);
    range.addEventListener('input', function() {
      updateRangeGrad(range);
      var displayEl = document.getElementById(range.id + 'Display');
      if (displayEl) displayEl.textContent = range.value;
    });
  });

  /* 断食時刻変更 */
  var fst = $('#fastingStartTime');
  var fen = $('#fastingEndTime');
  if (fst) fst.addEventListener('change', updateFastingDisplay);
  if (fen) fen.addEventListener('change', updateFastingDisplay);

  /* FIX: 断食ライブタイマーボタン */
  var liveStartBtn = $('#fastingLiveStartBtn');
  if (liveStartBtn) liveStartBtn.addEventListener('click', startFastingTimer);
  var liveStopBtn = $('#fastingLiveStopBtn');
  if (liveStopBtn) liveStopBtn.addEventListener('click', stopFastingTimer);

  /* FIX: 断食ライブプリセット */

  $$('.fasting-live-preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {

      $$('.fasting-live-preset-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });
   
  /* 体調記録ボタン */
  var condSaveBtn = $('#conditionSaveBtn');
  if (condSaveBtn) {
    condSaveBtn.addEventListener('click', function() {
      var rec = buildRecordFromUI();
      saveRecordLocal(rec);
      showToast('今日の体調を記録しました');
    });
  }

  /* 保存ボタン */
  var saveBtn = $('#saveRecordBtn');
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  var saveBtnHeader = $('#recordSaveBtn');
  if (saveBtnHeader) saveBtnHeader.addEventListener('click', handleSave);

  /* インサイト期間切替 */

  $$('[data-period]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var period = parseInt(btn.dataset.period);
      if (period) {
        insightPeriod = period;

        $$('[data-period]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderInsight();
      }
    });
  });

  /* 設定 */
  initSettings();
}

/* ══════════════════════════════════════════════
   アプリ初期化
   ══════════════════════════════════════════════ */
function initApp() {
  var onboarded = lsGet('onboarded', false);
  var nav = $('#appNav');

  if (onboarded) {
    if (nav) nav.style.display = 'flex';
    showScreen('home');
  } else {
    if (nav) nav.style.display = 'none';
    showScreen('welcome');
    goToSlide(0);
  }

  // 断食タイマー復元
  var savedTimer = lsGet('fastingTimerStart', null);
  if (savedTimer) {
    fastingTimerStart = savedTimer;
    fastingTimerInterval = setInterval(updateFastingTimer, 1000);
    updateFastingTimer();
    var startBtn = $('#fastingLiveStartBtn');
    var stopBtn = $('#fastingLiveStopBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) stopBtn.style.display = '';
  }

  bindAllEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
/* ============================================
   PHASE 2 — CRYSTAL CALENDAR + MELT LIGHT
   ============================================ */
(function() {
  'use strict';

  // ── 定数 ──
  var CRYSTALS = ['💎','🔮','✨','💜','🌟','🧿','💠'];
  var WDAY_NAMES = ['日','月','火','水','木','金','土'];
  var FOOD_SETS = [
    [{t:'orange',n:'にんじん'},{t:'orange',n:'かぼちゃ'},{t:'teal',n:'アボカド'},{t:'violet',n:'ブルーベリー'}],
    [{t:'orange',n:'さつまいも'},{t:'teal',n:'ほうれん草'},{t:'orange',n:'マンゴー'},{t:'violet',n:'紫キャベツ'}],
    [{t:'teal',n:'ブロッコリー'},{t:'orange',n:'みかん'},{t:'violet',n:'赤ビーツ'},{t:'teal',n:'アスパラ'}],
    [{t:'orange',n:'パパイヤ'},{t:'teal',n:'ケール'},{t:'violet',n:'なす'},{t:'orange',n:'オレンジ'}],
    [{t:'violet',n:'いちご'},{t:'teal',n:'きゅうり'},{t:'orange',n:'くるみ'},{t:'teal',n:'ズッキーニ'}]
  ];
  var FAST_OPTIONS = ['16:8','18:6','14:10','16:8','18:6'];
  var MELT_GOAL = 30; // 30日で100%

  // ── 状態 ──
  var now = new Date();
  var calYear = now.getFullYear();
  var calMonth = now.getMonth();
  var selectedDay = null;

  // ── ヘルパー：達成日の保存・取得 ──
  function getDoneDays() {
    try { return JSON.parse(localStorage.getItem('lp_done_days') || '[]'); }
    catch(e) { return []; }
  }
  function saveDoneDays(arr) {
    localStorage.setItem('lp_done_days', JSON.stringify(arr));
  }
  function isDone(dateStr) {
    return getDoneDays().indexOf(dateStr) !== -1;
  }
  function markDone(dateStr) {
    var arr = getDoneDays();
    if (arr.indexOf(dateStr) === -1) {
      arr.push(dateStr);
      saveDoneDays(arr);
    }
  }

  // ── ヘルパー：記録データとの連携 ──
  function getRecordForDate(dateStr) {
    // ippoの既存記録（getAllRecords）と連携
    if (typeof getAllRecords === 'function') {
      var all = getAllRecords();
      for (var i = 0; i < all.length; i++) {
        if (all[i].date === dateStr) return all[i];
      }
    }
    return null;
  }

  function dateStr(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  // ── カレンダー描画 ──
  function buildCalendar() {
    var label = document.getElementById('calMonthLabel');
    var grid = document.getElementById('calDaysGrid');
    if (!label || !grid) return;

    label.textContent = calYear + '年 ' + (calMonth + 1) + '月';
    grid.innerHTML = '';

    var firstDow = new Date(calYear, calMonth, 1).getDay();
    var daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    var todayDate = new Date();

    // 空白セル
    for (var e = 0; e < firstDow; e++) {
      var empty = document.createElement('div');
      empty.className = 'lp-cal-day lp-empty';
      grid.appendChild(empty);
    }

    // 日セル
    for (var d = 1; d <= daysInMonth; d++) {
      var el = document.createElement('div');
      el.className = 'lp-cal-day';
      var ds = dateStr(calYear, calMonth, d);

      var isToday = (d === todayDate.getDate() && calMonth === todayDate.getMonth() && calYear === todayDate.getFullYear());
      if (isToday) el.classList.add('lp-today');

      var done = isDone(ds);
      var rec = getRecordForDate(ds);

      if (done) {
        el.classList.add('lp-done');
        var ci = ((calMonth + d) % CRYSTALS.length);
        el.innerHTML = '<div class="lp-crystal">' + CRYSTALS[ci] + '</div><div class="lp-day-num">' + d + '</div>';
      } else if (rec) {
        el.classList.add('lp-has-record');
        el.innerHTML = '<div class="lp-day-num">' + d + '</div>';
      } else {
        el.innerHTML = '<div class="lp-day-num">' + d + '</div>';
      }

      el.setAttribute('data-day', d);
      el.addEventListener('click', (function(day) {
        return function() { openDayModal(day); };
      })(d));

      grid.appendChild(el);
    }

    updateStats();
    updateMelt();
  }

  // ── 統計更新 ──
  function updateStats() {
    var doneDays = getDoneDays();
    var todayDate = new Date();

    // 連続ケア計算
    var streak = 0;
    var checkDate = new Date(todayDate);
    while (true) {
      var ds = dateStr(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
      if (isDone(ds) || getRecordForDate(ds)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    var el1 = document.getElementById('calStreak');
    var el2 = document.getElementById('calDone');
    var el3 = document.getElementById('calCrystals');
    if (el1) el1.textContent = streak + '日';
    if (el2) el2.textContent = doneDays.length;
    if (el3) el3.textContent = doneDays.length;
  }

  // ── 光の溶融バー更新 ──
  function updateMelt() {
    var doneDays = getDoneDays();
    var pct = Math.min(100, Math.round((doneDays.length / MELT_GOAL) * 100));
    var fill = document.getElementById('meltFill');
    var pctEl = document.getElementById('meltPct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }

  // ── モーダル開閉 ──
  function openDayModal(d) {
    selectedDay = d;
    var ds = dateStr(calYear, calMonth, d);
    var done = isDone(ds);
    var rec = getRecordForDate(ds);

    var titleEl = document.getElementById('calModalTitle');
    var dateEl = document.getElementById('calModalDate');
    var foodsEl = document.getElementById('calModalFoods');
    var fastEl = document.getElementById('calModalFastTime');
    var recSection = document.getElementById('calModalRecordSection');
    var recSummary = document.getElementById('calModalRecordSummary');
    var doneBtn = document.getElementById('calModalDone');

    if (!titleEl) return;

    // タイトル
    titleEl.textContent = done ? d + '日 ✦ 達成済み' : d + '日 のケアプラン';

    // 日付
    var w = new Date(calYear, calMonth, d).getDay();
    dateEl.textContent = calYear + '年' + (calMonth + 1) + '月' + d + '日（' + WDAY_NAMES[w] + '） • 第2チャクラケア';

    // フード提案
    var fi = ((calMonth + d) % FOOD_SETS.length);
    foodsEl.innerHTML = '';
    FOOD_SETS[fi].forEach(function(f) {
      var tag = document.createElement('div');
      tag.className = 'lp-food-tag ' + f.t;
      tag.textContent = f.n;
      foodsEl.appendChild(tag);
    });

    // 断食
    fastEl.textContent = FAST_OPTIONS[d % FAST_OPTIONS.length];

    // 既存記録の表示
    if (rec) {
      recSection.style.display = 'block';
      var summary = '';
      if (rec.chakra) summary += 'チャクラ: ' + rec.chakra + '\n';
      if (rec.condition) summary += '体調: ' + rec.condition + '/5\n';
      if (rec.food_content) summary += '食事: ' + rec.food_content + '\n';
      if (rec.emotion) summary += '感情: ' + rec.emotion + '\n';
      if (rec.fasting_hours) summary += '断食: ' + rec.fasting_hours + '時間\n';
      recSummary.textContent = summary || '記録あり';
    } else {
      recSection.style.display = 'none';
    }

    // 達成ボタン
    if (done) {
      doneBtn.textContent = '✦ 達成済み';
      doneBtn.disabled = true;
    } else {
      doneBtn.textContent = '✦ 達成する';
      doneBtn.disabled = false;
    }

    // 表示
    document.getElementById('calModalOverlay').classList.add('lp-open');
  }

  function closeDayModal() {
    document.getElementById('calModalOverlay').classList.remove('lp-open');
  }

  function handleMarkDone() {
    if (!selectedDay) return;
    var ds = dateStr(calYear, calMonth, selectedDay);
    markDone(ds);
    closeDayModal();
    buildCalendar();

    // トースト表示
    if (typeof showToast === 'function') {
      showToast('✦ ' + selectedDay + '日のケアをクリスタルに刻みました');
    }
  }

  // ── 月ナビ ──
  function changeMonth(dir) {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0)  { calMonth = 11; calYear--; }
    buildCalendar();
  }

  // ── イベントバインド ──
  function initCrystalCalendar() {
    var prevBtn = document.getElementById('calPrev');
    var nextBtn = document.getElementById('calNext');
    var closeBtn = document.getElementById('calModalClose');
    var doneBtn = document.getElementById('calModalDone');
    var overlay = document.getElementById('calModalOverlay');

    if (prevBtn) prevBtn.addEventListener('click', function() { changeMonth(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { changeMonth(1); });
    if (closeBtn) closeBtn.addEventListener('click', closeDayModal);
    if (doneBtn) doneBtn.addEventListener('click', handleMarkDone);
    if (overlay) overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeDayModal();
    });

    buildCalendar();
  }

  // ── 記録保存時にカレンダーを再描画 ──
  // ippoの既存saveRecordLocal()が呼ばれた後にカレンダーを更新
  var origSave = window.saveRecordLocal;
  if (typeof origSave === 'function') {
    window.saveRecordLocal = function() {
      origSave.apply(this, arguments);
      buildCalendar();
    };
  }

  // ── 初期化 ──
  // DOMContentLoadedまたは既にロード済みの場合
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCrystalCalendar);
  } else {
    // app-local.jsの他の初期化の後に実行されるようにsetTimeout
    setTimeout(initCrystalCalendar, 100);
  }

  // 画面切り替え時にカレンダーを再描画（ホーム画面に戻ったとき）
  var origShowScreen = window.showScreen;
  if (typeof origShowScreen === 'function') {
    window.showScreen = function(name) {
      origShowScreen.apply(this, arguments);
      if (name === 'home') {
        setTimeout(buildCalendar, 50);
      }
    };
  }

})();
