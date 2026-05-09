// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数・サービスを import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// CSS は app.html の <link rel="stylesheet"> で読み込み済み。
// ここで import するとVite以外の環境(npx serve等)でモジュール全体が失敗するため除外。

// ─── Boot stability ───────────────────────────────────────
import './modules/boot-stability.js';
import './modules/guarded-optional-runtime-loader.js';
import './modules/legacy-window-bridge.js';
import './modules/bootstrap-shell.js';
import './modules/runtime-sequencing.js';
import './modules/persistence-boundary-prep.js';
import './modules/persistence-execution-readiness.js';
import './modules/persistence-guarded-execution.js';

// ─── Optional startup boundary observer runtimes ──────────
// Bundle 4:
// These are observe-only boundary/ownership mappers. They do not own startup,
// hydration, render, persistence, or sync execution, so they do not need to
// block first render.
const OPTIONAL_STARTUP_BOUNDARY_OBSERVER_RUNTIMES = [
  ['startup-boundary-adapter', () => import('./modules/startup-boundary-adapter.js')],
  ['bootstrap-ownership-prep', () => import('./modules/bootstrap-ownership-prep.js')],
];

// ─── Optional startup prep / verification runtimes ────────
// Bundle 5:
// These modules are observe-only / diagnostics-only preparation layers. They
// inspect hydration/render/screen readiness and startup API availability, but
// do not rewrite hydration sequencing, render timing, screen activation,
// persistence, save, or sync execution.
const OPTIONAL_STARTUP_PREP_VERIFICATION_RUNTIMES = [
  ['deferred-hydration-prep', () => import('./modules/deferred-hydration-prep.js')],
  ['render-boundary-prep', () => import('./modules/render-boundary-prep.js')],
  ['screen-activation-prep', () => import('./modules/screen-activation-prep.js')],
  ['startup-verify', () => import('./modules/startup-verify.js')],
];

// ─── Optional infrastructure observability runtimes ───────
// Bundle 3:
// Keep boundary/readiness/guarded persistence layers boot-critical, but move
// graph/candidate observability out of the initial static import chain.
const OPTIONAL_INFRASTRUCTURE_OBSERVABILITY_RUNTIMES = [
  ['runtime-ownership-graph', () => import('./modules/runtime-ownership-graph.js')],
  ['persistence-candidate-execution', () => import('./modules/persistence-candidate-execution.js')],
];

// ─── Optional startup / migration assurance runtimes ──────
// These are not required for first render. They are loaded through the guarded
// optional runtime loader so diagnostics/migration failures do not block boot.
const OPTIONAL_STARTUP_MIGRATION_RUNTIMES = [
  ['startup-guard-candidate', () => import('./modules/startup-guard-candidate.js')],
  ['main-entry-startup-observer-wiring', () => import('./modules/main-entry-startup-observer-wiring.js')],
  ['legacy-bootstrap-fallback-isolation', () => import('./modules/legacy-bootstrap-fallback-isolation.js')],
  ['startup-sequencing-candidate-orchestration', () => import('./modules/startup-sequencing-candidate-orchestration.js')],
  ['startup-extraction-candidate-shell', () => import('./modules/startup-extraction-candidate-shell.js')],
  ['startup-extraction-guarded-gate', () => import('./modules/startup-extraction-guarded-gate.js')],
  ['limited-startup-extraction-rehearsal', () => import('./modules/limited-startup-extraction-rehearsal.js')],
  ['startup-extraction-adoption-candidate-runtime', () => import('./modules/startup-extraction-adoption-candidate-runtime.js')],
  ['final-app-shell-cleanup-runtime', () => import('./modules/final-app-shell-cleanup-runtime.js')],
  ['actual-startup-inline-removal-runtime', () => import('./modules/actual-startup-inline-removal-runtime.js')],
];

