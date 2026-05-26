// ============================================================
//  ippo – src/modules/settings-panel.js
//  設定パネル: 4項目の選択UI
//  設定 = 伴走の調整。静かに、押しつけない。
// ============================================================

import { getSettingsProfile, saveSettingsProfile } from '../services/settings-profile.js';

// ── 選択肢定義 ───────────────────────────────────────────────

var MODE_OPTIONS = [
  { id: 'tired',       label: '少し疲れている' },
  { id: 'overworked',  label: 'がんばりすぎている' },
  { id: 'anxious',     label: '不安が多い' },
  { id: 'recovery',    label: '回復を優先したい' },
  { id: 'calm',        label: '落ち着いている' },
  { id: 'fluctuating', label: '波が大きい' },
  { id: 'slow',        label: 'ゆっくり整えたい' },
  { id: 'neutral',     label: 'とくにない' },
];

var PRIORITY_OPTIONS = [
  { id: 'symptom_understanding', label: '症状を理解したい' },
  { id: 'emotion',               label: '気持ちを整理したい' },
  { id: 'sleep',                 label: '睡眠を整えたい' },
  { id: 'cycle',                 label: '周期を把握したい' },
  { id: 'overwork_prevention',   label: '無理しすぎを防ぎたい' },
  { id: 'recording_habit',       label: '記録を続けたい' },
  { id: 'anxiety_reduction',     label: '不安を減らしたい' },
];

var STYLE_OPTIONS = [
  { id: 'gentle',   label: 'やさしく',  description: '必要なことだけ、静かに表示します' },
  { id: 'balanced', label: 'バランス',  description: 'おすすめの情報量で表示します' },
  { id: 'deep',     label: '深く見る',  description: '分析や傾向も詳しく表示します' },
];

var MODULE_OPTIONS = [
  { id: 'todayInsight',         label: '今日の気づき' },
  { id: 'sleepRelation',        label: '睡眠との関係' },
  { id: 'cyclePhase',           label: '周期フェーズ' },
  { id: 'emotionMemo',          label: '感情メモ' },
  { id: 'recentChanges',        label: '最近の変化' },
  { id: 'experimentSuggestion', label: '実験提案' },
  { id: 'recoveryTrend',        label: '回復傾向' },
  { id: 'bodyGraph',            label: '体調グラフ' },
  { id: 'frequentSymptoms',     label: 'よく出る症状' },
  { id: 'aiInsight',            label: 'AIインサイト' },
];

// ── ラベル取得 ───────────────────────────────────────────────

function _findLabel(options, id) {
  var opt = options.filter(function (o) { return o.id === id; })[0];
  return opt ? opt.label : '';
}

// ── サブテキスト更新 ─────────────────────────────────────────

function updateSubTexts() {
  var profile = getSettingsProfile();

  // 状態ノート
  var modeNote = document.getElementById('set-status-note');
  if (modeNote && profile.currentMode && profile.currentMode !== 'neutral') {
    var lbl = _findLabel(MODE_OPTIONS, profile.currentMode);
    if (lbl) modeNote.textContent = '今の状態: ' + lbl;
  } else if (modeNote) {
    modeNote.textContent = 'いつでも変えられます';
  }

  // 重視したいこと
  var prioritySub = document.getElementById('sp-priority-sub');
  if (prioritySub) {
    var pl = _findLabel(PRIORITY_OPTIONS, profile.priorityFocus);
    prioritySub.textContent = pl || '設定する';
  }

  // 表示スタイル
  var styleSub = document.getElementById('sp-style-sub');
  if (styleSub) {
    var sl = _findLabel(STYLE_OPTIONS, profile.displayStyle);
    styleSub.textContent = sl || 'バランス';
  }
  var styleBadge = document.getElementById('sp-style-badge');
  if (styleBadge) {
    var sb = _findLabel(STYLE_OPTIONS, profile.displayStyle);
    styleBadge.textContent = sb || 'バランス';
  }

  // ホームモジュール
  var modulesSub = document.getElementById('sp-modules-sub');
  if (modulesSub) {
    var count = (profile.homeModules || []).length;
    modulesSub.textContent = count + '項目を表示中';
  }
}

// ── パネル開閉 ───────────────────────────────────────────────

var _currentPanel = null;
var _escHandler   = null;

