// ================================================================
//  ippo – src/modules/insights-tab-panel.js
//  PR-086 (Legacy Removal Batch-8): Insight 5タブ切り替え・発見ロジック
//
//  app-legacy.js の switchInsTab/renderInsightDiscoveries/_updateInsMainCard/
//  updateFoodBodyCorrelation/updateCycleSymptomCorrelation を新設・物理移動。
//  Business Logic変更なし。
//
//  【移植先の変更理由】docs/phase4d-legacy-migration-audit.md Batch-8節は
//  移植先を `insights-dynamic-renderer.js` 拡充と想定していたが、実装前調査の結果
//  同ファイルは別世代の独立した「動的インサイトレンダラー」（signal→resolver→template
//  パイプライン、comment stabilization等の設計原則を持つ）であり、本ファイルが扱う
//  旧タブ切り替え体系（ins-pane-*/ins-tab-btn-*/discoveries-cards）とは異なる責務・
//  DOM体系と判明したため、専用新設ファイルへ変更（symptom-settings.js/
//  disease-settings.js分離とPR-084で確立した「1 feature = 1 owner」判断を踏襲）。
//  両ファイルとも `#ins-main-insight-text`/`#ins-main-insight-sub` を対象とするが、
//  これは PR-086 以前から存在した重複実装（PR-080C「重複実装は統合しない」判断と
//  同型）であり、本PRで新たに生じたものではない。
//
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
//  ・raw `isPremium` は PR-090-R1 (EXPORT_HUB_REFACTOR_COUNCIL Legacy依存解消) で
//    app-legacy.js側ブリッジ window.__ippoGetIsPremium() から
//    src/modules/premium/premium-service.js の isPremium() 直接importへ変更
//    （同一のPremium Source of Truthを参照する値のため挙動変更なし。
//    isAdminOrPremium()は管理者バイパスを含み意味が異なるため使用しない、の方針は継続）。
//  ・displayPhases（updateCycleSymptomCorrelation内）はapp-legacy.js側にも定義が
//    存在しない未解決識別子だが、container(#cycle-symptom-correlation)がapp.htmlに
//    存在せず必ず早期returnするため到達不能（pre-existing dead code、本PR起因ではない）。
//    挙動を変えないためbareのまま温存。
//  ・renderMonthlySummaryText（app-legacy.js残置、Batch-8対象外）は
//    window.renderMonthlySummaryText() 経由のguarded呼び出しに変更。
//  ・renderComparisonChart（pro/correlation-report.js、PR-082F物理移動済み・
//    app-legacy.js残置）/ renderPhaseMap（pro/cycle-report.js、PR-082D物理移動済み・
//    app-legacy.js残置）は window.* 経由のguarded呼び出しに変更（既存のtypeofガードは
//    元々app-legacy.js内のimportされたローカル変数を指していたため、モジュール境界を
//    越えるには window 経由に変更する必要がある。既存挙動は不変）。
//  ・renderTimeline は現行main.jsで未import（timeline.jsがorphaned module、PR-084A
//    調査時に発見済みの既知ギャップ、本PR起因ではない）のため window.renderTimeline は
//    常にundefinedでガード節がno-opになる、元々の挙動と同一。
// ================================================================

import { isPremium } from './premium/premium-service.js';

// ===== インサイト タブ切り替え (Pattern B: 5タブ) =====
export function switchInsTab(tab) {
  // 旧タブ名の後方互換マッピング
  var legacyMap = { free: 'recommended', pro: 'trends', doctor: 'report' };
  if (legacyMap[tab]) tab = legacyMap[tab];

  var panes = ['recommended', 'trends', 'cycle', 'experiments', 'report'];
  panes.forEach(function(p) {
    var pane = document.getElementById('ins-pane-' + p);
    var btn  = document.getElementById('ins-tab-btn-' + p);
    if (!pane || !btn) return;
    if (p === tab) {
      pane.style.display = 'block';
      btn.style.background = '#F3EFFD';
      btn.style.color = '#A78BFA';
      btn.style.fontWeight = '500';
      btn.style.borderColor = 'rgba(167,139,250,0.22)';
      btn.style.boxShadow = 'none';
    } else {
      pane.style.display = 'none';
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(45,31,26,0.42)';
      btn.style.fontWeight = '400';
      btn.style.borderColor = 'transparent';
      btn.style.boxShadow = 'none';
    }
  });

  if (tab === 'recommended') {
    renderInsightDiscoveries();
    if (typeof window.renderMonthlySummaryText === 'function') window.renderMonthlySummaryText();
  }
  if (tab === 'trends') {
    setTimeout(function(){
      if (typeof window.renderComparisonChart === 'function') window.renderComparisonChart();
      if (typeof window.renderTimeline === 'function') window.renderTimeline();
    }, 80);
  }
  if (tab === 'cycle') {
    if (typeof window.renderPhaseMap === 'function') window.renderPhaseMap();
    setTimeout(function(){
      updateFoodBodyCorrelation();
      updateCycleSymptomCorrelation();
    }, 80);
  }
}

