// ============================================================
//  ippo – home-next-insights.js
//  インサイトレイヤー: 自然な「気づき」をそっと提示する
// ============================================================

// ── パターン分析 ─────────────────────────────────────────

function getWeekRecords(records) {
  const today  = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - 7);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && d <= today;
  });
}

function getMonthRecords(records) {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

// ── インサイト生成 ────────────────────────────────────────

function findInsights(records, config) {
  if (!records || records.length < 5) return [];

  const insights = [];
  const week     = getWeekRecords(records);
  const month    = getMonthRecords(records);
  const priority = config.insightPriority || [];

  // ─ 睡眠と痛みの相関 ─
  if (priority.includes('sleep_pain') || true) {
    const poorSleepPainDays = week.filter(r => r.sleepQuality >= 3 && r.painLevel >= 2);
    if (poorSleepPainDays.length >= 2) {
      insights.push({
        key:  'sleep_pain',
        text: `睡眠が浅い日の翌日、痛みが増える傾向があります。睡眠の質を記録し続けることで、パターンがより明確になります。`,
      });
    }
  }

  // ─ 痛みと周期の関係 ─
  if (priority.includes('pain_cycle') || true) {
    const highPainDays = month.filter(r => r.painLevel >= 2);
    if (highPainDays.length >= 3) {
      insights.push({
        key:  'pain_cycle',
        text: `今月は${highPainDays.length}日、痛みの記録があります。周期との関係はインサイト画面で確認できます。`,
      });
    }
  }

  // ─ 気分と睡眠 ─
  if (priority.includes('sleep_mood') || true) {
    const lowSleepDays = week.filter(r => r.sleepQuality >= 3);
    const moodDips     = week.filter(r => {
      const symptoms = r.symptoms || [];
      return symptoms.includes('気分の落ち込み') || symptoms.includes('イライラ');
    });
    if (lowSleepDays.length >= 2 && moodDips.length >= 2) {
      insights.push({
        key:  'sleep_mood',
        text: `睡眠が少ない日に、気分の揺れが起きやすいかもしれません。`,
      });
    }
  }

  // ─ 症状のパターン ─
  if (priority.includes('symptom_pattern') || true) {
    const symptomCounts = {};
    week.forEach(r => {
      (r.symptoms || []).forEach(s => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    });
    const topSymptom = Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0];
    if (topSymptom && topSymptom[1] >= 3) {
      insights.push({
        key:  'symptom_pattern',
        text: `今週は「${topSymptom[0]}」が${topSymptom[1]}日続いています。`,
      });
    }
  }

  // ─ 記録継続ポジティブ ─
  if (week.length >= 5 && insights.length === 0) {
    insights.push({
      key:  'streak',
      text: `今週は${week.length}日記録できています。続けるほど、あなただけのパターンが見えてきます。`,
    });
  }

  // ─ 無痛み日 ─
  const noPainDays = week.filter(r => r.painLevel === 0);
  if (noPainDays.length >= 4 && insights.length === 0) {
    insights.push({
      key:  'no_pain',
      text: `今週は${noPainDays.length}日、痛みのない日が続いています。`,
    });
  }

  return insights;
}

// ── インサイトカード HTML ─────────────────────────────────

function buildInsightCard(insight) {
  return `
    <div class="hn-insight-card hn-animate-3">
      <div class="hn-insight-header">
        <div class="hn-insight-dot"></div>
        <span class="hn-insight-tag">あなたの傾向</span>
      </div>
      <div class="hn-insight-text">${escapeHTML(insight.text)}</div>
    </div>`;
}

// ── メインレンダリング ────────────────────────────────────

export function renderInsights(container, state, config) {
  const records  = state.records || [];
  const insights = findInsights(records, config || {});

  if (insights.length === 0) {
    container.innerHTML = '';
    return;
  }

  // 最も優先度の高いインサイト1件だけ表示（情報過多を避ける）
  container.innerHTML = buildInsightCard(insights[0]);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
