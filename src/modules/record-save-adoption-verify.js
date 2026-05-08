// ============================================================
//  ippo – src/modules/record-save-adoption-verify.js
//  Phase 3-L-3: post-save verification for module payload delegation
//
//  目的:
//  - pre-save module payload delegation 後に、実保存結果が module payload と一致したか検証する
//  - 検証のみ。state.records / localStorage / Supabase は変更しない
//  - limited real delegation の安全性を post-save で担保する
// ============================================================

import {
  findRecordByDate,
  getRecordDate,
} from './record-repository.js';

const WRAP_FLAG = '__ippoRecordSaveAdoptionVerifyObserved';
const HISTORY_LIMIT = 20;
const verificationHistory = [];

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
    console.debug('[ippo:record-save-adoption-verify]', label, detail || '');
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

function getPreSaveDelegation(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  return safeContext.preSaveModulePayloadDelegation
    || safeContext.meta?.preSaveModulePayloadDelegation
    || null;
}

function getValueByPath(object, path) {
  if (!object || typeof object !== 'object') return undefined;
  return object[path];
}

function valuesEqual(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) {
    try {
      return JSON.stringify(a || []) === JSON.stringify(b || []);
    } catch(e) {
      return false;
    }
  }
  return a === b;
}

function comparePayloadToActualRecord(payload, actualRecord) {
  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const safeActual = actualRecord && typeof actualRecord === 'object' ? actualRecord : {};
  const comparedKeys = Object.keys(safePayload).filter(function(key) {
    return key !== 'updated_at' && key !== 'created_at' && key !== 'synced_at';
  });
  const mismatches = [];
  const missingKeys = [];

  comparedKeys.forEach(function(key) {
    const expected = getValueByPath(safePayload, key);
    const actual = getValueByPath(safeActual, key);
    if (actual === undefined && expected !== undefined) {
      missingKeys.push(key);
      return;
    }
    if (!valuesEqual(expected, actual)) {
      mismatches.push({
        key: key,
        expected: expected,
        actual: actual,
      });
    }
  });

  return {
    comparedKeyCount: comparedKeys.length,
    comparedKeys: comparedKeys.slice(0, 60),
    mismatchCount: mismatches.length,
    mismatches: mismatches.slice(0, 20),
    missingKeyCount: missingKeys.length,
    missingKeys: missingKeys.slice(0, 20),
  };
}

function buildModulePayloadPostSaveVerification(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const delegation = getPreSaveDelegation(safeContext);
  const blockedBy = [];
  const warnings = [];
  const payload = delegation?.modulePayload || null;
  const targetDate = delegation?.targetDate || delegation?.modulePayloadSummary?.recordDate || '';
  const actualRecord = targetDate ? findRecordByDate(targetDate) : null;
  const actualDate = getRecordDate(actualRecord);
  const payloadCompare = comparePayloadToActualRecord(payload, actualRecord);

  if (!delegation) blockedBy.push('missing-pre-save-delegation');
  if (delegation && delegation.didDelegate !== true) blockedBy.push('pre-save-delegation-not-applied');
  if (!payload) blockedBy.push('missing-module-payload');
  if (!targetDate) blockedBy.push('missing-target-date');
  if (targetDate && !actualRecord) blockedBy.push('actual-record-not-found');
  if (actualRecord && actualDate !== targetDate) blockedBy.push('actual-date-mismatch');
  if (payloadCompare.missingKeyCount > 0) blockedBy.push('payload-keys-missing-from-actual');
  if (payloadCompare.mismatchCount > 0) blockedBy.push('payload-actual-mismatch');

  if (delegation?.saveMode !== 'create') warnings.push('not-create-mode');
  if (delegation?.previewUpsert?.mode !== 'insert') warnings.push('not-insert-upsert-mode');

  const verified = delegation?.didDelegate === true
    && !!payload
    && !!targetDate
    && !!actualRecord
    && actualDate === targetDate
    && payloadCompare.missingKeyCount === 0
    && payloadCompare.mismatchCount === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'module-payload-post-save-verification',
    verified: verified,
    comparable: !!delegation && !!payload && !!targetDate,
    didDelegate: delegation?.didDelegate === true,
    targetDate: targetDate,
    actualDate: actualDate,
    actualRecordFound: !!actualRecord,
    saveMode: delegation?.saveMode || 'unknown',
    persistenceStrategy: delegation?.persistenceStrategy || 'unknown',
    previewUpsertMode: delegation?.previewUpsert?.mode || 'unknown',
    payloadCompare: payloadCompare,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Post-save verification only. It validates that module payload delegation produced the persisted record expected.',
  };
}

