// ============================================================
// ippo – hydration-candidate-runtime.js
//
// Bundle 14/20:
// Hydration candidate runtime.
//
// observe-only only.
// ============================================================

const HYDRATION_CANDIDATE_KEY = '__ippoHydrationCandidateRuntime';

const HYDRATION_CANDIDATE_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'hydration-candidate-runtime-observe-only',
  hydrationCandidateAllowed: false,
  hydrationOwnershipTransferAllowed: false,
  screenHydrationActivationAllowed: false,
});

const HYDRATION_CANDIDATE_PHASES = Object.freeze([
  { id: 'hydration-candidate-runtime', executed: false },
  { id: 'hydration-adoption-visibility', executed: false },
  { id: 'hydration-adoption-compare-runtime', executed: false },
  { id: 'hydration-adoption-readiness-graph', executed: false },
  { id: 'hydration-adoption-fallback-visibility', executed: false },
  { id: 'hydration-adoption-timing-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[HYDRATION_CANDIDATE_KEY]) {
    window[HYDRATION_CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      mode: HYDRATION_CANDIDATE_ADOPTION.mode,
      checks: [],
    };
  }

  return window[HYDRATION_CANDIDATE_KEY];
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
    hydrationRehearsal: safeCallSummary('ippoHydrationActivationRehearsalRuntimeSummary'),
    hydrationPlanning: safeCallSummary('ippoHydrationExtractionPlanningRuntimeSummary'),
    renderBoundaryPrep: safeCallSummary('ippoRenderBoundaryPrepSummary'),
    screenActivationPrep: safeCallSummary('ippoScreenActivationPrepSummary'),
  };
}

function summarizeHydrationAdoptionReadiness(dependencies) {
  const rehearsalReady = !!(
    dependencies.hydrationRehearsal &&
    !dependencies.hydrationRehearsal.error &&
    dependencies.hydrationRehearsal.safeForBundle14Planning
  );

  const planningReady = !!(
    dependencies.hydrationPlanning &&
    !dependencies.hydrationPlanning.error &&
    dependencies.hydrationPlanning.safeForBundle13Planning
  );

  return {
    rehearsalReady,
    planningReady,
    hydrationAdoptionReady: rehearsalReady && planningReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationAdoptionCompare(dependencies) {
  const rehearsalComparable = !!(
    dependencies.hydrationRehearsal &&
    !dependencies.hydrationRehearsal.error &&
    dependencies.hydrationRehearsal.hydrationRehearsalCompareRuntime &&
    dependencies.hydrationRehearsal.hydrationRehearsalCompareRuntime.rehearsalComparable
  );

  const renderBoundaryReady = !!(
    dependencies.renderBoundaryPrep &&
    !dependencies.renderBoundaryPrep.error
  );

  return {
    rehearsalComparable,
    renderBoundaryReady,
    hydrationComparable: rehearsalComparable && renderBoundaryReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationAdoptionFallback(dependencies) {
  const hydrationRehearsal = dependencies.hydrationRehearsal;

  return {
    fallbackPlanningReady: !!(
      hydrationRehearsal &&
      !hydrationRehearsal.error &&
      hydrationRehearsal.hydrationFallbackRehearsal &&
      hydrationRehearsal.hydrationFallbackRehearsal.fallbackPlanningReady
    ),
    sequencingReady: !!(
      hydrationRehearsal &&
      !hydrationRehearsal.error &&
      hydrationRehearsal.hydrationFallbackRehearsal &&
      hydrationRehearsal.hydrationFallbackRehearsal.sequencingReady
    ),
    fallbackExecuted: false,
  };
}

function summarizeHydrationAdoptionTiming(dependencies) {
  const screenActivationPrep = dependencies.screenActivationPrep;

  return {
    timingVisible: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    screenActivationReady: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    hydrationTransferred: false,
  };
}

function summarizeHydrationCandidateRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();

  const readiness = summarizeHydrationAdoptionReadiness(dependencies);
  const compare = summarizeHydrationAdoptionCompare(dependencies);
  const fallback = summarizeHydrationAdoptionFallback(dependencies);
  const timing = summarizeHydrationAdoptionTiming(dependencies);

  return {
    bundle: '14/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: HYDRATION_CANDIDATE_ADOPTION,
    hydrationCandidatePhases: HYDRATION_CANDIDATE_PHASES,
    hydrationAdoptionReadinessGraph: readiness,
    hydrationAdoptionCompareRuntime: compare,
    hydrationAdoptionFallbackVisibility: fallback,
    hydrationAdoptionTimingVisibility: timing,
    safeForBundle15Planning:
      readiness.hydrationAdoptionReady &&
      compare.hydrationComparable &&
      fallback.fallbackPlanningReady &&
      timing.screenActivationReady,
    checks: state.checks.slice(-20),
  };
}

function runHydrationCandidateRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeHydrationCandidateRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    hydrationAdoptionReady: summary.hydrationAdoptionReadinessGraph.hydrationAdoptionReady,
    hydrationComparable: summary.hydrationAdoptionCompareRuntime.hydrationComparable,
    safeForBundle15Planning: summary.safeForBundle15Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('hydration-candidate-runtime-check', {
      reason: reason || 'manual',
      hydrationAdoptionReady: summary.hydrationAdoptionReadinessGraph.hydrationAdoptionReady,
      hydrationComparable: summary.hydrationAdoptionCompareRuntime.hydrationComparable,
      safeForBundle15Planning: summary.safeForBundle15Planning,
    });
  }

  return summarizeHydrationCandidateRuntime();
}

window.ippoHydrationCandidateRuntimeSummary = summarizeHydrationCandidateRuntime;
window.ippoRunHydrationCandidateRuntimeCheck = runHydrationCandidateRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('hydration-candidate-runtime-loaded', {
    bundle: '14/20',
    mode: HYDRATION_CANDIDATE_ADOPTION.mode,
  });
}

export {
  HYDRATION_CANDIDATE_ADOPTION,
  HYDRATION_CANDIDATE_PHASES,
  summarizeHydrationCandidateRuntime,
  runHydrationCandidateRuntimeCheck,
};
