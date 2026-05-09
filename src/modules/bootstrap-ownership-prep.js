// ============================================================
// ippo – bootstrap-ownership-prep.js
//
// Phase A-1: bootstrap ownership extraction preparation.
//
// app.html inline startup ownership を src/main.js / bootstrap module 側へ
// 段階移行する前の read-only ownership map。
//
// 重要:
// - legacy init() は置換しない
// - DOMContentLoaded handler は置換しない
// - render / hydration / save / sync / Supabase は変更しない
// - adoption は disabled by default
// - legacy fallback path を前提にした観測のみ
// ============================================================

const BOOTSTRAP_OWNERSHIP_PREP_KEY = '__ippoBootstrapOwnershipPrep';

const BOOTSTRAP_OWNERSHIP_ADOPTION = {
  enabled: false,
  mode: 'observe-only',
  candidateOwner: 'vite-bootstrap-runtime',
  fallbackOwner: 'legacy-app-html-inline-startup',
};

const STARTUP_RESPONSIBILITIES = [
  {
    id: 'dom-content-loaded-listener',
    currentOwner: 'app.html-inline',
    candidateOwner: 'src/main.js/bootstrap module',
    status: 'candidate-observable',
    risk: 'medium',
    reason: 'DOMContentLoaded currently coordinates legacy init timing and must remain fallback-safe.',
  },
  {
    id: 'legacy-init-call',
    currentOwner: 'app.html-inline',
    candidateOwner: 'bootstrap-shell',
    status: 'do-not-move-yet',
    risk: 'high',
    reason: 'init may trigger loadState, auth/session sync, first render, and hydration side effects.',
  },
  {
    id: 'startup-guard',
    currentOwner: 'mixed legacy + Vite observers',
    candidateOwner: 'bootstrap ownership module',
    status: 'safe-to-model',
    risk: 'low',
    reason: 'guard visibility can be modeled without calling or replacing startup execution.',
  },
  {
    id: 'state-load-readiness',
    currentOwner: 'legacy loadState + store/state export',
    candidateOwner: 'store/state.js',
    status: 'observe-only',
    risk: 'high',
    reason: 'state ownership cleanup should wait until record persistence work is complete.',
  },
  {
    id: 'first-screen-render',
    currentOwner: 'app.html-inline render flow',
    candidateOwner: 'screen modules',
    status: 'do-not-move-yet',
    risk: 'high',
    reason: 'render order must not change during bootstrap ownership preparation.',
  },
  {
    id: 'hydration-sequencing',
    currentOwner: 'app.html-inline mixed hydration',
    candidateOwner: 'deferred-hydration-prep',
    status: 'future-phase-b',
    risk: 'medium',
    reason: 'screen-level hydration should follow bootstrap ownership mapping, not precede it.',
  },
  {
    id: 'legacy-window-compatibility',
    currentOwner: 'window globals + legacy-window-bridge',
    candidateOwner: 'legacy-window-bridge',
    status: 'keep',
    risk: 'high',
    reason: 'window compatibility must remain until app.html inline dependencies are removed safely.',
  },
];

const DOM_CONTENT_LOADED_DEPENDENCIES = [
  'init',
  'loadState',
  'renderHome',
  'renderCalendar',
  'renderInsights',
  'updateStats',
  'showScreen',
  'switchTab',
  'openRecordScreen',
  'saveRecord',
];

const MODULE_MIGRATION_CANDIDATES = [
  {
    id: 'startup-readiness-summary',
    targetModule: 'bootstrap-ownership-prep.js',
    safety: 'safe-now',
    adoption: 'disabled',
  },
  {
    id: 'startup-guard-model',
    targetModule: 'bootstrap-shell.js',
    safety: 'safe-after-shadow-compare',
    adoption: 'disabled',
  },
  {
    id: 'dom-content-loaded-observer',
    targetModule: 'bootstrap-shell.js',
    safety: 'safe-as-observer-only',
    adoption: 'disabled',
  },
  {
    id: 'legacy-fallback-declaration',
    targetModule: 'legacy-window-bridge.js',
    safety: 'safe-now',
    adoption: 'disabled',
  },
];

