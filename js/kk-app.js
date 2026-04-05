/* ============================================================
   kenkou kiroku APP — Main JavaScript
   「蓄積が意味を持つ体験設計」
   ============================================================ */

'use strict';

// ────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────
const TABLE_NAME = 'kk_records';
const STORAGE_PREFIX = 'kk_';

// チャクラ定義
const CHAKRA_DEFS = {
  root:       { name: '第1チャクラ（ルート）', color: '#E63FA8', area: '骨盤底・安心感・基盤', msg: '骨盤底からグランディング。安心感・安定感に関わるチャクラです。ここが重いときは「安全」の不安があるかもしれません。' },
  sacral:     { name: '第2チャクラ（サクラル）', color: '#FF9A4A', area: '子宮・卵巣・創造性', msg: '女性の生殖器官と最も深く関わる感覚の座。骨盤まわりの重さ・温かさ・創造的な感覚を観察しましょう。PMS・卵巣不調はここの感覚と関係することがあります。' },
  solar:      { name: '第3チャクラ（ソーラー）', color: '#F5D020', area: '腹部・自己肯定感', msg: '胃・腸・腹部を司るチャクラ。自己肯定感・意志力・行動力に関わります。ここが詰まると消化不良や腸の不調が起きやすくなります。' },
  heart:      { name: '第4チャクラ（ハート）', color: '#6BCB6B', area: '心臓・胸・感情と受容', msg: '感情を受け入れる感覚の座。自分へのやさしさ・からだの感覚を放す問いかけとも関わります。ここが和らぐとからだ全体が緩みます。' },
  throat:     { name: '第5チャクラ（スロート）', color: '#27B7B3', area: '喉・声・自己表現', msg: '自己表現・コミュニケーション・声のチャクラ。言いたいことが言えないと喉や肩が緊張します。' },
  third_eye:  { name: '第6チャクラ（サードアイ）', color: '#6C4A67', area: '眉間・直感・洞察', msg: '直感・洞察力・内なる知恵のチャクラ。自分のからだの声を聴く力と深くつながっています。' },
};

// 季節メッセージ定義
const SEASONAL_MESSAGES = {
  spring: [
    { text: 'からだの中に、新しい芽吹きを感じる季節です。\n無理せず、少しずつ動き出しましょう。', sub: '春・木の気 ― 肝臓・自律神経を整える時期' },
    { text: '春は気が上がりやすい季節。\n根菜や発酵食品でからだをグランディングさせましょう。', sub: '春分を過ぎたら、少しずつ緑の野菜を増やして。' },
  ],
  summer: [
    { text: '心臓とからだの熱を、やさしく冷ます時間を作りましょう。\n苦み野菜が夏のからだを助けます。', sub: '夏・火の気 ― 心臓・小腸を整える時期' },
    { text: '暑さでエネルギーを使いすぎていませんか？\n水分と塩分のバランスを意識しましょう。', sub: '夏至の頃は、特に睡眠の質を大切に。' },
  ],
  autumn: [
    { text: '秋は手放しの季節。\n肺・大腸を整え、古いものを解放する時間です。', sub: '秋・金の気 ― 肺・大腸を整える時期' },
    { text: '乾燥の季節、からだに潤いを与えましょう。\n白い食材（れんこん・梨・豆腐）が肺を助けます。', sub: '秋分の頃は、深呼吸とセルフケアを大切に。' },
  ],
  winter: [
    { text: '冬はからだを温め、内に向かう季節。\n腎臓を労わり、生命エネルギーを蓄えましょう。', sub: '冬・水の気 ― 腎臓・生殖器を整える時期' },
    { text: '冷えは万病のもと。\n特に骨盤まわりを温めることが、女性の不調を遠ざけます。', sub: '冬至の頃は、ゆっくり休むことも記録です。' },
  ],
};

// 蓄積マイルストーン
const MILESTONES = [
  { days: 3,  icon: '3',   text: '3日間記録が続きました',   sub: 'からだに関心を向け始めた、大切な一歩です。' },
  { days: 7,  icon: '7',   text: '7日間連続記録達成',       sub: 'からだのリズムが少しずつ見えてきました。' },
  { days: 14, icon: '14',  text: '2週間記録が続いています', sub: 'パターンが生まれつつあります。インサイトを確認してみましょう。' },
  { days: 21, icon: '21',  text: '21日間連続記録',          sub: '習慣が定着してきました。からだが変化を喜んでいます。' },
  { days: 30, icon: '30',  text: '1ヶ月達成',              sub: '30日分の記録があなたのからだのマップになりました。' },
  { days: 60, icon: '60',  text: '60日記録の軌跡',          sub: '月2サイクル分のデータが揃いました。ホルモンリズムが見えてきます。' },
  { days: 90, icon: '90',  text: '90日間の蓄積',            sub: '3ヶ月分の記録が、あなただけの健康の地図になりました。' },
  { days: 180, icon: '180', text: '半年の蓄積',             sub: '季節とからだの関係が、鮮やかに浮かび上がっています。' },
];

// パターン分析メッセージ
const PATTERN_MESSAGES = [
  { min: 7,  title: '食事の傾向', template: (avg) => `平均食事スコアは ${avg.toFixed(1)} 。${avg >= 7 ? '整えた食事が続いています。' : '根菜や発酵食品を増やすと、骨盤まわりが温まりやすくなります。'}` },
  { min: 7,  title: 'ウェルネスの波', template: (avg) => `ウェルネス平均 ${avg.toFixed(1)} 。${avg >= 6 ? 'からだの安定感が感じられます。' : '疲れが溜まりやすい傾向があります。睡眠と断食リズムを見直してみましょう。'}` },
  { min: 14, title: '断食リズム', template: (avg) => `断食スコア平均 ${avg.toFixed(1)} 。${avg >= 6 ? 'ファスティングのリズムが整ってきました。' : '断食中の体感に注目しながら、無理のないペースで続けましょう。'}` },
  { min: 21, title: 'チャクラのパターン', template: (chakra) => `最もよく記録しているのは「${CHAKRA_DEFS[chakra]?.name || chakra}」。このエリアへの意識が高まっています。` },
];

// ────────────────────────────────────────────────────────────
// STATE
// ────────────────────────────────────────────────────────────
const state = {
  currentScreen: 'welcome',
  userName: '',
  userCondition: [],
  fastingGoalHours: 14,
  reminderEnabled: false,
  startedAt: null,
  // 今日の記録（作業中）
  draft: {
    chakra: null,
    chakraIntensity: null,
    chakraScore: 5,
    chakraNotes: '',
    symptoms: [],
    foodTime: null,
    foodContent: '',
    bodyFeel: [],
    foodIngredients: [],
    foodScore: 5,
    foodNotes: '',
    fastingStart: '20:00',
    fastingEnd: '12:00',
    fastingGoalHours: 14,
    fastingFeel: [],
    fastingScore: 5,
    fastingNotes: '',
    emotion: null,
    wellnessScore: 5,
    energyScore: 5,
    emotionNotes: '',
    gratitude: '',
    conditionScale: null,
    conditionMemo: '',
  },
  // キャッシュされた全レコード
  records: [],
  charts: {},
};

// ────────────────────────────────────────────────────────────
// UTILS
// ────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function ls_get(key, def = null) {
  try { const v = localStorage.getItem(STORAGE_PREFIX + key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function ls_set(key, val) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val)); } catch {}
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function formatDate(dateStr, opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) {
  return new Date(dateStr).toLocaleDateString('ja-JP', opts);
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function getSeason() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5)  return 'spring';
  if (m >= 6 && m <= 8)  return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function getSeasonMessage() {
  const season = getSeason();
  const msgs = SEASONAL_MESSAGES[season];
  const idx = new Date().getDate() % msgs.length;
  return msgs[idx];
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 6)  return 'おやすみなさい';
  if (h < 11) return 'おはようございます';
  if (h < 17) return 'こんにちは';
  if (h < 21) return 'こんばんは';
  return 'おつかれさまです';
}

function showToast(msg, duration = 2500) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function calcFastingHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins   = eh * 60 + em;
  // 翌日をまたぐ場合
  if (endMins <= startMins) endMins += 24 * 60;
  const mins = endMins - startMins;
  return { hours: Math.floor(mins / 60), minutes: mins % 60, total: mins };
}

// ────────────────────────────────────────────────────────────
// TABLE API
// ────────────────────────────────────────────────────────────
async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}
async function apiPost(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json();
}
async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`DELETE ${path} → ${res.status}`);
}

