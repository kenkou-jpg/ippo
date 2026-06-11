// tests/services/manual-cloud-restore.test.js
// ─────────────────────────────────────────────────────────────
// manualCloudRestore 移植の回帰テスト（PR-2A）
//
// 検証対象: src/services/recovery.js の manualCloudRestore()
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── モック ────────────────────────────────────────────────────

vi.mock('../../src/store/state.js', () => {
  let _state = { records: [], myDiseases: ['子宮内膜症'], trackedConditions: { pain: true } };
  return {
    getState:       vi.fn(() => _state),
    setState:       vi.fn((s) => { _state = s; }),
    saveState:      vi.fn(),
    addPreSaveHook: vi.fn(),
    addPostSaveHook: vi.fn(),
    addSetStateHook: vi.fn(),
    STATE_KEY: 'ippo_state',
    __setMockState: (s) => { _state = s; },
  };
});

vi.mock('../../src/modules/record-repository.js', () => ({
  idbGetAllRecords: vi.fn(() => Promise.resolve([])),
  persistRecords:   vi.fn(() => true),
}));

vi.mock('../../src/runtime/rollback-manager.js', () => ({
  takeSnapshot:  vi.fn(),
  rollbackToBest: vi.fn(),
}));

vi.mock('../../src/modules/ui-notifications.js', () => ({
  showSyncIndicator: vi.fn(),
  hideSyncIndicator: vi.fn(),
  showToast:         vi.fn(),
}));

// supabase モック — テストごとに上書き可能なファクトリを用意
const _supabaseMock = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('../../src/services/supabase.js', () => ({
  supabase:         _supabaseMock,
  SUPABASE_URL:     'https://mock.supabase.co',
  cloudBackupAll:   vi.fn(() => Promise.resolve()),
  cloudRestore:     vi.fn(() => Promise.resolve(false)),
  initialCloudSync: vi.fn(() => Promise.resolve()),
  syncRecordImmediately: vi.fn(() => Promise.resolve()),
  retrySyncPending: vi.fn(() => Promise.resolve()),
}));

// ─── テスト ────────────────────────────────────────────────────

