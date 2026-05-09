// ============================================================
// ippo – render-boundary-extraction-planning-runtime.js
//
// Bundle 15/20:
// Render boundary extraction planning runtime.
//
// observe-only only.
// ============================================================

const RENDER_PLANNING_KEY = '__ippoRenderBoundaryExtractionPlanningRuntime';

const RENDER_PLANNING_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'render-boundary-extraction-planning-observe-only',
  renderBoundaryExtractionAllowed: false,
  renderOwnershipTransferAllowed: false,
  renderActivationAllowed: false,
});

const RENDER_PLANNING_PHASES = Object.freeze([
  { id: 'render-boundary-planning-graph', executed: false },
  { id: 'render-ownership-readiness-runtime', executed: false },
  { id: 'render-compare-runtime', executed: false },
  { id: 'render-fallback-planning', executed: false },
  { id: 'render-dependency-readiness-graph', executed: false },
  { id: 'guarded-render-visibility', executed: false },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[RENDER_PLANNING_KEY]) {
    window[RENDER_PLANNING_KEY] = {
      loadedAt: nowIso(),
      mode: RENDER_PLANNING_ADOPTION.mode,
      checks: [],
    };
  }

  return window[RENDER_PLANNING_KEY];
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
    hydrationCandidate: safeCallSummary('ippoHydrationCandidateRuntimeSummary'),
    renderBoundaryPrep: safeCallSummary('ippoRenderBoundaryPrepSummary'),
    screenActivationPrep: safeCallSummary('ippoScreenActivationPrepSummary'),
    runtimeOwnershipGraph: safeCallSummary('ippoRuntimeOwnershipGraphSummary'),
  };
}

function summarizeRenderOwnershipReadiness(dependencies) {
  const hydrationReady = !!(
    dependencies.hydrationCandidate &&
    !dependencies.hydrationCandidate.error &&
    dependencies.hydrationCandidate.safeForBundle15Planning
  );

  const renderPrepReady = !!(
    dependencies.renderBoundaryPrep &&
    !dependencies.renderBoundaryPrep.error
  );

  return {
    hydrationReady,
    renderPrepReady,
    renderOwnershipReady: hydrationReady && renderPrepReady,
    renderTransferred: false,
  };
}

function summarizeRenderCompareRuntime(dependencies) {
  const hydrationComparable = !!(
    dependencies.hydrationCandidate &&
    !dependencies.hydrationCandidate.error &&
    dependencies.hydrationCandidate.hydrationAdoptionCompareRuntime &&
    dependencies.hydrationCandidate.hydrationAdoptionCompareRuntime.hydrationComparable
  );

  const ownershipGraphReady = !!(
    dependencies.runtimeOwnershipGraph &&
    !dependencies.runtimeOwnershipGraph.error
  );

  return {
    hydrationComparable,
    ownershipGraphReady,
    renderComparable: hydrationComparable && ownershipGraphReady,
    renderTransferred: false,
  };
}

function summarizeRenderFallbackPlanning(dependencies) {
  const screenActivationPrep = dependencies.screenActivationPrep;

  return {
    screenActivationReady: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    fallbackPlanningReady: !!(
      screenActivationPrep &&
      !screenActivationPrep.error
    ),
    fallbackExecuted: false,
  };
}

function summarizeRenderBoundaryExtractionPlanningRuntime() {
  const state = getState();
  const dependencies = summarizeDependencies();

  const readiness = summarizeRenderOwnershipReadiness(dependencies);
  const compare = summarizeRenderCompareRuntime(dependencies);
  const fallback = summarizeRenderFallbackPlanning(dependencies);

  return {
    bundle: '15/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: RENDER_PLANNING_ADOPTION,
    renderPlanningPhases: RENDER_PLANNING_PHASES,
    renderOwnershipReadinessRuntime: readiness,
    renderCompareRuntime: compare,
    renderFallbackPlanning: fallback,
    renderDependencyReadinessGraph: {
      hydrationCandidateReady: !!dependencies.hydrationCandidate && !dependencies.hydrationCandidate.error,
      renderBoundaryPrepReady: !!dependencies.renderBoundaryPrep && !dependencies.renderBoundaryPrep.error,
      screenActivationPrepReady: !!dependencies.screenActivationPrep && !dependencies.screenActivationPrep.error,
      runtimeOwnershipGraphReady: !!dependencies.runtimeOwnershipGraph && !dependencies.runtimeOwnershipGraph.error,
    },
    guardedRenderVisibility: {
      renderOwnershipReady: readiness.renderOwnershipReady,
      renderComparable: compare.renderComparable,
      fallbackPlanningReady: fallback.fallbackPlanningReady,
      renderTransferred: false,
    },
    safeForBundle16Planning:
      readiness.renderOwnershipReady &&
      compare.renderComparable &&
      fallback.fallbackPlanningReady,
    checks: state.checks.slice(-20),
  };
}

function runRenderBoundaryExtractionPlanningRuntimeCheck(reason) {
  const state = getState();
  const summary = summarizeRenderBoundaryExtractionPlanningRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    renderOwnershipReady: summary.renderOwnershipReadinessRuntime.renderOwnershipReady,
    renderComparable: summary.renderCompareRuntime.renderComparable,
    safeForBundle16Planning: summary.safeForBundle16Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('render-boundary-extraction-planning-runtime-check', {
      reason: reason || 'manual',
      renderOwnershipReady: summary.renderOwnershipReadinessRuntime.renderOwnershipReady,
      renderComparable: summary.renderCompareRuntime.renderComparable,
      safeForBundle16Planning: summary.safeForBundle16Planning,
    });
  }

  return summarizeRenderBoundaryExtractionPlanningRuntime();
}

window.ippoRenderBoundaryExtractionPlanningRuntimeSummary = summarizeRenderBoundaryExtractionPlanningRuntime;
window.ippoRunRenderBoundaryExtractionPlanningRuntimeCheck = runRenderBoundaryExtractionPlanningRuntimeCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('render-boundary-extraction-planning-runtime-loaded', {
    bundle: '15/20',
    mode: RENDER_PLANNING_ADOPTION.mode,
  });
}

export {
  RENDER_PLANNING_ADOPTION,
  RENDER_PLANNING_PHASES,
  summarizeRenderBoundaryExtractionPlanningRuntime,
  runRenderBoundaryExtractionPlanningRuntimeCheck,
};
