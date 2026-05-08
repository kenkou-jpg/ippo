// ============================================================
//  ippo – src/modules/record-save-orchestrator.js
//  Phase 3-M-1: thin save orchestrator preview
//
//  目的:
//  - saveRecordScreen を薄い orchestrator にするための統合入口を作る
//  - draft / target / persistence / delegation / verification の状態を一枚の結果に束ねる
//  - この段階では保存経路を直接置換しない
// ============================================================

import {
  createRecordDraft,
} from './record-draft.js';

import {
  resolveSaveTarget,
  prepareRecordPersistence,
} from './record-save-target.js';

const WRAP_FLAG = '__ippoRecordSaveOrchestratorObserved';
const HISTORY_LIMIT = 20;
const orchestrationHistory = [];

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
    console.debug('[ippo:record-save-orchestrator]', label, detail || '');
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

function getContextArtifact(context, name) {
  const safeContext = context || {};
  return safeContext[name] || safeContext.meta?.[name] || null;
}

function buildRecordSaveOrchestrationPreview(options) {
  const opts = options || {};
  const saveContext = opts.context || getActiveRecordSaveContext() || getLastRecordSaveContext();
  const sourceDraft = opts.draft !== undefined ? opts.draft : null;
  const draftResult = createRecordDraft({
    draft: sourceDraft,
    context: saveContext,
  });
  const draft = draftResult.draft || sourceDraft;
  const resolvedTarget = resolveSaveTarget({
    draft: draft,
    context: saveContext,
  });
  const persistencePreview = prepareRecordPersistence({
    draft: draft,
    context: saveContext,
    resolvedTarget: resolvedTarget,
  });
  const blockedBy = [];
  const warnings = [];

  const delegationReadiness = getContextArtifact(saveContext, 'recordSaveDelegationReadiness');
  const delegationPlan = getContextArtifact(saveContext, 'recordSaveDelegationPlan');
  const preSaveDelegation = getContextArtifact(saveContext, 'preSaveModulePayloadDelegation');
  const postSaveVerification = getContextArtifact(saveContext, 'modulePayloadPostSaveVerification');

  if (!saveContext || typeof saveContext !== 'object' || !saveContext.createdAt) {
    blockedBy.push('missing-save-context');
  }
  if (!draftResult.preview?.canUsePreview) blockedBy.push('draft-preview-not-usable');
  if (resolvedTarget.canResolve !== true) blockedBy.push('save-target-not-resolved');
  if (persistencePreview.canPrepare !== true) blockedBy.push('persistence-not-preparable');

  (draftResult.preview?.warnings || []).forEach(function(reason) { warnings.push('draft:' + reason); });
  (resolvedTarget.preview?.warnings || []).forEach(function(reason) { warnings.push('target:' + reason); });
  (persistencePreview.warnings || []).forEach(function(reason) { warnings.push('persistence:' + reason); });

  const canUseAsThinOrchestrator = blockedBy.length === 0 && warnings.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'record-save-orchestration-preview',
    canUseAsThinOrchestrator: canUseAsThinOrchestrator,
    draft: {
      canUseNormalizedDraft: draftResult.canUseNormalizedDraft === true,
      preview: draftResult.preview,
      originalDraft: draftResult.originalDraft,
      normalizedDraft: draftResult.normalizedDraft,
    },
    target: resolvedTarget,
    persistence: persistencePreview,
    delegation: {
      readiness: delegationReadiness,
      plan: delegationPlan,
      preSaveDelegation: preSaveDelegation,
      postSaveVerification: postSaveVerification,
    },
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    note: 'Preview-only integrated orchestration result. This is the future saveRecordScreen thin-orchestrator entry point.',
  };
}

