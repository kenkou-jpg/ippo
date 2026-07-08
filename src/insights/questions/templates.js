// ============================================================
//  ippo – src/insights/questions/templates.js
//  Question Layer: 問いかけテンプレート（小規模初期セット、PR-P2-02）
//
//  docs/PRO_INSIGHT_ARCHITECTURE.md 5章の設計に基づく。
//  診断ではない。「一緒に考えるための問い」。
//  禁止: LLM 呼び出し / 診断 / 断定 / 病名推測 / 不安誘導
//  （companion-intelligence.js と同一の設計原則）
//
//  check(ctx) は companion-intelligence.js の
//  buildCompanionContext()/getCompanionContext() が返す形状を前提とする。
// ============================================================

export const QUESTION_TEMPLATES = [
  {
    id: 'q_fatigue_pattern',
    prompt: '最近、疲れが続きやすい傾向があるようです。心当たりはありますか？',
    check: function(ctx) {
      if (!ctx || !ctx.symptomTendency || !ctx.recentRecords) return false;
      if (ctx.symptomTendency.fatigueDays < 3) return false;
      const ratio = ctx.symptomTendency.fatigueDays / Math.min(ctx.recentRecords.length, 14);
      return ratio >= 0.4;
    },
    options: [
      { value: 'sleep',    label: '睡眠が足りていない' },
      { value: 'stress',   label: 'ストレスが重なっている' },
      { value: 'activity', label: '活動量が多い日が続いている' },
      { value: 'unknown',  label: 'わからない' },
    ],
  },
  {
    id: 'q_sleep_pain',
    prompt: '睡眠が浅い日の翌日に、体調の変化を感じることはありますか？',
    check: function(ctx) {
      return !!(ctx && ctx.sleepTendency && ctx.sleepTendency.poorDays >= 3);
    },
    options: [
      { value: 'yes_strong', label: 'はっきり感じる' },
      { value: 'yes_slight', label: '少し感じる' },
      { value: 'no',         label: 'あまり感じない' },
      { value: 'unknown',    label: 'わからない' },
    ],
  },
  {
    id: 'q_emotion_symptom',
    prompt: '不安を感じる日に、からだの症状も強くなりやすいようです。思い当たることはありますか？',
    check: function(ctx) {
      return !!(ctx && ctx.emotionTendency && ctx.emotionTendency.anxiousDays >= 2);
    },
    options: [
      { value: 'schedule', label: '予定や締め切りが重なっていた' },
      { value: 'sleep',    label: '睡眠が浅かった' },
      { value: 'hormonal', label: '周期のタイミングと重なっていた' },
      { value: 'unknown',  label: 'わからない' },
    ],
  },
];
