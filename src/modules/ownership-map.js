// ============================================================
//  ippo – src/modules/ownership-map.js
//  Ownership Map: complete function→owner declaration for app-legacy.js.
//
//  This file does three things:
//  1. Declares ownership of all major functions/DOM regions.
//  2. Wraps the core render functions with RenderAuthority dedup.
//  3. Registers known timers with TimerRegistry.
//
//  It does NOT move code. It does NOT change behavior.
//  It only adds ownership awareness on top of existing functions.
//
//  Load order: after app-legacy.js, after ownership-registry.js,
//              after render-authority.js, after timer-registry.js.
//
// ============================================================
//
//  OWNERSHIP MAP (authoritative reference)
//  ─────────────────────────────────────────────────────────────
//
//  Module             | Owned Functions / DOM Regions
//  ─────────────────────────────────────────────────────────────
//  calendar-module    | buildCalendar, changeMonth, renderCalendarMonthlySummary,
//                     | calYear, calMonth, displayPhases
//                     | DOM: #calGrid, #calLabel, #cal-monthly-summary
//
//  home-module        | updateGreeting, updateStats, buildHomeWeekRow,
//                     | updateHomeInsightCard, updateHomeNumbers,
//                     | updateHomeDiseaseAdvice, updateHomeCTAState,
//                     | updateHomePhaseBanner, updateHomeSummary, updateHomeCTA,
//                     | updateDate, buildSymptomChips, applySymptomChipPriority
//                     | DOM: greeting, stats-grid, home-week-row, home-phase-banner
//
//  insights-module    | renderInsightDiscoveries, renderPhaseMap,
//                     | updateFoodBodyCorrelation, updateCycleSymptomCorrelation,
//                     | analyzeCyclePhases, openCyclePhaseReport
//                     | DOM: #insight-discoveries, #phase-map
//
//  timeline-module    | renderTimeline, loadMoreTimeline, updateTimelineView
//                     | DOM: #timeline-list
//
//  onboarding-module  | obInit, obShowStep, obNext, obSkipAll, obComplete,
//                     | obBuildPeriodCalendar, obSelectPeriodDay,
//                     | obSaveName, obSaveBirth, obSavePeriod, obSaveCycle,
//                     | obSaveDiseases, obSavePurpose, obSaveReminder,
//                     | completeOnboarding, finishOnboarding
//                     | DOM: #screen-welcome
//
//  premium-module     | checkPremiumStatus, checkPremiumRegistered,
//                     | premiumGate, updatePremiumBadges, renderProHero
//                     | DOM: .premium-badge
//
//  fasting-module     | startFasting, endFast, resumeFasting, startFastTimer,
//                     | renderFasting, applyFastingVisibility,
//                     | updateFastingWidgetPhase, setFastGoal
//                     | DOM: #fasting-widget
//                     | Timer: fastInterval
//
//  symptoms-module    | openSymptomSettings, closeSymptomSettings,
//                     | saveSymptomSettings, saveSymptomSelection,
//                     | updateSymptomSettingDisplay, switchSymptomTab,
//                     | buildSymptomChips (read-only from home)
//                     | DOM: symptom settings modal
//
//  disease-module     | openDiseaseSettings, closeDiseaseSettings,
//                     | toggleDiseaseChip, clearAllDiseases,
//                     | saveDiseaseSettings, selectDisease,
//                     | updateDiseaseSettingDisplay, updateDiseaseQuestions
//                     | DOM: disease settings modal
//
//  record-module      | saveRecord, saveState, saveAndSync, editPastRecord,
//                     | openEditRecord, closeEditRecord, saveEditRecord,
//                     | generateRecordId, ensureRecordIds, softDeleteRecord
//                     | DOM: #record-screen
//
//  sync-module        | cloudBackupAll, cloudRestore, cloudSyncSafe,
//                     | syncRecordToCloud, syncAllRecordsToCloud,
//                     | pullRecordsFromCloud, manualCloudRestore,
//                     | supabaseAuth, supabaseEnsureAuth, supabaseSignInAnonymous,
//                     | supabaseRefreshSession, supabaseHeaders,
//                     | showSyncIndicator, hideSyncIndicator, openSyncModal,
//                     | closeSyncModal, toggleSyncMode
//
//  settings-module    | updateSettingsHero, initVisionUI, saveVision,
//                     | updateVisionDisplay, toggleVisionEdit,
//                     | initNavIcons, initSettingsIcons
//
//  experiments-module | openExperiments, startExperiment,
//                     | startCustomExperiment, cancelExperiment, completeExperiment
//
//  auth-module        | premiumCheckInterval (timer), adminCheckInterval (timer)
//                     | _notifyAuthReady, _flushCloudRestoreQueue
//
//  ui-module          | showToast, showAlertModal, showConfirmModal,
//                     | showSyncIndicator, hideSyncIndicator,
//                     | _syncIndicatorTimer, _toastTimer (timers)
//
//  meal-module        | openMealTimePicker, closeMealTimePicker,
//                     | toggleMealEntry, confirmMealTime, addMealTime,
//                     | parseMealFree, parseMealMemo
//
//  startup-owner      | showMain, bootstrap (app-bootstrap.js)
//                     | startup sequence management
//
// ─────────────────────────────────────────────────────────────

