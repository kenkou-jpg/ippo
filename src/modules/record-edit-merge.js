// ============================================================
//  ippo – src/modules/record-edit-merge.js
//  Phase 3-D-3: 編集保存時の既存record保護
//  Phase 3-F-2: record repository 読み取り層へ移行
//  Hotfix: protect edit save from accidental insert/empty overwrite
//
//  目的:
//  - 食事など一部項目の編集保存時に、未編集項目が空値で消えるのを防ぐ
//  - 既存 saveRecordScreen の中身は変更しない
//  - 保存後に同じ日付の既存recordとmerge補正する
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
} from './record-repository.js';
import { getState, saveState } from '../store/state.js';
import { cloudBackupAll } from '../services/supabase.js';

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
    saveState();
  } catch(e) {
    trace('saveState:error', e && e.message);
  }

  try {
    cloudBackupAll();
  } catch(e) {
    trace('cloudBackupAll:error', e && e.message);
  }
}

function getActiveEditDate() {
  const s = getState();
  const _editingModuleDate = window.ippoEditingState ? window.ippoEditingState.getEditingState().date : null;
  const candidates = [
    _editingModuleDate,
    s?.currentEditingDate,
    s?.editingDate,
    s?.recordDate,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRecordDate(candidate);
    if (normalized) return normalized;
  }

  try {
    const summary = typeof window.ippoRecordEditHydrationSummary === 'function'
      ? window.ippoRecordEditHydrationSummary()
      : null;
    const summaryDate = normalizeRecordDate(summary?.editingDate) || normalizeRecordDate(summary?.lastEditIntent?.date);
    if (summaryDate) return summaryDate;
  } catch(e) {}

  return '';
}

function findBeforeRecord(beforeRecords, date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate || !Array.isArray(beforeRecords)) return null;
  return beforeRecords.find(function(record) {
    return getRecordDate(record) === targetDate;
  }) || null;
}

function findCurrentIndexesByDate(current, date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate || !Array.isArray(current)) return [];

  const indexes = [];
  current.forEach(function(record, index) {
    if (getRecordDate(record) === targetDate) indexes.push(index);
  });
  return indexes;
}

function repairDuplicateEditInsert(current, beforeRecords, editDate) {
  const oldRecord = findBeforeRecord(beforeRecords, editDate);
  if (!oldRecord) return false;

  const indexes = findCurrentIndexesByDate(current, editDate);
  if (indexes.length <= 1) return false;

  const merged = indexes.reduce(function(acc, index) {
    return mergePreservingExisting(acc, current[index]);
  }, oldRecord);

  current[indexes[0]] = merged;
  indexes.slice(1).reverse().forEach(function(index) {
    current.splice(index, 1);
  });

  trace('duplicate-edit-insert:repaired', {
    date: editDate,
    removed: indexes.length - 1,
  });
  return true;
}

function repairAccidentalDateDrift(current, beforeRecords, editDate) {
  const oldRecord = findBeforeRecord(beforeRecords, editDate);
  if (!oldRecord) return false;

  const exactIndexes = findCurrentIndexesByDate(current, editDate);
  if (exactIndexes.length > 0) return false;

  const beforeDates = new Set((beforeRecords || []).map(getRecordDate).filter(Boolean));
  const insertedIndex = current.findIndex(function(record) {
    const date = getRecordDate(record);
    return date && !beforeDates.has(date);
  });

  if (insertedIndex < 0) return false;

  const driftRecord = current[insertedIndex];
  const merged = mergePreservingExisting(oldRecord, {
    ...driftRecord,
    record_date: editDate,
    date: editDate,
    id: oldRecord.id || editDate,
  });

  current[insertedIndex] = merged;
  trace('date-drift:repaired', {
    editDate,
    driftDate: getRecordDate(driftRecord),
  });
  return true;
}

function repairAfterSave(beforeRecords) {
  const current = records();
  if (!current || !Array.isArray(beforeRecords)) return;

  let changed = false;
  const activeEditDate = getActiveEditDate();

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

  if (activeEditDate) {
    if (repairDuplicateEditInsert(current, beforeRecords, activeEditDate)) changed = true;
    if (repairAccidentalDateDrift(current, beforeRecords, activeEditDate)) changed = true;
  }

  if (changed) {
    persist();
    trace('done', { records: current.length, activeEditDate });
  } else {
    trace('noop', { records: current.length, activeEditDate });
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
  const timer = setInterval(function() {
    count++;
    if (install() || count >= 20) clearInterval(timer);
  }, 250);
  // EL-4: timer-registry に登録（診断・強制クリーンアップ用）
  if (window.ippoTimerRegistry) {
    window.ippoTimerRegistry.register(timer, 'record-edit-merge', 'interval',
      'install-retry', 250, window.ippoTimerRegistry.TYPES.HYDRATION);
  }
}
