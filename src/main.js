// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数・サービスを import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// CSS は app.html の <link rel="stylesheet"> で読み込み済み。
// ここで import するとVite以外の環境(npx serve等)でモジュール全体が失敗するため除外。

// ─── Boot stability ───────────────────────────────────────
import './modules/boot-stability.js';
import './modules/legacy-window-bridge.js';
import './modules/bootstrap-shell.js';
import './modules/runtime-sequencing.js';
import './modules/persistence-boundary-prep.js';
import './modules/persistence-execution-readiness.js';
import './modules/persistence-guarded-execution.js';

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('main-entry-start');
}

// ─── State ───────────────────────────────────────────────
import { saveState, loadState, STATE_KEY, INITIAL_STATE } from './store/state.js';

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
} from './modules/record-save-pipeline.js';

// record save core facade
import './modules/record-save-core.js';

// record save core persistence delegation gate
import './modules/record-save-core-persistence.js';

// record draft normalization preview
import './modules/record-draft.js';

// record save target preview
import './modules/record-save-target.js';

// record save delegation readiness must run after all save observers
import './modules/record-save-delegation.js';

// module payload adoption candidate must run after delegation plan
import './modules/record-save-adoption.js';

// normalized save result must run after orchestration / verification
import './modules/record-save-result.js';

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

// ─── Phase D-1: UI navigation modules ────────────────────
// tab UI 切替（switchTab）を module 化。window.switchTab を上書き。
import './modules/tab-navigation.js';

// record modal open/close の所有権確立（実装委譲、Phase D-2 で完全移植）
import './modules/record-modal-controller.js';

// ─── Phase D-2: onboarding / settings runtime ────────────
// completeOnboarding / finishOnboarding を module 化。welcome-runtime 統合済み。
import './modules/onboarding-runtime.js';

// settings 画面の表示更新ロジック（updateSettingsHero / initNavIcons 等）
import './modules/settings-display-runtime.js';

// ─── Phase E (Step 1/5): startup bootstrap ───────────────
// bootstrap() を Step 5 で main.js から直接呼び出す。
import { bootstrap } from './modules/app-bootstrap.js';

// ─── Phase E (Step 3): home renderer ─────────────────────
// showMain() と依存 UI 関数群を移植。window.showMain 等を上書き。
import './modules/home-renderer.js';

// ─── Services ────────────────────────────────────────────
// supabase は stripe より先に import（stripe が supabase に依存）
// Phase E Step 4: cloudBackupAll / cloudRestore / initialCloudSync も同ファイルから export
import { supabase, SUPABASE_URL, cloudBackupAll, cloudRestore, initialCloudSync } from './services/supabase.js';

// Phase E Step 4: storage migration / recovery services
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

if (typeof window.ippoMarkServiceReady === 'function') {
  window.ippoMarkServiceReady('main-entry', {
    ready: true,
    hasSupabase: !!supabase,
    hasState: typeof window.state === 'object',
    hasBootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    hasRuntimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    hasPersistenceBoundaryPrep: typeof window.ippoPersistenceBoundaryPrepSummary === 'function',
    hasPersistenceExecutionReadiness: typeof window.ippoPersistenceExecutionReadinessSummary === 'function',
    hasPersistenceGuardedExecution: typeof window.ippoPersistenceGuardedExecutionSummary === 'function',
    hasWelcomeRuntime: typeof window.ippoWelcomeRuntimeSummary === 'function',
  });
}

if (typeof window.ippoMarkViteReady === 'function') {
  window.ippoMarkViteReady({
    hasSupabase: !!supabase,
    hasSaveRecord: typeof saveRecord === 'function',
    hasOpenRecordScreen: typeof openRecordScreen === 'function',
    hasBootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    hasRuntimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    hasPersistenceBoundaryPrep: typeof window.ippoPersistenceBoundaryPrepSummary === 'function',
    hasPersistenceExecutionReadiness: typeof window.ippoPersistenceExecutionReadinessSummary === 'function',
    hasPersistenceGuardedExecution: typeof window.ippoPersistenceGuardedExecutionSummary === 'function',
    hasWelcomeRuntime: typeof window.ippoWelcomeRuntimeSummary === 'function',
  });
}

function runDeferredCheck(name, label) {
  if (typeof window[name] !== 'function') return;
  window.setTimeout(() => {
    try {
      window[name]('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError(label + '-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

runDeferredCheck('ippoRunBootstrapShellCheck', 'bootstrap-shell-check');
runDeferredCheck('ippoRunRuntimeSequencingCheck', 'runtime-sequencing-check');
runDeferredCheck('ippoRunPersistenceBoundaryPrepCheck', 'persistence-boundary-prep-check');
runDeferredCheck('ippoRunPersistenceExecutionReadinessCheck', 'persistence-execution-readiness-check');
runDeferredCheck('ippoRunPersistenceGuardedExecutionCheck', 'persistence-guarded-execution-check');

// ─── Startup ownership signal ────────────────────────────
// Phase E (Step 5): bootstrap() を直接呼び出し、startup ownership を
// src/ 側に完全移行する。app.html の ippo:vite-ready リスナは空。
bootstrap();
window.dispatchEvent(new CustomEvent('ippo:vite-ready'));

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('vite-ready-dispatched', {
    hasSupabase: !!window.supabase,
    hasState: typeof window.state === 'object',
  });
}

// ─── Re-exports（将来の TypeScript 移行用） ───────────────
// window アサインは各ファイル内で完結
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
