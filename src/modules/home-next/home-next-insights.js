// ============================================================
//  ippo – home-next-insights.js v2
//  大型インサイトカード: ✦ 今日のインサイト
//  自然な「傾向」を、太字で静かに提示する
// ============================================================

// ── 直近レコード取得 ─────────────────────────────────────

function getWeekRecords(records) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff;
  });
}

function getMonthRecords(records) {
  const now = new Date();
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
}

// ── インサイト候補を生成 ─────────────────────────────────
// 戻り値: { main, sub } | null

function findBestInsight(records, config) {
  if (!records || records.length < 4) return null;

  const week     = getWeekRecords(records);
  const month    = getMonthRecords(records);
  const priority = (config && config.insightPriority) || [];

  const candidates = [];

  // ─ 睡眠不足→翌日の痛み ─
  {
    let matchCount = 0;
    let totalPairs = 0;
    const sorted = [...records].sort((a, b) =>
      new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const today = sorted[i];
      const next  = sorted[i + 1];
      if ((today.sleepQuality ?? 0) >= 3) {
        totalPairs++;
        if ((next.painLevel ?? 0) >= 2) matchCount++;
      }
    }
    if (totalPairs >= 2 && matchCount / totalPairs >= 0.5) {
      const pct = Math.round(matchCount / totalPairs * 100);
      candidates.push({
        priority: priority.includes('sleep_pain') ? 10 : 5,
        main: '睡眠が浅い日の翌日は、\n痛みが強くなりやすい傾向があります',
        sub:  `過去の記録からみると、約${pct}%の確率で見られます。`,
      });
    }
  }

  // ─ 睡眠不足→気分の落ち込み ─
  {
    const poorSleepMoodDays = week.filter(r =>
      (r.sleepQuality ?? 0) >= 3 &&
      (r.symptoms || []).some(s => ['気分の落ち込み', 'イライラ'].includes(s))
    );
    if (poorSleepMoodDays.length >= 2) {
      candidates.push({
        priority: priority.includes('sleep_mood') ? 9 : 4,
        main: '睡眠が浅い日に、\n気分の揺れが起きやすいかもしれません',
        sub:  '今週だけでも同じパターンが見られます。睡眠を整えることが助けになることがあります。',
      });
    }
  }

  // ─ 周期フェーズ×気分 ─
  {
    const lutealMoodDips = week.filter(r =>
      (r.symptoms || []).some(s => ['気分の落ち込み', 'イライラ', '不安感'].includes(s))
    );
    if (lutealMoodDips.length >= 3 && priority.includes('cycle_mood')) {
      candidates.push({
        priority: 8,
        main: '生理前の時期に、\n気分の波が出やすい傾向があります',
        sub:  '周期に合わせて自分を労わる時間を意識的に取ってみましょう。',
      });
    }
  }

  // ─ 繰り返し症状 ─
  {
    const symCount = {};
    week.forEach(r => (r.symptoms || []).forEach(s => {
      symCount[s] = (symCount[s] || 0) + 1;
    }));
    const top = Object.entries(symCount).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) {
      candidates.push({
        priority: 3,
        main: `今週、「${top[0]}」が\n${top[1]}日続いています`,
        sub:  '記録を継続することで、症状のパターンが見えてきます。',
      });
    }
  }

  // ─ 今月の痛み日数 ─
  {
    const painDays = month.filter(r => (r.painLevel ?? 0) >= 2);
    if (painDays.length >= 4) {
      candidates.push({
        priority: priority.includes('pain_cycle') ? 7 : 2,
        main: `今月は${painDays.length}日、\n痛みの記録があります`,
        sub:  '周期との関係はインサイト画面で確認できます。',
      });
    }
  }

  // ─ 疾患別インサイト ─
  const profileKey = (config && config.profileKey) || 'default';

  // PCOS: 血糖×疲労
  if (['pcos'].includes(profileKey)) {
    const fatigueDays = week.filter(r =>
      (r.symptoms || []).some(s => ['倦怠感', 'だるさ', '食後の眠気'].includes(s))
    );
    if (fatigueDays.length >= 3) {
      candidates.push({
        priority: priority.includes('glycemic_fatigue') ? 11 : 6,
        main: `今週${fatigueDays.length}日、\n食後の疲労感・眠気が見られます`,
        sub:  '炭水化物の摂取量や食事の順番との関係を観察してみましょう。',
      });
    }
    // 周期の乱れ
    const irregSigns = week.filter(r =>
      (r.symptoms || []).some(s => ['月経不順', '周期の乱れ'].includes(s))
    ).length;
    if (irregSigns >= 2) {
      candidates.push({
        priority: priority.includes('cycle_mood') ? 9 : 4,
        main: '周期の変化が\n今週も続いています',
        sub:  '記録を続けることで、周期のパターンが見えてきます。',
      });
    }
  }

  // 子宮内膜症・子宮腺筋症: 炎症×疲労×睡眠
  if (['endometriosis', 'adenomyosis'].includes(profileKey)) {
    const highLoadDays = week.filter(r =>
      (r.painLevel ?? 0) >= 2 &&
      (r.sleepQuality ?? 0) >= 3
    ).length;
    if (highLoadDays >= 2) {
      candidates.push({
        priority: priority.includes('pain_cycle') ? 11 : 6,
        main: `痛みと睡眠不足が重なる日が\n今週${highLoadDays}日あります`,
        sub:  '睡眠が整うと、症状の負担が軽くなる可能性があります。',
      });
    }
    // 生理期×疼痛ピーク
    const bowelPainDays = week.filter(r =>
      (r.symptoms || []).some(s => ['排便痛', '排便時の痛み'].includes(s))
    ).length;
    if (bowelPainDays >= 2) {
      candidates.push({
        priority: 9,
        main: `排便時の痛みが\n今週${bowelPainDays}日続いています`,
        sub:  '受診時に伝えておくと、観察の参考になります。',
      });
    }
  }

  // 卵巣嚢腫: 張り×周期
  if (profileKey === 'ovarian_cyst') {
    const tensionDays = week.filter(r =>
      (r.symptoms || []).some(s => ['腹部膨満', 'お腹の張り', '下腹部の張り', 'むくみ'].includes(s))
    ).length;
    if (tensionDays >= 3) {
      candidates.push({
        priority: priority.includes('tension_cycle') ? 11 : 7,
        main: `今週${tensionDays}日、\n腹部の張り感が見られます`,
        sub:  '排卵期周辺での張りは周期との関係を記録しておくと参考になります。',
      });
    }
  }

  // PMS/PMDD: 気分×周期
  if (profileKey === 'pms') {
    const moodDips = week.filter(r =>
      (r.symptoms || []).some(s => ['イライラ', '気分の落ち込み', '情緒不安定', '不安感'].includes(s))
    ).length;
    if (moodDips >= 3) {
      candidates.push({
        priority: priority.includes('cycle_mood') ? 11 : 7,
        main: `今週${moodDips}日、\n気分の波が見られます`,
        sub:  '月経周期と気分の変化の関係を記録することで、傾向が見えてきます。',
      });
    }
    const irriDays = week.filter(r =>
      (r.symptoms || []).some(s => ['イライラ', '怒り'].includes(s))
    ).length;
    if (irriDays >= 3 && priority.includes('mood_irritability')) {
      candidates.push({
        priority: 10,
        main: `今週は${irriDays}日、\nイライラ感が続いています`,
        sub:  '生理前のホルモン変動によるものかもしれません。自分を責めないで。',
      });
    }
  }

  // 子宮筋腫: 出血×貧血
  if (profileKey === 'uterine_fibroid') {
    const heavyDays = week.filter(r =>
      ['heavy', 'very_heavy'].includes(r.menstrualCycle || '')
    ).length;
    if (heavyDays >= 2) {
      candidates.push({
        priority: priority.includes('bleeding_cycle') ? 11 : 7,
        main: `今週${heavyDays}日、\n経血量が多い状態が続いています`,
        sub:  '鉄分と休息を意識して過ごしましょう。変化があれば記録して。',
      });
    }
    const ironSigns = week.filter(r =>
      (r.symptoms || []).some(s => ['めまい', '立ちくらみ', '倦怠感'].includes(s))
    ).length;
    if (ironSigns >= 3 && heavyDays >= 1) {
      candidates.push({
        priority: 10,
        main: '貧血様の症状と\n経血量の増加が重なっています',
        sub:  '受診時に伝えておくと、観察の参考になります。',
      });
    }
  }

  // ─ 連続記録 (ポジティブ) ─
  {
    if (week.length >= 5 && candidates.length === 0) {
      candidates.push({
        priority: 1,
        main: `今週は${week.length}日、\n記録が続いています`,
        sub:  '続けるほど、あなただけのからだのパターンが見えてきます。',
      });
    }
  }

  if (!candidates.length) return null;

  // 優先度順で1件だけ
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