function summarizeModulePayloadPostSaveVerification(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
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
  });

  return {
    count: list.length,
    comparableCount: list.filter(function(item) { return item.comparable === true; }).length,
    delegatedCount: list.filter(function(item) { return item.didDelegate === true; }).length,
    verifiedCount: list.filter(function(item) { return item.verified === true; }).length,
    blockedCount: list.filter(function(item) { return item.verified !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachModulePayloadPostSaveVerificationToContext(context, verification) {
  const summary = summarizeModulePayloadPostSaveVerification(verificationHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.modulePayloadPostSaveVerification = verification;
    context.meta.modulePayloadPostSaveVerificationSummary = summary;
    context.modulePayloadPostSaveVerification = verification;
    context.modulePayloadPostSaveVerificationSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.modulePayloadPostSaveVerified = verification.verified === true;
      context.healthSummary.modulePayloadPostSaveDelegated = verification.didDelegate === true;
      context.healthSummary.modulePayloadPostSaveBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordModulePayloadPostSaveVerification(context) {
  const saveContext = context || getLastRecordSaveContext();
  const verification = buildModulePayloadPostSaveVerification(saveContext);

  verificationHistory.push(verification);
  while (verificationHistory.length > HISTORY_LIMIT) {
    verificationHistory.shift();
  }

  attachModulePayloadPostSaveVerificationToContext(saveContext, verification);
  trace('module-payload-post-save-verification:recorded', verification);
  return verification;
}

function getModulePayloadPostSaveVerificationHistory() {
  return verificationHistory.slice();
}

function getModulePayloadPostSaveVerificationSummary() {
  return summarizeModulePayloadPostSaveVerification(verificationHistory);
}

function clearModulePayloadPostSaveVerificationHistory() {
  verificationHistory.splice(0, verificationHistory.length);
  return getModulePayloadPostSaveVerificationSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveAdoptionVerifyObserved === true) return;

  window.ippoVerifyLastRecordSave = function modulePayloadPostSaveVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const verification = context?.modulePayloadPostSaveVerification || context?.meta?.modulePayloadPostSaveVerification || null;
    const summary = getModulePayloadPostSaveVerificationSummary();

    if (result && typeof result === 'object') {
      result.modulePayloadPostSaveVerification = verification;
      result.modulePayloadPostSaveVerificationSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.modulePayloadPostSaveVerified = verification?.verified === true;
        result.healthSummary.modulePayloadPostSaveDelegated = verification?.didDelegate === true;
        result.healthSummary.modulePayloadPostSaveBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveAdoptionVerifyObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function modulePayloadPostSaveVerificationSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordModulePayloadPostSaveVerification(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordModulePayloadPostSaveVerification(getLastRecordSaveContext());
        throw error;
      });
    }

    recordModulePayloadPostSaveVerification(getLastRecordSaveContext());
    return result;
  }

  modulePayloadPostSaveVerificationSaveRecordScreen[WRAP_FLAG] = true;
  modulePayloadPostSaveVerificationSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = modulePayloadPostSaveVerificationSaveRecordScreen;
  trace('saveRecordScreen:module-payload-post-save-verification:installed');
  return true;
}

function installModulePayloadPostSaveVerification() {
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
  comparePayloadToActualRecord,
  buildModulePayloadPostSaveVerification,
  recordModulePayloadPostSaveVerification,
  summarizeModulePayloadPostSaveVerification,
  getModulePayloadPostSaveVerificationHistory,
  getModulePayloadPostSaveVerificationSummary,
  clearModulePayloadPostSaveVerificationHistory,
  installModulePayloadPostSaveVerification,
};

window.ippoRecordSaveAdoptionVerify = Object.freeze({
  comparePayloadToActualRecord,
  buildModulePayloadPostSaveVerification,
  recordModulePayloadPostSaveVerification,
  summarizeModulePayloadPostSaveVerification,
  getModulePayloadPostSaveVerificationHistory,
  getModulePayloadPostSaveVerificationSummary,
  clearModulePayloadPostSaveVerificationHistory,
  installModulePayloadPostSaveVerification,
});

window.ippoModulePayloadPostSaveVerificationSummary = getModulePayloadPostSaveVerificationSummary;
window.ippoModulePayloadPostSaveVerificationHistory = getModulePayloadPostSaveVerificationHistory;
window.ippoClearModulePayloadPostSaveVerificationHistory = clearModulePayloadPostSaveVerificationHistory;

installModulePayloadPostSaveVerification();
