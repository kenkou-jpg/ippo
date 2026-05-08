// ============================================================
//  ippo – src/modules/record-date-draft-candidate.js
//  Phase 3-I-4/5/7: draft candidate injection layer
//
//  目的:
//  - limited real adoption candidate から draft candidate を生成する
//  - preview は save context に記録する
//  - explicit flag ON の限定ケースだけ buildDraftFromUI の返却draftへ実注入する
//  - 実注入は active save context がある保存中だけ許可する
//  - 保存完了後に injected draft と persisted record を shadow compare する
//  - inject成功 + persist一致 の場合だけ limited adoption success として集計する
//  - saveRecordScreen / state.records / localStorage / Supabase の保存経路は直接変更しない
// ============================================================

import {
  findRecordByDate,
  getRecordDate,
} from './record-repository.js';

const WRAP_FLAG = '__ippoDateDraftCandidateObserved';
const BUILD_DRAFT_WRAP_FLAG = '__ippoDateDraftCandidateBuildDraftWrapped';
const HISTORY_LIMIT = 20;
const INJECTION_HISTORY_LIMIT = 20;
const SHADOW_COMPARE_HISTORY_LIMIT = 20;
const ADOPTION_OUTCOME_HISTORY_LIMIT = 20;
const ACTUAL_INJECTION_FLAG = 'ippo_enable_date_draft_candidate_actual_injection';
const draftCandidateHistory = [];
const actualInjectionHistory = [];
const shadowCompareHistory = [];
const adoptionOutcomeHistory = [];

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

function getActiveRecordSaveContext() {
  try {
    if (typeof window.ippoActiveRecordSaveContext === 'function') {
      return window.ippoActiveRecordSaveContext();
    }
  } catch(e) {}
  return window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ || null;
}

function isDateDraftCandidateActualInjectionEnabled() {
  try {
    return localStorage.getItem(ACTUAL_INJECTION_FLAG) === '1'
      || window.__IPPO_ENABLE_DATE_DRAFT_CANDIDATE_ACTUAL_INJECTION__ === true;
  } catch(e) {
    return window.__IPPO_ENABLE_DATE_DRAFT_CANDIDATE_ACTUAL_INJECTION__ === true;
  }
}

function setDateDraftCandidateActualInjectionEnabled(enabled) {
  window.__IPPO_ENABLE_DATE_DRAFT_CANDIDATE_ACTUAL_INJECTION__ = enabled === true;
  try {
    if (enabled === true) {
      localStorage.setItem(ACTUAL_INJECTION_FLAG, '1');
    } else {
      localStorage.removeItem(ACTUAL_INJECTION_FLAG);
    }
  } catch(e) {}
  return isDateDraftCandidateActualInjectionEnabled();
}

function getCandidateFromContext(context) {
  const safeContext = context || {};
  return safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
    || null;
}

function buildDateDraftCandidate(context) {
  const candidate = getCandidateFromContext(context || getLastRecordSaveContext());
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
    note: 'Phase 3-I-4 previews draft injection. Actual draft mutation requires active save context and an explicit separate flag.',
  };
}

function buildActualDateDraftCandidateInjection(draft, context) {
  const safeDraft = draft && typeof draft === 'object' ? draft : null;
  const activeContext = context || null;
  const candidate = getCandidateFromContext(activeContext);
  const preview = buildDateDraftCandidate(activeContext || {});
  const blockedBy = [];
  const enabled = isDateDraftCandidateActualInjectionEnabled();
  const candidateDate = preview.draftCandidate?.record_date || '';
  const candidateBranch = preview.draftCandidate?.branch || 'unknown';

  if (!enabled) blockedBy.push('draft-actual-injection-flag-disabled');
  if (!activeContext) blockedBy.push('missing-active-save-context');
  if (!safeDraft) blockedBy.push('draft-not-object');
  if (preview.canInjectDraftCandidate !== true) blockedBy.push('draft-candidate-not-injectable');
  if (candidate?.canUseCandidate !== true) blockedBy.push('candidate-not-usable');
  if (!candidateDate) blockedBy.push('missing-candidate-date');
  if (candidateBranch !== 'create-by-selectedDate' && candidateBranch !== 'create-by-detected-date') {
    blockedBy.push('not-new-record-branch');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'draft-candidate-actual-injection',
    enabled: enabled,
    hasActiveContext: !!activeContext,
    didInject: false,
    canInject: blockedBy.length === 0,
    candidateDate: candidateDate,
    candidateSource: preview.draftCandidate?.source || 'none',
    candidateBranch: candidateBranch,
    candidateConfidence: preview.draftCandidate?.confidence || 'low',
    previousRecordDate: safeDraft?.record_date || '',
    previousId: safeDraft?.id || '',
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Mutates only the draft returned by buildDraftFromUI during an active save when every guard passes. Persist/sync paths remain unchanged.',
  };
}

