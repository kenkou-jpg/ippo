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
// calcWellnessScore（旧saveRecordScreen用）はPR-092Bでsrc/modules/record-screen.jsへ
// 移管したためimport削除（record-screen.js側で直接import）。
import { detectFlareups, openFlareupReport } from './modules/pro/flareup-report.js';
import { calcFactorCorrelations, setCGRange, toggleCGFactor, getMetricValue, getMetricLabel, getMetricMax, renderComparisonChart, openCorrelationReport } from './modules/pro/correlation-report.js';
// PR-083 (Legacy Removal Batch-5): Sync Modal & Auth UI は
// src/modules/sync-modal.js へ物理移動済み。
import { openSyncModal, closeSyncModal, showLoginForm, toggleSyncMode, showMessage, hideMessage } from './modules/sync-modal.js';
// PR-084 (Legacy Removal Batch-6): Symptom Settings は src/modules/symptom-settings.js へ物理移動済み。
// saveSymptomSelection（旧saveRecordScreen用）はPR-092Bでsrc/modules/record-screen.jsへ
// 移管したためimport削除（record-screen.js側で直接import）。
import { openSymptomSettings, closeSymptomSettings, saveSymptomSettings, getRecentSymptoms, updateSymptomSettingDisplay, buildSymptomChips, applySymptomChipPriority } from './modules/symptom-settings.js';
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
// PR-089F-7F: toggleFast()（本ファイル残置分）を確認済みDead Codeとして削除したため、
// toggleFast()専用だったFAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDEのimportも合わせて削除。
import { setFastGoal, endFast, startFastTimer, resumeFasting, updateFastingWidgetPhase, toggleFastingFeature, applyFastingVisibility } from './modules/fasting.js';
// PR-086 (Legacy Removal Batch-8): getPhaseForDate/isPeriodExpected/buildComparisonComment
// （+ 未文書化ヘルパー buildDayComparison/buildWeekComparison）は
// src/modules/cycle-utils.js へ新設・物理移動済み。
// PR-092A (UI/UX Final Council Home Cluster統合): 本ファイル側の最後の呼び出し元
// （buildHomeWeekRow/updateHomeCTAState）を削除したため、本importも削除
// （cycle-utils.js自身が window.buildComparisonComment 等を自己exportしているため
// 他モジュール・onclick経由の到達性に影響なし）。
// PR-086: switchInsTab/renderInsightDiscoveries/_updateInsMainCard/updateFoodBodyCorrelation/
// updateCycleSymptomCorrelation は src/modules/insights-tab-panel.js へ新設・物理移動済み
// （audit文書はinsights-dynamic-renderer.js拡充を想定していたが、実装前調査の結果同ファイルは
// 別世代の独立した動的インサイトレンダラーと判明したため専用新設ファイルへ変更）。
import { switchInsTab, renderInsightDiscoveries, _updateInsMainCard, updateFoodBodyCorrelation, updateCycleSymptomCorrelation } from './modules/insights-tab-panel.js';
// PR-086: updateTodayMessage/updateDailyHintCard は src/modules/home-renderer.js へ物理移動済み。
import { updateTodayMessage, updateDailyHintCard } from './modules/home-renderer.js';
// PR-087 (Legacy Removal Batch-9): escapeHtml/getTimeAgo/toLocalDateKey は
// src/utils/string-utils.js へ新設・物理移動済み。
// toLocalDateKey（旧saveRecordScreen用）はPR-092Bでsrc/modules/record-screen.jsへ
// 移管したためimport削除（record-screen.js側で直接import）。
import { escapeHtml, getTimeAgo } from './utils/string-utils.js';
// PR-087: calcPainFreeDaysThisMonth/calcAvgPainThisMonth/calcSMIScore は
// src/utils/stats-utils.js へ新設・物理移動済み。
// calcSMIScore（旧saveRecordScreen用）はPR-092Bでsrc/modules/record-screen.jsへ
// 移管したためimport削除（record-screen.js側で直接import）。
import { calcPainFreeDaysThisMonth, calcAvgPainThisMonth } from './utils/stats-utils.js';
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
// PR-090-P1 (Legacy Completion Recovery): closeSuccess は
// src/modules/success-overlay.js へ新設・物理移動済み。
import { closeSuccess } from './modules/success-overlay.js';
// PR-090-P2 (Legacy Completion Recovery): updateSettingsHero（本ファイルのローカル実装）は
// src/modules/legacy-settings-hero.js へ新設・物理移動済み。
import { updateSettingsHero } from './modules/legacy-settings-hero.js';
// PR-088 (Legacy Removal Batch-10): Community Voice（loadCommunityTopic/switchCVTab/
// loadCVArchive/toggleArchiveReplies/loadCommunityReplies/postCommunityReply/
// likeCommunityReply/deleteCommunityReply/updateReplyLikeCount/checkMyLikes）は
// src/modules/community.js へ新設・物理移動済み（audit未記載の未文書化ヘルパー4件を
// 含む、「1 feature = 1 owner」判断はPR-086と同型）。
import { loadCommunityTopic, switchCVTab, loadCVArchive, toggleArchiveReplies, loadCommunityReplies, postCommunityReply, likeCommunityReply, deleteCommunityReply, updateReplyLikeCount, checkMyLikes } from './modules/community.js';
// PR-088: Admin Panel（initAdminPanel/adminSetPremium/adminLoadPremiumUsers）は
// src/modules/admin.js へ新設・物理移動済み。ADMIN_USER_ID は本ファイル残置の
// admin session表示ロジック（2493/2499行目付近）が参照するため import back
// （fasting.js FAST_PHASE_CONFIGと同型パターン）。isAdminOrPremium自体はPR-089F-7Bで
// src/modules/legacy-misc-stats.js へ物理移動済み（同モジュールが別途ADMIN_USER_ID
// をadmin.jsから直接import）。
import { initAdminPanel, adminSetPremium, adminLoadPremiumUsers, ADMIN_USER_ID } from './modules/admin.js';
// PR-089B (Legacy Removal Batch-11分割①): openExperiments/startExperiment/startCustomExperiment/
// cancelExperiment/completeExperiment/showExperimentReport は src/modules/experiments.js へ物理移動済み。
import { openExperiments, startExperiment, startCustomExperiment, cancelExperiment, completeExperiment, showExperimentReport } from './modules/experiments.js';
// PR-089C (Legacy Removal Batch-11分割②): renderSyncUI/submitSync/migrateDataToUser/
// syncNow/logoutSync は src/services/supabase.js へ物理移動済み。
import { renderSyncUI, submitSync, migrateDataToUser, syncNow, logoutSync, getSupabaseUserId, setSupabaseUserId } from './services/supabase.js';
// PR-089D (Legacy Removal Batch-11分割③): updateHomePhaseBanner/buildPhaseBar/
// renderMonthlySummaryText/updateHomeSummary/updateHomeCTA/handleHomeCTA/updateStreakBadge は
// src/modules/home-renderer.js へ物理移動済み（bare呼び出し継続のためimport back。
// FAST_PHASE_CONFIGと同型idiom）。openDayDetailByDateはCalendar側calYear/calMonth・
// AMBIGUOUS判定済みopenDayDetailに依存するため対象外・本ファイル残置（PR-089E対象）。
import { updateHomePhaseBanner, buildPhaseBar, renderMonthlySummaryText, updateHomeSummary, updateHomeCTA, handleHomeCTA, updateStreakBadge } from './modules/home-renderer.js';
// PR-089F-1 (Legacy Removal Batch-11分割⑥-1): openEditRecord/closeEditRecord/toggleEditChip/
// selectEditCycle/deleteEditRecord/softDeleteRecord/gatherRecordData/gatherDiseaseData/
// draftRecordScreen は src/modules/record-edit.js へ物理移動済み（bare呼び出し継続のため
// import back）。saveEditRecordはopenDayDetailのAMBIGUOUS依存のため対象外・本ファイル残置
// （docs/PR-089E-calendar-remaining-investigation.md参照、統合はPR-089Z）。
// gatherRecordData/gatherDiseaseData（旧saveRecordScreen用）はPR-092Bで
// src/modules/record-screen.jsへ移管したためimport削除（record-screen.js側で直接import）。
import { openEditRecord, closeEditRecord, toggleEditChip, selectEditCycle, deleteEditRecord, softDeleteRecord, draftRecordScreen } from './modules/record-edit.js';
// PR-089F-2 (Legacy Removal Batch-11分割⑥-2): selectTempMethod/toggleRsChip/selectRsCycle/
// selectEnergy/selectSleepQuality/selectBowel/selectMood/updateRecProgressDots/
// toggleRecordDetails/adjustBowelCount は src/modules/record-screen-widgets.js へ
// 物理移動済み（bare呼び出し継続のためimport back）。
import { selectTempMethod, toggleRsChip, selectRsCycle, selectEnergy, selectSleepQuality, selectBowel, selectMood, updateRecProgressDots, toggleRecordDetails, adjustBowelCount } from './modules/record-screen-widgets.js';
// PR-089F-3 (Legacy Removal Batch-11分割⑥-3): buildEffectiveLayer1/renderSymptomLayers/
// toggleSympLayer/switchSymptomTab/updateRecordSymptoms は src/modules/symptom-layers.js へ
// 物理移動済み（bare呼び出し継続のためimport back）。
import { buildEffectiveLayer1, renderSymptomLayers, toggleSympLayer, switchSymptomTab, updateRecordSymptoms } from './modules/symptom-layers.js';
// PR-089F-4 (Legacy Removal Batch-11分割⑥-4): initQuickLog/selectQuickPain/saveQuickLog/
// showQuickLogDone は src/modules/quick-log.js へ物理移動済み（bare呼び出し継続のため
// import back）。
import { initQuickLog, selectQuickPain, saveQuickLog, showQuickLogDone } from './modules/quick-log.js';
// PR-089F-5 (Legacy Removal Batch-11分割⑥-5): toggleMealEntry/confirmMealTime/
// closeMealTimePicker/createMealDonut は src/modules/meal-quick-input.js へ
// 物理移動済み（bare呼び出し継続のためimport back）。
import { toggleMealEntry, confirmMealTime, closeMealTimePicker, createMealDonut } from './modules/meal-quick-input.js';
// PR-089F-6 (Legacy Removal Batch-11分割⑥-6): saveAndSync は src/modules/save-and-sync.js へ
// 物理移動済み（bare呼び出し継続のためimport back）。cloudBackupAll/cloudRestore/
// manualCloudRestoreはsrc/services配下へ移行済みのorphanと判明したため対象外・本ファイル残置
// （調査結果はPRコメント参照、削除可否はPR-089Zで一括判断）。
import { saveAndSync } from './modules/save-and-sync.js';
// PR-089F-7B (Legacy Removal Batch-11分割⑦-B): isAdminOrPremium/analyzeCyclePhases/
// _bleedingToNum/calcPainFreeDays/updateUnlock は src/modules/legacy-misc-stats.js へ
// 物理移動済み（bare呼び出し継続のためimport back）。
import { isAdminOrPremium, analyzeCyclePhases, _bleedingToNum, calcPainFreeDays, updateUnlock } from './modules/legacy-misc-stats.js';
// PR-092A (UI/UX Final Council Home Cluster統合): buildHomeWeekRow/updateHomeInsightCard/
// updateHomeNumbers/updateHomeDiseaseAdvice/updateHomeCTAState/updateStatsは
// home-renderer.js側の統合済み実装へ一本化済み（本ファイルのローカル重複実装は削除）。
import { buildHomeWeekRow, updateHomeInsightCard, updateHomeNumbers, updateHomeDiseaseAdvice, updateHomeCTAState, updateStats } from './modules/home-renderer.js';
// PR-089F-7C (Legacy Removal Batch-11分割⑦-C): calcCycleDay/getCyclePhase/
// getCurrentCyclePhaseは1行delegation shim（window.xxxへの委譲のみ）であり、実体は
// src/analytics/cycle-engine.js（window.calcCycleDay等を設定）。shimを撤去し実体を
// 直接importへ変更（挙動変更なし、PR-089F-7A監査で確認済み）。
// getCurrentCyclePhase（旧saveRecordScreen用）はPR-092Bでsrc/modules/record-screen.jsへ
// 移管したためimport削除（record-screen.js側で直接import）。
import { calcCycleDay, getCyclePhase } from './analytics/cycle-engine.js';
// PR-089F-7C: updateDiseaseQuestions/updateDiseaseSettingDisplayも同型の1行delegation shim
// であり、実体はsrc/modules/disease-settings.js（window.updateDiseaseQuestions等を設定）。
// shimを撤去し実体を直接importへ変更（挙動変更なし）。
import { updateDiseaseQuestions, updateDiseaseSettingDisplay } from './modules/disease-settings.js';

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
// PR-090-R4 (EXPORT_HUB_REFACTOR_COUNCIL 6-2): supabaseUserId var + 専用ブリッジは
// src/services/supabase.js へ物理移動済み。本ファイルはgetSupabaseUserId()/
// setSupabaseUserId()をimport backして参照する（下記import参照）。

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
    window.ippoAuthService.markAuthReady(getSupabaseUserId(), supabaseToken);
  }
  _flushCloudRestoreQueue();
}
// PR-089C: submitSync（services/supabase.js、物理移動済み）が_notifyAuthReady（本ファイル
// 残置）をbare呼び出しするための専用ブリッジ（PR-085 __ippoLegacySaveAndSyncと同型パターン）。
window.__ippoNotifyAuthReady = _notifyAuthReady;

