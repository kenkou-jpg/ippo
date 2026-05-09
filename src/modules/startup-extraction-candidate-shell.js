// ============================================================
// ippo – startup-extraction-candidate-shell.js
//
// Bundle 01/20 – Phase A-8:
// Startup ownership extraction candidate shell.
//
// 目的:
// app.html inline startup ownership を Vite runtime 側へ移す前に、
// candidate shell / extraction boundary / safety gate を形成する。
//
// 重要:
// - observe-only
// - candidate startup is not executed
// - ownership transfer is not performed
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// - render / hydration / save / sync / Supabase は変更しない
// ============================================================

const STARTUP_EXTRACTION_CANDIDATE_KEY = '__ippoStartupExtractionCandidateShell';

const STARTUP_EXTRACTION_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'candidate-shell-observe-only',
  currentOwner: 'legacy-app-html-inline-startup',
  candidateOwner: 'vite-startup-extraction-shell',
  fallbackOwner: 'legacy-app-html-inline-startup',
  candidateExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const STARTUP_EXTRACTION_BOUNDARIES = Object.freeze([
  {
    id: 'app-html-startup-boundary',
    currentOwner: 'app.html inline startup',
    candidateOwner: 'startup extraction shell',
    status: 'shadow-only',
  },
  {
    id: 'domcontentloaded-boundary',
    currentOwner: 'legacy DOMContentLoaded listener',
    candidateOwner: 'future Vite startup handler',
    status: 'blocked-from-adoption',
  },
  {
    id: 'init-call-boundary',
    currentOwner: 'legacy init()',
    candidateOwner: 'startup ownership candidate',
    status: 'blocked-from-execution',
  },
  {
    id: 'first-render-boundary',
    currentOwner: 'legacy render flow',
    candidateOwner: 'future render boundary runtime',
    status: 'observe-only',
  },
  {
    id: 'hydration-boundary',
    currentOwner: 'legacy hydration flow',
    candidateOwner: 'future hydration sequencing runtime',
    status: 'observe-only',
  },
]);

const CANDIDATE_SHELL_STEPS = Object.freeze([
  {
    id: 'prepare-startup-shell',
    description: 'create candidate startup shell visibility',
    executes: false,
  },
  {
    id: 'compare-app-html-startup',
    description: 'compare legacy app.html startup with candidate shell readiness',
    executes: false,
  },
  {
    id: 'verify-fallback-before-adoption',
    description: 'confirm legacy fallback remains available before any future adoption',
    executes: false,
  },
  {
    id: 'validate-extraction-gate',
    description: 'validate candidate extraction safety gate',
    executes: false,
  },
]);

