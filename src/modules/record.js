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
import { upsertRecord } from './record-upsert.js';


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
  traceRecord('buildDraftFromUI:start', getRecordTraceSnapshot());

  // まず既存実装（app-legacy.js 等）にデリゲートを試みる
  const delegated = callExistingFunction('buildDraftFromUI', arguments);
  if (delegated !== undefined && delegated !== null) {
    traceRecord('buildDraftFromUI:delegated', { returnedType: typeof delegated });
    return delegated;
  }

  // app-legacy.js が廃止済みの場合はモジュール実装で UI から直接 draft を組み立てる
  try {
    const draft = _buildDraftFromUIImpl();
    traceRecord('buildDraftFromUI:impl:done', {
      hasDate: !!draft.record_date,
      symptomsCount: Array.isArray(draft.symptoms) ? draft.symptoms.length : 0,
    });
    return draft;
  } catch (e) {
    traceRecord('buildDraftFromUI:impl:error', { message: e && e.message });
    return null;
  }
}

function _buildDraftFromUIImpl() {
  const qs  = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const chips = (sel) => qsa(sel + ' .chip.selected').map(function(c) { return c.textContent; });
  const chipVal = (sel) => { const el = qs(sel + ' .chip.selected'); return el ? parseInt(el.getAttribute('data-val')) || 0 : 0; };
  const chipText = (sel) => { const el = qs(sel + ' .chip.selected'); return el ? el.textContent : ''; };

  const mealFreeText = val('rs-meal-free').trim();
  const parseMealMemo = typeof window.parseMealMemo === 'function' ? window.parseMealMemo : function() { return null; };
  const parsed = parseMealMemo(mealFreeText);

  const sleepBed = val('rs-sleep-bed');
  const sleepWake = val('rs-sleep-wake');
  let sleepHours = 0;
  if (sleepBed && sleepWake) {
    const b = sleepBed.split(':'), w = sleepWake.split(':');
    let bMin = parseInt(b[0]) * 60 + parseInt(b[1]);
    let wMin = parseInt(w[0]) * 60 + parseInt(w[1]);
    if (wMin <= bMin) wMin += 1440;
    sleepHours = Math.round((wMin - bMin) / 60 * 10) / 10;
  }

  const bodyChoices = {};
  qsa('#rs-body-choices .chips').forEach(function(group) {
    const cat = group.getAttribute('data-category');
    const selected = qsa.call(null, '#rs-body-choices .chips').length > 0
      ? Array.prototype.slice.call(group.querySelectorAll('.chip.selected')).map(function(c) { return c.getAttribute('data-val'); })
      : [];
    if (cat && selected.length) bodyChoices[cat] = selected;
  });

  const bowelCountDisplay = document.getElementById('bowel-count-display');
  const bowelCount = bowelCountDisplay ? parseInt(bowelCountDisplay.textContent) || 0 : 0;

  const diseaseCheck = typeof window.gatherDiseaseData === 'function'
    ? window.gatherDiseaseData()
    : (function() {
        const data = {};
        qsa('[data-disease-q]').forEach(function(g) {
          const sel = g.querySelector('.chip.selected');
          if (sel) data[g.getAttribute('data-disease-q')] = sel.textContent;
        });
        return data;
      })();

  const state = typeof window.getState === 'function' ? window.getState() : null;
  const targetDate = (state && state.editingDate) ? new Date(state.editingDate) : new Date();

  const draft = {
    date: targetDate.toISOString(),
    record_date: targetDate.toISOString().slice(0, 10),
    mealFree: mealFreeText,
    meals: { free: mealFreeText },
    firstMealTime: parsed ? parsed.firstTime : '',
    lastMealTime: parsed ? parsed.lastTime : '',
    mealCount: parsed ? parsed.mealCount : 0,
    fasting: parsed ? parsed.fastingHours : 0,
    temperature: parseFloat(val('rs-temp')) || null,
    tempMethod: window._tempMethod || 'sublingual',
    symptoms: chips('#rs-symptoms'),
    menstrualCycle: chipText('#rs-cycle'),
    painLocation: chips('#rs-pain-location'),
    painType: chips('#rs-pain-type'),
    painLevel: parseInt(val('rs-pain-level')) || 0,
    medication: chips('#rs-medication'),
    bloodClot: chips('#rs-blood-clot'),
    bloodColor: chips('#rs-blood-color'),
    energy: chipVal('#rs-energy'),
    sleepBed: sleepBed,
    sleepWake: sleepWake,
    sleepQuality: chipVal('#rs-sleep-quality'),
    sleepHours: sleepHours,
    factors: chips('#rs-factors'),
    bowel: chipText('#rs-bowel'),
    bowelCount: bowelCount,
    mood: chipVal('#rs-mood'),
    dischargeAmount: chipText('#rs-discharge-amount'),
    dischargeType: chips('#rs-discharge-type'),
    note: val('rs-note'),
    bodyChoices: bodyChoices,
    diseaseCheck: diseaseCheck,
    diseases: state ? (state.myDiseases || []) : [],
  };

  if (typeof window.calcWellnessScore === 'function') {
    draft.wellnessScore = window.calcWellnessScore(draft);
  }
  if (typeof window.calcSMIScore === 'function') {
    const smi = window.calcSMIScore(draft.diseaseCheck || {});
    if (smi !== null) draft.smiScore = smi;
  }

  return draft;
}

