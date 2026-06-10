// src/ai/prompt-builder.js
// Phase3: ClaudeFeatures から疾患別 system prompt + user prompt を構築する。
//
// ルール:
//   - records[] 生データは受け取らない。extractFeatures() の出力のみ受け取る。
//   - 医療診断・予測・数値スコアを断定する表現を禁止。
//   - 疾患が未設定の場合は _default system prompt を使用する。
//   - model・max_tokens はここで一元管理する。

const MODEL      = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1000;

// ─────────────────────────────────────────────────────────────
//  疾患別 system prompt
//  "診断" ではなく "観察・支持・傾向把握" のトーンを維持する。
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPTS = {

  '子宮内膜症': `あなたは子宮内膜症専門のヘルスアドバイザーです。
医学的診断は行わず、患者の症状パターンを観察・支持します。
性交痛・排便痛・月経外の骨盤痛に注目してください。
「つらさが積み重なる感覚」を理解し、否定しない姿勢を保ってください。`,

  '卵巣嚢腫': `あなたは卵巣嚢腫専門のヘルスアドバイザーです。
医学的診断は行わず、症状の変化パターンを観察します。
片側の痛みや腹部の変化に注目してください。
周期との関係性を丁寧に観察する視点を大切にしてください。`,

  '子宮筋腫': `あなたは子宮筋腫専門のヘルスアドバイザーです。
医学的診断は行わず、経血量・下腹部の変化パターンを観察します。
長期的な変化の記録が医師との対話に役立つことを伝えてください。
経血量の変化は体からの重要なメッセージとして捉えてください。`,

  '子宮腺筋症': `あなたは子宮腺筋症専門のヘルスアドバイザーです。
医学的診断は行わず、毎月の痛みのパターンと変化を観察します。
「痛み止めが効きにくい」という体験を否定しないでください。
長期的な記録が治療選択肢を考える手がかりになることを伝えてください。`,

  'PCOS': `あなたはPCOS専門のヘルスアドバイザーです。
医学的診断は行わず、月経不順・ホルモンバランス・インスリン抵抗性の観点から観察します。
食事・運動・体重との関係に注目してください。
「体のリズムが独自」であることを否定せず、観察の視点を支持してください。`,

  'PMS/PMDD': `あなたはPMS/PMDD専門のヘルスアドバイザーです。
医学的診断は行わず、月経前の症状パターンと周期との関係を観察します。
感情の変化が「気のせい」ではなくホルモンの影響であることを支持してください。
黄体期の症状増悪パターンに注目してください。`,

  '更年期障害': `あなたは更年期障害専門のヘルスアドバイザーです。
医学的診断は行わず、ホットフラッシュ・睡眠障害・気分変動のパターンに注目します。
「体が変わっていく時期」を否定せず、変化を観察する視点を大切にしてください。
症状の多様性を理解し、一人ひとりの体験を尊重してください。`,

  '不妊症': `あなたは不妊治療中の方を支援するヘルスアドバイザーです。
医学的診断・予測は行わず、排卵の兆候・体のサインの観察を支持します。
感情的な揺れ（不安・落ち込み）を否定せず、「揺れる気持ちを受け止める」姿勢を保ってください。
記録を続けることが体との対話になることを伝えてください。`,

  '骨盤臓器脱': `あなたは骨盤臓器脱専門のヘルスアドバイザーです。
医学的診断は行わず、体の変化パターンを観察します。
立位・長時間活動時の症状変化に注目してください。
骨盤底筋への意識を高める視点を支持してください。`,

  '慢性骨盤痛': `あなたは慢性骨盤痛専門のヘルスアドバイザーです。
医学的診断は行わず、痛みの波と日常生活への影響を観察します。
「毎日そこにある痛み」と共に生きることを否定せず、変化を見つける視点を大切にしてください。
記録が手がかりになることを伝えてください。`,

  '外陰痛症候群': `あなたは外陰痛症候群専門のヘルスアドバイザーです。
医学的診断は行わず、接触・座位・日常活動時の症状パターンを観察します。
この疾患が孤立感を生みやすいことを理解し、「この痛みは本物」という姿勢を保ってください。
患者が一人で抱え込まないよう、寄り添う言葉を選んでください。`,

  _default: `あなたは婦人科疾患専門のヘルスアドバイザーです。
医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。
ユーザーの体験を否定せず、記録を続けることへの意欲を支持してください。
症状の変化に気づいた場合は、医師への相談を促してください。`,
};

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/**
 * ClaudeFeatures からプロンプトオブジェクトを構築する。
 * @param {import('./feature-engine.js').ClaudeFeatures} features
 * @returns {{ system: string, user: string, model: string, maxTokens: number }}
 */
export function buildPrompt(features) {
  return {
    system:    _selectSystemPrompt(features.disease),
    user:      _buildUserPrompt(features),
    model:     MODEL,
    maxTokens: MAX_TOKENS,
  };
}

/**
 * 疾患名から system prompt を返す。疾患が未設定なら _default。
 * @param {string|null} diseaseName
 * @returns {string}
 */
