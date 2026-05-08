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
import './modules/startup-verify.js';
import './modules/bootstrap-shell.js';
import './modules/startup-boundary-adapter.js';
import './modules/runtime-sequencing.js';
import './modules/deferred-hydration-prep.js';
import './modules/render-boundary-prep.js';
import './modules/screen-activation-prep.js';
import './modules/runtime-ownership-graph.js';

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

// record save shadow outcome
import './modules/record-save-shadow.js';

// record date branch observability
import './modules/record-date-branch-observability.js';

// guarded rollout trace only
import './modules/record-date-rollout-trace.js';

// limited real adoption candidate only
import './modules/record-date-limited-adoption-candidate.js';

// guarded draft candidate preview / actual injection
import './modules/record-date-draft-candidate.js';

// record save delegation readiness must run after all save observers
import './modules/record-save-delegation.js';

// module payload adoption candidate must run after delegation plan
import './modules/record-save-adoption.js';

// post-save verification must run after module payload adoption delegation
import './modules/record-save-adoption-verify.js';

// orchestrator preview must run after all save layers
import './modules/record-save-orchestrator.js';

// normalized save result must run after orchestration / verification
import './modules/record-save-result.js';

// 編集保存時の既存record保護
import './modules/record-edit-merge.js';

// 編集画面 hydration 補正
import './modules/record-edit-hydrate.js';

// 編集保存 identity guard
import './modules/record-edit-save-identity-guard.js';

// onboarding / welcome reset guard
import './modules/welcome-reset-guard.js';

// ─── Services ────────────────────────────────────────────
// supabase は stripe より先に import（stripe が supabase に依存）
import { supabase, SUPABASE_URL } from './services/supabase.js';
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
    hasStartupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    hasRuntimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    hasDeferredHydrationPrep: typeof window.ippoDeferredHydrationPrepSummary === 'function',
    hasRenderBoundary: typeof window.ippoRenderBoundarySummary === 'function',
    hasScreenActivationPrep: typeof window.ippoScreenActivationPrepSummary === 'function',
    hasRuntimeOwnershipGraph: typeof window.ippoRuntimeOwnershipGraphSummary === 'function',
  });
}

if (typeof window.ippoMarkViteReady === 'function') {
  window.ippoMarkViteReady({
    hasSupabase: !!supabase,
    hasSaveRecord: typeof saveRecord === 'function',
    hasOpenRecordScreen: typeof openRecordScreen === 'function',
    hasBootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    hasStartupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    hasRuntimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    hasDeferredHydrationPrep: typeof window.ippoDeferredHydrationPrepSummary === 'function',
    hasRenderBoundary: typeof window.ippoRenderBoundarySummary === 'function',
    hasScreenActivationPrep: typeof window.ippoScreenActivationPrepSummary === 'function',
    hasRuntimeOwnershipGraph: typeof window.ippoRuntimeOwnershipGraphSummary === 'function',
  });
}

if (typeof window.ippoRunBootstrapShellCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunBootstrapShellCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('bootstrap-shell-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunStartupBoundaryCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunStartupBoundaryCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('startup-boundary-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunRuntimeSequencingCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunRuntimeSequencingCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('runtime-sequencing-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunDeferredHydrationPrepCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunDeferredHydrationPrepCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('deferred-hydration-prep-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunRenderBoundaryCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunRenderBoundaryCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('render-boundary-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunScreenActivationPrepCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunScreenActivationPrepCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('screen-activation-prep-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunRuntimeOwnershipGraphCheck === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunRuntimeOwnershipGraphCheck('main-entry-post-module-load');
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('runtime-ownership-graph-check-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
}

if (typeof window.ippoRunStartupVerify === 'function') {
  window.setTimeout(() => {
    try {
      window.ippoRunStartupVerify();
    } catch (error) {
      if (typeof window.ippoMarkBootError === 'function') {
        window.ippoMarkBootError('startup-verify-failed', {
          message: error && error.message ? error.message : String(error),
        });
      }
    }
  }, 0);
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
  STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL,
  selectPremiumPlan, startStripeCheckout, checkUpsellNotification,
  requestNotificationPermission, scheduleReminders,
};