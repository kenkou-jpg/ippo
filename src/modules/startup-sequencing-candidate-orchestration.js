// ============================================================
// ippo – startup-sequencing-candidate-orchestration.js
//
// Phase A-4:
// Startup sequencing candidate orchestration visibility.
//
// 目的:
// app.html startup ownership extraction 前に、candidate startup sequence を
// 実行せずに orchestration graph と timing readiness と比較可能性を可視化する。
//
// 重要:
// - observe-only
// - candidate execution is not invoked
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// - render / hydration / save / sync / Supabase は変更しない
// ============================================================

const STARTUP_ORCHESTRATION_KEY = '__ippoStartupSequencingCandidateOrchestration';

const STARTUP_ORCHESTRATION_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'candidate-orchestration-observe-only',
  candidateOwner: 'vite-bootstrap-runtime',
  legacyOwner: 'legacy-app-html-inline-startup',
  fallbackRequired: true,
});

const CANDIDATE_SEQUENCE_STEPS = Object.freeze([
  {
    id: 'boot-stability-ready',
    owner: 'boot-stability',
    executes: false,
  },
  {
    id: 'bootstrap-shell-ready',
    owner: 'bootstrap-shell',
    executes: false,
  },
  {
    id: 'startup-boundary-ready',
    owner: 'startup-boundary-adapter',
    executes: false,
  },
  {
    id: 'ownership-prep-ready',
    owner: 'bootstrap-ownership-prep',
    executes: false,
  },
  {
    id: 'startup-guard-ready',
    owner: 'startup-guard-candidate',
    executes: false,
  },
  {
    id: 'fallback-isolation-ready',
    owner: 'legacy-bootstrap-fallback-isolation',
    executes: false,
  },
  {
    id: 'deferred-hydration-ready',
    owner: 'deferred-hydration-prep',
    executes: false,
  },
  {
    id: 'render-boundary-ready',
    owner: 'render-boundary-prep',
    executes: false,
  },
]);

const NON_ADOPTED_EXECUTION_MAP = Object.freeze([
  {
    id: 'candidate-init',
    legacyEquivalent: 'init',
    candidateAction: 'not-executed',
    adoptionAllowed: false,
  },
  {
    id: 'candidate-domcontentloaded-handler',
    legacyEquivalent: 'DOMContentLoaded inline listener',
    candidateAction: 'not-installed',
    adoptionAllowed: false,
  },
  {
    id: 'candidate-first-render',
    legacyEquivalent: 'legacy render flow',
    candidateAction: 'not-executed',
    adoptionAllowed: false,
  },
  {
    id: 'candidate-hydration',
    legacyEquivalent: 'legacy hydration flow',
    candidateAction: 'not-executed',
    adoptionAllowed: false,
  },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getOrchestrationState() {
  if (!window[STARTUP_ORCHESTRATION_KEY]) {
    window[STARTUP_ORCHESTRATION_KEY] = {
      loadedAt: nowIso(),
      mode: STARTUP_ORCHESTRATION_ADOPTION.mode,
      adoptionEnabled: STARTUP_ORCHESTRATION_ADOPTION.enabled,
      checks: [],
    };
  }

  return window[STARTUP_ORCHESTRATION_KEY];
}

function callSummary(fnName) {
  try {
    if (typeof window[fnName] === 'function') {
      return window[fnName]();
    }
  } catch (error) {
    return {
      error: true,
      message: error && error.message ? error.message : String(error),
    };
  }

  return null;
}

function summarizeGraphAvailability() {
  return {
    bootStability: typeof window.ippoBootSummary === 'function',
    bootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    startupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    bootstrapOwnershipPrep: typeof window.ippoBootstrapOwnershipPrepSummary === 'function',
    startupGuardCandidate: typeof window.ippoStartupGuardCandidateSummary === 'function',
    fallbackIsolation: typeof window.ippoLegacyBootstrapFallbackIsolationSummary === 'function',
    runtimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    deferredHydrationPrep: typeof window.ippoDeferredHydrationPrepSummary === 'function',
    renderBoundary: typeof window.ippoRenderBoundarySummary === 'function',
  };
}

function summarizeCandidateStepReadiness(graphs) {
  return CANDIDATE_SEQUENCE_STEPS.map((step) => {
    let ready = false;

    if (step.owner === 'boot-stability') ready = graphs.bootStability;
    if (step.owner === 'bootstrap-shell') ready = graphs.bootstrapShell;
    if (step.owner === 'startup-boundary-adapter') ready = graphs.startupBoundary;
    if (step.owner === 'bootstrap-ownership-prep') ready = graphs.bootstrapOwnershipPrep;
    if (step.owner === 'startup-guard-candidate') ready = graphs.startupGuardCandidate;
    if (step.owner === 'legacy-bootstrap-fallback-isolation') ready = graphs.fallbackIsolation;
    if (step.owner === 'deferred-hydration-prep') ready = graphs.deferredHydrationPrep;
    if (step.owner === 'render-boundary-prep') ready = graphs.renderBoundary;

    return {
      ...step,
      ready,
    };
  });
}

function summarizeTimingVisibility() {
  const boot = callSummary('ippoBootSummary');
  const events = boot && Array.isArray(boot.events) ? boot.events : [];

  const eventNames = events
    .map((event) => event && (event.name || event.event || event.type))
    .filter(Boolean);

  return {
    bootSummaryAvailable: !!boot,
    bootEventCount: events.length,
    observedEventNames: eventNames.slice(-30),
    hasMainEntryStart: eventNames.includes('main-entry-start'),
    hasBootstrapShellLoaded: eventNames.includes('bootstrap-shell-module-loaded'),
    hasStartupBoundaryLoaded: eventNames.includes('startup-boundary-adapter-loaded'),
    hasFallbackIsolationLoaded: eventNames.includes('legacy-bootstrap-fallback-isolation-loaded'),
    timingComparable: events.length > 0,
  };
}

function summarizeDeferredStartupReadiness() {
  const deferred = callSummary('ippoDeferredHydrationPrepSummary');
  const render = callSummary('ippoRenderBoundarySummary');
  const activation = callSummary('ippoScreenActivationPrepSummary');

  return {
    deferredHydrationAvailable: !!deferred && !deferred.error,
    renderBoundaryAvailable: !!render && !render.error,
    screenActivationAvailable: !!activation && !activation.error,
    safeForDeferredStartupPlanning:
      !!deferred &&
      !deferred.error &&
      !!render &&
      !render.error,
    summaries: {
      deferredHydration: deferred,
      renderBoundary: render,
      screenActivation: activation,
    },
  };
}

function summarizeStartupSequencingCandidateOrchestration() {
  const state = getOrchestrationState();
  const graphs = summarizeGraphAvailability();
  const missingGraphs = Object.keys(graphs).filter((key) => !graphs[key]);
  const candidateStepReadiness = summarizeCandidateStepReadiness(graphs);
  const notReadySteps = candidateStepReadiness.filter((step) => !step.ready).map((step) => step.id);
  const timingVisibility = summarizeTimingVisibility();
  const deferredStartupReadiness = summarizeDeferredStartupReadiness();
  const fallbackIsolation = callSummary('ippoLegacyBootstrapFallbackIsolationSummary');

  const fallbackReady = !!(
    fallbackIsolation &&
    !fallbackIsolation.error &&
    fallbackIsolation.fallbackReady
  );

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      candidateOwner: STARTUP_ORCHESTRATION_ADOPTION.candidateOwner,
      legacyOwner: STARTUP_ORCHESTRATION_ADOPTION.legacyOwner,
      fallbackRequired: STARTUP_ORCHESTRATION_ADOPTION.fallbackRequired,
    },
    graphAvailability: graphs,
    missingGraphs,
    candidateSequenceSteps: candidateStepReadiness,
    notReadySteps,
    nonAdoptedExecutionMap: NON_ADOPTED_EXECUTION_MAP,
    timingVisibility,
    deferredStartupReadiness,
    fallbackReady,
    startupSequencingCompareRuntime: {
      legacyPath: 'legacy-app-html-inline-startup',
      candidatePath: 'vite-bootstrap-runtime-candidate',
      compareMode: 'runtime-visibility-only',
      comparable:
        missingGraphs.length === 0 &&
        fallbackReady &&
        timingVisibility.timingComparable,
      candidateExecuted: false,
      adoptionAllowed: false,
    },
    safeForPhaseA5Planning:
      !state.adoptionEnabled &&
      missingGraphs.length === 0 &&
      fallbackReady &&
      timingVisibility.timingComparable &&
      deferredStartupReadiness.safeForDeferredStartupPlanning,
    checks: state.checks.slice(-20),
  };
}

