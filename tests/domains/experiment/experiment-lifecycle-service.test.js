// tests/domains/experiment/experiment-lifecycle-service.test.js
// PR-EXP-RUNTIME-04 (Founder Decision 1): ExperimentLifecycleService is the sole
// state machine authority (DRAFT → ACTIVE → COMPLETED/ABANDONED).
import { describe, it, expect, beforeEach } from 'vitest';
import { ExperimentLifecycleService } from '../../../src/domains/experiment/experiment-lifecycle-service.js';
import { InvalidTransitionError }     from '../../../src/domains/experiment/experiment-state-machine.js';

class FakeExperimentRepository {
  #byId = new Map();

  seed(experiment) { this.#byId.set(experiment.id, { ...experiment }); }
  async findById(id) { return this.#byId.get(id) ?? null; }
  async update(id, patch) {
    const existing = this.#byId.get(id);
    if (!existing) throw new Error(`not found: ${id}`);
    const updated = { ...existing, ...patch };
    this.#byId.set(id, updated);
    return updated;
  }
}

describe('ExperimentLifecycleService', () => {
  let repo;
  let svc;

  beforeEach(() => {
    repo = new FakeExperimentRepository();
    svc  = new ExperimentLifecycleService(repo);
  });

  it('DRAFT → ACTIVE 遷移が成功する', async () => {
    repo.seed({ id: 'e1', status: 'DRAFT' });
    const updated = await svc.start('e1');
    expect(updated.status).toBe('ACTIVE');
  });

  it('ACTIVE → COMPLETED 遷移が成功し、actualEndDateが設定される', async () => {
    repo.seed({ id: 'e1', status: 'ACTIVE' });
    const updated = await svc.complete('e1', '2026-08-01');
    expect(updated.status).toBe('COMPLETED');
    expect(updated.actualEndDate).toBe('2026-08-01');
  });

  it('ACTIVE → ABANDONED 遷移が成功する', async () => {
    repo.seed({ id: 'e1', status: 'ACTIVE' });
    const updated = await svc.abandon('e1', '中断理由');
    expect(updated.status).toBe('ABANDONED');
  });

  it('DRAFT → COMPLETED は不正な遷移としてInvalidTransitionErrorを投げる', async () => {
    repo.seed({ id: 'e1', status: 'DRAFT' });
    await expect(svc.complete('e1')).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('COMPLETED は終端状態のため、そこからの遷移は拒否される', async () => {
    repo.seed({ id: 'e1', status: 'COMPLETED' });
    await expect(svc.start('e1')).rejects.toBeInstanceOf(InvalidTransitionError);
    await expect(svc.abandon('e1')).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('ABANDONED は終端状態のため、そこからの遷移は拒否される', async () => {
    repo.seed({ id: 'e1', status: 'ABANDONED' });
    await expect(svc.complete('e1')).rejects.toBeInstanceOf(InvalidTransitionError);
  });

  it('存在しないIDはエラーを投げる', async () => {
    await expect(svc.start('missing')).rejects.toThrow('not found');
  });
});
