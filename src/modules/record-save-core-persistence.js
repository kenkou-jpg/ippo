// ============================================================
//  ippo – src/modules/record-save-core-persistence.js
//  Phase 3-N-6: core persistence delegation gate
//
//  目的:
//  - record-save-core.persistence を保存準備の source of truth にできるか判定する
//  - state.records / localStorage / Supabase は直接変更しない
//  - 巨大 save callback の persistence 部分を置換する前の安全 gate
// ============================================================

const WRAP_FLAG = '__ippoRecordSaveCorePersistenceObserved';
const VERIFY_WRAP_FLAG = '__ippoRecordSaveCorePersistenceVerifyWrapped';
const HISTORY_LIMIT = 20;
const CORE_PERSISTENCE_DELEGATION_FLAG = 'ippo_enable_record_save_core_persistence_delegation';
const persistenceDelegationHistory = [];

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
    console.debug('[ippo:record-save-core-persistence]', label, detail || '');
  } catch(e) {}
}

function getTimestamp() {
  return new Date().toISOString();
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

function getContextArtifact(context, name) {
  const safeContext = context || {};
  return safeContext[name] || safeContext.meta?.[name] || null;
}

function isCorePersistenceDelegationEnabled() {
  try {
    return localStorage.getItem(CORE_PERSISTENCE_DELEGATION_FLAG) === '1'
      || window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_DELEGATION__ === true;
  } catch(e) {
    return window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_DELEGATION__ === true;
  }
}

function setCorePersistenceDelegationEnabled(value) {
  window.__IPPO_RECORD_SAVE_CORE_PERSISTENCE_DELEGATION__ = value === true;
  try {
    if (value === true) {
      localStorage.setItem(CORE_PERSISTENCE_DELEGATION_FLAG, '1');
    } else {
      localStorage.removeItem(CORE_PERSISTENCE_DELEGATION_FLAG);
    }
  } catch(e) {}
  return isCorePersistenceDelegationEnabled();
}

function cloneValue(value) {
  if (!value || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch(e) {
    return { ...value };
  }
}

function buildCorePersistenceDelegationDecision(context) {
  const safeContext = context || getActiveRecordSaveContext() || getLastRecordSaveContext() || {};
  const core = getContextArtifact(safeContext, 'recordSaveCore');
  const payloadAdoption = getContextArtifact(safeContext, 'corePayloadAdoptionDecision');
  const persistence = core?.persistence || null;
  const blockedBy = [];
  const warnings = [];
  const rollbackBlockers = [];
  const enabled = isCorePersistenceDelegationEnabled();

  if (!enabled) blockedBy.push('core-persistence-delegation-disabled');
  if (!safeContext || typeof safeContext !== 'object' || !safeContext.createdAt) blockedBy.push('missing-save-context');
  if (!core) blockedBy.push('missing-core');
  if (core && core.usable !== true) blockedBy.push('core-not-usable');
  if (!persistence) blockedBy.push('missing-core-persistence');
  if (persistence && persistence.canPrepare !== true) blockedBy.push('core-persistence-not-preparable');
  if (!persistence?.payload || typeof persistence.payload !== 'object') blockedBy.push('missing-persistence-payload');
  if (persistence?.payloadSummary?.recordDate && persistence?.payloadSummary?.idDate && persistence.payloadSummary.recordDate !== persistence.payloadSummary.idDate) {
    blockedBy.push('payload-date-id-mismatch');
  }
  if ((core?.warnings || []).length > 0) warnings.push('core-has-warnings');
  if ((persistence?.warnings || []).length > 0) warnings.push('persistence-has-warnings');
  if (payloadAdoption && payloadAdoption.didAdoptCorePayload !== true) warnings.push('core-payload-not-adopted');
  if (persistence?.saveMode !== 'create') rollbackBlockers.push('not-create-only');
  if (persistence?.upsertPreview?.mode && persistence.upsertPreview.mode !== 'insert') rollbackBlockers.push('not-insert-upsert');
  if (persistence?.previewRecordsLength && persistence?.sourceRecordsLength && persistence.previewRecordsLength <= persistence.sourceRecordsLength) {
    rollbackBlockers.push('insert-preview-does-not-grow-records');
  }

  const canDelegateCorePersistence = blockedBy.length === 0
    && warnings.length === 0
    && rollbackBlockers.length === 0;

  return {
    recordedAt: getTimestamp(),
    mode: 'core-persistence-delegation-decision',
    enabled: enabled,
    canDelegateCorePersistence: canDelegateCorePersistence,
    didDelegateCorePersistence: false,
    targetDate: persistence?.targetDate || persistence?.payloadSummary?.recordDate || '',
    saveMode: persistence?.saveMode || 'unknown',
    persistenceStrategy: persistence?.persistenceStrategy || 'unknown',
    payloadSummary: persistence?.payloadSummary || null,
    upsertPreview: persistence?.upsertPreview ? cloneValue(persistence.upsertPreview) : null,
    sourceRecordsLength: persistence?.sourceRecordsLength || 0,
    previewRecordsLength: persistence?.previewRecordsLength || 0,
    payloadAdopted: payloadAdoption?.didAdoptCorePayload === true,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'Decision only. It validates whether core.persistence can become the future persistence preparation source of truth.',
  };
}

function summarizeCorePersistenceDelegation(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
  const rollbackBlockerCounts = {};
  const strategyCounts = {};

  list.forEach(function(item) {
    const strategy = item.persistenceStrategy || 'unknown';
    strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;

    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
    (item.warnings || []).forEach(function(reason) {
      warningCounts[reason] = (warningCounts[reason] || 0) + 1;
    });
    (item.rollbackBlockers || []).forEach(function(reason) {
      rollbackBlockerCounts[reason] = (rollbackBlockerCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    enabledCount: list.filter(function(item) { return item.enabled === true; }).length,
    delegatableCount: list.filter(function(item) { return item.canDelegateCorePersistence === true; }).length,
    delegatedCount: list.filter(function(item) { return item.didDelegateCorePersistence === true; }).length,
    blockedCount: list.filter(function(item) { return item.canDelegateCorePersistence !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    rollbackBlockerCounts: rollbackBlockerCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachCorePersistenceDelegationToContext(context, decision) {
  const summary = summarizeCorePersistenceDelegation(persistenceDelegationHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.corePersistenceDelegationDecision = decision;
    context.meta.corePersistenceDelegationSummary = summary;
    context.corePersistenceDelegationDecision = decision;
    context.corePersistenceDelegationSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.corePersistenceDelegationEnabled = decision.enabled === true;
      context.healthSummary.corePersistenceDelegationReady = decision.canDelegateCorePersistence === true;
      context.healthSummary.corePersistenceDelegationBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordCorePersistenceDelegationDecision(context) {
  const saveContext = context || getLastRecordSaveContext() || getActiveRecordSaveContext();
  const decision = buildCorePersistenceDelegationDecision(saveContext);

  persistenceDelegationHistory.push(decision);
  while (persistenceDelegationHistory.length > HISTORY_LIMIT) {
    persistenceDelegationHistory.shift();
  }

  attachCorePersistenceDelegationToContext(saveContext, decision);
  trace('core-persistence-delegation:recorded', decision);
  return decision;
}

function getCorePersistenceDelegationHistory() {
  return persistenceDelegationHistory.slice();
}

function getCorePersistenceDelegationSummary() {
  return summarizeCorePersistenceDelegation(persistenceDelegationHistory);
}

function clearCorePersistenceDelegationHistory() {
  persistenceDelegationHistory.splice(0, persistenceDelegationHistory.length);
  return getCorePersistenceDelegationSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify[VERIFY_WRAP_FLAG] === true) return;

  window.ippoVerifyLastRecordSave = function corePersistenceVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const decision = context?.corePersistenceDelegationDecision
      || context?.meta?.corePersistenceDelegationDecision
      || null;
    const summary = getCorePersistenceDelegationSummary();

    if (result && typeof result === 'object') {
      result.corePersistenceDelegationDecision = decision;
      result.corePersistenceDelegationSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.corePersistenceDelegationEnabled = decision?.enabled === true;
        result.healthSummary.corePersistenceDelegationReady = decision?.canDelegateCorePersistence === true;
        result.healthSummary.corePersistenceDelegationBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave[VERIFY_WRAP_FLAG] = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function corePersistenceSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordCorePersistenceDelegationDecision(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordCorePersistenceDelegationDecision(getLastRecordSaveContext());
        throw error;
      });
    }

    recordCorePersistenceDelegationDecision(getLastRecordSaveContext());
    return result;
  }

  corePersistenceSaveRecordScreen[WRAP_FLAG] = true;
  corePersistenceSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = corePersistenceSaveRecordScreen;
  trace('saveRecordScreen:core-persistence-delegation:installed');
  return true;
}

function installCorePersistenceDelegation() {
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
  isCorePersistenceDelegationEnabled,
  setCorePersistenceDelegationEnabled,
  buildCorePersistenceDelegationDecision,
  recordCorePersistenceDelegationDecision,
  summarizeCorePersistenceDelegation,
  getCorePersistenceDelegationHistory,
  getCorePersistenceDelegationSummary,
  clearCorePersistenceDelegationHistory,
  installCorePersistenceDelegation,
};

window.ippoRecordSaveCorePersistence = Object.freeze({
  isCorePersistenceDelegationEnabled,
  setCorePersistenceDelegationEnabled,
  buildCorePersistenceDelegationDecision,
  recordCorePersistenceDelegationDecision,
  summarizeCorePersistenceDelegation,
  getCorePersistenceDelegationHistory,
  getCorePersistenceDelegationSummary,
  clearCorePersistenceDelegationHistory,
  installCorePersistenceDelegation,
});

window.ippoSetCorePersistenceDelegationEnabled = setCorePersistenceDelegationEnabled;
window.ippoIsCorePersistenceDelegationEnabled = isCorePersistenceDelegationEnabled;
window.ippoCorePersistenceDelegationSummary = getCorePersistenceDelegationSummary;
window.ippoCorePersistenceDelegationHistory = getCorePersistenceDelegationHistory;
window.ippoClearCorePersistenceDelegationHistory = clearCorePersistenceDelegationHistory;

installCorePersistenceDelegation();
