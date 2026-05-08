// ============================================================
//  ippo – src/modules/record-repository.js
//  Phase 3-F-1: readonly record repository
//
//  目的:
//  - record読み取り処理を段階的に共通化する
//  - saveRecordScreen / Supabase / localStorage書き込みは変更しない
//  - 旧キー互換を維持しつつ、state.recordsを正本候補として扱う
// ============================================================

export const RECORD_STORAGE_KEYS = Object.freeze({
  state: 'ippo_state',
  legacyKkRecords: 'kk_records',
  legacyRecords: 'records',
});

export function getRecordDate(record) {
  if (!record) return '';
  return String(record.record_date || record.date || record.id || '').slice(0, 10);
}

export function normalizeRecordDate(value) {
  if (!value) return '';

  if (typeof value === 'object') {
    const recordDate = getRecordDate(value);
    if (recordDate) return recordDate;
  }

  const text = String(value);

  const iso = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    return [iso[1], iso[2].padStart(2, '0'), iso[3].padStart(2, '0')].join('-');
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
  } catch(e) {}

  return [];
}

export function getRecordsFromLocalStorage() {
  const sources = [
    RECORD_STORAGE_KEYS.state,
    RECORD_STORAGE_KEYS.legacyKkRecords,
    RECORD_STORAGE_KEYS.legacyRecords,
  ];

  for (const key of sources) {
    try {
      const records = parseRecordsFromStorageValue(localStorage.getItem(key));
      if (records.length > 0) return records;
    } catch(e) {}
  }

  return [];
}

export function getRecords() {
  if (Array.isArray(window.state?.records)) return window.state.records;
  return getRecordsFromLocalStorage();
}

export function findRecordByDate(date) {
  const targetDate = normalizeRecordDate(date);
  if (!targetDate) return null;

  const found = getRecords().find(function(record) {
    return getRecordDate(record) === targetDate;
  });

  return found || null;
}

export function getRecordsSnapshot() {
  const stateRecords = Array.isArray(window.state?.records) ? window.state.records : null;
  let ippoStateRecords = [];
  let kkRecords = [];
  let legacyRecords = [];

  try {
    ippoStateRecords = parseRecordsFromStorageValue(localStorage.getItem(RECORD_STORAGE_KEYS.state));
  } catch(e) {}

  try {
    kkRecords = parseRecordsFromStorageValue(localStorage.getItem(RECORD_STORAGE_KEYS.legacyKkRecords));
  } catch(e) {}

  try {
    legacyRecords = parseRecordsFromStorageValue(localStorage.getItem(RECORD_STORAGE_KEYS.legacyRecords));
  } catch(e) {}

  return {
    source: stateRecords ? 'state.records' : 'localStorage',
    stateRecordsLength: stateRecords ? stateRecords.length : null,
    ippoStateRecordsLength: ippoStateRecords.length,
    kkRecordsLength: kkRecords.length,
    legacyRecordsLength: legacyRecords.length,
    activeRecordsLength: getRecords().length,
  };
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
  getRecordsSnapshot,
});

window.ippoRecordStorageSnapshot = getRecordsSnapshot;