// ─── saveRecordScreen モジュール実装 ─────────────────────────
// app-legacy.js が廃止された後のフォールバック実装。
// app-legacy.js が存在する間は wrapSaveRecordScreen() 経由で legacy 側が優先される。
// 廃止後は window.saveRecordScreen がこの実装を指す。

export function saveRecordScreen() {
  traceRecord('saveRecordScreen:module:start', getRecordTraceSnapshot());
  try {
    _saveRecordScreenImpl();
  } catch (e) {
    traceRecord('saveRecordScreen:module:error', { message: e && e.message });
    const showAlert = typeof window.showAlertModal === 'function' ? window.showAlertModal : window.alert;
    if (typeof showAlert === 'function') {
      showAlert('記録の保存中にエラーが発生しました。<br>もう一度お試しください。<br><br>エラー: ' + (e && e.message));
    }
  }
}

function _saveRecordScreenImpl() {
  // 1. UI から draft を取得
  const draft = buildDraftFromUI();
  if (!draft || !draft.record_date) {
    traceRecord('saveRecordScreen:module:no-draft');
    return;
  }

  // 2. 既存 records に upsert（window.getState を使い legacy / module 両対応）
  const getStateFn = typeof window.getState === 'function' ? window.getState : function() { return null; };
  const state = getStateFn();
  if (!state) {
    traceRecord('saveRecordScreen:module:no-state');
    return;
  }

  const prevRecords = Array.isArray(state.records) ? state.records : [];
  const nextRecords = upsertRecord(prevRecords, draft);
  state.records = nextRecords;

  // 新規レコードかどうか（streak / totalDays 更新用）
  const isNew = !prevRecords.some(function(r) {
    const d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
    return d === draft.record_date;
  });

  if (isNew) {
    state.totalDays = (state.totalDays || 0) + 1;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toDateString();
    const hadYesterday = prevRecords.some(function(r) {
      return r.date && new Date(r.date).toDateString() === yStr;
    });
    state.streak = state.streak || 0;
    state.streak = (hadYesterday || state.streak === 0) ? state.streak + 1 : 1;
  }

  // 3. window.saveState で永続化（legacy / module 両対応）
  const saveStateFn = typeof window.saveState === 'function' ? window.saveState : null;
  if (!saveStateFn) {
    traceRecord('saveRecordScreen:module:persist-failed:no-saveState');
    const showAlert = typeof window.showAlertModal === 'function' ? window.showAlertModal : window.alert;
    if (typeof showAlert === 'function') {
      showAlert('記録の保存に失敗しました。もう一度お試しください。');
    }
    return;
  }
  try {
    saveStateFn();
  } catch (storageErr) {
    traceRecord('saveRecordScreen:module:persist-failed:error', { message: storageErr && storageErr.message });
    const showAlert = typeof window.showAlertModal === 'function' ? window.showAlertModal : window.alert;
    if (typeof showAlert === 'function') {
      showAlert('記録の保存に失敗しました。端末のストレージ容量を確認してください。');
    }
    return;
  }

  // 4. draft クリーンアップ
  try { localStorage.removeItem('ippo_record_draft'); } catch(e) {}
  try { localStorage.removeItem('ippo_draft'); } catch(e) {}
  try { localStorage.removeItem('ippo_meal_draft'); } catch(e) {}
  if (window.ippoRecordDraftGuard && typeof window.ippoRecordDraftGuard.markClean === 'function') {
    window.ippoRecordDraftGuard.markClean();
  }

  // 5. 症状履歴更新
  if (draft.symptoms && draft.symptoms.length && typeof window.saveSymptomSelection === 'function') {
    window.saveSymptomSelection(draft.symptoms);
  }

  // 6. UI 通知（notifyRecordUpdated 経由）
  notifyRecordUpdated();

  // 7. success-overlay 表示（UX 責務）
  _showSaveSuccessOverlay(state);

  // 8. editingDate クリア
  if (state.editingDate) {
    state.editingDate = null;
    saveStateFn();
  }

  // 9. クラウド同期（window.cloudBackupAll 直接呼び出し / 失敗時 3秒リトライ）
  const cloudBackupFn = typeof window.cloudBackupAll === 'function' ? window.cloudBackupAll : null;
  if (cloudBackupFn) {
    cloudBackupFn().catch(function(e) {
      traceRecord('saveRecordScreen:module:sync-retry', { message: e && e.message });
      setTimeout(function() {
        cloudBackupFn().catch(function() {
          if (typeof window.showToast === 'function') {
            window.showToast('クラウド同期に失敗しました。Wi-Fiを確認してください。', 'warn');
          }
        });
      }, 3000);
    });
  }

  traceRecord('saveRecordScreen:module:done', getRecordTraceSnapshot());
}

