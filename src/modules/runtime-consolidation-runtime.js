// ============================================================
// ippo – runtime-consolidation-runtime.js
//
// Phase 35-E:
// post-migration runtime consolidation.
//
// 目的:
// migration 後に残った runtime inventory / cleanup runtime /
// compatibility visibility を最終集約する。
//
// 重要:
// - save/render/hydration/sync timing is unchanged
// - compatibility bridge remains visible
// - cleanup only
// ============================================================

const CONSOLIDATED_PHASES = Object.freeze([
  'startup-ownership',
  'hydration-ownership',
  'render-ownership',
  'screen-activation-ownership',
  'window-bridge-cleanup',
  'state-ownership-stabilization',
  'service-boundary-stabilization',
  'minimal-shell-adoption',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function summarizeRuntimeConsolidation() {
  return {
    checkedAt: nowIso(),
    migrationCompleted: true,
    consolidatedPhases: CONSOLIDATED_PHASES,
    preservedCompatibility: {
      saveState: typeof window.saveState === 'function',
      loadState: typeof window.loadState === 'function',
      showScreen: typeof window.showScreen === 'function',
      switchTab: typeof window.switchTab === 'function',
    },
    minimalShellVisible: !!document.getElementById('app'),
    moduleRuntimeVisible: !!document.querySelector('script[type="module"]'),
    remainingWork: [
      'dead runtime file cleanup',
      'unused compatibility cleanup',
      'final runtime consolidation',
    ],
  };
}

window.ippoRuntimeConsolidationSummary = summarizeRuntimeConsolidation;

export {
  summarizeRuntimeConsolidation,
  CONSOLIDATED_PHASES,
};
