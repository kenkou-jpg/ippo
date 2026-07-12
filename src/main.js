// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数・サービスを import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// ─── Boot stability ───────────────────────────────────────
import './modules/boot-stability.js';

// ─── Environment Authority (MUST be second — sets window.SUPABASE_URL / SUPABASE_KEY) ──
// app-legacy.js uses these as bare identifiers; they must be on window before any
// function that references them can be called.
import './services/environment-service.js';

// ─── Runtime Intelligence Hub (全 runtime の先頭) ──────────
import './runtime/runtime-brain.js';

// ─── Startup Render Gate (state-ready gate + deferred render queue) ──
// app-legacy より前にロードして hydration 前の render を防ぐ。
import './runtime/startup-render-gate.js';

// ─── Runtime stabilization layer (早期ロード: state 依存なし) ──
import './runtime/health-monitor.js';
import './runtime/rollback-manager.js';
import './runtime/startup-validator.js';
import './runtime/render-boundary.js';
import './runtime/error-reporter.js';
import './runtime/sentry-reporter.js';

// ─── Ownership / Render Authority / Timer Registry ───────────
// 必ず app-legacy.js より前にロード。
// ownership-registry → render-authority → timer-registry → module-lifecycle
// この順序で依存関係を満たす。
import './modules/ownership-registry.js';
import './modules/render-authority.js';
import './modules/timer-registry.js';
import './modules/module-lifecycle.js';

// ─── Priority 8: 旧 inline script 移植モジュール ─────────────
import './modules/theme.js';
import './modules/ui-notifications.js';
import './modules/reminders-ui.js';
import './modules/calendar.js';
import './modules/calendar-next.js';

// ─── Phase 2: Auth Service (app-legacy.js より前にロード必須) ──
// app-legacy.js の _notifyAuthReady() が window.ippoAuthService を呼ぶため先行ロード。
import './modules/auth/auth-service.js';

// ─── Phase 3: Editing State (record-edit-hydrate.js より前にロード) ──
import './modules/editing-state.js';

import './app-legacy.js';

// ─── Ownership Map (after app-legacy so window.* exports exist) ──
import './modules/ownership-map.js';

// ─── State ───────────────────────────────────────────────
import { saveState, loadState, STATE_KEY, INITIAL_STATE, getState, addPostSaveHook } from './store/state.js';

// ─── Runtime stabilization layer (state 確定後にロード) ────────
import './runtime/hydration-guard.js';
import './runtime/sync-consistency-checker.js';
import { install as _installStateIntegrityGuard }  from './runtime/state-integrity-guard.js';
import { install as _installSaveTransactionGuard } from './runtime/save-transaction-guard.js';
import './runtime/runtime-debug-overlay.js';

// ─── Auth / Cloud State Machine ──────────────────────────────
// Supabase 可用性待機・cloud restore ライフサイクル追跡。bootstrap() より前にロード必須。
import './runtime/auth-cloud-state-machine.js';

// ─── Runtime Decision Layer (brain observer → controller executor) ──
import { start as _startRuntimeController } from './runtime/runtime-controller.js';

// ─── Runtime Orchestrator ────────────────────────────────────
// brain + controller + guards + auth-cloud を単一 runtime system として統合。
// controller より後に宣言することで import 評価順が後になる。
import './runtime/runtime-orchestrator.js';

// ─── Production Diagnostics System ───────────────────────────
// Phase 11: production observability + cross-device verification + runtime diagnostics。
// orchestrator 確立後・bootstrap 前にロード。window.ippoDiagnostics を公開。
import './runtime/production-diagnostics.js';

// ─── Constants ───────────────────────────────────────────
import { ICONS }              from './constants/icons.js';
import { DISEASE_CONFIG }     from './constants/disease.js';
import {
  SYMPTOM_LAYERS,
  SENSITIVE_SYMPTOMS,
  DISEASE_PRIORITY_SYMPTOMS,
} from './constants/symptoms.js';

// ─── Modules ─────────────────────────────────────────────
import {
  openRecordScreen,
  saveRecord,
  resetRecordForm,
  updateDiseaseQuestions,
  renderRecordHeader,
  buildDraftFromUI,
  enableRecordTrace,
  disableRecordTrace,
} from './modules/record.js';

// readonly record repository
import {
  RECORD_STORAGE_KEYS,
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
  getRecordsSnapshot,
} from './modules/record-repository.js';