function buildDraftPersistShadowCompare(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const injection = safeContext.dateDraftCandidateActualInjection
    || safeContext.meta?.dateDraftCandidateActualInjection
    || null;
  const blockedBy = [];
  const candidateDate = injection?.candidateDate || '';
  const didInject = injection?.didInject === true;
  let persistedRecord = null;
  let persistedDate = '';

  if (!injection) blockedBy.push('missing-actual-injection');
  if (!didInject) blockedBy.push('draft-not-injected');
  if (!candidateDate) blockedBy.push('missing-candidate-date');

  if (candidateDate) {
    persistedRecord = findRecordByDate(candidateDate);
    persistedDate = getRecordDate(persistedRecord);
    if (!persistedRecord) blockedBy.push('persisted-record-not-found');
    if (persistedRecord && persistedDate !== candidateDate) blockedBy.push('persisted-date-mismatch');
  }

  return {
    recordedAt: new Date().toISOString(),
    mode: 'draft-persist-shadow-compare',
    comparable: didInject && !!candidateDate,
    matched: didInject && !!candidateDate && !!persistedRecord && persistedDate === candidateDate,
    candidateDate: candidateDate,
    persistedDate: persistedDate,
    persistedRecordFound: !!persistedRecord,
    injection: injection,
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Compares the injected draft date with the record visible through record repository after save. It does not mutate records.',
  };
}

