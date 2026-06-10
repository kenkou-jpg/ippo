// ============================================================
//  ippo – src/app-legacy.js
//  Priority 8 (Step 8-2e): app.html 残存 inline script を移植
//
//  移植元: app.html script block 2 (line 1595–13041)
//  設計: ES module として import。state はグローバル getter 経由。
// ============================================================

// ─── bare `state` lexical variable ───────────────────────────────
// ES module strict mode では bare `state` は window.getState() に自動解決されない。
// state.js の setState() が呼ばれるたびフックが最新 _state に同期する。
// records: [] を初期値として持つことで hydration 前の state.records 参照を安全にする。
if (!window._ippoStateHooks) window._ippoStateHooks = [];
var state = { records: [] };
window.state = state;
window._ippoStateHooks.push(function(nextState) {
  state = nextState;
  try { window.state = nextState; } catch (_) {}
});

// ─── app.html script block 2 の内容 ─────────────────────────
// ===== SUPABASE CLOUD SYNC (auth + user_data) =====
// var SUPABASE_URL = 'https://ekaoojdqhkpeudujfsdh.supabase.co';  // MIGRATED: see src/services/supabase.js
// var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYW9vamRxaGtwZXVkdWpmc2RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MTg3MTUsImV4cCI6MjA5MjA5NDcxNX0.QPoyDxCrnhNInpfGJ5qOVQqn6OQ7clAoOmGgvqQTGX0';  // MIGRATED: see src/services/supabase.js
// ★ Supabase runtime bridge: bare identifier が module 化後も必ず存在するよう宣言
// (SDK 管理の実値は checkPremiumStatus / auth callback で同期される)
var supabaseToken = null;
var supabaseUserId = null;

// ─── Deferred Cloud Restore Queue ────────────────────────────────
// auth 復元前に cloudRestore が呼ばれた場合、auth ready 後にリトライする
var _cloudRestoreQueue = [];
function _flushCloudRestoreQueue() {
  while (_cloudRestoreQueue.length > 0) {
    try { _cloudRestoreQueue.shift()(); } catch (e) { console.warn('[cloudQueue] flush error', e); }
  }
}
// auth ready を brain / controller に通知するユーティリティ
function _notifyAuthReady() {
  if (window.ippoBrain && typeof window.ippoBrain.setAuthState === 'function') {
    window.ippoBrain.setAuthState('authReady', true);
    window.ippoBrain.setAuthState('supabaseReady', true);
  }
  // Phase 2: auth-service ownership へ通知
  if (window.ippoAuthService && typeof window.ippoAuthService.markAuthReady === 'function') {
    window.ippoAuthService.markAuthReady(supabaseUserId, supabaseToken);
  }
  _flushCloudRestoreQueue();
}

// ===== 食事クイック入力 =====
var _mealPendingType = '';
var _mealPendingBtn = null;

  function openMealTimePicker(){
  var picker = document.getElementById('meal-time-picker');
  var input = document.getElementById('meal-time-input');
  var now = new Date();
  var hh = String(now.getHours()).padStart(2,'0');
  var mm = String(now.getMinutes()).padStart(2,'0');
  if(input) input.value = hh + ':' + mm;
  if(picker) picker.style.display = 'block';
}

function addMealTime(){
  var ta = document.getElementById('rs-meal-free');
  var input = document.getElementById('meal-time-input');
  if(!ta || !input) return;
  var time = input.value.replace(':','');
  var current = ta.value.trim();
  ta.value = current ? current + '\n' + time + ' ' : time + ' ';
  var lines = ta.value.trim().split('\n').filter(function(l){ return l.trim(); });
  lines.sort();
  ta.value = lines.join('\n');
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  closeMealTimePicker();
  if(typeof updateMealParse === 'function') updateMealParse();
}

function toggleMealEntry(type, btn){
  var ta = document.getElementById('rs-meal-free');
  if(!ta) return;
  var picker = document.getElementById('meal-time-picker');
  
  // 時間ピッカーが開いていて同じタイプなら閉じるだけ
  if(picker && picker.style.display !== 'none' && _mealPendingType === type){
    closeMealTimePicker();
    return;
  }
  
  var lines = ta.value.trim().split('\n').filter(function(l){ return l.trim(); });
  var exists = lines.some(function(l){ return l.indexOf(type) !== -1; });
  
  if(exists){
    var newLines = lines.filter(function(l){ return l.indexOf(type) === -1; });
    ta.value = newLines.join('\n');
    btn.style.background = 'var(--white)';
    btn.style.color = 'var(--ink)';
    btn.style.borderColor = '#e8ddd8';
    closeMealTimePicker();
  } else {
    _mealPendingType = type;
    _mealPendingBtn = btn;
    var label = document.getElementById('meal-time-label');
    var input = document.getElementById('meal-time-input');
    if(label) label.textContent = type + 'の時間';
    var now = new Date();
    var hh = String(now.getHours()).padStart(2,'0');
    var mm = String(now.getMinutes()).padStart(2,'0');
    if(input) input.value = hh + ':' + mm;
    if(picker) picker.style.display = 'block';
  }
  if(typeof parseMealFree === 'function') parseMealFree();
}
  
function confirmMealTime(){
  var ta = document.getElementById('rs-meal-free');
  var input = document.getElementById('meal-time-input');
  if(!ta || !input || !_mealPendingType) return;
  var time = input.value.replace(':','');
  var line = time + ' ' + _mealPendingType;
  var current = ta.value.trim();
  ta.value = current ? current + '\n' + line : line;
  // 時間順にソート
  var lines = ta.value.trim().split('\n').filter(function(l){ return l.trim(); });
  lines.sort();
  ta.value = lines.join('\n');
  if(_mealPendingBtn){
    _mealPendingBtn.style.background = 'var(--rose)';
    _mealPendingBtn.style.color = 'white';
    _mealPendingBtn.style.borderColor = 'var(--rose)';
  }
  closeMealTimePicker();
  if(typeof parseMealFree === 'function') parseMealFree();
}

function closeMealTimePicker(){
  var picker = document.getElementById('meal-time-picker');
  if(picker) picker.style.display = 'none';
  _mealPendingType = '';
  _mealPendingBtn = null;
}

document.addEventListener('change', function(e){
  if(e.target && e.target.id === 'meal-time-input'){
    confirmMealTime();
  }
});


  // ===== わたしの目標 =====
var VISION_PRESETS = [
  'ファスティングを習慣にしたい',
  '自分の体のリズムを知りたい',
  'PMS/PMDDを軽くしたい',
  '体調を整えたい'
];

function toggleVisionEdit(){
  var edit = document.getElementById('vision-edit');
  if(!edit) return;
  edit.style.display = edit.style.display === 'none' ? 'block' : 'none';
}

function initVisionUI(){
  var container = document.getElementById('vision-presets');
  if(!container) return;
  container.innerHTML = '';
  VISION_PRESETS.forEach(function(text){
    var btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = 'padding:6px 12px;border:1px solid #e8e0d8;border-radius:16px;background:var(--white);font-size:11px;font-family:Noto Sans JP,sans-serif;color:var(--ink);cursor:pointer;';
    if(state.myVision === text){
      btn.style.background = 'var(--rose)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--rose)';
    }
    btn.onclick = function(){
      document.getElementById('vision-input').value = text;
      container.querySelectorAll('button').forEach(function(b){ b.style.background='var(--white)'; b.style.color='var(--ink)'; b.style.borderColor='#e8e0d8'; });
      btn.style.background = 'var(--rose)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--rose)';
    };
    container.appendChild(btn);
  });
  var input = document.getElementById('vision-input');
  if(input && state.myVision) input.value = state.myVision;
  updateVisionDisplay();
}

function saveVision(){
  var input = document.getElementById('vision-input');
  if(!input) return;
  state.myVision = input.value.trim();
  saveState();
  updateVisionDisplay();
  updateHomeVision();
  document.getElementById('vision-edit').style.display = 'none';
}

function updateVisionDisplay(){
  var el = document.getElementById('vision-display-text');
  if(!el) return;
  el.textContent = state.myVision || 'タップして設定';
}


function updateHomeVision(){
  // ホーム画面への表示なし
}

  

function icon(name, size, color) {
  if (!ICONS[name]) return '';
  return ICONS[name](size, color);
}

// ===== ナビアイコン注入 =====
function initNavIcons() {
  if (typeof ICONS === 'undefined') return;
  var navIcons = {
    'nav-icon-home':         ICONS.home(20, 'currentColor'),
    'nav-icon-insights':     ICONS.insights(20, 'currentColor'),
    'nav-icon-settings':     ICONS.settings(20, 'currentColor'),
    'nav-icon-plus':         ICONS.plus(22, 'white'),
    'home-settings-icon':    ICONS.settings(18, 'rgba(255,255,255,0.9)')
  };
  Object.keys(navIcons).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = navIcons[id];
  });
}

// ===== 設定画面アイコン注入 =====
function initSettingsIcons() {
  if (typeof ICONS === 'undefined') return;
  var map = {
    'settings-icon-profile':   ICONS.user(16, 'var(--rose)'),
    'settings-icon-theme':     ICONS.star(16, 'var(--rose)'),
    'settings-icon-reminder':  ICONS.bell(16, 'var(--rose)'),
    'settings-icon-disease':   ICONS.heart(16, 'var(--rose)'),
    'settings-icon-symptom':   ICONS.activity(16, 'var(--rose)'),
    'settings-icon-privacy':   ICONS.shield(16, 'var(--rose)'),
    'settings-icon-export':    ICONS.barChart(16, '#4a7c5c'),
    'settings-icon-backup':    ICONS.download(16, '#4a7c5c'),
    'settings-icon-restore':   ICONS.cloud(16, '#4a7c5c'),
    'settings-icon-history':   ICONS.download(16, '#4a7c5c'),
    'settings-icon-diagnosis': ICONS.search(16, 'var(--ink-light)'),
    'settings-icon-delete':    ICONS.trash(16, 'var(--rose)'),
    'settings-icon-priority':  ICONS.star(16, '#c8a060'),
    'settings-icon-density':   ICONS.settings(16, 'var(--ink-light)'),
    'settings-icon-home-info': ICONS.home(16, '#4a7c5c')
  };
  Object.keys(map).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = map[id];
  });
}

// ===== 痛みスケールボタン =====
function renderPainScale(currentValue, fieldName) {
  var faces = [
    { icon: 'faceVeryGood', label: '痛みなし', v: 0 },
    { icon: 'faceGood',     label: '軽い',     v: 1 },
    { icon: 'faceNeutral',  label: '中程度',   v: 2 },
    { icon: 'faceBad',      label: '強い',     v: 3 },
    { icon: 'faceVeryBad',  label: 'とても強い', v: 4 }
  ];
  var html = '<div style="display:flex;gap:6px;">';
  faces.forEach(function(f) {
    var isSelected = currentValue === f.v;
    var strokeColor = isSelected ? 'var(--rose)' : '#9a8e88';
    html += '<button onclick="selectBodyCheckItem(\'' + fieldName + '\',' + f.v + ',this)" '
      + 'style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;'
      + 'padding:8px 4px;border-radius:10px;border:1.5px solid '
      + (isSelected ? 'var(--rose)' : '#e8ddd8') + ';'
      + 'background:' + (isSelected ? 'var(--rose-pale)' : 'var(--white)') + ';'
      + 'cursor:pointer;transition:all 0.15s;">'
      + ICONS[f.icon](22, strokeColor)
      + '<span style="font-size:8px;color:' + (isSelected ? 'var(--rose)' : 'var(--ink-light)') + ';">'
      + f.label + '</span>'
      + '</button>';
  });
  html += '</div>';
  return html;
}


// ===== 症状詳細マスターデータ =====
var SYMPTOM_DETAIL_CONFIG = {
  '下腹部痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体', '腰', '骨盤周り'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感', '張り'],
    hasSlider: true
  },
  '骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り', '重い'],
    hasSlider: true
  },
  '月経外の骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り'],
    hasSlider: true
  },
  '排卵痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体'],
    types:     ['鋭痛', '鈍痛', '差し込み', '張り'],
    hasSlider: true
  },
  '片側の下腹部痛': {
    positions: ['左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '腰痛': {
    positions: ['腰全体', '左側', '右側', '仙骨'],
    types:     ['鈍痛', '鋭痛', '張り', '重い'],
    hasSlider: true
  },
  '性交痛': {
    positions: ['入口付近', '奥（深部）', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '灼熱感'],
    hasSlider: true
  },
  '排便痛': {
    positions: ['肛門周り', '腸全体', '左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '頭痛': {
    positions: ['前頭部', '側頭部（左）', '側頭部（右）', '後頭部', '全体'],
    types:     ['ズキズキ', '締め付け', '重い', '刺すような'],
    hasSlider: true
  },
  '慢性疲労': { hasSlider: true, sliderLabel: '疲れの強さ' },
  'だるさ':   { hasSlider: true, sliderLabel: '重さの程度' },
  '倦怠感':   { hasSlider: true, sliderLabel: '倦怠の程度' },
  'むくみ': {
    positions: ['顔', '手', '足（全体）', '足首', 'ふくらはぎ'],
    hasSlider: true,
    sliderLabel: 'むくみの程度'
  },
  '気分の落ち込み': {
    types:     ['ゆううつ', '虚無感', '涙が出る', '何もしたくない'],
    hasSlider: true,
    sliderLabel: '気分の重さ'
  },
  'イライラ': {
    types:     ['軽いイライラ', 'かなり強い', '怒りが抑えられない'],
    hasSlider: true,
    sliderLabel: 'イライラの強さ'
  },
  '不安感': {
    types:     ['漠然とした不安', '動悸を伴う', '眠れない'],
    hasSlider: true,
    sliderLabel: '不安の強さ'
  },
  '吐き気': {
    types:     ['軽い吐き気', '食欲がない', '嘔吐あり'],
    timing:    ['空腹時', '食後', '常時', '動いたとき'],
    hasSlider: true,
    sliderLabel: '吐き気の強さ'
  },
  '胸の張り': {
    positions: ['両側', '左側', '右側'],
    hasSlider: true,
    sliderLabel: '張りの強さ'
  },
  '不正出血': {
    types:     ['茶色のおりもの', '鮮血', '少量', '中等量'],
    timing:    ['排卵期', '生理前', '生理後', '性交後', '不定期'],
    hasSlider: false
  },
  '頻尿': {
    types:     ['少し多い', 'かなり多い', '夜間も起きる'],
    hasSlider: false
  },
  '便秘': {
    types:     ['数日出ない', '硬くて出にくい', '残便感'],
    hasSlider: false,
    bowelCount: true
  },
  '腹部膨満感': {
    types:     ['食後に張る', '一日中張っている', 'ガスが多い'],
    hasSlider: true,
    sliderLabel: '張りの程度'
  },
  'おりもの': {
    types:     ['透明・サラサラ', '白・とろみあり', '黄色みがかった', '茶色', 'ピンク・血混じり'],
    positions: ['量：少ない', '量：普通', '量：多い'],
    timing:    ['においの変化あり', 'かゆみあり', '膣の乾燥あり'],
    hasSlider: false,
    note: '膣の乾燥・においの変化は婦人科受診の参考になります'
  }
};

function openDiseaseSettings(){
  var currentArr = state.myDiseases || (state.myDisease ? [state.myDisease] : []);
  var diseases = Object.keys(DISEASE_CONFIG);
  var categories = {};
  diseases.forEach(function(d){
    var cat = DISEASE_CONFIG[d].category || '一般';
    if(!categories[cat]) categories[cat] = [];
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
  for(var c=0;c<catKeys.length;c++){
    html += '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin:12px 0 8px;text-transform:uppercase;">'+catKeys[c]+'</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">';
    var catDiseases = categories[catKeys[c]];
    for(var i=0;i<catDiseases.length;i++){
      var d = catDiseases[i];
      var sel = currentArr.indexOf(d) !== -1;
      html += '<button onclick="toggleDiseaseChip(this,\''+d+'\')" data-disease="'+d+'" data-selected="'+(sel?'true':'false')+'" style="padding:8px 14px;border-radius:20px;background:'+(sel?'var(--rose-pale)':'var(--white)')+';border:1.5px solid '+(sel?'var(--rose)':'#e8ddd8')+';font-size:12px;color:'+(sel?'var(--rose)':'var(--ink-mid)')+';cursor:pointer;transition:all 0.2s;box-shadow:0 1px 4px var(--shadow);">'+DISEASE_CONFIG[d].icon+' '+d+'</button>';
    }
    html += '</div>';
  }

  html += '<div style="margin-top:16px;display:flex;gap:8px;">';
  html += '<button onclick="clearAllDiseases()" style="flex:1;padding:14px;background:var(--white);color:var(--ink-mid);border:1px solid #e8ddd8;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:13px;cursor:pointer;">クリア</button>';
  html += '<button onclick="saveDiseaseSettings()" style="flex:2;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">保存する</button>';
  html += '</div>';
  html += '</div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}
// ===== 周期フェーズ連動分析 =====
function calcCycleDay(recordDate, records){
  // 直近の生理開始日を探す
  var sorted = records.slice().sort(function(a,b){ return new Date(b.record_date || b.date) - new Date(a.record_date || a.date); });
  var target = new Date(recordDate).getTime();
  var lastPeriodStart = null;

  for(var i=0; i<sorted.length; i++){
    var r = sorted[i];
    var rDate = new Date(r.record_date || r.date).getTime();
    if(rDate > target) continue;
    // 生理中の最初の日を探す
    if(r.menstrualCycle && r.menstrualCycle !== 'なし'){
      // この日の前日が生理でなければ、この日が開始日
      var prevDay = null;
      for(var j=0; j<sorted.length; j++){
        var diff = rDate - new Date(sorted[j].record_date || sorted[j].date).getTime();
        if(diff === -86400000){ prevDay = sorted[j]; break; }
      }
      if(!prevDay || !prevDay.menstrualCycle || prevDay.menstrualCycle === 'なし'){
        lastPeriodStart = rDate;
        break;
      }
      // 前日も生理なら、さらに遡る
      continue;
    }
  }

  if(!lastPeriodStart) return null;
  var dayDiff = Math.round((target - lastPeriodStart) / 86400000) + 1;
  return dayDiff > 0 ? dayDiff : null;
}

function getCyclePhase(cycleDay){
  if(!cycleDay) return null;
  if(cycleDay <= 5) return '月経期';
  if(cycleDay <= 13) return '卵胞期';
  if(cycleDay <= 16) return '排卵期';
  if(cycleDay <= 28) return '黄体期';
  return '黄体期後期';
}

function analyzeCyclePhases(records){
  var phases = {
    '月経期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '卵胞期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '排卵期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} },
    '黄体期': { days:0, pain:[], energy:[], sleep:[], wellness:[], symptoms:{}, factors:{} }
  };

  records.forEach(function(r){
    var cd = calcCycleDay(r.record_date || r.date, records);
    var phase = getCyclePhase(cd);
    if(!phase || !phases[phase]) return;

    var p = phases[phase];
    p.days++;
    if(r.painLevel) p.pain.push(r.painLevel);
    if(r.energy) p.energy.push(r.energy);
    if(r.sleepQuality) p.sleep.push(r.sleepQuality);
    if(r.wellnessScore !== undefined) p.wellness.push(r.wellnessScore);
    if(r.symptoms){
      r.symptoms.forEach(function(s){ p.symptoms[s] = (p.symptoms[s]||0) + 1; });
    }
    if(r.factors){
      r.factors.forEach(function(f){ p.factors[f] = (p.factors[f]||0) + 1; });
    }
  });

  // 平均計算
  var result = {};
  Object.keys(phases).forEach(function(name){
    var p = phases[name];
    if(p.days === 0) return;
    var avg = function(arr){ return arr.length ? (arr.reduce(function(a,b){return a+b;},0)/arr.length) : null; };
    var topItems = function(obj, n){
      return Object.entries(obj).sort(function(a,b){return b[1]-a[1];}).slice(0,n);
    };
    result[name] = {
      days: p.days,
      avgPain: avg(p.pain) !== null ? avg(p.pain).toFixed(1) : '-',
      avgEnergy: avg(p.energy) !== null ? avg(p.energy).toFixed(1) : '-',
      avgSleep: avg(p.sleep) !== null ? avg(p.sleep).toFixed(1) : '-',
      avgWellness: avg(p.wellness) !== null ? Math.round(avg(p.wellness)) : '-',
      topSymptoms: topItems(p.symptoms, 3),
      topFactors: topItems(p.factors, 3)
    };
  });

  return result;
}

// ─── PRO分析画面 共有SVG (P29-B1: PRO HUBと同一アセット流用) ──────────
var _SVG_UNDERSTAND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="21"/><line x1="3" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="21" y2="12"/></svg>';
var _SVG_REFLECT    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21c-4.5-3-9-6.5-9-11a9 9 0 0 1 18 0c0 4.5-4.5 8-9 11z"/><circle cx="12" cy="10" r="2.5" fill="currentColor" opacity="0.2" stroke="none"/></svg>';
var _SVG_TRY        = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v7.5l4 8a1 1 0 01-.9 1.5H5.9A1 1 0 015 18.5l4-8V3z"/><line x1="6.5" y1="8" x2="17.5" y2="8"/></svg>';
var _SVG_SHARE      = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/><line x1="8" y1="8" x2="16" y2="8"/></svg>';

var _cycleOverlayApi = null;
function openCyclePhaseReport(){
  var analysis = analyzeCyclePhases(state.records);
  var phaseNames = ['月経期','卵胞期','排卵期','黄体期'];
  var phaseIcons = {'月経期':'🔴','卵胞期':'🌱','排卵期':'🥚','黄体期':'🌙'};
  var phaseColors = {'月経期':'#c4878c','卵胞期':'#6b9e78','排卵期':'#d4a574','黄体期':'#7ba3c4'};

  var totalRecs = state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _sorted = state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _ld = new Date(_sorted[0].record_date || _sorted[0].date || '');
    if(!isNaN(_ld.getTime())) lastDate = (_ld.getMonth()+1)+'月'+_ld.getDate()+'日';
  }

  if (!_cycleOverlayApi) {
    _cycleOverlayApi = window.createProOverlay({
      id:        'cyclePhaseOverlay',
      ariaLabel: '周期ごとの体調の違い',
      title:     '周期ごとの体調の違い',
      subtitle:  '周期ごとの記録を整理しています',
      footer:    [{ id: 'cycle-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _cycleOverlayApi.close(); },
    });
    _cycleOverlayApi.getButton('cycle-close').addEventListener('click', function(){ _cycleOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(lastDate?' ／ 最終記録 '+lastDate:'')+'</div>';

  if(Object.keys(analysis).length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">🌸 生理周期のデータがまだ不足しています。<br>生理日を記録し続けると、フェーズ別の傾向が見えてきます。</div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div style="display:flex;gap:6px;">';
    phaseNames.forEach(function(name){
      var d = analysis[name];
      var color = phaseColors[name];
      bodyHtml += '<div style="flex:1;background:var(--white);border-radius:12px;padding:10px 6px;text-align:center;box-shadow:0 1px 4px var(--shadow);">'
        + '<div style="font-size:16px;margin-bottom:4px;">'+phaseIcons[name]+'</div>'
        + '<div style="font-size:9px;color:var(--ink-light);margin-bottom:4px;">'+name+'</div>';
      if(d){
        bodyHtml += '<div style="font-size:18px;font-weight:700;color:'+color+';">'+(d.avgWellness!=='-'?d.avgWellness:'-')+'</div>'
          + '<div style="font-size:10px;color:var(--ink-light);">ウェルネス</div>';
      } else {
        bodyHtml += '<div style="font-size:14px;color:var(--ink-light);">—</div>';
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">各フェーズで記録した体調データ（ウェルネス・エネルギー・睡眠の質・痛み）の平均値を比較しています。記録が多いほど、傾向がより正確に見えてきます。</div>'
      + '</div>';

    // ③ 詳しいデータを見る
    bodyHtml += '<div style="margin-bottom:8px;"><div class="pha-section-title">詳しいデータを見る</div>';
    phaseNames.forEach(function(name){
      var d = analysis[name];
      if(!d) return;
      var color = phaseColors[name];

      bodyHtml += '<div class="pha-card" style="border-left:3px solid '+color+';">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
        + '<div style="font-size:15px;font-weight:500;color:var(--ink);">'+phaseIcons[name]+' '+name+'</div>'
        + '<div style="font-size:11px;color:var(--ink-light);background:var(--cream);padding:3px 8px;border-radius:8px;">'+d.days+'日分の記録</div>'
        + '</div>';

      bodyHtml += '<div class="pha-grid-2" style="margin-bottom:10px;">';
      var metrics = [
        {label:'エネルギー', val:d.avgEnergy, max:5, unit:'/5'},
        {label:'睡眠の質', val:d.avgSleep, max:5, unit:'/5'},
        {label:'痛みレベル', val:d.avgPain, max:10, unit:'/10'},
        {label:'ウェルネス', val:d.avgWellness, max:100, unit:'/100'}
      ];
      metrics.forEach(function(m){
        var pct = m.val !== '-' ? Math.round(parseFloat(m.val)/m.max*100) : 0;
        bodyHtml += '<div class="pha-metric">'
          + '<div style="font-size:11px;color:var(--ink-light);margin-bottom:4px;">'+m.label+'</div>'
          + '<div style="font-size:16px;font-weight:600;color:'+color+';">'+m.val+'<span style="font-size:11px;color:var(--ink-light);">'+m.unit+'</span></div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:4px;"></div></div>'
          + '</div>';
      });
      bodyHtml += '</div>';

      if(d.topSymptoms.length > 0){
        bodyHtml += '<div style="margin-bottom:6px;"><span style="font-size:12px;color:var(--ink-light);">この時期に多い症状：</span>';
        d.topSymptoms.forEach(function(s){
          bodyHtml += '<span style="font-size:12px;background:var(--warm-light);color:var(--ink-mid);padding:2px 8px;border-radius:8px;margin-left:4px;">'+s[0]+' ('+s[1]+'日)</span>';
        });
        bodyHtml += '</div>';
      }
      if(d.topFactors.length > 0){
        bodyHtml += '<div><span style="font-size:12px;color:var(--ink-light);">この時期に多い要因：</span>';
        d.topFactors.forEach(function(f){
          bodyHtml += '<span style="font-size:12px;background:#e8f4ec;color:#4a7c5c;padding:2px 8px;border-radius:8px;margin-left:4px;">'+f[0]+' ('+f[1]+'日)</span>';
        });
        bodyHtml += '</div>';
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';
  }

  _cycleOverlayApi.body.innerHTML = bodyHtml;
  _cycleOverlayApi.open();
}
  // ===== ヘルスエクスペリメント =====

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

/** 出血強度文字列 → 数値変換 */
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
  var diseases = state.myDiseases || (state.myDisease ? [state.myDisease] : []);
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
function openExperiments(){
  var experiments = state.experiments || [];

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
        + _buildExperimentCompanion(exp, state.records || []);

      bodyHtml += '<div style="display:flex;gap:8px;margin-top:10px;">'
        + '<button onclick="showExperimentReport('+idx+')" style="flex:1;padding:8px;background:rgba(90,144,112,.1);color:#5a9070;border:1px solid rgba(90,144,112,.25);border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;font-weight:500;">📊 詳細レポート</button>';
      if(elapsed >= exp.days){
        bodyHtml += '<button onclick="completeExperiment('+idx+')" style="flex:1;padding:8px;background:var(--sage);color:white;border:none;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">完了にする</button>';
      } else {
        bodyHtml += '<button onclick="cancelExperiment('+idx+')" style="flex:1;padding:8px;background:transparent;color:var(--ink-light);border:1px solid #e8ddd8;border-radius:10px;font-size:11px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">中止する</button>';
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
      bodyHtml += '<button onclick="startExperiment('+idx+')" style="padding:8px 14px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;white-space:nowrap;">開始</button>';
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
    + '<button onclick="startCustomExperiment()" style="padding:8px 16px;background:var(--rose);color:white;border:none;border-radius:10px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;">作成</button>'
    + '</div></div>';

  _expOverlayApi.body.innerHTML = bodyHtml;
  _expOverlayApi.open();
}

function startExperiment(presetIdx){
  var preset = EXPERIMENT_PRESETS[presetIdx];
  if(!state.experiments) state.experiments = [];
  state.experiments.push({
    title: preset.title,
    factor: preset.factor,
    condition: preset.condition,
    hypothesis: preset.hypothesis,
    days: preset.days,
    startDate: new Date().toISOString(),
    status: 'active'
  });
  saveState();
  if (typeof cloudBackupAll === 'function') { cloudBackupAll().catch(function(){}); }
  if (_expOverlayApi) _expOverlayApi.close();
  openExperiments();
}

function startCustomExperiment(){
  var title = (document.getElementById('exp-custom-title')||{}).value||'';
  var hypothesis = (document.getElementById('exp-custom-hypothesis')||{}).value||'';
  var days = parseInt((document.getElementById('exp-custom-days')||{}).value) || 30;
  if(!title.trim()){
    showAlertModal('実験名を入力してください');
    return;
  }
  if(!state.experiments) state.experiments = [];
  state.experiments.push({
    title: title.trim(),
    factor: '',
    condition: 'custom',
    hypothesis: hypothesis.trim() || '（仮説未設定）',
    days: days,
    startDate: new Date().toISOString(),
    status: 'active'
  });
  saveState();
  if (typeof cloudBackupAll === 'function') { cloudBackupAll().catch(function(){}); }
  if (_expOverlayApi) _expOverlayApi.close();
  openExperiments();
}

function cancelExperiment(idx){
  showConfirmModal('この実験を中止しますか？', function() {
    state.experiments[idx].status = 'cancelled';
    saveState();
    if (typeof cloudBackupAll === 'function') { cloudBackupAll().catch(function(){}); }
    if (_expOverlayApi) _expOverlayApi.close();
    openExperiments();
  });
}

function completeExperiment(idx){
  var exp = state.experiments[idx];
  var start = new Date(exp.startDate);
  var end = new Date(start.getTime() + exp.days * 86400000);

  // 実験前の期間（同じ日数だけ遡る）
  var preStart = new Date(start.getTime() - exp.days * 86400000);
  var preRecs = state.records.filter(function(r){
    var d = new Date(r.record_date || r.date);
    return d >= preStart && d < start;
  });
  var duringRecs = state.records.filter(function(r){
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

  exp.status = 'completed';
  exp.result = result;
  exp.endDate = new Date().toISOString();
  saveState();
  if (typeof cloudBackupAll === 'function') { cloudBackupAll().catch(function(){}); }
  document.getElementById('expOverlay').remove();
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
function showExperimentReport(idx) {
  var exp = state.experiments[idx];
  if (!exp) return;

  function _esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var records = state.records || [];
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

// ===== タイムライン =====
var _tlPage = 1;
var _tlPerPage = 15;

function renderTimeline(){
  _tlPage = 1;
  updateTimelineView();
}

function loadMoreTimeline(){
  _tlPage++;
  updateTimelineView();
}

function updateTimelineView(){
  var list = document.getElementById('tl-list');
  var countEl = document.getElementById('tl-count');
  var moreBtn = document.getElementById('tl-more');
  if(!list) return;

  var search = ((document.getElementById('tl-search')||{}).value||'').trim().toLowerCase();
  var filter = (document.getElementById('tl-filter')||{}).value || 'all';

  // フレアアップ日を事前計算
  var flareDates = {};
  detectFlareups(state.records).forEach(function(f){
    flareDates[new Date(f.date).toDateString()] = f;
  });

  // フィルタリング
  var filtered = state.records.filter(function(r){
    // 検索
    if(search){
      var haystack = (
        (r.symptoms||[]).join(' ') + ' ' +
        (r.factors||[]).join(' ') + ' ' +
        (r.note||'') + ' ' +
        (r.bowel||'') + ' ' +
        (r.menstrualCycle||'') + ' ' +
        (r.medication||[]).join(' ')
      ).toLowerCase();
      if(haystack.indexOf(search) === -1) return false;
    }

    // フィルタ
    var ds = new Date(r.record_date || r.date).toDateString();
    if(filter === 'pain') return r.painLevel && r.painLevel > 0;
    if(filter === 'flare') return !!flareDates[ds];
    if(filter === 'period') return r.menstrualCycle && r.menstrualCycle !== 'なし';
    if(filter === 'high-energy') return r.energy && r.energy >= 4;
    if(filter === 'low-energy') return r.energy && r.energy <= 2;
    return true;
  });

  // 日付降順
  filtered.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });

  if(countEl) countEl.textContent = filtered.length + '件';

  var show = filtered.slice(0, _tlPage * _tlPerPage);
  if(moreBtn) moreBtn.style.display = show.length < filtered.length ? 'block' : 'none';

  if(show.length === 0){
    list.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--ink-light);font-size:12px;">'+(search||filter!=='all'?'条件に一致する記録がありません':'まだ記録がありません')+'</div>';
    return;
  }

  var html = '';
  show.forEach(function(r){
    var d = new Date(r.date);
    var ds = d.toDateString();
    var dateStr = (d.getMonth()+1)+'/'+d.getDate()+'（'+['日','月','火','水','木','金','土'][d.getDay()]+'）';
    var isFlare = !!flareDates[ds];

    html += '<div style="background:var(--white);border-radius:14px;padding:14px;margin-bottom:8px;box-shadow:0 1px 4px var(--shadow);'+(isFlare?'border-left:3px solid var(--rose);':'')+'cursor:pointer;" onclick="editPastRecord(\''+r.date+'\')">';

    // ヘッダー行
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<div style="font-size:13px;font-weight:500;color:var(--ink);">'+dateStr+'</div>';
    html += '<div style="display:flex;gap:4px;">';
    if(r.wellnessScore !== undefined) html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:'+(r.wellnessScore>=70?'#e8f4ec':r.wellnessScore>=40?'var(--warm-light)':'#fde8e8')+';color:'+(r.wellnessScore>=70?'#4a7c5c':r.wellnessScore>=40?'#a07840':'#c4878c')+';">WS:'+r.wellnessScore+'</span>';
    if(r.energy) html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:#e8f4ec;color:#4a7c5c;">⚡'+r.energy+'</span>';
    if(isFlare) html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:#fde8e8;color:var(--rose);">🔥</span>';
    if(r.menstrualCycle && r.menstrualCycle !== 'なし') html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:var(--rose-pale);color:var(--rose);">🌸'+r.menstrualCycle+'</span>';
    html += '</div></div>';

    // コンテンツ行
    var tags = [];
    if(r.symptoms && r.symptoms.length) tags = tags.concat(r.symptoms.slice(0,4));
    if(r.painLevel && r.painLevel > 0) tags.push('痛み'+r.painLevel+'/10');
    if(r.sleepHours) tags.push('😴'+r.sleepHours+'h');
    if(r.bowel) tags.push('🫧'+r.bowel);
    if(r.factors && r.factors.length) tags = tags.concat(r.factors.slice(0,3).map(function(f){return '📋'+f;}));
    if(r.medication && r.medication.length) tags.push('💊'+r.medication.join('・'));

    if(tags.length > 0){
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      tags.forEach(function(t){
        html += '<span style="font-size:9px;background:var(--cream);color:var(--ink-mid);padding:2px 7px;border-radius:6px;">'+t+'</span>';
      });
      html += '</div>';
    }

    if(r.note){
      html += '<div style="font-size:10px;color:var(--ink-light);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 '+r.note.substring(0,50)+'</div>';
    }

    html += '</div>';
  });

  if(_tlPage === 1){
    list.innerHTML = html;
  } else {
    list.innerHTML += html;
  }
}

function toggleDiseaseChip(btn, name){
  var sel = btn.dataset.selected === 'true';
  if(sel){
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

function clearAllDiseases(){
  var overlay = document.getElementById('diseaseOverlay');
  if(!overlay) return;
  overlay.querySelectorAll('[data-disease]').forEach(function(btn){
    btn.dataset.selected = 'false';
    btn.style.background = 'var(--white)';
    btn.style.borderColor = '#e8ddd8';
    btn.style.color = 'var(--ink-mid)';
  });
}

function saveDiseaseSettings(){
  var overlay = document.getElementById('diseaseOverlay');
  if(!overlay) return;
  var selected = [];
  overlay.querySelectorAll('[data-disease]').forEach(function(btn){
    if(btn.dataset.selected === 'true'){
      selected.push(btn.getAttribute('data-disease'));
    }
  });
  state.myDiseases = selected;
  delete state.myDisease;
  saveState();
  // Bridge fix (P0-B3): settings-store の trackedConditions を同期する。
  // saveStore は trackedConditions 変更時に setState(myDiseases) を呼ぶが、
  // ここでは saveState() 済みのため二重保存は起きない（saveStore 内の saveState は
  // trackedConditions 変更時のみ実行され、state.myDiseases は既に同値のため冪等）。
  if (typeof window.saveSettingsStore === 'function') {
    window.saveSettingsStore({ trackedConditions: selected.slice() });
  }
  // 疾患設定変更もクラウドに同期（記録保存を待たずに即時バックアップ）
  if(typeof cloudBackupAll === 'function') cloudBackupAll().catch(function(){});
  var display = document.getElementById('disease-setting-display');
  if(display) display.textContent = selected.length ? selected.join('・') : '設定する';
  overlay.remove();
  updateDiseaseQuestions();
  reorderRecordSections();
}

function selectDisease(name){
  // 後方互換：単一選択時のショートカット
  if(name){
    state.myDiseases = [name];
  } else {
    state.myDiseases = [];
  }
  delete state.myDisease;
  saveState();
  var display = document.getElementById('disease-setting-display');
  if(display) display.textContent = name || '設定する';
  var overlay = document.getElementById('diseaseOverlay');
  if(overlay) overlay.remove();
  updateDiseaseQuestions();
}

function updateDiseaseQuestions(){
  var container = document.getElementById('disease-questions');
  if(!container) return;
  var diseases = state.myDiseases || (state.myDisease ? [state.myDisease] : []);
  var dot4 = document.getElementById('rec-dot-4');
  if(!diseases.length){
    container.style.display = 'none';
    container.innerHTML = '';
    if(dot4) dot4.style.display = 'none';
    return;
  }
  // 4th dot を表示
  if(dot4) dot4.style.display = 'block';
  // 再描画前に現在の選択値を保存（記録タブ押下で選択値がリセットされるバグの修正）
  var preserved = {};
  container.querySelectorAll('[data-disease-q]').forEach(function(g){
    var sel = g.querySelector('.chip.selected');
    if(sel) preserved[g.getAttribute('data-disease-q')] = sel.textContent;
  });
  // STEPラベル + タイトル
  var stepNum = 'STEP 4';
  var titleNames = diseases.map(function(d){ return DISEASE_CONFIG[d] ? (DISEASE_CONFIG[d].icon+' '+d) : d; }).join(' / ');
  var html = '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:4px;">'+stepNum+'</div>';
  html += '<div class="section-title serif" style="margin-bottom:16px;">疾患セルフチェック</div>';
  html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:16px;padding:8px 10px;background:var(--rose-pale);border-radius:10px;">'+titleNames+'</div>';
  for(var d=0;d<diseases.length;d++){
    var disease = diseases[d];
    var config = DISEASE_CONFIG[disease];
    if(!config) continue;
    if(d > 0) html += '<div style="height:1px;background:#f0e8e4;margin:16px 0;"></div>';
    html += '<div style="font-size:11px;letter-spacing:0.12em;color:var(--ink-light);margin-bottom:10px;">'+config.icon+' '+config.label+'</div>';
    var questions = config.questions;
    for(var i=0;i<questions.length;i++){
      var q = questions[i];
      html += '<div style="margin-bottom:14px;">';
      html += '<div style="font-size:13px;color:var(--ink);margin-bottom:8px;">'+q.text+'</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;" data-disease-q="'+disease+'__'+q.id+'">';
      for(var j=0;j<q.options.length;j++){
        html += '<button class="chip" onclick="this.parentElement.querySelectorAll(\'.chip\').forEach(function(c){c.classList.remove(\'selected\')});this.classList.add(\'selected\');updateRecProgressDots();" style="font-size:12px;padding:6px 14px;border-radius:20px;cursor:pointer;">'+q.options[j]+'</button>';
      }
      html += '</div></div>';
    }
  }
  container.innerHTML = html;
  container.style.display = 'block';
  // 保存した選択値を復元
  Object.keys(preserved).forEach(function(key){
    var group = container.querySelector('[data-disease-q="'+key+'"]');
    if(group){
      group.querySelectorAll('.chip').forEach(function(c){
        if(c.textContent === preserved[key]) c.classList.add('selected');
      });
    }
  });
  updateRecProgressDots();
}




function supabaseHeaders(){
  var h = {
    'apikey': SUPABASE_KEY,
    'Content-Type': 'application/json'
  };
  if(supabaseToken){
    h['Authorization'] = 'Bearer ' + supabaseToken;
  } else {
    h['Authorization'] = 'Bearer ' + SUPABASE_KEY;
  }
  return h;
}

function supabaseAuth(endpoint, body){
  return fetch(SUPABASE_URL + '/auth/v1/' + endpoint, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).then(function(r){ return r.json(); });
}

function supabaseSignInAnonymous(){
  return supabaseAuth('signup', {})
    .then(function(data){
      if(data.access_token){
        supabaseToken = data.access_token;
        supabaseUserId = data.user.id;
        localStorage.setItem('ippo_sb_token', data.access_token);
        localStorage.setItem('ippo_sb_refresh', data.refresh_token);
        localStorage.setItem('ippo_sb_user_id', data.user.id);
        console.log('Supabase: 匿名ユーザー作成', supabaseUserId);
        _notifyAuthReady();
        return data;
      }
      throw new Error(data.error_description || data.msg || 'signup failed');
    });
}

function supabaseRefreshSession(){
  var refreshToken = localStorage.getItem('ippo_sb_refresh');
  if(!refreshToken) return Promise.reject('no refresh token');
  return supabaseAuth('token?grant_type=refresh_token', {
    refresh_token: refreshToken
  }).then(function(data){
    if(data.access_token){
      supabaseToken = data.access_token;
      supabaseUserId = data.user.id;
      localStorage.setItem('ippo_sb_token', data.access_token);
      localStorage.setItem('ippo_sb_refresh', data.refresh_token);
      localStorage.setItem('ippo_sb_user_id', data.user.id);
      _notifyAuthReady();
      return data;
    }
    throw new Error('refresh failed');
  });
}

function supabaseEnsureAuth(){
  if(supabaseToken && supabaseUserId) return Promise.resolve();
  var savedToken = localStorage.getItem('ippo_sb_token');
  var savedUserId = localStorage.getItem('ippo_sb_user_id');
  if(savedToken && savedUserId){
    supabaseToken = savedToken;
    supabaseUserId = savedUserId;
    return supabaseRefreshSession().catch(function(){
      return supabaseSignInAnonymous();
    });
  }
  return supabaseSignInAnonymous();
}

  // ===== プレミアム先行登録 =====
function submitPremiumWaitlist(){
  var emailInput = document.getElementById('premium-email');
  var email = emailInput ? emailInput.value.trim() : '';
  if(!email || email.indexOf('@') === -1){
    showAlertModal('メールアドレスを入力してください');
    return;
  }
  supabaseEnsureAuth().then(function(){
    return fetch(SUPABASE_URL + '/rest/v1/premium_waitlist', {
      method: 'POST',
      headers: Object.assign(supabaseHeaders(), {
        'Prefer': 'return=representation'
      }),
      body: JSON.stringify({
        email: email,
        user_id: supabaseUserId
      })
    });
  }).then(function(r){
    if(r.ok){
      document.getElementById('premium-form-area').style.display = 'none';
      document.getElementById('premium-done').style.display = 'block';
      localStorage.setItem('ippo_premium_registered', email);
    } else {
      return r.json().then(function(data){
        if(data.code === '23505'){
          showAlertModal('このメールアドレスは既に登録済みです');
        } else {
          showAlertModal('送信に失敗しました。もう一度お試しください');
        }
      });
    }
  }).catch(function(e){
    console.warn('Waitlist error:', e);
    showAlertModal('通信エラーが発生しました');
  });
}

// 既に登録済みなら完了表示
function checkPremiumRegistered(){
  if(localStorage.getItem('ippo_premium_registered')){
    var form = document.getElementById('premium-form-area');
    var done = document.getElementById('premium-done');
    if(form) form.style.display = 'none';
    if(done) done.style.display = 'block';
  }
}

  
var _cloudBackupLock = false;
function cloudBackupAll(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve();
  if(_cloudBackupLock){
    console.log('クラウド同期中：スキップ');
    return Promise.resolve();
  }
  // 記録もなく疾患設定もない完全な空状態はスキップ（クラウドの既存データ保護）
  var hasRecords = state.records && state.records.length > 0;
  var hasDiseases = state.myDiseases && state.myDiseases.length > 0;
  var hasSettings = state.name || state._onboardingDone;
  if(!hasRecords && !hasDiseases && !hasSettings){
    console.warn('空の状態のためクラウド同期をスキップ');
    return Promise.resolve();
  }
  _cloudBackupLock = true;
  if(typeof showSyncIndicator === 'function') showSyncIndicator('バックアップ中');
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      var skipReason = localStorage.getItem('ippo_sb_token') ? 'sdk-session-null-stale-token' : 'not-logged-in';
      console.warn('未ログイン：クラウドバックアップをスキップ (' + skipReason + ')');
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'skipped', reason: skipReason };
      _cloudBackupLock = false;
      return;
    }
    var userId = session.user.id;
    var stateToSave = {
      name: state.name,
      records: state.records,
      streak: state.streak,
      totalDays: state.totalDays,
      fastGoal: state.fastGoal,
      myVision: state.myVision,
      fastTimer: state.fastTimer,
      lastSaved: state.lastSaved,
      myDiseases: state.myDiseases,
      reminders: state.reminders,
      _onboardingDone: state._onboardingDone,
      experiments: state.experiments
    };
    // Fix: myDiseases が空配列の場合はクラウドの既存値を上書きしない。
    if (!stateToSave.myDiseases || stateToSave.myDiseases.length === 0) {
      delete stateToSave.myDiseases;
    }
    if (!Array.isArray(stateToSave.experiments) || stateToSave.experiments.length === 0) {
      delete stateToSave.experiments;
    }
    var payload = {
      state: stateToSave,
      updated_at: new Date().toISOString()
    };
    return supabase.from('user_data').update(payload).eq('user_id', userId).select().then(function(result){
      _cloudBackupLock = false;
      if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
      if(result.data && result.data.length > 0){
        console.log('Cloud backup完了（更新）: '+stateToSave.records.length+'件');
        window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'updated' };
        return result.data;
      }
      payload.user_id = userId;
      return supabase.from('user_data').insert(payload).select().then(function(result2){
        if(result2.error){
          console.warn('Backup失敗:', result2.error.message);
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: result2.error.message };
        } else {
          console.log('Cloud backup完了（新規）');
          window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'success', reason: 'inserted' };
        }
        return result2.data;
      });
    }).catch(function(e){
      window.__ippoLastSyncStatus = { ts: new Date().toISOString(), result: 'error', reason: e.message || String(e) };
      _cloudBackupLock = false;
      if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
      throw e;
    });
  }).catch(function(e){
    _cloudBackupLock = false;
    if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
    throw e;
  });
}



function cloudRestore(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve(false);
  // auth が未完了の場合: localStorage に token があれば queue（auth 復元中）、なければ safe skip
  if (!supabaseUserId) {
    var hasSavedToken = !!localStorage.getItem('ippo_sb_token');
    if (hasSavedToken) {
      // token は存在する → auth 復元中の可能性が高い。auth ready 後にリトライ
      console.warn('未ログイン：クラウド復元をキュー（auth pending）');
      return new Promise(function(resolve) {
        _cloudRestoreQueue.push(function() {
          cloudRestore().then(resolve).catch(function() { resolve(false); });
        });
      });
    }
    console.warn('未ログイン：クラウド復元をスキップ');
    return Promise.resolve(false);
  }
  if (window.ippoBrain && typeof window.ippoBrain.setAuthState === 'function') {
    window.ippoBrain.setAuthState('cloudRestoreReady', true);
  }
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      console.warn('未ログイン：クラウド復元をスキップ');
      return false;
    }
    var userId = session.user.id;
    return supabase.from('user_data').select('state,updated_at').eq('user_id', userId).single().then(function(result){
      if(!result.data) return false;
      var cloudState = result.data.state;
      // cloudStateの整合性チェック
      if(!cloudState || typeof cloudState !== 'object'){
        console.warn('クラウドのデータ形式が不正（nullまたは非オブジェクト）');
        return false;
      }
      if(!Array.isArray(cloudState.records)){
        console.warn('クラウドのrecordsが不正（配列ではない）');
        return false;
      }
      var rawDate = result.data.updated_at;
      if(!rawDate){
        console.warn('クラウドのupdated_atが不正');
        return false;
      }
      var cloudDate = new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z');
      var localDate = state.lastSaved ? new Date(state.lastSaved) : new Date(0);
      var localRecs = state.records ? state.records.length : 0;
      var cloudRecs = cloudState.records.length;

      // ★ records は常にマージ（上書きしない）
      // どちらか片方にしか存在しないレコードを保護する
      var mergedRecords = mergeRecords(state.records || [], cloudState.records || []);
      var mergedCount = mergedRecords.length;

      if(cloudDate > localDate){
        // クラウドが新しい：設定系（name・疾患・reminders等）はクラウドを採用
        // records だけはマージ結果を使用
        var safeCloud = Object.assign({}, cloudState);
        // Fix: myDiseases が空配列の場合はローカルの設定済み値を保護する。
        if (Array.isArray(safeCloud.myDiseases) && safeCloud.myDiseases.length === 0) {
          delete safeCloud.myDiseases;
        }
        state = Object.assign(state, safeCloud);
        state.records = mergedRecords;
        state.lastSaved = cloudDate.toISOString();
        localStorage.setItem('ippo_state', JSON.stringify(state));
        console.log('クラウド復元完了（マージ）: ローカル'+localRecs+'件 + クラウド'+cloudRecs+'件 → '+mergedCount+'件');
        return true;
      } else if(mergedCount > localRecs){
        // ローカルが新しくてもクラウドに追加レコードがあればマージのみ実施
        // 設定系はローカルを保持（空の場合のみ Cloud から補完）
        state.records = mergedRecords;
        state.totalDays = Object.keys(mergedRecords.reduce(function(acc,r){
          acc[new Date(r.record_date || r.date).toDateString()]=true; return acc;
        },{})).length;
        if (
          (!Array.isArray(state.myDiseases) || state.myDiseases.length === 0) &&
          Array.isArray(cloudState.myDiseases) && cloudState.myDiseases.length > 0
        ) { state.myDiseases = cloudState.myDiseases.slice(); }
        if (
          (!Array.isArray(state.experiments) || state.experiments.length === 0) &&
          Array.isArray(cloudState.experiments) && cloudState.experiments.length > 0
        ) { state.experiments = cloudState.experiments.slice(); }
        saveState();
        console.log('クラウドの追加レコードをマージ: +' + (mergedCount - localRecs) + '件 → 合計'+mergedCount+'件');
        return true;
      }
      console.log('ローカルが最新かつ件数も多いため復元スキップ（ローカル:'+localRecs+' クラウド:'+cloudRecs+'）');
      return false;
    });
  });
}

  // ===== IndexedDB データ層 =====
var IDB_NAME = 'ippo_db';
var IDB_VERSION = 1;
var IDB_STORE = 'records';

function openIDB(){
  return new Promise(function(resolve, reject){
    var req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      if(!db.objectStoreNames.contains(IDB_STORE)){
        var store = db.createObjectStore(IDB_STORE, {keyPath:'id'});
        store.createIndex('date','record_date',{unique:false});
        store.createIndex('updated','updatedAt',{unique:false});
      }
    };
    req.onsuccess = function(e){ resolve(e.target.result); };
    req.onerror = function(e){ reject(e.target.error); };
  });
}

function idbPutRecord(record){
  return openIDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).put(record);
      tx.oncomplete = function(){ resolve(); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  });
}

function idbGetAllRecords(){
  return openIDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE,'readonly');
      var req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = function(){ resolve(req.result || []); };
      req.onerror = function(e){ reject(e.target.error); };
    });
  });
}

function idbDeleteRecord(id){
  return openIDB().then(function(db){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(IDB_STORE,'readwrite');
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = function(){ resolve(); };
      tx.onerror = function(e){ reject(e.target.error); };
    });
  });
}

// ===== レコードID生成 =====
function generateRecordId(){
  return Date.now().toString(36) + Math.random().toString(36).substr(2,8);
}

function ensureRecordIds(){
  var changed = false;
  state.records.forEach(function(r){
    if(!r.id){
      r.id = generateRecordId();
      changed = true;
    }
    if(!r.updatedAt){
      r.updatedAt = r.date || new Date().toISOString();
      changed = true;
    }
  });
  return changed;
}

// ===== レコード個別同期 =====
var _syncLock = false;

function syncRecordToCloud(record){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve();
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user) return;
    var userId = session.user.id;
    var row = {
      id: record.id,
      user_id: userId,
      record_date: record.date ? record.date.slice(0,10) : new Date().toISOString().slice(0,10),
      data: record,
      updated_at: record.updatedAt || new Date().toISOString(),
      deleted_at: record.deleted_at || null
    };
    return supabase.from('user_records').upsert(row, {onConflict:'id'}).then(function(result){
      if(result.error){
        console.warn('レコード同期失敗:', record.id, result.error.message);
      }
    });
  });
}

function syncAllRecordsToCloud(){
  if (typeof window.supabase === 'undefined' || !window.supabase) return Promise.resolve();
  if(_syncLock) return Promise.resolve();
  _syncLock = true;
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      _syncLock = false;
      return;
    }
    var userId = session.user.id;
    ensureRecordIds();
    var rows = state.records.map(function(r){
      return {
        id: r.id,
        user_id: userId,
        record_date: r.date ? r.date.slice(0,10) : new Date().toISOString().slice(0,10),
        data: r,
        updated_at: r.updatedAt || new Date().toISOString(),
        deleted_at: r.deleted_at || null
      };
    });
    return supabase.from('user_records').upsert(rows, {onConflict:'id'}).then(function(result){
      if(result.error){
        console.warn('一括同期失敗:', result.error.message);
      } else {
        console.log('一括同期完了:', rows.length+'件');
      }
      _syncLock = false;
    });
  }).catch(function(e){
    console.warn('同期エラー:', e);
    _syncLock = false;
  });
}

function pullRecordsFromCloud(){
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user) return [];
    var userId = session.user.id;
    return supabase.from('user_records')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .then(function(result){
        if(result.error){
          console.warn('クラウド取得失敗:', result.error.message);
          return [];
        }
        return (result.data || []).map(function(row){ return row.data; });
      });
  });
}

// ===== マージエンジン =====
function mergeRecords(localRecords, cloudRecords){
  var merged = {};
  localRecords.forEach(function(r){
    if(!r.id) r.id = generateRecordId();
    merged[r.id] = r;
  });
  cloudRecords.forEach(function(r){
    if(!r.id) return;
    if(!merged[r.id]){
      merged[r.id] = r;
    } else {
      var localTime = new Date(merged[r.id].updatedAt || merged[r.id].date || 0).getTime();
      var cloudTime = new Date(r.updatedAt || r.date || 0).getTime();
      if(cloudTime > localTime){
        merged[r.id] = r;
      }
    }
  });
  var result = [];
  Object.keys(merged).forEach(function(k){
    if(!merged[k].deleted_at) result.push(merged[k]);
  });
  return result.sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
}

// ===== 安全な同期（マージ方式） =====
function cloudSyncSafe(){
  if(_syncLock) return Promise.resolve();
  _syncLock = true;
  if(typeof showSyncIndicator === 'function') showSyncIndicator('データ同期中');
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      _syncLock = false;
      return;
    }
    var userId = session.user.id;
    ensureRecordIds();
    return supabase.from('user_records')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .then(function(result){
        var cloudRecords = (result.data || []).map(function(row){ return row.data; });
        var localCount = state.records.length;
        var cloudCount = cloudRecords.length;
        var merged = mergeRecords(state.records, cloudRecords);
        console.log('マージ同期: ローカル'+localCount+' + クラウド'+cloudCount+' → 結果'+merged.length);
        if(merged.length < localCount && localCount - merged.length >= 2){
          console.warn('マージ異常: データ減少のため中止');
          _syncLock = false;
          return;
        }
        state.records = merged;
        state.totalDays = Object.keys(merged.reduce(function(acc,r){
          acc[new Date(r.record_date || r.date).toDateString()]=true; return acc;
        },{})).length;
        // クラウドにアップロード
        var rows = merged.map(function(r){
          return {
            id: r.id,
            user_id: userId,
            record_date: r.date ? r.date.slice(0,10) : new Date().toISOString().slice(0,10),
            data: r,
            updated_at: r.updatedAt || new Date().toISOString(),
            deleted_at: null
          };
        });
        return supabase.from('user_records').upsert(rows, {onConflict:'id'}).then(function(){
          // IndexedDBにも保存
          var promises = merged.map(function(r){ return idbPutRecord(r); });
          return Promise.all(promises);
        }).then(function(){
          state.lastSaved = new Date().toISOString();
          saveState();
          // upsert成功後にバックアップ履歴保存
          saveBackupHistory(userId);
          console.log('安全同期完了: '+merged.length+'件');
          _syncLock = false;
          if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
        });
      });
  }).catch(function(e){
    console.warn('安全同期エラー:', e);
    _syncLock = false;
    if(typeof showToast === 'function') showToast('データ同期に失敗しました。後で自動リトライします。', 'warn');
  });
}

// ===== バックアップ履歴 =====
function saveBackupHistory(userId){
  var snapshot = {
    name: state.name,
    records: state.records,
    totalDays: state.totalDays,
    myDiseases: state.myDiseases
  };
  return supabase.from('user_data_history')
    .insert({user_id: userId, records_count: state.records.length, state: snapshot})
    .then(function(){
      // 5世代超えたら古いものを削除
      return supabase.from('user_data_history')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', {ascending:false})
        .range(5,100);
    }).then(function(old){
      if(old.data && old.data.length > 0){
        var ids = old.data.map(function(r){ return r.id; });
        return supabase.from('user_data_history').delete().in('id', ids).then(function(){
          console.log('古いバックアップ履歴を削除:', ids.length + '件');
        });
      }
    }).catch(function(e){
      console.warn('バックアップ履歴保存エラー:', e);
    });
}

// ===== 論理削除 =====
function softDeleteRecord(recordId){
  var found = false;
  for(var i=0; i<state.records.length; i++){
    if(state.records[i].id === recordId){
      state.records[i].deleted_at = new Date().toISOString();
      state.records[i].updatedAt = new Date().toISOString();
      syncRecordToCloud(state.records[i]);
      state.records.splice(i,1);
      found = true;
      break;
    }
  }
  if(found){
    saveState();
    return true;
  }
  return false;
}

// ===== saveAndSync を新エンジンに接続 =====
function saveAndSync(){
  ensureRecordIds();
  saveState();
  // 最後に保存/変更されたレコードを個別同期
  var latest = state.records[state.records.length - 1];
  if(latest){
    latest.updatedAt = new Date().toISOString();
    idbPutRecord(latest);
    syncRecordToCloud(latest).catch(function(e){
      console.warn('個別同期失敗:', e);
    });
  }
}
// ===== 第1層：自動復元 =====
function autoRecoveryCheck(){
  var lastCount = parseInt(localStorage.getItem('ippo_last_record_count') || '0');
  var currentCount = state.records.length;
  if(lastCount > 0 && currentCount < lastCount && lastCount - currentCount >= 2){
    console.warn('データ減少検知: '+lastCount+'件→'+currentCount+'件');
    return idbGetAllRecords().then(function(idbRecs){
      var activeRecs = idbRecs.filter(function(r){ return !r.deleted_at; });
      if(activeRecs.length > currentCount){
        state.records = mergeRecords(state.records, activeRecs);
        saveState();
        showRecoveryBanner(true, state.records.length);
        console.log('IndexedDBから自動復元: '+state.records.length+'件');
        localStorage.setItem('ippo_last_record_count', String(state.records.length));
        return true;
      }
      return manualCloudRestore().then(function(){
        showRecoveryBanner(true, state.records.length);
        localStorage.setItem('ippo_last_record_count', String(state.records.length));
        return true;
      });
    }).catch(function(e){
      console.warn('自動復元失敗:', e);
      showRecoveryBanner(false, 0);
      return false;
    });
  }
  localStorage.setItem('ippo_last_record_count', String(currentCount));
  return Promise.resolve(false);
}

// ===== 第2層：バナー通知 =====
function showRecoveryBanner(recovered, count){
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;padding:14px 20px;z-index:9999;font-size:13px;text-align:center;transition:opacity 0.3s;';
  if(recovered){
    banner.style.background = '#e8f4ec';
    banner.style.color = '#2d6a3f';
    banner.innerHTML = '✅ データを自動復元しました（'+count+'件）';
    setTimeout(function(){ banner.style.opacity='0'; setTimeout(function(){ banner.remove(); },300); }, 5000);
  } else {
    banner.style.background = '#fef3f2';
    banner.style.color = '#c44848';
    banner.innerHTML = '⚠️ データに問題が検出されました　<span style="text-decoration:underline;cursor:pointer;" onclick="showDiagnosisUI()">復元する</span>';
  }
  document.body.appendChild(banner);
}

// ===== 第3層：復元UI =====
function openRestoreUI(){
  supabase.auth.getSession().then(function(res){
    if(!res.data.session){ showAlertModal('ログインが必要です'); return; }
    var userId = res.data.session.user.id;
    supabase.from('user_data_history')
      .select('id,records_count,created_at')
      .eq('user_id', userId)
      .order('created_at', {ascending:false})
      .limit(5)
      .then(function(r){
        if(!r.data || r.data.length === 0){ showAlertModal('バックアップ履歴がありません'); return; }
        var msg = 'バックアップ履歴:\n\n';
        r.data.forEach(function(h,i){
          msg += (i+1)+'. '+new Date(h.created_at).toLocaleString('ja-JP')+' ('+h.records_count+'件)\n';
        });
        msg += '\n最新のバックアップから復元しますか？';
        showConfirmModal(msg, function() {
          restoreFromHistory(r.data[0].id);
        });
      });
  });
}

// ===== 第4層：自動診断UI =====
function showDiagnosisUI(){
  var overlay = document.createElement('div');
  overlay.id = 'diagnosis-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;';
  var box = document.createElement('div');
  box.style.cssText = 'background:white;border-radius:20px;padding:24px;margin:20px;max-width:360px;width:100%;';
  box.innerHTML = '<div style="text-align:center;font-size:15px;font-weight:600;margin-bottom:16px;">🔍 データ診断中...</div><div id="diagnosis-result" style="font-size:13px;color:#666;text-align:center;">確認しています...</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  // EL-5: 動的生成 overlay は once:true で残留リスナーを防止
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); }, { once: true });
  runSelfDiagnosis().then(function(r){
    var best = Math.max(r.local, r.idb, r.cloud);
    var source = best === r.cloud ? 'クラウド' : best === r.idb ? 'IndexedDB' : 'ローカル';
    var needsRepair = (r.local < best);
    var html = '<div style="text-align:left;margin-bottom:16px;">';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">📱 ローカル: <b>'+r.local+'件</b></div>';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">💾 IndexedDB: <b>'+r.idb+'件</b></div>';
    html += '<div style="padding:8px 0;border-bottom:1px solid #f0ebe6;">☁️ クラウド: <b>'+r.cloud+'件</b></div>';
    html += '<div style="padding:8px 0;">📦 バックアップ: <b>'+r.history.length+'世代</b></div></div>';
    if(needsRepair){
      html += '<div style="background:#fef3f2;border-radius:12px;padding:12px;margin-bottom:16px;font-size:12px;color:#c44848;">⚠️ データの不一致を検出。'+source+'に'+best+'件あります。</div>';
      html += '<button onclick="repairFromBest()" style="width:100%;padding:14px;background:#c4878c;color:white;border:none;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;">🔧 自動修復する</button>';
    } else {
      html += '<div style="background:#e8f4ec;border-radius:12px;padding:12px;font-size:12px;color:#2d6a3f;">✅ データは正常です。3箇所すべて一致しています。</div>';
    }
    if(r.history.length > 0){
      html += '<div style="margin-top:12px;font-size:12px;color:#888;">過去のバックアップ:';
      r.history.forEach(function(h){
        html += '<div style="margin-top:6px;padding:8px;background:#f8f5f0;border-radius:8px;cursor:pointer;" onclick="restoreFromHistory(\''+h.id+'\')">';
        html += new Date(h.created_at).toLocaleString('ja-JP')+' ('+h.records_count+'件) →復元</div>';
      });
      html += '</div>';
    }
    html += '<button onclick="document.getElementById(\'diagnosis-overlay\').remove()" style="width:100%;margin-top:12px;padding:12px;background:none;border:1px solid #ddd;border-radius:14px;font-size:13px;color:#888;cursor:pointer;">閉じる</button>';
    document.getElementById('diagnosis-result').innerHTML = html;
  });
}

function runSelfDiagnosis(){
  var results = {local: state.records.length, idb: 0, cloud: 0, history: []};
  return idbGetAllRecords().then(function(recs){
    results.idb = recs.filter(function(r){ return !r.deleted_at; }).length;
    return supabase.auth.getSession();
  }).then(function(res){
    if(!res.data.session) return results;
    var userId = res.data.session.user.id;
    return supabase.from('user_records')
      .select('id', {count:'exact'})
      .eq('user_id', userId)
      .is('deleted_at', null)
      .then(function(r){
        results.cloud = r.count || 0;
        return supabase.from('user_data_history')
          .select('id,records_count,created_at')
          .eq('user_id', userId)
          .order('created_at', {ascending:false})
          .limit(5);
      }).then(function(r){
        results.history = r.data || [];
        return results;
      });
  }).catch(function(e){
    console.warn('診断エラー:', e);
    return results;
  });
}

function repairFromBest(){
  runSelfDiagnosis().then(function(r){
    var best = Math.max(r.local, r.idb, r.cloud);
    if(best === r.idb && r.idb > r.local){
      idbGetAllRecords().then(function(recs){
        state.records = mergeRecords(state.records, recs.filter(function(x){ return !x.deleted_at; }));
        saveState();
        showRecoveryBanner(true, state.records.length);
        var el = document.getElementById('diagnosis-overlay');
        if(el) el.remove();
      });
    } else if(best === r.cloud && r.cloud > r.local){
      supabase.auth.getSession().then(function(res){
        var userId = res.data.session.user.id;
        supabase.from('user_records')
          .select('data')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .then(function(result){
            var cloudRecs = result.data.map(function(row){ return row.data; });
            state.records = mergeRecords(state.records, cloudRecs);
            saveState();
            showRecoveryBanner(true, state.records.length);
            var el = document.getElementById('diagnosis-overlay');
            if(el) el.remove();
          });
      });
    } else {
      showAlertModal('ローカルデータが最新です。');
      var el = document.getElementById('diagnosis-overlay');
      if(el) el.remove();
    }
  });
}

function restoreFromHistory(historyId){
  showConfirmModal('このバックアップから復元しますか？', function() {
    supabase.from('user_data_history')
      .select('state')
      .eq('id', historyId)
      .single()
      .then(function(r){
        if(r.data && r.data.state && r.data.state.records){
          state.records = mergeRecords(state.records, r.data.state.records);
          saveState();
          buildCalendar();
          updateHomeSummary();
          showRecoveryBanner(true, state.records.length);
          var el = document.getElementById('diagnosis-overlay');
          if(el) el.remove();
        } else {
          showAlertModal('バックアップデータが見つかりません');
        }
      });
  });
}
// ===== localStorageからIndexedDBへの移行 =====
function migrateToIDB(){
  if(localStorage.getItem('ippo_idb_migrated')) return Promise.resolve();
  ensureRecordIds();
  var promises = state.records.map(function(r){ return idbPutRecord(r); });
  return Promise.all(promises).then(function(){
    localStorage.setItem('ippo_idb_migrated', '1');
    console.log('IndexedDB移行完了:', state.records.length+'件');
  }).catch(function(e){
    console.warn('IndexedDB移行失敗:', e);
  });
}

// ===== 初回の全レコード同期 =====
function initialCloudSync(){
  if(localStorage.getItem('ippo_records_synced')) return Promise.resolve();
  return syncAllRecordsToCloud().then(function(){
    localStorage.setItem('ippo_records_synced', '1');
    console.log('初回クラウド同期完了');
  }).catch(function(e){
    console.warn('初回クラウド同期失敗（次回再試行）:', e);
    // フラグを立てないので次回起動時に再試行される
  });
}

// ===== 手動復元（強化版） =====
function manualCloudRestore(){
  return supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session || !session.user){
      if(typeof showToast === 'function') showToast('ログインしてからご利用ください', 'warn');
      return;
    }
    var userId = session.user.id;

    // 診断UIを使う場合は showDiagnosisUI() を呼ぶ
    // ここでは「最新クラウドデータとマージ」のみをシンプルに実行
    if(typeof showSyncIndicator === 'function') showSyncIndicator('クラウドから復元中');

    // user_data（最新スナップショット）を取得してマージ
    return supabase.from('user_data').select('state,updated_at').eq('user_id', userId).single()
      .then(function(result){
        if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
        if(!result.data || !result.data.state){
          if(typeof showToast === 'function') showToast('クラウドにデータが見つかりませんでした', 'warn');
          return;
        }
        var cloudState = result.data.state;
        if(!Array.isArray(cloudState.records)){
          if(typeof showToast === 'function') showToast('クラウドのデータ形式が不正です', 'warn');
          return;
        }
        var localRecs = state.records ? state.records.length : 0;
        var cloudRecs = cloudState.records.length;

        // records はマージ（上書きしない）
        var mergedRecords = mergeRecords(state.records || [], cloudState.records || []);
        var mergedCount = mergedRecords.length;

        // 設定系（name・疾患・reminders等）はクラウドを採用、recordsはマージ結果
        var rawDate = result.data.updated_at;
        var cloudDate = rawDate ? new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z') : new Date(0);
        state = Object.assign(state, cloudState);
        state.records = mergedRecords;
        state.totalDays = Object.keys(mergedRecords.reduce(function(acc,r){
          acc[new Date(r.record_date || r.date).toDateString()]=true; return acc;
        },{})).length;
        state.lastSaved = cloudDate.toISOString();
        localStorage.setItem('ippo_state', JSON.stringify(state));

        // UI再描画
        if(typeof updateStats === 'function') updateStats();
        if(typeof updateHistory === 'function') updateHistory();
        if(typeof buildCalendar === 'function') buildCalendar();
        if(typeof updateDiseaseSettingDisplay === 'function') updateDiseaseSettingDisplay();
        if(typeof updateDiseaseQuestions === 'function') updateDiseaseQuestions();
        if(typeof reorderRecordSections === 'function') reorderRecordSections();
        if(typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();

        var msg = 'クラウドから復元しました ✅\nローカル'+localRecs+'件 + クラウド'+cloudRecs+'件 → '+mergedCount+'件';
        if(typeof showToast === 'function') showToast(msg, 'success');
        console.log(msg);
      }).catch(function(e){
        if(typeof hideSyncIndicator === 'function') hideSyncIndicator();
        console.warn('手動復元エラー:', e);
        if(typeof showToast === 'function') showToast('復元に失敗しました。通信状況を確認してください。', 'warn');
      });
  });
}
  
// (bare `state` lexical bridge は app-legacy.js 最上部で宣言済み)

// Current record being built（let → var でグローバル化して module 側からも参照可能）
var currentRecord = {};
var currentStep = 0;
var STEPS = [];


// saveState: モジュール版（state.js）の実行前に init() から呼ばれる場合があるため
// インラインにも定義を維持する。モジュール実行後は window.saveState が上書きされる。
function saveState() {
  try {
    var s = state;
    s.lastSaved = new Date().toISOString();
    localStorage.setItem('ippo_state', JSON.stringify(s));
  } catch(e) {
    console.warn('ippo: saveState failed', e);
  }
}

// ===== 同期インジケーター =====
var _syncIndicatorTimer = null;
function showSyncIndicator(msg){
  var el = document.getElementById('ippo-sync-indicator');
  var txt = document.getElementById('ippo-sync-text');
  if(!el) return;
  if(txt) txt.textContent = msg || '同期中';
  el.style.display = 'flex';
  if(_syncIndicatorTimer) clearTimeout(_syncIndicatorTimer);
}
function hideSyncIndicator(){
  if(_syncIndicatorTimer) clearTimeout(_syncIndicatorTimer);
  _syncIndicatorTimer = setTimeout(function(){
    var el = document.getElementById('ippo-sync-indicator');
    if(el) el.style.display = 'none';
  }, 800);
}

// ===== トースト通知（ユーザー向けメッセージ） =====
var _toastTimer = null;
function showToast(msg, type){
  if(_toastTimer) clearTimeout(_toastTimer);
  var existing = document.getElementById('ippo-toast');
  if(existing) existing.remove();
  var toast = document.createElement('div');
  toast.id = 'ippo-toast';
  var bg = type === 'error' ? '#fef3f2' : type === 'warn' ? '#fff8e6' : '#e8f4ec';
  var color = type === 'error' ? '#c44848' : type === 'warn' ? '#9a6a00' : '#2d6a3f';
  toast.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 60px);left:50%;transform:translateX(-50%);max-width:390px;width:calc(100% - 32px);padding:12px 16px;background:'+bg+';color:'+color+';border-radius:12px;font-size:13px;font-family:Noto Sans JP,sans-serif;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.1);text-align:center;transition:opacity 0.3s;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  _toastTimer = setTimeout(function(){
    toast.style.opacity = '0';
    setTimeout(function(){ if(toast.parentNode) toast.remove(); }, 300);
  }, type === 'error' ? 5000 : 3000);
}

// ===== Escapeキーでモーダルを閉じる =====
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  // カレンダー日付詳細
  var dm = document.getElementById('dmOverlay');
  if(dm && dm.classList.contains('dm-open')){ dm.classList.remove('dm-open'); return; }
  // 編集オーバーレイ
  var eo = document.getElementById('editOverlay');
  if(eo && eo.style.display === 'flex'){ eo.style.display = 'none'; return; }
  // 記録モーダル（ステップ）
  var rm = document.getElementById('record-modal');
  if(rm && rm.classList.contains('active')){ if(typeof closeModal === 'function') closeModal(); return; }
  // 診断オーバーレイ
  var diag = document.getElementById('diagnosis-overlay');
  if(diag){ diag.remove(); return; }
});



// Phase E (Step 5): init() 削除済み。
// bootstrap() は src/main.js から直接呼び出される。

// visibilitychange ハンドラは src/services/supabase.js に移植済み（Priority 4 Step 4-4）。

  function updateFoodBodyCorrelation() {
  var container = document.getElementById('food-body-correlation');
  if (!container) return;

  if (!isPremium) {
    container.innerHTML = '<div style="position:relative;overflow:hidden;border-radius:12px;">'
      +'<div style="filter:blur(6px);opacity:0.5;pointer-events:none;">'
      +'<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🕐 ファスティングと不調の関係</div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:70px;">16h以上</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:35%;background:linear-gradient(90deg,#e8b4b8,#c9747a);border-radius:10px;"></div></div><span style="font-size:11px;width:35px;text-align:right;">35%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;color:var(--ink-light);width:70px;">16h未満</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:65%;background:linear-gradient(90deg,#c4d4b0,#8aab96);border-radius:10px;"></div></div><span style="font-size:11px;width:35px;text-align:right;">65%</span></div></div>'
      +'<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--ink);">🔍 注目の食材パターン</div>'
      +'<div style="margin-top:8px;padding:10px;background:var(--warm-light);border-radius:10px;font-size:12px;color:var(--ink);">「小麦」を含む日は不調が...</div>'
      +'</div>'
      +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(250,246,242,0.4);border-radius:12px;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🔒</div>'
      +'<div style="font-size:13px;color:var(--ink);font-weight:500;margin-bottom:4px;">プレミアム機能</div>'
      +'<div style="font-size:11px;color:var(--ink-light);margin-bottom:12px;">食事と体調の相関を分析します</div>'
      +'<button onclick="document.getElementById(\'premiumLockOverlay\').classList.add(\'active\')" style="padding:8px 24px;background:var(--rose);color:white;border:none;border-radius:20px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,107,0.3);">Premiumで解放</button>'
      +'</div></div>';
    return;
  }

    var records = state.records || [];
  if (records.length < 7) {
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">7日以上記録すると相関分析が表示されます。<br>あと' + Math.max(0, 7 - records.length) + '日！</div>';
    return;
  }

  var html = '';

  //  ① ファスティングと症状の関係
  var longFast = [];
  var shortFast = [];
  records.forEach(function(r) {
    var f = parseFloat(r.fasting) || 0;
    var symptoms = r.symptoms || [];
    var checks = r.diseaseCheck || {};
    var hasIssue = symptoms.length > 0 || Object.values(checks).some(function(v) { return v !== 'なし' && v; });
    if (f >= 16) longFast.push({ hasIssue: hasIssue, symptoms: symptoms, checks: checks });
    else if (f > 0) shortFast.push({ hasIssue: hasIssue, symptoms: symptoms, checks: checks });
  });

  if (longFast.length >= 2 && shortFast.length >= 2) {
    var longIssueRate = Math.round(longFast.filter(function(d) { return d.hasIssue; }).length / longFast.length * 100);
    var shortIssueRate = Math.round(shortFast.filter(function(d) { return d.hasIssue; }).length / shortFast.length * 100);
    var maxRate = Math.max(longIssueRate, shortIssueRate, 1);

    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🕐 ファスティングと不調の関係</div>';
    html += '<div style="margin-bottom:6px;display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:70px;flex-shrink:0;">16h以上</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + (longIssueRate / maxRate * 100) + '%;background:linear-gradient(90deg,#e8b4b8,#c9747a);border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:35px;text-align:right;">' + longIssueRate + '%</span>';
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:70px;flex-shrink:0;">16h未満</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + (shortIssueRate / maxRate * 100) + '%;background:linear-gradient(90deg,#c4d4b0,#8aab96);border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:35px;text-align:right;">' + shortIssueRate + '%</span>';
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--ink);line-height:1.8;margin-top:10px;padding:10px;background:var(--warm-light);border-radius:10px;">';
    if (longIssueRate < shortIssueRate) {
      html += 'ファスティング16時間以上の日は不調の記録が <strong style="color:var(--rose);">少ない</strong> 傾向があります。あなたのからだに合っているかもしれません。';
    } else if (longIssueRate > shortIssueRate) {
      html += 'ファスティング16時間以上の日に不調の記録が <strong style="color:var(--rose);">多い</strong> 傾向があります。ファスティング時間を調整してみましょう。';
    } else {
      html += 'ファスティングと不調に明確な差は見られません。引き続き記録を続けましょう。';
    }
    html += '</div></div>';
  }

  // ② 食事回数と体調の関係
  var fewMeals = [];
  var manyMeals = [];
  records.forEach(function(r) {
    var mc = r.mealCount || 0;
    var checks = r.diseaseCheck || {};
    var issueCount = Object.values(checks).filter(function(v) { return v !== 'なし' && v; }).length;
    if (mc > 0 && mc <= 3) fewMeals.push(issueCount);
    else if (mc > 3) manyMeals.push(issueCount);
  });

  if (fewMeals.length >= 2 && manyMeals.length >= 2) {
    var fewAvg = (fewMeals.reduce(function(a, b) { return a + b; }, 0) / fewMeals.length).toFixed(1);
    var manyAvg = (manyMeals.reduce(function(a, b) { return a + b; }, 0) / manyMeals.length).toFixed(1);

    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🍽 食事回数と疾患チェック</div>';
    html += '<div style="display:flex;gap:12px;margin-bottom:8px;">';
    html += '<div style="flex:1;text-align:center;padding:12px;background:var(--warm-light);border-radius:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);">3食以下の日</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);margin-top:4px;">' + fewAvg + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">平均チェック項目</div></div>';
    html += '<div style="flex:1;text-align:center;padding:12px;background:var(--warm-light);border-radius:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);">4食以上の日</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);margin-top:4px;">' + manyAvg + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">平均チェック項目</div></div>';
    html += '</div>';

    html += '<div style="font-size:12px;color:var(--ink);line-height:1.8;padding:10px;background:var(--warm-light);border-radius:10px;">';
    if (parseFloat(fewAvg) < parseFloat(manyAvg)) {
      html += '食事回数が少ない日の方が疾患チェックの項目数が <strong style="color:#8aab96;">少なく</strong> 安定しています。';
    } else if (parseFloat(fewAvg) > parseFloat(manyAvg)) {
      html += '食事回数が多い日の方が疾患チェックが <strong style="color:#8aab96;">安定</strong> しています。';
    } else {
      html += '食事回数と疾患チェックに明確な差は見られません。';
    }
    html += '</div></div>';
  }

  // ③ 食材キーワードと症状
  var keywords = [
    { word: '小麦', aliases: ['パン', 'パスタ', 'うどん', 'ラーメン', 'グルテン'] },
    { word: '乳製品', aliases: ['牛乳', 'チーズ', 'ヨーグルト', '乳'] },
    { word: '砂糖', aliases: ['甘い', 'クッキー', 'ケーキ', 'チョコ', 'お菓子', 'アイス'] },
    { word: 'カフェイン', aliases: ['コーヒー', '紅茶', 'カフェ'] },
    { word: 'アルコール', aliases: ['ビール', 'ワイン', '酒', 'サワー'] }
  ];

  var keywordResults = [];
  keywords.forEach(function(kw) {
    var withFood = [];
    var withoutFood = [];
    records.forEach(function(r) {
      var memo = (r.mealFree || '') + ' ' + (r.meals && r.meals.free ? r.meals.free : '');
      var hasKeyword = false;
      var allWords = [kw.word].concat(kw.aliases);
      allWords.forEach(function(w) { if (memo.indexOf(w) !== -1) hasKeyword = true; });
      var symptoms = (r.symptoms || []).length;
      var checks = r.diseaseCheck ? Object.values(r.diseaseCheck).filter(function(v) { return v !== 'なし' && v; }).length : 0;
      var total = symptoms + checks;
      if (hasKeyword) withFood.push(total);
      else withoutFood.push(total);
    });
    if (withFood.length >= 2 && withoutFood.length >= 2) {
      var withAvg = withFood.reduce(function(a, b) { return a + b; }, 0) / withFood.length;
      var withoutAvg = withoutFood.reduce(function(a, b) { return a + b; }, 0) / withoutFood.length;
      if (withAvg > withoutAvg + 0.3) {
        keywordResults.push({ word: kw.word, days: withFood.length, diff: (withAvg - withoutAvg).toFixed(1) });
      }
    }
  });

  if (keywordResults.length > 0) {
    html += '<div style="margin-bottom:20px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">🔍 注目の食材パターン</div>';
    keywordResults.forEach(function(kr) {
      html += '<div style="padding:10px;background:var(--warm-light);border-radius:10px;margin-bottom:8px;font-size:12px;color:var(--ink);line-height:1.8;">';
      html += '「<strong style="color:var(--rose);">' + kr.word + '</strong>」を含む日（' + kr.days + '日）は、不調の記録が平均 <strong style="color:var(--rose);">+' + kr.diff + '</strong> 項目多い傾向があります。';
      html += '</div>';
    });
    html += '</div>';
  }

  if (html === '') {
    html = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;line-height:1.8;">まだ十分なデータがありません。<br>記録を続けると食事と体調の関係が見えてきます。</div>';
  }

  container.innerHTML = html;
}



  function updateCycleSymptomCorrelation(){
  var container = document.getElementById('cycle-symptom-correlation');
  if(!container) return;

  if(!isPremium){
    container.innerHTML = '<div style="position:relative;overflow:hidden;border-radius:12px;">'
      +'<div style="filter:blur(6px);opacity:0.5;pointer-events:none;">'
      +'<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:10px;">📊 フェーズ別の不調出現率</div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">生理期間</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:72%;background:linear-gradient(90deg,#E88D9788,#E88D97);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">72%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">高温期</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:45%;background:linear-gradient(90deg,#c4878c88,#c4878c);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">45%</span></div>'
      +'<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:11px;color:var(--ink-light);width:65px;text-align:right;">排卵期</span><div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;"><div style="height:100%;width:28%;background:linear-gradient(90deg,#F4B86088,#F4B860);border-radius:10px;"></div></div><span style="font-size:11px;width:40px;text-align:right;">28%</span></div></div>'
      +'<div style="margin-top:12px;font-size:12px;font-weight:600;color:var(--ink);">🔍 フェーズ別の頻出症状</div>'
      +'<div style="margin-top:8px;padding:10px;background:var(--white);border-radius:10px;border-left:3px solid #E88D97;font-size:12px;">生理期間：頭痛・腰痛・倦怠感...</div>'
      +'</div>'
      +'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(250,246,242,0.4);border-radius:12px;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🔒</div>'
      +'<div style="font-size:13px;color:var(--ink);font-weight:500;margin-bottom:4px;">プレミアム機能</div>'
      +'<div style="font-size:11px;color:var(--ink-light);margin-bottom:12px;">周期ごとの症状パターンを分析します</div>'
      +'<button onclick="document.getElementById(\'premiumLockOverlay\').classList.add(\'active\')" style="padding:8px 24px;background:var(--rose);color:white;border:none;border-radius:20px;font-size:12px;font-family:Noto Sans JP,sans-serif;cursor:pointer;box-shadow:0 2px 8px rgba(255,107,107,0.3);">Premiumで解放</button>'
      +'</div></div>';
    return;
  }

  var records = state.records || [];
  var phases = {};

  records.forEach(function(r){
    var cycle = r.menstrualCycle;
    if(!cycle || cycle === 'なし' || cycle === 'none' || !cycle.trim()) return;
    var phase = displayPhases[cycle] || cycle;
    if(!phases[phase]) phases[phase] = { total:0, withSymptoms:0, symptoms:{} };
    phases[phase].total++;
    var syms = r.symptoms || [];
    if(syms.length > 0){
      phases[phase].withSymptoms++;
      syms.forEach(function(s){
        phases[phase].symptoms[s] = (phases[phase].symptoms[s]||0) + 1;
      });
    }
  });

  var phaseKeys = Object.keys(phases);

  if(phaseKeys.length === 0){
    container.innerHTML = '<div style="text-align:center;padding:24px 0;">'
      +'<div style="font-size:28px;margin-bottom:8px;">🌸</div>'
      +'<div style="font-size:13px;color:var(--ink-light);line-height:1.8;">生理周期の記録があると<br>フェーズごとの症状パターンが表示されます。</div>'
      +'<div style="font-size:12px;color:var(--ink-light);margin-top:10px;">記録画面の「生理の状態」で状態を選択してください。</div>'
      +'</div>';
    return;
  }

  var html = '';

  // ① フェーズ別の症状出現率
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px;">📊 フェーズ別の不調出現率</div>';
  var phaseColors = {'生理期間':'#E88D97','排卵期':'#F4B860','高温期':'#c4878c','低温期':'#7FC8A9','不正出血':'#C4A7D7'};
  var maxRate = 0;
  phaseKeys.forEach(function(p){ var rate = phases[p].total > 0 ? phases[p].withSymptoms / phases[p].total * 100 : 0; if(rate > maxRate) maxRate = rate; });
  if(maxRate === 0) maxRate = 1;

  phaseKeys.forEach(function(p){
    var d = phases[p];
    var rate = d.total > 0 ? Math.round(d.withSymptoms / d.total * 100) : 0;
    var color = phaseColors[p] || '#b8a9d4';
    html += '<div style="margin-bottom:8px;display:flex;align-items:center;gap:8px;">';
    html += '<span style="font-size:11px;color:var(--ink-light);width:65px;flex-shrink:0;text-align:right;">'+p+'</span>';
    html += '<div style="flex:1;height:20px;background:#f0ebe6;border-radius:10px;overflow:hidden;">';
    html += '<div style="height:100%;width:'+(rate/maxRate*100)+'%;background:linear-gradient(90deg,'+color+'88,'+color+');border-radius:10px;transition:width 0.5s;"></div></div>';
    html += '<span style="font-size:11px;color:var(--ink);font-weight:500;width:40px;text-align:right;">'+rate+'%</span>';
    html += '<span style="font-size:10px;color:var(--ink-light);width:30px;">('+d.total+'日)</span>';
    html += '</div>';
  });
  html += '</div>';

  // ② フェーズ別の頻出症状
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:12px;">🔍 フェーズ別の頻出症状</div>';
  phaseKeys.forEach(function(p){
    var d = phases[p];
    var sorted = Object.entries(d.symptoms).sort(function(a,b){ return b[1]-a[1]; });
    if(sorted.length === 0) return;
    var color = phaseColors[p] || '#b8a9d4';
    html += '<div style="margin-bottom:12px;padding:12px;background:var(--white);border-radius:12px;border-left:3px solid '+color+';">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:8px;">'+p+'</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    sorted.slice(0,5).forEach(function(entry){
      html += '<span style="font-size:11px;padding:4px 10px;border-radius:12px;background:'+color+'20;color:'+color.replace('88','')+';">'+entry[0]+' ('+entry[1]+'日)</span>';
    });
    html += '</div></div>';
  });
  html += '</div>';

  // ③ パターンコメント
  html += '<div style="padding:12px;background:var(--warm-light);border-radius:12px;font-size:12px;color:var(--ink);line-height:1.8;">';
  var mostSymptomPhase = phaseKeys.reduce(function(best, p){
    var rate = phases[p].total > 0 ? phases[p].withSymptoms / phases[p].total : 0;
    if(!best || rate > best.rate) return {phase:p, rate:rate};
    return best;
  }, null);

  if(mostSymptomPhase && mostSymptomPhase.rate > 0){
    html += '「<strong style="color:var(--rose);">'+mostSymptomPhase.phase+'</strong>」に不調の記録が最も集中しています（'+Math.round(mostSymptomPhase.rate*100)+'%）。';
    var topSym = Object.entries(phases[mostSymptomPhase.phase].symptoms).sort(function(a,b){return b[1]-a[1];})[0];
    if(topSym){
      html += 'この時期は特に「<strong style="color:var(--rose);">'+topSym[0]+'</strong>」に注意してみましょう。';
    }
  } else {
    html += '記録を続けると、周期ごとの症状パターンが見えてきます。';
  }
  html += '</div>';

  container.innerHTML = html;
}



// ===== オンボーディング管理 =====
var _obStep = 0;
var _obTotalSteps = 8;
var _obPeriodSelected = null;
var _obCycleSelected = null;
var _obDiseasesSelected = [];
var _obPurposeSelected = null;
var _obReminderSelected = null;

function obInit() {
  // インジケーター生成
  var indicator = document.getElementById('ob-indicator');
  if (indicator) {
    indicator.innerHTML = '';
    for (var i = 1; i <= 7; i++) {
      var dot = document.createElement('div');
      dot.className = 'ob-dot';
      dot.id = 'ob-dot-' + i;
      indicator.appendChild(dot);
    }
  }
  // 生年セレクトボックス生成
  var sel = document.getElementById('ob-birth-year');
  if (sel) {
    var currentYear = new Date().getFullYear();
    for (var y = currentYear - 10; y >= 1955; y--) {
      var opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    }
  }
  // 周期チップ生成
  var cycleChips = document.getElementById('ob-cycle-chips');
  if (cycleChips) {
    var cycles = ['21日', '24日', '25日', '28日', '30日', '32日', '35日以上', '不規則'];
    cycles.forEach(function(c) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip-inline';
      btn.textContent = c;
      btn.onclick = function() {
        cycleChips.querySelectorAll('.ob-chip-inline').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        _obCycleSelected = c;
      };
      cycleChips.appendChild(btn);
    });
  }
  // PR-2: 既存の myDiseases を _obDiseasesSelected に preload
  // オンボーディング再表示時に空配列で上書きされるのを防ぐ
  _obDiseasesSelected = (state.myDiseases || []).slice();

  // 疾患リスト生成
  var diseaseList = document.getElementById('ob-disease-list-new');
  if (diseaseList) {
    var categories = {
      '婦人科疾患':       ['卵巣嚢腫', '子宮内膜症', '子宮筋腫', '子宮腺筋症'],
      'ホルモン・周期':   ['PCOS', 'PMS/PMDD', '更年期障害', '不妊症・排卵障害'],
      '骨盤・その他':     ['骨盤臓器脱', '外陰痛症候群', '慢性骨盤痛']
    };
    var html = '';
    Object.keys(categories).forEach(function(cat) {
      html += '<div style="font-size:10px;letter-spacing:0.12em;color:var(--ink-light);'
        + 'margin:14px 0 7px;text-transform:uppercase;">' + cat + '</div>';
      categories[cat].forEach(function(d) {
        var cfg = DISEASE_CONFIG[d];
        if (!cfg) return;
        // PR-2: 保存済み疾患は選択済み状態で描画
        var preSelected = _obDiseasesSelected.indexOf(d) !== -1;
        html += '<div class="ob-chip' + (preSelected ? ' selected' : '') + '" data-ob-disease="' + d.replace(/"/g, '&quot;') + '" '
          + 'data-selected="' + (preSelected ? '1' : '0') + '" '
          + 'style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
        html += '<div>';
        html += '<div style="font-size:13px;font-weight:500;color:var(--ink);">' + d + '</div>';
        html += '<div style="font-size:10px;color:var(--ink-light);margin-top:2px;">'
          + cfg.questions.length + '項目のセルフチェック対応</div>';
        html += '</div>';
        var checkStyle = preSelected
          ? 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--rose);background:var(--rose);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;transition:all 0.2s;'
          : 'width:20px;height:20px;border-radius:50%;border:1.5px solid #e8ddd8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent;transition:all 0.2s;';
        html += '<div class="ob-check-mark" style="' + checkStyle + '">✓</div>';
        html += '</div>';
      });
    });
    diseaseList.innerHTML = html;
  }
  // 目的チップ生成
  var purposeChips = document.getElementById('ob-purpose-chips');
  if (purposeChips) {
    var purposes = [
      { v: 'clinic',  label: '診察前の記録を残したい',     sub: '医師に伝えやすい形でデータを整理します' },
      { v: 'daily',   label: '毎日の体調を管理したい',     sub: 'からだのパターンを発見するサポートをします' },
      { v: 'both',    label: '両方使いたい',               sub: '記録と診察サポートの両方に対応します' },
      { v: 'unknown', label: 'まだわからない',             sub: 'あとで設定から変更できます' }
    ];
    purposes.forEach(function(p) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip';
      btn.innerHTML = '<div style="font-weight:500;">' + p.label + '</div>'
        + '<div style="font-size:11px;color:var(--ink-light);margin-top:3px;">' + p.sub + '</div>';
      btn.onclick = function() {
        purposeChips.querySelectorAll('.ob-chip').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        _obPurposeSelected = p.v;
      };
      purposeChips.appendChild(btn);
    });
  }
  // リマインダーチップ生成
  var reminderChips = document.getElementById('ob-reminder-chips');
  if (reminderChips) {
    var reminders = [
      { v: '08:00', label: '朝 8:00 に通知',    sub: '記録を朝の習慣にする' },
      { v: '12:00', label: '昼 12:00 に通知',   sub: '昼休みに記録する' },
      { v: '21:00', label: '夜 21:00 に通知',   sub: '就寝前に今日を振り返る' },
      { v: 'none',  label: 'リマインダーは不要', sub: 'あとで設定から変更できます' }
    ];
    reminders.forEach(function(r) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip';
      btn.innerHTML = '<div style="font-weight:500;">' + r.label + '</div>'
        + '<div style="font-size:11px;color:var(--ink-light);margin-top:3px;">' + r.sub + '</div>';
      btn.onclick = function() {
        reminderChips.querySelectorAll('.ob-chip').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        _obReminderSelected = r.v;
      };
      reminderChips.appendChild(btn);
    });
  }
  // 生理日カレンダー生成
  obBuildPeriodCalendar();
}

function obBuildPeriodCalendar() {
  var container = document.getElementById('ob-period-calendar');
  if (!container) return;
  var now = new Date();
  var months = [
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
    new Date(now.getFullYear(), now.getMonth(), 1)
  ];
  var html = '';
  months.forEach(function(firstDay) {
    var year  = firstDay.getFullYear();
    var month = firstDay.getMonth();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var startDow = firstDay.getDay();
    var monthLabel = (month + 1) + '月';
    html += '<div style="margin-bottom:12px;">';
    html += '<div style="font-size:11px;font-weight:500;color:var(--ink-light);text-align:center;margin-bottom:6px;">'
      + year + '年 ' + monthLabel + '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;'
      + 'text-align:center;font-size:10px;color:var(--ink-light);margin-bottom:4px;">';
    ['日','月','火','水','木','金','土'].forEach(function(d) {
      html += '<div>' + d + '</div>';
    });
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';
    for (var i = 0; i < startDow; i++) html += '<div></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
      var todayStr = now.toISOString().slice(0, 10);
      var isFuture = dateStr > todayStr;
      var isSelected = _obPeriodSelected === dateStr;
      html += '<div data-ob-date="' + dateStr + '" ' + (isFuture ? 'data-ob-date-future="1" ' : '')
        + 'id="ob-cal-' + dateStr + '" '
        + 'style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;'
        + 'font-size:11px;cursor:' + (isFuture ? 'default' : 'pointer') + ';'
        + 'transition:all 0.15s;'
        + (isFuture ? 'color:#e0d0c8;' : isSelected ? 'background:var(--rose);color:white;font-weight:500;' : dateStr === todayStr ? 'border:1.5px solid var(--rose);color:var(--rose);' : 'color:var(--ink);')
        + '">' + day + '</div>';
    }
    html += '</div></div>';
  });
  container.innerHTML = html;
}

function obSelectPeriodDay(dateStr) {
  _obPeriodSelected = dateStr;
  document.querySelectorAll('[id^="ob-cal-"]').forEach(function(el) {
    var d = el.id.replace('ob-cal-', '');
    var now = new Date().toISOString().slice(0, 10);
    el.style.background = '';
    el.style.color = d === now ? 'var(--rose)' : 'var(--ink)';
    el.style.fontWeight = '';
    if (d === now) el.style.border = '1.5px solid var(--rose)';
    else el.style.border = '';
  });
  var sel = document.getElementById('ob-cal-' + dateStr);
  if (sel) {
    sel.style.background = 'var(--rose)';
    sel.style.color = 'white';
    sel.style.fontWeight = '500';
    sel.style.border = '';
  }
  var disp = document.getElementById('ob-period-selected');
  if (disp) {
    var d = new Date(dateStr + 'T00:00:00');
    disp.textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日を選択中';
  }
}

function obToggleDisease(el, disease) {
  var isSelected = el.getAttribute('data-selected') === '1';
  if (isSelected) {
    el.setAttribute('data-selected', '0');
    el.classList.remove('selected');
    el.querySelector('.ob-check-mark').style.cssText =
      'width:20px;height:20px;border-radius:50%;border:1.5px solid #e8ddd8;'
      + 'flex-shrink:0;display:flex;align-items:center;justify-content:center;'
      + 'font-size:11px;color:transparent;transition:all 0.2s;';
    _obDiseasesSelected = _obDiseasesSelected.filter(function(d) { return d !== disease; });
  } else {
    el.setAttribute('data-selected', '1');
    el.classList.add('selected');
    el.querySelector('.ob-check-mark').style.cssText =
      'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--rose);'
      + 'background:var(--rose);flex-shrink:0;display:flex;align-items:center;'
      + 'justify-content:center;font-size:11px;color:white;transition:all 0.2s;';
    if (_obDiseasesSelected.indexOf(disease) === -1) _obDiseasesSelected.push(disease);
  }
}

function obShowStep(n) {
  for (var i = 0; i <= 8; i++) {
    var el = document.getElementById('ob-step-' + i);
    if (el) el.style.display = 'none';
  }
  var target = document.getElementById('ob-step-' + n);
  if (target) target.style.display = 'block';
  var indicator = document.getElementById('ob-indicator');
  if (n >= 1 && n <= 7) {
    if (indicator) indicator.style.display = 'flex';
    for (var i = 1; i <= 7; i++) {
      var dot = document.getElementById('ob-dot-' + i);
      if (dot) dot.className = 'ob-dot' + (i <= n ? ' active' : '');
    }
  } else {
    if (indicator) indicator.style.display = 'none';
  }
  _obStep = n;
  window.scrollTo(0, 0);
}

function obNext() {
  obShowStep(_obStep + 1);
}

function obSkipAll() {
  completeOnboarding();
}

function obSaveName() {
  var val = (document.getElementById('ob-name-input').value || '').trim();
  if (val) state.name = val;
  var disp = document.getElementById('ob-name-display');
  if (disp) disp.textContent = val || 'あなた';
  obNext();
}

function obSaveBirth() {
  var val = document.getElementById('ob-birth-year').value;
  if (val) state.birthYear = parseInt(val);
  obNext();
}

function obSavePeriod() {
  if (_obPeriodSelected) {
    state.lastPeriodDate = _obPeriodSelected;
  }
  obNext();
}

function obSaveCycle() {
  if (_obCycleSelected) {
    var num = parseInt(_obCycleSelected);
    state.cycleLength = isNaN(num) ? 28 : num;
    state.cycleIrregular = _obCycleSelected === '不規則';
  }
  obNext();
}

function obSaveDiseases() {
  state.myDiseases = _obDiseasesSelected.slice();
  var display = document.getElementById('disease-setting-display');
  if (display) {
    display.textContent = state.myDiseases.length > 0
      ? state.myDiseases.join('・') : '設定する';
  }
  saveState(); // Fix: オンボーディング疾患選択をリロード前に永続化
  obNext();
}

function obSavePurpose() {
  if (_obPurposeSelected) state.purpose = _obPurposeSelected;
  obNext();
}

function obSaveReminder() {
  if (_obReminderSelected && _obReminderSelected !== 'none') {
    state.reminderTime = _obReminderSelected;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
  obComplete();
}

function obComplete() {
  if (state.lastPeriodDate && state.cycleLength) {
    var summary = document.getElementById('ob-cycle-summary');
    var phaseEl = document.getElementById('ob-cycle-phase');
    var nextEl  = document.getElementById('ob-cycle-next');
    if (summary && phaseEl && nextEl) {
      var today  = new Date();
      var last   = new Date(state.lastPeriodDate + 'T00:00:00');
      var dayNum = Math.floor((today - last) / 86400000) + 1;
      var phase  = typeof getCurrentCyclePhase === 'function' ? getCurrentCyclePhase() : null;
      phaseEl.textContent = '周期 ' + dayNum + '日目' + (phase ? '（' + phase + '）' : '');
      var daysLeft = state.cycleLength - dayNum;
      nextEl.textContent = daysLeft > 0
        ? '次の生理まで約 ' + daysLeft + ' 日'
        : '生理が近い時期です';
      summary.style.display = 'block';
    }
  }
  obShowStep(8);
}

function completeOnboarding() {
  state._onboardingDone = true;
  saveState();
  finishOnboarding();
}

function finishOnboarding() {
  document.getElementById('screen-welcome').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  updateGreeting();
  updateStats();
  updateUnlock();
  updateHistory();
  buildCalendar();
  updateSettingsHero();
  buildHomeWeekRow();
  updateHomeInsightCard();
  updateHomeNumbers();
  updateHomeDiseaseAdvice();
  updateHomeCTAState();
  if (typeof updateHomePhaseBanner === 'function') updateHomePhaseBanner();
  if (typeof updateTodayMessage === 'function') updateTodayMessage();

  // バグ18: ホームバナー非表示フラグを復元
  try {
    if (localStorage.getItem('ippo_hide_add_home') === '1') {
      var banner = document.getElementById('add-home-banner');
      if (banner) banner.style.display = 'none';
    }
  } catch(e) {}

  initReminders();

  // 疾患選択に基づいて記録画面セクションの順序を調整
  reorderRecordSections();
}
function reorderRecordSections() {
  var diseases = state.myDiseases || [];
  if (diseases.length === 0) return;

  // 疾患カテゴリに基づく優先セクションID
  var prioritySections = [];

  var hasUterine = diseases.some(function(d) {
    return ['子宮内膜症', '子宮筋腫', '子宮腺筋症'].indexOf(d) !== -1;
  });
  var hasOvarian = diseases.some(function(d) {
    return ['卵巣嚢腫', 'PCOS'].indexOf(d) !== -1;
  });
  var hasHormonal = diseases.some(function(d) {
    return ['PMS/PMDD', '更年期障害', '不妊症・排卵障害'].indexOf(d) !== -1;
  });
  var hasPelvic = diseases.some(function(d) {
    return ['骨盤臓器脱', '慢性骨盤痛'].indexOf(d) !== -1;
  });

  // 疾患チェックセクションを常に上位に移動
  var diseaseQ = document.getElementById('disease-questions');
  if (diseaseQ && diseaseQ.parentNode) {
    var recordScreen = diseaseQ.closest('.screen') || diseaseQ.parentNode;
    var symptomsSection = document.getElementById('rs-symptoms');
    if (symptomsSection) {
      var symptomsCard = symptomsSection.closest('.section-card');
      if (symptomsCard && symptomsCard.parentNode) {
        symptomsCard.parentNode.insertBefore(diseaseQ, symptomsCard.nextSibling);
      }
    }
  }

  // 更年期障害選択時：睡眠セクションにハイライトを追加
  if (hasHormonal && diseases.indexOf('更年期障害') !== -1) {
    var sleepSection = document.getElementById('rs-sleep-bed');
    if (sleepSection) {
      var sleepCard = sleepSection.closest('.section-card');
      if (sleepCard) {
        sleepCard.style.borderLeft = '3px solid var(--rose)';
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint.textContent = '💡 更年期障害では睡眠の質の記録が重要です';
        sleepCard.appendChild(hint);
      }
    }
  }

  // 子宮系疾患選択時：痛み記録にハイライト
  if (hasUterine) {
    var painSection = document.querySelector('[data-section="pain"]') || document.getElementById('rs-pain-level');
    if (painSection) {
      var painCard = painSection.closest('.section-card');
      if (painCard) {
        painCard.style.borderLeft = '3px solid var(--rose)';
        var hint2 = document.createElement('div');
        hint2.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint2.textContent = '💡 痛みの記録が症状の変化の把握に役立ちます';
        painCard.appendChild(hint2);
      }
    }
  }

  // PCOS選択時：生活ファクターにハイライト
  if (hasOvarian && diseases.indexOf('PCOS') !== -1) {
    var factorsSection = document.getElementById('rs-factors');
    if (factorsSection) {
      var factorsCard = factorsSection.closest('.section-card');
      if (factorsCard) {
        factorsCard.style.borderLeft = '3px solid var(--rose)';
        var hint3 = document.createElement('div');
        hint3.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint3.textContent = '💡 食事・運動の記録がPCOS管理に重要です';
        factorsCard.appendChild(hint3);
      }
    }
  }

  // 骨盤系選択時：排便にハイライト
  if (hasPelvic) {
    var bowelSection = document.getElementById('rs-bowel');
    if (bowelSection) {
      var bowelCard = bowelSection.closest('.section-card');
      if (bowelCard) {
        bowelCard.style.borderLeft = '3px solid var(--rose)';
        var hint4 = document.createElement('div');
        hint4.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint4.textContent = '💡 骨盤臓器脱では排便の記録が参考になります';
        bowelCard.appendChild(hint4);
      }
    }
  }

  // 疾患チェックセクションを自動表示
  updateDiseaseQuestions();
}

// Phase E (Step 3): home-renderer.js へ移植済み。
// window.showMain は main.js ロード後にモジュール版で上書きされる。
// ippo:vite-ready 以前の fallback として最小実装を残す。
function showMain() {
  document.getElementById('screen-welcome').style.display = 'none';
  document.getElementById('main-app').style.display = 'block';
  if (typeof updateGreeting === 'function') updateGreeting();
  if (typeof updateStats === 'function') updateStats();
  if (typeof buildCalendar === 'function') buildCalendar();
}

// ===== DATE/GREETING =====
function updateDate() {
  const now = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  const date = `${now.getMonth() + 1}月${now.getDate()}日（${days[now.getDay()]}）`;
  const el = document.getElementById('today-date');
  if (el) el.textContent = date;
}

function getGreetingText() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 10) return 'おはようございます';
  if (hour >= 10 && hour < 17) return 'こんにちは';
  if (hour >= 17 && hour < 21) return 'こんばんは';
  return 'おつかれさまです';
}

function updateGreeting() {
  const greeting = getGreetingText();
  const el = document.getElementById('greeting-text');
  if (el) el.textContent = greeting;
  const nameEl = document.getElementById('greeting-name');
  if (nameEl) nameEl.textContent = (state.name || 'あなた') + 'さん';
  // 連続記録バッジ更新
  const badgeCount = document.getElementById('streak-badge-count');
  if (badgeCount) {
    var streak = 0;
    var d = new Date();
    while(true){
      var ds = d.toDateString();
      var found = false;
      for(var i=0; i<state.records.length; i++){
        if(new Date(state.records[i].date).toDateString() === ds){ found = true; break; }
      }
      if(!found) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    badgeCount.textContent = streak;
  }
  updateDate();
}

// ===== STATS =====
function updateStats() {
  var streakEl = document.getElementById('streak-count');
  if (streakEl) streakEl.textContent = state.streak || 0;
  var totalEl = document.getElementById('total-count');
  if (totalEl) totalEl.textContent = state.totalDays || 0;
  var itEl = document.getElementById('insight-total');
  if (itEl) itEl.textContent = state.totalDays || 0;
  var isEl = document.getElementById('insight-streak');
  if (isEl) isEl.textContent = state.streak || 0;
  // 空状態バナー
  var emptyEl = document.getElementById('insights-empty-state');
  if(emptyEl) emptyEl.style.display = (state.records.length === 0) ? 'block' : 'none';

  // 今月の無痛み日数
  calcPainFreeDays();
  var pfDays = calcPainFreeDaysThisMonth();
  var pfEl = document.getElementById('pain-free-days');
  if (pfEl) pfEl.textContent = pfDays > 0 ? pfDays : '—';

  // 今月の平均痛みスコア
  var avgPain = calcAvgPainThisMonth();
  var apEl = document.getElementById('avg-pain-score');
  if (apEl) apEl.textContent = avgPain !== null ? avgPain : '—';
}

// 今月の無痛み日数を計算して表示
function calcPainFreeDays() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('calcPainFreeDays', calcPainFreeDays);
    return;
  }
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (state.records || []).forEach(function(r) {
    var recordDate = r.record_date || r.date;
    if (!recordDate) return;
    var d = new Date(recordDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      var pain = r.painLevel;
      if (pain === null || pain === undefined || pain === 0) count++;
    }
  });
  var el = document.getElementById('pain-free-count');
  if (el) el.textContent = count > 0 ? count : '—';
}

// 今月の無痛み日数を返す（stats-grid用）
function calcPainFreeDaysThisMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var count = 0;
  (state.records || []).forEach(function(r) {
    var d = new Date(r.date || r.record_date || '');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    var pain = r.painLevel;
    if (pain === null || pain === undefined || pain === 0) count++;
  });
  return count;
}

// 今月の平均痛みスコアを返す（stats-grid用）
function calcAvgPainThisMonth() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth();
  var total = 0;
  var count = 0;
  (state.records || []).forEach(function(r) {
    var d = new Date(r.date || r.record_date || '');
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    if (r.painLevel !== null && r.painLevel !== undefined && r.painLevel > 0) {
      total += r.painLevel;
      count++;
    }
  });
  if (count === 0) return null;
  return Math.round(total / count * 10) / 10;
}

function updateHistory(){
  // 最近の記録セクション削除済み
}

// ===== 疾患別症状チップ優先表示 =====
function buildSymptomChips() {
  var prioritized = [];
  var diseases = state.myDiseases || [];

  // 疾患別症状を優先的に追加
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (prioritized.indexOf(s) === -1) prioritized.push(s);
    });
  });

  // ユーザー設定の症状を次に追加
  var userSymptoms = state.selectedSymptoms || [];
  userSymptoms.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });

  // デフォルト症状をフォールバックとして追加
  var defaults = ['下腹部痛','腰痛','頭痛','骨盤周りの痛み','だるさ','不正出血','吐き気','むくみ','気分の落ち込み','イライラ'];
  defaults.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });

  return prioritized;
}

function applySymptomChipPriority() {
  var prioritized = buildSymptomChips();
  var container = document.getElementById('rs-symptoms');
  if (!container) return;
  // 疾患優先症状に一致するチップを先頭に移動
  prioritized.forEach(function(sym) {
    var chip = Array.prototype.find.call(container.querySelectorAll('.chip'), function(c) {
      return c.textContent === sym;
    });
    if (chip) container.insertBefore(chip, container.firstChild);
  });
}

function updateUnlock(){
  var days = state.totalDays || 0;
  var milestones = [
    {day:3, icon:'📊', title:'グラフ機能', sub:'体温・症状の推移を可視化'},
    {day:7, icon:'🔍', title:'パターン分析', sub:'週間のからだの傾向'},
    {day:14, icon:'🌡️', title:'体温フェーズ判定', sub:'低温期・高温期の自動判定'},
    {day:30, icon:'🤖', title:'AIパターン解析', sub:'あなた専用の分析レポート'}
  ];
  var el = document.getElementById('unlock-section');
  if(!el) return;
  var html = '<div class="unlock-header"><div class="unlock-title">記録で解放される機能</div><div class="unlock-days">'+days+'日目</div></div>';
  html += '<div class="unlock-items">';
  milestones.forEach(function(m){
    var unlocked = days >= m.day;
    html += '<div class="unlock-item">';
    html += '<div class="unlock-icon '+(unlocked?'unlocked':'locked')+'">'+m.icon+'</div>';
    html += '<div class="unlock-text"><div class="unlock-text-title">'+m.title+'</div><div class="unlock-text-sub">'+m.sub+'</div></div>';
    html += '<div class="unlock-badge '+(unlocked?'unlocked':'locked')+'">'+(unlocked?'解放済':'あと'+(m.day-days)+'日')+'</div>';
    html += '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}


// ===== FASTING TIMER — CYCLE-AWARE HELPERS =====

var FAST_PHASE_CONFIG = {
  '月経期': {
    icon: '🔴',
    rec: '12〜13h',
    goalMin: 12, goalMax: 13,
    tip: '月経中は無理をせず。鉄分が失われる時期なので短めが安心です。',
    safeMax: 14,
    bedRisk: false
  },
  '卵胞期': {
    icon: '🌱',
    rec: '14〜16h',
    goalMin: 14, goalMax: 16,
    tip: 'エストロゲンが上昇し代謝が活発に。断食に取り組みやすい時期です。',
    safeMax: 18,
    bedRisk: false
  },
  '排卵期': {
    icon: '🥚',
    rec: '14〜16h',
    goalMin: 14, goalMax: 16,
    tip: 'エネルギー需要が高まる時期。16h以内を目安にしましょう。',
    safeMax: 16,
    bedRisk: false
  },
  '黄体期': {
    icon: '🌙',
    rec: '12〜14h',
    goalMin: 12, goalMax: 14,
    // 研究根拠: 黄体期はエストロゲン低下・プロゲステロン上昇により Hedonic Hunger（糖質・高カロリー食への渇望）が増大
    tip: '今は食欲が増しやすいホルモン状態です。糖質・甘いものへの渇望を感じても、それはあなたの意志の問題ではなくホルモンの働きです。',
    safeMax: 14,
    bedRisk: true  // Hedonic Hunger リスク高
  },
  '黄体期後期': {
    icon: '🌑',
    rec: '12〜13h',
    goalMin: 12, goalMax: 13,
    // 研究根拠: PMDD患者では黄体期に卵胞期比で有意にカロリー摂取増加・過食エピソード増加
    tip: 'PMS/PMDDの影響で食欲コントロールが難しくなる時期です。過食衝動を感じても自分を責めないで。12hの軽めなファスティングがベストです。',
    safeMax: 13,
    bedRisk: true  // PMS/PMDD 過食エピソードリスク最大
  }
};

// 疾患別推奨値オーバーライド（研究エビデンスに基づく）
var FAST_DISEASE_OVERRIDE = {
  // PCOS: インスリン抵抗性改善が治療の鍵（16hファスティングのエビデンスあり）
  // ただしBEDリスクOR 1.53（2024メタアナリシス N=287,000）に注意
  'PCOS': {
    rec: '14〜16h（インスリン感受性向上）',
    goalMin: 14, goalMax: 16,
    bedRisk: true,
    bedNote: 'PCOSは過食性障害のリスクが約1.5倍高いというデータがあります。食欲の波は意志の問題ではなくインスリン・アンドロゲンの影響です。'
  },
  // 更年期: ペリメノポーズ期のBED有病率3.6%（閉経前0.5%の7倍）
  '更年期障害': {
    rec: '13〜15h（代謝サポート）',
    goalMin: 13, goalMax: 15,
    bedRisk: true,
    bedNote: '更年期移行期はホルモン変動により食欲が不安定になりやすい時期です。無理な断食より、規則正しい食事リズムを優先しましょう。'
  },
  // PMS/PMDDは黄体期と重複するが疾患として選択している場合は明示
  'PMS/PMDD': {
    rec: '12〜14h（黄体期に合わせた柔軟な設定）',
    goalMin: 12, goalMax: 14,
    bedRisk: true,
    bedNote: '黄体期には糖質・高カロリー食への渇望（Hedonic Hunger）が増大します。過食衝動は病気の症状であり、あなたのせいではありません。'
  },
  // 子宮内膜症: 抗炎症ファスティングに有効性あり
  // ただし摂食障害リスクOR 2.94（遺伝的相関rg=0.61, 2026年最新レビュー）に注意
  // 慢性疼痛による感情的過食・エンドベリーによるボディイメージ低下が引き金
  '子宮内膜症': {
    rec: '14〜16h（抗炎症・ケトーシス効果）',
    goalMin: 14, goalMax: 16,
    bedRisk: true,
    bedNote: '子宮内膜症のある方は摂食障害のリスクが約3倍高いという最新研究があります。慢性的な痛みやお腹の張り（エンドベリー）が感情的な過食の引き金になりやすいのは自然な反応です。'
  },
  // 子宮筋腫: 過食→肥満→エストロゲン過剰→筋腫増大の悪循環を断つ
  // 体重管理が治療の鍵だが、過度な制限はリバウンドリスクあり
  '子宮筋腫': {
    rec: '12〜14h（体重・エストロゲン管理）',
    goalMin: 12, goalMax: 14,
    bedRisk: true,
    bedNote: '過食→体重増加→脂肪組織でのエストロゲン産生増加→筋腫の成長促進という悪循環が研究で示されています。無理な制限よりも、安定したリズムが大切です。'
  },
  // 子宮腺筋症: 子宮内膜症に準じた抗炎症アプローチ
  '子宮腺筋症': {
    rec: '14〜16h（抗炎症サポート）',
    goalMin: 14, goalMax: 16,
    bedRisk: true,
    bedNote: '慢性的な痛みやストレスが感情的過食につながりやすい傾向があります。断食より、まず痛みの管理を優先してください。'
  },
  // 卵巣嚢腫: オートファジー活性化・酸化ストレス軽減・HPO軸修復
  // [根拠] Yin et al. 2018: 30%カロリー制限でマウスの子宮内膜症性嚢腫が最大93%縮小（オートファジー促進・VEGF抑制）
  // [根拠] Ryu et al. 2023 (Scientific Reports): 20h断食TRFでPCOS性嚢胞が正常形態に回復、テストステロン・LH正常化
  '卵巣嚢腫': {
    rec: '13〜15h（オートファジー促進・酸化ストレス軽減）',
    goalMin: 13, goalMax: 15,
    bedRisk: false,
    bedNote: '食事リズムを整えることで、インスリンバランスとホルモン環境を安定させるサポートができます。規則的な断食パターンと卵巣の健康との関連は動物実験で研究されており、オートファジー（細胞の自食作用）の活性化や酸化ストレスの軽減が注目されています。※本アプリはセルフケアのサポートを目的としており、医療行為ではありません。'
  }
};

// 過食衝動サポート: フェーズ・疾患別の検証メッセージと対処法
var BINGE_URGE_SUPPORT = {
  '黄体期': {
    validation: 'その食欲は本物のホルモン反応です',
    science: 'エストロゲンが低下し、プロゲステロンが上昇する黄体期には、脳が糖質・高カロリー食を強く求めます（Hedonic Hunger）。これは意志が弱いのではなく、からだのメカニズムです。',
    color: '#7ba3c4'
  },
  '黄体期後期': {
    validation: 'この衝動はPMSの症状のひとつです',
    science: '月経前（黄体期後半）は食欲コントロールが最も難しい時期です。研究では黄体期に過食エピソードが有意に増加することが確認されています。あなたは正常な反応を経験しています。',
    color: '#9b89b4'
  },
  'PCOS': {
    validation: 'インスリン・アンドロゲンが食欲をコントロールしています',
    science: 'PCOSのある方は過食性障害のリスクが約1.5倍高いことが大規模研究で示されています。これはインスリン抵抗性・アンドロゲン過剰・体重スティグマが複合的に影響しています。',
    color: '#6b9e78'
  },
  '更年期障害': {
    validation: 'ホルモンの急激な変動が食欲を乱しています',
    science: '更年期移行期（ペリメノポーズ）は過食性障害の有病率が閉経前の7倍以上になる時期です。あなたの食欲の波には明確な生物学的根拠があります。',
    color: '#d4a574'
  },
  'PMS/PMDD': {
    validation: 'PMDDの症状として、食欲コントロールの困難は認められています',
    science: '黄体期には糖質・高カロリー食への渇望が増大し、PMDDの方では過食エピソードが顕著に多くなります。治療が必要な状態のサインかもしれません。',
    color: '#c4878c'
  },
  // 子宮内膜症: 2026年最新ナラティブレビュー（Archives of Gynecology and Obstetrics）
  // 遺伝的相関 rg=0.61, OR 2.94 — 慢性疼痛・エンドベリーが主要引き金
  '子宮内膜症': {
    validation: '慢性的な痛みが「食べること」で和らぐのは、脳の正常な反応です',
    science: '2026年の最新研究により、子宮内膜症のある方は摂食障害を発症するリスクが約3倍（OR 2.94）高く、遺伝的な関連も確認されています。お腹の張り（エンドベリー）によるボディイメージの悩みが、過食衝動の引き金になることも多いです。これはあなたの意志の問題ではありません。',
    color: '#c4878c'
  },
  // 子宮筋腫: 過食→肥満→エストロゲン→筋腫増大の悪循環
  '子宮筋腫': {
    validation: 'その食欲は、からだがエネルギーを求めているサインです',
    science: '子宮筋腫のある方では、過食→体重増加→脂肪組織でのエストロゲン産生→筋腫の成長促進という悪循環が研究で確認されています。ただし、この知識を自分を責めるために使わないでください。ゆっくりとした変化が身体にとって最も安全です。',
    color: '#b07ba0'
  },
  // 子宮腺筋症: 慢性疼痛 + 子宮内膜症に準じた過食リスク
  '子宮腺筋症': {
    validation: '慢性的な痛みを抱えているとき、食べることで楽になろうとするのは自然です',
    science: '子宮腺筋症による慢性疼痛は、感情的過食の主要なリスク因子です。痛みがひどい日は断食を無理に続けず、体の声を優先してください。',
    color: '#9b89b4'
  },
  // 卵巣嚢腫: 慢性的な下腹部痛・腹部膨満感による感情的過食への配慮
  '卵巣嚢腫': {
    validation: 'お腹の不快感があるとき、食べることで気を紛らわそうとするのは自然な反応です',
    science: '卵巣嚢腫による慢性的な下腹部痛や腹部膨満感は、感情的過食の引き金になることがあります。規則的な食事リズムはインスリンバランスとホルモン環境を整えるサポートになると考えられています。痛みが強い日は断食を無理に続けず、まず体を休めることを優先してください。',
    color: '#7a9eb0'
  },
  'default': {
    validation: '食欲の波は自然なことです',
    science: 'ホルモンの変動、ストレス、睡眠不足など、さまざまな要因が食欲に影響します。今この瞬間の感覚に気づいていることが、最初の一歩です。',
    color: '#a89080'
  }
};

// 回復食データ（フェーズ別 + PCOSは低GI優先）
var FAST_RECOVERY_FOODS = {
  '月経期':    { color: '#c4878c', icon: '🩸', foods: [['ほうれん草・小松菜','鉄分補給'],['豆腐・納豆','植物性タンパク質'],['あさり・しじみ','ヘム鉄'],['ビタミンCを一緒に','鉄の吸収アップ']] },
  '卵胞期':    { color: '#6b9e78', icon: '🌿', foods: [['鶏肉・卵','良質タンパク質'],['アボカド','良質な脂質'],['玄米・雑穀','低GI炭水化物'],['ブロッコリー','ビタミンC+食物繊維']] },
  '排卵期':    { color: '#d4a574', icon: '🫐', foods: [['サーモン・青魚','オメガ3・抗炎症'],['くるみ・アーモンド','良質な脂質'],['ベリー類','抗酸化'],['卵','コリン・タンパク質']] },
  '黄体期':    { color: '#7ba3c4', icon: '🌙', foods: [['かぼちゃ・さつまいも（少量）','低GI + マグネシウム'],['ダークチョコ70%以上','マグネシウム・血糖安定'],['バナナ・キウイ','セロトニン前駆体'],['温かい味噌汁','腸内環境・精神安定']] },
  '黄体期後期':{ color: '#9b89b4', icon: '🌑', foods: [['温かいスープ・雑炊','消化を助ける'],['生姜・ターメリック','抗炎症'],['大豆製品','植物性エストロゲン'],['マグネシウム豊富な緑葉野菜','PMSを和らげる']] },
  'PCOS':      { color: '#6b9e78', icon: '💙', foods: [['卵・鶏肉','血糖を安定させるタンパク質'],['アボカド','インスリン感受性を助ける脂質'],['緑黄色野菜','食物繊維で血糖スパイク抑制'],['シナモン（少量）','インスリン感受性改善の研究あり']] },
  // 子宮内膜症: 抗炎症・低エストロゲン食（慢性炎症の軽減が目的）
  '子宮内膜症':{ color: '#c4878c', icon: '🔴', foods: [['サーモン・いわし','オメガ3脂肪酸で炎症を抑制'],['ブロッコリー・キャベツ','エストロゲン代謝を助けるアブラナ科'],['ターメリック・生姜','抗炎症スパイス'],['緑茶','抗酸化・軽度の抗炎症効果']] },
  // 子宮筋腫: 抗エストロゲン食・食物繊維強化（脂肪→エストロゲン過剰の抑制）
  '子宮筋腫':  { color: '#b07ba0', icon: '🟤', foods: [['野菜・豆類','食物繊維でエストロゲン排出促進'],['ブロッコリー・カリフラワー','アブラナ科でエストロゲン代謝サポート'],['きのこ類','腸内環境改善・免疫サポート'],['亜麻仁・チアシード','植物性オメガ3・リグナン']] },
  // 子宮腺筋症: 子宮内膜症に準じた抗炎症
  '子宮腺筋症':{ color: '#9b89b4', icon: '🟣', foods: [['青魚（さば・いわし）','強力な抗炎症・EPA/DHA'],['緑黄色野菜','ビタミンK・抗酸化'],['温かい野菜スープ','消化を助け炎症を和らげる'],['ベリー類','アントシアニン・抗炎症']] },
  // 卵巣嚢腫: 抗酸化（ROS軽減）＋抗炎症＋低GI（インスリン抵抗性改善）
  // チョコレート嚢腫の「鉄分由来の活性酸素（ROS）」抑制を最優先に設計
  '卵巣嚢腫':  { color: '#7a9eb0', icon: '🩵', foods: [['ベリー類・ブルーベリー','アントシアニンで活性酸素（ROS）を中和'],['ブロッコリー・芽キャベツ','DIM・アブラナ科でエストロゲン代謝サポート'],['サーモン・えごまオイル','オメガ3・EPA/DHAで嚢腫周囲の炎症を抑制'],['玄米・さつまいも（少量）','低GIでインスリン安定・ホルモンバランス改善']] }
};

function getCurrentCyclePhase() {
  var today = new Date().toISOString();
  var cd = calcCycleDay(today, state.records || []);
  return getCyclePhase(cd);
}

function updateFastingWidgetPhase() {
  var infoEl = document.getElementById('fast-phase-info');
  if (!infoEl) return;

  var phase = getCurrentCyclePhase();
  var diseases = state.myDiseases || [];

  // 疾患オーバーライド（優先順位: PCOS > 子宮内膜症 > PMS/PMDD > 子宮腺筋症 > 子宮筋腫 > 更年期 > 卵巣嚢腫）
  var diseaseOverride = null;
  var activeDiseaseName = null;
  ['PCOS', '子宮内膜症', 'PMS/PMDD', '子宮腺筋症', '子宮筋腫', '更年期障害', '卵巣嚢腫'].forEach(function(dk) {
    if (!diseaseOverride && diseases.indexOf(dk) !== -1 && FAST_DISEASE_OVERRIDE[dk]) {
      diseaseOverride = FAST_DISEASE_OVERRIDE[dk];
      activeDiseaseName = dk;
    }
  });

  if (!phase && !diseaseOverride) { infoEl.style.display = 'none'; return; }

  infoEl.style.display = 'block';
  var cfg = (phase && FAST_PHASE_CONFIG[phase]) || {};

  var iconEl  = document.getElementById('fast-phase-icon');
  var nameEl  = document.getElementById('fast-phase-name');
  var recEl   = document.getElementById('fast-phase-rec');
  var tipEl   = document.getElementById('fast-phase-tip');

  if (phase && cfg.icon) {
    if (iconEl) iconEl.textContent = cfg.icon;
    if (nameEl) nameEl.textContent = phase + (activeDiseaseName ? ' · ' + activeDiseaseName : '');
    var recText = diseaseOverride ? diseaseOverride.rec : cfg.rec;
    if (recEl)  recEl.textContent  = recText;
    if (tipEl)  tipEl.textContent  = cfg.tip || '';
  } else if (diseaseOverride) {
    if (iconEl) iconEl.textContent = '💊';
    if (nameEl) nameEl.textContent = activeDiseaseName + 'モード';
    if (recEl)  recEl.textContent  = diseaseOverride.rec;
    if (tipEl)  tipEl.textContent  = diseaseOverride.bedNote || '';
  }

  // 過食衝動サポートボタン: BEDリスク高のフェーズ or 疾患の場合に表示
  var showBingeBtn = (cfg.bedRisk) || (diseaseOverride && diseaseOverride.bedRisk);
  var bingeBtnWrap = document.getElementById('fast-binge-btn-wrap');
  if (bingeBtnWrap) bingeBtnWrap.style.display = showBingeBtn ? 'block' : 'none';
}

function showRecoveryGuide() {
  var phase = getCurrentCyclePhase();
  var diseases = state.myDiseases || [];

  // 疾患別回復食ルーティング（優先順位順）
  var diseaseRecoveryKey = null;
  ['PCOS', '子宮内膜症', '卵巣嚢腫', '子宮腺筋症', '子宮筋腫'].forEach(function(dk) {
    if (!diseaseRecoveryKey && diseases.indexOf(dk) !== -1 && FAST_RECOVERY_FOODS[dk]) {
      diseaseRecoveryKey = dk;
    }
  });

  var foodKey = diseaseRecoveryKey || (phase || '卵胞期');
  var foodData = FAST_RECOVERY_FOODS[foodKey] || FAST_RECOVERY_FOODS['卵胞期'];

  var cardEl   = document.getElementById('fast-recovery-card');
  var contentEl = document.getElementById('fast-recovery-content');
  if (!cardEl || !contentEl) return;

  // 疾患別表示テキスト定義
  var diseaseLabels = {
    'PCOS':    '低GI・血糖安定を意識した回復食です。',
    '子宮内膜症': '抗炎症・低エストロゲンを意識した回復食です。',
    '卵巣嚢腫':  '抗酸化（ROS軽減）・抗炎症・低GIを意識した回復食です。',
    '子宮腺筋症': '抗炎症サポートの回復食です。',
    '子宮筋腫':  'エストロゲン代謝を助ける食物繊維豊富な回復食です。'
  };

  var html = '';
  html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:10px;">';
  if (diseaseRecoveryKey) {
    html += '<strong style="color:var(--rose);">' + diseaseRecoveryKey + (phase ? ' × ' + phase : '') + '</strong> — ';
    html += diseaseLabels[diseaseRecoveryKey] || '回復食の参考にしてください。';
  } else if (phase) {
    html += '今日は <strong style="color:var(--rose);">' + phase + '</strong> です。回復食の参考にしてください。';
  } else {
    html += '断食後は消化に優しい食品から始めましょう。';
  }
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
  foodData.foods.forEach(function(f) {
    html += '<div style="background:var(--bg);border-radius:10px;padding:10px;">';
    html += '<div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:2px;">' + f[0] + '</div>';
    html += '<div style="font-size:10px;color:var(--ink-light);">' + f[1] + '</div>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="margin-top:10px;padding:8px 10px;background:var(--rose-pale,#f9eced);border-radius:10px;font-size:10px;color:var(--ink-light);line-height:1.6;">';
  html += '⚠️ このアプリは医療アドバイスを提供するものではありません。体調に合わせて判断してください。';
  html += '</div>';

  contentEl.innerHTML = html;
  cardEl.style.display = 'block';
  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 過食衝動サポートモーダル（研究エビデンスに基づく）
function showBingeUrgeSupport() {
  var phase = getCurrentCyclePhase();
  var diseases = state.myDiseases || [];

  // 最も適切なサポートキーを選択（BEDエビデンスが強い順）
  // 子宮内膜症 OR 2.94 > PCOS OR 1.53 > その他
  var supportKey = 'default';
  ['子宮内膜症', 'PCOS', '子宮腺筋症', '子宮筋腫', 'PMS/PMDD', '更年期障害'].forEach(function(dk) {
    if (supportKey === 'default' && diseases.indexOf(dk) !== -1 && BINGE_URGE_SUPPORT[dk]) supportKey = dk;
  });
  if (supportKey === 'default' && (phase === '黄体期後期' || phase === '黄体期')) supportKey = phase;

  var support = BINGE_URGE_SUPPORT[supportKey] || BINGE_URGE_SUPPORT['default'];

  var techniques = [
    { icon: '🌬️', title: '深呼吸 4-7-8', desc: '4秒吸って・7秒止めて・8秒かけて吐く。これを3回繰り返す。' },
    { icon: '☕', title: '温かい飲み物', desc: 'ハーブティーや白湯をゆっくり飲む。胃を温め、満足感を高める。' },
    { icon: '🫧', title: '5分タイマー', desc: '「5分後に再評価する」とルールを決める。衝動のピークは5〜15分で通過することが多い。' },
    { icon: '✍️', title: '記録する', desc: '今の気持ち・身体の感覚をアプリに記録することで、衝動から観察者の視点に切り替える。' }
  ];

  var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;" id="bingeUrgeOverlay" onclick="if(event.target===this)this.remove()">';
  html += '<div style="width:100%;max-width:480px;background:var(--white);border-radius:24px 24px 0 0;padding:24px 20px 32px;max-height:85vh;overflow-y:auto;">';

  // ヘッダー
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">';
  html += '<div style="font-family:Shippori Mincho,serif;font-size:16px;color:var(--ink);">🫶 食欲サポート</div>';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove()" style="width:30px;height:30px;border-radius:50%;border:1px solid var(--cream);background:var(--white);color:var(--ink-light);font-size:14px;cursor:pointer;">✕</button>';
  html += '</div>';

  // 検証メッセージ（エビデンスカード）
  html += '<div style="background:linear-gradient(135deg,' + support.color + '22,' + support.color + '11);border:1.5px solid ' + support.color + '44;border-radius:16px;padding:16px;margin-bottom:16px;">';
  html += '<div style="font-size:14px;font-weight:700;color:' + support.color + ';margin-bottom:8px;">' + support.validation + '</div>';
  html += '<div style="font-size:12px;color:var(--ink-mid);line-height:1.7;">' + support.science + '</div>';
  html += '</div>';

  // 対処テクニック
  html += '<div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--rose);margin-bottom:10px;display:flex;align-items:center;gap:5px;">';
  html += '<span style="display:inline-block;width:3px;height:11px;background:var(--rose);border-radius:2px;"></span>今できること';
  html += '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">';
  techniques.forEach(function(t) {
    html += '<div style="display:flex;gap:12px;padding:12px;background:var(--bg);border-radius:12px;align-items:flex-start;">';
    html += '<span style="font-size:20px;flex-shrink:0;">' + t.icon + '</span>';
    html += '<div><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:3px;">' + t.title + '</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);line-height:1.5;">' + t.desc + '</div></div>';
    html += '</div>';
  });
  html += '</div>';

  // 記録ボタン
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openRecordScreen===\'function\')window.openRecordScreen();" style="width:100%;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">今の状態を記録する →</button>';

  // 理解する導線（記録から見えてくるかもしれません）
  html += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--cream);">';
  html += '<div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--ink-mid);margin-bottom:10px;display:flex;align-items:center;gap:5px;">';
  html += '<span style="display:inline-block;width:3px;height:11px;background:var(--ink-mid);border-radius:2px;"></span>記録から見えてくるかもしれません';
  html += '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openCorrelationReport===\'function\')window.openCorrelationReport();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">';
  html += '<span style="font-size:18px;">🔬</span><div><div style="font-weight:600;">要因効果レポートを見る</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">睡眠・気分・周期との関連を確認する</div></div>';
  html += '</button>';
  html += '<button onclick="(function(){document.getElementById(\'bingeUrgeOverlay\').remove();var nb=document.querySelector(\'.nav-item[onclick*=\\\'insights\\\']\');if(typeof window.switchTab===\'function\')window.switchTab(\'insights\',nb);})();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">';
  html += '<span style="font-size:18px;">✨</span><div><div style="font-weight:600;">インサイトを見る</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">記録データからパターンを読み解く</div></div>';
  html += '</button>';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openExperiments===\'function\')window.openExperiments();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;">';
  html += '<span style="font-size:18px;">🧪</span><div><div style="font-weight:600;">ヘルス実験を試してみる</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">気になる要因を2週間追跡する</div></div>';
  html += '</button>';
  html += '</div>';
  html += '</div>';

  html += '<div style="text-align:center;margin-top:12px;font-size:10px;color:var(--ink-light);">このアプリは医療アドバイスを提供するものではありません。摂食障害が疑われる場合は専門家にご相談ください。</div>';

  html += '</div></div>';

  var overlay = document.createElement('div');
  overlay.innerHTML = html;
  document.body.appendChild(overlay.firstChild);
}

// ===== FASTING TIMER =====
let fastInterval = null;

function setFastGoal(h, el) {
  state.fastGoal = h;
  saveState();
  document.querySelectorAll('.fw-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
}

function toggleFast() {
  // fastingActiveがtrueでもfastingStartが欠落している不整合状態をリセット
  if (state.fastingActive && !state.fastingStart) {
    state.fastingActive = false;
    state.fastingStart = null;
    saveState();
    var sb = document.getElementById('fast-start-btn');
    var eb = document.getElementById('fast-stop-btn');
    if (sb) sb.style.display = 'block';
    if (eb) eb.style.display = 'none';
  }
  if (state.fastingActive) return;

  // 安全チェック①：月経期・黄体期で推奨safeMaxを超えた場合
  // ※ confirm()はモバイルPWAでブロックされることがあるためトーストに変更
  var phase = getCurrentCyclePhase();
  var cfg = phase ? FAST_PHASE_CONFIG[phase] : null;
  if (cfg && state.fastGoal > cfg.safeMax) {
    if(typeof showToast === 'function'){
      showToast('⚠️ ' + phase + '中は ' + cfg.rec + ' が推奨です。体調を最優先にしてください。', 'warn');
    }
    // 注意を促した上で続行（強制ブロックではなく自己判断を尊重）
  }

  // 安全チェック②：BEDリスクの高い疾患ユーザーへの配慮メッセージ
  var diseases = state.myDiseases || [];
  var bedDisease = null;
  // 子宮内膜症 OR 2.94 → 最優先で警告
  ['子宮内膜症', '子宮腺筋症', 'PCOS', '子宮筋腫', 'PMS/PMDD', '更年期障害'].forEach(function(dk) {
    if (!bedDisease && diseases.indexOf(dk) !== -1 && FAST_DISEASE_OVERRIDE[dk] && FAST_DISEASE_OVERRIDE[dk].bedRisk) {
      bedDisease = dk;
    }
  });
  if (bedDisease && state.fastGoal >= 16 && !state._fastBedWarningShown) {
    state._fastBedWarningShown = true;
    var dOverride = FAST_DISEASE_OVERRIDE[bedDisease];
    showAlertModal(
      '🫶 ' + bedDisease + 'をお持ちの方へ<br><br>' +
      dOverride.bedNote + '<br><br>' +
      '推奨: ' + dOverride.rec + '<br><br>' +
      '断食に過食衝動を感じたら、ウィジェット内の「食欲が止まらない」ボタンでサポートを呼び出せます。'
    );
  }

  // 通知許可をリクエスト
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  state.fastingActive = true;
  state.fastingStart = Date.now();
  saveState();
  document.getElementById('fast-start-btn').style.display = 'none';
  document.getElementById('fast-stop-btn').style.display = 'block';
  // 達成予定時刻を表示
  var goalTime = new Date(Date.now() + state.fastGoal * 3600000);
  var goalStr = ('0' + goalTime.getHours()).slice(-2) + ':' + ('0' + goalTime.getMinutes()).slice(-2);
  document.getElementById('fast-status').textContent = state.fastGoal + 'h目標 → ' + goalStr + ' に達成予定';
  startFastTimer();
}


function endFast() {
  if (!state.fastingActive) return;
  const elapsed = (Date.now() - state.fastingStart) / 1000 / 3600;
  state.fastingActive = false;
  state.fastingStart = null;
  state.fastingEnded = Date.now();
  clearInterval(fastInterval);

  // タイマー結果を今日の記録に保存
  var todayStr = new Date().toDateString();
  var rec = null;
  for(var i=0; i<state.records.length; i++){
    if(new Date(state.records[i].date).toDateString() === todayStr){ rec = state.records[i]; break; }
  }
  if(!rec){
    var _now = new Date();
    rec = { date: _now.toISOString(), record_date: _now.toISOString().slice(0, 10) };
    state.records.push(rec);
  }
  rec.fastingTimer = Math.round(elapsed * 10) / 10;
  rec.fastingGoal = state.fastGoal || 16;

  saveState();
  saveAndSync()
  document.getElementById('fast-start-btn').style.display = 'block';
  document.getElementById('fast-stop-btn').style.display = 'none';
  document.getElementById('fast-timer').textContent = '00:00:00';
  document.getElementById('fast-status').textContent = `終了: ${elapsed.toFixed(1)}h 達成！`;

  // 回復食ガイドを表示
  showRecoveryGuide();
}

function resumeFasting() {
  // Restore pill active state from saved goal
  document.querySelectorAll('.fw-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.textContent) === state.fastGoal);
  });
  document.getElementById('fast-start-btn').style.display = 'none';
  document.getElementById('fast-stop-btn').style.display = 'block';
  document.getElementById('fast-status').textContent = `目標：${state.fastGoal}時間`;
  startFastTimer();
}

function startFastTimer() {
  // Always clear before starting — prevents double-run on re-render
  if (fastInterval !== null) {
    clearInterval(fastInterval);
    fastInterval = null;
  }
  fastInterval = setInterval(() => {
    if (!state.fastingStart) return;
    const elapsed = Date.now() - state.fastingStart;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const fmt = v => String(v).padStart(2, '0');
    const timerEl = document.getElementById('fast-timer');
    const statusEl = document.getElementById('fast-status');
    if (!timerEl || !statusEl) { clearInterval(fastInterval); fastInterval = null; return; }
    timerEl.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;
    const goalMs = state.fastGoal * 3600000;
      if (elapsed >= goalMs) {
      statusEl.textContent = '🎉 ' + state.fastGoal + 'h 達成！';
      if (!state.fastingNotified) {
        state.fastingNotified = true;
        saveState();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('ippo 🌸ファスティング達成！', {
            body: state.fastGoal + '時間のファスティングを達成しました！おつかれさまです。',
            icon: 'images/icon-192.png'
          });
        }
      }
    } else {
      const remaining = goalMs - elapsed;
      const rh = Math.floor(remaining / 3600000);
      const rm = Math.floor((remaining % 3600000) / 60000);
      statusEl.textContent = '目標まであと ' + rh + 'h' + rm + 'm';
    }
  }, 1000);
}


// ===== ホーム周期フェーズバナー =====
var PHASE_BANNER_CONFIG = {
  '月経期': {
    icon: '🔴',
    tips: {
      'default':    'からだを温めて、ゆっくり過ごしましょう。',
      '子宮内膜症': '生理痛が強い場合は無理せず休養を。記録を忘れずに。',
      '子宮筋腫':   '経血量の変化を今日も記録してください。',
      '子宮腺筋症': '痛みの強さを記録しておくと診察時に役立ちます。',
      'PMS/PMDD':   '気分の波も正直に記録してみましょう。'
    }
  },
  '卵胞期': {
    icon: '🌱',
    tips: {
      'default':    '体調が上向きの時期。今日の症状も記録してみましょう。',
      'PCOS':       '血糖値を意識した食事がホルモンバランスに◎。',
      '不妊症':     'このフェーズの体調変化も記録しておきましょう。'
    }
  },
  '排卵期': {
    icon: '🥚',
    tips: {
      'default':    '排卵期は骨盤痛が出やすい時期です。',
      '子宮内膜症': '排卵痛が強い場合は部位と強さを記録してください。',
      '卵巣嚢腫':   '片側の痛みの左右を記録すると診察時に有用です。',
      '不妊症':     '排卵のサインを体温・おりものとあわせて記録しましょう。',
      'PCOS':       '排卵の有無を基礎体温で確認しましょう。'
    }
  },
  '黄体期': {
    icon: '🌙',
    tips: {
      'default':    '症状が出やすい時期。無理せず記録を続けましょう。',
      'PMS/PMDD':   'PMSの症状が出始める時期。気分の変化も記録してください。',
      '子宮内膜症': '骨盤痛が増えやすい時期です。強さと部位を記録しましょう。',
      '更年期障害':  'ほてりや不眠が出やすい時期。SMIチェックを忘れずに。',
      'PCOS':       '基礎体温が上がっているか確認しましょう。'
    }
  }
};

function updateHomePhaseBanner() {
  // 新デザイン：home-phase-badge に表示
  var badge     = document.getElementById('home-phase-badge');
  var badgeText = document.getElementById('home-phase-badge-text');
  if (!badge || !badgeText) return;

  // getCurrentCyclePhase が null の場合は getPhaseForDate でフォールバック
  var phase = (typeof getCurrentCyclePhase === 'function') ? getCurrentCyclePhase() : null;
  if (!phase && state.lastPeriodDate && state.cycleLength) {
    phase = getPhaseForDate(new Date());
  }
  if (!phase) { badge.style.display = 'none'; return; }

  var last = state.lastPeriodDate ? new Date(state.lastPeriodDate + 'T00:00:00') : null;
  var dayNum = last ? Math.floor((new Date() - last) / 86400000) + 1 : null;
  // 周期内日数に補正（次の周期になっている場合）
  if (dayNum && state.cycleLength && dayNum > state.cycleLength) {
    dayNum = ((dayNum - 1) % state.cycleLength) + 1;
  }

  badgeText.textContent = phase + (dayNum ? ' ' + dayNum + '日目' : '');
  badge.style.display = 'block';
}

// ===== ホーム 週間カレンダーバー =====
function buildHomeWeekRow() {
  var weekRow    = document.getElementById('home-week-row');
  if (!weekRow) return;

  var today     = new Date();
  var dayOfWeek = today.getDay();
  var monday    = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  var days = ['月','火','水','木','金','土','日'];
  var html = '';

  // 白背景下段用の色設定
  var phaseColors = {
    '月経期': '#f0a0b0', '卵胞期': '#88c8a0',
    '排卵期': '#80b8c8', '黄体期': '#d4a870', '不明': '#ede8e4'
  };

  for (var i = 0; i < 7; i++) {
    var d = new Date(monday);
    d.setDate(monday.getDate() + i);
    var dateStr  = d.toISOString().slice(0, 10);
    var todayStr = today.toISOString().slice(0, 10);
    var isToday  = dateStr === todayStr;
    var isFuture = dateStr > todayStr;

    var rec = (state.records || []).find(function(r) {
      return (r.date || r.record_date || '').slice(0, 10) === dateStr;
    });
    var pain = rec ? (rec.painLevel || 0) : null;

    var phase = getPhaseForDate(d);
    var phaseColor = phaseColors[phase] || phaseColors['不明'];

    var cellBg = isFuture ? '#f0ebe8' :
                 rec === undefined ? '#ede8e4' :
                 pain >= 4 ? '#c04060' :
                 pain >= 2 ? '#e8809a' :
                 pain >= 1 ? '#f0a8b8' : phaseColor;
    var cellColor = (pain >= 2) ? 'white' : 'var(--ink)';
    var cellWeight = isToday ? '700' : '500';

    var clickable = !isFuture;
    html += '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;'
      + (clickable ? 'cursor:pointer;' : '') + '"'
      + (clickable ? ' onclick="openDayDetailByDate(\'' + dateStr + '\')"' : '')
      + '>';
    html += '<div style="font-size:10px;color:var(--ink-light);">' + days[i] + '</div>';
    html += '<div style="width:100%;aspect-ratio:1;border-radius:9px;display:flex;align-items:center;justify-content:center;'
      + 'font-size:12px;font-weight:' + cellWeight + ';'
      + 'color:' + cellColor + ';background:' + cellBg + ';'
      + (isToday ? 'box-shadow:0 0 0 2px var(--rose-dark);' : '')
      + '">' + d.getDate() + '</div>';
    html += '</div>';
  }
  weekRow.innerHTML = html;
  buildPhaseBar(monday);
}

// ホーム週セルから日付詳細を開くヘルパー（ISO文字列 → calYear/calMonth を設定してから開く）
function openDayDetailByDate(isoStr) {
  var d = new Date(isoStr + 'T00:00:00');
  calYear  = d.getFullYear();
  calMonth = d.getMonth();
  openDayDetail(d.getDate());
}

function getPhaseForDate(date) {
  if (!state.lastPeriodDate || !state.cycleLength) return '不明';
  var last     = new Date(state.lastPeriodDate + 'T00:00:00');
  var dayNum   = Math.floor((date - last) / 86400000) + 1;
  var cycle    = state.cycleLength || 28;
  var adjusted = ((dayNum - 1) % cycle) + 1;
  if (adjusted <= 5)                         return '月経期';
  if (adjusted <= Math.floor(cycle * 0.46)) return '卵胞期';
  if (adjusted <= Math.floor(cycle * 0.53)) return '排卵期';
  return '黄体期';
}

function buildPhaseBar(monday) {
  var bar    = document.getElementById('home-phase-bar');
  var labels = document.getElementById('home-phase-labels');
  if (!bar) return;

  var cycle = state.cycleLength || 28;

  // 全周期の比例バー（4フェーズの長さ）
  var menLen  = 5;
  var folLen  = Math.floor(cycle * 0.46) - 5;
  var ovLen   = Math.floor(cycle * 0.53) - Math.floor(cycle * 0.46);
  var lutLen  = cycle - Math.floor(cycle * 0.53);

  var phaseData = [
    { name:'月経',  days: menLen,  color:'#e87080' },
    { name:'卵胞',  days: folLen,  color:'#70b88a' },
    { name:'排卵',  days: ovLen,   color:'#70a8c0' },
    { name:'黄体',  days: lutLen,  color:'#d4a060' }
  ];

  // 今日の周期内フェーズを特定（フォールバック付き）
  var currentPhase = typeof getCurrentCyclePhase === 'function' ? getCurrentCyclePhase() : null;
  if (!currentPhase && state.lastPeriodDate && state.cycleLength) {
    currentPhase = getPhaseForDate(new Date());
  }
  var phaseNameMap = { '月経期':'月経', '卵胞期':'卵胞', '排卵期':'排卵', '黄体期':'黄体' };
  var currentShort = phaseNameMap[currentPhase] || '';

  // バーHTML
  var barHtml = phaseData.map(function(p) {
    return '<div style="flex:' + p.days + ';background:' + p.color + ';"></div>';
  }).join('');
  bar.innerHTML = barHtml;

  // ラベルHTML（フェーズ名＋現在フェーズに▼）
  if (labels) {
    var labelHtml = phaseData.map(function(p) {
      var isCurrent = p.name === currentShort;
      return '<div style="flex:' + p.days + ';font-size:9px;text-align:center;'
        + 'color:' + (isCurrent ? 'var(--ink)' : 'var(--ink-light)') + ';'
        + 'font-weight:' + (isCurrent ? '600' : '400') + ';">'
        + p.name + (isCurrent ? ' ◀' : '')
        + '</div>';
    }).join('');
    labels.innerHTML = labelHtml;
  }
}

// ===== 今週の気づき =====
function updateHomeInsightCard() {
  var card = document.getElementById('home-insight-card');
  var text = document.getElementById('home-insight-text');
  if (!card || !text) return;

  var records = state.records || [];
  if (records.length < 3) { card.style.display = 'none'; return; }

  if (typeof window.buildHomeInsight === 'function') {
    var packet = window.buildHomeInsight(records, state);

    var lines = [];
    if (packet.reason)     lines.push(packet.reason.title + ' — ' + packet.reason.body);
    if (packet.prediction) lines.push(packet.prediction.title + ' — ' + packet.prediction.body);

    if (lines.length) {
      text.innerHTML = lines.map(function(l) { return '<div>' + l + '</div>'; }).join('');
      card.style.display = 'block';
      var predEl = document.getElementById('home-prediction-text');
      if (predEl && packet.prediction) predEl.textContent = packet.prediction.body;
      return;
    }
  }

  // フォールバック: 旧ロジック
  var today = new Date();
  var weekRecords = records.filter(function(r) {
    var d = new Date(r.date || r.record_date || '');
    var diff = Math.floor((today - d) / 86400000);
    return diff >= 0 && diff < 7;
  });
  if (weekRecords.length === 0) { card.style.display = 'none'; return; }

  var painDays   = weekRecords.filter(function(r) { return r.painLevel >= 2; }).length;
  var noPainDays = weekRecords.filter(function(r) { return r.painLevel === 0; }).length;
  var avgPain    = weekRecords.reduce(function(s, r) { return s + (r.painLevel || 0); }, 0) / weekRecords.length;

  var insight = '';
  if (painDays >= 4)       insight = '今週は' + painDays + '日間、痛みの記録があります。';
  else if (noPainDays >= 5) insight = '今週は' + noPainDays + '日、らくな日が続いています。';
  else if (avgPain > 0)    insight = '今週の平均痛みスコアは ' + avgPain.toFixed(1) + '/4 でした。';

  if (!insight) { card.style.display = 'none'; return; }
  text.textContent = insight;
  card.style.display = 'block';
}

// ===== 数値2つ（連続・次の生理） =====
function updateHomeNumbers() {
  var streak = state.streak || 0;
  var streakEl = document.getElementById('home-streak-num');
  if (streakEl) streakEl.textContent = streak;
  // 連続7日以上で🔥表示
  var fireEl = document.getElementById('home-streak-fire');
  if (fireEl) fireEl.textContent = streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '';

  var nextEl    = document.getElementById('home-next-num');
  var nextLabel = document.getElementById('home-next-label');
  var nextUnit  = document.getElementById('home-next-unit');
  if (!nextEl) return;

  if (state.lastPeriodDate && state.cycleLength) {
    var last     = new Date(state.lastPeriodDate + 'T00:00:00');
    var today    = new Date();
    var dayNum   = Math.floor((today - last) / 86400000) + 1;
    var daysLeft = state.cycleLength - dayNum;
    if (daysLeft > 0) {
      nextEl.textContent = daysLeft;
      if (nextUnit) nextUnit.textContent = '日後';
    } else {
      nextEl.textContent = '今日';
      if (nextUnit) nextUnit.textContent = '頃';
    }
  } else {
    nextEl.textContent = '—';
    if (nextLabel) nextLabel.textContent = '次の生理予測';
    if (nextUnit)  nextUnit.textContent  = '';
  }
}

// ===== 疾患別アドバイス =====
function updateHomeDiseaseAdvice() {
  var card = document.getElementById('home-disease-advice');
  var text = document.getElementById('home-disease-advice-text');
  if (!card || !text) return;

  var diseases = state.myDiseases || [];
  if (diseases.length === 0) { card.style.display = 'none'; return; }

  var h = new Date().getHours();
  var isMorning = h >= 5 && h < 12;
  var isNight   = h >= 20;
  var hint = (typeof getDailyHint === 'function') ? getDailyHint(diseases, isMorning, isNight) : null;
  if (!hint) { card.style.display = 'none'; return; }

  text.textContent = diseases[0] + '：' + hint.text;
  card.style.display = 'block';
}

// ===== インサイト タブ切り替え (Pattern B: 5タブ) =====
function switchInsTab(tab) {
  // 旧タブ名の後方互換マッピング
  var legacyMap = { free: 'recommended', pro: 'trends', doctor: 'report' };
  if (legacyMap[tab]) tab = legacyMap[tab];

  var panes = ['recommended', 'trends', 'cycle', 'experiments', 'report'];
  panes.forEach(function(p) {
    var pane = document.getElementById('ins-pane-' + p);
    var btn  = document.getElementById('ins-tab-btn-' + p);
    if (!pane || !btn) return;
    if (p === tab) {
      pane.style.display = 'block';
      btn.style.background = '#F3EFFD';
      btn.style.color = '#A78BFA';
      btn.style.fontWeight = '500';
      btn.style.borderColor = 'rgba(167,139,250,0.22)';
      btn.style.boxShadow = 'none';
    } else {
      pane.style.display = 'none';
      btn.style.background = 'transparent';
      btn.style.color = 'rgba(45,31,26,0.42)';
      btn.style.fontWeight = '400';
      btn.style.borderColor = 'transparent';
      btn.style.boxShadow = 'none';
    }
  });

  if (tab === 'recommended') {
    renderInsightDiscoveries();
    renderMonthlySummaryText();
  }
  if (tab === 'trends') {
    setTimeout(function(){
      if (typeof renderComparisonChart === 'function') renderComparisonChart();
      if (typeof renderTimeline === 'function') renderTimeline();
    }, 80);
  }
  if (tab === 'cycle') {
    if (typeof renderPhaseMap === 'function') renderPhaseMap();
    setTimeout(function(){
      if (typeof updateFoodBodyCorrelation === 'function') updateFoodBodyCorrelation();
      if (typeof updateCycleSymptomCorrelation === 'function') updateCycleSymptomCorrelation();
    }, 80);
  }
}

// ===== インサイト発見ロジック＋メインカード更新 =====
function renderInsightDiscoveries() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderInsightDiscoveries', renderInsightDiscoveries);
    return;
  }
  var now = new Date();
  var records30 = (state.records || []).filter(function(r){
    var d = new Date(r.record_date || r.date);
    return (now - d) / 86400000 <= 30;
  });

  // 記録不足の場合は空状態を表示
  var emptyEl = document.getElementById('insights-empty-state');
  if (records30.length < 3) {
    if (emptyEl) emptyEl.style.display = 'block';
    _updateInsMainCard(
      '記録を続けると、\nあなたの体のパターンが見えてきます。',
      '7日間記録すると、食事・症状・周期のつながりが分かってきます。'
    );
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';

  // ── 発見候補を生成 ──────────────────────────────────
  var best = null; // { main, sub, priority }

  // 1. 睡眠が短い翌日の痛み
  var shortSleepDays = records30.filter(function(r){ return (r.sleepHours || 8) < 6 && r.sleepHours > 0; });
  if (shortSleepDays.length >= 2) {
    var nextDayPains = shortSleepDays.map(function(r){
      var d = new Date(r.record_date || r.date); d.setDate(d.getDate()+1);
      var nx = records30.find(function(r2){ return new Date(r2.record_date || r2.date).toDateString() === d.toDateString(); });
      return nx ? (nx.painLevel || 0) : null;
    }).filter(function(v){ return v !== null; });
    if (nextDayPains.length >= 1) {
      var avgNP = nextDayPains.reduce(function(a,b){return a+b;},0)/nextDayPains.length;
      if (avgNP >= 2) {
        var pct = Math.round(nextDayPains.filter(function(v){return v>=2;}).length / nextDayPains.length * 100);
        best = {
          priority: 5,
          main: '睡眠が6時間未満の日の翌日は、\n頭痛が出やすい傾向があります',
          sub:  '過去30日の記録からみると、約' + pct + '%の確率で見られます。あなたの体のパターンです。'
        };
      }
    }
  }

  // 2. 生理前の痛み集中
  var painDays = records30.filter(function(r){ return (r.painLevel || 0) >= 4; });
  if (painDays.length >= 3) {
    var preLuteal = painDays.filter(function(r){
      if (!state.lastPeriodDate || !state.cycleLength) return false;
      var last = new Date(state.lastPeriodDate + 'T00:00:00');
      var dayNum = Math.floor((new Date(r.date) - last) / 86400000) + 1;
      var cl = state.cycleLength || 28;
      return dayNum >= (cl - 7) && dayNum <= cl;
    });
    if (preLuteal.length >= 2 && (!best || best.priority < 6)) {
      best = {
        priority: 6,
        main: '生理前の時期に、\n痛みが集中しやすい傾向があります',
        sub:  '過去30日で生理前' + preLuteal.length + '日間に痛みが集中しています。周期を把握することが助けになります。'
      };
    }
  }

  // 3. 運動した翌日の気分向上
  var exerciseDays = records30.filter(function(r){ return r.factors && r.factors.indexOf('運動した') !== -1; });
  if (exerciseDays.length >= 2 && (!best || best.priority < 4)) {
    var avgMoodEx = exerciseDays.reduce(function(s,r){ return s+(r.mood||3); },0) / exerciseDays.length;
    var nonEx = records30.filter(function(r){ return !r.factors || r.factors.indexOf('運動した') === -1; });
    var avgMoodNo = nonEx.length ? nonEx.reduce(function(s,r){ return s+(r.mood||3); },0) / nonEx.length : 3;
    if (avgMoodEx > avgMoodNo + 0.3) {
      best = {
        priority: 4,
        main: '運動した翌日は、\n気分が上向きやすいかもしれません',
        sub:  '運動した日と比べ、気分スコアが高い傾向が見られます。続けることが助けになりそうです。'
      };
    }
  }

  // 4. 繰り返し症状
  if (!best || best.priority < 3) {
    var symCount = {};
    records30.forEach(function(r){ (r.symptoms||[]).forEach(function(s){ symCount[s]=(symCount[s]||0)+1; }); });
    var topSym = Object.entries ? Object.entries(symCount).sort(function(a,b){return b[1]-a[1];})[0] : null;
    if (!topSym) {
      var keys = Object.keys(symCount).sort(function(a,b){return symCount[b]-symCount[a];});
      if (keys.length) topSym = [keys[0], symCount[keys[0]]];
    }
    if (topSym && topSym[1] >= 3) {
      best = {
        priority: 3,
        main: '今月、「' + topSym[0] + '」が\n' + topSym[1] + '日続いています',
        sub:  '記録を継続することで、症状のパターンが見えてきます。'
      };
    }
  }

  // 記録継続（ポジティブ）
  if (!best && records30.length >= 5) {
    best = {
      priority: 1,
      main: '今月は' + records30.length + '日、\n記録が続いています',
      sub:  '続けるほど、あなただけのからだのパターンが見えてきます。'
    };
  }

  if (best) {
    _updateInsMainCard(best.main, best.sub);
  }

  // discoveries-cards（非表示コンテナ）にも書き込む（後方互換）
  var container = document.getElementById('discoveries-cards');
  if (container) container.innerHTML = '';
}

function _updateInsMainCard(main, sub) {
  var textEl = document.getElementById('ins-main-insight-text');
  var subEl  = document.getElementById('ins-main-insight-sub');
  if (textEl) textEl.innerHTML = main.replace(/\n/g, '<br>');
  if (subEl)  subEl.textContent = sub;
}

// ===== 今月のサマリーテキスト生成 =====
function renderMonthlySummaryText() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderMonthlySummaryText', renderMonthlySummaryText);
    return;
  }
  var el = document.getElementById('ins-monthly-summary-text');
  if (!el) return;

  var now = new Date();
  var monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  var mn = monthNames[now.getMonth()];

  var monthRecs = (state.records || []).filter(function(r){
    var d = new Date(r.date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  if (monthRecs.length < 3) {
    el.innerHTML = mn + 'の記録を集めています。<br><span style="font-size:12px;color:#9a8a80;">記録が増えるほど、より正確な分析が見えてきます。</span>';
    return;
  }

  var painDays = monthRecs.filter(function(r){ return (r.painLevel||0) >= 2; }).length;
  var freeDays = monthRecs.length - painDays;

  var avgSleep = monthRecs.reduce(function(s,r){ return s+(r.sleepHours||0); },0) / monthRecs.length;

  var sentence;
  if (freeDays > painDays) {
    sentence = mn + 'のあなたは、<strong style="color:#6B8F71;font-weight:600;">痛みのない日が多い</strong>、穏やかな1ヶ月でした。';
  } else if (avgSleep >= 6.5) {
    sentence = mn + 'のあなたは、<strong style="color:#8B82B8;font-weight:600;">睡眠が比較的安定</strong>してきた1ヶ月でした。';
  } else {
    sentence = mn + 'のあなたは、痛みと向き合いながら記録を続けた1ヶ月でした。';
  }

  var note = monthRecs.length + '日の記録から見えてきたパターンです。';
  el.innerHTML = sentence + '<br><span style="font-size:12px;color:#9a8a80;line-height:1.7;">' + note + '</span>';
}

// ===== フェーズ別症状マップ =====
function renderPhaseMap() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('renderPhaseMap', renderPhaseMap);
    return;
  }
  var container = document.getElementById('phase-map-content');
  if (!container) return;

  // PRO以外はロックカードを表示
  if (!isAdminOrPremium()) {
    container.innerHTML =
      '<div onclick="premiumGate(openCyclePhaseReport)" style="background:linear-gradient(135deg,#fdf3f3,#f9edd8);border-radius:18px;padding:18px 20px;cursor:pointer;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:0;right:0;bottom:0;width:50%;background:linear-gradient(135deg,rgba(200,169,110,0.08),transparent);"></div>'
      + '<div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:6px;">周期フェーズ × 症状のパターンを見る</div>'
      + '<div style="font-size:11px;color:var(--ink-light);line-height:1.7;margin-bottom:14px;">どのフェーズで骨盤痛が集中しているか、黄体期のエネルギーレベルはどうかがわかります。診察前の確認にも役立ちます。</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
      + _buildPhaseBarPreview()
      + '</div>'
      + '<div style="background:var(--rose);color:white;border-radius:12px;padding:10px;text-align:center;font-size:13px;font-weight:500;">🔓 PROで全フェーズを確認する</div>'
      + '</div>';
    return;
  }

  // PROユーザー：実データを描画
  var analysis = analyzeCyclePhases(state.records || []);
  var phaseNames = ['月経期', '卵胞期', '排卵期', '黄体期'];
  var phaseColors = { '月経期': '#c4878c', '卵胞期': '#6b9e78', '排卵期': '#d4a574', '黄体期': '#7ba3c4' };
  var phaseIcons  = { '月経期': '🔴', '卵胞期': '🌱', '排卵期': '🥚', '黄体期': '🌙' };

  if (Object.keys(analysis).length === 0) {
    container.innerHTML =
      '<div style="background:var(--white);border-radius:16px;padding:20px;text-align:center;color:var(--ink-light);font-size:12px;line-height:1.8;box-shadow:0 1px 6px var(--shadow);">'
      + '🌸 生理周期のデータがまだ不足しています。<br>生理日を記録し続けると、フェーズ別の傾向が見えてきます。'
      + '</div>';
    return;
  }

  // フェーズ選択タブ
  var html = '<div id="phase-tab-row" style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:2px;">';
  phaseNames.forEach(function(name, idx) {
    var active = idx === 0 ? 'background:var(--rose);color:white;border-color:var(--rose);' : 'background:var(--white);color:var(--ink-light);border-color:#e8ddd8;';
    html += '<button onclick="selectPhaseTab(\'' + name + '\')" id="phase-tab-' + name + '" style="flex-shrink:0;padding:7px 14px;border-radius:20px;border:1.5px solid;font-size:12px;font-family:\'Noto Sans JP\',sans-serif;cursor:pointer;transition:all 0.2s;' + active + '">'
      + phaseIcons[name] + ' ' + name + '</button>';
  });
  html += '</div>';

  // 各フェーズのパネル
  phaseNames.forEach(function(name) {
    var d = analysis[name];
    var color = phaseColors[name];
    var display = name === '月経期' ? 'block' : 'none';

    html += '<div id="phase-panel-' + name + '" style="display:' + display + ';">';
    if (!d) {
      html += '<div style="background:var(--white);border-radius:16px;padding:16px;text-align:center;color:var(--ink-light);font-size:12px;box-shadow:0 1px 6px var(--shadow);">'
        + 'このフェーズのデータがまだありません。</div>';
    } else {
      html += '<div style="background:var(--white);border-radius:18px;padding:18px;box-shadow:0 1px 8px var(--shadow);border-top:3px solid ' + color + ';">';

      // 指標グリッド
      html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:14px;">';
      var metrics = [
        { label: '平均痛みレベル', val: d.avgPain,     unit: '/10',  max: 10,  warn: 5    },
        { label: 'エネルギー',     val: d.avgEnergy,   unit: '/5',   max: 5,   warn: null },
        { label: '睡眠の質',       val: d.avgSleep,    unit: '/5',   max: 5,   warn: null },
        { label: 'ウェルネス',     val: d.avgWellness, unit: '/100', max: 100, warn: 40   }
      ];
      metrics.forEach(function(m) {
        var pct = m.val !== '-' ? Math.round(parseFloat(m.val) / m.max * 100) : 0;
        var valColor = (m.warn && m.val !== '-' && parseFloat(m.val) >= m.warn) ? '#c4878c' : color;
        html += '<div style="background:var(--cream);border-radius:12px;padding:12px;">';
        html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">' + m.label + '</div>';
        html += '<div style="font-size:18px;font-weight:600;color:' + valColor + ';line-height:1;">' + m.val + '<span style="font-size:10px;color:var(--ink-light);">' + m.unit + '</span></div>';
        html += '<div style="height:4px;background:#e8ddd8;border-radius:2px;margin-top:6px;overflow:hidden;">';
        html += '<div style="height:100%;width:' + pct + '%;background:' + valColor + ';border-radius:2px;transition:width 0.4s;"></div>';
        html += '</div></div>';
      });
      html += '</div>';

      // 多い症状
      if (d.topSymptoms && d.topSymptoms.length > 0) {
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">このフェーズで多い症状</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        d.topSymptoms.slice(0, 5).forEach(function(s) {
          html += '<span style="font-size:11px;background:#fdf0f2;color:#c4878c;padding:4px 10px;border-radius:12px;">'
            + s[0] + ' <span style="font-size:10px;opacity:0.7;">(' + s[1] + '日)</span></span>';
        });
        html += '</div></div>';
      }

      // 多い生活要因
      if (d.topFactors && d.topFactors.length > 0) {
        html += '<div style="margin-bottom:12px;">';
        html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">このフェーズで多い要因</div>';
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        d.topFactors.slice(0, 4).forEach(function(f) {
          html += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:4px 10px;border-radius:12px;">'
            + f[0] + ' <span style="font-size:10px;opacity:0.7;">(' + f[1] + '日)</span></span>';
        });
        html += '</div></div>';
      }

      // 詳細レポートへのリンク
      html += '<button onclick="openCyclePhaseReport()" style="width:100%;padding:11px;background:var(--cream);border:1.5px solid #e8ddd8;border-radius:12px;font-family:\'Noto Sans JP\',sans-serif;font-size:12px;color:var(--ink-light);cursor:pointer;margin-top:4px;">全フェーズの詳細比較を見る →</button>';

      html += '</div>';
    }
    html += '</div>';
  });

  container.innerHTML = html;
}

function selectPhaseTab(name) {
  var phaseNames = ['月経期', '卵胞期', '排卵期', '黄体期'];
  var phaseColors = { '月経期': '#c4878c', '卵胞期': '#6b9e78', '排卵期': '#d4a574', '黄体期': '#7ba3c4' };
  phaseNames.forEach(function(n) {
    var tab = document.getElementById('phase-tab-' + n);
    var panel = document.getElementById('phase-panel-' + n);
    if (tab) {
      if (n === name) {
        tab.style.background = phaseColors[n] || 'var(--rose)';
        tab.style.color = 'white';
        tab.style.borderColor = phaseColors[n] || 'var(--rose)';
      } else {
        tab.style.background = 'var(--white)';
        tab.style.color = 'var(--ink-light)';
        tab.style.borderColor = '#e8ddd8';
      }
    }
    if (panel) panel.style.display = n === name ? 'block' : 'none';
  });
}

// 非PROユーザー向けのぼかしプレビューバーを生成
function _buildPhaseBarPreview() {
  var phases = [
    { name: '月経期', color: '#c4878c', val: 65 },
    { name: '卵胞期', color: '#6b9e78', val: 85 },
    { name: '排卵期', color: '#d4a574', val: 80 },
    { name: '黄体期', color: '#7ba3c4', val: 60 }
  ];
  return phases.map(function(p) {
    return '<div style="flex:1;text-align:center;">'
      + '<div style="height:40px;background:' + p.color + '33;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;overflow:hidden;">'
      + '<div style="width:70%;height:' + p.val + '%;background:' + p.color + '88;border-radius:4px 4px 0 0;filter:blur(1px);"></div>'
      + '</div>'
      + '<div style="font-size:9px;color:var(--ink-light);margin-top:4px;">' + p.name + '</div>'
      + '</div>';
  }).join('');
}

// ===== TABS =====
function switchTab(tab, btn) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`screen-${tab}`).classList.add('active');
  if (btn) btn.classList.add('active');


  if (tab === 'insights') {
    var activePaneName = 'free';
    if (document.getElementById('ins-pane-pro') && document.getElementById('ins-pane-pro').style.display === 'block') activePaneName = 'pro';
    if (document.getElementById('ins-pane-doctor') && document.getElementById('ins-pane-doctor').style.display === 'block') activePaneName = 'doctor';
    if (typeof switchInsTab === 'function') switchInsTab(activePaneName);
    if (typeof renderInsightDiscoveries === 'function') renderInsightDiscoveries();
  }
  if (tab === 'home') {
    buildHomeWeekRow();
    updateHomeInsightCard();
    updateHomeNumbers();
    updateHomeDiseaseAdvice();
    updateHomeCTAState();
    if (typeof updateHomePhaseBanner === 'function') updateHomePhaseBanner();
    if (typeof updateTodayMessage === 'function') updateTodayMessage();
  }
  if (tab === 'calendar') {
    buildCalendar();
  }
}
　


// ===== RECORD MODAL =====
let _prevTab = 'home'; // バグ07: 直前タブを記憶して閉じたとき復元

function openRecordModal() {
  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) _prevTab = activeScreen.id.replace('screen-', '');
  currentRecord = {};
  currentStep = 0;
  STEPS = window.STEPS = buildSteps();
  // ステップインジケーターのドットを動的生成
  var indicator = document.getElementById('step-indicator');
  if (indicator) {
    indicator.innerHTML = '';
    window.STEPS.forEach(function() {
      var dot = document.createElement('div');
      dot.className = 'step-dot';
      indicator.appendChild(dot);
    });
  }
  renderStep();
  document.getElementById('record-modal').classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  // バグ14: フォーカスをモーダル内の最初のボタンに移動
  requestAnimationFrame(() => {
    const firstFocusable = document.querySelector('#record-modal .modal-sheet button, #record-modal .modal-sheet [tabindex]');
    if (firstFocusable) firstFocusable.focus();
  });
}

function closeModal() {
  document.getElementById('record-modal').classList.remove('active');
  const prevBtn = document.querySelector(`.nav-item[onclick*="'${_prevTab}'"]`);
  switchTab(_prevTab, prevBtn);
  // バグ14: モーダルを閉じたらナビボタンにフォーカスを戻す
  if (prevBtn) prevBtn.focus();
}

function renderStep() {
  const step = STEPS[currentStep];
  document.getElementById('modal-title').innerHTML = step.title.replace('\n', '<br>');
  document.getElementById('modal-step-label').textContent = step.label;

  const dots = document.querySelectorAll('#step-indicator .step-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < currentStep) d.classList.add('done');
    else if (i === currentStep) d.classList.add('active');
  });

  document.getElementById('modal-back-btn').style.display = currentStep === 0 ? 'none' : 'block';
  document.getElementById('modal-next-btn').textContent = currentStep === STEPS.length - 1 ? '保存する' : '次へ →';

  step.render();
}

function nextStep() {
  if (currentStep < STEPS.length - 1) {
    currentStep++;
    renderStep();
  } else {
    saveRecord();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

// ===== STEP RENDERERS =====
function renderWellness() {
  const scores = [
    { v: 1, emoji: '😔', label: 'とてもつらい' },
    { v: 2, emoji: '😕', label: 'しんどい' },
    { v: 3, emoji: '😐', label: 'ふつう' },
    { v: 4, emoji: '🙂', label: 'わりと元気' },
    { v: 5, emoji: '😊', label: 'とても元気' },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="score-selector">
      ${scores.map(s => `
        <button class="score-btn ${currentRecord.wellness === s.v ? 'selected' : ''}" onclick="selectWellness(${s.v}, this)">
          ${s.emoji}<span class="score-label">${s.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function selectWellness(v, el) {
  currentRecord.wellness = v;
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}



function renderFood() {
  const foods = ['根菜類', '発酵食品', '温かいもの', '砂糖控え', 'グルテンフリー', 'EPA/DHA', 'ビタミンD', '鉄分', '水2L以上'];
  if (!currentRecord.foodItems) currentRecord.foodItems = [];
  document.getElementById('modal-body').innerHTML = `
    <div class="score-selector" style="margin-bottom:16px;">
      ${[1,2,3,4,5,6,7,8,9,10].map(v => `
        <button class="score-btn ${currentRecord.foodScore === v ? 'selected' : ''}" style="font-size:14px;padding:10px 2px;" onclick="selectFood(${v}, this)">
          ${v}<span class="score-label"></span>
        </button>
      `).join('')}
    </div>
    <div style="font-size:12px;color:var(--ink-light);margin-bottom:10px;">意識した食材（複数OK）</div>
    <div class="chips" id="food-chips">
      ${foods.map(f => `<div class="chip ${currentRecord.foodItems.includes(f) ? 'selected' : ''}" onclick="toggleFoodItem('${f}', this)">${f}</div>`).join('')}
    </div>
  `;
}

function selectFood(v, el) {
  currentRecord.foodScore = v;
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function toggleFoodItem(item, el) {
  if (!currentRecord.foodItems) currentRecord.foodItems = [];
  if (currentRecord.foodItems.includes(item)) {
    currentRecord.foodItems = currentRecord.foodItems.filter(f => f !== item);
    el.classList.remove('selected');
  } else {
    currentRecord.foodItems.push(item);
    el.classList.add('selected');
  }
}

function renderFasting() {
  // バグ05: インデックスではなく実際の値で比較・保存する
  const opts = [
    { label: '記録しない', value: null },
    { label: '12時間',     value: 12 },
    { label: '14時間',     value: 14 },
    { label: '16時間',     value: 16 },
    { label: '18時間以上', value: 18 },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="chips" style="flex-direction:column;gap:8px;">
      ${opts.map(o => `
        <div class="chip ${currentRecord.fasting === o.value ? 'selected' : ''}"
             style="padding:12px 16px;font-size:13px;border-radius:14px;"
             onclick="selectFasting(${o.value === null ? 'null' : o.value}, this)">${o.label}</div>
      `).join('')}
    </div>
  `;
}

function selectFasting(v, el) {
  currentRecord.fasting = v === 'null' ? null : Number(v);
  document.querySelectorAll('.chips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

function renderEmotion() {
  const emotions = [
    { emoji: '🌸', label: '穏やか\n平和', key: '穏やか' },
    { emoji: '✨', label: 'うれしい\n満たされ', key: 'うれしい' },
    { emoji: '🌙', label: '疲れ\n重さ', key: '疲れ' },
    { emoji: '🌊', label: '不安\n緊張', key: '不安' },
    { emoji: '🔥', label: 'イライラ\n焦り', key: 'イライラ' },
    { emoji: '☁️', label: 'ふつう', key: 'ふつう' },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="emotion-grid">
      ${emotions.map(e => `
        <button class="emotion-btn ${currentRecord.emotion === e.key ? 'selected' : ''}" onclick="selectEmotion('${e.key}', this)">
          <span class="emotion-emoji">${e.emoji}</span>
          <span class="emotion-label">${e.label.replace('\n', '<br>')}</span>
        </button>
      `).join('')}
    </div>
    <textarea class="modal-textarea" id="journal-note" placeholder="今日感じたことを自由に…">${currentRecord.note || ''}</textarea>
  `;
}

function selectEmotion(key, el) {
  currentRecord.emotion = key;
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const note = document.getElementById('journal-note');
  if (note) currentRecord.note = note.value;
}

// ===== STEPS ビルダー =====
function buildSteps() {
  var stepCount = 3 + (state.fastingEnabled ? 1 : 0);
  var steps = [
    {
      title: getBodyCheckTitle(),
      label: '1 / ' + stepCount,
      render: renderBodyCheck
    },
    {
      title: '症状と痛みを\n記録しましょう',
      label: '2 / ' + stepCount,
      render: renderSymptomDetail
    },
    {
      title: '今日の気持ちと\nひとことメモ',
      label: '3 / ' + stepCount,
      render: renderEmotion
    }
  ];
  if (state.fastingEnabled) {
    steps.push({
      title: '今日のファスティング',
      label: '4 / 4',
      render: renderFasting
    });
  }
  return steps;
}

// ===== Step1: からだチェック（時間帯・疾患別） =====
function getBodyCheckTitle() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return '今朝のからだの\n状態を教えてください';
  if (hour >= 12 && hour < 17) return '今日のからだは\nどうですか？';
  if (hour >= 17 && hour < 21) return '今日一日\nお疲れさまでした';
  return '今夜のからだの\n状態を教えてください';
}

function renderBodyCheck() {
  var hour = new Date().getHours();
  var diseases = state.myDiseases || [];
  var isMorning = hour >= 5 && hour < 12;
  var isNight   = hour >= 20 || hour < 5;

  var html = '';

  // --- 痛みレベル（全時間帯・SVG顔アイコン） ---
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今日の痛みレベルはどのくらいですか？</div>';
  html += renderPainScale(currentRecord.painLevel, 'painLevel');
  html += '</div>';

  // --- 睡眠の質（朝のみ表示・SVGアイコン） ---
  if (isMorning) {
    html += '<div style="margin-bottom:18px;">';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">昨夜の眠りはどうでしたか？</div>';
    var sleepOpts = [
      { v: 1, icon: 'moon',        label: 'ぐっすり' },
      { v: 2, icon: 'faceGood',    label: 'まあまあ' },
      { v: 3, icon: 'faceNeutral', label: 'あまり眠れず' },
      { v: 4, icon: 'faceBad',     label: 'ほとんど眠れず' }
    ];
    html += '<div class="score-selector">';
    sleepOpts.forEach(function(s) {
      var sel = currentRecord.sleepQuality === s.v;
      var c = sel ? 'var(--rose)' : '#9a8e88';
      html += '<button class="score-btn' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckItem(\'sleepQuality\',' + s.v + ',this)">'
        + ICONS[s.icon](18, c) + '<span class="score-label">' + s.label + '</span></button>';
    });
    html += '</div></div>';
  }

  // --- エネルギー（全時間帯・SVGアイコン） ---
  html += '<div style="margin-bottom:18px;">';
  if (isMorning) {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今朝、からだはどんな感じですか？</div>';
  } else if (isNight) {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今日一日、からだはどうでしたか？</div>';
  } else {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今の体の状態を教えてください</div>';
  }
  var energyOpts = [
    { v: 5, icon: 'sun',          label: 'エネルギーがある' },
    { v: 4, icon: 'faceGood',     label: 'まあまあ元気' },
    { v: 3, icon: 'faceNeutral',  label: 'ふつう' },
    { v: 2, icon: 'faceBad',      label: '疲れている' },
    { v: 1, icon: 'faceVeryBad',  label: 'とても疲れている' }
  ];
  html += '<div class="score-selector">';
  energyOpts.forEach(function(s) {
    var sel = currentRecord.energy === s.v;
    var c = sel ? 'var(--rose)' : '#9a8e88';
    html += '<button class="score-btn' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckItem(\'energy\',' + s.v + ',this)">'
      + ICONS[s.icon](18, c) + '<span class="score-label">' + s.label + '</span></button>';
  });
  html += '</div></div>';

  // --- 疾患別の追加質問（1問のみ） ---
  var extraQ = getDiseaseMorningQuestion(diseases, isMorning, isNight);
  if (extraQ) {
    html += '<div style="margin-bottom:18px;">';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">' + extraQ.question + '</div>';
    html += '<div class="chips">';
    extraQ.options.forEach(function(opt) {
      var sel = (currentRecord.extraAnswer || '') === opt;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckExtra(\'' + opt.replace(/'/g, "\\'") + '\',this)">' + opt + '</div>';
    });
    html += '</div></div>';
  }

  document.getElementById('modal-body').innerHTML = html;
}

function selectBodyCheckItem(field, value, el) {
  currentRecord[field] = value;
  var group = el.closest('.score-selector');
  if (group) group.querySelectorAll('.score-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
}

function selectBodyCheckExtra(value, el) {
  currentRecord.extraAnswer = value;
  var group = el.closest('.chips');
  if (group) group.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
}

// ===== 疾患別追加質問 =====
function getDiseaseMorningQuestion(diseases, isMorning, isNight) {
  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (isMorning) return {
      question: '朝起きたとき、骨盤周りの痛みはありましたか？',
      options: ['なかった', '少しあった', 'かなりあった', '起きるのがつらかった']
    };
    if (isNight) return {
      question: '今日一日の骨盤の痛みのピークはいつでしたか？',
      options: ['なかった', '朝', '午後', '夕方以降', '常にあった']
    };
    return {
      question: '今の骨盤周りの状態は？',
      options: ['楽', '少し重い', '痛みがある', 'かなり痛い']
    };
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (isMorning) return {
      question: '今朝の基礎体温を計りましたか？',
      options: ['計った（記録欄に入力）', '忘れた', '今日は計らない']
    };
    return {
      question: '今日の食欲はどうでしたか？',
      options: ['ふつう', '少し多め', 'かなり多め', '少なめ']
    };
  }
  if (diseases.indexOf('子宮筋腫') !== -1) {
    if (isMorning) return {
      question: '今朝、下腹部の圧迫感はありましたか？',
      options: ['なかった', '少しあった', 'かなりあった']
    };
    return {
      question: '今日の経血量は（生理中の場合）？',
      options: ['生理中ではない', '少ない', 'ふつう', '多い', 'とても多い']
    };
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (isMorning) return {
      question: '今朝の気分はどうですか？',
      options: ['穏やか', 'すこし不安定', 'かなり不安定', 'とても辛い']
    };
    return {
      question: '今日、感情のコントロールは難しかったですか？',
      options: ['問題なかった', '少し難しかった', 'かなり難しかった', 'とても辛かった']
    };
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (isMorning) return {
      question: '昨夜、寝汗やほてりで目が覚めましたか？',
      options: ['なかった', '1回あった', '2〜3回あった', '何度も目が覚めた']
    };
    return {
      question: '今日のほてり・のぼせはありましたか？',
      options: ['なかった', '少しあった', 'かなりあった', 'とても辛かった']
    };
  }
  if (diseases.indexOf('卵巣嚢腫') !== -1) {
    return {
      question: '今日、片側の腹部に違和感はありましたか？',
      options: ['なかった', '左側に少し', '右側に少し', 'どちらかにかなり', '強い痛みがあった']
    };
  }
  // 疾患未設定のデフォルト
  if (isMorning) return {
    question: '今日一日の予定を考えると、からだの状態は？',
    options: ['問題なさそう', '少し心配', 'かなり心配', '無理せず休みたい']
  };
  return null;
}

// ===== 今日のヒントカード（時間帯・疾患別） =====
function updateDailyHintCard() {
  var container = document.getElementById('today-message');
  if (!container) return;

  var hour     = new Date().getHours();
  var diseases = state.myDiseases || [];
  var isMorning = hour >= 5  && hour < 12;
  var isNight   = hour >= 20 || hour < 5;

  var hint = getDailyHint(diseases, isMorning, isNight);
  if (!hint) return;

  container.innerHTML =
    '<div style="border-left:3px solid var(--rose);padding-left:10px;">'
    + '<div style="font-size:10px;color:var(--rose);font-weight:500;margin-bottom:3px;">' + hint.label + '</div>'
    + '<div style="font-size:12px;color:var(--ink);line-height:1.7;">' + hint.text + '</div>'
    + '</div>';
}

function getDailyHint(diseases, isMorning, isNight) {
  var d = new Date().getDay();

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (isMorning) return { label: '💡 今日のケア', text: '骨盤を温めると血流が改善し、痛みが和らぐことがあります。今日も無理せず過ごしましょう。' };
    if (isNight)   return { label: '🌙 夜のケア',   text: '就寝前の軽いストレッチが骨盤のこわばりをやわらげます。今日の症状を記録しておきましょう。' };
    return { label: '📊 記録のヒント', text: '痛みの部位・性質・強さを記録すると、診察時に医師へ正確に伝えられます。' };
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (isMorning) return { label: '🌡 基礎体温', text: '毎朝同じ時間に基礎体温を測ると、排卵のパターンが見えてきます。' };
    if (isNight)   return { label: '🍽 食事メモ', text: '血糖値の急上昇を避けると、PCOSの症状管理に役立つことがあります。今日の食事を記録しましょう。' };
    return { label: '💡 今日のヒント', text: '適度な有酸素運動はインスリン抵抗性の改善に役立つと言われています。' };
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (isMorning) return { label: '🌸 今日の気分', text: 'PMSの症状は生理前7〜14日に出やすいです。今日の気分の変化も記録しておきましょう。' };
    if (isNight)   return { label: '🌙 夜のケア',   text: '生理前は睡眠の質が落ちやすい時期です。スマートフォンの画面は早めに閉じましょう。' };
    return { label: '💡 気分の記録', text: '気分の波をパターンとして記録すると、PMSとPMDDの違いが見えてきます。' };
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (isMorning) return { label: '🌡 今朝のチェック', text: 'ほてりや寝汗の有無を毎朝記録すると、症状の変化のパターンがわかります。' };
    if (isNight)   return { label: '🌙 夜のケア',       text: '寝室を涼しくしておくと、夜間のほてりや寝汗が軽減されることがあります。' };
    return { label: '💡 SMIチェック', text: '更年期指数（SMI）の記録を続けると、症状の改善・悪化が数値でわかります。' };
  }

  var defaults = {
    morning: [
      { label: '🌸 今日も一歩', text: '今日の記録が、未来の診察を変えます。まず症状チップをタップしてみましょう。' },
      { label: '💡 記録のコツ', text: '毎日同じ時間に記録すると、からだのパターンが見えやすくなります。' }
    ],
    night: [
      { label: '🌙 お疲れさまでした', text: '今日の症状を記録して、一日を締めくくりましょう。' },
      { label: '📊 今日の振り返り',   text: '今日気になったことがあれば、メモ欄に残しておくと診察で役立ちます。' }
    ],
    day: [
      { label: '💡 記録の習慣', text: '30日記録を続けると、あなただけの症状パターンが見えてきます。' },
      { label: '🏥 診察の準備', text: '症状の記録が7日分たまったら、医師向けレポートを作成できます。' }
    ]
  };
  var pool = isMorning ? defaults.morning : isNight ? defaults.night : defaults.day;
  return pool[d % pool.length];
}

// ===== 症状詳細展開UI（Step2） =====
function renderSymptomDetail() {
  var prioritized = [];
  var diseases = state.myDiseases || [];
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (prioritized.indexOf(s) === -1) prioritized.push(s);
    });
  });
  var userSymptoms = state.mySymptoms || [];
  userSymptoms.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });
  var defaults = ['下腹部痛', '腰痛', '頭痛', '骨盤痛', 'だるさ', '不正出血', '吐き気', 'むくみ', 'おりもの', '気分の落ち込み', 'イライラ'];
  defaults.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });

  if (!currentRecord.symptoms) currentRecord.symptoms = [];
  if (!currentRecord.symptomDetails) currentRecord.symptomDetails = {};

  var html = '';
  html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:10px;">今日の症状（複数選択可）</div>';
  html += '<div class="chips" id="sd-chips" style="margin-bottom:16px;">';
  prioritized.slice(0, 12).forEach(function(s) {
    var sel = currentRecord.symptoms.indexOf(s) !== -1;
    html += '<div class="chip' + (sel ? ' selected' : '') + '" '
      + 'onclick="toggleSymptomChip(\'' + s.replace(/'/g, "\\'") + '\', this)" '
      + 'style="transition:all 0.2s;">'
      + s + '</div>';
  });
  html += '</div>';
  html += '<div id="sd-details"></div>';

  document.getElementById('modal-body').innerHTML = html;

  // 既に選択済みのものは詳細を展開
  currentRecord.symptoms.forEach(function(s) {
    appendSymptomDetail(s);
  });
}

function toggleSymptomChip(symptomName, el) {
  if (!currentRecord.symptoms) currentRecord.symptoms = [];
  var idx = currentRecord.symptoms.indexOf(symptomName);
  if (idx !== -1) {
    currentRecord.symptoms.splice(idx, 1);
    el.classList.remove('selected');
    var safeId = 'sd-detail-' + symptomName.replace(/[^a-zA-Z0-9]/g, '_');
    var detail = document.getElementById(safeId);
    if (detail) {
      detail.style.maxHeight = detail.scrollHeight + 'px';
      requestAnimationFrame(function() {
        detail.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
        detail.style.maxHeight = '0';
        detail.style.opacity = '0';
        setTimeout(function() { if (detail.parentNode) detail.remove(); }, 300);
      });
    }
  } else {
    currentRecord.symptoms.push(symptomName);
    el.classList.add('selected');
    appendSymptomDetail(symptomName);
  }
}

function appendSymptomDetail(symptomName) {
  var cfg = SYMPTOM_DETAIL_CONFIG[symptomName];
  if (!cfg) return;

  var container = document.getElementById('sd-details');
  if (!container) return;
  var safeId = 'sd-detail-' + symptomName.replace(/[^a-zA-Z0-9]/g, '_');
  if (document.getElementById(safeId)) return;

  if (!currentRecord.symptomDetails) currentRecord.symptomDetails = {};
  if (!currentRecord.symptomDetails[symptomName]) currentRecord.symptomDetails[symptomName] = {};
  var detail = currentRecord.symptomDetails[symptomName];

  var html = '<div id="' + safeId + '" style="background:var(--cream);border-radius:14px;padding:14px;margin-bottom:10px;border-left:3px solid var(--rose);max-height:0;opacity:0;overflow:hidden;">';
  html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:10px;">| DETAIL<br>' + symptomName + 'の詳細</div>';

  // 位置・量選択
  if (cfg.positions && cfg.positions.length > 0) {
    var posLabel = symptomName === 'おりもの' ? '量' : '痛みの位置';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + posLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.positions.forEach(function(pos) {
      var sel = (detail.positions || []).indexOf(pos) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'positions\',\'' + pos.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + pos + '</div>';
    });
    html += '</div>';
  }

  // 種類選択
  if (cfg.types && cfg.types.length > 0) {
    var typesLabel = symptomName === 'おりもの' ? 'おりものの状態' : '痛みの種類';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + typesLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.types.forEach(function(type) {
      var sel = (detail.types || []).indexOf(type) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'types\',\'' + type.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + type + '</div>';
    });
    html += '</div>';
  }

  // タイミング選択
  if (cfg.timing && cfg.timing.length > 0) {
    var timingLabel = symptomName === 'おりもの' ? 'その他の症状' : 'タイミング';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + timingLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.timing.forEach(function(t) {
      var sel = (detail.timing || []).indexOf(t) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'timing\',\'' + t.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + t + '</div>';
    });
    html += '</div>';
  }

  // 注記（おりものなど）
  if (cfg.note) {
    html += '<div style="font-size:10px;color:var(--ink-light);background:rgba(184,112,122,0.07);border-radius:8px;padding:8px 10px;margin-bottom:10px;">ℹ️ ' + cfg.note + '</div>';
  }

  // 排便回数
  if (cfg.bowelCount) {
    var bowelVal = detail.bowelCount || 0;
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">今日の排便回数</div>';
    html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
    for (var i = 0; i <= 5; i++) {
      html += '<button onclick="selectBowelCount(\'' + symptomName.replace(/'/g, "\\'") + '\',' + i + ',this)" '
        + 'style="width:36px;height:36px;border-radius:50%;border:1.5px solid '
        + (bowelVal === i ? 'var(--rose)' : '#e8ddd8') + ';'
        + 'background:' + (bowelVal === i ? 'var(--rose-pale)' : 'var(--white)') + ';'
        + 'font-size:12px;font-weight:500;color:var(--ink);cursor:pointer;transition:all 0.15s;">'
        + (i === 0 ? 'なし' : i) + '</button>';
    }
    html += '</div>';
  }

  // 強さスライダー
  if (cfg.hasSlider) {
    var sliderLabel = cfg.sliderLabel || '痛みの強さ';
    var sliderVal = detail.intensity !== undefined ? detail.intensity : 0;
    var pct = Math.round(sliderVal / 10 * 100);
    var labels = ['なし', '軽い', '中程度', '強い', '激痛'];
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<div style="font-size:11px;color:var(--ink-light);">' + sliderLabel + '</div>';
    html += '<div style="font-size:13px;font-weight:600;color:var(--rose);" id="slider-val-' + safeId + '">' + sliderVal + '<span style="font-size:10px;font-weight:400;color:var(--ink-light);">/10</span></div>';
    html += '</div>';
    html += '<input type="range" min="0" max="10" value="' + sliderVal + '" '
      + 'style="width:100%;height:4px;margin-bottom:8px;background:linear-gradient(to right,var(--rose) 0%,var(--rose) ' + pct + '%,#e8ddd8 ' + pct + '%,#e8ddd8 100%);" '
      + 'oninput="updateSliderDetail(\'' + symptomName.replace(/'/g, "\\'") + '\',this.value,\'' + safeId + '\',this)">';
    html += '<div style="display:flex;justify-content:space-between;">';
    labels.forEach(function(l) {
      html += '<span style="font-size:9px;color:var(--ink-light);">' + l + '</span>';
    });
    html += '</div>';
    html += '<div style="margin-top:10px;background:rgba(184,112,122,0.08);border-radius:8px;padding:8px 10px;font-size:10px;color:var(--ink-light);">💡 ' + symptomName + 'の記録が症状の変化の把握に役立ちます</div>';
  }

  html += '</div>';
  container.insertAdjacentHTML('beforeend', html);

  var el = document.getElementById(safeId);
  if (el) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.transition = 'max-height 0.35s ease, opacity 0.35s ease';
        el.style.maxHeight = '700px';
        el.style.opacity = '1';
      });
    });
  }
}

function toggleDetailItem(symptomName, field, value, el) {
  if (!currentRecord.symptomDetails) currentRecord.symptomDetails = {};
  if (!currentRecord.symptomDetails[symptomName]) currentRecord.symptomDetails[symptomName] = {};
  var detail = currentRecord.symptomDetails[symptomName];
  if (!detail[field]) detail[field] = [];
  var idx = detail[field].indexOf(value);
  if (idx !== -1) {
    detail[field].splice(idx, 1);
    el.classList.remove('selected');
  } else {
    detail[field].push(value);
    el.classList.add('selected');
  }
}

function updateSliderDetail(symptomName, value, safeId, sliderEl) {
  if (!currentRecord.symptomDetails) currentRecord.symptomDetails = {};
  if (!currentRecord.symptomDetails[symptomName]) currentRecord.symptomDetails[symptomName] = {};
  currentRecord.symptomDetails[symptomName].intensity = parseInt(value);
  var valEl = document.getElementById('slider-val-' + safeId);
  if (valEl) valEl.innerHTML = value + '<span style="font-size:10px;font-weight:400;color:var(--ink-light);">/10</span>';
  // スライダー背景グラデーション更新
  if (sliderEl) {
    var pct = Math.round(parseInt(value) / 10 * 100);
    sliderEl.style.background = 'linear-gradient(to right, var(--rose) 0%, var(--rose) ' + pct + '%, #e8ddd8 ' + pct + '%, #e8ddd8 100%)';
  }
}

function selectBowelCount(symptomName, count, el) {
  if (!currentRecord.symptomDetails) currentRecord.symptomDetails = {};
  if (!currentRecord.symptomDetails[symptomName]) currentRecord.symptomDetails[symptomName] = {};
  currentRecord.symptomDetails[symptomName].bowelCount = count;
  var parent = el.parentNode;
  parent.querySelectorAll('button').forEach(function(b) {
    b.style.background = 'var(--white)';
    b.style.borderColor = '#e8ddd8';
  });
  el.style.background = 'var(--rose-pale)';
  el.style.borderColor = 'var(--rose)';
}

// ===== SAVE RECORD =====
function saveRecord() {
  const noteEl = document.getElementById('journal-note');
  if (noteEl) currentRecord.note = noteEl.value;
  // Object schema を排除: consumer は全て Array schema (三カード) を前提とする
  delete currentRecord.symptomDetails;

  // ★ 編集モードの場合は編集対象日を使用
  if (state.editingDate) {
    currentRecord.date = new Date(state.editingDate).toISOString();
    currentRecord.record_date = state.editingDate;
    
    // 既存の記録を上書き
    var editIdx = state.records.findIndex(function(r) {
      return (r.record_date || (r.date && r.date.slice(0,10))) === state.editingDate;
    });
    if (editIdx !== -1) {
      state.records[editIdx] = currentRecord;
    } else {
      state.records.push(currentRecord);
    }
    
    state.editingDate = null; // 編集モード解除
    
    saveAndSync();
    closeModal();
    updateStats();
    updateUnlock();
    updateHistory();
    buildCalendar();
    document.getElementById('success-message').innerHTML = '記録を更新しました。';
document.getElementById('success-overlay').classList.add('active');
    return;
  }
  
  currentRecord.date = new Date().toISOString();

  // Check if already recorded today (BEFORE push)
  const today = new Date().toDateString();
  const alreadyToday = state.records.some(r => new Date(r.date).toDateString() === today);

  // Streak logic (BEFORE push, so yesterday check is not polluted by today's record)
  if (!alreadyToday) {
    state.totalDays++;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toDateString();
    const hadYesterday = state.records.some(r => new Date(r.date).toDateString() === yStr);
    if (hadYesterday || state.streak === 0) {
      state.streak++;
    } else if (!hadYesterday && state.streak > 0) {
      state.streak = 1;
    }
  }

  // Push after all checks (prevent duplicate accumulation on same day)
  if (!alreadyToday) {
    state.records.push(currentRecord);
  } else {
    // Overwrite today's record instead of appending
    const idx = state.records.findLastIndex
      ? state.records.findLastIndex(r => new Date(r.date).toDateString() === today)
      : state.records.reduce((acc, r, i) => new Date(r.date).toDateString() === today ? i : acc, -1);
    if (idx !== -1) state.records[idx] = currentRecord;
    else state.records.push(currentRecord);
  }

  saveAndSync();
  closeModal();
  updateStats();
  updateUnlock();
  updateHistory();
  buildCalendar();
  updateHomeCTA();
  if (typeof updateHomeCTAState === 'function') updateHomeCTAState();
  if (typeof updateStreakBadge === 'function') updateStreakBadge();
  if (typeof checkAndShowTempAlert === 'function') checkAndShowTempAlert();

  // パーソナライズされた成功メッセージ
  var latestRecord = (state.records || []).slice().reverse().find(function(r) {
    return r.date && r.date.slice(0, 10) === new Date().toISOString().slice(0, 10);
  });
  var successResult = getSuccessMessage(latestRecord);
  document.getElementById('success-emoji').innerHTML = successResult.icon || ICONS.check(32, 'var(--rose)');
  document.getElementById('success-title').textContent = successResult.title;
  document.getElementById('success-message').textContent = successResult.msg;
  document.getElementById('success-overlay').classList.add('active');
}

// ===== パーソナライズされた記録完了メッセージ =====
function getSuccessMessage(record) {
  var streak = state.streak || 0;
  var pain = record && record.painLevel !== undefined ? record.painLevel : -1;

  var iconSvg = ICONS.check(32, 'var(--rose)');
  var title = '記録できました';
  var msg = '今日もからだの声を聴いてくれてありがとう。';

  // 連続記録マイルストーン
  if (streak === 7)  { iconSvg = ICONS.star(32, 'var(--gold)'); title = '7日連続達成！'; msg = '1週間、続けられました。パターンが見え始めてきます。'; }
  else if (streak === 14) { iconSvg = ICONS.star(32, 'var(--gold)'); title = '2週間連続！'; msg = 'この記録が、次の診察を変えてくれます。'; }
  else if (streak === 30) { iconSvg = ICONS.star(32, 'var(--gold)'); title = '1ヶ月達成！'; msg = 'AIパターン解析でこの30日間を振り返りましょう。'; }

  // 痛みがある日
  else if (pain >= 3) { iconSvg = ICONS.heart(32, 'var(--rose)'); title = '記録できました'; msg = 'つらい日も記録してくれてありがとう。この積み重ねが大切です。'; }
  else if (pain === 0) { iconSvg = ICONS.sun(32, 'var(--gold)'); title = '今日は楽な日ですね'; msg = 'こういう日のデータも、パターン発見に役立ちます。'; }

  return { icon: iconSvg, title: title, msg: msg };
}

function closeSuccess() {
  if (window.__ippoSuccessOverlayTimer) {
    clearTimeout(window.__ippoSuccessOverlayTimer);
    window.__ippoSuccessOverlayTimer = null;
  }
  var overlay = document.getElementById('success-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.opacity = '';
  }
}

// ===== MISC =====
function shareApp() {
  if (navigator.share) {
    navigator.share({
      title: 'ippo - 卵巣ケア記録アプリ',
      text: '生理周期・卵巣ケアのセルフ記録アプリです。一緒に続けましょう！',
      url: window.location.href
    });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      showAlertModal('URLをコピーしました！友だちに送ってください。');
    });
  }
}

function addToHome() {
  showAlertModal('ブラウザの「ホーム画面に追加」からアプリとして追加できます。<br>iOS: 共有ボタン → 「ホーム画面に追加」<br>Android: メニュー → 「ホーム画面に追加」');
  // バグ18: フラグを保存してリロード後も非表示を維持
  try { localStorage.setItem('ippo_hide_add_home', '1'); } catch(e) {}
  document.getElementById('add-home-banner').style.display = 'none';
}

function setGraphTab(tab, el) {
  document.querySelectorAll('.sg-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // バグ12: タブ切替に応じてオーバーレイとグラフタイトルを更新
  const labelMap = { '7d': '7日間', '30d': '30日間', '90d': '90日間' };
  const needDays = { '7d': 7, '30d': 30, '90d': 90 };
  const required = needDays[tab] || 7;
  const overlay = document.getElementById('graph-overlay');
  const titleEl = document.querySelector('.sg-title');
  if (titleEl) titleEl.textContent = `からだのリズム（${labelMap[tab]}）`;
  if (overlay) {
    if (state.totalDays >= required) {
      overlay.style.display = 'none';
    } else {
      overlay.style.display = 'flex';
      const sub = overlay.querySelector('.demo-overlay-sub');
      if (sub) sub.textContent = `${required}日間記録すると表示されます（現在${state.totalDays}日）`;
    }
  }
}

function setRating(n) {
  state.rating = n;
  document.querySelectorAll('.fb-star').forEach((s, i) => {
    s.classList.toggle('active', i < n);
  });
}

  // ===== 症状設定 =====
var ALL_SYMPTOMS = ['頭痛','腰痛','肩こり','むくみ','冷え','便秘','下痢','肌荒れ','不眠','眠気','イライラ','不安感','食欲増加','食欲不振','胸の張り','下腹部痛','めまい','吐き気','倦怠感','関節痛'];

function openSymptomSettings(){
  var saved = state.mySymptoms || [];
  var container = document.getElementById('symptomSettingsChips');
  container.innerHTML = '';
  for(var i = 0; i < ALL_SYMPTOMS.length; i++){
    var s = ALL_SYMPTOMS[i];
    var selected = saved.indexOf(s) !== -1;
    var chip = document.createElement('span');
    chip.className = 'chip' + (selected ? ' selected' : '');
    chip.setAttribute('data-val', s);
    chip.textContent = s;
    chip.onclick = function(){ this.classList.toggle('selected'); };
    container.appendChild(chip);
  }
  var overlay = document.getElementById('symptomSettingsOverlay');
  overlay.style.display = 'flex';
}

function closeSymptomSettings(){
  document.getElementById('symptomSettingsOverlay').style.display = 'none';
}

function saveSymptomSettings(){
  var selected = [];
  document.querySelectorAll('#symptomSettingsChips .chip.selected').forEach(function(c){
    selected.push(c.getAttribute('data-val'));
  });
  state.mySymptoms = selected;
  saveState();
  var display = document.getElementById('symptom-setting-display');
  if(display){
    display.textContent = selected.length ? selected.join('・') : '設定する';
  }
  closeSymptomSettings();
  updateRecordSymptoms();
}

// ===== ホーム画面サマリー =====
function updateHomeSummary(){
  var container = document.getElementById('home-summary');
  var content = document.getElementById('summary-content');
  var status = document.getElementById('summary-status');
  if(!container || !content || !status) return;

  var todayStr = new Date().toDateString();
  var rec = null;
  for(var i=0; i<state.records.length; i++){
    if(new Date(state.records[i].date).toDateString() === todayStr){ rec = state.records[i]; break; }
  }

  container.style.display = 'block';

  if(!rec){
    status.textContent = '未記録';
    content.innerHTML =
      '<div style="text-align:center;padding:22px 0 10px;">'
      + '<div style="font-size:38px;margin-bottom:10px;">📋</div>'
      + '<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:5px;">まだ今日の記録がありません</div>'
      + '<div style="font-size:11px;color:var(--ink-light);line-height:1.6;">中央の ＋ ボタンから<br>今日の体調を入力しましょう</div>'
      + '</div>';
    return;
  }

  status.textContent = '記録済み ✓';

  // 食事データ解析（飲み物除外）
  var drinkPattern = /飲み物|飲料|お水|水分|コーヒー|カフェラテ|カプチーノ|エスプレッソ|お茶|緑茶|麦茶|ほうじ茶|煎茶|玄米茶|番茶|紅茶|ハーブティー|ルイボス|ジュース|スムージー|牛乳|豆乳|ヨーグルト飲料|ラッシー|スポーツドリンク|ポカリ|アクエリ|アミノ酸|コーラ|サイダー|炭酸水|ソーダ|トニック|レモネード|甘酒|昆布水/;
  var mealLines = (rec.mealFree || '').split('\n').filter(function(l){return l.trim();});
  var allSlots = [];
  var foodSlots = [];
  mealLines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    var timeMatch = line.match(/(\d{1,2}):?(\d{2})/);
    var time = timeMatch ? ('0'+parseInt(timeMatch[1])).slice(-2)+':'+timeMatch[2] : '';
    var food = line.replace(/\d{1,2}:?\d{2}\s*/, '').trim();
    var items = food.split(/[、,\/\s]+/).filter(function(s){ return s; });
    var drinkItems = items.filter(function(s){ return drinkPattern.test(s); });
    var isDrinkOnly = drinkItems.length > 0 && drinkItems.length >= items.length;
    allSlots.push({time:time, food:food, isDrink:isDrinkOnly});
    if(!isDrinkOnly) foodSlots.push({time:time, food:food});
  });

  var parsed = parseMealMemo(rec.mealFree);
  var mealCount = parsed ? parsed.mealCount : 0;
  var fastH = parsed ? parsed.fastingHours : 0;
  var goalH = state.fastingGoal || 16;
  var eatH = 24 - fastH;

  var html = '';

  // ① 痛みスコア（最上部・大きく表示）
  var painLevel = rec.painLevel !== null && rec.painLevel !== undefined ? rec.painLevel : -1;
  if (painLevel >= 0) {
    var painEmoji = ['😊','🙂','😐','😣','😭'][Math.min(Math.floor(painLevel / 2), 4)];
    var painLabels = ['痛みなし','軽い痛み','中程度','強い痛み','とても強い'];
    var painLabelIdx = painLevel === 0 ? 0 : painLevel <= 2 ? 1 : painLevel <= 5 ? 2 : painLevel <= 8 ? 3 : 4;
    var painColor = painLevel === 0 ? '#639922' : painLevel <= 2 ? '#ba7517' : painLevel <= 5 ? '#c4878c' : '#993556';
    html += '<div style="display:flex;align-items:center;gap:12px;background:var(--cream);border-radius:14px;padding:12px 16px;margin-bottom:12px;">';
    html += '<div style="font-size:28px;">' + painEmoji + '</div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:2px;">今日の痛み</div>';
    html += '<div style="font-size:15px;font-weight:600;color:' + painColor + ';">' + painLabels[painLabelIdx] + '</div>';
    html += '</div>';
    var painPct = Math.round(painLevel / 10 * 100);
    html += '<div style="width:60px;">';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;">';
    html += '<div style="height:100%;width:' + painPct + '%;background:' + painColor + ';border-radius:3px;transition:width 0.5s;"></div>';
    html += '</div>';
    html += '<div style="font-size:9px;color:var(--ink-light);text-align:right;margin-top:3px;">' + painLevel + '/10</div>';
    html += '</div>';
    html += '</div>';
  }

  // ② 症状チップ
  var sympChips = [];
  if(rec.symptoms && rec.symptoms.length) sympChips = sympChips.concat(rec.symptoms);
  if(rec.bloodClot && rec.bloodClot.length) sympChips = sympChips.concat(rec.bloodClot.map(function(b){return '🩸 '+b;}));
  if(rec.bloodColor && rec.bloodColor.length) sympChips = sympChips.concat(rec.bloodColor);
  if(sympChips.length){
    html += '<div style="margin-bottom:12px;">';
    html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:6px;">今日の症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:5px;">';
    sympChips.forEach(function(s){
      html += '<span style="font-size:11px;background:var(--rose-pale);color:var(--rose);border-radius:12px;padding:3px 10px;">'+s+'</span>';
    });
    html += '</div></div>';
  }

  // ③ バイタル指標ピル行
  var vitals = [];
  if(rec.temperature) vitals.push({icon:'🌡', label: rec.temperature+'℃', color:'#d4a574', bg:'#fdf5ec'});
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') vitals.push({icon:'🌸', label: rec.menstrualCycle, color:'#c4878c', bg:'#fdf0f2'});
  if(rec.energy) vitals.push({icon:'⚡', label:'元気 '+rec.energy+'/5', color:'#d4a574', bg:'#fdf5ec'});
  if(rec.sleepHours) vitals.push({icon:'😴', label:'睡眠 '+rec.sleepHours+'h', color:'#7ba3c4', bg:'#eef4fb'});
  if(vitals.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">';
    vitals.forEach(function(v){
      html += '<div style="display:flex;align-items:center;gap:5px;background:'+v.bg+';border-radius:20px;padding:5px 10px;">';
      html += '<span style="font-size:12px;">'+v.icon+'</span>';
      html += '<span style="font-size:11px;font-weight:600;color:'+v.color+';">'+v.label+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ④ 食事タイムライン（折りたたみ）
  var hasMealData = !!(rec.mealFree && rec.mealFree.trim());
  if (hasMealData || state.fastingEnabled) {
    var mealToggleId = 'meal-acc-' + Date.now();
    html += '<div style="border-top:0.5px solid var(--rose-light);margin-bottom:12px;padding-top:10px;">';
    html += '<button onclick="(function(){var c=document.getElementById(\'' + mealToggleId + '\');var a=document.getElementById(\'' + mealToggleId + '-arrow\');if(c.style.display===\'none\'){c.style.display=\'block\';a.textContent=\'▲\';}else{c.style.display=\'none\';a.textContent=\'▼\';}})()" '
      + 'style="width:100%;display:flex;justify-content:space-between;align-items:center;background:none;border:none;padding:0;cursor:pointer;font-family:\'Noto Sans JP\',sans-serif;">';
    html += '<span style="font-size:12px;color:var(--ink-light);">食事の記録を見る</span>';
    html += '<span id="' + mealToggleId + '-arrow" style="font-size:10px;color:var(--ink-light);">▼</span>';
    html += '</button>';
    html += '<div id="' + mealToggleId + '" style="display:none;margin-top:12px;">';
    // ドーナツチャート + タイムライン（既存のまま）
    (function(){
      var circumference = 2 * Math.PI * 46;
      html += '<div style="display:flex;align-items:center;gap:18px;margin-bottom:16px;">';
      html += '<div style="position:relative;width:108px;height:108px;flex-shrink:0;">';
      html += '<svg width="108" height="108" viewBox="0 0 108 108" style="transform:rotate(-90deg)">';
      html += '<circle cx="54" cy="54" r="46" fill="none" stroke="var(--cream)" stroke-width="9"/>';
      foodSlots.forEach(function(slot){
        if(!slot.time) return;
        var parts = slot.time.split(':');
        var h = parseInt(parts[0]);
        var m = parseInt(parts[1]) || 0;
        var hourDecimal = h + m / 60;
        var arcLen = circumference / 24 * 1.2;
        var dashGap = circumference - arcLen;
        var offset = -(hourDecimal / 24 * circumference);
        var dotColor;
        if(h >= 5 && h < 10) dotColor = '#d4a574';
        else if(h >= 10 && h < 14) dotColor = '#6b9e78';
        else if(h >= 17 && h < 22) dotColor = '#c4878c';
        else dotColor = '#7ba3c4';
        html += '<circle cx="54" cy="54" r="46" fill="none" stroke="'+dotColor+'" stroke-width="9" stroke-dasharray="'+arcLen.toFixed(1)+' '+dashGap.toFixed(1)+'" stroke-dashoffset="'+offset.toFixed(1)+'" stroke-linecap="round"/>';
      });
      html += '</svg>';
      html += '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">';
      if(fastH > 0){
        html += '<div style="font-family:Inter,sans-serif;font-size:19px;font-weight:700;color:var(--ink);line-height:1;">'+fastH+'</div>';
        html += '<div style="font-size:8px;color:var(--ink-light);margin-top:1px;">時間断食</div>';
      } else if(mealCount > 0){
        html += '<div style="font-family:Inter,sans-serif;font-size:19px;font-weight:700;color:var(--ink);line-height:1;">'+mealCount+'</div>';
        html += '<div style="font-size:8px;color:var(--ink-light);margin-top:1px;">食</div>';
      } else {
        html += '<div style="font-size:10px;color:var(--ink-light);">飲み物<br>のみ</div>';
      }
      html += '</div></div>';
      html += '<div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:0;">';
      if(allSlots.length){
        var showMax = Math.min(allSlots.length, 6);
        for(var si=0;si<showMax;si++){
          var slot = allSlots[si];
          var slotH = slot.time ? parseInt(slot.time.split(':')[0]) : 0;
          var dotColor;
          if(slotH >= 5 && slotH < 10) dotColor = '#d4a574';
          else if(slotH >= 10 && slotH < 14) dotColor = '#6b9e78';
          else if(slotH >= 17 && slotH < 22) dotColor = '#c4878c';
          else dotColor = '#7ba3c4';
          var rowOpacity = slot.isDrink ? '0.45' : '1';
          html += '<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--cream);opacity:'+rowOpacity+';">';
          html += '<div style="width:7px;height:7px;border-radius:50%;background:'+dotColor+';flex-shrink:0;"></div>';
          html += '<span style="font-size:11px;color:var(--ink-light);flex-shrink:0;min-width:36px;">'+(slot.time||'')+'</span>';
          html += '<span style="font-size:12px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+slot.food+'</span>';
          html += '</div>';
        }
        if(allSlots.length > 6){
          html += '<div style="font-size:10px;color:var(--ink-light);padding-top:4px;">他 '+(allSlots.length-6)+'件</div>';
        }
      } else if(mealCount > 0){
        html += '<div style="font-size:12px;color:var(--ink-mid);">🍽 '+mealCount+'食 記録済み</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--ink-light);">食事記録なし</div>';
      }
      html += '</div>';
      html += '</div>';
    })();
    html += '</div></div>';
  }

  // ⑤ 疾患チェック（なし以外）
  if(rec.diseaseCheck && Object.keys(rec.diseaseCheck).length){
    var dcEntries = [];
    var dc = rec.diseaseCheck;
    var _fallbackDisease = (rec.diseases && rec.diseases[0]) || (state.myDiseases && state.myDiseases[0]) || '';
    Object.keys(dc).forEach(function(key){
      if(dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey = parts.length > 1 ? parts[0] : _fallbackDisease;
      var qId = parts.length > 1 ? parts[1] : key;
      var qCfg = typeof DISEASE_CONFIG !== 'undefined' ? DISEASE_CONFIG[dKey] : null;
      var label = qId;
      if(qCfg && qCfg.questions){
        for(var qi=0;qi<qCfg.questions.length;qi++){
          if(qCfg.questions[qi].id === qId){ label = qCfg.questions[qi].text.replace('？',''); break; }
        }
      }
      dcEntries.push(label+': '+dc[key]);
    });
    if(dcEntries.length){
      html += '<div style="margin-bottom:12px;">';
      html += '<div style="font-size:11px;font-weight:700;color:var(--ink-light);letter-spacing:0.05em;margin-bottom:7px;">疾患チェック</div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      dcEntries.forEach(function(e){
        html += '<span style="font-size:11px;background:#f3f0fd;color:#6b5b8a;padding:4px 10px;border-radius:14px;">'+e+'</span>';
      });
      html += '</div></div>';
    }
  }

  // ⑥ その他（服薬・お通じ・睡眠の質・要因）
  var otherChips = [];
  if(rec.medication && rec.medication.length) otherChips.push('💊 '+rec.medication.join('・'));
  if(rec.sleepQuality) otherChips.push('💤 睡眠の質 '+rec.sleepQuality+'/5');
  if(rec.bowel) otherChips.push('🫧 '+rec.bowel);
  if(rec.factors && rec.factors.length) otherChips.push('📋 '+rec.factors.join('・'));
  if(otherChips.length){
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">';
    otherChips.forEach(function(e){
      html += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:4px 10px;border-radius:14px;">'+e+'</span>';
    });
    html += '</div>';
  }

  // ⑦ ウェルネス・SMIスコア（横並びコンパクト）
  var hasWS = rec.wellnessScore !== undefined;
  var hasSMI = rec.smiScore !== undefined && rec.smiScore !== null;
  if(hasWS || hasSMI){
    html += '<div style="display:flex;gap:10px;margin-bottom:14px;">';
    if(hasWS){
      var ws = rec.wellnessScore;
      var wsColor = ws >= 70 ? '#6b9e78' : ws >= 40 ? '#d4a574' : '#c4878c';
      var wsLabel = ws >= 70 ? '良好' : ws >= 40 ? 'まずまず' : '注意';
      html += '<div style="flex:1;background:linear-gradient(135deg,#faf6f2,#f0ebe6);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:10px;">';
      html += '<div style="position:relative;width:44px;height:44px;flex-shrink:0;">';
      html += '<svg width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="#e8ddd8" stroke-width="4"/>';
      var pctWS = ws / 100;
      var circWS = 2 * Math.PI * 18;
      html += '<circle cx="22" cy="22" r="18" fill="none" stroke="'+wsColor+'" stroke-width="4" stroke-dasharray="'+Math.round(circWS*pctWS)+' '+Math.round(circWS*(1-pctWS))+'" stroke-linecap="round" transform="rotate(-90 22 22)"/></svg>';
      html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12px;font-weight:700;color:'+wsColor+';">'+ws+'</div>';
      html += '</div>';
      html += '<div><div style="font-size:10px;color:var(--ink-light);">ウェルネス</div>';
      html += '<div style="font-size:13px;font-weight:600;color:'+wsColor+';">'+wsLabel+'</div></div>';
      html += '</div>';
    }
    if(hasSMI){
      var smi = rec.smiScore;
      var smiColor = smi <= 25 ? '#6b9e78' : smi <= 50 ? '#d4a574' : smi <= 75 ? '#c4878c' : '#c44848';
      var smiLabel = smi <= 25 ? '問題なし' : smi <= 50 ? '注意' : smi <= 75 ? '受診推奨' : '治療必要';
      html += '<div style="flex:1;background:linear-gradient(135deg,#fdf3f3,#f9edd8);border-radius:14px;padding:12px 14px;">';
      html += '<div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">SMI指数</div>';
      html += '<div style="display:flex;align-items:baseline;gap:4px;">';
      html += '<span style="font-size:20px;font-weight:700;color:'+smiColor+';">'+smi+'</span>';
      html += '<span style="font-size:10px;color:var(--ink-light);">/94</span>';
      html += '</div>';
      html += '<div style="margin:5px 0;height:5px;background:#e8ddd8;border-radius:3px;overflow:hidden;">';
      html += '<div style="height:100%;width:'+Math.min(Math.round(smi/94*100),100)+'%;background:'+smiColor+';border-radius:3px;"></div>';
      html += '</div>';
      html += '<div style="font-size:10px;color:'+smiColor+';">'+smiLabel+'</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ⑧ フレアアップ通知（直近3日以内）
  var recentFlares = detectFlareups(state.records).filter(function(f){
    return (Date.now() - new Date(f.date).getTime()) < 3 * 86400000;
  });
  if(recentFlares.length > 0){
    html += '<div onclick="openFlareupReport()" style="margin-bottom:10px;background:linear-gradient(135deg,#fde8e8,#fdf3f3);border-radius:14px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;">';
    html += '<span style="font-size:20px;">🔥</span>';
    html += '<div style="flex:1;"><div style="font-size:12px;font-weight:600;color:var(--rose);">フレアアップを検出</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);margin-top:2px;">'+recentFlares[recentFlares.length-1].reasons[0]+'</div></div>';
    html += '<span style="font-size:12px;color:var(--rose);">→</span>';
    html += '</div>';
  }

  // ⑨ 体温パターンインサイト
  var tempAnalysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records);
  if(tempAnalysis.status === 'ready'){
    var hasAlerts = tempAnalysis.alerts.length > 0;
    var alertColor = hasAlerts ? (tempAnalysis.alerts.some(function(a){return a.level==='emergency';}) ? '#c44848' : tempAnalysis.alerts.some(function(a){return a.level==='danger';}) ? '#c4878c' : '#d4a574') : '#6b9e78';
    html += '<div style="background:linear-gradient(135deg,var(--white),#fdf8f6);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    html += '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:16px;">🌡️</span><span style="font-size:13px;font-weight:600;color:var(--ink);">体温パターン分析</span></div>';
    html += '<span style="font-size:10px;color:var(--ink-light);">'+tempAnalysis.count+'日分</span>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:10px;">';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">二相性</div><div style="font-size:11px;font-weight:600;color:'+alertColor+';">判定済み</div></div>';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">温度差</div><div style="font-size:11px;font-weight:600;color:var(--ink);">'+tempAnalysis.tempDiff+'℃</div></div>';
    html += '<div style="flex:1;background:var(--cream);border-radius:8px;padding:8px;text-align:center;"><div style="font-size:9px;color:var(--ink-light);margin-bottom:3px;">アラート</div><div style="font-size:11px;font-weight:600;color:'+alertColor+';">'+(hasAlerts ? tempAnalysis.alerts.length+'件' : 'なし')+'</div></div>';
    html += '</div>';
    if(hasAlerts){
      html += '<div style="background:linear-gradient(135deg,#fde8e8,#fdf3f3);border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:11px;color:#c4878c;">⚠️ 気になるパターンが検出されました</div>';
    }
    html += '<div onclick="premiumGate(openTempReport)" style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--rose-pale);border-radius:8px;cursor:pointer;">';
    html += '<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:11px;font-weight:500;color:var(--rose);">詳細レポートを見る</span><span style="font-size:9px;background:var(--rose);color:white;padding:1px 6px;border-radius:4px;">PRO</span></div>';
    html += '<span style="font-size:12px;color:var(--rose);">→</span>';
    html += '</div></div>';

  } else if(tempAnalysis.status === 'insufficient' && tempAnalysis.count > 0){
    var progress = Math.round(tempAnalysis.count / 14 * 100);
    var diseases2 = state.myDiseases || [];
    var eduMsg = '14日以上の記録で、あなたの低温期と高温期のパターンが見えてきます。';
    if(diseases2.indexOf('卵巣嚢腫') !== -1) eduMsg = '卵巣嚢腫では体温パターンの変化が炎症の指標になります。14日以上記録を続けましょう。';
    else if(diseases2.indexOf('子宮内膜症') !== -1) eduMsg = '子宮内膜症では月経初日の体温が診断の手がかりになることが報告されています。';
    else if(diseases2.indexOf('PCOS') !== -1) eduMsg = 'PCOSでは二相性の有無が排卵障害の重要な指標です。毎日の記録が大切です。';
    else if(diseases2.indexOf('更年期障害') !== -1) eduMsg = '更年期では体温リズムの変化がホルモンバランスを反映します。記録を続けましょう。';
    html += '<div style="background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;"><span style="font-size:16px;">🌡️</span><span style="font-size:13px;font-weight:600;color:var(--ink);">体温パターン分析</span></div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);margin-bottom:8px;">'+tempAnalysis.message+'</div>';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;"><div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--rose),#e8b4b8);border-radius:3px;"></div></div>';
    html += '<div style="display:flex;justify-content:space-between;margin-top:5px;margin-bottom:10px;">';
    html += '<span style="font-size:10px;color:var(--ink-light);">'+tempAnalysis.count+'/14日</span><span style="font-size:10px;color:var(--rose);">'+progress+'%</span></div>';
    html += '<div style="padding:8px 10px;background:var(--cream);border-radius:8px;font-size:11px;color:var(--ink-mid);line-height:1.6;">💡 '+eduMsg+'</div>';
    html += '</div>';
  }

  content.innerHTML = html;

  // 診察レポートバナーの表示制御（7日以上記録で表示）
  var banner = document.getElementById('doctor-report-banner');
  if (banner) {
    banner.style.display = (state.records && state.records.length >= 7) ? 'block' : 'none';
  }
}


function editPastRecord(dateStr) {
  // オーバーレイを閉じる
  var overlay = document.getElementById('dmOverlay');
  if (overlay) overlay.classList.remove('dm-open');
  var dayModal = document.getElementById('dayDetailModal');
  if (dayModal) dayModal.style.display = 'none';
  
  var rec = state.records.find(function(r) {
    if (r.record_date && r.record_date.slice(0, 10) === dateStr) return true;
    if (r.date) {
      var _d = new Date(r.date);
      var _local = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
      if (_local === dateStr) return true;
    }
    return false;
  });
  
  state.draft = {
    record_date: dateStr,
    meals: { free: '', firstTime: '', lastTime: '' },
    mealFree: '',
    mealCount: 0,
    firstMealTime: '',
    lastMealTime: '',
    fasting: 0,
    temperature: null,
    symptoms: [],
    menstrualCycle: '',
    diseaseCheck: {},
    note: '',
    painLocation: [],
    painType: [],
    painLevel: 0,
    medication: [],
    bloodClot: [],
    bloodColor: [],
    emotion: '',
    wellness_score: 0,
    energy_score: 0,
    bodyChoices: {}
  };
  
  if (rec) {
    Object.keys(rec).forEach(function(key) {
      state.draft[key] = rec[key];
    });
  }
  
  state.editingDate = dateStr;
  
  // 記録画面に遷移
  document.querySelectorAll('.screen').forEach(function(el){ el.classList.remove('active'); });
  var recScreen = document.getElementById('screen-record');
  if(recScreen) recScreen.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(function(el){ el.classList.remove('active'); });
  var navItems = document.querySelectorAll('.nav-item');
  if(navItems[2]) navItems[2].classList.add('active');
  
  if(typeof window.openLegacyRecordScreen === 'function') window.openLegacyRecordScreen();

  // タイトルを対象日に変更
  setTimeout(function() {
    var d = new Date(dateStr);
    var WDAY = ['日','月','火','水','木','金','土'];
    var dateLabel = document.getElementById('rec-screen-date');
    var titleLabel = document.getElementById('rec-screen-title');
    if (dateLabel) {
      dateLabel.textContent = d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日（'+WDAY[d.getDay()]+'）';
    }
    if (titleLabel) {
      titleLabel.textContent = d.getDate()+'日の記録を編集';
    }
  }, 150);
}

  // ===== ホーム画面CTAボタン =====
function updateHomeCTA(){
  var title = document.getElementById('home-cta-title');
  var sub = document.getElementById('home-cta-sub');
  var card = document.getElementById('home-cta-card');
  if(!title || !sub || !card) return;

  var todayStr = new Date().toDateString();
  var hasRecord = false;
  for(var i=0; i<state.records.length; i++){
    if(new Date(state.records[i].date).toDateString() === todayStr){ hasRecord = true; break; }
  }

  var nearPeriod = isPeriodExpected();

  var cs = getComputedStyle(document.documentElement);
  if(nearPeriod && !hasRecord){
    title.textContent = '🌸 生理がきた？';
    sub.textContent = 'タップして今日の状態を記録';
    card.style.background = cs.getPropertyValue('--cta-period').trim();
  } else if(hasRecord){
    title.textContent = '✓ 今日の記録を見る';
    sub.textContent = '記録済み・タップして確認';
    card.style.background = cs.getPropertyValue('--cta-done').trim();
  } else {
    title.textContent = '今日を記録する';
    sub.textContent = 'まだ今日の記録がありません';
    card.style.background = cs.getPropertyValue('--cta-default').trim();
  }
}


function handleHomeCTA(){
  // daily check-in 完了フラグを確認 (2026-05-27):
  // record.meta.uiFlow === 'daily-checkin' が立っていれば「ふり返り」画面へ。
  // 未完了 or 他の入力経路からの保存のみの場合は3カードUIを開く。
  var today = new Date().toISOString().slice(0, 10);
  var s = (typeof getState === 'function') ? getState() : state;
  var rec = s && (s.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  var isDailyCheckinDone = !!(rec && rec.meta && rec.meta.uiFlow === 'daily-checkin');

  if (isDailyCheckinDone && typeof window.openTodayReflection === 'function') {
    window.openTodayReflection();
  } else if (typeof window.openRecordScreen === 'function') {
    window.openRecordScreen();
  } else {
    openRecordModal(); // fallback: record-three-card.js 未ロード時のみ
  }
}

// ===== ホーム CTAカード 記録前後状態更新 =====
// ===== 今日のメッセージ（ホーム1枚） =====
function updateTodayMessage() {
  var wrap = document.getElementById('home-today-message');
  var textEl = document.getElementById('home-today-msg-text');
  var btnWrap = document.getElementById('home-today-msg-btn-wrap');
  if (!wrap || !textEl) return;

  var today = new Date().toISOString().slice(0,10);
  var todayRec = (state.records||[]).find(function(r){
    return (r.date||'').slice(0,10) === today;
  });
  var streak = state.streak || 0;
  var msg = '';
  var showBtn = false;

  // 優先順位1: 未記録
  if (!todayRec) {
    msg = '今日の記録がまだです。3タップで完了します。';
    showBtn = true;
  } else {
    // 優先順位2〜5: フェーズ別
    var phase = typeof getCurrentCyclePhase === 'function' ? getCurrentCyclePhase() : '';
    var daysToNext = 99;
    if (state.lastPeriodDate && state.cycleLength) {
      var last = new Date(state.lastPeriodDate + 'T00:00:00');
      var dayNum = Math.floor((new Date() - last) / 86400000) + 1;
      daysToNext = (state.cycleLength || 28) - dayNum;
    }
    if (phase === '生理期') {
      var dayNum2 = state.lastPeriodDate ? Math.floor((new Date() - new Date(state.lastPeriodDate+'T00:00:00'))/86400000)+1 : 1;
      msg = '生理' + dayNum2 + '日目です。無理せず過ごしましょう。鎮痛剤の飲みすぎに注意。';
    } else if (daysToNext <= 3 && daysToNext >= 0) {
      msg = '生理が近づいています。鎮痛剤を手元に準備しておきましょう。';
    } else if (phase === '排卵期') {
      msg = '排卵期です。体温の変化を確認しましょう。';
    } else {
      msg = '今日も記録しました。連続' + streak + '日です。';
    }
  }

  textEl.textContent = msg;
  if (btnWrap) btnWrap.style.display = showBtn ? 'block' : 'none';
  wrap.style.display = 'block';
}

function updateHomeCTAState() {
  var today = new Date().toISOString().slice(0, 10);
  var rec = (state.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });

  var card  = document.getElementById('home-cta-card');
  var title = document.getElementById('home-cta-title');
  var sub   = document.getElementById('home-cta-sub');
  if (!card) return;

  if (rec) {
    // 記録済み：ダークローズ・✓マーク
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '0.82';
    if (title) title.textContent = '✓ 今日の記録完了';
    if (sub)   sub.textContent   = buildComparisonComment(rec);
  } else {
    // 未記録：鮮やかなローズ
    card.style.background = 'var(--rose-dark)';
    card.style.opacity = '1';
    if (title) title.textContent = '今日を記録する';
    if (sub)   sub.textContent   = '';
  }
}

// ===== 連続記録バッジ色変化 =====
function updateStreakBadge() {
  var badge = document.getElementById('streak-badge');
  if (!badge) return;
  var today = new Date().toISOString().slice(0, 10);
  var recordedToday = (state.records || []).some(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  if (recordedToday) {
    badge.style.background = 'var(--sage-light)';
    badge.style.color = 'var(--sage)';
    var countEl = document.getElementById('streak-badge-count');
    if (countEl) countEl.nextSibling && (countEl.parentNode.lastChild.textContent = '日連続 ✓');
  } else {
    badge.style.background = 'var(--rose-pale)';
    badge.style.color = 'var(--rose)';
  }
}

// ===== 比較コメント生成 =====
function buildComparisonComment(todayRec) {
  var records = state.records || [];
  var diseases = state.myDiseases || [];

  var recordCount = records.length;

  if (recordCount <= 1) {
    return '最初の記録ができました。続けるほど見えてくるものがあります';
  }

  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().slice(0, 10);
  var yesterdayRec = records.find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === yesterdayStr;
  });

  if (recordCount < 7) {
    if (!yesterdayRec) return '昨日の記録がないため比較できません。毎日記録すると変化がわかります';
    return buildDayComparison(todayRec, yesterdayRec, diseases);
  }

  var lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  var lastWeekStr = lastWeek.toISOString().slice(0, 10);
  var lastWeekRec = records.find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === lastWeekStr;
  });

  if (lastWeekRec) {
    return buildWeekComparison(todayRec, lastWeekRec, diseases);
  }

  if (yesterdayRec) {
    return buildDayComparison(todayRec, yesterdayRec, diseases);
  }

  return '記録を続けています。パターンが見えてきます';
}

function buildDayComparison(today, yesterday, diseases) {
  var todayPain = today.painLevel || 0;
  var yestPain  = yesterday.painLevel || 0;
  var diff = todayPain - yestPain;

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (diff < -1) return '昨日より骨盤の痛みが和らいでいます';
    if (diff > 1)  return '昨日より痛みが強めです。無理せず過ごしてください';
    if (todayPain === 0) return '今日は痛みのない日です。この記録も大切です';
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (diff < -1) return '昨日より体調が落ち着いています';
    if (diff > 1)  return '昨日より症状が強めです。記録を続けましょう';
  }
  if (diseases.indexOf('子宮筋腫') !== -1) {
    if (diff < -1) return '昨日より楽な一日でした';
    if (diff > 1)  return '昨日より経血量や痛みに変化がありますか？';
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (diff < -1) return '昨日より気分・痛みが落ち着いています';
    if (diff > 1)  return '昨日より症状が強めです。ゆっくり過ごしてください';
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (diff < -1) return '昨日より体調が穏やかです';
    if (diff > 1)  return '昨日より症状が強めです。SMIチェックも記録してください';
  }

  if (diff < -1) return '昨日より痛みが1段階楽でした';
  if (diff > 1)  return '昨日より痛みが強めです';
  if (diff === 0 && todayPain === 0) return '今日も痛みのない日でした';
  return '昨日と同じような状態が続いています';
}

function buildWeekComparison(today, lastWeek, diseases) {
  var todayPain = today.painLevel || 0;
  var lastPain  = lastWeek.painLevel || 0;
  var diff = todayPain - lastPain;

  var now = new Date();
  var painFreeDays = (state.records || []).filter(function(r) {
    var d = new Date(r.date || r.record_date || '');
    return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && (r.painLevel === 0 || r.painLevel === null || r.painLevel === undefined);
  }).length;

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (diff < -1) return '先週の同じ曜日より骨盤の痛みが落ち着いています';
    if (diff > 1)  return '先週の同じ曜日より痛みが強めです。この変化を記録しておきましょう';
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (diff < 0) return '先週より症状が軽めです。周期のパターンが見えてきます';
    if (diff > 0) return '先週より症状が強めです。生理前のフェーズを確認してみましょう';
  }

  if (painFreeDays > 0) {
    return '今月のらくな日が' + painFreeDays + '日になりました';
  }
  if (diff < -1) return '先週の同じ曜日より体調が落ち着いています';
  if (diff > 1)  return '先週の同じ曜日より痛みが強めです';
  return '記録が7日続きました。パターンが見えてきます';
}

function isPeriodExpected(){
  // 過去の「生理開始」または「生理中」の記録から次の生理予定日を予測
  var starts = [];
  for(var i=0; i<state.records.length; i++){
    var r = state.records[i];
    if(r.menstrualCycle === '生理開始' || r.menstrualCycle === '生理中'){
      var d = new Date(r.date);
      // 連続する生理中の最初の日だけを取得
      var isDuplicate = false;
      for(var j=0; j<starts.length; j++){
        if(Math.abs(starts[j] - d) < 5 * 86400000){ isDuplicate = true; break; }
      }
      if(!isDuplicate) starts.push(d);
    }
  }
  if(starts.length < 2) return false;

  // 平均周期を計算
  starts.sort(function(a,b){ return a - b; });
  var totalDays = 0;
  for(var k=1; k<starts.length; k++){
    totalDays += (starts[k] - starts[k-1]) / 86400000;
  }
  var avgCycle = Math.round(totalDays / (starts.length - 1));

  // 次の予定日
  var lastStart = starts[starts.length - 1];
  var nextExpected = new Date(lastStart.getTime() + avgCycle * 86400000);
  var today = new Date();
  var diffDays = (nextExpected - today) / 86400000;

  // 予定日の前後3日以内
  return diffDays >= -3 && diffDays <= 3;
}

  // ===== COMMUNITY VOICE =====
var currentTopicId = null;

function loadCommunityTopic(){
  // 未認証時は 401 になるため、認証済みの場合のみリクエストを送る
  if (!supabaseUserId) {
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です。もうしばらくお待ちください 🌸';
    return;
  }
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.true&order=created_at.desc&limit=1', {
    headers: {'apikey': SUPABASE_KEY}
  })
  .then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(data){
    if(!Array.isArray(data) || data.length === 0){
      // テーブル未作成またはトピックなし → フォールバック表示
      var qEl = document.getElementById('community-question');
      if(qEl) qEl.textContent = 'コミュニティ機能は準備中です。もうしばらくお待ちください 🌸';
      return;
    }
    currentTopicId = data[0].id;
    var weekEl = document.getElementById('community-week');
    var qEl = document.getElementById('community-question');
    if(weekEl) weekEl.textContent = data[0].week_label || '';
    if(qEl) qEl.textContent = data[0].question || '';
    loadCommunityReplies();
  })
  .catch(function(e){
    // silent fail — community_topics table policy not set
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です 🌸';
  });
}

  function switchCVTab(tab){
  var current = document.getElementById('cv-current');
  var archive = document.getElementById('cv-archive');
  var tabCurrent = document.getElementById('cv-tab-current');
  var tabArchive = document.getElementById('cv-tab-archive');
  if(tab === 'current'){
    current.style.display = 'block';
    archive.style.display = 'none';
    tabCurrent.style.background = 'var(--rose)';
    tabCurrent.style.color = 'white';
    tabCurrent.style.borderColor = 'var(--rose)';
    tabArchive.style.background = 'var(--white)';
    tabArchive.style.color = 'var(--ink-mid)';
    tabArchive.style.borderColor = '#e8ddd8';
  } else {
    current.style.display = 'none';
    archive.style.display = 'block';
    tabArchive.style.background = 'var(--rose)';
    tabArchive.style.color = 'white';
    tabArchive.style.borderColor = 'var(--rose)';
    tabCurrent.style.background = 'var(--white)';
    tabCurrent.style.color = 'var(--ink-mid)';
    tabCurrent.style.borderColor = '#e8ddd8';
    loadCVArchive();
  }
}

function loadCVArchive(){
  var container = document.getElementById('cv-archive-list');
  container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">読み込み中...</div>';
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.false&order=created_at.desc&limit=20', {
    headers: { 'apikey': SUPABASE_KEY }
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(topics){
    if(!Array.isArray(topics) || topics.length === 0){
      container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">過去のテーマはまだありません</div>';
      return;
    }
    var html = '';
    topics.forEach(function(t){
      var date = new Date(t.created_at);
      var dateStr = date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate();
      html += '<div class="cv-archive-item" style="background:var(--white);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #f0ebe6;cursor:pointer;" onclick="toggleArchiveReplies(this, \''+t.id+'\')">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
      html += '<div style="font-size:13px;color:var(--ink);font-weight:600;line-height:1.6;flex:1;">'+t.question+'</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);flex-shrink:0;margin-left:10px;">'+dateStr+'</div>';
      html += '</div>';
      html += '<div class="cv-archive-replies" style="display:none;margin-top:12px;padding-top:12px;border-top:1px solid #f0ebe6;"></div>';
      html += '</div>';
    });
    container.innerHTML = html;
  })
  .catch(function(e){
    container.innerHTML = '<div style="text-align:center;padding:20px 0;color:var(--ink-light);font-size:13px;">読み込みに失敗しました</div>';
  });
}

function toggleArchiveReplies(el, topicId){
  var repliesDiv = el.querySelector('.cv-archive-replies');
  if(repliesDiv.style.display === 'block'){
    repliesDiv.style.display = 'none';
    return;
  }
  repliesDiv.style.display = 'block';
  repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込み中...</div>';
  fetch(SUPABASE_URL + '/rest/v1/community_replies?topic_id=eq.'+topicId+'&order=created_at.desc&limit=20', {
    headers: { 'apikey': SUPABASE_KEY }
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(replies){
    if(!Array.isArray(replies) || replies.length === 0){
      repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">まだ回答がありません</div>';
      return;
    }
    var html = '';
    replies.forEach(function(r){
      html += '<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f5f0eb;">';
      html += '<div style="font-size:11px;color:var(--ink-mid);font-weight:600;margin-bottom:4px;">'+(r.display_name || '匿名さん')+'</div>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.7;">'+escapeHtml(r.body)+'</div>';
      html += '</div>';
    });
    repliesDiv.innerHTML = html;
  })
  .catch(function(e){
    console.warn('アーカイブ回答読込スキップ:', e.message);
    repliesDiv.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込みに失敗しました</div>';
  });
}

function loadCommunityReplies(){
  if(!currentTopicId) return;
  fetch(SUPABASE_URL + '/rest/v1/community_replies?topic_id=eq.' + currentTopicId + '&order=likes.desc,created_at.desc&limit=20', {
    headers: {'apikey': SUPABASE_KEY}
  })
  .then(function(r){ if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(replies){
    var container = document.getElementById('community-replies');
    if(!container) return;
    if(!Array.isArray(replies) || replies.length === 0){
      container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--ink-light);font-size:13px;">まだ回答がありません。最初の声を届けてみませんか？</div>';
      return;
    }
    var html = '';
    for(var i=0; i<replies.length; i++){
      var r = replies[i];
      var timeAgo = getTimeAgo(r.created_at);
      var isMyLike = false; // 後で確認
      html += '<div style="background:var(--white);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid #f0ebe6;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
      html += '<div style="font-size:12px;color:var(--ink-mid);font-weight:600;">' + (r.display_name || '匿名さん') + '</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);">' + timeAgo + '</div>';
      html += '</div>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.7;margin-bottom:10px;">' + escapeHtml(r.body) + '</div>';
      html += '<div style="display:flex;align-items:center;gap:4px;">';
      html += '<button onclick="likeCommunityReply(\'' + r.id + '\', this)" style="background:none;border:1px solid #e8ddd8;border-radius:16px;padding:4px 12px;font-size:11px;color:var(--ink-light);cursor:pointer;">';
      html += '♡ 共感</button>';
      if(supabaseUserId && r.user_id === supabaseUserId){
        html += '<button onclick="deleteCommunityReply(\'' + r.id + '\', this)" style="background:none;border:1px solid #e8ddd8;border-radius:16px;padding:4px 12px;font-size:11px;color:var(--ink-light);cursor:pointer;">削除</button>';
      }
      html += '</div>';
      html += '</div>';
    }
    container.innerHTML = html;
    checkMyLikes(replies);
  })
  .catch(function(e){ console.log('回答読込エラー:', e); });
}

function postCommunityReply(){
  var input = document.getElementById('community-input');
  if(!input || !input.value.trim()) return;
  if(!currentTopicId){ showToast('テーマが読み込まれていません', 'warn'); return; }
  if(input.value.trim().length < 10){ showToast('10文字以上で入力してください', 'warn'); return; }

  var body = {
    topic_id: currentTopicId,
    user_id: supabaseUserId || null,
    display_name: (state.name || '匿名') + 'さん',
    body: input.value.trim()
  };

  fetch(SUPABASE_URL + '/rest/v1/community_replies', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(body)
  })
  .then(function(r){
    if(r.ok){
      input.value = '';
      loadCommunityReplies();
      showToast('投稿しました ✓', 'success');
    } else {
      showToast('投稿に失敗しました。もう一度お試しください。', 'warn');
    }
  })
  .catch(function(e){ showToast('通信エラーが発生しました', 'warn'); });
}

function likeCommunityReply(replyId, btn){
  if(!supabaseUserId){ showToast('いいねするにはログインが必要です', 'warn'); return; }

  fetch(SUPABASE_URL + '/rest/v1/community_likes', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ reply_id: replyId, user_id: supabaseUserId })
  })
  .then(function(r){
    if(r.ok){
      // likes カウントを更新（RPC使わずクライアント側で+1）
      var span = btn.querySelector('span');
      var current = parseInt(span.textContent) || 0;
      span.textContent = current + 1;
      btn.style.color = 'var(--rose)';
      btn.style.borderColor = 'var(--rose)';
      btn.disabled = true;
      // DBのlikesカウントも更新
      updateReplyLikeCount(replyId, current + 1);
    }
  })
  .catch(function(e){ console.log('いいねエラー:', e); });
}

 function deleteCommunityReply(replyId, btn){
  showToast('この投稿を削除しました', 'info');
  supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session){
      showToast('ログインが必要です', 'warn');
      return;
    }
    fetch(SUPABASE_URL + '/rest/v1/community_replies?id=eq.' + replyId + '&user_id=eq.' + session.user.id, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + session.access_token
      }
    })
    .then(function(r){
      if(r.ok){
        var card = btn.closest('div[style*="background:var(--white)"]');
        if(card) card.remove();
      } else {
        showToast('削除に失敗しました', 'warn');
      }
    })
    .catch(function(e){ showToast('通信エラーが発生しました', 'warn'); });
  });
}

  
function updateReplyLikeCount(replyId, newCount){
  fetch(SUPABASE_URL + '/rest/v1/community_replies?id=eq.' + replyId, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ likes: newCount })
  });
}

function checkMyLikes(replies){
  if(!supabaseUserId) return;
  var ids = replies.map(function(r){ return r.id; });
  fetch(SUPABASE_URL + '/rest/v1/community_likes?user_id=eq.' + supabaseUserId + '&reply_id=in.(' + ids.join(',') + ')', {
    headers: {'apikey': SUPABASE_KEY}
  })
  .then(function(r){ return r.json(); })
  .then(function(likes){
    var likedIds = {};
    likes.forEach(function(l){ likedIds[l.reply_id] = true; });
    var buttons = document.querySelectorAll('#community-replies button');
    buttons.forEach(function(btn){
      var onclick = btn.getAttribute('onclick') || '';
      var match = onclick.match(/likeCommunityReply\('([^']+)'/);
      if(match && likedIds[match[1]]){
        btn.style.color = 'var(--rose)';
        btn.style.borderColor = 'var(--rose)';
        var span = btn.querySelector('span');btn.innerHTML = '♥ ' + (span ? span.textContent : '共感');
        btn.disabled = true;
      }
    });
  });
}

function escapeHtml(text){
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getTimeAgo(dateStr){
  var now = new Date();
  var d = new Date(dateStr);
  var diff = Math.floor((now - d) / 1000);
  if(diff < 60) return 'たった今';
  if(diff < 3600) return Math.floor(diff / 60) + '分前';
  if(diff < 86400) return Math.floor(diff / 3600) + '時間前';
  if(diff < 604800) return Math.floor(diff / 86400) + '日前';
  return (d.getMonth()+1) + '/' + d.getDate();
}


function updateDiseaseSettingDisplay(){
  var display = document.getElementById('disease-setting-display');
  if(!display) return;
 var saved = state.myDiseases || [];
display.textContent = saved.length ? saved.join('・') : '設定する';
}
function updateSymptomSettingDisplay(){
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('updateSymptomSettingDisplay', updateSymptomSettingDisplay);
    return;
  }
  var display = document.getElementById('symptom-setting-display');
  if(!display) return;
  var saved = state.mySymptoms || [];
  display.textContent = saved.length ? saved.join('・') : '設定する';
}

var SYMPTOM_CATEGORIES = {
  '頭痛':'body','腰痛':'body','下腹部痛':'body','むくみ':'body',
  '肌荒れ':'body','便秘':'body','下痢':'body','吐き気':'body',
  '倦怠感':'body','冷え':'body','発熱':'body','関節痛':'body',
  '排便痛':'body','腹部膨満':'body',
  '不眠':'mind','イライラ':'mind','不安感':'mind',
  '食欲増加':'mind','食欲低下':'mind','眠気':'mind',
  '集中力低下':'mind','気分の落ち込み':'mind','ブレインフォグ':'mind',
  'おりもの':'gyneco','胸の張り':'gyneco','ほてり':'gyneco',
  '動悸':'gyneco','のぼせ':'gyneco','性交痛':'gyneco'
};
var _sympTabCurrent = 'all';


function getRecentSymptoms() {
  try {
    var recent = JSON.parse(localStorage.getItem('ippo_recent_symptoms') || '[]');
    var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return recent
      .filter(function(s){ return s.timestamp > cutoff; })
      .sort(function(a,b){ return b.count - a.count; })
      .slice(0, 3)
      .map(function(s){ return s.name; });
  } catch(e){ return []; }
}

function saveSymptomSelection(symptoms) {
  try {
    var recent = JSON.parse(localStorage.getItem('ippo_recent_symptoms') || '[]');
    symptoms.forEach(function(name){
      var existing = null;
      for(var i=0;i<recent.length;i++){ if(recent[i].name===name){ existing=recent[i]; break; } }
      if(existing){ existing.count++; existing.timestamp = Date.now(); }
      else { recent.push({ name: name, count: 1, timestamp: Date.now() }); }
    });
    localStorage.setItem('ippo_recent_symptoms', JSON.stringify(recent));
  } catch(e){}
}

function buildEffectiveLayer1() {
  var diseases = state.myDiseases || [];
  var priorityArr = [];
  diseases.forEach(function(disease){
    var priorities = DISEASE_PRIORITY_SYMPTOMS[disease] || [];
    priorities.forEach(function(s){
      if(priorityArr.indexOf(s) === -1) priorityArr.push(s);
    });
  });
  getRecentSymptoms().forEach(function(s){
    if(priorityArr.indexOf(s) === -1) priorityArr.push(s);
  });
  var merged = priorityArr.slice(0, 5);
  SYMPTOM_LAYERS.layer1.forEach(function(s){
    if(merged.indexOf(s) === -1) merged.push(s);
  });
  return merged.slice(0, 10);
}

function renderSymptomLayers() {
  var container = document.getElementById('rs-symptoms');
  if(!container) return;
  var diseases = state.myDiseases || [];
  var hasDiseaseWithSensitive = diseases.some(function(d){
    var p = DISEASE_PRIORITY_SYMPTOMS[d] || [];
    return p.some(function(s){ return SENSITIVE_SYMPTOMS.indexOf(s) !== -1; });
  });
  // 現在選択済み症状を退避
  var selected = [];
  container.querySelectorAll('.chip.selected').forEach(function(c){ selected.push(c.textContent); });
  var layer1 = buildEffectiveLayer1();
  var baseLayer2 = SYMPTOM_LAYERS.layer2.slice();
  if(!hasDiseaseWithSensitive){
    SENSITIVE_SYMPTOMS.forEach(function(s){ if(baseLayer2.indexOf(s)===-1) baseLayer2.push(s); });
  }
  var layer2 = baseLayer2.filter(function(s){ return layer1.indexOf(s)===-1; });
  var layer3 = SYMPTOM_LAYERS.layer3.filter(function(s){ return layer1.indexOf(s)===-1 && layer2.indexOf(s)===-1; });
  var expandBtnStyle = 'border:.5px dashed #ddd;background:transparent;color:#9a8e88;font-size:11px;padding:5px 14px;border-radius:20px;cursor:pointer;font-family:inherit;margin-top:2px;';
  function makeChip(name){ return '<div class="chip" onclick="toggleRsChip(this)" style="font-size:11px;padding:6px 12px;">'+name+'</div>'; }
  var html = '<div id="rs-symp-l1" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer1.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  html += '<div id="rs-symp-e2" style="margin:0 0 4px;"><button onclick="toggleSympLayer(2)" id="rs-symp-btn2" style="'+expandBtnStyle+'">もっと見る ▾</button></div>';
  html += '<div id="rs-symp-l2" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer2.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  html += '<div id="rs-symp-e3" style="display:none;margin:0 0 4px;"><button onclick="toggleSympLayer(3)" id="rs-symp-btn3" style="'+expandBtnStyle+'">さらに見る ▾</button></div>';
  html += '<div id="rs-symp-l3" style="display:none;flex-wrap:wrap;gap:6px;">';
  layer3.forEach(function(s){ html += makeChip(s); });
  html += '</div>';
  container.innerHTML = html;
  // 選択状態を復元、下層に選択済みがあれば自動展開
  if(selected.length){
    var needL2=false, needL3=false;
    container.querySelectorAll('.chip').forEach(function(c){
      if(selected.indexOf(c.textContent) !== -1){
        c.classList.add('selected');
        var l2=document.getElementById('rs-symp-l2'), l3=document.getElementById('rs-symp-l3');
        if(l2 && l2.contains(c)) needL2=true;
        if(l3 && l3.contains(c)) needL3=true;
      }
    });
    if(needL2) toggleSympLayer(2);
    if(needL3) toggleSympLayer(3);
  }
}

function toggleSympLayer(layerNum) {
  var layerEl = document.getElementById('rs-symp-l'+layerNum);
  var btnEl = document.getElementById('rs-symp-btn'+layerNum);
  if(!layerEl) return;
  var isOpen = layerEl.style.display !== 'none';
  if(isOpen){
    layerEl.style.display = 'none';
    if(btnEl) btnEl.textContent = layerNum===2 ? 'もっと見る ▾' : 'さらに見る ▾';
    if(layerNum===2){
      var e3=document.getElementById('rs-symp-e3'), l3=document.getElementById('rs-symp-l3');
      if(e3) e3.style.display='none';
      if(l3) l3.style.display='none';
      var b3=document.getElementById('rs-symp-btn3'); if(b3) b3.textContent='さらに見る ▾';
    }
  } else {
    layerEl.style.display = 'flex';
    if(btnEl) btnEl.textContent = '閉じる ▴';
    if(layerNum===2){
      var e3=document.getElementById('rs-symp-e3');
      if(e3) e3.style.display='block';
    }
  }
}

// 後方互換のため残す（呼び出し元が存在する場合のフォールバック）
function switchSymptomTab(cat, btn) {
  // 新3層システムでは tab 切替は不使用
}

function updateRecordSymptoms(){
  var container = document.getElementById('rs-symptoms');
  if(!container) return;
  var saved = state.mySymptoms || [];
  var chips = container.querySelectorAll('.chip');
  var allSymptoms = [];
  chips.forEach(function(c){ allSymptoms.push(c.textContent.trim()); });

  // 登録済みの症状を先頭に並べ替え
  var sorted = [];
  for(var i = 0; i < saved.length; i++){
    if(allSymptoms.indexOf(saved[i]) !== -1) sorted.push(saved[i]);
  }
  for(var j = 0; j < allSymptoms.length; j++){
    if(sorted.indexOf(allSymptoms[j]) === -1) sorted.push(allSymptoms[j]);
  }

  container.innerHTML = '';
  for(var k = 0; k < sorted.length; k++){
    var s = sorted[k];
    var isMy = saved.indexOf(s) !== -1;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = s;
    chip.setAttribute('data-sym-cat', SYMPTOM_CATEGORIES[s] || 'body');
    if(isMy){
      chip.style.borderColor = 'var(--rose)';
      chip.style.background = 'var(--rose-pale)';
    }
    chip.onclick = function(){ this.classList.toggle('selected'); };
    container.appendChild(chip);
  }
  // re-apply active tab filter after rebuild
  switchSymptomTab(_sympTabCurrent, null);
}

function submitFeedback() {
  if (!state.rating) { showAlertModal('評価を選んでください'); return; }
  var comment = document.getElementById('fb-comment') ? document.getElementById('fb-comment').value.trim() : '';
  var subject = encodeURIComponent('ippoフィードバック - ' + state.rating + '星');
  var body = encodeURIComponent('評価: ' + state.rating + '/5\n\n感想:\n' + (comment || '（なし）') + '\n\nユーザー: ' + (state.name || '匿名') + '\n日時: ' + new Date().toLocaleString('ja-JP'));
  window.location.href = 'mailto:YOUR_EMAIL@example.com?subject=' + subject + '&body=' + body;
  showAlertModal('ありがとうございます！メーラーが開きます 🌸');
  state.rating = 0;
  document.querySelectorAll('.fb-star').forEach(function(s){ s.classList.remove('active'); });
  if(document.getElementById('fb-comment')) document.getElementById('fb-comment').value = '';
}

function clearData() {
  // P0-FIX-10: 意図的なリセットフラグをセット。
  // cloudBackupAll の FIX-9 Guard が空 records の同期をブロックするため、
  // ユーザー明示リセット時のみ Guard を通過させるためのフラグ。
  // フラグは cloudBackupAll の Guard 内で消費される（delete）。
  window.__ippoExplicitDataReset = true;

  state.records    = [];
  state.streak     = 0;
  state.totalDays  = 0;
  // バグ20: リペアタイマーも確実にリセット
  state.fastingActive = false;
  state.fastingStart  = null;
  if (fastInterval !== null) {
    clearInterval(fastInterval);
    fastInterval = null;
  }
  // タイマーUIを初期状態に戻す
  const timerEl  = document.getElementById('fast-timer');
  const statusEl = document.getElementById('fast-status');
  const startBtn = document.getElementById('fast-start-btn');
  const stopBtn  = document.getElementById('fast-stop-btn');
  if (timerEl)  timerEl.textContent  = '00:00:00';
  if (statusEl) statusEl.textContent = 'ファスティングを始めましょう';
  if (startBtn) startBtn.style.display = 'block';
  if (stopBtn)  stopBtn.style.display  = 'none';
  saveState();
  updateStats();
  updateUnlock();
  updateHistory();
}

// ===== DAILY MESSAGES =====
const messages = [
  'からだの小さな変化に\n気づくことが、最初の一歩。',
  '今日の記録が、\n明日の自分を助けてくれる。',
  '無理なく、ていねいに。\nあなたのペースでいい。',
  '子宮は第二の心。\nからだの声に耳を傾けて。',
  '感情もからだの一部。\n正直に記録することが癒しになる。',
];

function setDailyMessage() {
  const idx = new Date().getDate() % messages.length;
  const el = document.getElementById('today-message');
  // バグ11: replace は最初の\nしか置換しないため replaceAll を使用
  if (el) el.innerHTML = messages[idx].replaceAll('\n', '<br>');
}
// ===== CALENDAR =====
var calYear, calMonth;
(function(){ var now = new Date(); calYear = now.getFullYear(); calMonth = now.getMonth(); })();

// ===== EDIT RECORD =====
var editingDateStr = null;

function openEditRecord(dateString){
  document.getElementById('dmOverlay').classList.remove('dm-open');
  editingDateStr = dateString;
  var recs = state.records.filter(function(r){ return new Date(r.date).toDateString() === dateString; });
  var rec = recs.length ? recs[recs.length - 1] : null;

  var overlay = document.getElementById('editOverlay');
  if(!overlay){
    overlay = document.createElement('div');
    overlay.id = 'editOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:600;background:rgba(44,36,32,0.5);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = '<div id="editBox" style="width:90%;max-width:400px;max-height:88vh;background:var(--cream);border-radius:24px;padding:24px;overflow-y:auto;box-shadow:0 12px 40px rgba(44,36,32,0.15);"></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e){ if(e.target === overlay) closeEditRecord(); });
  }
  overlay.style.display = 'flex';

  var dateObj = new Date(dateString);
  var WDAY = ['日','月','火','水','木','金','土'];
  var title = dateObj.getFullYear()+'年'+(dateObj.getMonth()+1)+'月'+dateObj.getDate()+'日（'+WDAY[dateObj.getDay()]+'）';

  var m = (rec && rec.meals) ? rec.meals : {};
  var html = '';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
  html += '<div style="font-family:Shippori Mincho,serif;font-size:17px;color:var(--ink);">'+title+'</div>';
  html += '<button onclick="closeEditRecord()" style="width:32px;height:32px;border-radius:50%;border:1px solid rgba(200,180,170,0.3);background:var(--white);color:var(--ink-light);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>';
  html += '</div>';

  // 食事
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
  var freeText = m.free || '';
  // 旧形式の互換: morning/lunch等が残っている場合はフリーテキストに変換
  if(!freeText && (m.morning || m.lunch || m.dinner || m.snack)){
    var parts = [];
    if(m.morning) parts.push('朝食: ' + m.morning);
    if(m.lunch) parts.push('昼食: ' + m.lunch);
    if(m.dinner) parts.push('夕食: ' + m.dinner);
    if(m.snack) parts.push('間食: ' + m.snack);
    freeText = parts.join('\n');
  }
  html += '<textarea id="edit-meal-free" placeholder="0930 朝食&#10;1200 昼食&#10;1900 夕食" style="width:100%;min-height:120px;border:1.5px solid #e8ddd8;border-radius:12px;padding:12px;font-family:Noto Sans JP,sans-serif;font-size:13px;color:var(--ink);background:var(--white);resize:vertical;outline:none;line-height:1.9;">'+freeText.replace(/</g,'&lt;')+'</textarea>';
  html += '</div>';

  // 基礎体温
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">TEMPERATURE</div>';
  html += '<div style="display:flex;align-items:center;gap:8px;">';
  html += '<span style="font-size:16px;">🌡</span>';
  html += '<input id="edit-temp" type="number" step="0.1" min="35" max="42" value="'+(rec && rec.temperature ? rec.temperature : '')+'" placeholder="36.5" style="flex:1;" class="meal-input">';
  html += '<span style="font-size:13px;color:var(--ink-mid);">℃</span>';
  html += '</div></div>';

  // 症状チップ
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">SYMPTOMS</div>';
  var symptomList = ['頭痛','腰痛','腹痛','むくみ','肌荒れ','倦怠感','イライラ','不眠','便秘','冷え'];
  var currentSymptoms = (rec && rec.symptoms) ? rec.symptoms : [];
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for(var si=0;si<symptomList.length;si++){
    var sym = symptomList[si];
    var isSel = currentSymptoms.indexOf(sym) >= 0;
    html += '<button onclick="toggleEditChip(this)" data-val="'+sym+'" class="chip'+(isSel?' selected':'')+'" style="font-size:12px;padding:6px 12px;">'+sym+'</button>';
  }
  html += '</div></div>';

  // 生理状態
  html += '<div style="margin-bottom:16px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MENSTRUAL CYCLE</div>';
  var cycleOptions = ['なし','生理開始','生理中','排卵期','高温期','低温期'];
  var currentCycle = (rec && rec.menstrualCycle) ? rec.menstrualCycle : '';
  html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
  for(var ci=0;ci<cycleOptions.length;ci++){
    var co = cycleOptions[ci];
    var cSel = (currentCycle === co);
    html += '<button onclick="selectEditCycle(this,\''+co+'\')" data-val="'+co+'" class="chip'+(cSel?' selected':'')+'" style="font-size:12px;padding:6px 12px;">'+co+'</button>';
  }
  html += '</div></div>';

  // メモ
  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEMO</div>';
  html += '<textarea id="edit-note" class="modal-textarea" placeholder="メモ・気づいたことなど" rows="3">'+(rec && rec.note ? rec.note : '')+'</textarea>';
  html += '</div>';

  // 保存・削除ボタン
  html += '<div style="display:flex;gap:10px;">';
  html += '<button onclick="deleteEditRecord()" style="flex:1;padding:14px;background:#f0ebe6;color:var(--ink-mid);border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:13px;cursor:pointer;">🗑 削除</button>';
  html += '<button onclick="saveEditRecord()" style="flex:2;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">保存する</button>';
  html += '</div>';

  document.getElementById('editBox').innerHTML = html;
}

function closeEditRecord(){
  var overlay = document.getElementById('editOverlay');
  if(overlay) overlay.style.display = 'none';
}

function toggleEditChip(el){
  el.classList.toggle('selected');
}

function selectEditCycle(el, val){
  var parent = el.parentElement;
  var btns = parent.querySelectorAll('.chip');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('selected');
  el.classList.add('selected');
}

function saveEditRecord(){
  var recs = state.records.filter(function(r){ return new Date(r.date).toDateString() === editingDateStr; });
  var rec = recs.length ? recs[recs.length - 1] : null;

  if(!rec){
    // 新規作成
    var _editDate = new Date(editingDateStr);
    rec = { date: _editDate.toISOString(), record_date: _editDate.toISOString().slice(0, 10) };
    state.records.push(rec);
  }

    // 食事（フリーメモ）
  var editFreeEl = document.getElementById('edit-meal-free');
  var editFreeText = editFreeEl ? editFreeEl.value.trim() : '';
  var editParsed = parseMealMemo(editFreeText);
  rec.mealFree = editFreeText;
  rec.meals = { free: editFreeText };
  rec.firstMealTime = editParsed ? editParsed.firstTime : '';
  rec.lastMealTime = editParsed ? editParsed.lastTime : '';
  rec.mealCount = editParsed ? editParsed.mealCount : 0;
  rec.fasting = editParsed ? editParsed.fastingHours : 0;


  // 体温
  var tempVal = document.getElementById('edit-temp').value.trim();
  if(tempVal) rec.temperature = tempVal;
  else delete rec.temperature;

  // 症状
  var symEls = document.querySelectorAll('#editOverlay .chip.selected[data-val]');
  var symptoms = [];
  var cycleVal = '';
  for(var j=0;j<symEls.length;j++){
    var parent = symEls[j].parentElement.previousElementSibling;
    if(parent && parent.textContent === 'SYMPTOMS'){
      symptoms.push(symEls[j].dataset.val);
    }
  }
  // 症状を別途取得
  symptoms = [];
  var allChips = document.querySelectorAll('#editOverlay [data-val]');
  var inSymptoms = false;
  var inCycle = false;
  for(var k=0;k<allChips.length;k++){
    var chip = allChips[k];
    var val = chip.dataset.val;
    var symptomList = ['頭痛','腰痛','腹痛','むくみ','肌荒れ','倦怠感','イライラ','不眠','便秘','冷え'];
    var cycleList = ['なし','生理開始','生理中','排卵期','高温期','低温期'];
    if(symptomList.indexOf(val) >= 0 && chip.classList.contains('selected')){
      symptoms.push(val);
    }
    if(cycleList.indexOf(val) >= 0 && chip.classList.contains('selected')){
      cycleVal = val;
    }
  }
  rec.symptoms = symptoms;
  rec.menstrualCycle = cycleVal;

  // メモ
  var noteVal = document.getElementById('edit-note').value.trim();
  if(noteVal) rec.note = noteVal;
  else delete rec.note;

  saveState();
  buildCalendar();
  updateHistory();
  if(typeof cloudSaveRecord === 'function') cloudSaveRecord(rec);

  closeEditRecord();

  // 更新後のモーダルを再表示
  var dateObj = new Date(editingDateStr);
  openDayDetail(dateObj.getDate());
}

function deleteEditRecord(){
  showConfirmModal('この日の記録を削除しますか？', function() {
    var recs = state.records.filter(function(r){
      return new Date(r.date).toDateString() === editingDateStr;
    });
    recs.forEach(function(r){
      if(r.id) softDeleteRecord(r.id);
    });
    // IDがないレコードは旧方式で削除
    state.records = state.records.filter(function(r){
      return new Date(r.date).toDateString() !== editingDateStr || r.id;
    });
    saveState();
    buildCalendar();
    updateHistory();
    closeEditRecord();
    document.getElementById('dmOverlay').classList.remove('dm-open');
  });
}


// ===== 24H DONUT CHART =====
function createMealDonut(meals, fasting, fastingGoal){
  var R = 52, C = 2 * Math.PI * R;
  var hourUnit = C / 24;
  var cx = 64, cy = 64;


  // 食事スロット定義
  var mealSlots = [
    { key: '朝食', label: '朝食', defaultH: 7, duration: 1.5, color: '#F4B860' },
    { key: '昼食', label: '昼食', defaultH: 12, duration: 1.5, color: '#7FC8A9' },
    { key: '夕食', label: '夕食', defaultH: 19, duration: 1.5, color: '#E88D97' },
    { key: '間食', label: '間食', defaultH: 15, duration: 0.75, color: '#C4A7D7' }
  ];
  var fastColor = '#3D5A80', bgColor = '#F0EBE6', emptyColor = '#FAF6F2';

  // 食事エントリーを収集（時間付き）
  var foodTimes = [];
  var filledMeals = [];
  for(var i = 0; i < mealSlots.length; i++){
    var sl = mealSlots[i];
    if(meals && meals[sl.key]){
      filledMeals.push(sl);
      var h = sl.defaultH;
      // meals内に時間文字列があればパース
      var val = meals[sl.key];
      if(typeof val === 'string'){
        var tm = val.match(/(\d{1,2}):?(\d{2})/);
        if(tm) h = parseInt(tm[1],10) + parseInt(tm[2],10)/60;
      }
      foodTimes.push({ hour: h, slot: sl, isDrink: false });
    }
  }
  // firstTime / lastTime があればそこからも時間取得
  if(meals && meals.firstTime){
    var fp = meals.firstTime.split(':');
    var firstH = parseInt(fp[0],10) + parseInt(fp[1]||0,10)/60;
    if(foodTimes.length > 0) foodTimes[0].hour = firstH;
  }
  if(meals && meals.lastTime){
    var lp = meals.lastTime.split(':');
    var lastH = parseInt(lp[0],10) + parseInt(lp[1]||0,10)/60;
    if(foodTimes.length > 1) foodTimes[foodTimes.length - 1].hour = lastH;
  }
  // free テキストからもパース（飲み物判定含む）
  if(meals && meals.free && typeof meals.free === 'string'){
    var lines = meals.free.trim().split('\n');
    for(var li = 0; li < lines.length; li++){
      var line = lines[li].trim();
            var match = line.match(/^(\d{2})(\d{2})\s*(.*)/);
      if(match){
        var mh = parseInt(match[1],10) + parseInt(match[2],10)/60;
        var mlabel = match[3].trim();
        var drinkWords = mlabel.match(/飲み物|飲料|お水|水分|コーヒー|カフェラテ|カプチーノ|エスプレッソ|お茶|緑茶|麦茶|ほうじ茶|煎茶|玄米茶|番茶|紅茶|ハーブティー|ルイボス|ジュース|スムージー|牛乳|豆乳|ヨーグルト飲料|ラッシー|スポーツドリンク|ポカリ|アクエリ|アミノ酸|コーラ|サイダー|炭酸水|ソーダ|トニック|レモネード|甘酒|昆布水/g) || [];
        var allItems = mlabel.split(/[、,\/\s]+/).filter(function(s){ return s; });
        var isDrink = drinkWords.length > 0 && drinkWords.length >= allItems.length;

        // 既存スロットとラベル名でマッチするか
        var matched = false;
        for(var si = 0; si < foodTimes.length; si++){
          if(mlabel.indexOf(foodTimes[si].slot.key) !== -1){
            foodTimes[si].hour = mh;
            foodTimes[si].isDrink = isDrink;
            matched = true;
            break;
          }
        }
        if(!matched){
          // 時間帯から自動的にスロットを推定
          var autoSlot;
          if(mh >= 5 && mh < 10){
            autoSlot = mealSlots[0]; // 朝食
          } else if(mh >= 10 && mh < 14){
            autoSlot = mealSlots[1]; // 昼食
          } else if(mh >= 17 && mh < 22){
            autoSlot = mealSlots[2]; // 夕食
          } else {
            autoSlot = mealSlots[3]; // 間食
          }
          foodTimes.push({ hour: mh, slot: { key: mlabel, label: mlabel, defaultH: mh, duration: autoSlot.duration, color: autoSlot.color }, isDrink: isDrink });
        }
      }
    }
  }
  foodTimes.sort(function(a,b){ return a.hour - b.hour; });

  //  ファスティング計算：飲み物除外、最後の食事→翌日最初の食事が12h以上のみ表示
  var realFoods = foodTimes.filter(function(e){ return !e.isDrink; });
  var fastHours = 0;
  var showFasting = false;
  if(fasting && parseFloat(fasting) >= 12){
    fastHours = parseFloat(fasting);
    showFasting = true;
  } else if(realFoods.length >= 2){
    var lastFoodH = realFoods[realFoods.length - 1].hour;
    var firstFoodH = realFoods[0].hour;
    fastHours = Math.round(((24 - lastFoodH) + firstFoodH) * 10) / 10;
    if(fastHours >= 12) showFasting = true;
  }

  // --- SVG構築 ---
  var svg = '';
  // 背景円
  svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+emptyColor+'" stroke-width="10"/>';

  // 修復アーク（12h以上の場合のみ）
  if(showFasting && realFoods.length >= 2){
    var lastH2 = realFoods[realFoods.length - 1].hour;
    var startOff = (lastH2 / 24) * C;
    var fastLen = (fastHours / 24) * C;
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+fastColor+'" stroke-width="10" stroke-dasharray="'+fastLen+' '+(C - fastLen)+'" stroke-dashoffset="-'+startOff+'" opacity="0.25"/>';
  }

   // 食事アーク（飲み物は除外）
  for(var fi = 0; fi < foodTimes.length; fi++){
    var ft = foodTimes[fi];
    if(ft.isDrink) continue;
    var arcLen = ft.slot.duration * hourUnit;
    var offset = (ft.hour / 24) * C;
    svg += '<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="'+ft.slot.color+'" stroke-width="10" stroke-dasharray="'+arcLen+' '+(C - arcLen)+'" stroke-dashoffset="-'+offset+'" stroke-linecap="round"/>';
  }


  // 時刻マーカー（ドット）
  var markerSvg = '';
  var dotR = R + 5;
  for(var hi = 0; hi < 24; hi++){
    var angle = (hi / 24) * 360 - 90;
    var rad = angle * Math.PI / 180;
    var dx = cx + dotR * Math.cos(rad);
    var dy = cy + dotR * Math.sin(rad);
    markerSvg += '<circle cx="'+dx+'" cy="'+dy+'" r="1" fill="#d8ccc6"/>';
  }
  // 時刻ラベル（0,6,12,18）
  var labelR = R + 12;
  [0,6,12,18].forEach(function(h){
    var a2 = (h / 24) * 360 - 90;
    var r2 = a2 * Math.PI / 180;
    var lx = cx + labelR * Math.cos(r2);
    var ly = cy + labelR * Math.sin(r2);
    markerSvg += '<text x="'+lx+'" y="'+ly+'" text-anchor="middle" dominant-baseline="central" font-size="7" fill="#bbb">'+h+'</text>';
  });

  // HTML組み立て
  var html = '';
  html += '<div style="position:relative;width:200px;height:200px;margin:0 auto 8px;">';
  html += '<svg viewBox="-10 -10 148 148" style="width:100%;height:100%;transform:rotate(-90deg);">';
  html += svg;
  html += '</svg>';
  html += '<svg viewBox="-10 -10 148 148" style="position:absolute;top:0;left:0;width:100%;height:100%;">';
  html += markerSvg;
  html += '</svg>';
  // 中央テキスト
  html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;">';
  if(showFasting){
    html += '<div style="font-family:Shippori Mincho,serif;font-size:22px;font-weight:700;color:'+fastColor+';">'+fastHours+'<span style="font-size:12px;font-weight:400;">h</span></div>';
    html += '<div style="font-size:8px;color:var(--ink-light);letter-spacing:0.1em;margin-top:2px;">ファスティング</div>';
    var fGoalH = fastingGoal || 16;
    html += '<div style="font-size:9px;color:'+(fastHours >= fGoalH ? '#8aab96' : 'var(--ink-light)')+';margin-top:3px;">'+(fastHours >= fGoalH ? '✓ 目標達成' : '目標 '+fGoalH+'h')+'</div>';
  } else if(filledMeals.length > 0){
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;font-weight:700;color:var(--ink);">'+filledMeals.length+'<span style="font-size:13px;font-weight:400;color:var(--ink-light);">/4</span></div>';
    html += '<div style="font-size:8px;color:var(--ink-light);letter-spacing:0.12em;margin-top:2px;">meals</div>';
  } else {
    html += '<div style="font-size:10px;color:var(--ink-light);">未記録</div>';
  }
  html += '</div></div>';

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px 14px;margin-top:6px;">';
  for(var j = 0; j < mealSlots.length; j++){
    var ms = mealSlots[j];
    var has = false;
    for(var k = 0; k < filledMeals.length; k++){
      if(filledMeals[k].key === ms.key){ has = true; break; }
    }
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:'+(has ? 'var(--ink)' : 'var(--ink-light)')+';">';
    html += '<span style="width:8px;height:8px;border-radius:50%;background:'+(has ? ms.color : '#e8ddd8')+';display:inline-block;"></span>';
    html += ms.label + (has ? ' ✓' : '');
    html += '</span>';
  }
  if(showFasting){
    html += '<span style="display:flex;align-items:center;gap:4px;font-size:10px;color:'+fastColor+';">';
    html += '<span style="width:8px;height:8px;border-radius:2px;background:'+fastColor+';opacity:0.4;display:inline-block;"></span>';
    html += '修復 '+fastHours+'h';
    html += '</span>';
  }
  html += '</div>';

  return html;
}

// ===== 独自モーダル（alert/confirm代替） =====
function showConfirmModal(message, onConfirm, onCancel) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(44,36,32,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--cream);border-radius:22px;padding:28px 24px;width:85%;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(44,36,32,0.15);';
  box.innerHTML = '<div style="font-family:\'Shippori Mincho\',serif;font-size:17px;color:var(--ink);margin-bottom:16px;line-height:1.6;">' + message + '</div>'
    + '<div style="display:flex;gap:10px;">'
    + '<button id="_confirm_cancel" style="flex:1;padding:13px;border-radius:13px;border:1.5px solid #e8ddd8;background:var(--white);font-family:\'Noto Sans JP\',sans-serif;font-size:13px;color:var(--ink-mid);cursor:pointer;">キャンセル</button>'
    + '<button id="_confirm_ok" style="flex:1;padding:13px;border-radius:13px;border:none;background:var(--rose);font-family:\'Noto Sans JP\',sans-serif;font-size:13px;color:white;font-weight:500;cursor:pointer;">確認</button>'
    + '</div>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector('#_confirm_ok').onclick = function() { overlay.remove(); if (onConfirm) onConfirm(); };
  box.querySelector('#_confirm_cancel').onclick = function() { overlay.remove(); if (onCancel) onCancel(); };
}

function showPrivacyInfo() {
  showAlertModal(
    'あなたの記録について\n\n'
    + '・症状・体調の記録はあなただけが見られます\n'
    + '・広告配信への利用は行いません\n'
    + '・第三者へのデータ販売は行いません\n'
    + '・データはいつでも設定から削除できます\n'
    + '・クラウド同期はSupabaseの暗号化通信で行われます'
  );
}

function showAlertModal(message, onClose) {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(44,36,32,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--cream);border-radius:22px;padding:28px 24px;width:85%;max-width:320px;text-align:center;box-shadow:0 12px 40px rgba(44,36,32,0.15);';
  box.innerHTML = '<div style="font-family:\'Shippori Mincho\',serif;font-size:16px;color:var(--ink);margin-bottom:20px;line-height:1.7;">' + message + '</div>'
    + '<button style="width:100%;padding:13px;border-radius:13px;border:none;background:var(--rose);font-family:\'Noto Sans JP\',sans-serif;font-size:14px;color:white;font-weight:500;cursor:pointer;">閉じる</button>';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  box.querySelector('button').onclick = function() { overlay.remove(); if (onClose) onClose(); };
}

// ===== ファスティング機能のオプション化 =====
function toggleFastingFeature() {
  state.fastingEnabled = !state.fastingEnabled;
  saveState();
  applyFastingVisibility();
  var label = document.getElementById('fasting-toggle-label');
  if (label) label.textContent = state.fastingEnabled ? 'オン' : 'オフ';
}

function applyFastingVisibility() {
  var widget = document.getElementById('home-fasting-widget');
  var recoveryCard = document.getElementById('fast-recovery-card');
  var show = !!state.fastingEnabled;
  if (widget) widget.style.display = show ? 'block' : 'none';
  if (recoveryCard) recoveryCard.style.display = 'none'; // 終了時のみ表示
  // ファスティング中なら強制表示
  if (state.fastingActive && widget) widget.style.display = 'block';
  // ラベル更新
  var label = document.getElementById('fasting-toggle-label');
  if (label) label.textContent = show ? 'オン' : 'オフ';
}

// ===== 体温アラート =====
function checkSuddenTempRise(records, diseases) {
  if (diseases.indexOf('卵巣嚢腫') === -1) return null;

  var tempRecords = records
    .filter(function(r) { return r.temperature; })
    .sort(function(a, b) {
      return new Date(a.date || a.record_date) - new Date(b.date || b.record_date);
    });

  if (tempRecords.length < 2) return null;

  var latest = tempRecords[tempRecords.length - 1];
  var prev   = tempRecords[tempRecords.length - 2];
  var diff   = parseFloat(latest.temperature) - parseFloat(prev.temperature);

  if (diff >= 0.8) {
    return { level: 'caution', diff: diff.toFixed(1), latestTemp: latest.temperature };
  }
  if (parseFloat(latest.temperature) >= 38.0) {
    return { level: 'warning', temp: latest.temperature };
  }
  return null;
}

function checkAndShowTempAlert() {
  var diseases = state.myDiseases || [];
  if (!state.records || state.records.length < 2) return;

  // 既存 calcTemperaturePhases alerts チェック
  var tempCount = state.records.filter(function(r) { return r.temperature; }).length;
  if (tempCount >= 14) {
    var analysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records);
    if (analysis && analysis.alerts && analysis.alerts.length > 0) {
      var hasEmergency = analysis.alerts.some(function(a) {
        return a.level === 'emergency' || a.level === 'danger';
      });
      if (hasEmergency) {
        showTempAlertBanner('体温に気になるパターンがあります。体温グラフで確認してください', 'warn');
        return;
      }
    }
  }

  // 急激な体温上昇チェック（卵巣嚢腫ユーザーのみ）
  var suddenRise = checkSuddenTempRise(state.records, diseases);
  if (suddenRise) {
    var msg = suddenRise.level === 'warning'
      ? '体温が' + suddenRise.temp + '℃と高めです。腹痛や吐き気を伴う場合は医療機関にご相談ください'
      : '前日より体温が' + suddenRise.diff + '℃上昇しています。腹痛や吐き気を伴う場合は医療機関にご相談ください';
    showTempAlertBanner(msg, suddenRise.level === 'warning' ? 'danger' : 'caution');
  }
}

function showTempAlertBanner(message, level) {
  var existing = document.getElementById('temp-alert-banner');
  if (existing) existing.remove();

  var colors = {
    'danger':  { bg: '#fde8e8', border: '#c4878c', text: '#8a4050', btn: '#c4878c' },
    'caution': { bg: '#fdf3e8', border: '#d4a574', text: '#7a5020', btn: '#d4a574' },
    'warn':    { bg: '#fdf8e8', border: '#d4c474', text: '#6a5820', btn: '#d4c474' }
  };
  var c = colors[level] || colors['warn'];

  var banner = document.createElement('div');
  banner.id = 'temp-alert-banner';
  banner.style.cssText = 'margin:0 20px 12px;background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:14px;padding:12px 14px;';
  banner.innerHTML =
    '<div style="font-size:12px;color:' + c.text + ';line-height:1.6;margin-bottom:8px;">🌡️ ' + message + '</div>'
    + '<div style="font-size:10px;color:' + c.text + ';opacity:0.75;margin-bottom:8px;">※ これは記録データに基づく参考情報です。医学的診断ではありません。</div>'
    + '<div style="display:flex;gap:8px;">'
    + '<button onclick="premiumGate(openTempReport)" style="flex:1;padding:8px;background:' + c.btn + ';color:white;border:none;border-radius:10px;font-size:11px;font-family:\'Noto Sans JP\',sans-serif;cursor:pointer;">体温グラフを確認する</button>'
    + '<button onclick="document.getElementById(\'temp-alert-banner\').remove()" style="padding:8px 12px;background:transparent;border:1px solid ' + c.border + ';border-radius:10px;font-size:11px;color:' + c.text + ';cursor:pointer;">閉じる</button>'
    + '</div>';

  // CTAカード直後に挿入
  var ctaCard = document.getElementById('home-record-cta');
  if (ctaCard && ctaCard.parentNode) {
    ctaCard.parentNode.insertBefore(banner, ctaCard.nextSibling);
  }
}

// ===== クイック症状ログ（後方互換のため残す） =====
var _quickPainLevel = -1;
var _quickSelectedSymptoms = [];

function initQuickLog() {
  // 疾患設定から症状チップを生成（最大6個）
  var chips = [];
  var diseases = state.myDiseases || [];
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (chips.indexOf(s) === -1 && chips.length < 6) chips.push(s);
    });
  });
  // 疾患設定がない場合のデフォルト
  if (chips.length === 0) {
    chips = ['下腹部痛', '腰痛', '頭痛', '骨盤周りの痛み', 'だるさ', '気分の落ち込み'];
  }

  var container = document.getElementById('quick-symptom-chips');
  if (!container) return;
  container.innerHTML = '';
  _quickSelectedSymptoms = [];
  chips.forEach(function(s) {
    var btn = document.createElement('button');
    btn.textContent = s;
    btn.style.cssText = 'padding:6px 13px;border-radius:20px;border:1.5px solid #e8ddd8;background:var(--white);font-size:12px;font-family:\'Noto Sans JP\',sans-serif;color:var(--ink);cursor:pointer;transition:all 0.2s;';
    btn.onclick = function() {
      var idx = _quickSelectedSymptoms.indexOf(s);
      if (idx !== -1) {
        _quickSelectedSymptoms.splice(idx, 1);
        btn.style.background = 'var(--white)';
        btn.style.borderColor = '#e8ddd8';
        btn.style.color = 'var(--ink)';
      } else {
        _quickSelectedSymptoms.push(s);
        btn.style.background = 'var(--rose-pale)';
        btn.style.borderColor = 'var(--rose)';
        btn.style.color = 'var(--plum)';
      }
    };
    container.appendChild(btn);
  });

  // 今日すでに記録済みかチェック
  var today = new Date().toISOString().slice(0, 10);
  var todayRecord = (state.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (todayRecord) {
    showQuickLogDone();
  }
}

function selectQuickPain(level, btn) {
  _quickPainLevel = level;
  document.querySelectorAll('#quick-pain-scale button').forEach(function(b) {
    b.style.background = 'var(--white)';
    b.style.borderColor = '#e8ddd8';
  });
  btn.style.background = 'var(--rose-pale)';
  btn.style.borderColor = 'var(--rose)';
}

function saveQuickLog() {
  var today = new Date().toISOString().slice(0, 10);
  // 既存の今日のレコードに追記、なければ新規作成
  var existing = (state.records || []).find(function(r) {
    return r.date && r.date.slice(0, 10) === today;
  });
  if (existing) {
    if (_quickSelectedSymptoms.length > 0) {
      existing.symptoms = existing.symptoms || [];
      _quickSelectedSymptoms.forEach(function(s) {
        if (existing.symptoms.indexOf(s) === -1) existing.symptoms.push(s);
      });
    }
    if (_quickPainLevel >= 0) existing.painLevel = _quickPainLevel;
    existing.updatedAt = new Date().toISOString();
  } else {
    var rec = {
      id: generateRecordId(),
      date: today,
      record_date: today,
      symptoms: _quickSelectedSymptoms.slice(),
      painLevel: _quickPainLevel >= 0 ? _quickPainLevel : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.records = state.records || [];
    state.records.push(rec);
  }
  saveAndSync();
  showQuickLogDone();
  _quickSelectedSymptoms = [];
  _quickPainLevel = -1;
  updateHomeSummary();
  buildCalendar();
}

function showQuickLogDone() {
  var btn = document.getElementById('quick-log-btn');
  var status = document.getElementById('quick-log-status');
  if (btn) {
    btn.textContent = '✓ 今日の記録済み';
    btn.style.background = 'var(--sage)';
    btn.disabled = true;
  }
  if (status) {
    status.textContent = '記録済み';
    status.style.color = 'var(--sage)';
  }
}

function buildCalendar(){
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('buildCalendar', buildCalendar);
    return;
  }
  var label = document.getElementById('calLabel');
  var grid = document.getElementById('calGrid');
  if(!label||!grid) return;
  label.textContent = calYear + '年 ' + (calMonth+1) + '月';
  grid.innerHTML = '';
  var firstDow = new Date(calYear, calMonth, 1).getDay();
  var daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  var today = new Date();
  for(var e=0; e<firstDow; e++){
    var empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }
  for(var d=1; d<=daysInMonth; d++){
    var el = document.createElement('div');
    el.className = 'cal-day';
    var isToday = d===today.getDate() && calMonth===today.getMonth() && calYear===today.getFullYear();
    if(isToday) el.classList.add('today');
    var ds = new Date(calYear, calMonth, d).toDateString();
    var localDs = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var hasRec = state.records.some(function(r){ return (r.date && new Date(r.date).toDateString() === ds) || (r.record_date && r.record_date.slice(0, 10) === localDs); });
    if(hasRec) el.classList.add('has-record');
    // 痛みレベルに応じたクラスを付与
    if(hasRec) {
      var rec = state.records.find(function(r) {
        return (r.date && new Date(r.date).toDateString() === ds) || (r.record_date && r.record_date.slice(0, 10) === localDs);
      });
      if(rec) {
        var pain = rec.painLevel;
        if(pain !== null && pain !== undefined && pain >= 0) {
          el.classList.add('pain-' + Math.min(pain, 4));
        } else {
          el.classList.add('has-record-no-pain');
        }
      }
    }
    el.textContent = d;
    el.addEventListener('click', (function(day){ return function(){ openDayDetail(day); }; })(d));
    grid.appendChild(el);
  }
}

// カレンダータブ：月別サマリーカード描画
function renderCalendarMonthlySummary() {
  var el = document.getElementById('cal-monthly-summary');
  if (!el) return;
  var monthStr = calYear + '-' + String(calMonth + 1).padStart(2, '0');
  var recs = state.records.filter(function(r) {
    return (r.date && r.date.slice(0, 7) === monthStr) ||
           (r.record_date && r.record_date.slice(0, 7) === monthStr);
  });
  if (recs.length === 0) {
    el.innerHTML = '<div style="text-align:center;color:var(--ink-light);font-size:12px;padding:8px 0;">' + calYear + '年' + (calMonth + 1) + '月の記録はまだありません</div>';
    return;
  }
  // 集計
  var painTotal = 0, painCount = 0, symptomMap = {};
  recs.forEach(function(r) {
    if (r.painLevel !== null && r.painLevel !== undefined) { painTotal += r.painLevel; painCount++; }
    if (r.symptoms) r.symptoms.forEach(function(s) { symptomMap[s] = (symptomMap[s] || 0) + 1; });
  });
  var avgPain = painCount > 0 ? (painTotal / painCount).toFixed(1) : '—';
  var topSymptoms = Object.keys(symptomMap).sort(function(a, b) { return symptomMap[b] - symptomMap[a]; }).slice(0, 3);
  var html = '<div style="display:flex;gap:16px;margin-bottom:10px;">';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + recs.length + '</div><div style="font-size:10px;color:var(--ink-light);">記録日数</div></div>';
  html += '<div style="flex:1;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--rose);">' + avgPain + '</div><div style="font-size:10px;color:var(--ink-light);">平均痛みレベル</div></div>';
  html += '</div>';
  if (topSymptoms.length > 0) {
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:6px;">多かった症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    topSymptoms.forEach(function(s) {
      html += '<span style="background:var(--rose-pale);color:var(--rose-dark);border-radius:20px;padding:3px 10px;font-size:11px;">' + s + ' <span style="opacity:0.6;">×' + symptomMap[s] + '</span></span>';
    });
    html += '</div>';
  }
  // month label サブタイトル更新
  var subLabel = document.getElementById('cal-screen-month-label');
  if (subLabel) subLabel.textContent = calYear + '年 ' + (calMonth + 1) + '月 — ' + recs.length + '件の記録';
  el.innerHTML = html;
}

function changeMonth(delta){
  calMonth += delta;
  if(calMonth > 11){ calMonth = 0; calYear++; }
  if(calMonth < 0){ calMonth = 11; calYear--; }
  buildCalendar();
  renderCalendarMonthlySummary();
}

document.addEventListener('DOMContentLoaded', function(){
  var prev = document.getElementById('calPrev');
  var next = document.getElementById('calNext');
  if(prev) prev.addEventListener('click', function(){ if(typeof window.changeMonth==='function') window.changeMonth(-1); });
  if(next) next.addEventListener('click', function(){ if(typeof window.changeMonth==='function') window.changeMonth(1); });
  var dmClose = document.getElementById('dmClose');
  if(dmClose) dmClose.addEventListener('click', function(){ document.getElementById('dmOverlay').classList.remove('dm-open'); });
  var dmOverlay = document.getElementById('dmOverlay');
  if(dmOverlay) dmOverlay.addEventListener('click', function(e){ if(e.target===e.currentTarget) e.currentTarget.classList.remove('dm-open'); });
  updateSymptomSettingDisplay();
  updateDiseaseSettingDisplay();
  if (typeof ICONS !== 'undefined') {
    initNavIcons();
    initSettingsIcons();
    // カレンダーナビ矢印をSVGに
    var calPrevBtn = document.getElementById('calPrev');
    var calNextBtn = document.getElementById('calNext');
    if (calPrevBtn) calPrevBtn.innerHTML = ICONS.chevronLeft(16, 'var(--ink-mid)');
    if (calNextBtn) calNextBtn.innerHTML = ICONS.chevronRight(16, 'var(--ink-mid)');
  }
  updateHomeCTA();
  updateHomeCTAState();
  updateStreakBadge();
  updateHomeSummary();
  buildHomeWeekRow();
  updateHomeInsightCard();
  updateHomeNumbers();
  updateHomeDiseaseAdvice();
  if (typeof updateDailyHintCard === 'function') updateDailyHintCard();
  if (typeof updateHomePhaseBanner === 'function') updateHomePhaseBanner();
  if (typeof updateTodayMessage === 'function') updateTodayMessage();
  applyFastingVisibility();
  if (typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();
  var fastDisplay = document.getElementById('fast-goal-display');
  if(fastDisplay) fastDisplay.textContent = (state.fastingGoal || 16) + 'h';
  loadCommunityTopic();
  var welcomeEl = document.getElementById('screen-welcome');
  if (welcomeEl && welcomeEl.style.display !== 'none') {
    if (typeof obInit === 'function') obInit();
  }
  if (typeof bindOnboardingEvents === 'function') bindOnboardingEvents();
});

function openDayDetail(d){
  var WDAY = ['日','月','火','水','木','金','土'];
  var dateObj = new Date(calYear, calMonth, d);
  var ds = dateObj.toDateString();
  var w = dateObj.getDay();
  var isoDateStr = dateObj.getFullYear()+'-'+String(dateObj.getMonth()+1).padStart(2,'0')+'-'+String(dateObj.getDate()).padStart(2,'0');
  var recs = state.records.filter(function(r){
    if(r.date) return new Date(r.date).toDateString() === ds;
    if(r.record_date) return new Date(r.record_date + 'T00:00:00').toDateString() === ds;
    return false;
  });
  document.getElementById('dmDate').textContent = calYear+'年'+(calMonth+1)+'月'+d+'日（'+WDAY[w]+'）';
  var body = document.getElementById('dmBody');
  if(recs.length === 0){
    var emptyHtml = '<div class="dm-empty">この日の記録はありません</div>';
    emptyHtml += '<div style="margin-top:16px;padding:0 4px;">';
    emptyHtml += '<button onclick="editPastRecord(\''+isoDateStr+'\')" style="width:100%;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">✏️ この日の記録を作成する</button>';
    emptyHtml += '</div>';
    body.innerHTML = emptyHtml;
    document.getElementById('dmOverlay').classList.add('dm-open');
    return;
  }
  var rec = recs[recs.length - 1];
  var html = '';
  var tags = [];
  if(rec.wellness) tags.push('体調 '+rec.wellness+'/5');
  if(rec.foodScore) tags.push('食事 '+rec.foodScore+'/10');
  if(rec.fasting) tags.push('修復 '+rec.fasting+'h');
  if(rec.emotion) tags.push(rec.emotion);
  if(rec.symptoms && rec.symptoms.length) tags.push(rec.symptoms.join('・'));
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') tags.push('生理: '+rec.menstrualCycle);
  if(tags.length){
    html += '<div class="dm-record-tags">';
    tags.forEach(function(t){ html += '<span class="dm-tag">'+t+'</span>'; });
    html += '</div>';
  }

  // ===== 食事内容テキスト =====
  if(rec.mealFree || (rec.meals && rec.meals.free)){
    var freeText = rec.mealFree || rec.meals.free;
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
    html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.9;white-space:pre-wrap;">'+escapeHtml(freeText)+'</div>';
    if(rec.mealCount || rec.firstMealTime){
      html += '<div style="display:flex;gap:12px;margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe6;">';
      if(rec.mealCount) html += '<span style="font-size:11px;color:var(--ink-light);">🍽 '+rec.mealCount+'食</span>';
      if(rec.firstMealTime && rec.lastMealTime) html += '<span style="font-size:11px;color:var(--ink-light);">⏰ '+rec.firstMealTime+'〜'+rec.lastMealTime+'</span>';
      if(rec.fasting) html += '<span style="font-size:11px;color:var(--ink-light);">🌙 修復 '+rec.fasting+'h</span>';
      html += '</div>';
    }
    html += '</div>';
  } else if(rec.meals){
    var m = rec.meals;
    var mealRows = [];
    if(m.morning) mealRows.push({icon:'🌅', label:'朝食', text:m.morning, time:m.morningTime||''});
    if(m.lunch)   mealRows.push({icon:'☀️', label:'昼食', text:m.lunch,   time:m.lunchTime||''});
    if(m.dinner)  mealRows.push({icon:'🌙', label:'夕食', text:m.dinner,  time:m.dinnerTime||''});
    if(m.snack)   mealRows.push({icon:'🍪', label:'間食', text:m.snack,   time:m.snackTime||''});
    if(mealRows.length){
      html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
      html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">MEALS</div>';
      for(var mi=0;mi<mealRows.length;mi++){
        var mr = mealRows[mi];
        html += '<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:'+(mi<mealRows.length-1?'10px':'0')+';padding-bottom:'+(mi<mealRows.length-1?'10px':'0')+';border-bottom:'+(mi<mealRows.length-1?'1px solid #f0ebe6':'none')+';">';
        html += '<span style="font-size:18px;flex-shrink:0;margin-top:2px;">'+mr.icon+'</span>';
        html += '<div style="flex:1;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-size:12px;font-weight:500;color:var(--ink);">'+mr.label+'</span>';
        if(mr.time) html += '<span style="font-size:10px;color:var(--ink-light);">'+mr.time+'</span>';
        html += '</div>';
        html += '<div style="font-size:13px;color:var(--ink-mid);line-height:1.7;margin-top:3px;">'+escapeHtml(mr.text)+'</div>';
        html += '</div></div>';
      }
      html += '</div>';
    }
  }

  // ===== ファスティングセクション =====
  if(rec.fasting){
    var fGoal = rec.fastingGoal || 16;
    var fHours = parseFloat(rec.fasting) || 0;
    var fPct = Math.min(fHours / fGoal, 1);
    var fR = 28, fC = 2 * Math.PI * fR;
    var fOffset = fC - (fC * fPct);
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#f9edd8,#fff0f0);border-radius:14px;padding:16px;color:var(--ink);">';
    html += '<div style="font-size:10px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:8px;">FASTING</div>';
    html += '<div style="display:flex;align-items:center;gap:12px;">';
    html += '<div style="position:relative;width:64px;height:64px;flex-shrink:0;">';
    html += '<svg viewBox="0 0 64 64" style="width:100%;height:100%;transform:rotate(-90deg);">';
    html += '<circle cx="32" cy="32" r="'+fR+'" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    html += '<circle cx="32" cy="32" r="'+fR+'" fill="none" stroke="'+(fPct>=1?'#8aab96':'#e8c49a')+'" stroke-width="5" stroke-dasharray="'+fC+'" stroke-dashoffset="'+fOffset+'" stroke-linecap="round"/>';
    html += '</svg>';
    html += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:16px;font-weight:700;color:var(--ink);">'+fHours+'</div>';
    html += '<div style="font-size:7px;color:var(--ink-light);letter-spacing:0.1em;">時間</div>';
    html += '</div></div>';
    html += '<div style="flex:1;">';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:15px;margin-bottom:4px;color:var(--ink);">'+fHours+'時間のファスティング</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);">目標 '+fGoal+'時間'+(fPct>=1?' ✓ 達成':'')+'</div>';
    html += '</div></div></div>';
  }

  // ===== 生理・痛み・服薬・経血詳細 =====
  var extras = [];
  if(rec.temperature) extras.push('🌡 '+rec.temperature+'℃');
  if(rec.menstrualCycle && rec.menstrualCycle !== 'なし') extras.push('🌸 '+rec.menstrualCycle);
  if(rec.symptoms && rec.symptoms.length) extras.push(rec.symptoms.join('・'));
  if(rec.painLevel && rec.painLevel > 0){
    var painText = '痛み '+rec.painLevel+'/10';
    if(rec.painLocation && rec.painLocation.length) painText += '（'+rec.painLocation.join('・')+'）';
    if(rec.painType && rec.painType.length) painText += ' '+rec.painType.join('・');
    extras.push('🔴 '+painText);
  }
  if(rec.medication && rec.medication.length) extras.push('💊 '+rec.medication.join('・'));
  if(rec.bloodClot && rec.bloodClot.length) extras.push('🩸 '+rec.bloodClot.join('・'));
  if(rec.bloodColor && rec.bloodColor.length) extras.push(rec.bloodColor.join('・'));
  if(extras.length){
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">生理・症状</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    extras.forEach(function(e){ html += '<span style="font-size:11px;background:var(--warm-light);color:var(--ink-mid);padding:4px 10px;border-radius:12px;">'+e+'</span>'; });
    html += '</div></div>';
  }

  // ===== 疾患セルフチェック =====
  if(rec.diseaseCheck && Object.keys(rec.diseaseCheck).length){
    var dc = rec.diseaseCheck;
    var _fbDisease = (rec.diseases && rec.diseases[0]) || (state.myDiseases && state.myDiseases[0]) || '';
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">セルフチェック</div>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
    Object.keys(dc).forEach(function(key){
      if(!dc[key] || dc[key] === 'なし') return;
      var parts = key.split('__');
      var dKey = parts.length > 1 ? parts[0] : _fbDisease;
      var qId = parts.length > 1 ? parts[1] : key;
      var qCfg = typeof DISEASE_CONFIG !== 'undefined' ? DISEASE_CONFIG[dKey] : null;
      var label = qId;
      if(qCfg && qCfg.questions){
        for(var qi=0;qi<qCfg.questions.length;qi++){
          if(qCfg.questions[qi].id === qId){ label = qCfg.questions[qi].text.replace('？',''); break; }
        }
      }
      html += '<span style="font-size:11px;background:#f3f0fd;color:#6b5b8a;padding:4px 10px;border-radius:12px;">'+label+': '+dc[key]+'</span>';
    });
    html += '</div></div>';
  }

  // ===== エネルギー・睡眠・生活ファクター・お通じ =====
  var lifeItems = [];
  if(rec.energy) lifeItems.push({label:'エネルギー', val: rec.energy+'/5 '+'●'.repeat(rec.energy)+'○'.repeat(5-rec.energy)});
  if(rec.sleepBed || rec.sleepWake){
    var sleepStr = '';
    if(rec.sleepBed) sleepStr += '就寝 '+rec.sleepBed;
    if(rec.sleepWake) sleepStr += (sleepStr?' / ':'')+'起床 '+rec.sleepWake;
    if(rec.sleepQuality) sleepStr += ' ／ 質'+rec.sleepQuality+'/5';
    lifeItems.push({label:'睡眠', val: sleepStr});
  }
  if(rec.bowel) lifeItems.push({label:'お通じ', val: rec.bowel});
  if(rec.factors && rec.factors.length) lifeItems.push({label:'生活', val: rec.factors.join('・')});
  if(lifeItems.length){
    html += '<div style="margin-top:14px;background:var(--white);border-radius:14px;padding:14px;box-shadow:0 1px 6px var(--shadow);">';
    html += '<div style="font-size:10px;color:var(--ink-light);letter-spacing:0.15em;margin-bottom:10px;">ライフスタイル</div>';
    lifeItems.forEach(function(item){
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #f5f0eb;">';
      html += '<span style="font-size:11px;color:var(--ink-light);">'+item.label+'</span>';
      html += '<span style="font-size:12px;color:var(--ink-mid);">'+item.val+'</span>';
      html += '</div>';
    });
    html += '</div>';
  }

  // ===== メモ（体温・ジャーナル統合） =====
  var memoItems = [];
  if(rec.temperature && extras.indexOf('🌡 '+rec.temperature+'℃') === -1) memoItems.push({icon:'🌡', text:'基礎体温 '+rec.temperature+'℃'});
  if(rec.note) memoItems.push({icon:'📝', text:rec.note});
  if(memoItems.length){
    html += '<div style="margin-top:14px;background:var(--rose-pale);border-radius:14px;padding:14px;border-left:3px solid var(--rose);">';
    html += '<div style="font-size:10px;color:var(--rose);letter-spacing:0.15em;margin-bottom:8px;">MEMO</div>';
    for(var ni=0;ni<memoItems.length;ni++){
      var item = memoItems[ni];
      if(ni > 0) html += '<div style="border-top:1px solid var(--rose-light);margin:8px 0;"></div>';
      html += '<div style="display:flex;align-items:flex-start;gap:8px;">';
      html += '<span style="font-size:14px;flex-shrink:0;">'+item.icon+'</span>';
      html += '<div style="font-size:13px;color:var(--ink);line-height:1.8;">'+escapeHtml(item.text).replace(/\n/g,'<br>')+'</div>';
      html += '</div>';
    }
    html += '</div>';
  }

  // ===== ウェルネス / SMIスコア =====
  if(rec.wellnessScore !== undefined){
    var ws = rec.wellnessScore;
    var wsColor = ws >= 70 ? '#6b9e78' : ws >= 40 ? '#d4a574' : '#c4878c';
    html += '<div style="margin-top:14px;background:linear-gradient(135deg,#faf6f2,#f0ebe6);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;">';
    html += '<div style="position:relative;width:56px;height:56px;flex-shrink:0;">';
    html += '<svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#e8ddd8" stroke-width="5"/>';
    var pct = ws/100, circ = 2*Math.PI*24;
    html += '<circle cx="28" cy="28" r="24" fill="none" stroke="'+wsColor+'" stroke-width="5" stroke-dasharray="'+Math.round(circ*pct)+' '+Math.round(circ*(1-pct))+'" stroke-linecap="round" transform="rotate(-90 28 28)"/>';
    html += '</svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:Inter,sans-serif;font-size:16px;font-weight:700;color:'+wsColor+';">'+ws+'</div></div>';
    html += '<div><div style="font-size:12px;font-weight:500;color:var(--ink);">ウェルネススコア</div>';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-top:2px;">'+(ws>=70?'良好な状態です':ws>=40?'まずまずの状態です':'少し注意が必要です')+'</div></div></div>';
  }

  // ===== 編集ボタン =====
  html += '<div style="margin-top:16px;padding-top:14px;border-top:1px solid #f0ebe6;">';
  html += '<button onclick="editPastRecord(\''+isoDateStr+'\')" style="width:100%;padding:14px;background:var(--ink);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.2s;">';
  html += '<span style="font-size:16px;">✏️</span> この日の記録を編集する</button>';
  html += '</div>';

  body.innerHTML = html;
  document.getElementById('dmOverlay').classList.add('dm-open');
}



// ===== 記録モーダル → 詳細記録画面への引き継ぎ =====
function prefillRecordFromModal() {
  var today = new Date().toISOString().slice(0, 10);
  var rec = (state.records || []).find(function(r) {
    return (r.date || r.record_date || '').slice(0, 10) === today;
  });
  if (!rec) return;

  // モーダルで保存された症状を症状チップに反映
  if (rec.symptoms && rec.symptoms.length > 0) {
    document.querySelectorAll('#rs-symptoms .chip').forEach(function(chip) {
      if (rec.symptoms.indexOf(chip.textContent.trim()) !== -1) {
        chip.classList.add('selected');
      }
    });
  }

  // 痛みレベルをスライダーに反映
  if (rec.painLevel !== null && rec.painLevel !== undefined) {
    var painSlider = document.getElementById('rs-pain-level');
    var painDisplay = document.getElementById('pain-level-display');
    if (painSlider) painSlider.value = rec.painLevel;
    if (painDisplay) painDisplay.textContent = rec.painLevel;
  }
}

// ===== RECORD SCREEN =====
function openRecordScreen(){
  // welcome-reset-guard が setTimeout(0) で showScreen(getCurrentScreen()) を呼ぶため、
  // state.currentScreen を先に更新しないと旧タブに戻される。
  state.currentScreen = 'record';
    // 今日の記録が既にある場合は自動的に編集モードにする
  if(!state.editingDate){
    var todayStr = new Date().toDateString();
    var todaySlice = new Date().toISOString().slice(0, 10);
    var todayExists = state.records.some(function(r){
      return (r.date && new Date(r.date).toDateString() === todayStr) ||
             (r.record_date && r.record_date.slice(0, 10) === todaySlice);
    });
    if(todayExists){
      state.editingDate = todaySlice;
    }
  }

  var now = new Date();
  var wd = ['日','月','火','水','木','金','土'];
  
  // ★ 編集モード：対象日の日付とデータを使用
  var isEditing = !!state.editingDate;
  var targetDate = isEditing ? new Date(state.editingDate) : now;
  
  var el = document.getElementById('rec-screen-date');
  if(el) el.textContent = targetDate.getFullYear()+'年'+(targetDate.getMonth()+1)+'月'+targetDate.getDate()+'日（'+wd[targetDate.getDay()]+'）';
  
  // フォームをリセット
  ['rs-morning','rs-lunch','rs-dinner','rs-snack','rs-note'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
  ['rs-first-time','rs-last-time'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
  var te = document.getElementById('rs-temp'); if(te) te.value='';
  var mealFreeEl = document.getElementById('rs-meal-free'); if(mealFreeEl) mealFreeEl.value='';
  document.querySelectorAll('#rs-cycle .chip').forEach(function(c){ c.classList.remove('selected'); });
  renderSymptomLayers(); // 3層チップを描画（選択リセット込み）
  var di = document.getElementById('draft-indicator');
  if(di) di.style.display = 'none';
    // 追加フォームのリセット
  document.querySelectorAll('#rs-pain-location .chip, #rs-pain-type .chip, #rs-medication .chip, #rs-blood-clot .chip, #rs-blood-color .chip').forEach(function(c){ c.classList.remove('selected'); });
  var painLevel = document.getElementById('rs-pain-level');
  if(painLevel){ painLevel.value = 0; }
  var painDisplay = document.getElementById('pain-level-display');
  if(painDisplay){ painDisplay.textContent = '0'; }
  var painSection = document.getElementById('pain-detail-section');
  if(painSection){ painSection.style.display = 'none'; } // 痛み症状選択時に展開
  var cycleDetail = document.getElementById('cycle-detail-section');
  if(cycleDetail){ cycleDetail.style.display = 'none'; }
  // 気分・おりもの・便カウントをリセット
  document.querySelectorAll('#rs-mood .chip').forEach(function(c){ c.classList.remove('selected'); });
  document.querySelectorAll('#rs-discharge-amount .chip, #rs-discharge-type .chip').forEach(function(c){ c.classList.remove('selected'); });
  _bowelCount = 0;
  var _bcd = document.getElementById('bowel-count-display'); if(_bcd) _bcd.textContent = '0';
  // 詳細セクションの折りたたみ状態をlocalStorageから復元
  try{
    var _detailsOpen = localStorage.getItem('ippo_rec_details_open') === '1';
    var _detailsSec = document.getElementById('rec-details-section');
    var _detailsArrow = document.getElementById('rec-details-arrow');
    if(_detailsSec) _detailsSec.style.display = _detailsOpen ? 'block' : 'none';
    if(_detailsArrow) _detailsArrow.textContent = _detailsOpen ? '▴' : '▾';
  }catch(e){}
  setTimeout(function(){ updateRecProgressDots(); }, 100);
  // 記録モーダルで保存済みの症状・痛みを引き継ぐ（非編集モード時のみ）
  if(!isEditing){ prefillRecordFromModal(); }
  // ★ 編集モード：既存記録をフォームに復元
  if(isEditing){
    var editDateStr = targetDate.toDateString();
    var editRec = null;
    for(var ri=0; ri<state.records.length; ri++){
      var _r = state.records[ri];
      var _rDateStr = _r.date ? new Date(_r.date).toDateString()
                    : _r.record_date ? new Date(_r.record_date + 'T00:00:00').toDateString()
                    : '';
      if(_rDateStr === editDateStr){
        editRec = _r;
        break;
      }
    }
    if(editRec){
      if(editRec.temperature){ var et=document.getElementById('rs-temp'); if(et) et.value=editRec.temperature; }
      if(editRec.note){ var en=document.getElementById('rs-note'); if(en) en.value=editRec.note; }
      if(editRec.mealFree){ var mf=document.getElementById('rs-meal-free'); if(mf){ mf.value=editRec.mealFree; if(typeof updateMealParse==='function') updateMealParse(); } }
      if(editRec.meals){
        var m=editRec.meals;
        if(m.morning){ var em=document.getElementById('rs-morning'); if(em) em.value=m.morning; }
        if(m.lunch){ var el2=document.getElementById('rs-lunch'); if(el2) el2.value=m.lunch; }
        if(m.dinner){ var ed=document.getElementById('rs-dinner'); if(ed) ed.value=m.dinner; }
        if(m.snack){ var es=document.getElementById('rs-snack'); if(es) es.value=m.snack; }
        if(m.free){ var ef=document.getElementById('rs-meal-free'); if(ef){ ef.value=m.free; if(typeof updateMealParse==='function') updateMealParse(); } }
      }
      if(editRec.firstMealTime){ var ft=document.getElementById('rs-first-time'); if(ft) ft.value=editRec.firstMealTime; }
      if(editRec.lastMealTime){ var lt=document.getElementById('rs-last-time'); if(lt) lt.value=editRec.lastMealTime; }
      if(editRec.symptoms && editRec.symptoms.length){
        document.querySelectorAll('#rs-symptoms .chip').forEach(function(c){
          if(editRec.symptoms.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      if(editRec.menstrualCycle){
        document.querySelectorAll('#rs-cycle .chip').forEach(function(c){
          if(c.textContent === editRec.menstrualCycle) c.classList.add('selected');
        });
      }
            // 痛みの詳細を復元
      if(editRec.painLocation && editRec.painLocation.length){
        document.querySelectorAll('#rs-pain-location .chip').forEach(function(c){
          if(editRec.painLocation.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      if(editRec.painType && editRec.painType.length){
        document.querySelectorAll('#rs-pain-type .chip').forEach(function(c){
          if(editRec.painType.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      if(editRec.painLevel){
        var pl = document.getElementById('rs-pain-level');
        var pld = document.getElementById('pain-level-display');
        if(pl){ pl.value = editRec.painLevel; }
        if(pld){ pld.textContent = editRec.painLevel; }
      }
      // 痛み症状が選択済みなら詳細セクションを表示
      var hasPainOnEdit = (editRec.painLevel && editRec.painLevel > 0)
        || (editRec.painLocation && editRec.painLocation.length)
        || (editRec.painType && editRec.painType.length)
        || (function(){ var painSyms = ['頭痛','腰痛','下腹部痛','関節痛','排便痛','性交痛']; var found = false; document.querySelectorAll('#rs-symptoms .chip.selected').forEach(function(c){ if(painSyms.indexOf(c.textContent)!==-1) found=true; }); return found; })();
      var painSection = document.getElementById('pain-detail-section');
      if(painSection){ painSection.style.display = hasPainOnEdit ? 'block' : 'none'; }
      // 服薬を復元
      if(editRec.medication && editRec.medication.length){
        document.querySelectorAll('#rs-medication .chip').forEach(function(c){
          if(editRec.medication.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
            // 経血詳細を復元
      if(editRec.bloodClot && editRec.bloodClot.length){
        document.querySelectorAll('#rs-blood-clot .chip').forEach(function(c){
          if(editRec.bloodClot.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      if(editRec.bloodColor && editRec.bloodColor.length){
        document.querySelectorAll('#rs-blood-color .chip').forEach(function(c){
          if(editRec.bloodColor.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
            // エネルギー復元
      if(editRec.energy){
        document.querySelectorAll('#rs-energy .chip').forEach(function(c){
          if(parseInt(c.getAttribute('data-val'))===editRec.energy) c.classList.add('selected');
        });
      }
      // 睡眠復元
      if(editRec.sleepBed){ var sb=document.getElementById('rs-sleep-bed'); if(sb) sb.value=editRec.sleepBed; }
      if(editRec.sleepWake){ var sw=document.getElementById('rs-sleep-wake'); if(sw) sw.value=editRec.sleepWake; }
      if(editRec.sleepQuality){
        document.querySelectorAll('#rs-sleep-quality .chip').forEach(function(c){
          if(parseInt(c.getAttribute('data-val'))===editRec.sleepQuality) c.classList.add('selected');
        });
      }
      // ファクター復元
      if(editRec.factors && editRec.factors.length){
        document.querySelectorAll('#rs-factors .chip').forEach(function(c){
          if(editRec.factors.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      // お通じ復元
      if(editRec.bowel){
        document.querySelectorAll('#rs-bowel .chip').forEach(function(c){
          if(c.textContent === editRec.bowel) c.classList.add('selected');
        });
      }
      // 便カウント復元
      if(editRec.bowelCount){
        _bowelCount = editRec.bowelCount;
        var bcd = document.getElementById('bowel-count-display');
        if(bcd) bcd.textContent = _bowelCount;
      }
      // 気分復元
      if(editRec.mood){
        document.querySelectorAll('#rs-mood .chip').forEach(function(c){
          if(parseInt(c.getAttribute('data-val')) === editRec.mood) c.classList.add('selected');
        });
      }
      // おりもの量復元
      if(editRec.dischargeAmount){
        document.querySelectorAll('#rs-discharge-amount .chip').forEach(function(c){
          if(c.textContent === editRec.dischargeAmount) c.classList.add('selected');
        });
      }
      // おりもの状態復元（dischargeType は配列で保存される）
      if(editRec.dischargeType && editRec.dischargeType.length){
        document.querySelectorAll('#rs-discharge-type .chip').forEach(function(c){
          if(editRec.dischargeType.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      // 経血詳細セクション表示
      var cycleDetail = document.getElementById('cycle-detail-section');
      if(cycleDetail && editRec.menstrualCycle && editRec.menstrualCycle !== 'なし'){
        cycleDetail.style.display = 'block';
      }
      if(di){ di.textContent='編集モード：'+targetDate.getFullYear()+'/'+(targetDate.getMonth()+1)+'/'+targetDate.getDate(); di.style.display='block'; }
      // ★ 編集モードでも疾患セルフチェックを表示・復元
      var _editDiseaseCheck = editRec ? (editRec.diseaseCheck || null) : null;
      setTimeout(function(){
        updateDiseaseQuestions();
        if(_editDiseaseCheck){
          Object.keys(_editDiseaseCheck).forEach(function(key){
            var group = document.querySelector('[data-disease-q="'+key+'"]');
            if(group){
              group.querySelectorAll('.chip').forEach(function(c){
                if(c.textContent === _editDiseaseCheck[key]) c.classList.add('selected');
              });
            }
          });
        }
      }, 300);
    }
    // 編集モードでは下書き復元をスキップ
    document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
    document.getElementById('screen-record').classList.add('active');
    // P1-3: クイック記録ターゲットへスクロール（編集モード）
    (function() {
      var _t = window.__ippoQuickRecordTarget; window.__ippoQuickRecordTarget = null;
      if (_t) {
        var _m = { period: 'rs-cycle', mood: 'rs-mood', symptom: 'rs-symptoms', food: 'rs-meal-free', temp: 'rs-temp', note: 'rs-note' };
        var _id = _m[_t];
        if (_id) {
          // 食事・体温・メモは詳細セクション内なので折りたたみを開く
          if (_t === 'food' || _t === 'temp' || _t === 'note') {
            var _ds = document.getElementById('rec-details-section');
            var _da = document.getElementById('rec-details-arrow');
            if (_ds) { _ds.style.display = 'block'; try { localStorage.setItem('ippo_rec_details_open', '1'); } catch(e){} }
            if (_da) { _da.textContent = '▴'; }
          }
          setTimeout(function() { var _e = document.getElementById(_id); if (_e) _e.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
        }
      }
    })();
    return;
  }

  var draft = localStorage.getItem('ippo_draft');
  if(draft){
    try {
      var d = JSON.parse(draft);
      if(new Date(d._draftDate).toDateString() === now.toDateString()){
              // フリーメモ下書き復元
        var mealDraft = localStorage.getItem('ippo_meal_draft');
        if(mealDraft){
          try {
            var md = JSON.parse(mealDraft);
            if(new Date(md._draftDate).toDateString() === now.toDateString()){
              var ta = document.getElementById('rs-meal-free');
              if(ta && md.mealFree){ ta.value = md.mealFree; updateMealParse(); }
            }
          } catch(e){}
        }
      if(d.temp){ var et=document.getElementById('rs-temp'); if(et) et.value=d.temp; }
      if(d.tempMethod) selectTempMethod(d.tempMethod);
        if(d.note){ var en=document.getElementById('rs-note'); if(en) en.value=d.note; }
        if(d.symptoms && d.symptoms.length){
          document.querySelectorAll('#rs-symptoms .chip').forEach(function(c){
            if(d.symptoms.indexOf(c.textContent) !== -1) c.classList.add('selected');
          });
        }
              // エネルギー下書き復元
      if(d.energy){
        document.querySelectorAll('#rs-energy .chip').forEach(function(c){
          if(parseInt(c.getAttribute('data-val'))===d.energy) c.classList.add('selected');
        });
      }
      // 睡眠下書き復元
      if(d.sleepBed){ var dsb=document.getElementById('rs-sleep-bed'); if(dsb) dsb.value=d.sleepBed; }
      if(d.sleepWake){ var dsw=document.getElementById('rs-sleep-wake'); if(dsw) dsw.value=d.sleepWake; }
      if(d.sleepQuality){
        document.querySelectorAll('#rs-sleep-quality .chip').forEach(function(c){
          if(parseInt(c.getAttribute('data-val'))===d.sleepQuality) c.classList.add('selected');
        });
      }
      // ファクター下書き復元
      if(d.factors && d.factors.length){
        document.querySelectorAll('#rs-factors .chip').forEach(function(c){
          if(d.factors.indexOf(c.textContent) !== -1) c.classList.add('selected');
        });
      }
      // お通じ下書き復元
      if(d.bowel){
        document.querySelectorAll('#rs-bowel .chip').forEach(function(c){
          if(c.textContent === d.bowel) c.classList.add('selected');
        });
      }
        if(d.cycle){
          document.querySelectorAll('#rs-cycle .chip').forEach(function(c){
            if(c.textContent === d.cycle) c.classList.add('selected');
          });
        }
        if(di){ di.textContent='下書きを復元しました'; di.style.display='block'; setTimeout(function(){ di.style.display='none'; }, 3000); }
      }
    } catch(e){}
  }
  document.querySelectorAll('.screen').forEach(function(s){ s.classList.remove('active'); });
  document.getElementById('screen-record').classList.add('active');
    // 既存記録の食事メモを復元
  var todayRec = null;
  for(var ri=0; ri<state.records.length; ri++){
    if(new Date(state.records[ri].date).toDateString() === now.toDateString()){ todayRec = state.records[ri]; break; }
  }
  if(todayRec && todayRec.mealFree){
    var mealTA = document.getElementById('rs-meal-free');
    if(mealTA && !mealTA.value.trim()){ mealTA.value = todayRec.mealFree; updateMealParse(); }
  }
    // 既存記録の体温を復元
  if(todayRec && todayRec.temperature){
    var tempEl = document.getElementById('rs-temp');
    if(tempEl && !tempEl.value) tempEl.value = todayRec.temperature;
  }
  // 体温測定方法を復元
  selectTempMethod((todayRec && todayRec.tempMethod) ? todayRec.tempMethod : 'sublingual');
  // 既存記録の症状を復元（3層チップ対応: 下層に選択済みがあれば自動展開）
  if(todayRec && todayRec.symptoms && todayRec.symptoms.length){
    var _needL2=false, _needL3=false;
    document.querySelectorAll('#rs-symptoms .chip').forEach(function(c){
      if(todayRec.symptoms.indexOf(c.textContent) !== -1){
        c.classList.add('selected');
        var l2=document.getElementById('rs-symp-l2'), l3=document.getElementById('rs-symp-l3');
        if(l2 && l2.contains(c)) _needL2=true;
        if(l3 && l3.contains(c)) _needL3=true;
      }
    });
    if(_needL2) toggleSympLayer(2);
    if(_needL3) toggleSympLayer(3);
    // 痛み系症状の復元に応じてPAIN DETAILセクションも展開
    var painSyms=['頭痛','腰痛','下腹部痛','関節痛','排便痛','性交痛'];
    var _hasPain=todayRec.symptoms.some(function(s){ return painSyms.indexOf(s)!==-1; });
    var ps=document.getElementById('pain-detail-section');
    if(ps) ps.style.display=_hasPain?'block':'none';
  }
  // 既存記録の生理周期を復元
  if(todayRec && todayRec.menstrualCycle){
    document.querySelectorAll('#rs-cycle .chip').forEach(function(c){
      if(c.textContent === todayRec.menstrualCycle || c.getAttribute('data-val') === todayRec.menstrualCycle) c.classList.add('selected');
    });
  }
  var _diseaseCheckToRestore = (todayRec && todayRec.diseaseCheck) ? todayRec.diseaseCheck : null;
  setTimeout(function(){
    updateDiseaseQuestions();
    if(_diseaseCheckToRestore){
      var dc = _diseaseCheckToRestore;
      Object.keys(dc).forEach(function(key){
        var group = document.querySelector('[data-disease-q="'+key+'"]');
        if(group){
          group.querySelectorAll('.chip').forEach(function(c){
            if(c.textContent === dc[key]) c.classList.add('selected');
          });
        }
      });
    }
  }, 300);

  // P1-3: クイック記録ターゲットへスクロール
  var _qrt = window.__ippoQuickRecordTarget;
  window.__ippoQuickRecordTarget = null;
  window.scrollTo(0, 0);
  if (_qrt) {
    var _qrMap = { period: 'rs-cycle', mood: 'rs-mood', symptom: 'rs-symptoms', food: 'rs-meal-free', temp: 'rs-temp', note: 'rs-note' };
    var _qrId = _qrMap[_qrt];
    if (_qrId) {
      // 食事・体温・メモは詳細セクション内なので折りたたみを開く
      if (_qrt === 'food' || _qrt === 'temp' || _qrt === 'note') {
        var _qrDs = document.getElementById('rec-details-section');
        var _qrDa = document.getElementById('rec-details-arrow');
        if (_qrDs) { _qrDs.style.display = 'block'; try { localStorage.setItem('ippo_rec_details_open', '1'); } catch(e){} }
        if (_qrDa) { _qrDa.textContent = '▴'; }
      }
      setTimeout(function() {
        var _qrEl = document.getElementById(_qrId);
        if (_qrEl) _qrEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  }
}

function selectTempMethod(method){
  document.getElementById('temp-tab-sublingual').classList.toggle('selected', method === 'sublingual');
  document.getElementById('temp-tab-axilla').classList.toggle('selected', method === 'axilla');
  window._tempMethod = method;
}

function toggleRsChip(el){
  el.classList.toggle('selected');
  // 痛み系症状が1つでも選択されていれば痛みの詳細セクションを表示
  var painSymptoms = ['頭痛','腰痛','下腹部痛','関節痛','排便痛','性交痛'];
  var hasPain = false;
  document.querySelectorAll('#rs-symptoms .chip.selected').forEach(function(c){
    if(painSymptoms.indexOf(c.textContent) !== -1) hasPain = true;
  });
  var painSection = document.getElementById('pain-detail-section');
  if(painSection){ painSection.style.display = hasPain ? 'block' : 'none'; }
  updateRecProgressDots();
}


function selectRsCycle(el, val){
  document.querySelectorAll('#rs-cycle .chip').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  var detail = document.getElementById('cycle-detail-section');
  if(detail){
    detail.style.display = (val !== 'none') ? 'block' : 'none';
  }
}
// ===== フリーメモ自動解析 =====
function parseMealMemo(text){
  if(!text) return null;
  var lines = text.split('\n');
  var allTimes = [];
  var foodTimes = [];
  var drinkPattern = /飲み物|飲料|お水|水分|コーヒー|カフェラテ|カプチーノ|エスプレッソ|お茶|緑茶|麦茶|ほうじ茶|煎茶|玄米茶|番茶|紅茶|ハーブティー|ルイボス|ジュース|スムージー|牛乳|豆乳|ヨーグルト飲料|ラッシー|スポーツドリンク|ポカリ|アクエリ|アミノ酸|コーラ|サイダー|炭酸水|ソーダ|トニック|レモネード|甘酒|昆布水/;
  lines.forEach(function(line){
    line = line.trim();
    if(!line) return;
    var m = line.match(/(\d{1,2}):?(\d{2})/);
    if(m){
      var h = parseInt(m[1]);
      var min = parseInt(m[2]);
      if(h >= 0 && h <= 23 && min >= 0 && min <= 59){
        var totalMin = h * 60 + min;
        allTimes.push(totalMin);
        // 飲み物判定
        var label = line.replace(/\d{1,2}:?\d{2}\s*/, '').trim();
        if(!label) return; // 食品名のない行はスキップ
        var items = label.split(/[、,\/\s]+/).filter(function(s){ return s; });
        var drinkItems = items.filter(function(s){ return drinkPattern.test(s); });
        var isDrinkOnly = drinkItems.length > 0 && drinkItems.length >= items.length;
        if(!isDrinkOnly){
          foodTimes.push(totalMin);
        }
      }
    }
  });
  if(allTimes.length === 0) return null;
  // 食事がない場合（飲み物のみ）はファスティングなし
  if(foodTimes.length === 0){
    var toTime2 = function(m){ return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2); };
    return { mealCount: 0, firstTime: '', lastTime: '', fastingHours: 0 };
  }
  var countTimes = foodTimes;
  countTimes.sort(function(a,b){ return a-b; });
  var firstMin = countTimes[0];
  var lastMin = countTimes[countTimes.length - 1];
  var fastHours = 0;
  if(foodTimes.length >= 2){
    var eatWindow = lastMin - firstMin;
    fastHours = Math.round((1440 - eatWindow) / 60 * 10) / 10;
    if(fastHours < 12) fastHours = 0;
  }
  var toTime = function(m){ return ('0'+Math.floor(m/60)).slice(-2)+':'+('0'+(m%60)).slice(-2); };
  return { mealCount: foodTimes.length, firstTime: toTime(firstMin), lastTime: toTime(lastMin), fastingHours: fastHours };
}

function _updateMealParseFreetextLegacy(){
  var ta = document.getElementById('rs-meal-free');
  var box = document.getElementById('meal-auto-parse');
  if(!ta || !box) return;
  var result = parseMealMemo(ta.value);
  if(result && result.mealCount > 0){
    box.style.display = 'block';
    document.getElementById('parse-meal-count').textContent = result.mealCount;
    document.getElementById('parse-first-time').textContent = result.firstTime;
    document.getElementById('parse-last-time').textContent = result.lastTime;
    var _fastEl = document.getElementById('parse-fasting'); if(_fastEl) _fastEl.textContent = result.fastingHours;
  } else {
    box.style.display = 'none';
  }
}

if(!window._ippoInputListenerAdded){
  window._ippoInputListenerAdded = true;
  document.addEventListener('input', function(e){
    if(e.target.id === 'rs-meal-free') _updateMealParseFreetextLegacy();
  });
}

  function insertMealTemplate(type) {
  var ta = document.getElementById('rs-meal-free');
  if (!ta) return;
  var now = new Date();
  var templates = {
    morning: { time: '0700', label: '朝食' },
    lunch:   { time: '1200', label: '昼食' },
    dinner:  { time: '1900', label: '夕食' },
    snack:   { time: '1500', label: '間食' }
  };
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var currentTime = h + m;
  var t = templates[type];
  var line = currentTime + ' ' + t.label + ' ';
  if (ta.value && !ta.value.endsWith('\n')) ta.value += '\n';
  ta.value += line;
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  if (typeof updateMealParse === 'function') updateMealParse();
  else if (typeof _updateMealParseFreetextLegacy === 'function') _updateMealParseFreetextLegacy();
}

function saveMealDraft(){
  var ta = document.getElementById('rs-meal-free');
  if(!ta) return;
  localStorage.setItem('ippo_meal_draft', JSON.stringify({ mealFree: ta.value, _draftDate: new Date().toISOString() }));
  var msg = document.getElementById('draft-saved-msg');
  if(msg){ msg.style.display = 'inline'; setTimeout(function(){ msg.style.display = 'none'; }, 2000); }
}


  // ===== 食事セクション管理 =====
var mealSectionConfig = {
  morning: { icon: '🌅', label: '朝食', defaultTime: '07:00' },
  lunch:   { icon: '☀️', label: '昼食', defaultTime: '12:00' },
  dinner:  { icon: '🌙', label: '夕食', defaultTime: '19:00' },
  snack:   { icon: '🍪', label: '間食', defaultTime: '15:00' }
};
var openMealSections = [];

function toggleMealSection(key) {
  var idx = openMealSections.indexOf(key);
  if (idx !== -1) {
    openMealSections.splice(idx, 1);
  } else {
    openMealSections.push(key);
  }
  renderMealSections();
}

function renderMealSections() {
  var container = document.getElementById('meal-sections');
  var html = '';
  var keys = ['morning', 'lunch', 'dinner', 'snack'];
  
  keys.forEach(function(key) {
    var btn = document.getElementById('meal-btn-' + key);
    if (openMealSections.indexOf(key) !== -1) {
      btn.classList.add('selected');
      var cfg = mealSectionConfig[key];
      var timeVal = document.getElementById('meal-time-' + key);
      var textVal = document.getElementById('meal-text-' + key);
      var currentTime = timeVal ? timeVal.value : cfg.defaultTime;
      var currentText = textVal ? textVal.value : '';
      
      html += '<div style="background:var(--white);border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 1px 6px var(--shadow);">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">';
      html += '<span style="font-size:18px;">' + cfg.icon + '</span>';
      html += '<span style="font-size:14px;font-weight:500;color:var(--ink);">' + cfg.label + '</span>';
      html += '<input type="time" id="meal-time-' + key + '" class="meal-time-input" value="' + currentTime + '" onchange="updateMealParse()" style="margin-left:auto;width:auto;">';
      html += '</div>';
      html += '<textarea id="meal-text-' + key + '" class="modal-textarea" placeholder="食べたものを入力..." oninput="updateMealParse()" style="min-height:60px;margin-bottom:0;">' + currentText + '</textarea>';
      html += '</div>';
    } else {
      btn.classList.remove('selected');
    }
  });
  
  container.innerHTML = html;
  updateMealParse();
}

function updateMealParse() {
  var count = 0;
  var times = [];
  var keys = ['morning', 'lunch', 'dinner', 'snack'];
  
  keys.forEach(function(key) {
    if (openMealSections.indexOf(key) === -1) return;
    var textEl = document.getElementById('meal-text-' + key);
    var timeEl = document.getElementById('meal-time-' + key);
    if (textEl && textEl.value.trim()) {
      count++;
      if (timeEl && timeEl.value) times.push(timeEl.value);
    }
  });
  
  times.sort();
  var countEl = document.getElementById('parse-meal-count');
  var firstEl = document.getElementById('parse-first-time');
  var lastEl = document.getElementById('parse-last-time');
  var fastEl = document.getElementById('parse-fasting');
  if(countEl) countEl.textContent = count;
  if(firstEl) firstEl.textContent = times.length > 0 ? times[0] : '--:--';
  if(lastEl) lastEl.textContent = times.length > 0 ? times[times.length - 1] : '--:--';
  
  if (times.length >= 2) {
    var first = times[0].split(':');
    var last = times[times.length - 1].split(':');
    var eating = (parseInt(last[0]) + parseInt(last[1]) / 60) - (parseInt(first[0]) + parseInt(first[1]) / 60);
    var fasting = Math.round((24 - eating) * 10) / 10;
    if(fastEl) fastEl.textContent = fasting;
  } else {
    if(fastEl) fastEl.textContent = '0';
  }
}

  // ===== 新規記録セクション用関数 =====
function selectEnergy(btn, val){
  document.querySelectorAll('#rs-energy .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function selectSleepQuality(btn, val){
  document.querySelectorAll('#rs-sleep-quality .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

function selectBowel(btn, val){
  document.querySelectorAll('#rs-bowel .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
}

// ===== 気分選択（Step 1） =====
var _bowelCount = 0;
function selectMood(btn, val){
  document.querySelectorAll('#rs-mood .chip').forEach(function(c){ c.classList.remove('selected'); });
  btn.classList.add('selected');
  updateRecProgressDots();
}

// ===== プログレスドット更新 =====
function updateRecProgressDots(){
  var dot1 = document.getElementById('rec-dot-1');
  var dot2 = document.getElementById('rec-dot-2');
  var dot3 = document.getElementById('rec-dot-3');
  var dot4 = document.getElementById('rec-dot-4');
  if(!dot1) return;
  var step1Done = !!document.querySelector('#rs-mood .chip.selected');
  var painEl = document.getElementById('rs-pain-level');
  var step2Done = !!(document.querySelectorAll('#rs-symptoms .chip.selected').length > 0 || (painEl && parseInt(painEl.value) > 0));
  var step3Done = !!document.querySelector('#rs-cycle .chip.selected');
  dot1.style.background = step1Done ? 'var(--rose)' : '#e8ddd8';
  dot2.style.background = step2Done ? 'var(--rose)' : '#e8ddd8';
  dot3.style.background = step3Done ? 'var(--rose)' : '#e8ddd8';
  // STEP 4: 疾患チェック（疾患設定済みの場合のみ）
  if(dot4 && dot4.style.display !== 'none'){
    var step4Done = !!(document.querySelector('#disease-questions .chip.selected'));
    dot4.style.background = step4Done ? 'var(--rose)' : '#e8ddd8';
  }
}

// ===== 詳細セクション折りたたみ =====
function toggleRecordDetails(){
  var sec = document.getElementById('rec-details-section');
  var arrow = document.getElementById('rec-details-arrow');
  if(!sec) return;
  var isOpen = sec.style.display !== 'none';
  sec.style.display = isOpen ? 'none' : 'block';
  if(arrow) arrow.textContent = isOpen ? '▾' : '▴';
  try{ localStorage.setItem('ippo_rec_details_open', isOpen ? '0' : '1'); }catch(e){}
}

// ===== 便の回数カウント =====
function adjustBowelCount(delta){
  _bowelCount = Math.max(0, (_bowelCount||0) + delta);
  var el = document.getElementById('bowel-count-display');
  if(el) el.textContent = _bowelCount;
}

function addCustomFactor(){
  var input = document.getElementById('rs-factor-custom');
  if(!input) return;
  var text = input.value.trim();
  if(!text) return;
  var container = document.getElementById('rs-factors');
  if(!container) return;
  var chip = document.createElement('div');
  chip.className = 'chip selected';
  chip.textContent = text;
  chip.setAttribute('onclick', 'toggleRsChip(this)');
  container.appendChild(chip);
  input.value = '';
}

function gatherDiseaseData(){
  var container = document.getElementById('disease-questions');
  if(!container) return {};
  var data = {};
  var groups = container.querySelectorAll('[data-disease-q]');
  groups.forEach(function(g){
    var selected = g.querySelector('.chip.selected');
    if(selected) data[g.getAttribute('data-disease-q')] = selected.textContent;
  });
  return data;
}
 // ===== 更年期SMI（簡略更年期指数）自動計算 =====
function calcSMIScore(diseaseCheck){
  // SMI配点：各症状ごとの重み × 選択肢の重度
  var smiWeights = {
    'hot_flash': 10,
    'sweating': 10,
    'insomnia': 14,
    'irritable': 12,
    'depression': 14,
    'fatigue': 8,
    'headache': 8,
    'palpitation': 8,
    'shoulder': 5,
    'numbness': 5
  };
  var severityMap = {
    'なし': 0,
    '軽い': 0.33,
    '中程度': 0.66,
    '強い': 1
  };
  var total = 0;
  var found = false;
  var keys = Object.keys(smiWeights);
  for(var i=0;i<keys.length;i++){
    var qKey = '更年期障害__' + keys[i];
    if(diseaseCheck[qKey]){
      found = true;
      var sev = severityMap[diseaseCheck[qKey]] || 0;
      total += smiWeights[keys[i]] * sev;
    }
  }
  if(!found) return null;
  return Math.round(total);
}

  // ===== 体温フェーズ自動判定エンジン =====
function calcTemperaturePhases(records) {
  // 体温データを抽出（14日以上必要）
  var temps = [];
  var sorted = records.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
  sorted.forEach(function(r) {
    if (r.temperature) {
      temps.push({ date: r.date, temp: parseFloat(r.temperature) });
    }
  });

  if (temps.length < 14) {
    return {
      status: 'insufficient',
      count: temps.length,
      required: 14,
      message: 'あと' + (14 - temps.length) + '日分の体温記録が必要です'
    };
  }

  // 基本統計
  var values = temps.map(function(t){ return t.temp; });
  var minTemp = Math.min.apply(null, values);
  var maxTemp = Math.max.apply(null, values);
  var tempDiff = Math.round((maxTemp - minTemp) * 100) / 100;
  var avgTemp = Math.round(values.reduce(function(a,b){return a+b;},0) / values.length * 100) / 100;
  var threshold = Math.round((minTemp + tempDiff * 0.5) * 100) / 100;

  // 各日をフェーズ分類
  var phases = temps.map(function(t) {
    return {
      date: t.date,
      temp: t.temp,
      phase: t.temp < threshold ? 'low' : 'high'
    };
  });

  // 低温期・高温期の平均
  var lowTemps = phases.filter(function(p){ return p.phase === 'low'; }).map(function(p){ return p.temp; });
  var highTemps = phases.filter(function(p){ return p.phase === 'high'; }).map(function(p){ return p.temp; });
  var avgLow = lowTemps.length > 0 ? Math.round(lowTemps.reduce(function(a,b){return a+b;},0) / lowTemps.length * 100) / 100 : null;
  var avgHigh = highTemps.length > 0 ? Math.round(highTemps.reduce(function(a,b){return a+b;},0) / highTemps.length * 100) / 100 : null;

  // 二相性判定
  var biphasic = 'none';
  if (tempDiff >= 0.3) biphasic = 'clear';
  else if (tempDiff >= 0.2) biphasic = 'unclear';
  else biphasic = 'none';

  // M字パターン検出（高温期中に0.3℃以上の一時低下）
  var mPattern = false;
  var inHighPhase = false;
  var highStart = -1;
  for (var i = 0; i < phases.length; i++) {
    if (phases[i].phase === 'high' && !inHighPhase) {
      inHighPhase = true;
      highStart = i;
    }
    if (phases[i].phase === 'low' && inHighPhase) {
      // 高温期中に低温に戻った
      if (i - highStart >= 3 && i + 1 < phases.length && phases[i+1] && phases[i+1].phase === 'high') {
        mPattern = true;
      }
      inHighPhase = false;
    }
  }

  // 高温期の日数
  var highPhaseDays = 0;
  var currentHighStreak = 0;
  var maxHighStreak = 0;
  phases.forEach(function(p) {
    if (p.phase === 'high') {
      currentHighStreak++;
      if (currentHighStreak > maxHighStreak) maxHighStreak = currentHighStreak;
    } else {
      currentHighStreak = 0;
    }
  });
  highPhaseDays = maxHighStreak;

  // 低温期の日数
  var lowPhaseDays = 0;
  var currentLowStreak = 0;
  var maxLowStreak = 0;
  phases.forEach(function(p) {
    if (p.phase === 'low') {
      currentLowStreak++;
      if (currentLowStreak > maxLowStreak) maxLowStreak = currentLowStreak;
    } else {
      currentLowStreak = 0;
    }
  });
  lowPhaseDays = maxLowStreak;

  // 排卵推定日（低温期の最後の日）
  var ovulationDate = null;
  for (var j = phases.length - 1; j >= 1; j--) {
    if (phases[j].phase === 'high' && phases[j-1].phase === 'low') {
      ovulationDate = phases[j-1].date;
      break;
    }
  }

  // 疾患別警戒値チェック
  var diseases = state.myDiseases || [];
  var alerts = [];

  // 共通警戒値
  if (avgLow !== null && avgLow >= 37.0) {
    alerts.push({ level: 'danger', message: '低温期の平均が37.0℃以上です。慢性炎症の可能性があります。医師への相談をおすすめします。' });
  } else if (avgLow !== null && avgLow >= 36.5) {
    alerts.push({ level: 'warning', message: '低温期の平均が36.5℃以上です。やや高めの傾向です。' });
  }

  if (avgHigh !== null && avgHigh >= 37.5) {
    alerts.push({ level: 'danger', message: '高温期の平均が37.5℃以上です。異常な高温期の可能性があります。' });
  }

  if (maxTemp >= 38.0) {
    alerts.push({ level: 'emergency', message: '38℃以上の体温が記録されています。感染や嚢腫破裂の可能性があり、早急な受診をおすすめします。' });
  }

  // 卵巣嚢腫固有
  if (diseases.indexOf('卵巣嚢腫') !== -1) {
    if (avgLow !== null && avgLow >= 37.0) {
      alerts.push({ level: 'disease', disease: '卵巣嚢腫', message: '低温期37℃以上は卵巣嚢腫による慢性炎症を示唆する体温パターンです。' });
    }
    if (tempDiff >= 0.8) {
      alerts.push({ level: 'disease', disease: '卵巣嚢腫', message: '温度差が' + tempDiff + '℃と大きく、炎症の悪化が疑われます。' });
    }
  }

  // 子宮内膜症固有
  if (diseases.indexOf('子宮内膜症') !== -1) {
    // 月経初日の高体温チェック
    var cycleRecords = records.filter(function(r){ return r.menstrualCycle && r.menstrualCycle !== 'なし' && r.temperature; });
    var periodHighTemp = cycleRecords.filter(function(r){ return parseFloat(r.temperature) >= 36.5; });
    if (periodHighTemp.length >= 2) {
      alerts.push({ level: 'disease', disease: '子宮内膜症', message: '月経中の体温が36.5℃以上の日が' + periodHighTemp.length + '日あります。骨盤内膜症との関連が報告されているパターンです。' });
    }
  }

  // PCOS固有
  if (diseases.indexOf('PCOS') !== -1) {
    if (biphasic === 'none') {
      alerts.push({ level: 'disease', disease: 'PCOS', message: '二相性が不明確です。排卵障害の可能性があります。' });
    }
    if (lowPhaseDays >= 18) {
      alerts.push({ level: 'disease', disease: 'PCOS', message: '低温期が' + lowPhaseDays + '日と長く、LH/FSH比の異常が疑われます。' });
    }
  }

  // 黄体機能不全パターン（PDFデータ：高温期10日以下、温度差0.2℃以下）
  if (highPhaseDays > 0 && highPhaseDays < 10) {
    alerts.push({ level: 'warning', message: '高温期が' + highPhaseDays + '日と短めです（正常12〜14日）。プロゲステロン不足・黄体機能不全の可能性があります。' });
  }
  if (mPattern) {
    alerts.push({ level: 'warning', message: '高温期中に体温が一時低下するM字パターンが検出されました。黄体ホルモンの分泌が不安定な可能性があります。' });
  }
  // 温度差が小さい（PDFデータ：0.2℃以下で黄体機能不全）
  if (tempDiff > 0 && tempDiff < 0.2) {
    alerts.push({ level: 'warning', message: '低温期と高温期の温度差が' + tempDiff + '℃（正常0.3〜0.5℃）と小さく、黄体機能不全・排卵障害の可能性があります。医師への相談をお勧めします。' });
  } else if (tempDiff >= 0.2 && tempDiff < 0.3) {
    alerts.push({ level: 'caution', message: '温度差が' + tempDiff + '℃とやや小さめです（正常0.3〜0.5℃）。プロゲステロン分泌がやや不十分な可能性があります。' });
  }
  // 低温期が長い（PDFデータ：20日以上で排卵遅延）
  if (lowPhaseDays >= 20) {
    alerts.push({ level: 'warning', message: '低温期が' + lowPhaseDays + '日（正常12〜16日）と長く、排卵遅延の可能性があります。ホルモンバランスの乱れが疑われます。' });
  }
  // 全体的な低体温（PDFデータ：甲状腺機能低下症）
  if (avgLow !== null && avgLow < 35.8) {
    alerts.push({ level: 'warning', message: '低温期の平均が35.8℃未満と低体温傾向です。甲状腺機能低下症との関連が報告されています。受診をお勧めします。' });
  }
  // PMS/PMDDの高温期高体温
  if (diseases.indexOf('PMS/PMDD') !== -1 && avgHigh !== null && avgHigh >= 37.0) {
    alerts.push({ level: 'disease', disease: 'PMS/PMDD', message: '高温期の平均が' + avgHigh + '℃と高めです（BMC研究）。メラトニン低下による体温調節異常が関与する可能性があります。睡眠の質改善もお試しください。' });
  }
  // 更年期障害の低体温
  if (diseases.indexOf('更年期障害') !== -1 && avgTemp !== null && avgTemp < 36.0) {
    alerts.push({ level: 'disease', disease: '更年期障害', message: '平均体温が' + avgTemp + '℃と低め（2025年研究：閉経後女性は中核体温が低下）。代謝低下に注意し、定期的な受診をお勧めします。' });
  }
  // 二相性なし（共通：無排卵症）
  if (biphasic === 'none' && diseases.indexOf('PCOS') === -1) {
    alerts.push({ level: 'warning', message: '二相性が確認できません。排卵が起こっていない可能性（無排卵症）があります。医師への相談をお勧めします。' });
  }

  // 次回月経予測
  var nextPeriod = null;
  if (ovulationDate) {
    var ovDate = new Date(ovulationDate);
    ovDate.setDate(ovDate.getDate() + 14);
    nextPeriod = ovDate.toISOString().split('T')[0];
  }

  return {
    status: 'ready',
    count: temps.length,
    minTemp: minTemp,
    maxTemp: maxTemp,
    tempDiff: tempDiff,
    avgTemp: avgTemp,
    threshold: threshold,
    avgLow: avgLow,
    avgHigh: avgHigh,
    biphasic: biphasic,
    mPattern: mPattern,
    highPhaseDays: highPhaseDays,
    lowPhaseDays: lowPhaseDays,
    ovulationDate: ovulationDate,
    nextPeriod: nextPeriod,
    phases: phases,
    alerts: alerts
  };
}

var _tempOverlayApi = null;
function openTempReport(){
  var analysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records);

  // 分析対象メタ情報
  var tempRecs = state.records.filter(function(r){ return r.temperature; });
  var lastTempDate = '';
  if(tempRecs.length > 0){
    var _tSorted = tempRecs.slice().sort(function(a,b){
      return (b.date||'').localeCompare(a.date||'');
    });
    var _tLd = new Date(_tSorted[0].date || '');
    if(!isNaN(_tLd.getTime())) lastTempDate = (_tLd.getMonth()+1)+'月'+_tLd.getDate()+'日';
  }

  if (!_tempOverlayApi) {
    _tempOverlayApi = window.createProOverlay({
      id:        'tempReportOverlay',
      ariaLabel: '体温のリズム',
      title:     '体温のリズム',
      subtitle:  '体温記録から整理しています',
      footer:    [{ id: 'temp-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _tempOverlayApi.close(); },
    });
    _tempOverlayApi.getButton('temp-close').addEventListener('click', function(){ _tempOverlayApi.close(); });
  }
  _tempOverlayApi.overlay.querySelector('.pob-subtitle').textContent = analysis.count + '日分の体温記録から整理しています';

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + tempRecs.length+'件の体温記録'+(lastTempDate?' ／ 最終記録 '+lastTempDate:'')+'</div>';

  bodyHtml += '<div style="background:rgba(180,160,150,0.12);border-radius:12px;padding:10px 14px;margin-bottom:24px;">'
    + '<div style="font-size:12px;color:var(--ink-light);line-height:1.7;">ℹ️ この画面は記録から体温のリズムを整理するものです。診断や医療判断を行うものではありません。</div>'
    + '</div>';

  if(analysis.status === 'insufficient'){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">🌡️ '+analysis.message+'<br>毎朝の基礎体温記録を続けましょう。</div>';
  } else {

    // ① 今見えていること
    var diffColor = analysis.tempDiff >= 0.3 ? '#6b9e78' : analysis.tempDiff >= 0.2 ? '#d4a574' : '#c4878c';
    var bLabel = analysis.biphasic === 'clear' ? '明確' : analysis.biphasic === 'unclear' ? 'やや不明瞭' : 'なし';
    var bColor = analysis.biphasic === 'clear' ? '#6b9e78' : analysis.biphasic === 'unclear' ? '#d4a574' : '#c4878c';

    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div class="pha-card" style="margin-bottom:0;"><div class="pha-grid-2">'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">低温期の平均</div><div style="font-size:18px;font-weight:600;color:#7ba3c4;">'+(analysis.avgLow||'-')+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">高温期の平均</div><div style="font-size:18px;font-weight:600;color:#c4878c;">'+(analysis.avgHigh||'-')+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">低温・高温の差</div><div style="font-size:18px;font-weight:600;color:'+diffColor+';">'+analysis.tempDiff+'℃</div></div>'
      + '<div class="pha-metric"><div style="font-size:10px;color:var(--ink-light);margin-bottom:4px;">2段階のリズム</div><div style="font-size:18px;font-weight:600;color:'+bColor+';">'+bLabel+'</div></div>'
      + '</div></div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">記録された体温を低温期・高温期に分類し、それぞれの平均と差を計算しています。差が大きいほど体温のリズムが安定していると考えられます。</div>'
      + '</div>';

    // ③ 直近30日の体温マップ
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">直近30日の体温マップ</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div class="pha-temp-map">';
    var recentPhases = analysis.phases.slice(-30);
    recentPhases.forEach(function(p){
      var d = new Date(p.date);
      var dayLabel = (d.getMonth()+1)+'/'+d.getDate();
      var bgColor = p.phase === 'low' ? '#d4e6f1' : '#f5cdd0';
      var textColor = p.phase === 'low' ? '#5b8fb9' : '#b85c6a';
      bodyHtml += '<div class="pha-temp-cell" style="background:'+bgColor+';" title="'+dayLabel+' '+p.temp+'℃">'
        + '<div class="pha-temp-day" style="color:'+textColor+';">'+d.getDate()+'</div>'
        + '<div class="pha-temp-val" style="color:'+textColor+';">'+p.temp.toFixed(1)+'</div>'
        + '</div>';
    });
    bodyHtml += '</div>'
      + '<div style="display:flex;gap:12px;justify-content:center;margin-top:10px;">'
      + '<div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#d4e6f1;border-radius:2px;"></div><span style="font-size:10px;color:var(--ink-light);">低温期</span></div>'
      + '<div style="display:flex;align-items:center;gap:4px;"><div style="width:10px;height:10px;background:#f5cdd0;border-radius:2px;"></div><span style="font-size:10px;color:var(--ink-light);">高温期</span></div>'
      + '</div></div></div>';

    // ④ 周期の目安
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">周期の目安</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">低温期の長さ</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(analysis.lowPhaseDays||'-')+'日間</div></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">高温期の長さ</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(analysis.highPhaseDays||'-')+'日間</div></div>';

    if(analysis.ovulationDate){
      var ovD = new Date(analysis.ovulationDate);
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;"><div style="font-size:14px;color:var(--ink-mid);">体温変化が見られた時期</div><div style="font-size:14px;font-weight:500;color:var(--ink);">'+(ovD.getMonth()+1)+'月'+ovD.getDate()+'日ごろ</div></div>';
    }
    if(analysis.nextPeriod){
      var npD = new Date(analysis.nextPeriod);
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;"><div style="font-size:14px;color:var(--ink-mid);">次回月経の参考時期</div><div style="font-size:14px;font-weight:500;color:var(--rose);">'+(npD.getMonth()+1)+'月'+npD.getDate()+'日ごろ</div></div>';
    }
    if(analysis.mPattern){
      bodyHtml += '<div style="margin-top:10px;padding:10px 12px;background:#fdf3f3;border-radius:10px;"><div style="font-size:12px;color:#c4878c;font-weight:500;">⚠️ M字パターンが見られます</div><div style="font-size:12px;color:var(--ink-light);margin-top:4px;line-height:1.7;">高温期の途中で体温が一時的に下がる日がありました。黄体ホルモンの分泌が不安定な可能性があります。</div></div>';
    }
    bodyHtml += '</div></div>';

    // ⑤ 気になる点（アラート）
    if(analysis.alerts.length > 0){
      bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">気になる点</div>'
        + '<div class="pha-card" style="margin-bottom:0;">';
      analysis.alerts.forEach(function(alert){
        var alertBg, alertBorder, alertText;
        if(alert.level === 'emergency'){ alertBg='#fde0e0'; alertBorder='#c44848'; alertText='#c44848'; }
        else if(alert.level === 'danger'){ alertBg='#fde8e8'; alertBorder='#c4878c'; alertText='#c4878c'; }
        else if(alert.level === 'disease'){ alertBg='#fdf3e8'; alertBorder='#d4a574'; alertText='#a07840'; }
        else { alertBg='#fdf8e8'; alertBorder='#d4c474'; alertText='#8a7a40'; }
        bodyHtml += '<div style="padding:10px 12px;background:'+alertBg+';border-left:3px solid '+alertBorder+';border-radius:8px;margin-bottom:8px;">';
        if(alert.disease) bodyHtml += '<div style="font-size:12px;color:'+alertText+';font-weight:600;margin-bottom:4px;">'+alert.disease+'</div>';
        bodyHtml += '<div style="font-size:14px;color:'+alertText+';line-height:1.7;">'+alert.message+'</div></div>';
      });
      bodyHtml += '<div style="margin-top:10px;padding:10px 12px;background:var(--cream);border-radius:10px;font-size:12px;color:var(--ink-light);line-height:1.7;">※ これらは統計データに基づく参考情報であり、医学的な診断ではありません。気になる場合は医師にご相談ください。</div>'
        + '</div></div>';
    }

    // ⑥ 正常範囲との比較
    var compItems = [
      {label:'低温期の平均', yours:analysis.avgLow, normal:'36.2℃'},
      {label:'高温期の平均', yours:analysis.avgHigh, normal:'36.7℃'},
      {label:'低温・高温の差', yours:analysis.tempDiff, normal:'0.3〜0.5℃'}
    ];
    bodyHtml += '<div style="margin-bottom:16px;"><div class="pha-section-title">一般的な参考値との比較</div>'
      + '<div class="pha-card" style="margin-bottom:0;">'
      + '<div style="font-size:12px;color:var(--ink-light);margin-bottom:12px;">AMED研究（日本人女性31万人）に基づく参考値</div>';
    compItems.forEach(function(item){
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0ebe6;">'
        + '<div style="font-size:14px;color:var(--ink-mid);flex:1;">'+item.label+'</div>'
        + '<div style="font-size:14px;font-weight:500;color:var(--ink);flex:1;text-align:center;">'+(item.yours !== null ? item.yours+'℃' : '-')+'</div>'
        + '<div style="font-size:12px;color:var(--ink-light);flex:1;text-align:right;">目安: '+item.normal+'</div>'
        + '</div>';
    });
    bodyHtml += '</div></div>';
  }

  _tempOverlayApi.body.innerHTML = bodyHtml;
  _tempOverlayApi.open();
}

// ===== 体温教育カード =====
function showTempEducation(){
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('showTempEducation', showTempEducation);
    return;
  }
  var card = document.getElementById('temp-edu-card');
  if(!card) return;

  var diseases = state.myDiseases || [];
  var tempCount = state.records.filter(function(r){ return r.temperature; }).length;
  var analysis = tempCount >= 14 ? (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records) : null;

  // 表示条件：体温データ0件、または3日以上記録が途切れている
  var lastTempDate = null;
  for(var i = state.records.length - 1; i >= 0; i--){
    if(state.records[i].temperature){
      lastTempDate = new Date(state.records[i].date);
      break;
    }
  }
  var daysSinceLast = lastTempDate ? Math.floor((Date.now() - lastTempDate.getTime()) / 86400000) : 999;
  var showCard = tempCount === 0 || daysSinceLast >= 3 || (tempCount > 0 && tempCount < 14);

  if(!showCard && !analysis){
    card.style.display = 'none';
    return;
  }

  var html = '';

  if(tempCount === 0){
    // 初めて：なぜ記録するか
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">🌡️ なぜ基礎体温を記録するの？</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';

    if(diseases.indexOf('卵巣嚢腫') !== -1){
      html += '卵巣嚢腫では、慢性炎症により低温期でも体温が高くなることがあります。毎日の記録で<strong>炎症の変化</strong>を早期に察知できます。';
    } else if(diseases.indexOf('子宮内膜症') !== -1){
      html += '研究により、月経初日の体温が36.5℃以上の場合、骨盤内膜症との関連が報告されています。毎日の記録で<strong>あなたのパターン</strong>を把握しましょう。';
    } else if(diseases.indexOf('PCOS') !== -1){
      html += 'PCOSでは排卵障害により<strong>二相性（低温期と高温期の区別）が不明確</strong>になることがあります。基礎体温は排卵の有無を知る重要な手がかりです。';
    } else if(diseases.indexOf('更年期障害') !== -1){
      html += '更年期ではホルモンバランスの変化により<strong>体温リズムが乱れやすく</strong>なります。記録を続けることで変化の傾向を把握できます。';
    } else if(diseases.indexOf('不妊症・排卵障害') !== -1){
      html += '基礎体温の二相性は<strong>排卵の有無を判断する最も基本的な方法</strong>です。14日以上の記録で排卵日の推定も可能になります。';
    } else {
      html += '日本人女性31万人の研究（AMED）によると、低温期の平均は36.2℃、高温期は36.7℃。<strong>14日以上の記録</strong>であなたのパターンが見えてきます。';
    }

    html += '</div>';
    html += '<div style="font-size:10px;color:var(--rose);margin-top:8px;">💡 朝起きてすぐ、動く前に舌の下で測定するのがポイントです</div>';

  } else if(tempCount < 14){
    // 記録途中：進捗を励ます
    var progress = Math.round(tempCount / 14 * 100);
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">📊 体温パターン分析まであと'+(14-tempCount)+'日</div>';
    html += '<div style="height:6px;background:#e8ddd8;border-radius:3px;overflow:hidden;margin-bottom:8px;">';
    html += '<div style="height:100%;width:'+progress+'%;background:linear-gradient(90deg,var(--rose),#e8b4b8);border-radius:3px;"></div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';

    if(tempCount < 5){
      html += '記録を始めたばかりですね。毎朝の測定を習慣にすると、自分の体温リズムが見えてきます。';
    } else if(tempCount < 10){
      html += '順調です！もう少しで低温期と高温期のパターンが判定できるようになります。';
    } else {
      html += 'あともう少し！14日分のデータが揃うと、二相性の判定・排卵推定・警戒値チェックが利用可能になります。';
    }

    html += '</div>';

  } else if(daysSinceLast >= 3){
    // 記録が途切れている：再開を促す
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">🌡️ 基礎体温の記録が'+daysSinceLast+'日途切れています</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">';
    html += '連続した記録ほどパターンの精度が高まります。今日から再開しましょう。';

    if(diseases.indexOf('卵巣嚢腫') !== -1){
      html += '<br>卵巣嚢腫の炎症モニタリングには、できるだけ毎日の記録が重要です。';
    }

    html += '</div>';
  }

  // 14日以上データあり → 医学的パターン解釈カードを追加
  if(analysis && tempCount >= 14 && daysSinceLast < 3){
    var biphasic = analysis.biphasic;
    var tempDiff = analysis.tempDiff;
    var avgLow = analysis.avgLow;
    var avgHigh = analysis.avgHigh;
    var highDays = analysis.highPhaseDays;
    var lowDays = analysis.lowPhaseDays;

    // 二相性ラベル
    var biphasicLabel = biphasic === 'clear' ? '二相性あり（明瞭）' :
                        biphasic === 'unclear' ? '二相性あり（不明瞭）' : '二相性なし';
    var biphasicColor = biphasic === 'clear' ? '#4caf80' :
                        biphasic === 'unclear' ? '#e8a04a' : '#e05c5c';

    // パターン解釈テキスト
    var interpretation = '';
    if(biphasic === 'none'){
      interpretation = '二相性が確認できません。排卵が起こっていない可能性（無排卵症）があります。';
      if(diseases.indexOf('PCOS') !== -1) interpretation += ' PCOSでは排卵障害が原因となることがあります。';
    } else if(tempDiff !== null && tempDiff < 0.2){
      interpretation = '温度差が'+tempDiff.toFixed(2)+'℃と小さく（正常0.3〜0.5℃）、黄体機能不全・排卵障害の可能性があります。';
    } else if(tempDiff !== null && tempDiff < 0.3){
      interpretation = '温度差が'+tempDiff.toFixed(2)+'℃とやや小さめです（正常0.3〜0.5℃）。プロゲステロン分泌がやや不十分な可能性があります。';
    } else if(highDays !== null && highDays < 10){
      interpretation = '高温期が'+highDays+'日（正常12〜14日）と短め。黄体機能不全の可能性があります。';
    } else if(lowDays !== null && lowDays >= 20){
      interpretation = '低温期が'+lowDays+'日（正常12〜16日）と長く、排卵遅延が疑われます。';
    } else if(avgLow !== null && avgLow < 35.8){
      interpretation = '低温期の平均が'+avgLow.toFixed(1)+'℃と低体温傾向です。甲状腺機能低下症との関連が報告されています。';
    } else {
      interpretation = '体温パターンは概ね正常範囲内です。引き続き記録を続けましょう。';
    }

    html += '<div style="margin-top:10px;padding:10px;background:rgba(232,176,184,0.12);border-radius:10px;border-left:3px solid var(--rose);">';
    html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:6px;">📈 現在の体温パターン分析</div>';
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">';

    // 二相性バッジ
    html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+biphasicColor+';color:#fff;">'+biphasicLabel+'</span>';

    // 温度差バッジ
    if(tempDiff !== null){
      var diffColor = tempDiff >= 0.3 ? '#4caf80' : tempDiff >= 0.2 ? '#e8a04a' : '#e05c5c';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+diffColor+';color:#fff;">温度差 '+tempDiff.toFixed(2)+'℃</span>';
    }

    // 低温期・高温期日数バッジ
    if(lowDays !== null){
      var ldColor = (lowDays >= 12 && lowDays <= 16) ? '#4caf80' : '#e8a04a';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+ldColor+';color:#fff;">低温期 '+lowDays+'日</span>';
    }
    if(highDays !== null){
      var hdColor = (highDays >= 12 && highDays <= 14) ? '#4caf80' : '#e8a04a';
      html += '<span style="font-size:11px;padding:3px 10px;border-radius:12px;background:'+hdColor+';color:#fff;">高温期 '+highDays+'日</span>';
    }

    html += '</div>';
    html += '<div style="font-size:11px;color:var(--ink-mid);line-height:1.7;">'+interpretation+'</div>';

    // 疾患別補足
    var diseaseNote = '';
    if(diseases.indexOf('子宮内膜症') !== -1 && avgLow !== null && avgLow >= 36.5){
      diseaseNote = '子宮内膜症：月経初日の体温が36.5℃以上は骨盤内膜症との関連が報告されています（Fertil Steril 2020）。';
    } else if(diseases.indexOf('PMS/PMDD') !== -1 && avgHigh !== null && avgHigh >= 37.0){
      diseaseNote = 'PMS/PMDD：高温期の平均が'+avgHigh.toFixed(1)+'℃と高めです。メラトニン低下による体温調節異常の関与が報告されています（BMC研究）。';
    } else if(diseases.indexOf('PCOS') !== -1 && biphasic === 'none'){
      diseaseNote = 'PCOS：二相性がない場合、無排卵の可能性があります。婦人科での検査をお勧めします。';
    } else if(diseases.indexOf('更年期障害') !== -1){
      diseaseNote = '更年期障害：ホルモン変動により体温リズムが不規則になりやすい時期です。定期的な受診を継続してください。';
    } else if(diseases.indexOf('甲状腺疾患') !== -1 && avgLow !== null && avgLow < 36.0){
      diseaseNote = '甲状腺機能低下症：低体温傾向があります。甲状腺ホルモン値の定期チェックをお勧めします。';
    }
    if(diseaseNote){
      html += '<div style="font-size:10px;color:var(--rose);margin-top:6px;line-height:1.6;">💊 '+diseaseNote+'</div>';
    }

    html += '<div style="font-size:10px;color:#aaa;margin-top:6px;">※ この情報は参考目的です。診断は医師にご相談ください。</div>';
    html += '</div>';
  }

  if(html){
    card.innerHTML = html;
    card.style.display = 'block';
  } else {
    card.style.display = 'none';
  }
}

// 記録画面を開いた時に教育カードを表示
var _origOpenRecord = typeof openRecordScreen === 'function' ? openRecordScreen : null;
if(_origOpenRecord){
  var _wrappedOpenRecord = function(){
    _origOpenRecord.apply(this, arguments);
    setTimeout(showTempEducation, 100);
  };
  // openRecordScreenの呼び出し元を差し替えず、画面切り替え時にフックする
  document.addEventListener('click', function(e){
    if(e.target && e.target.closest && e.target.closest('[onclick*="openRecordScreen"]')){
      setTimeout(showTempEducation, 200);
    }
  });
}

// 初回ロード時にも確認
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(showTempEducation, 500);
});



// ===== ウェルネススコア自動計算 =====
function calcWellnessScore(rec){
  var score = 50; // ベース

  // エネルギー（1〜5 → -20〜+20）
  if(rec.energy){
    score += (rec.energy - 3) * 10;
  }

  // 睡眠の質（1〜5 → -20〜+20）
  if(rec.sleepQuality){
    score += (rec.sleepQuality - 3) * 10;
  }

  // 睡眠時間（6〜8時間が理想）
  if(rec.sleepHours){
    if(rec.sleepHours >= 6 && rec.sleepHours <= 8) score += 5;
    else if(rec.sleepHours < 5 || rec.sleepHours > 10) score -= 10;
    else score -= 5;
  }

  // 症状数（多いほどマイナス）
  if(rec.symptoms && rec.symptoms.length){
    score -= Math.min(rec.symptoms.length * 4, 20);
  }

  // 痛みレベル（0〜10 → 0〜-15）
  if(rec.painLevel){
    score -= Math.min(Math.round(rec.painLevel * 1.5), 15);
  }

  // ポジティブファクター加点
  var positiveFactors = ['運動した', '入浴・半身浴', '瞑想・リラックス'];
  var negativeFactors = ['ストレス高', '夜更かし', 'アルコール'];
  if(rec.factors && rec.factors.length){
    rec.factors.forEach(function(f){
      if(positiveFactors.indexOf(f) !== -1) score += 3;
      if(negativeFactors.indexOf(f) !== -1) score -= 3;
    });
  }

  // お通じ（普通が理想）
  if(rec.bowel){
    if(rec.bowel === '普通') score += 3;
    else if(rec.bowel === 'なし' || rec.bowel === '軟便・下痢') score -= 5;
  }

  // 0〜100にクランプ
  return Math.max(0, Math.min(100, Math.round(score)));
}
// ===== ファクター相関計算 =====
function calcFactorCorrelations(records){
  // 各ファクターの有無で、他のメトリクスの平均を比較する
  var factorSet = {};
  records.forEach(function(r){
    if(r.factors && r.factors.length){
      r.factors.forEach(function(f){ factorSet[f] = true; });
    }
  });

  var factors = Object.keys(factorSet);
  if(!factors.length) return {};

  var results = {};

  factors.forEach(function(factor){
    var withDays = [];
    var withoutDays = [];

    records.forEach(function(r){
      var hasFactor = r.factors && r.factors.indexOf(factor) !== -1;
      var day = {
        energy: r.energy || null,
        sleepQuality: r.sleepQuality || null,
        sleepHours: r.sleepHours || null,
        painLevel: r.painLevel || null,
        symptomCount: (r.symptoms && r.symptoms.length) || 0,
        wellnessScore: r.wellnessScore !== undefined ? r.wellnessScore : null
      };
      if(hasFactor) withDays.push(day);
      else withoutDays.push(day);
    });

    if(withDays.length < 2 || withoutDays.length < 2) return;

    var metrics = ['energy','sleepQuality','sleepHours','painLevel','symptomCount','wellnessScore'];
    var comparison = { days: withDays.length, totalDays: records.length };

    metrics.forEach(function(m){
      var wVals = withDays.filter(function(d){ return d[m] !== null; }).map(function(d){ return d[m]; });
      var woVals = withoutDays.filter(function(d){ return d[m] !== null; }).map(function(d){ return d[m]; });
      if(wVals.length >= 2 && woVals.length >= 2){
        var wAvg = wVals.reduce(function(a,b){ return a+b; },0) / wVals.length;
        var woAvg = woVals.reduce(function(a,b){ return a+b; },0) / woVals.length;
        var diff = wAvg - woAvg;
        var pct = woAvg !== 0 ? Math.round((diff / Math.abs(woAvg)) * 100) : 0;
        comparison[m] = {
          with: Math.round(wAvg * 10) / 10,
          without: Math.round(woAvg * 10) / 10,
          diff: Math.round(diff * 10) / 10,
          pct: pct
        };
      }
    });

    // 症状別の出現率比較
    var symptomWithRate = {};
    var symptomWithoutRate = {};
    withDays.forEach(function(d, idx){
      var r = records.filter(function(rec){ return rec.factors && rec.factors.indexOf(factor) !== -1; })[idx];
      if(r && r.symptoms){
        r.symptoms.forEach(function(s){ symptomWithRate[s] = (symptomWithRate[s]||0) + 1; });
      }
    });
    withoutDays.forEach(function(d, idx){
      var r = records.filter(function(rec){ return !rec.factors || rec.factors.indexOf(factor) === -1; })[idx];
      if(r && r.symptoms){
        r.symptoms.forEach(function(s){ symptomWithoutRate[s] = (symptomWithoutRate[s]||0) + 1; });
      }
    });

    var symptomEffects = {};
    Object.keys(symptomWithRate).forEach(function(s){
      var wRate = symptomWithRate[s] / withDays.length;
      var woRate = (symptomWithoutRate[s] || 0) / withoutDays.length;
      if(wRate > 0 && woRate > 0){
        symptomEffects[s] = {
          withRate: Math.round(wRate * 100),
          withoutRate: Math.round(woRate * 100),
          ratio: Math.round((wRate / woRate) * 10) / 10
        };
      } else if(wRate > 0){
        symptomEffects[s] = {
          withRate: Math.round(wRate * 100),
          withoutRate: 0,
          ratio: '∞'
        };
      }
    });

    if(Object.keys(symptomEffects).length > 0){
      comparison.symptomEffects = symptomEffects;
    }

    results[factor] = comparison;
  });

  return results;
}
// ===== 比較グラフ =====
var _cgRange = 30;
var _cgFactors = {};

function setCGRange(days, btn){
  _cgRange = days;
  if(btn){
    document.querySelectorAll('.cg-range-btn').forEach(function(b){
      b.style.background='var(--white)'; b.style.color='var(--ink-mid)'; b.style.borderColor='#e8ddd8';
    });
    btn.style.background='var(--rose-pale)'; btn.style.color='var(--rose)'; btn.style.borderColor='var(--rose)';
  }
  renderComparisonChart();
}

function toggleCGFactor(factor, btn){
  _cgFactors[factor] = !_cgFactors[factor];
  btn.style.background = _cgFactors[factor] ? 'var(--rose-pale)' : 'var(--white)';
  btn.style.color = _cgFactors[factor] ? 'var(--rose)' : 'var(--ink-mid)';
  btn.style.borderColor = _cgFactors[factor] ? 'var(--rose)' : '#e8ddd8';
  renderComparisonChart();
}

function getMetricValue(rec, metric){
  if(metric === 'symptomCount') return rec.symptoms ? rec.symptoms.length : 0;
  return rec[metric] || 0;
}

function getMetricLabel(metric){
  var labels = {
    energy:'エネルギー', sleepQuality:'睡眠の質', sleepHours:'睡眠時間',
    painLevel:'痛み', wellnessScore:'ウェルネス', smiScore:'SMI', symptomCount:'症状数'
  };
  return labels[metric] || metric;
}

function getMetricMax(metric){
  var maxes = {
    energy:5, sleepQuality:5, sleepHours:12,
    painLevel:10, wellnessScore:100, smiScore:94, symptomCount:15
  };
  return maxes[metric] || 10;
}

function renderComparisonChart(){
  var svg = document.getElementById('cg-chart');
  var legend = document.getElementById('cg-legend');
  var toggles = document.getElementById('cg-factor-toggles');
  if(!svg) return;

  var m1 = (document.getElementById('cg-metric1')||{}).value || 'energy';
  var m2 = (document.getElementById('cg-metric2')||{}).value || '';

  // 期間内レコード取得
  var now = new Date();
  var cutoff = new Date(now.getTime() - _cgRange * 86400000);
  var recs = state.records.filter(function(r){
    return new Date(r.date) >= cutoff;
  }).sort(function(a,b){ return new Date(a.date) - new Date(b.date); });

  if(recs.length < 2){
    svg.innerHTML = '<text x="50%" y="100" text-anchor="middle" fill="#9a8880" font-size="12">データが不足しています（2日以上の記録が必要）</text>';
    if(legend) legend.innerHTML = '';
    return;
  }

  // ファクタートグル生成
  var allFactors = {};
  recs.forEach(function(r){
    if(r.factors) r.factors.forEach(function(f){ allFactors[f] = true; });
  });
  if(toggles){
    var tHtml = '';
    Object.keys(allFactors).forEach(function(f){
      var active = _cgFactors[f];
      tHtml += '<button onclick="toggleCGFactor(\''+f+'\',this)" style="padding:3px 8px;border:1px solid '+(active?'var(--rose)':'#e8ddd8')+';border-radius:6px;font-size:9px;background:'+(active?'var(--rose-pale)':'var(--white)')+';color:'+(active?'var(--rose)':'var(--ink-mid)')+';cursor:pointer;">'+f+'</button>';
    });
    toggles.innerHTML = tHtml;
  }

  // SVG描画設定
  var W = Math.max(300, recs.length * 28);
  var H = 180;
  var padL = 30, padR = 10, padT = 15, padB = 30;
  var chartW = W - padL - padR;
  var chartH = H - padT - padB;

  svg.setAttribute('width', W);
  svg.setAttribute('height', H);

  var html = '';

  // 背景のファクターハイライト
  var activeFactors = Object.keys(_cgFactors).filter(function(f){ return _cgFactors[f]; });
  if(activeFactors.length > 0){
    recs.forEach(function(r, idx){
      var hasAny = r.factors && activeFactors.some(function(f){ return r.factors.indexOf(f) !== -1; });
      if(hasAny){
        var x = padL + (idx / (recs.length - 1)) * chartW;
        html += '<rect x="'+(x-8)+'" y="'+padT+'" width="16" height="'+chartH+'" fill="rgba(255,107,107,0.08)" rx="4"/>';
      }
    });
  }

  // グリッド線
  for(var g=0;g<=4;g++){
    var gy = padT + (g/4) * chartH;
    html += '<line x1="'+padL+'" y1="'+gy+'" x2="'+(W-padR)+'" y2="'+gy+'" stroke="#f0ebe6" stroke-width="1"/>';
  }

  // 指標1の折れ線
  var max1 = getMetricMax(m1);
  var points1 = [];
  recs.forEach(function(r, idx){
    var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
    var v = getMetricValue(r, m1);
    var y = padT + chartH - (v / max1) * chartH;
    points1.push(x+','+y);
  });
  html += '<polyline points="'+points1.join(' ')+'" fill="none" stroke="var(--rose)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
  // ドット
  points1.forEach(function(p){
    var xy = p.split(',');
    html += '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" fill="var(--rose)"/>';
  });

  // 指標2の折れ線
  if(m2){
    var max2 = getMetricMax(m2);
    var points2 = [];
    recs.forEach(function(r, idx){
      var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
      var v = getMetricValue(r, m2);
      var y = padT + chartH - (v / max2) * chartH;
      points2.push(x+','+y);
    });
    html += '<polyline points="'+points2.join(' ')+'" fill="none" stroke="var(--sage)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4,3"/>';
    points2.forEach(function(p){
      var xy = p.split(',');
      html += '<circle cx="'+xy[0]+'" cy="'+xy[1]+'" r="3" fill="var(--sage)"/>';
    });
  }

  // X軸ラベル（間引き）
  var step = Math.max(1, Math.floor(recs.length / 6));
  recs.forEach(function(r, idx){
    if(idx % step === 0 || idx === recs.length - 1){
      var x = padL + (idx / Math.max(1, recs.length - 1)) * chartW;
      var d = new Date(r.date);
      var label = (d.getMonth()+1)+'/'+d.getDate();
      html += '<text x="'+x+'" y="'+(H-5)+'" text-anchor="middle" fill="#9a8880" font-size="9">'+label+'</text>';
    }
  });

  svg.innerHTML = html;

  // 凡例
  if(legend){
    var lHtml = '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:3px;background:var(--rose);border-radius:2px;"></span>'+getMetricLabel(m1)+'</span>';
    if(m2){
      lHtml += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:3px;background:var(--sage);border-radius:2px;border-top:1px dashed var(--sage);"></span>'+getMetricLabel(m2)+'</span>';
    }
    if(activeFactors.length > 0){
      lHtml += '<span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:8px;background:rgba(255,107,107,0.15);border-radius:2px;"></span>'+activeFactors.join('・')+'</span>';
    }
    legend.innerHTML = lHtml;
  }
}
  // ===== 要因効果レポート =====
var _corrOverlayApi = null;
function openCorrelationReport(){
  var corr = calcFactorCorrelations(state.records);
  var factors = Object.keys(corr);

  // 分析対象メタ情報
  var totalRecs = state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _crSorted = state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _crLd = new Date(_crSorted[0].record_date || _crSorted[0].date || '');
    if(!isNaN(_crLd.getTime())) lastDate = (_crLd.getMonth()+1)+'月'+_crLd.getDate()+'日';
  }

  if (!_corrOverlayApi) {
    _corrOverlayApi = window.createProOverlay({
      id:        'corrReportOverlay',
      ariaLabel: '一緒に起きやすいこと',
      title:     '一緒に起きやすいこと',
      subtitle:  '生活習慣と体調の記録を整理しています',
      footer:    [{ id: 'corr-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _corrOverlayApi.close(); },
    });
    _corrOverlayApi.getButton('corr-close').addEventListener('click', function(){ _corrOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(lastDate?' ／ 最終記録 '+lastDate:'')+'</div>';

  bodyHtml += '<div style="background:rgba(180,160,150,0.12);border-radius:12px;padding:10px 14px;margin-bottom:24px;">'
    + '<div style="font-size:12px;color:var(--ink-light);line-height:1.7;">ℹ️ この結果は傾向を整理したものであり、因果関係を示すものではありません。</div>'
    + '</div>';

  if(factors.length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">📊 まだ十分なデータがありません。<br>生活ファクターを記録した日が<br>各要因3日以上になると表示されます。</div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div class="pha-card" style="margin-bottom:0;padding:14px;">';
    factors.slice(0,5).forEach(function(factor, fi){
      var data = corr[factor];
      var wsData = data['wellnessScore'];
      var diff = wsData ? wsData.diff : null;
      var arrow = diff === null ? '—' : diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      var color = diff === null ? '#9a8880' : diff > 0 ? '#6b9e78' : diff < 0 ? '#c4878c' : '#9a8880';
      bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;'+(fi>0?'margin-top:8px;padding-top:8px;border-top:1px solid #f5f0ec;':'')+'">'
        + '<div style="font-size:14px;color:var(--ink);">'+factor+'</div>'
        + '<div style="font-size:13px;font-weight:600;color:'+color+';">'+arrow+(diff !== null ? ' ウェルネス'+(diff > 0 ? '+' : '')+diff : '')+'</div>'
        + '</div>';
    });
    bodyHtml += '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">「その習慣があった日」と「なかった日」の体調データの平均を比べています。差が大きいほど関連が強い傾向があります。</div>'
      + '</div>';

    // ③ 詳しいデータ
    bodyHtml += '<div style="margin-bottom:8px;"><div class="pha-section-title">詳しいデータを見る</div>';
    var metricLabels = {energy:'エネルギー',sleepQuality:'睡眠の質',painLevel:'痛み',symptomCount:'症状の数',wellnessScore:'ウェルネス'};

    factors.forEach(function(factor){
      var data = corr[factor];
      bodyHtml += '<div class="pha-card">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">'
        + '<div style="font-size:15px;font-weight:500;color:var(--ink);">'+factor+'</div>'
        + '<div style="font-size:12px;color:var(--ink-light);background:var(--cream);padding:3px 8px;border-radius:8px;">'+data.days+'日あり / '+data.totalDays+'日中</div>'
        + '</div>';

      ['energy','sleepQuality','painLevel','symptomCount','wellnessScore'].forEach(function(m){
        if(!data[m]) return;
        var d = data[m];
        var isNegative = (m === 'painLevel' || m === 'symptomCount');
        var isGood = isNegative ? d.diff < 0 : d.diff > 0;
        var color = isGood ? '#6b9e78' : d.diff === 0 ? '#9a8880' : '#c4878c';
        var arrow = d.diff > 0 ? '↑' : d.diff < 0 ? '↓' : '→';
        var pctText = d.pct > 0 ? '+'+d.pct+'%' : d.pct+'%';
        var maxVal = Math.max(d.with, d.without) || 1;

        bodyHtml += '<div style="margin-bottom:12px;">'
          + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">'
          + '<div style="font-size:13px;color:var(--ink-mid);">'+metricLabels[m]+'</div>'
          + '<div style="font-size:12px;font-weight:600;color:'+color+';">'+arrow+' '+pctText+'</div>'
          + '</div>'
          + '<div style="display:flex;gap:8px;align-items:center;">'
          + '<div style="flex:1;"><div style="font-size:12px;color:var(--ink-light);margin-bottom:3px;">あった日：'+d.with+'</div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+Math.round(d.with/maxVal*100)+'%;background:'+color+';border-radius:4px;"></div></div></div>'
          + '<div style="flex:1;"><div style="font-size:12px;color:var(--ink-light);margin-bottom:3px;">なかった日：'+d.without+'</div>'
          + '<div class="pha-bar"><div style="height:100%;width:'+Math.round(d.without/maxVal*100)+'%;background:#b8b0a8;border-radius:4px;"></div></div></div>'
          + '</div></div>';
      });

      if(data.symptomEffects){
        var effects = Object.keys(data.symptomEffects);
        if(effects.length > 0){
          bodyHtml += '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f0ebe6;">'
            + '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">一緒に出やすい症状</div>';
          effects.sort(function(a,b){
            var ra = data.symptomEffects[a].ratio === '∞' ? 999 : data.symptomEffects[a].ratio;
            var rb = data.symptomEffects[b].ratio === '∞' ? 999 : data.symptomEffects[b].ratio;
            return rb - ra;
          });
          effects.slice(0,5).forEach(function(s){
            var eff = data.symptomEffects[s];
            var ratioText = eff.ratio === '∞' ? '∞' : eff.ratio + '倍';
            var ratioColor = (eff.ratio === '∞' || eff.ratio >= 1.5) ? '#c4878c' : eff.ratio >= 1.1 ? '#d4a574' : '#6b9e78';
            bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">'
              + '<div style="font-size:13px;color:var(--ink-mid);">'+s+'</div>'
              + '<div style="font-size:12px;font-weight:600;color:'+ratioColor+';">'+ratioText+'<span style="font-size:12px;color:var(--ink-light);margin-left:4px;">('+eff.withRate+'% / '+eff.withoutRate+'%)</span></div>'
              + '</div>';
          });
          bodyHtml += '</div>';
        }
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';
  }

  _corrOverlayApi.body.innerHTML = bodyHtml;
  _corrOverlayApi.open();
}

// ===== フレアアップ自動検出 =====
function detectFlareups(records){
  var sorted = records.slice().sort(function(a,b){ return new Date(a.date) - new Date(b.date); });
  var flareups = [];
  for(var i=1; i<sorted.length; i++){
    var prev = sorted[i-1];
    var curr = sorted[i];
    var reasons = [];

    // 痛みが前日比+3以上
    if((curr.painLevel||0) - (prev.painLevel||0) >= 3){
      reasons.push('痛み急上昇 ('+(prev.painLevel||0)+'→'+(curr.painLevel||0)+')');
    }
    // ウェルネスが前日比-20以上
    if((prev.wellnessScore||50) - (curr.wellnessScore||50) >= 20){
      reasons.push('ウェルネス急低下 ('+(prev.wellnessScore||50)+'→'+(curr.wellnessScore||50)+')');
    }
    // 症状が前日比+3以上
    var prevSym = prev.symptoms ? prev.symptoms.length : 0;
    var currSym = curr.symptoms ? curr.symptoms.length : 0;
    if(currSym - prevSym >= 3){
      reasons.push('症状急増 ('+prevSym+'→'+currSym+'個)');
    }
    // エネルギーが前日比-2以上
    if((prev.energy||3) - (curr.energy||3) >= 2){
      reasons.push('エネルギー急低下 ('+(prev.energy||3)+'→'+(curr.energy||3)+')');
    }

    if(reasons.length > 0){
      var d = new Date(curr.date);
      flareups.push({
        date: curr.date,
        dateStr: (d.getMonth()+1)+'/'+d.getDate(),
        reasons: reasons,
        painLevel: curr.painLevel || 0,
        symptoms: curr.symptoms || [],
        factors: curr.factors || [],
        wellness: curr.wellnessScore,
        energy: curr.energy || 0,
        prevFactors: prev.factors || []
      });
    }
  }
  return flareups;
}

var _flareupOverlayApi = null;
function openFlareupReport(){
  var flareups = detectFlareups(state.records);

  // 分析対象メタ情報
  var totalRecs = state.records.length;
  var lastDate = '';
  if(totalRecs > 0){
    var _flSorted = state.records.slice().sort(function(a,b){
      return (b.record_date||b.date||'').localeCompare(a.record_date||a.date||'');
    });
    var _flLd = new Date(_flSorted[0].record_date || _flSorted[0].date || '');
    if(!isNaN(_flLd.getTime())) lastDate = (_flLd.getMonth()+1)+'月'+_flLd.getDate()+'日';
  }
  var firstDate = '';
  if(totalRecs > 0){
    var _flFirst = state.records.slice().sort(function(a,b){
      return (a.record_date||a.date||'').localeCompare(b.record_date||b.date||'');
    });
    var _flFd = new Date(_flFirst[0].record_date || _flFirst[0].date || '');
    if(!isNaN(_flFd.getTime())) firstDate = (_flFd.getMonth()+1)+'月'+_flFd.getDate()+'日';
  }

  if (!_flareupOverlayApi) {
    _flareupOverlayApi = window.createProOverlay({
      id:        'flareupOverlay',
      ariaLabel: '症状が強かった日の共通点',
      title:     '症状が強かった日の共通点',
      subtitle:  '症状が急に強くなった日とその前後を整理します',
      footer:    [{ id: 'flareup-close', label: '閉じる', cls: 'pob-btn pob-btn-secondary' }],
      onClose:   function(){ _flareupOverlayApi.close(); },
    });
    _flareupOverlayApi.getButton('flareup-close').addEventListener('click', function(){ _flareupOverlayApi.close(); });
  }

  var bodyHtml = '';
  bodyHtml += '<div class="pha-meta"><span style="font-size:11px;color:var(--ink-light);display:block;margin-bottom:4px;">📋 分析対象</span>'
    + totalRecs+'件の記録'+(firstDate&&lastDate?' ／ '+firstDate+' 〜 '+lastDate:'')+'</div>';

  if(totalRecs < 2){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">📋 分析できる記録がまだ十分ではありません。<br>記録を続けると傾向が見えてきます。</div>';
  } else if(flareups.length === 0){
    bodyHtml += '<div style="text-align:center;padding:40px 0;color:var(--ink-light);font-size:14px;line-height:1.9;">✨ 急な変化は見られませんでした。<br><span style="font-size:12px;">（'+totalRecs+'件の記録を確認しました）</span></div>';
  } else {

    // ① 今見えていること
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">今見えていること</div>'
      + '<div style="background:var(--rose-pale);border-radius:14px;padding:14px 16px;">'
      + '<div style="font-size:15px;color:var(--ink-mid);line-height:1.7;">'+flareups.length+'日、症状が急に強くなった日が見つかりました</div>'
      + '</div></div>';

    // ② なぜそう考えた？
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">なぜそう考えた？</div>'
      + '<div class="pha-card" style="margin-bottom:0;font-size:14px;color:var(--ink-mid);line-height:1.8;">前日と比べて、痛み・ウェルネス・症状の数・エネルギーのうちいずれかが急変した日を検出しています。</div>'
      + '</div>';

    // ③ 詳しいデータ
    bodyHtml += '<div style="margin-bottom:var(--screen-section-gap,32px);"><div class="pha-section-title">詳しいデータを見る</div>';
    flareups.slice().reverse().forEach(function(f){
      bodyHtml += '<div class="pha-card" style="border-left:3px solid var(--rose);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'
        + '<div style="font-size:15px;font-weight:600;color:var(--ink);">'+f.dateStr+'</div>'
        + '<div style="display:flex;gap:4px;">';
      if(f.wellness !== undefined) bodyHtml += '<span style="font-size:11px;background:#fde8e8;color:#c4878c;padding:2px 8px;border-radius:8px;">WS:'+f.wellness+'</span>';
      if(f.energy) bodyHtml += '<span style="font-size:11px;background:#e8f4ec;color:#4a7c5c;padding:2px 8px;border-radius:8px;">⚡'+f.energy+'</span>';
      if(f.painLevel) bodyHtml += '<span style="font-size:11px;background:#fde8e8;color:#c4878c;padding:2px 8px;border-radius:8px;">痛み'+f.painLevel+'</span>';
      bodyHtml += '</div></div>';

      bodyHtml += '<div style="margin-bottom:8px;">';
      f.reasons.forEach(function(r){
        bodyHtml += '<div style="font-size:13px;color:var(--rose);margin-bottom:4px;">🔺 '+r+'</div>';
      });
      bodyHtml += '</div>';

      if(f.symptoms.length > 0){
        bodyHtml += '<div style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:4px;">';
        f.symptoms.forEach(function(s){
          bodyHtml += '<span style="font-size:12px;background:var(--warm-light);color:var(--ink-mid);padding:3px 10px;border-radius:8px;">'+s+'</span>';
        });
        bodyHtml += '</div>';
      }
      if(f.factors.length > 0) bodyHtml += '<div style="font-size:12px;color:var(--ink-light);margin-top:6px;">📋 当日の要因：'+f.factors.join('・')+'</div>';
      if(f.prevFactors.length > 0) bodyHtml += '<div style="font-size:12px;color:var(--ink-light);margin-top:3px;">📋 前日の要因：'+f.prevFactors.join('・')+'</div>';
      bodyHtml += '</div>';
    });
    bodyHtml += '</div>';

    // ④ 共通点（トリガー分析）
    var triggerCounts = {};
    flareups.forEach(function(f){
      f.factors.concat(f.prevFactors).forEach(function(fac){
        triggerCounts[fac] = (triggerCounts[fac] || 0) + 1;
      });
    });
    var triggers = Object.entries(triggerCounts).sort(function(a,b){ return b[1]-a[1]; });
    if(triggers.length > 0){
      bodyHtml += '<div style="margin-bottom:16px;"><div class="pha-section-title">症状が強かった日に多かった要因</div>'
        + '<div class="pha-card" style="margin-bottom:0;">';
      triggers.slice(0,5).forEach(function(t){
        var pct = Math.round(t[1] / flareups.length * 100);
        bodyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
          + '<div style="font-size:13px;color:var(--ink-mid);">'+t[0]+'</div>'
          + '<div style="display:flex;align-items:center;gap:6px;flex:1;margin-left:12px;">'
          + '<div class="pha-bar" style="flex:1;"><div style="height:100%;width:'+pct+'%;background:var(--rose);border-radius:4px;"></div></div>'
          + '<div style="font-size:11px;color:var(--ink-light);min-width:32px;text-align:right;">'+t[1]+'日</div>'
          + '</div></div>';
      });
      bodyHtml += '</div></div>';
    }
  }

  _flareupOverlayApi.body.innerHTML = bodyHtml;
  _flareupOverlayApi.open();
}

function gatherRecordData(){
  var mealFree = (document.getElementById('rs-meal-free')||{}).value||'';
  var parsed = parseMealMemo(mealFree);
  var temp = parseFloat((document.getElementById('rs-temp')||{}).value) || null;
  var note = (document.getElementById('rs-note')||{}).value||'';
  var symptoms = [];
  document.querySelectorAll('#rs-symptoms .chip.selected').forEach(function(c){ symptoms.push(c.textContent); });
  var cycle = '';
  var selCycle = document.querySelector('#rs-cycle .chip.selected');
  if(selCycle) cycle = selCycle.textContent;

  // 痛みの詳細
  var painLocation = [];
  document.querySelectorAll('#rs-pain-location .chip.selected').forEach(function(c){ painLocation.push(c.textContent); });
  var painType = [];
  document.querySelectorAll('#rs-pain-type .chip.selected').forEach(function(c){ painType.push(c.textContent); });
  var painLevel = parseInt((document.getElementById('rs-pain-level')||{}).value) || 0;

  // 服薬
  var medication = [];
  document.querySelectorAll('#rs-medication .chip.selected').forEach(function(c){ medication.push(c.textContent); });
    // エネルギーレベル
    var energy = 0;
    var selEnergy = document.querySelector('#rs-energy .chip.selected');
    if(selEnergy) energy = parseInt(selEnergy.getAttribute('data-val')) || 0;

    // 睡眠
    var sleepBed = (document.getElementById('rs-sleep-bed')||{}).value || '';
    var sleepWake = (document.getElementById('rs-sleep-wake')||{}).value || '';
    var sleepQuality = 0;
    var selSQ = document.querySelector('#rs-sleep-quality .chip.selected');
    if(selSQ) sleepQuality = parseInt(selSQ.getAttribute('data-val')) || 0;
    var sleepHours = 0;
    if(sleepBed && sleepWake){
      var b = sleepBed.split(':'), w = sleepWake.split(':');
      var bMin = parseInt(b[0])*60+parseInt(b[1]), wMin = parseInt(w[0])*60+parseInt(w[1]);
      if(wMin <= bMin) wMin += 1440;
      sleepHours = Math.round((wMin - bMin)/60*10)/10;
    }

    // 生活ファクター
    var factors = [];
    document.querySelectorAll('#rs-factors .chip.selected').forEach(function(c){ factors.push(c.textContent); });

    // お通じ
    var bowel = '';
    var selBowel = document.querySelector('#rs-bowel .chip.selected');
    if(selBowel) bowel = selBowel.textContent;

    // 気分（Step 1）
    var mood = 0;
    var selMood = document.querySelector('#rs-mood .chip.selected');
    if(selMood) mood = parseInt(selMood.getAttribute('data-val')) || 0;

    // おりもの
    var dischargeAmount = '';
    var selDA = document.querySelector('#rs-discharge-amount .chip.selected');
    if(selDA) dischargeAmount = selDA.textContent;
    var dischargeType = [];
    document.querySelectorAll('#rs-discharge-type .chip.selected').forEach(function(c){ dischargeType.push(c.textContent); });

    // 疾患セルフチェック（複数疾患対応）
    var diseaseCheck = {};
    document.querySelectorAll('[data-disease-q]').forEach(function(g){
      var sel = g.querySelector('.chip.selected');
      if(sel) diseaseCheck[g.getAttribute('data-disease-q')] = sel.textContent;
    });

    return {
      mealFree: mealFree,
      firstTime: parsed ? parsed.firstTime : '',
      lastTime: parsed ? parsed.lastTime : '',
      mealCount: parsed ? parsed.mealCount : 0,
      fastingHours: parsed ? parsed.fastingHours : 0,
      temp: temp,
      note: note,
      mood: mood,
      symptoms: symptoms,
      cycle: cycle,
      painLocation: painLocation,
      painType: painType,
      painLevel: painLevel,
      medication: medication,
      bloodClot: (function(){ var r=[]; document.querySelectorAll('#rs-blood-clot .chip.selected').forEach(function(c){ r.push(c.textContent); }); return r; })(),
      bloodColor: (function(){ var r=[]; document.querySelectorAll('#rs-blood-color .chip.selected').forEach(function(c){ r.push(c.textContent); }); return r; })(),
      dischargeAmount: dischargeAmount,
      dischargeType: dischargeType,
      bowelCount: _bowelCount || 0,
      energy: energy,
      sleepBed: sleepBed,
      sleepWake: sleepWake,
      sleepQuality: sleepQuality,
      sleepHours: sleepHours,
      factors: factors,
      bowel: bowel,
      diseaseCheck: diseaseCheck,
      diseases: state.myDiseases || [],
      tempMethod: window._tempMethod || 'sublingual'
    };
}

function draftRecordScreen(){
  var data = gatherRecordData();
  data._draftDate = new Date().toISOString();
  localStorage.setItem('ippo_draft', JSON.stringify(data));
  var di = document.getElementById('draft-indicator');
  if(di){ di.textContent='一時保存しました'; di.style.display='block'; di.style.color='var(--sage)'; setTimeout(function(){ di.style.display='none'; }, 2500); }
}

function toLocalDateKey(date) {
  var d = date instanceof Date ? date : new Date(date);
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function saveRecordScreen(){
  try {
    var data = gatherRecordData();
   var targetDate = state.editingDate ? new Date(state.editingDate) : new Date();
var todayStr = targetDate.toDateString();
    var targetDateSlice = toLocalDateKey(targetDate);
    var rec = null;
    for(var i=0; i<state.records.length; i++){
      var _r = state.records[i];
      if((_r.date && new Date(_r.date).toDateString() === todayStr) ||
         (_r.record_date && _r.record_date.slice(0, 10) === targetDateSlice)){
        rec = _r; break;
      }
    }
    var isNew = false;
    if(!rec){
      rec = { date: targetDate.toISOString(), record_date: targetDate.toISOString().slice(0, 10) };
      isNew = true;
    } else if(!rec.date) {
      rec.date = targetDate.toISOString();
      if(!rec.record_date) rec.record_date = targetDate.toISOString().slice(0, 10);
    }
    var mealFreeEl = document.getElementById('rs-meal-free');
    var mealFreeText = mealFreeEl ? mealFreeEl.value.trim() : '';
    var parsed = parseMealMemo(mealFreeText);
    rec.mealFree = mealFreeText;
    rec.meals = { free: mealFreeText };
    rec.firstMealTime = parsed ? parsed.firstTime : '';
    rec.lastMealTime = parsed ? parsed.lastTime : '';
    rec.mealCount = parsed ? parsed.mealCount : 0;
    rec.fasting = parsed ? parsed.fastingHours : 0;
    var _newDiseaseCheck = gatherDiseaseData();
    if (Object.keys(_newDiseaseCheck).length > 0) {
      rec.diseaseCheck = _newDiseaseCheck;
    }
    localStorage.removeItem('ippo_meal_draft');
    rec.temperature = data.temp;
    rec.tempMethod = data.tempMethod || 'sublingual';
    rec.symptoms = data.symptoms;
    rec.menstrualCycle = data.cycle;
    var bodyChoices = {};
    document.querySelectorAll('#rs-body-choices .chips').forEach(function(group){
      var cat = group.getAttribute('data-category');
      var selected = [];
      group.querySelectorAll('.chip.selected').forEach(function(c){
        selected.push(c.getAttribute('data-val'));
      });
      if(selected.length) bodyChoices[cat] = selected;
    });
    if (Object.keys(bodyChoices).length > 0) {
      rec.bodyChoices = bodyChoices;
    }
    if(data.note) rec.note = data.note;
    // 痛みの詳細
    rec.painLocation = data.painLocation;
    rec.painType = data.painType;
    rec.painLevel = data.painLevel;
    // 服薬
    rec.medication = data.medication;
    rec.bloodClot = data.bloodClot;
    rec.bloodColor = data.bloodColor;
    // エネルギー・睡眠・ファクター・お通じ
    rec.energy = data.energy;
    rec.sleepBed = data.sleepBed;
    rec.sleepWake = data.sleepWake;
    rec.sleepQuality = data.sleepQuality;
    rec.sleepHours = data.sleepHours;
    rec.factors = data.factors;
    rec.bowel = data.bowel;
    rec.bowelCount = data.bowelCount || 0;
    rec.mood = data.mood;
    rec.dischargeAmount = data.dischargeAmount;
    rec.dischargeType = data.dischargeType;
    rec.diseases = data.diseases;
    rec.wellnessScore = calcWellnessScore(rec);
        // 更年期SMIスコア
    var smi = calcSMIScore(rec.diseaseCheck || {});
    if(smi !== null) rec.smiScore = smi;



    // 新規の場合のみ配列に追加
    if(isNew){
      state.records.push(rec);
      state.totalDays++;
      // streak計算
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yStr = yesterday.toDateString();
      var hadYesterday = state.records.some(function(r){ return new Date(r.date).toDateString() === yStr; });
      state.streak = state.streak || 0;
      if(hadYesterday || state.streak === 0) state.streak++;
      else state.streak = 1;
    }

    // 保存を即座に実行
    try {
      if (typeof window.saveState === 'function') {
        window.saveState();
      } else if (typeof saveState === 'function') {
        saveState();
      } else {
        localStorage.setItem('ippo_state', JSON.stringify(state));
      }
    } catch(storageErr) {
      showAlertModal('記録の保存に失敗しました。端末のストレージ容量を確認してください。');
      console.error('Storage error:', storageErr);
      return;
    }

    // 保存成功を検証
    var verify = JSON.parse(localStorage.getItem('ippo_state'));
    var saved = verify.records.some(function(r){
      return (r.date && new Date(r.date).toDateString() === todayStr) ||
             (r.record_date && r.record_date.slice(0, 10) === targetDateSlice);
    });
    if(!saved){
      showAlertModal('記録の保存に失敗しました。もう一度お試しください。');
      return;
    }

    // P0-A: 保存成功後 draft を即削除し dirtyFlag をリセット
    localStorage.removeItem('ippo_record_draft');
    if (window.ippoRecordDraftGuard && typeof window.ippoRecordDraftGuard.markClean === 'function') {
      window.ippoRecordDraftGuard.markClean();
    }

    // 最近使った症状を記録（自動昇格ロジック用）
    if(data.symptoms && data.symptoms.length) saveSymptomSelection(data.symptoms);

    // UI更新（保存成功後のみ）
    updateHomeSummary();
    if (typeof updateDailyHintCard === 'function') updateDailyHintCard();
    updateHomeCTA();
    updateHomeCTAState();
    if (typeof updateTodayMessage === 'function') updateTodayMessage();
    updateStreakBadge();
    buildHomeWeekRow();
    updateHomeInsightCard();
    updateHomeNumbers();
    updateHomeDiseaseAdvice();
    checkAndShowTempAlert();
    if (typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();
    updateStats();
    updateHistory();
    buildCalendar();
    if (typeof window.buildCalendarNext === 'function') window.buildCalendarNext();
    localStorage.removeItem('ippo_draft');
    var _cloudBackupFn = (typeof window.cloudBackupAll === 'function' ? window.cloudBackupAll : cloudBackupAll);
    if(typeof _cloudBackupFn === 'function'){
  _cloudBackupFn().catch(function(e){
    console.warn('クラウドバックアップ失敗、リトライ中...', e);
    setTimeout(function(){
      _cloudBackupFn().catch(function(){
        showToast('クラウド同期に失敗しました。Wi-Fiを確認してください。', 'warn');
      });
    }, 3000);
  });
}

    var so = document.getElementById('success-overlay');
    if(so){
      document.getElementById('success-emoji').textContent = '🌿';
      document.getElementById('success-title').textContent = '記録を保存しました';
      // フィードバックカード生成
      var streak = state.streak || 0;
      var feedbackHtml = '';
      // 1. 連続記録日数
      feedbackHtml += '<div style="background:#FBEAF0;border-radius:14px;padding:14px 16px;margin:12px 0 4px;text-align:left;">';
      feedbackHtml += '<div style="font-weight:500;color:#72243E;margin-bottom:4px;">今日で' + streak + '日連続記録中</div>';
      // 2. 先週との比較
      var now = new Date();
      var last7 = state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=0&&diff<7; });
      var prev7 = state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=7&&diff<14; });
      if(last7.length>0 && prev7.length>0){
        var lastPain = last7.reduce(function(s,r){ return s+(r.painLevel||0); },0)/last7.length;
        var prevPain = prev7.reduce(function(s,r){ return s+(r.painLevel||0); },0)/prev7.length;
        var diff = Math.round((prevPain - lastPain)*10)/10;
        if(diff > 0) feedbackHtml += '<div style="font-size:13px;color:#72243E;">先週より痛みの記録が'+diff.toFixed(1)+'ポイント改善の傾向です</div>';
        else if(diff < 0) feedbackHtml += '<div style="font-size:13px;color:#72243E;">記録を続けてパターンを見つけましょう</div>';
        else feedbackHtml += '<div style="font-size:13px;color:#72243E;">先週と同じペースで記録中です</div>';
      }
      // 3. フェーズメッセージ
      var phaseMsg = '';
      if(typeof getCurrentCyclePhase === 'function'){
        var ph = getCurrentCyclePhase();
        if(ph === '生理期') phaseMsg = '生理期です。無理せず、水分補給を大切に。';
        else if(ph === '卵胞期') phaseMsg = '卵胞期です。体が軽く動きやすい時期です。';
        else if(ph === '排卵期') phaseMsg = '排卵期です。体温の変化を確認しましょう。';
        else if(ph === '黄体期') phaseMsg = '黄体期です。水分補給と早めの睡眠を意識しましょう。';
        if(phaseMsg) feedbackHtml += '<div style="font-size:13px;color:#72243E;margin-top:4px;">'+phaseMsg+'</div>';
      }
      feedbackHtml += '</div>';
      document.getElementById('success-message').innerHTML = feedbackHtml;
      so.classList.add('active');
      // P0-3: 前のタイマーをクリアしてから新タイマーをセット
      if (window.__ippoSuccessOverlayTimer) {
        clearTimeout(window.__ippoSuccessOverlayTimer);
        window.__ippoSuccessOverlayTimer = null;
      }
      window.__ippoSuccessOverlayTimer = setTimeout(function() {
        var overlay = document.getElementById('success-overlay');
        if (overlay && overlay.classList.contains('active')) {
          overlay.style.transition = 'opacity 0.5s ease';
          overlay.style.opacity = '0';
          setTimeout(function() {
            overlay.classList.remove('active');
            overlay.style.opacity = '';
            overlay.style.transition = '';
            window.__ippoSuccessOverlayTimer = null;
            // P0-1: ホーム強制遷移を削除
          }, 500);
        }
      }, 2000);
    }
    if(state.editingDate){
      state.editingDate = null;
     saveAndSync();
    }
  } catch(e) {
    console.error('saveRecordScreen error:', e);
    showAlertModal('記録の保存中にエラーが発生しました。<br>もう一度お試しください。<br><br>エラー: ' + e.message);
  }
}


// ===== START =====
// Phase E (Step 5): bootstrap() は src/main.js から直接呼び出される。
// ippo:vite-ready リスナは外部コードとの互換性のため空のまま維持。
window.addEventListener('ippo:vite-ready', function() {}, { once: true });
setDailyMessage();
  


// ===== BODY SUMMARY (からだサマリー) =====

function openDoctorSummary() {
  document.getElementById('doctorSummaryOverlay').classList.add('active');
  generateDoctorSummary();
}

function closeDoctorSummary() {
  document.getElementById('doctorSummaryOverlay').classList.remove('active');
}

document.getElementById('doctorSummaryOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeDoctorSummary();
});

async function generateDoctorSummary() {
  const body = document.getElementById('doctorSummaryBody');
  body.innerHTML = '<div class="ds-empty">データを読み込み中...</div>';

  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];
    const monthLabel = (today.getMonth() + 1) + '月';

    // ローカルのstate.recordsから過去30日分を取得
    const records = state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    }).map(function(r) {
      return { record_date: r.record_date || (r.date ? r.date.slice(0, 10) : ''), data: r };
    });

    if (records.length === 0) {
      body.innerHTML = '<div class="ds-empty">過去30日間の記録がありません。<br>毎日の記録を続けると、ここにからだサマリーが届きます。</div>';
      return;
    }

    // データ集計
    const totalDays = records.length;
    const symptomCounts = {};
    const temperatures = [];
    const fastingHours = [];
    const cycleStatuses = [];
    const mealCounts = [];
    const diseaseChecks = [];
    const energyLevels = [];
const sleepData = [];
const wellnessScores = [];
const smiScores = [];
const factorCounts = {};
const bowelCounts = {};
const painData = [];
const medicationCounts = {};

    records.forEach(function(r) {
      var d = r.data || {};

      if (d.symptoms && d.symptoms.length > 0) {
        d.symptoms.forEach(function(s) {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
        });
      }

      if (d.temperature) {
        temperatures.push({ date: r.record_date, value: parseFloat(d.temperature) });
      }

      if (d.fasting && parseFloat(d.fasting) >= 12) {
        fastingHours.push({ date: r.record_date, value: parseFloat(d.fasting) });
      }

      if (d.menstrualCycle && d.menstrualCycle.trim() && d.menstrualCycle !== 'なし') {
        cycleStatuses.push({ date: r.record_date, status: d.menstrualCycle });
      }

      if (d.mealCount) {
        mealCounts.push(d.mealCount);
      }

      if (d.diseaseCheck && Object.keys(d.diseaseCheck).length > 0) {
        diseaseChecks.push({ date: r.record_date, check: d.diseaseCheck });
      }
            if (d.energy) {
        energyLevels.push(d.energy);
      }

      if (d.sleepHours || d.sleepQuality) {
        sleepData.push({
          date: r.record_date,
          hours: d.sleepHours || null,
          quality: d.sleepQuality || null,
          bed: d.sleepBed || '',
          wake: d.sleepWake || ''
        });
      }

      if (d.wellnessScore !== undefined) {
        wellnessScores.push(d.wellnessScore);
      }

      if (d.smiScore !== undefined) {
        smiScores.push(d.smiScore);
      }

      if (d.factors && d.factors.length) {
        d.factors.forEach(function(f) {
          factorCounts[f] = (factorCounts[f] || 0) + 1;
        });
      }

      if (d.bowel) {
        bowelCounts[d.bowel] = (bowelCounts[d.bowel] || 0) + 1;
      }

      if (d.painLevel && d.painLevel > 0) {
        painData.push({
          date: r.record_date,
          level: d.painLevel,
          location: d.painLocation || '',
          type: d.painType || ''
        });
      }

      if (d.medication && d.medication.length) {
        d.medication.forEach(function(m) {
          medicationCounts[m] = (medicationCounts[m] || 0) + 1;
        });
      }
    });

    // ===== 文章生成 =====
    var html = '';

    // ヘッダー
    html += '<div style="text-align:center;margin-bottom:24px;">';
    html += '<div style="font-size:11px;letter-spacing:0.15em;color:var(--ink-light);margin-bottom:4px;">BODY SUMMARY</div>';
    html += '<div style="font-family:Shippori Mincho,serif;font-size:20px;color:var(--ink);">' + monthLabel + 'のからだサマリー</div>';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-top:6px;">' + fromDate + ' 〜 ' + toDate + '（' + totalDays + '日間の記録）</div>';
    html += '</div>';

    // ① 体温のリズム
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🌡 体温のリズム</div>';
    if (temperatures.length >= 3) {
      var avgTemp = (temperatures.reduce(function(s, t) { return s + t.value; }, 0) / temperatures.length).toFixed(2);
      var minTemp = Math.min.apply(null, temperatures.map(function(t) { return t.value; })).toFixed(2);
      var maxTemp = Math.max.apply(null, temperatures.map(function(t) { return t.value; })).toFixed(2);
      var tempRange = (maxTemp - minTemp).toFixed(2);

      html += '<div class="ds-narrative">';
      html += '今月の基礎体温は平均 <strong>' + avgTemp + '℃</strong> でした。';
      html += '最低 ' + minTemp + '℃ 〜 最高 ' + maxTemp + '℃ の範囲で、';
      if (tempRange >= 0.3) {
        html += '高温期と低温期の差が <strong>' + tempRange + '℃</strong> あり、二相性のリズムが見られます。';
      } else {
        html += '変動幅は ' + tempRange + '℃ と小さめです。引き続き記録を続けると、リズムがより明確になります。';
      }
      html += '</div>';
    } else {
      html += '<div class="ds-narrative">体温の記録が' + temperatures.length + '日分です。あと' + (3 - temperatures.length) + '日記録すると、リズムの傾向が見えてきます。</div>';
    }
    html += '</div>';

    // ② 食事とからだの関係
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🍽 食事とからだの関係</div>';
    html += '<div class="ds-narrative">';
    if (fastingHours.length >= 3) {
      var avgFast = (fastingHours.reduce(function(s, h) { return s + h.value; }, 0) / fastingHours.length).toFixed(1);
      var longFastDays = fastingHours.filter(function(h) { return h.value >= 16; }).length;
      html += '今月の平均ファスティングは <strong>' + avgFast + '時間</strong> でした。';
      if (longFastDays > 0) {
        html += '16時間以上のファスティングを達成した日は <strong>' + longFastDays + '日</strong> あります。';

        // ファスティングが長い日と症状の関係を分析
        var longFastDates = fastingHours.filter(function(h) { return h.value >= 16; }).map(function(h) { return h.date; });
        var symptomOnFastDay = {};
        records.forEach(function(r) {
          if (longFastDates.indexOf(r.record_date) !== -1 && r.data.symptoms) {
            r.data.symptoms.forEach(function(s) {
              symptomOnFastDay[s] = (symptomOnFastDay[s] || 0) + 1;
            });
          }
        });
        if (Object.keys(symptomOnFastDay).length > 0) {
          var topSymptom = Object.entries(symptomOnFastDay).sort(function(a, b) { return b[1] - a[1]; })[0];
          html += 'ファスティングが長い日には「' + topSymptom[0] + '」の記録が目立ちます。';
        } else {
          html += 'ファスティングが長い日に特定の症状は記録されていません。良い傾向です。';
        }
      }
    } else if (mealCounts.length > 0) {
      var avgMeals = (mealCounts.reduce(function(s, m) { return s + m; }, 0) / mealCounts.length).toFixed(1);
      html += '1日あたりの平均食事回数は <strong>' + avgMeals + '回</strong> でした。';
    } else {
      html += '食事の記録をもう少し増やすと、食事と体調の関係が見えてきます。';
    }
    html += '</div>';
    html += '</div>';

    // ③ 気になるパターン
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">🔍 気になるパターン</div>';
    html += '<div class="ds-narrative">';
    var sortedSymptoms = Object.entries(symptomCounts).sort(function(a, b) { return b[1] - a[1]; });
    if (sortedSymptoms.length > 0) {
      html += '今月もっとも多く記録された症状は「<strong>' + sortedSymptoms[0][0] + '</strong>」で、' + sortedSymptoms[0][1] + '日間記録されています。';
      if (sortedSymptoms.length > 1) {
        html += '次いで「' + sortedSymptoms[1][0] + '」が' + sortedSymptoms[1][1] + '日間です。';
      }

      // 症状と生理周期の関係
      if (cycleStatuses.length > 0) {
        var cycleDates = cycleStatuses.map(function(c) { return c.date; });
        var symptomNearCycle = 0;
        records.forEach(function(r) {
          if (r.data.symptoms && r.data.symptoms.length > 0) {
            var rDate = new Date(r.record_date);
            cycleDates.forEach(function(cd) {
              var diff = Math.abs(rDate - new Date(cd));
              if (diff <= 3 * 86400000) symptomNearCycle++;
            });
          }
        });
        if (symptomNearCycle > 0) {
          html += '<br>生理前後に症状の記録が集中する傾向が見られます。来月も同じ時期に注目してみましょう。';
        }
      }
    } else {
      html += '今月は症状の記録がありません。体調が安定していた月かもしれません。';
    }

    // 疾患チェックの傾向
    if (diseaseChecks.length > 0) {
      var checkCounts = {};
      diseaseChecks.forEach(function(dc) {
        Object.entries(dc.check).forEach(function(entry) {
          var key = entry[0];
          var val = entry[1];
          if (val !== 'なし') {
            checkCounts[key] = (checkCounts[key] || 0) + 1;
          }
        });
      });
      var sortedChecks = Object.entries(checkCounts).sort(function(a, b) { return b[1] - a[1]; });
      if (sortedChecks.length > 0) {
        var topCheck = sortedChecks[0];
        var topKey = topCheck[0];
        var topParts = topKey.split('__');
        var topDKey = topParts.length > 1 ? topParts[0] : '';
        var topQId = topParts.length > 1 ? topParts[1] : topKey;
        var topQCfg = (typeof DISEASE_CONFIG !== 'undefined' && topDKey) ? DISEASE_CONFIG[topDKey] : null;
        var checkName = topQId;
        if(topQCfg && topQCfg.questions){
          for(var cqi=0;cqi<topQCfg.questions.length;cqi++){
            if(topQCfg.questions[cqi].id === topQId){ checkName = topQCfg.questions[cqi].text.replace('？',''); break; }
          }
        }
        html += '<br>疾患チェックでは「' + checkName + '」が' + topCheck[1] + '日間記録されています。';
      }
    }
    html += '</div>';
    html += '</div>';
        // ④ エネルギー・睡眠・生活の傾向
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">⚡ エネルギー・睡眠・生活の傾向</div>';
    html += '<div class="ds-narrative">';

    if(energyLevels.length > 0){
      var avgEnergy = (energyLevels.reduce(function(a,b){return a+b;},0) / energyLevels.length).toFixed(1);
      var lowDays = energyLevels.filter(function(e){return e <= 2;}).length;
      html += '平均エネルギーレベルは <strong>' + avgEnergy + '/5</strong> です（' + energyLevels.length + '日分）。';
      if(lowDays > 0) html += '低エネルギー（2以下）の日が <strong>' + lowDays + '日</strong> ありました。';
      html += '<br>';
    }

    if(sleepData.length > 0){
      var sleepHrs = sleepData.filter(function(s){return s.hours;}).map(function(s){return s.hours;});
      var sleepQuals = sleepData.filter(function(s){return s.quality;}).map(function(s){return s.quality;});
      if(sleepHrs.length > 0){
        var avgSH = (sleepHrs.reduce(function(a,b){return a+b;},0) / sleepHrs.length).toFixed(1);
        var shortDays = sleepHrs.filter(function(h){return h < 6;}).length;
        html += '平均睡眠時間は <strong>' + avgSH + '時間</strong>（' + sleepHrs.length + '日分）。';
        if(shortDays > 0) html += '6時間未満の日が <strong>' + shortDays + '日</strong>。';
      }
      if(sleepQuals.length > 0){
        var avgSQ = (sleepQuals.reduce(function(a,b){return a+b;},0) / sleepQuals.length).toFixed(1);
        html += '睡眠の質の平均は <strong>' + avgSQ + '/5</strong>。';
      }
      html += '<br>';
    }

    if(wellnessScores.length > 0){
      var avgWS = Math.round(wellnessScores.reduce(function(a,b){return a+b;},0) / wellnessScores.length);
      var minWS = Math.min.apply(null, wellnessScores);
      var maxWS = Math.max.apply(null, wellnessScores);
      html += 'ウェルネススコアは平均 <strong>' + avgWS + '/100</strong>（最低 ' + minWS + '、最高 ' + maxWS + '）。';
      if(avgWS < 40) html += '全体的に低めの傾向が続いています。';
      html += '<br>';
    }

    if(smiScores.length > 0){
      var avgSMI = Math.round(smiScores.reduce(function(a,b){return a+b;},0) / smiScores.length);
      html += '更年期指数（SMI）の平均は <strong>' + avgSMI + '/94</strong>（' + smiScores.length + '日分）。';
      if(avgSMI > 50) html += '症状が強めに出ている傾向があります。';
      html += '<br>';
    }

    if(energyLevels.length === 0 && sleepData.length === 0 && wellnessScores.length === 0){
      html += 'エネルギー・睡眠の記録がまだありません。記録を始めると、ここに傾向が表示されます。';
    }

    html += '</div>';
    html += '</div>';

    // ⑤ 痛み・服薬の傾向
    if(painData.length > 0 || Object.keys(medicationCounts).length > 0){
      html += '<div class="ds-section">';
      html += '<div class="ds-section-title">💊 痛み・服薬の傾向</div>';
      html += '<div class="ds-narrative">';

      if(painData.length > 0){
        var avgPain = (painData.reduce(function(a,p){return a+p.level;},0) / painData.length).toFixed(1);
        var maxPain = Math.max.apply(null, painData.map(function(p){return p.level;}));
        var locationCounts = {};
        painData.forEach(function(p){
          if(p.location){
            var locs = Array.isArray(p.location) ? p.location : [p.location];
            locs.forEach(function(l){ locationCounts[l] = (locationCounts[l]||0)+1; });
          }
        });
        var topLocations = Object.entries(locationCounts).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
        html += '痛みの記録が <strong>' + painData.length + '日</strong> あり、平均強度は <strong>' + avgPain + '/10</strong>（最大 ' + maxPain + '）。';
        if(topLocations.length > 0){
          html += '主な部位は「' + topLocations.map(function(t){return t[0]+'（'+t[1]+'日）';}).join('、') + '」。';
        }
        html += '<br>';
      }

      if(Object.keys(medicationCounts).length > 0){
        var sortedMeds = Object.entries(medicationCounts).sort(function(a,b){return b[1]-a[1];});
        var totalMedDays = new Set(painData.filter(function(p){return p.level>0;}).map(function(p){return p.date;})).size;
        html += '服薬記録：';
        sortedMeds.forEach(function(m){
          html += '「' + m[0] + '」' + m[1] + '日、';
        });
        html = html.slice(0,-1) + '。';
      }

      html += '</div>';
      html += '</div>';
    }

    // ⑥ 生活ファクター・お通じの傾向
    if(Object.keys(factorCounts).length > 0 || Object.keys(bowelCounts).length > 0){
      html += '<div class="ds-section">';
      html += '<div class="ds-section-title">📋 生活ファクター・お通じ</div>';
      html += '<div class="ds-narrative">';

      if(Object.keys(factorCounts).length > 0){
        var sortedFactors = Object.entries(factorCounts).sort(function(a,b){return b[1]-a[1];});
        html += '記録された生活ファクター：';
        sortedFactors.slice(0,5).forEach(function(f){
          html += '「' + f[0] + '」' + f[1] + '日、';
        });
        html = html.slice(0,-1) + '。<br>';
      }

      if(Object.keys(bowelCounts).length > 0){
        var sortedBowel = Object.entries(bowelCounts).sort(function(a,b){return b[1]-a[1];});
        html += 'お通じの傾向：';
        sortedBowel.forEach(function(b){
          html += '「' + b[0] + '」' + b[1] + '日、';
        });
        html = html.slice(0,-1) + '。';
        if(bowelCounts['なし'] && bowelCounts['なし'] >= 5){
          html += '<br>お通じなしの日が多く見られます。';
        }
      }

      html += '</div>';
      html += '</div>';
    }
    // ⑦ 来月のセルフケアヒント
    html += '<div class="ds-section">';
    html += '<div class="ds-section-title">💡 来月のセルフケアヒント</div>';
    html += '<div class="ds-narrative">';
    var hints = [];
    if (temperatures.length < 15) {
      hints.push('基礎体温の記録を増やすと、高温期・低温期のリズムがより明確になります。');
    }
    if (fastingHours.length > 0) {
      var avgF = fastingHours.reduce(function(s, h) { return s + h.value; }, 0) / fastingHours.length;
      if (avgF >= 16) {
        hints.push('ファスティングが安定しています。この習慣を続けましょう。');
      } else {
        hints.push('ファスティングを少し延ばすと、体調の変化が見えやすくなるかもしれません。');
      }
    }
    if (sortedSymptoms.length > 0 && cycleStatuses.length > 0) {
      hints.push('生理前後の症状に注目して記録すると、周期ごとのパターンが見つかりやすくなります。');
    }
    if (totalDays < 20) {
      hints.push('記録日数を増やすと、より正確なパターンが見えてきます。毎日1〜2分の記録を習慣にしてみましょう。');
    }
        if(energyLevels.length > 0){
      var lowEDays = energyLevels.filter(function(e){return e<=2;}).length;
      if(lowEDays >= 5) hints.push('低エネルギーの日が目立ちます。睡眠時間や生活ファクターとの関連を確認してみましょう。');
    }
    if(sleepData.length > 0){
      var shortSleep = sleepData.filter(function(s){return s.hours && s.hours<6;}).length;
      if(shortSleep >= 5) hints.push('睡眠時間が6時間未満の日が多いようです。就寝時間を少し早めることを試してみましょう。');
    }
    if(smiScores.length > 0){
      var highSMI = smiScores.filter(function(s){return s>50;}).length;
      if(highSMI >= 3) hints.push('更年期症状が強めに出ている日があります。この記録を持って専門医に相談されることも検討してみてください。');
    }
    if (hints.length === 0) {
      hints.push('今月の記録は充実しています。来月も同じペースで続けると、長期的なパターンが見えてきます。');
    }
    hints.forEach(function(h) {
      html += '・' + h + '<br>';
    });
    html += '</div>';
    html += '</div>';

    // ⑧ PDF保存への案内
    html += '<div style="margin-top:20px;padding:14px;background:var(--warm-light);border-radius:12px;font-size:12px;color:var(--ink-light);line-height:1.7;text-align:center;">';
    html += '📄 このサマリーをPDFで保存して、婦人科に持参することもできます。';
    html += '</div>';

    body.innerHTML = html;

  } catch (err) {
    console.error('Body summary error:', err);
    body.innerHTML = '<div class="ds-empty">データの読み込みに失敗しました。<br>もう一度お試しください。</div>';
  }
}
function downloadDoctorPDF(){
  var btn = event.target;
  var original = btn.textContent;
  btn.textContent = 'PDF生成中…';
  btn.style.pointerEvents = 'none';

  try {
    if(!window.jspdf){
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = function(){ _generateDoctorPDF(btn, original); };
      document.head.appendChild(script);
    } else {
      _generateDoctorPDF(btn, original);
    }
  } catch(e){
    console.error('Doctor PDF error:', e);
    btn.textContent = '生成に失敗しました';
    setTimeout(function(){ btn.textContent = original; btn.style.pointerEvents = ''; }, 2000);
  }
}

function _generateDoctorPDF(btn, original){
  var body = document.getElementById('doctorSummaryBody');
  if(!body){ btn.textContent = original; btn.style.pointerEvents = ''; return; }

  var { jsPDF } = window.jspdf;
  var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var pageW = doc.internal.pageSize.getWidth();
  var margin = 15;
  var maxW = pageW - margin * 2;
  var y = 20;

  // フォント設定
  doc.setFont('Helvetica');

  // タイトル
  doc.setFontSize(16);
  doc.setTextColor(44,36,32);
  doc.text('ippo からだサマリー（受診用）', margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(154,136,128);
  var today = new Date();
  doc.text('生成日: ' + today.getFullYear() + '/' + (today.getMonth()+1) + '/' + today.getDate(), margin, y);
  y += 4;

  doc.setDrawColor(232,221,216);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // セクションを取得して描画
  var sections = body.querySelectorAll('.ds-section');
  doc.setFontSize(10);

  sections.forEach(function(section){
    var title = section.querySelector('.ds-section-title');
    var narrative = section.querySelector('.ds-narrative');

    if(y > 265){ doc.addPage(); y = 20; }

    if(title){
      doc.setFontSize(12);
      doc.setTextColor(44,36,32);
      var titleText = title.textContent.replace(/[^\x00-\x7F]/g, function(c){ return c; });
      doc.text(titleText, margin, y);
      y += 7;
    }

    if(narrative){
      doc.setFontSize(9);
      doc.setTextColor(90,74,68);
      var text = narrative.innerText || narrative.textContent;
      var lines = doc.splitTextToSize(text, maxW);
      lines.forEach(function(line){
        if(y > 275){ doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 4.5;
      });
      y += 4;
    }
  });

  // フッター
  if(y > 265){ doc.addPage(); y = 20; }
  y += 8;
  doc.setFontSize(7);
  doc.setTextColor(180,170,165);
  doc.text('※ このレポートはippoアプリのセルフチェック記録に基づく参考情報です。医学的な診断ではありません。', margin, y);
  y += 4;
  doc.text('https://www.ippo-app.com', margin, y);

  // ダウンロード
  var monthLabel = (today.getMonth()+1) + '月';
  doc.save('ippo-doctor-summary-' + monthLabel + '.pdf');

  btn.textContent = 'ダウンロード完了 ✓';
  btn.style.background = '#8aab96';
  setTimeout(function(){
    btn.textContent = original;
    btn.style.background = '';
    btn.style.pointerEvents = '';
  }, 2000);
}
  function showExportMenu(){
  var overlay = document.createElement('div');
  overlay.id = 'export-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:flex-end;justify-content:center;';
  
  var sheet = document.createElement('div');
  sheet.style.cssText = 'background:white;border-radius:20px 20px 0 0;padding:24px;width:100%;max-width:400px;';
  
  sheet.innerHTML = '<div style="font-size:16px;font-weight:600;text-align:center;margin-bottom:20px;">エクスポート形式を選択</div>'
    + '<div style="display:flex;flex-direction:column;gap:10px;">'
    + '<button onclick="exportCSV();document.getElementById(\'export-overlay\').remove();" style="padding:16px;background:#e8f4ec;border:none;border-radius:14px;font-size:14px;color:#2d6a3f;cursor:pointer;text-align:left;">'
    + '<div style="font-weight:600;">📊 CSV形式</div>'
    + '<div style="font-size:12px;margin-top:4px;color:#666;">Excel・スプレッドシートで開ける表形式。受診時の資料に最適。</div>'
    + '</button>'
    + '<button onclick="exportJSON();document.getElementById(\'export-overlay\').remove();" style="padding:16px;background:#f0ebe6;border:none;border-radius:14px;font-size:14px;color:var(--ink);cursor:pointer;text-align:left;">'
    + '<div style="font-weight:600;">💾 JSON形式</div>'
    + '<div style="font-size:12px;margin-top:4px;color:#666;">全データのバックアップ。別端末への移行や復元用。</div>'
    + '</button>'
    + '</div>'
    + '<button onclick="document.getElementById(\'export-overlay\').remove();" style="width:100%;margin-top:12px;padding:14px;background:none;border:1px solid #ddd;border-radius:14px;font-size:13px;color:#888;cursor:pointer;">キャンセル</button>';
  
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  // EL-5: 動的生成 overlay は once:true で残留リスナーを防止
  overlay.addEventListener('click', function(e){ if(e.target===overlay) overlay.remove(); }, { once: true });
}

function exportJSON(){
  var d = JSON.stringify(state, null, 2);
  var b = new Blob([d], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = 'ippo-backup-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== CSVエクスポート =====
function exportCSV(){
  if(!state.records || state.records.length === 0){
    showAlertModal('エクスポートする記録がありません。');
    return;
  }

  // ヘッダー定義
  var headers = [
    '日付',
    '基礎体温',
    'エネルギー',
    '睡眠_就寝',
    '睡眠_起床',
    '睡眠時間',
    '睡眠の質',
    'ウェルネススコア',
    'SMIスコア',
    '生理周期',
    '痛みレベル',
    '痛み部位',
    '痛みタイプ',
    '症状',
    '服薬',
    '経血_塊',
    '経血_色',
    'お通じ',
    '生活ファクター',
    '食事メモ',
    '食事回数',
    '最初の食事',
    '最後の食事',
    'ファスティング時間',
    '疾患チェック',
    '疾患',
    'メモ'
  ];

  var rows = [headers.join(',')];

  // 日付順にソート
  var sorted = state.records.slice().sort(function(a,b){
    return new Date(a.date) - new Date(b.date);
  });

  sorted.forEach(function(r){
    var row = [
      r.date || '',
      r.temperature || '',
      r.energy || '',
      r.sleepBed || '',
      r.sleepWake || '',
      r.sleepHours || '',
      r.sleepQuality || '',
      r.wellnessScore !== undefined ? r.wellnessScore : '',
      r.smiScore !== undefined ? r.smiScore : '',
      r.menstrualCycle || '',
      r.painLevel || '',
      csvSafe(Array.isArray(r.painLocation) ? r.painLocation.join('・') : (r.painLocation || '')),
      csvSafe(Array.isArray(r.painType) ? r.painType.join('・') : (r.painType || '')),
      csvSafe((r.symptoms || []).join('・')),
      csvSafe((r.medication || []).join('・')),
      csvSafe((r.bloodClot || []).join('・')),
      csvSafe((r.bloodColor || []).join('・')),
      r.bowel || '',
      csvSafe((r.factors || []).join('・')),
      csvSafe(r.mealFree || ''),
      r.mealCount || '',
      r.firstTime || '',
      r.lastTime || '',
      r.fastingHours || '',
      csvSafe(formatDiseaseCheck(r.diseaseCheck)),
      csvSafe((r.diseases || []).join('・')),
      csvSafe(r.note || '')
    ];
    rows.push(row.join(','));
  });

  var csvContent = '\uFEFF' + rows.join('\n'); // BOM付きUTF-8
  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var today = new Date();
  a.download = 'ippo-records-' + today.getFullYear() + (today.getMonth()+1+'').padStart(2,'0') + (today.getDate()+'').padStart(2,'0') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvSafe(str){
  if(!str) return '';
  str = String(str);
  if(str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1){
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatDiseaseCheck(dc){
  if(!dc || typeof dc !== 'object') return '';
  var parts = [];
  Object.keys(dc).forEach(function(key){
    parts.push(key + ':' + dc[key]);
  });
  return parts.join('／');
}


// テキストコピー機能
function copyDoctorSummary() {
  const body = document.getElementById('doctorSummaryBody');
  let text = '【ippo 体調サマリー】\n';
  text += '生成日: ' + new Date().toLocaleDateString('ja-JP') + '\n\n';

  const sections = body.querySelectorAll('.ds-section');
  sections.forEach(section => {
    const title = section.querySelector('.ds-section-title');
    if (title) text += '■ ' + title.textContent + '\n';

    const rows = section.querySelectorAll('.ds-row');
    rows.forEach(row => {
      const label = row.querySelector('.ds-row-label');
      const value = row.querySelector('.ds-row-value');
      if (label && value) text += '  ' + label.textContent + ': ' + value.textContent + '\n';
    });

    const notes = section.querySelectorAll('.ds-note-item');
    notes.forEach(note => {
      const date = note.querySelector('.ds-note-date');
      const noteText = note.querySelector('.ds-note-text');
      if (date && noteText) text += '  ' + date.textContent + ' — ' + noteText.textContent + '\n';
    });

    const meals = section.querySelectorAll('.ds-meal-day');
    meals.forEach(meal => {
      const date = meal.querySelector('.ds-meal-date');
      const items = meal.querySelector('.ds-meal-items');
      if (date) text += '  ' + date.textContent + '\n';
      if (items) text += '  ' + items.textContent.replace(/<br>/g, ' / ') + '\n';
    });

    text += '\n';
  });

  text += '※ このサマリーはippoアプリの記録データを整理したものです。医学的診断ではありません。';

  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.ds-btn.primary');
    const original = btn.textContent;
    btn.textContent = 'コピーしました ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 2000);
  }).catch(() => {
    // フォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

  // ===== MONTHLY REPORT (月次レポート) =====

var _mrOverlayApi = null;

function _getMrOverlay() {
  if (!_mrOverlayApi) {
    _mrOverlayApi = window.createProOverlay({
      id: 'mr-pro-overlay',
      ariaLabel: '月次レポート',
      title: '月次レポート',
      subtitle: '月ごとの体調データを可視化',
      footer: [
        { id: 'mr-close-btn', label: '閉じる', cls: 'pob-btn pob-btn-secondary' },
        { id: 'mr-pdf-btn', label: 'PDF ダウンロード', cls: 'pob-btn pob-btn-primary' },
      ],
      onClose: closeMonthlyReport,
    });
    _mrOverlayApi.body.innerHTML =
      '<div class="mr-month-selector">' +
        '<button class="mr-month-btn" onclick="changeReportMonth(-1)">←</button>' +
        '<div class="mr-month-label" id="mrMonthLabel"></div>' +
        '<button class="mr-month-btn" onclick="changeReportMonth(1)">→</button>' +
      '</div>' +
      '<div id="monthlyReportBody"></div>';
    _mrOverlayApi.getButton('mr-close-btn').addEventListener('click', closeMonthlyReport);
    _mrOverlayApi.getButton('mr-pdf-btn').addEventListener('click', downloadReportPDF);
  }
  return _mrOverlayApi;
}

let reportYear = new Date().getFullYear();
let reportMonth = new Date().getMonth(); // 0-indexed

function openMonthlyReport() {
  reportYear = new Date().getFullYear();
  reportMonth = new Date().getMonth();
  _getMrOverlay().open();
  updateMonthLabel();
  generateMonthlyReport();
}

function closeMonthlyReport() {
  if (_mrOverlayApi) _mrOverlayApi.close();
}

function changeReportMonth(delta) {
  reportMonth += delta;
  if (reportMonth > 11) { reportMonth = 0; reportYear++; }
  if (reportMonth < 0) { reportMonth = 11; reportYear--; }
  updateMonthLabel();
  generateMonthlyReport();
}

function updateMonthLabel() {
  document.getElementById('mrMonthLabel').textContent = reportYear + '年' + (reportMonth + 1) + '月';
}

async function generateMonthlyReport() {
  const token = _mrOverlayApi ? _mrOverlayApi.nextToken() : null;
  const body = document.getElementById('monthlyReportBody');
  body.innerHTML = '<div class="mr-generating">データを読み込み中...</div>';

  try {
    const firstDay = new Date(reportYear, reportMonth, 1);
    const lastDay = new Date(reportYear, reportMonth + 1, 0);
    const fromDate = firstDay.toISOString().split('T')[0];
    const toDate = lastDay.toISOString().split('T')[0];
    const daysInMonth = lastDay.getDate();

    // ローカルから取得
    const records = state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    }).map(function(r) {
      return { record_date: r.record_date || (r.date ? r.date.slice(0, 10) : ''), data: r };
    });

    if (records.length === 0) {
      body.innerHTML = '<div class="ds-empty">この月の記録はありません。</div>';
      return;
    }
    
    // 集計
    const totalDays = records.length;
    const emotionCounts = {};
    const symptomCounts = {};
    const temperatures = [];
    const fastingHours = [];
    let mealRecordDays = 0;
    let noteCount = 0;
    const scores = [];

    records.forEach(r => {
      const d = r.data || {};
      if (d.emotion) emotionCounts[d.emotion] = (emotionCounts[d.emotion] || 0) + 1;
      if (d.symptoms && d.symptoms.length > 0) {
        d.symptoms.forEach(s => { symptomCounts[s] = (symptomCounts[s] || 0) + 1; });
      }
      if (d.temperature) temperatures.push(parseFloat(d.temperature));
      if (d.meals && (d.meals.morning || d.meals.lunch || d.meals.dinner || d.meals.free || d.mealCount)) mealRecordDays++;
      if (d.note && d.note.trim()) noteCount++;
      if (d.score) scores.push(Number(d.score));
      if (d.firstMealTime && d.lastMealTime) {
        const first = d.firstMealTime.split(':').map(Number);
        const last = d.lastMealTime.split(':').map(Number);
        const eating = (last[0] * 60 + last[1]) - (first[0] * 60 + first[1]);
        if (eating > 0) fastingHours.push(24 - (eating / 60));
      }
    });

    let html = '';

    // プレビューカード
    html += '<div class="mr-preview">';
    html += '<div class="mr-preview-title">ippo 月次レポート</div>';
    html += '<div class="mr-preview-period">' + fromDate + ' 〜 ' + toDate + '</div>';

    // 統計グリッド
    html += '<div class="mr-stat-grid">';
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + totalDays + '</div><div class="mr-stat-label">記録日数 / ' + daysInMonth + '日</div></div>';
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + Math.round(totalDays / daysInMonth * 100) + '%</div><div class="mr-stat-label">記録率</div></div>';

    if (temperatures.length > 0) {
      const avgTemp = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(2);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgTemp + '</div><div class="mr-stat-label">平均基礎体温 ℃</div></div>';
    }
    if (fastingHours.length > 0) {
      const avgFast = (fastingHours.reduce((a, b) => a + b, 0) / fastingHours.length).toFixed(1);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgFast + '</div><div class="mr-stat-label">平均ファスティング h</div></div>';
    }
    if (scores.length > 0) {
      const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
      html += '<div class="mr-stat-box"><div class="mr-stat-num">' + avgScore + '</div><div class="mr-stat-label">平均体調スコア</div></div>';
    }
    html += '<div class="mr-stat-box"><div class="mr-stat-num">' + mealRecordDays + '</div><div class="mr-stat-label">食事記録日</div></div>';
    html += '</div>';

       // ファスティングの達成率
    if (fastingHours.length > 0) {
      var longFast = fastingHours.filter(function(h){ return h >= 16; }).length;
      var shortFast = fastingHours.filter(function(h){ return h >= 12 && h < 16; }).length;
      var longPct = Math.round(longFast / fastingHours.length * 100);
      var shortPct = Math.round(shortFast / fastingHours.length * 100);
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">ファスティング 達成率</div>';
      html += '<div class="mr-bar-chart">';
      html += '<div class="mr-bar-row"><div class="mr-bar-label">16h+</div><div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + longPct + '%;background:var(--rose);"></div></div><div class="mr-bar-count">' + longFast + '日 (' + longPct + '%)</div></div>';
      html += '<div class="mr-bar-row"><div class="mr-bar-label">12-16h</div><div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + shortPct + '%;background:#f0c9a6;"></div></div><div class="mr-bar-count">' + shortFast + '日 (' + shortPct + '%)</div></div>';
      html += '</div></div>';
    }

    // 症状の週別推移
    if (Object.keys(symptomCounts).length > 0) {
      var weekSymptoms = [{},{},{},{}];
      records.forEach(function(r){
        var day = new Date(r.date).getDate();
        var weekIdx = Math.min(3, Math.floor((day - 1) / 7));
        (r.symptoms || []).forEach(function(s){
          weekSymptoms[weekIdx][s] = (weekSymptoms[weekIdx][s] || 0) + 1;
        });
      });
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">症状の週別推移</div>';
      html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;font-size:11px;">';
      ['第1週','第2週','第3週','第4週'].forEach(function(label, idx){
        var ws = weekSymptoms[idx];
        var top = Object.entries(ws).sort(function(a,b){ return b[1]-a[1]; }).slice(0,2);
        html += '<div style="background:var(--white);border-radius:10px;padding:10px;text-align:center;border:1px solid #f0ebe6;">';
        html += '<div style="font-weight:600;color:var(--ink);margin-bottom:4px;">' + label + '</div>';
        if(top.length > 0){
          top.forEach(function(t){ html += '<div style="color:var(--ink-light);">' + t[0] + ' ' + t[1] + '日</div>'; });
        } else {
          html += '<div style="color:var(--ink-light);">記録なし</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 感情棒グラフ
    if (Object.keys(emotionCounts).length > 0) {
      const maxEmotion = Math.max(...Object.values(emotionCounts));
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">感情・気分の傾向</div>';
      html += '<div class="mr-bar-chart">';
      Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
        const pct = Math.round(count / maxEmotion * 100);
        html += '<div class="mr-bar-row">';
        html += '<div class="mr-bar-label">' + key + '</div>';
        html += '<div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="mr-bar-count">' + count + '日</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // 症状棒グラフ
    if (Object.keys(symptomCounts).length > 0) {
      const maxSymptom = Math.max(...Object.values(symptomCounts));
      html += '<div class="mr-chart-section">';
      html += '<div class="mr-chart-title">記録された症状</div>';
      html += '<div class="mr-bar-chart">';
      Object.entries(symptomCounts).sort((a, b) => b[1] - a[1]).forEach(([key, count]) => {
        const pct = Math.round(count / maxSymptom * 100);
        html += '<div class="mr-bar-row">';
        html += '<div class="mr-bar-label">' + key + '</div>';
        html += '<div class="mr-bar-track"><div class="mr-bar-fill" style="width:' + pct + '%"></div></div>';
        html += '<div class="mr-bar-count">' + count + '日</div>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    // サマリーテキスト
    html += '<div class="mr-summary-text">';
    html += reportYear + '年' + (reportMonth + 1) + '月は、' + daysInMonth + '日中 ' + totalDays + '日の記録がありました。';
    if (temperatures.length > 0) {
      const avgT = (temperatures.reduce((a, b) => a + b, 0) / temperatures.length).toFixed(2);
      html += '基礎体温の平均は ' + avgT + '℃ でした。';
    }
    if (fastingHours.length > 0) {
      const avgF = (fastingHours.reduce((a, b) => a + b, 0) / fastingHours.length).toFixed(1);
      html += 'ファスティングは平均 ' + avgF + ' 時間を維持しました。';
    }
    html += '</div>';

    html += '</div>'; // mr-preview 閉じ

    if (token !== null && _mrOverlayApi.isStale(token)) return;
    body.innerHTML = html;

  } catch (err) {
    console.error('Monthly report error:', err);
    if (token === null || !_mrOverlayApi.isStale(token)) {
      body.innerHTML = '<div class="ds-empty">データの読み込みに失敗しました。</div>';
    }
  }
}

// PDF ダウンロード
async function downloadReportPDF() {
  const btn = _mrOverlayApi ? _mrOverlayApi.getButton('mr-pdf-btn') : null;
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = 'PDF 生成中...';
  btn.style.pointerEvents = 'none';

  try {
    // jsPDF を動的に読み込み
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // フォント設定（日本語対応のためシンプルなテキストベース）
    doc.setFontSize(18);
    doc.setTextColor(44, 36, 32);
    doc.text('ippo Monthly Report', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(154, 136, 128);
    const monthLabel = reportYear + '/' + String(reportMonth + 1).padStart(2, '0');
    doc.text(monthLabel, 20, 33);

    // 区切り線
    doc.setDrawColor(200, 180, 170);
    doc.line(20, 37, 190, 37);

    // レポート内容をテキストとして取得
    const preview = document.querySelector('.mr-preview');
    if (!preview) throw new Error('No report data');

    let y = 45;
    const lineHeight = 6;

    // 統計ボックスからデータ取得
    const statBoxes = preview.querySelectorAll('.mr-stat-box');
    if (statBoxes.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(44, 36, 32);
      doc.text('Summary', 20, y);
      y += 8;

      doc.setFontSize(10);
      statBoxes.forEach(box => {
        const num = box.querySelector('.mr-stat-num')?.textContent || '';
        const label = box.querySelector('.mr-stat-label')?.textContent || '';
        doc.setTextColor(44, 36, 32);
        doc.text(num, 25, y);
        doc.setTextColor(154, 136, 128);
        doc.text(' — ' + label, 25 + doc.getTextWidth(num) + 2, y);
        y += lineHeight;
      });
      y += 4;
    }

    // 棒グラフデータ
    const chartSections = preview.querySelectorAll('.mr-chart-section');
    chartSections.forEach(section => {
      const title = section.querySelector('.mr-chart-title')?.textContent || '';
      doc.setFontSize(12);
      doc.setTextColor(44, 36, 32);
      doc.text(title, 20, y);
      y += 8;

      const rows = section.querySelectorAll('.mr-bar-row');
      doc.setFontSize(9);
      rows.forEach(row => {
        const label = row.querySelector('.mr-bar-label')?.textContent || '';
        const count = row.querySelector('.mr-bar-count')?.textContent || '';
        doc.setTextColor(90, 74, 68);
        doc.text(label + ': ' + count, 25, y);
        y += 5;
      });
      y += 4;

      // ページ溢れ防止
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    // サマリーテキスト
    const summaryEl = preview.querySelector('.mr-summary-text');
    if (summaryEl) {
      y += 2;
      doc.setFontSize(10);
      doc.setTextColor(90, 74, 68);
      const summaryLines = doc.splitTextToSize(summaryEl.textContent, 165);
      doc.text(summaryLines, 20, y);
      y += summaryLines.length * 5 + 8;
    }

    // 免責
    doc.setFontSize(7);
    doc.setTextColor(180, 170, 165);
    doc.text('This report is generated by ippo. It is not a medical diagnosis.', 20, 285);
    doc.text('https://www.ippo-app.com', 20, 289);

    // ダウンロード
    doc.save('ippo-report-' + monthLabel + '.pdf');

    btn.textContent = 'ダウンロード完了 ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.pointerEvents = '';
    }, 2000);

  } catch (err) {
    console.error('PDF generation error:', err);
    btn.textContent = 'PDF生成に失敗しました';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.pointerEvents = '';
    }, 2000);
  }
}

  // ===== AI PATTERN ANALYSIS (AIパターン解析) =====

// AI analysis uses Edge Function (ai-analyze) — no client-side API key needed

var _aiOverlayApi = null;

function _getAiOverlay() {
  if (!_aiOverlayApi) {
    _aiOverlayApi = window.createProOverlay({
      id: 'ai-pro-overlay',
      ariaLabel: 'AIパターン解析',
      title: 'AIパターン解析',
      subtitle: 'あなたの記録データからパターンを読み解きます',
      footer: [
        { id: 'ai-close-btn', label: '閉じる', cls: 'pob-btn pob-btn-secondary' },
        { id: 'ai-copy-btn', label: 'テキストをコピー', cls: 'pob-btn pob-btn-primary' },
      ],
      onClose: closeAIAnalysis,
    });
    _aiOverlayApi.getButton('ai-close-btn').addEventListener('click', closeAIAnalysis);
    _aiOverlayApi.getButton('ai-copy-btn').addEventListener('click', copyAIAnalysis);
  }
  return _aiOverlayApi;
}

function openAIAnalysis() {
  _getAiOverlay().open();
  runAIAnalysis();
}

function closeAIAnalysis() {
  if (_aiOverlayApi) _aiOverlayApi.close();
}

async function runAIAnalysis() {
  const api = _getAiOverlay();
  const token = api.nextToken();
  const body = api.body;
  body.innerHTML = '<div class="ai-loading"><div class="ai-loading-icon">✨</div><div class="ai-loading-text">データを収集しています...</div></div>';

  try {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromDate = ninetyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const records = state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    });

    if (records.length < 3) {
      body.innerHTML = '<div class="ai-error">パターン解析には最低3日分の記録が必要です。<br>記録を続けてから、もう一度お試しください。</div>';
      return;
    }

    body.querySelector('.ai-loading-text').textContent = 'パターンを解析中...';

    // PR-E1: Prediction / Cluster DB→State
    if (window.loadProfileCache && window.supabase && window.supabaseUserId) {
      try {
        const cache = await window.loadProfileCache(window.supabase, window.supabaseUserId);
        state.predictionCache = cache.predictionCache;
        state.clusterId       = cache.clusterId;
        state.clusterMeta     = cache.clusterMeta;
      } catch (_e) {
        // キャッシュ取得失敗時は従来分析継続
      }
    }

    // 新経路: buildAIPrompt → features
    const p        = window.buildAIPrompt(state.records, state);
    const features = p.features;

    // 解析モードをセッション状態で事前判定（表示用）
    const _sc = window.supabase;
    const _sd = _sc ? (await _sc.auth.getSession()).data?.session : null;
    const _isAI = !!_sd;
    const modeBadge = _isAI
      ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#e8f4ec;color:#4a7c5c;font-size:11px;padding:3px 10px;border-radius:8px;font-weight:600;">✨ AI解析モード</span>'
      : '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(200,180,170,0.2);color:var(--ink-light);font-size:11px;padding:3px 10px;border-radius:8px;font-weight:600;">🏠 ローカル解析モード</span>';

    if (api.isStale(token)) return;

    let dataHtml = '<div class="ai-data-summary">';
    dataHtml += '<div class="ai-data-title" style="display:flex;justify-content:space-between;align-items:center;">解析対象データ ' + modeBadge + '</div>';
    dataHtml += '<div class="ai-data-row"><span class="ai-data-label">期間</span><span class="ai-data-value">' + fromDate + ' 〜 ' + toDate + '</span></div>';
    dataHtml += '<div class="ai-data-row"><span class="ai-data-label">記録件数</span><span class="ai-data-value">' + features.sampleSize + ' 件</span></div>';
    if (features.topSymptoms && features.topSymptoms.length) {
      dataHtml += '<div class="ai-data-row"><span class="ai-data-label">主な症状</span><span class="ai-data-value">' + features.topSymptoms.slice(0, 2).join('・') + '</span></div>';
    }
    if (features.flareTrigger) {
      dataHtml += '<div class="ai-data-row"><span class="ai-data-label">主なトリガー</span><span class="ai-data-value">' + features.flareTrigger + '</span></div>';
    }
    if (!_isAI) dataHtml += '<div class="ai-data-row" style="margin-top:6px;"><span style="font-size:11px;color:var(--ink-light);">ℹ️ ログインするとAIによる詳細解析が利用できます</span></div>';
    dataHtml += '</div>';

    body.innerHTML = dataHtml + '<div class="ai-loading"><div class="ai-loading-icon">✨</div><div class="ai-loading-text">パターンを読み解いています...</div></div>';

    const aiComment = await callAIAPI({ features: features, systemPrompt: p.systemPrompt, userPrompt: p.userPrompt });
    if (api.isStale(token)) return;

    // 結果を表示
    let resultHtml = dataHtml;
    resultHtml += '<div class="ai-result">';
    resultHtml += '<div class="ai-result-header">';
    resultHtml += '<div class="ai-result-icon">✨</div>';
    resultHtml += '<div class="ai-result-label">パターン解析</div>';
    resultHtml += '<div class="ai-result-date">' + new Date().toLocaleDateString('ja-JP') + '</div>';
    resultHtml += '</div>';
    resultHtml += '<div class="ai-result-text">' + aiComment + '</div>';
    resultHtml += '</div>';

    body.innerHTML = resultHtml;

  } catch (err) {
    console.error('AI analysis error:', err);
    if (!api.isStale(token)) {
      body.innerHTML = '<div class="ai-error">解析中にエラーが発生しました。<br><br>' + (err.message || '') + '<br><br><button class="ai-retry-btn" onclick="runAIAnalysis()">もう一度試す</button></div>';
    }
  }
}


// PR-C4: features 経路のみ。旧 records/analysisType 分岐・generateLocalAnalysis 削除済み。
async function callAIAPI(apiPayload) {
  var supabaseClient = window.supabase;
  var sessionData = supabaseClient ? (await supabaseClient.auth.getSession()).data?.session : null;

  if (!sessionData) {
    return 'ログインするとAIによる詳細解析が利用できます。記録が蓄積されています。';
  }

  var supabaseUrl = window.SUPABASE_URL || 'https://ekaoojdqhkpeudujfsdh.supabase.co';

  var resp = await fetch(supabaseUrl + '/functions/v1/ai-analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionData.access_token,
    },
    body: JSON.stringify(apiPayload),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error('解析リクエストが多すぎます。1分後にもう一度お試しください。');
    const errData = await resp.json().catch(() => ({}));
    throw new Error('API error: ' + (errData.error || resp.status));
  }

  var data = await resp.json();
  var content = data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? null;
  if (!content) throw new Error('AIの応答を取得できませんでした。');
  return content;
}

function copyAIAnalysis() {
  const body = _aiOverlayApi ? _aiOverlayApi.body : null;
  const resultEl = body ? body.querySelector('.ai-result-text') : null;
  if (!resultEl) return;

  let text = '【ippo AIパターン解析】\n';
  text += '解析日: ' + new Date().toLocaleDateString('ja-JP') + '\n\n';
  text += resultEl.textContent;
  text += '\n\n※ このコメントはippoアプリの記録データに基づく参考情報です。医学的診断ではありません。';

  navigator.clipboard.writeText(text).then(() => {
    const btn = _aiOverlayApi ? _aiOverlayApi.getButton('ai-copy-btn') : null;
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'コピーしました ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 2000);
  });
}

  // ===== DEVICE SYNC (デバイス間同期) =====

function openSyncModal() {
  document.getElementById('syncOverlay').classList.add('active');
  renderSyncUI();
}

function closeSyncModal() {
  document.getElementById('syncOverlay').classList.remove('active');
}

document.getElementById('syncOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeSyncModal();
});

async function renderSyncUI() {
  const body = document.getElementById('syncBody');
  
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (session && session.user) {
      // ログイン済み
      const email = session.user.email;
      document.getElementById('syncStatusBrief').textContent = email;
      
      body.innerHTML = `
        <div class="sync-status">
          <div class="sync-status-icon">✅</div>
          <div class="sync-status-text">同期が有効です</div>
          <div class="sync-status-sub">このアカウントでログインした端末間でデータが共有されます</div>
          <div class="sync-email-display">${email}</div>
        </div>
        <div class="sync-actions">
          <button class="sync-action-btn primary" onclick="syncNow()">今すぐ同期</button>
          <button class="sync-action-btn danger" onclick="logoutSync()">ログアウト</button>
        </div>
      `;
    } else {
      // 未ログイン
      document.getElementById('syncStatusBrief').textContent = '未ログイン';
      showLoginForm();
    }
  } catch (err) {
    console.error('Sync UI error:', err);
    showLoginForm();
  }
}

function showLoginForm() {
  const body = document.getElementById('syncBody');
  body.innerHTML = `
    <div class="sync-status">
      <div class="sync-status-icon">🔄</div>
      <div class="sync-status-text">データを同期する</div>
      <div class="sync-status-sub">メールアドレスでログインすると、<br>どの端末からでも同じ記録にアクセスできます</div>
    </div>
    <div style="background:#FBEAF0;border-radius:10px;padding:10px 14px;margin:12px 0 4px;font-size:11px;color:#72243E;line-height:1.7;">同期データはSupabaseで暗号化管理されます。パスワードは暗号化されており、ippoスタッフも閲覧できません。</div>
    <div id="syncMessage" class="sync-message"></div>
    <div class="sync-form" id="syncLoginForm">
      <div class="sync-form-title" id="syncFormTitle">ログイン</div>
      <input type="email" class="sync-input" id="syncEmail" placeholder="メールアドレス" autocomplete="email">
      <input type="password" class="sync-input" id="syncPassword" placeholder="パスワード（6文字以上）" autocomplete="current-password">
      <button class="sync-form-btn" id="syncSubmitBtn" onclick="submitSync()">ログイン</button>
      <button class="sync-form-toggle" id="syncToggleBtn" onclick="toggleSyncMode()">アカウントをお持ちでない方 → 新規登録</button>
    </div>
  `;
}

var syncMode = 'login'; // 'login' or 'signup'  ※ TDZ回避のためvarを使用

function toggleSyncMode() {
  syncMode = syncMode === 'login' ? 'signup' : 'login';
  const title = document.getElementById('syncFormTitle');
  const btn = document.getElementById('syncSubmitBtn');
  const toggle = document.getElementById('syncToggleBtn');
  
  if (syncMode === 'signup') {
    title.textContent = '新規登録';
    btn.textContent = '登録する';
    toggle.textContent = 'すでにアカウントをお持ちの方 → ログイン';
  } else {
    title.textContent = 'ログイン';
    btn.textContent = 'ログイン';
    toggle.textContent = 'アカウントをお持ちでない方 → 新規登録';
  }
  
  hideMessage();
}

function showMessage(text, type) {
  const msg = document.getElementById('syncMessage');
  if (!msg) return;
  msg.className = 'sync-message ' + type;
  msg.textContent = text;
}

function hideMessage() {
  const msg = document.getElementById('syncMessage');
  if (msg) msg.className = 'sync-message';
}

async function submitSync() {
  const email = document.getElementById('syncEmail').value.trim();
  const password = document.getElementById('syncPassword').value;
  const btn = document.getElementById('syncSubmitBtn');
  
  if (!email || !password) {
    showMessage('メールアドレスとパスワードを入力してください', 'error');
    return;
  }
  if (password.length < 6) {
    showMessage('パスワードは6文字以上で入力してください', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = '処理中...';
  hideMessage();

  try {
    let result;
    
    if (syncMode === 'signup') {
      // 新規登録
      result = await supabase.auth.signUp({ email, password });
      
      if (result.error) throw result.error;
      
      if (result.data.user && !result.data.session) {
        // メール確認が必要
        showMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。', 'info');
        btn.disabled = false;
        btn.textContent = '登録する';
        return;
      }
    } else {
      // ログイン
      result = await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
    }

    // ログイン成功 → 既存データをuser_idに紐付け + クラウドからデータ復元
    if (result.data.session) {
      supabaseUserId = result.data.session.user.id;
      localStorage.setItem('ippo_sb_user_id', result.data.session.user.id);
      _notifyAuthReady();
      if (result.data.session.user.id === ADMIN_USER_ID) {
        isPremium = true;
      }
      if (typeof updatePremiumBadges === 'function') updatePremiumBadges();

      await migrateDataToUser(result.data.session.user.id);
      showMessage('ログインしました。データを同期中...', 'success');

      // ★ モーダルを経由したログイン後は明示的にクラウド復元（onAuthStateChangeのガードを回避）
      cloudRestore().then(function(restored) {
        if (restored) {
          // setState 経由で _state を更新しフックで bare state も同期する
          if (typeof window.setState === 'function') {
            window.setState(JSON.parse(localStorage.getItem('ippo_state') || '{}'));
          } else {
            state = JSON.parse(localStorage.getItem('ippo_state') || '{}');
          }
          if (typeof updateStats === 'function') updateStats();
          if (typeof updateHistory === 'function') updateHistory();
          if (typeof buildCalendar === 'function') buildCalendar();
          if (typeof updateDiseaseSettingDisplay === 'function') updateDiseaseSettingDisplay();
          if (typeof updateDiseaseQuestions === 'function') updateDiseaseQuestions();
          if (typeof reorderRecordSections === 'function') reorderRecordSections();
          if (typeof updateFastingWidgetPhase === 'function') updateFastingWidgetPhase();
          showMessage('同期完了！過去のデータを復元しました ✓', 'success');
        } else {
          showMessage('ログインしました。データの同期が有効になりました。', 'success');
        }
      }).catch(function(e) {
        console.warn('ログイン後復元エラー:', e);
        showMessage('ログインしました。データの同期が有効になりました。', 'success');
      });

      setTimeout(() => {
        renderSyncUI();
      }, 2000);
    }

  } catch (err) {
    console.error('Auth error:', err);
    let errorMsg = 'エラーが発生しました。';
    if (err.message.includes('Invalid login')) errorMsg = 'メールアドレスまたはパスワードが正しくありません。';
    else if (err.message.includes('already registered')) errorMsg = 'このメールアドレスはすでに登録されています。ログインしてください。';
    else if (err.message.includes('Email not confirmed')) errorMsg = 'メールアドレスの確認が完了していません。確認メールを確認してください。';
    else errorMsg = err.message;
    
    showMessage(errorMsg, 'error');
    btn.disabled = false;
    btn.textContent = syncMode === 'signup' ? '登録する' : 'ログイン';
  }
}

async function migrateDataToUser(userId) {
  try {
    const deviceId = localStorage.getItem('ippo_device_id');
    if (!deviceId) return;

    // records テーブルの device_id のデータに user_id を設定
    await supabase
      .from('records')
      .update({ user_id: userId })
      .eq('device_id', deviceId)
      .is('user_id', null);

    // profiles テーブルも同様
    await supabase
      .from('profiles')
      .update({ user_id: userId })
      .eq('device_id', deviceId)
      .is('user_id', null);

  } catch (err) {
    console.error('Migration error:', err);
  }
}

async function syncNow() {
  const btn = document.querySelector('.sync-action-btn.primary');
  const original = btn.textContent;
  btn.textContent = '同期中...';
  btn.disabled = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');

    const userId = session.user.id;
    const deviceId = localStorage.getItem('ippo_device_id');

    // 現在の端末のデータをuser_idに紐付け
    if (deviceId) {
      await supabase
        .from('records')
        .update({ user_id: userId })
        .eq('device_id', deviceId)
        .is('user_id', null);
    }

    btn.textContent = '同期完了 ✓';
    btn.style.background = '#8aab96';
    if (typeof cloudRestore === 'function') { cloudRestore().catch(function(){}); }

    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error('Sync error:', err);
    btn.textContent = '同期に失敗しました';
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 2000);
  }
}

async function logoutSync() {
  showConfirmModal('ログアウトしますか？<br>この端末のデータは残りますが、他の端末との同期が無効になります。', async function() {
    try {
      await supabase.auth.signOut();
      document.getElementById('syncStatusBrief').textContent = '未ログイン';
      renderSyncUI();
    } catch (err) {
      console.error('Logout error:', err);
    }
  });
}

// ページ読み込み時に同期状態を確認
(async function checkSyncStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const brief = document.getElementById('syncStatusBrief');
    if (brief) {
      brief.textContent = session?.user?.email || '未ログイン';
    }
  } catch(e) {}
})();


// escapeHtml は line 6809 で定義済み（重複削除）




  // ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
window.openDoctorSummary = openDoctorSummary;
window.closeDoctorSummary = closeDoctorSummary;
window.copyDoctorSummary = copyDoctorSummary;
window.openMonthlyReport = openMonthlyReport;
window.closeMonthlyReport = closeMonthlyReport;
window.changeReportMonth = changeReportMonth;
window.downloadReportPDF = downloadReportPDF;
window.openAIAnalysis = openAIAnalysis;
window.closeAIAnalysis = closeAIAnalysis;
window.runAIAnalysis = runAIAnalysis;
window.copyAIAnalysis = copyAIAnalysis;
window.openSyncModal = openSyncModal;
window.closeSyncModal = closeSyncModal;
window.submitSync = submitSync;
window.toggleSyncMode = toggleSyncMode;
window.syncNow = syncNow;
window.logoutSync = logoutSync;
// ===== ADMIN PANEL =====
var ADMIN_USER_ID = '723dba96-caf3-48d6-9fdc-4151071bbc89';

function initAdminPanel(){
  if(supabaseUserId === ADMIN_USER_ID){
    var panel = document.getElementById('admin-panel');
    if(panel) panel.style.display = 'block';
  }
}

function adminSetPremium(value){
  var email = document.getElementById('admin-email').value.trim();
  var result = document.getElementById('admin-result');
  if(!email){
    result.innerHTML = '<span style="color:#c9747a;">メールアドレスまたはuser_idを入力してください</span>';
    return;
  }
  result.innerHTML = '<span style="color:var(--ink-light);">処理中...</span>';

  supabase.auth.getSession().then(function(res){
    var session = res.data.session;
    if(!session){ result.innerHTML = '<span style="color:#c9747a;">ログインが必要です</span>'; return; }

    // まずuser_idとして試す
    supabase.from('profiles').update({ is_premium: value }).eq('user_id', email).select().then(function(r){
      if(r.data && r.data.length > 0){
        result.innerHTML = '<span style="color:#8aab96;">✓ ' + email + ' を Premium ' + (value ? 'ON' : 'OFF') + ' に設定しました</span>';
        document.getElementById('admin-email').value = '';
      } else {
        result.innerHTML = '<span style="color:#c9747a;">ユーザーが見つかりません。user_idを確認してください。</span>';
      }
    });
  });
}

function adminLoadPremiumUsers(){
  var list = document.getElementById('admin-user-list');
  list.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">読み込み中...</div>';

  supabase.from('profiles').select('user_id,name,is_premium,created_at').eq('is_premium', true).then(function(r){
    if(!r.data || r.data.length === 0){
      list.innerHTML = '<div style="font-size:12px;color:var(--ink-light);">プレミアムユーザーはいません</div>';
      return;
    }
    var html = '';
    r.data.forEach(function(u){
      var date = new Date(u.created_at).toLocaleDateString('ja-JP');
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--white);border-radius:10px;margin-bottom:6px;border:1px solid #f0ebe6;">';
      html += '<div><div style="font-size:13px;color:var(--ink);font-weight:500;">' + (u.name || '名前なし') + '</div>';
      html += '<div style="font-size:10px;color:var(--ink-light);">' + u.user_id.substring(0,8) + '... | ' + date + '</div></div>';
      html += '<span style="font-size:10px;background:var(--rose-pale);color:var(--rose);padding:3px 8px;border-radius:8px;">PRO</span>';
      html += '</div>';
    });
    list.innerHTML = html;
  });
}

// EL-2: 匿名/オフライン時の無限稼働を防ぐため最大30秒で打ち切り
// removal condition: auth 確定後に adminCheckInterval が不要になったら削除可。
var _adminCheckCount = 0;
var adminCheckInterval = setInterval(function(){
  _adminCheckCount++;
  if(supabaseUserId){
    clearInterval(adminCheckInterval);
    initAdminPanel();
    // 管理者ログイン確定後にPROバッジを即時更新
    if(typeof updatePremiumBadges === 'function') updatePremiumBadges();
  } else if (_adminCheckCount >= 30) {
    // 30秒経過してもログイン未確定 → 匿名/オフライン確定、インターバル停止
    clearInterval(adminCheckInterval);
  }
}, 1000);



  // ===== PREMIUM LOCK =====
// ★ var に変更: ES モジュール（services/stripe.js）から window.isPremium として参照するため
var isPremium = false;

async function checkPremiumStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
      // Bridge SDK session → inline auth vars (shared localStorage keys)
      var prevInlineId = localStorage.getItem('ippo_sb_user_id');
      if (prevInlineId && prevInlineId !== session.user.id) {
        console.warn('[ippo auth] user-id mismatch: inline=' + prevInlineId + ' sdk=' + session.user.id);
        window.__ippoAuthMismatch = { inlineId: prevInlineId, sdkId: session.user.id, ts: new Date().toISOString() };
      }
      supabaseUserId = session.user.id;
      supabaseToken = session.access_token;
      localStorage.setItem('ippo_sb_user_id', session.user.id);
      _notifyAuthReady();
      // 管理者は自動的にPROアクセス付与
      if (session.user.id === ADMIN_USER_ID) {
        isPremium = true;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('user_id', session.user.id)
          .single();
        isPremium = profile?.is_premium || false;
      }
      // ログイン状態をヘッダーに反映
      var briefEl = document.getElementById('syncStatusBrief');
      if (briefEl) briefEl.textContent = (session.user.id === ADMIN_USER_ID ? '👑 ' : '') + (session.user.email || 'ログイン済み');
    } else {
      // SDK has no session — check if inline auth left a stale token
      var staleToken = localStorage.getItem('ippo_sb_token');
      var staleId    = localStorage.getItem('ippo_sb_user_id');
      if (staleToken && staleId) {
        console.warn('[ippo auth] SDK session is null but stale inline token exists (user_id=' + staleId + '). cloudBackupAll will skip until re-login.');
        window.__ippoAuthMismatch = { inlineId: staleId, sdkId: null, ts: new Date().toISOString() };
      }
      isPremium = false;
      supabaseToken = null;
      var briefEl = document.getElementById('syncStatusBrief');
      if (briefEl) briefEl.textContent = '未ログイン';
      // Phase 2: auth-service へ skipped 通知
      if (window.ippoAuthService && typeof window.ippoAuthService.markAuthSkipped === 'function') {
        window.ippoAuthService.markAuthSkipped('no-session');
      }
    }
  } catch (e) {
    isPremium = false;
  }
  updatePremiumBadges();
  if (typeof checkUpsellNotification === 'function') checkUpsellNotification();
}

function updateSettingsHero() {
  var nameEl = document.getElementById('settings-name-display');
  if (nameEl) nameEl.textContent = state.name || 'ゲスト';

  var badgeEl = document.getElementById('settings-premium-badge-text');
  if (badgeEl) badgeEl.textContent = isAdminOrPremium() ? 'プレミアム会員 ✨' : '無料プラン';

  var upgradeBtn = document.getElementById('settings-upgrade-btn');
  if (upgradeBtn) upgradeBtn.style.display = isAdminOrPremium() ? 'none' : '';

  var countEl = document.getElementById('settings-record-count');
  if (countEl) countEl.textContent = (state.records || []).length;

  var streakEl = document.getElementById('settings-streak');
  if (streakEl) {
    var streak = 0;
    var today = new Date();
    for (var i = 0; i < 365; i++) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var ds = d.toISOString().slice(0, 10);
      var found = (state.records || []).some(function(r) {
        return (r.record_date || (r.date && r.date.slice(0, 10))) === ds;
      });
      if (found) streak++;
      else if (i > 0) break;
    }
    streakEl.textContent = streak;
  }
}

function isAdminOrPremium() {
  return isPremium || (typeof ADMIN_USER_ID !== 'undefined' && supabaseUserId && supabaseUserId === ADMIN_USER_ID);
}
function updatePremiumBadges() {
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('updatePremiumBadges', updatePremiumBadges);
    return;
  }
  var unlocked = isAdminOrPremium();
  document.querySelectorAll('.pf-lock-badge').forEach(badge => {
    badge.style.display = unlocked ? 'none' : 'inline';
  });
  renderProHero();
  updateSettingsHero();
  // インサイトタブが表示中ならプレミアム確定後に相関分析を再描画
  var insightsEl = document.getElementById('screen-insights');
  if (insightsEl && insightsEl.classList.contains('active')) {
    if (typeof updateFoodBodyCorrelation === 'function') updateFoodBodyCorrelation();
    if (typeof updateCycleSymptomCorrelation === 'function') updateCycleSymptomCorrelation();
  }
  if (typeof renderPhaseMap === 'function') renderPhaseMap();
}

function renderProHero() {
  var hero = document.getElementById('pro-hero');
  if (!hero) return;
  if (isAdminOrPremium()) {
    hero.innerHTML =
      '<div style="background:linear-gradient(135deg,var(--plum) 0%,var(--rose) 100%);border-radius:22px;padding:22px 24px;color:white;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:-24px;right:-24px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      + '<div style="font-size:10px;letter-spacing:0.18em;opacity:0.75;margin-bottom:5px;">PREMIUM MEMBER</div>'
      + '<div style="font-family:\'Shippori Mincho\',serif;font-size:20px;font-weight:700;margin-bottom:6px;">プレミアム会員中 ✨</div>'
      + '<div style="font-size:12px;opacity:0.85;line-height:1.6;">すべての分析・レポート機能をご利用いただけます</div>'
      + '</div>';
  } else {
    hero.innerHTML =
      '<div style="background:linear-gradient(135deg,var(--plum) 0%,var(--rose) 100%);border-radius:22px;padding:22px 24px;color:white;position:relative;overflow:hidden;">'
      + '<div style="position:absolute;top:-24px;right:-24px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>'
      + '<div style="font-size:10px;letter-spacing:0.18em;opacity:0.75;margin-bottom:5px;">PREMIUM PLAN</div>'
      + '<div style="font-family:\'Shippori Mincho\',serif;font-size:20px;font-weight:700;margin-bottom:10px;">からだの声を、もっと深く</div>'
      + '<div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">'
      +   '<div style="text-align:center;">'
      +     '<div style="font-size:24px;font-weight:800;line-height:1;">¥580</div>'
      +     '<div style="font-size:10px;opacity:0.7;margin-top:2px;">/月</div>'
      +   '</div>'
      +   '<div style="opacity:0.45;font-size:12px;">または</div>'
      +   '<div style="text-align:center;">'
      +     '<div style="font-size:24px;font-weight:800;line-height:1;">¥4,800</div>'
      +     '<div style="font-size:10px;opacity:0.7;margin-top:2px;">/年&nbsp;<span style="background:rgba(255,255,255,0.2);padding:1px 6px;border-radius:6px;font-size:9px;font-weight:700;">31%オフ</span></div>'
      +   '</div>'
      + '</div>'
      + '<button onclick="startStripeCheckout()" style="width:100%;background:white;color:var(--plum);border:none;border-radius:50px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;font-family:\'Noto Sans JP\',sans-serif;letter-spacing:0.03em;">プレミアムを始める →</button>'
      + '</div>';
  }
}

function premiumGate(callback) {
  if (isAdminOrPremium()) {
    callback();
  } else {
    // 動的な価値説明を追加
    var dynamicMsg = document.getElementById('premium-dynamic-msg');
    if(dynamicMsg){
      var msg = '';
      if(callback === openTempReport){
        var tempCount = state.records.filter(function(r){return r.temperature;}).length;
        if(tempCount >= 14){
          var analysis = (window.analyzeTemperatureLegacy || calcTemperaturePhases)(state.records);
          if(analysis.status === 'ready' && analysis.alerts.length > 0){
            msg = '⚠️ あなたの体温データから'+analysis.alerts.length+'件の気になるパターンが検出されています。詳細な分析と医師相談の目安を確認できます。';
          } else {
            msg = '🌡️ '+tempCount+'日分の体温データから、低温期・高温期の判定、二相性分析、排卵推定、AMED研究（31万人）との比較が可能です。';
          }
        }
      } else if(callback === openCorrelationReport){
        msg = '🔬 あなたの生活要因と症状の相関を分析。「カフェインを摂った日は痛みが2.4倍」のような具体的な発見ができます。';
      } else if(callback === openFlareupReport){
        var flareCount = detectFlareups(state.records).length;
        if(flareCount > 0){
          msg = '🔥 '+flareCount+'件のフレアアップ（体調急変）を検出。トリガーとなった要因を特定できます。';
        }
      } else if(callback === openCyclePhaseReport){
        msg = '🌸 生理周期の各フェーズ（月経期・卵胞期・排卵期・黄体期）ごとの体調傾向を比較できます。';
      } else if(callback === openExperiments){
        msg = '🧪 「グルテンフリー30日」「毎日運動」など、仮説を立てて体調変化を検証できます。';
      }

      if(msg){
        dynamicMsg.innerHTML = '<div style="padding:12px 16px;background:linear-gradient(135deg,#fdf8f6,#f8f0ec);border-radius:12px;margin-bottom:16px;font-size:11px;color:var(--ink-mid);line-height:1.7;">'+msg+'</div>';
        dynamicMsg.style.display = 'block';
      } else {
        dynamicMsg.style.display = 'none';
      }
    }

    document.getElementById('premiumLockOverlay').classList.add('active');
  }
}

function closePremiumLock() {
  document.getElementById('premiumLockOverlay').classList.remove('active');
}

var premiumOverlay = document.getElementById('premiumLockOverlay');
if(premiumOverlay) premiumOverlay.addEventListener('click', function(e) {
if (e.target === this) closePremiumLock();
});

// STRIPE SUBSCRIPTION は src/services/stripe.js に移設
// (window.selectPremiumPlan / window.startStripeCheckout /
//  window.checkUpsellNotification / handleStripeReturn IIFE として公開)

// supabase.js は main.js で app-legacy.js より後にロードされるため
// ippo:vite-ready 後に onAuthStateChange を登録する。
window.addEventListener('ippo:vite-ready', function() {
  if (typeof supabase !== 'undefined' && supabase && supabase.auth) {
    supabase.auth.onAuthStateChange(function(event, session) {
      checkPremiumStatus();
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && session && session.user) {
        var _syncOverlay = document.getElementById('syncOverlay');
        var _syncModalOpen = _syncOverlay && _syncOverlay.classList.contains('active');
        if (!_syncModalOpen) {
          var _now = Date.now();
          var _last = window._lastAuthRestore || 0;
          if (_now - _last > 30000) {
            window._lastAuthRestore = _now;
            if (typeof _applyCloudRestore === 'function') _applyCloudRestore();
          }
        }
      }
      if (event === 'SIGNED_OUT') {
        var briefEl = document.getElementById('syncStatusBrief');
        if (briefEl) briefEl.textContent = '未ログイン';
      }
    });
    checkPremiumStatus();
  }
}, { once: true });

// manualCloudRestore の実装は line 1870 の enhanced merge 版を使用。
// ─── window 互換エクスポート ─────────────────────────────────
if (typeof _buildPhaseBarPreview === "function") window._buildPhaseBarPreview = _buildPhaseBarPreview;
if (typeof _generateDoctorPDF === "function") window._generateDoctorPDF = _generateDoctorPDF;
if (typeof addCustomFactor === "function") window.addCustomFactor = addCustomFactor;
if (typeof addMealTime === "function") window.addMealTime = addMealTime;
if (typeof addToHome === "function") window.addToHome = addToHome;
if (typeof adjustBowelCount === "function") window.adjustBowelCount = adjustBowelCount;
if (typeof adminLoadPremiumUsers === "function") window.adminLoadPremiumUsers = adminLoadPremiumUsers;
if (typeof adminSetPremium === "function") window.adminSetPremium = adminSetPremium;
if (typeof analyzeCyclePhases === "function") window.analyzeCyclePhases = analyzeCyclePhases;
if (typeof appendSymptomDetail === "function") window.appendSymptomDetail = appendSymptomDetail;
if (typeof applyFastingVisibility === "function") window.applyFastingVisibility = applyFastingVisibility;
if (typeof applySymptomChipPriority === "function") window.applySymptomChipPriority = applySymptomChipPriority;
if (typeof buildComparisonComment === "function") window.buildComparisonComment = buildComparisonComment;
if (typeof buildDayComparison === "function") window.buildDayComparison = buildDayComparison;
if (typeof buildEffectiveLayer1 === "function") window.buildEffectiveLayer1 = buildEffectiveLayer1;
if (typeof buildPhaseBar === "function") window.buildPhaseBar = buildPhaseBar;
if (typeof buildSteps === "function") window.buildSteps = buildSteps;
if (typeof buildSymptomChips === "function") window.buildSymptomChips = buildSymptomChips;
if (typeof buildWeekComparison === "function") window.buildWeekComparison = buildWeekComparison;
if (typeof calcAvgPainThisMonth === "function") window.calcAvgPainThisMonth = calcAvgPainThisMonth;
if (typeof calcCycleDay === "function") window.calcCycleDay = calcCycleDay;
if (typeof calcFactorCorrelations === "function") window.calcFactorCorrelations = calcFactorCorrelations;
if (typeof calcPainFreeDays === "function") window.calcPainFreeDays = calcPainFreeDays;
if (typeof calcPainFreeDaysThisMonth === "function") window.calcPainFreeDaysThisMonth = calcPainFreeDaysThisMonth;
if (typeof calcSMIScore === "function") window.calcSMIScore = calcSMIScore;
if (typeof calcTemperaturePhases === "function") window.calcTemperaturePhases = calcTemperaturePhases;
if (typeof calcWellnessScore === "function") window.calcWellnessScore = calcWellnessScore;
if (typeof cancelExperiment === "function") window.cancelExperiment = cancelExperiment;
if (typeof changeReportMonth === "function") window.changeReportMonth = changeReportMonth;
if (typeof checkAndShowTempAlert === "function") window.checkAndShowTempAlert = checkAndShowTempAlert;
if (typeof checkMyLikes === "function") window.checkMyLikes = checkMyLikes;
if (typeof checkPremiumRegistered === "function") window.checkPremiumRegistered = checkPremiumRegistered;
if (typeof checkSuddenTempRise === "function") window.checkSuddenTempRise = checkSuddenTempRise;
if (typeof clearAllDiseases === "function") window.clearAllDiseases = clearAllDiseases;
if (typeof clearData === "function") window.clearData = clearData;
if (typeof closeAIAnalysis === "function") window.closeAIAnalysis = closeAIAnalysis;
if (typeof closeDoctorSummary === "function") window.closeDoctorSummary = closeDoctorSummary;
if (typeof closeEditRecord === "function") window.closeEditRecord = closeEditRecord;
if (typeof closeMealTimePicker === "function") window.closeMealTimePicker = closeMealTimePicker;
if (typeof closeMonthlyReport === "function") window.closeMonthlyReport = closeMonthlyReport;
if (typeof closePremiumLock === "function") window.closePremiumLock = closePremiumLock;
if (typeof closeSuccess === "function") window.closeSuccess = closeSuccess;
if (typeof closeSymptomSettings === "function") window.closeSymptomSettings = closeSymptomSettings;
if (typeof closeSyncModal === "function") window.closeSyncModal = closeSyncModal;
if (typeof cloudSyncSafe === "function") window.cloudSyncSafe = cloudSyncSafe;
if (typeof completeExperiment === "function") window.completeExperiment = completeExperiment;
if (typeof completeOnboarding === "function") window.completeOnboarding = completeOnboarding;
if (typeof confirmMealTime === "function") window.confirmMealTime = confirmMealTime;
if (typeof copyAIAnalysis === "function") window.copyAIAnalysis = copyAIAnalysis;
if (typeof copyDoctorSummary === "function") window.copyDoctorSummary = copyDoctorSummary;
if (typeof createMealDonut === "function") window.createMealDonut = createMealDonut;
if (typeof csvSafe === "function") window.csvSafe = csvSafe;
if (typeof deleteEditRecord === "function") window.deleteEditRecord = deleteEditRecord;
if (typeof detectFlareups === "function") window.detectFlareups = detectFlareups;
if (typeof downloadDoctorPDF === "function") window.downloadDoctorPDF = downloadDoctorPDF;
if (typeof draftRecordScreen === "function") window.draftRecordScreen = draftRecordScreen;
if (typeof editPastRecord === "function") window.editPastRecord = editPastRecord;
if (typeof endFast === "function") window.endFast = endFast;
if (typeof ensureRecordIds === "function") window.ensureRecordIds = ensureRecordIds;
if (typeof escapeHtml === "function") window.escapeHtml = escapeHtml;
if (typeof exportCSV === "function") window.exportCSV = exportCSV;
if (typeof exportJSON === "function") window.exportJSON = exportJSON;
if (typeof finishOnboarding === "function") window.finishOnboarding = finishOnboarding;
if (typeof formatDiseaseCheck === "function") window.formatDiseaseCheck = formatDiseaseCheck;
if (typeof gatherDiseaseData === "function") window.gatherDiseaseData = gatherDiseaseData;
if (typeof gatherRecordData === "function") window.gatherRecordData = gatherRecordData;
if (typeof generateLocalAnalysis === "function") window.generateLocalAnalysis = generateLocalAnalysis;
if (typeof generateRecordId === "function") window.generateRecordId = generateRecordId;
if (typeof getBodyCheckTitle === "function") window.getBodyCheckTitle = getBodyCheckTitle;
if (typeof getCurrentCyclePhase === "function") window.getCurrentCyclePhase = getCurrentCyclePhase;
if (typeof getCyclePhase === "function") window.getCyclePhase = getCyclePhase;
if (typeof getDailyHint === "function") window.getDailyHint = getDailyHint;
if (typeof getDiseaseMorningQuestion === "function") window.getDiseaseMorningQuestion = getDiseaseMorningQuestion;
if (typeof getGreetingText === "function") window.getGreetingText = getGreetingText;
if (typeof getMetricLabel === "function") window.getMetricLabel = getMetricLabel;
if (typeof getMetricMax === "function") window.getMetricMax = getMetricMax;
if (typeof getMetricValue === "function") window.getMetricValue = getMetricValue;
if (typeof getPhaseForDate === "function") window.getPhaseForDate = getPhaseForDate;
if (typeof getRecentSymptoms === "function") window.getRecentSymptoms = getRecentSymptoms;
if (typeof getSuccessMessage === "function") window.getSuccessMessage = getSuccessMessage;
if (typeof getTimeAgo === "function") window.getTimeAgo = getTimeAgo;
if (typeof handleHomeCTA === "function") window.handleHomeCTA = handleHomeCTA;
if (typeof hideMessage === "function") window.hideMessage = hideMessage;
if (typeof icon === "function") window.icon = icon;
if (typeof idbDeleteRecord === "function") window.idbDeleteRecord = idbDeleteRecord;
if (typeof idbGetAllRecords === "function") window.idbGetAllRecords = idbGetAllRecords;
if (typeof idbPutRecord === "function") window.idbPutRecord = idbPutRecord;
if (typeof initAdminPanel === "function") window.initAdminPanel = initAdminPanel;
if (typeof initNavIcons === "function") window.initNavIcons = initNavIcons;
if (typeof initQuickLog === "function") window.initQuickLog = initQuickLog;
if (typeof initSettingsIcons === "function") window.initSettingsIcons = initSettingsIcons;
if (typeof initVisionUI === "function") window.initVisionUI = initVisionUI;
if (typeof isAdminOrPremium === "function") window.isAdminOrPremium = isAdminOrPremium;
if (typeof isPeriodExpected === "function") window.isPeriodExpected = isPeriodExpected;
if (typeof likeCommunityReply === "function") window.likeCommunityReply = likeCommunityReply;
if (typeof loadCVArchive === "function") window.loadCVArchive = loadCVArchive;
if (typeof loadCommunityReplies === "function") window.loadCommunityReplies = loadCommunityReplies;
if (typeof loadCommunityTopic === "function") window.loadCommunityTopic = loadCommunityTopic;
if (typeof loadMoreTimeline === "function") window.loadMoreTimeline = loadMoreTimeline;
if (typeof manualCloudRestore === "function") window.manualCloudRestore = manualCloudRestore;
if (typeof mergeRecords === "function") window.mergeRecords = mergeRecords;
if (typeof nextStep === "function") window.nextStep = nextStep;
if (typeof obBuildPeriodCalendar === "function") window.obBuildPeriodCalendar = obBuildPeriodCalendar;
if (typeof obComplete === "function") window.obComplete = obComplete;
if (typeof obInit === "function") window.obInit = obInit;
if (typeof obNext === "function") window.obNext = obNext;
if (typeof obSaveBirth === "function") window.obSaveBirth = obSaveBirth;
if (typeof obSaveCycle === "function") window.obSaveCycle = obSaveCycle;
if (typeof obSaveDiseases === "function") window.obSaveDiseases = obSaveDiseases;
if (typeof obSaveName === "function") window.obSaveName = obSaveName;
if (typeof obSavePeriod === "function") window.obSavePeriod = obSavePeriod;
if (typeof obSavePurpose === "function") window.obSavePurpose = obSavePurpose;
if (typeof obSaveReminder === "function") window.obSaveReminder = obSaveReminder;
if (typeof obSelectPeriodDay === "function") window.obSelectPeriodDay = obSelectPeriodDay;
if (typeof obShowStep === "function") window.obShowStep = obShowStep;
if (typeof obSkipAll === "function") window.obSkipAll = obSkipAll;
if (typeof obToggleDisease === "function") window.obToggleDisease = obToggleDisease;
if (typeof openAIAnalysis === "function") window.openAIAnalysis = openAIAnalysis;
if (typeof openCorrelationReport === "function") window.openCorrelationReport = openCorrelationReport;
if (typeof openCyclePhaseReport === "function") window.openCyclePhaseReport = openCyclePhaseReport;
if (typeof openDayDetailByDate === "function") window.openDayDetailByDate = openDayDetailByDate;
if (typeof openDiseaseSettings === "function") window.openDiseaseSettings = openDiseaseSettings;
if (typeof openDoctorSummary === "function") window.openDoctorSummary = openDoctorSummary;
if (typeof openEditRecord === "function") window.openEditRecord = openEditRecord;
if (typeof openExperiments === "function") window.openExperiments = openExperiments;
if (typeof showExperimentReport === "function") window.showExperimentReport = showExperimentReport;
if (typeof openFlareupReport === "function") window.openFlareupReport = openFlareupReport;
if (typeof openIDB === "function") window.openIDB = openIDB;
if (typeof openMonthlyReport === "function") window.openMonthlyReport = openMonthlyReport;
// FIX (2026-05-28): Vite bundles record-modules (containing record-three-card.js) as a
// static import dependency of the main chunk, so record-three-card.js evaluates BEFORE
// this file and sets window.openRecordScreen = openThreeCardRecord. Unconditionally
// overwriting here would revert that override back to the legacy screen.
// Guard: only set if NOT already claimed by a newer module (record-three-card.js etc.).
if (typeof openRecordScreen === "function" && typeof window.openRecordScreen !== 'function') {
  window.openRecordScreen = openRecordScreen;
}
// Always export legacy function separately so the ➕ nav button can explicitly open
// the legacy STEP1/2/3 screen (vs home CTA which uses openRecordScreen → three-card).
if (typeof openRecordScreen === "function") window.openLegacyRecordScreen = openRecordScreen;
if (typeof openRestoreUI === "function") window.openRestoreUI = openRestoreUI;
if (typeof openSymptomSettings === "function") window.openSymptomSettings = openSymptomSettings;
if (typeof openSyncModal === "function") window.openSyncModal = openSyncModal;
if (typeof openTempReport === "function") window.openTempReport = openTempReport;
if (typeof parseMealMemo === "function") window.parseMealMemo = parseMealMemo;
if (typeof parseMealFree === "function") window.parseMealFree = parseMealFree;
if (typeof postCommunityReply === "function") window.postCommunityReply = postCommunityReply;
if (typeof premiumGate === "function") window.premiumGate = premiumGate;
if (typeof prevStep === "function") window.prevStep = prevStep;
if (typeof pullRecordsFromCloud === "function") window.pullRecordsFromCloud = pullRecordsFromCloud;
if (typeof renderBodyCheck === "function") window.renderBodyCheck = renderBodyCheck;
if (typeof renderComparisonChart === "function") window.renderComparisonChart = renderComparisonChart;
if (typeof renderEmotion === "function") window.renderEmotion = renderEmotion;
if (typeof renderFasting === "function") window.renderFasting = renderFasting;
if (typeof renderFood === "function") window.renderFood = renderFood;
if (typeof renderInsightDiscoveries === "function") window.renderInsightDiscoveries = renderInsightDiscoveries;
if (typeof renderMonthlySummaryText === "function") window.renderMonthlySummaryText = renderMonthlySummaryText;
if (typeof renderMealSections === "function") window.renderMealSections = renderMealSections;
if (typeof renderPainScale === "function") window.renderPainScale = renderPainScale;
if (typeof renderPhaseMap === "function") window.renderPhaseMap = renderPhaseMap;
if (typeof renderProHero === "function") window.renderProHero = renderProHero;
if (typeof renderStep === "function") window.renderStep = renderStep;
if (typeof renderSymptomDetail === "function") window.renderSymptomDetail = renderSymptomDetail;
if (typeof renderSymptomLayers === "function") window.renderSymptomLayers = renderSymptomLayers;
if (typeof renderTimeline === "function") window.renderTimeline = renderTimeline;
if (typeof renderWellness === "function") window.renderWellness = renderWellness;
if (typeof reorderRecordSections === "function") window.reorderRecordSections = reorderRecordSections;
if (typeof repairFromBest === "function") window.repairFromBest = repairFromBest;
if (typeof restoreFromHistory === "function") window.restoreFromHistory = restoreFromHistory;
if (typeof resumeFasting === "function") window.resumeFasting = resumeFasting;
if (typeof runSelfDiagnosis === "function") window.runSelfDiagnosis = runSelfDiagnosis;
if (typeof saveAndSync === "function") window.saveAndSync = saveAndSync;
if (typeof saveBackupHistory === "function") window.saveBackupHistory = saveBackupHistory;
if (typeof saveDiseaseSettings === "function") window.saveDiseaseSettings = saveDiseaseSettings;
if (typeof saveEditRecord === "function") window.saveEditRecord = saveEditRecord;
if (typeof saveMealDraft === "function") window.saveMealDraft = saveMealDraft;
if (typeof saveQuickLog === "function") window.saveQuickLog = saveQuickLog;
if (typeof saveRecordScreen === "function") window.saveRecordScreen = saveRecordScreen;
if (typeof saveSymptomSelection === "function") window.saveSymptomSelection = saveSymptomSelection;
if (typeof saveSymptomSettings === "function") window.saveSymptomSettings = saveSymptomSettings;
if (typeof saveVision === "function") window.saveVision = saveVision;
if (typeof selectBodyCheckExtra === "function") window.selectBodyCheckExtra = selectBodyCheckExtra;
if (typeof selectBodyCheckItem === "function") window.selectBodyCheckItem = selectBodyCheckItem;
if (typeof selectBowel === "function") window.selectBowel = selectBowel;
if (typeof selectBowelCount === "function") window.selectBowelCount = selectBowelCount;
if (typeof selectDisease === "function") window.selectDisease = selectDisease;
if (typeof selectEditCycle === "function") window.selectEditCycle = selectEditCycle;
if (typeof selectEmotion === "function") window.selectEmotion = selectEmotion;
if (typeof selectEnergy === "function") window.selectEnergy = selectEnergy;
if (typeof selectFasting === "function") window.selectFasting = selectFasting;
if (typeof selectFood === "function") window.selectFood = selectFood;
if (typeof selectMood === "function") window.selectMood = selectMood;
if (typeof selectPhaseTab === "function") window.selectPhaseTab = selectPhaseTab;
if (typeof selectQuickPain === "function") window.selectQuickPain = selectQuickPain;
if (typeof selectRsCycle === "function") window.selectRsCycle = selectRsCycle;
if (typeof selectSleepQuality === "function") window.selectSleepQuality = selectSleepQuality;
if (typeof selectTempMethod === "function") window.selectTempMethod = selectTempMethod;
if (typeof selectWellness === "function") window.selectWellness = selectWellness;
if (typeof setCGRange === "function") window.setCGRange = setCGRange;
if (typeof setDailyMessage === "function") window.setDailyMessage = setDailyMessage;
if (typeof setFastGoal === "function") window.setFastGoal = setFastGoal;
if (typeof setGraphTab === "function") window.setGraphTab = setGraphTab;
if (typeof setRating === "function") window.setRating = setRating;
if (typeof shareApp === "function") window.shareApp = shareApp;
if (typeof showAlertModal === "function") window.showAlertModal = showAlertModal;
if (typeof showBingeUrgeSupport === "function") window.showBingeUrgeSupport = showBingeUrgeSupport;
if (typeof showConfirmModal === "function") window.showConfirmModal = showConfirmModal;
if (typeof showDiagnosisUI === "function") window.showDiagnosisUI = showDiagnosisUI;
if (typeof showLoginForm === "function") window.showLoginForm = showLoginForm;
if (typeof showMessage === "function") window.showMessage = showMessage;
if (typeof showPrivacyInfo === "function") window.showPrivacyInfo = showPrivacyInfo;
if (typeof showQuickLogDone === "function") window.showQuickLogDone = showQuickLogDone;
if (typeof showRecoveryBanner === "function") window.showRecoveryBanner = showRecoveryBanner;
if (typeof showRecoveryGuide === "function") window.showRecoveryGuide = showRecoveryGuide;
if (typeof showTempAlertBanner === "function") window.showTempAlertBanner = showTempAlertBanner;
if (typeof showTempEducation === "function") window.showTempEducation = showTempEducation;
if (typeof softDeleteRecord === "function") window.softDeleteRecord = softDeleteRecord;
if (typeof startCustomExperiment === "function") window.startCustomExperiment = startCustomExperiment;
if (typeof startExperiment === "function") window.startExperiment = startExperiment;
if (typeof startFastTimer === "function") window.startFastTimer = startFastTimer;
if (typeof submitFeedback === "function") window.submitFeedback = submitFeedback;
if (typeof submitPremiumWaitlist === "function") window.submitPremiumWaitlist = submitPremiumWaitlist;
if (typeof supabaseAuth === "function") window.supabaseAuth = supabaseAuth;
if (typeof supabaseEnsureAuth === "function") window.supabaseEnsureAuth = supabaseEnsureAuth;
if (typeof supabaseHeaders === "function") window.supabaseHeaders = supabaseHeaders;
if (typeof supabaseRefreshSession === "function") window.supabaseRefreshSession = supabaseRefreshSession;
if (typeof supabaseSignInAnonymous === "function") window.supabaseSignInAnonymous = supabaseSignInAnonymous;
if (typeof switchInsTab === "function") window.switchInsTab = switchInsTab;
if (typeof switchSymptomTab === "function") window.switchSymptomTab = switchSymptomTab;
if (typeof syncAllRecordsToCloud === "function") window.syncAllRecordsToCloud = syncAllRecordsToCloud;
if (typeof syncRecordToCloud === "function") window.syncRecordToCloud = syncRecordToCloud;
if (typeof toggleArchiveReplies === "function") window.toggleArchiveReplies = toggleArchiveReplies;
if (typeof toggleCGFactor === "function") window.toggleCGFactor = toggleCGFactor;
if (typeof toggleDetailItem === "function") window.toggleDetailItem = toggleDetailItem;
if (typeof toggleDiseaseChip === "function") window.toggleDiseaseChip = toggleDiseaseChip;
if (typeof toggleEditChip === "function") window.toggleEditChip = toggleEditChip;
if (typeof toggleFastingFeature === "function") window.toggleFastingFeature = toggleFastingFeature;
if (typeof toggleFoodItem === "function") window.toggleFoodItem = toggleFoodItem;
if (typeof toggleMealEntry === "function") window.toggleMealEntry = toggleMealEntry;
if (typeof toggleMealSection === "function") window.toggleMealSection = toggleMealSection;
if (typeof toggleRecordDetails === "function") window.toggleRecordDetails = toggleRecordDetails;
if (typeof toggleRsChip === "function") window.toggleRsChip = toggleRsChip;
if (typeof toggleSympLayer === "function") window.toggleSympLayer = toggleSympLayer;
if (typeof toggleSymptomChip === "function") window.toggleSymptomChip = toggleSymptomChip;
if (typeof toggleSyncMode === "function") window.toggleSyncMode = toggleSyncMode;
if (typeof toggleVisionEdit === "function") window.toggleVisionEdit = toggleVisionEdit;
if (typeof updateDailyHintCard === "function") window.updateDailyHintCard = updateDailyHintCard;
if (typeof updateDiseaseSettingDisplay === "function") window.updateDiseaseSettingDisplay = updateDiseaseSettingDisplay;
if (typeof updateFastingWidgetPhase === "function") window.updateFastingWidgetPhase = updateFastingWidgetPhase;
if (typeof updateHomeCTA === "function") window.updateHomeCTA = updateHomeCTA;
if (typeof updateHomePhaseBanner === "function") window.updateHomePhaseBanner = updateHomePhaseBanner;
if (typeof updateHomeSummary === "function") window.updateHomeSummary = updateHomeSummary;
if (typeof updateHomeVision === "function") window.updateHomeVision = updateHomeVision;
if (typeof updateMealParse === "function") window.updateMealParse = updateMealParse;
if (typeof updateMonthLabel === "function") window.updateMonthLabel = updateMonthLabel;
if (typeof updatePremiumBadges === "function") window.updatePremiumBadges = updatePremiumBadges;
if (typeof updateRecProgressDots === "function") window.updateRecProgressDots = updateRecProgressDots;
if (typeof updateRecordSymptoms === "function") window.updateRecordSymptoms = updateRecordSymptoms;
if (typeof updateReplyLikeCount === "function") window.updateReplyLikeCount = updateReplyLikeCount;
if (typeof updateSettingsHero === "function") window.updateSettingsHero = updateSettingsHero;
if (typeof updateSliderDetail === "function") window.updateSliderDetail = updateSliderDetail;
if (typeof updateStreakBadge === "function") window.updateStreakBadge = updateStreakBadge;
if (typeof updateSymptomSettingDisplay === "function") window.updateSymptomSettingDisplay = updateSymptomSettingDisplay;
if (typeof updateTimelineView === "function") window.updateTimelineView = updateTimelineView;
if (typeof updateTodayMessage === "function") window.updateTodayMessage = updateTodayMessage;
if (typeof updateUnlock === "function") window.updateUnlock = updateUnlock;
if (typeof updateVisionDisplay === "function") window.updateVisionDisplay = updateVisionDisplay;
// ─── グローバル変数エクスポート ───────────────────────────────
if (typeof currentRecord !== "undefined") window.currentRecord = currentRecord;
if (typeof currentStep   !== "undefined") window.currentStep   = currentStep;
if (typeof STEPS         !== "undefined") window.STEPS         = STEPS;
