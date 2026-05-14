// ============================================================
//  ippo – src/modules/record-edit-hydrate.js
//  Phase 3-E: edit record hydration guard
//  Phase 3-E-1: edit route trace / reset-after hydrate guard
//  Phase 3-F-2: record repository 読み取り層へ移行
//  Phase 3-G: editing-state モジュールへ移行 (window.state mutation 排除)
//  Hotfix: stabilize edit intent date and hydration
//  Hotfix: preserve edit identity during save draft build
//
//  目的:
//  - 記録編集時に保存済みrecordの内容をフォームへ復元する
//  - 編集保存時に新規record扱いへ落ちないよう target identity を維持する
//  - app.html の巨大関数本体は変更しない
//  - saveRecordScreen の保存ロジックは変更しない
//  - window.state への直接 mutation を排除 (editing-state.js 経由)
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
} from './record-repository.js';

import {
  getEditingState,
  setEditingState,
} from './editing-state.js';

let lastEditIntent = {
  at: 0,
  date: '',
  source: '',
};

function debug(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:record-hydrate]', label, detail || '');
    }
  } catch(e) {}
}

function toSnake(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\\s]+/g, '_')
    .toLowerCase();
}

function toCamel(value) {
  return String(value || '').replace(/[_-]([a-z])/g, function(_, ch) {
    return ch.toUpperCase();
  });
}

function getDateFromDom() {
  try {
    const input = document.querySelector('[name="record_date"], [name="recordDate"], [name="date"], #record-date, #recordDate, #recordDateInput');
    if (input && input.value) return normalizeRecordDate(input.value);
  } catch(e) {}

  try {
    const dmDate = document.getElementById('dmDate');
    if (dmDate && dmDate.textContent) return normalizeRecordDate(dmDate.textContent);
  } catch(e) {}

  try {
    const active = document.querySelector('[data-date].active, [data-record-date].active, [aria-selected="true"][data-date], [aria-selected="true"][data-record-date]');
    const activeDate = normalizeRecordDate(active?.getAttribute('data-record-date')) || normalizeRecordDate(active?.getAttribute('data-date'));
    if (activeDate) return activeDate;
  } catch(e) {}

  return '';
}

function isRecentEditIntent() {
  return !!lastEditIntent.at && (Date.now() - lastEditIntent.at < 30000);
}

// ─── persistEditingDate ───────────────────────────────────
// Phase 3-G: window.state mutation を排除。
// editing-state モジュール経由で状態を管理し、
// window.state.editingDate 等への直接書き込みを行わない。
function persistEditingDate(date) {
  const normalized = normalizeRecordDate(date);
  if (!normalized) return '';

  setEditingState(normalized, lastEditIntent.source || 'persist');

  return normalized;
}

// ─── getEditingDate ───────────────────────────────────────
// Phase 3-G: window.state?.currentEditingDate 等の読み取りを排除。
// editing-state モジュール経由で取得する。
function getEditingDate() {
  if (isRecentEditIntent() && lastEditIntent.date) return lastEditIntent.date;

  // editing-state モジュール (primary source)
  const moduleDate = getEditingState().date;
  if (moduleDate) return moduleDate;

  const domDate = getDateFromDom();
  if (domDate) return domDate;

  if (lastEditIntent.date) return lastEditIntent.date;

  return '';
}

function getEditingRecord() {
  const targetDate = getEditingDate();
  if (!targetDate) return null;
  return findRecordByDate(targetDate);
}

function dateFromRecordLike(value) {
  if (!value || typeof value !== 'object') return '';
  return normalizeRecordDate(value.record_date) ||
    normalizeRecordDate(value.recordDate) ||
    normalizeRecordDate(value.date) ||
    normalizeRecordDate(value.id) ||
    normalizeRecordDate(value.targetDate) ||
    normalizeRecordDate(value.selectedDate) ||
    normalizeRecordDate(value.editingDate);
}

function markEditIntent(source, date) {
  const normalized = normalizeRecordDate(date) || dateFromRecordLike(date) || getDateFromDom() || getEditingDate();

  lastEditIntent = {
    at: Date.now(),
    date: normalized,
    source: source || 'unknown',
  };

  persistEditingDate(normalized);

  debug('edit-intent', {
    source:       lastEditIntent.source,
    date:         lastEditIntent.date,
    editingState: getEditingState(),
  });
}

