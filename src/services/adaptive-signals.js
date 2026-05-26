// ============================================================
//  ippo – src/services/adaptive-signals.js
//  PHASE 4: Adaptive Signal Layer
//
//  設計方針:
//  - rule-based のみ。LLM / ML / AI 推論なし
//  - local localStorage のみ ('ippo_adaptive_signals')
//  - post-save hook 経由で記録後に自動更新
//  - UIは「分析されている」ではなく「理解されやすくなった」感覚
//  - 質問は「感覚の観察」であり「医療問診」ではない
//
//  PHASE 6 用 hooks: registerAdaptiveSignal / getAdaptiveCandidates / recordAdaptiveResponse
// ============================================================

import { addPostSaveHook, getState } from '../store/state.js';

const _STORAGE_KEY = 'ippo_adaptive_signals';

// ── Symptom key ↔ label (record-three-card.js SYMPTOMS に対応) ─

const _SYM_LABELS = {
  headache:         '頭痛',
  abdomen:          '腹部痛',
  swelling:         'むくみ',
  fatigue:          'だるさ',
  nausea:           '吐き気',
  irritable:        'イライラ',
  anxiety:          '不安',
  abnormalBleeding: '不正出血',
  discharge:        'おりもの変化',
};

// ── Adaptive question registry ────────────────────────────────
// 「感覚の観察」トーン: 医療問診にならないよう注意
// 各症状キー → followup質問リスト

export const ADAPTIVE_QUESTION_REGISTRY = {
  swelling: [
    {
      id: 'leg_heaviness',
      label: '足の重さはありましたか？',
      answers: ['はい', 'いいえ', 'わからない'],
    },
  ],
  headache: [
    {
      id: 'light_sensitivity',
      label: '光がつらい感じはありましたか？',
      answers: ['はい', 'いいえ', 'わからない'],
    },
  ],
  abdomen: [
    {
      id: 'abdomen_detail',
      label: 'どのあたりが気になりましたか？',
      answers: ['左側', '右側', '両方', 'わからない'],
    },
  ],
  fatigue: [
    {
      id: 'fatigue_recovery',
      label: '休んでも回復しにくかったですか？',
      answers: ['はい', '少し', 'いいえ'],
    },
  ],
  anxiety: [
    {
      id: 'anxiety_timing',
      label: '不安を感じやすい時間帯はありますか？',
      answers: ['朝', '昼', '夜', '一日中'],
    },
  ],
  irritable: [
    {
      id: 'irritable_notice',
      label: 'きっかけに気づくことはできましたか？',
      answers: ['気づけた', '気づけなかった', 'わからない'],
    },
  ],
};

// ── Trigger thresholds (30日間の出現回数) ─────────────────────
// symptom key → followup を表示するまでの累計回数

const _THRESHOLDS = {
  swelling:  3,
  headache:  5,
  abdomen:   3,
  fatigue:   4,
  anxiety:   3,
  irritable: 4,
};

// ── Default signals structure ─────────────────────────────────

function _defaultSignals() {
  return {
    symptoms: {},        // { [symKey]: { count, lastSeen, followupsShown[] } }
    emotions: {},        // { [emotionKey]: { count, lastSeen } }
    sleepPatterns: { poorSleepCount: 0 },
    adaptiveResponses: [],
    updatedAt: '',
  };
}

// ── Storage ───────────────────────────────────────────────────

export function getAdaptiveSignals() {
  try {
    const raw = localStorage.getItem(_STORAGE_KEY);
    if (!raw) return _defaultSignals();
    const parsed = JSON.parse(raw);
    return Object.assign(_defaultSignals(), parsed);
  } catch (_) {
    return _defaultSignals();
  }
}

function _saveSignals(signals) {
  try {
    localStorage.setItem(_STORAGE_KEY, JSON.stringify(signals));
  } catch (_) {}
}

// ── Label → Key lookup ────────────────────────────────────────

function _labelToKey(label) {
  for (const [k, v] of Object.entries(_SYM_LABELS)) {
    if (v === label) return k;
  }
  return null;
}

export function symKeyToLabel(key) {
  return _SYM_LABELS[key] || null;
}

// ── Signal Update (post-save で呼ばれる) ──────────────────────
// 直近30日のレコードから symptom/emotion/sleep カウントを再計算

