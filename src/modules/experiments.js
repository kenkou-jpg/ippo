// src/modules/experiments.js
// PR-089B (Legacy Removal Batch-11分割①): app-legacy.js の「ヘルスエクスペリメント」機能一式を物理移動。
// _buildExperimentCompanion / openExperiments / startExperiment は既存ドラフトを土台に、
// app-legacy.js最新版との再照合により _DISEASE_COMPANION_RULES 全10疾患ルール・
// _expMetric 全8ケース(sleep/mood/symptoms/pain/fatigue/temp/bleeding/bloating)を復元。
// startCustomExperiment / cancelExperiment / completeExperiment / _buildAIResultReport /
// showExperimentReport を新規に物理移動。

import { showAlertModal, showConfirmModal } from './ui-notifications.js';

// ─── P38: 疾患別コンパニオン指標ルール ─────────────────────────
// 各疾患の重点指標を定義。key は _expMetric() で集計可能なフィールド。
// metrics: 表示順に最大3件。invertGood=true は低下が改善を意味する。
var _DISEASE_COMPANION_RULES = {
  '卵巣嚢腫':     [{ label:'痛み',   key:'pain',     invertGood:true  },
                   { label:'張り',   key:'bloating', invertGood:true  },
                   { label:'睡眠',   key:'sleep',    invertGood:false }],
  'PCOS':          [{ label:'体温',   key:'temp',     invertGood:false },
                   { label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'気分',   key:'mood',     invertGood:false }],
  '子宮内膜症':   [{ label:'痛み',   key:'pain',     invertGood:true  },
                   { label:'疲労',   key:'fatigue',  invertGood:true  },
                   { label:'睡眠',   key:'sleep',    invertGood:false }],
  '子宮筋腫':     [{ label:'出血',   key:'bleeding', invertGood:true  },
                   { label:'疲労',   key:'fatigue',  invertGood:true  },
                   { label:'睡眠',   key:'sleep',    invertGood:false }],
  'PMS/PMDD':     [{ label:'気分',   key:'mood',     invertGood:false },
                   { label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'症状',   key:'symptoms', invertGood:true  }],
  '子宮腺筋症':   [{ label:'痛み',   key:'pain',     invertGood:true  },
                   { label:'出血',   key:'bleeding', invertGood:true  },
                   { label:'睡眠',   key:'sleep',    invertGood:false }],
  '更年期障害':   [{ label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'気分',   key:'mood',     invertGood:false },
                   { label:'体温',   key:'temp',     invertGood:false }],
  '不妊症':       [{ label:'体温',   key:'temp',     invertGood:false },
                   { label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'気分',   key:'mood',     invertGood:false }],
  '骨盤臓器脱':   [{ label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'疲労',   key:'fatigue',  invertGood:true  },
                   { label:'症状',   key:'symptoms', invertGood:true  }],
  '外陰痛症候群': [{ label:'痛み',   key:'pain',     invertGood:true  },
                   { label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'気分',   key:'mood',     invertGood:false }],
  // デフォルト（疾患未設定 or 未対応疾患）
  '_default':     [{ label:'睡眠',   key:'sleep',    invertGood:false },
                   { label:'気分',   key:'mood',     invertGood:false },
                   { label:'症状',   key:'symptoms', invertGood:true  }],
};

// PR-089B注記: _bleedingToNum は src/app-legacy.js（analyzeCyclePhases が使用、
// Calendar/Cycle系のためBatch-11分割④=PR-089Eの対象）にも同名の実装が残る。
// Experiment Category（本PR）のScope外への変更を避けるため、_expMetric('bleeding')
// が必要とする最小限の変換ロジックのみをここに複製する（PR-089E完了後に一本化予定）。
function _bleedingToNum(val) {
  var MAP = { none:0, trace:1, light:2, moderate:3, heavy:4, very_heavy:5,
              'なし':0, '少量':1, '軽い':2, '普通':3, '多い':4, '非常に多い':5 };
  return MAP[val] != null ? MAP[val] : null;
}

