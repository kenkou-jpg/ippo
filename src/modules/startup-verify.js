// ============================================================
// ippo – startup-verify.js
//
// 起動後の安全確認をまとめる read-only verifier。
// 保存・同期・UI描画の本処理は変更しない。
// ============================================================

const STARTUP_REQUIRED_APIS = [
  'saveState',
  'loadState',
  'openRecordScreen',
  'saveRecord',
  'resetRecordForm',
  'updateDiseaseQuestions',
  'ippoBootSummary',
  'ippoLegacyWindowBridgeSummary',
  'ippoWelcomeResetGuardSummary',
];

function hasDom(id) {
  return !!document.getElementById(id);
}

function inspectStartup() {
  const apis = {};
  STARTUP_REQUIRED_APIS.forEach((name) => {
    apis[name] = {
      exists: typeof window[name] !== 'undefined',
      type: typeof window[name],
    };
  });

  const dom = {
    app: hasDom('app'),
    welcome: hasDom('screen-welcome'),
    mainApp: hasDom('main-app'),
    home: hasDom('screen-home'),
    calendar: hasDom('screen-calendar'),
    record: hasDom('screen-record'),
  };

  const missingApis = STARTUP_REQUIRED_APIS.filter((name) => !apis[name].exists);
  const missingDom = Object.keys(dom).filter((key) => !dom[key]);

  const bootSummary = typeof window.ippoBootSummary === 'function'
    ? window.ippoBootSummary()
    : null;

  const legacyBridge = typeof window.ippoLegacyWindowBridgeSummary === 'function'
    ? window.ippoLegacyWindowBridgeSummary()
    : null;

  return {
    checkedAt: new Date().toISOString(),
    readyState: document.readyState,
    viteReady: !!window.__ippoViteReady,
    stateReady: typeof window.state === 'object' && !!window.state,
    recordsReady: Array.isArray(window.state && window.state.records),
    supabaseReady: !!window.supabase,
    supabaseStatus: window.__ippoSupabaseStatus || null,
    apis,
    missingApis,
    dom,
    missingDom,
    bootSummary,
    legacyBridge,
    safeToContinueMigration: missingApis.length === 0 && missingDom.length === 0,
  };
}

function runStartupVerify() {
  const summary = inspectStartup();

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-verify-ran', {
      missingApiCount: summary.missingApis.length,
      missingDomCount: summary.missingDom.length,
      safeToContinueMigration: summary.safeToContinueMigration,
    });
  }

  if (!summary.safeToContinueMigration && typeof window.ippoMarkBootWarning === 'function') {
    window.ippoMarkBootWarning('startup-verify-not-clean', {
      missingApis: summary.missingApis,
      missingDom: summary.missingDom,
    });
  }

  window.__ippoLastStartupVerify = summary;
  return summary;
}

window.ippoStartupVerifySummary = function() {
  return window.__ippoLastStartupVerify || inspectStartup();
};

window.ippoRunStartupVerify = runStartupVerify;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runStartupVerify, { once: true });
} else {
  window.setTimeout(runStartupVerify, 0);
}

export {
  STARTUP_REQUIRED_APIS,
  inspectStartup,
  runStartupVerify,
};
