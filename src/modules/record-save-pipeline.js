// ============================================================
//  ippo – src/modules/record-save-pipeline.js
//  Phase 3-F-5: save orchestration helpers
//
//  目的:
//  - saveRecordScreen の将来分離に向けて保存パイプラインを定義する
//  - 既存 saveRecordScreen / Supabase / localStorage 書き込みは変更しない
//  - このファイルは補助関数のみを提供する
// ============================================================

import {
  getRecords,
  getRecordsSnapshot,
  getRecordStorageDiagnostics,
  logRecordStorageDiagnostics,
} from './record-repository.js';

import {
  upsertRecord,
  upsertRecordInPlace,
} from './record-upsert.js';

export const RECORD_SAVE_ACTION_TYPES = Object.freeze({
  PERSIST: 'persist',
  SYNC: 'sync',
  NOTIFY: 'notify',
});

export const RECORD_SAVE_NOTIFY_CANDIDATES = Object.freeze([
  'buildCalendar',
  'renderCalendar',
  'renderHome',
  'updateHome',
  'updateStats',
]);

function trace(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:record-save-pipeline]', label, detail || '');
    }
  } catch(e) {}
}

function traceCalendarNotification(phase, detail) {
  try {
    if (typeof window.ippoMarkCalendarReflectionPhase === 'function') {
      window.ippoMarkCalendarReflectionPhase(phase, {
        source: 'record-save-pipeline',
        detail: detail || null,
      });
    }
  } catch(e) {}
}

function traceSaveNotification(phase, detail) {
  try {
    if (typeof window.ippoMarkRecordSavePhase === 'function') {
      window.ippoMarkRecordSavePhase(phase, {
        detail: detail || null,
      });
    }
  } catch(e) {}
}

function getCallable(options, name) {
  if (options && typeof options[name] === 'function') {
    return options[name];
  }
  return window[name];
}

function getCallArguments(options, fallbackArguments) {
  if (options && options.arguments) {
    return Array.prototype.slice.call(options.arguments);
  }
  if (fallbackArguments) {
    return Array.prototype.slice.call(fallbackArguments);
  }
  return [];
}

function getActionContext(options) {
  if (options && options.context && Array.isArray(options.context.actions)) {
    return options.context;
  }
  return null;
}

function ensureContextMeta(context) {
  if (!context || typeof context !== 'object') return null;
  if (!context.meta || typeof context.meta !== 'object') {
    context.meta = {};
  }
  if (!Array.isArray(context.meta.notifyResults)) {
    context.meta.notifyResults = [];
  }
  if (!Array.isArray(context.meta.persistResults)) {
    context.meta.persistResults = [];
  }
  if (!Array.isArray(context.meta.syncResults)) {
    context.meta.syncResults = [];
  }
  if (!Array.isArray(context.meta.timeline)) {
    context.meta.timeline = [];
  }
  return context.meta;
}

function getTimestamp() {
  return new Date().toISOString();
}