// ─── Optional record observability runtimes ────────────────
// Bundle 2:
// Keep the save/edit primitives boot-critical, but move trace/shadow/candidate
// verification layers behind guarded dynamic imports.
const OPTIONAL_RECORD_OBSERVABILITY_RUNTIMES = [
  ['record-save-shadow', () => import('./modules/record-save-shadow.js')],
  ['record-date-branch-observability', () => import('./modules/record-date-branch-observability.js')],
  ['record-date-rollout-trace', () => import('./modules/record-date-rollout-trace.js')],
  ['record-date-limited-adoption-candidate', () => import('./modules/record-date-limited-adoption-candidate.js')],
  ['record-date-draft-candidate', () => import('./modules/record-date-draft-candidate.js')],
  ['record-save-adoption-verify', () => import('./modules/record-save-adoption-verify.js')],
  ['record-save-orchestrator', () => import('./modules/record-save-orchestrator.js')],
];

function scheduleOptionalRuntimes(list, baseDelayMs, stepMs, timeoutMs) {
  if (typeof window.ippoScheduleOptionalRuntime !== 'function') return;

  list.forEach(([label, importer], index) => {
    window.ippoScheduleOptionalRuntime(label, importer, {
      delayMs: baseDelayMs + index * stepMs,
      timeoutMs,
    });
  });
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('main-entry-start');
}

window.setTimeout(() => {
  scheduleOptionalRuntimes(OPTIONAL_STARTUP_BOUNDARY_OBSERVER_RUNTIMES, 350, 150, 2500);
  scheduleOptionalRuntimes(OPTIONAL_STARTUP_PREP_VERIFICATION_RUNTIMES, 750, 150, 2500);
  scheduleOptionalRuntimes(OPTIONAL_INFRASTRUCTURE_OBSERVABILITY_RUNTIMES, 1400, 150, 2500);
  scheduleOptionalRuntimes(OPTIONAL_STARTUP_MIGRATION_RUNTIMES, 1700, 150, 2500);
  scheduleOptionalRuntimes(OPTIONAL_RECORD_OBSERVABILITY_RUNTIMES, 2200, 150, 2500);
}, 600);

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
    hasStartupGuardCandidate: typeof window.ippoStartupGuardCandidateSummary === 'function',
    hasMainEntryStartupObserverWiring: typeof window.ippoMainEntryStartupObserverWiringSummary === 'function',
    hasLegacyBootstrapFallbackIsolation: typeof window.ippoLegacyBootstrapFallbackIsolationSummary === 'function',
    hasStartupSequencingCandidate: typeof window.ippoStartupSequencingCandidateOrchestrationSummary === 'function',
    hasStartupExtractionCandidateShell: typeof window.ippoStartupExtractionCandidateShellSummary === 'function',
    hasStartupExtractionGuardedGate: typeof window.ippoStartupExtractionGuardedGateSummary === 'function',
    hasLimitedStartupExtractionRehearsal: typeof window.ippoLimitedStartupExtractionRehearsalSummary === 'function',
    hasStartupExtractionAdoptionCandidate: typeof window.ippoStartupExtractionAdoptionCandidateRuntimeSummary === 'function',
    hasFinalAppShellCleanup: typeof window.ippoFinalAppShellCleanupRuntimeSummary === 'function',
    hasActualStartupInlineRemoval: typeof window.ippoActualStartupInlineRemovalRuntimeSummary === 'function',
    hasRecordSaveShadow: typeof window.ippoRecordSaveShadowSummary === 'function',
    hasRecordDateBranchObservability: typeof window.ippoRecordDateBranchObservabilitySummary === 'function',
    hasRecordDateRolloutTrace: typeof window.ippoRecordDateRolloutTraceSummary === 'function',
    hasRecordDateLimitedAdoptionCandidate: typeof window.ippoRecordDateLimitedAdoptionCandidateSummary === 'function',
    hasRecordDateDraftCandidate: typeof window.ippoRecordDateDraftCandidateSummary === 'function',
    hasRecordSaveAdoptionVerify: typeof window.ippoRecordSaveAdoptionVerifySummary === 'function',
    hasRecordSaveOrchestrator: typeof window.ippoRecordSaveOrchestratorSummary === 'function',
  });
}

