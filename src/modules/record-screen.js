// ============================================================
//  ippo – src/modules/record-screen.js
//  PR-080E: openRecordScreen / editPastRecord の物理移動
//
//  app-legacy.js から関数本体をそのまま移植（挙動変更なし）。
//  - bare `state` 参照 → `window.state`（app-legacy.js の
//    `_ippoStateHooks` により window.state は常に bare state と
//    同一オブジェクトに同期される。src/app-legacy.js 冒頭コメント参照）。
//  - `_bowelCount`（app-legacy.js 側に残存する bare var）→
//    `window.__ippoGetBowelCount()`/`window.__ippoSetBowelCount()`
//    ブリッジ経由（app-legacy.js 側で追加、adjustBowelCount/
//    保存時読み取りは従来どおりbare _bowelCountのまま）。
//  - renderSymptomLayers/updateRecProgressDots/updateDiseaseQuestions/
//    toggleSympLayer/selectTempMethod/updateMealParse は app-legacy.js に
//    残存し重複実装が存在しないことをPR-080Eで監査済みのため、
//    window.* 経由でそのまま呼び出す（DI bridge）。
//  - prefillRecordFromModal は calendar.js にも同名の別実装が存在するが
//    （app-legacy.js版とはstate取得経路のみ異なる別物）、openRecordScreen
//    専用のprivateヘルパーとしてapp-legacy.js版をそのまま同梱移動し、
//    window export はしない（calendar.js版と衝突させない）。
// ============================================================

