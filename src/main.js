// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数・サービスを import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// ─── Boot stability ───────────────────────────────────────
import './modules/boot-stability.js';

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
import './app-legacy.js';

// ─── Ownership Map (after app-legacy so window.* exports exist) ──
import './modules/ownership-map.js';

// ─── State ───────────────────────────────────────────────
import { saveState, loadState, STATE_KEY, INITIAL_STATE } from './store/state.js';

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

// record modal open/close
import './modules/record-modal-controller.js';

// ─── Phase D-2: onboarding / settings runtime ────────────
import './modules/onboarding-runtime.js';

// settings 画面の表示更新ロジック
import './modules/settings-display-runtime.js';

// ─── Phase E (Step 1/5): startup bootstrap ───────────────
import { bootstrap } from './modules/app-bootstrap.js';

// ─── Phase E (Step 3): home renderer ─────────────────────
import './modules/home-renderer.js';

// ─── Services ────────────────────────────────────────────
import { supabase, SUPABASE_URL, cloudBackupAll, cloudRestore, initialCloudSync } from './services/supabase.js';

import { migrateToIDB }     from './services/storage-migration.js';
import { autoRecoveryCheck } from './services/recovery.js';
import {
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_ANNUAL,
  selectPremiumPlan,
  startStripeCheckout,
  checkUpsellNotification,
} from './services/stripe.js';
import {
  requestNotificationPermission,
  scheduleReminders,
} from './services/push.js';

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
    hasState: typeof window.state === 'object',
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
bootstrap();
window.dispatchEvent(new CustomEvent('ippo:vite-ready'));

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('vite-ready-dispatched', {
    hasSupabase: !!window.supabase,
    hasState: typeof window.state === 'object',
  });
}

// ─── Re-exports（将来の TypeScript 移行用） ───────────────
export {
  saveState, loadState, STATE_KEY, INITIAL_STATE,
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
  supabase, SUPABASE_URL,
  cloudBackupAll, cloudRestore, initialCloudSync,
  migrateToIDB, autoRecoveryCheck,
  STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
  selectPremiumPlan, startStripeCheckout, checkUpsellNotification,
  requestNotificationPermission, scheduleReminders,
};