function getNowMs() {
  try {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch(e) {}
  return Date.now();
}

function getDurationMs(startedMs) {
  if (typeof startedMs !== 'number') return null;
  return Math.max(0, Math.round((getNowMs() - startedMs) * 100) / 100);
}

function recordTimelineEvent(context, phase, detail) {
  const meta = ensureContextMeta(context);
  if (!meta) return;

  meta.timeline.push({
    phase: phase,
    at: getTimestamp(),
    detail: detail || {},
  });
}

function summarizeActionValue(value) {
  if (value === undefined) return { type: 'undefined' };
  if (value === null) return { type: 'null' };
  if (typeof value === 'boolean') return { type: 'boolean', value: value };
  if (typeof value === 'number') return { type: 'number', value: value };
  if (typeof value === 'string') return { type: 'string', length: value.length };
  if (Array.isArray(value)) return { type: 'array', length: value.length };
  if (typeof value === 'object') return { type: 'object', keys: Object.keys(value).slice(0, 12) };
  return { type: typeof value };
}

function summarizeError(error) {
  return {
    message: error && error.message,
    name: error && error.name,
  };
}

function recordActionResult(context, action) {
  if (!context || !Array.isArray(context.actions)) return;

  context.actions.push({
    type: action.type,
    name: action.name,
    status: action.status,
    async: action.async === true,
    startedAt: action.startedAt,
    finishedAt: action.finishedAt,
    failedAt: action.failedAt,
    result: action.result,
    error: action.error,
  });
}

function recordPhaseResult(context, bucketName, result) {
  const meta = ensureContextMeta(context);
  if (!meta || !Array.isArray(meta[bucketName])) return;

  meta[bucketName].push({
    name: result.name,
    status: result.status,
    called: result.called === true,
    skipped: result.skipped === true,
    async: result.async === true,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    failedAt: result.failedAt,
    durationMs: result.durationMs,
    result: result.result,
    error: result.error,
    reason: result.reason,
  });
}

function observePhaseResult(context, bucketName, phaseName, actionName, result, startedAt, startedMs) {
  const finishFulfilled = function(value, async) {
    const finishedAt = getTimestamp();
    const phaseResult = {
      name: actionName,
      status: 'fulfilled',
      called: true,
      async: async === true,
      startedAt: startedAt,
      finishedAt: finishedAt,
      durationMs: getDurationMs(startedMs),
      result: summarizeActionValue(value),
    };
    recordPhaseResult(context, bucketName, phaseResult);
    recordTimelineEvent(context, phaseName + ':done', phaseResult);
    return value;
  };

  const finishRejected = function(error, async) {
    const failedAt = getTimestamp();
    const phaseResult = {
      name: actionName,
      status: 'rejected',
      called: true,
      async: async === true,
      startedAt: startedAt,
      failedAt: failedAt,
      durationMs: getDurationMs(startedMs),
      error: summarizeError(error),
    };
    recordPhaseResult(context, bucketName, phaseResult);
    recordTimelineEvent(context, phaseName + ':error', phaseResult);
    throw error;
  };

  if (result && typeof result.then === 'function') {
    return result.then(function(value) {
      return finishFulfilled(value, true);
    }).catch(function(error) {
      return finishRejected(error, true);
    });
  }

  return finishFulfilled(result, false);
}

function recordSkippedPhase(context, bucketName, phaseName, actionName, reason, startedAt, startedMs) {
  const phaseResult = {
    name: actionName,
    status: 'skipped',
    called: false,
    skipped: true,
    async: false,
    startedAt: startedAt,
    finishedAt: getTimestamp(),
    durationMs: getDurationMs(startedMs),
    reason: reason,
  };

  recordPhaseResult(context, bucketName, phaseResult);
  recordTimelineEvent(context, phaseName + ':skipped', phaseResult);
}

function recordNotifyResult(context, notifyResult) {
  const meta = ensureContextMeta(context);
  if (!meta) return;

  meta.notifyResults.push({
    candidates: notifyResult.candidates || [],
    called: notifyResult.called || [],
    skipped: notifyResult.skipped || [],
    startedAt: notifyResult.startedAt,
    finishedAt: notifyResult.finishedAt,
    durationMs: notifyResult.durationMs,
  });
}

function buildPhaseSummary(results) {
  const list = Array.isArray(results) ? results : [];
  return {
    count: list.length,
    called: list.filter(function(item) { return item && item.called === true; }).map(function(item) { return item.name; }),
    skipped: list.filter(function(item) { return item && item.skipped === true; }),
    fulfilled: list.filter(function(item) { return item && item.status === 'fulfilled'; }).map(function(item) { return item.name; }),
    rejected: list.filter(function(item) { return item && item.status === 'rejected'; }).map(function(item) { return item.name; }),
    durationMs: list.reduce(function(total, item) {
      return total + (typeof item?.durationMs === 'number' ? item.durationMs : 0);
    }, 0),
  };
}

function buildNotifySummary(notifyResults) {
  const list = Array.isArray(notifyResults) ? notifyResults : [];
  return {
    count: list.length,
    candidates: list.flatMap(function(item) { return item.candidates || []; }),
    called: list.flatMap(function(item) { return item.called || []; }),
    skipped: list.flatMap(function(item) { return item.skipped || []; }),
    durationMs: list.reduce(function(total, item) {
      return total + (typeof item?.durationMs === 'number' ? item.durationMs : 0);
    }, 0),
  };
}

function buildHealthSummary(data) {
  const actions = Array.isArray(data?.actions) ? data.actions : [];
  const persistResults = Array.isArray(data?.persistResults) ? data.persistResults : [];
  const syncResults = Array.isArray(data?.syncResults) ? data.syncResults : [];
  const notifyResults = Array.isArray(data?.notifyResults) ? data.notifyResults : [];
  const storageWarnings = Array.isArray(data?.storageWarnings) ? data.storageWarnings : [];
  const rejectedCount = actions.filter(function(action) { return action && action.status === 'rejected'; }).length;
  const notifySkippedCount = notifyResults.flatMap(function(item) { return item.skipped || []; }).length;

  const healthSummary = {
    ok: false,
    actionCount: actions.length,
    persistCount: persistResults.filter(function(item) { return item && item.called === true; }).length,
    syncCount: syncResults.filter(function(item) { return item && item.called === true; }).length,
    notifyCount: notifyResults.flatMap(function(item) { return item.called || []; }).length,
    rejectedCount: rejectedCount,
    storageWarningCount: storageWarnings.length,
    notifySkippedCount: notifySkippedCount,
  };

  healthSummary.ok = healthSummary.rejectedCount === 0
    && healthSummary.storageWarningCount === 0
    && healthSummary.notifySkippedCount === 0;

  return healthSummary;
}

export function runRecordSaveAction(type, name, callback, options) {
  const label = String(type || 'action') + ':' + String(name || 'unknown');
  const startedAt = getTimestamp();
  const context = getActionContext(options);

  recordTimelineEvent(context, 'action:start', {
    type: type,
    name: name,
    startedAt: startedAt,
  });

  trace('action:start:' + label, {
    type: type,
    name: name,
    startedAt: startedAt,
    snapshot: getRecordsSnapshot(),
  });

  try {
    const result = callback();

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        const finishedAt = getTimestamp();
        const summary = summarizeActionValue(value);

        recordActionResult(context, {
          type: type,
          name: name,
          status: 'fulfilled',
          async: true,
          startedAt: startedAt,
          finishedAt: finishedAt,
          result: summary,
        });
        recordTimelineEvent(context, 'action:done', {
          type: type,
          name: name,
          status: 'fulfilled',
          async: true,
          startedAt: startedAt,
          finishedAt: finishedAt,
          result: summary,
        });

        trace('action:done:' + label, {
          type: type,
          name: name,
          async: true,
          startedAt: startedAt,
          finishedAt: finishedAt,
          result: summary,
          snapshot: getRecordsSnapshot(),
        });
        return value;
      }).catch(function(error) {
        const failedAt = getTimestamp();
        const errorSummary = summarizeError(error);

        recordActionResult(context, {
          type: type,
          name: name,
          status: 'rejected',
          async: true,
          startedAt: startedAt,
          failedAt: failedAt,
          error: errorSummary,
        });
        recordTimelineEvent(context, 'action:error', {
          type: type,
          name: name,
          status: 'rejected',
          async: true,
          startedAt: startedAt,
          failedAt: failedAt,
          error: errorSummary,
        });

        trace('action:error:' + label, {
          type: type,
          name: name,
          async: true,
          startedAt: startedAt,
          failedAt: failedAt,
          message: error && error.message,
        });
        throw error;
      });
    }

    const finishedAt = getTimestamp();
    const summary = summarizeActionValue(result);

    recordActionResult(context, {
      type: type,
      name: name,
      status: 'fulfilled',
      async: false,
      startedAt: startedAt,
      finishedAt: finishedAt,
      result: summary,
    });
    recordTimelineEvent(context, 'action:done', {
      type: type,
      name: name,
      status: 'fulfilled',
      async: false,
      startedAt: startedAt,
      finishedAt: finishedAt,
      result: summary,
    });

    trace('action:done:' + label, {
      type: type,
      name: name,
      async: false,
      startedAt: startedAt,
      finishedAt: finishedAt,
      result: summary,
      snapshot: getRecordsSnapshot(),
    });

    return result;
  } catch(error) {
    const failedAt = getTimestamp();
    const errorSummary = summarizeError(error);

    recordActionResult(context, {
      type: type,
      name: name,
      status: 'rejected',
      async: false,
      startedAt: startedAt,
      failedAt: failedAt,
      error: errorSummary,
    });
    recordTimelineEvent(context, 'action:error', {
      type: type,
      name: name,
      status: 'rejected',
      async: false,
      startedAt: startedAt,
      failedAt: failedAt,
      error: errorSummary,
    });

    trace('action:error:' + label, {
      type: type,
      name: name,
      async: false,
      startedAt: startedAt,
      failedAt: failedAt,
      message: error && error.message,
    });
    throw error;
  }
}

