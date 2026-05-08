// ============================================================
//  ippo – src/modules/record-save-adoption.js
//  Phase 3-L-1: module payload adoption candidate layer
//
//  目的:
//  - delegation plan が採用可能な場合だけ、module payload adoption candidate を記録する
//  - 実保存・state.records・localStorage・Supabase は変更しない
//  - limited real delegation 前の最終安全確認レイヤー
// ============================================================

const WRAP_FLAG = '__ippoRecordSaveAdoptionObserved';
const HISTORY_LIMIT = 20;
const adoptionCandidateHistory = [];

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
    console.debug('[ippo:record-save-adoption]', label, detail || '');
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

function isModulePayloadAdoptionEnabled() {
  return window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__ === true;
}

function setModulePayloadAdoptionEnabled(value) {
  window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__ = value === true;
  return window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__;
}

function getDelegationPlan(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  return safeContext.recordSaveDelegationPlan
    || safeContext.meta?.recordSaveDelegationPlan
    || null;
}

function buildModulePayloadAdoptionCandidate(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const plan = getDelegationPlan(safeContext);
  const blockedBy = [];
  const rollbackBlockers = [];
  const enabled = isModulePayloadAdoptionEnabled();
  const payload = plan?.modulePayload || null;
  const payloadSummary = plan?.modulePayloadSummary || null;

  if (!enabled) blockedBy.push('module-payload-adoption-disabled');
  if (!plan) blockedBy.push('missing-delegation-plan');
  if (plan && plan.canAdoptPlan !== true) blockedBy.push('delegation-plan-not-adoptable');
  if (!payload) blockedBy.push('missing-module-payload');
  if (plan?.saveMode !== 'create') blockedBy.push('not-create-only');
  if (plan?.previewUpsert?.mode !== 'insert') blockedBy.push('not-insert-upsert');
  if (payloadSummary?.recordDate && payloadSummary?.idDate && payloadSummary.recordDate !== payloadSummary.idDate) {
    blockedBy.push('payload-date-id-mismatch');
  }

  (plan?.rollbackBlockers || []).forEach(function(reason) {
    rollbackBlockers.push(reason);
  });

  const canAdoptModulePayload = blockedBy.length === 0 && rollbackBlockers.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'module-payload-adoption-candidate',
    enabled: enabled,
    canAdoptModulePayload: canAdoptModulePayload,
    targetDate: plan?.targetDate || payloadSummary?.recordDate || '',
    saveMode: plan?.saveMode || 'unknown',
    persistenceStrategy: plan?.persistenceStrategy || 'unknown',
    modulePayloadSummary: payloadSummary,
    modulePayload: payload,
    previewUpsert: plan?.previewUpsert || null,
    shadowMatched: plan?.shadowMatched === true,
    candidateSource: plan?.candidateSource || 'none',
    candidateBranch: plan?.candidateBranch || 'unknown',
    blockedBy: Array.from(new Set(blockedBy)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'Candidate only. This does not mutate records or replace saveRecordScreen persistence.',
  };
}

