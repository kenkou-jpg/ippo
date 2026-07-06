// ================================================================
//  ippo – src/modules/cycle-utils.js
//  PR-086 (Legacy Removal Batch-8): Cycle Utils
//
//  app-legacy.js の周期フェーズ判定・比較コメント生成ロジック
//  （getPhaseForDate/isPeriodExpected/buildComparisonComment + 未文書化ヘルパー
//  buildDayComparison/buildWeekComparison）を新設・物理移動。Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
// ================================================================

export function getPhaseForDate(date) {
  if (!window.state.lastPeriodDate || !window.state.cycleLength) return '不明';
  var last     = new Date(window.state.lastPeriodDate + 'T00:00:00');
  var dayNum   = Math.floor((date - last) / 86400000) + 1;
  var cycle    = window.state.cycleLength || 28;
  var adjusted = ((dayNum - 1) % cycle) + 1;
  if (adjusted <= 5)                         return '月経期';
  if (adjusted <= Math.floor(cycle * 0.46)) return '卵胞期';
  if (adjusted <= Math.floor(cycle * 0.53)) return '排卵期';
  return '黄体期';
}

export function isPeriodExpected(){
  // 過去の「生理開始」または「生理中」の記録から次の生理予定日を予測
  var starts = [];
  for(var i=0; i<window.state.records.length; i++){
    var r = window.state.records[i];
    if(r.menstrualCycle === '生理開始' || r.menstrualCycle === '生理中'){
      var d = new Date(r.date);
      // 連続する生理中の最初の日だけを取得
      var isDuplicate = false;
      for(var j=0; j<starts.length; j++){
        if(Math.abs(starts[j] - d) < 5 * 86400000){ isDuplicate = true; break; }
      }
      if(!isDuplicate) starts.push(d);
    }
  }
  if(starts.length < 2) return false;

  // 平均周期を計算
  starts.sort(function(a,b){ return a - b; });
  var totalDays = 0;
  for(var k=1; k<starts.length; k++){
    totalDays += (starts[k] - starts[k-1]) / 86400000;
  }
  var avgCycle = Math.round(totalDays / (starts.length - 1));

  // 次の予定日
  var lastStart = starts[starts.length - 1];
  var nextExpected = new Date(lastStart.getTime() + avgCycle * 86400000);
  var today = new Date();
  var diffDays = (nextExpected - today) / 86400000;

  // 予定日の前後3日以内
  return diffDays >= -3 && diffDays <= 3;
}

// ===== 比較コメント生成 =====
export function buildComparisonComment(todayRec) {
  var records = window.state.records || [];
  var diseases = window.state.myDiseases || [];

  var recordCount = records.length;

  if (recordCount <= 1) {
    return '最初の記録ができました。続けるほど見えてくるものがあります';
  }

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().slice(0, 10);
  var yesterdayRec = records.find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === yesterdayStr;
  });

  if (recordCount < 7) {
    if (!yesterdayRec) return '昨日の記録がないため比較できません。毎日記録すると変化がわかります';
    return buildDayComparison(todayRec, yesterdayRec, diseases);
  }

  var lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  var lastWeekStr = lastWeek.toISOString().slice(0, 10);
  var lastWeekRec = records.find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === lastWeekStr;
  });

  if (lastWeekRec) {
    return buildWeekComparison(todayRec, lastWeekRec, diseases);
  }

  if (yesterdayRec) {
    return buildDayComparison(todayRec, yesterdayRec, diseases);
  }

  return '記録を続けています。パターンが見えてきます';
}

export function buildDayComparison(today, yesterday, diseases) {
  var todayPain = today.painLevel || 0;
  var yestPain  = yesterday.painLevel || 0;
  var diff = todayPain - yestPain;

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (diff < -1) return '昨日より骨盤の痛みが和らいでいます';
    if (diff > 1)  return '昨日より痛みが強めです。無理せず過ごしてください';
    if (todayPain === 0) return '今日は痛みのない日です。この記録も大切です';
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (diff < -1) return '昨日より体調が落ち着いています';
    if (diff > 1)  return '昨日より症状が強めです。記録を続けましょう';
  }
  if (diseases.indexOf('子宮筋腫') !== -1) {
    if (diff < -1) return '昨日より楽な一日でした';
    if (diff > 1)  return '昨日より経血量や痛みに変化がありますか？';
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (diff < -1) return '昨日より気分・痛みが落ち着いています';
    if (diff > 1)  return '昨日より症状が強めです。ゆっくり過ごしてください';
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (diff < -1) return '昨日より体調が穏やかです';
    if (diff > 1)  return '昨日より症状が強めです。SMIチェックも記録してください';
  }

  if (diff < -1) return '昨日より痛みが1段階楽でした';
  if (diff > 1)  return '昨日より痛みが強めです';
  if (diff === 0 && todayPain === 0) return '今日も痛みのない日でした';
  return '昨日と同じような状態が続いています';
}

export function buildWeekComparison(today, lastWeek, diseases) {
  var todayPain = today.painLevel || 0;
  var lastPain  = lastWeek.painLevel || 0;
  var diff = todayPain - lastPain;

  var now = new Date();
  var painFreeDays = (window.state.records || []).filter(function(r) {
    var d = new Date(r.date || r.record_date || '');
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && (r.painLevel === 0 || r.painLevel === null || r.painLevel === undefined);
  }).length;

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (diff < -1) return '先週の同じ曜日より骨盤の痛みが落ち着いています';
    if (diff > 1)  return '先週の同じ曜日より痛みが強めです。この変化を記録しておきましょう';
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (diff < 0) return '先週より症状が軽めです。周期のパターンが見えてきます';
    if (diff > 0) return '先週より症状が強めです。生理前のフェーズを確認してみましょう';
  }

  if (painFreeDays > 0) {
    return '今月のらくな日が' + painFreeDays + '日になりました';
  }
  if (diff < -1) return '先週の同じ曜日より体調が落ち着いています';
  if (diff > 1)  return '先週の同じ曜日より痛みが強めです';
  return '記録が7日続きました。パターンが見えてきます';
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('cycle-utils-loaded');
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.buildComparisonComment = buildComparisonComment;
window.buildDayComparison     = buildDayComparison;
window.buildWeekComparison    = buildWeekComparison;
window.getPhaseForDate        = getPhaseForDate;
window.isPeriodExpected       = isPeriodExpected;
