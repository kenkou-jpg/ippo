// ============================================================
// ippo – src/modules/tab-navigation.js
// Phase D-1: tab UI 切替ロジックの module 化
//
// app.html の inline switchTab() をここへ移植。
// window.switchTab を上書きし、既存の onclick ハンドラと互換を維持。
// tab-specific な更新関数は window.* 経由で呼び出す（まだ inline に残る）。
// ============================================================

import { ensureScreenLoaded, showScreen } from './screen-router.js';
import { renderSharedHeader }             from './shared-header.js';
import { renderInsClinicalSummary }       from './insights-clinical-summary.js';
import { triggerInsightSurface, showThinkingSheet } from './insight-recommendation-sheet.js';
import { renderInsightsDynamic }          from './insights-dynamic-renderer.js';

// Disease tab data for PRO insights screen
var _IPR_DIS = [
  { sub:'子宮内膜症の症状と関連しやすい傾向',
    items:[
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'排卵期前後にだるさ・体の重さが出やすい'},
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'睡眠不足が続くと、痛みが強くなる傾向があります'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'ストレスが高いと、症状が悪化する傾向があります'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'温かい飲み物をとると、落ち着きやすい傾向があります'}
    ],
    note:'過去3ヶ月の記録をもとにした、あなたの傾向です。'
  },
  { sub:'PMSの症状と関連しやすい傾向',
    items:[
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'生理前7〜10日に気分の落ち込みが現れやすい'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'甘いものへの欲求が増す時期があります'},
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'睡眠の乱れと症状の重さが連動しやすい傾向があります'},
      {bg:'#edf5ef',stroke:'#5a9070',text:'軽い有酸素運動が症状を和らげることがあります'}
    ],
    note:'生理周期に合わせた記録が増えると、より正確な傾向が見えてきます。'
  },
  { sub:'過敏性腸症候群（IBS）と関連しやすい傾向',
    items:[
      {bg:'#fff0e6',stroke:'#d4845a',text:'ストレスが強い日にお腹の不調が出やすい傾向があります'},
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'生理前後に症状が悪化しやすい傾向があります'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'冷たい飲食物で症状が誘発されやすい傾向があります'},
      {bg:'#edf5ef',stroke:'#5a9070',text:'規則的な食事時間が腸の安定を助けます'}
    ],
    note:'食事・ストレス・生活習慣の記録が増えると傾向が明確になります。'
  },
  { sub:'片頭痛と関連しやすい傾向',
    items:[
      {bg:'#ede8ff',stroke:'#8b7fd6',text:'生理前後に頭痛が出やすい傾向があります'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'睡眠不足や睡眠過多が誘発要因となりやすい'},
      {bg:'#fff0e6',stroke:'#d4845a',text:'光・音・匂いへの敏感さが症状と連動しやすい'},
      {bg:'#edf5ef',stroke:'#5a9070',text:'ストレスの解放期（週末など）に起こりやすい傾向があります'}
    ],
    note:'症状の記録が増えると、頭痛の予測精度が上がります。'
  }
];

function _renderInsChart(records) {
  var svg = document.querySelector('.ipr-graph-card svg'); if (!svg) return;
  var now = new Date();
  var last30 = (records || []).filter(function(r) { return (now - new Date(r.date)) / 86400000 <= 30; })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  if (last30.length < 3) return;
  var xs = [50, 132, 214, 296, 378, 460, 540];
  var pts = xs.map(function(x, i) {
    var daysAgo = Math.round((6 - i) * 29 / 6);
    var tgt = new Date(now); tgt.setDate(tgt.getDate() - daysAgo);
    var cl = null, mn = 4;
    last30.forEach(function(r) { var df = Math.abs((new Date(r.date) - tgt) / 86400000); if (df < mn) { mn = df; cl = r; } });
    return {x: x, date: tgt, r: cl};
  });
  function toY(p) { return Math.round(134 - Math.min(100, Math.max(0, p)) / 100 * 120); }
  var fns = [
    function(r) { return r ? (r.painLevel || 0) / 10 * 100 : null; },
    function(r) { return r ? (r.mood || 3) / 5 * 100 : null; },
    function(r) { return r ? Math.min(100, (r.sleepHours || 0) / 10 * 100) : null; },
    function(r) { if (!r || !r.basalTemp) return null; return Math.max(0, 100 - Math.abs(r.basalTemp - 36.5) * 100); }
  ];
  var avgs = fns.map(function(fn) {
    var vs = last30.map(fn).filter(function(v) { return v !== null; });
    return vs.length ? vs.reduce(function(a, b) { return a + b; }, 0) / vs.length : 50;
  });
  var polys = svg.querySelectorAll('polyline');
  var paths = svg.querySelectorAll('path');
  var xt = svg.querySelectorAll('g[text-anchor="middle"] text');
  var cg = [svg.querySelector('g[fill="#6da7e8"]'), svg.querySelector('g[stroke="#8b7fd6"]'),
            svg.querySelector('g[stroke="#9d8bf2"]'), svg.querySelector('g[stroke="#e8b28a"]')];
  var mo = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  pts.forEach(function(p, i) { if (i < xt.length - 1) xt[i].textContent = mo[p.date.getMonth()] + '/' + p.date.getDate(); });
  fns.forEach(function(fn, si) {
    var ys = pts.map(function(p) { var v = fn(p.r); return toY(v !== null ? v : avgs[si]); });
    var ps = pts.map(function(p, i) { return p.x + ',' + ys[i]; }).join(' ');
    if (polys[si]) polys[si].setAttribute('points', ps);
    if (paths[si]) {
      var d = 'M' + pts[0].x + ',' + ys[0];
      for (var j = 1; j < pts.length; j++) d += ' L' + pts[j].x + ',' + ys[j];
      d += ' L540,134 L50,134Z'; paths[si].setAttribute('d', d);
    }
    if (cg[si]) cg[si].querySelectorAll('circle').forEach(function(c, ci) {
      if (ci < pts.length) { c.setAttribute('cx', pts[ci].x); c.setAttribute('cy', ys[ci]); }
    });
  });
}

