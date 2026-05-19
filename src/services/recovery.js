// ============================================================
//  ippo – src/services/recovery.js
//  Phase E (Step 4): 起動時自動復元チェック
//
//  autoRecoveryCheck() を app.html から移植。
//  idbGetAllRecords / mergeRecords / manualCloudRestore /
//  showRecoveryBanner / saveState はまだ app.html / store 側に
//  残るため移行期間中は window.* 経由で委譲する。
// ============================================================

import { saveState, getState, setState } from '../store/state.js';

export function autoRecoveryCheck() {
  var s = getState() || {};
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
        var mergedRecords = merge(s.records, activeRecs);
        setState(Object.assign({}, getState(), { records: mergedRecords }));
        saveState();
        var mergedCount = mergedRecords.length;
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, mergedCount);
        console.log('IndexedDBから自動復元: ' + mergedCount + '件');
        localStorage.setItem('ippo_last_record_count', String(mergedCount));
        return true;
      }

      var cloudRestore = typeof window.manualCloudRestore === 'function'
        ? window.manualCloudRestore()
        : Promise.resolve();

      return cloudRestore.then(function () {
        var afterState = getState() || {};
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, (afterState.records || []).length);
        localStorage.setItem('ippo_last_record_count', String((afterState.records || []).length));
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