// PR-089F-5: toggleMealEntry/confirmMealTime/closeMealTimePicker
// （+ _mealPendingType/_mealPendingBtn・meal-time-input change listener）は
// src/modules/meal-quick-input.js へ物理移動済み（import back）。

  // ===== わたしの目標 =====
var VISION_PRESETS = [
  'ファスティングを習慣にしたい',
  '自分の体のリズムを知りたい',
  'PMS/PMDDを軽くしたい',
  '体調を整えたい'
];







  

// PR-089F-7F (Legacy Removal Batch-11分割⑦-F): icon(name, size, color) を削除（確認済みDead Code）。
// 呼び出し元ゼロ（bare呼び出し・window export・HTML onclick・テストいずれも存在せず）を確認済み。
// アイコン注入は initNavIcons/initSettingsIcons が ICONS[name](size, color) を直接呼ぶため本関数は不要。

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

// PR-089F-7G (Legacy Removal Batch-11分割⑦-G): renderPainScale(v,f) を削除（確認済みDead Code）。
// window.renderPainScale へ委譲するだけの薄いshimだったが、本関数自身をbareで呼ぶ箇所が
// 同ファイル内に一切なく（window export も本ファイルには存在しない）、呼び出し元ゼロを確認済み。
// 実体は src/modules/pain-scale.js の renderPainScale が window.renderPainScale として提供し、
// record-input.js 側の _renderPainScale() がそちらを直接参照している。


