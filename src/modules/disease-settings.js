// src/modules/disease-settings.js
// Phase 4-C: Disease Settings UI 群を app-legacy.js から移植

function _state() { return window.getState ? window.getState() : (window.state || {}); }

export function openDiseaseSettings() {
  var s = _state();
  var DISEASE_CONFIG = window.DISEASE_CONFIG || {};
  var ICONS = window.ICONS || {};
  var currentArr = s.myDiseases || (s.myDisease ? [s.myDisease] : []);
  var diseases = Object.keys(DISEASE_CONFIG);
  var categories = {};
  diseases.forEach(function(d) {
    var cat = DISEASE_CONFIG[d].category || '一般';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(d);
  });

  var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;" id="diseaseOverlay" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--cream);border-radius:24px;padding:28px 22px;width:88%;max-width:360px;max-height:82vh;overflow-y:auto;box-shadow:0 12px 40px rgba(44,36,32,0.15);">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
  html += '<div style="font-family:Shippori Mincho,serif;font-size:17px;color:var(--ink);">気になる疾患を選択<span style="font-size:12px;color:var(--ink-light);margin-left:6px;">（複数可）</span></div>';
  html += '<button onclick="document.getElementById(\'diseaseOverlay\').remove()" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(200,180,170,0.3);background:var(--white);color:var(--ink-light);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
  html += '</div>';
  html += '<div style="font-size:12px;color:var(--ink-light);line-height:1.7;margin-bottom:16px;">選択した疾患の専用セルフチェックが記録画面に追加されます。</div>';

  var catKeys = Object.keys(categories);
  for (var c = 0; c < catKeys.length; c++) {
    html += '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin:12px 0 8px;text-transform:uppercase;">' + catKeys[c] + '</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">';
    var catDiseases = categories[catKeys[c]];
    for (var i = 0; i < catDiseases.length; i++) {
      var d = catDiseases[i];
      var sel = currentArr.indexOf(d) !== -1;
      html += '<button onclick="window.toggleDiseaseChip&&window.toggleDiseaseChip(this,\'' + d + '\')" data-disease="' + d + '" data-selected="' + (sel ? 'true' : 'false') + '" style="padding:8px 14px;border-radius:20px;background:' + (sel ? 'var(--rose-pale)' : 'var(--white)') + ';border:1.5px solid ' + (sel ? 'var(--rose)' : '#e8ddd8') + ';font-size:12px;color:' + (sel ? 'var(--rose)' : 'var(--ink-mid)') + ';cursor:pointer;transition:all 0.2s;box-shadow:0 1px 4px var(--shadow);">' + (DISEASE_CONFIG[d].icon || '') + ' ' + d + '</button>';
    }
    html += '</div>';
  }

  html += '<div style="margin-top:16px;display:flex;gap:8px;">';
  html += '<button onclick="window.clearAllDiseases&&window.clearAllDiseases()" style="flex:1;padding:14px;background:var(--white);color:var(--ink-mid);border:1px solid #e8ddd8;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:13px;cursor:pointer;">クリア</button>';
  html += '<button onclick="window.saveDiseaseSettings&&window.saveDiseaseSettings()" style="flex:2;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">保存する</button>';
  html += '</div>';
  html += '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

export function toggleDiseaseChip(btn, name) {
  var sel = btn.dataset.selected === 'true';
  if (sel) {
    btn.dataset.selected = 'false';
    btn.style.background = 'var(--white)';
    btn.style.borderColor = '#e8ddd8';
    btn.style.color = 'var(--ink-mid)';
  } else {
    btn.dataset.selected = 'true';
    btn.style.background = 'var(--rose-pale)';
    btn.style.borderColor = 'var(--rose)';
    btn.style.color = 'var(--rose)';
  }
}

export function clearAllDiseases() {
  var overlay = document.getElementById('diseaseOverlay');
  if (!overlay) return;
  overlay.querySelectorAll('[data-disease]').forEach(function(btn) {
    btn.dataset.selected = 'false';
    btn.style.background = 'var(--white)';
    btn.style.borderColor = '#e8ddd8';
    btn.style.color = 'var(--ink-mid)';
  });
}

export function saveDiseaseSettings() {
  var overlay = document.getElementById('diseaseOverlay');
  if (!overlay) return;
  var selected = [];
  overlay.querySelectorAll('[data-disease]').forEach(function(btn) {
    if (btn.dataset.selected === 'true') selected.push(btn.getAttribute('data-disease'));
  });
  var s = window.getState ? window.getState() : (window.state || {});
  if (window.setState) {
    window.setState(Object.assign({}, s, { myDiseases: selected, myDisease: undefined }));
  } else {
    s.myDiseases = selected;
    delete s.myDisease;
  }
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.saveSettingsStore === 'function') {
    window.saveSettingsStore({ trackedConditions: selected.slice() });
  }
  if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function() {});
  var display = document.getElementById('disease-setting-display');
  if (display) display.textContent = selected.length ? selected.join('・') : '設定する';
  overlay.remove();
  if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
  if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();
}

