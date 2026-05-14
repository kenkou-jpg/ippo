// tests/modules/calendar.test.js
// ─────────────────────────────────────────────────────────────
// Calendar module isolated tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Month arithmetic helpers (extracted from calendar.js logic) ──

function changeMonth(calYear, calMonth, delta) {
  let cm = calMonth + delta;
  let cy = calYear;
  if (cm > 11) { cm = 0; cy++; }
  if (cm < 0)  { cm = 11; cy--; }
  return { calYear: cy, calMonth: cm };
}

function getRecordsForMonth(records, year, month) {
  const monthStr = year + '-' + String(month + 1).padStart(2, '0');
  return records.filter(r =>
    (r.date && r.date.slice(0, 7) === monthStr) ||
    (r.record_date && r.record_date.slice(0, 7) === monthStr)
  );
}

describe('changeMonth arithmetic', () => {
  it('advances one month normally', () => {
    const { calYear, calMonth } = changeMonth(2025, 5, 1);
    expect(calYear).toBe(2025);
    expect(calMonth).toBe(6);
  });

  it('wraps December → January, increments year', () => {
    const { calYear, calMonth } = changeMonth(2025, 11, 1);
    expect(calYear).toBe(2026);
    expect(calMonth).toBe(0);
  });

  it('wraps January → December, decrements year', () => {
    const { calYear, calMonth } = changeMonth(2025, 0, -1);
    expect(calYear).toBe(2024);
    expect(calMonth).toBe(11);
  });

  it('goes back multiple months', () => {
    const { calYear, calMonth } = changeMonth(2025, 2, -3);
    expect(calYear).toBe(2024);
    expect(calMonth).toBe(11);
  });
});

describe('getRecordsForMonth', () => {
  const records = [
    { record_date: '2025-05-01' },
    { record_date: '2025-05-15' },
    { record_date: '2025-04-30' },
    { date: '2025-05-20T00:00:00.000Z' },
  ];

  it('returns only records in the given month', () => {
    const result = getRecordsForMonth(records, 2025, 4); // May = month 4
    expect(result).toHaveLength(3);
  });

  it('returns empty array for month with no records', () => {
    const result = getRecordsForMonth(records, 2025, 0); // January
    expect(result).toHaveLength(0);
  });

  it('handles records with date field (ISO string)', () => {
    const result = getRecordsForMonth(records, 2025, 4);
    expect(result.some(r => r.date)).toBe(true);
  });
});

describe('Calendar monthly summary statistics', () => {
  const records = [
    { record_date: '2025-05-01', painLevel: 2 },
    { record_date: '2025-05-02', painLevel: 0 },
    { record_date: '2025-05-03', painLevel: 4 },
    { record_date: '2025-05-04', painLevel: null },
  ];

  it('computes average pain correctly', () => {
    const recs = records.filter(r => r.record_date.startsWith('2025-05'));
    const painRecs = recs.filter(r => r.painLevel !== null && r.painLevel !== undefined);
    const avg = painRecs.reduce((s, r) => s + r.painLevel, 0) / painRecs.length;
    expect(avg).toBeCloseTo(2, 0);  // (2+0+4)/3 ≈ 2
  });

  it('correctly counts pain-free days (painLevel=0)', () => {
    const painFree = records.filter(r => r.painLevel === 0).length;
    expect(painFree).toBe(1);
  });
});