function _wireInsightsScreen() {
  var sc = document.getElementById('screen-insights'); if (!sc) return;

  // ── Ensure IDs exist for renderInsightDiscoveries ──
  var insH2 = sc.querySelector('.ipr-ins-h2');
  if (insH2 && !insH2.id) insH2.id = 'ins-main-insight-text';
  var insBody = sc.querySelector('.ipr-ins-body');
  if (insBody && !insBody.id) insBody.id = 'ins-main-insight-sub';

  // ── 今日の気づきカード ─────────────────────────────────
  // カードタイトル/eyebrow クリック → insight推薦シート（「どう深めるか」の入口）
  var insCard = sc.querySelector('.ipr-ins-card');
  if (insCard && !insCard._irsWired) {
    insCard._irsWired = true;
    var insCardTitle = insCard.querySelector('.ipr-card-title');
    if (insCardTitle) {
      insCardTitle.style.cursor = 'pointer';
      insCardTitle.addEventListener('click', function() { triggerInsightSurface('insight'); });
    }
  }
  // "根拠をみる" → 分析チャートセクションへスクロール（根拠 = 実際のデータ）
  var insLink = sc.querySelector('.ipr-ins-link');
  if (insLink) insLink.onclick = function() { document.querySelector('.ipr-analysis')?.scrollIntoView({behavior:'smooth',block:'start'}); };

  // ── 30日チャート・周期フェーズ ───────────────────────────
  // "詳細をみる" → カレンダー
  var graphLink = sc.querySelector('.ipr-graph-link');
  if (graphLink) graphLink.onclick = function() { if (typeof window.switchTab === 'function') window.switchTab('calendar'); };
  // "周期カレンダーを見る" → カレンダー
  var cycleLink = sc.querySelector('.ipr-cycle-link');
  if (cycleLink) cycleLink.onclick = function() { if (typeof window.switchTab === 'function') window.switchTab('calendar'); };

  // ── 自分に問いかけるカード ────────────────────────────────
  // "考えてみる" → Thinking Sheet（トピック選択 → 推薦シート）
  var reflectLink = sc.querySelector('.ipr-reflect-link');
  if (reflectLink) reflectLink.onclick = function() { showThinkingSheet(); };

  // ── 実験提案カード ────────────────────────────────────────
  // カードタイトル/eyebrow クリック → experiment推薦シート（「どう試すか」の入口）
  var expCard = sc.querySelector('.ipr-exp-card');
  if (expCard && !expCard._irsWired) {
    expCard._irsWired = true;
    var expCardTitle = expCard.querySelector('.ipr-card-title');
    if (expCardTitle) {
      expCardTitle.style.cursor = 'pointer';
      expCardTitle.addEventListener('click', function() { triggerInsightSurface('experiment'); });
    }
  }
  // "実験を記録する" → ヘルス実験画面（P13-P0: 実験導線修正）
  var expBtn = sc.querySelector('.ipr-exp-btn');
  if (expBtn) expBtn.onclick = function() { if (typeof window.openExperiments === 'function') window.openExperiments(); };

  // ── ヒントカード ──────────────────────────────────────────
  // "すべてのヒントを見る" → insight推薦シート（パターン解析への案内）
  var tipsLink = sc.querySelector('.ipr-tips-head-link');
  if (tipsLink) tipsLink.onclick = function() { triggerInsightSurface('insight'); };

  // ── Disease tab switcher (always fresh definition) ─
  window._iprSwitchDisTab = function(idx) {
    sc.querySelectorAll('.ipr-dis-tab').forEach(function(t, i) { t.classList.toggle('active', i === idx); });
    var d = _IPR_DIS[idx]; if (!d) return;
    var sh = sc.querySelector('.ipr-dis-subhead'); if (sh) sh.textContent = d.sub;
    var list = sc.querySelector('.ipr-dis-list');
    if (list) list.innerHTML = d.items.map(function(it) {
      return '<li><div class="ipr-dis-ico" style="background:' + it.bg + '">'
        + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="' + it.stroke + '" stroke-width="1.6" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        + '</div>' + it.text + '</li>';
    }).join('');
    var note = sc.querySelector('.ipr-dis-note'); if (note) note.textContent = d.note;
  };
  sc.querySelectorAll('.ipr-dis-tab').forEach(function(btn, idx) {
    btn.onclick = function() { window._iprSwitchDisTab(idx); };
  });

  // ── Hydration: state → DOM ─────────────────────────
  var s = (typeof window.getState === 'function' ? window.getState() : null) || window.state || null;
  if (!s) return;
  var records = s.records || [];
  var r = records.length ? records[records.length - 1] : null;

  if (s.lastPeriodDate) {
    var last = new Date(s.lastPeriodDate + 'T00:00:00'), now2 = new Date();
    var cyc = s.cycleLength || 28;
    var dayNum = (Math.floor((now2 - last) / 86400000) % cyc) + 1; if (dayNum < 1) dayNum = 1;
    var phase = dayNum <= 5 ? '月経期' : dayNum <= 13 ? '卵胞期' : dayNum <= 16 ? '排卵期' : '黄体期';
    var cpEl = sc.querySelector('.ipr-cycle-center-phase'); if (cpEl) cpEl.textContent = phase;
    var cdEl = sc.querySelector('.ipr-cycle-center-day'); if (cdEl) cdEl.textContent = '今日・周期' + dayNum + '日目';
    var pm = {'月経期': 0, '卵胞期': 1, '排卵期': 2, '黄体期': 3};
    sc.querySelectorAll('.ipr-cycle-leg').forEach(function(el, i) { el.classList.toggle('cur', i === pm[phase]); });
  }

  var hr = new Date().getHours();
  var greetEl = sc.querySelector('.ipr-hero-greeting');
  if (greetEl) greetEl.textContent = hr < 12 ? 'おはようございます ☀' : hr < 18 ? 'こんにちは ☀' : 'おやすみなさい 🌙';

  var last7 = records.filter(function(r2) { return (new Date() - new Date(r2.date)) / 86400000 <= 7; });
  var avg7 = last7.length ? last7.reduce(function(s2, r2) { return s2 + (r2.sleepHours || 0); }, 0) / last7.length : 0;
  var leadEl = sc.querySelector('.ipr-hero-lead');
  if (leadEl && last7.length >= 2) {
    if (avg7 >= 7) leadEl.textContent = '睡眠が安定しています。その調子を大切に。';
    else if (avg7 > 0 && avg7 < 6) leadEl.textContent = '少し休息が足りないかもしれません。自分を労わる時間を、大切に。';
  }

  var qi = (function() {
    var now3 = new Date();
    var r30 = records.filter(function(rx) { return (now3 - new Date(rx.date)) / 86400000 <= 30; });
    if (r30.length < 3) return null;
    var ss = r30.filter(function(rx) { return (rx.sleepHours || 8) < 6 && rx.sleepHours > 0; });
    if (ss.length >= 2) {
      var nps = ss.map(function(rx) {
        var d2 = new Date(rx.date); d2.setDate(d2.getDate() + 1);
        var nx = r30.find(function(r2) { return new Date(r2.date).toDateString() === d2.toDateString(); });
        return nx ? (nx.painLevel || 0) : null;
      }).filter(function(v) { return v !== null; });
      if (nps.length >= 1 && nps.reduce(function(a, b) { return a + b; }, 0) / nps.length >= 2)
        return {hint:'睡眠が安定した翌日は、症状が軽くなる傾向があります。',
                exp:'今週の実験：就寝時刻を30分早めてみる',
                expBody:'睡眠不足の翌日に症状が出やすい傾向があります。早めに休むことで、翌日の調子が変わるか試してみましょう。'};
    }
    var sc2 = {};
    r30.forEach(function(rx) { (rx.symptoms || []).forEach(function(sym) { sc2[sym] = (sc2[sym] || 0) + 1; }); });
    var top = Object.keys(sc2).sort(function(a, b) { return sc2[b] - sc2[a]; })[0];
    if (top && sc2[top] >= 3)
      return {hint:'「' + top + '」が続いています。からだのサインに耳を傾けてみましょう。',
              exp:'今週の実験：症状が出た時間帯を記録してみる',
              expBody:'症状のパターンが見えることで、対策が立てやすくなります。詳しく記録しておきましょう。'};
    return null;
  })();
  if (qi) {
    var ht = sc.querySelector('.ipr-hints-text'); if (ht) ht.innerHTML = qi.hint;
    var ep = sc.querySelector('.ipr-exp-proposal'); if (ep) ep.textContent = qi.exp;
    var eb = sc.querySelector('.ipr-exp-body'); if (eb) eb.textContent = qi.expBody;
  }

  _renderInsChart(records);
  window._iprSwitchDisTab(0);

  // Dynamic insight system: signal-based content rendering
  renderInsightsDynamic(s, sc);
}

