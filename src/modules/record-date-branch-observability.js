// ============================================================
//  ippo – src/modules/record-date-branch-observability.js
//  Phase 3-H-1: record date branch observability
//
//  目的:
//  - saveRecordScreen 本体を変更せず、保存前後の日付候補を観測する
//  - editingDate / selectedDate / record date のずれを DevTools で確認可能にする
//  - 保存順・保存内容・DOM ID には介入しない
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  getRecords,
} from './record-repository.js';

const WRAP_FLAG = '__ippoDateBranchObserved';

function trace(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:record-date-branch]', label, detail || '');
    }
  } catch(e) {}
}

function cloneRecordForAudit(record) {
  if (!record || typeof record !== 'object') return record;
  try {
    return JSON.parse(JSON.stringify(record));
  } catch(e) {
    return { ...record };
  }
}

function summarizeRecordForAudit(record) {
  if (!record || typeof record !== 'object') {
    return {
      type: typeof record,
      date: null,
      hash: '',
    };
  }

  let hash = '';
  try {
    hash = JSON.stringify(record);
  } catch(e) {
    hash = String(record);
  }

  return {
    date: normalizeRecordDate(getRecordDate(record)),
    keys: Object.keys(record).slice(0, 20),
    hash: hash,
  };
}

function getStateDateCandidate(name) {
  try {
    const state = window.state || {};
    return normalizeRecordDate(state[name]);
  } catch(e) {
    return '';
  }
}

function getRecordsForAudit() {
  try {
    return getRecords().map(cloneRecordForAudit);
  } catch(e) {
    const state = window.state || {};
    return Array.isArray(state.records) ? state.records.map(cloneRecordForAudit) : [];
  }
}

function buildDateCounts(records) {
  return records.reduce(function(result, record) {
    const date = normalizeRecordDate(getRecordDate(record)) || 'unknown';
    result[date] = (result[date] || 0) + 1;
    return result;
  }, {});
}

function buildRecordHashByDate(records) {
  return records.reduce(function(result, record) {
    const summary = summarizeRecordForAudit(record);
    const date = summary.date || 'unknown';
    if (!Array.isArray(result[date])) {
      result[date] = [];
    }
    result[date].push(summary.hash);
    return result;
  }, {});
}

function getChangedDates(beforeRecords, afterRecords) {
  const beforeHashes = buildRecordHashByDate(beforeRecords);
  const afterHashes = buildRecordHashByDate(afterRecords);
  const allDates = Array.from(new Set([
    ...Object.keys(beforeHashes),
    ...Object.keys(afterHashes),
  ])).filter(function(date) {
    return date && date !== 'unknown';
  });

  return allDates.filter(function(date) {
    return JSON.stringify(beforeHashes[date] || []) !== JSON.stringify(afterHashes[date] || []);
  });
}

function getDuplicateDates(dateCounts) {
  return Object.keys(dateCounts).filter(function(date) {
    return date !== 'unknown' && dateCounts[date] > 1;
  });
}

function createDateBranchSnapshot(label) {
  const records = getRecordsForAudit();
  const editingDate = getStateDateCandidate('editingDate');
  const selectedDate = getStateDateCandidate('selectedDate');

  return {
    label: label,
    capturedAt: new Date().toISOString(),
    editingDate: editingDate,
    selectedDate: selectedDate,
    recordsLength: records.length,
    dateCounts: buildDateCounts(records),
    duplicateDates: getDuplicateDates(buildDateCounts(records)),
    records: records,
  };
}