function _showSaveSuccessOverlay(state) {
  const so = document.getElementById('success-overlay');
  if (!so) return;

  const emojiEl = document.getElementById('success-emoji');
  const titleEl = document.getElementById('success-title');
  const msgEl   = document.getElementById('success-message');
  if (emojiEl) emojiEl.textContent = '🌿';
  if (titleEl) titleEl.textContent = '記録を保存しました';

  if (msgEl) {
    const streak = state.streak || 0;
    let html = '<div style="background:#FBEAF0;border-radius:14px;padding:14px 16px;margin:12px 0 4px;text-align:left;">';
    html += '<div style="font-weight:500;color:#72243E;margin-bottom:4px;">今日で' + streak + '日連続記録中</div>';
    html += '</div>';
    msgEl.innerHTML = html;
  }

  so.classList.add('active');

  if (window.__ippoSuccessOverlayTimer) {
    clearTimeout(window.__ippoSuccessOverlayTimer);
    window.__ippoSuccessOverlayTimer = null;
  }
  window.__ippoSuccessOverlayTimer = setTimeout(function() {
    const overlay = document.getElementById('success-overlay');
    if (overlay && overlay.classList.contains('active')) {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity = '0';
      setTimeout(function() {
        overlay.classList.remove('active');
        overlay.style.opacity = '';
        overlay.style.transition = '';
        window.__ippoSuccessOverlayTimer = null;
      }, 500);
    }
  }, 2000);
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
// saveRecordScreen: app-legacy.js が廃止された後のフォールバック。
// wrapSaveRecordScreen() はすでに legacy 側を trace ラップしているため、
// legacy が存在する間はそちらが優先される。
if (typeof window.saveRecordScreen !== 'function') {
  window.saveRecordScreen = saveRecordScreen;
}
