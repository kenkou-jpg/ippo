// ============================================================
// ippo – main-entry-startup-observer-wiring.js
//
// Phase A-5:
// Main entry startup observer wiring visibility.
//
// 目的:
// src/main.js に startup observer 群を observe-only で接続する前提を
// slot / guard / injection point として固定する。
//
// 重要:
// - observe-only
// - candidate startup is not executed
// - init() は呼ばない / 置換しない
// - DOMContentLoaded ownership は移さない
// - render / hydration / save / sync / Supabase は変更しない
// ============================================================

const MAIN_ENTRY_WIRING_KEY = '__ippoMainEntryStartupObserverWiring';

const MAIN_ENTRY_WIRING_ADOPTION = Object.freeze({
  enabled: false,
  mode: 'main-entry-observer-wiring-only',
  candidateExecutionAllowed: false,
  legacyFallbackRequired: true,
});

const MAIN_ENTRY_OBSERVER_SLOTS = Object.freeze([
  {
    id: 'pre-service-runtime-observers',
    location: 'after boot stability imports / before services',
    purpose: 'register startup observability without service side effects',
    adoptionAllowed: false,
  },
  {
    id: 'post-service-readiness',
    location: 'after services imports / before Vite ready mark',
    purpose: 'include startup observer readiness in service readiness visibility',
    adoptionAllowed: false,
  },
  {
    id: 'post-module-load-checks',
    location: 'setTimeout observe-only checks after module load',
    purpose: 'run startup observer checks after legacy globals and DOM readiness can settle',
    adoptionAllowed: false,
  },
  {
    id: 'pre-startup-verify',
    location: 'before ippoRunStartupVerify',
    purpose: 'compare startup observer readiness before final startup verify',
    adoptionAllowed: false,
  },
]);

const MAIN_ENTRY_STARTUP_OBSERVERS = Object.freeze([
  {
    id: 'startup-guard-candidate',
    summaryApi: 'ippoStartupGuardCandidateSummary',
    checkApi: 'ippoRunStartupGuardCandidateCheck',
    importedByMain: true,
    executesStartup: false,
  },
  {
    id: 'legacy-bootstrap-fallback-isolation',
    summaryApi: 'ippoLegacyBootstrapFallbackIsolationSummary',
    checkApi: 'ippoRunLegacyBootstrapFallbackIsolationCheck',
    importedByMain: true,
    executesStartup: false,
  },
  {
    id: 'startup-sequencing-candidate-orchestration',
    summaryApi: 'ippoStartupSequencingCandidateOrchestrationSummary',
    checkApi: 'ippoRunStartupSequencingCandidateOrchestrationCheck',
    importedByMain: true,
    executesStartup: false,
  },
]);

const NON_ADOPTED_GUARDS = Object.freeze([
  {
    id: 'no-candidate-init',
    protectedApi: 'init',
    rule: 'observer must not call or replace init',
  },
  {
    id: 'no-candidate-domcontentloaded-handler',
    protectedApi: 'DOMContentLoaded',
    rule: 'observer must not install active startup handler',
  },
  {
    id: 'no-candidate-render',
    protectedApi: 'renderHome/renderCalendar/renderInsights',
    rule: 'observer must not trigger render flow',
  },
  {
    id: 'no-persistence-touch',
    protectedApi: 'saveState/saveRecord/Supabase/sync',
    rule: 'observer must not touch persistence or sync execution',
  },
]);

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getWiringState() {
  if (!window[MAIN_ENTRY_WIRING_KEY]) {
    window[MAIN_ENTRY_WIRING_KEY] = {
      loadedAt: nowIso(),
      mode: MAIN_ENTRY_WIRING_ADOPTION.mode,
      adoptionEnabled: MAIN_ENTRY_WIRING_ADOPTION.enabled,
      checks: [],
    };
  }

  return window[MAIN_ENTRY_WIRING_KEY];
}

function inspectObserver(observer) {
  return {
    id: observer.id,
    summaryApi: observer.summaryApi,
    checkApi: observer.checkApi,
    importedByMain: observer.importedByMain,
    executesStartup: observer.executesStartup,
    summaryReady: typeof window[observer.summaryApi] === 'function',
    checkReady: typeof window[observer.checkApi] === 'function',
  };
}

