// ============================================================
//  ippo – src/modules/record-repository.js
//  Phase 3-F-1: readonly record repository
//  Phase 3-F-3: storage/sync diagnostics
//  Hotfix: resilient edit-date record resolution
//  Priority 4: legacy fallback 削除 / getState() 経由に統一
//
//  目的:
//  - record読み取り処理を共通化する
//  - saveRecordScreen / Supabase / localStorage書き込みは変更しない
//  - legacy key (kk_records / records) は Step 4-1 で移行済みのため削除
// ============================================================

import { STATE_KEY, getState } from '../store/state.js';

// 後方互換: 外部から参照している箇所向けに state キーのみ公開
export const RECORD_STORAGE_KEYS = Object.freeze({
  state: STATE_KEY,
});

export function getRecordDate(record) {
  if (!record) return '';
  const candidates = [
    record.record_date,
    record.recordDate,
    record.date,
    record.id,
    record.targetDate,
    record.selectedDate,
    record.editingDate,
    record.created_at,
    record.createdAt,
    record.updated_at,
    record.updatedAt,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeRecordDate(candidate);
    if (normalized) return normalized;
  }

  return '';
}

export function normalizeRecordDate(value) {
  if (!value) return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      String(value.getFullYear()),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-');
  }

  if (typeof value === 'object') {
    const recordDate = getRecordDate(value);
    if (recordDate) return recordDate;
  }

  const text = String(value).trim();

  const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return [iso[1], iso[2].padStart(2, '0'), iso[3].padStart(2, '0')].join('-');
  }

  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) {
    return [compact[1], compact[2], compact[3]].join('-');
  }

  const jp = text.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/);
  if (jp) {
    return [jp[1], jp[2].padStart(2, '0'), jp[3].padStart(2, '0')].join('-');
  }

  const jpNoYear = text.match(/(\d{1,2})月\s*(\d{1,2})日/);
  if (jpNoYear) {
    const year = new Date().getFullYear();
    return [year, jpNoYear[1].padStart(2, '0'), jpNoYear[2].padStart(2, '0')].join('-');
  }

  return '';
}

function parseRecordsFromStorageValue(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.records)) return parsed.records;
    if (parsed.state && Array.isArray(parsed.state.records)) return parsed.state.records;
  } catch(e) {}

  return [];
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
  } catch(e) {
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

function summarizeRecords(records) {
  const list = Array.isArray(records) ? records : [];
  const dates = list.map(getRecordDate).filter(Boolean).sort();
  const stable = stableStringify(list);

  return {
    length: list.length,
    firstDate: dates[0] || '',
    lastDate: dates[dates.length - 1] || '',
    dates: dates,
    hash: simpleHash(stable),
  };
}

function recordsFromKey(key) {
  try {
    return parseRecordsFromStorageValue(localStorage.getItem(key));
  } catch(e) {
    return [];
  }
}

export function getRecordsFromLocalStorage() {
  return recordsFromKey(STATE_KEY);
}

export function getRecords() {
  const s = getState();
  if (Array.isArray(s?.records)) return s.records;
  return getRecordsFromLocalStorage();
}

function getRecordDateCandidates(record) {
  if (!record) return [];

  const raw = [
    record.record_date,
    record.recordDate,
    record.date,
    record.id,
    record.targetDate,
    record.selectedDate,
    record.editingDate,
    record.created_at,
    record.createdAt,
    record.updated_at,
    record.updatedAt,
  ];

  const candidates = new Set();
  raw.forEach(function(value) {
    const normalized = normalizeRecordDate(value);
    if (normalized) candidates.add(normalized);
  });

  const primary = getRecordDate(record);
  if (primary) candidates.add(primary);

  return Array.from(candidates);
}

export function findRecordByDate(date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate) return null;

  const found = getRecords().find(function(record) {
    return getRecordDateCandidates(record).includes(targetDate);
  });

  return found || null;
}

export function findRecordIndexByDate(date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate) return -1;

  return getRecords().findIndex(function(record) {
    return getRecordDateCandidates(record).includes(targetDate);
  });
}

export function getRecordsSnapshot() {
  const s = getState();
  const stateRecords = Array.isArray(s?.records) ? s.records : null;
  const ippoStateRecords = recordsFromKey(STATE_KEY);

  return {
    source: stateRecords ? 'state.records' : 'localStorage',
    stateRecordsLength: stateRecords ? stateRecords.length : null,
    ippoStateRecordsLength: ippoStateRecords.length,
    activeRecordsLength: getRecords().length,
  };
}

export function getRecordStorageDiagnostics(label) {
  const s = getState();
  const stateRecords = Array.isArray(s?.records) ? s.records : [];
  const ippoStateRecords = recordsFromKey(STATE_KEY);

  const summaries = {
    state: summarizeRecords(stateRecords),
    ippoState: summarizeRecords(ippoStateRecords),
  };

  const stateHash = summaries.state.hash;
  const ippoHash = summaries.ippoState.hash;

  return {
    label: label || '',
    checkedAt: new Date().toISOString(),
    activeSource: Array.isArray(s?.records) ? 'state.records' : 'localStorage',
    hasWindowState: !!window.state,
    hasSaveState: typeof window.saveState === 'function',
    hasCloudBackupAll: typeof window.cloudBackupAll === 'function',
    hasCloudRestore: typeof window.cloudRestore === 'function',
    summaries: summaries,
    consistency: {
      stateMatchesIppoState: stateHash === ippoHash,
    },
    warnings: buildDiagnosticsWarnings(summaries),
  };
}

function buildDiagnosticsWarnings(summaries) {
  const warnings = [];

  if (summaries.state.length !== summaries.ippoState.length) {
    warnings.push('state.records and ippo_state.records length differ');
  }

  if (summaries.state.hash !== summaries.ippoState.hash) {
    warnings.push('state.records and ippo_state.records hash differ');
  }

  return warnings;
}

export function logRecordStorageDiagnostics(label) {
  const diagnostics = getRecordStorageDiagnostics(label);
  try {
    console.debug('[ippo:record-storage]', diagnostics);
  } catch(e) {}
  return diagnostics;
}

export function enableRecordRepositoryDebug() {
  try {
    console.debug('[ippo:record-repository]', getRecordsSnapshot());
  } catch(e) {}
}

window.ippoRecordRepository = Object.freeze({
  getRecordDate,
  normalizeRecordDate,
  getRecordsFromLocalStorage,
  getRecords,
  findRecordByDate,
  findRecordIndexByDate,
  getRecordsSnapshot,
  getRecordStorageDiagnostics,
  logRecordStorageDiagnostics,
});

window.ippoRecordStorageSnapshot = getRecordsSnapshot;
window.ippoRecordStorageDiagnostics = getRecordStorageDiagnostics;
window.ippoLogRecordStorageDiagnostics = logRecordStorageDiagnostics;
