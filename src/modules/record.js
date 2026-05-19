// ============================================================
//  ippo – src/modules/record.js
//  Phase 3-C: record モジュール分離 / 接続復旧
//  Phase 3-D-0: saveRecord runtime trace
//  Phase 3-D-2: saveRecordScreen runtime trace
//  Phase 3-N-2: thin orchestrator facade 接続
//
//  方針:
//  - saveRecord / saveRecordScreen の既存ロジックは変更しない
//  - このファイルでは移行期間用の window 互換を提供する
//  - 旧インライン onclick から参照される関数名を維持する
//  - trace は console 出力のみで保存処理へ介入しない
// ============================================================

import {
  createRecordSaveContext,
  persistRecordState,
  syncRecordCloud,
  notifyRecordUpdated,
  finalizeRecordSaveContext,
  verifyRecordSaveContext,
  getRecordSaveNotifyCandidates,
} from './record/save.js';
import { switchTab } from './tab-navigation.js';


let lastRecordSaveContext = null;
let activeRecordSaveContext = null;

function isRecordTraceEnabled() {
  try {
    return localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true;
  } catch(e) {
    return window.__IPPO_DEBUG_RECORD__ === true;
  }
}

function traceRecord(label, detail) {
  if (!isRecordTraceEnabled()) return;
  try {
    console.debug('[ippo:record]', label, detail || '');
  } catch(e) {}
}

function getRecordTraceSnapshot() {
  const state = (typeof window.getState === 'function' ? window.getState() : null) || {};
  let ippoState = null;

  try { ippoState = localStorage.getItem('ippo_state'); } catch(e) {}

  return {
    hasWindowState: typeof window.getState === 'function' && !!window.getState(),
    stateRecordsLength: Array.isArray(state.records) ? state.records.length : null,
    hasWindowSupabase: !!window.supabase,
    ippoStateLength: ippoState ? ippoState.length : 0,
  };
}

function callExistingFunction(name, args) {
  const fn = window[name];
  if (typeof fn === 'function' && fn !== exportedFunctions[name]) {
    traceRecord(name + ':delegate:start', getRecordTraceSnapshot());
    const result = fn.apply(window, args || []);
    traceRecord(name + ':delegate:end', getRecordTraceSnapshot());
    return result;
  }

  traceRecord(name + ':delegate:missing', getRecordTraceSnapshot());
  return undefined;
}

const RECORD_PERSIST_DELEGATE_NAMES = [
  'saveState',
];

const RECORD_SYNC_DELEGATE_NAMES = [
  'cloudBackupAll',
];

function getRecordNotifyDelegateNames() {
  return getRecordSaveNotifyCandidates();
}

function getRecordSaveDelegateNames() {
  return [
    ...RECORD_PERSIST_DELEGATE_NAMES,
    ...RECORD_SYNC_DELEGATE_NAMES,
    ...getRecordNotifyDelegateNames(),
  ];
}

function captureRecordSaveDelegates() {
  const originals = {};

  getRecordSaveDelegateNames().forEach(function(name) {
    originals[name] = window[name];
  });

  return originals;
}

function restoreRecordSaveDelegates(originals) {
  getRecordSaveDelegateNames().forEach(function(name) {
    if (originals[name] === undefined) {
      try { delete window[name]; } catch(e) { window[name] = undefined; }
    } else {
      window[name] = originals[name];
    }
  });
}

function installRecordSaveDelegates(originals, context) {
  if (typeof originals.saveState === 'function') {
    window.saveState = function delegatedSaveState() {
      return persistRecordState({
        saveState: originals.saveState,
        thisArg: this,
        arguments: arguments,
        context: context,
      });
    };
  }

  if (typeof originals.cloudBackupAll === 'function') {
    window.cloudBackupAll = function delegatedCloudBackupAll() {
      return syncRecordCloud({
        cloudBackupAll: originals.cloudBackupAll,
        thisArg: this,
        arguments: arguments,
        context: context,
      });
    };
  }

  getRecordNotifyDelegateNames().forEach(function(name) {
    if (typeof originals[name] !== 'function') return;

    window[name] = function delegatedRecordUpdateNotify() {
      return notifyRecordUpdated({
        candidates: [name],
        functions: originals,
        thisArg: this,
        arguments: arguments,
        context: context,
      });
    };
  });
}

