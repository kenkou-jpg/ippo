// ============================================================
// ippo – persistence-guarded-execution.js
//
// guarded persistence execution preparation layer.
//
// デフォルトは disabled。
// localStorage-only candidate の安全条件と fallback / verify をまとめる。
// 既存 save / persistence / sync 実行経路は変更しない。
// ============================================================

const GUARDED_EXECUTION_KEY = '__ippoPersistenceGuardedExecution';

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[GUARDED_EXECUTION_KEY]) {
    window[GUARDED_EXECUTION_KEY] = {
      loadedAt: nowIso(),
      mode: 'disabled-prep',
      guardedExecutionEnabled: false,
      localStorageOnly: true,
      requireVerify: true,
      fallbackPath: 'legacy-save-path',
      checks: [],
      decisions: [],
      rollbacks: [],
    };
  }

  return window[GUARDED_EXECUTION_KEY];
}

function readCandidateSummary() {
  return typeof window.ippoPersistenceCandidateExecutionSummary === 'function'
    ? window.ippoPersistenceCandidateExecutionSummary()
    : null;
}

function readExecutionReadiness() {
  return typeof window.ippoPersistenceExecutionReadinessSummary === 'function'
    ? window.ippoPersistenceExecutionReadinessSummary()
    : null;
}

function readVerifySummary() {
  return typeof window.ippoVerifyLastRecordSave === 'function'
    ? { exists: true, type: 'function' }
    : { exists: false, type: typeof window.ippoVerifyLastRecordSave };
}

function inspectGuardedExecutionDecision() {
  const state = getState();
  const candidate = readCandidateSummary();
  const readiness = readExecutionReadiness();
  const verify = readVerifySummary();

  const reasons = [];
  if (!state.guardedExecutionEnabled) reasons.push('guarded-execution-disabled');
  if (!state.localStorageOnly) reasons.push('non-local-storage-mode-not-allowed');
  if (!candidate) reasons.push('missing-candidate-summary');
  if (candidate && !candidate.safeForCandidateExecution) reasons.push('candidate-not-safe');
  if (!readiness) reasons.push('missing-execution-readiness');
  if (readiness && !readiness.safeForPersistenceExecutionPlanning) reasons.push('execution-readiness-not-safe');
  if (state.requireVerify && !verify.exists) reasons.push('missing-save-verify');

  const canRunGuardedCandidate = reasons.length === 0;

  return {
    checkedAt: nowIso(),
    mode: state.mode,
    guardedExecutionEnabled: !!state.guardedExecutionEnabled,
    localStorageOnly: !!state.localStorageOnly,
    requireVerify: !!state.requireVerify,
    fallbackPath: state.fallbackPath,
    candidateReady: !!candidate,
    executionReadinessReady: !!readiness,
    verifyReady: !!verify.exists,
    canRunGuardedCandidate,
    reasons,
  };
}

function runGuardedExecutionCheck(reason) {
  const state = getState();
  const decision = inspectGuardedExecutionDecision();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    canRunGuardedCandidate: decision.canRunGuardedCandidate,
    reasons: decision.reasons,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  state.decisions.push({
    reason: reason || 'manual',
    at: nowIso(),
    decision: decision.canRunGuardedCandidate ? 'candidate-allowed' : 'legacy-fallback',
    reasons: decision.reasons,
    fallbackPath: state.fallbackPath,
  });

  if (state.decisions.length > 60) {
    state.decisions.splice(0, state.decisions.length - 60);
  }

  if (!decision.canRunGuardedCandidate) {
    state.rollbacks.push({
      reason: 'guarded-candidate-not-allowed',
      at: nowIso(),
      reasons: decision.reasons,
      fallbackPath: state.fallbackPath,
    });

    if (state.rollbacks.length > 40) {
      state.rollbacks.splice(0, state.rollbacks.length - 40);
    }
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('persistence-guarded-execution-check', {
      reason: reason || 'manual',
      canRunGuardedCandidate: decision.canRunGuardedCandidate,
      fallbackPath: state.fallbackPath,
      reasons: decision.reasons,
    });
  }

  return summarizeGuardedExecution();
}

function summarizeGuardedExecution() {
  const state = getState();
  const decision = inspectGuardedExecutionDecision();

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    guardedExecutionEnabled: !!state.guardedExecutionEnabled,
    localStorageOnly: !!state.localStorageOnly,
    requireVerify: !!state.requireVerify,
    fallbackPath: state.fallbackPath,
    latestDecision: decision,
    canRunGuardedCandidate: decision.canRunGuardedCandidate,
    checks: state.checks.slice(-30),
    decisions: state.decisions.slice(-30),
    rollbacks: state.rollbacks.slice(-20),
  };
}

window.ippoPersistenceGuardedExecutionSummary = summarizeGuardedExecution;
window.ippoRunPersistenceGuardedExecutionCheck = runGuardedExecutionCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runGuardedExecutionCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runGuardedExecutionCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('persistence-guarded-execution-loaded');
}

export {
  inspectGuardedExecutionDecision,
  runGuardedExecutionCheck,
  summarizeGuardedExecution,
};