// ===== インサイト発見ロジック＋メインカード更新 =====
export function renderInsightDiscoveries() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderInsightDiscoveries', renderInsightDiscoveries);
    return;
  }
  var now = new Date();
  var records30 = (window.state.records || []).filter(function(r){
    var d = new Date(r.record_date || r.date);
    return (now - d) / 86400000 <= 30;
  });

  // 記録不足の場合は空状態を表示
  var emptyEl = document.getElementById('insights-empty-state');
  if (records30.length < 3) {
    if (emptyEl) emptyEl.style.display = 'block';
    _updateInsMainCard(
      '記録を続けると、\nあなたの体のパターンが見えてきます。',
      '7日間記録すると、食事・症状・周期のつながりが分かってきます。'
    );
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // ── 発見候補を生成 ──────────────────────────────────
  var best = null; // { main, sub, priority }

  // 1. 睡眠が短い翌日の痛み
  var shortSleepDays = records30.filter(function(r){ return (r.sleepHours || 8) < 6 && r.sleepHours > 0; });
  if (shortSleepDays.length >= 2) {
    var nextDayPains = shortSleepDays.map(function(r){
      var d = new Date(r.record_date || r.date); d.setDate(d.getDate()+1);
      var nx = records30.find(function(r2){ return new Date(r2.record_date || r2.date).toDateString() === d.toDateString(); });
      return nx ? (nx.painLevel || 0) : null;
    }).filter(function(v){ return v !== null; });
    if (nextDayPains.length >= 1) {
      var avgNP = nextDayPains.reduce(function(a,b){return a+b;},0)/nextDayPains.length;
      if (avgNP >= 2) {
        var pct = Math.round(nextDayPains.filter(function(v){return v>=2;}).length / nextDayPains.length * 100);
        best = {
          priority: 5,
          main: '睡眠が6時間未満の日の翌日は、\n頭痛が出やすい傾向があります',
          sub:  '過去30日の記録からみると、約' + pct + '%の確率で見られます。あなたの体のパターンです。'
        };
      }
    }
  }

  // 2. 生理前の痛み集中
  var painDays = records30.filter(function(r){ return (r.painLevel || 0) >= 4; });
  if (painDays.length >= 3) {
    var preLuteal = painDays.filter(function(r){
      if (!window.state.lastPeriodDate || !window.state.cycleLength) return false;
      var last = new Date(window.state.lastPeriodDate + 'T00:00:00');
      var dayNum = Math.floor((new Date(r.date) - last) / 86400000) + 1;
      var cl = window.state.cycleLength || 28;
      return dayNum >= (cl - 7) && dayNum <= cl;
    });
    if (preLuteal.length >= 2 && (!best || best.priority < 6)) {
      best = {
        priority: 6,
        main: '生理前の時期に、\n痛みが集中しやすい傾向があります',
        sub:  '過去30日で生理前' + preLuteal.length + '日間に痛みが集中しています。周期を把握することが助けになります。'
      };
    }
  }

  // 3. 運動した翌日の気分向上
  var exerciseDays = records30.filter(function(r){ return r.factors && r.factors.indexOf('運動した') !== -1; });
  if (exerciseDays.length >= 2 && (!best || best.priority < 4)) {
    var avgMoodEx = exerciseDays.reduce(function(s,r){ return s+(r.mood||3); },0) / exerciseDays.length;
    var nonEx = records30.filter(function(r){ return !r.factors || r.factors.indexOf('運動した') === -1; });
    var avgMoodNo = nonEx.length ? nonEx.reduce(function(s,r){ return s+(r.mood||3); },0) / nonEx.length : 3;
    if (avgMoodEx > avgMoodNo + 0.3) {
      best = {
        priority: 4,
        main: '運動した翌日は、\n気分が上向きやすいかもしれません',
        sub:  '運動した日と比べ、気分スコアが高い傾向が見られます。続けることが助けになりそうです。'
      };
    }
  }

  // 4. 繰り返し症状
  if (!best || best.priority < 3) {
    var symCount = {};
    records30.forEach(function(r){ (r.symptoms||[]).forEach(function(s){ symCount[s]=(symCount[s]||0)+1; }); });
    var topSym = Object.entries ? Object.entries(symCount).sort(function(a,b){return b[1]-a[1];})[0] : null;
    if (!topSym) {
      var keys = Object.keys(symCount).sort(function(a,b){return symCount[b]-symCount[a];});
      if (keys.length) topSym = [keys[0], symCount[keys[0]]];
    }
    if (topSym && topSym[1] >= 3) {
      best = {
        priority: 3,
        main: '今月、「' + topSym[0] + '」が\n' + topSym[1] + '日続いています',
        sub:  '記録を継続することで、症状のパターンが見えてきます。'
      };
    }
  }

  // 記録継続（ポジティブ）
  if (!best && records30.length >= 5) {
    best = {
      priority: 1,
      main: '今月は' + records30.length + '日、\n記録が続いています',
      sub:  '続けるほど、あなただけのからだのパターンが見えてきます。'
    };
  }

  if (best) {
    _updateInsMainCard(best.main, best.sub);
  }

  // discoveries-cards（非表示コンテナ）にも書き込む（後方互換）
  var container = document.getElementById('discoveries-cards');
  if (container) container.innerHTML = '';
}

