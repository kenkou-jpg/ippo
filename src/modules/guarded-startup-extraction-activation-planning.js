// ============================================================
// ippo – guarded-startup-extraction-activation-planning.js
//
// Bundle 06/20:
// Guarded startup extraction activation planning.
//
// 目的:
// startup ownership extraction planning runtime の上で、
// guarded extraction activation readiness/runtime planning を形成する。
//
// observe-only only.
// ============================================================

const ACTIVATION_PLANNING_KEY = '__ippoGuardedStartupExtractionActivationPlanning';

const ACTIVATION_PLANNING_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'guarded-activation-planning-observe-only',
  activationAllowed: false,
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const ACTIVATION_PLANNING_STAGES = Object.freeze([
  { id: 'activation-readiness-runtime', executed: false },
  { id: 'activation-sequencing-visibility', executed: false },
  { id: 'activation-runtime-compare', executed: false },
  { id: 'activation-fallback-visibility', executed: false },
  { id: 'activation-dependency-readiness', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getActivationState() {
  if (!window[ACTIVATION_PLANNING_KEY]) {
    window[ACTIVATION_PLANNING_KEY] = {
      loadedAt: nowIso(),
      mode: ACTIVATION_PLANNING_ADOPTION.mode,
      checks: [],
    };
  }

  return window[ACTIVATION_PLANNING_KEY];
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
    planningRuntime: safeCallSummary('ippoStartupOwnershipExtractionPlanningRuntimeSummary'),
    adoptionRuntime: safeCallSummary('ippoStartupExtractionAdoptionCandidateRuntimeSummary'),
    rehearsal: safeCallSummary('ippoLimitedStartupExtractionRehearsalSummary'),
    runtimeSequencing: safeCallSummary('ippoRuntimeSequencingSummary'),
  };
}

function summarizeActivationReadiness(dependencies) {
  const planningReady = !!(
    dependencies.planningRuntime &&
    !dependencies.planningRuntime.error &&
    dependencies.planningRuntime.safeForBundle06Planning
  );

  const runtimeReady = !!(
    dependencies.runtimeSequencing &&
    !dependencies.runtimeSequencing.error &&
    dependencies.runtimeSequencing.startupOwnershipExtractionReady
  );

  return {
    planningReady,
    runtimeReady,
    activationReady: planningReady && runtimeReady,
    activationExecuted: false,
  };
}

function summarizeActivationRuntimeCompare(dependencies) {
  const adoptionComparable = !!(
    dependencies.adoptionRuntime &&
    !dependencies.adoptionRuntime.error &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare &&
    dependencies.adoptionRuntime.guardedAdoptionRuntimeCompare.runtimeComparable
  );

  const rehearsalComparable = !!(
    dependencies.rehearsal &&
    !dependencies.rehearsal.error &&
    dependencies.rehearsal.extractionCompareRuntime &&
    dependencies.rehearsal.extractionCompareRuntime.extractionComparable
  );

  return {
    adoptionComparable,
    rehearsalComparable,
    runtimeComparable: adoptionComparable && rehearsalComparable,
    activationExecuted: false,
  };
}

function summarizeActivationFallbackVisibility(dependencies) {
  const planning = dependencies.planningRuntime;

  return {
    fallbackRecoveryReady: !!(
      planning &&
      !planning.error &&
      planning.extractionFallbackReadinessPlanning &&
      planning.extractionFallbackReadinessPlanning.fallbackRecoveryReady
    ),
    candidateComparable: !!(
      planning &&
      !planning.error &&
      planning.extractionFallbackReadinessPlanning &&
      planning.extractionFallbackReadinessPlanning.candidateComparable
    ),
    fallbackExecuted: false,
  };
}

function summarizeGuardedStartupExtractionActivationPlanning() {
  const state = getActivationState();
  const dependencies = summarizeDependencies();
  const activationReadiness = summarizeActivationReadiness(dependencies);
  const runtimeCompare = summarizeActivationRuntimeCompare(dependencies);
  const fallbackVisibility = summarizeActivationFallbackVisibility(dependencies);

  return {
    bundle: '06/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: ACTIVATION_PLANNING_ADOPTION,
    activationPlanningStages: ACTIVATION_PLANNING_STAGES,
    startupExtractionActivationReadiness: activationReadiness,
    startupExtractionActivationCompareRuntime: runtimeCompare,
    guardedActivationFallbackVisibility: fallbackVisibility,
    activationDependencyReadiness: {
      planningRuntimeReady: !!dependencies.planningRuntime && !dependencies.planningRuntime.error,
      adoptionRuntimeReady: !!dependencies.adoptionRuntime && !dependencies.adoptionRuntime.error,
      rehearsalReady: !!dependencies.rehearsal && !dependencies.rehearsal.error,
      runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
    },
    safeForBundle07Planning:
      activationReadiness.activationReady &&
      runtimeCompare.runtimeComparable &&
      fallbackVisibility.fallbackRecoveryReady &&
      fallbackVisibility.candidateComparable,
    checks: state.checks.slice(-20),
  };
}

function runGuardedStartupExtractionActivationPlanningCheck(reason) {
  const state = getActivationState();
  const summary = summarizeGuardedStartupExtractionActivationPlanning();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    activationReady: summary.startupExtractionActivationReadiness.activationReady,
    runtimeComparable: summary.startupExtractionActivationCompareRuntime.runtimeComparable,
    safeForBundle07Planning: summary.safeForBundle07Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('guarded-startup-extraction-activation-planning-check', {
      reason: reason || 'manual',
      activationReady: summary.startupExtractionActivationReadiness.activationReady,
      runtimeComparable: summary.startupExtractionActivationCompareRuntime.runtimeComparable,
      safeForBundle07Planning: summary.safeForBundle07Planning,
    });
  }

  return summarizeGuardedStartupExtractionActivationPlanning();
}

window.ippoGuardedStartupExtractionActivationPlanningSummary = summarizeGuardedStartupExtractionActivationPlanning;
window.ippoRunGuardedStartupExtractionActivationPlanningCheck = runGuardedStartupExtractionActivationPlanningCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('guarded-startup-extraction-activation-planning-loaded', {
    bundle: '06/20',
    mode: ACTIVATION_PLANNING_ADOPTION.mode,
  });
}

export {
  ACTIVATION_PLANNING_ADOPTION,
  ACTIVATION_PLANNING_STAGES,
  summarizeGuardedStartupExtractionActivationPlanning,
  runGuardedStartupExtractionActivationPlanningCheck,
};
