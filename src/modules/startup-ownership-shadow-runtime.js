// ============================================================
// ippo – startup-ownership-shadow-runtime.js
//
// Phase A-7:
// Startup ownership extraction shadow runtime.
//
// 目的:
// app.html inline startup ownership を Vite runtime 側へ移す前に、
// ownership transfer を実行せず shadow runtime として比較・リハーサルする。
//
// 重要:
// - observe-only
// - ownership transfer is not performed
// - candidate startup is not executed
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// - render / hydration / save / sync / Supabase は変更しない
// ============================================================

const STARTUP_OWNERSHIP_SHADOW_KEY = '__ippoStartupOwnershipShadowRuntime';

const STARTUP_OWNERSHIP_SHADOW_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'startup-ownership-shadow-only',
  currentOwner: 'legacy-app-html-inline-startup',
  candidateOwner: 'vite-bootstrap-runtime',
  fallbackOwner: 'legacy-app-html-inline-startup',
  ownershipTransferAllowed: false,
});

const STARTUP_OWNERSHIP_DOMAINS = Object.freeze([
  {
    id: 'dom-ready-ownership',
    legacyOwner: 'app.html DOMContentLoaded listener',
    candidateOwner: 'vite startup runtime',
    transferAllowed: false,
  },
  {
    id: 'init-ownership',
    legacyOwner: 'legacy init()',
    candidateOwner: 'startup orchestration candidate',
    transferAllowed: false,
  },
  {
    id: 'state-load-ownership',
    legacyOwner: 'legacy loadState path',
    candidateOwner: 'store/state.js future owner',
    transferAllowed: false,
  },
  {
    id: 'first-render-ownership',
    legacyOwner: 'legacy render flow',
    candidateOwner: 'render boundary modules',
    transferAllowed: false,
  },
  {
    id: 'hydration-ownership',
    legacyOwner: 'legacy mixed hydration',
    candidateOwner: 'deferred hydration runtime',
    transferAllowed: false,
  },
]);