export function _updateInsMainCard(main, sub) {
  var textEl = document.getElementById('ins-main-insight-text');
  var subEl  = document.getElementById('ins-main-insight-sub');
  if (textEl) textEl.innerHTML = main.replace(/\n/g, '<br>');
  if (subEl)  subEl.textContent = sub;
}

export function updateFoodBodyCorrelation() {
  var container = document.getElementById('food-body-correlation');
  if (!container) return;

  if (!isPremium()) {
    container.innerHTML = '<div style="position:relative;overflow:hidden;border-radius:12px;">'
      +'<div style="filter:blur(6px);opacity:0.5;pointer-events:none;">'
      +'<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🕐 ファスティングと不調の関係</div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:70px;">16h以上</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:35%;background:linear-gradient(90deg,#e8b4b8,#c9747a);border-radius:10px;"></div></div><span style="font-size:11px;width:35px;text-align:right;">35%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;color:var(--ink-light);width:70px;">16h未満</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:65%;background:linear-gradient(90deg,#c4d4b0,#8aab96);border-radius:10px;"></div></div><span style="font-size:11px;width:35px;text-align:right;">65%</span></div></div>'
      +'<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--ink);">🔍 注目の食材パターン</div>'
      +'<div style="margin-top:8px;padding:10px;background:var(--warm-light);border-radius:10px;font-size:12px;color:var(--ink);">「小麦」を含む日は不調が...</div>'
      +'</div>'
      +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(250,246,242,0.4);border-radius:12px;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🔒</div>'
      +'<div style="font-size:13px;color:var(--ink);font-weight:500;margin-bottom:4px;">プレミアム機能</div>'
      +'<div style="font-size:11px;color:var(--ink-light);margin-bottom:12px;">食事と体調の相関を分析します</div>'
      +'<button onclick="document.getElementById(\'premiumLockOverlay\').classList.add(\'active\')" style="padding:8px 24px;background:var(--rose);color:white;border:none;border-radius:20px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,107,0.3);">Premiumで解放</button>'
      +'</div></div>';
    return;
  }

    var records = window.state.records || [];
  if (records.length < 7) {
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">7日以上記録すると相関分析が表示されます。<br>あと' + Math.max(0, 7 - records.length) + '日！</div>';
    return;
  }

  var html = '';

  //  ① ファスティングと症状の関係
  var longFast = [];
  var shortFast = [];
  records.forEach(function(r) {
    var f = parseFloat(r.fasting) || 0;
    var symptoms = r.symptoms || [];
    var checks = r.diseaseCheck || {};
    var hasIssue = symptoms.length > 0 || Object.values(checks).some(function(v) { return v !== 'なし' && v; });
    if (f >= 16) longFast.push({ hasIssue: hasIssue, symptoms: symptoms, checks: checks });
    else if (f > 0) shortFast.push({ hasIssue: hasIssue, symptoms: symptoms, checks: checks });
  });

  if (longFast.length >= 2 && shortFast.length >= 2) {
    var longIssueRate = Math.round(longFast.filter(function(d) { return d.hasIssue; }).length / longFast.length * 100);
    var shortIssueRate = Math.round(shortFast.filter(function(d) { return d.hasIssue; }).length / shortFast.length * 100);
    var maxRate = Math.max(longIssueRate, shortIssueRate, 1);

    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🕐 ファスティングと不調の関係</div>';
    html += '<div style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:70px;flex-shrink:0;">16h以上</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + (longIssueRate / maxRate * 100) + '%;background:linear-gradient(90deg,#e8b4b8,#c9747a);border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:35px;text-align:right;">' + longIssueRate + '%</span>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:70px;flex-shrink:0;">16h未満</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + (shortIssueRate / maxRate * 100) + '%;background:linear-gradient(90deg,#c4d4b0,#8aab96);border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:35px;text-align:right;">' + shortIssueRate + '%</span>';
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--ink);line-height:1.8;margin-top:10px;padding:10px;background:var(--warm-light);border-radius:10px;">';
    if (longIssueRate < shortIssueRate) {
      html += 'ファスティング16時間以上の日は不調の記録が <strong style="color:var(--rose);">少ない</strong> 傾向があります。あなたのからだに合っているかもしれません。';
    } else if (longIssueRate > shortIssueRate) {
      html += 'ファスティング16時間以上の日に不調の記録が <strong style="color:var(--rose);">多い</strong> 傾向があります。ファスティング時間を調整してみましょう。';
    } else {
      html += 'ファスティングと不調に明確な差は見られません。引き続き記録を続けましょう。';
    }
    html += '</div></div>';
  }

  // ② 食事回数と体調の関係
  var fewMeals = [];
  var manyMeals = [];
  records.forEach(function(r) {
    var mc = r.mealCount || 0;
    var checks = r.diseaseCheck || {};
    var issueCount = Object.values(checks).filter(function(v) { return v !== 'なし' && v; }).length;
    if (mc > 0 && mc <= 3) fewMeals.push(issueCount);
    else if (mc > 3) manyMeals.push(issueCount);
  });

  if (fewMeals.length >= 2 && manyMeals.length >= 2) {
    var fewAvg = (fewMeals.reduce(function(a, b) { return a + b; }, 0) / fewMeals.length).toFixed(1);
    var manyAvg = (manyMeals.reduce(function(a, b) { return a + b; }, 0) / manyMeals.length).toFixed(1);

    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🍽 食事回数と疾患チェック</div>';
    html += '<div style="display:flex;gap:12px;margin-bottom:8px;">';
    html += '<div style="flex:1;text-align:center;padding:12px;background:var(--warm-light);border-radius:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);">3食以下の日</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);margin-top:4px;">' + fewAvg + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">平均チェック項目</div></div>';
    html += '<div style="flex:1;text-align:center;padding:12px;background:var(--warm-light);border-radius:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);">4食以上の日</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);margin-top:4px;">' + manyAvg + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">平均チェック項目</div></div>';
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--ink);line-height:1.8;padding:10px;background:var(--warm-light);border-radius:10px;">';
    if (parseFloat(fewAvg) < parseFloat(manyAvg)) {
      html += '食事回数が少ない日の方が疾患チェックの項目数が <strong style="color:#8aab96;">少なく</strong> 安定しています。';
    } else if (parseFloat(fewAvg) > parseFloat(manyAvg)) {
      html += '食事回数が多い日の方が疾患チェックが <strong style="color:#8aab96;">安定</strong> しています。';
    } else {
      html += '食事回数と疾患チェックに明確な差は見られません。';
    }
    html += '</div></div>';
  }

  // ③ 食材キーワードと症状
  var keywords = [
    { word: '小麦', aliases: ['パン', 'パスタ', 'うどん', 'ラーメン', 'グルテン'] },
    { word: '乳製品', aliases: ['牛乳', 'チーズ', 'ヨーグルト', '乳'] },
    { word: '砂糖', aliases: ['甘い', 'クッキー', 'ケーキ', 'チョコ', 'お菓子', 'アイス'] },
    { word: 'カフェイン', aliases: ['コーヒー', '紅茶', 'カフェ'] },
    { word: 'アルコール', aliases: ['ビール', 'ワイン', '酒', 'サワー'] }
  ];

  var keywordResults = [];
  keywords.forEach(function(kw) {
    var withFood = [];
    var withoutFood = [];
    records.forEach(function(r) {
      var memo = (r.mealFree || '') + ' ' + (r.meals && r.meals.free ? r.meals.free : '');
      var hasKeyword = false;
      var allWords = [kw.word].concat(kw.aliases);
      allWords.forEach(function(w) { if (memo.indexOf(w) !== -1) hasKeyword = true; });
      var symptoms = (r.symptoms || []).length;
      var checks = r.diseaseCheck ? Object.values(r.diseaseCheck).filter(function(v) { return v !== 'なし' && v; }).length : 0;
      var total = symptoms + checks;
      if (hasKeyword) withFood.push(total);
      else withoutFood.push(total);
    });
    if (withFood.length >= 2 && withoutFood.length >= 2) {
      var withAvg = withFood.reduce(function(a, b) { return a + b; }, 0) / withFood.length;
      var withoutAvg = withoutFood.reduce(function(a, b) { return a + b; }, 0) / withoutFood.length;
      if (withAvg > withoutAvg + 0.3) {
        keywordResults.push({ word: kw.word, days: withFood.length, diff: (withAvg - withoutAvg).toFixed(1) });
      }
    }
  });

  if (keywordResults.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🔍 注目の食材パターン</div>';
    keywordResults.forEach(function(kr) {
      html += '<div style="padding:10px;background:var(--warm-light);border-radius:10px;margin-bottom:8px;font-size:12px;color:var(--ink);line-height:1.8;">';
      html += '「<strong style="color:var(--rose);">' + kr.word + '</strong>」を含む日（' + kr.days + '日）は、不調の記録が平均 <strong style="color:var(--rose);">+' + kr.diff + '</strong> 項目多い傾向があります。';
      html += '</div>';
    });
    html += '</div>';
  }

  if (html === '') {
    html = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;line-height:1.8;">まだ十分なデータがありません。<br>記録を続けると食事と体調の関係が見えてきます。</div>';
  }

  container.innerHTML = html;
}

