// ============================================================
//  ippo – src/modules/record-draft.js
//  Phase 3-J-2: record draft normalization preview
//
//  目的:
//  - saveRecordScreen 薄型化に向けて draft 生成責務の受け皿を作る
//  - buildDraftFromUI の返却draftを normalize preview する
//  - この段階では draft / state.records / localStorage / Supabase は変更しない
// ============================================================

import {
  normalizeRecordDate,
} from './record-repository.js';

const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordDraftPreviewBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const draftPreviewHistory = [];

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
    console.debug('[ippo:record-draft]', label, detail || '');
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

function normalizeDraftValue(value) {
  if (Array.isArray(value)) {
    return value.filter(function(item) {
      return item !== undefined && item !== null && String(item).trim() !== '';
    });
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

function summarizeRecordDraft(draft) {
  const safeDraft = draft && typeof draft === 'object' ? draft : null;
  const keys = safeDraft ? Object.keys(safeDraft) : [];
  const emptyKeys = [];
  const arrayKeys = [];
  const noteKeys = [];

  if (safeDraft) {
    keys.forEach(function(key) {
      const value = safeDraft[key];
      if (Array.isArray(value)) arrayKeys.push(key);
      if (String(key).toLowerCase().includes('note') || String(key).toLowerCase().includes('memo')) noteKeys.push(key);
      if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
        emptyKeys.push(key);
      }
    });
  }

  return {
    hasDraft: !!safeDraft,
    type: safeDraft ? 'object' : typeof draft,
    keyCount: keys.length,
    keys: keys.slice(0, 50),
    emptyKeyCount: emptyKeys.length,
    emptyKeys: emptyKeys.slice(0, 30),
    arrayKeys: arrayKeys.slice(0, 30),
    noteKeys: noteKeys.slice(0, 30),
    recordDate: normalizeRecordDate(safeDraft?.record_date || ''),
    idDate: normalizeRecordDate(safeDraft?.id || ''),
  };
}

function buildRecordDraftPreview(draft, context) {
  const safeContext = context || getActiveRecordSaveContext() || {};
  const safeDraft = draft && typeof draft === 'object' ? draft : null;
  const normalizedPreview = {};
  const warnings = [];
  const blockedBy = [];

  if (!safeContext || typeof safeContext !== 'object' || !safeContext.createdAt) {
    blockedBy.push('missing-active-save-context');
  }
  if (!safeDraft) {
    blockedBy.push('draft-not-object');
  }

  if (safeDraft) {
    Object.keys(safeDraft).forEach(function(key) {
      normalizedPreview[key] = normalizeDraftValue(safeDraft[key]);
    });
  }

  const summary = summarizeRecordDraft(normalizedPreview);

  if (summary.recordDate && summary.idDate && summary.recordDate !== summary.idDate) {
    warnings.push('draft-record-date-id-mismatch');
  }
  if (!summary.recordDate && summary.idDate) {
    warnings.push('draft-missing-record-date-has-id');
  }
  if (summary.recordDate && !summary.idDate) {
    warnings.push('draft-has-record-date-missing-id');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-draft-preview',
    canUsePreview: blockedBy.length === 0,
    summary: summary,
    normalizedKeyCount: Object.keys(normalizedPreview).length,
    normalizedPreview: normalizedPreview,
    warnings: Array.from(new Set(warnings)),
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Phase 3-J-2 previews draft normalization only. It does not mutate the real draft or persisted records.',
  };
}

function summarizeRecordDraftPreview(history) {
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
    usableCount: list.filter(function(item) { return item.canUsePreview === true; }).length,
    blockedCount: list.filter(function(item) { return item.canUsePreview !== true; }).length,
    warningCount: list.reduce(function(total, item) { return total + (item.warnings || []).length; }, 0),
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    recent: list.slice(-5),
  };
}

function attachRecordDraftPreviewToContext(context, preview) {
  const summary = summarizeRecordDraftPreview(draftPreviewHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordDraftPreview = preview;
    context.meta.recordDraftPreviewSummary = summary;
    context.recordDraftPreview = preview;
    context.recordDraftPreviewSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordDraftPreviewUsable = preview.canUsePreview === true;
      context.healthSummary.recordDraftPreviewWarningCount = preview.warnings.length;
      context.healthSummary.recordDraftPreviewBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function recordDraftPreview(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const preview = buildRecordDraftPreview(draft, saveContext);

  draftPreviewHistory.push(preview);
  while (draftPreviewHistory.length > HISTORY_LIMIT) {
    draftPreviewHistory.shift();
  }

  attachRecordDraftPreviewToContext(saveContext, preview);
  trace('draft-preview:recorded', preview);
  return preview;
}

function getRecordDraftPreviewHistory() {
  return draftPreviewHistory.slice();
}

function getRecordDraftPreviewSummary() {
  return summarizeRecordDraftPreview(draftPreviewHistory);
}

function clearRecordDraftPreviewHistory() {
  draftPreviewHistory.splice(0, draftPreviewHistory.length);
  return getRecordDraftPreviewSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordDraftPreviewObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordDraftPreviewVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.recordDraftPreview || context?.meta?.recordDraftPreview || null;
    const summary = getRecordDraftPreviewSummary();

    if (result && typeof result === 'object') {
      result.recordDraftPreview = preview;
      result.recordDraftPreviewSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordDraftPreviewUsable = preview?.canUsePreview === true;
        result.healthSummary.recordDraftPreviewWarningCount = (preview?.warnings || []).length;
        result.healthSummary.recordDraftPreviewBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordDraftPreviewObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function recordDraftPreviewBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    recordDraftPreview(draft, getActiveRecordSaveContext());
    return draft;
  }

  recordDraftPreviewBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  recordDraftPreviewBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = recordDraftPreviewBuildDraftFromUI;
  trace('buildDraftFromUI:draft-preview:installed');
  return true;
}

function installRecordDraftPreview() {
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
  normalizeDraftValue,
  summarizeRecordDraft,
  buildRecordDraftPreview,
  recordDraftPreview,
  summarizeRecordDraftPreview,
  getRecordDraftPreviewHistory,
  getRecordDraftPreviewSummary,
  clearRecordDraftPreviewHistory,
  installRecordDraftPreview,
};

window.ippoRecordDraft = Object.freeze({
  normalizeDraftValue,
  summarizeRecordDraft,
  buildRecordDraftPreview,
  recordDraftPreview,
  summarizeRecordDraftPreview,
  getRecordDraftPreviewHistory,
  getRecordDraftPreviewSummary,
  clearRecordDraftPreviewHistory,
  installRecordDraftPreview,
});

window.ippoRecordDraftPreviewHistory = getRecordDraftPreviewHistory;
window.ippoRecordDraftPreviewSummary = getRecordDraftPreviewSummary;
window.ippoClearRecordDraftPreviewHistory = clearRecordDraftPreviewHistory;

installRecordDraftPreview();
