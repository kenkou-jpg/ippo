// ============================================================
//  ippo – src/modules/record-save-target.js
//  Phase 3-J: saveRecordScreen thin-orchestrator scaffold
//
//  目的:
//  - saveRecordScreen 薄型化の受け皿を作る
//  - resolveSaveTarget() を orchestration API として公開する
//  - prepareRecordPersistence() で pure upsert preview を作る
//  - この段階では draft / state.records / localStorage / Supabase は変更しない
// ============================================================

import {
  normalizeRecordDate,
  findRecordByDate,
  getRecordDate,
  getRecords,
} from './record-repository.js';

import {
  cloneRecordValue,
  upsertRecord,
} from './record-upsert.js';

const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordSaveTargetBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const PERSISTENCE_HISTORY_LIMIT = 20;
const saveTargetHistory = [];
const persistencePreviewHistory = [];

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
    console.debug('[ippo:record-save-target]', label, detail || '');
  } catch(e) {}
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

function getStateDateCandidate(name) {
  try {
    return normalizeRecordDate(window.state?.[name] || '');
  } catch(e) {
    return '';
  }
}

function summarizeRecordPayload(record) {
  const safeRecord = record && typeof record === 'object' ? record : null;
  const keys = safeRecord ? Object.keys(safeRecord) : [];
  return {
    hasRecord: !!safeRecord,
    keyCount: keys.length,
    keys: keys.slice(0, 40),
    recordDate: normalizeRecordDate(safeRecord?.record_date || ''),
    idDate: normalizeRecordDate(safeRecord?.id || ''),
  };
}

function summarizeDraftForSaveTarget(draft) {
  const safeDraft = draft && typeof draft === 'object' ? draft : null;
  const recordDate = normalizeRecordDate(safeDraft?.record_date || '');
  const idDate = normalizeRecordDate(safeDraft?.id || '');

  return {
    hasDraft: !!safeDraft,
    type: safeDraft ? 'object' : typeof draft,
    recordDate: recordDate,
    idDate: idDate,
    keys: safeDraft ? Object.keys(safeDraft).slice(0, 30) : [],
    hasRecordDate: !!recordDate,
    hasIdDate: !!idDate,
  };
}

function buildRecordPayload(draft, resolvedTarget) {
  const safeDraft = draft && typeof draft === 'object' ? cloneRecordValue(draft) : {};
  const targetDate = normalizeRecordDate(resolvedTarget?.targetDate || safeDraft.record_date || safeDraft.id || '');

  if (targetDate) {
    safeDraft.record_date = targetDate;
    safeDraft.id = targetDate;
  }

  return safeDraft;
}

