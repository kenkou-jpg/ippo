// tests/runtime/cloud-restore.test.js
// ─────────────────────────────────────────────────────────────
// Cloud restore decision logic tests
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Merge logic mirroring supabase.js / app-bootstrap.js ─────

function mergeCloudIntoLocal(localRecords, cloudRecords) {
  if (!cloudRecords || cloudRecords.length === 0) return localRecords;
  // Safety: never replace more records with fewer
  if (localRecords.length > cloudRecords.length) return localRecords;
  // Merge: cloud wins if it has more records
  return cloudRecords;
}

function shouldRestoreCloud(supabaseUserId, cloudRestoreFailed) {
  if (!supabaseUserId) return false;          // not logged in
  if (cloudRestoreFailed) return false;       // already failed this session
  return true;
}

// ── shouldRestoreCloud ────────────────────────────────────────

describe('shouldRestoreCloud', () => {
  it('returns false when not logged in', () => {
    expect(shouldRestoreCloud(null, false)).toBe(false);
    expect(shouldRestoreCloud(undefined, false)).toBe(false);
    expect(shouldRestoreCloud('', false)).toBe(false);
  });

  it('returns false when cloud restore already failed', () => {
    expect(shouldRestoreCloud('user-id-123', true)).toBe(false);
  });

  it('returns true when logged in and no prior failure', () => {
    expect(shouldRestoreCloud('user-id-123', false)).toBe(true);
  });
});

// ── mergeCloudIntoLocal ───────────────────────────────────────

describe('mergeCloudIntoLocal', () => {
  const localBig  = new Array(30).fill(0).map((_, i) => ({ id: 'local-' + i }));
  const cloudSmall = new Array(5).fill(0).map((_, i) => ({ id: 'cloud-' + i }));
  const cloudBig  = new Array(40).fill(0).map((_, i) => ({ id: 'cloud-' + i }));

  it('keeps local when cloud has fewer records (local wins)', () => {
    const result = mergeCloudIntoLocal(localBig, cloudSmall);
    expect(result).toBe(localBig);
    expect(result.length).toBe(30);
  });

  it('uses cloud when cloud has more records', () => {
    const result = mergeCloudIntoLocal(localBig, cloudBig);
    expect(result).toBe(cloudBig);
    expect(result.length).toBe(40);
  });

  it('returns local when cloud is empty (no wipe)', () => {
    const result = mergeCloudIntoLocal(localBig, []);
    expect(result).toBe(localBig);
  });

  it('returns local when cloud is null/undefined (no wipe)', () => {
    expect(mergeCloudIntoLocal(localBig, null)).toBe(localBig);
    expect(mergeCloudIntoLocal(localBig, undefined)).toBe(localBig);
  });
});

// ── Cloud restore timeout simulation ─────────────────────────

describe('Cloud restore timeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('restore times out after 15s and marks failure flag', () => {
    let cloudRestoreFailed = false;
    const RESTORE_TIMEOUT_MS = 15000;

    const timer = setTimeout(() => {
      cloudRestoreFailed = true;
    }, RESTORE_TIMEOUT_MS);

    vi.advanceTimersByTime(14999);
    expect(cloudRestoreFailed).toBe(false);

    vi.advanceTimersByTime(2);
    expect(cloudRestoreFailed).toBe(true);
    clearTimeout(timer);
  });
});
