// ============================================================
//  ippo – src/modules/symptom-layers.js
//  PR-089F-3 (Legacy Removal Batch-11分割⑥-3): Symptom UI（3層チップシステム）
//  buildEffectiveLayer1 / renderSymptomLayers / toggleSympLayer / switchSymptomTab /
//  updateRecordSymptoms を src/app-legacy.js から物理移動。
//
//  SYMPTOM_CATEGORIES / _sympTabCurrent は本クラスタ内でのみ使用されることを
//  確認済みのため同時移動。SYMPTOM_LAYERS/SENSITIVE_SYMPTOMS/DISEASE_PRIORITY_SYMPTOMSは
//  従来 window 経由のbare識別子解決（main.js: constants/symptoms.js は app-legacy.js
//  より後にimportされるが、実際の参照は関数呼び出し時＝main.js全体評価後のため問題なし）
//  だったものを、本ファイルでは同一オブジェクトを指すexportから直接importする
//  （挙動変更なし）。
// ============================================================

import { getState } from '../store/state.js';
import { getRecentSymptoms } from './symptom-settings.js';
import { SYMPTOM_LAYERS, SENSITIVE_SYMPTOMS, DISEASE_PRIORITY_SYMPTOMS } from '../constants/symptoms.js';

// 症状カテゴリ分類（タブフィルタ用、現在の3層システムでは data-sym-cat 属性としてのみ使用）
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

function buildEffectiveLayer1() {
  var s = getState();
  var diseases = s.myDiseases || [];
  var priorityArr = [];
  diseases.forEach(function(disease){
    var priorities = DISEASE_PRIORITY_SYMPTOMS[disease] || [];
    priorities.forEach(function(sym){
      if(priorityArr.indexOf(sym) === -1) priorityArr.push(sym);
    });
  });
  getRecentSymptoms().forEach(function(sym){
    if(priorityArr.indexOf(sym) === -1) priorityArr.push(sym);
  });
  var merged = priorityArr.slice(0, 5);
  SYMPTOM_LAYERS.layer1.forEach(function(sym){
    if(merged.indexOf(sym) === -1) merged.push(sym);
  });
  return merged.slice(0, 10);
}

function renderSymptomLayers() {
  var container = document.getElementById('rs-symptoms');
  if(!container) return;
  var s = getState();
  var diseases = s.myDiseases || [];
  var hasDiseaseWithSensitive = diseases.some(function(d){
    var p = DISEASE_PRIORITY_SYMPTOMS[d] || [];
    return p.some(function(sym){ return SENSITIVE_SYMPTOMS.indexOf(sym) !== -1; });
  });
  // 現在選択済み症状を退避
  var selected = [];
  container.querySelectorAll('.chip.selected').forEach(function(c){ selected.push(c.textContent); });
  var layer1 = buildEffectiveLayer1();
  var baseLayer2 = SYMPTOM_LAYERS.layer2.slice();
  if(!hasDiseaseWithSensitive){
    SENSITIVE_SYMPTOMS.forEach(function(sym){ if(baseLayer2.indexOf(sym)===-1) baseLayer2.push(sym); });
  }
  var layer2 = baseLayer2.filter(function(sym){ return layer1.indexOf(sym)===-1; });
  var layer3 = SYMPTOM_LAYERS.layer3.filter(function(sym){ return layer1.indexOf(sym)===-1 && layer2.indexOf(sym)===-1; });
  var expandBtnStyle = 'border:.5px dashed #ddd;background:transparent;color:#9a8e88;font-size:11px;padding:5px 14px;border-radius:20px;cursor:pointer;font-family:inherit;margin-top:2px;';
  function makeChip(name){ return '<div class="chip" onclick="toggleRsChip(this)" style="font-size:11px;padding:6px 12px;">'+name+'</div>'; }
  var html = '<div id="rs-symp-l1" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer1.forEach(function(sym){ html += makeChip(sym); });
  html += '</div>';
  html += '<div id="rs-symp-e2" style="margin:0 0 4px;"><button onclick="toggleSympLayer(2)" id="rs-symp-btn2" style="'+expandBtnStyle+'">もっと見る ▾</button></div>';
  html += '<div id="rs-symp-l2" style="display:none;flex-wrap:wrap;gap:6px;margin-bottom:6px;">';
  layer2.forEach(function(sym){ html += makeChip(sym); });
  html += '</div>';
  html += '<div id="rs-symp-e3" style="display:none;margin:0 0 4px;"><button onclick="toggleSympLayer(3)" id="rs-symp-btn3" style="'+expandBtnStyle+'">さらに見る ▾</button></div>';
  html += '<div id="rs-symp-l3" style="display:none;flex-wrap:wrap;gap:6px;">';
  layer3.forEach(function(sym){ html += makeChip(sym); });
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
  var s = getState();
  var saved = s.mySymptoms || [];
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
    var sym = sorted[k];
    var isMy = saved.indexOf(sym) !== -1;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = sym;
    chip.setAttribute('data-sym-cat', SYMPTOM_CATEGORIES[sym] || 'body');
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

export {
  buildEffectiveLayer1,
  renderSymptomLayers,
  toggleSympLayer,
  switchSymptomTab,
  updateRecordSymptoms
};
