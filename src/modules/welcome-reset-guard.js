// ============================================================
// ippo – welcome-reset-guard.js
// Hotfix: prevent unwanted onboarding/welcome reset
//
// 目的:
// - 利用開始済みユーザーを welcome へ戻さない
// - load/sync/render後の accidental reset を防ぐ
// - onboarding未完了ユーザーだけ welcome を許可
// - hotfix guard群を確実に読み込む
// ============================================================

import {
  getRecords,
} from './record-repository.js';
import { getState } from '../store/state.js';
import './record-edit-save-identity-guard.js';
import './record-freshness-guard.js';
import './ui-transition-ownership-runtime.js';
import './daily-record-card-guard.js';
import { showScreen, getCurrentScreen } from './screen-router.js';

function debug(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:welcome-guard]', label, detail || '');
    }
  } catch(e) {}
}

function markFreshness(label) {
  try {
    if (typeof window.ippoMarkRecordFreshness === 'function') {
      window.ippoMarkRecordFreshness(label);
    }
  } catch(e) {}
}

function markUiTransition(phase, payload) {
  try {
    if (typeof window.ippoMarkUiTransition === 'function') {
      window.ippoMarkUiTransition(phase, payload || {});
    }
  } catch(e) {}
}

function markNavigationPhase(phase, payload) {
  try {
    if (typeof window.ippoMarkNavigationPhase === 'function') {
      window.ippoMarkNavigationPhase(phase, payload || {});
    }
  } catch(e) {}
}

function shouldSuppressWelcomeReplay(target, source) {
  try {
    if (typeof window.ippoShouldSuppressWelcomeReplay === 'function') {
      return !!window.ippoShouldSuppressWelcomeReplay({
        target,
        source: source || 'welcome-reset-guard',
      });
    }
  } catch(e) {}
  return false;
}

function shouldSuppressNavigationReplay(target, source) {
  try {
    if (typeof window.ippoShouldSuppressNavigationReplay === 'function') {
      return !!window.ippoShouldSuppressNavigationReplay({
        target,
        source: source || 'welcome-reset-guard',
      });
    }
  } catch(e) {}
  return false;
}

function shouldSuppressHydrationReplay(target, source) {
  try {
    if (typeof window.ippoShouldSuppressHydrationReplay === 'function') {
      return !!window.ippoShouldSuppressHydrationReplay({
        target,
        source: source || 'welcome-reset-guard',
      });
    }
  } catch(e) {}
  return false;
}

function shouldSuppressTabReplay(target, source) {
  try {
    if (typeof window.ippoShouldSuppressTabReplay === 'function') {
      return !!window.ippoShouldSuppressTabReplay({
        target,
        source: source || 'welcome-reset-guard',
      });
    }
  } catch(e) {}
  return false;
}

function hasRecords() {
  try {
    return Array.isArray(getRecords()) && getRecords().length > 0;
  } catch(e) {
    return false;
  }
}

function hasProfile() {
  const state = getState();
  // state.name is what init() checks to decide whether to call showMain().
  // Do NOT include lastPeriodDate — it's written during onboarding step 3
  // before the user completes setup, causing false positives that block the
  // welcome screen for users who never finished onboarding.
  return !!(state.name);
}

function onboardingCompleted() {
  const state = getState();
  // Mirror init()'s own check: if state.name is set init() calls showMain(),
  // meaning onboarding was finished. state._onboardingDone is set explicitly
  // by completeOnboarding(). hasRecords() is the fallback for users who have
  // real data regardless of the flag.
  return !!(
    state._onboardingDone ||
    state.name ||
    hasRecords()
  );
}

function shouldBlockWelcome() {
  return onboardingCompleted();
}

function ensureMainAppVisible(source) {
  if (!shouldBlockWelcome()) return;
  if (!document.getElementById('main-app')) return;

  showScreen(getCurrentScreen());

  markUiTransition('active-screen-reconciled', {
    target: getCurrentScreen(),
    source: source || 'welcome-reset-guard:ensure-main-app-visible',
  });

  debug('main-app-restored', {
    records: getRecords().length,
    source: source || null,
  });
}

