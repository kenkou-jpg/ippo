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

export function runRecordSaveAction(type, name, callback, options) {
  const label = String(type || 'action') + ':' + String(name || 'unknown');
  const startedAt = new Date().toISOString();

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
        trace('action:done:' + label, {
          type: type,
          name: name,
          async: true,
          startedAt: startedAt,
          finishedAt: new Date().toISOString(),
          snapshot: getRecordsSnapshot(),
        });
        return value;
      }).catch(function(error) {
        trace('action:error:' + label, {
          type: type,
          name: name,
          async: true,
          startedAt: startedAt,
          failedAt: new Date().toISOString(),
          message: error && error.message,
        });
        throw error;
      });
    }

    trace('action:done:' + label, {
      type: type,
      name: name,
      async: false,
      startedAt: startedAt,
      finishedAt: new Date().toISOString(),
      snapshot: getRecordsSnapshot(),
    });

    return result;
  } catch(error) {
    trace('action:error:' + label, {
      type: type,
      name: name,
      async: false,
      startedAt: startedAt,
      failedAt: new Date().toISOString(),
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
      });
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
      });
    }
  } catch(error) {
    trace('sync:cloudBackupAll:error', error && error.message);
    throw error;
  }

  return undefined;
}

export function notifyRecordUpdated(options) {
  const defaultCandidates = [
    'buildCalendar',
    'renderCalendar',
    'renderHome',
    'updateHome',
    'updateStats',
  ];

  const renderCandidates = (options && Array.isArray(options.candidates) && options.candidates.length)
    ? options.candidates
    : defaultCandidates;

  const called = [];

  renderCandidates.forEach(function(name) {
    try {
      const fn = options && options.functions && typeof options.functions[name] === 'function'
        ? options.functions[name]
        : window[name];

      if (typeof fn === 'function') {
        runRecordSaveAction(RECORD_SAVE_ACTION_TYPES.NOTIFY, name, function() {
          return fn.apply((options && options.thisArg) || window, getCallArguments(options));
        });
        called.push(name);
      }
    } catch(error) {
      trace('notify:error:' + name, error && error.message);
      throw error;
    }
  });

  trace('notify:done', { called: called });
  return called;
}

export function finalizeRecordSaveContext(context, label) {
  const afterDiagnostics = getRecordStorageDiagnostics(label || context?.label || 'after');
  const result = {
    ...(context || {}),
    finalizedAt: new Date().toISOString(),
    afterSnapshot: getRecordsSnapshot(),
    afterDiagnostics: afterDiagnostics,
    activeRecordsLength: getRecords().length,
  };

  trace('context:finalize', result);
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
  createRecordSaveContext,
  runRecordSaveAction,
  prepareRecordUpsert,
  prepareRecordUpsertInPlace,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  debugRecordSavePipeline,
});

window.ippoDebugRecordSavePipeline = debugRecordSavePipeline;