// PR-090-R4 (Legacy Removal Batch-11分割, EXPORT_HUB_REFACTOR_COUNCIL 6-4):
// 症状詳細マスターデータ（旧 SYMPTOM_DETAIL_CONFIG）は本ファイル内に他の参照がない
// 純粋な静的データと確認済みのため src/constants/symptom-detail.js へ物理移動。
// window.SYMPTOM_DETAIL_CONFIGは移動前から一度も設定されておらず
// （record-input.js側は常時`{}`フォールバック、機能的に無効化済みだった）、
// 新ファイル側でもwindow bridgeを追加していないため挙動は変化しない
// （詳細はsrc/constants/symptom-detail.jsのコメント参照）。

// ===== 周期フェーズ連動分析 =====
// PR-089F-7C: calcCycleDay/getCyclePhase の1行delegation shimを撤去し、
// src/analytics/cycle-engine.js から直接importへ変更済み（本ファイル冒頭）。

// PR-089F-7B: analyzeCyclePhases は src/modules/legacy-misc-stats.js へ物理移動済み（import back）。

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

// PR-089F-7B: _bleedingToNum は src/modules/legacy-misc-stats.js へ物理移動済み（import back）。

// ===== タイムライン =====
var _tlPage = 1;
var _tlPerPage = 15;