export function updateAdaptiveSignals(records) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);

  const recent = (records || []).filter(function(r) {
    const d = new Date(r.date || r.record_date || '');
    return d >= cutoff && !isNaN(d.getTime());
  });

  const signals = getAdaptiveSignals();
  // カウントのみリセット (followupsShown / adaptiveResponses は保持)
  const prevSymptoms = signals.symptoms;
  signals.symptoms = {};
  signals.emotions = {};
  signals.sleepPatterns = { poorSleepCount: 0 };

  for (const r of recent) {
    const rDate = (r.date || r.record_date || '').slice(0, 10);
    const rTime = new Date(r.date || r.record_date || '').getTime();

    // symptomDetails (3カード スキーマ)
    for (const detail of (r.symptomDetails || [])) {
      if (!detail || !detail.symptom) continue;
      const key = _labelToKey(detail.symptom);
      if (!key) continue;
      if (!signals.symptoms[key]) {
        signals.symptoms[key] = {
          count: 0,
          lastSeen: '',
          followupsShown: (prevSymptoms[key] && prevSymptoms[key].followupsShown) || [],
        };
      }
      signals.symptoms[key].count++;
      if (!signals.symptoms[key].lastSeen || rDate > signals.symptoms[key].lastSeen) {
        signals.symptoms[key].lastSeen = rDate;
      }
    }

    // legacy symptoms[] (文字列配列) も参照
    for (const label of (r.symptoms || [])) {
      const key = _labelToKey(label);
      if (!key) continue;
      if (!signals.symptoms[key]) {
        signals.symptoms[key] = {
          count: 0,
          lastSeen: '',
          followupsShown: (prevSymptoms[key] && prevSymptoms[key].followupsShown) || [],
        };
      }
      // symptomDetails と重複しないように1レコード1カウントを維持
      // (両方ある場合は既にsymptomDetailsでカウント済みのため加算しない)
      const hasDetail = (r.symptomDetails || []).some(function(d) {
        return d && _labelToKey(d.symptom) === key;
      });
      if (!hasDetail) {
        signals.symptoms[key].count++;
        if (!signals.symptoms[key].lastSeen || rDate > signals.symptoms[key].lastSeen) {
          signals.symptoms[key].lastSeen = rDate;
        }
      }
    }

    // emotions
    for (const tag of ((r.emotions && r.emotions.tags) || [])) {
      if (!signals.emotions[tag]) {
        signals.emotions[tag] = { count: 0, lastSeen: '' };
      }
      signals.emotions[tag].count++;
      if (!signals.emotions[tag].lastSeen || rDate > signals.emotions[tag].lastSeen) {
        signals.emotions[tag].lastSeen = rDate;
      }
    }

    // sleep patterns (14日以内)
    if (rTime >= cutoff14.getTime()) {
      const poorSleep =
        (r.snapshot && (r.snapshot.sleep === 'hardlySlept' || r.snapshot.sleep === 'wokeUp')) ||
        (r.sleepQuality != null && r.sleepQuality >= 3);
      if (poorSleep) signals.sleepPatterns.poorSleepCount++;
    }
  }

  signals.updatedAt = new Date().toISOString();
  _saveSignals(signals);
  return signals;
}

// ── Candidate Generation (rule-based) ────────────────────────
// displayStyle に応じた質問数制限:
//   gentle: max 1, balanced: max 1, deep: max 2

export function getAdaptiveCandidates(settingsProfile) {
  const signals = getAdaptiveSignals();
  const displayStyle = (settingsProfile && settingsProfile.displayStyle) || 'balanced';
  const maxQ = displayStyle === 'deep' ? 2 : 1;

  // gentle の場合: 閾値を1.5倍にして出現しにくくする
  const thresholdMultiplier = displayStyle === 'gentle' ? 1.5 : 1.0;

  const candidates = [];

  for (const [symKey, baseThreshold] of Object.entries(_THRESHOLDS)) {
    if (candidates.length >= maxQ) break;

    const threshold = Math.ceil(baseThreshold * thresholdMultiplier);
    const sig = signals.symptoms[symKey];
    if (!sig || sig.count < threshold) continue;

    const questions = ADAPTIVE_QUESTION_REGISTRY[symKey] || [];
    for (const q of questions) {
      // 同じ followup は最大5回まで表示
      const shownCount = (sig.followupsShown || []).filter(function(id) {
        return id === q.id;
      }).length;
      if (shownCount >= 5) continue;

      candidates.push(Object.assign({}, q, { symptomKey: symKey }));
      break;
    }
  }

  return candidates;
}

// ── Response Recording ────────────────────────────────────────
// ユーザーが回答したときに呼ぶ:
//   - adaptiveResponses に追記 (最大200件)
//   - followupsShown に questionId を追記 (重複表示防止)

export function recordAdaptiveResponse(questionId, answer, symptomKey) {
  const signals = getAdaptiveSignals();

  signals.adaptiveResponses = (signals.adaptiveResponses || []).concat({
    questionId,
    answer,
    timestamp: new Date().toISOString(),
  });
  if (signals.adaptiveResponses.length > 200) {
    signals.adaptiveResponses = signals.adaptiveResponses.slice(-200);
  }

  if (symptomKey && signals.symptoms[symptomKey]) {
    signals.symptoms[symptomKey].followupsShown =
      (signals.symptoms[symptomKey].followupsShown || []).concat(questionId);
  }

  _saveSignals(signals);
}

// ── Post-save hook ────────────────────────────────────────────
// saveState() 後に非同期で adaptive signals を更新

addPostSaveHook(function _adaptivePostSaveHook(saveErr) {
  if (saveErr) return;
  setTimeout(function() {
    try {
      const state = getState();
      updateAdaptiveSignals(state.records || []);
    } catch (_) {}
  }, 0);
});

// ── Window exports (PHASE 6 preparation / devtools) ──────────

window.ippoAdaptiveSignals = Object.freeze({
  getAdaptiveSignals,
  updateAdaptiveSignals,
  getAdaptiveCandidates,
  recordAdaptiveResponse,
  symKeyToLabel,
  ADAPTIVE_QUESTION_REGISTRY,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('adaptive-signals-loaded');
}