// safe record upsert utilities
import {
  isEmptyRecordValue,
  cloneRecordValue,
  findRecordIndexByDate,
  mergeRecordPreservingExisting,
  upsertRecord,
  upsertRecordInPlace,
} from './modules/record-upsert.js';

// record save orchestration helpers
import {
  createRecordSaveContext,
  prepareRecordUpsert,
  prepareRecordUpsertInPlace,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  debugRecordSavePipeline,
} from './modules/record/save.js';

// 編集保存時の既存record保護
import './modules/record-edit-merge.js';

// 編集画面 hydration 補正
import './modules/record-edit-hydrate.js';

// 編集保存 identity guard
import './modules/record-edit-save-identity-guard.js';

// welcome / main screen ownership (Phase C)
import './modules/welcome-runtime.js';

// onboarding / welcome reset guard
import './modules/welcome-reset-guard.js';

// ─── Priority 7: screen state-driven router ──────────────
import './modules/screen-router.js';

// ─── Phase D-1: UI navigation modules ────────────────────
import './modules/tab-navigation.js';

// ─── 3-Card Record Flow (after tab-navigation + record.js) ───
// Overrides window.openRecordScreen with the new 3-card experience.
import './modules/record-three-card.js';

// ─── 3-Card PHASE 2: save pipeline integration ────────────
// Installs window.rtcSaveDelegate — connects 3-card save to official pipeline.
// Must load after record-three-card.js (delegate is checked at call time, not load time).
import './modules/record-three-card-save.js';

// ─── Today Reflection (post-checkin quiet view) ───────────
// Exposes window.openTodayReflection — shown after daily check-in complete.
// Must load after record-three-card.js (screen shares showScreen infrastructure).
import './modules/today-reflection.js';

// PR-092C (UI/UX Final Council採用): record modal完全終了に伴い、
// record-modal-controller.js（openRecordModal/closeModal/saveAndSyncのno-op export、
// 実体はすべてnullで到達不可だったことを確認済み）を削除。importも削除。

// ─── Phase D-2: onboarding / settings runtime ────────────
import './modules/onboarding-runtime.js';

// settings 画面の表示更新ロジック
import './modules/settings-display-runtime.js';

// ─── Phase 5: Premium Service (app-legacy.js 後・bootstrap 前) ──
// app-legacy.js の checkPremiumStatus / premiumCheckInterval が確定した後にロード。
import { startPremiumSync } from './modules/premium/premium-service.js';

// ─── Phase E (Step 1/5): startup bootstrap ───────────────
// PR-011: routed through Bootstrap → CompositionRoot → LegacyBridge → modules/app-bootstrap
import { boot } from './bootstrap/app-bootstrap.js';

// ─── Phase E (Step 3): home renderer ─────────────────────
import './modules/home-renderer.js';

// ─── Calm Insight HOME (home-next): tab-navigation より後にロード ───
// Feature flag: localStorage['ippo_home_next'] === '1' で有効化。
// フラグ OFF の場合は既存 home に影響しない。
import './modules/home-next/home-next-shell.js';

// ─── PRO 専用 screens (1 feature = 1 screen owner) ───────────
// 各モジュールは独立した overlay を持ち、他機能の screen を流用しない。
// window.openDoctorVisitSummary / window.openConditionSummary を公開。
import { createProOverlay } from './modules/pro/shared/pro-overlay-base.js';
window.createProOverlay = createProOverlay;
// window.openProHub / window.closeProHub / window.renderProHubPage を公開。
import './modules/pro-hub/pro-hub.js';
import './modules/pro/doctor-summary/doctor-summary.js';
import './modules/pro/condition-summary/condition-summary.js';
// window.renderProSymptomTrends を公開。
import './modules/pro/symptom-trends/symptom-trends.js';
// PRO UX 改善: AI解析「今見えていること」/ 実験空状態カード
import './modules/pro/pro-ux-enhancer.js';

