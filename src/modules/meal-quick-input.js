// ============================================================
//  ippo – src/modules/meal-quick-input.js
//  PR-089F-5 (Legacy Removal Batch-11分割⑥-5): 食事クイック入力（時間ピッカー）+
//  24H ドーナツチャート（toggleMealEntry / confirmMealTime / closeMealTimePicker /
//  createMealDonut）を src/app-legacy.js から物理移動。
//
//  parseMealFreeはsrc全体で宣言箇所が存在しない（PR-085でparseMealMemoへ置き換え後の
//  残骸と推測される）ため、typeof guard付きbare呼び出しは常にno-opだが挙動変更禁止の
//  ため元のままとする。createMealDonutは外部状態に依存しない純粋関数。
// ============================================================

// ===== 食事クイック入力 =====
var _mealPendingType = '';
var _mealPendingBtn = null;

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

export {
  toggleMealEntry,
  confirmMealTime,
  closeMealTimePicker,
  createMealDonut
};