function wrapFunction(name) {
  const original = window[name];
  if (typeof original !== 'function') return false;
  if (original.__ippoWelcomeGuardWrapped === true) return true;

  function wrappedFunction() {
    const firstArg = arguments[0];
    const target = typeof firstArg === 'string' ? firstArg : '';
    const source = 'welcome-reset-guard:' + name;

    if (target) {
      markUiTransition('transition-requested', {
        target,
        source,
      });
      markNavigationPhase('transition-requested', {
        target,
        source,
      });
    }

    if (target && shouldSuppressNavigationReplay(target, source)) {
      markUiTransition('transition-suppressed', {
        target,
        source,
        detail: {
          reason: 'navigation-replay-suppression',
        },
      });
      markFreshness('welcome-guard:navigation-replay-suppressed');
      return;
    }

    if (target && shouldSuppressHydrationReplay(target, source)) {
      markUiTransition('transition-suppressed', {
        target,
        source,
        detail: {
          reason: 'hydration-replay-suppression',
        },
      });
      markFreshness('welcome-guard:hydration-replay-suppressed');
      return;
    }

    if (target && shouldSuppressTabReplay(target, source)) {
      markUiTransition('transition-suppressed', {
        target,
        source,
        detail: {
          reason: 'tab-replay-suppression',
        },
      });
      markFreshness('welcome-guard:tab-replay-suppressed');
      return;
    }

    if (
      shouldBlockWelcome() &&
      target &&
      /(welcome|onboarding|start)/i.test(target)
    ) {
      const suppressedByOwnership = shouldSuppressWelcomeReplay(target, source);
      debug('blocked-route', {
        functionName: name,
        target,
        suppressedByOwnership,
      });

      markUiTransition('transition-suppressed', {
        target,
        source,
        detail: {
          reason: suppressedByOwnership ? 'ui-transition-ownership' : 'welcome-reset-guard',
          onboardingCompleted: onboardingCompleted(),
          recordsLength: getRecords().length,
          hasProfile: hasProfile(),
        },
      });

      ensureMainAppVisible(source + ':blocked-route');
      markFreshness('welcome-guard:blocked-route');
      return;
    }

    markUiTransition('transition-started', {
      target,
      source,
    });

    const result = original.apply(this, arguments);

    markUiTransition('transition-completed', {
      target,
      source,
    });

    window.setTimeout(function() {
      ensureMainAppVisible(source + ':post-navigation');
      markFreshness('welcome-guard:post-navigation');
    }, 0);

    return result;
  }

  wrappedFunction.__ippoWelcomeGuardWrapped = true;
  wrappedFunction.__ippoOriginal = original;
  window[name] = wrappedFunction;
  debug('wrapped:' + name);
  return true;
}

function install() {
  wrapFunction('showScreen');
  wrapFunction('switchTab');
  wrapFunction('openRecordScreen');
  wrapFunction('completeOnboarding');
  wrapFunction('obComplete');
  wrapFunction('obSkipAll');

  ensureMainAppVisible('welcome-reset-guard:install');
  markFreshness('welcome-guard:install');
}

install();

window.ippoWelcomeResetGuardSummary = function() {
  return {
    onboardingCompleted: onboardingCompleted(),
    shouldBlockWelcome: shouldBlockWelcome(),
    recordsLength: getRecords().length,
    hasProfile: hasProfile(),
    currentScreen: getCurrentScreen(),
    mainAppVisible: getCurrentScreen() !== 'welcome',
    editSaveIdentityGuardLoaded: typeof window.ippoEditSaveIdentityGuardSummary === 'function',
    recordFreshnessGuardLoaded: typeof window.ippoRecordFreshnessGuardSummary === 'function',
    uiTransitionOwnershipLoaded: typeof window.ippoUiTransitionOwnershipSummary === 'function',
    uiDriftSuppressionLoaded: typeof window.ippoUiDriftSuppressionSummary === 'function',
    dailyRecordCardGuardLoaded: typeof window.ippoDailyRecordCardSummary === 'function',
  };
};