export function selectDisease(name) {
  var s = window.getState ? window.getState() : (window.state || {});
  var diseases = name ? [name] : [];
  if (window.setState) {
    window.setState(Object.assign({}, s, { myDiseases: diseases, myDisease: undefined }));
  } else {
    s.myDiseases = diseases;
    delete s.myDisease;
  }
  if (typeof window.saveState === 'function') window.saveState();
  var display = document.getElementById('disease-setting-display');
  if (display) display.textContent = name || '設定する';
  var overlay = document.getElementById('diseaseOverlay');
  if (overlay) overlay.remove();
  if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
}

export function updateDiseaseQuestions() {
  var container = document.getElementById('disease-questions');
  if (!container) return;
  var s = _state();
  var DISEASE_CONFIG = window.DISEASE_CONFIG || {};
  var diseases = s.myDiseases || (s.myDisease ? [s.myDisease] : []);
  var dot4 = document.getElementById('rec-dot-4');
  if (!diseases.length) {
    container.style.display = 'none';
    container.innerHTML = '';
    if (dot4) dot4.style.display = 'none';
    return;
  }
  if (dot4) dot4.style.display = 'block';
  var preserved = {};
  container.querySelectorAll('[data-disease-q]').forEach(function(g) {
    var sel = g.querySelector('.chip.selected');
    if (sel) preserved[g.getAttribute('data-disease-q')] = sel.textContent;
  });
  var stepNum = 'STEP 4';
  var titleNames = diseases.map(function(d) { return DISEASE_CONFIG[d] ? (DISEASE_CONFIG[d].icon + ' ' + d) : d; }).join(' / ');
  var html = '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:4px;">' + stepNum + '</div>';
  html += '<div class="section-title serif" style="margin-bottom:16px;">疾患セルフチェック</div>';
  html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:16px;padding:8px 10px;background:var(--rose-pale);border-radius:10px;">' + titleNames + '</div>';
  for (var d = 0; d < diseases.length; d++) {
    var disease = diseases[d];
    var config = DISEASE_CONFIG[disease];
    if (!config) continue;
    if (d > 0) html += '<div style="height:1px;background:#f0e8e4;margin:16px 0;"></div>';
    html += '<div style="font-size:11px;letter-spacing:0.12em;color:var(--ink-light);margin-bottom:10px;">' + config.icon + ' ' + config.label + '</div>';
    var questions = config.questions;
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      html += '<div style="margin-bottom:14px;">';
      html += '<div style="font-size:13px;color:var(--ink);margin-bottom:8px;">' + q.text + '</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;" data-disease-q="' + disease + '__' + q.id + '">';
      for (var j = 0; j < q.options.length; j++) {
        html += '<button class="chip" onclick="this.parentElement.querySelectorAll(\'.chip\').forEach(function(c){c.classList.remove(\'selected\')});this.classList.add(\'selected\');if(typeof window.updateRecProgressDots===\'function\')window.updateRecProgressDots();" style="font-size:12px;padding:6px 14px;border-radius:20px;cursor:pointer;">' + q.options[j] + '</button>';
      }
      html += '</div></div>';
    }
  }
  container.innerHTML = html;
  container.style.display = 'block';
  Object.keys(preserved).forEach(function(key) {
    var group = container.querySelector('[data-disease-q="' + key + '"]');
    if (group) {
      group.querySelectorAll('.chip').forEach(function(c) {
        if (c.textContent === preserved[key]) c.classList.add('selected');
      });
    }
  });
  if (typeof window.updateRecProgressDots === 'function') window.updateRecProgressDots();
}

export function updateDiseaseSettingDisplay() {
  var display = document.getElementById('disease-setting-display');
  if (!display) return;
  var saved = (_state().myDiseases) || [];
  display.textContent = saved.length ? saved.join('・') : '設定する';
}

window.openDiseaseSettings        = openDiseaseSettings;
window.toggleDiseaseChip          = toggleDiseaseChip;
window.clearAllDiseases           = clearAllDiseases;
window.saveDiseaseSettings        = saveDiseaseSettings;
window.selectDisease              = selectDisease;
window.updateDiseaseQuestions     = updateDiseaseQuestions;
window.updateDiseaseSettingDisplay = updateDiseaseSettingDisplay;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('disease-settings-loaded');
}

export {};
