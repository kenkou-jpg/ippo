// tests/network-domain/network-signal-migration.test.js
// Migration Layer — Wave1 Storage → Wave2 Repository (PR-041)
import { describe, it, expect } from 'vitest';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType: 'SYMPTOM', normalizedValue: 0.5, rawValue: 5, unit: 'severity_0_10',
    ...overrides,
  });
}

function makeWave1StorageSource(signals) {
  return { findAll: () => [...signals] };
}

describe('Migration Layer — Wave1 Storage → Wave2 Repository', () => {
  it('loads all Wave1 signals into the V2 repository on initialize()', () => {
    const legacy = [
      makeSignal({ signalType: 'SYMPTOM', recordId: 'r1' }),
      makeSignal({ signalType: 'PAIN',    recordId: 'r1' }),
      makeSignal({ signalType: 'SLEEP',   recordId: 'r2' }),
    ];
    const source = makeWave1StorageSource(legacy);
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });

    const result = svc.initialize({ migrationSource: source });

    expect(result.migrated).toBe(3);
    expect(svc.count).toBe(3);
  });

  it('migrated signals are queryable by record and type', () => {
    const legacy = [
      makeSignal({ signalType: 'PAIN',    recordId: 'rec_A' }),
      makeSignal({ signalType: 'SYMPTOM', recordId: 'rec_A' }),
      makeSignal({ signalType: 'SLEEP',   recordId: 'rec_B' }),
    ];
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
    svc.initialize({ migrationSource: makeWave1StorageSource(legacy) });

    expect(svc.findByRecord('rec_A')).toHaveLength(2);
    expect(svc.findByRecord('rec_B')).toHaveLength(1);
    expect(svc.findByType('PAIN')).toHaveLength(1);
    expect(svc.findByType('SLEEP')).toHaveLength(1);
  });

  it('new signals appended after migration coexist with migrated signals', () => {
    const legacy = [makeSignal({ signalType: 'PAIN' })];
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
    svc.initialize({ migrationSource: makeWave1StorageSource(legacy) });

    svc.append(makeSignal({ signalType: 'SLEEP' }));
    expect(svc.count).toBe(2);
    expect(svc.findByType('PAIN')).toHaveLength(1);
    expect(svc.findByType('SLEEP')).toHaveLength(1);
  });

  it('migration is idempotent — calling initialize() twice does not duplicate', () => {
    const legacy = [makeSignal(), makeSignal()];
    const source = makeWave1StorageSource(legacy);
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });

    svc.initialize({ migrationSource: source });
    svc.initialize({ migrationSource: source }); // second call is no-op

    expect(svc.count).toBe(2);
  });

  it('empty Wave1 storage results in zero migrated', () => {
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
    const result = svc.initialize({ migrationSource: makeWave1StorageSource([]) });
    expect(result.migrated).toBe(0);
    expect(svc.count).toBe(0);
  });

  it('preserves all signal fields through migration (Append-Only integrity)', () => {
    const original = makeSignal({ signalType: 'MENSTRUAL', recordId: 'rec_M', rawValue: 2 });
    const svc = new NetworkSignalPersistenceService({ repository: new NetworkSignalMemoryRepository() });
    svc.initialize({ migrationSource: makeWave1StorageSource([original]) });

    const [migrated] = svc.findAll();
    expect(migrated.id).toBe(original.id);
    expect(migrated.signalType).toBe('MENSTRUAL');
    expect(migrated.rawValue).toBe(2);
    expect(migrated.recordId).toBe('rec_M');
    expect(migrated.vectorVersion).toBe(original.vectorVersion);
  });
});