export function createRecordSaveContext(label) {
  const context = {
    label: label || '',
    createdAt: getTimestamp(),
    beforeSnapshot: getRecordsSnapshot(),
    beforeDiagnostics: getRecordStorageDiagnostics(label ? label + ':before' : 'before'),
    actions: [],
    meta: {
      notifyResults: [],
      persistResults: [],
      syncResults: [],
      timeline: [],
    },
  };

  recordTimelineEvent(context, 'context:create', {
    label: context.label,
    createdAt: context.createdAt,
  });
  trace('context:create', context);
  return context;
}

export function prepareRecordUpsert(records, nextRecord, options) {
  const result = upsertRecord(records, nextRecord, options);
  trace('prepare-upsert', {
    mode: result.mode,
    changed: result.changed,
    index: result.index,
    reason: result.reason,
  });
  return result;
}

export function prepareRecordUpsertInPlace(records, nextRecord, options) {
  const result = upsertRecordInPlace(records, nextRecord, options);
  trace('prepare-upsert-in-place', {
    mode: result.mode,
    changed: result.changed,
    index: result.index,
    reason: result.reason,
  });
  return result;
}

export function persistRecordState(options) {
  const context = getActionContext(options);
  const startedAt = getTimestamp();
  const startedMs = getNowMs();

  recordTimelineEvent(context, 'persist:start', { name: 'saveState', startedAt: startedAt });
  trace('persist:start', getRecordsSnapshot());

  try {
    const saveState = getCallable(options, 'saveState');
    if (typeof saveState === 'function') {
      const result = runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.PERSIST, 'saveState', function() {
        const value = saveState.apply((options && options.thisArg) || window, getCallArguments(options));
        trace('persist:saveState:done', getRecordsSnapshot());
        return value === undefined ? true : value;
      }, options);

      return observePhaseResult(context, 'persistResults', 'persist', 'saveState', result, startedAt, startedMs);
    }
  } catch(error) {
    trace('persist:saveState:error', error && error.message);
    throw error;
  }

  recordSkippedPhase(context, 'persistResults', 'persist', 'saveState', 'missing-function', startedAt, startedMs);
  return false;
}

