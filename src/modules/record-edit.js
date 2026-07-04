// ============================================================
//  ippo – src/modules/record-edit.js
//  PR-089F-1 (Legacy Removal Batch-11分割⑥-1): Record Edit Modal / Record Screen Draft
//  openEditRecord / closeEditRecord / toggleEditChip / selectEditCycle /
//  deleteEditRecord / softDeleteRecord / gatherRecordData / gatherDiseaseData /
//  draftRecordScreen を src/app-legacy.js から物理移動。
//
//  saveEditRecordはopenDayDetail（AMBIGUOUS判定・PR-089E investigation-only）への
//  依存のため対象外・app-legacy.js残置（統合はPR-089Z対応）。
//  editingDateStrはopenEditRecord（本ファイル・設定）とsaveEditRecord（app-legacy.js
//  残置・参照）の双方から使われるため、window.editingDateStrとして共有する
//  （calYear/calMonthと同型のidiom、詳細はdocs/PR-089E-calendar-remaining-investigation.md）。
//  _bowelCountはapp-legacy.js残置（adjustBowelCount等）のため、既存のwindow.__ippoGetBowelCount()
//  ブリッジ（PR-080E由来、record-screen.jsが使用するものと同一）経由で読み取る。
// ============================================================

import { getState, saveState } from '../store/state.js';
import { showConfirmModal } from './ui-notifications.js';
import { parseMealMemo } from './meal-tracker.js';

// ===== 記録の論理削除 =====
// softDeleteRecord: UI コードから呼ばれる
function softDeleteRecord(recordId){
  var s = getState();
  var found = false;
  for(var i=0; i<s.records.length; i++){
    if(s.records[i].id === recordId){
      s.records[i].deleted_at = new Date().toISOString();
      s.records[i].updatedAt  = new Date().toISOString();
      if(typeof window.syncRecordImmediately === 'function') window.syncRecordImmediately(s.records[i]);
      s.records.splice(i,1);
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

// ===== EDIT RECORD =====
function openEditRecord(dateString){
  document.getElementById('dmOverlay').classList.remove('dm-open');
  window.editingDateStr = dateString;
  var s = getState();
  var recs = s.records.filter(function(r){ return new Date(r.date).toDateString() === dateString; });
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

function deleteEditRecord(){
  showConfirmModal('この日の記録を削除しますか？', function() {
    var s = getState();
    var recs = s.records.filter(function(r){
      return new Date(r.date).toDateString() === window.editingDateStr;
    });
    recs.forEach(function(r){
      if(r.id) softDeleteRecord(r.id);
    });
    // IDがないレコードは旧方式で削除
    s.records = s.records.filter(function(r){
      return new Date(r.date).toDateString() !== window.editingDateStr || r.id;
    });
    saveState();
    closeEditRecord();
    document.getElementById('dmOverlay').classList.remove('dm-open');
  });
}

// ===== Record Screen（rs-*）データ収集 =====
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

function gatherRecordData(){
  var s = getState();
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
      bowelCount: window.__ippoGetBowelCount ? (window.__ippoGetBowelCount() || 0) : 0,
      energy: energy,
      sleepBed: sleepBed,
      sleepWake: sleepWake,
      sleepQuality: sleepQuality,
      sleepHours: sleepHours,
      factors: factors,
      bowel: bowel,
      diseaseCheck: diseaseCheck,
      diseases: s.myDiseases || [],
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

export {
  softDeleteRecord,
  openEditRecord,
  closeEditRecord,
  toggleEditChip,
  selectEditCycle,
  deleteEditRecord,
  gatherDiseaseData,
  gatherRecordData,
  draftRecordScreen
};
