// ============================================================
//  ippo – src/modules/record-three-card.js
//  3-card recording flow — PHASE 1 (UI + local state)
//
//  Card 1: 今日の状態（体調・睡眠・エネルギー）
//  Card 2: 症状記録（コア — 症状タップで詳細展開）
//  Card 3: 感情・ひとことメモ
// ============================================================

import { buildCheckinSnapshot } from '../utils/checkin-snapshot.js';

// ─── Symptom Configuration ───────────────────────────────────
const SYMPTOMS = [
  {
    key: 'headache',
    label: '頭痛',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><path d="M9 13.5c-.4 1.8-1 3.5-1 4.5a4 4 0 0 0 8 0c0-1-.6-2.7-1-4.5"/><path d="M10 9h.01M14 9h.01"/></svg>`,
    types: ['ズキズキ', '重い', '締めつけ', '刺す', 'その他'],
    locations: [],
  },
  {
    key: 'abdomen',
    label: '腹部痛',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="14" rx="6" ry="7"/><path d="M9 9.5c.3-2 1.5-3.5 3-3.5s2.7 1.5 3 3.5"/></svg>`,
    types: ['重い', '張る', '刺す', '圧迫感', 'キリキリ', 'その他'],
    locations: ['左下腹部', '右下腹部', 'おへその周り', '骨盤(奥)まわり', '腰', 'その他'],
  },
  {
    key: 'swelling',
    label: 'むくみ',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c0 5-6 7-6 12a6 6 0 0 0 12 0c0-5-6-7-6-12z"/></svg>`,
    types: ['重い', '張る', 'パンパン', 'だるい', 'その他'],
    locations: [],
  },
  {
    key: 'fatigue',
    label: 'だるさ',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="18" height="11" rx="2"/><path d="M22 11v3" stroke-width="2.5"/><line x1="6" y1="12" x2="8" y2="12"/></svg>`,
    types: ['全身', '重い', '動けない', '頭がぼーっと', 'その他'],
    locations: [],
  },
  {
    key: 'nausea',
    label: '吐き気',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c0-4 3-8 8-8s8 4 8 8"/><path d="M8 18c1.5 2 6.5 2 8 0"/><path d="M12 12v4"/><path d="M10 14l2 2 2-2"/></svg>`,
    types: ['軽い', '強い', '吐いた', 'その他'],
    locations: [],
  },
  {
    key: 'irritable',
    label: 'イライラ',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    types: ['軽い', '強い', '抑えにくい', 'その他'],
    locations: [],
  },
  {
    key: 'anxiety',
    label: '不安',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>`,
    types: ['軽い', '強い', '眠れない', 'その他'],
    locations: [],
  },
  {
    key: 'abnormalBleeding',
    label: '不正出血',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/><path d="M9 18c1 1.5 5 1.5 6 0"/></svg>`,
    types: ['少量', '中量', '多量', 'その他'],
    locations: [],
  },
  {
    key: 'discharge',
    label: 'おりもの\n変化',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z"/><path d="M8 16c.8 2 6.2 2 8-.5"/></svg>`,
    types: ['量が増えた', '色が変わった', 'においが変わった', 'その他'],
    locations: [],
  },
  {
    key: 'other',
    label: 'その他',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>`,
    types: [],
    locations: [],
  },
];

// ─── Emotion Configuration ────────────────────────────────────
const EMOTIONS = [
  {
    key: 'calm',
    label: '穏やか',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c48b9f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>`,
  },
  {
    key: 'happy',
    label: 'うれしい',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e6b84a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  },
  {
    key: 'relaxed',
    label: 'リラックス',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6aaa7a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C10 7 5 9 5 14a7 7 0 0 0 14 0c0-5-5-7-7-12z"/><path d="M9 17c1 1.5 5 1.5 6 0"/></svg>`,
  },
  {
    key: 'anxious',
    label: '不安',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b9fd6" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/><path d="M14 13h-2l-1-2"/></svg>`,
  },
  {
    key: 'irritated',
    label: 'イライラ',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d4845a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  {
    key: 'down',
    label: '落ち込む',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b9fd6" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/><path d="M10 15h4"/></svg>`,
  },
  {
    key: 'grateful',
    label: '感謝',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c48b9f" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  },
  {
    key: 'positive',
    label: '前向き',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e6b84a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  },
  {
    key: 'neutral',
    label: 'ふつう',
    icon: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9e8f8b" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="15" x2="16" y2="15"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`,
  },
];

// ─── Session State ────────────────────────────────────────────
let _state = null;

function _initState() {
  return {
    currentCard: 1,
    snapshot: { condition: null, sleep: null, energy: null },
    // key → { severity: null, types: [], locations: [] }
    symptoms: {},
    emotions: { tags: [], memo: '' },
    adaptiveResponses: [],  // PHASE 4: followup question answers
  };
}

// ─── Card Navigation ──────────────────────────────────────────
function _showCard(n) {
  _state.currentCard = n;

  [1, 2, 3].forEach(function (i) {
    var el = document.getElementById('rtc-card-' + i);
    if (el) el.style.display = i === n ? 'block' : 'none';
  });

  var fill = document.getElementById('rtc-progress-fill');
  var stepLabel = document.getElementById('rtc-step-label');
  if (fill) fill.style.width = ((n / 3) * 100).toFixed(2) + '%';
  if (stepLabel) stepLabel.textContent = n + ' / 3';

  var backBtn = document.getElementById('rtc-btn-back');
  if (backBtn) backBtn.style.display = n > 1 ? '' : 'none';

  var nextBtn = document.getElementById('rtc-btn-next');
  if (nextBtn) nextBtn.textContent = n === 3 ? '保存する' : '次へ →';

  var hintBanner = document.getElementById('rtc-hint-banner');
  if (hintBanner) hintBanner.style.display = n === 2 ? 'flex' : 'none';

  var bottomHint = document.getElementById('rtc-bottom-hint');
  if (bottomHint) {
    bottomHint.style.display = n === 1 ? '' : 'none';
  }

  // PHASE 4: render adaptive questions on first visit to Card 2
  if (n === 2) {
    var adaptiveSec = document.getElementById('rtc-adaptive-section');
    if (adaptiveSec && adaptiveSec.childElementCount === 0) {
      _renderAdaptiveQuestions(adaptiveSec);
    }
  }

  var screen = document.getElementById('screen-record-three-card');
  if (screen) screen.scrollTop = 0;
}

function _goNext() {
  if (_state.currentCard < 3) {
    _showCard(_state.currentCard + 1);
  } else {
    _saveRecord();
  }
}

function _goBack() {
  if (_state.currentCard > 1) {
    _showCard(_state.currentCard - 1);
  } else {
    _close();
  }
}

function _close() {
  if (typeof window.switchTab === 'function') {
    window.switchTab('home', document.querySelector('.nav-item'));
  } else if (typeof window.showScreen === 'function') {
    window.showScreen('home');
  }
}

// ─── Card 1: Selection Handlers ───────────────────────────────
function _rtcSelect(field, val, el) {
  var parent = el.closest('[id^="rtc-cond"], [id^="rtc-sleep"], [id^="rtc-energy"]');
  if (!parent) parent = el.parentElement;
  if (parent) {
    parent.querySelectorAll('.rtc-mood-chip, .rtc-option-chip').forEach(function (b) {
      b.classList.remove('selected');
    });
  }
  el.classList.add('selected');
  _state.snapshot[field] = val;
}

// ─── Card 2: Symptom Grid ─────────────────────────────────────
function _buildSymptomGrid() {
  var grid = document.getElementById('rtc-symptom-grid');
  if (!grid) return;
  grid.innerHTML = SYMPTOMS.map(function (s) {
    var labelHtml = s.label.replace('\n', '<br>');
    return (
      '<button class="rtc-symptom-chip" data-key="' + s.key + '" onclick="if(window._rtcToggleSymptom)window._rtcToggleSymptom(\'' + s.key + '\')">' +
        '<div class="rtc-check"><svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg></div>' +
        s.icon +
        '<span>' + labelHtml + '</span>' +
      '</button>'
    );
  }).join('');
}

function _toggleSymptom(key) {
  var chip = document.querySelector('.rtc-symptom-chip[data-key="' + key + '"]');
  if (!chip) return;

  var isSelected = chip.classList.contains('selected');
  chip.classList.toggle('selected', !isSelected);

  if (!isSelected) {
    _state.symptoms[key] = { severity: null, types: [], locations: [] };
    _addSymptomDetail(key);
  } else {
    delete _state.symptoms[key];
    _removeSymptomDetail(key);
  }
}

function _addSymptomDetail(key) {
  var config = SYMPTOMS.find(function (s) { return s.key === key; });
  if (!config) return;
  var container = document.getElementById('rtc-symptom-details');
  if (!container) return;

  var div = document.createElement('div');
  div.className = 'rtc-detail-card';
  div.id = 'rtc-detail-' + key;

  var typesHtml = '';
  if (config.types.length > 0) {
    typesHtml =
      '<div class="rtc-detail-section">' +
        '<div class="rtc-detail-q">② どんな感じでしたか？</div>' +
        '<div class="rtc-detail-chips">' +
          config.types.map(function (t) {
            return '<button class="rtc-detail-chip" onclick="if(window._rtcToggleType)window._rtcToggleType(this,\'' + key + '\',\'' + t + '\')">' + t + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  var locHtml = '';
  if (config.locations.length > 0) {
    locHtml =
      '<div class="rtc-detail-section">' +
        '<div class="rtc-detail-q">③ どのあたりが気になりましたか？</div>' +
        '<div class="rtc-detail-chips rtc-detail-chips--wrap">' +
          config.locations.map(function (l) {
            return '<button class="rtc-detail-chip" onclick="if(window._rtcToggleLoc)window._rtcToggleLoc(this,\'' + key + '\',\'' + l + '\')">' + l + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
  }

  var displayLabel = config.label.replace('\n', '');
  div.innerHTML =
    '<div class="rtc-detail-header">' +
      '<div class="rtc-detail-name">' + config.icon + '<span>' + displayLabel + '</span></div>' +
      '<button class="rtc-detail-close" onclick="if(window._rtcToggleSymptom)window._rtcToggleSymptom(\'' + key + '\')">閉じる ∧</button>' +
    '</div>' +
    '<div class="rtc-detail-section">' +
      '<div class="rtc-detail-q">① どのくらい気になりましたか？</div>' +
      '<div class="rtc-detail-chips">' +
        ['軽い', '中くらい', '強い'].map(function (s) {
          return '<button class="rtc-detail-chip rtc-detail-chip--sev" onclick="if(window._rtcSelectSeverity)window._rtcSelectSeverity(this,\'' + key + '\',\'' + s + '\')">' + s + '</button>';
        }).join('') +
      '</div>' +
    '</div>' +
    typesHtml +
    locHtml;

  container.appendChild(div);
}

function _removeSymptomDetail(key) {
  var el = document.getElementById('rtc-detail-' + key);
  if (el) {
    el.style.animation = 'rtcCollapse 0.2s ease forwards';
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  }
}

function _selectSeverity(el, key, val) {
  var group = el.closest('.rtc-detail-chips');
  if (group) group.querySelectorAll('.rtc-detail-chip--sev').forEach(function (b) { b.classList.remove('selected'); });
  el.classList.add('selected');
  if (_state.symptoms[key]) _state.symptoms[key].severity = val;
}

function _toggleType(el, key, val) {
  el.classList.toggle('selected');
  var sym = _state.symptoms[key];
  if (!sym) return;
  var idx = sym.types.indexOf(val);
  if (idx >= 0) sym.types.splice(idx, 1);
  else sym.types.push(val);
}

function _toggleLoc(el, key, val) {
  el.classList.toggle('selected');
  var sym = _state.symptoms[key];
  if (!sym) return;
  var idx = sym.locations.indexOf(val);
  if (idx >= 0) sym.locations.splice(idx, 1);
  else sym.locations.push(val);
}

// ─── Card 3: Emotion Grid ─────────────────────────────────────
function _buildEmotionGrid() {
  var grid = document.getElementById('rtc-emotions');
  if (!grid) return;
  grid.innerHTML = EMOTIONS.map(function (e) {
    return (
      '<button class="rtc-emotion-chip" data-key="' + e.key + '" onclick="if(window._rtcToggleEmotion)window._rtcToggleEmotion(\'' + e.key + '\')">' +
        e.icon +
        '<span>' + e.label + '</span>' +
      '</button>'
    );
  }).join('');
}

function _toggleEmotion(key) {
  var chip = document.querySelector('.rtc-emotion-chip[data-key="' + key + '"]');
  if (!chip) return;
  chip.classList.toggle('selected');
  var tags = _state.emotions.tags;
  var idx = tags.indexOf(key);
  if (idx >= 0) tags.splice(idx, 1);
  else tags.push(key);
}

// ─── Save (PHASE 1: local state + existing save integration) ──
function _saveRecord() {
  var memoEl = document.getElementById('rtc-memo');
  if (memoEl) _state.emotions.memo = memoEl.value;

  var payload = _buildPayload();
  console.log('[rtc] saving record:', payload);

  // Integrate with existing save flow if available
  _integrateWithExistingSave(payload);

  _showSuccessState();
}

function _buildPayload() {
  var today = new Date().toISOString().split('T')[0];
  var symptomList = Object.keys(_state.symptoms).map(function (key) {
    var detail = _state.symptoms[key];
    var config = SYMPTOMS.find(function (s) { return s.key === key; });
    return {
      symptom: config ? config.label.replace('\n', '') : key,
      severity: detail.severity,
      types: detail.types.slice(),
      locations: detail.locations.slice(),
    };
  });

  return {
    // New schema
    record_date: today,
    snapshot: Object.assign({}, _state.snapshot),
    symptomDetails: symptomList,
    emotions: { tags: _state.emotions.tags.slice(), memo: _state.emotions.memo },
    adaptiveResponses: (_state.adaptiveResponses || []).slice(),  // PHASE 4

    // Daily check-in identity flag + frozen snapshot:
    // - uiFlow: distinguishes this save path from calendar/quick/symptom edits.
    // - completedAt: ISO timestamp of when the intentional check-in was done.
    // - checkinSnapshot: deep-frozen copy produced by buildCheckinSnapshot().
    //
    // WHY checkinSnapshot (see utils/checkin-snapshot.js for full rationale):
    //   mergeRecordPreservingExisting() overwrites non-empty fields when other
    //   save paths write to the same record. meta is never included by those
    //   paths, so checkinSnapshot is permanently frozen after daily check-in.
    meta: {
      uiFlow: 'daily-checkin',
      completedAt: new Date().toISOString(),
      checkinSnapshot: buildCheckinSnapshot({
        snapshot:    _state.snapshot,
        symptomList: symptomList,
        emotions:    _state.emotions,
        note:        _state.emotions.memo,
      }),
    },

    // Mapped to existing schema for compatibility
    mood: { great: 5, good: 4, normal: 3, slightlyBad: 2, tough: 1 }[_state.snapshot.condition] || null,
    sleepQuality: { wellSlept: 5, soSo: 4, wokeUp: 3, hardlySlept: 1 }[_state.snapshot.sleep] || null,
    condition_scale: { plenty: 5, soSo: 4, normal: 3, low: 2, hardlyAny: 1 }[_state.snapshot.energy] || null,
    symptoms: symptomList.map(function (s) { return s.symptom; }),
    note: _state.emotions.memo,
    painLevel: (function () {
      var sevMap = { '軽い': 2, '中くらい': 5, '強い': 8 };
      var maxSev = null;
      symptomList.forEach(function (s) {
        var v = sevMap[s.severity];
        if (v != null && (maxSev === null || v > maxSev)) maxSev = v;
      });
      return maxSev;
    })(),
  };
}

function _integrateWithExistingSave(payload) {
  // Delegate to existing save pipeline if available.
  // Injected at PHASE 2 via window.rtcSaveDelegate.
  if (typeof window.rtcSaveDelegate === 'function') {
    try { window.rtcSaveDelegate(payload); } catch (e) {
      console.warn('[rtc] save delegate error:', e);
    }
    return;
  }

  // Minimal direct save: write into state.records and persist.
  var getState = window.getState || window.ippoGetState;
  var saveState = window.saveState || window.ippoSaveState;
  if (typeof getState !== 'function' || typeof saveState !== 'function') return;

  try {
    var s = getState();
    if (!s) return;
    var records = s.records || [];
    var today = payload.record_date;
    var existing = records.findIndex(function (r) {
      return (r.record_date || r.date || '').slice(0, 10) === today;
    });
    var merged = Object.assign(
      { record_date: today, date: today, created_at: new Date().toISOString() },
      existing >= 0 ? records[existing] : {},
      payload,
      { updated_at: new Date().toISOString() }
    );
    if (existing >= 0) records[existing] = merged;
    else records.push(merged);
    s.records = records;
    saveState();

    // Trigger home/calendar refresh if available
    if (typeof window.renderHome === 'function') window.renderHome();
    if (typeof window.buildCalendar === 'function') window.buildCalendar();
    if (typeof window.cloudBackupAll === 'function') {
      setTimeout(function () { window.cloudBackupAll(); }, 500);
    }
  } catch (e) {
    console.warn('[rtc] direct save error:', e);
  }
}

function _showSuccessState() {
  var nav = document.getElementById('rtc-nav');
  var hintBanner = document.getElementById('rtc-hint-banner');
  var bottomHint = document.getElementById('rtc-bottom-hint');
  [1, 2, 3].forEach(function (i) {
    var el = document.getElementById('rtc-card-' + i);
    if (el) el.style.display = 'none';
  });
  if (nav) nav.style.display = 'none';
  if (hintBanner) hintBanner.style.display = 'none';
  if (bottomHint) bottomHint.style.display = 'none';

  var success = document.getElementById('rtc-success');
  if (success) {
    success.style.display = 'flex';
    success.offsetHeight; // force repaint
    success.classList.add('active');
  }

  setTimeout(function () { _close(); }, 1800);
}

// ─── Adaptive Questions (PHASE 4) ────────────────────────────
// Card 2 の下部に gentle followup を表示する。
// window.ippoAdaptiveSignals がなければ何もしない (rollback safe)。

function _renderAdaptiveQuestions(container) {
  if (!container) return;
  var svc = window.ippoAdaptiveSignals;
  if (!svc) return;

  // PHASE 5: settings-store 経由に切り替え（state.settingsProfile 直接依存を排除）
  var settingsProfile = typeof window.getSettingsStore === 'function'
    ? window.getSettingsStore()
    : (typeof window.getState === 'function' ? (window.getState().settingsProfile || {}) : {});
  var candidates;
  try {
    candidates = svc.getAdaptiveCandidates(settingsProfile);
  } catch (_) { return; }

  if (!candidates || candidates.length === 0) return;

  var html = '<div class="rtc-adaptive-section">' +
    '<div class="rtc-adaptive-heading">気になったことがあれば</div>';

  candidates.forEach(function (q) {
    html += '<div class="rtc-adaptive-item">';
    html += '<div class="rtc-adaptive-q">' + q.label + '</div>';
    html += '<div class="rtc-adaptive-answers">';
    (q.answers || []).forEach(function (a) {
      html +=
        '<button class="rtc-adaptive-chip"' +
        ' data-qid="' + q.id + '"' +
        ' data-symkey="' + q.symptomKey + '"' +
        ' data-answer="' + a + '"' +
        ' onclick="if(window._rtcAnswerAdaptive)window._rtcAnswerAdaptive(this)">' +
        a + '</button>';
    });
    html += '</div></div>';
  });

  html += '<div class="rtc-adaptive-skip-row">' +
    '<button class="rtc-adaptive-skip" onclick="if(window._rtcSkipAdaptive)window._rtcSkipAdaptive()">スキップ</button>' +
    '</div>';
  html += '</div>';

  container.innerHTML = html;
}

function _answerAdaptive(el) {
  var qid    = el.getAttribute('data-qid');
  var symKey = el.getAttribute('data-symkey');
  var answer = el.getAttribute('data-answer');

  // Visual feedback: deselect siblings, select tapped chip
  var row = el.parentElement;
  if (row) {
    row.querySelectorAll('.rtc-adaptive-chip').forEach(function (b) {
      b.classList.remove('selected');
    });
  }
  el.classList.add('selected');

  // Store in session state (included in save payload)
  if (!_state.adaptiveResponses) _state.adaptiveResponses = [];
  _state.adaptiveResponses = _state.adaptiveResponses.filter(function (r) {
    return r.questionId !== qid;
  });
  _state.adaptiveResponses.push({
    questionId: qid,
    answer:     answer,
    timestamp:  new Date().toISOString(),
  });

  // Persist immediately: marks followup as shown, updates followupsShown count
  var svc = window.ippoAdaptiveSignals;
  if (svc) {
    try { svc.recordAdaptiveResponse(qid, answer, symKey); } catch (_) {}
  }
}

function _skipAdaptive() {
  var sec = document.getElementById('rtc-adaptive-section');
  if (!sec) return;
  sec.style.transition = 'opacity 0.3s ease';
  sec.style.opacity    = '0';
  setTimeout(function () {
    if (sec.parentNode) sec.innerHTML = '';
  }, 300);
}

// ─── PR-REC-03a: Prototype Record View (flagged, save not wired) ──
// Markup lives in src/screens/record-three-card.html under #rtc-proto-view
// (hidden by default). This section only toggles visibility and provides
// local-state-only chip interactivity — no save/business logic connection
// (that is PR-REC-03b scope).
function _isPrototypeViewEnabled() {
  try {
    var params = new URLSearchParams(window.location.search);
    if (params.get('recordUI') === 'prototype') return true;
    return window.localStorage.getItem('ippo_record_ui_v2') === '1';
  } catch (_) {
    return false;
  }
}

function _initProtoView() {
  // PR-REC-03a fix: '.rtc-header' is a CSS class, not an element id — it was
  // previously mixed into the getElementById loop below and silently never
  // matched, leaving the legacy progress header visible behind the new view.
  var headerEl = document.querySelector('.rtc-header');
  if (headerEl) headerEl.style.display = 'none';

  ['rtc-hint-banner', 'rtc-card-1', 'rtc-card-2', 'rtc-card-3', 'rtc-success', 'rtc-nav', 'rtc-bottom-hint'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });

  var view = document.getElementById('rtc-proto-view');
  if (!view) return;
  view.hidden = false;

  view.querySelectorAll('.selected').forEach(function (el) { el.classList.remove('selected'); });
  var detailPanel = document.getElementById('record-detail-panel');
  if (detailPanel) detailPanel.hidden = true;
  var memo = document.getElementById('rtc-proto-memo');
  if (memo) memo.value = '';

  // Restore the prototype's default-selected demo state (mood=🙂/normal/normal
  // sleep/skin, bloodClot=none, bloodColor=clear, bowel=normal), matching the
  // markup's baked-in `class="selected"` defaults after the reset above.
  ['[data-field="mood"] button:nth-child(3)', '[data-field="sleep"] button:nth-child(2)',
   '[data-field="skin"] button:nth-child(2)', '[data-field="bloodClot"] button:nth-child(1)',
   '[data-field="bloodColor"] button:nth-child(1)', '[data-field="bowel"] button:nth-child(1)'
  ].forEach(function (sel) {
    var el = view.querySelector(sel);
    if (el) el.classList.add('selected');
  });
}

function _protoSelect(el) {
  var group = el.parentElement;
  if (group) group.querySelectorAll('button').forEach(function (b) { b.classList.remove('selected'); });
  el.classList.add('selected');
}

function _protoToggleTag(el) {
  el.classList.toggle('selected');
}

function _protoToggleDetail() {
  var panel = document.getElementById('record-detail-panel');
  if (panel) panel.hidden = !panel.hidden;
}

function _protoSubmit() {
  // PR-REC-03a scope: markup/CSS + local UI state only. Save pipeline
  // connection (_integrateWithExistingSave / window.rtcSaveDelegate) is
  // PR-REC-03b scope — intentionally not wired here.
  console.log('[rtc-proto] submit tapped — save not wired yet (PR-REC-03b)');
}

// Temporary migration bridge only (Founder Decision, PR-REC-03a adoption).
// Not a permanent API — inline onclick handlers in #rtc-proto-view need these
// on window until the Prototype markup is wired through a proper event
// delegation layer. Removal candidate for PR-REC-03c or the Legacy Removal
// Program (do not add further window.* exports on top of these).
window.isPrototypeRecordUIEnabled = _isPrototypeViewEnabled;
window._rtcProtoSelect       = _protoSelect;
window._rtcProtoToggleTag    = _protoToggleTag;
window._rtcProtoToggleDetail = _protoToggleDetail;
window._rtcProtoSubmit       = _protoSubmit;

// ─── Screen Initialization ────────────────────────────────────
function _initScreen() {
  _state = _initState();

  if (_isPrototypeViewEnabled()) {
    _initProtoView();
    return;
  }

  _buildSymptomGrid();
  _buildEmotionGrid();

  // Reset selections
  document.querySelectorAll('.rtc-mood-chip, .rtc-option-chip').forEach(function (el) {
    el.classList.remove('selected');
  });

  var details = document.getElementById('rtc-symptom-details');
  if (details) details.innerHTML = '';

  var memo = document.getElementById('rtc-memo');
  if (memo) memo.value = '';

  var success = document.getElementById('rtc-success');
  if (success) { success.style.display = 'none'; success.classList.remove('active'); }

  var nav = document.getElementById('rtc-nav');
  if (nav) nav.style.display = '';

  var bottomHint = document.getElementById('rtc-bottom-hint');
  if (bottomHint) bottomHint.style.display = '';

  _showCard(1);
}

// ─── Public: open the 3-card recording flow ───────────────────
function openThreeCardRecord() {
  if (typeof window.showScreen === 'function') {
    window.showScreen('record-three-card').then(function () {
      _initScreen();
    }).catch(function (e) {
      console.error('[rtc] showScreen error:', e);
    });
  }
}

// ─── Window exports (called from HTML event handlers) ─────────
window._rtcToggleSymptom  = _toggleSymptom;
window._rtcSelectSeverity = _selectSeverity;
window._rtcToggleType     = _toggleType;
window._rtcToggleLoc      = _toggleLoc;
window._rtcToggleEmotion  = _toggleEmotion;

window.rtcSelect          = _rtcSelect;
window.rtcGoNext          = _goNext;
window.rtcGoBack          = _goBack;
window.rtcClose           = _close;
window.rtcAddSymptom      = function () { /* PHASE 4 placeholder */ };

// PHASE 4: adaptive question handlers
window._rtcAnswerAdaptive = _answerAdaptive;
window._rtcSkipAdaptive   = _skipAdaptive;

window.openThreeCardRecord = openThreeCardRecord;

// Override the existing entry point — runs after record.js since this module
// is imported last in main.js. Home buttons and quick-record all use
// window.openRecordScreen, so this single override captures every entry.
window.openRecordScreen = openThreeCardRecord;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('record-three-card-module-loaded');
}