export function syncRecordCloud(options) {
  const context = getActionContext(options);
  const startedAt = getTimestamp();
  const startedMs = getNowMs();

  recordTimelineEvent(context, 'sync:start', { name: 'cloudBackupAll', startedAt: startedAt });
  trace('sync:start', getRecordsSnapshot());

  try {
    const cloudBackupAll = getCallable(options, 'cloudBackupAll');
    if (typeof cloudBackupAll === 'function') {
      const result = runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.SYNC, 'cloudBackupAll', function() {
        const value = cloudBackupAll.apply((options && options.thisArg) || window, getCallArguments(options));
        trace('sync:cloudBackupAll:called', getRecordsSnapshot());
        return value;
      }, options);

      return observePhaseResult(context, 'syncResults', 'sync', 'cloudBackupAll', result, startedAt, startedMs);
    }
  } catch(error) {
    trace('sync:cloudBackupAll:error', error && error.message);
    throw error;
  }

  recordSkippedPhase(context, 'syncResults', 'sync', 'cloudBackupAll', 'missing-function', startedAt, startedMs);
  return undefined;
}

export function getRecordSaveNotifyCandidates() {
  return RECORD_SAVE_NOTIFY_CANDIDATES.slice();
}

export function notifyRecordUpdated(options) {
  const startedAt = getTimestamp();
  const startedMs = getNowMs();
  const context = getActionContext(options);
  const renderCandidates = (options && Array.isArray(options.candidates) && options.candidates.length)
    ? options.candidates
    : getRecordSaveNotifyCandidates();

  const called = [];
  const skipped = [];

  recordTimelineEvent(context, 'notify:start', {
    candidates: renderCandidates.slice(),
    startedAt: startedAt,
  });
  traceSaveNotification('notify-start', {
    candidates: renderCandidates.slice(),
    snapshot: getRecordsSnapshot(),
  });
  traceCalendarNotification('calendar-notify-start', {
    candidates: renderCandidates.filter(function(name) {
      return /calendar/i.test(name);
    }),
    snapshot: getRecordsSnapshot(),
  });

  renderCandidates.forEach(function(name) {
    try {
      const fn = options && options.functions && typeof options.functions[name] === 'function'
        ? options.functions[name]
        : window[name];

      if (typeof fn === 'function') {
        if (/calendar/i.test(name)) {
          traceCalendarNotification('calendar-notify-call', {
            name: name,
            snapshot: getRecordsSnapshot(),
          });
        }

        runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.NOTIFY, name, function() {
          return fn.apply((options && options.thisArg) || window, getCallArguments(options));
        }, options);
        called.push(name);

        if (/calendar/i.test(name)) {
          traceCalendarNotification('calendar-notify-called', {
            name: name,
            snapshot: getRecordsSnapshot(),
          });
        }
      } else {
        const skippedItem = { name: name, reason: 'missing-function' };
        skipped.push(skippedItem);

        if (/calendar/i.test(name)) {
          traceCalendarNotification('calendar-notify-skipped', skippedItem);
        }
      }
    } catch(error) {
      trace('notify:error:' + name, error && error.message);
      if (/calendar/i.test(name)) {
        traceCalendarNotification('calendar-notify-error', {
          name: name,
          error: summarizeError(error),
        });
      }
      recordTimelineEvent(context, 'notify:error', {
        name: name,
        error: summarizeError(error),
      });
      throw error;
    }
  });

  const notifyResult = {
    candidates: renderCandidates.slice(),
    called: called,
    skipped: skipped,
    startedAt: startedAt,
    finishedAt: getTimestamp(),
    durationMs: getDurationMs(startedMs),
  };

  recordNotifyResult(context, notifyResult);
  recordTimelineEvent(context, 'notify:done', notifyResult);
  traceSaveNotification('notify-done', notifyResult);
  traceCalendarNotification('calendar-notify-done', {
    called: called.filter(function(name) { return /calendar/i.test(name); }),
    skipped: skipped.filter(function(item) { return item && /calendar/i.test(item.name); }),
    snapshot: getRecordsSnapshot(),
  });
  trace('notify:done', notifyResult);
  return called;
}

