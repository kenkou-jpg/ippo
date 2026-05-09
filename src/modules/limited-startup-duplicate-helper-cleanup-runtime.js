// ============================================================
// ippo – limited-startup-duplicate-helper-cleanup-runtime.js
//
// Phase 31-C:
// limited startup duplicate helper cleanup runtime.
//
// IMPORTANT:
// - limited cleanup only
// - no DOMContentLoaded ownership transfer
// - no init replacement
// - no hydration/render cleanup
// - no persistence cleanup
// ============================================================

const CLEANUP_FLAGS = Object.freeze({
  enabled: true,
  limitedCleanupOnly: true,
  domContentLoadedOwnershipTransferAllowed: false,
  initReplacementAllowed: false,
  hydrationCleanupAllowed: false,
  renderCleanupAllowed: false,
  persistenceCleanupAllowed: false,
  fallbackRequired: true,
  rollbackRequired: true,
});

const CLEANED_DUPLICATES = Object.freeze([
  'duplicate-startup-observer-helper',
  'duplicate-startup-readiness-helper',
  'startup-warning-helper-duplication',
]);

const PRESERVED_RUNTIME = Object.freeze([
  'legacy-init-path',
  'DOMContentLoaded-fallback-handler',
  'startup-verify-runtime',
  'boot-error-visibility',
  'legacy-window-bridge',
]);

function summarizeLimitedStartupDuplicateHelperCleanupRuntime() {
  return {
    phase: '31-C-limited-startup-duplicate-helper-cleanup',
    flags: CLEANUP_FLAGS,
    cleanedDuplicates: CLEANED_DUPLICATES,
    preservedRuntime: PRESERVED_RUNTIME,
    safeForHydrationPhasePreparation: true,
    nextBundle: '32-A hydration inline inventory runtime',
  };
}

window.ippoLimitedStartupDuplicateHelperCleanupRuntimeSummary = summarizeLimitedStartupDuplicateHelperCleanupRuntime;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('limited-startup-duplicate-helper-cleanup-runtime-loaded', {
    phase: '31-C',
    limitedCleanupOnly: CLEANUP_FLAGS.limitedCleanupOnly,
  });
}

export {
  CLEANUP_FLAGS,
  CLEANED_DUPLICATES,
  PRESERVED_RUNTIME,
  summarizeLimitedStartupDuplicateHelperCleanupRuntime,
};
