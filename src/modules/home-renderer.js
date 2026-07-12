// ============================================================
//  ippo – src/modules/home-renderer.js
//  Phase E (Step 3): showMain() と依存 UI 関数群の module 移植
// ============================================================

import { showScreen } from './screen-router.js';
import { getState, saveState } from '../store/state.js';
// PR-089D (Legacy Removal Batch-11分割③): updateHomePhaseBanner/buildPhaseBar/
// updateHomeSummary/updateHomeCTAが参照する共有ユーティリティ。
import { getPhaseForDate, isPeriodExpected, buildComparisonComment } from './cycle-utils.js';
import { parseMealMemo } from './meal-tracker.js';
import { detectFlareups } from './pro/flareup-report.js';
import { calcTemperaturePhases } from './pro/temp-report.js';
// Phase Next-2: settings-store 経由で取得（direct import 廃止）
// fallback: getSettingsStore 未定義なら getSettingsProfile（並走期間の安全網）
function _getProfileForModules() {
  if (typeof window.getSettingsStore  === 'function') return window.getSettingsStore();
  if (typeof window.getSettingsProfile === 'function') return window.getSettingsProfile();
  return {};
}

// ── PR-6: homeModules visibility helper ──────────────────────
// settingsProfile.homeModules に基づきホームカードの表示/非表示を制御する。
// MODULE_OPTIONS id → DOM element id のマッピング（標準ホームで対応するもののみ）
var _HOME_MODULE_DOM_MAP = {
  todayInsight:    'home-insight-card',
  frequentSymptoms:'home-disease-advice',
};

export function applyHomeModulesVisibility() {
  try {
    var profile = _getProfileForModules();
    var modules = profile.homeModules;
    // homeModules が未設定 (null/undefined) の場合は全表示（デフォルト動作を維持）
    if (!Array.isArray(modules)) return;
    Object.keys(_HOME_MODULE_DOM_MAP).forEach(function(moduleId) {
      var domId = _HOME_MODULE_DOM_MAP[moduleId];
      var el = document.getElementById(domId);
      if (!el) return;
      var shouldShow = modules.indexOf(moduleId) !== -1;
      // display:none が既に設定されている場合は上書きしない
      // （updateHomeInsightCard 等がコンテンツ不足で自ら hide する場合を尊重）
      if (!shouldShow) {
        el.dataset.moduleHidden = '1';
        el.style.display = 'none';
      } else {
        el.dataset.moduleHidden = '0';
        // 再表示は各 update 関数に委ねる（コンテンツが揃った場合のみ表示）
      }
    });
  } catch (e) {
    // homeModules 制御は非クリティカル – エラー時はサイレントスキップ
  }
}

// ── ヘルパー ─────────────────────────────────────────────────

function getGreetingText() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 10) return 'おはようございます';
  if (hour >= 10 && hour < 17) return 'こんにちは';
  if (hour >= 17 && hour < 21) return 'こんばんは';
  return 'おつかれさまです';
}

// PR-080C: app-legacy.js に同名のローカル実装が並存する（classic scriptとES moduleはscopeが
// 分離しているため、app-legacy.js内のbare呼び出しは常にapp-legacy.js側のローカル版を実行し
// 実質2実装状態）。getState() とapp-legacy.js側のbare `state` 変数の等価性が既存コードから
// 確証できないため、Business Logic変更禁止の制約下では統合を見送る
// （詳細: docs/HANDOFF_PHASE7_COMPLETE.md PR-080C節）。
function calcPainFreeDaysThisMonth() {
  var s = getState();
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (s.records || []).forEach(function (r) {
    var d = new Date(r.date || r.record_date || '');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    var pain = r.painLevel;
    if (pain === null || pain === undefined || pain === 0) count++;
  });
  return count;
}

// PR-080C: app-legacy.js に同名の重複実装あり。理由は calcPainFreeDaysThisMonth() 直前の
// コメント参照。
function calcAvgPainThisMonth() {
  var s = getState();
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var total = 0;
  var count = 0;
  (s.records || []).forEach(function (r) {
    var d = new Date(r.date || r.record_date || '');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (r.painLevel !== null && r.painLevel !== undefined && r.painLevel > 0) {
      total += r.painLevel;
      count++;
    }
  });
  if (count === 0) return null;
  return Math.round(total / count * 10) / 10;
}

// ── 日付・グリーティング ─────────────────────────────────────

export function updateDate() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = `${now.getMonth() + 1}月${now.getDate()}日（${days[now.getDay()]}）`;
  const el = document.getElementById('today-date');
  if (el) el.textContent = date;
}

