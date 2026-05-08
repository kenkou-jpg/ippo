// ============================================================
//  ippo – src/modules/record.js
//  Phase 3-C: record モジュール分離 / 接続復旧
//  Phase 3-D-0: saveRecord runtime trace
//
//  方針:
//  - saveRecord の既存ロジックは変更しない
//  - このファイルでは移行期間用の window 互換を提供する
//  - 旧インライン onclick から参照される関数名を維持する
//  - trace は console 出力のみで保存処理へ介入しない
// ============================================================

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
  const state = window.state || {};
  let kkRecords = null;
  let ippoState = null;

  try { kkRecords = localStorage.getItem('kk_records'); } catch(e) {}
  try { ippoState = localStorage.getItem('ippo_state'); } catch(e) {}

  return {
    hasWindowState: !!window.state,
    stateRecordsLength: Array.isArray(state.records) ? state.records.length : null,
    hasWindowSupabase: !!window.supabase,
    kkRecordsLength: kkRecords ? kkRecords.length : 0,
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

export function openRecordScreen() {
  traceRecord('openRecordScreen:start', getRecordTraceSnapshot());

  if (typeof window.switchTab === 'function') {
    traceRecord('openRecordScreen:route:switchTab', { tab: 'record' });
    window.switchTab('record');
    return;
  }

  if (typeof window.showScreen === 'function') {
    traceRecord('openRecordScreen:route:showScreen', { screen: 'record' });
    window.showScreen('record');
    return;
  }

  const mainApp = document.getElementById('main-app');
  const welcome = document.getElementById('screen-welcome');
  const recordScreen = document.getElementById('screen-record');

  traceRecord('openRecordScreen:route:fallback', {
    hasMainApp: !!mainApp,
    hasWelcome: !!welcome,
    hasRecordScreen: !!recordScreen,
  });

  if (mainApp) mainApp.style.display = '';
  if (welcome) welcome.style.display = 'none';

  document.querySelectorAll('.screen, .app-screen').forEach(function(screen) {
    screen.classList.remove('active');
  });

  if (recordScreen) recordScreen.classList.add('active');

  if (typeof window.renderRecordHeader === 'function') {
    window.renderRecordHeader();
  }

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
};

// window 互換維持
window.openRecordScreen = openRecordScreen;
window.enableRecordTrace = enableRecordTrace;
window.disableRecordTrace = disableRecordTrace;

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
