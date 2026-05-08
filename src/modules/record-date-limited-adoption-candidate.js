// ============================================================
//  ippo – src/modules/record-date-limited-adoption-candidate.js
//  Phase 3-I-4: first limited real adoption candidate layer
//
//  目的:
//  - dry-run field injection の結果から「実採用するなら使う候補」を作る
//  - このPRでは saveRecordScreen / draft / state.records / storage / Supabase は変更しない
//  - explicit flag ON + dry-run injectable + 新規保存branch の場合だけ candidate を有効化する
// ============================================================

const WRAP_FLAG = '__ippoDateLimitedAdoptionCandidateObserved';
const CANDIDATE_HISTORY_LIMIT = 20;
const CANDIDATE_FLAG = 'ippo_enable_limited_date_real_adoption_candidate';
const candidateHistory = [];

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
    console.debug('[ippo:record-date-limited-adoption-candidate]', label, detail || '');
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

function isLimitedDateRealAdoptionCandidateEnabled() {
  try {
    return localStorage.getItem(CANDIDATE_FLAG) === '1'
      || window.__IPPO_ENABLE_LIMITED_DATE_REAL_ADOPTION_CANDIDATE__ === true;
  } catch(e) {
    return window.__IPPO_ENABLE_LIMITED_DATE_REAL_ADOPTION_CANDIDATE__ === true;
  }
}

function setLimitedDateRealAdoptionCandidateEnabled(enabled) {
  window.__IPPO_ENABLE_LIMITED_DATE_REAL_ADOPTION_CANDIDATE__ = enabled === true;
  try {
    if (enabled === true) {
      localStorage.setItem(CANDIDATE_FLAG, '1');
    } else {
      localStorage.removeItem(CANDIDATE_FLAG);
    }
  } catch(e) {}
  return isLimitedDateRealAdoptionCandidateEnabled();
}

function buildLimitedDateRealAdoptionCandidate(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const dryRun = safeContext.dateDryRunFieldInjection || safeContext.meta?.dateDryRunFieldInjection || null;
  const limitedExperiment = safeContext.limitedDateAdoptionExperiment || safeContext.meta?.limitedDateAdoptionExperiment || null;
  const rolloutTrace = safeContext.dateResolutionRolloutTrace || safeContext.meta?.dateResolutionRolloutTrace || null;
  const blockedBy = [];
  const enabled = isLimitedDateRealAdoptionCandidateEnabled();
  const fields = dryRun?.fields || {};
  const candidateDate = fields.__dryRunResolvedDate || limitedExperiment?.wouldAdoptDate || '';
  const candidateBranch = fields.__dryRunResolvedDateBranch || limitedExperiment?.branch || 'unknown';

  if (!enabled) blockedBy.push('candidate-flag-disabled');
  if (dryRun?.canDryRunInject !== true) blockedBy.push('dry-run-not-injectable');
  if (limitedExperiment?.canExperimentallyAdopt !== true) blockedBy.push('limited-experiment-not-adoptable');
  if (candidateBranch !== 'create-by-selectedDate' && candidateBranch !== 'create-by-detected-date') {
    blockedBy.push('not-new-record-branch');
  }
  if (!candidateDate) blockedBy.push('missing-candidate-date');
  if (rolloutTrace?.actualDate && candidateDate && rolloutTrace.actualDate !== candidateDate) {
    blockedBy.push('actual-date-mismatch');
  }
  if ((dryRun?.blockedBy || []).length > 0) blockedBy.push('dry-run-blockers-present');

  return {
    recordedAt: new Date().toISOString(),
    mode: 'limited-real-adoption-candidate',
    enabled: enabled,
    canUseCandidate: blockedBy.length === 0,
    candidateDate: candidateDate,
    candidateSource: fields.__dryRunResolvedDateSource || limitedExperiment?.source || 'none',
    candidateBranch: candidateBranch,
    candidateConfidence: fields.__dryRunResolvedDateConfidence || limitedExperiment?.confidence || 'low',
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Phase 3-I-4 creates the final adoption candidate only. It does not mutate saveRecordScreen, draft, records, localStorage, or Supabase.',
  };
}