const UNSAFE_TO_MOVE = [
  {
    id: 'init-execution',
    reason: 'May combine state load, auth/session, first render, and hydration side effects.',
  },
  {
    id: 'saveRecord-execution',
    reason: 'Record persistence is still the more sensitive migration area and must not be coupled to bootstrap extraction.',
  },
  {
    id: 'saveState-loadState-ownership',
    reason: 'State ownership cleanup belongs after persistence completion.',
  },
  {
    id: 'supabase-session-sync',
    reason: 'Auth/session lifecycle should remain stable until service boundary cleanup.',
  },
  {
    id: 'render-order',
    reason: 'Render ordering changes belong to render boundary extraction, not Phase A-1.',
  },
  {
    id: 'window-api-removal',
    reason: 'Compatibility layer reduction is a later phase after module ownership is proven.',
  },
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getPrepState() {
  if (!window[BOOTSTRAP_OWNERSHIP_PREP_KEY]) {
    window[BOOTSTRAP_OWNERSHIP_PREP_KEY] = {
      loadedAt: nowIso(),
      mode: BOOTSTRAP_OWNERSHIP_ADOPTION.mode,
      adoptionEnabled: BOOTSTRAP_OWNERSHIP_ADOPTION.enabled,
      checks: [],
    };
  }
  return window[BOOTSTRAP_OWNERSHIP_PREP_KEY];
}

function inspectApi(name) {
  return {
    exists: typeof window[name] !== 'undefined',
    type: typeof window[name],
  };
}

function inspectDomContentLoadedDependencies() {
  const result = {};
  DOM_CONTENT_LOADED_DEPENDENCIES.forEach((name) => {
    result[name] = inspectApi(name);
  });
  return result;
}

function summarizeDependencyHealth(dependencies) {
  const missing = Object.keys(dependencies).filter((name) => !dependencies[name].exists);
  return {
    missing,
    allPresent: missing.length === 0,
  };
}

function summarizeExistingRuntimeGraphs() {
  return {
    bootStability: typeof window.ippoBootSummary === 'function',
    bootstrapShell: typeof window.ippoBootstrapShellSummary === 'function',
    startupBoundary: typeof window.ippoStartupBoundarySummary === 'function',
    startupVerify: typeof window.ippoStartupVerifySummary === 'function',
    runtimeSequencing: typeof window.ippoRuntimeSequencingSummary === 'function',
    deferredHydrationPrep: typeof window.ippoDeferredHydrationPrepSummary === 'function',
    renderBoundary: typeof window.ippoRenderBoundarySummary === 'function',
    screenActivationPrep: typeof window.ippoScreenActivationPrepSummary === 'function',
    runtimeOwnershipGraph: typeof window.ippoRuntimeOwnershipGraphSummary === 'function',
    persistenceBoundaryPrep: typeof window.ippoPersistenceBoundaryPrepSummary === 'function',
    persistenceExecutionReadiness: typeof window.ippoPersistenceExecutionReadinessSummary === 'function',
    persistenceCandidateExecution: typeof window.ippoPersistenceCandidateExecutionSummary === 'function',
    persistenceGuardedExecution: typeof window.ippoPersistenceGuardedExecutionSummary === 'function',
  };
}

function summarizeBootstrapOwnershipPrep() {
  const state = getPrepState();
  const domContentLoadedDependencies = inspectDomContentLoadedDependencies();
  const dependencyHealth = summarizeDependencyHealth(domContentLoadedDependencies);
  const runtimeGraphs = summarizeExistingRuntimeGraphs();
  const missingRuntimeGraphs = Object.keys(runtimeGraphs).filter((name) => !runtimeGraphs[name]);

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      defaultEnabled: BOOTSTRAP_OWNERSHIP_ADOPTION.enabled,
      candidateOwner: BOOTSTRAP_OWNERSHIP_ADOPTION.candidateOwner,
      fallbackOwner: BOOTSTRAP_OWNERSHIP_ADOPTION.fallbackOwner,
    },
    ownershipMap: STARTUP_RESPONSIBILITIES,
    domContentLoadedDependencyMap: domContentLoadedDependencies,
    missingDomContentLoadedDependencies: dependencyHealth.missing,
    appHtmlStartupResponsibilityList: STARTUP_RESPONSIBILITIES.filter((item) => item.currentOwner.indexOf('app.html') !== -1),
    moduleMigrationCandidateList: MODULE_MIGRATION_CANDIDATES,
    unsafeToMoveList: UNSAFE_TO_MOVE,
    existingRuntimeGraphs: runtimeGraphs,
    missingRuntimeGraphs,
    safeForPhaseA2Planning:
      !state.adoptionEnabled &&
      dependencyHealth.allPresent &&
      runtimeGraphs.bootstrapShell &&
      runtimeGraphs.startupBoundary &&
      runtimeGraphs.runtimeSequencing,
    nextPrProposal: {
      phase: 'Phase A-2',
      title: 'DOMContentLoaded / startup guard module extraction candidate',
      constraints: [
        'observer-only first',
        'legacy fallback remains active',
        'no render order changes',
        'no save/sync/Supabase changes',
        'adoption disabled by default',
      ],
    },
    checks: state.checks.slice(-20),
  };
}

function runBootstrapOwnershipPrepCheck(reason) {
  const state = getPrepState();
  const summary = summarizeBootstrapOwnershipPrep();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    adoptionEnabled: summary.adoption.enabled,
    safeForPhaseA2Planning: summary.safeForPhaseA2Planning,
    missingDomContentLoadedDependencies: summary.missingDomContentLoadedDependencies,
    missingRuntimeGraphs: summary.missingRuntimeGraphs,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('bootstrap-ownership-prep-check', {
      reason: reason || 'manual',
      mode: summary.mode,
      adoptionEnabled: summary.adoption.enabled,
      safeForPhaseA2Planning: summary.safeForPhaseA2Planning,
      missingDependencyCount: summary.missingDomContentLoadedDependencies.length,
      missingRuntimeGraphCount: summary.missingRuntimeGraphs.length,
    });
  }

  if (!summary.safeForPhaseA2Planning && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('bootstrap-ownership-not-ready-for-phase-a2', {
      missingDomContentLoadedDependencies: summary.missingDomContentLoadedDependencies,
      missingRuntimeGraphs: summary.missingRuntimeGraphs,
      adoption: summary.adoption,
    });
  }

  return summarizeBootstrapOwnershipPrep();
}

window.ippoBootstrapOwnershipPrepSummary = summarizeBootstrapOwnershipPrep;
window.ippoRunBootstrapOwnershipPrepCheck = runBootstrapOwnershipPrepCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => runBootstrapOwnershipPrepCheck('dom-content-loaded'), { once: true });
} else {
  window.setTimeout(() => runBootstrapOwnershipPrepCheck('module-loaded-after-dom'), 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('bootstrap-ownership-prep-loaded');
}

export {
  BOOTSTRAP_OWNERSHIP_ADOPTION,
  STARTUP_RESPONSIBILITIES,
  DOM_CONTENT_LOADED_DEPENDENCIES,
  MODULE_MIGRATION_CANDIDATES,
  UNSAFE_TO_MOVE,
  summarizeBootstrapOwnershipPrep,
  runBootstrapOwnershipPrepCheck,
};
