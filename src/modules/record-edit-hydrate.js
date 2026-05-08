// ============================================================
//  ippo – src/modules/record-edit-hydrate.js
//  Phase 3-E: edit record hydration guard
//
//  目的:
//  - 記録編集時に保存済みrecordの内容をフォームへ復元する
//  - app.html の巨大関数本体は変更しない
//  - saveRecordScreen の保存ロジックは変更しない
// ============================================================

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
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

function toCamel(value) {
  return String(value || '').replace(/[_-]([a-z])/g, function(_, ch) {
    return ch.toUpperCase();
  });
}

function dateOf(record) {
  if (!record) return '';
  return String(record.record_date || record.date || record.id || '').slice(0, 10);
}

function recordsFromLocalStorage() {
  const candidates = ['kk_records', 'records', 'ippo_state'];

  for (const key of candidates) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.records)) return parsed.records;
    } catch(e) {}
  }

  return [];
}

function getRecords() {
  if (Array.isArray(window.state?.records)) return window.state.records;
  return recordsFromLocalStorage();
}

function getEditingDate() {
  const stateDate = window.state?.editingDate || window.state?.selectedDate || window.state?.recordDate;
  if (stateDate) return String(stateDate).slice(0, 10);

  try {
    const input = document.querySelector('[name="record_date"], [name="date"], #record-date, #recordDate, #recordDateInput');
    if (input && input.value) return String(input.value).slice(0, 10);
  } catch(e) {}

  return '';
}

function getEditingRecord() {
  const targetDate = getEditingDate();
  if (!targetDate) return null;

  const record = getRecords().find(function(item) {
    return dateOf(item) === targetDate;
  });

  return record || null;
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
    debug('skip:no-record', { editingDate: getEditingDate() });
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
  debug('hydrated', { date: dateOf(record), fields: filled, chips: chips });
  return true;
}

function scheduleHydration() {
  window.setTimeout(hydrateRecordForm, 0);
  window.setTimeout(hydrateRecordForm, 100);
  window.setTimeout(hydrateRecordForm, 300);
}

function wrapOpenRecordScreen() {
  const original = window.openRecordScreen;
  if (typeof original !== 'function') return false;
  if (original.__ippoHydrateWrapped === true) return true;

  function wrappedOpenRecordScreen() {
    const result = original.apply(this, arguments);
    scheduleHydration();
    return result;
  }

  wrappedOpenRecordScreen.__ippoHydrateWrapped = true;
  wrappedOpenRecordScreen.__ippoOriginal = original;
  window.openRecordScreen = wrappedOpenRecordScreen;
  return true;
}

function wrapSwitchTab() {
  const original = window.switchTab;
  if (typeof original !== 'function') return false;
  if (original.__ippoHydrateWrapped === true) return true;

  function wrappedSwitchTab(tab) {
    const result = original.apply(this, arguments);
    if (tab === 'record') scheduleHydration();
    return result;
  }

  wrappedSwitchTab.__ippoHydrateWrapped = true;
  wrappedSwitchTab.__ippoOriginal = original;
  window.switchTab = wrappedSwitchTab;
  return true;
}

function install() {
  wrapOpenRecordScreen();
  wrapSwitchTab();
}

install();

let attempts = 0;
const timer = window.setInterval(function() {
  attempts++;
  install();
  if (attempts >= 20) window.clearInterval(timer);
}, 250);

window.hydrateRecordForm = hydrateRecordForm;
