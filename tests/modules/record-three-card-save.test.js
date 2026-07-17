// tests/modules/record-three-card-save.test.js
// ─────────────────────────────────────────────────────────────
// _rtcPipelineSave — PR-REC-06b: normalized write結果のnormalizedSyncPending反映
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/modules/record/save.js', () => ({
  createRecordSaveContext: vi.fn(() => ({})),
  persistRecordState: vi.fn(),
  syncRecordCloud: vi.fn(),
  notifyRecordUpdated: vi.fn(),
  finalizeRecordSaveContext: vi.fn(() => ({})),
}));

vi.mock('../../src/modules/record-upsert.js', () => ({
  upsertRecord: vi.fn((records, payload) => ({ mode: 'insert', records: [payload] })),
}));

const mockSyncRecordImmediately = vi.fn();
vi.mock('../../src/services/supabase.js', () => ({
  syncRecordImmediately: (...args) => mockSyncRecordImmediately(...args),
}));

// syncRecordToNormalizedSchema のみモックし、applyNormalizedSyncResult は実実装を使う
// （_rtcPipelineSave との実際の結線を検証するため）。
const mockSyncRecordToNormalizedSchema = vi.fn();
vi.mock('../../src/modules/record-normalized-write.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    syncRecordToNormalizedSchema: (...args) => mockSyncRecordToNormalizedSchema(...args),
  };
});

import '../../src/modules/record-three-card-save.js';

function makePayload(overrides) {
  return Object.assign({ id: 'rec-1', record_date: '2026-07-12' }, overrides);
}

describe('_rtcPipelineSave — normalized sync result handling (PR-REC-06b)', () => {
  let state;

  beforeEach(() => {
    mockSyncRecordImmediately.mockReset().mockResolvedValue({ ok: true });
    mockSyncRecordToNormalizedSchema.mockReset();
    state = { records: [] };
    window.getState = () => state;
    window.saveState = vi.fn();
  });

  it('sets normalizedSyncPending=false and normalizedSyncedAt on success', async () => {
    mockSyncRecordToNormalizedSchema.mockResolvedValue({ status: 'success' });
    const payload = makePayload();

    window.rtcSaveDelegate(payload);

    await vi.waitFor(() => {
      expect(state.records[0].normalizedSyncPending).toBe(false);
    });
    expect(state.records[0].normalizedSyncedAt).toBeTypeOf('string');
    expect(window.__IPPO_LAST_NORMALIZED_WRITE_RESULT__).toEqual({ status: 'success' });
    expect(window.saveState).toHaveBeenCalled();
  });

  it('sets normalizedSyncPending=true on a retryable failure (failed:database)', async () => {
    mockSyncRecordToNormalizedSchema.mockResolvedValue({ status: 'failed:database', message: 'boom' });
    const payload = makePayload();

    window.rtcSaveDelegate(payload);

    await vi.waitFor(() => {
      expect(state.records[0].normalizedSyncPending).toBe(true);
    });
    expect(state.records[0]).not.toHaveProperty('normalizedSyncedAt');
  });

  it('does not set normalizedSyncPending on a non-retryable failure (failed:validation)', async () => {
    mockSyncRecordToNormalizedSchema.mockResolvedValue({ status: 'failed:validation', errors: ['mood must be 0-5'] });
    const payload = makePayload();

    window.rtcSaveDelegate(payload);

    await vi.waitFor(() => {
      expect(window.__IPPO_LAST_NORMALIZED_WRITE_RESULT__).toEqual({
        status: 'failed:validation',
        errors: ['mood must be 0-5'],
      });
    });
    expect(state.records[0].normalizedSyncPending).toBeUndefined();
  });

  it('legacy save proceeds independently even when normalized sync fails', async () => {
    mockSyncRecordToNormalizedSchema.mockResolvedValue({ status: 'failed:database' });
    const payload = makePayload();

    window.rtcSaveDelegate(payload);

    // syncRecordImmediately (legacy) is called synchronously within the same tick,
    // regardless of how the normalized sync eventually resolves.
    expect(mockSyncRecordImmediately).toHaveBeenCalledTimes(1);
    expect(mockSyncRecordImmediately).toHaveBeenCalledWith(state.records[0]);
  });
});
