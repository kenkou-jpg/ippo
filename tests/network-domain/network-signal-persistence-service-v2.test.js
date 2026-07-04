// tests/network-domain/network-signal-persistence-service-v2.test.js
// NetworkSignalPersistenceService — Wave2 Decorator (PR-041)
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NetworkSignalPersistenceService } from '../../src/domains/network/network-signal-persistence-service.js';
import { NetworkSignalMemoryRepository }   from '../../src/domains/network/network-signal-memory-repository.js';
import { INetworkSignalRepository }        from '../../src/domains/network/network-signal-repository-interface.js';
import { buildNetworkSignal }              from '../../src/domains/network/network-signal-entity.js';

function makeSignal(overrides = {}) {
  return buildNetworkSignal({
    signalType: 'SYMPTOM', normalizedValue: 0.5, rawValue: 5, unit: 'severity_0_10',
    ...overrides,
  });
}

function makeService(opts = {}) {
  return new NetworkSignalPersistenceService({
    repository: opts.repository ?? new NetworkSignalMemoryRepository(),
    eventPublisher: opts.eventPublisher ?? null,
  });
}

describe('NetworkSignalPersistenceService — construction', () => {
  it('throws without repository', () => {
    expect(() => new NetworkSignalPersistenceService({})).toThrow('repository is required');
  });

  it('throws when repository does not extend INetworkSignalRepository', () => {
    expect(() => new NetworkSignalPersistenceService({ repository: {} }))
      .toThrow('must implement INetworkSignalRepository');
  });

  it('constructs successfully with a valid repository', () => {
    expect(() => makeService()).not.toThrow();
  });

  it('is an instance of INetworkSignalRepository (Decorator pattern)', () => {
    expect(makeService()).toBeInstanceOf(INetworkSignalRepository);
  });
});

describe('NetworkSignalPersistenceService — INetworkSignalRepository delegation', () => {
  it('append() stores signal and returns it', () => {
    const svc = makeService();
    const s = makeSignal();
    expect(svc.append(s)).toBe(s);
    expect(svc.count).toBe(1);
  });

  it('findAll() returns all appended signals', () => {
    const svc = makeService();
    svc.append(makeSignal());
    svc.append(makeSignal({ signalType: 'PAIN' }));
    expect(svc.findAll()).toHaveLength(2);
  });

  it('findByRecord() delegates correctly', () => {
    const svc = makeService();
    svc.append(makeSignal({ recordId: 'rec_X' }));
    svc.append(makeSignal({ recordId: 'rec_Y' }));
    expect(svc.findByRecord('rec_X')).toHaveLength(1);
  });

  it('findByType() delegates correctly', () => {
    const svc = makeService();
    svc.append(makeSignal({ signalType: 'SLEEP' }));
    svc.append(makeSignal({ signalType: 'PAIN' }));
    expect(svc.findByType('SLEEP')).toHaveLength(1);
  });

  it('repositoryType reflects backing repository', () => {
    expect(makeService().repositoryType).toBe('memory');
  });

  it('capabilities reflects backing repository', () => {
    expect(makeService().capabilities).toEqual({ appendOnly: true, persistent: false, supabase: false });
  });
});

describe('NetworkSignalPersistenceService — Event Publishing', () => {
  it('publishes SIGNAL_CREATED event on append when eventPublisher is wired', () => {
    const publish = vi.fn();
    const svc = makeService({ eventPublisher: { publish } });
    svc.append(makeSignal());
    expect(publish).toHaveBeenCalledOnce();
    const event = publish.mock.calls[0][0];
    expect(event.eventType).toBe('SIGNAL_CREATED');
    expect(event.aggregateType).toBe('SIGNAL');
    expect(event.payload.signalType).toBe('SYMPTOM');
  });

  it('does NOT publish event when eventPublisher is null', () => {
    const svc = makeService({ eventPublisher: null });
    expect(() => svc.append(makeSignal())).not.toThrow();
  });

  it('event publishing failure does not fail the append', () => {
    const badPublisher = { publish: () => { throw new Error('bus failure'); } };
    const svc = makeService({ eventPublisher: badPublisher });
    const s = makeSignal();
    expect(svc.append(s)).toBe(s);
    expect(svc.count).toBe(1);
  });
});

describe('NetworkSignalPersistenceService — initialize() Migration', () => {
  it('returns alreadyInitialized:false on first call', () => {
    const result = makeService().initialize();
    expect(result.alreadyInitialized).toBe(false);
  });

  it('returns alreadyInitialized:true on second call', () => {
    const svc = makeService();
    svc.initialize();
    expect(svc.initialize().alreadyInitialized).toBe(true);
  });

  it('migrates signals from migrationSource on initialize()', () => {
    const source = { findAll: () => [makeSignal(), makeSignal({ signalType: 'PAIN' })] };
    const svc = makeService();
    const result = svc.initialize({ migrationSource: source });
    expect(result.migrated).toBe(2);
    expect(svc.count).toBe(2);
  });

  it('does NOT publish events for migrated signals', () => {
    const publish = vi.fn();
    const source = { findAll: () => [makeSignal()] };
    const svc = makeService({ eventPublisher: { publish } });
    svc.initialize({ migrationSource: source });
    expect(publish).not.toHaveBeenCalled();
  });

  it('initialize without source returns migrated:0', () => {
    const result = makeService().initialize({ migrationSource: null });
    expect(result.migrated).toBe(0);
  });

  it('subsequent appends after migration publish events normally', () => {
    const publish = vi.fn();
    const source = { findAll: () => [makeSignal()] };
    const svc = makeService({ eventPublisher: { publish } });
    svc.initialize({ migrationSource: source });
    svc.append(makeSignal());
    expect(publish).toHaveBeenCalledOnce();
  });
});

describe('NetworkSignalPersistenceService — getStatus()', () => {
  it('returns status object with required fields', () => {
    const status = makeService().getStatus();
    expect(status.repositoryType).toBe('memory');
    expect(status.signalCount).toBe(0);
    expect(status.eventPublisherWired).toBe(false);
    expect(status.initialized).toBe(false);
    expect(status.wave).toContain('Wave2');
    expect(status.bd022).toBeTruthy();
  });

  it('initialized becomes true after initialize() call', () => {
    const svc = makeService();
    svc.initialize();
    expect(svc.getStatus().initialized).toBe(true);
  });

  it('signalCount reflects current count', () => {
    const svc = makeService();
    svc.append(makeSignal());
    svc.append(makeSignal());
    expect(svc.getStatus().signalCount).toBe(2);
  });
});
