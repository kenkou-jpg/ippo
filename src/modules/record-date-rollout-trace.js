// ============================================================
//  ippo – src/modules/record-date-rollout-trace.js
//  Phase 3-I-1/2/3: date resolution guarded rollout trace only
//
//  目的:
//  - dateResolutionAdoptionGate の結果をもとに「採用するなら何を使うか」を記録する
//  - saveRecordScreen 本体・保存順・state.records 書き込みには介入しない
//  - Phase 3-I-3 では dry-run field injection 候補を context にだけ記録する
// ============================================================

const WRAP_FLAG = '__ippoDateRolloutTraceObserved';
const ROLLOUT_TRACE_LIMIT = 20;
const LIMITED_ADOPTION_FLAG = 'ippo_enable_limited_date_adoption_experiment';
const rolloutTraceHistory = [];
const limitedAdoptionHistory = [];
const dryRunInjectionHistory = [];

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
    console.debug('[ippo:record-date-rollout-trace]', label, detail || '');
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

function isLimitedDateAdoptionExperimentEnabled() {
  try {
    return localStorage.getItem(LIMITED_ADOPTION_FLAG) === '1'
      || window.__IPPO_ENABLE_LIMITED_DATE_ADOPTION_EXPERIMENT__ === true;
  } catch(e) {
    return window.__IPPO_ENABLE_LIMITED_DATE_ADOPTION_EXPERIMENT__ === true;
  }
}

function setLimitedDateAdoptionExperimentEnabled(enabled) {
  window.__IPPO_ENABLE_LIMITED_DATE_ADOPTION_EXPERIMENT__ = enabled === true;
  try {
    if (enabled === true) {
      localStorage.setItem(LIMITED_ADOPTION_FLAG, '1');
    } else {
      localStorage.removeItem(LIMITED_ADOPTION_FLAG);
    }
  } catch(e) {}
  return isLimitedDateAdoptionExperimentEnabled();
}

function buildDateResolutionRolloutTrace(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const proposal = safeContext.dateResolutionProposal || safeContext.meta?.dateResolutionProposal || null;
  const adoptionGate = safeContext.dateResolutionAdoptionGate || safeContext.meta?.dateResolutionAdoptionGate || null;
  const shadowCompare = safeContext.dateShadowCompare || safeContext.dateBranch?.shadowCompare || null;
  const dateBranch = safeContext.dateBranch || safeContext.meta?.dateBranch || null;

  const canUseProposal = adoptionGate?.canAdopt === true;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'trace-only',
    wouldUseProposal: canUseProposal,
    proposedDate: proposal?.proposedDate || adoptionGate?.proposedDate || '',
    proposedSource: proposal?.proposedSource || adoptionGate?.proposedSource || 'none',
    proposedBranch: proposal?.proposedBranch || adoptionGate?.proposedBranch || dateBranch?.branch || 'unknown',
    confidence: proposal?.confidence || adoptionGate?.confidence || dateBranch?.confidence || 'low',
    adoptionStatus: adoptionGate?.status || 'unknown',
    blockers: adoptionGate?.blockers || [],
    warnings: adoptionGate?.warnings || dateBranch?.warnings || [],
    shadowMatched: shadowCompare?.matched === true,
    shadowComparable: shadowCompare?.comparable === true,
    actualDate: shadowCompare?.actualDate || '',
    actualChangedDates: shadowCompare?.actualChangedDates || [],
  };
}