/** 疾患別指標の集計 */
function _expMetric(recs, key) {
  if (!recs.length) return null;
  function avg(vals) {
    var v = vals.filter(function(x) { return x != null && !isNaN(x); });
    return v.length ? v.reduce(function(a,b){return a+b;},0)/v.length : null;
  }
  switch (key) {
    case 'sleep':
      return avg(recs.map(function(r){ return r.sleepQuality || r.sleepHours || null; }).filter(function(v){return v>0;}));
    case 'mood':
      return avg(recs.map(function(r){ return r.mood||null; }).filter(function(v){return v>0;}));
    case 'symptoms':
      return avg(recs.map(function(r){ return (r.symptoms||[]).length+(r.symptomDetails||[]).length; }));
    case 'pain':
      return avg(recs.map(function(r){ return r.painLevel||null; }).filter(function(v){return v>0;}));
    case 'fatigue': {
      // energy を「疲労度 = 6 - energy」に変換（energy↑ = 疲労↓ = invertGood=true で改善↑）
      var energyVals = recs.map(function(r){ return r.energy||null; }).filter(function(v){return v>0;});
      if (energyVals.length) return 6 - avg(energyVals);
      // fallback: 疲労症状カウント
      return avg(recs.map(function(r){ return (r.symptoms||[]).filter(function(s){ return s.includes('疲'); }).length; }));
    }
    case 'temp':
      return avg(recs.map(function(r){ return r.basalTemp||r.temperature||null; }).filter(function(v){return v>30;}));
    case 'bleeding':
      return avg(recs.map(function(r){ return _bleedingToNum(r.menstrualCycle); }).filter(function(v){return v!=null;}));
    case 'bloating':
      return avg(recs.map(function(r){
        return (r.symptoms||[]).filter(function(s){ return /張り|膨満|bloat/i.test(s); }).length
             + (r.symptomDetails||[]).filter(function(s){ return /張り|膨満/i.test(s.symptom||''); }).length;
      }));
    default: return null;
  }
}

