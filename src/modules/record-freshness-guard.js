// ============================================================
// ippo – record-freshness-guard.js
//
// Phase B save stabilization:
// detect stale record overwrite candidates without changing sync order.
//
// IMPORTANT:
// - warning-first diagnostics
// - does not block saveState / loadState / cloudBackupAll
// - does not mutate records
// - does not change hydration or sync timing
// ============================================================

import {
  getRecordDate,
  getRecords,
} from './record-repository.js';

const FRESHNESS_KEY = '__IPPO_RECORD_FRESHNESS_GUARD';
const MAX_EVENTS = 160;

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getStore() {
  try {
    if (!window[FRESHNESS_KEY]) {
      window[FRESHNESS_KEY] = {
        createdAt: nowIso(),
        snapshots: [],
        warnings: [],
        latestFingerprint: null,
        listenersInstalled: false,
      };
    }
    return window[FRESHNESS_KEY];
  } catch (_) {
    return {
      createdAt: nowIso(),
      snapshots: [],
      warnings: [],
      latestFingerprint: null,
      listenersInstalled: false,
    };
  }
}

function pushLimited(list, value, limit) {
  try {
    list.push(value);
    if (list.length > limit) {
      list.splice(0, list.length - limit);
    }
  } catch (_) {}
}

function stableStringify(value) {
  try {
    return JSON.stringify(value || [], function(key, val) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
      return Object.keys(val).sort().reduce(function(sorted, itemKey) {
        sorted[itemKey] = val[itemKey];
        return sorted;
      }, {});
    });
  } catch (_) {
    return '';
  }
}

function simpleHash(text) {
  const value = String(text || '');
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function getRecordUpdatedValue(record) {
  if (!record || typeof record !== 'object') return '';
  return record.updated_at
    || record.updatedAt
    || record.saved_at
    || record.savedAt
    || record.created_at
    || record.createdAt
    || '';
}

function buildFingerprint(records) {
  const list = Array.isArray(records) ? records : [];
  const dates = list.map(getRecordDate).filter(Boolean).sort();
  const updatedValues = list.map(getRecordUpdatedValue).filter(Boolean).sort();
  const stable = stableStringify(list);

  return {
    length: list.length,
    firstDate: dates[0] || '',
    lastDate: dates[dates.length - 1] || '',
    datesHash: simpleHash(dates.join('|')),
    updatedHash: simpleHash(updatedValues.join('|')),
    contentHash: simpleHash(stable),
  };
}

function isPotentialStaleOverwrite(previous, next) {
  if (!previous || !next) return false;

  if (next.length < previous.length) return true;

  if (
    next.length === previous.length
    && previous.contentHash
    && next.contentHash
    && previous.contentHash !== next.contentHash
    && previous.updatedHash
    && next.updatedHash
    && previous.updatedHash === next.updatedHash
  ) {
    return true;
  }

  if (previous.lastDate && next.lastDate && next.lastDate < previous.lastDate) {
    return true;
  }

  return false;
}

function traceFreshness(phase, payload) {
  try {
    if (typeof window.ippoTracePersistencePhase === 'function') {
      window.ippoTracePersistencePhase('record-freshness:' + phase, payload);
    }
  } catch (_) {}
}

function traceReconnect(phase, payload) {
  try {
    if (typeof window.ippoMarkReconnectPhase === 'function') {
      window.ippoMarkReconnectPhase('record-freshness:' + phase, {
        detail: payload || null,
      });
    }
  } catch (_) {}
}

function markRecordFreshness(label = 'manual') {
  const store = getStore();
  const records = getRecords();
  const fingerprint = buildFingerprint(records);
  const previous = store.latestFingerprint;
  const staleCandidate = isPotentialStaleOverwrite(previous, fingerprint);
  const snapshot = {
    label,
    checkedAt: nowIso(),
    fingerprint,
    previous,
    staleCandidate,
  };

  pushLimited(store.snapshots, snapshot, MAX_EVENTS);
  store.latestFingerprint = fingerprint;

  if (staleCandidate) {
    const warning = {
      type: 'stale-record-overwrite-candidate',
      label,
      checkedAt: snapshot.checkedAt,
      previous,
      fingerprint,
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    traceFreshness('stale-overwrite-candidate', warning);
  } else {
    traceFreshness('snapshot', {
      label,
      fingerprint,
    });
  }

  return snapshot;
}

function installRecordFreshnessReconnectListeners() {
  const store = getStore();
  if (store.listenersInstalled) return summarizeRecordFreshnessGuard();

  try {
    window.addEventListener('offline', function() {
      const snapshot = markRecordFreshness('network:offline');
      traceReconnect('offline-snapshot', snapshot);
    });

    window.addEventListener('online', function() {
      const before = markRecordFreshness('network:online-before-sync-observed');
      traceReconnect('online-before-sync-observed', before);

      window.setTimeout(function() {
        const after = markRecordFreshness('network:online-post-microtask-observed');
        traceReconnect('online-post-microtask-observed', after);
      }, 0);
    });

    store.listenersInstalled = true;
    markRecordFreshness('record-freshness:listeners-installed');
  } catch (error) {
    const warning = {
      type: 'record-freshness-listener-install-failed',
      checkedAt: nowIso(),
      message: error && error.message ? error.message : String(error),
    };
    pushLimited(store.warnings, warning, MAX_EVENTS);
    traceFreshness('listener-install-failed', warning);
  }

  return summarizeRecordFreshnessGuard();
}

function summarizeRecordFreshnessGuard() {
  const store = getStore();
  return {
    snapshotCount: store.snapshots.length,
    warningCount: store.warnings.length,
    listenersInstalled: store.listenersInstalled === true,
    latestFingerprint: store.latestFingerprint,
    recentSnapshots: store.snapshots.slice(-8),
    recentWarnings: store.warnings.slice(-8),
    preservedConstraints: {
      noSaveBlock: true,
      noLoadBlock: true,
      noCloudBlock: true,
      noRecordMutation: true,
      noTimingChange: true,
    },
  };
}

function resetRecordFreshnessGuard() {
  const store = getStore();
  store.snapshots = [];
  store.warnings = [];
  store.latestFingerprint = null;
  return summarizeRecordFreshnessGuard();
}

installRecordFreshnessReconnectListeners();

window.ippoMarkRecordFreshness = markRecordFreshness;
window.ippoInstallRecordFreshnessReconnectListeners = installRecordFreshnessReconnectListeners;
window.ippoRecordFreshnessGuardSummary = summarizeRecordFreshnessGuard;
window.ippoResetRecordFreshnessGuard = resetRecordFreshnessGuard;

export {
  markRecordFreshness,
  installRecordFreshnessReconnectListeners,
  summarizeRecordFreshnessGuard,
  resetRecordFreshnessGuard,
};