// ─── PR2: Analysis Module (Read Only) ────────────────────────
// 11 PRO 機能の分析ロジックを UI から分離。analyzeX() / buildX() 形式で公開。
import {
  analyzePatterns,
  analyzeFlareDays,
  analyzeCoOccurrence,
  analyzeCycle,
  analyzeTemperature,
  analyzeTemperatureLegacy,
  buildBodySummary,
  analyzeCondition,
  analyzeSymptomTrends,
  buildDoctorSummary,
  buildMonthlyReport,
  analyzeExperiments,
  analyzeBaseline,
  buildPredictionPayload,
  buildAIPrompt,
} from './modules/pro/analysis/analysis-module.js';
window.analyzePatterns          = analyzePatterns;
window.analyzeFlareDays         = analyzeFlareDays;
window.analyzeCoOccurrence      = analyzeCoOccurrence;
window.analyzeCycle             = analyzeCycle;
window.analyzeTemperature       = analyzeTemperature;
// PR-D3: Strangler shim — app-legacy.js の calcTemperaturePhases() 呼び出しサイトが参照する
window.analyzeTemperatureLegacy = analyzeTemperatureLegacy;
window.buildBodySummary     = buildBodySummary;
window.analyzeCondition     = analyzeCondition;
window.analyzeSymptomTrends = analyzeSymptomTrends;
window.buildDoctorSummary   = buildDoctorSummary;
window.buildMonthlyReport   = buildMonthlyReport;
window.analyzeExperiments   = analyzeExperiments;
window.analyzeBaseline         = analyzeBaseline;
window.buildPredictionPayload  = buildPredictionPayload;
window.buildAIPrompt           = buildAIPrompt;

// ─── Profile Cache Service (DB → State 読込: PR-E1) ──────
// rollback: 以下2行を削除するだけで全機能がバイパスされる
import { loadProfileCache } from './services/profile-cache-service.js';
window.loadProfileCache = loadProfileCache;

// ─── Services ────────────────────────────────────────────
import { supabase, cloudBackupAll, cloudRestore, initialCloudSync, syncRecordImmediately, retrySyncPending } from './services/supabase.js';
// P0-FIX-4: 記録入力中ドラフト保護 / P0-FIX-5: SW更新ガードと連携
import { checkAndShowDraftRestore } from './modules/record-draft-guard.js';

import { migrateToIDB }     from './services/storage-migration.js';
import { autoRecoveryCheck } from './services/recovery.js';
import {
  selectPremiumPlan,
  startStripeCheckout,
  checkUpsellNotification,
} from './services/stripe.js';
import {
  requestNotificationPermission,
  scheduleReminders,
} from './services/push.js';

// ─── Insight Engine (post-save hook 自動登録) ─────────────
import './services/insight-engine.js';

// ─── PHASE 4: Adaptive Signal Layer (post-save hook 自動登録) ──
// rollback: この1行を削除するだけで全機能がバイパスされる
import './services/adaptive-signals.js';

// ─── Layer B: prediction_cache post-save hook ─────────────────
// rollback: 以下ブロックを削除するだけで全機能がバイパスされる
addPostSaveHook(function _predictionCacheHook(saveErr) {
  if (saveErr) return;

  try {
    if (!window.buildPredictionPayload) return;
    if (!window.supabase) return;
    if (!window.supabaseUserId) return;

    const state = getState();

    window.buildPredictionPayload(
      state.records || [],
      state,
      {
        supabase: window.supabase,
        userId:   window.supabaseUserId,
      }
    );
  } catch (_) {}
});

// ─── Settings Profile (互換レイヤー: window.getSettingsProfile 等を公開) ──
// rollback: 以下2行を削除するだけで全機能がバイパスされる
import './services/settings-profile.js';
import './modules/settings-panel.js';

// ─── Disease Settings (PR-084A: orphaned module復旧、app-legacy.js より後にロード必須) ──
// window.openDiseaseSettings 等を自己登録するself-containedモジュール（settings-panel.jsと同型）。
// Phase 4-C (491d0fd) で app-legacy.js から抽出後、import wiring漏れにより未import状態だった。
import './modules/disease-settings.js';

// ─── Phase A: Settings Store (settings-profile の後に import) ──
// 統一設定 source of truth。trackedConditions / reminderSettings を追加管理。
// rollback: 以下2行を削除するだけで全機能がバイパスされる
import { initStore as _initSettingsStore } from './services/settings-store.js';

// ─── Phase C: Context Engine (settings-store の後・companion より前) ──
// UI トーン / 密度 / フォーカスを on-demand で計算。5min キャッシュ。
// rollback: この1行を削除するだけで全機能がバイパスされる
import './services/context-engine.js';

// ─── Phase D: Recommendation Engine (context-engine の後) ────
// rule-based 推薦・adaptive copy・insight 密度計算。
// rollback: この1行を削除するだけで全機能がバイパスされる
import './services/recommendation-engine.js';