function resolveRecordSaveDateCandidate(input) {
  const warnings = [];
  const sources = [];
  const editingDate = normalizeRecordDate(input?.editingDate || '');
  const selectedDate = normalizeRecordDate(input?.selectedDate || '');
  const draftDate = normalizeRecordDate(input?.draftDate || '');
  const changedDates = Array.isArray(input?.changedDates)
    ? input.changedDates.map(normalizeRecordDate).filter(Boolean)
    : [];
  const fallbackDate = normalizeRecordDate(input?.fallbackDate || '');

  if (editingDate) sources.push({ source: 'editingDate', date: editingDate, priority: 10 });
  if (draftDate) sources.push({ source: 'draftDate', date: draftDate, priority: 8 });
  if (changedDates.length === 1) sources.push({ source: 'changedDates', date: changedDates[0], priority: 7 });
  if (selectedDate) sources.push({ source: 'selectedDate', date: selectedDate, priority: 5 });
  if (fallbackDate) sources.push({ source: 'fallbackDate', date: fallbackDate, priority: 1 });

  const uniqueDates = Array.from(new Set(sources.map(function(item) { return item.date; }).filter(Boolean)));
  const sortedSources = sources.slice().sort(function(a, b) {
    return b.priority - a.priority;
  });
  const primary = sortedSources[0] || null;

  if (!primary) {
    warnings.push('missing-save-date');
  }

  if (editingDate && selectedDate && editingDate !== selectedDate) {
    warnings.push('editing-selected-mismatch');
  }
  if (editingDate && draftDate && editingDate !== draftDate) {
    warnings.push('editing-draft-mismatch');
  }
  if (selectedDate && draftDate && selectedDate !== draftDate) {
    warnings.push('selected-draft-mismatch');
  }
  if (changedDates.length > 1) {
    warnings.push('multiple-record-dates-changed');
  }
  if (uniqueDates.length > 1) {
    warnings.push('date-candidate-mismatch');
  }

  return {
    resolvedDate: primary ? primary.date : '',
    source: primary ? primary.source : 'none',
    confidence: primary && uniqueDates.length <= 1 ? 'high' : (primary ? 'medium' : 'low'),
    candidates: sources.map(function(item) {
      return {
        source: item.source,
        date: item.date,
        priority: item.priority,
      };
    }),
    uniqueDates: uniqueDates,
    warnings: Array.from(new Set(warnings)),
  };
}

function inferDateBranch(before, after) {
  const warnings = [];
  const editingDateBefore = before.editingDate || '';
  const selectedDateBefore = before.selectedDate || '';
  const editingDateAfter = after.editingDate || '';
  const selectedDateAfter = after.selectedDate || '';
  const changedDates = getChangedDates(before.records, after.records);
  const createdCount = Math.max(0, after.recordsLength - before.recordsLength);
  const removedCount = Math.max(0, before.recordsLength - after.recordsLength);
  const duplicateDates = Array.from(new Set([...(before.duplicateDates || []), ...(after.duplicateDates || [])]));
  const dateResolution = resolveRecordSaveDateCandidate({
    editingDate: editingDateBefore,
    selectedDate: selectedDateBefore,
    draftDate: '',
    changedDates: changedDates,
    fallbackDate: changedDates.length === 1 ? changedDates[0] : '',
  });

  let resolvedSaveDate = dateResolution.resolvedDate;
  let branch = 'unknown';
  let confidence = dateResolution.confidence;

  warnings.push.apply(warnings, dateResolution.warnings);

  if (editingDateBefore && resolvedSaveDate && editingDateBefore !== resolvedSaveDate) {
    warnings.push('editing-save-date-mismatch');
  }

  if (selectedDateBefore && resolvedSaveDate && selectedDateBefore !== resolvedSaveDate && !editingDateBefore) {
    warnings.push('selected-save-date-mismatch');
  }

  if (editingDateBefore && editingDateAfter && editingDateBefore === editingDateAfter) {
    warnings.push('editing-date-stale');
  }

  if (duplicateDates.length > 0) {
    warnings.push('duplicate-date-candidate');
  }

  if (editingDateBefore && changedDates.includes(editingDateBefore)) {
    branch = 'edit-by-editingDate';
    confidence = 'high';
  } else if (editingDateBefore && resolvedSaveDate === editingDateBefore) {
    branch = 'edit-by-editingDate';
    confidence = changedDates.length === 0 ? 'medium' : 'low';
  } else if (createdCount > 0 && selectedDateBefore && changedDates.includes(selectedDateBefore)) {
    branch = 'create-by-selectedDate';
    confidence = 'high';
  } else if (createdCount > 0 && selectedDateBefore && resolvedSaveDate === selectedDateBefore) {
    branch = 'create-by-selectedDate';
    confidence = 'medium';
  } else if (createdCount > 0 && resolvedSaveDate) {
    branch = 'create-by-detected-date';
    confidence = changedDates.length === 1 ? 'medium' : 'low';
  } else if (changedDates.length === 1) {
    branch = 'edit-by-detected-date';
    confidence = 'medium';
  }

  if (removedCount > 0) {
    warnings.push('record-count-decreased');
  }

  return {
    editingDateBefore: editingDateBefore,
    selectedDateBefore: selectedDateBefore,
    editingDateAfter: editingDateAfter,
    selectedDateAfter: selectedDateAfter,
    draftDate: '',
    normalizedDraftDate: '',
    existingRecordDate: editingDateBefore || '',
    resolvedSaveDate: resolvedSaveDate,
    dateResolution: dateResolution,
    changedDates: changedDates,
    createdCount: createdCount,
    removedCount: removedCount,
    duplicateDates: duplicateDates,
    branch: branch,
    confidence: confidence,
    warnings: Array.from(new Set(warnings)),
  };
}