/**
 * 進行中実験の「今見えていること」コンパニオン層を生成する。
 * P38: myDiseases に応じて疾患別指標を表示。新規AI呼び出しなし。
 */
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

  // P38: 疾患別ルール選択
  var s = window.getState ? window.getState() : (window.state || {});
  var diseases = s.myDiseases || (s.myDisease ? [s.myDisease] : []);
  var primaryDisease = diseases[0] || '_default';
  var rules = _DISEASE_COMPANION_RULES[primaryDisease] || _DISEASE_COMPANION_RULES['_default'];

  var metrics = [];
  rules.forEach(function(rule) {
    var cVal = _expMetric(curr, rule.key);
    var pVal = _expMetric(prev, rule.key);
    if (cVal === null) return; // データなし → 表示しない
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

  var arrowColor = function(a) {
    return a === '↑' ? '#5a9070' : a === '↓' ? '#c07070' : '#8a8080';
  };

  var itemsHtml = metrics.map(function(m) {
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:52px;">'
      + '<span style="font-size:18px;line-height:1;color:' + arrowColor(m.arrow) + ';font-weight:600;">' + m.arrow + '</span>'
      + '<span style="font-size:10px;color:var(--ink-light);">' + m.label + '</span>'
      + '</div>';
  }).join('');

  // 疾患ラベル（デフォルト以外のとき表示）
  var diseaseNote = (primaryDisease !== '_default')
    ? '<span style="font-size:9px;color:var(--ink-light);opacity:.7;margin-left:6px;">' + primaryDisease + '</span>'
    : '';

  var dataNote = curr.length === 0
    ? '<div style="font-size:10px;color:var(--ink-light);margin-top:4px;">この7日間の記録がありません</div>'
    : '<div style="font-size:10px;color:var(--ink-light);margin-top:4px;">直近' + curr.length + '件の記録をもとに</div>';

  return '<div style="margin-top:10px;padding:10px 12px;background:rgba(90,144,112,.06);border-radius:10px;border:1px solid rgba(90,144,112,.14);">'
    + '<div style="font-size:10px;font-weight:600;color:var(--sage);margin-bottom:8px;letter-spacing:.04em;">今見えていること' + diseaseNote + '</div>'
    + '<div style="display:flex;gap:16px;">' + itemsHtml + '</div>'
    + dataNote
    + '</div>';
}

var EXPERIMENT_PRESETS = [
  {title:'グルテンフリー30日', factor:'グルテン', condition:'avoid', days:30, hypothesis:'グルテンを避けると腹部の不快感に変化があるか試してみる'},
  {title:'毎日30分の運動', factor:'運動した', condition:'do', days:30, hypothesis:'運動習慣がエネルギーや睡眠の質に与える影響を記録する'},
  {title:'カフェイン断ち14日', factor:'カフェイン', condition:'avoid', days:14, hypothesis:'カフェインを控えると睡眠の質に変化があるか試してみる'},
  {title:'就寝前スマホなし14日', factor:'夜更かし', condition:'avoid', days:14, hypothesis:'夜更かしを避けると睡眠の質に変化があるか試してみる'},
  {title:'毎日入浴・半身浴21日', factor:'入浴・半身浴', condition:'do', days:21, hypothesis:'入浴習慣が痛みやストレスの感じ方に与える影響を記録する'},
  {title:'アルコール断ち30日', factor:'アルコール', condition:'avoid', days:30, hypothesis:'禁酒が睡眠の質や体調に与える影響を記録する'}
];

var _expOverlayApi = null;
export function openExperiments(){
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = s.experiments || [];

  if (!_expOverlayApi) {
    _expOverlayApi = window.createProOverlay({
      id:        'expOverlay',
      ariaLabel: 'ヘルスエクスペリメント',
      title:     'ヘルスエクスペリメント',
      subtitle:  '仮説を立てて、自分のからだで検証する',
      footer:    [{ id: 'exp-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _expOverlayApi.close(); },
    });
    _expOverlayApi.getButton('exp-close').addEventListener('click', function(){ _expOverlayApi.close(); });
  }

  var bodyHtml = '';

  // 進行中の実験
  var active = experiments.filter(function(e){ return e.status === 'active'; });
  if(active.length > 0){
    bodyHtml += '<div class="pha-section-title">進行中</div>';
    active.forEach(function(exp, idx){
      var start = new Date(exp.startDate);
      var now = new Date();
      var elapsed = Math.floor((now - start) / 86400000);
      var progress = Math.min(100, Math.round(elapsed / exp.days * 100));
      var remaining = Math.max(0, exp.days - elapsed);

      bodyHtml += '<div class="pha-card" style="border-left:3px solid var(--sage);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);">'+exp.title+'</div>'
        + '<div style="font-size:10px;color:var(--sage);background:var(--sage-light);padding:2px 8px;border-radius:8px;">残り'+remaining+'日</div>'
        + '</div>'
        + '<div style="font-size:12px;color:var(--ink-mid);margin-bottom:10px;">💡 '+exp.hypothesis+'</div>'
        + '<div class="pha-bar" style="margin-bottom:8px;"><div style="height:100%;width:'+progress+'%;background:var(--sage);border-radius:4px;transition:width 0.3s;"></div></div>'
        + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-light);">'
        + '<span>'+elapsed+'/'+exp.days+'日経過</span><span>'+progress+'%</span></div>'
        + _buildExperimentCompanion(exp, s.records || []);

      bodyHtml += '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button onclick="if(typeof window.showExperimentReport===\'function\')window.showExperimentReport('+idx+')" style="flex:1;padding:8px;background:rgba(90,144,112,.1);color:#5a9070;border:1px solid rgba(90,144,112,.25);border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;font-weight:500;">📊 詳細レポート</button>';
      if(elapsed >= exp.days){
        bodyHtml += '<button onclick="if(typeof window.completeExperiment===\'function\')window.completeExperiment('+idx+')" style="flex:1;padding:8px;background:var(--sage);color:white;border:none;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">完了にする</button>';
      } else {
        bodyHtml += '<button onclick="if(typeof window.cancelExperiment===\'function\')window.cancelExperiment('+idx+')" style="flex:1;padding:8px;background:transparent;color:var(--ink-light);border:1px solid #e8ddd8;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">中止する</button>';
      }
      bodyHtml += '</div></div>';
    });
  }

  // 完了した実験
  var completed = experiments.filter(function(e){ return e.status === 'completed'; });
  if(completed.length > 0){
    bodyHtml += '<div class="pha-section-title" style="margin-top:8px;">完了済み</div>';
    completed.forEach(function(exp){
      bodyHtml += '<div class="pha-card">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);">✅ '+exp.title+'</div>'
        + '<div style="font-size:12px;color:var(--ink-light);">'+exp.days+'日間</div>'
        + '</div>';
      if(exp.result){
        bodyHtml += '<div style="font-size:12px;color:var(--ink-mid);line-height:1.7;">'+exp.result+'</div>';
      }
      bodyHtml += '</div>';
    });
  }

  // 新しい実験を始める
  bodyHtml += '<div class="pha-section-title" style="margin-top:8px;">新しい実験を始める</div>';

  EXPERIMENT_PRESETS.forEach(function(preset, idx){
    var alreadyActive = active.some(function(e){ return e.title === preset.title; });
    bodyHtml += '<div class="pha-card" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;'+(alreadyActive?'opacity:0.5;':'')+'">'
      + '<div style="flex:1;">'
      + '<div style="font-size:14px;font-weight:500;color:var(--ink);">'+preset.title+'</div>'
      + '<div style="font-size:12px;color:var(--ink-light);margin-top:2px;">'+preset.hypothesis+'</div>'
      + '</div>';
    if(!alreadyActive){
      bodyHtml += '<button onclick="if(typeof window.startExperiment===\'function\')window.startExperiment('+idx+')" style="padding:8px 14px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;white-space:nowrap;">開始</button>';
    } else {
      bodyHtml += '<span style="font-size:12px;color:var(--sage);">実施中</span>';
    }
    bodyHtml += '</div>';
  });

  // カスタム実験
  bodyHtml += '<div class="pha-card">'
    + '<div style="font-size:12px;color:var(--ink);margin-bottom:8px;">✏️ オリジナル実験を作成</div>'
    + '<input type="text" id="exp-custom-title" placeholder="実験名（例：乳製品を控える）" style="width:100%;padding:8px 12px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;margin-bottom:6px;background:var(--cream);color:var(--ink);outline:none;box-sizing:border-box;">'
    + '<input type="text" id="exp-custom-hypothesis" placeholder="仮説（例：乳製品を避けるとお腹の張りが減る）" style="width:100%;padding:8px 12px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;margin-bottom:6px;background:var(--cream);color:var(--ink);outline:none;box-sizing:border-box;">'
    + '<div style="display:flex;gap:8px;align-items:center;">'
    + '<select id="exp-custom-days" style="flex:1;padding:8px;border:1px solid #e8ddd8;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;background:var(--cream);color:var(--ink);">'
    + '<option value="7">7日間</option><option value="14">14日間</option><option value="21">21日間</option><option value="30" selected>30日間</option>'
    + '</select>'
    + '<button onclick="if(typeof window.startCustomExperiment===\'function\')window.startCustomExperiment()" style="padding:8px 16px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">作成</button>'
    + '</div></div>';

  _expOverlayApi.body.innerHTML = bodyHtml;
  _expOverlayApi.open();
}

export function startExperiment(presetIdx){
  var preset = EXPERIMENT_PRESETS[presetIdx];
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = (s.experiments || []).slice();
  experiments.push({
    title: preset.title,
    factor: preset.factor,
    condition: preset.condition,
    hypothesis: preset.hypothesis,
    days: preset.days,
    startDate: new Date().toISOString(),
    status: 'active'
  });
  if (window.setState) {
    window.setState(Object.assign({}, s, { experiments: experiments }));
  } else {
    s.experiments = experiments;
  }
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function(){});
  if (_expOverlayApi) _expOverlayApi.close();
  openExperiments();
}

export function startCustomExperiment(){
  var title = (document.getElementById('exp-custom-title')||{}).value||'';
  var hypothesis = (document.getElementById('exp-custom-hypothesis')||{}).value||'';
  var days = parseInt((document.getElementById('exp-custom-days')||{}).value) || 30;
  if(!title.trim()){
    showAlertModal('実験名を入力してください');
    return;
  }
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = (s.experiments || []).slice();
  experiments.push({
    title: title.trim(),
    factor: '',
    condition: 'custom',
    hypothesis: hypothesis.trim() || '（仮説未設定）',
    days: days,
    startDate: new Date().toISOString(),
    status: 'active'
  });
  if (window.setState) {
    window.setState(Object.assign({}, s, { experiments: experiments }));
  } else {
    s.experiments = experiments;
  }
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function(){});
  if (_expOverlayApi) _expOverlayApi.close();
  openExperiments();
}