function candidateKeysForElement(el) {
  const raw = [
    el.id,
    el.name,
    el.getAttribute('data-field'),
    el.getAttribute('data-key'),
    el.getAttribute('data-name'),
  ].filter(Boolean);

  const keys = new Set();

  raw.forEach(function(key) {
    keys.add(key);
    keys.add(toSnake(key));
    keys.add(toCamel(key));
  });

  const aliases = {
    foodContent: ['food_content', 'foodContent', 'meal_content', 'mealContent', 'food', 'meal', 'meals'],
    food_content: ['food_content', 'foodContent', 'meal_content', 'mealContent', 'food', 'meal', 'meals'],
    mealContent: ['food_content', 'foodContent', 'meal_content', 'mealContent', 'food', 'meal', 'meals'],
    foodMemo: ['food_notes', 'foodNotes', 'food_memo', 'foodMemo'],
    foodNote: ['food_notes', 'foodNotes', 'food_memo', 'foodMemo'],
    conditionMemo: ['condition_memo', 'conditionMemo', 'memo', 'notes'],
    emotionNote: ['emotion_notes', 'emotionNotes', 'emotion_memo', 'emotionMemo'],
    gratitudeNote: ['gratitude', 'gratitudeNote'],
    fastingStartTime: ['fasting_start', 'fastingStart', 'fastingStartTime'],
    fastingEndTime: ['fasting_end', 'fastingEnd', 'fastingEndTime'],
    menstruationAmount: ['menstruation_amount', 'menstruationAmount'],
  };

  Array.from(keys).forEach(function(key) {
    const extra = aliases[key] || aliases[toSnake(key)] || aliases[toCamel(key)] || [];
    extra.forEach(function(alias) { keys.add(alias); });
  });

  return Array.from(keys);
}

function valueFromRecord(record, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return record[key];
    }
  }
  return undefined;
}

function fillElement(el, value) {
  if (value === undefined || value === null) return false;

  if (el.type === 'checkbox') {
    if (Array.isArray(value)) {
      el.checked = value.map(String).includes(String(el.value));
    } else {
      el.checked = Boolean(value);
    }
    return true;
  }

  if (el.type === 'radio') {
    el.checked = String(el.value) === String(value);
    return el.checked;
  }

  if (Array.isArray(value)) {
    el.value = value.join(', ');
  } else {
    el.value = value;
  }

  try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
  try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
  return true;
}

function hydrateChips(record) {
  const chipLike = document.querySelectorAll('[data-val], [data-value], [data-symptom], [data-feel], [data-food], [data-emotion], [data-chakra]');
  let changed = 0;

  chipLike.forEach(function(el) {
    const value = el.getAttribute('data-val') || el.getAttribute('data-value') || el.getAttribute('data-symptom') || el.getAttribute('data-feel') || el.getAttribute('data-food') || el.getAttribute('data-emotion') || el.getAttribute('data-chakra');
    if (!value) return;

    const allRecordValues = Object.values(record).flatMap(function(v) {
      return Array.isArray(v) ? v.map(String) : [String(v)];
    });

    if (allRecordValues.includes(String(value))) {
      el.classList.add('selected');
      el.setAttribute('aria-pressed', 'true');
      changed++;
    }
  });

  return changed;
}

function hydrateRecordForm() {
  const targetDate = getEditingDate();
  const record = getEditingRecord();
  if (!record) {
    debug('skip:no-record', {
      editingDate: targetDate,
      lastEditIntent: lastEditIntent,
      recordsLength: getRecords().length,
    });
    return false;
  }

  const recordDate = getRecordDate(record);
  persistEditingDate(recordDate || targetDate);

  let filled = 0;
  const fields = document.querySelectorAll('input, textarea, select');

  fields.forEach(function(el) {
    const keys = candidateKeysForElement(el);
    const value = valueFromRecord(record, keys);
    if (fillElement(el, value)) filled++;
  });

  const chips = hydrateChips(record);
  debug('hydrated', {
    requestedDate: targetDate,
    date: recordDate,
    fields: filled,
    chips: chips,
    source: lastEditIntent.source,
    recordsLength: getRecords().length,
  });
  return true;
}

function protectDraftForEdit(draft) {
  if (!draft || typeof draft !== 'object') return draft;

  const editDate = getEditingDate();
  const existing = editDate ? findRecordByDate(editDate) : null;
  if (!editDate || !existing) return draft;

  const beforeDate = normalizeRecordDate(draft.record_date || draft.recordDate || draft.date || draft.id || '');
  draft.record_date = editDate;
  draft.date = editDate;
  draft.id = existing.id || editDate;

  try {
    window.__ippoProtectedEditSaveTarget = {
      at: Date.now(),
      editDate,
      beforeDate,
      existingRecordDate: getRecordDate(existing),
      existingId: existing.id || '',
    };
  } catch(e) {}

  debug('draft-edit-identity-protected', window.__ippoProtectedEditSaveTarget);
  return draft;
}

function scheduleHydration(source, date) {
  if (source) markEditIntent(source, date);

  [0, 80, 180, 350, 700, 1200, 2000].forEach(function(delay) {
    window.setTimeout(hydrateRecordForm, delay);
  });
}

function firstDateFromArgs(args) {
  for (const arg of Array.from(args || [])) {
    const normalized = normalizeRecordDate(arg) || dateFromRecordLike(arg);
    if (normalized) return normalized;
  }
  return '';
}