async function fetchAllRecords() {
  try {
    const data = await apiGet(`tables/${TABLE_NAME}?limit=500&sort=record_date`);
    state.records = data.data || [];
    return state.records;
  } catch (e) {
    console.warn('Records fetch failed, using local cache', e);
    return state.records;
  }
}

async function saveRecord(draft) {
  const todayStr = today();
  // 同じ日付の既存レコードを確認
  const existing = state.records.find(r => r.record_date === todayStr);
  try {
    let saved;
    if (existing) {
      // PATCH で更新
      const res = await fetch(`tables/${TABLE_NAME}/${existing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      saved = await res.json();
    } else {
      saved = await apiPost(`tables/${TABLE_NAME}`, { ...draft, record_date: todayStr });
    }
    // キャッシュ更新
    const idx = state.records.findIndex(r => r.record_date === todayStr);
    if (idx >= 0) state.records[idx] = saved;
    else state.records.push(saved);
    return saved;
  } catch (e) {
    console.error('Save failed', e);
    throw e;
  }
}

// ────────────────────────────────────────────────────────────
// SCREEN NAVIGATION
// ────────────────────────────────────────────────────────────
function showScreen(name) {
  $$('.app-screen').forEach(s => s.classList.remove('active'));
  const target = $(`#screen-${name}`);
  if (target) {
    target.classList.add('active');
    state.currentScreen = name;
  }
  // ナビ状態
  $$('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === name);
  });
  // 各画面のonShow
  if (name === 'home')    renderHome();
  if (name === 'insight') renderInsight();
  if (name === 'record')  renderRecordHeader();
  if (name === 'settings') renderSettings();
}

// ────────────────────────────────────────────────────────────
// WELCOME SCREEN
// ────────────────────────────────────────────────────────────
let welcomeSlide = 0;
const WELCOME_TOTAL = 4;

function initWelcome() {
  updateWelcomeDots();
  updateWelcomeButtons();
}

function goToSlide(idx) {
  const slides = $$('.welcome-slide');
  slides.forEach((s, i) => {
    s.classList.remove('active', 'prev');
    if (i < idx) s.classList.add('prev');
    if (i === idx) s.classList.add('active');
  });
  welcomeSlide = idx;
  updateWelcomeDots();
  updateWelcomeButtons();
}

function updateWelcomeDots() {
  $$('.welcome-dot').forEach((d, i) => {
    d.classList.toggle('active', i === welcomeSlide);
  });
}

function updateWelcomeButtons() {
  const nextBtn = $('#welcomeNextBtn');
  const skipBtn = $('#welcomeSkipBtn');
  if (!nextBtn) return;
  if (welcomeSlide === 0) {
    nextBtn.textContent = 'はじめる';
    skipBtn.style.display = 'none';
  } else if (welcomeSlide < WELCOME_TOTAL - 1) {
    nextBtn.textContent = '次へ →';
    skipBtn.style.display = 'block';
    skipBtn.textContent = 'スキップ';
  } else {
    // 最終スライド（名前入力）
    nextBtn.textContent = 'アプリを使い始める';
    skipBtn.style.display = 'none';
  }
}

function completeOnboarding() {
  const nameInput = $('#welcomeNameInput');
  const name = (nameInput?.value.trim()) || 'あなた';
  state.userName = name;
  state.startedAt = today();
  ls_set('userName', name);
  ls_set('startedAt', today());
  ls_set('onboarded', true);
  $('#appNav').style.display = 'flex';
  showScreen('home');
}

// ────────────────────────────────────────────────────────────
// HOME SCREEN
// ────────────────────────────────────────────────────────────
function renderHome() {
  renderDateDisplay();
  renderGreeting();
  renderSeasonQuote();
  renderStats();
  renderWeekCalendar();
  renderTodaySummary();
  checkMilestone();
  renderChakraTestBanner();
}

// ── チャクラ診断テストバナー更新 ──
function renderChakraTestBanner() {
  const savedType  = localStorage.getItem('kk_chakra_test_type');
  const savedDate  = localStorage.getItem('kk_chakra_test_date');
  const titleEl    = $('#chakraTestBannerTitle');
  const descEl     = $('#chakraTestBannerDesc');
  if (!titleEl || !descEl) return;

  const TYPE_NAMES = {
    root:      'グランディングタイプ',
    sacral:    '女性性開花タイプ',
    solar:     '消化力回復タイプ',
    heart:     '愛と受容タイプ',
    throat:    '自己表現解放タイプ',
    thirdeye:  '直感・洞察覚醒タイプ',
    crown:     '全身統合・感情調和タイプ',
  };

  if (savedType && TYPE_NAMES[savedType]) {
    titleEl.textContent = `あなたのタイプ：${TYPE_NAMES[savedType]}`;
    descEl.textContent  = `診断日：${savedDate || '—'}　もう一度診断して変化を確認しましょう。`;
  }
}

function renderDateDisplay() {
  const el = $('#homeDateDisplay');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function getTimeSentence() {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'おはようございます。今日もからだの声に、耳を傾けてみましょう。';
  if (h >= 11 && h < 17) return 'こんにちは。今日のからだの調子は、いかがですか？';
  if (h >= 17 && h < 22) return 'おつかれさまです。今日一日の記録を、静かに振り返りましょう。';
  return '夜のひととき、今日のからだに"ありがとう"を。';
}

function renderGreeting() {
  const greetEl   = $('#homeGreetingText');
  const msgEl     = $('#homeGreetingMsg');
  const timeMsgEl = $('#homeTimeMsg');
  if (!greetEl) return;
  const greeting = getTimeGreeting();
  const name = state.userName || 'あなた';
  if (timeMsgEl) timeMsgEl.textContent = getTimeSentence();
  greetEl.textContent = `${greeting}、${name}さん`;
  // 記録状況に応じたメッセージ
  const todayRec = getTodayRecord();
  if (todayRec) {
    msgEl.textContent = '今日の記録が完了しています。インサイトで蓄積を確認してみましょう。';
  } else {
    const streak = calcStreak();
    if (streak > 0) {
      msgEl.textContent = `${streak}日連続記録中です。今日もからだの声を聴きましょう。`;
    } else {
      msgEl.textContent = 'からだの記録を始めましょう。毎日少しずつが、大切な蓄積になります。';
    }
  }
}

function renderSeasonQuote() {
  const card = $('#seasonQuoteCard');
  if (!card) return;
  const msg = getSeasonMessage();
  $('#seasonQuoteText').textContent = msg.text;
  $('#seasonQuoteSub').textContent = msg.sub;
}

function renderStats() {
  const streak  = calcStreak();
  const total   = state.records.length;
  const fastSum = calcWeekFastingTotal();

  const statStreak  = $('#statStreak');
  const statTotal   = $('#statTotal');
  const statFasting = $('#statFasting');
  if (statStreak)  statStreak.textContent  = streak;
  if (statTotal)   statTotal.textContent   = total;
  if (statFasting) statFasting.textContent = fastSum > 0 ? `${fastSum}h` : '—';
}

function renderWeekCalendar() {
  const container = $('#weekCalendar');
  if (!container) return;
  const days = ['日','月','火','水','木','金','土'];
  const today_d = new Date();
  const html = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today_d);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const hasRecord = state.records.some(r => r.record_date === dateStr);
    const isToday = i === 0;
    const cls = ['week-day', hasRecord ? 'recorded' : '', isToday ? 'today' : ''].filter(Boolean).join(' ');
    html.push(`
      <div class="${cls}" data-date="${dateStr}">
        <span class="week-day-label">${days[d.getDay()]}</span>
        <div class="week-day-circle">${d.getDate()}</div>
        <div class="week-day-dot"></div>
      </div>
    `);
  }
  container.innerHTML = html.join('');
}

function renderTodaySummary() {
  const rec = getTodayRecord();
  const emptyEl    = $('#todayEmptyState');
  const recordedEl = $('#todayRecordedState');
  const rowsEl     = $('#todayLogRows');
  if (!emptyEl || !recordedEl) return;

  if (!rec) {
    emptyEl.style.display = 'block';
    recordedEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  recordedEl.style.display = 'block';
  const rows = [];
  if (rec.chakra) {
    const ch = CHAKRA_DEFS[rec.chakra];
    rows.push({ icon: 'ch', cls: 'today-icon-chakra', label: 'チャクラ', value: ch?.name || rec.chakra });
  }
  if (rec.food_content) {
    rows.push({ icon: 'fo', cls: 'today-icon-food', label: '食事', value: rec.food_content.slice(0, 20) + (rec.food_content.length > 20 ? '…' : '') });
  }
  if (rec.fasting_hours) {
    rows.push({ icon: 'fa', cls: 'today-icon-fasting', label: 'プチ断食', value: `${rec.fasting_hours}h ${rec.fasting_minutes || 0}m` });
  }
  if (rec.emotion) {
    const labelMap = { peaceful: '穏やか・平和', happy: 'うれしい・満たされ', tired: '疲れ・重さ', anxious: '不安・緊張', irritated: 'イライラ・焦り' };
    rows.push({ icon: 'em', cls: 'today-icon-emotion', label: '感情', value: labelMap[rec.emotion] || rec.emotion });
  }
  if (rowsEl) {
    rowsEl.innerHTML = rows.map(r => `
      <div class="home-today-log-row">
        <div class="home-today-icon ${r.cls}">${r.icon}</div>
        <div>
          <div class="home-today-item-label">${r.label}</div>
          <div class="home-today-item-value">${r.value}</div>
        </div>
      </div>
    `).join('');
  }
}

function checkMilestone() {
  const banner = $('#milestoneBanner');
  if (!banner) return;
  const streak = calcStreak();
  const ms = MILESTONES.slice().reverse().find(m => streak >= m.days);
  const shown = ls_get('lastMilestone', 0);
  if (ms && ms.days > shown) {
    ls_set('lastMilestone', ms.days);
    $('#milestoneIcon').textContent = ms.icon;
    $('#milestoneText').textContent = ms.text;
    $('#milestoneSub').textContent  = ms.sub;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ────────────────────────────────────────────────────────────
// RECORD SCREEN
// ────────────────────────────────────────────────────────────
function renderRecordHeader() {
  const el = $('#recordDateDisplay');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  // 既存レコードがあればドラフトに読み込む
  const rec = getTodayRecord();
  if (rec) loadDraftFromRecord(rec);
}

function loadDraftFromRecord(rec) {
  if (rec.chakra)           selectChakra(rec.chakra);
  if (rec.chakra_intensity) selectIntensity(rec.chakra_intensity);
  if (rec.chakra_score)     setRangeValue('chakraScore', 'chakraScoreDisplay', rec.chakra_score);
  if (rec.chakra_notes)     setTextareaValue('chakraNote', rec.chakra_notes);
  if (rec.symptoms)         preSelectChips('symptomChips', rec.symptoms);
  if (rec.food_time)        selectFoodTime(rec.food_time);
  if (rec.food_content)     setTextareaValue('foodContent', rec.food_content);
  if (rec.body_feel)        preSelectChips('bodyFeelChips', rec.body_feel);
  if (rec.food_ingredients) preSelectChips('foodIngredientChips', rec.food_ingredients);
  if (rec.food_score)       setRangeValue('foodScore', 'foodScoreDisplay', rec.food_score);
  if (rec.food_notes)       setTextareaValue('foodNote', rec.food_notes);
  if (rec.fasting_start)    setInputValue('fastingStartTime', rec.fasting_start);
  if (rec.fasting_end)      setInputValue('fastingEndTime', rec.fasting_end);
  if (rec.fasting_goal_hours) selectFastingGoal(rec.fasting_goal_hours);
  if (rec.fasting_feel)     preSelectChips('fastingFeelChips', rec.fasting_feel);
  if (rec.fasting_score)    setRangeValue('fastingScore', 'fastingScoreDisplay', rec.fasting_score);
  if (rec.fasting_notes)    setTextareaValue('fastingNote', rec.fasting_notes);
  if (rec.emotion)          selectEmotion(rec.emotion);
  if (rec.wellness_score)   setRangeValue('wellnessScore', 'wellnessScoreDisplay', rec.wellness_score);
  if (rec.energy_score)     setRangeValue('energyScore', 'energyScoreDisplay', rec.energy_score);
  if (rec.emotion_notes)    setTextareaValue('emotionNote', rec.emotion_notes);
  if (rec.gratitude)        setInputValue('gratitudeNote', rec.gratitude);
  updateFastingDisplay();
}

function setTextareaValue(id, val) { const el = $(`#${id}`); if (el) el.value = val; }
function setInputValue(id, val)    { const el = $(`#${id}`); if (el) el.value = val; }
function setRangeValue(rangeId, displayId, val) {
  const el = $(`#${rangeId}`); if (el) { el.value = val; updateRangeGrad(el); }
  const d  = $(`#${displayId}`); if (d) d.textContent = val;
}

function preSelectChips(groupId, values) {
  if (!values) return;
  const arr = Array.isArray(values) ? values : (typeof values === 'string' ? values.split(',') : []);
  arr.forEach(v => {
    const chip = $(`#${groupId} [data-val="${v.trim()}"]`);
    if (chip) chip.classList.add('selected');
  });
}

function selectFoodTime(val) {
  $$('#foodTimeSelector .food-time-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.time === val);
  });
  state.draft.foodTime = val;
}

function selectFastingGoal(hours) {
  $$('#fastingGoalSelect .fasting-goal-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.hours) === parseInt(hours));
  });
  state.draft.fastingGoalHours = parseInt(hours);
}

function buildDraftFromUI() {
  // チャクラ
  const chakraEl = $('#chakraSelector .chakra-item.selected');
  state.draft.chakra = chakraEl?.dataset.chakra || null;
  const intensityEl = $('#chakraIntensityRow .intensity-btn.selected');
  state.draft.chakraIntensity = intensityEl?.dataset.val || null;
  const csEl = $('#chakraScore'); state.draft.chakraScore = csEl ? parseInt(csEl.value) : 5;
  state.draft.chakraNotes = $('#chakraNote')?.value.trim() || '';
  state.draft.symptoms = $$('#symptomChips .chip.selected').map(c => c.dataset.val);

  // 食事
  const foodTimeEl = $('#foodTimeSelector .food-time-card.selected');
  state.draft.foodTime = foodTimeEl?.dataset.time || null;
  state.draft.foodContent = $('#foodContent')?.value.trim() || '';
  state.draft.bodyFeel = $$('#bodyFeelChips .body-feel-chip.selected').map(c => c.dataset.val);
  state.draft.foodIngredients = $$('#foodIngredientChips .chip.selected').map(c => c.dataset.val);
  const fsEl = $('#foodScore'); state.draft.foodScore = fsEl ? parseInt(fsEl.value) : 5;
  state.draft.foodNotes = $('#foodNote')?.value.trim() || '';

  // 断食
  state.draft.fastingStart = $('#fastingStartTime')?.value || '20:00';
  state.draft.fastingEnd   = $('#fastingEndTime')?.value   || '12:00';
  const goalBtn = $('#fastingGoalSelect .fasting-goal-btn.selected');
  state.draft.fastingGoalHours = goalBtn ? parseInt(goalBtn.dataset.hours) : 14;
  state.draft.fastingFeel  = $$('#fastingFeelChips .chip.selected').map(c => c.dataset.val);
  const fscEl = $('#fastingScore'); state.draft.fastingScore = fscEl ? parseInt(fscEl.value) : 5;
  state.draft.fastingNotes = $('#fastingNote')?.value.trim() || '';

  // 感情
  const emoEl = $('#emotionSelector .emotion-item.selected');
  state.draft.emotion = emoEl?.dataset.emotion || null;
  const wsEl = $('#wellnessScore'); state.draft.wellnessScore = wsEl ? parseInt(wsEl.value) : 5;
  const esEl = $('#energyScore');   state.draft.energyScore   = esEl ? parseInt(esEl.value) : 5;
  state.draft.emotionNotes = $('#emotionNote')?.value.trim() || '';
  state.draft.gratitude    = $('#gratitudeNote')?.value.trim() || '';
}

function draftToRecord() {
  const fasting = calcFastingHours(state.draft.fastingStart, state.draft.fastingEnd);
  return {
    record_date:       today(),
    chakra:            state.draft.chakra,
    chakra_intensity:  state.draft.chakraIntensity,
    chakra_score:      state.draft.chakraScore,
    chakra_notes:      state.draft.chakraNotes,
    symptoms:          state.draft.symptoms,
    food_time:         state.draft.foodTime,
    food_content:      state.draft.foodContent,
    body_feel:         state.draft.bodyFeel,
    food_ingredients:  state.draft.foodIngredients,
    food_score:        state.draft.foodScore,
    food_notes:        state.draft.foodNotes,
    fasting_start:     state.draft.fastingStart,
    fasting_end:       state.draft.fastingEnd,
    fasting_goal_hours: state.draft.fastingGoalHours,
    fasting_hours:     fasting.hours,
    fasting_minutes:   fasting.minutes,
    fasting_feel:      state.draft.fastingFeel,
    fasting_score:     state.draft.fastingScore,
    fasting_notes:     state.draft.fastingNotes,
    emotion:           state.draft.emotion,
    wellness_score:    state.draft.wellnessScore,
    energy_score:      state.draft.energyScore,
    emotion_notes:     state.draft.emotionNotes,
    gratitude:         state.draft.gratitude,
  };
}

async function handleSaveRecord() {
  buildDraftFromUI();
  const record = draftToRecord();
  const saveBtn = $('#saveRecordBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中…'; }
  try {
    await saveRecord(record);
    showToast('記録が保存されました');
    showScreen('home');
    // フィードバックトリガーチェック（少し遅延）
    setTimeout(checkFeedbackTrigger, 1500);
  } catch (e) {
    showToast('保存に失敗しました。もう一度お試しください。');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '記録を保存する'; }
  }
}

// ── チャクラ選択 ──
function selectChakra(key) {
  $$('.chakra-item').forEach(el => el.classList.remove('selected'));
  const target = $(`.chakra-item[data-chakra="${key}"]`);
  if (target) target.classList.add('selected');
  state.draft.chakra = key;
  // 詳細表示
  const detail = $('#chakraDetail');
  const detailText = $('#chakraDetailText');
  if (detail && detailText && CHAKRA_DEFS[key]) {
    detailText.textContent = CHAKRA_DEFS[key].msg;
    detail.style.display = 'block';
  }
  const intensityGroup = $('#chakraIntensityGroup');
  const scoreGroup     = $('#chakraScoreGroup');
  const noteGroup      = $('#chakraNoteGroup');
  if (intensityGroup) intensityGroup.style.display = 'block';
  if (scoreGroup)     scoreGroup.style.display = 'block';
  if (noteGroup)      noteGroup.style.display = 'block';
}

function selectIntensity(val) {
  $$('.intensity-btn').forEach(b => b.classList.remove('selected'));
  const btn = $(`.intensity-btn[data-val="${val}"]`);
  if (btn) btn.classList.add('selected');
}

function selectEmotion(val) {
  $$('.emotion-item').forEach(el => el.classList.remove('selected'));
  const target = $(`.emotion-item[data-emotion="${val}"]`);
  if (target) target.classList.add('selected');
  state.draft.emotion = val;
}

// ── 断食タイマー表示 ──
function updateFastingDisplay() {
  const start = $('#fastingStartTime')?.value || '20:00';
  const end   = $('#fastingEndTime')?.value   || '12:00';
  const { hours, minutes, total } = calcFastingHours(start, end);
  const displayTime = $('#fastingDisplayTime');
  const displayLabel = $('#fastingDisplayLabel');
  const status  = $('#fastingStatus');
  if (displayTime) displayTime.textContent = `${hours}h ${minutes}m`;

  const goalBtn = $('#fastingGoalSelect .fasting-goal-btn.selected');
  const goal = goalBtn ? parseInt(goalBtn.dataset.hours) * 60 : 14 * 60;
  const pct  = Math.min(total / goal, 1);

  const ring = $('#fastingRingFill');
  if (ring) {
    const circ = 2 * Math.PI * 65;
    ring.style.strokeDasharray  = circ;
    ring.style.strokeDashoffset = circ * (1 - pct);
  }
  if (displayLabel) displayLabel.textContent = total >= goal ? '達成' : '断食時間';
  if (status) {
    if (total === 0) {
      status.textContent = '食事時刻を設定してください';
    } else if (total >= goal) {
      status.textContent = 'おつかれさまでした。からだが喜んでいるかもしれません。';
    } else {
      status.textContent = `あと ${Math.floor(goal/60) - hours}h ${60 - minutes === 60 ? 0 : 60 - minutes}m で目標達成`;
    }
  }
}

// ────────────────────────────────────────────────────────────
// INSIGHT SCREEN
// ────────────────────────────────────────────────────────────
let activePeriod = 7;

function renderInsight() {
  const records = getRecordsInPeriod(activePeriod);
  renderInsightAIMessage(records);
  renderInsightStats(records);
  renderInsightCharts(records);
  renderInsightPatterns(records);
  renderAccumulationMessage();
}

function getRecordsInPeriod(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return state.records.filter(r => r.record_date >= cutoffStr);
}

function renderInsightAIMessage(records) {
  const textEl = $('#insightAIText');
  const subEl  = $('#insightAISub');
  if (!textEl) return;
  if (records.length === 0) {
    textEl.textContent = '記録が積み重なると、ここにあなただけのパターンメッセージが届きます。';
    if (subEl) subEl.textContent = '';
    return;
  }
  // 簡易パターン分析
  const avgWellness = avg(records.map(r => r.wellness_score).filter(Boolean));
  const avgFood     = avg(records.map(r => r.food_score).filter(Boolean));
  const emotion     = mostFrequent(records.map(r => r.emotion).filter(Boolean));
  const msgs = [];
  if (avgWellness >= 7) msgs.push('ウェルネスが高く保たれています。からだの安定感が感じられる期間です。');
  else if (avgWellness >= 5) msgs.push('ウェルネスは中程度。睡眠・食事・断食のリズムを意識すると、さらに整いやすくなります。');
  else msgs.push('からだが休息を必要としているかもしれません。無理せず、回復を優先しましょう。');
  if (avgFood >= 7) msgs.push('食事の質が安定しています。ホルモンバランスに良い影響が期待できます。');
  if (emotion === 'tired' || emotion === 'anxious') msgs.push('疲れや不安を感じる日が続いています。深呼吸と温かい飲み物で、自律神経を整えましょう。');
  textEl.textContent = msgs.join('\n\n');
  if (subEl) subEl.textContent = `過去 ${activePeriod} 日間の記録 (${records.length}件) から`;
}

function renderInsightStats(records) {
  const total   = state.records.length;
  const maxStr  = calcMaxStreak();
  const avgFood = avg(records.map(r => r.food_score).filter(Boolean));
  const avgWell = avg(records.map(r => r.wellness_score).filter(Boolean));

  setElText('#insightTotalDays', total + '日');
  setElText('#insightMaxStreak', maxStr + '日');
  setElText('#insightAvgFood',    avgFood ? avgFood.toFixed(1) : '—');
  setElText('#insightAvgWellness', avgWell ? avgWell.toFixed(1) : '—');
  setElText('#insightHeroDesc',   `${total}日分の記録が蓄積されています。${total >= 7 ? 'パターンが見えてきました。' : 'あと' + (7 - total) + '日で、パターン分析が始まります。'}`);
}

function setElText(sel, text) { const el = $(sel); if (el) el.textContent = text; }

function renderInsightCharts(records) {
  renderWellnessChart(records);
  renderFoodChart(records);
  renderChakraChart(records);
}

function renderWellnessChart(records) {
  const ctx = $('#wellnessChart');
  if (!ctx) return;
  if (state.charts.wellness) state.charts.wellness.destroy();
  if (records.length === 0) { ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height); return; }
  const sorted = [...records].sort((a,b) => a.record_date.localeCompare(b.record_date));
  const labels  = sorted.map(r => formatDateShort(r.record_date));
  const wellness = sorted.map(r => r.wellness_score || null);
  const energy   = sorted.map(r => r.energy_score   || null);
  state.charts.wellness = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'ウェルネス', data: wellness, borderColor: '#E63FA8', backgroundColor: 'rgba(230,63,168,0.08)', tension: 0.4, pointRadius: 3, pointBackgroundColor: '#E63FA8', borderWidth: 2 },
        { label: 'エネルギー', data: energy,   borderColor: '#27B7B3', backgroundColor: 'rgba(39,183,179,0.08)',  tension: 0.4, pointRadius: 3, pointBackgroundColor: '#27B7B3', borderWidth: 2 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 }, color: '#6B5468' } } },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#A090A0' }, grid: { color: 'rgba(108,74,103,0.05)' } },
        y: { min: 1, max: 10, ticks: { font: { size: 9 }, color: '#A090A0', stepSize: 2 }, grid: { color: 'rgba(108,74,103,0.05)' } },
      },
    },
  });
}

