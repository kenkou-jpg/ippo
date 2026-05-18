// ============================================================
//  ippo – home-next-config.js
//  疾患プロファイル別 HOME 設定
// ============================================================

// 日本語疾患名 → プロファイルキー マッピング
const DISEASE_TO_PROFILE = {
  '子宮内膜症':    'endometriosis',
  'PCOS':         'pcos',
  '卵巣嚢腫':     'ovarian_cyst',
  'PMS/PMDD':     'pms',
  '子宮筋腫':     'uterine_fibroid',
  '子宮腺筋症':   'adenomyosis',
  '更年期障害':   'menopause',
  '慢性骨盤痛':   'chronic_pelvic_pain',
  '不妊症':       'infertility',
};

// 月相SVGマーク（wellness symbol — emoji不使用）
const _mkMoon = svg => `<svg viewBox="0 0 16 16" width="13" height="13" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:-2px;margin-right:3px" aria-hidden="true">${svg}</svg>`;
const PHASE_ICONS = {
  new:      _mkMoon(`<circle cx="8" cy="8" r="6" fill="#3A2F28"/>`),
  crescent: _mkMoon(`<circle cx="8" cy="8" r="6" fill="#3A2F28"/><path d="M8,2 A6,6 0 0,1 8,14 A5,6 0 0,0 8,2 Z" fill="#C9B39D"/>`),
  full:     _mkMoon(`<circle cx="8" cy="8" r="6" fill="#E9D8B8"/>`),
  gibbous:  _mkMoon(`<circle cx="8" cy="8" r="6" fill="#3A2F28"/><path d="M8,2 A6,6 0 0,0 8,14 A3.3,6 0 0,1 8,2 Z" fill="#E2CFA4"/>`),
};

// 周期フェーズ定義
export const CYCLE_PHASES = {
  menstrual:  { label: '生理期間',  icon: PHASE_ICONS.new,      days: [1, 5] },
  follicular: { label: '卵胞期',    icon: PHASE_ICONS.crescent, days: [6, 13] },
  ovulation:  { label: '排卵期',    icon: PHASE_ICONS.full,     days: [14, 15] },
  luteal:     { label: '黄体期',    icon: PHASE_ICONS.gibbous,  days: [16, 99] },
};