function wrapFunction(name, options) {
  const original = window[name];
  if (typeof original !== 'function') return false;
  if (original.__ippoHydrateWrapped === true) return true;

  function wrappedFunction() {
    const argsDate = firstDateFromArgs(arguments);
    const isEditRoute = !!(options && options.editIntent);
    const shouldHydrateRecord = !!(options && options.hydrateOnRecordTab && arguments[0] === 'record');
    const beforeDate = getEditingDate();

    if (isEditRoute) {
      markEditIntent(name, argsDate || beforeDate);
    }

    debug('route:start:' + name, {
      argsDate:            argsDate,
      beforeDate:          beforeDate,
      isEditRoute:         isEditRoute,
      shouldHydrateRecord: shouldHydrateRecord,
      editingState:        getEditingState(),
    });

    const result = original.apply(this, arguments);

    if (isEditRoute) {
      persistEditingDate(argsDate || lastEditIntent.date || beforeDate);
    }

    if (isEditRoute || shouldHydrateRecord || (options && options.alwaysAfter)) {
      scheduleHydration(name, argsDate || lastEditIntent.date || beforeDate);
    }

    return result;
  }

  wrappedFunction.__ippoHydrateWrapped = true;
  wrappedFunction.__ippoOriginal = original;
  window[name] = wrappedFunction;
  debug('wrap:installed:' + name);
  return true;
}

function wrapBuildDraftFromUI() {
  const original = window.buildDraftFromUI;
  if (typeof original !== 'function') return false;
  if (original.__ippoEditIdentityGuard === true) return true;

  function wrappedBuildDraftFromUI() {
    const draft = original.apply(this, arguments);
    return protectDraftForEdit(draft);
  }

  wrappedBuildDraftFromUI.__ippoEditIdentityGuard = true;
  wrappedBuildDraftFromUI.__ippoOriginal = original;
  window.buildDraftFromUI = wrappedBuildDraftFromUI;
  debug('wrap:installed:buildDraftFromUI');
  return true;
}

function wrapResetRecordForm() {
  const original = window.resetRecordForm;
  if (typeof original !== 'function') return false;
  if (original.__ippoHydrateWrapped === true) return true;

  function wrappedResetRecordForm() {
    const editDate = getEditingDate();
    debug('resetRecordForm:start', {
      recentEditIntent: isRecentEditIntent(),
      editingDate: editDate,
    });

    const result = original.apply(this, arguments);

    if (isRecentEditIntent()) {
      persistEditingDate(editDate);
      scheduleHydration('resetRecordForm:after', editDate);
    }

    return result;
  }

  wrappedResetRecordForm.__ippoHydrateWrapped = true;
  wrappedResetRecordForm.__ippoOriginal = original;
  window.resetRecordForm = wrappedResetRecordForm;
  debug('wrap:installed:resetRecordForm');
  return true;
}

function dateFromElementTree(target) {
  let node = target;
  while (node && node !== document.body) {
    const date = normalizeRecordDate(node.getAttribute?.('data-record-date')) ||
      normalizeRecordDate(node.getAttribute?.('data-date')) ||
      normalizeRecordDate(node.getAttribute?.('aria-label')) ||
      normalizeRecordDate(node.textContent);
    if (date) return date;
    node = node.parentElement;
  }
  return '';
}

function installEditClickCapture() {
  if (window.__ippoEditClickCaptureInstalled === true) return;
  window.__ippoEditClickCaptureInstalled = true;

  document.addEventListener('click', function(event) {
    const target = event.target && event.target.closest ? event.target.closest('button, a, [role="button"], [onclick], [data-date], [data-record-date]') : null;
    if (!target) return;

    const label = String((target.textContent || '') + ' ' + (target.getAttribute('aria-label') || '') + ' ' + (target.getAttribute('onclick') || '') + ' ' + (target.className || ''));
    if (!/(編集|editRecord|openRecordEditor|edit|record)/i.test(label)) return;

    const date = normalizeRecordDate(target.getAttribute('data-date')) ||
      normalizeRecordDate(target.getAttribute('data-record-date')) ||
      dateFromElementTree(target) ||
      getDateFromDom() ||
      getEditingDate();
    markEditIntent('edit-click', date);
    scheduleHydration('edit-click', date);
  }, true);
}

function install() {
  wrapFunction('openRecordScreen', { alwaysAfter: true });
  wrapFunction('switchTab', { hydrateOnRecordTab: true });
  wrapFunction('showScreen', { hydrateOnRecordTab: true });

  wrapFunction('openDayDetail', { alwaysAfter: true });
  wrapFunction('editRecord', { editIntent: true });
  wrapFunction('openRecordEditor', { editIntent: true });
  wrapFunction('handleEditRecord', { editIntent: true });
  wrapFunction('startEditRecord', { editIntent: true });

  wrapBuildDraftFromUI();
  wrapResetRecordForm();
  installEditClickCapture();
}

install();

let attempts = 0;
const timer = window.setInterval(function() {
  attempts++;
  install();
  if (attempts >= 40) window.clearInterval(timer);
}, 250);

window.hydrateRecordForm = hydrateRecordForm;
window.ippoMarkRecordEditIntent = markEditIntent;
window.ippoRecordEditHydrationSummary = function() {
  return {
    lastEditIntent:           { ...lastEditIntent },
    recentEditIntent:         isRecentEditIntent(),
    editingDate:              getEditingDate(),
    editingState:             getEditingState(),
    recordFound:              !!getEditingRecord(),
    protectedEditSaveTarget:  window.__ippoProtectedEditSaveTarget || null,
    recordsLength:            getRecords().length,
  };
};