function renderFoodChart(records) {
  const ctx = $('#foodChart');
  if (!ctx) return;
  if (state.charts.food) state.charts.food.destroy();
  if (records.length === 0) return;
  const sorted = [...records].sort((a,b) => a.record_date.localeCompare(b.record_date));
  const labels = sorted.map(r => formatDateShort(r.record_date));
  const food   = sorted.map(r => r.food_score || null);
  state.charts.food = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '食事スコア',
        data: food,
        backgroundColor: sorted.map(r => (r.food_score || 0) >= 7 ? 'rgba(39,183,179,0.7)' : 'rgba(39,183,179,0.3)'),
        borderColor: '#27B7B3',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { font: { size: 9 }, color: '#A090A0' }, grid: { display: false } },
        y: { min: 0, max: 10, ticks: { font: { size: 9 }, color: '#A090A0', stepSize: 2 }, grid: { color: 'rgba(108,74,103,0.05)' } },
      },
    },
  });
}

function renderChakraChart(records) {
  const ctx = $('#chakraChart');
  if (!ctx) return;
  if (state.charts.chakra) state.charts.chakra.destroy();
  if (records.length === 0) return;
  const counts = {};
  records.forEach(r => { if (r.chakra) counts[r.chakra] = (counts[r.chakra] || 0) + 1; });
  const labels = Object.keys(counts).map(k => CHAKRA_DEFS[k]?.name || k);
  const data   = Object.values(counts);
  const colors = Object.keys(counts).map(k => CHAKRA_DEFS[k]?.color || '#E63FA8');
  state.charts.chakra = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors.map(c => c + 'CC'), borderColor: colors, borderWidth: 2 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, color: '#6B5468', padding: 8 } } },
    },
  });
}