const NON_ADOPTED_REHEARSAL_STEPS = Object.freeze([
  {
    id: 'candidate-dom-ready-rehearsal',
    action: 'observe-dom-ready-only',
    executed: false,
  },
  {
    id: 'candidate-init-rehearsal',
    action: 'compare-init-readiness-only',
    executed: false,
  },
  {
    id: 'candidate-state-load-rehearsal',
    action: 'compare-state-shape-only',
    executed: false,
  },
  {
    id: 'candidate-first-render-rehearsal',
    action: 'compare-render-readiness-only',
    executed: false,
  },
  {
    id: 'candidate-hydration-rehearsal',
    action: 'compare-hydration-readiness-only',
    executed: false,
  },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getShadowState() {
  if (!window[STARTUP_OWNERSHIP_SHADOW_KEY]) {
    window[STARTUP_OWNERSHIP_SHADOW_KEY] = {
      loadedAt: nowIso(),
      mode: STARTUP_OWNERSHIP_SHADOW_ADOPTION.mode,
      adoptionEnabled: STARTUP_OWNERSHIP_SHADOW_ADOPTION.enabled,
      ownershipTransferAllowed: STARTUP_OWNERSHIP_SHADOW_ADOPTION.ownershipTransferAllowed,
      checks: [],
    };
  }

  return window[STARTUP_OWNERSHIP_SHADOW_KEY];
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

function summarizeShadowDependencies() {
  const startupGuard = safeCallSummary('ippoStartupGuardCandidateSummary');
  const fallbackIsolation = safeCallSummary('ippoLegacyBootstrapFallbackIsolationSummary');
  const orchestration = safeCallSummary('ippoStartupSequencingCandidateOrchestrationSummary');
  const wiring = safeCallSummary('ippoMainEntryStartupObserverWiringSummary');
  const runtimeSequencing = safeCallSummary('ippoRuntimeSequencingSummary');
  const deferredHydration = safeCallSummary('ippoDeferredHydrationPrepSummary');
  const renderBoundary = safeCallSummary('ippoRenderBoundarySummary');

  return {
    startupGuard,
    fallbackIsolation,
    orchestration,
    wiring,
    runtimeSequencing,
    deferredHydration,
    renderBoundary,
  };
}

function summarizeDependencyReadiness(dependencies) {
  return {
    startupGuardReady: !!dependencies.startupGuard && !dependencies.startupGuard.error,
    fallbackIsolationReady: !!dependencies.fallbackIsolation && !dependencies.fallbackIsolation.error,
    orchestrationReady: !!dependencies.orchestration && !dependencies.orchestration.error,
    wiringReady: !!dependencies.wiring && !dependencies.wiring.error,
    runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
    deferredHydrationReady: !!dependencies.deferredHydration && !dependencies.deferredHydration.error,
    renderBoundaryReady: !!dependencies.renderBoundary && !dependencies.renderBoundary.error,
  };
}

function summarizeStartupOwnershipCompareRuntime({ dependencies, readiness }) {
  const fallbackReady = !!(
    dependencies.fallbackIsolation &&
    !dependencies.fallbackIsolation.error &&
    dependencies.fallbackIsolation.fallbackReady
  );

  const candidateComparable = !!(
    dependencies.orchestration &&
    !dependencies.orchestration.error &&
    dependencies.orchestration.startupSequencingCompareRuntime &&
    dependencies.orchestration.startupSequencingCompareRuntime.comparable
  );

  return {
    legacyOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.currentOwner,
    candidateOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.candidateOwner,
    fallbackOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.fallbackOwner,
    comparisonMode: 'shadow-runtime-only',
    fallbackReady,
    candidateComparable,
    dependenciesReady: Object.keys(readiness).every((key) => readiness[key]),
    ownershipTransferAllowed: false,
    candidateStartupExecuted: false,
  };
}

function summarizeFallbackRecoveryRehearsal(dependencies) {
  const fallbackIsolation = dependencies.fallbackIsolation;
  const duplicateInitClear = !!(
    fallbackIsolation &&
    !fallbackIsolation.error &&
    fallbackIsolation.duplicateInitDetection &&
    !fallbackIsolation.duplicateInitDetection.possibleDuplicateInit
  );
  const hydrationRaceClear = !!(
    fallbackIsolation &&
    !fallbackIsolation.error &&
    fallbackIsolation.hydrationRaceDetection &&
    !fallbackIsolation.hydrationRaceDetection.possibleHydrationRace
  );

  return {
    mode: 'visibility-only',
    fallbackPathAvailable: !!(
      fallbackIsolation &&
      !fallbackIsolation.error &&
      fallbackIsolation.fallbackReady
    ),
    duplicateInitClear,
    hydrationRaceClear,
    recoveryRehearsalPassed:
      !!(
        fallbackIsolation &&
        !fallbackIsolation.error &&
        fallbackIsolation.fallbackReady &&
        duplicateInitClear &&
        hydrationRaceClear
      ),
    recoveryExecuted: false,
  };
}

function summarizeStartupOwnershipShadowRuntime() {
  const state = getShadowState();
  const dependencies = summarizeShadowDependencies();
  const readiness = summarizeDependencyReadiness(dependencies);
  const ownershipCompareRuntime = summarizeStartupOwnershipCompareRuntime({ dependencies, readiness });
  const fallbackRecoveryRehearsal = summarizeFallbackRecoveryRehearsal(dependencies);

  const readinessValues = Object.keys(readiness).map((key) => readiness[key]);
  const allDependenciesReady = readinessValues.every(Boolean);

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      ownershipTransferAllowed: !!state.ownershipTransferAllowed,
      currentOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.currentOwner,
      candidateOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.candidateOwner,
      fallbackOwner: STARTUP_OWNERSHIP_SHADOW_ADOPTION.fallbackOwner,
    },
    ownershipDomains: STARTUP_OWNERSHIP_DOMAINS,
    nonAdoptedRehearsalSteps: NON_ADOPTED_REHEARSAL_STEPS,
    dependencyReadiness: readiness,
    allDependenciesReady,
    ownershipCompareRuntime,
    fallbackRecoveryRehearsal,
    deferredStartupOrchestrationRuntime: {
      deferredHydrationReady: readiness.deferredHydrationReady,
      renderBoundaryReady: readiness.renderBoundaryReady,
      candidateDeferredStartupExecuted: false,
      adoptionAllowed: false,
    },
    startupCandidateTimingCompare: {
      available: !!(
        dependencies.orchestration &&
        !dependencies.orchestration.error &&
        dependencies.orchestration.timingVisibility
      ),
      timingVisibility:
        dependencies.orchestration && !dependencies.orchestration.error
          ? dependencies.orchestration.timingVisibility
          : null,
      candidateExecuted: false,
    },
    safeForPhaseA8Planning:
      !state.adoptionEnabled &&
      !state.ownershipTransferAllowed &&
      allDependenciesReady &&
      ownershipCompareRuntime.fallbackReady &&
      ownershipCompareRuntime.candidateComparable &&
      fallbackRecoveryRehearsal.recoveryRehearsalPassed,
    checks: state.checks.slice(-20),
  };
}

function runStartupOwnershipShadowRuntimeCheck(reason) {
  const state = getShadowState();
  const summary = summarizeStartupOwnershipShadowRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.allDependenciesReady,
    fallbackReady: summary.ownershipCompareRuntime.fallbackReady,
    candidateComparable: summary.ownershipCompareRuntime.candidateComparable,
    recoveryRehearsalPassed: summary.fallbackRecoveryRehearsal.recoveryRehearsalPassed,
    safeForPhaseA8Planning: summary.safeForPhaseA8Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-ownership-shadow-runtime-check', {
      reason: reason || 'manual',
      allDependenciesReady: summary.allDependenciesReady,
      fallbackReady: summary.ownershipCompareRuntime.fallbackReady,
      candidateComparable: summary.ownershipCompareRuntime.candidateComparable,
      recoveryRehearsalPassed: summary.fallbackRecoveryRehearsal.recoveryRehearsalPassed,
      safeForPhaseA8Planning: summary.safeForPhaseA8Planning,
    });
  }

  if (!summary.safeForPhaseA8Planning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-ownership-shadow-runtime-not-ready', {
      dependencyReadiness: summary.dependencyReadiness,
      ownershipCompareRuntime: summary.ownershipCompareRuntime,
      fallbackRecoveryRehearsal: summary.fallbackRecoveryRehearsal,
    });
  }

  return summarizeStartupOwnershipShadowRuntime();
}

window.ippoStartupOwnershipShadowRuntimeSummary = summarizeStartupOwnershipShadowRuntime;
window.ippoRunStartupOwnershipShadowRuntimeCheck = runStartupOwnershipShadowRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-ownership-shadow-runtime-loaded', {
    mode: STARTUP_OWNERSHIP_SHADOW_ADOPTION.mode,
    adoptionEnabled: STARTUP_OWNERSHIP_SHADOW_ADOPTION.enabled,
    ownershipTransferAllowed: STARTUP_OWNERSHIP_SHADOW_ADOPTION.ownershipTransferAllowed,
  });
}

export {
  STARTUP_OWNERSHIP_SHADOW_ADOPTION,
  STARTUP_OWNERSHIP_DOMAINS,
  NON_ADOPTED_REHEARSAL_STEPS,
  summarizeStartupOwnershipShadowRuntime,
  runStartupOwnershipShadowRuntimeCheck,
};
