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

  // FAB 表示制御
  var fab = $('#homeRecordFab');
  if (fab) fab.style.display = (name === 'home') ? '' : 'none';

  // 画面別初期化
  if (name === 'home') renderHome();
  if (name === 'record') initRecordScreen();
  if (name === 'insight') renderInsight();
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

  // 日付
  var dateEl = $('#homeDateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  // 挨拶
  var greetEl = $('#homeGreetingText');
  if (greetEl) greetEl.textContent = getTimeGreeting() + '、' + name + 'さん';

  // 時間帯メッセージ
  var timeMsg = $('#homeTimeMsg');
  if (timeMsg) {
    var h = new Date().getHours();
    if (h >= 5 && h < 11) timeMsg.textContent = 'おはようございます。今日もからだの声に、耳を傾けてみましょう。';
    else if (h >= 11 && h < 17) timeMsg.textContent = 'こんにちは。今日のからだの調子は、いかがですか？';
    else if (h >= 17 && h < 22) timeMsg.textContent = 'おつかれさまです。今日一日の記録を、静かに振り返りましょう。';
    else timeMsg.textContent = '夜のひととき、今日のからだに"ありがとう"を。';
  }

  // メッセージ
  var msgEl = $('#homeGreetingMsg');
  if (msgEl) {
    if (todayRec) msgEl.textContent = '今日の記録が完了しています。インサイトで蓄積を確認してみましょう。';
    else if (streak > 0) msgEl.textContent = streak + '日連続記録中です。今日もからだの声を聴きましょう。';
    else msgEl.textContent = 'からだの記録を始めましょう。毎日少しずつが、大切な蓄積になります。';
  }

  // 季節
  var sqText = $('#seasonQuoteText');
  var sqSub = $('#seasonQuoteSub');
  if (sqText) sqText.textContent = SEASON_MSG[getSeason()];
  if (sqSub) sqSub.textContent = '';

  // 統計
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

  // 週間カレンダー
  renderWeekCalendar(records);

  // 今日のサマリー
  renderTodaySummary(todayRec);

  // FAB
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
  if (rec.food_content) rows += '<div class="home-today-log-row"><div class="home-today-icon today-icon-food">fo</div><div><div class="home-today-item-label">食事</div><div class="home-today-item-value">' + rec.food_content.slice(0, 20) + '</div></div></div>';
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
   記録画面：初期化
   ══════════════════════════════════════════════ */
function initRecordScreen() {
  // 日付表示
  var dateEl = $('#recordDateDisplay');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  // チャクラタブをデフォルト表示
  activateTab('chakra');

  // 既存レコードがあればフィールドに読み込む
  var rec = getTodayRecord();
  if (rec) loadRecordToFields(rec);
}

/* ── タブ切替 ── */
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

/* ── 既存レコードをフィールドに読み込む ── */
function loadRecordToFields(rec) {
  // チャクラ
  if (rec.chakra) {

    $$('.chakra-item').forEach(function(el) {
      el.classList.toggle('selected', el.dataset.chakra === rec.chakra);
    });

    $$('.chakra-visual-item').forEach(function(el) {
      el.classList.toggle('selected', el.dataset.chakra === rec.chakra);
    });
  }

  // 症状チップ
  if (rec.symptoms && rec.symptoms.length) {
    rec.symptoms.forEach(function(v) {
      var chip = $('[data-val="' + v + '"]', $('#symptomChips'));
      if (chip) chip.classList.add('selected');
    });
  }

  // 体調スコア
  if (rec.condition_scale) {

    $$('.condition-scale-btn').forEach(function(b) {
      b.classList.toggle('selected', b.dataset.val === String(rec.condition_scale));
    });
  }

  // リズム
  if (rec.basal_temp) { var bt = $('#basalTemp'); if (bt) bt.value = rec.basal_temp; }
  if (rec.cycle_phase) {

    $$('.cycle-chip').forEach(function(c) {
      c.classList.toggle('selected', c.dataset.val === rec.cycle_phase);
    });
  }
  if (rec.rhythm_memo) { var rm = $('#rhythmMemo'); if (rm) rm.value = rec.rhythm_memo; }

  // 食事
  if (rec.food_time) {

    $$('.food-time-card').forEach(function(c) {
      c.classList.toggle('selected', c.dataset.time === rec.food_time);
    });
  }
  if (rec.food_content) { var fc = $('#foodContent'); if (fc) fc.value = rec.food_content; }
  if (rec.body_feel && rec.body_feel.length) {
    rec.body_feel.forEach(function(v) {
      var chip = $('[data-val="' + v + '"]', $('#bodyFeelChips'));
      if (chip) chip.classList.add('selected');
    });
  }
  if (rec.food_ingredients && rec.food_ingredients.length) {
    rec.food_ingredients.forEach(function(v) {
      var chip = $('[data-val="' + v + '"]', $('#foodIngredientChips'));
      if (chip) chip.classList.add('selected');
    });
  }
  if (rec.food_score) {
    var fs = $('#foodScore'); if (fs) { fs.value = rec.food_score; updateRangeGrad(fs); }
    var fsd = $('#foodScoreDisplay'); if (fsd) fsd.textContent = rec.food_score;
  }
  if (rec.food_notes) { var fn = $('#foodNote'); if (fn) fn.value = rec.food_notes; }

  // 断食
  if (rec.fasting_start) { var fst = $('#fastingStartTime'); if (fst) fst.value = rec.fasting_start; }
  if (rec.fasting_end) { var fen = $('#fastingEndTime'); if (fen) fen.value = rec.fasting_end; }
  if (rec.fasting_goal_hours) {

    $$('.fasting-goal-btn').forEach(function(b) {
      b.classList.toggle('selected', parseInt(b.dataset.hours) === parseInt(rec.fasting_goal_hours));
    });
  }
  if (rec.fasting_feel && rec.fasting_feel.length) {
    rec.fasting_feel.forEach(function(v) {
      var chip = $('[data-val="' + v + '"]', $('#fastingFeelChips'));
      if (chip) chip.classList.add('selected');
    });
  }
  if (rec.fasting_score) {
    var fsc = $('#fastingScore'); if (fsc) { fsc.value = rec.fasting_score; updateRangeGrad(fsc); }
    var fscd = $('#fastingScoreDisplay'); if (fscd) fscd.textContent = rec.fasting_score;
  }
  if (rec.fasting_notes) { var fno = $('#fastingNote'); if (fno) fno.value = rec.fasting_notes; }

  // 感情
  if (rec.emotion) {

    $$('.emotion-item').forEach(function(el) {
      el.classList.toggle('selected', el.dataset.emotion === rec.emotion);
    });
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

  // 断食表示更新
  updateFastingDisplay();
}

/* ── UIからレコードを構築 ── */
function buildRecordFromUI() {
  var rec = { record_date: today() };

  // チャクラ
  var chakraEl = $('.chakra-item.selected') || $('.chakra-visual-item.selected');
  rec.chakra = chakraEl ? chakraEl.dataset.chakra : null;
  rec.symptoms = $$('#symptomChips .chip.selected').map(function(c) { return c.dataset.val; });

  // 体調スコア
  var condBtn = $('.condition-scale-btn.selected');
  rec.condition_scale = condBtn ? parseInt(condBtn.dataset.val) : null;

  // リズム
  var btEl = $('#basalTemp'); rec.basal_temp = btEl ? btEl.value : '';
  var cycleEl = $('.cycle-chip.selected'); rec.cycle_phase = cycleEl ? cycleEl.dataset.val : null;
  var rmEl = $('#rhythmMemo'); rec.rhythm_memo = rmEl ? rmEl.value.trim() : '';

  // 食事
  var ftEl = $('.food-time-card.selected'); rec.food_time = ftEl ? ftEl.dataset.time : null;
  var fcEl = $('#foodContent'); rec.food_content = fcEl ? fcEl.value.trim() : '';
  rec.body_feel = $$('#bodyFeelChips .chip.selected, #bodyFeelChips .body-feel-chip.selected').map(function(c) { return c.dataset.val; });
  rec.food_ingredients = $$('#foodIngredientChips .chip.selected').map(function(c) { return c.dataset.val; });
  var fsEl = $('#foodScore'); rec.food_score = fsEl ? parseInt(fsEl.value) : 5;
  var fnEl = $('#foodNote'); rec.food_notes = fnEl ? fnEl.value.trim() : '';

  // 断食
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

  // 感情
  var emoEl = $('.emotion-item.selected'); rec.emotion = emoEl ? emoEl.dataset.emotion : null;
  var wsEl = $('#wellnessScore'); rec.wellness_score = wsEl ? parseInt(wsEl.value) : 5;
  var esEl = $('#energyScore'); rec.energy_score = esEl ? parseInt(esEl.value) : 5;
  var enEl = $('#emotionNote'); rec.emotion_notes = enEl ? enEl.value.trim() : '';
  var grEl = $('#gratitudeNote'); rec.gratitude = grEl ? grEl.value.trim() : '';

  return rec;
}

/* ── 保存処理 ── */
function handleSave() {
  var rec = buildRecordFromUI();
  saveRecordLocal(rec);

  // 完了アニメーション表示
  var complete = $('#wizard-complete');
  if (complete) {
    complete.classList.add('complete-show');
    setTimeout(function() {
      complete.classList.remove('complete-show');
      showScreen('home');
    }, 2500);
  } else {
    showToast('記録を保存しました');
    showScreen('home');
  }
}

/* ── 断食表示更新 ── */
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
    else {
      var remain = goalMins - f.total;
      status.textContent = 'あと ' + Math.floor(remain / 60) + 'h ' + (remain % 60) + 'm で目標達成';
    }
  }
}

