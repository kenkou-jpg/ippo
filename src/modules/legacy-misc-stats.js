// ============================================================
//  ippo – src/modules/legacy-misc-stats.js
//  PR-089F-7B (Legacy Removal Batch-11分割⑦-B): Misc/remaining監査（PR-089F-7A）で
//  D. REAL_IMPLEMENTATION と判定された5関数を src/app-legacy.js から物理移動。
//
//  isAdminOrPremium / analyzeCyclePhases / _bleedingToNum / calcPainFreeDays / updateUnlock
//
//  - isAdminOrPremium: bare `isPremium`は PR-090-R1 (EXPORT_HUB_REFACTOR_COUNCIL
//    Legacy依存解消) で src/modules/premium/premium-service.js の isPremium() 直接
//    importへ変更（挙動変更なし、同一のPremium Source of Truthを参照）。
//    `supabaseUserId`は PR-090-R4 (EXPORT_HUB_REFACTOR_COUNCIL 6-2) で
//    src/services/supabase.js へ物理移動済みのため、getSupabaseUserId() 直接importに
//    変更（window.__ippoGetSupabaseUserId()経由を廃止）。ADMIN_USER_ID は
//    admin.js から直接import（app-legacy.js側と同一値）。
//  - updateStats: PR-090-R4 で app-legacy.js のローカル実装（home-renderer.js版とは
//    別実装、統合しない既定路線を踏襲）を物理移動。bare `state`はgetState()経由へ変換。
//  - analyzeCyclePhases: bare `calcCycleDay`/`getCyclePhase` 呼び出しは、実体である
//    src/analytics/cycle-engine.js から直接importへ変更（app-legacy.js側の同名関数は
//    window.calcCycleDay等への1行delegation shimに過ぎず、実体はcycle-engine.js側
//    ——PR-089F-7A監査で確認済み。挙動変更なし）。
//  - _bleedingToNum: PR-089F-7A監査時点でapp-legacy.js内に呼び出し元が見当たらず
//    （experiments.jsに意図的な独立コピーが別途存在、PR-089B注記参照）だが、Founder
//    指示によりSAFE_DEAD削除ではなく物理移動として扱う。
//  - calcPainFreeDays/updateUnlock: bare `state` は getState() 経由へ変換。
// ============================================================

import { getState } from '../store/state.js';
import { calcCycleDay, getCyclePhase } from '../analytics/cycle-engine.js';
import { ADMIN_USER_ID } from './admin.js';
import { isPremium } from './premium/premium-service.js';
import { getSupabaseUserId } from '../services/supabase.js';
import { calcPainFreeDaysThisMonth, calcAvgPainThisMonth } from '../utils/stats-utils.js';

// ===== 周期フェーズ連動分析 =====
function analyzeCyclePhases(records){
  var phases = {
    '月経期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '卵胞期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '排卵期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '黄体期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} }
  };

  records.forEach(function(r){
    var cd = calcCycleDay(r.record_date || r.date, records);
    var phase = getCyclePhase(cd);
    if(!phase || !phases[phase]) return;

    var p = phases[phase];
    p.days++;
    if(r.painLevel) p.pain.push(r.painLevel);
    if(r.energy) p.energy.push(r.energy);
    if(r.sleepQuality) p.sleep.push(r.sleepQuality);
    if(r.wellnessScore !== undefined) p.wellness.push(r.wellnessScore);
    if(r.symptoms){
      r.symptoms.forEach(function(s){ p.symptoms[s] = (p.symptoms[s]||0) + 1; });
    }
    if(r.factors){
      r.factors.forEach(function(f){ p.factors[f] = (p.factors[f]||0) + 1; });
    }
  });

  // 平均計算
  var result = {};
  Object.keys(phases).forEach(function(name){
    var p = phases[name];
    if(p.days === 0) return;
    var avg = function(arr){ return arr.length ? (arr.reduce(function(a,b){return a+b;},0)/arr.length) : null; };
    var topItems = function(obj, n){
      return Object.entries(obj).sort(function(a,b){return b[1]-a[1];}).slice(0,n);
    };
    result[name] = {
      days: p.days,
      avgPain: avg(p.pain) !== null ? avg(p.pain).toFixed(1) : '-',
      avgEnergy: avg(p.energy) !== null ? avg(p.energy).toFixed(1) : '-',
      avgSleep: avg(p.sleep) !== null ? avg(p.sleep).toFixed(1) : '-',
      avgWellness: avg(p.wellness) !== null ? Math.round(avg(p.wellness)) : '-',
      topSymptoms: topItems(p.symptoms, 3),
      topFactors: topItems(p.factors, 3)
    };
  });

  return result;
}

