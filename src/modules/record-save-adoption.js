// ============================================================
//  ippo – src/modules/record-save-adoption.js
//  Phase 3-L-1/2: module payload adoption candidate + guarded pre-save delegation
//
//  目的:
//  - delegation plan が採用可能な場合だけ、module payload adoption candidate を記録する
//  - explicit flag ON の create-only / insert-only 限定で buildDraftFromUI の返却draftを module payload に差し替える
//  - saveRecordScreen 本体 / localStorage / Supabase は直接変更しない
//  - limited real delegation の最小導入点にする
// ============================================================

const WRAP_FLAG = '__ippoRecordSaveAdoptionObserved';
const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordSaveAdoptionBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const PRE_SAVE_HISTORY_LIMIT = 20;
const adoptionCandidateHistory = [];
const preSaveDelegationHistory = [];
const REAL_DELEGATION_FLAG = 'ippo_enable_record_save_module_payload_real_delegation';

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

function getActiveRecordSaveContext() {
  try {
    if (typeof window.ippoActiveRecordSaveContext === 'function') {
      return window.ippoActiveRecordSaveContext();
    }
  } catch(e) {}
  return window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ || null;
}

function isModulePayloadAdoptionEnabled() {
  return window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__ === true;
}

function setModulePayloadAdoptionEnabled(value) {
  window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__ = value === true;
  return window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_ADOPTION__;
}

function isModulePayloadRealDelegationEnabled() {
  try {
    return localStorage.getItem(REAL_DELEGATION_FLAG) === '1'
      || window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_REAL_DELEGATION__ === true;
  } catch(e) {
    return window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_REAL_DELEGATION__ === true;
  }
}

function setModulePayloadRealDelegationEnabled(value) {
  window.__IPPO_RECORD_SAVE_MODULE_PAYLOAD_REAL_DELEGATION__ = value === true;
  try {
    if (value === true) {
      localStorage.setItem(REAL_DELEGATION_FLAG, '1');
    } else {
      localStorage.removeItem(REAL_DELEGATION_FLAG);
    }
  } catch(e) {}
  return isModulePayloadRealDelegationEnabled();
}

function clonePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch(e) {
    return { ...payload };
  }
}

function getDelegationPlan(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  return safeContext.recordSaveDelegationPlan
    || safeContext.meta?.recordSaveDelegationPlan
    || null;
}

function getPersistencePreview(context) {
  const safeContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext() || {};
  return safeContext.recordPersistencePreview
    || safeContext.meta?.recordPersistencePreview
    || null;
}