function buildLimitedDateAdoptionExperiment(context, rolloutTrace) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const dateBranch = safeContext.dateBranch || safeContext.meta?.dateBranch || null;
  const proposal = safeContext.dateResolutionProposal || safeContext.meta?.dateResolutionProposal || null;
  const adoptionGate = safeContext.dateResolutionAdoptionGate || safeContext.meta?.dateResolutionAdoptionGate || null;
  const blockedBy = [];
  const enabled = isLimitedDateAdoptionExperimentEnabled();
  const proposedDate = rolloutTrace?.proposedDate || proposal?.proposedDate || adoptionGate?.proposedDate || '';
  const branch = rolloutTrace?.proposedBranch || proposal?.proposedBranch || adoptionGate?.proposedBranch || dateBranch?.branch || 'unknown';

  if (!enabled) blockedBy.push('experiment-disabled');
  if (adoptionGate?.canAdopt !== true) blockedBy.push('adoption-gate-blocked');
  if (rolloutTrace?.wouldUseProposal !== true) blockedBy.push('rollout-trace-not-usable');
  if (branch !== 'create-by-selectedDate' && branch !== 'create-by-detected-date') {
    blockedBy.push('not-new-record-branch');
  }
  if (!proposedDate) blockedBy.push('missing-proposed-date');
  if ((rolloutTrace?.blockers || []).length > 0) blockedBy.push('rollout-blockers-present');
  if ((rolloutTrace?.warnings || []).length > 0) blockedBy.push('rollout-warnings-present');

  return {
    recordedAt: new Date().toISOString(),
    mode: 'limited-adoption-experiment',
    enabled: enabled,
    canExperimentallyAdopt: blockedBy.length === 0,
    wouldAdoptDate: proposedDate,
    branch: branch,
    source: rolloutTrace?.proposedSource || proposal?.proposedSource || adoptionGate?.proposedSource || 'none',
    confidence: rolloutTrace?.confidence || proposal?.confidence || adoptionGate?.confidence || 'low',
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Phase 3-I-2 records the adoption decision only. It does not replace saveRecordScreen or mutate save values.',
  };
}

function buildDateDryRunFieldInjection(context, limitedExperiment) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const dateBranch = safeContext.dateBranch || safeContext.meta?.dateBranch || null;
  const rolloutTrace = safeContext.dateResolutionRolloutTrace || safeContext.meta?.dateResolutionRolloutTrace || null;
  const blockedBy = [];

  if (limitedExperiment?.canExperimentallyAdopt !== true) {
    blockedBy.push('limited-experiment-not-adoptable');
  }
  if (!limitedExperiment?.wouldAdoptDate) {
    blockedBy.push('missing-dry-run-date');
  }
  if (dateBranch?.branch && limitedExperiment?.branch && dateBranch.branch !== limitedExperiment.branch) {
    blockedBy.push('branch-mismatch');
  }
  if (rolloutTrace?.actualDate && limitedExperiment?.wouldAdoptDate && rolloutTrace.actualDate !== limitedExperiment.wouldAdoptDate) {
    blockedBy.push('actual-date-mismatch');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'dry-run-field-injection',
    enabled: limitedExperiment?.enabled === true,
    canDryRunInject: blockedBy.length === 0,
    fields: {
      __dryRunResolvedDate: limitedExperiment?.wouldAdoptDate || '',
      __dryRunResolvedDateSource: limitedExperiment?.source || 'none',
      __dryRunResolvedDateBranch: limitedExperiment?.branch || 'unknown',
      __dryRunResolvedDateConfidence: limitedExperiment?.confidence || 'low',
    },
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Phase 3-I-3 records candidate fields on save context only. It does not write these fields into records, draft, localStorage, or Supabase.',
  };
}

