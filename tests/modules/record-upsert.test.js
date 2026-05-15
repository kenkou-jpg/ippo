// tests/modules/record-upsert.test.js
// ─────────────────────────────────────────────────────────────
// record-upsert.js unit tests — pure function surface
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// record-upsert.js imports record-repository.js which imports state.js
// state.js touches window globals — stub them before module load
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

let isEmptyRecordValue,
    cloneRecordValue,
    findRecordIndexByDate,
    mergeRecordPreservingExisting,
    upsertRecord,
    upsertRecordInPlace;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  const mod = await import('../../src/modules/record-upsert.js');
  isEmptyRecordValue          = mod.isEmptyRecordValue;
  cloneRecordValue            = mod.cloneRecordValue;
  findRecordIndexByDate       = mod.findRecordIndexByDate;
  mergeRecordPreservingExisting = mod.mergeRecordPreservingExisting;
  upsertRecord                = mod.upsertRecord;
  upsertRecordInPlace         = mod.upsertRecordInPlace;
});

// ── isEmptyRecordValue ────────────────────────────────────────
describe('isEmptyRecordValue', () => {
  it('treats null / undefined as empty', () => {
    expect(isEmptyRecordValue(null)).toBe(true);
    expect(isEmptyRecordValue(undefined)).toBe(true);
  });

  it('treats blank string as empty', () => {
    expect(isEmptyRecordValue('')).toBe(true);
    expect(isEmptyRecordValue('  ')).toBe(true);
  });

  it('treats empty array as empty', () => {
    expect(isEmptyRecordValue([])).toBe(true);
  });

  it('treats 0 and false as non-empty', () => {
    expect(isEmptyRecordValue(0)).toBe(false);
    expect(isEmptyRecordValue(false)).toBe(false);
  });

  it('treats non-empty array as non-empty', () => {
    expect(isEmptyRecordValue([1])).toBe(false);
  });

  it('treats non-blank string as non-empty', () => {
    expect(isEmptyRecordValue('hello')).toBe(false);
  });
});

// ── cloneRecordValue ──────────────────────────────────────────
describe('cloneRecordValue', () => {
  it('deep-clones an object', () => {
    const src = { a: 1, b: [2, 3] };
    const clone = cloneRecordValue(src);
    clone.b.push(4);
    expect(src.b).toHaveLength(2);
  });

  it('returns primitive values unchanged', () => {
    expect(cloneRecordValue(42)).toBe(42);
    expect(cloneRecordValue('str')).toBe('str');
  });
});

// ── findRecordIndexByDate ─────────────────────────────────────
describe('findRecordIndexByDate', () => {
  const records = [
    { record_date: '2025-05-01', mood: 3 },
    { record_date: '2025-05-02', mood: 4 },
  ];

  it('finds index by exact record_date', () => {
    expect(findRecordIndexByDate(records, '2025-05-01')).toBe(0);
    expect(findRecordIndexByDate(records, '2025-05-02')).toBe(1);
  });

  it('returns -1 for an absent date', () => {
    expect(findRecordIndexByDate(records, '2025-12-31')).toBe(-1);
  });

  it('returns -1 for invalid input', () => {
    expect(findRecordIndexByDate(null, '2025-05-01')).toBe(-1);
    expect(findRecordIndexByDate(records, '')).toBe(-1);
  });

  it('accepts slash-separated date format', () => {
    expect(findRecordIndexByDate(records, '2025/05/01')).toBe(0);
  });
});

// ── mergeRecordPreservingExisting ─────────────────────────────
describe('mergeRecordPreservingExisting', () => {
  it('preserves existing non-empty value when next is empty', () => {
    const existing = { record_date: '2025-05-01', mood: 3, note: 'hello' };
    const next     = { record_date: '2025-05-01', mood: 5, note: '' };
    const merged = mergeRecordPreservingExisting(existing, next);
    expect(merged.note).toBe('hello'); // empty next → keep existing
    expect(merged.mood).toBe(5);       // non-empty next → overwrite
  });

  it('overwrites existing value when next is non-empty', () => {
    const existing = { record_date: '2025-05-01', mood: 3 };
    const next     = { record_date: '2025-05-01', mood: 5 };
    expect(mergeRecordPreservingExisting(existing, next).mood).toBe(5);
  });

  it('handles null existing gracefully', () => {
    const result = mergeRecordPreservingExisting(null, { record_date: '2025-05-01' });
    expect(result.record_date).toBe('2025-05-01');
  });

  it('adds new keys from next that are absent in existing', () => {
    const existing = { record_date: '2025-05-01' };
    const next     = { record_date: '2025-05-01', energy: 4 };
    expect(mergeRecordPreservingExisting(existing, next).energy).toBe(4);
  });
});

// ── upsertRecord ─────────────────────────────────────────────
describe('upsertRecord', () => {
  const base = [
    { record_date: '2025-05-01', mood: 3 },
    { record_date: '2025-05-02', mood: 4 },
  ];

  it('inserts a new record when date is absent', () => {
    const result = upsertRecord(base, { record_date: '2025-05-10', mood: 5 });
    expect(result.records).toHaveLength(3);
    expect(result.mode).toBe('insert');
    expect(result.changed).toBe(true);
  });

  it('updates an existing record by date', () => {
    const result = upsertRecord(base, { record_date: '2025-05-01', mood: 5 });
    expect(result.records).toHaveLength(2);
    expect(result.mode).toBe('update');
    expect(result.records[0].mood).toBe(5);
  });

  it('does not mutate the original records array', () => {
    upsertRecord(base, { record_date: '2025-06-01', mood: 1 });
    expect(base).toHaveLength(2);
  });

  it('returns mode=invalid when record has no date', () => {
    const result = upsertRecord(base, { mood: 3 });
    expect(result.mode).toBe('invalid');
    expect(result.changed).toBe(false);
  });

  it('handles empty source array', () => {
    const result = upsertRecord([], { record_date: '2025-05-01' });
    expect(result.mode).toBe('insert');
    expect(result.records).toHaveLength(1);
  });

  it('preserveExisting=false replaces rather than merges', () => {
    const existing = [{ record_date: '2025-05-01', mood: 3, note: 'existing' }];
    const next     = { record_date: '2025-05-01', mood: 5 };
    const result   = upsertRecord(existing, next, { preserveExisting: false });
    expect(result.records[0].note).toBeUndefined();
    expect(result.records[0].mood).toBe(5);
  });
});

// ── upsertRecordInPlace ───────────────────────────────────────
describe('upsertRecordInPlace', () => {
  it('mutates the source array on insert', () => {
    const arr = [{ record_date: '2025-05-01' }];
    upsertRecordInPlace(arr, { record_date: '2025-05-02' });
    expect(arr).toHaveLength(2);
  });

  it('mutates the source array on update', () => {
    const arr = [{ record_date: '2025-05-01', mood: 3 }];
    upsertRecordInPlace(arr, { record_date: '2025-05-01', mood: 5 });
    expect(arr[0].mood).toBe(5);
  });

  it('returns mode=invalid when records is not an array', () => {
    const result = upsertRecordInPlace(null, { record_date: '2025-05-01' });
    expect(result.mode).toBe('invalid');
  });
});