export async function switchTab(tab, btn) {
  // calendar / insights は静的 DOM に存在しないため fetch して注入
  await ensureScreenLoaded(tab);

  // showScreen() 経由で state.currentScreen を更新する。
  // welcome-reset-guard が setTimeout(0) で showScreen(getCurrentScreen()) を
  // 呼ぶため、ここで currentScreen を正しいタブに更新しないと home に戻される。
  await showScreen(tab);

  // nav ボタンのアクティブ状態を同期（showScreen は data-tab-for を見るが
  // ボトムナビは data-tab 属性のため手動で合わせる）
  document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.remove('active'); });
  if (btn) btn.classList.add('active');

  window.scrollTo(0, 0);

  if (tab === 'insights') {
    // 共通ヘッダーシェルを描画（PRO整理室ボタン付き）
    renderSharedHeader(document.getElementById('ins-header'), { isInsights: true });
    // 新デザイン: おすすめタブをデフォルト表示
    if (typeof window.switchInsTab === 'function') window.switchInsTab('recommended');
    if (typeof window.renderInsightDiscoveries === 'function') window.renderInsightDiscoveries();
    if (typeof window.renderMonthlySummaryText === 'function') window.renderMonthlySummaryText();
    // Clinical Summary: レポートタブ用の観察サマリーを事前レンダリング
    renderInsClinicalSummary();
    // PRO screen: wire all buttons + hydrate with real data (bypasses ?raw cache)
    _wireInsightsScreen();
  }

  if (tab === 'home') {
    if (typeof window.buildHomeWeekRow === 'function') window.buildHomeWeekRow();
    if (typeof window.updateHomeInsightCard === 'function') window.updateHomeInsightCard();
    if (typeof window.updateHomeNumbers === 'function') window.updateHomeNumbers();
    if (typeof window.updateHomeDiseaseAdvice === 'function') window.updateHomeDiseaseAdvice();
    if (typeof window.updateHomeCTAState === 'function') window.updateHomeCTAState();
    if (typeof window.updateHomePhaseBanner === 'function') window.updateHomePhaseBanner();
    if (typeof window.updateTodayMessage === 'function') window.updateTodayMessage();
  }

  if (tab === 'calendar') {
    if (typeof window.buildCalendarNext === 'function') window.buildCalendarNext();
    else if (typeof window.buildCalendar === 'function') window.buildCalendar();
  }

  if (tab === 'settings') {
    // PHASE 1: sp-overlay.sp-active 残留を解消（設定パネルが開いたまま他タブ→設定に戻ると
    //          position:fixed overlay が残りタップを全て吸収する問題の修正）
    ['mode', 'priority', 'style', 'modules'].forEach(function(t) {
      var ov = document.getElementById('sp-overlay-' + t);
      var pn = document.getElementById('sp-panel-'  + t);
      if (ov) ov.classList.remove('sp-active');
      if (pn) pn.classList.remove('sp-active');
    });
    document.body.style.overflow = '';

    renderSharedHeader(document.getElementById('set-header'));
    // PR-3: 設定画面を開くたびに最新 state を反映する
    // tab-navigation.js はこれらの関数を直接 import しないため window.* 経由で呼ぶ
    if (typeof window.updateSettingsHero       === 'function') window.updateSettingsHero();
    if (typeof window.initSettingsPanels       === 'function') window.initSettingsPanels();
    if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
    if (typeof window.updateSymptomSettingDisplay === 'function') window.updateSymptomSettingDisplay();
  }
}

// inline の function 宣言より後に実行されるため安全に上書きできる
window.switchTab = switchTab;

// startup 時 state.currentScreen='insights' で自動表示された場合は
// switchTab を経由しないため、遅延してワイヤリングを補完する。
setTimeout(function() {
  var sc = document.getElementById('screen-insights');
  if (sc && sc.classList.contains('active')) {
    renderSharedHeader(document.getElementById('ins-header'), { isInsights: true });
    _wireInsightsScreen();
  }
}, 400);

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('tab-navigation-module-loaded');
}
