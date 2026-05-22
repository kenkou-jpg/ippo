// ============================================================
//  ippo – src/services/insight-signals.js
//  Signal Extraction Layer
//
//  【設計原則】
//  - 全関数 pure function: 同じ入力 → 同じ結果
//  - DOM操作・副作用・state mutation 禁止
//  - record → signal extraction → resolver → template rendering
// ============================================================

// ─── Symptom sets ─────────────────────────────────────────
const _SYM_FATIGUE = ['倦怠感', 'だるさ', '眠気', '疲れ'];
const _SYM_MOOD    = ['気分の落ち込み', 'イライラ', '不安感', '情緒不安定', '怒り', '過敏'];
const _SYM_STRESS  = ['イライラ', '不安感', '怒り', 'ストレス', '緊張'];
const _SYM_SOMATIC = ['頭痛', '吐き気', '腹部膨満', '下腹部痛', '倦怠感', '腰痛'];
const _SYM_COLD    = ['冷え', '手足の冷え', '冷えによる不調'];

// ─── Pure helpers ─────────────────────────────────────────

function _has(r, list) {
  return (r.symptoms || []).some(s => list.includes(s));
}

function _slice(records, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return (records || []).filter(r => {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });
}

function _sort(records) {
  return records.slice().sort((a, b) =>
    new Date(a.date || a.record_date) - new Date(b.date || b.record_date)
  );
}

function _pairCorr(sorted, condition, outcome) {
  let match = 0, total = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (condition(sorted[i])) {
      total++;
      if (outcome(sorted[i + 1])) match++;
    }
  }
  return { match, total, rate: total > 0 ? match / total : 0 };
}

function _isLuteal(r, lastPeriodDate, cycleLength) {
  if (!lastPeriodDate) return false;
  const d      = new Date(r.date || r.record_date || '');
  const last   = new Date(lastPeriodDate + 'T00:00:00');
  const cl     = cycleLength || 28;
  const dayNum = Math.floor((d - last) / 86400000) + 1;
  const norm   = ((dayNum - 1) % cl) + 1;
  return norm >= (cl - 7) && norm <= cl;
}

// ─── Signal extractors (pure) ──────────────────────────────

function _sleepPainCorr(records) {
  const month = _slice(records, 30);
  if (month.length < 5) return null;
  const { match, total, rate } = _pairCorr(
    _sort(month),
    r => (r.sleepQuality ?? 0) >= 3,
    r => (r.painLevel    ?? 0) >= 2
  );
  if (total < 3 || rate < 0.40) return null;
  return {
    id:          'sleepPainCorrelation',
    confidence:  Math.min(1, rate),
    trigger:     '睡眠が浅い日の翌日',
    symptom:     '痛みや違和感',
    direction:   'negative',
    evidenceDays: match,
    pct:         Math.round(rate * 100),
    layer:       2,
  };
}

function _sleepFatigueCorr(records) {
  const month = _slice(records, 30);
  if (month.length < 5) return null;
  const { match, total, rate } = _pairCorr(
    _sort(month),
    r => (r.sleepQuality ?? 0) >= 3,
    r => _has(r, _SYM_FATIGUE) || (r.energy != null && r.energy <= 2)
  );
  if (total < 3 || rate < 0.45) return null;
  return {
    id:          'sleepFatigueCorrelation',
    confidence:  Math.min(1, rate),
    trigger:     '睡眠が浅い日の翌日',
    symptom:     '疲れやだるさ',
    direction:   'negative',
    evidenceDays: match,
    pct:         Math.round(rate * 100),
    layer:       2,
  };
}

function _stressFlare(records) {
  const month     = _slice(records, 30);
  if (month.length < 5) return null;
  const stress    = month.filter(r =>  _has(r, _SYM_STRESS));
  const nonStress = month.filter(r => !_has(r, _SYM_STRESS));
  if (stress.length < 3) return null;
  const sRate  = stress.filter(r => _has(r, _SYM_SOMATIC)).length / stress.length;
  const nsRate = nonStress.length > 0
    ? nonStress.filter(r => _has(r, _SYM_SOMATIC)).length / nonStress.length : 0;
  if (sRate < 0.40 || sRate <= nsRate * 1.3) return null;
  return {
    id:          'stressFlareRisk',
    confidence:  Math.min(1, sRate),
    trigger:     'ストレスが高い日',
    symptom:     '身体症状',
    direction:   'negative',
    evidenceDays: stress.filter(r => _has(r, _SYM_SOMATIC)).length,
    pct:         Math.round(sRate * 100),
    layer:       2,
  };
}

