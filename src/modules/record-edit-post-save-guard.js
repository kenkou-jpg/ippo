// ============================================================
// ippo – record-edit-post-save-guard.js
// Hotfix: capture real save route and repair edit saves after persistence
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  findRecordByDate,
  getRecords,
} from './record-repository.js';

function clone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch(e) { return value; }
}

function empty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
}

function persist() {
  try { if (typeof window.saveState === 'function') window.saveState(); } catch(e) {}
  try { if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll(); } catch(e) {}
}

function getEditDate() {
  const candidates = [
    window.__ippoActiveEditDate,
    window.currentEditingDate,
    window.editingDate,
    window.state?.currentEditingDate,
    window.state?.editingDate,
    window.state?.recordDate,
  ];

  for (const item of candidates) {
    const date = normalizeRecordDate(item);
    if (date) return date;
  }

  try {
    const summary = typeof window.ippoRecordEditHydrationSummary === 'function'
      ? window.ippoRecordEditHydrationSummary()
      : null;
    return normalizeRecordDate(summary?.editingDate) || normalizeRecordDate(summary?.lastEditIntent?.date) || '';
  } catch(e) {
    return '';
  }
}

function isDefaultLike(key, next, old) {
  if (empty(old)) return false;
  if (empty(next)) return true;
  const k = String(key || '').toLowerCase();
  if (/score|scale|energy|wellness|condition/.test(k)) {
    const n = Number(next);
    return n === 3 || n === 5;
  }
  if (/food_time/.test(k)) return String(next) === 'other';
  if (/fasting_start/.test(k)) return String(next) === '20:00';
  if (/fasting_end/.test(k)) return String(next) === '12:00';
  if (/fasting_goal/.test(k)) return Number(next) === 14;
  return false;
}

function mergeSafe(oldRecord, newRecord, editDate) {
  const oldSafe = clone(oldRecord || {});
  const nextSafe = clone(newRecord || {});
  const merged = { ...oldSafe };

  Object.keys(nextSafe).forEach(function(key) {
    if (['record_date', 'recordDate', 'date', 'id'].includes(key)) return;
    const oldValue = oldSafe[key];
    const nextValue = nextSafe[key];

    if (isDefaultLike(key, nextValue, oldValue)) {
      merged[key] = oldValue;
      return;
    }

    if (
      oldValue && nextValue &&
      typeof oldValue === 'object' && typeof nextValue === 'object' &&
      !Array.isArray(oldValue) && !Array.isArray(nextValue)
    ) {
      merged[key] = mergeSafe(oldValue, nextValue, editDate);
      return;
    }

    merged[key] = nextValue;
  });

  merged.record_date = editDate;
  merged.date = editDate;
  merged.id = oldSafe.id || editDate;
  return merged;
}

function createSnapshot(route) {
  const editDate = getEditDate();
  const records = clone(getRecords() || []);
  const beforeRecord = editDate ? clone(findRecordByDate(editDate)) : null;
  return {
    route,
    editDate,
    records,
    beforeRecord,
    beforeLength: Array.isArray(records) ? records.length : 0,
  };
}

function repair(snapshot) {
  const editDate = normalizeRecordDate(snapshot?.editDate);
  const beforeRecord = snapshot?.beforeRecord;
  const list = getRecords();

  if (!editDate || !beforeRecord || !Array.isArray(list)) {
    window.__ippoPostSaveEditGuardLast = {
      at: Date.now(),
      route: snapshot?.route || '',
      skipped: true,
      reason: !editDate ? 'missing-edit-date' : (!beforeRecord ? 'missing-before-record' : 'missing-record-list'),
    };
    return false;
  }

  const beforeDates = new Set((snapshot.records || []).map(getRecordDate).filter(Boolean));
  const sameDateIndexes = [];
  const insertedIndexes = [];

  list.forEach(function(record, index) {
    const date = getRecordDate(record);
    if (date === editDate) sameDateIndexes.push(index);
    if (date && !beforeDates.has(date)) insertedIndexes.push(index);
  });

  let changed = false;

  if (sameDateIndexes.length === 0 && insertedIndexes.length > 0) {
    const index = insertedIndexes[0];
    list[index] = mergeSafe(beforeRecord, list[index], editDate);
    sameDateIndexes.push(index);
    changed = true;
  }

  if (sameDateIndexes.length > 0) {
    const first = sameDateIndexes[0];
    const merged = sameDateIndexes.reduce(function(acc, index) {
      return mergeSafe(acc, list[index], editDate);
    }, beforeRecord);

    if (JSON.stringify(list[first]) !== JSON.stringify(merged)) {
      list[first] = merged;
      changed = true;
    }

    sameDateIndexes.slice(1).reverse().forEach(function(index) {
      list.splice(index, 1);
      changed = true;
    });
  }

  if (changed) persist();

  window.__ippoPostSaveEditGuardLast = {
    at: Date.now(),
    route: snapshot.route,
    editDate,
    changed,
    beforeLength: snapshot.beforeLength,
    afterLength: list.length,
    sameDateCount: sameDateIndexes.length,
    insertedCount: insertedIndexes.length,
  };

  return changed;
}

function wrap(name) {
  const original = window[name];
  if (typeof original !== 'function') return false;
  if (original.__ippoPostSaveEditGuard === true) return true;

  function wrapped() {
    const snapshot = createSnapshot(name);
    const result = original.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        repair(snapshot);
        return value;
      });
    }

    repair(snapshot);
    return result;
  }

  wrapped.__ippoPostSaveEditGuard = true;
  wrapped.__ippoOriginal = original;
  window[name] = wrapped;
  return true;
}

function install() {
  wrap('saveRecordScreen');
  wrap('saveRecord');
  wrap('handleSave');
  wrap('saveRecordLocal');
}

install();

let tries = 0;
const timer = window.setInterval(function() {
  tries++;
  install();
  if (tries >= 80) window.clearInterval(timer);
}, 250);

window.ippoPostSaveEditGuardSummary = function() {
  return {
    editDate: getEditDate(),
    hasExistingRecord: !!findRecordByDate(getEditDate()),
    wrapped: {
      saveRecordScreen: window.saveRecordScreen?.__ippoPostSaveEditGuard === true,
      saveRecord: window.saveRecord?.__ippoPostSaveEditGuard === true,
      handleSave: window.handleSave?.__ippoPostSaveEditGuard === true,
      saveRecordLocal: window.saveRecordLocal?.__ippoPostSaveEditGuard === true,
    },
    last: window.__ippoPostSaveEditGuardLast || null,
    recordsLength: getRecords().length,
  };
};
