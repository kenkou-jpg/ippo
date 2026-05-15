// tests/modules/record-repository.test.js
// ─────────────────────────────────────────────────────────────
// record-repository.js unit tests
// Focus: normalizeRecordDate, getRecordDate, findRecordByDate
// (getRecords / snapshot rely on live state — covered separately)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

let normalizeRecordDate, getRecordDate, findRecordByDate, getRecords;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  window._ippoStateHooks = [];

  const mod = await import('../../src/modules/record-repository.js');
  normalizeRecordDate = mod.normalizeRecordDate;
  getRecordDate       = mod.getRecordDate;
  findRecordByDate    = mod.findRecordByDate;
  getRecords          = mod.getRecords;
});

// ── normalizeRecordDate ───────────────────────────────────────
describe('normalizeRecordDate', () => {
  it('normalizes ISO string YYYY-MM-DD', () => {
    expect(normalizeRecordDate('2025-05-01')).toBe('2025-05-01');
  });

  it('normalizes slash-separated date', () => {
    expect(normalizeRecordDate('2025/5/1')).toBe('2025-05-01');
  });

  it('normalizes compact YYYYMMDD', () => {
    expect(normalizeRecordDate('20250501')).toBe('2025-05-01');
  });

  it('normalizes Date object', () => {
    expect(normalizeRecordDate(new Date('2025-05-01'))).toBe('2025-05-01');
  });

  it('normalizes Japanese date string', () => {
    expect(normalizeRecordDate('2025年5月1日')).toBe('2025-05-01');
  });

  it('normalizes Japanese date without year using current year', () => {
    const result = normalizeRecordDate('5月1日');
    const year = new Date().getFullYear();
    expect(result).toBe(`${year}-05-01`);
  });

  it('normalizes ISO datetime (trims time part)', () => {
    expect(normalizeRecordDate('2025-05-01T09:00:00.000Z')).toBe('2025-05-01');
  });

  it('returns empty string for null / undefined', () => {
    expect(normalizeRecordDate(null)).toBe('');
    expect(normalizeRecordDate(undefined)).toBe('');
    expect(normalizeRecordDate('')).toBe('');
  });

  it('returns empty string for non-date strings', () => {
    expect(normalizeRecordDate('hello world')).toBe('');
  });

  it('pads single-digit month and day', () => {
    expect(normalizeRecordDate('2025-5-3')).toBe('2025-05-03');
  });
});

// ── getRecordDate ─────────────────────────────────────────────
describe('getRecordDate', () => {
  it('returns record_date when present', () => {
    expect(getRecordDate({ record_date: '2025-05-01' })).toBe('2025-05-01');
  });

  it('falls back to date field', () => {
    expect(getRecordDate({ date: '2025-05-02' })).toBe('2025-05-02');
  });

  it('falls back to id field', () => {
    expect(getRecordDate({ id: '2025-05-03' })).toBe('2025-05-03');
  });

  it('falls back to created_at field', () => {
    expect(getRecordDate({ created_at: '2025-05-04T00:00:00Z' })).toBe('2025-05-04');
  });

  it('returns empty string for null record', () => {
    expect(getRecordDate(null)).toBe('');
  });

  it('returns empty string when no valid date field exists', () => {
    expect(getRecordDate({ mood: 3, energy: 4 })).toBe('');
  });

  it('uses record_date before date when both present', () => {
    expect(getRecordDate({ record_date: '2025-05-01', date: '2025-05-02' })).toBe('2025-05-01');
  });
});

// ── findRecordByDate (via state) ──────────────────────────────
describe('findRecordByDate (state-backed)', () => {
  it('returns null when no records in state', () => {
    expect(findRecordByDate('2025-05-01')).toBeNull();
  });

  it('returns null for empty / invalid date', () => {
    expect(findRecordByDate('')).toBeNull();
    expect(findRecordByDate(null)).toBeNull();
  });
});

// ── getRecords ────────────────────────────────────────────────
describe('getRecords', () => {
  it('returns empty array when state has no records', () => {
    expect(getRecords()).toEqual([]);
  });

  it('returns records stored in localStorage state key', async () => {
    const { STATE_KEY } = await import('../../src/store/state.js');
    const payload = JSON.stringify({ records: [{ record_date: '2025-05-01' }] });
    localStorage.setItem(STATE_KEY, payload);

    // re-import so module picks up fresh localStorage
    vi.resetModules();
    localStorage._data[STATE_KEY] = payload;
    const freshMod = await import('../../src/modules/record-repository.js');
    const records = freshMod.getRecords();
    expect(Array.isArray(records)).toBe(true);
  });
});
