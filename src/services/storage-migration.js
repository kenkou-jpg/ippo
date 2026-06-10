// ============================================================
//  ippo – src/services/storage-migration.js
//  Phase E (Step 4): localStorage → IndexedDB 移行処理
// ============================================================

import { getState } from '../store/state.js';
import { ensureRecordIds, idbPutRecord } from '../modules/record-repository.js';

export function migrateToIDB() {
  if (localStorage.getItem('ippo_idb_migrated')) return Promise.resolve();
  var s = getState() || {};
  ensureRecordIds();
  var records = s.records || [];
  var promises = records.map(function (r) { return idbPutRecord(r); });
  return Promise.allSettled(promises).then(function (results) {
    var failed = results.filter(function(r) { return r.status === 'rejected'; });
    if (failed.length > 0) {
      console.warn('IndexedDB移行: ' + failed.length + '件失敗', failed.map(function(r) { return r.reason; }));
    }
    var succeeded = results.length - failed.length;
    localStorage.setItem('ippo_idb_migrated', '1');
    console.log('IndexedDB移行完了: ' + succeeded + '/' + records.length + '件');
  });
}

window.migrateToIDB = migrateToIDB;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('storage-migration-module-loaded');
}