export function finalizeRecordSaveContext(context, label) {
  const afterDiagnostics = getRecordStorageDiagnostics(label || context?.label || 'after');
  const notifyResults = Array.isArray(context?.meta?.notifyResults)
    ? context.meta.notifyResults
    : [];
  const persistResults = Array.isArray(context?.meta?.persistResults)
    ? context.meta.persistResults
    : [];
  const syncResults = Array.isArray(context?.meta?.syncResults)
    ? context.meta.syncResults
    : [];
  const timeline = Array.isArray(context?.meta?.timeline)
    ? context.meta.timeline
    : [];
  const actions = Array.isArray(context?.actions) ? context.actions : [];
  const storageWarnings = Array.isArray(afterDiagnostics?.warnings) ? afterDiagnostics.warnings : [];

  recordTimelineEvent(context, 'context:finalize', {
    label: label || context?.label || 'after',
    actionCount: actions.length,
  });

  const result = {
    ...(context || {}),
    finalizedAt: getTimestamp(),
    afterSnapshot: getRecordsSnapshot(),
    afterDiagnostics: afterDiagnostics,
    activeRecordsLength: getRecords().length,
    actionCount: actions.length,
    actionSummary: actions.reduce(function(summary, action) {
      const key = action.type || 'unknown';
      summary[key] = (summary[key] || 0) + 1;
      return summary;
    }, {}),
    actionTimeline: timeline.slice(),
    persistSummary: buildPhaseSummary(persistResults),
    syncSummary: buildPhaseSummary(syncResults),
    notifySummary: buildNotifySummary(notifyResults),
  };

  result.healthSummary = buildHealthSummary({
    actions: actions,
    persistResults: persistResults,
    syncResults: syncResults,
    notifyResults: notifyResults,
    storageWarnings: storageWarnings,
  });

  trace('context:finalize', result);
  return result;
}

