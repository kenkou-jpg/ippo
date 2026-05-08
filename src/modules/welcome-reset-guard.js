// ============================================================
// ippo – welcome-reset-guard.js
// Hotfix: prevent unwanted onboarding/welcome reset
//
// 目的:
// - 利用開始済みユーザーを welcome へ戻さない
// - load/sync/render後の accidental reset を防ぐ
// - onboarding未完了ユーザーだけ welcome を許可
// - optional record guards の 404 で welcome guard 自体が止まらないようにする
// ============================================================

import {
  getRecords,
} from './record-repository.js';

function debug(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:welcome-guard]', label, detail || '');
    }
  } catch(e) {}
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
  return !!(
    state.userName ||
    state.nickname ||
    state.profile ||
    state.user ||
    state.diseases ||
    state.lastPeriodDate
  );
}

function onboardingCompleted() {
  const state = window.state || {};

  return !!(
    state.onboardingCompleted ||
    state.hasCompletedOnboarding ||
    state.onboardingDone ||
    localStorage.getItem('ippo_onboarding_completed') === '1' ||
    localStorage.getItem('onboardingCompleted') === '1' ||
    hasRecords() ||
    hasProfile()
  );
}

function shouldBlockWelcome() {
  return onboardingCompleted();
}

function ensureMainAppVisible() {
  const main = document.getElementById('main-app');
  const welcome = document.getElementById('screen-welcome');

  if (!main || !welcome) return;

  if (!shouldBlockWelcome()) return;

  main.style.display = '';
  welcome.style.display = 'none';

  if (!document.querySelector('.screen.active')) {
    const home = document.getElementById('screen-home');
    if (home) home.classList.add('active');
  }

  debug('main-app-restored', {
    records: getRecords().length,
  });
}

function wrapFunction(name) {
  const original = window[name];
  if (typeof original !== 'function') return false;
  if (original.__ippoWelcomeGuardWrapped === true) return true;

  function wrappedFunction() {
    const firstArg = arguments[0];

    if (
      shouldBlockWelcome() &&
      typeof firstArg === 'string' &&
      /(welcome|onboarding|start)/i.test(firstArg)
    ) {
      debug('blocked-route', {
        functionName: name,
        target: firstArg,
      });

      ensureMainAppVisible();
      return;
    }

    const result = original.apply(this, arguments);

    window.setTimeout(function() {
      ensureMainAppVisible();
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

  const observer = new MutationObserver(function() {
    if (!shouldBlockWelcome()) return;

    const welcome = document.getElementById('screen-welcome');
    const main = document.getElementById('main-app');

    if (!welcome || !main) return;

    const welcomeVisible = welcome.style.display !== 'none';
    const mainHidden = main.style.display === 'none';

    if (welcomeVisible || mainHidden) {
      debug('mutation-restore', {
        welcomeVisible,
        mainHidden,
      });
      ensureMainAppVisible();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
}

function install() {
  wrapFunction('showScreen');
  wrapFunction('switchTab');
  wrapFunction('openRecordScreen');
  wrapFunction('completeOnboarding');
  wrapFunction('obComplete');
  wrapFunction('obSkipAll');

  installMutationGuard();
  ensureMainAppVisible();
}

install();

let attempts = 0;
const timer = window.setInterval(function() {
  attempts++;
  install();
  ensureMainAppVisible();

  if (attempts >= 40) {
    window.clearInterval(timer);
  }
}, 250);

window.ippoWelcomeResetGuardSummary = function() {
  return {
    onboardingCompleted: onboardingCompleted(),
    shouldBlockWelcome: shouldBlockWelcome(),
    recordsLength: getRecords().length,
    hasProfile: hasProfile(),
    welcomeVisible: document.getElementById('screen-welcome')?.style.display !== 'none',
    mainAppVisible: document.getElementById('main-app')?.style.display !== 'none',
    editSaveIdentityGuardLoaded: typeof window.ippoEditSaveIdentityGuardSummary === 'function',
    postSaveEditGuardLoaded: typeof window.ippoPostSaveEditGuardSummary === 'function',
    dailyRecordCardGuardLoaded: typeof window.ippoDailyRecordCardSummary === 'function',
  };
};
