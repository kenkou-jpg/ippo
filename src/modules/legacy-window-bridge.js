// ============================================================
// ippo – legacy-window-bridge.js
//
// legacy inline app と Vite modules の bridge observability。
// 既存 window API を変更せず、存在確認のみを行う。
// ============================================================

const REQUIRED_APIS = [
  'saveState',
  'loadState',
  'openRecordScreen',
  'saveRecord',
  'resetRecordForm',
  'updateDiseaseQuestions',
  'ippoVerifyLastRecordSave',
  'ippoRecordSaveCoreSummary',
  'ippoWelcomeResetGuardSummary',
];

function inspectApi(name) {
  return {
    exists: typeof window[name] !== 'undefined',
    type: typeof window[name],
  };
}

function summarizeLegacyBridge() {
  const summary = {
    checkedAt: new Date().toISOString(),
    viteReady: !!window.__ippoViteReady,
    stateReady: typeof window.state === 'object' && !!window.state,
    supabaseReady: !!window.supabase,
    apis: {},
  };

  REQUIRED_APIS.forEach((name) => {
    summary.apis[name] = inspectApi(name);
  });

  summary.missingApis = REQUIRED_APIS.filter((name) => !summary.apis[name].exists);

  return summary;
}

window.ippoLegacyWindowBridgeSummary = summarizeLegacyBridge;

if (typeof window.ippoRegisterWindowApis === 'function') {
  window.ippoRegisterWindowApis(REQUIRED_APIS);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('legacy-window-bridge-loaded', {
    requiredApiCount: REQUIRED_APIS.length,
  });
}

export {
  REQUIRED_APIS,
  summarizeLegacyBridge,
};
