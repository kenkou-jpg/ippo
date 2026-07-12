// ============================================================
// ippo – src/modules/onboarding-runtime.js
// Phase D-2: onboarding 完了フローの module 化
//
// completeOnboarding / finishOnboarding を module へ移植。
// welcome-runtime.js との統合により、完了後の shouldShowMain()
// チェックが一貫して機能することを保証する。
//
// 依存（すべて window 経由）:
//   showMain（home-next 有効時は home-next-shell.js が showHomeNext に差し替え）、
//   updateHistory, buildCalendar, updateStats, reorderRecordSections
// ============================================================

import { shouldShowMain } from './welcome-runtime.js';
import { getState, setState, saveState } from '../store/state.js';

function call(name) {
  if (typeof window[name] === 'function') window[name]();
}

export function completeOnboarding() {
  setState(Object.assign({}, getState(), { _onboardingDone: true }));
  saveState();
  finishOnboarding();
}

export function finishOnboarding() {
  // welcome-runtime に委譲してメイン画面判定
  if (!shouldShowMain()) return;

  // ホーム画面の表示・描画は window.showMain() に委譲する。home-next 有効時
  // （デフォルト）は home-next-shell.js の initHomeNext() が window.showMain を
  // showHomeNext へ差し替えているため、ここで showScreen('home') 等を直接呼ぶと
  // home-next を経由せず旧 screen-home が表示されてしまう
  // （2026-07-12 HANDOFF記載「はじめる」完了直後の不要画面バグの原因）。
  call('showMain');

  // home 描画に含まれない独立した関数のみ個別に呼ぶ
  call('updateHistory');
  call('buildCalendar');
  call('updateStats');
  call('reorderRecordSections');
}

function handleObClick(e) {
  const actionEl = e.target.closest('[data-ob-action]');
  if (actionEl) {
    const action = actionEl.dataset.obAction;
    const fnMap = {
      'next':               'obNext',
      'skip-all':           'obSkipAll',
      'save-name':          'obSaveName',
      'save-birth':         'obSaveBirth',
      'save-period':        'obSavePeriod',
      'save-cycle':         'obSaveCycle',
      'save-diseases':      'obSaveDiseases',
      'save-purpose':       'obSavePurpose',
      'save-reminder':      'obSaveReminder',
      'complete':           'obComplete',
    };
    if (action === 'complete-onboarding') { completeOnboarding(); return; }
    const fn = fnMap[action];
    if (fn && typeof window[fn] === 'function') window[fn]();
    return;
  }

  const diseaseEl = e.target.closest('[data-ob-disease]');
  if (diseaseEl && typeof window.obToggleDisease === 'function') {
    window.obToggleDisease(diseaseEl, diseaseEl.dataset.obDisease);
    return;
  }

  const dateEl = e.target.closest('[data-ob-date]');
  if (dateEl && !dateEl.dataset.obDateFuture && typeof window.obSelectPeriodDay === 'function') {
    window.obSelectPeriodDay(dateEl.dataset.obDate);
  }
}

export function bindOnboardingEvents() {
  const welcome = document.getElementById('screen-welcome');
  if (!welcome) return;
  welcome.addEventListener('click', handleObClick);
}

window.completeOnboarding   = completeOnboarding;
window.finishOnboarding     = finishOnboarding;
window.bindOnboardingEvents = bindOnboardingEvents;

// ─── Onboarding Step Functions (Phase 4-C: migrated from app-legacy.js) ───

var _obStep = 0;
var _obPeriodSelected  = null;
var _obCycleSelected   = null;
var _obDiseasesSelected = [];
var _obPurposeSelected  = null;
var _obReminderSelected = null;

