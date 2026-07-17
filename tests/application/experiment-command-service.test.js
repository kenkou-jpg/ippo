// tests/application/experiment-command-service.test.js
// PR-EXP-RUNTIME-04 (Founder Decision 1/2): ExperimentCommandService is a thin
// Application Service — it never sets `status` itself; create() always starts
// in DRAFT, update() strips any status field, and start/complete/abandon
// delegate exclusively to ExperimentLifecycleService.
import { describe, it, expect, vi } from 'vitest';
import { ExperimentCommandService } from '../../src/application/experiment-command-service.js';

function fakeRepo() {
  return {
    save:   vi.fn(async (e) => ({ id: 'e1', ...e })),
    update: vi.fn(async (id, patch) => ({ id, ...patch })),
    delete: vi.fn(async () => {}),
  };
}

function fakeLifecycle() {
  return {
    start:    vi.fn(async (id) => ({ id, status: 'ACTIVE' })),
    complete: vi.fn(async (id, end) => ({ id, status: 'COMPLETED', actualEndDate: end })),
    abandon:  vi.fn(async (id, reason, end) => ({ id, status: 'ABANDONED', reason, actualEndDate: end })),
  };
}

describe('ExperimentCommandService.create', () => {
  it('statusを指定しない場合、DRAFTで作成される', async () => {
    const repo = fakeRepo();
    const svc  = new ExperimentCommandService(repo, fakeLifecycle());
    await svc.create({ title: 'X' });
    expect(repo.save).toHaveBeenCalledWith({ title: 'X', status: 'DRAFT' });
  });

  it('呼び出し元がstatus:ACTIVE等を渡しても無視されDRAFTで作成される（正規4status以外の混入防止）', async () => {
    const repo = fakeRepo();
    const svc  = new ExperimentCommandService(repo, fakeLifecycle());
    await svc.create({ title: 'X', status: 'ACTIVE' });
    expect(repo.save).toHaveBeenCalledWith({ title: 'X', status: 'DRAFT' });
  });
});

describe('ExperimentCommandService.update', () => {
  it('statusフィールドは常に取り除かれる（状態遷移はstart/complete/abandon経由のみ）', async () => {
    const repo = fakeRepo();
    const svc  = new ExperimentCommandService(repo, fakeLifecycle());
    await svc.update('e1', { title: 'Y', status: 'COMPLETED' });
    expect(repo.update).toHaveBeenCalledWith('e1', { title: 'Y' });
  });
});

describe('ExperimentCommandService — lifecycle delegation', () => {
  it('start()はExperimentLifecycleService.start()へ委譲する', async () => {
    const lifecycle = fakeLifecycle();
    const svc = new ExperimentCommandService(fakeRepo(), lifecycle);
    const result = await svc.start('e1');
    expect(lifecycle.start).toHaveBeenCalledWith('e1');
    expect(result.status).toBe('ACTIVE');
  });

  it('complete()はExperimentLifecycleService.complete()へ委譲する', async () => {
    const lifecycle = fakeLifecycle();
    const svc = new ExperimentCommandService(fakeRepo(), lifecycle);
    const result = await svc.complete('e1', '2026-08-01');
    expect(lifecycle.complete).toHaveBeenCalledWith('e1', '2026-08-01');
    expect(result.status).toBe('COMPLETED');
  });

  it('abandon()はExperimentLifecycleService.abandon()へ委譲する', async () => {
    const lifecycle = fakeLifecycle();
    const svc = new ExperimentCommandService(fakeRepo(), lifecycle);
    const result = await svc.abandon('e1', '理由', '2026-08-01');
    expect(lifecycle.abandon).toHaveBeenCalledWith('e1', '理由', '2026-08-01');
    expect(result.status).toBe('ABANDONED');
  });

  it('lifecycleServiceが未配線の場合、start/complete/abandonはエラーを投げる（後方互換: 単一引数構築を許容しつつ誤用を防ぐ）', async () => {
    const svc = new ExperimentCommandService(fakeRepo()); // lifecycleService省略
    await expect(svc.start('e1')).rejects.toThrow('not wired');
    await expect(svc.complete('e1')).rejects.toThrow('not wired');
    await expect(svc.abandon('e1')).rejects.toThrow('not wired');
  });

  it('create/update/deleteはlifecycleServiceが未配線でも動作する（状態遷移を伴わないため）', async () => {
    const repo = fakeRepo();
    const svc  = new ExperimentCommandService(repo); // lifecycleService省略
    await expect(svc.create({ title: 'X' })).resolves.toBeDefined();
    await expect(svc.update('e1', { title: 'Y' })).resolves.toBeDefined();
    await expect(svc.delete('e1')).resolves.toBeUndefined();
  });
});