export function updateCycleSymptomCorrelation(){
  var container = document.getElementById('cycle-symptom-correlation');
  if(!container) return;

  if(!isPremium()){
    container.innerHTML = '<div style="position:relative;overflow:hidden;border-radius:12px;">'
      +'<div style="filter:blur(6px);opacity:0.5;pointer-events:none;">'
      +'<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">📊 フェーズ別の不調出現率</div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">生理期間</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:72%;background:linear-gradient(90deg,#E88D9788,#E88D97);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">72%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">高温期</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:45%;background:linear-gradient(90deg,#c4878c88,#c4878c);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">45%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">排卵期</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:28%;background:linear-gradient(90deg,#F4B86088,#F4B860);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">28%</span></div></div>'
      +'<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--ink);">🔍 フェーズ別の頻出症状</div>'
      +'<div style="margin-top:8px;padding:10px;background:var(--white);border-radius:10px;border-left:3px solid #E88D97;font-size:12px;">生理期間：頭痛・腰痛・倦怠感...</div>'
      +'</div>'
      +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(250,246,242,0.4);border-radius:12px;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🔒</div>'
      +'<div style="font-size:13px;color:var(--ink);font-weight:500;margin-bottom:4px;">プレミアム機能</div>'
      +'<div style="font-size:11px;color:var(--ink-light);margin-bottom:12px;">周期ごとの症状パターンを分析します</div>'
      +'<button onclick="document.getElementById(\'premiumLockOverlay\').classList.add(\'active\')" style="padding:8px 24px;background:var(--rose);color:white;border:none;border-radius:20px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,107,0.3);">Premiumで解放</button>'
      +'</div></div>';
    return;
  }

  var records = window.state.records || [];
  var phases = {};

  records.forEach(function(r){
    var cycle = r.menstrualCycle;
    if(!cycle || cycle === 'なし' || cycle === 'none' || !cycle.trim()) return;
    var phase = displayPhases[cycle] || cycle;
    if(!phases[phase]) phases[phase] = { total:0, withSymptoms:0, symptoms:{} };
    phases[phase].total++;
    var syms = r.symptoms || [];
    if(syms.length > 0){
      phases[phase].withSymptoms++;
      syms.forEach(function(s){
        phases[phase].symptoms[s] = (phases[phase].symptoms[s]||0) + 1;
      });
    }
  });

  var phaseKeys = Object.keys(phases);

  if(phaseKeys.length === 0){
    container.innerHTML = '<div style="text-align:center;padding:24px 0;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🌸</div>'
      +'<div style="font-size:13px;color:var(--ink-light);line-height:1.8;">生理周期の記録があると<br>フェーズごとの症状パターンが表示されます。</div>'
      +'<div style="font-size:12px;color:var(--ink-light);margin-top:10px;">記録画面の「生理の状態」で状態を選択してください。</div>'
      +'</div>';
    return;
  }

  var html = '';

  // ① フェーズ別の症状出現率
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px;">📊 フェーズ別の不調出現率</div>';
  var phaseColors = {'生理期間':'#E88D97','排卵期':'#F4B860','高温期':'#c4878c','低温期':'#7FC8A9','不正出血':'#C4A7D7'};
  var maxRate = 0;
  phaseKeys.forEach(function(p){ var rate = phases[p].total > 0 ? phases[p].withSymptoms / phases[p].total * 100 : 0; if(rate > maxRate) maxRate = rate; });
  if(maxRate === 0) maxRate = 1;

  phaseKeys.forEach(function(p){
    var d = phases[p];
    var rate = d.total > 0 ? Math.round(d.withSymptoms / d.total * 100) : 0;
    var color = phaseColors[p] || '#b8a9d4';
    html += '<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:65px;flex-shrink:0;text-align:right;">'+p+'</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:'+(rate/maxRate*100)+'%;background:linear-gradient(90deg,'+color+'88,'+color+');border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:40px;text-align:right;">'+rate+'%</span>';
    html += '<span style="font-size:10px;color:var(--ink-light);width:30px;">('+d.total+'日)</span>';
    html += '</div>';
  });
  html += '</div>';

  // ② フェーズ別の頻出症状
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px;">🔍 フェーズ別の頻出症状</div>';
  phaseKeys.forEach(function(p){
    var d = phases[p];
    var sorted = Object.entries(d.symptoms).sort(function(a,b){ return b[1]-a[1]; });
    if(sorted.length === 0) return;
    var color = phaseColors[p] || '#b8a9d4';
    html += '<div style="margin-bottom:12px;padding:12px;background:var(--white);border-radius:12px;border-left:3px solid '+color+';">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:8px;">'+p+'</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    sorted.slice(0,5).forEach(function(entry){
      html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;background:'+color+'20;color:'+color.replace('88','')+';">'+entry[0]+' ('+entry[1]+'日)</span>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  // ③ パターンコメント
  html += '<div style="padding:12px;background:var(--warm-light);border-radius:12px;font-size:12px;color:var(--ink);line-height:1.8;">';
  var mostSymptomPhase = phaseKeys.reduce(function(best, p){
    var rate = phases[p].total > 0 ? phases[p].withSymptoms / phases[p].total : 0;
    if(!best || rate > best.rate) return {phase:p, rate:rate};
    return best;
  }, null);

  if(mostSymptomPhase && mostSymptomPhase.rate > 0){
    html += '「<strong style="color:var(--rose);">'+mostSymptomPhase.phase+'</strong>」に不調の記録が最も集中しています（'+Math.round(mostSymptomPhase.rate*100)+'%）。';
    var topSym = Object.entries(phases[mostSymptomPhase.phase].symptoms).sort(function(a,b){return b[1]-a[1];})[0];
    if(topSym){
      html += 'この時期は特に「<strong style="color:var(--rose);">'+topSym[0]+'</strong>」に注意してみましょう。';
    }
  } else {
    html += '記録を続けると、周期ごとの症状パターンが見えてきます。';
  }
  html += '</div>';

  container.innerHTML = html;
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('insights-tab-panel-loaded');
}