// PR-089F-7C: updateDiseaseQuestions の1行delegation shimを撤去し、
// src/modules/disease-settings.js から直接importへ変更済み（本ファイル冒頭）。




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
// PR-092B (UI/UX Final Council採用): saveRecordScreenの物理移動先
// （src/modules/record-screen.js）から、window.cloudBackupAllが未設定の場合の
// フォールバックとして参照するためのブリッジ。既存のフォールバック挙動を保持するのみで
// Business Logic変更なし。
window.__ippoLegacyCloudBackupAll = cloudBackupAll;



function cloudRestore(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve(false);
  // auth が未完了の場合: localStorage に token があれば queue（auth 復元中）、なければ safe skip
  if (!getSupabaseUserId()) {
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

// PR-089F-6: saveAndSync は src/modules/save-and-sync.js へ物理移動済み（import back）。
// PR-085: fasting.js（endFast、物理移動済み）が saveAndSync をbare呼び出しするための
// 専用ブリッジ（window.saveAndSync は record-modal-controller.js が Phase D-1 パターンで
// 別用途に先取り済み・現状no-opのため衝突を回避、PR-084 __ippoLegacyUpdateStats と同型）。

// PR-089F-1: softDeleteRecord は src/modules/record-edit.js へ物理移動済み（import back）。

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
// PR-092B (UI/UX Final Council採用): saveRecordScreenの物理移動先
// （src/modules/record-screen.js）から、window.saveStateが未設定の場合の
// フォールバックとして参照するためのブリッジ。既存のフォールバック挙動を保持するのみで
// Business Logic変更なし。
window.__ippoLegacySaveState = saveState;

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
// PR-090-R4 (EXPORT_HUB_REFACTOR_COUNCIL 6-4): updateStats（本ファイルのローカル実装）は
// 一度 src/modules/legacy-misc-stats.js へ物理移動されたが、PR-092A (UI/UX Final Council
// Home Cluster統合) で home-renderer.js版と統合され、legacy-misc-stats.js側の実装は削除。
// 下記のbare呼び出しは home-renderer.js からimportされた統合版実体を参照する。

// PR-089F-7B: calcPainFreeDays は src/modules/legacy-misc-stats.js へ物理移動済み（import back）。

// PR-087 (Legacy Removal Batch-9): calcPainFreeDaysThisMonth/calcAvgPainThisMonth は
// src/utils/stats-utils.js へ物理移動済み（import参照）。

// PR-080B: 確定Dead Code。saveRecord()内の無条件bare呼び出し2箇所が残るため定義は維持（PR-080Eで対応）。
function updateHistory(){
  // 最近の記録セクション削除済み
}

// PR-084 (Legacy Removal Batch-6): buildSymptomChips/applySymptomChipPriority は
// src/modules/symptom-settings.js へ物理移動済み（import参照）。

// PR-089F-7B: updateUnlock は src/modules/legacy-misc-stats.js へ物理移動済み（import back）。


// ===== FASTING TIMER — CYCLE-AWARE HELPERS =====
// PR-085 (Legacy Removal Batch-7): FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDE は
// src/modules/fasting.js へ物理移動済み。PR-089F-7F: 唯一の参照元だったtoggleFast()を
// 確認済みDead Codeとして削除したため、本ファイルでのimportも削除済み。

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

// PR-089F-7C: getCurrentCyclePhase の1行delegation shimを撤去し、
// src/analytics/cycle-engine.js から直接importへ変更済み（本ファイル冒頭）。

// PR-085 (Legacy Removal Batch-7): updateFastingWidgetPhase/showRecoveryGuide(local wrapper)/
// fastInterval/window.__ippoStopFastInterval/setFastGoal は src/modules/fasting.js へ物理移動済み
// （本ファイル冒頭で import back）。

// 過食衝動サポートモーダル（研究エビデンスに基づく）

// ===== FASTING TIMER =====

// PR-089F-7F (Legacy Removal Batch-11分割⑦-F): toggleFast() を削除（確認済みDead Code）。
// 呼び出し元ゼロ（bare呼び出し・window export・HTML onclickいずれも存在せず）に加え、
// 参照先DOM要素 #fast-start-btn/#fast-stop-btn/#fast-status がapp.html/screens配下の
// どのHTMLにも存在しないことを確認済み（PR-080G buildCalendar削除時と同型の判定）。
// 現行の断食UIは #home-fasting-widget（動的レンダリング、fasting.js側）に置き換え済みで、
// toggleFastingFeature()（現存・使用中）とは別物。

// PR-085 (Legacy Removal Batch-7): endFast/resumeFasting/startFastTimer は
// src/modules/fasting.js へ物理移動済み（本ファイル冒頭で import back）。

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

// PR-089D (Legacy Removal Batch-11分割③): updateHomePhaseBanner は
// src/modules/home-renderer.js へ物理移動済み（import参照）。
// PR-092A (UI/UX Final Council Home Cluster統合): buildHomeWeekRow は
// src/modules/home-renderer.js の統合版（円形セル+痛みレベル/周期フェーズ色分け、
// 新仕様）へ一本化済み（本ファイル冒頭でimport）。

// ホーム週セルから日付詳細を開くヘルパー（ISO文字列 → calYear/calMonth を設定してから開く）
function openDayDetailByDate(isoStr) {
  var d = new Date(isoStr + 'T00:00:00');
  calYear  = d.getFullYear();
  calMonth = d.getMonth();
  openDayDetail(d.getDate());
}

// PR-086 (Legacy Removal Batch-8): getPhaseForDate は src/modules/cycle-utils.js へ
// 新設・物理移動済み（本ファイル冒頭で import back）。
// PR-089D (Legacy Removal Batch-11分割③): buildPhaseBar は
// src/modules/home-renderer.js へ物理移動済み（import参照）。

// PR-092A (UI/UX Final Council Home Cluster統合): updateHomeInsightCard/updateHomeNumbers/
// updateHomeDiseaseAdvice は src/modules/home-renderer.js の統合版へ一本化済み
// （本ファイル冒頭でimport）。

// ===== インサイト タブ切り替え (Pattern B: 5タブ) =====
// PR-086 (Legacy Removal Batch-8): switchInsTab/renderInsightDiscoveries/_updateInsMainCard は
// src/modules/insights-tab-panel.js へ新設・物理移動済み（本ファイル冒頭で import back）。

// PR-089D (Legacy Removal Batch-11分割③): renderMonthlySummaryText は
// src/modules/home-renderer.js へ物理移動済み（import参照）。

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
// PR-089D: handleHomeCTA（home-renderer.js、物理移動済み）のfallback分岐が本ファイル
// 残置のopenRecordModal（SAFE_DEAD版、record-modal-controller.jsが優先実装）を明示的に
// 呼び出すための専用ブリッジ（window.openRecordModalは既にrecord-modal-controller.js側が
// 先取り済みのため衝突回避。PR-085 __ippoLegacySaveAndSyncと同型パターン）。
window.__ippoLegacyOpenRecordModal = openRecordModal;

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

// PR-090-P1 (Legacy Completion Recovery): closeSuccess は
// src/modules/success-overlay.js へ物理移動済み（import参照）。

// ===== MISC =====
// PR-087 (Legacy Removal Batch-9): shareApp/addToHome は
// src/modules/share.js へ物理移動済み（import参照）。

// PR-089F-7G (Legacy Removal Batch-11分割⑦-G): setGraphTab(tab, el) を削除（確認済みDead Code）。
// 呼び出し元ゼロ（bare呼び出し・HTML onclickいずれも存在せず）に加え、参照先DOM要素
// （.sg-tab / #graph-overlay / .sg-title / .demo-overlay-sub）が現行のapp.html・
// src/screens配下のどのHTMLにも存在しないことを確認済み（PR-080G buildCalendar / 本PR
// toggleFast削除時と同型の「呼び出し元ゼロ + 参照先DOM要素も消滅」パターン）。

// PR-087 (Legacy Removal Batch-9): setRating は
// src/modules/feedback.js へ物理移動済み（import参照）。

// PR-084 (Legacy Removal Batch-6): 症状設定（ALL_SYMPTOMS/openSymptomSettings/
// closeSymptomSettings/saveSymptomSettings）は src/modules/symptom-settings.js
// へ物理移動済み（import参照）。

// PR-089D (Legacy Removal Batch-11分割③): updateHomeSummary は
// src/modules/home-renderer.js へ物理移動済み（import参照）。
// PR-080E: editPastRecord は src/modules/record-screen.js へ物理移動済み（ファイル冒頭でimport）。

// PR-089D (Legacy Removal Batch-11分割③): updateHomeCTA/handleHomeCTA は
// src/modules/home-renderer.js へ物理移動済み（import参照）。

// ===== ホーム CTAカード 記録前後状態更新 =====
// PR-086 (Legacy Removal Batch-8): updateTodayMessage は src/modules/home-renderer.js へ
// 物理移動済み（本ファイル冒頭で import back）。

// PR-092A (UI/UX Final Council Home Cluster統合・新仕様): updateHomeCTAState は
// src/modules/home-renderer.js の統合版（daily-checkin完了基準 + buildComparisonComment統合）
// へ一本化済み（本ファイル冒頭でimport）。

// PR-089D (Legacy Removal Batch-11分割③): updateStreakBadge は
// src/modules/home-renderer.js へ物理移動済み（import参照）。

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


// PR-089F-7C: updateDiseaseSettingDisplay の1行delegation shimを撤去し、
// src/modules/disease-settings.js から直接importへ変更済み（本ファイル冒頭）。
// PR-084 (Legacy Removal Batch-6): updateSymptomSettingDisplay は
// src/modules/symptom-settings.js へ物理移動済み（import参照）。

// PR-089F-3: SYMPTOM_CATEGORIES/_sympTabCurrent/buildEffectiveLayer1/renderSymptomLayers/
// toggleSympLayer/switchSymptomTab/updateRecordSymptoms は src/modules/symptom-layers.js へ
// 物理移動済み（import back）。

// PR-087 (Legacy Removal Batch-9): submitFeedback は
// src/modules/feedback.js へ物理移動済み（import参照）。

// PR-084 (Legacy Removal Batch-6): clearData は src/modules/data-export.js へ、
// setDailyMessage は src/modules/ui-notifications.js へ、それぞれ物理移動済み
// （import参照）。

// ===== CALENDAR =====
var calYear, calMonth;
(function(){ var now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); })();

// ===== EDIT RECORD =====
// PR-089F-1: openEditRecord/closeEditRecord/toggleEditChip/selectEditCycle は
// src/modules/record-edit.js へ物理移動済み（import back）。editingDateStrは
// openEditRecord（同ファイル・設定）とsaveEditRecord（本ファイル残置・参照）の
// 双方が使うため window.editingDateStr として共有する。

function saveEditRecord(){
  var recs = state.records.filter(function(r){ return new Date(r.date).toDateString() === window.editingDateStr; });
  var rec = recs.length ? recs[recs.length - 1] : null;

  if(!rec){
    // 新規作成
    var _editDate = new Date(window.editingDateStr);
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
  var dateObj = new Date(window.editingDateStr);
  openDayDetail(dateObj.getDate());
}

// PR-089F-1: deleteEditRecord は src/modules/record-edit.js へ物理移動済み（import back）。


// PR-089F-5: createMealDonut は src/modules/meal-quick-input.js へ物理移動済み（import back）。

// PR-084 (Legacy Removal Batch-6): showConfirmModal/showPrivacyInfo/showAlertModal は
// src/modules/ui-notifications.js へ物理移動済み（import参照）。

// ===== ファスティング機能のオプション化 =====
// PR-085 (Legacy Removal Batch-7): toggleFastingFeature/applyFastingVisibility は
// src/modules/fasting.js へ物理移動済み（本ファイル冒頭で import back）。

// ===== 体温アラート =====
// PR-087 (Legacy Removal Batch-9): checkSuddenTempRise/checkAndShowTempAlert/
// showTempAlertBanner は src/modules/temp-alert.js へ物理移動済み（import参照）。

// PR-089F-4: initQuickLog/selectQuickPain/saveQuickLog/showQuickLogDone
// （+_quickPainLevel・_quickSelectedSymptoms）は src/modules/quick-log.js へ
// 物理移動済み（import back）。

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

// PR-089F-2: selectTempMethod/toggleRsChip/selectRsCycle は
// src/modules/record-screen-widgets.js へ物理移動済み（import back）。
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

// PR-089F-2: selectEnergy/selectSleepQuality/selectBowel/selectMood/
// updateRecProgressDots/toggleRecordDetails/adjustBowelCount（+_bowelCount・
// window.__ippoGetBowelCount/__ippoSetBowelCountブリッジ）は
// src/modules/record-screen-widgets.js へ物理移動済み（import back）。

// PR-087 (Legacy Removal Batch-9): addCustomFactor は
// src/modules/record-factors.js へ物理移動済み（import参照）。

// PR-089F-1: gatherDiseaseData は src/modules/record-edit.js へ物理移動済み（import back）。
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

// PR-089F-1: gatherRecordData/draftRecordScreen は src/modules/record-edit.js へ
// 物理移動済み（import back）。

// PR-087 (Legacy Removal Batch-9): toLocalDateKey は
// src/utils/string-utils.js へ物理移動済み（import参照）。

// PR-092B (UI/UX Final Council採用): saveRecordScreen は src/modules/record-screen.js
// の統合版へ物理移動済み（Business Logic変更なし、既存保存ロジックを完全維持）。


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

// PR-090-R4 (EXPORT_HUB_REFACTOR_COUNCIL 6-4): syncMode var + 専用ブリッジは
// src/modules/sync-modal.js へ物理移動済み（getSyncMode()/setSyncMode()経由）。
// 本ファイル側はsyncModeを直接参照しないため import back不要。

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
window.submitSync = submitSync;
window.syncNow = syncNow;
window.logoutSync = logoutSync;
// ===== ADMIN PANEL =====
// PR-088 (Legacy Removal Batch-10): ADMIN_USER_ID/initAdminPanel/adminSetPremium/
// adminLoadPremiumUsers は src/modules/admin.js へ新設・物理移動済み
// （ADMIN_USER_ID は本ファイル残置のadmin session表示ロジックが参照するため
// import back、本ファイル冒頭で import）。isAdminOrPremium自体はPR-089F-7Bで
// src/modules/legacy-misc-stats.js へ物理移動済み。

// EL-2: 匿名/オフライン時の無限稼働を防ぐため最大30秒で打ち切り
// removal condition: auth 確定後に adminCheckInterval が不要になったら削除可。
var _adminCheckCount = 0;
var adminCheckInterval = setInterval(function(){
  _adminCheckCount++;
  if(getSupabaseUserId()){
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
      setSupabaseUserId(session.user.id);
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

// PR-089F-7B: isAdminOrPremium は src/modules/legacy-misc-stats.js へ物理移動済み（import back）。
// PR-090-P2 (Legacy Completion Recovery): updateSettingsHero（本ファイルのローカル実装）は
// src/modules/legacy-settings-hero.js へ物理移動済み（import参照）。
// PR-081: settings-display-runtime.js に同名の別実装（window.updateSettingsHero、
// initSettingsPanels()呼び出しを追加で行う）が既に存在し、load順（後着ロード）で
// window.updateSettingsHero は常にそちらに上書きされる。premium-lock.js へ移動した
// updatePremiumBadges() 内の bare 呼び出しは本ローカル実装（initSettingsPanels非呼び出し）を
// 維持する必要があるため、専用ブリッジを設ける（挙動変更なし、PR-080E
// window.__ippoGetBowelCount と同型パターン）。updateSettingsHero 自体の重複解消は
// 製品判断が必要なため本PRのScope外（PR-080C/PR-080G と同型の判断）。
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
if (typeof _generateDoctorPDF === "function") window._generateDoctorPDF = _generateDoctorPDF;
if (typeof appendSymptomDetail === "function") window.appendSymptomDetail = appendSymptomDetail;
if (typeof buildPhaseBar === "function") window.buildPhaseBar = buildPhaseBar;
if (typeof buildSteps === "function") window.buildSteps = buildSteps;
if (typeof cancelExperiment === "function") window.cancelExperiment = cancelExperiment;
if (typeof closeSuccess === "function") window.closeSuccess = closeSuccess;
if (typeof completeExperiment === "function") window.completeExperiment = completeExperiment;
if (typeof generateLocalAnalysis === "function") window.generateLocalAnalysis = generateLocalAnalysis;
if (typeof getBodyCheckTitle === "function") window.getBodyCheckTitle = getBodyCheckTitle;
if (typeof getDailyHint === "function") window.getDailyHint = getDailyHint;
if (typeof getDiseaseMorningQuestion === "function") window.getDiseaseMorningQuestion = getDiseaseMorningQuestion;
if (typeof getGreetingText === "function") window.getGreetingText = getGreetingText;
if (typeof handleHomeCTA === "function") window.handleHomeCTA = handleHomeCTA;
if (typeof icon === "function") window.icon = icon;
if (typeof initNavIcons === "function") window.initNavIcons = initNavIcons;
if (typeof initSettingsIcons === "function") window.initSettingsIcons = initSettingsIcons;
// PR-2A: manualCloudRestore は src/services/recovery.js に移植済み。window 公開は recovery.js が担う。
// if (typeof manualCloudRestore === "function") window.manualCloudRestore = manualCloudRestore;
if (typeof nextStep === "function") window.nextStep = nextStep;
if (typeof openDayDetailByDate === "function") window.openDayDetailByDate = openDayDetailByDate;
if (typeof openExperiments === "function") window.openExperiments = openExperiments;
if (typeof showExperimentReport === "function") window.showExperimentReport = showExperimentReport;
if (typeof openIDB === "function") window.openIDB = openIDB;
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
if (typeof parseMealFree === "function") window.parseMealFree = parseMealFree;
if (typeof prevStep === "function") window.prevStep = prevStep;
if (typeof renderBodyCheck === "function") window.renderBodyCheck = renderBodyCheck;
if (typeof renderEmotion === "function") window.renderEmotion = renderEmotion;
if (typeof renderFasting === "function") window.renderFasting = renderFasting;
if (typeof renderFood === "function") window.renderFood = renderFood;
if (typeof renderMonthlySummaryText === "function") window.renderMonthlySummaryText = renderMonthlySummaryText;
if (typeof renderStep === "function") window.renderStep = renderStep;
if (typeof renderSymptomDetail === "function") window.renderSymptomDetail = renderSymptomDetail;
if (typeof renderWellness === "function") window.renderWellness = renderWellness;
if (typeof restoreFromHistory === "function") window.restoreFromHistory = restoreFromHistory;
if (typeof saveEditRecord === "function") window.saveEditRecord = saveEditRecord;
// PR-092B: saveRecordScreenはsrc/modules/record-screen.jsが自己exportするため本行は削除。
if (typeof selectBodyCheckExtra === "function") window.selectBodyCheckExtra = selectBodyCheckExtra;
if (typeof selectBodyCheckItem === "function") window.selectBodyCheckItem = selectBodyCheckItem;
if (typeof selectBowelCount === "function") window.selectBowelCount = selectBowelCount;
if (typeof selectEmotion === "function") window.selectEmotion = selectEmotion;
if (typeof selectFasting === "function") window.selectFasting = selectFasting;
if (typeof selectFood === "function") window.selectFood = selectFood;
if (typeof selectWellness === "function") window.selectWellness = selectWellness;
if (typeof showRecoveryBanner === "function") window.showRecoveryBanner = showRecoveryBanner;
if (typeof startCustomExperiment === "function") window.startCustomExperiment = startCustomExperiment;
if (typeof startExperiment === "function") window.startExperiment = startExperiment;
if (typeof toggleDetailItem === "function") window.toggleDetailItem = toggleDetailItem;
if (typeof toggleFoodItem === "function") window.toggleFoodItem = toggleFoodItem;
if (typeof toggleSymptomChip === "function") window.toggleSymptomChip = toggleSymptomChip;
if (typeof updateDailyHintCard === "function") window.updateDailyHintCard = updateDailyHintCard;
if (typeof updateHomeCTA === "function") window.updateHomeCTA = updateHomeCTA;
if (typeof updateHomePhaseBanner === "function") window.updateHomePhaseBanner = updateHomePhaseBanner;
if (typeof updateHomeSummary === "function") window.updateHomeSummary = updateHomeSummary;
if (typeof updateHomeVision === "function") window.updateHomeVision = updateHomeVision;
if (typeof updateSettingsHero === "function") window.updateSettingsHero = updateSettingsHero;
if (typeof updateSliderDetail === "function") window.updateSliderDetail = updateSliderDetail;
if (typeof updateStreakBadge === "function") window.updateStreakBadge = updateStreakBadge;
if (typeof updateTodayMessage === "function") window.updateTodayMessage = updateTodayMessage;
// ─── グローバル変数エクスポート ───────────────────────────────
// PR-079: currentRecord/currentStep/STEPS は src/modules/record-input.js へ移行済み。
// window.currentRecord への同期エクスポートは禁止（SG-4）。ライブ参照が必要な場合は
// RecordInput.getCurrentRecord() / getSteps() / getCurrentStep() を直接呼ぶこと。
if (typeof RecordInput.getCurrentRecord === "function") window.getCurrentRecord = RecordInput.getCurrentRecord;
