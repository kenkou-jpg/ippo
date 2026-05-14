// ============================================================
// ippo – daily-record-card-guard.js
// Hotfix: keep daily 3-card record entry accessible
//
// 目的:
// - 空/自動生成に近い今日recordを「記録済み」扱いしない
// - 今日の3カード入力導線を毎日開けるようにする
// - 既存保存本体には触らず、home CTA / FAB / record tab表示だけ補正
// ============================================================

import {
  findRecordByDate,
} from './record-repository.js';
import { openRecordScreen } from './record.js';
import { switchTab } from './tab-navigation.js';
import { getState } from '../store/state.js';

function debug(label, detail) {
  try {
    if (localStorage.getItem('ippo_debug_record') === '1' || window.__IPPO_DEBUG_RECORD__ === true) {
      console.debug('[ippo:daily-card-guard]', label, detail || '');
    }
  } catch(e) {}
}

function todayLocal() {
  const now = new Date();
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function filled(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return value === true;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function hasMealContent(meals) {
  if (!meals || typeof meals !== 'object') return false;
  return Object.values(meals).some(function(meal) {
    if (!meal || typeof meal !== 'object') return false;
    return filled(meal.content) || filled(meal.notes) || filled(meal.body_feel) || filled(meal.ingredients);
  });
}

function getDailyRecordCategories(record) {
  const categories = {
    body: false,
    food: false,
    mind: false,
  };

  if (!record || typeof record !== 'object') return categories;

  categories.body = !!(
    filled(record.chakra) ||
    filled(record.symptoms) ||
    filled(record.condition_scale) ||
    filled(record.basal_temp) ||
    filled(record.cycle_phase) ||
    filled(record.rhythm_memo)
  );

  categories.food = !!(
    hasMealContent(record.meals) ||
    filled(record.food_content) ||
    filled(record.food_notes) ||
    filled(record.body_feel) ||
    filled(record.food_ingredients) ||
    filled(record.fasting_feel) ||
    filled(record.fasting_notes)
  );

  categories.mind = !!(
    filled(record.emotion) ||
    filled(record.emotion_notes) ||
    filled(record.gratitude)
  );

  return categories;
}

function countDoneCategories(categories) {
  return Object.values(categories || {}).filter(Boolean).length;
}

function getTodayRecordStatus() {
  const record = findRecordByDate(todayLocal());
  const categories = getDailyRecordCategories(record);
  const doneCategories = countDoneCategories(categories);

  return {
    date: todayLocal(),
    hasRecord: !!record,
    categories,
    doneCategories,
    complete: doneCategories >= 3,
  };
}

function openTodayRecord() {
  const date = todayLocal();

  try {
    const s = getState();
    if (s && typeof s === 'object') {
      s.editingDate = date;
      s.currentEditingDate = date;
      s.recordDate = date;
    }
  } catch(e) {}

  if (window.ippoEditingState) {
    try { window.ippoEditingState.setEditingState(date, 'daily-card-guard'); } catch(e) {}
  }

  if (typeof window.ippoMarkRecordEditIntent === 'function') {
    try { window.ippoMarkRecordEditIntent('daily-card-guard', date); } catch(e) {}
  }

  openRecordScreen();

  setTimeout(ensureRecordCardsVisible, 0);
  setTimeout(ensureRecordCardsVisible, 150);
  setTimeout(ensureRecordCardsVisible, 400);
}

function patchHomeCta() {
  const status = getTodayRecordStatus();
  const title = document.getElementById('home-cta-title');
  const sub = document.getElementById('home-cta-sub');
  const card = document.getElementById('home-cta-card');
  const wrap = document.getElementById('home-record-cta');

  if (title) {
    title.textContent = status.complete ? '今日の記録を編集する' : '今日を記録する';
  }

  if (sub) {
    sub.textContent = status.complete
      ? '3カードはいつでも見直せます'
      : '3カードを今日も記録しましょう';
  }

  [card, wrap].forEach(function(el) {
    if (!el) return;
    el.classList.remove('recorded');
    el.setAttribute('role', 'button');
    el.onclick = function(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      openTodayRecord();
      return false;
    };
  });

  const fab = document.getElementById('fabRecordBtn') || document.getElementById('homeRecordFab');
  if (fab) {
    fab.classList.remove('recorded');
    fab.textContent = status.complete ? '今日の記録を編集する' : '今日を記録する';
    fab.onclick = function(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      openTodayRecord();
      return false;
    };
  }

  debug('home-cta-patched', status);
}

function ensureRecordCardsVisible() {
  const recordScreen = document.getElementById('screen-record');
  if (!recordScreen) return;

  const tabs = Array.from(document.querySelectorAll('.record-tab, [data-tab]')).filter(function(el) {
    return el.closest('#screen-record') || /record/i.test(String(el.className || ''));
  });

  const panels = Array.from(document.querySelectorAll('.record-panel, [id^="panel-"]')).filter(function(el) {
    return el.closest('#screen-record') || /^panel-/.test(el.id || '');
  });

  if (tabs.length === 0 && panels.length === 0) return;

  const activeTab = tabs.find(function(tab) { return tab.classList.contains('active'); });
  const firstTab = activeTab || tabs[0];
  const targetName = firstTab?.dataset?.tab || firstTab?.getAttribute('data-tab') || 'chakra';

  if (tabs.length > 0 && !activeTab && firstTab) {
    firstTab.classList.add('active');
  }

  panels.forEach(function(panel, index) {
    const isTarget = panel.id === 'panel-' + targetName || (!activeTab && index === 0);
    if (isTarget) {
      panel.classList.add('active');
      panel.style.display = 'block';
    }
  });

  debug('record-cards-visible', {
    tabs: tabs.length,
    panels: panels.length,
    targetName,
  });
}

function wrapFunction(name, after) {
  const original = window[name];
  if (typeof original !== 'function') return false;
  if (original.__ippoDailyCardGuardWrapped === true) return true;

  function wrappedFunction() {
    const result = original.apply(this, arguments);

    setTimeout(function() {
      try { after && after(arguments); } catch(e) {}
      patchHomeCta();
    }, 0);

    return result;
  }

  wrappedFunction.__ippoDailyCardGuardWrapped = true;
  wrappedFunction.__ippoOriginal = original;
  window[name] = wrappedFunction;
  debug('wrapped:' + name);
  return true;
}

function install() {
  wrapFunction('renderHome');
  wrapFunction('updateHomeCTA');
  wrapFunction('updateFab');
  wrapFunction('handleHomeCTA');
  wrapFunction('openRecordScreen', ensureRecordCardsVisible);
  wrapFunction('initRecordScreen', ensureRecordCardsVisible);
  wrapFunction('switchTab', ensureRecordCardsVisible);
  wrapFunction('showScreen', ensureRecordCardsVisible);

  patchHomeCta();
  ensureRecordCardsVisible();
}

install();

let attempts = 0;
const timer = setInterval(function() {
  attempts++;
  install();
  if (attempts >= 40) clearInterval(timer);
}, 250);

window.ippoDailyRecordCardSummary = getTodayRecordStatus;
window.ippoOpenTodayRecordCards = openTodayRecord;