export function updateGreeting() {
  var s = getState();
  const greeting = getGreetingText();
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = greeting;
  const nameEl = document.getElementById('greeting-name');
  if (nameEl) nameEl.textContent = (s.name || 'あなた') + 'さん';

  // 連続記録バッジ更新
  const badgeCount = document.getElementById('streak-badge-count');
  if (badgeCount) {
    var streak = 0;
    var d = new Date();
    while (true) {
      var ds = d.toDateString();
      var found = false;
      for (var i = 0; i < (s.records || []).length; i++) {
        var recDate = s.records[i].date || (s.records[i].record_date ? s.records[i].record_date.slice(0, 10) + 'T00:00:00' : '');
        if (recDate && new Date(recDate).toDateString() === ds) { found = true; break; }
      }
      if (!found) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    badgeCount.textContent = streak;
  }
  updateDate();
}

// ── 統計 ─────────────────────────────────────────────────────

// PR-092A (UI/UX Final Council Home Cluster統合): app-legacy.js/legacy-misc-stats.js側の
// 重複実装（PR-080C/PR-090-R4で「統合しない」と判断していたもの）を本関数に一本化した。
// 差分は防御的nullガードのみで実質同一挙動（Council判定・docs/HANDOFF_PHASE7_COMPLETE.md参照）。
export function updateStats() {
  var s = getState();
  var streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = s.streak || 0;
  var totalEl = document.getElementById('total-count');
  if (totalEl) totalEl.textContent = s.totalDays || 0;
  var itEl = document.getElementById('insight-total');
  if (itEl) itEl.textContent = s.totalDays || 0;
  var isEl = document.getElementById('insight-streak');
  if (isEl) isEl.textContent = s.streak || 0;

  // 空状態バナー
  var emptyEl = document.getElementById('insights-empty-state');
  if (emptyEl) emptyEl.style.display = ((s.records || []).length === 0) ? 'block' : 'none';

  // 今月の無痛み日数（pain-free-count は app.html calcPainFreeDays と共有）
  if (typeof window.calcPainFreeDays === 'function') window.calcPainFreeDays();
  var pfDays = calcPainFreeDaysThisMonth();
  var pfEl = document.getElementById('pain-free-days');
  if (pfEl) pfEl.textContent = pfDays > 0 ? pfDays : '—';

  // 今月の平均痛みスコア
  var avgPain = calcAvgPainThisMonth();
  var apEl = document.getElementById('avg-pain-score');
  if (apEl) apEl.textContent = avgPain !== null ? avgPain : '—';
}

// ── 週間行 ────────────────────────────────────────────────────

// PR-092A (UI/UX Final Council Home Cluster統合・新仕様): app-legacy.js版
// （角丸正方形・痛みレベル4段階色分け・生理周期フェーズ色・buildPhaseBar連動）と
// 本モジュール版（円形・記録有無のみ）を統合し、円形セルの視覚言語を保ちながら
// 痛みレベル/周期フェーズの色分け情報を統合した新デザインに一本化した。
// 参照: docs/HANDOFF_PHASE7_COMPLETE.md PR-092A節。
var _WEEK_ROW_PHASE_COLORS = {
  '月経期': '#f0a0b0', '卵胞期': '#88c8a0',
  '排卵期': '#80b8c8', '黄体期': '#d4a870', '不明': '#ede8e4'
};

// PR-EXP-04 (Home Weekly Progress Migration, 2026-07-07): home-next有効時（デフォルト）は
// src/modules/home-next/home-next-status.js の buildWeekStrip() が #hn-status 内に
// 同等の週間ストリップを描画するため、本関数は screen-home（home-next無効時の
// フォールバック画面）専用として責務を分離する。home-next-shell.js の
// patchTabNavigation() が window.buildHomeWeekRow を no-op化するため、home-next有効時は
// 本関数のbare呼び出し（record-screen.js等）自体は発火するが実質的に到達しない
// （home-next側の再描画は renderAll() が別途担う）。詳細: docs/HOME_WEEK_ROW_REMOVAL_AUDIT.md
export function buildHomeWeekRow() {
  var weekRow = document.getElementById('home-week-row');
  if (!weekRow) return;

  var s = getState();
  var today = new Date();
  var dayOfWeek = today.getDay();
  var monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  var days = ['月', '火', '水', '木', '金', '土', '日'];
  var html = '';

  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var dateStr  = d.toISOString().slice(0, 10);
    var todayStr = today.toISOString().slice(0, 10);
    var isToday  = dateStr === todayStr;
    var isFuture = dateStr > todayStr;

    var rec = (s.records || []).find(function (r) {
      return (r.date || r.record_date || '').slice(0, 10) === dateStr;
    });
    var hasRecord = !!rec;
    var clickable = !isFuture;
    var pain = hasRecord ? (rec.painLevel || 0) : null;
    var phaseColor = _WEEK_ROW_PHASE_COLORS[getPhaseForDate(d)] || _WEEK_ROW_PHASE_COLORS['不明'];

    var circleContent, circleBg, circleBorder, circleColor, fontSize;
    if (hasRecord) {
      circleContent = '✓';
      fontSize = '14px';
      circleBorder = 'none';
      if (pain >= 4)      { circleBg = '#c04060'; circleColor = 'white'; }
      else if (pain >= 2) { circleBg = '#e8809a'; circleColor = 'white'; }
      else if (pain >= 1) { circleBg = '#f0a8b8'; circleColor = 'var(--ink)'; }
      else                { circleBg = phaseColor; circleColor = 'var(--ink)'; }
    } else if (isToday) {
      circleContent = '+'; fontSize = '20px';
      circleBg = 'var(--rose-dark)'; circleColor = 'white'; circleBorder = 'none';
    } else {
      circleContent = ''; fontSize = '12px';
      circleBg = 'transparent'; circleColor = 'transparent';
      circleBorder = '1.5px solid ' + (isFuture ? 'var(--rose-light)' : '#ddd0d0');
    }

    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:5px;'
      + (clickable ? 'cursor:pointer;' : '') + '"'
      + (clickable ? ' onclick="openDayDetailByDate(\'' + dateStr + '\')"' : '')
      + '>';
    html += '<div style="font-size:10px;color:' + (isToday ? 'var(--rose-dark)' : 'var(--ink-light)') + ';font-weight:' + (isToday ? '600' : '400') + ';">' + days[i] + '</div>';
    html += '<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;'
      + 'font-size:' + fontSize + ';font-weight:600;'
      + 'color:' + circleColor + ';background:' + circleBg + ';'
      + 'border:' + circleBorder + ';'
      + '">' + circleContent + '</div>';
    html += '</div>';
  }
  weekRow.innerHTML = html;
  buildPhaseBar(monday);
}

// ── 今週の気づきカード ────────────────────────────────────────

export function updateHomeInsightCard() {
  var card = document.getElementById('home-insight-card');
  var text = document.getElementById('home-insight-text');
  if (!card || !text) return;

  // PR-6: homeModules で非表示指定されていればスキップ
  if (card.dataset.moduleHidden === '1') return;

  var s = getState();
  var records = s.records || [];
  if (records.length < 3) { card.style.display = 'none'; return; }

  // PR-092A (UI/UX Final Council Home Cluster統合): app-legacy.js版が持っていた
  // window.buildHomeInsight() パケット優先処理を統合。src/home/home-insight-engine.js は
  // 現時点でどのエントリポイントからもimportされておらずwindow.buildHomeInsightは未定義
  // （app-legacy.js版でも同じ理由で常にfalseだった、挙動変更なし）。将来同エンジンが
  // バンドルされた場合はこのパスが自動的に有効化される。
  if (typeof window.buildHomeInsight === 'function') {
    var packet = window.buildHomeInsight(records, s);
    var lines = [];
    if (packet.reason)     lines.push(packet.reason.title + ' — ' + packet.reason.body);
    if (packet.prediction) lines.push(packet.prediction.title + ' — ' + packet.prediction.body);
    if (lines.length) {
      text.innerHTML = lines.map(function (l) { return '<div>' + l + '</div>'; }).join('');
      card.style.display = 'block';
      var predEl = document.getElementById('home-prediction-text');
      if (predEl && packet.prediction) predEl.textContent = packet.prediction.body;
      return;
    }
  }

  var today = new Date();
  var weekRecords = records.filter(function (r) {
    var d = new Date(r.date || r.record_date || '');
    var diff = Math.floor((today - d) / 86400000);
    return diff >= 0 && diff < 7;
  });
  if (weekRecords.length === 0) { card.style.display = 'none'; return; }

  var painDays   = weekRecords.filter(function (r) { return r.painLevel >= 2; }).length;
  var noPainDays = weekRecords.filter(function (r) { return r.painLevel === 0; }).length;
  var avgPain    = weekRecords.reduce(function (sum, r) { return sum + (r.painLevel || 0); }, 0) / weekRecords.length;

  var insight = '';
  var diseases = s.myDiseases || [];

  if (painDays >= 4) {
    insight = '今週は' + painDays + '日間、痛みの記録があります。';
    if (diseases.indexOf('子宮内膜症') !== -1) insight += '周期フェーズとの関係をインサイトで確認してみましょう。';
  } else if (noPainDays >= 5) {
    insight = '今週は' + noPainDays + '日、らくな日が続いています。';
  } else if (avgPain > 0) {
    insight = '今週の平均痛みスコアは ' + avgPain.toFixed(1) + '/4 でした。';
  }

  var lowSleepPainDays = weekRecords.filter(function (r) {
    return r.sleepQuality >= 3 && r.painLevel >= 2;
  }).length;
  if (lowSleepPainDays >= 2) {
    insight += '睡眠の質が低い日に痛みが重なるパターンがあります。';
  }

  if (!insight) { card.style.display = 'none'; return; }
  text.textContent = insight;
  card.style.display = 'block';
}

// ── 数値2つ（連続・次の生理） ─────────────────────────────────

