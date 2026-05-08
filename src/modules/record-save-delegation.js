// ============================================================
//  ippo – src/modules/record-save-delegation.js
//  Phase 3-K-2: limited delegation readiness layer
//
//  目的:
//  - module pipeline へ委譲可能かを strict 条件で判定する
//  - まだ saveRecordScreen の実保存には委譲しない
//  - thin orchestrator 化の readiness を観測する
// ============================================================

const HISTORY_LIMIT = 20;
const delegationHistory = [];

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
    console.debug('[ippo:record-save-delegation]', label, detail || '');
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

function isDelegationExperimentEnabled() {
  return window.__IPPO_RECORD_SAVE_DELEGATION_EXPERIMENT__ === true;
}

function buildRecordSaveDelegationReadiness(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const draftPreview = safeContext.recordDraftPreview
    || safeContext.meta?.recordDraftPreview
    || null;
  const targetPreview = safeContext.recordSaveTargetPreview
    || safeContext.meta?.recordSaveTargetPreview
    || null;
  const persistencePreview = safeContext.recordPersistencePreview
    || safeContext.meta?.recordPersistencePreview
    || null;
  const shadowOutcome = safeContext.recordSaveShadowOutcome
    || safeContext.meta?.recordSaveShadowOutcome
    || null;
  const candidate = safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
    || null;

  const blockedBy = [];
  const warnings = [];

  const explicitFlagEnabled = isDelegationExperimentEnabled();
  const createOnly = persistencePreview?.saveMode === 'create';
  const noWarnings = (draftPreview?.warnings || []).length === 0
    && (targetPreview?.warnings || []).length === 0
    && (persistencePreview?.warnings || []).length === 0
    && (shadowOutcome?.warnings || []).length === 0;
  const candidateUsable = candidate?.canUseCandidate === true;
  const payloadConsistent = persistencePreview?.payloadSummary?.recordDate
    && persistencePreview?.payloadSummary?.recordDate === persistencePreview?.payloadSummary?.idDate;
  const shadowMatched = shadowOutcome?.matched === true;
  const preparable = persistencePreview?.canPrepare === true;

  if (!explicitFlagEnabled) blockedBy.push('delegation-experiment-disabled');
  if (!createOnly) blockedBy.push('not-create-only-save');
  if (!candidateUsable) blockedBy.push('candidate-not-usable');
  if (!payloadConsistent) blockedBy.push('payload-not-consistent');
  if (!preparable) blockedBy.push('persistence-preview-not-preparable');
  if (!shadowMatched) blockedBy.push('shadow-outcome-not-matched');

  if (!noWarnings) warnings.push('pipeline-has-warnings');
  if (shadowOutcome?.previewUpsertMode !== 'insert') {
    warnings.push('preview-upsert-not-insert');
  }

  const delegationReady = blockedBy.length === 0 && warnings.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-save-delegation-readiness',
    delegationReady: delegationReady,
    explicitFlagEnabled: explicitFlagEnabled,
    createOnly: createOnly,
    noWarnings: noWarnings,
    candidateUsable: candidateUsable,
    payloadConsistent: payloadConsistent,
    preparable: preparable,
    shadowMatched: shadowMatched,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Readiness layer only. Actual save delegation is still disabled.',
  };
}

function summarizeRecordSaveDelegation(history) {
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
    readyCount: list.filter(function(item) { return item.delegationReady === true; }).length,
    blockedCount: list.filter(function(item) { return item.delegationReady !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveDelegationToContext(context, readiness) {
  const summary = summarizeRecordSaveDelegation(delegationHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveDelegationReadiness = readiness;
    context.meta.recordSaveDelegationSummary = summary;
    context.recordSaveDelegationReadiness = readiness;
    context.recordSaveDelegationSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveDelegationReady = readiness.delegationReady === true;
      context.healthSummary.recordSaveDelegationBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordSaveDelegationReadiness(context) {
  const saveContext = context || getLastRecordSaveContext();
  const readiness = buildRecordSaveDelegationReadiness(saveContext);

  delegationHistory.push(readiness);
  while (delegationHistory.length > HISTORY_LIMIT) {
    delegationHistory.shift();
  }

  attachRecordSaveDelegationToContext(saveContext, readiness);
  trace('delegation-readiness:recorded', readiness);
  return readiness;
}

function getRecordSaveDelegationHistory() {
  return delegationHistory.slice();
}

function getRecordSaveDelegationSummary() {
  return summarizeRecordSaveDelegation(delegationHistory);
}

function clearRecordSaveDelegationHistory() {
  delegationHistory.splice(0, delegationHistory.length);
  return getRecordSaveDelegationSummary();
}

function installRecordSaveDelegation() {
  return true;
}

export {
  isDelegationExperimentEnabled,
  buildRecordSaveDelegationReadiness,
  recordSaveDelegationReadiness,
  summarizeRecordSaveDelegation,
  getRecordSaveDelegationHistory,
  getRecordSaveDelegationSummary,
  clearRecordSaveDelegationHistory,
  installRecordSaveDelegation,
};

window.ippoRecordSaveDelegation = Object.freeze({
  isDelegationExperimentEnabled,
  buildRecordSaveDelegationReadiness,
  recordSaveDelegationReadiness,
  summarizeRecordSaveDelegation,
  getRecordSaveDelegationHistory,
  getRecordSaveDelegationSummary,
  clearRecordSaveDelegationHistory,
  installRecordSaveDelegation,
});

window.ippoSetRecordSaveDelegationExperimentEnabled = function(value) {
  window.__IPPO_RECORD_SAVE_DELEGATION_EXPERIMENT__ = value === true;
  return window.__IPPO_RECORD_SAVE_DELEGATION_EXPERIMENT__;
};

window.ippoRecordSaveDelegationSummary = getRecordSaveDelegationSummary;
window.ippoRecordSaveDelegationHistory = getRecordSaveDelegationHistory;
window.ippoClearRecordSaveDelegationHistory = clearRecordSaveDelegationHistory;

installRecordSaveDelegation();
