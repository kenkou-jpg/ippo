// ============================================================
//  ippo – src/modules/record-save-core-executor.js
//  Phase 3-O-3: guarded core persistence executor
//
//  目的:
//  - corePersistenceExecutionPlan を strict 条件下で実 persistence へ反映する
//  - saveState() 直前に state.records を execution plan の preview records に揃える
//  - localStorage / Supabase は既存 saveState / cloudBackupAll 経路を使う
//  - explicit flag OFF では既存挙動を完全維持する
// ============================================================

const SAVE_STATE_WRAP_FLAG = '__ippoRecordSaveCoreExecutorSaveStateWrapped';
const VERIFY_WRAP_FLAG = '__ippoRecordSaveCoreExecutorVerifyWrapped';
const HISTORY_LIMIT = 20;
const CORE_PERSISTENCE_EXECUTION_FLAG = 'ippo_enable_record_save_core_persistence_execution';
const executionHistory = [];

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
    console.debug('[ippo:record-save-core-executor]', label, detail || '');
  } catch(e) {}
}

function getTimestamp() {
  return new Date().toISOString();
}

function getActiveRecordSaveContext() {
  try {
    if (typeof window.ippoActiveRecordSaveContext === 'function') {
      return window.ippoActiveRecordSaveContext();
    }
  } catch(e) {}
  return window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ || null;
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

function isCorePersistenceExecutionEnabled() {
  try {
    return localStorage.getItem(CORE_PERSISTENCE_EXECUTION_FLAG) === '1'
      || window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_EXECUTION__ === true;
  } catch(e) {
    return window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_EXECUTION__ === true;
  }
}

function setCorePersistenceExecutionEnabled(value) {
  window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_EXECUTION__ = value === true;
  try {
    if (value === true) {
      localStorage.setItem(CORE_PERSISTENCE_EXECUTION_FLAG, '1');
    } else {
      localStorage.removeItem(CORE_PERSISTENCE_EXECUTION_FLAG);
    }
  } catch(e) {}
  return isCorePersistenceExecutionEnabled();
}

function cloneValue(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch(e) {
    if (Array.isArray(value)) return value.slice();
    return { ...value };
  }
}

function getPlanRecords(plan) {
  if (Array.isArray(plan?.upsertPreview?.records)) return plan.upsertPreview.records;
  return null;
}

function buildCorePersistenceExecutionDecision(context) {
  const saveContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext() || {};
  const plan = getContextArtifact(saveContext, 'corePersistenceExecutionPlan');
  const delegation = getContextArtifact(saveContext, 'corePersistenceDelegationDecision');
  const blockedBy = [];
  const rollbackBlockers = [];
  const enabled = isCorePersistenceExecutionEnabled();
  const planRecords = getPlanRecords(plan);
  const stateRecords = Array.isArray(window.state?.records) ? window.state.records : null;

  if (!enabled) blockedBy.push('core-persistence-execution-disabled');
  if (!saveContext || typeof saveContext !== 'object' || !saveContext.createdAt) blockedBy.push('missing-save-context');
  if (!plan) blockedBy.push('missing-execution-plan');
  if (plan && plan.canUseExecutionPlan !== true) blockedBy.push('execution-plan-not-usable');
  if (plan && plan.didExecutePlan === true) blockedBy.push('execution-plan-already-executed');
  if (!delegation) blockedBy.push('missing-core-persistence-delegation');
  if (delegation && delegation.canDelegateCorePersistence !== true) blockedBy.push('core-persistence-not-delegatable');
  if (!window.state || typeof window.state !== 'object') blockedBy.push('missing-window-state');
  if (!stateRecords) blockedBy.push('state-records-not-array');
  if (!planRecords) blockedBy.push('plan-records-not-array');
  if (!plan?.payload || typeof plan.payload !== 'object') blockedBy.push('missing-plan-payload');
  if (plan?.saveMode !== 'create') rollbackBlockers.push('not-create-only');
  if (plan?.upsertPreview?.mode !== 'insert') rollbackBlockers.push('not-insert-upsert');
  if (typeof plan?.sourceRecordsLength === 'number' && typeof plan?.previewRecordsLength === 'number') {
    if (plan.previewRecordsLength <= plan.sourceRecordsLength) {
      rollbackBlockers.push('insert-preview-does-not-grow-records');
    }
    if (planRecords && plan.previewRecordsLength !== planRecords.length) {
      rollbackBlockers.push('preview-records-length-mismatch');
    }
  }
  if (plan?.payload?.record_date && plan?.payload?.id && plan.payload.record_date !== plan.payload.id) {
    blockedBy.push('payload-date-id-mismatch');
  }
  if (plan?.targetDate && plan?.payload?.record_date && plan.targetDate !== plan.payload.record_date) {
    blockedBy.push('target-date-payload-date-mismatch');
  }

  const canExecuteCorePersistence = blockedBy.length === 0 && rollbackBlockers.length === 0;

  return {
    recordedAt: getTimestamp(),
    mode: 'core-persistence-execution-decision',
    enabled: enabled,
    canExecuteCorePersistence: canExecuteCorePersistence,
    didExecuteCorePersistence: false,
    targetDate: plan?.targetDate || '',
    saveMode: plan?.saveMode || 'unknown',
    persistenceStrategy: plan?.persistenceStrategy || 'unknown',
    sourceRecordsLength: plan?.sourceRecordsLength || 0,
    previewRecordsLength: plan?.previewRecordsLength || 0,
    stateRecordsLengthBefore: stateRecords ? stateRecords.length : null,
    planRecordsLength: planRecords ? planRecords.length : null,
    blockedBy: Array.from(new Set(blockedBy)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'If didExecuteCorePersistence is true, state.records was replaced with execution-plan preview records immediately before saveState().',
  };
}

function summarizeCorePersistenceExecution(history) {
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
    executableCount: list.filter(function(item) { return item.canExecuteCorePersistence === true; }).length,
    executedCount: list.filter(function(item) { return item.didExecuteCorePersistence === true; }).length,
    blockedCount: list.filter(function(item) { return item.didExecuteCorePersistence !== true; }).length,
    blockedByCounts: blockedByCounts,
    rollbackBlockerCounts: rollbackBlockerCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachCorePersistenceExecutionToContext(context, decision) {
  const summary = summarizeCorePersistenceExecution(executionHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.corePersistenceExecutionDecision = decision;
    context.meta.corePersistenceExecutionSummary = summary;
    context.corePersistenceExecutionDecision = decision;
    context.corePersistenceExecutionSummary = summary;

    const plan = getContextArtifact(context, 'corePersistenceExecutionPlan');
    if (plan && decision.didExecuteCorePersistence === true) {
      plan.didExecutePlan = true;
      plan.executedAt = decision.executedAt;
      plan.stateRecordsLengthAfter = decision.stateRecordsLengthAfter;
    }

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.corePersistenceExecutionEnabled = decision.enabled === true;
      context.healthSummary.corePersistenceExecutionDidExecute = decision.didExecuteCorePersistence === true;
      context.healthSummary.corePersistenceExecutionBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordCorePersistenceExecutionDecision(decision, context) {
  const saveContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext();
  executionHistory.push(decision);
  while (executionHistory.length > HISTORY_LIMIT) {
    executionHistory.shift();
  }

  attachCorePersistenceExecutionToContext(saveContext, decision);
  trace('core-persistence-execution:recorded', decision);
  return decision;
}

function applyCorePersistenceExecutionPlan(context) {
  const saveContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext();
  const plan = getContextArtifact(saveContext, 'corePersistenceExecutionPlan');
  const planRecords = getPlanRecords(plan);
  const decision = buildCorePersistenceExecutionDecision(saveContext);

  if (decision.canExecuteCorePersistence === true && planRecords && window.state && typeof window.state === 'object') {
    window.state.records = cloneValue(planRecords);
    decision.didExecuteCorePersistence = true;
    decision.executedAt = getTimestamp();
    decision.stateRecordsLengthAfter = Array.isArray(window.state.records) ? window.state.records.length : null;
  }

  recordCorePersistenceExecutionDecision(decision, saveContext);
  return decision;
}

function getCorePersistenceExecutionHistory() {
  return executionHistory.slice();
}

function getCorePersistenceExecutionSummary() {
  return summarizeCorePersistenceExecution(executionHistory);
}

function clearCorePersistenceExecutionHistory() {
  executionHistory.splice(0, executionHistory.length);
  return getCorePersistenceExecutionSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify[VERIFY_WRAP_FLAG] === true) return;

  window.ippoVerifyLastRecordSave = function corePersistenceExecutionVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const decision = context?.corePersistenceExecutionDecision
      || context?.meta?.corePersistenceExecutionDecision
      || null;
    const summary = getCorePersistenceExecutionSummary();

    if (result && typeof result === 'object') {
      result.corePersistenceExecutionDecision = decision;
      result.corePersistenceExecutionSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.corePersistenceExecutionEnabled = decision?.enabled === true;
        result.healthSummary.corePersistenceExecutionDidExecute = decision?.didExecuteCorePersistence === true;
        result.healthSummary.corePersistenceExecutionBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave[VERIFY_WRAP_FLAG] = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveState() {
  const current = window.saveState;
  if (typeof current !== 'function') return false;
  if (current[SAVE_STATE_WRAP_FLAG] === true) return true;

  function corePersistenceExecutionSaveState() {
    applyCorePersistenceExecutionPlan(getActiveRecordSaveContext());
    return current.apply(this, arguments);
  }

  corePersistenceExecutionSaveState[SAVE_STATE_WRAP_FLAG] = true;
  corePersistenceExecutionSaveState.__ippoOriginal = current;
  window.saveState = corePersistenceExecutionSaveState;
  trace('saveState:core-persistence-execution:installed');
  return true;
}

function installCorePersistenceExecutor() {
  wrapVerifyLastRecordSave();

  if (wrapSaveState()) return true;

  let attempts = 0;
  const timer = window.setInterval(function() {
    attempts++;
    wrapVerifyLastRecordSave();
    if (wrapSaveState() || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 250);

  return false;
}

export {
  isCorePersistenceExecutionEnabled,
  setCorePersistenceExecutionEnabled,
  buildCorePersistenceExecutionDecision,
  applyCorePersistenceExecutionPlan,
  recordCorePersistenceExecutionDecision,
  summarizeCorePersistenceExecution,
  getCorePersistenceExecutionHistory,
  getCorePersistenceExecutionSummary,
  clearCorePersistenceExecutionHistory,
  installCorePersistenceExecutor,
};

window.ippoRecordSaveCoreExecutor = Object.freeze({
  isCorePersistenceExecutionEnabled,
  setCorePersistenceExecutionEnabled,
  buildCorePersistenceExecutionDecision,
  applyCorePersistenceExecutionPlan,
  recordCorePersistenceExecutionDecision,
  summarizeCorePersistenceExecution,
  getCorePersistenceExecutionHistory,
  getCorePersistenceExecutionSummary,
  clearCorePersistenceExecutionHistory,
  installCorePersistenceExecutor,
});

window.ippoSetCorePersistenceExecutionEnabled = setCorePersistenceExecutionEnabled;
window.ippoIsCorePersistenceExecutionEnabled = isCorePersistenceExecutionEnabled;
window.ippoCorePersistenceExecutionSummary = getCorePersistenceExecutionSummary;
window.ippoCorePersistenceExecutionHistory = getCorePersistenceExecutionHistory;
window.ippoClearCorePersistenceExecutionHistory = clearCorePersistenceExecutionHistory;

installCorePersistenceExecutor();