function summarizeMainEntryStartupObserverWiring() {
  const state = getWiringState();
  const observers = MAIN_ENTRY_STARTUP_OBSERVERS.map(inspectObserver);
  const notReadyObservers = observers
    .filter((observer) => !observer.summaryReady || !observer.checkReady)
    .map((observer) => observer.id);
  const accidentalExecutionRisks = observers
    .filter((observer) => observer.executesStartup)
    .map((observer) => observer.id);

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    adoption: {
      enabled: !!state.adoptionEnabled,
      candidateExecutionAllowed: MAIN_ENTRY_WIRING_ADOPTION.candidateExecutionAllowed,
      legacyFallbackRequired: MAIN_ENTRY_WIRING_ADOPTION.legacyFallbackRequired,
    },
    observerSlots: MAIN_ENTRY_OBSERVER_SLOTS,
    observers,
    notReadyObservers,
    nonAdoptedGuards: NON_ADOPTED_GUARDS,
    accidentalExecutionRisks,
    mainEntryStartupGraphVisibility: {
      startupGuard: typeof window.ippoStartupGuardCandidateSummary === 'function',
      fallbackIsolation: typeof window.ippoLegacyBootstrapFallbackIsolationSummary === 'function',
      sequencingOrchestration:
        typeof window.ippoStartupSequencingCandidateOrchestrationSummary === 'function',
    },
    safeForObserveOnlyMainEntryWiring:
      !state.adoptionEnabled &&
      !MAIN_ENTRY_WIRING_ADOPTION.candidateExecutionAllowed &&
      notReadyObservers.length === 0 &&
      accidentalExecutionRisks.length === 0,
    safeForPhaseA6Planning:
      !state.adoptionEnabled &&
      notReadyObservers.length === 0 &&
      accidentalExecutionRisks.length === 0,
    checks: state.checks.slice(-20),
  };
}

function runMainEntryStartupObserverWiringCheck(reason) {
  const state = getWiringState();
  const summary = summarizeMainEntryStartupObserverWiring();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    safeForObserveOnlyMainEntryWiring: summary.safeForObserveOnlyMainEntryWiring,
    safeForPhaseA6Planning: summary.safeForPhaseA6Planning,
    notReadyObservers: summary.notReadyObservers,
    accidentalExecutionRisks: summary.accidentalExecutionRisks,
  });

  if (state.checks.length > 40) {
    state.checks.splice(0, state.checks.length - 40);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('main-entry-startup-observer-wiring-check', {
      reason: reason || 'manual',
      safeForObserveOnlyMainEntryWiring: summary.safeForObserveOnlyMainEntryWiring,
      safeForPhaseA6Planning: summary.safeForPhaseA6Planning,
      notReadyObserverCount: summary.notReadyObservers.length,
      accidentalExecutionRiskCount: summary.accidentalExecutionRisks.length,
    });
  }

  if (!summary.safeForObserveOnlyMainEntryWiring && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('main-entry-startup-observer-wiring-not-ready', {
      notReadyObservers: summary.notReadyObservers,
      accidentalExecutionRisks: summary.accidentalExecutionRisks,
    });
  }

  return summarizeMainEntryStartupObserverWiring();
}

window.ippoMainEntryStartupObserverWiringSummary = summarizeMainEntryStartupObserverWiring;
window.ippoRunMainEntryStartupObserverWiringCheck = runMainEntryStartupObserverWiringCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('main-entry-startup-observer-wiring-loaded', {
    mode: MAIN_ENTRY_WIRING_ADOPTION.mode,
    adoptionEnabled: MAIN_ENTRY_WIRING_ADOPTION.enabled,
    candidateExecutionAllowed: MAIN_ENTRY_WIRING_ADOPTION.candidateExecutionAllowed,
  });
}

export {
  MAIN_ENTRY_WIRING_ADOPTION,
  MAIN_ENTRY_OBSERVER_SLOTS,
  MAIN_ENTRY_STARTUP_OBSERVERS,
  NON_ADOPTED_GUARDS,
  summarizeMainEntryStartupObserverWiring,
  runMainEntryStartupObserverWiringCheck,
};
