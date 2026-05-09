// ============================================================
// ippo – startup-duplicate-cleanup-inventory-runtime.js
//
// Phase 31-B:
// startup duplicate cleanup inventory runtime.
//
// 目的:
// Phase 31 の actual startup inline removal readiness の上で、
// startup-only duplicate helper cleanup の対象を限定する。
//
// 重要:
// - this module does not remove code
// - DOMContentLoaded ownership is not transferred
// - init() is not replaced
// - hydration/render/screen activation are untouched
// - save/sync/Supabase/localStorage are untouched
// ============================================================

const STARTUP_DUPLICATE_CLEANUP_KEY = '__ippoStartupDuplicateCleanupInventoryRuntime';

const STARTUP_DUPLICATE_CLEANUP_FLAGS = Object.freeze({
  enabled: false,
  mode: 'startup-duplicate-cleanup-inventory-only',
  cleanupExecutionAllowed: false,
  domContentLoadedOwnershipTransferAllowed: false,
  initReplacementAllowed: false,
  hydrationCleanupAllowed: false,
  renderCleanupAllowed: false,
  screenActivationCleanupAllowed: false,
  persistenceCleanupAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const STARTUP_DUPLICATE_CLEANUP_SCOPE = Object.freeze({
  cleanupCandidates: [
    {
      id: 'duplicate-startup-observer-helper',
      allowed: true,
      condition: 'only if main-entry observer wiring and startup guard candidate are ready',
    },
    {
      id: 'duplicate-startup-readiness-helper',
      allowed: true,
      condition: 'only if guarded startup extraction gate and limited rehearsal are ready',
    },
    {
      id: 'startup-only-warning-helper-duplication',
      allowed: true,
      condition: 'only if boot warning visibility remains available through boot-stability runtime',
    },
    {
      id: 'startup-only-fallback-visibility-duplication',
      allowed: true,
      condition: 'only if legacy bootstrap fallback isolation remains ready',
    },
  ],
  preserveCandidates: [
    'legacy init execution path',
    'DOMContentLoaded fallback handler',
    'legacy window compatibility bridge',
    'startup verify final check',
    'boot error visibility',
  ],
  forbiddenCleanup: [
    'init replacement',
    'DOMContentLoaded ownership transfer',
    'hydration orchestration cleanup',
    'render orchestration cleanup',
    'showScreen/switchTab timing cleanup',
    'saveState/loadState cleanup',
    'sync/Supabase/localStorage cleanup',
  ],
});

const REQUIRED_READY_APIS = Object.freeze([
  'ippoStartupGuardCandidateSummary',
  'ippoMainEntryStartupObserverWiringSummary',
  'ippoLegacyBootstrapFallbackIsolationSummary',
  'ippoStartupSequencingCandidateOrchestrationSummary',
  'ippoStartupExtractionGuardedGateSummary',
  'ippoLimitedStartupExtractionRehearsalSummary',
  'ippoStartupExtractionAdoptionCandidateRuntimeSummary',
  'ippoFinalAppShellCleanupRuntimeSummary',
  'ippoActualStartupInlineRemovalRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[STARTUP_DUPLICATE_CLEANUP_KEY]) {
    window[STARTUP_DUPLICATE_CLEANUP_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[STARTUP_DUPLICATE_CLEANUP_KEY];
}

function safeCall(name) {
  try {
    if (typeof window[name] === 'function') {
      return window[name]();
    }
  } catch (error) {
    return {
      error: true,
      message: error && error.message ? error.message : String(error),
    };
  }

  return null;
}

function summarizeReadinessApis() {
  const summaries = {};
  const readiness = {};

  REQUIRED_READY_APIS.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    readiness[name] = !!summary && !summary.error;
  });

  return {
    readiness,
    summaries,
    missing: REQUIRED_READY_APIS.filter((name) => !readiness[name]),
  };
}

function summarizeDuplicateSignals(dependencies) {
  const guard = dependencies.summaries.ippoStartupGuardCandidateSummary;
  const wiring = dependencies.summaries.ippoMainEntryStartupObserverWiringSummary;
  const fallback = dependencies.summaries.ippoLegacyBootstrapFallbackIsolationSummary;
  const rehearsal = dependencies.summaries.ippoLimitedStartupExtractionRehearsalSummary;
  const actualRemoval = dependencies.summaries.ippoActualStartupInlineRemovalRuntimeSummary;

  const startupGuardReady = !!(
    guard &&
    !guard.error &&
    guard.safeForObserverOnlyMainEntryWiring
  );

  const wiringReady = !!(
    wiring &&
    !wiring.error &&
    wiring.safeForObserveOnlyMainEntryWiring
  );

  const fallbackReady = !!(
    fallback &&
    !fallback.error &&
    fallback.fallbackReady
  );

  const rehearsalReady = !!(
    rehearsal &&
    !rehearsal.error &&
    rehearsal.guardedFallbackRehearsal &&
    rehearsal.guardedFallbackRehearsal.fallbackReady
  );

  const actualRemovalReady = !!(
    actualRemoval &&
    !actualRemoval.error &&
    actualRemoval.gate &&
    actualRemoval.gate.safeForLimitedStartupInlineRemoval
  );

  return {
    startupGuardReady,
    wiringReady,
    fallbackReady,
    rehearsalReady,
    actualRemovalReady,
    duplicateObserverCleanupCandidate: startupGuardReady && wiringReady,
    duplicateReadinessCleanupCandidate: wiringReady && rehearsalReady,
    startupFallbackDuplicationCleanupCandidate: fallbackReady && rehearsalReady,
    limitedCleanupCanProceed: startupGuardReady && wiringReady && fallbackReady && rehearsalReady && actualRemovalReady,
  };
}

function summarizeStartupDuplicateCleanupInventoryRuntime() {
  const state = getState();
  const dependencies = summarizeReadinessApis();
  const duplicateSignals = summarizeDuplicateSignals(dependencies);

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '31-B-startup-duplicate-cleanup-inventory',
    flags: STARTUP_DUPLICATE_CLEANUP_FLAGS,
    scope: STARTUP_DUPLICATE_CLEANUP_SCOPE,
    dependencies: {
      missing: dependencies.missing,
      allReady: dependencies.missing.length === 0,
    },
    duplicateSignals,
    cleanupPlan: {
      inventoryOnly: true,
      executionAllowed: STARTUP_DUPLICATE_CLEANUP_FLAGS.cleanupExecutionAllowed,
      safeForNextBundleActualCleanup:
        dependencies.missing.length === 0 &&
        duplicateSignals.limitedCleanupCanProceed &&
        !STARTUP_DUPLICATE_CLEANUP_FLAGS.cleanupExecutionAllowed,
      nextBundle: 'Phase 31-C: limited actual startup duplicate helper cleanup',
    },
    checks: state.checks.slice(-20),
  };
}

function runStartupDuplicateCleanupInventoryCheck(reason) {
  const state = getState();
  const summary = summarizeStartupDuplicateCleanupInventoryRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.dependencies.allReady,
    limitedCleanupCanProceed: summary.duplicateSignals.limitedCleanupCanProceed,
    safeForNextBundleActualCleanup: summary.cleanupPlan.safeForNextBundleActualCleanup,
    missingDependencies: summary.dependencies.missing,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-duplicate-cleanup-inventory-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.dependencies.allReady,
      limitedCleanupCanProceed: summary.duplicateSignals.limitedCleanupCanProceed,
      safeForNextBundleActualCleanup: summary.cleanupPlan.safeForNextBundleActualCleanup,
      missingDependencyCount: summary.dependencies.missing.length,
    });
  }

  if (!summary.cleanupPlan.safeForNextBundleActualCleanup && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-duplicate-cleanup-inventory-not-ready', {
      missingDependencies: summary.dependencies.missing,
      duplicateSignals: summary.duplicateSignals,
      forbiddenCleanup: STARTUP_DUPLICATE_CLEANUP_SCOPE.forbiddenCleanup,
    });
  }

  return summarizeStartupDuplicateCleanupInventoryRuntime();
}

window.ippoStartupDuplicateCleanupInventoryRuntimeSummary = summarizeStartupDuplicateCleanupInventoryRuntime;
window.ippoRunStartupDuplicateCleanupInventoryCheck = runStartupDuplicateCleanupInventoryCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-duplicate-cleanup-inventory-runtime-loaded', {
    phase: '31-B',
    mode: STARTUP_DUPLICATE_CLEANUP_FLAGS.mode,
    cleanupExecutionAllowed: STARTUP_DUPLICATE_CLEANUP_FLAGS.cleanupExecutionAllowed,
  });
}

export {
  STARTUP_DUPLICATE_CLEANUP_FLAGS,
  STARTUP_DUPLICATE_CLEANUP_SCOPE,
  summarizeStartupDuplicateCleanupInventoryRuntime,
  runStartupDuplicateCleanupInventoryCheck,
};
