// PR-TDZ-01: record-draft-guard.js no longer instantiates LocalStorageAdapter
// at module top-level (see docs/rebuild/STARTUP_TDZ_BLOCKER_INVESTIGATION.md).
// These tests guard against regressing back to eager instantiation and
// confirm the module's public behavior is unchanged.
import { readFileSync } from 'fs';
import { resolve } from 'path';

const jsSource = readFileSync(
  resolve(__dirname, '../../src/modules/record-draft-guard.js'),
  'utf8',
);

describe('record-draft-guard — PR-TDZ-01 lazy LocalStorageAdapter', () => {
  it('does not instantiate LocalStorageAdapter at module top-level', () => {
    // The only "new LocalStorageAdapter()" call must live inside a function
    // body (the lazy accessor), never as a bare top-level statement.
    expect(jsSource).not.toMatch(/^var \w+ = new LocalStorageAdapter\(\);/m);
    expect(jsSource).toContain('function _getDraftStorage()');
    expect(jsSource).toContain('if (!_draftStorage) _draftStorage = new LocalStorageAdapter();');
  });

  it('every former _draftStorage.* call site now goes through _getDraftStorage()', () => {
    // No bare "_draftStorage.get/set/remove" should remain outside the
    // accessor itself.
    const calls = jsSource.match(/_draftStorage\.(get|set|remove)\(/g) || [];
    expect(calls).toEqual([]);
    expect(jsSource.match(/_getDraftStorage\(\)\.(get|set|remove)\(/g)?.length).toBeGreaterThan(0);
  });

  it('importing the module does not throw (would have thrown pre-fix if evaluated on the affected chunk ordering)', async () => {
    vi.resetModules();
    await expect(import('../../src/modules/record-draft-guard.js')).resolves.toBeTruthy();
  });

  it('markRecordDirty/markRecordClean/isRecordDirty behave as before', async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/record-draft-guard.js');
    expect(mod.isRecordDirty()).toBe(false);
    mod.markRecordDirty();
    expect(mod.isRecordDirty()).toBe(true);
    mod.markRecordClean();
    expect(mod.isRecordDirty()).toBe(false);
  });

  it('checkAndShowDraftRestore() reads through the lazy adapter without throwing when no draft exists', async () => {
    vi.resetModules();
    localStorage.clear();
    const mod = await import('../../src/modules/record-draft-guard.js');
    expect(() => mod.checkAndShowDraftRestore()).not.toThrow();
  });

  it('checkAndShowDraftRestore() removes a stale (>24h) draft via the lazy adapter', async () => {
    vi.resetModules();
    localStorage.clear();
    localStorage.setItem(
      'ippo_record_draft',
      JSON.stringify({
        targetDate: '2026-01-01',
        draft: { record_date: '2026-01-01' },
        updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days old
        screen: 'record',
      }),
    );
    const mod = await import('../../src/modules/record-draft-guard.js');
    mod.checkAndShowDraftRestore();
    expect(localStorage.getItem('ippo_record_draft')).toBeNull();
  });
});
