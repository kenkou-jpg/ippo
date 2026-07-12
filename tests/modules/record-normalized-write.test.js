// tests/modules/record-normalized-write.test.js
// ─────────────────────────────────────────────────────────────
// syncRecordToNormalizedSchema / mapLegacyRecordToDraft — PR-REC-06a
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

import { mapLegacyRecordToDraft, syncRecordToNormalizedSchema } from '../../src/modules/record-normalized-write.js';

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
      bloodClot: ['少し'],
      bloodColor: ['透明'],
      temp: 36.5,
      bowel: '普通',
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
      bloodClot: ['少し'],
      bloodColor: ['透明'],
      temperature: 36.5,
      bowel: '普通',
      medication: ['イブプロフェン'],
      experimentId: 'exp-1',
    });
  });

  it('leaves unset fields as undefined rather than null/empty', () => {
    const draft = mapLegacyRecordToDraft({ record_date: '2026-07-12' });
    expect(draft.mood).toBeUndefined();
    expect(draft.symptoms).toBeUndefined();
  });
});

describe('syncRecordToNormalizedSchema', () => {
  beforeEach(() => {
    mockClient = null;
    mockCreateRecord.mockReset();
  });

  it('resolves ok:false when no Supabase client is configured', async () => {
    mockClient = null;
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result).toEqual({ ok: false, reason: 'no-client' });
  });

  it('resolves ok:false when the record has no record_date', async () => {
    mockClient = { auth: { getSession: vi.fn() } };
    const result = await syncRecordToNormalizedSchema({});
    expect(result).toEqual({ ok: false, reason: 'no-record-date' });
  });

  it('resolves ok:false when there is no active session', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    };
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result).toEqual({ ok: false, reason: 'not-logged-in' });
  });

  it('calls createRecord with the mapped draft and resolves ok:true on success', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    mockCreateRecord.mockResolvedValue({ success: true, recordDate: '2026-07-12', errors: [] });

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12', mood: 3 });

    expect(result).toEqual({ ok: true });
    expect(mockCreateRecord).toHaveBeenCalledTimes(1);
    const [command] = mockCreateRecord.mock.calls[0];
    expect(command.userId).toBe('u1');
    expect(command.draft).toMatchObject({ recordDate: '2026-07-12', mood: 3 });
  });

  it('resolves ok:false with validation errors when createRecord fails validation', async () => {
    mockClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }),
      },
    };
    mockCreateRecord.mockResolvedValue({ success: false, recordDate: null, errors: ['mood must be 0-5'] });

    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12', mood: 99 });
    expect(result).toEqual({ ok: false, reason: 'mood must be 0-5' });
  });

  it('catches thrown errors and resolves ok:false', async () => {
    mockClient = {
      auth: { getSession: vi.fn().mockRejectedValue(new Error('network down')) },
    };
    const result = await syncRecordToNormalizedSchema({ record_date: '2026-07-12' });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/network down/);
  });
});
