// ============================================================
// ippo – startup-extraction-ownership-activation-rehearsal-runtime.js
//
// Bundle 10/20:
// Startup extraction ownership activation rehearsal runtime.
//
// observe-only only.
// ============================================================

const OWNERSHIP_REHEARSAL_KEY = '__ippoStartupExtractionOwnershipActivationRehearsalRuntime';

const OWNERSHIP_REHEARSAL_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'ownership-activation-rehearsal-observe-only',
  ownershipRehearsalAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const OWNERSHIP_REHEARSAL_PHASES = Object.freeze([
  { id: 'ownership-activation-rehearsal-graph', executed: false },
  { id: 'ownership-activation-rehearsal-compare-runtime', executed: false },
  { id: 'ownership-activation-fallback-rehearsal', executed: false },
  { id: 'ownership-activation-timing-rehearsal', executed: false },
  { id: 'guarded-ownership-rehearsal-visibility', executed: false },
  { id: 'ownership-activation-sequencing-rehearsal', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[OWNERSHIP_REHEARSAL_KEY]) {
    window[OWNERSHIP_REHEARSAL_KEY] = {
      loadedAt: nowIso(),
      mode: OWNERSHIP_REHEARSAL_ADOPTION.mode,
      checks: [],
    };
  }

  return window[OWNERSHIP_REHEARSAL_KEY];
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
    ownershipPlanning: safeCallSummary('ippoStartupExtractionOwnershipActivationPlanningSummary'),
    activationCandidate: safeCallSummary('ippoStartupExtractionActivationCandidateRuntimeSummary'),
    activationRehearsal: safeCallSummary('ippoStartupExtractionActivationRehearsalRuntimeSummary'),
    activationPlanning: safeCallSummary('ippoGuardedStartupExtractionActivationPlanningSummary'),
  };
}

function summarizeOwnershipRehearsalGraph(dependencies) {
  const ownershipPlanningReady = !!(
    dependencies.ownershipPlanning &&
    !dependencies.ownershipPlanning.error &&
    dependencies.ownershipPlanning.safeForBundle10Planning
  );

  const activationCandidateReady = !!(
    dependencies.activationCandidate &&
    !dependencies.activationCandidate.error &&
    dependencies.activationCandidate.safeForBundle09Planning
  );

  return {
    ownershipPlanningReady,
    activationCandidateReady,
    ownershipRehearsalReady: ownershipPlanningReady && activationCandidateReady,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipRehearsalCompare(dependencies) {
  const ownershipComparable = !!(
    dependencies.ownershipPlanning &&
    !dependencies.ownershipPlanning.error &&
    dependencies.ownershipPlanning.ownershipActivationCompareRuntime &&
    dependencies.ownershipPlanning.ownershipActivationCompareRuntime.ownershipComparable
  );

  const activationComparable = !!(
    dependencies.activationCandidate &&
    !dependencies.activationCandidate.error &&
    dependencies.activationCandidate.activationAdoptionCompareRuntime &&
    dependencies.activationCandidate.activationAdoptionCompareRuntime.activationComparable
  );

  return {
    ownershipComparable,
    activationComparable,
    rehearsalComparable: ownershipComparable && activationComparable,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipFallbackRehearsal(dependencies) {
  const ownershipPlanning = dependencies.ownershipPlanning;

  return {
    fallbackReady: !!(
      ownershipPlanning &&
      !ownershipPlanning.error &&
      ownershipPlanning.activationOwnershipFallbackPlanning &&
      ownershipPlanning.activationOwnershipFallbackPlanning.fallbackReady
    ),
    candidateComparable: !!(
      ownershipPlanning &&
      !ownershipPlanning.error &&
      ownershipPlanning.activationOwnershipFallbackPlanning &&
      ownershipPlanning.activationOwnershipFallbackPlanning.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeOwnershipTimingRehearsal(dependencies) {
  const activationCandidate = dependencies.activationCandidate;

  return {
    timingVisible: !!(
      activationCandidate &&
      !activationCandidate.error &&
      activationCandidate.activationAdoptionTimingVisibility
    ),
    timingComparable: !!(
      activationCandidate &&
      !activationCandidate.error &&
      activationCandidate.activationAdoptionTimingVisibility &&
      activationCandidate.activationAdoptionTimingVisibility.timingComparable
    ),
    ownershipTransferred: false,
  };
}

function summarizeStartupExtractionOwnershipActivationRehearsalRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const rehearsalGraph = summarizeOwnershipRehearsalGraph(dependencies);
  const compare = summarizeOwnershipRehearsalCompare(dependencies);
  const fallback = summarizeOwnershipFallbackRehearsal(dependencies);
  const timing = summarizeOwnershipTimingRehearsal(dependencies);

  return {
    bundle: '10/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: OWNERSHIP_REHEARSAL_ADOPTION,
    ownershipRehearsalPhases: OWNERSHIP_REHEARSAL_PHASES,
    ownershipActivationRehearsalGraph: rehearsalGraph,
    ownershipActivationRehearsalCompareRuntime: compare,
    ownershipActivationFallbackRehearsal: fallback,
    ownershipActivationTimingRehearsalVisibility: timing,
    guardedOwnershipRehearsalVisibility: {
      ownershipRehearsalReady: rehearsalGraph.ownershipRehearsalReady,
      rehearsalComparable: compare.rehearsalComparable,
      fallbackReady: fallback.fallbackReady,
      ownershipTransferred: false,
    },
    safeForBundle11Planning:
      rehearsalGraph.ownershipRehearsalReady &&
      compare.rehearsalComparable &&
      fallback.fallbackReady &&
      fallback.candidateComparable &&
      timing.timingComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionOwnershipActivationRehearsalRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeStartupExtractionOwnershipActivationRehearsalRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    ownershipRehearsalReady: summary.ownershipActivationRehearsalGraph.ownershipRehearsalReady,
    rehearsalComparable: summary.ownershipActivationRehearsalCompareRuntime.rehearsalComparable,
    safeForBundle11Planning: summary.safeForBundle11Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-ownership-activation-rehearsal-runtime-check', {
      reason: reason || 'manual',
      ownershipRehearsalReady: summary.ownershipActivationRehearsalGraph.ownershipRehearsalReady,
      rehearsalComparable: summary.ownershipActivationRehearsalCompareRuntime.rehearsalComparable,
      safeForBundle11Planning: summary.safeForBundle11Planning,
    });
  }

  return summarizeStartupExtractionOwnershipActivationRehearsalRuntime();
}

window.ippoStartupExtractionOwnershipActivationRehearsalRuntimeSummary = summarizeStartupExtractionOwnershipActivationRehearsalRuntime;
window.ippoRunStartupExtractionOwnershipActivationRehearsalRuntimeCheck = runStartupExtractionOwnershipActivationRehearsalRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-ownership-activation-rehearsal-runtime-loaded', {
    bundle: '10/20',
    mode: OWNERSHIP_REHEARSAL_ADOPTION.mode,
  });
}

export {
  OWNERSHIP_REHEARSAL_ADOPTION,
  OWNERSHIP_REHEARSAL_PHASES,
  summarizeStartupExtractionOwnershipActivationRehearsalRuntime,
  runStartupExtractionOwnershipActivationRehearsalRuntimeCheck,
};
