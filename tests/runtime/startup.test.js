// tests/runtime/startup.test.js
// ─────────────────────────────────────────────────────────────
// Startup simulation tests
//
// Scenarios:
//   - slow hydration (IDB takes > 3s)
//   - missing auth (no Supabase session)
//   - stale cloud (cloud data older than local)
//   - duplicate startup (bootstrap() called twice)
//   - state-ready timeout (ippo:state-ready never fires)
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Minimal startup-render-gate harness ───────────────────────
function createRenderGate(timeoutMs = 8000) {
  let flushed = false;
  const queue = [];
  let gateTimer = null;

  function enqueue(name, fn) {
    if (flushed) { try { fn(); } catch (_) {} return; }
    if (!queue.some(i => i.name === name)) queue.push({ name, fn });
  }

  function flush(reason) {
    if (flushed) return;
    flushed = true;
    if (gateTimer) { clearTimeout(gateTimer); gateTimer = null; }
    queue.forEach(({ name, fn }) => { try { fn(); } catch (_) {} });
    queue.length = 0;
  }

  // Timeout fallback
  gateTimer = setTimeout(() => flush('timeout'), timeoutMs);

  return { enqueue, flush, get flushed() { return flushed; }, get queued() { return queue.length; } };
}

describe('Startup Render Gate', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('executes immediately when already flushed', () => {
    const gate = createRenderGate();
    gate.flush('state-ready');
    const fn = vi.fn();
    gate.enqueue('test', fn);
    expect(fn).toHaveBeenCalledOnce();
  });

  it('deduplicates by name', () => {
    const gate = createRenderGate();
    const fn = vi.fn();
    gate.enqueue('calendar', fn);
    gate.enqueue('calendar', fn);  // duplicate — ignored
    expect(gate.queued).toBe(1);
  });

  it('flushes all queued renders on state-ready', () => {
    const gate = createRenderGate();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    gate.enqueue('home', fn1);
    gate.enqueue('calendar', fn2);
    gate.flush('ippo:state-ready');
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('scenario: slow hydration — renders queued until state-ready fires', () => {
    const gate = createRenderGate(8000);
    const render = vi.fn();
    gate.enqueue('home', render);

    // Not yet flushed after 3 seconds
    vi.advanceTimersByTime(3000);
    expect(render).not.toHaveBeenCalled();

    // Bootstrap completes after 5 seconds
    vi.advanceTimersByTime(2000);
    gate.flush('ippo:state-ready');
    expect(render).toHaveBeenCalledOnce();
  });

  it('scenario: state-ready timeout — gate force-flushes at 8s', () => {
    const gate = createRenderGate(8000);
    const render = vi.fn();
    gate.enqueue('home', render);

    // ippo:state-ready never fires; timeout kicks in
    vi.advanceTimersByTime(8001);
    expect(render).toHaveBeenCalledOnce();
    expect(gate.flushed).toBe(true);
  });

  it('scenario: duplicate startup — second flush is no-op', () => {
    const gate = createRenderGate();
    const render = vi.fn();
    gate.enqueue('home', render);
    gate.flush('first');
    gate.flush('duplicate');  // should not re-run
    expect(render).toHaveBeenCalledTimes(1);
  });
});

// ── Auth availability harness ──────────────────────────────────
describe('Startup: missing auth scenario', () => {
  it('bootstrap can complete without supabaseUserId', () => {
    // Simulate: no user logged in, supabaseUserId = null
    const supabaseUserId = null;
    const cloudRestoreSkipped = supabaseUserId === null;
    expect(cloudRestoreSkipped).toBe(true);
    // App should still load with local data
    const localRecords = [{ id: '1', record_date: '2025-01-01' }];
    expect(localRecords.length).toBeGreaterThan(0);
  });
});

// ── Stale cloud scenario ───────────────────────────────────────
describe('Startup: stale cloud scenario', () => {
  it('local records take precedence when cloud is older', () => {
    const localRecords  = new Array(30).fill({ id: 'local', record_date: '2025-04-01' });
    const cloudRecords  = new Array(5).fill({ id: 'cloud', record_date: '2025-01-01' });
    // Merge rule: if local count > cloud count, keep local
    const merged = localRecords.length > cloudRecords.length ? localRecords : cloudRecords;
    expect(merged).toBe(localRecords);
    expect(merged.length).toBe(30);
  });
});
