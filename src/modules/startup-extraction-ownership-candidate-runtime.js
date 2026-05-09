// ============================================================
// ippo – startup-extraction-ownership-candidate-runtime.js
//
// Bundle 11/20:
// Startup extraction ownership candidate runtime.
//
// observe-only only.
// ============================================================

const OWNERSHIP_CANDIDATE_KEY = '__ippoStartupExtractionOwnershipCandidateRuntime';

const OWNERSHIP_CANDIDATE_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'ownership-candidate-runtime-observe-only',
  ownershipCandidateAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const OWNERSHIP_CANDIDATE_PHASES = Object.freeze([
  { id: 'ownership-candidate-runtime', executed: false },
  { id: 'ownership-adoption-visibility', executed: false },
  { id: 'ownership-adoption-compare-runtime', executed: false },
  { id: 'ownership-adoption-readiness-graph', executed: false },
  { id: 'ownership-adoption-fallback-visibility', executed: false },
  { id: 'ownership-adoption-timing-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[OWNERSHIP_CANDIDATE_KEY]) {
    window[OWNERSHIP_CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      mode: OWNERSHIP_CANDIDATE_ADOPTION.mode,
      checks: [],
    };
  }

  return window[OWNERSHIP_CANDIDATE_KEY];
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
    ownershipRehearsal: safeCallSummary('ippoStartupExtractionOwnershipActivationRehearsalRuntimeSummary'),
    ownershipPlanning: safeCallSummary('ippoStartupExtractionOwnershipActivationPlanningSummary'),
    activationCandidate: safeCallSummary('ippoStartupExtractionActivationCandidateRuntimeSummary'),
    activationRehearsal: safeCallSummary('ippoStartupExtractionActivationRehearsalRuntimeSummary'),
  };
}

function summarizeOwnershipAdoptionReadiness(dependencies) {
  const ownershipRehearsalReady = !!(
    dependencies.ownershipRehearsal &&
    !dependencies.ownershipRehearsal.error &&
    dependencies.ownershipRehearsal.safeForBundle11Planning
  );

  const ownershipPlanningReady = !!(
    dependencies.ownershipPlanning &&
    !dependencies.ownershipPlanning.error &&
    dependencies.ownershipPlanning.safeForBundle10Planning
  );

  return {
    ownershipRehearsalReady,
    ownershipPlanningReady,
    ownershipAdoptionReady: ownershipRehearsalReady && ownershipPlanningReady,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipAdoptionCompare(dependencies) {
  const ownershipComparable = !!(
    dependencies.ownershipRehearsal &&
    !dependencies.ownershipRehearsal.error &&
    dependencies.ownershipRehearsal.ownershipActivationRehearsalCompareRuntime &&
    dependencies.ownershipRehearsal.ownershipActivationRehearsalCompareRuntime.rehearsalComparable
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
    adoptionComparable: ownershipComparable && activationComparable,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipAdoptionFallback(dependencies) {
  const ownershipRehearsal = dependencies.ownershipRehearsal;

  return {
    fallbackReady: !!(
      ownershipRehearsal &&
      !ownershipRehearsal.error &&
      ownershipRehearsal.ownershipActivationFallbackRehearsal &&
      ownershipRehearsal.ownershipActivationFallbackRehearsal.fallbackReady
    ),
    candidateComparable: !!(
      ownershipRehearsal &&
      !ownershipRehearsal.error &&
      ownershipRehearsal.ownershipActivationFallbackRehearsal &&
      ownershipRehearsal.ownershipActivationFallbackRehearsal.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeOwnershipAdoptionTiming(dependencies) {
  const ownershipRehearsal = dependencies.ownershipRehearsal;

  return {
    timingVisible: !!(
      ownershipRehearsal &&
      !ownershipRehearsal.error &&
      ownershipRehearsal.ownershipActivationTimingRehearsalVisibility
    ),
    timingComparable: !!(
      ownershipRehearsal &&
      !ownershipRehearsal.error &&
      ownershipRehearsal.ownershipActivationTimingRehearsalVisibility &&
      ownershipRehearsal.ownershipActivationTimingRehearsalVisibility.timingComparable
    ),
    ownershipTransferred: false,
  };
}

function summarizeStartupExtractionOwnershipCandidateRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeOwnershipAdoptionReadiness(dependencies);
  const compare = summarizeOwnershipAdoptionCompare(dependencies);
  const fallback = summarizeOwnershipAdoptionFallback(dependencies);
  const timing = summarizeOwnershipAdoptionTiming(dependencies);

  return {
    bundle: '11/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: OWNERSHIP_CANDIDATE_ADOPTION,
    ownershipCandidatePhases: OWNERSHIP_CANDIDATE_PHASES,
    ownershipAdoptionReadinessGraph: readiness,
    ownershipAdoptionCompareRuntime: compare,
    ownershipAdoptionFallbackVisibility: fallback,
    ownershipAdoptionTimingVisibility: timing,
    safeForBundle12Planning:
      readiness.ownershipAdoptionReady &&
      compare.adoptionComparable &&
      fallback.fallbackReady &&
      fallback.candidateComparable &&
      timing.timingComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionOwnershipCandidateRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeStartupExtractionOwnershipCandidateRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    ownershipAdoptionReady: summary.ownershipAdoptionReadinessGraph.ownershipAdoptionReady,
    adoptionComparable: summary.ownershipAdoptionCompareRuntime.adoptionComparable,
    safeForBundle12Planning: summary.safeForBundle12Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-ownership-candidate-runtime-check', {
      reason: reason || 'manual',
      ownershipAdoptionReady: summary.ownershipAdoptionReadinessGraph.ownershipAdoptionReady,
      adoptionComparable: summary.ownershipAdoptionCompareRuntime.adoptionComparable,
      safeForBundle12Planning: summary.safeForBundle12Planning,
    });
  }

  return summarizeStartupExtractionOwnershipCandidateRuntime();
}

window.ippoStartupExtractionOwnershipCandidateRuntimeSummary = summarizeStartupExtractionOwnershipCandidateRuntime;
window.ippoRunStartupExtractionOwnershipCandidateRuntimeCheck = runStartupExtractionOwnershipCandidateRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-ownership-candidate-runtime-loaded', {
    bundle: '11/20',
    mode: OWNERSHIP_CANDIDATE_ADOPTION.mode,
  });
}

export {
  OWNERSHIP_CANDIDATE_ADOPTION,
  OWNERSHIP_CANDIDATE_PHASES,
  summarizeStartupExtractionOwnershipCandidateRuntime,
  runStartupExtractionOwnershipCandidateRuntimeCheck,
};
