// ============================================================
// ippo – deferred-hydration-prep.js
//
// deferred hydration / partial startup へ進む前の preparation layer。
//
// 重要:
// - hydration 実行順は変更しない
// - render 関数は呼び替えない
// - screen activation は変更しない
// - observe-only
// ============================================================

const DEFERRED_HYDRATION_KEY = '__ippoDeferredHydrationPrep';

const HYDRATION_TARGETS = [
  {
    name: 'welcome',
    rootId: 'screen-welcome',
    requiredIds: ['screen-welcome'],
  },
  {
    name: 'home',
    rootId: 'screen-home',
    requiredIds: ['screen-home', 'home-week-row', 'home-record-cta'],
  },
  {
    name: 'calendar',
    rootId: 'screen-calendar',
    requiredIds: ['screen-calendar', 'calGrid', 'calLabel'],
  },
  {
    name: 'insights',
    rootId: 'screen-insights',
    requiredIds: ['screen-insights', 'insight-total'],
  },
  {
    name: 'record',
    rootId: 'screen-record',
    requiredIds: ['screen-record'],
  },
  {
    name: 'settings',
    rootId: 'screen-settings',
    requiredIds: ['screen-settings'],
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
  if (!window[DEFERRED_HYDRATION_KEY]) {
    window[DEFERRED_HYDRATION_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      deferredHydrationEnabled: false,
      checks: [],
    };
  }
  return window[DEFERRED_HYDRATION_KEY];
}

function inspectTarget(target) {
  const required = {};
  target.requiredIds.forEach((id) => {
    required[id] = !!document.getElementById(id);
  });

  const missing = Object.keys(required).filter((id) => !required[id]);

  return {
    name: target.name,
    rootId: target.rootId,
    rootExists: !!document.getElementById(target.rootId),
    required,
    missing,
    ready: missing.length === 0,
  };
}

function summarizeDeferredHydrationPrep() {
  const state = getPrepState();
  const targets = HYDRATION_TARGETS.map(inspectTarget);
  const notReady = targets.filter((target) => !target.ready);

  const startupBoundary = typeof window.ippoStartupBoundarySummary === 'function'
    ? window.ippoStartupBoundarySummary()
    : null;

  const runtimeSequencing = typeof window.ippoRuntimeSequencingSummary === 'function'
    ? window.ippoRuntimeSequencingSummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    deferredHydrationEnabled: !!state.deferredHydrationEnabled,
    targets,
    notReadyTargets: notReady.map((target) => target.name),
    allTargetsReady: notReady.length === 0,
    startupBoundaryReady: !!startupBoundary,
    runtimeSequencingReady: !!runtimeSequencing,
    safeForDeferredHydrationCandidate: notReady.length === 0 && !!startupBoundary && startupBoundary.safeForHydrationSequencing === true,
    checks: state.checks.slice(-30),
  };
}

function runDeferredHydrationPrepCheck(reason) {
  const state = getPrepState();
  const summary = summarizeDeferredHydrationPrep();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allTargetsReady: summary.allTargetsReady,
    safeForDeferredHydrationCandidate: summary.safeForDeferredHydrationCandidate,
    notReadyTargets: summary.notReadyTargets,
  });

  if (state.checks.length > 50) {
    state.checks.splice(0, state.checks.length - 50);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('deferred-hydration-prep-check', {
      reason: reason || 'manual',
      allTargetsReady: summary.allTargetsReady,
      safeForDeferredHydrationCandidate: summary.safeForDeferredHydrationCandidate,
      notReadyTargets: summary.notReadyTargets,
    });
  }

  if (!summary.safeForDeferredHydrationCandidate && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('deferred-hydration-not-ready', {
      notReadyTargets: summary.notReadyTargets,
      allTargetsReady: summary.allTargetsReady,
    });
  }

  return summarizeDeferredHydrationPrep();
}

function connectHydrationInlineInventoryRuntime(reason) {
  window.setTimeout(() => {
    import('./hydration-inline-inventory-runtime.js')
      .then(() => {
        if (typeof window.ippoMarkBootEvent === 'function') {
          window.ippoMarkBootEvent('hydration-inline-inventory-runtime-connected', {
            reason: reason || 'post-deferred-hydration-prep',
          });
        }

        if (typeof window.ippoRunHydrationInlineInventoryCheck === 'function') {
          window.ippoRunHydrationInlineInventoryCheck(reason || 'post-deferred-hydration-prep');
        }
      })
      .catch((error) => {
        if (typeof window.ippoMarkBootError === 'function') {
          window.ippoMarkBootError('hydration-inline-inventory-runtime-connect-failed', {
            message: error && error.message ? error.message : String(error),
          });
        }
      });
  }, 0);
}

window.ippoDeferredHydrationPrepSummary = summarizeDeferredHydrationPrep;
window.ippoRunDeferredHydrationPrepCheck = runDeferredHydrationPrepCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runDeferredHydrationPrepCheck('dom-content-loaded');
    connectHydrationInlineInventoryRuntime('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runDeferredHydrationPrepCheck('module-loaded-after-dom');
    connectHydrationInlineInventoryRuntime('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('deferred-hydration-prep-loaded');
}

export {
  HYDRATION_TARGETS,
  summarizeDeferredHydrationPrep,
  runDeferredHydrationPrepCheck,
  connectHydrationInlineInventoryRuntime,
};
