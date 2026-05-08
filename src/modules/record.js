// ============================================================
//  ippo – src/modules/record.js
//  Phase 3-C: record モジュール分離 / 接続復旧
//
//  方針:
//  - saveRecord の既存ロジックは変更しない
//  - このファイルでは移行期間用の window 互換を提供する
//  - 旧インライン onclick から参照される関数名を維持する
// ============================================================

function callExistingFunction(name, args) {
  const fn = window[name];
  if (typeof fn === 'function' && fn !== exportedFunctions[name]) {
    return fn.apply(window, args || []);
  }
  return undefined;
}

export function openRecordScreen() {
  if (typeof window.switchTab === 'function') {
    window.switchTab('record');
    return;
  }

  if (typeof window.showScreen === 'function') {
    window.showScreen('record');
    return;
  }

  const mainApp = document.getElementById('main-app');
  const welcome = document.getElementById('screen-welcome');
  const recordScreen = document.getElementById('screen-record');

  if (mainApp) mainApp.style.display = '';
  if (welcome) welcome.style.display = 'none';

  document.querySelectorAll('.screen, .app-screen').forEach(function(screen) {
    screen.classList.remove('active');
  });

  if (recordScreen) recordScreen.classList.add('active');

  if (typeof window.renderRecordHeader === 'function') {
    window.renderRecordHeader();
  }
}

export function saveRecord() {
  return callExistingFunction('saveRecord', arguments);
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
  return callExistingFunction('buildDraftFromUI', arguments);
}

const exportedFunctions = {
  openRecordScreen,
  saveRecord,
  resetRecordForm,
  updateDiseaseQuestions,
  renderRecordHeader,
  buildDraftFromUI,
};

// window 互換維持
window.openRecordScreen = openRecordScreen;

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
