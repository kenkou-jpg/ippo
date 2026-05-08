// ============================================================
//  ippo – src/modules/record-save-result.js
//  Phase 3-M-3: record save result normalization
//
//  目的:
//  - saveRecordScreen の保存後処理を薄型化するため、persist / sync / notify / verify の結果を標準化する
//  - 既存の保存経路は変更しない
//  - post-save result を一枚の normalized result として観測する
// ============================================================

const WRAP_FLAG = '__ippoRecordSaveResultObserved';
const HISTORY_LIMIT = 20;
const resultHistory = [];

function isTraceEnabled() {
  try {
    return localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true;
  } catch(e) {
    return window.__IPPO_DEBUG_RECORD__ === true;
  }
}

function trace(label, detail) {
  if (!isTraceEnabled()) return;
  try {
    console.debug('[ippo:record-save-result]', label, detail || '');
  } catch(e) {}
}

function getLastRecordSaveContext() {
  try {
    if (typeof window.ippoLastRecordSaveContext === 'function') {
      return window.ippoLastRecordSaveContext();
    }
  } catch(e) {}
  return window.__IPPO_LAST_RECORD_SAVE_CONTEXT__ || null;
}

function getContextArtifact(context, name) {
  const safeContext = context || {};
  return safeContext[name] || safeContext.meta?.[name] || null;
}

function summarizePhaseStatus(status) {
  return {
    count: status?.count || 0,
    fulfilled: Array.isArray(status?.fulfilled) ? status.fulfilled.slice() : [],
    rejected: Array.isArray(status?.rejected) ? status.rejected.slice() : [],
    skipped: Array.isArray(status?.skipped) ? status.skipped.slice() : [],
    durationMs: status?.durationMs || 0,
  };
}

function buildRecordSaveResult(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const blockedBy = [];
  const warnings = [];

  const persistSummary = summarizePhaseStatus(safeContext.persistSummary);
  const syncSummary = summarizePhaseStatus(safeContext.syncSummary);
  const notifySummary = safeContext.notifySummary || {};
  const healthSummary = safeContext.healthSummary || {};
  const orchestration = getContextArtifact(safeContext, 'recordSaveOrchestrationPreview');
  const shellDecision = getContextArtifact(safeContext, 'thinOrchestratorShellDecision');
  const preSaveDelegation = getContextArtifact(safeContext, 'preSaveModulePayloadDelegation');
  const postSaveVerification = getContextArtifact(safeContext, 'modulePayloadPostSaveVerification');
  const shadowOutcome = getContextArtifact(safeContext, 'recordSaveShadowOutcome');

  if (!safeContext || typeof safeContext !== 'object' || !safeContext.createdAt) blockedBy.push('missing-save-context');
  if (healthSummary.ok !== true) warnings.push('health-summary-not-ok');
  if (persistSummary.count === 0) warnings.push('missing-persist-summary');
  if (syncSummary.count === 0) warnings.push('missing-sync-summary');
  if (!notifySummary || notifySummary.count === 0) warnings.push('missing-notify-summary');
  if (postSaveVerification?.didDelegate === true && postSaveVerification?.verified !== true) {
    blockedBy.push('delegated-payload-not-verified');
  }
  if (shellDecision?.didUseShellPayload === true && shadowOutcome?.matched === false) {
    blockedBy.push('shell-payload-shadow-not-matched');
  }

  const ok = blockedBy.length === 0 && healthSummary.ok === true;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-save-result-normalized',
    ok: ok,
    saveLabel: safeContext.label || '',
    finalizedAt: safeContext.finalizedAt || '',
    activeRecordsLength: safeContext.activeRecordsLength || 0,
    actionCount: safeContext.actionCount || 0,
    persist: persistSummary,
    sync: syncSummary,
    notify: {
      count: notifySummary.count || 0,
      called: Array.isArray(notifySummary.called) ? notifySummary.called.slice() : [],
      skipped: Array.isArray(notifySummary.skipped) ? notifySummary.skipped.slice() : [],
      durationMs: notifySummary.durationMs || 0,
    },
    healthSummary: healthSummary,
    orchestration: {
      usable: orchestration?.canUseAsThinOrchestrator === true,
      shellUsed: shellDecision?.didUseShellPayload === true,
      preSaveDelegated: preSaveDelegation?.didDelegate === true,
      postSaveVerified: postSaveVerification?.verified === true,
      shadowMatched: shadowOutcome?.matched === true,
    },
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Normalized post-save result. It does not mutate records, storage, or cloud sync.',
  };
}

