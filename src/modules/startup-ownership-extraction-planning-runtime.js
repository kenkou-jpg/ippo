// ============================================================
// ippo – startup-ownership-extraction-planning-runtime.js
//
// Bundle 05/20:
// Startup ownership extraction planning runtime.
//
// 目的:
// startup extraction adoption candidate runtime の上で、
// startup ownership extraction readiness/runtime planning を形成する。
//
// 重要:
// - observe-only
// - no ownership transfer
// - no startup execution
// - no DOMContentLoaded transfer
// ============================================================

const EXTRACTION_PLANNING_KEY = '__ippoStartupOwnershipExtractionPlanningRuntime';

const EXTRACTION_PLANNING_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'startup-ownership-extraction-planning-observe-only',
  startupExecutionAllowed: false,
  ownershipTransferAllowed: false,
  extractionActivationAllowed: false,
});

const EXTRACTION_PLANNING_PHASES = Object.freeze([
  {
    id: 'startup-extraction-readiness',
    executed: false,
  },
  {
    id: 'ownership-extraction-planning',
    executed: false,
  },
  {
    id: 'guarded-extraction-planning-runtime',
    executed: false,
  },
  {
    id: 'extraction-adoption-sequencing',
    executed: false,
  },
  {
    id: 'fallback-readiness-planning',
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

function getPlanningState() {
  if (!window[EXTRACTION_PLANNING_KEY]) {
    window[EXTRACTION_PLANNING_KEY] = {
      loadedAt: nowIso(),
      mode: EXTRACTION_PLANNING_ADOPTION.mode,
      checks: [],
    };
  }

  return window[EXTRACTION_PLANNING_KEY];
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
    adoptionRuntime: safeCallSummary('ippoStartupExtractionAdoptionCandidateRuntimeSummary'),
    rehearsal: safeCallSummary('ippoLimitedStartupExtractionRehearsalSummary'),
    guardedGate: safeCallSummary('ippoStartupExtractionGuardedGateSummary'),
    ownershipShadow: safeCallSummary('ippoStartupOwnershipShadowRuntimeSummary'),
    runtimeSequencing: safeCallSummary('ippoRuntimeSequencingSummary'),
  };
}

function summarizeExtractionReadinessRuntime(dependencies) {
  const adoptionReady = !!(
    dependencies.adoptionRuntime &&
    !dependencies.adoptionRuntime.error &&
    dependencies.adoptionRuntime.safeForBundle05Planning
  );

  const sequencingReady = !!(
    dependencies.runtimeSequencing &&
    !dependencies.runtimeSequencing.error &&
    dependencies.runtimeSequencing.startupOwnershipExtractionReady
  );

  return {
    adoptionReady,
    sequencingReady,
    extractionReadinessReady: adoptionReady && sequencingReady,
    startupExecuted: false,
  };
}

function summarizeExtractionDependencyGraph(dependencies) {
  return {
    adoptionRuntimeReady: !!dependencies.adoptionRuntime && !dependencies.adoptionRuntime.error,
    rehearsalReady: !!dependencies.rehearsal && !dependencies.rehearsal.error,
    guardedGateReady: !!dependencies.guardedGate && !dependencies.guardedGate.error,
    ownershipShadowReady: !!dependencies.ownershipShadow && !dependencies.ownershipShadow.error,
    runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
  };
}

function summarizeExtractionFallbackPlanning(dependencies) {
  const shadow = dependencies.ownershipShadow;

  return {
    fallbackRecoveryReady: !!(
      shadow &&
      !shadow.error &&
      shadow.fallbackRecoveryRehearsal &&
      shadow.fallbackRecoveryRehearsal.recoveryRehearsalPassed
    ),
    candidateComparable: !!(
      shadow &&
      !shadow.error &&
      shadow.ownershipCompareRuntime &&
      shadow.ownershipCompareRuntime.candidateComparable
    ),
    fallbackPlanningExecuted: false,
  };
}

function summarizeStartupOwnershipExtractionPlanningRuntime() {
  const state = getPlanningState();
  const dependencies = summarizeDependencies();
  const extractionReadiness = summarizeExtractionReadinessRuntime(dependencies);
  const dependencyGraph = summarizeExtractionDependencyGraph(dependencies);
  const fallbackPlanning = summarizeExtractionFallbackPlanning(dependencies);

  const dependencyReady = Object.keys(dependencyGraph)
    .map((key) => dependencyGraph[key])
    .every(Boolean);

  return {
    bundle: '05/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: EXTRACTION_PLANNING_ADOPTION,
    extractionPlanningPhases: EXTRACTION_PLANNING_PHASES,
    startupExtractionReadinessRuntime: extractionReadiness,
    extractionDependencyReadinessGraph: dependencyGraph,
    extractionFallbackReadinessPlanning: fallbackPlanning,
    guardedStartupExtractionPlanningRuntime: {
      dependencyReady,
      extractionReadinessReady: extractionReadiness.extractionReadinessReady,
      fallbackRecoveryReady: fallbackPlanning.fallbackRecoveryReady,
      startupExecuted: false,
      ownershipTransferred: false,
    },
    safeForBundle06Planning:
      dependencyReady &&
      extractionReadiness.extractionReadinessReady &&
      fallbackPlanning.fallbackRecoveryReady &&
      fallbackPlanning.candidateComparable,
    checks: state.checks.slice(-20),
  };
}

function runStartupOwnershipExtractionPlanningRuntimeCheck(reason) {
  const state = getPlanningState();
  const summary = summarizeStartupOwnershipExtractionPlanningRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    extractionReadinessReady: summary.startupExtractionReadinessRuntime.extractionReadinessReady,
    dependencyReady: summary.guardedStartupExtractionPlanningRuntime.dependencyReady,
    safeForBundle06Planning: summary.safeForBundle06Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-ownership-extraction-planning-runtime-check', {
      reason: reason || 'manual',
      extractionReadinessReady: summary.startupExtractionReadinessRuntime.extractionReadinessReady,
      dependencyReady: summary.guardedStartupExtractionPlanningRuntime.dependencyReady,
      safeForBundle06Planning: summary.safeForBundle06Planning,
    });
  }

  return summarizeStartupOwnershipExtractionPlanningRuntime();
}

window.ippoStartupOwnershipExtractionPlanningRuntimeSummary = summarizeStartupOwnershipExtractionPlanningRuntime;
window.ippoRunStartupOwnershipExtractionPlanningRuntimeCheck = runStartupOwnershipExtractionPlanningRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-ownership-extraction-planning-runtime-loaded', {
    bundle: '05/20',
    mode: EXTRACTION_PLANNING_ADOPTION.mode,
  });
}

export {
  EXTRACTION_PLANNING_ADOPTION,
  EXTRACTION_PLANNING_PHASES,
  summarizeStartupOwnershipExtractionPlanningRuntime,
  runStartupOwnershipExtractionPlanningRuntimeCheck,
};