function resolveSaveTargetFromDraft(draft, context) {
  const safeContext = context || getActiveRecordSaveContext() || {};
  const draftSummary = summarizeDraftForSaveTarget(draft);
  const editingDate = getStateDateCandidate('editingDate');
  const selectedDate = getStateDateCandidate('selectedDate');
  const injected = safeContext.dateDraftCandidateActualInjection
    || safeContext.meta?.dateDraftCandidateActualInjection
    || null;
  const candidate = safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
    || null;
  const blockedBy = [];
  const warnings = [];
  const candidates = [];

  if (editingDate) candidates.push({ source: 'editingDate', date: editingDate, priority: 100 });
  if (draftSummary.recordDate) candidates.push({ source: 'draft.record_date', date: draftSummary.recordDate, priority: 80 });
  if (draftSummary.idDate) candidates.push({ source: 'draft.id', date: draftSummary.idDate, priority: 70 });
  if (injected?.didInject === true && injected?.candidateDate) {
    candidates.push({ source: 'actualDraftInjection', date: normalizeRecordDate(injected.candidateDate), priority: 65 });
  }
  if (candidate?.canUseCandidate === true && candidate?.candidateDate) {
    candidates.push({ source: 'limitedCandidate', date: normalizeRecordDate(candidate.candidateDate), priority: 60 });
  }
  if (selectedDate) candidates.push({ source: 'selectedDate', date: selectedDate, priority: 50 });

  const sortedCandidates = candidates
    .filter(function(item) { return !!item.date; })
    .sort(function(a, b) { return b.priority - a.priority; });
  const target = sortedCandidates[0] || null;
  const uniqueDates = Array.from(new Set(sortedCandidates.map(function(item) { return item.date; }).filter(Boolean)));
  const existingRecord = target?.date ? findRecordByDate(target.date) : null;
  const existingRecordDate = getRecordDate(existingRecord);

  if (!safeContext || typeof safeContext !== 'object' || !safeContext.createdAt) {
    blockedBy.push('missing-active-save-context');
  }
  if (!draftSummary.hasDraft) blockedBy.push('missing-draft');
  if (!target?.date) blockedBy.push('missing-save-target-date');
  if (uniqueDates.length > 1) warnings.push('save-target-date-candidates-differ');
  if (editingDate && selectedDate && editingDate !== selectedDate) warnings.push('editing-selected-mismatch');
  if (draftSummary.recordDate && draftSummary.idDate && draftSummary.recordDate !== draftSummary.idDate) {
    warnings.push('draft-record-date-id-mismatch');
  }
  if (injected?.didInject === true && injected?.candidateDate && draftSummary.recordDate && normalizeRecordDate(injected.candidateDate) !== draftSummary.recordDate) {
    warnings.push('injected-date-draft-date-mismatch');
  }

  let mode = 'unknown';
  if (editingDate) {
    mode = 'edit';
  } else if (target?.date && existingRecord) {
    mode = 'update-existing-date';
  } else if (target?.date) {
    mode = 'create';
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'save-target-preview',
    saveMode: mode,
    canUsePreview: blockedBy.length === 0,
    targetDate: target?.date || '',
    targetSource: target?.source || 'none',
    confidence: blockedBy.length === 0 && warnings.length === 0 ? 'high' : (target?.date ? 'medium' : 'low'),
    draftSummary: draftSummary,
    editingDate: editingDate,
    selectedDate: selectedDate,
    existingRecordFound: !!existingRecord,
    existingRecordDate: existingRecordDate,
    candidateDate: candidate?.candidateDate || '',
    injectedDate: injected?.candidateDate || '',
    injected: injected?.didInject === true,
    candidates: sortedCandidates,
    uniqueDates: uniqueDates,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Phase 3-J previews resolveSaveTarget only. It does not mutate draft, records, localStorage, or Supabase.',
  };
}

function resolveSaveTarget(options) {
  const opts = options || {};
  const saveContext = opts.context || getActiveRecordSaveContext();
  const draft = opts.draft;
  const preview = resolveSaveTargetFromDraft(draft, saveContext);

  return {
    recordedAt: new Date().toISOString(),
    mode: 'resolve-save-target-scaffold',
    targetDate: preview.targetDate,
    targetSource: preview.targetSource,
    saveMode: preview.saveMode,
    existingRecordFound: preview.existingRecordFound,
    existingRecordDate: preview.existingRecordDate,
    preview: preview,
    canResolve: preview.canUsePreview === true,
    note: 'Scaffold only. Existing save flow still resolves save target inside saveRecordScreen.',
  };
}

function prepareRecordPersistence(options) {
  const opts = options || {};
  const saveContext = opts.context || getActiveRecordSaveContext();
  const draft = opts.draft || null;
  const sourceRecords = Array.isArray(opts.records) ? opts.records : getRecords();
  const resolvedTarget = opts.resolvedTarget || resolveSaveTarget({
    draft: draft,
    context: saveContext,
  });
  const payload = buildRecordPayload(draft, resolvedTarget);
  const upsertPreview = upsertRecord(sourceRecords, payload, {
    preserveExisting: true,
  });
  const blockedBy = [];
  const warnings = [];

  if (!saveContext || typeof saveContext !== 'object' || !saveContext.createdAt) {
    blockedBy.push('missing-active-save-context');
  }
  if (resolvedTarget.canResolve !== true) blockedBy.push('save-target-not-resolved');
  if (!payload.record_date) blockedBy.push('payload-missing-record-date');
  if (upsertPreview.mode === 'invalid') blockedBy.push(upsertPreview.reason || 'upsert-invalid');
  if (resolvedTarget.saveMode === 'create' && upsertPreview.mode !== 'insert') {
    warnings.push('create-preview-did-not-insert');
  }
  if ((resolvedTarget.saveMode === 'edit' || resolvedTarget.saveMode === 'update-existing-date') && upsertPreview.mode !== 'update') {
    warnings.push('update-preview-did-not-update');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'prepare-record-persistence-preview',
    canPrepare: blockedBy.length === 0,
    saveMode: resolvedTarget.saveMode,
    targetDate: resolvedTarget.targetDate,
    targetSource: resolvedTarget.targetSource,
    existingRecordFound: resolvedTarget.existingRecordFound,
    persistenceStrategy: resolvedTarget.saveMode === 'edit'
      ? 'merge-existing-record'
      : (resolvedTarget.existingRecordFound ? 'safe-upsert-existing-date' : 'safe-create-record'),
    payloadSummary: summarizeRecordPayload(payload),
    payload: payload,
    sourceRecordsLength: Array.isArray(sourceRecords) ? sourceRecords.length : 0,
    previewRecordsLength: Array.isArray(upsertPreview.records) ? upsertPreview.records.length : 0,
    upsertPreview: {
      changed: upsertPreview.changed,
      index: upsertPreview.index,
      mode: upsertPreview.mode,
      reason: upsertPreview.reason,
    },
    warnings: Array.from(new Set(warnings)),
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Preview only. It uses pure upsertRecord and does not mutate state.records, localStorage, or Supabase.',
  };
}