// 疾患プロファイル設定
const PROFILES = {
  default: {
    priorityCards:  ['sleep', 'pain', 'mood', 'symptom'],
    heroMessages: {
      morning:    ['今日もゆっくり始めていきましょう。', '朝の静けさの中で、からだを確認して。'],
      afternoon:  ['今日のあなたを、静かに見守っています。', 'からだの声を聴いてみましょう。'],
      night:      ['今日もお疲れさまでした。', 'ゆっくり休んでくださいね。'],
      menstrual:  ['生理期間中です。からだを優先して。', '今日は無理をしないで。'],
      follicular: ['からだが軽くなってくる頃です。', '体調の変化に気づいていきましょう。'],
      ovulation:  ['からだの変化を確認してみて。'],
      luteal:     ['気分の波に気づいていきましょう。', 'からだが少し重く感じる頃かもしれません。'],
      lowSleep:   ['睡眠が足りていないかもしれません。'],
      highPain:   ['今日は痛みが気になる状態です。'],
    },
    insightPriority: ['sleep_pain', 'cycle_mood', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  endometriosis: {
    priorityCards:  ['pain', 'sleep', 'mood', 'swelling'],
    heroMessages: {
      morning:    ['今日も、無理しない選択を。', 'からだを最優先にしていい日です。'],
      afternoon:  ['今日も一歩ずつ、ゆっくりと。'],
      night:      ['今日もよく頑張りました。'],
      menstrual:  ['生理期間中です。無理をしないで。', '痛みが出やすい時期です。'],
      follicular: ['体が楽になってくる頃です。', 'からだのリズムを確認してみて。'],
      luteal:     ['生理前の時期です。', '痛みや気分の変化に気づいてみて。'],
      lowSleep:   ['疲れが溜まっています。'],
      highPain:   ['今日は痛みが強い状態です。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  pcos: {
    priorityCards:  ['mood', 'sleep', 'symptom', 'pain'],
    heroMessages: {
      morning:    ['今日も穏やかに過ごしましょう。', 'PCOSと向き合いながら、一歩ずつ。'],
      afternoon:  ['ホルモンバランスを意識した過ごし方を。'],
      night:      ['今日もお疲れさまでした。'],
      menstrual:  ['生理が来ています。からだをゆっくり休めて。'],
      follicular: ['体が動きやすい時期です。'],
      luteal:     ['気分の波が出やすい時期かもしれません。'],
      lowSleep:   ['睡眠不足はホルモンに影響します。'],
      highPain:   ['今日は無理せず、からだを休めて。'],
    },
    insightPriority: ['sleep_mood', 'cycle_mood', 'symptom_pattern'],
    optionalModules: ['food'],
    accentColor: '#8B9E84',
  },

  pms: {
    priorityCards:  ['mood', 'swelling', 'pain', 'sleep'],
    heroMessages: {
      morning:    ['気分の波に気づいていきましょう。', 'からだのサインを大切に。'],
      afternoon:  ['気分の揺れは、周期の一部かもしれません。'],
      night:      ['今日もよく過ごしました。'],
      menstrual:  ['生理が始まりました。ゆっくり過ごして。'],
      follicular: ['気分が少し落ち着いてくる頃です。'],
      luteal:     ['生理前の気分の波に気づいてみて。', 'イライラや落ち込みはホルモンの影響かも。'],
      lowSleep:   ['睡眠不足が気分に影響することがあります。'],
      highPain:   ['今日は気分と痛みに注意して過ごして。'],
    },
    insightPriority: ['cycle_mood', 'sleep_mood', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  ovarian_cyst: {
    priorityCards:  ['pain', 'swelling', 'sleep', 'mood'],
    heroMessages: {
      morning:    ['今日のからだの状態を確認しましょう。'],
      afternoon:  ['違和感がある場合は無理しないで。'],
      night:      ['今日もお疲れさまでした。'],
      menstrual:  ['生理期間中です。痛みの変化を記録して。'],
      luteal:     ['からだの声に耳を傾けてみて。'],
      highPain:   ['今日は痛みに注意して過ごして。'],
      lowSleep:   ['疲れが出ているかもしれません。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  uterine_fibroid: {
    priorityCards:  ['pain', 'swelling', 'mood', 'sleep'],
    heroMessages: {
      morning:    ['今日のからだの変化にゆっくり気づいて。'],
      afternoon:  ['からだの声を聴きながら過ごしましょう。'],
      night:      ['今日もお疲れさまでした。'],
      menstrual:  ['生理期間中です。変化があれば記録して。'],
      highPain:   ['今日は痛みが気になる状態です。'],
      lowSleep:   ['疲れが蓄積しているかもしれません。'],
    },
    insightPriority: ['pain_cycle', 'symptom_pattern', 'sleep_pain'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  adenomyosis: {
    priorityCards:  ['pain', 'sleep', 'swelling', 'mood'],
    heroMessages: {
      morning:    ['からだと対話しながら、今日も一歩ずつ。'],
      afternoon:  ['痛みと向き合いながら、自分のペースで。'],
      night:      ['今日も頑張りました。'],
      menstrual:  ['生理期間中です。特に無理をしないで。', '痛みが強い時は、一人で抱えないで。'],
      highPain:   ['今日は痛みが強い状態です。'],
      lowSleep:   ['睡眠が取れていません。無理しないで。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  menopause: {
    priorityCards:  ['mood', 'sleep', 'symptom', 'pain'],
    heroMessages: {
      morning:    ['今日も穏やかに過ごしていきましょう。', '変化の時期を、静かに受け入れながら。'],
      afternoon:  ['からだの正直な反応を受け入れて。'],
      night:      ['今日もお疲れさまでした。良い眠りを。'],
      lowSleep:   ['睡眠不足がほてりや気分に影響します。'],
      highPain:   ['無理せず、からだを休めましょう。'],
    },
    insightPriority: ['sleep_mood', 'symptom_pattern', 'sleep_pain'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  chronic_pelvic_pain: {
    priorityCards:  ['pain', 'mood', 'sleep', 'swelling'],
    heroMessages: {
      morning:    ['今日の痛みの状態を確認してみましょう。'],
      afternoon:  ['痛みと向き合いながら、自分のペースで。'],
      night:      ['今日もよく頑張りました。'],
      highPain:   ['今日は痛みが気になる状態です。'],
      lowSleep:   ['痛みと睡眠は影響し合います。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  infertility: {
    priorityCards:  ['mood', 'sleep', 'pain', 'symptom'],
    heroMessages: {
      morning:    ['今日も、あなたのペースで。', '焦らなくていいです。'],
      afternoon:  ['今日も自分をいたわって過ごして。'],
      night:      ['今日もお疲れさまでした。'],
      menstrual:  ['生理が来ました。気持ちを大切にして。'],
      ovulation:  ['からだの変化を記録しておきましょう。'],
      lowSleep:   ['睡眠が足りていません。早めに休んで。'],
    },
    insightPriority: ['cycle_mood', 'sleep_mood', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },
};

// ── ユーティリティ ────────────────────────────────────────

export function detectProfileKey(myDiseases = []) {
  for (const disease of myDiseases) {
    const key = DISEASE_TO_PROFILE[disease];
    if (key && PROFILES[key]) return key;
  }
  return 'default';
}

export function getCyclePhase(lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return null;
  const last  = new Date(lastPeriodDate + 'T00:00:00');
  const today = new Date();
  const dayNum = Math.floor((today - last) / 86400000) + 1;
  const cl = cycleLength || 28;

  if (dayNum < 1)     return null;
  if (dayNum <= 5)    return 'menstrual';
  if (dayNum <= 13)   return 'follicular';
  if (dayNum <= 15)   return 'ovulation';
  if (dayNum <= cl)   return 'luteal';
  return null; // 遅延中（フェーズ不定）
}

export function getCycleDayNum(lastPeriodDate) {
  if (!lastPeriodDate) return null;
  const last  = new Date(lastPeriodDate + 'T00:00:00');
  const today = new Date();
  const dayNum = Math.floor((today - last) / 86400000) + 1;
  return dayNum > 0 ? dayNum : null;
}

export function getHeroMessageKey(opts = {}) {
  const { phase, recentSleepAvg, recentPainAvg, hour } = opts;

  // 優先度: highPain > lowSleep > phase > time-of-day
  if (recentPainAvg !== null && recentPainAvg >= 2.5)  return 'highPain';
  if (recentSleepAvg !== null && recentSleepAvg >= 2.8) return 'lowSleep';
  if (phase) return phase;

  if (hour >= 5  && hour < 11) return 'morning';
  if (hour >= 17 && hour < 22) return 'night';
  return 'afternoon';
}

export function pickHeroMessage(messages, key) {
  const candidates = messages[key] || messages['afternoon'] || messages['morning'] || [];
  if (candidates.length === 0) return 'からだの声を聴いていきましょう。';
  // 日付ベースで固定選択（毎日変わるが同日は同じ）
  const today = new Date();
  const seed  = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  return candidates[seed % candidates.length];
}

// ── メインエクスポート ────────────────────────────────────

/**
 * 複数疾患対応: 最重要プロファイルをベースに、
 * 他疾患の priorityCards を最大4件にマージして返す。
 *
 * 例: ['卵巣嚢腫', 'PMS/PMDD', '慢性骨盤痛']
 *   → ovarian_cyst (primary) の [pain, swelling, sleep, mood]
 *      pms の [mood, swelling] は既に含まれるので追加不要
 *      chronic_pelvic_pain の [pain, mood, sleep, swelling] も同様
 *   → 最終的に ovarian_cyst ベースのまま (重複なし)
 */
export function getHomeConfiguration(myDiseases = []) {
  const primaryKey = detectProfileKey(myDiseases);
  const primary    = { ...PROFILES[primaryKey], profileKey: primaryKey };

  if (myDiseases.length <= 1) return primary;

  // 2番目以降の疾患の priorityCards を収集
  const seen = new Set(primary.priorityCards);
  const merged = [...primary.priorityCards];

  for (const disease of myDiseases) {
    const key = DISEASE_TO_PROFILE[disease];
    if (!key || key === primaryKey) continue;
    const profile = PROFILES[key];
    if (!profile) continue;
    for (const card of profile.priorityCards) {
      if (!seen.has(card) && merged.length < 4) {
        seen.add(card);
        merged.push(card);
      }
    }
  }

  return { ...primary, priorityCards: merged.slice(0, 4) };
}
