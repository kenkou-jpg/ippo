// ============================================================
//  ippo – src/modules/home-renderer.js
//  Phase E (Step 3): showMain() と依存 UI 関数群の module 移植
//
//  設計方針:
//  - window.state への参照はそのまま維持（window 依存はまだ断ち切らない）
//  - buildCalendar / updateUnlock / reorderRecordSections 等、
//    未移植の関数は引き続き window.* 経由で委譲
//  - window.showMain / window.updateStats 等の bridge を登録し
//    app.html 側の呼び出しを透過的にモジュール版へ誘導
// ============================================================

// ── ヘルパー ─────────────────────────────────────────────────

function getGreetingText() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 10) return 'おはようございます';
  if (hour >= 10 && hour < 17) return 'こんにちは';
  if (hour >= 17 && hour < 21) return 'こんばんは';
  return 'おつかれさまです';
}

function calcPainFreeDaysThisMonth() {
  var s = window.state || {};
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

function calcAvgPainThisMonth() {
  var s = window.state || {};
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
  var s = window.state || {};
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
        if (new Date(s.records[i].date).toDateString() === ds) { found = true; break; }
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

export function updateStats() {
  var s = window.state || {};
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

// ── 記録履歴（現在は空実装）─────────────────────────────────

export function updateHistory() {
  // 最近の記録セクション削除済み
}

// ── 週間行 ────────────────────────────────────────────────────

export function buildHomeWeekRow() {
  var weekRow = document.getElementById('home-week-row');
  if (!weekRow) return;

  var s = window.state || {};
  var today = new Date();
  var dayOfWeek = today.getDay();
  var monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  var days = ['月', '火', '水', '木', '金', '土', '日'];
  var html = '';

  var phaseColors = {
    '月経期': '#f0a0b0', '卵胞期': '#88c8a0',
    '排卵期': '#80b8c8', '黄体期': '#d4a870', '不明': '#ede8e4',
  };

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
    var pain = rec ? (rec.painLevel || 0) : null;

    var phase = typeof window.getPhaseForDate === 'function' ? window.getPhaseForDate(d) : '不明';
    var phaseColor = phaseColors[phase] || phaseColors['不明'];

    var cellBg = isFuture ? '#f0ebe8' :
                 rec === undefined ? '#ede8e4' :
                 pain >= 4 ? '#c04060' :
                 pain >= 2 ? '#e8809a' :
                 pain >= 1 ? '#f0a8b8' : phaseColor;
    var cellColor  = (pain >= 2) ? 'white' : 'var(--ink)';
    var cellWeight = isToday ? '700' : '500';
    var clickable  = !isFuture;

    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;'
      + (clickable ? 'cursor:pointer;' : '') + '"'
      + (clickable ? ' onclick="openDayDetailByDate(\'' + dateStr + '\')"' : '')
      + '>';
    html += '<div style="font-size:10px;color:var(--ink-light);">' + days[i] + '</div>';
    html += '<div style="width:100%;aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;'
      + 'font-size:12px;font-weight:' + cellWeight + ';'
      + 'color:' + cellColor + ';background:' + cellBg + ';'
      + (isToday ? 'box-shadow:0 0 0 2px var(--rose-dark);' : '')
      + '">' + d.getDate() + '</div>';
    html += '</div>';
  }
  weekRow.innerHTML = html;
  if (typeof window.buildPhaseBar === 'function') window.buildPhaseBar(monday);
}

// ── 今週の気づきカード ────────────────────────────────────────

export function updateHomeInsightCard() {
  var card = document.getElementById('home-insight-card');
  var text = document.getElementById('home-insight-text');
  if (!card || !text) return;

  var s = window.state || {};
  var records = s.records || [];
  if (records.length < 3) { card.style.display = 'none'; return; }

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
  var s = window.state || {};
  var streak = s.streak || 0;
  var streakEl = document.getElementById('home-streak-num');
  if (streakEl) streakEl.textContent = streak;
  var fireEl = document.getElementById('home-streak-fire');
  if (fireEl) fireEl.textContent = streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '';

  var nextEl    = document.getElementById('home-next-num');
  var nextLabel = document.getElementById('home-next-label');
  var nextUnit  = document.getElementById('home-next-unit');
  if (!nextEl) return;

  if (s.lastPeriodDate && s.cycleLength) {
    var last     = new Date(s.lastPeriodDate + 'T00:00:00');
    var today    = new Date();
    var dayNum   = Math.floor((today - last) / 86400000) + 1;
    var daysLeft = s.cycleLength - dayNum;
    if (daysLeft > 0) {
      nextEl.textContent = daysLeft;
      if (nextUnit) nextUnit.textContent = '日後';
    } else {
      nextEl.textContent = '今日';
      if (nextUnit) nextUnit.textContent = '頃';
    }
  } else {
    nextEl.textContent = '—';
    if (nextLabel) nextLabel.textContent = '次の生理予測';
    if (nextUnit)  nextUnit.textContent  = '';
  }
}

// ── 疾患別アドバイス ──────────────────────────────────────────

export function updateHomeDiseaseAdvice() {
  var card = document.getElementById('home-disease-advice');
  var text = document.getElementById('home-disease-advice-text');
  if (!card || !text) return;

  var s = window.state || {};
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

// ── CTA カード ────────────────────────────────────────────────

export function updateHomeCTAState() {
  var s = window.state || {};
  var today = new Date().toISOString().slice(0, 10);
  var rec = (s.records || []).find(function (r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });

  var card  = document.getElementById('home-cta-card');
  var title = document.getElementById('home-cta-title');
  var sub   = document.getElementById('home-cta-sub');
  if (!card) return;

  if (rec) {
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '0.82';
    if (title) title.textContent = '✓ 今日の記録完了';
    if (sub) sub.textContent = typeof window.buildComparisonComment === 'function'
      ? window.buildComparisonComment(rec)
      : '';
  } else {
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '1';
    if (title) title.textContent = '今日を記録する';
    if (sub)   sub.textContent   = '';
  }
}

// ── showMain ─────────────────────────────────────────────────

export function showMain() {
  document.getElementById('screen-welcome').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';

  // モジュール内で完結する関数を直接呼ぶ
  updateGreeting();
  updateStats();
  updateHistory();
  buildHomeWeekRow();
  updateHomeInsightCard();
  updateHomeNumbers();
  updateHomeDiseaseAdvice();
  updateHomeCTAState();

  // 未移植の関数は window.* 経由で委譲（app.html 側に残っている）
  if (typeof window.updateUnlock === 'function') window.updateUnlock();
  if (typeof window.buildCalendar === 'function') window.buildCalendar();
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

// ── window bridge 登録 ────────────────────────────────────────
// モジュール実行後に window.* を上書きしてモジュール版が優先される

window.showMain              = showMain;
window.updateDate            = updateDate;
window.updateGreeting        = updateGreeting;
window.updateHistory         = updateHistory;
window.updateStats           = updateStats;
window.buildHomeWeekRow      = buildHomeWeekRow;
window.updateHomeInsightCard = updateHomeInsightCard;
window.updateHomeNumbers     = updateHomeNumbers;
window.updateHomeDiseaseAdvice = updateHomeDiseaseAdvice;
window.updateHomeCTAState    = updateHomeCTAState;

// 診断・テスト用サマリー
window.ippoHomeRenderer = {
  showMain,
  updateDate,
  updateGreeting,
  updateHistory,
  updateStats,
  buildHomeWeekRow,
  updateHomeInsightCard,
  updateHomeNumbers,
  updateHomeDiseaseAdvice,
  updateHomeCTAState,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('home-renderer-module-loaded');
}
