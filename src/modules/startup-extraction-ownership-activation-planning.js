// ============================================================
// ippo – startup-extraction-ownership-activation-planning.js
//
// Bundle 09/20:
// Startup extraction ownership activation planning.
//
// observe-only only.
// ============================================================

const OWNERSHIP_ACTIVATION_KEY = '__ippoStartupExtractionOwnershipActivationPlanning';

const OWNERSHIP_ACTIVATION_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'ownership-activation-planning-observe-only',
  ownershipActivationAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const OWNERSHIP_ACTIVATION_PHASES = Object.freeze([
  { id: 'ownership-activation-planning-graph', executed: false },
  { id: 'activation-ownership-readiness-runtime', executed: false },
  { id: 'ownership-activation-compare-runtime', executed: false },
  { id: 'activation-ownership-fallback-planning', executed: false },
  { id: 'ownership-activation-dependency-graph', executed: false },
  { id: 'guarded-ownership-activation-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[OWNERSHIP_ACTIVATION_KEY]) {
    window[OWNERSHIP_ACTIVATION_KEY] = {
      loadedAt: nowIso(),
      mode: OWNERSHIP_ACTIVATION_ADOPTION.mode,
      checks: [],
    };
  }

  return window[OWNERSHIP_ACTIVATION_KEY];
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
    activationCandidate: safeCallSummary('ippoStartupExtractionActivationCandidateRuntimeSummary'),
    activationRehearsal: safeCallSummary('ippoStartupExtractionActivationRehearsalRuntimeSummary'),
    activationPlanning: safeCallSummary('ippoGuardedStartupExtractionActivationPlanningSummary'),
    planningRuntime: safeCallSummary('ippoStartupOwnershipExtractionPlanningRuntimeSummary'),
  };
}

function summarizeOwnershipActivationReadiness(dependencies) {
  const activationCandidateReady = !!(
    dependencies.activationCandidate &&
    !dependencies.activationCandidate.error &&
    dependencies.activationCandidate.safeForBundle09Planning
  );

  const planningReady = !!(
    dependencies.activationPlanning &&
    !dependencies.activationPlanning.error &&
    dependencies.activationPlanning.safeForBundle07Planning
  );

  return {
    activationCandidateReady,
    planningReady,
    ownershipActivationReady: activationCandidateReady && planningReady,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipActivationCompare(dependencies) {
  const activationComparable = !!(
    dependencies.activationCandidate &&
    !dependencies.activationCandidate.error &&
    dependencies.activationCandidate.activationAdoptionCompareRuntime &&
    dependencies.activationCandidate.activationAdoptionCompareRuntime.activationComparable
  );

  const rehearsalComparable = !!(
    dependencies.activationRehearsal &&
    !dependencies.activationRehearsal.error &&
    dependencies.activationRehearsal.extractionActivationRehearsalCompareRuntime &&
    dependencies.activationRehearsal.extractionActivationRehearsalCompareRuntime.rehearsalComparable
  );

  return {
    activationComparable,
    rehearsalComparable,
    ownershipComparable: activationComparable && rehearsalComparable,
    ownershipTransferred: false,
  };
}

function summarizeOwnershipFallbackPlanning(dependencies) {
  const activationCandidate = dependencies.activationCandidate;

  return {
    fallbackReady: !!(
      activationCandidate &&
      !activationCandidate.error &&
      activationCandidate.activationAdoptionFallbackVisibility &&
      activationCandidate.activationAdoptionFallbackVisibility.fallbackReady
    ),
    candidateComparable: !!(
      activationCandidate &&
      !activationCandidate.error &&
      activationCandidate.activationAdoptionFallbackVisibility &&
      activationCandidate.activationAdoptionFallbackVisibility.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeStartupExtractionOwnershipActivationPlanning() {
  const state = getState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeOwnershipActivationReadiness(dependencies);
  const compare = summarizeOwnershipActivationCompare(dependencies);
  const fallback = summarizeOwnershipFallbackPlanning(dependencies);

  return {
    bundle: '09/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: OWNERSHIP_ACTIVATION_ADOPTION,
    ownershipActivationPhases: OWNERSHIP_ACTIVATION_PHASES,
    activationOwnershipReadinessRuntime: readiness,
    ownershipActivationCompareRuntime: compare,
    activationOwnershipFallbackPlanning: fallback,
    ownershipActivationDependencyGraph: {
      activationCandidateReady: !!dependencies.activationCandidate && !dependencies.activationCandidate.error,
      activationRehearsalReady: !!dependencies.activationRehearsal && !dependencies.activationRehearsal.error,
      activationPlanningReady: !!dependencies.activationPlanning && !dependencies.activationPlanning.error,
      planningRuntimeReady: !!dependencies.planningRuntime && !dependencies.planningRuntime.error,
    },
    guardedOwnershipActivationVisibility: {
      ownershipActivationReady: readiness.ownershipActivationReady,
      ownershipComparable: compare.ownershipComparable,
      fallbackReady: fallback.fallbackReady,
      ownershipTransferred: false,
    },
    safeForBundle10Planning:
      readiness.ownershipActivationReady &&
      compare.ownershipComparable &&
      fallback.fallbackReady &&
      fallback.candidateComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionOwnershipActivationPlanningCheck(reason) {
  const state = getState();
  const summary = summarizeStartupExtractionOwnershipActivationPlanning();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    ownershipActivationReady: summary.activationOwnershipReadinessRuntime.ownershipActivationReady,
    ownershipComparable: summary.ownershipActivationCompareRuntime.ownershipComparable,
    safeForBundle10Planning: summary.safeForBundle10Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-ownership-activation-planning-check', {
      reason: reason || 'manual',
      ownershipActivationReady: summary.activationOwnershipReadinessRuntime.ownershipActivationReady,
      ownershipComparable: summary.ownershipActivationCompareRuntime.ownershipComparable,
      safeForBundle10Planning: summary.safeForBundle10Planning,
    });
  }

  return summarizeStartupExtractionOwnershipActivationPlanning();
}

window.ippoStartupExtractionOwnershipActivationPlanningSummary = summarizeStartupExtractionOwnershipActivationPlanning;
window.ippoRunStartupExtractionOwnershipActivationPlanningCheck = runStartupExtractionOwnershipActivationPlanningCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-ownership-activation-planning-loaded', {
    bundle: '09/20',
    mode: OWNERSHIP_ACTIVATION_ADOPTION.mode,
  });
}

export {
  OWNERSHIP_ACTIVATION_ADOPTION,
  OWNERSHIP_ACTIVATION_PHASES,
  summarizeStartupExtractionOwnershipActivationPlanning,
  runStartupExtractionOwnershipActivationPlanningCheck,
};
