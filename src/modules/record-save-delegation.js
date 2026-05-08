// ============================================================
//  ippo – src/modules/record-save-delegation.js
//  Phase 3-K-2/3/4: limited delegation readiness + plan layer
//
//  目的:
//  - module pipeline へ委譲可能かを strict 条件で判定する
//  - 保存完了後に delegation readiness を自動記録する
//  - delegationReady の場合に限り、将来採用する payload/strategy を plan 化する
//  - まだ saveRecordScreen の実保存には委譲しない
//  - thin orchestrator 化の readiness を観測する
// ============================================================

const WRAP_FLAG = '__ippoRecordSaveDelegationObserved';
const HISTORY_LIMIT = 20;
const delegationHistory = [];
const delegationPlanHistory = [];

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

function setDelegationExperimentEnabled(value) {
  window.__IPPO_RECORD_SAVE_DELEGATION_EXPERIMENT__ = value === true;
  return window.__IPPO_RECORD_SAVE_DELEGATION_EXPERIMENT__;
}

function getPipelineArtifacts(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  return {
    draftPreview: safeContext.recordDraftPreview || safeContext.meta?.recordDraftPreview || null,
    targetPreview: safeContext.recordSaveTargetPreview || safeContext.meta?.recordSaveTargetPreview || null,
    persistencePreview: safeContext.recordPersistencePreview || safeContext.meta?.recordPersistencePreview || null,
    shadowOutcome: safeContext.recordSaveShadowOutcome || safeContext.meta?.recordSaveShadowOutcome || null,
    candidate: safeContext.limitedDateRealAdoptionCandidate || safeContext.meta?.limitedDateRealAdoptionCandidate || null,
    adoptionOutcome: safeContext.limitedDateAdoptionOutcome || safeContext.meta?.limitedDateAdoptionOutcome || null,
  };
}

function buildRecordSaveDelegationReadiness(context) {
  const artifacts = getPipelineArtifacts(context);
  const draftPreview = artifacts.draftPreview;
  const targetPreview = artifacts.targetPreview;
  const persistencePreview = artifacts.persistencePreview;
  const shadowOutcome = artifacts.shadowOutcome;
  const candidate = artifacts.candidate;
  const adoptionOutcome = artifacts.adoptionOutcome;

  const blockedBy = [];
  const warnings = [];

  const explicitFlagEnabled = isDelegationExperimentEnabled();
  const createOnly = persistencePreview?.saveMode === 'create';
  const noWarnings = (draftPreview?.warnings || []).length === 0
    && (targetPreview?.warnings || []).length === 0
    && (persistencePreview?.warnings || []).length === 0
    && (shadowOutcome?.warnings || []).length === 0;
  const candidateUsable = candidate?.canUseCandidate === true;
  const payloadConsistent = !!persistencePreview?.payloadSummary?.recordDate
    && persistencePreview.payloadSummary.recordDate === persistencePreview.payloadSummary.idDate;
  const shadowMatched = shadowOutcome?.matched === true;
  const preparable = persistencePreview?.canPrepare === true;
  const adoptionSucceeded = adoptionOutcome ? adoptionOutcome.adopted === true : true;

  if (!explicitFlagEnabled) blockedBy.push('delegation-experiment-disabled');
  if (!createOnly) blockedBy.push('not-create-only-save');
  if (!candidateUsable) blockedBy.push('candidate-not-usable');
  if (!payloadConsistent) blockedBy.push('payload-not-consistent');
  if (!preparable) blockedBy.push('persistence-preview-not-preparable');
  if (!shadowMatched) blockedBy.push('shadow-outcome-not-matched');
  if (adoptionOutcome && adoptionOutcome.adopted !== true) blockedBy.push('limited-adoption-not-succeeded');

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
    adoptionSucceeded: adoptionSucceeded,
    targetDate: persistencePreview?.targetDate || shadowOutcome?.targetDate || '',
    persistenceStrategy: persistencePreview?.persistenceStrategy || 'unknown',
    previewUpsertMode: shadowOutcome?.previewUpsertMode || persistencePreview?.upsertPreview?.mode || 'unknown',
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Readiness layer only. Actual save delegation is still disabled.',
  };
}