export function cancelExperiment(idx){
  showConfirmModal('この実験を中止しますか？', function() {
    var s = window.getState ? window.getState() : (window.state || {});
    var experiments = (s.experiments || []).slice();
    experiments[idx] = Object.assign({}, experiments[idx], { status: 'cancelled' });
    if (window.setState) {
      window.setState(Object.assign({}, s, { experiments: experiments }));
    } else {
      s.experiments = experiments;
    }
    if (typeof window.saveState === 'function') window.saveState();
    if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function(){});
    if (_expOverlayApi) _expOverlayApi.close();
    openExperiments();
  });
}

export function completeExperiment(idx){
  var s = window.getState ? window.getState() : (window.state || {});
  var experiments = (s.experiments || []).slice();
  var exp = experiments[idx];
  var start = new Date(exp.startDate);
  var end = new Date(start.getTime() + exp.days * 86400000);

  // 実験前の期間（同じ日数だけ遡る）
  var preStart = new Date(start.getTime() - exp.days * 86400000);
  var records = s.records || [];
  var preRecs = records.filter(function(r){
    var d = new Date(r.record_date || r.date);
    return d >= preStart && d < start;
  });
  var duringRecs = records.filter(function(r){
    var d = new Date(r.record_date || r.date);
    return d >= start && d <= end;
  });

  var calcAvg = function(recs, key){
    var vals = recs.map(function(r){ return r[key]; }).filter(function(v){ return v !== undefined && v !== null && v !== 0; });
    if(vals.length === 0) return null;
    return Math.round(vals.reduce(function(a,b){return a+b;},0) / vals.length * 10) / 10;
  };

  var metrics = ['energy','sleepQuality','painLevel','wellnessScore'];
  var metricLabels = {energy:'エネルギー',sleepQuality:'睡眠の質',painLevel:'痛み',wellnessScore:'ウェルネス'};
  var result = '📊 実験結果（'+exp.days+'日間）\n\n';

  metrics.forEach(function(m){
    var pre = calcAvg(preRecs, m);
    var during = calcAvg(duringRecs, m);
    if(pre !== null && during !== null){
      var diff = Math.round((during - pre) * 10) / 10;
      var arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      result += metricLabels[m] + '：' + pre + ' → ' + during + ' (' + arrow + Math.abs(diff) + ')\n';
    }
  });

  // 症状数比較
  var preSymAvg = calcAvg(preRecs.map(function(r){ return {symptomCount: r.symptoms ? r.symptoms.length : 0}; }).map(function(r){ return {painLevel: r.symptomCount}; }), 'painLevel');
  var duringSymAvg = calcAvg(duringRecs.map(function(r){ return {symptomCount: r.symptoms ? r.symptoms.length : 0}; }).map(function(r){ return {painLevel: r.symptomCount}; }), 'painLevel');
  if(preSymAvg !== null && duringSymAvg !== null){
    var symDiff = Math.round((duringSymAvg - preSymAvg) * 10) / 10;
    var symArrow = symDiff > 0 ? '↑' : symDiff < 0 ? '↓' : '→';
    result += '症状数：' + preSymAvg + ' → ' + duringSymAvg + ' (' + symArrow + Math.abs(symDiff) + ')\n';
  }

  if(preRecs.length < 3 || duringRecs.length < 3){
    result += '\n⚠️ データが少ないため参考値です（実験前'+preRecs.length+'日/実験中'+duringRecs.length+'日）';
  }

  experiments[idx] = Object.assign({}, exp, {
    status: 'completed',
    result: result,
    endDate: new Date().toISOString()
  });
  if (window.setState) {
    window.setState(Object.assign({}, s, { experiments: experiments }));
  } else {
    s.experiments = experiments;
  }
  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.cloudBackupAll === 'function') window.cloudBackupAll().catch(function(){});
  var overlayEl = document.getElementById('expOverlay');
  if (overlayEl) overlayEl.remove();
  openExperiments();
}