function summarizeRecordSaveOrchestration(history) {
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
    usableCount: list.filter(function(item) { return item.canUseAsThinOrchestrator === true; }).length,
    blockedCount: list.filter(function(item) { return item.canUseAsThinOrchestrator !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    saveModeCounts: saveModeCounts,
    strategyCounts: strategyCounts,
    recent: list.slice(-5),
  };
}

function attachRecordSaveOrchestrationToContext(context, preview) {
  const summary = summarizeRecordSaveOrchestration(orchestrationHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.recordSaveOrchestrationPreview = preview;
    context.meta.recordSaveOrchestrationSummary = summary;
    context.recordSaveOrchestrationPreview = preview;
    context.recordSaveOrchestrationSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.recordSaveOrchestrationUsable = preview.canUseAsThinOrchestrator === true;
      context.healthSummary.recordSaveOrchestrationBlockedCount = summary.blockedCount;
      context.healthSummary.recordSaveOrchestrationWarningCount = preview.warnings.length;
    }
  }

  return summary;
}

function recordSaveOrchestrationPreview(options) {
  const opts = options || {};
  const saveContext = opts.context || getLastRecordSaveContext() || getActiveRecordSaveContext();
  const preview = buildRecordSaveOrchestrationPreview({
    draft: opts.draft,
    context: saveContext,
  });

  orchestrationHistory.push(preview);
  while (orchestrationHistory.length > HISTORY_LIMIT) {
    orchestrationHistory.shift();
  }

  attachRecordSaveOrchestrationToContext(saveContext, preview);
  trace('orchestration-preview:recorded', preview);
  return preview;
}

function getRecordSaveOrchestrationHistory() {
  return orchestrationHistory.slice();
}

function getRecordSaveOrchestrationSummary() {
  return summarizeRecordSaveOrchestration(orchestrationHistory);
}

function clearRecordSaveOrchestrationHistory() {
  orchestrationHistory.splice(0, orchestrationHistory.length);
  return getRecordSaveOrchestrationSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveOrchestratorObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveOrchestratorVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.recordSaveOrchestrationPreview || context?.meta?.recordSaveOrchestrationPreview || null;
    const summary = getRecordSaveOrchestrationSummary();

    if (result && typeof result === 'object') {
      result.recordSaveOrchestrationPreview = preview;
      result.recordSaveOrchestrationSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveOrchestrationUsable = preview?.canUseAsThinOrchestrator === true;
        result.healthSummary.recordSaveOrchestrationBlockedCount = summary.blockedCount;
        result.healthSummary.recordSaveOrchestrationWarningCount = (preview?.warnings || []).length;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoRecordSaveOrchestratorObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function recordSaveOrchestratorSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordSaveOrchestrationPreview({ context: getLastRecordSaveContext() });
        return value;
      }).catch(function(error) {
        recordSaveOrchestrationPreview({ context: getLastRecordSaveContext() });
        throw error;
      });
    }

    recordSaveOrchestrationPreview({ context: getLastRecordSaveContext() });
    return result;
  }

  recordSaveOrchestratorSaveRecordScreen[WRAP_FLAG] = true;
  recordSaveOrchestratorSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = recordSaveOrchestratorSaveRecordScreen;
  trace('saveRecordScreen:orchestration-preview:installed');
  return true;
}

function installRecordSaveOrchestratorPreview() {
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
  buildRecordSaveOrchestrationPreview,
  recordSaveOrchestrationPreview,
  summarizeRecordSaveOrchestration,
  getRecordSaveOrchestrationHistory,
  getRecordSaveOrchestrationSummary,
  clearRecordSaveOrchestrationHistory,
  installRecordSaveOrchestratorPreview,
};

window.ippoRecordSaveOrchestrator = Object.freeze({
  buildRecordSaveOrchestrationPreview,
  recordSaveOrchestrationPreview,
  summarizeRecordSaveOrchestration,
  getRecordSaveOrchestrationHistory,
  getRecordSaveOrchestrationSummary,
  clearRecordSaveOrchestrationHistory,
  installRecordSaveOrchestratorPreview,
});

window.ippoRecordSaveOrchestrationPreview = recordSaveOrchestrationPreview;
window.ippoRecordSaveOrchestrationSummary = getRecordSaveOrchestrationSummary;
window.ippoRecordSaveOrchestrationHistory = getRecordSaveOrchestrationHistory;
window.ippoClearRecordSaveOrchestrationHistory = clearRecordSaveOrchestrationHistory;

installRecordSaveOrchestratorPreview();