function openSettingsPanel(type) {
  if (_currentPanel) closeSettingsPanel(_currentPanel);
  _currentPanel = type;

  var overlay = document.getElementById('sp-overlay-' + type);
  var panel   = document.getElementById('sp-panel-' + type);
  if (!overlay || !panel) return;

  renderPanelOptions(type);

  overlay.classList.add('sp-active');
  panel.classList.add('sp-active');
  document.body.style.overflow = 'hidden';

  if (_escHandler) document.removeEventListener('keydown', _escHandler);
  _escHandler = function (e) {
    if (e.key === 'Escape') closeSettingsPanel(type);
  };
  document.addEventListener('keydown', _escHandler);
}

function closeSettingsPanel(type) {
  var overlay = document.getElementById('sp-overlay-' + type);
  var panel   = document.getElementById('sp-panel-' + type);
  if (overlay) overlay.classList.remove('sp-active');
  if (panel)   panel.classList.remove('sp-active');
  document.body.style.overflow = '';
  if (_currentPanel === type) _currentPanel = null;
  if (_escHandler) {
    document.removeEventListener('keydown', _escHandler);
    _escHandler = null;
  }
}

// ── オプションレンダリング ────────────────────────────────────

function renderPanelOptions(type) {
  var profile = getSettingsProfile();

  if (type === 'mode') {
    var c = document.getElementById('sp-options-mode');
    if (!c) return;
    c.innerHTML = MODE_OPTIONS.map(function (opt) {
      var active = profile.currentMode === opt.id;
      return '<button class="sp-option' + (active ? ' sp-option-active' : '') +
        '" onclick="window._spSelect(\'mode\',\'' + opt.id + '\')">' +
        '<span class="sp-option-label">' + opt.label + '</span>' +
        (active ? '<span class="sp-option-check">✓</span>' : '') +
        '</button>';
    }).join('');
  }

  if (type === 'priority') {
    var c = document.getElementById('sp-options-priority');
    if (!c) return;
    c.innerHTML = PRIORITY_OPTIONS.map(function (opt) {
      var active = profile.priorityFocus === opt.id;
      return '<button class="sp-option' + (active ? ' sp-option-active' : '') +
        '" onclick="window._spSelect(\'priority\',\'' + opt.id + '\')">' +
        '<span class="sp-option-label">' + opt.label + '</span>' +
        (active ? '<span class="sp-option-check">✓</span>' : '') +
        '</button>';
    }).join('');
  }

  if (type === 'style') {
    var c = document.getElementById('sp-options-style');
    if (!c) return;
    c.innerHTML = STYLE_OPTIONS.map(function (opt) {
      var active = profile.displayStyle === opt.id;
      return '<button class="sp-option sp-option-style' + (active ? ' sp-option-active' : '') +
        '" onclick="window._spSelect(\'style\',\'' + opt.id + '\')">' +
        '<div><span class="sp-option-label">' + opt.label + '</span>' +
        '<span class="sp-option-desc">' + opt.description + '</span></div>' +
        (active ? '<span class="sp-option-check">✓</span>' : '') +
        '</button>';
    }).join('');
  }

  if (type === 'modules') {
    var c = document.getElementById('sp-options-modules');
    if (!c) return;
    var homeModules = profile.homeModules || [];
    c.innerHTML = MODULE_OPTIONS.map(function (opt) {
      var active = homeModules.indexOf(opt.id) !== -1;
      return '<button class="sp-chip' + (active ? ' sp-chip-active' : '') +
        '" onclick="window._spToggleModule(\'' + opt.id + '\')">' +
        opt.label + '</button>';
    }).join('');
  }
}

// ── 選択ハンドラ (window 公開) ─────────────────────────────
window._spSelect = function (panelType, id) {
  var update = {};
  if (panelType === 'mode')     update.currentMode   = id;
  if (panelType === 'priority') update.priorityFocus = id;
  if (panelType === 'style')    update.displayStyle  = id;
  saveSettingsProfile(update);
  renderPanelOptions(panelType);
  updateSubTexts();
};

window._spToggleModule = function (id) {
  var profile = getSettingsProfile();
  var modules = (profile.homeModules || []).slice();
  var idx = modules.indexOf(id);
  if (idx === -1) modules.push(id);
  else            modules.splice(idx, 1);
  saveSettingsProfile({ homeModules: modules });
  renderPanelOptions('modules');
  updateSubTexts();
};

// ── window 公開 ──────────────────────────────────────────────
window.openSettingsPanel  = openSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;

// ── 設定画面表示時の初期化 ───────────────────────────────────
export function initSettingsPanels() {
  updateSubTexts();
}

window.initSettingsPanels = initSettingsPanels;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('settings-panel-loaded');
}
