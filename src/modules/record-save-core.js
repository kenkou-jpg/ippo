// ============================================================
//  ippo – src/modules/record-save-core.js
//  Phase 3-N-3/4: record save core facade
//
//  目的:
//  - saveRecordScreen 内部から安全に呼べる core facade を用意する
//  - draft生成 / target解決 / persistence準備を1つのAPIに束ねる
//  - buildDraftFromUI 後に core facade を自動記録する
//  - この段階では saveRecordScreen 本体・state.records・localStorage・Supabase を変更しない
// ============================================================

import {
  createRecordDraft,
  normalizeRecordDraft,
} from './record-draft.js';

import {
  resolveSaveTarget,
  buildRecordPayload,
  prepareRecordPersistence,
} from './record-save-target.js';

const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordSaveCoreBuildDraftWrapped';
const VERIFY_WRAP_FLAG = '__ippoRecordSaveCoreVerifyWrapped';
const HISTORY_LIMIT = 20;
const coreHistory = [];

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
    console.debug('[ippo:record-save-core]', label, detail || '');
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

function buildRecordSaveCore(options) {
  const opts = options || {};
  const context = opts.context || getActiveRecordSaveContext() || getLastRecordSaveContext();
  const sourceDraft = opts.draft !== undefined ? opts.draft : null;
  const blockedBy = [];
  const warnings = [];

  const draftResult = createRecordDraft({
    draft: sourceDraft,
    context: context,
  });
  const normalizedDraft = normalizeRecordDraft(draftResult.draft || sourceDraft);
  const resolvedTarget = resolveSaveTarget({
    draft: normalizedDraft,
    context: context,
  });
  const payload = buildRecordPayload(normalizedDraft, resolvedTarget);
  const persistence = prepareRecordPersistence({
    draft: normalizedDraft,
    context: context,
    resolvedTarget: resolvedTarget,
  });

  if (!context || typeof context !== 'object' || !context.createdAt) blockedBy.push('missing-save-context');
  if (!draftResult.preview?.canUsePreview) blockedBy.push('draft-not-usable');
  if (resolvedTarget.canResolve !== true) blockedBy.push('target-not-resolved');
  if (persistence.canPrepare !== true) blockedBy.push('persistence-not-preparable');
  if (!payload || typeof payload !== 'object') blockedBy.push('payload-not-object');
  if (payload?.record_date && payload?.id && payload.record_date !== payload.id) blockedBy.push('payload-date-id-mismatch');

  (draftResult.preview?.warnings || []).forEach(function(reason) { warnings.push('draft:' + reason); });
  (resolvedTarget.preview?.warnings || []).forEach(function(reason) { warnings.push('target:' + reason); });
  (persistence.warnings || []).forEach(function(reason) { warnings.push('persistence:' + reason); });

  return {
    recordedAt: getTimestamp(),
    mode: 'record-save-core',
    usable: blockedBy.length === 0 && warnings.length === 0,
    sourceDraft: sourceDraft,
    draft: draftResult,
    normalizedDraft: normalizedDraft,
    target: resolvedTarget,
    payload: payload,
    persistence: persistence,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Core facade only. This prepares draft/target/persistence data without mutating records or storage.',
  };
}

function summarizeRecordSaveCore(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const warningCounts = {};
  const saveModeCounts = {};
  const strategyCounts = {};

  list.forEach(function(item) {
    const saveMode = item.persistence?.saveMode || item.target?.saveMode || 'unknown';
    const strategy = item.persistence?.persistenceStrategy || 'unknown';
    saveModeCounts[saveMode] = (saveModeCounts[saveMode] || 0) + 1;
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
    usableCount: list.filter(function(item) { return item.usable === true; }).length,
    blockedCount: list.filter(function(item) { return item.usable !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    saveModeCounts: saveModeCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveCoreToContext(context, core) {
  const summary = summarizeRecordSaveCore(coreHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveCore = core;
    context.meta.recordSaveCoreSummary = summary;
    context.recordSaveCore = core;
    context.recordSaveCoreSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveCoreUsable = core.usable === true;
      context.healthSummary.recordSaveCoreBlockedCount = summary.blockedCount;
      context.healthSummary.recordSaveCoreWarningCount = core.warnings.length;
    }
  }

  return summary;
}

function recordSaveCore(options) {
  const opts = options || {};
  const context = opts.context || getActiveRecordSaveContext() || getLastRecordSaveContext();
  const core = buildRecordSaveCore({
    draft: opts.draft,
    context: context,
  });

  coreHistory.push(core);
  while (coreHistory.length > HISTORY_LIMIT) {
    coreHistory.shift();
  }

  attachRecordSaveCoreToContext(context, core);
  trace('core:recorded', core);
  return core;
}

function getRecordSaveCoreHistory() {
  return coreHistory.slice();
}

function getRecordSaveCoreSummary() {
  return summarizeRecordSaveCore(coreHistory);
}

function clearRecordSaveCoreHistory() {
  coreHistory.splice(0, coreHistory.length);
  return getRecordSaveCoreSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify[VERIFY_WRAP_FLAG] === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveCoreVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const core = context?.recordSaveCore || context?.meta?.recordSaveCore || null;
    const summary = getRecordSaveCoreSummary();

    if (result && typeof result === 'object') {
      result.recordSaveCore = core;
      result.recordSaveCoreSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveCoreUsable = core?.usable === true;
        result.healthSummary.recordSaveCoreBlockedCount = summary.blockedCount;
        result.healthSummary.recordSaveCoreWarningCount = (core?.warnings || []).length;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave[VERIFY_WRAP_FLAG] = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function recordSaveCoreBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    recordSaveCore({
      draft: draft,
      context: getActiveRecordSaveContext(),
    });
    return draft;
  }

  recordSaveCoreBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  recordSaveCoreBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = recordSaveCoreBuildDraftFromUI;
  trace('buildDraftFromUI:core:installed');
  return true;
}

function installRecordSaveCore() {
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
  buildRecordSaveCore,
  recordSaveCore,
  summarizeRecordSaveCore,
  getRecordSaveCoreHistory,
  getRecordSaveCoreSummary,
  clearRecordSaveCoreHistory,
  installRecordSaveCore,
};

window.ippoRecordSaveCore = Object.freeze({
  buildRecordSaveCore,
  recordSaveCore,
  summarizeRecordSaveCore,
  getRecordSaveCoreHistory,
  getRecordSaveCoreSummary,
  clearRecordSaveCoreHistory,
  installRecordSaveCore,
});

window.ippoBuildRecordSaveCore = buildRecordSaveCore;
window.ippoRecordSaveCoreSummary = getRecordSaveCoreSummary;
window.ippoRecordSaveCoreHistory = getRecordSaveCoreHistory;
window.ippoClearRecordSaveCoreHistory = clearRecordSaveCoreHistory;

installRecordSaveCore();
