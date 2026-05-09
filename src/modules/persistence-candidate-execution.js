// ============================================================
// ippo – persistence-candidate-execution.js
//
// module-owned persistence execution candidate bundle.
//
// observe-only / shadow-only.
// 既存 save / persistence / sync 実行経路は変更しない。
// ============================================================

const CANDIDATE_KEY = '__ippoPersistenceCandidateExecution';

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[CANDIDATE_KEY]) {
    window[CANDIDATE_KEY] = {
      loadedAt: nowIso(),
      mode: 'shadow-only',
      candidateExecutionEnabled: false,
      guardedExecutionEnabled: false,
      checks: [],
      shadows: [],
      rollbacks: [],
    };
  }

  return window[CANDIDATE_KEY];
}

function cloneSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return null;
  }
}

function inspectCandidateInputs() {
  const state = window.state;
  const records = Array.isArray(state && state.records) ? state.records : [];
  const latestRecord = records.length ? records[records.length - 1] : null;

  return {
    stateExists: !!state && typeof state === 'object',
    recordsIsArray: Array.isArray(state && state.records),
    recordsLength: records.length,
    latestRecordDate: latestRecord && (latestRecord.date || latestRecord.recordDate || null),
    hasSaveState: typeof window.saveState === 'function',
    hasPersistRecordState: typeof window.persistRecordState === 'function',
    hasSyncRecordCloud: typeof window.syncRecordCloud === 'function',
    hasFinalizeRecordSaveContext: typeof window.finalizeRecordSaveContext === 'function',
  };
}

function buildCandidateSnapshot() {
  const inputs = inspectCandidateInputs();
  const state = window.state;
  const records = Array.isArray(state && state.records) ? state.records : [];

  return {
    createdAt: nowIso(),
    inputs,
    candidate: {
      stateReady: inputs.stateExists && inputs.recordsIsArray,
      recordsLength: records.length,
      latestRecord: cloneSafe(records[records.length - 1] || null),
      storageKey: 'ippo_state',
      wouldPersistLocalState: inputs.hasSaveState && inputs.stateExists,
      wouldUsePipelinePersistence: inputs.hasPersistRecordState,
      wouldAttemptCloudSync: inputs.hasSyncRecordCloud && !!window.supabase,
      wouldFinalizeContext: inputs.hasFinalizeRecordSaveContext,
    },
  };
}

function compareCandidateWithRuntime() {
  const snapshot = buildCandidateSnapshot();
  const executionReadiness = typeof window.ippoPersistenceExecutionReadinessSummary === 'function'
    ? window.ippoPersistenceExecutionReadinessSummary()
    : null;
  const persistenceBoundary = typeof window.ippoPersistenceBoundaryPrepSummary === 'function'
    ? window.ippoPersistenceBoundaryPrepSummary()
    : null;

  const safeForCandidateExecution = !!(
    executionReadiness &&
    executionReadiness.safeForPersistenceExecutionPlanning &&
    persistenceBoundary &&
    persistenceBoundary.safeForPersistenceBoundaryPlanning &&
    snapshot.candidate.stateReady
  );

  const mismatchReasons = [];
  if (!snapshot.candidate.stateReady) mismatchReasons.push('state-not-ready');
  if (!executionReadiness) mismatchReasons.push('missing-execution-readiness');
  if (executionReadiness && !executionReadiness.safeForPersistenceExecutionPlanning) mismatchReasons.push('execution-readiness-not-safe');
  if (!persistenceBoundary) mismatchReasons.push('missing-persistence-boundary');
  if (persistenceBoundary && !persistenceBoundary.safeForPersistenceBoundaryPlanning) mismatchReasons.push('persistence-boundary-not-safe');

  return {
    checkedAt: nowIso(),
    mode: getState().mode,
    snapshot,
    executionReadinessReady: !!executionReadiness,
    persistenceBoundaryReady: !!persistenceBoundary,
    safeForCandidateExecution,
    mismatchReasons,
  };
}

function runPersistenceCandidateShadow(reason) {
  const state = getState();
  const shadow = compareCandidateWithRuntime();

  state.shadows.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForCandidateExecution: shadow.safeForCandidateExecution,
    mismatchReasons: shadow.mismatchReasons,
    recordsLength: shadow.snapshot && shadow.snapshot.candidate
      ? shadow.snapshot.candidate.recordsLength
      : null,
  });

  if (state.shadows.length > 60) {
    state.shadows.splice(0, state.shadows.length - 60);
  }

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForCandidateExecution: shadow.safeForCandidateExecution,
    mismatchReasons: shadow.mismatchReasons,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  if (!shadow.safeForCandidateExecution) {
    state.rollbacks.push({
      reason: 'candidate-not-safe',
      at: nowIso(),
      mismatchReasons: shadow.mismatchReasons,
      fallback: 'legacy-save-path',
    });

    if (state.rollbacks.length > 40) {
      state.rollbacks.splice(0, state.rollbacks.length - 40);
    }
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('persistence-candidate-shadow', {
      reason: reason || 'manual',
      safeForCandidateExecution: shadow.safeForCandidateExecution,
      mismatchReasons: shadow.mismatchReasons,
    });
  }

  return summarizePersistenceCandidateExecution();
}

function summarizePersistenceCandidateExecution() {
  const state = getState();
  const latestShadow = compareCandidateWithRuntime();

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    candidateExecutionEnabled: !!state.candidateExecutionEnabled,
    guardedExecutionEnabled: !!state.guardedExecutionEnabled,
    latestShadow,
    safeForCandidateExecution: latestShadow.safeForCandidateExecution,
    fallbackPath: 'legacy-save-path',
    shadows: state.shadows.slice(-30),
    rollbacks: state.rollbacks.slice(-20),
    checks: state.checks.slice(-30),
  };
}

window.ippoPersistenceCandidateExecutionSummary = summarizePersistenceCandidateExecution;
window.ippoRunPersistenceCandidateShadow = runPersistenceCandidateShadow;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runPersistenceCandidateShadow('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runPersistenceCandidateShadow('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('persistence-candidate-execution-loaded');
}

export {
  buildCandidateSnapshot,
  compareCandidateWithRuntime,
  runPersistenceCandidateShadow,
  summarizePersistenceCandidateExecution,
};
