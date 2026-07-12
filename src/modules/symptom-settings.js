// ================================================================
//  ippo – src/modules/symptom-settings.js
//  PR-084 (Legacy Removal Batch-6): Symptom Settings
//
//  app-legacy.js の「症状設定」「疾患別症状チップ優先表示」ブロックから
//  openSymptomSettings/closeSymptomSettings/saveSymptomSettings/
//  getRecentSymptoms/saveSymptomSelection/updateSymptomSettingDisplay/
//  buildSymptomChips/applySymptomChipPriority を物理移動。Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks により同一オブジェクト参照）
//  ・saveSymptomSettings内の`saveState()`/`updateRecordSymptoms()`（いずれも
//    app-legacy.js側に残置）は window.saveState()/window.updateRecordSymptoms()
//    経由の guarded 呼び出しに変更（既存コードで多用されている idiom と同型）。
//  ・buildSymptomChips内の bare `DISEASE_CONFIG[d]` は、app-legacy.js側でも
//    未import・未宣言のため元々到達不能（呼び出し元 applySymptomChipPriority に
//    現行UIからの呼び出し経路が存在しないdead code）。挙動変更なしのため
//    そのまま温存（PR-082Aの`typeof DISEASE_CONFIG !== 'undefined'`分岐温存と同型判断）。
//  ・実装前調査で判明: openSymptomSettings/closeSymptomSettings/saveSymptomSettings/
//    updateSymptomSettingDisplayが対象とするDOM（symptom-setting-display等の
//    設定画面トリガー行）は現行app.html/settings.htmlに存在せず、window bridge
//    経由での呼び出し元も見つからなかった（openSymptomSettings同様、現行UIから
//    到達不能）。overlay自体（symptomSettingsOverlay/symptomSettingsChips）と
//    そのonclick文字列は残存しており挙動は変更していない（Scope外・現状維持）。
// ================================================================

var ALL_SYMPTOMS = ['頭痛','腰痛','肩こり','むくみ','冷え','便秘','下痢','肌荒れ','不眠','眠気','イライラ','不安感','食欲増加','食欲不振','胸の張り','下腹部痛','めまい','吐き気','倦怠感','関節痛'];

export function openSymptomSettings(){
  var saved = window.state.mySymptoms || [];
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

export function closeSymptomSettings(){
  document.getElementById('symptomSettingsOverlay').style.display = 'none';
}

export function saveSymptomSettings(){
  var selected = [];
  document.querySelectorAll('#symptomSettingsChips .chip.selected').forEach(function(c){
    selected.push(c.getAttribute('data-val'));
  });
  window.state.mySymptoms = selected;
  if (typeof window.saveState === 'function') window.saveState();
  var display = document.getElementById('symptom-setting-display');
  if(display){
    display.textContent = selected.length ? selected.join('・') : '設定する';
  }
  closeSymptomSettings();
  if (typeof window.updateRecordSymptoms === 'function') window.updateRecordSymptoms();
}

export function updateSymptomSettingDisplay(){
  if (!window.__ippoStateReady) {
    if (typeof window.enqueueDeferredRender === 'function') window.enqueueDeferredRender('updateSymptomSettingDisplay', updateSymptomSettingDisplay);
    return;
  }
  var display = document.getElementById('symptom-setting-display');
  if(!display) return;
  var saved = window.state.mySymptoms || [];
  display.textContent = saved.length ? saved.join('・') : '設定する';
}

export function getRecentSymptoms() {
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

export function saveSymptomSelection(symptoms) {
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

// ===== 疾患別症状チップ優先表示 =====
export function buildSymptomChips() {
  var prioritized = [];
  var diseases = window.state.myDiseases || [];

  // 疾患別症状を優先的に追加
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (prioritized.indexOf(s) === -1) prioritized.push(s);
    });
  });

  // ユーザー設定の症状を次に追加
  var userSymptoms = window.state.selectedSymptoms || [];
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

export function applySymptomChipPriority() {
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

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.applySymptomChipPriority     = applySymptomChipPriority;
window.buildSymptomChips            = buildSymptomChips;
window.closeSymptomSettings         = closeSymptomSettings;
window.getRecentSymptoms            = getRecentSymptoms;
window.openSymptomSettings          = openSymptomSettings;
window.saveSymptomSelection         = saveSymptomSelection;
window.saveSymptomSettings          = saveSymptomSettings;
window.updateSymptomSettingDisplay  = updateSymptomSettingDisplay;