function withRecordSavePipelineDelegates(callback, context) {
  const originals = captureRecordSaveDelegates();
  installRecordSaveDelegates(originals, context);

  try {
    const result = callback();

    if (result && typeof result.then === 'function') {
      return result.finally(function() {
        restoreRecordSaveDelegates(originals);
      });
    }

    restoreRecordSaveDelegates(originals);
    return result;
  } catch(error) {
    restoreRecordSaveDelegates(originals);
    throw error;
  }
}

function setActiveRecordSaveContext(context) {
  activeRecordSaveContext = context || null;
  window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ = activeRecordSaveContext;
  return activeRecordSaveContext;
}

function clearActiveRecordSaveContext(context) {
  if (!context || activeRecordSaveContext === context) {
    activeRecordSaveContext = null;
    try { delete window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__; } catch(e) { window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ = null; }
  }
}

function finalizeAndStoreRecordSaveContext(context, label) {
  const finalized = finalizeRecordSaveContext(context, label);
  lastRecordSaveContext = finalized;
  window.__IPPO_LAST_RECORD_SAVE_CONTEXT__ = finalized;
  clearActiveRecordSaveContext(context);
  return finalized;
}

export function getLastRecordSaveContext() {
  return lastRecordSaveContext;
}

export function getActiveRecordSaveContext() {
  return activeRecordSaveContext || window.__IPPO_ACTIVE_RECORD_SAVE_CONTEXT__ || null;
}

export function verifyLastRecordSaveContext() {
  const result = verifyRecordSaveContext(getLastRecordSaveContext());
  traceRecord('saveRecordScreen:verify:last', result);
  return result;
}

function wrapSaveRecordScreen() {
  const fn = window.saveRecordScreen;
  if (typeof fn !== 'function') {
    traceRecord('saveRecordScreen:wrap:missing', getRecordTraceSnapshot());
    return false;
  }

  if (fn.__ippoTraced === true) {
    return true;
  }

  function tracedSaveRecordScreen() {
    const context = createRecordSaveContext('saveRecordScreen');
    const args = arguments;
    const self = this;
    traceRecord('saveRecordScreen:start', getRecordTraceSnapshot());
    setActiveRecordSaveContext(context);

    try {
      const result = withRecordSavePipelineDelegates(function() {
        return fn.apply(self, args);
      }, context);

      if (result && typeof result.then === 'function') {
        return result.then(function(value) {
          traceRecord('saveRecordScreen:resolved', getRecordTraceSnapshot());
          finalizeAndStoreRecordSaveContext(context, 'saveRecordScreen:resolved');
          return value;
        }).catch(function(error) {
          traceRecord('saveRecordScreen:rejected', {
            snapshot: getRecordTraceSnapshot(),
            message: error && error.message,
          });
          finalizeAndStoreRecordSaveContext(context, 'saveRecordScreen:rejected');
          throw error;
        });
      }

      traceRecord('saveRecordScreen:end', getRecordTraceSnapshot());
      finalizeAndStoreRecordSaveContext(context, 'saveRecordScreen:end');
      return result;
    } catch(error) {
      traceRecord('saveRecordScreen:thrown', {
        snapshot: getRecordTraceSnapshot(),
        message: error && error.message,
      });
      finalizeAndStoreRecordSaveContext(context, 'saveRecordScreen:thrown');
      throw error;
    }
  }

  tracedSaveRecordScreen.__ippoTraced = true;
  tracedSaveRecordScreen.__ippoOriginal = fn;
  window.saveRecordScreen = tracedSaveRecordScreen;
  traceRecord('saveRecordScreen:wrap:installed', getRecordTraceSnapshot());
  return true;
}

