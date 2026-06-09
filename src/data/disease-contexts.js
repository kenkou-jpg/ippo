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
  '子宮内膜症':   'endometriosis',
  'PCOS':         'pcos',
  'PMS':          'pms',
  'PMDD':         'pmdd',
  'PMS/PMDD':     'pms',          // 既存データとの互換キー（pmsとして扱う）
  '卵巣嚢腫':     'ovarianCyst',
  // Phase0追加 — 7疾患
  '子宮筋腫':     'fibroid',
  '子宮腺筋症':   'adenomyosis',
  '更年期障害':   'menopause',
  '不妊症':       'infertility',
  '骨盤臓器脱':   'prolapse',
  '慢性骨盤痛':   'chronicPelvicPain',
  '外陰痛症候群': 'vulvodynia',
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

  // ── 子宮筋腫 ──────────────────────────────────────────
  fibroid: {
    pressureAndBleeding: {
      signals:        ['下腹部痛', '腹部膨満', '経血量増加'],
      contextPhrases: ['経血が増えてきた感覚', '下腹部に重みを感じる', '量の変化に気づく'],
    },
    chronicFatigue: {
      signals:        ['倦怠感', '頭痛'],
      contextPhrases: ['疲れが続く', '貧血のような感じ', '体が重い'],
    },
  },

  // ── 子宮腺筋症 ──────────────────────────────────────────
  adenomyosis: {
    painBeyondMeds: {
      signals:        ['下腹部痛', '腰痛', '倦怠感'],
      contextPhrases: ['痛み止めが効きにくい', '痛みが深いところにある', '毎月つらさが増す'],
    },
    heavyFlow: {
      signals:        ['経血量増加', '腹部膨満'],
      contextPhrases: ['経血の量が増えた', '塊が出る', '日常生活への影響'],
    },
  },

  // ── 更年期障害 ──────────────────────────────────────────
  menopause: {
    hotFlashWaves: {
      signals:        ['ホットフラッシュ', 'のぼせ', '寝汗'],
      contextPhrases: ['急に熱くなる', 'のぼせが波のように来る', '夜中に目が覚める'],
    },
    moodAndSleep: {
      signals:        ['不眠', '気分の落ち込み', 'イライラ', '倦怠感'],
      contextPhrases: ['眠れない夜が続く', '気持ちの波が大きい', '疲れが取れない'],
    },
    bodyChange: {
      signals:        ['動悸', '関節痛', '集中力低下'],
      contextPhrases: ['体の変化を感じる', '体が知らせるサイン', '自分の体を観察する'],
    },
  },

  // ── 不妊症 ──────────────────────────────────────────
  infertility: {
    cycleObservation: {
      signals:        ['おりもの変化', '下腹部痛'],
      contextPhrases: ['体のサインを読む', '排卵の兆候', 'おりものの変化'],
    },
    emotionalFlow: {
      signals:        ['気分の落ち込み', '不安感', '倦怠感'],
      contextPhrases: ['揺れる気持ちを受け止める', 'ひとりで抱え込まない', '体と心のペースに合わせて'],
    },
  },

  // ── 骨盤臓器脱 ──────────────────────────────────────────
  prolapse: {
    gravityAwareness: {
      signals:        ['圧迫感', '骨盤内重だるさ', '尿漏れ'],
      contextPhrases: ['立っていると感じる重さ', '体の内側の違和感', '日中に変化する感覚'],
    },
    dailyAdaptation: {
      signals:        ['頻尿', '倦怠感'],
      contextPhrases: ['体の変化と向き合う', '無理をしない選択', '骨盤底筋を意識する'],
    },
  },

  // ── 慢性骨盤痛 ──────────────────────────────────────────
  chronicPelvicPain: {
    persistentPain: {
      signals:        ['下腹部痛', '腰痛', '骨盤内重だるさ'],
      contextPhrases: ['毎日そこにある痛み', '波のある不快感', '体の奥から来る感覚'],
    },
    painAndLife: {
      signals:        ['倦怠感', '不眠', '集中力低下'],
      contextPhrases: ['痛みと共に生きる', '記録が手がかりになる', '変化を見つける'],
    },
  },

  // ── 外陰痛症候群 ──────────────────────────────────────────
  vulvodynia: {
    contactSensitivity: {
      signals:        ['外陰部灼熱感', '刺痛', '座位痛'],
      contextPhrases: ['接触で感じる痛み', '灼けるような感覚', '座るだけでつらい時'],
    },
    isolationAwareness: {
      // 外陰痛は孤立感を生みやすい。寄り添いの視点を持つ
      signals:        ['不安感', '不眠', '気分の落ち込み'],
      contextPhrases: ['一人で抱えていませんか', 'この痛みは本物', '理解されにくい経験'],
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
  //  子宮筋腫
  // ══════════════════════════════════════════════════════════

  fibroid: {
    diseaseNameJa: '子宮筋腫',
    vocabulary:    _VOCAB.fibroid,

    lifeFlow: {
      cycleSensitive:   true,
      cumulativeNature: true,
      primaryTiming:    'menstrual',
      description:      '経血量の変化と下腹部の重さを、長い時間軸で観察していく日々',
    },

    observations: [
      {
        id:            'fibroid_heavy_flow',
        vocabularyKey: 'pressureAndBleeding',
        phrase:        '最近、経血の量が以前より増えていませんか？',
        context:       '少しずつの変化も、記録を続けることで気づきやすくなります。',
      },
      {
        id:            'fibroid_pressure',
        vocabularyKey: 'pressureAndBleeding',
        phrase:        '下腹部に圧迫感や重さを感じることはありますか？',
        context:       '体が送るサインを、丁寧に記録してみて。',
      },
      {
        id:            'fibroid_fatigue',
        vocabularyKey: 'chronicFatigue',
        phrase:        '疲れが続いている感じがしませんか？',
        context:       '経血量の変化が体に影響していることがあります。',
      },
    ],

    calmingPrinciples: [
      '変化を「記録」することで、医師への伝え方が変わる',
      '経血量の増減は、体からの大事なメッセージ',
      '焦らず、長い目で自分の体を見守る',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  子宮腺筋症
  // ══════════════════════════════════════════════════════════

  adenomyosis: {
    diseaseNameJa: '子宮腺筋症',
    vocabulary:    _VOCAB.adenomyosis,

    lifeFlow: {
      cycleSensitive:   true,
      cumulativeNature: true,
      primaryTiming:    'menstrual',
      description:      '毎月の生理に伴う深い痛みと、長期的に変化していく体との対話',
    },

    observations: [
      {
        id:            'adeno_pain_meds',
        vocabularyKey: 'painBeyondMeds',
        phrase:        '痛み止めが効きにくいと感じることがありますか？',
        context:       '痛みの感じ方を記録しておくと、治療の選択肢を考える手がかりになります。',
      },
      {
        id:            'adeno_accumulation',
        vocabularyKey: 'painBeyondMeds',
        phrase:        '生理のたびに、少しずつつらさが増している感じがしますか？',
        context:       '変化に気づくこと自体が、体との対話の第一歩です。',
      },
      {
        id:            'adeno_heavy',
        vocabularyKey: 'heavyFlow',
        phrase:        '経血の量や塊が増えていませんか？',
        context:       '量の変化も、体が語りかけているサインです。',
      },
    ],

    calmingPrinciples: [
      '「耐えるしかない」ではなく、「記録して伝える」という選択',
      '痛みの変化を言語化することが、治療の扉を開く',
      '体への敬意は、観察から始まる',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  更年期障害
  // ══════════════════════════════════════════════════════════

  menopause: {
    diseaseNameJa: '更年期障害',
    vocabulary:    _VOCAB.menopause,

    lifeFlow: {
      cycleSensitive:   false,
      cumulativeNature: false,
      primaryTiming:    'any',
      description:      '体と心が変化する移行期を、波として受け止めながら過ごす日々',
    },

    observations: [
      {
        id:            'meno_hotflash',
        vocabularyKey: 'hotFlashWaves',
        phrase:        '急に熱くなる感覚が一日に何度か来ていませんか？',
        context:       'ホットフラッシュの頻度を記録すると、体の変化のパターンが見えてきます。',
      },
      {
        id:            'meno_sleep',
        vocabularyKey: 'moodAndSleep',
        phrase:        '夜中に目が覚めることが増えていませんか？',
        context:       '睡眠の変化も、体が移行期にいることを教えてくれています。',
      },
      {
        id:            'meno_mood',
        vocabularyKey: 'moodAndSleep',
        phrase:        '気分の波が以前より大きくなっていませんか？',
        context:       '感情の変化はホルモンの影響によるものです。自分を責めないで。',
      },
      {
        id:            'meno_body',
        vocabularyKey: 'bodyChange',
        phrase:        '体のいろいろな場所に変化を感じていませんか？',
        context:       '体が変化を知らせているサインを、記録として残していきましょう。',
      },
    ],

    calmingPrinciples: [
      '更年期は「終わり」ではなく、「移行」の時間',
      '体の変化を観察し、記録することが自分への理解になる',
      '波のある時期こそ、休息と記録を大切に',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  不妊症
  // ══════════════════════════════════════════════════════════

  infertility: {
    diseaseNameJa: '不妊症',
    vocabulary:    _VOCAB.infertility,

    lifeFlow: {
      cycleSensitive:   true,
      cumulativeNature: false,
      primaryTiming:    'ovulation',
      description:      '体のサインを読みながら、一周期ずつ丁寧に過ごしていく日々',
    },

    observations: [
      {
        id:            'infertility_cycle',
        vocabularyKey: 'cycleObservation',
        phrase:        '体が排卵のサインを送ってきていませんか？',
        context:       'おりものの変化や体の感覚は、体からのメッセージです。',
      },
      {
        id:            'infertility_emotion',
        vocabularyKey: 'emotionalFlow',
        phrase:        '気持ちが揺れやすい時期が続いていませんか？',
        context:       '感情の波は、体と心が懸命に応えようとしているサインかもしれません。',
      },
      {
        id:            'infertility_rest',
        vocabularyKey: 'emotionalFlow',
        phrase:        '今日は自分に優しくできていますか？',
        context:       '治療中の体と心には、特別な休息が必要です。',
      },
    ],

    calmingPrinciples: [
      '体のリズムを知ることは、自分を知ること',
      '記録は治療のためだけでなく、自分への理解のために',
      '感情の波も、体の一部として受け止める',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  骨盤臓器脱
  // ══════════════════════════════════════════════════════════

  prolapse: {
    diseaseNameJa: '骨盤臓器脱',
    vocabulary:    _VOCAB.prolapse,

    lifeFlow: {
      cycleSensitive:   false,
      cumulativeNature: false,
      primaryTiming:    'any',
      description:      '姿勢や活動量によって変化する体の感覚を、観察しながら調整していく日々',
    },

    observations: [
      {
        id:            'prolapse_pressure',
        vocabularyKey: 'gravityAwareness',
        phrase:        '立っているときや動いているとき、下腹部に重さを感じますか？',
        context:       '体の感覚の変化を記録することで、日常のパターンが見えてきます。',
      },
      {
        id:            'prolapse_urinary',
        vocabularyKey: 'gravityAwareness',
        phrase:        '尿もれや頻尿が気になる時間帯がありますか？',
        context:       '記録することで、医師への相談もより具体的になります。',
      },
      {
        id:            'prolapse_activity',
        vocabularyKey: 'dailyAdaptation',
        phrase:        '骨盤底筋トレーニングを取り入れられていますか？',
        context:       '少しずつの積み重ねが、体の変化につながります。',
      },
    ],

    calmingPrinciples: [
      '体の変化に気づくことは、管理の第一歩',
      '骨盤底筋を意識することを、日常のリズムに',
      '記録は「悪化を恐れる」のではなく「変化を知る」ため',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  慢性骨盤痛
  // ══════════════════════════════════════════════════════════

  chronicPelvicPain: {
    diseaseNameJa: '慢性骨盤痛',
    vocabulary:    _VOCAB.chronicPelvicPain,

    lifeFlow: {
      cycleSensitive:   false,
      cumulativeNature: true,
      primaryTiming:    'any',
      description:      '毎日そこにある痛みと向き合いながら、少しでも楽に過ごす方法を探す日々',
    },

    observations: [
      {
        id:            'cpp_daily_pain',
        vocabularyKey: 'persistentPain',
        phrase:        '今日の骨盤の痛みは、昨日と比べていかがですか？',
        context:       '日々の変化を記録することで、痛みのパターンが見えてきます。',
      },
      {
        id:            'cpp_trigger',
        vocabularyKey: 'persistentPain',
        phrase:        '痛みが強くなるタイミングやきっかけがありますか？',
        context:       'トリガーを知ることが、日常を楽にする手がかりになります。',
      },
      {
        id:            'cpp_fatigue',
        vocabularyKey: 'painAndLife',
        phrase:        '痛みが続く中で、疲れが溜まっていませんか？',
        context:       '慢性的な痛みと疲れは繋がっています。休息も治療のうちです。',
      },
    ],

    calmingPrinciples: [
      '原因不明でも、記録は意味を持つ',
      '痛みを「耐えるもの」から「観察するもの」へ',
      '少しの変化に気づくことが、希望の糸口になる',
    ],
  },

  // ══════════════════════════════════════════════════════════
  //  外陰痛症候群
  // ══════════════════════════════════════════════════════════

  vulvodynia: {
    diseaseNameJa: '外陰痛症候群',
    vocabulary:    _VOCAB.vulvodynia,

    lifeFlow: {
      cycleSensitive:   false,
      cumulativeNature: false,
      primaryTiming:    'any',
      description:      '見えにくい痛みを抱えながら、日常の中でできることを一つずつ探す日々',
    },

    observations: [
      {
        id:            'vulvo_burning',
        vocabularyKey: 'contactSensitivity',
        phrase:        '灼けるような感覚や刺すような痛みが続いていませんか？',
        context:       'この痛みはあなたが感じている通りに本物です。記録が医師への伝え方を変えます。',
      },
      {
        id:            'vulvo_sitting',
        vocabularyKey: 'contactSensitivity',
        phrase:        '座っている時間が長いと症状が強くなりますか？',
        context:       '座位との相関を記録すると、日常の調整に役立ちます。',
      },
      {
        id:            'vulvo_isolation',
        vocabularyKey: 'isolationAwareness',
        phrase:        'この痛みについて、誰かに話せていますか？',
        context:       '外陰痛は孤立感を生みやすい疾患です。一人で抱えないで。',
      },
      {
        id:            'vulvo_selfcare',
        vocabularyKey: 'isolationAwareness',
        phrase:        '今日、自分の体に優しくできていますか？',
        context:       '小さなセルフケアの積み重ねが、体との関係を変えていきます。',
      },
    ],

    calmingPrinciples: [
      'この痛みはあなたのせいではない',
      '見えにくい痛みこそ、記録が力になる',
      '孤独を感じたとき、記録はあなたの体を証言してくれる',
    ],
  },

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
  return phrases[0];
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
