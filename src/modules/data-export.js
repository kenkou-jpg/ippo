// ================================================================
//  ippo – src/modules/data-export.js
//  PR-084 (Legacy Removal Batch-6): Data Export & Reset
//
//  app-legacy.js の JSON/CSVエクスポートと全データリセットを物理移動。
//  Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks により同一オブジェクト参照）
//  ・clearData内の`saveState()`（app-legacy.js側に残置）は
//    window.saveState() 経由の guarded 呼び出しに変更（既存idiomと同型）。
//  ・clearData内の bare `updateStats()` は、home-renderer.js に同名の別実装が
//    並存し window.updateStats はそちら側が上書きする（PR-080C重複整理と同型、
//    「重複実装は統合しない」判断を踏襲）。PR-090-R4でapp-legacy.js側ローカル実装が
//    src/modules/legacy-misc-stats.js へ物理移動したため、window.__ippoLegacyUpdateStats()
//    経由を廃止し、同モジュールからの直接importに変更。
//  ・clearData内の bare `updateUnlock()` は window.updateUnlock() 経由に変更
//    （既存の window bridge で解決、挙動変更なし）。
//  ・clearData内の bare `fastInterval` 操作（Fasting Timer機能、Batch-7未移植の
//    app-legacy.js側 module-scope 変数）は window.__ippoStopFastInterval() 経由の
//    専用ブリッジに変更（PR-080E window.__ippoGetBowelCount と同型パターン）。
//  ・exportCSV内の showAlertModal は ui-notifications.js（同じくPR-084で物理移動先）
//    から直接importして解決。
// ================================================================

import { showAlertModal } from './ui-notifications.js';
import { updateStats } from './legacy-misc-stats.js';

export function exportJSON(){
  var d = JSON.stringify(window.state, null, 2);
  var b = new Blob([d], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'ippo-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== CSVエクスポート =====
export function exportCSV(){
  if(!window.state.records || window.state.records.length === 0){
    showAlertModal('エクスポートする記録がありません。');
    return;
  }

  // ヘッダー定義
  var headers = [
    '日付',
    '基礎体温',
    'エネルギー',
    '睡眠_就寝',
    '睡眠_起床',
    '睡眠時間',
    '睡眠の質',
    'ウェルネススコア',
    'SMIスコア',
    '生理周期',
    '痛みレベル',
    '痛み部位',
    '痛みタイプ',
    '症状',
    '服薬',
    '経血_塊',
    '経血_色',
    'お通じ',
    '生活ファクター',
    '食事メモ',
    '食事回数',
    '最初の食事',
    '最後の食事',
    'ファスティング時間',
    '疾患チェック',
    '疾患',
    'メモ'
  ];

  var rows = [headers.join(',')];

  // 日付順にソート
  var sorted = window.state.records.slice().sort(function(a,b){
    return new Date(a.date) - new Date(b.date);
  });

  sorted.forEach(function(r){
    var row = [
      r.date || '',
      r.temperature || '',
      r.energy || '',
      r.sleepBed || '',
      r.sleepWake || '',
      r.sleepHours || '',
      r.sleepQuality || '',
      r.wellnessScore !== undefined ? r.wellnessScore : '',
      r.smiScore !== undefined ? r.smiScore : '',
      r.menstrualCycle || '',
      r.painLevel || '',
      csvSafe(Array.isArray(r.painLocation) ? r.painLocation.join('・') : (r.painLocation || '')),
      csvSafe(Array.isArray(r.painType) ? r.painType.join('・') : (r.painType || '')),
      csvSafe((r.symptoms || []).join('・')),
      csvSafe((r.medication || []).join('・')),
      csvSafe((r.bloodClot || []).join('・')),
      csvSafe((r.bloodColor || []).join('・')),
      r.bowel || '',
      csvSafe((r.factors || []).join('・')),
      csvSafe(r.mealFree || ''),
      r.mealCount || '',
      r.firstTime || '',
      r.lastTime || '',
      r.fastingHours || '',
      csvSafe(formatDiseaseCheck(r.diseaseCheck)),
      csvSafe((r.diseases || []).join('・')),
      csvSafe(r.note || '')
    ];
    rows.push(row.join(','));
  });

  var csvContent = '﻿' + rows.join('\n'); // BOM付きUTF-8
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var today = new Date();
  a.download = 'ippo-records-' + today.getFullYear() + (today.getMonth()+1+'').padStart(2,'0') + (today.getDate()+'').padStart(2,'0') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function csvSafe(str){
  if(!str) return '';
  str = String(str);
  if(str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1){
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function formatDiseaseCheck(dc){
  if(!dc || typeof dc !== 'object') return '';
  var parts = [];
  Object.keys(dc).forEach(function(key){
    parts.push(key + ':' + dc[key]);
  });
  return parts.join('／');
}

export function clearData() {
  // P0-FIX-10: 意図的なリセットフラグをセット。
  // cloudBackupAll の FIX-9 Guard が空 records の同期をブロックするため、
  // ユーザー明示リセット時のみ Guard を通過させるためのフラグ。
  // フラグは cloudBackupAll の Guard 内で消費される（delete）。
  window.__ippoExplicitDataReset = true;

  window.state.records    = [];
  window.state.streak     = 0;
  window.state.totalDays  = 0;
  // バグ20: リペアタイマーも確実にリセット
  window.state.fastingActive = false;
  window.state.fastingStart  = null;
  window.__ippoStopFastInterval();
  // タイマーUIを初期状態に戻す
  const timerEl  = document.getElementById('fast-timer');
  const statusEl = document.getElementById('fast-status');
  const startBtn = document.getElementById('fast-start-btn');
  const stopBtn  = document.getElementById('fast-stop-btn');
  if (timerEl)  timerEl.textContent  = '00:00:00';
  if (statusEl) statusEl.textContent = 'ファスティングを始めましょう';
  if (startBtn) startBtn.style.display = 'block';
  if (stopBtn)  stopBtn.style.display  = 'none';
  if (typeof window.saveState === 'function') window.saveState();
  updateStats();
  if (typeof window.updateUnlock === 'function') window.updateUnlock();
}