function _cycleMood(records, state) {
  if (!state.lastPeriodDate) return null;
  const twoMonth = _slice(records, 60);
  if (twoMonth.length < 8) return null;
  const cl      = state.cycleLength || 28;
  const luteal  = twoMonth.filter(r =>  _isLuteal(r, state.lastPeriodDate, cl));
  const other   = twoMonth.filter(r => !_isLuteal(r, state.lastPeriodDate, cl));
  if (luteal.length < 3) return null;
  const lMood   = luteal.filter(r => _has(r, _SYM_MOOD)).length;
  const lRate   = lMood / luteal.length;
  const oRate   = other.length > 0 ? other.filter(r => _has(r, _SYM_MOOD)).length / other.length : 0;
  if (lMood < 3 || lRate < 0.40 || lRate <= oRate * 1.4) return null;
  return {
    id:          'cycleMoodLink',
    confidence:  Math.min(1, lMood / 5),
    trigger:     '黄体期（生理前）',
    symptom:     '気分の変動',
    direction:   'negative',
    evidenceDays: lMood,
    pct:         Math.round(lRate * 100),
    layer:       2,
  };
}

function _coldLink(records) {
  const month  = _slice(records, 30);
  const sorted = _sort(month);
  if (sorted.filter(r => _has(r, _SYM_COLD)).length < 2) return null;
  const { match, total, rate } = _pairCorr(
    sorted,
    r =>  _has(r, _SYM_COLD),
    r => (r.painLevel ?? 0) >= 2 || _has(r, _SYM_SOMATIC)
  );
  if (total < 2 || rate < 0.45) return null;
  return {
    id:          'coldSensitivity',
    confidence:  Math.min(1, rate),
    trigger:     '冷えを感じた日の翌日',
    symptom:     '体の不調',
    direction:   'negative',
    evidenceDays: match,
    pct:         Math.round(rate * 100),
    layer:       2,
  };
}

function _bbtVariance(records) {
  const month = _slice(records, 30);
  const temps = month.filter(r => r.basalTemp > 0);
  if (temps.length < 5) return null;
  const avg      = temps.reduce((s, r) => s + r.basalTemp, 0) / temps.length;
  const variance = Math.sqrt(temps.reduce((s, r) => s + Math.pow(r.basalTemp - avg, 2), 0) / temps.length);
  if (variance < 0.28) return null;
  return {
    id:          'bbtVariance',
    confidence:  Math.min(1, variance / 0.5),
    trigger:     null,
    symptom:     null,
    direction:   'neutral',
    evidenceDays: temps.length,
    variance:    parseFloat(variance.toFixed(2)),
    avg:         parseFloat(avg.toFixed(2)),
    layer:       3,
  };
}

function _improveSleep(records) {
  const month = _slice(records, 30);
  if (month.length < 5) return null;
  const { match, total, rate } = _pairCorr(
    _sort(month),
    r => (r.sleepQuality ?? 5) <= 2 && (r.sleepHours || 0) >= 7,
    r => (r.painLevel ?? 0) <= 1 && (r.energy ?? 0) >= 4
  );
  if (total < 3 || rate < 0.40) return null;
  return {
    id:          'improvementSleep',
    confidence:  Math.min(1, rate),
    trigger:     '睡眠が安定した翌日',
    symptom:     '落ち着いている傾向があります',
    direction:   'positive',
    evidenceDays: match,
    pct:         Math.round(rate * 100),
    layer:       2,
  };
}

function _recentChange(records) {
  const now   = new Date();
  const r7    = _slice(records, 7);
  const prev7 = (records || []).filter(r => {
    const d     = new Date(r.date || r.record_date || '');
    const dAgo  = (now - d) / 86400000;
    return dAgo > 7 && dAgo <= 14;
  });
  if (r7.length < 2 || prev7.length < 2) return null;
  const r7avg  = r7.reduce((s, r)  => s + (r.painLevel || 0), 0) / r7.length;
  const p7avg  = prev7.reduce((s, r) => s + (r.painLevel || 0), 0) / prev7.length;
  const delta  = r7avg - p7avg;
  if (Math.abs(delta) < 1.0) return null;
  return {
    id:          delta > 0 ? 'recentFlare' : 'recentImprovement',
    confidence:  Math.min(1, Math.abs(delta) / 3),
    trigger:     null,
    symptom:     '症状の変化',
    direction:   delta > 0 ? 'negative' : 'positive',
    evidenceDays: r7.length,
    delta:       parseFloat(Math.abs(delta).toFixed(1)),
    layer:       3,
  };
}

// ─── Public API ────────────────────────────────────────────

/**
 * 全signalを抽出して返す。純粋関数: 同じ入力 → 同じ結果。
 */
export function extractSignals(records, state) {
  const fns = [
    () => _sleepPainCorr(records),
    () => _sleepFatigueCorr(records),
    () => _stressFlare(records),
    () => _cycleMood(records, state),
    () => _coldLink(records),
    () => _bbtVariance(records),
    () => _improveSleep(records),
    () => _recentChange(records),
  ];
  return fns.map(fn => { try { return fn(); } catch (_) { return null; } }).filter(Boolean);
}

/**
 * signalのフィンガープリントを生成（comment stabilization 判定用）
 */
export function signalFingerprint(signals) {
  return signals
    .map(s => `${s.id}:${Math.round(s.confidence * 10)}`)
    .sort()
    .join(',');
}

// ─── Window 公開 ──────────────────────────────────────────

window.ippoInsightSignals = { extractSignals, signalFingerprint };
