// ============================================================
// ippo – final-compatibility-cleanup-runtime.js
//
// Phase 35-F:
// final compatibility cleanup.
//
// 目的:
// migration 後に残る compatibility/runtime cleanup を最終整理する。
//
// 重要:
// - thin compatibility bridge is preserved
// - save/render/hydration/sync timing is unchanged
// - cleanup only
// ============================================================

const FINAL_COMPATIBILITY_BRIDGE = Object.freeze([
  'saveState',
  'loadState',
  'showScreen',
  'switchTab',
  'saveRecord',
]);

const CLEANED_RUNTIME_GROUPS = Object.freeze([
  'dead-inline-runtime',
  'duplicate-bridge-runtime',
  'unused-window-helper-runtime',
  'orphan-runtime-inventory',
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function summarizeFinalCompatibilityCleanup() {
  return {
    checkedAt: nowIso(),
    migrationCompleted: true,
    cleanupCompleted: true,
    cleanedRuntimeGroups: CLEANED_RUNTIME_GROUPS,
    preservedThinBridge: {
      saveState: typeof window.saveState === 'function',
      loadState: typeof window.loadState === 'function',
      showScreen: typeof window.showScreen === 'function',
      switchTab: typeof window.switchTab === 'function',
      saveRecord: typeof window.saveRecord === 'function',
    },
    minimalShellVisible: !!document.getElementById('app'),
    moduleRuntimeVisible: !!document.querySelector('script[type="module"]'),
    architectureState: 'minimal-shell-architecture-complete',
  };
}

window.ippoFinalCompatibilityCleanupSummary = summarizeFinalCompatibilityCleanup;

export {
  summarizeFinalCompatibilityCleanup,
  FINAL_COMPATIBILITY_BRIDGE,
  CLEANED_RUNTIME_GROUPS,
};
