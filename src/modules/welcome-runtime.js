// ============================================================
// ippo – welcome-runtime.js
//
// Phase C: welcome / main screen ownership module。
//
// 責務:
// - shouldShowWelcome() / shouldShowMain() の判定を一元管理
// - onboarding completion resolution
// - persisted state resolution（state.name / state._onboardingDone）
// - first launch detection（hasRecords fallback）
//
// 重要:
// - app.html inline init() の判定を mirror する（動作変更なし）
// - DOM mutation はここでは行わない（welcome-reset-guard が担当）
// - 将来的に app.html inline の showMain 判定をここへ移譲する準備
// ============================================================

import { getRecords } from './record-repository.js';

const WELCOME_RUNTIME_KEY = '__ippoWelcomeRuntime';

function getAppState() {
  return window.state || {};
}

function hasRecords() {
  try {
    const records = getRecords();
    return Array.isArray(records) && records.length > 0;
  } catch (_) {
    return false;
  }
}

function hasProfile() {
  // Mirror init()'s check: state.name being set means onboarding was completed.
  // Intentionally excludes lastPeriodDate — written mid-onboarding, causing false positives.
  return !!(getAppState().name);
}

function onboardingCompleted() {
  const state = getAppState();
  // Mirror init() + welcome-reset-guard logic exactly.
  return !!(state._onboardingDone || state.name || hasRecords());
}

function shouldShowWelcome() {
  return !onboardingCompleted();
}

function shouldShowMain() {
  return onboardingCompleted();
}

function getSummary() {
  return {
    checkedAt: new Date().toISOString(),
    onboardingCompleted: onboardingCompleted(),
    shouldShowWelcome: shouldShowWelcome(),
    shouldShowMain: shouldShowMain(),
    hasProfile: hasProfile(),
    hasRecords: hasRecords(),
    stateFlags: {
      name: !!getAppState().name,
      onboardingDone: !!getAppState()._onboardingDone,
    },
  };
}

if (!window[WELCOME_RUNTIME_KEY]) {
  window[WELCOME_RUNTIME_KEY] = { loadedAt: new Date().toISOString() };
}

window.ippoWelcomeRuntime = {
  shouldShowWelcome,
  shouldShowMain,
  onboardingCompleted,
  hasProfile,
  hasRecords,
  getSummary,
};

window.ippoWelcomeRuntimeSummary = getSummary;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('welcome-runtime-loaded', {
    mode: 'ownership-module',
  });
}

export {
  shouldShowWelcome,
  shouldShowMain,
  onboardingCompleted,
  hasProfile,
  hasRecords,
  getSummary,
};
