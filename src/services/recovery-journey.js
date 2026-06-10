// ============================================================
//  ippo – src/services/recovery-journey.js
//  PHASE 7: Recovery Journey / Life Integration Layer
//
//  設計原則:
//  - rule-based / local-first / lightweight
//  - post-save hook 不使用: companion-intelligence キャッシュを利用
//  - 「改善しました」は言わない。「流れ」「変化」「傾向」のみ
//  - 禁止: 診断 / 断定 / 強制改善 / 感情スコア
//  - トーン: 「〜してきているようです」「〜が続いていたようです」
// ============================================================

import { shouldShowExperiment, recordExperimentShown, recordClimateEntry } from './life-rhythm-memory.js';

// ─── Helpers ──────────────────────────────────────────────

function _sliceDays(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

function _sliceBetweenDays(records, fromDays, toDays) {
  const from = new Date(); from.setDate(from.getDate() - toDays);
  const to   = new Date(); to.setDate(to.getDate() - fromDays);
  return (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d > from && d <= to && !isNaN(d.getTime());
  });
}

function _isGoodSleep(r) {
  return (r.snapshot && r.snapshot.sleep === 'wellSlept') ||
         (r.sleepQuality != null && r.sleepQuality <= 1);
}

function _isPoorSleep(r) {
  return (r.snapshot && (r.snapshot.sleep === 'hardlySlept' || r.snapshot.sleep === 'wokeUp')) ||
         (r.sleepQuality != null && r.sleepQuality >= 3);
}

function _isFatigue(r) {
  return (r.symptomDetails || []).some(function(d) { return d && d.symptom === 'だるさ'; }) ||
         (r.symptoms || []).some(function(s) { return s === 'だるさ' || s === '倦怠感'; });
}

function _isGoodCondition(r) {
  return (r.snapshot && (r.snapshot.condition === 'great' || r.snapshot.condition === 'good')) ||
         (r.mood != null && r.mood >= 4);
}

const _POS_EMOTIONS = ['calm', 'happy', 'relaxed', 'grateful', 'positive'];
const _NEG_EMOTIONS = ['anxious', 'irritated', 'down'];

// ─── Seasonal awareness ───────────────────────────────────

function _getSeason(month) {
  if (month >= 3 && month <= 5)  return 'spring';
  if (month >= 6 && month <= 8)  return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

function _isSeasonalTransition(month) {
  return [3, 6, 9, 12].includes(month);
}

// ─── Recovery rhythm dots ─────────────────────────────────
// 直近14日分の体調ドット (HTML文字列を返す)

function _buildRhythmDots(records) {
  const result = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const rec = (records || []).find(function(r) {
      return (r.date || r.record_date || '').slice(0, 10) === dateStr;
    });
    if (!rec) {
      result.push('<span class="hn-rhy-dot hn-rhy-empty"></span>');
    } else if (_isGoodCondition(rec)) {
      result.push('<span class="hn-rhy-dot hn-rhy-good"></span>');
    } else if (
      (rec.snapshot && (rec.snapshot.condition === 'slightlyBad' || rec.snapshot.condition === 'tough')) ||
      (rec.mood != null && rec.mood <= 2)
    ) {
      result.push('<span class="hn-rhy-dot hn-rhy-low"></span>');
    } else {
      result.push('<span class="hn-rhy-dot hn-rhy-normal"></span>');
    }
  }
  return result.join('');
}

// ─── Recovery Journey Rules ───────────────────────────────

function _journeySleepTrend(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3 || prev7.length < 3) return null;

  const recRate  = rec7.filter(_isGoodSleep).length  / rec7.length;
  const prevRate = prev7.filter(_isGoodSleep).length / prev7.length;

  if (recRate > prevRate + 0.20 && recRate >= 0.45) {
    return {
      id:   'journey_sleep_improving',
      text: 'この1〜2週間、\n少しずつ睡眠が落ち着いてきているようです',
      type: 'recovery',
    };
  }
  return null;
}

function _journeyFatigueTrend(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3 || prev7.length < 3) return null;

  const recFatigue  = rec7.filter(_isFatigue).length;
  const prevFatigue = prev7.filter(_isFatigue).length;

  if (prevFatigue >= 3 && recFatigue < prevFatigue - 1) {
    return {
      id:   'journey_fatigue_reducing',
      text: '最近、疲れが強い日の波が\n少し落ち着いてきているようです',
      type: 'recovery',
    };
  }
  return null;
}

