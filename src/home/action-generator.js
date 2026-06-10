// src/home/action-generator.js
// Phase H4: reason / prediction / temperature / state → ActionCard 生成。
// 分析しない。各エンジン出力の要約から優先順位付きアクションを選ぶだけ。

/**
 * @param {{
 *   reason:      object|null,
 *   prediction:  object|null,
 *   temperature: object|null,
 *   state:       object,
 * }} input
 * @returns {{ type: string, title: string, body: string, priority: number }}
 */
export function generateAction({ reason, prediction, temperature, state: _state }) {
  const candidates = [];

  // 優先度1: 高痛み予測
  const pain = prediction?.body && prediction.confidence >= 0.7
    ? _extractPainScore(prediction.body)
    : null;
  if (pain != null && pain >= 7) {
    candidates.push({
      priority: 1,
      body: '今夜は早めに休むことが助けになるかもしれません。',
    });
  }

  // 優先度2: フレアトリガー特定済み
  const trigger = reason?.body ? _extractTrigger(reason.body) : null;
  if (trigger) {
    candidates.push({
      priority: 2,
      body: '「' + trigger + '」を控えると症状が落ち着きやすい傾向があります。',
    });
  }

  // 優先度3: 排卵接近（3日以内）
  if (temperature?.ovulationEstimate) {
    const daysToOvulation = _daysFrom(temperature.ovulationEstimate);
    if (daysToOvulation != null && daysToOvulation >= 0 && daysToOvulation <= 3) {
      candidates.push({
        priority: 3,
        body: '排卵期が近い可能性があります。体を温めて無理をしないようにしましょう。',
      });
    }
  }

  // 優先度4: 頭痛リスク高め
  if (prediction?.body && /頭痛リスク/.test(prediction.body)) {
    candidates.push({
      priority: 4,
      body: 'カフェインやアルコールを控えめにすると頭痛を予防しやすくなります。',
    });
  }

  // 優先度5: 悪化傾向
  if (reason?.body && /悪化/.test(reason.body)) {
    candidates.push({
      priority: 5,
      body: '症状が増えています。記録を続けて、変化を医師に伝えましょう。',
    });
  }

  // 優先度6: デフォルト
  candidates.push({
    priority: 6,
    body: '今日の記録を続けることで、体のパターンが見えてきます。',
  });

  const best = candidates.sort((a, b) => a.priority - b.priority)[0];
  return { type: 'action', title: '今日できること', body: best.body, priority: best.priority };
}

function _extractPainScore(body) {
  const m = body.match(/予測スコア\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function _extractTrigger(body) {
  const m = body.match(/「(.+?)」が症状と重なりやすい/);
  return m ? m[1] : null;
}

function _daysFrom(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
}
