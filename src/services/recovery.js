// ============================================================
//  ippo – src/services/recovery.js
//  Phase E (Step 4): 起動時自動復元チェック
//
//  autoRecoveryCheck() を app.html から移植。
//  idbGetAllRecords / mergeRecords / manualCloudRestore /
//  showRecoveryBanner / saveState はまだ app.html / store 側に
//  残るため移行期間中は window.* 経由で委譲する。
// ============================================================

import { saveState } from '../store/state.js';

export function autoRecoveryCheck() {
  var s = (typeof window.getState === 'function' ? window.getState() : null) || {};
  var lastCount    = parseInt(localStorage.getItem('ippo_last_record_count') || '0');
  var currentCount = (s.records || []).length;

  if (lastCount > 0 && currentCount < lastCount && lastCount - currentCount >= 2) {
    console.warn('データ減少検知: ' + lastCount + '件→' + currentCount + '件');

    var idbGetAll = typeof window.idbGetAllRecords === 'function'
      ? window.idbGetAllRecords()
      : Promise.resolve([]);

    return idbGetAll.then(function (idbRecs) {
      var activeRecs = idbRecs.filter(function (r) { return !r.deleted_at; });

      if (activeRecs.length > currentCount) {
        var merge = typeof window.mergeRecords === 'function'
          ? window.mergeRecords
          : function (a, b) { return a.concat(b); };
        s.records = merge(s.records, activeRecs);
        saveState();
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, s.records.length);
        console.log('IndexedDBから自動復元: ' + s.records.length + '件');
        localStorage.setItem('ippo_last_record_count', String(s.records.length));
        return true;
      }

      var cloudRestore = typeof window.manualCloudRestore === 'function'
        ? window.manualCloudRestore()
        : Promise.resolve();

      return cloudRestore.then(function () {
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, ((typeof window.getState === 'function' ? window.getState() : null) || {}).records ? ((typeof window.getState === 'function' ? window.getState() : null) || {}).records.length : 0);
        localStorage.setItem('ippo_last_record_count', String(((typeof window.getState === 'function' ? window.getState() : null) || {}).records ? ((typeof window.getState === 'function' ? window.getState() : null) || {}).records.length : 0));
        return true;
      });
    }).catch(function (e) {
      console.warn('自動復元失敗:', e);
      if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(false, 0);
      return false;
    });
  }

  localStorage.setItem('ippo_last_record_count', String(currentCount));
  return Promise.resolve(false);
}

window.autoRecoveryCheck = autoRecoveryCheck;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('recovery-module-loaded');
}
