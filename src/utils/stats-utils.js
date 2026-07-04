// ================================================================
//  ippo – src/utils/stats-utils.js
//  PR-087 (Legacy Removal Batch-9): Pure Utility
//
//  app-legacy.js の記録統計・SMIスコア計算系の純粋関数
//  （calcPainFreeDaysThisMonth/calcAvgPainThisMonth/calcSMIScore）を新設・物理移動。
//  Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
// ================================================================

// 今月の無痛み日数を返す（stats-grid用）
export function calcPainFreeDaysThisMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (window.state.records || []).forEach(function(r) {
    var d = new Date(r.date || r.record_date || '');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    var pain = r.painLevel;
    if (pain === null || pain === undefined || pain === 0) count++;
  });
  return count;
}

// 今月の平均痛みスコアを返す（stats-grid用）
export function calcAvgPainThisMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var total = 0;
  var count = 0;
  (window.state.records || []).forEach(function(r) {
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

// ===== 更年期SMI（簡略更年期指数）自動計算 =====
export function calcSMIScore(diseaseCheck){
  // SMI配点：各症状ごとの重み × 選択肢の重度
  var smiWeights = {
    'hot_flash': 10,
    'sweating': 10,
    'insomnia': 14,
    'irritable': 12,
    'depression': 14,
    'fatigue': 8,
    'headache': 8,
    'palpitation': 8,
    'shoulder': 5,
    'numbness': 5
  };
  var severityMap = {
    'なし': 0,
    '軽い': 0.33,
    '中程度': 0.66,
    '強い': 1
  };
  var total = 0;
  var found = false;
  var keys = Object.keys(smiWeights);
  for(var i=0;i<keys.length;i++){
    var qKey = '更年期障害__' + keys[i];
    if(diseaseCheck[qKey]){
      found = true;
      var sev = severityMap[diseaseCheck[qKey]] || 0;
      total += smiWeights[keys[i]] * sev;
    }
  }
  if(!found) return null;
  return Math.round(total);
}