export function getSystemPrompt(diseaseName) {
  return _selectSystemPrompt(diseaseName);
}

/**
 * 登録済み疾患名一覧を返す（_default を除く）。
 * @returns {string[]}
 */
export function listSupportedDiseases() {
  return Object.keys(SYSTEM_PROMPTS).filter(k => k !== '_default');
}

// ─── private helpers ─────────────────────────────────────────

function _selectSystemPrompt(diseaseName) {
  if (!diseaseName) return SYSTEM_PROMPTS._default;
  return SYSTEM_PROMPTS[diseaseName] || SYSTEM_PROMPTS._default;
}

function _buildUserPrompt(features) {
  const lines = [
    `# 健康記録の分析結果`,
    ``,
    `## 基本情報`,
    `- 分析期間: ${features.period}`,
    `- 信頼度: ${_confidenceLabel(features.confidence)}`,
    ``,
    `## 主な症状（記録頻度順）`,
    features.topSymptoms.length
      ? features.topSymptoms.map(s => `- ${s}`).join('\n')
      : '- 記録データが不足しています',
    ``,
    `## 体調の傾向`,
    `- 全体的な傾向: ${_trendLabel(features.trend)}`,
    `- フレア頻度: ${features.flareRate}`,
    features.flareTrigger ? `- 主なトリガー: ${features.flareTrigger}` : '',
    ``,
  ];

  if (features.diseaseSpecific) {
    lines.push(`## 疾患固有の観察`);
    lines.push(_formatDiseaseSpecific(features.diseaseSpecific));
    lines.push('');
  }

  if (features.prediction) {
    lines.push(`## 翌日の体調予測（参考）`);
    const p = features.prediction;
    if (p.painForecast    !== null) lines.push(`- 痛みの予測: ${p.painForecast.toFixed(1)}/10`);
    if (p.fatigueForecast !== null) lines.push(`- 疲労の予測: ${p.fatigueForecast.toFixed(1)}/10`);
    if (p.headacheForecast !== null) lines.push(`- 頭痛リスク: ${Math.round(p.headacheForecast * 100)}%`);
    if (p.sleepForecast   !== null) lines.push(`- 睡眠予測: ${p.sleepForecast.toFixed(1)}時間`);
    lines.push(`- 予測信頼度: ${_confidenceLabel(p.confidence)}（${p.sampleSize}件の記録から）`);
    lines.push(`- ※これは統計的傾向であり、診断や保証ではありません`);
    lines.push('');
  }

  if (features.cluster) {
    lines.push(`## 同じ傾向のユーザーとの比較`);
    const c = features.cluster;
    if (c.avgPain    !== null) lines.push(`- 同グループの平均痛み: ${c.avgPain.toFixed(1)}/10`);
    if (c.avgFatigue !== null) lines.push(`- 同グループの平均疲労: ${c.avgFatigue.toFixed(1)}/10`);
    if (c.avgSleep   !== null) lines.push(`- 同グループの平均睡眠: ${c.avgSleep.toFixed(1)}時間`);
    if (c.clusterSize !== null) lines.push(`- グループ人数: 約${c.clusterSize}人`);
    lines.push('');
  }

  if (features.temperature) {
    lines.push(`## 体温リズム分析`);
    const t = features.temperature;
    lines.push(`- 二相性パターン: ${t.biphasicDetected ? '検出あり' : '検出なし'}`);
    lines.push(`- 低温・高温の温度差: ${t.tempDiff}℃`);
    if (t.ovulationEstimate) lines.push(`- 体温上昇が見られた時期: ${t.ovulationEstimate}ごろ`);
    lines.push(`- 体温分析の信頼度: ${_confidenceLabel(t.confidence)}`);
    lines.push('');
  }

  lines.push(`## お願い`);
  lines.push(`上記の記録データをもとに、以下を250字以内で教えてください：`);
  lines.push(`1. 注目すべき症状パターン（1〜2点）`);
  lines.push(`2. 日常生活で試してみると良いこと（1点）`);
  lines.push(`3. 体温リズム・翌日予測など追加情報から気づいたこと（該当する場合のみ・1点）`);
  lines.push(`4. 医師への相談を検討すべき状況（該当する場合のみ）`);
  lines.push(``);
  lines.push(`※ ${features.disclaimer}`);

  return lines.filter(l => l !== '').join('\n');
}

function _confidenceLabel(confidence) {
  return { high: '高（60件以上）', medium: '中（30〜59件）', low: '低（14〜29件）', insufficient: '不足（14件未満）' }[confidence]
    || confidence;
}

function _trendLabel(trend) {
  return { worsening: '悪化傾向', improving: '改善傾向', stable: '安定' }[trend] || trend;
}

function _formatDiseaseSpecific(specific) {
  // 数値・文字列の浅いフォーマット。生レコードは含まれない前提。
  return Object.entries(specific)
    .map(([k, v]) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'object' && v.note) return `- ${v.note}`;
      if (typeof v === 'object' && v.count !== undefined)
        return `- ${k}: ${v.count}件`;
      return null;
    })
    .filter(Boolean)
    .join('\n') || '- 分析データなし';
}