function summarizeLimitedDateRealAdoptionCandidate(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const branchCounts = {};
  const sourceCounts = {};

  list.forEach(function(item) {
    const branch = item.candidateBranch || 'unknown';
    const source = item.candidateSource || 'none';
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    enabledCount: list.filter(function(item) { return item.enabled === true; }).length,
    usableCandidateCount: list.filter(function(item) { return item.canUseCandidate === true; }).length,
    blockedCount: list.filter(function(item) { return item.canUseCandidate !== true; }).length,
    blockedByCounts: blockedByCounts,
    branchCounts: branchCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function recordLimitedDateRealAdoptionCandidate(context) {
  const saveContext = context || getLastRecordSaveContext();
  const candidate = buildLimitedDateRealAdoptionCandidate(saveContext);
  candidateHistory.push(candidate);
  while (candidateHistory.length > CANDIDATE_HISTORY_LIMIT) {
    candidateHistory.shift();
  }
  const summary = summarizeLimitedDateRealAdoptionCandidate(candidateHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }
    saveContext.meta.limitedDateRealAdoptionCandidate = candidate;
    saveContext.meta.limitedDateRealAdoptionCandidateSummary = summary;
    saveContext.limitedDateRealAdoptionCandidate = candidate;
    saveContext.limitedDateRealAdoptionCandidateSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.limitedDateRealAdoptionCandidateEnabled = candidate.enabled === true;
      saveContext.healthSummary.limitedDateRealAdoptionCandidateUsable = candidate.canUseCandidate === true;
      saveContext.healthSummary.limitedDateRealAdoptionCandidateBlockedCount = summary.blockedCount;
    }
  }

  trace('candidate:recorded', candidate);
  return candidate;
}

function getLimitedDateRealAdoptionCandidateHistory() {
  return candidateHistory.slice();
}

function getLimitedDateRealAdoptionCandidateSummary() {
  return summarizeLimitedDateRealAdoptionCandidate(candidateHistory);
}

function clearLimitedDateRealAdoptionCandidateHistory() {
  candidateHistory.splice(0, candidateHistory.length);
  return getLimitedDateRealAdoptionCandidateSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateLimitedAdoptionCandidateObserved === true) return;

  window.ippoVerifyLastRecordSave = function limitedDateCandidateVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const candidate = context?.limitedDateRealAdoptionCandidate || context?.meta?.limitedDateRealAdoptionCandidate || null;
    const summary = getLimitedDateRealAdoptionCandidateSummary();

    if (result && typeof result === 'object') {
      result.limitedDateRealAdoptionCandidate = candidate;
      result.limitedDateRealAdoptionCandidateSummary = summary;
      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.limitedDateRealAdoptionCandidateEnabled = candidate?.enabled === true;
        result.healthSummary.limitedDateRealAdoptionCandidateUsable = candidate?.canUseCandidate === true;
        result.healthSummary.limitedDateRealAdoptionCandidateBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoDateLimitedAdoptionCandidateObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function limitedDateCandidateSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordLimitedDateRealAdoptionCandidate(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordLimitedDateRealAdoptionCandidate(getLastRecordSaveContext());
        throw error;
      });
    }

    recordLimitedDateRealAdoptionCandidate(getLastRecordSaveContext());
    return result;
  }

  limitedDateCandidateSaveRecordScreen[WRAP_FLAG] = true;
  limitedDateCandidateSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = limitedDateCandidateSaveRecordScreen;
  trace('saveRecordScreen:candidate:installed');
  return true;
}

function installLimitedDateRealAdoptionCandidate() {
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
  buildLimitedDateRealAdoptionCandidate,
  recordLimitedDateRealAdoptionCandidate,
  summarizeLimitedDateRealAdoptionCandidate,
  getLimitedDateRealAdoptionCandidateHistory,
  getLimitedDateRealAdoptionCandidateSummary,
  clearLimitedDateRealAdoptionCandidateHistory,
  isLimitedDateRealAdoptionCandidateEnabled,
  setLimitedDateRealAdoptionCandidateEnabled,
  installLimitedDateRealAdoptionCandidate,
};

window.ippoRecordDateLimitedAdoptionCandidate = Object.freeze({
  buildLimitedDateRealAdoptionCandidate,
  recordLimitedDateRealAdoptionCandidate,
  summarizeLimitedDateRealAdoptionCandidate,
  getLimitedDateRealAdoptionCandidateHistory,
  getLimitedDateRealAdoptionCandidateSummary,
  clearLimitedDateRealAdoptionCandidateHistory,
  isLimitedDateRealAdoptionCandidateEnabled,
  setLimitedDateRealAdoptionCandidateEnabled,
  installLimitedDateRealAdoptionCandidate,
});

window.ippoLimitedDateRealAdoptionCandidateHistory = getLimitedDateRealAdoptionCandidateHistory;
window.ippoLimitedDateRealAdoptionCandidateSummary = getLimitedDateRealAdoptionCandidateSummary;
window.ippoClearLimitedDateRealAdoptionCandidateHistory = clearLimitedDateRealAdoptionCandidateHistory;
window.ippoIsLimitedDateRealAdoptionCandidateEnabled = isLimitedDateRealAdoptionCandidateEnabled;
window.ippoSetLimitedDateRealAdoptionCandidateEnabled = setLimitedDateRealAdoptionCandidateEnabled;

installLimitedDateRealAdoptionCandidate();
