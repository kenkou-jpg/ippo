// ============================================================
//  ippo – src/data/disease-contexts.js
//  Disease Context Layer — PR3
//
//  【設計原則】
//  - "疾患名" ではなく "疾患を抱えて生きる流れ" を理解する
//  - 診断表現・医療断定・数値スコア化を禁止
//  - vocabulary: 体験語彙（症状コードではなく、生活の中の言葉）
//  - observations: "理解される感覚" を生む観察テンプレート
//  - Calm感を維持する。病院UIにしない
// ============================================================

// ─────────────────────────────────────────────────────────────
//  日本語疾患名 → コンテキストキー マッピング
//  home-next-config.js の DISEASE_TO_PROFILE と整合
// ─────────────────────────────────────────────────────────────

export const DISEASE_NAME_MAP = {
  '子宮内膜症': 'endometriosis',
  'PCOS':       'pcos',
  'PMS':        'pms',
  'PMDD':       'pmdd',
  'PMS/PMDD':   'pms',   // 既存データとの互換キー（pmsとして扱う）
  '卵巣嚢腫':   'ovarianCyst',
};

// ─────────────────────────────────────────────────────────────
//  Vocabulary
//  各疾患に固有の "体験語彙"
//  それぞれの vocab が持つ signals は symptom タグと照合される
// ─────────────────────────────────────────────────────────────

const _VOCAB = {

  // ── 子宮内膜症 ─────────────────────────────────────────
  endometriosis: {

    flare: {
      // 痛みが急に押し寄せてくる感覚
      signals:        ['下腹部痛', '腰痛', '排便痛', '倦怠感'],
      contextPhrases: ['つらい日', '重なる痛み', '痛みのピーク'],
    },

    painAccumulation: {
      // 痛みが少しずつ積み重なっていく感覚
      signals:        ['下腹部痛', '腰痛', '倦怠感'],
      contextPhrases: ['痛みが積み重なる', 'じわじわとくる', '疲れが溜まる'],
    },

    sleepRelation: {
      // 眠れない夜と翌日の体の重さ（sleepQuality数値は insight-engine 側で補完）
      signals:        ['不眠', '眠気', '倦怠感'],
      contextPhrases: ['眠れない夜', '体が休まらない', '浅い眠り'],
    },

    fatigueFlow: {
      // 疲労が体全体を流れていく感覚（energy数値は insight-engine 側で補完）
      signals:        ['倦怠感', '集中力低下'],
      contextPhrases: ['疲れが流れる', 'エネルギーが続かない', '体が重い'],
    },

  },

  // ── PCOS ──────────────────────────────────────────────
  pcos: {

    cycleIrregularity: {
      // 周期が定まらない中で生きること（cycleIrregular 状態は insight-engine 側で判定）
      signals:        [],
      contextPhrases: ['いつ来るかわからない', 'リズムが掴めない', '体のリズムが独自'],
    },

    moodFluctuation: {
      // 気分の波が予測しにくい日常
      signals:        ['気分の落ち込み', 'イライラ', '不安感'],
      contextPhrases: ['気分の波', '感情の揺れ', 'ホルモンの影響'],
    },

    energyInstability: {
      // エネルギーが安定しない日常
      signals:        ['倦怠感', '眠気', '集中力低下'],
      contextPhrases: ['エネルギーの波', '体が動かない時', '活力の変動'],
    },

  },

  // ── PMS ───────────────────────────────────────────────
  pms: {

    cyclicPattern: {
      // 毎月同じ時期に繰り返される体の流れ
      signals:        ['イライラ', '気分の落ち込み', '頭痛', 'むくみ', '胸の張り'],
      contextPhrases: ['毎月この時期', '繰り返すパターン', '予測できる波'],
    },

    bodySignals: {
      // 体が次の生理を知らせるサイン
      signals:        ['胸の張り', 'むくみ', '頭痛', '腹部膨満'],
      contextPhrases: ['体のサイン', '生理前の合図', '体が準備している'],
    },

    emotionalShift: {
      // 感情の変化が生理前に訪れる
      signals:        ['イライラ', '気分の落ち込み', '不安感'],
      contextPhrases: ['感情の揺れ', '気持ちの変化', 'ホルモンの波'],
    },

  },

  // ── PMDD ──────────────────────────────────────────────
  pmdd: {

    intenseMoodShift: {
      // 生理前の、コントロールが難しいほどの感情の波
      signals:        ['気分の落ち込み', 'イライラ', '不安感', '怒り'],
      contextPhrases: ['感情の波が大きい', 'コントロールが難しい時', '心が揺れる'],
    },

    functionalImpact: {
      // 日常生活に影響するほどの変化
      signals:        ['集中力低下', '不眠', '倦怠感'],
      contextPhrases: ['日常が変わる時期', '動けない日', '生活への影響'],
    },

    cyclicRhythm: {
      // 毎月訪れることがわかっていても、つらい周期の流れ
      signals:        ['気分の落ち込み', 'イライラ'],
      contextPhrases: ['毎月訪れる', 'わかっていてもつらい', '体が体を変える'],
    },

  },

  // ── 卵巣嚢腫 ──────────────────────────────────────────
  ovarianCyst: {

    pressureSensation: {
      // お腹の圧迫感・張り感として現れること
      signals:        ['下腹部痛', '腹部膨満'],
      contextPhrases: ['お腹の圧迫感', '片側に感じる重さ', 'お腹の張り'],
    },

    locationAwareness: {
      // 体の特定の場所に意識が向く
      signals:        ['下腹部痛'],
      contextPhrases: ['特定の場所', '体の中の感覚', '片側の気になり'],
    },

    cyclicChange: {
      // 周期によって変化する体の感覚
      signals:        ['下腹部痛', '腹部膨満'],
      contextPhrases: ['時期によって', '周期と一緒に変わる', '波のように'],
    },

  },

};