if (typeof window.ippoMarkViteReady === 'function') {
  window.ippoMarkViteReady({
    hasSupabase: !!supabase,
    hasSaveRecord: typeof saveRecord === 'function',
    hasOpenRecordScreen: typeof openRecordScreen === 'function',
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
    hasStartupGuardCandidate: typeof window.ippoStartupGuardCandidateSummary === 'function',
    hasMainEntryStartupObserverWiring: typeof window.ippoMainEntryStartupObserverWiringSummary === 'function',
    hasLegacyBootstrapFallbackIsolation: typeof window.ippoLegacyBootstrapFallbackIsolationSummary === 'function',
    hasStartupSequencingCandidate: typeof window.ippoStartupSequencingCandidateOrchestrationSummary === 'function',
    hasStartupExtractionCandidateShell: typeof window.ippoStartupExtractionCandidateShellSummary === 'function',
    hasStartupExtractionGuardedGate: typeof window.ippoStartupExtractionGuardedGateSummary === 'function',
    hasLimitedStartupExtractionRehearsal: typeof window.ippoLimitedStartupExtractionRehearsalSummary === 'function',
    hasStartupExtractionAdoptionCandidate: typeof window.ippoStartupExtractionAdoptionCandidateRuntimeSummary === 'function',
    hasFinalAppShellCleanup: typeof window.ippoFinalAppShellCleanupRuntimeSummary === 'function',
    hasActualStartupInlineRemoval: typeof window.ippoActualStartupInlineRemovalRuntimeSummary === 'function',
    hasRecordSaveShadow: typeof window.ippoRecordSaveShadowSummary === 'function',
    hasRecordDateBranchObservability: typeof window.ippoRecordDateBranchObservabilitySummary === 'function',
    hasRecordDateRolloutTrace: typeof window.ippoRecordDateRolloutTraceSummary === 'function',
    hasRecordDateLimitedAdoptionCandidate: typeof window.ippoRecordDateLimitedAdoptionCandidateSummary === 'function',
    hasRecordDateDraftCandidate: typeof window.ippoRecordDateDraftCandidateSummary === 'function',
    hasRecordSaveAdoptionVerify: typeof window.ippoRecordSaveAdoptionVerifySummary === 'function',
    hasRecordSaveOrchestrator: typeof window.ippoRecordSaveOrchestratorSummary === 'function',
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
runDeferredCheck('ippoRunStartupBoundaryCheck', 'startup-boundary-check');
runDeferredCheck('ippoRunBootstrapOwnershipPrepCheck', 'bootstrap-ownership-prep-check');
runDeferredCheck('ippoRunRuntimeSequencingCheck', 'runtime-sequencing-check');
runDeferredCheck('ippoRunDeferredHydrationPrepCheck', 'deferred-hydration-prep-check');
runDeferredCheck('ippoRunRenderBoundaryCheck', 'render-boundary-check');
runDeferredCheck('ippoRunScreenActivationPrepCheck', 'screen-activation-prep-check');
runDeferredCheck('ippoRunRuntimeOwnershipGraphCheck', 'runtime-ownership-graph-check');
runDeferredCheck('ippoRunPersistenceBoundaryPrepCheck', 'persistence-boundary-prep-check');
runDeferredCheck('ippoRunPersistenceExecutionReadinessCheck', 'persistence-execution-readiness-check');
runDeferredCheck('ippoRunPersistenceCandidateShadow', 'persistence-candidate-shadow');
runDeferredCheck('ippoRunPersistenceGuardedExecutionCheck', 'persistence-guarded-execution-check');
runDeferredCheck('ippoRunStartupGuardCandidateCheck', 'startup-guard-candidate-check');
runDeferredCheck('ippoRunMainEntryStartupObserverWiringCheck', 'main-entry-startup-observer-wiring-check');
runDeferredCheck('ippoRunStartupExtractionGuardedGateCheck', 'startup-extraction-guarded-gate-check');
runDeferredCheck('ippoRunLimitedStartupExtractionRehearsalCheck', 'limited-startup-extraction-rehearsal-check');
runDeferredCheck('ippoRunStartupExtractionAdoptionCandidateRuntimeCheck', 'startup-extraction-adoption-candidate-runtime-check');
runDeferredCheck('ippoRunFinalAppShellCleanupCheck', 'final-app-shell-cleanup-check');
runDeferredCheck('ippoRunActualStartupInlineRemovalCheck', 'actual-startup-inline-removal-check');

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
