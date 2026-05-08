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
  return context.meta;
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

function recordNotifyResult(context, notifyResult) {
  const meta = ensureContextMeta(context);
  if (!meta) return;

  if (!Array.isArray(meta.notifyResults)) {
    meta.notifyResults = [];
  }

  meta.notifyResults.push({
    candidates: notifyResult.candidates || [],
    called: notifyResult.called || [],
    skipped: notifyResult.skipped || [],
    startedAt: notifyResult.startedAt,
    finishedAt: notifyResult.finishedAt,
  });
}

export function runRecordSaveAction(type, name, callback, options) {
  const label = String(type || 'action') + ':' + String(name || 'unknown');
  const startedAt = new Date().toISOString();
  const context = getActionContext(options);

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
        const finishedAt = new Date().toISOString();
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
        const failedAt = new Date().toISOString();
        const errorSummary = {
          message: error && error.message,
          name: error && error.name,
        };

        recordActionResult(context, {
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

    const finishedAt = new Date().toISOString();
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
    const failedAt = new Date().toISOString();
    const errorSummary = {
      message: error && error.message,
      name: error && error.name,
    };

    recordActionResult(context, {
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
    createdAt: new Date().toISOString(),
    beforeSnapshot: getRecordsSnapshot(),
    beforeDiagnostics: getRecordStorageDiagnostics(label ? label + ':before' : 'before'),
    actions: [],
    meta: {
      notifyResults: [],
    },
  };

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
  trace('persist:start', getRecordsSnapshot());

  try {
    const saveState = getCallable(options, 'saveState');
    if (typeof saveState === 'function') {
      return runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.PERSIST, 'saveState', function() {
        const result = saveState.apply((options && options.thisArg) || window, getCallArguments(options));
        trace('persist:saveState:done', getRecordsSnapshot());
        return result === undefined ? true : result;
      }, options);
    }
  } catch(error) {
    trace('persist:saveState:error', error && error.message);
    throw error;
  }

  return false;
}

export function syncRecordCloud(options) {
  trace('sync:start', getRecordsSnapshot());

  try {
    const cloudBackupAll = getCallable(options, 'cloudBackupAll');
    if (typeof cloudBackupAll === 'function') {
      return runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.SYNC, 'cloudBackupAll', function() {
        const result = cloudBackupAll.apply((options && options.thisArg) || window, getCallArguments(options));
        trace('sync:cloudBackupAll:called', getRecordsSnapshot());
        return result;
      }, options);
    }
  } catch(error) {
    trace('sync:cloudBackupAll:error', error && error.message);
    throw error;
  }

  return undefined;
}

export function getRecordSaveNotifyCandidates() {
  return RECORD_SAVE_NOTIFY_CANDIDATES.slice();
}

export function notifyRecordUpdated(options) {
  const startedAt = new Date().toISOString();
  const context = getActionContext(options);
  const renderCandidates = (options && Array.isArray(options.candidates) && options.candidates.length)
    ? options.candidates
    : getRecordSaveNotifyCandidates();

  const called = [];
  const skipped = [];

  renderCandidates.forEach(function(name) {
    try {
      const fn = options && options.functions && typeof options.functions[name] === 'function'
        ? options.functions[name]
        : window[name];

      if (typeof fn === 'function') {
        runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.NOTIFY, name, function() {
          return fn.apply((options && options.thisArg) || window, getCallArguments(options));
        }, options);
        called.push(name);
      } else {
        skipped.push({ name: name, reason: 'missing-function' });
      }
    } catch(error) {
      trace('notify:error:' + name, error && error.message);
      throw error;
    }
  });

  const notifyResult = {
    candidates: renderCandidates.slice(),
    called: called,
    skipped: skipped,
    startedAt: startedAt,
    finishedAt: new Date().toISOString(),
  };

  recordNotifyResult(context, notifyResult);
  trace('notify:done', notifyResult);
  return called;
}

export function finalizeRecordSaveContext(context, label) {
  const afterDiagnostics = getRecordStorageDiagnostics(label || context?.label || 'after');
  const notifyResults = Array.isArray(context?.meta?.notifyResults)
    ? context.meta.notifyResults
    : [];
  const result = {
    ...(context || {}),
    finalizedAt: new Date().toISOString(),
    afterSnapshot: getRecordsSnapshot(),
    afterDiagnostics: afterDiagnostics,
    activeRecordsLength: getRecords().length,
    actionCount: Array.isArray(context?.actions) ? context.actions.length : 0,
    actionSummary: Array.isArray(context?.actions)
      ? context.actions.reduce(function(summary, action) {
          const key = action.type || 'unknown';
          summary[key] = (summary[key] || 0) + 1;
          return summary;
        }, {})
      : {},
    notifySummary: {
      count: notifyResults.length,
      candidates: notifyResults.flatMap(function(item) { return item.candidates || []; }),
      called: notifyResults.flatMap(function(item) { return item.called || []; }),
      skipped: notifyResults.flatMap(function(item) { return item.skipped || []; }),
    },
  };

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
  const notifyCalled = notifyResults.flatMap(function(item) { return item.called || []; });
  const notifySkipped = notifyResults.flatMap(function(item) { return item.skipped || []; });

  const storageDiagnostics = getRecordStorageDiagnostics('verifyRecordSaveContext');
  const storageWarnings = Array.isArray(storageDiagnostics?.warnings)
    ? storageDiagnostics.warnings
    : [];
  const storageDrift = buildRecordStorageDrift(storageDiagnostics);

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
    notifyResults: notifyResults,
    notifyCalled: notifyCalled,
    notifySkipped: notifySkipped,
    notifySkippedCount: notifySkipped.length,
    storageDiagnostics: storageDiagnostics,
    storageWarningCount: storageWarnings.length,
    storageWarnings: storageWarnings,
    storageDrift: storageDrift,
    warnings: [],
  };

  result.warnings = buildRecordSaveVerificationWarnings(result);
  result.ok = result.hasContext && result.rejectedCount === 0 && result.warnings.length === 0;

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