// ===== 記録モーダル → 詳細記録画面への引き継ぎ（private、window非export） =====
function prefillRecordFromModal() {
  var today = new Date().toISOString().slice(0, 10);
  var rec = (window.state.records || []).find(function(r) {
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
export function openRecordScreen(){
  // welcome-reset-guard が setTimeout(0) で showScreen(getCurrentScreen()) を呼ぶため、
  // state.currentScreen を先に更新しないと旧タブに戻される。
  window.state.currentScreen = 'record';
    // 今日の記録が既にある場合は自動的に編集モードにする
  if(!window.state.editingDate){
    var todayStr = new Date().toDateString();
    var todaySlice = new Date().toISOString().slice(0, 10);
    var todayExists = window.state.records.some(function(r){
      return (r.date && new Date(r.date).toDateString() === todayStr) ||
             (r.record_date && r.record_date.slice(0, 10) === todaySlice);
    });
    if(todayExists){
      window.state.editingDate = todaySlice;
    }
  }

  var now = new Date();
  var wd = ['日','月','火','水','木','金','土'];

  // ★ 編集モード：対象日の日付とデータを使用
  var isEditing = !!window.state.editingDate;
  var targetDate = isEditing ? new Date(window.state.editingDate) : now;

  var el = document.getElementById('rec-screen-date');
  if(el) el.textContent = targetDate.getFullYear()+'年'+(targetDate.getMonth()+1)+'月'+targetDate.getDate()+'日（'+wd[targetDate.getDay()]+'）';

  // フォームをリセット
  ['rs-morning','rs-lunch','rs-dinner','rs-snack','rs-note'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
  ['rs-first-time','rs-last-time'].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=''; });
  var te = document.getElementById('rs-temp'); if(te) te.value='';
  var mealFreeEl = document.getElementById('rs-meal-free'); if(mealFreeEl) mealFreeEl.value='';
  document.querySelectorAll('#rs-cycle .chip').forEach(function(c){ c.classList.remove('selected'); });
  window.renderSymptomLayers(); // 3層チップを描画（選択リセット込み）
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
  window.__ippoSetBowelCount(0);
  var _bcd = document.getElementById('bowel-count-display'); if(_bcd) _bcd.textContent = '0';
  // 詳細セクションの折りたたみ状態をlocalStorageから復元
  try{
    var _detailsOpen = localStorage.getItem('ippo_rec_details_open') === '1';
    var _detailsSec = document.getElementById('rec-details-section');
    var _detailsArrow = document.getElementById('rec-details-arrow');
    if(_detailsSec) _detailsSec.style.display = _detailsOpen ? 'block' : 'none';
    if(_detailsArrow) _detailsArrow.textContent = _detailsOpen ? '▴' : '▾';
  }catch(e){}
  setTimeout(function(){ window.updateRecProgressDots(); }, 100);
  // 記録モーダルで保存済みの症状・痛みを引き継ぐ（非編集モード時のみ）
  if(!isEditing){ prefillRecordFromModal(); }
  // ★ 編集モード：既存記録をフォームに復元
  if(isEditing){
    var editDateStr = targetDate.toDateString();
    var editRec = null;
    for(var ri=0; ri<window.state.records.length; ri++){
      var _r = window.state.records[ri];
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
      if(editRec.mealFree){ var mf=document.getElementById('rs-meal-free'); if(mf){ mf.value=editRec.mealFree; if(typeof window.updateMealParse==='function') window.updateMealParse(); } }
      if(editRec.meals){
        var m=editRec.meals;
        if(m.morning){ var em=document.getElementById('rs-morning'); if(em) em.value=m.morning; }
        if(m.lunch){ var el2=document.getElementById('rs-lunch'); if(el2) el2.value=m.lunch; }
        if(m.dinner){ var ed=document.getElementById('rs-dinner'); if(ed) ed.value=m.dinner; }
        if(m.snack){ var es=document.getElementById('rs-snack'); if(es) es.value=m.snack; }
        if(m.free){ var ef=document.getElementById('rs-meal-free'); if(ef){ ef.value=m.free; if(typeof window.updateMealParse==='function') window.updateMealParse(); } }
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
        window.__ippoSetBowelCount(editRec.bowelCount);
        var bcd = document.getElementById('bowel-count-display');
        if(bcd) bcd.textContent = window.__ippoGetBowelCount();
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
        window.updateDiseaseQuestions();
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
              if(ta && md.mealFree){ ta.value = md.mealFree; window.updateMealParse(); }
            }
          } catch(e){}
        }
      if(d.temp){ var et=document.getElementById('rs-temp'); if(et) et.value=d.temp; }
      if(d.tempMethod) window.selectTempMethod(d.tempMethod);
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
  for(var ri=0; ri<window.state.records.length; ri++){
    if(new Date(window.state.records[ri].date).toDateString() === now.toDateString()){ todayRec = window.state.records[ri]; break; }
  }
  if(todayRec && todayRec.mealFree){
    var mealTA = document.getElementById('rs-meal-free');
    if(mealTA && !mealTA.value.trim()){ mealTA.value = todayRec.mealFree; window.updateMealParse(); }
  }
    // 既存記録の体温を復元
  if(todayRec && todayRec.temperature){
    var tempEl = document.getElementById('rs-temp');
    if(tempEl && !tempEl.value) tempEl.value = todayRec.temperature;
  }
  // 体温測定方法を復元
  window.selectTempMethod((todayRec && todayRec.tempMethod) ? todayRec.tempMethod : 'sublingual');
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
    if(_needL2) window.toggleSympLayer(2);
    if(_needL3) window.toggleSympLayer(3);
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
    window.updateDiseaseQuestions();
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

export function editPastRecord(dateStr) {
  // オーバーレイを閉じる
  var overlay = document.getElementById('dmOverlay');
  if (overlay) overlay.classList.remove('dm-open');
  var dayModal = document.getElementById('dayDetailModal');
  if (dayModal) dayModal.style.display = 'none';

  var rec = window.state.records.find(function(r) {
    if (r.record_date && r.record_date.slice(0, 10) === dateStr) return true;
    if (r.date) {
      var _d = new Date(r.date);
      var _local = _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
      if (_local === dateStr) return true;
    }
    return false;
  });

  window.state.draft = {
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
      window.state.draft[key] = rec[key];
    });
  }

  window.state.editingDate = dateStr;

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

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('record-screen-module-loaded');
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// openRecordScreen/openLegacyRecordScreenはrecord-three-card.jsとのload順依存の
// 上書きガードがあるため対象外・app-legacy.js側の実装のまま維持（触らない）。
// editPastRecordのみ単純な自己exportが可能（app-legacy.js側の重複export行は削除済み）。
window.editPastRecord = editPastRecord;
