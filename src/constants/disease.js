// ============================================================
//  ippo constants – disease.js
//  疾患別設定・セルフチェック定義
// ============================================================

// ===== 疾患別カスタマイズ =====
export const DISEASE_CONFIG = {
  '卵巣嚢腫': {
    label: '卵巣嚢腫セルフチェック',
    icon: '🩺',
    category: '卵巣',
    specificSymptoms: ['片側の下腹部痛','排卵痛','腹部膨満感','頻尿','便秘'],
    trackingTips: '片側痛の左右を毎日記録すると、受診時に有用です。',
    questions: [
      {id:'bloating', text:'お腹の張り具合は？', options:['なし','軽い','中程度','つらい']},
      {id:'abdom_pain', text:'腹痛は？', options:['なし','軽い','中程度','つらい']},
      {id:'frequent_urine', text:'頻尿症状は？', options:['なし','少し','頻繁']},
      {id:'bowel_pain', text:'排便時の痛みは？', options:['なし','軽い','中程度','つらい']},
      {id:'pelvic_dull', text:'片側の鈍痛は？', options:['なし','左側','右側','両側']}
    ]
  },
 '子宮内膜症': {
    label: '子宮内膜症セルフチェック',
    icon: '🔴',
    category: '子宮',
    specificSymptoms: ['性交痛','排便痛','慢性疲労','不妊','月経外の骨盤痛'],
    trackingTips: '排便痛は直腸付近の癒着の指標になります。',
    questions: [
      {id:'period_pain',    text:'生理痛の強さは？',     options:['なし','軽い','中程度','つらい','動けない']},
      {id:'sex_pain',       text:'性交痛はありますか？', options:['なし','時々','毎回','性交できない']},
      {id:'bowel_pain',     text:'排便時の痛みは？',     options:['なし','軽い','中程度','つらい']},
      {id:'chronic_pain',   text:'生理以外の骨盤痛は？', options:['なし','時々','頻繁','ほぼ毎日']},
      {id:'fatigue',        text:'慢性的な疲労感は？',   options:['なし','少し','中程度','ひどい']}
    ]
  },
 
  '子宮筋腫': {
    label: '子宮筋腫セルフチェック',
    icon: '🟤',
    category: '子宮',
    specificSymptoms: ['経血量増加','生理期間延長','頻尿','便秘','下腹部の圧迫感'],
    trackingTips: '経血量と生理期間の変化を毎月記録すると、筋腫の増大を早期に察知できます。',
    questions: [
      {id:'heavy_period',   text:'経血量は多いですか？',   options:['普通','やや多い','多い','非常に多い']},
      {id:'period_length',  text:'生理の期間は？',         options:['3〜5日','6〜7日','8日以上','不規則']},
      {id:'pressure',       text:'下腹部の圧迫感は？',     options:['なし','軽い','中程度','つらい']},
      {id:'frequent_urine', text:'頻尿症状は？',           options:['なし','少し','頻繁']},
      {id:'constipation',   text:'便秘症状は？',           options:['なし','時々','頻繁']}
    ]
  },
 
  'PCOS': {
    label: 'PCOSセルフチェック',
    icon: '🔵',
    category: 'ホルモン',
    specificSymptoms: ['月経不順','多毛','ニキビ','体重増加','排卵痛'],
    trackingTips: '食事内容と体重・体調の相関を記録すると、血糖値との関係が見えやすくなります。',
    questions: [
      {id:'cycle_irreg',    text:'月経周期の乱れは？',     options:['規則的','少し不規則','不規則','無月経']},
      {id:'weight_change',  text:'体重の変化は？',         options:['安定','やや増加','増加','急激な増加']},
      {id:'acne',           text:'ニキビ・肌荒れは？',     options:['なし','少し','中程度','ひどい']},
      {id:'hair_growth',    text:'多毛（顔・お腹等）は？', options:['なし','少し','気になる','多い']},
      {id:'mood',           text:'気分の波は？',           options:['安定','少し波がある','波が大きい','つらい']}
    ]
  },
 
  'PMS/PMDD': {
    label: 'PMS/PMDDセルフチェック',
    icon: '🌙',
    category: 'ホルモン',
    specificSymptoms: ['生理前のイライラ','気分の落ち込み','乳房痛','頭痛','むくみ'],
    trackingTips: '生理前7〜14日の症状を毎日記録すると、PMSとPMDDの区別が明確になります。',
    questions: [
      {id:'irritability',   text:'イライラ・怒りっぽさは？', options:['なし','少し','中程度','コントロール困難']},
      {id:'depression',     text:'気分の落ち込みは？',       options:['なし','少し','中程度','ひどい']},
      {id:'breast_pain',    text:'胸の張り・痛みは？',       options:['なし','軽い','中程度','つらい']},
      {id:'headache',       text:'頭痛は？',                 options:['なし','軽い','中程度','つらい']},
      {id:'swelling',       text:'むくみは？',               options:['なし','少し','中程度','ひどい']}
    ]
  },
 
  // ─── Tier 1 新規 ───
 
  '子宮腺筋症': {
    label: '子宮腺筋症セルフチェック',
    icon: '🟣',
    category: '子宮',
    specificSymptoms: ['痛み止め無効','経血量極多','レバー状の塊','下腹部膨満','貧血症状','性交痛'],
    trackingTips: '経血の塊の大きさと頻度を記録すると、症状の変化の把握に役立ちます。',
    questions: [
      {id:'pain_progress',  text:'生理痛は年々悪化していますか？', options:['変化なし','少し悪化','明らかに悪化','痛み止めが効かない']},
      {id:'heavy_flow',     text:'経血量はどの程度ですか？',       options:['少ない','普通','多い','非常に多い（夜用必須）']},
      {id:'non_period_pain',text:'生理以外の下腹部痛はありますか？', options:['なし','時々','頻繁','ほぼ毎日']},
      {id:'anemia',         text:'貧血の自覚症状はありますか？',   options:['なし','たまにめまい','頻繁にめまい','動悸・息切れあり']}
    ]
  },
 
  '更年期障害': {
    label: '更年期障害セルフチェック（SMI）',
    icon: '🌡️',
    category: 'ホルモン',
    scoring: 'SMI',
    specificSymptoms: ['ホットフラッシュ','寝汗','おりもの','性欲低下','関節のこわばり','記憶力低下','皮膚の乾燥'],
    trackingTips: 'SMIスコアの推移をグラフで確認でき、HRTや漢方の効果を可視化できます。',
    questions: [
      {id:'hotflash',       text:'ほてり・のぼせ',         options:['なし','弱い','中程度','強い']},
      {id:'sweating',       text:'発汗（寝汗含む）',       options:['なし','弱い','中程度','強い']},
      {id:'cold_limbs',     text:'手足の冷え',             options:['なし','弱い','中程度','強い']},
      {id:'palpitation',    text:'動悸・息切れ',           options:['なし','弱い','中程度','強い']},
      {id:'insomnia',       text:'不眠・眠りの浅さ',       options:['なし','弱い','中程度','強い']},
      {id:'irritable',      text:'イライラ・怒りっぽさ',   options:['なし','弱い','中程度','強い']},
      {id:'depressed',      text:'気分の落ち込み',         options:['なし','弱い','中程度','強い']},
      {id:'headache',       text:'頭痛・めまい',           options:['なし','弱い','中程度','強い']},
      {id:'fatigue',        text:'疲れやすさ',             options:['なし','弱い','中程度','強い']},
      {id:'joint_pain',     text:'肩こり・腰痛・関節痛',  options:['なし','弱い','中程度','強い']}
    ]
  },
 
  '不妊症': {
    label: '不妊症・排卵障害セルフチェック',
    icon: '🌱',
    category: '妊活',
    extraFields: ['hormoneLevels'],
    specificSymptoms: ['排卵痛','おりもの変化','注射部位の痛み','卵巣過剰刺激の兆候','着床出血'],
    trackingTips: 'ホルモン値を入力すると、周期ごとの比較グラフが作成されます。',
    questions: [
      {id:'treatment_stage',text:'現在の治療ステージ',     options:['タイミング法','人工授精','体外受精','顕微授精','治療休止中']},
      {id:'ovulation',      text:'排卵の状態',             options:['自然排卵あり','排卵誘発剤使用','無排卵','不明']},
      {id:'hospital_visit', text:'今周期の通院状況',       options:['未通院','検査のみ','治療中','採卵/移植周期']}
    ]
  },
 
  // ─── Tier 2 新規 ───
 
  '骨盤臓器脱': {
    label: '骨盤臓器脱セルフチェック',
    icon: '⬇️',
    category: '骨盤',
    specificSymptoms: ['下垂感','頻尿','夜間頻尿','尿漏れ','排便困難','性交時違和感','長時間立位で悪化'],
    trackingTips: '骨盤底筋トレーニングの実施を要因として記録すると、継続状況と体調の変化を一緒に確認できます。',
    questions: [
      {id:'prolapse_feel',  text:'下垂感・圧迫感',         options:['なし','軽い','中程度','重い']},
      {id:'urine_leak',     text:'尿漏れ',                 options:['なし','くしゃみ時のみ','日常的','常時パッド必要']},
      {id:'urination_diff', text:'排尿困難',               options:['なし','時々','頻繁','毎回']},
      {id:'defecation_diff',text:'排便困難',               options:['なし','時々','頻繁','指で押さないと出ない']}
    ]
  },
 
  '外陰痛症候群': {
    label: '外陰痛（Vulvodynia）セルフチェック',
    icon: '🔥',
    category: '外陰',
    specificSymptoms: ['灼熱感','刺痛','接触痛','座位痛','性交痛','衣服による悪化'],
    trackingTips: '痛みの部位を左右・前後で毎日記録すると、パターンが見えてきます。',
    questions: [
      {id:'pain_type',      text:'痛みの性質',             options:['灼熱感','刺すような痛み','ズキズキ','圧迫感']},
      {id:'pain_trigger',   text:'痛みの誘因',             options:['接触時のみ','常時','座位で悪化','性交時','衣服の摩擦']},
      {id:'pain_frequency', text:'痛みの頻度',             options:['週に数回','ほぼ毎日','1日中','間欠的']}
    ]
  },
 
  '慢性骨盤痛': {
    label: '慢性骨盤痛セルフチェック',
    icon: '🟠',
    category: '骨盤',
    specificSymptoms: ['持続的な骨盤痛','月経関連の増悪','排尿時痛','排便時痛','性交痛','腰痛への放散'],
    trackingTips: '原因不明の痛みこそ、要因との相関分析が特に有効です。',
    questions: [
      {id:'pain_duration',  text:'痛みの持続期間',         options:['6ヶ月未満','6ヶ月〜1年','1〜3年','3年以上']},
      {id:'diagnosis',      text:'診断状況',               options:['原因特定済み','検査中','原因不明','複数の診断あり']},
      {id:'daily_impact',   text:'日常生活への影響',       options:['軽微','中程度','かなり影響','生活困難']}
    ]
  }

};

// 移行期間: 非モジュール <script> との window 互換
window.DISEASE_CONFIG = DISEASE_CONFIG;
