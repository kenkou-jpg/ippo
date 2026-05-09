// ============================================================
// ippo – limited-startup-extraction-rehearsal.js
//
// Bundle 03/20:
// Limited startup extraction rehearsal.
//
// 目的:
// guarded startup extraction planning layer の上で、limited rehearsal
// sequencing / compare runtime / fallback visibility を形成する。
//
// 重要:
// - observe-only
// - rehearsal is visibility-only
// - candidate startup is not executed
// - ownership transfer is not performed
// - init() は呼ばない / 置換しない
// ============================================================

const LIMITED_REHEARSAL_KEY = '__ippoLimitedStartupExtractionRehearsal';

const LIMITED_REHEARSAL_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'limited-rehearsal-observe-only',
  rehearsalExecutionAllowed: false,
  candidateExecutionAllowed: false,
  ownershipTransferAllowed: false,
});

const LIMITED_REHEARSAL_SEQUENCES = Object.freeze([
  {
    id: 'startup-shell-visibility-sequence',
    executed: false,
  },
  {
    id: 'fallback-compare-sequence',
    executed: false,
  },
  {
    id: 'startup-timing-compare-sequence',
    executed: false,
  },
  {
    id: 'guarded-rehearsal-sequence',
    executed: false,
  },
  {
    id: 'limited-adoption-readiness-sequence',
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

function getRehearsalState() {
  if (!window[LIMITED_REHEARSAL_KEY]) {
    window[LIMITED_REHEARSAL_KEY] = {
      loadedAt: nowIso(),
      mode: LIMITED_REHEARSAL_ADOPTION.mode,
      checks: [],
    };
  }

  return window[LIMITED_REHEARSAL_KEY];
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
    guardedGate: safeCallSummary('ippoStartupExtractionGuardedGateSummary'),
    extractionShell: safeCallSummary('ippoStartupExtractionCandidateShellSummary'),
    ownershipShadow: safeCallSummary('ippoStartupOwnershipShadowRuntimeSummary'),
    orchestration: safeCallSummary('ippoStartupSequencingCandidateOrchestrationSummary'),
    fallbackIsolation: safeCallSummary('ippoLegacyBootstrapFallbackIsolationSummary'),
  };
}

function summarizeExtractionCompareRuntime(dependencies) {
  const shellComparable = !!(
    dependencies.extractionShell &&
    !dependencies.extractionShell.error &&
    dependencies.extractionShell.appHtmlShellCompare &&
    dependencies.extractionShell.appHtmlShellCompare.comparable
  );

  const guardedComparable = !!(
    dependencies.guardedGate &&
    !dependencies.guardedGate.error &&
    dependencies.guardedGate.fallbackCompareRuntime &&
    dependencies.guardedGate.fallbackCompareRuntime.comparable
  );

  return {
    shellComparable,
    guardedComparable,
    extractionComparable: shellComparable && guardedComparable,
    candidateExecuted: false,
  };
}

function summarizeRehearsalTimingVisibility(dependencies) {
  const orchestration = dependencies.orchestration;

  return {
    timingVisible: !!(
      orchestration &&
      !orchestration.error &&
      orchestration.timingVisibility
    ),
    timingComparable: !!(
      orchestration &&
      !orchestration.error &&
      orchestration.timingVisibility &&
      orchestration.timingVisibility.timingComparable
    ),
    candidateExecuted: false,
  };
}

function summarizeGuardedFallbackRehearsal(dependencies) {
  const fallback = dependencies.fallbackIsolation;

  return {
    fallbackReady: !!(
      fallback &&
      !fallback.error &&
      fallback.fallbackReady
    ),
    duplicateInitClear: !!(
      fallback &&
      !fallback.error &&
      fallback.duplicateInitDetection &&
      !fallback.duplicateInitDetection.possibleDuplicateInit
    ),
    hydrationRaceClear: !!(
      fallback &&
      !fallback.error &&
      fallback.hydrationRaceDetection &&
      !fallback.hydrationRaceDetection.possibleHydrationRace
    ),
    rehearsalExecuted: false,
  };
}

function summarizeLimitedStartupExtractionRehearsal() {
  const state = getRehearsalState();
  const dependencies = summarizeDependencies();
  const extractionCompare = summarizeExtractionCompareRuntime(dependencies);
  const timingVisibility = summarizeRehearsalTimingVisibility(dependencies);
  const fallbackRehearsal = summarizeGuardedFallbackRehearsal(dependencies);

  const guardedReady = !!(
    dependencies.guardedGate &&
    !dependencies.guardedGate.error &&
    dependencies.guardedGate.safeForBundle03Planning
  );

  return {
    bundle: '03/20',
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: LIMITED_REHEARSAL_ADOPTION,
    rehearsalSequences: LIMITED_REHEARSAL_SEQUENCES,
    extractionCompareRuntime: extractionCompare,
    rehearsalTimingVisibility: timingVisibility,
    guardedFallbackRehearsal: fallbackRehearsal,
    guardedReady,
    safeForBundle04Planning:
      guardedReady &&
      extractionCompare.extractionComparable &&
      timingVisibility.timingComparable &&
      fallbackRehearsal.fallbackReady &&
      fallbackRehearsal.duplicateInitClear &&
      fallbackRehearsal.hydrationRaceClear,
    checks: state.checks.slice(-20),
  };
}

function runLimitedStartupExtractionRehearsalCheck(reason) {
  const state = getRehearsalState();
  const summary = summarizeLimitedStartupExtractionRehearsal();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    extractionComparable: summary.extractionCompareRuntime.extractionComparable,
    timingComparable: summary.rehearsalTimingVisibility.timingComparable,
    safeForBundle04Planning: summary.safeForBundle04Planning,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('limited-startup-extraction-rehearsal-check', {
      reason: reason || 'manual',
      extractionComparable: summary.extractionCompareRuntime.extractionComparable,
      timingComparable: summary.rehearsalTimingVisibility.timingComparable,
      safeForBundle04Planning: summary.safeForBundle04Planning,
    });
  }

  return summarizeLimitedStartupExtractionRehearsal();
}

window.ippoLimitedStartupExtractionRehearsalSummary = summarizeLimitedStartupExtractionRehearsal;
window.ippoRunLimitedStartupExtractionRehearsalCheck = runLimitedStartupExtractionRehearsalCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-startup-extraction-rehearsal-loaded', {
    bundle: '03/20',
    mode: LIMITED_REHEARSAL_ADOPTION.mode,
  });
}

export {
  LIMITED_REHEARSAL_ADOPTION,
  LIMITED_REHEARSAL_SEQUENCES,
  summarizeLimitedStartupExtractionRehearsal,
  runLimitedStartupExtractionRehearsalCheck,
};
