// ============================================================
//  ippo – src/modules/record-upsert.js
//  Phase 3-F-4: safe record upsert utilities
//
//  目的:
//  - record配列の安全な更新処理をpure functionとして分離する
//  - saveRecordScreen / Supabase / localStorage / DOM は変更しない
//  - 将来の saveRecordScreen 委譲化に備える
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  getRecordDateCandidates,
} from './record-repository.js';

export function isEmptyRecordValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

export function cloneRecordValue(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch(e) {
    return value;
  }
}

export function findRecordIndexByDate(records, date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate || !Array.isArray(records)) return -1;

  return records.findIndex(function(record) {
    return getRecordDateCandidates(record).includes(targetDate);
  });
}

export function mergeRecordPreservingExisting(existingRecord, nextRecord) {
  const existing = existingRecord || {};
  const next = nextRecord || {};
  const merged = { ...existing };

  Object.keys(next).forEach(function(key) {
    const nextValue = next[key];
    const existingValue = existing[key];

    // Array/Object schema 衝突: 次の値がArrayで既存がObject(非Array)の場合は schema 移行を優先
    const isSchemaConflict = Array.isArray(nextValue)
      && existingValue !== null && existingValue !== undefined
      && typeof existingValue === 'object' && !Array.isArray(existingValue);
    if (isSchemaConflict) {
      merged[key] = cloneRecordValue(nextValue);
      return;
    }

    if (isEmptyRecordValue(nextValue) && !isEmptyRecordValue(existingValue)) {
      merged[key] = cloneRecordValue(existingValue);
      return;
    }

    merged[key] = cloneRecordValue(nextValue);
  });

  return merged;
}

export function upsertRecord(records, nextRecord, options) {
  const sourceRecords = Array.isArray(records) ? records : [];
  const nextDate = getRecordDate(nextRecord);
  const preserveExisting = options?.preserveExisting !== false;

  if (!nextDate) {
    return {
      records: sourceRecords.map(cloneRecordValue),
      changed: false,
      index: -1,
      mode: 'invalid',
      reason: 'missing-record-date',
    };
  }

  const index = findRecordIndexByDate(sourceRecords, nextDate);
  const cloned = sourceRecords.map(cloneRecordValue);

  if (index === -1) {
    cloned.push(cloneRecordValue(nextRecord));
    return {
      records: cloned,
      changed: true,
      index: cloned.length - 1,
      mode: 'insert',
      reason: '',
    };
  }

  const existing = sourceRecords[index];
  const merged = preserveExisting
    ? mergeRecordPreservingExisting(existing, nextRecord)
    : cloneRecordValue(nextRecord);

  const changed = JSON.stringify(existing) !== JSON.stringify(merged);
  cloned[index] = merged;

  return {
    records: cloned,
    changed: changed,
    index: index,
    mode: 'update',
    reason: '',
  };
}

export function upsertRecordInPlace(records, nextRecord, options) {
  if (!Array.isArray(records)) {
    return {
      records: [],
      changed: false,
      index: -1,
      mode: 'invalid',
      reason: 'records-not-array',
    };
  }

  const result = upsertRecord(records, nextRecord, options);

  if (result.mode === 'insert') {
    records.push(cloneRecordValue(nextRecord));
    return {
      ...result,
      records: records,
    };
  }

  if (result.mode === 'update' && result.index >= 0) {
    records[result.index] = cloneRecordValue(result.records[result.index]);
    return {
      ...result,
      records: records,
    };
  }

  return {
    ...result,
    records: records,
  };
}

window.ippoRecordUpsert = Object.freeze({
  isEmptyRecordValue,
  cloneRecordValue,
  findRecordIndexByDate,
  mergeRecordPreservingExisting,
  upsertRecord,
  upsertRecordInPlace,
});
