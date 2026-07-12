// ============================================================
//  ippo – src/modules/record-screen-widgets.js
//  PR-089F-2 (Legacy Removal Batch-11分割⑥-2): Record Screen（#rs-*）入力ウィジェット
//  selectTempMethod / toggleRsChip / selectRsCycle / selectEnergy / selectSleepQuality /
//  selectBowel / selectMood / updateRecProgressDots / toggleRecordDetails /
//  adjustBowelCount を src/app-legacy.js から物理移動。
//
//  record-input.js（PR-079/Batch-1）とは別世代・別UI（renderStep等のwizard型に対し、
//  本ファイルは単一画面のRecord Screen「#rs-*」ID系のウィジェット）のため専用新設ファイルへ分離。
//
//  _bowelCountは本ファイル内に閉じたモジュールスコープ変数。外部（record-screen.js・
//  record-edit.js）からはwindow.__ippoGetBowelCount()/__ippoSetBowelCount()ブリッジ
//  （PR-080E由来）経由でのみアクセスされるため、この2関数も本ファイルへ同時移動。
// ============================================================

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
// PR-080E: openRecordScreen（record-screen.jsへ物理移動済み）が _bowelCount を
// 参照するための最小限のブリッジ。adjustBowelCount・保存時の読み取りは
// 従来どおりbare _bowelCountのまま（挙動変更なし）。
window.__ippoGetBowelCount = function () { return _bowelCount; };
window.__ippoSetBowelCount = function (v) { _bowelCount = v; };

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

export {
  selectTempMethod,
  toggleRsChip,
  selectRsCycle,
  selectEnergy,
  selectSleepQuality,
  selectBowel,
  selectMood,
  updateRecProgressDots,
  toggleRecordDetails,
  adjustBowelCount
};

// PR-090-R2 (EXPORT_HUB_REFACTOR_COUNCIL Step A): 自己export追加。
// app-legacy.js側の重複export行は削除済み。
window.selectTempMethod = selectTempMethod;
window.toggleRsChip = toggleRsChip;
window.selectRsCycle = selectRsCycle;
window.selectEnergy = selectEnergy;
window.selectSleepQuality = selectSleepQuality;
window.selectBowel = selectBowel;
window.selectMood = selectMood;
window.updateRecProgressDots = updateRecProgressDots;
window.toggleRecordDetails = toggleRecordDetails;
window.adjustBowelCount = adjustBowelCount;