function _journeyConditionRhythm(records) {
  const month30 = _sliceDays(records, 30);
  if (month30.length < 8) return null;

  const goodDays = month30.filter(_isGoodCondition).length;
  const ratio    = goodDays / month30.length;

  // 安定した体調が続いている場合
  if (ratio >= 0.55 && month30.length >= 10) {
    return {
      id:   'journey_condition_stable',
      text: 'この1ヶ月、\n体調が比較的落ち着いた日が続いているようです',
      type: 'stable',
    };
  }
  return null;
}

// ─── Emotional Climate Rules ─────────────────────────────

function _climateCalmBuilding(records) {
  const rec7  = _sliceDays(records, 7);
  const prev7 = _sliceBetweenDays(records, 7, 14);
  if (rec7.length < 3) return null;

  const recCalmRate = rec7.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _POS_EMOTIONS.includes(t); });
  }).length / rec7.length;

  const prevCalmRate = prev7.length > 0
    ? prev7.filter(function(r) {
        const tags = (r.emotions && r.emotions.tags) || [];
        return tags.some(function(t) { return _POS_EMOTIONS.includes(t); });
      }).length / prev7.length
    : 0;

  if (recCalmRate >= 0.50 && recCalmRate > prevCalmRate + 0.10) {
    return {
      id:      'climate_calm_building',
      text:    '穏やかな記録が、\n少し増えてきています',
      type:    'calm',
      climate: 'calm',
    };
  }
  return null;
}

function _climateTension(records, currentMode) {
  if (currentMode === 'anxious') return null; // 不安を増幅させない

  const rec7 = _sliceDays(records, 7);
  if (rec7.length < 4) return null;

  const tensionDays = rec7.filter(function(r) {
    const tags = (r.emotions && r.emotions.tags) || [];
    return tags.some(function(t) { return _NEG_EMOTIONS.includes(t); });
  });

  if (tensionDays.length / rec7.length > 0.50) {
    return {
      id:      'climate_tension',
      text:    '最近、少し張りつめる日が\n続いていたようです',
      type:    'tension',
      climate: 'tension',
    };
  }
  return null;
}

// ─── Gentle Experiment Rules ─────────────────────────────

function _experimentBySleep(records, currentMode) {
  const rec3 = _sliceDays(records, 3);
  if (rec3.length < 2) return null;
  const poorCount = rec3.filter(_isPoorSleep).length;
  if (poorCount < 2) return null;

  return {
    id:   'experiment_early_rest',
    text: '今夜は少し、\n早めに休む日を試してみますか？',
    type: 'sleep',
  };
}

function _experimentByFatigue(records) {
  const rec7 = _sliceDays(records, 7);
  if (rec7.length < 4) return null;
  if (rec7.filter(_isFatigue).length < 3) return null;

  return {
    id:   'experiment_rest_time',
    text: '今日は少し、\n休める時間があるといいですね',
    type: 'rest',
  };
}

function _experimentByMode(currentMode) {
  if (currentMode === 'anxious') {
    return {
      id:   'experiment_quiet_time',
      text: '少し静かな時間を作れると、\n体が休まりやすいかもしれません',
      type: 'calm',
    };
  }
  if (currentMode === 'tired') {
    return {
      id:   'experiment_reduce_load',
      text: '少し負荷を減らせる時間があると、\n体が助かるかもしれません',
      type: 'rest',
    };
  }
  return null;
}

// ─── Seasonal Awareness ───────────────────────────────────

function _seasonalObservation(records) {
  const month  = new Date().getMonth() + 1; // 1-12
  const season = _getSeason(month);
  const rec14  = _sliceDays(records, 14);
  const fatigue14 = rec14.filter(_isFatigue).length;

  if (_isSeasonalTransition(month)) {
    return {
      id:   'seasonal_transition',
      text: '季節の変わり目は、\nからだが変化に対応しようとしている時期です',
      type: 'seasonal',
    };
  }

  if (season === 'summer' && fatigue14 >= 4) {
    return {
      id:   'seasonal_summer_fatigue',
      text: '夏の疲れが出やすい時期かもしれません。\nからだの声を聞きながら過ごしましょう',
      type: 'seasonal',
    };
  }

  if (season === 'winter') {
    const poorSleep14 = rec14.filter(_isPoorSleep).length;
    if (poorSleep14 >= 4) {
      return {
        id:   'seasonal_winter_sleep',
        text: '冬は体が休息を求めやすい時期です。\n睡眠が短くなりやすいことがあります',
        type: 'seasonal',
      };
    }
  }

  return null;
}

