// ============================================================
//  ippo – src/services/recovery.js
//  Phase E (Step 4): 起動時自動復元チェック
// ============================================================

import { getState, setState } from '../store/state.js';
import { idbGetAllRecords, persistRecords } from '../modules/record-repository.js';

function mergeRecords(localRecords, cloudRecords) {
  var merged = {};
  localRecords.forEach(function (r) { if (r.id) merged[r.id] = r; });
  cloudRecords.forEach(function (r) {
    if (!r.id) return;
    if (!merged[r.id]) {
      merged[r.id] = r;
    } else {
      var lt = new Date(merged[r.id].updatedAt || merged[r.id].date || 0).getTime();
      var ct = new Date(r.updatedAt || r.date || 0).getTime();
      if (ct > lt) merged[r.id] = r;
    }
  });
  var result = [];
  Object.keys(merged).forEach(function (k) {
    if (!merged[k].deleted_at) result.push(merged[k]);
  });
  return result.sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
}

export function autoRecoveryCheck() {
  var s = getState() || {};
  var lastCount    = parseInt(localStorage.getItem('ippo_last_record_count') || '0');
  var currentCount = (s.records || []).length;

  if (lastCount > 0 && currentCount < lastCount && lastCount - currentCount >= 2) {
    console.warn('データ減少検知: ' + lastCount + '件→' + currentCount + '件');

    return idbGetAllRecords().then(function (idbRecs) {
      var activeRecs = idbRecs.filter(function (r) { return !r.deleted_at; });

      if (activeRecs.length > currentCount) {
        var mergedRecords = mergeRecords(s.records, activeRecs);
        setState(Object.assign({}, getState(), { records: mergedRecords }));
        persistRecords();
        var mergedCount = mergedRecords.length;
        if (typeof window.showRecoveryBanner === 'function') window.showRecoveryBanner(true, mergedCount);
        console.log('IndexedDBから自動復元: ' + mergedCount + '件');
        localStorage.setItem('ippo_last_record_count', String(mergedCount));
        return true;
      }

      var _CLOUD_TIMEOUT_MS = 15000;
      var cloudRestore = typeof window.manualCloudRestore === 'function'
        ? Promise.race([
            window.manualCloudRestore(),
            new Promise(function(_, reject) {
              setTimeout(function() { reject(new Error('cloud restore timeout')); }, _CLOUD_TIMEOUT_MS);
            })
          ])
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