function attachDateBranchToLastContext(dateBranch) {
  let context = null;

  try {
    context = typeof window.ippoLastRecordSaveContext === 'function'
      ? window.ippoLastRecordSaveContext()
      : window.__IPPO_LAST_RECORD_SAVE_CONTEXT__;
  } catch(e) {
    context = window.__IPPO_LAST_RECORD_SAVE_CONTEXT__;
  }

  if (!context || typeof context !== 'object') return null;
  if (!context.meta || typeof context.meta !== 'object') {
    context.meta = {};
  }

  context.meta.dateBranch = dateBranch;
  context.dateBranch = dateBranch;
  context.dateWarnings = dateBranch.warnings || [];

  if (context.healthSummary && typeof context.healthSummary === 'object') {
    context.healthSummary.dateWarningCount = context.dateWarnings.length;
  }

  window.__IPPO_LAST_RECORD_SAVE_CONTEXT__ = context;
  trace('dateBranch:attached', dateBranch);
  return context;
}

function observeDateBranch(before) {
  const after = createDateBranchSnapshot('after-saveRecordScreen');
  const dateBranch = inferDateBranch(before, after);
  attachDateBranchToLastContext(dateBranch);
  return dateBranch;
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateBranchObserved === true) return;

  window.ippoVerifyLastRecordSave = function dateBranchVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = typeof window.ippoLastRecordSaveContext === 'function'
      ? window.ippoLastRecordSaveContext()
      : window.__IPPO_LAST_RECORD_SAVE_CONTEXT__;
    const dateBranch = context?.meta?.dateBranch || context?.dateBranch || null;
    const dateWarnings = dateBranch?.warnings || [];

    if (result && typeof result === 'object') {
      result.dateBranch = dateBranch;
      result.dateWarnings = dateWarnings;
      result.dateWarningCount = dateWarnings.length;
      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.dateWarningCount = dateWarnings.length;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoDateBranchObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function dateBranchObservedSaveRecordScreen() {
    const before = createDateBranchSnapshot('before-saveRecordScreen');
    trace('saveRecordScreen:dateBranch:start', before);

    try {
      const result = current.apply(this, arguments);

      if (result && typeof result.then === 'function') {
        return result.then(function(value) {
          observeDateBranch(before);
          return value;
        }).catch(function(error) {
          observeDateBranch(before);
          throw error;
        });
      }

      observeDateBranch(before);
      return result;
    } catch(error) {
      observeDateBranch(before);
      throw error;
    }
  }

  dateBranchObservedSaveRecordScreen[WRAP_FLAG] = true;
  dateBranchObservedSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = dateBranchObservedSaveRecordScreen;
  trace('saveRecordScreen:dateBranch:installed');
  return true;
}

function installRecordDateBranchObservability() {
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
  createDateBranchSnapshot,
  resolveRecordSaveDateCandidate,
  inferDateBranch,
  observeDateBranch,
  installRecordDateBranchObservability,
};

window.ippoRecordDateBranchObservability = Object.freeze({
  createDateBranchSnapshot,
  resolveRecordSaveDateCandidate,
  inferDateBranch,
  observeDateBranch,
  installRecordDateBranchObservability,
});

installRecordDateBranchObservability();