// ─── Public: generateRecoveryJourney ─────────────────────

/**
 * Recovery journey card を生成 (0-1件)。
 * dots: 14日分の体調リズムドット HTML を含む。
 */
export function generateRecoveryJourney(context) {
  if (!context || context.dataRichness === 'sparse') return null;

  const records = context.recentRecords || [];
  const allRecords = context._allRecords || records;

  const rules = [
    function() { return _journeySleepTrend(allRecords); },
    function() { return _journeyFatigueTrend(allRecords); },
    function() { return _journeyConditionRhythm(allRecords); },
  ];

  let journey = null;
  for (const rule of rules) {
    try { journey = rule(); if (journey) break; } catch (_) {}
  }

  if (!journey) return null;

  return Object.assign({}, journey, {
    dots: _buildRhythmDots(allRecords),
  });
}

// ─── Public: generateEmotionalClimate ────────────────────

/**
 * Emotional climate card を生成 (0-1件)。
 * 感情を「良い/悪い」ではなく「気候」として扱う。
 */
export function generateEmotionalClimate(context) {
  if (!context || context.dataRichness === 'sparse') return null;

  const records     = context._allRecords || context.recentRecords || [];
  const currentMode = context.settingsProfile && context.settingsProfile.currentMode;

  const rules = [
    function() { return _climateCalmBuilding(records); },
    function() { return _climateTension(records, currentMode); },
  ];

  let climate = null;
  for (const rule of rules) {
    try { climate = rule(); if (climate) break; } catch (_) {}
  }

  if (climate && climate.climate) {
    try { recordClimateEntry(climate.climate); } catch (_) {}
  }

  return climate;
}

// ─── Public: generateGentleExperiment ────────────────────

/**
 * Gentle experiment を生成 (0-1件)。3日クールダウン付き。
 * 「命令」ではなく「試してみる」感覚。
 */
export function generateGentleExperiment(context) {
  if (!context) return null;
  if (!shouldShowExperiment()) return null;

  const records     = context._allRecords || context.recentRecords || [];
  const currentMode = context.settingsProfile && context.settingsProfile.currentMode;

  const rules = [
    function() { return _experimentByMode(currentMode); },
    function() { return _experimentBySleep(records, currentMode); },
    function() { return _experimentByFatigue(records); },
  ];

  for (const rule of rules) {
    try {
      const exp = rule();
      if (exp) {
        try { recordExperimentShown(exp.type); } catch (_) {}
        return exp;
      }
    } catch (_) {}
  }

  return null;
}

// ─── Public: generateSeasonalObservation ─────────────────

/** 季節的な観察を生成 (0-1件)。 */
export function generateSeasonalObservation(context) {
  if (!context || context.dataRichness === 'sparse') return null;
  const records = context._allRecords || context.recentRecords || [];
  try { return _seasonalObservation(records); } catch (_) { return null; }
}

// ─── Public: buildLifeRhythmContext ──────────────────────

/**
 * companion context を拡張して life rhythm context を返す。
 * 将来の AI provider hook として公開。
 */
export function buildLifeRhythmContext(state) {
  const ci = window.ippoCompanionIntelligence;
  const base = ci ? ci.buildCompanionContext(state) : {};

  const records = (state && state.records) || [];
  const month   = new Date().getMonth() + 1;

  return Object.assign({}, base, {
    _allRecords:   records,
    season:        _getSeason(month),
    month,
    isSeasonalTransition: _isSeasonalTransition(month),
    lifeRhythmMemory: (function() {
      try {
        const lrm = window.ippoLifeRhythmMemory;
        return lrm ? lrm.getLifeRhythmMemory() : null;
      } catch (_) { return null; }
    })(),
  });
}

// ─── Window 公開 ──────────────────────────────────────────

