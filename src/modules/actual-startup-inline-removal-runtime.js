// ============================================================
// ippo – actual-startup-inline-removal-runtime.js
//
// Phase 31:
// actual startup inline removal runtime.
//
// 目的:
// app.html startup inline runtime の実削減フェーズに入るため、
// 削除可能な startup 領域 / 維持すべき fallback / 触らない境界を
// runtime から明示する。
//
// 重要:
// - hydration / render / screen activation は削らない
// - save / sync / Supabase / localStorage は触らない
// - fallback active / rollback visible / adoption disabled by default
// - window compatibility bridge は維持
// ============================================================

const ACTUAL_STARTUP_INLINE_REMOVAL_KEY = '__ippoActualStartupInlineRemovalRuntime';

const ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS = Object.freeze({
  enabled: false,
  mode: 'actual-startup-inline-removal-guarded',
  startupInlineRemovalAllowed: true,
  hydrationInlineRemovalAllowed: false,
  renderInlineRemovalAllowed: false,
  screenActivationRemovalAllowed: false,
  persistenceRemovalAllowed: false,
  rollbackRequired: true,
  fallbackRequired: true,
});

const STARTUP_REMOVAL_SCOPE = Object.freeze({
  removableCandidates: [
    'duplicate startup observer wiring once module ownership is visible',
    'duplicate startup readiness checks once main entry owns visibility',
    'app.html-only startup orchestration comments after replacement inventory exists',
  ],
  preservedRuntime: [
    'legacy init fallback',
    'DOMContentLoaded fallback path',
    'window compatibility bridge',
    'boot warning / boot error visibility',
  ],
  explicitlyOutOfScope: [
    'hydration orchestration',
    'render orchestration',
    'showScreen timing',
    'switchTab timing',
    'saveState/loadState timing',
    'sync timing',
    'Supabase lifecycle',
    'localStorage boundary',
  ],
});

const REQUIRED_PHASE31_DEPENDENCIES = Object.freeze([
  'ippoLegacyBootstrapFallbackIsolationSummary',
  'ippoStartupSequencingCandidateOrchestrationSummary',
  'ippoStartupExtractionCandidateShellSummary',
  'ippoFinalAppShellCleanupRuntimeSummary',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[ACTUAL_STARTUP_INLINE_REMOVAL_KEY]) {
    window[ACTUAL_STARTUP_INLINE_REMOVAL_KEY] = {
      loadedAt: nowIso(),
      checks: [],
    };
  }

  return window[ACTUAL_STARTUP_INLINE_REMOVAL_KEY];
}

function safeCall(name) {
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

function summarizeDependencyReadiness() {
  const summaries = {};
  const readiness = {};

  REQUIRED_PHASE31_DEPENDENCIES.forEach((name) => {
    const summary = safeCall(name);
    summaries[name] = summary;
    readiness[name] = !!summary && !summary.error;
  });

  return {
    readiness,
    summaries,
    missing: REQUIRED_PHASE31_DEPENDENCIES.filter((name) => !readiness[name]),
  };
}

function summarizeFallbackVisibility(dependencies) {
  const fallback = dependencies.summaries.ippoLegacyBootstrapFallbackIsolationSummary;
  const extraction = dependencies.summaries.ippoStartupExtractionCandidateShellSummary;

  return {
    legacyFallbackVisible: !!fallback && !fallback.error,
    legacyFallbackReady: !!(fallback && !fallback.error && fallback.fallbackReady),
    extractionFallbackOwnerVisible: !!(
      extraction &&
      !extraction.error &&
      extraction.adoption &&
      extraction.adoption.fallbackOwner
    ),
    rollbackVisible: true,
  };
}

function summarizeStartupRemovalGate() {
  const dependencies = summarizeDependencyReadiness();
  const fallbackVisibility = summarizeFallbackVisibility(dependencies);
  const allDependenciesReady = dependencies.missing.length === 0;

  const safeForLimitedStartupInlineRemoval =
    allDependenciesReady &&
    fallbackVisibility.legacyFallbackVisible &&
    fallbackVisibility.extractionFallbackOwnerVisible &&
    !ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS.enabled;

  return {
    allDependenciesReady,
    missingDependencies: dependencies.missing,
    fallbackVisibility,
    adoptionDisabledByDefault: !ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS.enabled,
    safeForLimitedStartupInlineRemoval,
    blockedRemovalAreas: STARTUP_REMOVAL_SCOPE.explicitlyOutOfScope,
  };
}

function summarizeActualStartupInlineRemovalRuntime() {
  const state = getState();
  const gate = summarizeStartupRemovalGate();

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    phase: '31-actual-startup-inline-removal',
    flags: ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS,
    scope: STARTUP_REMOVAL_SCOPE,
    gate,
    nextAction: gate.safeForLimitedStartupInlineRemoval
      ? 'limit actual removal to startup inline duplication only'
      : 'keep app.html startup fallback active and resolve missing dependencies first',
    checks: state.checks.slice(-20),
  };
}

function runActualStartupInlineRemovalCheck(reason) {
  const state = getState();
  const summary = summarizeActualStartupInlineRemovalRuntime();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allDependenciesReady: summary.gate.allDependenciesReady,
    missingDependencies: summary.gate.missingDependencies,
    safeForLimitedStartupInlineRemoval: summary.gate.safeForLimitedStartupInlineRemoval,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('actual-startup-inline-removal-check', {
      reason: reason || 'manual',
      safeForLimitedStartupInlineRemoval: summary.gate.safeForLimitedStartupInlineRemoval,
      missingDependencyCount: summary.gate.missingDependencies.length,
    });
  }

  if (!summary.gate.safeForLimitedStartupInlineRemoval && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('actual-startup-inline-removal-not-ready', {
      missingDependencies: summary.gate.missingDependencies,
      fallbackVisibility: summary.gate.fallbackVisibility,
      blockedRemovalAreas: summary.gate.blockedRemovalAreas,
    });
  }

  return summarizeActualStartupInlineRemovalRuntime();
}

window.ippoActualStartupInlineRemovalRuntimeSummary = summarizeActualStartupInlineRemovalRuntime;
window.ippoRunActualStartupInlineRemovalCheck = runActualStartupInlineRemovalCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('actual-startup-inline-removal-runtime-loaded', {
    phase: '31',
    mode: ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS.mode,
    adoptionEnabled: ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS.enabled,
  });
}

export {
  ACTUAL_STARTUP_INLINE_REMOVAL_FLAGS,
  STARTUP_REMOVAL_SCOPE,
  summarizeActualStartupInlineRemovalRuntime,
  runActualStartupInlineRemovalCheck,
};
