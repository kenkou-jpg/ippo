// ============================================================
// ippo – hydration-activation-rehearsal-runtime.js
//
// Bundle 13/20:
// Hydration activation rehearsal runtime.
//
// observe-only only.
// ============================================================

const HYDRATION_REHEARSAL_KEY = '__ippoHydrationActivationRehearsalRuntime';

const HYDRATION_REHEARSAL_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'hydration-activation-rehearsal-observe-only',
  hydrationRehearsalAllowed: false,
  hydrationOwnershipTransferAllowed: false,
  screenActivationAllowed: false,
});

const HYDRATION_REHEARSAL_PHASES = Object.freeze([
  { id: 'hydration-activation-rehearsal-graph', executed: false },
  { id: 'hydration-rehearsal-compare-runtime', executed: false },
  { id: 'hydration-fallback-rehearsal', executed: false },
  { id: 'screen-hydration-timing-visibility', executed: false },
  { id: 'guarded-hydration-rehearsal-visibility', executed: false },
  { id: 'hydration-sequencing-rehearsal-runtime', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[HYDRATION_REHEARSAL_KEY]) {
    window[HYDRATION_REHEARSAL_KEY] = {
      loadedAt: nowIso(),
      mode: HYDRATION_REHEARSAL_ADOPTION.mode,
      checks: [],
    };
  }

  return window[HYDRATION_REHEARSAL_KEY];
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
    hydrationPlanning: safeCallSummary('ippoHydrationExtractionPlanningRuntimeSummary'),
    deferredHydration: safeCallSummary('ippoDeferredHydrationPrepSummary'),
    renderBoundaryPrep: safeCallSummary('ippoRenderBoundaryPrepSummary'),
    screenActivationPrep: safeCallSummary('ippoScreenActivationPrepSummary'),
  };
}

function summarizeHydrationRehearsalGraph(dependencies) {
  const hydrationPlanningReady = !!(
    dependencies.hydrationPlanning &&
    !dependencies.hydrationPlanning.error &&
    dependencies.hydrationPlanning.safeForBundle13Planning
  );

  const deferredHydrationReady = !!(
    dependencies.deferredHydration &&
    !dependencies.deferredHydration.error
  );

  return {
    hydrationPlanningReady,
    deferredHydrationReady,
    hydrationRehearsalReady: hydrationPlanningReady && deferredHydrationReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationRehearsalCompare(dependencies) {
  const hydrationComparable = !!(
    dependencies.hydrationPlanning &&
    !dependencies.hydrationPlanning.error &&
    dependencies.hydrationPlanning.hydrationCompareRuntime &&
    dependencies.hydrationPlanning.hydrationCompareRuntime.hydrationComparable
  );

  const renderBoundaryReady = !!(
    dependencies.renderBoundaryPrep &&
    !dependencies.renderBoundaryPrep.error
  );

  return {
    hydrationComparable,
    renderBoundaryReady,
    rehearsalComparable: hydrationComparable && renderBoundaryReady,
    hydrationTransferred: false,
  };
}

function summarizeHydrationFallbackRehearsal(dependencies) {
  const hydrationPlanning = dependencies.hydrationPlanning;

  return {
    fallbackPlanningReady: !!(
      hydrationPlanning &&
      !hydrationPlanning.error &&
      hydrationPlanning.hydrationFallbackPlanning &&
      hydrationPlanning.hydrationFallbackPlanning.fallbackPlanningReady
    ),
    sequencingReady: !!(
      hydrationPlanning &&
      !hydrationPlanning.error &&
      hydrationPlanning.hydrationFallbackPlanning &&
      hydrationPlanning.hydrationFallbackPlanning.sequencingReady
    ),
    fallbackExecuted: false,
  };
}

function summarizeScreenHydrationTiming(dependencies) {
  const screenActivationPrep = dependencies.screenActivationPrep;

  return {
    screenActivationReady: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    timingVisible: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    hydrationTransferred: false,
  };
}

function summarizeHydrationActivationRehearsalRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();

  const rehearsalGraph = summarizeHydrationRehearsalGraph(dependencies);
  const compare = summarizeHydrationRehearsalCompare(dependencies);
  const fallback = summarizeHydrationFallbackRehearsal(dependencies);
  const timing = summarizeScreenHydrationTiming(dependencies);

  return {
    bundle: '13/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: HYDRATION_REHEARSAL_ADOPTION,
    hydrationRehearsalPhases: HYDRATION_REHEARSAL_PHASES,
    hydrationActivationRehearsalGraph: rehearsalGraph,
    hydrationRehearsalCompareRuntime: compare,
    hydrationFallbackRehearsal: fallback,
    screenHydrationTimingVisibility: timing,
    guardedHydrationRehearsalVisibility: {
      hydrationRehearsalReady: rehearsalGraph.hydrationRehearsalReady,
      rehearsalComparable: compare.rehearsalComparable,
      fallbackPlanningReady: fallback.fallbackPlanningReady,
      hydrationTransferred: false,
    },
    safeForBundle14Planning:
      rehearsalGraph.hydrationRehearsalReady &&
      compare.rehearsalComparable &&
      fallback.fallbackPlanningReady &&
      timing.screenActivationReady,
    checks: state.checks.slice(-20),
  };
}

function runHydrationActivationRehearsalRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeHydrationActivationRehearsalRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    hydrationRehearsalReady: summary.hydrationActivationRehearsalGraph.hydrationRehearsalReady,
    rehearsalComparable: summary.hydrationRehearsalCompareRuntime.rehearsalComparable,
    safeForBundle14Planning: summary.safeForBundle14Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('hydration-activation-rehearsal-runtime-check', {
      reason: reason || 'manual',
      hydrationRehearsalReady: summary.hydrationActivationRehearsalGraph.hydrationRehearsalReady,
      rehearsalComparable: summary.hydrationRehearsalCompareRuntime.rehearsalComparable,
      safeForBundle14Planning: summary.safeForBundle14Planning,
    });
  }

  return summarizeHydrationActivationRehearsalRuntime();
}

window.ippoHydrationActivationRehearsalRuntimeSummary = summarizeHydrationActivationRehearsalRuntime;
window.ippoRunHydrationActivationRehearsalRuntimeCheck = runHydrationActivationRehearsalRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('hydration-activation-rehearsal-runtime-loaded', {
    bundle: '13/20',
    mode: HYDRATION_REHEARSAL_ADOPTION.mode,
  });
}

export {
  HYDRATION_REHEARSAL_ADOPTION,
  HYDRATION_REHEARSAL_PHASES,
  summarizeHydrationActivationRehearsalRuntime,
  runHydrationActivationRehearsalRuntimeCheck,
};