function renderInsightPatterns(records) {
  const container = $('#insightPatternCards');
  if (!container) return;
  if (records.length < 7) {
    container.innerHTML = `
      <div class="insight-pattern-card">
        <div class="insight-pattern-head">
          <span class="insight-pattern-icon">🌱</span>
          <span class="insight-pattern-title">記録を続けてみましょう</span>
        </div>
        <p class="insight-pattern-text">7日以上記録すると、あなただけのパターンが分析されます。あと${7 - records.length}日分記録してみましょう。</p>
      </div>`;
    return;
  }
  const patterns = [];
  const avgFood    = avg(records.map(r => r.food_score).filter(Boolean));
  const avgWell    = avg(records.map(r => r.wellness_score).filter(Boolean));
  const avgFasting = avg(records.map(r => r.fasting_score).filter(Boolean));
  const topChakra  = mostFrequent(records.map(r => r.chakra).filter(Boolean));

  if (avgFood)    patterns.push({ title: '食事の傾向',    text: `食事スコア平均 ${avgFood.toFixed(1)} 。${avgFood >= 7 ? '整えた食事が続いています。ホルモンバランスへの好影響が期待できます。' : '根菜・発酵食品・温かい食事を増やすことで、骨盤まわりの血流が改善されやすくなります。'}` });
  if (avgWell)    patterns.push({ title: 'ウェルネスの波', text: `ウェルネス平均 ${avgWell.toFixed(1)} 。${avgWell >= 6 ? 'からだの安定感が感じられます。' : '疲れが溜まりやすい傾向があります。断食・睡眠・食事のリズムを見直してみましょう。'}` });
  if (avgFasting) patterns.push({ title: '断食リズム',    text: `断食スコア平均 ${avgFasting.toFixed(1)} 。${avgFasting >= 6 ? 'ファスティングのリズムが整ってきました。内臓休息がからだを浄化しています。' : '女性のからだに合わせた12〜14時間断食から、無理なく始めましょう。'}` });
  if (topChakra)  patterns.push({ title: 'チャクラのパターン', text: `最もよく記録されているのは「${CHAKRA_DEFS[topChakra]?.name || topChakra}」（${CHAKRA_DEFS[topChakra]?.area}）。このエリアへの意識と直感が高まっています。` });

  container.innerHTML = patterns.map(p => `
    <div class="insight-pattern-card">
      <div class="insight-pattern-head">
        <span class="insight-pattern-title">${p.title}</span>
      </div>
      <p class="insight-pattern-text">${p.text}</p>
    </div>
  `).join('');
}

