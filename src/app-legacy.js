// ============================================================
//  ippo – src/app-legacy.js
//  Priority 8 (Step 8-2e): app.html 残存 inline script を移植
//
//  移植元: app.html script block 2 (line 1595–13041)
//  設計: ES module として import。state はグローバル getter 経由。
//
//  PR-079 (Legacy Removal Batch-1): Record Input UI (renderStep 等 約22関数)は
//  src/modules/record-input.js へ委譲済み。onclick 文字列から呼ばれる関数名は
//  window 経由で record-input.js 側へ向け替え済み（本ファイル末尾の bridge 参照）。
// ============================================================

import * as RecordInput from './modules/record-input.js';
// PR-080E: openRecordScreen/editPastRecord は src/modules/record-screen.js へ物理移動済み。
import { openRecordScreen, editPastRecord } from './modules/record-screen.js';
// PR-081: premiumGate/closePremiumLock/renderProHero/updatePremiumBadges/submitPremiumWaitlist は
// src/modules/premium/premium-lock.js へ物理移動済み。
import { closePremiumLock, premiumGate, renderProHero, updatePremiumBadges, submitPremiumWaitlist } from './modules/premium/premium-lock.js';
// PR-082A (Legacy Removal Batch-4 分割①): Doctor Summary / Doctor PDF は
// src/modules/pro/doctor-summary/doctor-summary.js へ物理移動済み。
import { openDoctorSummary, closeDoctorSummary, downloadDoctorPDF, copyDoctorSummary } from './modules/pro/doctor-summary/doctor-summary.js';
// PR-082B (Legacy Removal Batch-4 分割②): AI Analysis Overlay は
// src/modules/pro/analysis/analysis-overlay.js へ物理移動済み。
import { openAIAnalysis, closeAIAnalysis, runAIAnalysis, copyAIAnalysis } from './modules/pro/analysis/analysis-overlay.js';
// PR-082C (Legacy Removal Batch-4 分割③): Monthly Report は
// src/modules/pro/monthly-report.js へ物理移動済み。
import { openMonthlyReport, closeMonthlyReport, changeReportMonth, updateMonthLabel, downloadReportPDF } from './modules/pro/monthly-report.js';
// PR-082D (Legacy Removal Batch-4 分割④): Cycle Phase Report は
// src/modules/pro/cycle-report.js へ物理移動済み。
import { openCyclePhaseReport, renderPhaseMap, selectPhaseTab, _buildPhaseBarPreview } from './modules/pro/cycle-report.js';
// PR-082E (Legacy Removal Batch-4 分割⑤): Temperature Report は
// src/modules/pro/temp-report.js へ物理移動済み。
import { calcTemperaturePhases, openTempReport, showTempEducation } from './modules/pro/temp-report.js';
// PR-082F (Legacy Removal Batch-4 分割⑥): Flareup Report / Correlation Report は
// src/modules/pro/flareup-report.js / src/modules/pro/correlation-report.js へ物理移動済み。
// calcWellnessScore は src/modules/pro/shared/pro-metric-utils.js へ物理移動済み。
import { detectFlareups, openFlareupReport } from './modules/pro/flareup-report.js';
import { calcFactorCorrelations, setCGRange, toggleCGFactor, getMetricValue, getMetricLabel, getMetricMax, renderComparisonChart, openCorrelationReport } from './modules/pro/correlation-report.js';
import { calcWellnessScore } from './modules/pro/shared/pro-metric-utils.js';
// PR-083 (Legacy Removal Batch-5): Sync Modal & Auth UI は
// src/modules/sync-modal.js へ物理移動済み。
import { openSyncModal, closeSyncModal, showLoginForm, toggleSyncMode, showMessage, hideMessage } from './modules/sync-modal.js';
// PR-084 (Legacy Removal Batch-6): Symptom Settings は src/modules/symptom-settings.js へ物理移動済み。
import { openSymptomSettings, closeSymptomSettings, saveSymptomSettings, getRecentSymptoms, saveSymptomSelection, updateSymptomSettingDisplay, buildSymptomChips, applySymptomChipPriority } from './modules/symptom-settings.js';
// PR-084: reorderRecordSections は src/modules/record-section-order.js へ物理移動済み。
import { reorderRecordSections } from './modules/record-section-order.js';
// PR-084: exportJSON/exportCSV/csvSafe/formatDiseaseCheck/clearData は src/modules/data-export.js へ物理移動済み。
import { exportJSON, exportCSV, csvSafe, formatDiseaseCheck, clearData } from './modules/data-export.js';
// PR-084: showConfirmModal/showAlertModal/showPrivacyInfo/setDailyMessage は src/modules/ui-notifications.js へ物理移動済み。
import { showConfirmModal, showAlertModal, showPrivacyInfo, setDailyMessage } from './modules/ui-notifications.js';
// PR-085 (Legacy Removal Batch-7): Meal Tracker は src/modules/meal-tracker.js へ物理移動済み
// （同ファイルはPhase 4-C由来のopenMealTimePicker/addMealTime以来 未importのorphaned moduleだったが、
// 本importにより初めてバンドル対象になる — PR-084A disease-settings.jsと同型のギャップ解消）。
import { parseMealMemo, _updateMealParseFreetextLegacy, saveMealDraft, toggleMealSection, renderMealSections, updateMealParse } from './modules/meal-tracker.js';
// PR-085 (Legacy Removal Batch-7): Fasting Timer は src/modules/fasting.js へ新設・物理移動済み。
// FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDEはtoggleFast()（本ファイル残置、Batch-7対象外）も
// 参照するためfasting.jsをsource of truthとしimport backしている。
import { FAST_PHASE_CONFIG, FAST_DISEASE_OVERRIDE, setFastGoal, endFast, startFastTimer, resumeFasting, updateFastingWidgetPhase, toggleFastingFeature, applyFastingVisibility } from './modules/fasting.js';
// PR-086 (Legacy Removal Batch-8): getPhaseForDate/isPeriodExpected/buildComparisonComment
// （+ 未文書化ヘルパー buildDayComparison/buildWeekComparison）は
// src/modules/cycle-utils.js へ新設・物理移動済み。
import { getPhaseForDate, isPeriodExpected, buildComparisonComment, buildDayComparison, buildWeekComparison } from './modules/cycle-utils.js';
// PR-086: switchInsTab/renderInsightDiscoveries/_updateInsMainCard/updateFoodBodyCorrelation/
// updateCycleSymptomCorrelation は src/modules/insights-tab-panel.js へ新設・物理移動済み
// （audit文書はinsights-dynamic-renderer.js拡充を想定していたが、実装前調査の結果同ファイルは
// 別世代の独立した動的インサイトレンダラーと判明したため専用新設ファイルへ変更）。
import { switchInsTab, renderInsightDiscoveries, _updateInsMainCard, updateFoodBodyCorrelation, updateCycleSymptomCorrelation } from './modules/insights-tab-panel.js';
// PR-086: updateTodayMessage/updateDailyHintCard は src/modules/home-renderer.js へ物理移動済み。
import { updateTodayMessage, updateDailyHintCard } from './modules/home-renderer.js';
// PR-087 (Legacy Removal Batch-9): escapeHtml/getTimeAgo/toLocalDateKey は
// src/utils/string-utils.js へ新設・物理移動済み。
import { escapeHtml, getTimeAgo, toLocalDateKey } from './utils/string-utils.js';
// PR-087: calcPainFreeDaysThisMonth/calcAvgPainThisMonth/calcSMIScore は
// src/utils/stats-utils.js へ新設・物理移動済み。
import { calcPainFreeDaysThisMonth, calcAvgPainThisMonth, calcSMIScore } from './utils/stats-utils.js';
// PR-087: shareApp/addToHome は src/modules/share.js へ新設・物理移動済み。
import { shareApp, addToHome } from './modules/share.js';
// PR-087: setRating/submitFeedback は src/modules/feedback.js へ新設・物理移動済み。
import { setRating, submitFeedback } from './modules/feedback.js';
// PR-087: checkSuddenTempRise/checkAndShowTempAlert/showTempAlertBanner は
// src/modules/temp-alert.js へ新設・物理移動済み。
import { checkSuddenTempRise, checkAndShowTempAlert, showTempAlertBanner } from './modules/temp-alert.js';
// PR-087: addCustomFactor は src/modules/record-factors.js へ新設・物理移動済み
// （audit文書は移植先未指定。toggleRsChip依存が無いため専用新設ファイルへ分離）。
import { addCustomFactor } from './modules/record-factors.js';
// PR-087: getSuccessMessage は src/modules/success-message.js へ新設・物理移動済み
// （audit文書は移植先未指定。cycle-utils.js等と同型の専用新設ファイルへ分離）。
import { getSuccessMessage } from './modules/success-message.js';
// PR-088 (Legacy Removal Batch-10): Community Voice（loadCommunityTopic/switchCVTab/
// loadCVArchive/toggleArchiveReplies/loadCommunityReplies/postCommunityReply/
// likeCommunityReply/deleteCommunityReply/updateReplyLikeCount/checkMyLikes）は
// src/modules/community.js へ新設・物理移動済み（audit未記載の未文書化ヘルパー4件を
// 含む、「1 feature = 1 owner」判断はPR-086と同型）。
import { loadCommunityTopic, switchCVTab, loadCVArchive, toggleArchiveReplies, loadCommunityReplies, postCommunityReply, likeCommunityReply, deleteCommunityReply, updateReplyLikeCount, checkMyLikes } from './modules/community.js';
// PR-088: Admin Panel（initAdminPanel/adminSetPremium/adminLoadPremiumUsers）は
// src/modules/admin.js へ新設・物理移動済み。ADMIN_USER_ID は isAdminOrPremium()
// （本ファイル残置、Batch-10対象外）も参照するため import back（fasting.js
// FAST_PHASE_CONFIGと同型パターン）。
import { initAdminPanel, adminSetPremium, adminLoadPremiumUsers, ADMIN_USER_ID } from './modules/admin.js';
// PR-089B (Legacy Removal Batch-11分割①): openExperiments/startExperiment/startCustomExperiment/
// cancelExperiment/completeExperiment/showExperimentReport は src/modules/experiments.js へ物理移動済み。
import { openExperiments, startExperiment, startCustomExperiment, cancelExperiment, completeExperiment, showExperimentReport } from './modules/experiments.js';
// PR-089C (Legacy Removal Batch-11分割②): renderSyncUI/submitSync/migrateDataToUser/
// syncNow/logoutSync は src/services/supabase.js へ物理移動済み。
import { renderSyncUI, submitSync, migrateDataToUser, syncNow, logoutSync } from './services/supabase.js';

// ─── bare `state` lexical variable ───────────────────────────────
// ES module strict mode では bare `state` は window.getState() に自動解決されない。
// state.js の setState() が呼ばれるたびフックが最新 _state に同期する。
// records: [] を初期値として持つことで hydration 前の state.records 参照を安全にする。
if (!window._ippoStateHooks) window._ippoStateHooks = [];
var state = { records: [] };
window.state = state;
window._ippoStateHooks.push(function(nextState) {
  state = nextState;
  try { window.state = nextState; } catch (_) {}
});

// ─── app.html script block 2 の内容 ─────────────────────────
// ===== SUPABASE CLOUD SYNC (auth + user_data) =====
// var SUPABASE_URL = 'https://ekaoojdqhkpeudujfsdh.supabase.co';  // MIGRATED: see src/services/supabase.js
// var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYW9vamRxaGtwZXVkdWpmc2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTg3MTUsImV4cCI6MjA5MjA5NDcxNX0.QPoyDxCrnhNInpfGJ5qOVQqn6OQ7clAoOmGgvqQTGX0';  // MIGRATED: see src/services/supabase.js
// ★ Supabase runtime bridge: bare identifier が module 化後も必ず存在するよう宣言
// (SDK 管理の実値は checkPremiumStatus / auth callback で同期される)
var supabaseToken = null;
var supabaseUserId = null;
// PR-088: community.js/admin.js（物理移動先）がログイン中ユーザーIDを取得するための
// 専用ブリッジ（PR-080E window.__ippoGetBowelCount と同型パターン）。
window.__ippoGetSupabaseUserId = function () { return supabaseUserId; };
// PR-089C: submitSync（services/supabase.js、物理移動済み）がログイン成功時に
// supabaseUserId（本ファイル残置 var）を更新するための専用ブリッジ（同型パターン）。
window.__ippoSetSupabaseUserId = function (v) { supabaseUserId = v; };

// ─── Deferred Cloud Restore Queue ────────────────────────────────
// auth 復元前に cloudRestore が呼ばれた場合、auth ready 後にリトライする
var _cloudRestoreQueue = [];
function _flushCloudRestoreQueue() {
  while (_cloudRestoreQueue.length > 0) {
    try { _cloudRestoreQueue.shift()(); } catch (e) { console.warn('[cloudQueue] flush error', e); }
  }
}
// auth ready を brain / controller に通知するユーティリティ
function _notifyAuthReady() {
  if (window.ippoBrain && typeof window.ippoBrain.setAuthState === 'function') {
    window.ippoBrain.setAuthState('authReady', true);
    window.ippoBrain.setAuthState('supabaseReady', true);
  }
  // Phase 2: auth-service ownership へ通知
  if (window.ippoAuthService && typeof window.ippoAuthService.markAuthReady === 'function') {
    window.ippoAuthService.markAuthReady(supabaseUserId, supabaseToken);
  }
  _flushCloudRestoreQueue();
}
// PR-089C: submitSync（services/supabase.js、物理移動済み）が_notifyAuthReady（本ファイル
// 残置）をbare呼び出しするための専用ブリッジ（PR-085 __ippoLegacySaveAndSyncと同型パターン）。
window.__ippoNotifyAuthReady = _notifyAuthReady;

// ===== 食事クイック入力 =====
var _mealPendingType = '';
var _mealPendingBtn = null;



function toggleMealEntry(type, btn){
  var ta = document.getElementById('rs-meal-free');
  if(!ta) return;
  var picker = document.getElementById('meal-time-picker');
  
  // 時間ピッカーが開いていて同じタイプなら閉じるだけ
  if(picker && picker.style.display !== 'none' && _mealPendingType === type){
    closeMealTimePicker();
    return;
  }
  
  var lines = ta.value.trim().split('\n').filter(function(l){ return l.trim(); });
  var exists = lines.some(function(l){ return l.indexOf(type) !== -1; });
  
  if(exists){
    var newLines = lines.filter(function(l){ return l.indexOf(type) === -1; });
    ta.value = newLines.join('\n');
    btn.style.background = 'var(--white)';
    btn.style.color = 'var(--ink)';
    btn.style.borderColor = '#e8ddd8';
    closeMealTimePicker();
  } else {
    _mealPendingType = type;
    _mealPendingBtn = btn;
    var label = document.getElementById('meal-time-label');
    var input = document.getElementById('meal-time-input');
    if(label) label.textContent = type + 'の時間';
    var now = new Date();
    var hh = String(now.getHours()).padStart(2,'0');
    var mm = String(now.getMinutes()).padStart(2,'0');
    if(input) input.value = hh + ':' + mm;
    if(picker) picker.style.display = 'block';
  }
  if(typeof parseMealFree === 'function') parseMealFree();
}
  
function confirmMealTime(){
  var ta = document.getElementById('rs-meal-free');
  var input = document.getElementById('meal-time-input');
  if(!ta || !input || !_mealPendingType) return;
  var time = input.value.replace(':','');
  var line = time + ' ' + _mealPendingType;
  var current = ta.value.trim();
  ta.value = current ? current + '\n' + line : line;
  // 時間順にソート
  var lines = ta.value.trim().split('\n').filter(function(l){ return l.trim(); });
  lines.sort();
  ta.value = lines.join('\n');
  if(_mealPendingBtn){
    _mealPendingBtn.style.background = 'var(--rose)';
    _mealPendingBtn.style.color = 'white';
    _mealPendingBtn.style.borderColor = 'var(--rose)';
  }
  closeMealTimePicker();
  if(typeof parseMealFree === 'function') parseMealFree();
}

function closeMealTimePicker(){
  var picker = document.getElementById('meal-time-picker');
  if(picker) picker.style.display = 'none';
  _mealPendingType = '';
  _mealPendingBtn = null;
}

document.addEventListener('change', function(e){
  if(e.target && e.target.id === 'meal-time-input'){
    confirmMealTime();
  }
});


  // ===== わたしの目標 =====
var VISION_PRESETS = [
  'ファスティングを習慣にしたい',
  '自分の体のリズムを知りたい',
  'PMS/PMDDを軽くしたい',
  '体調を整えたい'
];







  

function icon(name, size, color) {
  if (!ICONS[name]) return '';
  return ICONS[name](size, color);
}

// ===== ナビアイコン注入 =====
function initNavIcons() {
  if (typeof ICONS === 'undefined') return;
  var navIcons = {
    'nav-icon-home':         ICONS.home(20, 'currentColor'),
    'nav-icon-insights':     ICONS.insights(20, 'currentColor'),
    'nav-icon-settings':     ICONS.settings(20, 'currentColor'),
    'nav-icon-plus':         ICONS.plus(22, 'white'),
    'home-settings-icon':    ICONS.settings(18, 'rgba(255,255,255,0.9)')
  };
  Object.keys(navIcons).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = navIcons[id];
  });
}

// ===== 設定画面アイコン注入 =====
function initSettingsIcons() {
  if (typeof ICONS === 'undefined') return;
  var map = {
    'settings-icon-profile':   ICONS.user(16, 'var(--rose)'),
    'settings-icon-theme':     ICONS.star(16, 'var(--rose)'),
    'settings-icon-reminder':  ICONS.bell(16, 'var(--rose)'),
    'settings-icon-disease':   ICONS.heart(16, 'var(--rose)'),
    'settings-icon-symptom':   ICONS.activity(16, 'var(--rose)'),
    'settings-icon-privacy':   ICONS.shield(16, 'var(--rose)'),
    'settings-icon-export':    ICONS.barChart(16, '#4a7c5c'),
    'settings-icon-backup':    ICONS.download(16, '#4a7c5c'),
    'settings-icon-restore':   ICONS.cloud(16, '#4a7c5c'),
    'settings-icon-history':   ICONS.download(16, '#4a7c5c'),
    'settings-icon-diagnosis': ICONS.search(16, 'var(--ink-light)'),
    'settings-icon-delete':    ICONS.trash(16, 'var(--rose)'),
    'settings-icon-priority':  ICONS.star(16, '#c8a060'),
    'settings-icon-density':   ICONS.settings(16, 'var(--ink-light)'),
    'settings-icon-home-info': ICONS.home(16, '#4a7c5c')
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = map[id];
  });
}

// ===== 痛みスケールボタン =====
function renderPainScale(v,f){return typeof window.renderPainScale==='function'?window.renderPainScale(v,f):''; }


