// tests/modules/record-normalized-write.test.js
// ─────────────────────────────────────────────────────────────
// syncRecordToNormalizedSchema / mapLegacyRecordToDraft — PR-REC-06a-FIX
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateRecord = vi.fn();
vi.mock('../../application/record/createRecord', () => ({
  createRecord: (...args) => mockCreateRecord(...args),
}));

vi.mock('../../infrastructure/record/record.repository', () => ({
  SupabaseRecordRepository: vi.fn().mockImplementation((client) => ({ __client: client })),
}));

let mockClient = null;
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: () => mockClient,
}));

import {
  mapLegacyRecordToDraft,
  syncRecordToNormalizedSchema,
  applyNormalizedSyncResult,
  retryNormalizedSyncPending,
} from '../../src/modules/record-normalized-write.js';

describe('mapLegacyRecordToDraft', () => {
  it('maps the legacy record shape field names to RecordDraft field names', () => {
    const draft = mapLegacyRecordToDraft({
      record_date: '2026-07-12',
      mood: 4,
      sleepQuality: 3,
      symptoms: ['肌荒れ'],
      factors: ['カフェイン'],
      note: 'メモ',
      painLevel: 2,
      cycle: '生理中',
      temp: 36.5,
      medication: ['イブプロフェン'],
      experiment_id: 'exp-1',
    });

    expect(draft).toEqual({
      recordDate: '2026-07-12',
      mood: 4,
      sleepQuality: 3,
      symptoms: ['肌荒れ'],
      factors: ['カフェイン'],
      note: 'メモ',
      painLevel: 2,
      menstrualCycle: '生理中',
      temperature: 36.5,
      medication: ['イブプロフェン'],
      experimentId: 'exp-1',
    });
  });

  // PR-REC-06a-FIX (Founder Decision 3/4): bloodClot/bloodColor/bowel は
  // controlled vocabulary未確定のためnormalized write対象外。draftに含めない
  // （legacy user_records側のみ保持）。
  it('does not include bloodClot/bloodColor/bowel in the draft even when present on the legacy record', () => {
    const draft = mapLegacyRecordToDraft({
      record_date: '2026-07-12',
      bloodClot: ['少し'],
      bloodColor: ['透明'],
      bowel: '普通',
    });
    expect(draft).not.toHaveProperty('bloodClot');
    expect(draft).not.toHaveProperty('bloodColor');
    expect(draft).not.toHaveProperty('bowel');
  });

  it('leaves unset fields as undefined rather than null/empty', () => {
    const draft = mapLegacyRecordToDraft({ record_date: '2026-07-12' });
    expect(draft.mood).toBeUndefined();
    expect(draft.symptoms).toBeUndefined();
  });
});

describe('syncRecordToNormalizedSchema — structured result (status)', () => {
  beforeEach(() => {
    mockClient = null;
    mockCreateRecord.mockReset();
  });

  it('resolves status:"skipped:no-client" when no Supabase client is configured', async () => {
    mockClient = null;
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result).toEqual({ status: 'skipped:no-client' });
  });

  it('resolves status:"skipped:no-record-date" when the record has no record_date', async () => {
    mockClient = { auth: { getSession: vi.fn() } };
    const result = await syncRecordToNormalizedSchema({});
    expect(result).toEqual({ status: 'skipped:no-record-date' });
  });

  it('resolves status:"skipped:not-logged-in" when there is no active session', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    };
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result).toEqual({ status: 'skipped:not-logged-in' });
  });

  it('calls createRecord with the mapped draft and resolves status:"success"', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    mockCreateRecord.mockResolvedValue({ success: true, recordDate: '2026-07-12', errors: [] });

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12', mood: 3 });

    expect(result).toEqual({ status: 'success' });
    expect(mockCreateRecord).toHaveBeenCalledTimes(1);
    const [command] = mockCreateRecord.mock.calls[0];
    expect(command.userId).toBe('u1');
    expect(command.draft).toMatchObject({ recordDate: '2026-07-12', mood: 3 });
  });

  it('resolves status:"failed:validation" with errors when createRecord fails validation', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    mockCreateRecord.mockResolvedValue({ success: false, recordDate: null, errors: ['mood must be 0-5'] });

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12', mood: 99 });
    expect(result).toEqual({ status: 'failed:validation', errors: ['mood must be 0-5'] });
  });

  it('resolves status:"failed:vocabulary" when the repository throws a code:"vocabulary" error', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    const err = new Error('symptoms vocabulary fetch failed: rls denied');
    err.code = 'vocabulary';
    mockCreateRecord.mockRejectedValue(err);

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result.status).toBe('failed:vocabulary');
    expect(result.message).toMatch(/vocabulary fetch failed/);
  });

  it('resolves status:"failed:database" when the repository throws a code:"database" error', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    const err = new Error('no unique constraint matching ON CONFLICT');
    err.code = 'database';
    mockCreateRecord.mockRejectedValue(err);

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result.status).toBe('failed:database');
    expect(result.message).toMatch(/ON CONFLICT/);
  });

  it('resolves status:"failed:database" (default classification) for untagged errors, e.g. getSession() itself failing', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockRejectedValue(new Error('network down')) },
    };
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result.status).toBe('failed:database');
    expect(result.message).toMatch(/network down/);
  });

  it('never rejects — always resolves with a status field', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockRejectedValue(new Error('boom')) },
    };
    await expect(syncRecordToNormalizedSchema({ record_date: '2026-07-12' })).resolves.toHaveProperty('status');
  });
});

