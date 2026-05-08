// ============================================================
//  ippo – src/modules/record-repository.js
//  Phase 3-F-1: readonly record repository
//  Phase 3-F-3: storage/sync diagnostics
//  Hotfix: resilient edit-date record resolution
//
//  目的:
//  - record読み取り処理を段階的に共通化する
//  - saveRecordScreen / Supabase / localStorage書き込みは変更しない
//  - 旧キー互換を維持しつつ、state.recordsを正本候補として扱う
//  - state/localStorage間のズレを診断できるようにする
// ============================================================

export const RECORD_STORAGE_KEYS = Object.freeze({
  state: 'ippo_state',
  legacyKkRecords: 'kk_records',
  legacyRecords: 'records',
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
  const sources = [
    RECORD_STORAGE_KEYS.state,
    RECORD_STORAGE_KEYS.legacyKkRecords,
    RECORD_STORAGE_KEYS.legacyRecords,
  ];

  for (const key of sources) {
    const records = recordsFromKey(key);
    if (records.length > 0) return records;
  }

  return [];
}

export function getRecords() {
  if (Array.isArray(window.state?.records)) return window.state.records;
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
  const stateRecords = Array.isArray(window.state?.records) ? window.state.records : null;
  const ippoStateRecords = recordsFromKey(RECORD_STORAGE_KEYS.state);
  const kkRecords = recordsFromKey(RECORD_STORAGE_KEYS.legacyKkRecords);
  const legacyRecords = recordsFromKey(RECORD_STORAGE_KEYS.legacyRecords);

  return {
    source: stateRecords ? 'state.records' : 'localStorage',
    stateRecordsLength: stateRecords ? stateRecords.length : null,
    ippoStateRecordsLength: ippoStateRecords.length,
    kkRecordsLength: kkRecords.length,
    legacyRecordsLength: legacyRecords.length,
    activeRecordsLength: getRecords().length,
  };
}

export function getRecordStorageDiagnostics(label) {
  const stateRecords = Array.isArray(window.state?.records) ? window.state.records : [];
  const ippoStateRecords = recordsFromKey(RECORD_STORAGE_KEYS.state);
  const kkRecords = recordsFromKey(RECORD_STORAGE_KEYS.legacyKkRecords);
  const legacyRecords = recordsFromKey(RECORD_STORAGE_KEYS.legacyRecords);

  const summaries = {
    state: summarizeRecords(stateRecords),
    ippoState: summarizeRecords(ippoStateRecords),
    kkRecords: summarizeRecords(kkRecords),
    legacyRecords: summarizeRecords(legacyRecords),
  };

  const stateHash = summaries.state.hash;
  const ippoHash = summaries.ippoState.hash;
  const kkHash = summaries.kkRecords.hash;
  const legacyHash = summaries.legacyRecords.hash;

  return {
    label: label || '',
    checkedAt: new Date().toISOString(),
    activeSource: Array.isArray(window.state?.records) ? 'state.records' : 'localStorage',
    hasWindowState: !!window.state,
    hasSaveState: typeof window.saveState === 'function',
    hasCloudBackupAll: typeof window.cloudBackupAll === 'function',
    hasCloudRestore: typeof window.cloudRestore === 'function',
    summaries: summaries,
    consistency: {
      stateMatchesIppoState: stateHash === ippoHash,
      stateMatchesKkRecords: stateHash === kkHash,
      ippoStateMatchesKkRecords: ippoHash === kkHash,
      legacyRecordsMatchesState: legacyHash === stateHash,
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

  if (summaries.kkRecords.length > 0 && summaries.kkRecords.hash !== summaries.state.hash) {
    warnings.push('legacy kk_records differs from state.records');
  }

  if (summaries.legacyRecords.length > 0 && summaries.legacyRecords.hash !== summaries.state.hash) {
    warnings.push('legacy records differs from state.records');
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