function buildRecordStorageDrift(storageDiagnostics) {
  const summaries = storageDiagnostics?.summaries || {};
  const consistency = storageDiagnostics?.consistency || {};

  const state = summaries.state || {};
  const ippoState = summaries.ippoState || {};
  const kkRecords = summaries.kkRecords || {};
  const legacyRecords = summaries.legacyRecords || {};

  return {
    hasWarnings: Array.isArray(storageDiagnostics?.warnings) && storageDiagnostics.warnings.length > 0,
    lengthDrift: {
      stateVsIppoState: state.length !== ippoState.length,
      stateVsKkRecords: kkRecords.length > 0 && state.length !== kkRecords.length,
      stateVsLegacyRecords: legacyRecords.length > 0 && state.length !== legacyRecords.length,
    },
    hashDrift: {
      stateVsIppoState: consistency.stateMatchesIppoState === false,
      stateVsKkRecords: kkRecords.length > 0 && consistency.stateMatchesKkRecords === false,
      ippoStateVsKkRecords: kkRecords.length > 0 && consistency.ippoStateMatchesKkRecords === false,
      stateVsLegacyRecords: legacyRecords.length > 0 && consistency.legacyRecordsMatchesState === false,
    },
    lengths: {
      state: state.length || 0,
      ippoState: ippoState.length || 0,
      kkRecords: kkRecords.length || 0,
      legacyRecords: legacyRecords.length || 0,
    },
    hashes: {
      state: state.hash || '',
      ippoState: ippoState.hash || '',
      kkRecords: kkRecords.hash || '',
      legacyRecords: legacyRecords.hash || '',
    },
  };
}

function buildRecordSaveVerificationWarnings(result) {
  const warnings = [];

  if (!result.hasContext) {
    warnings.push('missing-context');
  }
  if (result.rejectedCount > 0) {
    warnings.push('rejected-actions');
  }
  if (!result.hasPersist) {
    warnings.push('missing-persist');
  }
  if (!result.hasSync) {
    warnings.push('missing-sync');
  }
  if (result.syncSkippedCount > 0) {
    warnings.push('missing-cloudBackupAll');
  }
  if (!result.hasNotify) {
    warnings.push('missing-notify');
  }
  if (result.actionCount === 0) {
    warnings.push('no-actions-recorded');
  }
  if (result.notifySkippedCount > 0) {
    warnings.push('notify-skipped');
  }
  if (result.storageWarningCount > 0) {
    warnings.push('storage-diagnostics-warnings');
  }

  return warnings;
}

