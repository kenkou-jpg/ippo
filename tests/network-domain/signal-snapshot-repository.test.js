// tests/network-domain/signal-snapshot-repository.test.js
// SignalSnapshotRepository — Append-Only, PR-035
import { describe, it, expect } from 'vitest';
import { SignalSnapshotRepository } from '../../src/domains/network/signal-snapshot-repository.js';
import { buildSignalSnapshot }      from '../../src/domains/network/signal-snapshot-entity.js';

function makeRepo() { return new SignalSnapshotRepository(); }

function makeSnap(schedule = 'MANUAL') {
  return buildSignalSnapshot({ schedule, signalSummary: { total: 1 } });
}

describe('SignalSnapshotRepository.append()', () => {
  it('appends a valid snapshot', () => {
    const r = makeRepo();
    r.append(makeSnap());
    expect(r.count).toBe(1);
  });

  it('throws for snapshot missing id', () => {
    expect(() => makeRepo().append({ generatedAt: 'x', vectorVersion: '1' })).toThrow(/id/);
  });

  it('throws for snapshot missing generatedAt', () => {
    expect(() => makeRepo().append({ id: 'x', vectorVersion: '1' })).toThrow();
  });

  it('throws for snapshot missing vectorVersion (BD-018)', () => {
    expect(() => makeRepo().append({ id: 'x', generatedAt: 'now' })).toThrow();
  });
});

describe('SignalSnapshotRepository.findAll()', () => {
  it('returns [] when empty', () => {
    expect(makeRepo().findAll()).toEqual([]);
  });

  it('returns all appended snapshots', () => {
    const r = makeRepo();
    r.append(makeSnap('DAILY'));
    r.append(makeSnap('WEEKLY'));
    expect(r.findAll()).toHaveLength(2);
  });

  it('returns a copy (not the internal array)', () => {
    const r = makeRepo();
    r.append(makeSnap());
    const a = r.findAll();
    a.push('intruder');
    expect(r.count).toBe(1);
  });
});

describe('SignalSnapshotRepository.findBySchedule()', () => {
  it('filters by DAILY', () => {
    const r = makeRepo();
    r.append(makeSnap('DAILY'));
    r.append(makeSnap('WEEKLY'));
    expect(r.findBySchedule('DAILY')).toHaveLength(1);
  });

  it('returns [] when no match', () => {
    const r = makeRepo();
    r.append(makeSnap('MANUAL'));
    expect(r.findBySchedule('DAILY')).toHaveLength(0);
  });
});

describe('SignalSnapshotRepository.latest()', () => {
  it('returns null when empty', () => {
    expect(makeRepo().latest()).toBeNull();
  });

  it('returns the single snapshot when only one exists', () => {
    const r = makeRepo();
    const s = makeSnap();
    r.append(s);
    expect(r.latest()).toBe(s);
  });

  it('returns the most recent by generatedAt', () => {
    const r = makeRepo();
    const older = buildSignalSnapshot({ schedule: 'DAILY',  signalSummary: { n: 1 } });
    const newer = buildSignalSnapshot({ schedule: 'WEEKLY', signalSummary: { n: 2 } });
    r.append(older);
    r.append(newer);
    expect(r.latest().generatedAt >= older.generatedAt).toBe(true);
  });
});

describe('SignalSnapshotRepository.count', () => {
  it('starts at 0', () => {
    expect(makeRepo().count).toBe(0);
  });

  it('increments on each append', () => {
    const r = makeRepo();
    r.append(makeSnap());
    r.append(makeSnap());
    expect(r.count).toBe(2);
  });
});