const EXTRACTION_SAFETY_RULES = Object.freeze([
  {
    id: 'fallback-required',
    description: 'legacy fallback must be ready before candidate shell can proceed',
  },
  {
    id: 'shadow-runtime-required',
    description: 'startup ownership shadow runtime must be ready',
  },
  {
    id: 'observer-injection-required',
    description: 'main entry startup observer injection must be ready',
  },
  {
    id: 'no-candidate-execution',
    description: 'candidate startup must remain non-executed',
  },
  {
    id: 'no-ownership-transfer',
    description: 'ownership transfer must remain disabled',
  },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getCandidateState() {
  if (!window[STARTUP_EXTRACTION_CANDIDATE_KEY]) {
    window[STARTUP_EXTRACTION_CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      mode: STARTUP_EXTRACTION_ADOPTION.mode,
      adoptionEnabled: STARTUP_EXTRACTION_ADOPTION.enabled,
      candidateExecutionAllowed: STARTUP_EXTRACTION_ADOPTION.candidateExecutionAllowed,
      ownershipTransferAllowed: STARTUP_EXTRACTION_ADOPTION.ownershipTransferAllowed,
      checks: [],
    };
  }

  return window[STARTUP_EXTRACTION_CANDIDATE_KEY];
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
    startupOwnershipShadow: safeCallSummary('ippoStartupOwnershipShadowRuntimeSummary'),
    mainEntryWiring: safeCallSummary('ippoMainEntryStartupObserverWiringSummary'),
    startupOrchestration: safeCallSummary('ippoStartupSequencingCandidateOrchestrationSummary'),
    fallbackIsolation: safeCallSummary('ippoLegacyBootstrapFallbackIsolationSummary'),
    runtimeSequencing: safeCallSummary('ippoRuntimeSequencingSummary'),
  };
}

function summarizeDependencyReadiness(dependencies) {
  return {
    startupOwnershipShadowReady: !!dependencies.startupOwnershipShadow && !dependencies.startupOwnershipShadow.error,
    mainEntryWiringReady: !!dependencies.mainEntryWiring && !dependencies.mainEntryWiring.error,
    startupOrchestrationReady: !!dependencies.startupOrchestration && !dependencies.startupOrchestration.error,
    fallbackIsolationReady: !!dependencies.fallbackIsolation && !dependencies.fallbackIsolation.error,
    runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
  };
}

function summarizeAppHtmlStartupShellCompare(dependencies) {
  const fallbackReady = !!(
    dependencies.fallbackIsolation &&
    !dependencies.fallbackIsolation.error &&
    dependencies.fallbackIsolation.fallbackReady
  );

  const shadowReady = !!(
    dependencies.startupOwnershipShadow &&
    !dependencies.startupOwnershipShadow.error &&
    dependencies.startupOwnershipShadow.ownershipCompareRuntime &&
    dependencies.startupOwnershipShadow.ownershipCompareRuntime.candidateComparable
  );

  return {
    legacyShell: 'app.html inline startup shell',
    candidateShell: 'vite startup extraction candidate shell',
    compareMode: 'visibility-only',
    fallbackReady,
    shadowReady,
    comparable: fallbackReady && shadowReady,
    candidateExecuted: false,
    ownershipTransferred: false,
  };
}

function summarizeExtractionCandidateGate({ dependencies, readiness, appHtmlShellCompare }) {
  const readinessValues = Object.keys(readiness).map((key) => readiness[key]);
  const dependenciesReady = readinessValues.every(Boolean);

  const mainEntrySafe = !!(
    dependencies.mainEntryWiring &&
    !dependencies.mainEntryWiring.error &&
    dependencies.mainEntryWiring.safeForObserveOnlyMainEntryWiring
  );

  const shadowSafe = !!(
    dependencies.startupOwnershipShadow &&
    !dependencies.startupOwnershipShadow.error &&
    dependencies.startupOwnershipShadow.safeForPhaseA8Planning
  );

  return {
    rules: EXTRACTION_SAFETY_RULES,
    dependenciesReady,
    mainEntrySafe,
    shadowSafe,
    shellComparable: appHtmlShellCompare.comparable,
    candidateExecutionAllowed: false,
    ownershipTransferAllowed: false,
    gateOpenForLimitedAdoption: false,
    safeForNextGuardedGatePlanning:
      dependenciesReady &&
      mainEntrySafe &&
      shadowSafe &&
      appHtmlShellCompare.comparable,
  };
}

function summarizeStartupExtractionCandidateShell() {
  const state = getCandidateState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeDependencyReadiness(dependencies);
  const appHtmlShellCompare = summarizeAppHtmlStartupShellCompare(dependencies);
  const extractionCandidateGate = summarizeExtractionCandidateGate({
    dependencies,
    readiness,
    appHtmlShellCompare,
  });

  return {
    bundle: '01/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      candidateExecutionAllowed: !!state.candidateExecutionAllowed,
      ownershipTransferAllowed: !!state.ownershipTransferAllowed,
      currentOwner: STARTUP_EXTRACTION_ADOPTION.currentOwner,
      candidateOwner: STARTUP_EXTRACTION_ADOPTION.candidateOwner,
      fallbackOwner: STARTUP_EXTRACTION_ADOPTION.fallbackOwner,
    },
    extractionBoundaries: STARTUP_EXTRACTION_BOUNDARIES,
    candidateShellSteps: CANDIDATE_SHELL_STEPS,
    dependencyReadiness: readiness,
    appHtmlShellCompare,
    extractionCandidateGate,
    safeForBundle02Planning:
      !state.adoptionEnabled &&
      !state.candidateExecutionAllowed &&
      !state.ownershipTransferAllowed &&
      extractionCandidateGate.safeForNextGuardedGatePlanning,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionCandidateShellCheck(reason) {
  const state = getCandidateState();
  const summary = summarizeStartupExtractionCandidateShell();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    shellComparable: summary.appHtmlShellCompare.comparable,
    gateReady: summary.extractionCandidateGate.safeForNextGuardedGatePlanning,
    safeForBundle02Planning: summary.safeForBundle02Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-candidate-shell-check', {
      reason: reason || 'manual',
      shellComparable: summary.appHtmlShellCompare.comparable,
      gateReady: summary.extractionCandidateGate.safeForNextGuardedGatePlanning,
      safeForBundle02Planning: summary.safeForBundle02Planning,
    });
  }

  if (!summary.safeForBundle02Planning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-extraction-candidate-shell-not-ready', {
      dependencyReadiness: summary.dependencyReadiness,
      appHtmlShellCompare: summary.appHtmlShellCompare,
      extractionCandidateGate: summary.extractionCandidateGate,
    });
  }

  return summarizeStartupExtractionCandidateShell();
}

window.ippoStartupExtractionCandidateShellSummary = summarizeStartupExtractionCandidateShell;
window.ippoRunStartupExtractionCandidateShellCheck = runStartupExtractionCandidateShellCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-candidate-shell-loaded', {
    bundle: '01/20',
    mode: STARTUP_EXTRACTION_ADOPTION.mode,
    adoptionEnabled: STARTUP_EXTRACTION_ADOPTION.enabled,
    candidateExecutionAllowed: STARTUP_EXTRACTION_ADOPTION.candidateExecutionAllowed,
    ownershipTransferAllowed: STARTUP_EXTRACTION_ADOPTION.ownershipTransferAllowed,
  });
}

export {
  STARTUP_EXTRACTION_ADOPTION,
  STARTUP_EXTRACTION_BOUNDARIES,
  CANDIDATE_SHELL_STEPS,
  EXTRACTION_SAFETY_RULES,
  summarizeStartupExtractionCandidateShell,
  runStartupExtractionCandidateShellCheck,
};