export function verifyRecordSaveContext(context) {
  const actions = Array.isArray(context?.actions) ? context.actions : [];
  const rejected = actions.filter(function(action) {
    return action && action.status === 'rejected';
  });

  const summary = actions.reduce(function(result, action) {
    const type = action && action.type ? action.type : 'unknown';
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});

  const notifyResults = Array.isArray(context?.meta?.notifyResults)
    ? context.meta.notifyResults
    : [];
  const persistResults = Array.isArray(context?.meta?.persistResults)
    ? context.meta.persistResults
    : [];
  const syncResults = Array.isArray(context?.meta?.syncResults)
    ? context.meta.syncResults
    : [];
  const actionTimeline = Array.isArray(context?.meta?.timeline)
    ? context.meta.timeline
    : [];
  const notifyCalled = notifyResults.flatMap(function(item) { return item.called || []; });
  const notifySkipped = notifyResults.flatMap(function(item) { return item.skipped || []; });
  const syncSkipped = syncResults.filter(function(item) { return item && item.skipped === true; });

  const storageDiagnostics = getRecordStorageDiagnostics('verifyRecordSaveContext');
  const storageWarnings = Array.isArray(storageDiagnostics?.warnings)
    ? storageDiagnostics.warnings
    : [];
  const storageDrift = buildRecordStorageDrift(storageDiagnostics);
  const healthSummary = buildHealthSummary({
    actions: actions,
    persistResults: persistResults,
    syncResults: syncResults,
    notifyResults: notifyResults,
    storageWarnings: storageWarnings,
  });

  const result = {
    ok: false,
    hasContext: !!context,
    label: context?.label || null,
    finalizedAt: context?.finalizedAt || null,
    actionCount: actions.length,
    actionSummary: summary,
    rejectedCount: rejected.length,
    rejectedActions: rejected.map(function(action) {
      return {
        type: action.type,
        name: action.name,
        error: action.error,
      };
    }),
    hasPersist: !!summary.persist,
    hasSync: !!summary.sync,
    hasNotify: !!summary.notify,
    persistResults: persistResults,
    persistStatus: buildPhaseSummary(persistResults),
    syncResults: syncResults,
    syncStatus: buildPhaseSummary(syncResults),
    syncSkippedCount: syncSkipped.length,
    notifyResults: notifyResults,
    notifyCalled: notifyCalled,
    notifySkipped: notifySkipped,
    notifySkippedCount: notifySkipped.length,
    actionTimeline: actionTimeline,
    healthSummary: healthSummary,
    storageDiagnostics: storageDiagnostics,
    storageWarningCount: storageWarnings.length,
    storageWarnings: storageWarnings,
    storageDrift: storageDrift,
    warnings: [],
  };

  result.warnings = buildRecordSaveVerificationWarnings(result);
  result.ok = result.hasContext && result.rejectedCount === 0 && result.warnings.length === 0;
  result.healthSummary.ok = result.ok;

  trace('context:verify', result);
  return result;
}

export function debugRecordSavePipeline(label) {
  const context = createRecordSaveContext(label || 'manual');
  const diagnostics = logRecordStorageDiagnostics(label || 'manual');
  return {
    context: context,
    diagnostics: diagnostics,
  };
}

window.ippoRecordSavePipeline = Object.freeze({
  RECORD_SAVE_ACTION_TYPES,
  RECORD_SAVE_NOTIFY_CANDIDATES,
  createRecordSaveContext,
  runRecordSaveAction,
  prepareRecordUpsert,
  prepareRecordUpsertInPlace,
  persistRecordState,
  syncRecordCloud,
  getRecordSaveNotifyCandidates,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  verifyRecordSaveContext,
  debugRecordSavePipeline,
});

window.ippoDebugRecordSavePipeline = debugRecordSavePipeline;
