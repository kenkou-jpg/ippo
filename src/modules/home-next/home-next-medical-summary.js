// ============================================================
//  ippo – home-next-medical-summary.js
//  「医師に伝えやすい状態」: HOME で見られる受診補助カード
//  診断ではなく、観察結果・傾向としてまとめる
// ============================================================

import { getCyclePhase } from './home-next-config.js';

// ── 定数 ─────────────────────────────────────────────────

const DAYS_30 = 30;
const DAYS_14 = 14;

// ── 記録フィルター ────────────────────────────────────────

function getLastNDays(records, n) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - n);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d);
  });
}

// ── 観察ポイント生成 ─────────────────────────────────────

function generateObservations(records, state, profileKey) {
  const month = getLastNDays(records, DAYS_30);
  const week  = getLastNDays(records, DAYS_14);
  const observations = [];

  if (month.length < 4) return [];

  // ── 痛み関連 ──
  const painDays = month.filter(r => (r.painLevel ?? 0) >= 2);
  if (painDays.length >= 3) {
    observations.push({ text: `過去30日で${painDays.length}日、痛みの記録があります`, tag: '痛み' });
  }

  // 生理前後の痛み悪化
  if (state.lastPeriodDate && state.cycleLength) {
    const cl = state.cycleLength;
    const last = new Date(state.lastPeriodDate + 'T00:00:00');
    const prePeriodPain = month.filter(r => {
      const d = new Date(r.date || r.record_date || '');
      const dayNum = Math.floor((d - last) / 86400000) + 1;
      const daysFromEnd = cl - dayNum;
      return daysFromEnd <= 7 && daysFromEnd >= 0 && (r.painLevel ?? 0) >= 2;
    });
    if (prePeriodPain.length >= 2) {
      observations.push({ text: '生理前に痛みが強まる傾向があります', tag: '周期' });
    }
  }

  // ── 睡眠×症状 ──
  const sorted = [...month].sort((a, b) =>
    new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
  );
  let sleepPainCorr = 0, sleepPainTotal = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if ((sorted[i].sleepQuality ?? 0) >= 3) {
      sleepPainTotal++;
      if ((sorted[i + 1].painLevel ?? 0) >= 2) sleepPainCorr++;
    }
  }
  if (sleepPainTotal >= 3 && sleepPainCorr / sleepPainTotal >= 0.5) {
    observations.push({ text: '睡眠が浅い日の翌日に不調が強まる傾向があります', tag: '睡眠' });
  }

  // ── PCOS 固有 ──
  if (profileKey === 'pcos') {
    const fatigueDays = week.filter(r =>
      (r.symptoms || []).some(s => ['倦怠感', 'だるさ', '食後の眠気'].includes(s))
    ).length;
    if (fatigueDays >= 4) {
      observations.push({ text: '食後の疲労感・眠気が続いている傾向があります', tag: 'PCOS' });
    }
    if (state.cycleIrregular) {
      observations.push({ text: '月経周期が不規則な状態です', tag: '周期' });
    }
  }

  // ── 子宮内膜症・子宮腺筋症 固有 ──
  if (['endometriosis', 'adenomyosis'].includes(profileKey)) {
    const highPainDays = month.filter(r => (r.painLevel ?? 0) >= 3).length;
    if (highPainDays >= 4) {
      observations.push({ text: `過去30日で${highPainDays}日、強い痛みがありました`, tag: '疼痛' });
    }
    const bowelPain = month.filter(r =>
      (r.symptoms || []).some(s => ['排便痛', '排便時の痛み'].includes(s))
    ).length;
    if (bowelPain >= 2) {
      observations.push({ text: '排便時の痛みが繰り返し見られます', tag: '疼痛' });
    }
  }

  // ── 卵巣嚢腫 固有 ──
  if (profileKey === 'ovarian_cyst') {
    const tensionDays = week.filter(r =>
      (r.symptoms || []).some(s => ['腹部膨満', 'お腹の張り', '下腹部の張り'].includes(s))
    ).length;
    if (tensionDays >= 3) {
      observations.push({ text: '腹部膨満感・張りが繰り返し見られます', tag: '張り' });
    }
  }

  // ── PMS/PMDD 固有 ──
  if (profileKey === 'pms') {
    const moodDays = week.filter(r =>
      (r.symptoms || []).some(s => ['イライラ', '気分の落ち込み', '情緒不安定'].includes(s))
    ).length;
    if (moodDays >= 4) {
      observations.push({ text: '気分の波が今週多く見られます', tag: '気分' });
    }
  }

  // ── 子宮筋腫 固有 ──
  if (profileKey === 'uterine_fibroid') {
    const heavyDays = month.filter(r =>
      ['heavy', 'very_heavy'].includes(r.menstrualCycle || '')
    ).length;
    if (heavyDays >= 2) {
      observations.push({ text: '経血量が多い日が複数日続いています', tag: '出血' });
    }
    const ironSigns = week.filter(r =>
      (r.symptoms || []).some(s => ['めまい', '立ちくらみ', '動悸'].includes(s))
    ).length;
    if (ironSigns >= 2) {
      observations.push({ text: '貧血様の症状（めまい・動悸）が見られます', tag: '貧血' });
    }
  }

  // ── 体温トレンド ──
  const tempRecs = month.filter(r => r.temperature != null || r.temp != null);
  if (tempRecs.length >= 7) {
    const temps = tempRecs.map(r => r.temperature ?? r.temp);
    const avg = temps.reduce((a, b) => a + b, 0) / temps.length;
    const lowPhase = temps.filter(t => t < 36.2).length;
    if (lowPhase / temps.length > 0.6) {
      observations.push({ text: '体温が低めの状態が続く傾向があります', tag: '体温' });
    }
  }

  return observations.slice(0, 4);
}