function summarizeModulePayloadAdoptionCandidate(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const rollbackBlockerCounts = {};
  const strategyCounts = {};

  list.forEach(function(item) {
    const strategy = item.persistenceStrategy || 'unknown';
    strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;

    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
    (item.rollbackBlockers || []).forEach(function(reason) {
      rollbackBlockerCounts[reason] = (rollbackBlockerCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    enabledCount: list.filter(function(item) { return item.enabled === true; }).length,
    adoptableCount: list.filter(function(item) { return item.canAdoptModulePayload === true; }).length,
    blockedCount: list.filter(function(item) { return item.canAdoptModulePayload !== true; }).length,
    blockedByCounts: blockedByCounts,
    rollbackBlockerCounts: rollbackBlockerCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachModulePayloadAdoptionCandidateToContext(context, candidate) {
  const summary = summarizeModulePayloadAdoptionCandidate(adoptionCandidateHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.modulePayloadAdoptionCandidate = candidate;
    context.meta.modulePayloadAdoptionCandidateSummary = summary;
    context.modulePayloadAdoptionCandidate = candidate;
    context.modulePayloadAdoptionCandidateSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.modulePayloadAdoptionCandidateReady = candidate.canAdoptModulePayload === true;
      context.healthSummary.modulePayloadAdoptionCandidateBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordModulePayloadAdoptionCandidate(context) {
  const saveContext = context || getLastRecordSaveContext();
  const candidate = buildModulePayloadAdoptionCandidate(saveContext);

  adoptionCandidateHistory.push(candidate);
  while (adoptionCandidateHistory.length > HISTORY_LIMIT) {
    adoptionCandidateHistory.shift();
  }

  attachModulePayloadAdoptionCandidateToContext(saveContext, candidate);
  trace('module-payload-adoption-candidate:recorded', candidate);
  return candidate;
}

function getModulePayloadAdoptionCandidateHistory() {
  return adoptionCandidateHistory.slice();
}

function getModulePayloadAdoptionCandidateSummary() {
  return summarizeModulePayloadAdoptionCandidate(adoptionCandidateHistory);
}

function clearModulePayloadAdoptionCandidateHistory() {
  adoptionCandidateHistory.splice(0, adoptionCandidateHistory.length);
  return getModulePayloadAdoptionCandidateSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveAdoptionObserved === true) return;

  window.ippoVerifyLastRecordSave = function modulePayloadAdoptionVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const candidate = context?.modulePayloadAdoptionCandidate || context?.meta?.modulePayloadAdoptionCandidate || null;
    const summary = getModulePayloadAdoptionCandidateSummary();

    if (result && typeof result === 'object') {
      result.modulePayloadAdoptionCandidate = candidate;
      result.modulePayloadAdoptionCandidateSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.modulePayloadAdoptionCandidateReady = candidate?.canAdoptModulePayload === true;
        result.healthSummary.modulePayloadAdoptionCandidateBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveAdoptionObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function modulePayloadAdoptionSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordModulePayloadAdoptionCandidate(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordModulePayloadAdoptionCandidate(getLastRecordSaveContext());
        throw error;
      });
    }

    recordModulePayloadAdoptionCandidate(getLastRecordSaveContext());
    return result;
  }

  modulePayloadAdoptionSaveRecordScreen[WRAP_FLAG] = true;
  modulePayloadAdoptionSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = modulePayloadAdoptionSaveRecordScreen;
  trace('saveRecordScreen:module-payload-adoption:installed');
  return true;
}

function installModulePayloadAdoptionCandidate() {
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
  isModulePayloadAdoptionEnabled,
  setModulePayloadAdoptionEnabled,
  buildModulePayloadAdoptionCandidate,
  recordModulePayloadAdoptionCandidate,
  summarizeModulePayloadAdoptionCandidate,
  getModulePayloadAdoptionCandidateHistory,
  getModulePayloadAdoptionCandidateSummary,
  clearModulePayloadAdoptionCandidateHistory,
  installModulePayloadAdoptionCandidate,
};

window.ippoRecordSaveAdoption = Object.freeze({
  isModulePayloadAdoptionEnabled,
  setModulePayloadAdoptionEnabled,
  buildModulePayloadAdoptionCandidate,
  recordModulePayloadAdoptionCandidate,
  summarizeModulePayloadAdoptionCandidate,
  getModulePayloadAdoptionCandidateHistory,
  getModulePayloadAdoptionCandidateSummary,
  clearModulePayloadAdoptionCandidateHistory,
  installModulePayloadAdoptionCandidate,
});

window.ippoSetModulePayloadAdoptionEnabled = setModulePayloadAdoptionEnabled;
window.ippoIsModulePayloadAdoptionEnabled = isModulePayloadAdoptionEnabled;
window.ippoModulePayloadAdoptionCandidateSummary = getModulePayloadAdoptionCandidateSummary;
window.ippoModulePayloadAdoptionCandidateHistory = getModulePayloadAdoptionCandidateHistory;
window.ippoClearModulePayloadAdoptionCandidateHistory = clearModulePayloadAdoptionCandidateHistory;

installModulePayloadAdoptionCandidate();
