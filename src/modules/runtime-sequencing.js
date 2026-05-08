// ============================================================
// ippo – runtime-sequencing.js
//
// startup sequencing / hydration sequencing / deferred runtime
// extraction の準備用 observability bundle。
//
// 重要:
// - sequencing ownership は移動しない
// - hydration execution は変更しない
// - save/persistence/sync は変更しない
// - observe-only
// ============================================================

const RUNTIME_SEQUENCE_KEY = '__ippoRuntimeSequencing';

const RUNTIME_SEQUENCES = [
  'boot-start',
  'vite-module-load',
  'legacy-global-ready',
  'state-ready',
  'supabase-ready',
  'startup-verify',
  'bootstrap-shell-check',
  'startup-boundary-check',
  'hydration-ready',
  'screen-render-ready',
  'record-save-ready',
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getRuntimeSequenceState() {
  if (!window[RUNTIME_SEQUENCE_KEY]) {
    window[RUNTIME_SEQUENCE_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      sequencingOwnershipExtracted: false,
      deferredHydrationEnabled: false,
      checks: [],
    };
  }

  return window[RUNTIME_SEQUENCE_KEY];
}

function summarizeRuntimeSequencing() {
  const state = getRuntimeSequenceState();

  const bootSummary = typeof window.ippoBootSummary === 'function'
    ? window.ippoBootSummary()
    : null;

  const startupBoundary = typeof window.ippoStartupBoundarySummary === 'function'
    ? window.ippoStartupBoundarySummary()
    : null;

  const bootstrapShell = typeof window.ippoBootstrapShellSummary === 'function'
    ? window.ippoBootstrapShellSummary()
    : null;

  const startupVerify = typeof window.ippoStartupVerifySummary === 'function'
    ? window.ippoStartupVerifySummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    runtimeSequences: RUNTIME_SEQUENCES,
    sequencingOwnershipExtracted: !!state.sequencingOwnershipExtracted,
    deferredHydrationEnabled: !!state.deferredHydrationEnabled,
    viteReady: !!window.__ippoViteReady,
    bootReady: !!bootSummary,
    startupBoundaryReady: !!startupBoundary,
    bootstrapShellReady: !!bootstrapShell,
    startupVerifyReady: !!startupVerify,
    supabaseReady: !!(window.__ippoSupabaseStatus && window.__ippoSupabaseStatus.ready),
    hydrationSequencingReady: !!(
      startupBoundary &&
      startupBoundary.safeForHydrationSequencing
    ),
    startupOwnershipExtractionReady: !!(
      startupBoundary &&
      startupBoundary.safeForStartupOwnershipExtraction
    ),
    bootstrapExtractionReady: !!(
      bootstrapShell &&
      bootstrapShell.safeForNextBootstrapExtraction
    ),
    checks: state.checks.slice(-30),
  };
}

function runRuntimeSequencingCheck(reason) {
  const state = getRuntimeSequenceState();
  const summary = summarizeRuntimeSequencing();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    hydrationSequencingReady: summary.hydrationSequencingReady,
    startupOwnershipExtractionReady: summary.startupOwnershipExtractionReady,
    bootstrapExtractionReady: summary.bootstrapExtractionReady,
  });

  if (state.checks.length > 50) {
    state.checks.splice(0, state.checks.length - 50);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('runtime-sequencing-check', {
      reason: reason || 'manual',
      hydrationSequencingReady: summary.hydrationSequencingReady,
      startupOwnershipExtractionReady: summary.startupOwnershipExtractionReady,
      bootstrapExtractionReady: summary.bootstrapExtractionReady,
    });
  }

  return summarizeRuntimeSequencing();
}

window.ippoRuntimeSequencingSummary = summarizeRuntimeSequencing;
window.ippoRunRuntimeSequencingCheck = runRuntimeSequencingCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runRuntimeSequencingCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runRuntimeSequencingCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('runtime-sequencing-module-loaded');
}

export {
  RUNTIME_SEQUENCES,
  summarizeRuntimeSequencing,
  runRuntimeSequencingCheck,
};