window.ippoRecoveryJourney = Object.freeze({
  generateRecoveryJourney,
  generateEmotionalClimate,
  generateGentleExperiment,
  generateSeasonalObservation,
  buildLifeRhythmContext,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('recovery-journey-loaded');
}

// ─── Fasting Recovery Guide / Binge Urge Support (Phase 4-C) ───

export function showRecoveryGuide() {
  var phase = typeof window.getCurrentCyclePhase === 'function' ? window.getCurrentCyclePhase() : null;
  var s = window.getState ? window.getState() : (window.state || {});
  var diseases = s.myDiseases || [];
  var FAST_RECOVERY_FOODS = window.FAST_RECOVERY_FOODS || {};

  var diseaseRecoveryKey = null;
  ['PCOS', '子宮内膜症', '卵巣嚢腫', '子宮腺筋症', '子宮筋腫'].forEach(function(dk) {
    if (!diseaseRecoveryKey && diseases.indexOf(dk) !== -1 && FAST_RECOVERY_FOODS[dk]) diseaseRecoveryKey = dk;
  });
  var foodKey  = diseaseRecoveryKey || (phase || '卵胞期');
  var foodData = FAST_RECOVERY_FOODS[foodKey] || FAST_RECOVERY_FOODS['卵胞期'];

  var cardEl    = document.getElementById('fast-recovery-card');
  var contentEl = document.getElementById('fast-recovery-content');
  if (!cardEl || !contentEl) return;

  var diseaseLabels = {
    'PCOS': '低GI・血糖安定を意識した回復食です。', '子宮内膜症': '抗炎症・低エストロゲンを意識した回復食です。',
    '卵巣嚢腫': '抗酸化（ROS軽減）・抗炎症・低GIを意識した回復食です。', '子宮腺筋症': '抗炎症サポートの回復食です。',
    '子宮筋腫': 'エストロゲン代謝を助ける食物繊維豊富な回復食です。'
  };
  var html = '<div style="font-size:11px;color:var(--ink-light);margin-bottom:10px;">';
  if (diseaseRecoveryKey) {
    html += '<strong style="color:var(--rose);">' + diseaseRecoveryKey + (phase ? ' × ' + phase : '') + '</strong> — ' + (diseaseLabels[diseaseRecoveryKey] || '回復食の参考にしてください。');
  } else if (phase) {
    html += '今日は <strong style="color:var(--rose);">' + phase + '</strong> です。回復食の参考にしてください。';
  } else {
    html += '断食後は消化に優しい食品から始めましょう。';
  }
  html += '</div>';
  if (foodData && foodData.foods) {
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    foodData.foods.forEach(function(f) {
      html += '<div style="background:var(--bg);border-radius:10px;padding:10px;"><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:2px;">' + f[0] + '</div><div style="font-size:10px;color:var(--ink-light);">' + f[1] + '</div></div>';
    });
    html += '</div>';
  }
  html += '<div style="margin-top:10px;padding:8px 10px;background:var(--rose-pale,#f9eced);border-radius:10px;font-size:10px;color:var(--ink-light);line-height:1.6;">⚠️ このアプリは医療アドバイスを提供するものではありません。体調に合わせて判断してください。</div>';
  contentEl.innerHTML = html;
  cardEl.style.display = 'block';
  cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function showBingeUrgeSupport() {
  var phase = typeof window.getCurrentCyclePhase === 'function' ? window.getCurrentCyclePhase() : null;
  var s = window.getState ? window.getState() : (window.state || {});
  var diseases = s.myDiseases || [];
  var BINGE_URGE_SUPPORT = window.BINGE_URGE_SUPPORT || {};

  var supportKey = 'default';
  ['子宮内膜症', 'PCOS', '子宮腺筋症', '子宮筋腫', 'PMS/PMDD', '更年期障害'].forEach(function(dk) {
    if (supportKey === 'default' && diseases.indexOf(dk) !== -1 && BINGE_URGE_SUPPORT[dk]) supportKey = dk;
  });
  if (supportKey === 'default' && (phase === '黄体期後期' || phase === '黄体期')) supportKey = phase;
  var support = BINGE_URGE_SUPPORT[supportKey] || BINGE_URGE_SUPPORT['default'] || { color: '#c4878c', validation: 'あなたの気持ちは正常です', science: '食欲の波は誰にでもあります。' };

  var techniques = [
    { icon: '🌬️', title: '深呼吸 4-7-8', desc: '4秒吸って・7秒止めて・8秒かけて吐く。これを3回繰り返す。' },
    { icon: '☕',  title: '温かい飲み物', desc: 'ハーブティーや白湯をゆっくり飲む。胃を温め、満足感を高める。' },
    { icon: '🫧',  title: '5分タイマー',  desc: '「5分後に再評価する」とルールを決める。衝動のピークは5〜15分で通過することが多い。' },
    { icon: '✍️',  title: '記録する',     desc: '今の気持ち・身体の感覚をアプリに記録することで、衝動から観察者の視点に切り替える。' }
  ];
  var html = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:flex-end;justify-content:center;" id="bingeUrgeOverlay" onclick="if(event.target===this)this.remove()">';
  html += '<div style="width:100%;max-width:480px;background:var(--white);border-radius:24px 24px 0 0;padding:24px 20px 32px;max-height:85vh;overflow-y:auto;">';
  html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;"><div style="font-family:Shippori Mincho,serif;font-size:16px;color:var(--ink);">🫶 食欲サポート</div><button onclick="document.getElementById(\'bingeUrgeOverlay\').remove()" style="width:30px;height:30px;border-radius:50%;border:1px solid var(--cream);background:var(--white);color:var(--ink-light);font-size:14px;cursor:pointer;">✕</button></div>';
  html += '<div style="background:linear-gradient(135deg,' + support.color + '22,' + support.color + '11);border:1.5px solid ' + support.color + '44;border-radius:16px;padding:16px;margin-bottom:16px;"><div style="font-size:14px;font-weight:700;color:' + support.color + ';margin-bottom:8px;">' + support.validation + '</div><div style="font-size:12px;color:var(--ink-mid);line-height:1.7;">' + support.science + '</div></div>';
  html += '<div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--rose);margin-bottom:10px;display:flex;align-items:center;gap:5px;"><span style="display:inline-block;width:3px;height:11px;background:var(--rose);border-radius:2px;"></span>今できること</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">';
  techniques.forEach(function(t) { html += '<div style="display:flex;gap:12px;padding:12px;background:var(--bg);border-radius:12px;align-items:flex-start;"><span style="font-size:20px;flex-shrink:0;">' + t.icon + '</span><div><div style="font-size:12px;font-weight:600;color:var(--ink);margin-bottom:3px;">' + t.title + '</div><div style="font-size:11px;color:var(--ink-light);line-height:1.5;">' + t.desc + '</div></div></div>'; });
  html += '</div>';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openRecordScreen===\'function\')window.openRecordScreen();" style="width:100%;padding:14px;background:var(--rose);color:white;border:none;border-radius:14px;font-family:Noto Sans JP,sans-serif;font-size:14px;font-weight:500;cursor:pointer;">今の状態を記録する →</button>';
  html += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--cream);"><div style="font-size:11px;font-weight:700;letter-spacing:0.1em;color:var(--ink-mid);margin-bottom:10px;display:flex;align-items:center;gap:5px;"><span style="display:inline-block;width:3px;height:11px;background:var(--ink-mid);border-radius:2px;"></span>記録から見えてくるかもしれません</div>';
  html += '<div style="display:flex;flex-direction:column;gap:8px;">';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openCorrelationReport===\'function\')window.openCorrelationReport();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">🔬</span><div><div style="font-weight:600;">要因効果レポートを見る</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">睡眠・気分・周期との関連を確認する</div></div></button>';
  html += '<button onclick="(function(){document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.switchTab===\'function\')window.switchTab(\'insights\',null);})();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">✨</span><div><div style="font-weight:600;">インサイトを見る</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">記録データからパターンを読み解く</div></div></button>';
  html += '<button onclick="document.getElementById(\'bingeUrgeOverlay\').remove();if(typeof window.openExperiments===\'function\')window.openExperiments();" style="width:100%;padding:12px 16px;background:var(--bg);border:1.5px solid var(--cream);border-radius:12px;font-family:Noto Sans JP,sans-serif;font-size:12px;color:var(--ink);cursor:pointer;text-align:left;display:flex;align-items:center;gap:10px;"><span style="font-size:18px;">🧪</span><div><div style="font-weight:600;">ヘルス実験を試してみる</div><div style="font-size:10px;color:var(--ink-light);margin-top:2px;">気になる要因を2週間追跡する</div></div></button>';
  html += '</div></div><div style="text-align:center;margin-top:12px;font-size:10px;color:var(--ink-light);">このアプリは医療アドバイスを提供するものではありません。摂食障害が疑われる場合は専門家にご相談ください。</div></div></div>';
  var overlay = document.createElement('div');
  overlay.innerHTML = html;
  document.body.appendChild(overlay.firstChild);
}

window.showRecoveryGuide    = showRecoveryGuide;
window.showBingeUrgeSupport = showBingeUrgeSupport;