// ─── PHASE 6: Companion Intelligence Layer ────────────────
// companion-memory → companion-intelligence の順で依存関係を満たす
// rollback: 以下2行を削除するだけで全機能がバイパスされる
import './services/companion-memory.js';
import './services/companion-intelligence.js';

// ─── PHASE 7: Recovery Journey / Life Integration Layer ──
// life-rhythm-memory → recovery-journey の順で依存関係を満たす
// rollback: 以下2行を削除するだけで全機能がバイパスされる
import './services/life-rhythm-memory.js';
import './services/recovery-journey.js';

// ─── PR-P2-06: Research Consent UI ───────────────────────
// rollback: 以下1行を削除するだけで全機能がバイパスされる
import './services/consent-service.js';

// C-5: app-legacy.js の cloud sync ガードが `typeof window.supabase` を参照するため
// supabase.js の side-effect に加えて main.js でも明示的に公開する。
// (removal condition: app-legacy.js の window.supabase 参照が全廃されたら削除可)
window.supabase = supabase;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('main-entry-start');
}

// ─── Runtime guard installation ───────────────────────────
// window.setState / window.saveState が確定した後にインストール。
_installStateIntegrityGuard();
_installSaveTransactionGuard();

// ─── Runtime Controller start (state 確定後) ──────────────
// brain = observer, controller = executor. 循環依存なし。
_startRuntimeController();

// 60秒ごとに localStorage ↔ in-memory の整合性チェックを開始
if (typeof window.ippoSyncConsistencyChecker === 'object') {
  window.ippoSyncConsistencyChecker.schedulePeriodicCheck(60000);
}

if (typeof window.ippoMarkServiceReady === 'function') {
  window.ippoMarkServiceReady('main-entry', {
    ready: true,
    hasSupabase: !!supabase,
    hasState: typeof getState() === 'object',
  });
}

if (typeof window.ippoMarkViteReady === 'function') {
  window.ippoMarkViteReady({
    hasSupabase: !!supabase,
    hasSaveRecord: typeof saveRecord === 'function',
    hasOpenRecordScreen: typeof openRecordScreen === 'function',
  });
}

// ─── Startup ownership signal ────────────────────────────
boot();

// P0-FIX-4: 起動時にドラフト復元プロンプトを確認
// bootstrap 後に実行（state hydration 完了後）
setTimeout(function() {
  try { checkAndShowDraftRestore(); } catch(e) {}
}, 2000);

// P0-FIX-3: syncPending フラグが立っているレコードを再試行
// bootstrap + cloudRestore が落ち着いた後（3秒後）に実行
setTimeout(function() {
  try { retrySyncPending(); } catch(e) {}
}, 3000);

// ─── Phase A: Settings Store 初期化 (bootstrap 直後) ──
// settings-store が source of truth。localStorage から直接 hydrate して
// state.settingsProfile へ注入する。settings-profile.js の initSettingsProfile() は不要。
_initSettingsStore();

// Phase 5: premium sync を auth-ready 待ちで開始
startPremiumSync();

window.dispatchEvent(new CustomEvent('ippo:vite-ready'));

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('vite-ready-dispatched', {
    hasSupabase: !!supabase,
    hasState: typeof getState() === 'object',
  });
}

// ─── Re-exports（将来の TypeScript 移行用） ───────────────
export {
  saveState, loadState, STATE_KEY, INITIAL_STATE, getState,
  ICONS, DISEASE_CONFIG, SYMPTOM_LAYERS, SENSITIVE_SYMPTOMS, DISEASE_PRIORITY_SYMPTOMS,
  openRecordScreen,
  saveRecord,
  resetRecordForm,
  updateDiseaseQuestions,
  renderRecordHeader,
  buildDraftFromUI,
  enableRecordTrace,
  disableRecordTrace,
  RECORD_STORAGE_KEYS,
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
  getRecordsSnapshot,
  isEmptyRecordValue,
  cloneRecordValue,
  findRecordIndexByDate,
  mergeRecordPreservingExisting,
  upsertRecord,
  upsertRecordInPlace,
  createRecordSaveContext,
  prepareRecordUpsert,
  prepareRecordUpsertInPlace,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  debugRecordSavePipeline,
  supabase,
  cloudBackupAll, cloudRestore, initialCloudSync, syncRecordImmediately, retrySyncPending,
  migrateToIDB, autoRecoveryCheck,
  selectPremiumPlan, startStripeCheckout, checkUpsellNotification,
  requestNotificationPermission, scheduleReminders,
};