export function obInit() {
  var indicator = document.getElementById('ob-indicator');
  if (indicator) {
    indicator.innerHTML = '';
    for (var i = 1; i <= 7; i++) {
      var dot = document.createElement('div');
      dot.className = 'ob-dot'; dot.id = 'ob-dot-' + i;
      indicator.appendChild(dot);
    }
  }
  var sel = document.getElementById('ob-birth-year');
  if (sel) {
    var currentYear = new Date().getFullYear();
    for (var y = currentYear - 10; y >= 1955; y--) {
      var opt = document.createElement('option');
      opt.value = y; opt.textContent = y; sel.appendChild(opt);
    }
  }
  var cycleChips = document.getElementById('ob-cycle-chips');
  if (cycleChips) {
    ['21日','24日','25日','28日','30日','32日','35日以上','不規則'].forEach(function(c) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip-inline'; btn.textContent = c;
      btn.onclick = function() {
        cycleChips.querySelectorAll('.ob-chip-inline').forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected'); _obCycleSelected = c;
      };
      cycleChips.appendChild(btn);
    });
  }
  var s = window.getState ? window.getState() : (window.state || {});
  _obDiseasesSelected = (s.myDiseases || []).slice();

  var diseaseList = document.getElementById('ob-disease-list-new');
  if (diseaseList) {
    var DISEASE_CONFIG = window.DISEASE_CONFIG || {};
    var categories = {
      '婦人科疾患': ['卵巣嚢腫','子宮内膜症','子宮筋腫','子宮腺筋症'],
      'ホルモン・周期': ['PCOS','PMS/PMDD','更年期障害','不妊症・排卵障害'],
      '骨盤・その他': ['骨盤臓器脱','外陰痛症候群','慢性骨盤痛']
    };
    var html = '';
    Object.keys(categories).forEach(function(cat) {
      html += '<div style="font-size:10px;letter-spacing:0.12em;color:var(--ink-light);margin:14px 0 7px;text-transform:uppercase;">' + cat + '</div>';
      categories[cat].forEach(function(d) {
        var cfg = DISEASE_CONFIG[d]; if (!cfg) return;
        var preSelected = _obDiseasesSelected.indexOf(d) !== -1;
        var checkStyle = preSelected
          ? 'width:20px;height:20px;border-radius:50%;border:1.5px solid var(--rose);background:var(--rose);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;transition:all 0.2s;'
          : 'width:20px;height:20px;border-radius:50%;border:1.5px solid #e8ddd8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent;transition:all 0.2s;';
        html += '<div class="ob-chip' + (preSelected ? ' selected' : '') + '" data-ob-disease="' + d.replace(/"/g, '&quot;') + '" data-selected="' + (preSelected ? '1' : '0') + '" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
        html += '<div><div style="font-size:13px;font-weight:500;color:var(--ink);">' + d + '</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">' + cfg.questions.length + '項目のセルフチェック対応</div></div>';
        html += '<div class="ob-check-mark" style="' + checkStyle + '">✓</div></div>';
      });
    });
    diseaseList.innerHTML = html;
  }
  var purposeChips = document.getElementById('ob-purpose-chips');
  if (purposeChips) {
    [
      { v:'clinic',  label:'診察前の記録を残したい',   sub:'医師に伝えやすい形でデータを整理します' },
      { v:'daily',   label:'毎日の体調を管理したい',   sub:'からだのパターンを発見するサポートをします' },
      { v:'both',    label:'両方使いたい',             sub:'記録と診察サポートの両方に対応します' },
      { v:'unknown', label:'まだわからない',           sub:'あとで設定から変更できます' }
    ].forEach(function(p) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip';
      btn.innerHTML = '<div style="font-weight:500;">' + p.label + '</div><div style="font-size:11px;color:var(--ink-light);margin-top:3px;">' + p.sub + '</div>';
      btn.onclick = function() { purposeChips.querySelectorAll('.ob-chip').forEach(function(b){b.classList.remove('selected');}); btn.classList.add('selected'); _obPurposeSelected = p.v; };
      purposeChips.appendChild(btn);
    });
  }
  var reminderChips = document.getElementById('ob-reminder-chips');
  if (reminderChips) {
    [
      { v:'08:00', label:'朝 8:00 に通知',    sub:'記録を朝の習慣にする' },
      { v:'12:00', label:'昼 12:00 に通知',   sub:'昼休みに記録する' },
      { v:'21:00', label:'夜 21:00 に通知',   sub:'就寝前に今日を振り返る' },
      { v:'none',  label:'リマインダーは不要', sub:'あとで設定から変更できます' }
    ].forEach(function(r) {
      var btn = document.createElement('button');
      btn.className = 'ob-chip';
      btn.innerHTML = '<div style="font-weight:500;">' + r.label + '</div><div style="font-size:11px;color:var(--ink-light);margin-top:3px;">' + r.sub + '</div>';
      btn.onclick = function() { reminderChips.querySelectorAll('.ob-chip').forEach(function(b){b.classList.remove('selected');}); btn.classList.add('selected'); _obReminderSelected = r.v; };
      reminderChips.appendChild(btn);
    });
  }
  obBuildPeriodCalendar();
}

