// ============================================================
//  ippo – src/services/storage-migration.js
//  Phase E (Step 4): localStorage → IndexedDB 移行処理
//
//  migrateToIDB() を app.html から移植。
//  ensureRecordIds / idbPutRecord はまだ app.html に残るため
//  移行期間中は window.* 経由で委譲する。
// ============================================================

import { getState } from '../store/state.js';

export function migrateToIDB() {
  if (localStorage.getItem('ippo_idb_migrated')) return Promise.resolve();
  var s = getState() || {};
  if (typeof window.ensureRecordIds === 'function') window.ensureRecordIds();
  var records = s.records || [];
  var promises = records.map(function (r) {
    return typeof window.idbPutRecord === 'function'
      ? window.idbPutRecord(r)
      : Promise.resolve();
  });
  return Promise.all(promises).then(function () {
    localStorage.setItem('ippo_idb_migrated', '1');
    console.log('IndexedDB移行完了:', records.length + '件');
  }).catch(function (e) {
    console.warn('IndexedDB移行失敗:', e);
  });
}

window.migrateToIDB = migrateToIDB;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('storage-migration-module-loaded');
}
