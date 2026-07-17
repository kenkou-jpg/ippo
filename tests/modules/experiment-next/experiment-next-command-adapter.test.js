// tests/modules/experiment-next/experiment-next-command-adapter.test.js
// PR-EXP-RUNTIME-06: 実験開始CTAの唯一の書込み経路。window.app.api経由のみ、
// create→startの非原子性・二重送信防止・エラー種別の区別を検証する。
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  EXPERIMENT_LIBRARY_PRESETS,
  startExperimentFromPreset,
  _resetInFlightGuardForTests,
} from '../../../src/modules/experiment-next/experiment-next-command-adapter.js';

function setApi(api) {
  window.app = { api };
}

describe('startExperimentFromPreset', () => {
  beforeEach(() => {
    _resetInFlightGuardForTests();
  });

  afterEach(() => {
    delete window.app;
    _resetInFlightGuardForTests();
  });

  it('window.app.apiが無い場合、runtime_not_initializedを返しAPIを呼ばない', async () => {
    delete window.app;
    const result = await startExperimentFromPreset('fast-16h');
    expect(result).toEqual({ ok: false, stage: 'runtime', reason: 'runtime_not_initialized' });
  });

  it('未知のpresetIdはvalidation失敗を返す', async () => {
    setApi({ createExperiment: vi.fn(), startExperiment: vi.fn() });
    const result = await startExperimentFromPreset('does-not-exist');
    expect(result).toEqual({ ok: false, stage: 'validation', reason: 'unknown_preset' });
  });

  it('create成功→start成功で正規4statusのexperimentを返す', async () => {
    const createExperiment = vi.fn(async () => ({ id: 'e1', status: 'DRAFT' }));
    const startExperiment  = vi.fn(async (id) => ({ id, status: 'ACTIVE' }));
    setApi({ createExperiment, startExperiment });

    const result = await startExperimentFromPreset('fast-16h');

    expect(result.ok).toBe(true);
    expect(result.experiment.status).toBe('ACTIVE');
    expect(createExperiment).toHaveBeenCalledOnce();
    expect(startExperiment).toHaveBeenCalledWith('e1');
  });

  it('createExperiment()へのpayloadは正規domainフィールド名のみ・legacy statusを含まない', async () => {
    const createExperiment = vi.fn(async (payload) => ({ id: 'e1', ...payload, status: 'DRAFT' }));
    const startExperiment  = vi.fn(async (id) => ({ id, status: 'ACTIVE' }));
    setApi({ createExperiment, startExperiment });

    await startExperimentFromPreset('no-caffeine');

    const payload = createExperiment.mock.calls[0][0];
    expect(payload.title).toBe('カフェイン断ち');
    expect(payload.hypothesis).toBeTruthy();
    expect(payload.diseaseKey).toBe('カフェイン');
    expect(payload.interventionType).toBe('avoid');
    expect(payload.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.plannedEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('factor');   // legacy field名
    expect(payload).not.toHaveProperty('condition'); // legacy field名
  });

  it('create失敗時はstartExperiment()を呼ばない', async () => {
    const createExperiment = vi.fn(async () => { throw new Error('boom'); });
    const startExperiment  = vi.fn();
    setApi({ createExperiment, startExperiment });

    const result = await startExperimentFromPreset('fast-16h');

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('create');
    expect(startExperiment).not.toHaveBeenCalled();
  });

  it('create成功→start失敗時はDRAFTを削除せず、draftIdを明示して失敗を返す', async () => {
    const createExperiment = vi.fn(async () => ({ id: 'draft-1', status: 'DRAFT' }));
    const startExperiment  = vi.fn(async () => { throw new Error('start boom'); });
    const deleteExperiment = vi.fn();
    setApi({ createExperiment, startExperiment, deleteExperiment });

    const result = await startExperimentFromPreset('fast-16h');

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('start');
    expect(result.draftId).toBe('draft-1');
    expect(deleteExperiment).not.toHaveBeenCalled();
  });

  it('AuthError（権限不足）はpermission stageとして区別される', async () => {
    const authError = Object.assign(new Error('Forbidden'), { name: 'AuthError', code: 'FORBIDDEN' });
    const createExperiment = vi.fn(async () => { throw authError; });
    setApi({ createExperiment, startExperiment: vi.fn() });

    const result = await startExperimentFromPreset('fast-16h');

    expect(result.ok).toBe(false);
    expect(result.stage).toBe('permission');
  });

  it('二重送信は後続呼び出しをguard stageで即座に拒否する', async () => {
    let resolveCreate;
    const createExperiment = vi.fn(() => new Promise((resolve) => { resolveCreate = resolve; }));
    const startExperiment  = vi.fn(async (id) => ({ id, status: 'ACTIVE' }));
    setApi({ createExperiment, startExperiment });

    const first  = startExperimentFromPreset('fast-16h');
    const second = await startExperimentFromPreset('fast-16h');

    expect(second).toEqual({ ok: false, stage: 'guard', reason: 'duplicate_request' });
    expect(createExperiment).toHaveBeenCalledOnce();

    resolveCreate({ id: 'e1', status: 'DRAFT' });
    const firstResult = await first;
    expect(firstResult.ok).toBe(true);
  });

  it('EXPERIMENT_LIBRARY_PRESETSはexperiment-next.htmlの4カードと一致するidを持つ', () => {
    const ids = EXPERIMENT_LIBRARY_PRESETS.map((p) => p.id);
    expect(ids).toEqual(['fast-16h', 'fast-14h', 'no-caffeine', 'no-dairy']);
  });
});