/* ── 断食タイマー（リアルタイム） ── */
var fastingTimerInterval = null;
var fastingTimerStart = null;

function startFastingTimer() {
  if (fastingTimerInterval) return;
  fastingTimerStart = Date.now();
  lsSet('fastingTimerStart', fastingTimerStart);
  var btn = $('#fastingTimerBtn');
  if (btn) { btn.textContent = '断食を終了する'; btn.classList.add('btn-teal'); }
  fastingTimerInterval = setInterval(updateFastingTimer, 1000);
  updateFastingTimer();
}

function stopFastingTimer() {
  if (fastingTimerInterval) { clearInterval(fastingTimerInterval); fastingTimerInterval = null; }
  fastingTimerStart = null;
  lsSet('fastingTimerStart', null);
  var btn = $('#fastingTimerBtn');
  if (btn) { btn.textContent = '断食スタート'; btn.classList.remove('btn-teal'); }
  var display = $('#fastingTimerDisplay');
  if (display) display.textContent = '00:00:00';
  var lbl = $('#fastingLiveLabel');
  if (lbl) lbl.textContent = '断食スタートを押してください';
}

function updateFastingTimer() {
  if (!fastingTimerStart) return;
  var elapsed = Math.floor((Date.now() - fastingTimerStart) / 1000);
  var h = Math.floor(elapsed / 3600);
  var m = Math.floor((elapsed % 3600) / 60);
  var s = elapsed % 60;
  var display = $('#fastingTimerDisplay');
  if (display) display.textContent = pad(h) + ':' + pad(m) + ':' + pad(s);
  var lbl = $('#fastingLiveLabel');
  if (lbl) lbl.textContent = '断食中… ' + h + '時間 ' + m + '分経過';
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ── range スライダーのグラデーション更新 ── */
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
var insightChart = null;

function renderInsight() {
  var all = getAllRecords();
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - insightPeriod);
  var cs = cutoff.toISOString().slice(0, 10);
  var records = all.filter(function(r) { return r.record_date >= cs; });

  // 統計
  var totalDays = all.length;
  var streak = calcStreak();
  var avgFood = avgField(records, 'food_score');
  var avgWell = avgField(records, 'wellness_score');

  setElText('#insightTotalDays', totalDays + '日');
  setElText('#insightMaxStreak', streak + '日');
  setElText('#insightAvgFood', avgFood > 0 ? avgFood.toFixed(1) : '—');
  setElText('#insightAvgWellness', avgWell > 0 ? avgWell.toFixed(1) : '—');

  // AI メッセージ
  var textEl = $('#insightAIText');
  if (textEl) {
    if (records.length === 0) {
      textEl.textContent = '記録が積み重なると、ここにあなただけのパターンメッセージが届きます。';
    } else if (avgWell >= 7) {
      textEl.textContent = 'ウェルネスが高く保たれています。からだの安定感が感じられる期間です。';
    } else if (avgWell >= 4) {
      textEl.textContent = 'ウェルネスは中程度。睡眠・食事・断食のリズムを意識すると、さらに整いやすくなります。';
    } else if (records.length > 0) {
      textEl.textContent = 'からだが休息を必要としているかもしれません。無理せず、回復を優先しましょう。';
    }
  }
  var subEl = $('#insightAISub');
  if (subEl) subEl.textContent = records.length > 0 ? '過去 ' + insightPeriod + ' 日間の記録 (' + records.length + '件) から' : '';

  // 説明文
  setElText('#insightHeroDesc', totalDays + '日分の記録が蓄積されています。' + (totalDays >= 7 ? 'パターンが見えてきました。' : ''));

  // グラフ
  renderInsightChart(records);
}