// ===== P39: AI結果レポート生成 =====
/**
 * 実験前後の比較から自然言語サマリーを生成する。
 * OpenAI禁止。既存 records 集計結果のみ利用。
 * 医療表現・断定禁止。「傾向」「可能性」「見えていること」を使用。
 *
 * @param {boolean} isComplete - 実験完了済みか
 * @param {{pre,dur}} sleep
 * @param {{pre,dur}} mood
 * @param {{pre,dur}} symptoms
 * @param {{pre,dur}} temp
 */
function _buildAIResultReport(isComplete, sleep, mood, symptoms, temp) {
  // ── 変化量計算 ──────────────────────────────────────────
  function delta(o) {
    if (o.pre == null || o.dur == null) return null;
    return Math.round((o.dur - o.pre) * 10) / 10;
  }
  var dSleep = delta(sleep);
  var dMood  = delta(mood);
  var dSym   = delta(symptoms);
  var dTemp  = delta(temp);

  var SLEEP_THR = 0.3, MOOD_THR = 0.3, SYM_THR = 0.3, TEMP_THR = 0.1;

  // ── 今回見えたこと ────────────────────────────────────
  var seen = [];
  if (dSleep != null && Math.abs(dSleep) > SLEEP_THR) {
    var sleepDir = dSleep > 0 ? '改善傾向' : '低下傾向';
    seen.push('睡眠の質に' + sleepDir + 'が見えていること（' + (dSleep > 0 ? '+' : '') + dSleep + '）');
  }
  if (dMood != null && Math.abs(dMood) > MOOD_THR) {
    var moodDir = dMood > 0 ? '上向き傾向' : '波がある可能性';
    seen.push('気分に' + moodDir + 'があります（' + (dMood > 0 ? '+' : '') + dMood + '）');
  }
  if (dSym != null && Math.abs(dSym) > SYM_THR) {
    var symDir = dSym < 0 ? '症状が減る傾向' : '症状が増える傾向';
    seen.push(symDir + 'が見えていること（' + (dSym > 0 ? '+' : '') + dSym + '件/日）');
  }
  if (dTemp != null && Math.abs(dTemp) > TEMP_THR) {
    seen.push('体温に変動の傾向があります（' + (dTemp > 0 ? '+' : '') + dTemp + '℃）');
  }

  // ── 気になったこと（変化が小さかった指標） ─────────────
  var flat = [];
  if (dSleep != null && Math.abs(dSleep) <= SLEEP_THR) flat.push('睡眠の質');
  if (dMood  != null && Math.abs(dMood)  <= MOOD_THR)  flat.push('気分');
  if (dSym   != null && Math.abs(dSym)   <= SYM_THR)   flat.push('症状数');

  // ── 次に試すなら（recommendation-engine 利用） ────────
  var nextItems = [];
  try {
    if (typeof window.getRecommendations === 'function') {
      var recs = window.getRecommendations({ limit: 2, types: ['action', 'recovery'] });
      recs.forEach(function(r) { if (r.text) nextItems.push(r.text); });
    }
  } catch(e) { /* silent */ }
  // フォールバック（エンジン不可時）
  if (!nextItems.length) {
    if (dSleep != null && dSleep < 0) nextItems.push('睡眠時間や就寝リズムに少し注意を向けてみるのも良いかもしれません。');
    else if (dMood != null && dMood < 0) nextItems.push('気分の波があるとき、記録を振り返ると変化のパターンが見えやすくなることがあります。');
    else nextItems.push('今の取り組みを続けながら、からだの変化を観察してみましょう。');
  }

  // 変化ゼロなら何も表示しない
  if (!seen.length && !flat.length) return '';

  var titleLabel = isComplete ? '実験のまとめ' : 'これまでに見えていること';

  var html = '<div style="margin-top:16px;padding:12px 14px;background:rgba(90,112,160,.05);border-radius:12px;border:1px solid rgba(90,112,160,.14);">'
    + '<div style="font-size:11px;font-weight:600;color:#5060a0;margin-bottom:10px;letter-spacing:.04em;">✦ ' + titleLabel + '</div>';

  if (seen.length) {
    html += '<div style="font-size:10px;font-weight:600;color:var(--ink-light);margin-bottom:4px;">今回見えていること</div>'
      + '<ul style="margin:0 0 10px 0;padding-left:16px;">'
      + seen.map(function(s){ return '<li style="font-size:11px;color:var(--ink-mid);line-height:1.7;">' + s + '</li>'; }).join('')
      + '</ul>';
  }

  if (flat.length) {
    html += '<div style="font-size:10px;font-weight:600;color:var(--ink-light);margin-bottom:4px;">気になったこと</div>'
      + '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;margin-bottom:10px;">'
      + flat.join('・') + 'は大きな変化が見えていません。記録を続けると、もう少しパターンが見えてくる可能性があります。'
      + '</div>';
  }

  if (nextItems.length) {
    html += '<div style="font-size:10px;font-weight:600;color:var(--ink-light);margin-bottom:4px;">次に試すなら</div>'
      + '<ul style="margin:0;padding-left:16px;">'
      + nextItems.map(function(s){ return '<li style="font-size:11px;color:var(--ink-mid);line-height:1.7;">' + s + '</li>'; }).join('')
      + '</ul>';
  }

  html += '<div style="font-size:9px;color:var(--ink-light);margin-top:8px;opacity:.7;">※ これは記録をもとにした傾向の提示です。診断・治療の提案ではありません。</div>'
    + '</div>';

  return html;
}