function summarizeDateResolutionRolloutTrace(history) {
  const list = Array.isArray(history) ? history : [];
  const blockerCounts = {};
  const warningCounts = {};
  const branchCounts = {};
  const sourceCounts = {};

  list.forEach(function(item) {
    const branch = item.proposedBranch || 'unknown';
    const source = item.proposedSource || 'none';
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    (item.blockers || []).forEach(function(blocker) {
      blockerCounts[blocker] = (blockerCounts[blocker] || 0) + 1;
    });
    (item.warnings || []).forEach(function(warning) {
      warningCounts[warning] = (warningCounts[warning] || 0) + 1;
    });
  });

  return {
    count: list.length,
    wouldUseProposalCount: list.filter(function(item) { return item.wouldUseProposal === true; }).length,
    blockedCount: list.filter(function(item) { return item.wouldUseProposal !== true; }).length,
    shadowMatchedCount: list.filter(function(item) { return item.shadowMatched === true; }).length,
    shadowComparableCount: list.filter(function(item) { return item.shadowComparable === true; }).length,
    blockerCounts: blockerCounts,
    warningCounts: warningCounts,
    branchCounts: branchCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function summarizeLimitedDateAdoptionExperiment(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const branchCounts = {};
  const sourceCounts = {};

  list.forEach(function(item) {
    const branch = item.branch || 'unknown';
    const source = item.source || 'none';
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    enabledCount: list.filter(function(item) { return item.enabled === true; }).length,
    experimentallyAdoptableCount: list.filter(function(item) { return item.canExperimentallyAdopt === true; }).length,
    blockedCount: list.filter(function(item) { return item.canExperimentallyAdopt !== true; }).length,
    blockedByCounts: blockedByCounts,
    branchCounts: branchCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function summarizeDateDryRunFieldInjection(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const sourceCounts = {};
  const branchCounts = {};

  list.forEach(function(item) {
    const source = item.fields?.__dryRunResolvedDateSource || 'none';
    const branch = item.fields?.__dryRunResolvedDateBranch || 'unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    injectableCount: list.filter(function(item) { return item.canDryRunInject === true; }).length,
    blockedCount: list.filter(function(item) { return item.canDryRunInject !== true; }).length,
    blockedByCounts: blockedByCounts,
    sourceCounts: sourceCounts,
    branchCounts: branchCounts,
    recent: list.slice(-5),
  };
}

function recordDateResolutionRolloutTrace(context) {
  const entry = buildDateResolutionRolloutTrace(context);
  rolloutTraceHistory.push(entry);

  while (rolloutTraceHistory.length > ROLLOUT_TRACE_LIMIT) {
    rolloutTraceHistory.shift();
  }

  const summary = summarizeDateResolutionRolloutTrace(rolloutTraceHistory);
  const saveContext = context || getLastRecordSaveContext();
  const limitedExperiment = buildLimitedDateAdoptionExperiment(saveContext, entry);
  limitedAdoptionHistory.push(limitedExperiment);
  while (limitedAdoptionHistory.length > ROLLOUT_TRACE_LIMIT) {
    limitedAdoptionHistory.shift();
  }
  const limitedSummary = summarizeLimitedDateAdoptionExperiment(limitedAdoptionHistory);
  const dryRunInjection = buildDateDryRunFieldInjection(saveContext, limitedExperiment);
  dryRunInjectionHistory.push(dryRunInjection);
  while (dryRunInjectionHistory.length > ROLLOUT_TRACE_LIMIT) {
    dryRunInjectionHistory.shift();
  }
  const dryRunSummary = summarizeDateDryRunFieldInjection(dryRunInjectionHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }
    saveContext.meta.dateResolutionRolloutTrace = entry;
    saveContext.meta.dateResolutionRolloutSummary = summary;
    saveContext.meta.limitedDateAdoptionExperiment = limitedExperiment;
    saveContext.meta.limitedDateAdoptionExperimentSummary = limitedSummary;
    saveContext.meta.dateDryRunFieldInjection = dryRunInjection;
    saveContext.meta.dateDryRunFieldInjectionSummary = dryRunSummary;
    saveContext.dateResolutionRolloutTrace = entry;
    saveContext.dateResolutionRolloutSummary = summary;
    saveContext.limitedDateAdoptionExperiment = limitedExperiment;
    saveContext.limitedDateAdoptionExperimentSummary = limitedSummary;
    saveContext.dateDryRunFieldInjection = dryRunInjection;
    saveContext.dateDryRunFieldInjectionSummary = dryRunSummary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.dateResolutionWouldUseProposal = entry.wouldUseProposal === true;
      saveContext.healthSummary.dateResolutionRolloutBlockedCount = summary.blockedCount;
      saveContext.healthSummary.dateResolutionRolloutWouldUseCount = summary.wouldUseProposalCount;
      saveContext.healthSummary.limitedDateAdoptionEnabled = limitedExperiment.enabled === true;
      saveContext.healthSummary.limitedDateAdoptionWouldAdopt = limitedExperiment.canExperimentallyAdopt === true;
      saveContext.healthSummary.limitedDateAdoptionBlockedCount = limitedSummary.blockedCount;
      saveContext.healthSummary.dateDryRunFieldInjectable = dryRunInjection.canDryRunInject === true;
      saveContext.healthSummary.dateDryRunFieldInjectionBlockedCount = dryRunSummary.blockedCount;
    }
  }

  trace('rollout-trace:recorded', entry);
  trace('limited-adoption-experiment:recorded', limitedExperiment);
  trace('date-dry-run-field-injection:recorded', dryRunInjection);
  return entry;
}

function getDateResolutionRolloutTraceHistory() {
  return rolloutTraceHistory.slice();
}

function getDateResolutionRolloutTraceSummary() {
  return summarizeDateResolutionRolloutTrace(rolloutTraceHistory);
}

function clearDateResolutionRolloutTraceHistory() {
  rolloutTraceHistory.splice(0, rolloutTraceHistory.length);
  return getDateResolutionRolloutTraceSummary();
}

function getLimitedDateAdoptionExperimentHistory() {
  return limitedAdoptionHistory.slice();
}

function getLimitedDateAdoptionExperimentSummary() {
  return summarizeLimitedDateAdoptionExperiment(limitedAdoptionHistory);
}

function clearLimitedDateAdoptionExperimentHistory() {
  limitedAdoptionHistory.splice(0, limitedAdoptionHistory.length);
  return getLimitedDateAdoptionExperimentSummary();
}

function getDateDryRunFieldInjectionHistory() {
  return dryRunInjectionHistory.slice();
}

function getDateDryRunFieldInjectionSummary() {
  return summarizeDateDryRunFieldInjection(dryRunInjectionHistory);
}

function clearDateDryRunFieldInjectionHistory() {
  dryRunInjectionHistory.splice(0, dryRunInjectionHistory.length);
  return getDateDryRunFieldInjectionSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateRolloutTraceObserved === true) return;

  window.ippoVerifyLastRecordSave = function dateRolloutTraceVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const rolloutTrace = context?.dateResolutionRolloutTrace || context?.meta?.dateResolutionRolloutTrace || null;
    const rolloutSummary = getDateResolutionRolloutTraceSummary();
    const limitedExperiment = context?.limitedDateAdoptionExperiment || context?.meta?.limitedDateAdoptionExperiment || null;
    const limitedSummary = getLimitedDateAdoptionExperimentSummary();
    const dryRunInjection = context?.dateDryRunFieldInjection || context?.meta?.dateDryRunFieldInjection || null;
    const dryRunSummary = getDateDryRunFieldInjectionSummary();

    if (result && typeof result === 'object') {
      result.dateResolutionRolloutTrace = rolloutTrace;
      result.dateResolutionRolloutSummary = rolloutSummary;
      result.limitedDateAdoptionExperiment = limitedExperiment;
      result.limitedDateAdoptionExperimentSummary = limitedSummary;
      result.dateDryRunFieldInjection = dryRunInjection;
      result.dateDryRunFieldInjectionSummary = dryRunSummary;
      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.dateResolutionWouldUseProposal = rolloutTrace?.wouldUseProposal === true;
        result.healthSummary.dateResolutionRolloutBlockedCount = rolloutSummary.blockedCount;
        result.healthSummary.dateResolutionRolloutWouldUseCount = rolloutSummary.wouldUseProposalCount;
        result.healthSummary.limitedDateAdoptionEnabled = limitedExperiment?.enabled === true;
        result.healthSummary.limitedDateAdoptionWouldAdopt = limitedExperiment?.canExperimentallyAdopt === true;
        result.healthSummary.limitedDateAdoptionBlockedCount = limitedSummary.blockedCount;
        result.healthSummary.dateDryRunFieldInjectable = dryRunInjection?.canDryRunInject === true;
        result.healthSummary.dateDryRunFieldInjectionBlockedCount = dryRunSummary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoDateRolloutTraceObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function dateRolloutTraceSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordDateResolutionRolloutTrace(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordDateResolutionRolloutTrace(getLastRecordSaveContext());
        throw error;
      });
    }

    recordDateResolutionRolloutTrace(getLastRecordSaveContext());
    return result;
  }

  dateRolloutTraceSaveRecordScreen[WRAP_FLAG] = true;
  dateRolloutTraceSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = dateRolloutTraceSaveRecordScreen;
  trace('saveRecordScreen:rollout-trace:installed');
  return true;
}

function installDateResolutionRolloutTrace() {
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
  buildDateResolutionRolloutTrace,
  buildLimitedDateAdoptionExperiment,
  buildDateDryRunFieldInjection,
  recordDateResolutionRolloutTrace,
  summarizeDateResolutionRolloutTrace,
  summarizeLimitedDateAdoptionExperiment,
  summarizeDateDryRunFieldInjection,
  getDateResolutionRolloutTraceHistory,
  getDateResolutionRolloutTraceSummary,
  clearDateResolutionRolloutTraceHistory,
  getLimitedDateAdoptionExperimentHistory,
  getLimitedDateAdoptionExperimentSummary,
  clearLimitedDateAdoptionExperimentHistory,
  getDateDryRunFieldInjectionHistory,
  getDateDryRunFieldInjectionSummary,
  clearDateDryRunFieldInjectionHistory,
  isLimitedDateAdoptionExperimentEnabled,
  setLimitedDateAdoptionExperimentEnabled,
  installDateResolutionRolloutTrace,
};

window.ippoRecordDateRolloutTrace = Object.freeze({
  buildDateResolutionRolloutTrace,
  buildLimitedDateAdoptionExperiment,
  buildDateDryRunFieldInjection,
  recordDateResolutionRolloutTrace,
  summarizeDateResolutionRolloutTrace,
  summarizeLimitedDateAdoptionExperiment,
  summarizeDateDryRunFieldInjection,
  getDateResolutionRolloutTraceHistory,
  getDateResolutionRolloutTraceSummary,
  clearDateResolutionRolloutTraceHistory,
  getLimitedDateAdoptionExperimentHistory,
  getLimitedDateAdoptionExperimentSummary,
  clearLimitedDateAdoptionExperimentHistory,
  getDateDryRunFieldInjectionHistory,
  getDateDryRunFieldInjectionSummary,
  clearDateDryRunFieldInjectionHistory,
  isLimitedDateAdoptionExperimentEnabled,
  setLimitedDateAdoptionExperimentEnabled,
  installDateResolutionRolloutTrace,
});

window.ippoDateResolutionRolloutTraceHistory = getDateResolutionRolloutTraceHistory;
window.ippoDateResolutionRolloutTraceSummary = getDateResolutionRolloutTraceSummary;
window.ippoClearDateResolutionRolloutTraceHistory = clearDateResolutionRolloutTraceHistory;
window.ippoLimitedDateAdoptionExperimentHistory = getLimitedDateAdoptionExperimentHistory;
window.ippoLimitedDateAdoptionExperimentSummary = getLimitedDateAdoptionExperimentSummary;
window.ippoClearLimitedDateAdoptionExperimentHistory = clearLimitedDateAdoptionExperimentHistory;
window.ippoDateDryRunFieldInjectionHistory = getDateDryRunFieldInjectionHistory;
window.ippoDateDryRunFieldInjectionSummary = getDateDryRunFieldInjectionSummary;
window.ippoClearDateDryRunFieldInjectionHistory = clearDateDryRunFieldInjectionHistory;
window.ippoIsLimitedDateAdoptionExperimentEnabled = isLimitedDateAdoptionExperimentEnabled;
window.ippoSetLimitedDateAdoptionExperimentEnabled = setLimitedDateAdoptionExperimentEnabled;

installDateResolutionRolloutTrace();
