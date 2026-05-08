// ============================================================
//  ippo – src/modules/record-edit-merge.js
//  Phase 3-D-3: 編集保存時の既存record保護
//  Phase 3-F-2: record repository 読み取り層へ移行
//
//  目的:
//  - 食事など一部項目の編集保存時に、未編集項目が空値で消えるのを防ぐ
//  - 既存 saveRecordScreen の中身は変更しない
//  - 保存後に同じ日付の既存recordとmerge補正する
// ============================================================

import {
  getRecordDate,
  getRecords,
} from './record-repository.js';

function trace(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:record-merge]', label, detail || '');
    }
  } catch(e) {}
}

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch(e) { return value; }
}

function records() {
  const current = getRecords();
  return Array.isArray(current) ? current : null;
}

function empty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function mergePreservingExisting(oldRecord, newRecord) {
  const merged = { ...(oldRecord || {}) };
  Object.keys(newRecord || {}).forEach(function(key) {
    const nextValue = newRecord[key];
    const oldValue = oldRecord ? oldRecord[key] : undefined;

    if (empty(nextValue) && !empty(oldValue)) {
      merged[key] = oldValue;
      return;
    }

    merged[key] = nextValue;
  });
  return merged;
}

function persist() {
  try {
    if (typeof window.saveState === 'function') window.saveState();
  } catch(e) {
    trace('saveState:error', e && e.message);
  }

  try {
    if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll();
  } catch(e) {
    trace('cloudBackupAll:error', e && e.message);
  }
}

function repairAfterSave(beforeRecords) {
  const current = records();
  if (!current || !Array.isArray(beforeRecords)) return;

  let changed = false;

  current.forEach(function(newRecord, index) {
    const d = getRecordDate(newRecord);
    if (!d) return;

    const oldRecord = beforeRecords.find(function(record) {
      return getRecordDate(record) === d;
    });

    if (!oldRecord) return;

    const merged = mergePreservingExisting(oldRecord, newRecord);
    if (JSON.stringify(merged) !== JSON.stringify(newRecord)) {
      current[index] = merged;
      changed = true;
      trace('repaired', { date: d });
    }
  });

  if (changed) {
    persist();
    trace('done', { records: current.length });
  } else {
    trace('noop', { records: current.length });
  }
}

function install() {
  const original = window.saveRecordScreen;
  if (typeof original !== 'function') return false;
  if (original.__ippoEditMergeGuard === true) return true;

  function wrappedSaveRecordScreen() {
    const before = clone(records() || []);
    const result = original.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        repairAfterSave(before);
        return value;
      });
    }

    repairAfterSave(before);
    return result;
  }

  wrappedSaveRecordScreen.__ippoEditMergeGuard = true;
  wrappedSaveRecordScreen.__ippoOriginal = original;
  window.saveRecordScreen = wrappedSaveRecordScreen;
  trace('installed');
  return true;
}

if (!install()) {
  let count = 0;
  const timer = window.setInterval(function() {
    count++;
    if (install() || count >= 20) window.clearInterval(timer);
  }, 250);
}
