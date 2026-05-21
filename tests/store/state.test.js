// tests/store/state.test.js
// ─────────────────────────────────────────────────────────────
// State store unit tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Isolate module state by re-importing fresh each test
let getState, setState, saveState, loadState, INITIAL_STATE, STATE_KEY;

beforeEach(async () => {
  // Reset localStorage
  localStorage.clear();
  // Reset window hooks to avoid cross-test pollution
  window._ippoStateHooks = [];

  // Re-import to get a fresh module (vitest module cache reset)
  vi.resetModules();
  const mod = await import('../../src/store/state.js');
  getState      = mod.getState;
  setState      = mod.setState;
  saveState     = mod.saveState;
  loadState     = mod.loadState;
  INITIAL_STATE = mod.INITIAL_STATE;
  STATE_KEY     = mod.STATE_KEY;
});

describe('getState', () => {
  it('returns an object with INITIAL_STATE defaults when uninitialised', () => {
    const s = getState();
    expect(s.records).toEqual([]);
    expect(s.streak).toBe(0);
    expect(s.name).toBe('');
  });

  it('returns the same reference on repeated calls', () => {
    expect(getState()).toBe(getState());
  });
});

describe('setState', () => {
  it('updates state', () => {
    setState({ ...getState(), name: 'テスト' });
    expect(getState().name).toBe('テスト');
  });

  it('preserves records array reference after update', () => {
    const records = [{ id: '1', record_date: '2025-01-01', painLevel: 2 }];
    setState({ ...getState(), records });
    expect(getState().records).toHaveLength(1);
  });

  it('a hook returning false blocks setState', () => {
    window._ippoStateHooks.push(() => false);
    const originalName = getState().name;
    setState({ ...getState(), name: 'blocked' });
    expect(getState().name).toBe(originalName);
  });
});

describe('saveState / loadState', () => {
  it('round-trips state through localStorage', () => {
    setState({ ...getState(), name: '保存テスト', streak: 7 });
    saveState();
    const raw = localStorage.getItem(STATE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.name).toBe('保存テスト');
    expect(parsed.streak).toBe(7);
  });

  it('loadState restores saved state', () => {
    setState({ ...getState(), streak: 42 });
    saveState();
    // Simulate fresh page: reset state
    setState({ ...INITIAL_STATE });
    expect(getState().streak).toBe(0);
    loadState();
    expect(getState().streak).toBe(42);
  });

  it('loadState handles malformed JSON gracefully', () => {
    localStorage.setItem(STATE_KEY, 'not-json');
    expect(() => loadState()).not.toThrow();
    expect(getState().records).toEqual([]);
  });
});
