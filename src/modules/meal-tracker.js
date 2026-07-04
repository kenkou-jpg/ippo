// src/modules/meal-tracker.js
// Phase 4-C: openMealTimePicker / addMealTime を app-legacy.js から移植
//
// PR-085 (Legacy Removal Batch-7): parseMealMemo/saveMealDraft/toggleMealSection/
// renderMealSections/updateMealParse/_updateMealParseFreetextLegacy を物理移動。
// Business Logic変更なし。
// ・本ファイルはPhase 4-C以来 main.js/app-legacy.jsのどこからもimportされていない
//   orphaned moduleだったが、本PRのapp-legacy.js側import追加により初めてバンドル対象になる
//   （disease-settings.js/PR-084Aと同型のギャップ解消）。
// ・mealSectionConfig/openMealSectionsはtoggleMealSection/renderMealSections/
//   updateMealParse間でのみ共有されるためmodule-scope varとして移動、非export。

export function openMealTimePicker() {
  var picker = document.getElementById('meal-time-picker');
  var input  = document.getElementById('meal-time-input');
  var now = new Date();
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  if (input)  input.value = hh + ':' + mm;
  if (picker) picker.style.display = 'block';
}

export function addMealTime() {
  var ta    = document.getElementById('rs-meal-free');
  var input = document.getElementById('meal-time-input');
  if (!ta || !input) return;
  var time    = input.value.replace(':', '');
  var current = ta.value.trim();
  ta.value = current ? current + '\n' + time + ' ' : time + ' ';
  var lines = ta.value.trim().split('\n').filter(function(l) { return l.trim(); });
  lines.sort();
  ta.value = lines.join('\n');
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  if (typeof window.closeMealTimePicker === 'function') window.closeMealTimePicker();
  if (typeof window.updateMealParse === 'function') window.updateMealParse();
}

window.openMealTimePicker = openMealTimePicker;
window.addMealTime        = addMealTime;

// ===== フリーメモ自動解析 =====
export function parseMealMemo(text){
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

export function _updateMealParseFreetextLegacy(){
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

export function saveMealDraft(){
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

export function toggleMealSection(key) {
  var idx = openMealSections.indexOf(key);
  if (idx !== -1) {
    openMealSections.splice(idx, 1);
  } else {
    openMealSections.push(key);
  }
  renderMealSections();
}

export function renderMealSections() {
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

export function updateMealParse() {
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

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('meal-tracker-loaded');
}

export {};
