// ============================================================
//  ippo – src/services/life-rhythm-memory.js
//  PHASE 7: Life Rhythm Memory
//
//  生活リズムに関する軽量な記憶層。
//  companion-memory.js と独立したキーを使用。
//
//  禁止: hidden scoring / behavioral manipulation / opaque profiling
// ============================================================

const _LRM_KEY = 'ippo_life_rhythm_memory';

const _DEFAULT = {
  calmingPatterns:         [],   // [{ type, lastSeen }] — 安定につながったパターン
  recurringStressPatterns: [],   // [{ type, lastSeen }] — 繰り返すストレスパターン
  recoveryPatterns:        [],   // [{ type, lastSeen }] — 回復につながったパターン
  emotionalClimateHistory: [],   // [{ climate, date }] — 感情気候の履歴 (max 5)
  seasonalPatterns:        [],   // [{ season, note }]  — 季節との関係
  lastExperimentAt:        null, // ISO string — 最後に experiment を表示した日時
  lastExperimentType:      null,
  updatedAt:               '',
};

const _EXPERIMENT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3日

// ─── Read / Write ─────────────────────────────────────────

export function getLifeRhythmMemory() {
  try {
    const raw = localStorage.getItem(_LRM_KEY);
    if (!raw) return Object.assign({}, _DEFAULT);
    return Object.assign({}, _DEFAULT, JSON.parse(raw));
  } catch (_) {
    return Object.assign({}, _DEFAULT);
  }
}

export function saveLifeRhythmMemory(memory) {
  try {
    localStorage.setItem(_LRM_KEY, JSON.stringify(
      Object.assign({}, memory, { updatedAt: new Date().toISOString() })
    ));
  } catch (_) {}
}

// ─── Experiment throttle ──────────────────────────────────

/** 3日以上経過していれば experiment を表示してよい */
export function shouldShowExperiment() {
  const mem = getLifeRhythmMemory();
  if (!mem.lastExperimentAt) return true;
  return Date.now() - new Date(mem.lastExperimentAt).getTime() > _EXPERIMENT_COOLDOWN_MS;
}

export function recordExperimentShown(type) {
  const mem = getLifeRhythmMemory();
  mem.lastExperimentAt  = new Date().toISOString();
  mem.lastExperimentType = type || null;
  saveLifeRhythmMemory(mem);
}

// ─── Climate history ──────────────────────────────────────

export function recordClimateEntry(climateType) {
  if (!climateType) return;
  const mem = getLifeRhythmMemory();
  const entry = { climate: climateType, date: new Date().toISOString().slice(0, 10) };
  mem.emotionalClimateHistory = [entry, ...mem.emotionalClimateHistory].slice(0, 5);
  saveLifeRhythmMemory(mem);
}

// ─── Window 公開 ──────────────────────────────────────────

window.ippoLifeRhythmMemory = Object.freeze({
  getLifeRhythmMemory,
  saveLifeRhythmMemory,
  shouldShowExperiment,
  recordExperimentShown,
  recordClimateEntry,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('life-rhythm-memory-loaded');
}