function renderInsightChart(records) {
  var canvas = $('#insightChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (insightChart) { insightChart.destroy(); insightChart = null; }

  if (records.length === 0) return;

  var sorted = records.slice().sort(function(a, b) { return a.record_date < b.record_date ? -1 : 1; });
  var labels = sorted.map(function(r) {
    var d = new Date(r.record_date);
    return (d.getMonth() + 1) + '/' + d.getDate();
  });
  var wellData = sorted.map(function(r) { return r.wellness_score || null; });
  var foodData = sorted.map(function(r) { return r.food_score || null; });

  insightChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'ウェルネス',
          data: wellData,
          borderColor: '#E63FA8',
          backgroundColor: 'rgba(230,63,168,0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#E63FA8'
        },
        {
          label: '食事スコア',
          data: foodData,
          borderColor: '#27B7B3',
          backgroundColor: 'rgba(39,183,179,0.1)',
          borderWidth: 2,
          tension: 0.3,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#27B7B3'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 1, max: 10, ticks: { stepSize: 1 } },
        x: { ticks: { maxRotation: 45 } }
      },
      plugins: {
        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
      }
    }
  });
}

function avgField(records, field) {
  var vals = records.map(function(r) { return r[field]; }).filter(function(v) { return v != null && v > 0; });
  if (vals.length === 0) return 0;
  var sum = vals.reduce(function(a, b) { return a + b; }, 0);
  return sum / vals.length;
}