function getCandidate(context) {
  const safeContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext() || {};
  return safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
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

function buildPreSaveModulePayloadDelegation(draft, context) {
  const safeContext = context || getActiveRecordSaveContext();
  const persistencePreview = getPersistencePreview(safeContext);
  const candidate = getCandidate(safeContext);
  const blockedBy = [];
  const rollbackBlockers = [];
  const enabled = isModulePayloadRealDelegationEnabled();
  const payload = persistencePreview?.payload || null;
  const payloadSummary = persistencePreview?.payloadSummary || null;
  const warnings = persistencePreview?.warnings || [];

  if (!enabled) blockedBy.push('real-delegation-disabled');
  if (!safeContext || typeof safeContext !== 'object' || !safeContext.createdAt) blockedBy.push('missing-active-save-context');
  if (!persistencePreview) blockedBy.push('missing-persistence-preview');
  if (persistencePreview && persistencePreview.canPrepare !== true) blockedBy.push('persistence-preview-not-preparable');
  if (persistencePreview?.saveMode !== 'create') blockedBy.push('not-create-only');
  if (persistencePreview?.upsertPreview?.mode !== 'insert') blockedBy.push('not-insert-upsert');
  if (!payload) blockedBy.push('missing-module-payload');
  if (!payloadSummary?.recordDate) blockedBy.push('payload-missing-record-date');
  if (!payloadSummary?.idDate) blockedBy.push('payload-missing-id-date');
  if (payloadSummary?.recordDate && payloadSummary?.idDate && payloadSummary.recordDate !== payloadSummary.idDate) {
    blockedBy.push('payload-date-id-mismatch');
  }
  if ((warnings || []).length > 0) blockedBy.push('persistence-preview-has-warnings');
  if (candidate?.canUseCandidate !== true) blockedBy.push('candidate-not-usable');
  if (candidate && candidate.preflight !== true) rollbackBlockers.push('candidate-not-preflight');
  if (persistencePreview?.previewRecordsLength && persistencePreview?.sourceRecordsLength && persistencePreview.previewRecordsLength <= persistencePreview.sourceRecordsLength) {
    rollbackBlockers.push('insert-plan-does-not-grow-records');
  }

  const didDelegate = blockedBy.length === 0 && rollbackBlockers.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'pre-save-module-payload-delegation',
    enabled: enabled,
    canDelegate: didDelegate,
    didDelegate: false,
    targetDate: persistencePreview?.targetDate || payloadSummary?.recordDate || '',
    saveMode: persistencePreview?.saveMode || 'unknown',
    persistenceStrategy: persistencePreview?.persistenceStrategy || 'unknown',
    originalDraftRecordDate: draft?.record_date || '',
    originalDraftId: draft?.id || '',
    modulePayloadSummary: payloadSummary || null,
    modulePayload: payload ? clonePayload(payload) : null,
    previewUpsert: persistencePreview?.upsertPreview || null,
    candidateSource: candidate?.candidateSource || 'none',
    candidateBranch: candidate?.candidateBranch || 'unknown',
    blockedBy: Array.from(new Set(blockedBy)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'If didDelegate becomes true, buildDraftFromUI returns modulePayload instead of the original draft. Existing persistence path still handles the returned draft.',
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

function summarizePreSaveModulePayloadDelegation(history) {
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
    delegatableCount: list.filter(function(item) { return item.canDelegate === true; }).length,
    delegatedCount: list.filter(function(item) { return item.didDelegate === true; }).length,
    blockedCount: list.filter(function(item) { return item.didDelegate !== true; }).length,
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

function attachPreSaveModulePayloadDelegationToContext(context, delegation) {
  const summary = summarizePreSaveModulePayloadDelegation(preSaveDelegationHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.preSaveModulePayloadDelegation = delegation;
    context.meta.preSaveModulePayloadDelegationSummary = summary;
    context.preSaveModulePayloadDelegation = delegation;
    context.preSaveModulePayloadDelegationSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.preSaveModulePayloadDelegationEnabled = delegation.enabled === true;
      context.healthSummary.preSaveModulePayloadDelegationDidDelegate = delegation.didDelegate === true;
      context.healthSummary.preSaveModulePayloadDelegationBlockedCount = summary.blockedCount;
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

function recordPreSaveModulePayloadDelegation(delegation, context) {
  const saveContext = context || getActiveRecordSaveContext();
  preSaveDelegationHistory.push(delegation);
  while (preSaveDelegationHistory.length > PRE_SAVE_HISTORY_LIMIT) {
    preSaveDelegationHistory.shift();
  }

  attachPreSaveModulePayloadDelegationToContext(saveContext, delegation);
  trace('pre-save-module-payload-delegation:recorded', delegation);
  return delegation;
}

function applyPreSaveModulePayloadDelegation(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const delegation = buildPreSaveModulePayloadDelegation(draft, saveContext);

  if (delegation.canDelegate === true && delegation.modulePayload) {
    delegation.didDelegate = true;
    delegation.delegatedFields = Object.keys(delegation.modulePayload).slice(0, 50);
    recordPreSaveModulePayloadDelegation(delegation, saveContext);
    return clonePayload(delegation.modulePayload);
  }

  recordPreSaveModulePayloadDelegation(delegation, saveContext);
  return draft;
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

function getPreSaveModulePayloadDelegationHistory() {
  return preSaveDelegationHistory.slice();
}

function getPreSaveModulePayloadDelegationSummary() {
  return summarizePreSaveModulePayloadDelegation(preSaveDelegationHistory);
}

function clearPreSaveModulePayloadDelegationHistory() {
  preSaveDelegationHistory.splice(0, preSaveDelegationHistory.length);
  return getPreSaveModulePayloadDelegationSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveAdoptionObserved === true) return;

  window.ippoVerifyLastRecordSave = function modulePayloadAdoptionVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const candidate = context?.modulePayloadAdoptionCandidate || context?.meta?.modulePayloadAdoptionCandidate || null;
    const summary = getModulePayloadAdoptionCandidateSummary();
    const preSaveDelegation = context?.preSaveModulePayloadDelegation || context?.meta?.preSaveModulePayloadDelegation || null;
    const preSaveDelegationSummary = getPreSaveModulePayloadDelegationSummary();

    if (result && typeof result === 'object') {
      result.modulePayloadAdoptionCandidate = candidate;
      result.modulePayloadAdoptionCandidateSummary = summary;
      result.preSaveModulePayloadDelegation = preSaveDelegation;
      result.preSaveModulePayloadDelegationSummary = preSaveDelegationSummary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.modulePayloadAdoptionCandidateReady = candidate?.canAdoptModulePayload === true;
        result.healthSummary.modulePayloadAdoptionCandidateBlockedCount = summary.blockedCount;
        result.healthSummary.preSaveModulePayloadDelegationEnabled = preSaveDelegation?.enabled === true;
        result.healthSummary.preSaveModulePayloadDelegationDidDelegate = preSaveDelegation?.didDelegate === true;
        result.healthSummary.preSaveModulePayloadDelegationBlockedCount = preSaveDelegationSummary.blockedCount;
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

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function modulePayloadAdoptionBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    return applyPreSaveModulePayloadDelegation(draft, getActiveRecordSaveContext());
  }

  modulePayloadAdoptionBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  modulePayloadAdoptionBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = modulePayloadAdoptionBuildDraftFromUI;
  trace('buildDraftFromUI:pre-save-module-payload-delegation:installed');
  return true;
}

function installModulePayloadAdoptionCandidate() {
  wrapVerifyLastRecordSave();

  const saveWrapped = wrapSaveRecordScreen();
  const draftWrapped = wrapBuildDraftFromUI();
  if (saveWrapped && draftWrapped) return true;

  let attempts = 0;
  const timer = window.setInterval(function() {
    attempts++;
    wrapVerifyLastRecordSave();
    const didWrapSave = wrapSaveRecordScreen();
    const didWrapDraft = wrapBuildDraftFromUI();
    if ((didWrapSave && didWrapDraft) || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 250);

  return false;
}

export {
  isModulePayloadAdoptionEnabled,
  setModulePayloadAdoptionEnabled,
  isModulePayloadRealDelegationEnabled,
  setModulePayloadRealDelegationEnabled,
  buildModulePayloadAdoptionCandidate,
  buildPreSaveModulePayloadDelegation,
  recordModulePayloadAdoptionCandidate,
  recordPreSaveModulePayloadDelegation,
  applyPreSaveModulePayloadDelegation,
  summarizeModulePayloadAdoptionCandidate,
  summarizePreSaveModulePayloadDelegation,
  getModulePayloadAdoptionCandidateHistory,
  getModulePayloadAdoptionCandidateSummary,
  clearModulePayloadAdoptionCandidateHistory,
  getPreSaveModulePayloadDelegationHistory,
  getPreSaveModulePayloadDelegationSummary,
  clearPreSaveModulePayloadDelegationHistory,
  installModulePayloadAdoptionCandidate,
};

window.ippoRecordSaveAdoption = Object.freeze({
  isModulePayloadAdoptionEnabled,
  setModulePayloadAdoptionEnabled,
  isModulePayloadRealDelegationEnabled,
  setModulePayloadRealDelegationEnabled,
  buildModulePayloadAdoptionCandidate,
  buildPreSaveModulePayloadDelegation,
  recordModulePayloadAdoptionCandidate,
  recordPreSaveModulePayloadDelegation,
  applyPreSaveModulePayloadDelegation,
  summarizeModulePayloadAdoptionCandidate,
  summarizePreSaveModulePayloadDelegation,
  getModulePayloadAdoptionCandidateHistory,
  getModulePayloadAdoptionCandidateSummary,
  clearModulePayloadAdoptionCandidateHistory,
  getPreSaveModulePayloadDelegationHistory,
  getPreSaveModulePayloadDelegationSummary,
  clearPreSaveModulePayloadDelegationHistory,
  installModulePayloadAdoptionCandidate,
});

window.ippoSetModulePayloadAdoptionEnabled = setModulePayloadAdoptionEnabled;
window.ippoIsModulePayloadAdoptionEnabled = isModulePayloadAdoptionEnabled;
window.ippoSetModulePayloadRealDelegationEnabled = setModulePayloadRealDelegationEnabled;
window.ippoIsModulePayloadRealDelegationEnabled = isModulePayloadRealDelegationEnabled;
window.ippoModulePayloadAdoptionCandidateSummary = getModulePayloadAdoptionCandidateSummary;
window.ippoModulePayloadAdoptionCandidateHistory = getModulePayloadAdoptionCandidateHistory;
window.ippoClearModulePayloadAdoptionCandidateHistory = clearModulePayloadAdoptionCandidateHistory;
window.ippoPreSaveModulePayloadDelegationSummary = getPreSaveModulePayloadDelegationSummary;
window.ippoPreSaveModulePayloadDelegationHistory = getPreSaveModulePayloadDelegationHistory;
window.ippoClearPreSaveModulePayloadDelegationHistory = clearPreSaveModulePayloadDelegationHistory;

installModulePayloadAdoptionCandidate();