// PR-REC-06b: リトライ機構
describe('applyNormalizedSyncResult', () => {
  it('marks success: pending=false, sets normalizedSyncedAt', () => {
    const record = { normalizedSyncPending: true };
    applyNormalizedSyncResult(record, { status: 'success' });
    expect(record.normalizedSyncPending).toBe(false);
    expect(record.normalizedSyncedAt).toBeTypeOf('string');
  });

  it.each([
    'skipped:no-client',
    'skipped:not-logged-in',
    'failed:vocabulary',
    'failed:database',
  ])('marks %s as retryable: pending=true, clears normalizedSyncedAt', (status) => {
    const record = { normalizedSyncedAt: '2026-07-01T00:00:00.000Z' };
    applyNormalizedSyncResult(record, { status });
    expect(record.normalizedSyncPending).toBe(true);
    expect(record).not.toHaveProperty('normalizedSyncedAt');
  });

  it.each(['skipped:no-record-date', 'failed:validation'])(
    'does not mark %s as pending (retrying would not help)',
    (status) => {
      const record = {};
      applyNormalizedSyncResult(record, { status });
      expect(record.normalizedSyncPending).toBeUndefined();
    },
  );

  it('does nothing when record or result is missing', () => {
    expect(() => applyNormalizedSyncResult(null, { status: 'success' })).not.toThrow();
    expect(() => applyNormalizedSyncResult({}, null)).not.toThrow();
  });
});

describe('retryNormalizedSyncPending', () => {
  let saveStateSpy;

  beforeEach(() => {
    mockClient = null;
    mockCreateRecord.mockReset();
    saveStateSpy = vi.fn();
    window.saveState = saveStateSpy;
    delete window.getState;
  });

  it('resolves without calling saveState when there are no pending records', async () => {
    window.getState = () => ({ records: [{ record_date: '2026-07-10' }] });
    await retryNormalizedSyncPending();
    expect(saveStateSpy).not.toHaveBeenCalled();
  });

  it('resolves without throwing when window.getState is not available', async () => {
    await expect(retryNormalizedSyncPending()).resolves.toBeUndefined();
  });

  it('retries only records with normalizedSyncPending=true and clears the flag on success', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    };
    mockCreateRecord.mockResolvedValue({ success: true, recordDate: '2026-07-12', errors: [] });

    const pendingRecord = { record_date: '2026-07-12', normalizedSyncPending: true };
    const syncedRecord = { record_date: '2026-07-11', normalizedSyncPending: false };
    window.getState = () => ({ records: [pendingRecord, syncedRecord] });

    await retryNormalizedSyncPending();

    expect(mockCreateRecord).toHaveBeenCalledTimes(1);
    expect(pendingRecord.normalizedSyncPending).toBe(false);
    expect(pendingRecord.normalizedSyncedAt).toBeTypeOf('string');
    expect(saveStateSpy).toHaveBeenCalledTimes(1);
  });

  it('leaves the flag set when the retry fails again', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    };
    const pendingRecord = { record_date: '2026-07-12', normalizedSyncPending: true };
    window.getState = () => ({ records: [pendingRecord] });

    await retryNormalizedSyncPending();

    expect(pendingRecord.normalizedSyncPending).toBe(true);
    expect(saveStateSpy).toHaveBeenCalledTimes(1);
  });
});