// ─────────────────────────────────────────────────────────────
//  Disease Contexts
//  各疾患の "生活文脈" を定義する
//
//  observations: 条件が揃ったとき UI に提示する観察テンプレート
//    phrase   — ユーザーに問いかける言葉（"理解される感覚"を作る）
//    context  — 少し深いフォローの言葉（否定せず、寄り添う）
//
//  lifeFlow: 疾患が日常生活の中でどのように流れるか
//  calmingPrinciples: この疾患と向き合う上での静かな視点
// ─────────────────────────────────────────────────────────────

export const DISEASE_CONTEXTS = {

  // ══════════════════════════════════════════════════════════
  //  子宮内膜症
  // ══════════════════════════════════════════════════════════

  endometriosis: {
    diseaseNameJa: '子宮内膜症',
    vocabulary:    _VOCAB.endometriosis,

    lifeFlow: {
      cycleSensitive:  true,
      cumulativeNature: true,   // 痛みが少しずつ積み重なる性質
      primaryTiming:   'menstrual',
      description:     '生理周期に合わせて変化する、波のある体の流れ',
    },

    observations: [
      {
        id:           'endo_fatigue_pain',
        vocabularyKey: 'painAccumulation',
        phrase:       '疲れが重なる日に、痛みも強くなっていませんか？',
        context:      '体が疲れているときほど、痛みを感じやすくなることがあります。',
      },
      {
        id:           'endo_sleep_pain',
        vocabularyKey: 'sleepRelation',
        phrase:       '眠りが浅かった日の翌日は、体が少し重たくなりませんか？',
        context:      '睡眠と体の痛みは、深く繋がっています。',
      },
      {
        id:           'endo_accumulation',
        vocabularyKey: 'painAccumulation',
        phrase:       'ここ数日、少しずつ体が重くなっていませんか？',
        context:      '痛みは急に来るのではなく、積み重なることがあります。',
      },
      {
        id:           'endo_fatigue_flow',
        vocabularyKey: 'fatigueFlow',
        phrase:       '今日は疲れが取れにくい感じがしませんか？',
        context:      '慢性的な疲れは、体が何かを伝えているサインかもしれません。',
      },
      {
        id:           'endo_flare_rest',
        vocabularyKey: 'flare',
        phrase:       'つらい時期が重なっているとき、体が休息を求めていませんか？',
        context:      'この時期に無理をしないことが、一番の優しさです。',
      },
    ],

    calmingPrinciples: [
      '痛みを「耐えるもの」ではなく「観察するもの」として記録していく',
      '波のある体のリズムを、日記のように積み重ねる',
      '休息は怠慢ではなく、体への対話',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  PCOS
  // ══════════════════════════════════════════════════════════

  pcos: {
    diseaseNameJa: 'PCOS',
    vocabulary:    _VOCAB.pcos,

    lifeFlow: {
      cycleSensitive:  false,   // 周期が不規則なため、周期依存しにくい
      cumulativeNature: false,
      primaryTiming:   'any',
      description:     '周期が不規則なため体の変化が読みにくい、独自のリズムを持つ日常',
    },

    observations: [
      {
        id:           'pcos_cycle_mood',
        vocabularyKey: 'moodFluctuation',
        phrase:       '周期が不規則な時期は、気分も一緒に揺れやすくありませんか？',
        context:      'ホルモンバランスが変わると、気持ちにも影響することがあります。',
      },
      {
        id:           'pcos_energy',
        vocabularyKey: 'energyInstability',
        phrase:       'エネルギーが続きにくい日が続いていませんか？',
        context:      'PCOSをもつ体は、エネルギーの使い方に独自のリズムがあります。',
      },
      {
        id:           'pcos_mood_energy',
        vocabularyKey: 'moodFluctuation',
        phrase:       '気分が沈んでいる時、体も疲れていませんか？',
        context:      '気持ちと体のエネルギーは、繋がっていることが多いです。',
      },
      {
        id:           'pcos_rhythm',
        vocabularyKey: 'cycleIrregularity',
        phrase:       '体のリズムが定まらない時期が続いていませんか？',
        context:      'リズムが読みにくいからこそ、記録が力になります。',
      },
    ],

    calmingPrinciples: [
      '「正しい周期」ではなく「自分のリズム」を見つけていく',
      '気分の波も、体が語る言葉のひとつ',
      '記録は管理ではなく、体との対話',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  PMS
  // ══════════════════════════════════════════════════════════

  pms: {
    diseaseNameJa: 'PMS',
    vocabulary:    _VOCAB.pms,

    lifeFlow: {
      cycleSensitive:  true,
      cumulativeNature: false,
      primaryTiming:   'luteal',   // 黄体期（生理前7〜14日）
      description:     '生理前7〜14日に現れ、生理が来ると和らぐ、繰り返す波',
    },

    observations: [
      {
        id:           'pms_luteal_pattern',
        vocabularyKey: 'cyclicPattern',
        phrase:       '生理前になると、いつも同じような感覚が来ませんか？',
        context:      '体が毎月送るサインかもしれません。',
      },
      {
        id:           'pms_body_signal',
        vocabularyKey: 'bodySignals',
        phrase:       '胸の張りやむくみが、体の変化を教えてくれていませんか？',
        context:      '体が生理前を準備している証拠です。',
      },
      {
        id:           'pms_emotional',
        vocabularyKey: 'emotionalShift',
        phrase:       '気持ちが敏感になっている時期がありますか？',
        context:      '感情の変化は、ホルモンの流れと一緒に動いています。',
      },
      {
        id:           'pms_relief_anticipation',
        vocabularyKey: 'cyclicPattern',
        phrase:       '生理が来ると、少しふっと楽になることがありますか？',
        context:      'このリズムを知ることで、自分をもう少し楽にできます。',
      },
    ],

    calmingPrinciples: [
      '毎月繰り返すパターンは、体を知るための地図になる',
      '「またこの時期か」という気持ちも、体の知恵のひとつ',
      '感情の波を責めず、記録していく',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  PMDD
  // ══════════════════════════════════════════════════════════

  pmdd: {
    diseaseNameJa: 'PMDD',
    vocabulary:    _VOCAB.pmdd,

    lifeFlow: {
      cycleSensitive:  true,
      cumulativeNature: false,
      primaryTiming:   'luteal',
      description:     '生理前の特定の時期に集中した、強い感情と体の変化',
    },

    observations: [
      {
        id:           'pmdd_cycle_awareness',
        vocabularyKey: 'intenseMoodShift',
        phrase:       '毎月この時期、心が特に重くなることがありますか？',
        context:      '感情の波が大きいのは、体の周期と深く繋がっています。',
      },
      {
        id:           'pmdd_validation',
        vocabularyKey: 'functionalImpact',
        phrase:       '気持ちの変化が、日常のリズムに影響していませんか？',
        context:      'その経験は、あなたが感じている通りに本当のことです。',
      },
      {
        id:           'pmdd_after_period',
        vocabularyKey: 'cyclicRhythm',
        phrase:       '生理が始まると、まるで空が晴れるように変わることがありますか？',
        context:      'その変化が、体の周期を教えてくれています。',
      },
      {
        id:           'pmdd_self_care',
        vocabularyKey: 'intenseMoodShift',
        phrase:       'この時期は、いつもより自分に優しくできていますか？',
        context:      'PMDDの時期は、特別なケアが必要な時間です。',
      },
    ],

    calmingPrinciples: [
      '「心が弱い」のではなく「体の周期に強く影響される」ということ',
      '強い感情の波は、来て、そして去っていく',
      '記録することで、嵐の前後を知ることができる',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  卵巣嚢腫
  // ══════════════════════════════════════════════════════════

  ovarianCyst: {
    diseaseNameJa: '卵巣嚢腫',
    vocabulary:    _VOCAB.ovarianCyst,

    lifeFlow: {
      cycleSensitive:  true,
      cumulativeNature: false,
      primaryTiming:   'ovulation',   // 排卵期・生理前に変化しやすい
      description:     '体の特定の場所に意識が向く、観察しながら過ごす日々',
    },

    observations: [
      {
        id:           'cyst_pressure',
        vocabularyKey: 'pressureSensation',
        phrase:       'お腹の片側に、重さや圧迫感を感じることはありますか？',
        context:      '体が送るサインを、丁寧に観察してみて。',
      },
      {
        id:           'cyst_cycle_change',
        vocabularyKey: 'cyclicChange',
        phrase:       '排卵の時期に、特定の場所が少し気になりますか？',
        context:      '周期に合わせた変化は、体が語りかけているサインです。',
      },
      {
        id:           'cyst_bloating',
        vocabularyKey: 'pressureSensation',
        phrase:       'お腹の張りと一緒に、体が少し重く感じませんか？',
        context:      '無理をしない日を、意識的に作ってみて。',
      },
      {
        id:           'cyst_location_notice',
        vocabularyKey: 'locationAwareness',
        phrase:       '体の内側の感覚に、意識が向くことがありますか？',
        context:      '体に耳を傾けながら変化を記録することが、安心につながります。',
      },
    ],

    calmingPrinciples: [
      '観察することは、不安とは違う',
      '体の変化を記録することが、安心につながる',
      '変化に気づくことを、体との対話として',
    ],
  },

};

// ─────────────────────────────────────────────────────────────
//  Helper functions
// ─────────────────────────────────────────────────────────────

/**
 * 日本語疾患名からコンテキストを返す
 * @param {string} diseaseNameJa — 例: '子宮内膜症', 'PCOS'
 * @returns {object|null}
 */
export function getDiseaseContext(diseaseNameJa) {
  const key = DISEASE_NAME_MAP[diseaseNameJa];
  return key ? (DISEASE_CONTEXTS[key] ?? null) : null;
}

/**
 * 複数の疾患名からコンテキスト一覧を返す（重複除去済み）
 * @param {string[]} diseaseNames
 * @returns {object[]}
 */
export function getDiseaseContexts(diseaseNames) {
  const seen = new Set();
  const result = [];
  for (const name of (diseaseNames || [])) {
    const key = DISEASE_NAME_MAP[name];
    if (key && !seen.has(key) && DISEASE_CONTEXTS[key]) {
      seen.add(key);
      result.push(DISEASE_CONTEXTS[key]);
    }
  }
  return result;
}

/**
 * 症状リストに対して、どの vocabulary が関連するかを返す
 * @param {string[]} symptoms — 記録された症状タグ
 * @param {string}   contextKey — 'endometriosis' | 'pcos' | 'pms' | 'pmdd' | 'ovarianCyst'
 * @returns {string[]} — マッチした vocabulary キーの配列
 */
export function matchVocabulary(symptoms, contextKey) {
  const vocab = _VOCAB[contextKey];
  if (!vocab) return [];
  const symSet = new Set(symptoms || []);
  return Object.entries(vocab)
    .filter(([, def]) => def.signals.some(s => symSet.has(s)))
    .map(([key]) => key);
}

/**
 * 疾患コンテキストの observation テンプレート一覧を返す
 * @param {string} contextKey
 * @returns {object[]}
 */
export function getObservations(contextKey) {
  return DISEASE_CONTEXTS[contextKey]?.observations ?? [];
}

/**
 * vocabulary キーから contextPhrase をランダムに1つ返す
 * @param {string} contextKey
 * @param {string} vocabKey
 * @returns {string|null}
 */
export function getContextPhrase(contextKey, vocabKey) {
  const phrases = _VOCAB[contextKey]?.[vocabKey]?.contextPhrases;
  if (!phrases || phrases.length === 0) return null;
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ─────────────────────────────────────────────────────────────
//  Window 公開 (legacy script / devtools 用)
// ─────────────────────────────────────────────────────────────

window.ippoDiseaseContexts = {
  DISEASE_CONTEXTS,
  DISEASE_NAME_MAP,
  getDiseaseContext,
  getDiseaseContexts,
  matchVocabulary,
  getObservations,
  getContextPhrase,
};
