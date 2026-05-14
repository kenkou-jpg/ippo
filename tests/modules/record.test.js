// tests/modules/record.test.js
// ─────────────────────────────────────────────────────────────
// Record CRUD and validation tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';

// ── Helpers mirroring record.js / record-repository.js logic ──

function findRecordByDate(records, dateStr) {
  return records.find(r => {
    const d = (r.record_date || (r.date ? r.date.slice(0, 10) : ''));
    return d === dateStr;
  });
}

function upsertRecord(records, newRecord) {
  const dateStr = (newRecord.record_date || newRecord.date || '').slice(0, 10);
  const idx = records.findIndex(r => {
    const d = (r.record_date || (r.date ? r.date.slice(0, 10) : ''));
    return d === dateStr;
  });
  if (idx >= 0) {
    const updated = records.slice();
    updated[idx] = { ...records[idx], ...newRecord };
    return updated;
  }
  return [...records, newRecord];
}

function removeRecord(records, id) {
  return records.filter(r => r.id !== id);
}

// ── findRecordByDate ──────────────────────────────────────────

describe('findRecordByDate', () => {
  const records = [
    { id: 'a', record_date: '2025-05-01', painLevel: 2 },
    { id: 'b', record_date: '2025-05-02', painLevel: 0 },
    { id: 'c', date: '2025-05-03T09:00:00.000Z' },
  ];

  it('finds by record_date', () => {
    expect(findRecordByDate(records, '2025-05-01')).toMatchObject({ id: 'a' });
  });

  it('finds by ISO date field (sliced to 10 chars)', () => {
    expect(findRecordByDate(records, '2025-05-03')).toMatchObject({ id: 'c' });
  });

  it('returns undefined for missing date', () => {
    expect(findRecordByDate(records, '2025-06-01')).toBeUndefined();
  });
});

// ── upsertRecord ─────────────────────────────────────────────

describe('upsertRecord', () => {
  const base = [
    { id: 'a', record_date: '2025-05-01', painLevel: 2 },
  ];

  it('inserts new record when date is not present', () => {
    const result = upsertRecord(base, { id: 'b', record_date: '2025-05-02', painLevel: 1 });
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('b');
  });

  it('updates existing record when date matches', () => {
    const result = upsertRecord(base, { record_date: '2025-05-01', painLevel: 4 });
    expect(result).toHaveLength(1);
    expect(result[0].painLevel).toBe(4);
    expect(result[0].id).toBe('a'); // preserves original fields
  });

  it('does not mutate the original array', () => {
    const original = [...base];
    upsertRecord(base, { id: 'new', record_date: '2025-06-01' });
    expect(base).toHaveLength(original.length);
  });
});

// ── removeRecord ─────────────────────────────────────────────

describe('removeRecord', () => {
  const records = [
    { id: 'a', record_date: '2025-05-01' },
    { id: 'b', record_date: '2025-05-02' },
  ];

  it('removes a record by id', () => {
    const result = removeRecord(records, 'a');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('is a no-op when id not found', () => {
    const result = removeRecord(records, 'zzz');
    expect(result).toHaveLength(2);
  });

  it('does not mutate the original array', () => {
    removeRecord(records, 'a');
    expect(records).toHaveLength(2);
  });
});
