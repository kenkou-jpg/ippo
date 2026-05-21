// tests/runtime/runtime-modes.test.js
// ─────────────────────────────────────────────────────────────
// Runtime mode transition tests
//
// Validates the mode state machine logic independently from
// the full controller (no window.ippoBrain dependency).
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

const MODES = Object.freeze({
  NORMAL:       'NORMAL_MODE',
  DEBUG:        'DEBUG_MODE',
  SAFE:         'SAFE_MODE',
  SAFE_STARTUP: 'SAFE_STARTUP_MODE',
  SAFE_CLOUD:   'SAFE_CLOUD_MODE',
  LOW_RUNTIME:  'LOW_RUNTIME_MODE',
  RECOVERY:     'RECOVERY_MODE',
});

const MODE_TRANSITIONS = {
  'NORMAL_MODE':       ['DEBUG_MODE', 'SAFE_MODE', 'SAFE_STARTUP_MODE', 'SAFE_CLOUD_MODE', 'LOW_RUNTIME_MODE', 'RECOVERY_MODE'],
  'DEBUG_MODE':        ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
  'SAFE_MODE':         ['NORMAL_MODE', 'RECOVERY_MODE', 'SAFE_STARTUP_MODE', 'SAFE_CLOUD_MODE'],
  'SAFE_STARTUP_MODE': ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
  'SAFE_CLOUD_MODE':   ['NORMAL_MODE', 'SAFE_MODE', 'RECOVERY_MODE'],
  'LOW_RUNTIME_MODE':  ['NORMAL_MODE', 'SAFE_MODE', 'SAFE_CLOUD_MODE', 'RECOVERY_MODE'],
  'RECOVERY_MODE':     ['NORMAL_MODE', 'SAFE_MODE'],
};

function canTransition(from, to) {
  return (MODE_TRANSITIONS[from] || []).includes(to);
}

describe('Mode Transition Matrix', () => {
  it('NORMAL → SAFE_CLOUD is allowed (supabaseUserId unresolved)', () => {
    expect(canTransition(MODES.NORMAL, MODES.SAFE_CLOUD)).toBe(true);
  });

  it('SAFE_CLOUD → NORMAL is allowed (auth resolved)', () => {
    expect(canTransition(MODES.SAFE_CLOUD, MODES.NORMAL)).toBe(true);
  });

  it('NORMAL → RECOVERY is allowed (critical error)', () => {
    expect(canTransition(MODES.NORMAL, MODES.RECOVERY)).toBe(true);
  });

  it('RECOVERY → NORMAL is allowed (recovered)', () => {
    expect(canTransition(MODES.RECOVERY, MODES.NORMAL)).toBe(true);
  });

  it('RECOVERY → SAFE_CLOUD is NOT allowed (no direct path)', () => {
    expect(canTransition(MODES.RECOVERY, MODES.SAFE_CLOUD)).toBe(false);
  });

  it('SAFE_CLOUD → LOW_RUNTIME is NOT allowed (no direct path)', () => {
    expect(canTransition(MODES.SAFE_CLOUD, MODES.LOW_RUNTIME)).toBe(false);
  });
});

describe('SAFE_MODE Scenario', () => {
  it('entering SAFE_MODE from NORMAL is valid', () => {
    expect(canTransition(MODES.NORMAL, MODES.SAFE)).toBe(true);
  });

  it('exiting SAFE_MODE to NORMAL is valid (recovery)', () => {
    expect(canTransition(MODES.SAFE, MODES.NORMAL)).toBe(true);
  });

  it('SAFE_MODE can escalate to RECOVERY', () => {
    expect(canTransition(MODES.SAFE, MODES.RECOVERY)).toBe(true);
  });
});

describe('SAFE_CLOUD_MODE Scenario', () => {
  it('lifecycle: NORMAL → SAFE_CLOUD → NORMAL (auth arrives late)', () => {
    let mode = MODES.NORMAL;
    // supabaseUserId not ready
    expect(canTransition(mode, MODES.SAFE_CLOUD)).toBe(true);
    mode = MODES.SAFE_CLOUD;
    // auth becomes ready
    expect(canTransition(mode, MODES.NORMAL)).toBe(true);
    mode = MODES.NORMAL;
    expect(mode).toBe(MODES.NORMAL);
  });
});

describe('RECOVERY_MODE Scenario', () => {
  it('lifecycle: NORMAL → RECOVERY → SAFE → NORMAL', () => {
    let mode = MODES.NORMAL;
    expect(canTransition(mode, MODES.RECOVERY)).toBe(true);
    mode = MODES.RECOVERY;
    expect(canTransition(mode, MODES.SAFE)).toBe(true);
    mode = MODES.SAFE;
    expect(canTransition(mode, MODES.NORMAL)).toBe(true);
  });
});