function renderAccumulationMessage() {
  const msgEl  = $('#accumulationMsg');
  const subEl  = $('#accumulationSubMsg');
  if (!msgEl) return;
  const total = state.records.length;
  if (total === 0) {
    msgEl.innerHTML = '記録を始めましょう。<br>最初の一歩が、すべてのはじまりです。';
  } else if (total < 7) {
    msgEl.innerHTML = `${total}日分の記録が始まりました。<br>7日続けると、最初のパターンが見えてきます。`;
  } else if (total < 30) {
    msgEl.innerHTML = `${total}日分の記録が積み重なっています。<br>からだのリズムが少しずつ見えてきました。`;
  } else if (total < 90) {
    msgEl.innerHTML = `${total}日分の記録が蓄積されています。<br>月のリズムとからだの波が、鮮やかに見えてきます。`;
  } else {
    msgEl.innerHTML = `${total}日間、記録を続けています。<br>あなただけの健康の地図が、ここにあります。`;
  }
  if (subEl) subEl.textContent = state.records.length > 0 ? `最初の記録: ${formatDate(state.records[0]?.record_date || today(), {year:'numeric', month:'long', day:'numeric'})}` : '';
}

// ────────────────────────────────────────────────────────────
// SETTINGS SCREEN
// ────────────────────────────────────────────────────────────
function renderSettings() {
  const name  = state.userName || 'あなた';
  const since = state.startedAt;
  setElText('#settingsName', name);
  setElText('#settingNameValue', name);
  if (since) {
    setElText('#settingsSince', `開始日: ${formatDate(since, { year:'numeric', month:'long', day:'numeric' })} — ${state.records.length}日分の記録`);
  }
  setElText('#settingFastingGoalValue', `${state.fastingGoalHours}h`);
  const toggle = $('#reminderToggle');
  if (toggle) toggle.checked = state.reminderEnabled;
}

// ────────────────────────────────────────────────────────────
// CALC HELPERS
// ────────────────────────────────────────────────────────────
function getTodayRecord() {
  return state.records.find(r => r.record_date === today()) || null;
}