function summarizeRecordSaveResult(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};

  list.forEach(function(item) {
    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
    (item.warnings || []).forEach(function(reason) {
      warningCounts[reason] = (warningCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    okCount: list.filter(function(item) { return item.ok === true; }).length,
    blockedCount: list.filter(function(item) { return item.ok !== true; }).length,
    shellUsedCount: list.filter(function(item) { return item.orchestration?.shellUsed === true; }).length,
    preSaveDelegatedCount: list.filter(function(item) { return item.orchestration?.preSaveDelegated === true; }).length,
    postSaveVerifiedCount: list.filter(function(item) { return item.orchestration?.postSaveVerified === true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveResultToContext(context, result) {
  const summary = summarizeRecordSaveResult(resultHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveResult = result;
    context.meta.recordSaveResultSummary = summary;
    context.recordSaveResult = result;
    context.recordSaveResultSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveResultOk = result.ok === true;
      context.healthSummary.recordSaveResultBlockedCount = summary.blockedCount;
      context.healthSummary.recordSaveResultWarningCount = result.warnings.length;
    }
  }

  return summary;
}

function recordSaveResult(context) {
  const saveContext = context || getLastRecordSaveContext();
  const result = buildRecordSaveResult(saveContext);

  resultHistory.push(result);
  while (resultHistory.length > HISTORY_LIMIT) {
    resultHistory.shift();
  }

  attachRecordSaveResultToContext(saveContext, result);
  trace('save-result:recorded', result);
  return result;
}

function getRecordSaveResultHistory() {
  return resultHistory.slice();
}

function getRecordSaveResultSummary() {
  return summarizeRecordSaveResult(resultHistory);
}

function clearRecordSaveResultHistory() {
  resultHistory.splice(0, resultHistory.length);
  return getRecordSaveResultSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveResultObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveResultVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const saveResult = context?.recordSaveResult || context?.meta?.recordSaveResult || null;
    const summary = getRecordSaveResultSummary();

    if (result && typeof result === 'object') {
      result.recordSaveResult = saveResult;
      result.recordSaveResultSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveResultOk = saveResult?.ok === true;
        result.healthSummary.recordSaveResultBlockedCount = summary.blockedCount;
        result.healthSummary.recordSaveResultWarningCount = (saveResult?.warnings || []).length;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveResultObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function recordSaveResultSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordSaveResult(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordSaveResult(getLastRecordSaveContext());
        throw error;
      });
    }

    recordSaveResult(getLastRecordSaveContext());
    return result;
  }

  recordSaveResultSaveRecordScreen[WRAP_FLAG] = true;
  recordSaveResultSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = recordSaveResultSaveRecordScreen;
  trace('saveRecordScreen:save-result:installed');
  return true;
}

function installRecordSaveResult() {
  wrapVerifyLastRecordSave();

  if (wrapSaveRecordScreen()) return true;

  let attempts = 0;
  const timer = window.setInterval(function() {
    attempts++;
    wrapVerifyLastRecordSave();
    if (wrapSaveRecordScreen() || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 250);

  return false;
}

export {
  buildRecordSaveResult,
  recordSaveResult,
  summarizeRecordSaveResult,
  getRecordSaveResultHistory,
  getRecordSaveResultSummary,
  clearRecordSaveResultHistory,
  installRecordSaveResult,
};

window.ippoRecordSaveResult = Object.freeze({
  buildRecordSaveResult,
  recordSaveResult,
  summarizeRecordSaveResult,
  getRecordSaveResultHistory,
  getRecordSaveResultSummary,
  clearRecordSaveResultHistory,
  installRecordSaveResult,
});

window.ippoRecordSaveResultSummary = getRecordSaveResultSummary;
window.ippoRecordSaveResultHistory = getRecordSaveResultHistory;
window.ippoClearRecordSaveResultHistory = clearRecordSaveResultHistory;

installRecordSaveResult();
