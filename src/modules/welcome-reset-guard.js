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
import './record-edit-save-identity-guard.js';
import './record-freshness-guard.js';
import './ui-transition-ownership-runtime.js';
import './ui-drift-suppression-runtime.js';
import './daily-record-card-guard.js';

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
  const state = window.state || {};
  // state.name is what init() checks to decide whether to call showMain().
  // Do NOT include lastPeriodDate — it's written during onboarding step 3
  // before the user completes setup, causing false positives that block the
  // welcome screen for users who never finished onboarding.
  return !!(state.name);
}

function onboardingCompleted() {
  const state = window.state || {};
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
  const main = document.getElementById('main-app');
  const welcome = document.getElementById('screen-welcome');

  if (!main || !welcome) return;

  if (!shouldBlockWelcome()) return;

  main.style.display = '';
  welcome.style.display = 'none';

  if (!document.querySelector('.screen.active')) {
    const home = document.getElementById('screen-home');
    if (home) {
      home.classList.add('active');
      markUiTransition('active-screen-reconciled', {
        target: 'home',
        source: source || 'welcome-reset-guard:ensure-main-app-visible',
      });
    }
  }

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

function installMutationGuard() {
  if (window.__ippoWelcomeMutationGuardInstalled === true) return;
  window.__ippoWelcomeMutationGuardInstalled = true;

  const welcome = document.getElementById('screen-welcome');
  const main = document.getElementById('main-app');

  // 対象要素が存在しない場合は監視不要
  if (!welcome || !main) return;

  const observer = new MutationObserver(function() {
    if (!shouldBlockWelcome()) return;

    const welcomeVisible = welcome.style.display !== 'none';
    const mainHidden = main.style.display === 'none';

    if (welcomeVisible || mainHidden) {
      debug('mutation-restore', {
        welcomeVisible,
        mainHidden,
      });
      markUiTransition('welcome-mutation-replay-suppressed', {
        target: 'welcome',
        source: 'welcome-reset-guard:mutation-observer',
        detail: {
          welcomeVisible,
          mainHidden,
        },
      });
      ensureMainAppVisible('welcome-reset-guard:mutation-restore');
      markFreshness('welcome-guard:mutation-restore');
    }
  });

  // body 全体ではなく対象要素の style のみを監視
  const opts = { attributes: true, attributeFilter: ['style'] };
  observer.observe(welcome, opts);
  observer.observe(main, opts);
}

function install() {
  wrapFunction('showScreen');
  wrapFunction('switchTab');
  wrapFunction('openRecordScreen');
  wrapFunction('completeOnboarding');
  wrapFunction('obComplete');
  wrapFunction('obSkipAll');

  installMutationGuard();
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
    welcomeVisible: document.getElementById('screen-welcome')?.style.display !== 'none',
    mainAppVisible: document.getElementById('main-app')?.style.display !== 'none',
    editSaveIdentityGuardLoaded: typeof window.ippoEditSaveIdentityGuardSummary === 'function',
    recordFreshnessGuardLoaded: typeof window.ippoRecordFreshnessGuardSummary === 'function',
    uiTransitionOwnershipLoaded: typeof window.ippoUiTransitionOwnershipSummary === 'function',
    uiDriftSuppressionLoaded: typeof window.ippoUiDriftSuppressionSummary === 'function',
    dailyRecordCardGuardLoaded: typeof window.ippoDailyRecordCardSummary === 'function',
  };
};
