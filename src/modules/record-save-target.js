// ============================================================
//  ippo – src/modules/record-save-target.js
//  Phase 3-J-1: saveRecordScreen thin-orchestrator scaffold
//
//  目的:
//  - saveRecordScreen 薄型化の最初の受け皿を作る
//  - buildDraftFromUI の返却draftを観測する
//  - resolveSaveTarget の preview を active save context に記録する
//  - この段階では draft / state.records / localStorage / Supabase は変更しない
// ============================================================

import {
  normalizeRecordDate,
  findRecordByDate,
  getRecordDate,
} from './record-repository.js';

const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordSaveTargetBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const saveTargetHistory = [];

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
    note: 'Phase 3-J-1 previews resolveSaveTarget only. It does not mutate draft, records, localStorage, or Supabase.',
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

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveTargetObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveTargetVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.recordSaveTargetPreview || context?.meta?.recordSaveTargetPreview || null;
    const summary = getRecordSaveTargetSummary();

    if (result && typeof result === 'object') {
      result.recordSaveTargetPreview = preview;
      result.recordSaveTargetPreviewSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveTargetPreviewUsable = preview?.canUsePreview === true;
        result.healthSummary.recordSaveTargetPreviewWarningCount = (preview?.warnings || []).length;
        result.healthSummary.recordSaveTargetPreviewBlockedCount = summary.blockedCount;
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
  summarizeDraftForSaveTarget,
  resolveSaveTargetFromDraft,
  recordSaveTargetPreview,
  summarizeRecordSaveTarget,
  getRecordSaveTargetHistory,
  getRecordSaveTargetSummary,
  clearRecordSaveTargetHistory,
  installRecordSaveTargetPreview,
};

window.ippoRecordSaveTarget = Object.freeze({
  summarizeDraftForSaveTarget,
  resolveSaveTargetFromDraft,
  recordSaveTargetPreview,
  summarizeRecordSaveTarget,
  getRecordSaveTargetHistory,
  getRecordSaveTargetSummary,
  clearRecordSaveTargetHistory,
  installRecordSaveTargetPreview,
});

window.ippoRecordSaveTargetHistory = getRecordSaveTargetHistory;
window.ippoRecordSaveTargetSummary = getRecordSaveTargetSummary;
window.ippoClearRecordSaveTargetHistory = clearRecordSaveTargetHistory;

installRecordSaveTargetPreview();