function buildRecordSaveDelegationPlan(context, readiness) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const artifacts = getPipelineArtifacts(safeContext);
  const finalReadiness = readiness || buildRecordSaveDelegationReadiness(safeContext);
  const persistencePreview = artifacts.persistencePreview;
  const shadowOutcome = artifacts.shadowOutcome;
  const candidate = artifacts.candidate;
  const blockedBy = [];
  const rollbackBlockers = [];

  if (finalReadiness.delegationReady !== true) blockedBy.push('delegation-not-ready');
  if (!persistencePreview?.payload) blockedBy.push('missing-module-payload');
  if (persistencePreview?.upsertPreview?.mode !== 'insert') blockedBy.push('not-insert-plan');
  if (persistencePreview?.targetDate && persistencePreview.payloadSummary?.recordDate && persistencePreview.targetDate !== persistencePreview.payloadSummary.recordDate) {
    blockedBy.push('target-payload-date-mismatch');
  }
  if (shadowOutcome?.targetDate && persistencePreview?.targetDate && shadowOutcome.targetDate !== persistencePreview.targetDate) {
    blockedBy.push('shadow-target-date-mismatch');
  }

  if (persistencePreview?.previewRecordsLength && persistencePreview?.sourceRecordsLength && persistencePreview.previewRecordsLength <= persistencePreview.sourceRecordsLength) {
    rollbackBlockers.push('insert-plan-does-not-grow-records');
  }
  if (candidate?.preflight !== true) rollbackBlockers.push('candidate-not-preflight');

  const canAdoptPlan = blockedBy.length === 0 && rollbackBlockers.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-save-delegation-plan',
    canAdoptPlan: canAdoptPlan,
    delegationReady: finalReadiness.delegationReady === true,
    targetDate: persistencePreview?.targetDate || '',
    targetSource: persistencePreview?.targetSource || 'unknown',
    saveMode: persistencePreview?.saveMode || 'unknown',
    persistenceStrategy: persistencePreview?.persistenceStrategy || 'unknown',
    modulePayloadSummary: persistencePreview?.payloadSummary || null,
    modulePayload: persistencePreview?.payload || null,
    previewUpsert: persistencePreview?.upsertPreview || null,
    shadowMatched: shadowOutcome?.matched === true,
    candidateSource: candidate?.candidateSource || 'none',
    candidateBranch: candidate?.candidateBranch || 'unknown',
    blockedBy: Array.from(new Set(blockedBy)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'Plan only. This identifies the module payload/strategy that could be adopted in a future limited real delegation step.',
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

function summarizeRecordSaveDelegationPlan(history) {
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
    adoptableCount: list.filter(function(item) { return item.canAdoptPlan === true; }).length,
    blockedCount: list.filter(function(item) { return item.canAdoptPlan !== true; }).length,
    blockedByCounts: blockedByCounts,
    rollbackBlockerCounts: rollbackBlockerCounts,
    strategyCounts: strategyCounts,
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

function attachRecordSaveDelegationPlanToContext(context, plan) {
  const summary = summarizeRecordSaveDelegationPlan(delegationPlanHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveDelegationPlan = plan;
    context.meta.recordSaveDelegationPlanSummary = summary;
    context.recordSaveDelegationPlan = plan;
    context.recordSaveDelegationPlanSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveDelegationPlanAdoptable = plan.canAdoptPlan === true;
      context.healthSummary.recordSaveDelegationPlanBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordSaveDelegationReadiness(context) {
  const saveContext = context || getLastRecordSaveContext();
  const readiness = buildRecordSaveDelegationReadiness(saveContext);
  const plan = buildRecordSaveDelegationPlan(saveContext, readiness);

  delegationHistory.push(readiness);
  while (delegationHistory.length > HISTORY_LIMIT) {
    delegationHistory.shift();
  }

  delegationPlanHistory.push(plan);
  while (delegationPlanHistory.length > HISTORY_LIMIT) {
    delegationPlanHistory.shift();
  }

  attachRecordSaveDelegationToContext(saveContext, readiness);
  attachRecordSaveDelegationPlanToContext(saveContext, plan);
  trace('delegation-readiness:recorded', readiness);
  trace('delegation-plan:recorded', plan);
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

function getRecordSaveDelegationPlanHistory() {
  return delegationPlanHistory.slice();
}

function getRecordSaveDelegationPlanSummary() {
  return summarizeRecordSaveDelegationPlan(delegationPlanHistory);
}

function clearRecordSaveDelegationPlanHistory() {
  delegationPlanHistory.splice(0, delegationPlanHistory.length);
  return getRecordSaveDelegationPlanSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveDelegationObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveDelegationVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const readiness = context?.recordSaveDelegationReadiness || context?.meta?.recordSaveDelegationReadiness || null;
    const summary = getRecordSaveDelegationSummary();
    const plan = context?.recordSaveDelegationPlan || context?.meta?.recordSaveDelegationPlan || null;
    const planSummary = getRecordSaveDelegationPlanSummary();

    if (result && typeof result === 'object') {
      result.recordSaveDelegationReadiness = readiness;
      result.recordSaveDelegationSummary = summary;
      result.recordSaveDelegationPlan = plan;
      result.recordSaveDelegationPlanSummary = planSummary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveDelegationReady = readiness?.delegationReady === true;
        result.healthSummary.recordSaveDelegationBlockedCount = summary.blockedCount;
        result.healthSummary.recordSaveDelegationPlanAdoptable = plan?.canAdoptPlan === true;
        result.healthSummary.recordSaveDelegationPlanBlockedCount = planSummary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveDelegationObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function recordSaveDelegationSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordSaveDelegationReadiness(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordSaveDelegationReadiness(getLastRecordSaveContext());
        throw error;
      });
    }

    recordSaveDelegationReadiness(getLastRecordSaveContext());
    return result;
  }

  recordSaveDelegationSaveRecordScreen[WRAP_FLAG] = true;
  recordSaveDelegationSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = recordSaveDelegationSaveRecordScreen;
  trace('saveRecordScreen:delegation-readiness:installed');
  return true;
}

function installRecordSaveDelegation() {
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
  isDelegationExperimentEnabled,
  setDelegationExperimentEnabled,
  getPipelineArtifacts,
  buildRecordSaveDelegationReadiness,
  buildRecordSaveDelegationPlan,
  recordSaveDelegationReadiness,
  summarizeRecordSaveDelegation,
  summarizeRecordSaveDelegationPlan,
  getRecordSaveDelegationHistory,
  getRecordSaveDelegationSummary,
  clearRecordSaveDelegationHistory,
  getRecordSaveDelegationPlanHistory,
  getRecordSaveDelegationPlanSummary,
  clearRecordSaveDelegationPlanHistory,
  installRecordSaveDelegation,
};

window.ippoRecordSaveDelegation = Object.freeze({
  isDelegationExperimentEnabled,
  setDelegationExperimentEnabled,
  getPipelineArtifacts,
  buildRecordSaveDelegationReadiness,
  buildRecordSaveDelegationPlan,
  recordSaveDelegationReadiness,
  summarizeRecordSaveDelegation,
  summarizeRecordSaveDelegationPlan,
  getRecordSaveDelegationHistory,
  getRecordSaveDelegationSummary,
  clearRecordSaveDelegationHistory,
  getRecordSaveDelegationPlanHistory,
  getRecordSaveDelegationPlanSummary,
  clearRecordSaveDelegationPlanHistory,
  installRecordSaveDelegation,
});

window.ippoSetRecordSaveDelegationExperimentEnabled = setDelegationExperimentEnabled;
window.ippoIsRecordSaveDelegationExperimentEnabled = isDelegationExperimentEnabled;
window.ippoRecordSaveDelegationSummary = getRecordSaveDelegationSummary;
window.ippoRecordSaveDelegationHistory = getRecordSaveDelegationHistory;
window.ippoClearRecordSaveDelegationHistory = clearRecordSaveDelegationHistory;
window.ippoRecordSaveDelegationPlanSummary = getRecordSaveDelegationPlanSummary;
window.ippoRecordSaveDelegationPlanHistory = getRecordSaveDelegationPlanHistory;
window.ippoClearRecordSaveDelegationPlanHistory = clearRecordSaveDelegationPlanHistory;

installRecordSaveDelegation();