export function obBuildPeriodCalendar() {
  var container = document.getElementById('ob-period-calendar');
  if (!container) return;
  var now = new Date();
  var months = [new Date(now.getFullYear(), now.getMonth()-1, 1), new Date(now.getFullYear(), now.getMonth(), 1)];
  var html = '';
  months.forEach(function(firstDay) {
    var year = firstDay.getFullYear(), month = firstDay.getMonth();
    var daysInMonth = new Date(year, month+1, 0).getDate();
    var startDow = firstDay.getDay();
    html += '<div style="margin-bottom:12px;"><div style="font-size:11px;font-weight:500;color:var(--ink-light);text-align:center;margin-bottom:6px;">' + year + '年 ' + (month+1) + '月</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:10px;color:var(--ink-light);margin-bottom:4px;">';
    ['日','月','火','水','木','金','土'].forEach(function(d){html+='<div>'+d+'</div>';});
    html += '</div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">';
    for (var i=0; i<startDow; i++) html += '<div></div>';
    var todayStr = now.toISOString().slice(0,10);
    for (var day=1; day<=daysInMonth; day++) {
      var dateStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(day).padStart(2,'0');
      var isFuture = dateStr > todayStr, isSelected = _obPeriodSelected === dateStr;
      html += '<div data-ob-date="'+dateStr+'" '+(isFuture?'data-ob-date-future="1" ':'')+'id="ob-cal-'+dateStr+'" style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;cursor:'+(isFuture?'default':'pointer')+';transition:all 0.15s;'+(isFuture?'color:#e0d0c8;':isSelected?'background:var(--rose);color:white;font-weight:500;':dateStr===todayStr?'border:1.5px solid var(--rose);color:var(--rose);':'color:var(--ink);')+'">'+day+'</div>';
    }
    html += '</div></div>';
  });
  container.innerHTML = html;
}

export function obSelectPeriodDay(dateStr) {
  _obPeriodSelected = dateStr;
  document.querySelectorAll('[id^="ob-cal-"]').forEach(function(el) {
    var d = el.id.replace('ob-cal-','');
    var now = new Date().toISOString().slice(0,10);
    el.style.background=''; el.style.color=d===now?'var(--rose)':'var(--ink)'; el.style.fontWeight='';
    if(d===now) el.style.border='1.5px solid var(--rose)'; else el.style.border='';
  });
  var sel = document.getElementById('ob-cal-'+dateStr);
  if (sel) { sel.style.background='var(--rose)'; sel.style.color='white'; sel.style.fontWeight='500'; sel.style.border=''; }
  var disp = document.getElementById('ob-period-selected');
  if (disp) { var d=new Date(dateStr+'T00:00:00'); disp.textContent=(d.getMonth()+1)+'月'+d.getDate()+'日を選択中'; }
}

export function obToggleDisease(el, disease) {
  var isSelected = el.getAttribute('data-selected') === '1';
  if (isSelected) {
    el.setAttribute('data-selected','0'); el.classList.remove('selected');
    el.querySelector('.ob-check-mark').style.cssText='width:20px;height:20px;border-radius:50%;border:1.5px solid #e8ddd8;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:transparent;transition:all 0.2s;';
    _obDiseasesSelected = _obDiseasesSelected.filter(function(d){return d!==disease;});
  } else {
    el.setAttribute('data-selected','1'); el.classList.add('selected');
    el.querySelector('.ob-check-mark').style.cssText='width:20px;height:20px;border-radius:50%;border:1.5px solid var(--rose);background:var(--rose);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;transition:all 0.2s;';
    if (_obDiseasesSelected.indexOf(disease)===-1) _obDiseasesSelected.push(disease);
  }
}

export function obShowStep(n) {
  for (var i=0; i<=8; i++) { var el=document.getElementById('ob-step-'+i); if(el) el.style.display='none'; }
  var target=document.getElementById('ob-step-'+n); if(target) target.style.display='block';
  var indicator=document.getElementById('ob-indicator');
  if (n>=1 && n<=7) {
    if(indicator) indicator.style.display='flex';
    for(var j=1;j<=7;j++){var dot=document.getElementById('ob-dot-'+j);if(dot) dot.className='ob-dot'+(j<=n?' active':'');}
  } else { if(indicator) indicator.style.display='none'; }
  _obStep=n; window.scrollTo(0,0);
}

