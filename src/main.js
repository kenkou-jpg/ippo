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
import './modules/bootstrap-ownership-prep.js';
import './modules/runtime-sequencing.js';
import './modules/deferred-hydration-prep.js';
import './modules/render-boundary-prep.js';
import './modules/screen-activation-prep.js';
import './modules/runtime-ownership-graph.js';
import './modules/persistence-boundary-prep.js';
import './modules/persistence-execution-readiness.js';
import './modules/persistence-candidate-execution.js';
import './modules/persistence-guarded-execution.js';

// ─── Startup extraction preparation ───────────────────────
// observe-only / fallback-required
// no ownership transfer yet
import './modules/legacy-bootstrap-fallback-isolation.js';
import './modules/startup-sequencing-candidate-orchestration.js';
import './modules/startup-extraction-candidate-shell.js';

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

import {
  RECORD_STORAGE_KEYS,
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
  getRecordsSnapshot,
} from './modules/record-repository.js';

import {
  isEmptyRecordValue,
  cloneRecordValue,
  findRecordIndexByDate,
  mergeRecordPreservingExisting,
  upsertRecord,
  upsertRecordInPlace,
} from './modules/record-upsert.js';

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

import './modules/record-save-core.js';
import './modules/record-save-core-persistence.js';
import './modules/record-draft.js';
import './modules/record-save-target.js';
import './modules/record-save-shadow.js';
import './modules/record-date-branch-observability.js';
import './modules/record-date-rollout-trace.js';
import './modules/record-date-limited-adoption-candidate.js';
import './modules/record-date-draft-candidate.js';
import './modules/record-save-delegation.js';
import './modules/record-save-adoption.js';
import './modules/record-save-adoption-verify.js';
import './modules/record-save-orchestrator.js';
import './modules/record-save-result.js';
import './modules/record-edit-merge.js';
import './modules/record-edit-hydrate.js';
import './modules/record-edit-save-identity-guard.js';
import './modules/welcome-reset-guard.js';

// ─── Services ────────────────────────────────────────────
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
    hasBootstrapOwnershipPrep: typeof window.ippoBootstrapOwnershipPrepSummary === 'function',
    hasRuntimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    hasDeferredHydrationPrep: typeof window.ippoDeferredHydrationPrepSummary === 'function',
    hasRenderBoundary: typeof window.ippoRenderBoundarySummary === 'function',
    hasScreenActivationPrep: typeof window.ippoScreenActivationPrepSummary === 'function',
    hasRuntimeOwnershipGraph: typeof window.ippoRuntimeOwnershipGraphSummary === 'function',
    hasPersistenceBoundaryPrep: typeof window.ippoPersistenceBoundaryPrepSummary === 'function',
    hasPersistenceExecutionReadiness: typeof window.ippoPersistenceExecutionReadinessSummary === 'function',
    hasPersistenceCandidateExecution: typeof window.ippoPersistenceCandidateExecutionSummary === 'function',
    hasPersistenceGuardedExecution: typeof window.ippoPersistenceGuardedExecutionSummary === 'function',
    hasLegacyBootstrapFallbackIsolation: typeof window.ippoLegacyBootstrapFallbackIsolationSummary === 'function',
    hasStartupSequencingCandidate: typeof window.ippoStartupSequencingCandidateOrchestrationSummary === 'function',
    hasStartupExtractionCandidateShell: typeof window.ippoStartupExtractionCandidateShellSummary === 'function',
  });
}

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