export function updateHomeNumbers() {
  var s = getState();
  var streak = s.streak || 0;
  var streakEl = document.getElementById('home-streak-num');
  if (streakEl) streakEl.textContent = streak;
  var fireEl = document.getElementById('home-streak-fire');
  if (fireEl) fireEl.textContent = streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '';

  var nextEl    = document.getElementById('home-next-num');
  var nextLabel = document.getElementById('home-next-label');
  var nextUnit  = document.getElementById('home-next-unit');

  var nextInfoEl = document.getElementById('home-next-info');

  if (s.lastPeriodDate && s.cycleLength) {
    var last     = new Date(s.lastPeriodDate + 'T00:00:00');
    var today    = new Date();
    var dayNum   = Math.floor((today - last) / 86400000) + 1;
    var daysLeft = s.cycleLength - dayNum;
    if (daysLeft > 0) {
      if (nextEl) nextEl.textContent = daysLeft;
      if (nextUnit) nextUnit.textContent = '日後';
      if (nextInfoEl) nextInfoEl.textContent = '次の生理まで約' + daysLeft + '日';
    } else {
      if (nextEl) nextEl.textContent = '今日';
      if (nextUnit) nextUnit.textContent = '頃';
      if (nextInfoEl) nextInfoEl.textContent = '生理予定日頃';
    }
  } else {
    if (nextEl) nextEl.textContent = '—';
    if (nextLabel) nextLabel.textContent = '次の生理予測';
    if (nextUnit) nextUnit.textContent = '';
    if (nextInfoEl) nextInfoEl.textContent = '';
  }
}

// ── 疾患別アドバイス ──────────────────────────────────────────

export function updateHomeDiseaseAdvice() {
  var card = document.getElementById('home-disease-advice');
  var text = document.getElementById('home-disease-advice-text');
  if (!card || !text) return;

  // PR-6: homeModules で非表示指定されていればスキップ
  if (card.dataset.moduleHidden === '1') return;

  var s = getState();
  var diseases = s.myDiseases || [];
  if (diseases.length === 0) { card.style.display = 'none'; return; }

  var h = new Date().getHours();
  var isMorning = h >= 5 && h < 12;
  var isNight   = h >= 20;
  var hint = typeof window.getDailyHint === 'function'
    ? window.getDailyHint(diseases, isMorning, isNight)
    : null;
  if (!hint) { card.style.display = 'none'; return; }

  text.textContent = diseases[0] + '：' + hint.text;
  card.style.display = 'block';
}

// PR-086 (Legacy Removal Batch-8): app-legacy.js の updateTodayMessage/updateDailyHintCard を
// 物理移動。Business Logic変更なし。
// ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型。本ファイル既存の
//   updateHomeDiseaseAdvice等は getState() を使うが、PR-080Cで指摘の通り getState() と
//   app-legacy.js側bare `state` の等価性は既存コードから確証できないため、物理移動元の
//   挙動を厳密に保つ window.state を採用）。
// ・getCurrentCyclePhase（app-legacy.js残置、Batch-8対象外・多数の他関数が使用中のため
//   移動不可）は window.getCurrentCyclePhase 経由のguarded呼び出しに変更
//   （recovery-journey.js/onboarding-runtime.jsと同型のidiom）。
// ・getDailyHint（record-input.js、PR-079物理移動済み）は既存のupdateHomeDiseaseAdviceと
//   同様 window.getDailyHint 経由のguarded呼び出しに変更。

// ===== 今日のメッセージ（ホーム1枚） =====
export function updateTodayMessage() {
  var wrap = document.getElementById('home-today-message');
  var textEl = document.getElementById('home-today-msg-text');
  var btnWrap = document.getElementById('home-today-msg-btn-wrap');
  if (!wrap || !textEl) return;

  var today = new Date().toISOString().slice(0,10);
  var todayRec = (window.state.records||[]).find(function(r){
    return (r.date||'').slice(0,10) === today;
  });
  var streak = window.state.streak || 0;
  var msg = '';
  var showBtn = false;

  // 優先順位1: 未記録
  if (!todayRec) {
    msg = '今日の記録がまだです。3タップで完了します。';
    showBtn = true;
  } else {
    // 優先順位2〜5: フェーズ別
    var phase = typeof window.getCurrentCyclePhase === 'function' ? window.getCurrentCyclePhase() : '';
    var daysToNext = 99;
    if (window.state.lastPeriodDate && window.state.cycleLength) {
      var last = new Date(window.state.lastPeriodDate + 'T00:00:00');
      var dayNum = Math.floor((new Date() - last) / 86400000) + 1;
      daysToNext = (window.state.cycleLength || 28) - dayNum;
    }
    if (phase === '生理期') {
      var dayNum2 = window.state.lastPeriodDate ? Math.floor((new Date() - new Date(window.state.lastPeriodDate+'T00:00:00'))/86400000)+1 : 1;
      msg = '生理' + dayNum2 + '日目です。無理せず過ごしましょう。鎮痛剤の飲みすぎに注意。';
    } else if (daysToNext <= 3 && daysToNext >= 0) {
      msg = '生理が近づいています。鎮痛剤を手元に準備しておきましょう。';
    } else if (phase === '排卵期') {
      msg = '排卵期です。体温の変化を確認しましょう。';
    } else {
      msg = '今日も記録しました。連続' + streak + '日です。';
    }
  }

  textEl.textContent = msg;
  if (btnWrap) btnWrap.style.display = showBtn ? 'block' : 'none';
  wrap.style.display = 'block';
}

// ===== 今日のヒントカード（時間帯・疾患別） =====
export function updateDailyHintCard() {
  var container = document.getElementById('today-message');
  if (!container) return;

  var hour     = new Date().getHours();
  var diseases = window.state.myDiseases || [];
  var isMorning = hour >= 5  && hour < 12;
  var isNight   = hour >= 20 || hour < 5;

  var hint = typeof window.getDailyHint === 'function' ? window.getDailyHint(diseases, isMorning, isNight) : null;
  if (!hint) return;

  container.innerHTML =
    '<div style="border-left:3px solid var(--rose);padding-left:10px;">'
    + '<div style="font-size:10px;color:var(--rose);font-weight:500;margin-bottom:3px;">' + hint.label + '</div>'
    + '<div style="font-size:12px;color:var(--ink);line-height:1.7;">' + hint.text + '</div>'
    + '</div>';
}

// ── ホーム埋め込みカレンダー ──────────────────────────────────

var _homeCalNow = new Date();
var homeCalYear  = _homeCalNow.getFullYear();
var homeCalMonth = _homeCalNow.getMonth();

