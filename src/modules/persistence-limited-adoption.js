// ============================================================
// ippo – persistence-limited-adoption.js
//
// limited persistence adoption preparation layer.
//
// adoption disabled by default.
// localStorage-only.
// verify mandatory.
// rollback mandatory.
// ============================================================

const LIMITED_ADOPTION_KEY = '__ippoPersistenceLimitedAdoption';

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[LIMITED_ADOPTION_KEY]) {
    window[LIMITED_ADOPTION_KEY] = {
      loadedAt: nowIso(),
      mode: 'limited-disabled',
      adoptionEnabled: false,
      localStorageOnly: true,
      verifyMandatory: true,
      rollbackMandatory: true,
      fallbackPath: 'legacy-save-path',
      checks: [],
      adoptions: [],
      rollbacks: [],
    };
  }

  return window[LIMITED_ADOPTION_KEY];
}

function readGuardedSummary() {
  return typeof window.ippoPersistenceGuardedExecutionSummary === 'function'
    ? window.ippoPersistenceGuardedExecutionSummary()
    : null;
}

function inspectLimitedAdoptionDecision() {
  const state = getState();
  const guarded = readGuardedSummary();

  const reasons = [];

  if (!state.adoptionEnabled) reasons.push('limited-adoption-disabled');
  if (!state.localStorageOnly) reasons.push('non-local-storage-adoption-blocked');
  if (!state.verifyMandatory) reasons.push('verify-required');
  if (!state.rollbackMandatory) reasons.push('rollback-required');
  if (!guarded) reasons.push('missing-guarded-summary');
  if (guarded && !guarded.canRunGuardedCandidate) reasons.push('guarded-candidate-not-ready');

  const safeForLimitedAdoption = reasons.length === 0;

  return {
    checkedAt: nowIso(),
    mode: state.mode,
    adoptionEnabled: !!state.adoptionEnabled,
    localStorageOnly: !!state.localStorageOnly,
    verifyMandatory: !!state.verifyMandatory,
    rollbackMandatory: !!state.rollbackMandatory,
    fallbackPath: state.fallbackPath,
    guardedReady: !!guarded,
    safeForLimitedAdoption,
    reasons,
  };
}

function runLimitedAdoptionCheck(reason) {
  const state = getState();
  const decision = inspectLimitedAdoptionDecision();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForLimitedAdoption: decision.safeForLimitedAdoption,
    reasons: decision.reasons,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  state.adoptions.push({
    reason: reason || 'manual',
    at: nowIso(),
    adoptionDecision: decision.safeForLimitedAdoption ? 'limited-adoption-allowed' : 'legacy-runtime-only',
    fallbackPath: state.fallbackPath,
    reasons: decision.reasons,
  });

  if (state.adoptions.length > 60) {
    state.adoptions.splice(0, state.adoptions.length - 60);
  }

  if (!decision.safeForLimitedAdoption) {
    state.rollbacks.push({
      reason: 'limited-adoption-not-safe',
      at: nowIso(),
      fallbackPath: state.fallbackPath,
      reasons: decision.reasons,
    });

    if (state.rollbacks.length > 40) {
      state.rollbacks.splice(0, state.rollbacks.length - 40);
    }
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('persistence-limited-adoption-check', {
      reason: reason || 'manual',
      safeForLimitedAdoption: decision.safeForLimitedAdoption,
      fallbackPath: state.fallbackPath,
      reasons: decision.reasons,
    });
  }

  return summarizeLimitedAdoption();
}

function summarizeLimitedAdoption() {
  const state = getState();
  const decision = inspectLimitedAdoptionDecision();

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoptionEnabled: !!state.adoptionEnabled,
    localStorageOnly: !!state.localStorageOnly,
    verifyMandatory: !!state.verifyMandatory,
    rollbackMandatory: !!state.rollbackMandatory,
    fallbackPath: state.fallbackPath,
    latestDecision: decision,
    safeForLimitedAdoption: decision.safeForLimitedAdoption,
    checks: state.checks.slice(-30),
    adoptions: state.adoptions.slice(-30),
    rollbacks: state.rollbacks.slice(-20),
  };
}

window.ippoPersistenceLimitedAdoptionSummary = summarizeLimitedAdoption;
window.ippoRunPersistenceLimitedAdoptionCheck = runLimitedAdoptionCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runLimitedAdoptionCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runLimitedAdoptionCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('persistence-limited-adoption-loaded');
}

export {
  inspectLimitedAdoptionDecision,
  runLimitedAdoptionCheck,
  summarizeLimitedAdoption,
};