function setElText(sel, text) { var el = $(sel); if (el) el.textContent = text; }

/* ══════════════════════════════════════════════
   設定画面
   ══════════════════════════════════════════════ */
function initSettings() {
  // 名前変更
  var nameRow = $('#settingNameRow');
  if (nameRow) {
    nameRow.addEventListener('click', function() {
      var current = lsGet('userName', '');
      var newName = prompt('お名前を入力してください', current);
      if (newName !== null && newName.trim()) {
        lsSet('userName', newName.trim());
        showToast('お名前を更新しました');
      }
    });
  }

  // データエクスポート
  var exportRow = $('#exportDataRow');
  if (exportRow) {
    exportRow.addEventListener('click', function() {
      var records = getAllRecords();
      if (records.length === 0) { showToast('エクスポートする記録がありません'); return; }
      try {
        var keys = Object.keys(records[0]);
        var csv = keys.join(',') + '\n';
        records.forEach(function(r) {
          csv += keys.map(function(k) {
            var v = r[k];
            if (Array.isArray(v)) v = v.join(';');
            return '"' + (v != null ? String(v).replace(/"/g, '""') : '') + '"';
          }).join(',') + '\n';
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

  // 全データ削除
  var deleteRow = $('#deleteDataRow');
  if (deleteRow) {
    deleteRow.addEventListener('click', function() {
      if (!confirm('すべての記録を削除します。この操作は元に戻せません。本当によろしいですか？')) return;
      setAllRecords([]);
      showToast('すべての記録を削除しました');
    });
  }
}

/* ══════════════════════════════════════════════
   全イベントバインド
   ══════════════════════════════════════════════ */
function bindAllEvents() {

  /* ── ナビゲーションバー ── */

  $$('.nav-item').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var screen = btn.dataset.screen;
      if (screen) showScreen(screen);
    });
  });

  /* ── ウェルカム画面 ── */
  var nextBtn = $('#welcomeNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (welcomeSlide < 3) { goToSlide(welcomeSlide + 1); }
      else { completeOnboarding(); }
    });
  }
  var skipBtn = $('#welcomeSkipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', function() { goToSlide(3); });
  }

  /* ── ホーム画面：記録ボタン ── */
  ['homeRecordBtn', 'quickRecordBtn', 'fabRecordBtn'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', function() { showScreen('record'); });
    }
  });
  // data-screen="record" を持つ要素もバインド

  $$('[data-screen="record"]').forEach(function(el) {
    if (!el.classList.contains('nav-item')) {
      el.addEventListener('click', function() { showScreen('record'); });
    }
  });

  /* ── 記録タブ切替 ── */

  $$('.record-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      activateTab(tab.dataset.tab);
    });
  });

  /* ── チャクラ選択（グリッド） ── */

  $$('.chakra-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.chakra-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');
      // ビジュアルリストも連動

      $$('.chakra-visual-item').forEach(function(v) {
        v.classList.toggle('selected', v.dataset.chakra === el.dataset.chakra);
      });
    });
  });

  /* ── チャクラ選択（ビジュアルリスト） ── */

  $$('.chakra-visual-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.chakra-visual-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');

      $$('.chakra-item').forEach(function(v) {
        v.classList.toggle('selected', v.dataset.chakra === el.dataset.chakra);
      });
    });
  });

  /* ── チップ選択（複数可能：症状、体感、食材、断食体感） ── */

  $$('#symptomChips .chip, #bodyFeelChips .chip, #bodyFeelChips .body-feel-chip, #foodIngredientChips .chip, #fastingFeelChips .chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      chip.classList.toggle('selected');
    });
  });

  /* ── 食事タイム選択（単一） ── */

  $$('.food-time-card').forEach(function(card) {
    card.addEventListener('click', function() {

      $$('.food-time-card').forEach(function(c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    });
  });

  /* ── 断食目標選択（単一） ── */

  $$('.fasting-goal-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {

      $$('.fasting-goal-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      updateFastingDisplay();
    });
  });

  /* ── 感情選択（単一） ── */

  $$('.emotion-item').forEach(function(el) {
    el.addEventListener('click', function() {

      $$('.emotion-item').forEach(function(c) { c.classList.remove('selected'); });
      el.classList.add('selected');
    });
  });

  /* ── 体調スケール（単一） ── */

  $$('.condition-scale-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {

      $$('.condition-scale-btn').forEach(function(b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });
  });

  /* ── 月経周期チップ（単一） ── */

  $$('.cycle-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {

      $$('.cycle-chip').forEach(function(c) { c.classList.remove('selected'); });
      chip.classList.add('selected');
    });
  });

  /* ── Range スライダー ── */

  $$('input[type="range"]').forEach(function(range) {
    updateRangeGrad(range);
    range.addEventListener('input', function() {
      updateRangeGrad(range);
      // 対応する表示要素を更新
      var displayId = range.id + 'Display';
      var displayEl = document.getElementById(displayId);
      if (displayEl) displayEl.textContent = range.value;
    });
  });

  /* ── 断食時刻変更 ── */
  var fst = $('#fastingStartTime');
  var fen = $('#fastingEndTime');
  if (fst) fst.addEventListener('change', updateFastingDisplay);
  if (fen) fen.addEventListener('change', updateFastingDisplay);

  /* ── 断食タイマーボタン ── */
  var timerBtn = $('#fastingTimerBtn');
  if (timerBtn) {
    timerBtn.addEventListener('click', function() {
      if (fastingTimerInterval) { stopFastingTimer(); }
      else { startFastingTimer(); }
    });
  }

  /* ── 保存ボタン ── */
  var saveBtn = $('#saveRecordBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() { handleSave(); });
  }

  /* ── インサイト期間切替 ── */

  $$('.insight-period-btn, [data-period]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var period = parseInt(btn.dataset.period);
      if (period) {
        insightPeriod = period;

        $$('.insight-period-btn, [data-period]').forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        renderInsight();
      }
    });
  });

  /* ── 設定画面 ── */
  initSettings();
}

/* ══════════════════════════════════════════════
   アプリ初期化
   ══════════════════════════════════════════════ */
function initApp() {
  var onboarded = lsGet('onboarded', false);
  var nav = $('#appNav');

  if (onboarded) {
    // オンボーディング済み → ホーム画面
    if (nav) nav.style.display = 'flex';
    showScreen('home');
  } else {
    // 初回 → ウェルカム画面
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
    var btn = $('#fastingTimerBtn');
    if (btn) { btn.textContent = '断食を終了する'; btn.classList.add('btn-teal'); }
  }

  // 全イベントバインド
  bindAllEvents();
}

/* ── DOM 準備完了後に実行 ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
