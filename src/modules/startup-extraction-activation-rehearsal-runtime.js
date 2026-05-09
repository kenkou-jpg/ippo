// ============================================================
// ippo – startup-extraction-activation-rehearsal-runtime.js
//
// Bundle 07/20:
// Startup extraction activation rehearsal runtime.
//
// observe-only only.
// ============================================================

const ACTIVATION_REHEARSAL_KEY = '__ippoStartupExtractionActivationRehearsalRuntime';

const ACTIVATION_REHEARSAL_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'activation-rehearsal-observe-only',
  rehearsalActivationAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const ACTIVATION_REHEARSAL_SEQUENCES = Object.freeze([
  { id: 'activation-sequencing-rehearsal', executed: false },
  { id: 'activation-runtime-compare-rehearsal', executed: false },
  { id: 'activation-fallback-rehearsal', executed: false },
  { id: 'guarded-activation-rehearsal', executed: false },
  { id: 'activation-timing-rehearsal', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[ACTIVATION_REHEARSAL_KEY]) {
    window[ACTIVATION_REHEARSAL_KEY] = {
      loadedAt: nowIso(),
      mode: ACTIVATION_REHEARSAL_ADOPTION.mode,
      checks: [],
    };
  }

  return window[ACTIVATION_REHEARSAL_KEY];
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
    activationPlanning: safeCallSummary('ippoGuardedStartupExtractionActivationPlanningSummary'),
    planningRuntime: safeCallSummary('ippoStartupOwnershipExtractionPlanningRuntimeSummary'),
    adoptionRuntime: safeCallSummary('ippoStartupExtractionAdoptionCandidateRuntimeSummary'),
    rehearsal: safeCallSummary('ippoLimitedStartupExtractionRehearsalSummary'),
  };
}

function summarizeActivationRehearsalGraph(dependencies) {
  const planningReady = !!(
    dependencies.activationPlanning &&
    !dependencies.activationPlanning.error &&
    dependencies.activationPlanning.safeForBundle07Planning
  );

  const extractionReady = !!(
    dependencies.planningRuntime &&
    !dependencies.planningRuntime.error &&
    dependencies.planningRuntime.safeForBundle06Planning
  );

  return {
    planningReady,
    extractionReady,
    rehearsalGraphReady: planningReady && extractionReady,
    rehearsalExecuted: false,
  };
}

function summarizeActivationRehearsalCompare(dependencies) {
  const activationComparable = !!(
    dependencies.activationPlanning &&
    !dependencies.activationPlanning.error &&
    dependencies.activationPlanning.startupExtractionActivationCompareRuntime &&
    dependencies.activationPlanning.startupExtractionActivationCompareRuntime.runtimeComparable
  );

  const adoptionComparable = !!(
    dependencies.adoptionRuntime &&
    !dependencies.adoptionRuntime.error &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare.runtimeComparable
  );

  return {
    activationComparable,
    adoptionComparable,
    rehearsalComparable: activationComparable && adoptionComparable,
    rehearsalExecuted: false,
  };
}

function summarizeActivationFallbackRehearsal(dependencies) {
  const planning = dependencies.activationPlanning;

  return {
    fallbackReady: !!(
      planning &&
      !planning.error &&
      planning.guardedActivationFallbackVisibility &&
      planning.guardedActivationFallbackVisibility.fallbackRecoveryReady
    ),
    candidateComparable: !!(
      planning &&
      !planning.error &&
      planning.guardedActivationFallbackVisibility &&
      planning.guardedActivationFallbackVisibility.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeActivationTimingRehearsal(dependencies) {
  const rehearsal = dependencies.rehearsal;

  return {
    timingVisible: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.rehearsalTimingVisibility
    ),
    timingComparable: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.rehearsalTimingVisibility &&
      rehearsal.rehearsalTimingVisibility.timingComparable
    ),
    rehearsalExecuted: false,
  };
}

function summarizeStartupExtractionActivationRehearsalRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const rehearsalGraph = summarizeActivationRehearsalGraph(dependencies);
  const rehearsalCompare = summarizeActivationRehearsalCompare(dependencies);
  const fallbackRehearsal = summarizeActivationFallbackRehearsal(dependencies);
  const timingRehearsal = summarizeActivationTimingRehearsal(dependencies);

  return {
    bundle: '07/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: ACTIVATION_REHEARSAL_ADOPTION,
    activationRehearsalSequences: ACTIVATION_REHEARSAL_SEQUENCES,
    startupExtractionActivationRehearsalGraph: rehearsalGraph,
    extractionActivationRehearsalCompareRuntime: rehearsalCompare,
    activationFallbackRehearsalRuntime: fallbackRehearsal,
    activationTimingRehearsalVisibility: timingRehearsal,
    safeForBundle08Planning:
      rehearsalGraph.rehearsalGraphReady &&
      rehearsalCompare.rehearsalComparable &&
      fallbackRehearsal.fallbackReady &&
      fallbackRehearsal.candidateComparable &&
      timingRehearsal.timingComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionActivationRehearsalRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeStartupExtractionActivationRehearsalRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    rehearsalGraphReady: summary.startupExtractionActivationRehearsalGraph.rehearsalGraphReady,
    rehearsalComparable: summary.extractionActivationRehearsalCompareRuntime.rehearsalComparable,
    safeForBundle08Planning: summary.safeForBundle08Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-activation-rehearsal-runtime-check', {
      reason: reason || 'manual',
      rehearsalGraphReady: summary.startupExtractionActivationRehearsalGraph.rehearsalGraphReady,
      rehearsalComparable: summary.extractionActivationRehearsalCompareRuntime.rehearsalComparable,
      safeForBundle08Planning: summary.safeForBundle08Planning,
    });
  }

  return summarizeStartupExtractionActivationRehearsalRuntime();
}

window.ippoStartupExtractionActivationRehearsalRuntimeSummary = summarizeStartupExtractionActivationRehearsalRuntime;
window.ippoRunStartupExtractionActivationRehearsalRuntimeCheck = runStartupExtractionActivationRehearsalRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-activation-rehearsal-runtime-loaded', {
    bundle: '07/20',
    mode: ACTIVATION_REHEARSAL_ADOPTION.mode,
  });
}

export {
  ACTIVATION_REHEARSAL_ADOPTION,
  ACTIVATION_REHEARSAL_SEQUENCES,
  summarizeStartupExtractionActivationRehearsalRuntime,
  runStartupExtractionActivationRehearsalRuntimeCheck,
};