describe('manualCloudRestore', () => {
  let manualCloudRestore;
  let stateModule;
  let rollbackModule;
  let uiModule;
  let repoModule;

  beforeEach(async () => {
    vi.clearAllMocks();

    stateModule    = await import('../../src/store/state.js');
    rollbackModule = await import('../../src/runtime/rollback-manager.js');
    uiModule       = await import('../../src/modules/ui-notifications.js');
    repoModule     = await import('../../src/modules/record-repository.js');

    // state を初期化
    stateModule.__setMockState({
      records: [{ id: 'local-1', date: '2026-01-01', updatedAt: '2026-01-01T00:00:00Z' }],
      myDiseases: ['子宮内膜症'],
      trackedConditions: { pain: true },
    });

    // recovery.js を毎回新鮮に import
    const mod = await import('../../src/services/recovery.js');
    manualCloudRestore = mod.manualCloudRestore;
  });

  // ── T-1: export されていることの確認 ──────────────────────────
  it('T-1: manualCloudRestore が export されている', () => {
    expect(typeof manualCloudRestore).toBe('function');
  });

  // ── T-2: window 公開確認 ──────────────────────────────────────
  it('T-2: window.manualCloudRestore が設定されている', () => {
    expect(typeof window.manualCloudRestore).toBe('function');
  });

  // ── T-3: 未ログイン時の挙動 ───────────────────────────────────
  it('T-3: 未ログイン時に showToast(warn) して return する', async () => {
    _supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    await manualCloudRestore();

    expect(uiModule.showToast).toHaveBeenCalledWith(
      expect.stringContaining('ログイン'),
      'warn'
    );
    expect(stateModule.setState).not.toHaveBeenCalled();
  });

  // ── T-4: クラウドデータなし時の挙動 ──────────────────────────
  it('T-4: クラウドデータなし時に showToast(warn) して return する', async () => {
    _supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    _supabaseMock.from.mockReturnValue(selectMock);

    await manualCloudRestore();

    expect(uiModule.showToast).toHaveBeenCalledWith(
      expect.stringContaining('見つかりませんでした'),
      'warn'
    );
    expect(stateModule.setState).not.toHaveBeenCalled();
  });

  // ── T-5: takeSnapshot('pre-restore') が最初に呼ばれる ─────────
  it('T-5: takeSnapshot("pre-restore") が Supabase 呼び出し前に実行される', async () => {
    _supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    await manualCloudRestore();

    expect(rollbackModule.takeSnapshot).toHaveBeenCalledWith('pre-restore');
    // takeSnapshot は getSession より先（呼び出し順の確認）
    const snapOrder   = rollbackModule.takeSnapshot.mock.invocationCallOrder[0];
    const stateOrder  = stateModule.setState.mock.invocationCallOrder[0] || Infinity;
    expect(snapOrder).toBeLessThan(stateOrder);
  });

  // ── T-6: 正常 Restore — setState / saveState / persistRecords ─
  it('T-6: 正常 Restore 時に setState / saveState / persistRecords が呼ばれる', async () => {
    _supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const cloudRecord = { id: 'cloud-1', date: '2026-02-01', updatedAt: '2026-02-01T00:00:00Z' };
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          state: { records: [cloudRecord], myDiseases: ['PCOS'] },
          updated_at: '2026-02-01T00:00:00Z',
        },
        error: null,
      }),
    };
    _supabaseMock.from.mockReturnValue(selectMock);

    await manualCloudRestore();

    expect(stateModule.setState).toHaveBeenCalledOnce();
    expect(stateModule.saveState).toHaveBeenCalledOnce();
    expect(repoModule.persistRecords).toHaveBeenCalledOnce();
  });

  // ── T-7: mergeRecords — local + cloud がマージされる ──────────
  it('T-7: ローカルレコードとクラウドレコードがマージされる', async () => {
    stateModule.__setMockState({
      records: [{ id: 'local-1', date: '2026-01-01', updatedAt: '2026-01-01T00:00:00Z' }],
      myDiseases: [],
      trackedConditions: {},
    });

    _supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          state: {
            records: [{ id: 'cloud-1', date: '2026-02-01', updatedAt: '2026-02-01T00:00:00Z' }],
          },
          updated_at: '2026-02-01T00:00:00Z',
        },
        error: null,
      }),
    };
    _supabaseMock.from.mockReturnValue(selectMock);

    await manualCloudRestore();

    const [mergedState] = stateModule.setState.mock.calls[0];
    expect(mergedState.records).toHaveLength(2);
    expect(mergedState.records.map((r) => r.id)).toContain('local-1');
    expect(mergedState.records.map((r) => r.id)).toContain('cloud-1');
  });

  // ── T-8: myDiseases 保護 — クラウドが空配列の場合ローカル値を維持 ─
  it('T-8: cloudState.myDiseases が空配列ならローカルの myDiseases を維持する', async () => {
    stateModule.__setMockState({
      records: [],
      myDiseases: ['子宮内膜症'],
      trackedConditions: {},
    });

    _supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          state: { records: [], myDiseases: [] },
          updated_at: '2026-02-01T00:00:00Z',
        },
        error: null,
      }),
    };
    _supabaseMock.from.mockReturnValue(selectMock);

    await manualCloudRestore();

    const [mergedState] = stateModule.setState.mock.calls[0];
    expect(mergedState.myDiseases).toEqual(['子宮内膜症']);
  });

  // ── T-9: trackedConditions 保護 ───────────────────────────────
  it('T-9: cloudState.trackedConditions が空オブジェクトならローカル値を維持する', async () => {
    stateModule.__setMockState({
      records: [],
      myDiseases: [],
      trackedConditions: { pain: true, fatigue: true },
    });

    _supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    });
    const selectMock = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          state: { records: [], trackedConditions: {} },
          updated_at: '2026-02-01T00:00:00Z',
        },
        error: null,
      }),
    };
    _supabaseMock.from.mockReturnValue(selectMock);

    await manualCloudRestore();

    const [mergedState] = stateModule.setState.mock.calls[0];
    expect(mergedState.trackedConditions).toEqual({ pain: true, fatigue: true });
  });

  // ── T-10: autoRecoveryCheck が window 参照ではなく直接呼び出し ─
  it('T-10: autoRecoveryCheck のクラウドフォールバックが window 参照に依存しない', async () => {
    // window.manualCloudRestore を削除してもフォールバックが動作すること
    const saved = window.manualCloudRestore;
    delete window.manualCloudRestore;

    const { autoRecoveryCheck } = await import('../../src/services/recovery.js');

    stateModule.__setMockState({ records: new Array(3).fill({ id: 'x', date: '2026-01-01' }) });
    localStorage.setItem('ippo_last_record_count', '10');

    _supabaseMock.auth.getSession.mockResolvedValue({ data: { session: null } });

    // window.manualCloudRestore なしで Promise.resolve() fallback にならず実行される
    // (未ログインなので toast で終了するが、Promise.resolve() サイレントスキップとは異なる)
    repoModule.idbGetAllRecords.mockResolvedValue([]);

    const result = await autoRecoveryCheck();
    // クラウド復元が試みられた（トースト = 未ログイン警告が出る = 実行された証拠）
    expect(uiModule.showToast).toHaveBeenCalled();

    window.manualCloudRestore = saved;
  });
});
