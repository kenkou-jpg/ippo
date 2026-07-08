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
//
//  PR-092B (UI/UX Final Council採用): saveRecordScreen() を物理移動。
//  Business Logic変更なし（既存保存ロジックを維持、純粋な物理移動 + import解決のみ）。
//  - bare `state` 参照 → `window.state`（本ファイル既存の idiom と同型）
//  - gatherRecordData/gatherDiseaseData/toLocalDateKey/parseMealMemo/calcWellnessScore/
//    calcSMIScore/showAlertModal/saveSymptomSelection/updateHomeCTA/updateHomeSummary/
//    updateDailyHintCard/updateTodayMessage/updateStreakBadge/buildHomeWeekRow/
//    updateHomeInsightCard/updateHomeNumbers/updateHomeDiseaseAdvice/updateHomeCTAState/
//    updateStats/checkAndShowTempAlert/updateFastingWidgetPhase/getCurrentCyclePhase/
//    saveAndSync は、いずれもapp-legacy.js側で既に他モジュールへ物理移動済みの実装を
//    importしていたもの（bare呼び出し）だったため、本ファイルでも同じモジュールから
//    直接importする（挙動変更なし）。
//  - `cloudBackupAll`/`saveState` の2件のみ、app-legacy.js側にローカル実装が残置されており
//    （window.cloudBackupAll/window.saveStateが未設定の場合のみ使われるフォールバック、
//    実運用では到達しない安全網）、本ファイルへexportされていないため、
//    app-legacy.js側に window.__ippoLegacyCloudBackupAll / window.__ippoLegacySaveState
//    ブリッジを新設し、それ経由で参照する（既存のフォールバック挙動を完全に保持）。
//  - `showToast`（クラウド同期2回失敗時のみ到達する内側catch内）は、app-legacy.js側でも
//    importされておらずbare参照のまま（到達時ReferenceErrorとなる pre-existing の潜在バグ）
//    だったため、本PRのScope（Business Logic変更禁止・既存保存ロジック維持）に従い
//    そのまま同一のbare参照として移植する（修正しない）。
//  - 調査メモ: src/modules/record.js にも saveRecordScreen という別実装
//    （_saveRecordScreenImpl、app-legacy.js廃止後のフォールバックとして設計済み）が
//    存在するが、window.saveRecordScreen は「未設定の場合のみ」自身を割り当てる
//    ガードを持つため、本ファイルが従来通り無条件で window.saveRecordScreen を
//    割り当てる限り、record.js側は引き続き休眠状態のままで競合しない
//    （2026-07-07 実機確認済み。詳細は docs/HANDOFF_PHASE7_COMPLETE.md PR-092B節）。
// ============================================================

import { gatherRecordData, gatherDiseaseData } from './record-edit.js';
import { toLocalDateKey } from '../utils/string-utils.js';
import { calcSMIScore } from '../utils/stats-utils.js';
import { parseMealMemo } from './meal-tracker.js';
import { calcWellnessScore } from './pro/shared/pro-metric-utils.js';
import { showAlertModal } from './ui-notifications.js';
import { saveSymptomSelection } from './symptom-settings.js';
import {
  updateHomeCTA, updateHomeSummary, updateStreakBadge,
  buildHomeWeekRow, updateHomeInsightCard, updateHomeNumbers,
  updateHomeDiseaseAdvice, updateHomeCTAState, updateStats,
  updateDailyHintCard, updateTodayMessage,
} from './home-renderer.js';
import { checkAndShowTempAlert } from './temp-alert.js';
import { updateFastingWidgetPhase } from './fasting.js';
import { getCurrentCyclePhase } from '../analytics/cycle-engine.js';
import { saveAndSync } from './save-and-sync.js';

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

// ===== RECORD SCREEN 保存（PR-092A/PR-092B: app-legacy.jsから物理移動） =====
export function saveRecordScreen(){
  try {
    var data = gatherRecordData();
    var targetDate = window.state.editingDate ? new Date(window.state.editingDate) : new Date();
    var todayStr = targetDate.toDateString();
    var targetDateSlice = toLocalDateKey(targetDate);
    var rec = null;
    for(var i=0; i<window.state.records.length; i++){
      var _r = window.state.records[i];
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
      window.state.records.push(rec);
      window.state.totalDays++;
      // streak計算
      var yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      var yStr = yesterday.toDateString();
      var hadYesterday = window.state.records.some(function(r){ return new Date(r.date).toDateString() === yStr; });
      window.state.streak = window.state.streak || 0;
      if(hadYesterday || window.state.streak === 0) window.state.streak++;
      else window.state.streak = 1;
    }

    // 保存を即座に実行
    try {
      if (typeof window.saveState === 'function') {
        window.saveState();
      } else if (typeof window.__ippoLegacySaveState === 'function') {
        window.__ippoLegacySaveState();
      } else {
        localStorage.setItem('ippo_state', JSON.stringify(window.state));
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
    // PR-080G: buildCalendar()呼び出しを削除（Dead Code — #calLabel/#calGrid実体なし、詳細はHANDOFF参照）
    if (typeof window.buildCalendarNext === 'function') window.buildCalendarNext();
    localStorage.removeItem('ippo_draft');
    var _cloudBackupFn = (typeof window.cloudBackupAll === 'function' ? window.cloudBackupAll : window.__ippoLegacyCloudBackupAll);
    if(typeof _cloudBackupFn === 'function'){
      _cloudBackupFn().catch(function(e){
        console.warn('クラウドバックアップ失敗、リトライ中...', e);
        setTimeout(function(){
          _cloudBackupFn().catch(function(){
            // pre-existing: showToastはこのファイル・移動元app-legacy.js側いずれでも
            // importされておらずbare参照のまま（到達時ReferenceErrorとなる潜在バグ）。
            // Business Logic変更禁止のScopeのため修正せず、挙動をそのまま移植する。
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
      var streak = window.state.streak || 0;
      var feedbackHtml = '';
      // 1. 連続記録日数
      feedbackHtml += '<div style="background:#FBEAF0;border-radius:14px;padding:14px 16px;margin:12px 0 4px;text-align:left;">';
      feedbackHtml += '<div style="font-weight:500;color:#72243E;margin-bottom:4px;">今日で' + streak + '日連続記録中</div>';
      // 2. 先週との比較
      var now = new Date();
      var last7 = window.state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=0&&diff<7; });
      var prev7 = window.state.records.filter(function(r){ var d=new Date(r.date); var diff=(now-d)/86400000; return diff>=7&&diff<14; });
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
      // PR-EXP-06 (Experiment Platform Framing): 記録が実験の土台になることを断定なしに示唆する追記
      feedbackHtml += '<div style="font-size:12px;color:#9B8B7A;margin-top:6px;">この記録が、これからの実験の土台になっていくかもしれません</div>';
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
    if(window.state.editingDate){
      window.state.editingDate = null;
      saveAndSync();
    }
  } catch(e) {
    console.error('saveRecordScreen error:', e);
    showAlertModal('記録の保存中にエラーが発生しました。<br>もう一度お試しください。<br><br>エラー: ' + e.message);
  }
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('record-screen-module-loaded');
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// openRecordScreen/openLegacyRecordScreenはrecord-three-card.jsとのload順依存の
// 上書きガードがあるため対象外・app-legacy.js側の実装のまま維持（触らない）。
// editPastRecordのみ単純な自己exportが可能（app-legacy.js側の重複export行は削除済み）。
window.editPastRecord = editPastRecord;
// PR-092B: saveRecordScreenも自己export化（app-legacy.js側の重複export行は削除済み）。
window.saveRecordScreen = saveRecordScreen;