(function () {
  'use strict';

  // ─── Wait for dependencies ───────────────────────────────────
  function _whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      // Already past DOMContentLoaded — but wait one microtask for app-legacy exports
      Promise.resolve().then(fn);
    }
  }

  _whenReady(function () {
    var REG    = window.ippoOwnershipRegistry;
    var AUTH   = window.ippoRenderAuthority;
    var TIMERS = window.ippoTimerRegistry;
    var ML     = window.ippoModuleLifecycle;

    if (!REG || !AUTH) {
      console.warn('[OwnershipMap] ownership-registry or render-authority not loaded – skipping');
      return;
    }

    var SLOTS   = AUTH.SLOTS;
    var REGIONS = REG.REGIONS;

    // ═══════════════════════════════════════════════════════════
    //  STEP 1: Claim ownership of all DOM regions
    // ═══════════════════════════════════════════════════════════

    var OWNERSHIP_DECLARATIONS = [
      // [ regionId,                    owner,              opts ]
      [REGIONS.CALENDAR_GRID,        'calendar-module',  {}],
      [REGIONS.CALENDAR_LABEL,       'calendar-module',  {}],
      [REGIONS.CALENDAR_MONTHLY,     'calendar-module',  {}],
      [REGIONS.HOME_WEEK_ROW,        'home-module',      {}],
      [REGIONS.HOME_GREETING,        'home-module',      {}],
      [REGIONS.HOME_STATS,           'home-module',      {}],
      [REGIONS.HOME_PHASE_BANNER,    'home-module',      {}],
      [REGIONS.HOME_INSIGHT_CARD,    'home-module',      {}],
      [REGIONS.HOME_CTA,             'home-module',      {}],
      [REGIONS.INSIGHTS_DISCOVERIES, 'insights-module',  {}],
      [REGIONS.INSIGHTS_PHASE_MAP,   'insights-module',  {}],
      [REGIONS.TIMELINE_LIST,        'timeline-module',  {}],
      [REGIONS.FASTING_WIDGET,       'fasting-module',   {}],
      [REGIONS.PREMIUM_BADGE,        'premium-module',   {}],
      [REGIONS.ONBOARDING_SCREEN,    'onboarding-module',{}],
      [REGIONS.RECORD_SCREEN,        'record-module',    {}],
      [REGIONS.SYMPTOM_CHIPS,        'symptoms-module',  {}],
    ];

    OWNERSHIP_DECLARATIONS.forEach(function (d) {
      REG.claim(d[0], d[1], d[2]);
    });

    // Allow home-module to READ symptom chips (for priority sorting)
    REG.allowRead(REGIONS.SYMPTOM_CHIPS, 'home-module');

    // ═══════════════════════════════════════════════════════════
    //  STEP 2: Claim render slots
    // ═══════════════════════════════════════════════════════════

    var SLOT_OWNERS = [
      [SLOTS.CALENDAR,          'calendar-module'],
      [SLOTS.CALENDAR_MONTHLY,  'calendar-module'],
      [SLOTS.HOME_GREETING,     'home-module'],
      [SLOTS.HOME_STATS,        'home-module'],
      [SLOTS.HOME_WEEK_ROW,     'home-module'],
      [SLOTS.HOME_PHASE_BANNER, 'home-module'],
      [SLOTS.HOME_INSIGHT_CARD, 'home-module'],
      [SLOTS.HOME_NUMBERS,      'home-module'],
      [SLOTS.HOME_DISEASE_ADV,  'home-module'],
      [SLOTS.HOME_CTA,          'home-module'],
      [SLOTS.HOME_SUMMARY,      'home-module'],
      [SLOTS.INSIGHTS_DISCOVERIES, 'insights-module'],
      [SLOTS.INSIGHTS_PHASE_MAP,   'insights-module'],
      [SLOTS.INSIGHTS_TIMELINE,    'timeline-module'],
      [SLOTS.ONBOARDING,        'onboarding-module'],
      [SLOTS.PREMIUM_BADGE,     'premium-module'],
      [SLOTS.SYMPTOM_CHIPS,     'symptoms-module'],
      [SLOTS.SYMPTOM_SETTINGS,  'symptoms-module'],
      [SLOTS.FASTING_WIDGET,    'fasting-module'],
      [SLOTS.RECORD_SCREEN,     'record-module'],
      [SLOTS.RECORD_STEPS,      'record-module'],
      [SLOTS.SETTINGS_HERO,     'settings-module'],
      [SLOTS.SETTINGS_DISEASE,  'disease-module'],
    ];

    SLOT_OWNERS.forEach(function (so) {
      AUTH.claimSlot(so[0], so[1]);
    });

    // ═══════════════════════════════════════════════════════════
    //  STEP 3: Wrap render functions with RenderAuthority dedup
    //
    //  This is the key fix for duplicate render races.
    //  buildCalendar() called 10 times synchronously → 1 RAF fires.
    // ═══════════════════════════════════════════════════════════

    function _wrapRender(globalFnName, slotId, owner) {
      var original = window[globalFnName];
      if (typeof original !== 'function') return;
      // 既にラップ済みなら再ラップしない（home-renderer.js 等の後発代入対策）
      if (original.__ippoOwnershipWrapped === true) return;

      var wrapped = function () {
        AUTH.request(slotId, owner, original);
      };
      wrapped.__ippoOwnershipWrapped = true;

      window[globalFnName] = wrapped;
      // Keep a reference to the unwrapped original for internal use.
      // __raw_* は ownership-map のみが管理する。
      window['__raw_' + globalFnName] = original;
    }

    // Calendar
    _wrapRender('buildCalendar',               SLOTS.CALENDAR,          'calendar-module');
    _wrapRender('renderCalendarMonthlySummary', SLOTS.CALENDAR_MONTHLY,  'calendar-module');

    // Home
    _wrapRender('updateGreeting',       SLOTS.HOME_GREETING,     'home-module');
    _wrapRender('buildHomeWeekRow',     SLOTS.HOME_WEEK_ROW,     'home-module');
    _wrapRender('updateHomePhaseBanner',SLOTS.HOME_PHASE_BANNER, 'home-module');
    _wrapRender('updateHomeInsightCard',SLOTS.HOME_INSIGHT_CARD, 'home-module');
    _wrapRender('updateHomeNumbers',    SLOTS.HOME_NUMBERS,      'home-module');
    _wrapRender('updateHomeDiseaseAdvice', SLOTS.HOME_DISEASE_ADV, 'home-module');
    _wrapRender('updateHomeCTA',        SLOTS.HOME_CTA,          'home-module');
    _wrapRender('updateHomeCTAState',   SLOTS.HOME_CTA,          'home-module');
    _wrapRender('updateHomeSummary',    SLOTS.HOME_SUMMARY,      'home-module');

    // Insights
    _wrapRender('renderInsightDiscoveries', SLOTS.INSIGHTS_DISCOVERIES, 'insights-module');
    _wrapRender('renderPhaseMap',           SLOTS.INSIGHTS_PHASE_MAP,   'insights-module');

    // Timeline
    _wrapRender('renderTimeline',    SLOTS.INSIGHTS_TIMELINE, 'timeline-module');
    _wrapRender('updateTimelineView',SLOTS.INSIGHTS_TIMELINE, 'timeline-module');

    // Premium
    _wrapRender('updatePremiumBadges', SLOTS.PREMIUM_BADGE, 'premium-module');
    _wrapRender('renderProHero',       SLOTS.PREMIUM_BADGE, 'premium-module');

    // Fasting
    _wrapRender('renderFasting',           SLOTS.FASTING_WIDGET, 'fasting-module');
    _wrapRender('updateFastingWidgetPhase', SLOTS.FASTING_WIDGET, 'fasting-module');

    // Settings
    _wrapRender('updateSettingsHero',          SLOTS.SETTINGS_HERO,    'settings-module');
    _wrapRender('updateDiseaseSettingDisplay',  SLOTS.SETTINGS_DISEASE, 'disease-module');
    _wrapRender('updateSymptomSettingDisplay',  SLOTS.SYMPTOM_SETTINGS, 'symptoms-module');

    // ═══════════════════════════════════════════════════════════
    //  STEP 4: Register known timers with TimerRegistry
    //
    //  We cannot intercept already-running timers, but we can
    //  register any newly created ones from this point forward.
    //  The existing timers (premiumCheckInterval etc.) were created
    //  before this file loaded — log them as "legacy untracked".
    // ═══════════════════════════════════════════════════════════

    if (TIMERS) {
      // Mark legacy untracked timers in the log
      var legacyTimers = [
        { name: 'premiumCheckInterval', owner: 'premium-module',    type: 'interval', timerType: TIMERS.TYPES.AUTH,     delay: 500 },
        { name: 'adminCheckInterval',   owner: 'admin-module',      type: 'interval', timerType: TIMERS.TYPES.AUTH,     delay: 500 },
        { name: '_syncIndicatorTimer',  owner: 'ui-module',         type: 'timeout',  timerType: TIMERS.TYPES.UI,       delay: 800 },
        { name: '_toastTimer',          owner: 'ui-module',         type: 'timeout',  timerType: TIMERS.TYPES.UI,       delay: 4000 },
        { name: 'fastInterval',         owner: 'fasting-module',    type: 'interval', timerType: TIMERS.TYPES.FASTING,  delay: 1000 },
        { name: 'restoreInterval',      owner: 'app-bootstrap',     type: 'interval', timerType: TIMERS.TYPES.HYDRATION,delay: 500 },
        { name: '_pollingInterval',     owner: 'runtime-controller',type: 'interval', timerType: TIMERS.TYPES.POLLING,  delay: 3000 },
        { name: '_reconcileInterval',   owner: 'runtime-orchestrator',type:'interval',timerType: TIMERS.TYPES.POLLING,  delay: 5000 },
      ];

      legacyTimers.forEach(function (t) {
        // Use -1 as sentinel handle (not a real handle, just for inventory)
        // These will show up in the registry as 'legacy-untracked'
        TIMERS.register('legacy:' + t.name, t.owner, t.type, t.name, t.delay, t.timerType);
      });
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 5: Register modules with ModuleLifecycle
    // ═══════════════════════════════════════════════════════════

    if (ML) {
      // Calendar module
      var calendarModule = ML.createModule('calendar-module', {
        slots:   [SLOTS.CALENDAR, SLOTS.CALENDAR_MONTHLY],
        regions: [REGIONS.CALENDAR_GRID, REGIONS.CALENDAR_LABEL, REGIONS.CALENDAR_MONTHLY],
        onRender: function () {
          if (typeof window.__raw_buildCalendar === 'function') window.__raw_buildCalendar();
        },
      });

      // Home module
      var homeModule = ML.createModule('home-module', {
        slots: [
          SLOTS.HOME_GREETING, SLOTS.HOME_STATS, SLOTS.HOME_WEEK_ROW,
          SLOTS.HOME_PHASE_BANNER, SLOTS.HOME_INSIGHT_CARD, SLOTS.HOME_NUMBERS,
          SLOTS.HOME_DISEASE_ADV, SLOTS.HOME_CTA, SLOTS.HOME_SUMMARY,
        ],
        regions: [
          REGIONS.HOME_GREETING, REGIONS.HOME_STATS, REGIONS.HOME_WEEK_ROW,
          REGIONS.HOME_PHASE_BANNER, REGIONS.HOME_INSIGHT_CARD, REGIONS.HOME_CTA,
        ],
        onRender: function () {
          if (typeof window.__raw_updateGreeting    === 'function') window.__raw_updateGreeting();
          if (typeof window.__raw_buildHomeWeekRow  === 'function') window.__raw_buildHomeWeekRow();
          if (typeof window.__raw_updateHomeNumbers === 'function') window.__raw_updateHomeNumbers();
          if (typeof window.__raw_updateHomeSummary === 'function') window.__raw_updateHomeSummary();
        },
      });

      // Insights module
      var insightsModule = ML.createModule('insights-module', {
        slots:   [SLOTS.INSIGHTS_DISCOVERIES, SLOTS.INSIGHTS_PHASE_MAP],
        regions: [REGIONS.INSIGHTS_DISCOVERIES, REGIONS.INSIGHTS_PHASE_MAP],
        onRender: function () {
          if (typeof window.__raw_renderInsightDiscoveries === 'function') window.__raw_renderInsightDiscoveries();
        },
      });

      // Timeline module
      var timelineModule = ML.createModule('timeline-module', {
        slots:   [SLOTS.INSIGHTS_TIMELINE],
        regions: [REGIONS.TIMELINE_LIST],
        onRender: function () {
          if (typeof window.__raw_renderTimeline === 'function') window.__raw_renderTimeline();
        },
      });

      // Onboarding module
      var onboardingModule = ML.createModule('onboarding-module', {
        slots:   [SLOTS.ONBOARDING],
        regions: [REGIONS.ONBOARDING_SCREEN],
      });

      // Premium module
      var premiumModule = ML.createModule('premium-module', {
        slots:   [SLOTS.PREMIUM_BADGE],
        regions: [REGIONS.PREMIUM_BADGE],
        onRender: function () {
          if (typeof window.__raw_updatePremiumBadges === 'function') window.__raw_updatePremiumBadges();
        },
      });

      // Fasting module
      var fastingModule = ML.createModule('fasting-module', {
        slots:   [SLOTS.FASTING_WIDGET],
        regions: [REGIONS.FASTING_WIDGET],
        onRender: function () {
          if (typeof window.__raw_renderFasting === 'function') window.__raw_renderFasting();
        },
      });

      // Symptoms module
      var symptomsModule = ML.createModule('symptoms-module', {
        slots:   [SLOTS.SYMPTOM_CHIPS, SLOTS.SYMPTOM_SETTINGS],
        regions: [REGIONS.SYMPTOM_CHIPS],
      });

      // Disease module
      var diseaseModule = ML.createModule('disease-module', {
        slots:   [SLOTS.SETTINGS_DISEASE],
        regions: [],
      });

      // Record module
      var recordModule = ML.createModule('record-module', {
        slots:   [SLOTS.RECORD_SCREEN, SLOTS.RECORD_STEPS],
        regions: [REGIONS.RECORD_SCREEN],
      });

      // Settings module
      var settingsModule = ML.createModule('settings-module', {
        slots:   [SLOTS.SETTINGS_HERO],
        regions: [],
      });

      // Initialize all modules
      [
        calendarModule, homeModule, insightsModule, timelineModule,
        onboardingModule, premiumModule, fastingModule, symptomsModule,
        diseaseModule, recordModule, settingsModule,
      ].forEach(function (m) { m.init(); });
    }

    // ═══════════════════════════════════════════════════════════
    //  STEP 6: Startup sequence integration
    //
    //  Listen for ippo:state-ready and batch the initial render
    //  through RenderAuthority to prevent the startup render pile-up.
    // ═══════════════════════════════════════════════════════════

    window.addEventListener('ippo:state-ready', function onStateReady() {
      window.removeEventListener('ippo:state-ready', onStateReady);

      // Queue all initial renders through RenderAuthority.
      // Even if called synchronously here, they are all deduplicated
      // and flushed in a single RAF pass.
      if (typeof window.buildCalendar === 'function')            window.buildCalendar();
      if (typeof window.buildHomeWeekRow === 'function')         window.buildHomeWeekRow();
      if (typeof window.updateGreeting === 'function')           window.updateGreeting();
      if (typeof window.updateHomePhaseBanner === 'function')    window.updateHomePhaseBanner();
      if (typeof window.updateHomeInsightCard === 'function')    window.updateHomeInsightCard();
      if (typeof window.updateHomeNumbers === 'function')        window.updateHomeNumbers();
      if (typeof window.updateHomeDiseaseAdvice === 'function')  window.updateHomeDiseaseAdvice();
      if (typeof window.updateSymptomSettingDisplay === 'function') window.updateSymptomSettingDisplay();
      if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
    }, { once: true });

    // ═══════════════════════════════════════════════════════════
    //  STEP 7: Compatibility bridges
    //
    //  Legacy code calls buildCalendar() directly.
    //  After wrapping in STEP 3, window.buildCalendar already goes
    //  through RenderAuthority. No additional bridge needed for these.
    //
    //  Additional aliases for modules that may reference old names:
    // ═══════════════════════════════════════════════════════════

    // Expose module instances for external access
    if (ML) {
      window.ippoModules = {
        calendar:   ML.getModule('calendar-module'),
        home:       ML.getModule('home-module'),
        insights:   ML.getModule('insights-module'),
        timeline:   ML.getModule('timeline-module'),
        onboarding: ML.getModule('onboarding-module'),
        premium:    ML.getModule('premium-module'),
        fasting:    ML.getModule('fasting-module'),
        symptoms:   ML.getModule('symptoms-module'),
        disease:    ML.getModule('disease-module'),
        record:     ML.getModule('record-module'),
        settings:   ML.getModule('settings-module'),
      };
    }

    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent('ownership-map-applied', {
        renderSlots: SLOT_OWNERS.length,
        domRegions: OWNERSHIP_DECLARATIONS.length,
      });
    }

    console.info('[OwnershipMap] ownership declared:',
      OWNERSHIP_DECLARATIONS.length, 'regions,',
      SLOT_OWNERS.length, 'render slots');
  });
})();