function installSaveRecordScreenTrace() {
  if (wrapSaveRecordScreen()) return;

  let attempts = 0;
  const timer = setInterval(function() {
    attempts++;
    if (wrapSaveRecordScreen() || attempts >= 20) {
      clearInterval(timer);
    }
  }, 250);
  // EL-4: timer-registry に登録（診断・強制クリーンアップ用）
  if (window.ippoTimerRegistry) {
    window.ippoTimerRegistry.register(timer, 'record', 'interval',
      'saveRecordScreen-wrap-retry', 250, window.ippoTimerRegistry.TYPES.HYDRATION);
  }
}

export function openRecordScreen() {
  traceRecord('openRecordScreen:start', getRecordTraceSnapshot());
  switchTab('record');
  traceRecord('openRecordScreen:end', getRecordTraceSnapshot());
}

export function saveRecord() {
  traceRecord('saveRecord:wrapper:start', getRecordTraceSnapshot());
  const result = callExistingFunction('saveRecord', arguments);
  traceRecord('saveRecord:wrapper:end', getRecordTraceSnapshot());
  return result;
}

export function resetRecordForm() {
  return callExistingFunction('resetRecordForm', arguments);
}

export function updateDiseaseQuestions() {
  return callExistingFunction('updateDiseaseQuestions', arguments);
}

export function renderRecordHeader() {
  return callExistingFunction('renderRecordHeader', arguments);
}

export function buildDraftFromUI() {
  traceRecord('buildDraftFromUI:wrapper:start', getRecordTraceSnapshot());
  const result = callExistingFunction('buildDraftFromUI', arguments);
  traceRecord('buildDraftFromUI:wrapper:end', {
    snapshot: getRecordTraceSnapshot(),
    returnedType: typeof result,
    hasResult: result !== undefined && result !== null,
  });
  return result;
}

export function enableRecordTrace() {
  window.__IPPO_DEBUG_RECORD__ = true;
  try { localStorage.setItem('ippo_debug_record', '1'); } catch(e) {}
  installSaveRecordScreenTrace();
  traceRecord('trace:enabled', getRecordTraceSnapshot());
}

export function disableRecordTrace() {
  window.__IPPO_DEBUG_RECORD__ = false;
  try { localStorage.removeItem('ippo_debug_record'); } catch(e) {}
  console.debug('[ippo:record]', 'trace:disabled');
}

const exportedFunctions = {
  openRecordScreen,
  saveRecord,
  resetRecordForm,
  updateDiseaseQuestions,
  renderRecordHeader,
  buildDraftFromUI,
  enableRecordTrace,
  disableRecordTrace,
  getLastRecordSaveContext,
  getActiveRecordSaveContext,
  verifyLastRecordSaveContext,
};

// window 互換維持
// openRecordScreen はインライン実装がフォーム初期化（renderSymptomLayers等）を行うため、
// 既存実装がある場合はそちらを優先し、モジュール版で上書きしない。
if (typeof window.openRecordScreen !== 'function') {
  window.openRecordScreen = openRecordScreen;
}
window.enableRecordTrace = enableRecordTrace;
window.disableRecordTrace = disableRecordTrace;
window.ippoLastRecordSaveContext = getLastRecordSaveContext;
window.ippoActiveRecordSaveContext = getActiveRecordSaveContext;
window.ippoVerifyLastRecordSave = verifyLastRecordSaveContext;

installSaveRecordScreenTrace();

// saveRecord は既存実装が window にある場合、それを優先して保持する。
// 既存実装がまだ無い場合のみ、互換ラッパーを公開する。
if (typeof window.saveRecord !== 'function') {
  window.saveRecord = saveRecord;
}
if (typeof window.resetRecordForm !== 'function') {
  window.resetRecordForm = resetRecordForm;
}
if (typeof window.updateDiseaseQuestions !== 'function') {
  window.updateDiseaseQuestions = updateDiseaseQuestions;
}
if (typeof window.renderRecordHeader !== 'function') {
  window.renderRecordHeader = renderRecordHeader;
}
if (typeof window.buildDraftFromUI !== 'function') {
  window.buildDraftFromUI = buildDraftFromUI;
}
