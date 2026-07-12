// ================================================================
//  ippo – src/modules/fasting.js
//  PR-085 (Legacy Removal Batch-7): Fasting Timer
//
//  app-legacy.js の断食タイマー機能
//  （setFastGoal/endFast/startFastTimer/resumeFasting/updateFastingWidgetPhase/
//  toggleFastingFeature/applyFastingVisibility）を物理移動。Business Logic変更なし。
//
//  ・FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDE は toggleFast()（app-legacy.js側に残置、
//    Batch-7対象外）も参照するため、本ファイルをsource of truthとしexport
//    → app-legacy.js側でimport back（既存の物理移動→import-back idiomと同型）。
//  ・fastInterval（module-scope タイマーID）と window.__ippoStopFastInterval
//    ブリッジ（PR-084で data-export.js の clearData() から呼ばれる）も本ファイルへ
//    完全移動。
//  ・getCurrentCyclePhase()/showRecoveryGuide() は app-legacy.js 側にも同名の
//    薄いwindowブリッジ委譲ラッパーが残る（toggleFast等のBatch-7対象外関数が使用）ため、
//    本ファイルにも同一実装をローカル複製（真の実装はそれぞれ別モジュール側にあり、
//    ここは単なる委譲ラッパーの複製でBusiness Logic重複ではない）。
//  ・bare `state` → `window.state`（_ippoStateHooks経由、既存idiomと同型）。
//  ・saveState()（app-legacy.js側に残置）は window.saveState() 経由のguarded呼び出しに変更
//    （既存コードで多用されているidiomと同型）。
//  ・endFast内の bare `saveAndSync()` は、window.saveAndSync が
//    record-modal-controller.js のPhase D-1パターンに既に先取りされ現状no-opのため、
//    専用ブリッジ window.__ippoLegacySaveAndSync() 経由に変更
//    （PR-084 window.__ippoLegacyUpdateStats と同型パターン）。
// ================================================================

function getCurrentCyclePhase(){return typeof window.getCurrentCyclePhase==='function'?window.getCurrentCyclePhase():null;}
function showRecoveryGuide(){if(typeof window.showRecoveryGuide==='function')window.showRecoveryGuide();}

export var FAST_PHASE_CONFIG = {
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
export var FAST_DISEASE_OVERRIDE = {
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

// ===== FASTING TIMER =====
let fastInterval = null;
// PR-084由来: clearData（data-export.js側）が fastInterval をリセットするための専用ブリッジ
// （PR-080E window.__ippoGetBowelCount と同型パターン）。PR-085で本ファイルへ完全移動。
window.__ippoStopFastInterval = function () {
  if (fastInterval !== null) {
    clearInterval(fastInterval);
    fastInterval = null;
  }
};

export function setFastGoal(h, el) {
  window.state.fastGoal = h;
  if (typeof window.saveState === 'function') window.saveState();
  document.querySelectorAll('.fw-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
}

export function endFast() {
  if (!window.state.fastingActive) return;
  const elapsed = (Date.now() - window.state.fastingStart) / 1000 / 3600;
  window.state.fastingActive = false;
  window.state.fastingStart = null;
  window.state.fastingEnded = Date.now();
  clearInterval(fastInterval);

  // タイマー結果を今日の記録に保存
  var todayStr = new Date().toDateString();
  var rec = null;
  for(var i=0; i<window.state.records.length; i++){
    if(new Date(window.state.records[i].date).toDateString() === todayStr){ rec = window.state.records[i]; break; }
  }
  if(!rec){
    var _now = new Date();
    rec = { date: _now.toISOString(), record_date: _now.toISOString().slice(0, 10) };
    window.state.records.push(rec);
  }
  rec.fastingTimer = Math.round(elapsed * 10) / 10;
  rec.fastingGoal = window.state.fastGoal || 16;

  if (typeof window.saveState === 'function') window.saveState();
  if (typeof window.__ippoLegacySaveAndSync === 'function') window.__ippoLegacySaveAndSync();
  document.getElementById('fast-start-btn').style.display = 'block';
  document.getElementById('fast-stop-btn').style.display = 'none';
  document.getElementById('fast-timer').textContent = '00:00:00';
  document.getElementById('fast-status').textContent = `終了: ${elapsed.toFixed(1)}h 達成！`;

  // 回復食ガイドを表示
  showRecoveryGuide();
}

export function resumeFasting() {
  // Restore pill active state from saved goal
  document.querySelectorAll('.fw-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.textContent) === window.state.fastGoal);
  });
  document.getElementById('fast-start-btn').style.display = 'none';
  document.getElementById('fast-stop-btn').style.display = 'block';
  document.getElementById('fast-status').textContent = `目標：${window.state.fastGoal}時間`;
  startFastTimer();
}

export function startFastTimer() {
  // Always clear before starting — prevents double-run on re-render
  if (fastInterval !== null) {
    clearInterval(fastInterval);
    fastInterval = null;
  }
  fastInterval = setInterval(() => {
    if (!window.state.fastingStart) return;
    const elapsed = Date.now() - window.state.fastingStart;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    const fmt = v => String(v).padStart(2, '0');
    const timerEl = document.getElementById('fast-timer');
    const statusEl = document.getElementById('fast-status');
    if (!timerEl || !statusEl) { clearInterval(fastInterval); fastInterval = null; return; }
    timerEl.textContent = `${fmt(h)}:${fmt(m)}:${fmt(s)}`;
    const goalMs = window.state.fastGoal * 3600000;
      if (elapsed >= goalMs) {
      statusEl.textContent = '🎉 ' + window.state.fastGoal + 'h 達成！';
      if (!window.state.fastingNotified) {
        window.state.fastingNotified = true;
        if (typeof window.saveState === 'function') window.saveState();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('ippo 🌸ファスティング達成！', {
            body: window.state.fastGoal + '時間のファスティングを達成しました！おつかれさまです。',
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

export function updateFastingWidgetPhase() {
  var infoEl = document.getElementById('fast-phase-info');
  if (!infoEl) return;

  var phase = getCurrentCyclePhase();
  var diseases = window.state.myDiseases || [];

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

// ===== ファスティング機能のオプション化 =====
export function toggleFastingFeature() {
  window.state.fastingEnabled = !window.state.fastingEnabled;
  if (typeof window.saveState === 'function') window.saveState();
  applyFastingVisibility();
  var label = document.getElementById('fasting-toggle-label');
  if (label) label.textContent = window.state.fastingEnabled ? 'オン' : 'オフ';
}

export function applyFastingVisibility() {
  var widget = document.getElementById('home-fasting-widget');
  var recoveryCard = document.getElementById('fast-recovery-card');
  var show = !!window.state.fastingEnabled;
  if (widget) widget.style.display = show ? 'block' : 'none';
  if (recoveryCard) recoveryCard.style.display = 'none'; // 終了時のみ表示
  // ファスティング中なら強制表示
  if (window.state.fastingActive && widget) widget.style.display = 'block';
  // ラベル更新
  var label = document.getElementById('fasting-toggle-label');
  if (label) label.textContent = show ? 'オン' : 'オフ';
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('fasting-loaded');
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.applyFastingVisibility   = applyFastingVisibility;
window.endFast                  = endFast;
window.resumeFasting            = resumeFasting;
window.setFastGoal              = setFastGoal;
window.startFastTimer           = startFastTimer;
window.toggleFastingFeature     = toggleFastingFeature;
window.updateFastingWidgetPhase = updateFastingWidgetPhase;