function calcStreak() {
  if (state.records.length === 0) return 0;
  const dates = new Set(state.records.map(r => r.record_date));
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = d.toISOString().slice(0, 10);
    if (dates.has(ds)) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function calcMaxStreak() {
  if (state.records.length === 0) return 0;
  const dates = state.records.map(r => r.record_date).sort();
  let max = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / 86400000;
    if (diff === 1) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

function calcWeekFastingTotal() {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const weekRecs = state.records.filter(r => r.record_date >= cutoffStr);
  return weekRecs.reduce((s, r) => s + (r.fasting_hours || 0), 0);
}

function avg(arr) {
  if (!arr || arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function mostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  const freq = {};
  arr.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}

// ────────────────────────────────────────────────────────────
// RANGE GRADIENT UPDATE
// ────────────────────────────────────────────────────────────
function updateRangeGrad(input) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 10;
  const val = parseFloat(input.value);
  const pct = ((val - min) / (max - min)) * 100;
  input.style.background = `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, var(--border) ${pct}%)`;
}

// ────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ────────────────────────────────────────────────────────────
function initEventListeners() {

  // ── Welcome ──
  $('#welcomeNextBtn')?.addEventListener('click', () => {
    if (welcomeSlide < WELCOME_TOTAL - 1) goToSlide(welcomeSlide + 1);
    else completeOnboarding();
  });
  $('#welcomeSkipBtn')?.addEventListener('click', () => completeOnboarding());
  $('#welcomeNameInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') completeOnboarding(); });

  // ── Bottom Nav ──
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen) showScreen(screen);
    });
  });

  // ── Home ──
  $('#homeRecordBtn')?.addEventListener('click', () => showScreen('record'));
  $('#quickRecordBtn')?.addEventListener('click', () => showScreen('record'));

  // ── Record tabs ──
  $$('.record-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.record-tab').forEach(t => t.classList.remove('active'));
      $$('.record-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = $(`#panel-${tab.dataset.tab}`);
      if (panel) panel.classList.add('active');
    });
  });

  // ── Chakra ──
  $$('.chakra-item').forEach(item => {
    item.addEventListener('click', () => selectChakra(item.dataset.chakra));
    item.addEventListener('keypress', e => { if (e.key === 'Enter' || e.key === ' ') selectChakra(item.dataset.chakra); });
  });

  // ── Intensity ──
  $$('.intensity-btn').forEach(btn => {
    btn.addEventListener('click', () => selectIntensity(btn.dataset.val));
  });

  // ── Food time ──
  $$('.food-time-card').forEach(card => {
    card.addEventListener('click', () => selectFoodTime(card.dataset.time));
  });

  // ── Body feel chips ──
  $$('#bodyFeelChips .body-feel-chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('selected'));
  });

  // ── Symptom chips ──
  $$('#symptomChips .chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('selected'));
  });

  // ── Food ingredient chips ──
  $$('#foodIngredientChips .chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('selected'));
  });

  // ── Fasting feel chips ──
  $$('#fastingFeelChips .chip').forEach(c => {
    c.addEventListener('click', () => c.classList.toggle('selected'));
  });

  // ── Fasting goal ──
  $$('.fasting-goal-btn').forEach(btn => {
    btn.addEventListener('click', () => selectFastingGoal(btn.dataset.hours));
  });

  // ── Fasting time inputs ──
  ['fastingStartTime', 'fastingEndTime'].forEach(id => {
    $(`#${id}`)?.addEventListener('change', updateFastingDisplay);
  });

  // ── Emotion ──
  $$('.emotion-item').forEach(el => {
    el.addEventListener('click', () => selectEmotion(el.dataset.emotion));
  });

  // ── Range sliders ──
  [
    { rangeId: 'chakraScore',    displayId: 'chakraScoreDisplay' },
    { rangeId: 'foodScore',      displayId: 'foodScoreDisplay' },
    { rangeId: 'fastingScore',   displayId: 'fastingScoreDisplay' },
    { rangeId: 'wellnessScore',  displayId: 'wellnessScoreDisplay' },
    { rangeId: 'energyScore',    displayId: 'energyScoreDisplay' },
  ].forEach(({ rangeId, displayId }) => {
    const input = $(`#${rangeId}`);
    const disp  = $(`#${displayId}`);
    if (!input) return;
    const update = () => {
      if (disp) disp.textContent = input.value;
      updateRangeGrad(input);
    };
    input.addEventListener('input', update);
    update();
  });

  // ── Save record ──
  $('#saveRecordBtn')?.addEventListener('click', handleSaveRecord);
  $('#recordSaveBtn')?.addEventListener('click', handleSaveRecord);

  // ── Insight period tabs ──
  $$('.insight-period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.insight-period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activePeriod = parseInt(tab.dataset.period);
      renderInsight();
    });
  });

  // ── Settings ──
  $('#settingNameRow')?.addEventListener('click', () => {
    const name = prompt('お名前を入力してください', state.userName);
    if (name !== null && name.trim()) {
      state.userName = name.trim();
      ls_set('userName', state.userName);
      renderSettings();
      showToast('✅ お名前を更新しました');
    }
  });

  $('#settingFastingGoalRow')?.addEventListener('click', () => {
    const hours = prompt('目標断食時間を入力（例: 14）', state.fastingGoalHours);
    const h = parseInt(hours);
    if (!isNaN(h) && h >= 8 && h <= 24) {
      state.fastingGoalHours = h;
      ls_set('fastingGoalHours', h);
      renderSettings();
      showToast(`断食目標を ${h}h に設定しました`);
    }
  });

  $('#reminderToggle')?.addEventListener('change', e => {
    state.reminderEnabled = e.target.checked;
    ls_set('reminderEnabled', e.target.checked);
    showToast(e.target.checked ? 'リマインダーをONにしました' : 'リマインダーをOFFにしました');
  });

  $('#exportDataRow')?.addEventListener('click', exportData);
  $('#deleteDataRow')?.addEventListener('click', confirmDeleteAll);

  // ── Scroll header effect ──
  ['homeContent'].forEach(id => {
    const el = $(`#${id}`);
    const header = $(`#${id.replace('Content','Header')}`);
    el?.addEventListener('scroll', () => {
      if (!header) return;
      header.classList.toggle('scrolled', el.scrollTop > 10);
    });
  });
}

