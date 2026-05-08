// ============================================================
//  ippo – src/modules/record-save-shadow.js
//  Phase 3-K-1: record save pipeline shadow outcome
//
//  目的:
//  - prepareRecordPersistence() の preview と既存保存後の repository 状態を比較する
//  - module pipeline が実保存の代替になり得るかを shadow-only で判定する
//  - saveRecordScreen / state.records / localStorage / Supabase は変更しない
// ============================================================

import {
  findRecordByDate,
  getRecordDate,
  getRecords,
} from './record-repository.js';

const WRAP_FLAG = '__ippoRecordSaveShadowObserved';
const HISTORY_LIMIT = 20;
const shadowOutcomeHistory = [];

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
    console.debug('[ippo:record-save-shadow]', label, detail || '');
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

function getPersistencePreview(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  return safeContext.recordPersistencePreview
    || safeContext.meta?.recordPersistencePreview
    || null;
}

function buildRecordSaveShadowOutcome(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const preview = getPersistencePreview(safeContext);
  const blockedBy = [];
  const warnings = [];
  const targetDate = preview?.targetDate || preview?.payloadSummary?.recordDate || '';
  const actualRecord = targetDate ? findRecordByDate(targetDate) : null;
  const actualDate = getRecordDate(actualRecord);
  const records = getRecords();
  const activeRecordsLength = Array.isArray(records) ? records.length : 0;

  if (!preview) blockedBy.push('missing-persistence-preview');
  if (preview && preview.canPrepare !== true) blockedBy.push('persistence-preview-not-preparable');
  if (!targetDate) blockedBy.push('missing-target-date');
  if (targetDate && !actualRecord) blockedBy.push('actual-record-not-found');
  if (actualRecord && actualDate !== targetDate) blockedBy.push('actual-date-mismatch');

  if (preview?.upsertPreview?.mode === 'insert' && preview.previewRecordsLength <= preview.sourceRecordsLength) {
    warnings.push('insert-preview-did-not-grow-records');
  }
  if (preview?.upsertPreview?.mode === 'update' && preview.previewRecordsLength !== preview.sourceRecordsLength) {
    warnings.push('update-preview-length-changed');
  }
  if (preview?.previewRecordsLength && activeRecordsLength && preview.previewRecordsLength !== activeRecordsLength) {
    warnings.push('preview-actual-record-length-differs');
  }

  const matched = preview?.canPrepare === true
    && !!targetDate
    && !!actualRecord
    && actualDate === targetDate;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-save-shadow-outcome',
    matched: matched,
    comparable: !!preview && !!targetDate,
    targetDate: targetDate,
    actualDate: actualDate,
    actualRecordFound: !!actualRecord,
    previewUpsertMode: preview?.upsertPreview?.mode || 'unknown',
    previewChanged: preview?.upsertPreview?.changed === true,
    sourceRecordsLength: preview?.sourceRecordsLength || 0,
    previewRecordsLength: preview?.previewRecordsLength || 0,
    activeRecordsLength: activeRecordsLength,
    persistenceStrategy: preview?.persistenceStrategy || 'unknown',
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Shadow-only comparison. It does not mutate records, localStorage, or Supabase.',
  };
}

function summarizeRecordSaveShadowOutcome(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
  const strategyCounts = {};
  const upsertModeCounts = {};

  list.forEach(function(item) {
    const strategy = item.persistenceStrategy || 'unknown';
    const mode = item.previewUpsertMode || 'unknown';
    strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    upsertModeCounts[mode] = (upsertModeCounts[mode] || 0) + 1;

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
    matchedCount: list.filter(function(item) { return item.matched === true; }).length,
    blockedCount: list.filter(function(item) { return item.matched !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    strategyCounts: strategyCounts,
    upsertModeCounts: upsertModeCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveShadowOutcomeToContext(context, outcome) {
  const summary = summarizeRecordSaveShadowOutcome(shadowOutcomeHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveShadowOutcome = outcome;
    context.meta.recordSaveShadowOutcomeSummary = summary;
    context.recordSaveShadowOutcome = outcome;
    context.recordSaveShadowOutcomeSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveShadowMatched = outcome.matched === true;
      context.healthSummary.recordSaveShadowComparable = outcome.comparable === true;
      context.healthSummary.recordSaveShadowBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordSaveShadowOutcome(context) {
  const saveContext = context || getLastRecordSaveContext();
  const outcome = buildRecordSaveShadowOutcome(saveContext);

  shadowOutcomeHistory.push(outcome);
  while (shadowOutcomeHistory.length > HISTORY_LIMIT) {
    shadowOutcomeHistory.shift();
  }

  attachRecordSaveShadowOutcomeToContext(saveContext, outcome);
  trace('shadow-outcome:recorded', outcome);
  return outcome;
}

function getRecordSaveShadowOutcomeHistory() {
  return shadowOutcomeHistory.slice();
}

function getRecordSaveShadowOutcomeSummary() {
  return summarizeRecordSaveShadowOutcome(shadowOutcomeHistory);
}

function clearRecordSaveShadowOutcomeHistory() {
  shadowOutcomeHistory.splice(0, shadowOutcomeHistory.length);
  return getRecordSaveShadowOutcomeSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveShadowObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveShadowVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const outcome = context?.recordSaveShadowOutcome || context?.meta?.recordSaveShadowOutcome || null;
    const summary = getRecordSaveShadowOutcomeSummary();

    if (result && typeof result === 'object') {
      result.recordSaveShadowOutcome = outcome;
      result.recordSaveShadowOutcomeSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveShadowMatched = outcome?.matched === true;
        result.healthSummary.recordSaveShadowComparable = outcome?.comparable === true;
        result.healthSummary.recordSaveShadowBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveShadowObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function recordSaveShadowSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordSaveShadowOutcome(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordSaveShadowOutcome(getLastRecordSaveContext());
        throw error;
      });
    }

    recordSaveShadowOutcome(getLastRecordSaveContext());
    return result;
  }

  recordSaveShadowSaveRecordScreen[WRAP_FLAG] = true;
  recordSaveShadowSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = recordSaveShadowSaveRecordScreen;
  trace('saveRecordScreen:shadow-outcome:installed');
  return true;
}

function installRecordSaveShadowOutcome() {
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
  buildRecordSaveShadowOutcome,
  recordSaveShadowOutcome,
  summarizeRecordSaveShadowOutcome,
  getRecordSaveShadowOutcomeHistory,
  getRecordSaveShadowOutcomeSummary,
  clearRecordSaveShadowOutcomeHistory,
  installRecordSaveShadowOutcome,
};

window.ippoRecordSaveShadow = Object.freeze({
  buildRecordSaveShadowOutcome,
  recordSaveShadowOutcome,
  summarizeRecordSaveShadowOutcome,
  getRecordSaveShadowOutcomeHistory,
  getRecordSaveShadowOutcomeSummary,
  clearRecordSaveShadowOutcomeHistory,
  installRecordSaveShadowOutcome,
});

window.ippoRecordSaveShadowOutcomeHistory = getRecordSaveShadowOutcomeHistory;
window.ippoRecordSaveShadowOutcomeSummary = getRecordSaveShadowOutcomeSummary;
window.ippoClearRecordSaveShadowOutcomeHistory = clearRecordSaveShadowOutcomeHistory;

installRecordSaveShadowOutcome();
