// ============================================================
// ippo – utils/checkin-snapshot.js
// buildCheckinSnapshot() — intentional daily check-in の凍結スナップショット
//
// 役割:
// - daily check-in 保存時に「その瞬間の記録」を不変コピーとして生成
// - record.meta.checkinSnapshot に格納され、後続の編集から保護される
// - today-reflection.js はこのスナップショットのみを参照し
//   live record フィールド（後から上書き可能）には依存しない
//
// 拡張性:
// - emotional climate, recovery journey, reflection memory, trend snapshots
//   など将来の機能を追加する際はこのファイルを起点にする
//   (_buildPayload や live schema に触れずに拡張可能)
//
// mutation 防止:
// - structuredClone() (対応環境) または JSON round-trip で完全 deep copy
// ============================================================

/**
 * 値を深くクローンする。accidental mutation を防ぐ。
 * @param {*} value
 * @returns {*}
 */
function _deepClone(value) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch (e) { /* fallthrough */ }
  }
  try { return JSON.parse(JSON.stringify(value)); } catch (e) { /* fallthrough */ }
  return value;
}

/**
 * daily check-in 保存時のスナップショットを生成する。
 *
 * @param {object} params
 * @param {object} params.snapshot     - { condition, sleep, energy }
 * @param {Array}  params.symptomList  - [{ symptom, severity, types, locations }]
 * @param {object} params.emotions     - { tags: string[], memo: string }
 * @param {string} [params.note]       - memo text (emotions.memo と同値)
 * @returns {object} frozen snapshot — meta.checkinSnapshot に格納する
 */
export function buildCheckinSnapshot({ snapshot, symptomList, emotions, note }) {
  const frozenSnapshot = snapshot || {};
  const frozenSymptoms = (symptomList || []).map(function (s) {
    return {
      symptom:   String(s.symptom  || ''),
      severity:  s.severity  || null,
      types:     Array.isArray(s.types)     ? s.types.slice()     : [],
      locations: Array.isArray(s.locations) ? s.locations.slice() : [],
    };
  });
  const frozenEmotions = {
    tags: Array.isArray(emotions && emotions.tags) ? emotions.tags.slice() : [],
    memo: String((emotions && emotions.memo) || ''),
  };
  const frozenNote = String(note || '');

  // Deep clone the assembled snapshot so no reference leaks back to _state
  return _deepClone({
    // Core check-in fields — only 3-card daily flow writes these
    snapshot:       frozenSnapshot,
    symptomDetails: frozenSymptoms,
    emotions:       frozenEmotions,
    note:           frozenNote,

    // ── Future extension points ────────────────────────────────
    // emotionalClimate: null,   // Phase X: AI-assessed emotional tone
    // recoveryJourney:  null,   // Phase X: streak / milestone context
    // reflectionMemory: null,   // Phase X: links to past similar days
    // trendContext:     null,   // Phase X: 7-day rolling signals
    // ──────────────────────────────────────────────────────────
  });
}