function buildLimitedDateAdoptionOutcome(context) {
  const safeContext = context || getLastRecordSaveContext() || {};
  const candidate = safeContext.limitedDateRealAdoptionCandidate
    || safeContext.meta?.limitedDateRealAdoptionCandidate
    || null;
  const injection = safeContext.dateDraftCandidateActualInjection
    || safeContext.meta?.dateDraftCandidateActualInjection
    || null;
  const shadowCompare = safeContext.dateDraftPersistShadowCompare
    || safeContext.meta?.dateDraftPersistShadowCompare
    || null;
  const blockedBy = [];

  if (!candidate) blockedBy.push('missing-candidate');
  if (candidate && candidate.canUseCandidate !== true) blockedBy.push('candidate-not-usable');
  if (!injection) blockedBy.push('missing-actual-injection');
  if (injection && injection.didInject !== true) blockedBy.push('draft-not-injected');
  if (!shadowCompare) blockedBy.push('missing-shadow-compare');
  if (shadowCompare && shadowCompare.comparable !== true) blockedBy.push('shadow-not-comparable');
  if (shadowCompare && shadowCompare.matched !== true) blockedBy.push('shadow-not-matched');

  const adopted = candidate?.canUseCandidate === true
    && injection?.didInject === true
    && shadowCompare?.matched === true;

  return {
    recordedAt: new Date().toISOString(),
    mode: 'limited-date-adoption-outcome',
    adopted: adopted,
    candidateDate: candidate?.candidateDate || injection?.candidateDate || shadowCompare?.candidateDate || '',
    persistedDate: shadowCompare?.persistedDate || '',
    candidateSource: candidate?.candidateSource || injection?.candidateSource || 'none',
    candidateBranch: candidate?.candidateBranch || injection?.candidateBranch || 'unknown',
    preflight: candidate?.preflight === true,
    didInject: injection?.didInject === true,
    shadowMatched: shadowCompare?.matched === true,
    blockedBy: Array.from(new Set(blockedBy)),
    note: 'Success means the limited candidate was injected into the draft and the persisted record matched the injected date. It is summary-only and does not mutate records.',
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

function summarizeActualDateDraftCandidateInjection(history) {
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
    activeContextCount: list.filter(function(item) { return item.hasActiveContext === true; }).length,
    injectableCount: list.filter(function(item) { return item.canInject === true; }).length,
    injectedCount: list.filter(function(item) { return item.didInject === true; }).length,
    blockedCount: list.filter(function(item) { return item.didInject !== true; }).length,
    blockedByCounts: blockedByCounts,
    branchCounts: branchCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function summarizeDraftPersistShadowCompare(history) {
  const list = Array.isArray(history) ? history : [];
  const blockedByCounts = {};

  list.forEach(function(item) {
    (item.blockedBy || []).forEach(function(reason) {
      blockedByCounts[reason] = (blockedByCounts[reason] || 0) + 1;
    });
  });

  return {
    count: list.length,
    comparableCount: list.filter(function(item) { return item.comparable === true; }).length,
    matchedCount: list.filter(function(item) { return item.matched === true; }).length,
    blockedCount: list.filter(function(item) { return item.matched !== true; }).length,
    blockedByCounts: blockedByCounts,
    recent: list.slice(-5),
  };
}

function summarizeLimitedDateAdoptionOutcome(history) {
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
    adoptedCount: list.filter(function(item) { return item.adopted === true; }).length,
    blockedCount: list.filter(function(item) { return item.adopted !== true; }).length,
    preflightCount: list.filter(function(item) { return item.preflight === true; }).length,
    injectedCount: list.filter(function(item) { return item.didInject === true; }).length,
    shadowMatchedCount: list.filter(function(item) { return item.shadowMatched === true; }).length,
    blockedByCounts: blockedByCounts,
    branchCounts: branchCounts,
    sourceCounts: sourceCounts,
    recent: list.slice(-5),
  };
}

function attachDraftCandidateToContext(saveContext, preview) {
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

  return summary;
}

function attachActualInjectionToContext(saveContext, injection) {
  const summary = summarizeActualDateDraftCandidateInjection(actualInjectionHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }

    saveContext.meta.dateDraftCandidateActualInjection = injection;
    saveContext.meta.dateDraftCandidateActualInjectionSummary = summary;
    saveContext.dateDraftCandidateActualInjection = injection;
    saveContext.dateDraftCandidateActualInjectionSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.dateDraftCandidateActualInjectionEnabled = injection.enabled === true;
      saveContext.healthSummary.dateDraftCandidateActualInjectionHasActiveContext = injection.hasActiveContext === true;
      saveContext.healthSummary.dateDraftCandidateActualInjectionDidInject = injection.didInject === true;
      saveContext.healthSummary.dateDraftCandidateActualInjectionBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function attachDraftPersistShadowCompareToContext(saveContext, compare) {
  const summary = summarizeDraftPersistShadowCompare(shadowCompareHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }

    saveContext.meta.dateDraftPersistShadowCompare = compare;
    saveContext.meta.dateDraftPersistShadowCompareSummary = summary;
    saveContext.dateDraftPersistShadowCompare = compare;
    saveContext.dateDraftPersistShadowCompareSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.dateDraftPersistShadowComparable = compare.comparable === true;
      saveContext.healthSummary.dateDraftPersistShadowMatched = compare.matched === true;
      saveContext.healthSummary.dateDraftPersistShadowBlockedCount = summary.blockedCount;
    }
  }

  return summary;
}

function attachLimitedDateAdoptionOutcomeToContext(saveContext, outcome) {
  const summary = summarizeLimitedDateAdoptionOutcome(adoptionOutcomeHistory);

  if (saveContext && typeof saveContext === 'object') {
    if (!saveContext.meta || typeof saveContext.meta !== 'object') {
      saveContext.meta = {};
    }

    saveContext.meta.limitedDateAdoptionOutcome = outcome;
    saveContext.meta.limitedDateAdoptionOutcomeSummary = summary;
    saveContext.limitedDateAdoptionOutcome = outcome;
    saveContext.limitedDateAdoptionOutcomeSummary = summary;

    if (saveContext.healthSummary && typeof saveContext.healthSummary === 'object') {
      saveContext.healthSummary.limitedDateAdoptionSucceeded = outcome.adopted === true;
      saveContext.healthSummary.limitedDateAdoptionBlockedCount = summary.blockedCount;
      saveContext.healthSummary.limitedDateAdoptionSuccessCount = summary.adoptedCount;
    }
  }

  return summary;
}

function recordDateDraftCandidate(context) {
  const saveContext = context || getLastRecordSaveContext();
  const preview = buildDateDraftCandidate(saveContext);

  draftCandidateHistory.push(preview);
  while (draftCandidateHistory.length > HISTORY_LIMIT) {
    draftCandidateHistory.shift();
  }

  attachDraftCandidateToContext(saveContext, preview);
  trace('draft-candidate:recorded', preview);
  return preview;
}

function recordActualDateDraftCandidateInjection(injection, context) {
  const saveContext = context || getActiveRecordSaveContext();
  actualInjectionHistory.push(injection);
  while (actualInjectionHistory.length > INJECTION_HISTORY_LIMIT) {
    actualInjectionHistory.shift();
  }

  attachActualInjectionToContext(saveContext, injection);
  trace('draft-candidate:actual-injection:recorded', injection);
  return injection;
}

function recordDraftPersistShadowCompare(context) {
  const saveContext = context || getLastRecordSaveContext();
  const compare = buildDraftPersistShadowCompare(saveContext);
  shadowCompareHistory.push(compare);
  while (shadowCompareHistory.length > SHADOW_COMPARE_HISTORY_LIMIT) {
    shadowCompareHistory.shift();
  }

  attachDraftPersistShadowCompareToContext(saveContext, compare);
  trace('draft-persist-shadow-compare:recorded', compare);
  return compare;
}

function recordLimitedDateAdoptionOutcome(context) {
  const saveContext = context || getLastRecordSaveContext();
  const outcome = buildLimitedDateAdoptionOutcome(saveContext);
  adoptionOutcomeHistory.push(outcome);
  while (adoptionOutcomeHistory.length > ADOPTION_OUTCOME_HISTORY_LIMIT) {
    adoptionOutcomeHistory.shift();
  }

  attachLimitedDateAdoptionOutcomeToContext(saveContext, outcome);
  trace('limited-date-adoption-outcome:recorded', outcome);
  return outcome;
}

function applyActualDateDraftCandidateInjection(draft, context) {
  const activeContext = context || getActiveRecordSaveContext();
  const injection = buildActualDateDraftCandidateInjection(draft, activeContext);

  if (injection.canInject === true) {
    draft.record_date = injection.candidateDate;
    draft.id = injection.candidateDate;
    injection.didInject = true;
    injection.injectedFields = ['record_date', 'id'];
  }

  recordActualDateDraftCandidateInjection(injection, activeContext);
  return draft;
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

function getActualDateDraftCandidateInjectionHistory() {
  return actualInjectionHistory.slice();
}

function getActualDateDraftCandidateInjectionSummary() {
  return summarizeActualDateDraftCandidateInjection(actualInjectionHistory);
}

function clearActualDateDraftCandidateInjectionHistory() {
  actualInjectionHistory.splice(0, actualInjectionHistory.length);
  return getActualDateDraftCandidateInjectionSummary();
}

function getDraftPersistShadowCompareHistory() {
  return shadowCompareHistory.slice();
}

function getDraftPersistShadowCompareSummary() {
  return summarizeDraftPersistShadowCompare(shadowCompareHistory);
}

function clearDraftPersistShadowCompareHistory() {
  shadowCompareHistory.splice(0, shadowCompareHistory.length);
  return getDraftPersistShadowCompareSummary();
}

function getLimitedDateAdoptionOutcomeHistory() {
  return adoptionOutcomeHistory.slice();
}

function getLimitedDateAdoptionOutcomeSummary() {
  return summarizeLimitedDateAdoptionOutcome(adoptionOutcomeHistory);
}

function clearLimitedDateAdoptionOutcomeHistory() {
  adoptionOutcomeHistory.splice(0, adoptionOutcomeHistory.length);
  return getLimitedDateAdoptionOutcomeSummary();
}

function wrapVerifyLastRecordSave() {
  const originalVerify = window.ippoVerifyLastRecordSave;
  if (typeof originalVerify !== 'function' || originalVerify.__ippoDateDraftCandidateObserved === true) return;

  window.ippoVerifyLastRecordSave = function dateDraftCandidateVerifyLastRecordSave() {
    const result = originalVerify.apply(this, arguments);
    const context = getLastRecordSaveContext();
    const preview = context?.dateDraftCandidate || context?.meta?.dateDraftCandidate || null;
    const summary = getDateDraftCandidateSummary();
    const actualInjection = context?.dateDraftCandidateActualInjection || context?.meta?.dateDraftCandidateActualInjection || null;
    const actualInjectionSummary = getActualDateDraftCandidateInjectionSummary();
    const shadowCompare = context?.dateDraftPersistShadowCompare || context?.meta?.dateDraftPersistShadowCompare || null;
    const shadowCompareSummary = getDraftPersistShadowCompareSummary();
    const adoptionOutcome = context?.limitedDateAdoptionOutcome || context?.meta?.limitedDateAdoptionOutcome || null;
    const adoptionOutcomeSummary = getLimitedDateAdoptionOutcomeSummary();

    if (result && typeof result === 'object') {
      result.dateDraftCandidate = preview;
      result.dateDraftCandidateSummary = summary;
      result.dateDraftCandidateActualInjection = actualInjection;
      result.dateDraftCandidateActualInjectionSummary = actualInjectionSummary;
      result.dateDraftPersistShadowCompare = shadowCompare;
      result.dateDraftPersistShadowCompareSummary = shadowCompareSummary;
      result.limitedDateAdoptionOutcome = adoptionOutcome;
      result.limitedDateAdoptionOutcomeSummary = adoptionOutcomeSummary;

      if (result.healthSummary && typeof result.healthSummary === 'object') {
        result.healthSummary.dateDraftCandidateInjectable = preview?.canInjectDraftCandidate === true;
        result.healthSummary.dateDraftCandidateBlockedCount = summary.blockedCount;
        result.healthSummary.dateDraftCandidateActualInjectionEnabled = actualInjection?.enabled === true;
        result.healthSummary.dateDraftCandidateActualInjectionHasActiveContext = actualInjection?.hasActiveContext === true;
        result.healthSummary.dateDraftCandidateActualInjectionDidInject = actualInjection?.didInject === true;
        result.healthSummary.dateDraftCandidateActualInjectionBlockedCount = actualInjectionSummary.blockedCount;
        result.healthSummary.dateDraftPersistShadowComparable = shadowCompare?.comparable === true;
        result.healthSummary.dateDraftPersistShadowMatched = shadowCompare?.matched === true;
        result.healthSummary.dateDraftPersistShadowBlockedCount = shadowCompareSummary.blockedCount;
        result.healthSummary.limitedDateAdoptionSucceeded = adoptionOutcome?.adopted === true;
        result.healthSummary.limitedDateAdoptionBlockedCount = adoptionOutcomeSummary.blockedCount;
        result.healthSummary.limitedDateAdoptionSuccessCount = adoptionOutcomeSummary.adoptedCount;
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

    const recordPostSaveObservations = function(value, shouldThrow) {
      const context = getLastRecordSaveContext();
      recordDateDraftCandidate(context);
      recordDraftPersistShadowCompare(context);
      recordLimitedDateAdoptionOutcome(context);
      if (shouldThrow) throw value;
      return value;
    };

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        return recordPostSaveObservations(value, false);
      }).catch(function(error) {
        return recordPostSaveObservations(error, true);
      });
    }

    return recordPostSaveObservations(result, false);
  }

  dateDraftCandidateSaveRecordScreen[WRAP_FLAG] = true;
  dateDraftCandidateSaveRecordScreen.__ippoOriginal = current;
  window.saveRecordScreen = dateDraftCandidateSaveRecordScreen;
  trace('saveRecordScreen:draft-candidate:installed');
  return true;
}

function wrapBuildDraftFromUI() {
  const current = window.buildDraftFromUI;
  if (typeof current !== 'function') return false;
  if (current[BUILD_DRAFT_WRAP_FLAG] === true) return true;

  function dateDraftCandidateBuildDraftFromUI() {
    const draft = current.apply(this, arguments);
    return applyActualDateDraftCandidateInjection(draft, getActiveRecordSaveContext());
  }

  dateDraftCandidateBuildDraftFromUI[BUILD_DRAFT_WRAP_FLAG] = true;
  dateDraftCandidateBuildDraftFromUI.__ippoOriginal = current;
  window.buildDraftFromUI = dateDraftCandidateBuildDraftFromUI;
  trace('buildDraftFromUI:draft-candidate-actual-injection:installed');
  return true;
}

function installDateDraftCandidate() {
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
  buildDateDraftCandidate,
  buildActualDateDraftCandidateInjection,
  buildDraftPersistShadowCompare,
  buildLimitedDateAdoptionOutcome,
  recordDateDraftCandidate,
  recordDraftPersistShadowCompare,
  recordLimitedDateAdoptionOutcome,
  applyActualDateDraftCandidateInjection,
  summarizeDateDraftCandidate,
  summarizeActualDateDraftCandidateInjection,
  summarizeDraftPersistShadowCompare,
  summarizeLimitedDateAdoptionOutcome,
  getDateDraftCandidateHistory,
  getDateDraftCandidateSummary,
  clearDateDraftCandidateHistory,
  getActualDateDraftCandidateInjectionHistory,
  getActualDateDraftCandidateInjectionSummary,
  clearActualDateDraftCandidateInjectionHistory,
  getDraftPersistShadowCompareHistory,
  getDraftPersistShadowCompareSummary,
  clearDraftPersistShadowCompareHistory,
  getLimitedDateAdoptionOutcomeHistory,
  getLimitedDateAdoptionOutcomeSummary,
  clearLimitedDateAdoptionOutcomeHistory,
  isDateDraftCandidateActualInjectionEnabled,
  setDateDraftCandidateActualInjectionEnabled,
  installDateDraftCandidate,
};

window.ippoRecordDateDraftCandidate = Object.freeze({
  buildDateDraftCandidate,
  buildActualDateDraftCandidateInjection,
  buildDraftPersistShadowCompare,
  buildLimitedDateAdoptionOutcome,
  recordDateDraftCandidate,
  recordDraftPersistShadowCompare,
  recordLimitedDateAdoptionOutcome,
  applyActualDateDraftCandidateInjection,
  summarizeDateDraftCandidate,
  summarizeActualDateDraftCandidateInjection,
  summarizeDraftPersistShadowCompare,
  summarizeLimitedDateAdoptionOutcome,
  getDateDraftCandidateHistory,
  getDateDraftCandidateSummary,
  clearDateDraftCandidateHistory,
  getActualDateDraftCandidateInjectionHistory,
  getActualDateDraftCandidateInjectionSummary,
  clearActualDateDraftCandidateInjectionHistory,
  getDraftPersistShadowCompareHistory,
  getDraftPersistShadowCompareSummary,
  clearDraftPersistShadowCompareHistory,
  getLimitedDateAdoptionOutcomeHistory,
  getLimitedDateAdoptionOutcomeSummary,
  clearLimitedDateAdoptionOutcomeHistory,
  isDateDraftCandidateActualInjectionEnabled,
  setDateDraftCandidateActualInjectionEnabled,
  installDateDraftCandidate,
});

window.ippoDateDraftCandidateHistory = getDateDraftCandidateHistory;
window.ippoDateDraftCandidateSummary = getDateDraftCandidateSummary;
window.ippoClearDateDraftCandidateHistory = clearDateDraftCandidateHistory;
window.ippoActualDateDraftCandidateInjectionHistory = getActualDateDraftCandidateInjectionHistory;
window.ippoActualDateDraftCandidateInjectionSummary = getActualDateDraftCandidateInjectionSummary;
window.ippoClearActualDateDraftCandidateInjectionHistory = clearActualDateDraftCandidateInjectionHistory;
window.ippoDraftPersistShadowCompareHistory = getDraftPersistShadowCompareHistory;
window.ippoDraftPersistShadowCompareSummary = getDraftPersistShadowCompareSummary;
window.ippoClearDraftPersistShadowCompareHistory = clearDraftPersistShadowCompareHistory;
window.ippoLimitedDateAdoptionOutcomeHistory = getLimitedDateAdoptionOutcomeHistory;
window.ippoLimitedDateAdoptionOutcomeSummary = getLimitedDateAdoptionOutcomeSummary;
window.ippoClearLimitedDateAdoptionOutcomeHistory = clearLimitedDateAdoptionOutcomeHistory;
window.ippoIsDateDraftCandidateActualInjectionEnabled = isDateDraftCandidateActualInjectionEnabled;
window.ippoSetDateDraftCandidateActualInjectionEnabled = setDateDraftCandidateActualInjectionEnabled;

installDateDraftCandidate();