export function buildHomeCalendar() {
  var label = document.getElementById('homeCalLabel');
  var grid  = document.getElementById('homeCalGrid');
  if (!label || !grid) return;

  label.textContent = homeCalYear + '年' + (homeCalMonth + 1) + '月';
  grid.innerHTML = '';

  var firstDow    = new Date(homeCalYear, homeCalMonth, 1).getDay();
  var daysInMonth = new Date(homeCalYear, homeCalMonth + 1, 0).getDate();
  var today = new Date();
  var st = getState();

  for (var e = 0; e < firstDow; e++) {
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }
  for (var day = 1; day <= daysInMonth; day++) {
    var el = document.createElement('div');
    el.className = 'cal-day';
    var isToday = day === today.getDate() && homeCalMonth === today.getMonth() && homeCalYear === today.getFullYear();
    if (isToday) el.classList.add('today');
    var ds      = new Date(homeCalYear, homeCalMonth, day).toDateString();
    var localDs = homeCalYear + '-' + String(homeCalMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var records = st.records || [];
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
    el.textContent = day;
    el.addEventListener('click', (function (ds) { return function () {
      if (typeof window.openDayDetailByDate === 'function') window.openDayDetailByDate(ds);
    }; })(localDs));
    grid.appendChild(el);
  }
}

export function changeHomeCalMonth(delta) {
  homeCalMonth += delta;
  if (homeCalMonth > 11) { homeCalMonth = 0; homeCalYear++; }
  if (homeCalMonth < 0)  { homeCalMonth = 11; homeCalYear--; }
  buildHomeCalendar();
}

// ── CTA カード ────────────────────────────────────────────────

// daily-checkin 完了フラグの確認。
// record.meta.uiFlow === 'daily-checkin' が設定された記録のみ「完了」扱い。
// 他の入力経路（カレンダー編集・クイック編集等）でのみ保存された記録は対象外。
function _isDailyCheckinCompleted(rec) {
  if (!rec) return false;
  return !!(rec.meta && rec.meta.uiFlow === 'daily-checkin');
}

export function updateHomeCTAState() {
  var s = getState() || {};
  var today = new Date().toISOString().slice(0, 10);
  var rec = (s.records || []).find(function (r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });

  var card  = document.getElementById('home-cta-card');
  var title = document.getElementById('home-cta-title');
  var sub   = document.getElementById('home-cta-sub');
  if (!card) return;

  var completed = _isDailyCheckinCompleted(rec);

  if (completed) {
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '0.85';
    if (title) title.textContent = '✓ 今日をふり返る';
    // PR-092A (UI/UX Final Council Home Cluster統合・新仕様): app-legacy.js版が持っていた
    // buildComparisonComment()（前回との比較コメント）を完了時サブテキストとして統合。
    if (sub)   sub.textContent   = buildComparisonComment(rec);
  } else {
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '1';
    if (title) title.textContent = '今日を記録する';
    if (sub)   sub.textContent   = '今日はまだ記録していません';
  }
}

// ── showMain ─────────────────────────────────────────────────

export function showMain() {
  showScreen('home');

  // PR-6: homeModules visibility を最初に適用する（各 update 関数より前）
  applyHomeModulesVisibility();

  // モジュール内で完結する関数を直接呼ぶ
  updateGreeting();
  updateStats();
  buildHomeWeekRow();
  updateHomeInsightCard();
  updateHomeNumbers();
  updateHomeDiseaseAdvice();
  updateHomeCTAState();

  buildHomeCalendar();

  // ホームカレンダーナビアイコン
  var hPrev = document.getElementById('homeCalPrev');
  var hNext = document.getElementById('homeCalNext');
  if (hPrev && window.ICONS) hPrev.innerHTML = window.ICONS.chevronLeft(16, 'var(--ink-mid)');
  if (hNext && window.ICONS) hNext.innerHTML = window.ICONS.chevronRight(16, 'var(--ink-mid)');

  // 未移植の関数は window.* 経由で委譲（app.html 側に残っている）
  if (typeof window.updateUnlock === 'function') window.updateUnlock();
  if (typeof window.updateSettingsHero === 'function') window.updateSettingsHero();
  if (typeof window.updateHomePhaseBanner === 'function') window.updateHomePhaseBanner();
  if (typeof window.updateTodayMessage === 'function') window.updateTodayMessage();
  if (typeof window.initReminders === 'function') window.initReminders();
  if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();

  // ホームバナー非表示フラグを復元
  try {
    if (localStorage.getItem('ippo_hide_add_home') === '1') {
      const banner = document.getElementById('add-home-banner');
      if (banner) banner.style.display = 'none';
    }
  } catch (e) {}
}

// ── PR-089D (Legacy Removal Batch-11分割③): Home Remaining Migration ──────
// updateHomePhaseBanner/buildPhaseBar/renderMonthlySummaryText/updateHomeSummary/
// updateHomeCTA/handleHomeCTA/updateStreakBadge を app-legacy.js から物理移動。
// Business Logic変更なし。bare `state` は getState() 経由に、getCurrentCyclePhase
// （app-legacy.js残置、多数の他関数が使用中のため移動不可）は window.getCurrentCyclePhase
// 経由のguarded呼び出しに変更（updateTodayMessageと同型idiom）。DISEASE_CONFIGは
// bare参照時から実体がwindow.DISEASE_CONFIGだったため明示化のみ（挙動不変）。

export function updateHomePhaseBanner() {
  // 新デザイン：home-phase-badge に表示
  var badge     = document.getElementById('home-phase-badge');
  var badgeText = document.getElementById('home-phase-badge-text');
  if (!badge || !badgeText) return;

  var s = getState();
  // getCurrentCyclePhase が null の場合は getPhaseForDate でフォールバック
  var phase = (typeof window.getCurrentCyclePhase === 'function') ? window.getCurrentCyclePhase() : null;
  if (!phase && s.lastPeriodDate && s.cycleLength) {
    phase = getPhaseForDate(new Date());
  }
  if (!phase) { badge.style.display = 'none'; return; }

  var last = s.lastPeriodDate ? new Date(s.lastPeriodDate + 'T00:00:00') : null;
  var dayNum = last ? Math.floor((new Date() - last) / 86400000) + 1 : null;
  // 周期内日数に補正（次の周期になっている場合）
  if (dayNum && s.cycleLength && dayNum > s.cycleLength) {
    dayNum = ((dayNum - 1) % s.cycleLength) + 1;
  }

  badgeText.textContent = phase + (dayNum ? ' ' + dayNum + '日目' : '');
  badge.style.display = 'block';
}

export function buildPhaseBar(monday) {
  var bar    = document.getElementById('home-phase-bar');
  var labels = document.getElementById('home-phase-labels');
  if (!bar) return;

  var s = getState();
  var cycle = s.cycleLength || 28;

  // 全周期の比例バー（4フェーズの長さ）
  var menLen  = 5;
  var folLen  = Math.floor(cycle * 0.46) - 5;
  var ovLen   = Math.floor(cycle * 0.53) - Math.floor(cycle * 0.46);
  var lutLen  = cycle - Math.floor(cycle * 0.53);

  var phaseData = [
    { name:'月経',  days: menLen,  color:'#e87080' },
    { name:'卵胞',  days: folLen,  color:'#70b88a' },
    { name:'排卵',  days: ovLen,   color:'#70a8c0' },
    { name:'黄体',  days: lutLen,  color:'#d4a060' }
  ];

  // 今日の周期内フェーズを特定（フォールバック付き）
  var currentPhase = typeof window.getCurrentCyclePhase === 'function' ? window.getCurrentCyclePhase() : null;
  if (!currentPhase && s.lastPeriodDate && s.cycleLength) {
    currentPhase = getPhaseForDate(new Date());
  }
  var phaseNameMap = { '月経期':'月経', '卵胞期':'卵胞', '排卵期':'排卵', '黄体期':'黄体' };
  var currentShort = phaseNameMap[currentPhase] || '';

  // バーHTML
  var barHtml = phaseData.map(function(p) {
    return '<div style="flex:' + p.days + ';background:' + p.color + ';"></div>';
  }).join('');
  bar.innerHTML = barHtml;

  // ラベルHTML（フェーズ名＋現在フェーズに▼）
  if (labels) {
    var labelHtml = phaseData.map(function(p) {
      var isCurrent = p.name === currentShort;
      return '<div style="flex:' + p.days + ';font-size:9px;text-align:center;'
        + 'color:' + (isCurrent ? 'var(--ink)' : 'var(--ink-light)') + ';'
        + 'font-weight:' + (isCurrent ? '600' : '400') + ';">'
        + p.name + (isCurrent ? ' ◀' : '')
        + '</div>';
    }).join('');
    labels.innerHTML = labelHtml;
  }
}

export function renderMonthlySummaryText() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderMonthlySummaryText', renderMonthlySummaryText);
    return;
  }
  var el = document.getElementById('ins-monthly-summary-text');
  if (!el) return;

  var s = getState();
  var now = new Date();
  var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  var mn = monthNames[now.getMonth()];

  var monthRecs = (s.records || []).filter(function(r){
    var d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  if (monthRecs.length < 3) {
    el.innerHTML = mn + 'の記録を集めています。<br><span style="font-size:12px;color:#9a8a80;">記録が増えるほど、より正確な分析が見えてきます。</span>';
    return;
  }

  var painDays = monthRecs.filter(function(r){ return (r.painLevel||0) >= 2; }).length;
  var freeDays = monthRecs.length - painDays;

  var avgSleep = monthRecs.reduce(function(s,r){ return s+(r.sleepHours||0); },0) / monthRecs.length;

  var sentence;
  if (freeDays > painDays) {
    sentence = mn + 'のあなたは、<strong style="color:#6B8F71;font-weight:600;">痛みのない日が多い</strong>、穏やかな1ヶ月でした。';
  } else if (avgSleep >= 6.5) {
    sentence = mn + 'のあなたは、<strong style="color:#8B82B8;font-weight:600;">睡眠が比較的安定</strong>してきた1ヶ月でした。';
  } else {
    sentence = mn + 'のあなたは、痛みと向き合いながら記録を続けた1ヶ月でした。';
  }

  var note = monthRecs.length + '日の記録から見えてきたパターンです。';
  el.innerHTML = sentence + '<br><span style="font-size:12px;color:#9a8a80;line-height:1.7;">' + note + '</span>';
}

// ===== ホーム画面サマリー =====
export function updateHomeSummary(){
  var s = getState();
  var container = document.getElementById('home-summary');
  var content = document.getElementById('summary-content');
  var status = document.getElementById('summary-status');
  if(!container || !content || !status) return;

  var todayStr = new Date().toDateString();
  var rec = null;
  for(var i=0; i<s.records.length; i++){
    if(new Date(s.records[i].date).toDateString() === todayStr){ rec = s.records[i]; break; }
  }

  container.style.display = 'block';

  if(!rec){
    status.textContent = '未記録';
    content.innerHTML =
      '<div style="text-align:center;padding:22px 0 10px;">'
      + '<div style="font-size:38px;margin-bottom:10px;">📋</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:5px;">まだ今日の記録がありません</div>'
      + '<div style="font-size:11px;color:var(--ink-light);line-height:1.6;">中央の ＋ ボタンから<br>今日の体調を入力しましょう</div>'
      + '</div>';
    return;
  }

  status.textContent = '記録済み ✓';

  // 食事データ解析（飲み物除外）
  var drinkPattern = /飲み物|飲料|お水|水分|コーヒー|カフェラテ|カプチーノ|エスプレッソ|お茶|緑茶|麦茶|ほうじ茶|煎茶|玄米茶|番茶|紅茶|ハーブティー|ルイボス|ジュース|スムージー|牛乳|豆乳|ヨーグルト飲料|ラッシー|スポーツドリンク|ポカリ|アクエリ|アミノ酸|コーラ|サイダー|炭酸水|ソーダ|トニック|レモネード|甘酒|昆布水/;
  var mealLines = (rec.mealFree || '').split('\n').filter(function(l){return l.trim();});
  var allSlots = [];
  var foodSlots = [];
  mealLines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    var timeMatch = line.match(/(\d{1,2}):?(\d{2})/);
    var time = timeMatch ? ('0'+parseInt(timeMatch[1])).slice(-2)+':'+timeMatch[2] : '';
    var food = line.replace(/\d{1,2}:?\d{2}\s*/, '').trim();
    var items = food.split(/[、,\/\s]+/).filter(function(s){ return s; });
    var drinkItems = items.filter(function(s){ return drinkPattern.test(s); });
    var isDrinkOnly = drinkItems.length > 0 && drinkItems.length >= items.length;
    allSlots.push({time:time, food:food, isDrink:isDrinkOnly});
    if(!isDrinkOnly) foodSlots.push({time:time, food:food});
  });

  var parsed = parseMealMemo(rec.mealFree);
  var mealCount = parsed ? parsed.mealCount : 0;
  var fastH = parsed ? parsed.fastingHours : 0;
  var goalH = s.fastingGoal || 16;
  var eatH = 24 - fastH;

  var html = '';

  // ① 痛みスコア（最上部・大きく表示）
  var painLevel = rec.painLevel !== null && rec.painLevel !== undefined ? rec.painLevel : -1;
  if (painLevel >= 0) {
    var painEmoji = ['😊','🙂','😐','😣','😭'][Math.min(Math.floor(painLevel / 2), 4)];
    var painLabels = ['痛みなし','軽い痛み','中程度','強い痛み','とても強い'];
    var painLabelIdx = painLevel === 0 ? 0 : painLevel <= 2 ? 1 : painLevel <= 5 ? 2 : painLevel <= 8 ? 3 : 4;
    var painColor = painLevel === 0 ? '#639922' : painLevel <= 2 ? '#ba7517' : painLevel <= 5 ? '#c4878c' : '#993556';
    html += '<div style="display:flex;align-items:center;gap:12px;background:var(--cream);border-radius:14px;padding:12px 16px;margin-bottom:12px;">';
    html += '<div style="font-size:28px;">' + painEmoji + '</div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:2px;">今日の痛み</div>';
    html += '<div style="font-size:15px;font-weight:600;color:' + painColor + ';">' + painLabels[painLabelIdx] + '</div>';
    html += '</div>';
    var painPct = Math.round(painLevel / 10 * 100);
    html += '<div style="width:60px;">';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + painPct + '%;background:' + painColor + ';border-radius:3px;transition:width 0.5s;"></div>';
    html += '</div>';
    html += '<div style="font-size:9px;color:var(--ink-light);text-align:right;margin-top:3px;">' + painLevel + '/10</div>';
    html += '</div>';
    html += '</div>';
  }

  // ② 症状チップ
  var sympChips = [];
  if(rec.symptoms && rec.symptoms.length) sympChips = sympChips.concat(rec.symptoms);
  if(rec.bloodClot && rec.bloodClot.length) sympChips = sympChips.concat(rec.bloodClot.map(function(b){return '🩸 '+b;}));
  if(rec.bloodColor && rec.bloodColor.length) sympChips = sympChips.concat(rec.bloodColor);
  if(sympChips.length){
    html += '<div style="margin-bottom:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:6px;">今日の症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    sympChips.forEach(function(s){
      html += '<span style="font-size:11px;background:var(--rose-pale);color:var(--rose);border-radius:12px;padding:3px 10px;">'+s+'</span>';
    });
    html += '</div></div>';
  }

  // ③ バイタル指標ピル行
  var vitals = [];
  if(rec.temperature) vitals.push({icon:'🌡', label: rec.temperature+'℃', color:'#d4a574', bg:'#fdf5ec'});
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') vitals.push({icon:'🌸', label: rec.menstrualCycle, color:'#c4878c', bg:'#fdf0f2'});
  if(rec.energy) vitals.push({icon:'⚡', label:'元気 '+rec.energy+'/5', color:'#d4a574', bg:'#fdf5ec'});
  if(rec.sleepHours) vitals.push({icon:'😴', label:'睡眠 '+rec.sleepHours+'h', color:'#7ba3c4', bg:'#eef4fb'});
  if(vitals.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    vitals.forEach(function(v){
      html += '<div style="display:flex;align-items:center;gap:5px;background:'+v.bg+';border-radius:20px;padding:5px 10px;">';
      html += '<span style="font-size:12px;">'+v.icon+'</span>';
      html += '<span style="font-size:11px;font-weight:600;color:'+v.color+';">'+v.label+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ④ 食事タイムライン（折りたたみ）
  var hasMealData = !!(rec.mealFree && rec.mealFree.trim());
  if (hasMealData || s.fastingEnabled) {
    var mealToggleId = 'meal-acc-' + Date.now();
    html += '<div style="border-top:0.5px solid var(--rose-light);margin-bottom:12px;padding-top:10px;">';
    html += '<button onclick="(function(){var c=document.getElementById(\'' + mealToggleId + '\');var a=document.getElementById(\'' + mealToggleId + '-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▲\';}else{c.style.display=\'none\';a.textContent=\'▼\';}})()" '
      + 'style="width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;padding:0;cursor:pointer;font-family:\'Noto Sans JP\',sans-serif;">';
    html += '<span style="font-size:12px;color:var(--ink-light);">食事の記録を見る</span>';
    html += '<span id="' + mealToggleId + '-arrow" style="font-size:10px;color:var(--ink-light);">▼</span>';
    html += '</button>';
    html += '<div id="' + mealToggleId + '" style="display:none;margin-top:12px;">';
    // ドーナツチャート + タイムライン（既存のまま）
    (function(){
      var circumference = 2 * Math.PI * 46;
      html += '<div style="display:flex;align-items:center;gap:18px;margin-bottom:16px;">';
      html += '<div style="position:relative;width:108px;height:108px;flex-shrink:0;">';
      html += '<svg width="108" height="108" viewBox="0 0 108 108" style="transform:rotate(-90deg)">';
      html += '<circle cx="54" cy="54" r="46" fill="none" stroke="var(--cream)" stroke-width="9"/>';
      foodSlots.forEach(function(slot){
        if(!slot.time) return;
        var parts = slot.time.split(':');
        var h = parseInt(parts[0]);
        var m = parseInt(parts[1]) || 0;
        var hourDecimal = h + m / 60;
        var arcLen = circumference / 24 * 1.2;
        var dashGap = circumference - arcLen;
        var offset = -(hourDecimal / 24 * circumference);
        var dotColor;
        if(h >= 5 && h < 10) dotColor = '#d4a574';
        else if(h >= 10 && h < 14) dotColor = '#6b9e78';
        else if(h >= 17 && h < 22) dotColor = '#c4878c';
        else dotColor = '#7ba3c4';
        html += '<circle cx="54" cy="54" r="46" fill="none" stroke="'+dotColor+'" stroke-width="9" stroke-dasharray="'+arcLen.toFixed(1)+' '+dashGap.toFixed(1)+'" stroke-dashoffset="'+offset.toFixed(1)+'" stroke-linecap="round"/>';
      });
      html += '</svg>';
      html += '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">';
      if(fastH > 0){
        html += '<div style="font-family:Inter,sans-serif;font-size:19px;font-weight:700;color:var(--ink);line-height:1;">'+fastH+'</div>';
        html += '<div style="font-size:8px;color:var(--ink-light);margin-top:1px;">時間断食</div>';
      } else if(mealCount > 0){
        html += '<div style="font-family:Inter,sans-serif;font-size:19px;font-weight:700;color:var(--ink);line-height:1;">'+mealCount+'</div>';
        html += '<div style="font-size:8px;color:var(--ink-light);margin-top:1px;">食</div>';
      } else {
        html += '<div style="font-size:10px;color:var(--ink-light);">飲み物<br>のみ</div>';
      }
      html += '</div></div>';
      html += '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:0;">';
      if(allSlots.length){
        var showMax = Math.min(allSlots.length, 6);
        for(var si=0;si<showMax;si++){
          var slot = allSlots[si];
          var slotH = slot.time ? parseInt(slot.time.split(':')[0]) : 0;
          var dotColor;
          if(slotH >= 5 && slotH < 10) dotColor = '#d4a574';
          else if(slotH >= 10 && slotH < 14) dotColor = '#6b9e78';
          else if(slotH >= 17 && slotH < 22) dotColor = '#c4878c';
          else dotColor = '#7ba3c4';
          var rowOpacity = slot.isDrink ? '0.45' : '1';
          html += '<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--cream);opacity:'+rowOpacity+';">';
          html += '<div style="width:7px;height:7px;border-radius:50%;background:'+dotColor+';flex-shrink:0;"></div>';
          html += '<span style="font-size:11px;color:var(--ink-light);flex-shrink:0;min-width:36px;">'+(slot.time||'')+'</span>';
          html += '<span style="font-size:12px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+slot.food+'</span>';
          html += '</div>';
        }
        if(allSlots.length > 6){
          html += '<div style="font-size:10px;color:var(--ink-light);padding-top:4px;">他 '+(allSlots.length-6)+'件</div>';
        }
      } else if(mealCount > 0){
        html += '<div style="font-size:12px;color:var(--ink-mid);">🍽 '+mealCount+'食 記録済み</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--ink-light);">食事記録なし</div>';
      }
      html += '</div>';
      html += '</div>';
    })();
    html += '</div></div>';
  }

  // ⑤ 疾患チェック（なし以外）
  if(rec.diseaseCheck && Object.keys(rec.diseaseCheck).length){
    var dcEntries = [];
    var dc = rec.diseaseCheck;
    var _fallbackDisease = (rec.diseases && rec.diseases[0]) || (s.myDiseases && s.myDiseases[0]) || '';
    Object.keys(dc).forEach(function(key){
      if(dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey = parts.length > 1 ? parts[0] : _fallbackDisease;
      var qId = parts.length > 1 ? parts[1] : key;
      var qCfg = typeof window.DISEASE_CONFIG !== 'undefined' ? window.DISEASE_CONFIG[dKey] : null;
      var label = qId;
      if(qCfg && qCfg.questions){
        for(var qi=0;qi<qCfg.questions.length;qi++){
          if(qCfg.questions[qi].id === qId){ label = qCfg.questions[qi].text.replace('？',''); break; }
        }
      }
      dcEntries.push(label+': '+dc[key]);
    });
    if(dcEntries.length){
      html += '<div style="margin-bottom:12px;">';
      html += '<div style="font-size:11px;font-weight:700;color:var(--ink-light);letter-spacing:0.05em;margin-bottom:7px;">疾患チェック</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      dcEntries.forEach(function(e){
        html += '<span style="font-size:11px;background:#f3f0fd;color:#6b5b8a;padding:4px 10px;border-radius:14px;">'+e+'</span>';
      });
      html += '</div></div>';
    }
  }

  // ⑥ その他（服薬・お通じ・睡眠の質・要因）
  var otherChips = [];
  if(rec.medication && rec.medication.length) otherChips.push('💊 '+rec.medication.join('・'));
  if(rec.sleepQuality) otherChips.push('💤 睡眠の質 '+rec.sleepQuality+'/5');
  if(rec.bowel) otherChips.push('🫧 '+rec.bowel);
  if(rec.factors && rec.factors.length) otherChips.push('📋 '+rec.factors.join('・'));
  if(otherChips.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">';
    otherChips.forEach(function(e){
      html += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:4px 10px;border-radius:14px;">'+e+'</span>';
    });
    html += '</div>';
  }

  // ⑦ ウェルネス・SMIスコア（横並びコンパクト）
  var hasWS = rec.wellnessScore !== undefined;
  var hasSMI = rec.smiScore !== undefined && rec.smiScore !== null;
  if(hasWS || hasSMI){
    html += '<div style="display:flex;gap:10px;margin-bottom:14px;">';
    if(hasWS){
      var ws = rec.wellnessScore;
      var wsColor = ws >= 70 ? '#6b9e78' : ws >= 40 ? '#d4a574' : '#c4878c';
      var wsLabel = ws >= 70 ? '良好' : ws >= 40 ? 'まずまず' : '注意';
      html += '<div style="flex:1;background:linear-gradient(135deg,#faf6f2,#f0ebe6);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;">';
      html += '<div style="position:relative;width:44px;height:44px;flex-shrink:0;">';
      html += '<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="#e8ddd8" stroke-width="4"/>';
      var pctWS = ws / 100;
      var circWS = 2 * Math.PI * 18;
      html += '<circle cx="22" cy="22" r="18" fill="none" stroke="'+wsColor+'" stroke-width="4" stroke-dasharray="'+Math.round(circWS*pctWS)+' '+Math.round(circWS*(1-pctWS))+'" stroke-linecap="round" transform="rotate(-90 22 22)"/></svg>';
      html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12px;font-weight:700;color:'+wsColor+';">'+ws+'</div>';
      html += '</div>';
      html += '<div><div style="font-size:10px;color:var(--ink-light);">ウェルネス</div>';
      html += '<div style="font-size:13px;font-weight:600;color:'+wsColor+';">'+wsLabel+'</div></div>';
      html += '</div>';
    }
    if(hasSMI){
      var smi = rec.smiScore;
      var smiColor = smi <= 25 ? '#6b9e78' : smi <= 50 ? '#d4a574' : smi <= 75 ? '#c4878c' : '#c44848';
      var smiLabel = smi <= 25 ? '問題なし' : smi <= 50 ? '注意' : smi <= 75 ? '受診推奨' : '治療必要';
      html += '<div style="flex:1;background:linear-gradient(135deg,#fdf3f3,#f9edd8);border-radius:14px;padding:12px 14px;">';
      html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">SMI指数</div>';
      html += '<div style="display:flex;align-items:baseline;gap:4px;">';
      html += '<span style="font-size:20px;font-weight:700;color:'+smiColor+';">'+smi+'</span>';
      html += '<span style="font-size:10px;color:var(--ink-light);">/94</span>';
      html += '</div>';
      html += '<div style="margin:5px 0;height:5px;background:#e8ddd8;border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:'+Math.min(Math.round(smi/94*100),100)+'%;background:'+smiColor+';border-radius:3px;"></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:'+smiColor+';">'+smiLabel+'</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ⑧ フレアアップ通知（直近3日以内）
  var recentFlares = detectFlareups(s.records).filter(function(f){
    return (Date.now() - new Date(f.date).getTime()) < 3 * 86400000;
  });
  if(recentFlares.length > 0){
    html += '<div onclick="openFlareupReport()" style="margin-bottom:10px;background:linear-gradient(135deg,#fde8e8,#fdf3f3);border-radius:14px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;">';
    html += '<span style="font-size:20px;">🔥</span>';
    html += '<div style="flex:1;"><div style="font-size:12px;font-weight:600;color:var(--rose);">フレアアップを検出</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);margin-top:2px;">'+recentFlares[recentFlares.length-1].reasons[0]+'</div></div>';
    html += '<span style="font-size:12px;color:var(--rose);">→</span>';
    html += '</div>';
  }

  // ⑨ 体温パターンインサイト
  var tempAnalysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(s.records);
  if(tempAnalysis.status === 'ready'){
    var hasAlerts = tempAnalysis.alerts.length > 0;
    var alertColor = hasAlerts ? (tempAnalysis.alerts.some(function(a){return a.level==='emergency';}) ? '#c44848' : tempAnalysis.alerts.some(function(a){return a.level==='danger';}) ? '#c4878c' : '#d4a574') : '#6b9e78';
    html += '<div style="background:linear-gradient(135deg,var(--white),#fdf8f6);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    html += '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🌡️</span><span style="font-size:13px;font-weight:600;color:var(--ink);">体温パターン分析</span></div>';
    html += '<span style="font-size:10px;color:var(--ink-light);">'+tempAnalysis.count+'日分</span>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">二相性</div><div style="font-size:11px;font-weight:600;color:'+alertColor+';">判定済み</div></div>';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">温度差</div><div style="font-size:11px;font-weight:600;color:var(--ink);">'+tempAnalysis.tempDiff+'℃</div></div>';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">アラート</div><div style="font-size:11px;font-weight:600;color:'+alertColor+';">'+(hasAlerts ? tempAnalysis.alerts.length+'件' : 'なし')+'</div></div>';
    html += '</div>';
    if(hasAlerts){
      html += '<div style="background:linear-gradient(135deg,#fde8e8,#fdf3f3);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;color:#c4878c;">⚠️ 気になるパターンが検出されました</div>';
    }
    html += '<div onclick="premiumGate(openTempReport)" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--rose-pale);border-radius:8px;cursor:pointer;">';
    html += '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:500;color:var(--rose);">詳細レポートを見る</span><span style="font-size:9px;background:var(--rose);color:white;padding:1px 6px;border-radius:4px;">PRO</span></div>';
    html += '<span style="font-size:12px;color:var(--rose);">→</span>';
    html += '</div></div>';

  } else if(tempAnalysis.status === 'insufficient' && tempAnalysis.count > 0){
    var progress = Math.round(tempAnalysis.count / 14 * 100);
    var diseases2 = s.myDiseases || [];
    var eduMsg = '14日以上の記録で、あなたの低温期と高温期のパターンが見えてきます。';
    if(diseases2.indexOf('卵巣嚢腫') !== -1) eduMsg = '卵巣嚢腫では体温パターンの変化が炎症の指標になります。14日以上記録を続けましょう。';
    else if(diseases2.indexOf('子宮内膜症') !== -1) eduMsg = '子宮内膜症では月経初日の体温が診断の手がかりになることが報告されています。';
    else if(diseases2.indexOf('PCOS') !== -1) eduMsg = 'PCOSでは二相性の有無が排卵障害の重要な指標です。毎日の記録が大切です。';
    else if(diseases2.indexOf('更年期障害') !== -1) eduMsg = '更年期では体温リズムの変化がホルモンバランスを反映します。記録を続けましょう。';
    html += '<div style="background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><span style="font-size:16px;">🌡️</span><span style="font-size:13px;font-weight:600;color:var(--ink);">体温パターン分析</span></div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);margin-bottom:8px;">'+tempAnalysis.message+'</div>';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;"><div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--rose),#e8b4b8);border-radius:3px;"></div></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:5px;margin-bottom:10px;">';
    html += '<span style="font-size:10px;color:var(--ink-light);">'+tempAnalysis.count+'/14日</span><span style="font-size:10px;color:var(--rose);">'+progress+'%</span></div>';
    html += '<div style="padding:8px 10px;background:var(--cream);border-radius:8px;font-size:11px;color:var(--ink-mid);line-height:1.6;">💡 '+eduMsg+'</div>';
    html += '</div>';
  }

  content.innerHTML = html;

  // 診察レポートバナーの表示制御（7日以上記録で表示）
  var banner = document.getElementById('doctor-report-banner');
  if (banner) {
    banner.style.display = (s.records && s.records.length >= 7) ? 'block' : 'none';
  }
}

// ===== ホーム画面CTAボタン =====
export function updateHomeCTA(){
  var s = getState();
  var title = document.getElementById('home-cta-title');
  var sub = document.getElementById('home-cta-sub');
  var card = document.getElementById('home-cta-card');
  if(!title || !sub || !card) return;

  var todayStr = new Date().toDateString();
  var hasRecord = false;
  for(var i=0; i<s.records.length; i++){
    if(new Date(s.records[i].date).toDateString() === todayStr){ hasRecord = true; break; }
  }

  var nearPeriod = isPeriodExpected();

  var cs = getComputedStyle(document.documentElement);
  if(nearPeriod && !hasRecord){
    title.textContent = '🌸 生理がきた？';
    sub.textContent = 'タップして今日の状態を記録';
    card.style.background = cs.getPropertyValue('--cta-period').trim();
  } else if(hasRecord){
    title.textContent = '✓ 今日の記録を見る';
    sub.textContent = '記録済み・タップして確認';
    card.style.background = cs.getPropertyValue('--cta-done').trim();
  } else {
    title.textContent = '今日を記録する';
    sub.textContent = 'まだ今日の記録がありません';
    card.style.background = cs.getPropertyValue('--cta-default').trim();
  }
}

export function handleHomeCTA(){
  // daily check-in 完了フラグを確認 (2026-05-27):
  // record.meta.uiFlow === 'daily-checkin' が立っていれば「ふり返り」画面へ。
  // 未完了 or 他の入力経路からの保存のみの場合は3カードUIを開く。
  var today = new Date().toISOString().slice(0, 10);
  var s = getState();
  var rec = s && (s.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  var isDailyCheckinDone = !!(rec && rec.meta && rec.meta.uiFlow === 'daily-checkin');

  if (isDailyCheckinDone && typeof window.openTodayReflection === 'function') {
    window.openTodayReflection();
  } else if (typeof window.openRecordScreen === 'function') {
    window.openRecordScreen();
  } else if (typeof window.showToast === 'function') {
    // PR-092C (UI/UX Final Council採用): record-modal完全終了に伴い、旧5ステップwizard
    // フォールバックを廃止し、record-three-card.js未ロード時は最小限のエラー通知に置換。
    window.showToast('読み込みに問題が発生しました。ページを再読み込みしてください。', 'warn');
  }
}

// ===== 連続記録バッジ色変化 =====
export function updateStreakBadge() {
  var badge = document.getElementById('streak-badge');
  if (!badge) return;
  var s = getState();
  var today = new Date().toISOString().slice(0, 10);
  var recordedToday = (s.records || []).some(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  if (recordedToday) {
    badge.style.background = 'var(--sage-light)';
    badge.style.color = 'var(--sage)';
    var countEl = document.getElementById('streak-badge-count');
    if (countEl) countEl.nextSibling && (countEl.parentNode.lastChild.textContent = '日連続 ✓');
  } else {
    badge.style.background = 'var(--rose-pale)';
    badge.style.color = 'var(--rose)';
  }
}

// ── window bridge 登録 ────────────────────────────────────────
// モジュール実行後に window.* を上書きしてモジュール版が優先される

window.showMain                   = showMain;
window.applyHomeModulesVisibility = applyHomeModulesVisibility;
window.updateDate            = updateDate;
window.updateGreeting        = updateGreeting;
window.updateStats           = updateStats;
// ownership-map が wrap 済みの場合は上書きしない（後発代入による wrap 破壊を防ぐ）
if (!window.buildHomeWeekRow || !window.buildHomeWeekRow.__ippoOwnershipWrapped) {
  window.buildHomeWeekRow = buildHomeWeekRow;
}
// __raw_buildHomeWeekRow は ownership-map._wrapRender が管理するため ここでは設定しない
window.updateHomeInsightCard = updateHomeInsightCard;
window.updateHomeNumbers     = updateHomeNumbers;
window.updateHomeDiseaseAdvice = updateHomeDiseaseAdvice;
window.updateHomeCTAState    = updateHomeCTAState;
window.updateTodayMessage    = updateTodayMessage;
window.updateDailyHintCard   = updateDailyHintCard;
window.buildHomeCalendar     = buildHomeCalendar;
window.changeHomeCalMonth    = changeHomeCalMonth;
// PR-089D (Legacy Removal Batch-11分割③): app-legacy.jsから物理移動した7関数のbridge。
window.updateHomePhaseBanner    = updateHomePhaseBanner;
window.buildPhaseBar            = buildPhaseBar;
window.renderMonthlySummaryText = renderMonthlySummaryText;
window.updateHomeSummary        = updateHomeSummary;
window.updateHomeCTA            = updateHomeCTA;
window.handleHomeCTA            = handleHomeCTA;
window.updateStreakBadge        = updateStreakBadge;

// 診断・テスト用サマリー
window.ippoHomeRenderer = {
  showMain,
  updateDate,
  updateGreeting,
  updateStats,
  buildHomeWeekRow,
  updateHomeInsightCard,
  updateHomeNumbers,
  updateHomeDiseaseAdvice,
  updateHomeCTAState,
};

// PR-6: homeModules 変更時にホームへリアルタイム反映
// settings で toggle → saveSettingsProfile → ippo:settings-profile-changed → ここで更新
window.addEventListener('ippo:settings-profile-changed', function() {
  var homeEl = document.getElementById('screen-home');
  if (!homeEl || !homeEl.classList.contains('active')) return;
  applyHomeModulesVisibility();
  updateHomeInsightCard();
  updateHomeDiseaseAdvice();
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('home-renderer-module-loaded');
}
