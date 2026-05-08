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

function trace(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:record-save-pipeline]', label, detail || '');
    }
  } catch(e) {}
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

export function persistRecordState() {
  trace('persist:start', getRecordsSnapshot());

  try {
    if (typeof window.saveState === 'function') {
      window.saveState();
      trace('persist:saveState:done', getRecordsSnapshot());
      return true;
    }
  } catch(error) {
    trace('persist:saveState:error', error && error.message);
  }

  return false;
}

export function syncRecordCloud() {
  trace('sync:start', getRecordsSnapshot());

  try {
    if (typeof window.cloudBackupAll === 'function') {
      const result = window.cloudBackupAll();
      trace('sync:cloudBackupAll:called', getRecordsSnapshot());
      return result;
    }
  } catch(error) {
    trace('sync:cloudBackupAll:error', error && error.message);
  }

  return undefined;
}

export function notifyRecordUpdated() {
  const renderCandidates = [
    'buildCalendar',
    'renderCalendar',
    'renderHome',
    'updateHome',
    'updateStats',
  ];

  const called = [];

  renderCandidates.forEach(function(name) {
    try {
      if (typeof window[name] === 'function') {
        window[name]();
        called.push(name);
      }
    } catch(error) {
      trace('notify:error:' + name, error && error.message);
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
  createRecordSaveContext,
  prepareRecordUpsert,
  prepareRecordUpsertInPlace,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  debugRecordSavePipeline,
});

window.ippoDebugRecordSavePipeline = debugRecordSavePipeline;
