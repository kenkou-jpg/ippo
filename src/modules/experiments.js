// src/modules/experiments.js
// Phase 4-C: _buildExperimentCompanion / openExperiments / startExperiment を移植

var EXPERIMENT_PRESETS = [
  { title: 'グルテンフリー30日',    factor: 'グルテン',     condition: 'avoid', days: 30, hypothesis: 'グルテンを避けると腹部の不快感に変化があるか試してみる' },
  { title: '毎日30分の運動',        factor: '運動した',     condition: 'do',    days: 30, hypothesis: '運動習慣がエネルギーや睡眠の質に与える影響を記録する' },
  { title: 'カフェイン断ち14日',    factor: 'カフェイン',   condition: 'avoid', days: 14, hypothesis: 'カフェインを控えると睡眠の質に変化があるか試してみる' },
  { title: '就寝前スマホなし14日',  factor: '夜更かし',     condition: 'avoid', days: 14, hypothesis: '夜更かしを避けると睡眠の質に変化があるか試してみる' },
  { title: '毎日入浴・半身浴21日',  factor: '入浴・半身浴', condition: 'do',    days: 21, hypothesis: '入浴習慣が痛みやストレスの感じ方に与える影響を記録する' },
  { title: 'アルコール断ち30日',    factor: 'アルコール',   condition: 'avoid', days: 30, hypothesis: '禁酒が睡眠の質や体調に与える影響を記録する' }
];

var _expOverlayApi = null;

function _expMetric(records, key) {
  if (!records.length) return null;
  var vals = records.map(function(r) {
    if (key === 'pain')    return r.painLevel;
    if (key === 'energy')  return r.energy;
    if (key === 'sleep')   return r.sleepQuality;
    if (key === 'wellness') return r.wellnessScore;
    if (key === 'temp')    return r.bodyTemp;
    return null;
  }).filter(function(v) { return v !== null && v !== undefined; });
  if (!vals.length) return null;
  return vals.reduce(function(a, b) { return a + b; }, 0) / vals.length;
}

function _buildExperimentCompanion(exp, records) {
  var now = new Date();
  var startDate = new Date(exp.startDate);
  var cut7  = new Date(now - 7  * 86400000);
  var cut14 = new Date(now - 14 * 86400000);

  var curr = (records || []).filter(function(r) {
    var d = new Date(r.record_date || r.date || '');
    return !isNaN(d) && d >= startDate && d >= cut7;
  });
  var prev = (records || []).filter(function(r) {
    var d = new Date(r.record_date || r.date || '');
    return !isNaN(d) && d >= cut14 && d < cut7;
  });

  var s = window.getState ? window.getState() : (window.state || {});
  var diseases = s.myDiseases || (s.myDisease ? [s.myDisease] : []);
  var primaryDisease = diseases[0] || '_default';
  var RULES = window._DISEASE_COMPANION_RULES || {};
  var rules = RULES[primaryDisease] || RULES['_default'] || [
    { key: 'pain', label: '痛み', invertGood: true },
    { key: 'energy', label: '活力' },
    { key: 'sleep', label: '睡眠' }
  ];

  var metrics = [];
  rules.forEach(function(rule) {
    var cVal = _expMetric(curr, rule.key);
    var pVal = _expMetric(prev, rule.key);
    if (cVal === null) return;
    var arrow = '→';
    if (pVal !== null) {
      var diff = cVal - pVal;
      var threshold = (rule.key === 'temp') ? 0.1 : 0.3;
      if (rule.invertGood) {
        arrow = diff < -threshold ? '↑' : diff > threshold ? '↓' : '→';
      } else {
        arrow = diff > threshold ? '↑' : diff < -threshold ? '↓' : '→';
      }
    }
    metrics.push({ label: rule.label, arrow: arrow });
  });

  if (!metrics.length) return '';

  var arrowColor = function(a) { return a === '↑' ? '#5a9070' : a === '↓' ? '#c07070' : '#8a8080'; };
  var diseaseNote = (primaryDisease !== '_default')
    ? '<span style="font-size:9px;color:var(--ink-light);opacity:.7;margin-left:6px;">' + primaryDisease + '</span>' : '';

  var itemsHtml = metrics.map(function(m) {
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;">'
      + '<span style="font-size:18px;line-height:1;color:' + arrowColor(m.arrow) + ';font-weight:600;">' + m.arrow + '</span>'
      + '<span style="font-size:10px;color:var(--ink-light);">' + m.label + '</span>'
      + '</div>';
  }).join('');

  var dataNote = curr.length === 0
    ? '<div style="font-size:10px;color:var(--ink-light);margin-top:4px;">この7日間の記録がありません</div>'
    : '<div style="font-size:10px;color:var(--ink-light);margin-top:4px;">直近' + curr.length + '件の記録をもとに</div>';

  return '<div style="margin-top:10px;padding:10px 12px;background:rgba(90,144,112,.06);border-radius:10px;border:1px solid rgba(90,144,112,.14);">'
    + '<div style="font-size:10px;font-weight:600;color:var(--sage);margin-bottom:8px;letter-spacing:.04em;">今見えていること' + diseaseNote + '</div>'
    + '<div style="display:flex;gap:16px;">' + itemsHtml + '</div>'
    + dataNote + '</div>';
}