// ===== 症状詳細マスターデータ =====
var SYMPTOM_DETAIL_CONFIG = {
  '下腹部痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体', '腰', '骨盤周り'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感', '張り'],
    hasSlider: true
  },
  '骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り', '重い'],
    hasSlider: true
  },
  '月経外の骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り'],
    hasSlider: true
  },
  '排卵痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体'],
    types:     ['鋭痛', '鈍痛', '差し込み', '張り'],
    hasSlider: true
  },
  '片側の下腹部痛': {
    positions: ['左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '腰痛': {
    positions: ['腰全体', '左側', '右側', '仙骨'],
    types:     ['鈍痛', '鋭痛', '張り', '重い'],
    hasSlider: true
  },
  '性交痛': {
    positions: ['入口付近', '奥（深部）', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '灼熱感'],
    hasSlider: true
  },
  '排便痛': {
    positions: ['肛門周り', '腸全体', '左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '頭痛': {
    positions: ['前頭部', '側頭部（左）', '側頭部（右）', '後頭部', '全体'],
    types:     ['ズキズキ', '締め付け', '重い', '刺すような'],
    hasSlider: true
  },
  '慢性疲労': { hasSlider: true, sliderLabel: '疲れの強さ' },
  'だるさ':   { hasSlider: true, sliderLabel: '重さの程度' },
  '倦怠感':   { hasSlider: true, sliderLabel: '倦怠の程度' },
  'むくみ': {
    positions: ['顔', '手', '足（全体）', '足首', 'ふくらはぎ'],
    hasSlider: true,
    sliderLabel: 'むくみの程度'
  },
  '気分の落ち込み': {
    types:     ['ゆううつ', '虚無感', '涙が出る', '何もしたくない'],
    hasSlider: true,
    sliderLabel: '気分の重さ'
  },
  'イライラ': {
    types:     ['軽いイライラ', 'かなり強い', '怒りが抑えられない'],
    hasSlider: true,
    sliderLabel: 'イライラの強さ'
  },
  '不安感': {
    types:     ['漠然とした不安', '動悸を伴う', '眠れない'],
    hasSlider: true,
    sliderLabel: '不安の強さ'
  },
  '吐き気': {
    types:     ['軽い吐き気', '食欲がない', '嘔吐あり'],
    timing:    ['空腹時', '食後', '常時', '動いたとき'],
    hasSlider: true,
    sliderLabel: '吐き気の強さ'
  },
  '胸の張り': {
    positions: ['両側', '左側', '右側'],
    hasSlider: true,
    sliderLabel: '張りの強さ'
  },
  '不正出血': {
    types:     ['茶色のおりもの', '鮮血', '少量', '中等量'],
    timing:    ['排卵期', '生理前', '生理後', '性交後', '不定期'],
    hasSlider: false
  },
  '頻尿': {
    types:     ['少し多い', 'かなり多い', '夜間も起きる'],
    hasSlider: false
  },
  '便秘': {
    types:     ['数日出ない', '硬くて出にくい', '残便感'],
    hasSlider: false,
    bowelCount: true
  },
  '腹部膨満感': {
    types:     ['食後に張る', '一日中張っている', 'ガスが多い'],
    hasSlider: true,
    sliderLabel: '張りの程度'
  },
  'おりもの': {
    types:     ['透明・サラサラ', '白・とろみあり', '黄色みがかった', '茶色', 'ピンク・血混じり'],
    positions: ['量：少ない', '量：普通', '量：多い'],
    timing:    ['においの変化あり', 'かゆみあり', '膣の乾燥あり'],
    hasSlider: false,
    note: '膣の乾燥・においの変化は婦人科受診の参考になります'
  }
};

// ===== 周期フェーズ連動分析 =====
function calcCycleDay(d,r){return typeof window.calcCycleDay==='function'?window.calcCycleDay(d,r):null;}

function getCyclePhase(cd){return typeof window.getCyclePhase==='function'?window.getCyclePhase(cd):null;}

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

// ─── PRO分析画面 共有SVG (P29-B1: PRO HUBと同一アセット流用) ──────────
var _SVG_UNDERSTAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>';
var _SVG_REFLECT    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4.5-3-9-6.5-9-11a9 9 0 0 1 18 0c0 4.5-4.5 8-9 11z"/><circle cx="12" cy="10" r="2.5" fill="currentColor" opacity="0.2" stroke="none"/></svg>';
var _SVG_TRY        = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7.5l4 8a1 1 0 01-.9 1.5H5.9A1 1 0 015 18.5l4-8V3z"/><line x1="6.5" y1="8" x2="17.5" y2="8"/></svg>';
var _SVG_SHARE      = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/><line x1="8" y1="8" x2="16" y2="8"/></svg>';


  // ===== 周期ごとの体調の違い (Cycle Phase Report) =====
// PR-082D (Legacy Removal Batch-4 分割④): openCyclePhaseReport は
// src/modules/pro/cycle-report.js へ物理移動済み（import参照）。
  // ===== ヘルスエクスペリメント =====
  // PR-089B (Legacy Removal Batch-11分割①): openExperiments/startExperiment/startCustomExperiment/
  // cancelExperiment/completeExperiment/showExperimentReport/_buildAIResultReport/
  // _buildExperimentCompanion/_expMetric/_DISEASE_COMPANION_RULES/EXPERIMENT_PRESETS は
  // src/modules/experiments.js へ物理移動済み（import参照）。

/** 出血強度文字列 → 数値変換 */
function _bleedingToNum(val) {
  var MAP = { none:0, trace:1, light:2, moderate:3, heavy:4, very_heavy:5,
              'なし':0, '少量':1, '軽い':2, '普通':3, '多い':4, '非常に多い':5 };
  return MAP[val] != null ? MAP[val] : null;
}

// ===== タイムライン =====
var _tlPage = 1;
var _tlPerPage = 15;








function updateDiseaseQuestions(){if(typeof window.updateDiseaseQuestions==='function')window.updateDiseaseQuestions();}




  // ===== プレミアム先行登録 =====
  // PR-081: submitPremiumWaitlist は src/modules/premium/premium-lock.js へ物理移動済み（import参照）

// 既に登録済みなら完了表示

  
var _cloudBackupLock = false;
function cloudBackupAll(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve();
  if(_cloudBackupLock){
    console.log('クラウド同期中：スキップ');
    return Promise.resolve();
  }
  // 記録もなく疾患設定もない完全な空状態はスキップ（クラウドの既存データ保護）
  var hasRecords = state.records && state.records.length > 0;
  var hasDiseases = state.myDiseases && state.myDiseases.length > 0;
  var hasSettings = state.name || state._onboardingDone;
  if(!hasRecords && !hasDiseases && !hasSettings){
    console.warn('空の状態のためクラウド同期をスキップ');
    return Promise.resolve();
  }
  _cloudBackupLock = true;
  if(typeof showSyncIndicator === 'function') showSyncIndicator('バックアップ中');
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      var skipReason = localStorage.getItem('ippo_sb_token') ? 'sdk-session-null-stale-token' : 'not-logged-in';
      console.warn('未ログイン：クラウドバックアップをスキップ (' + skipReason + ')');
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'skipped', reason: skipReason };
      _cloudBackupLock = false;
      return;
    }
    var userId = session.user.id;
    var stateToSave = {
      name: state.name,
      records: state.records,
      streak: state.streak,
      totalDays: state.totalDays,
      fastGoal: state.fastGoal,
      myVision: state.myVision,
      fastTimer: state.fastTimer,
      lastSaved: state.lastSaved,
      myDiseases: state.myDiseases,
      reminders: state.reminders,
      _onboardingDone: state._onboardingDone,
      experiments: state.experiments
    };
    // Fix: myDiseases が空配列の場合はクラウドの既存値を上書きしない。
    if (!stateToSave.myDiseases || stateToSave.myDiseases.length === 0) {
      delete stateToSave.myDiseases;
    }
    if (!Array.isArray(stateToSave.experiments) || stateToSave.experiments.length === 0) {
      delete stateToSave.experiments;
    }
    var payload = {
      state: stateToSave,
      updated_at: new Date().toISOString()
    };
    return supabase.from('user_data').update(payload).eq('user_id', userId).select().then(function(result){
      _cloudBackupLock = false;
      if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
      if(result.data && result.data.length > 0){
        console.log('Cloud backup完了（更新）: '+stateToSave.records.length+'件');
        window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'updated' };
        return result.data;
      }
      payload.user_id = userId;
      return supabase.from('user_data').insert(payload).select().then(function(result2){
        if(result2.error){
          console.warn('Backup失敗:', result2.error.message);
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: result2.error.message };
        } else {
          console.log('Cloud backup完了（新規）');
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'inserted' };
        }
        return result2.data;
      });
    }).catch(function(e){
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: e.message || String(e) };
      _cloudBackupLock = false;
      if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
      throw e;
    });
  }).catch(function(e){
    _cloudBackupLock = false;
    if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
    throw e;
  });
}



function cloudRestore(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve(false);
  // auth が未完了の場合: localStorage に token があれば queue（auth 復元中）、なければ safe skip
  if (!supabaseUserId) {
    var hasSavedToken = !!localStorage.getItem('ippo_sb_token');
    if (hasSavedToken) {
      // token は存在する → auth 復元中の可能性が高い。auth ready 後にリトライ
      console.warn('未ログイン：クラウド復元をキュー（auth pending）');
      return new Promise(function(resolve) {
        _cloudRestoreQueue.push(function() {
          cloudRestore().then(resolve).catch(function() { resolve(false); });
        });
      });
    }
    console.warn('未ログイン：クラウド復元をスキップ');
    return Promise.resolve(false);
  }
  if (window.ippoBrain && typeof window.ippoBrain.setAuthState === 'function') {
    window.ippoBrain.setAuthState('cloudRestoreReady', true);
  }
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      console.warn('未ログイン：クラウド復元をスキップ');
      return false;
    }
    var userId = session.user.id;
    return supabase.from('user_data').select('state,updated_at').eq('user_id', userId).single().then(function(result){
      if(!result.data) return false;
      var cloudState = result.data.state;
      // cloudStateの整合性チェック
      if(!cloudState || typeof cloudState !== 'object'){
        console.warn('クラウドのデータ形式が不正（nullまたは非オブジェクト）');
        return false;
      }
      if(!Array.isArray(cloudState.records)){
        console.warn('クラウドのrecordsが不正（配列ではない）');
        return false;
      }
      var rawDate = result.data.updated_at;
      if(!rawDate){
        console.warn('クラウドのupdated_atが不正');
        return false;
      }
      var cloudDate = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
      var localDate = state.lastSaved ? new Date(state.lastSaved) : new Date(0);
      var localRecs = state.records ? state.records.length : 0;
      var cloudRecs = cloudState.records.length;

      // ★ records は常にマージ（上書きしない）
      // どちらか片方にしか存在しないレコードを保護する
      var mergedRecords = mergeRecords(state.records || [], cloudState.records || []);
      var mergedCount = mergedRecords.length;

      if(cloudDate > localDate){
        // クラウドが新しい：設定系（name・疾患・reminders等）はクラウドを採用
        // records だけはマージ結果を使用
        var safeCloud = Object.assign({}, cloudState);
        // Fix: myDiseases が空配列の場合はローカルの設定済み値を保護する。
        if (Array.isArray(safeCloud.myDiseases) && safeCloud.myDiseases.length === 0) {
          delete safeCloud.myDiseases;
        }
        state = Object.assign(state, safeCloud);
        state.records = mergedRecords;
        state.lastSaved = cloudDate.toISOString();
        localStorage.setItem('ippo_state', JSON.stringify(state));
        console.log('クラウド復元完了（マージ）: ローカル'+localRecs+'件 + クラウド'+cloudRecs+'件 → '+mergedCount+'件');
        return true;
      } else if(mergedCount > localRecs){
        // ローカルが新しくてもクラウドに追加レコードがあればマージのみ実施
        // 設定系はローカルを保持（空の場合のみ Cloud から補完）
        state.records = mergedRecords;
        state.totalDays = Object.keys(mergedRecords.reduce(function(acc,r){
          acc[new Date(r.record_date || r.date).toDateString()]=true; return acc;
        },{})).length;
        if (
          (!Array.isArray(state.myDiseases) || state.myDiseases.length === 0) &&
          Array.isArray(cloudState.myDiseases) && cloudState.myDiseases.length > 0
        ) { state.myDiseases = cloudState.myDiseases.slice(); }
        if (
          (!Array.isArray(state.experiments) || state.experiments.length === 0) &&
          Array.isArray(cloudState.experiments) && cloudState.experiments.length > 0
        ) { state.experiments = cloudState.experiments.slice(); }
        saveState();
        console.log('クラウドの追加レコードをマージ: +' + (mergedCount - localRecs) + '件 → 合計'+mergedCount+'件');
        return true;
      }
      console.log('ローカルが最新かつ件数も多いため復元スキップ（ローカル:'+localRecs+' クラウド:'+cloudRecs+'）');
      return false;
    });
  });
}

// ===== Phase 4-A: ローカルヘルパー (window.* ブリッジ) =====
// mergeRecords: legacy の cloudBackupAll / manualCloudRestore が内部で使用
function mergeRecords(localRecords, cloudRecords){
  var merged = {};
  localRecords.forEach(function(r){
    if(!r.id) r.id = Date.now().toString(36) + Math.random().toString(36).substr(2,8);
    merged[r.id] = r;
  });
  cloudRecords.forEach(function(r){
    if(!r.id) return;
    if(!merged[r.id]){
      merged[r.id] = r;
    } else {
      var lt = new Date(merged[r.id].updatedAt || merged[r.id].date || 0).getTime();
      var ct = new Date(r.updatedAt || r.date || 0).getTime();
      if(ct > lt) merged[r.id] = r;
    }
  });
  var result = [];
  Object.keys(merged).forEach(function(k){
    if(!merged[k].deleted_at) result.push(merged[k]);
  });
  return result.sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
}

// saveAndSync: UI コードから呼ばれる。IDB/sync は window.* ブリッジ経由
function saveAndSync(){
  if(typeof window.ensureRecordIds === 'function') window.ensureRecordIds();
  if(typeof window.saveState === 'function') window.saveState();
  else if(typeof saveState === 'function') saveState();
  var latest = state.records[state.records.length - 1];
  if(latest && typeof window.syncRecordImmediately === 'function'){
    window.syncRecordImmediately(latest).catch(function(e){
      console.warn('[legacy] saveAndSync: syncRecordImmediately 失敗', e);
    });
  }
}
// PR-085: fasting.js（endFast、物理移動済み）が saveAndSync をbare呼び出しするための
// 専用ブリッジ（window.saveAndSync は record-modal-controller.js が Phase D-1 パターンで
// 別用途に先取り済み・現状no-opのため衝突を回避、PR-084 __ippoLegacyUpdateStats と同型）。
window.__ippoLegacySaveAndSync = saveAndSync;

// softDeleteRecord: UI コードから呼ばれる
function softDeleteRecord(recordId){
  var found = false;
  for(var i=0; i<state.records.length; i++){
    if(state.records[i].id === recordId){
      state.records[i].deleted_at = new Date().toISOString();
      state.records[i].updatedAt  = new Date().toISOString();
      if(typeof window.syncRecordImmediately === 'function') window.syncRecordImmediately(state.records[i]);
      state.records.splice(i,1);
      found = true;
      break;
    }
  }
  if(found){
    if(typeof window.saveState === 'function') window.saveState();
    else if(typeof saveState === 'function') saveState();
    return true;
  }
  return false;
}

// ===== 第2層：バナー通知 =====
function showRecoveryBanner(recovered, count){
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:14px 20px;z-index:9999;font-size:13px;text-align:center;transition:opacity 0.3s;';
  if(recovered){
    banner.style.background = '#e8f4ec';
    banner.style.color = '#2d6a3f';
    banner.innerHTML = '✅ データを自動復元しました（'+count+'件）';
    setTimeout(function(){ banner.style.opacity='0'; setTimeout(function(){ banner.remove(); },300); }, 5000);
  } else {
    banner.style.background = '#fef3f2';
    banner.style.color = '#c44848';
    banner.innerHTML = '⚠️ データに問題が検出されました　<span style="text-decoration:underline;cursor:pointer;" onclick="showDiagnosisUI()">復元する</span>';
  }
  document.body.appendChild(banner);
}

// ===== 第3層：復元UI =====

function restoreFromHistory(historyId){
  showConfirmModal('このバックアップから復元しますか？', function() {
    supabase.from('user_data_history')
      .select('state')
      .eq('id', historyId)
      .single()
      .then(function(r){
        if(r.data && r.data.state && r.data.state.records){
          state.records = mergeRecords(state.records, r.data.state.records);
          saveState();
          // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
          updateHomeSummary();
          showRecoveryBanner(true, state.records.length);
          var el = document.getElementById('diagnosis-overlay');
          if(el) el.remove();
        } else {
          showAlertModal('バックアップデータが見つかりません');
        }
      });
  });
}
// ===== 手動復元（強化版） =====
function manualCloudRestore(){
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      if(typeof showToast === 'function') showToast('ログインしてからご利用ください', 'warn');
      return;
    }
    var userId = session.user.id;

    // 診断UIを使う場合は showDiagnosisUI() を呼ぶ
    // ここでは「最新クラウドデータとマージ」のみをシンプルに実行
    if(typeof showSyncIndicator === 'function') showSyncIndicator('クラウドから復元中');

    // user_data（最新スナップショット）を取得してマージ
    return supabase.from('user_data').select('state,updated_at').eq('user_id', userId).single()
      .then(function(result){
        if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
        if(!result.data || !result.data.state){
          if(typeof showToast === 'function') showToast('クラウドにデータが見つかりませんでした', 'warn');
          return;
        }
        var cloudState = result.data.state;
        if(!Array.isArray(cloudState.records)){
          if(typeof showToast === 'function') showToast('クラウドのデータ形式が不正です', 'warn');
          return;
        }
        var localRecs = state.records ? state.records.length : 0;
        var cloudRecs = cloudState.records.length;

        // records はマージ（上書きしない）
        var mergedRecords = mergeRecords(state.records || [], cloudState.records || []);
        var mergedCount = mergedRecords.length;

        // 設定系（name・疾患・reminders等）はクラウドを採用、recordsはマージ結果
        var rawDate = result.data.updated_at;
        var cloudDate = rawDate ? new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z') : new Date(0);
        state = Object.assign(state, cloudState);
        state.records = mergedRecords;
        state.totalDays = Object.keys(mergedRecords.reduce(function(acc,r){
          acc[new Date(r.record_date || r.date).toDateString()]=true; return acc;
        },{})).length;
        state.lastSaved = cloudDate.toISOString();
        localStorage.setItem('ippo_state', JSON.stringify(state));

        // UI再描画
        if(typeof updateStats === 'function') updateStats();
        if(typeof buildCalendar === 'function') buildCalendar();
        if(typeof updateDiseaseSettingDisplay === 'function') updateDiseaseSettingDisplay();
        if(typeof updateDiseaseQuestions === 'function') updateDiseaseQuestions();
        if(typeof reorderRecordSections === 'function') reorderRecordSections();
        if(typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();

        var msg = 'クラウドから復元しました ✅\nローカル'+localRecs+'件 + クラウド'+cloudRecs+'件 → '+mergedCount+'件';
        if(typeof showToast === 'function') showToast(msg, 'success');
        console.log(msg);
      }).catch(function(e){
        if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
        console.warn('手動復元エラー:', e);
        if(typeof showToast === 'function') showToast('復元に失敗しました。通信状況を確認してください。', 'warn');
      });
  });
}
  
// (bare `state` lexical bridge は app-legacy.js 最上部で宣言済み)
// PR-079: currentRecord/currentStep/STEPS は src/modules/record-input.js へ移行済み。
// PR-080: currentRecord のモジュールスコープ bridge 変数を撤去。saveRecord() が直接呼び出す（SG-4）。


// saveState: モジュール版（state.js）の実行前に init() から呼ばれる場合があるため
// インラインにも定義を維持する。モジュール実行後は window.saveState が上書きされる。
function saveState() {
  // store/state.js の saveState に委譲（save-transaction-guard のフックが動作する）
  if (typeof window.saveState === 'function' && window.saveState !== saveState) {
    window.saveState();
    return;
  }
  try {
    var s = state;
    s.lastSaved = new Date().toISOString();
    localStorage.setItem('ippo_state', JSON.stringify(s));
  } catch(e) {
    console.warn('ippo: saveState failed', e);
  }
}

// ===== 同期インジケーター =====
var _syncIndicatorTimer = null;

// ===== トースト通知（ユーザー向けメッセージ） =====
var _toastTimer = null;

// ===== Escapeキーでモーダルを閉じる =====
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  // カレンダー日付詳細
  var dm = document.getElementById('dmOverlay');
  if(dm && dm.classList.contains('dm-open')){ dm.classList.remove('dm-open'); return; }
  // 編集オーバーレイ
  var eo = document.getElementById('editOverlay');
  if(eo && eo.style.display === 'flex'){ eo.style.display = 'none'; return; }
  // 記録モーダル（ステップ）
  var rm = document.getElementById('record-modal');
  if(rm && rm.classList.contains('active')){ if(typeof closeModal === 'function') closeModal(); return; }
  // 診断オーバーレイ
  var diag = document.getElementById('diagnosis-overlay');
  if(diag){ diag.remove(); return; }
});



// Phase E (Step 5): init() 削除済み。
// bootstrap() は src/main.js から直接呼び出される。

// visibilitychange ハンドラは src/services/supabase.js に移植済み（Priority 4 Step 4-4）。

// PR-086 (Legacy Removal Batch-8): updateFoodBodyCorrelation/updateCycleSymptomCorrelation は
// src/modules/insights-tab-panel.js へ物理移動済み（本ファイル冒頭で import back）。



// ===== オンボーディング管理 =====
var _obStep = 0;
var _obTotalSteps = 8;
var _obPeriodSelected = null;
var _obCycleSelected = null;
var _obDiseasesSelected = [];
var _obPurposeSelected = null;
var _obReminderSelected = null;

















// PR-084 (Legacy Removal Batch-6): reorderRecordSections は
// src/modules/record-section-order.js へ物理移動済み（import参照）。

// Phase E (Step 3): home-renderer.js へ移植済み。
// window.showMain は main.js ロード後にモジュール版で上書きされる。
// ippo:vite-ready 以前の fallback として最小実装を残す。
function showMain() {
  document.getElementById('screen-welcome').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  if (typeof updateGreeting === 'function') updateGreeting();
  if (typeof updateStats === 'function') updateStats();
  if (typeof buildCalendar === 'function') buildCalendar();
}

// ===== DATE/GREETING =====
function updateDate() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = `${now.getMonth() + 1}月${now.getDate()}日（${days[now.getDay()]}）`;
  const el = document.getElementById('today-date');
  if (el) el.textContent = date;
}

function getGreetingText() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 10) return 'おはようございます';
  if (hour >= 10 && hour < 17) return 'こんにちは';
  if (hour >= 17 && hour < 21) return 'こんばんは';
  return 'おつかれさまです';
}