// ===== 実験レポート =====
var _expReportOverlayApi = null;
export function showExperimentReport(idx) {
  var s = window.getState ? window.getState() : (window.state || {});
  var exp = (s.experiments || [])[idx];
  if (!exp) return;

  function _esc(v) { return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var records = s.records || [];
  var start   = new Date(exp.startDate);
  var end     = new Date(start.getTime() + exp.days * 86400000);
  var preStart = new Date(start.getTime() - exp.days * 86400000);

  var preRecs    = records.filter(function(r) { var d = new Date(r.record_date || r.date || ''); return !isNaN(d) && d >= preStart && d < start; });
  var duringRecs = records.filter(function(r) { var d = new Date(r.record_date || r.date || ''); return !isNaN(d) && d >= start && d <= end; });

  // ── ヘルパー ──────────────────────────────────────────
  function avg(recs, key) {
    var vals = recs.map(function(r) { return parseFloat(r[key]); }).filter(function(v) { return !isNaN(v) && v > 0; });
    if (!vals.length) return null;
    return Math.round(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length * 10) / 10;
  }
  function avgSymCount(recs) {
    if (!recs.length) return null;
    var total = recs.reduce(function(a, r) { return a + (r.symptoms || []).length + (r.symptomDetails || []).length; }, 0);
    return Math.round(total / recs.length * 10) / 10;
  }
  function avgTemp(recs) {
    var vals = recs.map(function(r) { return parseFloat(r.basalTemp || r.temperature); }).filter(function(v) { return !isNaN(v) && v > 30; });
    if (!vals.length) return null;
    return Math.round(vals.reduce(function(a, b) { return a + b; }, 0) / vals.length * 100) / 100;
  }
  function fmtDate(d) { return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate(); }

  // ── スパークライン SVG ──────────────────────────────────
  function sparkline(vals, color, invertY) {
    if (!vals || vals.length < 2) return '<span style="color:var(--ink-light);font-size:10px;">—</span>';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var range = mx - mn || 1;
    var W = 60, H = 24, pad = 2;
    var pts = vals.map(function(v, i) {
      var x = pad + i / (vals.length - 1) * (W - pad * 2);
      var norm = (v - mn) / range;
      var y = invertY ? pad + norm * (H - pad * 2) : (H - pad) - norm * (H - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    return '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="vertical-align:middle;">'
      + '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
      + '</svg>';
  }
  function getVals(recs, key) {
    return recs.slice().sort(function(a, b) { return new Date(a.record_date || a.date) - new Date(b.record_date || b.date); })
      .map(function(r) { return parseFloat(r[key]); }).filter(function(v) { return !isNaN(v) && v > 0; });
  }
  function getSymVals(recs) {
    return recs.slice().sort(function(a, b) { return new Date(a.record_date || a.date) - new Date(b.record_date || b.date); })
      .map(function(r) { return (r.symptoms || []).length + (r.symptomDetails || []).length; });
  }
  function getTempVals(recs) {
    return recs.slice().sort(function(a, b) { return new Date(a.record_date || a.date) - new Date(b.record_date || b.date); })
      .map(function(r) { return parseFloat(r.basalTemp || r.temperature); }).filter(function(v) { return !isNaN(v) && v > 30; });
  }

  // ── 比較行レンダリング ──────────────────────────────────
  function diffArrow(pre, dur, invertGood) {
    if (pre === null || dur === null) return '';
    var diff = Math.round((dur - pre) * 10) / 10;
    if (diff === 0) return '<span style="color:#8a8080;">→ 変化なし</span>';
    var up = diff > 0;
    var good = invertGood ? !up : up;
    var color = good ? '#5a9070' : '#c07070';
    var arrow = up ? '↑' : '↓';
    return '<span style="color:' + color + ';font-weight:600;">' + arrow + ' ' + (diff > 0 ? '+' : '') + diff + '</span>';
  }
  function metricRow(label, preVal, durVal, preSpark, durSpark, invertGood, unit) {
    unit = unit || '';
    var noData = preVal === null && durVal === null;
    if (noData) return '';
    var preStr = preVal !== null ? preVal + unit : '—';
    var durStr = durVal !== null ? durVal + unit : '—';
    var arrow  = diffArrow(preVal, durVal, invertGood);
    return '<div style="margin-bottom:16px;">'
      + '<div style="font-size:11px;font-weight:600;color:var(--ink);margin-bottom:6px;">' + label + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '<div style="background:var(--cream);border-radius:8px;padding:8px 10px;">'
      + '<div style="font-size:9px;color:var(--ink-light);margin-bottom:4px;">開始前</div>'
      + (preSpark || '') + '<div style="font-size:13px;font-weight:500;color:var(--ink-mid);margin-top:2px;">' + preStr + '</div>'
      + '</div>'
      + '<div style="background:rgba(90,144,112,.08);border-radius:8px;padding:8px 10px;border:1px solid rgba(90,144,112,.18);">'
      + '<div style="font-size:9px;color:var(--sage);margin-bottom:4px;">実験中</div>'
      + (durSpark || '') + '<div style="font-size:13px;font-weight:500;color:var(--ink);margin-top:2px;">' + durStr + '</div>'
      + '</div>'
      + '</div>'
      + (arrow ? '<div style="font-size:12px;margin-top:6px;padding-left:2px;">' + arrow + '</div>' : '')
      + '</div>';
  }

  // ── データ集計 ─────────────────────────────────────────
  var sleep    = { pre: avg(preRecs, 'sleepQuality') ?? avg(preRecs, 'sleepHours'),   dur: avg(duringRecs, 'sleepQuality') ?? avg(duringRecs, 'sleepHours') };
  var mood     = { pre: avg(preRecs, 'mood'),           dur: avg(duringRecs, 'mood') };
  var symptoms = { pre: avgSymCount(preRecs),            dur: avgSymCount(duringRecs) };
  var temp     = { pre: avgTemp(preRecs),                dur: avgTemp(duringRecs) };

  var sleepField = avg(preRecs, 'sleepQuality') !== null ? 'sleepQuality' : 'sleepHours';

  var elapsed  = Math.floor((new Date() - start) / 86400000);
  var hasData  = preRecs.length > 0 || duringRecs.length > 0;

  // ── HTML構築 ──────────────────────────────────────────
  if (!_expReportOverlayApi) {
    _expReportOverlayApi = window.createProOverlay({
      id:        'expReportOverlay',
      ariaLabel: '実験レポート',
      title:     '実験レポート',
      subtitle:  '',
      footer:    [{ id: 'exp-report-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _expReportOverlayApi.close(); },
    });
    _expReportOverlayApi.getButton('exp-report-close').addEventListener('click', function(){ _expReportOverlayApi.close(); });
  }
  _expReportOverlayApi.overlay.querySelector('.pob-subtitle').textContent = _esc(exp.title);

  var bodyHtml = '';

  // 実験概要
  bodyHtml += '<div style="background:rgba(90,144,112,.06);border-radius:12px;padding:12px 14px;margin-bottom:16px;border:1px solid rgba(90,144,112,.14);">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">'
    + '<div><div style="font-size:9px;color:var(--ink-light);margin-bottom:2px;">開始日</div><div style="font-size:12px;font-weight:500;color:var(--ink);">' + fmtDate(start) + '</div></div>'
    + '<div><div style="font-size:9px;color:var(--ink-light);margin-bottom:2px;">経過日数</div><div style="font-size:12px;font-weight:500;color:var(--ink);">' + elapsed + '日</div></div>'
    + '<div><div style="font-size:9px;color:var(--ink-light);margin-bottom:2px;">期間</div><div style="font-size:12px;font-weight:500;color:var(--ink);">' + exp.days + '日間</div></div>'
    + '</div>'
    + '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(90,144,112,.12);font-size:11px;color:var(--ink-mid);">💡 ' + _esc(exp.hypothesis) + '</div>'
    + '</div>';

  if (!hasData) {
    bodyHtml += '<div style="text-align:center;padding:24px;color:var(--ink-light);font-size:13px;">まだ記録がありません。<br>記録を続けると比較データが表示されます。</div>';
  } else {
    bodyHtml += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:12px;">比較期間：開始前 ' + preRecs.length + '件 ／ 実験中 ' + duringRecs.length + '件の記録</div>';

    // 各指標
    bodyHtml += metricRow('睡眠の質 / 睡眠時間', sleep.pre, sleep.dur,
      sparkline(getVals(preRecs, sleepField), '#aac0b5', false),
      sparkline(getVals(duringRecs, sleepField), '#5a9070', false),
      false);

    bodyHtml += metricRow('気分', mood.pre, mood.dur,
      sparkline(getVals(preRecs, 'mood'), '#c0aab5', false),
      sparkline(getVals(duringRecs, 'mood'), '#9070a0', false),
      false);

    bodyHtml += metricRow('症状の多さ（件/日）', symptoms.pre, symptoms.dur,
      sparkline(getSymVals(preRecs), '#c0b5aa', true),
      sparkline(getSymVals(duringRecs), '#c07070', true),
      true);  // 症状は減少が良い

    bodyHtml += metricRow('基礎体温', temp.pre, temp.dur,
      sparkline(getTempVals(preRecs), '#aab5c0', false),
      sparkline(getTempVals(duringRecs), '#7090c0', false),
      false, '℃');

    if (preRecs.length < 3 || duringRecs.length < 3) {
      bodyHtml += '<div style="padding:10px 12px;background:rgba(180,140,60,.08);border-radius:8px;border:1px solid rgba(180,140,60,.2);font-size:11px;color:#806030;margin-top:4px;">'
        + '⚠️ データが少ないため参考値です（実験前 ' + preRecs.length + '件 / 実験中 ' + duringRecs.length + '件）</div>';
    }

    // ── P39: AI結果レポート ──────────────────────────────────
    bodyHtml += _buildAIResultReport(elapsed >= exp.days, sleep, mood, symptoms, temp);
  }

  if (_expOverlayApi) _expOverlayApi.close();
  _expReportOverlayApi.body.innerHTML = bodyHtml;
  _expReportOverlayApi.open();
}

window.openExperiments = openExperiments;
window.startExperiment = startExperiment;
window.startCustomExperiment = startCustomExperiment;
window.cancelExperiment = cancelExperiment;
window.completeExperiment = completeExperiment;
window.showExperimentReport = showExperimentReport;
window._buildExperimentCompanion = _buildExperimentCompanion;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('experiments-module-loaded');
}

export {};
