// ============================================================
// ippo – startup-extraction-activation-candidate-runtime.js
//
// Bundle 08/20:
// Startup extraction activation candidate runtime.
//
// observe-only only.
// ============================================================

const ACTIVATION_CANDIDATE_KEY = '__ippoStartupExtractionActivationCandidateRuntime';

const ACTIVATION_CANDIDATE_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'activation-candidate-runtime-observe-only',
  activationCandidateAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const ACTIVATION_CANDIDATE_PHASES = Object.freeze([
  { id: 'activation-candidate-runtime', executed: false },
  { id: 'guarded-activation-adoption-visibility', executed: false },
  { id: 'activation-adoption-compare-runtime', executed: false },
  { id: 'activation-adoption-readiness-graph', executed: false },
  { id: 'activation-adoption-fallback-visibility', executed: false },
  { id: 'activation-adoption-timing-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[ACTIVATION_CANDIDATE_KEY]) {
    window[ACTIVATION_CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      mode: ACTIVATION_CANDIDATE_ADOPTION.mode,
      checks: [],
    };
  }

  return window[ACTIVATION_CANDIDATE_KEY];
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
    activationRehearsal: safeCallSummary('ippoStartupExtractionActivationRehearsalRuntimeSummary'),
    activationPlanning: safeCallSummary('ippoGuardedStartupExtractionActivationPlanningSummary'),
    planningRuntime: safeCallSummary('ippoStartupOwnershipExtractionPlanningRuntimeSummary'),
    adoptionRuntime: safeCallSummary('ippoStartupExtractionAdoptionCandidateRuntimeSummary'),
  };
}

function summarizeActivationAdoptionReadiness(dependencies) {
  const rehearsalReady = !!(
    dependencies.activationRehearsal &&
    !dependencies.activationRehearsal.error &&
    dependencies.activationRehearsal.safeForBundle08Planning
  );

  const activationPlanningReady = !!(
    dependencies.activationPlanning &&
    !dependencies.activationPlanning.error &&
    dependencies.activationPlanning.safeForBundle07Planning
  );

  return {
    rehearsalReady,
    activationPlanningReady,
    activationAdoptionReady: rehearsalReady && activationPlanningReady,
    activationExecuted: false,
  };
}

function summarizeActivationAdoptionCompare(dependencies) {
  const rehearsalComparable = !!(
    dependencies.activationRehearsal &&
    !dependencies.activationRehearsal.error &&
    dependencies.activationRehearsal.extractionActivationRehearsalCompareRuntime &&
    dependencies.activationRehearsal.extractionActivationRehearsalCompareRuntime.rehearsalComparable
  );

  const adoptionComparable = !!(
    dependencies.adoptionRuntime &&
    !dependencies.adoptionRuntime.error &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare.runtimeComparable
  );

  return {
    rehearsalComparable,
    adoptionComparable,
    activationComparable: rehearsalComparable && adoptionComparable,
    activationExecuted: false,
  };
}

function summarizeActivationAdoptionFallback(dependencies) {
  const rehearsal = dependencies.activationRehearsal;

  return {
    fallbackReady: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.activationFallbackRehearsalRuntime &&
      rehearsal.activationFallbackRehearsalRuntime.fallbackReady
    ),
    candidateComparable: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.activationFallbackRehearsalRuntime &&
      rehearsal.activationFallbackRehearsalRuntime.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeActivationAdoptionTiming(dependencies) {
  const rehearsal = dependencies.activationRehearsal;

  return {
    timingVisible: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.activationTimingRehearsalVisibility
    ),
    timingComparable: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.activationTimingRehearsalVisibility &&
      rehearsal.activationTimingRehearsalVisibility.timingComparable
    ),
    activationExecuted: false,
  };
}

function summarizeStartupExtractionActivationCandidateRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeActivationAdoptionReadiness(dependencies);
  const compare = summarizeActivationAdoptionCompare(dependencies);
  const fallback = summarizeActivationAdoptionFallback(dependencies);
  const timing = summarizeActivationAdoptionTiming(dependencies);

  return {
    bundle: '08/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: ACTIVATION_CANDIDATE_ADOPTION,
    activationCandidatePhases: ACTIVATION_CANDIDATE_PHASES,
    activationAdoptionReadinessGraph: readiness,
    activationAdoptionCompareRuntime: compare,
    activationAdoptionFallbackVisibility: fallback,
    activationAdoptionTimingVisibility: timing,
    safeForBundle09Planning:
      readiness.activationAdoptionReady &&
      compare.activationComparable &&
      fallback.fallbackReady &&
      fallback.candidateComparable &&
      timing.timingComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionActivationCandidateRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeStartupExtractionActivationCandidateRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    activationAdoptionReady: summary.activationAdoptionReadinessGraph.activationAdoptionReady,
    activationComparable: summary.activationAdoptionCompareRuntime.activationComparable,
    safeForBundle09Planning: summary.safeForBundle09Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-activation-candidate-runtime-check', {
      reason: reason || 'manual',
      activationAdoptionReady: summary.activationAdoptionReadinessGraph.activationAdoptionReady,
      activationComparable: summary.activationAdoptionCompareRuntime.activationComparable,
      safeForBundle09Planning: summary.safeForBundle09Planning,
    });
  }

  return summarizeStartupExtractionActivationCandidateRuntime();
}

window.ippoStartupExtractionActivationCandidateRuntimeSummary = summarizeStartupExtractionActivationCandidateRuntime;
window.ippoRunStartupExtractionActivationCandidateRuntimeCheck = runStartupExtractionActivationCandidateRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-activation-candidate-runtime-loaded', {
    bundle: '08/20',
    mode: ACTIVATION_CANDIDATE_ADOPTION.mode,
  });
}

export {
  ACTIVATION_CANDIDATE_ADOPTION,
  ACTIVATION_CANDIDATE_PHASES,
  summarizeStartupExtractionActivationCandidateRuntime,
  runStartupExtractionActivationCandidateRuntimeCheck,
};
