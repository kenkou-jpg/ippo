// ============================================================
// ippo – src/modules/onboarding-runtime.js
// Phase D-2: onboarding 完了フローの module 化
//
// completeOnboarding / finishOnboarding を module へ移植。
// welcome-runtime.js との統合により、完了後の shouldShowMain()
// チェックが一貫して機能することを保証する。
//
// 依存（すべて window 経由）:
//   saveState, updateGreeting, updateStats, updateUnlock,
//   updateHistory, buildCalendar, buildHomeWeekRow,
//   updateHomeInsightCard, updateHomeNumbers, updateHomeDiseaseAdvice,
//   updateHomeCTAState, updateHomePhaseBanner, updateTodayMessage,
//   initReminders, reorderRecordSections, updateSettingsHero
// ============================================================

import { shouldShowMain } from './welcome-runtime.js';

function call(name) {
  if (typeof window[name] === 'function') window[name]();
}

export function completeOnboarding() {
  const s = window.state;
  if (s) s._onboardingDone = true;
  call('saveState');
  finishOnboarding();
}

export function finishOnboarding() {
  // welcome-runtime に委譲してメイン画面判定
  if (!shouldShowMain()) return;

  const welcome = document.getElementById('screen-welcome');
  const main    = document.getElementById('main-app');
  if (welcome) welcome.style.display = 'none';
  if (main)    main.style.display    = 'block';

  call('updateGreeting');
  call('updateStats');
  call('updateUnlock');
  call('updateHistory');
  call('buildCalendar');
  call('updateSettingsHero');
  call('buildHomeWeekRow');
  call('updateHomeInsightCard');
  call('updateHomeNumbers');
  call('updateHomeDiseaseAdvice');
  call('updateHomeCTAState');
  call('updateHomePhaseBanner');
  call('updateTodayMessage');
  call('initReminders');
  call('reorderRecordSections');

  try {
    if (localStorage.getItem('ippo_hide_add_home') === '1') {
      const banner = document.getElementById('add-home-banner');
      if (banner) banner.style.display = 'none';
    }
  } catch (_) {}
}

function handleObClick(e) {
  const actionEl = e.target.closest('[data-ob-action]');
  if (actionEl) {
    const action = actionEl.dataset.obAction;
    const fnMap = {
      'next':               'obNext',
      'skip-all':           'obSkipAll',
      'save-name':          'obSaveName',
      'save-birth':         'obSaveBirth',
      'save-period':        'obSavePeriod',
      'save-cycle':         'obSaveCycle',
      'save-diseases':      'obSaveDiseases',
      'save-purpose':       'obSavePurpose',
      'save-reminder':      'obSaveReminder',
      'complete':           'obComplete',
    };
    if (action === 'complete-onboarding') { completeOnboarding(); return; }
    const fn = fnMap[action];
    if (fn && typeof window[fn] === 'function') window[fn]();
    return;
  }

  const diseaseEl = e.target.closest('[data-ob-disease]');
  if (diseaseEl && typeof window.obToggleDisease === 'function') {
    window.obToggleDisease(diseaseEl, diseaseEl.dataset.obDisease);
    return;
  }

  const dateEl = e.target.closest('[data-ob-date]');
  if (dateEl && !dateEl.dataset.obDateFuture && typeof window.obSelectPeriodDay === 'function') {
    window.obSelectPeriodDay(dateEl.dataset.obDate);
  }
}

export function bindOnboardingEvents() {
  const welcome = document.getElementById('screen-welcome');
  if (!welcome) return;
  welcome.addEventListener('click', handleObClick);
}

window.completeOnboarding   = completeOnboarding;
window.finishOnboarding     = finishOnboarding;
window.bindOnboardingEvents = bindOnboardingEvents;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('onboarding-runtime-loaded');
}
