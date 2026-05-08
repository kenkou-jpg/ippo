// ============================================================
//  ippo – src/modules/record-date-rollout-trace.js
//  Phase 3-I-1: date resolution guarded rollout trace only
//
//  目的:
//  - dateResolutionAdoptionGate の結果をもとに「採用するなら何を使うか」を記録する
//  - saveRecordScreen 本体・保存順・state.records 書き込みには介入しない
//  - proposal は実保存に使わず、trace / DevTools 確認だけに限定する
// ============================================================

const WRAP_FLAG = '__ippoDateRolloutTraceObserved';
const ROLLOUT_TRACE_LIMIT = 20;
const rolloutTraceHistory = [];

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

function recordDateResolutionRolloutTrace(context) {
  const entry = buildDateResolutionRolloutTrace(context);
  rolloutTraceHistory.push(entry);

  while (rolloutTraceHistory.length > ROLLOUT_TRACE_LIMIT) {
    rolloutTraceHistory.shift();
  }

  const summary = summarizeDateResolutionRolloutTrace(rolloutTraceHistory);
  const saveContext = context || getLastRecordSaveContext();

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }
    saveContext.meta.dateResolutionRolloutTrace = entry;
    saveContext.meta.dateResolutionRolloutSummary = summary;
    saveContext.dateResolutionRolloutTrace = entry;
    saveContext.dateResolutionRolloutSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.dateResolutionWouldUseProposal = entry.wouldUseProposal === true;
      saveContext.healthSummary.dateResolutionRolloutBlockedCount = summary.blockedCount;
      saveContext.healthSummary.dateResolutionRolloutWouldUseCount = summary.wouldUseProposalCount;
    }
  }

  trace('rollout-trace:recorded', entry);
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

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateRolloutTraceObserved === true) return;

  window.ippoVerifyLastRecordSave = function dateRolloutTraceVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const rolloutTrace = context?.dateResolutionRolloutTrace || context?.meta?.dateResolutionRolloutTrace || null;
    const rolloutSummary = getDateResolutionRolloutTraceSummary();

    if (result && typeof result === 'object') {
      result.dateResolutionRolloutTrace = rolloutTrace;
      result.dateResolutionRolloutSummary = rolloutSummary;
      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.dateResolutionWouldUseProposal = rolloutTrace?.wouldUseProposal === true;
        result.healthSummary.dateResolutionRolloutBlockedCount = rolloutSummary.blockedCount;
        result.healthSummary.dateResolutionRolloutWouldUseCount = rolloutSummary.wouldUseProposalCount;
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
  recordDateResolutionRolloutTrace,
  summarizeDateResolutionRolloutTrace,
  getDateResolutionRolloutTraceHistory,
  getDateResolutionRolloutTraceSummary,
  clearDateResolutionRolloutTraceHistory,
  installDateResolutionRolloutTrace,
};

window.ippoRecordDateRolloutTrace = Object.freeze({
  buildDateResolutionRolloutTrace,
  recordDateResolutionRolloutTrace,
  summarizeDateResolutionRolloutTrace,
  getDateResolutionRolloutTraceHistory,
  getDateResolutionRolloutTraceSummary,
  clearDateResolutionRolloutTraceHistory,
  installDateResolutionRolloutTrace,
});

window.ippoDateResolutionRolloutTraceHistory = getDateResolutionRolloutTraceHistory;
window.ippoDateResolutionRolloutTraceSummary = getDateResolutionRolloutTraceSummary;
window.ippoClearDateResolutionRolloutTraceHistory = clearDateResolutionRolloutTraceHistory;

installDateResolutionRolloutTrace();