// ── インサイトカード 右下デコレーション ──────────────────

const INSIGHT_DECO = `<svg class="hn-insight-deco" viewBox="0 0 88 88" fill="none" aria-hidden="true">
  <path d="M82 82 Q65 60 44 52 Q56 56 82 82Z" fill="#C8D8BE" opacity="0.42"/>
  <path d="M82 82 Q76 56 60 42 Q68 60 82 82Z" fill="#D4E2CA" opacity="0.34"/>
  <path d="M82 82 Q82 58 70 42 Q73 62 82 82Z" fill="#BFD0B2" opacity="0.36"/>
  <path d="M68 82 Q56 68 44 62 Q52 60 68 82Z" fill="#CBD9BF" opacity="0.30"/>
</svg>`;

// ── インサイトカード HTML ─────────────────────────────────

export function renderInsights(container, state, config) {
  const insight = findBestInsight(state.records || [], config || {});

  if (!insight) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="hn-insight-card hn-anim-4">
      ${INSIGHT_DECO}
      <div class="hn-insight-tag-row">
        <span class="hn-insight-sparkle">✦</span>
        <span class="hn-insight-tag-label">今日のインサイト</span>
      </div>
      <div class="hn-insight-main">${esc(insight.main)}</div>
      <div class="hn-insight-sub">${esc(insight.sub)}</div>
      <button class="hn-insight-link"
        onclick="if(typeof window.switchTab==='function')window.switchTab('insights',null)">
        詳しく見る &rsaquo;
      </button>
    </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}
