// ============================================================
// ippo – record-edit-save-identity-guard.js
// Hotfix: preserve existing record identity and values on edit save
//
// 目的:
// - 編集保存時に buildDraftFromUI() の空値/初期値で既存recordを消さない
// - 編集対象日のrecordを新規扱いに落とさない
// - 保存後に同一日付recordが重複した場合のみ局所統合する
// - app.html の巨大保存本体は変更しない
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  findRecordByDate,
  getRecords,
} from './record-repository.js';

function debug(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:edit-save-identity]', label, detail || '');
    }
  } catch(e) {}
}

function markSavePhase(phase, detail) {
  try {
    if (typeof window.ippoMarkRecordSavePhase === 'function') {
      window.ippoMarkRecordSavePhase(phase, { detail: detail || null });
    }
  } catch(e) {}
}

function markSyncEvent(phase, detail) {
  try {
    if (typeof window.ippoMarkSyncEvent === 'function') {
      window.ippoMarkSyncEvent({
        phase: phase,
        area: 'record-edit-save-identity-guard',
        detail: detail || null,
      });
    }
  } catch(e) {}
}

function markFreshness(label) {
  try {
    if (typeof window.ippoMarkRecordFreshness === 'function') {
      window.ippoMarkRecordFreshness(label);
    }
  } catch(e) {}
}

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