function summarizeRecordSaveTarget(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
  const modeCounts = {};
  const sourceCounts = {};

  list.forEach(function(item) {
    const mode = item.saveMode || 'unknown';
    const source = item.targetSource || 'none';
    modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
    (item.warnings || []).forEach(function(reason) {
      warningCounts[reason] = (warningCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    usableCount: list.filter(function(item) { return item.canUsePreview === true; }).length,
    blockedCount: list.filter(function(item) { return item.canUsePreview !== true; }).length,
    warningCount: list.reduce(function(total, item) { return total + (item.warnings || []).length; }, 0),
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    modeCounts: modeCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function summarizeRecordPersistencePreview(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
  const strategyCounts = {};
  const upsertModeCounts = {};

  list.forEach(function(item) {
    const strategy = item.persistenceStrategy || 'unknown';
    const upsertMode = item.upsertPreview?.mode || 'unknown';
    strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
    upsertModeCounts[upsertMode] = (upsertModeCounts[upsertMode] || 0) + 1;

    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
    (item.warnings || []).forEach(function(reason) {
      warningCounts[reason] = (warningCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    preparableCount: list.filter(function(item) { return item.canPrepare === true; }).length,
    blockedCount: list.filter(function(item) { return item.canPrepare !== true; }).length,
    changedCount: list.filter(function(item) { return item.upsertPreview?.changed === true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    strategyCounts: strategyCounts,
    upsertModeCounts: upsertModeCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveTargetPreviewToContext(context, preview) {
  const summary = summarizeRecordSaveTarget(saveTargetHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveTargetPreview = preview;
    context.meta.recordSaveTargetPreviewSummary = summary;
    context.recordSaveTargetPreview = preview;
    context.recordSaveTargetPreviewSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveTargetPreviewUsable = preview.canUsePreview === true;
      context.healthSummary.recordSaveTargetPreviewWarningCount = preview.warnings.length;
      context.healthSummary.recordSaveTargetPreviewBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function attachRecordPersistencePreviewToContext(context, preview) {
  const summary = summarizeRecordPersistencePreview(persistencePreviewHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordPersistencePreview = preview;
    context.meta.recordPersistencePreviewSummary = summary;
    context.recordPersistencePreview = preview;
    context.recordPersistencePreviewSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordPersistencePreviewPreparable = preview.canPrepare === true;
      context.healthSummary.recordPersistencePreviewChanged = preview.upsertPreview?.changed === true;
      context.healthSummary.recordPersistencePreviewBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordSaveTargetPreview(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const preview = resolveSaveTargetFromDraft(draft, saveContext);

  saveTargetHistory.push(preview);
  while (saveTargetHistory.length > HISTORY_LIMIT) {
    saveTargetHistory.shift();
  }

  attachRecordSaveTargetPreviewToContext(saveContext, preview);
  trace('save-target-preview:recorded', preview);
  return preview;
}

function recordPersistencePreview(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const resolvedTarget = resolveSaveTarget({ draft: draft, context: saveContext });
  const preview = prepareRecordPersistence({
    draft: draft,
    context: saveContext,
    resolvedTarget: resolvedTarget,
  });

  persistencePreviewHistory.push(preview);
  while (persistencePreviewHistory.length > PERSISTENCE_HISTORY_LIMIT) {
    persistencePreviewHistory.shift();
  }

  attachRecordPersistencePreviewToContext(saveContext, preview);
  trace('persistence-preview:recorded', preview);
  return preview;
}

function getRecordSaveTargetHistory() {
  return saveTargetHistory.slice();
}

function getRecordSaveTargetSummary() {
  return summarizeRecordSaveTarget(saveTargetHistory);
}

function clearRecordSaveTargetHistory() {
  saveTargetHistory.splice(0, saveTargetHistory.length);
  return getRecordSaveTargetSummary();
}

function getRecordPersistencePreviewHistory() {
  return persistencePreviewHistory.slice();
}

function getRecordPersistencePreviewSummary() {
  return summarizeRecordPersistencePreview(persistencePreviewHistory);
}

function clearRecordPersistencePreviewHistory() {
  persistencePreviewHistory.splice(0, persistencePreviewHistory.length);
  return getRecordPersistencePreviewSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveTargetObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveTargetVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.recordSaveTargetPreview || context?.meta?.recordSaveTargetPreview || null;
    const summary = getRecordSaveTargetSummary();
    const persistencePreview = context?.recordPersistencePreview || context?.meta?.recordPersistencePreview || null;
    const persistenceSummary = getRecordPersistencePreviewSummary();

    if (result && typeof result === 'object') {
      result.recordSaveTargetPreview = preview;
      result.recordSaveTargetPreviewSummary = summary;
      result.recordPersistencePreview = persistencePreview;
      result.recordPersistencePreviewSummary = persistenceSummary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveTargetPreviewUsable = preview?.canUsePreview === true;
        result.healthSummary.recordSaveTargetPreviewWarningCount = (preview?.warnings || []).length;
        result.healthSummary.recordSaveTargetPreviewBlockedCount = summary.blockedCount;
        result.healthSummary.recordPersistencePreviewPreparable = persistencePreview?.canPrepare === true;
        result.healthSummary.recordPersistencePreviewChanged = persistencePreview?.upsertPreview?.changed === true;
        result.healthSummary.recordPersistencePreviewBlockedCount = persistenceSummary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveTargetObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function recordSaveTargetBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    recordSaveTargetPreview(draft, getActiveRecordSaveContext());
    recordPersistencePreview(draft, getActiveRecordSaveContext());
    return draft;
  }

  recordSaveTargetBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  recordSaveTargetBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = recordSaveTargetBuildDraftFromUI;
  trace('buildDraftFromUI:save-target-preview:installed');
  return true;
}

function installRecordSaveTargetPreview() {
  wrapVerifyLastRecordSave();

  if (wrapBuildDraftFromUI()) return true;

  let attempts = 0;
  const timer = window.setInterval(function() {
    attempts++;
    wrapVerifyLastRecordSave();
    if (wrapBuildDraftFromUI() || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 250);

  return false;
}

export {
  summarizeRecordPayload,
  buildRecordPayload,
  summarizeDraftForSaveTarget,
  resolveSaveTargetFromDraft,
  resolveSaveTarget,
  prepareRecordPersistence,
  recordSaveTargetPreview,
  recordPersistencePreview,
  summarizeRecordSaveTarget,
  summarizeRecordPersistencePreview,
  getRecordSaveTargetHistory,
  getRecordSaveTargetSummary,
  clearRecordSaveTargetHistory,
  getRecordPersistencePreviewHistory,
  getRecordPersistencePreviewSummary,
  clearRecordPersistencePreviewHistory,
  installRecordSaveTargetPreview,
};

window.ippoRecordSaveTarget = Object.freeze({
  summarizeRecordPayload,
  buildRecordPayload,
  summarizeDraftForSaveTarget,
  resolveSaveTargetFromDraft,
  resolveSaveTarget,
  prepareRecordPersistence,
  recordSaveTargetPreview,
  recordPersistencePreview,
  summarizeRecordSaveTarget,
  summarizeRecordPersistencePreview,
  getRecordSaveTargetHistory,
  getRecordSaveTargetSummary,
  clearRecordSaveTargetHistory,
  getRecordPersistencePreviewHistory,
  getRecordPersistencePreviewSummary,
  clearRecordPersistencePreviewHistory,
  installRecordSaveTargetPreview,
});

window.ippoResolveSaveTarget = resolveSaveTarget;
window.ippoPrepareRecordPersistence = prepareRecordPersistence;
window.ippoRecordPersistencePreview = recordPersistencePreview;
window.ippoRecordSaveTargetHistory = getRecordSaveTargetHistory;
window.ippoRecordSaveTargetSummary = getRecordSaveTargetSummary;
window.ippoClearRecordSaveTargetHistory = clearRecordSaveTargetHistory;
window.ippoRecordPersistencePreviewHistory = getRecordPersistencePreviewHistory;
window.ippoRecordPersistencePreviewSummary = getRecordPersistencePreviewSummary;
window.ippoClearRecordPersistencePreviewHistory = clearRecordPersistencePreviewHistory;

installRecordSaveTargetPreview();
