// ============================================================
//  ippo – src/modules/record-save-orchestrator.js
//  Phase 3-M-1/2: thin save orchestrator preview + guarded shell
//
//  目的:
//  - saveRecordScreen を薄い orchestrator にするための統合入口を作る
//  - draft / target / persistence / delegation / verification の状態を一枚の結果に束ねる
//  - explicit flag ON の場合のみ、既存saveに渡す draft/payload を orchestration shell で正規化する
//  - state.records / localStorage / Supabase は直接変更しない
// ============================================================

import {
  createRecordDraft,
  cloneDraft,
} from './record-draft.js';

import {
  resolveSaveTarget,
  prepareRecordPersistence,
} from './record-save-target.js';

const WRAP_FLAG = '__ippoRecordSaveOrchestratorObserved';
const BUILD_DRAFT_WRAP_FLAG = '__ippoRecordSaveOrchestratorBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const SHELL_HISTORY_LIMIT = 20;
const ORCHESTRATOR_SHELL_FLAG = 'ippo_enable_record_save_thin_orchestrator_shell';
const orchestrationHistory = [];
const orchestrationShellHistory = [];

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

function isThinOrchestratorShellEnabled() {
  try {
    return localStorage.getItem(ORCHESTRATOR_SHELL_FLAG) === '1'
      || window.__IPPO_RECORD_SAVE_THIN_ORCHESTRATOR_SHELL__ === true;
  } catch(e) {
    return window.__IPPO_RECORD_SAVE_THIN_ORCHESTRATOR_SHELL__ === true;
  }
}

function setThinOrchestratorShellEnabled(value) {
  window.__IPPO_RECORD_SAVE_THIN_ORCHESTRATOR_SHELL__ = value === true;
  try {
    if (value === true) {
      localStorage.setItem(ORCHESTRATOR_SHELL_FLAG, '1');
    } else {
      localStorage.removeItem(ORCHESTRATOR_SHELL_FLAG);
    }
  } catch(e) {}
  return isThinOrchestratorShellEnabled();
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
    note: 'Integrated orchestration result. This is the future saveRecordScreen thin-orchestrator entry point.',
  };
}

