// ============================================================
// ippo – runtime-sequencing.js
//
// startup sequencing / hydration sequencing / deferred runtime
// extraction の準備用 observability bundle。
//
// 重要:
// - sequencing ownership は移動しない
// - hydration execution は変更しない
// - save/persistence/sync は変更しない
// - observe-only
// ============================================================

// Phase A-6: main entry startup observer injection
// These imports are observe-only registration layers. They must not execute
// candidate startup, replace init(), install DOMContentLoaded ownership,
// trigger render, or touch persistence/sync.
import './startup-guard-candidate.js';
import './legacy-bootstrap-fallback-isolation.js';
import './startup-sequencing-candidate-orchestration.js';
import './main-entry-startup-observer-wiring.js';

const RUNTIME_SEQUENCE_KEY = '__ippoRuntimeSequencing';

const RUNTIME_SEQUENCES = [
  'boot-start',
  'vite-module-load',
  'legacy-global-ready',
  'state-ready',
  'supabase-ready',
  'startup-verify',
  'bootstrap-shell-check',
  'startup-boundary-check',
  'startup-guard-candidate-check',
  'legacy-bootstrap-fallback-isolation-check',
  'startup-sequencing-candidate-orchestration-check',
  'main-entry-startup-observer-wiring-check',
  'hydration-ready',
  'screen-render-ready',
  'record-save-ready',
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getRuntimeSequenceState() {
  if (!window[RUNTIME_SEQUENCE_KEY]) {
    window[RUNTIME_SEQUENCE_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      sequencingOwnershipExtracted: false,
      deferredHydrationEnabled: false,
      checks: [],
    };
  }

  return window[RUNTIME_SEQUENCE_KEY];
}

function safeCallSummary(name) {
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

function summarizeRuntimeSequencing() {
  const state = getRuntimeSequenceState();

  const bootSummary = safeCallSummary('ippoBootSummary');
  const startupBoundary = safeCallSummary('ippoStartupBoundarySummary');
  const bootstrapShell = safeCallSummary('ippoBootstrapShellSummary');
  const startupVerify = safeCallSummary('ippoStartupVerifySummary');
  const startupGuardCandidate = safeCallSummary('ippoStartupGuardCandidateSummary');
  const fallbackIsolation = safeCallSummary('ippoLegacyBootstrapFallbackIsolationSummary');
  const startupOrchestration = safeCallSummary('ippoStartupSequencingCandidateOrchestrationSummary');
  const mainEntryWiring = safeCallSummary('ippoMainEntryStartupObserverWiringSummary');

  const startupObserverReadiness = {
    startupGuardCandidateReady: !!startupGuardCandidate && !startupGuardCandidate.error,
    fallbackIsolationReady: !!fallbackIsolation && !fallbackIsolation.error,
    startupOrchestrationReady: !!startupOrchestration && !startupOrchestration.error,
    mainEntryWiringReady: !!mainEntryWiring && !mainEntryWiring.error,
    allStartupObserversReady: !!(
      startupGuardCandidate &&
      !startupGuardCandidate.error &&
      fallbackIsolation &&
      !fallbackIsolation.error &&
      startupOrchestration &&
      !startupOrchestration.error &&
      mainEntryWiring &&
      !mainEntryWiring.error
    ),
  };

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    runtimeSequences: RUNTIME_SEQUENCES,
    sequencingOwnershipExtracted: !!state.sequencingOwnershipExtracted,
    deferredHydrationEnabled: !!state.deferredHydrationEnabled,
    viteReady: !!window.__ippoViteReady,
    bootReady: !!bootSummary,
    startupBoundaryReady: !!startupBoundary,
    bootstrapShellReady: !!bootstrapShell,
    startupVerifyReady: !!startupVerify,
    supabaseReady: !!(window.__ippoSupabaseStatus && window.__ippoSupabaseStatus.ready),
    hydrationSequencingReady: !!(
      startupBoundary &&
      startupBoundary.safeForHydrationSequencing
    ),
    startupOwnershipExtractionReady: !!(
      startupBoundary &&
      startupBoundary.safeForStartupOwnershipExtraction
    ),
    bootstrapExtractionReady: !!(
      bootstrapShell &&
      bootstrapShell.safeForNextBootstrapExtraction
    ),
    startupObserverReadiness,
    startupObserverSummaries: {
      startupGuardCandidate,
      fallbackIsolation,
      startupOrchestration,
      mainEntryWiring,
    },
    mainEntryStartupObserverInjection: {
      mode: 'observe-only-through-runtime-sequencing',
      candidateStartupExecuted: false,
      initReplaced: false,
      domContentLoadedOwnershipTransferred: false,
      renderTouched: false,
      persistenceTouched: false,
    },
    safeForPhaseA7Planning:
      startupObserverReadiness.allStartupObserversReady &&
      !!(
        mainEntryWiring &&
        !mainEntryWiring.error &&
        mainEntryWiring.safeForObserveOnlyMainEntryWiring
      ),
    checks: state.checks.slice(-30),
  };
}

function runOptionalObserverCheck(checkName, reason, errorName) {
  try {
    if (typeof window[checkName] === 'function') {
      return window[checkName](reason);
    }
  } catch (error) {
    if (typeof window.ippoMarkBootError === 'function') {
      window.ippoMarkBootError(errorName, {
        message: error && error.message ? error.message : String(error),
      });
    }
  }

  return null;
}

function runRuntimeSequencingCheck(reason) {
  const state = getRuntimeSequenceState();

  runOptionalObserverCheck(
    'ippoRunStartupGuardCandidateCheck',
    reason || 'runtime-sequencing',
    'startup-guard-candidate-check-failed'
  );
  runOptionalObserverCheck(
    'ippoRunLegacyBootstrapFallbackIsolationCheck',
    reason || 'runtime-sequencing',
    'legacy-bootstrap-fallback-isolation-check-failed'
  );
  runOptionalObserverCheck(
    'ippoRunStartupSequencingCandidateOrchestrationCheck',
    reason || 'runtime-sequencing',
    'startup-sequencing-candidate-orchestration-check-failed'
  );
  runOptionalObserverCheck(
    'ippoRunMainEntryStartupObserverWiringCheck',
    reason || 'runtime-sequencing',
    'main-entry-startup-observer-wiring-check-failed'
  );

  const summary = summarizeRuntimeSequencing();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    hydrationSequencingReady: summary.hydrationSequencingReady,
    startupOwnershipExtractionReady: summary.startupOwnershipExtractionReady,
    bootstrapExtractionReady: summary.bootstrapExtractionReady,
    allStartupObserversReady: summary.startupObserverReadiness.allStartupObserversReady,
    safeForPhaseA7Planning: summary.safeForPhaseA7Planning,
  });

  if (state.checks.length > 50) {
    state.checks.splice(0, state.checks.length - 50);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('runtime-sequencing-check', {
      reason: reason || 'manual',
      hydrationSequencingReady: summary.hydrationSequencingReady,
      startupOwnershipExtractionReady: summary.startupOwnershipExtractionReady,
      bootstrapExtractionReady: summary.bootstrapExtractionReady,
      allStartupObserversReady: summary.startupObserverReadiness.allStartupObserversReady,
      safeForPhaseA7Planning: summary.safeForPhaseA7Planning,
    });
  }

  return summarizeRuntimeSequencing();
}

window.ippoRuntimeSequencingSummary = summarizeRuntimeSequencing;
window.ippoRunRuntimeSequencingCheck = runRuntimeSequencingCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runRuntimeSequencingCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runRuntimeSequencingCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-sequencing-module-loaded', {
    startupObserverInjection: 'observe-only',
  });
}

export {
  RUNTIME_SEQUENCES,
  summarizeRuntimeSequencing,
  runRuntimeSequencingCheck,
};
