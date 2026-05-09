// ============================================================
// ippo – startup-extraction-adoption-candidate-runtime.js
//
// Bundle 04/20:
// Startup extraction adoption candidate runtime.
//
// 目的:
// limited startup extraction rehearsal layer の上で、startup adoption
// candidate runtime visibility を形成する。
//
// 重要:
// - observe-only
// - candidate startup is not executed
// - ownership transfer is not performed
// - limited adoption is not performed
// ============================================================

const ADOPTION_RUNTIME_KEY = '__ippoStartupExtractionAdoptionCandidateRuntime';

const ADOPTION_RUNTIME_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'startup-adoption-candidate-runtime-observe-only',
  candidateExecutionAllowed: false,
  limitedAdoptionAllowed: false,
  ownershipTransferAllowed: false,
});

const ADOPTION_RUNTIME_PHASES = Object.freeze([
  {
    id: 'candidate-runtime-visibility',
    executed: false,
  },
  {
    id: 'limited-adoption-visibility',
    executed: false,
  },
  {
    id: 'guarded-runtime-compare',
    executed: false,
  },
  {
    id: 'adoption-timing-visibility',
    executed: false,
  },
  {
    id: 'adoption-fallback-visibility',
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

function getRuntimeState() {
  if (!window[ADOPTION_RUNTIME_KEY]) {
    window[ADOPTION_RUNTIME_KEY] = {
      loadedAt: nowIso(),
      mode: ADOPTION_RUNTIME_ADOPTION.mode,
      checks: [],
    };
  }

  return window[ADOPTION_RUNTIME_KEY];
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
    rehearsal: safeCallSummary('ippoLimitedStartupExtractionRehearsalSummary'),
    guardedGate: safeCallSummary('ippoStartupExtractionGuardedGateSummary'),
    extractionShell: safeCallSummary('ippoStartupExtractionCandidateShellSummary'),
    ownershipShadow: safeCallSummary('ippoStartupOwnershipShadowRuntimeSummary'),
  };
}

function summarizeAdoptionGraph(dependencies) {
  const rehearsalReady = !!(
    dependencies.rehearsal &&
    !dependencies.rehearsal.error &&
    dependencies.rehearsal.safeForBundle04Planning
  );

  const guardedReady = !!(
    dependencies.guardedGate &&
    !dependencies.guardedGate.error &&
    dependencies.guardedGate.guardedAdoptionReadiness &&
    dependencies.guardedGate.guardedAdoptionReadiness.safeForLimitedRehearsalPlanning
  );

  return {
    rehearsalReady,
    guardedReady,
    adoptionGraphReady: rehearsalReady && guardedReady,
    candidateExecuted: false,
    limitedAdoptionExecuted: false,
  };
}

function summarizeGuardedAdoptionRuntimeCompare(dependencies) {
  const shellComparable = !!(
    dependencies.extractionShell &&
    !dependencies.extractionShell.error &&
    dependencies.extractionShell.appHtmlShellCompare &&
    dependencies.extractionShell.appHtmlShellCompare.comparable
  );

  const shadowComparable = !!(
    dependencies.ownershipShadow &&
    !dependencies.ownershipShadow.error &&
    dependencies.ownershipShadow.ownershipCompareRuntime &&
    dependencies.ownershipShadow.ownershipCompareRuntime.candidateComparable
  );

  return {
    shellComparable,
    shadowComparable,
    runtimeComparable: shellComparable && shadowComparable,
    candidateExecuted: false,
  };
}

function summarizeAdoptionTimingVisibility(dependencies) {
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
    candidateExecuted: false,
  };
}

function summarizeAdoptionFallbackVisibility(dependencies) {
  const rehearsal = dependencies.rehearsal;

  return {
    fallbackVisible: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.guardedFallbackRehearsal &&
      rehearsal.guardedFallbackRehearsal.fallbackReady
    ),
    duplicateInitClear: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.guardedFallbackRehearsal &&
      rehearsal.guardedFallbackRehearsal.duplicateInitClear
    ),
    hydrationRaceClear: !!(
      rehearsal &&
      !rehearsal.error &&
      rehearsal.guardedFallbackRehearsal &&
      rehearsal.guardedFallbackRehearsal.hydrationRaceClear
    ),
    fallbackExecuted: false,
  };
}

function summarizeStartupExtractionAdoptionCandidateRuntime() {
  const state = getRuntimeState();
  const dependencies = summarizeDependencies();
  const adoptionGraph = summarizeAdoptionGraph(dependencies);
  const runtimeCompare = summarizeGuardedAdoptionRuntimeCompare(dependencies);
  const timingVisibility = summarizeAdoptionTimingVisibility(dependencies);
  const fallbackVisibility = summarizeAdoptionFallbackVisibility(dependencies);

  return {
    bundle: '04/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: ADOPTION_RUNTIME_ADOPTION,
    adoptionRuntimePhases: ADOPTION_RUNTIME_PHASES,
    startupExtractionAdoptionGraph: adoptionGraph,
    guardedAdoptionRuntimeCompare: runtimeCompare,
    adoptionTimingVisibility: timingVisibility,
    adoptionFallbackVisibility: fallbackVisibility,
    safeForBundle05Planning:
      adoptionGraph.adoptionGraphReady &&
      runtimeCompare.runtimeComparable &&
      timingVisibility.timingComparable &&
      fallbackVisibility.fallbackVisible &&
      fallbackVisibility.duplicateInitClear &&
      fallbackVisibility.hydrationRaceClear,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionAdoptionCandidateRuntimeCheck(reason) {
  const state = getRuntimeState();
  const summary = summarizeStartupExtractionAdoptionCandidateRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    adoptionGraphReady: summary.startupExtractionAdoptionGraph.adoptionGraphReady,
    runtimeComparable: summary.guardedAdoptionRuntimeCompare.runtimeComparable,
    safeForBundle05Planning: summary.safeForBundle05Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-adoption-candidate-runtime-check', {
      reason: reason || 'manual',
      adoptionGraphReady: summary.startupExtractionAdoptionGraph.adoptionGraphReady,
      runtimeComparable: summary.guardedAdoptionRuntimeCompare.runtimeComparable,
      safeForBundle05Planning: summary.safeForBundle05Planning,
    });
  }

  return summarizeStartupExtractionAdoptionCandidateRuntime();
}

window.ippoStartupExtractionAdoptionCandidateRuntimeSummary = summarizeStartupExtractionAdoptionCandidateRuntime;
window.ippoRunStartupExtractionAdoptionCandidateRuntimeCheck = runStartupExtractionAdoptionCandidateRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-adoption-candidate-runtime-loaded', {
    bundle: '04/20',
    mode: ADOPTION_RUNTIME_ADOPTION.mode,
  });
}

export {
  ADOPTION_RUNTIME_ADOPTION,
  ADOPTION_RUNTIME_PHASES,
  summarizeStartupExtractionAdoptionCandidateRuntime,
  runStartupExtractionAdoptionCandidateRuntimeCheck,
};