export function openExperiments() {
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = s.experiments || [];

  if (!_expOverlayApi) {
    _expOverlayApi = window.createProOverlay({
      id: 'expOverlay', ariaLabel: 'ヘルスエクスペリメント',
      title: 'ヘルスエクスペリメント', subtitle: '仮説を立てて、自分のからだで検証する',
      footer: [{ id: 'exp-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose: function() { _expOverlayApi.close(); },
    });
    _expOverlayApi.getButton('exp-close').addEventListener('click', function() { _expOverlayApi.close(); });
  }

  var bodyHtml = '';
  var active = experiments.filter(function(e) { return e.status === 'active'; });
  if (active.length > 0) {
    bodyHtml += '<div class="pha-section-title">進行中</div>';
    active.forEach(function(exp, idx) {
      var start    = new Date(exp.startDate);
      var now      = new Date();
      var elapsed  = Math.floor((now - start) / 86400000);
      var progress = Math.min(100, Math.round(elapsed / exp.days * 100));
      var remaining = Math.max(0, exp.days - elapsed);
      bodyHtml += '<div class="pha-card" style="border-left:3px solid var(--sage);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);">' + exp.title + '</div>'
        + '<div style="font-size:10px;color:var(--sage);background:var(--sage-light);padding:2px 8px;border-radius:8px;">残り' + remaining + '日</div>'
        + '</div>'
        + '<div style="font-size:12px;color:var(--ink-mid);margin-bottom:10px;">💡 ' + exp.hypothesis + '</div>'
        + '<div class="pha-bar" style="margin-bottom:8px;"><div style="height:100%;width:' + progress + '%;background:var(--sage);border-radius:4px;transition:width 0.3s;"></div></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-light);">'
        + '<span>' + elapsed + '/' + exp.days + '日経過</span><span>' + progress + '%</span></div>'
        + _buildExperimentCompanion(exp, s.records || []);
      bodyHtml += '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button onclick="if(typeof window.showExperimentReport===\'function\')window.showExperimentReport(' + idx + ')" style="flex:1;padding:8px;background:rgba(90,144,112,.1);color:#5a9070;border:1px solid rgba(90,144,112,.25);border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;font-weight:500;">📊 詳細レポート</button>';
      if (elapsed >= exp.days) {
        bodyHtml += '<button onclick="if(typeof window.completeExperiment===\'function\')window.completeExperiment(' + idx + ')" style="flex:1;padding:8px;background:var(--sage);color:white;border:none;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">完了にする</button>';
      } else {
        bodyHtml += '<button onclick="if(typeof window.cancelExperiment===\'function\')window.cancelExperiment(' + idx + ')" style="flex:1;padding:8px;background:transparent;color:var(--ink-light);border:1px solid #e8ddd8;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">中止する</button>';
      }
      bodyHtml += '</div></div>';
    });
  }

  var completed = experiments.filter(function(e) { return e.status === 'completed'; });
  if (completed.length > 0) {
    bodyHtml += '<div class="pha-section-title" style="margin-top:8px;">完了済み</div>';
    completed.forEach(function(exp) {
      bodyHtml += '<div class="pha-card">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);">✅ ' + exp.title + '</div>'
        + '<div style="font-size:12px;color:var(--ink-light);">' + exp.days + '日間</div>'
        + '</div>';
      if (exp.result) bodyHtml += '<div style="font-size:12px;color:var(--ink-mid);line-height:1.7;">' + exp.result + '</div>';
      bodyHtml += '</div>';
    });
  }

  bodyHtml += '<div class="pha-section-title" style="margin-top:8px;">新しい実験を始める</div>';
  EXPERIMENT_PRESETS.forEach(function(preset, idx) {
    var alreadyActive = active.some(function(e) { return e.title === preset.title; });
    bodyHtml += '<div class="pha-card" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;' + (alreadyActive ? 'opacity:0.5;' : '') + '">'
      + '<div style="flex:1;">'
      + '<div style="font-size:14px;font-weight:500;color:var(--ink);">' + preset.title + '</div>'
      + '<div style="font-size:12px;color:var(--ink-light);margin-top:2px;">' + preset.hypothesis + '</div>'
      + '</div>';
    if (!alreadyActive) {
      bodyHtml += '<button onclick="if(typeof window.startExperiment===\'function\')window.startExperiment(' + idx + ')" style="padding:8px 14px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;white-space:nowrap;">開始</button>';
    } else {
      bodyHtml += '<span style="font-size:12px;color:var(--sage);">実施中</span>';
    }
    bodyHtml += '</div>';
  });

  bodyHtml += '<div class="pha-card">'
    + '<div style="font-size:12px;color:var(--ink);margin-bottom:8px;">✏️ オリジナル実験を作成</div>'
    + '<input type="text" id="exp-custom-title" placeholder="実験名（例：乳製品を控える）" style="width:100%;padding:8px 12px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;margin-bottom:6px;background:var(--cream);color:var(--ink);outline:none;box-sizing:border-box;">'
    + '<input type="text" id="exp-custom-hypothesis" placeholder="仮説（例：乳製品を避けるとお腹の張りが減る）" style="width:100%;padding:8px 12px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;margin-bottom:6px;background:var(--cream);color:var(--ink);outline:none;box-sizing:border-box;">'
    + '<div style="display:flex;gap:8px;align-items:center;">'
    + '<select id="exp-custom-days" style="flex:1;padding:8px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;background:var(--cream);color:var(--ink);"><option value="7">7日間</option><option value="14">14日間</option><option value="21">21日間</option><option value="30" selected>30日間</option></select>'
    + '<button onclick="if(typeof window.startCustomExperiment===\'function\')window.startCustomExperiment()" style="padding:8px 16px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">作成</button>'
    + '</div></div>';

  _expOverlayApi.body.innerHTML = bodyHtml;
  _expOverlayApi.open();
}

export function startExperiment(presetIdx) {
  var preset = EXPERIMENT_PRESETS[presetIdx];
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = (s.experiments || []).slice();
  experiments.push({
    title: preset.title, factor: preset.factor, condition: preset.condition,
    hypothesis: preset.hypothesis, days: preset.days,
    startDate: new Date().toISOString(), status: 'active'
  });
  if (window.setState) {
    window.setState(Object.assign({}, s, { experiments: experiments }));
  } else {
    s.experiments = experiments;
  }
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function() {});
  if (_expOverlayApi) _expOverlayApi.close();
  openExperiments();
}

window.openExperiments = openExperiments;
window.startExperiment = startExperiment;
window._buildExperimentCompanion = _buildExperimentCompanion;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('experiments-module-loaded');
}

export {};