// ── タグカラー ────────────────────────────────────────────

const TAG_COLORS = {
  '痛み': { bg: '#F5EDE3', color: '#B87F6A' },
  '周期': { bg: '#EEF3EB', color: '#6A9060' },
  '睡眠': { bg: '#EBF2F5', color: '#4A80A0' },
  '気分': { bg: '#F0ECF5', color: '#8A6AC0' },
  '疼痛': { bg: '#F5EDE3', color: '#B87F6A' },
  '張り': { bg: '#F5EDE3', color: '#C4946A' },
  '出血': { bg: '#F5ECF0', color: '#C07080' },
  '貧血': { bg: '#F5ECF0', color: '#C07080' },
  'PCOS': { bg: '#EEF3EB', color: '#9DB095' },
  '体温': { bg: '#EBF2F5', color: '#4A80A0' },
};

// ── プロファイルキー → 疾患名 ────────────────────────────

const PROFILE_DISEASE_NAME = {
  endometriosis:   '子宮内膜症',
  pcos:            'PCOS',
  ovarian_cyst:    '卵巣嚢腫',
  pms:             'PMS/PMDD',
  uterine_fibroid: '子宮筋腫',
  adenomyosis:     '子宮腺筋症',
  menopause:       '更年期障害',
  chronic_pelvic_pain: '慢性骨盤痛',
  infertility:     '不妊症',
};

// ── メインレンダリング ────────────────────────────────────

export function renderMedicalSummary(container, config, state) {
  const records  = state.records || [];
  const diseases = state.myDiseases || [];
  const profileKey = config.profileKey || 'default';

  // 疾患未設定 or 記録が少ない → 非表示
  if (!diseases.length || getLastNDays(records, DAYS_30).length < 4) {
    container.innerHTML = '';
    return;
  }

  const observations = generateObservations(records, state, profileKey);

  if (observations.length === 0) {
    container.innerHTML = '';
    return;
  }

  const diseaseName = PROFILE_DISEASE_NAME[profileKey] || diseases[0] || '';
  const monthRecs   = getLastNDays(records, DAYS_30);

  const obsHtml = observations.map(obs => {
    const tagStyle = TAG_COLORS[obs.tag] || { bg: '#EEF3EB', color: '#6A9060' };
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(44,36,31,0.04);">
      <span style="flex-shrink:0;font-size:9.5px;padding:2px 7px;border-radius:99px;background:${tagStyle.bg};color:${tagStyle.color};font-weight:500;line-height:1.6;margin-top:2px;">${esc(obs.tag)}</span>
      <span style="font-size:12.5px;color:#2C241F;line-height:1.75;letter-spacing:-0.01em;">${esc(obs.text)}</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div style="margin:0 16px 16px;background:rgba(255,255,255,0.82);border-radius:20px;padding:20px;border:1px solid rgba(0,0,0,0.03);box-shadow:0 1px 6px rgba(0,0,0,0.01);">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:16px;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(44,36,31,0.38)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span style="font-size:10.5px;color:rgba(44,36,31,0.42);font-weight:500;letter-spacing:0.03em;">医師に伝えやすい状態</span>
        <span style="margin-left:auto;font-size:9.5px;color:rgba(44,36,31,0.3);">過去30日・${monthRecs.length}日分</span>
      </div>

      <div style="font-size:11.5px;color:rgba(44,36,31,0.46);line-height:1.7;margin-bottom:14px;">
        ${esc(diseaseName)}に関する観察結果です。受診時の参考にしてください。
      </div>

      <div style="display:flex;flex-direction:column;">
        ${obsHtml}
      </div>

      <!-- PHASE 1-G: 「詳しい傾向を見る」削除（switchTab・generateObservations 保持） -->
    </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
