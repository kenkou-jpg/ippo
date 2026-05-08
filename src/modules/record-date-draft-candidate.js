// ============================================================
//  ippo – src/modules/record-date-draft-candidate.js
//  Phase 3-I-4: draft candidate injection layer
//
//  目的:
//  - limited real adoption candidate から draft candidate を生成する
//  - この段階では draft 本体を書き換えない
//  - save context にだけ injection preview を記録する
// ============================================================

const WRAP_FLAG = '__ippoDateDraftCandidateObserved';
const HISTORY_LIMIT = 20;
const draftCandidateHistory = [];

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
    console.debug('[ippo:record-date-draft-candidate]', label, detail || '');
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

function buildDateDraftCandidate(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const candidate = safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
    || null;

  const blockedBy = [];

  if (candidate?.canUseCandidate !== true) {
    blockedBy.push('candidate-not-usable');
  }

  if (!candidate?.candidateDate) {
    blockedBy.push('missing-candidate-date');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'draft-candidate-preview',
    canInjectDraftCandidate: blockedBy.length === 0,
    draftCandidate: {
      record_date: candidate?.candidateDate || '',
      source: candidate?.candidateSource || 'none',
      branch: candidate?.candidateBranch || 'unknown',
      confidence: candidate?.candidateConfidence || 'low',
    },
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Phase 3-I-4 previews draft injection only. It does not mutate actual draft or persisted records.',
  };
}

function summarizeDateDraftCandidate(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};
  const sourceCounts = {};

  list.forEach(function(item) {
    const source = item.draftCandidate?.source || 'none';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    injectableCount: list.filter(function(item) {
      return item.canInjectDraftCandidate === true;
    }).length,
    blockedCount: list.filter(function(item) {
      return item.canInjectDraftCandidate !== true;
    }).length,
    blockedByCounts: blockedByCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function recordDateDraftCandidate(context) {
  const saveContext = context || getLastRecordSaveContext();
  const preview = buildDateDraftCandidate(saveContext);

  draftCandidateHistory.push(preview);
  while (draftCandidateHistory.length > HISTORY_LIMIT) {
    draftCandidateHistory.shift();
  }

  const summary = summarizeDateDraftCandidate(draftCandidateHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }

    saveContext.meta.dateDraftCandidate = preview;
    saveContext.meta.dateDraftCandidateSummary = summary;
    saveContext.dateDraftCandidate = preview;
    saveContext.dateDraftCandidateSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.dateDraftCandidateInjectable = preview.canInjectDraftCandidate === true;
      saveContext.healthSummary.dateDraftCandidateBlockedCount = summary.blockedCount;
    }
  }

  trace('draft-candidate:recorded', preview);
  return preview;
}

function getDateDraftCandidateHistory() {
  return draftCandidateHistory.slice();
}

function getDateDraftCandidateSummary() {
  return summarizeDateDraftCandidate(draftCandidateHistory);
}

function clearDateDraftCandidateHistory() {
  draftCandidateHistory.splice(0, draftCandidateHistory.length);
  return getDateDraftCandidateSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateDraftCandidateObserved === true) return;

  window.ippoVerifyLastRecordSave = function dateDraftCandidateVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.dateDraftCandidate || context?.meta?.dateDraftCandidate || null;
    const summary = getDateDraftCandidateSummary();

    if (result && typeof result === 'object') {
      result.dateDraftCandidate = preview;
      result.dateDraftCandidateSummary = summary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.dateDraftCandidateInjectable = preview?.canInjectDraftCandidate === true;
        result.healthSummary.dateDraftCandidateBlockedCount = summary.blockedCount;
      }
    }

    return result;
  };

  window.ippoVerifyLastRecordSave.__ippoDateDraftCandidateObserved = true;
  window.ippoVerifyLastRecordSave.__ippoOriginal = originalVerify;
}

function wrapSaveRecordScreen() {
  const current = window.saveRecordScreen;
  if (typeof current !== 'function') return false;
  if (current[WRAP_FLAG] === true) return true;

  function dateDraftCandidateSaveRecordScreen() {
    const result = current.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        recordDateDraftCandidate(getLastRecordSaveContext());
        return value;
      }).catch(function(error) {
        recordDateDraftCandidate(getLastRecordSaveContext());
        throw error;
      });
    }

    recordDateDraftCandidate(getLastRecordSaveContext());
    return result;
  }

  dateDraftCandidateSaveRecordScreen[WRAP_FLAG] = true;
  dateDraftCandidateSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = dateDraftCandidateSaveRecordScreen;
  trace('saveRecordScreen:draft-candidate:installed');
  return true;
}

function installDateDraftCandidate() {
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
  buildDateDraftCandidate,
  recordDateDraftCandidate,
  summarizeDateDraftCandidate,
  getDateDraftCandidateHistory,
  getDateDraftCandidateSummary,
  clearDateDraftCandidateHistory,
  installDateDraftCandidate,
};

window.ippoRecordDateDraftCandidate = Object.freeze({
  buildDateDraftCandidate,
  recordDateDraftCandidate,
  summarizeDateDraftCandidate,
  getDateDraftCandidateHistory,
  getDateDraftCandidateSummary,
  clearDateDraftCandidateHistory,
  installDateDraftCandidate,
});

window.ippoDateDraftCandidateHistory = getDateDraftCandidateHistory;
window.ippoDateDraftCandidateSummary = getDateDraftCandidateSummary;
window.ippoClearDateDraftCandidateHistory = clearDateDraftCandidateHistory;

installDateDraftCandidate();