function runStartupSequencingCandidateOrchestrationCheck(reason) {
  const state = getOrchestrationState();
  const summary = summarizeStartupSequencingCandidateOrchestration();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    fallbackReady: summary.fallbackReady,
    missingGraphs: summary.missingGraphs,
    notReadySteps: summary.notReadySteps,
    timingComparable: summary.timingVisibility.timingComparable,
    safeForPhaseA5Planning: summary.safeForPhaseA5Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-sequencing-candidate-orchestration-check', {
      reason: reason || 'manual',
      fallbackReady: summary.fallbackReady,
      missingGraphCount: summary.missingGraphs.length,
      notReadyStepCount: summary.notReadySteps.length,
      timingComparable: summary.timingVisibility.timingComparable,
      safeForPhaseA5Planning: summary.safeForPhaseA5Planning,
    });
  }

  if (!summary.safeForPhaseA5Planning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-sequencing-candidate-orchestration-not-ready', {
      missingGraphs: summary.missingGraphs,
      notReadySteps: summary.notReadySteps,
      fallbackReady: summary.fallbackReady,
      timingVisibility: summary.timingVisibility,
    });
  }

  return summarizeStartupSequencingCandidateOrchestration();
}

window.ippoStartupSequencingCandidateOrchestrationSummary = summarizeStartupSequencingCandidateOrchestration;
window.ippoRunStartupSequencingCandidateOrchestrationCheck = runStartupSequencingCandidateOrchestrationCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-sequencing-candidate-orchestration-loaded', {
    mode: STARTUP_ORCHESTRATION_ADOPTION.mode,
    adoptionEnabled: STARTUP_ORCHESTRATION_ADOPTION.enabled,
  });
}

export {
  STARTUP_ORCHESTRATION_ADOPTION,
  CANDIDATE_SEQUENCE_STEPS,
  NON_ADOPTED_EXECUTION_MAP,
  summarizeStartupSequencingCandidateOrchestration,
  runStartupSequencingCandidateOrchestrationCheck,
};
