// ============================================================
// ippo – production-smoke-verification.js
//
// Lightweight, detect-only production smoke verification.
// Does not change startup, hydration, save, sync, or persistence behavior.
// ============================================================

const SMOKE_KEY = '__ippoProductionSmokeVerification';
const MAX_SMOKE_EVENTS = 80;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getSmokeState() {
  if (!window[SMOKE_KEY]) {
    window[SMOKE_KEY] = {
      loadedAt: nowIso(),
      checks: {},
      events: [],
    };
  }
  return window[SMOKE_KEY];
}

function pushEvent(name, detail) {
  const state = getSmokeState();
  state.events.push({
    name,
    detail: detail || null,
    at: nowIso(),
  });
  if (state.events.length > MAX_SMOKE_EVENTS) state.events.shift();
}

function markBootEvent(name, detail) {
  try {
    if (typeof window.ippoMarkBootEvent === 'function') {
      window.ippoMarkBootEvent(name, detail || null);
    }
  } catch (_) {}
}

function markBootWarning(name, detail) {
  try {
    if (typeof window.ippoMarkBootWarning === 'function') {
      window.ippoMarkBootWarning(name, detail || null);
    }
  } catch (_) {}
}

function checkStartupSmoke() {
  return {
    appRootExists: !!document.getElementById('app'),
    domReady: document.readyState !== 'loading',
    viteReady: window.__ippoViteReady === true,
    interactionReady: window.__ippoInteractionReady === true,
    bootSummaryReady: typeof window.ippoBootSummary === 'function',
  };
}

function checkHydrationSmoke() {
  return {
    hydrationTraceReady: typeof window.ippoTraceHydrationPhase === 'function',
    startupVerifyReady: typeof window.ippoStartupVerifySummary === 'function',
    legacyBridgeReady: typeof window.ippoLegacyWindowBridgeSummary === 'function',
  };
}

function checkPersistenceSmoke() {
  return {
    persistenceTraceReady: typeof window.ippoPersistenceTraceRuntimeSummary === 'function',
    saveStateReady: typeof window.saveState === 'function',
    stateExists: !!window.state,
    recordsArrayReady: !!(window.state && Array.isArray(window.state.records)),
  };
}

function checkSyncSmoke() {
  const supabaseStatus = window.__ippoSupabaseStatus || null;
  return {
    supabaseStatus,
    supabaseReady: !!(supabaseStatus && supabaseStatus.ready),
    requestNotificationPermissionReady: typeof window.requestNotificationPermission === 'function',
    scheduleRemindersReady: typeof window.scheduleReminders === 'function',
  };
}

function checkRuntimeSmoke() {
  let bootSummary = null;
  try {
    if (typeof window.ippoBootSummary === 'function') {
      bootSummary = window.ippoBootSummary();
    }
  } catch (_) {}

  const verification = bootSummary && bootSummary.verification ? bootSummary.verification : null;
  return {
    bootSummaryReady: !!bootSummary,
    reloadLoopSuspected: !!(verification && verification.reloadLoop && verification.reloadLoop.suspected),
    runtimeMismatchSuspected: !!(verification && verification.runtimeMismatch && verification.runtimeMismatch.suspected),
    serviceWorker: verification && verification.serviceWorker ? verification.serviceWorker : null,
    recentWarnings: bootSummary && bootSummary.warnings ? bootSummary.warnings : [],
    recentErrors: bootSummary && bootSummary.errors ? bootSummary.errors : [],
  };
}

function getSmokeWarnings(checks) {
  const warnings = [];

  if (!checks.startup.appRootExists) warnings.push('app-root-missing');
  if (!checks.startup.domReady) warnings.push('dom-not-ready');
  if (!checks.startup.bootSummaryReady) warnings.push('boot-summary-unavailable');
  if (!checks.persistence.stateExists) warnings.push('state-missing');
  if (!checks.persistence.recordsArrayReady) warnings.push('records-array-unavailable');
  if (!checks.sync.supabaseReady) warnings.push('supabase-not-ready');
  if (checks.runtime.reloadLoopSuspected) warnings.push('reload-loop-suspected');
  if (checks.runtime.runtimeMismatchSuspected) warnings.push('runtime-mismatch-suspected');

  return warnings;
}

function runProductionSmokeVerification() {
  const state = getSmokeState();
  const checks = {
    startup: checkStartupSmoke(),
    hydration: checkHydrationSmoke(),
    persistence: checkPersistenceSmoke(),
    sync: checkSyncSmoke(),
    runtime: checkRuntimeSmoke(),
  };
  const warnings = getSmokeWarnings(checks);

  state.checkedAt = nowIso();
  state.checks = checks;
  state.warnings = warnings;
  state.ok = warnings.length === 0;

  pushEvent('production-smoke-checked', {
    ok: state.ok,
    warnings,
  });
  markBootEvent('production-smoke-checked', {
    ok: state.ok,
    warnings,
  });

  if (warnings.length) {
    markBootWarning('production-smoke-warning', {
      warnings,
    });
  }

  return summarizeProductionSmokeVerification();
}

function summarizeProductionSmokeVerification() {
  const state = getSmokeState();
  return {
    loadedAt: state.loadedAt,
    checkedAt: state.checkedAt || null,
    ok: state.ok === true,
    warnings: state.warnings || [],
    checks: state.checks || {},
    recentEvents: state.events.slice(-20),
  };
}

function scheduleProductionSmokeVerification() {
  window.setTimeout(() => {
    runProductionSmokeVerification();
  }, 0);

  window.setTimeout(() => {
    runProductionSmokeVerification();
  }, 1500);
}

window.ippoRunProductionSmokeVerification = runProductionSmokeVerification;
window.ippoProductionSmokeVerificationSummary = summarizeProductionSmokeVerification;

scheduleProductionSmokeVerification();
markBootEvent('production-smoke-verification-ready');

export {
  runProductionSmokeVerification,
  summarizeProductionSmokeVerification,
};