/** 出血強度文字列 → 数値変換 */
function _bleedingToNum(val) {
  var MAP = { none:0, trace:1, light:2, moderate:3, heavy:4, very_heavy:5,
              'なし':0, '少量':1, '軽い':2, '普通':3, '多い':4, '非常に多い':5 };
  return MAP[val] != null ? MAP[val] : null;
}

// 今月の無痛み日数を計算して表示
function calcPainFreeDays() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('calcPainFreeDays', calcPainFreeDays);
    return;
  }
  var s = getState();
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (s.records || []).forEach(function(r) {
    var recordDate = r.record_date || r.date;
    if (!recordDate) return;
    var d = new Date(recordDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      var pain = r.painLevel;
      if (pain === null || pain === undefined || pain === 0) count++;
    }
  });
  var el = document.getElementById('pain-free-count');
  if (el) el.textContent = count > 0 ? count : '—';
}

function updateUnlock(){
  var s = getState();
  var days = s.totalDays || 0;
  var milestones = [
    {day:3, icon:'📊', title:'グラフ機能', sub:'体温・症状の推移を可視化'},
    {day:7, icon:'🔍', title:'パターン分析', sub:'週間のからだの傾向'},
    {day:14, icon:'🌡️', title:'体温フェーズ判定', sub:'低温期・高温期の自動判定'},
    {day:30, icon:'🤖', title:'AIパターン解析', sub:'あなた専用の分析レポート'}
  ];
  var el = document.getElementById('unlock-section');
  if(!el) return;
  var html = '<div class="unlock-header"><div class="unlock-title">記録で解放される機能</div><div class="unlock-days">'+days+'日目</div></div>';
  html += '<div class="unlock-items">';
  milestones.forEach(function(m){
    var unlocked = days >= m.day;
    html += '<div class="unlock-item">';
    html += '<div class="unlock-icon '+(unlocked?'unlocked':'locked')+'">'+m.icon+'</div>';
    html += '<div class="unlock-text"><div class="unlock-text-title">'+m.title+'</div><div class="unlock-text-sub">'+m.sub+'</div></div>';
    html += '<div class="unlock-badge '+(unlocked?'unlocked':'locked')+'">'+(unlocked?'解放済':'あと'+(m.day-days)+'日')+'</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

function isAdminOrPremium() {
  var supabaseUserId = getSupabaseUserId();
  return isPremium() || (supabaseUserId && supabaseUserId === ADMIN_USER_ID);
}

// ===== STATS（app-legacy.js ローカル実装、home-renderer.js版とは別、
// PR-080C重複整理と同型の「統合しない」判断を踏襲） =====
function updateStats() {
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
  if(emptyEl) emptyEl.style.display = (s.records.length === 0) ? 'block' : 'none';

  // 今月の無痛み日数
  calcPainFreeDays();
  var pfDays = calcPainFreeDaysThisMonth();
  var pfEl = document.getElementById('pain-free-days');
  if (pfEl) pfEl.textContent = pfDays > 0 ? pfDays : '—';

  // 今月の平均痛みスコア
  var avgPain = calcAvgPainThisMonth();
  var apEl = document.getElementById('avg-pain-score');
  if (apEl) apEl.textContent = avgPain !== null ? avgPain : '—';
}

export {
  analyzeCyclePhases,
  _bleedingToNum,
  calcPainFreeDays,
  updateUnlock,
  isAdminOrPremium,
  updateStats
};
