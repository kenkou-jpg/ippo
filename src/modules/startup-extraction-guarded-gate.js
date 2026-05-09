// ============================================================
// ippo – startup-extraction-guarded-gate.js
//
// Bundle 02/20:
// Startup extraction guarded gate.
//
// 目的:
// startup extraction candidate shell の上に guarded adoption planning
// layer を形成し、limited extraction rehearsal readiness を可視化する。
//
// 重要:
// - observe-only
// - candidate startup is not executed
// - ownership transfer is not performed
// - guarded gate never opens real adoption
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// ============================================================

const GUARDED_GATE_KEY = '__ippoStartupExtractionGuardedGate';

const GUARDED_GATE_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'guarded-gate-observe-only',
  candidateExecutionAllowed: false,
  ownershipTransferAllowed: false,
  guardedLimitedAdoptionAllowed: false,
});

const GUARDED_GATE_STAGES = Object.freeze([
  {
    id: 'dependency-validation',
    description: 'validate extraction dependencies before guarded planning',
    executed: false,
  },
  {
    id: 'fallback-validation',
    description: 'validate fallback path before limited rehearsal planning',
    executed: false,
  },
  {
    id: 'shadow-runtime-validation',
    description: 'validate ownership shadow runtime before guarded gate planning',
    executed: false,
  },
  {
    id: 'limited-rehearsal-readiness',
    description: 'prepare limited startup extraction rehearsal visibility',
    executed: false,
  },
  {
    id: 'guarded-adoption-readiness',
    description: 'validate guarded adoption sequencing readiness',
    executed: false,
  },
]);

const EXTRACTION_GUARDS = Object.freeze([
  {
    id: 'no-real-startup-adoption',
    enforced: true,
  },
  {
    id: 'no-real-domcontentloaded-transfer',
    enforced: true,
  },
  {
    id: 'no-real-init-transfer',
    enforced: true,
  },
  {
    id: 'fallback-must-remain-live',
    enforced: true,
  },
  {
    id: 'candidate-startup-must-remain-shadow-only',
    enforced: true,
  },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getGateState() {
  if (!window[GUARDED_GATE_KEY]) {
    window[GUARDED_GATE_KEY] = {
      loadedAt: nowIso(),
      mode: GUARDED_GATE_ADOPTION.mode,
      adoptionEnabled: GUARDED_GATE_ADOPTION.enabled,
      checks: [],
    };
  }

  return window[GUARDED_GATE_KEY];
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
    extractionShell: safeCallSummary('ippoStartupExtractionCandidateShellSummary'),
    ownershipShadow: safeCallSummary('ippoStartupOwnershipShadowRuntimeSummary'),
    runtimeSequencing: safeCallSummary('ippoRuntimeSequencingSummary'),
    fallbackIsolation: safeCallSummary('ippoLegacyBootstrapFallbackIsolationSummary'),
    orchestration: safeCallSummary('ippoStartupSequencingCandidateOrchestrationSummary'),
  };
}

function summarizeDependencyReadiness(dependencies) {
  return {
    extractionShellReady: !!dependencies.extractionShell && !dependencies.extractionShell.error,
    ownershipShadowReady: !!dependencies.ownershipShadow && !dependencies.ownershipShadow.error,
    runtimeSequencingReady: !!dependencies.runtimeSequencing && !dependencies.runtimeSequencing.error,
    fallbackIsolationReady: !!dependencies.fallbackIsolation && !dependencies.fallbackIsolation.error,
    orchestrationReady: !!dependencies.orchestration && !dependencies.orchestration.error,
  };
}

function summarizeFallbackCompareRuntime(dependencies) {
  const fallbackReady = !!(
    dependencies.fallbackIsolation &&
    !dependencies.fallbackIsolation.error &&
    dependencies.fallbackIsolation.fallbackReady
  );

  const recoveryReady = !!(
    dependencies.ownershipShadow &&
    !dependencies.ownershipShadow.error &&
    dependencies.ownershipShadow.fallbackRecoveryRehearsal &&
    dependencies.ownershipShadow.fallbackRecoveryRehearsal.recoveryRehearsalPassed
  );

  return {
    fallbackReady,
    recoveryReady,
    comparable: fallbackReady && recoveryReady,
    recoveryExecuted: false,
  };
}

function summarizeGuardedAdoptionReadiness({ readiness, fallbackCompare }) {
  const dependenciesReady = Object.keys(readiness)
    .map((key) => readiness[key])
    .every(Boolean);

  return {
    dependenciesReady,
    fallbackComparable: fallbackCompare.comparable,
    candidateExecutionAllowed: false,
    ownershipTransferAllowed: false,
    guardedLimitedAdoptionAllowed: false,
    safeForLimitedRehearsalPlanning:
      dependenciesReady && fallbackCompare.comparable,
  };
}

function summarizeStartupExtractionGuardedGate() {
  const state = getGateState();
  const dependencies = summarizeDependencies();
  const readiness = summarizeDependencyReadiness(dependencies);
  const fallbackCompare = summarizeFallbackCompareRuntime(dependencies);
  const guardedReadiness = summarizeGuardedAdoptionReadiness({
    readiness,
    fallbackCompare,
  });

  return {
    bundle: '02/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      candidateExecutionAllowed: GUARDED_GATE_ADOPTION.candidateExecutionAllowed,
      ownershipTransferAllowed: GUARDED_GATE_ADOPTION.ownershipTransferAllowed,
      guardedLimitedAdoptionAllowed: GUARDED_GATE_ADOPTION.guardedLimitedAdoptionAllowed,
    },
    guardedGateStages: GUARDED_GATE_STAGES,
    extractionGuards: EXTRACTION_GUARDS,
    dependencyReadiness: readiness,
    fallbackCompareRuntime: fallbackCompare,
    guardedAdoptionReadiness: guardedReadiness,
    safeForBundle03Planning:
      !state.adoptionEnabled &&
      guardedReadiness.safeForLimitedRehearsalPlanning,
    checks: state.checks.slice(-20),
  };
}

function runStartupExtractionGuardedGateCheck(reason) {
  const state = getGateState();
  const summary = summarizeStartupExtractionGuardedGate();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    fallbackComparable: summary.fallbackCompareRuntime.comparable,
    guardedReady: summary.guardedAdoptionReadiness.safeForLimitedRehearsalPlanning,
    safeForBundle03Planning: summary.safeForBundle03Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-extraction-guarded-gate-check', {
      reason: reason || 'manual',
      fallbackComparable: summary.fallbackCompareRuntime.comparable,
      guardedReady: summary.guardedAdoptionReadiness.safeForLimitedRehearsalPlanning,
      safeForBundle03Planning: summary.safeForBundle03Planning,
    });
  }

  return summarizeStartupExtractionGuardedGate();
}

window.ippoStartupExtractionGuardedGateSummary = summarizeStartupExtractionGuardedGate;
window.ippoRunStartupExtractionGuardedGateCheck = runStartupExtractionGuardedGateCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-extraction-guarded-gate-loaded', {
    bundle: '02/20',
    mode: GUARDED_GATE_ADOPTION.mode,
    guardedLimitedAdoptionAllowed: GUARDED_GATE_ADOPTION.guardedLimitedAdoptionAllowed,
  });
}

export {
  GUARDED_GATE_ADOPTION,
  GUARDED_GATE_STAGES,
  EXTRACTION_GUARDS,
  summarizeStartupExtractionGuardedGate,
  runStartupExtractionGuardedGateCheck,
};