// ────────────────────────────────────────────────────────────
// DATA EXPORT
// ────────────────────────────────────────────────────────────
function exportData() {
  const csv = buildCSV(state.records);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `kenkou-kiroku-${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📤 CSVエクスポートが完了しました');
}

function buildCSV(records) {
  const headers = ['日付','チャクラ','チャクラスコア','食事内容','食事スコア','断食時間(h)','断食スコア','感情','ウェルネス','エネルギー','感謝'];
  const rows = records.map(r => [
    r.record_date,
    CHAKRA_DEFS[r.chakra]?.name || r.chakra || '',
    r.chakra_score || '',
    (r.food_content || '').replace(/,/g, '、'),
    r.food_score || '',
    r.fasting_hours || '',
    r.fasting_score || '',
    r.emotion || '',
    r.wellness_score || '',
    r.energy_score || '',
    (r.gratitude || '').replace(/,/g, '、'),
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}

async function confirmDeleteAll() {
  const confirmed = confirm('⚠️ すべての記録を削除します。この操作は元に戻せません。本当によろしいですか？');
  if (!confirmed) return;
  try {
    for (const rec of state.records) {
      await apiDelete(`tables/${TABLE_NAME}/${rec.id}`);
    }
    state.records = [];
    ls_set('lastMilestone', 0);
    showToast('🗑 すべての記録を削除しました');
    renderHome();
    renderSettings();
  } catch (e) {
    showToast('削除に失敗しました。もう一度お試しください。');
  }
}

// ────────────────────────────────────────────────────────────
// FEEDBACK SYSTEM
// ────────────────────────────────────────────────────────────

const FORMSPREE_ID = 'xjgpelwv';

// トリガー定義
// trigger_type ごとに { emoji, label, title, subtitle, q1, q2, q3, chips } を設定
const FEEDBACK_TRIGGERS = {
  first_record: {
    emoji:    '',
    label:    'first record',
    title:    'はじめての記録、ありがとうございます',
    subtitle: '使い心地はいかがでしたか？\n30秒でお答えいただけると嬉しいです。',
    q1:       'はじめて使ってみて、どう感じましたか？',
    q2:       '特に感じたことを選んでください（複数OK）',
    q3:       'ほかに気になったことがあれば教えてください',
    chips:    ['使い方がわかりやすかった', 'チャクラの説明が良かった', '入力しやすかった', '画面がきれい', '何を入力すれば良いかわからなかった', '項目が多すぎる', 'もっとシンプルにしてほしい', 'ほかのアプリと似ている'],
  },
  streak_3: {
    emoji:    '',
    label:    '3 days streak',
    title:    '3日間続いています！',
    subtitle: '続けられている理由を教えてください。\nあなたの声がアプリをより良くします。',
    q1:       '3日間続けて、アプリの印象はどうですか？',
    q2:       '続けられている理由は何ですか？（複数OK）',
    q3:       'これから追加してほしい機能はありますか？',
    chips:    ['記録が習慣になってきた', 'からだへの気づきが増えた', 'チャクラの観察が面白い', '断食タイマーが使いやすい', '食事を意識するようになった', 'インサイトが気になって続けている', 'デザインが好き'],
  },
  streak_7: {
    emoji:    '',
    label:    '7 days streak',
    title:    '7日間連続記録達成！',
    subtitle: '1週間分の記録が溜まりました。\nからだに変化はありましたか？',
    q1:       '7日間使ってみて、アプリの満足度は？',
    q2:       '1週間で気づいたことを選んでください（複数OK）',
    q3:       '改善してほしい点・追加してほしいことがあれば',
    chips:    ['からだのパターンが見えてきた', '食事への意識が変わった', 'プチ断食が続けやすくなった', 'チャクラ観察が日課になった', 'インサイトのグラフが役立っている', '感情記録が自分を知る助けになっている', 'もっと分析機能が欲しい', '生理周期も記録したい'],
  },
  streak_30: {
    emoji:    '',
    label:    '30 days milestone',
    title:    '1ヶ月間、記録が続いています',
    subtitle: '30日分のデータが積み上がりました。\nからだに変化はありましたか？',
    q1:       '1ヶ月使い続けて、総合的な満足度は？',
    q2:       '1ヶ月でからだに変化はありましたか？（複数OK）',
    q3:       '友人にすすめるとしたら、どう紹介しますか？',
    chips:    ['からだの不調が減った気がする', '食事の質が上がった', '断食が習慣化した', '自分のリズムがわかってきた', 'ウェルネスの波が見えてきた', '感情とからだの関係に気づいた', '変化はまだ感じていない', '記録自体が心地よい時間になった'],
  },
  lapsed_3: {
    emoji:    '',
    label:    'we miss you',
    title:    'しばらく記録が途切れていました',
    subtitle: '記録が難しかった理由を教えてください。\nアプリをもっと続けやすくするためのヒントにします。',
    q1:       '記録が途切れた時期、アプリへの印象は？',
    q2:       '記録が難しかった理由は？（複数OK）',
    q3:       '「これがあれば続けられた」というものはありますか？',
    chips:    ['毎日開くのを忘れてしまった', '入力が面倒に感じた', '記録する項目が多すぎた', '効果が感じられなかった', '体調が悪くて記録できなかった', 'リマインダーがあれば良かった', '記録するタイミングが難しい', '何を記録すればいいかわからなくなった'],
  },
  manual: {
    emoji:    '',
    label:    'feedback',
    title:    'ご意見・ご感想をお聞かせください',
    subtitle: 'いただいた声を大切に、\nアプリをより良くしていきます。',
    q1:       'このアプリへの満足度は？',
    q2:       '特に良いと感じる点を選んでください（複数OK）',
    q3:       '改善・追加してほしいことがあれば、自由に書いてください',
    chips:    ['デザインが好き', 'チャクラ観察が面白い', '食事記録が使いやすい', '断食タイマーが役立つ', 'インサイトグラフが見やすい', '季節メッセージが心地よい', '蓄積の実感が持てる', '操作がシンプル'],
  },
};

// フィードバックの状態
const fbState = {
  currentStep:  1,
  triggerType:  'manual',
  selectedRating: null,
  selectedReasons: [],
};

// ── トリガー判定（記録保存後・画面表示時に呼ぶ） ──
function checkFeedbackTrigger() {
  const total  = state.records.length;
  const streak = calcStreak();

  // 既に表示済みのトリガーは再表示しない
  const shown = ls_get('fb_shown', []);

  // 優先順位順に判定
  if (total === 1 && !shown.includes('first_record')) {
    // 初回記録直後（少し遅延してから表示）
    setTimeout(() => openFeedbackModal('first_record'), 3000);
    return;
  }
  if (streak === 3 && !shown.includes('streak_3')) {
    setTimeout(() => openFeedbackModal('streak_3'), 2000);
    return;
  }
  if (streak === 7 && !shown.includes('streak_7')) {
    setTimeout(() => openFeedbackModal('streak_7'), 2000);
    return;
  }
  if (streak === 30 && !shown.includes('streak_30')) {
    setTimeout(() => openFeedbackModal('streak_30'), 2000);
    return;
  }
  // 3日途切れチェック（streak=0 かつ 前回記録から3日以上）
  if (streak === 0 && !shown.includes('lapsed_3') && total > 3) {
    const lastRec = state.records[state.records.length - 1];
    if (lastRec) {
      const lastDate = new Date(lastRec.record_date);
      const diff = (new Date() - lastDate) / 86400000;
      if (diff >= 3) {
        setTimeout(() => openFeedbackModal('lapsed_3'), 4000);
      }
    }
  }
}

// ── モーダルを開く ──
function openFeedbackModal(triggerType = 'manual') {
  const def = FEEDBACK_TRIGGERS[triggerType] || FEEDBACK_TRIGGERS.manual;
  fbState.triggerType     = triggerType;
  fbState.currentStep     = 1;
  fbState.selectedRating  = null;
  fbState.selectedReasons = [];

  // hidden fields
  setInputValue('fbTriggerType',  triggerType);
  setInputValue('fbRecordCount',  String(state.records.length));
  setInputValue('fbStreakDays',   String(calcStreak()));
  setInputValue('fbRating',       '');
  setInputValue('fbReason',       '');

  // ヘッダー更新
  const emojiEl    = $('#feedbackEmoji');
  const labelEl    = $('#feedbackTriggerLabel');
  const titleEl    = $('#feedbackTitle');
  const subtitleEl = $('#feedbackSubtitle');
  if (emojiEl)    emojiEl.textContent    = def.emoji;
  if (labelEl)    labelEl.textContent    = def.label;
  if (titleEl)    titleEl.textContent    = def.title;
  if (subtitleEl) subtitleEl.textContent = def.subtitle;

  // Q1
  const q1El = $('#fbQuestion1');
  if (q1El) q1El.textContent = def.q1;

  // Q2 チップ生成
  const q2El   = $('#fbQuestion2');
  const chipsEl = $('#fbReasonChips');
  if (q2El)    q2El.textContent = def.q2;
  if (chipsEl) {
    chipsEl.innerHTML = def.chips.map(c =>
      `<button type="button" class="feedback-chip" data-val="${c}">${c}</button>`
    ).join('');
    // チップイベント
    $$('#fbReasonChips .feedback-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
        fbState.selectedReasons = $$('#fbReasonChips .feedback-chip.selected').map(c => c.dataset.val);
        setInputValue('fbReason', fbState.selectedReasons.join(' / '));
      });
    });
  }

  // Q3
  const q3El = $('#fbQuestion3');
  if (q3El) q3El.textContent = def.q3;

  // フォームリセット
  const form = $('#feedbackForm');
  if (form) form.style.display = 'block';
  const complete = $('#feedbackComplete');
  if (complete) complete.classList.remove('show');

  // ステップリセット
  goFeedbackStep(1);

  // 評価ボタンリセット
  $$('#fbRatingRow .feedback-rating-btn').forEach(b => b.classList.remove('selected'));
  const nextBtn = $('#fbStep1Next');
  if (nextBtn) nextBtn.disabled = true;

  // テキストエリアクリア
  const msgEl = $('#fbMessage');
  if (msgEl) msgEl.value = '';

  // オーバーレイ表示
  const overlay = $('#feedbackOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ── モーダルを閉じる ──
function closeFeedbackModal() {
  const overlay = $('#feedbackOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
  // 表示済みとして記録
  const shown = ls_get('fb_shown', []);
  if (!shown.includes(fbState.triggerType)) {
    shown.push(fbState.triggerType);
    ls_set('fb_shown', shown);
  }
}

// ── ステップ遷移 ──
function goFeedbackStep(step) {
  fbState.currentStep = step;
  $$('.feedback-step').forEach(el => el.classList.remove('active'));
  const stepEl = $(`#fbStep${step}`);
  if (stepEl) stepEl.classList.add('active');
  // プログレスドット更新
  $$('.feedback-progress-dot').forEach((dot, i) => {
    dot.classList.remove('active', 'done');
    if (i + 1 < step) dot.classList.add('done');
    if (i + 1 === step) dot.classList.add('active');
  });
}