export function obNext()    { obShowStep(_obStep+1); }
export function obSkipAll() { if(typeof window.completeOnboarding==='function') window.completeOnboarding(); }

export function obSaveName() {
  var val=(document.getElementById('ob-name-input').value||'').trim();
  var s=window.getState?window.getState():(window.state||{});
  if(val){if(window.setState)window.setState(Object.assign({},s,{name:val}));else s.name=val;}
  var disp=document.getElementById('ob-name-display'); if(disp) disp.textContent=val||'あなた';
  obNext();
}

export function obSaveBirth() {
  var val=document.getElementById('ob-birth-year').value;
  var s=window.getState?window.getState():(window.state||{});
  if(val){if(window.setState)window.setState(Object.assign({},s,{birthYear:parseInt(val)}));else s.birthYear=parseInt(val);}
  obNext();
}

export function obSavePeriod() {
  if (_obPeriodSelected) {
    var s=window.getState?window.getState():(window.state||{});
    if(window.setState)window.setState(Object.assign({},s,{lastPeriodDate:_obPeriodSelected}));else s.lastPeriodDate=_obPeriodSelected;
  }
  obNext();
}

export function obSaveCycle() {
  if (_obCycleSelected) {
    var s=window.getState?window.getState():(window.state||{});
    var num=parseInt(_obCycleSelected);
    var upd={cycleLength:isNaN(num)?28:num,cycleIrregular:_obCycleSelected==='不規則'};
    if(window.setState)window.setState(Object.assign({},s,upd));else Object.assign(s,upd);
  }
  obNext();
}

export function obSaveDiseases() {
  var s=window.getState?window.getState():(window.state||{});
  if(window.setState)window.setState(Object.assign({},s,{myDiseases:_obDiseasesSelected.slice()}));else s.myDiseases=_obDiseasesSelected.slice();
  var display=document.getElementById('disease-setting-display');
  if(display) display.textContent=_obDiseasesSelected.length>0?_obDiseasesSelected.join('・'):'設定する';
  if(typeof window.saveState==='function') window.saveState();
  obNext();
}

export function obSavePurpose() {
  if (_obPurposeSelected){var s=window.getState?window.getState():(window.state||{});if(window.setState)window.setState(Object.assign({},s,{purpose:_obPurposeSelected}));else s.purpose=_obPurposeSelected;}
  obNext();
}

export function obSaveReminder() {
  if (_obReminderSelected && _obReminderSelected!=='none'){
    var s=window.getState?window.getState():(window.state||{});
    if(window.setState)window.setState(Object.assign({},s,{reminderTime:_obReminderSelected}));else s.reminderTime=_obReminderSelected;
    if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
  }
  obComplete();
}

export function obComplete() {
  var s=window.getState?window.getState():(window.state||{});
  if (s.lastPeriodDate && s.cycleLength) {
    var summary=document.getElementById('ob-cycle-summary'), phaseEl=document.getElementById('ob-cycle-phase'), nextEl=document.getElementById('ob-cycle-next');
    if (summary && phaseEl && nextEl) {
      var today=new Date(), last=new Date(s.lastPeriodDate+'T00:00:00');
      var dayNum=Math.floor((today-last)/86400000)+1;
      var phase=typeof window.getCurrentCyclePhase==='function'?window.getCurrentCyclePhase():null;
      phaseEl.textContent='周期 '+dayNum+'日目'+(phase?'（'+phase+'）':'');
      var daysLeft=s.cycleLength-dayNum;
      nextEl.textContent=daysLeft>0?'次の生理まで約 '+daysLeft+' 日':'生理が近い時期です';
      summary.style.display='block';
    }
  }
  obShowStep(8);
}

window.obInit            = obInit;
window.obBuildPeriodCalendar = obBuildPeriodCalendar;
window.obSelectPeriodDay = obSelectPeriodDay;
window.obToggleDisease   = obToggleDisease;
window.obShowStep        = obShowStep;
window.obNext            = obNext;
window.obSkipAll         = obSkipAll;
window.obSaveName        = obSaveName;
window.obSaveBirth       = obSaveBirth;
window.obSavePeriod      = obSavePeriod;
window.obSaveCycle       = obSaveCycle;
window.obSaveDiseases    = obSaveDiseases;
window.obSavePurpose     = obSavePurpose;
window.obSaveReminder    = obSaveReminder;
window.obComplete        = obComplete;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('onboarding-runtime-loaded');
}
