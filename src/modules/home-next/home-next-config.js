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

// 周期フェーズ定義
export const CYCLE_PHASES = {
  menstrual:  { label: '生理期間',  emoji: '🌑', days: [1, 5] },
  follicular: { label: '卵胞期',    emoji: '🌒', days: [6, 13] },
  ovulation:  { label: '排卵期',    emoji: '🌕', days: [14, 15] },
  luteal:     { label: '黄体期',    emoji: '🌔', days: [16, 99] },
};

// 疾患プロファイル設定
const PROFILES = {
  default: {
    priorityCards:  ['sleep', 'pain', 'mood', 'symptom'],
    heroMessages: {
      morning:    ['今日もゆっくり始めていきましょう。', '朝の静けさの中で、今日のからだを確認して。'],
      afternoon:  ['今日のあなたを、静かに見守っています。', '今この瞬間のからだの声を聴いて。'],
      night:      ['今日もお疲れさまでした。', 'ゆっくり休んでくださいね。'],
      menstrual:  ['生理期間中です。無理しないで過ごして。', '今日は、からだを優先してください。'],
      follicular: ['からだが少しずつ軽くなってくる時期です。', '体調の変化に気づいていきましょう。'],
      ovulation:  ['排卵期の可能性があります。からだの変化を確認して。'],
      luteal:     ['生理前の時期に入っています。気分の波に気づいて。', 'からだが少し重く感じる時期かもしれません。'],
      lowSleep:   ['睡眠が足りていないかもしれません。\n今日はゆっくり過ごしましょう。'],
      highPain:   ['今日は痛みが気になる状態です。\n無理せず、休んでください。'],
    },
    insightPriority: ['sleep_pain', 'cycle_mood', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  endometriosis: {
    priorityCards:  ['pain', 'sleep', 'mood', 'swelling'],
    heroMessages: {
      morning:    ['今日も、無理しない選択を。', 'からだの声を最優先にしていい日です。'],
      afternoon:  ['子宮内膜症と向き合いながら、\n今日も一歩ずつ。'],
      night:      ['今日もよく頑張りました。\nゆっくり休んで。'],
      menstrual:  ['生理期間中です。特に無理をしないで。\nつらい日は横になることも大切な選択です。', '今日は痛みが出やすい時期です。\n痛み止めの使用をためらわないで。'],
      follicular: ['少し体が楽になってくる頃です。\nからだのリズムを確認して。'],
      luteal:     ['生理前の時期です。\n痛みや気分の変化に気づいてみて。'],
      lowSleep:   ['疲れが溜まっています。\n今日は特に無理しないで。'],
      highPain:   ['今日は痛みが強い状態です。\n可能なら横になって休んでください。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  pcos: {
    priorityCards:  ['mood', 'sleep', 'symptom', 'pain'],
    heroMessages: {
      morning:    ['今日も穏やかに過ごしましょう。', 'PCOSと向き合いながら、今日も一歩ずつ。'],
      afternoon:  ['ホルモンバランスを意識した\n過ごし方ができていますか？'],
      night:      ['今日もお疲れさまでした。\n十分な睡眠が明日のホルモンを整えます。'],
      menstrual:  ['生理が来ています。\nからだをゆっくり休めて。'],
      follicular: ['体が動きやすい時期です。\n無理のない範囲で活動してみて。'],
      luteal:     ['イライラや気分の波が出やすい時期かもしれません。'],
      lowSleep:   ['睡眠不足はホルモンバランスに\n影響することがあります。'],
      highPain:   ['今日は無理せず、からだを休めて。'],
    },
    insightPriority: ['sleep_mood', 'cycle_mood', 'symptom_pattern'],
    optionalModules: ['food'],
    accentColor: '#8B9E84',
  },

  pms: {
    priorityCards:  ['mood', 'swelling', 'pain', 'sleep'],
    heroMessages: {
      morning:    ['今の気持ちも、からだのサインのひとつです。', '気分の波に気づいていきましょう。'],
      afternoon:  ['気分の揺れは、周期の一部かもしれません。\n自分に優しくしてください。'],
      night:      ['今日もよく過ごしました。\n眠る前に深呼吸してみて。'],
      menstrual:  ['生理が始まりました。\nゆっくり過ごしてください。'],
      follicular: ['気分が少し落ち着いてくる頃です。'],
      luteal:     ['生理前の時期です。\n気分の波が出やすい頃かもしれません。', 'イライラや落ち込みは、ホルモンの影響かもしれません。\n自分を責めないで。'],
      lowSleep:   ['睡眠不足が気分に影響することがあります。\nゆっくり休んで。'],
      highPain:   ['今日は気分と痛みに注意して過ごして。'],
    },
    insightPriority: ['cycle_mood', 'sleep_mood', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  ovarian_cyst: {
    priorityCards:  ['pain', 'swelling', 'sleep', 'mood'],
    heroMessages: {
      morning:    ['今日のからだの状態を\n静かに確認しましょう。'],
      afternoon:  ['片側の違和感がある場合は、\n無理しないでください。'],
      night:      ['今日もお疲れさまでした。\n異変を感じたら早めに対応して。'],
      menstrual:  ['生理期間中です。\n痛みが普段より強い場合は記録して。'],
      luteal:     ['排卵期前後は変化が出やすい時期です。\nからだの声に耳を傾けて。'],
      highPain:   ['今日は痛みに注意して過ごして。\n強い痛みは記録しておきましょう。'],
      lowSleep:   ['疲れが出ているかもしれません。\n無理せず休んで。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  uterine_fibroid: {
    priorityCards:  ['pain', 'swelling', 'mood', 'sleep'],
    heroMessages: {
      morning:    ['今日のからだの変化に\nゆっくり気づいていきましょう。'],
      afternoon:  ['からだの声を聴きながら、\n今日も過ごしていきましょう。'],
      night:      ['今日もお疲れさまでした。\nゆっくり休んでください。'],
      menstrual:  ['生理期間中です。\n経血量の変化があれば記録してみて。'],
      highPain:   ['今日は痛みが気になる状態です。\n休める環境を作ってみて。'],
      lowSleep:   ['疲れが蓄積しているかもしれません。'],
    },
    insightPriority: ['pain_cycle', 'symptom_pattern', 'sleep_pain'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  adenomyosis: {
    priorityCards:  ['pain', 'sleep', 'swelling', 'mood'],
    heroMessages: {
      morning:    ['からだと対話しながら、\n今日も一歩ずつ。'],
      afternoon:  ['痛みと向き合いながら、\n今日も過ごしています。'],
      night:      ['今日も頑張りました。\nゆっくり体を休めて。'],
      menstrual:  ['生理期間中です。\n今日は特に無理しないでください。', '痛みが強い時は、一人で抱えないで。'],
      highPain:   ['今日は痛みが強い状態です。\n横になることを優先して。'],
      lowSleep:   ['睡眠が取れていません。\n今日は特に無理しないで。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  menopause: {
    priorityCards:  ['mood', 'sleep', 'symptom', 'pain'],
    heroMessages: {
      morning:    ['今日も穏やかに過ごしていきましょう。', '変化の時期を、静かに受け入れながら。'],
      afternoon:  ['ほてりや気分の波があっても、\nそれはからだの正直な反応です。'],
      night:      ['今日もお疲れさまでした。\n良い眠りを。'],
      lowSleep:   ['睡眠が取れていないと\nほてりや気分に影響することがあります。'],
      highPain:   ['今日はからだが重い感じがしますか？\n無理せず過ごして。'],
    },
    insightPriority: ['sleep_mood', 'symptom_pattern', 'sleep_pain'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  chronic_pelvic_pain: {
    priorityCards:  ['pain', 'mood', 'sleep', 'swelling'],
    heroMessages: {
      morning:    ['今日の痛みの状態を\n確認してみましょう。'],
      afternoon:  ['痛みと向き合いながら、\n今日も自分のペースで。'],
      night:      ['今日もよく頑張りました。\nゆっくり休んでください。'],
      highPain:   ['今日は痛みが気になる状態です。\n記録しておくと診察時に役立ちます。'],
      lowSleep:   ['痛みと睡眠は影響し合います。\n今日は特に無理しないで。'],
    },
    insightPriority: ['pain_cycle', 'sleep_pain', 'symptom_pattern'],
    optionalModules: [],
    accentColor: '#8B9E84',
  },

  infertility: {
    priorityCards:  ['mood', 'sleep', 'pain', 'symptom'],
    heroMessages: {
      morning:    ['今日も、あなたのペースで。\n焦らなくていいです。'],
      afternoon:  ['治療の旅の中で、\n今日も自分をいたわって。'],
      night:      ['今日もお疲れさまでした。\n気持ちを休ませてください。'],
      menstrual:  ['生理が来ました。\n気持ちの波があれば、それを大切に感じて。'],
      ovulation:  ['大切な時期です。\nからだの変化を記録しておきましょう。'],
      lowSleep:   ['睡眠が足りていません。\n今日は早めに休んで。'],
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

export function getHomeConfiguration(myDiseases = []) {
  const key = detectProfileKey(myDiseases);
  return { ...PROFILES[key], profileKey: key };
}