// ── フィードバックイベントリスナー ──
function initFeedbackListeners() {
  // 閉じる
  $('#feedbackCloseBtn')?.addEventListener('click', closeFeedbackModal);
  $('#feedbackOverlay')?.addEventListener('click', e => {
    if (e.target === $('#feedbackOverlay')) closeFeedbackModal();
  });
  $('#feedbackCompleteClose')?.addEventListener('click', closeFeedbackModal);

  // 評価ボタン
  $$('#fbRatingRow .feedback-rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#fbRatingRow .feedback-rating-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      fbState.selectedRating = btn.dataset.rating;
      setInputValue('fbRating', btn.dataset.label + '(' + btn.dataset.rating + ')');
      const nextBtn = $('#fbStep1Next');
      if (nextBtn) nextBtn.disabled = false;
    });
  });

  // STEP 1 → 2
  $('#fbStep1Next')?.addEventListener('click', () => goFeedbackStep(2));

  // STEP 2 → 3
  $('#fbStep2Next')?.addEventListener('click', () => goFeedbackStep(3));

  // STEP 2 → 1
  $('#fbStep2Back')?.addEventListener('click', () => goFeedbackStep(1));

  // STEP 3 → 2
  $('#fbStep3Back')?.addEventListener('click', () => goFeedbackStep(2));

  // フォーム送信
  $('#feedbackForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const submitBtn = $('#fbSubmitBtn');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '送信中…'; }
    try {
      const formData = new FormData(e.target);
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method:  'POST',
        body:    formData,
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        // 完了画面
        const form     = $('#feedbackForm');
        const complete = $('#feedbackComplete');
        const progress = $('#feedbackProgress');
        if (form)     form.style.display = 'none';
        if (progress) progress.style.display = 'none';
        if (complete) complete.classList.add('show');
        // 表示済み記録
        const shown = ls_get('fb_shown', []);
        if (!shown.includes(fbState.triggerType)) {
          shown.push(fbState.triggerType);
          ls_set('fb_shown', shown);
        }
      } else {
        showToast('送信に失敗しました。もう一度お試しください。');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
      }
    } catch {
      showToast('通信エラーが発生しました。');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '送信する'; }
    }
  });

  // 設定画面のフィードバックボタン
  $('#settingsFeedbackBtn')?.addEventListener('click', () => openFeedbackModal('manual'));
  $('#settingsFeedbackBtn')?.addEventListener('keypress', e => {
    if (e.key === 'Enter' || e.key === ' ') openFeedbackModal('manual');
  });

  // ── 断食ライブタイマー ────────────────────────────────
  let fastingLiveInterval = null;
  let fastingLiveStart    = null;
  let fastingLiveGoalH    = 14;
  const CIRC = 2 * Math.PI * 88; // r=88

  function updateFastingLiveDisplay() {
    if (!fastingLiveStart) return;
    const elapsed = (Date.now() - fastingLiveStart) / 1000; // seconds
    const goalSec = fastingLiveGoalH * 3600;
    const pct     = Math.min(elapsed / goalSec, 1);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = Math.floor(elapsed % 60);
    const pad = n => String(n).padStart(2, '0');

    const timeEl  = $('#fastingLiveTime');
    const labelEl = $('#fastingLiveLabel');
    const ringEl  = $('#fastingLiveRingFill');
    const msgEl   = $('#fastingLiveMsg');

    if (timeEl)  timeEl.textContent  = `${pad(h)}:${pad(m)}:${pad(s)}`;
    if (ringEl)  ringEl.style.strokeDashoffset = CIRC * (1 - pct);

    if (elapsed >= goalSec) {
      if (labelEl) labelEl.textContent = '目標達成！';
      if (msgEl)   msgEl.textContent   = 'おつかれさまでした。からだが喜んでいるかもしれません。';
    } else {
      const remaining = goalSec - elapsed;
      const rh = Math.floor(remaining / 3600);
      const rm = Math.floor((remaining % 3600) / 60);
      if (labelEl) labelEl.textContent = `あと ${rh}h ${pad(rm)}m`;
      if (msgEl)   msgEl.textContent   = '';
    }
  }

  function startFastingLive() {
    fastingLiveStart = Date.now();
    ls_set('fastingLiveStart', fastingLiveStart);
    ls_set('fastingLiveGoalH', fastingLiveGoalH);
    const startBtn = $('#fastingLiveStartBtn');
    const stopBtn  = $('#fastingLiveStopBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = 'block';
    clearInterval(fastingLiveInterval);
    fastingLiveInterval = setInterval(updateFastingLiveDisplay, 1000);
    updateFastingLiveDisplay();
  }

  function stopFastingLive(completed = false) {
    clearInterval(fastingLiveInterval);
    fastingLiveInterval = null;
    fastingLiveStart    = null;
    ls_set('fastingLiveStart', null);
    const startBtn = $('#fastingLiveStartBtn');
    const stopBtn  = $('#fastingLiveStopBtn');
    const labelEl  = $('#fastingLiveLabel');
    const timeEl   = $('#fastingLiveTime');
    const ringEl   = $('#fastingLiveRingFill');
    const msgEl    = $('#fastingLiveMsg');
    if (startBtn) startBtn.style.display = 'block';
    if (stopBtn)  stopBtn.style.display  = 'none';
    if (timeEl)   timeEl.textContent     = '00:00:00';
    if (labelEl)  labelEl.textContent    = '断食スタートを押してください';
    if (ringEl)   ringEl.style.strokeDashoffset = CIRC;
    if (msgEl)    msgEl.textContent = completed
      ? 'おつかれさまでした。からだが喜んでいるかもしれません。'
      : '途中でやめることも、からだの声を聴いた大切な判断です。';
  }

  // 継続中チェック（ページリロード後も継続）
  const savedFastingStart = ls_get('fastingLiveStart', null);
  const savedFastingGoalH = ls_get('fastingLiveGoalH', 14);
  if (savedFastingStart) {
    fastingLiveStart = savedFastingStart;
    fastingLiveGoalH = savedFastingGoalH;
    const startBtn = $('#fastingLiveStartBtn');
    const stopBtn  = $('#fastingLiveStopBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = 'block';
    // プリセットボタン更新
    $('#fastingLivePresets')?.querySelectorAll('.fasting-live-preset-btn').forEach(b => {
      b.classList.toggle('selected', Number(b.dataset.hours) === fastingLiveGoalH);
    });
    fastingLiveInterval = setInterval(updateFastingLiveDisplay, 1000);
    updateFastingLiveDisplay();
  }

  // プリセットボタン
  $('#fastingLivePresets')?.addEventListener('click', e => {
    const btn = e.target.closest('.fasting-live-preset-btn');
    if (!btn || fastingLiveStart) return; // 計測中は変更不可
    fastingLiveGoalH = Number(btn.dataset.hours);
    $('#fastingLivePresets').querySelectorAll('.fasting-live-preset-btn').forEach(b => {
      b.classList.toggle('selected', b === btn);
    });
  });

  // 開始ボタン
  $('#fastingLiveStartBtn')?.addEventListener('click', startFastingLive);

  // 終了ボタン
  $('#fastingLiveStopBtn')?.addEventListener('click', () => {
    const elapsed  = fastingLiveStart ? (Date.now() - fastingLiveStart) / 1000 : 0;
    const goalSec  = fastingLiveGoalH * 3600;
    stopFastingLive(elapsed >= goalSec);
  });

  // ── 体調メモ：5段階ボタン ──────────────────────────────
  const scaleRow = $('#conditionScaleRow');
  if (scaleRow) {
    scaleRow.addEventListener('click', e => {
      const btn = e.target.closest('.condition-scale-btn');
      if (!btn) return;
      scaleRow.querySelectorAll('.condition-scale-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.draft.conditionScale = Number(btn.dataset.scale);
    });
  }

  // 体調メモ保存ボタン
  $('#conditionSaveBtn')?.addEventListener('click', () => {
    const scale = state.draft.conditionScale || null;
    const text  = $('#conditionMemoText')?.value.trim() || '';
    if (!scale && !text) {
      showToast('体調の段階かメモを入力してください');
      return;
    }
    // 既存のdraftに体調情報をマージ
    state.draft.conditionScale = scale;
    state.draft.conditionMemo  = text;
    // localStorage に当日体調を保存（簡易保存）
    const today = new Date().toISOString().slice(0, 10);
    ls_set(`condition_${today}`, JSON.stringify({ scale, text, ts: Date.now() }));
    const scaleMsg = scale <= 2
      ? 'つらい日も、記録できたこと自体がすごいことです。'
      : scale === 3
        ? 'ふつうの日も、大切な記録です。'
        : '良い調子ですね。その感覚を覚えておきましょう。';
    showToast(scaleMsg, 3500);
    // ボタンを一時的に完了表示
    const btn = $('#conditionSaveBtn');
    if (btn) {
      btn.textContent = '記録しました';
      btn.style.background = 'linear-gradient(135deg, #5a9e9a, #3a7d7a)';
      setTimeout(() => {
        btn.textContent = '今日の体調を記録する';
        btn.style.background = '';
      }, 2000);
    }
  });

  // ── Premium モーダル ───────────────────────────────────
  function openPremiumModal() {
    const overlay = $('#premiumModalOverlay');
    if (overlay) overlay.classList.add('open');
  }
  function closePremiumModal() {
    const overlay = $('#premiumModalOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  // 「Premiumで解放する」ボタン全部に適用
  document.addEventListener('click', e => {
    if (e.target.closest('.premium-trigger')) {
      e.preventDefault();
      openPremiumModal();
    }
    // モーダル外タップで閉じる
    if (e.target.id === 'premiumModalOverlay') {
      closePremiumModal();
    }
  });

  // 「あとで」リンク
  $('#premiumModalClose')?.addEventListener('click', e => {
    e.preventDefault();
    closePremiumModal();
  });
}

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────
async function init() {
  // localStorageから設定を復元
  state.userName         = ls_get('userName', '');
  state.startedAt        = ls_get('startedAt', null);
  state.fastingGoalHours = ls_get('fastingGoalHours', 14);
  state.reminderEnabled  = ls_get('reminderEnabled', false);
  const onboarded        = ls_get('onboarded', false);

  // イベントリスナー登録
  initEventListeners();
  initFeedbackListeners();

  // レコード取得
  await fetchAllRecords();

  if (onboarded && state.userName) {
    // オンボーディング済み → Home
    $('#appNav').style.display = 'flex';
    showScreen('home');
  } else {
    // 初回 → Welcome
    initWelcome();
  }
}

// DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
