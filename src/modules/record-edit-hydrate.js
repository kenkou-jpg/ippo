// ============================================================
//  ippo – src/modules/record-edit-hydrate.js
//  Phase 3-E: edit record hydration guard
//  Phase 3-E-1: edit route trace / reset-after hydrate guard
//  Phase 3-F-2: record repository 読み取り層へ移行
//
//  目的:
//  - 記録編集時に保存済みrecordの内容をフォームへ復元する
//  - app.html の巨大関数本体は変更しない
//  - saveRecordScreen の保存ロジックは変更しない
// ============================================================

import {
  getRecordDate,
  normalizeRecordDate,
  getRecords,
  findRecordByDate,
} from './record-repository.js';

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
    const input = document.querySelector('[name="record_date"], [name="date"], #record-date, #recordDate, #recordDateInput');
    if (input && input.value) return normalizeRecordDate(input.value);
  } catch(e) {}

  try {
    const dmDate = document.getElementById('dmDate');
    if (dmDate && dmDate.textContent) return normalizeRecordDate(dmDate.textContent);
  } catch(e) {}

  return '';
}

function getEditingDate() {
  const stateDate = window.state?.editingDate || window.state?.selectedDate || window.state?.recordDate;
  if (stateDate) return normalizeRecordDate(stateDate) || String(stateDate).slice(0, 10);

  if (lastEditIntent.date) return lastEditIntent.date;

  return getDateFromDom();
}

function getEditingRecord() {
  const targetDate = getEditingDate();
  if (!targetDate) return null;
  return findRecordByDate(targetDate);
}

function markEditIntent(source, date) {
  const normalized = normalizeRecordDate(date) || getDateFromDom() || getEditingDate();

  lastEditIntent = {
    at: Date.now(),
    date: normalized,
    source: source || 'unknown',
  };

  if (normalized && window.state && typeof window.state === 'object') {
    try {
      window.state.editingDate = normalized;
    } catch(e) {}
  }

  debug('edit-intent', {
    source: lastEditIntent.source,
    date: lastEditIntent.date,
    stateEditingDate: window.state?.editingDate,
    stateSelectedDate: window.state?.selectedDate,
    stateRecordDate: window.state?.recordDate,
  });
}

function isRecentEditIntent() {
  return !!lastEditIntent.at && (Date.now() - lastEditIntent.at < 8000);
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
  const record = getEditingRecord();
  if (!record) {
    debug('skip:no-record', {
      editingDate: getEditingDate(),
      lastEditIntent: lastEditIntent,
    });
    return false;
  }

  let filled = 0;
  const fields = document.querySelectorAll('input, textarea, select');

  fields.forEach(function(el) {
    const keys = candidateKeysForElement(el);
    const value = valueFromRecord(record, keys);
    if (fillElement(el, value)) filled++;
  });

  const chips = hydrateChips(record);
  debug('hydrated', {
    date: getRecordDate(record),
    fields: filled,
    chips: chips,
    source: lastEditIntent.source,
    recordsLength: getRecords().length,
  });
  return true;
}

function scheduleHydration(source, date) {
  if (source) markEditIntent(source, date);

  window.setTimeout(hydrateRecordForm, 0);
  window.setTimeout(hydrateRecordForm, 100);
  window.setTimeout(hydrateRecordForm, 300);
  window.setTimeout(hydrateRecordForm, 700);
  window.setTimeout(hydrateRecordForm, 1200);
}

function firstDateFromArgs(args) {
  for (const arg of Array.from(args || [])) {
    const normalized = normalizeRecordDate(arg);
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

    if (isEditRoute) {
      markEditIntent(name, argsDate);
    }

    debug('route:start:' + name, {
      argsDate: argsDate,
      isEditRoute: isEditRoute,
      shouldHydrateRecord: shouldHydrateRecord,
      stateEditingDate: window.state?.editingDate,
      stateSelectedDate: window.state?.selectedDate,
      stateRecordDate: window.state?.recordDate,
    });

    const result = original.apply(this, arguments);

    if (isEditRoute || shouldHydrateRecord || (options && options.alwaysAfter)) {
      scheduleHydration(name, argsDate);
    }

    return result;
  }

  wrappedFunction.__ippoHydrateWrapped = true;
  wrappedFunction.__ippoOriginal = original;
  window[name] = wrappedFunction;
  debug('wrap:installed:' + name);
  return true;
}

function wrapResetRecordForm() {
  const original = window.resetRecordForm;
  if (typeof original !== 'function') return false;
  if (original.__ippoHydrateWrapped === true) return true;

  function wrappedResetRecordForm() {
    debug('resetRecordForm:start', {
      recentEditIntent: isRecentEditIntent(),
      editingDate: getEditingDate(),
    });

    const result = original.apply(this, arguments);

    if (isRecentEditIntent()) {
      scheduleHydration('resetRecordForm:after', getEditingDate());
    }

    return result;
  }

  wrappedResetRecordForm.__ippoHydrateWrapped = true;
  wrappedResetRecordForm.__ippoOriginal = original;
  window.resetRecordForm = wrappedResetRecordForm;
  debug('wrap:installed:resetRecordForm');
  return true;
}

function installEditClickCapture() {
  if (window.__ippoEditClickCaptureInstalled === true) return;
  window.__ippoEditClickCaptureInstalled = true;

  document.addEventListener('click', function(event) {
    const target = event.target && event.target.closest ? event.target.closest('button, a, [role="button"], [onclick]') : null;
    if (!target) return;

    const label = String((target.textContent || '') + ' ' + (target.getAttribute('aria-label') || '') + ' ' + (target.getAttribute('onclick') || ''));
    if (!/(編集|editRecord|openRecordEditor)/i.test(label)) return;

    const date = normalizeRecordDate(target.getAttribute('data-date')) || normalizeRecordDate(target.getAttribute('data-record-date')) || getDateFromDom() || getEditingDate();
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
