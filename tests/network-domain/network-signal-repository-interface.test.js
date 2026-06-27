// tests/network-domain/network-signal-repository-interface.test.js
// INetworkSignalRepository — interface contract tests (PR-041)
import { describe, it, expect } from 'vitest';
import { INetworkSignalRepository } from '../../src/domains/network/network-signal-repository-interface.js';

describe('INetworkSignalRepository — base interface', () => {
  it('append() throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.append({})).toThrow('not implemented');
  });

  it('findAll() throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.findAll()).toThrow('not implemented');
  });

  it('findByRecord() throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.findByRecord('rec_1')).toThrow('not implemented');
  });

  it('findByType() throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.findByType('SYMPTOM')).toThrow('not implemented');
  });

  it('count getter throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.count).toThrow('not implemented');
  });

  it('repositoryType getter throws when not overridden', () => {
    const iface = new INetworkSignalRepository();
    expect(() => iface.repositoryType).toThrow('not implemented');
  });

  it('capabilities returns default { appendOnly, persistent, supabase }', () => {
    const iface = new INetworkSignalRepository();
    expect(iface.capabilities).toEqual({ appendOnly: true, persistent: false, supabase: false });
  });
});

describe('INetworkSignalRepository — implementation contract', () => {
  it('subclass not implementing append() throws on call', () => {
    class BadRepo extends INetworkSignalRepository {}
    expect(() => new BadRepo().append({})).toThrow('not implemented');
  });

  it('subclass implementing all methods does not throw', () => {
    class GoodRepo extends INetworkSignalRepository {
      #items = [];
      append(s)         { this.#items.push(s); return s; }
      findAll()         { return [...this.#items]; }
      findByRecord(id)  { return this.#items.filter(x => x.recordId === id); }
      findByType(t)     { return this.#items.filter(x => x.signalType === t); }
      get count()       { return this.#items.length; }
      get repositoryType() { return 'test'; }
    }
    const repo = new GoodRepo();
    const signal = { id: 's1', signalType: 'PAIN', recordId: 'r1' };
    expect(repo.append(signal)).toBe(signal);
    expect(repo.findAll()).toHaveLength(1);
    expect(repo.findByRecord('r1')).toHaveLength(1);
    expect(repo.findByType('PAIN')).toHaveLength(1);
    expect(repo.count).toBe(1);
    expect(repo.repositoryType).toBe('test');
  });
});