function getActiveEditDate() {
  const candidates = [
    window.__ippoActiveEditDate,
    window.currentEditingDate,
    window.editingDate,
    window.state?.currentEditingDate,
    window.state?.editingDate,
    window.state?.recordDate,
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

function isUiDefaultValue(key, value, existingValue) {
  if (empty(existingValue)) return false;

  const normalizedKey = String(key || '').toLowerCase();

  if (empty(value)) return true;

  if (/score|scale|energy|wellness|condition/.test(normalizedKey)) {
    const n = Number(value);
    return n === 3 || n === 5;
  }

  if (/food_time/.test(normalizedKey)) {
    return String(value) === 'other';
  }

  if (/fasting_start/.test(normalizedKey)) {
    return String(value) === '20:00';
  }

  if (/fasting_end/.test(normalizedKey)) {
    return String(value) === '12:00';
  }

  if (/fasting_goal/.test(normalizedKey)) {
    return Number(value) === 14;
  }

  return false;
}

function mergeObjectsPreservingExisting(existingValue, draftValue) {
  if (!existingValue || typeof existingValue !== 'object' || Array.isArray(existingValue)) return draftValue;
  if (!draftValue || typeof draftValue !== 'object' || Array.isArray(draftValue)) return draftValue;

  const merged = { ...existingValue };
  Object.keys(draftValue).forEach(function(key) {
    const next = draftValue[key];
    const old = existingValue[key];

    if (empty(next) && !empty(old)) {
      merged[key] = old;
      return;
    }

    if (isUiDefaultValue(key, next, old)) {
      merged[key] = old;
      return;
    }

    if (old && next && typeof old === 'object' && typeof next === 'object' && !Array.isArray(old) && !Array.isArray(next)) {
      merged[key] = mergeObjectsPreservingExisting(old, next);
      return;
    }

    merged[key] = next;
  });

  return merged;
}

function mergeDraftIntoExisting(existingRecord, draft, editDate) {
  const existing = clone(existingRecord || {});
  const safeDraft = draft && typeof draft === 'object' ? clone(draft) : {};
  const merged = { ...existing };

  Object.keys(safeDraft).forEach(function(key) {
    const next = safeDraft[key];
    const old = existing[key];

    if (['record_date', 'recordDate', 'date', 'id'].includes(key)) return;

    if (empty(next) && !empty(old)) {
      merged[key] = old;
      return;
    }

    if (isUiDefaultValue(key, next, old)) {
      merged[key] = old;
      return;
    }

    if (old && next && typeof old === 'object' && typeof next === 'object' && !Array.isArray(old) && !Array.isArray(next)) {
      merged[key] = mergeObjectsPreservingExisting(old, next);
      return;
    }

    merged[key] = next;
  });

  merged.record_date = editDate;
  merged.date = editDate;
  merged.id = existing.id || editDate;

  return merged;
}

function protectDraft(draft) {
  const editDate = getActiveEditDate();
  const existing = editDate ? findRecordByDate(editDate) : null;

  if (!editDate || !existing || !draft || typeof draft !== 'object') {
    return draft;
  }

  const beforeDate = normalizeRecordDate(draft.record_date || draft.recordDate || draft.date || draft.id || '');
  const protectedDraft = mergeDraftIntoExisting(existing, draft, editDate);

  window.__ippoEditSaveIdentityGuardLast = {
    at: Date.now(),
    editDate,
    beforeDate,
    existingRecordDate: getRecordDate(existing),
    existingKeys: Object.keys(existing).length,
    draftKeys: Object.keys(draft).length,
    protectedKeys: Object.keys(protectedDraft).length,
  };

  markSavePhase('edit-draft-protected', window.__ippoEditSaveIdentityGuardLast);
  debug('draft-protected', window.__ippoEditSaveIdentityGuardLast);
  return protectedDraft;
}

function wrapBuildDraftFromUI() {
  const original = window.buildDraftFromUI;
  if (typeof original !== 'function') return false;
  if (original.__ippoEditSaveIdentityGuard === true) return true;

  function wrappedBuildDraftFromUI() {
    const draft = original.apply(this, arguments);
    return protectDraft(draft);
  }

  wrappedBuildDraftFromUI.__ippoEditSaveIdentityGuard = true;
  wrappedBuildDraftFromUI.__ippoOriginal = original;
  window.buildDraftFromUI = wrappedBuildDraftFromUI;
  debug('wrapped:buildDraftFromUI');
  return true;
}

function groupDuplicateRecordDates(list) {
  const groups = {};

  list.forEach(function(record, index) {
    const date = getRecordDate(record);
    if (!date) return;
    if (!groups[date]) groups[date] = [];
    groups[date].push({ record, index });
  });

  return Object.keys(groups)
    .map(function(date) {
      return {
        date: date,
        matches: groups[date],
      };
    })
    .filter(function(group) {
      return group.matches.length > 1;
    });
}

function mergeDuplicateGroup(group) {
  return group.matches.reduce(function(acc, item) {
    return mergeDraftIntoExisting(acc, item.record, group.date);
  }, group.matches[0].record);
}

function repairDuplicateDatesAfterSave() {
  const list = getRecords();
  if (!Array.isArray(list)) return false;

  const duplicateGroups = groupDuplicateRecordDates(list);
  if (duplicateGroups.length === 0) return false;

  const repaired = duplicateGroups.map(function(group) {
    const first = group.matches[0];
    const merged = mergeDuplicateGroup(group);

    list[first.index] = merged;
    group.matches.slice(1).reverse().forEach(function(item) {
      list.splice(item.index, 1);
    });

    return {
      date: group.date,
      keptIndex: first.index,
      removed: group.matches.length - 1,
    };
  });

  try {
    if (typeof window.saveState === 'function') {
      window.saveState();
      markSavePhase('duplicate-date-repair-persisted', { repaired });
    }
  } catch(e) {
    markSavePhase('duplicate-date-repair-persist-failed', { message: e && e.message });
  }

  try {
    if (typeof window.cloudBackupAll === 'function') {
      markSyncEvent('duplicate-date-repair-sync', { repaired });
      window.cloudBackupAll();
    }
  } catch(e) {
    markSyncEvent('duplicate-date-repair-sync-failed', { message: e && e.message });
  }

  window.__ippoEditSaveIdentityDuplicateRepairLast = {
    at: Date.now(),
    repaired: repaired,
    recordsLength: list.length,
  };

  markFreshness('record-edit-save:duplicate-repair');

  debug('duplicate-dates-repaired-after-save', window.__ippoEditSaveIdentityDuplicateRepairLast);
  return true;
}

function repairDuplicateAfterSave() {
  return repairDuplicateDatesAfterSave();
}

function wrapSaveRecordScreen() {
  const original = window.saveRecordScreen;
  if (typeof original !== 'function') return false;
  if (original.__ippoEditSaveIdentitySaveGuard === true) return true;

  function wrappedSaveRecordScreen() {
    const result = original.apply(this, arguments);

    if (result && typeof result.then === 'function') {
      return result.then(function(value) {
        repairDuplicateAfterSave();
        markFreshness('record-edit-save:after-save');
        return value;
      });
    }

    repairDuplicateAfterSave();
    markFreshness('record-edit-save:after-save-sync');
    return result;
  }

  wrappedSaveRecordScreen.__ippoEditSaveIdentitySaveGuard = true;
  wrappedSaveRecordScreen.__ippoOriginal = original;
  window.saveRecordScreen = wrappedSaveRecordScreen;
  debug('wrapped:saveRecordScreen');
  return true;
}

function install() {
  wrapBuildDraftFromUI();
  wrapSaveRecordScreen();
}

install();

let attempts = 0;
const timer = window.setInterval(function() {
  attempts++;
  install();
  if (attempts >= 40) window.clearInterval(timer);
}, 250);

window.ippoEditSaveIdentityGuardSummary = function() {
  const editDate = getActiveEditDate();
  const records = getRecords();
  return {
    editDate,
    hasExistingRecord: !!(editDate && findRecordByDate(editDate)),
    last: window.__ippoEditSaveIdentityGuardLast || null,
    duplicateRepairLast: window.__ippoEditSaveIdentityDuplicateRepairLast || null,
    duplicateDateCount: Array.isArray(records) ? groupDuplicateRecordDates(records).length : 0,
    recordsLength: records.length,
  };
};