function updateGreeting() {
  const greeting = getGreetingText();
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = greeting;
  const nameEl = document.getElementById('greeting-name');
  if (nameEl) nameEl.textContent = (state.name || 'あなた') + 'さん';
  // 連続記録バッジ更新
  const badgeCount = document.getElementById('streak-badge-count');
  if (badgeCount) {
    var streak = 0;
    var d = new Date();
    while(true){
      var ds = d.toDateString();
      var found = false;
      for(var i=0; i<state.records.length; i++){
        if(new Date(state.records[i].date).toDateString() === ds){ found = true; break; }
      }
      if(!found) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    badgeCount.textContent = streak;
  }
  updateDate();
}

// ===== STATS =====
function updateStats() {
  var streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = state.streak || 0;
  var totalEl = document.getElementById('total-count');
  if (totalEl) totalEl.textContent = state.totalDays || 0;
  var itEl = document.getElementById('insight-total');
  if (itEl) itEl.textContent = state.totalDays || 0;
  var isEl = document.getElementById('insight-streak');
  if (isEl) isEl.textContent = state.streak || 0;
  // 空状態バナー
  var emptyEl = document.getElementById('insights-empty-state');
  if(emptyEl) emptyEl.style.display = (state.records.length === 0) ? 'block' : 'none';

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
// PR-084: clearData（data-export.js側、物理移動済み）がupdateStats（本ファイルの
// ローカル実装、home-renderer.js版とは別、PR-080C重複整理と同型の「統合しない」
// 判断を踏襲）をbare呼び出しするための専用ブリッジ（PR-081
// window.__ippoLegacyUpdateSettingsHero と同型パターン）。
window.__ippoLegacyUpdateStats = updateStats;

// 今月の無痛み日数を計算して表示
function calcPainFreeDays() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('calcPainFreeDays', calcPainFreeDays);
    return;
  }
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (state.records || []).forEach(function(r) {
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

// PR-087 (Legacy Removal Batch-9): calcPainFreeDaysThisMonth/calcAvgPainThisMonth は
// src/utils/stats-utils.js へ物理移動済み（import参照）。

// PR-080B: 確定Dead Code。saveRecord()内の無条件bare呼び出し2箇所が残るため定義は維持（PR-080Eで対応）。
function updateHistory(){
  // 最近の記録セクション削除済み
}

// PR-084 (Legacy Removal Batch-6): buildSymptomChips/applySymptomChipPriority は
// src/modules/symptom-settings.js へ物理移動済み（import参照）。

function updateUnlock(){
  var days = state.totalDays || 0;
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


// ===== FASTING TIMER — CYCLE-AWARE HELPERS =====
// PR-085 (Legacy Removal Batch-7): FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDE は
// src/modules/fasting.js へ物理移動済み（本ファイル冒頭で import back、toggleFast()が参照）。

// 過食衝動サポート: フェーズ・疾患別の検証メッセージと対処法
var BINGE_URGE_SUPPORT = {
  '黄体期': {
    validation: 'その食欲は本物のホルモン反応です',
    science: 'エストロゲンが低下し、プロゲステロンが上昇する黄体期には、脳が糖質・高カロリー食を強く求めます（Hedonic Hunger）。これは意志が弱いのではなく、からだのメカニズムです。',
    color: '#7ba3c4'
  },
  '黄体期後期': {
    validation: 'この衝動はPMSの症状のひとつです',
    science: '月経前（黄体期後半）は食欲コントロールが最も難しい時期です。研究では黄体期に過食エピソードが有意に増加することが確認されています。あなたは正常な反応を経験しています。',
    color: '#9b89b4'
  },
  'PCOS': {
    validation: 'インスリン・アンドロゲンが食欲をコントロールしています',
    science: 'PCOSのある方は過食性障害のリスクが約1.5倍高いことが大規模研究で示されています。これはインスリン抵抗性・アンドロゲン過剰・体重スティグマが複合的に影響しています。',
    color: '#6b9e78'
  },
  '更年期障害': {
    validation: 'ホルモンの急激な変動が食欲を乱しています',
    science: '更年期移行期（ペリメノポーズ）は過食性障害の有病率が閉経前の7倍以上になる時期です。あなたの食欲の波には明確な生物学的根拠があります。',
    color: '#d4a574'
  },
  'PMS/PMDD': {
    validation: 'PMDDの症状として、食欲コントロールの困難は認められています',
    science: '黄体期には糖質・高カロリー食への渇望が増大し、PMDDの方では過食エピソードが顕著に多くなります。治療が必要な状態のサインかもしれません。',
    color: '#c4878c'
  },
  // 子宮内膜症: 2026年最新ナラティブレビュー（Archives of Gynecology and Obstetrics）
  // 遺伝的相関 rg=0.61, OR 2.94 — 慢性疼痛・エンドベリーが主要引き金
  '子宮内膜症': {
    validation: '慢性的な痛みが「食べること」で和らぐのは、脳の正常な反応です',
    science: '2026年の最新研究により、子宮内膜症のある方は摂食障害を発症するリスクが約3倍（OR 2.94）高く、遺伝的な関連も確認されています。お腹の張り（エンドベリー）によるボディイメージの悩みが、過食衝動の引き金になることも多いです。これはあなたの意志の問題ではありません。',
    color: '#c4878c'
  },
  // 子宮筋腫: 過食→肥満→エストロゲン→筋腫増大の悪循環
  '子宮筋腫': {
    validation: 'その食欲は、からだがエネルギーを求めているサインです',
    science: '子宮筋腫のある方では、過食→体重増加→脂肪組織でのエストロゲン産生→筋腫の成長促進という悪循環が研究で確認されています。ただし、この知識を自分を責めるために使わないでください。ゆっくりとした変化が身体にとって最も安全です。',
    color: '#b07ba0'
  },
  // 子宮腺筋症: 慢性疼痛 + 子宮内膜症に準じた過食リスク
  '子宮腺筋症': {
    validation: '慢性的な痛みを抱えているとき、食べることで楽になろうとするのは自然です',
    science: '子宮腺筋症による慢性疼痛は、感情的過食の主要なリスク因子です。痛みがひどい日は断食を無理に続けず、体の声を優先してください。',
    color: '#9b89b4'
  },
  // 卵巣嚢腫: 慢性的な下腹部痛・腹部膨満感による感情的過食への配慮
  '卵巣嚢腫': {
    validation: 'お腹の不快感があるとき、食べることで気を紛らわそうとするのは自然な反応です',
    science: '卵巣嚢腫による慢性的な下腹部痛や腹部膨満感は、感情的過食の引き金になることがあります。規則的な食事リズムはインスリンバランスとホルモン環境を整えるサポートになると考えられています。痛みが強い日は断食を無理に続けず、まず体を休めることを優先してください。',
    color: '#7a9eb0'
  },
  'default': {
    validation: '食欲の波は自然なことです',
    science: 'ホルモンの変動、ストレス、睡眠不足など、さまざまな要因が食欲に影響します。今この瞬間の感覚に気づいていることが、最初の一歩です。',
    color: '#a89080'
  }
};

// 回復食データ（フェーズ別 + PCOSは低GI優先）
var FAST_RECOVERY_FOODS = {
  '月経期':    { color: '#c4878c', icon: '🩸', foods: [['ほうれん草・小松菜','鉄分補給'],['豆腐・納豆','植物性タンパク質'],['あさり・しじみ','ヘム鉄'],['ビタミンCを一緒に','鉄の吸収アップ']] },
  '卵胞期':    { color: '#6b9e78', icon: '🌿', foods: [['鶏肉・卵','良質タンパク質'],['アボカド','良質な脂質'],['玄米・雑穀','低GI炭水化物'],['ブロッコリー','ビタミンC+食物繊維']] },
  '排卵期':    { color: '#d4a574', icon: '🫐', foods: [['サーモン・青魚','オメガ3・抗炎症'],['くるみ・アーモンド','良質な脂質'],['ベリー類','抗酸化'],['卵','コリン・タンパク質']] },
  '黄体期':    { color: '#7ba3c4', icon: '🌙', foods: [['かぼちゃ・さつまいも（少量）','低GI + マグネシウム'],['ダークチョコ70%以上','マグネシウム・血糖安定'],['バナナ・キウイ','セロトニン前駆体'],['温かい味噌汁','腸内環境・精神安定']] },
  '黄体期後期':{ color: '#9b89b4', icon: '🌑', foods: [['温かいスープ・雑炊','消化を助ける'],['生姜・ターメリック','抗炎症'],['大豆製品','植物性エストロゲン'],['マグネシウム豊富な緑葉野菜','PMSを和らげる']] },
  'PCOS':      { color: '#6b9e78', icon: '💙', foods: [['卵・鶏肉','血糖を安定させるタンパク質'],['アボカド','インスリン感受性を助ける脂質'],['緑黄色野菜','食物繊維で血糖スパイク抑制'],['シナモン（少量）','インスリン感受性改善の研究あり']] },
  // 子宮内膜症: 抗炎症・低エストロゲン食（慢性炎症の軽減が目的）
  '子宮内膜症':{ color: '#c4878c', icon: '🔴', foods: [['サーモン・いわし','オメガ3脂肪酸で炎症を抑制'],['ブロッコリー・キャベツ','エストロゲン代謝を助けるアブラナ科'],['ターメリック・生姜','抗炎症スパイス'],['緑茶','抗酸化・軽度の抗炎症効果']] },
  // 子宮筋腫: 抗エストロゲン食・食物繊維強化（脂肪→エストロゲン過剰の抑制）
  '子宮筋腫':  { color: '#b07ba0', icon: '🟤', foods: [['野菜・豆類','食物繊維でエストロゲン排出促進'],['ブロッコリー・カリフラワー','アブラナ科でエストロゲン代謝サポート'],['きのこ類','腸内環境改善・免疫サポート'],['亜麻仁・チアシード','植物性オメガ3・リグナン']] },
  // 子宮腺筋症: 子宮内膜症に準じた抗炎症
  '子宮腺筋症':{ color: '#9b89b4', icon: '🟣', foods: [['青魚（さば・いわし）','強力な抗炎症・EPA/DHA'],['緑黄色野菜','ビタミンK・抗酸化'],['温かい野菜スープ','消化を助け炎症を和らげる'],['ベリー類','アントシアニン・抗炎症']] },
  // 卵巣嚢腫: 抗酸化（ROS軽減）＋抗炎症＋低GI（インスリン抵抗性改善）
  // チョコレート嚢腫の「鉄分由来の活性酸素（ROS）」抑制を最優先に設計
  '卵巣嚢腫':  { color: '#7a9eb0', icon: '🩵', foods: [['ベリー類・ブルーベリー','アントシアニンで活性酸素（ROS）を中和'],['ブロッコリー・芽キャベツ','DIM・アブラナ科でエストロゲン代謝サポート'],['サーモン・えごまオイル','オメガ3・EPA/DHAで嚢腫周囲の炎症を抑制'],['玄米・さつまいも（少量）','低GIでインスリン安定・ホルモンバランス改善']] }
};

function getCurrentCyclePhase(){return typeof window.getCurrentCyclePhase==='function'?window.getCurrentCyclePhase():null;}

// PR-085 (Legacy Removal Batch-7): updateFastingWidgetPhase/showRecoveryGuide(local wrapper)/
// fastInterval/window.__ippoStopFastInterval/setFastGoal は src/modules/fasting.js へ物理移動済み
// （本ファイル冒頭で import back）。

// 過食衝動サポートモーダル（研究エビデンスに基づく）

// ===== FASTING TIMER =====

function toggleFast() {
  // fastingActiveがtrueでもfastingStartが欠落している不整合状態をリセット
  if (state.fastingActive && !state.fastingStart) {
    state.fastingActive = false;
    state.fastingStart = null;
    saveState();
    var sb = document.getElementById('fast-start-btn');
    var eb = document.getElementById('fast-stop-btn');
    if (sb) sb.style.display = 'block';
    if (eb) eb.style.display = 'none';
  }
  if (state.fastingActive) return;

  // 安全チェック①：月経期・黄体期で推奨safeMaxを超えた場合
  // ※ confirm()はモバイルPWAでブロックされることがあるためトーストに変更
  var phase = getCurrentCyclePhase();
  var cfg = phase ? FAST_PHASE_CONFIG[phase] : null;
  if (cfg && state.fastGoal > cfg.safeMax) {
    if(typeof showToast === 'function'){
      showToast('⚠️ ' + phase + '中は ' + cfg.rec + ' が推奨です。体調を最優先にしてください。', 'warn');
    }
    // 注意を促した上で続行（強制ブロックではなく自己判断を尊重）
  }

  // 安全チェック②：BEDリスクの高い疾患ユーザーへの配慮メッセージ
  var diseases = state.myDiseases || [];
  var bedDisease = null;
  // 子宮内膜症 OR 2.94 → 最優先で警告
  ['子宮内膜症', '子宮腺筋症', 'PCOS', '子宮筋腫', 'PMS/PMDD', '更年期障害'].forEach(function(dk) {
    if (!bedDisease && diseases.indexOf(dk) !== -1 && FAST_DISEASE_OVERRIDE[dk] && FAST_DISEASE_OVERRIDE[dk].bedRisk) {
      bedDisease = dk;
    }
  });
  if (bedDisease && state.fastGoal >= 16 && !state._fastBedWarningShown) {
    state._fastBedWarningShown = true;
    var dOverride = FAST_DISEASE_OVERRIDE[bedDisease];
    showAlertModal(
      '🫶 ' + bedDisease + 'をお持ちの方へ<br><br>' +
      dOverride.bedNote + '<br><br>' +
      '推奨: ' + dOverride.rec + '<br><br>' +
      '断食に過食衝動を感じたら、ウィジェット内の「食欲が止まらない」ボタンでサポートを呼び出せます。'
    );
  }

  // 通知許可をリクエスト
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  state.fastingActive = true;
  state.fastingStart = Date.now();
  saveState();
  document.getElementById('fast-start-btn').style.display = 'none';
  document.getElementById('fast-stop-btn').style.display = 'block';
  // 達成予定時刻を表示
  var goalTime = new Date(Date.now() + state.fastGoal * 3600000);
  var goalStr = ('0' + goalTime.getHours()).slice(-2) + ':' + ('0' + goalTime.getMinutes()).slice(-2);
  document.getElementById('fast-status').textContent = state.fastGoal + 'h目標 → ' + goalStr + ' に達成予定';
  startFastTimer();
}


// PR-085 (Legacy Removal Batch-7): endFast/resumeFasting/startFastTimer は
// src/modules/fasting.js へ物理移動済み（本ファイル冒頭で import back、toggleFast()が参照）。

// ===== ホーム周期フェーズバナー =====
var PHASE_BANNER_CONFIG = {
  '月経期': {
    icon: '🔴',
    tips: {
      'default':    'からだを温めて、ゆっくり過ごしましょう。',
      '子宮内膜症': '生理痛が強い場合は無理せず休養を。記録を忘れずに。',
      '子宮筋腫':   '経血量の変化を今日も記録してください。',
      '子宮腺筋症': '痛みの強さを記録しておくと診察時に役立ちます。',
      'PMS/PMDD':   '気分の波も正直に記録してみましょう。'
    }
  },
  '卵胞期': {
    icon: '🌱',
    tips: {
      'default':    '体調が上向きの時期。今日の症状も記録してみましょう。',
      'PCOS':       '血糖値を意識した食事がホルモンバランスに◎。',
      '不妊症':     'このフェーズの体調変化も記録しておきましょう。'
    }
  },
  '排卵期': {
    icon: '🥚',
    tips: {
      'default':    '排卵期は骨盤痛が出やすい時期です。',
      '子宮内膜症': '排卵痛が強い場合は部位と強さを記録してください。',
      '卵巣嚢腫':   '片側の痛みの左右を記録すると診察時に有用です。',
      '不妊症':     '排卵のサインを体温・おりものとあわせて記録しましょう。',
      'PCOS':       '排卵の有無を基礎体温で確認しましょう。'
    }
  },
  '黄体期': {
    icon: '🌙',
    tips: {
      'default':    '症状が出やすい時期。無理せず記録を続けましょう。',
      'PMS/PMDD':   'PMSの症状が出始める時期。気分の変化も記録してください。',
      '子宮内膜症': '骨盤痛が増えやすい時期です。強さと部位を記録しましょう。',
      '更年期障害':  'ほてりや不眠が出やすい時期。SMIチェックを忘れずに。',
      'PCOS':       '基礎体温が上がっているか確認しましょう。'
    }
  }
};

function updateHomePhaseBanner() {
  // 新デザイン：home-phase-badge に表示
  var badge     = document.getElementById('home-phase-badge');
  var badgeText = document.getElementById('home-phase-badge-text');
  if (!badge || !badgeText) return;

  // getCurrentCyclePhase が null の場合は getPhaseForDate でフォールバック
  var phase = (typeof getCurrentCyclePhase === 'function') ? getCurrentCyclePhase() : null;
  if (!phase && state.lastPeriodDate && state.cycleLength) {
    phase = getPhaseForDate(new Date());
  }
  if (!phase) { badge.style.display = 'none'; return; }

  var last = state.lastPeriodDate ? new Date(state.lastPeriodDate + 'T00:00:00') : null;
  var dayNum = last ? Math.floor((new Date() - last) / 86400000) + 1 : null;
  // 周期内日数に補正（次の周期になっている場合）
  if (dayNum && state.cycleLength && dayNum > state.cycleLength) {
    dayNum = ((dayNum - 1) % state.cycleLength) + 1;
  }

  badgeText.textContent = phase + (dayNum ? ' ' + dayNum + '日目' : '');
  badge.style.display = 'block';
}

// ===== ホーム 週間カレンダーバー =====
function buildHomeWeekRow() {
  var weekRow    = document.getElementById('home-week-row');
  if (!weekRow) return;

  var today     = new Date();
  var dayOfWeek = today.getDay();
  var monday    = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  var days = ['月','火','水','木','金','土','日'];
  var html = '';

  // 白背景下段用の色設定
  var phaseColors = {
    '月経期': '#f0a0b0', '卵胞期': '#88c8a0',
    '排卵期': '#80b8c8', '黄体期': '#d4a870', '不明': '#ede8e4'
  };

  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var dateStr  = d.toISOString().slice(0, 10);
    var todayStr = today.toISOString().slice(0, 10);
    var isToday  = dateStr === todayStr;
    var isFuture = dateStr > todayStr;

    var rec = (state.records || []).find(function(r) {
      return (r.date || r.record_date || '').slice(0, 10) === dateStr;
    });
    var pain = rec ? (rec.painLevel || 0) : null;

    var phase = getPhaseForDate(d);
    var phaseColor = phaseColors[phase] || phaseColors['不明'];

    var cellBg = isFuture ? '#f0ebe8' :
                 rec === undefined ? '#ede8e4' :
                 pain >= 4 ? '#c04060' :
                 pain >= 2 ? '#e8809a' :
                 pain >= 1 ? '#f0a8b8' : phaseColor;
    var cellColor = (pain >= 2) ? 'white' : 'var(--ink)';
    var cellWeight = isToday ? '700' : '500';

    var clickable = !isFuture;
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
  buildPhaseBar(monday);
}

// ホーム週セルから日付詳細を開くヘルパー（ISO文字列 → calYear/calMonth を設定してから開く）
function openDayDetailByDate(isoStr) {
  var d = new Date(isoStr + 'T00:00:00');
  calYear  = d.getFullYear();
  calMonth = d.getMonth();
  openDayDetail(d.getDate());
}

// PR-086 (Legacy Removal Batch-8): getPhaseForDate は src/modules/cycle-utils.js へ
// 新設・物理移動済み（本ファイル冒頭で import back）。

function buildPhaseBar(monday) {
  var bar    = document.getElementById('home-phase-bar');
  var labels = document.getElementById('home-phase-labels');
  if (!bar) return;

  var cycle = state.cycleLength || 28;

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
  var currentPhase = typeof getCurrentCyclePhase === 'function' ? getCurrentCyclePhase() : null;
  if (!currentPhase && state.lastPeriodDate && state.cycleLength) {
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

// ===== 今週の気づき =====
function updateHomeInsightCard() {
  var card = document.getElementById('home-insight-card');
  var text = document.getElementById('home-insight-text');
  if (!card || !text) return;

  var records = state.records || [];
  if (records.length < 3) { card.style.display = 'none'; return; }

  if (typeof window.buildHomeInsight === 'function') {
    var packet = window.buildHomeInsight(records, state);

    var lines = [];
    if (packet.reason)     lines.push(packet.reason.title + ' — ' + packet.reason.body);
    if (packet.prediction) lines.push(packet.prediction.title + ' — ' + packet.prediction.body);

    if (lines.length) {
      text.innerHTML = lines.map(function(l) { return '<div>' + l + '</div>'; }).join('');
      card.style.display = 'block';
      var predEl = document.getElementById('home-prediction-text');
      if (predEl && packet.prediction) predEl.textContent = packet.prediction.body;
      return;
    }
  }

  // フォールバック: 旧ロジック
  var today = new Date();
  var weekRecords = records.filter(function(r) {
    var d = new Date(r.date || r.record_date || '');
    var diff = Math.floor((today - d) / 86400000);
    return diff >= 0 && diff < 7;
  });
  if (weekRecords.length === 0) { card.style.display = 'none'; return; }

  var painDays   = weekRecords.filter(function(r) { return r.painLevel >= 2; }).length;
  var noPainDays = weekRecords.filter(function(r) { return r.painLevel === 0; }).length;
  var avgPain    = weekRecords.reduce(function(s, r) { return s + (r.painLevel || 0); }, 0) / weekRecords.length;

  var insight = '';
  if (painDays >= 4)       insight = '今週は' + painDays + '日間、痛みの記録があります。';
  else if (noPainDays >= 5) insight = '今週は' + noPainDays + '日、らくな日が続いています。';
  else if (avgPain > 0)    insight = '今週の平均痛みスコアは ' + avgPain.toFixed(1) + '/4 でした。';

  if (!insight) { card.style.display = 'none'; return; }
  text.textContent = insight;
  card.style.display = 'block';
}

// ===== 数値2つ（連続・次の生理） =====
function updateHomeNumbers() {
  var streak = state.streak || 0;
  var streakEl = document.getElementById('home-streak-num');
  if (streakEl) streakEl.textContent = streak;
  // 連続7日以上で🔥表示
  var fireEl = document.getElementById('home-streak-fire');
  if (fireEl) fireEl.textContent = streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '';

  var nextEl    = document.getElementById('home-next-num');
  var nextLabel = document.getElementById('home-next-label');
  var nextUnit  = document.getElementById('home-next-unit');
  if (!nextEl) return;

  if (state.lastPeriodDate && state.cycleLength) {
    var last     = new Date(state.lastPeriodDate + 'T00:00:00');
    var today    = new Date();
    var dayNum   = Math.floor((today - last) / 86400000) + 1;
    var daysLeft = state.cycleLength - dayNum;
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

// ===== 疾患別アドバイス =====
function updateHomeDiseaseAdvice() {
  var card = document.getElementById('home-disease-advice');
  var text = document.getElementById('home-disease-advice-text');
  if (!card || !text) return;

  var diseases = state.myDiseases || [];
  if (diseases.length === 0) { card.style.display = 'none'; return; }

  var h = new Date().getHours();
  var isMorning = h >= 5 && h < 12;
  var isNight   = h >= 20;
  var hint = (typeof getDailyHint === 'function') ? getDailyHint(diseases, isMorning, isNight) : null;
  if (!hint) { card.style.display = 'none'; return; }

  text.textContent = diseases[0] + '：' + hint.text;
  card.style.display = 'block';
}

// ===== インサイト タブ切り替え (Pattern B: 5タブ) =====
// PR-086 (Legacy Removal Batch-8): switchInsTab/renderInsightDiscoveries/_updateInsMainCard は
// src/modules/insights-tab-panel.js へ新設・物理移動済み（本ファイル冒頭で import back）。

// ===== 今月のサマリーテキスト生成 =====
function renderMonthlySummaryText() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderMonthlySummaryText', renderMonthlySummaryText);
    return;
  }
  var el = document.getElementById('ins-monthly-summary-text');
  if (!el) return;

  var now = new Date();
  var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  var mn = monthNames[now.getMonth()];

  var monthRecs = (state.records || []).filter(function(r){
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

// ===== フェーズ別症状マップ =====
// PR-082D (Legacy Removal Batch-4 分割④): renderPhaseMap/selectPhaseTab/
// _buildPhaseBarPreview は src/modules/pro/cycle-report.js へ物理移動済み（import参照）。

// ===== TABS =====
function switchTab(tab, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`screen-${tab}`).classList.add('active');
  if (btn) btn.classList.add('active');


  if (tab === 'insights') {
    var activePaneName = 'free';
    if (document.getElementById('ins-pane-pro') && document.getElementById('ins-pane-pro').style.display === 'block') activePaneName = 'pro';
    if (document.getElementById('ins-pane-doctor') && document.getElementById('ins-pane-doctor').style.display === 'block') activePaneName = 'doctor';
    if (typeof switchInsTab === 'function') switchInsTab(activePaneName);
    if (typeof renderInsightDiscoveries === 'function') renderInsightDiscoveries();
  }
  if (tab === 'home') {
    buildHomeWeekRow();
    updateHomeInsightCard();
    updateHomeNumbers();
    updateHomeDiseaseAdvice();
    updateHomeCTAState();
    if (typeof updateHomePhaseBanner === 'function') updateHomePhaseBanner();
    if (typeof updateTodayMessage === 'function') updateTodayMessage();
  }
  // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
}
　


// ===== RECORD MODAL =====
let _prevTab = 'home'; // バグ07: 直前タブを記憶して閉じたとき復元

function openRecordModal() {
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) _prevTab = activeScreen.id.replace('screen-', '');
  RecordInput.resetCurrentRecord();
  var steps = RecordInput.initSteps();
  // ステップインジケーターのドットを動的生成
  var indicator = document.getElementById('step-indicator');
  if (indicator) {
    indicator.innerHTML = '';
    steps.forEach(function() {
      var dot = document.createElement('div');
      dot.className = 'step-dot';
      indicator.appendChild(dot);
    });
  }
  renderStep();
  document.getElementById('record-modal').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // バグ14: フォーカスをモーダル内の最初のボタンに移動
  requestAnimationFrame(() => {
    const firstFocusable = document.querySelector('#record-modal .modal-sheet button, #record-modal .modal-sheet [tabindex]');
    if (firstFocusable) firstFocusable.focus();
  });
}

function closeModal() {
  document.getElementById('record-modal').classList.remove('active');
  const prevBtn = document.querySelector(`.nav-item[onclick*="'${_prevTab}'"]`);
  switchTab(_prevTab, prevBtn);
  // バグ14: モーダルを閉じたらナビボタンにフォーカスを戻す
  if (prevBtn) prevBtn.focus();
}

// PR-079: renderStep/nextStep/prevStep は src/modules/record-input.js へ移植済み。
// bare identifier は委譲のみ（再実装禁止）。nextStep の saveRecord() 呼び出しは
// record-input.js 側で window.saveRecord 経由に置き換え済み。
const renderStep = RecordInput.renderStep;
const nextStep = RecordInput.nextStep;
const prevStep = RecordInput.prevStep;

// ===== STEP RENDERERS =====
// PR-079: renderWellness/selectWellness は src/modules/record-input.js へ移植済み。
const renderWellness = RecordInput.renderWellness;
const selectWellness = RecordInput.selectWellness;



// PR-079: renderFood/selectFood/toggleFoodItem は src/modules/record-input.js へ移植済み。
const renderFood = RecordInput.renderFood;
const selectFood = RecordInput.selectFood;
const toggleFoodItem = RecordInput.toggleFoodItem;

// PR-079: renderFasting/selectFasting は src/modules/record-input.js へ移植済み。
const renderFasting = RecordInput.renderFasting;
const selectFasting = RecordInput.selectFasting;

// PR-079: renderEmotion/selectEmotion は src/modules/record-input.js へ移植済み。
const renderEmotion = RecordInput.renderEmotion;
const selectEmotion = RecordInput.selectEmotion;

// PR-079: buildSteps/getBodyCheckTitle/renderBodyCheck/selectBodyCheckItem/
// selectBodyCheckExtra/getDiseaseMorningQuestion は src/modules/record-input.js へ移植済み。
const buildSteps = RecordInput.buildSteps;
const getBodyCheckTitle = RecordInput.getBodyCheckTitle;
const renderBodyCheck = RecordInput.renderBodyCheck;
const selectBodyCheckItem = RecordInput.selectBodyCheckItem;
const selectBodyCheckExtra = RecordInput.selectBodyCheckExtra;
const getDiseaseMorningQuestion = RecordInput.getDiseaseMorningQuestion;

// ===== 今日のヒントカード（時間帯・疾患別） =====
// PR-086 (Legacy Removal Batch-8): updateDailyHintCard は src/modules/home-renderer.js へ
// 物理移動済み（本ファイル冒頭で import back）。

// PR-079: getDailyHint は src/modules/record-input.js へ移植済み。
const getDailyHint = RecordInput.getDailyHint;

// ===== 症状詳細展開UI（Step2） =====
// PR-079: renderSymptomDetail/toggleSymptomChip/appendSymptomDetail/toggleDetailItem/
// updateSliderDetail/selectBowelCount は src/modules/record-input.js へ移植済み。
const renderSymptomDetail = RecordInput.renderSymptomDetail;
const toggleSymptomChip = RecordInput.toggleSymptomChip;
const appendSymptomDetail = RecordInput.appendSymptomDetail;
const toggleDetailItem = RecordInput.toggleDetailItem;
const updateSliderDetail = RecordInput.updateSliderDetail;
const selectBowelCount = RecordInput.selectBowelCount;

// ===== SAVE RECORD =====
// PR-080: currentRecord bridge 撤去。毎回 RecordInput.getCurrentRecord() から取得する。
function saveRecord() {
  var currentRecord = RecordInput.getCurrentRecord();
  const noteEl = document.getElementById('journal-note');
  if (noteEl) currentRecord.note = noteEl.value;
  // Object schema を排除: consumer は全て Array schema (三カード) を前提とする
  delete currentRecord.symptomDetails;

  // ★ 編集モードの場合は編集対象日を使用
  if (state.editingDate) {
    currentRecord.date = new Date(state.editingDate).toISOString();
    currentRecord.record_date = state.editingDate;
    
    // 既存の記録を上書き
    var editIdx = state.records.findIndex(function(r) {
      return (r.record_date || (r.date && r.date.slice(0,10))) === state.editingDate;
    });
    if (editIdx !== -1) {
      state.records[editIdx] = currentRecord;
    } else {
      state.records.push(currentRecord);
    }
    
    state.editingDate = null; // 編集モード解除
    
    saveAndSync();
    closeModal();
    updateStats();
    updateUnlock();
    updateHistory();
    // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
    document.getElementById('success-message').innerHTML = '記録を更新しました。';
document.getElementById('success-overlay').classList.add('active');
    return;
  }
  
  currentRecord.date = new Date().toISOString();

  // Check if already recorded today (BEFORE push)
  const today = new Date().toDateString();
  const alreadyToday = state.records.some(r => new Date(r.date).toDateString() === today);

  // Streak logic (BEFORE push, so yesterday check is not polluted by today's record)
  if (!alreadyToday) {
    state.totalDays++;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toDateString();
    const hadYesterday = state.records.some(r => new Date(r.date).toDateString() === yStr);
    if (hadYesterday || state.streak === 0) {
      state.streak++;
    } else if (!hadYesterday && state.streak > 0) {
      state.streak = 1;
    }
  }

  // Push after all checks (prevent duplicate accumulation on same day)
  if (!alreadyToday) {
    state.records.push(currentRecord);
  } else {
    // Overwrite today's record instead of appending
    const idx = state.records.findLastIndex
      ? state.records.findLastIndex(r => new Date(r.date).toDateString() === today)
      : state.records.reduce((acc, r, i) => new Date(r.date).toDateString() === today ? i : acc, -1);
    if (idx !== -1) state.records[idx] = currentRecord;
    else state.records.push(currentRecord);
  }

  saveAndSync();
  closeModal();
  updateStats();
  updateUnlock();
  updateHistory();
  // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
  updateHomeCTA();
  if (typeof updateHomeCTAState === 'function') updateHomeCTAState();
  if (typeof updateStreakBadge === 'function') updateStreakBadge();
  if (typeof checkAndShowTempAlert === 'function') checkAndShowTempAlert();

  // パーソナライズされた成功メッセージ
  var latestRecord = (state.records || []).slice().reverse().find(function(r) {
    return r.date && r.date.slice(0, 10) === new Date().toISOString().slice(0, 10);
  });
  var successResult = getSuccessMessage(latestRecord);
  document.getElementById('success-emoji').innerHTML = successResult.icon || ICONS.check(32, 'var(--rose)');
  document.getElementById('success-title').textContent = successResult.title;
  document.getElementById('success-message').textContent = successResult.msg;
  document.getElementById('success-overlay').classList.add('active');
}

// PR-087 (Legacy Removal Batch-9): getSuccessMessage は
// src/modules/success-message.js へ物理移動済み（import参照）。

function closeSuccess() {
  if (window.__ippoSuccessOverlayTimer) {
    clearTimeout(window.__ippoSuccessOverlayTimer);
    window.__ippoSuccessOverlayTimer = null;
  }
  var overlay = document.getElementById('success-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
  }
}

// ===== MISC =====
// PR-087 (Legacy Removal Batch-9): shareApp/addToHome は
// src/modules/share.js へ物理移動済み（import参照）。

function setGraphTab(tab, el) {
  document.querySelectorAll('.sg-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // バグ12: タブ切替に応じてオーバーレイとグラフタイトルを更新
  const labelMap = { '7d': '7日間', '30d': '30日間', '90d': '90日間' };
  const needDays = { '7d': 7, '30d': 30, '90d': 90 };
  const required = needDays[tab] || 7;
  const overlay = document.getElementById('graph-overlay');
  const titleEl = document.querySelector('.sg-title');
  if (titleEl) titleEl.textContent = `からだのリズム（${labelMap[tab]}）`;
  if (overlay) {
    if (state.totalDays >= required) {
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
      const sub = overlay.querySelector('.demo-overlay-sub');
      if (sub) sub.textContent = `${required}日間記録すると表示されます（現在${state.totalDays}日）`;
    }
  }
}

// PR-087 (Legacy Removal Batch-9): setRating は
// src/modules/feedback.js へ物理移動済み（import参照）。

// PR-084 (Legacy Removal Batch-6): 症状設定（ALL_SYMPTOMS/openSymptomSettings/
// closeSymptomSettings/saveSymptomSettings）は src/modules/symptom-settings.js
// へ物理移動済み（import参照）。

// ===== ホーム画面サマリー =====
function updateHomeSummary(){
  var container = document.getElementById('home-summary');
  var content = document.getElementById('summary-content');
  var status = document.getElementById('summary-status');
  if(!container || !content || !status) return;

  var todayStr = new Date().toDateString();
  var rec = null;
  for(var i=0; i<state.records.length; i++){
    if(new Date(state.records[i].date).toDateString() === todayStr){ rec = state.records[i]; break; }
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
  var goalH = state.fastingGoal || 16;
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
  if (hasMealData || state.fastingEnabled) {
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
    var _fallbackDisease = (rec.diseases && rec.diseases[0]) || (state.myDiseases && state.myDiseases[0]) || '';
    Object.keys(dc).forEach(function(key){
      if(dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey = parts.length > 1 ? parts[0] : _fallbackDisease;
      var qId = parts.length > 1 ? parts[1] : key;
      var qCfg = typeof DISEASE_CONFIG !== 'undefined' ? DISEASE_CONFIG[dKey] : null;
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
  var recentFlares = detectFlareups(state.records).filter(function(f){
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
  var tempAnalysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records);
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
    var diseases2 = state.myDiseases || [];
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
    banner.style.display = (state.records && state.records.length >= 7) ? 'block' : 'none';
  }
}


// PR-080E: editPastRecord は src/modules/record-screen.js へ物理移動済み（ファイル冒頭でimport）。

  // ===== ホーム画面CTAボタン =====
function updateHomeCTA(){
  var title = document.getElementById('home-cta-title');
  var sub = document.getElementById('home-cta-sub');
  var card = document.getElementById('home-cta-card');
  if(!title || !sub || !card) return;

  var todayStr = new Date().toDateString();
  var hasRecord = false;
  for(var i=0; i<state.records.length; i++){
    if(new Date(state.records[i].date).toDateString() === todayStr){ hasRecord = true; break; }
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


function handleHomeCTA(){
  // daily check-in 完了フラグを確認 (2026-05-27):
  // record.meta.uiFlow === 'daily-checkin' が立っていれば「ふり返り」画面へ。
  // 未完了 or 他の入力経路からの保存のみの場合は3カードUIを開く。
  var today = new Date().toISOString().slice(0, 10);
  var s = (typeof getState === 'function') ? getState() : state;
  var rec = s && (s.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  var isDailyCheckinDone = !!(rec && rec.meta && rec.meta.uiFlow === 'daily-checkin');

  if (isDailyCheckinDone && typeof window.openTodayReflection === 'function') {
    window.openTodayReflection();
  } else if (typeof window.openRecordScreen === 'function') {
    window.openRecordScreen();
  } else {
    openRecordModal(); // fallback: record-three-card.js 未ロード時のみ
  }
}

// ===== ホーム CTAカード 記録前後状態更新 =====
// PR-086 (Legacy Removal Batch-8): updateTodayMessage は src/modules/home-renderer.js へ
// 物理移動済み（本ファイル冒頭で import back）。

function updateHomeCTAState() {
  var today = new Date().toISOString().slice(0, 10);
  var rec = (state.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });

  var card  = document.getElementById('home-cta-card');
  var title = document.getElementById('home-cta-title');
  var sub   = document.getElementById('home-cta-sub');
  if (!card) return;

  if (rec) {
    // 記録済み：ダークローズ・✓マーク
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '0.82';
    if (title) title.textContent = '✓ 今日の記録完了';
    if (sub)   sub.textContent   = buildComparisonComment(rec);
  } else {
    // 未記録：鮮やかなローズ
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '1';
    if (title) title.textContent = '今日を記録する';
    if (sub)   sub.textContent   = '';
  }
}

// ===== 連続記録バッジ色変化 =====
function updateStreakBadge() {
  var badge = document.getElementById('streak-badge');
  if (!badge) return;
  var today = new Date().toISOString().slice(0, 10);
  var recordedToday = (state.records || []).some(function(r) {
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

// ===== 比較コメント生成 =====
// PR-086 (Legacy Removal Batch-8): buildComparisonComment/buildDayComparison/
// buildWeekComparison/isPeriodExpected は src/modules/cycle-utils.js へ新設・物理移動済み
// （本ファイル冒頭で import back）。

  // ===== COMMUNITY VOICE =====
// PR-088 (Legacy Removal Batch-10): loadCommunityTopic/switchCVTab/loadCVArchive/
// toggleArchiveReplies/loadCommunityReplies/postCommunityReply/likeCommunityReply/
// deleteCommunityReply/updateReplyLikeCount/checkMyLikes は
// src/modules/community.js へ新設・物理移動済み（本ファイル冒頭で import）。

// PR-087 (Legacy Removal Batch-9): escapeHtml/getTimeAgo は
// src/utils/string-utils.js へ物理移動済み（import参照）。


function updateDiseaseSettingDisplay(){if(typeof window.updateDiseaseSettingDisplay==='function')window.updateDiseaseSettingDisplay();}
// PR-084 (Legacy Removal Batch-6): updateSymptomSettingDisplay は
// src/modules/symptom-settings.js へ物理移動済み（import参照）。

var SYMPTOM_CATEGORIES = {
  '頭痛':'body','腰痛':'body','下腹部痛':'body','むくみ':'body',
  '肌荒れ':'body','便秘':'body','下痢':'body','吐き気':'body',
  '倦怠感':'body','冷え':'body','発熱':'body','関節痛':'body',
  '排便痛':'body','腹部膨満':'body',
  '不眠':'mind','イライラ':'mind','不安感':'mind',
  '食欲増加':'mind','食欲低下':'mind','眠気':'mind',
  '集中力低下':'mind','気分の落ち込み':'mind','ブレインフォグ':'mind',
  'おりもの':'gyneco','胸の張り':'gyneco','ほてり':'gyneco',
  '動悸':'gyneco','のぼせ':'gyneco','性交痛':'gyneco'
};
var _sympTabCurrent = 'all';

// PR-084 (Legacy Removal Batch-6): getRecentSymptoms/saveSymptomSelection は
// src/modules/symptom-settings.js へ物理移動済み（import参照）。

function buildEffectiveLayer1() {
  var diseases = state.myDiseases || [];
  var priorityArr = [];
  diseases.forEach(function(disease){
    var priorities = DISEASE_PRIORITY_SYMPTOMS[disease] || [];
    priorities.forEach(function(s){
      if(priorityArr.indexOf(s) === -1) priorityArr.push(s);
    });
  });
  getRecentSymptoms().forEach(function(s){
    if(priorityArr.indexOf(s) === -1) priorityArr.push(s);
  });
  var merged = priorityArr.slice(0, 5);
  SYMPTOM_LAYERS.layer1.forEach(function(s){
    if(merged.indexOf(s) === -1) merged.push(s);
  });
  return merged.slice(0, 10);
}

function renderSymptomLayers() {
  var container = document.getElementById('rs-symptoms');
  if(!container) return;
  var diseases = state.myDiseases || [];
  var hasDiseaseWithSensitive = diseases.some(function(d){
    var p = DISEASE_PRIORITY_SYMPTOMS[d] || [];
    return p.some(function(s){ return SENSITIVE_SYMPTOMS.indexOf(s) !== -1; });
  });
  // 現在選択済み症状を退避
  var selected = [];
  container.querySelectorAll('.chip.selected').forEach(function(c){ selected.push(c.textContent); });
  var layer1 = buildEffectiveLayer1();
  var baseLayer2 = SYMPTOM_LAYERS.layer2.slice();
  if(!hasDiseaseWithSensitive){
    SENSITIVE_SYMPTOMS.forEach(function(s){ if(baseLayer2.indexOf(s)===-1) baseLayer2.push(s); });
  }
  var layer2 = baseLayer2.filter(function(s){ return layer1.indexOf(s)===-1; });
  var layer3 = SYMPTOM_LAYERS.layer3.filter(function(s){ return layer1.indexOf(s)===-1 && layer2.indexOf(s)===-1; });
  var expandBtnStyle = 'border:.5px dashed #ddd;background:transparent;color:#9a8e88;font-size:11px;padding:5px 14px;border-radius:20px;cursor:pointer;font-family:inherit;margin-top:2px;';
  function makeChip(name){ return '<div class="chip" onclick="toggleRsChip(this)" style="font-size:11px;padding:6px 12px;">'+name+'</div>'; }
  var html = '<div id="rs-symp-l1" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer1.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  html += '<div id="rs-symp-e2" style="margin:0 0 4px;"><button onclick="toggleSympLayer(2)" id="rs-symp-btn2" style="'+expandBtnStyle+'">もっと見る ▾</button></div>';
  html += '<div id="rs-symp-l2" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer2.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  html += '<div id="rs-symp-e3" style="display:none;margin:0 0 4px;"><button onclick="toggleSympLayer(3)" id="rs-symp-btn3" style="'+expandBtnStyle+'">さらに見る ▾</button></div>';
  html += '<div id="rs-symp-l3" style="display:none;flex-wrap:wrap;gap:6px;">';
  layer3.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  container.innerHTML = html;
  // 選択状態を復元、下層に選択済みがあれば自動展開
  if(selected.length){
    var needL2=false, needL3=false;
    container.querySelectorAll('.chip').forEach(function(c){
      if(selected.indexOf(c.textContent) !== -1){
        c.classList.add('selected');
        var l2=document.getElementById('rs-symp-l2'), l3=document.getElementById('rs-symp-l3');
        if(l2 && l2.contains(c)) needL2=true;
        if(l3 && l3.contains(c)) needL3=true;
      }
    });
    if(needL2) toggleSympLayer(2);
    if(needL3) toggleSympLayer(3);
  }
}

function toggleSympLayer(layerNum) {
  var layerEl = document.getElementById('rs-symp-l'+layerNum);
  var btnEl = document.getElementById('rs-symp-btn'+layerNum);
  if(!layerEl) return;
  var isOpen = layerEl.style.display !== 'none';
  if(isOpen){
    layerEl.style.display = 'none';
    if(btnEl) btnEl.textContent = layerNum===2 ? 'もっと見る ▾' : 'さらに見る ▾';
    if(layerNum===2){
      var e3=document.getElementById('rs-symp-e3'), l3=document.getElementById('rs-symp-l3');
      if(e3) e3.style.display='none';
      if(l3) l3.style.display='none';
      var b3=document.getElementById('rs-symp-btn3'); if(b3) b3.textContent='さらに見る ▾';
    }
  } else {
    layerEl.style.display = 'flex';
    if(btnEl) btnEl.textContent = '閉じる ▴';
    if(layerNum===2){
      var e3=document.getElementById('rs-symp-e3');
      if(e3) e3.style.display='block';
    }
  }
}

// 後方互換のため残す（呼び出し元が存在する場合のフォールバック）
function switchSymptomTab(cat, btn) {
  // 新3層システムでは tab 切替は不使用
}

function updateRecordSymptoms(){
  var container = document.getElementById('rs-symptoms');
  if(!container) return;
  var saved = state.mySymptoms || [];
  var chips = container.querySelectorAll('.chip');
  var allSymptoms = [];
  chips.forEach(function(c){ allSymptoms.push(c.textContent.trim()); });

  // 登録済みの症状を先頭に並べ替え
  var sorted = [];
  for(var i = 0; i < saved.length; i++){
    if(allSymptoms.indexOf(saved[i]) !== -1) sorted.push(saved[i]);
  }
  for(var j = 0; j < allSymptoms.length; j++){
    if(sorted.indexOf(allSymptoms[j]) === -1) sorted.push(allSymptoms[j]);
  }

  container.innerHTML = '';
  for(var k = 0; k < sorted.length; k++){
    var s = sorted[k];
    var isMy = saved.indexOf(s) !== -1;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = s;
    chip.setAttribute('data-sym-cat', SYMPTOM_CATEGORIES[s] || 'body');
    if(isMy){
      chip.style.borderColor = 'var(--rose)';
      chip.style.background = 'var(--rose-pale)';
    }
    chip.onclick = function(){ this.classList.toggle('selected'); };
    container.appendChild(chip);
  }
  // re-apply active tab filter after rebuild
  switchSymptomTab(_sympTabCurrent, null);
}

// PR-087 (Legacy Removal Batch-9): submitFeedback は
// src/modules/feedback.js へ物理移動済み（import参照）。

// PR-084 (Legacy Removal Batch-6): clearData は src/modules/data-export.js へ、
// setDailyMessage は src/modules/ui-notifications.js へ、それぞれ物理移動済み
// （import参照）。

// ===== CALENDAR =====
var calYear, calMonth;
(function(){ var now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); })();

// ===== EDIT RECORD =====
var editingDateStr = null;

function openEditRecord(dateString){
  document.getElementById('dmOverlay').classList.remove('dm-open');
  editingDateStr = dateString;
  var recs = state.records.filter(function(r){ return new Date(r.date).toDateString() === dateString; });
  var rec = recs.length ? recs[recs.length - 1] : null;

  var overlay = document.getElementById('editOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'editOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(44,36,32,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div id="editBox" style="width:90%;max-width:400px;max-height:88vh;background:var(--cream);border-radius:24px;padding:24px;overflow-y:auto;box-shadow:0 12px 40px rgba(44,36,32,0.15);"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeEditRecord(); });
  }
  overlay.style.display = 'flex';

  var dateObj = new Date(dateString);
  var WDAY = ['日','月','火','水','木','金','土'];
  var title = dateObj.getFullYear()+'年'+(dateObj.getMonth()+1)+'月'+dateObj.getDate()+'日（'+WDAY[dateObj.getDay()]+'）';

  var m = (rec && rec.meals) ? rec.meals : {};
  var html = '';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
  html += '<div style="font-family:Shippori Mincho,serif;font-size:17px;color:var(--ink);">'+title+'</div>';
  html += '<button onclick="closeEditRecord()" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(200,180,170,0.3);background:var(--white);color:var(--ink-light);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
  html += '</div>';

  // 食事
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
  var freeText = m.free || '';
  // 旧形式の互換: morning/lunch等が残っている場合はフリーテキストに変換
  if(!freeText && (m.morning || m.lunch || m.dinner || m.snack)){
    var parts = [];
    if(m.morning) parts.push('朝食: ' + m.morning);
    if(m.lunch) parts.push('昼食: ' + m.lunch);
    if(m.dinner) parts.push('夕食: ' + m.dinner);
    if(m.snack) parts.push('間食: ' + m.snack);
    freeText = parts.join('\n');
  }
  html += '<textarea id="edit-meal-free" placeholder="0930 朝食&#10;1200 昼食&#10;1900 夕食" style="width:100%;min-height:120px;border:1.5px solid #e8ddd8;border-radius:12px;padding:12px;font-family:Noto Sans JP,sans-serif;font-size:13px;color:var(--ink);background:var(--white);resize:vertical;outline:none;line-height:1.9;">'+freeText.replace(/</g,'&lt;')+'</textarea>';
  html += '</div>';

  // 基礎体温
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">TEMPERATURE</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<span style="font-size:16px;">🌡</span>';
  html += '<input id="edit-temp" type="number" step="0.1" min="35" max="42" value="'+(rec && rec.temperature ? rec.temperature : '')+'" placeholder="36.5" style="flex:1;" class="meal-input">';
  html += '<span style="font-size:13px;color:var(--ink-mid);">℃</span>';
  html += '</div></div>';

  // 症状チップ
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">SYMPTOMS</div>';
  var symptomList = ['頭痛','腰痛','腹痛','むくみ','肌荒れ','倦怠感','イライラ','不眠','便秘','冷え'];
  var currentSymptoms = (rec && rec.symptoms) ? rec.symptoms : [];
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for(var si=0;si<symptomList.length;si++){
    var sym = symptomList[si];
    var isSel = currentSymptoms.indexOf(sym) >= 0;
    html += '<button onclick="toggleEditChip(this)" data-val="'+sym+'" class="chip'+(isSel?' selected':'')+'" style="font-size:12px;padding:6px 12px;">'+sym+'</button>';
  }
  html += '</div></div>';

  // 生理状態
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MENSTRUAL CYCLE</div>';
  var cycleOptions = ['なし','生理開始','生理中','排卵期','高温期','低温期'];
  var currentCycle = (rec && rec.menstrualCycle) ? rec.menstrualCycle : '';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for(var ci=0;ci<cycleOptions.length;ci++){
    var co = cycleOptions[ci];
    var cSel = (currentCycle === co);
    html += '<button onclick="selectEditCycle(this,\''+co+'\')" data-val="'+co+'" class="chip'+(cSel?' selected':'')+'" style="font-size:12px;padding:6px 12px;">'+co+'</button>';
  }
  html += '</div></div>';

  // メモ
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEMO</div>';
  html += '<textarea id="edit-note" class="modal-textarea" placeholder="メモ・気づいたことなど" rows="3">'+(rec && rec.note ? rec.note : '')+'</textarea>';
  html += '</div>';

  // 保存・削除ボタン
  html += '<div style="display:flex;gap:10px;">';
  html += '<button onclick="deleteEditRecord()" style="flex:1;padding:14px;background:#f0ebe6;color:var(--ink-mid);border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:13px;cursor:pointer;">🗑 削除</button>';
  html += '<button onclick="saveEditRecord()" style="flex:2;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">保存する</button>';
  html += '</div>';

  document.getElementById('editBox').innerHTML = html;
}

function closeEditRecord(){
  var overlay = document.getElementById('editOverlay');
  if(overlay) overlay.style.display = 'none';
}

function toggleEditChip(el){
  el.classList.toggle('selected');
}

function selectEditCycle(el, val){
  var parent = el.parentElement;
  var btns = parent.querySelectorAll('.chip');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('selected');
  el.classList.add('selected');
}

function saveEditRecord(){
  var recs = state.records.filter(function(r){ return new Date(r.date).toDateString() === editingDateStr; });
  var rec = recs.length ? recs[recs.length - 1] : null;

  if(!rec){
    // 新規作成
    var _editDate = new Date(editingDateStr);
    rec = { date: _editDate.toISOString(), record_date: _editDate.toISOString().slice(0, 10) };
    state.records.push(rec);
  }

    // 食事（フリーメモ）
  var editFreeEl = document.getElementById('edit-meal-free');
  var editFreeText = editFreeEl ? editFreeEl.value.trim() : '';
  var editParsed = parseMealMemo(editFreeText);
  rec.mealFree = editFreeText;
  rec.meals = { free: editFreeText };
  rec.firstMealTime = editParsed ? editParsed.firstTime : '';
  rec.lastMealTime = editParsed ? editParsed.lastTime : '';
  rec.mealCount = editParsed ? editParsed.mealCount : 0;
  rec.fasting = editParsed ? editParsed.fastingHours : 0;


  // 体温
  var tempVal = document.getElementById('edit-temp').value.trim();
  if(tempVal) rec.temperature = tempVal;
  else delete rec.temperature;

  // 症状
  var symEls = document.querySelectorAll('#editOverlay .chip.selected[data-val]');
  var symptoms = [];
  var cycleVal = '';
  for(var j=0;j<symEls.length;j++){
    var parent = symEls[j].parentElement.previousElementSibling;
    if(parent && parent.textContent === 'SYMPTOMS'){
      symptoms.push(symEls[j].dataset.val);
    }
  }
  // 症状を別途取得
  symptoms = [];
  var allChips = document.querySelectorAll('#editOverlay [data-val]');
  var inSymptoms = false;
  var inCycle = false;
  for(var k=0;k<allChips.length;k++){
    var chip = allChips[k];
    var val = chip.dataset.val;
    var symptomList = ['頭痛','腰痛','腹痛','むくみ','肌荒れ','倦怠感','イライラ','不眠','便秘','冷え'];
    var cycleList = ['なし','生理開始','生理中','排卵期','高温期','低温期'];
    if(symptomList.indexOf(val) >= 0 && chip.classList.contains('selected')){
      symptoms.push(val);
    }
    if(cycleList.indexOf(val) >= 0 && chip.classList.contains('selected')){
      cycleVal = val;
    }
  }
  rec.symptoms = symptoms;
  rec.menstrualCycle = cycleVal;

  // メモ
  var noteVal = document.getElementById('edit-note').value.trim();
  if(noteVal) rec.note = noteVal;
  else delete rec.note;

  saveState();
  // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
  if(typeof cloudSaveRecord === 'function') cloudSaveRecord(rec);

  closeEditRecord();

  // 更新後のモーダルを再表示
  var dateObj = new Date(editingDateStr);
  openDayDetail(dateObj.getDate());
}

function deleteEditRecord(){
  showConfirmModal('この日の記録を削除しますか？', function() {
    var recs = state.records.filter(function(r){
      return new Date(r.date).toDateString() === editingDateStr;
    });
    recs.forEach(function(r){
      if(r.id) softDeleteRecord(r.id);
    });
    // IDがないレコードは旧方式で削除
    state.records = state.records.filter(function(r){
      return new Date(r.date).toDateString() !== editingDateStr || r.id;
    });
    saveState();
    // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
    closeEditRecord();
    document.getElementById('dmOverlay').classList.remove('dm-open');
  });
}


// ===== 24H DONUT CHART =====
function createMealDonut(meals, fasting, fastingGoal){
  var R = 52, C = 2 * Math.PI * R;
  var hourUnit = C / 24;
  var cx = 64, cy = 64;


  // 食事スロット定義
  var mealSlots = [
    { key: '朝食', label: '朝食', defaultH: 7, duration: 1.5, color: '#F4B860' },
    { key: '昼食', label: '昼食', defaultH: 12, duration: 1.5, color: '#7FC8A9' },
    { key: '夕食', label: '夕食', defaultH: 19, duration: 1.5, color: '#E88D97' },
    { key: '間食', label: '間食', defaultH: 15, duration: 0.75, color: '#C4A7D7' }
  ];
  var fastColor = '#3D5A80', bgColor = '#F0EBE6', emptyColor = '#FAF6F2';

  // 食事エントリーを収集（時間付き）
  var foodTimes = [];
  var filledMeals = [];
  for(var i = 0; i < mealSlots.length; i++){
    var sl = mealSlots[i];
    if(meals && meals[sl.key]){
      filledMeals.push(sl);
      var h = sl.defaultH;
      // meals内に時間文字列があればパース
      var val = meals[sl.key];
      if(typeof val === 'string'){
        var tm = val.match(/(\d{1,2}):?(\d{2})/);
        if(tm) h = parseInt(tm[1],10) + parseInt(tm[2],10)/60;
      }
      foodTimes.push({ hour: h, slot: sl, isDrink: false });
    }
  }
  // firstTime / lastTime があればそこからも時間取得
  if(meals && meals.firstTime){
    var fp = meals.firstTime.split(':');
    var firstH = parseInt(fp[0],10) + parseInt(fp[1]||0,10)/60;
    if(foodTimes.length > 0) foodTimes[0].hour = firstH;
  }
  if(meals && meals.lastTime){
    var lp = meals.lastTime.split(':');
    var lastH = parseInt(lp[0],10) + parseInt(lp[1]||0,10)/60;
    if(foodTimes.length > 1) foodTimes[foodTimes.length - 1].hour = lastH;
  }
  // free テキストからもパース（飲み物判定含む）
  if(meals && meals.free && typeof meals.free === 'string'){
    var lines = meals.free.trim().split('\n');
    for(var li = 0; li < lines.length; li++){
      var line = lines[li].trim();
            var match = line.match(/^(\d{2})(\d{2})\s*(.*)/);
      if(match){
        var mh = parseInt(match[1],10) + parseInt(match[2],10)/60;
        var mlabel = match[3].trim();
        var drinkWords = mlabel.match(/飲み物|飲料|お水|水分|コーヒー|カフェラテ|カプチーノ|エスプレッソ|お茶|緑茶|麦茶|ほうじ茶|煎茶|玄米茶|番茶|紅茶|ハーブティー|ルイボス|ジュース|スムージー|牛乳|豆乳|ヨーグルト飲料|ラッシー|スポーツドリンク|ポカリ|アクエリ|アミノ酸|コーラ|サイダー|炭酸水|ソーダ|トニック|レモネード|甘酒|昆布水/g) || [];
        var allItems = mlabel.split(/[、,\/\s]+/).filter(function(s){ return s; });
        var isDrink = drinkWords.length > 0 && drinkWords.length >= allItems.length;

        // 既存スロットとラベル名でマッチするか
        var matched = false;
        for(var si = 0; si < foodTimes.length; si++){
          if(mlabel.indexOf(foodTimes[si].slot.key) !== -1){
            foodTimes[si].hour = mh;
            foodTimes[si].isDrink = isDrink;
            matched = true;
            break;
          }
        }
        if(!matched){
          // 時間帯から自動的にスロットを推定
          var autoSlot;
          if(mh >= 5 && mh < 10){
            autoSlot = mealSlots[0]; // 朝食
          } else if(mh >= 10 && mh < 14){
            autoSlot = mealSlots[1]; // 昼食
          } else if(mh >= 17 && mh < 22){
            autoSlot = mealSlots[2]; // 夕食
          } else {
            autoSlot = mealSlots[3]; // 間食
          }
          foodTimes.push({ hour: mh, slot: { key: mlabel, label: mlabel, defaultH: mh, duration: autoSlot.duration, color: autoSlot.color }, isDrink: isDrink });
        }
      }
    }
  }
  foodTimes.sort(function(a,b){ return a.hour - b.hour; });

  //  ファスティング計算：飲み物除外、最後の食事→翌日最初の食事が12h以上のみ表示
  var realFoods = foodTimes.filter(function(e){ return !e.isDrink; });
  var fastHours = 0;
  var showFasting = false;
  if(fasting && parseFloat(fasting) >= 12){
    fastHours = parseFloat(fasting);
    showFasting = true;
  } else if(realFoods.length >= 2){
    var lastFoodH = realFoods[realFoods.length - 1].hour;
    var firstFoodH = realFoods[0].hour;
    fastHours = Math.round(((24 - lastFoodH) + firstFoodH) * 10) / 10;
    if(fastHours >= 12) showFasting = true;
  }

  // --- SVG構築 ---
  var svg = '';
  // 背景円
  svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+emptyColor+'" stroke-width="10"/>';

  // 修復アーク（12h以上の場合のみ）
  if(showFasting && realFoods.length >= 2){
    var lastH2 = realFoods[realFoods.length - 1].hour;
    var startOff = (lastH2 / 24) * C;
    var fastLen = (fastHours / 24) * C;
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+fastColor+'" stroke-width="10" stroke-dasharray="'+fastLen+' '+(C - fastLen)+'" stroke-dashoffset="-'+startOff+'" opacity="0.25"/>';
  }

   // 食事アーク（飲み物は除外）
  for(var fi = 0; fi < foodTimes.length; fi++){
    var ft = foodTimes[fi];
    if(ft.isDrink) continue;
    var arcLen = ft.slot.duration * hourUnit;
    var offset = (ft.hour / 24) * C;
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+ft.slot.color+'" stroke-width="10" stroke-dasharray="'+arcLen+' '+(C - arcLen)+'" stroke-dashoffset="-'+offset+'" stroke-linecap="round"/>';
  }


  // 時刻マーカー（ドット）
  var markerSvg = '';
  var dotR = R + 5;
  for(var hi = 0; hi < 24; hi++){
    var angle = (hi / 24) * 360 - 90;
    var rad = angle * Math.PI / 180;
    var dx = cx + dotR * Math.cos(rad);
    var dy = cy + dotR * Math.sin(rad);
    markerSvg += '<circle cx="'+dx+'" cy="'+dy+'" r="1" fill="#d8ccc6"/>';
  }
  // 時刻ラベル（0,6,12,18）
  var labelR = R + 12;
  [0,6,12,18].forEach(function(h){
    var a2 = (h / 24) * 360 - 90;
    var r2 = a2 * Math.PI / 180;
    var lx = cx + labelR * Math.cos(r2);
    var ly = cy + labelR * Math.sin(r2);
    markerSvg += '<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="central" font-size="7" fill="#bbb">'+h+'</text>';
  });

  // HTML組み立て
  var html = '';
  html += '<div style="position:relative;width:200px;height:200px;margin:0 auto 8px;">';
  html += '<svg viewBox="-10 -10 148 148" style="width:100%;height:100%;transform:rotate(-90deg);">';
  html += svg;
  html += '</svg>';
  html += '<svg viewBox="-10 -10 148 148" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
  html += markerSvg;
  html += '</svg>';
  // 中央テキスト
  html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">';
  if(showFasting){
    html += '<div style="font-family:Shippori Mincho,serif;font-size:22px;font-weight:700;color:'+fastColor+';">'+fastHours+'<span style="font-size:12px;font-weight:400;">h</span></div>';
    html += '<div style="font-size:8px;color:var(--ink-light);letter-spacing:0.1em;margin-top:2px;">ファスティング</div>';
    var fGoalH = fastingGoal || 16;
    html += '<div style="font-size:9px;color:'+(fastHours >= fGoalH ? '#8aab96' : 'var(--ink-light)')+';margin-top:3px;">'+(fastHours >= fGoalH ? '✓ 目標達成' : '目標 '+fGoalH+'h')+'</div>';
  } else if(filledMeals.length > 0){
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;font-weight:700;color:var(--ink);">'+filledMeals.length+'<span style="font-size:13px;font-weight:400;color:var(--ink-light);">/4</span></div>';
    html += '<div style="font-size:8px;color:var(--ink-light);letter-spacing:0.12em;margin-top:2px;">meals</div>';
  } else {
    html += '<div style="font-size:10px;color:var(--ink-light);">未記録</div>';
  }
  html += '</div></div>';

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 14px;margin-top:6px;">';
  for(var j = 0; j < mealSlots.length; j++){
    var ms = mealSlots[j];
    var has = false;
    for(var k = 0; k < filledMeals.length; k++){
      if(filledMeals[k].key === ms.key){ has = true; break; }
    }
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:'+(has ? 'var(--ink)' : 'var(--ink-light)')+';">';
    html += '<span style="width:8px;height:8px;border-radius:50%;background:'+(has ? ms.color : '#e8ddd8')+';display:inline-block;"></span>';
    html += ms.label + (has ? ' ✓' : '');
    html += '</span>';
  }
  if(showFasting){
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:'+fastColor+';">';
    html += '<span style="width:8px;height:8px;border-radius:2px;background:'+fastColor+';opacity:0.4;display:inline-block;"></span>';
    html += '修復 '+fastHours+'h';
    html += '</span>';
  }
  html += '</div>';

  return html;
}

// PR-084 (Legacy Removal Batch-6): showConfirmModal/showPrivacyInfo/showAlertModal は
// src/modules/ui-notifications.js へ物理移動済み（import参照）。

// ===== ファスティング機能のオプション化 =====
// PR-085 (Legacy Removal Batch-7): toggleFastingFeature/applyFastingVisibility は
// src/modules/fasting.js へ物理移動済み（本ファイル冒頭で import back）。

// ===== 体温アラート =====
// PR-087 (Legacy Removal Batch-9): checkSuddenTempRise/checkAndShowTempAlert/
// showTempAlertBanner は src/modules/temp-alert.js へ物理移動済み（import参照）。

// ===== クイック症状ログ（後方互換のため残す） =====
var _quickPainLevel = -1;
var _quickSelectedSymptoms = [];

function initQuickLog() {
  // 疾患設定から症状チップを生成（最大6個）
  var chips = [];
  var diseases = state.myDiseases || [];
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (chips.indexOf(s) === -1 && chips.length < 6) chips.push(s);
    });
  });
  // 疾患設定がない場合のデフォルト
  if (chips.length === 0) {
    chips = ['下腹部痛', '腰痛', '頭痛', '骨盤周りの痛み', 'だるさ', '気分の落ち込み'];
  }

  var container = document.getElementById('quick-symptom-chips');
  if (!container) return;
  container.innerHTML = '';
  _quickSelectedSymptoms = [];
  chips.forEach(function(s) {
    var btn = document.createElement('button');
    btn.textContent = s;
    btn.style.cssText = 'padding:6px 13px;border-radius:20px;border:1.5px solid #e8ddd8;background:var(--white);font-size:12px;font-family:\'Noto Sans JP\',sans-serif;color:var(--ink);cursor:pointer;transition:all 0.2s;';
    btn.onclick = function() {
      var idx = _quickSelectedSymptoms.indexOf(s);
      if (idx !== -1) {
        _quickSelectedSymptoms.splice(idx, 1);
        btn.style.background = 'var(--white)';
        btn.style.borderColor = '#e8ddd8';
        btn.style.color = 'var(--ink)';
      } else {
        _quickSelectedSymptoms.push(s);
        btn.style.background = 'var(--rose-pale)';
        btn.style.borderColor = 'var(--rose)';
        btn.style.color = 'var(--plum)';
      }
    };
    container.appendChild(btn);
  });

  // 今日すでに記録済みかチェック
  var today = new Date().toISOString().slice(0, 10);
  var todayRecord = (state.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (todayRecord) {
    showQuickLogDone();
  }
}

function selectQuickPain(level, btn) {
  _quickPainLevel = level;
  document.querySelectorAll('#quick-pain-scale button').forEach(function(b) {
    b.style.background = 'var(--white)';
    b.style.borderColor = '#e8ddd8';
  });
  btn.style.background = 'var(--rose-pale)';
  btn.style.borderColor = 'var(--rose)';
}

function saveQuickLog() {
  var today = new Date().toISOString().slice(0, 10);
  // 既存の今日のレコードに追記、なければ新規作成
  var existing = (state.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (existing) {
    if (_quickSelectedSymptoms.length > 0) {
      existing.symptoms = existing.symptoms || [];
      _quickSelectedSymptoms.forEach(function(s) {
        if (existing.symptoms.indexOf(s) === -1) existing.symptoms.push(s);
      });
    }
    if (_quickPainLevel >= 0) existing.painLevel = _quickPainLevel;
    existing.updatedAt = new Date().toISOString();
  } else {
    var rec = {
      id: (typeof window.generateRecordId === 'function' ? window.generateRecordId() : Date.now().toString(36) + Math.random().toString(36).substr(2,8)),
      date: today,
      record_date: today,
      symptoms: _quickSelectedSymptoms.slice(),
      painLevel: _quickPainLevel >= 0 ? _quickPainLevel : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.records = state.records || [];
    state.records.push(rec);
  }
  saveAndSync();
  showQuickLogDone();
  _quickSelectedSymptoms = [];
  _quickPainLevel = -1;
  updateHomeSummary();
  // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
}

function showQuickLogDone() {
  var btn = document.getElementById('quick-log-btn');
  var status = document.getElementById('quick-log-status');
  if (btn) {
    btn.textContent = '✓ 今日の記録済み';
    btn.style.background = 'var(--sage)';
    btn.disabled = true;
  }
  if (status) {
    status.textContent = '記録済み';
    status.style.color = 'var(--sage)';
  }
}

// PR-080G: buildCalendar/renderCalendarMonthlySummary/changeMonth を削除（確認済みDead Code）。
// #calLabel/#calGrid/#cal-monthly-summary/#cal-screen-month-labelはapp.html/calendar.htmlに
// 存在せず、これら3関数は常に即return（no-op）していた。changeMonth()はbare呼び出し・
// window export（app-legacy.js側）のいずれも存在せず、calPrev/calNextのDOMContentLoaded
// リスナー（下記）もelement不在によりガード発火せず、到達経路ゼロを確認済み。
// calYear/calMonth変数はopenDayDetail/openDayDetailByDate（生存・上記参照）が引き続き使用するため保持。
// 詳細: docs/HANDOFF_PHASE7_COMPLETE.md PR-080G節。

document.addEventListener('DOMContentLoaded', function(){
  var prev = document.getElementById('calPrev');
  var next = document.getElementById('calNext');
  if(prev) prev.addEventListener('click', function(){ if(typeof window.changeMonth==='function') window.changeMonth(-1); });
  if(next) next.addEventListener('click', function(){ if(typeof window.changeMonth==='function') window.changeMonth(1); });
  var dmClose = document.getElementById('dmClose');
  if(dmClose) dmClose.addEventListener('click', function(){ document.getElementById('dmOverlay').classList.remove('dm-open'); });
  var dmOverlay = document.getElementById('dmOverlay');
  if(dmOverlay) dmOverlay.addEventListener('click', function(e){ if(e.target===e.currentTarget) e.currentTarget.classList.remove('dm-open'); });
  updateSymptomSettingDisplay();
  updateDiseaseSettingDisplay();
  if (typeof ICONS !== 'undefined') {
    initNavIcons();
    initSettingsIcons();
    // カレンダーナビ矢印をSVGに
    var calPrevBtn = document.getElementById('calPrev');
    var calNextBtn = document.getElementById('calNext');
    if (calPrevBtn) calPrevBtn.innerHTML = ICONS.chevronLeft(16, 'var(--ink-mid)');
    if (calNextBtn) calNextBtn.innerHTML = ICONS.chevronRight(16, 'var(--ink-mid)');
  }
  updateHomeCTA();
  updateHomeCTAState();
  updateStreakBadge();
  updateHomeSummary();
  buildHomeWeekRow();
  updateHomeInsightCard();
  updateHomeNumbers();
  updateHomeDiseaseAdvice();
  if (typeof updateDailyHintCard === 'function') updateDailyHintCard();
  if (typeof updateHomePhaseBanner === 'function') updateHomePhaseBanner();
  if (typeof updateTodayMessage === 'function') updateTodayMessage();
  applyFastingVisibility();
  if (typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();
  var fastDisplay = document.getElementById('fast-goal-display');
  if(fastDisplay) fastDisplay.textContent = (state.fastingGoal || 16) + 'h';
  loadCommunityTopic();
  var welcomeEl = document.getElementById('screen-welcome');
  if (welcomeEl && welcomeEl.style.display !== 'none') {
    if (typeof obInit === 'function') obInit();
  }
  if (typeof bindOnboardingEvents === 'function') bindOnboardingEvents();
});

function openDayDetail(d){
  var WDAY = ['日','月','火','水','木','金','土'];
  var dateObj = new Date(calYear, calMonth, d);
  var ds = dateObj.toDateString();
  var w = dateObj.getDay();
  var isoDateStr = dateObj.getFullYear()+'-'+String(dateObj.getMonth()+1).padStart(2,'0')+'-'+String(dateObj.getDate()).padStart(2,'0');
  var recs = state.records.filter(function(r){
    if(r.date) return new Date(r.date).toDateString() === ds;
    if(r.record_date) return new Date(r.record_date + 'T00:00:00').toDateString() === ds;
    return false;
  });
  document.getElementById('dmDate').textContent = calYear+'年'+(calMonth+1)+'月'+d+'日（'+WDAY[w]+'）';
  var body = document.getElementById('dmBody');
  if(recs.length === 0){
    var emptyHtml = '<div class="dm-empty">この日の記録はありません</div>';
    emptyHtml += '<div style="margin-top:16px;padding:0 4px;">';
    emptyHtml += '<button onclick="editPastRecord(\''+isoDateStr+'\')" style="width:100%;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">✏️ この日の記録を作成する</button>';
    emptyHtml += '</div>';
    body.innerHTML = emptyHtml;
    document.getElementById('dmOverlay').classList.add('dm-open');
    return;
  }
  var rec = recs[recs.length - 1];
  var html = '';
  var tags = [];
  if(rec.wellness) tags.push('体調 '+rec.wellness+'/5');
  if(rec.foodScore) tags.push('食事 '+rec.foodScore+'/10');
  if(rec.fasting) tags.push('修復 '+rec.fasting+'h');
  if(rec.emotion) tags.push(rec.emotion);
  if(rec.symptoms && rec.symptoms.length) tags.push(rec.symptoms.join('・'));
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') tags.push('生理: '+rec.menstrualCycle);
  if(tags.length){
    html += '<div class="dm-record-tags">';
    tags.forEach(function(t){ html += '<span class="dm-tag">'+t+'</span>'; });
    html += '</div>';
  }

  // ===== 食事内容テキスト =====
  if(rec.mealFree || (rec.meals && rec.meals.free)){
    var freeText = rec.mealFree || rec.meals.free;
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
    html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.9;white-space:pre-wrap;">'+escapeHtml(freeText)+'</div>';
    if(rec.mealCount || rec.firstMealTime){
      html += '<div style="display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe6;">';
      if(rec.mealCount) html += '<span style="font-size:11px;color:var(--ink-light);">🍽 '+rec.mealCount+'食</span>';
      if(rec.firstMealTime && rec.lastMealTime) html += '<span style="font-size:11px;color:var(--ink-light);">⏰ '+rec.firstMealTime+'〜'+rec.lastMealTime+'</span>';
      if(rec.fasting) html += '<span style="font-size:11px;color:var(--ink-light);">🌙 修復 '+rec.fasting+'h</span>';
      html += '</div>';
    }
    html += '</div>';
  } else if(rec.meals){
    var m = rec.meals;
    var mealRows = [];
    if(m.morning) mealRows.push({icon:'🌅', label:'朝食', text:m.morning, time:m.morningTime||''});
    if(m.lunch)   mealRows.push({icon:'☀️', label:'昼食', text:m.lunch,   time:m.lunchTime||''});
    if(m.dinner)  mealRows.push({icon:'🌙', label:'夕食', text:m.dinner,  time:m.dinnerTime||''});
    if(m.snack)   mealRows.push({icon:'🍪', label:'間食', text:m.snack,   time:m.snackTime||''});
    if(mealRows.length){
      html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
      html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
      for(var mi=0;mi<mealRows.length;mi++){
        var mr = mealRows[mi];
        html += '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:'+(mi<mealRows.length-1?'10px':'0')+';padding-bottom:'+(mi<mealRows.length-1?'10px':'0')+';border-bottom:'+(mi<mealRows.length-1?'1px solid #f0ebe6':'none')+';">';
        html += '<span style="font-size:18px;flex-shrink:0;margin-top:2px;">'+mr.icon+'</span>';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-size:12px;font-weight:500;color:var(--ink);">'+mr.label+'</span>';
        if(mr.time) html += '<span style="font-size:10px;color:var(--ink-light);">'+mr.time+'</span>';
        html += '</div>';
        html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.7;margin-top:3px;">'+escapeHtml(mr.text)+'</div>';
        html += '</div></div>';
      }
      html += '</div>';
    }
  }

  // ===== ファスティングセクション =====
  if(rec.fasting){
    var fGoal = rec.fastingGoal || 16;
    var fHours = parseFloat(rec.fasting) || 0;
    var fPct = Math.min(fHours / fGoal, 1);
    var fR = 28, fC = 2 * Math.PI * fR;
    var fOffset = fC - (fC * fPct);
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#f9edd8,#fff0f0);border-radius:14px;padding:16px;color:var(--ink);">';
    html += '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:8px;">FASTING</div>';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<div style="position:relative;width:64px;height:64px;flex-shrink:0;">';
    html += '<svg viewBox="0 0 64 64" style="width:100%;height:100%;transform:rotate(-90deg);">';
    html += '<circle cx="32" cy="32" r="'+fR+'" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    html += '<circle cx="32" cy="32" r="'+fR+'" fill="none" stroke="'+(fPct>=1?'#8aab96':'#e8c49a')+'" stroke-width="5" stroke-dasharray="'+fC+'" stroke-dashoffset="'+fOffset+'" stroke-linecap="round"/>';
    html += '</svg>';
    html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:16px;font-weight:700;color:var(--ink);">'+fHours+'</div>';
    html += '<div style="font-size:7px;color:var(--ink-light);letter-spacing:0.1em;">時間</div>';
    html += '</div></div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:15px;margin-bottom:4px;color:var(--ink);">'+fHours+'時間のファスティング</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);">目標 '+fGoal+'時間'+(fPct>=1?' ✓ 達成':'')+'</div>';
    html += '</div></div></div>';
  }

  // ===== 生理・痛み・服薬・経血詳細 =====
  var extras = [];
  if(rec.temperature) extras.push('🌡 '+rec.temperature+'℃');
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') extras.push('🌸 '+rec.menstrualCycle);
  if(rec.symptoms && rec.symptoms.length) extras.push(rec.symptoms.join('・'));
  if(rec.painLevel && rec.painLevel > 0){
    var painText = '痛み '+rec.painLevel+'/10';
    if(rec.painLocation && rec.painLocation.length) painText += '（'+rec.painLocation.join('・')+'）';
    if(rec.painType && rec.painType.length) painText += ' '+rec.painType.join('・');
    extras.push('🔴 '+painText);
  }
  if(rec.medication && rec.medication.length) extras.push('💊 '+rec.medication.join('・'));
  if(rec.bloodClot && rec.bloodClot.length) extras.push('🩸 '+rec.bloodClot.join('・'));
  if(rec.bloodColor && rec.bloodColor.length) extras.push(rec.bloodColor.join('・'));
  if(extras.length){
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">生理・症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    extras.forEach(function(e){ html += '<span style="font-size:11px;background:var(--warm-light);color:var(--ink-mid);padding:4px 10px;border-radius:12px;">'+e+'</span>'; });
    html += '</div></div>';
  }

  // ===== 疾患セルフチェック =====
  if(rec.diseaseCheck && Object.keys(rec.diseaseCheck).length){
    var dc = rec.diseaseCheck;
    var _fbDisease = (rec.diseases && rec.diseases[0]) || (state.myDiseases && state.myDiseases[0]) || '';
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">セルフチェック</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    Object.keys(dc).forEach(function(key){
      if(!dc[key] || dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey = parts.length > 1 ? parts[0] : _fbDisease;
      var qId = parts.length > 1 ? parts[1] : key;
      var qCfg = typeof DISEASE_CONFIG !== 'undefined' ? DISEASE_CONFIG[dKey] : null;
      var label = qId;
      if(qCfg && qCfg.questions){
        for(var qi=0;qi<qCfg.questions.length;qi++){
          if(qCfg.questions[qi].id === qId){ label = qCfg.questions[qi].text.replace('？',''); break; }
        }
      }
      html += '<span style="font-size:11px;background:#f3f0fd;color:#6b5b8a;padding:4px 10px;border-radius:12px;">'+label+': '+dc[key]+'</span>';
    });
    html += '</div></div>';
  }

  // ===== エネルギー・睡眠・生活ファクター・お通じ =====
  var lifeItems = [];
  if(rec.energy) lifeItems.push({label:'エネルギー', val: rec.energy+'/5 '+'●'.repeat(rec.energy)+'○'.repeat(5-rec.energy)});
  if(rec.sleepBed || rec.sleepWake){
    var sleepStr = '';
    if(rec.sleepBed) sleepStr += '就寝 '+rec.sleepBed;
    if(rec.sleepWake) sleepStr += (sleepStr?' / ':'')+'起床 '+rec.sleepWake;
    if(rec.sleepQuality) sleepStr += ' ／ 質'+rec.sleepQuality+'/5';
    lifeItems.push({label:'睡眠', val: sleepStr});
  }
  if(rec.bowel) lifeItems.push({label:'お通じ', val: rec.bowel});
  if(rec.factors && rec.factors.length) lifeItems.push({label:'生活', val: rec.factors.join('・')});
  if(lifeItems.length){
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">ライフスタイル</div>';
    lifeItems.forEach(function(item){
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f5f0eb;">';
      html += '<span style="font-size:11px;color:var(--ink-light);">'+item.label+'</span>';
      html += '<span style="font-size:12px;color:var(--ink-mid);">'+item.val+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ===== メモ（体温・ジャーナル統合） =====
  var memoItems = [];
  if(rec.temperature && extras.indexOf('🌡 '+rec.temperature+'℃') === -1) memoItems.push({icon:'🌡', text:'基礎体温 '+rec.temperature+'℃'});
  if(rec.note) memoItems.push({icon:'📝', text:rec.note});
  if(memoItems.length){
    html += '<div style="margin-top:14px;background:var(--rose-pale);border-radius:14px;padding:14px;border-left:3px solid var(--rose);">';
    html += '<div style="font-size:10px;color:var(--rose);letter-spacing:0.15em;margin-bottom:8px;">MEMO</div>';
    for(var ni=0;ni<memoItems.length;ni++){
      var item = memoItems[ni];
      if(ni > 0) html += '<div style="border-top:1px solid var(--rose-light);margin:8px 0;"></div>';
      html += '<div style="display:flex;align-items:flex-start;gap:8px;">';
      html += '<span style="font-size:14px;flex-shrink:0;">'+item.icon+'</span>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.8;">'+escapeHtml(item.text).replace(/\n/g,'<br>')+'</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ===== ウェルネス / SMIスコア =====
  if(rec.wellnessScore !== undefined){
    var ws = rec.wellnessScore;
    var wsColor = ws >= 70 ? '#6b9e78' : ws >= 40 ? '#d4a574' : '#c4878c';
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#faf6f2,#f0ebe6);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;">';
    html += '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">';
    html += '<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    var pct = ws/100, circ = 2*Math.PI*24;
    html += '<circle cx="28" cy="28" r="24" fill="none" stroke="'+wsColor+'" stroke-width="5" stroke-dasharray="'+Math.round(circ*pct)+' '+Math.round(circ*(1-pct))+'" stroke-linecap="round" transform="rotate(-90 28 28)"/>';
    html += '</svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-size:16px;font-weight:700;color:'+wsColor+';">'+ws+'</div></div>';
    html += '<div><div style="font-size:12px;font-weight:500;color:var(--ink);">ウェルネススコア</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-top:2px;">'+(ws>=70?'良好な状態です':ws>=40?'まずまずの状態です':'少し注意が必要です')+'</div></div></div>';
  }

  // ===== 編集ボタン =====
  html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0ebe6;">';
  html += '<button onclick="editPastRecord(\''+isoDateStr+'\')" style="width:100%;padding:14px;background:var(--ink);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;">';
  html += '<span style="font-size:16px;">✏️</span> この日の記録を編集する</button>';
  html += '</div>';

  body.innerHTML = html;
  document.getElementById('dmOverlay').classList.add('dm-open');
}



// PR-080E: prefillRecordFromModal / openRecordScreen は src/modules/record-screen.js へ物理移動済み（ファイル冒頭でimport）。

function selectTempMethod(method){
  document.getElementById('temp-tab-sublingual').classList.toggle('selected', method === 'sublingual');
  document.getElementById('temp-tab-axilla').classList.toggle('selected', method === 'axilla');
  window._tempMethod = method;
}

function toggleRsChip(el){
  el.classList.toggle('selected');
  // 痛み系症状が1つでも選択されていれば痛みの詳細セクションを表示
  var painSymptoms = ['頭痛','腰痛','下腹部痛','関節痛','排便痛','性交痛'];
  var hasPain = false;
  document.querySelectorAll('#rs-symptoms .chip.selected').forEach(function(c){
    if(painSymptoms.indexOf(c.textContent) !== -1) hasPain = true;
  });
  var painSection = document.getElementById('pain-detail-section');
  if(painSection){ painSection.style.display = hasPain ? 'block' : 'none'; }
  updateRecProgressDots();
}


function selectRsCycle(el, val){
  document.querySelectorAll('#rs-cycle .chip').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  var detail = document.getElementById('cycle-detail-section');
  if(detail){
    detail.style.display = (val !== 'none') ? 'block' : 'none';
  }
}
// ===== フリーメモ自動解析 =====
// PR-085 (Legacy Removal Batch-7): parseMealMemo/_updateMealParseFreetextLegacy
// （及び付随する input リスナー登録）は src/modules/meal-tracker.js へ物理移動済み
// （本ファイル冒頭で import back）。

  function insertMealTemplate(type) {
  var ta = document.getElementById('rs-meal-free');
  if (!ta) return;
  var now = new Date();
  var templates = {
    morning: { time: '0700', label: '朝食' },
    lunch:   { time: '1200', label: '昼食' },
    dinner:  { time: '1900', label: '夕食' },
    snack:   { time: '1500', label: '間食' }
  };
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var currentTime = h + m;
  var t = templates[type];
  var line = currentTime + ' ' + t.label + ' ';
  if (ta.value && !ta.value.endsWith('\n')) ta.value += '\n';
  ta.value += line;
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  if (typeof updateMealParse === 'function') updateMealParse();
  else if (typeof _updateMealParseFreetextLegacy === 'function') _updateMealParseFreetextLegacy();
}

// PR-085 (Legacy Removal Batch-7): saveMealDraft/mealSectionConfig/openMealSections/
// toggleMealSection/renderMealSections/updateMealParse は src/modules/meal-tracker.js へ
// 物理移動済み（本ファイル冒頭で import back）。

  // ===== 新規記録セクション用関数 =====
function selectEnergy(btn, val){
  document.querySelectorAll('#rs-energy .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function selectSleepQuality(btn, val){
  document.querySelectorAll('#rs-sleep-quality .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function selectBowel(btn, val){
  document.querySelectorAll('#rs-bowel .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

// ===== 気分選択（Step 1） =====
var _bowelCount = 0;
// PR-080E: openRecordScreen（record-screen.jsへ物理移動済み）が _bowelCount を
// 参照するための最小限のブリッジ。adjustBowelCount・保存時の読み取りは
// 従来どおりbare _bowelCountのまま（挙動変更なし）。
window.__ippoGetBowelCount = function () { return _bowelCount; };
window.__ippoSetBowelCount = function (v) { _bowelCount = v; };
function selectMood(btn, val){
  document.querySelectorAll('#rs-mood .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
  updateRecProgressDots();
}

// ===== プログレスドット更新 =====
function updateRecProgressDots(){
  var dot1 = document.getElementById('rec-dot-1');
  var dot2 = document.getElementById('rec-dot-2');
  var dot3 = document.getElementById('rec-dot-3');
  var dot4 = document.getElementById('rec-dot-4');
  if(!dot1) return;
  var step1Done = !!document.querySelector('#rs-mood .chip.selected');
  var painEl = document.getElementById('rs-pain-level');
  var step2Done = !!(document.querySelectorAll('#rs-symptoms .chip.selected').length > 0 || (painEl && parseInt(painEl.value) > 0));
  var step3Done = !!document.querySelector('#rs-cycle .chip.selected');
  dot1.style.background = step1Done ? 'var(--rose)' : '#e8ddd8';
  dot2.style.background = step2Done ? 'var(--rose)' : '#e8ddd8';
  dot3.style.background = step3Done ? 'var(--rose)' : '#e8ddd8';
  // STEP 4: 疾患チェック（疾患設定済みの場合のみ）
  if(dot4 && dot4.style.display !== 'none'){
    var step4Done = !!(document.querySelector('#disease-questions .chip.selected'));
    dot4.style.background = step4Done ? 'var(--rose)' : '#e8ddd8';
  }
}

// ===== 詳細セクション折りたたみ =====
function toggleRecordDetails(){
  var sec = document.getElementById('rec-details-section');
  var arrow = document.getElementById('rec-details-arrow');
  if(!sec) return;
  var isOpen = sec.style.display !== 'none';
  sec.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.textContent = isOpen ? '▾' : '▴';
  try{ localStorage.setItem('ippo_rec_details_open', isOpen ? '0' : '1'); }catch(e){}
}

// ===== 便の回数カウント =====
function adjustBowelCount(delta){
  _bowelCount = Math.max(0, (_bowelCount||0) + delta);
  var el = document.getElementById('bowel-count-display');
  if(el) el.textContent = _bowelCount;
}

// PR-087 (Legacy Removal Batch-9): addCustomFactor は
// src/modules/record-factors.js へ物理移動済み（import参照）。

function gatherDiseaseData(){
  var container = document.getElementById('disease-questions');
  if(!container) return {};
  var data = {};
  var groups = container.querySelectorAll('[data-disease-q]');
  groups.forEach(function(g){
    var selected = g.querySelector('.chip.selected');
    if(selected) data[g.getAttribute('data-disease-q')] = selected.textContent;
  });
  return data;
}
 // ===== 更年期SMI（簡略更年期指数）自動計算 =====
// PR-087 (Legacy Removal Batch-9): calcSMIScore は
// src/utils/stats-utils.js へ物理移動済み（import参照）。

  // ===== 体温フェーズ自動判定エンジン =====
// PR-082E (Legacy Removal Batch-4 分割⑤): calcTemperaturePhases/openTempReport/
// showTempEducation は src/modules/pro/temp-report.js へ物理移動済み（import参照）。

// 記録画面を開いた時に教育カードを表示
var _origOpenRecord = typeof openRecordScreen === 'function' ? openRecordScreen : null;
if(_origOpenRecord){
  var _wrappedOpenRecord = function(){
    _origOpenRecord.apply(this, arguments);
    setTimeout(showTempEducation, 100);
  };
  // openRecordScreenの呼び出し元を差し替えず、画面切り替え時にフックする
  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('[onclick*="openRecordScreen"]')){
      setTimeout(showTempEducation, 200);
    }
  });
}

// 初回ロード時にも確認
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(showTempEducation, 500);
});



// ===== ウェルネススコア自動計算 / ファクター相関計算 / 比較グラフ / フレアアップ検出 =====
// PR-082F (Legacy Removal Batch-4 分割⑥): calcWellnessScore/calcFactorCorrelations/
// setCGRange/toggleCGFactor/getMetricValue/getMetricLabel/getMetricMax/renderComparisonChart/
// openCorrelationReport/detectFlareups/openFlareupReport は src/modules/pro/flareup-report.js ・
// src/modules/pro/correlation-report.js ・ src/modules/pro/shared/pro-metric-utils.js へ物理移動済み（import参照）。

function gatherRecordData(){
  var mealFree = (document.getElementById('rs-meal-free')||{}).value||'';
  var parsed = parseMealMemo(mealFree);
  var temp = parseFloat((document.getElementById('rs-temp')||{}).value) || null;
  var note = (document.getElementById('rs-note')||{}).value||'';
  var symptoms = [];
  document.querySelectorAll('#rs-symptoms .chip.selected').forEach(function(c){ symptoms.push(c.textContent); });
  var cycle = '';
  var selCycle = document.querySelector('#rs-cycle .chip.selected');
  if(selCycle) cycle = selCycle.textContent;

  // 痛みの詳細
  var painLocation = [];
  document.querySelectorAll('#rs-pain-location .chip.selected').forEach(function(c){ painLocation.push(c.textContent); });
  var painType = [];
  document.querySelectorAll('#rs-pain-type .chip.selected').forEach(function(c){ painType.push(c.textContent); });
  var painLevel = parseInt((document.getElementById('rs-pain-level')||{}).value) || 0;

  // 服薬
  var medication = [];
  document.querySelectorAll('#rs-medication .chip.selected').forEach(function(c){ medication.push(c.textContent); });
    // エネルギーレベル
    var energy = 0;
    var selEnergy = document.querySelector('#rs-energy .chip.selected');
    if(selEnergy) energy = parseInt(selEnergy.getAttribute('data-val')) || 0;

    // 睡眠
    var sleepBed = (document.getElementById('rs-sleep-bed')||{}).value || '';
    var sleepWake = (document.getElementById('rs-sleep-wake')||{}).value || '';
    var sleepQuality = 0;
    var selSQ = document.querySelector('#rs-sleep-quality .chip.selected');
    if(selSQ) sleepQuality = parseInt(selSQ.getAttribute('data-val')) || 0;
    var sleepHours = 0;
    if(sleepBed && sleepWake){
      var b = sleepBed.split(':'), w = sleepWake.split(':');
      var bMin = parseInt(b[0])*60+parseInt(b[1]), wMin = parseInt(w[0])*60+parseInt(w[1]);
      if(wMin <= bMin) wMin += 1440;
      sleepHours = Math.round((wMin - bMin)/60*10)/10;
    }

    // 生活ファクター
    var factors = [];
    document.querySelectorAll('#rs-factors .chip.selected').forEach(function(c){ factors.push(c.textContent); });

    // お通じ
    var bowel = '';
    var selBowel = document.querySelector('#rs-bowel .chip.selected');
    if(selBowel) bowel = selBowel.textContent;

    // 気分（Step 1）
    var mood = 0;
    var selMood = document.querySelector('#rs-mood .chip.selected');
    if(selMood) mood = parseInt(selMood.getAttribute('data-val')) || 0;

    // おりもの
    var dischargeAmount = '';
    var selDA = document.querySelector('#rs-discharge-amount .chip.selected');
    if(selDA) dischargeAmount = selDA.textContent;
    var dischargeType = [];
    document.querySelectorAll('#rs-discharge-type .chip.selected').forEach(function(c){ dischargeType.push(c.textContent); });

    // 疾患セルフチェック（複数疾患対応）
    var diseaseCheck = {};
    document.querySelectorAll('[data-disease-q]').forEach(function(g){
      var sel = g.querySelector('.chip.selected');
      if(sel) diseaseCheck[g.getAttribute('data-disease-q')] = sel.textContent;
    });

    return {
      mealFree: mealFree,
      firstTime: parsed ? parsed.firstTime : '',
      lastTime: parsed ? parsed.lastTime : '',
      mealCount: parsed ? parsed.mealCount : 0,
      fastingHours: parsed ? parsed.fastingHours : 0,
      temp: temp,
      note: note,
      mood: mood,
      symptoms: symptoms,
      cycle: cycle,
      painLocation: painLocation,
      painType: painType,
      painLevel: painLevel,
      medication: medication,
      bloodClot: (function(){ var r=[]; document.querySelectorAll('#rs-blood-clot .chip.selected').forEach(function(c){ r.push(c.textContent); }); return r; })(),
      bloodColor: (function(){ var r=[]; document.querySelectorAll('#rs-blood-color .chip.selected').forEach(function(c){ r.push(c.textContent); }); return r; })(),
      dischargeAmount: dischargeAmount,
      dischargeType: dischargeType,
      bowelCount: _bowelCount || 0,
      energy: energy,
      sleepBed: sleepBed,
      sleepWake: sleepWake,
      sleepQuality: sleepQuality,
      sleepHours: sleepHours,
      factors: factors,
      bowel: bowel,
      diseaseCheck: diseaseCheck,
      diseases: state.myDiseases || [],
      tempMethod: window._tempMethod || 'sublingual'
    };
}

function draftRecordScreen(){
  var data = gatherRecordData();
  data._draftDate = new Date().toISOString();
  localStorage.setItem('ippo_draft', JSON.stringify(data));
  var di = document.getElementById('draft-indicator');
  if(di){ di.textContent='一時保存しました'; di.style.display='block'; di.style.color='var(--sage)'; setTimeout(function(){ di.style.display='none'; }, 2500); }
}

// PR-087 (Legacy Removal Batch-9): toLocalDateKey は
// src/utils/string-utils.js へ物理移動済み（import参照）。

function saveRecordScreen(){
  try {
    var data = gatherRecordData();
   var targetDate = state.editingDate ? new Date(state.editingDate) : new Date();
var todayStr = targetDate.toDateString();
    var targetDateSlice = toLocalDateKey(targetDate);
    var rec = null;
    for(var i=0; i<state.records.length; i++){
      var _r = state.records[i];
      if((_r.date && new Date(_r.date).toDateString() === todayStr) ||
         (_r.record_date && _r.record_date.slice(0, 10) === targetDateSlice)){
        rec = _r; break;
      }
    }
    var isNew = false;
    if(!rec){
      rec = { date: targetDate.toISOString(), record_date: targetDate.toISOString().slice(0, 10) };
      isNew = true;
    } else if(!rec.date) {
      rec.date = targetDate.toISOString();
      if(!rec.record_date) rec.record_date = targetDate.toISOString().slice(0, 10);
    }
    var mealFreeEl = document.getElementById('rs-meal-free');
    var mealFreeText = mealFreeEl ? mealFreeEl.value.trim() : '';
    var parsed = parseMealMemo(mealFreeText);
    rec.mealFree = mealFreeText;
    rec.meals = { free: mealFreeText };
    rec.firstMealTime = parsed ? parsed.firstTime : '';
    rec.lastMealTime = parsed ? parsed.lastTime : '';
    rec.mealCount = parsed ? parsed.mealCount : 0;
    rec.fasting = parsed ? parsed.fastingHours : 0;
    var _newDiseaseCheck = gatherDiseaseData();
    if (Object.keys(_newDiseaseCheck).length > 0) {
      rec.diseaseCheck = _newDiseaseCheck;
    }
    localStorage.removeItem('ippo_meal_draft');
    rec.temperature = data.temp;
    rec.tempMethod = data.tempMethod || 'sublingual';
    rec.symptoms = data.symptoms;
    rec.menstrualCycle = data.cycle;
    var bodyChoices = {};
    document.querySelectorAll('#rs-body-choices .chips').forEach(function(group){
      var cat = group.getAttribute('data-category');
      var selected = [];
      group.querySelectorAll('.chip.selected').forEach(function(c){
        selected.push(c.getAttribute('data-val'));
      });
      if(selected.length) bodyChoices[cat] = selected;
    });
    if (Object.keys(bodyChoices).length > 0) {
      rec.bodyChoices = bodyChoices;
    }
    if(data.note) rec.note = data.note;
    // 痛みの詳細
    rec.painLocation = data.painLocation;
    rec.painType = data.painType;
    rec.painLevel = data.painLevel;
    // 服薬
    rec.medication = data.medication;
    rec.bloodClot = data.bloodClot;
    rec.bloodColor = data.bloodColor;
    // エネルギー・睡眠・ファクター・お通じ
    rec.energy = data.energy;
    rec.sleepBed = data.sleepBed;
    rec.sleepWake = data.sleepWake;
    rec.sleepQuality = data.sleepQuality;
    rec.sleepHours = data.sleepHours;
    rec.factors = data.factors;
    rec.bowel = data.bowel;
    rec.bowelCount = data.bowelCount || 0;
    rec.mood = data.mood;
    rec.dischargeAmount = data.dischargeAmount;
    rec.dischargeType = data.dischargeType;
    rec.diseases = data.diseases;
    rec.wellnessScore = calcWellnessScore(rec);
        // 更年期SMIスコア
    var smi = calcSMIScore(rec.diseaseCheck || {});
    if(smi !== null) rec.smiScore = smi;



    // 新規の場合のみ配列に追加
    if(isNew){
      state.records.push(rec);
      state.totalDays++;
      // streak計算
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yStr = yesterday.toDateString();
      var hadYesterday = state.records.some(function(r){ return new Date(r.date).toDateString() === yStr; });
      state.streak = state.streak || 0;
      if(hadYesterday || state.streak === 0) state.streak++;
      else state.streak = 1;
    }

    // 保存を即座に実行
    try {
      if (typeof window.saveState === 'function') {
        window.saveState();
      } else if (typeof saveState === 'function') {
        saveState();
      } else {
        localStorage.setItem('ippo_state', JSON.stringify(state));
      }
    } catch(storageErr) {
      showAlertModal('記録の保存に失敗しました。端末のストレージ容量を確認してください。');
      console.error('Storage error:', storageErr);
      return;
    }

    // 保存成功を検証
    var verify = JSON.parse(localStorage.getItem('ippo_state'));
    var saved = verify.records.some(function(r){
      return (r.date && new Date(r.date).toDateString() === todayStr) ||
             (r.record_date && r.record_date.slice(0, 10) === targetDateSlice);
    });
    if(!saved){
      showAlertModal('記録の保存に失敗しました。もう一度お試しください。');
      return;
    }

    // P0-A: 保存成功後 draft を即削除し dirtyFlag をリセット
    localStorage.removeItem('ippo_record_draft');
    if (window.ippoRecordDraftGuard && typeof window.ippoRecordDraftGuard.markClean === 'function') {
      window.ippoRecordDraftGuard.markClean();
    }

    // 最近使った症状を記録（自動昇格ロジック用）
    if(data.symptoms && data.symptoms.length) saveSymptomSelection(data.symptoms);

    // UI更新（保存成功後のみ）
    updateHomeSummary();
    if (typeof updateDailyHintCard === 'function') updateDailyHintCard();
    updateHomeCTA();
    updateHomeCTAState();
    if (typeof updateTodayMessage === 'function') updateTodayMessage();
    updateStreakBadge();
    buildHomeWeekRow();
    updateHomeInsightCard();
    updateHomeNumbers();
    updateHomeDiseaseAdvice();
    checkAndShowTempAlert();
    if (typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();
    updateStats();
    // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
    if (typeof window.buildCalendarNext === 'function') window.buildCalendarNext();
    localStorage.removeItem('ippo_draft');
    var _cloudBackupFn = (typeof window.cloudBackupAll === 'function' ? window.cloudBackupAll : cloudBackupAll);
    if(typeof _cloudBackupFn === 'function'){
  _cloudBackupFn().catch(function(e){
    console.warn('クラウドバックアップ失敗、リトライ中...', e);
    setTimeout(function(){
      _cloudBackupFn().catch(function(){
        showToast('クラウド同期に失敗しました。Wi-Fiを確認してください。', 'warn');
      });
    }, 3000);
  });
}

    var so = document.getElementById('success-overlay');
    if(so){
      document.getElementById('success-emoji').textContent = '🌿';
      document.getElementById('success-title').textContent = '記録を保存しました';
      // フィードバックカード生成
      var streak = state.streak || 0;
      var feedbackHtml = '';
      // 1. 連続記録日数
      feedbackHtml += '<div style="background:#FBEAF0;border-radius:14px;padding:14px 16px;margin:12px 0 4px;text-align:left;">';
      feedbackHtml += '<div style="font-weight:500;color:#72243E;margin-bottom:4px;">今日で' + streak + '日連続記録中</div>';
      // 2. 先週との比較
      var now = new Date();
      var last7 = state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=0&&diff<7; });
      var prev7 = state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=7&&diff<14; });
      if(last7.length>0 && prev7.length>0){
        var lastPain = last7.reduce(function(s,r){ return s+(r.painLevel||0); },0)/last7.length;
        var prevPain = prev7.reduce(function(s,r){ return s+(r.painLevel||0); },0)/prev7.length;
        var diff = Math.round((prevPain - lastPain)*10)/10;
        if(diff > 0) feedbackHtml += '<div style="font-size:13px;color:#72243E;">先週より痛みの記録が'+diff.toFixed(1)+'ポイント改善の傾向です</div>';
        else if(diff < 0) feedbackHtml += '<div style="font-size:13px;color:#72243E;">記録を続けてパターンを見つけましょう</div>';
        else feedbackHtml += '<div style="font-size:13px;color:#72243E;">先週と同じペースで記録中です</div>';
      }
      // 3. フェーズメッセージ
      var phaseMsg = '';
      if(typeof getCurrentCyclePhase === 'function'){
        var ph = getCurrentCyclePhase();
        if(ph === '生理期') phaseMsg = '生理期です。無理せず、水分補給を大切に。';
        else if(ph === '卵胞期') phaseMsg = '卵胞期です。体が軽く動きやすい時期です。';
        else if(ph === '排卵期') phaseMsg = '排卵期です。体温の変化を確認しましょう。';
        else if(ph === '黄体期') phaseMsg = '黄体期です。水分補給と早めの睡眠を意識しましょう。';
        if(phaseMsg) feedbackHtml += '<div style="font-size:13px;color:#72243E;margin-top:4px;">'+phaseMsg+'</div>';
      }
      feedbackHtml += '</div>';
      document.getElementById('success-message').innerHTML = feedbackHtml;
      so.classList.add('active');
      // P0-3: 前のタイマーをクリアしてから新タイマーをセット
      if (window.__ippoSuccessOverlayTimer) {
        clearTimeout(window.__ippoSuccessOverlayTimer);
        window.__ippoSuccessOverlayTimer = null;
      }
      window.__ippoSuccessOverlayTimer = setTimeout(function() {
        var overlay = document.getElementById('success-overlay');
        if (overlay && overlay.classList.contains('active')) {
          overlay.style.transition = 'opacity 0.5s ease';
          overlay.style.opacity = '0';
          setTimeout(function() {
            overlay.classList.remove('active');
            overlay.style.opacity = '';
            overlay.style.transition = '';
            window.__ippoSuccessOverlayTimer = null;
            // P0-1: ホーム強制遷移を削除
          }, 500);
        }
      }, 2000);
    }
    if(state.editingDate){
      state.editingDate = null;
     saveAndSync();
    }
  } catch(e) {
    console.error('saveRecordScreen error:', e);
    showAlertModal('記録の保存中にエラーが発生しました。<br>もう一度お試しください。<br><br>エラー: ' + e.message);
  }
}


// ===== START =====
// Phase E (Step 5): bootstrap() は src/main.js から直接呼び出される。
// ippo:vite-ready リスナは外部コードとの互換性のため空のまま維持。
window.addEventListener('ippo:vite-ready', function() {}, { once: true });
setDailyMessage();
  


// ===== BODY SUMMARY (からだサマリー) =====
// PR-082A (Legacy Removal Batch-4 分割①): openDoctorSummary/closeDoctorSummary/
// generateDoctorSummary/downloadDoctorPDF/_generateDoctorPDF/copyDoctorSummary は
// src/modules/pro/doctor-summary/doctor-summary.js へ物理移動済み（import参照）。

document.getElementById('doctorSummaryOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeDoctorSummary();
});

  function showExportMenu(){
  var overlay = document.createElement('div');
  overlay.id = 'export-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
  
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:white;border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:400px;';
  
  sheet.innerHTML = '<div style="font-size:16px;font-weight:600;text-align:center;margin-bottom:20px;">エクスポート形式を選択</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px;">'
    + '<button onclick="exportCSV();document.getElementById(\'export-overlay\').remove();" style="padding:16px;background:#e8f4ec;border:none;border-radius:14px;font-size:14px;color:#2d6a3f;cursor:pointer;text-align:left;">'
    + '<div style="font-weight:600;">📊 CSV形式</div>'
    + '<div style="font-size:12px;margin-top:4px;color:#666;">Excel・スプレッドシートで開ける表形式。受診時の資料に最適。</div>'
    + '</button>'
    + '<button onclick="exportJSON();document.getElementById(\'export-overlay\').remove();" style="padding:16px;background:#f0ebe6;border:none;border-radius:14px;font-size:14px;color:var(--ink);cursor:pointer;text-align:left;">'
    + '<div style="font-weight:600;">💾 JSON形式</div>'
    + '<div style="font-size:12px;margin-top:4px;color:#666;">全データのバックアップ。別端末への移行や復元用。</div>'
    + '</button>'
    + '</div>'
    + '<button onclick="document.getElementById(\'export-overlay\').remove();" style="width:100%;margin-top:12px;padding:14px;background:none;border:1px solid #ddd;border-radius:14px;font-size:13px;color:#888;cursor:pointer;">キャンセル</button>';
  
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  // EL-5: 動的生成 overlay は once:true で残留リスナーを防止
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); }, { once: true });
}

// PR-084 (Legacy Removal Batch-6): exportJSON/exportCSV/csvSafe/formatDiseaseCheck は
// src/modules/data-export.js へ物理移動済み（import参照）。

  // ===== MONTHLY REPORT (月次レポート) =====
// PR-082C (Legacy Removal Batch-4 分割③): openMonthlyReport/closeMonthlyReport/
// changeReportMonth/updateMonthLabel/generateMonthlyReport/downloadReportPDF は
// src/modules/pro/monthly-report.js へ物理移動済み（import参照）。

  // ===== AI PATTERN ANALYSIS (AIパターン解析) =====
// PR-082B (Legacy Removal Batch-4 分割②): openAIAnalysis/closeAIAnalysis/
// runAIAnalysis/callAIAPI/copyAIAnalysis は
// src/modules/pro/analysis/analysis-overlay.js へ物理移動済み（import参照）。

  // ===== DEVICE SYNC (デバイス間同期) =====
// PR-083 (Legacy Removal Batch-5): openSyncModal/closeSyncModal/showLoginForm/
// toggleSyncMode/showMessage/hideMessage は src/modules/sync-modal.js へ
// 物理移動済み（import参照）。PR-089C: renderSyncUI/submitSync/syncNow/
// logoutSync/migrateDataToUserはsrc/services/supabase.jsへ物理移動済み（import参照）。

document.getElementById('syncOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeSyncModal();
});

var syncMode = 'login'; // 'login' or 'signup'  ※ TDZ回避のためvarを使用
// PR-083: toggleSyncMode（sync-modal.js側、物理移動済み）/ PR-089C: submitSync
// （services/supabase.js側、物理移動済み）がsyncMode（本ファイル残置）を読み書きする
// ための専用ブリッジ（同型パターン）。
window.__ippoGetSyncMode = function () { return syncMode; };
window.__ippoSetSyncMode = function (v) { syncMode = v; };

// ページ読み込み時に同期状態を確認
(async function checkSyncStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const brief = document.getElementById('syncStatusBrief');
    if (brief) {
      brief.textContent = session?.user?.email || '未ログイン';
    }
  } catch(e) {}
})();


// escapeHtml は line 6809 で定義済み（重複削除）




  // ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
window.openDoctorSummary = openDoctorSummary;
window.closeDoctorSummary = closeDoctorSummary;
window.copyDoctorSummary = copyDoctorSummary;
window.openMonthlyReport = openMonthlyReport;
window.closeMonthlyReport = closeMonthlyReport;
window.changeReportMonth = changeReportMonth;
window.downloadReportPDF = downloadReportPDF;
window.openAIAnalysis = openAIAnalysis;
window.closeAIAnalysis = closeAIAnalysis;
window.runAIAnalysis = runAIAnalysis;
window.copyAIAnalysis = copyAIAnalysis;
window.openSyncModal = openSyncModal;
window.closeSyncModal = closeSyncModal;
window.submitSync = submitSync;
window.toggleSyncMode = toggleSyncMode;
window.syncNow = syncNow;
window.logoutSync = logoutSync;
// ===== ADMIN PANEL =====
// PR-088 (Legacy Removal Batch-10): ADMIN_USER_ID/initAdminPanel/adminSetPremium/
// adminLoadPremiumUsers は src/modules/admin.js へ新設・物理移動済み
// （ADMIN_USER_ID は isAdminOrPremium() が本ファイル残置で参照するため import back、
// 本ファイル冒頭で import）。

// EL-2: 匿名/オフライン時の無限稼働を防ぐため最大30秒で打ち切り
// removal condition: auth 確定後に adminCheckInterval が不要になったら削除可。
var _adminCheckCount = 0;
var adminCheckInterval = setInterval(function(){
  _adminCheckCount++;
  if(supabaseUserId){
    clearInterval(adminCheckInterval);
    initAdminPanel();
    // 管理者ログイン確定後にPROバッジを即時更新
    if(typeof updatePremiumBadges === 'function') updatePremiumBadges();
  } else if (_adminCheckCount >= 30) {
    // 30秒経過してもログイン未確定 → 匿名/オフライン確定、インターバル停止
    clearInterval(adminCheckInterval);
  }
}, 1000);



  // ===== PREMIUM LOCK =====
// isPremium は premium-service.js (subscriptions テーブル) が管理する。
// ippo:premium-updated イベントを受け取り、この変数を同期する。
var isPremium = false;
// PR-086: insights-tab-panel.js（updateFoodBodyCorrelation/updateCycleSymptomCorrelation、
// 物理移動済み）が raw isPremium をbare参照するための専用ブリッジ（isAdminOrPremium()とは
// 意味が異なり管理者バイパスを含まないため、既存挙動を変えないよう別名で新設。
// PR-080E __ippoGetBowelCount と同型パターン）。
window.__ippoGetIsPremium = function () { return isPremium; };
// PR-089C: submitSync（services/supabase.js、物理移動済み）が管理者自動Premium付与時に
// isPremium（本ファイル残置 var）を更新するための専用ブリッジ（同型パターン）。
window.__ippoSetIsPremium = function (v) { isPremium = v; };

window.addEventListener('ippo:premium-updated', function (e) {
  if (e.detail && typeof e.detail.isPremium === 'boolean') {
    isPremium = e.detail.isPremium;
    if (typeof updatePremiumBadges === 'function') updatePremiumBadges();
    if (typeof checkUpsellNotification === 'function') checkUpsellNotification();
  }
});

async function checkPremiumStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      // Bridge SDK session → inline auth vars (shared localStorage keys)
      var prevInlineId = localStorage.getItem('ippo_sb_user_id');
      if (prevInlineId && prevInlineId !== session.user.id) {
        console.warn('[ippo auth] user-id mismatch: inline=' + prevInlineId + ' sdk=' + session.user.id);
        window.__ippoAuthMismatch = { inlineId: prevInlineId, sdkId: session.user.id, ts: new Date().toISOString() };
      }
      supabaseUserId = session.user.id;
      supabaseToken = session.access_token;
      localStorage.setItem('ippo_sb_user_id', session.user.id);
      _notifyAuthReady();
      // 管理者は自動的にPROアクセス付与（premium-service のイベントより優先）
      if (session.user.id === ADMIN_USER_ID) {
        isPremium = true;
      }
      // premium status は premium-service.js が ippo:premium-updated で通知する
      // ログイン状態をヘッダーに反映
      var briefEl = document.getElementById('syncStatusBrief');
      if (briefEl) briefEl.textContent = (session.user.id === ADMIN_USER_ID ? '👑 ' : '') + (session.user.email || 'ログイン済み');
    } else {
      // SDK has no session — check if inline auth left a stale token
      var staleToken = localStorage.getItem('ippo_sb_token');
      var staleId    = localStorage.getItem('ippo_sb_user_id');
      if (staleToken && staleId) {
        console.warn('[ippo auth] SDK session is null but stale inline token exists (user_id=' + staleId + '). cloudBackupAll will skip until re-login.');
        window.__ippoAuthMismatch = { inlineId: staleId, sdkId: null, ts: new Date().toISOString() };
      }
      isPremium = false;
      supabaseToken = null;
      var briefEl = document.getElementById('syncStatusBrief');
      if (briefEl) briefEl.textContent = '未ログイン';
      // Phase 2: auth-service へ skipped 通知
      if (window.ippoAuthService && typeof window.ippoAuthService.markAuthSkipped === 'function') {
        window.ippoAuthService.markAuthSkipped('no-session');
      }
    }
  } catch (e) {
    isPremium = false;
  }
  updatePremiumBadges();
  if (typeof checkUpsellNotification === 'function') checkUpsellNotification();
}

function updateSettingsHero() {
  var nameEl = document.getElementById('settings-name-display');
  if (nameEl) nameEl.textContent = state.name || 'ゲスト';

  var badgeEl = document.getElementById('settings-premium-badge-text');
  if (badgeEl) badgeEl.textContent = isAdminOrPremium() ? 'プレミアム会員 ✨' : '無料プラン';

  var upgradeBtn = document.getElementById('settings-upgrade-btn');
  if (upgradeBtn) upgradeBtn.style.display = isAdminOrPremium() ? 'none' : '';

  var countEl = document.getElementById('settings-record-count');
  if (countEl) countEl.textContent = (state.records || []).length;

  var streakEl = document.getElementById('settings-streak');
  if (streakEl) {
    var streak = 0;
    var today = new Date();
    for (var i = 0; i < 365; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().slice(0, 10);
      var found = (state.records || []).some(function(r) {
        return (r.record_date || (r.date && r.date.slice(0, 10))) === ds;
      });
      if (found) streak++;
      else if (i > 0) break;
    }
    streakEl.textContent = streak;
  }
}

function isAdminOrPremium() {
  return isPremium || (typeof ADMIN_USER_ID !== 'undefined' && supabaseUserId && supabaseUserId === ADMIN_USER_ID);
}
// PR-081: settings-display-runtime.js に同名の別実装（window.updateSettingsHero、
// initSettingsPanels()呼び出しを追加で行う）が既に存在し、load順（後着ロード）で
// window.updateSettingsHero は常にそちらに上書きされる。premium-lock.js へ移動した
// updatePremiumBadges() 内の bare 呼び出しは本ローカル実装（initSettingsPanels非呼び出し）を
// 維持する必要があるため、専用ブリッジを設ける（挙動変更なし、PR-080E
// window.__ippoGetBowelCount と同型パターン）。updateSettingsHero 自体の重複解消は
// 製品判断が必要なため本PRのScope外（PR-080C/PR-080G と同型の判断）。
window.__ippoLegacyUpdateSettingsHero = updateSettingsHero;
// PR-081: updatePremiumBadges/renderProHero/premiumGate/closePremiumLock は
// src/modules/premium/premium-lock.js へ物理移動済み（import参照）

var premiumOverlay = document.getElementById('premiumLockOverlay');
if(premiumOverlay) premiumOverlay.addEventListener('click', function(e) {
if (e.target === this) closePremiumLock();
});

// STRIPE SUBSCRIPTION は src/services/stripe.js に移設
// (window.selectPremiumPlan / window.startStripeCheckout /
//  window.checkUpsellNotification / handleStripeReturn IIFE として公開)

// supabase.js は main.js で app-legacy.js より後にロードされるため
// ippo:vite-ready 後に onAuthStateChange を登録する。
window.addEventListener('ippo:vite-ready', function() {
  if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
    supabase.auth.onAuthStateChange(function(event, session) {
      checkPremiumStatus();
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
        var _syncOverlay = document.getElementById('syncOverlay');
        var _syncModalOpen = _syncOverlay && _syncOverlay.classList.contains('active');
        if (!_syncModalOpen) {
          var _now = Date.now();
          var _last = window._lastAuthRestore || 0;
          if (_now - _last > 30000) {
            window._lastAuthRestore = _now;
            if (typeof _applyCloudRestore === 'function') _applyCloudRestore();
          }
        }
      }
      if (event === 'SIGNED_OUT') {
        var briefEl = document.getElementById('syncStatusBrief');
        if (briefEl) briefEl.textContent = '未ログイン';
      }
    });
    checkPremiumStatus();
  }
}, { once: true });

// manualCloudRestore の実装は line 1870 の enhanced merge 版を使用。
// ─── window 互換エクスポート ─────────────────────────────────
if (typeof _buildPhaseBarPreview === "function") window._buildPhaseBarPreview = _buildPhaseBarPreview;
if (typeof _generateDoctorPDF === "function") window._generateDoctorPDF = _generateDoctorPDF;
if (typeof addCustomFactor === "function") window.addCustomFactor = addCustomFactor;
if (typeof addToHome === "function") window.addToHome = addToHome;
if (typeof adjustBowelCount === "function") window.adjustBowelCount = adjustBowelCount;
if (typeof adminLoadPremiumUsers === "function") window.adminLoadPremiumUsers = adminLoadPremiumUsers;
if (typeof adminSetPremium === "function") window.adminSetPremium = adminSetPremium;
if (typeof analyzeCyclePhases === "function") window.analyzeCyclePhases = analyzeCyclePhases;
if (typeof appendSymptomDetail === "function") window.appendSymptomDetail = appendSymptomDetail;
if (typeof applyFastingVisibility === "function") window.applyFastingVisibility = applyFastingVisibility;
if (typeof applySymptomChipPriority === "function") window.applySymptomChipPriority = applySymptomChipPriority;
if (typeof buildComparisonComment === "function") window.buildComparisonComment = buildComparisonComment;
if (typeof buildDayComparison === "function") window.buildDayComparison = buildDayComparison;
if (typeof buildEffectiveLayer1 === "function") window.buildEffectiveLayer1 = buildEffectiveLayer1;
if (typeof buildPhaseBar === "function") window.buildPhaseBar = buildPhaseBar;
if (typeof buildSteps === "function") window.buildSteps = buildSteps;
if (typeof buildSymptomChips === "function") window.buildSymptomChips = buildSymptomChips;
if (typeof buildWeekComparison === "function") window.buildWeekComparison = buildWeekComparison;
if (typeof calcAvgPainThisMonth === "function") window.calcAvgPainThisMonth = calcAvgPainThisMonth;
if (typeof calcFactorCorrelations === "function") window.calcFactorCorrelations = calcFactorCorrelations;
if (typeof calcPainFreeDays === "function") window.calcPainFreeDays = calcPainFreeDays;
if (typeof calcPainFreeDaysThisMonth === "function") window.calcPainFreeDaysThisMonth = calcPainFreeDaysThisMonth;
if (typeof calcSMIScore === "function") window.calcSMIScore = calcSMIScore;
if (typeof calcTemperaturePhases === "function") window.calcTemperaturePhases = calcTemperaturePhases;
if (typeof calcWellnessScore === "function") window.calcWellnessScore = calcWellnessScore;
if (typeof cancelExperiment === "function") window.cancelExperiment = cancelExperiment;
if (typeof changeReportMonth === "function") window.changeReportMonth = changeReportMonth;
if (typeof checkAndShowTempAlert === "function") window.checkAndShowTempAlert = checkAndShowTempAlert;
if (typeof checkMyLikes === "function") window.checkMyLikes = checkMyLikes;
if (typeof checkSuddenTempRise === "function") window.checkSuddenTempRise = checkSuddenTempRise;
if (typeof clearData === "function") window.clearData = clearData;
if (typeof closeAIAnalysis === "function") window.closeAIAnalysis = closeAIAnalysis;
if (typeof closeDoctorSummary === "function") window.closeDoctorSummary = closeDoctorSummary;
if (typeof closeEditRecord === "function") window.closeEditRecord = closeEditRecord;
if (typeof closeMealTimePicker === "function") window.closeMealTimePicker = closeMealTimePicker;
if (typeof closeMonthlyReport === "function") window.closeMonthlyReport = closeMonthlyReport;
if (typeof closePremiumLock === "function") window.closePremiumLock = closePremiumLock;
if (typeof closeSuccess === "function") window.closeSuccess = closeSuccess;
if (typeof closeSymptomSettings === "function") window.closeSymptomSettings = closeSymptomSettings;
if (typeof closeSyncModal === "function") window.closeSyncModal = closeSyncModal;
if (typeof completeExperiment === "function") window.completeExperiment = completeExperiment;
if (typeof confirmMealTime === "function") window.confirmMealTime = confirmMealTime;
if (typeof copyAIAnalysis === "function") window.copyAIAnalysis = copyAIAnalysis;
if (typeof copyDoctorSummary === "function") window.copyDoctorSummary = copyDoctorSummary;
if (typeof createMealDonut === "function") window.createMealDonut = createMealDonut;
if (typeof csvSafe === "function") window.csvSafe = csvSafe;
if (typeof deleteEditRecord === "function") window.deleteEditRecord = deleteEditRecord;
if (typeof detectFlareups === "function") window.detectFlareups = detectFlareups;
if (typeof downloadDoctorPDF === "function") window.downloadDoctorPDF = downloadDoctorPDF;
if (typeof draftRecordScreen === "function") window.draftRecordScreen = draftRecordScreen;
if (typeof editPastRecord === "function") window.editPastRecord = editPastRecord;
if (typeof endFast === "function") window.endFast = endFast;
if (typeof escapeHtml === "function") window.escapeHtml = escapeHtml;
if (typeof exportCSV === "function") window.exportCSV = exportCSV;
if (typeof exportJSON === "function") window.exportJSON = exportJSON;
if (typeof formatDiseaseCheck === "function") window.formatDiseaseCheck = formatDiseaseCheck;
if (typeof gatherDiseaseData === "function") window.gatherDiseaseData = gatherDiseaseData;
if (typeof gatherRecordData === "function") window.gatherRecordData = gatherRecordData;
if (typeof generateLocalAnalysis === "function") window.generateLocalAnalysis = generateLocalAnalysis;
if (typeof getBodyCheckTitle === "function") window.getBodyCheckTitle = getBodyCheckTitle;
if (typeof getDailyHint === "function") window.getDailyHint = getDailyHint;
if (typeof getDiseaseMorningQuestion === "function") window.getDiseaseMorningQuestion = getDiseaseMorningQuestion;
if (typeof getGreetingText === "function") window.getGreetingText = getGreetingText;
if (typeof getMetricLabel === "function") window.getMetricLabel = getMetricLabel;
if (typeof getMetricMax === "function") window.getMetricMax = getMetricMax;
if (typeof getMetricValue === "function") window.getMetricValue = getMetricValue;
if (typeof getPhaseForDate === "function") window.getPhaseForDate = getPhaseForDate;
if (typeof getRecentSymptoms === "function") window.getRecentSymptoms = getRecentSymptoms;
if (typeof getSuccessMessage === "function") window.getSuccessMessage = getSuccessMessage;
if (typeof getTimeAgo === "function") window.getTimeAgo = getTimeAgo;
if (typeof handleHomeCTA === "function") window.handleHomeCTA = handleHomeCTA;
if (typeof hideMessage === "function") window.hideMessage = hideMessage;
if (typeof icon === "function") window.icon = icon;
if (typeof initAdminPanel === "function") window.initAdminPanel = initAdminPanel;
if (typeof initNavIcons === "function") window.initNavIcons = initNavIcons;
if (typeof initQuickLog === "function") window.initQuickLog = initQuickLog;
if (typeof initSettingsIcons === "function") window.initSettingsIcons = initSettingsIcons;
if (typeof isAdminOrPremium === "function") window.isAdminOrPremium = isAdminOrPremium;
if (typeof isPeriodExpected === "function") window.isPeriodExpected = isPeriodExpected;
if (typeof likeCommunityReply === "function") window.likeCommunityReply = likeCommunityReply;
if (typeof loadCVArchive === "function") window.loadCVArchive = loadCVArchive;
if (typeof loadCommunityReplies === "function") window.loadCommunityReplies = loadCommunityReplies;
if (typeof loadCommunityTopic === "function") window.loadCommunityTopic = loadCommunityTopic;
// PR-2A: manualCloudRestore は src/services/recovery.js に移植済み。window 公開は recovery.js が担う。
// if (typeof manualCloudRestore === "function") window.manualCloudRestore = manualCloudRestore;
if (typeof nextStep === "function") window.nextStep = nextStep;
if (typeof openAIAnalysis === "function") window.openAIAnalysis = openAIAnalysis;
if (typeof openCorrelationReport === "function") window.openCorrelationReport = openCorrelationReport;
if (typeof openCyclePhaseReport === "function") window.openCyclePhaseReport = openCyclePhaseReport;
if (typeof openDayDetailByDate === "function") window.openDayDetailByDate = openDayDetailByDate;
if (typeof openDoctorSummary === "function") window.openDoctorSummary = openDoctorSummary;
if (typeof openEditRecord === "function") window.openEditRecord = openEditRecord;
if (typeof openExperiments === "function") window.openExperiments = openExperiments;
if (typeof showExperimentReport === "function") window.showExperimentReport = showExperimentReport;
if (typeof openFlareupReport === "function") window.openFlareupReport = openFlareupReport;
if (typeof openIDB === "function") window.openIDB = openIDB;
if (typeof openMonthlyReport === "function") window.openMonthlyReport = openMonthlyReport;
// FIX (2026-05-28): Vite bundles record-modules (containing record-three-card.js) as a
// static import dependency of the main chunk, so record-three-card.js evaluates BEFORE
// this file and sets window.openRecordScreen = openThreeCardRecord. Unconditionally
// overwriting here would revert that override back to the legacy screen.
// Guard: only set if NOT already claimed by a newer module (record-three-card.js etc.).
if (typeof openRecordScreen === "function" && typeof window.openRecordScreen !== 'function') {
  window.openRecordScreen = openRecordScreen;
}
// Always export legacy function separately so the ➕ nav button can explicitly open
// the legacy STEP1/2/3 screen (vs home CTA which uses openRecordScreen → three-card).
if (typeof openRecordScreen === "function") window.openLegacyRecordScreen = openRecordScreen;
if (typeof openSymptomSettings === "function") window.openSymptomSettings = openSymptomSettings;
if (typeof openSyncModal === "function") window.openSyncModal = openSyncModal;
if (typeof openTempReport === "function") window.openTempReport = openTempReport;
if (typeof parseMealMemo === "function") window.parseMealMemo = parseMealMemo;
if (typeof parseMealFree === "function") window.parseMealFree = parseMealFree;
if (typeof postCommunityReply === "function") window.postCommunityReply = postCommunityReply;
if (typeof premiumGate === "function") window.premiumGate = premiumGate;
if (typeof prevStep === "function") window.prevStep = prevStep;
if (typeof renderBodyCheck === "function") window.renderBodyCheck = renderBodyCheck;
if (typeof renderComparisonChart === "function") window.renderComparisonChart = renderComparisonChart;
if (typeof renderEmotion === "function") window.renderEmotion = renderEmotion;
if (typeof renderFasting === "function") window.renderFasting = renderFasting;
if (typeof renderFood === "function") window.renderFood = renderFood;
if (typeof renderInsightDiscoveries === "function") window.renderInsightDiscoveries = renderInsightDiscoveries;
if (typeof renderMonthlySummaryText === "function") window.renderMonthlySummaryText = renderMonthlySummaryText;
if (typeof renderMealSections === "function") window.renderMealSections = renderMealSections;
if (typeof renderPhaseMap === "function") window.renderPhaseMap = renderPhaseMap;
if (typeof renderProHero === "function") window.renderProHero = renderProHero;
if (typeof renderStep === "function") window.renderStep = renderStep;
if (typeof renderSymptomDetail === "function") window.renderSymptomDetail = renderSymptomDetail;
if (typeof renderSymptomLayers === "function") window.renderSymptomLayers = renderSymptomLayers;
if (typeof renderWellness === "function") window.renderWellness = renderWellness;
if (typeof reorderRecordSections === "function") window.reorderRecordSections = reorderRecordSections;
if (typeof restoreFromHistory === "function") window.restoreFromHistory = restoreFromHistory;
if (typeof resumeFasting === "function") window.resumeFasting = resumeFasting;
if (typeof saveEditRecord === "function") window.saveEditRecord = saveEditRecord;
if (typeof saveMealDraft === "function") window.saveMealDraft = saveMealDraft;
if (typeof saveQuickLog === "function") window.saveQuickLog = saveQuickLog;
if (typeof saveRecordScreen === "function") window.saveRecordScreen = saveRecordScreen;
if (typeof saveSymptomSelection === "function") window.saveSymptomSelection = saveSymptomSelection;
if (typeof saveSymptomSettings === "function") window.saveSymptomSettings = saveSymptomSettings;
if (typeof selectBodyCheckExtra === "function") window.selectBodyCheckExtra = selectBodyCheckExtra;
if (typeof selectBodyCheckItem === "function") window.selectBodyCheckItem = selectBodyCheckItem;
if (typeof selectBowel === "function") window.selectBowel = selectBowel;
if (typeof selectBowelCount === "function") window.selectBowelCount = selectBowelCount;
if (typeof selectEditCycle === "function") window.selectEditCycle = selectEditCycle;
if (typeof selectEmotion === "function") window.selectEmotion = selectEmotion;
if (typeof selectEnergy === "function") window.selectEnergy = selectEnergy;
if (typeof selectFasting === "function") window.selectFasting = selectFasting;
if (typeof selectFood === "function") window.selectFood = selectFood;
if (typeof selectMood === "function") window.selectMood = selectMood;
if (typeof selectPhaseTab === "function") window.selectPhaseTab = selectPhaseTab;
if (typeof selectQuickPain === "function") window.selectQuickPain = selectQuickPain;
if (typeof selectRsCycle === "function") window.selectRsCycle = selectRsCycle;
if (typeof selectSleepQuality === "function") window.selectSleepQuality = selectSleepQuality;
if (typeof selectTempMethod === "function") window.selectTempMethod = selectTempMethod;
if (typeof selectWellness === "function") window.selectWellness = selectWellness;
if (typeof setCGRange === "function") window.setCGRange = setCGRange;
if (typeof setDailyMessage === "function") window.setDailyMessage = setDailyMessage;
if (typeof setFastGoal === "function") window.setFastGoal = setFastGoal;
if (typeof setGraphTab === "function") window.setGraphTab = setGraphTab;
if (typeof setRating === "function") window.setRating = setRating;
if (typeof shareApp === "function") window.shareApp = shareApp;
if (typeof showAlertModal === "function") window.showAlertModal = showAlertModal;
if (typeof showConfirmModal === "function") window.showConfirmModal = showConfirmModal;
if (typeof showLoginForm === "function") window.showLoginForm = showLoginForm;
if (typeof showMessage === "function") window.showMessage = showMessage;
if (typeof showPrivacyInfo === "function") window.showPrivacyInfo = showPrivacyInfo;
if (typeof showQuickLogDone === "function") window.showQuickLogDone = showQuickLogDone;
if (typeof showRecoveryBanner === "function") window.showRecoveryBanner = showRecoveryBanner;
if (typeof showTempAlertBanner === "function") window.showTempAlertBanner = showTempAlertBanner;
if (typeof showTempEducation === "function") window.showTempEducation = showTempEducation;
if (typeof startCustomExperiment === "function") window.startCustomExperiment = startCustomExperiment;
if (typeof startExperiment === "function") window.startExperiment = startExperiment;
if (typeof startFastTimer === "function") window.startFastTimer = startFastTimer;
if (typeof submitFeedback === "function") window.submitFeedback = submitFeedback;
if (typeof submitPremiumWaitlist === "function") window.submitPremiumWaitlist = submitPremiumWaitlist;
if (typeof switchInsTab === "function") window.switchInsTab = switchInsTab;
if (typeof switchSymptomTab === "function") window.switchSymptomTab = switchSymptomTab;
if (typeof toggleArchiveReplies === "function") window.toggleArchiveReplies = toggleArchiveReplies;
if (typeof toggleCGFactor === "function") window.toggleCGFactor = toggleCGFactor;
if (typeof toggleDetailItem === "function") window.toggleDetailItem = toggleDetailItem;
if (typeof toggleEditChip === "function") window.toggleEditChip = toggleEditChip;
if (typeof toggleFastingFeature === "function") window.toggleFastingFeature = toggleFastingFeature;
if (typeof toggleFoodItem === "function") window.toggleFoodItem = toggleFoodItem;
if (typeof toggleMealEntry === "function") window.toggleMealEntry = toggleMealEntry;
if (typeof toggleMealSection === "function") window.toggleMealSection = toggleMealSection;
if (typeof toggleRecordDetails === "function") window.toggleRecordDetails = toggleRecordDetails;
if (typeof toggleRsChip === "function") window.toggleRsChip = toggleRsChip;
if (typeof toggleSympLayer === "function") window.toggleSympLayer = toggleSympLayer;
if (typeof toggleSymptomChip === "function") window.toggleSymptomChip = toggleSymptomChip;
if (typeof toggleSyncMode === "function") window.toggleSyncMode = toggleSyncMode;
if (typeof updateDailyHintCard === "function") window.updateDailyHintCard = updateDailyHintCard;
if (typeof updateFastingWidgetPhase === "function") window.updateFastingWidgetPhase = updateFastingWidgetPhase;
if (typeof updateHomeCTA === "function") window.updateHomeCTA = updateHomeCTA;
if (typeof updateHomePhaseBanner === "function") window.updateHomePhaseBanner = updateHomePhaseBanner;
if (typeof updateHomeSummary === "function") window.updateHomeSummary = updateHomeSummary;
if (typeof updateHomeVision === "function") window.updateHomeVision = updateHomeVision;
if (typeof updateMealParse === "function") window.updateMealParse = updateMealParse;
if (typeof updateMonthLabel === "function") window.updateMonthLabel = updateMonthLabel;
if (typeof updatePremiumBadges === "function") window.updatePremiumBadges = updatePremiumBadges;
if (typeof updateRecProgressDots === "function") window.updateRecProgressDots = updateRecProgressDots;
if (typeof updateRecordSymptoms === "function") window.updateRecordSymptoms = updateRecordSymptoms;
if (typeof updateReplyLikeCount === "function") window.updateReplyLikeCount = updateReplyLikeCount;
if (typeof updateSettingsHero === "function") window.updateSettingsHero = updateSettingsHero;
if (typeof updateSliderDetail === "function") window.updateSliderDetail = updateSliderDetail;
if (typeof updateStreakBadge === "function") window.updateStreakBadge = updateStreakBadge;
if (typeof updateSymptomSettingDisplay === "function") window.updateSymptomSettingDisplay = updateSymptomSettingDisplay;
if (typeof updateTodayMessage === "function") window.updateTodayMessage = updateTodayMessage;
if (typeof updateUnlock === "function") window.updateUnlock = updateUnlock;
// ─── グローバル変数エクスポート ───────────────────────────────
// PR-079: currentRecord/currentStep/STEPS は src/modules/record-input.js へ移行済み。
// window.currentRecord への同期エクスポートは禁止（SG-4）。ライブ参照が必要な場合は
// RecordInput.getCurrentRecord() / getSteps() / getCurrentStep() を直接呼ぶこと。
if (typeof RecordInput.getCurrentRecord === "function") window.getCurrentRecord = RecordInput.getCurrentRecord;
