// ============================================================
// ippo – hydration-extraction-planning-runtime.js
//
// Bundle 12/20:
// Hydration extraction planning runtime.
//
// observe-only only.
// ============================================================

const HYDRATION_PLANNING_KEY = '__ippoHydrationExtractionPlanningRuntime';

const HYDRATION_PLANNING_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'hydration-extraction-planning-observe-only',
  hydrationExtractionAllowed: false,
  screenHydrationOwnershipAllowed: false,
  startupExecutionAllowed: false,
});

const HYDRATION_PLANNING_PHASES = Object.freeze([
  { id: 'hydration-extraction-planning-graph', executed: false },
  { id: 'hydration-ownership-readiness-runtime', executed: false },
  { id: 'hydration-compare-runtime', executed: false },
  { id: 'hydration-fallback-planning', executed: false },
  { id: 'deferred-hydration-dependency-graph', executed: false },
  { id: 'guarded-hydration-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[HYDRATION_PLANNING_KEY]) {
    window[HYDRATION_PLANNING_KEY] = {
      loadedAt: nowIso(),
      mode: HYDRATION_PLANNING_ADOPTION.mode,
      checks: [],
    };
  }

  return window[HYDRATION_PLANNING_KEY];
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

function summarizeDependencies() {
  return {
    ownershipCandidate: safeCallSummary('ippoStartupExtractionOwnershipCandidateRuntimeSummary'),
    deferredHydration: safeCallSummary('ippoDeferredHydrationPrepSummary'),
    hydrationPrep: safeCallSummary('ippoRenderBoundaryPrepSummary'),
    runtimeSequencing: safeCallSummary('ippoRuntimeSequencingSummary'),
  };
}

function summarizeHydrationOwnershipReadiness(dependencies) {
  const ownershipReady = !!(
    dependencies.ownershipCandidate &&
    !dependencies.ownershipCandidate.error &&
    dependencies.ownershipCandidate.safeForBundle12Planning
  );

  const deferredHydrationReady = !!(
    dependencies.deferredHydration &&
    !dependencies.deferredHydration.error
  );

  return {
    ownershipReady,
    deferredHydrationReady,
    hydrationOwnershipReady: ownershipReady && deferredHydrationReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationCompareRuntime(dependencies) {
  const ownershipComparable = !!(
    dependencies.ownershipCandidate &&
    !dependencies.ownershipCandidate.error &&
    dependencies.ownershipCandidate.ownershipAdoptionCompareRuntime &&
    dependencies.ownershipCandidate.ownershipAdoptionCompareRuntime.adoptionComparable
  );

  const hydrationPrepReady = !!(
    dependencies.hydrationPrep &&
    !dependencies.hydrationPrep.error
  );

  return {
    ownershipComparable,
    hydrationPrepReady,
    hydrationComparable: ownershipComparable && hydrationPrepReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationFallbackPlanning(dependencies) {
  const runtimeSequencing = dependencies.runtimeSequencing;

  return {
    sequencingReady: !!(
      runtimeSequencing &&
      !runtimeSequencing.error
    ),
    fallbackPlanningReady: !!(
      runtimeSequencing &&
      !runtimeSequencing.error &&
      runtimeSequencing.startupOwnershipExtractionReady
    ),
    fallbackExecuted: false,
  };
}

function summarizeHydrationExtractionPlanningRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeHydrationOwnershipReadiness(dependencies);
  const compare = summarizeHydrationCompareRuntime(dependencies);
  const fallback = summarizeHydrationFallbackPlanning(dependencies);

  return {
    bundle: '12/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: HYDRATION_PLANNING_ADOPTION,
    hydrationPlanningPhases: HYDRATION_PLANNING_PHASES,
    hydrationOwnershipReadinessRuntime: readiness,
    hydrationCompareRuntime: compare,
    hydrationFallbackPlanning: fallback,
    deferredHydrationDependencyGraph: {
      ownershipCandidateReady: !!dependencies.ownershipCandidate && !dependencies.ownershipCandidate.error,
      deferredHydrationReady: !!dependencies.deferredHydration && !dependencies.deferredHydration.error,
      hydrationPrepReady: !!dependencies.hydrationPrep && !dependencies.hydrationPrep.error,
      runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
    },
    guardedHydrationVisibility: {
      hydrationOwnershipReady: readiness.hydrationOwnershipReady,
      hydrationComparable: compare.hydrationComparable,
      fallbackPlanningReady: fallback.fallbackPlanningReady,
      hydrationTransferred: false,
    },
    safeForBundle13Planning:
      readiness.hydrationOwnershipReady &&
      compare.hydrationComparable &&
      fallback.fallbackPlanningReady,
    checks: state.checks.slice(-20),
  };
}

function runHydrationExtractionPlanningRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeHydrationExtractionPlanningRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    hydrationOwnershipReady: summary.hydrationOwnershipReadinessRuntime.hydrationOwnershipReady,
    hydrationComparable: summary.hydrationCompareRuntime.hydrationComparable,
    safeForBundle13Planning: summary.safeForBundle13Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('hydration-extraction-planning-runtime-check', {
      reason: reason || 'manual',
      hydrationOwnershipReady: summary.hydrationOwnershipReadinessRuntime.hydrationOwnershipReady,
      hydrationComparable: summary.hydrationCompareRuntime.hydrationComparable,
      safeForBundle13Planning: summary.safeForBundle13Planning,
    });
  }

  return summarizeHydrationExtractionPlanningRuntime();
}

window.ippoHydrationExtractionPlanningRuntimeSummary = summarizeHydrationExtractionPlanningRuntime;
window.ippoRunHydrationExtractionPlanningRuntimeCheck = runHydrationExtractionPlanningRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('hydration-extraction-planning-runtime-loaded', {
    bundle: '12/20',
    mode: HYDRATION_PLANNING_ADOPTION.mode,
  });
}

export {
  HYDRATION_PLANNING_ADOPTION,
  HYDRATION_PLANNING_PHASES,
  summarizeHydrationExtractionPlanningRuntime,
  runHydrationExtractionPlanningRuntimeCheck,
};