function buildThinOrchestratorShellDecision(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const preview = buildRecordSaveOrchestrationPreview({
    draft: draft,
    context: saveContext,
  });
  const enabled = isThinOrchestratorShellEnabled();
  const blockedBy = [];
  const rollbackBlockers = [];
  const warnings = [];
  const persistence = preview.persistence || null;
  const payload = persistence?.payload || null;

  if (!enabled) blockedBy.push('thin-orchestrator-shell-disabled');
  if (!saveContext || typeof saveContext !== 'object' || !saveContext.createdAt) blockedBy.push('missing-active-save-context');
  if (preview.canUseAsThinOrchestrator !== true) blockedBy.push('orchestration-preview-not-usable');
  if (persistence?.canPrepare !== true) blockedBy.push('persistence-not-preparable');
  if (!payload) blockedBy.push('missing-persistence-payload');
  if (persistence?.payloadSummary?.recordDate && persistence?.payloadSummary?.idDate && persistence.payloadSummary.recordDate !== persistence.payloadSummary.idDate) {
    blockedBy.push('payload-date-id-mismatch');
  }
  if ((preview.warnings || []).length > 0) warnings.push('orchestration-has-warnings');
  if (persistence?.saveMode !== 'create') rollbackBlockers.push('not-create-only');

  const canUseShellPayload = blockedBy.length === 0 && warnings.length === 0 && rollbackBlockers.length === 0;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'thin-orchestrator-shell-decision',
    enabled: enabled,
    canUseShellPayload: canUseShellPayload,
    didUseShellPayload: false,
    targetDate: persistence?.targetDate || '',
    saveMode: persistence?.saveMode || 'unknown',
    persistenceStrategy: persistence?.persistenceStrategy || 'unknown',
    originalDraft: cloneDraft(draft),
    shellPayload: payload ? cloneDraft(payload) : null,
    shellPayloadSummary: persistence?.payloadSummary || null,
    preview: preview,
    blockedBy: Array.from(new Set(blockedBy)),
    warnings: Array.from(new Set(warnings)),
    rollbackBlockers: Array.from(new Set(rollbackBlockers)),
    note: 'Guarded shell only. When didUseShellPayload is true, buildDraftFromUI returns the orchestrator payload to the existing save path.',
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

function summarizeThinOrchestratorShell(history) {
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
    usableCount: list.filter(function(item) { return item.canUseShellPayload === true; }).length,
    usedCount: list.filter(function(item) { return item.didUseShellPayload === true; }).length,
    blockedCount: list.filter(function(item) { return item.didUseShellPayload !== true; }).length,
    blockedByCounts: blockedByCounts,
    warningCounts: warningCounts,
    rollbackBlockerCounts: rollbackBlockerCounts,
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

function attachThinOrchestratorShellToContext(context, decision) {
  const summary = summarizeThinOrchestratorShell(orchestrationShellHistory);

  if (context && typeof context === 'object') {
    if (!context.meta || typeof context.meta !== 'object') {
      context.meta = {};
    }

    context.meta.thinOrchestratorShellDecision = decision;
    context.meta.thinOrchestratorShellSummary = summary;
    context.thinOrchestratorShellDecision = decision;
    context.thinOrchestratorShellSummary = summary;

    if (context.healthSummary && typeof context.healthSummary === 'object') {
      context.healthSummary.thinOrchestratorShellEnabled = decision.enabled === true;
      context.healthSummary.thinOrchestratorShellDidUsePayload = decision.didUseShellPayload === true;
      context.healthSummary.thinOrchestratorShellBlockedCount = summary.blockedCount;
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

function recordThinOrchestratorShellDecision(decision, context) {
  const saveContext = context || getActiveRecordSaveContext();
  orchestrationShellHistory.push(decision);
  while (orchestrationShellHistory.length > SHELL_HISTORY_LIMIT) {
    orchestrationShellHistory.shift();
  }

  attachThinOrchestratorShellToContext(saveContext, decision);
  trace('thin-orchestrator-shell:recorded', decision);
  return decision;
}

function applyThinOrchestratorShell(draft, context) {
  const saveContext = context || getActiveRecordSaveContext();
  const decision = buildThinOrchestratorShellDecision(draft, saveContext);

  if (decision.canUseShellPayload === true && decision.shellPayload) {
    decision.didUseShellPayload = true;
    decision.delegatedFields = Object.keys(decision.shellPayload).slice(0, 60);
    recordThinOrchestratorShellDecision(decision, saveContext);
    return cloneDraft(decision.shellPayload);
  }

  recordThinOrchestratorShellDecision(decision, saveContext);
  return draft;
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

function getThinOrchestratorShellHistory() {
  return orchestrationShellHistory.slice();
}

function getThinOrchestratorShellSummary() {
  return summarizeThinOrchestratorShell(orchestrationShellHistory);
}

function clearThinOrchestratorShellHistory() {
  orchestrationShellHistory.splice(0, orchestrationShellHistory.length);
  return getThinOrchestratorShellSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoRecordSaveOrchestratorObserved === true) return;

  window.ippoVerifyLastRecordSave = function recordSaveOrchestratorVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.recordSaveOrchestrationPreview || context?.meta?.recordSaveOrchestrationPreview || null;
    const summary = getRecordSaveOrchestrationSummary();
    const shellDecision = context?.thinOrchestratorShellDecision || context?.meta?.thinOrchestratorShellDecision || null;
    const shellSummary = getThinOrchestratorShellSummary();

    if (result && typeof result === 'object') {
      result.recordSaveOrchestrationPreview = preview;
      result.recordSaveOrchestrationSummary = summary;
      result.thinOrchestratorShellDecision = shellDecision;
      result.thinOrchestratorShellSummary = shellSummary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.recordSaveOrchestrationUsable = preview?.canUseAsThinOrchestrator === true;
        result.healthSummary.recordSaveOrchestrationBlockedCount = summary.blockedCount;
        result.healthSummary.recordSaveOrchestrationWarningCount = (preview?.warnings || []).length;
        result.healthSummary.thinOrchestratorShellEnabled = shellDecision?.enabled === true;
        result.healthSummary.thinOrchestratorShellDidUsePayload = shellDecision?.didUseShellPayload === true;
        result.healthSummary.thinOrchestratorShellBlockedCount = shellSummary.blockedCount;
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

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function thinOrchestratorBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    return applyThinOrchestratorShell(draft, getActiveRecordSaveContext());
  }

  thinOrchestratorBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  thinOrchestratorBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = thinOrchestratorBuildDraftFromUI;
  trace('buildDraftFromUI:thin-orchestrator-shell:installed');
  return true;
}

function installRecordSaveOrchestratorPreview() {
  wrapVerifyLastRecordSave();

  const saveWrapped = wrapSaveRecordScreen();
  const draftWrapped = wrapBuildDraftFromUI();
  if (saveWrapped && draftWrapped) return true;

  let attempts = 0;
  const timer = window.setInterval(function() {
    attempts++;
    wrapVerifyLastRecordSave();
    const didWrapSave = wrapSaveRecordScreen();
    const didWrapDraft = wrapBuildDraftFromUI();
    if ((didWrapSave && didWrapDraft) || attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 250);

  return false;
}

export {
  isThinOrchestratorShellEnabled,
  setThinOrchestratorShellEnabled,
  buildRecordSaveOrchestrationPreview,
  buildThinOrchestratorShellDecision,
  applyThinOrchestratorShell,
  recordSaveOrchestrationPreview,
  recordThinOrchestratorShellDecision,
  summarizeRecordSaveOrchestration,
  summarizeThinOrchestratorShell,
  getRecordSaveOrchestrationHistory,
  getRecordSaveOrchestrationSummary,
  clearRecordSaveOrchestrationHistory,
  getThinOrchestratorShellHistory,
  getThinOrchestratorShellSummary,
  clearThinOrchestratorShellHistory,
  installRecordSaveOrchestratorPreview,
};

window.ippoRecordSaveOrchestrator = Object.freeze({
  isThinOrchestratorShellEnabled,
  setThinOrchestratorShellEnabled,
  buildRecordSaveOrchestrationPreview,
  buildThinOrchestratorShellDecision,
  applyThinOrchestratorShell,
  recordSaveOrchestrationPreview,
  recordThinOrchestratorShellDecision,
  summarizeRecordSaveOrchestration,
  summarizeThinOrchestratorShell,
  getRecordSaveOrchestrationHistory,
  getRecordSaveOrchestrationSummary,
  clearRecordSaveOrchestrationHistory,
  getThinOrchestratorShellHistory,
  getThinOrchestratorShellSummary,
  clearThinOrchestratorShellHistory,
  installRecordSaveOrchestratorPreview,
});

window.ippoSetThinOrchestratorShellEnabled = setThinOrchestratorShellEnabled;
window.ippoIsThinOrchestratorShellEnabled = isThinOrchestratorShellEnabled;
window.ippoRecordSaveOrchestrationPreview = recordSaveOrchestrationPreview;
window.ippoRecordSaveOrchestrationSummary = getRecordSaveOrchestrationSummary;
window.ippoRecordSaveOrchestrationHistory = getRecordSaveOrchestrationHistory;
window.ippoClearRecordSaveOrchestrationHistory = clearRecordSaveOrchestrationHistory;
window.ippoThinOrchestratorShellSummary = getThinOrchestratorShellSummary;
window.ippoThinOrchestratorShellHistory = getThinOrchestratorShellHistory;
window.ippoClearThinOrchestratorShellHistory = clearThinOrchestratorShellHistory;

installRecordSaveOrchestratorPreview();
